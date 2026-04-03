const targetCollections = [
  "NhomNguoiDung",
  "NguoiDungNhomNguoiDung",
  "PhanQuyenPhanHeNguoiDung",
  "PhanQuyenPhanHeNhomNguoiDung",
  "PhanQuyenNguoiDung",
  "PhanQuyenNhomNguoiDung",
  "PhanQuyenNguoiDungNganhDoc",
  "PhanQuyenNhomNguoiDungNganhDoc",
  "LichSuPhanQuyenScope",
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

function buildIdMap(docs) {
  const map = {};
  for (const doc of docs) {
    const id = asIdString(doc._id);
    if (!id || isGuidString(id)) continue;
    map[id] = generateGuid();
  }
  return map;
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

function remapGroupRef(value, groupIdMap) {
  const id = asIdString(value);
  if (!id) return value;
  return groupIdMap[id] || id;
}

function nullIfMissingUser(value, employeeIdSet, missingUserIds) {
  const id = asIdString(value);
  if (!id) return value;
  if (employeeIdSet.has(id)) return id;
  missingUserIds.add(id);
  return null;
}

const suffix = timestampLabel();
const backups = {};
for (const name of targetCollections) {
  backups[name] = backupCollection(name, suffix);
}

const nhomDocs = db.NhomNguoiDung.find().toArray();
const memberDocs = db.NguoiDungNhomNguoiDung.find().toArray();
const phanHeUserDocs = db.PhanQuyenPhanHeNguoiDung.find().toArray();
const phanHeGroupDocs = db.PhanQuyenPhanHeNhomNguoiDung.find().toArray();
const permissionUserDocs = db.PhanQuyenNguoiDung.find().toArray();
const permissionGroupDocs = db.PhanQuyenNhomNguoiDung.find().toArray();
const verticalUserDocs = db.PhanQuyenNguoiDungNganhDoc.find().toArray();
const verticalGroupDocs = db.PhanQuyenNhomNguoiDungNganhDoc.find().toArray();
const historyDocs = db.LichSuPhanQuyenScope.find().toArray();
const employeeIdSet = new Set(db.Employee.find({}, { _id: 1 }).toArray().map((doc) => asIdString(doc._id)));

const nhomIdMap = buildIdMap(nhomDocs);
const memberIdMap = buildIdMap(memberDocs);
const phanHeUserIdMap = buildIdMap(phanHeUserDocs);
const phanHeGroupIdMap = buildIdMap(phanHeGroupDocs);
const permissionUserIdMap = buildIdMap(permissionUserDocs);
const permissionGroupIdMap = buildIdMap(permissionGroupDocs);
const verticalUserIdMap = buildIdMap(verticalUserDocs);
const verticalGroupIdMap = buildIdMap(verticalGroupDocs);
const historyIdMap = buildIdMap(historyDocs);

const missingUserIds = new Set();

const transformedNhomDocs = nhomDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = nhomIdMap[oldId] || oldId;

  if (nextDoc.ClonedFromId != null) {
    nextDoc.ClonedFromId = remapGroupRef(nextDoc.ClonedFromId, nhomIdMap);
  }

  return nextDoc;
});

const transformedMemberDocs = memberDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = memberIdMap[oldId] || oldId;
  nextDoc.IdNhomNguoiDung = remapGroupRef(nextDoc.IdNhomNguoiDung, nhomIdMap);
  nextDoc.IdNguoiDung = nullIfMissingUser(nextDoc.IdNguoiDung, employeeIdSet, missingUserIds);
  nextDoc.IdNguoiUyQuyen = nullIfMissingUser(nextDoc.IdNguoiUyQuyen, employeeIdSet, missingUserIds);
  return nextDoc;
});

const transformedPhanHeUserDocs = phanHeUserDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = phanHeUserIdMap[oldId] || oldId;
  nextDoc.IdNguoiDung = nullIfMissingUser(nextDoc.IdNguoiDung, employeeIdSet, missingUserIds);
  return nextDoc;
});

const transformedPhanHeGroupDocs = phanHeGroupDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = phanHeGroupIdMap[oldId] || oldId;
  nextDoc.IdNhomNguoiDung = remapGroupRef(nextDoc.IdNhomNguoiDung, nhomIdMap);
  return nextDoc;
});

