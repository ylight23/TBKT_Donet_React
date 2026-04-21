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
    private static readonly HashSet<string> AllowedFieldSetKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "trang_bi.thong_tin_chung",
        "trang_bi.thong_so_ky_thuat",
        "trang_bi.dong_bo",
        "trang_bi.bao_quan",
        "trang_bi.bao_duong",
        "trang_bi.sua_chua",
        "trang_bi.niem_cat",
        "trang_bi.dieu_dong",
    };

    private static string RequiredString(BsonDocument doc, string key)
    {
        if (!doc.TryGetValue(key, out var value) || value.IsBsonNull)
            throw new FormatException($"Thieu field bat buoc '{key}'.");
        if (!value.IsString)
            throw new FormatException($"Field '{key}' phai la string.");

        var text = value.AsString.Trim();
        if (string.IsNullOrWhiteSpace(text))
            throw new FormatException($"Field '{key}' khong duoc de trong.");
        return text;
    }

    private static string OptionalStringStrict(BsonDocument doc, string key)
    {
        if (!doc.TryGetValue(key, out var value) || value.IsBsonNull) return string.Empty;
        if (!value.IsString)
            throw new FormatException($"Field '{key}' phai la string.");
        return value.AsString.Trim();
    }

    private static string NormalizeFieldSetKey(string? value)
        => (value ?? string.Empty).Trim();

    private static string MapLegacyLoaiNghiepVuToFieldSetKey(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "bao_quan" => "trang_bi.bao_quan",
            "bao_duong" => "trang_bi.bao_duong",
            "sua_chua" => "trang_bi.sua_chua",
            "niem_cat" => "trang_bi.niem_cat",
            "dieu_dong" => "trang_bi.dieu_dong",
            _ => string.Empty,
        };
    }

    private static string ResolveFieldSetKey(BsonDocument fieldSetDoc)
    {
        var directKey = NormalizeFieldSetKey(OptionalStringStrict(fieldSetDoc, "Key"));
        if (!string.IsNullOrWhiteSpace(directKey))
            return directKey;

        return MapLegacyLoaiNghiepVuToFieldSetKey(OptionalStringStrict(fieldSetDoc, "LoaiNghiepVu"));
    }

    private static bool OptionalBoolStrict(BsonDocument doc, string key)
    {
        if (!doc.TryGetValue(key, out var value) || value.IsBsonNull) return false;
        if (!value.IsBoolean)
            throw new FormatException($"Field '{key}' phai la boolean.");
        return value.AsBoolean;
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

    private static GridRenderType ParseGridRenderType(BsonDocument? doc, string key, GridRenderType fallback)
    {
        if (doc == null || !doc.TryGetValue(key, out var value) || value.IsBsonNull) return fallback;
        if (value.IsInt32) return Enum.IsDefined(typeof(GridRenderType), value.AsInt32) ? (GridRenderType)value.AsInt32 : fallback;
        if (value.IsInt64) return Enum.IsDefined(typeof(GridRenderType), (int)value.AsInt64) ? (GridRenderType)(int)value.AsInt64 : fallback;
        if (value.IsString && Enum.TryParse<GridRenderType>(value.AsString, true, out var parsed)) return parsed;
        return fallback;
    }

    private static GridWidthPreset ParseGridWidthPreset(BsonDocument? doc, string key, GridWidthPreset fallback)
    {
        if (doc == null || !doc.TryGetValue(key, out var value) || value.IsBsonNull) return fallback;
        if (value.IsInt32) return Enum.IsDefined(typeof(GridWidthPreset), value.AsInt32) ? (GridWidthPreset)value.AsInt32 : fallback;
        if (value.IsInt64) return Enum.IsDefined(typeof(GridWidthPreset), (int)value.AsInt64) ? (GridWidthPreset)(int)value.AsInt64 : fallback;
        if (value.IsString && Enum.TryParse<GridWidthPreset>(value.AsString, true, out var parsed)) return parsed;
        return fallback;
    }

    private static IEnumerable<string> ReadStringArrayStrict(BsonDocument doc, string key)
    {
        var array = doc.ArrayOr(key);
        if (array == null) yield break;

        foreach (var value in array)
        {
            if (value.IsBsonNull) continue;
            if (!value.IsString)
            {
                throw new FormatException($"Field '{key}' phai la mang string.");
            }

            var text = value.AsString.Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                yield return text;
            }
        }
    }

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

    private static async Task<List<string>> GetMissingDanhMucCodesAsync(IEnumerable<string> codes)
    {
        var normalized = codes
            .Select(c => c.Trim())
            .Where(c => !string.IsNullOrEmpty(c))
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (normalized.Count == 0) return [];

        var collection = Global.MongoDB?.GetCollection<BsonDocument>("DanhMucTrangBi");
        if (collection == null) return [];

        var foundDocs = await collection
            .Find(Builders<BsonDocument>.Filter.In("_id", normalized))
            .Project(Builders<BsonDocument>.Projection.Include("_id"))
            .ToListAsync();

        var foundSet = foundDocs
            .Select(d => d.IdString())
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.Ordinal);

        return normalized.Where(code => !foundSet.Contains(code)).ToList();
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
        var item = new DynamicField
        {
            Id = itemBson.IdString(),
            Key = RequiredString(itemBson, "Key"),
            Label = RequiredString(itemBson, "Label"),
            Type = RequiredString(itemBson, "Type"),
            Required = OptionalBoolStrict(itemBson, "Required"),
            Validation = new FieldValidation(),
            GridUserConfig = new GridUserConfig
            {
                ShowInGrid = false,
                DisplayOrder = 9999,
                DisplayLabel = string.Empty,
            },
            GridTechConfig = new GridTechConfig
            {
                RenderType = GridRenderType.GridRenderText,
                WidthPreset = GridWidthPreset.GridWidthMedium,
                Sortable = true,
                Filterable = true,
            },
        };

        var cnIds = itemBson.ArrayOr("CnIds");
        if (cnIds != null)
        {
            item.CnIds.AddRange(cnIds
                .Where(value => !value.IsBsonNull)
                .Select(value =>
                {
                    if (!value.IsString) throw new FormatException("Field 'CnIds' phai la mang string.");
                    return value.AsString.Trim();
                })
                .Where(value => !string.IsNullOrWhiteSpace(value)));
        }

        var validationBson = itemBson.DocOr("Validation");
        if (validationBson != null)
        {
            item.Validation.MinLength = validationBson.IntOr("MinLength");
            item.Validation.MaxLength = validationBson.IntOr("MaxLength");
            item.Validation.Pattern = OptionalStringStrict(validationBson, "Pattern");
            item.Validation.Min = DoubleOr(validationBson, "Min");
            item.Validation.Max = DoubleOr(validationBson, "Max");
            item.Validation.DataSource = OptionalStringStrict(validationBson, "DataSource");
            item.Validation.ApiUrl = OptionalStringStrict(validationBson, "ApiUrl");
            item.Validation.DisplayType = OptionalStringStrict(validationBson, "DisplayType");

            var optionsBson = validationBson.ArrayOr("Options");
            if (optionsBson != null)
            {
                item.Validation.Options.AddRange(
                    optionsBson
                        .Where(value => !value.IsBsonNull)
                        .Select(value =>
                        {
                            if (!value.IsString) throw new FormatException("Field 'Validation.Options' phai la mang string.");
                            return value.AsString.Trim();
                        }));
            }
        }

        var gridUserConfigBson = itemBson.DocOr("GridUserConfig");
        if (gridUserConfigBson != null)
        {
            item.GridUserConfig.ShowInGrid = gridUserConfigBson.BoolOr("ShowInGrid");
            item.GridUserConfig.DisplayOrder = gridUserConfigBson.IntOr("DisplayOrder", 9999);
            item.GridUserConfig.DisplayLabel = OptionalStringStrict(gridUserConfigBson, "DisplayLabel");
        }

        var gridTechConfigBson = itemBson.DocOr("GridTechConfig");
        if (gridTechConfigBson != null)
        {
            item.GridTechConfig.RenderType = ParseGridRenderType(gridTechConfigBson, "RenderType", GridRenderType.GridRenderText);
            item.GridTechConfig.WidthPreset = ParseGridWidthPreset(gridTechConfigBson, "WidthPreset", GridWidthPreset.GridWidthMedium);
            item.GridTechConfig.Sortable = gridTechConfigBson.BoolOr("Sortable", true);
            item.GridTechConfig.Filterable = gridTechConfigBson.BoolOr("Filterable", true);
        }

        return item;
    }

    private static FieldSet ToFieldSetStrict(BsonDocument fieldSetDoc)
    {
        var item = new FieldSet
        {
            Id = fieldSetDoc.IdString(),
            Name = RequiredString(fieldSetDoc, "Name"),
            Key = ResolveFieldSetKey(fieldSetDoc),
            Icon = OptionalStringStrict(fieldSetDoc, "Icon"),
            Color = OptionalStringStrict(fieldSetDoc, "Color"),
            Desc = OptionalStringStrict(fieldSetDoc, "Desc"),
            LoaiNghiepVu = OptionalStringStrict(fieldSetDoc, "LoaiNghiepVu"),
        };

        item.FieldIds.AddRange(ReadStringArrayStrict(fieldSetDoc, "FieldIds"));
        item.MaDanhMucTrangBi.AddRange(ReadStringArrayStrict(fieldSetDoc, "MaDanhMucTrangBi"));
        ApplyAuditMetadata(item, fieldSetDoc);
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
                    FieldSet = ToFieldSetStrict(fieldSetDoc)
                };

                foreach (var fieldDoc in fieldDocs.OfType<BsonDocument>())
                {
                    item.Fields.Add(ToDynamicField(fieldDoc));
                }

                var hydratedFieldIdSet = item.Fields
                    .Select(field => field.Id?.Trim())
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .ToHashSet(StringComparer.Ordinal);

                var missingFieldIds = item.FieldSet.FieldIds
                    .Where(fieldId => !string.IsNullOrWhiteSpace(fieldId))
                    .Select(fieldId => fieldId.Trim())
                    .Where(fieldId => !hydratedFieldIdSet.Contains(fieldId))
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (missingFieldIds.Count > 0)
                {
                    throw new FormatException(
                        $"FieldSet '{item.FieldSet.Id}' co FieldIds khong map duoc _id DynamicField: {string.Join(", ", missingFieldIds.Take(10))}");
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

    public async Task<GetFieldSetsByKeyResponse> GetFieldSetsByKeyAsync(GetFieldSetsByKeyRequest request)
    {
        var response = new GetFieldSetsByKeyResponse();
        try
        {
            var normalizedKey = NormalizeFieldSetKey(request.Key);
            if (string.IsNullOrWhiteSpace(normalizedKey))
            {
                response.Meta = ThamSoResponseFactory.Ok("Khong co key nao duoc truyen");
                return response;
            }

            var allResponse = await GetListFieldSetsAsync(new GetListFieldSetsRequest());
            if (!(allResponse.Meta?.Success ?? false))
            {
                response.Meta = allResponse.Meta;
                return response;
            }

            foreach (var item in allResponse.Items)
            {
                var fieldSetKey = NormalizeFieldSetKey(item.FieldSet?.Key);
                if (!string.Equals(fieldSetKey, normalizedKey, StringComparison.OrdinalIgnoreCase))
                    continue;

                response.Items.Add(item);
            }

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} field set(s) matched by key");
            logger.LogInformation("GetFieldSetsByKey: {Count} matched for key='{Key}'", response.Items.Count, normalizedKey);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetFieldSetsByKey error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tra cuu bo du lieu theo key", ex.Message);
        }

        return response;
    }

    public async Task<GetFieldSetsByKeysResponse> GetFieldSetsByKeysAsync(GetFieldSetsByKeysRequest request)
    {
        var response = new GetFieldSetsByKeysResponse();
        try
        {
            var normalizedKeys = request.Keys
                .Select(NormalizeFieldSetKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (normalizedKeys.Count == 0)
            {
                response.Meta = ThamSoResponseFactory.Ok("Khong co key nao duoc truyen");
                return response;
            }

            var allResponse = await GetListFieldSetsAsync(new GetListFieldSetsRequest());
            if (!(allResponse.Meta?.Success ?? false))
            {
                response.Meta = allResponse.Meta;
                return response;
            }

            var groups = normalizedKeys.ToDictionary(
                key => key,
                _ => new List<FieldSetDetail>(),
                StringComparer.OrdinalIgnoreCase);

            foreach (var item in allResponse.Items)
            {
                var fieldSetKey = NormalizeFieldSetKey(item.FieldSet?.Key);
                if (string.IsNullOrWhiteSpace(fieldSetKey))
                    continue;
                if (!groups.TryGetValue(fieldSetKey, out var bucket))
                    continue;

                bucket.Add(item);
            }

            foreach (var key in normalizedKeys)
            {
                var entry = new FieldSetsByKeyEntry { Key = key };
                if (groups.TryGetValue(key, out var items))
                {
                    entry.Items.AddRange(items);
                }
                response.Items.Add(entry);
            }

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} key group(s) matched");
            logger.LogInformation("GetFieldSetsByKeys: {Count} keys requested", normalizedKeys.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetFieldSetsByKeys error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tra cuu bo du lieu theo danh sach key", ex.Message);
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

            if (item.MaDanhMucTrangBi.Count > 0)
            {
                var missingCodes = await GetMissingDanhMucCodesAsync(item.MaDanhMucTrangBi);
                if (missingCodes.Count > 0)
                {
                    response.Meta = ThamSoResponseFactory.Fail(
                        $"Ma danh muc trang bi khong ton tai trong he thong: {string.Join(", ", missingCodes.Take(5))}");
                    return response;
                }
            }

            var isNew = string.IsNullOrWhiteSpace(item.Id);
            item.Key = NormalizeFieldSetKey(item.Key);
            item.LoaiNghiepVu = string.Empty;
            if (!string.IsNullOrWhiteSpace(item.Key) && !AllowedFieldSetKeys.Contains(item.Key))
            {
                response.Meta = ThamSoResponseFactory.Fail($"FieldSet.Key khong hop le: {item.Key}");
                return response;
            }

            if (isNew)
            {
                item.Id = Guid.NewGuid().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc.Remove("Id");
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
                bsonDoc.Remove("Id");
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

    /// <summary>
    /// Tra ve cac FieldSet co MaDanhMucTrangBi khop voi ma danh muc trang bi dang chon.
    /// Match logic: FieldSet duoc tra ve neu bat ky MaDanhMucTrangBi nao cua no
    /// la prefix cua maDanhMuc truyen vao (hoac bang chinh no).
    /// Vi du: FieldSet gan "B.1.00.00.00.00.000" se khop voi "B.1.01.00.00.00.001".
    /// </summary>
    public async Task<GetFieldSetsByMaDanhMucResponse> GetFieldSetsByMaDanhMucAsync(
        GetFieldSetsByMaDanhMucRequest request)
    {
        var response = new GetFieldSetsByMaDanhMucResponse();
        try
        {
            var maDanhMuc = (request.MaDanhMuc ?? "").Trim();
            if (string.IsNullOrWhiteSpace(maDanhMuc))
            {
                response.Meta = ThamSoResponseFactory.Ok("Khong co ma danh muc nao duoc truyen");
                return response;
            }

            // Query: field sets co MaDanhMucTrangBi khong rong va chua bi xoa
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument
                {
                    { "Delete", new BsonDocument("$ne", true) },
                    { "MaDanhMucTrangBi", new BsonDocument("$exists", true) },
                    { "MaDanhMucTrangBi.0", new BsonDocument("$exists", true) },
                }),
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

                var fieldSet = ToFieldSetStrict(fieldSetDoc);

                // Match: maDanhMuc phai bat dau bang (hoac bang chinh) mot trong cac MaDanhMucTrangBi cua FieldSet
                // Vi du: FieldSet.MaDanhMucTrangBi = ["B.1.00.00.00.00.000"]
                //         maDanhMuc = "B.1.01.00.00.00.001" → match vi bat dau bang "B"
                var isMatch = fieldSet.MaDanhMucTrangBi.Any(fsId =>
                {
                    var trimmed = fsId.Trim();
                    if (string.IsNullOrEmpty(trimmed)) return false;
                    return maDanhMuc.StartsWith(trimmed, StringComparison.OrdinalIgnoreCase)
                        || trimmed.StartsWith(maDanhMuc, StringComparison.OrdinalIgnoreCase);
                });

                if (!isMatch) continue;

                var item = new FieldSetDetail { FieldSet = fieldSet };
                foreach (var fieldDoc in fieldDocs.OfType<BsonDocument>())
                {
                    item.Fields.Add(ToDynamicField(fieldDoc));
                }

                response.Items.Add(item);
            }

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} field set(s) matched");
            logger.LogInformation(
                "GetFieldSetsByMaDanhMuc: {Count} matched for maDanhMuc='{MaDanhMuc}'",
                response.Items.Count,
                maDanhMuc);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetFieldSetsByMaDanhMuc error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tra cuu bo du lieu theo ma danh muc trang bi", ex.Message);
        }

        return response;
    }
}
