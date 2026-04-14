const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);
const col = database.getCollection('DynamicField');

function toProtoTimestamp(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms - seconds * 1000) * 1000000);
  return {
    Seconds: NumberLong(String(seconds)),
    Nanos: NumberInt(String(nanos)),
  };
}

function normalizeKey(raw) {
  const lowered = String(raw || '').toLowerCase().trim();
  return lowered
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');
}

const forceRenameById = {
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1002': 'ten_danh_muc',
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1003': 'ma_danh_muc',
};

const forceRenameByKey = {
  ten: 'ten_danh_muc',
  tendanhmuc: 'ten_danh_muc',
  ten_danh_muc_trang_bi: 'ten_danh_muc',
  madanhmuctrangbi: 'ma_danh_muc',
  ma_danh_muc_trang_bi: 'ma_danh_muc',
  ma_dinh_danh: 'ma_danh_muc',
};

const now = new Date();
const docs = col.find({ Delete: { $ne: true } }).toArray();

const candidates = docs.map((doc) => {
  const id = String(doc._id || '').trim();
  const currentKey = String(doc.Key || '').trim();
  const normalized = normalizeKey(currentKey);
  const forcedById = forceRenameById[id];
  const forcedByKey = forceRenameByKey[normalized];
  const targetKey = forcedById || forcedByKey || normalized;
  return { id, currentKey, targetKey };
});

const buckets = {};
for (const item of candidates) {
  if (!item.targetKey) continue;
  if (!buckets[item.targetKey]) buckets[item.targetKey] = [];
  buckets[item.targetKey].push(item.id);
}

const duplicateTargets = Object.entries(buckets)
  .filter(([, ids]) => ids.length > 1)
  .map(([key, ids]) => ({ key, ids }));

const duplicateIdSet = new Set(duplicateTargets.flatMap((x) => x.ids));

let updated = 0;
let skippedDuplicate = 0;
for (const item of candidates) {
  if (!item.targetKey) continue;
  if (duplicateIdSet.has(item.id)) {
    skippedDuplicate += 1;
    continue;
  }

  if (item.currentKey === item.targetKey) continue;

  const updateDoc = {
    Key: item.targetKey,
    ModifyDate: toProtoTimestamp(now),
    NguoiSua: 'normalize-dynamicfield-keys',
  };

  if (item.id === '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1002') {
    updateDoc.Label = 'Ten danh muc';
  }

  if (item.id === '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1003') {
    updateDoc.Label = 'Ma danh muc';
  }

  const result = col.updateOne(
    { _id: item.id },
    { $set: updateDoc },
  );

  if (result.modifiedCount > 0) updated += 1;
}

printjson({
  dbName,
  total: docs.length,
  updated,
  skippedDuplicate,
  duplicateTargets,
});
