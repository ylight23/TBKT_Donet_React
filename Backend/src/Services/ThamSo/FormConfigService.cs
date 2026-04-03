using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Grpc.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using protos;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Backend.Services;

public class FormConfigService(ILogger<FormConfigService> logger)
{
    private const string PermissionCode = "thamso_formconfig";
    private static readonly Regex MultiDashRegex = new("-{2,}", RegexOptions.Compiled);

    private static void ApplyAuditMetadata(FormConfig item, BsonDocument itemBson)
    {
        item.CreateDate = itemBson.TimestampOr("CreateDate") ?? item.CreateDate;
        item.ModifyDate = itemBson.TimestampOr("ModifyDate") ?? item.ModifyDate;
        item.CreateBy = itemBson.StringOr("NguoiTao");
        item.ModifyBy = itemBson.StringOr("NguoiSua");
        item.Version = itemBson.IntOr("Version", item.Version > 0 ? item.Version : 1);
    }

    private static void ApplyAuditMetadata(DynamicField item, BsonDocument itemBson)
    {
        item.CreateDate = itemBson.TimestampOr("CreateDate") ?? item.CreateDate;
        item.ModifyDate = itemBson.TimestampOr("ModifyDate") ?? item.ModifyDate;
        item.CreateBy = itemBson.StringOr("NguoiTao");
        item.ModifyBy = itemBson.StringOr("NguoiSua");
        item.Version = itemBson.IntOr("Version", item.Version > 0 ? item.Version : 1);
    }

    private static void ApplyAuditMetadata(FieldSet item, BsonDocument itemBson)
    {
        item.CreateDate = itemBson.TimestampOr("CreateDate") ?? item.CreateDate;
        item.ModifyDate = itemBson.TimestampOr("ModifyDate") ?? item.ModifyDate;
        item.CreateBy = itemBson.StringOr("NguoiTao");
        item.ModifyBy = itemBson.StringOr("NguoiSua");
        item.Version = itemBson.IntOr("Version", item.Version > 0 ? item.Version : 1);
    }

    private static List<string> GetReferencedFieldSetIds(FormConfig item) =>
        item.Tabs
            .SelectMany(tab => tab.FieldSetIds)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

    private static string? ReadString(BsonDocument doc, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (!doc.TryGetValue(key, out var value) || value.IsBsonNull)
            {
                continue;
            }

            var text = value.ToString();
            if (!string.IsNullOrWhiteSpace(text))
            {
                return text.Trim();
            }
        }

