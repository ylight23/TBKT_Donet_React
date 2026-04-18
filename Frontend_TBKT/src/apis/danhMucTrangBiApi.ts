import { create } from '@bufbuild/protobuf';
import { danhMucTrangBiClient } from '../grpc/grpcClient';
import type { TrangBiTree as DanhMucTrangBiTree } from '../grpc/generated/DanhMucTrangBi_pb';
import {
    GetListMaDinhDanhTrangBiRequestSchema,
    TrangBiTreeGetRequestSchema,
    TrangBiTreeListRequestSchema,
    TrangBiTreeSchema,
    SaveTrangBiTreeRequestSchema,
} from '../grpc/generated/DanhMucTrangBi_pb';
import { GetFieldSetsByMaDanhMucRequestSchema } from '../grpc/generated/ThamSo_pb';
import { create as createEf } from '@bufbuild/protobuf';
import { ExtendedFieldSchema } from '../grpc/generated/ExtendedField_pb';
import { listDanhMucChuyenNganh } from './danhmucChuyenNganhApi';
import { serializeProtoObject } from '../utils/serializeProto';
import { type LocalFieldSet, protoSetDetailToLocal, assertHydratedFieldSets } from './thamSoApi';

export type { DanhMucTrangBiTree };

export interface DanhMucTrangBiOption {
    id: string;
    label: string;
    parentId?: string;
    isLeaf: boolean;
}

export type MaDinhDanhTrangBiOption = DanhMucTrangBiOption;
export const DANH_MUC_TRANG_BI_TREE_ENDPOINT = '/DanhMucTrangBi.DanhMucTrangBiService/GetListTree';
export const MA_DINH_DANH_TRANG_BI_LIST_ENDPOINT = '/DanhMucTrangBi.DanhMucTrangBiService/GetListMaDinhDanhTrangBi';

export interface TrangBiSpecializationOption {
    id: string;
    label: string;
    count: number;
}

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const pickLabel = (node: DanhMucTrangBiTree): string => {
    const ten = normalizeText(node.ten);
    const tenDayDu = normalizeText(node.tenDayDu);
    if (ten && tenDayDu && tenDayDu !== ten) return `${ten} - ${tenDayDu}`;
    return tenDayDu || ten || normalizeText(node.id);
};

export async function getDanhMucTrangBiOptions(): Promise<DanhMucTrangBiOption[]> {
    const req = create(TrangBiTreeListRequestSchema, {
        loadAll: true,
    });

    const res = await danhMucTrangBiClient.getListTree(req);
    const allNodes = res.items ?? [];
    const optionMap = new Map<string, DanhMucTrangBiOption>();

    for (const node of allNodes) {
        const id = normalizeText(node.id);
        if (!id) continue;
        if (optionMap.has(id)) continue;

        const hasChildren = Boolean(node.coCapDuoi);
        optionMap.set(id, {
            id,
            label: pickLabel(node),
            parentId: normalizeText(node.idCapTren) || undefined,
            isLeaf: !hasChildren && !node.coCapDuoi,
        });
    }

    return Array.from(optionMap.values()).sort((a, b) => a.id.localeCompare(b.id));
}

