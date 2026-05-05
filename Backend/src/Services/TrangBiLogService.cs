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
public sealed class TrangBiLogServiceImpl(
    ILogger<TrangBiLogServiceImpl> logger,
    FieldSetService fieldSetService)
    : TrangBiLogService.TrangBiLogServiceBase
{
    private const string CollectionName = "TrangBiLog";
    private const string PermissionCode = "trangbilog.view";
    private static string MapLoaiNghiepVuToFieldSetKey(string? value)
        => (value ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "bao_quan" => "trang_bi.bao_quan",
            "bao_duong" => "trang_bi.bao_duong",
            "sua_chua" => "trang_bi.sua_chua",
            "niem_cat" => "trang_bi.niem_cat",
            "dieu_dong" => "trang_bi.dieu_dong",
            _ => string.Empty,
        };

    private static IMongoCollection<BsonDocument>? GetCollection()
        => Global.MongoDB?.GetCollection<BsonDocument>(CollectionName);

    private static FilterDefinition<BsonDocument> BuildCnFilter(ServerCallContext context, string fieldName = "IdChuyenNganhKT")
        => ServiceMutationPolicy.BuildCnVisibilityFilter(context, fieldName, true);

    // ── ToSummary ─────────────────────────────────────────────────────────────
    private static TrangBiLogSummary ToSummary(BsonDocument doc)
    {
        var item = new TrangBiLogSummary
        {
            Id = doc.IdString(),
            LogType = (LogType)doc.IntOr("LogType", (int)LogType.Unspecified),
            IdTrangBi = doc.StringOr("IdTrangBi"),
            TenTrangBi = doc.StringOr("TenTrangBi"),
            SoHieuTrangBi = doc.StringOr("SoHieuTrangBi"),
            DonViChuQuan = doc.StringOr("DonViChuQuan"),
            Status = (LogStatus)doc.IntOr("Status", (int)LogStatus.Unspecified),
            KtvChinh = doc.StringOr("KtvChinh"),
            NguoiSua = doc.StringOr("NguoiSua"),
        };

        if (doc.TryGetValue("NgayDuKien", out var ndk) && ndk.IsBsonDateTime)
            item.NgayDuKien = Timestamp.FromDateTime(ndk.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgayThucHien", out var nth) && nth.IsBsonDateTime)
            item.NgayThucHien = Timestamp.FromDateTime(nth.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgayHoanThanh", out var nht) && nht.IsBsonDateTime)
            item.NgayHoanThanh = Timestamp.FromDateTime(nht.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgaySua", out var ns) && ns.IsBsonDateTime)
            item.NgaySua = Timestamp.FromDateTime(ns.AsBsonDateTime.ToUniversalTime());

        return item;
    }

    // ── ToCalendarItem ──────────────────────────────────────────────────────
    private static TrangBiLogCalendarItem ToCalendarItem(BsonDocument doc)
    {
        var item = new TrangBiLogCalendarItem
        {
            Id = doc.IdString(),
            LogType = (LogType)doc.IntOr("LogType", (int)LogType.Unspecified),
            Status = (LogStatus)doc.IntOr("Status", (int)LogStatus.Unspecified),
            TenTrangBi = doc.StringOr("TenTrangBi"),
            KtvChinh = doc.StringOr("KtvChinh"),
        };

        if (doc.TryGetValue("NgayDuKien", out var ndk) && ndk.IsBsonDateTime)
            item.Ngay = Timestamp.FromDateTime(ndk.AsBsonDateTime.ToUniversalTime());

        return item;
    }
    [Authorize]
    // ── GetList ──────────────────────────────────────────────────────────────
    public override async Task<GetListTrangBiLogResponse> GetListTrangBiLog(
        GetListTrangBiLogRequest request, ServerCallContext context)
    {
        var response = new GetListTrangBiLogResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var filterBuilder = Builders<BsonDocument>.Filter;
            var filters = new List<FilterDefinition<BsonDocument>>
            {
                filterBuilder.Eq("Delete", false),
                BuildCnFilter(context),
            };

            if (request.LogType != LogType.Unspecified)
                filters.Add(filterBuilder.Eq("LogType", (int)request.LogType));

            if (!string.IsNullOrWhiteSpace(request.IdTrangBi))
                filters.Add(filterBuilder.Eq("IdTrangBi", request.IdTrangBi));

            if (!string.IsNullOrWhiteSpace(request.IdChuyenNganhKt))
                filters.Add(filterBuilder.Eq("IdChuyenNganhKT", request.IdChuyenNganhKt));

            if (!string.IsNullOrWhiteSpace(request.IdNhomDongBo))
                filters.Add(filterBuilder.Eq("IdNhomDongBo", request.IdNhomDongBo));

            if (!string.IsNullOrWhiteSpace(request.Status))
                filters.Add(filterBuilder.Eq("Status", int.Parse(request.Status)));

            if (!string.IsNullOrWhiteSpace(request.KtvChinh))
                filters.Add(filterBuilder.Eq("KtvChinh", request.KtvChinh));

            if (!string.IsNullOrWhiteSpace(request.SearchText))
                filters.Add(filterBuilder.Or(
                    filterBuilder.Regex("TenTrangBi", new BsonRegularExpression(request.SearchText, "i")),
                    filterBuilder.Regex("SoHieuTrangBi", new BsonRegularExpression(request.SearchText, "i")),
                    filterBuilder.Regex("DonViChuQuan", new BsonRegularExpression(request.SearchText, "i"))
                ));

            // Month / Quarter filter
            if (request.Year > 0)
            {
                var startOfMonth = request.Month > 0
                    ? new DateTime(request.Year, request.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                    : new DateTime(request.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                var endOfMonth = request.Month > 0
                    ? startOfMonth.AddMonths(1)
                    : new DateTime(request.Year + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc);

                filters.Add(filterBuilder.Gte("NgayDuKien", startOfMonth));
                filters.Add(filterBuilder.Lt("NgayDuKien", endOfMonth));
            }

            var combined = filterBuilder.And(filters);
            var docs = await coll.Find(combined)
                .Sort(Builders<BsonDocument>.Sort.Descending("NgayDuKien"))
                .Limit(200)
                .ToListAsync();

            foreach (var doc in docs)
                response.Items.Add(ToSummary(doc));

            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListTrangBiLog error");
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }
    [Authorize]
    // ── Get ─────────────────────────────────────────────────────────────────
    public override async Task<GetTrangBiLogResponse> GetTrangBiLog(
        GetTrangBiLogRequest request, ServerCallContext context)
    {
        var response = new GetTrangBiLogResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("_id", request.Id),
                Builders<BsonDocument>.Filter.Eq("Delete", false),
                BuildCnFilter(context)
            );

            var doc = await coll.Find(filter).FirstOrDefaultAsync();
            if (doc == null)
            {
                response.Meta = new ResponseMeta { Success = false, Message = "Khong tim thay ban ghi" };
                return response;
            }

            response.Item = MapDocToProto(doc);
            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetTrangBiLog error: {Id}", request.Id);
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }
    [Authorize]
    // ── Save ────────────────────────────────────────────────────────────────
    public override async Task<SaveTrangBiLogResponse> SaveTrangBiLog(
        SaveTrangBiLogRequest request, ServerCallContext context)
    {
        var response = new SaveTrangBiLogResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var item = request.Item;
            var now = DateTime.UtcNow;
            var userId = context.GetUserID();

            if (string.IsNullOrWhiteSpace(item.Id))
            {
                // ── INSERT ────────────────────────────────────────────────
                item.Id = ObjectId.GenerateNewId().ToString();
                item.NgayTao = Timestamp.FromDateTime(now);

                var doc = MapProtoToDoc(item);
                doc["NguoiTao"] = userId;
                doc["NgayTao"] = now;
                doc["Delete"] = false;
                doc["Version"] = 1;

                coll.InsertOne(doc);
            }
            else
            {
                // ── UPDATE ──────────────────────────────────────────────────
                item.NgaySua = Timestamp.FromDateTime(now);

                var filter = Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                    Builders<BsonDocument>.Filter.Eq("Delete", false)
                );

                var updateDoc = MapProtoToDoc(item);
                updateDoc["NguoiSua"] = userId;
                updateDoc["NgaySua"] = now;

                var update = Builders<BsonDocument>.Update
                    .Set("LogType", updateDoc["LogType"])
                    .Set("IdTrangBi", updateDoc["IdTrangBi"])
                    .Set("MaDanhMuc", updateDoc["MaDanhMuc"])
                    .Set("IdChuyenNganhKT", updateDoc["IdChuyenNganhKT"])
                    .Set("TenTrangBi", updateDoc["TenTrangBi"])
                    .Set("SoHieuTrangBi", updateDoc["SoHieuTrangBi"])
                    .Set("DonViChuQuan", updateDoc["DonViChuQuan"])
                    .Set("DonViQuanLy", updateDoc["DonViQuanLy"])
                    .Set("IdNhomDongBo", updateDoc["IdNhomDongBo"])
                    .Set("NgayLapKeHoach", updateDoc["NgayLapKeHoach"])
                    .Set("NgayDuKien", updateDoc["NgayDuKien"])
                    .Set("NgayThucHien", updateDoc["NgayThucHien"])
                    .Set("NgayHoanThanh", updateDoc["NgayHoanThanh"])
                    .Set("Status", updateDoc["Status"])
                    .Set("KtvChinh", updateDoc["KtvChinh"])
                    .Set("KtvTroLy", updateDoc["KtvTroLy"])
                    .Set("ChiHuyDuyet", updateDoc["ChiHuyDuyet"])
                    .Set("Parameters", updateDoc["Parameters"])
                    .Set("GhiChu", updateDoc["GhiChu"])
                    .Set("BaoQuan", updateDoc["BaoQuan"])
                    .Set("BaoDuong", updateDoc["BaoDuong"])
                    .Set("SuaChua", updateDoc["SuaChua"])
                    .Set("NiemCat", updateDoc["NiemCat"])
                    .Set("DieuDong", updateDoc["DieuDong"])
                    .Set("NguoiSua", updateDoc["NguoiSua"])
                    .Set("NgaySua", updateDoc["NgaySua"])
                    .Inc("Version", 1);

                var result = await coll.UpdateOneAsync(filter, update);
                if (result.MatchedCount == 0)
                {
                    response.Meta = new ResponseMeta { Success = false, Message = "Khong tim thay ban ghi de cap nhat" };
                    return response;
                }
            }

            response.Item = item;
            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveTrangBiLog error: {Id}", request.Item?.Id);
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }
    [Authorize]
    // ── Delete (soft) ───────────────────────────────────────────────────────
    public override async Task<DeleteBaseResponse> DeleteTrangBiLog(
        DeleteTrangBiLogRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var filter = Builders<BsonDocument>.Filter.In("_id", request.Ids);
            var update = Builders<BsonDocument>.Update
                .Set("Delete", true)
                .Set("NguoiSua", context.GetUserID())
                .Set("NgaySua", DateTime.UtcNow);

            var result = await coll.UpdateManyAsync(filter, update);
            response.Success = true;
            response.Message = $"Da xoa {result.ModifiedCount} ban ghi";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteTrangBiLog error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }
    [Authorize]
    // ── Restore ─────────────────────────────────────────────────────────────
    public override async Task<StatusResponse> RestoreTrangBiLog(
        RestoreTrangBiLogRequest request, ServerCallContext context)
    {
        var response = new StatusResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var filter = Builders<BsonDocument>.Filter.In("_id", request.Ids);
            var update = Builders<BsonDocument>.Update
                .Set("Delete", false)
                .Set("NguoiSua", context.GetUserID())
                .Set("NgaySua", DateTime.UtcNow);

            var result = await coll.UpdateManyAsync(filter, update);
            response.Success = true;
            response.Message = $"Da khoi phuc {result.ModifiedCount} ban ghi";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RestoreTrangBiLog error");
            response.Success = false;
            response.Message = ex.Message;
        }
        return response;
    }

    // ── FieldSets by log type ─────────────────────────────────────────────────
    // Proxy sang FieldSetService, loc theo FieldSet.Key runtime
    public override async Task<GetFieldSetsByLogTypeResponse> GetFieldSetsByLogType(
        GetFieldSetsByLogTypeRequest request, ServerCallContext context)
    {
        var response = new GetFieldSetsByLogTypeResponse();
        try
        {
            context.RequireView(PermissionCode);

            // Lay tat ca FieldSet (da bao gom DynamicField)
            var allResponse = await fieldSetService.GetListFieldSetsAsync(new GetListFieldSetsRequest());
            if (allResponse.Items.Count == 0)
            {
                response.Meta = new ResponseMeta { Success = true, Message = "Khong co bo du lieu nao" };
                return response;
            }

            var runtimeKey = MapLoaiNghiepVuToFieldSetKey(request.LoaiNghiepVu);
            foreach (var item in allResponse.Items)
            {
                var fieldSetKey = (item.FieldSet.Key ?? string.Empty).Trim();
                if (!string.IsNullOrEmpty(runtimeKey) && !string.Equals(fieldSetKey, runtimeKey, StringComparison.OrdinalIgnoreCase))
                    continue;

                response.Items.Add(item);
            }

            response.Meta = new ResponseMeta { Success = true };
            logger.LogInformation("GetFieldSetsByLogType: {Count} items for key='{FieldSetKey}'",
                response.Items.Count, runtimeKey);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetFieldSetsByLogType error");
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }

    // ── Calendar ────────────────────────────────────────────────────────────
    public override async Task<GetCalendarLogResponse> GetCalendarLog(
        GetCalendarLogRequest request, ServerCallContext context)
    {
        var response = new GetCalendarLogResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var startOfMonth = new DateTime(request.Year, request.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endOfMonth = startOfMonth.AddMonths(1);

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("Delete", false),
                Builders<BsonDocument>.Filter.Eq("LogType", (int)request.LogType),
                Builders<BsonDocument>.Filter.Gte("NgayDuKien", startOfMonth),
                Builders<BsonDocument>.Filter.Lt("NgayDuKien", endOfMonth),
                BuildCnFilter(context)
            );

            var docs = await coll.Find(filter).ToListAsync();
            foreach (var doc in docs)
                response.Items.Add(ToCalendarItem(doc));

            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetCalendarLog error");
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }

    // ── Technician workload ──────────────────────────────────────────────────
    public override async Task<GetKTVWorkloadResponse> GetKTVWorkload(
        GetKTVWorkloadRequest request, ServerCallContext context)
    {
        var response = new GetKTVWorkloadResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var startOfMonth = new DateTime(request.Year, request.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endOfMonth = startOfMonth.AddMonths(1);

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("Delete", false),
                Builders<BsonDocument>.Filter.Eq("LogType", (int)request.LogType),
                Builders<BsonDocument>.Filter.Gte("NgayDuKien", startOfMonth),
                Builders<BsonDocument>.Filter.Lt("NgayDuKien", endOfMonth),
                BuildCnFilter(context)
            );

            var docs = await coll.Find(filter).ToListAsync();

            var grouped = docs
                .Where(d => !string.IsNullOrWhiteSpace(d.StringOr("KtvChinh")))
                .GroupBy(d => d.StringOr("KtvChinh"))
                .Select(g =>
                {
                    var total = g.Count();
                    var done = g.Count(d => d.IntOr("Status", 0) == (int)LogStatus.DaHoanThanh);
                    return new KTVWorkloadItem
                    {
                        KtvId = g.Key,
                        TenKtv = g.Key,
                        TongNhiemVu = total,
                        DaHoanThanh = done,
                        ConLai = total - done,
                        TaiPhanCong = total > 0 ? Math.Round((double)done / total, 2) : 0,
                    };
                })
                .ToList();

            foreach (var item in grouped)
                response.Items.Add(item);

            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetKTVWorkload error");
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }

    // ── Stats ────────────────────────────────────────────────────────────────
    public override async Task<GetLogStatsResponse> GetLogStats(
        GetLogStatsRequest request, ServerCallContext context)
    {
        var response = new GetLogStatsResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var (start, end) = GetMonthRange(request.Year, request.Month, request.Quarter);

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("Delete", false),
                Builders<BsonDocument>.Filter.Eq("LogType", (int)request.LogType),
                Builders<BsonDocument>.Filter.Gte("NgayDuKien", start),
                Builders<BsonDocument>.Filter.Lt("NgayDuKien", end),
                BuildCnFilter(context)
            );

            var docs = await coll.Find(filter).ToListAsync();
            var total = docs.Count;
            var done = docs.Count(d => d.IntOr("Status", 0) == (int)LogStatus.DaHoanThanh);
            var now = DateTime.UtcNow;

            var overdue = docs.Count(d =>
                d.IntOr("Status", 0) != (int)LogStatus.DaHoanThanh &&
                d.TryGetValue("NgayDuKien", out var nd) && nd.IsBsonDateTime &&
                nd.AsBsonDateTime.ToUniversalTime() < now);

            var dueSoon = docs.Count(d =>
                d.IntOr("Status", 0) != (int)LogStatus.DaHoanThanh &&
                d.TryGetValue("NgayDuKien", out var nd) && nd.IsBsonDateTime &&
                nd.AsBsonDateTime.ToUniversalTime() >= now &&
                nd.AsBsonDateTime.ToUniversalTime() <= now.AddDays(15));

            response.Stats = new LogStats
            {
                KeHoachThang = total,
                DaHoanThanh = done,
                ConLai = total - done,
                TyLeHoanThanh = total > 0 ? Math.Round((double)done / total, 2) : 0,
                QuaHan = overdue,
                SapDenHan = dueSoon,
            };

            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetLogStats error");
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }

    // ── Quarter Gantt ──────────────────────────────────────────────────────
    public override async Task<GetQuarterGanttResponse> GetQuarterGantt(
        GetQuarterGanttRequest request, ServerCallContext context)
    {
        var response = new GetQuarterGanttResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var quarterStartMonth = (request.Quarter - 1) * 3 + 1;
            var start = new DateTime(request.Year, quarterStartMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = start.AddMonths(3);

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("Delete", false),
                Builders<BsonDocument>.Filter.Eq("LogType", (int)request.LogType),
                Builders<BsonDocument>.Filter.Gte("NgayDuKien", start),
                Builders<BsonDocument>.Filter.Lt("NgayDuKien", end),
                BuildCnFilter(context)
            );

            var docs = await coll.Find(filter).ToListAsync();

            // quarterStartMonth already defined above
            var grouped = docs
                .GroupBy(d => d.StringOr("IdTrangBi"))
                .Select(g =>
                {
                    var first = g.First();
                    var m1Status = GetMonthStatus(g, quarterStartMonth);
                    var m2Status = GetMonthStatus(g, quarterStartMonth + 1);
                    var m3Status = GetMonthStatus(g, quarterStartMonth + 2);

                    return new GanttRow
                    {
                        IdTrangBi = g.Key,
                        TenTrangBi = first.StringOr("TenTrangBi"),
                        DonVi = first.StringOr("DonViChuQuan"),
                        StatusThang1 = m1Status,
                        StatusThang2 = m2Status,
                        StatusThang3 = m3Status,
                    };
                })
                .ToList();

            foreach (var row in grouped)
                response.Rows.Add(row);

            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetQuarterGantt error");
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }

    // ── Log history by equipment ────────────────────────────────────────────
    public override async Task<GetLogHistoryByTrangBiResponse> GetLogHistoryByTrangBi(
        GetLogHistoryByTrangBiRequest request, ServerCallContext context)
    {
        var response = new GetLogHistoryByTrangBiResponse();
        try
        {
            context.RequireView(PermissionCode);

            var coll = GetCollection();
            if (coll == null) return response;

            var filterBuilder = Builders<BsonDocument>.Filter;
            var filters = new List<FilterDefinition<BsonDocument>>
            {
                filterBuilder.Eq("Delete", false),
                filterBuilder.Eq("IdTrangBi", request.IdTrangBi),
                BuildCnFilter(context),
            };

            if (request.LogType != LogType.Unspecified)
                filters.Add(filterBuilder.Eq("LogType", (int)request.LogType));

            var docs = await coll.Find(filterBuilder.And(filters))
                .Sort(Builders<BsonDocument>.Sort.Descending("NgayThucHien"))
                .Limit(request.Limit > 0 ? request.Limit : 50)
                .ToListAsync();

            foreach (var doc in docs)
                response.Items.Add(ToSummary(doc));

            response.Meta = new ResponseMeta { Success = true };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetLogHistoryByTrangBi error: {IdTrangBi}", request.IdTrangBi);
            response.Meta = new ResponseMeta { Success = false, Message = ex.Message };
        }
        return response;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static (DateTime start, DateTime end) GetMonthRange(int year, int month, int quarter)
    {
        if (quarter > 0)
        {
            var qStartMonth = (quarter - 1) * 3 + 1;
            return (new DateTime(year, qStartMonth, 1, 0, 0, 0, DateTimeKind.Utc),
                    new DateTime(year, qStartMonth, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(3));
        }
        if (month > 0)
        {
            return (new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc),
                    new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1));
        }
        return (new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(year + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc));
    }

    private static LogStatus GetMonthStatus(IGrouping<string, BsonDocument> group, int month)
    {
        var doc = group.FirstOrDefault(d =>
            d.TryGetValue("NgayDuKien", out var nd) && nd.IsBsonDateTime &&
            nd.AsBsonDateTime.ToUniversalTime().Month == (month % 12 == 0 ? 12 : month % 12));
        return doc != null ? (LogStatus)doc.IntOr("Status", 0) : LogStatus.Unspecified;
    }

    // Map BsonDocument → TrangBiLog proto (without type-specific fields for now)
    private static TrangBiLog MapDocToProto(BsonDocument doc)
    {
        var item = new TrangBiLog
        {
            Id = doc.IdString(),
            LogType = (LogType)doc.IntOr("LogType", (int)LogType.Unspecified),
            IdTrangBi = doc.StringOr("IdTrangBi"),
            MaDanhMuc = doc.StringOr("MaDanhMuc"),
            Status = (LogStatus)doc.IntOr("Status", (int)LogStatus.Unspecified),
            TenTrangBi = doc.StringOr("TenTrangBi"),
            SoHieuTrangBi = doc.StringOr("SoHieuTrangBi"),
            DonViChuQuan = doc.StringOr("DonViChuQuan"),
            DonViQuanLy = doc.StringOr("DonViQuanLy"),
            IdNhomDongBo = doc.StringOr("IdNhomDongBo"),
            KtvChinh = doc.StringOr("KtvChinh"),
            KtvTroLy = doc.StringOr("KtvTroLy"),
            ChiHuyDuyet = doc.StringOr("ChiHuyDuyet"),
            GhiChu = doc.StringOr("GhiChu"),
            NguoiTao = doc.StringOr("NguoiTao"),
            NguoiSua = doc.StringOr("NguoiSua"),
            Version = doc.IntOr("Version", 1),
        };

        if (doc.TryGetValue("IdChuyenNganhKT", out var cn) && !cn.IsBsonNull)
            item.IdChuyenNganhKt = cn.ToString();
        if (doc.TryGetValue("NgayLapKeHoach", out var nlkh) && nlkh.IsBsonDateTime)
            item.NgayLapKeHoach = Timestamp.FromDateTime(nlkh.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgayDuKien", out var ndk) && ndk.IsBsonDateTime)
            item.NgayDuKien = Timestamp.FromDateTime(ndk.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgayThucHien", out var nth) && nth.IsBsonDateTime)
            item.NgayThucHien = Timestamp.FromDateTime(nth.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgayHoanThanh", out var nht) && nht.IsBsonDateTime)
            item.NgayHoanThanh = Timestamp.FromDateTime(nht.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgayTao", out var ntao) && ntao.IsBsonDateTime)
            item.NgayTao = Timestamp.FromDateTime(ntao.AsBsonDateTime.ToUniversalTime());
        if (doc.TryGetValue("NgaySua", out var nsua) && nsua.IsBsonDateTime)
            item.NgaySua = Timestamp.FromDateTime(nsua.AsBsonDateTime.ToUniversalTime());

        // Parameters
        if (doc.TryGetValue("Parameters", out var p) && p.IsBsonDocument)
        {
            foreach (var kv in p.AsBsonDocument)
                item.Parameters[kv.Name] = kv.Value.IsObjectId ? kv.Value.AsObjectId.ToString() : kv.Value.ToString() ?? "";
        }

        return item;
    }

    // Map TrangBiLog proto → BsonDocument
    private static BsonDocument MapProtoToDoc(TrangBiLog item)
    {
        var doc = new BsonDocument
        {
            ["LogType"] = (int)item.LogType,
            ["IdTrangBi"] = item.IdTrangBi,
            ["MaDanhMuc"] = item.MaDanhMuc,
            ["IdChuyenNganhKT"] = string.IsNullOrWhiteSpace(item.IdChuyenNganhKt) ? BsonNull.Value : item.IdChuyenNganhKt,
            ["TenTrangBi"] = item.TenTrangBi,
            ["SoHieuTrangBi"] = item.SoHieuTrangBi,
            ["DonViChuQuan"] = item.DonViChuQuan,
            ["DonViQuanLy"] = item.DonViQuanLy,
            ["IdNhomDongBo"] = item.IdNhomDongBo,
            ["Status"] = (int)item.Status,
            ["KtvChinh"] = item.KtvChinh,
            ["KtvTroLy"] = item.KtvTroLy,
            ["ChiHuyDuyet"] = item.ChiHuyDuyet,
            ["GhiChu"] = item.GhiChu,
        };

        if (item.NgayLapKeHoach != null)
            doc["NgayLapKeHoach"] = item.NgayLapKeHoach.ToDateTime();
        if (item.NgayDuKien != null)
            doc["NgayDuKien"] = item.NgayDuKien.ToDateTime();
        if (item.NgayThucHien != null)
            doc["NgayThucHien"] = item.NgayThucHien.ToDateTime();
        if (item.NgayHoanThanh != null)
            doc["NgayHoanThanh"] = item.NgayHoanThanh.ToDateTime();

        // Parameters
        if (item.Parameters.Count > 0)
        {
            var pDoc = new BsonDocument();
            foreach (var kv in item.Parameters)
                pDoc[kv.Key] = kv.Value;
            doc["Parameters"] = pDoc;
        }

        return doc;
    }
}
