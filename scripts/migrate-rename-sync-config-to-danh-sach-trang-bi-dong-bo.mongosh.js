/*
  Migration: rename sync-related configuration labels

  Goal:
  - Rename FormConfig sync tab labels to "Danh sách trang bị đồng bộ"
  - Rename the shared sync FieldSet to the aligned business term
  - Rename hidden technical DynamicField labels for the sync-member workflow
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');

const NOW = new Date();
const ACTOR = 'migrate-rename-sync-config-to-danh-sach-trang-bi-dong-bo';

const TARGET_TAB_LABEL = 'Danh sách trang bị đồng bộ';
const TARGET_FIELDSET_NAME = 'Danh sach trang bi dong bo';
const TARGET_FIELDSET_DESC = 'Truong he thong phuc vu danh sach trang bi dong bo trong form nhap trang bi ky thuat';

const TARGET_STATUS_LABEL = 'Co danh sach trang bi dong bo (an)';
const TARGET_GROUP_LABEL = 'Nhom dong bo lien ket (an)';

const FIELD_TRANG_THAI_ID = '0e4f1a1a-0f71-4c17-9f6e-9d31c09f3001';
const FIELD_NHOM_ID = '0e4f1a1a-0f71-4c17-9f6e-9d31c09f3002';
const FIELDSET_ID = '0e4f1a1a-0f71-4c17-9f6e-9d31c09f4001';
const FORM_KEYS = ['trang-bi-nhom-1', 'trang-bi-nhom-2'];

const LEGACY_TAB_LABELS = new Set([
  'danh sach trang bi dong bo',
  'nhom dong bo',
  'bo dong bo',
  'dong bo',
  'trang bi dong bo',
]);

function ts(date) {
  const millis = date.getTime();
  const seconds = Math.floor(millis / 1000);
  const nanos = (millis % 1000) * 1000000;
  return { Seconds: NumberLong(String(seconds)), Nanos: nanos };
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function touchVersion(doc) {
  return Math.max(Number(doc?.Version ?? 0), 0) + 1;
}

const result = {
  formConfigs: [],
  fieldSet: null,
  fields: [],
};

for (const formKey of FORM_KEYS) {
  const doc = dbx.FormConfig.findOne({ Key: formKey, Delete: { $ne: true } });
  if (!doc || !Array.isArray(doc.Tabs)) {
    continue;
  }

  let changed = false;
  const nextTabs = doc.Tabs.map((tab) => {
    const normalized = normalizeText(tab?.Label);
    const shouldRename = LEGACY_TAB_LABELS.has(normalized) || normalized === 'trang bi dong bo';

    if (!shouldRename || tab.Label === TARGET_TAB_LABEL) {
      return tab;
    }

    changed = true;
    return {
      ...tab,
      Label: TARGET_TAB_LABEL,
    };
  });

  if (!changed) {
    continue;
  }

  const version = touchVersion(doc);
  dbx.FormConfig.updateOne(
    { _id: doc._id },
    {
      $set: {
        Tabs: nextTabs,
        ModifyDate: ts(NOW),
        ModifyBy: ACTOR,
        NguoiSua: ACTOR,
        Version: version,
      },
    },
  );

  result.formConfigs.push({ _id: doc._id, key: formKey, version });
}

const fieldSetDoc = dbx.FieldSet.findOne({ _id: FIELDSET_ID, Delete: { $ne: true } })
  || dbx.FieldSet.findOne({
    Name: {
      $in: [
        'Trang bị đồng bộ',
        'Trang bi dong bo',
        'Danh sách trang bị đồng bộ',
        'Danh sach trang bi dong bo',
      ],
    },
    Delete: { $ne: true },
  });

if (fieldSetDoc) {
  const needsUpdate = fieldSetDoc.Name !== TARGET_FIELDSET_NAME
    || String(fieldSetDoc.Desc ?? '') !== TARGET_FIELDSET_DESC;
  if (needsUpdate) {
    const version = touchVersion(fieldSetDoc);
    dbx.FieldSet.updateOne(
      { _id: fieldSetDoc._id },
      {
        $set: {
          Name: TARGET_FIELDSET_NAME,
          Desc: TARGET_FIELDSET_DESC,
          ModifyDate: ts(NOW),
          ModifyBy: ACTOR,
          NguoiSua: ACTOR,
          Version: version,
        },
      },
    );
    result.fieldSet = { _id: fieldSetDoc._id, version };
  }
}

const fieldTargets = [
  {
    id: FIELD_TRANG_THAI_ID,
    key: 'trang_thai_dong_bo',
    label: TARGET_STATUS_LABEL,
    legacyLabels: ['Thuộc nhóm đồng bộ', 'Thuoc nhom dong bo', 'Trang thai dong bo'],
  },
  {
    id: FIELD_NHOM_ID,
    key: 'id_nhom_dong_bo',
    label: TARGET_GROUP_LABEL,
    legacyLabels: ['Nhóm đồng bộ', 'Nhom dong bo', 'Id nhom dong bo'],
  },
];

for (const target of fieldTargets) {
  const doc = dbx.DynamicField.findOne({ _id: target.id, Delete: { $ne: true } })
    || dbx.DynamicField.findOne({ Key: target.key, Delete: { $ne: true } })
    || dbx.DynamicField.findOne({ Label: { $in: target.legacyLabels }, Delete: { $ne: true } });

  if (!doc || doc.Label === target.label) {
    continue;
  }

  const version = touchVersion(doc);
  dbx.DynamicField.updateOne(
    { _id: doc._id },
    {
      $set: {
        Label: target.label,
        ModifyDate: ts(NOW),
        ModifyBy: ACTOR,
        NguoiSua: ACTOR,
        Version: version,
      },
    },
  );

  result.fields.push({ _id: doc._id, key: doc.Key, version, label: target.label });
}

printjson(result);
