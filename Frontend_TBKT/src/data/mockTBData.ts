// ============================================================
// Mock data cho hệ thống Quản lý Trang bị Kỹ thuật THÔNG TIN
// Tổng cục Hậu cần Kỹ thuật - BQP
// ============================================================

// ── Enum Trạng thái trang bị ─────────────────────────────────
export enum TrangThaiTrangBi {
  HoatDong   = 'Hoạt động',
  SuaChua    = 'Sửa chữa',
  NiemCat    = 'Niêm cất',
  ChoThanhLy = 'Chờ thanh lý',
  DaThanhLy  = 'Đã thanh lý',
}

// ── Enum Chất lượng ──────────────────────────────────────────
export enum ChatLuong {
  Tot     = 'Tốt',
  Kha     = 'Khá',
  TrungBinh = 'Trung bình',
  Xau     = 'Xấu',
  HỏngHoc = 'Hỏng hóc',
}

// ── Interface TrangBi ────────────────────────────────────────
export interface ITrangBi {
  id:            string;
  maTrangBi:     string;
  ten:           string;
  loai:          string;
  serial:        string;
  mac:           string;
  donVi:         string;
  trangThai:     TrangThaiTrangBi;
  chatLuong:     ChatLuong;
  namSanXuat:    number;
  namSuDung:     number;
  nienHan:       number; // năm
  soLanSuaChua:  number;
  ghiChu:        string;
}

// ── Interface Sửa chữa ───────────────────────────────────────
export interface ISuaChua {
  id:           string;
  maTrangBi:    string;
  tenTrangBi:   string;
  loai:         string;
  donVi:        string;
  loaiSuaChua:  string;   // Cấp 1, 2, 3
  ketQua:       string;   // Hoàn thành, Đang sửa, Không sửa được
  ngayBatDau:   string;
  ngayKetThuc:  string;
  chiPhi:       number;
  donViSuaChua: string;
  ghiChu:       string;
}

// ── Interface Bảo dưỡng ──────────────────────────────────────
export interface IBaoDuong {
  id:           string;
  maTrangBi:    string;
  tenTrangBi:   string;
  donVi:        string;
  loaiBaoDuong: string;   // Định kỳ, Đột xuất
  ngayBaoDuong: string;
  nguoiThucHien: string;
  ketQua:       string;
  ghiChu:       string;
}

// ── Interface Niêm cất ───────────────────────────────────────
export interface INiemCat {
  id:           string;
  maTrangBi:    string;
  tenTrangBi:   string;
  donVi:        string;
  khoNiemCat:   string;
  ngayNiemCat:  string;
  ngayXuat:     string | null;
  trangThai:    string;
  ghiChu:       string;
}

// ── Interface Điều động ──────────────────────────────────────
export interface IDieuDong {
  id:           string;
  maTrangBi:    string;
  tenTrangBi:   string;
  donViCu:      string;
  donViMoi:     string;
  ngayDieuDong: string;
  lyDo:         string;
  nguoiDuyet:   string;
  trangThai:    string;
}

// ── Interface Chuyển cấp chất lượng ─────────────────────────
export interface IChuyenCap {
  id:           string;
  maTrangBi:    string;
  tenTrangBi:   string;
  donVi:        string;
  capCu:        ChatLuong;
  capMoi:       ChatLuong;
  ngayCapNhat:  string;
  lyDo:         string;
  nguoiXacNhan: string;
}

// ── Helper: sinh random trong khoảng ────────────────────────
const rand = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// ── Danh sách đơn vị theo khối ───────────────────────────────
export const donViList: string[] = [
  'Quân khu 1', 'Quân khu 2', 'Quân khu 3', 'Quân khu 4',
  'Quân khu 5', 'Quân khu 7', 'Quân khu 9',
  'Quân đoàn 1', 'Quân đoàn 2', 'Quân đoàn 3', 'Quân đoàn 4',
  'Quân chủng PK-KQ', 'Quân chủng Hải quân',
  'Bộ tư lệnh Thông tin liên lạc', 'Bộ tư lệnh Tăng thiết giáp',
  'Tổng cục Hậu cần', 'Tổng cục Kỹ thuật', 'Tổng cục Công nghiệp QP',
  'Cơ quan BQP', 'Học viện Hậu cần', 'Học viện Kỹ thuật Quân sự',
  'Bệnh viện TW Quân đội 108', 'Bệnh viện Quân y 103',
  'Binh đoàn 11', 'Binh đoàn 12',
  'Viettel', 'Tổng Công ty Đông Bắc',
];

