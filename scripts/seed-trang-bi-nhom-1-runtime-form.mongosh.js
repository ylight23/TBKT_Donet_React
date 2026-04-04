const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const dynamicFieldCol = database.getCollection('DynamicField');
const fieldSetCol = database.getCollection('FieldSet');
const formConfigCol = database.getCollection('FormConfig');

const now = new Date();
const actor = 'seed-trang-bi-nhom-1-runtime-form';

const IDS = {
  form: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0001',
  tabs: {
    common: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0101',
    thongTin: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0102',
    rada: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0103',
    categoryGroup: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0104',
    categoryO101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0105',
    categoryO102: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0106',
    categoryI101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0107',
  },
  fieldSets: {
    common: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0201',
    thongTin: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0202',
    rada: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0203',
    categoryO101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0204',
    categoryO102: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0205',
    categoryI101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0206',
  },
  fields: {
    maTrangBi: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1001',
    tenTrangBi: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1002',
    maDanhMuc: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1003',
    idCapTren: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1004',
    idNganh: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1005',
    idCnkt: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1006',
    nhom: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1007',
    kyHieu: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1008',
    soSerial: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1009',
    hangSanXuat: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1010',
    nuocSanXuat: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1011',
    namSanXuat: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1012',
    donViQuanLy: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1013',
    tinhTrangSuDung: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1014',
    ghiChu: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1015',
    bangTan: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1101',
    cuLy: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1102',
    kieuDieuChe: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1103',
    congSuatPhat: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1104',
    tocDoTruyen: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1105',
    tamPhatHien: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1201',
    gocQuet: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1202',
    daiTan: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1203',
    mucTieu: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1204',
    doCao: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1205',
    o101SoKenh: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1301',
    o101LoaiAnten: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1302',
    o101CheDoTruc: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1303',
    o102LoaiGiaoDien: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1304',
    o102BangThong: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1305',
    o102SoCong: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1306',
    i101BanKinhQuet: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1401',
    i101SoKenhBamBat: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1402',
    i101CheDoCanhGioi: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1403',
  },
};

const LEGACY = {
  formIds: ['formconfig-trang-bi-nhom-1'],
  tabIds: [
    'tab-trang-bi-nhom-1-common',
    'tab-trang-bi-nhom-1-thongtin',
    'tab-trang-bi-nhom-1-rada',
    'tab-trang-bi-nhom-1-category-group',
    'tab-trang-bi-nhom-1-category-o101',
    'tab-trang-bi-nhom-1-category-o102',
    'tab-trang-bi-nhom-1-category-i101',
  ],
  fieldSetIds: [
    'fieldset-trang-bi-nhom-1-runtime',
    'fieldset-trang-bi-nhom-1-common',
    'fieldset-trang-bi-nhom-1-thongtin',
    'fieldset-trang-bi-nhom-1-rada',
    'fieldset-trang-bi-nhom-1-category-o101',
    'fieldset-trang-bi-nhom-1-category-o102',
    'fieldset-trang-bi-nhom-1-category-i101',
  ],
  fieldIds: [
    'field-tb1-ma-trang-bi',
    'field-tb1-ten-trang-bi',
    'field-tb1-ma-danh-muc',
    'field-tb1-id-cap-tren',
    'field-tb1-id-nganh',
    'field-tb1-id-cnkt',
    'field-tb1-nhom',
    'field-tb1-ky-hieu',
    'field-tb1-so-serial',
    'field-tb1-hang-san-xuat',
    'field-tb1-nuoc-san-xuat',
    'field-tb1-nam-san-xuat',
    'field-tb1-don-vi-quan-ly',
    'field-tb1-tinh-trang-su-dung',
    'field-tb1-ghi-chu',
    'field-tb1-thongtin-bang-tan',
    'field-tb1-thongtin-cu-ly',
    'field-tb1-thongtin-kieu-dieu-che',
    'field-tb1-thongtin-cong-suat-phat',
    'field-tb1-thongtin-toc-do-truyen',
    'field-tb1-rada-tam-phat-hien',
    'field-tb1-rada-goc-quet',
    'field-tb1-rada-dai-tan',
    'field-tb1-rada-muc-tieu',
    'field-tb1-rada-do-cao',
    'field-tb1-category-o101-so-kenh',
    'field-tb1-category-o101-loai-anten',
    'field-tb1-category-o101-che-do-truc',
    'field-tb1-category-o102-loai-giao-dien',
    'field-tb1-category-o102-bang-thong',
    'field-tb1-category-o102-so-cong',
    'field-tb1-category-i101-ban-kinh-quet',
    'field-tb1-category-i101-so-kenh-bam',
    'field-tb1-category-i101-che-do-canh-gioi',
  ],
};

