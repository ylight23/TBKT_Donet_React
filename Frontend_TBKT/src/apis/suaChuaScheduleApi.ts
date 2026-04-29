import { create } from '@bufbuild/protobuf';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import {
    DeleteSuaChuaScheduleRequestSchema,
    GetSuaChuaScheduleRequestSchema,
    GetListSuaChuaScheduleRequestSchema,
    GetListSuaChuaScheduleByTrangBiRequestSchema,
    SaveSuaChuaScheduleRequestSchema,
    SuaChuaScheduleItemSchema,
    type SuaChuaScheduleGridItem as SuaChuaScheduleGridItemProto,
    type SuaChuaScheduleItem as SuaChuaScheduleItemProto,
    type SuaChuaScheduleTrangBiItem as SuaChuaScheduleTrangBiItemProto,
} from '../grpc/generated/SuaChuaSchedule_pb';
import { suaChuaScheduleClient } from '../grpc/grpcClient';

const timestampToIso = (ts?: Timestamp | null): string | undefined => {
    if (!ts) return undefined;
    const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
};

const isoToTimestamp = (value?: string): { seconds: bigint; nanos: number } | undefined => {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    const ms = d.getTime();
    return { seconds: BigInt(Math.floor(ms / 1000)), nanos: (ms % 1000) * 1_000_000 };
};

export interface LocalSuaChuaScheduleTrangBiItem {
    idTrangBi: string;
    nhomTrangBi: number;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    idChuyenNganhKt: string;
    idNganh: string;
    parameters: Record<string, string>;
}

export interface LocalSuaChuaScheduleItem {
    id: string;
    tenSuaChua: string;
    canCu: string;
    mucSuaChua: string;
    capSuaChua: string;
    donViSuaChua: string;
    donViDeNghi: string;
    ngayDeNghi?: string;
    ghiChu: string;
    dsTrangBi: LocalSuaChuaScheduleTrangBiItem[];
    parameters: Record<string, string>;
    nguoiTao?: string;
    nguoiSua?: string;
    ngayTao?: string;
    ngaySua?: string;
    version: number;
}

export interface LocalSuaChuaScheduleGridItem {
    id: string;
    tenSuaChua: string;
    canCu: string;
    mucSuaChua: string;
    capSuaChua: string;
    donViSuaChua: string;
    donViDeNghi: string;
    ngayDeNghi?: string;
    soTrangBi: number;
    nguoiSua: string;
    ngaySua?: string;
}

function mapMember(item: SuaChuaScheduleTrangBiItemProto): LocalSuaChuaScheduleTrangBiItem {
    return {
        idTrangBi: item.idTrangBi,
        nhomTrangBi: item.nhomTrangBi,
        maDanhMuc: item.maDanhMuc,
        tenDanhMuc: item.tenDanhMuc,
        soHieu: item.soHieu,
        idChuyenNganhKt: item.idChuyenNganhKt,
        idNganh: item.idNganh,
        parameters: { ...(item.parameters ?? {}) },
    };
}

function mapItem(item?: SuaChuaScheduleItemProto): LocalSuaChuaScheduleItem {
    if (!item) {
        return {
            id: '',
            tenSuaChua: '',
            canCu: '',
            mucSuaChua: '',
            capSuaChua: '',
            donViSuaChua: '',
            donViDeNghi: '',
            ghiChu: '',
            dsTrangBi: [],
            parameters: {},
            version: 0,
        };
    }

    return {
        id: item.id,
        tenSuaChua: item.tenSuaChua,
        canCu: item.canCu,
        mucSuaChua: item.mucSuaChua,
        capSuaChua: item.capSuaChua,
        donViSuaChua: item.donViSuaChua,
        donViDeNghi: item.donViDeNghi,
        ngayDeNghi: timestampToIso(item.ngayDeNghi),
        ghiChu: item.ghiChu,
        dsTrangBi: (item.dsTrangBi ?? []).map(mapMember),
        parameters: { ...(item.parameters ?? {}) },
        nguoiTao: item.nguoiTao,
        nguoiSua: item.nguoiSua,
        ngayTao: timestampToIso(item.ngayTao),
        ngaySua: timestampToIso(item.ngaySua),
        version: item.version ?? 0,
    };
}

