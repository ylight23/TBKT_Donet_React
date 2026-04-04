const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);
const collection = database.getCollection('DanhMucTrangBi');

const now = new Date();
const actor = 'seed-danh-muc-trang-bi-sample';

function toProtoTimestamp(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms - (seconds * 1000)) * 1000000);
  return {
    Seconds: NumberLong(String(seconds)),
    Nanos: NumberInt(String(nanos)),
  };
}

function upsertCatalogNode(node) {
  collection.updateOne(
    { _id: node._id },
    {
      $set: {
        Ten: node.Ten,
        TenDayDu: node.TenDayDu ?? node.Ten,
        GhiChu: node.GhiChu ?? null,
        CoCapDuoi: node.CoCapDuoi,
        ThuTu: node.ThuTu,
        ThuTuSapXep: node.ThuTuSapXep,
        IdCapTren: node.IdCapTren,
        IdChuyenNganhKT: node.IdChuyenNganhKT,
        IdNganh: node.IdNganh,
        Nhom: node.Nhom ?? 1,
        DongBoTBKT1: node.DongBoTBKT1 ?? false,
        IdDonViTinh: node.IdDonViTinh ?? 'bo',
        NgaySua: toProtoTimestamp(now),
        NguoiSua: actor,
      },
      $setOnInsert: {
        NgayTao: toProtoTimestamp(now),
        NguoiTao: actor,
        DanhDiem: null,
        NamSanXuat: null,
        HangSanXuat: null,
        IdMaKiemKe: null,
        IdTBKTNhom1: null,
        IdQuocGiaSanXuat: null,
      },
    },
    { upsert: true },
  );
}

