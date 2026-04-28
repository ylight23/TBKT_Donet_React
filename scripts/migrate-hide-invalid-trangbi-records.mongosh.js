/**
 * Ẩn các hồ sơ trang bị sai schema khỏi DataGrid.
 *
 * Lý do:
 * - TrangBiNhom1/2 chỉ được chứa hồ sơ trang bị cụ thể.
 * - Các document thiếu IdChuyenNganhKT là dữ liệu lỗi
 *   và không được hiển thị trong GetListTrangBiNhom1/2.
 *
 * Chạy:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-hide-invalid-trangbi-records.mongosh.js
 */

const dbName = 'quanly_dmcanbo';
const dbx = db.getSiblingDB(dbName);
const now = new Date();

function isInvalidTrangBiDoc(doc) {
  if (!doc || doc.Delete === true) return false;
  if (!doc.IdChuyenNganhKT || typeof doc.IdChuyenNganhKT !== 'string' || !doc.IdChuyenNganhKT.trim()) return true;
  return false;
}

function migrateCollection(collectionName) {
  const coll = dbx.getCollection(collectionName);
  let updated = 0;
  let scanned = 0;

  coll.find({ Delete: { $ne: true } }).forEach((doc) => {
    scanned += 1;
    if (!isInvalidTrangBiDoc(doc)) return;

    coll.updateOne(
      { _id: doc._id },
      {
        $set: {
          Delete: true,
          DeleteReason: 'invalid_trang_bi_record_missing_cn_or_parent_catalog',
          NguoiSua: 'migrate-hide-invalid-trangbi-records',
          NgaySua: {
            Seconds: Math.floor(now.getTime() / 1000),
            Nanos: (now.getTime() % 1000) * 1000000,
          },
        },
      },
    );
    updated += 1;
  });

  print(`${collectionName}: scanned=${scanned}, hidden=${updated}`);
}

print('\n=== migrate-hide-invalid-trangbi-records ===');
migrateCollection('TrangBiNhom1');
migrateCollection('TrangBiNhom2');
print('=== Done ===\n');
