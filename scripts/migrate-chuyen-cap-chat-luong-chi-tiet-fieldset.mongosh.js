/*
  Upsert fieldset chi tiet chuyen cap chat luong cho tung trang bi.

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-chuyen-cap-chat-luong-chi-tiet-fieldset.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');
const NOW = new Date();
const USER = 'migration-chuyen-cap-chat-luong-chi-tiet-fieldset';

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

const capOptions = ['Cap 1', 'Cap 2', 'Cap 3', 'Cap 4', 'Cap 5'];

const fields = [
  { id: '9e8608f4-8196-871b-f65b-d52446b00101', key: 'ten_ke_hoach', label: 'Ten ke hoach', type: 'text', required: true },
  { id: '9e8608f4-8196-871b-f65b-d52446b00102', key: 'so_menh_lenh', label: 'So menh lenh', type: 'text', required: false },
  { id: '9e8608f4-8196-871b-f65b-d52446b00103', key: 'don_vi_thuc_hien', label: 'Don vi thuc hien', type: 'text', required: false },
  { id: '9e8608f4-8196-871b-f65b-d52446b00104', key: 'can_cu_thuc_hien', label: 'Can cu thuc hien', type: 'text', required: false },
  { id: '9e8608f4-8196-871b-f65b-d52446b00105', key: 'thoi_gian', label: 'Thoi gian', type: 'date', required: true },
  { id: '9e8608f4-8196-871b-f65b-d52446b00106', key: 'ket_qua', label: 'Ket qua', type: 'select', required: false, validation: { options: ['Dat', 'Can theo doi', 'Khong dat'], displayType: 'dropdown' } },
  { id: '9e8608f4-8196-871b-f65b-d52446b00107', key: 'ghi_chu', label: 'Ghi chu', type: 'text', required: false },
  { id: '9e8608f4-8196-871b-f65b-d52446b00108', key: 'cap_chat_luong_hien_tai', label: 'Cap chat luong hien tai', type: 'select', required: false, validation: { options: capOptions, displayType: 'dropdown' } },
  { id: '9e8608f4-8196-871b-f65b-d52446b00109', key: 'cap_chat_luong_sau_chuyen', label: 'Cap chat luong sau khi chuyen', type: 'select', required: false, validation: { options: capOptions, displayType: 'dropdown' } },
];

const fieldIds = fields.map(upsertDynamicField);
const fieldSetId = '9e8608f4-8196-871b-f65b-d52446b00001';
const existingFieldSet =
  dbx.FieldSet.findOne({ Key: 'trang_bi.chuyen_cap_chat_luong_chi_tiet', Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 }) ||
  dbx.FieldSet.findOne({ _id: fieldSetId }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 });

const targetFieldSetId = existingFieldSet?._id || fieldSetId;

dbx.FieldSet.updateOne(
  { _id: targetFieldSetId },
  {
    $set: {
      Name: 'Chi tiet chuyen cap chat luong trang bi',
      Key: 'trang_bi.chuyen_cap_chat_luong_chi_tiet',
      Icon: 'StarRate',
      Color: '#7C2D12',
      Desc: 'Field dong cho phieu chi tiet chuyen cap chat luong tung trang bi',
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
  key: 'trang_bi.chuyen_cap_chat_luong_chi_tiet',
  fieldCount: fieldIds.length,
});
