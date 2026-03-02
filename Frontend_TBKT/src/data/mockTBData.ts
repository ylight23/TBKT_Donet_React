// ============================================================
// Dữ liệu mẫu Trang bị Kỹ thuật (Mock Technical Equipment Data)
// ============================================================

// ── Enums & Types ───────────────────────────────────────────

export enum ChatLuong {
    Tot = 'Tốt',
    Kha = 'Khá',
    TrungBinh = 'Trung bình',
    Xau = 'Xấu',
    HỏngHoc = 'Hỏng hóc',
}

export enum TrangThaiTrangBi {
    HoatDong = 'Hoạt động',
    SuaChua = 'Sửa chữa',
    NiemCat = 'Niêm cất',
    ChoThanhLy = 'Chờ thanh lý',
    DaThanhLy = 'Đã thanh lý',
}

// ── Interfaces ───────────────────────────────────────────────

export interface ITrangBi {
    id: string;
    maTrangBi: string;
    ten: string;
    loai: string;
    donVi: string;
    chatLuong: ChatLuong;
    trangThai: TrangThaiTrangBi;
    soLanSuaChua: number;
    nienHan: number;
    namSuDung: number;
    serial?: string;
    mac?: string;
}

export interface IBaoDuong {
    id: string;
    maTrangBi: string;
    tenTrangBi: string;
    donVi: string;
    loaiBaoDuong: string;
    ngayBaoDuong: string;
    nguoiThucHien: string;
    ketQua: 'Đạt tiêu chuẩn' | 'Cần theo dõi' | 'Phát hiện lỗi';
    ghiChu: string;
}

export interface ISuaChua {
    id: string;
    maTrangBi: string;
    tenTrangBi: string;
    loai: string;
    donVi: string;
    loaiSuaChua: string;
    donViSuaChua: string;
    ketQua: 'Hoàn thành' | 'Đang sửa' | 'Không sửa được';
    ngayBatDau: string;
    ngayKetThuc: string;
    chiPhi: number;
    ghiChu: string;
}

export interface IChuyenCap {
    id: string;
    maTrangBi: string;
    tenTrangBi: string;
    donVi: string;
    capCu: ChatLuong;
    capMoi: ChatLuong;
    ngayCapNhat: string;
    lyDo: string;
    nguoiXacNhan: string;
}

export interface IDieuDong {
    id: string;
    maTrangBi: string;
    tenTrangBi: string;
    donViCu: string;
    donViMoi: string;
    ngayDieuDong: string;
    lyDo: string;
    nguoiDuyet: string;
    trangThai: 'Đã duyệt' | 'Chờ duyệt' | 'Đã thực hiện' | 'Hủy';
}

export interface INiemCat {
    id: string;
    maTrangBi: string;
    tenTrangBi: string;
    donVi: string;
    khoNiemCat: string;
    ngayNiemCat: string;
    ngayXuat?: string;
    trangThai: 'Đang niêm cất' | 'Đã xuất kho' | 'Kiểm tra định kỳ';
    ghiChu: string;
}

// ── Lists ────────────────────────────────────────────────────

export const donViList = [
    'Lữ đoàn 1', 'Lữ đoàn 2', 'Trung đoàn 291', 'Kho 864', 'Xưởng X201',
    'Quân đoàn 1', 'Quân đoàn 2', 'Quân khu 1', 'Quân khu 3', 'Phòng Kỹ thuật',
];

// ── Mock Data Arrays ────────────────────────────────────────

