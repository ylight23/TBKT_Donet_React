using Backend.Common.Bson;
using Backend.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Backend.Authorization;

/// <summary>
/// Builds <see cref="AccessGate"/> from UserPermissionCache.
/// Called once per request by <c>GetAccessGate()</c> extension method.
///
/// Data flow:
///   UserPermissionCache (MongoDB doc)
///     → BuildFromDocument()
///       → AccessGate { FuncActions, VisibleCNs, ActionsPerCN }
/// </summary>
public static class AccessGateBuilder
{
    /// <summary>
    /// Build AccessGate from UserPermissionCache.
    /// Falls back to <see cref="AccessGate.Empty"/> if no cached doc exists.
    /// </summary>
    public static async Task<AccessGate> BuildFromCacheAsync(string userId, string? userName = null, string? accountRole = null)
    {
        if (string.Equals(accountRole, "admin", StringComparison.OrdinalIgnoreCase)
            || userName is "superadmin" or "admin")
            return AccessGate.SuperAdmin;

        if (string.IsNullOrEmpty(userId))
            return AccessGate.Empty;

        var db = Global.MongoDB;
        if (db == null)
            return AccessGate.Empty;

        var permDoc = await db
            .GetCollection<BsonDocument>(PermissionCollectionNames.UserPermissionCache)
            .Find(Builders<BsonDocument>.Filter.Eq("_id", userId))
            .FirstOrDefaultAsync();

        if (permDoc == null)
            return AccessGate.Empty;

        return BuildFromDocument(userId, permDoc);
    }

    /// <summary>
    /// Build AccessGate from a raw BsonDocument (UserPermissionCache format).
    /// This is the pure-function core — no I/O, easy to unit test.
    /// </summary>
    public static AccessGate BuildFromDocument(string userId, BsonDocument doc)
    {
        var funcActions = ParseFuncActions(doc);
        var (visibleCNs, actionsPerCN, functionActionsPerCN) = ParseChuyenNganhScope(doc);
        var serviceScopes = ParseServiceScopes(doc);

        return new AccessGate
        {
            UserId = userId,
            ScopeType = doc.StringOr("ScopeType", "SUBTREE"),
            AnchorNodeId = doc.StringOr("AnchorNodeId"),
            AnchorParentId = doc.StringOr("AnchorParentId"),
            FuncActions = funcActions,
            VisibleCNs = visibleCNs,
            ActionsPerCN = actionsPerCN,
            FunctionActionsPerCN = functionActionsPerCN,
            ServiceScopes = serviceScopes,
        };
    }

    // ── Chiều 2: Parse ChucNang → FuncActions ───────────────────────

    private static Dictionary<string, HashSet<string>> ParseFuncActions(BsonDocument doc)
    {
        var result = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        var chucNangArr = doc.ArrayOr("ChucNang");
        if (chucNangArr == null)
            return result;

        foreach (var d in chucNangArr.Documents())
        {
            var ma = d.StringOr("MaChucNang");
            if (string.IsNullOrEmpty(ma))
                continue;

            var actions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var actionDoc = d.DocOr("Actions");
            if (actionDoc != null)
            {
                foreach (var name in ActionNames)
                {
                    if (actionDoc.BoolOr(name))
                        actions.Add(name);
                }
            }

            // Merge if same MaChucNang appears multiple times (from different groups)
            if (result.TryGetValue(ma, out var existing))
            {
                foreach (var a in actions)
                    existing.Add(a);
            }
            else
            {
                result[ma] = actions;
            }
        }

        return result;
    }

    // ── Chiều 3: Parse NganhDocIds + PhamViChuyenNganh ──────────────

