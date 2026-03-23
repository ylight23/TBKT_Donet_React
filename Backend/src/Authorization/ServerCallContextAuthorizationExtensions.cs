using Backend.Services;
using Grpc.Core;

namespace Backend.Authorization;

public static class ServerCallContextAuthorizationExtensions
{
    public static bool CanAccessModule(this ServerCallContext? context, string maPhanHe)
    {
        if (context == null) return false;
        var userName = context.GetUserName();
        if (userName == "superadmin" || userName == "admin")
            return true;
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId)) return false;
        return Global.CanAccessComponent(userId, maPhanHe);
    }

    public static bool CanAccessModuleAction(this ServerCallContext? context, string maPhanHe, string funcName, params string[]? actions)
    {
        if (context == null) return false;
        var userName = context.GetUserName();
        if (userName == "superadmin" || userName == "admin")
            return true;
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId)) return false;
        return Global.CanAccessComponentAction(userId, maPhanHe, funcName, actions);
    }

    public static bool CanAccessModuleAction(this ServerCallContext? context, string funcName, params string[]? actions)
    {
        if (context == null) return false;
        var userName = context.GetUserName();
        if (userName == "superadmin" || userName == "admin")
            return true;
        var userId = context.GetUserID();
        if (string.IsNullOrEmpty(userId)) return false;
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

        var userName = context.GetUserName();
        if (userName == "superadmin")
            return true;

        return context.CanAccessModuleAction(funcName: "thamso_restore", "view");
    }
}
