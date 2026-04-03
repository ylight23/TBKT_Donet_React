using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;

namespace Backend.Hubs;

/// <summary>
/// SignalR Hub for real-time session notifications
/// Handles connection/disconnection and groups clients by session ID and subject
/// </summary>
[Authorize] // Require JWT authentication
public class SessionHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        var sessionId = Context.User?.FindFirst("sid")?.Value;
        var subject = Context.User?.FindFirst("sub")?.Value;
        
        Global.Logger?.LogInformation("Info: Client {ConnectionId} connected", connectionId);

        if (!string.IsNullOrEmpty(sessionId))
        {
            // Join group by session ID - for per-session logout
            await Groups.AddToGroupAsync(connectionId, $"session_{sessionId}");
            Global.Logger?.LogInformation("Success: Client {ConnectionId} joined session group: {SessionId}",
                connectionId, sessionId);
        }
        else
        {
            Global.Logger?.LogWarning("Warning: Client {ConnectionId} has no 'sid' claim in JWT", connectionId);
        }
        
        if (!string.IsNullOrEmpty(subject))
        {
            // Join group by subject - for user-wide logout (all sessions)
            await Groups.AddToGroupAsync(connectionId, $"subject_{subject}");
            Global.Logger?.LogInformation("Success: Client {ConnectionId} joined subject group: {Subject}",
                connectionId, subject);
        }
        else
        {
            Global.Logger?.LogWarning("Warning: Client {ConnectionId} has no 'sub' claim in JWT", connectionId);
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception != null)
        {
            Global.Logger?.LogWarning(exception, "Error: Client {ConnectionId} disconnected with error",
                Context.ConnectionId);
        }
        else
        {
            Global.Logger?.LogInformation("Info: Client {ConnectionId} disconnected normally",
                Context.ConnectionId);
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Optional: Client can call this to verify connection is alive
    /// </summary>
    public Task Ping()
    {
        Global.Logger?.LogDebug("Debug: Ping received from {ConnectionId}", Context.ConnectionId);
        return Task.CompletedTask;
    }
}
