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
    GetListTemplateLayoutsRequestSchema,
    SaveTemplateLayoutRequestSchema,
    DeleteTemplateLayoutRequestSchema,
    TemplateLayoutSchema,
    GetListDynamicMenuDataSourcesRequestSchema,
    SaveDynamicMenuDataSourceRequestSchema,
    DeleteDynamicMenuDataSourceRequestSchema,
    DynamicMenuDataSourceSchema,
    DynamicMenuDataSourceFieldSchema,
    SyncDynamicMenuDataSourcesFromProtoRequestSchema,
    DiscoverCollectionFieldsRequestSchema,
    ColumnConfigSchema,
} from '../grpc/generated/ThamSo_pb';

import type {
    DynamicField as DynamicFieldProto,
    FieldSet as FieldSetProto,
    FormConfig as FormConfigProto,
    FieldValidation as FieldValidationProto,
    FormTabConfig as FormTabConfigProto,
    DynamicMenu as DynamicMenuProto,
    DynamicMenuDataSource as DynamicMenuDataSourceProto,
    TemplateLayout as TemplateLayoutProto,
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
    columns: Array<{ key: string; name: string }>;
    templateKey: string;
    enabled: boolean;
}

export interface DataSourceField {
    key: string;
    label: string;
    dataType: string;
}

/** @deprecated Use DataSourceField */
export type LocalDynamicMenuDataSourceField = DataSourceField;

export interface DataSourceConfig {
    id: string;
    sourceKey: string;
    sourceName: string;
    collectionName: string;
    fields: DataSourceField[];
    enabled: boolean;
}

/** @deprecated Use DataSourceConfig */
export type LocalDynamicMenuDataSource = DataSourceConfig;

export interface LocalTemplateLayout {
    id: string;
    key: string;
    name: string;
    schemaJson: string;
    published: boolean;
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
    return {
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        desc: s.desc,
        fieldIds: [...s.fieldIds],
    };
}

function localSetToProto(s: LocalFieldSet): any {
    return create(FieldSetSchema, {
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        desc: s.desc || '',
        fieldIds: s.fieldIds,
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
            setIds: [...t.fieldSetIds],
        })),
    };
}

