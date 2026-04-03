function asIdString(value) {
  return value == null ? "" : String(value);
}

const oldCapBac = db.getCollection("CapBac__backup_guid_20260324142415").find({}, { _id: 1, Ten: 1 }).toArray();
const newCapBac = db.getCollection("CapBac").find({}, { _id: 1, Ten: 1 }).toArray();

const oldIdToTen = {};
for (const doc of oldCapBac) {
  oldIdToTen[asIdString(doc._id)] = String(doc.Ten || "");
}

const tenToNewId = {};
for (const doc of newCapBac) {
  tenToNewId[String(doc.Ten || "")] = asIdString(doc._id);
}

let modified = 0;
let inspected = 0;
const missingMappings = [];

db.getCollection("Employee").find({}, { _id: 1, IdCapBac: 1 }).forEach((doc) => {
  inspected += 1;
  const current = asIdString(doc.IdCapBac);
  if (!current) return;

  const ten = oldIdToTen[current];
  if (!ten) return;

  const nextId = tenToNewId[ten];
  if (!nextId) {
    missingMappings.push({ employeeId: asIdString(doc._id), oldCapBacId: current, ten });
    return;
  }

  if (nextId === current) return;

  const result = db.getCollection("Employee").updateOne(
    { _id: doc._id },
    { $set: { IdCapBac: nextId } }
  );

  modified += result.modifiedCount || 0;
});

printjson({
  inspected,
  modified,
  missingMappings,
});