const transformedPermissionUserDocs = permissionUserDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = permissionUserIdMap[oldId] || oldId;
  nextDoc.IdNguoiDung = nullIfMissingUser(nextDoc.IdNguoiDung, employeeIdSet, missingUserIds);
  return nextDoc;
});

const transformedPermissionGroupDocs = permissionGroupDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = permissionGroupIdMap[oldId] || oldId;
  nextDoc.IdNhomNguoiDung = remapGroupRef(nextDoc.IdNhomNguoiDung, nhomIdMap);
  return nextDoc;
});

const transformedVerticalUserDocs = verticalUserDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = verticalUserIdMap[oldId] || oldId;
  nextDoc.IdNguoiDung = nullIfMissingUser(nextDoc.IdNguoiDung, employeeIdSet, missingUserIds);
  return nextDoc;
});

const transformedVerticalGroupDocs = verticalGroupDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = verticalGroupIdMap[oldId] || oldId;
  nextDoc.IdNhomNguoiDung = remapGroupRef(nextDoc.IdNhomNguoiDung, nhomIdMap);
  return nextDoc;
});

const transformedHistoryDocs = historyDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = historyIdMap[oldId] || oldId;
  nextDoc.IdNhomNguoiDung = remapGroupRef(nextDoc.IdNhomNguoiDung, nhomIdMap);
  nextDoc.IdNguoiDuocPhanQuyen = nullIfMissingUser(nextDoc.IdNguoiDuocPhanQuyen, employeeIdSet, missingUserIds);
  nextDoc.IdNguoiThucHien = nullIfMissingUser(nextDoc.IdNguoiThucHien, employeeIdSet, missingUserIds);
  nextDoc.IdNguoiUyQuyenCu = nullIfMissingUser(nextDoc.IdNguoiUyQuyenCu, employeeIdSet, missingUserIds);
  nextDoc.IdNguoiUyQuyenMoi = nullIfMissingUser(nextDoc.IdNguoiUyQuyenMoi, employeeIdSet, missingUserIds);
  return nextDoc;
});

const results = {};
results.NhomNguoiDung = migrateCollection("NhomNguoiDung", transformedNhomDocs);
results.NguoiDungNhomNguoiDung = migrateCollection("NguoiDungNhomNguoiDung", transformedMemberDocs);
results.PhanQuyenPhanHeNguoiDung = migrateCollection("PhanQuyenPhanHeNguoiDung", transformedPhanHeUserDocs);
results.PhanQuyenPhanHeNhomNguoiDung = migrateCollection("PhanQuyenPhanHeNhomNguoiDung", transformedPhanHeGroupDocs);
results.PhanQuyenNguoiDung = migrateCollection("PhanQuyenNguoiDung", transformedPermissionUserDocs);
results.PhanQuyenNhomNguoiDung = migrateCollection("PhanQuyenNhomNguoiDung", transformedPermissionGroupDocs);
results.PhanQuyenNguoiDungNganhDoc = migrateCollection("PhanQuyenNguoiDungNganhDoc", transformedVerticalUserDocs);
results.PhanQuyenNhomNguoiDungNganhDoc = migrateCollection("PhanQuyenNhomNguoiDungNganhDoc", transformedVerticalGroupDocs);
results.LichSuPhanQuyenScope = migrateCollection("LichSuPhanQuyenScope", transformedHistoryDocs);

printjson({
  backups,
  migratedCounts: {
    NhomNguoiDung: Object.keys(nhomIdMap).length,
    NguoiDungNhomNguoiDung: Object.keys(memberIdMap).length,
    PhanQuyenPhanHeNguoiDung: Object.keys(phanHeUserIdMap).length,
    PhanQuyenPhanHeNhomNguoiDung: Object.keys(phanHeGroupIdMap).length,
    PhanQuyenNguoiDung: Object.keys(permissionUserIdMap).length,
    PhanQuyenNhomNguoiDung: Object.keys(permissionGroupIdMap).length,
    PhanQuyenNguoiDungNganhDoc: Object.keys(verticalUserIdMap).length,
    PhanQuyenNhomNguoiDungNganhDoc: Object.keys(verticalGroupIdMap).length,
    LichSuPhanQuyenScope: Object.keys(historyIdMap).length,
  },
  clearedMissingUserRefs: Array.from(missingUserIds),
  results,
});