export const mockTrangBiNhom1: ITrangBi[] = [
    { id: '1', maTrangBi: 'TB-001', ten: 'Máy vô tuyến điện VRU-611', loai: 'Thông tin', donVi: 'Lữ đoàn 1', chatLuong: ChatLuong.Tot, trangThai: TrangThaiTrangBi.HoatDong, soLanSuaChua: 1, nienHan: 15, namSuDung: 2018, serial: 'SN-V611-001', mac: '00:1A:2B:3C:4D:5E' },
    { id: '2', maTrangBi: 'TB-002', ten: 'Máy vô tuyến điện VRU-612', loai: 'Thông tin', donVi: 'Lữ đoàn 2', chatLuong: ChatLuong.Kha, trangThai: TrangThaiTrangBi.HoatDong, soLanSuaChua: 2, nienHan: 15, namSuDung: 2019, serial: 'SN-V612-002', mac: '00:1A:2B:3C:4D:5F' },
    { id: '3', maTrangBi: 'TB-003', ten: 'Xe thông tin cơ động M33', loai: 'Xe thông tin', donVi: 'Lữ đoàn 1', chatLuong: ChatLuong.TrungBinh, trangThai: TrangThaiTrangBi.SuaChua, soLanSuaChua: 5, nienHan: 20, namSuDung: 2010, serial: 'SN-M33-003', mac: '00:1A:2B:3C:4D:60' },
];

export const mockTrangBiNhom2: ITrangBi[] = [
    { id: '101', maTrangBi: 'TB-101', ten: 'Đài Radar 36D6', loai: 'Radar', donVi: 'Trung đoàn 291', chatLuong: ChatLuong.Tot, trangThai: TrangThaiTrangBi.HoatDong, soLanSuaChua: 0, nienHan: 25, namSuDung: 2020, serial: 'SN-R36-101', mac: '00:1A:2B:3C:4D:A1' },
    { id: '102', maTrangBi: 'TB-102', ten: 'Máy đo tham số kỹ thuật P-18', loai: 'Thiết bị đo', donVi: 'Kho 864', chatLuong: ChatLuong.Xau, trangThai: TrangThaiTrangBi.NiemCat, soLanSuaChua: 3, nienHan: 10, namSuDung: 2015, serial: 'SN-P18-102', mac: '00:1A:2B:3C:4D:A2' },
];

export const mockBaoDuong: IBaoDuong[] = [
    { id: 'BD-001', maTrangBi: 'TB-001', tenTrangBi: 'Máy vô tuyến điện VRU-611', donVi: 'Lữ đoàn 1', loaiBaoDuong: 'Bảo dưỡng định kỳ', ngayBaoDuong: '2024-02-15', nguoiThucHien: 'Nguyễn Văn An', ketQua: 'Đạt tiêu chuẩn', ghiChu: 'Thay dầu động cơ, kiểm tra hệ thống phanh' },
    { id: 'BD-002', maTrangBi: 'TB-101', tenTrangBi: 'Đài Radar 36D6', donVi: 'Trung đoàn 291', loaiBaoDuong: 'Bảo dưỡng kỹ thuật', ngayBaoDuong: '2024-02-18', nguoiThucHien: 'Trần Minh Hải', ketQua: 'Cần theo dõi', ghiChu: 'Hệ thống thủy lực có dấu hiệu rò rỉ nhẹ' },
];

export const mockSuaChua: ISuaChua[] = [
    { id: 'SC-001', maTrangBi: 'TB-003', tenTrangBi: 'Xe thông tin cơ động M33', loai: 'Xe thông tin', donVi: 'Lữ đoàn 1', loaiSuaChua: 'Sửa chữa trung hạn', donViSuaChua: 'Xưởng X201', ketQua: 'Hoàn thành', ngayBatDau: '2024-01-10', ngayKetThuc: '2024-02-10', chiPhi: 450000000, ghiChu: 'Đã xử lý hệ thống hỏa lực' },
    { id: 'SC-002', maTrangBi: 'TB-102', tenTrangBi: 'Máy đo tham số kỹ thuật P-18', loai: 'Thiết bị đo', donVi: 'Kho 864', loaiSuaChua: 'Sửa chữa nhỏ', donViSuaChua: 'Trạm kỹ thuật', ketQua: 'Đang sửa', ngayBatDau: '2024-02-20', ngayKetThuc: '2024-03-05', chiPhi: 25000000, ghiChu: 'Đợi linh kiện' },
];

