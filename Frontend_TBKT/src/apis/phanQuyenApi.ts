import { create } from "@bufbuild/protobuf";
import {
    GetMyPermissionsRequestSchema,
    GetPermissionCatalogRequestSchema,
    ListNhomNguoiDungRequestSchema,
    SaveNhomNguoiDungRequestSchema,
    DeleteRequestSchema,
    GetGroupPermissionsRequestSchema,
    SaveGroupPermissionsRequestSchema,
    ListGroupUsersRequestSchema,
    ListAllAssignmentsRequestSchema,
    AssignUserRequestSchema,
    RemoveUserRequestSchema,
    RebuildPermissionsStreamRequestSchema,
} from '../grpc/generated/PhanQuyen_pb';
import type { ChucNangPermission, PhanHePermission } from '../store/reducer/permissionReducer';
import { phanQuyenClient } from '../grpc/grpcClient';
import type {
    GroupScopeConfig,
    PermissionGroup,
    PermissionAction,
    PhamViChuyenNganhConfig,
    ScopeType,
} from '../types/permission';

// ── Shared DTOs ───────────────────────────────────────────────────────────────

export interface NhomNguoiDungInfo {
    id: string;
    ten: string;
    moTa: string;
    color: string;
    loai: 'System' | 'Custom';
    clonedFromId: string;
    userCount: number;
    scopeType: string;
    isDefault: boolean;
}

export interface GroupPermissions {
    checkedCodes: string[];
    scopeType: string;
    anchorNodeId?: string;
    multiNodeIds: string[];
    idDanhMucChuyenNganh?: string;
    phamViChuyenNganh?: PhamViChuyenNganhConfig;
}

export interface PermissionCatalogGroupInfo extends PermissionGroup {}

export interface UserInGroupInfo {
    idAssignment: string;
    idNguoiDung: string;
    hoTen: string;
    donVi: string;
    scopeType: string;
    anchorNodeId: string;
    anchorNodeName: string;
    isExpired: boolean;
    ngayHetHan?: string;
    idNguoiUyQuyen?: string;
    idDanhMucChuyenNganh?: string;
}

export interface AssignmentDetailInfo {
    id: string;
    idNguoiDung: string;
    hoTen: string;
    donVi: string;
    idNhom: string;
    tenNhom: string;
    colorNhom: string;
    scopeType: string;
    anchorNodeId: string;
    anchorNodeName: string;
    loai: string;
    ngayTao?: string;
    ngayHetHan?: string;
    idNguoiUyQuyen?: string;
    idDanhMucChuyenNganh?: string;
}

export interface RebuildPermissionsProgress {
    jobId: string;
    stage: string;
    message: string;
    processed: number;
    total: number;
    currentUserId: string;
    warnings: string[];
    done: boolean;
    success: boolean;
    timestamp?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToIso(ts?: { seconds: bigint; nanos: number } | null): string | undefined {
    if (!ts) return undefined;
    const ms = Number(ts.seconds) * 1000 + Math.floor((ts.nanos ?? 0) / 1_000_000);
    return new Date(ms).toISOString();
}

function isoToTimestamp(value?: string): { seconds: bigint; nanos: number } | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    const millis = date.getTime();
    const seconds = Math.floor(millis / 1000);
    const nanos = (millis % 1000) * 1_000_000;
    return {
        seconds: BigInt(seconds),
        nanos,
    };
}

function mapRebuildProgress(event: any): RebuildPermissionsProgress {
    return {
        jobId: event.jobId,
        stage: event.stage,
        message: event.message,
        processed: event.processed ?? 0,
        total: event.total ?? 0,
        currentUserId: event.currentUserId ?? '',
        warnings: [...(event.warnings ?? [])],
        done: event.done ?? false,
        success: event.success ?? false,
        timestamp: tsToIso(event.timestamp),
    };
}

const PHAM_VI_PREFIX = 'PV2::';

function toBase64(value: string): string {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
        return window.btoa(unescape(encodeURIComponent(value)));
    }
    return Buffer.from(value, 'utf8').toString('base64');
}

function fromBase64(value: string): string {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return decodeURIComponent(escape(window.atob(value)));
    }
    return Buffer.from(value, 'base64').toString('utf8');
}