// API nghiep vu ro nghia hon cho dropdown/list "ma dinh danh trang bi"
export async function getListMaDinhDanhTrangBi(): Promise<MaDinhDanhTrangBiOption[]> {
    const request = create(GetListMaDinhDanhTrangBiRequestSchema, {
        onlyLeaf: false,
    });
    const res = await danhMucTrangBiClient.getListMaDinhDanhTrangBi(request);
    return (res.items ?? [])
        .map((item) => ({
            id: normalizeText(item.id),
            label: normalizeText(item.label) || normalizeText(item.id),
            parentId: normalizeText(item.parentId) || undefined,
            isLeaf: Boolean(item.isLeaf),
        }))
        .filter((item) => item.id.length > 0)
        .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getTrangBiSpecializationOptions(): Promise<TrangBiSpecializationOption[]> {
    const cnList = await listDanhMucChuyenNganh();
    return cnList
        .sort((a, b) => a.thuTu - b.thuTu)
        .map((cn) => ({
            id: cn.id,
            label: cn.ten || cn.id,
            count: 0,
        }));
}

export async function getTreeChildren(
    options: {
        parentId?: string;
        searchText?: string;
        loadAll?: boolean;
    } = {},
): Promise<DanhMucTrangBiTree[]> {
    const request = create(TrangBiTreeListRequestSchema, {
        parentId: options.parentId,
        searchText: options.searchText,
        loadAll: options.loadAll ?? false,
    });
    const res = await danhMucTrangBiClient.getListTree(request);
    return serializeProtoObject(res.items ?? []) as DanhMucTrangBiTree[];
}

export async function getTreeItem(id: string): Promise<DanhMucTrangBiTree | null> {
    const request = create(TrangBiTreeGetRequestSchema, { id });
    const res = await danhMucTrangBiClient.getTree(request);
    return res.item ? (serializeProtoObject(res.item) as DanhMucTrangBiTree) : null;
}

export async function saveTreeItem(
    nodeData: {
        id?: string;
        idCapTren?: string;
        ten: string;
        tenDayDu?: string;
        vietTat?: string;
        thuTu?: number;
        parameters?: Record<string, string>;
    },
    options: { isNew: boolean; oldId?: string; levelLength?: number },
): Promise<{ success: boolean; id: string; message: string }> {
    const params = Object.entries(nodeData.parameters ?? {}).map(([name, value]) =>
        createEf(ExtendedFieldSchema, { name, stringValue: value }),
    );

    const item = create(TrangBiTreeSchema, {
        id: nodeData.id,
        idCapTren: nodeData.idCapTren,
        ten: nodeData.ten,
        tenDayDu: nodeData.tenDayDu,
        vietTat: nodeData.vietTat,
        thuTu: nodeData.thuTu ?? 0,
        coCapDuoi: false,
        parameters: params,
    });

    const request = create(SaveTrangBiTreeRequestSchema, {
        item,
        isNew: options.isNew,
        oldId: options.oldId,
        levelLength: options.levelLength ?? 3,
    });

    const res = await danhMucTrangBiClient.saveTree(request);
    if (!res.success) {
        throw new Error(res.message || 'Luu du lieu that bai');
    }

    return { success: res.success, id: res.id, message: res.message };
}

/**
 * Tra cứu FieldSet theo mã danh mục trang bị (_id DanhMucTrangBi).
 * Backend match: prefix match giữa MaDanhMucTrangBi của FieldSet và mã truyền vào.
 */
export async function getFieldSetsByMaDanhMuc(maDanhMuc: string): Promise<LocalFieldSet[]> {
    try {
        const trimmed = maDanhMuc.trim();
        if (!trimmed) return [];

        const request = create(GetFieldSetsByMaDanhMucRequestSchema, {
            maDanhMuc: trimmed,
        });
        const res = await danhMucTrangBiClient.getFieldSetsByMaDanhMuc(request);
        if (!res.meta?.success) {
            throw new Error(res.meta?.message || 'Khong the tra cuu field set theo ma danh muc trang bi');
        }
        const mapped = (res.items ?? []).map(protoSetDetailToLocal);
        assertHydratedFieldSets(mapped, `getFieldSetsByMaDanhMuc:${trimmed}`);
        console.log('[danhMucTrangBiApi] getFieldSetsByMaDanhMuc:', trimmed, '→', mapped.length, 'items');
        return mapped;
    } catch (err) {
        console.error('[danhMucTrangBiApi] getFieldSetsByMaDanhMuc error:', err);
        throw err;
    }
}

export default {
    getDanhMucTrangBiOptions,
    getListMaDinhDanhTrangBi,
    getTrangBiSpecializationOptions,
    getTreeChildren,
    getTreeItem,
    saveTreeItem,
    getFieldSetsByMaDanhMuc,
};
