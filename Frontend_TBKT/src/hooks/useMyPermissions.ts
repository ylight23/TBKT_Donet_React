import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { PermissionAction } from '../types/permission';

export const useMyPermissions = () => {
    const permissions = useSelector((s: RootState) => s.permissionReducer);
    const isAdmin = permissions.scopeType === 'admin';
    const normalizeMaPhanHe = (maPhanHe: string) => maPhanHe?.trim() ? 'TBKT.ThongTin' : '';

    // Debug log khi state thay đổi
    useEffect(() => {
        console.log('[useMyPermissions] state:', {
            loaded:    permissions.loaded,
            isAdmin,
            scopeType: permissions.scopeType,
            phanHe:    permissions.phanHe.length,
            chucNang:  permissions.chucNang.length,
        });
    }, [permissions.loaded, permissions.scopeType, isAdmin, permissions.phanHe.length, permissions.chucNang.length]);
    const canFunc = useCallback(
        (maChucNang: string, action = 'view') => {
            if (isAdmin) return true;
            return permissions.chucNang.some(
                cn => cn.maChucNang === maChucNang && cn.actions[action]
            );
        },
        [isAdmin, permissions.chucNang]
    );

    const canPhanHe = useCallback(
        (maPhanHe: string) => {
            if (isAdmin) return true;
            const normalized = normalizeMaPhanHe(maPhanHe);
            return permissions.phanHe.some(ph => normalizeMaPhanHe(ph.maPhanHe) === normalized && ph.duocTruyCap);
        },
        [isAdmin, permissions.phanHe]
    );

    const canCnAction = useCallback(
        (action: PermissionAction, cnId?: string | null) => {
            if (isAdmin) return true;
            const normalizedCnId = String(cnId || '').trim();
            if (!normalizedCnId) return true;
            if (permissions.actionsPerCn.length === 0) return true;

            const matched = permissions.actionsPerCn.find(
                (entry) => entry.idChuyenNganh === normalizedCnId,
            );
            if (!matched) return false;
            return matched.actions.includes(action);
        },
        [isAdmin, permissions.actionsPerCn],
    );

    return {
        canFunc,
        canCnAction,
        canPhanHe,
        isAdmin,
        loaded:       permissions.loaded,
        scopeType:    permissions.scopeType,
        anchorNodeId: permissions.anchorNodeId,
        visibleCNs:   permissions.visibleCNs,
        actionsPerCn: permissions.actionsPerCn,
    };
};
