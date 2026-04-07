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
    ILogger<DanhMucTrangBiServiceImpl> logger) : DanhMucTrangBiService.DanhMucTrangBiServiceBase
{
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

    private static BsonArray ToParameterArray(IEnumerable<ExtendedField> parameters)
        => new(parameters.Select(p => p.ToBsonDocument()));

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
}
