const dbCore = db.getSiblingDB("TCKT_HeSinhThai_Core");
const coll = dbCore.DanhMucTrangBi;

print("Dropping field IDTBKTNhom1 from TCKT_HeSinhThai_Core.DanhMucTrangBi...");

const result = coll.updateMany({}, { $unset: { IDTBKTNhom1: "" } });
print(`Matched: ${result.matchedCount}`);
print(`Modified: ${result.modifiedCount}`);

print("Done.");
