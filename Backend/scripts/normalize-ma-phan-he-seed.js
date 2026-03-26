print(`Using database: ${db.getName()}`);

const targetMaPhanHe = "TBKT.ThongTin";

const result = db.NhomNguoiDung.updateMany(
  {},
  { $set: { MaPhanHe: targetMaPhanHe } },
);

print("Summary:");
printjson({
  matched: result.matchedCount,
  modified: result.modifiedCount,
  targetMaPhanHe,
});

print("Current mapping:");
printjson(db.NhomNguoiDung.find({}, { _id: 1, Ten: 1, MaPhanHe: 1 }).toArray());
