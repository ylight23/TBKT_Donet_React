import { create } from "@bufbuild/protobuf";
import { danhmucChuyenNganhClient } from "../grpc/grpcClient";
import { DanhMucChuyenNganhListRequestSchema } from "../grpc/generated/DanhMucChuyenNganh_pb";

export interface DanhMucChuyenNganhOption {
    id: string;
    ten: string;
    vietTat?: string;
    thuTu: number;
}

export async function listDanhMucChuyenNganh(searchText = ""): Promise<DanhMucChuyenNganhOption[]> {
    const req = create(DanhMucChuyenNganhListRequestSchema, { searchText });
    const res = await danhmucChuyenNganhClient.getList(req);
    return (res.items ?? []).map((item) => ({
        id: item.id,
        ten: item.ten ?? item.id,
        vietTat: item.vietTat ?? "",
        thuTu: item.thuTu,
    }));
}

export default {
    listDanhMucChuyenNganh,
};
