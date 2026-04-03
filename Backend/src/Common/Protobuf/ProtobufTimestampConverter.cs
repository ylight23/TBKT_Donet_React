using Google.Protobuf.WellKnownTypes;
using MongoDB.Bson;

namespace Backend.Common.Protobuf;

public static class ProtobufTimestampConverter
{
    public static Timestamp GetNowTimestamp() =>
        Timestamp.FromDateTime(DateTime.UtcNow);

    public static Timestamp? BsonToTimestamp(BsonValue? value)
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

    public static BsonValue TimestampToBson(Timestamp? timestamp)
    {
        if (timestamp == null) return BsonNull.Value;
        return new BsonDocument
        {
            { "Seconds", timestamp.Seconds },
            { "Nanos", timestamp.Nanos }
        };
    }
}
