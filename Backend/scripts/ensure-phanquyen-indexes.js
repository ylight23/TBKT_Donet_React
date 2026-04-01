const dbName = db.getName();
print(`Using database: ${dbName}`);
function sameKey(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function keyText(key) {
  return JSON.stringify(key);
}
function ensureIndex(collectionName, key, options) {
  if (!db.getCollectionNames().includes(collectionName)) {
    print(`[SKIP] ${collectionName} does not exist`);
    return;
  }
  const col = db.getCollection(collectionName);
  const indexes = col.getIndexes();
  const existing = indexes.find(i => sameKey(i.key, key));
  if (existing) {
    print(`[KEEP] ${collectionName}: existing key ${keyText(key)} uses name ${existing.name}`);
    return;
  }
  const name = col.createIndex(key, options);
  print(`[CREATE] ${collectionName}.${name}`);
}
ensureIndex('NguoiDungNhomNguoiDung', { IdNguoiDung: 1 }, { name: 'idx_phanquyen_assignment_user' });
ensureIndex('NguoiDungNhomNguoiDung', { IdNhomNguoiDung: 1 }, { name: 'idx_phanquyen_assignment_group' });
ensureIndex('NguoiDungNhomNguoiDung', { IdDonViUyQuyenQT: 1 }, { name: 'idx_phanquyen_assignment_anchor', sparse: true });
ensureIndex('NguoiDungNhomNguoiDung', { NgayHetHan: 1 }, { name: 'idx_phanquyen_assignment_expire', sparse: true });
ensureIndex('NguoiDungNhomNguoiDung', { IdNganhDoc: 1 }, { name: 'idx_phanquyen_assignment_multinode' });
ensureIndex('PhanQuyenPhanHeNguoiDung', { IdNguoiDung: 1, MaPhanHe: 1 }, { name: 'idx_phanquyen_user_subsystem_user_module' });
ensureIndex('PhanQuyenPhanHeNhomNguoiDung', { IdNhomNguoiDung: 1, MaPhanHe: 1 }, { name: 'idx_phanquyen_group_subsystem_group_module' });
ensureIndex('PhanQuyenNguoiDung', { IdNguoiDung: 1, MaPhanHe: 1 }, { name: 'idx_phanquyen_user_function_user_module' });
ensureIndex('PhanQuyenNhomNguoiDung', { IdNhomNguoiDung: 1, MaPhanHe: 1 }, { name: 'idx_phanquyen_group_function_group_module' });
ensureIndex('LichSuPhanQuyenScope', { IdNguoiDuocPhanQuyen: 1, NgayThucHien: -1 }, { name: 'idx_lichsu_scope_target_time_desc' });
ensureIndex('LichSuPhanQuyenScope', { IdNguoiThucHien: 1, NgayThucHien: -1 }, { name: 'idx_lichsu_scope_actor_time_desc' });
ensureIndex('LichSuPhanQuyenScope', { NgayHetHanMoi: 1 }, { name: 'idx_lichsu_scope_expire_new', sparse: true });
ensureIndex('NhomChuyenNganh', { DanhSachCn: 1 }, { name: 'idx_nhom_chuyen_nganh_danhsachcn' });
