using Google.Protobuf.Collections;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Backend.Common.Mongo;

/// <summary>
/// BSON serializer for protobuf MapField&lt;TKey, TValue&gt;.
/// Serializes as a BSON sub-document { "key1": value1, "key2": value2, ... }.
/// TKey must be string.
/// </summary>
public class MapFieldSerializer<TKey, TValue> : SerializerBase<MapField<TKey, TValue>>
    where TKey : notnull
{
    public override void Serialize(
        BsonSerializationContext context,
        BsonSerializationArgs args,
        MapField<TKey, TValue> value)
    {
        context.Writer.WriteStartDocument();
        foreach (var kvp in value ?? new MapField<TKey, TValue>())
        {
            context.Writer.WriteName(kvp.Key?.ToString() ?? "");
            BsonSerializer.Serialize(context.Writer, kvp.Value);
        }
        context.Writer.WriteEndDocument();
    }

    public override MapField<TKey, TValue> Deserialize(
        BsonDeserializationContext context,
        BsonDeserializationArgs args)
    {
        var result = new MapField<TKey, TValue>();
        context.Reader.ReadStartDocument();
        while (context.Reader.ReadBsonType() != BsonType.EndOfDocument)
        {
            var name = context.Reader.ReadName(Utf8NameDecoder.Instance);
            var value = BsonSerializer.Deserialize<TValue>(context.Reader);
            if (typeof(TKey) == typeof(string))
                result[(TKey)(object)name] = value;
        }
        context.Reader.ReadEndDocument();
        return result;
    }
}
