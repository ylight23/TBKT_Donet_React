using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Grpc.Core;
using MongoDB.Bson;
using MongoDB.Driver;
using Google.Protobuf.WellKnownTypes;

namespace Backend.Authorization;

internal static class ServiceMutationPolicy
{
    public static List<string> NormalizeIds(IEnumerable<string> ids) =>
        ids
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

    public static string GetActorName(ServerCallContext? context)
    {
        var userName = context.GetUserName();
        return string.IsNullOrWhiteSpace(userName) ? "system" : userName;
    }

    public static bool CanRestoreThamSo(ServerCallContext? context) =>
        context.CanRestoreThamSo();

    public static bool CanWriteThamSo(ServerCallContext? context, string funcName) =>
        context.CanCreateOrEdit(funcName);

    public static bool CanDeleteThamSo(ServerCallContext? context, string funcName) =>
        context.CanDelete(funcName);

    public static void ApplyCreateAudit(BsonDocument document, ServerCallContext? context, Timestamp? now = null)
    {
        var timestamp = now ?? ProtobufTimestampConverter.GetNowTimestamp();
        var actor = GetActorName(context);

        document["CreateDate"] = ProtobufTimestampConverter.TimestampToBson(timestamp);
        document["ModifyDate"] = ProtobufTimestampConverter.TimestampToBson(timestamp);
        document["NguoiTao"] = actor;
        document["NguoiSua"] = actor;
        document["Version"] = 1;
        document["Delete"] = false;
    }

    public static void ApplyModifyAudit(
        BsonDocument document,
        BsonDocument existingDocument,
        ServerCallContext? context,
        Timestamp? now = null)
    {
        var timestamp = now ?? ProtobufTimestampConverter.GetNowTimestamp();
        var actor = GetActorName(context);

        if (existingDocument.TryGetValue("CreateDate", out var createDate))
            document["CreateDate"] = createDate;
        if (existingDocument.TryGetValue("NguoiTao", out var nguoiTao))
            document["NguoiTao"] = nguoiTao;

        document["ModifyDate"] = ProtobufTimestampConverter.TimestampToBson(timestamp);
        document["NguoiSua"] = actor;
        document["Version"] = existingDocument.IntOr("Version", 0) + 1;
        document["Delete"] = false;
    }

    public static UpdateDefinition<BsonDocument> BuildSoftDeleteUpdate(ServerCallContext? context)
    {
        var now = ProtobufTimestampConverter.GetNowTimestamp();
        var actor = GetActorName(context);

        return Builders<BsonDocument>.Update
            .Set("Delete", true)
            .Set("NgayXoa", ProtobufTimestampConverter.TimestampToBson(now))
            .Set("NguoiXoa", actor)
            .Set("ModifyDate", ProtobufTimestampConverter.TimestampToBson(now))
            .Set("NguoiSua", actor);
    }

    public static UpdateDefinition<BsonDocument> BuildRestoreUpdate(ServerCallContext? context)
    {
        var now = ProtobufTimestampConverter.GetNowTimestamp();
        var actor = GetActorName(context);

        return Builders<BsonDocument>.Update
            .Set("Delete", false)
            .Set("NgayKhoiPhuc", ProtobufTimestampConverter.TimestampToBson(now))
            .Set("NguoiKhoiPhuc", actor)
            .Set("ModifyDate", ProtobufTimestampConverter.TimestampToBson(now))
            .Set("NguoiSua", actor);
    }

    public static FilterDefinition<BsonDocument> DeletedIdsFilter(IEnumerable<string> ids) =>
        Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.In("_id", ids),
            Builders<BsonDocument>.Filter.Eq("Delete", true));

    public static FilterDefinition<BsonDocument> ActiveIdsFilter(IEnumerable<string> ids) =>
        Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.In("_id", ids),
            MongoDocumentHelpers.NotDeleted);
}
