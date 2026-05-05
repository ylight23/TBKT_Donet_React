using Backend.Authorization;
using Backend.Common.Bson;
using Backend.Common.Protobuf;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

using protos;
namespace Backend.Services;

public class OfficeServiceImpl(ILogger<OfficeServiceImpl> logger, IWebHostEnvironment _environment) : OfficeService.OfficeServiceBase
{

    private const string PermissionCode = "office.view";

    private int lengthOfLevel = 3;
    private int maxOfLevel = 999;

    private static string BuildOfficePath(string? id)
        => string.IsNullOrWhiteSpace(id) ? "/" : "/" + id.Replace(".", "/") + "/";

    private static int BuildOfficeDepth(string? id)
        => string.IsNullOrWhiteSpace(id)
            ? 0
            : id.Split('.', StringSplitOptions.RemoveEmptyEntries).Length;

    private static void ApplyDerivedOfficeFields(Office office)
    {
        office.Path = BuildOfficePath(office.Id);
        office.Depth = BuildOfficeDepth(office.Id);
    }



     [Authorize]
    public override Task<OfficeListResponse> GetListOffice(OfficeListRequest request, ServerCallContext context)
    {
        OfficeListResponse response = new OfficeListResponse();
        try
        {
            context.RequireView(PermissionCode);

            logger.LogInformation($"[GetListOffice START] ParentID={request.ParentId}, LoadAll={request.LoadAll}, ShowToLevel={request.ShowToLevel}, SearchText={request.SearchText}");
            var builder = Builders<BsonDocument>.Filter;
            var filter = builder.Empty;

            var parentId = request.ParentId?.Contains("_") == true ?
                request.ParentId.Substring(0, request.ParentId.IndexOf("_", StringComparison.Ordinal)) :
                request.ParentId;

            //  CRITICAL FIX: Xử lý search TRƯỚC, bỏ qua parent filter
            if (!string.IsNullOrWhiteSpace(request.SearchText))
            {
                logger.LogInformation($"[GetListOffice] SEARCH MODE - SearchText={request.SearchText}");

                // Khi có search text, chỉ filter theo search, BỎ QUA parentID
                var searchPattern = new BsonRegularExpression(request.SearchText, "i");
                var searchFilter = builder.Or(
                    builder.Regex("Ten", searchPattern),
                    builder.Regex("TenDayDu", searchPattern),
                    builder.Regex("VietTat", searchPattern),
                    builder.Regex("_id", searchPattern),
                    builder.Regex("IdCapTren", searchPattern)
                );
                filter &= searchFilter;
            }
            else
            {
                // Chỉ filter theo parentId khi KHÔNG có search text
                logger.LogInformation($"[GetListOffice] NORMAL MODE - ParentID={parentId}");

                if (!string.IsNullOrEmpty(parentId))
                {
                    if (!request.LoadAll)
                        filter &= builder.Eq("IdCapTren", parentId);
                    else
                        filter &= builder.Regex("_id", new BsonRegularExpression("^" + parentId, "i"));
                }
                else if (!request.LoadAll)
                {
                    filter &= builder.Or(
                        builder.Eq("IdCapTren", BsonNull.Value),
                        builder.Eq("IdCapTren", ""),
                        builder.Exists("IdCapTren", false)
                    );
                }
            }

            // SearchInIds - áp dụng cho cả search và normal mode
            if (request.SearchInIds)
            {
                filter &= builder.In("_id", request.InIds);
            }

            // Parameters filter
            if (request.Parameters != null && request.Parameters.Count > 0)
            {
                foreach (var item in request.Parameters)
                {
                    if (!string.IsNullOrEmpty(item.Name))
                    {
                        var filterParameterItem = builder.Eq("Name", item.Name);
                        if (item.IntValue != null)
                        {
                            filterParameterItem &= builder.Eq("IntValue", item.IntValue);
                        }
                        else if (item.BoolValue != null)
                        {
                            filterParameterItem &= builder.Eq("BoolValue", item.BoolValue);
                        }
                        else if (item.StringValue != null)
                        {
                            filterParameterItem &= builder.Eq("StringValue", item.StringValue);
                        }
                        else if (item.DoubleValue != null)
                        {
                            filterParameterItem &= builder.Eq("DoubleValue", item.DoubleValue);
                        }
                        filter &= builder.ElemMatch("Parameters", filterParameterItem);
                    }
                }
            }

            var projection = Builders<BsonDocument>.Projection
                .Include("_id")
                .Include("IdCapTren")
                .Include("Ten")
                .Include("TenDayDu")
                .Include("VietTat")
                .Include("CoCapDuoi")
                .Include("ThuTu")
                .Include("ThuTuSapXep")
                .Include("Path")
                .Include("Depth");

            if (request.IncludeParameters)
                projection = Builders<BsonDocument>.Projection.Combine(projection,
                    Builders<BsonDocument>.Projection.Include("Parameters"));

            var set = Global.CollectionBsonOffice
                .Find<BsonDocument>(filter)
                .Project(projection)
                .Sort(Builders<BsonDocument>.Sort.Ascending(c => c["ThuTuSapXep"]))
                .ToList();

            logger.LogInformation($"[GetListOffice] Fetched {set.Count} items from database");

            // ... phần còn lại giữ nguyên như cũ ...

            Dictionary<string, Catalog>? dictReference = null;
            var dictNodes = new Dictionary<string, Office>();
            var dictNodeByGroupName = new Dictionary<string, Office>();

            if (!string.IsNullOrEmpty(request.GroupByParameterFieldName))
            {
                var refrenceCollection = Global.MongoDB?.GetCollection<Catalog>(request.GroupByParameterFieldNameWithCatalogName);
                if (refrenceCollection != null)
                {
                    dictReference = refrenceCollection.Find(Builders<Catalog>.Filter.Empty).ToList().ToDictionary(c => c.Id, c => c);
                }
            }

            var rootLength = context.GetUserAdminOfficeID()?.Length ?? 0;

            foreach (var bson in set)
            {
                var office = BsonSerializer.Deserialize<Office>(bson);

                var parametersBson = request.IncludeParameters ? bson.ArrayOr("Parameters") : null;
                if (parametersBson != null)
                {
                    var parameters = parametersBson.Documents()
                        .Select(doc => BsonSerializer.Deserialize<ExtendedField>(doc))
                        .ToArray();
                    if (parameters != null)
                        office.Parameters.AddRange(parameters);
                }

                if (request.ShowToLevel > 0 && office.Id.Length > rootLength + request.ShowToLevel * 4)
                {
                    logger.LogWarning($"[GetListOffice] Skipped item ID={office.Id}");
                    continue;
                }

                dictNodes.Add(office.Id, office);

                if (!string.IsNullOrEmpty(request.GroupByParameterFieldName))
                {
                    var paramterGroup = office.Parameters.FirstOrDefault(c =>
                        c.Name == request.GroupByParameterFieldName && !string.IsNullOrEmpty(c.StringValue));

                    if (paramterGroup != null)
                    {
                        if (!dictNodeByGroupName.ContainsKey(paramterGroup.StringValue))
                        {
                            if (dictReference != null && dictReference.TryGetValue(paramterGroup.StringValue, out var refrenceItem))
                            {
                                dictNodeByGroupName.Add(paramterGroup.StringValue, new Office()
                                {
                                    Id = office.IdCapTren + "_" + paramterGroup.StringValue,
                                    Ten = refrenceItem.Ten,
                                    IdCapTren = office.IdCapTren,
                                    TenDayDu = refrenceItem.Ten,
                                    CoCapDuoi = true,
                                    ThuTu = refrenceItem.ThuTu,
                                    ThuTuSapXep = office.IdCapTren + "." + refrenceItem.ThuTu.ToString().PadLeft(lengthOfLevel, '0') + "." + office.ThuTuSapXep
                                });
                                office.IdCapTren = office.IdCapTren + "_" + paramterGroup.StringValue;
                            }
                        }
                        else
                        {
                            office.IdCapTren = office.IdCapTren + "_" + paramterGroup.StringValue;
                        }
                    }
                }
            }

            if (!string.IsNullOrEmpty(request.GroupByParameterFieldName))
            {
                if (request.LoadAll)
                {
                    foreach (var nodeGroup in dictNodeByGroupName)
                    {
                        dictNodes.Add(nodeGroup.Key, nodeGroup.Value);
                    }
                    response.Items.AddRange(dictNodes.Values);
                }
                else
                {
                    if (request.ParentId?.Contains("_") == true)
                    {
                        var groupValue = request.ParentId.Substring(request.ParentId.IndexOf("_", StringComparison.Ordinal) + 1);
                        response.Items.AddRange(dictNodes.Values.Where(c => c.Parameters.Count(c => c.Name == request.GroupByParameterFieldName && c.StringValue == groupValue) > 0).OrderBy(c => c.ThuTuSapXep).ToList());
                    }
                    else if (dictNodeByGroupName.Any())
                    {
                        response.Items.AddRange(dictNodeByGroupName.Values.OrderBy(c => c.ThuTuSapXep));
                    }
                    else
                    {
                        response.Items.AddRange(dictNodes.Values.OrderBy(c => c.ThuTuSapXep).ToList());
                    }
                }
            }
            else
            {
                response.Items.AddRange(dictNodes.Values);
            }

            int totalFetched = set.Count;
            set.Clear();
            response.Success = true;

            logger.LogInformation($"=== END GetListOffice: DB fetch={totalFetched} items, returned={response.Items.Count} items ===");
        }
        catch (Exception ex)
        {
            logger.LogError(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return Task.FromResult(response);
    }

    // [Authorize]
    // public override Task<OfficeResponse> GetLastOffice(OfficeListRequest request, ServerCallContext context)
    // {
    //     context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetLastOffice", request, _logger);
    //     OfficeResponse response = new OfficeResponse();
    //     if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcName))
    //     {
    //         response.Success = false;
    //         response.Message = Language.NotAuthorized;
    //         throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
    //     }
    //     try
    //     {
    //         var builder = Builders<DonVi>.Filter;
    //         var filter = builder.Empty;
    //         if (!string.IsNullOrEmpty(request.ParentID))
    //         {
    //             filter &= builder.Eq(x => x.IDCapTren, request.ParentID);
    //         }
    //         else
    //             filter &= builder.Or(builder.Eq(x => x.IDCapTren, null), builder.Eq(x => x.IDCapTren, string.Empty));
    //         var obj = Global.CollectionDonVi.Find<DonVi>(filter).SortByDescending(c => c.ThuTu).FirstOrDefault();
    //         response.Item = obj;
    //         response.Success = true;
    //     }
    //     catch (Exception ex)
    //     {
    //         _logger.LogError(ex.Message + $" [{ex.StackTrace}]");
    //         response.Success = false;
    //         response.MessageException = ex.Message;
    //     }
    //     GC.Collect();
    //     return Task.FromResult(response);
    // }

    // [Authorize]
    // public override Task<OfficeResponse> GetMaxOffice(OfficeListRequest request, ServerCallContext context)
    // {
    //     context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetMaxOffice", request, _logger);
    //     var response = new OfficeResponse();
    //     if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcName))
    //     {
    //         response.Success = false;
    //         response.Message = Language.NotAuthorized;
    //         throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
    //     }
    //     try
    //     {
    //         var builder = Builders<DonVi>.Filter;
    //         var filter = builder.Empty;
    //         if (!string.IsNullOrEmpty(request.ParentID))
    //         {
    //             filter &= builder.Eq(x => x.IDCapTren, request.ParentID);
    //         }
    //         else
    //             filter &= builder.Or(builder.Eq(x => x.IDCapTren, null), builder.Eq(x => x.IDCapTren, string.Empty));
    //         var obj = Global.CollectionDonVi.Find(filter).SortByDescending(c => c.Id).FirstOrDefault();
    //         response.Item = obj;
    //         response.Success = true;
    //     }
    //     catch (Exception ex)
    //     {
    //         _logger.LogError(ex.Message + $" [{ex.StackTrace}]");
    //         response.Success = false;
    //         response.MessageException = ex.Message;
    //     }
    //     GC.Collect();
    //     return Task.FromResult(response);
    // }

     [Authorize]
    public override Task<OfficeResponse> GetOffice(OfficeRequest request, ServerCallContext context)
    {
        context.RequireView(PermissionCode);

        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetOffice", request, _logger);
        OfficeResponse response = new OfficeResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcName))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var filter = Builders<BsonDocument>.Filter.Eq("_id", request.Id);
            var bson = Global.CollectionBsonOffice.Find<BsonDocument>(filter).FirstOrDefault();
            if (bson != null)
            {
                response.Item = BsonSerializer.Deserialize<Office>(bson);

                

                var parametersBson = bson.ArrayOr("Parameters");
                if (parametersBson != null)
                {
                    var parameters = parametersBson.Documents()
                        .Select(doc => BsonSerializer.Deserialize<ExtendedField>(doc))
                        .ToArray();
                    if (parameters != null)
                        response.Item.Parameters.AddRange(parameters);
                }
            }
            response.Success = true;
            logger.LogInformation($"=== END GetOffice: {response.Item} items ===");

        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message}");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        GC.Collect();
        return Task.FromResult(response);
    }

     [Authorize]
    public override async Task<SaveOfficeResponse> ReorderOffice(ReorderOfficeRequest request, ServerCallContext context)
    {
        var response = new SaveOfficeResponse();
        context.RequireView(PermissionCode);

        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanCreateOrEdit(funcName: funcName))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "ReorderOffice", request, _logger);

        try
        {
            var source = Global.CollectionOffice.Find(x => x.Id == request.Id).FirstOrDefault();
            var writeModels = new List<UpdateOneModel<Office>>();
            if (!string.IsNullOrEmpty(request.Id) && !string.IsNullOrEmpty(request.TargetId))
            {
                var target = Global.CollectionOffice.Find(x => x.Id == request.TargetId).FirstOrDefault();
                if (target != null)
                {
                    var orderingTarget = target.ThuTu;
                    var virtualOrderingTarget = target.ThuTuSapXep;
                    var virtualOrderingSource = source.ThuTuSapXep;
                    var listOrderGreater = Global.CollectionOffice.Find(x => x.IdCapTren == target.IdCapTren && x.ThuTu >= orderingTarget).ToList();
                    var updateOrdering = Builders<Office>.Update.Set(c => c.ThuTu, target.ThuTu);
                    var sourceChilds = Global.CollectionOffice
                        .Find(Builders<Office>.Filter.Regex(x => x.IdCapTren,
                            "/.*" + source.Id + ".*/i"))
                        .Sort(Builders<Office>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                    if (sourceChilds != null)
                    {
                        foreach (var child in sourceChilds)
                        {
                            var virtualOrdering = child.ThuTuSapXep;
                            virtualOrdering = virtualOrderingTarget +
                                              virtualOrdering.Substring(source.ThuTuSapXep.Length);
                            writeModels.Add(new UpdateOneModel<Office>(
                                Builders<Office>.Filter.Eq(c => c.Id, child.Id),
                                Builders<Office>.Update
                                .Set(x => x.ThuTuSapXep, virtualOrdering)));
                        }
                    }

                    if (listOrderGreater != null)
                    {
                        foreach (var child in listOrderGreater)
                        {
                            if (child.Id.StartsWith(source.Id))
                                continue;
                            var virtualOrdering = child.ThuTuSapXep;
                            virtualOrdering = virtualOrderingSource +
                                              child.ThuTuSapXep.Substring(source.ThuTuSapXep.Length);
                            writeModels.Add(new UpdateOneModel<Office>(
                                Builders<Office>.Filter.Eq(c => c.Id, child.Id),
                                Builders<Office>.Update
                                    .Set(x => x.ThuTuSapXep, virtualOrdering)));
                            var targetChilds = Global.CollectionOffice
                                .Find(Builders<Office>.Filter.Regex(x => x.IdCapTren,
                                    "/.*" + child.Id + ".*/i"))
                                .Sort(Builders<Office>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                            if (targetChilds != null)
                            {
                                foreach (var item in targetChilds)
                                {
                                    var childVirtualOrdering = item.ThuTuSapXep;
                                    childVirtualOrdering = virtualOrderingTarget +
                                                           item.ThuTuSapXep.Substring(child.ThuTuSapXep.Length);
                                    writeModels.Add(new UpdateOneModel<Office>(
                                        Builders<Office>.Filter.Eq(c => c.Id, item.Id),
                                        Builders<Office>.Update
                                            .Set(x => x.ThuTuSapXep, childVirtualOrdering)));
                                }
                            }
                        }
                    }
                    await Global.CollectionOffice!.UpdateOneAsync(c => c.Id == request.Id, updateOrdering);
                    await Global.CollectionOffice!.BulkWriteAsync(writeModels);
                }
            }
            else
            {

                if (source != null)
                {
                    var currentOrdering = source.ThuTu;
                    var parent = Global.CollectionOffice.Find(x => x.Id == source.IdCapTren)
                        .FirstOrDefault();
                    var currentThuTuSapXep = "";
                    if (request.IsUp)
                    {
                        var sort = Builders<Office>.Sort.Descending(x => x.ThuTu);
                        var officeTarget = Global.CollectionOffice
                            .Find(x => x.IdCapTren == source.IdCapTren && x.ThuTu < currentOrdering)
                            .Sort(sort)
                            .FirstOrDefault();
                        if (officeTarget != null)
                        {
                            currentThuTuSapXep =
                                parent?.ThuTuSapXep + officeTarget.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                            var targetOrdering =
                                parent?.ThuTuSapXep + currentOrdering.ToString().PadLeft(lengthOfLevel, '0');
                            var updateOrdering = Builders<Office>.Update
                                .Set(x => x.ThuTu, officeTarget.ThuTu)
                                .Set(x => x.ThuTuSapXep, currentThuTuSapXep);
                            var updateTarget = Builders<Office>.Update
                                .Set(x => x.ThuTu, currentOrdering)
                                .Set(x => x.ThuTuSapXep, targetOrdering);
                            await Global.CollectionOffice.UpdateOneAsync(x => x.Id == source.Id,
                                updateOrdering);
                            await Global.CollectionOffice.UpdateOneAsync(x => x.Id == officeTarget.Id, updateTarget);
                            var childs = Global.CollectionOffice
                                .Find(Builders<Office>.Filter.Regex(x => x.IdCapTren,
                                    "/.*" + officeTarget.Id + ".*/i"))
                                .Sort(Builders<Office>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                            if (childs != null)
                            {
                                foreach (var child in childs)
                                {
                                    var ordering = child.ThuTuSapXep;
                                    ordering = targetOrdering +
                                               ordering.Substring(officeTarget.ThuTuSapXep.Length);
                                    updateTarget = Builders<Office>.Update
                                        .Set(x => x.ThuTuSapXep, ordering);
                                    await Global.CollectionOffice.UpdateOneAsync(x => x.Id == child.Id,
                                        updateTarget);
                                }
                            }

                            response.Success = true;
                        }
                    }
                    else
                    {
                        var sort = Builders<Office>.Sort.Ascending(x => x.ThuTu);
                        var officeTarget = Global.CollectionOffice
                            .Find(x => x.IdCapTren == source.IdCapTren && x.ThuTu > currentOrdering)
                            .Sort(sort)
                            .FirstOrDefault();
                        var targetOrdering =
                            parent?.ThuTuSapXep + currentOrdering.ToString().PadLeft(lengthOfLevel, '0');
                        if (officeTarget != null)
                        {
                            currentThuTuSapXep =
                                parent?.ThuTuSapXep + officeTarget.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                            var updateOrdering = Builders<Office>.Update
                                .Set(x => x.ThuTu, officeTarget.ThuTu)
                                .Set(x => x.ThuTuSapXep, currentThuTuSapXep);
                            var updateTarget = Builders<Office>.Update
                                .Set(x => x.ThuTu, currentOrdering)
                                .Set(x => x.ThuTuSapXep, targetOrdering);
                            await Global.CollectionOffice.UpdateOneAsync(x => x.Id == source.Id,
                                updateOrdering);
                            await Global.CollectionOffice.UpdateOneAsync(x => x.Id == officeTarget.Id, updateTarget);
                            var childs = Global.CollectionOffice
                                .Find(Builders<Office>.Filter.Regex(x => x.IdCapTren,
                                    "/.*" + officeTarget.Id + ".*/i"))
                                .Sort(Builders<Office>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                            if (childs != null)
                            {
                                foreach (var child in childs)
                                {
                                    var ordering = child.ThuTuSapXep;
                                    ordering = targetOrdering +
                                               ordering.Substring(officeTarget.ThuTuSapXep.Length);
                                    updateTarget = Builders<Office>.Update
                                        .Set(x => x.ThuTuSapXep, ordering);
                                    await Global.CollectionOffice.UpdateOneAsync(x => x.Id == child.Id,
                                        updateTarget);
                                }
                            }

                            response.Success = true;
                        }
                    }

                    var childsOfOrdering = Global.CollectionOffice
                        .Find(Builders<Office>.Filter.Regex(x => x.IdCapTren,
                            "/.*" + source.Id + ".*/i"))
                        .Sort(Builders<Office>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                    if (childsOfOrdering != null)
                    {
                        foreach (var child in childsOfOrdering)
                        {
                            var ordering = child.ThuTuSapXep;
                            ordering = currentThuTuSapXep +
                                       ordering.Substring(source.ThuTuSapXep.Length);
                            var updateTarget = Builders<Office>.Update
                                .Set(x => x.ThuTuSapXep, ordering);
                            await Global.CollectionOffice.UpdateOneAsync(x => x.Id == child.Id, updateTarget);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message}");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

     [Authorize]
    public override async Task<OfficeDeleteResponse> DeleteOffice(OfficeRequest request, ServerCallContext context)
    {
        var response = new OfficeDeleteResponse();
        context.RequireView(PermissionCode);

        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanDelete(funcName: funcName))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "DeleteOffice", request, _logger);
        try
        {
            if (Global.CollectionOffice != null)
            {
                var filter = Builders<Office>.Filter.Regex(x => x.Id, "/^" + request.Id + ".*/i");
                var deleteItems = Global.CollectionOffice.Find(filter).ToList();
                var existing = Global.CollectionOffice.Find(filter).FirstOrDefault();
                string? parentId = existing?.IdCapTren;
                // var checkDeleteAble = Utils.CheckDeleteAble("DonVi", request.Id);
                // if (checkDeleteAble.Any())
                // {
                //     response.Success = false;
                //     response.Message = string.Join(", ", checkDeleteAble);
                //     return response;
                // }
                var deleteResult = await Global.CollectionOffice.DeleteManyAsync(filter);
                if (deleteResult.IsAcknowledged && deleteResult.DeletedCount > 0)
                {
                    response.IdsDeleted.AddRange(deleteItems.Select(x => x.Id));
                    if (!string.IsNullOrEmpty(parentId))
                    {
                        var filterParent = Builders<Office>.Filter.Eq(x => x.IdCapTren, parentId);
                        var countChild = await Global.CollectionOffice.Find(filterParent).CountDocumentsAsync();
                        await Global.CollectionOffice.UpdateOneAsync(Builders<Office>.Filter.Eq(x => x.Id, parentId),
                            Builders<Office>.Update.Set(x => x.CoCapDuoi, countChild > 0));
                    }
                    ReorderAll(parentId);
                    // await Global.BrokerMessageAsync(new DiziMessageBrocker()
                    // {
                    //     Id = request.Id,
                    //     MessageType = "DeleteDonVi"
                    // });
                    response.Success = true;
                    response.Message = "Xóa thành công!";
                    logger.LogInformation($"=== END DeleteOffice: {response} ===");

                    //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "DeleteOffice", request);
                }
                else
                {
                    response.Success = false;
                    response.Message = "Xóa không thành công!";
                }
            }
            else
            {
                response.Success = false;
                response.Message = "Không tồn tại collection DonVi!";
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message}");
        }
        GC.Collect();
        return response;
    }

     [Authorize]
    private void ReorderAll(string? rootId, IEnumerable<Office>? listAllChild = null)
    {
        int count = 0;
        Office? root = null;
        if (Global.CollectionOffice == null)
            return;
        if (listAllChild == null)
        {
            root = Global.CollectionOffice.Find(x => x.Id == rootId).FirstOrDefault();
            if (root == null)
                return;
            listAllChild = Global.CollectionOffice
                .Find(Builders<Office>.Filter.Regex(x => x.Id, "/.*" + rootId + ".*/i")).ToList();
        }
        else
        {
            root = listAllChild.FirstOrDefault(c => c.Id == rootId);
        }
        if (root == null || listAllChild == null)
            return;
        if (listAllChild.Any())
        {
            var listChild = listAllChild.Where(c => c.IdCapTren == rootId).OrderBy(c => c.ThuTu).ToList();
            foreach (var child in listChild)
            {
                count++;

                var virtualOrdering = root.ThuTuSapXep + count.ToString().PadLeft(lengthOfLevel, '0');
                var update = Builders<Office>.Update
                    .Set(x => x.ThuTuSapXep, virtualOrdering)
                    .Set(x => x.ThuTu, count);
                Global.CollectionOffice.UpdateOne(Builders<Office>.Filter.Eq(x => x.Id, child.Id), update);
                ReorderAll(child.Id, listAllChild);
            }
        }
    }

     [Authorize]
    public override async Task<SaveOfficeResponse> SaveOffice(SaveOfficeRequest request, ServerCallContext context)
    {
        var response = new SaveOfficeResponse();
        context.RequireView(PermissionCode);

        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanCreateOrEdit(funcName: funcName))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));

        // }
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveOffice", request, _logger);

        response.Success = true;
        logger.LogInformation($"[SaveOffice START] isNew={request.IsNew}, Item.Id='{request.Item?.Id}', Item.IdCapTren='{request.Item?.IdCapTren}', Item.Ten='{request.Item?.Ten}'");
        try
        {
            if (Global.CollectionOffice != null)
            {
                var parent = Global.CollectionOffice.Find<Office>(Builders<Office>.Filter.Eq(x => x.Id, request.Item.IdCapTren)).FirstOrDefault();
                bool reorder = false;
                bool orderIsUp = false;
                request.Item.Ten = Backend.Converter.Converter.Trim(request.Item.Ten);
                request.Item.VietTat = Backend.Converter.Converter.Trim(request.Item.VietTat);
                request.Item.TenDayDu = parent != null && !string.IsNullOrEmpty(parent.IdCapTren) && !string.IsNullOrEmpty(parent.TenDayDu)
                    ? request.Item.Ten + "/ " + parent.TenDayDu
                    : request.Item.Ten;
                request.Item.TenVietTatDayDu = parent != null && !string.IsNullOrEmpty(parent.IdCapTren) && !string.IsNullOrEmpty(parent.TenDayDu)
                    ? request.Item.VietTat + "/ " + parent.TenVietTatDayDu
                    : request.Item.VietTat;
                var currentTime = ProtobufTimestampConverter.GetNowTimestamp();
                #region  Is New
                if (request.IsNew)
                {
                    var filter = Builders<Office>.Filter.Eq(x => x.Id, request.Item.Id);
                    int count = Global.CollectionOffice.Find<Office>(filter).ToList().Count;
                    if (count > 0)
                    {
                        response.Success = false;
                        response.Message = "Đã tồn tại dữ liệu mã " + request.Item.Id;
                        return response;
                    }
                    string newID = request.Item.Id;
                    int newId = 0;
                    reorder = true;
                    orderIsUp = true;
                    if (string.IsNullOrEmpty(request.Item.Id) || request.Item.Id.Contains("*"))
                    {
                        var filterMax = Builders<Office>.Filter.Eq(x => x.IdCapTren, request.Item.IdCapTren);
                        var officeMax = Global.CollectionOffice.Find<Office>(filterMax).SortByDescending(x => x.Id).Limit(1).FirstOrDefault();
                        if (officeMax != null)
                        {
                            newId = Backend.Converter.Converter.ToInt(officeMax.Id.Substring((request.Item.IdCapTren + "").Length + 1));
                            newId++;
                            if (newId > maxOfLevel)
                            {
                                response.Success = false;
                                response.Message = $"Quá giá trị mã cho phép là {maxOfLevel}";
                                return response;
                            }
                        }
                        else
                        {
                            newId++;
                        }
                        // Generate ID based on whether parent exists
                        if (string.IsNullOrEmpty(request.Item.IdCapTren))
                        {
                            // Root level: ID is just the number without dot prefix
                            newID = newId.ToString().PadLeft(lengthOfLevel, '0');
                        }
                        else
                        {
                            // Sub-level: ID is parent.number
                            newID = request.Item.IdCapTren + "." + newId.ToString().PadLeft(lengthOfLevel, '0');
                        }
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.Item.IdCapTren))
                        {
                            if (!newID.StartsWith(request.Item.IdCapTren + ""))
                            {
                                response.Success = false;
                                response.Message = "Mã không bắt đầu bằng: " + request.Item.IdCapTren;
                                return response;
                            }
                            if (newID.Substring(request.Item.IdCapTren.Length).Length != lengthOfLevel + 1)
                            {
                                response.Success = false;
                                response.Message = "Độ dài mã không hợp lệ!";
                                return response;
                            }
                            if (Backend.Converter.Converter.ToInt(newID.Substring((request.Item.IdCapTren + "").Length + 1)) == 0)
                            {
                                response.Success = false;
                                response.Message = $"{lengthOfLevel} số cuối mã không hợp lệ!";
                                return response;
                            }
                        }
                    }
                    string ordering = parent != null ? parent.ThuTuSapXep : "";
                    if (request.Item.ThuTu == 0)
                        request.Item.ThuTu = newId;
                    ordering = ordering + request.Item.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                    request.Item.Id = newID;
                    request.Item.ThuTuSapXep = ordering;
                    ApplyDerivedOfficeFields(request.Item);

                    request.Item.NgayTao = currentTime;
               
                    

                    await Global.CollectionOffice.InsertOneAsync(request.Item);
                    logger.LogInformation($"=== SaveOffice [ADD] New office created - ID: {request.Item.Id}, IdCapTren: '{request.Item.IdCapTren}' (length={request.Item.IdCapTren?.Length ?? 0}), Name: {request.Item.Ten} ===");
                    var updater = Builders<Office>.Update.Set(x => x.CoCapDuoi, true);
                    await Global.CollectionOffice.UpdateOneAsync(Builders<Office>.Filter.Eq(x => x.Id, request.Item.IdCapTren), updater);
                    response.Id = request.Item.Id;
                    response.VirtualOrderings.TryAdd(response.Id, request.Item.ThuTuSapXep);
                    response.Message = "Thêm mới thành công!";
                    //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveOffice [ADD]", request);
                }

                #endregion

                #region Update

                else
                {
                    bool changeParent = false;
                    bool changeName = false;
                    var existing = Global.CollectionOffice.Find(Builders<Office>.Filter.Eq(x => x.Id, request.OldId)).FirstOrDefault();

                    if (existing != null && existing.IdCapTren != request.Item.IdCapTren || !string.IsNullOrEmpty(request.Item.IdCapTren) && !request.Item.Id.StartsWith(request.Item.IdCapTren))
                        changeParent = true;
                    if (existing != null && existing.ThuTu != request.Item.ThuTu || existing.ThuTuSapXep.EndsWith(request.Item.ThuTu.ToString().PadLeft(3, '0')))
                        reorder = true;
                    if (request.Item.ThuTu < existing?.ThuTu)
                        orderIsUp = true;
                    if (existing?.Ten != request.Item.Ten)
                        changeName = true;
                    var listChild = Global.CollectionOffice.Find(Builders<Office>.Filter.Regex(x => x.IdCapTren, "/^" + request.OldId + ".*/i")).SortBy(c => c.Id).ToList();
                    //request.Item.TenDayDu = parent != null ? request.Item.Ten + (!string.IsNullOrEmpty(parent.TenDayDu) ? ", " + parent.TenDayDu : "") : null;

                    #region Change Parent

                    if (changeParent)
                    {
                        var filterMax = Builders<Office>.Filter.Eq(x => x.IdCapTren, request.Item.IdCapTren);
                        var listID = Global.CollectionOffice.Find<Office>(filterMax).ToList().Select(c => c.Id.Substring((request.Item.IdCapTren + "").Length).PadLeft(lengthOfLevel, '0')).OrderBy(c => c);
                        var officeMax = listID.OrderByDescending(x => x).FirstOrDefault();
                        int newId = 0;
                        if (officeMax != null)
                        {
                            newId = Backend.Converter.Converter.ToInt(officeMax);
                            newId++;
                        }
                        else
                        {
                            newId++;
                        }
                        var max = Global.CollectionOffice.Find<Office>(filterMax).SortByDescending(x => x.ThuTu).FirstOrDefault();

                        var deleteResult = await Global.CollectionOffice.DeleteOneAsync(Builders<Office>.Filter.Eq(x => x.Id, request.OldId));
                        if (deleteResult.IsAcknowledged && deleteResult.DeletedCount > 0)
                        {
                            var oldId = request.Item.Id;

                            request.Item.Id = request.Item.IdCapTren + "." + newId.ToString().PadLeft(lengthOfLevel, '0');
                            request.Item.ThuTu = max != null ? max.ThuTu + 1 : 1;
                            request.Item.ThuTuSapXep = parent?.ThuTuSapXep + request.Item.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                            ApplyDerivedOfficeFields(request.Item);
                           // request.Item.NgaySua = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(DateTime.Now.ToUniversalTime());
                            request.Item.NgaySua = currentTime;
                            request.Item.CoCapDuoi = listChild.Count > 0;
                            await Global.CollectionOffice.InsertOneAsync(request.Item);
                            // Utils.UpdateRelationShip("Office", oldId, request.Item.Id);
                            var updater = Builders<Office>.Update.Set(x => x.CoCapDuoi, true);
                            await Global.CollectionOffice.UpdateOneAsync(Builders<Office>.Filter.Eq(x => x.Id, request.Item.IdCapTren), updater);
                            if (listChild.Count > 0)
                            {
                                foreach (var child in listChild)
                                {
                                    if (child != null)
                                    {
                                        deleteResult = await Global.CollectionOffice.DeleteOneAsync(Builders<Office>.Filter.Eq(x => x.Id, child.Id));
                                        if (deleteResult.IsAcknowledged && deleteResult.DeletedCount > 0)
                                        {
                                            oldId = child.Id;
                                            child.CoCapDuoi = listChild.Any(c => c.IdCapTren == oldId);
                                            child.Id = child.Id.Replace(existing?.Id + ".", request.Item?.Id + ".");
                                            child.IdCapTren = child.IdCapTren.Replace(existing?.Id + ".", request.Item?.Id + ".");
                                            ApplyDerivedOfficeFields(child);

                                            var parentOfChild = listChild.FirstOrDefault(c => c.Id == child.IdCapTren);
                                            if (parentOfChild == null)
                                                parentOfChild = request.Item;
                                            child.ThuTuSapXep = parentOfChild?.ThuTuSapXep + child.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                                            child.NgaySua = ProtobufTimestampConverter.GetNowTimestamp();
                                            await Global.CollectionOffice.InsertOneAsync(child);
                                            response.VirtualOrderings.TryAdd(child.Id, child.ThuTuSapXep);
                                            RelationshipMaintenance.UpdateRelationShip("Office", oldId, child.Id);
                                        }
                                    }
                                }
                            }
                        }
                        response.Id = request.Item?.Id;
                        response.VirtualOrderings.TryAdd(request.Item?.Id + string.Empty, request.Item.ThuTuSapXep);
                        response.Message = "Cập nhật thành công!";
                        // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveOffice [ChangeParent]", request);
                    }

                    #endregion

                    #region Update

                    else
                    {
                        var ordering = parent != null ? parent.ThuTuSapXep : "";
                        if (request.Item.ThuTu < 0)
                        {
                            var filterMax = Builders<Office>.Filter.Eq(x => x.IdCapTren, request.Item.IdCapTren);
                            var officeMax = Global.CollectionOffice.Find<Office>(filterMax).SortByDescending(x => x.Id).Limit(1).FirstOrDefault();
                            if (officeMax != null)
                                request.Item.ThuTu = officeMax.ThuTu + 1;
                            else
                                request.Item.ThuTu = 1;
                        }

                        ordering = ordering + request.Item.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                        request.Item.ThuTuSapXep = ordering;
                        ApplyDerivedOfficeFields(request.Item);
                        var filter = Builders<Office>.Filter.Eq(x => x.Id, request.OldId);
                        var updater = Builders<Office>.Update
                            .Set(x => x.Ten, request.Item.Ten)
                            .Set(x => x.TenIn, request.Item.TenIn)
                            .Set(x => x.VietTat, request.Item.VietTat)
                            .Set(x => x.PhienHieu, request.Item.PhienHieu)
                            .Set(x => x.ThuTu, request.Item.ThuTu)
                            .Set(x => x.ThuTuSapXep, request.Item.ThuTuSapXep)
                            .Set(x => x.TenDayDu, request.Item.TenDayDu)
                            .Set(x => x.TenVietTatDayDu, request.Item.TenVietTatDayDu)
                            .Set(x => x.IdCapTren, request.Item.IdCapTren)
                            .Set(x => x.Path, request.Item.Path)
                            .Set(x => x.Depth, request.Item.Depth)
                            // .Set(x => x.CoCapDuoi, listChild is { Count: > 0 })
                            .Set(x => x.CoCapDuoi, request.Item.CoCapDuoi)
                            .Set(x => x.NgaySua, currentTime)
                            .Set(x => x.Parameters, request.Item.Parameters);

                        if (request.OldId != request.Item.Id)
                        {
                            await Global.CollectionOffice.DeleteOneAsync(filter);
                            request.Item.ThuTuSapXep = ordering;
                            await Global.CollectionOffice.InsertOneAsync(request.Item);
                            response.Success = true;
                            response.Message = "Cập nhật thành công!";
                            //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveOffice [ChangeID]", request);
                        }
                        else
                        {
                            UpdateResult updateResult = await Global.CollectionOffice.UpdateOneAsync(filter, updater);
                            if (updateResult.IsAcknowledged)
                            {
                                response.Success = true;
                                response.Message = "Cập nhật thành công!";
                                // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveOffice [EDIT]", request);
                            }
                            else
                            {
                                response.Success = false;
                                response.Message = "Cập nhật không thành công!";
                            }
                        }
                        response.Id = request.Item.Id;
                        response.VirtualOrderings.TryAdd(request.Item.Id, request.Item.ThuTuSapXep);
                    }

                    #endregion

                    if (changeName)
                    {
                        var roots = new List<Office>();
                        var dictOffices = listChild.ToDictionary(x => x.Id, x => x);
                        foreach (var child in listChild)
                        {
                            if (!string.IsNullOrEmpty(child.IdCapTren) &&
                                dictOffices.TryGetValue(child.IdCapTren, out var officeParent))
                            {
                                officeParent.DanhSachCapDuoi.Add(child);
                            }
                            else
                            {
                                roots.Add(child);
                            }
                        }

                        var writeModels = new List<WriteModel<Office>>();
                        foreach (var root in roots)
                        {
                            ChangeNameRecusive(request.Item, root, writeModels);
                        }
                        if (writeModels != null && writeModels.Any())
                            await Global.CollectionOffice.BulkWriteAsync(writeModels);
                    }
                }

                #endregion Update

                if (reorder)
                {
                    var writeModels = new List<UpdateOneModel<Office>>();
                    var child = Global.CollectionOffice
                        .Find(Builders<Office>.Filter.Regex(x => x.Id, "/^" + request.Item?.Id + ".*/i"))
                        .ToList();
                    if (child != null && request.Item != null)
                    {
                        foreach (var donVi in child)
                        {
                            donVi.ThuTuSapXep = request.Item.ThuTuSapXep +
                                                donVi.ThuTuSapXep.Substring(request.Item.ThuTuSapXep.Length);
                            writeModels.Add(new UpdateOneModel<Office>(Builders<Office>.Filter.Eq(c => c.Id, donVi.Id),
                                Builders<Office>.Update.Set(c => c.ThuTuSapXep, donVi.ThuTuSapXep)
                                .Set(c => c.NgaySua, currentTime)));
                            response.VirtualOrderings.TryAdd(donVi.Id, donVi.ThuTuSapXep);
                        }
                    }

                    if (writeModels.Any())
                    {
                        await Global.CollectionOffice.BulkWriteAsync(writeModels);
                    }
                }



            }
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message} [{ex.StackTrace}]");
            response.Success = false;
            response.Message = $"Lỗi: {ex.Message}!";
            response.MessageException = $"{ex.Message} [{ex.StackTrace}]";
        }
        GC.Collect();
        return response;
    }

    private void ChangeNameRecusive(Office? parent, Office child, List<WriteModel<Office>> writeModels)
    {
        if (parent != null)
            child.TenDayDu = child.Ten +
                             (!string.IsNullOrEmpty(parent.TenDayDu) ? ", " + parent.TenDayDu : string.Empty);
        else
        {
            child.TenDayDu = null;
        }

        writeModels.Add(new UpdateOneModel<Office>(Builders<Office>.Filter.Eq(x => x.Id, child.Id),
            Builders<Office>.Update.Set(x => x.TenDayDu, child.TenDayDu)));
        //Global.CollectionOffice.UpdateOne(x => x.Id == child.Id, Builders<Office>.Update.Set(x => x.TenDayDu, child.TenDayDu));
        if (child.DanhSachCapDuoi.Any())
        {
            foreach (var item in child.DanhSachCapDuoi)
            {
                ChangeNameRecusive(child, item, writeModels);
            }
        }
    }

     [Authorize]
    public override async Task<SaveOrderOfficeResponse> SaveOrderOffice(SaveOrderOfficeRequest request, ServerCallContext context)
    {
        var response = new SaveOrderOfficeResponse() { Success = true };
        context.RequireView(PermissionCode);

        // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveOrderOffice", request, _logger);

        try
        {
            var collection = Global.CollectionOffice;

            if (collection == null)
            {
                response.Success = false;
                response.Message = "CollectionDonVi null!";
                return response;
            }
            var ordering = 0;
            var item = collection.Find(x => x.Id == request.Id).FirstOrDefault();
            if (item == null)
            {
                response.Success = false;
                response.Message = "Không tìm thấy danh mục đang cập nhật thứ tự!";
                return response;
            }

            bool isUp = item.ThuTu > request.Ordering;
            var parent = !string.IsNullOrEmpty(item.IdCapTren) ? collection
                .Find<Office>(Builders<Office>.Filter.Eq(x => x.Id, item.IdCapTren))
                .FirstOrDefault() : null;
            var othersSmaller =
                collection.Find(c =>
                        c.IdCapTren == item.IdCapTren &&
                        (isUp ? c.ThuTu < request.Ordering : c.ThuTu <= request.Ordering) &&
                        c.Id != request.Id)
                    .Sort(Builders<Office>.Sort.Ascending(c => c.ThuTu)).ToList();
            var othersLarger =
                collection.Find(c =>
                        c.IdCapTren == item.IdCapTren &&
                        (isUp ? c.ThuTu >= request.Ordering : c.ThuTu > request.Ordering) &&
                        c.Id != request.Id)
                    .Sort(Builders<Office>.Sort.Ascending(c => c.ThuTu)).ToList();
            foreach (var other in othersSmaller)
            {
                ordering++;
                if (other.ThuTu == ordering)
                    continue;
                other.ThuTu = ordering;
                other.ThuTuSapXep = parent != null
                    ? parent.ThuTuSapXep + ordering.ToString().PadLeft(lengthOfLevel, '0')
                    : ordering.ToString().PadLeft(lengthOfLevel, '0');
                response.ReorderedItems.Add(other);
                await collection.UpdateOneAsync(
                    Builders<Office>.Filter.Eq(x => x.Id, other.Id),
                    Builders<Office>.Update
                        .Set(x => x.ThuTu, other.ThuTu)
                        .Set(x => x.ThuTuSapXep, other.ThuTuSapXep));
                var childsOfOther = collection
                    .Find(Builders<Office>.Filter.Regex(x => x.Id, "/^" + other.Id + ".*/i"))
                    .ToList();
                foreach (var child in childsOfOther)
                {
                    if (!string.IsNullOrWhiteSpace(child.ThuTuSapXep) &&
                        child.ThuTuSapXep.Length > other.ThuTuSapXep.Length)
                        child.ThuTuSapXep = other.ThuTuSapXep +
                                            child.ThuTuSapXep.Substring(item.ThuTuSapXep.Length);
                    else
                    {
                        child.ThuTuSapXep = other.ThuTuSapXep +
                                            child.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                    }

                    response.ReorderedItems.Add(child);
                    await collection.UpdateOneAsync(
                        Builders<Office>.Filter.Eq(x => x.Id, child.Id),
                        Builders<Office>.Update
                            .Set(x => x.ThuTu, child.ThuTu)
                            .Set(x => x.ThuTuSapXep, child.ThuTuSapXep));
                }
            }

            ordering++;
            item.ThuTu = ordering;
            item.ThuTuSapXep = parent != null
                ? parent.ThuTuSapXep + ordering.ToString().PadLeft(lengthOfLevel, '0')
                : ordering.ToString().PadLeft(lengthOfLevel, '0');
            response.ReorderedItems.Add(item);
            await collection.UpdateOneAsync(
                Builders<Office>.Filter.Eq(x => x.Id, item.Id),
                Builders<Office>.Update
                    .Set(x => x.ThuTu, item.ThuTu)
                    .Set(x => x.ThuTuSapXep, item.ThuTuSapXep));
            var childsOfItem = collection
                .Find(Builders<Office>.Filter.Regex(x => x.Id, "/^" + item.Id + ".*/i"))
                .ToList();
            foreach (var child in childsOfItem)
            {
                if (!string.IsNullOrWhiteSpace(child.ThuTuSapXep) &&
                    child.ThuTuSapXep.Length > item.ThuTuSapXep.Length)
                    child.ThuTuSapXep = item.ThuTuSapXep +
                                        child.ThuTuSapXep.Substring(item.ThuTuSapXep
                                            .Length);
                else
                {
                    child.ThuTuSapXep = item.ThuTuSapXep +
                                        child.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                }
                response.ReorderedItems.Add(child);
                await collection.UpdateOneAsync(
                    Builders<Office>.Filter.Eq(x => x.Id, child.Id),
                    Builders<Office>.Update
                        .Set(x => x.ThuTu, child.ThuTu)
                        .Set(x => x.ThuTuSapXep, child.ThuTuSapXep));
            }

            foreach (var other in othersLarger)
            {
                ordering++;
                if (other.ThuTu == ordering)
                    continue;
                other.ThuTu = ordering;
                other.ThuTuSapXep = parent != null
                    ? parent.ThuTuSapXep + ordering.ToString().PadLeft(lengthOfLevel, '0')
                    : ordering.ToString().PadLeft(lengthOfLevel, '0');
                await collection.UpdateOneAsync(
                    Builders<Office>.Filter.Eq(x => x.Id, other.Id),
                    Builders<Office>.Update
                        .Set(x => x.ThuTu, other.ThuTu)
                        .Set(x => x.ThuTuSapXep, other.ThuTuSapXep));
                var childsOfOther = collection
                    .Find(
                        Builders<Office>.Filter.Regex(x => x.Id, "/^" + other.Id + ".*/i"))
                    .ToList();
                response.ReorderedItems.Add(other);
                foreach (var child in childsOfOther)
                {
                    if (!string.IsNullOrWhiteSpace(child.ThuTuSapXep) &&
                        child.ThuTuSapXep.Length > other.ThuTuSapXep.Length)
                        child.ThuTuSapXep = other.ThuTuSapXep +
                                            child.ThuTuSapXep.Substring(item.ThuTuSapXep
                                                .Length);
                    else
                    {
                        child.ThuTuSapXep = other.ThuTuSapXep + "." +
                                            child.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                    }

                    response.ReorderedItems.Add(child);
                    await collection.UpdateOneAsync(
                        Builders<Office>.Filter.Eq(x => x.Id, child.Id),
                        Builders<Office>.Update
                            .Set(x => x.ThuTu, child.ThuTu)
                            .Set(x => x.ThuTuSapXep, child.ThuTuSapXep));
                }
            }

            var childs = collection
                .Find(Builders<Office>.Filter.Regex(x => x.Id, "/^" + item.Id + ".*/i")).ToList();
            foreach (var child in childs)
            {
                if (!string.IsNullOrWhiteSpace(child.ThuTuSapXep) &&
                    child.ThuTuSapXep.Length > item.ThuTuSapXep.Length)
                    child.ThuTuSapXep = item.ThuTuSapXep +
                                        child.ThuTuSapXep.Substring(item.ThuTuSapXep.Length);
                else
                {
                    child.ThuTuSapXep = item.ThuTuSapXep +
                                        child.ThuTu.ToString().PadLeft(lengthOfLevel, '0');
                }

                response.ReorderedItems.Add(child);
                await collection.UpdateOneAsync(
                    Builders<Office>.Filter.Eq(x => x.Id, child.Id),
                    Builders<Office>.Update
                        .Set(x => x.ThuTu, child.ThuTu)
                        .Set(x => x.ThuTuSapXep, child.ThuTuSapXep));
            }
        }
        catch (Exception e)
        {
            response.Success = false;
            response.MessageException = e.Message;
        }

        return response;
    }
}
