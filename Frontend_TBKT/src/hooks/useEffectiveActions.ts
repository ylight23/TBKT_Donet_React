/**
 * useEffectiveActions — Tính giao nhau 2 chiều phân quyền:
 *   Chiều 1: checkedCodes (quyền chức năng — RolePermissionPanel)
 *   Chiều 2: ActionsPerCN  (quyền trên CN — ScopeConfigPanel)
 *
 * Kết quả = MIN(checkedCodes, ActionsPerCN[cnId])
 *
 * VD:
 *   checkedCodes = ["trangbi.view", "trangbi.edit", "trangbi.add"]
 *   ActionsPerCN["thongtin"] = ["view", "download"]
 *   → effectiveActions("thongtin") = ["view"]  (chỉ "view" nằm ở cả 2 tập)
 */

import { useMemo } from 'react';
import type { PermissionAction, PhamViChuyenNganhConfig, ChuyenNganhDocScope } from '../types/permission';

// ── Single entity check ───────────────────────────────────────────

/**
 * Tính effective actions cho 1 entity thuộc CN cụ thể.
 * @param checkedCodes Danh sách quyền chức năng đã check (ví dụ: ["trangbi.view", "trangbi.edit"])
 * @param phamVi      Cấu hình PhamViChuyenNganh từ ScopeConfigPanel
 * @param maChucNang  Module prefix (ví dụ: "trangbi", "baoduong")
 * @param entityCnId  IDChuyenNganh của entity cần kiểm tra
 * @returns Mảng PermissionAction[] — chỉ chứa actions có ở CẢ HAI tập
 */
export function computeEffectiveActions(
    checkedCodes: string[],
    phamVi: PhamViChuyenNganhConfig | undefined,
    maChucNang: string,
    entityCnId: string,
): PermissionAction[] {
    // Chiều 1: trích actions từ checkedCodes theo module
    const prefix = maChucNang + '.';
    const funcActions = checkedCodes
        .filter(code => code.startsWith(prefix))
        .map(code => code.slice(prefix.length) as PermissionAction);

    if (funcActions.length === 0) return [];

    // Chiều 2: tìm entry CN trong PhamViChuyenNganh
    if (!phamVi?.idChuyenNganhDoc) return funcActions; // không cấu hình CN → chỉ giới hạn bởi chiều 1
    const cnEntry = phamVi.idChuyenNganhDoc.find((e: ChuyenNganhDocScope) => e.id === entityCnId);
    if (!cnEntry) return []; // không trong phạm vi → không có quyền gì

    // Giao nhau
    const cnActions = new Set(cnEntry.actions);
    return funcActions.filter(a => cnActions.has(a));
}

// ── Hook (memoized) ───────────────────────────────────────────────

/**
 * React hook version — memoized tính giao nhau.
 */
export function useEffectiveActions(
    checkedCodes: string[],
    phamVi: PhamViChuyenNganhConfig | undefined,
    maChucNang: string,
    entityCnId: string,
): PermissionAction[] {
    return useMemo(
        () => computeEffectiveActions(checkedCodes, phamVi, maChucNang, entityCnId),
        [checkedCodes, phamVi, maChucNang, entityCnId],
    );
}

// ── Batch: tính effective cho tất cả CN entries ───────────────────

export interface EffectiveCnEntry {
    id: string;
    isOwn: boolean;
    /** Actions chỉ từ chiều CN (ActionsPerCN raw — chưa giao nhau) */
    rawActions: PermissionAction[];
    /** Actions sau giao nhau — đây mới là thực tế user được làm */
    effectiveActions: PermissionAction[];
}

/**
 * Tính effective actions cho TẤT CẢ CN entries trong PhamViChuyenNganh.
 * Dùng cho CnActionsSummary — hiển thị đúng giao nhau trên UI.
 */
export function computeAllEffectiveCnEntries(
    checkedCodes: string[],
    phamVi: PhamViChuyenNganhConfig | undefined,
    maChucNang: string,
): EffectiveCnEntry[] {
    if (!phamVi?.idChuyenNganhDoc) return [];

    const prefix = maChucNang + '.';
    const funcActions = checkedCodes
        .filter(code => code.startsWith(prefix))
        .map(code => code.slice(prefix.length) as PermissionAction);
    
    const funcSet = new Set(funcActions);

    return phamVi.idChuyenNganhDoc.map((entry: ChuyenNganhDocScope) => {
        const effective = entry.actions.filter((a: PermissionAction) => funcSet.has(a));
        return {
            id: entry.id,
            isOwn: entry.id === phamVi.idChuyenNganh,
            rawActions: entry.actions,
            effectiveActions: effective,
        };
    });
}

/**
 * React hook version — memoized batch computation.
 */
export function useAllEffectiveCnEntries(
    checkedCodes: string[],
    phamVi: PhamViChuyenNganhConfig | undefined,
    maChucNang: string,
): EffectiveCnEntry[] {
    return useMemo(
        () => computeAllEffectiveCnEntries(checkedCodes, phamVi, maChucNang),
        [checkedCodes, phamVi, maChucNang],
    );
}
