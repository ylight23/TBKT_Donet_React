using System.Collections.Concurrent;
using Backend.Authorization;
using Backend.Common.Bson;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public sealed class RebuildService
{
    // ── Collection names (must match PhanQuyenServiceImpl) ─────────

    // Per-user lock: serialize rebuild for the same userId
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public async Task RebuildForUser(string userId)
    {
        var userLock = _locks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await userLock.WaitAsync();

        try
        {
            var rebuildStart = DateTime.UtcNow;
            var db = Global.MongoDB!;
            var F  = Builders<BsonDocument>.Filter;
            var P  = Builders<BsonDocument>.Projection;

            // ─── 1. Lấy nhóm ──────────────────────────────────────
            var memberDocs = await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments)
                .Find(F.Eq("IdNguoiDung", userId))
                .Project(P.Include("IdNhomNguoiDung").Include("ScopeType")
                          .Include("IdDonViScope").Include("NgayHetHan")
                          .Include("IdNguoiUyQuyen").Include("ScopeAttribute")
                          .Include("IdNganhDoc").Include("IdNhomChuyenNganh"))
                .ToListAsync();

            var nhomIds = new List<string>();
            string? scopeType     = null;
            string? donViScope    = null;
            DateTime? delegatedExpiry   = null;
            string?   idNguoiUyQuyen    = null;
            string?   scopeAttrField    = null;
            string?   scopeAttrValue    = null;
            var nganhDocIds = new HashSet<string>();       // NEW: từ IdNganhDoc trong NguoiDungNhomNguoiDung
            var nhomChuyenNganhIds = new HashSet<string>(); // NEW: từ IdNhomChuyenNganh trong NguoiDungNhomNguoiDung

            foreach (var doc in memberDocs)
            {
                var nhomId = doc.StringOr("IdNhomNguoiDung");
                if (!string.IsNullOrEmpty(nhomId))
                    nhomIds.Add(nhomId);

                var stVal = doc.StringOr("ScopeType");
                if (string.IsNullOrEmpty(stVal)) continue;

                var normalized = NormalizeScopeType(stVal);

                if (normalized == "DELEGATED")
                {
                    var hetHan = doc.DateTimeOr("NgayHetHan");
                    if (hetHan != null)
                    {
                        var dt = hetHan.Value;
                        if (dt < DateTime.UtcNow) continue;
                        delegatedExpiry = dt;
                    }
                    idNguoiUyQuyen = doc.StringOr("IdNguoiUyQuyen");
                }

                if (normalized == "BY_ATTRIBUTE")
                {
                    var attrBson = doc.DocOr("ScopeAttribute");
                    if (attrBson != null)
                    {
                        var ad = attrBson;
                        scopeAttrField = ad.StringOr("Field");
                        scopeAttrValue = ad.StringOr("Value");
                    }
                }

                scopeType = normalized;
                var dvs = doc.StringOr("IdDonViScope");
                if (!string.IsNullOrEmpty(dvs)) donViScope = dvs;

                // NEW: Extract IdNganhDoc from NguoiDungNhomNguoiDung
                var nganhDocArr = doc.ArrayOr("IdNganhDoc");
                if (nganhDocArr != null)
                    foreach (var item in nganhDocArr.Strings().Where(item => !string.IsNullOrEmpty(item)))
                        nganhDocIds.Add(item);

                // NEW: Extract IdNhomChuyenNganh from NguoiDungNhomNguoiDung
                var nhomChuyenNganhArr = doc.ArrayOr("IdNhomChuyenNganh");
                if (nhomChuyenNganhArr != null)
                    foreach (var item in nhomChuyenNganhArr.Strings().Where(item => !string.IsNullOrEmpty(item)))
                        nhomChuyenNganhIds.Add(item);
            }

            // ─── 2–6. Parallel queries ─────────────────────────────
            var tPhanHeND = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserSubsystemPermissions)
                .Find(F.Eq("IdNguoiDung", userId))
                .Project(P.Include("MaPhanHe").Include("DuocTruyCap")
                          .Include("DuocQuanTri").Include("ScopeType").Include("IdDonViScope"))
                .ToListAsync();

            var tPhanHeNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupSubsystemPermissions)
                    .Find(F.In("IdNhomNguoiDung", nhomIds))
                    .Project(P.Include("MaPhanHe").Include("DuocTruyCap").Include("DuocQuanTri"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            var tChucNangND = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserFunctionPermissions)
                .Find(F.Eq("IdNguoiDung", userId))
                .Project(P.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                .ToListAsync();

            var tChucNangNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupFunctionPermissions)
                    .Find(F.In("IdNhomNguoiDung", nhomIds))
                    .Project(P.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            var tNganhDocND = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserVerticalPermissions)
                .Find(F.Eq("IdNguoiDung", userId))
                .Project(P.Include("IdNganhDoc"))
                .ToListAsync();

            var tNganhDocNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupVerticalPermissions)
                    .Find(F.In("IdNhomNguoiDung", nhomIds))
                    .Project(P.Include("IdNganhDoc"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            await Task.WhenAll(tPhanHeND, tPhanHeNhom, tChucNangND, tChucNangNhom, tNganhDocND, tNganhDocNhom);

            // ─── Merge PhanHe ──────────────────────────────────────
            var phanHeArr = new BsonArray();
            var phanHeDict = new Dictionary<string, BsonDocument>();

            foreach (var doc in tPhanHeND.Result)
            {
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maPH)) continue;
                phanHeDict[maPH] = new BsonDocument
                {
                    { "MaPhanHe",    maPH },
                    { "DuocTruyCap", doc.BoolOr("DuocTruyCap") },
                    { "DuocQuanTri", doc.BoolOr("DuocQuanTri") },
                };

                // Scope fallback from PhanHePhanHeND
                if (string.IsNullOrEmpty(scopeType))
                {
                    var st = doc.StringOr("ScopeType");
                    if (!string.IsNullOrEmpty(st))
                    {
                        scopeType = st;
                        var dvs = doc.StringOr("IdDonViScope");
                        if (!string.IsNullOrEmpty(dvs)) donViScope = dvs;
                    }
                }
            }

            foreach (var doc in tPhanHeNhom.Result)
            {
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maPH)) continue;

                if (!phanHeDict.ContainsKey(maPH))
                {
                    phanHeDict[maPH] = new BsonDocument
                        {
                            { "MaPhanHe",    maPH },
                        { "DuocTruyCap", doc.BoolOr("DuocTruyCap") },
                        { "DuocQuanTri", doc.BoolOr("DuocQuanTri") },
                    };
                }
                else
                {
                    var e = phanHeDict[maPH];
                    if (doc.BoolOr("DuocTruyCap")) e["DuocTruyCap"] = true;
                    if (doc.BoolOr("DuocQuanTri")) e["DuocQuanTri"] = true;
                }
            }
            foreach (var v in phanHeDict.Values) phanHeArr.Add(v);

            // ─── Merge ChucNang ────────────────────────────────────
            var chucNangArr = new BsonArray();
            var chucNangDict = new Dictionary<string, BsonDocument>();

            foreach (var doc in tChucNangND.Result)
            {
                var maCN = doc.StringOr("MaChucNang");
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maCN)) continue;
                var key = $"{maPH}:{maCN}";
                chucNangDict[key] = new BsonDocument
                {
                    { "MaChucNang", maCN },
                    { "MaPhanHe",   maPH },
                    { "Actions",    PermissionActionHelpers.ExtractActionsDocument(doc) },
                };
            }

            foreach (var doc in tChucNangNhom.Result)
            {
                var maCN = doc.StringOr("MaChucNang");
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maCN)) continue;
                var key = $"{maPH}:{maCN}";
                if (!chucNangDict.ContainsKey(key))
                {
                    chucNangDict[key] = new BsonDocument
                    {
                        { "MaChucNang", maCN },
                        { "MaPhanHe",   maPH },
                        { "Actions",    PermissionActionHelpers.ExtractActionsDocument(doc) },
                    };
                }
                else
                {
                    PermissionActionHelpers.MergeActions(
                        chucNangDict[key]["Actions"].AsBsonDocument,
                        PermissionActionHelpers.ExtractActionsDocument(doc));
                }
            }
            foreach (var v in chucNangDict.Values) chucNangArr.Add(v);

            // ─── Merge NganhDoc ────────────────────────────────────
            // Kết hợp từ 3 nguồn:
            // 1. IdNganhDoc trong NguoiDungNhomNguoiDung (đã được populate ở trên)
            // 2. PhanQuyenNguoiDungNganhDoc (legacy - giữ lại để backward compatible)
            // 3. PhanQuyenNhomNguoiDungNganhDoc (legacy - giữ lại để backward compatible)
            foreach (var doc in tNganhDocND.Result.Concat(tNganhDocNhom.Result))
            {
                var arr = doc.ArrayOr("IdNganhDoc");
                if (arr == null) continue;
                foreach (var item in arr.Strings().Where(item => !string.IsNullOrEmpty(item)))
                    nganhDocIds.Add(item);
            }

            // ─── Resolve scope ─────────────────────────────────────
            string anchorNodeId = donViScope ?? "";
            string anchorParentId = "";

            if (string.IsNullOrEmpty(scopeType))
            {
                scopeType = "SUBTREE";
                var empDoc = await db.GetCollection<BsonDocument>(PermissionCollectionNames.Employees)
                    .Find(F.Eq("_id", ParseId(userId)))
                    .Project(P.Include("IdQuanTriDonVi"))
                    .FirstOrDefaultAsync();
                if (empDoc != null)
                    anchorNodeId = empDoc.StringOr("IdQuanTriDonVi");
            }

            switch (scopeType)
            {
                case "ALL":
                    anchorNodeId = "";
                    break;
                case "SELF":
                    anchorNodeId = userId;
                    break;
                case "SIBLINGS":
                    if (!string.IsNullOrEmpty(anchorNodeId))
                    {
                        var anchorDoc = await db.GetCollection<BsonDocument>("Office")
                            .Find(F.Eq("_id", anchorNodeId))
                            .Project(P.Include("IdCapTren"))
                            .FirstOrDefaultAsync();
                        if (anchorDoc != null)
                            anchorParentId = anchorDoc.StringOr("IdCapTren");
                    }
                    break;
                case "BY_ATTRIBUTE":
                    anchorNodeId = "";
                    break;
            }

            // ─── Build the precomputed document ────────────────────
            var permDoc = new BsonDocument
            {
                { "_id",             userId },
                { "ScopeType",       scopeType },
                { "AnchorNodeId",    anchorNodeId },
                { "AnchorParentId",  anchorParentId },
                { "PhanHe",          phanHeArr },
                { "ChucNang",        chucNangArr },
                { "NganhDocIds",     new BsonArray(nganhDocIds) },
                { "RebuiltAt",       rebuildStart },
            };

            // DELEGATED extras
            if (delegatedExpiry.HasValue)
                permDoc["NgayHetHan"] = delegatedExpiry.Value;
            if (!string.IsNullOrEmpty(idNguoiUyQuyen))
                permDoc["IdNguoiUyQuyen"] = idNguoiUyQuyen;

            // BY_ATTRIBUTE extras
            if (!string.IsNullOrEmpty(scopeAttrField))
                permDoc["ScopeAttribute"] = new BsonDocument
                {
                    { "Field", scopeAttrField },
                    { "Value", scopeAttrValue ?? "" },
                };

            // ─── Atomic upsert with version check ──────────────────
            var filter = F.And(
                F.Eq("_id", userId),
                F.Or(
                    F.Exists("RebuiltAt", false),
                    F.Lt("RebuiltAt", rebuildStart)));

            var result = await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionCache)
                .ReplaceOneAsync(filter, permDoc, new ReplaceOptions { IsUpsert = true });
            // result.ModifiedCount == 0 means superseded by newer rebuild — safe to ignore
        }
        catch (MongoCommandException ex) when (ex.Code == 11000)
        {
            // Duplicate key on concurrent first-insert — the other rebuild won, ignore
        }
        finally
        {
            userLock.Release();
            if (userLock.CurrentCount == 1) // không ai đang chờ
            _locks.TryRemove(userId, out _);
        }
    }

    /// <summary>Rebuild all users belonging to a group</summary>
    public async Task RebuildForGroup(string nhomId)
    {
        var db = Global.MongoDB!;
        var userIds = (await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments)
            .Find(Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", nhomId))
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .ToListAsync())
            .Select(d => d.StringOr("IdNguoiDung"))
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();

        await Parallel.ForEachAsync(userIds,
            new ParallelOptions { MaxDegreeOfParallelism = 10 },
            async (uid, _) => await RebuildForUser(uid));
    }

    // ─── Helpers ───────────────────────────────────────────────────

    private static string NormalizeScopeType(string raw) => raw.ToUpperInvariant() switch
    {
        "SELF"               => "SELF",
        "NODEONLY" or "NODE_ONLY"       => "NODE_ONLY",
        "NODEANDCHILDREN" or "NODE_AND_CHILDREN" => "NODE_AND_CHILDREN",
        "SUBTREE"            => "SUBTREE",
        "SIBLINGS"           => "SIBLINGS",
        "BRANCH"             => "BRANCH",
        "MULTINODE" or "MULTI_NODE"     => "MULTI_NODE",
        "DELEGATED"          => "DELEGATED",
        "ALL"                => "ALL",
        "BYATTRIBUTE" or "BY_ATTRIBUTE" => "BY_ATTRIBUTE",
        var other            => other,
    };

    private static BsonValue ParseId(string id) =>
        ObjectId.TryParse(id, out var oid) ? (BsonValue)oid : new BsonString(id);
}
