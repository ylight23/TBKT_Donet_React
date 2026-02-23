import { isEmpty } from "lodash";

interface AuthData {
    userPermission?: unknown;
    accessToken?: string;
}

interface SelectItem {
    id: string;
    name: string;
}

interface SelectOption {
    key: string;
    name: string;
}

interface RoleItem {
    name: string;
}

interface CurrentUser {
    is_admin?: number;
}

export const setLocalStrorage = (data: AuthData): void => {
    if (data) {
        sessionStorage.setItem('currentUser', JSON.stringify(data.userPermission));
        sessionStorage.setItem('isAuthenticated', 'true');
        if (data.accessToken) {
            sessionStorage.setItem('_token', data.accessToken);
        }
    }
}

export const removeLocalStorage = (): void => {
    sessionStorage.clear();
}

export const getLocalStorage = <T = unknown>(field: string): T | null => {
    const item = sessionStorage.getItem(field);
    if (item === null) return null;
    try {
        return JSON.parse(item) as T;
    } catch {
        return null;
    }
}

export const isAdmin = (currentUser: CurrentUser): boolean => {
    return currentUser.is_admin === 1;
}

export const getMapListSelect = (data: SelectItem[]): SelectOption[] => {
    const dataSelect = data.map(item => {
        return {
            key: item.id,
            name: item.name
        }
    });
    return dataSelect;
}

export const getActiveMenuName = (): string => {
    const url = window.location.pathname;
    let active = 'dashboard';

    // Check exact match first, then includes
    if (url === '/' || url === '/dashboard') {
        active = 'dashboard';
    } else if (url.includes('/employee')) {
        active = 'employee';
    } else if (url.includes('/office')) {
        active = 'office';
    } else if (url.includes('/catalog')) {
        active = 'catalog';
    } else if (url.includes('/settings')) {
        active = 'settings';
    }

    return active;
}

export const _checkRole = (role: string, listRole: RoleItem[]): boolean => {
    let hasRole = false;
    listRole.forEach(item => {
        if(role.indexOf(item.name) >= 0){
            hasRole = true;
        }
    })
    return hasRole;
}