function tryParsePhamViJson(raw?: string): PhamViChuyenNganhConfig | undefined {
    if (!raw) return undefined;
    try {
        const parsed = JSON.parse(raw) as Partial<PhamViChuyenNganhConfig>;
        if (!parsed || typeof parsed !== 'object') return undefined;
        if (typeof parsed.idChuyenNganh !== 'string' || !Array.isArray(parsed.idChuyenNganhDoc)) return undefined;
        const idChuyenNganhDoc = parsed.idChuyenNganhDoc
            .map((entry) => {
                if (!entry || typeof entry.id !== 'string' || !Array.isArray(entry.actions)) return null;
                return {
                    id: entry.id.trim(),
                    actions: entry.actions.filter((action): action is PermissionAction => typeof action === 'string'),
                };
            })
            .filter((entry): entry is { id: string; actions: PermissionAction[] } => Boolean(entry))
            .filter((entry) => entry.id.length > 0);
        if (idChuyenNganhDoc.length === 0) return undefined;
        return {
            idChuyenNganh: parsed.idChuyenNganh.trim(),
            idChuyenNganhDoc,
        };
    } catch {
        return undefined;
    }
}

function decodePhamViPayload(raw?: string): { idDanhMucChuyenNganh: string; phamViChuyenNganh?: PhamViChuyenNganhConfig } {
    if (!raw) return { idDanhMucChuyenNganh: '' };
    if (!raw.startsWith(PHAM_VI_PREFIX)) {
        return { idDanhMucChuyenNganh: raw };
    }
    const encoded = raw.slice(PHAM_VI_PREFIX.length);
    try {
        const json = fromBase64(encoded);
        const parsed = tryParsePhamViJson(json);
        if (!parsed) return { idDanhMucChuyenNganh: '' };
        return {
            idDanhMucChuyenNganh: parsed.idChuyenNganh,
            phamViChuyenNganh: parsed,
        };
    } catch {
        return { idDanhMucChuyenNganh: '' };
    }
}

function encodePhamViPayload(scopeConfig: GroupScopeConfig): string {
    const parsed = scopeConfig.phamViChuyenNganh;
    if (!parsed) return scopeConfig.idDanhMucChuyenNganh ?? '';
    const payload: PhamViChuyenNganhConfig = {
        idChuyenNganh: parsed.idChuyenNganh,
        idChuyenNganhDoc: parsed.idChuyenNganhDoc.map((entry) => ({
            id: entry.id,
            actions: [...entry.actions],
        })),
    };
    return `${PHAM_VI_PREFIX}${toBase64(JSON.stringify(payload))}`;
}

// ── getMyPermissions ──────────────────────────────────────────────────────────

export async function getMyPermissions() {
    const req = create(GetMyPermissionsRequestSchema, {});
    console.log('[phanQuyenApi] Calling getMyPermissions...');
    const res = await phanQuyenClient.getMyPermissions(req);
    console.log('[phanQuyenApi] Response:', {
        scopeType:    res.scopeType,
        phanHeCount:  res.phanHe.length,
        chucNangCount: res.chucNang.length,
        nganhDocIds:  res.nganhDocIds,
    });

    const phanHe: PhanHePermission[] = res.phanHe.map(ph => ({
        maPhanHe:    ph.maPhanHe,
        duocTruyCap: ph.duocTruyCap,
        duocQuanTri: ph.duocQuanTri,
    }));

    const chucNang: ChucNangPermission[] = res.chucNang.map(cn => ({
        maChucNang: cn.maChucNang,
        maPhanHe:   cn.maPhanHe,
        actions: {
            view:     cn.actions?.view     ?? false,
            add:      cn.actions?.add      ?? false,
            edit:     cn.actions?.edit     ?? false,
            delete:   cn.actions?.delete   ?? false,
            approve:  cn.actions?.approve  ?? false,
            download: cn.actions?.download ?? false,
            print:    cn.actions?.print    ?? false,
        },
    }));

    // Parse ActionsPerCN (B3 — AccessGate)
    const actionsPerCn = (res.actionsPerCn ?? []).map(entry => ({
        idChuyenNganh: entry.idChuyenNganh,
        actions: [...entry.actions] as import('../types/permission').PermissionAction[],
    }));

    return {
        phanHe,
        chucNang,
        scopeType:    res.scopeType,
        anchorNodeId: res.anchorNodeId,
        nganhDocIds:  [...res.nganhDocIds],
        idDanhMucChuyenNganh: res.idDanhMucChuyenNganh,
        actionsPerCn,
    };
}

