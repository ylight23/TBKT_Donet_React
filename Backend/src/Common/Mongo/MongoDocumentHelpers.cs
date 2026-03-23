using MongoDB.Bson;
using MongoDB.Driver;

namespace Backend.Common.Mongo;

public static class MongoDocumentHelpers
{
    public static readonly FilterDefinition<BsonDocument> NotDeleted =
        Builders<BsonDocument>.Filter.Ne("Delete", true);

    public static async Task<long> DeleteByIdsAsync(
        IMongoCollection<BsonDocument> collection,
        string? singleId,
        IEnumerable<string> multipleIds)
    {
        var ids = new List<string>();
        if (!string.IsNullOrWhiteSpace(singleId)) ids.Add(singleId);
        ids.AddRange(multipleIds.Where(id => !string.IsNullOrWhiteSpace(id)));
        if (ids.Count == 0) return 0;

        return (await collection.DeleteManyAsync(
            Builders<BsonDocument>.Filter.In("_id", ids))).DeletedCount;
    }

    public static Task<long> DeleteByIdsAsync(
        IMongoCollection<BsonDocument> collection,
        IEnumerable<string> ids) =>
        DeleteByIdsAsync(collection, null, ids);
}