const CATEGORY_CODES = {
  O101: 'O.1.01.00.00.00.000',
  O102: 'O.1.02.00.00.00.000',
  I101: 'I.1.01.00.00.00.000',
};

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

function toProtoTimestamp(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms - seconds * 1000) * 1000000);
  return {
    Seconds: NumberLong(String(seconds)),
    Nanos: NumberInt(String(nanos)),
  };
}

function mergeValidation(validation) {
  return { ...defaultValidation, ...(validation || {}) };
}

function cleanupLegacyDocs() {
  dynamicFieldCol.deleteMany({ _id: { $in: LEGACY.fieldIds } });
  fieldSetCol.deleteMany({ _id: { $in: LEGACY.fieldSetIds } });
  formConfigCol.deleteMany({
    $or: [
      { _id: { $in: LEGACY.formIds } },
      { Key: 'trang-bi-nhom-1', _id: { $ne: IDS.form } },
    ],
  });
}

function upsertField(field) {
  dynamicFieldCol.updateOne(
    { _id: field.id },
    {
      $set: {
        Key: field.key,
        Label: field.label,
        Type: field.type,
        Required: field.required,
        Validation: mergeValidation(field.validation),
        CnIds: field.cnIds ?? [],
        Delete: false,
        ModifyDate: toProtoTimestamp(now),
        NguoiSua: actor,
      },
      $setOnInsert: {
        CreateDate: toProtoTimestamp(now),
        NguoiTao: actor,
        Version: 1,
      },
    },
    { upsert: true },
  );
}

function upsertFieldSet(fieldSet) {
  fieldSetCol.updateOne(
    { _id: fieldSet.id },
    {
      $set: {
        Name: fieldSet.name,
        Icon: fieldSet.icon,
        Color: fieldSet.color,
        Desc: fieldSet.desc,
        FieldIds: fieldSet.fieldIds,
        Delete: false,
        ModifyDate: toProtoTimestamp(now),
        NguoiSua: actor,
      },
      $setOnInsert: {
        CreateDate: toProtoTimestamp(now),
        NguoiTao: actor,
        Version: 1,
      },
    },
    { upsert: true },
  );
}

function makeSyncLeaf(fieldSetId, tabType, parentId, syncCategory) {
  const setIds = [fieldSetId];
  if (tabType && tabType !== 'normal') setIds.push(`__meta:type:${tabType}`);
  if (parentId) setIds.push(`__meta:parent:${parentId}`);
  if (syncCategory) setIds.push(`__meta:category:${syncCategory}`);
  setIds.push('__meta:source:root_equipment');
  return setIds;
}

const commonFields = [
  { id: IDS.fields.maTrangBi, key: 'Id', label: 'Ma trang bi', type: 'text', required: true },
  { id: IDS.fields.tenTrangBi, key: 'Ten', label: 'Ten trang bi', type: 'text', required: true },
  {
    id: IDS.fields.maDanhMuc,
    key: 'MaDanhMucTrangBi',
    label: 'Ma danh muc trang bi',
    type: 'select',
    required: true,
    validation: { Options: [CATEGORY_CODES.O101, CATEGORY_CODES.O102, CATEGORY_CODES.I101] },
  },
  { id: IDS.fields.idCapTren, key: 'IDCapTren', label: 'Ma cap tren', type: 'text', required: false },
  { id: IDS.fields.idNganh, key: 'IDNganh', label: 'Nganh', type: 'text', required: true },
  {
    id: IDS.fields.idCnkt,
    key: 'IDChuyenNganhKT',
    label: 'Chuyen nganh ky thuat',
    type: 'select',
    required: true,
    validation: { Options: ['O', 'I'] },
  },
  {
    id: IDS.fields.nhom,
    key: 'Nhom',
    label: 'Nhom trang bi',
    type: 'select',
    required: true,
    validation: { Options: ['1'] },
  },
  { id: IDS.fields.kyHieu, key: 'KyHieu', label: 'Ky hieu', type: 'text', required: false },
  { id: IDS.fields.soSerial, key: 'SoSerial', label: 'So serial', type: 'text', required: false },
  { id: IDS.fields.hangSanXuat, key: 'HangSanXuat', label: 'Hang san xuat', type: 'text', required: false },
  { id: IDS.fields.nuocSanXuat, key: 'NuocSanXuat', label: 'Nuoc san xuat', type: 'text', required: false },
  {
    id: IDS.fields.namSanXuat,
    key: 'NamSanXuat',
    label: 'Nam san xuat',
    type: 'number',
    required: false,
    validation: { Min: 1900, Max: 2100 },
  },
  { id: IDS.fields.donViQuanLy, key: 'DonViQuanLy', label: 'Don vi quan ly', type: 'text', required: false },
  {
    id: IDS.fields.tinhTrangSuDung,
    key: 'TinhTrangSuDung',
    label: 'Tinh trang su dung',
    type: 'select',
    required: false,
    validation: { Options: ['Dang su dung', 'Du phong', 'Bao quan', 'Sua chua'] },
  },
  { id: IDS.fields.ghiChu, key: 'GhiChu', label: 'Ghi chu', type: 'textarea', required: false },
];

