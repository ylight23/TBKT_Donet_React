import { create } from '@bufbuild/protobuf';
import { danhMucTrangBiClient } from '../grpc/grpcClient';
import {
    TrangBiNhom1RecordSchema,
    type TrangBiNhom1GridItem,
    GetTrangBiNhom1RequestSchema,
    TrangBiNhom2RecordSchema,
    type TrangBiNhom2GridItem,
    SaveTrangBiNhom1RequestSchema,
    SaveTrangBiNhom2RequestSchema,
    GetListTrangBiNhom1RequestSchema,
    GetListTrangBiNhom2RequestSchema,
} from '../grpc/generated/DanhMucTrangBi_pb';
import type { TrangBiNhom1Record, TrangBiNhom2Record } from '../grpc/generated/DanhMucTrangBi_pb';

export type { TrangBiNhom1GridItem, TrangBiNhom1Record, TrangBiNhom2GridItem, TrangBiNhom2Record };

export async function getListTrangBiNhom1(options: {
    idChuyenNganhKt?: string;
    maDanhMuc?: string;
    searchText?: string;
} = {}): Promise<TrangBiNhom1GridItem[]> {
    const request = create(GetListTrangBiNhom1RequestSchema, {
        idChuyenNganhKt: options.idChuyenNganhKt,
        maDanhMuc: options.maDanhMuc,
        searchText: options.searchText,
    });
    const res = await danhMucTrangBiClient.getListTrangBiNhom1(request);
    if (!res.success) {
        throw new Error(res.message || 'Khong the tai danh sach trang bi');
    }
    return res.items ?? [];
}

export async function getTrangBiNhom1(id: string): Promise<TrangBiNhom1Record> {
    const request = create(GetTrangBiNhom1RequestSchema, { id });
    const res = await danhMucTrangBiClient.getTrangBiNhom1(request);
    if (!res.success || !res.item) {
        throw new Error(res.message || 'Khong the tai chi tiet trang bi');
    }
    return res.item;
}

export async function saveTrangBiNhom1(
    data: {
        id?: string;
        maDanhMuc: string;
        idCapTren?: string;
        tenDanhMuc?: string;
        idChuyenNganhKt?: string;
        parameters?: Record<string, string>;
    },
    options: { isNew: boolean },
): Promise<{ success: boolean; id: string; message: string }> {
    const item = create(TrangBiNhom1RecordSchema, {
        id: data.id ?? '',
        maDanhMuc: data.maDanhMuc,
        idCapTren: data.idCapTren,
        tenDanhMuc: data.tenDanhMuc,
        idChuyenNganhKt: data.idChuyenNganhKt,
        parameters: data.parameters ?? {},
    });

    const request = create(SaveTrangBiNhom1RequestSchema, {
        item,
        isNew: options.isNew,
    });

    const res = await danhMucTrangBiClient.saveTrangBiNhom1(request);
    if (!res.success) {
        throw new Error(res.message || 'Luu trang bi that bai');
    }

    return { success: res.success, id: res.id, message: res.message };
}

export async function getListTrangBiNhom2(options: {
    idChuyenNganhKt?: string;
    maDanhMuc?: string;
    searchText?: string;
} = {}): Promise<TrangBiNhom2GridItem[]> {
    const request = create(GetListTrangBiNhom2RequestSchema, {
        idChuyenNganhKt: options.idChuyenNganhKt,
        maDanhMuc: options.maDanhMuc,
        searchText: options.searchText,
    });
    const res = await danhMucTrangBiClient.getListTrangBiNhom2(request);
    if (!res.success) {
        throw new Error(res.message || 'Khong the tai danh sach trang bi nhom 2');
    }
    return res.items ?? [];
}

export async function saveTrangBiNhom2(
    data: {
        id?: string;
        maDanhMuc: string;
        idCapTren?: string;
        tenDanhMuc?: string;
        idChuyenNganhKt?: string;
        parameters?: Record<string, string>;
    },
    options: { isNew: boolean },
): Promise<{ success: boolean; id: string; message: string }> {
    const item = create(TrangBiNhom2RecordSchema, {
        id: data.id ?? '',
        maDanhMuc: data.maDanhMuc,
        idCapTren: data.idCapTren,
        tenDanhMuc: data.tenDanhMuc,
        idChuyenNganhKt: data.idChuyenNganhKt,
        parameters: data.parameters ?? {},
    });

    const request = create(SaveTrangBiNhom2RequestSchema, {
        item,
        isNew: options.isNew,
    });

    const res = await danhMucTrangBiClient.saveTrangBiNhom2(request);
    if (!res.success) {
        throw new Error(res.message || 'Luu trang bi nhom 2 that bai');
    }

    return { success: res.success, id: res.id, message: res.message };
}

export default {
    getListTrangBiNhom1,
    getTrangBiNhom1,
    saveTrangBiNhom1,
    getListTrangBiNhom2,
    saveTrangBiNhom2,
};
