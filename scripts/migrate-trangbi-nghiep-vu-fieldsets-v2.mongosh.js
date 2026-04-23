/*
  Upsert dynamic fieldsets cho cac nghiep vu:
  - trang_bi.bao_duong
  - trang_bi.sua_chua
  - trang_bi.niem_cat
  - trang_bi.dieu_dong
  - trang_bi.chuyen_cap_chat_luong

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-trangbi-nghiep-vu-fieldsets-v2.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');
const NOW = new Date();
const USER = 'migration-trangbi-nghiep-vu-fieldsets-v2';
const OFFICE_API = '/Office.OfficeService/GetListOffice';

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

function upsertFieldSet(moduleDef) {
  const fieldIds = moduleDef.fields.map(upsertDynamicFieldByKey);
  const existingFieldSet =
    dbx.FieldSet.findOne({ Key: moduleDef.key, Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 }) ||
    dbx.FieldSet.findOne({ _id: moduleDef.fieldSetId }, { _id: 1, Version: 1, CreateDate: 1, CreateBy: 1, NguoiTao: 1 });
  const targetFieldSetId = existingFieldSet?._id || moduleDef.fieldSetId;

  dbx.FieldSet.updateOne(
    { _id: targetFieldSetId },
    {
      $set: {
        Name: moduleDef.name,
        Key: moduleDef.key,
        Icon: moduleDef.icon,
        Color: moduleDef.color,
        Desc: moduleDef.desc,
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

  return { id: String(targetFieldSetId), key: moduleDef.key, fieldCount: fieldIds.length };
}

const modules = [
  {
    key: 'trang_bi.bao_duong',
    fieldSetId: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11001',
    name: 'Bao duong trang bi',
    icon: 'BuildCircle',
    color: '#2563eb',
    desc: 'Field dong cho form bao duong',
    fields: [
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11101', key: 'ten_lich_bao_duong', label: 'Ten bao duong', type: 'text', required: true },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11102', key: 'can_cu', label: 'Can cu', type: 'textarea', required: false, validation: { maxLength: 500 } },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11103', key: 'thoi_gian_lap', label: 'Thoi gian lap', type: 'date', required: false },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11104', key: 'don_vi', label: 'Don vi', type: 'select', required: true, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11105', key: 'nguoi_phu_trach', label: 'Nguoi phu trach', type: 'text', required: false },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11106', key: 'thoi_gian_thuc_hien', label: 'Thoi gian thuc hien', type: 'date', required: false },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11107', key: 'thoi_gian_ket_thuc', label: 'Thoi gian ket thuc', type: 'date', required: false },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11108', key: 'noi_dung_cong_viec', label: 'Noi dung cong viec', type: 'textarea', required: false, validation: { maxLength: 2000 } },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11109', key: 'vat_chat_bao_dam', label: 'Vat chat bao dam', type: 'textarea', required: false, validation: { maxLength: 1000 } },
      { id: '3b9dce3a-6f5e-4f2f-8d7d-3801a1f11110', key: 'ket_qua', label: 'Ket qua', type: 'textarea', required: false, validation: { maxLength: 1000 } },
    ],
  },
  {
    key: 'trang_bi.sua_chua',
    fieldSetId: '4c0ede4b-7a6f-4020-95c0-4902a2f21001',
    name: 'Sua chua trang bi',
    icon: 'Handyman',
    color: '#0ea5e9',
    desc: 'Field dong cho form sua chua',
    fields: [
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21101', key: 'ten_sua_chua', label: 'Ten sua chua', type: 'text', required: true },
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21102', key: 'can_cu', label: 'Can cu', type: 'textarea', required: false, validation: { maxLength: 500 } },
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21103', key: 'muc_sua_chua', label: 'Muc sua chua', type: 'select', required: true, validation: { options: ['Lon', 'Vua', 'Nho'], displayType: 'dropdown' } },
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21104', key: 'cap_sua_chua', label: 'Cap sua chua', type: 'select', required: true, validation: { options: ['Chien luoc', 'Chien dich', 'Chien thuat'], displayType: 'dropdown' } },
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21105', key: 'don_vi_sua_chua', label: 'Don vi sua chua', type: 'select', required: true, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21106', key: 'don_vi_de_nghi', label: 'Don vi de nghi', type: 'select', required: true, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21107', key: 'ngay_de_nghi', label: 'Ngay de nghi', type: 'date', required: false },
      { id: '4c0ede4b-7a6f-4020-95c0-4902a2f21108', key: 'ghi_chu', label: 'Ghi chu', type: 'textarea', required: false, validation: { maxLength: 2000 } },
    ],
  },
  {
    key: 'trang_bi.niem_cat',
    fieldSetId: '5d1fef5c-8b70-4131-a6d1-5a03a3f31001',
    name: 'Niem cat trang bi',
    icon: 'Warehouse',
    color: '#16a34a',
    desc: 'Field dong cho form niem cat',
    fields: [
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31101', key: 'ten_niem_cat', label: 'Ten niem cat', type: 'text', required: true },
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31102', key: 'can_cu', label: 'Can cu', type: 'textarea', required: false, validation: { maxLength: 500 } },
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31103', key: 'loai_de_nghi', label: 'Loai de nghi', type: 'select', required: true, validation: { options: ['Niem cat', 'Mo niem cat'], displayType: 'dropdown' } },
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31104', key: 'loai_niem_cat', label: 'Loai niem cat', type: 'select', required: true, validation: { options: ['Ngan han', 'Dai han'], displayType: 'dropdown' } },
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31105', key: 'don_vi_thuc_hien', label: 'Don vi thuc hien', type: 'select', required: true, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31106', key: 'nguoi_thuc_hien', label: 'Nguoi thuc hien', type: 'text', required: false },
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31107', key: 'ngay_niem_cat', label: 'Ngay niem cat', type: 'date', required: false },
      { id: '5d1fef5c-8b70-4131-a6d1-5a03a3f31108', key: 'ket_qua_thuc_hien', label: 'Ket qua thuc hien', type: 'textarea', required: false, validation: { maxLength: 1000 } },
    ],
  },
  {
    key: 'trang_bi.dieu_dong',
    fieldSetId: '6e20006d-9c81-4242-b7e2-6b04a4f41001',
    name: 'Dieu dong trang bi',
    icon: 'LocalShipping',
    color: '#d97706',
    desc: 'Field dong cho form dieu dong',
    fields: [
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41101', key: 'ten_dieu_dong', label: 'Ten dieu dong', type: 'text', required: true },
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41102', key: 'can_cu', label: 'Can cu', type: 'textarea', required: false, validation: { maxLength: 500 } },
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41103', key: 'don_vi_giao', label: 'Don vi giao', type: 'select', required: true, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41104', key: 'don_vi_nhan', label: 'Don vi nhan', type: 'select', required: true, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41105', key: 'nguoi_phu_trach', label: 'Nguoi phu trach', type: 'text', required: false },
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41106', key: 'thoi_gian_thuc_hien', label: 'Thoi gian thuc hien', type: 'date', required: false },
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41107', key: 'thoi_gian_ket_thuc', label: 'Thoi gian ket thuc', type: 'date', required: false },
      { id: '6e20006d-9c81-4242-b7e2-6b04a4f41108', key: 'ghi_chu', label: 'Ghi chu', type: 'textarea', required: false, validation: { maxLength: 2000 } },
    ],
  },
  {
    key: 'trang_bi.chuyen_cap_chat_luong',
    fieldSetId: '7f31117e-ad92-4353-c8f3-7c05a5f51001',
    name: 'Chuyen cap chat luong',
    icon: 'StarRate',
    color: '#7c3aed',
    desc: 'Field dong cho form chuyen cap chat luong',
    fields: [
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51101', key: 'ten_chuyen_cap_chat_luong', label: 'Ten chuyen cap chat luong', type: 'text', required: true },
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51102', key: 'can_cu', label: 'Can cu', type: 'textarea', required: false, validation: { maxLength: 500 } },
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51103', key: 'so_menh_lenh', label: 'So menh lenh', type: 'text', required: false },
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51104', key: 'cap_chat_luong', label: 'Cap chat luong', type: 'select', required: true, validation: { options: ['Cap 1', 'Cap 2', 'Cap 3', 'Cap 4', 'Cap 5'], displayType: 'dropdown' } },
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51105', key: 'don_vi_thuc_hien', label: 'Don vi thuc hien', type: 'select', required: true, validation: { dataSource: 'api', apiUrl: OFFICE_API, displayType: 'tree' } },
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51106', key: 'ghi_chu', label: 'Ghi chu', type: 'textarea', required: false, validation: { maxLength: 2000 } },
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51107', key: 'thoi_gian_thuc_hien', label: 'Thoi gian thuc hien', type: 'date', required: false },
      { id: '7f31117e-ad92-4353-c8f3-7c05a5f51108', key: 'thoi_gian_ket_thuc', label: 'Thoi gian ket thuc', type: 'date', required: false },
    ],
  },
];

const result = modules.map(upsertFieldSet);
printjson({ ok: true, modules: result });
