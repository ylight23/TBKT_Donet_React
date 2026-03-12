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

    private Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>
        BuildProtoRegistryMap()
    {
        var result = new Dictionary<string, (string SourceName, string CollectionName, Google.Protobuf.Reflection.MessageDescriptor Descriptor)>(
            StringComparer.OrdinalIgnoreCase);

        var collectionNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (Global.MongoDB != null)
        {
            foreach (var collectionName in Global.MongoDB.ListCollectionNames().ToList())
            {
                collectionNames.Add(collectionName);
            }
        }

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
        var synced = new List<DynamicField>();

        foreach (var sourceField in sourceFields.Where(f => !string.IsNullOrWhiteSpace(f.Key)))
        {
            var key = sourceField.Key.Trim();
            var label = string.IsNullOrWhiteSpace(sourceField.Label) ? ToTitleLabel(key) : sourceField.Label.Trim();
            var dynamicType = MapSourceDataTypeToDynamicFieldType(sourceField.DataType);

            var existingFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("Key", key),
                Builders<BsonDocument>.Filter.Eq("Validation.DataSource", sourceKey),
                Builders<BsonDocument>.Filter.Ne("Delete", true)
            );

            var existingBson = await Global.CollectionBsonDynamicField!
                .Find(existingFilter)
                .FirstOrDefaultAsync();

            DynamicField item;
            if (existingBson != null)
            {
                item = BsonSerializer.Deserialize<DynamicField>(existingBson);
                item.Label = label;
                item.Type = dynamicType;
                item.Required = false;
                item.Delete = false;
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                item.Validation ??= new FieldValidation();
                item.Validation.DataSource = sourceKey;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = FromTimestamp(item.ModifyDate);

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonDynamicField.FindOneAndReplaceAsync(filter, bsonDoc);
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
                    Delete = false,
                    CreateDate = Timestamp.FromDateTime(DateTime.UtcNow),
                    Validation = new FieldValidation
                    {
                        DataSource = sourceKey,
                    },
                };

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonDynamicField!.InsertOneAsync(bsonDoc);
            }

            synced.Add(item);
        }

        return synced;
    }

    private async Task<FieldSet?> UpsertAutoFieldSetForSourceAsync(
        string sourceKey,
        string sourceName,
        List<DynamicField> fields)
    {
        if (fields.Count == 0) return null;

        var marker = $"AUTO_PROTO_SOURCE:{sourceKey}";
        var existingFilter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("Desc", marker),
            Builders<BsonDocument>.Filter.Ne("Delete", true)
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
            fieldSet.Delete = false;
            fieldSet.Fields.Clear();
            fieldSet.Fields.AddRange(fields);
            fieldSet.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);

            var bsonDoc = fieldSet.ToBsonDocument();
            bsonDoc["_id"] = fieldSet.Id;
            bsonDoc["ModifyDate"] = FromTimestamp(fieldSet.ModifyDate);

            var filter = Builders<BsonDocument>.Filter.Eq("_id", fieldSet.Id);
            await Global.CollectionBsonFieldSet.FindOneAndReplaceAsync(filter, bsonDoc);
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
                Delete = false,
                CreateDate = Timestamp.FromDateTime(DateTime.UtcNow),
            };
            fieldSet.Fields.AddRange(fields);

            var bsonDoc = fieldSet.ToBsonDocument();
            bsonDoc["_id"] = fieldSet.Id;
            bsonDoc["CreateDate"] = FromTimestamp(fieldSet.CreateDate);
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
                Delete = false,
                CreateDate = Timestamp.FromDateTime(DateTime.UtcNow),
            };
            item.Fields.AddRange(fields);

            var bsonDoc = item.ToBsonDocument();
            bsonDoc["_id"] = item.Id;
            bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);
            bsonDoc["Delete"] = false;

            await Global.CollectionBsonDynamicMenuDataSource!.InsertOneAsync(bsonDoc);
        }
    }



    private static Timestamp? ToTimestamp(BsonValue? value)
    {
        if (value == null || value.IsBsonNull) return null;
        if (value.IsBsonDateTime) return Timestamp.FromDateTime(value.ToUniversalTime());
        if (value.IsBsonDocument)
        {
            var doc = value.AsBsonDocument;
            return new Timestamp
            {
                Seconds = doc.GetValue("Seconds", 0L).ToInt64(),
                Nanos = doc.GetValue("Nanos", 0).ToInt32()
            };
        }
        return null;
    }



    private static BsonValue FromTimestamp(Timestamp? ts)
    {
        if (ts == null) return BsonNull.Value;
        // Store as subdocument to keep precision and ease of proto mapping
        return new BsonDocument { { "Seconds", ts.Seconds }, { "Nanos", ts.Nanos } };
    }


    // DynamicField CRUD
    // ================================================================
    [Authorize]
    public override async Task<GetListDynamicFieldsResponse> GetListDynamicFields(
        GetListDynamicFieldsRequest request, ServerCallContext context)
    {
        var response = new GetListDynamicFieldsResponse();
        try
        {
            // Debug: Get collection name and total count
            var collectionName = Global.CollectionBsonDynamicField?.CollectionNamespace.CollectionName;
            var totalCount = await Global.CollectionBsonDynamicField!.CountDocumentsAsync(Builders<BsonDocument>.Filter.Empty);
            logger.LogInformation("GetListDynamicFields: Collection '{Collection}' has {Total} total documents", collectionName, totalCount);

            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            var bsonItems = await Global.CollectionBsonDynamicField.Find(filter).ToListAsync();

            logger.LogInformation("GetListDynamicFields: Found {Count} non-deleted items (filter: Delete != true)", bsonItems.Count);

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
            response.Success = true;
            logger.LogInformation($"GetListDynamicFields: {response.Items.Count} items");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicFields error");
            response.Success = false;
            response.MessageException = ex.Message;
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
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                return response;
            }
            // item.Validation.Options.AddRange(request.Item.Validation.Options.ToList());
            var bsonDoc = item.ToBsonDocument();
            if (request.IsNew)
            {
                // Always generate new ObjectId, ignore temp ID from frontend
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                item.Delete = false;

                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);
                bsonDoc["Delete"] = false;

                //await Global.CollectionDynamicField!.InsertOneAsync(item);
                await Global.CollectionBsonDynamicField!.InsertOneAsync(bsonDoc);
                response.Success = true;
                response.Message = "Thêm trường mới thành công!";
                logger.LogInformation("SaveDynamicField: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);

                bsonDoc["ModifyDate"] = FromTimestamp(item.ModifyDate);

                //var filter = Builders<DynamicField>.Filter.Eq(x => x.Id, item.Id);
                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);

                //await Global.CollectionDynamicField!.FindOneAndReplaceAsync(filter, item);
                await Global.CollectionBsonDynamicField!.FindOneAndReplaceAsync(filter, bsonDoc);
                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveDynamicField: Updated {Id}", item.Id);
            }

            response.Item = item;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message} [{ex.StackTrace}]");
            response.Success = false;
            response.Message = "Có lỗi xảy ra khi lưu!";
            response.MessageException = ex.Message;
        }

        GC.Collect();
        return response;
    }

    [Authorize]
    public override async Task<DeleteBaseResponse> DeleteDynamicField(
        DeleteDynamicFieldRequest request, ServerCallContext context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            var ids = new List<string>();
            if (!string.IsNullOrEmpty(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var result = await Global.CollectionBsonDynamicField!.DeleteManyAsync(filter);

            response.Success = result.DeletedCount > 0;
            response.Message = $"Đã xoá {result.DeletedCount} trường";
            logger.LogInformation("DeleteDynamicField: Deleted {Count}", result.DeletedCount);
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
            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            var bsonItems = await Global.CollectionBsonFieldSet!.Find(filter).ToListAsync();

            // response.Items.AddRange(bsonItems.Select(b => MapFieldSetWithFields(b)));


            //  var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            //  var bsonItems = Global.CollectionBsonDynamicField!.Find(filter).ToList();


            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var module = BsonSerializer.Deserialize<FieldSet>(itemBson);
                module.Fields.Clear();
                if (itemBson.Contains("Fields") && itemBson["Fields"].IsBsonArray)
                {
                    foreach (var fieldBson in itemBson["Fields"].AsBsonArray)
                    {
                        if (!fieldBson.IsBsonDocument) continue;
                        var field = BsonSerializer.Deserialize<DynamicField>(fieldBson.AsBsonDocument);
                        if (fieldBson.AsBsonDocument.Contains("Validation") && fieldBson.AsBsonDocument["Validation"].IsBsonDocument)
                            field.Validation = BsonSerializer.Deserialize<FieldValidation>(fieldBson.AsBsonDocument["Validation"].AsBsonDocument);
                        module.Fields.Add(field);
                    }
                }

                return module;
            }));



            response.Success = true;
            logger.LogInformation("GetListFieldSets: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFieldSets error");
            response.Success = false;
            response.MessageException = ex.Message;
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
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                return response;
            }
            //item.Fields.Clear();
            // item.Fields.AddRange(request.Item.Fields);

            if (request.IsNew)
            {
                var bsonDoc = item.ToBsonDocument();
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);

                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);

                //await Global.CollectionFieldSet!.InsertOneAsync(item);
                await Global.CollectionBsonFieldSet!.InsertOneAsync(bsonDoc);
                response.Item = item;
                response.Success = true;
                response.Message = "Thêm bộ dữ liệu mới thành công!";

                logger.LogInformation("SaveFieldSet: Created {Id} with {Count} field(s)", item.Id, item.Fields.Count);
            }
            else
            {
                var bsonDoc = item.ToBsonDocument();
                //var filter = Builders<FieldSet>.Filter.Eq(x => x.Id, item.Id);
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);

                bsonDoc["ModifyDate"] = FromTimestamp(item.ModifyDate);
                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);

                //var updateItem = await Global.CollectionFieldSet!.FindOneAndReplaceAsync(filter, item);
                var updateItem = await Global.CollectionBsonFieldSet!.FindOneAndReplaceAsync(filter, bsonDoc);

                if (updateItem != null)
                {
                    response.Item = item;
                    response.Success = true;
                    response.Message = "Cập nhật thành công!";

                }
                else
                {
                    response.Success = false;
                    response.Message = "Cập nhật không thành công!";
                }
                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveFieldSet: Updated {Id} with {Count} field(s)", item.Id, item.Fields.Count);
            }

        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFieldSet error");
            response.Success = false;
            response.MessageException = ex.Message;
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
            var ids = new List<string>();
            if (!string.IsNullOrEmpty(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var result = await Global.CollectionBsonFieldSet!.DeleteManyAsync(filter);

            response.Success = result.DeletedCount > 0;
            response.Message = $"Đã xoá {result.DeletedCount} bộ dữ liệu";
            logger.LogInformation("DeleteFieldSet: Deleted {Count}", result.DeletedCount);
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
            var bsonItems = await Global.CollectionBsonFormConfig!.Find(Builders<BsonDocument>.Filter.Ne("Delete", true)).ToListAsync();


            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var module = BsonSerializer.Deserialize<FormConfig>(itemBson);
                module.Tabs.Clear();
                if (itemBson.Contains("Tabs") && itemBson["Tabs"].IsBsonArray)
                {

                    module.Tabs.AddRange(itemBson["Tabs"].AsBsonArray.Select(tabBson =>
                    {
                        if (!tabBson.IsBsonDocument) return null;
                        var tab = BsonSerializer.Deserialize<FormTabConfig>(tabBson.AsBsonDocument);
                        tab.FieldSets.Clear();
                        var tabDoc = tabBson.AsBsonDocument;
                        if (tabDoc.Contains("FieldSets") && tabDoc["FieldSets"].IsBsonArray)
                        {
                            foreach (var fsBson in tabDoc["FieldSets"].AsBsonArray)
                                if (fsBson.IsBsonDocument)
                                    tab.FieldSets.Add(BsonSerializer.Deserialize<FieldSet>(fsBson.AsBsonDocument));
                        }
                        return tab;
                    }).Where(t => t != null));
                }

                return module;
            }));

            // response.Items.AddRange(bsonItems.Select(itemBson =>
            // {
            //     logger.LogInformation("FormConfig raw: {Json}", itemBson.ToJson());
            //     var module = BsonSerializer.Deserialize<FormConfig>(itemBson);
            //     return module;
            // }));




            response.Success = true;
            logger.LogInformation("GetListFormConfigs: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListFormConfigs error");
            response.Success = false;
            response.MessageException = ex.Message;
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
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                return response;
            }
            if (request.IsNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                var bsonDoc = item.ToBsonDocument();

                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);
                bsonDoc["Delete"] = false;

                //await Global.CollectionFormConfig!.InsertOneAsync(item);
                await Global.CollectionBsonFormConfig!.InsertOneAsync(bsonDoc);
                response.Success = true;
                response.Message = "Thêm form mới thành công!";
                logger.LogInformation("SaveFormConfig: Created {Id}", item.Id);
            }
            else
            {

                // var filter = Builders<FormConfig>.Filter.Eq(x => x.Id, item.Id);
                // await Global.CollectionFormConfig!.FindOneAndReplaceAsync(filter, item);
                // item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);

                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);
                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = FromTimestamp(item.ModifyDate);

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonFormConfig!.FindOneAndReplaceAsync(filter, bsonDoc);

                response.Message = "Cập nhật thành công!";
                logger.LogInformation("SaveFormConfig: Updated {Id}", item.Id);
            }

            response.Item = item;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveFormConfig error");
            response.Success = false;
            response.MessageException = ex.Message;
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
            var ids = new List<string>();
            if (!string.IsNullOrEmpty(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var result = await Global.CollectionBsonFormConfig!.DeleteManyAsync(filter);

            response.Success = result.DeletedCount > 0;
            response.Message = $"Đã xoá {result.DeletedCount} form";
            logger.LogInformation("DeleteFormConfig: Deleted {Count}", result.DeletedCount);
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
            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
            var bsonItems = await Global.CollectionBsonDynamicMenu!.Find(filter).ToListAsync();
            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var menu = BsonSerializer.Deserialize<DynamicMenu>(itemBson);

                // RepeatedField<string> can be dropped by plain BSON deserialize in some documents.
                menu.ColumnNames.Clear();
                if (itemBson.Contains("ColumnNames") && itemBson["ColumnNames"].IsBsonArray)
                {
                    foreach (var nameBson in itemBson["ColumnNames"].AsBsonArray)
                    {
                        var value = nameBson.IsString ? nameBson.AsString : nameBson.ToString();
                        if (!string.IsNullOrWhiteSpace(value))
                            menu.ColumnNames.Add(value.Trim());
                    }
                }

                menu.ColumnKeys.Clear();
                if (itemBson.Contains("ColumnKeys") && itemBson["ColumnKeys"].IsBsonArray)
                {
                    foreach (var keyBson in itemBson["ColumnKeys"].AsBsonArray)
                    {
                        var value = keyBson.IsString ? keyBson.AsString : keyBson.ToString();
                        if (!string.IsNullOrWhiteSpace(value))
                            menu.ColumnKeys.Add(value.Trim());
                    }
                }

                return menu;
            }));
            response.Success = true;
            logger.LogInformation("GetListDynamicMenus: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicMenus error");
            response.Success = false;
            response.MessageException = ex.Message;
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
                response.Success = false;
                response.Message = "source_key là bắt buộc";
                return response;
            }

            var dsFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("SourceKey", sourceKey),
                Builders<BsonDocument>.Filter.Ne("Delete", true));

            var dsBson = await Global.CollectionBsonDynamicMenuDataSource!
                .Find(dsFilter)
                .FirstOrDefaultAsync();

            if (dsBson == null)
            {
                response.Success = false;
                response.Message = $"Không tìm thấy datasource với source_key '{sourceKey}'";
                return response;
            }

            var ds = BsonSerializer.Deserialize<DynamicMenuDataSource>(dsBson);
            if (!ds.Enabled)
            {
                response.Success = false;
                response.Message = $"Datasource '{sourceKey}' đang tắt";
                return response;
            }

            var collectionName = string.IsNullOrWhiteSpace(ds.CollectionName)
                ? sourceKey
                : ds.CollectionName.Trim();

            var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
            if (collection == null)
            {
                response.Success = false;
                response.Message = $"Không thể truy cập collection '{collectionName}'";
                return response;
            }

            var safeLimit = request.Limit <= 0 ? 500 : Math.Clamp(request.Limit, 1, 2000);

            var docs = await collection
                .Find(Builders<BsonDocument>.Filter.Empty)
                .Limit(safeLimit)
                .ToListAsync();

            foreach (var doc in docs)
            {
                var json = doc.ToJson(new MongoDB.Bson.IO.JsonWriterSettings
                {
                    OutputMode = MongoDB.Bson.IO.JsonOutputMode.RelaxedExtendedJson,
                });
                response.RowsJson.Add(json);
            }

            response.Success = true;
            response.Message = $"Lấy {response.RowsJson.Count} bản ghi từ '{collectionName}'";
            logger.LogInformation(
                "GetDynamicMenuRows: source_key={SourceKey}, collection={Collection}, count={Count}",
                sourceKey,
                collectionName,
                response.RowsJson.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetDynamicMenuRows error");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
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
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                return response;
            }

            item.GridCount = Math.Clamp(item.GridCount, 1, 6);
            item.ColumnCount = Math.Clamp(item.ColumnCount <= 0 ? 4 : item.ColumnCount, 1, 12);
            item.DataSource = string.IsNullOrWhiteSpace(item.DataSource) ? "employee" : item.DataSource.Trim().ToLowerInvariant();

            var sanitizedColumnNames = item.ColumnNames
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name.Trim())
                .Take(item.ColumnCount)
                .ToList();
            while (sanitizedColumnNames.Count < item.ColumnCount)
                sanitizedColumnNames.Add($"Cot {sanitizedColumnNames.Count + 1}");
            item.ColumnNames.Clear();
            item.ColumnNames.AddRange(sanitizedColumnNames);

            var sanitizedColumnKeys = item.ColumnKeys
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Select(key => key.Trim())
                .Take(item.ColumnCount)
                .ToList();
            while (sanitizedColumnKeys.Count < item.ColumnCount)
                sanitizedColumnKeys.Add("id");
            item.ColumnKeys.Clear();
            item.ColumnKeys.AddRange(sanitizedColumnKeys);

            if (request.IsNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                item.Delete = false;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonDynamicMenu!.InsertOneAsync(bsonDoc);
                response.Success = true;
                response.Message = "Thêm menu động thành công!";
                logger.LogInformation("SaveDynamicMenu: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = FromTimestamp(item.ModifyDate);

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonDynamicMenu!.FindOneAndReplaceAsync(filter, bsonDoc);

                response.Success = true;
                response.Message = "Cập nhật menu động thành công!";
                logger.LogInformation("SaveDynamicMenu: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicMenu error");
            response.Success = false;
            response.MessageException = ex.Message;
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
            var ids = new List<string>();
            if (!string.IsNullOrEmpty(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var result = await Global.CollectionBsonDynamicMenu!.DeleteManyAsync(filter);

            response.Success = result.DeletedCount > 0;
            response.Message = $"Đã xoá {result.DeletedCount} menu động";
            logger.LogInformation("DeleteDynamicMenu: Deleted {Count}", result.DeletedCount);
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
            var filter = Builders<BsonDocument>.Filter.Ne("Delete", true);
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

            response.Success = true;
            logger.LogInformation("GetListDynamicMenuDataSources: {Count} items, fields per source: {Detail}",
                response.Items.Count,
                string.Join("; ", response.Items.Select(i => $"{i.SourceKey}={i.Fields.Count}fields")));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicMenuDataSources error");
            response.Success = false;
            response.MessageException = ex.Message;
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
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
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

            if (request.IsNew)
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = Timestamp.FromDateTime(DateTime.UtcNow);
                item.Delete = false;
                item.Enabled = true;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);
                bsonDoc["Delete"] = false;

                await Global.CollectionBsonDynamicMenuDataSource!.InsertOneAsync(bsonDoc);
                response.Success = true;
                response.Message = "Thêm datasource menu động thành công!";
                logger.LogInformation("SaveDynamicMenuDataSource: Created {Id}", item.Id);
            }
            else
            {
                item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                bsonDoc["ModifyDate"] = FromTimestamp(item.ModifyDate);

                var filter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                await Global.CollectionBsonDynamicMenuDataSource!.FindOneAndReplaceAsync(filter, bsonDoc);

                response.Success = true;
                response.Message = "Cập nhật datasource menu động thành công!";
                logger.LogInformation("SaveDynamicMenuDataSource: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicMenuDataSource error");
            response.Success = false;
            response.MessageException = ex.Message;
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
            var ids = new List<string>();
            if (!string.IsNullOrWhiteSpace(request.Id)) ids.Add(request.Id);
            ids.AddRange(request.Ids);

            var filter = Builders<BsonDocument>.Filter.In("_id", ids);
            var result = await Global.CollectionBsonDynamicMenuDataSource!.DeleteManyAsync(filter);

            response.Success = result.DeletedCount > 0;
            response.Message = $"Đã xoá {result.DeletedCount} datasource menu động";
            logger.LogInformation("DeleteDynamicMenuDataSource: Deleted {Count}", result.DeletedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicMenuDataSource error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    // ================================================================
    // Sync DynamicMenuDataSources từ proto schema
    // ================================================================
    [Authorize]
    public override async Task<SyncDynamicMenuDataSourcesFromProtoResponse> SyncDynamicMenuDataSourcesFromProto(
        SyncDynamicMenuDataSourcesFromProtoRequest request, ServerCallContext context)
    {
        var response = new SyncDynamicMenuDataSourcesFromProtoResponse();
        try
        {
            var protoRegistryMap = BuildProtoRegistryMap();
            logger.LogInformation(
                "SyncFromProto: registry candidates={Count}, keys={Keys}",
                protoRegistryMap.Count,
                string.Join(", ", protoRegistryMap.Keys.OrderBy(k => k)));

            // Nếu source_key trống → sync tất cả entries đọc được từ proto build output
            var requestedKey = request.SourceKey?.Trim() ?? "";
            var toSync = string.IsNullOrWhiteSpace(requestedKey)
                ? protoRegistryMap
                : protoRegistryMap
                    .Where(kvp =>
                        kvp.Key.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        // match theo tên message proto (catalog → Catalog descriptor)
                        || kvp.Value.Descriptor.Name.Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                        || ToKebabCase(kvp.Value.Descriptor.Name).Equals(requestedKey, StringComparison.OrdinalIgnoreCase)
                    )
                    .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            if (toSync.Count == 0)
            {
                response.Success = false;
                response.Message = $"Không tìm thấy proto mapping cho source_key '{request.SourceKey}'. " +
                                   $"Các key hợp lệ: {string.Join(", ", protoRegistryMap.Keys)}";
                logger.LogWarning("SyncFromProto: no matched source. request={Req}, available={Keys}",
                    request.SourceKey,
                    string.Join(", ", protoRegistryMap.Keys.OrderBy(k => k)));
                return response;
            }

            var syncedItems = new List<DynamicMenuDataSource>();


            foreach (var (sourceKey, (sourceName, collectionName, descriptor)) in toSync)
            {
                var fields = GetFieldsFromProtoDescriptor(descriptor);
                var fieldKeysLog = string.Join(", ", fields.Select(field => field.Key).Where(key => !string.IsNullOrWhiteSpace(key)));

                logger.LogInformation(
                    "SyncFromProto Detail: sourceKey={SourceKey}, collectionName={CollectionName}, fields.Count={FieldsCount}, fieldKeys=[{FieldKeys}]",
                    sourceKey,
                    collectionName,
                    fields.Count,
                    fieldKeysLog);

                // Kiểm tra đã tồn tại chưa (theo sourceKey, chưa bị xoá)
                var existingFilter = Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("SourceKey", sourceKey),
                    Builders<BsonDocument>.Filter.Ne("Delete", true)
                );
                var existingBson = await Global.CollectionBsonDynamicMenuDataSource!
                    .Find(existingFilter).FirstOrDefaultAsync();

                DynamicMenuDataSource item;

                if (existingBson != null)
                {
                    // Cập nhật fields từ proto, giữ nguyên các thông tin khác
                    item = BsonSerializer.Deserialize<DynamicMenuDataSource>(existingBson);
                    item.Fields.Clear();
                    item.Fields.AddRange(fields);
                    item.ModifyDate = Timestamp.FromDateTime(DateTime.UtcNow);

                    var bsonDoc = item.ToBsonDocument();
                    bsonDoc["_id"] = item.Id;
                    bsonDoc["ModifyDate"] = FromTimestamp(item.ModifyDate);

                    var replaceFilter = Builders<BsonDocument>.Filter.Eq("_id", item.Id);
                    await Global.CollectionBsonDynamicMenuDataSource
                        .FindOneAndReplaceAsync(replaceFilter, bsonDoc);

                    logger.LogInformation("SyncFromProto: Updated source_key={Key} → {Count} fields", sourceKey, fields.Count);
                }
                else
                {
                    // Tạo mới
                    item = new DynamicMenuDataSource
                    {
                        Id = ObjectId.GenerateNewId().ToString(),
                        SourceKey = sourceKey,
                        SourceName = sourceName,
                        CollectionName = collectionName,
                        Enabled = true,
                        Delete = false,
                        CreateDate = Timestamp.FromDateTime(DateTime.UtcNow),
                    };
                    item.Fields.AddRange(fields);

                    var bsonDoc = item.ToBsonDocument();
                    bsonDoc["_id"] = item.Id;
                    bsonDoc["CreateDate"] = FromTimestamp(item.CreateDate);
                    bsonDoc["Delete"] = false;

                    await Global.CollectionBsonDynamicMenuDataSource!.InsertOneAsync(bsonDoc);
                    logger.LogInformation("SyncFromProto: Created source_key={Key} → {Count} fields", sourceKey, fields.Count);
                }

                syncedItems.Add(item);
            }

            response.Items.AddRange(syncedItems);
            response.Success = true;
            response.Message =
                $"Đồng bộ thành công {syncedItems.Count} datasource từ proto schema. " +
                $"Synced keys: {string.Join(", ", toSync.Keys.OrderBy(k => k))}";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SyncDynamicMenuDataSourcesFromProto error");
            response.Success = false;
            response.MessageException = ex.Message;
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
                response.Success = false;
                response.Message = "Vui lòng nhập tên collection.";
                return response;
            }

            // Resolve alias: "Catalog" → "CapBac" (tên thật trong MongoDB)
            var collectionName = ResolveActualCollectionName(rawCollectionName);
            if (!collectionName.Equals(rawCollectionName, StringComparison.OrdinalIgnoreCase))
                logger.LogInformation("DiscoverCollectionFields: alias resolved {From} → {To}", rawCollectionName, collectionName);

            var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
            if (collection == null)
            {
                response.Success = false;
                response.Message = "Không thể kết nối MongoDB.";
                return response;
            }

            // Đếm tổng docs (tối đa 1000 để không chậm)
            var total = (int)await collection.CountDocumentsAsync(
                Builders<BsonDocument>.Filter.Empty,
                new CountOptions { Limit = 1000 });

            var scanLimit = Math.Min(total, 50);

            var documents = await collection
                .Find(Builders<BsonDocument>.Filter.Empty)
                .Limit(scanLimit)
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
                    if (dataType == null) continue; // bỏ qua null/undefined

                    fields.Add(new DynamicMenuDataSourceField
                    {
                        Key = element.Name,
                        Label = element.Name,
                        DataType = dataType,
                    });
                }
            }

            response.CollectionName = collectionName;
            response.DocumentsScanned = scanLimit;
            response.Fields.AddRange(fields);
            response.Success = true;
            response.Message = fields.Count > 0
                ? $"Tìm thấy {fields.Count} fields từ {scanLimit}/{total} documents"
                : $"Collection '{collectionName}' rỗng hoặc không có fields";

            logger.LogInformation("DiscoverCollectionFields: {Col} → {Fields} fields / {Scanned} docs scanned",
                collectionName, fields.Count, scanLimit);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DiscoverCollectionFields error");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }



}
