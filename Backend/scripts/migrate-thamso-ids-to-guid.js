const targetCollections = [
  "DynamicField",
  "FieldSet",
  "FormConfig",
  "DynamicMenu",
  "DynamicMenuDataSource",
  "TemplateLayout",
  "PermissionCatalog",
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

function uniqueStrings(values) {
  return [...new Set((values || []).filter((value) => typeof value === "string" && value.trim() !== ""))];
}

function normalizeDynamicMenuPermissionCode(rawValue, fallbackId) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => /[a-z0-9._-]/.test(ch) ? ch : "_")
    .join("")
    .replace(/^_+|_+$/g, "");

  return normalized || `dynamicmenu_${fallbackId}`;
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

function applyIdMap(ids, map) {
  return uniqueStrings((ids || []).map((id) => map[asIdString(id)] || asIdString(id)));
}

function updateFieldSetDetail(detail, fieldSetIdMap, dynamicFieldIdMap) {
  if (!detail || typeof detail !== "object") return;

  if (detail.FieldSet && typeof detail.FieldSet === "object") {
    const fieldSetId = asIdString(detail.FieldSet.Id);
    if (fieldSetIdMap[fieldSetId]) {
      detail.FieldSet.Id = fieldSetIdMap[fieldSetId];
    }

    if (Array.isArray(detail.FieldSet.FieldIds)) {
      detail.FieldSet.FieldIds = applyIdMap(detail.FieldSet.FieldIds, dynamicFieldIdMap);
    }
  }

  if (Array.isArray(detail.Fields)) {
    for (const field of detail.Fields) {
      if (!field || typeof field !== "object") continue;
      const fieldId = asIdString(field.Id);
      if (dynamicFieldIdMap[fieldId]) {
        field.Id = dynamicFieldIdMap[fieldId];
      }
    }
  }
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

function replaceAllDocuments(name, transformedDocs) {
  const collection = db.getCollection(name);
  collection.deleteMany({});

  const docs = transformedDocs.map((doc) => {
    const nextDoc = cloneDoc(doc);
    delete nextDoc.__oldId;
    return nextDoc;
  });

  if (docs.length > 0) {
    collection.insertMany(docs);
  }

  return {
    inserted: docs.length,
    replaced: 0,
    deleted: 0,
    finalCount: collection.countDocuments(),
  };
}

const suffix = timestampLabel();
const backups = {};
for (const name of targetCollections) {
  backups[name] = backupCollection(name, suffix);
}

const dynamicFieldDocs = db.DynamicField.find().toArray();
const fieldSetDocs = db.FieldSet.find().toArray();
const formConfigDocs = db.FormConfig.find().toArray();
const dynamicMenuDocs = db.DynamicMenu.find().toArray();
const dynamicMenuDataSourceDocs = db.DynamicMenuDataSource.find().toArray();
const templateLayoutDocs = db.TemplateLayout.find().toArray();
const permissionCatalogDocs = db.PermissionCatalog.find().toArray();

const dynamicFieldIdMap = buildIdMap(dynamicFieldDocs);
const fieldSetIdMap = buildIdMap(fieldSetDocs);
const formConfigIdMap = buildIdMap(formConfigDocs);
const dynamicMenuIdMap = buildIdMap(dynamicMenuDocs);
const dynamicMenuDataSourceIdMap = buildIdMap(dynamicMenuDataSourceDocs);
const templateLayoutIdMap = buildIdMap(templateLayoutDocs);
const permissionCatalogIdMap = buildIdMap(permissionCatalogDocs);

const dynamicMenuCodeMap = {};
for (const doc of dynamicMenuDocs) {
  const oldId = asIdString(doc._id);
  const newId = dynamicMenuIdMap[oldId] || oldId;
  const oldCode = normalizeDynamicMenuPermissionCode(doc.PermissionCode, oldId);
  const newCode = `dynamicmenu_${newId}`;
  dynamicMenuCodeMap[oldCode] = newCode;
}

const transformedDynamicFields = dynamicFieldDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = dynamicFieldIdMap[oldId] || oldId;
  return nextDoc;
});

const transformedFieldSets = fieldSetDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = fieldSetIdMap[oldId] || oldId;
  nextDoc.FieldIds = applyIdMap(nextDoc.FieldIds, dynamicFieldIdMap);

  if (Array.isArray(nextDoc.Fields)) {
    for (const field of nextDoc.Fields) {
      if (!field || typeof field !== "object") continue;
      const fieldId = asIdString(field.Id);
      if (dynamicFieldIdMap[fieldId]) {
        field.Id = dynamicFieldIdMap[fieldId];
      }
    }
  }

  return nextDoc;
});

const transformedFormConfigs = formConfigDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = formConfigIdMap[oldId] || oldId;

  if (Array.isArray(nextDoc.Tabs)) {
    for (const tab of nextDoc.Tabs) {
      if (!tab || typeof tab !== "object") continue;
      if (Array.isArray(tab.FieldSetIds)) {
        tab.FieldSetIds = applyIdMap(tab.FieldSetIds, fieldSetIdMap);
      }
      if (Array.isArray(tab.FieldSets)) {
        for (const detail of tab.FieldSets) {
          updateFieldSetDetail(detail, fieldSetIdMap, dynamicFieldIdMap);
        }
      }
    }
  }

  return nextDoc;
});

const transformedDynamicMenuDataSources = dynamicMenuDataSourceDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = dynamicMenuDataSourceIdMap[oldId] || oldId;
  return nextDoc;
});

const transformedDynamicMenus = dynamicMenuDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const newId = dynamicMenuIdMap[oldId] || oldId;
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = newId;
  nextDoc.Active = `menuDong_${newId}`;
  nextDoc.PermissionCode = `dynamicmenu_${newId}`;
  return nextDoc;
});

const transformedTemplateLayouts = templateLayoutDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = templateLayoutIdMap[oldId] || oldId;
  return nextDoc;
});

const transformedPermissionCatalog = permissionCatalogDocs.map((doc) => {
  const oldId = asIdString(doc._id);
  const nextDoc = cloneDoc(doc);
  nextDoc.__oldId = oldId;
  nextDoc._id = permissionCatalogIdMap[oldId] || oldId;

  const code = String(nextDoc.Code || "");
  if (dynamicMenuCodeMap[code]) {
    nextDoc.Code = dynamicMenuCodeMap[code];
  }

  return nextDoc;
});

const results = {};
results.DynamicField = migrateCollection("DynamicField", transformedDynamicFields);
results.FieldSet = migrateCollection("FieldSet", transformedFieldSets);
results.FormConfig = migrateCollection("FormConfig", transformedFormConfigs);
results.DynamicMenuDataSource = migrateCollection("DynamicMenuDataSource", transformedDynamicMenuDataSources);
results.DynamicMenu = migrateCollection("DynamicMenu", transformedDynamicMenus);
results.TemplateLayout = migrateCollection("TemplateLayout", transformedTemplateLayouts);
results.PermissionCatalog = replaceAllDocuments("PermissionCatalog", transformedPermissionCatalog);

printjson({
  backups,
  migratedCounts: {
    DynamicField: Object.keys(dynamicFieldIdMap).length,
    FieldSet: Object.keys(fieldSetIdMap).length,
    FormConfig: Object.keys(formConfigIdMap).length,
    DynamicMenu: Object.keys(dynamicMenuIdMap).length,
    DynamicMenuDataSource: Object.keys(dynamicMenuDataSourceIdMap).length,
    TemplateLayout: Object.keys(templateLayoutIdMap).length,
    PermissionCatalog: Object.keys(permissionCatalogIdMap).length,
  },
  results,
});
