using System.Collections.Concurrent;
using Backend.Authorization;
using Backend.Common.Bson;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Backend.Services;

public sealed class RebuildService
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public async Task RebuildForUser(string userId)
    {
        var userLock = _locks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await userLock.WaitAsync();

        try
        {
            var rebuildStart = DateTime.UtcNow;
            var db = Global.MongoDB!;
            var filterBuilder = Builders<BsonDocument>.Filter;
            var projectionBuilder = Builders<BsonDocument>.Projection;

            var memberDocs = await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserGroupAssignments)
                .Find(filterBuilder.Eq("IdNguoiDung", userId))
                .Project(projectionBuilder.Include("IdNhomNguoiDung").Include("ScopeType")
                    .Include("IdDonViScope").Include("NgayHetHan")
                    .Include("IdNguoiUyQuyen")
                    .Include("IdNganhDoc").Include("IdNhomChuyenNganh"))
                .ToListAsync();

            var nhomIds = new List<string>();
            string? scopeType = null;
            string? donViScope = null;
            DateTime? delegatedExpiry = null;
            string? idNguoiUyQuyen = null;
            string? idNhomChuyenNganh = null;
            var nganhDocIds = new HashSet<string>();

            foreach (var doc in memberDocs)
            {
                var nhomId = doc.StringOr("IdNhomNguoiDung");
                if (!string.IsNullOrEmpty(nhomId))
                    nhomIds.Add(nhomId);

                var stVal = doc.StringOr("ScopeType");
                if (string.IsNullOrEmpty(stVal))
                    continue;

                var normalized = NormalizeScopeType(stVal);

                if (normalized == "DELEGATED")
                {
                    var hetHan = doc.DateTimeOr("NgayHetHan");
                    if (hetHan != null)
                    {
                        var dt = hetHan.Value;
                        if (dt < DateTime.UtcNow)
                            continue;
                        delegatedExpiry = dt;
                    }

                    idNguoiUyQuyen = doc.StringOr("IdNguoiUyQuyen");
                }

                scopeType = normalized;

                var dvs = doc.StringOr("IdDonViScope");
                if (!string.IsNullOrEmpty(dvs))
                    donViScope = dvs;

                var nganhDocArr = doc.ArrayOr("IdNganhDoc");
                if (nganhDocArr != null)
                {
                    foreach (var item in nganhDocArr.Strings().Where(item => !string.IsNullOrEmpty(item)))
                        nganhDocIds.Add(item);
                }

                var nhomChuyenNganh = doc.StringOr("IdNhomChuyenNganh");
                if (!string.IsNullOrEmpty(nhomChuyenNganh))
                    idNhomChuyenNganh = nhomChuyenNganh;
            }

            var tPhanHeND = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserSubsystemPermissions)
                .Find(filterBuilder.Eq("IdNguoiDung", userId))
                .Project(projectionBuilder.Include("MaPhanHe").Include("DuocTruyCap")
                    .Include("DuocQuanTri").Include("ScopeType").Include("IdDonViScope"))
                .ToListAsync();

            var tPhanHeNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupSubsystemPermissions)
                    .Find(filterBuilder.In("IdNhomNguoiDung", nhomIds))
                    .Project(projectionBuilder.Include("MaPhanHe").Include("DuocTruyCap").Include("DuocQuanTri"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            var tChucNangND = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserFunctionPermissions)
                .Find(filterBuilder.Eq("IdNguoiDung", userId))
                .Project(projectionBuilder.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                .ToListAsync();

            var tChucNangNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupFunctionPermissions)
                    .Find(filterBuilder.In("IdNhomNguoiDung", nhomIds))
                    .Project(projectionBuilder.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            await Task.WhenAll(tPhanHeND, tPhanHeNhom, tChucNangND, tChucNangNhom);

            var phanHeArr = new BsonArray();
            var phanHeDict = new Dictionary<string, BsonDocument>();

            foreach (var doc in tPhanHeND.Result)
            {
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maPH))
                    continue;

                phanHeDict[maPH] = new BsonDocument
                {
                    { "MaPhanHe", maPH },
                    { "DuocTruyCap", doc.BoolOr("DuocTruyCap") },
                    { "DuocQuanTri", doc.BoolOr("DuocQuanTri") },
                };

                if (string.IsNullOrEmpty(scopeType))
                {
                    var st = doc.StringOr("ScopeType");
                    if (!string.IsNullOrEmpty(st))
                    {
                        scopeType = NormalizeScopeType(st);
                        var dvs = doc.StringOr("IdDonViScope");
                        if (!string.IsNullOrEmpty(dvs))
                            donViScope = dvs;
                    }
                }
            }

            foreach (var doc in tPhanHeNhom.Result)
            {
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maPH))
                    continue;

                if (!phanHeDict.ContainsKey(maPH))
                {
                    phanHeDict[maPH] = new BsonDocument
                    {
                        { "MaPhanHe", maPH },
                        { "DuocTruyCap", doc.BoolOr("DuocTruyCap") },
                        { "DuocQuanTri", doc.BoolOr("DuocQuanTri") },
                    };
                }
                else
                {
                    var existing = phanHeDict[maPH];
                    if (doc.BoolOr("DuocTruyCap"))
                        existing["DuocTruyCap"] = true;
                    if (doc.BoolOr("DuocQuanTri"))
                        existing["DuocQuanTri"] = true;
                }
            }

            foreach (var value in phanHeDict.Values)
                phanHeArr.Add(value);

            var chucNangArr = new BsonArray();
            var chucNangDict = new Dictionary<string, BsonDocument>();

            foreach (var doc in tChucNangND.Result)
            {
                var maCN = doc.StringOr("MaChucNang");
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maCN))
                    continue;

                var key = $"{maPH}:{maCN}";
                chucNangDict[key] = new BsonDocument
                {
                    { "MaChucNang", maCN },
                    { "MaPhanHe", maPH },
                    { "Actions", PermissionActionHelpers.ExtractActionsDocument(doc) },
                };
            }

            foreach (var doc in tChucNangNhom.Result)
            {
                var maCN = doc.StringOr("MaChucNang");
                var maPH = doc.StringOr("MaPhanHe");
                if (string.IsNullOrEmpty(maCN))
                    continue;

                var key = $"{maPH}:{maCN}";
                if (!chucNangDict.ContainsKey(key))
                {
                    chucNangDict[key] = new BsonDocument
                    {
                        { "MaChucNang", maCN },
                        { "MaPhanHe", maPH },
                        { "Actions", PermissionActionHelpers.ExtractActionsDocument(doc) },
                    };
                }
                else
                {
                    PermissionActionHelpers.MergeActions(
                        chucNangDict[key]["Actions"].AsBsonDocument,
                        PermissionActionHelpers.ExtractActionsDocument(doc));
                }
            }

            foreach (var value in chucNangDict.Values)
                chucNangArr.Add(value);

            string anchorNodeId = donViScope ?? "";
            string anchorParentId = "";

            if (string.IsNullOrEmpty(scopeType))
            {
                scopeType = "SUBTREE";
                var empDoc = await db.GetCollection<BsonDocument>(PermissionCollectionNames.Employees)
                    .Find(filterBuilder.Eq("_id", ParseId(userId)))
                    .Project(projectionBuilder.Include("IdQuanTriDonVi"))
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
                        var anchorDoc = await db.GetCollection<BsonDocument>(PermissionCollectionNames.Offices)
                            .Find(filterBuilder.Eq("_id", anchorNodeId))
                            .Project(projectionBuilder.Include("IdCapTren"))
                            .FirstOrDefaultAsync();
                        if (anchorDoc != null)
                            anchorParentId = anchorDoc.StringOr("IdCapTren");
                    }
                    break;
            }

            var permDoc = new BsonDocument
            {
                { "_id", userId },
                { "ScopeType", scopeType },
                { "AnchorNodeId", anchorNodeId },
                { "AnchorParentId", anchorParentId },
                { "PhanHe", phanHeArr },
                { "ChucNang", chucNangArr },
                { "NganhDocIds", new BsonArray(nganhDocIds) },
                { "RebuiltAt", rebuildStart },
            };

            if (delegatedExpiry.HasValue)
                permDoc["NgayHetHan"] = delegatedExpiry.Value;
            if (!string.IsNullOrEmpty(idNguoiUyQuyen))
                permDoc["IdNguoiUyQuyen"] = idNguoiUyQuyen;
            if (!string.IsNullOrEmpty(idNhomChuyenNganh))
                permDoc["IdNhomChuyenNganh"] = idNhomChuyenNganh;

            var filter = filterBuilder.And(
                filterBuilder.Eq("_id", userId),
                filterBuilder.Or(
                    filterBuilder.Exists("RebuiltAt", false),
                    filterBuilder.Lt("RebuiltAt", rebuildStart)));

            await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionCache)
                .ReplaceOneAsync(filter, permDoc, new ReplaceOptions { IsUpsert = true });
        }
        catch (MongoCommandException ex) when (ex.Code == 11000)
        {
        }
        finally
        {
            userLock.Release();
            if (userLock.CurrentCount == 1)
                _locks.TryRemove(userId, out _);
        }
    }

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

    private static string NormalizeScopeType(string raw) => raw.ToUpperInvariant() switch
    {
        "SELF" => "SELF",
        "NODEONLY" or "NODE_ONLY" => "NODE_ONLY",
        "NODEANDCHILDREN" or "NODE_AND_CHILDREN" => "NODE_AND_CHILDREN",
        "SUBTREE" => "SUBTREE",
        "SIBLINGS" => "SIBLINGS",
        "BRANCH" => "BRANCH",
        "MULTINODE" or "MULTI_NODE" => "MULTI_NODE",
        "DELEGATED" => "DELEGATED",
        "ALL" => "ALL",
        "BYATTRIBUTE" or "BY_ATTRIBUTE" => "SUBTREE",
        var other => other,
    };

    private static BsonValue ParseId(string id) =>
        ObjectId.TryParse(id, out var oid) ? (BsonValue)oid : new BsonString(id);
}
