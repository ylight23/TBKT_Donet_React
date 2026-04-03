using Backend.Services;
using Grpc.Core;

namespace Backend.Authorization;

public static class ServerCallContextAuthorizationExtensions
{
    public static bool CanAccessServiceScope(this ServerCallContext? context, string maPhanHe)
    {
        if (context == null) return false;
        var gate = context.GetAccessGate();
        if (gate.IsSuperAdmin)
        {
            AuditSuperAdminBypass(context, $"servicescope:{maPhanHe}");
            return true;
        }

        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId)) return false;

        var serviceScope = ServiceScopeResolver.ResolveServiceScope(maPhanHe);
        if (string.IsNullOrWhiteSpace(serviceScope))
            return false;

        // Backward-compatible fallback for old cache docs not yet rebuilt with ServiceScopes.
        if (gate.ServiceScopes.Count == 0)
            return Global.CanAccessComponent(userId, maPhanHe);

        return gate.CanAccessServiceScope(serviceScope);
    }

    public static void RequireServiceScope(this ServerCallContext? context, string maPhanHe)
    {
        if (context.CanAccessServiceScope(maPhanHe))
            return;

        var serviceScope = ServiceScopeResolver.ResolveServiceScope(maPhanHe);
        throw new RpcException(new Status(
            StatusCode.PermissionDenied,
            $"Khong co quyen truy cap service scope '{serviceScope}'."));
    }

    public static bool CanAccessModule(this ServerCallContext? context, string maPhanHe)
    {
        if (context == null) return false;
        var gate = context.GetAccessGate();
        if (gate.IsSuperAdmin)
        {
            AuditSuperAdminBypass(context, $"module:{maPhanHe}");
            return true;
        }
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId)) return false;

        if (gate.ServiceScopes.Count > 0)
            return gate.CanAccessModule(maPhanHe);

        // Backward-compatible fallback for old cache docs.
        return Global.CanAccessComponent(userId, maPhanHe);
    }

    public static bool CanAccessModuleAction(this ServerCallContext? context, string maPhanHe, string funcName, params string[]? actions)
    {
        if (context == null) return false;
        var gate = context.GetAccessGate();
        if (gate.IsSuperAdmin)
        {
            AuditSuperAdminBypass(context, $"action:{maPhanHe}:{funcName}:{string.Join(",", actions ?? [])}");
            return true;
        }
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId)) return false;

        // Prefer AccessGate strict-order policy:
        // superadmin -> module gate -> action -> CN(scope)
        if (gate.ServiceScopes.Count > 0 || gate.FuncActions.Count > 0)
        {
            if (!gate.CanAccessModule(maPhanHe))
                return false;
            if (actions == null || actions.Length == 0)
                return gate.CanCallFunc(funcName);
            return actions.Any(a => gate.CanPerformAction(maPhanHe, funcName, a, null));
        }

        // Backward-compatible fallback for old cache docs.
        if (!context.CanAccessServiceScope(maPhanHe)) return false;
        return Global.CanAccessComponentAction(userId, maPhanHe, funcName, actions);
    }

    public static bool CanAccessModuleAction(this ServerCallContext? context, string funcName, params string[]? actions)
    {
        if (context == null) return false;
        var gate = context.GetAccessGate();
        if (gate.IsSuperAdmin)
        {
            AuditSuperAdminBypass(context, $"action:{Global.UnifiedMaPhanHe}:{funcName}:{string.Join(",", actions ?? [])}");
            return true;
        }
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId)) return false;

        if (gate.ServiceScopes.Count > 0 || gate.FuncActions.Count > 0)
        {
            if (!gate.CanAccessModule(Global.UnifiedMaPhanHe))
                return false;
            if (actions == null || actions.Length == 0)
                return gate.CanCallFunc(funcName);
            return actions.Any(a => gate.CanPerformAction(Global.UnifiedMaPhanHe, funcName, a, null));
        }

        if (!context.CanAccessServiceScope(Global.UnifiedMaPhanHe)) return false;
        return Global.CanAccessComponentAction(userId, funcName, actions);
    }

    public static bool CanView(this ServerCallContext? context, string funcName) =>
        context.CanAccessModuleAction(funcName: funcName, "view");

    public static bool CanCreateOrEdit(this ServerCallContext? context, string funcName) =>
        context.CanAccessModuleAction(funcName: funcName, "edit", "add");

    public static bool CanDelete(this ServerCallContext? context, string funcName) =>
        context.CanAccessModuleAction(funcName: funcName, "delete");

    public static bool CanApprove(this ServerCallContext? context, string funcName) =>
        context.CanAccessModuleAction(funcName: funcName, "approve");

    public static bool CanUnapprove(this ServerCallContext? context, string funcName) =>
        context.CanAccessModuleAction(funcName: funcName, "unapprove");

    public static bool CanRestoreThamSo(this ServerCallContext? context)
    {
        if (context == null) return false;

        if (context.IsAdminAccount())
            return true;

        return context.CanAccessModuleAction(funcName: "thamso_restore", "view");
    }

    // ── AccessGate integration ──────────────────────────────────────

    private const string AccessGateKey = "__AccessGate";

    /// <summary>
    /// Get AccessGate from request context (async version — preferred for new code).
    /// Builds and caches on first call per request.
    /// </summary>
    public static async Task<AccessGate> GetAccessGateAsync(this ServerCallContext? context)
    {
        if (context == null) return AccessGate.Empty;

        // Check if already built (per-request cache via HttpContext.Items)
        var httpContext = context.GetHttpContext();
        if (httpContext.Items.TryGetValue(AccessGateKey, out var cached) && cached is AccessGate gate)
            return gate;

        // Build from UserPermissionCache
        var userName = context.GetUserName();
        var userId = context.GetUserID();
        gate = await AccessGateBuilder.BuildFromCacheAsync(userId ?? "", userName, context.GetAccountRole());

        // Cache for the rest of this request
        httpContext.Items[AccessGateKey] = gate;
        return gate;
    }

    /// <summary>
    /// Get AccessGate from request context (sync version — for gradual migration).
    /// If not yet built, builds synchronously from cache.
    /// Prefer <see cref="GetAccessGateAsync"/> in new code.
    /// </summary>
    public static AccessGate GetAccessGate(this ServerCallContext? context)
    {
        if (context == null) return AccessGate.Empty;

        var httpContext = context.GetHttpContext();
        if (httpContext.Items.TryGetValue(AccessGateKey, out var cached) && cached is AccessGate gate)
            return gate;

        // Sync fallback — safe for migration, not ideal for perf
        var userName = context.GetUserName();
        var userId = context.GetUserID();
        gate = AccessGateBuilder.BuildFromCacheAsync(userId ?? "", userName, context.GetAccountRole()).GetAwaiter().GetResult();

        httpContext.Items[AccessGateKey] = gate;
        return gate;
    }

    private static void AuditSuperAdminBypass(ServerCallContext? context, string target)
    {
        var userId = context.GetUserID() ?? "(unknown)";
        var userName = context.GetUserName() ?? "(unknown)";
        var method = context?.Method ?? "(unknown)";

        Global.Logger?.LogWarning(
            "[AUTHZ_SUPERADMIN_BYPASS] UserId={UserId} UserName={UserName} Method={Method} Target={Target}",
            userId,
            userName,
            method,
            target);

        AuthorizationAudit.WriteSuperAdminBypass(userId, userName, method, target);
    }
}
