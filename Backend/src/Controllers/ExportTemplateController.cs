using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

public record ExportTemplateRequest(string Key, string Name, string SchemaJson);

[ApiController]
[Route("api/export-template")]
public class ExportTemplateController : ControllerBase
{
    private readonly string _outputDir;
    private readonly ILogger<ExportTemplateController> _logger;

    public ExportTemplateController(
        IConfiguration config,
        IWebHostEnvironment env,
        ILogger<ExportTemplateController> logger)
    {
        _logger = logger;
        var configuredPath = config["TemplateExportPath"];
        // ContentRootPath = .../Backend/src  →  ../../Frontend_TBKT/public/templates
        _outputDir = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..",
                "Frontend_TBKT", "public", "templates"))
            : Path.GetFullPath(configuredPath);
    }

    [HttpPost]
    public IActionResult ExportOne([FromBody] ExportTemplateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Key) || req.Key.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            return BadRequest(new { ok = false, message = "Template key không hợp lệ." });

        try
        {
            Directory.CreateDirectory(_outputDir);
            var filePath = Path.Combine(_outputDir, $"{req.Key}.json");
            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                key = req.Key,
                name = req.Name,
                schemaJson = req.SchemaJson,
            }, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });

            System.IO.File.WriteAllText(filePath, payload);
            _logger.LogInformation("[ExportTemplate] Wrote {File}", filePath);
            return Ok(new { ok = true, path = filePath });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ExportTemplate] Lỗi ghi file {Key}", req.Key);
            return StatusCode(500, new { ok = false, message = ex.Message });
        }
    }

    [HttpPost("all")]
    public IActionResult ExportAll([FromBody] List<ExportTemplateRequest> items)
    {
        if (items == null || items.Count == 0)
            return BadRequest(new { ok = false, message = "Danh sách rỗng." });

        var saved = new List<string>();
        var errors = new List<string>();

        Directory.CreateDirectory(_outputDir);

        foreach (var req in items)
        {
            if (string.IsNullOrWhiteSpace(req.Key) || req.Key.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            {
                errors.Add($"Key không hợp lệ: '{req.Key}'");
                continue;
            }
            try
            {
                var filePath = Path.Combine(_outputDir, $"{req.Key}.json");
                var payload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    key = req.Key,
                    name = req.Name,
                    schemaJson = req.SchemaJson,
                }, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });

                System.IO.File.WriteAllText(filePath, payload);
                saved.Add(req.Key);
                _logger.LogInformation("[ExportTemplate] Wrote {File}", filePath);
            }
            catch (Exception ex)
            {
                errors.Add($"{req.Key}: {ex.Message}");
                _logger.LogError(ex, "[ExportTemplate] Lỗi ghi file {Key}", req.Key);
            }
        }

        return Ok(new { ok = errors.Count == 0, saved, errors });
    }

    [HttpDelete("{key}")]
    public IActionResult DeleteOne(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            return BadRequest(new { ok = false, message = "Template key không hợp lệ." });

        var filePath = Path.Combine(_outputDir, $"{key}.json");
        if (!System.IO.File.Exists(filePath))
            return NotFound(new { ok = false, message = $"File {key}.json không tồn tại." });

        try
        {
            System.IO.File.Delete(filePath);
            _logger.LogInformation("[ExportTemplate] Deleted {File}", filePath);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ExportTemplate] Lỗi xoá file {Key}", key);
            return StatusCode(500, new { ok = false, message = ex.Message });
        }
    }
}
