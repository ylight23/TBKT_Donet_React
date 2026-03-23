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

public class TemplateLayoutService(ILogger<TemplateLayoutService> logger)
{
    private const string PermissionCode = "thamso_templatelayout";

    private static void ApplyAuditMetadata(TemplateLayout item, BsonDocument itemBson)
    {
        item.CreateDate = itemBson.TimestampOr("CreateDate") ?? item.CreateDate;
        item.ModifyDate = itemBson.TimestampOr("ModifyDate") ?? item.ModifyDate;
        item.CreateBy = itemBson.StringOr("NguoiTao");
        item.ModifyBy = itemBson.StringOr("NguoiSua");
        item.Version = itemBson.IntOr("Version", item.Version > 0 ? item.Version : 1);
    }

    public async Task<GetListTemplateLayoutsResponse> GetListTemplateLayoutsAsync(GetListTemplateLayoutsRequest request)
    {
        var response = new GetListTemplateLayoutsResponse();
        try
        {
            var items = await Global.CollectionBsonTemplateLayout!
                .Find(MongoDocumentHelpers.NotDeleted)
                .ToListAsync();

            response.Items.AddRange(items.Select(itemBson =>
            {
                var layout = BsonSerializer.Deserialize<TemplateLayout>(itemBson);
                ApplyAuditMetadata(layout, itemBson);
                return layout;
            }));

            response.Meta = ThamSoResponseFactory.Ok($"{response.Items.Count} items");
            logger.LogInformation("GetListTemplateLayouts: {Count} items", response.Items.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetListTemplateLayouts error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi tai danh sach template", ex.Message);
        }

        return response;
    }

    public async Task<SaveTemplateLayoutResponse> SaveTemplateLayoutAsync(SaveTemplateLayoutRequest request, ServerCallContext? context)
    {
        var response = new SaveTemplateLayoutResponse();
        try
        {
            if (!ServiceMutationPolicy.CanWriteThamSo(context, PermissionCode))
            {
                response.Meta = ThamSoResponseFactory.Fail("Khong co quyen them hoac cap nhat template layout");
                return response;
            }

            var item = request.Item;
            if (item == null)
            {
                response.Meta = ThamSoResponseFactory.Fail("Du lieu khong hop le");
                return response;
            }

            item.Key = string.IsNullOrWhiteSpace(item.Key)
                ? (item.Name ?? string.Empty).Trim().ToLowerInvariant().Replace(" ", "-")
                : item.Key.Trim().ToLowerInvariant();
            item.Name = string.IsNullOrWhiteSpace(item.Name) ? item.Key : item.Name.Trim();
            item.SchemaJson = string.IsNullOrWhiteSpace(item.SchemaJson) ? "{}" : item.SchemaJson;

            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = ObjectId.GenerateNewId().ToString();
                item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyCreateAudit(bsonDoc, context, item.CreateDate);
                ApplyAuditMetadata(item, bsonDoc);

                await Global.CollectionBsonTemplateLayout!.InsertOneAsync(bsonDoc);
                response.Meta = ThamSoResponseFactory.Ok("Them template layout thanh cong");
            }
            else
            {
                var existingDoc = await Global.CollectionBsonTemplateLayout!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.Eq("_id", item.Id),
                        MongoDocumentHelpers.NotDeleted))
                    .FirstOrDefaultAsync();

                if (existingDoc == null)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay template layout dang hoat dong de cap nhat");
                    return response;
                }

