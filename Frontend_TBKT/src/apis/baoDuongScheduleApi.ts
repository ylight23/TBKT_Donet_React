import { create } from '@bufbuild/protobuf';
import type { Timestamp } from '@bufbuild/protobuf/wkt';

import {
    BaoDuongScheduleItemSchema,
    GetBaoDuongScheduleRequestSchema,
    GetListBaoDuongScheduleRequestSchema,
    SaveBaoDuongScheduleRequestSchema,
    DeleteBaoDuongScheduleRequestSchema,
    type BaoDuongScheduleGridItem as BaoDuongScheduleGridItemProto,
    type BaoDuongScheduleItem as BaoDuongScheduleItemProto,
    type BaoDuongScheduleTrangBiItem as BaoDuongScheduleTrangBiItemProto,
} from '../grpc/generated/BaoDuongSchedule_pb';
import { baoDuongScheduleClient } from '../grpc/grpcClient';

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
    return {
        seconds: BigInt(Math.floor(ms / 1000)),
        nanos: (ms % 1000) * 1_000_000,
    };
};

export interface LocalBaoDuongScheduleTrangBiItem {
    idTrangBi: string;
    nhomTrangBi: number;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    idChuyenNganhKt: string;
    idNganh: string;
    parameters: Record<string, string>;
}

export interface LocalBaoDuongScheduleItem {
    id: string;
    tenLichBaoDuong: string;
    canCu: string;
    idDonVi: string;
    tenDonVi: string;
    nguoiPhuTrach: string;
    thoiGianLap?: string;
    thoiGianThucHien?: string;
    thoiGianKetThuc?: string;
    noiDungCongViec: string;
    vatChatBaoDam: string;
    ketQua: string;
    dsTrangBi: LocalBaoDuongScheduleTrangBiItem[];
    parameters: Record<string, string>;
    nguoiTao?: string;
    nguoiSua?: string;
    ngayTao?: string;
    ngaySua?: string;
    version: number;
}

export interface LocalBaoDuongScheduleGridItem {
    id: string;
    tenLichBaoDuong: string;
    canCu: string;
    idDonVi: string;
    tenDonVi: string;
    nguoiPhuTrach: string;
    thoiGianLap?: string;
    thoiGianThucHien?: string;
    thoiGianKetThuc?: string;
    soTrangBi: number;
    nguoiSua: string;
    ngaySua?: string;
}

export interface LocalBaoDuongScheduleByTrangBiItem extends LocalBaoDuongScheduleGridItem {
    memberNhomTrangBi: number;
    memberMaDanhMuc: string;
    memberTenDanhMuc: string;
    memberSoHieu: string;
    memberIdChuyenNganhKt: string;
    memberIdNganh: string;
}

