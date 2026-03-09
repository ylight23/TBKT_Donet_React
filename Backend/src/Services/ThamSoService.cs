using Google.Protobuf.Collections;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public class ThamSoServiceImpl(ILogger<ThamSoServiceImpl> logger) :
   ThamSoService.ThamSoServiceBase
{



    private static Timestamp? ToTimestamp(BsonValue? value)
    {
        if (value == null || value.IsBsonNull) return null;
        if (value.IsBsonDateTime) return Timestamp.FromDateTime(value.ToUniversalTime());
        if (value.IsBsonDocument)
        {
            var doc = value.AsBsonDocument;
            return new Timestamp
            {
                Seconds = doc.GetValue("Seconds", 0L).ToInt64(),
                Nanos = doc.GetValue("Nanos", 0).ToInt32()
            };
        }
        return null;
    }



    private static BsonValue FromTimestamp(Timestamp? ts)
    {
        if (ts == null) return BsonNull.Value;
        // Store as subdocument to keep precision and ease of proto mapping
        return new BsonDocument { { "Seconds", ts.Seconds }, { "Nanos", ts.Nanos } };
    }


    // DynamicField CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListDynamicFieldsResponse> GetListDynamicFields(
        GetListDynamicFieldsRequest request, ServerCallContext context)
    {
        var response = new GetListDynamicFieldsResponse();
        try
        {
            //  if (request.SearchItem.ModifyDate != null)
            //     {
            //         var fromDate = request.SearchItem.FromDate.ToDateTime();
            //         var fromSeconds = new BsonInt64(new DateTimeOffset(fromDate).ToUnixTimeSeconds());
            //         defaultFilter &= builder.Gte("CreateDate.Seconds", fromSeconds);
            //         logger.LogInformation($"Filter FromDate: {fromDate:yyyy-MM-dd HH:mm:ss.fff} UTC");
            //     }


            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            var bsonItems = Global.CollectionBsonDynamicField!.Find(filter).ToList();


            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var module = BsonSerializer.Deserialize<DynamicField>(itemBson);
                if (itemBson.Contains("Validation") && itemBson["Validation"].IsBsonDocument)
                {
                    module.Validation = BsonSerializer.Deserialize<FieldValidation>(itemBson["Validation"].AsBsonDocument);
                }
                // if (itemBson.Contains("ModifyDate") && itemBson["ModifyDate"].IsBsonDocument)
                // {
                //     module.ModifyDate = BsonSerializer.Deserialize<Timestamp>(itemBson["ModifyDate"].AsBsonDocument);
                // }

                return module;
            }));
            response.Success = true;
            logger.LogInformation($"GetListDynamicFields: {response.Items.Count} items");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicFields error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override async Task<SaveDynamicFieldResponse> SaveDynamicField(
        SaveDynamicFieldRequest request, ServerCallContext context)
    {
        var response = new SaveDynamicFieldResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                return response;
            }

            if (request.IsNew)
            {
                // Luôn sinh ObjectId mới cho bản ghi mới, bỏ qua ID tạm từ Frontend
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                item.Delete = false;
                await Global.CollectionDynamicField!.InsertOneAsync(item);
                response.Message = "Thêm trường mới thành công!";
                logger.LogInformation("SaveDynamicField: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                var filter = Builders<DynamicField>.Filter.Eq(x => x.Id, item.Id);
                await Global.CollectionDynamicField!.FindOneAndReplaceAsync(filter, item);
                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveDynamicField: Updated {Id}", item.Id);
            }

            response.Item = item;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message} [{ex.StackTrace}]");
            response.Success = false;
            response.Message = "Có lỗi xảy ra khi lưu!";
            response.MessageException = ex.Message;
        }

        GC.Collect();
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteDynamicField(
        DeleteDynamicFieldRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var ids = new List<string>();
            if (!string.IsNullOrEmpty(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var update = Builders<BsonDocument>.Update.Set("Delete", true);
            var result = await Global.CollectionBsonDynamicField!.UpdateManyAsync(filter, update);

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Đã xoá {result.ModifiedCount} trường";
            logger.LogInformation("DeleteDynamicField: Deleted {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicField error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // FieldSet CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListFieldSetsResponse> GetListFieldSets(
        GetListFieldSetsRequest request, ServerCallContext context)
    {
        var response = new GetListFieldSetsResponse();
        try
        {
            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            var bsonItems = Global.CollectionBsonFieldSet!.Find(filter).ToList();

            response.Items.AddRange(bsonItems.Select(b => MapFieldSetWithFields(b)));

            response.Success = true;
            logger.LogInformation("GetListFieldSets: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFieldSets error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override async Task<SaveFieldSetResponse> SaveFieldSet(
        SaveFieldSetRequest request, ServerCallContext context)
    {
        var response = new SaveFieldSetResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                return response;
            }

            // Lưu FieldSet dưới dạng BsonDocument với field_ids (chỉ ID, không embed)
            var fieldIds = item.Fields.Select(f => f.Id).ToList();
            var bsonDoc = new BsonDocument
            {
                { "Name",   item.Name },
                { "Icon",   item.Icon },
                { "Color",  item.Color },
                { "Desc",   item.Desc },
                { "Delete", item.Delete },
                { "FieldIds", new BsonArray(fieldIds) },
            };

            if (request.IsNew)
            {
                var newId = ObjectId.GenerateNewId().ToString();
                bsonDoc["_id"] = newId;
                bsonDoc["CreateDate"] = FromTimestamp(Timestamp.FromDateTime(DateTime.UtcNow));
                await Global.CollectionBsonFieldSet!.InsertOneAsync(bsonDoc);
                item.Id = newId;
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                response.Message = "Thêm bộ dữ liệu mới thành công!";
                logger.LogInformation("SaveFieldSet: Created {Id} with {Count} field(s)", newId, fieldIds.Count);
            }
            else
            {
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = FromTimestamp(Timestamp.FromDateTime(DateTime.UtcNow));
                var f = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonFieldSet!.FindOneAndReplaceAsync(f, bsonDoc);
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveFieldSet: Updated {Id} with {Count} field(s)", item.Id, fieldIds.Count);
            }

            response.Item = item;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFieldSet error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteFieldSet(
        DeleteFieldSetRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var ids = new List<string>();
            if (!string.IsNullOrEmpty(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var update = Builders<BsonDocument>.Update.Set("Delete", true);
            var result = await Global.CollectionBsonFieldSet!.UpdateManyAsync(filter, update);

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Đã xoá {result.ModifiedCount} bộ dữ liệu";
            logger.LogInformation("DeleteFieldSet: Deleted {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteFieldSet error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // FormConfig CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListFormConfigsResponse> GetListFormConfigs(
        GetListFormConfigsRequest request, ServerCallContext context)
    {
        var response = new GetListFormConfigsResponse();
        try
        {
            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            var items = await Global.CollectionBsonFormConfig!.Find(filter).ToListAsync();
            response.Items.AddRange(items.Select(MapFormConfigWithSets));

            response.Success = true;
            logger.LogInformation("GetListFormConfigs: {Count} items", items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFormConfigs error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override async Task<SaveFormConfigResponse> SaveFormConfig(
        SaveFormConfigRequest request, ServerCallContext context)
    {
        var response = new SaveFormConfigResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                return response;
            }

            // Lưu FormConfig với set_ids (chỉ ID, không embed FieldSet)
            var tabsArray = new BsonArray(item.Tabs.Select(tab => new BsonDocument
            {
                { "Id",     tab.Id },
                { "Label",  tab.Label },
                { "SetIds", new BsonArray(tab.FieldSets.Select(fs => fs.Id)) },
            }));

            var bsonDoc = new BsonDocument
            {
                { "Name",   item.Name },
                { "Desc",   item.Desc },
                { "Delete", item.Delete },
                { "Tabs",   tabsArray },
            };

            if (request.IsNew)
            {
                var newId = ObjectId.GenerateNewId().ToString();
                bsonDoc["_id"] = newId;
                bsonDoc["CreateDate"] = FromTimestamp(Timestamp.FromDateTime(DateTime.UtcNow));
                await Global.CollectionBsonFormConfig!.InsertOneAsync(bsonDoc);
                item.Id = newId;
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                response.Message = "Thêm form mới thành công!";
                logger.LogInformation("SaveFormConfig: Created {Id}", newId);
            }
            else
            {
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = FromTimestamp(Timestamp.FromDateTime(DateTime.UtcNow));
                var f = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonFormConfig!.FindOneAndReplaceAsync(f, bsonDoc);
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveFormConfig: Updated {Id}", item.Id);
            }

            response.Item = item;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFormConfig error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteFormConfig(
        DeleteFormConfigRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var ids = new List<string>();
            if (!string.IsNullOrEmpty(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var update = Builders<BsonDocument>.Update.Set("Delete", true);
            var result = await Global.CollectionBsonFormConfig!.UpdateManyAsync(filter, update);

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Đã xoá {result.ModifiedCount} form";
            logger.LogInformation("DeleteFormConfig: Deleted {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteFormConfig error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // Helpers
    // ================================================================
    private static DynamicField MapDynamicField(BsonDocument b)
    {
        var f = BsonSerializer.Deserialize<DynamicField>(b);
        if (b.Contains("Validation") && b["Validation"].IsBsonDocument)
            f.Validation = BsonSerializer.Deserialize<FieldValidation>(b["Validation"].AsBsonDocument);
        return f;
    }

    /// <summary>
    /// Map FieldSet BsonDocument → proto FieldSet với Fields được resolve từ DB
    /// </summary>
    private static FieldSet MapFieldSetWithFields(BsonDocument bson)
    {
        var fieldSet = new FieldSet
        {
            Id     = bson.GetValue("_id", BsonNull.Value).ToString() ?? "",
            Name   = bson.GetValue("Name", "").AsString,
            Icon   = bson.GetValue("Icon", "").AsString,
            Color  = bson.GetValue("Color", "").AsString,
            Desc   = bson.GetValue("Desc", "").AsString,
            Delete = bson.GetValue("Delete", false).ToBoolean(),
        };
        if (bson.Contains("CreateDate"))
            fieldSet.CreateDate = ToTimestamp(bson["CreateDate"]);
        if (bson.Contains("ModifyDate"))
            fieldSet.ModifyDate = ToTimestamp(bson["ModifyDate"]);

        // Resolve field_ids → DynamicField objects
        if (bson.Contains("FieldIds") && bson["FieldIds"].IsBsonArray)
        {
            var fieldIds = bson["FieldIds"].AsBsonArray.Select(v => v.AsString).ToList();
            if (fieldIds.Count > 0)
            {
                var filter = Builders<BsonDocument>.Filter.In("_id", fieldIds)
                           & Builders<BsonDocument>.Filter.Ne("Delete", true);
                var fieldBsons = Global.CollectionBsonDynamicField!.Find(filter).ToList();
                fieldSet.Fields.AddRange(fieldBsons.Select(MapDynamicField));
            }
        }

        return fieldSet;
    }

    /// <summary>
    /// Map FormConfig BsonDocument → proto FormConfig với embedded FieldSet+DynamicField
    /// </summary>
    private static FormConfig MapFormConfigWithSets(BsonDocument bson)
    {
        var config = new FormConfig
        {
            Id     = bson.GetValue("_id", BsonNull.Value).ToString() ?? "",
            Name   = bson.GetValue("Name", "").AsString,
            Desc   = bson.GetValue("Desc", "").AsString,
            Delete = bson.GetValue("Delete", false).ToBoolean(),
        };
        if (bson.Contains("CreateDate"))
            config.CreateDate = ToTimestamp(bson["CreateDate"]);
        if (bson.Contains("ModifyDate"))
            config.ModifyDate = ToTimestamp(bson["ModifyDate"]);

        if (bson.Contains("Tabs") && bson["Tabs"].IsBsonArray)
        {
            foreach (var tabBson in bson["Tabs"].AsBsonArray)
            {
                if (!tabBson.IsBsonDocument) continue;
                var tabDoc = tabBson.AsBsonDocument;
                var tab = new FormTabConfig
                {
                    Id    = tabDoc.GetValue("Id", "").AsString,
                    Label = tabDoc.GetValue("Label", "").AsString,
                };

                // Resolve set_ids → FieldSet objects (with embedded DynamicFields)
                if (tabDoc.Contains("SetIds") && tabDoc["SetIds"].IsBsonArray)
                {
                    var setIds = tabDoc["SetIds"].AsBsonArray.Select(v => v.AsString).ToList();
                    if (setIds.Count > 0)
                    {
                        var setFilter = Builders<BsonDocument>.Filter.In("_id", setIds)
                                      & Builders<BsonDocument>.Filter.Ne("Delete", true);
                        var setBsons = Global.CollectionBsonFieldSet!.Find(setFilter).ToList();
                        tab.FieldSets.AddRange(setBsons.Select(MapFieldSetWithFields));
                    }
                }

                config.Tabs.Add(tab);
            }
        }

        return config;
    }
}
