const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);
const collection = database.getCollection('TrangBiNhom1');

const now = new Date();
const actor = 'seed-trang-bi-nhom-1-sample-data';
const LEGACY_SAMPLE_IDS = [
  'tbn1-b101-0001',
  'tbn1-b102-0001',
  'tbn1-o101-0001',
  'tbn1-o102-0001',
  'tbn1-i101-0001',
  'tbn1-i102-0001',
];

function toProtoTimestamp(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms - seconds * 1000) * 1000000);
  return {
    Seconds: NumberLong(String(seconds)),
    Nanos: NumberInt(String(nanos)),
  };
}

function upsertTrangBi(item) {
  collection.updateOne(
    { _id: item._id },
    {
      $set: {
        ...item,
        Delete: false,
        ModifyDate: toProtoTimestamp(now),
        NguoiSua: actor,
      },
      $unset: {
        MaTrangBi: '',
        Ten: '',
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

collection.deleteMany({
  _id: { $in: LEGACY_SAMPLE_IDS },
});

const sampleDocs = [
  {
    _id: '9f8b7f3f-6d8e-4e7e-bf55-6f0f2e27b101',
    ma_dinh_danh: 'B.1.01.00.00.00.000',
    ten_danh_muc_trang_bi: 'B.1.01.00.00.00.000',
    IdCapTren: 'B.1.00.00.00.00.000',
    IdNganh: 'B',
    IdChuyenNganhKT: 'B',
    Nhom: '1',
    KyHieu: 'B101-01',
    SoSerial: 'SN-B-0001',
    HangSanXuat: 'Xuong co khi 789',
    NuocSanXuat: 'Viet Nam',
    NamSanXuat: 2020,
    DonViQuanLy: 'Kho ky thuat B1',
    TinhTrangSuDung: 'Dang su dung',
    GhiChu: 'Mau du lieu nhanh B danh muc B.1.01',
    BLoaiDongCo: 'Diesel',
    BTaiTrong: '3 tan',
    BTocDoToiDa: '65 km/h',
    BApSuatLamViec: '12 bar',
    BMucTieuSuDung: 'Van tai co dong',
    B101CongSuatDongCo: '220 HP',
    B101SoCapSo: 6,
    B101LoaiNhienLieu: 'Dau diesel',
  },
  {
    _id: 'b4e7b2f1-9d65-48d7-86d1-6e38f47ab102',
    ma_dinh_danh: 'B.1.02.00.00.00.000',
    ten_danh_muc_trang_bi: 'B.1.02.00.00.00.000',
    IdCapTren: 'B.1.00.00.00.00.000',
    IdNganh: 'B',
    IdChuyenNganhKT: 'B',
    Nhom: '1',
    KyHieu: 'B102-01',
    SoSerial: 'SN-B-0002',
    HangSanXuat: 'Nha may 19-5',
    NuocSanXuat: 'Viet Nam',
    NamSanXuat: 2021,
    DonViQuanLy: 'Kho ky thuat B2',
    TinhTrangSuDung: 'Du phong',
    GhiChu: 'Mau du lieu nhanh B danh muc B.1.02',
    BLoaiDongCo: 'Dien thuy luc',
    BTaiTrong: '1.5 tan',
    BTocDoToiDa: '40 km/h',
    BApSuatLamViec: '18 bar',
    BMucTieuSuDung: 'Bom cap luu dong',
    B102ApLucBom: '18 bar',
    B102LuuLuong: '45 m3/h',
    B102CheDoVanHanh: 'Tu dong',
  },
  {
    _id: '4d6e8f21-7a34-4b70-a9a2-3f91d58c0101',
    ma_dinh_danh: 'O.1.01.00.00.00.000',
    ten_danh_muc_trang_bi: 'May thong tin song ngan',
    IdCapTren: 'O.1.00.00.00.00.000',
    IdNganh: 'O',
    IdChuyenNganhKT: 'O',
    Nhom: '1',
    KyHieu: 'PRC-01',
    SoSerial: 'SN-TT-0001',
    HangSanXuat: 'Viettel',
    NuocSanXuat: 'Viet Nam',
    NamSanXuat: 2022,
    DonViQuanLy: 'Trung tam Thong tin 1',
    TinhTrangSuDung: 'Dang su dung',
    GhiChu: 'Mau du lieu thong tin song ngan co dong',
    BangTanCongTac: '1.6-30 MHz',
    CuLyLienLac: '120 km',
    KieuDieuChe: 'PSK',
    CongSuatPhat: '150 W',
    TocDoTruyenTin: '64 kbps',
    O101SoKenhLienLac: 8,
    O101LoaiAnten: 'Anten roi co dong',
    O101CheDoTruc: 'Co dong',
  },
  {
    _id: '52f0c7a8-4f31-47c8-9b73-91e2c64d0102',
    ma_dinh_danh: 'O.1.02.00.00.00.000',
    ten_danh_muc_trang_bi: 'Thiet bi truyen dan quang',
    IdCapTren: 'O.1.00.00.00.00.000',
    IdNganh: 'O',
    IdChuyenNganhKT: 'O',
    Nhom: '1',
    KyHieu: 'SDH-01',
    SoSerial: 'SN-TT-0002',
    HangSanXuat: 'VNPT Technology',
    NuocSanXuat: 'Viet Nam',
    NamSanXuat: 2023,
    DonViQuanLy: 'Tieu doan truyen dan 7',
    TinhTrangSuDung: 'Du phong',
    GhiChu: 'Mau du lieu truyen dan quang',
    BangTanCongTac: '1550 nm',
    CuLyLienLac: '180 km',
    KieuDieuChe: 'QAM',
    CongSuatPhat: '20 dBm',
    TocDoTruyenTin: '10 Gbps',
    O102LoaiGiaoDien: 'Quang',
    O102BangThong: '10 Gbps',
    O102SoCongKetNoi: 16,
  },
  {
    _id: '1b8f0a54-8df1-4f7c-a6e3-2d91b73c1101',
    ma_dinh_danh: 'I.1.01.00.00.00.000',
    ten_danh_muc_trang_bi: 'Ra da canh gioi',
    IdCapTren: 'I.1.00.00.00.00.000',
    IdNganh: 'I',
    IdChuyenNganhKT: 'I',
    Nhom: '1',
    KyHieu: 'P-18',
    SoSerial: 'SN-RD-0001',
    HangSanXuat: 'Nga',
    NuocSanXuat: 'Lien bang Nga',
    NamSanXuat: 2019,
    DonViQuanLy: 'Trung doan Ra da 291',
    TinhTrangSuDung: 'Dang su dung',
    GhiChu: 'Mau du lieu ra da canh gioi',
    TamPhatHien: '250 km',
    GocQuet: '360 do',
    DaiTanLamViec: 'VHF',
    MucTieuTheoDoi: '120 muc tieu',
    DoCaoTrinhSat: '25 km',
    I101BanKinhQuet: '250 km',
    I101SoKenhBamBat: 6,
    I101CheDoCanhGioi: '3D',
  },
  {
    _id: '7c4e19f2-0d68-4f91-9d34-5e82a61b1102',
    ma_dinh_danh: 'I.1.02.00.00.00.000',
    ten_danh_muc_trang_bi: 'Ra da dieu khien',
    IdCapTren: 'I.1.00.00.00.00.000',
    IdNganh: 'I',
    IdChuyenNganhKT: 'I',
    Nhom: '1',
    KyHieu: 'SNR-125',
    SoSerial: 'SN-RD-0002',
    HangSanXuat: 'Belarus',
    NuocSanXuat: 'Belarus',
    NamSanXuat: 2021,
    DonViQuanLy: 'Tieu doan hoa luc 32',
    TinhTrangSuDung: 'Bao quan',
    GhiChu: 'Mau du lieu ra da dieu khien hoa luc',
    TamPhatHien: '180 km',
    GocQuet: '120 do',
    DaiTanLamViec: 'X-band',
    MucTieuTheoDoi: '24 muc tieu',
    DoCaoTrinhSat: '18 km',
    I102TamBat: '180 km',
    I102DoChinhXac: '0.3 do',
    I102KenhDanBan: 4,
  },
];

sampleDocs.forEach(upsertTrangBi);

printjson({
  collection: 'TrangBiNhom1',
  seeded: sampleDocs.length,
  ids: sampleDocs.map((item) => item._id),
});