const sampleNodes = [
  {
    _id: 'O.1.00.00.00.00.000',
    Ten: 'Trang bị nhóm 1 - Thông tin',
    TenDayDu: 'Trang bị nhóm 1 chuyên ngành Thông tin',
    IdCapTren: 'O.0.00.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 1,
    ThuTuSapXep: 'O.00001.00000.00000.00000.00000.00000',
  },
  {
    _id: 'O.1.01.00.00.00.000',
    Ten: 'Máy thông tin sóng ngắn',
    TenDayDu: 'Danh mục máy thông tin sóng ngắn',
    IdCapTren: 'O.1.00.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 1,
    ThuTuSapXep: 'O.00001.00001.00000.00000.00000.00000',
  },
  {
    _id: 'O.1.02.00.00.00.000',
    Ten: 'Thiết bị truyền dẫn quang',
    TenDayDu: 'Danh mục thiết bị truyền dẫn quang',
    IdCapTren: 'O.1.00.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 2,
    ThuTuSapXep: 'O.00001.00002.00000.00000.00000.00000',
  },
  {
    _id: 'O.1.01.01.00.00.000',
    Ten: 'Máy thu phát sóng ngắn cơ động',
    TenDayDu: 'Máy thu phát sóng ngắn cơ động',
    IdCapTren: 'O.1.01.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 1,
    ThuTuSapXep: 'O.00001.00001.00001.00000.00000.00000',
  },
  {
    _id: 'O.1.01.02.00.00.000',
    Ten: 'Máy vô tuyến sóng ngắn cố định',
    TenDayDu: 'Máy vô tuyến sóng ngắn cố định',
    IdCapTren: 'O.1.01.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 2,
    ThuTuSapXep: 'O.00001.00001.00002.00000.00000.00000',
  },
  {
    _id: 'O.1.01.03.00.00.000',
    Ten: 'Bộ khuếch đại công suất sóng ngắn',
    TenDayDu: 'Bộ khuếch đại công suất sóng ngắn',
    IdCapTren: 'O.1.01.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 3,
    ThuTuSapXep: 'O.00001.00001.00003.00000.00000.00000',
  },
  {
    _id: 'O.1.02.01.00.00.000',
    Ten: 'Thiết bị ghép kênh quang',
    TenDayDu: 'Thiết bị ghép kênh quang',
    IdCapTren: 'O.1.02.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 1,
    ThuTuSapXep: 'O.00001.00002.00001.00000.00000.00000',
  },
  {
    _id: 'O.1.02.02.00.00.000',
    Ten: 'Thiết bị truyền dẫn vi ba số',
    TenDayDu: 'Thiết bị truyền dẫn vi ba số',
    IdCapTren: 'O.1.02.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 2,
    ThuTuSapXep: 'O.00001.00002.00002.00000.00000.00000',
  },
  {
    _id: 'O.1.02.03.00.00.000',
    Ten: 'Bộ chuyển đổi quang điện',
    TenDayDu: 'Bộ chuyển đổi quang điện',
    IdCapTren: 'O.1.02.00.00.00.000',
    IdChuyenNganhKT: 'O',
    IdNganh: 'O',
    CoCapDuoi: true,
    ThuTu: 3,
    ThuTuSapXep: 'O.00001.00002.00003.00000.00000.00000',
  },
  {
    _id: 'I.1.00.00.00.00.000',
    Ten: 'Trang bị nhóm 1 - Ra đa',
    TenDayDu: 'Trang bị nhóm 1 chuyên ngành Ra đa',
    IdCapTren: 'I.0.00.00.00.00.000',
    IdChuyenNganhKT: 'I',
    IdNganh: 'I',
    CoCapDuoi: true,
    ThuTu: 1,
    ThuTuSapXep: 'I.00001.00000.00000.00000.00000.00000',
  },
  {
    _id: 'I.1.01.00.00.00.000',
    Ten: 'Ra đa cảnh giới',
    TenDayDu: 'Danh mục ra đa cảnh giới',
    IdCapTren: 'I.1.00.00.00.00.000',
    IdChuyenNganhKT: 'I',
    IdNganh: 'I',
    CoCapDuoi: true,
    ThuTu: 1,
    ThuTuSapXep: 'I.00001.00001.00000.00000.00000.00000',
  },
  {
    _id: 'I.1.02.00.00.00.000',
    Ten: 'Ra đa điều khiển',
    TenDayDu: 'Danh mục ra đa điều khiển',
    IdCapTren: 'I.1.00.00.00.00.000',
    IdChuyenNganhKT: 'I',
    IdNganh: 'I',
    CoCapDuoi: true,
    ThuTu: 2,
    ThuTuSapXep: 'I.00001.00002.00000.00000.00000.00000',
  },
  {
    _id: 'I.1.01.00.00.00.001',
    Ten: 'Ra đa cảnh giới tầm xa',
    TenDayDu: 'Ra đa cảnh giới tầm xa',
    IdCapTren: 'I.1.01.00.00.00.000',
    IdChuyenNganhKT: 'I',
    IdNganh: 'I',
    CoCapDuoi: false,
    ThuTu: 1,
    ThuTuSapXep: 'I.00001.00001.00000.00000.00000.00001',
  },
  {
    _id: 'I.1.02.00.00.00.001',
    Ten: 'Ra đa điều khiển hỏa lực số 1',
    TenDayDu: 'Ra đa điều khiển hỏa lực số 1',
    IdCapTren: 'I.1.02.00.00.00.000',
    IdChuyenNganhKT: 'I',
    IdNganh: 'I',
    CoCapDuoi: false,
    ThuTu: 1,
    ThuTuSapXep: 'I.00001.00002.00000.00000.00000.00001',
  },
  {
    _id: 'I.1.02.00.00.00.002',
    Ten: 'Ra đa điều khiển hỏa lực số 2',
    TenDayDu: 'Ra đa điều khiển hỏa lực số 2',
    IdCapTren: 'I.1.02.00.00.00.000',
    IdChuyenNganhKT: 'I',
    IdNganh: 'I',
    CoCapDuoi: false,
    ThuTu: 2,
    ThuTuSapXep: 'I.00001.00002.00000.00000.00000.00002',
  },
];

sampleNodes.forEach(upsertCatalogNode);

printjson({
  updated: sampleNodes.length,
  sampleRoots: [
    'O.1.01.00.00.00.000',
    'O.1.02.00.00.00.000',
    'I.1.01.00.00.00.000',
    'I.1.02.00.00.00.000',
  ],
});
