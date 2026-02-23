using System.Text.RegularExpressions;
using Backend.utils;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;

using Google.Protobuf.WellKnownTypes;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;


using protos;

namespace Backend.Services;

public class EmployeeServiceImpl(ILogger<EmployeeServiceImpl> logger, IWebHostEnvironment environment) :
   EmployeeService.EmployeeServiceBase
{


     [Authorize]
    public override async Task<GetListEmployeesResponse> GetListEmployees(GetListEmployeesRequest request,
        ServerCallContext context)
    {
        var response = new GetListEmployeesResponse();

        try
        {
            var builder = Builders<BsonDocument>.Filter;
            var defaultFilter = builder.Ne(x => x["Delete"], true);

            FilterDefinition<BsonDocument> filter = defaultFilter;
            int skip = 0;
            int limit = 100;


            // Build filter from SearchItem.Employee
            if (request.SearchItem != null && request.SearchItem.Employee != null)
            {
                var filters = new List<FilterDefinition<BsonDocument>> { defaultFilter };
                var searchEmployee = request.SearchItem.Employee;

                // Filter by IdCapBac (Cấp bậc)
                if (!string.IsNullOrEmpty(searchEmployee.IdCapBac))
                {
                    filters.Add(builder.Eq("IdCapBac", searchEmployee.IdCapBac));
                    logger.LogInformation($"Filter by IdCapBac: {searchEmployee.IdCapBac}");
                }

                // Filter by ChucVu (Chức vụ) - case insensitive partial match
                if (!string.IsNullOrEmpty(searchEmployee.ChucVu))
                {
                    var chucVuFilter = builder.Regex("ChucVu",
                        new BsonRegularExpression(searchEmployee.ChucVu, "i"));
                    filters.Add(chucVuFilter);
                    logger.LogInformation($"Filter by ChucVu: {searchEmployee.ChucVu}");
                }

                // Filter by IdDonVi (Đơn vị) - tìm tất cả đơn vị con (startsWith)
                if (!string.IsNullOrEmpty(searchEmployee.IdDonVi))
                {
                    // Escape đặc biệt characters trong regex và thêm ^ để match từ đầu
                    var escapedId = Regex.Escape(searchEmployee.IdDonVi);
                    filters.Add(builder.Regex("IdDonVi", new BsonRegularExpression($"^{escapedId}", "i")));
                    logger.LogInformation($"Filter by IdDonVi (startsWith): {searchEmployee.IdDonVi}");
                }

                // Filter by IdQuanTriDonVi (Đơn vị quản trị) - tìm tất cả đơn vị con (startsWith)
                if (!string.IsNullOrEmpty(searchEmployee.IdQuanTriDonVi))
                {
                    // Escape đặc biệt characters trong regex và thêm ^ để match từ đầu
                    var escapedId = Regex.Escape(searchEmployee.IdQuanTriDonVi);
                    filters.Add(builder.Regex("IdQuanTriDonVi", new BsonRegularExpression($"^{escapedId}", "i")));
                    logger.LogInformation($"Filter by IdQuanTriDonVi (startsWith): {searchEmployee.IdQuanTriDonVi}");
                }

                // Filter by search text (HoVaTen, Email, DienThoai)
                if (!string.IsNullOrEmpty(searchEmployee.HoVaTen))
                {
                    var searchTextFilters = builder.Or(
                        builder.Regex("HoVaTen", new BsonRegularExpression(searchEmployee.HoVaTen, "i")),
                        builder.Regex("Email", new BsonRegularExpression(searchEmployee.HoVaTen, "i")),
                        builder.Regex("DienThoai", new BsonRegularExpression(searchEmployee.HoVaTen, "i")),
                        builder.Regex("TenTaiKhoan", new BsonRegularExpression(searchEmployee.HoVaTen, "i"))
                    );
                    filters.Add(searchTextFilters);
                    logger.LogInformation($"Filter by search text: {searchEmployee.HoVaTen}");
                }

                // Combine all filters với AND
                filter = builder.And(filters);
            }

            // Apply additional SearchText filter if provided
            if (!string.IsNullOrEmpty(request.SearchItem?.SearchText))
            {
                var kw = Regex.Escape(request.SearchItem.SearchText);
                var textFilter = builder.Or(
                    builder.Regex("IdCapBac", new BsonRegularExpression(kw, "i")),
                    builder.Regex("ChucVu", new BsonRegularExpression(kw, "i")),
                    builder.Regex("IdDonVi", new BsonRegularExpression(kw, "i")),
                    builder.Regex("IdQuanTriDonVi", new BsonRegularExpression(kw, "i")),
                    builder.Regex("HoVaTen", new BsonRegularExpression(kw, "i")),
                    builder.Regex("Email", new BsonRegularExpression(kw, "i")),
                    builder.Regex("DienThoai", new BsonRegularExpression(kw, "i"))
                );

                filter = builder.And(filter, textFilter);
                logger.LogInformation($"Additional SearchText filter: {request.SearchItem.SearchText}");
            }

            if (request.SearchItem != null)
            {
                //filter = request.SearchItem.PagerSettings?.GetFilter(filerDefault: defaultFilter) ?? defaultFilter;
                skip = (request.SearchItem.PagerSettings?.Index ?? 0) * (request.SearchItem.PagerSettings?.Size ?? 100);
                limit = request.SearchItem.PagerSettings.Size ;
            }
            // else
            // {
            //     // No search params - return all items with default filter
            //     filter = defaultFilter;
            // }

            var bsonItems = await Global.CollectionBsonEmployee.Find(filter)
                .Skip(skip)
                .Limit(limit)
                .ToListAsync();

            var total = await Global.CollectionBsonEmployee.Find(filter).CountDocumentsAsync();

            logger.LogInformation($"Found {bsonItems.Count} documents, starting deserialization...");

            response.Items.AddRange(bsonItems.Select(itemBson =>
            {
                try
                {
                    var module = BsonSerializer.Deserialize<Employee>(itemBson);
                    return module;
                }
                catch (Exception ex)
                {
                    logger.LogError($"Failed to deserialize Employee document ID: {itemBson.GetValue("_id", "unknown")}");
                    logger.LogError($"Error: {ex.Message}");
                    return null;
                }
            }).Where(x => x != null));

            logger.LogInformation($"Successfully deserialized {response.Items.Count} out of {bsonItems.Count} documents");

            if (request.SearchItem?.PagerSettings != null)
            {
                response.PagerSettings = request.SearchItem.PagerSettings;
                response.PagerSettings.Total = (int)total;
            }
            else
            {
                response.PagerSettings = new PagerSettings
                {
                    Index = 0,
                    Size = limit,
                    Total = (int)total
                };
            }

            response.Success = true;
            logger.LogInformation($"=== END GetListEmployee: {response.Items.Count} items ===");
        }
        catch (Exception ex)
        {
            logger.LogError($"ERROR in GetListEmployee: {ex.Message}");
            logger.LogError($"StackTrace: {ex.StackTrace}");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return response;
    }


    // public override Task<GetListNewsResponse> GetListPubicNews(GetListNewsRequest request,
    //     ServerCallContext context)
    // {
    //     request.SearchItem.PagerSettings.Filters.Add(new FilterDescriptor()
    //     {
    //         Property = nameof(News.Status),
    //         FilterOperator = FilterOperator.Equals,
    //         FilterValue = new ObjectValue()
    //         {
    //             Int32Value = (int)Status.On
    //         }
    //     });
    //     // var accessLevel = context.GetUserAccessLevel();
    //     // if (DiziApp.Shared.Server.Global.ThamSoHeThong?.MucTruyCap.Any() == true)
    //     // {
    //     //     request.SearchItem.PagerSettings.Filters.Add(new FilterDescriptor()
    //     //     {
    //     //         Property = nameof(News.AccessLevel),
    //     //         FilterOperator = FilterOperator.LessThanOrEquals,
    //     //         FilterValue = new ObjectValue() { Int32Value = accessLevel ?? 0 }
    //     //     });
    //     // }
    //     return GetListNews(request, context);
    // }


     [Authorize]
    public override async Task<GetEmployeeResponse> GetEmployee(GetEmployeeRequest request, ServerCallContext context)
    {

        var response = new GetEmployeeResponse();

        try
        {
            if (request.Id == null || string.IsNullOrEmpty(request.Id))
            {
                response.Success = false;
                response.Message = "ID không được để trống";
                return await Task.FromResult(response);
            }
            var builder = Builders<BsonDocument>.Filter;

            var filter = Builders<BsonDocument>.Filter.Eq(x => x["_id"], request.Id) &
                         Builders<BsonDocument>.Filter.Ne(x => x["Delete"], true);

            // var accessLevel = context.GetUserAccessLevel();
            // if (accessLevel.HasValue)
            // {
            //     filter &= builder.Lte("AccessLevel", accessLevel.Value);
            // }
            // else
            // {
            //     // no login -> chỉ xem public (level 0)
            //     filter &= builder.Lte("AccessLevel", 0);
            // }

            var itemBson = Global.CollectionBsonEmployee.Find(filter).FirstOrDefault();

            if (itemBson == null)
            {
                response.Success = false;
                response.Message = "Không tìm thấy tài liệu hoặc bạn không có quyền truy cập";
                return response;
            }

            try
            {
                var employee = BsonSerializer.Deserialize<Employee>(itemBson);
                response.Item = employee;
                response.Success = true;
            }
            catch (Exception deserializeEx)
            {
                logger.LogError($"Failed to deserialize Employee: {deserializeEx.Message}. Document: {itemBson}");
                response.Success = false;
                response.Message = "Lỗi khi xử lý dữ liệu nhân viên";
                response.MessageException = deserializeEx.Message;
                return response;
            }



        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message} [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }

        return await Task.FromResult(response);
    }



     [Authorize]
    public override async Task<DeleteEmployeeResponse> DeleteEmployee(DeleteEmployeeRequest request,
        ServerCallContext context)
    {
        var response = new DeleteEmployeeResponse();

        try
        {
            // Tạo danh sách IDs từ cả Id single và Ids array
            var idsToDelete = new List<string>();

            // Thêm single Id nếu có
            if (!string.IsNullOrEmpty(request.Id))
            {
                idsToDelete.Add(request.Id);
            }

            // Thêm từ Ids array nếu có
            if (request.Ids != null && request.Ids.Any())
            {
                idsToDelete.AddRange(request.Ids);
            }

            // Kiểm tra có ID nào không
            if (!idsToDelete.Any())
            {
                response.Success = false;
                response.Message = "Không có ID nào để xóa";
                return response;
            }

            var filter = Builders<Employee>.Filter.In(x => x.Id, idsToDelete);

            var update = Builders<Employee>.Update
                .Set(x => x.Delete, true)
                .Set(x => x.DeleteDate, Timestamp.FromDateTime(DateTime.UtcNow));

            if (Global.CollectionEmployee != null)
            {
                var updateResult = await Global.CollectionEmployee.UpdateManyAsync(filter, update);

                if (updateResult.IsAcknowledged && updateResult.ModifiedCount > 0)
                {
                    response.Success = true;
                    response.Message = $"Xóa thành công {updateResult.ModifiedCount} nhân viên!";
                    logger.LogInformation($"DeleteEmployee: Soft deleted {updateResult.ModifiedCount} employees");
                }
                else
                {
                    response.Success = false;
                    response.Message = "Không tìm thấy nhân viên để xóa!";
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message} [{ex.StackTrace}]");
            response.Success = false;
            response.Message = "Có lỗi xảy ra khi xóa!";
            response.MessageException = ex.Message;
        }

        return response;
    }


     [Authorize]
    public override async Task<SaveEmployeeResponse> SaveEmployee(SaveEmployeeRequest request, ServerCallContext context)
    {

        var response = new SaveEmployeeResponse();
        response.Success = true;

        try
        {
            logger.LogInformation($"=== START SaveEmployee: IsNew={request.IsNew} ===");

            var item = request.Item;
            if (item == null)
            {
                response.Success = false;
                response.Message = "Dữ liệu không hợp lệ";
                logger.LogError("SaveEmployee: Item is null");
                logger.LogError(request.ToJson());
                return response;
            }

            if (Global.CollectionEmployee == null)
            {
                response.Success = false;
                response.Message = "Lỗi kết nối cơ sở dữ liệu";
                logger.LogError("SaveEmployee: CollectionEmployee is null");
                return response;
            }

            if (response.Success)
            {
                if (request.IsNew)
                {
                    item.Id = Guid.NewGuid().ToString();
                    item.CreateDate = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(DateTime.UtcNow);
                    item.Delete = false;
                    // item.CreateBy = context.GetUserID();

                    await Global.CollectionEmployee!.InsertOneAsync(item);
                    response.Item = item;
                    response.Message = "Thêm mới thành công!";
                    logger.LogInformation($"SaveEmployee: Created new employee with ID={item.Id}");
                    // context.WriteLogBackend("SaveEmployee [ADD]", request);
                }
                else
                {
                    // Update existing item
                    var filter = Builders<Employee>.Filter.Eq(x => x.Id, request.Item.Id);
                    var updateResult = await Global.CollectionEmployee.FindOneAndReplaceAsync(filter, item);
                    if (updateResult != null)
                    {
                        response.Item = item;
                        response.Success = true;
                        response.Message = "Cập nhật thành công!";
                        logger.LogInformation($"SaveEmployee: Updated employee with ID={item.Id}");
                    }
                    else
                    {
                        response.Success = false;
                        response.Message = "Cập nhật không thành công!";
                        logger.LogWarning($"SaveEmployee: Could not find employee to update with ID={request.Item.Id}");
                    }
                }
            }

            logger.LogInformation($"=== END SaveEmployee: Success={response.Success} ===");
        }
        catch (Exception ex)
        {
            logger.LogError($"{ex.Message} [{ex.StackTrace}]");
            response.Success = false;
            response.Message = "Có lỗi xảy ra khi lưu!";
            response.MessageException = ex.Message;
        }

        GC.Collect();
        return response;
    }





}
