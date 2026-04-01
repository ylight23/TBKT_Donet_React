/* eslint-disable no-undef */
// Validate DanhMucTrangBi.IDChuyenNganhKT references DanhMucChuyenNganh._id
// Usage: mongosh <connection> Backend/scripts/validate-trangbi-chuyennganh-refs.js

const dbTB = db.getSiblingDB("TCKT_HeSinhThai_Core");
const dbCN = db.getSiblingDB("quanly_dmcanbo");

const validCNIds = dbCN.DanhMucChuyenNganh.distinct("_id");
const validCNSet = new Set(validCNIds);

print(`[INFO] Loaded ${validCNIds.length} chuyen nganh ids`);

const cursor = dbTB.DanhMucTrangBi.find(
  { IDChuyenNganhKT: { $nin: validCNIds } },
  { _id: 1, IDChuyenNganhKT: 1, IDNganh: 1 }
);

let count = 0;
while (cursor.hasNext()) {
  const doc = cursor.next();
  print(`[ORPHAN] _id=${doc._id}, IDChuyenNganhKT=${doc.IDChuyenNganhKT}, IDNganh=${doc.IDNganh}`);
  count += 1;
}

print(`[RESULT] Orphan records: ${count}`);

const mismatchPrefixCursor = dbTB.DanhMucTrangBi.find({}, { _id: 1, IDChuyenNganhKT: 1 });
let mismatchPrefix = 0;
while (mismatchPrefixCursor.hasNext()) {
  const doc = mismatchPrefixCursor.next();
  const prefix = String(doc._id || "").split(".")[0];
  if (prefix !== doc.IDChuyenNganhKT) {
    print(`[MISMATCH_PREFIX] _id=${doc._id}, prefix=${prefix}, IDChuyenNganhKT=${doc.IDChuyenNganhKT}`);
    mismatchPrefix += 1;
  }
}

print(`[RESULT] Prefix mismatches: ${mismatchPrefix}`);
print(`[RESULT] CN ID catalog snapshot: ${JSON.stringify(Array.from(validCNSet))}`);