const thongTinFields = [
  { id: IDS.fields.bangTan, key: 'BangTanCongTac', label: 'Bang tan cong tac', type: 'text', required: false, cnIds: ['O'] },
  { id: IDS.fields.cuLy, key: 'CuLyLienLac', label: 'Cu ly lien lac', type: 'text', required: false, cnIds: ['O'] },
  {
    id: IDS.fields.kieuDieuChe,
    key: 'KieuDieuChe',
    label: 'Kieu dieu che',
    type: 'select',
    required: false,
    cnIds: ['O'],
    validation: { Options: ['AM', 'FM', 'PSK', 'QAM'] },
  },
  { id: IDS.fields.congSuatPhat, key: 'CongSuatPhat', label: 'Cong suat phat', type: 'text', required: false, cnIds: ['O'] },
  { id: IDS.fields.tocDoTruyen, key: 'TocDoTruyenTin', label: 'Toc do truyen tin', type: 'text', required: false, cnIds: ['O'] },
];

const radaFields = [
  { id: IDS.fields.tamPhatHien, key: 'TamPhatHien', label: 'Tam phat hien', type: 'text', required: false, cnIds: ['I'] },
  { id: IDS.fields.gocQuet, key: 'GocQuet', label: 'Goc quet', type: 'text', required: false, cnIds: ['I'] },
  { id: IDS.fields.daiTan, key: 'DaiTanLamViec', label: 'Dai tan lam viec', type: 'text', required: false, cnIds: ['I'] },
  { id: IDS.fields.mucTieu, key: 'MucTieuTheoDoi', label: 'Muc tieu theo doi', type: 'text', required: false, cnIds: ['I'] },
  { id: IDS.fields.doCao, key: 'DoCaoTrinhSat', label: 'Do cao trinh sat', type: 'text', required: false, cnIds: ['I'] },
];

const categoryO101Fields = [
  { id: IDS.fields.o101SoKenh, key: 'O101SoKenhLienLac', label: 'So kenh lien lac', type: 'number', required: false, cnIds: ['O'] },
  { id: IDS.fields.o101LoaiAnten, key: 'O101LoaiAnten', label: 'Loai anten', type: 'text', required: false, cnIds: ['O'] },
  {
    id: IDS.fields.o101CheDoTruc,
    key: 'O101CheDoTruc',
    label: 'Che do truc',
    type: 'select',
    required: false,
    cnIds: ['O'],
    validation: { Options: ['Co dinh', 'Co dong', 'Da che do'] },
  },
];

const categoryO102Fields = [
  {
    id: IDS.fields.o102LoaiGiaoDien,
    key: 'O102LoaiGiaoDien',
    label: 'Loai giao dien truyen dan',
    type: 'select',
    required: false,
    cnIds: ['O'],
    validation: { Options: ['Quang', 'Dong truc', 'Vi ba so'] },
  },
  { id: IDS.fields.o102BangThong, key: 'O102BangThong', label: 'Bang thong', type: 'text', required: false, cnIds: ['O'] },
  { id: IDS.fields.o102SoCong, key: 'O102SoCongKetNoi', label: 'So cong ket noi', type: 'number', required: false, cnIds: ['O'] },
];

const categoryI101Fields = [
  { id: IDS.fields.i101BanKinhQuet, key: 'I101BanKinhQuet', label: 'Ban kinh quet', type: 'text', required: false, cnIds: ['I'] },
  { id: IDS.fields.i101SoKenhBamBat, key: 'I101SoKenhBamBat', label: 'So kenh bam bat', type: 'number', required: false, cnIds: ['I'] },
  {
    id: IDS.fields.i101CheDoCanhGioi,
    key: 'I101CheDoCanhGioi',
    label: 'Che do canh gioi',
    type: 'select',
    required: false,
    cnIds: ['I'],
    validation: { Options: ['2D', '3D', 'Muc tieu thap'] },
  },
];

const allFields = [
  ...commonFields,
  ...thongTinFields,
  ...radaFields,
  ...categoryO101Fields,
  ...categoryO102Fields,
  ...categoryI101Fields,
];

