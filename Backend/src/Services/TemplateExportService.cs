using System.Text.Json;
using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Grpc.Core;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public sealed record TemplateExportPayload(string Key, string Name, string SchemaJson);

public class TemplateExportService(
    IConfiguration config,
    IWebHostEnvironment env,
    ILogger<TemplateExportService> logger)
{
    private const string PermissionCode = "config.template";

    private readonly string _outputDir = string.IsNullOrWhiteSpace(config["TemplateExportPath"])
        ? Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "Frontend_TBKT", "public", "templates"))
        : Path.GetFullPath(config["TemplateExportPath"]!);

    public string OutputDir => _outputDir;

    public async Task<string> ExportOneAsync(TemplateExportPayload payload, CancellationToken cancellationToken = default)
    {
        var (key, name, schemaJson) = ValidatePayload(payload);
        Directory.CreateDirectory(_outputDir);

        var filePath = Path.Combine(_outputDir, $"{key}.json");
        var json = JsonSerializer.Serialize(new
        {
            key,
            name,
            schemaJson,
        }, new JsonSerializerOptions { WriteIndented = true });

        await File.WriteAllTextAsync(filePath, json, cancellationToken);
        logger.LogInformation("[TemplateExport] Wrote {File}", filePath);
        return filePath;
    }

    public async Task<(List<string> saved, List<string> errors)> ExportAllAsync(
        IEnumerable<TemplateExportPayload> payloads,
        CancellationToken cancellationToken = default)
    {
        var saved = new List<string>();
        var errors = new List<string>();

        foreach (var payload in payloads)
        {
            try
            {
                await ExportOneAsync(payload, cancellationToken);
                saved.Add(payload.Key);
            }
            catch (Exception ex)
            {
                errors.Add($"{payload.Key}: {ex.Message}");
                logger.LogError(ex, "[TemplateExport] Error writing template {Key}", payload.Key);
            }
        }

        return (saved, errors);
    }

    public async Task StreamExportTemplateLayoutsAsync(
        ExportTemplateLayoutsRequest request,
        IServerStreamWriter<JobProgressEvent> responseStream,
        ServerCallContext context)
    {
        if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
        {
            throw new RpcException(new Grpc.Core.Status(StatusCode.PermissionDenied, "Khong co quyen export template layout"));
        }

        var docs = await ResolveTemplateDocsAsync(request, context.CancellationToken);
        var jobId = Guid.NewGuid().ToString();

        await WriteEventAsync(responseStream, new JobProgressEvent
        {
            JobId = jobId,
            Stage = "STARTED",
            Message = "Bat dau export template ra file static",
            Total = docs.Count,
            Done = false,
            Success = false,
            Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
        });

        if (docs.Count == 0)
        {
            await WriteEventAsync(responseStream, new JobProgressEvent
            {
                JobId = jobId,
                Stage = "COMPLETED",
                Message = "Khong co template nao de export",
                Total = 0,
                Done = true,
                Success = true,
                Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
            });
            return;
        }

        Directory.CreateDirectory(_outputDir);
        var warnings = new List<string>();
        var processed = 0;

        foreach (var doc in docs)
        {
            context.CancellationToken.ThrowIfCancellationRequested();
            var key = doc.StringOr("Key");

            try
            {
                await ExportOneAsync(new TemplateExportPayload(
                    key,
                    doc.StringOr("Name"),
                    doc.StringOr("SchemaJson", "{}")), context.CancellationToken);

                processed++;
                await WriteEventAsync(responseStream, new JobProgressEvent
                {
                    JobId = jobId,
                    Stage = "PROGRESS",
                    Message = $"Da export {key}",
                    CurrentKey = key,
                    Processed = processed,
                    Total = docs.Count,
                    Done = false,
                    Success = false,
                    Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
                });
            }
            catch (Exception ex)
            {
                var warning = $"{key}: {ex.Message}";
                warnings.Add(warning);
                await WriteEventAsync(responseStream, new JobProgressEvent
                {
                    JobId = jobId,
                    Stage = "WARNING",
                    Message = $"Khong the export {key}",
                    CurrentKey = key,
                    Processed = processed,
                    Total = docs.Count,
                    Warnings = { warning },
                    Done = false,
                    Success = false,
                    Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
                });
            }
        }

        await WriteEventAsync(responseStream, new JobProgressEvent
        {
            JobId = jobId,
            Stage = warnings.Count == 0 ? "COMPLETED" : "COMPLETED_WITH_WARNINGS",
            Message = warnings.Count == 0
                ? $"Da export {processed}/{docs.Count} template"
                : $"Da export {processed}/{docs.Count} template, co {warnings.Count} canh bao",
            Processed = processed,
            Total = docs.Count,
            Warnings = { warnings },
            Done = true,
            Success = warnings.Count == 0,
            Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
        });
    }

    public async Task DeleteOneAsync(string key, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key) || key.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            throw new InvalidOperationException("Template key khong hop le.");
        }

        var filePath = Path.Combine(_outputDir, $"{key}.json");
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File {key}.json khong ton tai.", filePath);
        }

        await Task.Run(() => File.Delete(filePath), cancellationToken);
        logger.LogInformation("[TemplateExport] Deleted {File}", filePath);
    }

    private async Task<List<BsonDocument>> ResolveTemplateDocsAsync(ExportTemplateLayoutsRequest request, CancellationToken cancellationToken)
    {
        var ids = request.Ids
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

        var filter = MongoDocumentHelpers.NotDeleted;
        if (request.OnlyPublished)
        {
            filter &= Builders<BsonDocument>.Filter.Eq("Published", true);
        }

        if (ids.Count > 0)
        {
            filter &= Builders<BsonDocument>.Filter.In("_id", ids);
        }

        return await Global.CollectionBsonTemplateLayout!
            .Find(filter)
            .Sort(Builders<BsonDocument>.Sort.Ascending("Key"))
            .ToListAsync(cancellationToken);
    }

    private static TemplateExportPayload ValidatePayload(TemplateExportPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.Key) || payload.Key.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            throw new InvalidOperationException("Template key khong hop le.");
        }

        return payload with
        {
            Key = payload.Key.Trim(),
            Name = payload.Name?.Trim() ?? string.Empty,
            SchemaJson = string.IsNullOrWhiteSpace(payload.SchemaJson) ? "{}" : payload.SchemaJson,
        };
    }

    private static Task WriteEventAsync(IServerStreamWriter<JobProgressEvent> responseStream, JobProgressEvent item)
        => responseStream.WriteAsync(item);
}
