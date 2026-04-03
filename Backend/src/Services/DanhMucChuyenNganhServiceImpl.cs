using Backend.Authorization;
using Backend.Converter;
using Backend.Common.Bson;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;
using Google.Protobuf.WellKnownTypes;

namespace Backend.Services;

[Authorize]
public class DanhMucChuyenNganhServiceImpl : DanhMucChuyenNganhService.DanhMucChuyenNganhServiceBase
{
    private const string ColDanhMucChuyenNganh = "DanhMucChuyenNganh";

    // ── GetList ───────────────────────────────────────────────────
    public override async Task<DanhMucChuyenNganhListResponse> GetList(
        DanhMucChuyenNganhListRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColDanhMucChuyenNganh);

        var filters = new List<FilterDefinition<BsonDocument>>();

        if (!string.IsNullOrEmpty(request.SearchText))
        {
            var search = request.SearchText;
            filters.Add(Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Regex("_id", new BsonRegularExpression(search, "i")),
                Builders<BsonDocument>.Filter.Regex("Ten", new BsonRegularExpression(search, "i")),
                Builders<BsonDocument>.Filter.Regex("VietTat", new BsonRegularExpression(search, "i"))));
        }

        var filter = filters.Count > 0
            ? Builders<BsonDocument>.Filter.And(filters)
            : FilterDefinition<BsonDocument>.Empty;

        var docs = await col.Find(filter).SortBy(x => x["ThuTu"]).ToListAsync();

        var response = new DanhMucChuyenNganhListResponse();
        foreach (var doc in docs)
        {
            response.Items.Add(ToProto(doc));
        }
        response.Success = true;
        return response;
    }

    // ── Get ───────────────────────────────────────────────────────
    public override async Task<DanhMucChuyenNganhGetResponse> Get(
        DanhMucChuyenNganhGetRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColDanhMucChuyenNganh);

        var doc = await col.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
            .FirstOrDefaultAsync();

        if (doc == null)
        {
            return new DanhMucChuyenNganhGetResponse
            {
                Success = false,
                Message = "Không tìm thấy danh mục chuyên ngành"
            };
        }

        return new DanhMucChuyenNganhGetResponse
        {
            Item = ToProto(doc),
            Success = true
        };
    }

    // ── Save ──────────────────────────────────────────────────────
    public override async Task<DanhMucChuyenNganhSaveResponse> Save(
        DanhMucChuyenNganhSaveRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColDanhMucChuyenNganh);
        var userName = context.GetUserName() ?? "";
        var now = DateTime.UtcNow;
        var isNew = request.IsNew;

        var id = request.Item.Id;
        if (string.IsNullOrEmpty(id) && isNew)
        {
            return new DanhMucChuyenNganhSaveResponse { Success = false, Message = "Id không được để trống" };
        }

        if (isNew)
        {
            var doc = new BsonDocument
            {
                { "_id", id },
                { "Ten", request.Item.Ten },
                { "VietTat", (BsonValue)request.Item.VietTat ?? BsonNull.Value },
                { "ThuTu", request.Item.ThuTu },
                { "NguoiTao", userName },
                { "NguoiSua", userName },
                { "NgayTao", now },
                { "NgaySua", now },
            };
            await col.InsertOneAsync(doc);
        }
        else
        {
            var update = Builders<BsonDocument>.Update
                .Set("Ten", request.Item.Ten)
                .Set("VietTat", (BsonValue)request.Item.VietTat ?? BsonNull.Value)
                .Set("ThuTu", request.Item.ThuTu)
                .Set("NguoiSua", userName)
                .Set("NgaySua", now);

            await col.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", id),
                update);
        }

        return new DanhMucChuyenNganhSaveResponse
        {
            Id = id,
            Success = true,
            Message = isNew ? "Tạo mới thành công" : "Cập nhật thành công"
        };
    }

    // ── Delete ─────────────────────────────────────────────────────
    public override async Task<DanhMucChuyenNganhDeleteResponse> Delete(
        DanhMucChuyenNganhDeleteRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColDanhMucChuyenNganh);

        var doc = await col.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
            .FirstOrDefaultAsync();

        if (doc == null)
        {
            return new DanhMucChuyenNganhDeleteResponse
            {
                Success = false,
                Message = "Không tìm thấy danh mục chuyên ngành"
            };
        }

        var result = await col.DeleteOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", request.Id));

        return new DanhMucChuyenNganhDeleteResponse
        {
            Success = result.DeletedCount > 0,
            Message = result.DeletedCount > 0 ? "Xóa thành công" : "Xóa thất bại",
            IdsDeleted = request.Id
        };
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static DanhMucChuyenNganh ToProto(BsonDocument doc)
    {
        var item = new DanhMucChuyenNganh
        {
            Id = doc.IdString(),
            ThuTu = doc.IntOr("ThuTu"),
            NgayTao = doc.DateTimeOr("NgayTao")?.ToTimestamp(),
            NgaySua = doc.DateTimeOr("NgaySua")?.ToTimestamp()
        };

        item.Ten = doc.StringOr("Ten");
        item.VietTat = doc.StringOr("VietTat");
        item.NguoiTao = doc.StringOr("NguoiTao");
        item.NguoiSua = doc.StringOr("NguoiSua");

        return item;
    }
}
