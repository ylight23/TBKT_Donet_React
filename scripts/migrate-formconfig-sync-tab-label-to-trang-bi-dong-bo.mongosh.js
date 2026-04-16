/*
  Migration: normalize + ensure synchronization tab labels in FormConfig

  Goal:
  - Store the canonical tab label "Danh sách trang bị đồng bộ" in MongoDB.
  - Ensure both equipment entry forms (`trang-bi-nhom-1`, `trang-bi-nhom-2`)
    contain that tab.
  - Normalize tab `_id` values to GUID strings for touched Mongo data.
*/

const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);
const collection = database.getCollection('FormConfig');

const ACTOR = 'migrate-formconfig-sync-tab-label';
const TARGET_LABEL = 'Danh sách trang bị đồng bộ';
const TARGET_FORM_KEYS = ['trang-bi-nhom-1', 'trang-bi-nhom-2'];

const LEGACY_SYNC_LABELS = new Set([
  'danh sach trang bi dong bo',
  'nhom dong bo',
  'bo dong bo',
  'dong bo',
  'trang bi dong bo',
]);

const PLACEHOLDER_LABELS_BY_FORM = {
  'trang-bi-nhom-2': new Set(['tab 2']),
};

function randomHex(length) {
  let output = '';
  while (output.length < length) {
    output += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  }
  return output.slice(0, length);
}

function newGuid() {
  return [
    randomHex(8),
    randomHex(4),
    randomHex(4),
    randomHex(4),
    randomHex(12),
  ].join('-');
}

function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? '').trim());
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toProtoTimestamp(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms - seconds * 1000) * 1000000);
  return {
    Seconds: NumberLong(String(seconds)),
    Nanos: NumberInt(String(nanos)),
  };
}

const now = new Date();
const nowTs = toProtoTimestamp(now);

const docs = collection.find(
  {
    Key: { $in: TARGET_FORM_KEYS },
    Delete: { $ne: true },
  },
  {
    _id: 1,
    Key: 1,
    Name: 1,
    Tabs: 1,
    Version: 1,
  },
).toArray();

const result = {
  scanned: docs.length,
  matchedTabs: 0,
  modifiedForms: 0,
  forms: [],
};

for (const doc of docs) {
  const key = String(doc.Key ?? '').trim();
  const placeholderLabels = PLACEHOLDER_LABELS_BY_FORM[key] ?? new Set();
  const tabs = Array.isArray(doc.Tabs) ? doc.Tabs : [];
  const hasCanonicalTab = tabs.some((tab) => normalizeText(tab?.Label) === normalizeText(TARGET_LABEL));

  let changed = false;
  let nextTabs = tabs.map((tab) => {
    const currentLabel = String(tab?.Label ?? '');
    const normalized = normalizeText(currentLabel);
    const shouldRenameFromLegacy = LEGACY_SYNC_LABELS.has(normalized);
    const shouldRenameFromPlaceholder = !hasCanonicalTab && placeholderLabels.has(normalized);
    const nextId = isGuid(tab?._id) ? String(tab._id) : newGuid();

    if (nextId !== String(tab?._id ?? '')) {
      changed = true;
    }

    if (!shouldRenameFromLegacy && !shouldRenameFromPlaceholder) {
      return {
        ...tab,
        _id: nextId,
      };
    }

    result.matchedTabs += 1;
    changed = true;

    return {
      ...tab,
      _id: nextId,
      Label: TARGET_LABEL,
    };
  });

  const hasCanonicalAfterRename = nextTabs.some((tab) => normalizeText(tab?.Label) === normalizeText(TARGET_LABEL));
  if (!hasCanonicalAfterRename) {
    nextTabs = [
      ...nextTabs,
      {
        _id: newGuid(),
        Label: TARGET_LABEL,
        FieldSetIds: [],
      },
    ];
    result.matchedTabs += 1;
    changed = true;
  }

  if (!changed) {
    continue;
  }

  const nextVersion = Math.max(Number(doc.Version ?? 0), 0) + 1;
  const updateResult = collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        Tabs: nextTabs,
        ModifyDate: nowTs,
        NguoiSua: ACTOR,
        Version: nextVersion,
      },
    },
  );

  result.modifiedForms += updateResult.modifiedCount;
  result.forms.push({
    _id: doc._id,
    Key: key,
    Name: doc.Name ?? '',
    Version: nextVersion,
    Tabs: nextTabs.map((tab) => ({
      _id: tab?._id,
      Label: tab?.Label,
    })),
  });
}

printjson(result);