        return null;
    }

    private static List<string> ReadStringArray(BsonDocument doc, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (!doc.TryGetValue(key, out var value) || !value.IsBsonArray)
            {
                continue;
            }

            var items = value.AsBsonArray
                .Where(item => !item.IsBsonNull)
                .Select(item => item.ToString()?.Trim())
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Distinct(StringComparer.Ordinal)
                .ToList()!;

            if (items.Count > 0)
            {
                return items;
            }
        }

        return [];
    }

    private static void HydrateTabsFromRawBson(BsonDocument formConfigDoc, FormConfig item)
    {
        if (!formConfigDoc.TryGetValue("Tabs", out var tabsValue) || !tabsValue.IsBsonArray)
        {
            return;
        }

        var tabDocs = tabsValue.AsBsonArray.OfType<BsonDocument>().ToList();
        if (tabDocs.Count == 0)
        {
            return;
        }

        // Case 1: deserializer khong ra Tabs => dung raw Tabs de dung du lieu.
        if (item.Tabs.Count == 0)
        {
            foreach (var tabDoc in tabDocs)
            {
                var tab = new FormTabConfig
                {
                    Id = ReadString(tabDoc, "Id", "_id", "id") ?? string.Empty,
                    Label = ReadString(tabDoc, "Label", "label") ?? string.Empty,
                };

                tab.FieldSetIds.AddRange(ReadStringArray(tabDoc, "FieldSetIds", "field_set_ids", "setIds"));
                item.Tabs.Add(tab);
            }

            return;
        }

        // Case 2: Tabs co roi nhung FieldSetIds bi rong do schema cu => bo sung theo index.
        for (var i = 0; i < item.Tabs.Count && i < tabDocs.Count; i++)
        {
            if (item.Tabs[i].FieldSetIds.Count > 0)
            {
                continue;
            }

            var fallbackSetIds = ReadStringArray(tabDocs[i], "FieldSetIds", "field_set_ids", "setIds");
            if (fallbackSetIds.Count > 0)
            {
                item.Tabs[i].FieldSetIds.AddRange(fallbackSetIds);
            }
        }
    }

    private static async Task<List<string>> GetMissingActiveFieldSetIdsAsync(IEnumerable<string> fieldSetIds)
    {
        var normalizedIds = ServiceMutationPolicy.NormalizeIds(fieldSetIds);
        if (normalizedIds.Count == 0) return [];

        var activeFieldSetIds = await Global.CollectionBsonFieldSet!
            .Find(ServiceMutationPolicy.ActiveIdsFilter(normalizedIds))
            .Project(Builders<BsonDocument>.Projection.Include("_id"))
            .ToListAsync();

        var activeIdSet = activeFieldSetIds
            .Select(doc => doc.IdString())
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.Ordinal);

        return normalizedIds
            .Where(id => !activeIdSet.Contains(id))
            .ToList();
    }

    private static string NormalizeFormKey(string? value)
    {
        var normalized = (value ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return string.Empty;
        }

        var decomposed = normalized.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(ch);
        }

        var ascii = builder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .ToLowerInvariant();

        ascii = Regex.Replace(ascii, "[^a-z0-9\\s_-]", string.Empty);
        ascii = Regex.Replace(ascii, "[\\s_]+", "-");
        ascii = MultiDashRegex.Replace(ascii, "-");
        return ascii.Trim('-');
    }

    private static async Task<bool> HasActiveFormKeyConflictAsync(string formId, string formKey)
    {
        if (string.IsNullOrWhiteSpace(formKey))
        {
            return false;
        }

        var conflictDoc = await Global.CollectionBsonFormConfig!
            .Find(Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Ne("_id", formId ?? string.Empty),
                Builders<BsonDocument>.Filter.Eq("Key", formKey),
                MongoDocumentHelpers.NotDeleted))
            .Project(Builders<BsonDocument>.Projection.Include("_id"))
            .FirstOrDefaultAsync();

        return conflictDoc != null;
    }

    private static DynamicField ToDynamicField(BsonDocument itemBson)
    {
        var item = new DynamicField
        {
            Id = ReadString(itemBson, "_id", "Id", "id") ?? string.Empty,
            Key = ReadString(itemBson, "Key", "key") ?? string.Empty,
            Label = ReadString(itemBson, "Label", "label") ?? string.Empty,
            Type = ReadString(itemBson, "Type", "type") ?? string.Empty,
            Required = itemBson.BoolOr("Required"),
        };

        item.CnIds.AddRange(ReadStringArray(itemBson, "CnIds", "cn_ids"));
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

        ApplyAuditMetadata(item, itemBson);
        return item;
    }

    private static FieldSetDetail ToFieldSetDetail(BsonDocument fieldSetDoc)
    {
        var fieldDocs = fieldSetDoc.GetValue("Fields", new BsonArray()).AsBsonArray;
        var cleanFieldSetDoc = new BsonDocument(fieldSetDoc);
        cleanFieldSetDoc.Remove("Fields");

        var item = new FieldSetDetail
        {
            FieldSet = new FieldSet
            {
                Id = ReadString(cleanFieldSetDoc, "_id", "Id", "id") ?? string.Empty,
                Name = ReadString(cleanFieldSetDoc, "Name", "name") ?? string.Empty,
                Icon = ReadString(cleanFieldSetDoc, "Icon", "icon") ?? string.Empty,
                Color = ReadString(cleanFieldSetDoc, "Color", "color") ?? string.Empty,
                Desc = ReadString(cleanFieldSetDoc, "Desc", "desc", "Description", "description") ?? string.Empty,
            }
        };
        item.FieldSet.FieldIds.AddRange(ReadStringArray(cleanFieldSetDoc, "FieldIds", "field_ids"));
        ApplyAuditMetadata(item.FieldSet, cleanFieldSetDoc);

        foreach (var fieldDoc in fieldDocs.OfType<BsonDocument>())
        {
            item.Fields.Add(ToDynamicField(fieldDoc));
        }

        return item;
    }

    private static FormConfig ToFormConfig(BsonDocument formConfigDoc)
    {
        var item = new FormConfig
        {
            Id = ReadString(formConfigDoc, "_id", "Id", "id") ?? string.Empty,
            Key = ReadString(formConfigDoc, "Key", "key") ?? string.Empty,
            Name = ReadString(formConfigDoc, "Name", "name") ?? string.Empty,
            Desc = ReadString(formConfigDoc, "Desc", "desc", "Description", "description") ?? string.Empty,
        };

        HydrateTabsFromRawBson(formConfigDoc, item);
        ApplyAuditMetadata(item, formConfigDoc);
        return item;
    }

    private static string ResolveRuntimeGroupPermission(string formKey, string activeMenu)
    {
        var normalizedKey = NormalizeFormKey(formKey);
        var normalizedMenu = (activeMenu ?? string.Empty).Trim();

        if (string.Equals(normalizedMenu, "tbNhom1", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(normalizedKey, "trang-bi-nhom-1", StringComparison.OrdinalIgnoreCase))
        {
            return "equipment.group1";
        }

        if (string.Equals(normalizedMenu, "tbNhom2", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(normalizedKey, "trang-bi-nhom-2", StringComparison.OrdinalIgnoreCase))
        {
            return "equipment.group2";
        }

        return string.Empty;
    }

    private static bool CanReadRuntimeFormSchema(ServerCallContext? context, string formKey, string activeMenu)
    {
        if (context == null)
            return false;

        if (context.CanView(PermissionCode))
            return true;

        var groupPermissionCode = ResolveRuntimeGroupPermission(formKey, activeMenu);
        if (!string.IsNullOrWhiteSpace(groupPermissionCode) && context.CanView(groupPermissionCode))
            return true;

        return context.CanView("equipment.view");
    }

    public async Task<GetRuntimeFormSchemaResponse> GetRuntimeFormSchemaAsync(
        GetRuntimeFormSchemaRequest request,
        ServerCallContext? context)
    {
        var response = new GetRuntimeFormSchemaResponse();
        try
        {
            var normalizedKey = NormalizeFormKey(request.Key);
            if (string.IsNullOrWhiteSpace(normalizedKey))
            {
                response.Meta = ThamSoResponseFactory.Fail("Form key khong hop le");
                return response;
            }

            if (!CanReadRuntimeFormSchema(context, normalizedKey, request.ActiveMenu))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen truy cap schema runtime cua bieu mau");
                return response;
            }

            var formConfigDoc = await Global.CollectionBsonFormConfig!
                .Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("Key", normalizedKey),
                    MongoDocumentHelpers.NotDeleted))
                .FirstOrDefaultAsync();

            if (formConfigDoc == null)
            {
                response.Meta = ThamSoResponseFactory.Fail($"Khong tim thay FormConfig co key '{normalizedKey}'");
                return response;
            }

            var formConfig = ToFormConfig(formConfigDoc);
            formConfig.Key = normalizedKey;

            var referencedFieldSetIds = formConfig.Tabs
                .SelectMany(tab => tab.FieldSetIds)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            var fieldSetDocs = referencedFieldSetIds.Count == 0
                ? []
                : await Global.CollectionBsonFieldSet!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.In("_id", referencedFieldSetIds),
                        MongoDocumentHelpers.NotDeleted))
                    .ToListAsync();

            var visibleCnIds = context.GetAccessGate()
                .GetVisibleCNs()
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var isAdmin = context?.IsAdminAccount() == true;

            var allFieldIds = fieldSetDocs
                .SelectMany(doc => doc.ArrayOr("FieldIds")?.Strings() ?? [])
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            var fieldDocs = allFieldIds.Count == 0
                ? []
                : await Global.CollectionBsonDynamicField!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.In("_id", allFieldIds),
                        MongoDocumentHelpers.NotDeleted))
                    .ToListAsync();

            var fieldLookup = new Dictionary<string, DynamicField>(StringComparer.Ordinal);
            foreach (var fieldDoc in fieldDocs)
            {
                var field = ToDynamicField(fieldDoc);
                var cnIds = field.CnIds
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Select(id => id.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var canReadField = isAdmin
                    || cnIds.Count == 0
                    || (visibleCnIds.Count > 0 && cnIds.Any(visibleCnIds.Contains));

                if (!canReadField)
                    continue;

                fieldLookup[field.Id] = field;
            }

            var fieldSetLookup = new Dictionary<string, FieldSetDetail>(StringComparer.Ordinal);
            foreach (var fieldSetDoc in fieldSetDocs)
            {
                var detail = ToFieldSetDetail(fieldSetDoc);
                detail.Fields.Clear();
                var fieldIds = detail.FieldSet.FieldIds
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .ToList();

                foreach (var fieldId in fieldIds)
                    if (fieldLookup.TryGetValue(fieldId, out var field))
                        detail.Fields.Add(field);

                fieldSetLookup[detail.FieldSet.Id] = detail;
            }

            foreach (var tab in formConfig.Tabs)
            {
                tab.FieldSets.Clear();
                foreach (var fieldSetId in tab.FieldSetIds)
                {
                    if (fieldSetLookup.TryGetValue(fieldSetId, out var detail))
                    {
                        tab.FieldSets.Add(detail);
                    }
                }
            }

            response.Item = formConfig;
            response.FieldSets.AddRange(referencedFieldSetIds
                .Where(fieldSetLookup.ContainsKey)
                .Select(fieldSetId => fieldSetLookup[fieldSetId]));
            response.Fields.AddRange(allFieldIds
                .Where(fieldLookup.ContainsKey)
                .Select(fieldId => fieldLookup[fieldId]));
            response.Meta = ThamSoResponseFactory.Ok("Tai schema runtime thanh cong");
            logger.LogInformation(
                "GetRuntimeFormSchema: key={Key}, fieldSets={FieldSetCount}, fields={FieldCount}",
                normalizedKey,
                response.FieldSets.Count,
                response.Fields.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetRuntimeFormSchema error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai schema runtime", ex.Message);
        }

        return response;
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

                var item = ToFormConfig(formConfigDoc);
                item.Key = string.IsNullOrWhiteSpace(item.Key)
                    ? NormalizeFormKey(formConfigDoc.StringOr("Key") ?? item.Name)
                    : NormalizeFormKey(item.Key);

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

            item.Key = NormalizeFormKey(string.IsNullOrWhiteSpace(item.Key) ? item.Name : item.Key);
            if (string.IsNullOrWhiteSpace(item.Key))
            {
                response.Meta = ThamSoResponseFactory.Fail("Form key khong hop le");
                return response;
            }

            if (await HasActiveFormKeyConflictAsync(item.Id, item.Key))
            {
                response.Meta = ThamSoResponseFactory.Fail($"Form key '{item.Key}' da ton tai");
                return response;
            }

            var missingFieldSetIds = await GetMissingActiveFieldSetIdsAsync(GetReferencedFieldSetIds(item));
            if (missingFieldSetIds.Count > 0)
            {
                response.Meta = ThamSoResponseFactory.Fail(
                    $"Khong the luu form vi co field set khong hop le: {string.Join(", ", missingFieldSetIds.Take(10))}");
                return response;
            }

            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = Guid.NewGuid().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);
                ApplyAuditMetadata(item, bsonDoc);

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
                ApplyAuditMetadata(item, bsonDoc);

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
