const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const dynamicFieldCol = database.getCollection('DynamicField');
const fieldSetCol = database.getCollection('FieldSet');
const formConfigCol = database.getCollection('FormConfig');

const now = new Date();
const actor = 'seed-trang-bi-nhom-1-runtime-form';

const FORM_ID = 'formconfig-trang-bi-nhom-1';
const TAB_COMMON_ID = 'tab-trang-bi-nhom-1-common';
const TAB_THONGTIN_ID = 'tab-trang-bi-nhom-1-thongtin';
const TAB_RADA_ID = 'tab-trang-bi-nhom-1-rada';
const COMMON_FIELDSET_ID = 'fieldset-trang-bi-nhom-1-common';
const THONGTIN_FIELDSET_ID = 'fieldset-trang-bi-nhom-1-thongtin';
const RADA_FIELDSET_ID = 'fieldset-trang-bi-nhom-1-rada';

const commonFields = [
  {
    _id: 'field-tb1-ma-trang-bi',
    Key: 'Id',
    Label: 'Ma trang bi',
    Type: 'text',
    Required: true,
  },
  {
    _id: 'field-tb1-ten-trang-bi',
    Key: 'Ten',
    Label: 'Ten trang bi',
    Type: 'text',
    Required: true,
  },
  {
    _id: 'field-tb1-id-cap-tren',
    Key: 'IDCapTren',
    Label: 'Ma cap tren',
    Type: 'text',
    Required: false,
  },
  {
    _id: 'field-tb1-id-nganh',
    Key: 'IDNganh',
    Label: 'Nganh',
    Type: 'text',
    Required: true,
  },
  {
    _id: 'field-tb1-id-cnkt',
    Key: 'IDChuyenNganhKT',
    Label: 'Chuyen nganh ky thuat',
    Type: 'select',
    Required: true,
    Validation: { Options: ['O', 'I'] },
  },
  {
    _id: 'field-tb1-nhom',
    Key: 'Nhom',
    Label: 'Nhom trang bi',
    Type: 'select',
    Required: true,
    Validation: { Options: ['1'] },
  },
  {
    _id: 'field-tb1-ky-hieu',
    Key: 'KyHieu',
    Label: 'Ky hieu',
    Type: 'text',
    Required: false,
  },
  {
    _id: 'field-tb1-so-serial',
    Key: 'SoSerial',
    Label: 'So serial',
    Type: 'text',
    Required: false,
  },
  {
    _id: 'field-tb1-hang-san-xuat',
    Key: 'HangSanXuat',
    Label: 'Hang san xuat',
    Type: 'text',
    Required: false,
  },
  {
    _id: 'field-tb1-nuoc-san-xuat',
    Key: 'NuocSanXuat',
    Label: 'Nuoc san xuat',
    Type: 'text',
    Required: false,
  },
  {
    _id: 'field-tb1-nam-san-xuat',
    Key: 'NamSanXuat',
    Label: 'Nam san xuat',
    Type: 'number',
    Required: false,
    Validation: { Min: 1900, Max: 2100 },
  },
  {
    _id: 'field-tb1-don-vi-quan-ly',
    Key: 'DonViQuanLy',
    Label: 'Don vi quan ly',
    Type: 'text',
    Required: false,
  },
  {
    _id: 'field-tb1-tinh-trang-su-dung',
    Key: 'TinhTrangSuDung',
    Label: 'Tinh trang su dung',
    Type: 'select',
    Required: false,
    Validation: { Options: ['Dang su dung', 'Du phong', 'Bao quan', 'Sua chua'] },
  },
  {
    _id: 'field-tb1-ghi-chu',
    Key: 'GhiChu',
    Label: 'Ghi chu',
    Type: 'textarea',
    Required: false,
  },
];

const thongTinFields = [
  {
    _id: 'field-tb1-thongtin-bang-tan',
    Key: 'BangTanCongTac',
    Label: 'Bang tan cong tac',
    Type: 'text',
    Required: false,
    CnIds: ['O'],
  },
  {
    _id: 'field-tb1-thongtin-cu-ly',
    Key: 'CuLyLienLac',
    Label: 'Cu ly lien lac',
    Type: 'text',
    Required: false,
    CnIds: ['O'],
  },
  {
    _id: 'field-tb1-thongtin-kieu-dieu-che',
    Key: 'KieuDieuChe',
    Label: 'Kieu dieu che',
    Type: 'select',
    Required: false,
    CnIds: ['O'],
    Validation: { Options: ['AM', 'FM', 'PSK', 'QAM'] },
  },
  {
    _id: 'field-tb1-thongtin-cong-suat-phat',
    Key: 'CongSuatPhat',
    Label: 'Cong suat phat',
    Type: 'text',
    Required: false,
    CnIds: ['O'],
  },
  {
    _id: 'field-tb1-thongtin-toc-do-truyen',
    Key: 'TocDoTruyenTin',
    Label: 'Toc do truyen tin',
    Type: 'text',
    Required: false,
    CnIds: ['O'],
  },
];

