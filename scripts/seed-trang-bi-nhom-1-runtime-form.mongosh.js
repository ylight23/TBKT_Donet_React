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
    categoryI102: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0108',
    categoryB101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0109',
    categoryB102: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0110',
  },
  fieldSets: {
    common: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0201',
    thongTin: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0202',
    rada: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0203',
    categoryO101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0204',
    categoryO102: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0205',
    categoryI101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0206',
    categoryI102: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0207',
    branchB: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0208',
    categoryB101: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0209',
    categoryB102: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0210',
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
    i102TamBat: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1404',
    i102DoChinhXac: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1405',
    i102KenhDanBan: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1406',
    bLoaiDongCo: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1501',
    bTaiTrong: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1502',
    bTocDoToiDa: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1503',
    bApSuatLamViec: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1504',
    bMucTieuSuDung: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1505',
    b101CongSuatDongCo: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1601',
    b101SoCapSo: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1602',
    b101LoaiNhienLieu: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1603',
    b102ApLucBom: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1604',
    b102LuuLuong: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1605',
    b102CheDoVanHanh: '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1606',
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
    'tab-trang-bi-nhom-1-category-i102',
    'tab-trang-bi-nhom-1-category-b101',
    'tab-trang-bi-nhom-1-category-b102',
  ],
  fieldSetIds: [
    'fieldset-trang-bi-nhom-1-runtime',
    'fieldset-trang-bi-nhom-1-common',
    'fieldset-trang-bi-nhom-1-thongtin',
    'fieldset-trang-bi-nhom-1-rada',
    'fieldset-trang-bi-nhom-1-category-o101',
    'fieldset-trang-bi-nhom-1-category-o102',
    'fieldset-trang-bi-nhom-1-category-i101',
    'fieldset-trang-bi-nhom-1-category-i102',
    'fieldset-trang-bi-nhom-1-b',
    'fieldset-trang-bi-nhom-1-category-b101',
    'fieldset-trang-bi-nhom-1-category-b102',
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
    'field-tb1-category-i102-tam-bat',
    'field-tb1-category-i102-do-chinh-xac',
    'field-tb1-category-i102-kenh-dan-ban',
    'field-tb1-b-loai-dong-co',
    'field-tb1-b-tai-trong',
    'field-tb1-b-toc-do-toi-da',
    'field-tb1-b-ap-suat-lam-viec',
    'field-tb1-b-muc-tieu-su-dung',
    'field-tb1-category-b101-cong-suat-dong-co',
    'field-tb1-category-b101-so-cap-so',
    'field-tb1-category-b101-loai-nhien-lieu',
    'field-tb1-category-b102-ap-luc-bom',
    'field-tb1-category-b102-luu-luong',
    'field-tb1-category-b102-che-do-van-hanh',
  ],
};

