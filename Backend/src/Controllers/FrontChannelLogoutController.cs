using Backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>
/// Front-Channel Logout Controller
/// Handles OIDC Front-Channel Logout requests from Identity Provider
/// https://openid.net/specs/openid-connect-frontchannel-1_0.html
/// </summary>
[ApiController]
[Route("frontchannel")]
public class FrontChannelLogoutController : ControllerBase
{
    private readonly ITokenRevocationService _revocationService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FrontChannelLogoutController> _logger;

    public FrontChannelLogoutController(
        ITokenRevocationService revocationService,
        IConfiguration configuration,
        ILogger<FrontChannelLogoutController> logger)
    {
        _revocationService = revocationService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Front-Channel Logout Endpoint
    /// Called by IdP via iframe when user logs out
    /// </summary>
    /// <param name="iss">Issuer identifier (validates request is from trusted IdP)</param>
    /// <param name="sid">Session ID to logout (optional, can be empty for subject-wide logout)</param>
    [HttpGet("logout")]
    [AllowAnonymous] // IdP calls this via iframe, no authentication
    public async Task<IActionResult> Logout([FromQuery] string? iss, [FromQuery] string? sid)
    {
        _logger.LogInformation("Info: Front-channel logout request received - iss: {Iss}, sid: {Sid}",
            iss ?? "null", sid ?? "null");

        // Validate issuer
        if (string.IsNullOrEmpty(iss))
        {
            _logger.LogWarning("Warning: Missing issuer in front-channel logout request");
            return BadRequest("Missing issuer");
        }

        // Verify issuer is one of our trusted IdPs
        var trustedIssuers = new[]
        {
            _configuration["WSO2:Issuer"],
            _configuration["Keycloak:Issuer"],
            _configuration["Zitadel:Issuer"]
        }.Where(x => !string.IsNullOrEmpty(x)).ToList();

        if (!trustedIssuers.Any(trusted => iss.Equals(trusted, StringComparison.OrdinalIgnoreCase)))
        {
            _logger.LogWarning("Warning: Untrusted issuer in front-channel logout: {Iss}", iss);
            return BadRequest("Untrusted issuer");
        }

        // Revoke session if sid provided
        if (!string.IsNullOrEmpty(sid))
        {
            await _revocationService.RevokeSessionAsync(sid);
            _logger.LogInformation("Success: Session {Sid} revoked via front-channel", sid);
        }

        // Return minimal HTML that can trigger client-side logout
        // This HTML will be loaded in an iframe by the IdP
        var html = @"<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <title>Logging out...</title>
    <script>
        // Signal to parent window (if accessible) that logout occurred
        try {
            if (window.opener) {
                window.opener.postMessage({ 
                    type: 'frontchannel-logout', 
                    sid: '" + sid + @"' 
                }, '*');
            }
        } catch (e) {
            console.log('Cannot access parent window:', e);
        }
        
        // For debugging
        console.log('[Front-Channel] Logout iframe loaded - sid: " + sid + @"');
    </script>
</head>
<body style=""display:none;"">
    <!-- Hidden iframe for front-channel logout -->
</body>
</html>";

        return Content(html, "text/html");
    }
}
