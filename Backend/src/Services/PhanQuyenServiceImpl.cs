using Backend.Authorization;
using Backend.Converter;
using Backend.Common.Bson;
using Backend.Common.Protobuf;

using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;
using System.Text;
using System.Text.Json;

namespace Backend.Services;

[Authorize]
public class PhanQuyenServiceImpl(
    ILogger<PhanQuyenServiceImpl> _logger,
    RebuildService  rebuildService,
    RebuildQueue    rebuildQueue)
    : PhanQuyenService.PhanQuyenServiceBase
{
    // Read-model classification:
    // - Cache/read-model: GetMyPermissions
    // - Aggregate read-model: ListGroupUsers, ListAllAssignments
    // - Simple read: ListNhomNguoiDung, GetGroupPermissions
    // - Write path: SaveNhomNguoiDung, DeleteNhomNguoiDung, SaveGroupPermissions,
    //   AssignUserToGroup, RemoveUserFromGroup

    // ── Collection names (khớp migration_scope_v1.js) ──────────────

    public override async Task<GetPermissionCatalogResponse> GetPermissionCatalog(
        GetPermissionCatalogRequest request, ServerCallContext context)
    {
        var collection = Global.CollectionPermissionCatalog;
        var response = new GetPermissionCatalogResponse();
        if (collection == null)
            return response;

        var docs = await collection.Find(Builders<BsonDocument>.Filter.Eq("Active", true))
            .Sort(Builders<BsonDocument>.Sort.Ascending("GroupOrder").Ascending("Order").Ascending("Code"))
            .ToListAsync();

        foreach (var groupDocs in docs.GroupBy(doc => doc.StringOr("Group")))
        {
            var first = groupDocs.First();
            var group = new PermissionCatalogGroup
            {
                Group = first.StringOr("Group"),
                Icon = first.StringOr("Icon"),
            };

            foreach (var doc in groupDocs)
            {
                group.Permissions.Add(new PermissionCatalogItem
                {
                    Code = doc.StringOr("Code"),
                    Name = doc.StringOr("Name"),
                });
            }

            response.Items.Add(group);
        }

        return response;
    }

    public override async Task<GetMyPermissionsResponse> GetMyPermissions(
        GetMyPermissionsRequest request, ServerCallContext context)
    {
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId))
            throw new RpcException(new Grpc.Core.Status(Grpc.Core.StatusCode.Unauthenticated, "UserID not found"));

        // superadmin / admin → full access
        var userName = context.GetUserName();
        if (context.IsAdminAccount())
            return new GetMyPermissionsResponse { ScopeType = "admin" };

        var db = Global.MongoDB!;

        //  Single query from precomputed cache
        var permDoc = await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionCache)
            .Find(Builders<BsonDocument>.Filter.Eq("_id", userId))
            .FirstOrDefaultAsync();

        if (permDoc == null)
        {
            // First login or never rebuilt → synchronous fallback
            await rebuildService.RebuildForUser(userId);
            permDoc = await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionCache)
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
            ScopeType       = doc.StringOr("ScopeType", "SUBTREE"),
            AnchorNodeId    = doc.StringOr("AnchorNodeId"),
            AnchorParentId  = doc.StringOr("AnchorParentId"),
            IdDanhMucChuyenNganh = doc.StringOr("IdDanhMucChuyenNganh"),
        };

        // DELEGATED extras
        var hetHanTs = doc.TimestampOr("NgayHetHan");
        if (hetHanTs != null)  response.NgayHetHan = hetHanTs;
        var uyQuyen = doc.StringOr("IdNguoiUyQuyen");
        if (!string.IsNullOrEmpty(uyQuyen)) response.IdNguoiUyQuyen = uyQuyen;

        // PhanHe
        var phanHeArr = doc.ArrayOr("PhanHe");
        if (phanHeArr != null)
        {
            foreach (var d in phanHeArr.Documents())
            {
                response.PhanHe.Add(new PhanHeAccess
                {
                    MaPhanHe    = Global.NormalizeMaPhanHe(d.StringOr("MaPhanHe")),
                    DuocTruyCap = d.BoolOr("DuocTruyCap"),
                    DuocQuanTri = d.BoolOr("DuocQuanTri"),
                });
            }
        }

        // ChucNang
        var chucNangArr = doc.ArrayOr("ChucNang");
        if (chucNangArr != null)
        {
            foreach (var d in chucNangArr.Documents())
            {
                response.ChucNang.Add(new ChucNangAccess
                {
                    MaChucNang = d.StringOr("MaChucNang"),
                    MaPhanHe   = Global.NormalizeMaPhanHe(d.StringOr("MaPhanHe")),
                    Actions    = ParseActions(d),
                });
            }
        }

        // NganhDocIds
        var nganhArr = doc.ArrayOr("NganhDocIds");
        if (nganhArr != null)
        {
            response.NganhDocIds.AddRange(nganhArr.Strings().Where(item => !string.IsNullOrEmpty(item)));
        }

        // ActionsPerCN — from PhamViChuyenNganh cached doc (A4)
        var phamViDoc = doc.DocOr("PhamViChuyenNganh");
        if (phamViDoc != null)
        {
            var entries = phamViDoc.ArrayOr("IdChuyenNganhDoc");
            if (entries != null)
            {
                foreach (var entry in entries.Documents())
                {
                    var id = entry.StringOr("Id");
                    if (string.IsNullOrEmpty(id)) continue;
                    var cnAccess = new protos.ChuyenNganhAccess { IdChuyenNganh = id };
                    var actionArr = entry.ArrayOr("Actions");
                    if (actionArr != null)
                        cnAccess.Actions.AddRange(actionArr.Strings().Where(a => !string.IsNullOrEmpty(a)));
                    response.ActionsPerCn.Add(cnAccess);
                }
            }
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
        "BYATTRIBUTE"        => "SUBTREE",
        "BY_ATTRIBUTE"       => "SUBTREE",
        var other            => other,
    };

    private static ActionsMap ParseActions(BsonDocument doc)
        => PermissionActionHelpers.ToActionsMap(doc);

    private static void MergeActions(ActionsMap? target, ActionsMap source)
        => PermissionActionHelpers.MergeActions(target, source);

    // ── Const for NhomNguoiDung collection ─────────────────────────

    // ── Helpers ────────────────────────────────────────────────────

    private static NhomNguoiDung ToNhomProto(BsonDocument doc, int userCount) => new()
    {
        Id           = doc.IdString(),
        Ten          = doc.StringOr("Ten"),
        MoTa         = doc.StringOr("MoTa"),
        IsDefault    = doc.BoolOr("IsDefault"),
        Color        = doc.StringOr("Color", "#64748b"),
        Loai         = doc.StringOr("Loai", "Custom"),
        ClonedFromId = doc.StringOr("ClonedFromId"),
        ScopeType    = doc.StringOr("ScopeType", "SUBTREE"),
        UserCount    = userCount,
    };
    private static BsonValue ParseId(string id) =>
        ObjectId.TryParse(id, out var oid) ? (BsonValue)oid : new BsonString(id);

    private static List<string> NormalizeStringList(IEnumerable<string> values) =>
        values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

    private const string PhamViPayloadPrefix = "PV2::";

    private sealed record ParsedPhamViPayload(
        string IdChuyenNganh,
        BsonDocument? PhamViDoc,
        List<string> IdChuyenNganhDoc);

    private sealed class PhamViPayloadDto
    {
        public string? idChuyenNganh { get; set; }
        public List<PhamViEntryDto>? idChuyenNganhDoc { get; set; }
    }

    private sealed class PhamViEntryDto
    {
        public string? id { get; set; }
        public List<string>? actions { get; set; }
    }

    private static bool TryParsePhamViPayload(string raw, out ParsedPhamViPayload parsed)
    {
        parsed = new ParsedPhamViPayload("", null, new List<string>());
        if (string.IsNullOrWhiteSpace(raw) || !raw.StartsWith(PhamViPayloadPrefix, StringComparison.Ordinal))
            return false;

        try
        {
            var base64 = raw.Substring(PhamViPayloadPrefix.Length);
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(base64));
            var dto = JsonSerializer.Deserialize<PhamViPayloadDto>(json);
            if (dto == null || string.IsNullOrWhiteSpace(dto.idChuyenNganh) || dto.idChuyenNganhDoc == null)
                return false;

            var ownId = dto.idChuyenNganh.Trim();
            var usedIds = new HashSet<string>(StringComparer.Ordinal);
            var list = new BsonArray();

            foreach (var entry in dto.idChuyenNganhDoc)
            {
                if (entry == null || string.IsNullOrWhiteSpace(entry.id))
                    continue;
                var id = entry.id.Trim();
                if (!usedIds.Add(id))
                    continue;

                var actions = (entry.actions ?? new List<string>())
                    .Where(action => !string.IsNullOrWhiteSpace(action))
                    .Select(action => action.Trim())
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (id == ownId)
                    actions = new List<string> { "view", "add", "edit", "delete", "approve", "unapprove", "download", "print" };
                else
                    actions = actions.Where(action => action is not "delete" and not "approve" and not "unapprove").ToList();

                if (actions.Count == 0)
                    actions = id == ownId ? new List<string> { "view" } : new List<string> { "view", "download" };

                list.Add(new BsonDocument
                {
                    { "Id", id },
                    { "Actions", new BsonArray(actions) },
                });
            }

            if (list.Count == 0)
            {
                list.Add(new BsonDocument
                {
                    { "Id", ownId },
                    { "Actions", new BsonArray(new[] { "view", "add", "edit", "delete", "approve", "unapprove", "download", "print" }) },
                });
            }

            var idDoc = list.Select(v => v.AsBsonDocument["Id"].AsString).Distinct(StringComparer.Ordinal).ToList();
            var phamViDoc = new BsonDocument
            {
                { "IdChuyenNganh", ownId },
                { "IdChuyenNganhDoc", list },
            };
            parsed = new ParsedPhamViPayload(ownId, phamViDoc, idDoc);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string BuildPhamViPayloadString(BsonDocument? phamViDoc, string fallbackIdChuyenNganh)
    {
        if (phamViDoc == null || phamViDoc.ElementCount == 0)
            return fallbackIdChuyenNganh ?? "";

        var ownId = phamViDoc.StringOr("IdChuyenNganh", fallbackIdChuyenNganh ?? "");
        var entries = new List<object>();
        var arr = phamViDoc.ArrayOr("IdChuyenNganhDoc");
        if (arr != null)
        {
            foreach (var doc in arr.Documents())
            {
                var id = doc.StringOr("Id");
                if (string.IsNullOrWhiteSpace(id))
                    continue;
                var actions = doc.ArrayOr("Actions")?.Strings()
                    .Where(action => !string.IsNullOrWhiteSpace(action))
                    .ToArray() ?? Array.Empty<string>();
                entries.Add(new { id, actions });
            }
        }

        var obj = new
        {
            idChuyenNganh = ownId,
            idChuyenNganhDoc = entries,
        };
        var json = JsonSerializer.Serialize(obj);
        return PhamViPayloadPrefix + Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
    }

    private async Task CloneGroupPermissions(IMongoDatabase db, string fromId, string toId, string userName)
    {
        var pqCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupFunctionPermissions);
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
        var nhomCol   = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroups);
        var memberCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments);

        // Aggregate user count per group in one query
        var countAgg = new BsonDocument[]
        {
            new("$match", new BsonDocument
            {
                { "IdNguoiDung", new BsonDocument("$nin", new BsonArray { BsonNull.Value, "" }) },
            }),
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
        var nhomCol  = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroups);
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
        var nhomCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroups);

        var doc = await nhomCol.Find(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.Id)))
                               .FirstOrDefaultAsync();
        if (doc == null)
            return new DeleteResponse { Success = false, Message = "Không tìm thấy nhóm" };
        if (doc.StringOr("Loai", "Custom") == "System")
            return new DeleteResponse { Success = false, Message = "Không thể xóa nhóm hệ thống" };

        // Get affected users BEFORE cascade delete (for rebuild trigger)
        var fId = Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.Id);
        var affectedUsers = (await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments)
            .Find(fId)
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .ToListAsync())
            .Select(d => d.StringOr("IdNguoiDung"))
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();

        // Cascade delete — all 4 independent → parallel
        await Task.WhenAll(
            nhomCol.DeleteOneAsync(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.Id))),
            db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments).DeleteManyAsync(fId),
            db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupFunctionPermissions).DeleteManyAsync(fId),
            db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupSubsystemPermissions).DeleteManyAsync(fId));

        // Trigger rebuild for affected users
        rebuildQueue.EnqueueGroup(affectedUsers);

        return new DeleteResponse { Success = true };
    }

    // ── GetGroupPermissions ────────────────────────────────────────

    public override async Task<GetGroupPermissionsResponse> GetGroupPermissions(
        GetGroupPermissionsRequest request, ServerCallContext context)
    {
        var db    = Global.MongoDB!;
        var pqCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupFunctionPermissions);

        var P = Builders<BsonDocument>.Projection;

        // Fire both queries in parallel with projection
        var docsTask = pqCol.Find(
            Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.IdNhom))
            .Project(P.Include("MaChucNang"))
            .ToListAsync();
        var nhomTask = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroups)
            .Find(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.IdNhom)))
            .Project(P.Include("ScopeType").Include("IdDonViScope").Include("IdNganhDoc").Include("IdDanhMucChuyenNganh").Include("PhamViChuyenNganh"))
            .FirstOrDefaultAsync();
        await Task.WhenAll(docsTask, nhomTask);

        var response = new GetGroupPermissionsResponse();
        foreach (var doc in docsTask.Result)
        {
            var code = doc.StringOr("MaChucNang");
            if (!string.IsNullOrEmpty(code))
                response.CheckedCodes.Add(code);
        }

        var nhomDoc = nhomTask.Result;
        response.ScopeType = nhomDoc.StringOr("ScopeType", "SUBTREE");
        response.AnchorNodeId = nhomDoc.StringOr("IdDonViScope");
        var multiNodeIds = nhomDoc.ArrayOr("IdNganhDoc");
        if (multiNodeIds != null)
        {
            response.MultiNodeIds.AddRange(multiNodeIds.Strings().Where(item => !string.IsNullOrWhiteSpace(item)));
        }
        response.IdDanhMucChuyenNganh = BuildPhamViPayloadString(nhomDoc.DocOr("PhamViChuyenNganh"), nhomDoc.StringOr("IdDanhMucChuyenNganh"));

        return response;
    }

    // ── SaveGroupPermissions ───────────────────────────────────────

    public override async Task<DeleteResponse> SaveGroupPermissions(
        SaveGroupPermissionsRequest request, ServerCallContext context)
    {
        var db       = Global.MongoDB!;
        var pqCol    = db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupFunctionPermissions);
        var nhomCol  = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroups);
        var F        = Builders<BsonDocument>.Filter;
        var userName = context.GetUserName() ?? "";
        var now      = DateTime.UtcNow;
        var normalizedScopeType = NormalizeScopeType(request.ScopeType);
        var multiNodeIds = NormalizeStringList(request.MultiNodeIds);
        var anchorNodeId = string.IsNullOrWhiteSpace(request.AnchorNodeId) ? "" : request.AnchorNodeId.Trim();
        var rawIdDanhMucChuyenNganh = string.IsNullOrWhiteSpace(request.IdDanhMucChuyenNganh) ? "" : request.IdDanhMucChuyenNganh.Trim();
        var idDanhMucChuyenNganh = rawIdDanhMucChuyenNganh;
        BsonDocument? phamViChuyenNganhDoc = null;
        List<string> idChuyenNganhDoc = new();
        if (TryParsePhamViPayload(rawIdDanhMucChuyenNganh, out var phamViParsed))
        {
            idDanhMucChuyenNganh = phamViParsed.IdChuyenNganh;
            phamViChuyenNganhDoc = phamViParsed.PhamViDoc;
            idChuyenNganhDoc = phamViParsed.IdChuyenNganhDoc;
        }

        if (normalizedScopeType == "MULTI_NODE")
        {
            anchorNodeId = "";
        }
        else
        {
            multiNodeIds.Clear();
        }

        var nhomDoc = await nhomCol.Find(F.Eq("_id", ParseId(request.IdNhom))).FirstOrDefaultAsync();
        var nhomMaPhanHe = Global.NormalizeMaPhanHe(nhomDoc.StringOr("MaPhanHe"));

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
                { "MaPhanHe",        nhomMaPhanHe },
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
            scopeTask = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroups).UpdateOneAsync(
                F.Eq("_id", ParseId(request.IdNhom)),
                Builders<BsonDocument>.Update
                    .Set("ScopeType", normalizedScopeType)
                    .Set("IdDonViScope", anchorNodeId)
                    .Set("IdNganhDoc", new BsonArray(multiNodeIds))
                    .Set("IdDanhMucChuyenNganh", idDanhMucChuyenNganh)
                    .Set("IdChuyenNganhDoc", new BsonArray(idChuyenNganhDoc))
                    .Set("PhamViChuyenNganh", phamViChuyenNganhDoc != null ? (BsonValue)phamViChuyenNganhDoc : BsonNull.Value)
                    .Set("NguoiSua", userName)
                    .Set("NgaySua", now));
        }

        await bulkTask;
        if (scopeTask != null) await scopeTask;

        // Trigger rebuild for all users in this group
        var affectedUserIds = (await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments)
            .Find(F.Eq("IdNhomNguoiDung", request.IdNhom))
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .ToListAsync())
            .Select(d => d.StringOr("IdNguoiDung"))
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
        var memberCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments);

        // Single aggregation pipeline: $match → $lookup Employee → $project (1 round-trip)
        var uidToOid = new BsonDocument("$convert", new BsonDocument
            { { "input", "$IdNguoiDung" }, { "to", "objectId" }, { "onError", "$IdNguoiDung" } });

        var pipeline = new BsonDocument[]
        {
            new("$match", new BsonDocument
            {
                { "IdNhomNguoiDung", request.IdNhom },
                { "IdNguoiDung", new BsonDocument("$nin", new BsonArray { BsonNull.Value, "" }) },
            }),
            new("$lookup", new BsonDocument
            {
                { "from", PermissionCollectionNames.Employees },
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
            new("$lookup", new BsonDocument
            {
                { "from", PermissionCollectionNames.Offices },
                { "localField", "IdDonViScope" },
                { "foreignField", "_id" },
                { "pipeline", new BsonArray
                    {
                        new BsonDocument("$project", new BsonDocument
                        {
                            { "Ten", 1 },
                            { "TenDayDu", 1 },
                        }),
                    }
                },
                { "as", "anchor" },
            }),
            new("$unwind", new BsonDocument
                { { "path", "$emp" }, { "preserveNullAndEmptyArrays", true } }),
            new("$unwind", new BsonDocument
                { { "path", "$anchor" }, { "preserveNullAndEmptyArrays", true } }),
            new("$project", new BsonDocument
            {
                { "IdNguoiDung", 1 }, { "ScopeType", 1 }, { "IdDonViScope", 1 },
                { "NgayHetHan", 1 }, { "IdNguoiUyQuyen", 1 },
                { "IdDanhMucChuyenNganh", 1 }, { "emp", 1 }, { "anchor", 1 },
            }),
        };

        var docs = await memberCol.Aggregate<BsonDocument>(pipeline).ToListAsync();

        var response = new ListGroupUsersResponse();
        foreach (var doc in docs)
        {
            var userId = doc.StringOr("IdNguoiDung");
            var emp = doc.DocOr("emp");
            var anchor = doc.DocOr("anchor");
            var hetHanDt = doc.DateTimeOr("NgayHetHan");
            var isExpired  = false;
            Google.Protobuf.WellKnownTypes.Timestamp? hetHanTs = null;
            if (hetHanDt != null)
            {
                var dt = hetHanDt.Value;
                isExpired = dt < DateTime.UtcNow;
                hetHanTs  = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(dt);
            }

            var item = new UserInGroup
            {
                IdAssignment  = doc["_id"].ToString()!,
                IdNguoiDung   = userId,
                HoTen         = emp.StringOr("HoVaTen", userId),
                DonVi         = emp.StringOr("IdDonVi"),
                ScopeType     = doc.StringOr("ScopeType"),
                AnchorNodeId  = doc.StringOr("IdDonViScope"),
                AnchorNodeName = anchor.StringOr("Ten", anchor.StringOr("TenDayDu", doc.StringOr("IdDonViScope"))),
                IdDanhMucChuyenNganh = doc.StringOr("IdDanhMucChuyenNganh"),
                IdNguoiUyQuyen = doc.StringOr("IdNguoiUyQuyen"),
                IsExpired     = isExpired,
            };
            if (hetHanTs != null) item.NgayHetHan = hetHanTs;
            response.Users.Add(item);
        }
        return response;
    }

    // ── ListAllAssignments ─────────────────────────────────────────

    public override async Task<ListAllAssignmentsResponse> ListAllAssignments(
        ListAllAssignmentsRequest request, ServerCallContext context)
    {
        var db        = Global.MongoDB!;
        var memberCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments);
        var validAssignmentFilter = Builders<BsonDocument>.Filter.Nin("IdNguoiDung", new BsonArray { BsonNull.Value, "" });

        // Single pipeline: double $lookup (NhomNguoiDung + Employee) → 1 round-trip
        var uidToOid = new BsonDocument("$convert", new BsonDocument
            { { "input", "$IdNguoiDung" }, { "to", "objectId" }, { "onError", "$IdNguoiDung" } });

        var page     = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 ? request.PageSize : 50;

        // Count total (lightweight — no $lookup)
        var countTask = memberCol.CountDocumentsAsync(validAssignmentFilter);

        var pipeline = new BsonDocument[]
        {
            new("$match", new BsonDocument("IdNguoiDung", new BsonDocument("$nin", new BsonArray { BsonNull.Value, "" }))),
            new("$sort",  new BsonDocument("NgayTao", -1)),
            new("$skip",  (page - 1) * pageSize),
            new("$limit", pageSize),
            // $lookup NhomNguoiDung (string ↔ string)
            new("$lookup", new BsonDocument
            {
                { "from", PermissionCollectionNames.UserGroups },
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
                { "from", PermissionCollectionNames.Employees },
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
            // $lookup Office for anchor node display name (string -> string)
            new("$lookup", new BsonDocument
            {
                { "from", PermissionCollectionNames.Offices },
                { "localField", "IdDonViScope" },
                { "foreignField", "_id" },
                { "pipeline", new BsonArray
                    {
                        new BsonDocument("$project", new BsonDocument
                        {
                            { "Ten", 1 },
                            { "TenDayDu", 1 },
                        }),
                    }
                },
                { "as", "anchor" },
            }),
            new("$unwind", new BsonDocument
                { { "path", "$nhom" }, { "preserveNullAndEmptyArrays", true } }),
            new("$unwind", new BsonDocument
                { { "path", "$emp" }, { "preserveNullAndEmptyArrays", true } }),
            new("$unwind", new BsonDocument
                { { "path", "$anchor" }, { "preserveNullAndEmptyArrays", true } }),
            new("$project", new BsonDocument
            {
                { "IdNguoiDung", 1 }, { "IdNhomNguoiDung", 1 },
                { "ScopeType", 1 }, { "IdDonViScope", 1 }, { "IdNguoiUyQuyen", 1 },
                { "IdDanhMucChuyenNganh", 1 },
                { "Loai", 1 }, { "NgayTao", 1 }, { "NgayHetHan", 1 },
                { "nhom", 1 }, { "emp", 1 }, { "anchor", 1 },
            }),
        };

        var docsTask = memberCol.Aggregate<BsonDocument>(pipeline).ToListAsync();
        await Task.WhenAll(countTask, docsTask);
        var docs = docsTask.Result;

        var response = new ListAllAssignmentsResponse();
        foreach (var doc in docs)
        {
            var userId = doc.StringOr("IdNguoiDung");
            var nhomId = doc.StringOr("IdNhomNguoiDung");
            var emp  = doc.DocOr("emp");
            var nhom = doc.DocOr("nhom");
            var anchor = doc.DocOr("anchor");

            var detail = new AssignmentDetail
            {
                Id             = doc["_id"].ToString()!,
                IdNguoiDung    = userId,
                HoTen          = emp.StringOr("HoVaTen", userId),
                DonVi          = emp.StringOr("IdDonVi"),
                IdNhom         = nhomId,
                TenNhom        = nhom.StringOr("Ten", nhomId),
                ColorNhom      = nhom.StringOr("Color", "#64748b"),
                ScopeType      = doc.StringOr("ScopeType"),
                AnchorNodeId   = doc.StringOr("IdDonViScope"),
                AnchorNodeName = anchor.StringOr("Ten", anchor.StringOr("TenDayDu", doc.StringOr("IdDonViScope"))),
                IdDanhMucChuyenNganh = doc.StringOr("IdDanhMucChuyenNganh"),
                Loai           = doc.StringOr("Loai", "Direct"),
                IdNguoiUyQuyen = doc.StringOr("IdNguoiUyQuyen"),
            };

            var ngayTaoTs = doc.TimestampOr("NgayTao");
            var hetHanTs  = doc.TimestampOr("NgayHetHan");
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
        if (string.IsNullOrWhiteSpace(request.IdNguoiDung))
            throw new RpcException(new Grpc.Core.Status(StatusCode.InvalidArgument, "IdNguoiDung khong duoc de trong"));

        var db        = Global.MongoDB!;
        var memberCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments);
        var userName  = context.GetUserName() ?? "";
        var now       = DateTime.UtcNow;
        var rawIdDanhMucChuyenNganh = request.IdDanhMucChuyenNganh?.Trim() ?? "";
        var idDanhMucChuyenNganh = rawIdDanhMucChuyenNganh;
        BsonDocument? phamViChuyenNganhDoc = null;
        List<string> idChuyenNganhDoc = new();
        if (TryParsePhamViPayload(rawIdDanhMucChuyenNganh, out var phamViParsed))
        {
            idDanhMucChuyenNganh = phamViParsed.IdChuyenNganh;
            phamViChuyenNganhDoc = phamViParsed.PhamViDoc;
            idChuyenNganhDoc = phamViParsed.IdChuyenNganhDoc;
        }

        var existing = await memberCol.Find(Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("IdNguoiDung",     request.IdNguoiDung),
            Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.IdNhom)
        )).FirstOrDefaultAsync();

        string assignId;
        if (existing != null)
        {
            assignId = existing["_id"].ToString()!;
            await memberCol.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", ParseId(assignId)),
                Builders<BsonDocument>.Update
                    .Set("ScopeType",        NormalizeScopeType(request.ScopeType))
                    .Set("IdDonViScope",     request.AnchorNodeId)
                    .Set("IdDanhMucChuyenNganh", idDanhMucChuyenNganh)
                    .Set("IdChuyenNganhDoc", new BsonArray(idChuyenNganhDoc))
                    .Set("PhamViChuyenNganh", phamViChuyenNganhDoc != null ? (BsonValue)phamViChuyenNganhDoc : BsonNull.Value)
                    .Set("Loai",             request.Loai)
                    .Set("IdNguoiUyQuyen",   request.IdNguoiUyQuyen)
                    .Set("NguoiSua",         userName)
                    .Set("NgaySua",          now)
                    .Set("NgayHetHan",       request.NgayHetHan != null
                        ? (BsonValue)request.NgayHetHan.ToDateTime()
                        : BsonNull.Value));
        }
        else
        {
            assignId = Guid.NewGuid().ToString();
            var doc = new BsonDocument
            {
                { "_id",             assignId },
                { "IdNguoiDung",     request.IdNguoiDung },
                { "IdNhomNguoiDung", request.IdNhom },
                { "ScopeType",       NormalizeScopeType(request.ScopeType) },
                { "IdDonViScope",    request.AnchorNodeId },
                { "IdDanhMucChuyenNganh", idDanhMucChuyenNganh },
                { "IdChuyenNganhDoc", new BsonArray(idChuyenNganhDoc) },
                { "PhamViChuyenNganh", phamViChuyenNganhDoc != null ? (BsonValue)phamViChuyenNganhDoc : BsonNull.Value },
                { "Loai",            string.IsNullOrEmpty(request.Loai) ? "Direct" : request.Loai },
                { "IdNguoiUyQuyen",  request.IdNguoiUyQuyen },
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
        var memberCol = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments);

        // Read userId BEFORE delete (needed for rebuild trigger)
        var assignDoc = await memberCol
            .Find(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.IdAssignment)))
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .FirstOrDefaultAsync();

        var result = await memberCol
            .DeleteOneAsync(Builders<BsonDocument>.Filter.Eq("_id", ParseId(request.IdAssignment)));

        // Trigger rebuild
        if (result.DeletedCount > 0 && assignDoc != null)
            rebuildQueue.Enqueue(assignDoc.StringOr("IdNguoiDung"));

        return new DeleteResponse
        {
            Success = result.DeletedCount > 0,
            Message = result.DeletedCount > 0 ? "" : "Không tìm thấy bản ghi",
        };
    }
    public override async Task RebuildPermissionsStream(
        RebuildPermissionsStreamRequest request,
        IServerStreamWriter<RebuildPermissionsStreamEvent> responseStream,
        ServerCallContext context)
    {
        var userName = context.GetUserName() ?? string.Empty;
        if (!context.IsAdminAccount())
            throw new RpcException(new Grpc.Core.Status(StatusCode.PermissionDenied, "Khong co quyen rebuild permission cache"));

        var jobId = Guid.NewGuid().ToString();
        var warnings = new List<string>();

        async Task WriteAsync(
            string stage,
            string message,
            int processed = 0,
            int total = 0,
            string currentUserId = "",
            bool done = false,
            bool success = false,
            IEnumerable<string>? extraWarnings = null)
        {
            var evt = new RebuildPermissionsStreamEvent
            {
                JobId = jobId,
                Stage = stage,
                Message = message,
                Processed = processed,
                Total = total,
                CurrentUserId = currentUserId,
                Done = done,
                Success = success,
                Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
            };
            if (extraWarnings != null)
                evt.Warnings.AddRange(extraWarnings);
            await responseStream.WriteAsync(evt, context.CancellationToken);
        }

        await WriteAsync("STARTED", "Bat dau rebuild permission cache");

        var db = Global.MongoDB!;
        var userIds = NormalizeStringList(request.UserIds);

        if (!string.IsNullOrWhiteSpace(request.IdNhom))
        {
            var groupUserIds = (await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments)
                    .Find(Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", request.IdNhom.Trim()))
                    .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
                    .ToListAsync(context.CancellationToken))
                .Select(doc => doc.StringOr("IdNguoiDung"))
                .Where(id => !string.IsNullOrWhiteSpace(id));

            userIds = NormalizeStringList(userIds.Concat(groupUserIds));
        }

        if (userIds.Count == 0)
        {
            await WriteAsync(
                stage: "FAILED",
                message: "Khong co user nao de rebuild",
                done: true,
                success: false);
            return;
        }

        await WriteAsync(
            stage: "RESOLVED",
            message: $"Da xac dinh {userIds.Count} user can rebuild",
            total: userIds.Count);

        var processed = 0;
        foreach (var uid in userIds)
        {
            context.CancellationToken.ThrowIfCancellationRequested();

            await WriteAsync(
                stage: "REBUILDING",
                message: $"Dang rebuild cho {uid}",
                processed: processed,
                total: userIds.Count,
                currentUserId: uid);

            try
            {
                await rebuildService.RebuildForUser(uid);
            }
            catch (Exception ex)
            {
                var warning = $"User {uid}: {ex.Message}";
                warnings.Add(warning);
                _logger.LogWarning(ex, "RebuildPermissionsStream warning for {UserId}", uid);
                await WriteAsync(
                    stage: "WARNING",
                    message: warning,
                    processed: processed,
                    total: userIds.Count,
                    currentUserId: uid,
                    extraWarnings: new[] { warning });
            }

            processed++;
            await WriteAsync(
                stage: "PROGRESS",
                message: $"Da rebuild {processed}/{userIds.Count} user",
                processed: processed,
                total: userIds.Count,
                currentUserId: uid);
        }

        await WriteAsync(
            stage: "COMPLETED",
            message: warnings.Count == 0
                ? $"Rebuild thanh cong {processed} user"
                : $"Rebuild hoan tat voi {warnings.Count} canh bao",
            processed: processed,
            total: userIds.Count,
            done: true,
            success: warnings.Count == 0,
            extraWarnings: warnings);
    }
}
