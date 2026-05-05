using System.Text.RegularExpressions;
using Backend.Authorization;
using Backend.utils;
using Backend.Common.Protobuf;
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
    private const string PermissionCode = "employee.view";

    private static string NormalizeEmployeeName(string? value)
        => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToLowerInvariant();

    private static Task WriteImportEventAsync(
        IServerStreamWriter<ImportEmployeesStreamEvent> responseStream,
        ImportEmployeesStreamEvent item)
        => responseStream.WriteAsync(item);


     [Authorize]
    public override async Task<GetListEmployeesResponse> GetListEmployees(GetListEmployeesRequest request,
        ServerCallContext context)
    {
        var response = new GetListEmployeesResponse();

        try
        {
            context.RequireView(PermissionCode);

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
                        builder.Regex("DienThoai", new BsonRegularExpression(searchEmployee.HoVaTen, "i"))
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


     [Authorize]
    public override async Task<GetEmployeeResponse> GetEmployee(GetEmployeeRequest request, ServerCallContext context)
    {

        var response = new GetEmployeeResponse();

        try
        {
            context.RequireView(PermissionCode);

            if (request.Id == null || string.IsNullOrEmpty(request.Id))
            {
                response.Success = false;
                response.Message = "ID không được để trống";
                return await Task.FromResult(response);
            }
            var builder = Builders<BsonDocument>.Filter;

            var filter = Builders<BsonDocument>.Filter.Eq(x => x["_id"], request.Id) &
                         Builders<BsonDocument>.Filter.Ne(x => x["Delete"], true);

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
            context.RequireView(PermissionCode);

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
                .Set(x => x.DeleteDate, ProtobufTimestampConverter.GetNowTimestamp());

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
    public override async Task ImportEmployeesStream(
        ImportEmployeesStreamRequest request,
        IServerStreamWriter<ImportEmployeesStreamEvent> responseStream,
        ServerCallContext context)
    {
        var jobId = Guid.NewGuid().ToString();
        context.RequireView(PermissionCode);

        var total = request.Items.Count;
        var succeeded = 0;
        var failed = 0;
        var warnings = new List<string>();

        await WriteImportEventAsync(responseStream, new ImportEmployeesStreamEvent
        {
            JobId = jobId,
            Stage = "STARTED",
            Message = "Bat dau import danh sach can bo",
            Total = total,
            Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
        });

        var existingEmployees = await Global.CollectionEmployee!
            .Find(Builders<Employee>.Filter.Ne(x => x.Delete, true))
            .ToListAsync(context.CancellationToken);

        var existingByName = existingEmployees
            .Where(item => !string.IsNullOrWhiteSpace(item.HoVaTen))
            .GroupBy(item => NormalizeEmployeeName(item.HoVaTen))
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

        await WriteImportEventAsync(responseStream, new ImportEmployeesStreamEvent
        {
            JobId = jobId,
            Stage = "IMPORTING",
            Message = $"Dang xu ly {total} ban ghi",
            Total = total,
            Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
        });

        for (var i = 0; i < request.Items.Count; i++)
        {
            context.CancellationToken.ThrowIfCancellationRequested();
            var item = request.Items[i];
            var normalizedName = NormalizeEmployeeName(item.HoVaTen);

            if (string.IsNullOrWhiteSpace(normalizedName))
            {
                failed++;
                var warning = $"Dong {i + 1}: thieu HoVaTen";
                warnings.Add(warning);
                await WriteImportEventAsync(responseStream, new ImportEmployeesStreamEvent
                {
                    JobId = jobId,
                    Stage = "WARNING",
                    Message = "Bo qua ban ghi thieu ho va ten",
                    Processed = i + 1,
                    Total = total,
                    Succeeded = succeeded,
                    Failed = failed,
                    CurrentKey = $"row-{i + 1}",
                    Warnings = { warning },
                    Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
                });
                continue;
            }

            try
            {
                if (existingByName.TryGetValue(normalizedName, out var existing))
                {
                    item.Id = existing.Id;
                    item.CreateDate = existing.CreateDate;
                    item.CreateBy = existing.CreateBy;
                    item.Delete = false;
                    item.ModifyDate = ProtobufTimestampConverter.GetNowTimestamp();

                    var filter = Builders<Employee>.Filter.Eq(x => x.Id, existing.Id);
                    await Global.CollectionEmployee.ReplaceOneAsync(filter, item, cancellationToken: context.CancellationToken);
                }
                else
                {
                    item.Id = Guid.NewGuid().ToString();
                    item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();
                    item.Delete = false;
                    await Global.CollectionEmployee.InsertOneAsync(item, cancellationToken: context.CancellationToken);
                }

                existingByName[normalizedName] = item;
                succeeded++;
                await WriteImportEventAsync(responseStream, new ImportEmployeesStreamEvent
                {
                    JobId = jobId,
                    Stage = "PROGRESS",
                    Message = $"Da xu ly {item.HoVaTen}",
                    Processed = i + 1,
                    Total = total,
                    Succeeded = succeeded,
                    Failed = failed,
                    CurrentKey = item.HoVaTen ?? item.Id,
                    Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
                });
            }
            catch (Exception ex)
            {
                failed++;
                var warning = $"{item.HoVaTen ?? $"row-{i + 1}"}: {ex.Message}";
                warnings.Add(warning);
                await WriteImportEventAsync(responseStream, new ImportEmployeesStreamEvent
                {
                    JobId = jobId,
                    Stage = "WARNING",
                    Message = $"Khong the luu {item.HoVaTen}",
                    Processed = i + 1,
                    Total = total,
                    Succeeded = succeeded,
                    Failed = failed,
                    CurrentKey = item.HoVaTen ?? $"row-{i + 1}",
                    Warnings = { warning },
                    Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
                });
            }
        }

        await WriteImportEventAsync(responseStream, new ImportEmployeesStreamEvent
        {
            JobId = jobId,
            Stage = warnings.Count == 0 ? "COMPLETED" : "COMPLETED_WITH_WARNINGS",
            Message = warnings.Count == 0
                ? $"Import thanh cong {succeeded}/{total} ban ghi"
                : $"Import xong {succeeded}/{total} ban ghi, co {failed} canh bao",
            Processed = total,
            Total = total,
            Succeeded = succeeded,
            Failed = failed,
            Warnings = { warnings },
            Done = true,
            Success = failed == 0,
            Timestamp = ProtobufTimestampConverter.GetNowTimestamp(),
        });
    }


     [Authorize]
    public override async Task<SaveEmployeeResponse> SaveEmployee(SaveEmployeeRequest request, ServerCallContext context)
    {

        var response = new SaveEmployeeResponse();
        response.Success = true;

        try
        {
            context.RequireView(PermissionCode);

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
                    item.CreateDate = ProtobufTimestampConverter.GetNowTimestamp();
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
