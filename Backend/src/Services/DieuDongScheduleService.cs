using Backend.Authorization;
using Backend.Common.Bson;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

[Authorize]
public sealed class DieuDongScheduleServiceImpl(
    ILogger<DieuDongScheduleServiceImpl> logger)
    : DieuDongScheduleService.DieuDongScheduleServiceBase
{
    private const string CollectionName = "DieuDongSchedule";
    private const string PermissionCode = "trangbilog.dieu_dong";
    private const string TrangBiNhom1Collection = "TrangBiNhom1";
    private const string TrangBiNhom2Collection = "TrangBiNhom2";

    private static IMongoCollection<BsonDocument>? GetCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>(CollectionName);

    private static IMongoCollection<BsonDocument>? GetTrangBiCollection(int nhomTrangBi)
        => nhomTrangBi == 2
            ? Global.MongoDB?.GetCollection<BsonDocument>(TrangBiNhom2Collection)
            : Global.MongoDB?.GetCollection<BsonDocument>(TrangBiNhom1Collection);

    [Authorize]
    public override async Task<GetListDieuDongScheduleResponse> GetListDieuDongSchedule(
        GetListDieuDongScheduleRequest request, ServerCallContext context)
    {
        var response = new GetListDieuDongScheduleResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection DieuDongSchedule is unavailable.";
                return response;
            }

            var filter = BuildListFilter(request, context);
            var docs = await coll.Find(filter)
                .Sort(Builders<BsonDocument>.Sort.Descending("NgaySua"))
                .Limit(500)
                .ToListAsync(context.CancellationToken);

            foreach (var doc in docs)
                response.Items.Add(ToGridItem(doc));

            response.Success = true;
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDieuDongSchedule error");
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<GetDieuDongScheduleResponse> GetDieuDongSchedule(
        GetDieuDongScheduleRequest request, ServerCallContext context)
    {
        var response = new GetDieuDongScheduleResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection DieuDongSchedule is unavailable.";
                return response;
            }

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("_id", request.Id),
                Builders<BsonDocument>.Filter.Ne("Delete", true),
                ServiceMutationPolicy.BuildCnVisibilityFilter(context, "DsTrangBi.IdChuyenNganhKT", true)
            );

            var doc = await coll.Find(filter).FirstOrDefaultAsync(context.CancellationToken);
            if (doc == null)
            {
                response.Success = false;
                response.Message = "Khong tim thay lich dieu dong.";
                return response;
            }

            response.Item = ToItem(doc);
            response.Success = true;
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetDieuDongSchedule error: {Id}", request.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<SaveDieuDongScheduleResponse> SaveDieuDongSchedule(
        SaveDieuDongScheduleRequest request, ServerCallContext context)
    {
        var response = new SaveDieuDongScheduleResponse();
        try
        {
            context.RequireCreateOrEdit(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection DieuDongSchedule is unavailable.";
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Success = false;
                response.Message = "Request item is required.";
                return response;
            }

            await ValidateTrangBiRefsAsync(item.DsTrangBi, context.CancellationToken);

            // CN authorization gate (save)
            {
                var cnAction = string.IsNullOrWhiteSpace(item.Id) ? "add" : "edit";
                foreach (var cn in item.DsTrangBi.Select(tb => tb.IdChuyenNganhKt).Distinct(StringComparer.OrdinalIgnoreCase))
                    ServiceMutationPolicy.RequireActOnCN(context, cnAction, cn, true);
            }

            var userId = context.GetUserID();
            var now = DateTime.UtcNow;
            var isNew = string.IsNullOrWhiteSpace(item.Id);
            var id = isNew ? Guid.NewGuid().ToString().ToUpperInvariant() : item.Id;

            if (isNew)
            {
                var doc = ToDoc(item, id, userId, now, now, 1);
                await coll.InsertOneAsync(doc, cancellationToken: context.CancellationToken);
                response.Id = id;
                response.Success = true;
                return response;
            }

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("_id", id),
                Builders<BsonDocument>.Filter.Ne("Delete", true));

            if (request.ExpectedVersion != null)
                filter &= Builders<BsonDocument>.Filter.Eq("Version", request.ExpectedVersion.Value);

            var update = Builders<BsonDocument>.Update
                .Set("TenDieuDong", item.TenDieuDong)
                .Set("CanCu", item.CanCu)
                .Set("DonViGiao", item.DonViGiao)
                .Set("DonViNhan", item.DonViNhan)
                .Set("NguoiPhuTrach", item.NguoiPhuTrach)
                .Set("ThoiGianThucHien", ToBsonDateOrNull(item.ThoiGianThucHien))
                .Set("ThoiGianKetThuc", ToBsonDateOrNull(item.ThoiGianKetThuc))
                .Set("GhiChu", item.GhiChu)
                .Set("DsTrangBi", MapTrangBiItems(item.DsTrangBi))
                .Set("Parameters", MapParameters(item.Parameters))
                .Set("NguoiSua", userId)
                .Set("NgaySua", now)
                .Inc("Version", 1);

            var result = await coll.UpdateOneAsync(filter, update, cancellationToken: context.CancellationToken);
            if (result.ModifiedCount == 0)
            {
                response.Success = false;
                response.Message = "Update failed (not found or version mismatch).";
                return response;
            }

            response.Id = id;
            response.Success = true;
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDieuDongSchedule error: {Id}", request.Item?.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteDieuDongSchedule(
        DeleteDieuDongScheduleRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            context.RequireDelete(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection DieuDongSchedule is unavailable.";
                return response;
            }

            // CN authorization gate (delete): fetch existing to verify permissions
            var existing = await coll
                .Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("_id", request.Id),
                    Builders<BsonDocument>.Filter.Ne("Delete", true)))
                .Project(Builders<BsonDocument>.Projection.Include("DsTrangBi.IdChuyenNganhKT"))
                .Limit(1)
                .FirstOrDefaultAsync(context.CancellationToken);

            if (existing == null)
            {
                response.Success = false;
                response.Message = "Khong tim thay ban ghi de xoa.";
                return response;
            }

            var deleteCNs = existing.ArrayOr("DsTrangBi")
                ?.Documents()
                .Select(d => d.StringOr("IdChuyenNganhKT"))
                .Where(cn => !string.IsNullOrEmpty(cn))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                ?? Enumerable.Empty<string>();

            foreach (var cn in deleteCNs)
                ServiceMutationPolicy.RequireActOnCN(context, "delete", cn, true);

            var result = await coll.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", request.Id),
                Builders<BsonDocument>.Update
                    .Set("Delete", true)
                    .Set("NguoiSua", context.GetUserID())
                    .Set("NgaySua", DateTime.UtcNow)
                    .Inc("Version", 1),
                cancellationToken: context.CancellationToken);

            response.Success = result.ModifiedCount > 0;
            response.Message = response.Success ? "OK" : "Khong tim thay ban ghi de xoa.";
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDieuDongSchedule error: {Id}", request.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<GetListDieuDongScheduleByTrangBiResponse> GetListDieuDongScheduleByTrangBi(
        GetListDieuDongScheduleByTrangBiRequest request, ServerCallContext context)
    {
        var response = new GetListDieuDongScheduleByTrangBiResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection DieuDongSchedule is unavailable.";
                return response;
            }

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Ne("Delete", true),
                new BsonDocument("DsTrangBi", new BsonDocument("$elemMatch", new BsonDocument
                {
                    { "IdTrangBi", request.IdTrangBi },
                    { "NhomTrangBi", request.NhomTrangBi },
                })),
                ServiceMutationPolicy.BuildCnVisibilityFilter(context, "DsTrangBi.IdChuyenNganhKT", true)
            );

            var docs = await coll.Find(filter)
                .Sort(Builders<BsonDocument>.Sort.Descending("NgaySua"))
                .ToListAsync(context.CancellationToken);

            foreach (var doc in docs)
                response.Items.Add(ToGridItem(doc));

            response.Success = true;
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDieuDongScheduleByTrangBi error: {IdTrangBi}", request.IdTrangBi);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    private static FilterDefinition<BsonDocument> BuildListFilter(GetListDieuDongScheduleRequest request, ServerCallContext context)
    {
        var fb = Builders<BsonDocument>.Filter;
        var filters = new List<FilterDefinition<BsonDocument>>
        {
            fb.Ne("Delete", true),
            ServiceMutationPolicy.BuildCnVisibilityFilter(context, "DsTrangBi.IdChuyenNganhKT", true),
        };

        if (!string.IsNullOrWhiteSpace(request.DonVi))
        {
            filters.Add(fb.Or(
                BuildOfficeSubtreeFilter(fb, "DonViGiao", request.DonVi),
                BuildOfficeSubtreeFilter(fb, "DonViNhan", request.DonVi)));
        }

        if (!string.IsNullOrWhiteSpace(request.IdChuyenNganhKt))
        {
            filters.Add(new BsonDocument("DsTrangBi", new BsonDocument(
                "$elemMatch",
                new BsonDocument("IdChuyenNganhKT", request.IdChuyenNganhKt))));
        }

        if (!string.IsNullOrWhiteSpace(request.SearchText))
        {
            var regex = new BsonRegularExpression(request.SearchText.Trim(), "i");
            filters.Add(fb.Or(
                fb.Regex("TenDieuDong", regex),
                fb.Regex("CanCu", regex),
                fb.Regex("DonViGiao", regex),
                fb.Regex("DonViNhan", regex),
                fb.Regex("NguoiPhuTrach", regex),
                fb.Regex("DsTrangBi.TenDanhMuc", regex),
                fb.Regex("DsTrangBi.SoHieu", regex)));
        }

        var fromDate = request.FromDate?.ToDateTime().ToUniversalTime();
        var toDate = request.ToDate?.ToDateTime().ToUniversalTime();
        if (fromDate.HasValue)
            filters.Add(fb.Gte("ThoiGianThucHien", fromDate.Value));
        if (toDate.HasValue)
            filters.Add(fb.Lte("ThoiGianThucHien", toDate.Value));

        return fb.And(filters);
    }

    private static FilterDefinition<BsonDocument> BuildOfficeSubtreeFilter(
        FilterDefinitionBuilder<BsonDocument> fb,
        string fieldName,
        string idDonVi)
    {
        var normalized = (idDonVi ?? string.Empty).Trim();
        var escaped = System.Text.RegularExpressions.Regex.Escape(normalized);
        return fb.Regex(fieldName, new BsonRegularExpression($"^{escaped}(\\.|$)", "i"));
    }

    private async Task ValidateTrangBiRefsAsync(IEnumerable<DieuDongScheduleTrangBiItem> items, CancellationToken cancellationToken)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.IdTrangBi))
                throw new RpcException(new Grpc.Core.Status(StatusCode.InvalidArgument, "id_trang_bi is required."));

            var key = $"{item.NhomTrangBi}:{item.IdTrangBi}";
            if (!seen.Add(key))
                throw new RpcException(new Grpc.Core.Status(StatusCode.InvalidArgument, $"Duplicate equipment in ds_trang_bi: {key}"));

            var coll = GetTrangBiCollection(item.NhomTrangBi);
            if (coll == null) continue;

            var exists = await coll.Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("_id", item.IdTrangBi),
                    Builders<BsonDocument>.Filter.Ne("Delete", true)))
                .Limit(1)
                .AnyAsync(cancellationToken);

            if (!exists)
                throw new RpcException(new Grpc.Core.Status(StatusCode.NotFound, $"Equipment not found: {key}"));
        }
    }

    private static DieuDongScheduleGridItem ToGridItem(BsonDocument doc)
    {
        var item = new DieuDongScheduleGridItem
        {
            Id = doc.IdString(),
            TenDieuDong = doc.StringOr("TenDieuDong"),
            CanCu = doc.StringOr("CanCu"),
            DonViGiao = doc.StringOr("DonViGiao"),
            DonViNhan = doc.StringOr("DonViNhan"),
            NguoiPhuTrach = doc.StringOr("NguoiPhuTrach"),
            SoTrangBi = doc.ArrayOr("DsTrangBi").Count,
            NguoiSua = doc.StringOr("NguoiSua"),
        };

        if (doc.TryGetValue("ThoiGianThucHien", out var n) && n.IsBsonDateTime)
            item.ThoiGianThucHien = Timestamp.FromDateTime(n.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("ThoiGianKetThuc", out var n2) && n2.IsBsonDateTime)
            item.ThoiGianKetThuc = Timestamp.FromDateTime(n2.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgaySua", out var ns) && ns.IsBsonDateTime)
            item.NgaySua = Timestamp.FromDateTime(ns.AsBsonDateTime.ToUniversalTime());

        return item;
    }

    private static DieuDongScheduleItem ToItem(BsonDocument doc)
    {
        var item = new DieuDongScheduleItem
        {
            Id = doc.IdString(),
            TenDieuDong = doc.StringOr("TenDieuDong"),
            CanCu = doc.StringOr("CanCu"),
            DonViGiao = doc.StringOr("DonViGiao"),
            DonViNhan = doc.StringOr("DonViNhan"),
            NguoiPhuTrach = doc.StringOr("NguoiPhuTrach"),
            GhiChu = doc.StringOr("GhiChu"),
            NguoiTao = doc.StringOr("NguoiTao"),
            NguoiSua = doc.StringOr("NguoiSua"),
            Version = doc.IntOr("Version", 1),
        };

        if (doc.TryGetValue("ThoiGianThucHien", out var tgh) && tgh.IsBsonDateTime)
            item.ThoiGianThucHien = Timestamp.FromDateTime(tgh.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("ThoiGianKetThuc", out var tgk) && tgk.IsBsonDateTime)
            item.ThoiGianKetThuc = Timestamp.FromDateTime(tgk.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgayTao", out var nt) && nt.IsBsonDateTime)
            item.NgayTao = Timestamp.FromDateTime(nt.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgaySua", out var ns) && ns.IsBsonDateTime)
            item.NgaySua = Timestamp.FromDateTime(ns.AsBsonDateTime.ToUniversalTime());

        if (doc.TryGetValue("Parameters", out var p) && p.IsBsonDocument)
        {
            foreach (var kv in p.AsBsonDocument)
                item.Parameters[kv.Name] = kv.Value.ToString();
        }

        if (doc.TryGetValue("DsTrangBi", out var members) && members.IsBsonArray)
        {
            foreach (var raw in members.AsBsonArray.Where(v => v.IsBsonDocument).Select(v => v.AsBsonDocument))
            {
                var row = new DieuDongScheduleTrangBiItem
                {
                    IdTrangBi = raw.StringOr("IdTrangBi"),
                    NhomTrangBi = raw.IntOr("NhomTrangBi", 1),
                    MaDanhMuc = raw.StringOr("MaDanhMuc"),
                    TenDanhMuc = raw.StringOr("TenDanhMuc"),
                    SoHieu = raw.StringOr("SoHieu"),
                    IdChuyenNganhKt = raw.StringOr("IdChuyenNganhKT"),
                    IdNganh = raw.StringOr("IdNganh"),
                };

                if (raw.TryGetValue("Parameters", out var rp) && rp.IsBsonDocument)
                {
                    foreach (var kv in rp.AsBsonDocument)
                        row.Parameters[kv.Name] = kv.Value.ToString();
                }

                item.DsTrangBi.Add(row);
            }
        }

        return item;
    }

    private static BsonDocument ToDoc(
        DieuDongScheduleItem item,
        string id,
        string? userCreate,
        DateTime nowCreate,
        DateTime nowUpdate,
        int version)
    {
        return new BsonDocument
        {
            ["_id"] = id,
            ["TenDieuDong"] = item.TenDieuDong,
            ["CanCu"] = item.CanCu,
            ["DonViGiao"] = item.DonViGiao,
            ["DonViNhan"] = item.DonViNhan,
            ["NguoiPhuTrach"] = item.NguoiPhuTrach,
            ["ThoiGianThucHien"] = ToBsonDateOrNull(item.ThoiGianThucHien),
            ["ThoiGianKetThuc"] = ToBsonDateOrNull(item.ThoiGianKetThuc),
            ["GhiChu"] = item.GhiChu,
            ["DsTrangBi"] = MapTrangBiItems(item.DsTrangBi),
            ["Parameters"] = MapParameters(item.Parameters),
            ["Delete"] = false,
            ["Version"] = version,
            ["NguoiTao"] = userCreate ?? string.Empty,
            ["NguoiSua"] = userCreate ?? string.Empty,
            ["NgayTao"] = nowCreate,
            ["NgaySua"] = nowUpdate,
        };
    }

    private static BsonValue ToBsonDateOrNull(Timestamp? value)
    {
        if (value == null) return BsonNull.Value;
        return value.ToDateTime().ToUniversalTime();
    }

    private static BsonDocument MapParameters(IDictionary<string, string> parameters)
    {
        var pDoc = new BsonDocument();
        foreach (var kv in parameters)
            pDoc[kv.Key] = kv.Value ?? string.Empty;
        return pDoc;
    }

    private static BsonArray MapTrangBiItems(IEnumerable<DieuDongScheduleTrangBiItem> items)
    {
        var arr = new BsonArray();
        foreach (var item in items)
        {
            arr.Add(new BsonDocument
            {
                ["IdTrangBi"] = item.IdTrangBi,
                ["NhomTrangBi"] = item.NhomTrangBi,
                ["MaDanhMuc"] = item.MaDanhMuc,
                ["TenDanhMuc"] = item.TenDanhMuc,
                ["SoHieu"] = item.SoHieu,
                ["IdChuyenNganhKT"] = item.IdChuyenNganhKt,
                ["IdNganh"] = item.IdNganh,
                ["Parameters"] = MapParameters(item.Parameters),
            });
        }
        return arr;
    }
}
