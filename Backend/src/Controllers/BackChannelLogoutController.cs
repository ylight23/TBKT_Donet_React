using Backend.Security;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/backchannel")]
public class BackChannelLogoutController : ControllerBase
{
    private readonly ITokenRevocationService _revocationService;
    private readonly ILogoutTokenValidator _tokenValidator;

    public BackChannelLogoutController(
        ITokenRevocationService revocationService,
        ILogoutTokenValidator tokenValidator)
    {
        _revocationService = revocationService;
        _tokenValidator = tokenValidator;
    }

    [HttpPost("logout")]
    [Consumes("application/x-www-form-urlencoded")]
    [AllowAnonymous] // IdP calls this, not an authenticated user
    public async Task<IActionResult> Logout([FromForm(Name = "logout_token")] string logoutToken)
    {
        if (string.IsNullOrEmpty(logoutToken))
        {
            Global.Logger?.LogWarning("Error: Received empty logout_token");
            return BadRequest(new { error = "invalid_request", error_description = "logout_token is required" });
        }

        Global.Logger?.LogInformation("Info: Received back-channel logout request");

        // Validate the logout token according to OIDC Back-Channel Logout spec
        // https://openid.net/specs/openid-connect-backchannel-1_0.html#Validation
        var validationResult = await _tokenValidator.ValidateAsync(logoutToken);

        if (!validationResult.IsValid)
        {
            Global.Logger?.LogWarning("Error: Logout token validation failed: {Error}", validationResult.ErrorMessage);
            return BadRequest(new { error = "invalid_token", error_description = validationResult.ErrorMessage });
        }

        Global.Logger?.LogInformation("Success: Logout token validation passed");

        // Extract Session ID (sid) and Subject (sub)
        var sid = validationResult.SessionId;
        var sub = validationResult.Subject;

        try
        {
            // Revoke session if sid is present
            if (!string.IsNullOrEmpty(sid))
            {
                Global.Logger?.LogInformation("Info: Revoking session: {Sid} at {Timestamp}", sid, DateTimeOffset.UtcNow);
                await _revocationService.RevokeSessionAsync(sid);
                Global.Logger?.LogInformation("Success: Session {Sid} revoked successfully", sid);
            }

            // Revoke subject (all sessions for this user) if sub is present
            if (!string.IsNullOrEmpty(sub))
            {
                Global.Logger?.LogInformation("Info: Revoking all sessions for subject: {Sub} at {Timestamp}", sub, DateTimeOffset.UtcNow);
                await _revocationService.RevokeSubjectAsync(sub);
                Global.Logger?.LogInformation("Success: Subject {Sub} revoked successfully", sub);
            }

            Global.Logger?.LogInformation("Success: Back-channel logout completed successfully - sid: {Sid}, sub: {Sub}",
                sid ?? "null", sub ?? "null");

            // Return 200 OK to confirm successful processing to the IdP
            return Ok();
        }
        catch (Exception ex)
        {
            Global.Logger?.LogError(ex, "Error: Error during session/subject revocation");
            // Return 500 to signal IdP that logout failed (IdP may retry)
            return StatusCode(500, new { error = "server_error", error_description = "Failed to revoke session" });
        }
    }
}
