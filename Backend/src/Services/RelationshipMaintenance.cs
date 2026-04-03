using MongoDB.Bson;
using MongoDB.Driver;
using protos;

namespace Backend.Services;

public static class RelationshipMaintenance
{
    public static bool UpdateRelationShip(string tableOriginName, object oldId, object newId)
    {
        try
        {
            var builderFilter = Builders<RelationShipObject>.Filter;
            var filter = builderFilter.Eq(x => x.OriginName, tableOriginName);
            var listRelationShip = Global.CollectionRelationShipObject.Find(filter).ToEnumerable();

            foreach (var item in listRelationShip)
            {
                if (string.IsNullOrEmpty(item.RelativeName))
                    continue;

                var collection = Global.MongoDB?.GetCollection<BsonDocument>(item.RelativeName);
                if (collection == null)
                    continue;

                collection.UpdateMany(
                    Builders<BsonDocument>.Filter.Eq(item.RelativeKeyField, oldId + string.Empty),
                    Builders<BsonDocument>.Update.Set(item.RelativeKeyField, newId + string.Empty));
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
