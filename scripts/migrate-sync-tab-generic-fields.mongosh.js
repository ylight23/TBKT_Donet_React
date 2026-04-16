/*
  Migration: normalize generic fields for tab "Danh sách trang bị đồng bộ"
  - Uses only the existing dynamic form engine
  - Standard field bundle for equipment membership in a sync group:
      + trang_thai_dong_bo (checkbox)
      + id_nhom_dong_bo (select/api/autocomplete)
  - Creates one shared FieldSet and attaches it to both:
      + trang-bi-nhom-1
      + trang-bi-nhom-2
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');

const NOW = new Date();
const USER = 'migration-sync-tab-generic-fields';

const FIELD_TRANG_THAI_ID = '0e4f1a1a-0f71-4c17-9f6e-9d31c09f3001';
const FIELD_NHOM_ID = '0e4f1a1a-0f71-4c17-9f6e-9d31c09f3002';
const FIELDSET_ID = '0e4f1a1a-0f71-4c17-9f6e-9d31c09f4001';
const FORM_KEYS = ['trang-bi-nhom-1', 'trang-bi-nhom-2'];
const TARGET_TAB_LABEL = 'Danh sách trang bị đồng bộ';
const NHOM_DONG_BO_API_URL = '/DanhMucTrangBi.DanhMucTrangBiService/GetListNhomDongBo';

function ts(date) {
  const millis = date.getTime();
  const seconds = Math.floor(millis / 1000);
  const nanos = (millis % 1000) * 1000000;
  return { Seconds: NumberLong(String(seconds)), Nanos: nanos };
}

function validationDoc(overrides = {}) {
  return {
    MinLength: 0,
    MaxLength: 0,
    Pattern: '',
    Min: 0,
    Max: 0,
    DataSource: '',
    ApiUrl: '',
    DisplayType: '',
    Options: [],
    ...overrides,
  };
}

function upsertDynamicField(id, payload) {
  const existing = dbx.DynamicField.findOne(
    { _id: id },
    { Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 },
  );
  const version = (existing?.Version || 0) + 1;

  dbx.DynamicField.updateOne(
    { _id: id },
    {
      $set: {
        ...payload,
        ModifyDate: ts(NOW),
        ModifyBy: USER,
        NguoiSua: USER,
        Version: version,
        Delete: false,
      },
      $setOnInsert: {
        CreateDate: existing?.CreateDate || ts(NOW),
        CreateBy: existing?.CreateBy || '',
        NguoiTao: existing?.NguoiTao || USER,
      },
    },
    { upsert: true },
  );
}

function upsertFieldSet(id, payload) {
  const existing = dbx.FieldSet.findOne(
    { _id: id },
    { Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 },
  );
  const version = (existing?.Version || 0) + 1;

  dbx.FieldSet.updateOne(
    { _id: id },
    {
      $set: {
        ...payload,
        ModifyDate: ts(NOW),
        ModifyBy: USER,
        NguoiSua: USER,
        Version: version,
        Delete: false,
      },
      $setOnInsert: {
        CreateDate: existing?.CreateDate || ts(NOW),
        CreateBy: existing?.CreateBy || '',
        NguoiTao: existing?.NguoiTao || USER,
      },
    },
    { upsert: true },
  );
}

upsertDynamicField(FIELD_TRANG_THAI_ID, {
  Key: 'trang_thai_dong_bo',
  Label: 'Co danh sach trang bi dong bo (an)',
  Type: 'checkbox',
  Required: false,
  Disabled: false,
  Validation: validationDoc(),
  CnIds: [],
});

upsertDynamicField(FIELD_NHOM_ID, {
  Key: 'id_nhom_dong_bo',
  Label: 'Nhom dong bo lien ket (an)',
  Type: 'select',
  Required: false,
  Disabled: false,
  Validation: validationDoc({
    DataSource: 'api',
    ApiUrl: NHOM_DONG_BO_API_URL,
    DisplayType: 'autocomplete',
    Options: [],
  }),
  CnIds: [],
});

upsertFieldSet(FIELDSET_ID, {
  Name: 'Danh sach trang bi dong bo',
  Icon: 'SyncAlt',
  Color: '#2563eb',
  Desc: 'Truong he thong phuc vu danh sach trang bi dong bo trong form nhap trang bi ky thuat',
  FieldIds: [FIELD_TRANG_THAI_ID, FIELD_NHOM_ID],
  MaDanhMucTrangBi: [],
});

for (const formKey of FORM_KEYS) {
  const config = dbx.FormConfig.findOne({ Key: formKey });
  if (!config || !Array.isArray(config.Tabs)) {
    print(`[skip] FormConfig ${formKey}: khong tim thay`);
    continue;
  }

  let changed = false;
  let foundTargetTab = false;

  const nextTabs = config.Tabs.map((tab) => {
    if ((tab.Label || '').trim() !== TARGET_TAB_LABEL) {
      return tab;
    }

    foundTargetTab = true;
    const ids = Array.isArray(tab.FieldSetIds) ? tab.FieldSetIds.filter(Boolean) : [];
    if (!ids.includes(FIELDSET_ID)) {
      ids.push(FIELDSET_ID);
      changed = true;
    }

    return {
      ...tab,
      FieldSetIds: ids,
    };
  });

  if (!foundTargetTab) {
    nextTabs.push({
      _id: UUID().toString(),
      Label: TARGET_TAB_LABEL,
      FieldSetIds: [FIELDSET_ID],
    });
    changed = true;
  }

  if (!changed) {
    print(`[skip] ${formKey}: tab da duoc gan fieldset chuan`);
    continue;
  }

  dbx.FormConfig.updateOne(
    { _id: config._id },
    {
      $set: {
        Tabs: nextTabs,
        ModifyDate: ts(NOW),
        ModifyBy: USER,
        NguoiSua: USER,
        Version: (config.Version || 0) + 1,
      },
    },
  );

  print(`[updated] ${formKey}: dong bo tab "${TARGET_TAB_LABEL}"`);
}

printjson({
  fieldIds: [FIELD_TRANG_THAI_ID, FIELD_NHOM_ID],
  fieldSetId: FIELDSET_ID,
  formKeys: FORM_KEYS,
});
