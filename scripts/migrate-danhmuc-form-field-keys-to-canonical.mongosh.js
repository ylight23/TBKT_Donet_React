/*
 * Normalize category field keys in DynamicField from legacy names to canonical names:
 *   ma_dinh_danh -> ma_danh_muc
 *   ten_danh_muc_trang_bi -> ten_danh_muc
 *
 * Default mode: dry-run
 *
 * Apply:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --eval "const APPLY=true" --file scripts/migrate-danhmuc-form-field-keys-to-canonical.mongosh.js
 *
 * Dry-run:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-danhmuc-form-field-keys-to-canonical.mongosh.js
 */

const APPLY_MODE = typeof APPLY !== 'undefined' && APPLY === true;
const DB_NAME = 'quanly_dmcanbo';
const database = db.getSiblingDB(DB_NAME);
const isActive = { Delete: { $ne: true } };

const RENAME_RULES = [
  {
    sourceKeys: ['ma_dinh_danh', 'ma_danh_muc_trang_bi', 'iddanhmuctrangbi', 'madanhmuctrangbi'],
    targetKey: 'ma_danh_muc',
    targetLabel: 'Ma danh muc',
  },
  {
    sourceKeys: ['ten_danh_muc_trang_bi', 'ten', 'tendanhmuc'],
    targetKey: 'ten_danh_muc',
    targetLabel: 'Ten danh muc',
  },
];

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
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

function getFieldSetIdsFromForm(formConfig) {
  const tabs = Array.isArray(formConfig?.Tabs) ? formConfig.Tabs : [];
  return tabs.flatMap((tab) => Array.isArray(tab?.FieldSetIds) ? tab.FieldSetIds : []);
}

const dynamicFields = database.DynamicField.find(
  isActive,
  { _id: 1, Key: 1, Label: 1, Version: 1 },
).toArray();
const fieldSets = database.FieldSet.find(
  isActive,
  { _id: 1, Name: 1, FieldIds: 1 },
).toArray();
const formConfigs = database.FormConfig.find(
  isActive,
  { _id: 1, Key: 1, Name: 1, Tabs: 1 },
).toArray();

const fieldById = new Map(dynamicFields.map((field) => [String(field._id), field]));

const candidateRows = [];

for (const rule of RENAME_RULES) {
  const sourceKeySet = new Set(rule.sourceKeys.map(normalize));
  const matchingFields = dynamicFields.filter((field) => sourceKeySet.has(normalize(field.Key)));

  for (const field of matchingFields) {
    const fieldId = String(field._id);
    const ownedByFieldSets = fieldSets.filter((fieldSet) =>
      Array.isArray(fieldSet.FieldIds) && fieldSet.FieldIds.some((id) => String(id) === fieldId),
    );
    const ownedFieldSetIds = new Set(ownedByFieldSets.map((fieldSet) => String(fieldSet._id)));
    const ownedForms = formConfigs.filter((formConfig) =>
      getFieldSetIdsFromForm(formConfig).some((id) => ownedFieldSetIds.has(String(id))),
    );

    const conflictField = database.DynamicField.findOne(
      {
        ...isActive,
        _id: { $ne: field._id },
        Key: rule.targetKey,
      },
      { _id: 1, Key: 1, Label: 1 },
    );

    candidateRows.push({
      fieldId,
      currentKey: field.Key || '',
      currentLabel: field.Label || '',
      nextKey: rule.targetKey,
      nextLabel: rule.targetLabel,
      conflict: conflictField
        ? {
            id: String(conflictField._id),
            key: conflictField.Key || '',
            label: conflictField.Label || '',
          }
        : null,
      fieldSets: ownedByFieldSets.map((fieldSet) => ({
        id: String(fieldSet._id),
        name: fieldSet.Name || '',
      })),
      forms: ownedForms.map((formConfig) => ({
        id: String(formConfig._id),
        key: formConfig.Key || '',
        name: formConfig.Name || '',
      })),
    });
  }
}

const conflicted = candidateRows.filter((row) => row.conflict);

print(`DB_NAME = ${DB_NAME}`);
print(`APPLY_MODE = ${APPLY_MODE}`);
print(`Candidates found: ${candidateRows.length}`);
printjson(candidateRows);

if (conflicted.length > 0) {
  print('\nMigration stopped because target key already exists for some candidates.');
  printjson(conflicted);
}

if (!APPLY_MODE || conflicted.length > 0 || candidateRows.length === 0) {
  print('\nDry-run finished. No changes written.');
} else {
  const now = new Date();
  const nowTs = toProtoTimestamp(now);
  let modified = 0;

  for (const row of candidateRows) {
    const existing = fieldById.get(row.fieldId);
    if (!existing) continue;
    if (normalize(existing.Key) === normalize(row.nextKey) && String(existing.Label || '').trim() === row.nextLabel) {
      continue;
    }

    const result = database.DynamicField.updateOne(
      { _id: row.fieldId, Delete: { $ne: true } },
      {
        $set: {
          Key: row.nextKey,
          Label: row.nextLabel,
          ModifyDate: nowTs,
          NguoiSua: 'migration-danhmuc-form-field-keys-to-canonical',
        },
        $inc: { Version: 1 },
      },
    );

    modified += result.modifiedCount ?? 0;
  }

  print(`\nMigration applied. Modified DynamicField count: ${modified}`);
}
