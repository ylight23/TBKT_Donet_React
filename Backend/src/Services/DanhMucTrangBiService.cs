using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Protobuf;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

[Authorize]
public sealed class DanhMucTrangBiServiceImpl(
    ILogger<DanhMucTrangBiServiceImpl> logger,
    FieldSetService fieldSetService) : DanhMucTrangBiService.DanhMucTrangBiServiceBase
{
    private const string PermissionTrangBiNhom1 = "equipment.group1";
    private const string PermissionTrangBiNhom2 = "equipment.group2";

    private static IMongoCollection<BsonDocument>? GetCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>("DanhMucTrangBi");

    private static string EscapeRegex(string input) => System.Text.RegularExpressions.Regex.Escape(input);

    private static string? ResolveCnId(BsonDocument? doc)
    {
        if (doc == null) return null;
        var value = doc.StringOr("IdChuyenNganhKT");
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static FilterDefinition<BsonDocument> BuildCnFilter(ServerCallContext context)
        => ServiceMutationPolicy.BuildCnVisibilityFilter(context, "IdChuyenNganhKT", true);

    private static BsonValue StringOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? BsonNull.Value : value;

    private static BsonDocument ToParameterBson(IDictionary<string, string> parameters)
    {
        var doc = new BsonDocument();
        foreach (var kv in parameters)
        {
            var key = NormalizeTrangBiParameterKey(kv.Key);
            if (!string.IsNullOrWhiteSpace(key))
                doc[key] = kv.Value;
        }
        return doc;
    }

    private static string NormalizeTrangBiParameterKey(string key)
        => key.Trim() switch
        {
            "cap_chat_luong" => "chat_luong",
            "chatLuong" => "chat_luong",
            _ => key.Trim(),
        };

    // Used for TrangBiTree which still uses repeated ExtendedField parameters
    private static BsonArray ToParameterArray(IEnumerable<ExtendedField> parameters)
    {
        var arr = new BsonArray();
        foreach (var p in parameters)
            arr.Add(new BsonDocument
            {
                ["Name"] = p.Name ?? string.Empty,
                ["StringValue"] = p.StringValue ?? string.Empty
            });
        return arr;
    }

    private static Dictionary<string, string> ReadParameterMap(BsonDocument doc)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!doc.TryGetElement("Parameters", out var paramElem)) return result;
        if (paramElem.Value is not BsonDocument paramDoc) return result;
        foreach (var kv in paramDoc)
            result[NormalizeTrangBiParameterKey(kv.Name)] = kv.Value.BsonType == BsonType.String ? kv.Value.AsString : string.Empty;
        return result;
    }

    // Dùng protobuf reflection: key snake_case trong Parameters khớp tên field trong .proto
    private static void FillFromParameters(Google.Protobuf.IMessage message, IReadOnlyDictionary<string, string> parameters)
    {
        var descriptor = message.Descriptor;
        foreach (var (key, value) in parameters)
        {
            var field = descriptor.FindFieldByName(key);
            if (field is null) continue;
            object? boxed = field.FieldType switch
            {
                Google.Protobuf.Reflection.FieldType.Int32
                    when int.TryParse(value, out var i) => (object)i,
                Google.Protobuf.Reflection.FieldType.String => value,
                _ => null,
            };
            if (boxed is not null) field.Accessor.SetValue(message, boxed);
        }
    }

    private static string BuildLabel(BsonDocument doc)
    {
        var ten = doc.StringOr("Ten");
        var tenDayDu = doc.StringOr("TenDayDu");
        if (!string.IsNullOrWhiteSpace(ten) && !string.IsNullOrWhiteSpace(tenDayDu) && !string.Equals(ten, tenDayDu, StringComparison.Ordinal))
        {
            return $"{ten} - {tenDayDu}";
        }
        return !string.IsNullOrWhiteSpace(tenDayDu) ? tenDayDu : (!string.IsNullOrWhiteSpace(ten) ? ten : doc.IdString());
    }

    private static MaDinhDanhTrangBiItem ToMaDinhDanhItem(BsonDocument doc)
        => new()
        {
            Id = doc.IdString(),
            Label = BuildLabel(doc),
            ParentId = doc.StringOr("IdCapTren"),
            IsLeaf = !doc.BoolOr("CoCapDuoi"),
        };

    private static TrangBiTree DeserializeTree(BsonDocument doc)
    {
        try
        {
            return BsonSerializer.Deserialize<TrangBiTree>(doc);
        }
        catch (Exception ex)
        {
            var id = doc.IdString();
            throw new FormatException($"Khong deserialize duoc DanhMucTrangBi _id='{id}'", ex);
        }
    }

    private static async Task UpdateParentHasChildrenAsync(
        IMongoCollection<BsonDocument> collection,
        string? parentId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(parentId)) return;

        var childFilter = Builders<BsonDocument>.Filter.Eq("IdCapTren", parentId);

        var hasChild = await collection.Find(childFilter).Limit(1).AnyAsync(cancellationToken);
        await collection.UpdateOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", parentId),
            Builders<BsonDocument>.Update.Set("CoCapDuoi", hasChild),
            cancellationToken: cancellationToken);
    }

    private static async Task<string> BuildNextIdAsync(
        IMongoCollection<BsonDocument> collection,
        string parentId,
        int levelLength,
        CancellationToken cancellationToken)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("IdCapTren", parentId);

        var ids = await collection.Find(filter)
            .Project(Builders<BsonDocument>.Projection.Include("_id"))
            .ToListAsync(cancellationToken);

        var max = 0;
        foreach (var idDoc in ids)
        {
            var id = idDoc.IdString();
            if (!id.StartsWith(parentId, StringComparison.Ordinal)) continue;
            var tail = id.Substring(parentId.Length);
            if (tail.Length != levelLength) continue;
            if (int.TryParse(tail, out var n) && n > max) max = n;
        }
        var next = max + 1;
        return $"{parentId}{next.ToString().PadLeft(levelLength, '0')}";
    }

    public override async Task<GetListMaDinhDanhTrangBiResponse> GetListMaDinhDanhTrangBi(GetListMaDinhDanhTrangBiRequest request, ServerCallContext context)
    {
        var response = new GetListMaDinhDanhTrangBiResponse();
        try
        {
            var collection = GetCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection DanhMucTrangBi";
                return response;
            }

            var builder = Builders<BsonDocument>.Filter;
            var filter = BuildCnFilter(context);

            if (!string.IsNullOrWhiteSpace(request.SearchText))
            {
                var q = EscapeRegex(request.SearchText);
                filter &= builder.Or(
                    builder.Regex("Ten", "/.*" + q + ".*/i"),
                    builder.Regex("TenDayDu", "/.*" + q + ".*/i"),
                    builder.Regex("_id", "/.*" + q + ".*/i"));
            }

            if (request.OnlyLeaf)
            {
                filter &= builder.Eq("CoCapDuoi", false);
            }

            var docs = await collection.Find(filter)
                .SortBy(d => d["ThuTuSapXep"])
                .ToListAsync(context.CancellationToken);

            response.Items.AddRange(docs.Select(ToMaDinhDanhItem));
            response.Success = true;
            response.Message = $"Lay {response.Items.Count} ma dinh danh trang bi";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetListMaDinhDanhTrangBi error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    public override async Task<TrangBiTreeListResponse> GetListTree(TrangBiTreeListRequest request, ServerCallContext context)
    {
        var response = new TrangBiTreeListResponse();
        try
        {
            var collection = GetCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection DanhMucTrangBi";
                return response;
            }

            var builder = Builders<BsonDocument>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrWhiteSpace(request.ParentId))
            {
                if (request.LoadAll)
                {
                    filter &= builder.Regex("_id", "/^" + EscapeRegex(request.ParentId) + ".*/i");
                }
                else
                {
                    filter &= builder.Eq("IdCapTren", request.ParentId);
                }
            }
            else if (!request.LoadAll)
            {
                filter &= builder.Or(
                    builder.Eq("IdCapTren", BsonNull.Value),
                    builder.Eq("IdCapTren", string.Empty));
            }

            if (!string.IsNullOrWhiteSpace(request.SearchText))
            {
                var q = EscapeRegex(request.SearchText);
                filter &= builder.Or(
                    builder.Regex("Ten", "/.*" + q + ".*/i"),
                    builder.Regex("TenDayDu", "/.*" + q + ".*/i"),
                    builder.Regex("_id", "/.*" + q + ".*/i"));
            }

            filter &= BuildCnFilter(context);

            var docs = await collection.Find(filter)
                .SortBy(d => d["ThuTuSapXep"])
                .ToListAsync(context.CancellationToken);

            response.Items.AddRange(docs.Select(DeserializeTree));
            response.Success = true;
            response.Message = $"Lay {response.Items.Count} ban ghi DanhMucTrangBi";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetListTree error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    public override async Task<TrangBiTreeGetResponse> GetTree(TrangBiTreeGetRequest request, ServerCallContext context)
    {
        var response = new TrangBiTreeGetResponse();
        try
        {
            var collection = GetCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection DanhMucTrangBi";
                return response;
            }

            var filter = Builders<BsonDocument>.Filter.Eq("_id", request.Id);
            var doc = await collection.Find(filter).FirstOrDefaultAsync(context.CancellationToken);

            if (doc != null)
            {
                ServiceMutationPolicy.RequireSeeCN(context, ResolveCnId(doc), true);
                response.Item = DeserializeTree(doc);
            }

            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetTree error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    public override async Task<SaveTrangBiTreeResponse> SaveTree(SaveTrangBiTreeRequest request, ServerCallContext context)
    {
        var response = new SaveTrangBiTreeResponse();
        try
        {
            if (request.Item == null)
            {
                response.Success = false;
                response.Message = "Thieu item";
                return response;
            }

            var collection = GetCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection DanhMucTrangBi";
                return response;
            }

            var item = request.Item;
            var now = ProtobufTimestampConverter.GetNowTimestamp();
            var user = context.GetUserName() ?? context.GetUserID() ?? "system";
            var levelLength = request.LevelLength > 0 ? request.LevelLength : 3;

            if (request.IsNew)
            {
                var targetCn = string.IsNullOrWhiteSpace(item.IdChuyenNganhKt)
                    ? null
                    : item.IdChuyenNganhKt;
                ServiceMutationPolicy.RequireActOnCN(context, "add", targetCn, true);

                var parentId = item.IdCapTren ?? string.Empty;
                var itemId = item.Id ?? string.Empty;

                if (string.IsNullOrWhiteSpace(itemId) || itemId.Contains('*'))
                {
                    if (string.IsNullOrWhiteSpace(parentId))
                    {
                        response.Success = false;
                        response.Message = "Khong the sinh ma khi thieu IdCapTren";
                        return response;
                    }
                    itemId = await BuildNextIdAsync(collection, parentId, levelLength, context.CancellationToken);
                    item.Id = itemId;
                }

                var exists = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", itemId))
                    .Limit(1).AnyAsync(context.CancellationToken);
                if (exists)
                {
                    response.Success = false;
                    response.Message = $"Da ton tai ma '{itemId}'";
                    return response;
                }

                var thuTu = item.ThuTu;
                if (thuTu <= 0)
                {
                    var suffix = itemId.StartsWith(parentId, StringComparison.Ordinal) ? itemId.Substring(parentId.Length) : "";
                    thuTu = int.TryParse(suffix, out var n) ? n : 1;
                }

                var parentDoc = string.IsNullOrWhiteSpace(parentId)
                    ? null
                    : await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", parentId))
                        .FirstOrDefaultAsync(context.CancellationToken);
                var parentSort = parentDoc?.StringOr("ThuTuSapXep") ?? string.Empty;
                var thuTuSapXep = parentSort + thuTu.ToString().PadLeft(levelLength, '0');
                var tenDayDu = (item.Ten ?? string.Empty) + (!string.IsNullOrWhiteSpace(parentDoc?.StringOr("TenDayDu")) ? ", " + parentDoc.StringOr("TenDayDu") : "");

                var doc = new BsonDocument
                {
                    ["_id"] = itemId,
                    ["IdCapTren"] = StringOrNull(item.IdCapTren),
                    ["Ten"] = item.Ten ?? string.Empty,
                    ["VietTat"] = StringOrNull(item.VietTat),
                    ["TenDayDu"] = StringOrNull(tenDayDu),
                    ["CoCapDuoi"] = false,
                    ["ThuTu"] = thuTu,
                    ["ThuTuSapXep"] = StringOrNull(thuTuSapXep),
                    ["IdChuyenNganhKT"] = StringOrNull(item.IdChuyenNganhKt),
                    ["IdNganh"] = StringOrNull(string.IsNullOrWhiteSpace(item.IdNganh) ? item.IdChuyenNganhKt : item.IdNganh),
                    ["NguoiTao"] = StringOrNull(user),
                    ["NguoiSua"] = StringOrNull(user),
                    ["NgayTao"] = now.ToBsonDocument(),
                    ["NgaySua"] = now.ToBsonDocument(),
                    ["Parameters"] = ToParameterArray(item.Parameters),
                };
                await collection.InsertOneAsync(doc, cancellationToken: context.CancellationToken);
                await UpdateParentHasChildrenAsync(collection, item.IdCapTren, context.CancellationToken);

                response.Id = itemId;
                response.Success = true;
                response.Message = "Them moi thanh cong";
                return response;
            }

            var oldId = request.OldId;
            if (string.IsNullOrWhiteSpace(oldId))
            {
                oldId = item.Id;
            }
            if (string.IsNullOrWhiteSpace(oldId))
            {
                response.Success = false;
                response.Message = "Thieu old_id";
                return response;
            }

            var existingDoc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", oldId))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (existingDoc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay id '{oldId}'";
                return response;
            }

            var existingCn = ResolveCnId(existingDoc);
            var targetCnForEdit = string.IsNullOrWhiteSpace(item.IdChuyenNganhKt) ? existingCn : item.IdChuyenNganhKt;
            ServiceMutationPolicy.RequireActOnCN(context, "edit", existingCn, true);
            if (!string.Equals(existingCn, targetCnForEdit, StringComparison.OrdinalIgnoreCase))
            {
                ServiceMutationPolicy.RequireActOnCN(context, "edit", targetCnForEdit, true);
            }

            var targetId = item.Id ?? string.Empty;
            if (!string.Equals(targetId, oldId, StringComparison.Ordinal))
            {
                response.Success = false;
                response.Message = "Khong ho tro doi ma _id o phase hien tai";
                return response;
            }

            var ngayTao = existingDoc.TimestampOr("NgayTao") ?? now;
            var nguoiTao = string.IsNullOrWhiteSpace(existingDoc.StringOr("NguoiTao")) ? user : existingDoc.StringOr("NguoiTao");
            var thuTuSapXepForEdit = item.ThuTuSapXep;
            var tenDayDuForEdit = item.TenDayDu;

            var parentIdForEdit = item.IdCapTren ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(parentIdForEdit))
            {
                var parentDoc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", parentIdForEdit))
                    .FirstOrDefaultAsync(context.CancellationToken);
                var parentSort = parentDoc?.StringOr("ThuTuSapXep") ?? string.Empty;
                thuTuSapXepForEdit = parentSort + (item.ThuTu <= 0 ? "001" : item.ThuTu.ToString().PadLeft(levelLength, '0'));
                tenDayDuForEdit = (item.Ten ?? string.Empty) + (!string.IsNullOrWhiteSpace(parentDoc?.StringOr("TenDayDu")) ? ", " + parentDoc.StringOr("TenDayDu") : "");
            }

            var oldParentId = existingDoc.StringOr("IdCapTren");
            var update = Builders<BsonDocument>.Update
                .Set("IdCapTren", StringOrNull(item.IdCapTren))
                .Set("Ten", item.Ten ?? string.Empty)
                .Set("VietTat", StringOrNull(item.VietTat))
                .Set("TenDayDu", StringOrNull(tenDayDuForEdit))
                .Set("CoCapDuoi", item.CoCapDuoi)
                .Set("ThuTu", item.ThuTu)
                .Set("ThuTuSapXep", StringOrNull(thuTuSapXepForEdit))
                .Set("IdChuyenNganhKT", StringOrNull(item.IdChuyenNganhKt))
                .Set("IdNganh", StringOrNull(string.IsNullOrWhiteSpace(item.IdNganh) ? existingDoc.StringOr("IdNganh", item.IdChuyenNganhKt) : item.IdNganh))
                .Set("NguoiTao", StringOrNull(nguoiTao))
                .Set("NguoiSua", StringOrNull(user))
                .Set("NgayTao", ngayTao.ToBsonDocument())
                .Set("NgaySua", now.ToBsonDocument())
                .Set("Parameters", ToParameterArray(item.Parameters));
            await collection.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", oldId),
                update,
                cancellationToken: context.CancellationToken);

            await UpdateParentHasChildrenAsync(collection, oldParentId, context.CancellationToken);
            await UpdateParentHasChildrenAsync(collection, item.IdCapTren, context.CancellationToken);

            response.Id = oldId;
            response.Success = true;
            response.Message = "Cap nhat thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.SaveTree error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    public override async Task<DeleteTrangBiTreeResponse> DeleteTree(DeleteTrangBiTreeRequest request, ServerCallContext context)
    {
        var response = new DeleteTrangBiTreeResponse();
        try
        {
            var collection = GetCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection DanhMucTrangBi";
                return response;
            }

            var existing = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (existing == null)
            {
                response.Success = false;
                response.Message = "Khong tim thay du lieu can xoa";
                return response;
            }

            ServiceMutationPolicy.RequireActOnCN(context, "delete", ResolveCnId(existing), true);
            var parentId = existing.StringOr("IdCapTren");

            var filterDelete = Builders<BsonDocument>.Filter.Regex("_id", "/^" + EscapeRegex(request.Id) + ".*/i");
            var result = await collection.DeleteManyAsync(filterDelete, context.CancellationToken);

            await UpdateParentHasChildrenAsync(collection, parentId, context.CancellationToken);

            response.Success = result.DeletedCount > 0;
            response.Message = response.Success ? "Xoa thanh cong" : "Xoa khong thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.DeleteTree error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override Task<GetFieldSetsByMaDanhMucResponse> GetFieldSetsByMaDanhMuc(
        GetFieldSetsByMaDanhMucRequest request, ServerCallContext context) =>
        fieldSetService.GetFieldSetsByMaDanhMucAsync(request);

    // ── Collection trang bị nhóm 1 (equipment instances) ──────
    private static IMongoCollection<BsonDocument>? GetTrangBiCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>("TrangBiNhom1");

    private static IMongoCollection<BsonDocument>? GetTrangBiNhom2Collection()
        => Global.MongoDB?.GetCollection<BsonDocument>("TrangBiNhom2");

    private static IMongoCollection<BsonDocument>? GetNhomDongBoCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>("NhomDongBo");

    private static IMongoCollection<BsonDocument>? GetOfficeCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>(PermissionCollectionNames.Offices);

    private static IMongoCollection<BsonDocument>? GetTrangBiCollectionByNhom(int nhom)
        => nhom switch
        {
            1 => GetTrangBiCollection(),
            2 => GetTrangBiNhom2Collection(),
            _ => null,
        };

    private sealed record LoadedTrangBiRef(
        string Id,
        int Nhom,
        BsonDocument Doc);

    private sealed record TrangBiCatalogMetadata(
        string MaDanhMuc,
        string? TenDanhMuc,
        string? IdCapTren,
        string? IdChuyenNganhKt,
        string? IdNganh);

    private static readonly HashSet<string> ReservedTrangBiParameterKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "ma_danh_muc",
        "ten_danh_muc",
        "ma_trang_bi",
        "ten_trang_bi",
        "phan_nganh",
        "id_cap_tren",
        "id_chuyen_nganh_kt",
        "id_nganh",
        "id_nhom_dong_bo",
        "trang_thai_dong_bo",
        "idcaptren",
        "idchuyennganhkt",
        "idnganh",
    };

    private static Dictionary<string, string> NormalizeTrangBiParameters(IEnumerable<KeyValuePair<string, string>> parameters)
    {
        var normalized = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (rawKey, rawValue) in parameters)
        {
            var key = NormalizeTrangBiParameterKey(rawKey ?? string.Empty);
            var value = (rawValue ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(value)) continue;
            if (ReservedTrangBiParameterKeys.Contains(key)) continue;
            normalized[key] = value;
        }

        return normalized;
    }

    private static async Task<TrangBiCatalogMetadata> ResolveTrangBiCatalogMetadataAsync(
        string maDanhMuc,
        CancellationToken cancellationToken)
    {
        var normalizedMaDanhMuc = (maDanhMuc ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedMaDanhMuc))
            throw new InvalidOperationException("Thieu ma_danh_muc");

        var collection = GetCollection();
        if (collection == null)
            throw new InvalidOperationException("Khong khoi tao duoc collection DanhMucTrangBi");

        var doc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", normalizedMaDanhMuc))
            .FirstOrDefaultAsync(cancellationToken);
        if (doc == null)
            throw new InvalidOperationException($"Khong tim thay danh muc trang bi '{normalizedMaDanhMuc}'");

        var idChuyenNganhKt = doc.StringOr("IdChuyenNganhKT");
        var idNganh = doc.StringOr("IdNganh");
        return new TrangBiCatalogMetadata(
            normalizedMaDanhMuc,
            doc.StringOr("Ten"),
            doc.StringOr("IdCapTren"),
            string.IsNullOrWhiteSpace(idChuyenNganhKt) ? null : idChuyenNganhKt,
            string.IsNullOrWhiteSpace(idNganh) ? null : idNganh);
    }

    private static string BuildTrangBiRefKey(int nhom, string id)
        => $"{nhom}:{id}";

    private static async Task<BsonDocument?> FindOfficeDocAsync(string idDonVi, CancellationToken cancellationToken)
    {
        var normalizedId = (idDonVi ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedId)) return null;

        var collection = GetOfficeCollection();
        if (collection == null)
            throw new InvalidOperationException("Khong khoi tao duoc collection Office");

        return await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", normalizedId))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string ReadTrangBiSoHieu(BsonDocument doc)
        => doc.DocOr("Parameters")?.StringOr("so_hieu") ?? string.Empty;

    private static async Task<LoadedTrangBiRef> LoadTrangBiRefAsync(
        NhomDongBoItemRef item,
        CancellationToken cancellationToken)
    {
        var collection = GetTrangBiCollectionByNhom(item.Nhom);
        if (collection == null)
            throw new InvalidOperationException($"Khong ho tro nhom trang bi '{item.Nhom}'");

        var normalizedId = (item.Id ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedId))
            throw new InvalidOperationException("DsTrangBi co phan tu thieu id");

        var doc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", normalizedId))
            .FirstOrDefaultAsync(cancellationToken);
        if (doc == null)
            throw new InvalidOperationException($"Khong tim thay trang bi '{normalizedId}' trong nhom {item.Nhom}");

        return new LoadedTrangBiRef(normalizedId, item.Nhom, doc);
    }

    private static async Task UpdateTrangBiDongBoBacklinkAsync(
        int nhom,
        string idTrangBi,
        string? idNhomDongBo,
        bool trangThaiDongBo,
        CancellationToken cancellationToken)
    {
        var collection = GetTrangBiCollectionByNhom(nhom);
        if (collection == null)
            throw new InvalidOperationException($"Khong ho tro nhom trang bi '{nhom}'");

        await collection.UpdateOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", idTrangBi),
            Builders<BsonDocument>.Update
                .Set("IdNhomDongBo", StringOrNull(idNhomDongBo))
                .Set("TrangThaiDongBo", trangThaiDongBo),
            cancellationToken: cancellationToken);
    }

    private static async Task ApplyTrangBiNhomDongBoSelectionAsync(
        int nhom,
        string idTrangBi,
        string? currentGroupId,
        string? requestedGroupId,
        bool? requestedTrangThaiDongBo,
        CancellationToken cancellationToken)
    {
        var hasRequestedFields = requestedTrangThaiDongBo.HasValue || !string.IsNullOrWhiteSpace(requestedGroupId);
        if (!hasRequestedFields)
            return;

        var normalizedCurrentGroupId = string.IsNullOrWhiteSpace(currentGroupId) ? null : currentGroupId.Trim();
        var normalizedRequestedGroupId = string.IsNullOrWhiteSpace(requestedGroupId) ? null : requestedGroupId.Trim();
        var shouldLink = requestedTrangThaiDongBo == true;

        if (!shouldLink)
            normalizedRequestedGroupId = null;

        if (shouldLink && string.IsNullOrWhiteSpace(normalizedRequestedGroupId))
            throw new InvalidOperationException("Thieu id_nhom_dong_bo khi trang_thai_dong_bo = true");

        var groupCollection = GetNhomDongBoCollection();
        if (groupCollection == null)
            throw new InvalidOperationException("Khong khoi tao duoc collection NhomDongBo");

        if (!string.IsNullOrWhiteSpace(normalizedCurrentGroupId)
            && !string.Equals(normalizedCurrentGroupId, normalizedRequestedGroupId, StringComparison.Ordinal))
        {
            await groupCollection.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", normalizedCurrentGroupId),
                Builders<BsonDocument>.Update.Pull(
                    "DsTrangBi",
                    new BsonDocument
                    {
                        ["Id"] = idTrangBi,
                        ["Nhom"] = nhom,
                    }),
                cancellationToken: cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(normalizedRequestedGroupId))
        {
            var groupDoc = await groupCollection.Find(Builders<BsonDocument>.Filter.Eq("_id", normalizedRequestedGroupId))
                .FirstOrDefaultAsync(cancellationToken);
            if (groupDoc == null)
                throw new InvalidOperationException($"Khong tim thay nhom dong bo '{normalizedRequestedGroupId}'");

            await groupCollection.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", normalizedRequestedGroupId),
                Builders<BsonDocument>.Update.AddToSet(
                    "DsTrangBi",
                    new BsonDocument
                    {
                        ["Id"] = idTrangBi,
                        ["Nhom"] = nhom,
                    }),
                cancellationToken: cancellationToken);
        }

        await UpdateTrangBiDongBoBacklinkAsync(
            nhom,
            idTrangBi,
            normalizedRequestedGroupId,
            !string.IsNullOrWhiteSpace(normalizedRequestedGroupId),
            cancellationToken);
    }

    private static List<NhomDongBoItemRef> ReadNhomDongBoRefs(BsonDocument doc)
    {
        var result = new List<NhomDongBoItemRef>();
        foreach (var itemDoc in doc.DocumentsOr("DsTrangBi"))
        {
            var id = itemDoc.StringOr("Id");
            var nhom = itemDoc.IntOr("Nhom");
            if (string.IsNullOrWhiteSpace(id) || nhom <= 0) continue;
            result.Add(new NhomDongBoItemRef
            {
                Id = id,
                Nhom = nhom,
            });
        }

        return result;
    }

    private static BsonArray ToNhomDongBoRefArray(IEnumerable<NhomDongBoItemRef> refs)
    {
        var arr = new BsonArray();
        foreach (var item in refs)
        {
            var id = (item.Id ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(id) || item.Nhom <= 0) continue;

            arr.Add(new BsonDocument
            {
                ["Id"] = id,
                ["Nhom"] = item.Nhom,
            });
        }

        return arr;
    }

    private static BsonDocument BuildNhomDongBoDocument(
        string id,
        string tenNhom,
        string idDonVi,
        IEnumerable<NhomDongBoItemRef> dsTrangBi,
        IDictionary<string, string> parameters,
        int version,
        string nguoiTao,
        string nguoiSua,
        Google.Protobuf.WellKnownTypes.Timestamp ngayTao,
        Google.Protobuf.WellKnownTypes.Timestamp ngaySua)
    {
        return new BsonDocument
        {
            ["_id"] = id,
            ["TenNhom"] = tenNhom,
            ["IdDonVi"] = idDonVi,
            ["DsTrangBi"] = ToNhomDongBoRefArray(dsTrangBi),
            ["Parameters"] = ToParameterBson(parameters),
            ["Version"] = version,
            ["NguoiTao"] = StringOrNull(nguoiTao),
            ["NguoiSua"] = StringOrNull(nguoiSua),
            ["NgayTao"] = ngayTao.ToBsonDocument(),
            ["NgaySua"] = ngaySua.ToBsonDocument(),
        };
    }

    private static NhomDongBo DocToNhomDongBo(BsonDocument doc)
    {
        var item = new NhomDongBo
        {
            Id = doc.IdString(),
            TenNhom = doc.StringOr("TenNhom"),
            IdDonVi = doc.StringOr("IdDonVi"),
            NguoiTao = doc.StringOr("NguoiTao"),
            NguoiSua = doc.StringOr("NguoiSua"),
            Version = doc.IntOr("Version", 1),
        };

        if (doc.TimestampOr("NgayTao") is { } ngayTao)
            item.NgayTao = ngayTao;
        if (doc.TimestampOr("NgaySua") is { } ngaySua)
            item.NgaySua = ngaySua;

        foreach (var kv in ReadParameterMap(doc))
            item.Parameters[kv.Key] = kv.Value;

        item.DsTrangBi.AddRange(ReadNhomDongBoRefs(doc));
        return item;
    }

    private static NhomDongBoGridItem DocToNhomDongBoGridItem(
        BsonDocument doc,
        string tenDonVi)
    {
        var item = new NhomDongBoGridItem
        {
            Id = doc.IdString(),
            TenNhom = doc.StringOr("TenNhom"),
            IdDonVi = doc.StringOr("IdDonVi"),
            TenDonVi = tenDonVi,
            SoTrangBi = ReadNhomDongBoRefs(doc).Count,
            NguoiSua = doc.StringOr("NguoiSua"),
        };
        if (doc.TimestampOr("NgaySua") is { } ngaySua)
            item.NgaySua = ngaySua;
        return item;
    }

    private static NhomDongBoThanhVienView BuildNhomDongBoThanhVienView(
        LoadedTrangBiRef loaded,
        bool restricted)
    {
        var doc = loaded.Doc;
        return new NhomDongBoThanhVienView
        {
            Id = loaded.Id,
            Nhom = loaded.Nhom,
            MaDanhMuc = doc.StringOr("MaDanhMuc"),
            TenDanhMuc = doc.StringOr("TenDanhMuc"),
            IdCapTren = doc.StringOr("IdCapTren"),
            IdChuyenNganhKt = doc.StringOr("IdChuyenNganhKT"),
            IdNganh = doc.StringOr("IdNganh"),
            IdDonViQuanLy = doc.DocOr("Parameters")?.StringOr("id_don_vi_quan_ly"),
            SoHieu = restricted ? string.Empty : ReadTrangBiSoHieu(doc),
            Restricted = restricted,
        };
    }

    private static BsonDocument BuildTrangBiInstanceDocument(
        string itemId,
        TrangBiCatalogMetadata metadata,
        IDictionary<string, string> parameters,
        int version,
        string user,
        Google.Protobuf.WellKnownTypes.Timestamp now)
    {
        return new BsonDocument
        {
            ["_id"] = itemId,
            ["MaDanhMuc"] = StringOrNull(metadata.MaDanhMuc),
            ["IdCapTren"] = StringOrNull(metadata.IdCapTren),
            ["TenDanhMuc"] = StringOrNull(metadata.TenDanhMuc),
            ["IdChuyenNganhKT"] = StringOrNull(metadata.IdChuyenNganhKt),
            ["IdNganh"] = StringOrNull(metadata.IdNganh),
            ["Parameters"] = ToParameterBson(parameters),
            ["IdNhomDongBo"] = BsonNull.Value,
            ["TrangThaiDongBo"] = false,
            ["Version"] = version,
            ["NguoiTao"] = StringOrNull(user),
            ["NguoiSua"] = StringOrNull(user),
            ["NgayTao"] = now.ToBsonDocument(),
            ["NgaySua"] = now.ToBsonDocument(),
        };
    }

    private static UpdateDefinition<BsonDocument> BuildTrangBiInstanceUpdate(
        TrangBiCatalogMetadata metadata,
        IDictionary<string, string> parameters,
        int version,
        string nguoiTao,
        string nguoiSua,
        Google.Protobuf.WellKnownTypes.Timestamp ngayTao,
        Google.Protobuf.WellKnownTypes.Timestamp ngaySua)
    {
        return Builders<BsonDocument>.Update
            .Set("MaDanhMuc", StringOrNull(metadata.MaDanhMuc))
            .Set("IdCapTren", StringOrNull(metadata.IdCapTren))
            .Set("TenDanhMuc", StringOrNull(metadata.TenDanhMuc))
            .Set("IdChuyenNganhKT", StringOrNull(metadata.IdChuyenNganhKt))
            .Set("IdNganh", StringOrNull(metadata.IdNganh))
            .Set("Parameters", ToParameterBson(parameters))
            .Set("Version", version)
            .Set("NguoiTao", StringOrNull(nguoiTao))
            .Set("NguoiSua", StringOrNull(nguoiSua))
            .Set("NgayTao", ngayTao.ToBsonDocument())
            .Set("NgaySua", ngaySua.ToBsonDocument());
    }

    private static async Task<List<BsonDocument>> LoadTrangBiInstanceDocsAsync(
        IMongoCollection<BsonDocument> collection,
        string? idChuyenNganhKt,
        string? maDanhMuc,
        string? idDonVi,
        string? searchText,
        ServerCallContext context)
    {
        var builder = Builders<BsonDocument>.Filter;
        var filter = ServiceMutationPolicy.BuildCnVisibilityFilter(context, "IdChuyenNganhKT", true);
        filter &= builder.Ne("Delete", true);
        filter &= builder.Exists("IdChuyenNganhKT", true);
        filter &= builder.Ne("IdChuyenNganhKT", BsonNull.Value);
        filter &= builder.Ne("IdChuyenNganhKT", string.Empty);

        if (!string.IsNullOrWhiteSpace(idChuyenNganhKt))
            filter &= builder.Eq("IdChuyenNganhKT", idChuyenNganhKt);

        if (!string.IsNullOrWhiteSpace(maDanhMuc))
            filter &= builder.Eq("MaDanhMuc", maDanhMuc);

        if (!string.IsNullOrWhiteSpace(idDonVi))
            filter &= BuildTrangBiOfficeFilter(builder, idDonVi);

        if (!string.IsNullOrWhiteSpace(searchText))
        {
            var q = EscapeRegex(searchText);
            var regex = new BsonRegularExpression($".*{q}.*", "i");
            filter &= builder.Or(
                builder.Regex("TenDanhMuc", regex),
                builder.Regex("MaDanhMuc", regex),
                builder.Regex("Parameters.so_hieu", regex),
                builder.Regex("Parameters.ky_hieu", regex));
        }

        return await collection.Find(filter)
            .SortByDescending(d => d["NgayTao"])
            .ToListAsync(context.CancellationToken);
    }

    private static FilterDefinition<BsonDocument> BuildTrangBiOfficeFilter(
        FilterDefinitionBuilder<BsonDocument> builder,
        string idDonVi)
    {
        var normalized = (idDonVi ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalized))
            return FilterDefinition<BsonDocument>.Empty;

        var escaped = System.Text.RegularExpressions.Regex.Escape(normalized);
        var subtree = new BsonRegularExpression($"^{escaped}(\\.|$)", "i");
        return builder.Or(
            builder.Regex("IdDonVi", subtree),
            builder.Regex("Parameters.id_don_vi", subtree),
            builder.Regex("Parameters.don_vi", subtree),
            builder.Regex("Parameters.id_don_vi_quan_ly", subtree),
            builder.Regex("Parameters.don_vi_quan_ly", subtree));
    }

    public override async Task<SaveTrangBiNhom1Response> SaveTrangBiNhom1(SaveTrangBiNhom1Request request, ServerCallContext context)
    {
        var response = new SaveTrangBiNhom1Response();
        try
        {
            context.RequireCreateOrEdit(PermissionTrangBiNhom1);

            var collection = GetTrangBiCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection TrangBi";
                return response;
            }

            var now = ProtobufTimestampConverter.GetNowTimestamp();
            var user = context.GetUserName() ?? context.GetUserID() ?? "system";
            var normalizedParameters = NormalizeTrangBiParameters(request.Parameters);
            var metadata = await ResolveTrangBiCatalogMetadataAsync(request.MaDanhMuc, context.CancellationToken);
            var targetCn = metadata.IdChuyenNganhKt;
            var itemId = (request.Id ?? string.Empty).Trim();
            var requestedGroupId = string.IsNullOrWhiteSpace(request.IdNhomDongBo) ? null : request.IdNhomDongBo.Trim();
            var requestedTrangThaiDongBo = request.TrangThaiDongBo;

            if (string.IsNullOrWhiteSpace(itemId))
            {
                ServiceMutationPolicy.RequireAction(context, PermissionTrangBiNhom1, "add", targetCn);
                itemId = Guid.NewGuid().ToString();

                var doc = BuildTrangBiInstanceDocument(
                    itemId,
                    metadata,
                    normalizedParameters,
                    version: 1,
                    user,
                    now);
                await collection.InsertOneAsync(doc, cancellationToken: context.CancellationToken);
                await ApplyTrangBiNhomDongBoSelectionAsync(
                    nhom: 1,
                    idTrangBi: itemId,
                    currentGroupId: null,
                    requestedGroupId,
                    requestedTrangThaiDongBo,
                    context.CancellationToken);

                response.Id = itemId;
                response.Success = true;
                response.Message = "Them moi trang bi thanh cong";
                return response;
            }

            var existingDoc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", itemId))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (existingDoc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay ban ghi id '{itemId}'";
                return response;
            }

            var existingCn = existingDoc.StringOr("IdChuyenNganhKT");
            ServiceMutationPolicy.RequireAction(context, PermissionTrangBiNhom1, "edit",
                string.IsNullOrWhiteSpace(existingCn) ? null : existingCn);
            if (!string.Equals(existingCn, targetCn, StringComparison.OrdinalIgnoreCase))
            {
                ServiceMutationPolicy.RequireAction(context, PermissionTrangBiNhom1, "edit", targetCn);
            }

            var ngayTao = existingDoc.TimestampOr("NgayTao") ?? now;
            var nguoiTao = string.IsNullOrWhiteSpace(existingDoc.StringOr("NguoiTao"))
                ? user
                : existingDoc.StringOr("NguoiTao");
            var existingVersion = existingDoc.IntOr("Version", 1);
            if (request.ExpectedVersion.HasValue && request.ExpectedVersion.Value != existingVersion)
            {
                response.Success = false;
                response.Message = $"Xung dot du lieu: version hien tai la {existingVersion}";
                return response;
            }

            var update = BuildTrangBiInstanceUpdate(
                metadata,
                normalizedParameters,
                existingVersion + 1,
                nguoiTao,
                user,
                ngayTao,
                now);
            await collection.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", itemId),
                update,
                cancellationToken: context.CancellationToken);
            await ApplyTrangBiNhomDongBoSelectionAsync(
                nhom: 1,
                idTrangBi: itemId,
                currentGroupId: existingDoc.StringOr("IdNhomDongBo"),
                requestedGroupId,
                requestedTrangThaiDongBo,
                context.CancellationToken);

            response.Id = itemId;
            response.Success = true;
            response.Message = "Cap nhat trang bi thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.SaveTrangBiNhom1 error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    public override async Task<GetListTrangBiNhom1Response> GetListTrangBiNhom1(GetListTrangBiNhom1Request request, ServerCallContext context)
    {
        var response = new GetListTrangBiNhom1Response();
        try
        {
            context.RequireView(PermissionTrangBiNhom1);

            var collection = GetTrangBiCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection TrangBi";
                return response;
            }

            var docs = await LoadTrangBiInstanceDocsAsync(
                collection,
                request.IdChuyenNganhKt,
                request.MaDanhMuc,
                request.IdDonVi,
                request.SearchText,
                context);

            response.Items.AddRange(docs.Select(DocToTrangBiGridItem<TrangBiNhom1GridItem>));
            response.Success = true;
            response.Message = $"Lay {response.Items.Count} ban ghi trang bi";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetListTrangBiNhom1 error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    public override async Task<GetTrangBiNhom1Response> GetTrangBiNhom1(GetTrangBiNhom1Request request, ServerCallContext context)
    {
        var response = new GetTrangBiNhom1Response();
        try
        {
            context.RequireView(PermissionTrangBiNhom1);

            if (string.IsNullOrWhiteSpace(request.Id))
            {
                response.Success = false;
                response.Message = "Thieu id ban ghi can lay";
                return response;
            }

            var collection = GetTrangBiCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection TrangBi";
                return response;
            }

            var doc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (doc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay ban ghi id '{request.Id}'";
                return response;
            }

            var cnId = doc.StringOr("IdChuyenNganhKT");
            ServiceMutationPolicy.RequireAction(
                context,
                PermissionTrangBiNhom1,
                "view",
                string.IsNullOrWhiteSpace(cnId) ? null : cnId);

            response.Item = DocToTrangBiNhom1EditorItem(doc);
            response.Success = true;
            response.Message = "Lay chi tiet trang bi thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetTrangBiNhom1 error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    public override async Task<SaveTrangBiNhom2Response> SaveTrangBiNhom2(SaveTrangBiNhom2Request request, ServerCallContext context)
    {
        var response = new SaveTrangBiNhom2Response();
        try
        {
            context.RequireCreateOrEdit(PermissionTrangBiNhom2);

            var collection = GetTrangBiNhom2Collection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection TrangBiNhom2";
                return response;
            }

            var now = ProtobufTimestampConverter.GetNowTimestamp();
            var user = context.GetUserName() ?? context.GetUserID() ?? "system";
            var normalizedParameters = NormalizeTrangBiParameters(request.Parameters);
            var metadata = await ResolveTrangBiCatalogMetadataAsync(request.MaDanhMuc, context.CancellationToken);
            var targetCn = metadata.IdChuyenNganhKt;
            var itemId = (request.Id ?? string.Empty).Trim();
            var requestedGroupId = string.IsNullOrWhiteSpace(request.IdNhomDongBo) ? null : request.IdNhomDongBo.Trim();
            var requestedTrangThaiDongBo = request.TrangThaiDongBo;

            if (string.IsNullOrWhiteSpace(itemId))
            {
                ServiceMutationPolicy.RequireAction(context, PermissionTrangBiNhom2, "add", targetCn);
                itemId = Guid.NewGuid().ToString();
                var doc = BuildTrangBiInstanceDocument(
                    itemId,
                    metadata,
                    normalizedParameters,
                    version: 1,
                    user,
                    now);
                await collection.InsertOneAsync(doc, cancellationToken: context.CancellationToken);
                await ApplyTrangBiNhomDongBoSelectionAsync(
                    nhom: 2,
                    idTrangBi: itemId,
                    currentGroupId: null,
                    requestedGroupId,
                    requestedTrangThaiDongBo,
                    context.CancellationToken);
                response.Id = itemId;
                response.Success = true;
                response.Message = "Them moi trang bi nhom 2 thanh cong";
                return response;
            }

            var existingDoc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", itemId))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (existingDoc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay ban ghi id '{itemId}'";
                return response;
            }

            var existingCn = existingDoc.StringOr("IdChuyenNganhKT");
            ServiceMutationPolicy.RequireAction(context, PermissionTrangBiNhom2, "edit",
                string.IsNullOrWhiteSpace(existingCn) ? null : existingCn);
            if (!string.Equals(existingCn, targetCn, StringComparison.OrdinalIgnoreCase))
            {
                ServiceMutationPolicy.RequireAction(context, PermissionTrangBiNhom2, "edit", targetCn);
            }

            var ngayTao = existingDoc.TimestampOr("NgayTao") ?? now;
            var nguoiTao = string.IsNullOrWhiteSpace(existingDoc.StringOr("NguoiTao"))
                ? user
                : existingDoc.StringOr("NguoiTao");
            var existingVersion = existingDoc.IntOr("Version", 1);
            if (request.ExpectedVersion.HasValue && request.ExpectedVersion.Value != existingVersion)
            {
                response.Success = false;
                response.Message = $"Xung dot du lieu: version hien tai la {existingVersion}";
                return response;
            }

            var update = BuildTrangBiInstanceUpdate(
                metadata,
                normalizedParameters,
                existingVersion + 1,
                nguoiTao,
                user,
                ngayTao,
                now);
            await collection.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", itemId),
                update,
                cancellationToken: context.CancellationToken);
            await ApplyTrangBiNhomDongBoSelectionAsync(
                nhom: 2,
                idTrangBi: itemId,
                currentGroupId: existingDoc.StringOr("IdNhomDongBo"),
                requestedGroupId,
                requestedTrangThaiDongBo,
                context.CancellationToken);

            response.Id = itemId;
            response.Success = true;
            response.Message = "Cap nhat trang bi nhom 2 thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.SaveTrangBiNhom2 error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    public override async Task<GetListTrangBiNhom2Response> GetListTrangBiNhom2(GetListTrangBiNhom2Request request, ServerCallContext context)
    {
        var response = new GetListTrangBiNhom2Response();
        try
        {
            context.RequireView(PermissionTrangBiNhom2);

            var collection = GetTrangBiNhom2Collection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection TrangBiNhom2";
                return response;
            }

            var docs = await LoadTrangBiInstanceDocsAsync(
                collection,
                request.IdChuyenNganhKt,
                request.MaDanhMuc,
                request.IdDonVi,
                request.SearchText,
                context);

            response.Items.AddRange(docs.Select(DocToTrangBiGridItem<TrangBiNhom2GridItem>));
            response.Success = true;
            response.Message = $"Lay {response.Items.Count} ban ghi trang bi nhom 2";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetListTrangBiNhom2 error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    public override async Task<GetTrangBiNhom2Response> GetTrangBiNhom2(GetTrangBiNhom2Request request, ServerCallContext context)
    {
        var response = new GetTrangBiNhom2Response();
        try
        {
            context.RequireView(PermissionTrangBiNhom2);

            if (string.IsNullOrWhiteSpace(request.Id))
            {
                response.Success = false;
                response.Message = "Thieu id ban ghi can lay";
                return response;
            }

            var collection = GetTrangBiNhom2Collection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection TrangBiNhom2";
                return response;
            }

            var doc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (doc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay ban ghi id '{request.Id}'";
                return response;
            }

            var cnId = doc.StringOr("IdChuyenNganhKT");
            ServiceMutationPolicy.RequireAction(
                context,
                PermissionTrangBiNhom2,
                "view",
                string.IsNullOrWhiteSpace(cnId) ? null : cnId);

            response.Item = DocToTrangBiNhom2EditorItem(doc);
            response.Success = true;
            response.Message = "Lay chi tiet trang bi nhom 2 thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetTrangBiNhom2 error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    public override async Task<GetListNhomDongBoResponse> GetListNhomDongBo(GetListNhomDongBoRequest request, ServerCallContext context)
    {
        var response = new GetListNhomDongBoResponse();
        try
        {
            var collection = GetNhomDongBoCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection NhomDongBo";
                return response;
            }

            var builder = Builders<BsonDocument>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrWhiteSpace(request.IdDonVi))
                filter &= builder.Eq("IdDonVi", request.IdDonVi);

            if (!string.IsNullOrWhiteSpace(request.IdTrangBi))
            {
                filter &= new BsonDocument(
                    "DsTrangBi",
                    new BsonDocument("$elemMatch", new BsonDocument("Id", request.IdTrangBi)));
            }

            if (!string.IsNullOrWhiteSpace(request.SearchText))
            {
                var q = EscapeRegex(request.SearchText);
                var regex = new BsonRegularExpression($".*{q}.*", "i");
                filter &= builder.Or(
                    builder.Regex("TenNhom", regex),
                    builder.Regex("_id", regex));
            }

            var docs = await collection.Find(filter)
                .SortByDescending(d => d["NgaySua"])
                .ToListAsync(context.CancellationToken);

            var officeIds = docs
                .Select(doc => doc.StringOr("IdDonVi"))
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            var officeMap = new Dictionary<string, string>(StringComparer.Ordinal);
            if (officeIds.Count > 0 && GetOfficeCollection() is { } officeCollection)
            {
                var officeDocs = await officeCollection.Find(
                        Builders<BsonDocument>.Filter.In("_id", officeIds))
                    .ToListAsync(context.CancellationToken);
                foreach (var officeDoc in officeDocs)
                    officeMap[officeDoc.IdString()] = officeDoc.StringOr("Ten");
            }

            response.Items.AddRange(docs.Select(doc =>
                DocToNhomDongBoGridItem(doc, officeMap.GetValueOrDefault(doc.StringOr("IdDonVi"), string.Empty))));
            response.Success = true;
            response.Message = $"Lay {response.Items.Count} nhom dong bo";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetListNhomDongBo error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    public override async Task<GetNhomDongBoResponse> GetNhomDongBo(GetNhomDongBoRequest request, ServerCallContext context)
    {
        var response = new GetNhomDongBoResponse();
        try
        {
            if (string.IsNullOrWhiteSpace(request.Id))
            {
                response.Success = false;
                response.Message = "Thieu id nhom dong bo";
                return response;
            }

            var collection = GetNhomDongBoCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection NhomDongBo";
                return response;
            }

            var doc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (doc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay nhom dong bo id '{request.Id}'";
                return response;
            }

            response.Item = DocToNhomDongBo(doc);

            foreach (var itemRef in response.Item.DsTrangBi)
            {
                var loaded = await LoadTrangBiRefAsync(itemRef, context.CancellationToken);
                var cnId = loaded.Doc.StringOr("IdChuyenNganhKT");
                var restricted = !ServiceMutationPolicy.CanActOnCN(
                    context,
                    "view",
                    string.IsNullOrWhiteSpace(cnId) ? null : cnId);

                response.ThanhVien.Add(BuildNhomDongBoThanhVienView(loaded, restricted));
            }

            response.Success = true;
            response.Message = "Lay chi tiet nhom dong bo thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.GetNhomDongBo error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    public override async Task<SaveNhomDongBoResponse> SaveNhomDongBo(SaveNhomDongBoRequest request, ServerCallContext context)
    {
        var response = new SaveNhomDongBoResponse();
        try
        {
            var collection = GetNhomDongBoCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection NhomDongBo";
                return response;
            }

            var tenNhom = (request.TenNhom ?? string.Empty).Trim();
            var idDonVi = (request.IdDonVi ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(tenNhom))
            {
                response.Success = false;
                response.Message = "Thieu ten_nhom";
                return response;
            }

            if (string.IsNullOrWhiteSpace(idDonVi))
            {
                response.Success = false;
                response.Message = "Thieu id_don_vi";
                return response;
            }

            var officeDoc = await FindOfficeDocAsync(idDonVi, context.CancellationToken);
            if (officeDoc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay don vi '{idDonVi}'";
                return response;
            }

            if (request.DsTrangBi.Count == 0)
            {
                response.Success = false;
                response.Message = "Nhom dong bo phai co it nhat 1 trang bi";
                return response;
            }

            var itemId = (request.Id ?? string.Empty).Trim();
            var existingDoc = default(BsonDocument);
            var now = ProtobufTimestampConverter.GetNowTimestamp();
            var user = context.GetUserName() ?? context.GetUserID() ?? "system";

            if (!string.IsNullOrWhiteSpace(itemId))
            {
                existingDoc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", itemId))
                    .FirstOrDefaultAsync(context.CancellationToken);
                if (existingDoc == null)
                {
                    response.Success = false;
                    response.Message = $"Khong tim thay nhom dong bo id '{itemId}'";
                    return response;
                }
            }
            else
            {
                itemId = Guid.NewGuid().ToString();
            }

            var uniqueKeys = new HashSet<string>(StringComparer.Ordinal);
            var loadedRefs = new List<LoadedTrangBiRef>();
            foreach (var itemRef in request.DsTrangBi)
            {
                var key = BuildTrangBiRefKey(itemRef.Nhom, (itemRef.Id ?? string.Empty).Trim());
                if (!uniqueKeys.Add(key))
                {
                    response.Success = false;
                    response.Message = $"Trung trang bi trong nhom dong bo: {key}";
                    return response;
                }

                var loaded = await LoadTrangBiRefAsync(itemRef, context.CancellationToken);
                var cnId = loaded.Doc.StringOr("IdChuyenNganhKT");
                ServiceMutationPolicy.RequireActOnCN(
                    context,
                    existingDoc == null ? "add" : "edit",
                    string.IsNullOrWhiteSpace(cnId) ? null : cnId,
                    true);

                var existingGroupId = loaded.Doc.StringOr("IdNhomDongBo");
                if (!string.IsNullOrWhiteSpace(existingGroupId)
                    && !string.Equals(existingGroupId, itemId, StringComparison.Ordinal))
                {
                    response.Success = false;
                    response.Message = $"Trang bi '{loaded.Id}' da thuoc nhom dong bo khac";
                    return response;
                }

                loadedRefs.Add(loaded);
            }

            var existingRefs = existingDoc == null
                ? []
                : ReadNhomDongBoRefs(existingDoc);

            var existingVersion = existingDoc?.IntOr("Version", 1) ?? 0;
            if (existingDoc != null && request.ExpectedVersion.HasValue && request.ExpectedVersion.Value != existingVersion)
            {
                response.Success = false;
                response.Message = $"Xung dot du lieu: version hien tai la {existingVersion}";
                return response;
            }

            var ngayTao = existingDoc?.TimestampOr("NgayTao") ?? now;
            var nguoiTao = existingDoc == null
                ? user
                : (string.IsNullOrWhiteSpace(existingDoc.StringOr("NguoiTao")) ? user : existingDoc.StringOr("NguoiTao"));
            var version = existingDoc == null ? 1 : existingVersion + 1;

            var savedDoc = BuildNhomDongBoDocument(
                itemId,
                tenNhom,
                idDonVi,
                loadedRefs.Select(x => new NhomDongBoItemRef { Id = x.Id, Nhom = x.Nhom }),
                request.Parameters,
                version,
                nguoiTao,
                user,
                ngayTao,
                now);

            if (existingDoc == null)
            {
                await collection.InsertOneAsync(savedDoc, cancellationToken: context.CancellationToken);
            }
            else
            {
                await collection.ReplaceOneAsync(
                    Builders<BsonDocument>.Filter.Eq("_id", itemId),
                    savedDoc,
                    cancellationToken: context.CancellationToken);
            }

            var newKeys = new HashSet<string>(loadedRefs.Select(x => BuildTrangBiRefKey(x.Nhom, x.Id)), StringComparer.Ordinal);
            var removedRefs = existingRefs
                .Where(x => !newKeys.Contains(BuildTrangBiRefKey(x.Nhom, x.Id)))
                .ToList();

            foreach (var loaded in loadedRefs)
            {
                await UpdateTrangBiDongBoBacklinkAsync(
                    loaded.Nhom,
                    loaded.Id,
                    itemId,
                    trangThaiDongBo: true,
                    context.CancellationToken);
            }

            foreach (var removed in removedRefs)
            {
                await UpdateTrangBiDongBoBacklinkAsync(
                    removed.Nhom,
                    removed.Id,
                    idNhomDongBo: null,
                    trangThaiDongBo: false,
                    context.CancellationToken);
            }

            response.Id = itemId;
            response.Success = true;
            response.Message = existingDoc == null
                ? "Them moi nhom dong bo thanh cong"
                : "Cap nhat nhom dong bo thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.SaveNhomDongBo error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    public override async Task<DeleteNhomDongBoResponse> DeleteNhomDongBo(DeleteNhomDongBoRequest request, ServerCallContext context)
    {
        var response = new DeleteNhomDongBoResponse();
        try
        {
            if (string.IsNullOrWhiteSpace(request.Id))
            {
                response.Success = false;
                response.Message = "Thieu id nhom dong bo";
                return response;
            }

            var collection = GetNhomDongBoCollection();
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Khong khoi tao duoc collection NhomDongBo";
                return response;
            }

            var doc = await collection.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
                .FirstOrDefaultAsync(context.CancellationToken);
            if (doc == null)
            {
                response.Success = false;
                response.Message = $"Khong tim thay nhom dong bo id '{request.Id}'";
                return response;
            }

            foreach (var itemRef in ReadNhomDongBoRefs(doc))
            {
                var loaded = await LoadTrangBiRefAsync(itemRef, context.CancellationToken);
                var cnId = loaded.Doc.StringOr("IdChuyenNganhKT");
                ServiceMutationPolicy.RequireActOnCN(
                    context,
                    "edit",
                    string.IsNullOrWhiteSpace(cnId) ? null : cnId,
                    true);

                await UpdateTrangBiDongBoBacklinkAsync(
                    loaded.Nhom,
                    loaded.Id,
                    idNhomDongBo: null,
                    trangThaiDongBo: false,
                    context.CancellationToken);
            }

            await collection.DeleteOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", request.Id),
                context.CancellationToken);

            response.Success = true;
            response.Message = "Xoa nhom dong bo thanh cong";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DanhMucTrangBi.DeleteNhomDongBo error");
            response.Success = false;
            response.Message = ex.Message;
        }

        return response;
    }

    private static TrangBiNhom1EditorItem DocToTrangBiNhom1EditorItem(BsonDocument doc)
    {
        var item = new TrangBiNhom1EditorItem();
        FillTrangBiEditorItem(item, doc);
        return item;
    }

    private static TrangBiNhom2EditorItem DocToTrangBiNhom2EditorItem(BsonDocument doc)
    {
        var item = new TrangBiNhom2EditorItem();
        FillTrangBiEditorItem(item, doc);
        return item;
    }

    private static void FillTrangBiEditorItem(Google.Protobuf.IMessage item, BsonDocument doc)
    {
        var descriptor = item.Descriptor;
        void SetString(string fieldName, string? value)
        {
            if (value == null) return;
            descriptor.FindFieldByName(fieldName)?.Accessor.SetValue(item, value);
        }

        void SetInt32(string fieldName, int value)
            => descriptor.FindFieldByName(fieldName)?.Accessor.SetValue(item, value);

        void SetBool(string fieldName, bool value)
            => descriptor.FindFieldByName(fieldName)?.Accessor.SetValue(item, value);

        void SetTimestamp(string fieldName, Google.Protobuf.WellKnownTypes.Timestamp? value)
        {
            if (value == null) return;
            descriptor.FindFieldByName(fieldName)?.Accessor.SetValue(item, value);
        }

        SetString("id", doc.IdString());
        SetString("ma_danh_muc", doc.StringOr("MaDanhMuc"));
        SetString("id_cap_tren", doc.StringOr("IdCapTren"));
        SetString("ten_danh_muc", doc.StringOr("TenDanhMuc"));
        SetString("id_chuyen_nganh_kt", doc.StringOr("IdChuyenNganhKT"));
        SetString("id_nganh", doc.StringOr("IdNganh"));
        SetString("id_nhom_dong_bo", doc.StringOr("IdNhomDongBo"));
        SetBool("trang_thai_dong_bo", !string.IsNullOrWhiteSpace(doc.StringOr("IdNhomDongBo")) || doc.BoolOr("TrangThaiDongBo"));
        SetString("nguoi_tao", doc.StringOr("NguoiTao"));
        SetString("nguoi_sua", doc.StringOr("NguoiSua"));
        SetInt32("version", doc.IntOr("Version", 1));
        SetTimestamp("ngay_tao", doc.TimestampOr("NgayTao"));
        SetTimestamp("ngay_sua", doc.TimestampOr("NgaySua"));

        var field = descriptor.FindFieldByName("parameters");
        if (field?.Accessor.GetValue(item) is IDictionary<string, string> parameters)
        {
            foreach (var kv in ReadParameterMap(doc))
                parameters[kv.Key] = kv.Value;
        }
    }

    // Generic: dùng được cho cả TrangBiNhom1GridItem và TrangBiNhom2GridItem
    private static TOut DocToTrangBiGridItem<TOut>(BsonDocument doc)
        where TOut : Google.Protobuf.IMessage, new()
    {
        var item = new TOut();
        var d = item.Descriptor;
        void S(string n, string v) => d.FindFieldByName(n)?.Accessor.SetValue(item, v);
        void B(string n, bool v) => d.FindFieldByName(n)?.Accessor.SetValue(item, v);
        void T(string n, Google.Protobuf.WellKnownTypes.Timestamp? v)
        {
            if (v != null) d.FindFieldByName(n)?.Accessor.SetValue(item, v);
        }

        S("id", doc.IdString());
        S("ma_danh_muc", doc.StringOr("MaDanhMuc") ?? string.Empty);
        S("ten_danh_muc", doc.StringOr("TenDanhMuc") ?? string.Empty);
        S("id_chuyen_nganh_kt", doc.StringOr("IdChuyenNganhKT") ?? string.Empty);
        S("id_nganh", doc.StringOr("IdNganh") ?? string.Empty);
        S("id_nhom_dong_bo", doc.StringOr("IdNhomDongBo") ?? string.Empty);
        B("trang_thai_dong_bo", !string.IsNullOrWhiteSpace(doc.StringOr("IdNhomDongBo")) || doc.BoolOr("TrangThaiDongBo"));
        S("nguoi_sua", doc.StringOr("NguoiSua") ?? string.Empty);
        T("ngay_sua", doc.TimestampOr("NgaySua"));

        FillFromParameters(item, ReadParameterMap(doc));

        // id_cap_tren: luôn lấy từ top-level IdCapTren (không qua Parameters)
        S("id_cap_tren", doc.StringOr("IdCapTren") ?? string.Empty);

        return item;
    }
}
