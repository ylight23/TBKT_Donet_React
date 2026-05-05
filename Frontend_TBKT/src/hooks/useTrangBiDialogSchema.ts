import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import thamSoApi from '../apis/thamSoApi';
import danhMucTrangBiApi from '../apis/danhMucTrangBiApi';
import { TRANG_BI_FIELD_SET_KEYS } from '../constants/fieldSetKeys';
import type {
    LocalDynamicField as DynamicField,
    LocalFieldSet as FieldSet,
} from '../types/thamSo';

export const PRELOADED_TRANG_BI_FIELDSET_KEYS = [
    TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG,
    TRANG_BI_FIELD_SET_KEYS.DONG_BO,
    TRANG_BI_FIELD_SET_KEYS.BAO_QUAN,
    TRANG_BI_FIELD_SET_KEYS.BAO_DUONG,
    TRANG_BI_FIELD_SET_KEYS.SUA_CHUA,
    TRANG_BI_FIELD_SET_KEYS.NIEM_CAT,
    TRANG_BI_FIELD_SET_KEYS.DIEU_DONG,
] as const;

export type TrangBiDialogSchemaKey = (typeof PRELOADED_TRANG_BI_FIELDSET_KEYS)[number];
export type FieldSetsByKeyMap = Partial<Record<TrangBiDialogSchemaKey, FieldSet[]>>;

interface UseTrangBiDialogSchemaOptions {
    open: boolean;
    selectedCategoryCode?: string;
}

interface UseTrangBiDialogSchemaResult {
    fieldSetsByKey: FieldSetsByKeyMap;
    allFields: DynamicField[];
    schemaLoading: boolean;
    schemaError: string;
    technicalFieldSets: FieldSet[];
    technicalLoading: boolean;
    technicalError: string;
}

