using Backend.Converter;
using Backend.Utils;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

[Authorize]
public class LichSuPhanQuyenScopeServiceImpl : LichSuPhanQuyenScopeService.LichSuPhanQuyenScopeServiceBase
{
    private const string ColLichSuPhanQuyenScope = "LichSuPhanQuyenScope";

    // ── GetList ───────────────────────────────────────────────────
    public override async Task<LichSuPhanQuyenScopeListResponse> GetList(
        LichSuPhanQuyenScopeListRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColLichSuPhanQuyenScope);

        var filters = new List<FilterDefinition<BsonDocument>>();

        // Filter by id_nguoi_duoc_phan_quyen
        if (!string.IsNullOrEmpty(request.IdNguoiDuocPhanQuyen))
        {
            filters.Add(Builders<BsonDocument>.Filter.Eq("IdNguoiDuocPhanQuyen", request.IdNguoiDuocPhanQuyen));
        }

        // Filter by id_nhom_nguoi_dung
        if (!string.IsNullOrEmpty(request.IdNhomNguoiDung))
        {
            filters.Add(Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.IdNhomNguoiDung));
        }

        // Filter by id_nguoi_thuc_hien
        if (!string.IsNullOrEmpty(request.IdNguoiThucHien))
        {
            filters.Add(Builders<BsonDocument>.Filter.Eq("IdNguoiThucHien", request.IdNguoiThucHien));
        }

        // Filter by ma_phan_he
        if (!string.IsNullOrEmpty(request.MaPhanHe))
        {
            filters.Add(Builders<BsonDocument>.Filter.Eq("MaPhanHe", request.MaPhanHe));
        }

        // Filter by hanh_dong
        if (!string.IsNullOrEmpty(request.HanhDong))
        {
            filters.Add(Builders<BsonDocument>.Filter.Eq("HanhDong", request.HanhDong));
        }

        var filter = filters.Count > 0
            ? Builders<BsonDocument>.Filter.And(filters)
            : FilterDefinition<BsonDocument>.Empty;

        // Sắp xếp theo thời gian giảm dần (mới nhất trước)
        var docs = await col.Find(filter)
            .SortByDescending(d => d["NgayThucHien"])
            .ToListAsync();

        var response = new LichSuPhanQuyenScopeListResponse();
        foreach (var doc in docs)
        {
            response.Items.Add(ToProto(doc));
        }
        response.Success = true;
        return response;
    }

    // ── Get ───────────────────────────────────────────────────────
    public override async Task<LichSuPhanQuyenScopeGetResponse> Get(
        LichSuPhanQuyenScopeGetRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColLichSuPhanQuyenScope);

        var doc = await col.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
            .FirstOrDefaultAsync();

        if (doc == null)
        {
            return new LichSuPhanQuyenScopeGetResponse
            {
                Success = false,
                Message = "Không tìm thấy lịch sử phân quyền scope"
            };
        }

        return new LichSuPhanQuyenScopeGetResponse
        {
            Item = ToProto(doc),
            Success = true
        };
    }

    // ── Save ──────────────────────────────────────────────────────
    public override async Task<LichSuPhanQuyenScopeSaveResponse> Save(
        LichSuPhanQuyenScopeSaveRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColLichSuPhanQuyenScope);

        var item = request.Item;
        var id = string.IsNullOrEmpty(item.Id) ? Guid.NewGuid().ToString() : item.Id;
        var now = DateTime.UtcNow;

        var doc = new BsonDocument
        {
            { "_id", id },
            { "IdNguoiDuocPhanQuyen", item.IdNguoiDuocPhanQuyen },
            { "IdNhomNguoiDung", item.IdNhomNguoiDung },
            { "IdNguoiThucHien", item.IdNguoiThucHien },
            { "MaPhanHe", item.MaPhanHe },
            { "HanhDong", item.HanhDong },
            { "GhiChu", item.GhiChu },

            // Scope cũ
            { "ScopeTypeCu", item.ScopeTypeCu },
            { "IdDonViScopeCu", item.IdDonViScopeCu },
            { "IdNganhDocCu", new BsonArray(item.IdNganhDocCu.ToList()) },
            { "NgayHetHanCu", item.NgayHetHanCu?.ToDateTime() },
            { "IdNguoiUyQuyenCu", item.IdNguoiUyQuyenCu },
            { "IdNhomChuyenNganhCu", item.IdNhomChuyenNganhCu },

            // Scope mới
            { "ScopeTypeMoi", item.ScopeTypeMoi },
            { "IdDonViScopeMoi", item.IdDonViScopeMoi },
            { "IdNganhDocMoi", new BsonArray(item.IdNganhDocMoi.ToList()) },
            { "NgayHetHanMoi", item.NgayHetHanMoi?.ToDateTime() },
            { "IdNguoiUyQuyenMoi", item.IdNguoiUyQuyenMoi },
            { "IdNhomChuyenNganhMoi", item.IdNhomChuyenNganhMoi },

            // Thời gian
            { "NgayThucHien", now },
        };

        await col.InsertOneAsync(doc);

        return new LichSuPhanQuyenScopeSaveResponse
        {
            Id = id,
            Success = true,
            Message = "Ghi nhận lịch sử thành công"
        };
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static LichSuPhanQuyenScope ToProto(BsonDocument doc)
    {
        var item = new LichSuPhanQuyenScope
        {
            Id = doc["_id"].ToString()!,
            IdNguoiDuocPhanQuyen = SafeStr(doc, "IdNguoiDuocPhanQuyen"),
            IdNhomNguoiDung = SafeStr(doc, "IdNhomNguoiDung"),
            IdNguoiThucHien = SafeStr(doc, "IdNguoiThucHien"),
            MaPhanHe = SafeStr(doc, "MaPhanHe"),
            HanhDong = SafeStr(doc, "HanhDong"),

            // Scope cũ
            ScopeTypeCu = SafeStr(doc, "ScopeTypeCu"),
            IdDonViScopeCu = SafeStr(doc, "IdDonViScopeCu"),
            IdNguoiUyQuyenCu = SafeStr(doc, "IdNguoiUyQuyenCu"),
            IdNhomChuyenNganhCu = SafeStr(doc, "IdNhomChuyenNganhCu"),

            // Scope mới
            ScopeTypeMoi = SafeStr(doc, "ScopeTypeMoi"),
            IdDonViScopeMoi = SafeStr(doc, "IdDonViScopeMoi"),
            IdNguoiUyQuyenMoi = SafeStr(doc, "IdNguoiUyQuyenMoi"),
            IdNhomChuyenNganhMoi = SafeStr(doc, "IdNhomChuyenNganhMoi"),
        };

        // GhiChu
        var ghiChu = SafeStr(doc, "GhiChu");
        if (!string.IsNullOrEmpty(ghiChu))
            item.GhiChu = ghiChu;

        // IdNganhDocCu
        var nganhDocCu = doc.GetValue("IdNganhDocCu", BsonNull.Value);
        if (nganhDocCu.IsBsonArray)
        {
            foreach (var cn in nganhDocCu.AsBsonArray)
                if (cn.IsString)
                    item.IdNganhDocCu.Add(cn.AsString);
        }

        // IdNganhDocMoi
        var nganhDocMoi = doc.GetValue("IdNganhDocMoi", BsonNull.Value);
        if (nganhDocMoi.IsBsonArray)
        {
            foreach (var cn in nganhDocMoi.AsBsonArray)
                if (cn.IsString)
                    item.IdNganhDocMoi.Add(cn.AsString);
        }

        // NgayHetHanCu
        var hetHanCu = doc.GetValue("NgayHetHanCu", BsonNull.Value);
        if (hetHanCu.IsBsonDateTime)
            item.NgayHetHanCu = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(hetHanCu.ToUniversalTime());

        // NgayHetHanMoi
        var hetHanMoi = doc.GetValue("NgayHetHanMoi", BsonNull.Value);
        if (hetHanMoi.IsBsonDateTime)
            item.NgayHetHanMoi = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(hetHanMoi.ToUniversalTime());

        // NgayThucHien
        var ngayThucHien = doc.GetValue("NgayThucHien", BsonNull.Value);
        if (ngayThucHien.IsBsonDateTime)
            item.NgayThucHien = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(ngayThucHien.ToUniversalTime());

        return item;
    }

    private static string SafeStr(BsonDocument? doc, string key, string fallback = "")
    {
        if (doc == null) return fallback;
        var v = doc.GetValue(key, BsonNull.Value);
        return (v == BsonNull.Value || v.IsBsonNull) ? fallback : v.AsString;
    }
}
