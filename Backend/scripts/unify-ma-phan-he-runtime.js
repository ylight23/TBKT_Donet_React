print(`Using database: ${db.getName()}`);

const targetMaPhanHe = "TBKT.ThongTin";
const collections = [
  "NhomNguoiDung",
  "PhanQuyenNguoiDung",
  "PhanQuyenNhomNguoiDung",
  "PhanQuyenPhanHeNguoiDung",
  "PhanQuyenPhanHeNhomNguoiDung",
  "UserPermission",
  "LichSuPhanQuyenScope",
];

const summary = {};

for (const name of collections) {
  if (!db.getCollectionNames().includes(name)) {
    summary[name] = { skipped: true };
    continue;
  }

  const result = db.getCollection(name).updateMany(
    { MaPhanHe: { $exists: true, $nin: [null, "", targetMaPhanHe] } },
    { $set: { MaPhanHe: targetMaPhanHe } },
  );

  summary[name] = {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  };
}

print("Summary:");
printjson(summary);