const fieldSets = [
  {
    id: IDS.fieldSets.common,
    name: 'Thong tin chung',
    icon: 'Inventory',
    color: '#2563eb',
    desc: 'Thong tin chung cua trang bi nhom 1, dung cho moi chuyen nganh',
    fieldIds: commonFields.map((field) => field.id),
  },
  {
    id: IDS.fieldSets.thongTin,
    name: 'Thong so chuyen nganh Thong tin',
    icon: 'SettingsInputAntenna',
    color: '#0f766e',
    desc: 'Cac truong dac thu cho chuyen nganh Thong tin',
    fieldIds: thongTinFields.map((field) => field.id),
  },
  {
    id: IDS.fieldSets.rada,
    name: 'Thong so chuyen nganh Ra da',
    icon: 'Radar',
    color: '#7c3aed',
    desc: 'Cac truong dac thu cho chuyen nganh Ra da',
    fieldIds: radaFields.map((field) => field.id),
  },
  {
    id: IDS.fieldSets.categoryO101,
    name: 'Chi tiet danh muc O.1.01',
    icon: 'SettingsEthernet',
    color: '#0ea5e9',
    desc: 'Bo fieldset mau cho danh muc O.1.01.00.00.00.000',
    fieldIds: categoryO101Fields.map((field) => field.id),
  },
  {
    id: IDS.fieldSets.categoryO102,
    name: 'Chi tiet danh muc O.1.02',
    icon: 'Router',
    color: '#14b8a6',
    desc: 'Bo fieldset mau cho danh muc O.1.02.00.00.00.000',
    fieldIds: categoryO102Fields.map((field) => field.id),
  },
  {
    id: IDS.fieldSets.categoryI101,
    name: 'Chi tiet danh muc I.1.01',
    icon: 'Radar',
    color: '#8b5cf6',
    desc: 'Bo fieldset mau cho danh muc I.1.01.00.00.00.000',
    fieldIds: categoryI101Fields.map((field) => field.id),
  },
];

cleanupLegacyDocs();
allFields.forEach(upsertField);
fieldSets.forEach(upsertFieldSet);

formConfigCol.updateOne(
  { _id: IDS.form },
  {
    $set: {
      Key: 'trang-bi-nhom-1',
      Name: 'Trang bi nhom 1',
      Desc: 'Form runtime nhom 1 gom thong tin chung, thong so chuyen nganh va bo tab chi tiet theo ma danh muc trang bi',
      Tabs: [
        {
          _id: IDS.tabs.common,
          Label: 'Thong tin chung',
          FieldSetIds: [IDS.fieldSets.common],
        },
        {
          _id: IDS.tabs.thongTin,
          Label: 'Thong tin',
          FieldSetIds: [IDS.fieldSets.thongTin],
        },
        {
          _id: IDS.tabs.rada,
          Label: 'Ra da',
          FieldSetIds: [IDS.fieldSets.rada],
        },
        {
          _id: IDS.tabs.categoryGroup,
          Label: 'Chi tiet theo danh muc',
          FieldSetIds: ['__meta:type:sync-group'],
        },
        {
          _id: IDS.tabs.categoryO101,
          Label: 'Danh muc O.1.01',
          FieldSetIds: makeSyncLeaf(IDS.fieldSets.categoryO101, 'sync-leaf', IDS.tabs.categoryGroup, CATEGORY_CODES.O101),
        },
        {
          _id: IDS.tabs.categoryO102,
          Label: 'Danh muc O.1.02',
          FieldSetIds: makeSyncLeaf(IDS.fieldSets.categoryO102, 'sync-leaf', IDS.tabs.categoryGroup, CATEGORY_CODES.O102),
        },
        {
          _id: IDS.tabs.categoryI101,
          Label: 'Danh muc I.1.01',
          FieldSetIds: makeSyncLeaf(IDS.fieldSets.categoryI101, 'sync-leaf', IDS.tabs.categoryGroup, CATEGORY_CODES.I101),
        },
      ],
      Delete: false,
      ModifyDate: toProtoTimestamp(now),
      NguoiSua: actor,
    },
    $setOnInsert: {
      CreateDate: toProtoTimestamp(now),
      NguoiTao: actor,
      Version: 1,
    },
  },
  { upsert: true },
);

printjson({
  formConfig: 'trang-bi-nhom-1',
  formId: IDS.form,
  fieldCount: allFields.length,
  fieldSetCount: fieldSets.length,
  sampleFieldIds: allFields.slice(0, 5).map((field) => ({ key: field.key, id: field.id })),
});
