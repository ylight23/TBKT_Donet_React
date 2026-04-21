// @ts-nocheck
// ============================================================
// TrangBiLog API — uses @bufbuild/protobuf + @connectrpc/connect
// Same pattern as thamSoApi.ts / danhMucTrangBiApi.ts
// ============================================================
import { create } from '@bufbuild/protobuf';
import type { Timestamp } from '@bufbuild/protobuf/wkt';

import {
    // Request schemas
    GetListTrangBiLogRequestSchema,
    GetTrangBiLogRequestSchema,
    SaveTrangBiLogRequestSchema,
    DeleteTrangBiLogRequestSchema,
    RestoreTrangBiLogRequestSchema,
    GetCalendarLogRequestSchema,
    GetKTVWorkloadRequestSchema,
    GetLogStatsRequestSchema,
    GetQuarterGanttRequestSchema,
    GetLogHistoryByTrangBiRequestSchema,
    GetFieldSetsByLogTypeRequestSchema,

    // Message schemas (for nested create())
    TrangBiLogSchema,

    // Enums
    LogType,
    LogStatus,
} from '../grpc/generated/TrangBiLog_pb';

import type {
    TrangBiLog as TrangBiLogProto,
    TrangBiLogSummary as TrangBiLogSummaryProto,
    TrangBiLogCalendarItem as TrangBiLogCalendarItemProto,
    KTVWorkloadItem as KTVWorkloadItemProto,
    LogStats as LogStatsProto,
    GanttRow as GanttRowProto,
} from '../grpc/generated/TrangBiLog_pb';

import { trangBiLogClient } from '../grpc/grpcClient';

// ============================================================
// Helpers
// ============================================================
const timestampToIso = (ts?: Timestamp | null): string | undefined => {
    if (!ts) return undefined;
    const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
};

// ============================================================
// Local UI types  (re-exported so existing consumers don't break)
// ============================================================
export type { LogType, LogStatus };

export interface LocalTrangBiLog {
    id: string;
    logType: LogType;
    idTrangBi: string;
    maDanhMuc: string;
    tenTrangBi: string;
    soHieuTrangBi: string;
    donViChuQuan: string;
    idChuyenNganhKt: string;
    idNganh: string;
    status: LogStatus;
    ktvChinh: string;
    ktvPhu: string[];
    ngayLapKeHoach?: string;
    ngayDuKien?: string;
    ngayThucHien?: string;
    ngayHoanThanh?: string;
    ngayTao?: string;
    ngaySua?: string;
    nguoiTao: string;
    nguoiSua: string;
    ghiChu: string;
    parameters: Record<string, string>;
}

export interface LocalTrangBiLogSummary {
    id: string;
    logType: LogType;
    idTrangBi: string;
    tenTrangBi: string;
    soHieuTrangBi: string;
    donViChuQuan: string;
    status: LogStatus;
    ktvChinh: string;
    nguoiSua: string;
    ngayDuKien?: string;
    ngayThucHien?: string;
    ngayHoanThanh?: string;
    ngaySua?: string;
}

export interface LocalCalendarItem {
    id: string;
    logType: LogType;
    status: LogStatus;
    tenTrangBi: string;
    ktvChinh: string;
    ngay?: string;
}

export interface LocalKTVWorkloadItem {
    ktvId: string;
    tenKtv: string;
    tongNhiemVu: number;
    daHoanThanh: number;
    conLai: number;
    taiPhanCong: number;
}

export interface LocalLogStats {
    keHoachThang: number;
    daHoanThanh: number;
    conLai: number;
    tyLeHoanThanh: number;
    quaHan: number;
    sapDenHan: number;
}

export interface LocalGanttRow {
    idTrangBi: string;
    tenTrangBi: string;
    soHieu: string;
    m1Status: LogStatus;
    m2Status: LogStatus;
    m3Status: LogStatus;
}

export interface LocalFieldSetDetail {
    fieldSet: {
        id: string;
        name: string;
        key?: string;
        icon: string;
        color: string;
        desc?: string;
        fieldIds: string[];
        maDanhMucTrangBi: string[];
    };
    fields: Array<{
        id: string;
        key: string;
        label: string;
        type: string;
        required: boolean;
        disabled?: boolean;
        validation?: {
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            min?: number;
            max?: number;
            options?: string[];
            dataSource?: string;
            apiUrl?: string;
            displayType?: string;
        };
        cnIds?: string[];
    }>;
}

const normalizeFieldKey = (value: string): string => value.trim().toLowerCase();

