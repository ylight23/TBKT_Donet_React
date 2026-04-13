import { create } from '@bufbuild/protobuf';
import { danhMucTrangBiClient } from '../grpc/grpcClient';
import {
    TrangBiNhom1RecordSchema,
    SaveTrangBiNhom1RequestSchema,
    GetListTrangBiNhom1RequestSchema,
} from '../grpc/generated/DanhMucTrangBi_pb';
import type { TrangBiNhom1Record } from '../grpc/generated/DanhMucTrangBi_pb';
import { create as createEf } from '@bufbuild/protobuf';
import { ExtendedFieldSchema } from '../grpc/generated/ExtendedField_pb';

export type { TrangBiNhom1Record };

export async function getListTrangBiNhom1(options: {
    idChuyenNganhKt?: string;
    maDanhMuc?: string;
    searchText?: string;
} = {}): Promise<TrangBiNhom1Record[]> {
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
    const params = Object.entries(data.parameters ?? {}).map(([name, value]) =>
        createEf(ExtendedFieldSchema, { name, stringValue: value }),
    );

    const item = create(TrangBiNhom1RecordSchema, {
        id: data.id ?? '',
        maDanhMuc: data.maDanhMuc,
        idCapTren: data.idCapTren,
        tenDanhMuc: data.tenDanhMuc,
        idChuyenNganhKt: data.idChuyenNganhKt,
        parameters: params,
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

export default {
    getListTrangBiNhom1,
    saveTrangBiNhom1,
};
