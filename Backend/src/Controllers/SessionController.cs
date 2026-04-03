using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/session")]
public class SessionController : ControllerBase
{
    [HttpGet("ping")]
    [Authorize]
    public IActionResult Ping()
    {
        return Ok(new { ok = true });
    }
}
