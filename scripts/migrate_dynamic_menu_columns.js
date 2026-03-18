// Migration: DynamicMenu.ColumnKeys + ColumnNames → Columns
// Run: mongosh "mongodb://localhost:27017/quanly_dmcanbo" migrate_dynamic_menu_columns.js
//
// This converts the legacy parallel arrays:
//   { ColumnKeys: ["id","name"], ColumnNames: ["Mã","Tên"] }
// into the new atomic array:
//   { Columns: [{ Key: "id", Name: "Mã" }, { Key: "name", Name: "Tên" }] }
//
// Safe to run multiple times (idempotent).

const coll = db.getCollection("DynamicMenu");

const docs = coll.find({
  ColumnKeys: { $exists: true },
  Columns: { $exists: false },
}).toArray();

print(`Found ${docs.length} document(s) to migrate`);

let updated = 0;
for (const doc of docs) {
  const keys = doc.ColumnKeys || [];
  const names = doc.ColumnNames || [];
  const len = Math.max(keys.length, names.length);
  const columns = [];
  for (let i = 0; i < len; i++) {
    columns.push({
      Key: (keys[i] || "id").trim(),
      Name: (names[i] || `Cot ${i + 1}`).trim(),
    });
  }

  coll.updateOne(
    { _id: doc._id },
    {
      $set: { Columns: columns },
      $unset: { ColumnKeys: "", ColumnNames: "" },
    }
  );
  updated++;
  print(`  Migrated ${doc._id} (${doc.Title || "untitled"}): ${columns.length} column(s)`);
}

print(`\nDone. ${updated} document(s) migrated.`);