export const mockChuyenCap: IChuyenCap[] = [
    { id: 'CC-001', maTrangBi: 'TB-002', tenTrangBi: 'Máy vô tuyến điện VRU-612', donVi: 'Lữ đoàn 2', capCu: ChatLuong.Tot, capMoi: ChatLuong.Kha, ngayCapNhat: '2024-01-05', lyDo: 'Sử dụng cường độ cao', nguoiXacNhan: 'Lê Văn B' },
];

export const mockDieuDong: IDieuDong[] = [
    { id: 'DD-001', maTrangBi: 'TB-001', tenTrangBi: 'Máy vô tuyến điện VRU-611', donViCu: 'Lữ đoàn 1', donViMoi: 'Lữ đoàn 2', ngayDieuDong: '2024-03-01', lyDo: 'Tăng cường lực lượng', nguoiDuyet: 'Đại tá Nguyễn Văn Hùng', trangThai: 'Đã duyệt' },
    { id: 'DD-002', maTrangBi: 'TB-101', tenTrangBi: 'Đài Radar 36D6', donViCu: 'Trung đoàn 291', donViMoi: 'Kho 864', ngayDieuDong: '2024-03-05', lyDo: 'Sửa chữa lớn', nguoiDuyet: 'Thiếu tướng Trần Văn Minh', trangThai: 'Chờ duyệt' },
];

export const mockNiemCat: INiemCat[] = [
    { id: 'NC-001', maTrangBi: 'TB-102', tenTrangBi: 'Máy đo tham số kỹ thuật P-18', donVi: 'Kho 864', khoNiemCat: 'Kho A1', ngayNiemCat: '2023-12-01', trangThai: 'Đang niêm cất', ghiChu: 'Niêm cất dài hạn' },
    { id: 'NC-002', maTrangBi: 'TB-002', tenTrangBi: 'Máy vô tuyến điện VRU-612', donVi: 'Lữ đoàn 2', khoNiemCat: 'Kho B2', ngayNiemCat: '2023-10-15', ngayXuat: '2024-02-01', trangThai: 'Đã xuất kho', ghiChu: 'Xuất kho sử dụng diễn tập' },
];

export const mockBaoQuan = [];

// ── Chart & Statistics Data ─────────────────────────────────

export const thongKeTheoLoai = [
    { loai: 'Thông tin', soLuong: 120, hoatDong: 95, suaChua: 15, niemCat: 7, thanhLy: 3 },
    { loai: 'Xe thông tin', soLuong: 85, hoatDong: 72, suaChua: 8, niemCat: 4, thanhLy: 1 },
    { loai: 'Radar', soLuong: 60, hoatDong: 54, suaChua: 4, niemCat: 2, thanhLy: 0 },
    { loai: 'Vật tư kỹ thuật', soLuong: 200, hoatDong: 180, suaChua: 12, niemCat: 5, thanhLy: 3 },
];

export const thongKeTheoDonVi = [
    { donVi: 'Lữ đoàn 1', soLuong: 45, tyLeHD: 0.88 },
    { donVi: 'Lữ đoàn 2', soLuong: 38, tyLeHD: 0.95 },
    { donVi: 'Trung đoàn 291', soLuong: 42, tyLeHD: 0.82 },
];

export const dashboardStats = {
    tongSoLuong: 510,
    dangHoatDong: 441,
    suaChua: 42,
    niemCat: 20,
    choThanhLy: 7,
    daThanhLy: 5,
    heSoKyThuat: 0.865
};

export const phanVungDonViData = [
    { id: 'QĐ1', label: 'Quân đoàn 1', value: 145 },
    { id: 'QĐ2', label: 'Quân đoàn 2', value: 128 },
    { id: 'QK1', label: 'Quân khu 1', value: 96 },
    { id: 'QK3', label: 'Quân khu 3', value: 141 }
];

export const nienHanNamData = [
    { nam: '2015', soLuong: 45, hetNienHan: 12 },
    { nam: '2016', soLuong: 58, hetNienHan: 8 },
    { nam: '2017', soLuong: 72, hetNienHan: 5 },
    { nam: '2018', soLuong: 90, hetNienHan: 2 },
    { nam: '2019', soLuong: 110, hetNienHan: 0 },
    { nam: '2020', soLuong: 135, hetNienHan: 0 },
];
