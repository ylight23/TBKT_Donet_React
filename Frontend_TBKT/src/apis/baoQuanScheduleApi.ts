import { create } from '@bufbuild/protobuf';
import type { Timestamp } from '@bufbuild/protobuf/wkt';

import {
    BaoQuanScheduleItemSchema,
    DeleteBaoQuanScheduleRequestSchema,
    GetBaoQuanScheduleRequestSchema,
    GetListBaoQuanScheduleRequestSchema,
    SaveBaoQuanScheduleRequestSchema,
    type BaoQuanScheduleGridItem as BaoQuanScheduleGridItemProto,
    type BaoQuanScheduleItem as BaoQuanScheduleItemProto,
    type BaoQuanScheduleTrangBiItem as BaoQuanScheduleTrangBiItemProto,
} from '../grpc/generated/BaoQuanSchedule_pb';
import { baoQuanScheduleClient } from '../grpc/grpcClient';

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

export interface LocalBaoQuanScheduleTrangBiItem {
    idTrangBi: string;
    nhomTrangBi: number;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    idChuyenNganhKt: string;
    idNganh: string;
    parameters: Record<string, string>;
}

export interface LocalBaoQuanScheduleItem {
    id: string;
    tenLichBaoQuan: string;
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
    dsTrangBi: LocalBaoQuanScheduleTrangBiItem[];
    parameters: Record<string, string>;
    nguoiTao?: string;
    nguoiSua?: string;
    ngayTao?: string;
    ngaySua?: string;
    version: number;
}

export interface LocalBaoQuanScheduleGridItem {
    id: string;
    tenLichBaoQuan: string;
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

export interface LocalBaoQuanScheduleByTrangBiItem extends LocalBaoQuanScheduleGridItem {
    memberNhomTrangBi: number;
    memberMaDanhMuc: string;
    memberTenDanhMuc: string;
    memberSoHieu: string;
    memberIdChuyenNganhKt: string;
    memberIdNganh: string;
}

function mapMember(item: BaoQuanScheduleTrangBiItemProto): LocalBaoQuanScheduleTrangBiItem {
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

function mapItem(item?: BaoQuanScheduleItemProto): LocalBaoQuanScheduleItem {
    if (!item) {
        return {
            id: '',
            tenLichBaoQuan: '',
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
        tenLichBaoQuan: item.tenLichBaoQuan,
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

function mapGrid(item: BaoQuanScheduleGridItemProto): LocalBaoQuanScheduleGridItem {
    return {
        id: item.id,
        tenLichBaoQuan: item.tenLichBaoQuan,
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

export async function getListBaoQuanSchedule(params: {
    idDonVi?: string;
    idChuyenNganhKt?: string;
    searchText?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<LocalBaoQuanScheduleGridItem[]> {
    const req = create(GetListBaoQuanScheduleRequestSchema, {
        idDonVi: params.idDonVi || undefined,
        idChuyenNganhKt: params.idChuyenNganhKt || undefined,
        searchText: params.searchText || undefined,
        fromDate: isoToTimestamp(params.fromDate),
        toDate: isoToTimestamp(params.toDate),
    });

    const res = await baoQuanScheduleClient.getListBaoQuanSchedule(req);
    if (!res.success) {
        throw new Error(res.message || 'Khong the lay danh sach lich bao quan.');
    }
    return (res.items ?? []).map(mapGrid);
}

export async function getBaoQuanSchedule(id: string): Promise<LocalBaoQuanScheduleItem> {
    const req = create(GetBaoQuanScheduleRequestSchema, { id });
    const res = await baoQuanScheduleClient.getBaoQuanSchedule(req);
    if (!res.success || !res.item) {
        throw new Error(res.message || 'Khong the lay chi tiet lich bao quan.');
    }
    return mapItem(res.item);
}

export async function saveBaoQuanSchedule(payload: {
    item: LocalBaoQuanScheduleItem;
    expectedVersion?: number;
}): Promise<{ id: string; success: boolean; message: string }> {
    const protoItem = create(BaoQuanScheduleItemSchema, {
        id: payload.item.id || '',
        tenLichBaoQuan: payload.item.tenLichBaoQuan || '',
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

    const req = create(SaveBaoQuanScheduleRequestSchema, {
        item: protoItem,
        expectedVersion: typeof payload.expectedVersion === 'number' ? payload.expectedVersion : undefined,
    });

    const res = await baoQuanScheduleClient.saveBaoQuanSchedule(req);
    if (!res.success) {
        throw new Error(res.message || 'Khong the luu lich bao quan.');
    }
    return {
        id: res.id,
        success: res.success,
        message: res.message,
    };
}

export async function deleteBaoQuanSchedule(id: string): Promise<void> {
    const req = create(DeleteBaoQuanScheduleRequestSchema, { id });
    const res = await baoQuanScheduleClient.deleteBaoQuanSchedule(req);
    if (!res.success) {
        throw new Error(res.message || 'Khong the xoa lich bao quan.');
    }
}

export async function getBaoQuanSchedulesByTrangBi(idTrangBi: string): Promise<LocalBaoQuanScheduleByTrangBiItem[]> {
    const normalizedId = String(idTrangBi ?? '').trim();
    if (!normalizedId) return [];

    const gridItems = await getListBaoQuanSchedule({});
    if (gridItems.length === 0) return [];

    const detailItems = await Promise.all(
        gridItems.map(async (grid) => {
            try {
                const detail = await getBaoQuanSchedule(grid.id);
                return { grid, detail };
            } catch {
                return null;
            }
        }),
    );

    const matched: LocalBaoQuanScheduleByTrangBiItem[] = [];
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
