/*
  Migrate dynamic FieldSet for "Them bao quan" form.
  - Runtime key: trang_bi.bao_quan
  - Upsert canonical dynamic fields
  - Bind one primary FieldSet by Key

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-bao-quan-fieldset-v2.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');

const NOW = new Date();
const USER = 'migration-bao-quan-fieldset-v2';
const FIELDSET_KEY = 'trang_bi.bao_quan';
const FIELDSET_ID = 'f2f809e7-4d64-44af-9e3d-b42b2f9f1001';

const FIELD_DEFS = [
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1101', key: 'ten_bao_quan', label: 'Ten bao quan', type: 'text', required: true },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1102', key: 'can_cu', label: 'Can cu', type: 'textarea', required: false, validation: { maxLength: 500 } },
  {
    id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1113',
    key: 'cap_bao_quan',
    label: 'Cấp bảo quản',
    type: 'select',
    required: true,
    validation: {
      options: [
        'Bảo quản TBKT đang sử dụng',
        'Bảo quản niêm cất ngắn hạn',
        'Bảo quản niêm cất dài hạn',
      ],
    },
  },
  {
    id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1103',
    key: 'don_vi_thuc_hien',
    label: 'Don vi thuc hien',
    type: 'select',
    required: true,
    validation: {
      dataSource: 'api',
      apiUrl: '/Office.OfficeService/GetListOffice',
      displayType: 'tree',
      options: [],
    },
  },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1104', key: 'thoi_gian_lap', label: 'Thoi gian lap', type: 'date', required: false },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1105', key: 'nguoi_thuc_hien', label: 'Nguoi thuc hien', type: 'text', required: false },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1106', key: 'nguoi_phu_trach', label: 'Nguoi phu trach', type: 'text', required: false },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1107', key: 'ngay_bao_quan', label: 'Ngay bao quan', type: 'date', required: false },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1108', key: 'thoi_gian_thuc_hien', label: 'Thoi gian thuc hien', type: 'date', required: false },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1109', key: 'thoi_gian_ket_thuc', label: 'Thoi gian ket thuc', type: 'date', required: false },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1110', key: 'noi_dung_cong_viec', label: 'Noi dung cong viec', type: 'textarea', required: false, validation: { maxLength: 2000 } },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1111', key: 'vat_chat_bao_dam', label: 'Vat chat bao dam', type: 'textarea', required: false, validation: { maxLength: 1000 } },
  { id: 'f2f809e7-4d64-44af-9e3d-b42b2f9f1112', key: 'ket_qua', label: 'Ket qua', type: 'textarea', required: false, validation: { maxLength: 1000 } },
];

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
    MinLength: overrides.minLength ?? overrides.MinLength ?? 0,
    MaxLength: overrides.maxLength ?? overrides.MaxLength ?? 0,
    DataSource: overrides.dataSource ?? overrides.DataSource ?? '',
    ApiUrl: overrides.apiUrl ?? overrides.ApiUrl ?? '',
    DisplayType: overrides.displayType ?? overrides.DisplayType ?? '',
    Options: overrides.options ?? overrides.Options ?? [],
  };
}

function upsertDynamicFieldByKey(def) {
  const existingByKey = dbx.DynamicField.findOne({ Key: def.key, Delete: { $ne: true } }, { _id: 1, Version: 1 });
  const targetId = existingByKey?._id || def.id;
  const existing = dbx.DynamicField.findOne(
    { _id: targetId },
    { Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 },
  );
  const version = (existing?.Version || 0) + 1;

  dbx.DynamicField.updateOne(
    { _id: targetId },
    {
      $set: {
        Key: def.key,
        Label: def.label,
        Type: def.type,
        Required: Boolean(def.required),
        Disabled: false,
        Validation: validationDoc(def.validation || {}),
        CnIds: [],
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

  return String(targetId);
}

const fieldIds = FIELD_DEFS.map((item) => upsertDynamicFieldByKey(item));
const existingFieldSet =
  dbx.FieldSet.findOne({ Key: FIELDSET_KEY, Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 }) ||
  dbx.FieldSet.findOne({ _id: FIELDSET_ID }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 });
const targetFieldSetId = existingFieldSet?._id || FIELDSET_ID;

dbx.FieldSet.updateOne(
  { _id: targetFieldSetId },
  {
    $set: {
      Name: 'Bao quan trang bi',
      Key: FIELDSET_KEY,
      Icon: 'Security',
      Color: '#2563eb',
      Desc: 'Field dong cho form them bao quan',
      FieldIds: fieldIds,
      MaDanhMucTrangBi: [],
      ModifyDate: ts(NOW),
      ModifyBy: USER,
      NguoiSua: USER,
      Version: (existingFieldSet?.Version || 0) + 1,
      Delete: false,
    },
    $setOnInsert: {
      CreateDate: existingFieldSet?.CreateDate || ts(NOW),
      CreateBy: existingFieldSet?.CreateBy || '',
      NguoiTao: existingFieldSet?.NguoiTao || USER,
    },
    $unset: {
      LoaiNghiepVu: '',
    },
  },
  { upsert: true },
);

printjson({
  ok: true,
  fieldSetKey: FIELDSET_KEY,
  fieldSetId: String(targetFieldSetId),
  fieldCount: fieldIds.length,
  fieldIds,
});
