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

    private static DynamicField MapDynamicField(BsonDocument doc)
    {
        var item = new DynamicField
        {
            Id = doc.GetValue("_id", "").ToString(),
            Key = doc.GetValue("Key", "").ToString(),
            Label = doc.GetValue("Label", "").ToString(),
            Type = doc.GetValue("Type", "text").ToString(),
            Required = doc.GetValue("Required", false).AsBoolean,
            Delete = doc.GetValue("Delete", false).AsBoolean,
            CreateDate = ToTimestamp(doc.GetValue("CreateDate", null)),
            ModifyDate = ToTimestamp(doc.GetValue("ModifyDate", null))
        };

        if (doc.Contains("Validation") && doc["Validation"].IsBsonDocument)
        {
            var vDoc = doc["Validation"].AsBsonDocument;
            item.Validation = new FieldValidation
            {
                MinLength = vDoc.GetValue("MinLength", 0).ToInt32(),
                MaxLength = vDoc.GetValue("MaxLength", 0).ToInt32(),
                Pattern = vDoc.GetValue("Pattern", "").ToString(),
                Min = vDoc.GetValue("Min", 0.0).ToDouble(),
                Max = vDoc.GetValue("Max", 0.0).ToDouble()
            };
            if (vDoc.Contains("Options") && vDoc["Options"].IsBsonArray)
            {
                foreach (var opt in vDoc["Options"].AsBsonArray)
                    item.Validation.Options.Add(opt.ToString());
            }
        }
        return item;
    }

    private static BsonDocument ToBson(DynamicField item)
    {
        var doc = new BsonDocument
        {
            { "_id", item.Id },
            { "Key", item.Key },
            { "Label", item.Label },
            { "Type", item.Type },
            { "Required", item.Required },
            { "Delete", item.Delete },
            { "CreateDate", FromTimestamp(item.CreateDate) },
            { "ModifyDate", FromTimestamp(item.ModifyDate) }
        };

        if (item.Validation != null)
        {
            var vDoc = new BsonDocument
            {
                { "MinLength", item.Validation.MinLength },
                { "MaxLength", item.Validation.MaxLength },
                { "Pattern", item.Validation.Pattern },
                { "Min", item.Validation.Min },
                { "Max", item.Validation.Max }
            };
            var optArr = new BsonArray();
            foreach (var opt in item.Validation.Options) optArr.Add(opt);
            vDoc.Add("Options", optArr);
            doc.Add("Validation", vDoc);
        }
        return doc;
    }

    private static FieldSet MapFieldSet(BsonDocument doc)
    {
        var item = new FieldSet
        {
            Id = doc.GetValue("_id", "").ToString(),
            Name = doc.GetValue("Name", "").ToString(),
            Icon = doc.GetValue("Icon", "").ToString(),
            Color = doc.GetValue("Color", "").ToString(),
            Desc = doc.GetValue("Desc", "").ToString(),
            Delete = doc.GetValue("Delete", false).AsBoolean,
            CreateDate = ToTimestamp(doc.GetValue("CreateDate", null)),
            ModifyDate = ToTimestamp(doc.GetValue("ModifyDate", null))
        };

        // Handle field_ids or FieldIds (depending on how it was saved)
        var key = doc.Contains("field_ids") ? "field_ids" : "FieldIds";
        if (doc.Contains(key) && doc[key].IsBsonArray)
        {
            foreach (var fid in doc[key].AsBsonArray)
                item.FieldIds.Add(fid.ToString());
        }
        return item;
    }

    private static BsonDocument ToBson(FieldSet item)
    {
        var fidArr = new BsonArray();
        foreach (var fid in item.FieldIds) fidArr.Add(fid);

        return new BsonDocument
        {
            { "_id", item.Id },
            { "Name", item.Name },
            { "Icon", item.Icon },
            { "Color", item.Color },
            { "Desc", item.Desc },
            { "FieldIds", fidArr },
            { "Delete", item.Delete },
            { "CreateDate", FromTimestamp(item.CreateDate) },
            { "ModifyDate", FromTimestamp(item.ModifyDate) }
        };
    }

    private static FormConfig MapFormConfig(BsonDocument doc)
    {
        var item = new FormConfig
        {
            Id = doc.GetValue("_id", "").ToString(),
            Name = doc.GetValue("Name", "").ToString(),
            Desc = doc.GetValue("Desc", "").ToString(),
            Delete = doc.GetValue("Delete", false).AsBoolean,
            CreateDate = ToTimestamp(doc.GetValue("CreateDate", null)),
            ModifyDate = ToTimestamp(doc.GetValue("ModifyDate", null))
        };

        if (doc.Contains("Tabs") && doc["Tabs"].IsBsonArray)
        {
            foreach (var tVal in doc["Tabs"].AsBsonArray)
            {
                if (!tVal.IsBsonDocument) continue;
                var tDoc = tVal.AsBsonDocument;
                var tab = new FormTabConfig
                {
                    Id = tDoc.GetValue("Id", "").ToString(),
                    Label = tDoc.GetValue("Label", "").ToString()
                };
                var skey = tDoc.Contains("set_ids") ? "set_ids" : "SetIds";
                if (tDoc.Contains(skey) && tDoc[skey].IsBsonArray)
                {
                    foreach (var sid in tDoc[skey].AsBsonArray)
                        tab.SetIds.Add(sid.ToString());
                }
                item.Tabs.Add(tab);
            }
        }
        return item;
    }

    private static BsonDocument ToBson(FormConfig item)
    {
        var tabArr = new BsonArray();
        foreach (var tab in item.Tabs)
        {
            var sidArr = new BsonArray();
            foreach (var sid in tab.SetIds) sidArr.Add(sid);

            tabArr.Add(new BsonDocument
            {
                { "Id", tab.Id },
                { "Label", tab.Label },
                { "SetIds", sidArr }
            });
        }

        return new BsonDocument
        {
            { "_id", item.Id },
            { "Name", item.Name },
            { "Desc", item.Desc },
            { "Tabs", tabArr },
            { "Delete", item.Delete },
            { "CreateDate", FromTimestamp(item.CreateDate) },
            { "ModifyDate", FromTimestamp(item.ModifyDate) }
        };
    }



    // ================================================================
    // DynamicField CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListDynamicFieldsResponse> GetListDynamicFields(
        GetListDynamicFieldsRequest request, ServerCallContext context)
    {
        var response = new GetListDynamicFieldsResponse();
        try
        {
            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            var items = await Global.CollectionDynamicField!.Find(filter).ToListAsync();
            response.Items.AddRange(items.Select(MapDynamicField));
            response.Success = true;
            logger.LogInformation("GetListDynamicFields: {Count} items", items.Count);
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
                await Global.CollectionDynamicField!.InsertOneAsync(ToBson(item));
                response.Message = "Thêm trường mới thành công!";
                logger.LogInformation("SaveDynamicField: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionDynamicField!.FindOneAndReplaceAsync(filter, ToBson(item));
                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveDynamicField: Updated {Id}", item.Id);
            }

            response.Item = item;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicField error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
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
            var result = await Global.CollectionDynamicField!.UpdateManyAsync(filter, update);

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
            var items = await Global.CollectionFieldSet!.Find(filter).ToListAsync();
            response.Items.AddRange(items.Select(MapFieldSet));
            response.Success = true;
            logger.LogInformation("GetListFieldSets: {Count} items", items.Count);
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

            if (request.IsNew)
            {
                // Luôn sinh ObjectId mới cho bản ghi mới
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                item.Delete = false;
                await Global.CollectionFieldSet!.InsertOneAsync(ToBson(item));
                response.Message = "Thêm bộ dữ liệu mới thành công!";
                logger.LogInformation("SaveFieldSet: Created {Id} with {Count} field(s)",
                    item.Id, item.FieldIds.Count);
            }
            else
            {
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionFieldSet!.FindOneAndReplaceAsync(filter, ToBson(item));
                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveFieldSet: Updated {Id} with {Count} field(s)",
                    item.Id, item.FieldIds.Count);
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
            var result = await Global.CollectionFieldSet!.UpdateManyAsync(filter, update);

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
            var items = await Global.CollectionFormConfig!.Find(filter).ToListAsync();
            response.Items.AddRange(items.Select(MapFormConfig));
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

            if (request.IsNew)
            {
                // Luôn sinh ObjectId mới cho bản ghi mới
                item.Id = ObjectId.GenerateNewId().ToString();
                    
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                item.Delete = false;
                await Global.CollectionFormConfig!.InsertOneAsync(ToBson(item));
                response.Message = "Thêm form mới thành công!";
                logger.LogInformation("SaveFormConfig: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionFormConfig!.FindOneAndReplaceAsync(filter, ToBson(item));
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
            var result = await Global.CollectionFormConfig!.UpdateManyAsync(filter, update);

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
}
