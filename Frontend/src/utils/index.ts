import { isEmpty } from "lodash";

// ── Storage version ───────────────────────────────────────────────────────────
const V = 'v1';
export const STORAGE_KEYS = {
    IS_AUTHENTICATED: `isAuthenticated:${V}`,
    CURRENT_USER:     `currentUser:${V}`,
    // ❌ KHÔNG có key cho token → OIDC tự quản lý
} as const;

// ── In-memory cache (tránh đọc sessionStorage nhiều lần) ─────────────────────
const sessionCache = new Map<string, string | null>();

// Invalidate cache nếu tab khác thay đổi storage
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key) sessionCache.delete(e.key);
        else sessionCache.clear();  // e.key === null → storage.clear() được gọi
    });
}

// ── Safe helpers ──────────────────────────────────────────────────────────────
export const safeSessionSet = (key: string, value: string): void => {
    try {
        sessionStorage.setItem(key, value);
        sessionCache.set(key, value);  // keep cache in sync
    }
    catch { /* incognito / quota exceeded */ }
};

export const safeSessionGet = <T = unknown>(key: string): T | null => {
    try {
        if (!sessionCache.has(key)) {
            sessionCache.set(key, sessionStorage.getItem(key));
        }
        const item = sessionCache.get(key) ?? null;
        if (item === null) return null;
        return JSON.parse(item) as T;
    } catch { return null; }
};

export const safeSessionRemove = (key: string): void => {
    try {
        sessionStorage.removeItem(key);
        sessionCache.delete(key);  // keep cache in sync
    }
    catch {}
};

// ── Legacy aliases (giữ tương thích) ─────────────────────────────────────────
export const getLocalStorage = safeSessionGet;

export const removeLocalStorage = (): void => {
    // ✅ Chỉ xóa keys của app, không xóa keys của OIDC library
    Object.values(STORAGE_KEYS).forEach(key => safeSessionRemove(key));

    // Xóa keys cũ không có version (migration cleanup)
    ['isAuthenticated', '_token', 'currentUser', 'permission'].forEach(key => {
        try { sessionStorage.removeItem(key); } catch {}
    });
};

// ── Minimal user type (chỉ store những gì UI cần) ────────────────────────────
export interface MinimalUser {
    id:       string;
    name:     string;
    username: string;
    is_admin?: number;
    // ❌ Không store: email, phone, address, PII
}

// ── App helpers ───────────────────────────────────────────────────────────────
interface CurrentUser { is_admin?: number; }
export const isAdmin = (currentUser: CurrentUser): boolean => currentUser.is_admin === 1;

interface SelectItem  { id: string; name: string; }
interface SelectOption { key: string; name: string; }
export const getMapListSelect = (data: SelectItem[]): SelectOption[] =>
    data.map(item => ({ key: item.id, name: item.name }));

interface RoleItem { name: string; }
export const _checkRole = (role: string, listRole: RoleItem[]): boolean =>
    listRole.some(item => role.indexOf(item.name) >= 0);

export const getActiveMenuName = (): string => {
    const url = window.location.pathname;
    if (url === '/' || url === '/dashboard') return 'dashboard';
    if (url.includes('/employee'))           return 'employee';
    if (url.includes('/office'))             return 'office';
    if (url.includes('/catalog'))            return 'catalog';
    if (url.includes('/settings'))           return 'settings';
    return 'dashboard';
};
