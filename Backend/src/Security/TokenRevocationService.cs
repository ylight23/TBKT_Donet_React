using Microsoft.Extensions.Caching.Memory;
using Backend.Services;

namespace Backend.Security;

public interface ITokenRevocationService
{
    Task RevokeSessionAsync(string sessionId);
    Task<bool> IsSessionRevokedAsync(string sessionId);

    Task RevokeSubjectAsync(string subject);
    Task<bool> IsSubjectRevokedAsync(string subject);
    
    /// <summary>
    /// Check if subject was revoked BEFORE the given token issued time.
    /// Returns false if token was issued AFTER revocation (new login).
    /// </summary>
    Task<bool> IsSubjectRevokedBeforeAsync(string subject, long tokenIssuedAtUnixTimestamp);
}

public class TokenRevocationService : ITokenRevocationService
{
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan DefaultRevocationTtl = TimeSpan.FromHours(1);

    public TokenRevocationService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task RevokeSessionAsync(string sessionId)
    {
        // Store the revoked session ID with current timestamp
        var revokedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        _cache.Set($"revoked_session_{sessionId}", revokedAtUtc, DefaultRevocationTtl);
        
        Global.Logger?.LogInformation("Info: Session {SessionId} revoked and cached (Front-Channel Logout)", sessionId);
        
        return Task.CompletedTask;
    }

    public Task<bool> IsSessionRevokedAsync(string sessionId)
    {
        return Task.FromResult(_cache.TryGetValue($"revoked_session_{sessionId}", out _));
    }

    public Task RevokeSubjectAsync(string subject)
    {
        // Store the timestamp when this subject was revoked
        var revokedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        _cache.Set($"revoked_sub_{subject}", revokedAtUtc, DefaultRevocationTtl);
        
        Global.Logger?.LogInformation("Info: Subject {Subject} revoked and cached (Front-Channel Logout)", subject);
        
        return Task.CompletedTask;
    }

    public Task<bool> IsSubjectRevokedAsync(string subject)
    {
        return Task.FromResult(_cache.TryGetValue($"revoked_sub_{subject}", out _));
    }
    
    public Task<bool> IsSubjectRevokedBeforeAsync(string subject, long tokenIssuedAtUnixTimestamp)
    {
        if (!_cache.TryGetValue($"revoked_sub_{subject}", out object? value))
        {
            // Not revoked at all
            return Task.FromResult(false);
        }
        
        if (value is not long revokedAtUtc)
        {
            // Invalid cache value, treat as revoked for safety
            return Task.FromResult(true);
        }
        
        // Token is revoked only if it was issued BEFORE the revocation time
        // If token issued AFTER revocation, it's a new login - allow it
        bool isRevoked = tokenIssuedAtUnixTimestamp < revokedAtUtc;
        return Task.FromResult(isRevoked);
    }
}
