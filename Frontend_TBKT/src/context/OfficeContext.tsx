import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme } from '@mui/material/styles';

import { tokens } from '../theme';
import { fetchOffice, create, update, deleteApi } from '../store/reducer/office';
import officeApi from '../apis/officeApi';
import { AppDispatch } from '../store';
import { OfficeNode, OfficeDictionaryRef } from '../pages/Office/subComponent/OfficeDictionary';
import type { Office } from '../grpc/generated/Office_pb';

// ── Types ──────────────────────────────────────────────────────────────────────

interface OfficeReduxState {
    officeApi: OfficeNode[];
}

// ── State Interface ────────────────────────────────────────────────────────────

interface OfficeStateValue {
    selectedOffice:  OfficeNode | null;
    allOffices:      OfficeNode[];
    isTreeEmpty:     boolean;
    loading:         boolean;          // ← thêm vào interface
}

// ── Actions Interface (UI không biết Redux) ────────────────────────────────────

interface OfficeActionsValue {
    selectOffice:    (office: OfficeNode) => void;
    createOffice:    (data: Partial<Office>) => Promise<void>;
    updateOffice:    (data: Partial<Office> & { id: string }) => Promise<void>;
    deleteOffice:    (id: string, parentId?: string | null) => Promise<void>;
    refreshTree:     (parentId?: string | number | null) => void;
    refreshNode:     (nodeId: string | number) => Promise<void>;
    importOffices:   (excelData: Record<string, unknown>[]) => Promise<{
        success: boolean;
        message: string;
        details?: { succeeded: number; failed: number; total: number };
    }>;
    onImportSuccess: () => Promise<void>;
}

// ── Meta Interface ─────────────────────────────────────────────────────────────

interface OfficeMetaValue {
    treeRef:             React.RefObject<OfficeDictionaryRef | null>;
    colors:              any;
    officeColumnMapping: Record<string, string>;
}

// ── Module-level init guard (Rule: init-once) ──────────────────────────────────
let didInitOffice = false;

// ── Context Value ──────────────────────────────────────────────────────────────

interface OfficeContextValue {
    state:   OfficeStateValue;
    actions: OfficeActionsValue;
    meta:    OfficeMetaValue;
}

// ── Context ────────────────────────────────────────────────────────────────────

const OfficeContext = createContext<OfficeContextValue | null>(null);

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useOffice = (): OfficeContextValue => {
    const ctx = useContext(OfficeContext);
    if (!ctx) throw new Error('useOffice must be used within OfficeProvider');
    return ctx;
};

// ── Provider ───────────────────────────────────────────────────────────────────

