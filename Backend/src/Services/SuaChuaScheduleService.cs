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
public sealed class SuaChuaScheduleServiceImpl(
    ILogger<SuaChuaScheduleServiceImpl> logger)
    : SuaChuaScheduleService.SuaChuaScheduleServiceBase
{
    private const string CollectionName = "SuaChuaSchedule";
    private const string PermissionCode = "trangbilog.sua_chua";
    private const string TrangBiNhom1Collection = "TrangBiNhom1";
    private const string TrangBiNhom2Collection = "TrangBiNhom2";

    private static IMongoCollection<BsonDocument>? GetCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>(CollectionName);

    private static IMongoCollection<BsonDocument>? GetTrangBiCollection(int nhomTrangBi)
        => nhomTrangBi == 2
            ? Global.MongoDB?.GetCollection<BsonDocument>(TrangBiNhom2Collection)
            : Global.MongoDB?.GetCollection<BsonDocument>(TrangBiNhom1Collection);

    [Authorize]
    public override async Task<GetListSuaChuaScheduleResponse> GetListSuaChuaSchedule(
        GetListSuaChuaScheduleRequest request, ServerCallContext context)
    {
        var response = new GetListSuaChuaScheduleResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection SuaChuaSchedule is unavailable.";
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
            logger.LogError(ex, "GetListSuaChuaSchedule error");
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<GetSuaChuaScheduleResponse> GetSuaChuaSchedule(
        GetSuaChuaScheduleRequest request, ServerCallContext context)
    {
        var response = new GetSuaChuaScheduleResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection SuaChuaSchedule is unavailable.";
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
                response.Message = "Khong tim thay lich sua chua.";
                return response;
            }

            response.Item = ToItem(doc);
            response.Success = true;
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetSuaChuaSchedule error: {Id}", request.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<SaveSuaChuaScheduleResponse> SaveSuaChuaSchedule(
        SaveSuaChuaScheduleRequest request, ServerCallContext context)
    {
        var response = new SaveSuaChuaScheduleResponse();
        try
        {
            context.RequireCreateOrEdit(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection SuaChuaSchedule is unavailable.";
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
                .Set("TenSuaChua", item.TenSuaChua)
                .Set("CanCu", item.CanCu)
                .Set("MucSuaChua", item.MucSuaChua)
                .Set("CapSuaChua", item.CapSuaChua)
                .Set("DonViSuaChua", item.DonViSuaChua)
                .Set("DonViDeNghi", item.DonViDeNghi)
                .Set("NgayDeNghi", ToBsonDateOrNull(item.NgayDeNghi))
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
            logger.LogError(ex, "SaveSuaChuaSchedule error: {Id}", request.Item?.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteSuaChuaSchedule(
        DeleteSuaChuaScheduleRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            context.RequireDelete(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection SuaChuaSchedule is unavailable.";
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
            logger.LogError(ex, "DeleteSuaChuaSchedule error: {Id}", request.Id);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    [Authorize]
    public override async Task<GetListSuaChuaScheduleByTrangBiResponse> GetListSuaChuaScheduleByTrangBi(
        GetListSuaChuaScheduleByTrangBiRequest request, ServerCallContext context)
    {
        var response = new GetListSuaChuaScheduleByTrangBiResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null)
            {
                response.Success = false;
                response.Message = "MongoDB collection SuaChuaSchedule is unavailable.";
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
            logger.LogError(ex, "GetListSuaChuaScheduleByTrangBi error: {IdTrangBi}", request.IdTrangBi);
            response.Success = false;
            response.Message = ex.Message;
            return response;
        }
    }

    private static FilterDefinition<BsonDocument> BuildListFilter(GetListSuaChuaScheduleRequest request, ServerCallContext context)
    {
        var fb = Builders<BsonDocument>.Filter;
        var filters = new List<FilterDefinition<BsonDocument>>
        {
            fb.Ne("Delete", true),
            ServiceMutationPolicy.BuildCnVisibilityFilter(context, "DsTrangBi.IdChuyenNganhKT", true),
        };

        if (!string.IsNullOrWhiteSpace(request.DonViSuaChua))
            filters.Add(BuildOfficeSubtreeFilter(fb, "DonViSuaChua", request.DonViSuaChua));

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
                fb.Regex("TenSuaChua", regex),
                fb.Regex("CanCu", regex),
                fb.Regex("MucSuaChua", regex),
                fb.Regex("CapSuaChua", regex),
                fb.Regex("DonViSuaChua", regex),
                fb.Regex("DonViDeNghi", regex),
                fb.Regex("DsTrangBi.TenDanhMuc", regex),
                fb.Regex("DsTrangBi.SoHieu", regex)));
        }

        var fromDate = request.FromDate?.ToDateTime().ToUniversalTime();
        var toDate = request.ToDate?.ToDateTime().ToUniversalTime();
        if (fromDate.HasValue)
            filters.Add(fb.Gte("NgayDeNghi", fromDate.Value));
        if (toDate.HasValue)
            filters.Add(fb.Lte("NgayDeNghi", toDate.Value));

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

    private async Task ValidateTrangBiRefsAsync(IEnumerable<SuaChuaScheduleTrangBiItem> items, CancellationToken cancellationToken)
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

    private static SuaChuaScheduleGridItem ToGridItem(BsonDocument doc)
    {
        var item = new SuaChuaScheduleGridItem
        {
            Id = doc.IdString(),
            TenSuaChua = doc.StringOr("TenSuaChua"),
            CanCu = doc.StringOr("CanCu"),
            MucSuaChua = doc.StringOr("MucSuaChua"),
            CapSuaChua = doc.StringOr("CapSuaChua"),
            DonViSuaChua = doc.StringOr("DonViSuaChua"),
            DonViDeNghi = doc.StringOr("DonViDeNghi"),
            SoTrangBi = doc.ArrayOr("DsTrangBi").Count,
            NguoiSua = doc.StringOr("NguoiSua"),
        };

        if (doc.TryGetValue("NgayDeNghi", out var n) && n.IsBsonDateTime)
            item.NgayDeNghi = Timestamp.FromDateTime(n.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgaySua", out var ns) && ns.IsBsonDateTime)
            item.NgaySua = Timestamp.FromDateTime(ns.AsBsonDateTime.ToUniversalTime());

        return item;
    }

    private static SuaChuaScheduleItem ToItem(BsonDocument doc)
    {
        var item = new SuaChuaScheduleItem
        {
            Id = doc.IdString(),
            TenSuaChua = doc.StringOr("TenSuaChua"),
            CanCu = doc.StringOr("CanCu"),
            MucSuaChua = doc.StringOr("MucSuaChua"),
            CapSuaChua = doc.StringOr("CapSuaChua"),
            DonViSuaChua = doc.StringOr("DonViSuaChua"),
            DonViDeNghi = doc.StringOr("DonViDeNghi"),
            GhiChu = doc.StringOr("GhiChu"),
            NguoiTao = doc.StringOr("NguoiTao"),
            NguoiSua = doc.StringOr("NguoiSua"),
            Version = doc.IntOr("Version", 1),
        };

        if (doc.TryGetValue("NgayDeNghi", out var ndn) && ndn.IsBsonDateTime)
            item.NgayDeNghi = Timestamp.FromDateTime(ndn.AsBsonDateTime.ToUniversalTime());
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
                var row = new SuaChuaScheduleTrangBiItem
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
        SuaChuaScheduleItem item,
        string id,
        string? userCreate,
        DateTime nowCreate,
        DateTime nowUpdate,
        int version)
    {
        return new BsonDocument
        {
            ["_id"] = id,
            ["TenSuaChua"] = item.TenSuaChua,
            ["CanCu"] = item.CanCu,
            ["MucSuaChua"] = item.MucSuaChua,
            ["CapSuaChua"] = item.CapSuaChua,
            ["DonViSuaChua"] = item.DonViSuaChua,
            ["DonViDeNghi"] = item.DonViDeNghi,
            ["NgayDeNghi"] = ToBsonDateOrNull(item.NgayDeNghi),
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

    private static BsonArray MapTrangBiItems(IEnumerable<SuaChuaScheduleTrangBiItem> items)
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
