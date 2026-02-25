import React, { createContext, useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme }      from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';

import { tokens } from '../theme';
import { fetchEmployee, create, update, deleteApi } from '../store/reducer/employee';
import { fetchOffice } from '../store/reducer/office';
import employeeApi from '../apis/employeeApi';
import catalogApi from '../apis/catalogApi';
import { AppDispatch } from '../store';
import { OfficeNode } from '../pages/Office/subComponent/OfficeDictionary';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CatalogItem {
    id:       string;
    ten?:     string;
    tenDayDu?: string;
    [key: string]: unknown;
}

export interface EmployeeItem {
    id?:             string;
    index?:          number;
    hoVaTen?:        string;
    ngaySinh?:       unknown;
    idCapBac?:       string;
    chucVu?:         string;
    idDonVi?:        string;
    idQuanTriDonVi?: string;
    kichHoat?:       boolean;
    [key: string]: unknown;
}

export interface FilterValues {
    searchText:      string;
    idCapBac:        string;
    chucVu:          string;
    idDonVi:         string;
    idQuanTriDonVi:  string;
}

// ── State Interface ────────────────────────────────────────────────────────────

interface EmployeeStateValue {
    employees:        EmployeeItem[];
    displayEmployees: EmployeeItem[];
    isFiltered:       boolean;
    loading:          boolean;
    officeMap:        Record<string, string>;
    capBacMap:        Record<string, string>;
    capBacList:       CatalogItem[];
    officeList:       OfficeNode[];
}

// ── Actions Interface (UI không biết Redux) ────────────────────────────────────

interface EmployeeActionsValue {
    createEmployee:  (data: Partial<EmployeeItem>) => Promise<void>;
    updateEmployee:  (data: Partial<EmployeeItem> & { id: string }) => Promise<void>;
    deleteEmployee:  (id: string) => Promise<void>;
    filterEmployees: (filters: FilterValues) => Promise<void>;
    selectOffice:    (office: OfficeNode | null) => void;
    importEmployees: (excelData: Record<string, unknown>[]) => Promise<{
        success: boolean;
        message: string;
        details?: { succeeded: number; failed: number; total: number };
    }>;
    onImportSuccess: () => Promise<void>;
}

// ── Meta Interface ─────────────────────────────────────────────────────────────

interface EmployeeMetaValue {
    colors:                any;
    employeeColumnMapping: Record<string, string>;
}

// ── Context Value ──────────────────────────────────────────────────────────────

interface EmployeeContextValue {
    state:   EmployeeStateValue;
    actions: EmployeeActionsValue;
    meta:    EmployeeMetaValue;
}

// ── Module-level cache & init guard ───────────────────────────────────────────
const filterCache   = new Map<string, EmployeeItem[]>();
let didInitEmployee = false;   // Rule: init-once
const EXCEL_DATE_ORIGIN_MS = new Date(1900, 0, 1).getTime();  // Rule: cache-property-access
const ACTIVE_STATUS_SET    = new Set(['hoạt động', 'có', 'active', 'yes', '1', 'true']);  // Rule: set-map-lookups

// ── Context ────────────────────────────────────────────────────────────────────

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useEmployee = (): EmployeeContextValue => {
    const ctx = useContext(EmployeeContext);
    if (!ctx) throw new Error('useEmployee must be used within EmployeeProvider');
    return ctx;
};

