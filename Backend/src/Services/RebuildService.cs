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

            var memberDocs = await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments)
                .Find(filterBuilder.Eq("IdNguoiDung", userId))
                .Project(projectionBuilder.Include("IdNhomNguoiDung").Include("ScopeType")
                    .Include("IdDonViUyQuyenQT").Include("IdDonViUyQuyen").Include("IdDonViScope").Include("NgayHetHan")
                    .Include("IdNguoiUyQuyen")
                    .Include("PhamViChuyenNganh"))
                .ToListAsync();

            var nhomIds = memberDocs
                .Select(doc => doc.StringOr("IdNhomNguoiDung"))
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .ToList();
            var roleScopeDocs = nhomIds.Count > 0
                ? await db.GetCollection<BsonDocument>(PermissionCollectionNames.Roles)
                    .Find(filterBuilder.In("_id", nhomIds))
                    .Project(projectionBuilder.Include("_id").Include("ScopeType")
                        .Include("IdDonViUyQuyenQT").Include("IdDonViUyQuyen").Include("IdDonViScope")
                        .Include("PhamViChuyenNganh"))
                    .ToListAsync()
                : new List<BsonDocument>();
            var roleScopeMap = roleScopeDocs.ToDictionary(doc => doc.IdString(), doc => doc, StringComparer.Ordinal);

            string? scopeType = null;
            string? donViScope = null;
            DateTime? delegatedExpiry = null;
            string? idNguoiUyQuyen = null;
            var visibleCNs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            BsonDocument? bestPhamViDoc = null;

            foreach (var doc in memberDocs)
            {
                var nhomId = doc.StringOr("IdNhomNguoiDung");
                roleScopeMap.TryGetValue(nhomId, out var roleScopeDoc);

                var stVal = doc.StringOr("ScopeType");
                if (string.IsNullOrEmpty(stVal))
                    stVal = roleScopeDoc?.StringOr("ScopeType");
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

                var roleAnchor = roleScopeDoc == null
                    ? ""
                    : roleScopeDoc.StringOr("IdDonViUyQuyenQT",
                        roleScopeDoc.StringOr("IdDonViUyQuyen", roleScopeDoc.StringOr("IdDonViScope")));
                var dvs = doc.StringOr("IdDonViUyQuyenQT",
                    doc.StringOr("IdDonViUyQuyen",
                        doc.StringOr("IdDonViScope", roleAnchor)));
                if (!string.IsNullOrEmpty(dvs))
                    donViScope = dvs;

                var phamViDoc = doc.DocOr("PhamViChuyenNganh") ?? roleScopeDoc?.DocOr("PhamViChuyenNganh");
                var phamViEntries = phamViDoc.ArrayOr("IdChuyenNganhDoc");
                if (phamViEntries != null)
                {
                    foreach (var entry in phamViEntries.Documents())
                    {
                        var id = entry.StringOr("Id");
                        if (!string.IsNullOrEmpty(id))
                            visibleCNs.Add(id);
                    }
                }

                // Collect PhamViChuyenNganh for AccessGate (A3)
                if (bestPhamViDoc == null)
                {
                    if (phamViDoc != null && phamViDoc.ElementCount > 0)
                        bestPhamViDoc = phamViDoc;
                }

            }

            var tPhanHeND = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserSubsystemPermissions)
                .Find(filterBuilder.Eq("IdNguoiDung", userId))
                .Project(projectionBuilder.Include("MaPhanHe").Include("DuocTruyCap")
                    .Include("ScopeType").Include("IdDonViUyQuyenQT").Include("IdDonViUyQuyen").Include("IdDonViScope"))
                .ToListAsync();

            var tPhanHeNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(PermissionCollectionNames.GroupSubsystemPermissions)
                    .Find(filterBuilder.In("IdNhomNguoiDung", nhomIds))
                    .Project(projectionBuilder.Include("MaPhanHe").Include("DuocTruyCap"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            var tChucNangND = db.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionOverrides)
                .Find(filterBuilder.Eq("IdNguoiDung", userId))
                .Project(projectionBuilder.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                .ToListAsync();

            var tChucNangNhom = nhomIds.Count > 0
                ? db.GetCollection<BsonDocument>(PermissionCollectionNames.RolePermissions)
                    .Find(filterBuilder.In("IdNhomNguoiDung", nhomIds))
                    .Project(projectionBuilder.Include("MaChucNang").Include("MaPhanHe").Include("Actions"))
                    .ToListAsync()
                : Task.FromResult(new List<BsonDocument>());

            await Task.WhenAll(tPhanHeND, tPhanHeNhom, tChucNangND, tChucNangNhom);

            var phanHeArr = new BsonArray();
            var phanHeDict = new Dictionary<string, BsonDocument>();

            foreach (var doc in tPhanHeND.Result)
            {
                var maPH = Global.NormalizeMaPhanHe(doc.StringOr("MaPhanHe"));
                if (string.IsNullOrEmpty(maPH))
                    continue;

                phanHeDict[maPH] = new BsonDocument
                {
                    { "MaPhanHe", maPH },
                    { "DuocTruyCap", doc.BoolOr("DuocTruyCap") },
                };

                if (string.IsNullOrEmpty(scopeType))
                {
                    var st = doc.StringOr("ScopeType");
                    if (!string.IsNullOrEmpty(st))
                    {
                        scopeType = NormalizeScopeType(st);
                        var dvs = doc.StringOr("IdDonViUyQuyenQT", doc.StringOr("IdDonViUyQuyen", doc.StringOr("IdDonViScope")));
                        if (!string.IsNullOrEmpty(dvs))
                            donViScope = dvs;
                    }
                }
            }

            foreach (var doc in tPhanHeNhom.Result)
            {
                var maPH = Global.NormalizeMaPhanHe(doc.StringOr("MaPhanHe"));
                if (string.IsNullOrEmpty(maPH))
                    continue;

                if (!phanHeDict.ContainsKey(maPH))
                {
                    phanHeDict[maPH] = new BsonDocument
                    {
                        { "MaPhanHe", maPH },
                        { "DuocTruyCap", doc.BoolOr("DuocTruyCap") },
                    };
                }
                else
                {
                    var existing = phanHeDict[maPH];
                    if (doc.BoolOr("DuocTruyCap"))
                        existing["DuocTruyCap"] = true;
                }
            }

            foreach (var value in phanHeDict.Values)
                phanHeArr.Add(value);

            var serviceScopes = ServiceScopeResolver.ExtractFromPhanHeDocs(phanHeArr);

            var chucNangArr = new BsonArray();
            var chucNangDict = new Dictionary<string, BsonDocument>();

            foreach (var doc in tChucNangND.Result)
            {
                var maCN = doc.StringOr("MaChucNang");
                var maPH = Global.NormalizeMaPhanHe(doc.StringOr("MaPhanHe"));
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
                var maPH = Global.NormalizeMaPhanHe(doc.StringOr("MaPhanHe"));
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
            string? employeeAnchorNodeId = null;

            if (string.IsNullOrEmpty(scopeType))
            {
                scopeType = "SUBTREE";
                var empDoc = await db.GetCollection<BsonDocument>(PermissionCollectionNames.Employees)
                    .Find(filterBuilder.Eq("_id", ParseId(userId)))
                    .Project(projectionBuilder.Include("IdQuanTriDonVi"))
                    .FirstOrDefaultAsync();
                if (empDoc != null)
                {
                    employeeAnchorNodeId = empDoc.StringOr("IdQuanTriDonVi");
                    anchorNodeId = employeeAnchorNodeId;
                }
            }

            // Fallback anchor for scope types that require a unit anchor but assignment omitted IdDonViScope.
            if (string.IsNullOrEmpty(anchorNodeId)
                && scopeType is "SUBTREE" or "DELEGATED" or "NODE_ONLY" or "NODE_AND_CHILDREN" or "SIBLINGS" or "BRANCH")
            {
                if (employeeAnchorNodeId == null)
                {
                    var empDoc = await db.GetCollection<BsonDocument>(PermissionCollectionNames.Employees)
                        .Find(filterBuilder.Eq("_id", ParseId(userId)))
                        .Project(projectionBuilder.Include("IdQuanTriDonVi"))
                        .FirstOrDefaultAsync();
                    employeeAnchorNodeId = empDoc?.StringOr("IdQuanTriDonVi");
                }

                if (!string.IsNullOrEmpty(employeeAnchorNodeId))
                    anchorNodeId = employeeAnchorNodeId;
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
                { "ServiceScopes", new BsonArray(serviceScopes) },
                { "ChucNang", chucNangArr },
                { "VisibleCNs", new BsonArray(visibleCNs) },
                { "PhamViChuyenNganh", bestPhamViDoc != null ? (BsonValue)bestPhamViDoc : BsonNull.Value },
                { "RebuiltAt", rebuildStart },
            };

            if (delegatedExpiry.HasValue)
                permDoc["NgayHetHan"] = delegatedExpiry.Value;
            if (!string.IsNullOrEmpty(idNguoiUyQuyen))
                permDoc["IdNguoiUyQuyen"] = idNguoiUyQuyen;

            var filter = filterBuilder.And(
                filterBuilder.Eq("_id", userId),
                filterBuilder.Or(
                    filterBuilder.Exists("RebuiltAt", false),
                    filterBuilder.Lt("RebuiltAt", rebuildStart)));

            await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionCache)
                .ReplaceOneAsync(filter, permDoc, new ReplaceOptions { IsUpsert = true });

            Global.Logger?.LogDebug(
                "Rebuilt UserPermission cache for user {UserId}: ScopeType={ScopeType}, AnchorNodeId={AnchorNodeId}, ServiceScopes=[{ServiceScopes}], PhanHeCount={PhanHeCount}, ChucNangCount={ChucNangCount}, CNCount={CNCount}",
                userId,
                scopeType,
                anchorNodeId,
                string.Join(",", serviceScopes),
                phanHeArr.Count,
                chucNangArr.Count,
                visibleCNs.Count);
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
        var userIds = (await db.GetCollection<BsonDocument>(PermissionCollectionNames.UserRoleAssignments)
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