const mergeFieldSetDetailsForLogType = (
    items: LocalFieldSetDetail[],
    loaiNv: string,
): LocalFieldSetDetail[] => {
    if (items.length <= 1) return items;

    const first = items[0];
    const seenFieldKeys = new Set<string>();
    const mergedFields: LocalFieldSetDetail['fields'] = [];
    const mergedFieldIds = new Set<string>();
    const mergedMaDanhMuc = new Set<string>();

    items.forEach((item) => {
        item.fieldSet.fieldIds.forEach((id) => mergedFieldIds.add(id));
        item.fieldSet.maDanhMucTrangBi.forEach((id) => mergedMaDanhMuc.add(id));
        item.fields.forEach((field) => {
            const normalized = normalizeFieldKey(field.key);
            if (!normalized || seenFieldKeys.has(normalized)) return;
            seenFieldKeys.add(normalized);
            mergedFields.push(field);
        });
    });

    return [{
        fieldSet: {
            ...first.fieldSet,
            id: first.fieldSet.id || `merged_${loaiNv}`,
            fieldIds: Array.from(mergedFieldIds),
            maDanhMucTrangBi: Array.from(mergedMaDanhMuc),
        },
        fields: mergedFields,
    }];
};

// ============================================================
// Mappers: Proto → Local
// ============================================================
function mapSummary(p: TrangBiLogSummaryProto): LocalTrangBiLogSummary {
    return {
        id: p.id,
        logType: p.logType,
        idTrangBi: p.idTrangBi,
        tenTrangBi: p.tenTrangBi,
        soHieuTrangBi: p.soHieuTrangBi,
        donViChuQuan: p.donViChuQuan,
        status: p.status,
        ktvChinh: p.ktvChinh,
        nguoiSua: p.nguoiSua,
        ngayDuKien: timestampToIso(p.ngayDuKien),
        ngayThucHien: timestampToIso(p.ngayThucHien),
        ngayHoanThanh: timestampToIso(p.ngayHoanThanh),
        ngaySua: timestampToIso(p.ngaySua),
    };
}

function mapCalendarItem(p: TrangBiLogCalendarItemProto): LocalCalendarItem {
    return {
        id: p.id,
        logType: p.logType,
        status: p.status,
        tenTrangBi: p.tenTrangBi,
        ktvChinh: p.ktvChinh,
        ngay: timestampToIso(p.ngay),
    };
}

function mapKTVWorkload(p: KTVWorkloadItemProto): LocalKTVWorkloadItem {
    return {
        ktvId: p.ktvId,
        tenKtv: p.tenKtv,
        tongNhiemVu: p.tongNhiemVu,
        daHoanThanh: p.daHoanThanh,
        conLai: p.conLai,
        taiPhanCong: p.taiPhanCong,
    };
}

function mapLogStats(p: LogStatsProto): LocalLogStats {
    return {
        keHoachThang: p.keHoachThang,
        daHoanThanh: p.daHoanThanh,
        conLai: p.conLai,
        tyLeHoanThanh: p.tyLeHoanThanh,
        quaHan: p.quaHan,
        sapDenHan: p.sapDenHan,
    };
}

function mapGanttRow(p: GanttRowProto): LocalGanttRow {
    return {
        idTrangBi: p.idTrangBi,
        tenTrangBi: p.tenTrangBi,
        soHieu: p.soHieu,
        m1Status: p.m1Status,
        m2Status: p.m2Status,
        m3Status: p.m3Status,
    };
}

function mapTrangBiLog(p: TrangBiLogProto): LocalTrangBiLog {
    return {
        id: p.id,
        logType: p.logType,
        idTrangBi: p.idTrangBi,
        maDanhMuc: p.maDanhMuc,
        tenTrangBi: p.tenTrangBi,
        soHieuTrangBi: p.soHieuTrangBi,
        donViChuQuan: p.donViChuQuan,
        idChuyenNganhKt: p.idChuyenNganhKt,
        idNganh: p.idNganh,
        status: p.status,
        ktvChinh: p.ktvChinh,
        ktvPhu: [...(p.ktvPhu ?? [])],
        ngayLapKeHoach: timestampToIso(p.ngayLapKeHoach),
        ngayDuKien: timestampToIso(p.ngayDuKien),
        ngayThucHien: timestampToIso(p.ngayThucHien),
        ngayHoanThanh: timestampToIso(p.ngayHoanThanh),
        ngayTao: timestampToIso(p.ngayTao),
        ngaySua: timestampToIso(p.ngaySua),
        nguoiTao: p.nguoiTao,
        nguoiSua: p.nguoiSua,
        ghiChu: p.ghiChu,
        parameters: { ...(p.parameters ?? {}) },
    };
}

