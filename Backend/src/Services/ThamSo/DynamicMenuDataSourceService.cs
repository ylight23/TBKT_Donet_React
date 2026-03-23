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

public class DynamicMenuDataSourceService(
    ILogger<DynamicMenuDataSourceService> logger,
    ProtoSchemaDiscoveryService protoSchemaDiscoveryService)
{
    private const string PermissionCode = "thamso_dynamicmenu_datasource";

    public async Task<GetListDynamicMenuDataSourcesResponse> GetListDynamicMenuDataSourcesAsync(GetListDynamicMenuDataSourcesRequest request)
    {
        var response = new GetListDynamicMenuDataSourcesResponse();
        try
        {
            var filter = MongoDocumentHelpers.NotDeleted;
            var bsonItems = await Global.CollectionBsonDynamicMenuDataSource!.Find(filter).ToListAsync();
            if (bsonItems.Count == 0)
            {
                await protoSchemaDiscoveryService.SeedDefaultDynamicMenuDataSourcesAsync();
                bsonItems = await Global.CollectionBsonDynamicMenuDataSource.Find(filter).ToListAsync();
            }

            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                var ds = BsonSerializer.Deserialize<DynamicMenuDataSource>(itemBson);
                ds.Fields.Clear();
                var fieldsBson = itemBson.ArrayOr("Fields");
                if (fieldsBson != null)
                {
                    foreach (var fd in fieldsBson.Documents())
                        ds.Fields.Add(BsonSerializer.Deserialize<DynamicMenuDataSourceField>(fd));
                }

                return ds;
            }));

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} items");
            logger.LogInformation("GetListDynamicMenuDataSources: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListDynamicMenuDataSources error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai danh sach datasource", ex.Message);
        }

        return response;
    }

    public async Task<SaveDynamicMenuDataSourceResponse> SaveDynamicMenuDataSourceAsync(
        SaveDynamicMenuDataSourceRequest request,
        ServerCallContext? context)
    {
        var response = new SaveDynamicMenuDataSourceResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen them hoac cap nhat datasource");
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Meta = ThamSoResponseFactory.Fail("Du lieu khong hop le");
                return response;
            }

            item.SourceKey = string.IsNullOrWhiteSpace(item.SourceKey) ? "employee" : item.SourceKey.Trim().ToLowerInvariant();
            item.SourceName = string.IsNullOrWhiteSpace(item.SourceName) ? item.SourceKey : item.SourceName.Trim();
            item.CollectionName = string.IsNullOrWhiteSpace(item.CollectionName) ? item.SourceKey : item.CollectionName.Trim();

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

            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.Enabled = true;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);

                await Global.CollectionBsonDynamicMenuDataSource!.InsertOneAsync(bsonDoc);
                response.Meta = ThamSoResponseFactory.Ok("Them datasource menu dong thanh cong!");
                logger.LogInformation("SaveDynamicMenuDataSource: Created {Id}", item.Id);
            }
            else
            {
                var existingDoc = await Global.CollectionBsonDynamicMenuDataSource!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                        MongoDocumentHelpers.NotDeleted))
                    .FirstOrDefaultAsync();

                if (existingDoc == null)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay datasource dang hoat dong de cap nhat");
                    return response;
                }

                var existingSourceKey = existingDoc.StringOr("SourceKey");
                if (!string.Equals(existingSourceKey, item.SourceKey, StringComparison.Ordinal))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong duoc thay doi source_key cua datasource sau khi da tao");
                    return response;
                }

                item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.CreateDate = existingDoc.TimestampOr("CreateDate") ?? item.CreateDate;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingDoc, context, item.ModifyDate);

                var replaceResult = await Global.CollectionBsonDynamicMenuDataSource!
                    .ReplaceOneAsync(Builders<BsonDocument>.Filter.Eq("_id", item.Id), bsonDoc);

                if (replaceResult.MatchedCount == 0)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay datasource dang hoat dong de cap nhat");
                    return response;
                }

                response.Meta = ThamSoResponseFactory.Ok("Cap nhat datasource menu dong thanh cong!");
                logger.LogInformation("SaveDynamicMenuDataSource: Updated {Id}", item.Id);
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveDynamicMenuDataSource error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi luu datasource", ex.Message);
        }

        return response;
    }

    public async Task<DeleteBaseResponse> DeleteDynamicMenuDataSourceAsync(DeleteDynamicMenuDataSourceRequest request, ServerCallContext? context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            if (!ServiceMutationPolicy.CanDeleteThamSo(context, PermissionCode))
            {
                response.Success = false;
                response.Message = "Khong co quyen xoa datasource";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            var result = await Global.CollectionBsonDynamicMenuDataSource!.UpdateManyAsync(
                ServiceMutationPolicy.ActiveIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildSoftDeleteUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da xoa mem {result.ModifiedCount} datasource menu dong";
            logger.LogInformation("DeleteDynamicMenuDataSource: Soft deleted {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteDynamicMenuDataSource error");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
    }

    public async Task<StatusResponse> RestoreDynamicMenuDataSourceAsync(RestoreDynamicMenuDataSourceRequest request, ServerCallContext? context)
    {
        var response = new StatusResponse();
        try
        {
            if (!ServiceMutationPolicy.CanRestoreThamSo(context))
            {
                response.Success = false;
                response.Message = "Chi nguoi co quyen thamso_restore hoac superadmin moi duoc khoi phuc datasource";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co datasource nao de khoi phuc";
                return response;
            }

            var deletedDocs = await Global.CollectionBsonDynamicMenuDataSource!
                .Find(ServiceMutationPolicy.DeletedIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include("SourceKey"))
                .ToListAsync();

            if (deletedDocs.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong tim thay datasource da xoa de khoi phuc";
                return response;
            }

            var sourceKeys = deletedDocs
                .Select(doc => doc.StringOr("SourceKey"))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (sourceKeys.Count > 0)
            {
                var activeConflictDocs = await Global.CollectionBsonDynamicMenuDataSource!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.In("SourceKey", sourceKeys),
                        MongoDocumentHelpers.NotDeleted))
                    .Project(Builders<BsonDocument>.Projection.Include("_id").Include("SourceKey"))
                    .ToListAsync();

                var restoreIdSet = normalizedIds.ToHashSet(StringComparer.Ordinal);
                var conflictingKeys = activeConflictDocs
                    .Where(doc => !restoreIdSet.Contains(doc.IdString()))
                    .Select(doc => doc.StringOr("SourceKey"))
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (conflictingKeys.Count > 0)
                {
                    response.Success = false;
                    response.Message = $"Khong the khoi phuc datasource vi trung source_key dang hoat dong: {string.Join(", ", conflictingKeys.Take(10))}";
                    return response;
                }
            }

            var result = await Global.CollectionBsonDynamicMenuDataSource!.UpdateManyAsync(
                ServiceMutationPolicy.DeletedIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildRestoreUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da khoi phuc {result.ModifiedCount} datasource";
            logger.LogInformation("RestoreDynamicMenuDataSource: Restored {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RestoreDynamicMenuDataSource error");
            response.Success = false;
            response.Message = "Loi khi khoi phuc datasource";
            response.MessageException = ex.Message;
        }

        return response;
    }
}