    private static (
        List<string> visibleCNs,
        Dictionary<string, HashSet<string>> actionsPerCN,
        Dictionary<string, Dictionary<string, HashSet<string>>> functionActionsPerCN
    ) ParseChuyenNganhScope(BsonDocument doc)
    {
        var visibleCNs = new List<string>();
        var actionsPerCN = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        var functionActionsPerCN = new Dictionary<string, Dictionary<string, HashSet<string>>>(StringComparer.OrdinalIgnoreCase);

        // 1. Flat list NganhDocIds — lớp 2 cũ (visibility only)
        var visibleArr = doc.ArrayOr("VisibleCNs");
        if (visibleArr != null)
        {
            foreach (var s in visibleArr.Strings())
            {
                if (!string.IsNullOrEmpty(s) && !visibleCNs.Contains(s))
                    visibleCNs.Add(s);
            }
        }

        // 2. PhamViChuyenNganh — structured action-per-CN (lớp 2 mở rộng)
        //    Stored by RebuildService (after A3 fix) as:
        //    { IdChuyenNganh: "thongtin", IdChuyenNganhDoc: [ { Id: "radar", Actions: ["view","download"] } ] }
        var phamViDoc = doc.DocOr("PhamViChuyenNganh");
        if (phamViDoc != null)
        {
            var entries = phamViDoc.ArrayOr("IdChuyenNganhDoc");
            if (entries != null)
            {
                foreach (var entry in entries.Documents())
                {
                    var id = entry.StringOr("Id");
                    if (string.IsNullOrEmpty(id))
                        continue;

                    var actionSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    var actionArr = entry.ArrayOr("Actions");
                    if (actionArr != null)
                    {
                        foreach (var a in actionArr.Strings())
                        {
                            if (!string.IsNullOrEmpty(a))
                                actionSet.Add(a);
                        }
                    }

                    // Merge actions if same CN appears in both flat list and PhamVi
                    if (actionsPerCN.TryGetValue(id, out var existingActions))
                    {
                        foreach (var a in actionSet)
                            existingActions.Add(a);
                    }
                    else
                    {
                        actionsPerCN[id] = actionSet;
                    }

                    // Ensure visible
                    if (!visibleCNs.Contains(id))
                        visibleCNs.Add(id);

                    var functionActions = entry.ArrayOr("FunctionActions");
                    if (functionActions != null)
                    {
                        if (!functionActionsPerCN.TryGetValue(id, out var perFunc))
                        {
                            perFunc = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
                            functionActionsPerCN[id] = perFunc;
                        }

                        foreach (var funcDoc in functionActions.Documents())
                        {
                            var code = funcDoc.StringOr("MaChucNang");
                            if (string.IsNullOrWhiteSpace(code))
                                continue;

                            if (!perFunc.TryGetValue(code, out var funcSet))
                            {
                                funcSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                                perFunc[code] = funcSet;
                            }

                            var funcActionArr = funcDoc.ArrayOr("Actions");
                            if (funcActionArr == null)
                                continue;

                            foreach (var action in funcActionArr.Strings())
                            {
                                if (!string.IsNullOrWhiteSpace(action))
                                    funcSet.Add(action);
                            }
                        }
                    }
                }
            }
        }

        return (visibleCNs, actionsPerCN, functionActionsPerCN);
    }

    // ── Action names ────────────────────────────────────────────────

    private static readonly string[] ActionNames =
    [
        "view", "add", "edit", "delete", "approve", "unapprove", "download", "print"
    ];

    private static List<string> ParseServiceScopes(BsonDocument doc)
    {
        // Prefer explicit cached field from RebuildService (new format).
        var explicitScopes = doc.ArrayOr("ServiceScopes");
        if (explicitScopes != null)
        {
            var normalized = explicitScopes.Strings()
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (normalized.Count > 0)
                return normalized;
        }

        // Backward-compatible fallback: derive from PhanHe.MaPhanHe (old cache docs).
        var phanHeArr = doc.ArrayOr("PhanHe");
        return ServiceScopeResolver.ExtractFromPhanHeDocs(phanHeArr);
    }
}
