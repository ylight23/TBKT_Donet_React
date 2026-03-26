using Backend.Converter;
using Backend.Services;
using MongoDB.Bson;
using MongoDB.Driver;
using Grpc.Core;

namespace Backend.Authorization;

public static class ServerCallContextIdentityExtensions
{
    private const string AccountMappingCacheKey = "__AccountEmployeeMapping";
    private const string AccountRoleCacheKey = "__AccountRole";
    private const string ExternalUserIdCacheKey = "__ExternalUserId";

    private static BsonDocument? ResolveAccountMapping(this ServerCallContext? context)
    {
        if (context == null)
            return null;

        var httpContext = context.GetHttpContext();
        if (httpContext == null)
            return null;

        if (httpContext.Items.TryGetValue(AccountMappingCacheKey, out var cached))
            return cached as BsonDocument;

        var userName = context.GetUserNameRaw();
        var externalUserId = context.GetExternalUserId();
        if (string.IsNullOrWhiteSpace(userName) && string.IsNullOrWhiteSpace(externalUserId))
        {
            httpContext.Items[AccountMappingCacheKey] = null!;
            return null;
        }

        var db = Global.MongoDB;
        if (db == null)
        {
            httpContext.Items[AccountMappingCacheKey] = null!;
            return null;
        }

        var collection = db.GetCollection<BsonDocument>(PermissionCollectionNames.AccountEmployeeMappings);
        var filters = new List<FilterDefinition<BsonDocument>>
        {
            Builders<BsonDocument>.Filter.Eq("Active", true),
        };

        var identityFilters = new List<FilterDefinition<BsonDocument>>();
        if (!string.IsNullOrWhiteSpace(userName))
            identityFilters.Add(Builders<BsonDocument>.Filter.Eq("UserName", userName));
        if (!string.IsNullOrWhiteSpace(externalUserId))
            identityFilters.Add(Builders<BsonDocument>.Filter.Eq("ExternalUserId", externalUserId));

        if (identityFilters.Count == 0)
        {
            httpContext.Items[AccountMappingCacheKey] = null!;
            return null;
        }

        filters.Add(identityFilters.Count == 1
            ? identityFilters[0]
            : Builders<BsonDocument>.Filter.Or(identityFilters));

        var mapping = collection.Find(Builders<BsonDocument>.Filter.And(filters)).FirstOrDefault();
        httpContext.Items[AccountMappingCacheKey] = mapping!;
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

    public static string? GetExternalUserId(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        if (httpContext == null)
            return null;
        if (httpContext.Items.TryGetValue(ExternalUserIdCacheKey, out var cached) && cached is string cachedValue)
            return cachedValue;

        var claims = httpContext.User?.Claims;
        var value = (claims?.FirstOrDefault(c => c.Type == "sub")
                  ?? claims?.FirstOrDefault(c => c.Type == "UserID"))?.Value + string.Empty;
        httpContext.Items[ExternalUserIdCacheKey] = value ?? string.Empty;
        return value;
    }

    public static string? GetUserID(this ServerCallContext? context)
    {
        if (context == null)
            return null;

        var mapping = context.ResolveAccountMapping();
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

    public static int? GetUserAccessLevel(this ServerCallContext? context)
    {
        if (context == null)
            return null;
        var httpContext = context.GetHttpContext();
        var claims = httpContext.User.Claims;
        var claim = claims.FirstOrDefault(c => c.Type == "AccessLevel");
        return !string.IsNullOrEmpty(claim?.Value) ? Backend.Converter.Converter.ToInt(claim?.Value) : null;
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

        if (httpContext.Items.TryGetValue(AccountRoleCacheKey, out var cached) && cached is string cachedRole)
            return cachedRole;

        var mapping = context.ResolveAccountMapping();
        var role = mapping?.GetValue("Role", BsonNull.Value);
        if (role != null && role != BsonNull.Value)
        {
            var mappedRole = role.ToString();
            if (!string.IsNullOrWhiteSpace(mappedRole))
            {
                httpContext.Items[AccountRoleCacheKey] = mappedRole;
                return mappedRole;
            }
        }

        var fallbackRole = context.GetUserNameRaw() is "admin" or "superadmin" ? "admin" : "user";
        httpContext.Items[AccountRoleCacheKey] = fallbackRole;
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
