const dbName = "quanly_dmcanbo";
const colName = "DanhMucTrangBi";
const target = db.getSiblingDB(dbName).getCollection(colName);

print(`Using DB: ${dbName}, collection: ${colName}`);

const before = {
  hasIDCapTren: target.countDocuments({ IDCapTren: { $exists: true } }),
  hasIdCapTren: target.countDocuments({ IdCapTren: { $exists: true } }),
  hasIDChuyenNganhKT: target.countDocuments({ IDChuyenNganhKT: { $exists: true } }),
  hasIdChuyenNganhKT: target.countDocuments({ IdChuyenNganhKT: { $exists: true } }),
};
print("Before:");
printjson(before);

const res = target.updateMany(
  {},
  [
    {
      $set: {
        IdCapTren: { $ifNull: ["$IdCapTren", "$IDCapTren"] },
        IdMaKiemKe: { $ifNull: ["$IdMaKiemKe", "$IDMaKiemKe"] },
        IdChuyenNganhKT: { $ifNull: ["$IdChuyenNganhKT", "$IDChuyenNganhKT"] },
        IdNganh: { $ifNull: ["$IdNganh", "$IDNganh"] },
        IdDonViTinh: { $ifNull: ["$IdDonViTinh", "$IDDonViTinh"] },
        IdTBKTNhom1: { $ifNull: ["$IdTBKTNhom1", "$IDTBKTNhom1"] },
        IdQuocGiaSanXuat: { $ifNull: ["$IdQuocGiaSanXuat", "$IDQuocGiaSanXuat"] },
      },
    },
    {
      $unset: [
        "IDCapTren",
        "IDMaKiemKe",
        "IDChuyenNganhKT",
        "IDNganh",
        "IDDonViTinh",
        "IDTBKTNhom1",
        "IDQuocGiaSanXuat",
      ],
    },
  ],
);

print("Update result:");
printjson({ matched: res.matchedCount, modified: res.modifiedCount });

const after = {
  hasIDCapTren: target.countDocuments({ IDCapTren: { $exists: true } }),
  hasIdCapTren: target.countDocuments({ IdCapTren: { $exists: true } }),
  hasIDChuyenNganhKT: target.countDocuments({ IDChuyenNganhKT: { $exists: true } }),
  hasIdChuyenNganhKT: target.countDocuments({ IdChuyenNganhKT: { $exists: true } }),
  sample: target.find({}, { _id: 1, IdCapTren: 1, IdChuyenNganhKT: 1, Ten: 1 }).limit(3).toArray(),
};
print("After:");
printjson(after);
