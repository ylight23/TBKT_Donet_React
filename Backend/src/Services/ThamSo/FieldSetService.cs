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

public class FieldSetService(ILogger<FieldSetService> logger)
{
    private const string PermissionCode = "thamso_fieldset";

    private static void ApplyAuditMetadata(FieldSet item, BsonDocument itemBson)
    {
        item.CreateDate = itemBson.TimestampOr("CreateDate") ?? item.CreateDate;
        item.ModifyDate = itemBson.TimestampOr("ModifyDate") ?? item.ModifyDate;
        item.CreateBy = itemBson.StringOr("NguoiTao");
        item.ModifyBy = itemBson.StringOr("NguoiSua");
        item.Version = itemBson.IntOr("Version", item.Version > 0 ? item.Version : 1);
    }

    private static async Task<List<string>> GetMissingActiveFieldIdsAsync(IEnumerable<string> fieldIds)
    {
        var normalizedIds = ServiceMutationPolicy.NormalizeIds(fieldIds);
        if (normalizedIds.Count == 0) return [];

        var activeFieldIds = await Global.CollectionBsonDynamicField!
            .Find(ServiceMutationPolicy.ActiveIdsFilter(normalizedIds))
            .Project(Builders<BsonDocument>.Projection.Include("_id"))
            .ToListAsync();

        var activeIdSet = activeFieldIds
            .Select(doc => doc.IdString())
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.Ordinal);

