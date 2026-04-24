/*
  Upsert fieldset chi tiet sua chua cho tung trang bi trong lich sua chua.

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-sua-chua-chi-tiet-fieldset.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');
const NOW = new Date();
const USER = 'migration-sua-chua-chi-tiet-fieldset';
const OFFICE_API = '/Office.OfficeService/GetListOffice';

function ts(date) {
  const millis = date.getTime();
  const seconds = Math.floor(millis / 1000);
  const nanos = (millis % 1000) * 1000000;
  return { Seconds: NumberLong(String(seconds)), Nanos: nanos };
}

function validationDoc(overrides = {}) {
  return {
    MinLength: overrides.minLength ?? overrides.MinLength ?? 0,
    MaxLength: overrides.maxLength ?? overrides.MaxLength ?? 0,
    Pattern: overrides.pattern ?? overrides.Pattern ?? '',
    Min: overrides.min ?? overrides.Min ?? 0,
    Max: overrides.max ?? overrides.Max ?? 0,
    DataSource: overrides.dataSource ?? overrides.DataSource ?? '',
    ApiUrl: overrides.apiUrl ?? overrides.ApiUrl ?? '',
    DisplayType: overrides.displayType ?? overrides.DisplayType ?? '',
    Options: overrides.options ?? overrides.Options ?? [],
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
  { id: '8a4204b0-4d62-43d7-b217-91e002700101', key: 'so_luong', label: 'So luong', type: 'number', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700102', key: 'thoi_gian_vao', label: 'Thoi gian vao', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700103', key: 'thoi_gian_ra_du_kien', label: 'Thoi gian ra du kien', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700104', key: 'thoi_gian_ra_thuc_te', label: 'Thoi gian ra thuc te', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700105', key: 'muc_sua_chua_lan_nay', label: 'Muc sua chua lan nay', type: 'select', required: false, validation: { options: ['Lon', 'Vua', 'Nho'], displayType: 'dropdown' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700106', key: 'muc_sua_chua_tiep_theo', label: 'Muc sua chua tiep theo', type: 'select', required: false, validation: { options: ['Lon', 'Vua', 'Nho'], displayType: 'dropdown' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700107', key: 'thoi_gian_sua_chua_tiep_theo', label: 'Thoi gian sua chua tiep theo', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700108', key: 'don_vi_chu_quan', label: 'Don vi chu quan', type: 'select', required: false, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700109', key: 'don_vi_sua_chua_chi_tiet', label: 'Don vi sua chua', type: 'select', required: false, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700110', key: 'nguoi_tiep_nhan', label: 'Nguoi tiep nhan', type: 'text', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700111', key: 'tinh_trang_dau_vao', label: 'Tinh trang dau vao', type: 'select', required: false, validation: { options: ['Tot', 'Can theo doi', 'Hong'], displayType: 'dropdown' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700112', key: 'tinh_trang_ky_thuat', label: 'Tinh trang ky thuat', type: 'select', required: false, validation: { options: ['Tot', 'Kem', 'Hong'], displayType: 'dropdown' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700113', key: 'tinh_trang_su_dung', label: 'Tinh trang su dung', type: 'select', required: false, validation: { options: ['Dang su dung', 'Tam dung', 'Ngung su dung'], displayType: 'dropdown' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700114', key: 'nhien_lieu', label: 'Nhien lieu', type: 'number', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700115', key: 'ngay_cong', label: 'Ngay cong', type: 'number', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700116', key: 'kinh_phi_du_kien', label: 'Kinh phi du kien', type: 'number', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700117', key: 'kinh_phi_thuc_te', label: 'Kinh phi thuc te', type: 'number', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700118', key: 'ket_qua_sua_chua', label: 'Ket qua sua chua', type: 'select', required: false, validation: { options: ['Dat', 'Can theo doi', 'Khong dat'], displayType: 'dropdown' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700119', key: 'ngay_hoan_thanh_thuc_te', label: 'Ngay hoan thanh thuc te', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700120', key: 'tong_thoi_gian_sua_chua', label: 'Tong thoi gian sua chua', type: 'number', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700121', key: 'ghi_chu_chi_tiet', label: 'Ghi chu chi tiet', type: 'textarea', required: false, validation: { maxLength: 2000 } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700122', key: 'hang_muc_sua_chua_json', label: 'Hang muc sua chua JSON', type: 'textarea', required: false, disabled: true },
  { id: '8a4204b0-4d62-43d7-b217-91e002700123', key: 'ma_phieu_sua_chua', label: 'Ma phieu sua chua', type: 'text', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700124', key: 'trang_thai_phieu', label: 'Trang thai phieu', type: 'select', required: false, validation: { options: ['Dang lap', 'Dang sua chua', 'Cho xac nhan', 'Hoan thanh'], displayType: 'dropdown' } },
  { id: '8a4204b0-4d62-43d7-b217-91e002700125', key: 'nguoi_ban_giao', label: 'Nguoi ban giao', type: 'text', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700126', key: 'nguoi_tiep_nhan_ky', label: 'Nguoi tiep nhan ky', type: 'text', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700127', key: 'chi_huy_don_vi', label: 'Chi huy don vi', type: 'text', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700128', key: 'ngay_ky_ban_giao', label: 'Ngay ky ban giao', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700129', key: 'ngay_ky_tiep_nhan', label: 'Ngay ky tiep nhan', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700130', key: 'ngay_ky_chi_huy', label: 'Ngay ky chi huy', type: 'date', required: false },
  { id: '8a4204b0-4d62-43d7-b217-91e002700131', key: 'xac_nhan_hoan_thanh', label: 'Xac nhan hoan thanh', type: 'checkbox', required: false },
];

const fieldIds = fields.map(upsertDynamicField);
const fieldSetId = '8a4204b0-4d62-43d7-b217-91e002700001';
const existingFieldSet =
  dbx.FieldSet.findOne({ Key: 'trang_bi.sua_chua_chi_tiet', Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 }) ||
  dbx.FieldSet.findOne({ _id: fieldSetId }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 });

const targetFieldSetId = existingFieldSet?._id || fieldSetId;

dbx.FieldSet.updateOne(
  { _id: targetFieldSetId },
  {
    $set: {
      Name: 'Chi tiet sua chua trang bi',
      Key: 'trang_bi.sua_chua_chi_tiet',
      Icon: 'Assignment',
      Color: '#0ea5e9',
      Desc: 'Field dong cho phieu chi tiet sua chua tung trang bi trong lich sua chua',
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
  key: 'trang_bi.sua_chua_chi_tiet',
  fieldCount: fieldIds.length,
});
