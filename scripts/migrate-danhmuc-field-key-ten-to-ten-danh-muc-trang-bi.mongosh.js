/*
 * Rename DynamicField.Key = "ten" -> "ten_danh_muc_trang_bi"
 * only for category-driven runtime forms.
 *
 * Default mode: dry-run
 * Apply mode:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --eval "const APPLY=true" --file scripts/migrate-danhmuc-field-key-ten-to-ten-danh-muc-trang-bi.mongosh.js
 *
 * Dry-run:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-danhmuc-field-key-ten-to-ten-danh-muc-trang-bi.mongosh.js
 */

const APPLY_MODE = typeof APPLY !== 'undefined' && APPLY === true;
const isActive = { Delete: { $ne: true } };
const SOURCE_KEY = 'ten';
const TARGET_KEY = 'ten_danh_muc_trang_bi';
const CATEGORY_KEYS = new Set([
  'ma_danh_muc_trang_bi',
  'ma_dinh_danh',
  'iddanhmuctrangbi',
  'madanhmuctrangbi',
  'ma_danh_muc_trang_bi',
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getFieldSetIdsFromForm(formConfig) {
  const tabs = Array.isArray(formConfig?.Tabs) ? formConfig.Tabs : [];
  return tabs.flatMap((tab) => Array.isArray(tab?.FieldSetIds) ? tab.FieldSetIds : []);
}

const dynamicFields = db.DynamicField.find(
  { ...isActive, Key: SOURCE_KEY },
  { _id: 1, Key: 1, Label: 1, Version: 1, ModifyDate: 1, NguoiSua: 1 },
).toArray();

const fieldSets = db.FieldSet.find(isActive, { _id: 1, Name: 1, FieldIds: 1 }).toArray();
const formConfigs = db.FormConfig.find(isActive, { _id: 1, Key: 1, Name: 1, Tabs: 1 }).toArray();
const allActiveFields = db.DynamicField.find(isActive, { _id: 1, Key: 1 }).toArray();
const activeFieldById = new Map(allActiveFields.map((field) => [String(field._id), field]));

const candidateRows = [];

for (const field of dynamicFields) {
  const fieldId = String(field._id);
  const ownedByFieldSets = fieldSets.filter((fieldSet) => Array.isArray(fieldSet.FieldIds) && fieldSet.FieldIds.some((id) => String(id) === fieldId));
  if (ownedByFieldSets.length === 0) {
    continue;
  }

  const ownedFieldSetIds = new Set(ownedByFieldSets.map((fieldSet) => String(fieldSet._id)));
  const ownedForms = formConfigs.filter((formConfig) => getFieldSetIdsFromForm(formConfig).some((id) => ownedFieldSetIds.has(String(id))));
  if (ownedForms.length === 0) {
    continue;
  }

  const isCategoryDriven = ownedByFieldSets.some((fieldSet) =>
    (fieldSet.FieldIds || []).some((fieldIdRef) => {
      const ref = activeFieldById.get(String(fieldIdRef));
      return ref && CATEGORY_KEYS.has(normalize(ref.Key));
    }),
  ) || ownedForms.some((formConfig) => normalize(formConfig.Key).includes('trang-bi'));

  if (!isCategoryDriven) {
    continue;
  }

  const conflictField = db.DynamicField.findOne(
    {
      ...isActive,
      Key: TARGET_KEY,
      _id: { $ne: field._id },
    },
    { _id: 1, Key: 1, Label: 1 },
  );

  candidateRows.push({
    fieldId,
    currentKey: field.Key,
    nextKey: TARGET_KEY,
    label: field.Label || '',
    conflict: conflictField ? { id: String(conflictField._id), key: conflictField.Key, label: conflictField.Label || '' } : null,
    fieldSets: ownedByFieldSets.map((fieldSet) => ({ id: String(fieldSet._id), name: fieldSet.Name || '' })),
    forms: ownedForms.map((formConfig) => ({ id: String(formConfig._id), key: formConfig.Key || '', name: formConfig.Name || '' })),
  });
}

print(`APPLY_MODE = ${APPLY_MODE}`);
print(`Candidates found: ${candidateRows.length}`);
printjson(candidateRows);

const conflicted = candidateRows.filter((row) => row.conflict);
if (conflicted.length > 0) {
  print('\nMigration stopped because target key already exists for some candidates.');
  printjson(conflicted);
}

if (!APPLY_MODE || conflicted.length > 0 || candidateRows.length === 0) {
  print('\nDry-run finished. No changes written.');
} else {
  let modified = 0;
  const now = new Date();

  for (const row of candidateRows) {
    const result = db.DynamicField.updateOne(
      { _id: row.fieldId, Delete: { $ne: true }, Key: SOURCE_KEY },
      {
        $set: {
          Key: TARGET_KEY,
          ModifyDate: now,
          NguoiSua: 'migration-ten-to-ten_danh_muc_trang_bi',
        },
        $inc: { Version: 1 },
      },
    );
    modified += result.modifiedCount ?? 0;
  }

  print(`\nMigration applied. Modified DynamicField count: ${modified}`);
}