        return normalizedIds
            .Where(id => !activeIdSet.Contains(id))
            .ToList();
    }

    private static void RemoveFieldSetIdsFromFormConfigDoc(BsonDocument formConfigDoc, HashSet<string> removeIds)
    {
        if (!formConfigDoc.TryGetValue("Tabs", out var tabsValue) || !tabsValue.IsBsonArray)
            return;

        foreach (var tabValue in tabsValue.AsBsonArray.OfType<BsonDocument>())
        {
            if (!tabValue.TryGetValue("FieldSetIds", out var fieldSetIdsValue) || !fieldSetIdsValue.IsBsonArray)
                continue;

            var filteredIds = fieldSetIdsValue.AsBsonArray
                .Where(value => !value.IsBsonNull)
                .Select(value => value.ToString() ?? string.Empty)
                .Where(id => !string.IsNullOrWhiteSpace(id) && !removeIds.Contains(id))
                .Select(id => (BsonValue)id)
                .ToArray();

            tabValue["FieldSetIds"] = new BsonArray(filteredIds);
        }
    }

    private static DynamicField ToDynamicField(BsonDocument itemBson)
    {
        var item = BsonSerializer.Deserialize<DynamicField>(itemBson);
        var validationBson = itemBson.GetValue("Validation", BsonNull.Value);
        if (validationBson.IsBsonDocument)
        {
            item.Validation = BsonSerializer.Deserialize<FieldValidation>(validationBson.AsBsonDocument);
            item.Validation.Options.Clear();

            var optionsBson = validationBson.AsBsonDocument.GetValue("Options", BsonNull.Value);
            if (optionsBson.IsBsonArray)
            {
                item.Validation.Options.AddRange(
                    optionsBson.AsBsonArray
                        .Where(value => !value.IsBsonNull)
                        .Select(value => value.ToString()));
            }
        }

        return item;
    }

    public async Task<GetListFieldSetsResponse> GetListFieldSetsAsync(GetListFieldSetsRequest request)
    {
        var response = new GetListFieldSetsResponse();
        try
        {
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("Delete", new BsonDocument("$ne", true))),
                new BsonDocument("$lookup", new BsonDocument
                {
                    { "from", "DynamicField" },
                    { "let", new BsonDocument("fieldIds", "$FieldIds") },
                    { "pipeline", new BsonArray
                        {
                            new BsonDocument("$match", new BsonDocument("$expr", new BsonDocument("$and", new BsonArray
                            {
                                new BsonDocument("$in", new BsonArray { "$_id", "$$fieldIds" }),
                                new BsonDocument("$ne", new BsonArray { "$Delete", true }),
                            }))),
                        }
                    },
                    { "as", "Fields" }
                }),
                new BsonDocument("$addFields", new BsonDocument("Fields", new BsonDocument("$map", new BsonDocument
                {
                    { "input", "$FieldIds" },
                    { "as", "fieldId" },
                    { "in", new BsonDocument("$first", new BsonDocument("$filter", new BsonDocument
                        {
                            { "input", "$Fields" },
                            { "as", "field" },
                            { "cond", new BsonDocument("$eq", new BsonArray { "$$field._id", "$$fieldId" }) }
                        }))
                    }
                }))),
                new BsonDocument("$addFields", new BsonDocument("Fields", new BsonDocument("$filter", new BsonDocument
                {
                    { "input", "$Fields" },
                    { "as", "field" },
                    { "cond", new BsonDocument("$ne", new BsonArray { "$$field", BsonNull.Value }) }
                })))
            };

            var resultDocs = await Global.CollectionBsonFieldSet!
                .Aggregate<BsonDocument>(pipeline)
                .ToListAsync();

            foreach (var resultDoc in resultDocs)
            {
                var fieldSetDoc = new BsonDocument(resultDoc);
                var fieldDocs = fieldSetDoc.GetValue("Fields", new BsonArray()).AsBsonArray;
                fieldSetDoc.Remove("Fields");

                var item = new FieldSetDetail
                {
                    FieldSet = BsonSerializer.Deserialize<FieldSet>(fieldSetDoc)
                };
                ApplyAuditMetadata(item.FieldSet, fieldSetDoc);

                foreach (var fieldDoc in fieldDocs.OfType<BsonDocument>())
                {
                    item.Fields.Add(ToDynamicField(fieldDoc));
                }

                response.Items.Add(item);
            }

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} items");
            logger.LogInformation("GetListFieldSets: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFieldSets error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai danh sach bo du lieu kem field", ex.Message);
        }

        return response;
    }

    public async Task<SaveFieldSetResponse> SaveFieldSetAsync(SaveFieldSetRequest request, ServerCallContext? context)
    {
        var response = new SaveFieldSetResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen them hoac cap nhat bo du lieu");
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Meta = ThamSoResponseFactory.Fail("Du lieu khong hop le");
                return response;
            }

            var missingFieldIds = await GetMissingActiveFieldIdsAsync(item.FieldIds);
            if (missingFieldIds.Count > 0)
            {
                response.Meta = ThamSoResponseFactory.Fail(
                    $"Khong the luu bo du lieu vi co field khong hop le: {string.Join(", ", missingFieldIds.Take(10))}");
                return response;
            }

            var isNew = string.IsNullOrWhiteSpace(item.Id);
            if (isNew)
            {
                item.Id = Guid.NewGuid().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);
                ApplyAuditMetadata(item, bsonDoc);

                await Global.CollectionBsonFieldSet!.InsertOneAsync(bsonDoc);
                response.Item = item;
                response.Meta = ThamSoResponseFactory.Ok("Them bo du lieu moi thanh cong!");
                logger.LogInformation("SaveFieldSet: Created {Id} with {Count} field(s)", item.Id, item.FieldIds.Count);
            }
            else
            {
                var existingDoc = await Global.CollectionBsonFieldSet!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                        MongoDocumentHelpers.NotDeleted))
                    .FirstOrDefaultAsync();

                if (existingDoc == null)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay bo du lieu dang hoat dong de cap nhat");
                    return response;
                }

                item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.CreateDate = existingDoc.TimestampOr("CreateDate") ?? item.CreateDate;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingDoc, context, item.ModifyDate);
                ApplyAuditMetadata(item, bsonDoc);

                var result = await Global.CollectionBsonFieldSet!
                    .ReplaceOneAsync(Builders<BsonDocument>.Filter.Eq("_id", item.Id), bsonDoc);

                response.Item = item;
                response.Meta = result.MatchedCount > 0
                    ? ThamSoResponseFactory.Ok("Cap nhat thanh cong!")
                    : ThamSoResponseFactory.Fail("Cap nhat khong thanh cong!");

                logger.LogInformation("SaveFieldSet: Updated {Id} with {Count} field(s)", item.Id, item.FieldIds.Count);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFieldSet error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi luu bo du lieu", ex.Message);
        }

        return response;
    }

    public async Task<DeleteBaseResponse> DeleteFieldSetAsync(DeleteFieldSetRequest request, ServerCallContext? context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            if (!ServiceMutationPolicy.CanDeleteThamSo(context, PermissionCode))
            {
                response.Success = false;
                response.Message = "Khong co quyen xoa bo du lieu";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co bo du lieu nao de xoa";
                return response;
            }

            var removeIdSet = normalizedIds.ToHashSet(StringComparer.Ordinal);
            var result = await Global.CollectionBsonFieldSet!.UpdateManyAsync(
                ServiceMutationPolicy.ActiveIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildSoftDeleteUpdate(context));

            var formConfigDocs = await Global.CollectionBsonFormConfig!
                .Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.AnyIn("Tabs.FieldSetIds", normalizedIds),
                    MongoDocumentHelpers.NotDeleted))
                .ToListAsync();

            foreach (var existingDoc in formConfigDocs)
            {
                var nextDoc = existingDoc.DeepClone().AsBsonDocument;
                RemoveFieldSetIdsFromFormConfigDoc(nextDoc, removeIdSet);
                ServiceMutationPolicy.ApplyModifyAudit(nextDoc, existingDoc, context);
                await Global.CollectionBsonFormConfig.ReplaceOneAsync(
                    Builders<BsonDocument>.Filter.Eq("_id", existingDoc.IdString()),
                    nextDoc);
            }

            var count = result.ModifiedCount;
            response.Success = count > 0;
            response.Message = $"Da xoa mem {count} bo du lieu va da go {normalizedIds.Count} fieldset khoi form tabs lien quan";
            logger.LogInformation(
                "DeleteFieldSet: Soft deleted {Count} field set(s) and cleaned {FormCount} form config(s)",
                count,
                formConfigDocs.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteFieldSet error");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
    }

    public async Task<StatusResponse> RestoreFieldSetAsync(RestoreFieldSetRequest request, ServerCallContext? context)
    {
        var response = new StatusResponse();
        try
        {
            if (!ServiceMutationPolicy.CanRestoreThamSo(context))
            {
                response.Success = false;
                response.Message = "Chi admin cau hinh hoac superadmin moi duoc khoi phuc bo du lieu";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co bo du lieu nao de khoi phuc";
                return response;
            }

            var deletedFieldSetDocs = await Global.CollectionBsonFieldSet!
                .Find(ServiceMutationPolicy.DeletedIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Name").Include("FieldIds"))
                .ToListAsync();

            if (deletedFieldSetDocs.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong tim thay bo du lieu da xoa de khoi phuc";
                return response;
            }

            var referencedFieldIds = deletedFieldSetDocs
                .SelectMany(doc => doc.GetValue("FieldIds", new BsonArray()).AsBsonArray
                    .Where(value => !value.IsBsonNull)
                    .Select(value => value.ToString() ?? string.Empty))
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (referencedFieldIds.Count > 0)
            {
                var activeFieldIds = await Global.CollectionBsonDynamicField!
                    .Find(ServiceMutationPolicy.ActiveIdsFilter(referencedFieldIds))
                    .Project(Builders<BsonDocument>.Projection.Include("_id"))
                    .ToListAsync();

                var activeFieldIdSet = activeFieldIds
                    .Select(doc => doc["_id"].ToString() ?? string.Empty)
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .ToHashSet(StringComparer.Ordinal);

                var invalidFieldSets = deletedFieldSetDocs
                    .Where(doc => doc.GetValue("FieldIds", new BsonArray()).AsBsonArray
                        .Where(value => !value.IsBsonNull)
                        .Select(value => value.ToString() ?? string.Empty)
                        .Any(fieldId => !string.IsNullOrWhiteSpace(fieldId) && !activeFieldIdSet.Contains(fieldId)))
                    .Select(doc => doc.GetValue("Name", doc["_id"]).ToString())
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (invalidFieldSets.Count > 0)
                {
                    response.Success = false;
                    response.Message = $"Khong the khoi phuc bo du lieu vi dang tham chieu field khong hop le: {string.Join(", ", invalidFieldSets.Take(10))}";
                    return response;
                }
            }

            var result = await Global.CollectionBsonFieldSet!.UpdateManyAsync(
                ServiceMutationPolicy.DeletedIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildRestoreUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da khoi phuc {result.ModifiedCount} bo du lieu";
            logger.LogInformation("RestoreFieldSet: Restored {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RestoreFieldSet error");
            response.Success = false;
            response.Message = "Loi khi khoi phuc bo du lieu";
            response.MessageException = ex.Message;
        }

        return response;
    }
}
