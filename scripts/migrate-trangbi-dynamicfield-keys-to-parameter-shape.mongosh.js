/*
 * Normalize DynamicField.Key used by TrangBi runtime forms so edit forms bind
 * correctly to canonical Parameters returned by backend.
 *
 * Scope:
 *   - Only DynamicField referenced by FormConfig keys like `trangbi-*` / `trang-bi-*`
 *   - Only parameter-backed fields are renamed
 *   - Top-level fields are preserved:
 *       ma_danh_muc, ten_danh_muc, IdCapTren, IdChuyenNganhKT, IdNganh
 *
 * Why:
 *   Grid/read-model already uses canonical snake_case data such as:
 *     so_hieu, don_vi_quan_ly, trang_thai, hang_san_xuat, ...
 *   But many DynamicField.Key values are still legacy PascalCase/camelCase:
 *     SoSerial, DonViQuanLy, HangSanXuat, I101BanKinhQuet, ...
 *   Edit form loads `record.parameters` directly, so these fields stay blank
 *   until DynamicField.Key is aligned with canonical parameter keys.
 *
 * Apply:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --eval "const APPLY=true" --file scripts/migrate-trangbi-dynamicfield-keys-to-parameter-shape.mongosh.js
 *
 * Dry-run:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-trangbi-dynamicfield-keys-to-parameter-shape.mongosh.js
 */

const APPLY_MODE = typeof APPLY !== 'undefined' && APPLY === true;
const DB_NAME = 'quanly_dmcanbo';
const database = db.getSiblingDB(DB_NAME);
const isActive = { Delete: { $ne: true } };

const FORM_KEY_PATTERNS = [/^trangbi-/i, /^trang-bi-/i];

const TOP_LEVEL_KEYS = new Set([
  'ma_danh_muc',
  'ten_danh_muc',
  'idcaptren',
  'id_cap_tren',
  'idchuyennganhkt',
  'id_chuyen_nganh_kt',
  'idnganh',
  'id_nganh',
]);

const EXPLICIT_KEY_MAP = {
  // legacy category keys
  ma_dinh_danh: 'ma_danh_muc',
  ma_danh_muc_trang_bi: 'ma_danh_muc',
  ten_danh_muc_trang_bi: 'ten_danh_muc',
  ten: 'ten_danh_muc',

  // parameter-backed common fields
  soserial: 'so_hieu',
  serial: 'so_hieu',
  serialnumber: 'so_hieu',
  kyhieu: 'ky_hieu',
  donviquanly: 'don_vi_quan_ly',
  don_vi_quan_ly: 'don_vi_quan_ly',
  nhom: 'loai',
  tinhtrangsudung: 'trang_thai',
  tinh_trang_su_dung: 'trang_thai',
};

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

function toSnakeCase(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function resolveTargetKey(currentKey) {
  const normalized = normalize(currentKey).replace(/[^a-z0-9_]/g, '');
  if (TOP_LEVEL_KEYS.has(normalized)) return currentKey;
  if (EXPLICIT_KEY_MAP[normalized]) return EXPLICIT_KEY_MAP[normalized];
  return toSnakeCase(currentKey);
}

const formConfigs = database.FormConfig.find(
  isActive,
  { _id: 1, Key: 1, Name: 1, Tabs: 1 },
).toArray();

const targetForms = formConfigs.filter((formConfig) => {
  const key = String(formConfig.Key || '').trim();
  return FORM_KEY_PATTERNS.some((pattern) => pattern.test(key));
});

const referencedFieldSetIds = Array.from(new Set(
  targetForms.flatMap((formConfig) => getFieldSetIdsFromForm(formConfig).map(String)),
));

const dynamicCategoryFieldSets = database.FieldSet.find(
  {
    ...isActive,
    MaDanhMucTrangBi: { $exists: true, $ne: [] },
  },
  { _id: 1, Name: 1, FieldIds: 1, MaDanhMucTrangBi: 1 },
).toArray();

const fieldSetIds = Array.from(new Set([
  ...referencedFieldSetIds,
  ...dynamicCategoryFieldSets.map((fieldSet) => String(fieldSet._id)),
]));

const fieldSets = database.FieldSet.find(
  { ...isActive, _id: { $in: fieldSetIds } },
  { _id: 1, Name: 1, FieldIds: 1, MaDanhMucTrangBi: 1 },
).toArray();

const fieldIds = Array.from(new Set(
  fieldSets.flatMap((fieldSet) => Array.isArray(fieldSet.FieldIds) ? fieldSet.FieldIds.map(String) : []),
));

const dynamicFields = database.DynamicField.find(
  { ...isActive, _id: { $in: fieldIds } },
  { _id: 1, Key: 1, Label: 1, Version: 1 },
).toArray();

const fieldIdSet = new Set(dynamicFields.map((field) => String(field._id)));

const candidateRows = dynamicFields
  .map((field) => {
    const fieldId = String(field._id);
    const currentKey = String(field.Key || '').trim();
    const nextKey = resolveTargetKey(currentKey);
    const conflictField = database.DynamicField.findOne(
      {
        ...isActive,
        _id: { $ne: field._id },
        Key: nextKey,
      },
      { _id: 1, Key: 1, Label: 1 },
    );

    return {
      fieldId,
      currentKey,
      nextKey,
      label: field.Label || '',
      conflict: conflictField
        ? {
            id: String(conflictField._id),
            key: conflictField.Key || '',
            label: conflictField.Label || '',
          }
        : null,
      fieldSets: fieldSets
        .filter((fieldSet) => Array.isArray(fieldSet.FieldIds) && fieldSet.FieldIds.some((id) => String(id) === fieldId))
        .map((fieldSet) => ({
          id: String(fieldSet._id),
          name: fieldSet.Name || '',
        })),
    };
  })
  .filter((row) => row.currentKey && row.nextKey && row.currentKey !== row.nextKey && fieldIdSet.has(row.fieldId));

const conflicted = candidateRows.filter((row) => row.conflict);

print(`DB_NAME = ${DB_NAME}`);
print(`APPLY_MODE = ${APPLY_MODE}`);
print(`Target forms: ${targetForms.length}`);
print(`Target field sets: ${fieldSets.length}`);
print(`Target fields: ${dynamicFields.length}`);
print(`Candidates found: ${candidateRows.length}`);
printjson(candidateRows);

if (conflicted.length > 0) {
  print('\nMigration stopped because target key already exists for some candidates.');
  printjson(conflicted);
}

if (!APPLY_MODE || conflicted.length > 0 || candidateRows.length === 0) {
  print('\nDry-run finished. No changes written.');
} else {
  const nowTs = toProtoTimestamp(new Date());
  let modified = 0;

  for (const row of candidateRows) {
    const result = database.DynamicField.updateOne(
      { _id: row.fieldId, Delete: { $ne: true } },
      {
        $set: {
          Key: row.nextKey,
          ModifyDate: nowTs,
          NguoiSua: 'migration-trangbi-dynamicfield-keys-to-parameter-shape',
        },
        $inc: { Version: 1 },
      },
    );

    modified += result.modifiedCount ?? 0;
  }

  print(`\nMigration applied. Modified DynamicField count: ${modified}`);
}
