using Backend.Services;
using MongoDB.Bson;

namespace Backend.Authorization;

internal static class AuthorizationAudit
{
    public static void WriteSuperAdminBypass(
        string userId,
        string userName,
        string method,
        string target)
    {
        try
        {
            var db = Global.MongoDB;
            if (db == null)
                return;

            var doc = new BsonDocument
            {
                { "_id", Guid.NewGuid().ToString() },
                { "EventType", "SUPERADMIN_BYPASS" },
                { "UserId", string.IsNullOrWhiteSpace(userId) ? "(unknown)" : userId },
                { "UserName", string.IsNullOrWhiteSpace(userName) ? "(unknown)" : userName },
                { "Method", string.IsNullOrWhiteSpace(method) ? "(unknown)" : method },
                { "Target", string.IsNullOrWhiteSpace(target) ? "(unknown)" : target },
                { "At", DateTime.UtcNow },
            };

            db.GetCollection<BsonDocument>(PermissionCollectionNames.AuthzAuditLogs).InsertOne(doc);
        }
        catch (Exception ex)
        {
            Global.Logger?.LogWarning(ex, "Failed to persist authorization audit log.");
        }
    }
}

