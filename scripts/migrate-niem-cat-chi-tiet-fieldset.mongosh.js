/*
  Upsert fieldset chi tiet niem cat cho tung trang bi trong lich niem cat.

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-niem-cat-chi-tiet-fieldset.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');
const NOW = new Date();
const USER = 'migration-niem-cat-chi-tiet-fieldset';

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
  { id: '9d7507e3-7085-760a-e54a-c41335a00101', key: 'ten_ke_hoach', label: 'Ten ke hoach', type: 'text', required: true },
  { id: '9d7507e3-7085-760a-e54a-c41335a00102', key: 'loai_niem_cat', label: 'Loai niem cat', type: 'select', required: false, validation: { options: ['Ngan han', 'Dai han', 'Mo niem cat'], displayType: 'dropdown' } },
  { id: '9d7507e3-7085-760a-e54a-c41335a00103', key: 'nguoi_thuc_hien', label: 'Nguoi thuc hien', type: 'text', required: false },
  { id: '9d7507e3-7085-760a-e54a-c41335a00104', key: 'don_vi_thuc_hien', label: 'Don vi thuc hien', type: 'text', required: false },
  { id: '9d7507e3-7085-760a-e54a-c41335a00105', key: 'ngay_niem_cat', label: 'Ngay niem cat', type: 'date', required: true },
  { id: '9d7507e3-7085-760a-e54a-c41335a00106', key: 'can_cu', label: 'Can cu', type: 'text', required: false },
  { id: '9d7507e3-7085-760a-e54a-c41335a00107', key: 'ket_qua', label: 'Ket qua', type: 'select', required: false, validation: { options: ['Dat', 'Can theo doi', 'Khong dat'], displayType: 'dropdown' } },
];

const fieldIds = fields.map(upsertDynamicField);
const fieldSetId = '9d7507e3-7085-760a-e54a-c41335a00001';
const existingFieldSet =
  dbx.FieldSet.findOne({ Key: 'trang_bi.niem_cat_chi_tiet', Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 }) ||
  dbx.FieldSet.findOne({ _id: fieldSetId }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 });

const targetFieldSetId = existingFieldSet?._id || fieldSetId;

dbx.FieldSet.updateOne(
  { _id: targetFieldSetId },
  {
    $set: {
      Name: 'Chi tiet niem cat trang bi',
      Key: 'trang_bi.niem_cat_chi_tiet',
      Icon: 'Warehouse',
      Color: '#6B3A08',
      Desc: 'Field dong cho phieu chi tiet niem cat tung trang bi trong lich niem cat',
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
  key: 'trang_bi.niem_cat_chi_tiet',
  fieldCount: fieldIds.length,
});
