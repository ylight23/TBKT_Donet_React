import { create } from '@bufbuild/protobuf';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import {
    DeleteChuyenCapChatLuongScheduleRequestSchema,
    GetChuyenCapChatLuongScheduleRequestSchema,
    GetListChuyenCapChatLuongScheduleRequestSchema,
    SaveChuyenCapChatLuongScheduleRequestSchema,
    ChuyenCapChatLuongScheduleItemSchema,
    type ChuyenCapChatLuongScheduleGridItem as ChuyenCapChatLuongScheduleGridItemProto,
    type ChuyenCapChatLuongScheduleItem as ChuyenCapChatLuongScheduleItemProto,
    type ChuyenCapChatLuongScheduleTrangBiItem as ChuyenCapChatLuongScheduleTrangBiItemProto,
} from '../grpc/generated/ChuyenCapChatLuongSchedule_pb';
import { chuyenCapChatLuongScheduleClient } from '../grpc/grpcClient';

const timestampToIso = (ts?: Timestamp | null): string | undefined => {
    if (!ts) return undefined;
    const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
};

export interface LocalChuyenCapChatLuongScheduleTrangBiItem {
    idTrangBi: string;
    nhomTrangBi: number;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    idChuyenNganhKt: string;
    idNganh: string;
    parameters: Record<string, string>;
}

export interface LocalChuyenCapChatLuongScheduleItem {
    id: string;
    tenChuyenCapChatLuong: string;
    canCu: string;
    soMenhLenh: string;
    capChatLuong: string;
    donViThucHien: string;
    ghiChu: string;
    dsTrangBi: LocalChuyenCapChatLuongScheduleTrangBiItem[];
    parameters: Record<string, string>;
    nguoiTao?: string;
    nguoiSua?: string;
    ngayTao?: string;
    ngaySua?: string;
    version: number;
}

export interface LocalChuyenCapChatLuongScheduleGridItem {
    id: string;
    tenChuyenCapChatLuong: string;
    canCu: string;
    soMenhLenh: string;
    capChatLuong: string;
    donViThucHien: string;
    soTrangBi: number;
    nguoiSua: string;
    ngaySua?: string;
}

function mapMember(item: ChuyenCapChatLuongScheduleTrangBiItemProto): LocalChuyenCapChatLuongScheduleTrangBiItem {
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

function mapItem(item?: ChuyenCapChatLuongScheduleItemProto): LocalChuyenCapChatLuongScheduleItem {
    if (!item) {
        return {
            id: '',
            tenChuyenCapChatLuong: '',
            canCu: '',
            soMenhLenh: '',
            capChatLuong: '',
            donViThucHien: '',
            ghiChu: '',
            dsTrangBi: [],
            parameters: {},
            version: 0,
        };
    }

    return {
        id: item.id,
        tenChuyenCapChatLuong: item.tenChuyenCapChatLuong,
        canCu: item.canCu,
        soMenhLenh: item.soMenhLenh,
        capChatLuong: item.capChatLuong,
        donViThucHien: item.donViThucHien,
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

function mapGrid(item: ChuyenCapChatLuongScheduleGridItemProto): LocalChuyenCapChatLuongScheduleGridItem {
    return {
        id: item.id,
        tenChuyenCapChatLuong: item.tenChuyenCapChatLuong,
        canCu: item.canCu,
        soMenhLenh: item.soMenhLenh,
        capChatLuong: item.capChatLuong,
        donViThucHien: item.donViThucHien,
        soTrangBi: item.soTrangBi,
        nguoiSua: item.nguoiSua,
        ngaySua: timestampToIso(item.ngaySua),
    };
}

export async function getListChuyenCapChatLuongSchedule(params: {
    donViThucHien?: string;
    idChuyenNganhKt?: string;
    searchText?: string;
}): Promise<LocalChuyenCapChatLuongScheduleGridItem[]> {
    const req = create(GetListChuyenCapChatLuongScheduleRequestSchema, {
        donViThucHien: params.donViThucHien || undefined,
        idChuyenNganhKt: params.idChuyenNganhKt || undefined,
        searchText: params.searchText || undefined,
    });
    const res = await chuyenCapChatLuongScheduleClient.getListChuyenCapChatLuongSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the lay danh sach chuyen cap chat luong.');
    return (res.items ?? []).map(mapGrid);
}

export async function getChuyenCapChatLuongSchedule(id: string): Promise<LocalChuyenCapChatLuongScheduleItem> {
    const req = create(GetChuyenCapChatLuongScheduleRequestSchema, { id });
    const res = await chuyenCapChatLuongScheduleClient.getChuyenCapChatLuongSchedule(req);
    if (!res.success || !res.item) throw new Error(res.message || 'Khong the lay chi tiet chuyen cap chat luong.');
    return mapItem(res.item);
}

export async function saveChuyenCapChatLuongSchedule(payload: {
    item: LocalChuyenCapChatLuongScheduleItem;
    expectedVersion?: number;
}): Promise<{ id: string; success: boolean; message: string }> {
    const protoItem = create(ChuyenCapChatLuongScheduleItemSchema, {
        id: payload.item.id || '',
        tenChuyenCapChatLuong: payload.item.tenChuyenCapChatLuong || '',
        canCu: payload.item.canCu || '',
        soMenhLenh: payload.item.soMenhLenh || '',
        capChatLuong: payload.item.capChatLuong || '',
        donViThucHien: payload.item.donViThucHien || '',
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

    const req = create(SaveChuyenCapChatLuongScheduleRequestSchema, {
        item: protoItem,
        expectedVersion: typeof payload.expectedVersion === 'number' ? payload.expectedVersion : undefined,
    });
    const res = await chuyenCapChatLuongScheduleClient.saveChuyenCapChatLuongSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the luu chuyen cap chat luong.');
    return { id: res.id, success: res.success, message: res.message };
}

export async function deleteChuyenCapChatLuongSchedule(id: string): Promise<void> {
    const req = create(DeleteChuyenCapChatLuongScheduleRequestSchema, { id });
    const res = await chuyenCapChatLuongScheduleClient.deleteChuyenCapChatLuongSchedule(req);
    if (!res.success) throw new Error(res.message || 'Khong the xoa chuyen cap chat luong.');
}
