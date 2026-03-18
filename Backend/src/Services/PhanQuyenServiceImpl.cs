using Backend.Converter;
using Backend.Utils;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

[Authorize]
public class PhanQuyenServiceImpl(
    ILogger<PhanQuyenServiceImpl> logger,
    RebuildService  rebuildService,
    RebuildQueue    rebuildQueue)
    : PhanQuyenService.PhanQuyenServiceBase
{
    // ── Collection names (khớp migration_scope_v1.js) ──────────────
    private const string ColNguoiDungNhomND         = "NguoiDungNhomNguoiDung";
    private const string ColPhanQuyenPhanHeND        = "PhanQuyenPhanHeNguoiDung";
    private const string ColPhanQuyenPhanHeNhomND    = "PhanQuyenPhanHeNhomNguoiDung";
    private const string ColPhanQuyenND              = "PhanQuyenNguoiDung";
    private const string ColPhanQuyenNhomND          = "PhanQuyenNhomNguoiDung";
    private const string ColPhanQuyenNDNganhDoc      = "PhanQuyenNguoiDungNganhDoc";
    private const string ColPhanQuyenNhomNDNganhDoc  = "PhanQuyenNhomNguoiDungNganhDoc";
    private const string ColEmployee                 = "Employee";
    private const string ColUserPermission           = "UserPermission";

    public override async Task<GetMyPermissionsResponse> GetMyPermissions(
        GetMyPermissionsRequest request, ServerCallContext context)
    {
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId))
            throw new RpcException(new Grpc.Core.Status(Grpc.Core.StatusCode.Unauthenticated, "UserID not found"));

        // superadmin / admin → full access
        var userName = context.GetUserName();
        if (userName == "superadmin" || userName == "admin")
            return new GetMyPermissionsResponse { ScopeType = "admin" };

        var db = Global.MongoDB!;

        // ✅ Single query from precomputed cache
        var permDoc = await db.GetCollection<BsonDocument>(ColUserPermission)
            .Find(Builders<BsonDocument>.Filter.Eq("_id", userId))
            .FirstOrDefaultAsync();

        if (permDoc == null)
        {
            // First login or never rebuilt → synchronous fallback
            await rebuildService.RebuildForUser(userId);
            permDoc = await db.GetCollection<BsonDocument>(ColUserPermission)
                .Find(Builders<BsonDocument>.Filter.Eq("_id", userId))
                .FirstOrDefaultAsync();
        }

        if (permDoc == null)
            return new GetMyPermissionsResponse { ScopeType = "SUBTREE" };

        return MapToResponse(permDoc);
    }

    private static GetMyPermissionsResponse MapToResponse(BsonDocument doc)
    {
        var response = new GetMyPermissionsResponse
        {
            ScopeType       = SafeStr(doc, "ScopeType", "SUBTREE"),
            AnchorNodeId    = SafeStr(doc, "AnchorNodeId"),
            AnchorParentId  = SafeStr(doc, "AnchorParentId"),
        };

        // DELEGATED extras
        var hetHanTs = CommonUtils.BsonToTs(doc.GetValue("NgayHetHan", BsonNull.Value));
        if (hetHanTs != null)  response.NgayHetHan = hetHanTs;
        var uyQuyen = SafeStr(doc, "IdNguoiUyQuyen");
        if (!string.IsNullOrEmpty(uyQuyen)) response.IdNguoiUyQuyen = uyQuyen;

        // BY_ATTRIBUTE extras
        var attrBson = doc.GetValue("ScopeAttribute", BsonNull.Value);
        if (!attrBson.IsBsonNull && attrBson.IsBsonDocument)
        {
            var ad = attrBson.AsBsonDocument;
            response.ScopeAttribute = new protos.ScopeAttribute
            {
                Field = SafeStr(ad, "Field"),
                Value = SafeStr(ad, "Value"),
            };
        }

        // PhanHe
        var phanHeArr = doc.GetValue("PhanHe", BsonNull.Value);
        if (phanHeArr.IsBsonArray)
        {
            foreach (var item in phanHeArr.AsBsonArray)
            {
                if (!item.IsBsonDocument) continue;
                var d = item.AsBsonDocument;
                response.PhanHe.Add(new PhanHeAccess
                {
                    MaPhanHe    = SafeStr(d, "MaPhanHe"),
                    DuocTruyCap = d.GetValue("DuocTruyCap", false).AsBoolean,
                    DuocQuanTri = d.GetValue("DuocQuanTri", false).AsBoolean,
                });
            }
        }

        // ChucNang
        var chucNangArr = doc.GetValue("ChucNang", BsonNull.Value);
        if (chucNangArr.IsBsonArray)
        {
            foreach (var item in chucNangArr.AsBsonArray)
            {
                if (!item.IsBsonDocument) continue;
                var d = item.AsBsonDocument;
                response.ChucNang.Add(new ChucNangAccess
                {
                    MaChucNang = SafeStr(d, "MaChucNang"),
                    MaPhanHe   = SafeStr(d, "MaPhanHe"),
                    Actions    = ParseActions(d),
                });
            }
        }

        // NganhDocIds
        var nganhArr = doc.GetValue("NganhDocIds", BsonNull.Value);
        if (nganhArr.IsBsonArray)
        {
            foreach (var item in nganhArr.AsBsonArray)
                if (item.IsString && !string.IsNullOrEmpty(item.AsString))
                    response.NganhDocIds.Add(item.AsString);
        }

        return response;
    }

    // ── Helpers ────────────────────────────────────────────────────

    private static string NormalizeScopeType(string raw) => raw.ToUpperInvariant() switch
    {
        "SELF"               => "SELF",
        "NODEONLY"           => "NODE_ONLY",
        "NODE_ONLY"          => "NODE_ONLY",
        "NODEANDCHILDREN"    => "NODE_AND_CHILDREN",
        "NODE_AND_CHILDREN"  => "NODE_AND_CHILDREN",
        "SUBTREE"            => "SUBTREE",
        "SIBLINGS"           => "SIBLINGS",
        "BRANCH"             => "BRANCH",
        "MULTINODE"          => "MULTI_NODE",
        "MULTI_NODE"         => "MULTI_NODE",
        "DELEGATED"          => "DELEGATED",
        "ALL"                => "ALL",
        "BYATTRIBUTE"        => "BY_ATTRIBUTE",
        "BY_ATTRIBUTE"       => "BY_ATTRIBUTE",
        var other            => other,
    };

    private static ActionsMap ParseActions(BsonDocument doc)
    {
        var actions = new ActionsMap();
        var actionsVal = doc.GetValue("Actions", BsonNull.Value);
        if (actionsVal == BsonNull.Value || !actionsVal.IsBsonDocument)
            return actions;

        var a = actionsVal.AsBsonDocument;
        actions.View     = a.GetValue("view",     false).AsBoolean;
        actions.Add      = a.GetValue("add",      false).AsBoolean;
        actions.Edit     = a.GetValue("edit",      false).AsBoolean;
        actions.Delete   = a.GetValue("delete",   false).AsBoolean;
        actions.Approve  = a.GetValue("approve",  false).AsBoolean;
        actions.Download = a.GetValue("download", false).AsBoolean;
        actions.Print    = a.GetValue("print",    false).AsBoolean;
        return actions;
    }

    private static void MergeActions(ActionsMap? target, ActionsMap source)
    {
        if (target == null) return;
        if (source.View)     target.View     = true;
        if (source.Add)      target.Add      = true;
        if (source.Edit)     target.Edit     = true;
        if (source.Delete)   target.Delete   = true;
        if (source.Approve)  target.Approve  = true;
        if (source.Download) target.Download = true;
        if (source.Print)    target.Print    = true;
    }

    // ── Const for NhomNguoiDung collection ─────────────────────────
    private const string ColNhomNguoiDung = "NhomNguoiDung";

    // ── Helpers ────────────────────────────────────────────────────

    private static NhomNguoiDung ToNhomProto(BsonDocument doc, int userCount) => new()
    {
        Id           = doc["_id"].ToString()!,
        Ten          = SafeStr(doc, "Ten"),
        MoTa         = SafeStr(doc, "MoTa"),
        IsDefault    = doc.GetValue("IsDefault", false).AsBoolean,
        Color        = SafeStr(doc, "Color", "#64748b"),
        Loai         = SafeStr(doc, "Loai", "Custom"),
        ClonedFromId = SafeStr(doc, "ClonedFromId"),
        ScopeType    = SafeStr(doc, "ScopeType", "SUBTREE"),
        UserCount    = userCount,
    };



    // Returns fallback for: null doc, missing key, or explicitly-null BSON fields.
    private static string SafeStr(BsonDocument? doc, string key, string fallback = "")
    {
        if (doc == null) return fallback;
        var v = doc.GetValue(key, BsonNull.Value);
        return (v == BsonNull.Value || v.IsBsonNull) ? fallback : v.AsString;
    }

    
    private static BsonValue ParseId(string id) =>
        ObjectId.TryParse(id, out var oid) ? (BsonValue)oid : new BsonString(id);

    private async Task CloneGroupPermissions(IMongoDatabase db, string fromId, string toId, string userName)
    {
        var pqCol = db.GetCollection<BsonDocument>(ColPhanQuyenNhomND);
        var sourceDocs = await pqCol.Find(
            Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", fromId)).ToListAsync();

        var now = DateTime.UtcNow;
        var clones = sourceDocs.Select(d => {
            var c = d.DeepClone().AsBsonDocument;
            c["_id"]              = Guid.NewGuid().ToString();
            c["IdNhomNguoiDung"] = toId;
            c["NguoiTao"]        = userName;
            c["NgayTao"]         = now;
            return c;
        }).ToList();

        if (clones.Count > 0)
            await pqCol.InsertManyAsync(clones);
    }

    // ── ListNhomNguoiDung ──────────────────────────────────────────

    public override async Task<ListNhomNguoiDungResponse> ListNhomNguoiDung(
        ListNhomNguoiDungRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var nhomCol   = db.GetCollection<BsonDocument>(ColNhomNguoiDung);
        var memberCol = db.GetCollection<BsonDocument>(ColNguoiDungNhomND);

        // Aggregate user count per group in one query
        var countAgg = new BsonDocument[]
        {
            new("$group", new BsonDocument
            {
                { "_id",   "$IdNhomNguoiDung" },
                { "count", new BsonDocument("$sum", 1) },
            })
        };

        // Fire both queries in parallel
        var nhomsTask = nhomCol.Find(FilterDefinition<BsonDocument>.Empty).ToListAsync();
        var countTask = memberCol.Aggregate<BsonDocument>(countAgg).ToListAsync();
        await Task.WhenAll(nhomsTask, countTask);
        var nhoms     = nhomsTask.Result;
        var countRows = countTask.Result;
        var countMap  = countRows.ToDictionary(
            r => r["_id"].IsBsonNull ? "" : r["_id"].AsString,
            r => r["count"].AsInt32);

        var response = new ListNhomNguoiDungResponse();
        foreach (var doc in nhoms)
        {
            var id = doc["_id"].ToString()!;
            response.Items.Add(ToNhomProto(doc, countMap.TryGetValue(id, out var cnt) ? cnt : 0));
        }
        return response;
    }

    // ── SaveNhomNguoiDung ──────────────────────────────────────────

    public override async Task<NhomNguoiDung> SaveNhomNguoiDung(
        SaveNhomNguoiDungRequest request, ServerCallContext context)
    {
        var db       = Global.MongoDB!;
        var nhomCol  = db.GetCollection<BsonDocument>(ColNhomNguoiDung);
        var userName = context.GetUserName() ?? "";
        var now      = DateTime.UtcNow;
        var isNew    = string.IsNullOrEmpty(request.Id);
        var id       = isNew ? Guid.NewGuid().ToString() : request.Id;

        if (isNew)
        {
            var doc = new BsonDocument
            {
                { "_id",          id },
                { "Ten",          request.Ten },
                { "MoTa",         request.MoTa },
                { "Color",        request.Color },
                { "Loai",         string.IsNullOrEmpty(request.Loai) ? "Custom" : request.Loai },
                { "ClonedFromId", request.ClonedFromId },
                { "ScopeType",    "SUBTREE" },
                { "IsDefault",    false },
                { "NguoiTao",     userName },
                { "NgayTao",      now },
                { "NguoiSua",     userName },
                { "NgaySua",      now },
            };
            await nhomCol.InsertOneAsync(doc);

            if (!string.IsNullOrEmpty(request.ClonedFromId))
                await CloneGroupPermissions(db, request.ClonedFromId, id, userName);
        }
        else
        {
            var update = Builders<BsonDocument>.Update
                .Set("Ten",      request.Ten)
                .Set("MoTa",     request.MoTa)
                .Set("Color",    request.Color)
                .Set("NguoiSua", userName)
                .Set("NgaySua",  now);
            await nhomCol.UpdateOneAsync(Builders<BsonDocument>.Filter.Eq("_id", ParseId(id)), update);
        }

        var saved = await nhomCol.Find(Builders<BsonDocument>.Filter.Eq("_id", ParseId(id))).FirstOrDefaultAsync();
        return ToNhomProto(saved, 0);
    }

    // ── DeleteNhomNguoiDung ────────────────────────────────────────

    public override async Task<DeleteResponse> DeleteNhomNguoiDung(
        DeleteRequest request, ServerCallContext context)
    {
        var db      = Global.MongoDB!;
        var nhomCol = db.GetCollection<BsonDocument>(ColNhomNguoiDung);

        var doc = await nhomCol.Find(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.Id)))
                               .FirstOrDefaultAsync();
        if (doc == null)
            return new DeleteResponse { Success = false, Message = "Không tìm thấy nhóm" };
        if (doc.GetValue("Loai", "Custom").AsString == "System")
            return new DeleteResponse { Success = false, Message = "Không thể xóa nhóm hệ thống" };

        // Get affected users BEFORE cascade delete (for rebuild trigger)
        var fId = Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.Id);
        var affectedUsers = (await db.GetCollection<BsonDocument>(ColNguoiDungNhomND)
            .Find(fId)
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .ToListAsync())
            .Select(d => SafeStr(d, "IdNguoiDung"))
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();

        // Cascade delete — all 4 independent → parallel
        await Task.WhenAll(
            nhomCol.DeleteOneAsync(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.Id))),
            db.GetCollection<BsonDocument>(ColNguoiDungNhomND).DeleteManyAsync(fId),
            db.GetCollection<BsonDocument>(ColPhanQuyenNhomND).DeleteManyAsync(fId),
            db.GetCollection<BsonDocument>(ColPhanQuyenPhanHeNhomND).DeleteManyAsync(fId));

        // Trigger rebuild for affected users
        rebuildQueue.EnqueueGroup(affectedUsers);

        return new DeleteResponse { Success = true };
    }

    // ── GetGroupPermissions ────────────────────────────────────────

    public override async Task<GetGroupPermissionsResponse> GetGroupPermissions(
        GetGroupPermissionsRequest request, ServerCallContext context)
    {
        var db    = Global.MongoDB!;
        var pqCol = db.GetCollection<BsonDocument>(ColPhanQuyenNhomND);

        var P = Builders<BsonDocument>.Projection;

        // Fire both queries in parallel with projection
        var docsTask = pqCol.Find(
            Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.IdNhom))
            .Project(P.Include("MaChucNang"))
            .ToListAsync();
        var nhomTask = db.GetCollection<BsonDocument>(ColNhomNguoiDung)
            .Find(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.IdNhom)))
            .Project(P.Include("ScopeType"))
            .FirstOrDefaultAsync();
        await Task.WhenAll(docsTask, nhomTask);

        var response = new GetGroupPermissionsResponse();
        foreach (var doc in docsTask.Result)
        {
            var code = doc.GetValue("MaChucNang", "").AsString;
            if (!string.IsNullOrEmpty(code))
                response.CheckedCodes.Add(code);
        }

        var nhomDoc = nhomTask.Result;
        response.ScopeType = nhomDoc?.GetValue("ScopeType", "SUBTREE").AsString ?? "SUBTREE";

        return response;
    }

    // ── SaveGroupPermissions ───────────────────────────────────────

    public override async Task<DeleteResponse> SaveGroupPermissions(
        SaveGroupPermissionsRequest request, ServerCallContext context)
    {
        var db       = Global.MongoDB!;
        var pqCol    = db.GetCollection<BsonDocument>(ColPhanQuyenNhomND);
        var F        = Builders<BsonDocument>.Filter;
        var userName = context.GetUserName() ?? "";
        var now      = DateTime.UtcNow;

        // Atomic BulkWrite: delete old codes not in new set + upsert new codes
        var bulkOps = new List<WriteModel<BsonDocument>>();

        // 1) Delete all existing codes for this group that are NOT in the new set
        bulkOps.Add(new DeleteManyModel<BsonDocument>(
            F.And(F.Eq("IdNhomNguoiDung", request.IdNhom),
                  F.Nin("MaChucNang", request.CheckedCodes))));

        // 2) Upsert each new code (idempotent, no data loss on crash)
        foreach (var code in request.CheckedCodes)
        {
            var filter = F.And(
                F.Eq("IdNhomNguoiDung", request.IdNhom),
                F.Eq("MaChucNang", code));
            var replacement = new BsonDocument
            {
                { "_id",              Guid.NewGuid().ToString() },
                { "IdNhomNguoiDung", request.IdNhom },
                { "MaChucNang",      code },
                { "Actions",         new BsonDocument { { "view", true } } },
                { "NguoiTao",        userName },
                { "NgayTao",         now },
            };
            bulkOps.Add(new ReplaceOneModel<BsonDocument>(filter, replacement) { IsUpsert = true });
        }

        // BulkWrite + ScopeType update — independent, run in parallel
        var bulkTask = pqCol.BulkWriteAsync(bulkOps);

        Task? scopeTask = null;
        if (!string.IsNullOrEmpty(request.ScopeType))
        {
            scopeTask = db.GetCollection<BsonDocument>(ColNhomNguoiDung).UpdateOneAsync(
                F.Eq("_id", ParseId(request.IdNhom)),
                Builders<BsonDocument>.Update.Set("ScopeType", request.ScopeType));
        }

        await bulkTask;
        if (scopeTask != null) await scopeTask;

        // Trigger rebuild for all users in this group
        var affectedUserIds = (await db.GetCollection<BsonDocument>(ColNguoiDungNhomND)
            .Find(F.Eq("IdNhomNguoiDung", request.IdNhom))
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .ToListAsync())
            .Select(d => SafeStr(d, "IdNguoiDung"))
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();
        rebuildQueue.EnqueueGroup(affectedUserIds);

        return new DeleteResponse { Success = true };
    }

    // ── ListGroupUsers ─────────────────────────────────────────────

    public override async Task<ListGroupUsersResponse> ListGroupUsers(
        ListGroupUsersRequest request, ServerCallContext context)
    {
        var db        = Global.MongoDB!;
        var memberCol = db.GetCollection<BsonDocument>(ColNguoiDungNhomND);

        // Single aggregation pipeline: $match → $lookup Employee → $project (1 round-trip)
        var uidToOid = new BsonDocument("$convert", new BsonDocument
            { { "input", "$IdNguoiDung" }, { "to", "objectId" }, { "onError", "$IdNguoiDung" } });

        var pipeline = new BsonDocument[]
        {
            new("$match", new BsonDocument("IdNhomNguoiDung", request.IdNhom)),
            new("$lookup", new BsonDocument
            {
                { "from", ColEmployee },
                { "let", new BsonDocument("uidOid", uidToOid) },
                { "pipeline", new BsonArray
                    {
                        new BsonDocument("$match", new BsonDocument(
                            "$expr", new BsonDocument("$eq", new BsonArray { "$_id", "$$uidOid" }))),
                        new BsonDocument("$project", new BsonDocument { { "HoVaTen", 1 }, { "IdDonVi", 1 } }),
                    }
                },
                { "as", "emp" },
            }),
            new("$unwind", new BsonDocument
                { { "path", "$emp" }, { "preserveNullAndEmptyArrays", true } }),
            new("$project", new BsonDocument
            {
                { "IdNguoiDung", 1 }, { "ScopeType", 1 }, { "IdDonViScope", 1 },
                { "ScopeAttribute", 1 }, { "NgayHetHan", 1 }, { "emp", 1 },
            }),
        };

        var docs = await memberCol.Aggregate<BsonDocument>(pipeline).ToListAsync();

        var response = new ListGroupUsersResponse();
        foreach (var doc in docs)
        {
            var userId = SafeStr(doc, "IdNguoiDung");
            var emp = doc.Contains("emp") && doc["emp"].IsBsonDocument ? doc["emp"].AsBsonDocument : null;

            var hetHanBson = doc.GetValue("NgayHetHan", BsonNull.Value);
            var isExpired  = false;
            Google.Protobuf.WellKnownTypes.Timestamp? hetHanTs = null;
            if (hetHanBson != BsonNull.Value && !hetHanBson.IsBsonNull)
            {
                var dt = hetHanBson.ToUniversalTime();
                isExpired = dt < DateTime.UtcNow;
                hetHanTs  = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(dt);
            }

            var item = new UserInGroup
            {
                IdAssignment  = doc["_id"].ToString()!,
                IdNguoiDung   = userId,
                HoTen         = SafeStr(emp, "HoVaTen", userId),
                DonVi         = SafeStr(emp, "IdDonVi"),
                ScopeType     = SafeStr(doc, "ScopeType"),
                AnchorNodeId  = SafeStr(doc, "IdDonViScope"),
                IsExpired     = isExpired,
            };
            if (hetHanTs != null) item.NgayHetHan = hetHanTs;
            var attrBson = doc.GetValue("ScopeAttribute", BsonNull.Value);
            if (!attrBson.IsBsonNull && attrBson.IsBsonDocument)
            {
                var ad = attrBson.AsBsonDocument;
                item.ScopeAttribute = new protos.ScopeAttribute
                {
                    Field = SafeStr(ad, "Field"),
                    Value = SafeStr(ad, "Value"),
                };
            }
            response.Users.Add(item);
        }
        return response;
    }

    // ── ListAllAssignments ─────────────────────────────────────────

    public override async Task<ListAllAssignmentsResponse> ListAllAssignments(
        ListAllAssignmentsRequest request, ServerCallContext context)
    {
        var db        = Global.MongoDB!;
        var memberCol = db.GetCollection<BsonDocument>(ColNguoiDungNhomND);

        // Single pipeline: double $lookup (NhomNguoiDung + Employee) → 1 round-trip
        var uidToOid = new BsonDocument("$convert", new BsonDocument
            { { "input", "$IdNguoiDung" }, { "to", "objectId" }, { "onError", "$IdNguoiDung" } });

        var page     = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 ? request.PageSize : 50;

        // Count total (lightweight — no $lookup)
        var countTask = memberCol.CountDocumentsAsync(FilterDefinition<BsonDocument>.Empty);

        var pipeline = new BsonDocument[]
        {
            new("$sort",  new BsonDocument("NgayTao", -1)),
            new("$skip",  (page - 1) * pageSize),
            new("$limit", pageSize),
            // $lookup NhomNguoiDung (string ↔ string)
            new("$lookup", new BsonDocument
            {
                { "from", ColNhomNguoiDung },
                { "localField", "IdNhomNguoiDung" },
                { "foreignField", "_id" },
                { "pipeline", new BsonArray
                    { new BsonDocument("$project", new BsonDocument { { "Ten", 1 }, { "Color", 1 } }) }
                },
                { "as", "nhom" },
            }),
            // $lookup Employee (string → ObjectId)
            new("$lookup", new BsonDocument
            {
                { "from", ColEmployee },
                { "let", new BsonDocument("uidOid", uidToOid) },
                { "pipeline", new BsonArray
                    {
                        new BsonDocument("$match", new BsonDocument(
                            "$expr", new BsonDocument("$eq", new BsonArray { "$_id", "$$uidOid" }))),
                        new BsonDocument("$project", new BsonDocument { { "HoVaTen", 1 }, { "IdDonVi", 1 } }),
                    }
                },
                { "as", "emp" },
            }),
            new("$unwind", new BsonDocument
                { { "path", "$nhom" }, { "preserveNullAndEmptyArrays", true } }),
            new("$unwind", new BsonDocument
                { { "path", "$emp" }, { "preserveNullAndEmptyArrays", true } }),
            new("$project", new BsonDocument
            {
                { "IdNguoiDung", 1 }, { "IdNhomNguoiDung", 1 },
                { "ScopeType", 1 }, { "IdDonViScope", 1 }, { "ScopeAttribute", 1 },
                { "Loai", 1 }, { "NgayTao", 1 }, { "NgayHetHan", 1 },
                { "nhom", 1 }, { "emp", 1 },
            }),
        };

        var docsTask = memberCol.Aggregate<BsonDocument>(pipeline).ToListAsync();
        await Task.WhenAll(countTask, docsTask);
        var docs = docsTask.Result;

        var response = new ListAllAssignmentsResponse();
        foreach (var doc in docs)
        {
            var userId = SafeStr(doc, "IdNguoiDung");
            var nhomId = SafeStr(doc, "IdNhomNguoiDung");
            var emp  = doc.Contains("emp")  && doc["emp"].IsBsonDocument  ? doc["emp"].AsBsonDocument  : null;
            var nhom = doc.Contains("nhom") && doc["nhom"].IsBsonDocument ? doc["nhom"].AsBsonDocument : null;

            var detail = new AssignmentDetail
            {
                Id             = doc["_id"].ToString()!,
                IdNguoiDung    = userId,
                HoTen          = SafeStr(emp, "HoVaTen", userId),
                DonVi          = SafeStr(emp, "IdDonVi"),
                IdNhom         = nhomId,
                TenNhom        = SafeStr(nhom, "Ten", nhomId),
                ColorNhom      = SafeStr(nhom, "Color", "#64748b"),
                ScopeType      = SafeStr(doc, "ScopeType"),
                AnchorNodeId   = SafeStr(doc, "IdDonViScope"),
                AnchorNodeName = "",
                Loai           = SafeStr(doc, "Loai", "Direct"),
            };
            var detailAttrBson = doc.GetValue("ScopeAttribute", BsonNull.Value);
            if (!detailAttrBson.IsBsonNull && detailAttrBson.IsBsonDocument)
            {
                var ad = detailAttrBson.AsBsonDocument;
                detail.ScopeAttribute = new protos.ScopeAttribute
                {
                    Field = SafeStr(ad, "Field"),
                    Value = SafeStr(ad, "Value"),
                };
            }

            var ngayTaoTs = CommonUtils.BsonToTs(doc.GetValue("NgayTao",   BsonNull.Value));
            var hetHanTs  = CommonUtils.BsonToTs(doc.GetValue("NgayHetHan", BsonNull.Value));
            if (ngayTaoTs != null)  detail.NgayTao    = ngayTaoTs;
            if (hetHanTs  != null)  detail.NgayHetHan = hetHanTs;

            response.Items.Add(detail);
        }
        response.TotalCount = (int)countTask.Result;
        return response;
    }

    // ── AssignUserToGroup ──────────────────────────────────────────

    public override async Task<NguoiDungNhomNguoiDung> AssignUserToGroup(
        AssignUserRequest request, ServerCallContext context)
    {
        var db        = Global.MongoDB!;
        var memberCol = db.GetCollection<BsonDocument>(ColNguoiDungNhomND);
        var userName  = context.GetUserName() ?? "";
        var now       = DateTime.UtcNow;

        var existing = await memberCol.Find(Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("IdNguoiDung",     request.IdNguoiDung),
            Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.IdNhom)
        )).FirstOrDefaultAsync();

        string assignId;
        if (existing != null)
        {
            assignId = existing["_id"].ToString()!;
            var updAttr = request.ScopeAttribute != null
                ? (BsonValue)new BsonDocument { { "Field", request.ScopeAttribute.Field }, { "Value", request.ScopeAttribute.Value } }
                : BsonNull.Value;
            await memberCol.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", ParseId(assignId)),
                Builders<BsonDocument>.Update
                    .Set("ScopeType",        NormalizeScopeType(request.ScopeType))
                    .Set("IdDonViScope",     request.AnchorNodeId)
                    .Set("Loai",             request.Loai)
                    .Set("IdNguoiUyQuyen",   request.IdNguoiUyQuyen)
                    .Set("ScopeAttribute",   updAttr)
                    .Set("NguoiSua",         userName)
                    .Set("NgaySua",          now));
        }
        else
        {
            assignId = Guid.NewGuid().ToString();
            var scopeAttrDoc = request.ScopeAttribute != null
                ? new BsonDocument { { "Field", request.ScopeAttribute.Field }, { "Value", request.ScopeAttribute.Value } }
                : (BsonValue)BsonNull.Value;
            var doc = new BsonDocument
            {
                { "_id",             assignId },
                { "IdNguoiDung",     request.IdNguoiDung },
                { "IdNhomNguoiDung", request.IdNhom },
                { "ScopeType",       NormalizeScopeType(request.ScopeType) },
                { "IdDonViScope",    request.AnchorNodeId },
                { "Loai",            string.IsNullOrEmpty(request.Loai) ? "Direct" : request.Loai },
                { "IdNguoiUyQuyen",  request.IdNguoiUyQuyen },
                { "ScopeAttribute",  scopeAttrDoc },
                { "NguoiTao",        userName },
                { "NgayTao",         now },
                { "NguoiSua",        userName },
                { "NgaySua",         now },
            };
            if (request.NgayHetHan != null)
                doc["NgayHetHan"] = request.NgayHetHan.ToDateTime();
            await memberCol.InsertOneAsync(doc);
        }

        // Trigger rebuild for this user
        rebuildQueue.Enqueue(request.IdNguoiDung);

        return new NguoiDungNhomNguoiDung
        {
            Id              = assignId,
            IdNguoiDung     = request.IdNguoiDung,
            IdNhomNguoiDung = request.IdNhom,
            Loai            = request.Loai,
            NguoiTao        = userName,
        };
    }

    // ── RemoveUserFromGroup ────────────────────────────────────────

    public override async Task<DeleteResponse> RemoveUserFromGroup(
        RemoveUserRequest request, ServerCallContext context)
    {
        var db = Global.MongoDB!;
        var memberCol = db.GetCollection<BsonDocument>(ColNguoiDungNhomND);

        // Read userId BEFORE delete (needed for rebuild trigger)
        var assignDoc = await memberCol
            .Find(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.IdAssignment)))
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .FirstOrDefaultAsync();

        var result = await memberCol
            .DeleteOneAsync(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.IdAssignment)));

        // Trigger rebuild
        if (result.DeletedCount > 0 && assignDoc != null)
            rebuildQueue.Enqueue(SafeStr(assignDoc, "IdNguoiDung"));

        return new DeleteResponse
        {
            Success = result.DeletedCount > 0,
            Message = result.DeletedCount > 0 ? "" : "Không tìm thấy bản ghi",
        };
    }
}
