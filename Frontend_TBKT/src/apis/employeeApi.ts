// @ts-nocheck
import { create } from "@bufbuild/protobuf";
import { Timestamp } from "@bufbuild/protobuf/wkt";
import {
    GetListEmployeesRequestSchema,
    GetEmployeeRequestSchema,
    SaveEmployeeRequestSchema,
    DeleteEmployeeRequestSchema,
    ImportEmployeesStreamRequestSchema,
    EmployeeSchema,
    EmployeeSearchSchema,
    GetListEmployeesResponseSchema,
} from '../grpc/generated/Employee_pb';
import { PagerSettingsSchema } from '../grpc/generated/Pager_pb';
import { employeeClient } from '../grpc/grpcClient';

// Module-level cache: key = "<seconds>_<nanos>_<locale>"
const formatDateCache = new Map<string, string>();

export interface EmployeeImportProgress {
    jobId: string;
    stage: string;
    message: string;
    processed: number;
    total: number;
    succeeded: number;
    failed: number;
    currentKey: string;
    warnings: string[];
    done: boolean;
    success: boolean;
}

export function formatDate(
    ts?: Timestamp | null,
    locale = "vi-VN"
): string {
    if (!ts || ts.seconds === undefined) return "-";

    const cacheKey = `${ts.seconds}_${ts.nanos ?? 0}_${locale}`;
    if (formatDateCache.has(cacheKey)) return formatDateCache.get(cacheKey)!;

    const ms =
        Number(ts.seconds) * 1000 + Math.floor((ts.nanos ?? 0) / 1_000_000);

    const result = new Date(ms).toLocaleDateString(locale);
    formatDateCache.set(cacheKey, result);
    return result;
}

export interface SearchParams {
    employee?: EmployeeBody;
    searchText?: string;
}

export interface DeleteBody {
    id?: string;
    ids?: string[];
}

const employeeApi = {
    async getListEmployees(
        searchParams: SearchParams | null = null
    ): Promise<Employee[]> {
        try {
            console.log('[employeeApi] getListEmployees - Request:', searchParams);

            const request = create(GetListEmployeesRequestSchema, {
                searchItem: create(EmployeeSearchSchema, {
                    employee: searchParams?.employee ? create(EmployeeSchema, searchParams.employee) : undefined,
                    pagerSettings: create(PagerSettingsSchema, {
                        index: 0,
                        size: 10000,
                    }),
                    searchText: searchParams?.searchText || '',
                }),
            });

            console.log('[employeeApi] getListEmployees - Created request');

            const res = await employeeClient.getListEmployees(request);

            // The gRPC response structure
            // With @bufbuild/protobuf, the response is the actual message (not wrapped)
            const items = res.items ?? [];

            console.log('[employeeApi] getListEmployees - Returned', items.length, 'employees');

            return items;
        } catch (err: any) {
            console.error("[employeeApi] getListEmployees error:", err);
            if (err.code === 16) {
                sessionStorage.clear();
                window.location.href = "/login";
            }
            throw err;
        }
    },

    async getEmployee(id: string) {
        try {
            console.log('[employeeApi] getEmployee - ID:', id);

            const request = create(GetEmployeeRequestSchema, { id });

            console.log('[employeeApi] getEmployee - Created request');

            const res = await employeeClient.getEmployee(request);

            const employee = res.item;

            console.log('[employeeApi] getEmployee - Got employee:', employee?.id);

            return employee;
        } catch (err: any) {
            console.error("[employeeApi] getEmployee error:", err);
            throw err;
        }
    },

    async create(body: Employee) {
        try {
            console.log('[employeeApi] create - Body:', body);

            const request = create(SaveEmployeeRequestSchema, {
                isNew: true,
                item: create(EmployeeSchema, {
                    // 
                    ...body,
                    ngaySinh: toTimestamp(body.ngaySinh),
                }),
            });

            console.log('[employeeApi] create - Created request');

            const res = await employeeClient.saveEmployee(request);

            console.log('[employeeApi] create - Response:', res.item?.id);
            if (!res.success || !res.item) {
                throw new Error(res.message || 'Tạo nhân viên thất bại');
            }

            return res.item;
        } catch (err: any) {
            console.error('[employeeApi] create error:', err);
            throw err;
        }
    },

    async update(body: Employee) {
        try {
            console.log('[employeeApi] update - Body:', body);

            const request = create(SaveEmployeeRequestSchema, {
                isNew: false,
                oldId: body.id || '',
                item: create(EmployeeSchema, {
                    ...body,
                    ngaySinh: toTimestamp(body.ngaySinh),
                }),
            });

            console.log('[employeeApi] update - Created request');

            const res = await employeeClient.saveEmployee(request);

            console.log('[employeeApi] update - Response:', res.item?.id);

            if (!res.success || !res.item) {
                throw new Error(res.message || 'Tạo nhân viên thất bại');
            }


            return res.item;
        } catch (err: any) {
            console.error('[employeeApi] update error:', err);
            throw err;
        }
    },

    async deleteApi(body: DeleteBody) {
        try {
            console.log('[employeeApi] deleteApi - Body:', body);

            const request = create(DeleteEmployeeRequestSchema, {
                id: body.id || '',
                ids: Array.isArray(body.ids) ? body.ids : [],
            });

            console.log('[employeeApi] deleteApi - Created request');

            const res = await employeeClient.deleteEmployee(request);

            console.log('[employeeApi] deleteApi - Response:', res.success);

            return res;
        } catch (err: any) {
            console.error('[employeeApi] deleteApi error:', err);
            throw err;
        }
    },

    async streamImportEmployees(
        items: Employee[],
        onEvent?: (event: EmployeeImportProgress) => void,
    ): Promise<EmployeeImportProgress[]> {
        try {
            const request = create(ImportEmployeesStreamRequestSchema, {
                items: items.map((item) => create(EmployeeSchema, {
                    ...item,
                    ngaySinh: toTimestamp(item.ngaySinh),
                })),
            });

            const events: EmployeeImportProgress[] = [];
            for await (const event of employeeClient.importEmployeesStream(request)) {
                const mapped: EmployeeImportProgress = {
                    jobId: event.jobId,
                    stage: event.stage,
                    message: event.message,
                    processed: event.processed,
                    total: event.total,
                    succeeded: event.succeeded,
                    failed: event.failed,
                    currentKey: event.currentKey,
                    warnings: [...(event.warnings ?? [])],
                    done: event.done,
                    success: event.success,
                };
                events.push(mapped);
                onEvent?.(mapped);
            }

            return events;
        } catch (err: any) {
            console.error('[employeeApi] streamImportEmployees error:', err);
            throw err;
        }
    },
};

export default employeeApi;
