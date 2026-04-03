
const db = db.getSiblingDB("quanly_dmcanbo");

console.log("Renaming fields in NguoiDungNhomNguoiDung...");
db.getCollection("NguoiDungNhomNguoiDung").updateMany(
    { IdDanhmucChuyenNganh: { $exists: true } },
    { $rename: { "IdDanhmucChuyenNganh": "IdDanhMucChuyenNganh" } }
);

console.log("Renaming fields in NhomNguoiDung...");
db.getCollection("NhomNguoiDung").updateMany(
    { IdDanhmucChuyenNganh: { $exists: true } },
    { $rename: { "IdDanhmucChuyenNganh": "IdDanhMucChuyenNganh" } }
);

console.log("Renaming fields in UserPermissionCache...");
db.getCollection("UserPermissionCache").updateMany(
    { IdDanhmucChuyenNganh: { $exists: true } },
    { $rename: { "IdDanhmucChuyenNganh": "IdDanhMucChuyenNganh" } }
);

console.log("Renaming fields in LichSuPhanQuyenScope...");
db.getCollection("LichSuPhanQuyenScope").updateMany(
    { IdDanhmucChuyenNganhCu: { $exists: true } },
    { $rename: { "IdDanhmucChuyenNganhCu": "IdDanhMucChuyenNganhCu" } }
);
db.getCollection("LichSuPhanQuyenScope").updateMany(
    { IdDanhmucChuyenNganhMoi: { $exists: true } },
    { $rename: { "IdDanhmucChuyenNganhMoi": "IdDanhMucChuyenNganhMoi" } }
);

console.log("Migration complete.");
