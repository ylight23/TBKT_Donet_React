// @ts-nocheck
import { create } from "@bufbuild/protobuf";
import {
    GetListDynamicFieldsRequestSchema,
    SaveDynamicFieldRequestSchema,
    DeleteDynamicFieldRequestSchema,
    DynamicFieldSchema,
    FieldValidationSchema,

    GetListFieldSetsRequestSchema,
    SaveFieldSetRequestSchema,
    DeleteFieldSetRequestSchema,
    FieldSetSchema,

    GetListFormConfigsRequestSchema,
    SaveFormConfigRequestSchema,
    DeleteFormConfigRequestSchema,
    FormConfigSchema,
    FormTabConfigSchema,

    GetListDynamicMenusRequestSchema,
    SaveDynamicMenuRequestSchema,
    DeleteDynamicMenuRequestSchema,
    GetDynamicMenuRowsRequestSchema,
    DynamicMenuSchema,
    GetListDynamicMenuDataSourcesRequestSchema,
    SaveDynamicMenuDataSourceRequestSchema,
    DeleteDynamicMenuDataSourceRequestSchema,
    DynamicMenuDataSourceSchema,
    DynamicMenuDataSourceFieldSchema,
    SyncDynamicMenuDataSourcesFromProtoRequestSchema,
    DiscoverCollectionFieldsRequestSchema,
} from '../grpc/generated/ThamSo_pb';

import type {
    DynamicField as DynamicFieldProto,
    FieldSet as FieldSetProto,
    FormConfig as FormConfigProto,
    FieldValidation as FieldValidationProto,
    FormTabConfig as FormTabConfigProto,
    DynamicMenu as DynamicMenuProto,
    DynamicMenuDataSource as DynamicMenuDataSourceProto,
} from '../grpc/generated/ThamSo_pb';

import { thamSoClient } from '../grpc/grpcClient';

// ============================================================
// Local types (used by the CauHinhThamSo UI)
// ============================================================
export interface LocalFieldValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
    dataSource?: 'manual' | 'api' | string;
    apiUrl?: string;
    displayType?: 'dropdown' | 'tabs' | string;
}

export interface LocalDynamicField {
    id: string;
    key: string;
    label: string;
    type: string;
    required: boolean;
    validation: LocalFieldValidation;
}

export interface LocalFieldSet {
    id: string;
    name: string;
    icon: string;        // MUI icon name, e.g. "Shield"
    color: string;
    desc?: string;
    fieldIds: string[];
}

export interface LocalFormTabConfig {
    id: string;
    label: string;
    setIds: string[];
}

export interface LocalFormConfig {
    id: string;
    name: string;
    desc?: string;
    tabs: LocalFormTabConfig[];
}

export interface LocalDynamicMenu {
    id: string;
    title: string;
    path: string;
    active: string;
    icon: string;
    dataSource: string;
    gridCount: number;
    columnCount: number;
    columnNames: string[];
    columnKeys: string[];
    enabled: boolean;
}

export interface LocalDynamicMenuDataSourceField {
    key: string;
    label: string;
    dataType: string;
}

export interface LocalDynamicMenuDataSource {
    id: string;
    sourceKey: string;
    sourceName: string;
    collectionName: string;
    fields: LocalDynamicMenuDataSourceField[];
    enabled: boolean;
}

// ============================================================
// Mappers: Proto <-> Local
// ============================================================
function protoFieldToLocal(f: DynamicFieldProto): LocalDynamicField {
    return {
        id: f.id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        validation: {
            minLength: f.validation?.minLength || undefined,
            maxLength: f.validation?.maxLength || undefined,
            pattern: f.validation?.pattern || undefined,
            min: f.validation?.min || undefined,
            max: f.validation?.max || undefined,
            options: f.validation?.options?.length ? [...f.validation.options] : undefined,
            dataSource: f.validation?.dataSource || undefined,
            apiUrl: f.validation?.apiUrl || undefined,
            displayType: f.validation?.displayType || undefined,
        },
    };
}

function localFieldToProto(f: LocalDynamicField): any {
    return create(DynamicFieldSchema, {
        id: f.id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        validation: create(FieldValidationSchema, {
            minLength: f.validation?.minLength ?? 0,
            maxLength: f.validation?.maxLength ?? 0,
            pattern: f.validation?.pattern ?? '',
            min: f.validation?.min ?? 0,
            max: f.validation?.max ?? 0,
            options: f.validation?.options ?? [],
            dataSource: f.validation?.dataSource ?? '',
            apiUrl: f.validation?.apiUrl ?? '',
            displayType: f.validation?.displayType ?? '',
        }),
    });
}