// ============================================================
// API
// ============================================================
export async function getListTrangBiLog(params: {
    logType?: LogType;
    idTrangBi?: string;
    idChuyenNganhKt?: string;
    idNhomDongBo?: string;
    searchText?: string;
    status?: string;
    ktvChinh?: string;
    year?: number;
    month?: number;
    quarter?: number;
}): Promise<LocalTrangBiLogSummary[]> {
    const req = create(GetListTrangBiLogRequestSchema, {
        logType: params.logType ?? LogType.UNSPECIFIED,
        idTrangBi: params.idTrangBi ?? '',
        idChuyenNganhKt: params.idChuyenNganhKt ?? '',
        idNhomDongBo: params.idNhomDongBo ?? '',
        searchText: params.searchText ?? '',
        ktvChinh: params.ktvChinh ?? '',
        year: params.year ?? new Date().getFullYear(),
        month: params.month ?? new Date().getMonth() + 1,
        quarter: params.quarter ?? 0,
    });
    const res = await trangBiLogClient.getListTrangBiLog(req);
    if (!res.meta?.success) throw new Error(res.meta?.message ?? 'Lỗi tải danh sách log');
    return (res.items ?? []).map(mapSummary);
}

export async function getTrangBiLog(id: string): Promise<LocalTrangBiLog> {
    const req = create(GetTrangBiLogRequestSchema, { id });
    const res = await trangBiLogClient.getTrangBiLog(req);
    if (!res.meta?.success || !res.item) throw new Error(res.meta?.message ?? 'Lỗi tải chi tiết log');
    return mapTrangBiLog(res.item);
}

export async function saveTrangBiLog(log: Partial<LocalTrangBiLog>): Promise<{ success: boolean; message: string }> {
    const proto = create(TrangBiLogSchema, {
        id: log.id ?? '',
        logType: log.logType ?? LogType.UNSPECIFIED,
        idTrangBi: log.idTrangBi ?? '',
        maDanhMuc: log.maDanhMuc ?? '',
        tenTrangBi: log.tenTrangBi ?? '',
        soHieuTrangBi: log.soHieuTrangBi ?? '',
        donViChuQuan: log.donViChuQuan ?? '',
        idChuyenNganhKt: log.idChuyenNganhKt ?? '',
        idNganh: log.idNganh ?? '',
        status: log.status ?? LogStatus.UNSPECIFIED,
        ktvChinh: log.ktvChinh ?? '',
        ktvPhu: log.ktvPhu ?? [],
        nguoiTao: log.nguoiTao ?? '',
        nguoiSua: log.nguoiSua ?? '',
        ghiChu: log.ghiChu ?? '',
        parameters: log.parameters ?? {},
    });
    const req = create(SaveTrangBiLogRequestSchema, { item: proto });
    const res = await trangBiLogClient.saveTrangBiLog(req);
    if (!res.meta?.success) throw new Error(res.meta?.message ?? 'Lỗi lưu log');
    return { success: true, message: 'Đã lưu thành công' };
}

export async function deleteTrangBiLog(ids: string[]): Promise<void> {
    const req = create(DeleteTrangBiLogRequestSchema, { ids });
    const res = await trangBiLogClient.deleteTrangBiLog(req);
    if (!res.success) throw new Error(res.message ?? 'Lỗi xóa log');
}

export async function restoreTrangBiLog(ids: string[]): Promise<void> {
    const req = create(RestoreTrangBiLogRequestSchema, { ids });
    const res = await trangBiLogClient.restoreTrangBiLog(req);
    if (!res.success) throw new Error(res.message ?? 'Lỗi khôi phục log');
}

export async function getCalendarLog(params: {
    logType: LogType;
    year: number;
    month: number;
}): Promise<LocalCalendarItem[]> {
    const req = create(GetCalendarLogRequestSchema, {
        logType: params.logType,
        year: params.year,
        month: params.month,
    });
    const res = await trangBiLogClient.getCalendarLog(req);
    if (!res.meta?.success) throw new Error(res.meta?.message ?? 'Lỗi tải calendar');
    return (res.items ?? []).map(mapCalendarItem);
}

