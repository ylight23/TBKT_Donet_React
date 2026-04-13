const dbCore = db.getSiblingDB("TCKT_HeSinhThai_Core");
const coll = dbCore.DanhMucTrangBi;

print("Ensuring indexes for TCKT_HeSinhThai_Core.DanhMucTrangBi...");

const idxTreeBrowse = coll.createIndex(
  { IdChuyenNganhKT: 1, IdCapTren: 1, ThuTuSapXep: 1 },
  { name: "idx_tree_browse" }
);
print(`Created/exists: ${idxTreeBrowse}`);

const idxParentNhom = coll.createIndex(
  { IdCapTren: 1, Nhom: 1 },
  { name: "idx_parent_nhom" }
);
print(`Created/exists: ${idxParentNhom}`);

const idxNhomNganhSort = coll.createIndex(
  { Nhom: 1, IdNganh: 1, ThuTuSapXep: 1 },
  { name: "idx_nhom_nganh_sort" }
);
print(`Created/exists: ${idxNhomNganhSort}`);

print("Done.");
