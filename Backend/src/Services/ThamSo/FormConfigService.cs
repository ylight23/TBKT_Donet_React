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

public class FormConfigService(ILogger<FormConfigService> logger)
{
    private const string PermissionCode = "thamso_formconfig";

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

    private static FieldSetDetail ToFieldSetDetail(BsonDocument fieldSetDoc)
    {
        var fieldDocs = fieldSetDoc.GetValue("Fields", new BsonArray()).AsBsonArray;
        var cleanFieldSetDoc = new BsonDocument(fieldSetDoc);
        cleanFieldSetDoc.Remove("Fields");

        var item = new FieldSetDetail
        {
            FieldSet = BsonSerializer.Deserialize<FieldSet>(cleanFieldSetDoc)
        };

        foreach (var fieldDoc in fieldDocs.OfType<BsonDocument>())
        {
            item.Fields.Add(ToDynamicField(fieldDoc));
        }

        return item;
    }

    public async Task<GetListFormConfigsResponse> GetListFormConfigsAsync(GetListFormConfigsRequest request)
    {
        var response = new GetListFormConfigsResponse();
        try
        {
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("Delete", new BsonDocument("$ne", true))),
                new BsonDocument("$lookup", new BsonDocument
                {
                    { "from", "FieldSet" },
                    { "let", new BsonDocument("allFieldSetIds", new BsonDocument("$reduce", new BsonDocument
                        {
                            { "input", "$Tabs" },
                            { "initialValue", new BsonArray() },
                            { "in", new BsonDocument("$concatArrays", new BsonArray
                                {
                                    "$$value",
                                    new BsonDocument("$ifNull", new BsonArray { "$$this.FieldSetIds", new BsonArray() })
                                })
                            }
                        }))
                    },
                    { "pipeline", new BsonArray
                        {
                            new BsonDocument("$match", new BsonDocument("$expr", new BsonDocument("$and", new BsonArray
                            {
                                new BsonDocument("$in", new BsonArray { "$_id", "$$allFieldSetIds" }),
                                new BsonDocument("$ne", new BsonArray { "$Delete", true }),
                            }))),
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
                            }))),
                        }
                    },
                    { "as", "JoinedFieldSets" }
                }),
            };

            var resultDocs = await Global.CollectionBsonFormConfig!
                .Aggregate<BsonDocument>(pipeline)
                .ToListAsync();

            foreach (var resultDoc in resultDocs)
            {
                var formConfigDoc = new BsonDocument(resultDoc);
                var joinedFieldSetDocs = formConfigDoc.GetValue("JoinedFieldSets", new BsonArray()).AsBsonArray
                    .OfType<BsonDocument>()
                    .ToDictionary(doc => doc["_id"].ToString() ?? string.Empty, StringComparer.Ordinal);
                formConfigDoc.Remove("JoinedFieldSets");

                var item = BsonSerializer.Deserialize<FormConfig>(formConfigDoc);

                foreach (var tab in item.Tabs)
                {
                    foreach (var fieldSetId in tab.FieldSetIds)
                    {
                        if (!joinedFieldSetDocs.TryGetValue(fieldSetId, out var fieldSetDoc))
                        {
                            continue;
                        }

                        tab.FieldSets.Add(ToFieldSetDetail(fieldSetDoc));
                    }
                }

                response.Items.Add(item);
            }

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} items");
            logger.LogInformation("GetListFormConfigs: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFormConfigs error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai danh sach form", ex.Message);
        }

        return response;
    }

    public async Task<SaveFormConfigResponse> SaveFormConfigAsync(SaveFormConfigRequest request, ServerCallContext? context)
    {
        var response = new SaveFormConfigResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen them hoac cap nhat form");
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Meta = ThamSoResponseFactory.Fail("Du lieu khong hop le");
                return response;
            }

            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);

                await Global.CollectionBsonFormConfig!.InsertOneAsync(bsonDoc);
                response.Meta = ThamSoResponseFactory.Ok("Them form moi thanh cong!");
                logger.LogInformation("SaveFormConfig: Created {Id}", item.Id);
            }
            else
            {
                var existingDoc = await Global.CollectionBsonFormConfig!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                        MongoDocumentHelpers.NotDeleted))
                    .FirstOrDefaultAsync();

                if (existingDoc == null)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay form dang hoat dong de cap nhat");
                    return response;
                }

                item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.CreateDate = existingDoc.TimestampOr("CreateDate") ?? item.CreateDate;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingDoc, context, item.ModifyDate);

                var replaceResult = await Global.CollectionBsonFormConfig!
                    .ReplaceOneAsync(Builders<BsonDocument>.Filter.Eq("_id", item.Id), bsonDoc);

                if (replaceResult.MatchedCount == 0)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay form dang hoat dong de cap nhat");
                    return response;
                }

                response.Meta = ThamSoResponseFactory.Ok("Cap nhat thanh cong!");
                logger.LogInformation("SaveFormConfig: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFormConfig error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi luu form", ex.Message);
        }

        return response;
    }

    public async Task<DeleteBaseResponse> DeleteFormConfigAsync(DeleteFormConfigRequest request, ServerCallContext? context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            if (!ServiceMutationPolicy.CanDeleteThamSo(context, PermissionCode))
            {
                response.Success = false;
                response.Message = "Khong co quyen xoa form";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            var result = await Global.CollectionBsonFormConfig!.UpdateManyAsync(
                ServiceMutationPolicy.ActiveIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildSoftDeleteUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da xoa mem {result.ModifiedCount} form";
            logger.LogInformation("DeleteFormConfig: Soft deleted {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteFormConfig error");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
    }

    public async Task<StatusResponse> RestoreFormConfigAsync(RestoreFormConfigRequest request, ServerCallContext? context)
    {
        var response = new StatusResponse();
        try
        {
            if (!ServiceMutationPolicy.CanRestoreThamSo(context))
            {
                response.Success = false;
                response.Message = "Chi admin cau hinh hoac superadmin moi duoc khoi phuc form";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co form nao de khoi phuc";
                return response;
            }

            var deletedFormConfigDocs = await Global.CollectionBsonFormConfig!
                .Find(ServiceMutationPolicy.DeletedIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Name").Include("Tabs"))
                .ToListAsync();

            if (deletedFormConfigDocs.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong tim thay form da xoa de khoi phuc";
                return response;
            }

            var referencedFieldSetIds = deletedFormConfigDocs
                .SelectMany(doc => doc.GetValue("Tabs", new BsonArray()).AsBsonArray
                    .OfType<BsonDocument>()
                    .SelectMany(tab => tab.GetValue("FieldSetIds", new BsonArray()).AsBsonArray
                        .Where(value => !value.IsBsonNull)
                        .Select(value => value.ToString() ?? string.Empty)))
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (referencedFieldSetIds.Count > 0)
            {
                var activeFieldSetIds = await Global.CollectionBsonFieldSet!
                    .Find(ServiceMutationPolicy.ActiveIdsFilter(referencedFieldSetIds))
                    .Project(Builders<BsonDocument>.Projection.Include("_id"))
                    .ToListAsync();

                var activeFieldSetIdSet = activeFieldSetIds
                    .Select(doc => doc["_id"].ToString() ?? string.Empty)
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .ToHashSet(StringComparer.Ordinal);

                var invalidForms = deletedFormConfigDocs
                    .Where(doc => doc.GetValue("Tabs", new BsonArray()).AsBsonArray
                        .OfType<BsonDocument>()
                        .SelectMany(tab => tab.GetValue("FieldSetIds", new BsonArray()).AsBsonArray
                            .Where(value => !value.IsBsonNull)
                            .Select(value => value.ToString() ?? string.Empty))
                        .Any(fieldSetId => !string.IsNullOrWhiteSpace(fieldSetId) && !activeFieldSetIdSet.Contains(fieldSetId)))
                    .Select(doc => doc.GetValue("Name", doc["_id"]).ToString())
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (invalidForms.Count > 0)
                {
                    response.Success = false;
                    response.Message = $"Khong the khoi phuc form vi dang tham chieu field set khong hop le: {string.Join(", ", invalidForms.Take(10))}";
                    return response;
                }
            }

            var result = await Global.CollectionBsonFormConfig!.UpdateManyAsync(
                ServiceMutationPolicy.DeletedIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildRestoreUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da khoi phuc {result.ModifiedCount} form";
            logger.LogInformation("RestoreFormConfig: Restored {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RestoreFormConfig error");
            response.Success = false;
            response.Message = "Loi khi khoi phuc form";
            response.MessageException = ex.Message;
        }

        return response;
    }
}
