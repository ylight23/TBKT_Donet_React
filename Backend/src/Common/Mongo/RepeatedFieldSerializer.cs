using Google.Protobuf.Collections;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Backend.Common.Mongo;

public class RepeatedFieldSerializer<T> : SerializerBase<RepeatedField<T>>
{
    public override void Serialize(
        BsonSerializationContext context,
        BsonSerializationArgs args,
        RepeatedField<T> value)
    {
        context.Writer.WriteStartArray();
        foreach (var item in value ?? [])
            BsonSerializer.Serialize(context.Writer, item);
        context.Writer.WriteEndArray();
    }

    public override RepeatedField<T> Deserialize(
        BsonDeserializationContext context,
        BsonDeserializationArgs args)
    {
        var result = new RepeatedField<T>();
        context.Reader.ReadStartArray();
        while (context.Reader.ReadBsonType() != BsonType.EndOfDocument)
            result.Add(BsonSerializer.Deserialize<T>(context.Reader));
        context.Reader.ReadEndArray();
        return result;
    }
}
