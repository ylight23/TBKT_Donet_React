import { create } from '@bufbuild/protobuf';
import { danhMucTrangBiClient } from '../grpc/grpcClient';
import {
    DeleteNhomDongBoRequestSchema,
    GetListNhomDongBoRequestSchema,
    GetNhomDongBoRequestSchema,
    type NhomDongBo,
    type NhomDongBoGridItem,
    type NhomDongBoItemRef,
    type NhomDongBoThanhVienView,
    SaveNhomDongBoRequestSchema,
} from '../grpc/generated/DanhMucTrangBi_pb';

export const NHOM_DONG_BO_LIST_ENDPOINT = '/DanhMucTrangBi.DanhMucTrangBiService/GetListNhomDongBo';

export type {
    NhomDongBo,
    NhomDongBoGridItem,
    NhomDongBoItemRef,
    NhomDongBoThanhVienView,
};

export async function getListNhomDongBo(options: {
    idDonVi?: string;
    searchText?: string;
    idTrangBi?: string;
} = {}): Promise<NhomDongBoGridItem[]> {
    const request = create(GetListNhomDongBoRequestSchema, {
        idDonVi: options.idDonVi,
        searchText: options.searchText,
        idTrangBi: options.idTrangBi,
    });

    const res = await danhMucTrangBiClient.getListNhomDongBo(request);
    if (!res.success) {
        throw new Error(res.message || 'Khong the tai danh sach nhom dong bo');
    }

    return res.items ?? [];
}

export async function getNhomDongBo(id: string): Promise<{
    item: NhomDongBo;
    thanhVien: NhomDongBoThanhVienView[];
}> {
    const request = create(GetNhomDongBoRequestSchema, { id });
    const res = await danhMucTrangBiClient.getNhomDongBo(request);
    if (!res.success || !res.item) {
        throw new Error(res.message || 'Khong the tai chi tiet nhom dong bo');
    }

    return {
        item: res.item,
        thanhVien: res.thanhVien ?? [],
    };
}

export async function saveNhomDongBo(data: {
    id?: string;
    tenNhom: string;
    idDonVi: string;
    dsTrangBi: Array<{ id: string; nhom: number }>;
    parameters?: Record<string, string>;
    expectedVersion?: number;
}): Promise<{ success: boolean; id: string; message: string }> {
    const request = create(SaveNhomDongBoRequestSchema, {
        id: data.id,
        tenNhom: data.tenNhom,
        idDonVi: data.idDonVi,
        dsTrangBi: data.dsTrangBi,
        parameters: data.parameters ?? {},
        expectedVersion: data.expectedVersion,
    });

    const res = await danhMucTrangBiClient.saveNhomDongBo(request);
    if (!res.success) {
        throw new Error(res.message || 'Luu nhom dong bo that bai');
    }

    return {
        success: res.success,
        id: res.id,
        message: res.message,
    };
}

export async function deleteNhomDongBo(id: string): Promise<{ success: boolean; message: string }> {
    const request = create(DeleteNhomDongBoRequestSchema, { id });
    const res = await danhMucTrangBiClient.deleteNhomDongBo(request);
    if (!res.success) {
        throw new Error(res.message || 'Xoa nhom dong bo that bai');
    }

    return {
        success: res.success,
        message: res.message,
    };
}

export default {
    getListNhomDongBo,
    getNhomDongBo,
    saveNhomDongBo,
    deleteNhomDongBo,
};
