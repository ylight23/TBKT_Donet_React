using Backend.Converter;
using Backend.Services;
using MongoDB.Bson;
using MongoDB.Driver;
using Grpc.Core;
using System.Text.RegularExpressions;

namespace Backend.Authorization;

public static class ServerCallContextIdentityExtensions
{
    private const string SsoIdentityMappingCacheKey = "__SsoIdentityMapping";
    private const string SsoRoleCacheKey = "__SsoRole";
    private const string SsoSubjectCacheKey = "__SsoSubject";
    private const string SsoIssuerCacheKey = "__SsoIssuer";
    private const string SsoProviderCacheKey = "__SsoProvider";

    private static BsonRegularExpression BuildExactIgnoreCaseRegex(string value) =>
        new($"^{Regex.Escape(value)}$", "i");

    private static BsonDocument? ResolveSsoIdentityMapping(this ServerCallContext? context)
    {
        if (context == null)
            return null;

        var httpContext = context.GetHttpContext();
        if (httpContext == null)
            return null;

        if (httpContext.Items.TryGetValue(SsoIdentityMappingCacheKey, out var cached))
            return cached as BsonDocument;

        var userName = context.GetUserNameRaw();
        var subject = context.GetSsoSubject();
        var issuer = context.GetSsoIssuer();
        var provider = context.GetSsoProvider();
        if (string.IsNullOrWhiteSpace(userName) && string.IsNullOrWhiteSpace(subject))
        {
            httpContext.Items[SsoIdentityMappingCacheKey] = null!;
            return null;
        }

        var db = Global.MongoDB;
        if (db == null)
        {
            httpContext.Items[SsoIdentityMappingCacheKey] = null!;
            return null;
        }

        var collection = db.GetCollection<BsonDocument>(PermissionCollectionNames.SsoIdentityMappings);
        var filters = new List<FilterDefinition<BsonDocument>>
        {
            Builders<BsonDocument>.Filter.Eq("Active", true),
        };

        var identityFilters = new List<FilterDefinition<BsonDocument>>();
        if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(provider))
        {
            identityFilters.Add(Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Regex("Provider", BuildExactIgnoreCaseRegex(provider)),
                Builders<BsonDocument>.Filter.Eq("Subject", subject)));
        }
        if (!string.IsNullOrWhiteSpace(subject) && !string.IsNullOrWhiteSpace(issuer))
        {
            identityFilters.Add(Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Regex("Issuer", BuildExactIgnoreCaseRegex(issuer)),
                Builders<BsonDocument>.Filter.Eq("Subject", subject)));
        }
        if (!string.IsNullOrWhiteSpace(subject))
            identityFilters.Add(Builders<BsonDocument>.Filter.Eq("Subject", subject));
        if (!string.IsNullOrWhiteSpace(subject))
            identityFilters.Add(Builders<BsonDocument>.Filter.Eq("ExternalUserId", subject)); // backward compat
        if (!string.IsNullOrWhiteSpace(userName))
            identityFilters.Add(Builders<BsonDocument>.Filter.Regex("UserName", BuildExactIgnoreCaseRegex(userName)));

        if (identityFilters.Count == 0)
        {
            httpContext.Items[SsoIdentityMappingCacheKey] = null!;
            return null;
        }

        filters.Add(identityFilters.Count == 1
            ? identityFilters[0]
            : Builders<BsonDocument>.Filter.Or(identityFilters));

        var mapping = collection.Find(Builders<BsonDocument>.Filter.And(filters)).FirstOrDefault();
        httpContext.Items[SsoIdentityMappingCacheKey] = mapping!;
        return mapping;
    }

    private static string? GetUserNameRaw(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        return (claims?.FirstOrDefault(c => c.Type == "username")
             ?? claims?.FirstOrDefault(c => c.Type == "UserName"))?.Value + string.Empty;
    }

    public static string? GetSsoSubject(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        if (httpContext == null)
            return null;
        if (httpContext.Items.TryGetValue(SsoSubjectCacheKey, out var cached) && cached is string cachedValue)
            return cachedValue;

        var claims = httpContext.User?.Claims;
        var value = (claims?.FirstOrDefault(c => c.Type == "sub")
                  ?? claims?.FirstOrDefault(c => c.Type == "UserID"))?.Value + string.Empty;
        httpContext.Items[SsoSubjectCacheKey] = value ?? string.Empty;
        return value;
    }

    public static string? GetSsoIssuer(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        if (httpContext == null)
            return null;
        if (httpContext.Items.TryGetValue(SsoIssuerCacheKey, out var cached) && cached is string cachedValue)
            return cachedValue;

        var claims = httpContext.User?.Claims;
        var value = claims?.FirstOrDefault(c => c.Type == "iss")?.Value + string.Empty;
        httpContext.Items[SsoIssuerCacheKey] = value ?? string.Empty;
        return value;
    }

    public static string GetSsoProvider(this ServerCallContext? context)
    {
        if (context == null)
            return "sso";
        var httpContext = context.GetHttpContext();
        if (httpContext == null)
            return "sso";
        if (httpContext.Items.TryGetValue(SsoProviderCacheKey, out var cached) && cached is string cachedValue)
            return cachedValue;

        var claims = httpContext.User?.Claims;
        var provider = (claims?.FirstOrDefault(c => c.Type == "identity_provider")
                     ?? claims?.FirstOrDefault(c => c.Type == "idp")
                     ?? claims?.FirstOrDefault(c => c.Type == "Provider"))?.Value;

        if (string.IsNullOrWhiteSpace(provider))
            provider = "sso";

        httpContext.Items[SsoProviderCacheKey] = provider;
        return provider;
    }

    public static string? GetUserID(this ServerCallContext? context)
    {
        if (context == null)
            return null;

        var mapping = context.ResolveSsoIdentityMapping();
        var mappedEmployeeId = mapping?.GetValue("EmployeeId", BsonNull.Value);
        if (mappedEmployeeId != null && mappedEmployeeId != BsonNull.Value)
        {
            var value = mappedEmployeeId.ToString();
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        var claim = claims?.FirstOrDefault(c => c.Type == "UserID")
                 ?? claims?.FirstOrDefault(c => c.Type == "sub");
        return claim?.Value + string.Empty;
    }

    public static string? GetUserAdminOfficeID(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        var claim = claims?.FirstOrDefault(c => c.Type == "AdminOfficeID");
        return claim?.Value + string.Empty;
    }

    public static string? GetUserOfficeID(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        var claim = claims?.FirstOrDefault(c => c.Type == "OfficeID");
        return claim?.Value + string.Empty;
    }

    public static string? GetUserName(this ServerCallContext? context)
    {
        return context.GetUserNameRaw();
    }

    public static string GetAccountRole(this ServerCallContext? context)
    {
        if (context == null)
            return "user";

        var httpContext = context.GetHttpContext();
        if (httpContext == null)
            return "user";

        if (httpContext.Items.TryGetValue(SsoRoleCacheKey, out var cached) && cached is string cachedRole)
            return cachedRole;

        var mapping = context.ResolveSsoIdentityMapping();
        var role = mapping?.GetValue("Role", BsonNull.Value);
        if (role != null && role != BsonNull.Value)
        {
            var mappedRole = role.ToString();
            if (!string.IsNullOrWhiteSpace(mappedRole))
            {
                httpContext.Items[SsoRoleCacheKey] = mappedRole;
                return mappedRole;
            }
        }

        var fallbackRole = context.GetUserNameRaw() is "admin" or "superadmin" ? "admin" : "user";
        httpContext.Items[SsoRoleCacheKey] = fallbackRole;
        return fallbackRole;
    }

    public static bool IsAdminAccount(this ServerCallContext? context) =>
        string.Equals(context.GetAccountRole(), "admin", StringComparison.OrdinalIgnoreCase);

    public static bool IsUserAccount(this ServerCallContext? context) =>
        string.Equals(context.GetAccountRole(), "user", StringComparison.OrdinalIgnoreCase);

    public static string? GetUserFullName(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        return claims?.FirstOrDefault(c => c.Type == "FullName")?.Value + string.Empty;
    }

    public static string? GetTokenType(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        var claim = claims?.FirstOrDefault(c => c.Type == "TokenType");
        return claim?.Value + string.Empty;
    }

    public static bool IsAccessToken(this ServerCallContext? context)
    {
        if (context == null)
            return false;
        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        var claim = claims?.FirstOrDefault(c => c.Type == "TokenType");
        return claim?.Value == "access";
    }

    public static bool IsRefreshToken(this ServerCallContext? context)
    {
        if (context == null)
            return false;
        var httpContext = context.GetHttpContext();
        var claims = httpContext?.User?.Claims;
        var claim = claims?.FirstOrDefault(c => c.Type == "TokenType");
        return claim?.Value == "refresh";
    }
}
