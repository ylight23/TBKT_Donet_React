import { create } from '@bufbuild/protobuf';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import {
    DeleteDieuDongScheduleRequestSchema,
    GetDieuDongScheduleRequestSchema,
    GetListDieuDongScheduleRequestSchema,
    SaveDieuDongScheduleRequestSchema,
    DieuDongScheduleItemSchema,
    type DieuDongScheduleGridItem as DieuDongScheduleGridItemProto,
    type DieuDongScheduleItem as DieuDongScheduleItemProto,
    type DieuDongScheduleTrangBiItem as DieuDongScheduleTrangBiItemProto,
} from '../grpc/generated/DieuDongSchedule_pb';
import { dieuDongScheduleClient } from '../grpc/grpcClient';

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

export interface LocalDieuDongScheduleTrangBiItem {
    idTrangBi: string;
    nhomTrangBi: number;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    idChuyenNganhKt: string;
    idNganh: string;
    parameters: Record<string, string>;
}

export interface LocalDieuDongScheduleItem {
    id: string;
    tenDieuDong: string;
    canCu: string;
    donViGiao: string;
    donViNhan: string;
    nguoiPhuTrach: string;
    thoiGianThucHien?: string;
    thoiGianKetThuc?: string;
    ghiChu: string;
    dsTrangBi: LocalDieuDongScheduleTrangBiItem[];
    parameters: Record<string, string>;
    nguoiTao?: string;
    nguoiSua?: string;
    ngayTao?: string;
    ngaySua?: string;
    version: number;
}

export interface LocalDieuDongScheduleGridItem {
    id: string;
    tenDieuDong: string;
    canCu: string;
    donViGiao: string;
    donViNhan: string;
    nguoiPhuTrach: string;
    thoiGianThucHien?: string;
    thoiGianKetThuc?: string;
    soTrangBi: number;
    nguoiSua: string;
    ngaySua?: string;
}

function mapMember(item: DieuDongScheduleTrangBiItemProto): LocalDieuDongScheduleTrangBiItem {
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

function mapItem(item?: DieuDongScheduleItemProto): LocalDieuDongScheduleItem {
    if (!item) {
        return {
            id: '',
            tenDieuDong: '',
            canCu: '',
            donViGiao: '',
            donViNhan: '',
            nguoiPhuTrach: '',
            ghiChu: '',
            dsTrangBi: [],
            parameters: {},
            version: 0,
        };
    }

    return {
        id: item.id,
        tenDieuDong: item.tenDieuDong,
        canCu: item.canCu,
        donViGiao: item.donViGiao,
        donViNhan: item.donViNhan,
        nguoiPhuTrach: item.nguoiPhuTrach,
        thoiGianThucHien: timestampToIso(item.thoiGianThucHien),
        thoiGianKetThuc: timestampToIso(item.thoiGianKetThuc),
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

function mapGrid(item: DieuDongScheduleGridItemProto): LocalDieuDongScheduleGridItem {
    return {
        id: item.id,
        tenDieuDong: item.tenDieuDong,
        canCu: item.canCu,
        donViGiao: item.donViGiao,
        donViNhan: item.donViNhan,
        nguoiPhuTrach: item.nguoiPhuTrach,
        thoiGianThucHien: timestampToIso(item.thoiGianThucHien),
        thoiGianKetThuc: timestampToIso(item.thoiGianKetThuc),
        soTrangBi: item.soTrangBi,
        nguoiSua: item.nguoiSua,
        ngaySua: timestampToIso(item.ngaySua),
    };
}

export async function getListDieuDongSchedule(params: {
    donVi?: string;
    idChuyenNganhKt?: string;
    searchText?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<LocalDieuDongScheduleGridItem[]> {
    const req = create(GetListDieuDongScheduleRequestSchema, {
        donVi: params.donVi || undefined,
        idChuyenNganhKt: params.idChuyenNganhKt || undefined,
        searchText: params.searchText || undefined,
        fromDate: isoToTimestamp(params.fromDate),
        toDate: isoToTimestamp(params.toDate),
    });
    const res = await dieuDongScheduleClient.getListDieuDongSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the lay danh sach lich dieu dong.');
    return (res.items ?? []).map(mapGrid);
}

export async function getDieuDongSchedule(id: string): Promise<LocalDieuDongScheduleItem> {
    const req = create(GetDieuDongScheduleRequestSchema, { id });
    const res = await dieuDongScheduleClient.getDieuDongSchedule(req);
    if (!res.success || !res.item) throw new Error(res.message || 'Khong the lay chi tiet lich dieu dong.');
    return mapItem(res.item);
}

export async function saveDieuDongSchedule(payload: {
    item: LocalDieuDongScheduleItem;
    expectedVersion?: number;
}): Promise<{ id: string; success: boolean; message: string }> {
    const protoItem = create(DieuDongScheduleItemSchema, {
        id: payload.item.id || '',
        tenDieuDong: payload.item.tenDieuDong || '',
        canCu: payload.item.canCu || '',
        donViGiao: payload.item.donViGiao || '',
        donViNhan: payload.item.donViNhan || '',
        nguoiPhuTrach: payload.item.nguoiPhuTrach || '',
        thoiGianThucHien: isoToTimestamp(payload.item.thoiGianThucHien),
        thoiGianKetThuc: isoToTimestamp(payload.item.thoiGianKetThuc),
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

    const req = create(SaveDieuDongScheduleRequestSchema, {
        item: protoItem,
        expectedVersion: typeof payload.expectedVersion === 'number' ? payload.expectedVersion : undefined,
    });
    const res = await dieuDongScheduleClient.saveDieuDongSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the luu lich dieu dong.');
    return { id: res.id, success: res.success, message: res.message };
}

export async function deleteDieuDongSchedule(id: string): Promise<void> {
    const req = create(DeleteDieuDongScheduleRequestSchema, { id });
    const res = await dieuDongScheduleClient.deleteDieuDongSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the xoa lich dieu dong.');
}