// ── listNhomNguoiDung ─────────────────────────────────────────────────────────

export async function listNhomNguoiDung(): Promise<NhomNguoiDungInfo[]> {
    const req = create(ListNhomNguoiDungRequestSchema, {});
    const res = await phanQuyenClient.listNhomNguoiDung(req);
    return res.items.map(n => ({
        id:          n.id,
        ten:         n.ten,
        moTa:        n.moTa,
        color:       n.color || '#64748b',
        loai:        n.loai === 'System' ? 'System' : 'Custom',
        clonedFromId: n.clonedFromId,
        userCount:   n.userCount,
        scopeType:   n.scopeType || 'SUBTREE',
        isDefault:   n.isDefault,
    }));
}

// ── saveNhomNguoiDung ─────────────────────────────────────────────────────────

export async function saveNhomNguoiDung(params: {
    id?: string;
    ten: string;
    moTa?: string;
    color: string;
    clonedFromId?: string;
    loai?: string;
}): Promise<NhomNguoiDungInfo> {
    const req = create(SaveNhomNguoiDungRequestSchema, {
        id:           params.id ?? '',
        ten:          params.ten,
        moTa:         params.moTa ?? '',
        color:        params.color,
        clonedFromId: params.clonedFromId ?? '',
        loai:         params.loai ?? 'Custom',
    });
    const n = await phanQuyenClient.saveNhomNguoiDung(req);
    return {
        id:          n.id,
        ten:         n.ten,
        moTa:        n.moTa,
        color:       n.color || params.color,
        loai:        n.loai === 'System' ? 'System' : 'Custom',
        clonedFromId: n.clonedFromId,
        userCount:   n.userCount,
        scopeType:   n.scopeType || 'SUBTREE',
        isDefault:   n.isDefault,
    };
}

// ── deleteNhomNguoiDung ───────────────────────────────────────────────────────

export async function deleteNhomNguoiDung(id: string): Promise<{ success: boolean; message: string }> {
    const req = create(DeleteRequestSchema, { id });
    const res = await phanQuyenClient.deleteNhomNguoiDung(req);
    return { success: res.success, message: res.message };
}

// ── getGroupPermissions ───────────────────────────────────────────────────────

export async function getGroupPermissions(idNhom: string): Promise<GroupPermissions> {
    const req = create(GetGroupPermissionsRequestSchema, { idNhom });
    const res = await phanQuyenClient.getGroupPermissions(req);
    const decoded = decodePhamViPayload(res.idDanhMucChuyenNganh);
    return {
        checkedCodes: [...res.checkedCodes],
        scopeType: res.scopeType || 'SUBTREE',
        anchorNodeId: res.anchorNodeId || '',
        multiNodeIds: [...res.multiNodeIds],
        idDanhMucChuyenNganh: decoded.idDanhMucChuyenNganh,
        phamViChuyenNganh: decoded.phamViChuyenNganh,
    };
}

// ── saveGroupPermissions ──────────────────────────────────────────────────────

export async function saveGroupPermissions(
    idNhom: string,
    checkedCodes: string[],
    scopeConfig: GroupScopeConfig,
): Promise<void> {
    const req = create(SaveGroupPermissionsRequestSchema, {
        idNhom,
        checkedCodes,
        scopeType: scopeConfig.scopeType,
        anchorNodeId: scopeConfig.anchorNodeId ?? '',
        multiNodeIds: scopeConfig.multiNodeIds ?? [],
        idDanhMucChuyenNganh: encodePhamViPayload(scopeConfig),
    });
    await phanQuyenClient.saveGroupPermissions(req);
}

// ── listGroupUsers ────────────────────────────────────────────────────────────

export async function listGroupUsers(idNhom: string): Promise<UserInGroupInfo[]> {
    const req = create(ListGroupUsersRequestSchema, { idNhom });
    const res = await phanQuyenClient.listGroupUsers(req);
    return res.users.map(u => ({
        idAssignment: u.idAssignment,
        idNguoiDung:  u.idNguoiDung,
        hoTen:        u.hoTen,
        donVi:        u.donVi,
        scopeType:    u.scopeType,
        anchorNodeId: u.anchorNodeId,
        anchorNodeName: u.anchorNodeName,
        isExpired:    u.isExpired,
        ngayHetHan:   tsToIso(u.ngayHetHan),
        idNguoiUyQuyen: u.idNguoiUyQuyen,
        idDanhMucChuyenNganh: u.idDanhMucChuyenNganh,
    }));
}