function mapGrid(item: SuaChuaScheduleGridItemProto): LocalSuaChuaScheduleGridItem {
    return {
        id: item.id,
        tenSuaChua: item.tenSuaChua,
        canCu: item.canCu,
        mucSuaChua: item.mucSuaChua,
        capSuaChua: item.capSuaChua,
        donViSuaChua: item.donViSuaChua,
        donViDeNghi: item.donViDeNghi,
        ngayDeNghi: timestampToIso(item.ngayDeNghi),
        soTrangBi: item.soTrangBi,
        nguoiSua: item.nguoiSua,
        ngaySua: timestampToIso(item.ngaySua),
    };
}

export async function getListSuaChuaSchedule(params: {
    donViSuaChua?: string;
    idChuyenNganhKt?: string;
    searchText?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<LocalSuaChuaScheduleGridItem[]> {
    const req = create(GetListSuaChuaScheduleRequestSchema, {
        donViSuaChua: params.donViSuaChua || undefined,
        idChuyenNganhKt: params.idChuyenNganhKt || undefined,
        searchText: params.searchText || undefined,
        fromDate: isoToTimestamp(params.fromDate),
        toDate: isoToTimestamp(params.toDate),
    });
    const res = await suaChuaScheduleClient.getListSuaChuaSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the lay danh sach lich sua chua.');
    return (res.items ?? []).map(mapGrid);
}

export async function getSuaChuaSchedule(id: string): Promise<LocalSuaChuaScheduleItem> {
    const req = create(GetSuaChuaScheduleRequestSchema, { id });
    const res = await suaChuaScheduleClient.getSuaChuaSchedule(req);
    if (!res.success || !res.item) throw new Error(res.message || 'Khong the lay chi tiet lich sua chua.');
    return mapItem(res.item);
}

export async function getSuaChuaSchedulesByTrangBi(
    idTrangBi: string,
    nhomTrangBi: number,
): Promise<LocalSuaChuaScheduleGridItem[]> {
    const normalizedId = String(idTrangBi ?? '').trim();
    if (!normalizedId) return [];

    const req = create(GetListSuaChuaScheduleByTrangBiRequestSchema, {
        idTrangBi: normalizedId,
        nhomTrangBi,
    });
    const res = await suaChuaScheduleClient.getListSuaChuaScheduleByTrangBi(req);
    if (!res.success) throw new Error(res.message || 'Khong the lay lich sua chua theo trang bi.');
    return (res.items ?? []).map(mapGrid);
}

export async function saveSuaChuaSchedule(payload: {
    item: LocalSuaChuaScheduleItem;
    expectedVersion?: number;
}): Promise<{ id: string; success: boolean; message: string }> {
    const protoItem = create(SuaChuaScheduleItemSchema, {
        id: payload.item.id || '',
        tenSuaChua: payload.item.tenSuaChua || '',
        canCu: payload.item.canCu || '',
        mucSuaChua: payload.item.mucSuaChua || '',
        capSuaChua: payload.item.capSuaChua || '',
        donViSuaChua: payload.item.donViSuaChua || '',
        donViDeNghi: payload.item.donViDeNghi || '',
        ngayDeNghi: isoToTimestamp(payload.item.ngayDeNghi),
        ghiChu: payload.item.ghiChu || '',
        dsTrangBi: (payload.item.dsTrangBi ?? []).map((member) => ({
            idTrangBi: member.idTrangBi,
            nhomTrangBi: member.nhomTrangBi,
            maDanhMuc: member.maDanhMuc || '',
            tenDanhMuc: member.tenDanhMuc || '',
            soHieu: member.soHieu || '',
            idChuyenNganhKt: member.idChuyenNganhKt || '',
            idNganh: member.idNganh || '',
            parameters: { ...(member.parameters ?? {}) },
        })),
        parameters: { ...(payload.item.parameters ?? {}) },
        version: payload.item.version ?? 0,
    });

    const req = create(SaveSuaChuaScheduleRequestSchema, {
        item: protoItem,
        expectedVersion: typeof payload.expectedVersion === 'number' ? payload.expectedVersion : undefined,
    });
    const res = await suaChuaScheduleClient.saveSuaChuaSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the luu lich sua chua.');
    return { id: res.id, success: res.success, message: res.message };
}

export async function deleteSuaChuaSchedule(id: string): Promise<void> {
    const req = create(DeleteSuaChuaScheduleRequestSchema, { id });
    const res = await suaChuaScheduleClient.deleteSuaChuaSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the xoa lich sua chua.');
}
