using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Grpc.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public class ProtoSchemaDiscoveryService(ILogger<ProtoSchemaDiscoveryService> logger)
{
    private const string DynamicMenuDataSourcePermissionCode = "thamso_dynamicmenu_datasource";
    private const string ProtoManagementMode = "proto";

    private static readonly HashSet<string> ExcludedProtoFiles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Base.proto",
        "Common.proto",
        "Enum.proto",
        "Pager.proto",
        "ExtendedField.proto",
    };

    private static readonly HashSet<string> ExcludedMessageNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "FieldValidation",
        "FormTabConfig",
        "DynamicMenuDataSourceField",
    };

    private static readonly Dictionary<string, string> CollectionToMessageAlias =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["CapBac"] = "Catalog",
            ["RelationShips"] = "RelationShipObject",
        };

    private static Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>? _protoRegistry;
    private static readonly SemaphoreSlim RegistryLock = new(1, 1);

    public async Task<SyncDynamicMenuDataSourcesFromProtoResponse> SyncDynamicMenuDataSourcesFromProtoAsync(
        SyncDynamicMenuDataSourcesFromProtoRequest request,
        ServerCallContext? context)
    {
        var response = new SyncDynamicMenuDataSourcesFromProtoResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, DynamicMenuDataSourcePermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen dong bo datasource tu proto");
                return response;
            }

            var protoRegistryMap = await GetProtoRegistryAsync();
            logger.LogInformation(
                "SyncFromProto: registry candidates={Count}, keys={Keys}",
                protoRegistryMap.Count,
                string.Join(", ", protoRegistryMap.Keys.OrderBy(k => k)));

            var requestedKey = request.SourceKey?.Trim() ?? string.Empty;
            var toSync = string.IsNullOrWhiteSpace(requestedKey)
                ? protoRegistryMap
                : protoRegistryMap
                    .Where(kvp =>
                        kvp.Key.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        || kvp.Value.Descriptor.Name.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        || ToKebabCase(kvp.Value.Descriptor.Name).Equals(requestedKey, StringComparison.OrdinalIgnoreCase))
                    .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            if (toSync.Count == 0)
            {
                response.Meta = ThamSoResponseFactory.Fail(
                    $"Không tìm thấy proto mapping cho source_key '{request.SourceKey}'. Các key hợp lệ: {string.Join(", ", protoRegistryMap.Keys)}");
                return response;
            }

            var filterBuilder = Builders<BsonDocument>.Filter;
            var collection = Global.CollectionBsonDynamicMenuDataSource!;
            var keys = toSync.Keys.ToList();

            var existingDocs = await collection
                .Find(filterBuilder.And(filterBuilder.In("SourceKey", keys), MongoDocumentHelpers.NotDeleted))
                .ToListAsync();

            var existingMap = existingDocs.ToDictionary(
                d => d.StringOr("SourceKey"),
                d => d,
                StringComparer.OrdinalIgnoreCase);

            var bulkOps = new List<WriteModel<BsonDocument>>();
            var syncedItems = new List<DynamicMenuDataSource>();

            foreach (var (sourceKey, (sourceName, collectionName, descriptor)) in toSync)
            {
                var fields = GetFieldsFromProtoDescriptor(descriptor);

                DynamicMenuDataSource item;
                if (existingMap.TryGetValue(sourceKey, out var existingBson))
                {
                    item = BsonSerializer.Deserialize<DynamicMenuDataSource>(existingBson);
                    item.Fields.Clear();
                    item.Fields.AddRange(fields);
                    item.SourceName = sourceName;
                    item.CollectionName = collectionName;
                    item.ManagementMode = ProtoManagementMode;
                    item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                    item.CreateDate = existingBson.TimestampOr("CreateDate") ?? item.CreateDate;

                    var bsonDoc = item.ToBsonDocument();
                    bsonDoc["_id"] = item.Id;
                    ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingBson, context, item.ModifyDate);

                    bulkOps.Add(new ReplaceOneModel<BsonDocument>(filterBuilder.Eq("_id", item.Id), bsonDoc));
                }
                else
                {
                    item = new DynamicMenuDataSource
                    {
                        Id = Guid.NewGuid().ToString(),
                        SourceKey = sourceKey,
                        SourceName = sourceName,
                        CollectionName = collectionName,
                        ManagementMode = ProtoManagementMode,
                        Enabled = true,
                        CreateDate = ProtobufTimestampConverter.GetNowTimestamp(),
                    };
                    item.Fields.AddRange(fields);

                    var bsonDoc = item.ToBsonDocument();
                    bsonDoc["_id"] = item.Id;
                    ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);

                    bulkOps.Add(new InsertOneModel<BsonDocument>(bsonDoc));
                }

                syncedItems.Add(item);
            }

            if (bulkOps.Count > 0)
                await collection.BulkWriteAsync(bulkOps);

            response.Items.AddRange(syncedItems);
            response.Meta = ThamSoResponseFactory.Ok(
                $"Đồng bộ thành công {syncedItems.Count} datasource từ proto schema. Synced keys: {string.Join(", ", toSync.Keys.OrderBy(k => k))}");

            logger.LogInformation("SyncFromProto: synced {Count} items", syncedItems.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SyncDynamicMenuDataSourcesFromProto error");
            response.Meta = ThamSoResponseFactory.Fail("Lỗi khi đồng bộ từ proto", ex.Message);
        }

        return response;
    }

    public async Task SyncDynamicMenuDataSourcesFromProtoStreamAsync(
        SyncDynamicMenuDataSourcesFromProtoRequest request,
        IServerStreamWriter<JobProgressEvent> responseStream,
        ServerCallContext context)
    {
        var jobId = Guid.NewGuid().ToString();
        var warnings = new List<string>();

        async Task WriteAsync(
            string stage,
            string message,
            int processed = 0,
            int total = 0,
            string currentKey = "",
            bool done = false,
            bool success = false,
            IEnumerable<string>? extraWarnings = null)
        {
            var evt = new JobProgressEvent
            {
                JobId = jobId,
                Stage = stage,
                Message = message,
                Processed = processed,
                Total = total,
                CurrentKey = currentKey,
                Done = done,
                Success = success,
                Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
            };
            if (extraWarnings != null)
                evt.Warnings.AddRange(extraWarnings);
            await responseStream.WriteAsync(evt, context.CancellationToken);
        }

        if (!ServiceMutationPolicy.CanWriteThamSo(context, DynamicMenuDataSourcePermissionCode))
        {
            await WriteAsync(
                stage: "FAILED",
                message: "Khong co quyen dong bo datasource tu proto",
                done: true,
                success: false);
            return;
        }

        await WriteAsync("STARTED", "Bat dau dong bo datasource tu proto");

        try
        {
            var protoRegistryMap = await GetProtoRegistryAsync();
            var requestedKey = request.SourceKey?.Trim() ?? string.Empty;
            var toSync = string.IsNullOrWhiteSpace(requestedKey)
                ? protoRegistryMap
                : protoRegistryMap
                    .Where(kvp =>
                        kvp.Key.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        || kvp.Value.Descriptor.Name.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        || ToKebabCase(kvp.Value.Descriptor.Name).Equals(requestedKey, StringComparison.OrdinalIgnoreCase))
                    .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            if (toSync.Count == 0)
            {
                await WriteAsync(
                    stage: "FAILED",
                    message: $"Khong tim thay proto mapping cho source_key '{request.SourceKey}'",
                    done: true,
                    success: false);
                return;
            }

            var filterBuilder = Builders<BsonDocument>.Filter;
            var collection = Global.CollectionBsonDynamicMenuDataSource!;
            var keys = toSync.Keys.ToList();
            var existingDocs = await collection
                .Find(filterBuilder.And(filterBuilder.In("SourceKey", keys), MongoDocumentHelpers.NotDeleted))
                .ToListAsync(context.CancellationToken);

            var existingMap = existingDocs.ToDictionary(
                d => d.StringOr("SourceKey"),
                d => d,
                StringComparer.OrdinalIgnoreCase);

            await WriteAsync(
                stage: "RESOLVED",
                message: $"Da xac dinh {toSync.Count} datasource can dong bo",
                total: toSync.Count);

            var processed = 0;
            foreach (var (sourceKey, (sourceName, collectionName, descriptor)) in toSync)
            {
                context.CancellationToken.ThrowIfCancellationRequested();

                await WriteAsync(
                    stage: "SYNCING",
                    message: $"Dang dong bo {sourceKey}",
                    processed: processed,
                    total: toSync.Count,
                    currentKey: sourceKey);

                try
                {
                    var fields = GetFieldsFromProtoDescriptor(descriptor);
                    DynamicMenuDataSource item;

                    if (existingMap.TryGetValue(sourceKey, out var existingBson))
                    {
                        item = BsonSerializer.Deserialize<DynamicMenuDataSource>(existingBson);
                        item.Fields.Clear();
                        item.Fields.AddRange(fields);
                        item.SourceName = sourceName;
                        item.CollectionName = collectionName;
                        item.ManagementMode = ProtoManagementMode;
                        item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                        item.CreateDate = existingBson.TimestampOr("CreateDate") ?? item.CreateDate;

                        var bsonDoc = item.ToBsonDocument();
                        bsonDoc["_id"] = item.Id;
                        ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingBson, context, item.ModifyDate);
                        await collection.ReplaceOneAsync(
                            filterBuilder.Eq("_id", item.Id),
                            bsonDoc,
                            cancellationToken: context.CancellationToken);
                    }
                    else
                    {
                        item = new DynamicMenuDataSource
                        {
                            Id = Guid.NewGuid().ToString(),
                            SourceKey = sourceKey,
                            SourceName = sourceName,
                            CollectionName = collectionName,
                            ManagementMode = ProtoManagementMode,
                            Enabled = true,
                            CreateDate = ProtobufTimestampConverter.GetNowTimestamp(),
                        };
                        item.Fields.AddRange(fields);

                        var bsonDoc = item.ToBsonDocument();
                        bsonDoc["_id"] = item.Id;
                        ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);
                        await collection.InsertOneAsync(bsonDoc, cancellationToken: context.CancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    var warning = $"Datasource {sourceKey}: {ex.Message}";
                    warnings.Add(warning);
                    logger.LogWarning(ex, "SyncDynamicMenuDataSourcesFromProtoStream warning at {SourceKey}", sourceKey);
                    await WriteAsync(
                        stage: "WARNING",
                        message: warning,
                        processed: processed,
                        total: toSync.Count,
                        currentKey: sourceKey,
                        extraWarnings: new[] { warning });
                }

                processed++;
                await WriteAsync(
                    stage: "PROGRESS",
                    message: $"Da xu ly {processed}/{toSync.Count} datasource",
                    processed: processed,
                    total: toSync.Count,
                    currentKey: sourceKey);
            }

            await WriteAsync(
                stage: "COMPLETED",
                message: warnings.Count == 0
                    ? $"Dong bo thanh cong {processed} datasource"
                    : $"Dong bo hoan tat voi {warnings.Count} canh bao",
                processed: processed,
                total: toSync.Count,
                done: true,
                success: warnings.Count == 0,
                extraWarnings: warnings);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("SyncDynamicMenuDataSourcesFromProtoStream canceled");
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SyncDynamicMenuDataSourcesFromProtoStream error");
            await WriteAsync(
                stage: "FAILED",
                message: $"Loi khi dong bo tu proto: {ex.Message}",
                done: true,
                success: false,
                extraWarnings: warnings);
        }
    }

    public async Task<DiscoverCollectionFieldsResponse> DiscoverCollectionFieldsAsync(DiscoverCollectionFieldsRequest request)
    {
        var response = new DiscoverCollectionFieldsResponse();
        try
        {
            var rawCollectionName = request.CollectionName?.Trim();
            if (string.IsNullOrEmpty(rawCollectionName))
            {
                response.Meta = ThamSoResponseFactory.Fail("Vui lòng nhập tên collection.");
                return response;
            }

            var collectionName = ResolveActualCollectionName(rawCollectionName);
            if (!collectionName.Equals(rawCollectionName, StringComparison.OrdinalIgnoreCase))
                logger.LogInformation("DiscoverCollectionFields: alias resolved {From} -> {To}", rawCollectionName, collectionName);

            var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
            if (collection == null)
            {
                response.Meta = ThamSoResponseFactory.Fail("Không thể kết nối MongoDB.");
                return response;
            }

            var documents = await collection.Find(Builders<BsonDocument>.Filter.Empty).Limit(50).ToListAsync();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var fields = new List<DynamicMenuDataSourceField>();

            foreach (var doc in documents)
            {
                foreach (var element in doc.Elements)
                {
                    if (element.Name == "_id") continue;
                    if (!seen.Add(element.Name)) continue;

                    var dataType = ResolveBsonDataType(element.Value);
                    if (dataType == null) continue;

                    fields.Add(new DynamicMenuDataSourceField
                    {
                        Key = element.Name,
                        Label = element.Name,
                        DataType = dataType,
                    });
                }
            }

            response.CollectionName = collectionName;
            response.DocumentsScanned = documents.Count;
            response.Fields.AddRange(fields);
            response.Meta = ThamSoResponseFactory.Ok(fields.Count > 0
                ? $"Tìm thấy {fields.Count} fields từ {documents.Count} documents"
                : $"Collection '{collectionName}' rỗng hoặc không có fields");

            logger.LogInformation(
                "DiscoverCollectionFields: {Col} -> {Fields} fields / {Scanned} docs scanned",
                collectionName, fields.Count, documents.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DiscoverCollectionFields error");
            response.Meta = ThamSoResponseFactory.Fail("Lỗi khi khám phá collection", ex.Message);
        }

        return response;
    }

    public async Task SeedDefaultDynamicMenuDataSourcesAsync()
    {
        var defaults = new[]
        {
            new { SourceKey = "employee", SourceName = "Employee", CollectionName = "Employee" },
            new { SourceKey = "office", SourceName = "Office", CollectionName = "Office" },
        };

        foreach (var seed in defaults)
        {
            var fields = await DiscoverCollectionFieldsInternalAsync(seed.CollectionName);
            var item = new DynamicMenuDataSource
            {
                Id = Guid.NewGuid().ToString(),
                SourceKey = seed.SourceKey,
                SourceName = seed.SourceName,
                CollectionName = seed.CollectionName,
                ManagementMode = ProtoManagementMode,
                Enabled = true,
                CreateDate = ProtobufTimestampConverter.GetNowTimestamp(),
            };
            item.Fields.AddRange(fields);

            var bsonDoc = item.ToBsonDocument();
            bsonDoc["_id"] = item.Id;
            ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context: null, item.CreateDate);

            await Global.CollectionBsonDynamicMenuDataSource!.InsertOneAsync(bsonDoc);
        }
    }

    private async Task<List<DynamicMenuDataSourceField>> DiscoverCollectionFieldsInternalAsync(string collectionName)
    {
        var result = new List<DynamicMenuDataSourceField>();
        var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
        if (collection == null) return result;

        var documents = await collection
            .Find(Builders<BsonDocument>.Filter.Empty)
            .Limit(50)
            .ToListAsync();

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var doc in documents)
        {
            foreach (var element in doc.Elements)
            {
                if (element.Name == "_id") continue;
                if (!IsPrimitiveValue(element.Value)) continue;
                if (!seen.Add(element.Name)) continue;

                result.Add(new DynamicMenuDataSourceField
                {
                    Key = element.Name,
                    Label = element.Name,
                    DataType = GetBsonTypeName(element.Value.BsonType),
                });
            }
        }

        if (result.Count == 0)
        {
            result.Add(new DynamicMenuDataSourceField
            {
                Key = "id",
                Label = "id",
                DataType = "string",
            });
        }

        return result;
    }

    private async Task<Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>> GetProtoRegistryAsync()
    {
        if (_protoRegistry != null) return _protoRegistry;

        await RegistryLock.WaitAsync();
        try
        {
            if (_protoRegistry != null) return _protoRegistry;

            var collectionNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (Global.MongoDB != null)
            {
                using var cursor = await Global.MongoDB.ListCollectionNamesAsync();
                await cursor.ForEachAsync(n => collectionNames.Add(n));
            }

            _protoRegistry = BuildProtoRegistryMap(collectionNames);
            return _protoRegistry;
        }
        finally
        {
            RegistryLock.Release();
        }
    }

    private static Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>
        BuildProtoRegistryMap(HashSet<string> collectionNames)
    {
        var result = new Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>(
            StringComparer.OrdinalIgnoreCase);

        var descriptorTypes = typeof(Employee).Assembly
            .GetTypes()
            .Where(type => type.IsClass && type.IsPublic && type.Namespace == "protos")
            .ToList();

        foreach (var type in descriptorTypes)
        {
            var descriptorProperty = type.GetProperty(
                "Descriptor",
                System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);

            if (descriptorProperty?.PropertyType != typeof(Google.Protobuf.Reflection.MessageDescriptor)) continue;
            if (descriptorProperty.GetValue(null) is not Google.Protobuf.Reflection.MessageDescriptor descriptor) continue;

            var protoFileName = Path.GetFileName(descriptor.File.Name);
            if (ExcludedProtoFiles.Contains(protoFileName)) continue;
            if (!IsLikelyEntityMessage(descriptor)) continue;

            var collectionName = ResolveCollectionName(descriptor, collectionNames);
            if (string.IsNullOrWhiteSpace(collectionName)) continue;

            var sourceKey = ToKebabCase(collectionName);
            if (string.IsNullOrWhiteSpace(sourceKey) || result.ContainsKey(sourceKey)) continue;

            result[sourceKey] = (collectionName, collectionName, descriptor);
        }

        return result;
    }

    private static bool IsLikelyEntityMessage(Google.Protobuf.Reflection.MessageDescriptor descriptor)
    {
        var name = descriptor.Name;

        if (name.EndsWith("Request", StringComparison.OrdinalIgnoreCase)) return false;
        if (name.EndsWith("Response", StringComparison.OrdinalIgnoreCase)) return false;
        if (name.EndsWith("Search", StringComparison.OrdinalIgnoreCase)) return false;
        if (ExcludedMessageNames.Contains(name)) return false;

        var excludedPrefixes = new[] { "Get", "List", "Save", "Delete", "Upload", "Reorder" };
        if (excludedPrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))) return false;

        return descriptor.Fields.InFieldNumberOrder().Count > 1;
    }

    private static string? ResolveCollectionName(
        Google.Protobuf.Reflection.MessageDescriptor descriptor,
        HashSet<string> collectionNames)
    {
        foreach (var kvp in CollectionToMessageAlias)
        {
            if (!collectionNames.Contains(kvp.Key)) continue;
            if (descriptor.Name.Equals(kvp.Value, StringComparison.OrdinalIgnoreCase))
                return kvp.Key;
        }

        var candidateNames = new[]
        {
            descriptor.Name,
            descriptor.Name + "s",
            descriptor.File.Package,
            descriptor.File.Package + "s",
        }
        .Where(x => !string.IsNullOrWhiteSpace(x))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

        foreach (var candidate in candidateNames)
        {
            var matched = collectionNames.FirstOrDefault(c => c.Equals(candidate, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(matched)) return matched;
        }

        return collectionNames.Count > 0 ? null : descriptor.Name;
    }

    private static string ResolveActualCollectionName(string requestedName)
    {
        if (string.IsNullOrWhiteSpace(requestedName)) return requestedName;

        foreach (var kvp in CollectionToMessageAlias)
        {
            if (kvp.Value.Equals(requestedName, StringComparison.OrdinalIgnoreCase))
                return kvp.Key;
        }

        return requestedName;
    }

    private static string ToKebabCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var chars = new List<char>(value.Length + 8);
        for (var i = 0; i < value.Length; i++)
        {
            var c = value[i];
            var isUpper = char.IsUpper(c);
            if (isUpper && i > 0 && (char.IsLower(value[i - 1]) || char.IsDigit(value[i - 1])))
                chars.Add('-');
            chars.Add(char.ToLowerInvariant(c));
        }

        return new string(chars.ToArray());
    }

    private static List<DynamicMenuDataSourceField> GetFieldsFromProtoDescriptor(
        Google.Protobuf.Reflection.MessageDescriptor descriptor)
    {
        var result = new List<DynamicMenuDataSourceField>();
        foreach (var field in descriptor.Fields.InDeclarationOrder())
        {
            if (field.IsRepeated) continue;
            var dataType = GetProtoFieldTypeName(field);
            if (dataType == null) continue;

            result.Add(new DynamicMenuDataSourceField
            {
                Key = field.Name,
                Label = field.Name,
                DataType = dataType,
            });
        }

        return result;
    }

    private static string? GetProtoFieldTypeName(Google.Protobuf.Reflection.FieldDescriptor field)
    {
        if (field.FieldType == Google.Protobuf.Reflection.FieldType.Message)
        {
            var fullName = field.MessageType?.FullName ?? string.Empty;
            return fullName switch
            {
                "google.protobuf.Timestamp" => "date",
                "google.protobuf.StringValue" => "string",
                "google.protobuf.BoolValue" => "boolean",
                "google.protobuf.Int32Value" or "google.protobuf.Int64Value"
                    or "google.protobuf.UInt32Value" or "google.protobuf.UInt64Value"
                    or "google.protobuf.FloatValue" or "google.protobuf.DoubleValue" => "number",
                _ => null,
            };
        }

        return field.FieldType switch
        {
            Google.Protobuf.Reflection.FieldType.String => "string",
            Google.Protobuf.Reflection.FieldType.Bool => "boolean",
            Google.Protobuf.Reflection.FieldType.Bytes => null,
            Google.Protobuf.Reflection.FieldType.Int32 or Google.Protobuf.Reflection.FieldType.Int64
                or Google.Protobuf.Reflection.FieldType.UInt32 or Google.Protobuf.Reflection.FieldType.UInt64
                or Google.Protobuf.Reflection.FieldType.SInt32 or Google.Protobuf.Reflection.FieldType.SInt64
                or Google.Protobuf.Reflection.FieldType.Fixed32 or Google.Protobuf.Reflection.FieldType.Fixed64
                or Google.Protobuf.Reflection.FieldType.SFixed32 or Google.Protobuf.Reflection.FieldType.SFixed64
                or Google.Protobuf.Reflection.FieldType.Float or Google.Protobuf.Reflection.FieldType.Double => "number",
            _ => "string",
        };
    }

    private static string GetBsonTypeName(BsonType type) =>
        type switch
        {
            BsonType.String => "string",
            BsonType.Int32 => "number",
            BsonType.Int64 => "number",
            BsonType.Double => "number",
            BsonType.Decimal128 => "number",
            BsonType.Boolean => "boolean",
            BsonType.DateTime => "date",
            _ => "string",
        };

    private static bool IsPrimitiveValue(BsonValue value) =>
        value.IsString || value.IsBoolean || value.IsNumeric || value.IsValidDateTime || value.IsBsonDateTime;

    private static string? ResolveBsonDataType(BsonValue value) =>
        value.BsonType switch
        {
            BsonType.Null or BsonType.Undefined => null,
            BsonType.String => "string",
            BsonType.Boolean => "boolean",
            BsonType.Int32 or BsonType.Int64 or BsonType.Double or BsonType.Decimal128 => "number",
            BsonType.DateTime => "date",
            BsonType.Document => IsTimestampDoc(value.AsBsonDocument) ? "date" : "object",
            BsonType.Array => "array",
            _ => "string",
        };

    private static bool IsTimestampDoc(BsonDocument doc) =>
        doc.ElementCount <= 3 && doc.Contains("Seconds") && doc.Contains("Nanos");
}
