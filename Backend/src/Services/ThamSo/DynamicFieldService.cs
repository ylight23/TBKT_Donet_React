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

    private static async Task<List<string>> GetReferencingFieldSetNamesAsync(IEnumerable<string> fieldIds)
    {
        var normalizedIds = fieldIds as List<string> ?? ServiceMutationPolicy.NormalizeIds(fieldIds);
        if (normalizedIds.Count == 0) return [];

        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.AnyIn("FieldIds", normalizedIds),
            MongoDocumentHelpers.NotDeleted);

        var fieldSets = await Global.CollectionBsonFieldSet!
            .Find(filter)
            .Project(doc => doc.StringOr("Name", doc.IdString()))
            .ToListAsync();

        return fieldSets
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    public async Task<GetListDynamicFieldsResponse> GetListDynamicFieldsAsync(GetListDynamicFieldsRequest request)
    {
        var response = new GetListDynamicFieldsResponse();
        try
        {
            var bsonItems = await Global.CollectionBsonDynamicField!.Find(MongoDocumentHelpers.NotDeleted).ToListAsync();

            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var item = BsonSerializer.Deserialize<DynamicField>(itemBson);
                var validationBson = itemBson.DocOr("Validation");
                if (validationBson != null)
                {
                    item.Validation = BsonSerializer.Deserialize<FieldValidation>(validationBson);
                    item.Validation.Options.Clear();
                    var optionsBson = validationBson.ArrayOr("Options");
                    if (optionsBson != null)
                        item.Validation.Options.AddRange(optionsBson.Strings());
                }

                return item;
            }));

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

            var isNew = string.IsNullOrWhiteSpace(item.Id);
            if (isNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);

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
                var incomingKey = item.Key?.Trim() ?? string.Empty;
                if (!string.Equals(existingKey, incomingKey, StringComparison.Ordinal))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong duoc thay doi key cua truong sau khi da tao");
                    return response;
                }

                item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.CreateDate = existingDoc.TimestampOr("CreateDate") ?? item.CreateDate;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingDoc, context, item.ModifyDate);

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
}
