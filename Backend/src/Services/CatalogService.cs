using Backend.Authorization;
using Backend.Converter;
using Backend.Common.Bson;
using Backend.Common.Protobuf;
using Backend.utils;

using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using protos;
using Status = Grpc.Core.Status;

namespace Backend.Services;

 [Authorize]  // Use default Bearer authentication
public class CatalogServiceImpl(ILogger<EmployeeServiceImpl> logger, IWebHostEnvironment environment) : CatalogService.CatalogServiceBase
{
    // private readonly ILogger<CatalogService> _logger;
    // private const string funcNameCatalog = "catalog";
    // public CatalogService(ILogger<CatalogService> logger)
    // {
    //     _logger = logger;
    // }

    public override Task<CatalogListResponse> GetListCatalog(CatalogListRequest request, ServerCallContext context)
    {
        CatalogListResponse response = new CatalogListResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<BsonDocument>(request.CatalogName);
            var builder = Builders<BsonDocument>.Filter;
            var filterDefault = builder.Empty;
            if (request.OnlyInListIds && request.InListIds != null)
            {
                filterDefault &= builder.In("_id", request.InListIds);
            }
            var filter = request.Pager != null ? request.Pager.GetFilter<BsonDocument>(filerDefault: filterDefault) : filterDefault;
            if (!string.IsNullOrEmpty(request.SearchText))
                filter &= (builder.Regex("Ten", "/.*" + request.SearchText + ".*/i") | builder.Regex("_id", "/.*" + request.SearchText + ".*/i"));
            if (request.ExtendedFields != null && request.ExtendedFields.Count > 0)
            {
                //filter &= builder.ElemMatch(x => x.Parameters, x => x.OwnerName == request.CatalogName);
                foreach (var item in request.ExtendedFields)
                {
                    if (!string.IsNullOrEmpty(item.Name))
                    {
                        filter &= builder.Eq("Parameters.Ten", item.Name);
                        if (item.IntValue != null)
                        {
                            filter &= builder.Eq("Parameters.IntValue", item.IntValue);
                        }
                        else if (item.BoolValue != null)
                        {
                            filter &= builder.Eq("Parameters.BoolValue", item.BoolValue);
                        }
                        else if (item.StringValue != null)
                        {
                            filter &= builder.Eq("Parameters.StringValue", item.StringValue);
                        }
                        else if (item.DoubleValue != null)
                        {
                            filter &= builder.Eq("Parameters.DoubleValue", item.DoubleValue);
                        }
                        else if (item.DateTimeValue != null)
                        {
                            filter &= builder.Eq("Parameters.DateTimeValue", item.DateTimeValue);
                        }
                    }
                }
            }

            IList<BsonDocument>? set = null;
            var projectionDefinitionBuilder = Builders<BsonDocument>.Projection;
            if (request.IncludeFields.Any())
            {
                IList<ProjectionDefinition<BsonDocument>> projections =
                    new List<ProjectionDefinition<BsonDocument>>();
                foreach (var requestMappingField in request.IncludeFields)
                {
                    projections.Add(projectionDefinitionBuilder.Include(requestMappingField));
                }

                var projection = projectionDefinitionBuilder.Combine(projections);
                set = collection?.Find<BsonDocument>(filter).Project(projection).SortBy(bson => bson["ThuTu"]).ToList();
            }
            else
            {
                set = collection?.Find<BsonDocument>(filter).SortBy(bson => bson["ThuTu"]).ToList();
            }

            if (set != null && set.Count > 0)
            {
                foreach (var item in set)
                {
                    Catalog? catalog = null;
                    if (request.IncludeFields.Count > 0)
                    {
                        catalog = new Catalog();
                        var idField = request.IncludeFields.FirstOrDefault();
                        if (!string.IsNullOrEmpty(idField))
                            catalog.Id = item.StringOr(idField);
                        if (request.IncludeFields.Count > 1)
                        {
                            var tenField = request.IncludeFields.Skip(1).FirstOrDefault();
                            if (!string.IsNullOrEmpty(tenField))
                                catalog.Ten = item.StringOr(tenField);
                        }
                    }
                    else
                    {
                        catalog = BsonSerializer.Deserialize<Catalog>(item);
                    }
                    if (catalog != null)
                    {
                        var parametersBson = item.ArrayOr("Parameters");
                        if (parametersBson != null)
                        {
                            var parameters = parametersBson.Documents()
                                .Select(doc => BsonSerializer.Deserialize<ExtendedField>(doc))
                                .ToArray();
                            catalog.Parameters.AddRange(parameters);
                        }
                        var tagsBson = item.ArrayOr("Tags");
                        if (tagsBson != null)
                        {
                            var tags = tagsBson.Strings().ToArray();
                            catalog.Tags.AddRange(tags);
                        }
                        response.Items.Add(catalog);
                    }
                }
                set.Clear();
            }
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return Task.FromResult(response);
    }

