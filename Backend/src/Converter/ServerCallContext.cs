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
            var claim = claims?.FirstOrDefault(c => c.Type == "UserID");
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
            return claims?.FirstOrDefault(c=>c.Type == "UserName")?.Value + string.Empty; 
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
    } 
}