// ── Danh sách loại trang bị nhóm 1 (phương tiện thông tin) ───
const loaiNhom1: string[] = [
  'Máy thông tin vô tuyến', 'Máy thông tin hữu tuyến',
  'Đài phát sóng ngắn', 'Máy thu tín hiệu', 'Hệ thống mã hóa',
  'Bộ chuyển tiếp tín hiệu', 'Thiết bị vi ba', 'Anten định hướng',
  'Trạm thông tin vệ tinh', 'Thiết bị mạng quân sự',
];

// ── Danh sách loại trang bị nhóm 2 (phụ trợ) ────────────────
const loaiNhom2: string[] = [
  'Máy phát điện', 'Bộ lưu điện UPS', 'Xe thông tin dã chiến',
  'Cabin thông tin', 'Cột anten di động', 'Thiết bị đo kiểm',
  'Bộ công cụ sửa chữa', 'Phụ tùng thay thế', 'Thiết bị mật mã',
  'Hệ thống camera quan sát',
];

const tenNhom1Prefix: string[] = [
  'Máy PRC-', 'Đài HF-', 'Thiết bị TH-', 'Trạm VHF-', 'Hệ thống SH-',
  'Bộ mã hóa MH-', 'Vi ba VB-', 'Anten AT-', 'Vệ tinh VS-', 'Mạng MG-',
];

const tenNhom2Prefix: string[] = [
  'Máy phát MP-', 'UPS UP-', 'Xe thông tin XTT-', 'Cabin CB-',
  'Cột anten CA-', 'Thiết bị đo TBĐ-', 'Công cụ CC-', 'Phụ tùng PT-',
  'Thiết bị mật TBM-', 'Camera CM-',
];

const trangThaiList = Object.values(TrangThaiTrangBi);
const chatLuongList = Object.values(ChatLuong);

// Phân bổ trạng thái có trọng số (thực tế: ~60% hoạt động)
const weightedTrangThai = (): TrangThaiTrangBi => {
  const r = rand(0, 99);
  if (r < 60) return TrangThaiTrangBi.HoatDong;   // 60%
  if (r < 75) return TrangThaiTrangBi.NiemCat;    // 15%
  if (r < 87) return TrangThaiTrangBi.SuaChua;    // 12%
  if (r < 94) return TrangThaiTrangBi.ChoThanhLy; //  7%
  return TrangThaiTrangBi.DaThanhLy;              //  6%
};

// Chất lượng có trọng số (phần lớn Tốt/Khá)
const weightedChatLuong = (): ChatLuong => {
  const r = rand(0, 99);
  if (r < 30) return ChatLuong.Tot;
  if (r < 60) return ChatLuong.Kha;
  if (r < 80) return ChatLuong.TrungBinh;
  if (r < 93) return ChatLuong.Xau;
  return ChatLuong.HỏngHoc;
};

// ── Sinh MAC address ngẫu nhiên ─────────────────────────────
const genMAC = (): string =>
  Array.from({ length: 6 }, () =>
    rand(0, 255).toString(16).padStart(2, '0').toUpperCase()
  ).join(':');

// ── Sinh serial ngẫu nhiên ──────────────────────────────────
const genSerial = (prefix: string): string =>
  `${prefix}${rand(1000, 9999)}-${rand(10, 99)}`;

// ── Sinh trang bị nhóm 1 ────────────────────────────────────
export const mockTrangBiNhom1: ITrangBi[] = Array.from({ length: 80 }, (_, i) => {
  const idx = i % 10;
  const namSX = rand(2010, 2022);
  return {
    id:           `TB1-${String(i + 1).padStart(4, '0')}`,
    maTrangBi:    `TBTT-${String(i + 1).padStart(5, '0')}`,
    ten:          `${tenNhom1Prefix[idx]}${rand(100, 999)}`,
    loai:         loaiNhom1[idx],
    serial:       genSerial('SN'),
    mac:          genMAC(),
    donVi:        donViList[rand(0, donViList.length - 1)],
    trangThai:    weightedTrangThai(),
    chatLuong:    weightedChatLuong(),
    namSanXuat:   namSX,
    namSuDung:    namSX + rand(0, 2),
    nienHan:      rand(5, 15),
    soLanSuaChua: rand(0, 5),
    ghiChu:       rand(0, 1) === 0 ? 'Cần kiểm tra định kỳ' : '',
  };
});

