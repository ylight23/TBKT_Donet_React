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
} from '../grpc/generated/ThamSo_pb';

import type {
    DynamicField as DynamicFieldProto,
    FieldSet as FieldSetProto,
    FormConfig as FormConfigProto,
    FieldValidation as FieldValidationProto,
    FormTabConfig as FormTabConfigProto,
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
        fieldIds: s.fields.map(f => f.id),
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

function localFormToProto(fc: LocalFormConfig): any {
    return create(FormConfigSchema, {
        id: fc.id,
        name: fc.name,
        desc: fc.desc || '',
        tabs: fc.tabs.map((t) =>
            create(FormTabConfigSchema, {
                id: t.id,
                label: t.label,
                fieldSets: t.setIds.map(id => create(FieldSetSchema, { id })),
            }),
        ),
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

    async saveFormConfig(form: LocalFormConfig, isNew: boolean): Promise<LocalFormConfig> {
        try {
            const request = create(SaveFormConfigRequestSchema, {
                isNew,
                item: localFormToProto(form),
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
};

export default thamSoApi;
