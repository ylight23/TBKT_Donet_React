using DiziLib.Common;
using DiziLib.GrpcService.V1;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MoreLinq;
using MoreLinq.Extensions;

namespace Services.Core;

public static class TrangBiLegacyService
{
    #region TrangBi Methods

    private static string EscapeRegex(string value)
    {
        return System.Text.RegularExpressions.Regex.Escape(value ?? string.Empty);
    }

    private static bool ExistsInDanhMucChuyenNganh(string? id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return false;

        var collection = Global.MongoDB?.GetCollection<BsonDocument>("DanhMucChuyenNganh");
        if (collection == null)
            return false;

        var count = collection.CountDocuments(Builders<BsonDocument>.Filter.Eq("_id", id));
        return count > 0;
    }

    private static FilterDefinition<DanhMucTrangBi> GetFilterListTrangBi(
        ListDanhMucTrangBiRequest request,
        ServerCallContext context,
        bool isDeXuat,
        bool isCount,
        ListDanhMucTrangBiResponse? responseList = null,
        CountDanhMucTrangBiResponse? responseCount = null)
    {
        var collection = Global.CollectionDanhMucTrangBi;
        var filter = Global.FitlerBuilderTrangBi.Empty;

        if (!string.IsNullOrEmpty(request.IDChuyenNganhKT) && request.IDChuyenNganhKT != "all")
        {
            filter &= Global.FitlerBuilderTrangBi.Eq(x => x.IDChuyenNganhKT, request.IDChuyenNganhKT);
        }
        if (request.LoadChild)
        {
            if (!string.IsNullOrEmpty(request.IDCapTren))
            {
                var tbktItem = collection.Find(x => x.Id == request.IDCapTren).FirstOrDefault();
                if (tbktItem != null)
                    filter &= Global.FitlerBuilderTrangBi.Ne(x => x.Id, request.IDCapTren) &
                              Global.FitlerBuilderTrangBi.Regex(x => x.Id,
                                  "/^" + EscapeRegex(TrangBiLegacyService.TruncateTrangBiId(tbktItem.Id)) + "[.].*/i");
                else
                {
                    filter &= Global.FitlerBuilderTrangBi.Ne(x => x.Id, request.IDCapTren) &
                              Global.FitlerBuilderTrangBi.Regex(x => x.Id,
                                  "/^" + EscapeRegex(request.IDCapTren) + "[.].*/i");
                }
            }
        }
        else
        {
            if (!string.IsNullOrEmpty(request.IDCapTren))
                filter &= Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, request.IDCapTren);
            else
            {
                if (!string.IsNullOrWhiteSpace(request.IDNganh))
                {
                    var parentId = request.IDNganh;
                    if (request.Nhom == 1)
                    {
                        parentId = FillFullTrangBiId(parentId);
                    }
                    else
                    {
                        parentId += request.Nhom;
                    }

                    filter &= Global.FitlerBuilderTrangBi.Or(Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, null),
                        Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, string.Empty),
                        Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, parentId));
                }
                else
                {
                    if (request.Nhom == 1)
                    {
                        filter &= Global.FitlerBuilderTrangBi.Regex(x => x.IDCapTren, ".0.00.00.00.00.000$");
                    }
                    else if (request.Nhom == 2)
                    {
                        filter &= Global.FitlerBuilderTrangBi.Regex(x => x.IDCapTren, request.IDChuyenNganhKT + "2$");
                    }
                }
            }
        }

        if (request.Nhom > 0)
            filter &= Global.FitlerBuilderTrangBi.Eq(x => x.Nhom, request.Nhom);
        if (request.ExcludeLeaf)
            filter &= Global.FitlerBuilderTrangBi.Eq(x => x.CoCapDuoi, true);
        if (request.OnlyLeaf)
        {
            if (request.Nhom == 1)
                filter &= Global.FitlerBuilderTrangBi.Not(
                    Global.FitlerBuilderTrangBi.Regex(x => x.Id, ".000$"));
            else
            {
                filter &= Global.FitlerBuilderTrangBi.Eq(x => x.CoCapDuoi, false);
            }
        }



        if (!string.IsNullOrEmpty(request.SearchText))
        {
            var escapedSearchText = EscapeRegex(request.SearchText);
            filter &= Global.FitlerBuilderTrangBi.Or(
                Global.FitlerBuilderTrangBi.Regex(x => x.Ten, "/.*" + escapedSearchText + ".*/i") |
                Global.FitlerBuilderTrangBi.Regex(x => x.DanhDiem, "/.*" + escapedSearchText + ".*/i") |
                Global.FitlerBuilderTrangBi.Regex(x => x.Id, "/.*" + escapedSearchText + ".*/i"));
        }
        return filter;
    }

    public static KeyValuePair<string, bool> IsValidTBKT1Id(string maDinhDanh, string idNganh)
    {
        if (string.IsNullOrEmpty(maDinhDanh))
        {
            return new KeyValuePair<string, bool>("Vui lòng nhập mã trang bị!", false);
        }

        var partsIds = maDinhDanh.Split('.');
        if (partsIds.Length != 7)
        {
            return new KeyValuePair<string, bool>("Mã trang bị nhóm 1 không đủ 7 cấp!", false);
        }

        if (partsIds[0] != idNganh)
        {
            return new KeyValuePair<string, bool>($"Ký tự đầu của mã trang bị nhóm 1 phải bắt đầu bằng: {idNganh}",
                false);
        }

        var secondNumber = Converter.ToInt(partsIds[1]);
        if (secondNumber <= 0 || secondNumber > 9)
        {
            return new KeyValuePair<string, bool>("Vị trí thứ 2 của mã phải từ 1 đến 9!", false);
        }

        if (partsIds[2].Length != 2 || !partsIds[2].All(char.IsDigit))
        {
            return new KeyValuePair<string, bool>("Vị trí thứ 3 của mã phải đủ 2 ký tự và từ 01 đến 99!", false);
        }

        if (partsIds[3].Length != 2 || !partsIds[3].All(char.IsDigit))
        {
            return new KeyValuePair<string, bool>("Vị trí thứ 4 của mã phải đủ 2 ký tự và từ 01 đến 99!", false);
        }

        if (partsIds[4].Length != 2 || !partsIds[4].All(char.IsDigit))
        {
            return new KeyValuePair<string, bool>("Vị trí thứ 5 của mã phải đủ 2 ký tự và từ 01 đến 99!", false);
        }

        if (partsIds[5].Length != 2 || !partsIds[5].All(char.IsDigit))
        {
            return new KeyValuePair<string, bool>("Vị trí thứ 6 của mã phải đủ 2 ký tự và từ 01 đến 99!", false);
        }

        if (partsIds[6].Length != 3 || !partsIds[6].All(char.IsDigit))
        {
            return new KeyValuePair<string, bool>("Vị trí thứ 7 của mã phải đủ 3 ký tự và từ 001 đến 999!", false);
        }

        return new KeyValuePair<string, bool>(string.Empty, true);
    }

    /// <summary>
    /// Remove ".000", ".00", ".0"
    /// </summary>
    /// <param name="maDinhDanh"></param>
    /// <returns></returns>
    public static string TruncateTrangBiId(string? maDinhDanh)
    {
        if (string.IsNullOrWhiteSpace(maDinhDanh))
            return string.Empty;
        while (maDinhDanh.EndsWith(".000"))
            maDinhDanh = maDinhDanh.Substring(0, maDinhDanh.Length - ".000".Length);
        while (maDinhDanh.EndsWith(".00"))
            maDinhDanh = maDinhDanh.Substring(0, maDinhDanh.Length - ".00".Length);
        while (maDinhDanh.EndsWith(".0"))
            maDinhDanh = maDinhDanh.Substring(0, maDinhDanh.Length - ".0".Length);
        return maDinhDanh;
    }

    public static string FillFullTrangBiId(string? maDinhDanh)
    {
        if (string.IsNullOrWhiteSpace(maDinhDanh))
            return string.Empty;
        var parts = maDinhDanh.Split('.');
        if (parts.Length == 1)
            maDinhDanh += ".0.00.00.00.00.000";
        else if (parts.Length == 2)
            maDinhDanh += ".00.00.00.00.000";
        else if (parts.Length == 3)
            maDinhDanh += ".00.00.00.000";
        else if (parts.Length == 4)
            maDinhDanh += ".00.00.000";
        else if (parts.Length == 5)
            maDinhDanh += ".00.000";
        else if (parts.Length == 6)
            maDinhDanh += ".000";
        return maDinhDanh;
    }
    public static DanhMucTrangBi? GetTrangBiItemById(string? id)
    {
        if (string.IsNullOrEmpty(id))
            return null;
        return Global.CollectionDanhMucTrangBi.Find(x => x.Id == id).FirstOrDefault();
    }

    public static async Task<CountDanhMucTrangBiResponse> CountDanhMucTrangBi(ListDanhMucTrangBiRequest request,
        ServerCallContext context, ILogger _logger,
        bool isDeXuat = true)
    {
        var response = new CountDanhMucTrangBiResponse() { Count = 0 };
        try
        {
            var collection = Global.CollectionDanhMucTrangBi;
            var filter = GetFilterListTrangBi(request, context, isDeXuat, true, null, response);
            if (filter == Global.FitlerBuilderTrangBi.Empty)
                return response;

            response.Count = (int)await collection.CountDocumentsAsync(filter);
            response.Success = true;
            _logger.LogInformation("CountDanhMucTrangBi: " + response.Count);
        }
        catch (Exception ex)
        {
            DiziApp.Shared.Server.Services.LogService.LogError(ex);
            _logger.LogError(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    public static async Task<ListDanhMucTrangBiResponse> GetListDanhMucTrangBiAsync(ListDanhMucTrangBiRequest request,
        ServerCallContext context, ILogger _logger, bool isDeXuat = true)
    {
        var response = new ListDanhMucTrangBiResponse() { Pager = request.Pager };
        try
        {
            var startTime = DateTime.Now;
            var filter = GetFilterListTrangBi(request, context, isDeXuat, false, response, null);
            var collection = Global.CollectionDanhMucTrangBi;
            var sortBuilder = Builders<DanhMucTrangBi>.Sort;
            var sort = sortBuilder.Ascending(x => x.IDChuyenNganhKT).Ascending(x => x.ThuTuSapXep);
            var baseQuery = collection.Find(filter).Sort(sort);
            List<DanhMucTrangBi> set;
            if (request.Pager != null)
            {
                var dataTask = baseQuery
                    .Skip((request.Pager.Index) * request.Pager.Size)
                    .Limit(request.Pager.Size)
                    .ToListAsync();
                var countTask = collection.CountDocumentsAsync(filter);
                await Task.WhenAll(dataTask, countTask);
                set = dataTask.Result;
                request.Pager.Total = (int)countTask.Result;
            }
            else
            {
                set = await baseQuery.ToListAsync();
            }

            var endTime = DateTime.Now;
            _logger.LogInformation($"GetListTrangBi ReadDB Time: {(endTime - startTime).TotalMilliseconds}ms");
            //Chèn các parent của mục đang tìm kiếm
            if (!string.IsNullOrEmpty(request.SearchText) && set != null)
            {
                var loadedIDs = set.Select(c => c.Id).ToList();
                var ids = new List<string>();
                foreach (var item in set)
                {
                    var parts = item.Id.Split('.');
                    for (var i = 0; i < parts.Length - 1; i++)
                    {
                        var id = string.Join(".", parts.Take(i + 1));
                        if (!ids.Contains(id) && !loadedIDs.Contains(id))
                            ids.Add(id);
                    }
                }

                if (ids.Count > 0)
                {
                    var listParent = collection
                        .Find(Global.FitlerBuilderTrangBi.In(x => x.Id, ids))
                        .SortByDescending(c => c.ThuTuSapXep).ToList();
                    foreach (var parent in listParent)
                    {
                        set.Insert(0, parent);
                    }
                }
            }

            if (set != null)
            {
                {
                    if (request.MinimizeInfo)
                    {
                        response.Items.AddRange(set.Select(c => new DanhMucTrangBi()
                        {
                            Id = c.Id,
                            IDCapTren = c.IDCapTren,
                            IDNganh = c.IDNganh,
                            IDChuyenNganhKT = c.IDChuyenNganhKT,
                            Ten = c.Ten,
                            CoCapDuoi = c.CoCapDuoi,
                            Nhom = c.Nhom,
                            IDDonViTinh = c.IDDonViTinh
                        }));
                    }
                    else
                    {
                        response.Items.AddRange(set.ToList());
                    }
                }
            }

            // if (!string.IsNullOrEmpty(request.SearchText))
            // {
            //     foreach (var item in response.Items)
            //     {
            //         item.Expanded = true;
            //     }
            // }
            endTime = DateTime.Now;
            _logger.LogInformation($"GetListTrangBi Time: {(endTime - startTime).TotalMilliseconds}ms");
            _logger.LogDebug($"response.Items: {response.Items.Count}");
            response.Success = true;
        }
        catch (Exception ex)
        {
            DiziApp.Shared.Server.Services.LogService.LogError(ex);
            _logger.LogError(ex.Message + $" [{ex.StackTrace}]");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    public static async Task<DanhMucTrangBiResponse> GetDanhMucTrangBiAsync(DanhMucTrangBiRequest request,
        ServerCallContext context, ILogger _logger, bool isDeXuat = true)
    {
        var response = new DanhMucTrangBiResponse();
        try
        {
            var collection = Global.CollectionDanhMucTrangBi;
            if (collection == null)
            {
                response.Success = false;
                response.Message = "CollectionDanhMucTrangBi NULL";
                return response;
            }
            var filter = Global.FitlerBuilderTrangBi.Eq(x => x.Id, request.Id);
            var items = await collection.FindAsync<DanhMucTrangBi>(filter);

            response.Item = items.FirstOrDefault();
            response.Success = true;
        }
        catch (Exception ex)
        {
            DiziApp.Shared.Server.Services.LogService.LogError(ex);
            _logger.LogError($"{ex.Message}");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    public static async Task<DeleteDanhMucTrangBiResponse> DeleteDanhMucTrangBiAsync(DeleteDanhMucTrangBiRequest request,
        ServerCallContext context, ILogger _logger, bool isDeXuat = true)
    {
        context.WriteLogBackend($"DeleteDanhMucTrangBi", request);
        var response = new DeleteDanhMucTrangBiResponse();
        var collectionTrangBi = Global.CollectionDanhMucTrangBi;
        var collectionVatTu = Global.CollectionDanhMucVatTu;
        if (request.IDs.Count == 0)
        {
            response.Success = false;
            response.Message = "Chưa chọn dữ liệu!";
            return response;
        }

        if (collectionTrangBi == null)
        {
            response.Success = false;
            response.Message = "CollectionTrangBi NULL!";
            return response;
        }
        if (collectionVatTu == null)
        {
            response.Success = false;
            response.Message = "CollectionVatTu NULL!";
            return response;
        }

        try
        {
            var listItemDeletes =
                collectionTrangBi.Find(Global.FitlerBuilderTrangBi.In(x => x.Id, request.IDs)).ToList();
            var roots = new List<DanhMucTrangBi>();
            var dictItemDeletes = listItemDeletes?.ToDictionary(c => c.Id, c => c);
            if (dictItemDeletes != null && listItemDeletes != null)
            {
                foreach (var itemDelete in listItemDeletes)
                {
                    if (!string.IsNullOrEmpty(itemDelete.IDCapTren) &&
                        dictItemDeletes.TryGetValue(itemDelete.IDCapTren, out var parent) && parent != null)
                    {
                        //parent.Child.Add(itemDelete);
                    }
                    else
                    {
                        roots.Add(itemDelete);
                    }
                }
            }

            var listNganhIds = roots.Select(c => c.IDNganh).Distinct().ToList();
            var listNhom = roots.Select(c => c.Nhom).Distinct().ToList();
            var filterChild = Global.FitlerBuilderTrangBi.In(x => x.Nhom, listNhom) &
                              Global.FitlerBuilderTrangBi.In(x => x.IDNganh, listNganhIds);

            var allTrangBis = collectionTrangBi.Find(filterChild).ToList();

            //var listIdDeXuat = new List<string>();
            var listIdDeletes = new List<string>();
            var listIDCapTrens = new List<string>();
            foreach (var root in roots)
            {
                var maDinhDanh = root.Id;
                var parentId = root.IDCapTren;
                if (!string.IsNullOrEmpty(parentId))
                    listIDCapTrens.Add(parentId);
                if (root.Nhom == 1)
                    maDinhDanh = TruncateTrangBiId(maDinhDanh);
                var listChild = allTrangBis.Where(x => x.Id.StartsWith(maDinhDanh + ".") || x.Id == root.Id)
                    .ToList();

                var batchDeleteIds = listChild.Select(x => x.Id).ToList();
                listIdDeletes.AddRange(batchDeleteIds);
                response.TotalDeleted += batchDeleteIds.Count;
            }

            var countVatTu = await collectionVatTu.CountDocumentsAsync(
                    Global.FitlerBuilderVatTu.In(x => x.IDTBKT, listIdDeletes));
            allTrangBis = null;
            if (countVatTu > 0)
            {
                response.PairKeys.Clear();
                response.Success = false;
                response.Message = $"Các danh mục trang bị đang xóa chứa dữ liệu danh mục vật tư!";
                return response;
            }


            var filterDelete = Global.FitlerBuilderTrangBi.Eq(x => x.LaDeXuat, true) &
                              Global.FitlerBuilderTrangBi.In(x => x.Id, listIdDeletes);
            var deleteResult = await collectionTrangBi.DeleteManyAsync(filterDelete);
            if (deleteResult is { IsAcknowledged: true })
            {
                var distinctParentIds = listIDCapTrens
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct()
                    .ToList();

                if (distinctParentIds.Count > 0)
                {
                    var counts = await collectionTrangBi.Aggregate()
                        .Match(Builders<DanhMucTrangBi>.Filter.In(x => x.IDCapTren, distinctParentIds))
                        .Group(x => x.IDCapTren, g => new { ParentId = g.Key, Count = g.Count() })
                        .ToListAsync();

                    var countMap = counts.ToDictionary(x => x.ParentId, x => x.Count);
                    var updates = distinctParentIds
                        .Select(parentId => (WriteModel<DanhMucTrangBi>)new UpdateOneModel<DanhMucTrangBi>(
                            Builders<DanhMucTrangBi>.Filter.Eq(x => x.Id, parentId),
                            Global.UpdateBuilderTrangBi.Set(x => x.CoCapDuoi,
                                countMap.TryGetValue(parentId, out var childCount) && childCount > 0)
                        ))
                        .ToList();

                    if (updates.Count > 0)
                    {
                        await collectionTrangBi.BulkWriteAsync(updates, new BulkWriteOptions { IsOrdered = false });
                    }
                }
            }

            response.Success = true;
            response.Message = "Xóa thành công!";
        }
        catch (Exception ex)
        {
            DiziApp.Shared.Server.Services.LogService.LogError(ex);
            _logger.LogError($"{ex.Message}");
        }
        return response;
    }

    public static int SearchTrangBiIndexNotUsed(string? madinhDanhParentId, bool isDeXuat = true, string? officeId = null)
    {
        var filterMax = Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, madinhDanhParentId) &
                        Global.FitlerBuilderTrangBi.Regex(x => x.Id, "/^" + EscapeRegex(madinhDanhParentId) + ".*/i");

        var listId = Global.CollectionDanhMucTrangBi.Find<DanhMucTrangBi>(filterMax).ToList()
                .Select(c => Converter.ToInt(c.Id.Substring((madinhDanhParentId + ".").Length)))
                .OrderBy(c => c).ToArray();
        if (!listId.Any() || listId.FirstOrDefault() > 1)
            return 1;
        if (listId.Length == 1)
        {
            return listId.FirstOrDefault() + 1;
        }
        else
        {
            int count = listId.Length;
            for (int i = 0; i < count - 1; i++)
            {
                if (listId[i] + 1 < listId[i + 1])
                    return listId[i] + 1;
            }
        }

        return listId.LastOrDefault() + 1;
    }

    public static async Task<DanhMucTrangBiResponse> GetLastDanhMucTrangBi(ListDanhMucTrangBiRequest request, ServerCallContext context, ILogger<DanhMucMaDinhDanhService> _logger)
    {
        var response = new DanhMucTrangBiResponse();
        try
        {
            var collection = Global.CollectionDanhMucTrangBi;
            var filter = Global.FitlerBuilderTrangBi.Empty;
            if (!string.IsNullOrEmpty(request.IDCapTren))
            {
                filter &= Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, request.IDCapTren);
            }
            else
                filter &= Global.FitlerBuilderTrangBi.Or(Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, null),
                    Global.FitlerBuilderTrangBi.Eq(x => x.IDCapTren, string.Empty));
            var obj = await collection.Find<DanhMucTrangBi>(filter).SortByDescending(c => c.ThuTuSapXep).FirstOrDefaultAsync();
            response.Item = obj;
            response.Success = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetLastDanhMucTrangBi failed");
            response.Success = false;
            response.MessageException = ex.Message;
        }
        return response;
    }

    public static async Task<SaveDanhMucTrangBiResponse> SaveDanhMucTrangBiAsync(SaveDanhMucTrangBiRequest request,
        ServerCallContext context, ILogger _logger, bool isDeXuat = true)
    {
        var response = new SaveDanhMucTrangBiResponse { Success = true };
        try
        {
            var collection = Global.CollectionDanhMucTrangBi;
            if (request.Items != null && request.Items.Any() && collection != null)
            {
                foreach (var item in request.Items)
                {
                    if (!ExistsInDanhMucChuyenNganh(item.IDChuyenNganhKT))
                    {
                        response.Success = false;
                        response.Message = $"Chuyen nganh '{item.IDChuyenNganhKT}' khong ton tai trong danh muc";
                        return response;
                    }

                    if (item.Nhom == 1 && !string.IsNullOrWhiteSpace(item.Id))
                    {
                        var prefix = item.Id.Split('.').FirstOrDefault() ?? string.Empty;
                        if (!string.Equals(prefix, item.IDChuyenNganhKT, StringComparison.OrdinalIgnoreCase))
                        {
                            response.Success = false;
                            response.Message = $"Ma trang bi phai bat dau bang '{item.IDChuyenNganhKT}.'";
                            return response;
                        }
                    }

                    if (item.Nhom == 1)
                    {
                        var isValid = TrangBiLegacyService.IsValidTBKT1Id(item.Id, item.IDNganh);
                        if (!isValid.Value)
                        {
                            response.Success = false;
                            response.Message = isValid.Key;
                            return response;
                        }
                    }

                    var parent = !string.IsNullOrEmpty(item.IDCapTren)
                        ? collection
                            .Find<DanhMucTrangBi>(Global.FitlerBuilderTrangBi.Eq(x => x.Id, item.IDCapTren))
                            .FirstOrDefault()
                        : null;
                    if (request.IsNew)
                    {
                        var ordering = string.Empty;
                        if (item.Nhom == 1)
                        {
                            var existing = collection.Find(x => x.Id == item.Id)
                                .FirstOrDefault();
                            if (existing != null)
                            {
                                response.Success = false;
                                response.Message = $"Đã tồn tại mã {item.Id} có tên: {existing.Ten}!";
                                return response;
                            }
                            if ((item.IDCapTren == item.IDNganh || string.IsNullOrEmpty(item.IDCapTren)))
                            {
                                item.IDCapTren = $"{item.IDNganh}.0.00.00.00.00.000";
                            }

                            var idTruncated = TrangBiLegacyService.TruncateTrangBiId(item.Id);
                            var idParts = item.Id.Split('.');
                            ordering = item.IDNganh + "." +
                                       string.Join(".", idParts.Skip(1).Select(c => c.PadLeft(5, '0')));
                            var idPartsTruncated = idTruncated.Split('.');
                            item.ThuTu = Converter.ToInt(idPartsTruncated.LastOrDefault());
                        }
                        else
                        {
                            if (string.IsNullOrWhiteSpace(item.IDCapTren))
                                item.IDCapTren = $"{item.IDNganh}{item.Nhom}";
                            ordering = parent != null
                                ? parent.ThuTuSapXep
                                : item.IDNganh + (item.Nhom == 2 ? "2" : "");

                            var newId = TrangBiLegacyService.SearchTrangBiIndexNotUsed(item.IDCapTren, isDeXuat: isDeXuat, context.GetUserAdminOfficeID());
                            item.Id = $"{item.IDCapTren}.{newId}";
                            item.ThuTu = newId;

                            ordering = ordering + "." + item.ThuTu.ToString().PadLeft(5, '0');
                        }

                        var model = new DanhMucTrangBi()
                        {
                            Id = item.Id,
                            IDCapTren = item.IDCapTren,
                            Ten = item.Ten,
                            IDDonViTinh = item.IDDonViTinh,
                            IDNganh = item.IDNganh,
                            IDChuyenNganhKT = item.IDChuyenNganhKT,
                            IDQuocGiaSanXuat = item.IDQuocGiaSanXuat,
                            NamSanXuat = item.NamSanXuat,
                            Nhom = item.Nhom,
                            DanhDiem = item.DanhDiem,
                            LaDeXuat = item.LaDeXuat,
                            ThuTu = item.ThuTu,
                            ThuTuSapXep = ordering,
                            TenDayDu = item.Ten + (!string.IsNullOrEmpty(parent?.TenDayDu) ? ", " + parent?.TenDayDu : ""),
                            CoCapDuoi = item.CoCapDuoi,
                            GhiChu = item.GhiChu,
                            NguoiTao = context.GetUserID(),
                            NgayTao = DiziApp.Shared.Server.Utils.GetNowTimestamp(),
                            HangSanXuat = item.HangSanXuat,
                            IDDonViDeXuat = item.IDDonViDeXuat,
                            IDMaKiemKe = item.IDMaKiemKe
                        };
                        await collection.InsertOneAsync(model);
                        if (!string.IsNullOrEmpty(item.IDCapTren))
                        {
                            var updater = Global.UpdateBuilderTrangBi.Set(x => x.CoCapDuoi, true);
                            await collection.UpdateOneAsync(
                                Global.FitlerBuilderTrangBi.Eq(x => x.Id, item.IDCapTren), updater);
                        }

                        response.Items.Add(model);
                        response.Id = model.Id;
                        response.Message = "Thêm mới thành công!";
                    }
                    //Update
                    else
                    {
                        DanhMucTrangBi? tbkt1Item = null;
                        if (string.IsNullOrEmpty(item.IDCapTren))
                        {
                            item.IDCapTren = item.IDNganh + (item.Nhom == 2 ? "2" : "");
                        }

                        var changeParent = false;
                        var existing = collection
                            .Find<DanhMucTrangBi>(Global.FitlerBuilderTrangBi.Eq(x => x.Id, item.Id))
                            .FirstOrDefault();
                        var newIDCapTren = item.IDCapTren;
                        var oldId = item.Id;
                        var oldParentId = existing?.IDCapTren;
                        var newParentId = item.IDCapTren;
                        if (oldParentId != newParentId)
                            changeParent = true;

                        if (item.Nhom == 1)
                        {
                            oldId = TrangBiLegacyService.TruncateTrangBiId(oldId);
                        }

                        var filterListChild =
                            Global.FitlerBuilderTrangBi.Eq(x => x.Nhom, item.Nhom) &
                                          Global.FitlerBuilderTrangBi.Regex(x => x.IDCapTren,
                                              "/^" + EscapeRegex(oldId) + "[.].*/i");

                        var listChild = collection
                            .Find(filterListChild)
                            .SortBy(c => c.Id).ToList();
                        //Thay đổi IDCapTren
                        if (changeParent)
                        {
                            var newParent = !string.IsNullOrEmpty(newParentId) ? TrangBiLegacyService.GetTrangBiItemById(newParentId) : null;
                            var newId = TrangBiLegacyService.SearchTrangBiIndexNotUsed(newIDCapTren, isDeXuat: isDeXuat, officeId: context.GetUserAdminOfficeID());
                            item.Id = item.IDCapTren + "." + newId;

                            item.TenDayDu = item.Ten + (!string.IsNullOrEmpty(newParent?.TenDayDu)
                                ? ", " + newParent?.TenDayDu
                                : "");
                            item.ThuTu = newId;
                            item.ThuTuSapXep =
                                (newParent != null
                                    ? newParent.ThuTuSapXep
                                    : $"{item.IDNganh + (item.Nhom == 2 ? "2" : "")}") + "." +
                                newId.ToString().PadLeft(5, '0');
                            item.NgaySua = DiziApp.Shared.Server.Utils.GetNowTimestamp();
                            item.NguoiSua = context.GetUserID();
                            item.CoCapDuoi = listChild.Count > 0;
                            item.IDChuyenNganhKT = item.IDChuyenNganhKT;
                            item.IDNganh = item.IDNganh;


                            await collection.ReplaceOneAsync(
                                Global.FitlerBuilderTrangBi.Eq(x => x.Id, item.Id), item);
                            var updater = Global.UpdateBuilderTrangBi.Set(x => x.CoCapDuoi, true);
                            await collection.UpdateOneAsync(
                                Global.FitlerBuilderTrangBi.Eq(x => x.Id, newParentId), updater);
                            if (!string.IsNullOrEmpty(oldParentId))
                            {
                                var countChildOfOldParent = await collection
                                    .Find(x => x.IDCapTren == oldParentId).CountDocumentsAsync();
                                await collection.UpdateOneAsync(x => x.Id == oldParentId,
                                    Global.UpdateBuilderTrangBi.Set(x => x.CoCapDuoi,
                                        countChildOfOldParent > 0));
                            }

                            //Update childs
                            if (listChild.Any())
                            {
                                foreach (var child in listChild)
                                {
                                    if (child != null)
                                    {
                                        oldParentId = child.IDCapTren;
                                        child.Id =
                                            newId + child.Id.Substring(oldId.Length);

                                        child.IDCapTren =
                                            newId + child.IDCapTren.Substring(oldId.Length);
                                        //child.IDCapTren = newId + child.IDCapTren.Substring(oldId.Length);
                                        child.TenDayDu = child.Ten +
                                                         (parent != null ? ", " + parent.TenDayDu : string.Empty);
                                        var parentOfChild =
                                            listChild.FirstOrDefault(c => c.Id == child.IDCapTren);
                                        if (parentOfChild == null)
                                            parentOfChild = item;
                                        child.ThuTuSapXep = parentOfChild.ThuTuSapXep + "." +
                                                                child.ThuTu.ToString().PadLeft(5, '0');
                                        child.NgaySua = DiziApp.Shared.Server.Utils.GetNowTimestamp();
                                        child.NguoiSua = context.GetUserID();
                                        await collection.ReplaceOneAsync(
                                            Global.FitlerBuilderTrangBi.Eq(x => x.Id, child.Id), child);
                                    }
                                }
                            }
                            response.Items.Add(item);
                            response.Id = item.Id;
                            response.Message = "Cập nhật thành công!";
                        }
                        //Update normal
                        else
                        {
                            item.NguoiSua = context.GetUserID();
                            item.NgaySua = DiziApp.Shared.Server.Utils.GetNowTimestamp();
                            item.CoCapDuoi = listChild.Any();
                            await collection.ReplaceOneAsync(x => x.Id == item.Id, item);
                            if (!string.IsNullOrEmpty(item.IDCapTren))
                            {
                                var updaterParent = Global.UpdateBuilderTrangBi.Set(x => x.CoCapDuoi, true);
                                await collection.UpdateOneAsync(
                                    Global.FitlerBuilderTrangBi.Eq(x => x.Id, item.IDCapTren), updaterParent);
                            }


                            foreach (var child in listChild)
                            {
                                var updateChild = Global.UpdateBuilderTrangBi.Set(x => x.IDChuyenNganhKT,
                                    item.IDChuyenNganhKT);
                                var filterChild = Global.FitlerBuilderTrangBi.Eq(x => x.Id, child.Id);
                                await collection.UpdateOneAsync(filterChild,
                                    updateChild);
                            }
                            response.Items.Add(item);
                            response.Success = true;
                            response.Message = "Cập nhật thành công!";
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            DiziApp.Shared.Server.Services.LogService.LogError(ex, context);
            response.Success = false;
            response.Message = $"Ghi không thành công!";
            response.MessageException = $"{ex.Message} [{ex.StackTrace}]";
            _logger.LogError(ex.Message);
        }
        return response;
    }
    #endregion 
}