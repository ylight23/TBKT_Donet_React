import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../theme';
import { fetchEmployee, create, update, deleteApi } from '../store/reducer/employee';
import { fetchOffice } from '../store/reducer/office';
import employeeApi, { type EmployeeImportProgress } from '../apis/employeeApi';
import catalogApi from '../apis/catalogApi';
import type { AppDispatch } from '../store';
import type { OfficeNode } from '../pages/Office/subComponent/OfficeDictionary';

export interface CatalogItem {
    id: string;
    ten?: string;
    tenDayDu?: string;
    [key: string]: unknown;
}

export interface EmployeeItem {
    id?: string;
    index?: number;
    hoVaTen?: string;
    ngaySinh?: unknown;
    idCapBac?: string;
    chucVu?: string;
    idDonVi?: string;
    idQuanTriDonVi?: string;
    kichHoat?: boolean;
    [key: string]: unknown;
}

export interface FilterValues {
    searchText: string;
    idCapBac: string;
    chucVu: string;
    idDonVi: string;
    idQuanTriDonVi: string;
}

interface EmployeeStateValue {
    employees: EmployeeItem[];
    displayEmployees: EmployeeItem[];
    isFiltered: boolean;
    loading: boolean;
    officeMap: Record<string, string>;
    capBacMap: Record<string, string>;
    capBacList: CatalogItem[];
    officeList: OfficeNode[];
    importing: boolean;
    importProgress: EmployeeImportProgress | null;
    importLogs: string[];
}

interface EmployeeActionsValue {
    createEmployee: (data: Partial<EmployeeItem>) => Promise<void>;
    updateEmployee: (data: Partial<EmployeeItem> & { id: string }) => Promise<void>;
    deleteEmployee: (id: string) => Promise<void>;
    filterEmployees: (filters: FilterValues) => Promise<void>;
    selectOffice: (office: OfficeNode | null) => void;
    importEmployees: (excelData: Record<string, unknown>[]) => Promise<{
        success: boolean;
        message: string;
        details?: { succeeded: number; failed: number; total: number };
    }>;
    onImportSuccess: () => Promise<void>;
}

interface EmployeeMetaValue {
    colors: any;
    employeeColumnMapping: Record<string, string>;
}

interface EmployeeContextValue {
    state: EmployeeStateValue;
    actions: EmployeeActionsValue;
    meta: EmployeeMetaValue;
}

const filterCache = new Map<string, EmployeeItem[]>();
let didInitEmployee = false;
const EXCEL_DATE_ORIGIN_MS = new Date(1900, 0, 1).getTime();
const ACTIVE_STATUS_SET = new Set(['hoạt động', 'có', 'active', 'yes', '1', 'true']);

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

