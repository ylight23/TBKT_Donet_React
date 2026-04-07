/*
Phase migration script:
- Source legacy collection: Catalog_DanhMucTrangBi
- Target dedicated collection: DanhMucTrangBi
- Read-only bridge is active in backend service for safety.
*/

const dbName = db.getName();
const sourceName = "Catalog_DanhMucTrangBi";
const targetName = "DanhMucTrangBi";

const source = db.getCollection(sourceName);
const target = db.getCollection(targetName);

const sourceExists = db.getCollectionNames().includes(sourceName);
if (!sourceExists) {
  print(`[skip] ${sourceName} does not exist in db '${dbName}'.`);
  quit(0);
}

let scanned = 0;
let inserted = 0;
let updated = 0;
let skipped = 0;

source.find({}).forEach((doc) => {
  scanned += 1;
  const id = doc._id;
  if (id === undefined || id === null || String(id).trim() === "") {
    skipped += 1;
    return;
  }

  const existing = target.findOne({ _id: id }, { projection: { _id: 1 } });
  if (!existing) {
    target.insertOne(doc);
    inserted += 1;
    return;
  }

  target.replaceOne({ _id: id }, doc);
  updated += 1;
});

print(`[done] db=${dbName}, scanned=${scanned}, inserted=${inserted}, updated=${updated}, skipped=${skipped}`);

