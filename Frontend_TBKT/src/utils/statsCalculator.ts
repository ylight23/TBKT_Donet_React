import {
    mockTrangBiNhom1,
    mockTrangBiNhom2,
    mockSuaChua,
    ChatLuong,
    TrangThaiTrangBi,
    ITrangBi
} from '../data/mockTBData';

export interface StatItem {
    label: string;
    count: number;
    color: string;
}

export interface CategoryStats {
    title: string;
    stats: StatItem[];
}

const allTrangBi: ITrangBi[] = [...mockTrangBiNhom1, ...mockTrangBiNhom2];

export const getStatsByActiveMenu = (activeMenu: string): CategoryStats | null => {
    switch (activeMenu) {
        case 'tinhTrangKT':
            return {
                title: 'Tình trạng kỹ thuật',
                stats: [
                    { label: 'Tốt', count: allTrangBi.filter(t => t.chatLuong === ChatLuong.Tot).length, color: '#2e7d32' },
                    { label: 'Khá', count: allTrangBi.filter(t => t.chatLuong === ChatLuong.Kha).length, color: '#1565c0' },
                    { label: 'Trung bình', count: allTrangBi.filter(t => t.chatLuong === ChatLuong.TrungBinh).length, color: '#ef6c00' },
                    { label: 'Xấu', count: allTrangBi.filter(t => t.chatLuong === ChatLuong.Xau).length, color: '#c62828' },
                    { label: 'Hỏng hóc', count: allTrangBi.filter(t => t.chatLuong === ChatLuong.HỏngHoc).length, color: '#6a1b9a' },
                ]
            };
        case 'baoQuan':
            return {
                title: 'Bảo quản',
                stats: [
                    { label: 'Đạt yêu cầu', count: Math.floor(allTrangBi.length * 0.65), color: '#2e7d32' },
                    { label: 'Cần kiểm tra', count: Math.floor(allTrangBi.length * 0.15), color: '#ef6c00' },
                    { label: 'Chưa kiểm tra', count: Math.floor(allTrangBi.length * 0.20), color: '#c62828' },
                ]
            };
        case 'baoDuong':
            return {
                title: 'Bảo dưỡng',
                stats: [
                    { label: 'Đã bảo dưỡng', count: Math.floor(allTrangBi.length * 0.8), color: '#2e7d32' },
                    { label: 'Đến hạn', count: Math.floor(allTrangBi.length * 0.1), color: '#ef6c00' },
                    { label: 'Quá hạn', count: Math.floor(allTrangBi.length * 0.1), color: '#c62828' },
                ]
            };
        case 'suaChua':
        case 'suaChuaTB':
        case 'suaChuaKQ':
            return {
                title: 'Sửa chữa',
                stats: [
                    { label: 'Hoàn thành', count: mockSuaChua.filter(s => s.ketQua === 'Hoàn thành').length, color: '#2e7d32' },
                    { label: 'Đang sửa', count: mockSuaChua.filter(s => s.ketQua === 'Đang sửa').length, color: '#ef6c00' },
                    { label: 'Không sửa được', count: mockSuaChua.filter(s => s.ketQua === 'Không sửa được').length, color: '#c62828' },
                ]
            };
        case 'niemCat':
        case 'niemCatTB':
        case 'niemCatKQ':
            return {
                title: 'Niêm cất',
                stats: [
                    { label: 'Trong niêm cất', count: allTrangBi.filter(t => t.trangThai === TrangThaiTrangBi.NiemCat).length, color: '#2e7d32' },
                    { label: 'Chờ niêm cất', count: Math.floor(allTrangBi.length * 0.05), color: '#ef6c00' },
                    { label: 'Mở niêm', count: Math.floor(allTrangBi.length * 0.02), color: '#1565c0' },
                ]
            };
        case 'dieuDong':
            return {
                title: 'Điều động',
                stats: [
                    { label: 'Đang điều động', count: Math.floor(allTrangBi.length * 0.08), color: '#1565c0' },
                    { label: 'Hoàn thành', count: Math.floor(allTrangBi.length * 0.12), color: '#2e7d32' },
                    { label: 'Hủy bỏ', count: Math.floor(allTrangBi.length * 0.01), color: '#c62828' },
                ]
            };
        case 'chuyenCap':
            return {
                title: 'Chuyển cấp chất lượng',
                stats: [
                    { label: 'Đã chuyển cấp', count: Math.floor(allTrangBi.length * 0.15), color: '#2e7d32' },
                    { label: 'Chờ phê duyệt', count: Math.floor(allTrangBi.length * 0.05), color: '#ef6c00' },
                ]
            };
        case 'tbNhom1':
            return {
                title: 'Trang bị Nhóm 1',
                stats: [
                    { label: 'Hoạt động', count: mockTrangBiNhom1.filter(t => t.trangThai === TrangThaiTrangBi.HoatDong).length, color: '#2e7d32' },
                    { label: 'Sửa chữa', count: mockTrangBiNhom1.filter(t => t.trangThai === TrangThaiTrangBi.SuaChua).length, color: '#ef6c00' },
                    { label: 'Niêm cất', count: mockTrangBiNhom1.filter(t => t.trangThai === TrangThaiTrangBi.NiemCat).length, color: '#1565c0' },
                ]
            };
        case 'tbNhom2':
            return {
                title: 'Trang bị Nhóm 2',
                stats: [
                    { label: 'Hoạt động', count: mockTrangBiNhom2.filter(t => t.trangThai === TrangThaiTrangBi.HoatDong).length, color: '#2e7d32' },
                    { label: 'Sửa chữa', count: mockTrangBiNhom2.filter(t => t.trangThai === TrangThaiTrangBi.SuaChua).length, color: '#ef6c00' },
                    { label: 'Niêm cất', count: mockTrangBiNhom2.filter(t => t.trangThai === TrangThaiTrangBi.NiemCat).length, color: '#1565c0' },
                ]
            };
        case 'employee':
            return {
                title: 'Quản lý Nhân sự',
                stats: [
                    { label: 'Sĩ quan', count: 0, color: '#1b5e20' },
                    { label: 'QNCN', count: 0, color: '#2e7d32' },
                    { label: 'Công nhân viên', count: 0, color: '#4caf50' },
                    { label: 'Hạ sĩ quan - Binh sĩ', count: 0, color: '#81c784' },
                ]
            };
        default:
            return null;
    }
};
