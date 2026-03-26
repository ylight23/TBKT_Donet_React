using Backend.Authorization;
using Backend.Common.Protobuf;
using Google.Protobuf;
using Google.Protobuf.Collections;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Driver;
using protos;
using System.Security.Cryptography;
using GrpcStatus = Grpc.Core.Status;

namespace Backend.Services;

[Authorize]
public class FileTransferServiceImpl(ILogger<FileTransferServiceImpl> logger)
    : FileTransferService.FileTransferServiceBase
{
    private const int DownloadChunkSize = 64 * 1024;

    private static IMongoCollection<BsonDocument> Collection =>
        Global.CollectionStoredFile ?? throw new InvalidOperationException("StoredFile collection is not initialized.");

    private static string StorageRoot
    {
        get
        {
            var root = Path.Combine(AppContext.BaseDirectory, "App_Data", "file-transfer");
            Directory.CreateDirectory(root);
            Directory.CreateDirectory(Path.Combine(root, "_tmp"));
            return root;
        }
    }

    public override async Task<CreateUploadSessionResponse> CreateUploadSession(
        CreateUploadSessionRequest request,
        ServerCallContext context)
    {
        ValidateCreateRequest(request);

        var userId = context.GetUserID() ?? string.Empty;
        var userName = context.GetUserName() ?? userId;
        var fileId = Guid.NewGuid().ToString();
        var uploadId = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;

        var normalizedOriginalName = string.IsNullOrWhiteSpace(request.OriginalFileName)
            ? request.FileName
            : request.OriginalFileName;
        var normalizedFileName = string.IsNullOrWhiteSpace(request.FileName)
            ? normalizedOriginalName
            : request.FileName;
        var extension = Path.GetExtension(normalizedOriginalName ?? string.Empty);
        var tempRelativePath = Path.Combine("_tmp", $"{uploadId}.upload").Replace("\\", "/");
        var tempAbsolutePath = ResolveStoragePath(tempRelativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(tempAbsolutePath)!);

        using (File.Create(tempAbsolutePath))
        {
        }

        var document = new BsonDocument
        {
            ["_id"] = fileId,
            ["UploadId"] = uploadId,
            ["FileName"] = normalizedFileName,
            ["OriginalFileName"] = normalizedOriginalName,
            ["Extension"] = extension,
            ["ContentType"] = request.ContentType ?? string.Empty,
            ["SizeBytes"] = request.SizeBytes,
            ["ChunkSize"] = request.ChunkSize,
            ["TotalChunks"] = request.TotalChunks,
            ["UploadedChunks"] = 0,
            ["UploadedBytes"] = 0L,
            ["Category"] = request.Category ?? string.Empty,
            ["FileKind"] = (int)request.FileKind,
            ["StorageKey"] = fileId,
            ["RelativePath"] = tempRelativePath,
            ["Completed"] = false,
            ["Delete"] = false,
            ["Metadata"] = ToBsonDocument(request.Metadata),
            ["CreatedAt"] = now,
            ["UpdatedAt"] = now,
            ["CreatedBy"] = userId,
            ["UpdatedBy"] = userId,
            ["CreatedByName"] = userName,
            ["UpdatedByName"] = userName
        };

        await Collection.InsertOneAsync(document);
        var file = MapMetadata(document);

        return new CreateUploadSessionResponse
        {
            Meta = OkMeta("Tạo phiên upload thành công."),
            UploadId = uploadId,
            FileId = fileId,
            File = file
        };
    }

    public override async Task<UploadChunkResponse> UploadChunk(
        UploadChunkRequest request,
        ServerCallContext context)
    {
        if (string.IsNullOrWhiteSpace(request.UploadId))
            throw new RpcException(new GrpcStatus(StatusCode.InvalidArgument, "upload_id is required."));

        var document = await Collection.Find(Builders<BsonDocument>.Filter.Eq("UploadId", request.UploadId)).FirstOrDefaultAsync()
            ?? throw new RpcException(new GrpcStatus(StatusCode.NotFound, "Upload session not found."));

        if (document.GetValue("Completed", false).ToBoolean())
            throw new RpcException(new GrpcStatus(StatusCode.FailedPrecondition, "Upload session already completed."));

        var expectedChunkIndex = document.GetValue("UploadedChunks", 0).ToInt32();
        if (request.ChunkIndex != expectedChunkIndex)
            throw new RpcException(new GrpcStatus(StatusCode.FailedPrecondition, $"Expected chunk_index {expectedChunkIndex}, received {request.ChunkIndex}."));

        var relativePath = document.GetValue("RelativePath", "").ToString();
        var absolutePath = ResolveStoragePath(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        await using (var stream = new FileStream(absolutePath, FileMode.Append, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await stream.WriteAsync(request.Data.Memory, context.CancellationToken);
        }

        var uploadedBytes = document.GetValue("UploadedBytes", 0L).ToInt64() + request.Data.Length;
        var uploadedChunks = expectedChunkIndex + 1;
        var completed = uploadedChunks >= document.GetValue("TotalChunks", 0).ToInt32();
        var userId = context.GetUserID() ?? string.Empty;

        var update = Builders<BsonDocument>.Update
            .Set("UploadedChunks", uploadedChunks)
            .Set("UploadedBytes", uploadedBytes)
            .Set("UpdatedAt", DateTime.UtcNow)
            .Set("UpdatedBy", userId);

        await Collection.UpdateOneAsync(Builders<BsonDocument>.Filter.Eq("_id", document["_id"]), update);

        return new UploadChunkResponse
        {
            Meta = OkMeta("Đã nhận chunk."),
            UploadId = request.UploadId,
            FileId = document.GetValue("_id", "").ToString(),
            UploadedChunks = uploadedChunks,
            UploadedBytes = uploadedBytes,
            Completed = completed
        };
    }

    public override async Task<CompleteUploadResponse> CompleteUpload(
        CompleteUploadRequest request,
        ServerCallContext context)
    {
        if (string.IsNullOrWhiteSpace(request.UploadId))
            throw new RpcException(new GrpcStatus(StatusCode.InvalidArgument, "upload_id is required."));

        var document = await Collection.Find(Builders<BsonDocument>.Filter.Eq("UploadId", request.UploadId)).FirstOrDefaultAsync()
            ?? throw new RpcException(new GrpcStatus(StatusCode.NotFound, "Upload session not found."));

        if (document.GetValue("Completed", false).ToBoolean())
        {
            return new CompleteUploadResponse
            {
                Meta = OkMeta("File đã hoàn tất trước đó."),
                File = MapMetadata(document)
            };
        }

        var totalChunks = document.GetValue("TotalChunks", 0).ToInt32();
        var uploadedChunks = document.GetValue("UploadedChunks", 0).ToInt32();
        if (uploadedChunks != totalChunks)
            throw new RpcException(new GrpcStatus(StatusCode.FailedPrecondition, $"Upload chưa đủ chunk: {uploadedChunks}/{totalChunks}."));

        var tempRelativePath = document.GetValue("RelativePath", "").ToString();
        var tempAbsolutePath = ResolveStoragePath(tempRelativePath);
        if (!File.Exists(tempAbsolutePath))
            throw new RpcException(new GrpcStatus(StatusCode.NotFound, "Uploaded file content not found."));

        var originalName = document.GetValue("OriginalFileName", document.GetValue("FileName", "file.bin")).ToString();
        var normalizedName = SanitizeFileName(originalName);
        var fileId = document.GetValue("_id", "").ToString();
        var finalRelativePath = Path.Combine(DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"), $"{fileId}_{normalizedName}")
            .Replace("\\", "/");
        var finalAbsolutePath = ResolveStoragePath(finalRelativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(finalAbsolutePath)!);

        if (File.Exists(finalAbsolutePath))
            File.Delete(finalAbsolutePath);

        File.Move(tempAbsolutePath, finalAbsolutePath);

        var sha256 = await ComputeSha256Async(finalAbsolutePath, context.CancellationToken);
        var now = DateTime.UtcNow;
        var userId = context.GetUserID() ?? string.Empty;

        var updated = await Collection.FindOneAndUpdateAsync(
            Builders<BsonDocument>.Filter.Eq("_id", fileId),
            Builders<BsonDocument>.Update
                .Set("RelativePath", finalRelativePath)
                .Set("Completed", true)
                .Set("Sha256", sha256)
                .Set("UpdatedAt", now)
                .Set("UpdatedBy", userId),
            new FindOneAndUpdateOptions<BsonDocument>
            {
                ReturnDocument = ReturnDocument.After
            });

        return new CompleteUploadResponse
        {
            Meta = OkMeta("Hoàn tất upload file."),
            File = MapMetadata(updated)
        };
    }

    public override async Task<GetFileMetadataResponse> GetFileMetadata(
        GetFileMetadataRequest request,
        ServerCallContext context)
    {
        var document = await GetActiveDocumentAsync(request.Id);

        return new GetFileMetadataResponse
        {
            Meta = OkMeta("Lấy metadata file thành công."),
            File = MapMetadata(document)
        };
    }

    public override async Task DownloadFileStream(
        DownloadFileRequest request,
        IServerStreamWriter<DownloadFileChunkResponse> responseStream,
        ServerCallContext context)
    {
        var document = await GetActiveDocumentAsync(request.Id);
        var file = MapMetadata(document);
        var relativePath = document.GetValue("RelativePath", "").ToString();
        var absolutePath = ResolveStoragePath(relativePath);
        if (!File.Exists(absolutePath))
            throw new RpcException(new GrpcStatus(StatusCode.NotFound, "Stored file content not found."));

        var chunkIndex = 0;
        var buffer = new byte[DownloadChunkSize];
        await using var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, DownloadChunkSize, useAsync: true);
        while (true)
        {
            var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), context.CancellationToken);
            if (bytesRead <= 0)
                break;

            await responseStream.WriteAsync(new DownloadFileChunkResponse
            {
                File = chunkIndex == 0 ? file : null,
                ChunkIndex = chunkIndex,
                Data = ByteString.CopyFrom(buffer, 0, bytesRead),
                Done = false
            });

            chunkIndex++;
        }

        await responseStream.WriteAsync(new DownloadFileChunkResponse
        {
            File = chunkIndex == 0 ? file : null,
            ChunkIndex = chunkIndex,
            Data = ByteString.Empty,
            Done = true
        });
    }

    public override async Task<DeleteBaseResponse> DeleteFile(
        DeleteFileRequest request,
        ServerCallContext context)
    {
        var document = await GetActiveDocumentAsync(request.Id);
        var relativePath = document.GetValue("RelativePath", "").ToString();
        var absolutePath = ResolveStoragePath(relativePath);

        if (File.Exists(absolutePath))
            File.Delete(absolutePath);

        await Collection.UpdateOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", request.Id),
            Builders<BsonDocument>.Update
                .Set("Delete", true)
                .Set("UpdatedAt", DateTime.UtcNow)
                .Set("UpdatedBy", context.GetUserID() ?? string.Empty));

        return new DeleteBaseResponse
        {
            Success = true,
            Message = "Xóa file thành công."
        };
    }

    private static void ValidateCreateRequest(CreateUploadSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName) && string.IsNullOrWhiteSpace(request.OriginalFileName))
            throw new RpcException(new GrpcStatus(StatusCode.InvalidArgument, "file_name or original_file_name is required."));

        if (request.SizeBytes < 0)
            throw new RpcException(new GrpcStatus(StatusCode.InvalidArgument, "size_bytes must be >= 0."));

        if (request.ChunkSize <= 0)
            throw new RpcException(new GrpcStatus(StatusCode.InvalidArgument, "chunk_size must be > 0."));

        if (request.TotalChunks <= 0)
            throw new RpcException(new GrpcStatus(StatusCode.InvalidArgument, "total_chunks must be > 0."));
    }

    private static string ResolveStoragePath(string relativePath)
    {
        var normalized = relativePath.Replace("/", Path.DirectorySeparatorChar.ToString());
        return Path.Combine(StorageRoot, normalized);
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var cleaned = new string(fileName.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray());
        return string.IsNullOrWhiteSpace(cleaned) ? "file.bin" : cleaned;
    }

    private static async Task<string> ComputeSha256Async(string absolutePath, CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        using var sha = SHA256.Create();
        var hash = await sha.ComputeHashAsync(stream, cancellationToken);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static ResponseMeta OkMeta(string message) => new()
    {
        Success = true,
        Message = message
    };

    private static BsonDocument ToBsonDocument(MapField<string, string> metadata)
    {
        var document = new BsonDocument();
        foreach (var pair in metadata)
            document[pair.Key] = pair.Value;
        return document;
    }

    private static MapField<string, string> ToMapField(BsonValue? value)
    {
        var map = new MapField<string, string>();
        if (value == null || value.IsBsonNull || !value.IsBsonDocument)
            return map;

        foreach (var element in value.AsBsonDocument.Elements)
            map[element.Name] = element.Value.ToString();

        return map;
    }

    private static StoredFileMetadata MapMetadata(BsonDocument document)
    {
        var metadata = new StoredFileMetadata
        {
            Id = document.GetValue("_id", "").ToString(),
            UploadId = document.GetValue("UploadId", "").ToString(),
            FileName = document.GetValue("FileName", "").ToString(),
            OriginalFileName = document.GetValue("OriginalFileName", "").ToString(),
            Extension = document.GetValue("Extension", "").ToString(),
            ContentType = document.GetValue("ContentType", "").ToString(),
            SizeBytes = document.GetValue("SizeBytes", 0L).ToInt64(),
            ChunkSize = document.GetValue("ChunkSize", 0).ToInt32(),
            TotalChunks = document.GetValue("TotalChunks", 0).ToInt32(),
            UploadedChunks = document.GetValue("UploadedChunks", 0).ToInt32(),
            UploadedBytes = document.GetValue("UploadedBytes", 0L).ToInt64(),
            Category = document.GetValue("Category", "").ToString(),
            FileKind = (FileKind)document.GetValue("FileKind", 0).ToInt32(),
            Sha256 = document.GetValue("Sha256", "").ToString(),
            StorageKey = document.GetValue("StorageKey", "").ToString(),
            RelativePath = document.GetValue("RelativePath", "").ToString(),
            Completed = document.GetValue("Completed", false).ToBoolean(),
            CreatedBy = document.GetValue("CreatedBy", "").ToString(),
            UpdatedBy = document.GetValue("UpdatedBy", "").ToString()
        };

        metadata.Metadata.Add(ToMapField(document.GetValue("Metadata", BsonNull.Value)));

        var createdAt = document.GetValue("CreatedAt", BsonNull.Value);
        if (!createdAt.IsBsonNull)
            metadata.CreatedAt = Timestamp.FromDateTime(createdAt.ToUniversalTime());

        var updatedAt = document.GetValue("UpdatedAt", BsonNull.Value);
        if (!updatedAt.IsBsonNull)
            metadata.UpdatedAt = Timestamp.FromDateTime(updatedAt.ToUniversalTime());

        return metadata;
    }

    private static async Task<BsonDocument> GetActiveDocumentAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new RpcException(new GrpcStatus(StatusCode.InvalidArgument, "id is required."));

        var filter = Builders<BsonDocument>.Filter.Eq("_id", id) &
                     Builders<BsonDocument>.Filter.Ne("Delete", true);
        return await Collection.Find(filter).FirstOrDefaultAsync()
            ?? throw new RpcException(new GrpcStatus(StatusCode.NotFound, "File not found."));
    }
}
