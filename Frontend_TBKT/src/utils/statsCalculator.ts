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
    tinhTrangKyThuat?: string;
    nhomTrangBi?: 1 | 2;
}

const normalizeText = (value?: string): string => (
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
);

const matchesAny = (value: string | undefined, terms: string[]): boolean => {
    const normalized = normalizeText(value);
    return terms.some((term) => normalized.includes(normalizeText(term)));
};

const isGoodQuality = (value?: string): boolean => matchesAny(value, ['tot', 'kha', 'hoat dong tot']);
const isMediumQuality = (value?: string): boolean => matchesAny(value, ['trung binh']);
const isBadQuality = (value?: string): boolean => matchesAny(value, ['xau', 'hong']);
const isOperating = (value?: string): boolean => matchesAny(value, ['hoat dong', 'dang su dung']);
const isRepairing = (value?: string): boolean => matchesAny(value, ['sua chua']);
const isPreserved = (value?: string): boolean => matchesAny(value, ['niem cat', 'bao quan']);

export const isTrangBiStatsMenu = (activeMenu: string): boolean => (
    activeMenu === 'tinhTrangKT' ||
    activeMenu === 'baoQuan' ||
    activeMenu === 'baoDuong' ||
    activeMenu === 'suaChua' ||
    activeMenu === 'suaChuaTB' ||
    activeMenu === 'suaChuaKQ' ||
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
    const applicableBaoQuanRows = trangBiRows.filter((t) => isOperating(t.trangThai) || isPreserved(t.trangThai));

    switch (activeMenu) {
        case 'tinhTrangKT':
            return {
                title: 'Tinh trang ky thuat',
                stats: [
                    { label: 'Tot/Kha', count: trangBiRows.filter((t) => isGoodQuality(t.chatLuong) || isGoodQuality(t.tinhTrangKyThuat)).length, color: '#2e7d32' },
                    { label: 'Trung binh', count: trangBiRows.filter((t) => isMediumQuality(t.chatLuong) || isMediumQuality(t.tinhTrangKyThuat)).length, color: '#ef6c00' },
                    { label: 'Xau/Hong', count: trangBiRows.filter((t) => isBadQuality(t.chatLuong) || isBadQuality(t.tinhTrangKyThuat)).length, color: '#c62828' },
                ],
            };
        case 'baoQuan':
            return {
                title: 'Bao quan',
                stats: [
                    { label: 'Dat yeu cau', count: applicableBaoQuanRows.filter((t) => isGoodQuality(t.chatLuong) || isGoodQuality(t.tinhTrangKyThuat)).length, color: '#2e7d32' },
                    { label: 'Can kiem tra', count: applicableBaoQuanRows.filter((t) => isMediumQuality(t.chatLuong) || isBadQuality(t.chatLuong) || isMediumQuality(t.tinhTrangKyThuat) || isBadQuality(t.tinhTrangKyThuat)).length, color: '#ef6c00' },
                    { label: 'Trong niem cat', count: applicableBaoQuanRows.filter((t) => isPreserved(t.trangThai)).length, color: '#1565c0' },
                ],
            };
        case 'baoDuong':
            return {
                title: 'Bao duong',
                stats: [
                    { label: 'Tong trang bi', count: trangBiRows.length, color: '#1565c0' },
                    { label: 'Tot/Kha', count: trangBiRows.filter((t) => isGoodQuality(t.chatLuong) || isGoodQuality(t.tinhTrangKyThuat)).length, color: '#2e7d32' },
                    { label: 'Can theo doi', count: trangBiRows.filter((t) => isMediumQuality(t.chatLuong) || isBadQuality(t.chatLuong) || isMediumQuality(t.tinhTrangKyThuat) || isBadQuality(t.tinhTrangKyThuat)).length, color: '#ef6c00' },
                ],
            };
        case 'suaChua':
        case 'suaChuaTB':
        case 'suaChuaKQ':
            return {
                title: 'Sua chua',
                stats: [
                    { label: 'Dang sua', count: trangBiRows.filter((t) => isRepairing(t.trangThai)).length, color: '#ef6c00' },
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => isOperating(t.trangThai)).length, color: '#2e7d32' },
                    { label: 'Can xu ly', count: trangBiRows.filter((t) => isBadQuality(t.chatLuong) || isBadQuality(t.tinhTrangKyThuat)).length, color: '#c62828' },
                ],
            };
        case 'niemCat':
        case 'niemCatTB':
        case 'niemCatKQ':
            return {
                title: 'Niem cat',
                stats: [
                    { label: 'Trong niem cat', count: trangBiRows.filter((t) => isPreserved(t.trangThai)).length, color: '#2e7d32' },
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => isOperating(t.trangThai)).length, color: '#ef6c00' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => isRepairing(t.trangThai)).length, color: '#1565c0' },
                ],
            };
        case 'dieuDong':
            return {
                title: 'Dieu dong',
                stats: [
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => isOperating(t.trangThai)).length, color: '#1565c0' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => isRepairing(t.trangThai)).length, color: '#2e7d32' },
                    { label: 'Niem cat', count: trangBiRows.filter((t) => isPreserved(t.trangThai)).length, color: '#c62828' },
                ],
            };
        case 'chuyenCap':
            return {
                title: 'Chuyen cap chat luong',
                stats: [
                    { label: 'Tot/Kha', count: trangBiRows.filter((t) => isGoodQuality(t.chatLuong) || isGoodQuality(t.tinhTrangKyThuat)).length, color: '#2e7d32' },
                    { label: 'Trung binh', count: trangBiRows.filter((t) => isMediumQuality(t.chatLuong) || isMediumQuality(t.tinhTrangKyThuat)).length, color: '#ef6c00' },
                    { label: 'Xau/Hong', count: trangBiRows.filter((t) => isBadQuality(t.chatLuong) || isBadQuality(t.tinhTrangKyThuat)).length, color: '#c62828' },
                ],
            };
        case 'tbNhom1':
            return {
                title: 'Trang bi Nhom 1',
                stats: [
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => t.nhomTrangBi === 1 && isOperating(t.trangThai)).length, color: '#2e7d32' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => t.nhomTrangBi === 1 && isRepairing(t.trangThai)).length, color: '#ef6c00' },
                    { label: 'Niem cat', count: trangBiRows.filter((t) => t.nhomTrangBi === 1 && isPreserved(t.trangThai)).length, color: '#1565c0' },
                ],
            };
        case 'tbNhom2':
            return {
                title: 'Trang bi Nhom 2',
                stats: [
                    { label: 'Hoat dong', count: trangBiRows.filter((t) => t.nhomTrangBi === 2 && isOperating(t.trangThai)).length, color: '#2e7d32' },
                    { label: 'Sua chua', count: trangBiRows.filter((t) => t.nhomTrangBi === 2 && isRepairing(t.trangThai)).length, color: '#ef6c00' },
                    { label: 'Niem cat', count: trangBiRows.filter((t) => t.nhomTrangBi === 2 && isPreserved(t.trangThai)).length, color: '#1565c0' },
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
