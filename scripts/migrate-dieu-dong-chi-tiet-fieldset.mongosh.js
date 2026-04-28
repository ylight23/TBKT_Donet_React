/*
  Upsert fieldset chi tiet dieu dong cho tung trang bi.

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-dieu-dong-chi-tiet-fieldset.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');
const NOW = new Date();
const USER = 'migration-dieu-dong-chi-tiet-fieldset';

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
  { id: '9f9709a5-92a7-982c-a76c-e63557c00101', key: 'ten_ke_hoach', label: 'Ten ke hoach', type: 'text', required: true },
  { id: '9f9709a5-92a7-982c-a76c-e63557c00102', key: 'can_cu_thuc_hien', label: 'Can cu thuc hien', type: 'text', required: false },
  { id: '9f9709a5-92a7-982c-a76c-e63557c00103', key: 'thoi_gian', label: 'Thoi gian', type: 'date', required: true },
  { id: '9f9709a5-92a7-982c-a76c-e63557c00104', key: 'don_vi_giao', label: 'Don vi giao', type: 'text', required: false },
  { id: '9f9709a5-92a7-982c-a76c-e63557c00105', key: 'nguoi_giao', label: 'Nguoi giao', type: 'text', required: false },
  { id: '9f9709a5-92a7-982c-a76c-e63557c00106', key: 'don_vi_nhan', label: 'Don vi nhan', type: 'text', required: false },
  { id: '9f9709a5-92a7-982c-a76c-e63557c00107', key: 'nguoi_nhan', label: 'Nguoi nhan', type: 'text', required: false },
  { id: '9f9709a5-92a7-982c-a76c-e63557c00108', key: 'ghi_chu', label: 'Ghi chu', type: 'text', required: false },
];

const fieldIds = fields.map(upsertDynamicField);
const fieldSetId = '9f9709a5-92a7-982c-a76c-e63557c00001';
const existingFieldSet =
  dbx.FieldSet.findOne({ Key: 'trang_bi.dieu_dong_chi_tiet', Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 }) ||
  dbx.FieldSet.findOne({ _id: fieldSetId }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 });

const targetFieldSetId = existingFieldSet?._id || fieldSetId;

dbx.FieldSet.updateOne(
  { _id: targetFieldSetId },
  {
    $set: {
      Name: 'Chi tiet dieu dong trang bi',
      Key: 'trang_bi.dieu_dong_chi_tiet',
      Icon: 'LocalShipping',
      Color: '#0F766E',
      Desc: 'Field dong cho phieu chi tiet dieu dong tung trang bi',
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
  key: 'trang_bi.dieu_dong_chi_tiet',
  fieldCount: fieldIds.length,
});
