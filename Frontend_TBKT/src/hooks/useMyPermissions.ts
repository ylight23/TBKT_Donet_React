import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { PermissionAction } from '../types/permission';

type PermissionCheckInput = string | string[] | undefined | null;

const normalizeMaPhanHe = (maPhanHe?: string | null) => String(maPhanHe || '').trim();
const normalizePermissionCode = (maChucNang?: string | null) => String(maChucNang || '').trim().toLowerCase();
const normalizeCnId = (cnId?: string | null) => String(cnId || '').trim();

export const useMyPermissions = () => {
    const permissions = useSelector((s: RootState) => s.permissionReducer);
    const isAdmin = permissions.scopeType === 'admin';

    const functionActionMap = useMemo(() => {
        const map = new Map<string, Record<string, boolean>>();
        for (const item of permissions.chucNang) {
            const code = normalizePermissionCode(item.maChucNang);
            if (!code) continue;
            const existing = map.get(code);
            if (!existing) {
                map.set(code, item.actions);
                continue;
            }
            map.set(code, {
                view: existing.view || item.actions.view,
                add: existing.add || item.actions.add,
                edit: existing.edit || item.actions.edit,
                delete: existing.delete || item.actions.delete,
                approve: existing.approve || item.actions.approve,
                unapprove: existing.unapprove || item.actions.unapprove,
                download: existing.download || item.actions.download,
                print: existing.print || item.actions.print,
            });
        }
        return map;
    }, [permissions.chucNang]);

    const moduleAccessMap = useMemo(() => {
        const map = new Map<string, boolean>();
        for (const item of permissions.phanHe) {
            const code = normalizeMaPhanHe(item.maPhanHe);
            if (code) map.set(code, item.duocTruyCap);
        }
        return map;
    }, [permissions.phanHe]);

    const cnActionMap = useMemo(() => {
        const map = new Map<string, Set<PermissionAction>>();
        for (const item of permissions.actionsPerCn) {
            const cnId = normalizeCnId(item.idChuyenNganh);
            if (cnId) map.set(cnId, new Set(item.actions));
        }
        return map;
    }, [permissions.actionsPerCn]);

    const cnFunctionActionMap = useMemo(() => {
        const map = new Map<string, Map<string, Set<PermissionAction>>>();
        for (const item of permissions.actionsPerCn) {
            const cnId = normalizeCnId(item.idChuyenNganh);
            if (!cnId) continue;
            const perFunc = new Map<string, Set<PermissionAction>>();
            for (const [code, actions] of Object.entries(item.functionActions ?? {})) {
                const normalizedCode = normalizePermissionCode(code);
                if (normalizedCode) perFunc.set(normalizedCode, new Set(actions));
            }
            if (perFunc.size > 0) map.set(cnId, perFunc);
        }
        return map;
    }, [permissions.actionsPerCn]);

    const canFunc = useCallback(
        (maChucNang: string, action: PermissionAction = 'view') => {
            if (isAdmin) return true;
            const normalizedTarget = normalizePermissionCode(maChucNang);
            if (!normalizedTarget) return false;
            return functionActionMap.get(normalizedTarget)?.[action] === true;
        },
        [isAdmin, functionActionMap],
    );

    const canAnyFunc = useCallback(
        (maChucNang: PermissionCheckInput, action: PermissionAction = 'view') => {
            if (!maChucNang) return true;
            const codes = Array.isArray(maChucNang) ? maChucNang : [maChucNang];
            return codes.some((code) => canFunc(code, action));
        },
        [canFunc],
    );

    const canPhanHe = useCallback(
        (maPhanHe: string) => {
            if (isAdmin) return true;
            const normalized = normalizeMaPhanHe(maPhanHe);
            if (!normalized) return false;
            return moduleAccessMap.get(normalized) === true;
        },
        [isAdmin, moduleAccessMap],
    );

    const canCnAction = useCallback(
        (action: PermissionAction, cnId?: string | null, maChucNang?: string | null) => {
            if (isAdmin) return true;
            const normalizedCnId = normalizeCnId(cnId);
            if (!normalizedCnId) return true;
            if (cnActionMap.size > 0 && cnActionMap.get(normalizedCnId)?.has(action) !== true) return false;
            const normalizedCode = normalizePermissionCode(maChucNang);
            if (normalizedCode) {
                const functionActions = cnFunctionActionMap.get(normalizedCnId);
                const actions = functionActions?.get(normalizedCode);
                if (actions) return actions.has(action);
            }
            return true;
        },
        [isAdmin, cnActionMap, cnFunctionActionMap],
    );

    return {
        canFunc,
        canAnyFunc,
        canCnAction,
        canPhanHe,
        isAdmin,
        loaded: permissions.loaded,
        scopeType: permissions.scopeType,
        anchorNodeId: permissions.anchorNodeId,
        visibleCNs: permissions.visibleCNs,
        actionsPerCn: permissions.actionsPerCn,
    };
};