                var existingKey = existingDoc.StringOr("Key");
                if (!string.Equals(existingKey, item.Key, StringComparison.Ordinal))
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong duoc thay doi key cua template layout sau khi da tao");
                    return response;
                }

                item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();
                item.CreateDate = existingDoc.TimestampOr("CreateDate") ?? item.CreateDate;

                var bsonDoc = item.ToBsonDocument();
                bsonDoc["_id"] = item.Id;
                ServiceMutationPolicy.ApplyModifyAudit(bsonDoc, existingDoc, context, item.ModifyDate);
                ApplyAuditMetadata(item, bsonDoc);

                var replaceResult = await Global.CollectionBsonTemplateLayout!
                    .ReplaceOneAsync(Builders<BsonDocument>.Filter.Eq("_id", item.Id), bsonDoc);

                if (replaceResult.MatchedCount == 0)
                {
                    response.Meta = ThamSoResponseFactory.Fail("Khong tim thay template layout dang hoat dong de cap nhat");
                    return response;
                }

                response.Meta = ThamSoResponseFactory.Ok("Cap nhat template layout thanh cong");
            }

            response.Item = item;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SaveTemplateLayout error");
            response.Meta = ThamSoResponseFactory.Fail("Loi khi luu template", ex.Message);
        }

        return response;
    }

    public async Task<DeleteBaseResponse> DeleteTemplateLayoutAsync(DeleteTemplateLayoutRequest request, ServerCallContext? context)
    {
        var response = new DeleteBaseResponse();
        try
        {
            if (!ServiceMutationPolicy.CanDeleteThamSo(context, PermissionCode))
            {
                response.Success = false;
                response.Message = "Khong co quyen xoa template layout";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            var result = await Global.CollectionBsonTemplateLayout!.UpdateManyAsync(
                ServiceMutationPolicy.ActiveIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildSoftDeleteUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da xoa mem {result.ModifiedCount} template layout";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DeleteTemplateLayout error");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
    }

    public async Task<StatusResponse> RestoreTemplateLayoutAsync(RestoreTemplateLayoutRequest request, ServerCallContext? context)
    {
        var response = new StatusResponse();
        try
        {
            if (!ServiceMutationPolicy.CanRestoreThamSo(context))
            {
                response.Success = false;
                response.Message = "Chi nguoi co quyen thamso_restore hoac superadmin moi duoc khoi phuc template layout";
                return response;
            }

            var normalizedIds = ServiceMutationPolicy.NormalizeIds(request.Ids);
            if (normalizedIds.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong co template layout nao de khoi phuc";
                return response;
            }

            var deletedDocs = await Global.CollectionBsonTemplateLayout!
                .Find(ServiceMutationPolicy.DeletedIdsFilter(normalizedIds))
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Name").Include("Key"))
                .ToListAsync();

            if (deletedDocs.Count == 0)
            {
                response.Success = false;
                response.Message = "Khong tim thay template layout da xoa de khoi phuc";
                return response;
            }

            var keys = deletedDocs
                .Select(doc => doc.StringOr("Key"))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (keys.Count > 0)
            {
                var activeConflictDocs = await Global.CollectionBsonTemplateLayout!
                    .Find(Builders<BsonDocument>.Filter.And(
                        Builders<BsonDocument>.Filter.In("Key", keys),
                        MongoDocumentHelpers.NotDeleted))
                    .Project(Builders<BsonDocument>.Projection.Include("_id").Include("Key"))
                    .ToListAsync();

                var restoreIdSet = normalizedIds.ToHashSet(StringComparer.Ordinal);
                var conflictingKeys = activeConflictDocs
                    .Where(doc => !restoreIdSet.Contains(doc.IdString()))
                    .Select(doc => doc.StringOr("Key"))
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.Ordinal)
                    .ToList();

                if (conflictingKeys.Count > 0)
                {
                    response.Success = false;
                    response.Message = $"Khong the khoi phuc template layout vi trung key dang hoat dong: {string.Join(", ", conflictingKeys.Take(10))}";
                    return response;
                }
            }

            var result = await Global.CollectionBsonTemplateLayout!.UpdateManyAsync(
                ServiceMutationPolicy.DeletedIdsFilter(normalizedIds),
                ServiceMutationPolicy.BuildRestoreUpdate(context));

            response.Success = result.ModifiedCount > 0;
            response.Message = $"Da khoi phuc {result.ModifiedCount} template layout";
            logger.LogInformation("RestoreTemplateLayout: Restored {Count}", result.ModifiedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RestoreTemplateLayout error");
            response.Success = false;
            response.Message = "Loi khi khoi phuc template layout";
            response.MessageException = ex.Message;
        }

        return response;
    }
}