    public override Task<CatalogResponse> GetCatalog(CatalogRequest request, ServerCallContext context)
    {
        // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetCatalog", request, _logger);
        CatalogResponse response = new CatalogResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<BsonDocument>(request.CatalogName);
            var filter = Builders<BsonDocument>.Filter.Eq("_id", request.Id);
            var catalog = collection?.Find<BsonDocument>(filter).FirstOrDefault();

            if (catalog != null)
            {
                response.Item = BsonSerializer.Deserialize<Catalog>(catalog);
                var parametersBson = catalog.ArrayOr("Parameters");
                if (parametersBson != null)
                {
                    var parameters = parametersBson.Documents()
                        .Select(doc => BsonSerializer.Deserialize<ExtendedField>(doc))
                        .ToArray();
                    response.Item.Parameters.AddRange(parameters);
                }
                var tagsBson = catalog.ArrayOr("Tags");
                if (tagsBson != null)
                {
                    var tags = tagsBson.Strings().ToArray();
                    response.Item.Tags.AddRange(tags);
                }
            }
            //if (response.Item != null && collectionExtendField != null)
            //{
            //    var extendedFields = collectionExtendField.Find(Builders<ExtendedField>.Filter.Eq(x => x.OwnerID, response.Item.Id) & Builders<ExtendedField>.Filter.Eq(x => x.OwnerName, request.CatalogName));
            //    response.Item.Parameters.AddRange(extendedFields.ToList());
            //}
            response.Success = true;
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

    public override async Task<CatalogDeleteResponse> DeleteCatalog(CatalogRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "DeleteCatalog", request, _logger);
        var response = new CatalogDeleteResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanDelete(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            // if (checkDeleteAble.Any())
            // {
            //     response.Success = false;
            //     response.Message = string.Join(", ", checkDeleteAble);
            //     return response;
            // }
            var collection = Global.MongoDB?.GetCollection<Catalog>(request.CatalogName);
            var filter = Builders<Catalog>.Filter.Eq(x => x.Id, request.Id);
            if (collection != null)
            {
                DeleteResult deleteResult = await collection.DeleteOneAsync(filter);
                if (deleteResult.IsAcknowledged && deleteResult.DeletedCount > 0)
                {
                    // if (Global.ThamSoHeThong != null && Global.ThamSoHeThong.KichHoatMessageBroker)
                    // {
                    //     await Global.BrokerMessageAsync(new DiziMessageBrocker()
                    //     {
                    //         MessageType = "DeleteCatalog_" + request.CatalogName,
                    //         Id = request.Id
                    //     });
                    // }
                    response.Success = true;
                    response.Message = "Xóa thành công!";
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
                response.Message = "Collection null!";
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message}");
        }
        GC.Collect();
        return response;
    }

    public override async Task<SaveCatalogResponse> SaveCatalog(SaveCatalogRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveCatalog", request, _logger);
        var collection = Global.MongoDB?.GetCollection<Catalog>(request.CatalogName);
        SaveCatalogResponse response = new SaveCatalogResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanCreateOrEdit(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        response.Success = true;
        try
        {
            if (string.IsNullOrEmpty(request.Item.Id))
            {
                response.Success = false;
                response.Message = "Vui lòng nhập mã";
            }
            else
            {
                //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, $"SaveCatalog [{(request.IsNew ? "ADD" : "EDIT")}]", request);
                var filterBuilder = Builders<Catalog>.Filter;
                request.Item.Ten = Backend.Converter.Converter.Trim(request.Item.Ten);
                request.Item.VietTat = Backend.Converter.Converter.Trim(request.Item.VietTat);
                if (request.IsNew)
                {
                    var filter = filterBuilder.Eq(x => x.Id, request.Item.Id);
                    int count = collection.Find<Catalog>(filter).ToList().Count;
                    if (count > 0)
                    {
                        response.Success = false;
                        response.Message = "Đã tồn tại dữ liệu mã " + request.Item.Id;
                        return response;
                    }
                    count = collection.Find<Catalog>(filterBuilder.Eq(x => x.Ten, request.Item.Ten)).ToList().Count;
                    if (count > 0)
                    {
                        response.Success = false;
                        response.Message = "Đã tồn tại tên: " + request.Item.Ten;
                        return response;
                    }
                    request.Item.NgayTao = ProtobufTimestampConverter.GetNowTimestamp();
                    collection?.InsertOne(request.Item);
                    response.Id = request.Item.Id;
                    response.Message = "Thêm mới thành công!";
                }
                else
                {
                    var filter = filterBuilder.Eq(x => x.Id, request.OldId);
                    var updater = Builders<Catalog>.Update
                        .Set(x => x.Ten, request.Item.Ten)
                        .Set(x => x.VietTat, request.Item.VietTat)
                        .Set(x => x.NguoiSua, request.Item.NguoiSua)
                        .Set(x => x.NgaySua, ProtobufTimestampConverter.GetNowTimestamp())
                        .Set(x => x.ThuTu, request.Item.ThuTu)
                        .Set(x => x.Parameters, request.Item.Parameters)
                        .Set(x => x.Tags, request.Item.Tags);

                    if (request.OldId != request.Item.Id)
                    {
                        int count = collection.Find<Catalog>(filterBuilder.Eq(x => x.Id, request.Item.Id)).ToList().Count;
                        if (count > 0)
                        {
                            response.Success = false;
                            response.Message = "Đã tồn tại dữ liệu mã " + request.Item.Id;
                            return response;
                        }
                        count = collection.Find<Catalog>(filterBuilder.Eq(x => x.Ten, request.Item.Ten) & filterBuilder.Ne(x => x.Id, request.OldId)).ToList().Count;
                        if (count > 0)
                        {
                            response.Success = false;
                            response.Message = "Đã tồn tại tên: " + request.Item.Ten;
                            return response;
                        }
                        await collection!.DeleteOneAsync(filter);
                        request.Item.NgaySua = ProtobufTimestampConverter.GetNowTimestamp();

                        await collection!.InsertOneAsync(request.Item);
                       // Utils.UpdateRelationShip(request.CatalogName, request.OldID, request.Item.Id);
                        response.Success = true;
                        response.Message = "Cập nhật thành công!";
                    }
                    else if (collection != null)
                    {
                        int count = collection.Find<Catalog>(filterBuilder.Eq(x => x.Ten, request.Item.Ten) & filterBuilder.Ne(x => x.Id, request.OldId)).ToList().Count;
                        if (count > 0)
                        {
                            response.Success = false;
                            response.Message = "Đã tồn tại tên: " + request.Item.Ten;
                            return response;
                        }
                        UpdateResult updateResult = await collection.UpdateOneAsync(filter, updater);
                        if (updateResult.IsAcknowledged)
                        {
                            response.Success = true;
                            response.Message = "Cập nhật thành công!";
                        }
                        else
                        {
                            response.Success = false;
                            response.Message = "Cập nhật không thành công!";
                        }
                    }
                }

                // if (Global.ThamSoHeThong != null && Global.ThamSoHeThong.KichHoatMessageBroker)
                // {
                //     await Global.BrokerMessageAsync(new DiziMessageBrocker()
                //     {
                //         MessageType = "Catalog_" + request.CatalogName,
                //         Id = request.Item?.Id
                //     });
                // }
                //if (response.Success && request.Item.Parameters != null && request.Item.Parameters.Count > 0 && collectionExtendField != null)
                //{
                //    foreach (var item in request.Item.Parameters)
                //    {
                //        if (string.IsNullOrEmpty(item.Id))
                //            item.Id = ObjectId.GenerateNewId().ToString();
                //        item.OwnerName = request.CatalogName;
                //        item.OwnerID = request.Item.Id;
                //    }
                //    collectionExtendField.DeleteMany(Builders<ExtendedField>.Filter.Eq(x => x.OwnerID, request.Item.Id));
                //    collectionExtendField.InsertMany(request.Item.Parameters);
                //}
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message}");
            response.Success = false;
            response.MessageException = $"{ex.Message} [{ex.StackTrace}]";
        }
        GC.Collect();
        return response;
    }


    public override Task<CatalogResponse> GetLastCatalog(CatalogListRequest request, ServerCallContext context)
    {
       // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetLastCatalog", request, _logger);
        CatalogResponse response = new CatalogResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<Catalog>(request.CatalogName);
            var builder = Builders<Catalog>.Filter;
            var filter = builder.Empty;

            var obj = collection.Find<Catalog>(filter).SortByDescending(c => c.ThuTu).FirstOrDefault();
            response.Item = obj;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        GC.Collect();
        return Task.FromResult(response);
    }

    public override Task<CatalogResponse> GetMaxCatalog(CatalogListRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetMaxCatalog", request, _logger);
        CatalogResponse response = new CatalogResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<Catalog>(request.CatalogName);
            var builder = Builders<Catalog>.Filter;
            var filter = builder.Empty;

            var obj = collection.Find<Catalog>(filter).SortByDescending(c => c.Id).FirstOrDefault();
            response.Item = obj;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        GC.Collect();
        return Task.FromResult(response);
    }

    public override Task<CatalogTreeListResponse> GetListCatalogTree(CatalogTreeListRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetListCatalogTree", request, _logger);
        var response = new CatalogTreeListResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            if (string.IsNullOrWhiteSpace(request.CatalogName))
            {
                response.Success = false;
                response.Message = "CatalogService: Chưa thiết lập tên bảng dữ liệu!";
                return Task.FromResult(response);
            }

            var collection = Global.MongoDB?.GetCollection<BsonDocument>(request.CatalogName);
            var builder = Builders<BsonDocument>.Filter;
            var filter = builder.Empty;
            if (!string.IsNullOrEmpty(request.ParentId))
            {
                if (!request.LoadAll)
                    filter &= builder.Eq("IDCapTren", request.ParentId);
                else
                    filter &= builder.Regex("_id", "/^" + request.ParentId + ".*/i");
            }
            else if (!request.LoadAll)
                filter &= builder.Or(builder.Eq("IDCapTren", request.ParentId), builder.Eq("IDCapTren", BsonNull.Value));
            if (request.InIds.Count > 0)
                filter &= builder.In("_id", request.InIds);
            if (request.ExcludeLeaf)
                filter &= builder.Ne("CoCapDuoi", true);
            if (request.OnlyLeaf)
                filter &= builder.Eq("CoCapDuoi", false);
            if (!string.IsNullOrWhiteSpace(request.SearchText))
                filter &= builder.Regex("Ten", "/.*" + request.SearchText + ".*/i");
            //var listIDs = !request.LoadAll ? collection.Find<CatalogTree>(Builders<CatalogTree>.Filter.Regex(x => x.Id, "/^" + request.IDCapTren + ".*/i")).ToEnumerable().Select(c => c.Id) : null;
            if (request.ExtendedFields != null && request.ExtendedFields.Count > 0)
            {
                //filter &= builder.ElemMatch(x => x.Parameters, x=>x.OwnerName == "DonVi");
                foreach (var item in request.ExtendedFields)
                {
                    if (!string.IsNullOrEmpty(item.Name))
                    {
                        filter &= builder.ElemMatch("Parameters", builder.Eq("Name", item.Name));
                        if (item.IntValue != null)
                        {
                            filter &= builder.ElemMatch("Parameters", builder.Eq("IntValue", item.IntValue));
                        }
                        else if (item.BoolValue != null)
                        {
                            filter &= builder.ElemMatch("Parameters", builder.Eq("BoolValue", item.BoolValue));
                        }
                        else if (item.StringValue != null)
                        {
                            filter &= builder.ElemMatch("Parameters", builder.Eq("StringValue", item.StringValue));
                        }
                        else if (item.DoubleValue != null)
                        {
                            filter &= builder.ElemMatch("Parameters", builder.Eq("DoubleValue", item.DoubleValue));
                        }
                    }
                }
            }
            var set = collection.Find<BsonDocument>(filter).SortBy(bson => bson["ThuTuSapXep"]).ToList();
            foreach (var bson in set)
            {
                var catalogTree = BsonSerializer.Deserialize<CatalogTree>(bson);
                response.Items.Add(catalogTree);
                var parametersBson = bson.ArrayOr("Parameters");
                if (parametersBson != null)
                {
                    var parameters = parametersBson.Documents()
                        .Select(doc => BsonSerializer.Deserialize<ExtendedField>(doc))
                        .ToArray();
                    catalogTree.Parameters.AddRange(parameters);
                }
                var tagsBson = bson.ArrayOr("Tags");
                if (tagsBson != null)
                {
                    var tags = tagsBson.Strings().ToArray();
                    catalogTree.Tags.AddRange(tags);
                }
            }

            // if (request.CatalogName == "HanhChinh")
            // {
            //     var dict = response.Items.ToDictionary(c => c.Id, c => c);
            //     foreach (var catalogTree in dict)
            //     {
            //         catalogTree.Value.TenDayDu = catalogTree.Value.Ten;
            //         var parentId = catalogTree.Value.IDCapTren;
            //         while (!string.IsNullOrEmpty(parentId) && dict.TryGetValue(parentId, out var parent))
            //         {
            //             catalogTree.Value.TenDayDu = catalogTree.Value.TenDayDu + ", " + parent.Ten;
            //             parentId = parent.IDCapTren;
            //         }
            //         var collectionTree = Global.MongoDB?.GetCollection<CatalogTree>(request.CatalogName);
            //         collectionTree?.UpdateOne(Builders<CatalogTree>.Filter.Eq(x=>x.Id, catalogTree.Value.Id), 
            //             Builders<CatalogTree>.Update.Set(x=>x.TenDayDu, catalogTree.Value.TenDayDu));
            //     }
            // }
            logger.LogInformation("GetCatalogTreeList: " + response.Items.Count + " items");
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        GC.Collect();
        return Task.FromResult(response);
    }

    public override Task<CatalogTreeResponse> GetLastCatalogTree(CatalogTreeListRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetLastCatalogTree", request, _logger);
        CatalogTreeResponse response = new CatalogTreeResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<CatalogTree>(request.CatalogName);
            var builder = Builders<CatalogTree>.Filter;
            var filter = builder.Empty;
            if (!string.IsNullOrEmpty(request.ParentId))
            {
                filter &= builder.Eq(x => x.IdCapTren, request.ParentId);
            }
            else
                filter &= builder.Or(builder.Eq(x => x.IdCapTren, null), builder.Eq(x => x.IdCapTren, string.Empty));
            var obj = collection.Find<CatalogTree>(filter).SortByDescending(c => c.ThuTu).FirstOrDefault();
            response.Item = obj;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        GC.Collect();
        return Task.FromResult(response);
    }
    public override Task<CatalogTreeResponse> GetMaxCatalogTree(CatalogTreeListRequest request, ServerCallContext context)
    {
       // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetMaxCatalogTree", request, _logger);
        CatalogTreeResponse response = new CatalogTreeResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<CatalogTree>(request.CatalogName);
            var builder = Builders<CatalogTree>.Filter;
            var filter = builder.Empty;
            if (!string.IsNullOrEmpty(request.ParentId))
            {
                filter &= builder.Eq(x => x.IdCapTren, request.ParentId);
            }
            else
                filter &= builder.Or(builder.Eq(x => x.IdCapTren, null), builder.Eq(x => x.IdCapTren, string.Empty));
            var obj = collection.Find<CatalogTree>(filter).SortByDescending(c => c.Id).FirstOrDefault();
            response.Item = obj;
            response.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        GC.Collect();
        return Task.FromResult(response);
    }

    public override Task<CatalogTreeResponse> GetCatalogTree(CatalogTreeRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "GetCatalogTree", request, _logger);
        CatalogTreeResponse response = new CatalogTreeResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanView(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<BsonDocument>(request.CatalogName);
            var filter = Builders<BsonDocument>.Filter.Eq("_id", request.Id);
            var catalog = collection.Find<BsonDocument>(filter).FirstOrDefault();
            if (catalog != null)
            {
                response.Item = BsonSerializer.Deserialize<CatalogTree>(catalog);
                var parametersBson = catalog.ArrayOr("Parameters");
                if (parametersBson != null)
                {
                    var parameters = parametersBson.Documents()
                        .Select(doc => BsonSerializer.Deserialize<ExtendedField>(doc))
                        .ToArray();
                    response.Item.Parameters.AddRange(parameters);
                }
                var tagsBson = catalog.ArrayOr("Tags");
                if (tagsBson != null)
                {
                    var tags = tagsBson.Strings().ToArray();
                    response.Item.Tags.AddRange(tags);
                }
            }
            response.Success = true;
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

    public override async Task<CatalogTreeDeleteResponse> DeleteCatalogTree(CatalogTreeRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "DeleteCatalogTree", request, _logger);
        CatalogTreeDeleteResponse response = new CatalogTreeDeleteResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanDelete(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<CatalogTree>(request.CatalogName);
            if (collection != null)
            {
               // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, $"DeleteCatalogTree", request);
                var filter = Builders<CatalogTree>.Filter.Regex(x => x.Id, "/^" + request.Id + ".*/i");
                var existing = collection.Find(filter).FirstOrDefault();
                string? parentID = existing?.IdCapTren;
                // var checkDeleteAble = Utils.CheckDeleteAble(request.CatalogName, request.Id);
                // if (checkDeleteAble != null && checkDeleteAble.Any())
                // {
                //     response.Success = false;
                //     response.Message = string.Join(", ", checkDeleteAble);
                //     return response;
                // }
                DeleteResult deleteResult = await collection.DeleteManyAsync(filter);
                if (deleteResult.IsAcknowledged && deleteResult.DeletedCount > 0)
                {
                    if (!string.IsNullOrEmpty(parentID))
                    {
                        var filterParent = Builders<CatalogTree>.Filter.Eq(x => x.IdCapTren, parentID);
                        var countChild = collection.Find(filterParent).CountDocuments();
                        collection.UpdateOne(Builders<CatalogTree>.Filter.Eq(x => x.Id, parentID),
                            Builders<CatalogTree>.Update.Set(x => x.CoCapDuoi, countChild > 0));
                    }
                    // if (Global.ThamSoHeThong != null && Global.ThamSoHeThong.KichHoatMessageBroker)
                    // {
                    //     await Global.BrokerMessageAsync(new DiziMessageBrocker()
                    //     {
                    //         MessageType = "DeleteCatalog_" + request.CatalogName,
                    //         Id = request.Id
                    //     });
                    // }
                    response.Success = true;
                    response.Message = "Xóa thành công!";
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

    public override async Task<SaveCatalogTreeResponse> SaveCatalogTree(SaveCatalogTreeRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveCatalogTree", request, _logger);
        SaveCatalogTreeResponse response = new SaveCatalogTreeResponse();
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanCreateOrEdit(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        // response.Success = true;
        try
        {
            var collection = Global.MongoDB?.GetCollection<CatalogTree>(request.CatalogName);
            if (collection != null)
            {
                var parent = collection.Find<CatalogTree>(Builders<CatalogTree>.Filter.Eq(x => x.Id, request.Item.IdCapTren)).FirstOrDefault();
                var reorder = false;
                if (request.IsNew)
                {
                    var filter = Builders<CatalogTree>.Filter.Eq(x => x.Id, request.Item.Id);
                    var count = collection.Find<CatalogTree>(filter).ToList().Count;
                    if (count > 0)
                    {
                        response.Success = false;
                        response.Message = "Đã tồn tại dữ liệu mã " + request.Item.Id;
                        return response;
                    }
                    var newID = request.Item.Id;
                    var newId = 0;
                    if (request.Item.Id.Contains("*"))
                    {
                        var filterMax = Builders<CatalogTree>.Filter.Eq(x => x.IdCapTren, request.Item.IdCapTren);
                        var officeMax = collection.Find<CatalogTree>(filterMax).SortByDescending(x => x.Id).Limit(1).FirstOrDefault();

                        if (officeMax != null)
                        {
                            newId = Backend.Converter.Converter.ToInt(officeMax.Id.Substring((request.Item.IdCapTren + "").Length));
                            newId++;
                            if (newId > 99)
                            {
                                response.Success = false;
                                response.Message = "Quá giá trị mã cho phép là 99";
                                return response;
                            }
                        }
                        else
                        {
                            newId++;
                        }
                        newID = request.Item.IdCapTren + newId.ToString().PadLeft(request.LevelLength, '0');
                        reorder = true;
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.Item.IdCapTren))
                        {
                            if (!newID.StartsWith(request.Item.IdCapTren + ""))
                            {
                                response.Success = false;
                                response.Message = "Mã số không bắt đầu bằng: " + request.Item.IdCapTren;
                                return response;
                            }
                            var last = newID.Substring(request.Item.IdCapTren.Length);
                            if (last.Length != request.LevelLength)
                            {
                                response.Success = false;
                                response.Message = "Độ dài mã không hợp lệ!";
                                return response;
                            }
                            if (Backend.Converter.Converter.ToInt(last) == 0)
                            {
                                response.Success = false;
                                response.Message = request.LevelLength + " số cuối mã không hợp lệ!";
                                return response;
                            }
                        }
                    }
                    string ordering = parent != null ? parent.ThuTuSapXep : "";
                    if (request.Item.ThuTu == 0)
                        request.Item.ThuTu = newId;
                    ordering = ordering + request.Item.ThuTu.ToString().PadLeft(request.LevelLength, '0');
                    request.Item.Id = newID;
                    request.Item.ThuTuSapXep = ordering;
                    request.Item.TenDayDu = request.Item.Ten + (!string.IsNullOrEmpty(parent?.TenDayDu) ? ", " + parent?.TenDayDu : "");
                    await collection.InsertOneAsync(request.Item);
                    var updater = Builders<CatalogTree>.Update.Set(x => x.CoCapDuoi, true);
                    await collection.UpdateOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, request.Item.IdCapTren), updater);
                    response.Id = request.Item.Id;
                    response.Message = "Thêm mới thành công!";
                    //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveCatalogTree [ADD]", request);
                }
                else
                {
                    bool changeParent = false;
                    var existing = collection.Find(Builders<CatalogTree>.Filter.Eq(x => x.Id, request.OldId)).FirstOrDefault();
                    if (existing != null && existing.IdCapTren != request.Item.IdCapTren || !string.IsNullOrEmpty(request.Item.IdCapTren) && !request.Item.Id.StartsWith(request.Item.IdCapTren))
                        changeParent = true;
                    if (existing != null && existing.ThuTu != request.Item.ThuTu)
                        reorder = true;

                    var listChild = collection.Find(Builders<CatalogTree>.Filter.Regex(x => x.IdCapTren, "/^" + request.OldId + ".*/i")).SortBy(c => c.Id).ToList();
                    if (changeParent)
                    {
                        var oldParentID = existing?.IdCapTren;
                        var filterMax = Builders<CatalogTree>.Filter.Eq(x => x.IdCapTren, request.Item.IdCapTren);
                        var listID = collection.Find<CatalogTree>(filterMax).ToList().Select(c => c.Id.Substring((request.Item.IdCapTren + "").Length).PadLeft(request.LevelLength, '0')).OrderBy(c => c);
                        var officeMax = listID.MaxBy(x => x);
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
                        var max = collection.Find<CatalogTree>(filterMax).SortByDescending(x => x.ThuTu).FirstOrDefault();

                        var deleteResult = await collection.DeleteOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, request.OldId));
                        if (deleteResult.IsAcknowledged && deleteResult.DeletedCount > 0)
                        {
                            var oldId = request.Item.Id;

                            request.Item.Id = request.Item.IdCapTren + newId.ToString().PadLeft(request.LevelLength, '0');
                            request.Item.TenDayDu = request.Item.Ten + (!string.IsNullOrEmpty(parent?.TenDayDu) ? ", " + parent?.TenDayDu : "");
                            request.Item.ThuTu = max != null ? max.ThuTu + 1 : 1;
                            request.Item.ThuTuSapXep = parent?.ThuTuSapXep + request.Item.ThuTu.ToString().PadLeft(request.LevelLength, '0');
                            request.Item.NgaySua = ProtobufTimestampConverter.GetNowTimestamp();
                            request.Item.CoCapDuoi = listChild.Count > 0;
                            await collection.InsertOneAsync(request.Item);
                            var updater = Builders<CatalogTree>.Update.Set(x => x.CoCapDuoi, true);
                            await collection.UpdateOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, request.Item.IdCapTren), updater);
                           // Utils.UpdateRelationShip(request.CatalogName, oldId, request.Item.Id);
                            if (listChild.Count > 0)
                            {
                                foreach (var child in listChild)
                                {
                                    if (child != null)
                                    {
                                        deleteResult = await collection.DeleteOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, child.Id));
                                        if (deleteResult.IsAcknowledged && deleteResult.DeletedCount > 0)
                                        {
                                            oldId = child.Id;
                                            child.CoCapDuoi = listChild.Any(c => c.IdCapTren == oldId);
                                            child.Id = child.Id.Replace(existing?.Id + "", request.Item?.Id + "");
                                            child.IdCapTren = child.IdCapTren.Replace(existing?.Id + "", request.Item?.Id + "");

                                            var parentOfChild = listChild.FirstOrDefault(c => c.Id == child.IdCapTren);
                                            if (parentOfChild == null)
                                                parentOfChild = request.Item;
                                            child.ThuTuSapXep = parentOfChild?.ThuTuSapXep + child.ThuTu.ToString().PadLeft(request.LevelLength, '0');
                                            child.NgaySua = ProtobufTimestampConverter.GetNowTimestamp();
                                            await collection.InsertOneAsync(child);
                                        }
                                    }
                                }
                            }
                        }

                        var countChildOfOldParent = await collection.Find(Builders<CatalogTree>.Filter.Eq(x => x.IdCapTren, oldParentID)).CountDocumentsAsync();
                        await collection.UpdateOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, oldParentID),
                            Builders<CatalogTree>.Update.Set(x => x.CoCapDuoi, countChildOfOldParent > 0));
                       // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveCatalogTree [ChangeParent]", request);
                        response.Id = request.Item?.Id;
                        response.Message = "Cập nhật thành công!";
                    }
                    else
                    {
                        var ordering = parent != null ? parent.ThuTuSapXep : "";
                        if (request.Item.ThuTu == 0)
                        {
                            var filterMax = Builders<CatalogTree>.Filter.Eq(x => x.IdCapTren, request.Item.IdCapTren);
                            var officeMax = collection.Find<CatalogTree>(filterMax).SortByDescending(x => x.Id).Limit(1).FirstOrDefault();
                            if (officeMax != null)
                                request.Item.ThuTu = officeMax.ThuTu + 1;
                            else
                                request.Item.ThuTu = 1;
                        }

                        ordering = ordering + request.Item.ThuTu.ToString().PadLeft(request.LevelLength, '0');
                        request.Item.ThuTuSapXep = ordering;
                        var filter = Builders<CatalogTree>.Filter.Eq(x => x.Id, request.OldId);
                        var updater = Builders<CatalogTree>.Update
                            .Set(x => x.Ten, request.Item.Ten)
                            .Set(x => x.TenIn, request.Item.TenIn)
                            .Set(x => x.ThuTu, request.Item.ThuTu)
                            .Set(x => x.ThuTuSapXep, request.Item.ThuTuSapXep)
                            .Set(x => x.TenDayDu, request.Item.Ten + (!string.IsNullOrEmpty(parent?.TenDayDu) ? ", " + parent?.TenDayDu : ""))
                            .Set(x => x.IdCapTren, request.Item.IdCapTren)
                            .Set(x => x.CoCapDuoi, listChild?.Count > 0)
                            .Set(x => x.Parameters, request.Item.Parameters)
                            .Set(x => x.Tags, request.Item.Tags);


                        if (request.OldId != request.Item.Id)
                        {
                            await collection.DeleteOneAsync(filter);
                            request.Item.TenDayDu = request.Item.Ten + (!string.IsNullOrEmpty(parent?.TenDayDu) ? ", " + parent?.TenDayDu : "");
                            request.Item.ThuTuSapXep = ordering;
                            await collection.InsertOneAsync(request.Item);
                           // Utils.UpdateRelationShip(request.CatalogName, request.OldID, request.Item.Id);
                            response.Success = true;
                            response.Message = "Cập nhật thành công!";
                           // context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveCatalogTree [ChangeID]", request);
                        }
                        else
                        {
                            var updateResult = await collection.UpdateOneAsync(filter, updater);
                            if (updateResult.IsAcknowledged)
                            {
                                response.Success = true;
                                response.Message = "Cập nhật thành công!";
                            //    context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveCatalogTree [EDIT]", request);
                            }
                            else
                            {
                                response.Success = false;
                                response.Message = "Cập nhật không thành công!";
                            }
                        }
                    }
                }

                if (reorder && request.Item != null)
                {
                    var listChild = collection.Find(Builders<CatalogTree>.Filter.Regex(x => x.IdCapTren, "/^" + request.Item.Id + ".*/i")).SortBy(c => c.Id).ToList();
                    if (listChild.Count > 0)
                    {
                        foreach (var child in listChild)
                        {
                            if (child != null)
                            {
                                var parentOfChild = listChild.FirstOrDefault(c => c.Id == child.IdCapTren);
                                var virtualOrdering = (parentOfChild != null ? parentOfChild.ThuTuSapXep : request.Item.ThuTuSapXep) + child.ThuTu.ToString().PadLeft(request.LevelLength, '0');
                                var update = Builders<CatalogTree>.Update.Set(x => x.ThuTuSapXep, virtualOrdering);
                                await collection.UpdateOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, child.Id), update);
                            }
                        }
                    }
                    var listSampeParent = collection.Find(
                        Builders<CatalogTree>.Filter.Gte(x => x.ThuTu, request.Item.ThuTu) &
                        Builders<CatalogTree>.Filter.Ne(x => x.Id, request.Item.Id) &
                        Builders<CatalogTree>.Filter.Eq(x => x.IdCapTren, request.Item.IdCapTren)).SortBy(c => c.ThuTu).ToList();
                    if (listSampeParent.Count > 0)
                    {
                        var ordering = request.Item.ThuTu;
                        foreach (var item in listSampeParent)
                        {
                            if (item != null)
                            {
                                ordering++;
                                var virtualOrdering = item.ThuTuSapXep.Substring(0, item.ThuTuSapXep.Length - request.LevelLength) + ordering.ToString().PadLeft(request.LevelLength, '0');
                                var update = Builders<CatalogTree>.Update
                                .Set(x => x.ThuTuSapXep, virtualOrdering)
                                .Set(x => x.ThuTu, ordering);
                                await collection.UpdateOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, item.Id), update);

                                var listChild2 = collection.Find(Builders<CatalogTree>.Filter.Regex(x => x.IdCapTren, "/^" + item.Id + ".*/i")).SortBy(c => c.ThuTu).ToList();
                                foreach (var child in listChild2)
                                {
                                    var order = child.ThuTuSapXep.Substring(virtualOrdering.Length);
                                    var updateChild = Builders<CatalogTree>.Update
                                        .Set(x => x.ThuTuSapXep, virtualOrdering + order);
                                    await collection.UpdateOneAsync(Builders<CatalogTree>.Filter.Eq(x => x.Id, child.Id), updateChild);
                                }
                            }
                        }
                    }
                }
                // if (Global.ThamSoHeThong != null && Global.ThamSoHeThong.KichHoatMessageBroker)
                // {
                //     await Global.BrokerMessageAsync(new DiziMessageBrocker()
                //     {
                //         MessageType = "Catalog_" + request.CatalogName,
                //         Id = request.Item?.Id
                //     });
                // }
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message}");
            response.Success = false;
            response.Message = $"Lỗi: {ex.Message}!";
            response.MessageException = $"{ex.Message} [{ex.StackTrace}]";
        }
        GC.Collect();
        return response;
    }

    public override Task<SaveCatalogTreeResponse> ReorderCatalogTree(ReorderCatalogTreeRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "ReorderCatalogTree", request, _logger);
        var response = new SaveCatalogTreeResponse() { Success = true };
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanCreateOrEdit(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var collection = Global.MongoDB?.GetCollection<CatalogTree>(request.CatalogName);
            if (collection != null)
            {
                var officeOrdering = collection.Find(x => x.Id == request.Id).FirstOrDefault();
                if (officeOrdering != null)
                {
                    var currentOrdering = officeOrdering.ThuTu;
                    var parent = collection.Find(x => x.Id == officeOrdering.IdCapTren).FirstOrDefault();
                    var currentVirtualOrdering = "";
                    if (request.IsUp)
                    {
                        var sort = Builders<CatalogTree>.Sort.Descending(x => x.ThuTu);
                        var officeTarget = collection
                            .Find(x => x.IdCapTren == officeOrdering.IdCapTren && x.ThuTu < currentOrdering).Sort(sort)
                            .FirstOrDefault();
                        if (officeTarget != null)
                        {
                            currentVirtualOrdering =
                                parent?.ThuTuSapXep + officeTarget.ThuTu.ToString().PadLeft(request.LevelLength, '0');
                            var targetOrdering =
                                parent?.ThuTuSapXep + currentOrdering.ToString().PadLeft(request.LevelLength, '0');
                            var updateOrdering = Builders<CatalogTree>.Update
                                .Set(x => x.ThuTu, officeTarget.ThuTu)
                                .Set(x => x.ThuTuSapXep, currentVirtualOrdering);
                            var updateTarget = Builders<CatalogTree>.Update
                                .Set(x => x.ThuTu, currentOrdering)
                                .Set(x => x.ThuTuSapXep, targetOrdering);
                            collection.UpdateOne(x => x.Id == officeOrdering.Id, updateOrdering);
                            collection.UpdateOne(x => x.Id == officeTarget.Id, updateTarget);
                            var childs = collection
                                .Find(Builders<CatalogTree>.Filter.Regex(x => x.IdCapTren,
                                    "/^" + officeTarget.Id + ".*/i"))
                                .Sort(Builders<CatalogTree>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                            if (childs != null)
                            {
                                foreach (var child in childs)
                                {
                                    var ordering = child.ThuTuSapXep;
                                    ordering = targetOrdering +
                                               ordering.Substring(officeTarget.ThuTuSapXep.Length);
                                    updateTarget = Builders<CatalogTree>.Update
                                        .Set(x => x.ThuTuSapXep, ordering);
                                    collection.UpdateOne(x => x.Id == child.Id, updateTarget);
                                }
                            }
                            response.Success = true;
                        }
                    }
                    else
                    {
                        var sort = Builders<CatalogTree>.Sort.Ascending(x => x.ThuTu);
                        var officeTarget = collection
                            .Find(x => x.IdCapTren == officeOrdering.IdCapTren && x.ThuTu > currentOrdering).Sort(sort)
                            .FirstOrDefault();
                        var targetOrdering =
                            parent?.ThuTuSapXep + currentOrdering.ToString().PadLeft(request.LevelLength, '0');
                        if (officeTarget != null)
                        {
                            currentVirtualOrdering =
                                parent?.ThuTuSapXep + officeTarget.ThuTu.ToString().PadLeft(request.LevelLength, '0');
                            var updateOrdering = Builders<CatalogTree>.Update
                                .Set(x => x.ThuTu, officeTarget.ThuTu)
                                .Set(x => x.ThuTuSapXep, currentVirtualOrdering);
                            var updateTarget = Builders<CatalogTree>.Update
                                .Set(x => x.ThuTu, currentOrdering)
                                .Set(x => x.ThuTuSapXep, targetOrdering);
                            collection.UpdateOne(x => x.Id == officeOrdering.Id, updateOrdering);
                            collection.UpdateOne(x => x.Id == officeTarget.Id, updateTarget);
                            var childs = collection
                                .Find(Builders<CatalogTree>.Filter.Regex(x => x.IdCapTren,
                                    "/^" + officeTarget.Id + ".*/i"))
                                .Sort(Builders<CatalogTree>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                            if (childs != null)
                            {
                                foreach (var child in childs)
                                {
                                    var ordering = child.ThuTuSapXep;
                                    ordering = targetOrdering +
                                               ordering.Substring(officeTarget.ThuTuSapXep.Length);
                                    updateTarget = Builders<CatalogTree>.Update
                                        .Set(x => x.ThuTuSapXep, ordering);
                                    collection.UpdateOne(x => x.Id == child.Id, updateTarget);
                                }
                            }
                            response.Success = true;
                        }
                    }
                    var childsOfOrdering = collection
                        .Find(Builders<CatalogTree>.Filter.Regex(x => x.IdCapTren,
                            "/^" + officeOrdering.Id + ".*/i"))
                        .Sort(Builders<CatalogTree>.Sort.Ascending(x => x.ThuTuSapXep)).ToList();
                    if (childsOfOrdering != null)
                    {
                        foreach (var child in childsOfOrdering)
                        {
                            var ordering = child.ThuTuSapXep;
                            ordering = currentVirtualOrdering +
                                       ordering.Substring(officeOrdering.ThuTuSapXep.Length);
                            var updateTarget = Builders<CatalogTree>.Update
                                .Set(x => x.ThuTuSapXep, ordering);
                            collection.UpdateOne(x => x.Id == child.Id, updateTarget);
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
        return Task.FromResult(response);
    }

    public override Task<UploadCatalogFromExcelResponse> UploadCatalogFromExcel(UploadCatalogFromExcelRequest request, ServerCallContext context)
    {
        //context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "UploadCatalogFromExcel", request, _logger);
        var response = new UploadCatalogFromExcelResponse() { Success = true };
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanCreateOrEdit(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            var fileItem = request.Items.FirstOrDefault();
            if (fileItem != null)
            {
                var ext = System.IO.Path.GetExtension(fileItem.FileName);
                var stream = new MemoryStream(fileItem.Data.ToArray());
                if (stream.CanSeek)
                {
                    stream.Position = 0;
                    ISheet? sheet = null;
                    if (ext.ToLower().EndsWith("xlsx") || ext.ToLower().EndsWith("xlsm"))
                    {
                        var xssfwb = new XSSFWorkbook(stream);
                        sheet = xssfwb.GetSheetAt(0);
                    }
                    else
                    {
                        var hssfwb = new NPOI.HSSF.UserModel.HSSFWorkbook(stream);
                        sheet = hssfwb.GetSheetAt(0);
                    }

                    if (sheet != null)
                    {
                        for (var i = 1; i < sheet.LastRowNum; i++)
                        {
                            var row = sheet.GetRow(i);
                            if (row != null)
                            {
                                var id = row.GetCell(0) + string.Empty;
                                var name = row.GetCell(1) + string.Empty;
                                if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(name))
                                    continue;
                                response.Items.Add(new Catalog()
                                {
                                    Id = id,
                                    Ten = name,
                                    ThuTu = response.Items.Count + 1
                                });
                            }
                        }
                    }

                }
                else
                {
                    response.Success = false;
                    response.Message = "Không tìm thấy Sheets1!";
                }
            }
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.MessageException = $"{ex.Message} [{ex.StackTrace}]";
            //context.LogError(ex);
        }
        return Task.FromResult(response);
    }

    public override Task<SaveCatalogFromExcelResponse> SaveCatalogFromExcel(SaveCatalogFromExcelRequest request, ServerCallContext context)
    {
      //  context.WriteLog(DiziApp.Shared.Models.Core.Global.ApplicationName, "SaveCatalogFromExcel", request, _logger);
        var response = new SaveCatalogFromExcelResponse() { Success = true };
        // if (!string.IsNullOrEmpty(context.GetUserID()) && !context.CanCreateOrEdit(funcName: funcNameCatalog))
        // {
        //     response.Success = false;
        //     response.Message = Language.NotAuthorized;
        //     throw new RpcException(new Status(StatusCode.Unauthenticated, Language.NotAuthorized));
        // }
        try
        {
            if (string.IsNullOrEmpty(request.CatalogName))
            {
                response.Success = false;
                response.Message = "Chưa thiết lập tên danh mục!";
                return Task.FromResult(response);
            }

            var collection = Global.MongoDB?.GetCollection<Catalog>(request.CatalogName);
            if (collection == null)
            {
                response.Success = false;
                response.Message = $"Không khởi tạo được collection {request.CatalogName}!";
                return Task.FromResult(response);
            }
            foreach (var item in request.Items)
            {
                var filter = Builders<Catalog>.Filter.Eq(x => x.Id, item.Id);
                var existing = collection.Find(filter).FirstOrDefault();
                if (existing == null)
                {
                    collection.InsertOne(item);
                }
                else
                {
                    var update = Builders<Catalog>.Update.Set(x => x.Ten, item.Ten);
                    collection.UpdateOne(filter, update);
                }
            }
            response.Success = true;
            response.Message = "Nhập dữ liệu thành công!";
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.Message = "Nhập dữ liệu không thành công!";
            response.MessageException = $"{ex.Message} [{ex.StackTrace}]";
          //  context.LogError(ex);
        }
        return Task.FromResult(response);
    }
}
