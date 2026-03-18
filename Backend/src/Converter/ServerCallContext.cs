using Backend.Services;
using Grpc.Core;

namespace Backend.Converter {
    public static class ServerCallContextExtends
    { 
        public static string? GetUserID(this ServerCallContext? context)
        {
            if (context == null)
                return null;
            var httpContext = context.GetHttpContext();
            var claims = httpContext?.User?.Claims;
            // Ưu tiên custom claim "UserID", fallback sang "sub" (OIDC/SSO standard)
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
            return !string.IsNullOrEmpty(claim?.Value) ? Converter.ToInt(claim?.Value) : null;
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
            if (context == null)
                return null;
            var httpContext = context.GetHttpContext();
            var claims = httpContext?.User?.Claims;
            // WSO2 JWT uses "username" (lowercase), fall back to "UserName" for backward compat
            return (claims?.FirstOrDefault(c => c.Type == "username")
                 ?? claims?.FirstOrDefault(c => c.Type == "UserName"))?.Value + string.Empty;
        }
        public static string? GetUserFullName(this ServerCallContext? context)
        {
            if (context == null)
                return null;
            var httpContext = context.GetHttpContext();
            var claims = httpContext?.User?.Claims;
            return claims?.FirstOrDefault(c=>c.Type == "FullName")?.Value + string.Empty;
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

        // ── Phân quyền: kiểm tra quyền truy cập phân hệ ──────────────────
        public static bool CanAccessComponent(this ServerCallContext? context, string maPhanHe)
        {
            if (context == null) return false;
            var userName = context.GetUserName();
            if (userName == "superadmin" || userName == "admin")
                return true;
            var userId = context.GetUserID();
            if (string.IsNullOrEmpty(userId)) return false;
            return Global.CanAccessComponent(userId, maPhanHe);
        }

        // ── Phân quyền: kiểm tra quyền thao tác (với MaPhanHe) ────────────
        public static bool CanAccessComponentAction(this ServerCallContext? context, string maPhanHe, string funcName, params string[]? actions)
        {
            if (context == null) return false;
            var userName = context.GetUserName();
            if (userName == "superadmin" || userName == "admin")
                return true;
            var userId = context.GetUserID();
            if (string.IsNullOrEmpty(userId)) return false;
            return Global.CanAccessComponentAction(userId, maPhanHe, funcName, actions);
        }

        // ── Phân quyền: kiểm tra quyền thao tác (bất kỳ MaPhanHe) ────────
        public static bool CanAccessComponentAction(this ServerCallContext? context, string funcName, params string[]? actions)
        {
            if (context == null) return false;
            var userName = context.GetUserName();
            if (userName == "superadmin" || userName == "admin")
                return true;
            var userId = context.GetUserID();
            if (string.IsNullOrEmpty(userId)) return false;
            return Global.CanAccessComponentAction(userId, funcName, actions);
        }

        public static bool CanView(this ServerCallContext? context, string funcName)
        {
            return context.CanAccessComponentAction(funcName: funcName, "view");
        }

        public static bool CanSave(this ServerCallContext? context, string funcName)
        {
            return context.CanAccessComponentAction(funcName: funcName, "edit", "add");
        }

        public static bool CanDelete(this ServerCallContext? context, string funcName)
        {
            return context.CanAccessComponentAction(funcName: funcName, "delete");
        }

        public static bool CanApprove(this ServerCallContext? context, string funcName)
        {
            return context.CanAccessComponentAction(funcName: funcName, "approve");
        }

        public static bool CanUnapprove(this ServerCallContext? context, string funcName)
        {
            return context.CanAccessComponentAction(funcName: funcName, "unapprove");
        }
    } 
}