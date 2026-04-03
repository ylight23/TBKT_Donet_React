using System.Security.Claims;
using Grpc.Core;

namespace Backend.Security;

public class TokenRevocationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TokenRevocationMiddleware> _logger;

    public TokenRevocationMiddleware(RequestDelegate next, ILogger<TokenRevocationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITokenRevocationService revocationService)
    {
        var path = context.Request.Path.ToString();
        var method = context.Request.Method;

        _logger.LogInformation("[TokenRevocationMiddleware] Info: {Method} {Path}", method, path);

        var isAuthenticated = context.User.Identity?.IsAuthenticated == true;
        _logger.LogInformation("[TokenRevocationMiddleware] IsAuthenticated: {IsAuthenticated}", isAuthenticated);

        if (isAuthenticated)
        {
            var claims = context.User.Claims.Select(c => $"{c.Type}={c.Value}").ToArray();
            _logger.LogInformation("[TokenRevocationMiddleware] User claims: {Claims}", string.Join(", ", claims));

            var sid = context.User.FindFirst("sid")?.Value
                   ?? context.User.FindFirst("isk")?.Value;

            var sub = context.User.FindFirst("sub")?.Value;
            var iat = context.User.FindFirst("iat")?.Value;
            var jti = context.User.FindFirst("jti")?.Value;

            _logger.LogInformation("[TokenRevocationMiddleware] Session ID (sid/isk): {Sid}, Subject (sub): {Sub}, IssuedAt (iat): {Iat}, JWT ID (jti): {Jti}",
                sid ?? "null", sub ?? "null", iat ?? "null", jti ?? "null");

            if (string.IsNullOrEmpty(sub))
            {
                _logger.LogError("Error: CRITICAL: Authenticated user has no 'sub' claim! Back-channel logout revocation will NOT work!");
            }

            if (!string.IsNullOrEmpty(sid))
            {
                var isRevoked = await revocationService.IsSessionRevokedAsync(sid);
                _logger.LogInformation("[TokenRevocationMiddleware] Session {Sid} revoked? {IsRevoked}", sid, isRevoked);

                if (isRevoked)
                {
                    _logger.LogWarning("Error: BLOCKED: Request rejected because Session ID {sid} is in the revocation list.", sid);

                    bool isGrpcRequest = context.Request.Path.StartsWithSegments("/Employee.EmployeeService") ||
                                        context.Request.Path.StartsWithSegments("/Office.OfficeService") ||
                                        context.Request.Path.StartsWithSegments("/Catalog.CatalogService") ||
                                        context.Request.ContentType?.Contains("application/grpc") == true;

                    if (isGrpcRequest)
                    {
                        _logger.LogInformation("[TokenRevocationMiddleware] Setting gRPC status headers: code=16 (Unauthenticated)");
                        context.Response.StatusCode = 200;
                        context.Response.ContentType = "application/grpc";
                        context.Response.Headers["grpc-status"] = "16";
                        context.Response.Headers["grpc-message"] = "Session revoked";
                        await context.Response.CompleteAsync();
                        return;
                    }

                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Session revoked");
                    return;
                }
            }

            if (!string.IsNullOrEmpty(sub))
            {
                var iatClaim = context.User.FindFirst("iat")?.Value;
                long tokenIssuedAt = 0;

                if (!string.IsNullOrEmpty(iatClaim) && long.TryParse(iatClaim, out var parsedIat))
                {
                    tokenIssuedAt = parsedIat;
                }
                else
                {
                    _logger.LogWarning("Warning: Token missing 'iat' claim, falling back to simple revocation check");
                }

                bool isRevoked;
                if (tokenIssuedAt > 0)
                {
                    isRevoked = await revocationService.IsSubjectRevokedBeforeAsync(sub, tokenIssuedAt);
                    _logger.LogInformation("[TokenRevocationMiddleware] Subject {Sub} revoked before token iat={Iat}? {IsRevoked}", sub, tokenIssuedAt, isRevoked);
                }
                else
                {
                    isRevoked = await revocationService.IsSubjectRevokedAsync(sub);
                    _logger.LogInformation("[TokenRevocationMiddleware] Subject {Sub} revoked? {IsRevoked}", sub, isRevoked);
                }

                if (isRevoked)
                {
                    _logger.LogWarning("Error: BLOCKED: Request rejected because Subject {sub} is in the revocation list.", sub);

                    bool isGrpcRequest = context.Request.Path.StartsWithSegments("/Employee.EmployeeService") ||
                                        context.Request.Path.StartsWithSegments("/Office.OfficeService") ||
                                        context.Request.Path.StartsWithSegments("/Catalog.CatalogService") ||
                                        context.Request.ContentType?.Contains("application/grpc") == true;

                    if (isGrpcRequest)
                    {
                        _logger.LogInformation("Info: Setting gRPC status headers: code=16 (Unauthenticated)");
                        context.Response.StatusCode = 200;
                        context.Response.ContentType = "application/grpc";
                        context.Response.Headers["grpc-status"] = "16";
                        context.Response.Headers["grpc-message"] = "Session revoked";
                        await context.Response.CompleteAsync();
                        return;
                    }

                    _logger.LogInformation("Info: [TokenRevocationMiddleware] Returning HTTP 401");
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Session revoked");
                    return;
                }
            }

            if (string.IsNullOrEmpty(sid) && string.IsNullOrEmpty(sub))
            {
                _logger.LogWarning(
                    "Warning: User authenticated but SID/ISK and SUB claims are missing. Claims: {claims}",
                    string.Join(", ", context.User.Claims.Select(c => c.Type)));
            }
            else
            {
                _logger.LogInformation("Success: Token validation passed for sid={Sid}, sub={Sub}", sid ?? "null", sub ?? "null");
            }
        }
        else
        {
            _logger.LogInformation("Info: Unauthenticated request, skipping revocation check");
        }

        await _next(context);
        _logger.LogInformation("[TokenRevocationMiddleware] Success: Request completed: {Method} {Path} -> {StatusCode}",
            method, path, context.Response.StatusCode);
    }
}
