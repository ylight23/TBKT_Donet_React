// @ts-nocheck
import { create } from "@bufbuild/protobuf";
import { Timestamp } from "@bufbuild/protobuf/wkt";

import { officeClient } from "../grpc/grpcClient";
import {
    Office,
    OfficeSchema,
    OfficeListRequestSchema,
    OfficeRequestSchema,
    SaveOfficeRequestSchema,
} from "../grpc/generated/Office_pb";

export function formatDate(
  ts?: Timestamp | null,
  locale = "vi-VN"
): string {
  if (!ts || ts.seconds === undefined) return "-";

  const ms =
    Number(ts.seconds) * 1000 + Math.floor((ts.nanos ?? 0) / 1_000_000);

  return new Date(ms).toLocaleDateString(locale);
}

function handleAuthError(err: unknown) {
    // gRPC UNAUTHENTICATED = 16
    if ((err as any)?.code === 16) {
        sessionStorage.clear();
        window.location.href = "/login";
    }
}

// =====================
// Types
// =====================
// export interface OfficeBody {
//     id?: string;
//     ngayTao?: Timestamp;
//     ngaySua?: Timestamp;
// }

export interface OfficeFilters {
    parentID?: string;
    loadAll?: boolean;
    inIDs?: string[];
    searchText?: string;
}
export interface DeleteBody {
    id?: string;
    ids?: string[];
}


// =====================
// API
// =====================
const officeApi = {
    // ===== LIST =====
    async getListOffices(
        filters?: OfficeFilters
    ){
        try {
            const res = await officeClient.getListOffice(
                create(OfficeListRequestSchema, {
                    parentId: filters?.parentID ?? "",
                    loadAll: filters?.loadAll ?? false,
                    inIds: filters?.inIDs ?? [],
                    searchText: filters?.searchText ?? "",
                })
            );

            return res.items ?? [];
        } catch (err) {
            handleAuthError(err);
            throw err;
        }
    },

    // ===== GET ONE =====
    async getOffice(id: string){
        try {
            const res = await officeClient.getOffice(
                create(OfficeRequestSchema, { id })
            );

            return res.item;
        } catch (err) {
            handleAuthError(err);
            throw err;
        }
    },

    // ===== CREATE =====
    async create(body: Office){
        try {
            const res = await officeClient.saveOffice(
                create(SaveOfficeRequestSchema, {
                    isNew: true,
                    item: create(OfficeSchema, {
                        ...body,
                        ngayTao: body.ngayTao,
                        ngaySua: body.ngaySua,
                    }),
                })
            );

            if (!res.success || !res.item) {
                throw new Error(res.message || 'Tạo đơn vị thất bại');
            }

            return res.item;
        } catch (err) {
            handleAuthError(err);
            throw err;
        }
    },

    // ===== UPDATE =====
    async update(body: Office) {
        try {
            const res = await officeClient.saveOffice(
                create(SaveOfficeRequestSchema, {
                    isNew: false,
                    oldId: body.id,
                    item: create(OfficeSchema, {
                        ...body,
                        ngayTao: body.ngayTao,
                        ngaySua: body.ngaySua,
                    }),
                })
            );

            if (!res.success || !res.item) {
                throw new Error(res.message || 'Cập nhật đơn vị thất bại');
            }

            return res.item;
        } catch (err) {
            handleAuthError(err);
            throw err;
        }
    },

    // ===== DELETE =====
    async delete(id: string){
        try {
            await officeClient.deleteOffice(
                create(OfficeRequestSchema, { id })
            );
        } catch (err) {
            handleAuthError(err);
            throw err;
        }
    },
};

export default officeApi;