export const OfficeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme    = useTheme();
    const colors   = tokens(theme.palette.mode);
    const dispatch = useDispatch<AppDispatch>();

    const { officeApi: allOfficesRaw } = useSelector(
        (s: { officeReducer: OfficeReduxState }) => s.officeReducer
    );
    const allOffices = allOfficesRaw || [];

    const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);
    const [loading, setLoading] = useState(true);   // ← thêm state

    const treeRef = useRef<OfficeDictionaryRef>(null);

    // ── Rule: init-once - tránh chạy 2 lần trong StrictMode ───────────────────
    // ── Rule: waterfall - không có gì chạy song song ở đây vì chỉ có 1 call ──
    useEffect(() => {
        if (didInitOffice) return;      // ← bỏ hasFetched.current, dùng module-level
        didInitOffice = true;

        const loadInitialData = async () => {
            setLoading(true);
            await dispatch(fetchOffice());
            setLoading(false);
        };

        loadInitialData();

        // ✅ Reset khi Provider unmount → lần sau vào lại sẽ fetch bình thường
        return () => {
            didInitOffice = false;
        };
    }, [dispatch]);

    // ── Actions ────────────────────────────────────────────────────────────────

    const selectOffice = useCallback((office: OfficeNode) => {
        // Rule: functional-setstate — dùng functional update để đọc prev, không cần selectedOffice trong deps
        setSelectedOffice(prev => {
            if (String(office.id) === String(prev?.id)) return prev;  // same → no re-render
            return office;
        });
    }, []);  // ✅ stable callback, không recreate khi selectedOffice thay đổi

    const createOffice = useCallback(async (data: Partial<Office>) => {
        // ── Rule: waterfall - dispatch create và fetchOffice tuần tự (đúng vì phụ thuộc) ──
        // ── Rule: defer-await - refreshChildrenForParent chỉ gọi khi có parentId ──
        await dispatch(create({ ...data, $typeName: 'Office.Office' } as any));

        const [,] = await Promise.all([
            dispatch(fetchOffice()),                                     // ← fetch redux
            treeRef.current?.refreshChildrenForParent?.(               // ← refresh tree
                (data as any).idCapTren || null
            ),
        ]);
    }, [dispatch]);

    const updateOffice = useCallback(async (data: Partial<Office> & { id: string }) => {
        await dispatch(update({ ...data, $typeName: 'Office.Office' } as any));

        const oldParentId = (data as any)._oldParentId as string | null;
        const newParentId = (data as any).idCapTren    as string | null;

        // ── Rule: waterfall - tất cả refresh chạy song song ───────────────────
        const refreshPromises: Promise<unknown>[] = [
            dispatch(fetchOffice()),                            // ← luôn fetch
            treeRef.current?.refreshNode?.(data.id)            // ← luôn refresh node
                ?? Promise.resolve(),
        ];

        // ── Rule: defer-await - chỉ refresh parent khi thực sự thay đổi ──────
        if (oldParentId !== newParentId) {
            if (oldParentId) refreshPromises.push(
                treeRef.current?.refreshChildrenForParent?.(oldParentId) ?? Promise.resolve()
            );
            if (newParentId) refreshPromises.push(
                treeRef.current?.refreshChildrenForParent?.(newParentId) ?? Promise.resolve()
            );
        }

        await Promise.all(refreshPromises);     // ← tất cả song song
    }, [dispatch]);

    const deleteOffice = useCallback(async (id: string, parentId?: string | null) => {
        await dispatch(deleteApi(id));

        // ── Rule: waterfall - removeNode sync + fetchOffice + refreshParent song song ──
        treeRef.current?.removeNode?.(id);      // ← sync, không cần await

        // ── Rule: defer-await - chỉ refreshParent khi có parentId ─────────────
        await Promise.all([
            dispatch(fetchOffice()),
            parentId
                ? treeRef.current?.refreshChildrenForParent?.(parentId) ?? Promise.resolve()
                : Promise.resolve(),            // ← skip nếu không có parentId
        ]);
    }, [dispatch]);

    const refreshTree = useCallback((parentId: string | number | null = null) => {
        if (!treeRef.current) return;           // ← defer-await: early return
        parentId == null
            ? treeRef.current.refreshTree()
            : treeRef.current.refreshChildrenForParent(parentId);
    }, []);

    const refreshNode = useCallback(async (nodeId: string | number) => {
        await treeRef.current?.refreshNodeAndChildren?.(nodeId);
    }, []);

    const importOffices = useCallback(async (excelData: Record<string, unknown>[]) => {
        // ── Rule: waterfall - tất cả rows chạy song song với Promise.allSettled ──
        try {
            // ✅ Rule: index-maps — build O(n) map 1 lần, tránh O(n²) .find() per row
            const allOfficesById = new Map(allOffices.map(o => [String(o.id), o]));

            const results = await Promise.allSettled(
                excelData.map(async (row) => {
                    const officeData: Partial<Office> = {
                        id:        (row['Mã đơn vị']   as string) || '',
                        ten:       (row['Tên đơn vị']  as string) || '',
                        tenDayDu:  (row['Tên đầy đủ']  as string) || '',
                        vietTat:   (row['Viết tắt']    as string) || '',
                        idCapTren: (row['Mã cấp trên'] as string) || '',
                        thuTu:     parseInt(row['Thứ tự'] as string) || 0,
                        coCapDuoi: row['Có cấp dưới'] === 'Có',
                    };
                    // ── Rule: defer-await - chỉ await call cần thiết ──────────
                    const exists = allOfficesById.get(String(officeData.id));
                    return exists
                        ? await officeApi.update(officeData as Office)
                        : await officeApi.create(officeData as Office);
                })
            );
            // 1 lần duyệt thay vì 2 lần filter
            let succeeded = 0;
            for (const r of results) { if (r.status === 'fulfilled') succeeded++; }
            const failed = results.length - succeeded;
            return {
                success: failed === 0,
                message: failed > 0
                    ? `Import thành công ${succeeded}/${excelData.length} bản ghi`
                    : `Import thành công ${succeeded} đơn vị`,
                details: { succeeded, failed, total: excelData.length },
            };
        } catch (error: unknown) {
            return {
                success: false,
                message: 'Lỗi khi import: ' + (error instanceof Error ? error.message : String(error)),
            };
        }
    }, [allOffices]);

    const onImportSuccess = useCallback(async () => {
        // ── Rule: waterfall - fetchOffice và refreshTree song song ────────────
        await Promise.all([
            dispatch(fetchOffice()),
            Promise.resolve(treeRef.current?.refreshTree?.()),  // ← sync nhưng wrap để parallel
        ]);
    }, [dispatch]);

    // ── Computed: dùng useMemo tránh recreate mỗi render ──────────────────────
    const officeColumnMapping = useMemo<Record<string, string>>(() => ({
        'Mã đơn vị':   'id',
        'Tên đơn vị':  'ten',
        'Tên đầy đủ':  'tenDayDu',
        'Viết tắt':    'vietTat',
        'Mã cấp trên': 'idCapTren',
        'Thứ tự':      'thuTu',
        'Có cấp dưới': 'coCapDuoi',
    }), []); // ← [] vì không phụ thuộc state nào

    // ── Context Value: dùng useMemo tránh re-render toàn bộ consumers ─────────
    const value = useMemo<OfficeContextValue>(() => ({
        state: {
            selectedOffice,
            allOffices,
            isTreeEmpty: allOffices.length === 0,
            loading,                                // ← thêm vào value
        },
        actions: {
            selectOffice,
            createOffice,
            updateOffice,
            deleteOffice,
            refreshTree,
            refreshNode,
            importOffices,
            onImportSuccess,
        },
        meta: {
            treeRef,
            colors,
            officeColumnMapping,
        },
    }), [
        selectedOffice,
        allOffices,
        loading,                                    // ← thêm vào deps
        selectOffice, createOffice, updateOffice, deleteOffice,
        refreshTree, refreshNode, importOffices, onImportSuccess,
        colors, officeColumnMapping,
        // treeRef: ref object ổn định, không cần deps
    ]);

    return (
        <OfficeContext.Provider value={value}>
            {children}
        </OfficeContext.Provider>
    );
};

export default OfficeContext;
