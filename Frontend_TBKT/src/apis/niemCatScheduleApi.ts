import { create } from '@bufbuild/protobuf';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import {
    DeleteNiemCatScheduleRequestSchema,
    GetNiemCatScheduleRequestSchema,
    GetListNiemCatScheduleRequestSchema,
    GetListNiemCatScheduleByTrangBiRequestSchema,
    SaveNiemCatScheduleRequestSchema,
    NiemCatScheduleItemSchema,
    type NiemCatScheduleGridItem as NiemCatScheduleGridItemProto,
    type NiemCatScheduleItem as NiemCatScheduleItemProto,
    type NiemCatScheduleTrangBiItem as NiemCatScheduleTrangBiItemProto,
} from '../grpc/generated/NiemCatSchedule_pb';
import { niemCatScheduleClient } from '../grpc/grpcClient';

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

export interface LocalNiemCatScheduleTrangBiItem {
    idTrangBi: string;
    nhomTrangBi: number;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    idChuyenNganhKt: string;
    idNganh: string;
    parameters: Record<string, string>;
}

export interface LocalNiemCatScheduleItem {
    id: string;
    tenNiemCat: string;
    canCu: string;
    loaiDeNghi: string;
    loaiNiemCat: string;
    donViThucHien: string;
    nguoiThucHien: string;
    ngayNiemCat?: string;
    ketQuaThucHien: string;
    dsTrangBi: LocalNiemCatScheduleTrangBiItem[];
    parameters: Record<string, string>;
    nguoiTao?: string;
    nguoiSua?: string;
    ngayTao?: string;
    ngaySua?: string;
    version: number;
}

export interface LocalNiemCatScheduleGridItem {
    id: string;
    tenNiemCat: string;
    canCu: string;
    loaiDeNghi: string;
    loaiNiemCat: string;
    donViThucHien: string;
    nguoiThucHien: string;
    ngayNiemCat?: string;
    ketQuaThucHien: string;
    soTrangBi: number;
    nguoiSua: string;
    ngaySua?: string;
}

function mapMember(item: NiemCatScheduleTrangBiItemProto): LocalNiemCatScheduleTrangBiItem {
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

function mapItem(item?: NiemCatScheduleItemProto): LocalNiemCatScheduleItem {
    if (!item) {
        return {
            id: '',
            tenNiemCat: '',
            canCu: '',
            loaiDeNghi: '',
            loaiNiemCat: '',
            donViThucHien: '',
            nguoiThucHien: '',
            ketQuaThucHien: '',
            dsTrangBi: [],
            parameters: {},
            version: 0,
        };
    }

    return {
        id: item.id,
        tenNiemCat: item.tenNiemCat,
        canCu: item.canCu,
        loaiDeNghi: item.loaiDeNghi,
        loaiNiemCat: item.loaiNiemCat,
        donViThucHien: item.donViThucHien,
        nguoiThucHien: item.nguoiThucHien,
        ngayNiemCat: timestampToIso(item.ngayNiemCat),
        ketQuaThucHien: item.ketQuaThucHien,
        dsTrangBi: (item.dsTrangBi ?? []).map(mapMember),
        parameters: { ...(item.parameters ?? {}) },
        nguoiTao: item.nguoiTao,
        nguoiSua: item.nguoiSua,
        ngayTao: timestampToIso(item.ngayTao),
        ngaySua: timestampToIso(item.ngaySua),
        version: item.version ?? 0,
    };
}

function mapGrid(item: NiemCatScheduleGridItemProto): LocalNiemCatScheduleGridItem {
    return {
        id: item.id,
        tenNiemCat: item.tenNiemCat,
        canCu: item.canCu,
        loaiDeNghi: item.loaiDeNghi,
        loaiNiemCat: item.loaiNiemCat,
        donViThucHien: item.donViThucHien,
        nguoiThucHien: item.nguoiThucHien,
        ngayNiemCat: timestampToIso(item.ngayNiemCat),
        ketQuaThucHien: item.ketQuaThucHien,
        soTrangBi: item.soTrangBi,
        nguoiSua: item.nguoiSua,
        ngaySua: timestampToIso(item.ngaySua),
    };
}

export async function getListNiemCatSchedule(params: {
    donViThucHien?: string;
    idChuyenNganhKt?: string;
    searchText?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<LocalNiemCatScheduleGridItem[]> {
    const req = create(GetListNiemCatScheduleRequestSchema, {
        donViThucHien: params.donViThucHien || undefined,
        idChuyenNganhKt: params.idChuyenNganhKt || undefined,
        searchText: params.searchText || undefined,
        fromDate: isoToTimestamp(params.fromDate),
        toDate: isoToTimestamp(params.toDate),
    });
    const res = await niemCatScheduleClient.getListNiemCatSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the lay danh sach lich niem cat.');
    return (res.items ?? []).map(mapGrid);
}

export async function getNiemCatSchedule(id: string): Promise<LocalNiemCatScheduleItem> {
    const req = create(GetNiemCatScheduleRequestSchema, { id });
    const res = await niemCatScheduleClient.getNiemCatSchedule(req);
    if (!res.success || !res.item) throw new Error(res.message || 'Khong the lay chi tiet lich niem cat.');
    return mapItem(res.item);
}

export async function getNiemCatSchedulesByTrangBi(
    idTrangBi: string,
    nhomTrangBi: number,
): Promise<LocalNiemCatScheduleGridItem[]> {
    const normalizedId = String(idTrangBi ?? '').trim();
    if (!normalizedId) return [];

    const req = create(GetListNiemCatScheduleByTrangBiRequestSchema, {
        idTrangBi: normalizedId,
        nhomTrangBi,
    });
    const res = await niemCatScheduleClient.getListNiemCatScheduleByTrangBi(req);
    if (!res.success) throw new Error(res.message || 'Khong the lay lich niem cat theo trang bi.');
    return (res.items ?? []).map(mapGrid);
}

export async function saveNiemCatSchedule(payload: {
    item: LocalNiemCatScheduleItem;
    expectedVersion?: number;
}): Promise<{ id: string; success: boolean; message: string }> {
    const protoItem = create(NiemCatScheduleItemSchema, {
        id: payload.item.id || '',
        tenNiemCat: payload.item.tenNiemCat || '',
        canCu: payload.item.canCu || '',
        loaiDeNghi: payload.item.loaiDeNghi || '',
        loaiNiemCat: payload.item.loaiNiemCat || '',
        donViThucHien: payload.item.donViThucHien || '',
        nguoiThucHien: payload.item.nguoiThucHien || '',
        ngayNiemCat: isoToTimestamp(payload.item.ngayNiemCat),
        ketQuaThucHien: payload.item.ketQuaThucHien || '',
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

    const req = create(SaveNiemCatScheduleRequestSchema, {
        item: protoItem,
        expectedVersion: typeof payload.expectedVersion === 'number' ? payload.expectedVersion : undefined,
    });
    const res = await niemCatScheduleClient.saveNiemCatSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the luu lich niem cat.');
    return { id: res.id, success: res.success, message: res.message };
}

export async function deleteNiemCatSchedule(id: string): Promise<void> {
    const req = create(DeleteNiemCatScheduleRequestSchema, { id });
    const res = await niemCatScheduleClient.deleteNiemCatSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the xoa lich niem cat.');
}
