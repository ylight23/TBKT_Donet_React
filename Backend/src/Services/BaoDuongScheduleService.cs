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
public sealed class BaoDuongScheduleServiceImpl(
    ILogger<BaoDuongScheduleServiceImpl> logger)
    : BaoDuongScheduleService.BaoDuongScheduleServiceBase
{
    private const string CollectionName = "BaoDuongSchedule";
    private const string TrangBiNhom1Collection = "TrangBiNhom1";
    private const string TrangBiNhom2Collection = "TrangBiNhom2";

    private static IMongoCollection<BsonDocument>? GetCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>(CollectionName);

    private static IMongoCollection<BsonDocument>? GetTrangBiCollection(int nhomTrangBi)
        => nhomTrangBi == 2
            ? Global.MongoDB?.GetCollection<BsonDocument>(TrangBiNhom2Collection)
            : Global.MongoDB?.GetCollection<BsonDocument>(TrangBiNhom1Collection);

    [Authorize]
    public override async Task<GetListBaoDuongScheduleResponse> GetListBaoDuongSchedule(
        GetListBaoDuongScheduleRequest request, ServerCallContext context)
    {
        var response = new GetListBaoDuongScheduleResponse();
        try
        {
            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection BaoDuongSchedule is unavailable.";
                return response;
            }

            // Query mẫu: lọc scope + idDonVi + idChuyenNganhKt + date range + search text
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
            logger.LogError(ex, "GetListBaoDuongSchedule error");
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<GetBaoDuongScheduleResponse> GetBaoDuongSchedule(
        GetBaoDuongScheduleRequest request, ServerCallContext context)
    {
        var response = new GetBaoDuongScheduleResponse();
        try
        {
            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection BaoDuongSchedule is unavailable.";
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
                response.Message = "Khong tim thay lich bao duong.";
                return response;
            }

            response.Item = ToItem(doc);
            response.Success = true;
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetBaoDuongSchedule error: {Id}", request.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<SaveBaoDuongScheduleResponse> SaveBaoDuongSchedule(
        SaveBaoDuongScheduleRequest request, ServerCallContext context)
    {
        var response = new SaveBaoDuongScheduleResponse();
        try
        {
            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection BaoDuongSchedule is unavailable.";
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Success = false;
                response.Message = "Request item is required.";
                return response;
            }

            // TODO validate sâu:
            // 1) IdDonVi tồn tại
            // 2) ds_trang_bi không rỗng, không trùng id_trang_bi
            // 3) từng trang bị tồn tại đúng collection theo nhom_trang_bi
            // 4) optimistic concurrency theo expected_version
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
                .Set("TenLichBaoDuong", item.TenLichBaoDuong)
                .Set("CanCu", item.CanCu)
                .Set("IdDonVi", item.IdDonVi)
                .Set("TenDonVi", item.TenDonVi)
                .Set("NguoiPhuTrach", item.NguoiPhuTrach)
                .Set("ThoiGianLap", ToBsonDateOrNull(item.ThoiGianLap))
                .Set("ThoiGianThucHien", ToBsonDateOrNull(item.ThoiGianThucHien))
                .Set("ThoiGianKetThuc", ToBsonDateOrNull(item.ThoiGianKetThuc))
                .Set("NoiDungCongViec", item.NoiDungCongViec)
                .Set("VatChatBaoDam", item.VatChatBaoDam)
                .Set("KetQua", item.KetQua)
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
            logger.LogError(ex, "SaveBaoDuongSchedule error: {Id}", request.Item?.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteBaoDuongSchedule(
        DeleteBaoDuongScheduleRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection BaoDuongSchedule is unavailable.";
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
            logger.LogError(ex, "DeleteBaoDuongSchedule error: {Id}", request.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<GetListBaoDuongScheduleByTrangBiResponse> GetListBaoDuongScheduleByTrangBi(
        GetListBaoDuongScheduleByTrangBiRequest request, ServerCallContext context)
    {
        var response = new GetListBaoDuongScheduleByTrangBiResponse();
        try
        {
            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection BaoDuongSchedule is unavailable.";
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
            logger.LogError(ex, "GetListBaoDuongScheduleByTrangBi error: {IdTrangBi}", request.IdTrangBi);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    // ===== Repository query samples =====

    private static FilterDefinition<BsonDocument> BuildListFilter(GetListBaoDuongScheduleRequest request, ServerCallContext context)
    {
        var fb = Builders<BsonDocument>.Filter;
        var filters = new List<FilterDefinition<BsonDocument>>
        {
            fb.Ne("Delete", true),
            ServiceMutationPolicy.BuildCnVisibilityFilter(context, "DsTrangBi.IdChuyenNganhKT", true),
        };

        if (!string.IsNullOrWhiteSpace(request.IdDonVi))
            filters.Add(BuildOfficeSubtreeFilter(fb, "IdDonVi", request.IdDonVi));

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
                fb.Regex("TenLichBaoDuong", regex),
                fb.Regex("CanCu", regex),
                fb.Regex("NguoiPhuTrach", regex),
                fb.Regex("TenDonVi", regex),
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

    private async Task ValidateTrangBiRefsAsync(IEnumerable<BaoDuongScheduleTrangBiItem> items, CancellationToken cancellationToken)
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

    private static BaoDuongScheduleGridItem ToGridItem(BsonDocument doc)
    {
        var item = new BaoDuongScheduleGridItem
        {
            Id = doc.IdString(),
            TenLichBaoDuong = doc.StringOr("TenLichBaoDuong"),
            CanCu = doc.StringOr("CanCu"),
            IdDonVi = doc.StringOr("IdDonVi"),
            TenDonVi = doc.StringOr("TenDonVi"),
            NguoiPhuTrach = doc.StringOr("NguoiPhuTrach"),
            SoTrangBi = doc.ArrayOr("DsTrangBi").Count,
            NguoiSua = doc.StringOr("NguoiSua"),
        };

        if (doc.TryGetValue("ThoiGianLap", out var tgLap) && tgLap.IsBsonDateTime)
            item.ThoiGianLap = Timestamp.FromDateTime(tgLap.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("ThoiGianThucHien", out var tgTh) && tgTh.IsBsonDateTime)
            item.ThoiGianThucHien = Timestamp.FromDateTime(tgTh.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("ThoiGianKetThuc", out var tgKt) && tgKt.IsBsonDateTime)
            item.ThoiGianKetThuc = Timestamp.FromDateTime(tgKt.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgaySua", out var ns) && ns.IsBsonDateTime)
            item.NgaySua = Timestamp.FromDateTime(ns.AsBsonDateTime.ToUniversalTime());

        return item;
    }

    private static BaoDuongScheduleItem ToItem(BsonDocument doc)
    {
        var item = new BaoDuongScheduleItem
        {
            Id = doc.IdString(),
            TenLichBaoDuong = doc.StringOr("TenLichBaoDuong"),
            CanCu = doc.StringOr("CanCu"),
            IdDonVi = doc.StringOr("IdDonVi"),
            TenDonVi = doc.StringOr("TenDonVi"),
            NguoiPhuTrach = doc.StringOr("NguoiPhuTrach"),
            NoiDungCongViec = doc.StringOr("NoiDungCongViec"),
            VatChatBaoDam = doc.StringOr("VatChatBaoDam"),
            KetQua = doc.StringOr("KetQua"),
            NguoiTao = doc.StringOr("NguoiTao"),
            NguoiSua = doc.StringOr("NguoiSua"),
            Version = doc.IntOr("Version", 1),
        };

        if (doc.TryGetValue("ThoiGianLap", out var tgLap) && tgLap.IsBsonDateTime)
            item.ThoiGianLap = Timestamp.FromDateTime(tgLap.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("ThoiGianThucHien", out var tgTh) && tgTh.IsBsonDateTime)
            item.ThoiGianThucHien = Timestamp.FromDateTime(tgTh.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("ThoiGianKetThuc", out var tgKt) && tgKt.IsBsonDateTime)
            item.ThoiGianKetThuc = Timestamp.FromDateTime(tgKt.AsBsonDateTime.ToUniversalTime());
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
                var row = new BaoDuongScheduleTrangBiItem
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
        BaoDuongScheduleItem item,
        string id,
        string? userCreate,
        DateTime nowCreate,
        DateTime nowUpdate,
        int version)
    {
        return new BsonDocument
        {
            ["_id"] = id,
            ["TenLichBaoDuong"] = item.TenLichBaoDuong,
            ["CanCu"] = item.CanCu,
            ["IdDonVi"] = item.IdDonVi,
            ["TenDonVi"] = item.TenDonVi,
            ["NguoiPhuTrach"] = item.NguoiPhuTrach,
            ["ThoiGianLap"] = ToBsonDateOrNull(item.ThoiGianLap),
            ["ThoiGianThucHien"] = ToBsonDateOrNull(item.ThoiGianThucHien),
            ["ThoiGianKetThuc"] = ToBsonDateOrNull(item.ThoiGianKetThuc),
            ["NoiDungCongViec"] = item.NoiDungCongViec,
            ["VatChatBaoDam"] = item.VatChatBaoDam,
            ["KetQua"] = item.KetQua,
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

    private static BsonArray MapTrangBiItems(IEnumerable<BaoDuongScheduleTrangBiItem> items)
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