export async function getKTVWorkload(params: {
    logType: LogType;
    year: number;
    month: number;
}): Promise<LocalKTVWorkloadItem[]> {
    const req = create(GetKTVWorkloadRequestSchema, {
        logType: params.logType,
        year: params.year,
        month: params.month,
    });
    const res = await trangBiLogClient.getKTVWorkload(req);
    if (!res.meta?.success) throw new Error(res.meta?.message ?? 'Lỗi tải workload');
    return (res.items ?? []).map(mapKTVWorkload);
}

export async function getLogStats(params: {
    logType: LogType;
    year: number;
    month?: number;
    quarter?: number;
}): Promise<LocalLogStats> {
    const req = create(GetLogStatsRequestSchema, {
        logType: params.logType,
        year: params.year,
        month: params.month ?? 0,
        quarter: params.quarter ?? 0,
    });
    const res = await trangBiLogClient.getLogStats(req);
    if (!res.meta?.success || !res.stats) throw new Error(res.meta?.message ?? 'Lỗi tải thống kê');
    return mapLogStats(res.stats);
}

export async function getQuarterGantt(params: {
    logType: LogType;
    year: number;
    quarter: number;
}): Promise<LocalGanttRow[]> {
    const req = create(GetQuarterGanttRequestSchema, {
        logType: params.logType,
        year: params.year,
        quarter: params.quarter,
    });
    const res = await trangBiLogClient.getQuarterGantt(req);
    if (!res.meta?.success) throw new Error(res.meta?.message ?? 'Lỗi tải Gantt');
    return (res.rows ?? []).map(mapGanttRow);
}

export async function getLogHistoryByTrangBi(params: {
    idTrangBi: string;
    logType?: LogType;
    limit?: number;
}): Promise<LocalTrangBiLogSummary[]> {
    const req = create(GetLogHistoryByTrangBiRequestSchema, {
        idTrangBi: params.idTrangBi,
        logType: params.logType ?? LogType.UNSPECIFIED,
        limit: params.limit ?? 50,
    });
    const res = await trangBiLogClient.getLogHistoryByTrangBi(req);
    if (!res.meta?.success) throw new Error(res.meta?.message ?? 'Lỗi tải lịch sử');
    return (res.items ?? []).map(mapSummary);
}

export async function getFieldSetsByLogType(loaiNv: string): Promise<LocalFieldSetDetail[]> {
    const req = create(GetFieldSetsByLogTypeRequestSchema, { loaiNghiepVu: loaiNv });
    const res = await trangBiLogClient.getFieldSetsByLogType(req);
    if (!res.meta?.success) throw new Error(res.meta?.message ?? 'Lỗi tải bộ dữ liệu');
    const mapped = (res.items ?? []).map((item) => ({
        fieldSet: {
            id: item.fieldSet?.id ?? '',
            name: item.fieldSet?.name ?? '',
            key: item.fieldSet?.key || undefined,
            icon: item.fieldSet?.icon ?? '',
            color: item.fieldSet?.color ?? '',
            desc: item.fieldSet?.desc || undefined,
            fieldIds: [...(item.fieldSet?.fieldIds ?? [])],
            maDanhMucTrangBi: [...(item.fieldSet?.maDanhMucTrangBi ?? [])],
        },
        fields: (item.fields ?? []).map((f) => ({
            id: f.id,
            key: f.key,
            label: f.label,
            type: f.type,
            required: f.required,
            disabled: f.disabled || undefined,
            validation: f.validation
                ? {
                    minLength: f.validation.minLength || undefined,
                    maxLength: f.validation.maxLength || undefined,
                    pattern: f.validation.pattern || undefined,
                    min: f.validation.min || undefined,
                    max: f.validation.max || undefined,
                    options: f.validation.options?.length ? [...f.validation.options] : undefined,
                    dataSource: f.validation.dataSource || undefined,
                    apiUrl: f.validation.apiUrl || undefined,
                    displayType: f.validation.displayType || undefined,
                }
                : undefined,
            cnIds: f.cnIds?.length ? [...f.cnIds] : undefined,
        })),
    }));
    return mergeFieldSetDetailsForLogType(mapped, loaiNv);
}

// ── Legacy type aliases for backward compatibility ───────────
// (existing components that import from '../types/trangBiLog' still work)
export type { LocalTrangBiLogSummary as TrangBiLogSummary };
export type { LocalTrangBiLog as TrangBiLog };
export type { LocalCalendarItem as TrangBiLogCalendarItem };
export type { LocalKTVWorkloadItem as KTVWorkloadItem };
export type { LocalLogStats as LogStats };
export type { LocalGanttRow as GanttRow };
export type { LocalFieldSetDetail as FieldSetDetailUI };