// ── Sinh trang bị nhóm 2 ────────────────────────────────────
export const mockTrangBiNhom2: ITrangBi[] = Array.from({ length: 60 }, (_, i) => {
  const idx = i % 10;
  const namSX = rand(2008, 2021);
  return {
    id:           `TB2-${String(i + 1).padStart(4, '0')}`,
    maTrangBi:    `TBPH-${String(i + 1).padStart(5, '0')}`,
    ten:          `${tenNhom2Prefix[idx]}${rand(100, 999)}`,
    loai:         loaiNhom2[idx],
    serial:       genSerial('PN'),
    mac:          genMAC(),
    donVi:        donViList[rand(0, donViList.length - 1)],
    trangThai:    weightedTrangThai(),
    chatLuong:    weightedChatLuong(),
    namSanXuat:   namSX,
    namSuDung:    namSX + rand(0, 2),
    nienHan:      rand(3, 12),
    soLanSuaChua: rand(0, 8),
    ghiChu:       rand(0, 1) === 0 ? '' : 'Đang chờ phụ tùng',
  };
});

// ── Tổng hợp mock: thống kê dashboard ───────────────────────
const allTB = [...mockTrangBiNhom1, ...mockTrangBiNhom2];

export const dashboardStats = {
  tongSoLuong:      allTB.length,
  suaChua:          allTB.filter(t => t.trangThai === TrangThaiTrangBi.SuaChua).length,
  niemCat:          allTB.filter(t => t.trangThai === TrangThaiTrangBi.NiemCat).length,
  dangHoatDong:     allTB.filter(t => t.trangThai === TrangThaiTrangBi.HoatDong).length,
  choThanhLy:       allTB.filter(t => t.trangThai === TrangThaiTrangBi.ChoThanhLy).length,
  daThanhLy:        allTB.filter(t => t.trangThai === TrangThaiTrangBi.DaThanhLy).length,
  heSoKyThuat: parseFloat(
    (allTB.filter(t => t.trangThai === TrangThaiTrangBi.HoatDong).length / allTB.length).toFixed(2)
  ),
};

// ── Dữ liệu biểu đồ phân vùng theo đơn vị ───────────────────
export const phanVungDonViData = [
  { id: 'Khối Quân khu',          label: 'Khối Quân khu',              value: 142 },
  { id: 'Khối Quân đoàn',         label: 'Khối Quân đoàn',             value: 98  },
  { id: 'Khối Quân chủng',        label: 'Khối Quân chủng',            value: 64  },
  { id: 'Khối Bộ tư lệnh',        label: 'Khối Bộ tư lệnh',            value: 47  },
  { id: 'Khối Tổng cục & CQ BQP', label: 'Khối Tổng cục & CQ BQP',    value: 38  },
  { id: 'Khối Học viện',          label: 'Khối Học viện-Nhà trường',   value: 31  },
  { id: 'Khối Binh đoàn',         label: 'Khối Binh đoàn',             value: 28  },
  { id: 'Khối Doanh nghiệp',      label: 'Khối Doanh nghiệp',          value: 14  },
  { id: 'Khối Bệnh viện',         label: 'Khối Bệnh viện',             value: 9   },
  { id: 'Khối Khác',              label: 'Khối Khác',                  value: 7   },
];

// ── Dữ liệu biểu đồ niên hạn theo năm ───────────────────────
export const nienHanNamData: { nam: string; soLuong: number; hetNienHan: number }[] = [
  { nam: '2024', soLuong: 31, hetNienHan: 9  },
  { nam: '2025', soLuong: 44, hetNienHan: 12 },
  { nam: '2026', soLuong: 28, hetNienHan: 7  },
  { nam: '2027', soLuong: 11, hetNienHan: 3  },  // chênh lệch lớn với 2025
  { nam: '2028', soLuong: 38, hetNienHan: 10 },
  { nam: '2029', soLuong:  6, hetNienHan: 2  },  // nhỏ nhất
  { nam: '2030', soLuong: 19, hetNienHan: 4  },
];

