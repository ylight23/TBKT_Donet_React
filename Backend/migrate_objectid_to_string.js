// ============================================================
// MongoDB Migration: Convert ObjectId _id → plain string hex
//
// MongoDB does NOT allow updating _id in place, so each affected
// document is re-inserted with _id = oid.toHexString() then deleted.
//
// Run:
//   mongosh "mongodb://localhost:27017/quanly_dmcanbo" migrate_objectid_to_string.js
// ============================================================

const COLLECTIONS = [
  "NguoiDungNhomNguoiDung",
  "PhanQuyenNguoiDung",
  "PhanQuyenNhomNguoiDung",
  "PhanQuyenPhanHeNguoiDung",
  "PhanQuyenPhanHeNhomNguoiDung",
  "PhanQuyenNguoiDungNganhDoc",
  "PhanQuyenNhomNguoiDungNganhDoc",
  "NhomNguoiDung",
  "LichSuPhanQuyenScope",
];

function convertCollection(colName) {
  const col = db.getCollection(colName);

  // Only target documents whose _id is currently an ObjectId (not already a string)
  const docs = col.find({ _id: { $type: "objectId" } }).toArray();

  if (docs.length === 0) {
    print(`  [SKIP] ${colName} – no ObjectId _id documents found`);
    return;
  }

  let converted = 0;
  let failed = 0;

  docs.forEach(doc => {
    const oldId  = doc._id;               // ObjectId
    const newId  = oldId.toHexString();   // plain string "69b7e04c..."

    // Replace _id with string version
    doc._id = newId;

    try {
      col.insertOne(doc);
      col.deleteOne({ _id: oldId });
      converted++;
    } catch (e) {
      print(`  [ERROR] ${colName} _id=${oldId}: ${e.message}`);
      failed++;
    }
  });

  print(`  [OK]   ${colName}: ${converted} converted, ${failed} failed`);
}

print("\n=== Converting ObjectId _id → string hex ===\n");

COLLECTIONS.forEach(name => {
  print(`Collection: ${name}`);
  convertCollection(name);
});

print("\n=== Done ===\n");
