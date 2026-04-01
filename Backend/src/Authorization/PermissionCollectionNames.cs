using Microsoft.Extensions.Logging;

namespace Backend.Authorization;

internal static class PermissionCollectionNames
{
    public const string Roles = "Role";
    public const string UserRoleAssignments = "UserRoleAssignment";
    public const string UserSubsystemPermissions = "UserSubsystemPermission";
    public const string GroupSubsystemPermissions = "RoleSubsystemPermission";
    public const string UserPermissionOverrides = "UserPermissionOverride";
    public const string RolePermissions = "RolePermission";

    public const string SsoIdentityMappings = "SsoNguoiDungMap";
    public const string Employees = "Employee";
    public const string Offices = "Office";
    public const string UserPermissionCache = "UserPermission";
    public const string AuthzAuditLogs = "AuthzAuditLog";

    public static void Initialize(ILogger? logger = null)
    {
        logger?.LogInformation(
            "Authz collection mapping initialized (canonical-only). Roles={Roles}, UserRoleAssignments={UserRoleAssignments}, RolePermissions={RolePermissions}, UserPermissionOverrides={UserPermissionOverrides}",
            Roles,
            UserRoleAssignments,
            RolePermissions,
            UserPermissionOverrides);
    }
}