// ── Provider ───────────────────────────────────────────────────────────────────

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme    = useTheme();
    const colors   = tokens(theme.palette.mode);     // colors từ theme
    const dispatch = useDispatch<AppDispatch>();

    const employees: EmployeeItem[] = useSelector(
        (s: any) => s.employeeReducer.employeeApi || []
    );
    const officeListRaw: OfficeNode[] = useSelector(
        (s: any) => s.officeReducer.officeApi || []
    );

    // ── States ────────────────────────────────────────────────────────────────
    const [capBacList, setCapBacList]        = useState<CatalogItem[]>([]);
    const [capBacMap,  setCapBacMap]         = useState<Record<string, string>>({});
    const [filteredEmployees, setFilteredEmployees] = useState<EmployeeItem[]>([]);
    const [isFiltered, setIsFiltered]        = useState(false);
    const [loading,    setLoading]           = useState(true);   // ← bắt đầu true, không phải false

    // ── officeList + officeMap từ Redux selector (không dùng useState) ────────
    const officeList = officeListRaw;

    const officeMap = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        officeListRaw.forEach((o: OfficeNode) => {
            map[String(o.id)] = String(o.ten || o.tenDayDu || o.id);
        });
        return map;
    }, [officeListRaw]);

    // ── Init once ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (didInitEmployee) return;
        didInitEmployee = true;

        const loadInitialData = async () => {
            setLoading(true);

            // ── Tách capBac ra khỏi Promise.all để đảm bảo map có data trước khi render
            const [[,], capBac] = await Promise.all([
                Promise.all([
                    dispatch(fetchEmployee()),
                    dispatch(fetchOffice()),
                ]),
                catalogApi.getListCatalog('CapBac').catch(() => [] as any[]),
            ]);

            // ✅ 1 lần duyệt thay vì filter → map → forEach (3 lần)
            const validCapBac: CatalogItem[] = [];
            const capBacMapData: Record<string, string> = {};
            for (const i of (capBac || [])) {
                if (i.id === undefined) continue;
                const item: CatalogItem = { ...i, id: i.id as string };
                validCapBac.push(item);
                capBacMapData[String(item.id)] = String(item.ten || item.tenDayDu || item.id);
            }

            setCapBacList(validCapBac);
            setCapBacMap(capBacMapData);
            setLoading(false);   // ← chỉ false sau khi capBacMap đã fill xong
        };

        loadInitialData();

        return () => { didInitEmployee = false; };
    }, [dispatch]);

    // ── Xóa cache khi employees thay đổi ──────────────────────────────────────
    useEffect(() => { filterCache.clear(); }, [employees]);

    // ── Actions ────────────────────────────────────────────────────────────────
    const createEmployee = useCallback(async (data: Partial<EmployeeItem>) => {
        await dispatch(create(data as any));
        await dispatch(fetchEmployee());
        filterCache.clear();
    }, [dispatch]);

    const updateEmployee = useCallback(async (data: Partial<EmployeeItem> & { id: string }) => {
        const updateData: any = { ...data };
        if (!updateData.matKhau) delete updateData.matKhau;
        await dispatch(update(updateData));
        await dispatch(fetchEmployee());
        filterCache.clear();
    }, [dispatch]);

    const deleteEmployee = useCallback(async (id: string) => {
        await dispatch(deleteApi({ id }));
        await dispatch(fetchEmployee());
        filterCache.clear();
    }, [dispatch]);

    // ── Rule: event-handler-refs ───────────────────────────────────────────────
    const filterEmployeesRef = useRef<(filters: FilterValues) => Promise<void>>(async () => {});

    const filterEmployees = useCallback(async (filters: FilterValues) => {
        const { searchText, idCapBac, chucVu, idDonVi, idQuanTriDonVi } = filters;
        const hasActiveFilter = searchText || idCapBac || chucVu || idDonVi || idQuanTriDonVi;

        if (!hasActiveFilter) {
            setIsFiltered(false);
            setFilteredEmployees([]);
            return;
        }

        const cacheKey = JSON.stringify(filters);
        if (filterCache.has(cacheKey)) {
            setIsFiltered(true);
            setFilteredEmployees(filterCache.get(cacheKey)!);
            return;
        }

        setLoading(true);
        try {
            const data = await employeeApi.getListEmployees({
                employee: {
                    hoVaTen:        searchText        || undefined,
                    idCapBac:       idCapBac          || undefined,
                    chucVu:         chucVu            || undefined,
                    idDonVi:        idDonVi           || undefined,
                    idQuanTriDonVi: idQuanTriDonVi    || undefined,
                }
            });
            let index = 1;
            const list: EmployeeItem[] = Array.isArray(data)
                ? data.map((item: any) => ({ index: index++, ...item, id: item.id || item.Id }))
                : [];
            filterCache.set(cacheKey, list);
            setIsFiltered(true);
            setFilteredEmployees(list);
        } catch (error) {
            setIsFiltered(true);
            setFilteredEmployees([]);
            console.error('Lỗi khi tìm kiếm:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        filterEmployeesRef.current = filterEmployees;
    }, [filterEmployees]);

    const selectOffice = useCallback((office: OfficeNode | null) => {
        if (!office) return;

        const idDonVi  = String(office.id ?? '');
        const cacheKey = JSON.stringify({
            searchText: '', idCapBac: '', chucVu: '',
            idDonVi,
            idQuanTriDonVi: '',
        });

        if (filterCache.has(cacheKey)) {
            setIsFiltered(true);
            setFilteredEmployees(filterCache.get(cacheKey)!);
            return;
        }

        filterEmployeesRef.current({
            searchText: '', idCapBac: '', chucVu: '',
            idDonVi,
            idQuanTriDonVi: '',
        });
    }, []);

    const importEmployees = useCallback(async (excelData: Record<string, unknown>[]) => {
        try {
            const normalizeText = (text: unknown) => String(text ?? '').trim().toLowerCase();
            const uuidPattern   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            // ✅ Rule: index-maps — build maps O(n) 1 lần, tránh O(n²) .find() per row
            const officeNormMap = new Map<string, string>();
            for (const o of officeList) {
                const id = String(o.id);
                if (o.ten)      officeNormMap.set(normalizeText(o.ten),      id);
                if (o.tenDayDu) officeNormMap.set(normalizeText(o.tenDayDu), id);
                officeNormMap.set(id, id);  // lookup by id
            }
            const capBacNormMap = new Map<string, string>();
            for (const cb of capBacList) {
                if (cb.ten) capBacNormMap.set(normalizeText(cb.ten), String(cb.id));
                capBacNormMap.set(String(cb.id), String(cb.id));
            }

            const findOfficeId = (value: unknown): string => {
                if (!value) return '';
                const str = String(value).trim();
                if (uuidPattern.test(str)) return str;
                return officeNormMap.get(normalizeText(str)) ?? officeNormMap.get(str) ?? '';
            };

            const findCapBacId = (value: unknown): string => {
                if (!value) return '';
                const str = String(value).trim();
                if (uuidPattern.test(str)) return str;
                return capBacNormMap.get(normalizeText(str)) ?? capBacNormMap.get(str) ?? '';
            };

            const parseStatus = (value: unknown): boolean =>
                ACTIVE_STATUS_SET.has(normalizeText(String(value ?? '')));

            const parsedData = excelData.map((row, index) => {
                let ngaySinh = '';
                const dv = row['Ngày sinh'];
                if (dv instanceof Date) {
                    ngaySinh = `${dv.getFullYear()}-${String(dv.getMonth() + 1).padStart(2, '0')}-${String(dv.getDate()).padStart(2, '0')}`;
                } else if (typeof dv === 'string') {
                    const p = dv.split('/');
                    if (p.length === 3) ngaySinh = `${p[2]}-${p[1]}-${p[0]}`;
                } else if (typeof dv === 'number') {
                    const d = new Date(EXCEL_DATE_ORIGIN_MS + (dv - 2) * 86400000);
                    ngaySinh = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
                return {
                    rowIndex:       index + 1,
                    hoVaTen:        String(row['Họ và tên']        ?? '').trim(),
                    ngaySinh,
                    idCapBac:       findCapBacId(row['Cấp bậc']),
                    chucVu:         String(row['Chức vụ']          ?? '').trim(),
                    idDonVi:        findOfficeId(row['Đơn vị']),
                    idQuanTriDonVi: findOfficeId(row['Phạm vi quản trị']),
                    kichHoat:       parseStatus(row['Trạng thái']),
                };
            });

            // ✅ Rule: index-maps — build employee map 1 lần trước batch loop
            const employeeByHoVaTen = new Map<string, EmployeeItem>();
            for (const e of employees) {
                if (e.hoVaTen) employeeByHoVaTen.set(e.hoVaTen.trim().toLowerCase(), e);
            }

            const BATCH_SIZE = 50;
            const results: PromiseSettledResult<unknown>[] = [];
            for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
                const batch        = parsedData.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.allSettled(
                    batch.map(async (ed) => {
                        const { rowIndex, ...cleanData } = ed;
                        if (!cleanData.hoVaTen) throw new Error('Thiếu họ và tên');
                        const hoVaTenNorm = cleanData.hoVaTen.trim().toLowerCase();
                        const exists = employeeByHoVaTen.get(hoVaTenNorm);
                        return exists
                            ? await employeeApi.update({ ...cleanData, id: exists.id })
                            : await employeeApi.create(cleanData);
                    })
                );
                results.push(...batchResults);
                if (i + BATCH_SIZE < parsedData.length) await new Promise(r => setTimeout(r, 100));
            }

            // ✅ 1 lần duyệt thay vì 2 lần filter
            let succeeded = 0;
            for (const r of results) { if (r.status === 'fulfilled') succeeded++; }
            const failed = results.length - succeeded;
            return {
                success: failed === 0,
                message: failed > 0
                    ? `Import thành công ${succeeded}/${excelData.length}. ${failed} lỗi.`
                    : `Import thành công ${succeeded} cán bộ`,
                details: { succeeded, failed, total: excelData.length },
            };
        } catch (error: unknown) {
            return {
                success: false,
                message: 'Lỗi khi import: ' + (error instanceof Error ? error.message : String(error)),
            };
        }
    }, [officeListRaw, capBacList, employees]);

    const onImportSuccess = useCallback(async () => {
        filterCache.clear();
        await dispatch(fetchEmployee());
    }, [dispatch]);

    // ── Computed ───────────────────────────────────────────────────────────────
    const employeeColumnMapping = useMemo<Record<string, string>>(() => ({
        'STT':               'index',
        'Họ và tên':         'hoVaTen',
        'Ngày sinh':         'ngaySinh',
        'Cấp bậc':           'idCapBac',
        'Chức vụ':           'chucVu',
        'Đơn vị':            'idDonVi',
        'Phạm vi quản trị':  'idQuanTriDonVi',
        'Trạng thái':        'kichHoat',
    }), []);

    // ── Context Value ──────────────────────────────────────────────────────────
    const value = useMemo<EmployeeContextValue>(() => ({
        state: {
            employees,
            displayEmployees: isFiltered ? filteredEmployees : employees,
            isFiltered,
            loading,
            officeMap,
            capBacMap,
            capBacList,
            officeList,
        },
        actions: {
            createEmployee,
            updateEmployee,
            deleteEmployee,
            filterEmployees,
            selectOffice,
            importEmployees,
            onImportSuccess,
        },
        meta: {
            colors,
            employeeColumnMapping,
        },
    }), [
        employees, filteredEmployees, isFiltered, loading,
        officeMap, capBacMap, capBacList, officeList,
        createEmployee, updateEmployee, deleteEmployee,
        filterEmployees, selectOffice, importEmployees, onImportSuccess,
        colors, employeeColumnMapping,
    ]);

    return (
        <EmployeeContext.Provider value={value}>
            {children}
        </EmployeeContext.Provider>
    );
};

export default EmployeeContext;

// ❌ Xóa toàn bộ các stub functions bên dưới
// function setOfficeMap(...)  { throw new Error(...) }  ← XÓA
// function setCapBacList(...) { throw new Error(...) }  ← XÓA
// function setIsFiltered(...) { throw new Error(...) }  ← XÓA
// function setCapBacMap(...)  { throw new Error(...) }  ← XÓA
// function setLoading(...)    { throw new Error(...) }  ← XÓA

