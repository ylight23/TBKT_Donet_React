/* eslint-disable no-undef */
// Normalize DanhMucTrangBi chuyen nganh fields based on _id prefix.
// Dry run by default. To apply updates use: APPLY=true
// Usage: mongosh <connection> Backend/scripts/normalize-trangbi-chuyennganh.js

const APPLY = String(typeof process !== "undefined" ? process.env.APPLY : "").toLowerCase() === "true";

const dbTB = db.getSiblingDB("TCKT_HeSinhThai_Core");
const dbCN = db.getSiblingDB("quanly_dmcanbo");

const validCNIds = dbCN.DanhMucChuyenNganh.distinct("_id");
const validCNSet = new Set(validCNIds);

let scanned = 0;
let updated = 0;
let invalidPrefix = 0;
let invalidCN = 0;
let invalidIDNganh = 0;

const cursor = dbTB.DanhMucTrangBi.find({}, { _id: 1, IDChuyenNganhKT: 1, IDNganh: 1 });

while (cursor.hasNext()) {
  const doc = cursor.next();
  scanned += 1;

  const id = String(doc._id || "");
  const prefix = id.split(".")[0];
  const currentCN = doc.IDChuyenNganhKT;
  const currentNganh = doc.IDNganh;

  const shouldCN = prefix;
  const shouldNganh = prefix;

  if (!validCNSet.has(shouldCN)) {
    invalidPrefix += 1;
    print(`[INVALID_PREFIX] _id=${id}, prefix=${shouldCN} not found in DanhMucChuyenNganh`);
    continue;
  }

  if (!validCNSet.has(currentCN)) {
    invalidCN += 1;
  }

  if (currentNganh !== currentCN) {
    invalidIDNganh += 1;
  }

  const needUpdate = currentCN !== shouldCN || currentNganh !== shouldNganh;
  if (!needUpdate) continue;

  print(`[FIX] _id=${id}, IDChuyenNganhKT: ${currentCN} -> ${shouldCN}, IDNganh: ${currentNganh} -> ${shouldNganh}`);

  if (APPLY) {
    const res = dbTB.DanhMucTrangBi.updateOne(
      { _id: id },
      { $set: { IDChuyenNganhKT: shouldCN, IDNganh: shouldNganh } }
    );
    if (res.modifiedCount > 0) updated += 1;
  }
}

print(`[SUMMARY] scanned=${scanned}, updated=${updated}, invalidPrefix=${invalidPrefix}, invalidCN=${invalidCN}, invalidIDNganh=${invalidIDNganh}, apply=${APPLY}`);
