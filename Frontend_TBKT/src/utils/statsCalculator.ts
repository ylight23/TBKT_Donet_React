import { ChatLuong, TrangThaiTrangBi, mockSuaChua } from '../data/mockTBData';

export interface StatItem {
    label: string;
    count: number;
    color: string;
}

export interface CategoryStats {
    title: string;
    stats: StatItem[];
}

export interface TrangBiStatRow {
    chatLuong?: string;
    trangThai?: string;
}

export const isTrangBiStatsMenu = (activeMenu: string): boolean => (
    activeMenu === 'tinhTrangKT' ||
    activeMenu === 'baoQuan' ||
    activeMenu === 'niemCat' ||
    activeMenu === 'niemCatTB' ||
    activeMenu === 'niemCatKQ' ||
    activeMenu === 'dieuDong' ||
    activeMenu === 'chuyenCap' ||
    activeMenu === 'tbNhom1' ||
    activeMenu === 'tbNhom2'
);

export const getStatsByActiveMenu = (
    activeMenu: string,
    trangBiRows: TrangBiStatRow[] = [],
): CategoryStats | null => {
    const applicableBaoQuanRows = trangBiRows.filter((t) =>
        t.trangThai === TrangThaiTrangBi.HoatDong ||
        t.trangThai === TrangThaiTrangBi.NiemCat,
    );

    switch (activeMenu) {
        case 'tinhTrangKT':
            return {
                title: 'Tinh trang ky thuat',
                stats: [
                    { label: 'Tot', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.Tot).length, color: '#2e7d32' },
                    { label: 'Kha', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.Kha).length, color: '#1565c0' },
                    { label: 'Trung binh', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.TrungBinh).length, color: '#ef6c00' },
                    { label: 'Xau', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.Xau).length, color: '#c62828' },
                    { label: 'Hong hoc', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.HỏngHoc).length, color: '#6a1b9a' },
                ],
            };
        case 'baoQuan':
            return {
                title: 'Bao quan',
                stats: [
                    {
                        label: 'Dat yeu cau',
                        count: applicableBaoQuanRows.filter((t) =>
                            t.chatLuong === ChatLuong.Tot || t.chatLuong === ChatLuong.Kha,
                        ).length,
                        color: '#2e7d32',
                    },
                    {
                        label: 'Can kiem tra',
                        count: applicableBaoQuanRows.filter((t) =>
                            t.chatLuong === ChatLuong.TrungBinh ||
                            t.chatLuong === ChatLuong.Xau ||
                            t.chatLuong === ChatLuong.HỏngHoc,
                        ).length,
                        color: '#ef6c00',
                    },
                    {
                        label: 'Trong niem cat',
                        count: applicableBaoQuanRows.filter((t) => t.trangThai === TrangThaiTrangBi.NiemCat).length,
                        color: '#1565c0',
                    },
                ],
            };
        case 'baoDuong':
            return {
                title: 'Bao duong',
                stats: [
                    { label: 'Da bao duong', count: 0, color: '#2e7d32' },
                    { label: 'Den han', count: 0, color: '#ef6c00' },
                    { label: 'Qua han', count: 0, color: '#c62828' },
                ],
            };
        case 'suaChua':
        case 'suaChuaTB':
        case 'suaChuaKQ':
            return {
                title: 'Sua chua',
                stats: [
                    { label: 'Hoan thanh', count: mockSuaChua.filter((s) => s.ketQua === 'Hoàn thành').length, color: '#2e7d32' },
                    { label: 'Dang sua', count: mockSuaChua.filter((s) => s.ketQua === 'Đang sửa').length, color: '#ef6c00' },
                    { label: 'Khong sua duoc', count: mockSuaChua.filter((s) => s.ketQua === 'Không sửa được').length, color: '#c62828' },
                ],
            };
        case 'niemCat':
        case 'niemCatTB':
        case 'niemCatKQ':
            return {
                title: 'Niem cat',
                stats: [
                    { label: 'Trong niem cat', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.NiemCat).length, color: '#2e7d32' },
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.HoatDong).length, color: '#ef6c00' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.SuaChua).length, color: '#1565c0' },
                ],
            };
        case 'dieuDong':
            return {
                title: 'Dieu dong',
                stats: [
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.HoatDong).length, color: '#1565c0' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.SuaChua).length, color: '#2e7d32' },
                    { label: 'Niem cat', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.NiemCat).length, color: '#c62828' },
                ],
            };
        case 'chuyenCap':
            return {
                title: 'Chuyen cap chat luong',
                stats: [
                    { label: 'Tot/Kha', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.Tot || t.chatLuong === ChatLuong.Kha).length, color: '#2e7d32' },
                    { label: 'Trung binh/Xau', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.TrungBinh || t.chatLuong === ChatLuong.Xau).length, color: '#ef6c00' },
                    { label: 'Hong hoc', count: trangBiRows.filter((t) => t.chatLuong === ChatLuong.HỏngHoc).length, color: '#c62828' },
                ],
            };
        case 'tbNhom1':
            return {
                title: 'Trang bi Nhom 1',
                stats: [
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.HoatDong).length, color: '#2e7d32' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.SuaChua).length, color: '#ef6c00' },
                    { label: 'Niem cat', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.NiemCat).length, color: '#1565c0' },
                ],
            };
        case 'tbNhom2':
            return {
                title: 'Trang bi Nhom 2',
                stats: [
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.HoatDong).length, color: '#2e7d32' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.SuaChua).length, color: '#ef6c00' },
                    { label: 'Niem cat', count: trangBiRows.filter((t) => t.trangThai === TrangThaiTrangBi.NiemCat).length, color: '#1565c0' },
                ],
            };
        case 'employee':
            return {
                title: 'Quan ly Nhan su',
                stats: [
                    { label: 'Si quan', count: 0, color: '#1b5e20' },
                    { label: 'QNCN', count: 0, color: '#2e7d32' },
                    { label: 'Cong nhan vien', count: 0, color: '#4caf50' },
                    { label: 'Ha si quan - Binh si', count: 0, color: '#81c784' },
                ],
            };
        default:
            return null;
    }
};
