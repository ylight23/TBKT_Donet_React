/*
  Upsert fieldset chi tiet bao quan cho tung trang bi trong lich bao quan.

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-bao-quan-chi-tiet-fieldset.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');
const NOW = new Date();
const USER = 'migration-bao-quan-chi-tiet-fieldset';

function ts(date) {
  const millis = date.getTime();
  const seconds = Math.floor(millis / 1000);
  const nanos = (millis % 1000) * 1000000;
  return { Seconds: NumberLong(String(seconds)), Nanos: nanos };
}

function validationDoc(overrides = {}) {
  return {
    MinLength: overrides.minLength ?? 0,
    MaxLength: overrides.maxLength ?? 0,
    Pattern: overrides.pattern ?? '',
    Min: overrides.min ?? 0,
    Max: overrides.max ?? 0,
    DataSource: overrides.dataSource ?? '',
    ApiUrl: overrides.apiUrl ?? '',
    DisplayType: overrides.displayType ?? '',
    Options: overrides.options ?? [],
  };
}

function upsertDynamicField(def) {
  const existingByKey = dbx.DynamicField.findOne({ Key: def.key, Delete: { $ne: true } }, { _id: 1, Version: 1 });
  const targetId = existingByKey?._id || def.id;
  const existing = dbx.DynamicField.findOne(
    { _id: targetId },
    { Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 },
  );

  dbx.DynamicField.updateOne(
    { _id: targetId },
    {
      $set: {
        Key: def.key,
        Label: def.label,
        Type: def.type,
        Required: Boolean(def.required),
        Disabled: Boolean(def.disabled),
        Validation: validationDoc(def.validation || {}),
        CnIds: [],
        ModifyDate: ts(NOW),
        ModifyBy: USER,
        NguoiSua: USER,
        Version: (existing?.Version || 0) + 1,
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

const fields = [
  { id: '9b5305c1-5e73-54e8-c328-a2f113800101', key: 'ten_bao_quan', label: 'Ten bao quan', type: 'text', required: true },
  { id: '9b5305c1-5e73-54e8-c328-a2f113800102', key: 'ngay_bao_quan', label: 'Ngay bao quan', type: 'date', required: true },
  { id: '9b5305c1-5e73-54e8-c328-a2f113800103', key: 'nguoi_thuc_hien', label: 'Nguoi thuc hien', type: 'text', required: false },
  { id: '9b5305c1-5e73-54e8-c328-a2f113800104', key: 'nguoi_phu_trach', label: 'Nguoi phu trach', type: 'text', required: false },
  { id: '9b5305c1-5e73-54e8-c328-a2f113800105', key: 'ket_qua', label: 'Ket qua', type: 'select', required: false, validation: { options: ['Dat', 'Can theo doi', 'Khong dat'], displayType: 'dropdown' } },
  { id: '9b5305c1-5e73-54e8-c328-a2f113800106', key: 'noi_dung_cong_viec', label: 'Noi dung cong viec', type: 'textarea', required: false, validation: { maxLength: 2000 } },
];

const fieldIds = fields.map(upsertDynamicField);
const fieldSetId = '9b5305c1-5e73-54e8-c328-a2f113800001';
const existingFieldSet =
  dbx.FieldSet.findOne({ Key: 'trang_bi.bao_quan_chi_tiet', Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 }) ||
  dbx.FieldSet.findOne({ _id: fieldSetId }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 });

const targetFieldSetId = existingFieldSet?._id || fieldSetId;

dbx.FieldSet.updateOne(
  { _id: targetFieldSetId },
  {
    $set: {
      Name: 'Chi tiet bao quan trang bi',
      Key: 'trang_bi.bao_quan_chi_tiet',
      Icon: 'Security',
      Color: '#0A5E52',
      Desc: 'Field dong cho phieu chi tiet bao quan tung trang bi trong lich bao quan',
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
    $unset: { LoaiNghiepVu: '' },
  },
  { upsert: true },
);

printjson({
  ok: true,
  fieldSetId: targetFieldSetId,
  key: 'trang_bi.bao_quan_chi_tiet',
  fieldCount: fieldIds.length,
});