export async function getPermissionCatalog(): Promise<PermissionCatalogGroupInfo[]> {
    const req = create(GetPermissionCatalogRequestSchema, {});
    const res = await phanQuyenClient.getPermissionCatalog(req);
    return res.items.map(group => ({
        group: group.group,
        icon: group.icon,
        permissions: group.permissions.map(permission => ({
            code: permission.code,
            name: permission.name,
        })),
    }));
}

// ── listAllAssignments ────────────────────────────────────────────────────────

export async function listAllAssignments(
    page = 1,
    pageSize = 50,
): Promise<{ items: AssignmentDetailInfo[]; totalCount: number }> {
    const req = create(ListAllAssignmentsRequestSchema, { page, pageSize });
    const res = await phanQuyenClient.listAllAssignments(req);
    const items = res.items.map(a => ({
        id:            a.id,
        idNguoiDung:   a.idNguoiDung,
        hoTen:         a.hoTen,
        donVi:         a.donVi,
        idNhom:        a.idNhom,
        tenNhom:       a.tenNhom,
        colorNhom:     a.colorNhom || '#64748b',
        scopeType:     a.scopeType,
        anchorNodeId:  a.anchorNodeId,
        anchorNodeName: a.anchorNodeName,
        loai:          a.loai || 'Direct',
        ngayTao:       tsToIso(a.ngayTao),
        ngayHetHan:    tsToIso(a.ngayHetHan),
        idNguoiUyQuyen: a.idNguoiUyQuyen,
        idDanhMucChuyenNganh: a.idDanhMucChuyenNganh,
    }));
    return { items, totalCount: res.totalCount };
}

// ── assignUserToGroup ─────────────────────────────────────────────────────────

export async function assignUserToGroup(params: {
    idNguoiDung: string;
    idNhom: string;
    scopeType?: string;
    anchorNodeId?: string;
    loai?: string;
    ngayHetHan?: string;
    idNguoiUyQuyen?: string;
    idDanhMucChuyenNganh?: string;
}): Promise<string> {
    const req = create(AssignUserRequestSchema, {
        idNguoiDung:  params.idNguoiDung,
        idNhom:       params.idNhom,
        scopeType:    params.scopeType    ?? 'SUBTREE',
        anchorNodeId: params.anchorNodeId ?? '',
        loai:         params.loai         ?? 'Direct',
        ngayHetHan:   isoToTimestamp(params.ngayHetHan),
        idNguoiUyQuyen: params.idNguoiUyQuyen ?? '',
        idDanhMucChuyenNganh: params.idDanhMucChuyenNganh ?? '',
    });
    const res = await phanQuyenClient.assignUserToGroup(req);
    return res.id;
}

// ── removeUserFromGroup ───────────────────────────────────────────────────────

export async function removeUserFromGroup(idAssignment: string): Promise<void> {
    const req = create(RemoveUserRequestSchema, { idAssignment });
    await phanQuyenClient.removeUserFromGroup(req);
}

export async function streamRebuildPermissions(
    params: { idNhom?: string; userIds?: string[] },
    onEvent?: (event: RebuildPermissionsProgress) => void,
): Promise<RebuildPermissionsProgress[]> {
    const req = create(RebuildPermissionsStreamRequestSchema, {
        idNhom: params.idNhom ?? '',
        userIds: params.userIds ?? [],
    });
    const events: RebuildPermissionsProgress[] = [];
    for await (const event of phanQuyenClient.rebuildPermissionsStream(req)) {
        const mapped = mapRebuildProgress(event);
        events.push(mapped);
        onEvent?.(mapped);
    }
    return events;
}

export default {
    getMyPermissions,
    getPermissionCatalog,
    listNhomNguoiDung,
    saveNhomNguoiDung,
    deleteNhomNguoiDung,
    getGroupPermissions,
    saveGroupPermissions,
    listGroupUsers,
    listAllAssignments,
    assignUserToGroup,
    removeUserFromGroup,
    streamRebuildPermissions,
};
