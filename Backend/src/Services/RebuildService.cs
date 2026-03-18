using System.Collections.Concurrent;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public sealed class RebuildService
{
    // ── Collection names (must match PhanQuyenServiceImpl) ─────────
    private const string ColNguoiDungNhomND         = "NguoiDungNhomNguoiDung";
    private const string ColPhanQuyenPhanHeND        = "PhanQuyenPhanHeNguoiDung";
    private const string ColPhanQuyenPhanHeNhomND    = "PhanQuyenPhanHeNhomNguoiDung";
    private const string ColPhanQuyenND              = "PhanQuyenNguoiDung";
    private const string ColPhanQuyenNhomND          = "PhanQuyenNhomNguoiDung";
    private const string ColPhanQuyenNDNganhDoc      = "PhanQuyenNguoiDungNganhDoc";
    private const string ColPhanQuyenNhomNDNganhDoc  = "PhanQuyenNhomNguoiDungNganhDoc";
    private const string ColEmployee                 = "Employee";
    private const string ColUserPermission           = "UserPermission";

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
            var memberDocs = await db.GetCollection<BsonDocument>(ColNguoiDungNhomND)
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
                var nhomId = SafeStr(doc, "IdNhomNguoiDung");
                if (!string.IsNullOrEmpty(nhomId))
                    nhomIds.Add(nhomId);

                var stVal = SafeStr(doc, "ScopeType");
                if (string.IsNullOrEmpty(stVal)) continue;

                var normalized = NormalizeScopeType(stVal);

                if (normalized == "DELEGATED")
                {
                    var hetHan = doc.GetValue("NgayHetHan", BsonNull.Value);
                    if (hetHan != BsonNull.Value && !hetHan.IsBsonNull)
                    {
                        var dt = hetHan.ToUniversalTime();
                        if (dt < DateTime.UtcNow) continue;
                        delegatedExpiry = dt;
                    }
                    idNguoiUyQuyen = SafeStr(doc, "IdNguoiUyQuyen");
                }

                if (normalized == "BY_ATTRIBUTE")
                {
                    var attrBson = doc.GetValue("ScopeAttribute", BsonNull.Value);
                    if (!attrBson.IsBsonNull && attrBson.IsBsonDocument)
                    {
                        var ad = attrBson.AsBsonDocument;
                        scopeAttrField = SafeStr(ad, "Field");
                        scopeAttrValue = SafeStr(ad, "Value");
                    }
                }

                scopeType = normalized;
                var dvs = SafeStr(doc, "IdDonViScope");
                if (!string.IsNullOrEmpty(dvs)) donViScope = dvs;

                // NEW: Extract IdNganhDoc from NguoiDungNhomNguoiDung
                var nganhDocArr = doc.GetValue("IdNganhDoc", BsonNull.Value);
                if (nganhDocArr.IsBsonArray)
                {
                    foreach (var item in nganhDocArr.AsBsonArray)
                        if (item.IsString && !string.IsNullOrEmpty(item.AsString))
                            nganhDocIds.Add(item.AsString);
                }

                // NEW: Extract IdNhomChuyenNganh from NguoiDungNhomNguoiDung
                var nhomChuyenNganhArr = doc.GetValue("IdNhomChuyenNganh", BsonNull.Value);
                if (nhomChuyenNganhArr.IsBsonArray)
                {
                    foreach (var item in nhomChuyenNganhArr.AsBsonArray)
                        if (item.IsString && !string.IsNullOrEmpty(item.AsString))
                            nhomChuyenNganhIds.Add(item.AsString);
                }
            }

            // ─── 2–6. Parallel queries ─────────────────────────────
            var tPhanHeND = db.GetCollection<BsonDocument>(ColPhanQuyenPhanHeND)
                .Find(F.Eq("IdNguoiDung", userId))
                .Project(P.Include("MaPhanHe").Include("DuocTruyCap")
                          .Include("DuocQuanTri").Include("ScopeType").Include("IdDonViScope"))
                .ToListAsync();

            var tPhanHeNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(ColPhanQuyenPhanHeNhomND)
                    .Find(F.In("IdNhomNguoiDung", nhomIds))
                    .Project(P.Include("MaPhanHe").Include("DuocTruyCap").Include("DuocQuanTri"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            var tChucNangND = db.GetCollection<BsonDocument>(ColPhanQuyenND)
                .Find(F.Eq("IdNguoiDung", userId))
                .Project(P.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                .ToListAsync();

            var tChucNangNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(ColPhanQuyenNhomND)
                    .Find(F.In("IdNhomNguoiDung", nhomIds))
                    .Project(P.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            var tNganhDocND = db.GetCollection<BsonDocument>(ColPhanQuyenNDNganhDoc)
                .Find(F.Eq("IdNguoiDung", userId))
                .Project(P.Include("IdNganhDoc"))
                .ToListAsync();

            var tNganhDocNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(ColPhanQuyenNhomNDNganhDoc)
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
                var maPH = doc.GetValue("MaPhanHe", "").AsString;
                if (string.IsNullOrEmpty(maPH)) continue;
                phanHeDict[maPH] = new BsonDocument
                {
                    { "MaPhanHe",    maPH },
                    { "DuocTruyCap", doc.GetValue("DuocTruyCap", false).AsBoolean },
                    { "DuocQuanTri", doc.GetValue("DuocQuanTri", false).AsBoolean },
                };

                // Scope fallback from PhanHePhanHeND
                if (string.IsNullOrEmpty(scopeType))
                {
                    var st = doc.GetValue("ScopeType", BsonNull.Value);
                    if (st != BsonNull.Value && !st.IsBsonNull)
                    {
                        scopeType = st.AsString;
                        var dvs = SafeStr(doc, "IdDonViScope");
                        if (!string.IsNullOrEmpty(dvs)) donViScope = dvs;
                    }
                }
            }

            foreach (var doc in tPhanHeNhom.Result)
            {
                var maPH = doc.GetValue("MaPhanHe", "").AsString;
                if (string.IsNullOrEmpty(maPH)) continue;

                if (!phanHeDict.ContainsKey(maPH))
                {
                    phanHeDict[maPH] = new BsonDocument
                    {
                        { "MaPhanHe",    maPH },
                        { "DuocTruyCap", doc.GetValue("DuocTruyCap", false).AsBoolean },
                        { "DuocQuanTri", doc.GetValue("DuocQuanTri", false).AsBoolean },
                    };
                }
                else
                {
                    var e = phanHeDict[maPH];
                    if (doc.GetValue("DuocTruyCap", false).AsBoolean) e["DuocTruyCap"] = true;
                    if (doc.GetValue("DuocQuanTri", false).AsBoolean) e["DuocQuanTri"] = true;
                }
            }
            foreach (var v in phanHeDict.Values) phanHeArr.Add(v);

            // ─── Merge ChucNang ────────────────────────────────────
            var chucNangArr = new BsonArray();
            var chucNangDict = new Dictionary<string, BsonDocument>();

            foreach (var doc in tChucNangND.Result)
            {
                var maCN = doc.GetValue("MaChucNang", "").AsString;
                var maPH = doc.GetValue("MaPhanHe", "").AsString;
                if (string.IsNullOrEmpty(maCN)) continue;
                var key = $"{maPH}:{maCN}";
                chucNangDict[key] = new BsonDocument
                {
                    { "MaChucNang", maCN },
                    { "MaPhanHe",   maPH },
                    { "Actions",    ExtractActions(doc) },
                };
            }

            foreach (var doc in tChucNangNhom.Result)
            {
                var maCN = doc.GetValue("MaChucNang", "").AsString;
                var maPH = doc.GetValue("MaPhanHe", "").AsString;
                if (string.IsNullOrEmpty(maCN)) continue;
                var key = $"{maPH}:{maCN}";
                if (!chucNangDict.ContainsKey(key))
                {
                    chucNangDict[key] = new BsonDocument
                    {
                        { "MaChucNang", maCN },
                        { "MaPhanHe",   maPH },
                        { "Actions",    ExtractActions(doc) },
                    };
                }
                else
                {
                    MergeBsonActions(chucNangDict[key]["Actions"].AsBsonDocument, ExtractActions(doc));
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
                var arr = doc.GetValue("IdNganhDoc", BsonNull.Value);
                if (!arr.IsBsonArray) continue;
                foreach (var item in arr.AsBsonArray)
                    if (item.IsString && !string.IsNullOrEmpty(item.AsString))
                        nganhDocIds.Add(item.AsString);
            }

            // ─── Resolve scope ─────────────────────────────────────
            string anchorNodeId = donViScope ?? "";
            string anchorParentId = "";

            if (string.IsNullOrEmpty(scopeType))
            {
                scopeType = "SUBTREE";
                var empDoc = await db.GetCollection<BsonDocument>(ColEmployee)
                    .Find(F.Eq("_id", ParseId(userId)))
                    .Project(P.Include("IdQuanTriDonVi"))
                    .FirstOrDefaultAsync();
                if (empDoc != null)
                    anchorNodeId = SafeStr(empDoc, "IdQuanTriDonVi");
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
                            anchorParentId = SafeStr(anchorDoc, "IdCapTren");
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

            var result = await db.GetCollection<BsonDocument>(ColUserPermission)
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
        var userIds = (await db.GetCollection<BsonDocument>(ColNguoiDungNhomND)
            .Find(Builders<BsonDocument>.Filter.Eq("IdNhomNguoiDung", nhomId))
            .Project(Builders<BsonDocument>.Projection.Include("IdNguoiDung"))
            .ToListAsync())
            .Select(d => SafeStr(d, "IdNguoiDung"))
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

    private static BsonDocument ExtractActions(BsonDocument doc)
    {
        var val = doc.GetValue("Actions", BsonNull.Value);
        if (val == BsonNull.Value || !val.IsBsonDocument)
            return new BsonDocument
            {
                { "view", false }, { "add", false }, { "edit", false },
                { "delete", false }, { "approve", false }, { "download", false }, { "print", false },
            };
        var a = val.AsBsonDocument;
        return new BsonDocument
        {
            { "view",     a.GetValue("view",     false).AsBoolean },
            { "add",      a.GetValue("add",      false).AsBoolean },
            { "edit",     a.GetValue("edit",      false).AsBoolean },
            { "delete",   a.GetValue("delete",   false).AsBoolean },
            { "approve",  a.GetValue("approve",  false).AsBoolean },
            { "download", a.GetValue("download", false).AsBoolean },
            { "print",    a.GetValue("print",    false).AsBoolean },
        };
    }

    private static void MergeBsonActions(BsonDocument target, BsonDocument source)
    {
        foreach (var name in new[] { "view", "add", "edit", "delete", "approve", "download", "print" })
            if (source.GetValue(name, false).AsBoolean) target[name] = true;
    }

    private static string SafeStr(BsonDocument? doc, string key, string fallback = "")
    {
        if (doc == null) return fallback;
        var v = doc.GetValue(key, BsonNull.Value);
        return (v == BsonNull.Value || v.IsBsonNull) ? fallback : v.AsString;
    }

    private static BsonValue ParseId(string id) =>
        ObjectId.TryParse(id, out var oid) ? (BsonValue)oid : new BsonString(id);
}
