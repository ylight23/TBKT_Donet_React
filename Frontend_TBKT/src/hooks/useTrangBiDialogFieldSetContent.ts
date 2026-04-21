import { useCallback, useMemo } from 'react';
import type {
    LocalDynamicField as DynamicField,
    LocalFieldSet as FieldSet,
} from '../types/thamSo';
import { TRANG_BI_FIELD_SET_KEYS } from '../constants/fieldSetKeys';
import type { FieldSetsByKeyMap } from './useTrangBiDialogSchema';
import { DANH_MUC_TRANG_BI_TREE_ENDPOINT } from '../apis/danhMucTrangBiApi';

export interface TrangBiDialogFieldSetContentItem {
    fieldSet: FieldSet;
    fields: DynamicField[];
}

interface UseTrangBiDialogFieldSetContentOptions {
    fieldSetsByKey: FieldSetsByKeyMap;
    technicalFieldSets: FieldSet[];
    categoryFieldKey: string;
    resolvedCategoryNameKey: string;
    parentFieldKey: string;
    specializationFieldKey: string;
    nganhFieldKey: string;
}

interface UseTrangBiDialogFieldSetContentResult {
    generalTabContent: TrangBiDialogFieldSetContentItem[];
    technicalTabContent: TrangBiDialogFieldSetContentItem[];
    syncTabContent: TrangBiDialogFieldSetContentItem[];
    baoQuanTabContent: TrangBiDialogFieldSetContentItem[];
    baoDuongTabContent: TrangBiDialogFieldSetContentItem[];
    suaChuaTabContent: TrangBiDialogFieldSetContentItem[];
    niemCatTabContent: TrangBiDialogFieldSetContentItem[];
    dieuDongTabContent: TrangBiDialogFieldSetContentItem[];
}

export default function useTrangBiDialogFieldSetContent({
    fieldSetsByKey,
    technicalFieldSets,
    categoryFieldKey,
    resolvedCategoryNameKey,
    parentFieldKey,
    specializationFieldKey,
    nganhFieldKey,
}: UseTrangBiDialogFieldSetContentOptions): UseTrangBiDialogFieldSetContentResult {
    const applyFieldOverrides = useCallback((fields: DynamicField[]): DynamicField[] => {
        return fields.map((field) => {
            if (
                field.key === parentFieldKey
                || field.key === specializationFieldKey
                || field.key === nganhFieldKey
                || field.key === resolvedCategoryNameKey
            ) {
                return { ...field, disabled: true };
            }

            if (field.key === categoryFieldKey) {
                return {
                    ...field,
                    type: 'select',
                    validation: {
                        ...field.validation,
                        dataSource: 'api',
                        apiUrl: DANH_MUC_TRANG_BI_TREE_ENDPOINT,
                        displayType: 'tree',
                    },
                };
            }

            return { ...field };
        });
    }, [categoryFieldKey, nganhFieldKey, parentFieldKey, resolvedCategoryNameKey, specializationFieldKey]);

    const mapFieldSetsToContent = useCallback((fieldSets: FieldSet[]) => (
        fieldSets.map((fs) => ({ fieldSet: fs, fields: applyFieldOverrides(fs.fields ?? []) }))
    ), [applyFieldOverrides]);

    const getRuntimeFieldSets = useCallback((key: keyof FieldSetsByKeyMap): FieldSet[] => {
        return fieldSetsByKey[key] ?? [];
    }, [fieldSetsByKey]);

    return useMemo(() => ({
        generalTabContent: mapFieldSetsToContent(getRuntimeFieldSets(TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG)),
        technicalTabContent: mapFieldSetsToContent(technicalFieldSets),
        syncTabContent: mapFieldSetsToContent(getRuntimeFieldSets(TRANG_BI_FIELD_SET_KEYS.DONG_BO)),
        baoQuanTabContent: mapFieldSetsToContent(getRuntimeFieldSets(TRANG_BI_FIELD_SET_KEYS.BAO_QUAN)),
        baoDuongTabContent: mapFieldSetsToContent(getRuntimeFieldSets(TRANG_BI_FIELD_SET_KEYS.BAO_DUONG)),
        suaChuaTabContent: mapFieldSetsToContent(getRuntimeFieldSets(TRANG_BI_FIELD_SET_KEYS.SUA_CHUA)),
        niemCatTabContent: mapFieldSetsToContent(getRuntimeFieldSets(TRANG_BI_FIELD_SET_KEYS.NIEM_CAT)),
        dieuDongTabContent: mapFieldSetsToContent(getRuntimeFieldSets(TRANG_BI_FIELD_SET_KEYS.DIEU_DONG)),
    }), [getRuntimeFieldSets, mapFieldSetsToContent, technicalFieldSets]);
}