// ── Mock dữ liệu sửa chữa ────────────────────────────────────
const loaiSCList  = ['Cấp 1 (tại đơn vị)', 'Cấp 2 (xưởng)', 'Cấp 3 (nhà máy)'];
const ketQuaSCList = ['Hoàn thành', 'Đang sửa', 'Không sửa được'];
const donViSCList  = ['Xưởng 11', 'Xưởng 12', 'Xưởng 15', 'Nhà máy Z119', 'Nhà máy Z157', 'Tại đơn vị'];

export const mockSuaChua: ISuaChua[] = Array.from({ length: 40 }, (_, i) => {
  const tb = allTB[rand(0, allTB.length - 1)];
  const ngayBD = `${rand(2022, 2025)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`;
  return {
    id:           `SC-${String(i + 1).padStart(4, '0')}`,
    maTrangBi:    tb.maTrangBi,
    tenTrangBi:   tb.ten,
    loai:         tb.loai,
    donVi:        tb.donVi,
    loaiSuaChua:  loaiSCList[rand(0, 2)],
    ketQua:       ketQuaSCList[rand(0, 2)],
    ngayBatDau:   ngayBD,
    ngayKetThuc:  `${rand(2023, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
    chiPhi:       rand(5, 200) * 1000000,
    donViSuaChua: donViSCList[rand(0, donViSCList.length - 1)],
    ghiChu:       rand(0, 1) === 0 ? '' : 'Cần thêm phụ tùng nhập khẩu',
  };
});

// ── Mock dữ liệu bảo dưỡng ───────────────────────────────────
const loaiBDList = ['Định kỳ 3 tháng', 'Định kỳ 6 tháng', 'Định kỳ 1 năm', 'Đột xuất'];
const ketQuaBDList = ['Đạt tiêu chuẩn', 'Cần theo dõi', 'Phát hiện lỗi'];

export const mockBaoDuong: IBaoDuong[] = Array.from({ length: 50 }, (_, i) => {
  const tb = allTB[rand(0, allTB.length - 1)];
  return {
    id:           `BD-${String(i + 1).padStart(4, '0')}`,
    maTrangBi:    tb.maTrangBi,
    tenTrangBi:   tb.ten,
    donVi:        tb.donVi,
    loaiBaoDuong: loaiBDList[rand(0, loaiBDList.length - 1)],
    ngayBaoDuong: `${rand(2023, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
    nguoiThucHien:`Kỹ thuật viên ${rand(1, 20)}`,
    ketQua:       ketQuaBDList[rand(0, 2)],
    ghiChu:       rand(0, 1) === 0 ? '' : 'Đã thay dầu mỡ và vệ sinh',
  };
});

// ── Mock dữ liệu niêm cất ────────────────────────────────────
const khoNCList = ['Kho K1', 'Kho K2', 'Kho K3', 'Kho tiểu đoàn', 'Kho lữ đoàn'];
const trangThaiNCList = ['Đang niêm cất', 'Đã xuất kho', 'Kiểm tra định kỳ'];

export const mockNiemCat: INiemCat[] = Array.from({ length: 35 }, (_, i) => {
  const tb = allTB.filter(t => t.trangThai === TrangThaiTrangBi.NiemCat)[i] ??
             allTB[rand(0, allTB.length - 1)];
  const ngayNC = `${rand(2020, 2024)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`;
  const daXuat = rand(0, 3) === 0;
  return {
    id:          `NC-${String(i + 1).padStart(4, '0')}`,
    maTrangBi:   tb.maTrangBi,
    tenTrangBi:  tb.ten,
    donVi:       tb.donVi,
    khoNiemCat:  khoNCList[rand(0, khoNCList.length - 1)],
    ngayNiemCat: ngayNC,
    ngayXuat:    daXuat
      ? `${rand(2024, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`
      : null,
    trangThai:   daXuat ? 'Đã xuất kho' : trangThaiNCList[rand(0, 1)],
    ghiChu:      rand(0, 1) === 0 ? '' : 'Bao gói đầy đủ',
  };
});

// ── Mock dữ liệu điều động ───────────────────────────────────
const lyDoDDList = [
  'Tăng cường lực lượng', 'Điều chỉnh biên chế', 'Nhiệm vụ đặc biệt',
  'Hỗ trợ huấn luyện', 'Điều chuyển theo kế hoạch',
];
const trangThaiDDList = ['Đã duyệt', 'Chờ duyệt', 'Đã thực hiện', 'Hủy'];

export const mockDieuDong: IDieuDong[] = Array.from({ length: 30 }, (_, i) => {
  const tb = allTB[rand(0, allTB.length - 1)];
  const donViCu = donViList[rand(0, donViList.length - 1)];
  let donViMoi  = donViList[rand(0, donViList.length - 1)];
  while (donViMoi === donViCu) donViMoi = donViList[rand(0, donViList.length - 1)];
  return {
    id:           `DD-${String(i + 1).padStart(4, '0')}`,
    maTrangBi:    tb.maTrangBi,
    tenTrangBi:   tb.ten,
    donViCu,
    donViMoi,
    ngayDieuDong: `${rand(2022, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
    lyDo:         lyDoDDList[rand(0, lyDoDDList.length - 1)],
    nguoiDuyet:   `Đại tá ${rand(1, 20)} - Phó Tổng cục trưởng`,
    trangThai:    trangThaiDDList[rand(0, 3)],
  };
});

// ── Mock dữ liệu chuyển cấp chất lượng ──────────────────────
const lyDoCapList = [
  'Bị hao mòn sau sử dụng', 'Sau sửa chữa lớn', 'Kiểm định định kỳ',
  'Nâng cấp sau bảo dưỡng', 'Đánh giá lại sau tai nạn',
];

export const mockChuyenCap: IChuyenCap[] = Array.from({ length: 45 }, (_, i) => {
  const tb   = allTB[rand(0, allTB.length - 1)];
  const caps = chatLuongList as ChatLuong[];
  const capCu  = caps[rand(0, caps.length - 1)];
  let   capMoi = caps[rand(0, caps.length - 1)];
  while (capMoi === capCu) capMoi = caps[rand(0, caps.length - 1)];
  return {
    id:           `CC-${String(i + 1).padStart(4, '0')}`,
    maTrangBi:    tb.maTrangBi,
    tenTrangBi:   tb.ten,
    donVi:        tb.donVi,
    capCu,
    capMoi,
    ngayCapNhat:  `${rand(2022, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
    lyDo:         lyDoCapList[rand(0, lyDoCapList.length - 1)],
    nguoiXacNhan: `Thượng tá Nguyễn Văn ${String.fromCharCode(65 + rand(0, 25))}`,
  };
});

// ── Mock thống kê báo cáo ────────────────────────────────────
// Tạo segment nhất quán: sum(hoatDong+suaChua+niemCat+thanhLy) = soLuong
const makeThongKe = (loai: string, base: number) => {
  const thanhLy  = Math.round(base * 0.06);
  const niemCat  = Math.round(base * 0.14);
  const suaChua  = Math.round(base * 0.11);
  const hoatDong = base - thanhLy - niemCat - suaChua;
  return { loai, soLuong: base, hoatDong, suaChua, niemCat, thanhLy };
};

export const thongKeTheoLoai = [
  makeThongKe(loaiNhom1[0], 45),  // Máy thông tin vô tuyến – phổ biến nhất
  makeThongKe(loaiNhom1[1], 12),
  makeThongKe(loaiNhom1[2], 38),
  makeThongKe(loaiNhom1[3],  8),  // nhỏ nhất – test chênh lệch
  makeThongKe(loaiNhom1[4], 22),
  makeThongKe(loaiNhom1[5], 41),
  makeThongKe(loaiNhom1[6], 28),
  makeThongKe(loaiNhom1[7],  9),
  makeThongKe(loaiNhom1[8], 35),
  makeThongKe(loaiNhom1[9], 16),
];

const donViSoLuong = [32, 27, 24, 22, 20, 19, 17, 15, 14, 13, 11, 10];
export const thongKeTheoDonVi = donViList.slice(0, 12).map((d, i) => ({
  donVi:    d,
  soLuong:  donViSoLuong[i],
  tyLeHD:   Math.round((0.55 + i * 0.02) * 100) / 100,
}));