function mapMember(item: BaoDuongScheduleTrangBiItemProto): LocalBaoDuongScheduleTrangBiItem {
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

function mapItem(item?: BaoDuongScheduleItemProto): LocalBaoDuongScheduleItem {
    if (!item) {
        return {
            id: '',
            tenLichBaoDuong: '',
            canCu: '',
            idDonVi: '',
            tenDonVi: '',
            nguoiPhuTrach: '',
            noiDungCongViec: '',
            vatChatBaoDam: '',
            ketQua: '',
            dsTrangBi: [],
            parameters: {},
            version: 0,
        };
    }

    return {
        id: item.id,
        tenLichBaoDuong: item.tenLichBaoDuong,
        canCu: item.canCu,
        idDonVi: item.idDonVi,
        tenDonVi: item.tenDonVi,
        nguoiPhuTrach: item.nguoiPhuTrach,
        thoiGianLap: timestampToIso(item.thoiGianLap),
        thoiGianThucHien: timestampToIso(item.thoiGianThucHien),
        thoiGianKetThuc: timestampToIso(item.thoiGianKetThuc),
        noiDungCongViec: item.noiDungCongViec,
        vatChatBaoDam: item.vatChatBaoDam,
        ketQua: item.ketQua,
        dsTrangBi: (item.dsTrangBi ?? []).map(mapMember),
        parameters: { ...(item.parameters ?? {}) },
        nguoiTao: item.nguoiTao,
        nguoiSua: item.nguoiSua,
        ngayTao: timestampToIso(item.ngayTao),
        ngaySua: timestampToIso(item.ngaySua),
        version: item.version ?? 0,
    };
}

function mapGrid(item: BaoDuongScheduleGridItemProto): LocalBaoDuongScheduleGridItem {
    return {
        id: item.id,
        tenLichBaoDuong: item.tenLichBaoDuong,
        canCu: item.canCu,
        idDonVi: item.idDonVi,
        tenDonVi: item.tenDonVi,
        nguoiPhuTrach: item.nguoiPhuTrach,
        thoiGianLap: timestampToIso(item.thoiGianLap),
        thoiGianThucHien: timestampToIso(item.thoiGianThucHien),
        thoiGianKetThuc: timestampToIso(item.thoiGianKetThuc),
        soTrangBi: item.soTrangBi,
        nguoiSua: item.nguoiSua,
        ngaySua: timestampToIso(item.ngaySua),
    };
}

export async function getListBaoDuongSchedule(params: {
    idDonVi?: string;
    idChuyenNganhKt?: string;
    searchText?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<LocalBaoDuongScheduleGridItem[]> {
    const req = create(GetListBaoDuongScheduleRequestSchema, {
        idDonVi: params.idDonVi || undefined,
        idChuyenNganhKt: params.idChuyenNganhKt || undefined,
        searchText: params.searchText || undefined,
        fromDate: isoToTimestamp(params.fromDate),
        toDate: isoToTimestamp(params.toDate),
    });

    const res = await baoDuongScheduleClient.getListBaoDuongSchedule(req);
    if (!res.success) {
        throw new Error(res.message || 'Khong the lay danh sach lich bao duong.');
    }
    return (res.items ?? []).map(mapGrid);
}

export async function getBaoDuongSchedule(id: string): Promise<LocalBaoDuongScheduleItem> {
    const req = create(GetBaoDuongScheduleRequestSchema, { id });
    const res = await baoDuongScheduleClient.getBaoDuongSchedule(req);
    if (!res.success || !res.item) {
        throw new Error(res.message || 'Khong the lay chi tiet lich bao duong.');
    }
    return mapItem(res.item);
}

export async function saveBaoDuongSchedule(payload: {
    item: LocalBaoDuongScheduleItem;
    expectedVersion?: number;
}): Promise<{ id: string; success: boolean; message: string }> {
    const protoItem = create(BaoDuongScheduleItemSchema, {
        id: payload.item.id || '',
        tenLichBaoDuong: payload.item.tenLichBaoDuong || '',
        canCu: payload.item.canCu || '',
        idDonVi: payload.item.idDonVi || '',
        tenDonVi: payload.item.tenDonVi || '',
        nguoiPhuTrach: payload.item.nguoiPhuTrach || '',
        thoiGianLap: isoToTimestamp(payload.item.thoiGianLap),
        thoiGianThucHien: isoToTimestamp(payload.item.thoiGianThucHien),
        thoiGianKetThuc: isoToTimestamp(payload.item.thoiGianKetThuc),
        noiDungCongViec: payload.item.noiDungCongViec || '',
        vatChatBaoDam: payload.item.vatChatBaoDam || '',
        ketQua: payload.item.ketQua || '',
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

    const req = create(SaveBaoDuongScheduleRequestSchema, {
        item: protoItem,
        expectedVersion: typeof payload.expectedVersion === 'number' ? payload.expectedVersion : undefined,
    });

    const res = await baoDuongScheduleClient.saveBaoDuongSchedule(req);
    if (!res.success) {
        throw new Error(res.message || 'Khong the luu lich bao duong.');
    }
    return {
        id: res.id,
        success: res.success,
        message: res.message,
    };
}

export async function deleteBaoDuongSchedule(id: string): Promise<void> {
    const req = create(DeleteBaoDuongScheduleRequestSchema, { id });
    const res = await baoDuongScheduleClient.deleteBaoDuongSchedule(req);
    if (!res.success) {
        throw new Error(res.message || 'Khong the xoa lich bao duong.');
    }
}

export async function getBaoDuongSchedulesByTrangBi(idTrangBi: string): Promise<LocalBaoDuongScheduleByTrangBiItem[]> {
    const normalizedId = String(idTrangBi ?? '').trim();
    if (!normalizedId) return [];

    const gridItems = await getListBaoDuongSchedule({});
    if (gridItems.length === 0) return [];

    const detailItems = await Promise.all(
        gridItems.map(async (grid) => {
            try {
                const detail = await getBaoDuongSchedule(grid.id);
                return { grid, detail };
            } catch {
                return null;
            }
        }),
    );

    const matched: LocalBaoDuongScheduleByTrangBiItem[] = [];
    detailItems.forEach((item) => {
        if (!item) return;
        const member = item.detail.dsTrangBi.find((m) => String(m.idTrangBi ?? '').trim() === normalizedId);
        if (!member) return;
        matched.push({
            ...item.grid,
            memberNhomTrangBi: member.nhomTrangBi,
            memberMaDanhMuc: member.maDanhMuc,
            memberTenDanhMuc: member.tenDanhMuc,
            memberSoHieu: member.soHieu,
            memberIdChuyenNganhKt: member.idChuyenNganhKt,
            memberIdNganh: member.idNganh,
        });
    });

    matched.sort((a, b) => {
        const ta = new Date(a.thoiGianThucHien || a.thoiGianLap || '1970-01-01').getTime();
        const tb = new Date(b.thoiGianThucHien || b.thoiGianLap || '1970-01-01').getTime();
        return tb - ta;
    });

    return matched;
}
