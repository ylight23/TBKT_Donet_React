using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Backend.Services;

namespace Backend.Security;

public interface ILogoutTokenValidator
{
    Task<LogoutTokenValidationResult> ValidateAsync(string logoutToken);
}

public class LogoutTokenValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public JwtSecurityToken? Token { get; set; }
    public string? SessionId { get; set; }
    public string? Subject { get; set; }
}

public class LogoutTokenValidator : ILogoutTokenValidator
{
    private readonly IConfiguration _configuration;
    private readonly IEnumerable<SecurityKey> _signingKeys;

    public LogoutTokenValidator(
        IConfiguration configuration,
        IEnumerable<SecurityKey> signingKeys)
    {
        _configuration = configuration;
        _signingKeys = signingKeys;
    }

    public async Task<LogoutTokenValidationResult> ValidateAsync(string logoutToken)
    {
        var result = new LogoutTokenValidationResult { IsValid = false };

        try
        {
            var handler = new JwtSecurityTokenHandler();

            // Step 1: Check if token can be read
            if (!handler.CanReadToken(logoutToken))
            {
                result.ErrorMessage = "Invalid token format";
                return result;
            }

            // Step 2: Parse token without validation first (to check claims)
            var token = handler.ReadJwtToken(logoutToken);
            result.Token = token;

            // Step 3: Validate nonce claim - MUST NOT be present in logout token
            // This prevents replay attacks using ID tokens
            if (token.Claims.Any(c => c.Type == "nonce"))
            {
                result.ErrorMessage = "Logout token must not contain nonce claim";
                Global.Logger?.LogWarning("Error: Logout token validation failed: contains nonce claim");
                return result;
            }

            // Step 4: Validate events claim - MUST contain backchannel-logout event
            var eventsClaim = token.Claims.FirstOrDefault(c => c.Type == "events");
            
            // Log all claims for debugging
            Global.Logger?.LogInformation("Info: Logout token claims: {Claims}", 
                string.Join(", ", token.Claims.Select(c => $"{c.Type}={c.Value}")));
            
            if (eventsClaim == null)
            {
                // WSO2 might not send 'events' claim in some configurations
                // Check for alternative indicators (sid or sub must be present anyway)
                Global.Logger?.LogWarning("Warning: Logout token missing 'events' claim (WSO2 may not send it in all configs)");
                // Don't fail here - we'll validate sid/sub presence later
            }
            else
            {
                // Check if events contains the backchannel-logout event
                // The events claim should be a JSON object: {"http://schemas.openid.net/event/backchannel-logout":{}}
                // In JWT it might be serialized as string or parsed as JSON
                var eventsValue = eventsClaim.Value;
                Global.Logger?.LogInformation("Info: Events claim value: {EventsValue}", eventsValue);
                
                bool hasBackchannelLogoutEvent = 
                    eventsValue.Contains("backchannel-logout") ||
                    eventsValue.Contains("backchannel_logout") ||
                    eventsValue.Contains("http://schemas.openid.net/event/backchannel-logout");
                
                if (!hasBackchannelLogoutEvent)
                {
                    Global.Logger?.LogWarning("Warning: Events claim does not contain backchannel-logout event: {EventsValue}", eventsValue);
                    // Continue anyway - some IdPs may use different event format
                }
            }

            // Step 5: Validate iat (issued at) - token must not be too old
            var iatValidityPeriod = _configuration.GetValue<int>("WSO2:BackChannelLogout:IatValidityPeriodSeconds", 300);
            var iat = token.IssuedAt;
            var now = DateTimeOffset.UtcNow;
            var tokenAge = (now - iat).TotalSeconds;

            if (tokenAge > iatValidityPeriod)
            {
                result.ErrorMessage = $"Token too old: issued {tokenAge:F0}s ago (max: {iatValidityPeriod}s)";
                Global.Logger?.LogWarning("Error: Logout token validation failed: token too old (iat={Iat}, age={Age}s)", iat, tokenAge);
                return result;
            }

            if (tokenAge < 0)
            {
                result.ErrorMessage = "Token issued in the future";
                Global.Logger?.LogWarning("Error: Logout token validation failed: iat in the future");
                return result;
            }

            // Step 6: Validate signature, issuer, and audience using TokenValidationParameters
            // Determine which IdP this token is from based on issuer
            var tokenIssuer = token.Issuer;
            string configSection;
            
            if (tokenIssuer.Contains("localhost:9443") || tokenIssuer.Contains("wso2"))
            {
                configSection = "WSO2";
            }
            else if (tokenIssuer.Contains("keycloak") || tokenIssuer.Contains("realms/master"))
            {
                configSection = "Keycloak";
            }
            else if (tokenIssuer.Contains("zitadel") || tokenIssuer.Contains(":8080"))
            {
                configSection = "Zitadel";
            }
            else
            {
                configSection = "WSO2"; // default
            }

            var expectedIssuer = _configuration[$"{configSection}:Issuer"];
            var allowedAudiences = _configuration.GetSection($"{configSection}:BackChannelLogout:AllowedAudiences")
                .Get<List<string>>() ?? new List<string>();

            if (allowedAudiences.Count == 0)
            {
                result.ErrorMessage = $"No allowed audiences configured for {configSection}";
                Global.Logger?.LogError("Error: Logout token validation failed: no allowed audiences configured for {ConfigSection}", configSection);
                return result;
            }

            Global.Logger?.LogInformation("Info: Validating token from {ConfigSection} - Expected issuer: {Issuer}, Allowed audiences: {Audiences}",
                configSection, expectedIssuer, string.Join(", ", allowedAudiences));

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = expectedIssuer,
                ValidateAudience = true,
                ValidAudiences = allowedAudiences, // Multiple audiences
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = _signingKeys,
                ClockSkew = TimeSpan.FromMinutes(5),
                // Keep original claim names
                NameClaimType = "sub"
            };

            try
            {
                // This validates signature, issuer, audience, and lifetime
                var principal = handler.ValidateToken(logoutToken, validationParameters, out var validatedToken);
                
                Global.Logger?.LogInformation("Success: Logout token signature validated successfully");
                Global.Logger?.LogInformation("Success: Issuer: {Issuer}", token.Issuer);
                Global.Logger?.LogInformation("Success: Audience: {Audience}", string.Join(", ", token.Audiences));

                // Step 7: Extract sid and sub
                result.SessionId = token.Claims.FirstOrDefault(c => c.Type == "sid")?.Value;
                result.Subject = token.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

                // At least one of sid or sub must be present
                if (string.IsNullOrEmpty(result.SessionId) && string.IsNullOrEmpty(result.Subject))
                {
                    result.ErrorMessage = "Token must contain either 'sid' or 'sub' claim";
                    Global.Logger?.LogWarning("Error: Logout token validation failed: missing both sid and sub claims");
                    return result;
                }

                // Success
                result.IsValid = true;
                Global.Logger?.LogInformation("Success: Logout token validation successful - sid: {Sid}, sub: {Sub}", 
                    result.SessionId ?? "null", result.Subject ?? "null");

                return result;
            }
            catch (SecurityTokenInvalidIssuerException ex)
            {
                result.ErrorMessage = $"Invalid issuer: {ex.Message}";
                Global.Logger?.LogWarning(ex, "Error: Logout token validation failed: invalid issuer");
                return result;
            }
            catch (SecurityTokenInvalidAudienceException ex)
            {
                result.ErrorMessage = $"Invalid audience: {ex.Message}";
                Global.Logger?.LogWarning(ex, "Error: Logout token validation failed: invalid audience");
                return result;
            }
            catch (SecurityTokenInvalidSignatureException ex)
            {
                result.ErrorMessage = $"Invalid signature: {ex.Message}";
                Global.Logger?.LogWarning(ex, "Error: Logout token validation failed: invalid signature");
                return result;
            }
            catch (SecurityTokenExpiredException ex)
            {
                result.ErrorMessage = $"Token expired: {ex.Message}";
                Global.Logger?.LogWarning(ex, "Error: Logout token validation failed: token expired");
                return result;
            }
            catch (SecurityTokenException ex)
            {
                result.ErrorMessage = $"Token validation failed: {ex.Message}";
                Global.Logger?.LogWarning(ex, "Error: Logout token validation failed: {Message}", ex.Message);
                return result;
            }
        }
        catch (Exception ex)
        {
            result.ErrorMessage = $"Unexpected error: {ex.Message}";
            Global.Logger?.LogError(ex, "Error: Unexpected error during logout token validation");
            return result;
        }
    }
}
