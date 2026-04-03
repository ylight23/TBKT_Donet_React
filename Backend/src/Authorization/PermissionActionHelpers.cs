using Backend.Common.Bson;
using MongoDB.Bson;
using protos;

namespace Backend.Authorization;

internal static class PermissionActionHelpers
{
    private static readonly string[] ActionNames =
    [
        "view", "add", "edit", "delete", "approve", "download", "print"
    ];

    public static BsonDocument EmptyActionsDocument() => new()
    {
        { "view", false },
        { "add", false },
        { "edit", false },
        { "delete", false },
        { "approve", false },
        { "download", false },
        { "print", false },
    };

    public static BsonDocument ExtractActionsDocument(BsonDocument doc)
    {
        var actionDoc = doc.DocOr("Actions");
        if (actionDoc == null) return EmptyActionsDocument();

        return new BsonDocument
        {
            { "view", actionDoc.BoolOr("view") },
            { "add", actionDoc.BoolOr("add") },
            { "edit", actionDoc.BoolOr("edit") },
            { "delete", actionDoc.BoolOr("delete") },
            { "approve", actionDoc.BoolOr("approve") },
            { "download", actionDoc.BoolOr("download") },
            { "print", actionDoc.BoolOr("print") },
        };
    }

    public static void MergeActions(BsonDocument target, BsonDocument source)
    {
        foreach (var name in ActionNames)
            if (source.BoolOr(name)) target[name] = true;
    }

    public static ActionsMap ToActionsMap(BsonDocument doc)
    {
        var actions = new ActionsMap();
        var actionDoc = doc.DocOr("Actions");
        if (actionDoc == null) return actions;

        actions.View = actionDoc.BoolOr("view");
        actions.Add = actionDoc.BoolOr("add");
        actions.Edit = actionDoc.BoolOr("edit");
        actions.Delete = actionDoc.BoolOr("delete");
        actions.Approve = actionDoc.BoolOr("approve");
        actions.Download = actionDoc.BoolOr("download");
        actions.Print = actionDoc.BoolOr("print");
        return actions;
    }

    public static void MergeActions(ActionsMap? target, ActionsMap source)
    {
        if (target == null) return;
        if (source.View) target.View = true;
        if (source.Add) target.Add = true;
        if (source.Edit) target.Edit = true;
        if (source.Delete) target.Delete = true;
        if (source.Approve) target.Approve = true;
        if (source.Download) target.Download = true;
        if (source.Print) target.Print = true;
    }
}
