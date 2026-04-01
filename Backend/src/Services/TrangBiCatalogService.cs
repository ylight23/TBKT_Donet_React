using MongoDB.Bson;
using MongoDB.Driver;

namespace Backend.Services;

public sealed class TrangBiCatalogService
{
    private const string DanhMucChuyenNganhCollection = "DanhMucChuyenNganh";

    public static KeyValuePair<string, bool> IsValidNhom1Id(string maDinhDanh, string idNganh)
    {
        if (string.IsNullOrEmpty(maDinhDanh))
            return new KeyValuePair<string, bool>("Vui long nhap ma trang bi!", false);

        var partsIds = maDinhDanh.Split('.');
        if (partsIds.Length != 7)
            return new KeyValuePair<string, bool>("Ma trang bi nhom 1 khong du 7 cap!", false);

        if (!string.Equals(partsIds[0], idNganh, StringComparison.OrdinalIgnoreCase))
            return new KeyValuePair<string, bool>($"Ky tu dau cua ma trang bi nhom 1 phai bat dau bang: {idNganh}", false);

        if (!int.TryParse(partsIds[1], out var secondNumber) || secondNumber <= 0 || secondNumber > 9)
            return new KeyValuePair<string, bool>("Vi tri thu 2 cua ma phai tu 1 den 9!", false);

        if (partsIds[2].Length != 2 || !partsIds[2].All(char.IsDigit))
            return new KeyValuePair<string, bool>("Vi tri thu 3 cua ma phai du 2 ky tu va tu 01 den 99!", false);

        if (partsIds[3].Length != 2 || !partsIds[3].All(char.IsDigit))
            return new KeyValuePair<string, bool>("Vi tri thu 4 cua ma phai du 2 ky tu va tu 01 den 99!", false);

        if (partsIds[4].Length != 2 || !partsIds[4].All(char.IsDigit))
            return new KeyValuePair<string, bool>("Vi tri thu 5 cua ma phai du 2 ky tu va tu 01 den 99!", false);

        if (partsIds[5].Length != 2 || !partsIds[5].All(char.IsDigit))
            return new KeyValuePair<string, bool>("Vi tri thu 6 cua ma phai du 2 ky tu va tu 01 den 99!", false);

        if (partsIds[6].Length != 3 || !partsIds[6].All(char.IsDigit))
            return new KeyValuePair<string, bool>("Vi tri thu 7 cua ma phai du 3 ky tu va tu 001 den 999!", false);

        return new KeyValuePair<string, bool>(string.Empty, true);
    }

    public static string TruncateTrangBiId(string? maDinhDanh)
    {
        if (string.IsNullOrWhiteSpace(maDinhDanh))
            return string.Empty;

        while (maDinhDanh.EndsWith(".000", StringComparison.Ordinal))
            maDinhDanh = maDinhDanh[..^4];
        while (maDinhDanh.EndsWith(".00", StringComparison.Ordinal))
            maDinhDanh = maDinhDanh[..^3];
        while (maDinhDanh.EndsWith(".0", StringComparison.Ordinal))
            maDinhDanh = maDinhDanh[..^2];

        return maDinhDanh;
    }

    public static string FillFullTrangBiId(string? maDinhDanh)
    {
        if (string.IsNullOrWhiteSpace(maDinhDanh))
            return string.Empty;

        var parts = maDinhDanh.Split('.');
        if (parts.Length == 1)
            return maDinhDanh + ".0.00.00.00.00.000";
        if (parts.Length == 2)
            return maDinhDanh + ".00.00.00.00.000";
        if (parts.Length == 3)
            return maDinhDanh + ".00.00.00.000";
        if (parts.Length == 4)
            return maDinhDanh + ".00.00.000";
        if (parts.Length == 5)
            return maDinhDanh + ".00.000";
        if (parts.Length == 6)
            return maDinhDanh + ".000";

        return maDinhDanh;
    }

    public async Task<bool> ExistsChuyenNganhAsync(string? idChuyenNganhKt, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idChuyenNganhKt))
            return false;

        var db = Global.MongoDB;
        if (db == null)
            return false;

        var col = db.GetCollection<BsonDocument>(DanhMucChuyenNganhCollection);
        var count = await col.CountDocumentsAsync(
            Builders<BsonDocument>.Filter.Eq("_id", idChuyenNganhKt),
            cancellationToken: cancellationToken
        );

        return count > 0;
    }

    public static bool IsIdPrefixConsistent(string? trangBiId, string? idChuyenNganhKt)
    {
        if (string.IsNullOrWhiteSpace(trangBiId) || string.IsNullOrWhiteSpace(idChuyenNganhKt))
            return false;

        var prefix = trangBiId.Split('.').FirstOrDefault() ?? string.Empty;
        return string.Equals(prefix, idChuyenNganhKt, StringComparison.OrdinalIgnoreCase);
    }
}
