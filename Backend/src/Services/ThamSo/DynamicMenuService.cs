using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public class DynamicMenuService(ILogger<DynamicMenuService> logger)
{
    private const string PermissionCode = "thamso_dynamicmenu";
    private const string DynamicMenuPermissionGroup = "Menu động";

    public async Task<GetListDynamicMenusResponse> GetListDynamicMenusAsync(GetListDynamicMenusRequest request)
    {
        var response = new GetListDynamicMenusResponse();
        try
        {
            var bsonItems = await Global.CollectionBsonDynamicMenu!.Find(MongoDocumentHelpers.NotDeleted).ToListAsync();
            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var menu = BsonSerializer.Deserialize<DynamicMenu>(itemBson);
                menu.Columns.Clear();

                var columnsBson = itemBson.ArrayOr("Columns");
                if (columnsBson != null)
                {
                    foreach (var doc in columnsBson.Documents())
                    {
                        menu.Columns.Add(new ColumnConfig
                        {
                            Key = doc.StringOr("Key"),
                            Name = doc.StringOr("Name"),
                        });
                    }
                }
                else if (itemBson.ArrayOr("ColumnKeys") is { } keys)
                {
                    var names = itemBson.ArrayOr("ColumnNames") ?? new BsonArray();
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

    public async Task<GetDynamicMenuRowsResponse> GetDynamicMenuRowsAsync(GetDynamicMenuRowsRequest request)
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
                .Project(Builders<BsonDocument>.Projection.Include("CollectionName").Include("Enabled"))
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

            var menuBson = await Global.CollectionBsonDynamicMenu!
                .Find(Builders<BsonDocument>.Filter.And(
                    Builders<BsonDocument>.Filter.Eq("DataSource", sourceKey),
                    MongoDocumentHelpers.NotDeleted))
                .Project(Builders<BsonDocument>.Projection.Include("Columns").Include("ColumnKeys"))
                .FirstOrDefaultAsync();

            var columnKeys = ExtractColumnKeys(menuBson);
            var projection = columnKeys.Count > 0 ? BuildProjection(columnKeys) : null;

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
                item.Id = ObjectId.GenerateNewId().ToString();
                item.PermissionCode = NormalizePermissionCode(item.PermissionCode, item.Id);
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);

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