const CATEGORY_CODES = {
  B101: 'B.1.01.00.00.00.000',
  B102: 'B.1.02.00.00.00.000',
  O101: 'O.1.01.00.00.00.000',
  O102: 'O.1.02.00.00.00.000',
  I101: 'I.1.01.00.00.00.000',
  I102: 'I.1.02.00.00.00.000',
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
  dynamicFieldCol.deleteMany({ _id: { $in: [IDS.fields.maTrangBi] } });
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
        ...(fieldSet.maDanhMucTrangBi ? { MaDanhMucTrangBi: fieldSet.maDanhMucTrangBi } : {}),
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

const commonFields = [
  { id: IDS.fields.tenTrangBi, key: 'ten_danh_muc_trang_bi', label: 'Ten danh muc', type: 'text', required: true },
  {
    id: IDS.fields.maDanhMuc,
    key: 'ma_dinh_danh',
    label: 'Ma dinh danh',
    type: 'select',
    required: true,
    validation: { Options: [CATEGORY_CODES.B101, CATEGORY_CODES.B102, CATEGORY_CODES.O101, CATEGORY_CODES.O102, CATEGORY_CODES.I101, CATEGORY_CODES.I102] },
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

const branchBFields = [
  { id: IDS.fields.bLoaiDongCo, key: 'BLoaiDongCo', label: 'Loai dong co', type: 'text', required: false, cnIds: ['B'] },
  { id: IDS.fields.bTaiTrong, key: 'BTaiTrong', label: 'Tai trong', type: 'text', required: false, cnIds: ['B'] },
  { id: IDS.fields.bTocDoToiDa, key: 'BTocDoToiDa', label: 'Toc do toi da', type: 'text', required: false, cnIds: ['B'] },
  { id: IDS.fields.bApSuatLamViec, key: 'BApSuatLamViec', label: 'Ap suat lam viec', type: 'text', required: false, cnIds: ['B'] },
  { id: IDS.fields.bMucTieuSuDung, key: 'BMucTieuSuDung', label: 'Muc tieu su dung', type: 'text', required: false, cnIds: ['B'] },
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

const categoryI102Fields = [
  { id: IDS.fields.i102TamBat, key: 'I102TamBat', label: 'Tam bat', type: 'text', required: false, cnIds: ['I'] },
  { id: IDS.fields.i102DoChinhXac, key: 'I102DoChinhXac', label: 'Do chinh xac', type: 'text', required: false, cnIds: ['I'] },
  { id: IDS.fields.i102KenhDanBan, key: 'I102KenhDanBan', label: 'So kenh dan ban', type: 'number', required: false, cnIds: ['I'] },
];

const categoryB101Fields = [
  { id: IDS.fields.b101CongSuatDongCo, key: 'B101CongSuatDongCo', label: 'Cong suat dong co', type: 'text', required: false, cnIds: ['B'] },
  { id: IDS.fields.b101SoCapSo, key: 'B101SoCapSo', label: 'So cap so', type: 'number', required: false, cnIds: ['B'] },
  {
    id: IDS.fields.b101LoaiNhienLieu,
    key: 'B101LoaiNhienLieu',
    label: 'Loai nhien lieu',
    type: 'select',
    required: false,
    cnIds: ['B'],
    validation: { Options: ['Xang', 'Dau diesel', 'Dien'] },
  },
];

const categoryB102Fields = [
  { id: IDS.fields.b102ApLucBom, key: 'B102ApLucBom', label: 'Ap luc bom', type: 'text', required: false, cnIds: ['B'] },
  { id: IDS.fields.b102LuuLuong, key: 'B102LuuLuong', label: 'Luu luong', type: 'text', required: false, cnIds: ['B'] },
  {
    id: IDS.fields.b102CheDoVanHanh,
    key: 'B102CheDoVanHanh',
    label: 'Che do van hanh',
    type: 'select',
    required: false,
    cnIds: ['B'],
    validation: { Options: ['Tu dong', 'Ban tu dong', 'Thu cong'] },
  },
];

const allFields = [
  ...commonFields,
  ...branchBFields,
  ...thongTinFields,
  ...radaFields,
  ...categoryB101Fields,
  ...categoryB102Fields,
  ...categoryO101Fields,
  ...categoryO102Fields,
  ...categoryI101Fields,
  ...categoryI102Fields,
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
    id: IDS.fieldSets.branchB,
    name: 'Thong so chuyen nganh B',
    icon: 'DirectionsCar',
    color: '#b45309',
    desc: 'Cac truong mau cho nhanh B',
    fieldIds: branchBFields.map((field) => field.id),
  },
  {
    id: IDS.fieldSets.categoryB101,
    name: 'Chi tiet danh muc B.1.01',
    icon: 'BuildCircle',
    color: '#d97706',
    desc: 'Bo fieldset mau cho danh muc B.1.01.00.00.00.000',
    fieldIds: categoryB101Fields.map((field) => field.id),
    maDanhMucTrangBi: [CATEGORY_CODES.B101],
  },
  {
    id: IDS.fieldSets.categoryB102,
    name: 'Chi tiet danh muc B.1.02',
    icon: 'PrecisionManufacturing',
    color: '#f59e0b',
    desc: 'Bo fieldset mau cho danh muc B.1.02.00.00.00.000',
    fieldIds: categoryB102Fields.map((field) => field.id),
    maDanhMucTrangBi: [CATEGORY_CODES.B102],
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
    maDanhMucTrangBi: [CATEGORY_CODES.O101],
  },
  {
    id: IDS.fieldSets.categoryO102,
    name: 'Chi tiet danh muc O.1.02',
    icon: 'Router',
    color: '#14b8a6',
    desc: 'Bo fieldset mau cho danh muc O.1.02.00.00.00.000',
    fieldIds: categoryO102Fields.map((field) => field.id),
    maDanhMucTrangBi: [CATEGORY_CODES.O102],
  },
  {
    id: IDS.fieldSets.categoryI101,
    name: 'Chi tiet danh muc I.1.01',
    icon: 'Radar',
    color: '#8b5cf6',
    desc: 'Bo fieldset mau cho danh muc I.1.01.00.00.00.000',
    fieldIds: categoryI101Fields.map((field) => field.id),
    maDanhMucTrangBi: [CATEGORY_CODES.I101],
  },
  {
    id: IDS.fieldSets.categoryI102,
    name: 'Chi tiet danh muc I.1.02',
    icon: 'TrackChanges',
    color: '#6d28d9',
    desc: 'Bo fieldset mau cho danh muc I.1.02.00.00.00.000',
    fieldIds: categoryI102Fields.map((field) => field.id),
    maDanhMucTrangBi: [CATEGORY_CODES.I102],
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
          Label: 'Thong so ky thuat',
          FieldSetIds: [IDS.fieldSets.thongTin, IDS.fieldSets.rada],
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
