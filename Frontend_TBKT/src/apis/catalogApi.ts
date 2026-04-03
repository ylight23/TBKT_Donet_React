import { create } from "@bufbuild/protobuf";
import { catalogClient } from "../grpc/grpcClient";
import { officeClient } from "../grpc/grpcClient";
import { listDanhMucChuyenNganh } from "./danhmucChuyenNganhApi";

import type { Catalog, CatalogListRequest, CatalogTree } from "../grpc/generated/Catalog_pb";
import {
    CatalogListRequestSchema,
    CatalogSchema,
    CatalogTreeListRequestSchema,
    CatalogTreeSchema,
    SaveCatalogRequestSchema,
    SaveCatalogTreeRequestSchema,
} from "../grpc/generated/Catalog_pb";
import { create as createEf } from "@bufbuild/protobuf";
import { ExtendedFieldSchema } from "../grpc/generated/ExtendedField_pb";

export type { CatalogTree };

// =====================
// Utils
// =====================


// =====================
// Types
// =====================
interface CatalogOptions {
    searchText?: string;
    inListIds?: string[];
}

interface SaveCatalogDynamicOptions {
    id?: string;
    ten?: string;
    vietTat?: string;
    thuTu?: number;
}

export interface TrangBiSpecializationOption {
    id: string;
    label: string;
    count: number;
}

const pickFirstNonEmpty = (...values: unknown[]): string => {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
};

const generateClientId = (): string => {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
    } catch {
        // no-op
    }
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

// =====================
// API
// =====================
const catalogApi = {
    async getListCatalog(
        catalogName: string,
        options: CatalogOptions = {}
    ): Promise<Catalog[]> {
        try {
            const request = create(CatalogListRequestSchema, {
                catalogName: catalogName,
                searchText: options.searchText ?? "",
                inListIds: options.inListIds ?? [],
                onlyInListIds: !!options.inListIds?.length,
                extendedFields: [],
                includeFields: [],
            });

            const res = await catalogClient.getListCatalog(request);

            return res.items.map((item: Catalog) => item);
        } catch (err) {
            throw err;
        }
    },

    async saveCatalogDynamic(
        catalogName: string,
        data: Record<string, unknown>,
        options: SaveCatalogDynamicOptions = {}
    ): Promise<{ success: boolean; id: string; message: string }> {
        const safeCatalogName = String(catalogName || '').trim();
        if (!safeCatalogName) {
            throw new Error('Thieu catalogName de luu du lieu');
        }

        const normalizedId =
            pickFirstNonEmpty(
                options.id,
                data.id,
                data.ma,
                data.ma_trang_bi,
                data.maTrangBi,
                data.code,
            ) || generateClientId();
        const ten =
            pickFirstNonEmpty(
                options.ten,
                data.ten,
                data.name,
                data.title,
                data.ten_trang_bi,
                data.tenTrangBi,
            ) || normalizedId;

        const vietTat = pickFirstNonEmpty(options.vietTat, data.vietTat, data.code);
        const thuTuRaw = options.thuTu ?? Number(data.thuTu ?? 0);
        const thuTu = Number.isFinite(thuTuRaw) ? Number(thuTuRaw) : 0;

        const item = create(CatalogSchema, {
            id: normalizedId,
            ten,
            vietTat: vietTat || undefined,
            thuTu,
            tags: [],
            parameters: [],
        });

        const request = create(SaveCatalogRequestSchema, {
            item,
            catalogName: safeCatalogName,
            isNew: !options.id,
            oldId: options.id ? String(options.id).trim() : undefined,
        });

        const res = await catalogClient.saveCatalog(request);
        if (!res.success) {
            throw new Error(res.message || res.messageException || 'Luu du lieu that bai');
        }

        return {
            success: res.success,
            id: res.id,
            message: res.message,
        };
    },

    async getTrangBiSpecializationOptions(): Promise<TrangBiSpecializationOption[]> {
        const cnList = await listDanhMucChuyenNganh();
        return cnList
            .sort((a, b) => a.thuTu - b.thuTu)
            .map((cn) => ({
                id: cn.id,
                label: cn.ten || cn.id,
                count: 0,
            }));
    },

    async getCatalogTreeChildren(
        catalogName: string,
        options: {
            parentId?: string;
            searchText?: string;
            loadAll?: boolean;
        } = {}
    ): Promise<CatalogTree[]> {
        const request = create(CatalogTreeListRequestSchema, {
            catalogName: catalogName,
            parentId: options.parentId,
            searchText: options.searchText,
            loadAll: options.loadAll ?? false,
            extendedFields: [],
            inIds: [],
            excludeLeaf: false,
            onlyLeaf: false,
        });
        const res = await catalogClient.getListCatalogTree(request);
        return res.items;
    },

    async saveCatalogTreeItem(
        catalogName: string,
        nodeData: {
            id?: string;
            idCapTren?: string;
            ten: string;
            tenDayDu?: string;
            vietTat?: string;
            thuTu?: number;
            parameters?: Record<string, string>;
        },
        options: { isNew: boolean; oldId?: string; levelLength?: number }
    ): Promise<{ success: boolean; id: string; message: string }> {
        const params = Object.entries(nodeData.parameters ?? {}).map(([name, value]) =>
            createEf(ExtendedFieldSchema, { name, stringValue: value }),
        );

        const item = create(CatalogTreeSchema, {
            id: nodeData.id,
            idCapTren: nodeData.idCapTren,
            ten: nodeData.ten,
            tenDayDu: nodeData.tenDayDu,
            vietTat: nodeData.vietTat,
            thuTu: nodeData.thuTu ?? 0,
            coCapDuoi: false,
            tags: [],
            parameters: params,
            child: [],
        });

        const request = create(SaveCatalogTreeRequestSchema, {
            catalogName: catalogName,
            item,
            isNew: options.isNew,
            oldId: options.oldId,
            levelLength: options.levelLength ?? 3,
        });

        const res = await catalogClient.saveCatalogTree(request);
        if (!res.success) {
            throw new Error(res.message || res.messageException || 'Luu du lieu that bai');
        }

        return { success: res.success, id: res.id, message: res.message };
    },
};

export default catalogApi;
