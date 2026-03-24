const targetCollections = [
  "CapBac",
  "Employee",
];

function asIdString(value) {
  return value == null ? "" : String(value);
}

function isGuidString(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const rand = Math.random() * 16 | 0;
    const value = ch === "x" ? rand : ((rand & 0x3) | 0x8);
    return value.toString(16);
  });
}

function cloneDoc(doc) {
  return EJSON.parse(EJSON.stringify(doc));
}

function timestampLabel() {
  const now = new Date();
  const parts = [
    now.getFullYear().toString().padStart(4, "0"),
    (now.getMonth() + 1).toString().padStart(2, "0"),
    now.getDate().toString().padStart(2, "0"),
    now.getHours().toString().padStart(2, "0"),
    now.getMinutes().toString().padStart(2, "0"),
    now.getSeconds().toString().padStart(2, "0"),
  ];
  return parts.join("");
}

function backupCollection(name, suffix) {
  const backupName = `${name}__backup_guid_${suffix}`;
  if (db.getCollectionNames().includes(backupName)) {
    throw new Error(`Backup collection already exists: ${backupName}`);
  }

  db.getCollection(name).aggregate([
    { $match: {} },
    { $out: backupName },
  ]);

  return backupName;
}

function migrateCollection(name, transformedDocs) {
  const collection = db.getCollection(name);
  const oldDocs = collection.find().toArray();
  const oldDocsById = {};
  for (const doc of oldDocs) {
    oldDocsById[asIdString(doc._id)] = doc;
  }

  let inserted = 0;
  let replaced = 0;
  const deleteIds = [];

  for (const nextDoc of transformedDocs) {
    const oldId = asIdString(nextDoc.__oldId);
    delete nextDoc.__oldId;
    const newId = asIdString(nextDoc._id);

    if (!oldDocsById[oldId]) {
      throw new Error(`Missing original document for ${name}:${oldId}`);
    }

    if (oldId === newId) {
      collection.replaceOne({ _id: oldDocsById[oldId]._id }, nextDoc, { upsert: true });
      replaced += 1;
      continue;
    }

    collection.insertOne(nextDoc);
    deleteIds.push(oldDocsById[oldId]._id);
    inserted += 1;
  }

  if (deleteIds.length > 0) {
    collection.deleteMany({ _id: { $in: deleteIds } });
  }

  return {
    inserted,
    replaced,
    deleted: deleteIds.length,
    finalCount: collection.countDocuments(),
  };
}

const suffix = timestampLabel();
const backups = {};
for (const name of targetCollections) {
  backups[name] = backupCollection(name, suffix);
}

const capBacDocs = db.CapBac.find().toArray();
const employeeDocs = db.Employee.find().toArray();

const capBacIdMap = {};
for (const doc of capBacDocs) {
  const id = asIdString(doc._id);
  if (!id) continue;
  capBacIdMap[id] = generateGuid();
}

const transformedCapBacDocs = capBacDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = capBacIdMap[oldId];
  return nextDoc;
});

const transformedEmployeeDocs = employeeDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  if (nextDoc.IdCapBac != null) {
    const currentCapBacId = asIdString(nextDoc.IdCapBac);
    nextDoc.IdCapBac = capBacIdMap[currentCapBacId] || nextDoc.IdCapBac;
  }
  return nextDoc;
});

const results = {};
results.CapBac = migrateCollection("CapBac", transformedCapBacDocs);
results.Employee = migrateCollection("Employee", transformedEmployeeDocs);

printjson({
  backups,
  migratedCounts: {
    CapBac: Object.keys(capBacIdMap).length,
  },
  results,
});