export default function useTrangBiDialogSchema({
    open,
    selectedCategoryCode,
}: UseTrangBiDialogSchemaOptions): UseTrangBiDialogSchemaResult {
    const [fieldSetsByKey, setFieldSetsByKey] = useState<FieldSetsByKeyMap>({});
    const [allFields, setAllFields] = useState<DynamicField[]>([]);
    const [schemaLoading, setSchemaLoading] = useState(false);
    const [schemaError, setSchemaError] = useState('');

    const [technicalFieldSets, setTechnicalFieldSets] = useState<FieldSet[]>([]);
    const [technicalLoading, setTechnicalLoading] = useState(false);
    const [technicalError, setTechnicalError] = useState('');

    const selectedCategoryRef = useRef('');
    const generalFetchRef = useRef(0);
    const technicalFetchRef = useRef(0);

    useEffect(() => {
        selectedCategoryRef.current = String(selectedCategoryCode ?? '').trim();
    }, [selectedCategoryCode]);

    const isBaseGeneralFieldSet = (fieldSet: FieldSet): boolean => (
        String(fieldSet.key ?? '').trim() === TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG
        && String(fieldSet.name ?? '').trim().toLowerCase() === 'thong tin chung'
    );

    const loadPreloadedSchemas = useCallback(async () => {
        const [fieldSetsByKeys, fields] = await Promise.all([
            thamSoApi.getFieldSetsByKeys([...PRELOADED_TRANG_BI_FIELDSET_KEYS], { forceRefresh: true }),
            thamSoApi.getListDynamicFields({ forceRefresh: true }),
        ]);
        const nextFieldSetsByKey = fieldSetsByKeys as FieldSetsByKeyMap;

        return {
            fieldSetsByKey: {
                ...nextFieldSetsByKey,
                [TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG]: (
                    nextFieldSetsByKey[TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG] ?? []
                ).filter(isBaseGeneralFieldSet),
            } as FieldSetsByKeyMap,
            fields,
        };
    }, []);

    const loadTechnicalSchemas = useCallback(async (maDanhMuc: string, fetchId: number) => {
        try {
            const fieldSets = await danhMucTrangBiApi.getFieldSetsByMaDanhMuc(maDanhMuc);
            if (technicalFetchRef.current !== fetchId) return;
            setTechnicalFieldSets(fieldSets.filter((fieldSet) => (
                String(fieldSet.key ?? '').trim() !== TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG
            )));
        } catch (err) {
            if (technicalFetchRef.current !== fetchId) return;
            console.error('[useTrangBiDialogSchema] fetchTechnicalFieldSets error', err);
            setTechnicalError(String((err as Error)?.message || 'Khong tai duoc thong so ky thuat'));
        } finally {
            if (technicalFetchRef.current === fetchId) {
                setTechnicalLoading(false);
            }
        }
    }, []);

    const isAncestorCategoryMatch = (selectedCategory: string, fieldSetCategory: string): boolean => {
        const selected = selectedCategory.trim().toLowerCase();
        const owner = fieldSetCategory.trim().toLowerCase();
        if (!selected || !owner) return false;
        return selected === owner || selected.startsWith(owner);
    };

    const getGeneralFieldSetsByCategory = useCallback((fieldSets: FieldSet[], maDanhMuc: string): FieldSet[] => {
        const ranked = fieldSets
            .filter((fieldSet) => (
                String(fieldSet.key ?? '').trim() === TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG
            ))
            .map((fieldSet, originalIndex) => {
                const specificity = Math.max(
                    0,
                    ...(fieldSet.maDanhMucTrangBi ?? [])
                        .filter((category) => isAncestorCategoryMatch(maDanhMuc, category))
                        .map((category) => category.trim().length),
                );

                return { fieldSet, specificity, originalIndex };
            })
            .filter((item) => item.specificity > 0 || (item.fieldSet.maDanhMucTrangBi ?? []).length === 0);

        return ranked
            .sort((a, b) => {
                const aIsBase = String(a.fieldSet.name ?? '').trim().toLowerCase() === 'thong tin chung';
                const bIsBase = String(b.fieldSet.name ?? '').trim().toLowerCase() === 'thong tin chung';
                if (aIsBase !== bIsBase) return aIsBase ? -1 : 1;
                return a.specificity - b.specificity || a.originalIndex - b.originalIndex;
            })
            .map((item) => item.fieldSet);
    }, []);

    const loadGeneralSchemasByCategory = useCallback(async (maDanhMuc: string, fetchId: number) => {
        try {
            const fieldSets = await danhMucTrangBiApi.getFieldSetsByMaDanhMuc(maDanhMuc);
            if (generalFetchRef.current !== fetchId) return;

            const generalFieldSets = getGeneralFieldSetsByCategory(fieldSets, maDanhMuc);
            if (generalFieldSets.length === 0) return;

            setFieldSetsByKey((prev) => ({
                ...prev,
                [TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG]: generalFieldSets,
            }));
        } catch (err) {
            if (generalFetchRef.current !== fetchId) return;
            console.error('[useTrangBiDialogSchema] fetchGeneralFieldSetsByCategory error', err);
        }
    }, [getGeneralFieldSetsByCategory]);

    useLayoutEffect(() => {
        if (!open) return;

        setFieldSetsByKey({});
        setAllFields([]);
        setSchemaLoading(true);
        setSchemaError('');
        setTechnicalFieldSets([]);
        setTechnicalLoading(false);
        setTechnicalError('');
        generalFetchRef.current += 1;
        technicalFetchRef.current += 1;
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const maDanhMuc = String(selectedCategoryCode ?? '').trim();
        if (!maDanhMuc) return;

        const fetchId = ++generalFetchRef.current;
        void loadGeneralSchemasByCategory(maDanhMuc, fetchId);
    }, [loadGeneralSchemasByCategory, open, selectedCategoryCode]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        setSchemaLoading(true);
        setSchemaError('');
        loadPreloadedSchemas()
            .then(({ fieldSetsByKey: nextFieldSetsByKey, fields }) => {
                if (cancelled) return;
                setFieldSetsByKey(nextFieldSetsByKey);
                setAllFields(fields);

                const maDanhMuc = selectedCategoryRef.current;
                if (maDanhMuc) {
                    const fetchId = ++generalFetchRef.current;
                    void loadGeneralSchemasByCategory(maDanhMuc, fetchId);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setSchemaError((err as Error)?.message || 'Khong the tai cau hinh truong du lieu.');
            })
            .finally(() => {
                if (!cancelled) setSchemaLoading(false);
            });

        return () => { cancelled = true; };
    }, [loadGeneralSchemasByCategory, loadPreloadedSchemas, open]);

    useEffect(() => {
        if (!open) return;

        const maDanhMuc = String(selectedCategoryCode ?? '').trim();
        if (!maDanhMuc) {
            setTechnicalFieldSets([]);
            setTechnicalError('');
            setTechnicalLoading(false);
            return;
        }

        const fetchId = ++technicalFetchRef.current;
        setTechnicalLoading(true);
        setTechnicalError('');
        void loadTechnicalSchemas(maDanhMuc, fetchId);
    }, [loadTechnicalSchemas, open, selectedCategoryCode]);

    return {
        fieldSetsByKey,
        allFields,
        schemaLoading,
        schemaError,
        technicalFieldSets,
        technicalLoading,
        technicalError,
    };
}
