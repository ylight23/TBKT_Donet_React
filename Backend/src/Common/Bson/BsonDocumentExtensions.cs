using Backend.Common.Protobuf;
using MongoDB.Bson;

namespace Backend.Common.Bson;

internal static class BsonDocumentExtensions
{
    public static IEnumerable<BsonDocument> Documents(this BsonArray? array) =>
        array == null
            ? []
            : array.Where(value => value.IsBsonDocument).Select(value => value.AsBsonDocument);

    public static IEnumerable<string> Strings(this BsonArray? array) =>
        array == null
            ? []
            : array.Where(value => value.IsString).Select(value => value.AsString);

    public static BsonArray? ArrayOr(this BsonDocument? doc, string key)
    {
        if (doc == null) return null;
        var value = doc.GetValue(key, BsonNull.Value);
        return value != BsonNull.Value && !value.IsBsonNull && value.IsBsonArray
            ? value.AsBsonArray
            : null;
    }

    public static IEnumerable<BsonDocument> DocumentsOr(this BsonDocument? doc, string key) =>
        doc.ArrayOr(key).Documents();

    public static IEnumerable<string> StringsOr(this BsonDocument? doc, string key) =>
        doc.ArrayOr(key).Strings();

    public static BsonDocument? DocOr(this BsonDocument? doc, string key)
    {
        if (doc == null) return null;
        var value = doc.GetValue(key, BsonNull.Value);
        return value != BsonNull.Value && !value.IsBsonNull && value.IsBsonDocument
            ? value.AsBsonDocument
            : null;
    }

    public static string StringOr(this BsonDocument? doc, string key, string fallback = "")
    {
        if (doc == null) return fallback;
        var value = doc.GetValue(key, BsonNull.Value);
        return (value == BsonNull.Value || value.IsBsonNull) ? fallback : value.AsString;
    }

    public static bool BoolOr(this BsonDocument? doc, string key, bool fallback = false)
    {
        if (doc == null) return fallback;
        var value = doc.GetValue(key, BsonNull.Value);
        return (value == BsonNull.Value || value.IsBsonNull) ? fallback : value.AsBoolean;
    }

    public static DateTime? DateTimeOr(this BsonDocument? doc, string key)
    {
        if (doc == null) return null;
        var value = doc.GetValue(key, BsonNull.Value);
        return (value == BsonNull.Value || value.IsBsonNull) ? null : value.ToUniversalTime();
    }

    public static Google.Protobuf.WellKnownTypes.Timestamp? TimestampOr(this BsonDocument? doc, string key)
    {
        if (doc == null) return null;
        return ProtobufTimestampConverter.BsonToTimestamp(doc.GetValue(key, BsonNull.Value));
    }

    public static string IdString(this BsonDocument doc) =>
        doc.GetValue("_id", BsonNull.Value) is var value && value != BsonNull.Value && !value.IsBsonNull
            ? value.ToString()!
            : "";
}
