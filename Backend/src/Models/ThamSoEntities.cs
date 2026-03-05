using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Backend.Models;

/// <summary>
/// MongoDB POCO for DynamicField (separate from proto-generated class).
/// </summary>
public class DynamicFieldEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("Key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("Label")]
    public string Label { get; set; } = string.Empty;

    [BsonElement("Type")]
    public string Type { get; set; } = "text";

    [BsonElement("Required")]
    public bool Required { get; set; }

    [BsonElement("Validation")]
    public FieldValidationEntity? Validation { get; set; }

    [BsonElement("Delete")]
    public bool Delete { get; set; }

    [BsonElement("CreateDate")]
    public DateTime? CreateDate { get; set; }

    [BsonElement("ModifyDate")]
    public DateTime? ModifyDate { get; set; }
}

public class FieldValidationEntity
{
    [BsonElement("MinLength")]
    public int MinLength { get; set; }

    [BsonElement("MaxLength")]
    public int MaxLength { get; set; }

    [BsonElement("Pattern")]
    public string Pattern { get; set; } = string.Empty;

    [BsonElement("Min")]
    public double Min { get; set; }

    [BsonElement("Max")]
    public double Max { get; set; }

    [BsonElement("Options")]
    public List<string> Options { get; set; } = new();
}

/// <summary>
/// MongoDB POCO for FieldSet (separate from proto-generated class).
/// FieldIds is a plain List<string> — serializes correctly as a BSON array.
/// </summary>
public class FieldSetEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("Name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("Icon")]
    public string Icon { get; set; } = string.Empty;

    [BsonElement("Color")]
    public string Color { get; set; } = string.Empty;

    [BsonElement("Desc")]
    public string Desc { get; set; } = string.Empty;

    /// <summary>
    /// List of DynamicField IDs belonging to this set.
    /// Plain List<string> serializes to a BSON array correctly.
    /// </summary>
    [BsonElement("FieldIds")]
    public List<string> FieldIds { get; set; } = new();

    [BsonElement("Delete")]
    public bool Delete { get; set; }

    [BsonElement("CreateDate")]
    public DateTime? CreateDate { get; set; }

    [BsonElement("ModifyDate")]
    public DateTime? ModifyDate { get; set; }
}

/// <summary>
/// MongoDB POCO for FormConfig.
/// </summary>
public class FormConfigEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("Name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("Desc")]
    public string Desc { get; set; } = string.Empty;

    [BsonElement("Tabs")]
    public List<FormTabConfigEntity> Tabs { get; set; } = new();

    [BsonElement("Delete")]
    public bool Delete { get; set; }

    [BsonElement("CreateDate")]
    public DateTime? CreateDate { get; set; }

    [BsonElement("ModifyDate")]
    public DateTime? ModifyDate { get; set; }
}

public class FormTabConfigEntity
{
    [BsonElement("Id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("Label")]
    public string Label { get; set; } = string.Empty;

    [BsonElement("SetIds")]
    public List<string> SetIds { get; set; } = new();
}
