const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);
const collection = database.getCollection('TrangBiNhom1');

const now = new Date();
const actor = 'seed-trang-bi-nhom-1-sample-data';

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
      $setOnInsert: {
        CreateDate: toProtoTimestamp(now),
        NguoiTao: actor,
        Version: 1,
      },
    },
    { upsert: true },
  );
}

const sampleDocs = [
  {
    _id: 'tbn1-o101-0001',
    MaTrangBi: 'TBTT-0001',
    Ten: 'May thong tin song ngan co dong PRC-01',
    ma_dinh_danh: 'O.1.01.00.00.00.000',
    ten_danh_muc_trang_bi: 'May thong tin song ngan',
    IDCapTren: 'O.1.00.00.00.00.000',
    IDNganh: 'O',
    IDChuyenNganhKT: 'O',
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
    _id: 'tbn1-o102-0001',
    MaTrangBi: 'TBTT-0002',
    Ten: 'Thiet bi truyen dan quang hop kenh SDH-01',
    ma_dinh_danh: 'O.1.02.00.00.00.000',
    ten_danh_muc_trang_bi: 'Thiet bi truyen dan quang',
    IDCapTren: 'O.1.00.00.00.00.000',
    IDNganh: 'O',
    IDChuyenNganhKT: 'O',
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
    _id: 'tbn1-i101-0001',
    MaTrangBi: 'TBRD-0001',
    Ten: 'Ra da canh gioi tam xa P-18',
    ma_dinh_danh: 'I.1.01.00.00.00.000',
    ten_danh_muc_trang_bi: 'Ra da canh gioi',
    IDCapTren: 'I.1.00.00.00.00.000',
    IDNganh: 'I',
    IDChuyenNganhKT: 'I',
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
    _id: 'tbn1-i102-0001',
    MaTrangBi: 'TBRD-0002',
    Ten: 'Ra da dieu khien hoa luc SNR-125',
    ma_dinh_danh: 'I.1.02.00.00.00.000',
    ten_danh_muc_trang_bi: 'Ra da dieu khien',
    IDCapTren: 'I.1.00.00.00.00.000',
    IDNganh: 'I',
    IDChuyenNganhKT: 'I',
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