export const useEmployee = (): EmployeeContextValue => {
    const ctx = useContext(EmployeeContext);
    if (!ctx) throw new Error('useEmployee must be used within EmployeeProvider');
    return ctx;
};

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const dispatch = useDispatch<AppDispatch>();

    const employees: EmployeeItem[] = useSelector((s: any) => s.employeeReducer.employeeApi || []);
    const officeListRaw: OfficeNode[] = useSelector((s: any) => s.officeReducer.officeApi || []);

    const [capBacList, setCapBacList] = useState<CatalogItem[]>([]);
    const [capBacMap, setCapBacMap] = useState<Record<string, string>>({});
    const [filteredEmployees, setFilteredEmployees] = useState<EmployeeItem[]>([]);
    const [isFiltered, setIsFiltered] = useState(false);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<EmployeeImportProgress | null>(null);
    const [importLogs, setImportLogs] = useState<string[]>([]);

    const officeList = officeListRaw;

    const officeMap = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        officeListRaw.forEach((o: OfficeNode) => {
            map[String(o.id)] = String(o.ten || o.tenDayDu || o.id);
        });
        return map;
    }, [officeListRaw]);

    useEffect(() => {
        if (didInitEmployee) return;
        didInitEmployee = true;

        const loadInitialData = async () => {
            setLoading(true);
            const [[,], capBac] = await Promise.all([
                Promise.all([
                    dispatch(fetchEmployee()),
                    dispatch(fetchOffice()),
                ]),
                catalogApi.getListCatalog('CapBac').catch(() => [] as any[]),
            ]);

            const validCapBac: CatalogItem[] = [];
            const capBacMapData: Record<string, string> = {};
            for (const item of capBac || []) {
                if (item.id === undefined) continue;
                const normalized: CatalogItem = { ...item, id: item.id as string };
                validCapBac.push(normalized);
                capBacMapData[String(normalized.id)] = String(normalized.ten || normalized.tenDayDu || normalized.id);
            }

            setCapBacList(validCapBac);
            setCapBacMap(capBacMapData);
            setLoading(false);
        };

        void loadInitialData();
        return () => {
            didInitEmployee = false;
        };
    }, [dispatch]);

    useEffect(() => {
        filterCache.clear();
    }, [employees]);

    const createEmployee = useCallback(async (data: Partial<EmployeeItem>) => {
        await dispatch(create(data as any));
        await dispatch(fetchEmployee());
        filterCache.clear();
    }, [dispatch]);

    const updateEmployee = useCallback(async (data: Partial<EmployeeItem> & { id: string }) => {
        await dispatch(update({ ...data } as any));
        await dispatch(fetchEmployee());
        filterCache.clear();
    }, [dispatch]);

    const deleteEmployee = useCallback(async (id: string) => {
        await dispatch(deleteApi({ id }));
        await dispatch(fetchEmployee());
        filterCache.clear();
    }, [dispatch]);

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
                    hoVaTen: searchText || undefined,
                    idCapBac: idCapBac || undefined,
                    chucVu: chucVu || undefined,
                    idDonVi: idDonVi || undefined,
                    idQuanTriDonVi: idQuanTriDonVi || undefined,
                },
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
            console.error('Loi khi tim kiem:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        filterEmployeesRef.current = filterEmployees;
    }, [filterEmployees]);

    const selectOffice = useCallback((office: OfficeNode | null) => {
        if (!office) return;

        const idDonVi = String(office.id ?? '');
        const cacheKey = JSON.stringify({
            searchText: '',
            idCapBac: '',
            chucVu: '',
            idDonVi,
            idQuanTriDonVi: '',
        });

        if (filterCache.has(cacheKey)) {
            setIsFiltered(true);
            setFilteredEmployees(filterCache.get(cacheKey)!);
            return;
        }

        void filterEmployeesRef.current({
            searchText: '',
            idCapBac: '',
            chucVu: '',
            idDonVi,
            idQuanTriDonVi: '',
        });
    }, []);

    const importEmployees = useCallback(async (excelData: Record<string, unknown>[]) => {
        try {
            setImporting(true);
            setImportProgress(null);
            setImportLogs([]);

            const normalizeText = (text: unknown) => String(text ?? '').trim().toLowerCase();
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            const officeNormMap = new Map<string, string>();
            for (const office of officeList) {
                const id = String(office.id);
                if (office.ten) officeNormMap.set(normalizeText(office.ten), id);
                if (office.tenDayDu) officeNormMap.set(normalizeText(office.tenDayDu), id);
                officeNormMap.set(id, id);
            }

            const capBacNormMap = new Map<string, string>();
            for (const capBac of capBacList) {
                if (capBac.ten) capBacNormMap.set(normalizeText(capBac.ten), String(capBac.id));
                capBacNormMap.set(String(capBac.id), String(capBac.id));
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

            const parsedData = excelData.map((row) => {
                let ngaySinh = '';
                const raw = row['NgÃ y sinh'];
                if (raw instanceof Date) {
                    ngaySinh = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
                } else if (typeof raw === 'string') {
                    const parts = raw.split('/');
                    if (parts.length === 3) ngaySinh = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else if (typeof raw === 'number') {
                    const date = new Date(EXCEL_DATE_ORIGIN_MS + (raw - 2) * 86400000);
                    ngaySinh = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                }

                return {
                    hoVaTen: String(row['Há» vÃ  tÃªn'] ?? '').trim(),
                    ngaySinh,
                    idCapBac: findCapBacId(row['Cáº¥p báº­c']),
                    chucVu: String(row['Chá»©c vá»¥'] ?? '').trim(),
                    idDonVi: findOfficeId(row['ÄÆ¡n vá»‹']),
                    idQuanTriDonVi: findOfficeId(row['Pháº¡m vi quáº£n trá»‹']),
                    kichHoat: parseStatus(row['Tráº¡ng thÃ¡i']),
                };
            });

            const events = await employeeApi.streamImportEmployees(parsedData as any[], (event) => {
                setImportProgress(event);
                setImportLogs((prev) => [...prev, ...[event.message, ...event.warnings].filter(Boolean)].slice(-12));
            });

            const finalEvent = events.at(-1);
            const succeeded = finalEvent?.succeeded ?? 0;
            const failed = finalEvent?.failed ?? 0;
            return {
                success: failed === 0,
                message: failed > 0
                    ? `Import thanh cong ${succeeded}/${excelData.length}. ${failed} loi.`
                    : `Import thanh cong ${succeeded} can bo`,
                details: { succeeded, failed, total: excelData.length },
            };
        } catch (error: unknown) {
            return {
                success: false,
                message: 'Loi khi import: ' + (error instanceof Error ? error.message : String(error)),
            };
        } finally {
            setImporting(false);
        }
    }, [capBacList, officeList]);

    const onImportSuccess = useCallback(async () => {
        filterCache.clear();
        await dispatch(fetchEmployee());
    }, [dispatch]);

    const employeeColumnMapping = useMemo<Record<string, string>>(() => ({
        STT: 'index',
        'Há» vÃ  tÃªn': 'hoVaTen',
        'NgÃ y sinh': 'ngaySinh',
        'Cáº¥p báº­c': 'idCapBac',
        'Chá»©c vá»¥': 'chucVu',
        'ÄÆ¡n vá»‹': 'idDonVi',
        'Pháº¡m vi quáº£n trá»‹': 'idQuanTriDonVi',
        'Tráº¡ng thÃ¡i': 'kichHoat',
    }), []);

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
            importing,
            importProgress,
            importLogs,
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
        employees,
        filteredEmployees,
        isFiltered,
        loading,
        officeMap,
        capBacMap,
        capBacList,
        officeList,
        importing,
        importProgress,
        importLogs,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        filterEmployees,
        selectOffice,
        importEmployees,
        onImportSuccess,
        colors,
        employeeColumnMapping,
    ]);

    return (
        <EmployeeContext.Provider value={value}>
            {children}
        </EmployeeContext.Provider>
    );
};

export default EmployeeContext;