function localFormToProto(fc: LocalFormConfig): any {
    return create(FormConfigSchema, {
        id: fc.id,
        name: fc.name,
        desc: fc.desc || '',
        tabs: fc.tabs.map((t) =>
            create(FormTabConfigSchema, {
                id: t.id,
                label: t.label,
                fieldSetIds: t.setIds,
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
        columns: item.columns?.map(c => ({ key: c.key, name: c.name })) ?? [],
        templateKey: item.templateKey || '',
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
        columns: (item.columns ?? []).map(c => create(ColumnConfigSchema, { key: c.key, name: c.name })),
        templateKey: item.templateKey || '',
        enabled: item.enabled,
    });
}

function protoDynamicMenuDataSourceToLocal(item: DynamicMenuDataSourceProto): DataSourceConfig {
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

function protoTemplateLayoutToLocal(item: TemplateLayoutProto): LocalTemplateLayout {
    return {
        id: item.id,
        key: item.key,
        name: item.name,
        schemaJson: item.schemaJson || '{}',
        published: item.published,
    };
}

function localTemplateLayoutToProto(item: LocalTemplateLayout): any {
    return create(TemplateLayoutSchema, {
        id: item.id,
        key: item.key,
        name: item.name,
        schemaJson: item.schemaJson || '{}',
        published: item.published,
    });
}

function localDynamicMenuDataSourceToProto(item: DataSourceConfig): any {
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
            const proto = localFieldToProto(field);
            if (isNew) proto.id = '';
            const request = create(SaveDynamicFieldRequestSchema, {
                item: proto,
            });
            const res = await thamSoClient.saveDynamicField(request);
            if (!res.meta?.success || !res.item) throw new Error(res.meta?.message || 'Lưu trường thất bại');
            console.log('[thamSoApi] saveDynamicField:', res.item.id);
            return protoFieldToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveDynamicField error:', err);
            throw err;
        }
    },

    async deleteDynamicField(id: string): Promise<boolean> {
        try {
            const request = create(DeleteDynamicFieldRequestSchema, { ids: [id] });
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

    async saveFieldSet(fieldSet: LocalFieldSet, isNew: boolean): Promise<LocalFieldSet> {
        try {
            const proto = localSetToProto(fieldSet);
            if (isNew) proto.id = '';
            const request = create(SaveFieldSetRequestSchema, {
                item: proto,
            });
            const res = await thamSoClient.saveFieldSet(request);
            if (!res.meta?.success || !res.item) throw new Error(res.meta?.message || 'Lưu bộ dữ liệu thất bại');
            console.log('[thamSoApi] saveFieldSet:', res.item.id);
            return protoSetToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveFieldSet error:', err);
            throw err;
        }
    },

    async deleteFieldSet(id: string): Promise<boolean> {
        try {
            const request = create(DeleteFieldSetRequestSchema, { ids: [id] });
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

    async saveFormConfig(form: LocalFormConfig, isNew: boolean): Promise<LocalFormConfig> {
        try {
            const proto = localFormToProto(form);
            if (isNew) proto.id = '';
            const request = create(SaveFormConfigRequestSchema, {
                item: proto,
            });
            const res = await thamSoClient.saveFormConfig(request);
            if (!res.meta?.success || !res.item) throw new Error(res.meta?.message || 'Lưu form thất bại');
            console.log('[thamSoApi] saveFormConfig:', res.item.id);
            return protoFormToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveFormConfig error:', err);
            throw err;
        }
    },

    async deleteFormConfig(id: string): Promise<boolean> {
        try {
            const request = create(DeleteFormConfigRequestSchema, { ids: [id] });
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
            const proto = localDynamicMenuToProto(item);
            if (isNew) proto.id = '';
            const request = create(SaveDynamicMenuRequestSchema, {
                item: proto,
            });
            const res = await thamSoClient.saveDynamicMenu(request);
            if (!res.meta?.success || !res.item) throw new Error(res.meta?.message || 'Lưu menu động thất bại');
            console.log('[thamSoApi] saveDynamicMenu:', res.item.id);
            return protoDynamicMenuToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveDynamicMenu error:', err);
            throw err;
        }
    },

    async deleteDynamicMenu(id: string): Promise<boolean> {
        try {
            const request = create(DeleteDynamicMenuRequestSchema, { ids: [id] });
            const res = await thamSoClient.deleteDynamicMenu(request);
            console.log('[thamSoApi] deleteDynamicMenu:', res.success);
            return res.success;
        } catch (err) {
            console.error('[thamSoApi] deleteDynamicMenu error:', err);
            throw err;
        }
    },

    // ── Puck Template Layout ─────────────────────────────────
    async getListTemplateLayouts(): Promise<LocalTemplateLayout[]> {
        try {
            const request = create(GetListTemplateLayoutsRequestSchema, {});
            const res = await thamSoClient.getListTemplateLayouts(request);
            return res.items.map(protoTemplateLayoutToLocal);
        } catch (err) {
            console.error('[thamSoApi] getListTemplateLayouts error:', err);
            throw err;
        }
    },

    async saveTemplateLayout(item: LocalTemplateLayout, isNew: boolean): Promise<LocalTemplateLayout> {
        try {
            const proto = localTemplateLayoutToProto(item);
            if (isNew) proto.id = '';
            const request = create(SaveTemplateLayoutRequestSchema, {
                item: proto,
            });
            const res = await thamSoClient.saveTemplateLayout(request);
            if (!res.meta?.success || !res.item) throw new Error(res.meta?.message || 'Lưu template thất bại');
            return protoTemplateLayoutToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveTemplateLayout error:', err);
            throw err;
        }
    },

    async deleteTemplateLayout(id: string): Promise<boolean> {
        try {
            const request = create(DeleteTemplateLayoutRequestSchema, { ids: [id] });
            const res = await thamSoClient.deleteTemplateLayout(request);
            return res.success;
        } catch (err) {
            console.error('[thamSoApi] deleteTemplateLayout error:', err);
            throw err;
        }
    },

    /** Gọi .NET backend ghi 1 file JSON vào public/templates/{key}.json */
    async exportTemplateToServer(item: LocalTemplateLayout): Promise<void> {
        const res = await fetch('/api/export-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: item.key, name: item.name, schemaJson: item.schemaJson }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error((err as any).message || 'Export thất bại');
        }
    },

    /** Gọi .NET backend ghi tất cả published templates cùng 1 request */
    async exportAllTemplatesToServer(items: LocalTemplateLayout[]): Promise<{ saved: string[]; errors: string[] }> {
        const published = items.filter((t) => t.published);
        const res = await fetch('/api/export-template/all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(published.map((t) => ({ key: t.key, name: t.name, schemaJson: t.schemaJson }))),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error((err as any).message || 'Export tất cả thất bại');
        }
        return res.json();
    },

    /** Xoá file JSON tĩnh tại public/templates/{key}.json */
    async deleteTemplateFile(key: string): Promise<void> {
        const res = await fetch(`/api/export-template/${encodeURIComponent(key)}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error((err as any).message || 'Xoá file thất bại');
        }
    },

    async getDynamicMenuRows(sourceKey: string, limit = 500): Promise<Record<string, unknown>[]> {
        try {
            const request = create(GetDynamicMenuRowsRequestSchema, { sourceKey, limit });
            const res = await thamSoClient.getDynamicMenuRows(request);
            return res.rows as Record<string, unknown>[];
        } catch (err) {
            console.error('[thamSoApi] getDynamicMenuRows error:', err);
            throw err;
        }
    },

    async getListDynamicMenuDataSources(): Promise<DataSourceConfig[]> {
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

    async saveDynamicMenuDataSource(item: DataSourceConfig, isNew: boolean): Promise<DataSourceConfig> {
        try {
            const proto = localDynamicMenuDataSourceToProto(item);
            if (isNew) proto.id = '';
            const request = create(SaveDynamicMenuDataSourceRequestSchema, {
                item: proto,
            });
            const res = await thamSoClient.saveDynamicMenuDataSource(request);
            if (!res.meta?.success || !res.item) throw new Error(res.meta?.message || 'Lưu datasource menu động thất bại');
            return protoDynamicMenuDataSourceToLocal(res.item);
        } catch (err) {
            console.error('[thamSoApi] saveDynamicMenuDataSource error:', err);
            throw err;
        }
    },

    async deleteDynamicMenuDataSource(id: string): Promise<boolean> {
        try {
            const request = create(DeleteDynamicMenuDataSourceRequestSchema, { ids: [id] });
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
    async syncDynamicMenuDataSourcesFromProto(sourceKey = ''): Promise<DataSourceConfig[]> {
        try {
            const request = create(SyncDynamicMenuDataSourcesFromProtoRequestSchema, { sourceKey });
            const res = await thamSoClient.syncDynamicMenuDataSourcesFromProto(request);
            if (!res.meta?.success) throw new Error(res.meta?.message || 'Đồng bộ từ proto thất bại');
            return res.items.map(protoDynamicMenuDataSourceToLocal);
        } catch (err) {
            console.error('[thamSoApi] syncDynamicMenuDataSourcesFromProto error:', err);
            throw err;
        }
    },

    async discoverCollectionFields(collectionName: string): Promise<{
        fields: DataSourceField[];
        documentsScanned: number;
        message: string;
    }> {
        try {
            const request = create(DiscoverCollectionFieldsRequestSchema, { collectionName });
            const res = await thamSoClient.discoverCollectionFields(request);
            if (!res.meta?.success) throw new Error(res.meta?.message || 'Không thể khám phá collection');
            return {
                fields: res.fields.map((f) => ({ key: f.key, label: f.label, dataType: f.dataType })),
                documentsScanned: res.documentsScanned,
                message: res.meta.message,
            };
        } catch (err) {
            console.error('[thamSoApi] discoverCollectionFields error:', err);
            throw err;
        }
    },
};

export default thamSoApi;