const radaFields = [
  {
    _id: 'field-tb1-rada-tam-phat-hien',
    Key: 'TamPhatHien',
    Label: 'Tam phat hien',
    Type: 'text',
    Required: false,
    CnIds: ['I'],
  },
  {
    _id: 'field-tb1-rada-goc-quet',
    Key: 'GocQuet',
    Label: 'Goc quet',
    Type: 'text',
    Required: false,
    CnIds: ['I'],
  },
  {
    _id: 'field-tb1-rada-dai-tan',
    Key: 'DaiTanLamViec',
    Label: 'Dai tan lam viec',
    Type: 'text',
    Required: false,
    CnIds: ['I'],
  },
  {
    _id: 'field-tb1-rada-muc-tieu',
    Key: 'MucTieuTheoDoi',
    Label: 'Muc tieu theo doi',
    Type: 'text',
    Required: false,
    CnIds: ['I'],
  },
  {
    _id: 'field-tb1-rada-do-cao',
    Key: 'DoCaoTrinhSat',
    Label: 'Do cao trinh sat',
    Type: 'text',
    Required: false,
    CnIds: ['I'],
  },
];

const defaultValidation = {
  MinLength: 0,
  MaxLength: 0,
  Pattern: '',
  Min: 0,
  Max: 0,
  DataSource: '',
  ApiUrl: '',
  DisplayType: '',
  Options: [],
};

function mergeValidation(validation) {
  return { ...defaultValidation, ...(validation || {}) };
}

function upsertField(field) {
  dynamicFieldCol.updateOne(
    { _id: field._id },
    {
      $set: {
        Key: field.Key,
        Label: field.Label,
        Type: field.Type,
        Required: field.Required,
        Validation: mergeValidation(field.Validation),
        CnIds: field.CnIds ?? [],
        Delete: false,
        ModifyDate: now,
        NguoiSua: actor,
      },
      $setOnInsert: {
        CreateDate: now,
        NguoiTao: actor,
        Version: 1,
      },
    },
    { upsert: true },
  );
}

function upsertFieldSet(id, name, icon, color, desc, fieldIds) {
  fieldSetCol.updateOne(
    { _id: id },
    {
      $set: {
        Name: name,
        Icon: icon,
        Color: color,
        Desc: desc,
        FieldIds: fieldIds,
        Delete: false,
        ModifyDate: now,
        NguoiSua: actor,
      },
      $setOnInsert: {
        CreateDate: now,
        NguoiTao: actor,
        Version: 1,
      },
    },
    { upsert: true },
  );
}

const allFields = [...commonFields, ...thongTinFields, ...radaFields];
allFields.forEach(upsertField);

upsertFieldSet(
  COMMON_FIELDSET_ID,
  'Thong tin chung',
  'Inventory',
  '#2563eb',
  'Thong tin chung cua trang bi nhom 1, dung cho moi chuyen nganh',
  commonFields.map((field) => field._id),
);

upsertFieldSet(
  THONGTIN_FIELDSET_ID,
  'Thong so chuyen nganh Thong tin',
  'SettingsInputAntenna',
  '#0f766e',
  'Cac truong dac thu cho chuyen nganh Thong tin',
  thongTinFields.map((field) => field._id),
);

upsertFieldSet(
  RADA_FIELDSET_ID,
  'Thong so chuyen nganh Ra da',
  'Radar',
  '#7c3aed',
  'Cac truong dac thu cho chuyen nganh Ra da',
  radaFields.map((field) => field._id),
);

formConfigCol.updateOne(
  { _id: FORM_ID },
  {
    $set: {
      Key: 'trang-bi-nhom-1',
      Name: 'Trang bi nhom 1',
      Desc: 'Form runtime nhom 1 gom 3 tab rieng: thong tin chung, thong tin, ra da; field van duoc loc theo chuyen nganh duoc phan quyen',
      Tabs: [
        {
          _id: TAB_COMMON_ID,
          Label: 'Thong tin chung',
          FieldSetIds: [COMMON_FIELDSET_ID],
        },
        {
          _id: TAB_THONGTIN_ID,
          Label: 'Thong tin',
          FieldSetIds: [THONGTIN_FIELDSET_ID],
        },
        {
          _id: TAB_RADA_ID,
          Label: 'Ra da',
          FieldSetIds: [RADA_FIELDSET_ID],
        },
      ],
      Delete: false,
      ModifyDate: now,
      NguoiSua: actor,
    },
    $setOnInsert: {
      CreateDate: now,
      NguoiTao: actor,
      Version: 1,
    },
  },
  { upsert: true },
);

printjson({
  ok: 1,
  db: dbName,
  formConfig: 'trang-bi-nhom-1',
  tabs: [
    'Thong tin chung',
    'Thong tin',
    'Ra da',
  ],
  fieldSets: [
    COMMON_FIELDSET_ID,
    THONGTIN_FIELDSET_ID,
    RADA_FIELDSET_ID,
  ],
  fieldCount: allFields.length,
  visibleByCn: {
    O: allFields.filter((field) => !field.CnIds || field.CnIds.includes('O')).map((field) => field.Key),
    I: allFields.filter((field) => !field.CnIds || field.CnIds.includes('I')).map((field) => field.Key),
  },
});
