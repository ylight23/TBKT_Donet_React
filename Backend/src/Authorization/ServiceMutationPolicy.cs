using Backend.Common.Bson;
using Backend.Common.Mongo;
using Backend.Common.Protobuf;
using Backend.Services;
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

    // ── AccessGate / ActionGuard enforcement (C1) ──────────────────────

    /// <summary>
    /// Get AccessGate from request context (sync wrapper for service layer).
    /// </summary>
    public static AccessGate GetAccessGate(ServerCallContext? context) =>
        context.GetAccessGate();

    /// <summary>
    /// Check if user can perform a specific action on a specific ChuyenNganh.
    /// Returns false if the action is denied; services should abort the operation.
    /// </summary>
    public static bool CanActOnCN(ServerCallContext? context, string action, string? idChuyenNganh)
    {
        var gate = context.GetAccessGate();
        return gate.CanActOnCN(action, idChuyenNganh);
    }

    /// <summary>
    /// Throws RpcException with PermissionDenied if user cannot perform the specified
    /// action on the given ChuyenNganh. Only checks CN dimension.
    /// Prefer <see cref="RequireAction"/> for full 2-dimension enforcement.
    /// </summary>
    public static void RequireActOnCN(ServerCallContext? context, string action, string? idChuyenNganh)
    {
        if (!CanActOnCN(context, action, idChuyenNganh))
        {
            throw new RpcException(new Status(
                StatusCode.PermissionDenied,
                $"Không có quyền '{action}' trên chuyên ngành '{idChuyenNganh ?? "(trống)"}'."));
        }
    }

    /// <summary>
    /// Combined 2-dimension enforcement ⭐ — checks BOTH:
    ///   Chiều 1: FuncActions (có quyền chức năng?)
    ///   Chiều 2: ActionsPerCN (có quyền action trên CN cụ thể?)
    /// Throws PermissionDenied if either dimension denies.
    /// 
    /// VD: RequireAction(ctx, "trangbi", "edit", "thongtin")
    ///     → Fail nếu checkedCodes thiếu trangbi.edit HOẶC ActionsPerCN["thongtin"] thiếu edit
    /// </summary>
    public static void RequireActOnCN(
        ServerCallContext? context,
        string action,
        string? idChuyenNganh,
        bool requireCnScope)
    {
        var gate = context.GetAccessGate();
        var visibleCNs = gate.GetVisibleCNs()
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (requireCnScope && !gate.IsSuperAdmin && visibleCNs.Count == 0)
        {
            throw new RpcException(new Status(
                StatusCode.PermissionDenied,
                "Khong co pham vi chuyen nganh hop le de thao tac du lieu."));
        }

        RequireActOnCN(context, action, idChuyenNganh);
    }

    public static void RequireAction(
        ServerCallContext? context, string maChucNang, string action, string? idChuyenNganh)
    {
        var gate = context.GetAccessGate();
        if (!gate.CanPerformAction(Global.UnifiedMaPhanHe, maChucNang, action, idChuyenNganh))
        {
            throw new RpcException(new Status(
                StatusCode.PermissionDenied,
                $"Không có quyền '{action}' trên module '{maChucNang}' cho chuyên ngành '{idChuyenNganh ?? "(trống)"}'."));
        }
    }

    /// <summary>
    /// Throws RpcException with PermissionDenied if user cannot see data from the given CN.
    /// </summary>
    public static void RequireSeeCN(ServerCallContext? context, string? idChuyenNganh)
    {
        var gate = context.GetAccessGate();
        if (!gate.CanSeeCN(idChuyenNganh))
        {
            throw new RpcException(new Status(
                StatusCode.PermissionDenied,
                $"Không có quyền xem dữ liệu chuyên ngành '{idChuyenNganh ?? "(trống)"}'."));
        }
    }

    /// <summary>
    /// Build a MongoDB filter that restricts results to only the ChuyenNganh values
    /// the current user can see. Returns an empty filter if the user has no restrictions
    /// (SuperAdmin or no CN rules configured).
    /// </summary>
    /// <param name="context">gRPC request context.</param>
    /// <param name="cnFieldName">
    /// The field name in MongoDB documents that stores the ChuyenNganh ID.
    /// Defaults to "IDChuyenNganh".
    /// </param>
    public static void RequireSeeCN(
        ServerCallContext? context,
        string? idChuyenNganh,
        bool requireCnScope)
    {
        var gate = context.GetAccessGate();
        var visibleCNs = gate.GetVisibleCNs()
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (requireCnScope && !gate.IsSuperAdmin && visibleCNs.Count == 0)
        {
            throw new RpcException(new Status(
                StatusCode.PermissionDenied,
                "Khong co pham vi chuyen nganh hop le de xem du lieu."));
        }

        RequireSeeCN(context, idChuyenNganh);
    }

    public static FilterDefinition<BsonDocument> BuildCnVisibilityFilter(
        ServerCallContext? context,
        string cnFieldName = "IDChuyenNganh")
    {
        var gate = context.GetAccessGate();
        var visibleCNs = gate.GetVisibleCNs();
        if (visibleCNs.Count == 0)
            return Builders<BsonDocument>.Filter.Empty; // no restriction

        return Builders<BsonDocument>.Filter.In(cnFieldName, visibleCNs);
    }

    public static FilterDefinition<BsonDocument> BuildCnVisibilityFilter(
        ServerCallContext? context,
        string cnFieldName,
        bool requireCnScope)
    {
        var gate = context.GetAccessGate();
        var visibleCNs = gate.GetVisibleCNs()
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (visibleCNs.Count == 0)
        {
            if (requireCnScope && !gate.IsSuperAdmin)
            {
                return Builders<BsonDocument>.Filter.In(cnFieldName, Array.Empty<string>());
            }

            return Builders<BsonDocument>.Filter.Empty;
        }

        return Builders<BsonDocument>.Filter.In(cnFieldName, visibleCNs);
    }
}
