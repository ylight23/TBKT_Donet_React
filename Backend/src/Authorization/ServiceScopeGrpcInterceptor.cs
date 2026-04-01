using Backend.Services;
using Grpc.Core;
using Grpc.Core.Interceptors;

namespace Backend.Authorization;

/// <summary>
/// Enforce service-scope access for every gRPC endpoint call (unary + streaming).
/// This is the runtime guard layer so individual services do not need to duplicate checks.
/// </summary>
public sealed class ServiceScopeGrpcInterceptor : Interceptor
{
    private readonly ILogger<ServiceScopeGrpcInterceptor> _logger;

    public ServiceScopeGrpcInterceptor(ILogger<ServiceScopeGrpcInterceptor> logger)
    {
        _logger = logger;
    }

    public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request,
        ServerCallContext context,
        UnaryServerMethod<TRequest, TResponse> continuation)
    {
        EnsureServiceScope(context);
        return await continuation(request, context);
    }

    public override async Task<TResponse> ClientStreamingServerHandler<TRequest, TResponse>(
        IAsyncStreamReader<TRequest> requestStream,
        ServerCallContext context,
        ClientStreamingServerMethod<TRequest, TResponse> continuation)
    {
        EnsureServiceScope(context);
        return await continuation(requestStream, context);
    }

    public override async Task ServerStreamingServerHandler<TRequest, TResponse>(
        TRequest request,
        IServerStreamWriter<TResponse> responseStream,
        ServerCallContext context,
        ServerStreamingServerMethod<TRequest, TResponse> continuation)
    {
        EnsureServiceScope(context);
        await continuation(request, responseStream, context);
    }

    public override async Task DuplexStreamingServerHandler<TRequest, TResponse>(
        IAsyncStreamReader<TRequest> requestStream,
        IServerStreamWriter<TResponse> responseStream,
        ServerCallContext context,
        DuplexStreamingServerMethod<TRequest, TResponse> continuation)
    {
        EnsureServiceScope(context);
        await continuation(requestStream, responseStream, context);
    }

    private void EnsureServiceScope(ServerCallContext context)
    {
        var maPhanHe = ResolveMaPhanHeFromMethod(context.Method);
        var gate = context.GetAccessGate();
        if (gate.IsSuperAdmin)
        {
            var userId = context.GetUserID() ?? "(unknown)";
            var userName = context.GetUserName() ?? "(unknown)";
            _logger.LogWarning(
                "[AUTHZ_SUPERADMIN_BYPASS] UserId={UserId}, UserName={UserName}, Method={Method}, MaPhanHe={MaPhanHe}",
                userId,
                userName,
                context.Method,
                maPhanHe);
            AuthorizationAudit.WriteSuperAdminBypass(
                userId,
                userName,
                context.Method,
                $"servicescope:{maPhanHe}");
            return;
        }

        // Current system still runs as one business module externally.
        if (context.CanAccessServiceScope(maPhanHe))
            return;

        var deniedUserId = context.GetUserID() ?? "(unknown)";
        var serviceScope = ServiceScopeResolver.ResolveServiceScope(maPhanHe);

        _logger.LogWarning(
            "Service-scope denied. UserId={UserId}, Method={Method}, MaPhanHe={MaPhanHe}, ServiceScope={ServiceScope}",
            deniedUserId,
            context.Method,
            maPhanHe,
            serviceScope);

        throw new RpcException(new Status(
            StatusCode.PermissionDenied,
            $"Khong co quyen truy cap service scope '{serviceScope}'."));
    }

    private static string ResolveMaPhanHeFromMethod(string? grpcMethod)
    {
        // Kept as extension point for future microservice split by service prefix.
        if (string.IsNullOrWhiteSpace(grpcMethod))
            return Global.UnifiedMaPhanHe;

        return Global.UnifiedMaPhanHe;
    }
}
