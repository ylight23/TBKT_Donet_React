import { create } from "@bufbuild/protobuf";
import { nhomChuyenNganhClient } from "../grpc/grpcClient";
import { NhomChuyenNganhListRequestSchema } from "../grpc/generated/NhomChuyenNganh_pb";

export interface NhomChuyenNganhOption {
    id: string;
    ten: string;
    moTa?: string;
    danhSachCn: string[];
    kichHoat: boolean;
}

export async function listNhomChuyenNganh(kichHoat = true): Promise<NhomChuyenNganhOption[]> {
    const req = create(NhomChuyenNganhListRequestSchema, { kichHoat });
    const res = await nhomChuyenNganhClient.getList(req);
    return (res.items ?? []).map((item) => ({
        id: item.id,
        ten: item.ten ?? item.id,
        moTa: item.moTa ?? "",
        danhSachCn: [...item.danhSachCn],
        kichHoat: item.kichHoat,
    }));
}

export default {
    listNhomChuyenNganh,
};
