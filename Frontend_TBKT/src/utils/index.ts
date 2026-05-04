import { isEmpty } from 'lodash';

const sessionCache = new Map<string, string | null>();

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key) sessionCache.delete(e.key);
        else sessionCache.clear();
    });
}

export const safeSessionSet = (key: string, value: string): void => {
    try {
        sessionStorage.setItem(key, value);
        sessionCache.set(key, value);
    } catch {
        // ignore storage quota/incognito errors
    }
};

export const safeSessionGet = <T = unknown>(key: string): T | null => {
    try {
        if (!sessionCache.has(key)) {
            sessionCache.set(key, sessionStorage.getItem(key));
        }
        const item = sessionCache.get(key) ?? null;
        if (item === null) return null;
        return JSON.parse(item) as T;
    } catch {
        return null;
    }
};

export const safeSessionRemove = (key: string): void => {
    try {
        sessionStorage.removeItem(key);
        sessionCache.delete(key);
    } catch {
        // ignore
    }
};

export const getLocalStorage = safeSessionGet;

export const removeLocalStorage = (): void => {
    ['isAuthenticated', '_token', 'currentUser', 'permission'].forEach((key) => {
        try {
            sessionStorage.removeItem(key);
        } catch {
            // ignore
        }
    });
};

interface CurrentUser {
    is_admin?: number;
}

export const isAdmin = (currentUser: CurrentUser): boolean => currentUser.is_admin === 1;

interface SelectItem {
    id: string;
    name: string;
}

interface SelectOption {
    key: string;
    name: string;
}

export const getMapListSelect = (data: SelectItem[]): SelectOption[] =>
    data.map((item) => ({ key: item.id, name: item.name }));

interface RoleItem {
    name: string;
}

export const _checkRole = (role: string, listRole: RoleItem[]): boolean =>
    listRole.some((item) => role.indexOf(item.name) >= 0);

export const getActiveMenuName = (): string => {
    const url = window.location.pathname;
    if (url === '/' || url === '/dashboard') return 'dashboard';

    if (url.includes('/trang-bi-nhom-1')) return 'tbNhom1';
    if (url.includes('/trang-bi-nhom-2')) return 'tbNhom2';
    if (url.includes('/tinh-trang-ky-thuat')) return 'tinhTrangKT';
    if (url.includes('/bao-quan')) return 'trangbilog_bao_quan';
    if (url.includes('/bao-duong')) return 'trangbilog_bao_duong';
    if (url.includes('/sua-chua')) return 'trangbilog_sua_chua';
    if (url.includes('/niem-cat')) return 'trangbilog_niem_cat';
    if (url.includes('/dieu-dong')) return 'trangbilog_dieu_dong';
    if (url.includes('/chuyen-cap-chat-luong')) return 'chuyenCap';
    if (url.includes('/thong-ke-bao-cao')) return 'thongKe';
    if (url.includes('/cau-hinh-tham-so')) return 'cauHinhThamSo';
    if (url.includes('/cau-hinh-menu')) return 'cauHinhMenu';
    if (url.includes('/cau-hinh-data-source')) return 'cauHinhDataSource';
    if (url.includes('/cau-hinh-template')) return 'cauHinhTemplate';
    if (url.includes('/phan-quyen')) return 'phanQuyen';

    if (url.includes('/menu-dong/')) {
        const segments = url.split('/').filter(Boolean);
        const menuId = segments[1] || '';
        if (menuId) return `menuDong_${menuId}`;
    }

    if (url.includes('/employee')) return 'employee';
    if (url.includes('/office')) return 'office';
    if (url.includes('/catalog')) return 'catalog';
    if (url.includes('/settings')) return 'settings';
    return 'dashboard';
};