function protoSetToLocal(s: FieldSetProto): LocalFieldSet {
    const seen = new Set<string>();
    const fieldIds: string[] = [];
    for (const f of s.fields) {
        if (f.id && !seen.has(f.id)) { seen.add(f.id); fieldIds.push(f.id); }
    }
    return {
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        desc: s.desc,
        fieldIds,
    };
}

function localSetToProto(s: LocalFieldSet, allFields?: LocalDynamicField[]): any {
    return create(FieldSetSchema, {
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        desc: s.desc || '',
        fields: s.fieldIds.map(id => {
            const f = allFields?.find(x => x.id === id);
            return f ? localFieldToProto(f) : create(DynamicFieldSchema, { id });
        }),
    });
}

function protoFormToLocal(fc: FormConfigProto): LocalFormConfig {
    return {
        id: fc.id,
        name: fc.name,
        desc: fc.desc || '',
        tabs: fc.tabs.map((t) => ({
            id: t.id,
            label: t.label,
            setIds: t.fieldSets.map(fs => fs.id),
        })),
    };
}

function localFormToProto(fc: LocalFormConfig, allFieldSets?: LocalFieldSet[], allFields?: LocalDynamicField[]): any {
    return create(FormConfigSchema, {
        id: fc.id,
        name: fc.name,
        desc: fc.desc || '',
        tabs: fc.tabs.map((t) =>
            create(FormTabConfigSchema, {
                id: t.id,
                label: t.label,
                fieldSets: t.setIds.map(id => {
                    const fs = allFieldSets?.find(s => s.id === id);
                    return fs ? localSetToProto(fs, allFields) : create(FieldSetSchema, { id });
                }),
            }),
        ),
    });
}

function protoDynamicMenuToLocal(item: DynamicMenuProto): LocalDynamicMenu {
    return {
        id: item.id,
        title: item.title,
        path: item.path,
        active: item.active,
        icon: item.icon || 'Assignment',
        dataSource: item.dataSource || 'employee',
        gridCount: item.gridCount,
        columnCount: item.columnCount || 4,
        columnNames: item.columnNames?.length ? [...item.columnNames] : [],
        columnKeys: item.columnKeys?.length ? [...item.columnKeys] : [],
        enabled: item.enabled,
    };
}

function localDynamicMenuToProto(item: LocalDynamicMenu): any {
    return create(DynamicMenuSchema, {
        id: item.id,
        title: item.title,
        path: item.path,
        active: item.active,
        icon: item.icon || 'Assignment',
        dataSource: item.dataSource || 'employee',
        gridCount: item.gridCount,
        columnCount: item.columnCount || 4,
        columnNames: item.columnNames ?? [],
        columnKeys: item.columnKeys ?? [],
        enabled: item.enabled,
    });
}

function protoDynamicMenuDataSourceToLocal(item: DynamicMenuDataSourceProto): LocalDynamicMenuDataSource {
    return {
        id: item.id,
        sourceKey: item.sourceKey,
        sourceName: item.sourceName,
        collectionName: item.collectionName,
        fields: item.fields.map((field) => ({
            key: field.key,
            label: field.label,
            dataType: field.dataType,
        })),
        enabled: item.enabled,
    };
}

function localDynamicMenuDataSourceToProto(item: LocalDynamicMenuDataSource): any {
    return create(DynamicMenuDataSourceSchema, {
        id: item.id,
        sourceKey: item.sourceKey,
        sourceName: item.sourceName,
        collectionName: item.collectionName,
        enabled: item.enabled,
        fields: item.fields.map((field) => create(DynamicMenuDataSourceFieldSchema, {
            key: field.key,
            label: field.label,
            dataType: field.dataType,
        })),
    });
}

