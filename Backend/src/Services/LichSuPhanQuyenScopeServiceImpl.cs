using Backend.Authorization;
using Backend.Converter;
using Backend.Common.Bson;
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
            { "IdDanhMucChuyenNganhCu", item.IdDanhMucChuyenNganhCu },

            // Scope mới
            { "ScopeTypeMoi", item.ScopeTypeMoi },
            { "IdDonViScopeMoi", item.IdDonViScopeMoi },
            { "IdNganhDocMoi", new BsonArray(item.IdNganhDocMoi.ToList()) },
            { "NgayHetHanMoi", item.NgayHetHanMoi?.ToDateTime() },
            { "IdNguoiUyQuyenMoi", item.IdNguoiUyQuyenMoi },
            { "IdDanhMucChuyenNganhMoi", item.IdDanhMucChuyenNganhMoi },

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
            Id = doc.IdString(),
            IdNguoiDuocPhanQuyen = doc.StringOr("IdNguoiDuocPhanQuyen"),
            IdNhomNguoiDung = doc.StringOr("IdNhomNguoiDung"),
            IdNguoiThucHien = doc.StringOr("IdNguoiThucHien"),
            MaPhanHe = doc.StringOr("MaPhanHe"),
            HanhDong = doc.StringOr("HanhDong"),

            // Scope cũ
            ScopeTypeCu = doc.StringOr("ScopeTypeCu"),
            IdDonViScopeCu = doc.StringOr("IdDonViScopeCu"),
            IdNguoiUyQuyenCu = doc.StringOr("IdNguoiUyQuyenCu"),
            IdDanhMucChuyenNganhCu = doc.StringOr("IdDanhMucChuyenNganhCu"),

            // Scope mới
            ScopeTypeMoi = doc.StringOr("ScopeTypeMoi"),
            IdDonViScopeMoi = doc.StringOr("IdDonViScopeMoi"),
            IdNguoiUyQuyenMoi = doc.StringOr("IdNguoiUyQuyenMoi"),
            IdDanhMucChuyenNganhMoi = doc.StringOr("IdDanhMucChuyenNganhMoi"),
        };

        // GhiChu
        var ghiChu = doc.StringOr("GhiChu");
        if (!string.IsNullOrEmpty(ghiChu))
            item.GhiChu = ghiChu;

        // IdNganhDocCu
        var nganhDocCu = doc.ArrayOr("IdNganhDocCu");
        if (nganhDocCu != null)
            item.IdNganhDocCu.AddRange(nganhDocCu.Strings());

        // IdNganhDocMoi
        var nganhDocMoi = doc.ArrayOr("IdNganhDocMoi");
        if (nganhDocMoi != null)
            item.IdNganhDocMoi.AddRange(nganhDocMoi.Strings());

        // NgayHetHanCu
        var hetHanCu = doc.TimestampOr("NgayHetHanCu");
        if (hetHanCu != null)
            item.NgayHetHanCu = hetHanCu;

        // NgayHetHanMoi
        var hetHanMoi = doc.TimestampOr("NgayHetHanMoi");
        if (hetHanMoi != null)
            item.NgayHetHanMoi = hetHanMoi;

        // NgayThucHien
        var ngayThucHien = doc.TimestampOr("NgayThucHien");
        if (ngayThucHien != null)
            item.NgayThucHien = ngayThucHien;

        return item;
    }
}
