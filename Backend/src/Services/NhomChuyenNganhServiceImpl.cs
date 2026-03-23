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
public class NhomChuyenNganhServiceImpl : NhomChuyenNganhService.NhomChuyenNganhServiceBase
{
    private const string ColNhomChuyenNganh = "NhomChuyenNganh";

    // ── GetList ───────────────────────────────────────────────────
    public override async Task<NhomChuyenNganhListResponse> GetList(
        NhomChuyenNganhListRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColNhomChuyenNganh);

        var filters = new List<FilterDefinition<BsonDocument>>();

        // Search text - using direct string property (not wrapper)
        if (!string.IsNullOrEmpty(request.SearchText))
        {
            var search = request.SearchText;
            filters.Add(Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Regex("_id", new BsonRegularExpression(search, "i")),
                Builders<BsonDocument>.Filter.Regex("Ten", new BsonRegularExpression(search, "i"))));
        }

        // KichHoat filter - using direct bool property
        if (request.KichHoat.HasValue)
        {
            filters.Add(Builders<BsonDocument>.Filter.Eq("KichHoat", request.KichHoat.Value));
        }

        var filter = filters.Count > 0
            ? Builders<BsonDocument>.Filter.And(filters)
            : FilterDefinition<BsonDocument>.Empty;

        var docs = await col.Find(filter).ToListAsync();

        var response = new NhomChuyenNganhListResponse();
        foreach (var doc in docs)
        {
            response.Items.Add(ToProto(doc));
        }
        response.Success = true;
        return response;
    }

    // ── Get ───────────────────────────────────────────────────────
    public override async Task<NhomChuyenNganhGetResponse> Get(
        NhomChuyenNganhGetRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColNhomChuyenNganh);

        var doc = await col.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
            .FirstOrDefaultAsync();

        if (doc == null)
        {
            return new NhomChuyenNganhGetResponse
            {
                Success = false,
                Message = "Không tìm thấy nhóm chuyên ngành"
            };
        }

        return new NhomChuyenNganhGetResponse
        {
            Item = ToProto(doc),
            Success = true
        };
    }

    // ── Save ──────────────────────────────────────────────────────
    public override async Task<NhomChuyenNganhSaveResponse> Save(
        NhomChuyenNganhSaveRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColNhomChuyenNganh);
        var userName = context.GetUserName() ?? "";
        var now = DateTime.UtcNow;
        var isNew = request.IsNew;

        var id = isNew ? Guid.NewGuid().ToString() : request.Item.Id;

        if (isNew)
        {
            var doc = new BsonDocument
            {
                { "_id", id },
                { "Ten", request.Item.Ten },
                { "MoTa", request.Item.MoTa },
                { "DanhSachCn", new BsonArray(request.Item.DanhSachCn.ToList()) },
                { "KichHoat", request.Item.KichHoat },
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
                .Set("MoTa", request.Item.MoTa)
                .Set("DanhSachCn", new BsonArray(request.Item.DanhSachCn.ToList()))
                .Set("KichHoat", request.Item.KichHoat)
                .Set("NguoiSua", userName)
                .Set("NgaySua", now);

            await col.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", id),
                update);
        }

        return new NhomChuyenNganhSaveResponse
        {
            Id = id,
            Success = true,
            Message = isNew ? "Tạo mới thành công" : "Cập nhật thành công"
        };
    }

    // ── Delete ─────────────────────────────────────────────────────
    public override async Task<NhomChuyenNganhDeleteResponse> Delete(
        NhomChuyenNganhDeleteRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var col = db.GetCollection<BsonDocument>(ColNhomChuyenNganh);

        // Kiểm tra tồn tại
        var doc = await col.Find(Builders<BsonDocument>.Filter.Eq("_id", request.Id))
            .FirstOrDefaultAsync();

        if (doc == null)
        {
            return new NhomChuyenNganhDeleteResponse
            {
                Success = false,
                Message = "Không tìm thấy nhóm chuyên ngành"
            };
        }

        // Xóa
        var result = await col.DeleteOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", request.Id));

        return new NhomChuyenNganhDeleteResponse
        {
            Success = result.DeletedCount > 0,
            Message = result.DeletedCount > 0 ? "Xóa thành công" : "Xóa thất bại",
            IdsDeleted = request.Id
        };
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static NhomChuyenNganh ToProto(BsonDocument doc)
    {
        var item = new NhomChuyenNganh
        {
            Id = doc.IdString(),
            KichHoat = doc.BoolOr("KichHoat"),
        };

        item.Ten = doc.StringOr("Ten");
        item.MoTa = doc.StringOr("MoTa");

        var dsCn = doc.ArrayOr("DanhSachCn");
        if (dsCn != null)
            item.DanhSachCn.AddRange(dsCn.Strings());

        return item;
    }
}
