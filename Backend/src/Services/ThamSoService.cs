using Backend.Utils;
using Google.Protobuf.Collections;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public class ThamSoServiceImpl(ILogger<ThamSoServiceImpl> logger) :
   ThamSoService.ThamSoServiceBase
{

    private static string GetBsonTypeName(BsonType type)
    {
        return type switch
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
    }

    private static bool IsPrimitiveValue(BsonValue value)
    {
        return value.IsString || value.IsBoolean || value.IsNumeric || value.IsValidDateTime || value.IsBsonDateTime;
    }

    /// <summary>
    /// Phát hiện kiểu dữ liệu đầy đủ cho DiscoverCollectionFields.
    /// Khác với GetBsonTypeName: nhận dạng thêm Timestamp subdoc, array, object.
    /// Trả về null khi là BsonNull/BsonUndefined (bỏ qua field).
    /// </summary>
    private static string? ResolveBsonDataType(BsonValue value)
    {
        return value.BsonType switch
        {
            BsonType.Null or BsonType.Undefined => null,

            BsonType.String => "string",
            BsonType.Boolean => "boolean",
            BsonType.Int32 or BsonType.Int64
                or BsonType.Double or BsonType.Decimal128 => "number",
            BsonType.DateTime => "date",

            // Protobuf Timestamp lưu dạng { Seconds: long, Nanos: int }
            BsonType.Document => IsTimestampDoc(value.AsBsonDocument) ? "date" : "object",

            BsonType.Array => "array",

            _ => "string",
        };
    }

    private static bool IsTimestampDoc(BsonDocument doc)
    {
        return doc.ElementCount <= 3
            && doc.Contains("Seconds")
            && doc.Contains("Nanos");
    }

    // ================================================================
    // Proto Reflection helpers
    // Build map động từ các message class đã generate từ proto.
    // Không fix cứng danh sách thực thể trong code.
    // ================================================================
    private static readonly HashSet<string> _excludedProtoFiles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Base.proto",
        "Common.proto",
        "Enum.proto",
        "Pager.proto",
        "ExtendedField.proto",
    };

    private static readonly HashSet<string> _excludedMessageNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "FieldValidation",
        "FormTabConfig",
        "DynamicMenuDataSourceField",
    };

    private static readonly Dictionary<string, string> _collectionToMessageAlias =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // DB collection -> Proto message name
            ["CapBac"] = "Catalog",
            ["RelationShips"] = "RelationShipObject",
        };

    private static bool IsLikelyEntityMessage(Google.Protobuf.Reflection.MessageDescriptor descriptor)
    {
        var name = descriptor.Name;

        if (name.EndsWith("Request", StringComparison.OrdinalIgnoreCase)) return false;
        if (name.EndsWith("Response", StringComparison.OrdinalIgnoreCase)) return false;
        if (name.EndsWith("Search", StringComparison.OrdinalIgnoreCase)) return false;
        if (_excludedMessageNames.Contains(name)) return false;

        var excludedPrefixes = new[] { "Get", "List", "Save", "Delete", "Upload", "Reorder" };
        if (excludedPrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))) return false;

        // Các entity thường có nhiều hơn 1 field; message metadata/utility thường rất ít.
        return descriptor.Fields.InFieldNumberOrder().Count > 1;
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
            {
                chars.Add('-');
            }
            chars.Add(char.ToLowerInvariant(c));
        }

        return new string(chars.ToArray());
    }

    private static string? ResolveCollectionName(
        Google.Protobuf.Reflection.MessageDescriptor descriptor,
        HashSet<string> collectionNames)
    {
        // 1) Ưu tiên alias explicit theo collection thật trong DB.
        foreach (var kvp in _collectionToMessageAlias)
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
            var matched = collectionNames.FirstOrDefault(c =>
                c.Equals(candidate, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(matched)) return matched;
        }

        // Khi đã có danh sách collection Mongo, chỉ lấy message khớp collection thực tế.
        if (collectionNames.Count > 0) return null;

        // fallback khi chưa kết nối/không đọc được danh sách collection
        return descriptor.Name;
    }

    /// <summary>
    /// Phân giải tên collection thật từ tên UI/proto có thể là alias.
    /// VD: "Catalog" → "CapBac" (theo _collectionToMessageAlias ngược).
    /// </summary>
    private static string ResolveActualCollectionName(string requestedName)
    {
        if (string.IsNullOrWhiteSpace(requestedName)) return requestedName;

        // Tìm trong alias map: value là proto message name, key là collection thật
        foreach (var kvp in _collectionToMessageAlias)
        {
            if (kvp.Value.Equals(requestedName, StringComparison.OrdinalIgnoreCase))
                return kvp.Key; // trả về "CapBac" nếu input là "Catalog"
        }

        return requestedName;
    }

    // ================================================================
    // Proto Registry — lazy-cached + async
    // ================================================================
    private static Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>? _protoRegistry;
    private static readonly SemaphoreSlim _registryLock = new(1, 1);

    private async Task<Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>>
        GetProtoRegistryAsync()
    {
        if (_protoRegistry != null) return _protoRegistry;
        await _registryLock.WaitAsync();
        try
        {
            if (_protoRegistry != null) return _protoRegistry; // double-check
            var collectionNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (Global.MongoDB != null)
            {
                using var cursor = await Global.MongoDB.ListCollectionNamesAsync();
                await cursor.ForEachAsync(n => collectionNames.Add(n));
            }
            _protoRegistry = BuildProtoRegistryMap(collectionNames);
            return _protoRegistry;
        }
        finally { _registryLock.Release(); }
    }

    private Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>
        BuildProtoRegistryMap(HashSet<string> collectionNames)
    {
        var result = new Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>(
            StringComparer.OrdinalIgnoreCase);

        var descriptorTypes = typeof(protos.Employee).Assembly
            .GetTypes()
            .Where(type => type.IsClass && type.IsPublic && type.Namespace == "protos")
            .ToList();

        foreach (var type in descriptorTypes)
        {
            var descriptorProperty = type.GetProperty(
                "Descriptor",
                System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);

            if (descriptorProperty?.PropertyType != typeof(Google.Protobuf.Reflection.MessageDescriptor)) continue;

            var descriptorObj = descriptorProperty.GetValue(null);
            if (descriptorObj is not Google.Protobuf.Reflection.MessageDescriptor descriptor) continue;

            var protoFileName = System.IO.Path.GetFileName(descriptor.File.Name);
            if (_excludedProtoFiles.Contains(protoFileName)) continue;
            if (!IsLikelyEntityMessage(descriptor)) continue;

            var collectionName = ResolveCollectionName(descriptor, collectionNames);
            if (string.IsNullOrWhiteSpace(collectionName)) continue;

            // Dùng collection name làm sourceKey để update đúng datasource record đang dùng trên UI
            // (ví dụ: CapBac -> cap-bac), tránh tạo thêm key mới theo tên message (catalog).
            var sourceKey = ToKebabCase(collectionName);
            if (string.IsNullOrWhiteSpace(sourceKey)) continue;
            if (result.ContainsKey(sourceKey)) continue;

            var sourceName = collectionName;

            result[sourceKey] = (sourceName, collectionName, descriptor);
        }

        return result;
    }

    /// <summary>
    /// Chuyển FieldDescriptor của proto sang chuỗi dataType ("string"/"number"/"boolean"/"date").
    /// Trả về null nếu field là message phức tạp cần bỏ qua.
    /// </summary>
    private static string? GetProtoFieldTypeName(Google.Protobuf.Reflection.FieldDescriptor field)
    {
        if (field.FieldType == Google.Protobuf.Reflection.FieldType.Message)
        {
            var fullName = field.MessageType?.FullName ?? "";
            return fullName switch
            {
                "google.protobuf.Timestamp" => "date",
                "google.protobuf.StringValue" => "string",
                "google.protobuf.BoolValue" => "boolean",
                "google.protobuf.Int32Value" or "google.protobuf.Int64Value"
                    or "google.protobuf.UInt32Value" or "google.protobuf.UInt64Value"
                    or "google.protobuf.FloatValue" or "google.protobuf.DoubleValue" => "number",
                _ => null, // message phức tạp → bỏ qua
            };
        }

        return field.FieldType switch
        {
            Google.Protobuf.Reflection.FieldType.String => "string",
            Google.Protobuf.Reflection.FieldType.Bool => "boolean",
            Google.Protobuf.Reflection.FieldType.Bytes => null,   // bỏ qua
            Google.Protobuf.Reflection.FieldType.Int32 or Google.Protobuf.Reflection.FieldType.Int64
                or Google.Protobuf.Reflection.FieldType.UInt32 or Google.Protobuf.Reflection.FieldType.UInt64
                or Google.Protobuf.Reflection.FieldType.SInt32 or Google.Protobuf.Reflection.FieldType.SInt64
                or Google.Protobuf.Reflection.FieldType.Fixed32 or Google.Protobuf.Reflection.FieldType.Fixed64
                or Google.Protobuf.Reflection.FieldType.SFixed32 or Google.Protobuf.Reflection.FieldType.SFixed64
                or Google.Protobuf.Reflection.FieldType.Float or Google.Protobuf.Reflection.FieldType.Double => "number",
            _ => "string",
        };
    }

    /// <summary>
    /// Đọc tất cả fields từ một MessageDescriptor (proto reflection).
    /// Bỏ qua repeated fields và message lồng không phải well-known types.
    /// </summary>
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

    private static string MapSourceDataTypeToDynamicFieldType(string? dataType)
    {
        return (dataType ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "number" => "number",
            "date" => "date",
            "boolean" => "checkbox",
            _ => "text",
        };
    }

    private static string ToTitleLabel(string key)
    {
        var normalized = (key ?? string.Empty)
            .Trim()
            .Replace("_", " ")
            .Replace("-", " ");

        if (string.IsNullOrWhiteSpace(normalized)) return key ?? string.Empty;

        return string.Join(" ", normalized
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Length == 1
                ? part.ToUpperInvariant()
                : char.ToUpperInvariant(part[0]) + part[1..]));
    }

    private async Task<List<DynamicField>> UpsertDynamicFieldsForSourceAsync(
        string sourceKey,
        IEnumerable<DynamicMenuDataSourceField> sourceFields)
    {
        var fieldsList = sourceFields.Where(f => !string.IsNullOrWhiteSpace(f.Key)).ToList();
        if (fieldsList.Count == 0) return [];

        // 1) Batch fetch all existing fields for this sourceKey (1 query instead of N)
        var existingDocs = await Global.CollectionBsonDynamicField!
            .Find(Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("Validation.DataSource", sourceKey),
                CommonUtils.NotDeleted))
            .ToListAsync();

        var existingMap = existingDocs.ToDictionary(
            d => d.GetValue("Key", "").AsString,
            d => d,
            StringComparer.OrdinalIgnoreCase);

        // 2) Build all operations in memory
        var synced = new List<DynamicField>();
        var bulkOps = new List<WriteModel<BsonDocument>>();

        foreach (var sourceField in fieldsList)
        {
            var key = sourceField.Key.Trim();
            var label = string.IsNullOrWhiteSpace(sourceField.Label) ? ToTitleLabel(key) : sourceField.Label.Trim();
            var dynamicType = MapSourceDataTypeToDynamicFieldType(sourceField.DataType);

            DynamicField item;
            if (existingMap.TryGetValue(key, out var existingBson))
            {
                item = BsonSerializer.Deserialize<DynamicField>(existingBson);
                item.Label = label;
                item.Type = dynamicType;
                item.Required = false;
                item.ModifyDate = CommonUtils.GetNowTimestamp();
                item.Validation ??= new FieldValidation();
                item.Validation.DataSource = sourceKey;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["Delete"] = false;
                bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);

                bulkOps.Add(new ReplaceOneModel<BsonDocument>(
                    Builders<BsonDocument>.Filter.Eq("_id", item.Id), bsonDoc));
            }
            else
            {
                item = new DynamicField
                {
                    Id = ObjectId.GenerateNewId().ToString(),
                    Key = key,
                    Label = label,
                    Type = dynamicType,
                    Required = false,
                    CreateDate = CommonUtils.GetNowTimestamp(),
                    Validation = new FieldValidation { DataSource = sourceKey },
                };

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                bsonDoc["Delete"] = false;

                bulkOps.Add(new InsertOneModel<BsonDocument>(bsonDoc));
            }

            synced.Add(item);
        }

        // 3) Single BulkWrite (1 round-trip instead of 2N)
        if (bulkOps.Count > 0)
            await Global.CollectionBsonDynamicField.BulkWriteAsync(bulkOps);

        return synced;
    }

    private async Task<FieldSet?> UpsertAutoFieldSetForSourceAsync(
        string sourceKey,
        string sourceName,
        List<DynamicField> fields)
    {
        if (fields.Count == 0) return null;

        var fieldIds = fields.Select(f => f.Id).ToList();
        var marker = $"AUTO_PROTO_SOURCE:{sourceKey}";
        var existingFilter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("Desc", marker),
            CommonUtils.NotDeleted
        );
        var existingBson = await Global.CollectionBsonFieldSet!
            .Find(existingFilter)
            .FirstOrDefaultAsync();

        FieldSet fieldSet;
        if (existingBson != null)
        {
            fieldSet = BsonSerializer.Deserialize<FieldSet>(existingBson);
            fieldSet.Name = $"{sourceName} (Auto)";
            fieldSet.Icon = string.IsNullOrWhiteSpace(fieldSet.Icon) ? "Dataset" : fieldSet.Icon;
            fieldSet.Color = string.IsNullOrWhiteSpace(fieldSet.Color) ? "#1976d2" : fieldSet.Color;
            fieldSet.Desc = marker;
            fieldSet.FieldIds.Clear();
            fieldSet.FieldIds.AddRange(fieldIds);
            fieldSet.ModifyDate = CommonUtils.GetNowTimestamp();

            var bsonDoc = fieldSet.ToBsonDocument();
            bsonDoc["_id"] = fieldSet.Id;
            bsonDoc["Delete"] = false;
            bsonDoc["ModifyDate"] = CommonUtils.TsToBson(fieldSet.ModifyDate);

            var filter = Builders<BsonDocument>.Filter.Eq("_id", fieldSet.Id);
            await Global.CollectionBsonFieldSet.ReplaceOneAsync(filter, bsonDoc);
        }
        else
        {
            fieldSet = new FieldSet
            {
                Id = ObjectId.GenerateNewId().ToString(),
                Name = $"{sourceName} (Auto)",
                Icon = "Dataset",
                Color = "#1976d2",
                Desc = marker,
                CreateDate = CommonUtils.GetNowTimestamp(),
            };
            fieldSet.FieldIds.AddRange(fieldIds);

            var bsonDoc = fieldSet.ToBsonDocument();
            bsonDoc["_id"] = fieldSet.Id;
            bsonDoc["CreateDate"] = CommonUtils.TsToBson(fieldSet.CreateDate);
            bsonDoc["Delete"] = false;

            await Global.CollectionBsonFieldSet!.InsertOneAsync(bsonDoc);
        }

        return fieldSet;
    }

    private async Task<List<DynamicMenuDataSourceField>> DiscoverCollectionFieldsAsync(string collectionName)
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

    private async Task SeedDefaultDynamicMenuDataSourcesAsync()
    {
        var defaults = new[]
        {
            new { SourceKey = "employee", SourceName = "Employee", CollectionName = "Employee" },
            new { SourceKey = "office", SourceName = "Office", CollectionName = "Office" },
        };

        foreach (var seed in defaults)
        {
            var fields = await DiscoverCollectionFieldsAsync(seed.CollectionName);
            var item = new DynamicMenuDataSource
            {
                Id = ObjectId.GenerateNewId().ToString(),
                SourceKey = seed.SourceKey,
                SourceName = seed.SourceName,
                CollectionName = seed.CollectionName,
                Enabled = true,
                CreateDate = CommonUtils.GetNowTimestamp(),
            };
            item.Fields.AddRange(fields);

            var bsonDoc = item.ToBsonDocument();
            bsonDoc["_id"] = item.Id;
            bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
            bsonDoc["Delete"] = false;

            await Global.CollectionBsonDynamicMenuDataSource!.InsertOneAsync(bsonDoc);
        }
    }




    // ================================================================
    // Helper: build ResponseMeta
    // ================================================================
    private static ResponseMeta OkMeta(string message) => new() { Success = true, Message = message };
    private static ResponseMeta FailMeta(string message, string? exception = null) =>
        new() { Success = false, Message = message, MessageException = exception ?? "" };

    // DynamicField CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListDynamicFieldsResponse> GetListDynamicFields(
        GetListDynamicFieldsRequest request, ServerCallContext context)
    {
        var response = new GetListDynamicFieldsResponse();
        try
        {
            var bsonItems = await Global.CollectionBsonDynamicField!.Find(CommonUtils.NotDeleted).ToListAsync();

            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var module = BsonSerializer.Deserialize<DynamicField>(itemBson);
                if (itemBson.Contains("Validation") && itemBson["Validation"].IsBsonDocument)
                {
                    var validationBson = itemBson["Validation"].AsBsonDocument;
                    module.Validation = BsonSerializer.Deserialize<FieldValidation>(validationBson);

                    module.Validation.Options.Clear();
                    if (validationBson.Contains("Options") && validationBson["Options"].IsBsonArray)
                        module.Validation.Options.AddRange(validationBson["Options"].AsBsonArray.Select(x => x.AsString));
                }
                return module;
            }));
            response.Meta = OkMeta($"{response.Items.Count} items");
            logger.LogInformation("GetListDynamicFields: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicFields error");
            response.Meta = FailMeta("Lỗi khi tải danh sách trường", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<SaveDynamicFieldResponse> SaveDynamicField(
        SaveDynamicFieldRequest request, ServerCallContext context)
    {
        var response = new SaveDynamicFieldResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Meta = FailMeta("Dữ liệu không hợp lệ");
                return response;
            }

            var isNew = string.IsNullOrWhiteSpace(item.Id);

            if (isNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonDynamicField!.InsertOneAsync(bsonDoc);
                response.Meta = OkMeta("Thêm trường mới thành công!");
                logger.LogInformation("SaveDynamicField: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);
                bsonDoc["Delete"] = false;

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonDynamicField!.ReplaceOneAsync(filter, bsonDoc);
                response.Meta = OkMeta("Cập nhật trường mới thành công!");
                logger.LogInformation("SaveDynamicField: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicField error");
            response.Meta = FailMeta("Có lỗi xảy ra khi lưu!", ex.Message);
        }

        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteDynamicField(
        DeleteDynamicFieldRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var count = await CommonUtils.DeleteByIdsAsync(Global.CollectionBsonDynamicField!, request.Ids);
            response.Success = count > 0;
            response.Message = $"Đã xoá {count} trường";
            logger.LogInformation("DeleteDynamicField: Deleted {Count}", count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicField error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // FieldSet CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListFieldSetsResponse> GetListFieldSets(
        GetListFieldSetsRequest request, ServerCallContext context)
    {
        var response = new GetListFieldSetsResponse();
        try
        {
            var bsonItems = await Global.CollectionBsonFieldSet!.Find(CommonUtils.NotDeleted).ToListAsync();

            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var fieldSet = BsonSerializer.Deserialize<FieldSet>(itemBson);
                // FieldIds is now a simple string array — BsonSerializer handles it
                return fieldSet;
            }));

            response.Meta = OkMeta($"{response.Items.Count} items");
            logger.LogInformation("GetListFieldSets: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFieldSets error");
            response.Meta = FailMeta("Lỗi khi tải danh sách bộ dữ liệu", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<SaveFieldSetResponse> SaveFieldSet(
        SaveFieldSetRequest request, ServerCallContext context)
    {
        var response = new SaveFieldSetResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Meta = FailMeta("Dữ liệu không hợp lệ");
                return response;
            }

            var isNew = string.IsNullOrWhiteSpace(item.Id);

            if (isNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonFieldSet!.InsertOneAsync(bsonDoc);
                response.Item = item;
                response.Meta = OkMeta("Thêm bộ dữ liệu mới thành công!");
                logger.LogInformation("SaveFieldSet: Created {Id} with {Count} field(s)", item.Id, item.FieldIds.Count);
            }
            else
            {
                item.ModifyDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);
                bsonDoc["Delete"] = false;

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                var result = await Global.CollectionBsonFieldSet!.ReplaceOneAsync(filter, bsonDoc);

                if (result.MatchedCount > 0)
                {
                    response.Item = item;
                    response.Meta = OkMeta("Cập nhật thành công!");
                }
                else
                {
                    response.Meta = FailMeta("Cập nhật không thành công!");
                }
                logger.LogInformation("SaveFieldSet: Updated {Id} with {Count} field(s)", item.Id, item.FieldIds.Count);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFieldSet error");
            response.Meta = FailMeta("Lỗi khi lưu bộ dữ liệu", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteFieldSet(
        DeleteFieldSetRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var count = await CommonUtils.DeleteByIdsAsync(Global.CollectionBsonFieldSet!, request.Ids);
            response.Success = count > 0;
            response.Message = $"Đã xoá {count} bộ dữ liệu";
            logger.LogInformation("DeleteFieldSet: Deleted {Count}", count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteFieldSet error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // FormConfig CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListFormConfigsResponse> GetListFormConfigs(
        GetListFormConfigsRequest request, ServerCallContext context)
    {
        var response = new GetListFormConfigsResponse();
        try
        {
            var bsonItems = await Global.CollectionBsonFormConfig!.Find(CommonUtils.NotDeleted).ToListAsync();

            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var formConfig = BsonSerializer.Deserialize<FormConfig>(itemBson);
                // Tabs & FieldSetIds are simple types — BsonSerializer handles them
                return formConfig;
            }));

            response.Meta = OkMeta($"{response.Items.Count} items");
            logger.LogInformation("GetListFormConfigs: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFormConfigs error");
            response.Meta = FailMeta("Lỗi khi tải danh sách form", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<SaveFormConfigResponse> SaveFormConfig(
        SaveFormConfigRequest request, ServerCallContext context)
    {
        var response = new SaveFormConfigResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Meta = FailMeta("Dữ liệu không hợp lệ");
                return response;
            }

            var isNew = string.IsNullOrWhiteSpace(item.Id);

            if (isNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = CommonUtils.GetNowTimestamp();
                var bsonDoc = item.ToBsonDocument();

                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonFormConfig!.InsertOneAsync(bsonDoc);
                response.Meta = OkMeta("Thêm form mới thành công!");
                logger.LogInformation("SaveFormConfig: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = CommonUtils.GetNowTimestamp();
                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);
                bsonDoc["Delete"] = false;

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonFormConfig!.ReplaceOneAsync(filter, bsonDoc);

                response.Meta = OkMeta("Cập nhật thành công!");
                logger.LogInformation("SaveFormConfig: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFormConfig error");
            response.Meta = FailMeta("Lỗi khi lưu form", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteFormConfig(
        DeleteFormConfigRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var count = await CommonUtils.DeleteByIdsAsync(Global.CollectionBsonFormConfig!, request.Ids);
            response.Success = count > 0;
            response.Message = $"Đã xoá {count} form";
            logger.LogInformation("DeleteFormConfig: Deleted {Count}", count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteFormConfig error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // DynamicMenu CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListDynamicMenusResponse> GetListDynamicMenus(
        GetListDynamicMenusRequest request, ServerCallContext context)
    {
        var response = new GetListDynamicMenusResponse();
        try
        {
            var bsonItems = await Global.CollectionBsonDynamicMenu!.Find(CommonUtils.NotDeleted).ToListAsync();
            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var menu = BsonSerializer.Deserialize<DynamicMenu>(itemBson);

                // Migrate legacy ColumnNames/ColumnKeys → Columns
                menu.Columns.Clear();
                if (itemBson.Contains("Columns") && itemBson["Columns"].IsBsonArray)
                {
                    foreach (var colBson in itemBson["Columns"].AsBsonArray)
                    {
                        if (!colBson.IsBsonDocument) continue;
                        var doc = colBson.AsBsonDocument;
                        menu.Columns.Add(new ColumnConfig
                        {
                            Key = doc.GetValue("Key", "").AsString,
                            Name = doc.GetValue("Name", "").AsString,
                        });
                    }
                }
                else if (itemBson.Contains("ColumnKeys") && itemBson["ColumnKeys"].IsBsonArray)
                {
                    // Legacy format: read parallel arrays
                    var keys = itemBson["ColumnKeys"].AsBsonArray;
                    var names = itemBson.Contains("ColumnNames") && itemBson["ColumnNames"].IsBsonArray
                        ? itemBson["ColumnNames"].AsBsonArray
                        : new BsonArray();

                    for (var i = 0; i < keys.Count; i++)
                    {
                        menu.Columns.Add(new ColumnConfig
                        {
                            Key = keys[i].IsString ? keys[i].AsString : keys[i].ToString()!,
                            Name = i < names.Count && names[i].IsString ? names[i].AsString : $"Cot {i + 1}",
                        });
                    }
                }

                return menu;
            }));
            response.Meta = OkMeta($"{response.Items.Count} items");
            logger.LogInformation("GetListDynamicMenus: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicMenus error");
            response.Meta = FailMeta("Lỗi khi tải danh sách menu động", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<GetDynamicMenuRowsResponse> GetDynamicMenuRows(
        GetDynamicMenuRowsRequest request, ServerCallContext context)
    {
        var response = new GetDynamicMenuRowsResponse();
        try
        {
            var sourceKey = (request.SourceKey ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(sourceKey))
            {
                response.Meta = FailMeta("source_key là bắt buộc");
                return response;
            }

            var dsFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("SourceKey", sourceKey),
                CommonUtils.NotDeleted);

            // Only need CollectionName + Enabled — skip heavy Fields array
            var dsBson = await Global.CollectionBsonDynamicMenuDataSource!
                .Find(dsFilter)
                .Project(Builders<BsonDocument>.Projection
                    .Include("CollectionName")
                    .Include("Enabled"))
                .FirstOrDefaultAsync();

            if (dsBson == null)
            {
                response.Meta = FailMeta($"Không tìm thấy datasource với source_key '{sourceKey}'");
                return response;
            }

            if (!dsBson.GetValue("Enabled", false).AsBoolean)
            {
                response.Meta = FailMeta($"Datasource '{sourceKey}' đang tắt");
                return response;
            }

            var dsCollectionName = dsBson.GetValue("CollectionName", "").AsString;
            var collectionName = string.IsNullOrWhiteSpace(dsCollectionName)
                ? sourceKey
                : dsCollectionName.Trim();

            var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
            if (collection == null)
            {
                response.Meta = FailMeta($"Không thể truy cập collection '{collectionName}'");
                return response;
            }

            var safeLimit = request.Limit <= 0 ? 500 : Math.Clamp(request.Limit, 1, 2000);

            // Try to get column_keys from DynamicMenu for projection
            var menuBson = await Global.CollectionBsonDynamicMenu!
                .Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("DataSource", sourceKey),
                    CommonUtils.NotDeleted))
                .Project(Builders<BsonDocument>.Projection.Include("Columns").Include("ColumnKeys"))
                .FirstOrDefaultAsync();

            var columnKeys = ExtractColumnKeys(menuBson);
            var projection = columnKeys.Count > 0
                ? BuildProjection(columnKeys)
                : (ProjectionDefinition<BsonDocument>?)null;

            var findFluent = collection
                .Find(Builders<BsonDocument>.Filter.Empty)
                .Sort(Builders<BsonDocument>.Sort.Ascending("_id"))
                .Limit(safeLimit);

            if (projection != null)
                findFluent = findFluent.Project<BsonDocument>(projection);

            var docs = await findFluent.ToListAsync();

            var jsonSettings = new MongoDB.Bson.IO.JsonWriterSettings
            {
                OutputMode = MongoDB.Bson.IO.JsonOutputMode.RelaxedExtendedJson,
            };

            foreach (var doc in docs)
            {
                var json = doc.ToJson(jsonSettings);
                var structValue = Struct.Parser.ParseJson(json);
                response.Rows.Add(structValue);
            }

            response.Meta = OkMeta($"Lấy {response.Rows.Count} bản ghi từ '{collectionName}'");
            logger.LogInformation(
                "GetDynamicMenuRows: source_key={SourceKey}, collection={Collection}, count={Count}",
                sourceKey, collectionName, response.Rows.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetDynamicMenuRows error");
            response.Meta = FailMeta("Lỗi khi tải dữ liệu menu động", ex.Message);
        }

        return response;
    }

    private static List<string> ExtractColumnKeys(BsonDocument? menuBson)
    {
        if (menuBson == null) return [];

        // New format: Columns array of {Key, Name}
        if (menuBson.Contains("Columns") && menuBson["Columns"].IsBsonArray)
        {
            return menuBson["Columns"].AsBsonArray
                .Where(c => c.IsBsonDocument)
                .Select(c => c.AsBsonDocument.GetValue("Key", "").AsString)
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .ToList();
        }

        // Legacy format: ColumnKeys string array
        if (menuBson.Contains("ColumnKeys") && menuBson["ColumnKeys"].IsBsonArray)
        {
            return menuBson["ColumnKeys"].AsBsonArray
                .Where(k => k.IsString)
                .Select(k => k.AsString)
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .ToList();
        }

        return [];
    }

    private static ProjectionDefinition<BsonDocument> BuildProjection(List<string> keys)
    {
        var proj = Builders<BsonDocument>.Projection.Include("_id");
        foreach (var key in keys)
            proj = proj.Include(key);
        return proj;
    }

    [Authorize]
    public override async Task<SaveDynamicMenuResponse> SaveDynamicMenu(
        SaveDynamicMenuRequest request, ServerCallContext context)
    {
        var response = new SaveDynamicMenuResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Meta = FailMeta("Dữ liệu không hợp lệ");
                return response;
            }

            item.GridCount = Math.Clamp(item.GridCount, 1, 6);
            item.ColumnCount = Math.Clamp(item.ColumnCount <= 0 ? 4 : item.ColumnCount, 1, 12);
            item.DataSource = string.IsNullOrWhiteSpace(item.DataSource) ? "employee" : item.DataSource.Trim().ToLowerInvariant();

            // Sanitize columns
            var sanitized = item.Columns
                .Where(c => !string.IsNullOrWhiteSpace(c.Key))
                .Select(c => new ColumnConfig
                {
                    Key = c.Key.Trim(),
                    Name = string.IsNullOrWhiteSpace(c.Name) ? c.Key.Trim() : c.Name.Trim(),
                })
                .Take(item.ColumnCount)
                .ToList();
            while (sanitized.Count < item.ColumnCount)
                sanitized.Add(new ColumnConfig { Key = "id", Name = $"Cot {sanitized.Count + 1}" });
            item.Columns.Clear();
            item.Columns.AddRange(sanitized);

            var isNew = string.IsNullOrWhiteSpace(item.Id);

            if (isNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonDynamicMenu!.InsertOneAsync(bsonDoc);
                response.Meta = OkMeta("Thêm menu động thành công!");
                logger.LogInformation("SaveDynamicMenu: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);
                bsonDoc["Delete"] = false;

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonDynamicMenu!.ReplaceOneAsync(filter, bsonDoc);

                response.Meta = OkMeta("Cập nhật menu động thành công!");
                logger.LogInformation("SaveDynamicMenu: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicMenu error");
            response.Meta = FailMeta("Lỗi khi lưu menu động", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteDynamicMenu(
        DeleteDynamicMenuRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var count = await CommonUtils.DeleteByIdsAsync(Global.CollectionBsonDynamicMenu!, request.Ids);
            response.Success = count > 0;
            response.Message = $"Đã xoá {count} menu động";
            logger.LogInformation("DeleteDynamicMenu: Deleted {Count}", count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicMenu error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override async Task<GetListDynamicMenuDataSourcesResponse> GetListDynamicMenuDataSources(
    GetListDynamicMenuDataSourcesRequest request, ServerCallContext context)
    {
        var response = new GetListDynamicMenuDataSourcesResponse();
        try
        {
            var filter = CommonUtils.NotDeleted;
            var bsonItems = await Global.CollectionBsonDynamicMenuDataSource!.Find(filter).ToListAsync();
            if (bsonItems.Count == 0)
            {
                await SeedDefaultDynamicMenuDataSourcesAsync();
                bsonItems = await Global.CollectionBsonDynamicMenuDataSource.Find(filter).ToListAsync();
            }

            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var ds = BsonSerializer.Deserialize<DynamicMenuDataSource>(itemBson);
                ds.Fields.Clear();
                if (itemBson.Contains("Fields") && itemBson["Fields"].IsBsonArray)
                {
                    foreach (var fb in itemBson["Fields"].AsBsonArray)
                    {
                        if (!fb.IsBsonDocument) continue;
                        var fd = fb.AsBsonDocument;
                        ds.Fields.Add(BsonSerializer.Deserialize<DynamicMenuDataSourceField>(fd));
                    }
                }
                return ds;
            }));

            response.Meta = OkMeta($"{response.Items.Count} items");
            logger.LogInformation("GetListDynamicMenuDataSources: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicMenuDataSources error");
            response.Meta = FailMeta("Lỗi khi tải danh sách datasource", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<SaveDynamicMenuDataSourceResponse> SaveDynamicMenuDataSource(
        SaveDynamicMenuDataSourceRequest request, ServerCallContext context)
    {
        var response = new SaveDynamicMenuDataSourceResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Meta = FailMeta("Dữ liệu không hợp lệ");
                return response;
            }

            item.SourceKey = string.IsNullOrWhiteSpace(item.SourceKey)
                ? "employee"
                : item.SourceKey.Trim().ToLowerInvariant();
            item.SourceName = string.IsNullOrWhiteSpace(item.SourceName)
                ? item.SourceKey
                : item.SourceName.Trim();
            item.CollectionName = string.IsNullOrWhiteSpace(item.CollectionName)
                ? item.SourceKey
                : item.CollectionName.Trim();

            var normalizedFields = item.Fields
                .Where(field => !string.IsNullOrWhiteSpace(field.Key))
                .Select(field => new DynamicMenuDataSourceField
                {
                    Key = field.Key.Trim(),
                    Label = string.IsNullOrWhiteSpace(field.Label) ? field.Key.Trim() : field.Label.Trim(),
                    DataType = string.IsNullOrWhiteSpace(field.DataType) ? "string" : field.DataType.Trim().ToLowerInvariant(),
                })
                .GroupBy(field => field.Key)
                .Select(group => group.First())
                .ToList();

            if (normalizedFields.Count == 0)
            {
                normalizedFields.Add(new DynamicMenuDataSourceField
                {
                    Key = "id",
                    Label = "ID",
                    DataType = "string",
                });
            }

            item.Fields.Clear();
            item.Fields.AddRange(normalizedFields);

            var isNew = string.IsNullOrWhiteSpace(item.Id);

            if (isNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = CommonUtils.GetNowTimestamp();
                item.Enabled = true;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonDynamicMenuDataSource!.InsertOneAsync(bsonDoc);
                response.Meta = OkMeta("Thêm datasource menu động thành công!");
                logger.LogInformation("SaveDynamicMenuDataSource: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);
                bsonDoc["Delete"] = false;

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonDynamicMenuDataSource!.ReplaceOneAsync(filter, bsonDoc);

                response.Meta = OkMeta("Cập nhật datasource menu động thành công!");
                logger.LogInformation("SaveDynamicMenuDataSource: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicMenuDataSource error");
            response.Meta = FailMeta("Lỗi khi lưu datasource", ex.Message);
        }
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteDynamicMenuDataSource(
        DeleteDynamicMenuDataSourceRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var count = await CommonUtils.DeleteByIdsAsync(Global.CollectionBsonDynamicMenuDataSource!, request.Ids);
            response.Success = count > 0;
            response.Message = $"Đã xoá {count} datasource menu động";
            logger.LogInformation("DeleteDynamicMenuDataSource: Deleted {Count}", count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicMenuDataSource error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    [Authorize]
    public override async Task<GetListTemplateLayoutsResponse> GetListTemplateLayouts(
        GetListTemplateLayoutsRequest request, ServerCallContext context)
    {
        var response = new GetListTemplateLayoutsResponse();
        try
        {
            var items = await Global.CollectionBsonTemplateLayout!
                .Find(CommonUtils.NotDeleted)
                .ToListAsync();

            response.Items.AddRange(items.Select(itemBson =>
            {
                var layout = BsonSerializer.Deserialize<TemplateLayout>(itemBson);
                if (itemBson.Contains("CreateDate")) layout.CreateDate = CommonUtils.BsonToTs(itemBson["CreateDate"]);
                if (itemBson.Contains("ModifyDate")) layout.ModifyDate = CommonUtils.BsonToTs(itemBson["ModifyDate"]);
                return layout;
            }));

            response.Meta = OkMeta($"{response.Items.Count} items");
            logger.LogInformation("GetListTemplateLayouts: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListTemplateLayouts error");
            response.Meta = FailMeta("Lỗi khi tải danh sách template", ex.Message);
        }

        return response;
    }

    [Authorize]
    public override async Task<SaveTemplateLayoutResponse> SaveTemplateLayout(
        SaveTemplateLayoutRequest request, ServerCallContext context)
    {
        var response = new SaveTemplateLayoutResponse();
        try
        {
            var item = request.Item;
            if (item == null)
            {
                response.Meta = FailMeta("Dữ liệu không hợp lệ");
                return response;
            }

            item.Key = string.IsNullOrWhiteSpace(item.Key)
                ? (item.Name ?? string.Empty).Trim().ToLowerInvariant().Replace(" ", "-")
                : item.Key.Trim().ToLowerInvariant();
            item.Name = string.IsNullOrWhiteSpace(item.Name) ? item.Key : item.Name.Trim();
            item.SchemaJson = string.IsNullOrWhiteSpace(item.SchemaJson) ? "{}" : item.SchemaJson;

            var isNew = string.IsNullOrWhiteSpace(item.Id);

            if (isNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonTemplateLayout!.InsertOneAsync(bsonDoc);
                response.Meta = OkMeta("Thêm template layout thành công");
            }
            else
            {
                item.ModifyDate = CommonUtils.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);
                bsonDoc["Delete"] = false;

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonTemplateLayout!.ReplaceOneAsync(filter, bsonDoc);

                response.Meta = OkMeta("Cập nhật template layout thành công");
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveTemplateLayout error");
            response.Meta = FailMeta("Lỗi khi lưu template", ex.Message);
        }

        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteTemplateLayout(
        DeleteTemplateLayoutRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var count = await CommonUtils.DeleteByIdsAsync(Global.CollectionBsonTemplateLayout!, request.Ids);
            response.Success = count > 0;
            response.Message = $"Đã xoá {count} template layout";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteTemplateLayout error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // Sync DynamicMenuDataSources từ proto schema — BulkWrite
    // ================================================================
    [Authorize]
    public override async Task<SyncDynamicMenuDataSourcesFromProtoResponse> SyncDynamicMenuDataSourcesFromProto(
        SyncDynamicMenuDataSourcesFromProtoRequest request, ServerCallContext context)
    {
        var response = new SyncDynamicMenuDataSourcesFromProtoResponse();
        try
        {
            var protoRegistryMap = await GetProtoRegistryAsync();
            logger.LogInformation(
                "SyncFromProto: registry candidates={Count}, keys={Keys}",
                protoRegistryMap.Count,
                string.Join(", ", protoRegistryMap.Keys.OrderBy(k => k)));

            var requestedKey = request.SourceKey?.Trim() ?? "";
            var toSync = string.IsNullOrWhiteSpace(requestedKey)
                ? protoRegistryMap
                : protoRegistryMap
                    .Where(kvp =>
                        kvp.Key.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        || kvp.Value.Descriptor.Name.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        || ToKebabCase(kvp.Value.Descriptor.Name).Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                    )
                    .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            if (toSync.Count == 0)
            {
                response.Meta = FailMeta(
                    $"Không tìm thấy proto mapping cho source_key '{request.SourceKey}'. " +
                    $"Các key hợp lệ: {string.Join(", ", protoRegistryMap.Keys)}");
                return response;
            }

            var F = Builders<BsonDocument>.Filter;
            var col = Global.CollectionBsonDynamicMenuDataSource!;
            var keys = toSync.Keys.ToList();

            // 1 query: fetch all existing docs matching any of the sync keys
            var existingDocs = await col
                .Find(F.And(F.In("SourceKey", keys), CommonUtils.NotDeleted))
                .ToListAsync();
            var existingMap = existingDocs.ToDictionary(
                d => d.GetValue("SourceKey", "").AsString,
                d => d,
                StringComparer.OrdinalIgnoreCase);

            // Build all ops in memory
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
                    item.ModifyDate = CommonUtils.GetNowTimestamp();

                    var bsonDoc = item.ToBsonDocument();
                    bsonDoc["_id"] = item.Id;
                    bsonDoc["ModifyDate"] = CommonUtils.TsToBson(item.ModifyDate);
                    bsonDoc["Delete"] = false;

                    bulkOps.Add(new ReplaceOneModel<BsonDocument>(
                        F.Eq("_id", item.Id), bsonDoc));
                }
                else
                {
                    item = new DynamicMenuDataSource
                    {
                        Id = ObjectId.GenerateNewId().ToString(),
                        SourceKey = sourceKey,
                        SourceName = sourceName,
                        CollectionName = collectionName,
                        Enabled = true,
                        CreateDate = CommonUtils.GetNowTimestamp(),
                    };
                    item.Fields.AddRange(fields);

                    var bsonDoc = item.ToBsonDocument();
                    bsonDoc["_id"] = item.Id;
                    bsonDoc["CreateDate"] = CommonUtils.TsToBson(item.CreateDate);
                    bsonDoc["Delete"] = false;

                    bulkOps.Add(new InsertOneModel<BsonDocument>(bsonDoc));
                }

                syncedItems.Add(item);
            }

            // 1 round-trip for all writes
            if (bulkOps.Count > 0)
                await col.BulkWriteAsync(bulkOps);

            response.Items.AddRange(syncedItems);
            response.Meta = OkMeta(
                $"Đồng bộ thành công {syncedItems.Count} datasource từ proto schema. " +
                $"Synced keys: {string.Join(", ", toSync.Keys.OrderBy(k => k))}");

            logger.LogInformation("SyncFromProto: synced {Count} items", syncedItems.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SyncDynamicMenuDataSourcesFromProto error");
            response.Meta = FailMeta("Lỗi khi đồng bộ từ proto", ex.Message);
        }
        return response;
    }

    // ================================================================
    // Discover collection fields từ MongoDB (scan thực tế)
    // ================================================================
    [Authorize]
    public override async Task<DiscoverCollectionFieldsResponse> DiscoverCollectionFields(
        DiscoverCollectionFieldsRequest request, ServerCallContext context)
    {
        var response = new DiscoverCollectionFieldsResponse();
        try
        {
            var rawCollectionName = request.CollectionName?.Trim();
            if (string.IsNullOrEmpty(rawCollectionName))
            {
                response.Meta = FailMeta("Vui lòng nhập tên collection.");
                return response;
            }

            var collectionName = ResolveActualCollectionName(rawCollectionName);
            if (!collectionName.Equals(rawCollectionName, StringComparison.OrdinalIgnoreCase))
                logger.LogInformation("DiscoverCollectionFields: alias resolved {From} → {To}", rawCollectionName, collectionName);

            var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
            if (collection == null)
            {
                response.Meta = FailMeta("Không thể kết nối MongoDB.");
                return response;
            }

            // Scan 50 docs directly — no need for separate count query
            var documents = await collection
                .Find(Builders<BsonDocument>.Filter.Empty)
                .Limit(50)
                .ToListAsync();

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
            response.Meta = OkMeta(fields.Count > 0
                ? $"Tìm thấy {fields.Count} fields từ {documents.Count} documents"
                : $"Collection '{collectionName}' rỗng hoặc không có fields");

            logger.LogInformation("DiscoverCollectionFields: {Col} → {Fields} fields / {Scanned} docs scanned",
                collectionName, fields.Count, documents.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DiscoverCollectionFields error");
            response.Meta = FailMeta("Lỗi khi khám phá collection", ex.Message);
        }
        return response;
    }



}
