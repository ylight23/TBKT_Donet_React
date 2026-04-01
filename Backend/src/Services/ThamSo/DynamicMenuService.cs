using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public class DynamicMenuService(ILogger<DynamicMenuService> logger)
{
    private const string PermissionCode = "thamso_dynamicmenu";
    private static readonly HashSet<string> ReservedAuditKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "CreateDate",
        "ModifyDate",
    };
    private sealed record DataSourceFieldSchema(string Key, string DataType, bool Required);

    private static DynamicMenu ToDynamicMenu(BsonDocument itemBson)
    {
        var item = new DynamicMenu
        {
            Id = itemBson.IdString(),
            Title = itemBson.StringOr("Title", itemBson.StringOr("title")),
            Path = itemBson.StringOr("Path", itemBson.StringOr("path")),
            Active = itemBson.StringOr("Active", itemBson.StringOr("active")),
            GridCount = itemBson.IntOr("GridCount", itemBson.IntOr("gridCount", 1)),
            Enabled = itemBson.BoolOr("Enabled", itemBson.BoolOr("enabled", true)),
            Icon = itemBson.StringOr("Icon", itemBson.StringOr("icon")),
            ColumnCount = itemBson.IntOr("ColumnCount", itemBson.IntOr("columnCount", 4)),
            DataSource = itemBson.StringOr("DataSource", itemBson.StringOr("dataSource")),
            TemplateKey = itemBson.StringOr("TemplateKey", itemBson.StringOr("templateKey")),
            PermissionCode = itemBson.StringOr("PermissionCode", itemBson.StringOr("permissionCode")),
            CreateDate = itemBson.TimestampOr("CreateDate") ?? itemBson.TimestampOr("createDate"),
            ModifyDate = itemBson.TimestampOr("ModifyDate") ?? itemBson.TimestampOr("modifyDate"),
        };

        item.Columns.Clear();

        var columnsBson = itemBson.ArrayOr("Columns") ?? itemBson.ArrayOr("columns");
        if (columnsBson != null)
        {
            foreach (var doc in columnsBson.Documents())
            {
                item.Columns.Add(new ColumnConfig
                {
                    Key = doc.StringOr("Key", doc.StringOr("key")),
                    Name = doc.StringOr("Name", doc.StringOr("name")),
                });
            }
        }
        else
        {
            var keyArray = itemBson.ArrayOr("ColumnKeys") ?? itemBson.ArrayOr("columnKeys");
            if (keyArray != null)
            {
                var names = itemBson.ArrayOr("ColumnNames") ?? itemBson.ArrayOr("columnNames") ?? new BsonArray();
                for (var i = 0; i < keyArray.Count; i++)
                {
                    item.Columns.Add(new ColumnConfig
                    {
                        Key = keyArray[i].IsString ? keyArray[i].AsString : keyArray[i].ToString()!,
                        Name = i < names.Count && names[i].IsString ? names[i].AsString : $"Cot {i + 1}",
                    });
                }
            }
        }

        ApplyAuditMetadata(item, itemBson);
        return item;
    }
    
    private static void ApplyAuditMetadata(DynamicMenu item, BsonDocument itemBson)
    {
        item.CreateDate = itemBson.TimestampOr("CreateDate") ?? item.CreateDate;
        item.ModifyDate = itemBson.TimestampOr("ModifyDate") ?? item.ModifyDate;
        item.CreateBy = itemBson.StringOr("NguoiTao");
        item.ModifyBy = itemBson.StringOr("NguoiSua");
        item.Version = itemBson.IntOr("Version", item.Version > 0 ? item.Version : 1);
    }
    private const string DynamicMenuPermissionGroup = "Menu động";

    public async Task<GetListDynamicMenusResponse> GetListDynamicMenusAsync(
        GetListDynamicMenusRequest request,
        ServerCallContext? context)
    {
        var response = new GetListDynamicMenusResponse();
        try
        {
            var bsonItems = await Global.CollectionBsonDynamicMenu!.Find(MongoDocumentHelpers.NotDeleted).ToListAsync();
            response.Items.AddRange(bsonItems
                .Select(ToDynamicMenu)
                .Where(menu => CanReadDynamicMenu(context, menu.PermissionCode)));

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} items");
            logger.LogInformation("GetListDynamicMenus: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicMenus error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai danh sach menu dong", ex.Message);
        }

        return response;
    }

    public async Task<GetDynamicMenuRowsResponse> GetDynamicMenuRowsAsync(
        GetDynamicMenuRowsRequest request,
        ServerCallContext? context)
    {
        var response = new GetDynamicMenuRowsResponse();
        try
        {
            var sourceKey = (request.SourceKey ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(sourceKey))
            {
                response.Meta = ThamSoResponseFactory.Fail("source_key la bat buoc");
                return response;
            }

            var dsFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("SourceKey", sourceKey),
                MongoDocumentHelpers.NotDeleted);

            var dsBson = await Global.CollectionBsonDynamicMenuDataSource!
                .Find(dsFilter)
                .Project(Builders<BsonDocument>.Projection
                    .Include("CollectionName")
                    .Include("Enabled")
                    .Include("Fields"))
                .FirstOrDefaultAsync();

            if (dsBson == null)
            {
                response.Meta = ThamSoResponseFactory.Fail($"Khong tim thay datasource voi source_key '{sourceKey}'");
                return response;
            }

            if (!dsBson.BoolOr("Enabled"))
            {
                response.Meta = ThamSoResponseFactory.Fail($"Datasource '{sourceKey}' dang tat");
                return response;
            }

            var dsCollectionName = dsBson.StringOr("CollectionName");
            var collectionName = string.IsNullOrWhiteSpace(dsCollectionName) ? sourceKey : dsCollectionName.Trim();
            var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
            if (collection == null)
            {
                response.Meta = ThamSoResponseFactory.Fail($"Khong the truy cap collection '{collectionName}'");
                return response;
            }

            var safeLimit = request.Limit <= 0 ? 500 : Math.Clamp(request.Limit, 1, 2000);
            var softDeleteFieldKey = ResolveSoftDeleteFieldKey(dsBson);

            var menuBson = await Global.CollectionBsonDynamicMenu!
                .Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("DataSource", sourceKey),
                    MongoDocumentHelpers.NotDeleted))
                .Project(Builders<BsonDocument>.Projection
                    .Include("Columns")
                    .Include("ColumnKeys")
                    .Include("PermissionCode"))
                .FirstOrDefaultAsync();

            if (menuBson != null && !CanReadDynamicMenu(context, menuBson.StringOr("PermissionCode")))
            {
                response.Meta = ThamSoResponseFactory.Fail($"Khong co quyen xem du lieu cua menu dong '{sourceKey}'");
                return response;
            }

            var columnKeys = ExtractColumnKeys(menuBson);
            var projection = columnKeys.Count > 0 ? BuildProjection(columnKeys) : null;

            var readFilter = Builders<BsonDocument>.Filter.Empty;
            if (!string.IsNullOrWhiteSpace(softDeleteFieldKey))
            {
                readFilter = Builders<BsonDocument>.Filter.Or(
                    Builders<BsonDocument>.Filter.Exists(softDeleteFieldKey, false),
                    Builders<BsonDocument>.Filter.Eq(softDeleteFieldKey, BsonNull.Value),
                    Builders<BsonDocument>.Filter.Eq(softDeleteFieldKey, false),
                    Builders<BsonDocument>.Filter.Eq(softDeleteFieldKey, 0),
                    Builders<BsonDocument>.Filter.Eq(softDeleteFieldKey, "false"),
                    Builders<BsonDocument>.Filter.Eq(softDeleteFieldKey, "no"));
            }

            var findFluent = collection
                .Find(readFilter)
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
                response.Rows.Add(Struct.Parser.ParseJson(json));
            }

            response.Meta = ThamSoResponseFactory.Ok($"Lay {response.Rows.Count} ban ghi tu '{collectionName}'");
            logger.LogInformation(
                "GetDynamicMenuRows: source_key={SourceKey}, collection={Collection}, count={Count}",
                sourceKey, collectionName, response.Rows.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetDynamicMenuRows error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai du lieu menu dong", ex.Message);
        }

        return response;
    }

    public async Task<SaveDynamicMenuRowResponse> SaveDynamicMenuRowAsync(
        SaveDynamicMenuRowRequest request,
        ServerCallContext? context)
    {
        var response = new SaveDynamicMenuRowResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen them du lieu menu dong");
                return response;
            }

            var sourceKey = (request.SourceKey ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(sourceKey))
            {
                response.Meta = ThamSoResponseFactory.Fail("source_key la bat buoc");
                return response;
            }

            var dsFilter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("SourceKey", sourceKey),
                MongoDocumentHelpers.NotDeleted);

            var dsBson = await Global.CollectionBsonDynamicMenuDataSource!
                .Find(dsFilter)
                .Project(Builders<BsonDocument>.Projection
                    .Include("CollectionName")
                    .Include("Enabled")
                    .Include("Fields"))
                .FirstOrDefaultAsync();

            if (dsBson == null)
            {
                response.Meta = ThamSoResponseFactory.Fail($"Khong tim thay datasource voi source_key '{sourceKey}'");
                return response;
            }

            if (!dsBson.BoolOr("Enabled"))
            {
                response.Meta = ThamSoResponseFactory.Fail($"Datasource '{sourceKey}' dang tat");
                return response;
            }

            var dsCollectionName = dsBson.StringOr("CollectionName");
            var collectionName = string.IsNullOrWhiteSpace(dsCollectionName) ? sourceKey : dsCollectionName.Trim();
            var collection = Global.MongoDB?.GetCollection<BsonDocument>(collectionName);
            if (collection == null)
            {
                response.Meta = ThamSoResponseFactory.Fail($"Khong the truy cap collection '{collectionName}'");
                return response;
            }

            var sourceFields = ParseDataSourceFieldSchemas(dsBson);
            if (sourceFields.Count == 0)
            {
                response.Meta = ThamSoResponseFactory.Fail(
                    $"Datasource '{sourceKey}' chua co schema Fields. Khong the validate strict.");
                return response;
            }

            var allowedKeys = sourceFields
                .Select(f => f.Key)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var incomingDoc = StructToBsonDocument(request.Row);
            var operation = incomingDoc.StringOr("__op", incomingDoc.StringOr("op")).Trim().ToLowerInvariant();
            if (operation == "delete")
            {
                var deleteId = ExtractRecordId(incomingDoc);
                if (string.IsNullOrWhiteSpace(deleteId))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong the xoa ban ghi: thieu id/_id");
                    return response;
                }

                var deleteResult = await collection.DeleteOneAsync(Builders<BsonDocument>.Filter.Eq("_id", deleteId));
                if (deleteResult.DeletedCount == 0)
                {
                    response.Meta = ThamSoResponseFactory.Fail($"Khong tim thay ban ghi id '{deleteId}' de xoa");
                    return response;
                }

                var deletedRow = new BsonDocument
                {
                    { "id", deleteId },
                    { "_id", deleteId },
                    { "deleted", true },
                };
                response.Id = deleteId;
                response.Row = BsonDocumentToStruct(deletedRow);
                response.Meta = ThamSoResponseFactory.Ok($"Da xoa ban ghi '{deleteId}'");
                logger.LogInformation(
                    "SaveDynamicMenuRow(Delete): source_key={SourceKey}, collection={Collection}, id={Id}",
                    sourceKey, collectionName, deleteId);
                return response;
            }

            var sanitized = new BsonDocument();
            var validationErrors = new List<string>();

            var unknownFields = incomingDoc.Elements
                .Select(x => (x.Name ?? string.Empty).Trim())
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Where(key =>
                    !string.Equals(key, "_id", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(key, "id", StringComparison.OrdinalIgnoreCase) &&
                    !ReservedAuditKeys.Contains(key) &&
                    !allowedKeys.Contains(key))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (unknownFields.Count > 0)
            {
                validationErrors.Add($"Field khong thuoc schema datasource: {string.Join(", ", unknownFields)}");
            }

            foreach (var element in incomingDoc.Elements)
            {
                var key = (element.Name ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(key))
                    continue;

                if (string.Equals(key, "_id", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "id", StringComparison.OrdinalIgnoreCase) ||
                    allowedKeys.Count == 0 ||
                    allowedKeys.Contains(key))
                {
                    sanitized[key] = element.Value;
                }
            }

            foreach (var field in sourceFields.Where(f =>
                         f.Required &&
                         !string.Equals(f.Key, "id", StringComparison.OrdinalIgnoreCase) &&
                         !string.Equals(f.Key, "_id", StringComparison.OrdinalIgnoreCase)))
            {
                if (!sanitized.TryGetValue(field.Key, out var value) || IsMissingValue(value))
                {
                    validationErrors.Add($"Field '{field.Key}' la bat buoc");
                }
            }

            foreach (var field in sourceFields)
            {
                if (!sanitized.TryGetValue(field.Key, out var rawValue))
                    continue;

                if (!TryConvertByDataType(rawValue, field.DataType, out var converted, out var error))
                {
                    validationErrors.Add($"Field '{field.Key}' sai kieu '{field.DataType}': {error}");
                    continue;
                }

                sanitized[field.Key] = converted;
            }

            if (validationErrors.Count > 0)
            {
                response.Meta = ThamSoResponseFactory.Fail(
                    "Du lieu khong hop le theo schema datasource",
                    string.Join(" | ", validationErrors));
                return response;
            }

            var recordId = ExtractRecordId(sanitized);
            if (string.IsNullOrWhiteSpace(recordId))
                recordId = Guid.NewGuid().ToString();

            sanitized["_id"] = recordId;
            if (!sanitized.Contains("id"))
                sanitized["id"] = recordId;

            var now = DateTime.UtcNow;
            if (!sanitized.Contains("CreateDate")) sanitized["CreateDate"] = now;
            sanitized["ModifyDate"] = now;

            if (request.UpsertById)
            {
                await collection.ReplaceOneAsync(
                    Builders<BsonDocument>.Filter.Eq("_id", recordId),
                    sanitized,
                    new ReplaceOptions { IsUpsert = true });
            }
            else
            {
                await collection.InsertOneAsync(sanitized);
            }

            response.Id = recordId;
            response.Row = BsonDocumentToStruct(sanitized);
            response.Meta = ThamSoResponseFactory.Ok($"Da luu du lieu vao '{collectionName}'");
            logger.LogInformation(
                "SaveDynamicMenuRow: source_key={SourceKey}, collection={Collection}, id={Id}",
                sourceKey, collectionName, recordId);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Code == 11000)
        {
            response.Meta = ThamSoResponseFactory.Fail("Trung ma ban ghi (id) khi luu du lieu", ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicMenuRow error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi luu du lieu menu dong", ex.Message);
        }

        return response;
    }

    public async Task<SaveDynamicMenuResponse> SaveDynamicMenuAsync(SaveDynamicMenuRequest request, ServerCallContext? context)
    {
        var response = new SaveDynamicMenuResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen them hoac cap nhat menu dong");
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Meta = ThamSoResponseFactory.Fail("Du lieu khong hop le");
                return response;
            }

            item.GridCount = Math.Clamp(item.GridCount, 1, 6);
            item.ColumnCount = Math.Clamp(item.ColumnCount <= 0 ? 4 : item.ColumnCount, 1, 12);
            item.DataSource = string.IsNullOrWhiteSpace(item.DataSource) ? "employee" : item.DataSource.Trim().ToLowerInvariant();
            item.PermissionCode = NormalizePermissionCode(item.PermissionCode, item.Id);

            var activeDataSource = await Global.CollectionBsonDynamicMenuDataSource!
                .Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("SourceKey", item.DataSource),
                    MongoDocumentHelpers.NotDeleted,
                    Builders<BsonDocument>.Filter.Eq("Enabled", true)))
                .Project(Builders<BsonDocument>.Projection.Include("_id"))
                .FirstOrDefaultAsync();

            if (activeDataSource == null)
            {
                response.Meta = ThamSoResponseFactory.Fail($"Datasource '{item.DataSource}' khong ton tai hoac dang tat");
                return response;
            }

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

            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = Guid.NewGuid().ToString();
                item.PermissionCode = NormalizePermissionCode(item.PermissionCode, item.Id);
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);
                ApplyAuditMetadata(item, bsonDoc);

                await Global.CollectionBsonDynamicMenu!.InsertOneAsync(bsonDoc);
                await UpsertDynamicMenuPermissionCatalogAsync(item.PermissionCode, item.Title, true);
                response.Meta = ThamSoResponseFactory.Ok("Them menu dong thanh cong!");
                logger.LogInformation("SaveDynamicMenu: Created {Id}", item.Id);
            }
            else
            {
                var existingDoc = await Global.CollectionBsonDynamicMenu!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                        MongoDocumentHelpers.NotDeleted))
                    .FirstOrDefaultAsync();

                if (existingDoc == null)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay menu dong dang hoat dong de cap nhat");
                    return response;
                }

                var existingDataSource = existingDoc.StringOr("DataSource");
                if (!string.Equals(existingDataSource, item.DataSource, StringComparison.Ordinal))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong duoc thay doi datasource cua menu dong sau khi da tao");
                    return response;
                }

                var existingPermissionCode = NormalizePermissionCode(existingDoc.StringOr("PermissionCode"), item.Id);
                if (!string.IsNullOrWhiteSpace(existingDoc.StringOr("PermissionCode")) &&
                    !string.Equals(existingPermissionCode, item.PermissionCode, StringComparison.Ordinal))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong duoc thay doi ma quyen cua menu dong sau khi da tao");
                    return response;
                }

                item.PermissionCode = existingPermissionCode;

                item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.CreateDate = existingDoc.TimestampOr("CreateDate") ?? item.CreateDate;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingDoc, context, item.ModifyDate);
                ApplyAuditMetadata(item, bsonDoc);

                var replaceResult = await Global.CollectionBsonDynamicMenu!
                    .ReplaceOneAsync(Builders<BsonDocument>.Filter.Eq("_id", item.Id), bsonDoc);

                if (replaceResult.MatchedCount == 0)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay menu dong dang hoat dong de cap nhat");
                    return response;
                }

                await UpsertDynamicMenuPermissionCatalogAsync(item.PermissionCode, item.Title, true);
                response.Meta = ThamSoResponseFactory.Ok("Cap nhat menu dong thanh cong!");
                logger.LogInformation("SaveDynamicMenu: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicMenu error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi luu menu dong", ex.Message);
        }

        return response;
    }

    public async Task<DeleteBaseResponse> DeleteDynamicMenuAsync(DeleteDynamicMenuRequest request, ServerCallContext? context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            if (!ServiceMutationPolicy.CanDeleteThamSo(context, PermissionCode))
            {
                response.Success = false;
                response.Message = "Khong co quyen xoa menu dong";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            var permissionCodes = await Global.CollectionBsonDynamicMenu!
                .Find(ServiceMutationPolicy.ActiveIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("PermissionCode"))
                .ToListAsync();
            var result = await Global.CollectionBsonDynamicMenu!.UpdateManyAsync(
                ServiceMutationPolicy.ActiveIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildSoftDeleteUpdate(context));

            await SetPermissionCatalogActiveAsync(
                permissionCodes
                    .Select(doc => NormalizePermissionCode(doc.StringOr("PermissionCode"), doc.IdString()))
                    .Where(code => !string.IsNullOrWhiteSpace(code))
                    .Distinct(StringComparer.Ordinal)
                    .ToList(),
                false);

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da xoa mem {result.ModifiedCount} menu dong";
            logger.LogInformation("DeleteDynamicMenu: Soft deleted {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicMenu error");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
    }

    public async Task<StatusResponse> RestoreDynamicMenuAsync(RestoreDynamicMenuRequest request, ServerCallContext? context)
    {
        var response = new StatusResponse();
        try
        {
            if (!ServiceMutationPolicy.CanRestoreThamSo(context))
            {
                response.Success = false;
                response.Message = "Chi nguoi co quyen thamso_restore hoac superadmin moi duoc khoi phuc menu dong";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co menu dong nao de khoi phuc";
                return response;
            }

            var deletedMenuDocs = await Global.CollectionBsonDynamicMenu!
                .Find(ServiceMutationPolicy.DeletedIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Title").Include("DataSource").Include("PermissionCode"))
                .ToListAsync();

            if (deletedMenuDocs.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong tim thay menu dong da xoa de khoi phuc";
                return response;
            }

            var dataSources = deletedMenuDocs
                .Select(doc => doc.StringOr("DataSource"))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (dataSources.Count > 0)
            {
                var activeSourceDocs = await Global.CollectionBsonDynamicMenuDataSource!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.In("SourceKey", dataSources),
                        MongoDocumentHelpers.NotDeleted))
                    .Project(Builders<BsonDocument>.Projection.Include("SourceKey"))
                    .ToListAsync();

                var activeSourceSet = activeSourceDocs
                    .Select(doc => doc.StringOr("SourceKey"))
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .ToHashSet(StringComparer.Ordinal);

                var invalidMenus = deletedMenuDocs
                    .Where(doc =>
                    {
                        var sourceKey = doc.StringOr("DataSource");
                        return !string.IsNullOrWhiteSpace(sourceKey) && !activeSourceSet.Contains(sourceKey);
                    })
                    .Select(doc => doc.StringOr("Title", doc.IdString()))
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (invalidMenus.Count > 0)
                {
                    response.Success = false;
                    response.Message = $"Khong the khoi phuc menu dong vi datasource khong hop le: {string.Join(", ", invalidMenus.Take(10))}";
                    return response;
                }
            }

            var result = await Global.CollectionBsonDynamicMenu!.UpdateManyAsync(
                ServiceMutationPolicy.DeletedIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildRestoreUpdate(context));

            await SetPermissionCatalogActiveAsync(
                deletedMenuDocs
                    .Select(doc => NormalizePermissionCode(doc.StringOr("PermissionCode"), doc.IdString()))
                    .Where(code => !string.IsNullOrWhiteSpace(code))
                    .Distinct(StringComparer.Ordinal)
                    .ToList(),
                true);

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da khoi phuc {result.ModifiedCount} menu dong";
            logger.LogInformation("RestoreDynamicMenu: Restored {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RestoreDynamicMenu error");
            response.Success = false;
            response.Message = "Loi khi khoi phuc menu dong";
            response.MessageException = ex.Message;
        }

        return response;
    }

    private static List<string> ExtractColumnKeys(BsonDocument? menuBson)
    {
        if (menuBson == null) return [];

        var columnsBson = menuBson.ArrayOr("Columns");
        if (columnsBson != null)
        {
            return columnsBson.Documents()
                .Select(c => c.StringOr("Key"))
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .ToList();
        }

        var columnKeysBson = menuBson.ArrayOr("ColumnKeys");
        if (columnKeysBson != null)
        {
            return columnKeysBson.Strings()
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

    private static string? ExtractRecordId(BsonDocument doc)
    {
        if (doc.TryGetValue("id", out var idVal) && !idVal.IsBsonNull)
        {
            var text = idVal.ToString();
            if (!string.IsNullOrWhiteSpace(text)) return text.Trim();
        }

        if (doc.TryGetValue("_id", out var bsonId) && !bsonId.IsBsonNull)
        {
            var text = bsonId.ToString();
            if (!string.IsNullOrWhiteSpace(text)) return text.Trim();
        }

        return null;
    }

    private static BsonDocument StructToBsonDocument(Struct? input)
    {
        var doc = new BsonDocument();
        if (input == null) return doc;

        foreach (var (key, value) in input.Fields)
        {
            if (string.IsNullOrWhiteSpace(key))
                continue;

            doc[key] = ValueToBsonValue(value);
        }

        return doc;
    }

    private static BsonValue ValueToBsonValue(Value value) =>
        value.KindCase switch
        {
            Value.KindOneofCase.NullValue => BsonNull.Value,
            Value.KindOneofCase.NumberValue => BsonValue.Create(value.NumberValue),
            Value.KindOneofCase.StringValue => BsonValue.Create(value.StringValue),
            Value.KindOneofCase.BoolValue => BsonValue.Create(value.BoolValue),
            Value.KindOneofCase.StructValue => StructToBsonDocument(value.StructValue),
            Value.KindOneofCase.ListValue => new BsonArray(value.ListValue.Values.Select(ValueToBsonValue)),
            _ => BsonNull.Value,
        };

    private static Struct BsonDocumentToStruct(BsonDocument doc)
    {
        var json = doc.ToJson(new JsonWriterSettings { OutputMode = JsonOutputMode.RelaxedExtendedJson });
        return Struct.Parser.ParseJson(json);
    }

    private static List<DataSourceFieldSchema> ParseDataSourceFieldSchemas(BsonDocument dsBson)
    {
        var result = new List<DataSourceFieldSchema>();
        var fields = dsBson.ArrayOr("Fields") ?? new BsonArray();
        foreach (var doc in fields.Documents())
        {
            var key = doc.StringOr("Key", doc.StringOr("key"));
            if (string.IsNullOrWhiteSpace(key))
                continue;

            var dataType = NormalizeDataType(doc.StringOr("DataType", doc.StringOr("data_type")));
            var required = doc.BoolOr("Required", doc.BoolOr("required"));
            result.Add(new DataSourceFieldSchema(key.Trim(), dataType, required));
        }

        return result
            .GroupBy(f => f.Key, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();
    }

    private static string ResolveSoftDeleteFieldKey(BsonDocument dsBson)
    {
        var fields = dsBson.ArrayOr("Fields") ?? new BsonArray();
        foreach (var doc in fields.Documents())
        {
            var key = doc.StringOr("Key", doc.StringOr("key")).Trim();
            if (string.IsNullOrWhiteSpace(key))
                continue;

            if (key.Equals("delete", StringComparison.OrdinalIgnoreCase) ||
                key.Equals("deleted", StringComparison.OrdinalIgnoreCase) ||
                key.Equals("isDeleted", StringComparison.OrdinalIgnoreCase))
            {
                return key;
            }
        }

        return string.Empty;
    }

    private static string NormalizeDataType(string? raw)
    {
        var value = (raw ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(value))
            return "string";

        return value switch
        {
            "text" => "string",
            "int32" => "int",
            "int64" => "long",
            "float" => "double",
            "datetime" => "date",
            "timestamp" => "date",
            "boolean" => "bool",
            "object" => "document",
            _ => value,
        };
    }

    private static bool IsMissingValue(BsonValue value)
    {
        if (value == null || value.IsBsonNull)
            return true;

        return value.IsString && string.IsNullOrWhiteSpace(value.AsString);
    }

    private static bool TryConvertByDataType(
        BsonValue input,
        string dataType,
        out BsonValue output,
        out string error)
    {
        output = input;
        error = string.Empty;
        var normalized = NormalizeDataType(dataType);

        if (input == null || input.IsBsonNull)
            return true;

        try
        {
            switch (normalized)
            {
                case "string":
                    output = input.IsString ? input : input.ToString();
                    return true;
                case "int":
                    if (TryReadLong(input, out var intVal))
                    {
                        output = (int)intVal;
                        return true;
                    }
                    error = "khong chuyen duoc sang int";
                    return false;
                case "long":
                    if (TryReadLong(input, out var longVal))
                    {
                        output = longVal;
                        return true;
                    }
                    error = "khong chuyen duoc sang long";
                    return false;
                case "double":
                case "number":
                case "decimal":
                    if (TryReadDouble(input, out var dblVal))
                    {
                        output = dblVal;
                        return true;
                    }
                    error = "khong chuyen duoc sang number";
                    return false;
                case "bool":
                    if (TryReadBool(input, out var boolVal))
                    {
                        output = boolVal;
                        return true;
                    }
                    error = "khong chuyen duoc sang bool";
                    return false;
                case "date":
                    if (TryReadDateTime(input, out var dateVal))
                    {
                        output = dateVal;
                        return true;
                    }
                    error = "khong chuyen duoc sang date";
                    return false;
                case "objectid":
                    if (TryReadObjectId(input, out var objectId))
                    {
                        output = objectId;
                        return true;
                    }
                    error = "khong chuyen duoc sang objectId (24 ky tu hex)";
                    return false;
                case "array":
                    if (input.IsBsonArray)
                    {
                        output = input;
                        return true;
                    }
                    error = "khong phai array";
                    return false;
                case "document":
                    if (input.IsBsonDocument)
                    {
                        output = input;
                        return true;
                    }
                    error = "khong phai object/document";
                    return false;
                default:
                    return true;
            }
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return false;
        }
    }

    private static bool TryReadLong(BsonValue value, out long result)
    {
        result = default;
        if (value.IsInt32) { result = value.AsInt32; return true; }
        if (value.IsInt64) { result = value.AsInt64; return true; }
        if (value.IsDouble) { result = Convert.ToInt64(value.AsDouble); return true; }
        if (value.IsDecimal128) { result = Convert.ToInt64(Decimal128.ToDecimal(value.AsDecimal128)); return true; }
        if (value.IsBoolean) { result = value.AsBoolean ? 1 : 0; return true; }
        return value.IsString && long.TryParse(value.AsString, out result);
    }

    private static bool TryReadDouble(BsonValue value, out double result)
    {
        result = default;
        if (value.IsDouble) { result = value.AsDouble; return true; }
        if (value.IsInt32) { result = value.AsInt32; return true; }
        if (value.IsInt64) { result = value.AsInt64; return true; }
        if (value.IsDecimal128) { result = Convert.ToDouble(Decimal128.ToDecimal(value.AsDecimal128)); return true; }
        return value.IsString && double.TryParse(value.AsString, out result);
    }

    private static bool TryReadBool(BsonValue value, out bool result)
    {
        result = default;
        if (value.IsBoolean) { result = value.AsBoolean; return true; }
        if (value.IsInt32) { result = value.AsInt32 != 0; return true; }
        if (value.IsInt64) { result = value.AsInt64 != 0; return true; }
        if (value.IsString)
        {
            var text = value.AsString.Trim().ToLowerInvariant();
            if (text is "true" or "1" or "yes" or "y") { result = true; return true; }
            if (text is "false" or "0" or "no" or "n") { result = false; return true; }
        }
        return false;
    }

    private static bool TryReadDateTime(BsonValue value, out DateTime result)
    {
        result = default;
        if (value.IsValidDateTime) { result = value.ToUniversalTime(); return true; }
        if (value.IsInt64)
        {
            var unix = value.AsInt64;
            result = unix > 10_000_000_000
                ? DateTimeOffset.FromUnixTimeMilliseconds(unix).UtcDateTime
                : DateTimeOffset.FromUnixTimeSeconds(unix).UtcDateTime;
            return true;
        }
        if (value.IsInt32)
        {
            result = DateTimeOffset.FromUnixTimeSeconds(value.AsInt32).UtcDateTime;
            return true;
        }
        if (value.IsString && DateTime.TryParse(value.AsString, out var parsed))
        {
            result = parsed.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(parsed, DateTimeKind.Utc)
                : parsed.ToUniversalTime();
            return true;
        }
        return false;
    }

    private static bool TryReadObjectId(BsonValue value, out ObjectId result)
    {
        result = default;
        if (value.IsObjectId)
        {
            result = value.AsObjectId;
            return true;
        }

        return value.IsString && ObjectId.TryParse(value.AsString, out result);
    }

    private static string NormalizePermissionCode(string? rawValue, string fallbackId)
    {
        var normalized = (rawValue ?? string.Empty)
            .Trim()
            .ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalized))
            return $"dynamicmenu_{fallbackId}";

        var buffer = normalized
            .Select(ch => char.IsLetterOrDigit(ch) || ch is '.' or '_' or '-' ? ch : '_')
            .ToArray();

        return new string(buffer).Trim('_');
    }

    private static bool CanReadDynamicMenu(ServerCallContext? context, string? permissionCode)
    {
        if (context == null) return false;

        if (context.CanView(PermissionCode))
            return true;

        var normalizedPermissionCode = (permissionCode ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedPermissionCode))
            return false;

        return context.CanView(normalizedPermissionCode);
    }

    private static async Task UpsertDynamicMenuPermissionCatalogAsync(string permissionCode, string title, bool active)
    {
        if (Global.CollectionPermissionCatalog == null || string.IsNullOrWhiteSpace(permissionCode))
            return;

        await Global.CollectionPermissionCatalog.UpdateOneAsync(
            Builders<BsonDocument>.Filter.Eq("Code", permissionCode),
            Builders<BsonDocument>.Update
                .Set("Code", permissionCode)
                .Set("Name", $"Truy cập menu: {title}")
                .Set("Group", DynamicMenuPermissionGroup)
                .Set("Icon", "🧭")
                .Set("GroupOrder", 70)
                .Set("Order", 1000)
                .Set("Active", active),
            new UpdateOptions { IsUpsert = true });
    }

    private static async Task SetPermissionCatalogActiveAsync(List<string> permissionCodes, bool active)
    {
        if (Global.CollectionPermissionCatalog == null || permissionCodes.Count == 0)
            return;

        await Global.CollectionPermissionCatalog.UpdateManyAsync(
            Builders<BsonDocument>.Filter.In("Code", permissionCodes),
            Builders<BsonDocument>.Update.Set("Active", active));
    }
}
