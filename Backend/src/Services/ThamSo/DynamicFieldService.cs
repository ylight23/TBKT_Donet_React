using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Grpc.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public class DynamicFieldService(ILogger<DynamicFieldService> logger)
{
    private const string PermissionCode = "thamso_dynamicfield";
    private static readonly System.Text.RegularExpressions.Regex ValidFieldKeyRegex =
        new("^[a-z0-9_]+$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static HashSet<string> GetVisibleCnIdSet(ServerCallContext? context) =>
        context.GetAccessGate()
            .GetVisibleCNs()
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static void NormalizeCnIds(DynamicField item)
    {
        var normalized = item.CnIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        item.CnIds.Clear();
        item.CnIds.AddRange(normalized);
    }

    private static bool CanReadFieldByCnScope(DynamicField item, HashSet<string> visibleCnIds, bool isAdmin)
    {
        if (isAdmin)
            return true;

        var assignedCnIds = item.CnIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (assignedCnIds.Count == 0)
            return true;

        if (visibleCnIds.Count == 0)
            return false;

        return assignedCnIds.Any(visibleCnIds.Contains);
    }

    private static void ApplyAuditMetadata(DynamicField item, BsonDocument itemBson)
    {
        item.Id = itemBson.IdString();
        item.CreateDate = itemBson.TimestampOr("CreateDate") ?? item.CreateDate;
        item.ModifyDate = itemBson.TimestampOr("ModifyDate") ?? item.ModifyDate;
        item.CreateBy = itemBson.StringOr("NguoiTao");
        item.ModifyBy = itemBson.StringOr("NguoiSua");
        item.Version = itemBson.IntOr("Version", item.Version > 0 ? item.Version : 1);
    }

    private static async Task<List<string>> GetReferencingFieldSetNamesAsync(IEnumerable<string> fieldIds, bool includeDeleted = false)
    {
        var normalizedIds = fieldIds as List<string> ?? ServiceMutationPolicy.NormalizeIds(fieldIds);
        if (normalizedIds.Count == 0) return [];

        var filter = includeDeleted
            ? Builders<BsonDocument>.Filter.AnyIn("FieldIds", normalizedIds)
            : Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.AnyIn("FieldIds", normalizedIds),
                MongoDocumentHelpers.NotDeleted);

        var fieldSetDocs = await Global.CollectionBsonFieldSet!
            .Find(filter)
            .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Name"))
            .ToListAsync();

        return fieldSetDocs
            .Select(doc => doc.StringOr("Name", doc.IdString()))
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    public async Task<GetListDynamicFieldsResponse> GetListDynamicFieldsAsync(
        GetListDynamicFieldsRequest request,
        ServerCallContext? context)
    {
        var response = new GetListDynamicFieldsResponse();
        try
        {
            var visibleCnIds = GetVisibleCnIdSet(context);
            var isAdmin = context?.IsAdminAccount() == true;
            var bsonItems = await Global.CollectionBsonDynamicField!.Find(MongoDocumentHelpers.NotDeleted).ToListAsync();

            response.Items.AddRange(bsonItems
                .Select(MapDynamicFieldStrict)
                .Where(item => CanReadFieldByCnScope(item, visibleCnIds, isAdmin)));

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} items");
            logger.LogInformation("GetListDynamicFields: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicFields error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai danh sach truong", ex.Message);
        }

        return response;
    }

    public async Task<SaveDynamicFieldResponse> SaveDynamicFieldAsync(SaveDynamicFieldRequest request, ServerCallContext? context)
    {
        var response = new SaveDynamicFieldResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen them hoac cap nhat truong");
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Meta = ThamSoResponseFactory.Fail("Du lieu khong hop le");
                return response;
            }

            item.Key = (item.Key ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(item.Key) || !ValidFieldKeyRegex.IsMatch(item.Key))
            {
                response.Meta = ThamSoResponseFactory.Fail("Key khong hop le. Chi duoc dung chu thuong, so va dau _");
                return response;
            }

            NormalizeCnIds(item);

            var visibleCnIds = GetVisibleCnIdSet(context);
            var assignedCnIds = item.CnIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (context?.IsAdminAccount() != true && assignedCnIds.Count > 0)
            {
                if (visibleCnIds.Count == 0 || assignedCnIds.Any(id => !visibleCnIds.Contains(id)))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong duoc gan field cho chuyen nganh ngoai pham vi duoc cap");
                    return response;
                }
            }

            var isNew = string.IsNullOrWhiteSpace(item.Id);
            if (isNew)
            {
                item.Id = Guid.NewGuid().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc.Remove("Id");
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);
                ApplyAuditMetadata(item, bsonDoc);

                await Global.CollectionBsonDynamicField!.InsertOneAsync(bsonDoc);
                response.Meta = ThamSoResponseFactory.Ok("Them truong moi thanh cong!");
                logger.LogInformation("SaveDynamicField: Created {Id}", item.Id);
            }
            else
            {
                var existingDoc = await Global.CollectionBsonDynamicField!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                        MongoDocumentHelpers.NotDeleted))
                    .FirstOrDefaultAsync();

                if (existingDoc == null)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay truong dang hoat dong de cap nhat");
                    return response;
                }

                var existingKey = existingDoc.StringOr("Key");
                var existingKeyNormalized = (existingKey ?? string.Empty).Trim().ToLowerInvariant();
                var incomingKey = item.Key?.Trim().ToLowerInvariant() ?? string.Empty;
                if (!string.Equals(existingKeyNormalized, incomingKey, StringComparison.Ordinal))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong duoc thay doi key cua truong sau khi da tao");
                    return response;
                }

                item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.CreateDate = existingDoc.TimestampOr("CreateDate") ?? item.CreateDate;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc.Remove("Id");
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingDoc, context, item.ModifyDate);
                ApplyAuditMetadata(item, bsonDoc);

                var replaceResult = await Global.CollectionBsonDynamicField!
                    .ReplaceOneAsync(Builders<BsonDocument>.Filter.Eq("_id", item.Id), bsonDoc);

                if (replaceResult.MatchedCount == 0)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay truong dang hoat dong de cap nhat");
                    return response;
                }

                response.Meta = ThamSoResponseFactory.Ok("Cap nhat truong thanh cong!");
                logger.LogInformation("SaveDynamicField: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicField error");
            response.Meta = ThamSoResponseFactory.Fail("Co loi xay ra khi luu!", ex.Message);
        }

        return response;
    }

    public async Task<DeleteBaseResponse> DeleteDynamicFieldAsync(DeleteDynamicFieldRequest request, ServerCallContext? context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            if (!ServiceMutationPolicy.CanDeleteThamSo(context, PermissionCode))
            {
                response.Success = false;
                response.Message = "Khong co quyen xoa truong";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            var referencingFieldSetNames = await GetReferencingFieldSetNamesAsync(normalizedIds);
            if (referencingFieldSetNames.Count > 0)
            {
                response.Success = false;
                response.Message =
                    $"Khong the xoa field dang duoc su dung trong FieldSet: {string.Join(", ", referencingFieldSetNames.Take(10))}";
                return response;
            }

            var result = await Global.CollectionBsonDynamicField!.UpdateManyAsync(
                ServiceMutationPolicy.ActiveIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildSoftDeleteUpdate(context));
            var count = result.ModifiedCount;
            response.Success = count > 0;
            response.Message = $"Da xoa mem {count} truong";
            logger.LogInformation("DeleteDynamicField: Soft deleted {Count}", count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicField error");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
    }

    public async Task<StatusResponse> RestoreDynamicFieldAsync(RestoreDynamicFieldRequest request, ServerCallContext? context)
    {
        var response = new StatusResponse();
        try
        {
            if (!ServiceMutationPolicy.CanRestoreThamSo(context))
            {
                response.Success = false;
                response.Message = "Chi admin cau hinh hoac superadmin moi duoc khoi phuc truong";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co truong nao de khoi phuc";
                return response;
            }

            var deletedDocs = await Global.CollectionBsonDynamicField!
                .Find(ServiceMutationPolicy.DeletedIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Key"))
                .ToListAsync();

            if (deletedDocs.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong tim thay truong da xoa de khoi phuc";
                return response;
            }

            var keysToRestore = deletedDocs
                .Select(doc => doc.StringOr("Key"))
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (keysToRestore.Count > 0)
            {
                var activeConflictDocs = await Global.CollectionBsonDynamicField!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.In("Key", keysToRestore),
                        MongoDocumentHelpers.NotDeleted))
                    .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Key"))
                    .ToListAsync();

                var restoreIdSet = normalizedIds.ToHashSet(StringComparer.Ordinal);
                var conflictingKeys = activeConflictDocs
                    .Where(doc => !restoreIdSet.Contains(doc.IdString()))
                    .Select(doc => doc.StringOr("Key"))
                    .Where(key => !string.IsNullOrWhiteSpace(key))
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (conflictingKeys.Count > 0)
                {
                    response.Success = false;
                    response.Message = $"Khong the khoi phuc vi trung key dang hoat dong: {string.Join(", ", conflictingKeys.Take(10))}";
                    return response;
                }
            }

            var result = await Global.CollectionBsonDynamicField!.UpdateManyAsync(
                ServiceMutationPolicy.DeletedIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildRestoreUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da khoi phuc {result.ModifiedCount} truong";
            logger.LogInformation("RestoreDynamicField: Restored {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RestoreDynamicField error");
            response.Success = false;
            response.Message = "Loi khi khoi phuc truong";
            response.MessageException = ex.Message;
        }

        return response;
    }

    public async Task<DeleteBaseResponse> HardDeleteDynamicFieldAsync(DeleteDynamicFieldRequest request, ServerCallContext? context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            if (!ServiceMutationPolicy.CanRestoreThamSo(context))
            {
                response.Success = false;
                response.Message = "Chi admin cau hinh hoac superadmin moi duoc xoa vinh vien truong";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co truong nao de xoa vinh vien";
                return response;
            }

            var deletedDocs = await Global.CollectionBsonDynamicField!
                .Find(ServiceMutationPolicy.DeletedIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("_id"))
                .ToListAsync();

            if (deletedDocs.Count == 0)
            {
                response.Success = false;
                response.Message = "Chi duoc xoa vinh vien truong da nam trong muc da xoa";
                return response;
            }

            var deletedIds = deletedDocs.Select(doc => doc.IdString()).ToList();
            var referencingFieldSetNames = await GetReferencingFieldSetNamesAsync(deletedIds, includeDeleted: true);
            if (referencingFieldSetNames.Count > 0)
            {
                response.Success = false;
                response.Message =
                    $"Khong the xoa vinh vien vi field van duoc tham chieu trong FieldSet: {string.Join(", ", referencingFieldSetNames.Take(10))}";
                return response;
            }

            var result = await Global.CollectionBsonDynamicField!
                .DeleteManyAsync(Builders<BsonDocument>.Filter.In("_id", deletedIds));

            response.Success = result.DeletedCount > 0;
            response.Message = $"Da xoa vinh vien {result.DeletedCount} truong";
            logger.LogInformation("HardDeleteDynamicField: Permanently deleted {Count}", result.DeletedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "HardDeleteDynamicField error");
            response.Success = false;
            response.Message = "Loi khi xoa vinh vien truong";
            response.MessageException = ex.Message;
        }

        return response;
    }
    private static double DoubleOr(BsonDocument? doc, string key, double fallback = 0)
    {
        if (doc == null) return fallback;
        var value = doc.GetValue(key, BsonNull.Value);
        if (value == BsonNull.Value || value.IsBsonNull) return fallback;
        if (value.IsDouble) return value.AsDouble;
        if (value.IsInt32) return value.AsInt32;
        if (value.IsInt64) return value.AsInt64;
        if (value.IsDecimal128) return (double)value.AsDecimal128;
        throw new FormatException($"Field '{key}' khong phai so hop le.");
    }

    private static DynamicField MapDynamicFieldStrict(BsonDocument itemBson)
    {
        var item = new DynamicField
        {
            Id = itemBson.IdString(),
            Key = itemBson.StringOr("Key"),
            Label = itemBson.StringOr("Label"),
            Type = itemBson.StringOr("Type"),
            Required = itemBson.BoolOr("Required"),
            Disabled = itemBson.BoolOr("Disabled"),
            Validation = new FieldValidation(),
        };

        var cnIds = itemBson.ArrayOr("CnIds");
        if (cnIds != null)
        {
            item.CnIds.AddRange(cnIds
                .Where(value => !value.IsBsonNull)
                .Select(value => value.AsString));
        }

        var validationBson = itemBson.DocOr("Validation");
        if (validationBson != null)
        {
            item.Validation.MinLength = validationBson.IntOr("MinLength");
            item.Validation.MaxLength = validationBson.IntOr("MaxLength");
            item.Validation.Pattern = validationBson.StringOr("Pattern");
            item.Validation.Min = DoubleOr(validationBson, "Min");
            item.Validation.Max = DoubleOr(validationBson, "Max");
            item.Validation.DataSource = validationBson.StringOr("DataSource");
            item.Validation.ApiUrl = validationBson.StringOr("ApiUrl");
            item.Validation.DisplayType = validationBson.StringOr("DisplayType");

            var options = validationBson.ArrayOr("Options");
            if (options != null)
            {
                item.Validation.Options.AddRange(options
                    .Where(value => !value.IsBsonNull)
                    .Select(value => value.AsString));
            }
        }

        NormalizeCnIds(item);
        ApplyAuditMetadata(item, itemBson);
        return item;
    }
}
