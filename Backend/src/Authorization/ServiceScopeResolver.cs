using Backend.Common.Bson;
using Backend.Services;
using MongoDB.Bson;

namespace Backend.Authorization;

/// <summary>
/// Resolve internal service scopes from MaPhanHe while keeping external contracts unchanged.
/// This lets us prepare microservice boundaries without changing current business-facing MaPhanHe usage.
/// </summary>
public static class ServiceScopeResolver
{
    private static readonly Dictionary<string, string> ServiceByMaPhanHe = new(StringComparer.OrdinalIgnoreCase)
    {
        // Current system is still a single module externally.
        ["TBKT.ThongTin"] = "tbkt-thongtin",

        // Legacy aliases (backward-compatible)
        ["core"] = "tbkt-thongtin",
        ["tbkt"] = "tbkt-thongtin",
        ["tcdt.tonghoptacchien"] = "tbkt-thongtin",
    };

    public static string ResolveServiceScope(string? maPhanHe)
    {
        var normalized = Global.NormalizeMaPhanHe(maPhanHe);
        if (string.IsNullOrWhiteSpace(normalized))
            return "";

        if (ServiceByMaPhanHe.TryGetValue(normalized, out var mapped))
            return mapped;

        // Generic fallback for future modules.
        return normalized.ToLowerInvariant().Replace('.', '-');
    }

    public static List<string> ExtractFromPhanHeDocs(BsonArray? phanHeArr)
    {
        if (phanHeArr == null)
            return new List<string>();

        var scopes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var doc in phanHeArr.Documents())
        {
            if (!doc.BoolOr("DuocTruyCap"))
                continue;

            var serviceScope = ResolveServiceScope(doc.StringOr("MaPhanHe"));
            if (!string.IsNullOrWhiteSpace(serviceScope))
                scopes.Add(serviceScope);
        }
        return scopes.ToList();
    }
}
