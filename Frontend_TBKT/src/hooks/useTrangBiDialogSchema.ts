import { useCallback, useEffect, useRef, useState } from 'react';
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

    const technicalFetchRef = useRef(0);

    const loadPreloadedSchemas = useCallback(async () => {
        const [fieldSetsByKeys, fields] = await Promise.all([
            thamSoApi.getFieldSetsByKeys([...PRELOADED_TRANG_BI_FIELDSET_KEYS], { forceRefresh: true }),
            thamSoApi.getListDynamicFields({ forceRefresh: true }),
        ]);

        return {
            fieldSetsByKey: fieldSetsByKeys as FieldSetsByKeyMap,
            fields,
        };
    }, []);

    const loadTechnicalSchemas = useCallback(async (maDanhMuc: string, fetchId: number) => {
        try {
            const fieldSets = await danhMucTrangBiApi.getFieldSetsByMaDanhMuc(maDanhMuc);
            if (technicalFetchRef.current !== fetchId) return;
            setTechnicalFieldSets(fieldSets);
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
            })
            .catch((err) => {
                if (cancelled) return;
                setSchemaError((err as Error)?.message || 'Khong the tai cau hinh truong du lieu.');
            })
            .finally(() => {
                if (!cancelled) setSchemaLoading(false);
            });

        return () => { cancelled = true; };
    }, [loadPreloadedSchemas, open]);

    useEffect(() => {
        if (open) {
            setFieldSetsByKey({});
            setAllFields([]);
            setSchemaLoading(false);
            setSchemaError('');
            setTechnicalFieldSets([]);
            setTechnicalLoading(false);
            setTechnicalError('');
            technicalFetchRef.current += 1;
        }
    }, [open]);

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
