using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

public record ExportTemplateRequest(string Key, string Name, string SchemaJson);

[ApiController]
[Route("api/export-template")]
public class ExportTemplateController : ControllerBase
{
    private readonly TemplateExportService _templateExportService;
    private readonly ILogger<ExportTemplateController> _logger;

    public ExportTemplateController(
        TemplateExportService templateExportService,
        ILogger<ExportTemplateController> logger)
    {
        _templateExportService = templateExportService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> ExportOne([FromBody] ExportTemplateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Key) || req.Key.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            return BadRequest(new { ok = false, message = "Template key khong hop le." });
        }

        try
        {
            var filePath = await _templateExportService.ExportOneAsync(
                new TemplateExportPayload(req.Key, req.Name, req.SchemaJson),
                HttpContext.RequestAborted);
            return Ok(new { ok = true, path = filePath });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ExportTemplate] Error writing file {Key}", req.Key);
            return StatusCode(500, new { ok = false, message = ex.Message });
        }
    }

    [HttpPost("all")]
    public async Task<IActionResult> ExportAll([FromBody] List<ExportTemplateRequest> items)
    {
        if (items == null || items.Count == 0)
        {
            return BadRequest(new { ok = false, message = "Danh sach rong." });
        }

        var (saved, errors) = await _templateExportService.ExportAllAsync(
            items.Select(item => new TemplateExportPayload(item.Key, item.Name, item.SchemaJson)),
            HttpContext.RequestAborted);

        return Ok(new { ok = errors.Count == 0, saved, errors });
    }

    [HttpDelete("{key}")]
    public async Task<IActionResult> DeleteOne(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            return BadRequest(new { ok = false, message = "Template key khong hop le." });
        }

        var filePath = Path.Combine(_templateExportService.OutputDir, $"{key}.json");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { ok = false, message = $"File {key}.json khong ton tai." });
        }

        try
        {
            await _templateExportService.DeleteOneAsync(key, HttpContext.RequestAborted);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ExportTemplate] Error deleting file {Key}", key);
            return StatusCode(500, new { ok = false, message = ex.Message });
        }
    }
}