// ============================================================
// API
// ============================================================
const thamSoApi = {
    // ── DynamicField ──────────────────────────────────────────
    async getListDynamicFields(): Promise<LocalDynamicField[]> {
        try {
            const request = create(GetListDynamicFieldsRequestSchema, {});
            const res = await thamSoClient.getListDynamicFields(request);
            console.log('[thamSoApi] getListDynamicFields:', res.items.length);
            return res.items.map(protoFieldToLocal);
        } catch (err) {
            console.error('[thamSoApi] getListDynamicFields error:', err);
            throw err;
        }
    },

    async saveDynamicField(field: LocalDynamicField, isNew: boolean): Promise<LocalDynamicField> {
        try {
            const request = create(SaveDynamicFieldRequestSchema, {
                isNew,
                item: localFieldToProto(field),
            });
            const res = await thamSoClient.saveDynamicField(request);
            if (!res.success || !res.item) throw new Error(res.message || 'Lưu trường thất bại');
            console.log('[thamSoApi] saveDynamicField:', res.item.id);
            return protoFieldToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveDynamicField error:', err);
            throw err;
        }
    },

    async deleteDynamicField(id: string): Promise<boolean> {
        try {
            const request = create(DeleteDynamicFieldRequestSchema, { id });
            const res = await thamSoClient.deleteDynamicField(request);
            console.log('[thamSoApi] deleteDynamicField:', res.success);
            return res.success;
        } catch (err) {
            console.error('[thamSoApi] deleteDynamicField error:', err);
            throw err;
        }
    },

    // ── FieldSet ──────────────────────────────────────────────
    async getListFieldSets(): Promise<LocalFieldSet[]> {
        try {
            const request = create(GetListFieldSetsRequestSchema, {});
            const res = await thamSoClient.getListFieldSets(request);
            console.log('[thamSoApi] getListFieldSets:', res.items.length);
            return res.items.map(protoSetToLocal);
        } catch (err) {
            console.error('[thamSoApi] getListFieldSets error:', err);
            throw err;
        }
    },

    async saveFieldSet(fieldSet: LocalFieldSet, isNew: boolean, allFields?: LocalDynamicField[]): Promise<LocalFieldSet> {
        try {
            const request = create(SaveFieldSetRequestSchema, {
                isNew,
                item: localSetToProto(fieldSet, allFields),
            });
            const res = await thamSoClient.saveFieldSet(request);
            if (!res.success || !res.item) throw new Error(res.message || 'Lưu bộ dữ liệu thất bại');
            console.log('[thamSoApi] saveFieldSet:', res.item.id);
            return protoSetToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveFieldSet error:', err);
            throw err;
        }
    },

    async deleteFieldSet(id: string): Promise<boolean> {
        try {
            const request = create(DeleteFieldSetRequestSchema, { id });
            const res = await thamSoClient.deleteFieldSet(request);
            console.log('[thamSoApi] deleteFieldSet:', res.success);
            return res.success;
        } catch (err) {
            console.error('[thamSoApi] deleteFieldSet error:', err);
            throw err;
        }
    },

    // ── FormConfig ────────────────────────────────────────────
    async getListFormConfigs(): Promise<LocalFormConfig[]> {
        try {
            const request = create(GetListFormConfigsRequestSchema, {});
            const res = await thamSoClient.getListFormConfigs(request);
            console.log('[thamSoApi] getListFormConfigs:', res.items.length);
            return res.items.map(protoFormToLocal);
        } catch (err) {
            console.error('[thamSoApi] getListFormConfigs error:', err);
            throw err;
        }
    },

    async saveFormConfig(form: LocalFormConfig, isNew: boolean, allFieldSets?: LocalFieldSet[], allFields?: LocalDynamicField[]): Promise<LocalFormConfig> {
        try {
            const request = create(SaveFormConfigRequestSchema, {
                isNew,
                item: localFormToProto(form, allFieldSets, allFields),
            });
            const res = await thamSoClient.saveFormConfig(request);
            if (!res.success || !res.item) throw new Error(res.message || 'Lưu form thất bại');
            console.log('[thamSoApi] saveFormConfig:', res.item.id);
            return protoFormToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveFormConfig error:', err);
            throw err;
        }
    },

    async deleteFormConfig(id: string): Promise<boolean> {
        try {
            const request = create(DeleteFormConfigRequestSchema, { id });
            const res = await thamSoClient.deleteFormConfig(request);
            console.log('[thamSoApi] deleteFormConfig:', res.success);
            return res.success;
        } catch (err) {
            console.error('[thamSoApi] deleteFormConfig error:', err);
            throw err;
        }
    },

    // ── DynamicMenu ────────────────────────────────────────────
    async getListDynamicMenus(): Promise<LocalDynamicMenu[]> {
        try {
            const request = create(GetListDynamicMenusRequestSchema, {});
            const res = await thamSoClient.getListDynamicMenus(request);
            console.log('[thamSoApi] getListDynamicMenus:', res.items.length);
            return res.items.map(protoDynamicMenuToLocal);
        } catch (err) {
            console.error('[thamSoApi] getListDynamicMenus error:', err);
            throw err;
        }
    },

    async saveDynamicMenu(item: LocalDynamicMenu, isNew: boolean): Promise<LocalDynamicMenu> {
        try {
            const request = create(SaveDynamicMenuRequestSchema, {
                isNew,
                item: localDynamicMenuToProto(item),
            });
            const res = await thamSoClient.saveDynamicMenu(request);
            if (!res.success || !res.item) throw new Error(res.message || 'Lưu menu động thất bại');
            console.log('[thamSoApi] saveDynamicMenu:', res.item.id);
            return protoDynamicMenuToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveDynamicMenu error:', err);
            throw err;
        }
    },

    async deleteDynamicMenu(id: string): Promise<boolean> {
        try {
            const request = create(DeleteDynamicMenuRequestSchema, { id });
            const res = await thamSoClient.deleteDynamicMenu(request);
            console.log('[thamSoApi] deleteDynamicMenu:', res.success);
            return res.success;
        } catch (err) {
            console.error('[thamSoApi] deleteDynamicMenu error:', err);
            throw err;
        }
    },

    async getDynamicMenuRows(sourceKey: string, limit = 500): Promise<Record<string, unknown>[]> {
        try {
            const request = create(GetDynamicMenuRowsRequestSchema, { sourceKey, limit });
            const res = await thamSoClient.getDynamicMenuRows(request);
            if (!res.success) {
                throw new Error(res.message || 'Không thể tải dữ liệu menu động');
            }

            const rows: Record<string, unknown>[] = [];
            for (const rowJson of res.rowsJson) {
                try {
                    const parsed = JSON.parse(rowJson) as Record<string, unknown>;
                    rows.push(parsed);
                } catch {
                    // Bỏ qua row lỗi parse để không làm fail toàn bộ màn hình.
                }
            }
            return rows;
        } catch (err) {
            console.error('[thamSoApi] getDynamicMenuRows error:', err);
            throw err;
        }
    },

    async getListDynamicMenuDataSources(): Promise<LocalDynamicMenuDataSource[]> {
        try {
        const request = create(GetListDynamicMenuDataSourcesRequestSchema, {});
        const res = await thamSoClient.getListDynamicMenuDataSources(request);
        
        
        console.log('[API] raw items count:', res.items.length);
        res.items.forEach(item => {
            console.log(`[API] source=${item.sourceKey}, fields.length=${item.fields.length}`, item.fields);
        });
        
        return res.items.map(protoDynamicMenuDataSourceToLocal);
    } catch (err) {
        console.error('[thamSoApi] getListDynamicMenuDataSources error:', err);
        throw err;
    }
    },

    async saveDynamicMenuDataSource(item: LocalDynamicMenuDataSource, isNew: boolean): Promise<LocalDynamicMenuDataSource> {
        try {
            const request = create(SaveDynamicMenuDataSourceRequestSchema, {
                isNew,
                item: localDynamicMenuDataSourceToProto(item),
            });
            const res = await thamSoClient.saveDynamicMenuDataSource(request);
            if (!res.success || !res.item) throw new Error(res.message || 'Lưu datasource menu động thất bại');
            return protoDynamicMenuDataSourceToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveDynamicMenuDataSource error:', err);
            throw err;
        }
    },

    async deleteDynamicMenuDataSource(id: string): Promise<boolean> {
        try {
            const request = create(DeleteDynamicMenuDataSourceRequestSchema, { id });
            const res = await thamSoClient.deleteDynamicMenuDataSource(request);
            return res.success;
        } catch (err) {
            console.error('[thamSoApi] deleteDynamicMenuDataSource error:', err);
            throw err;
        }
    },

    /**
     * Đồng bộ schema fields từ proto Reflection vào registry MongoDB.
     * - sourceKey rỗng: sync tất cả (employee + office + ...)
     * - có sourceKey: chỉ sync source đó
     */
    async syncDynamicMenuDataSourcesFromProto(sourceKey = ''): Promise<LocalDynamicMenuDataSource[]> {
        try {
            const request = create(SyncDynamicMenuDataSourcesFromProtoRequestSchema, { sourceKey });
            const res = await thamSoClient.syncDynamicMenuDataSourcesFromProto(request);
            if (!res.success) throw new Error(res.message || 'Đồng bộ từ proto thất bại');
            return res.items.map(protoDynamicMenuDataSourceToLocal);
        } catch (err) {
            console.error('[thamSoApi] syncDynamicMenuDataSourcesFromProto error:', err);
            throw err;
        }
    },
    
    async discoverCollectionFields(collectionName: string): Promise<{
        fields: LocalDynamicMenuDataSourceField[];
        documentsScanned: number;
        message: string;
    }> {
        try {
            const request = create(DiscoverCollectionFieldsRequestSchema, { collectionName });
            const res = await thamSoClient.discoverCollectionFields(request);
            if (!res.success) throw new Error(res.message || 'Kh\u00f4ng th\u1ec3 kh\u00e1m ph\u00e1 collection');
            return {
                fields: res.fields.map((f) => ({ key: f.key, label: f.label, dataType: f.dataType })),
                documentsScanned: res.documentsScanned,
                message: res.message,
            };
        } catch (err) {
            console.error('[thamSoApi] discoverCollectionFields error:', err);
            throw err;
        }
    },};

export default thamSoApi;
