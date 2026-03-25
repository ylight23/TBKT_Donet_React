import { createClient, Interceptor } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { store } from '../store';

import { EmployeeService } from "./generated/Employee_pb";
import { OfficeService } from "./generated/Office_pb";
import { CatalogService } from "./generated/Catalog_pb";
import { ThamSoService } from "./generated/ThamSo_pb";
import { PhanQuyenService } from "./generated/PhanQuyen_pb";
import { DanhMucChuyenNganhService } from "./generated/DanhMucChuyenNganh_pb";

// =====================
// Auth interceptor
// =====================
const authInterceptor: Interceptor = (next) => async (req) => {
  // Đọc accessToken từ Redux store (không lưu trong sessionStorage)
  const token = store.getState().authReducer.accessToken;

  if (token) {
    req.header.set("authorization", `Bearer ${token}`);
  }

  try {
    return await next(req);
  } catch (err: any) {
    // Connect code 16 = Unauthenticated
    const isUnauthenticated =
      err.code === 16 ||
      err.code === "16" ||
      err.message?.toLowerCase().includes("401") ||
      err.message?.toLowerCase().includes("unauthorized");

    if (token && isUnauthenticated) {
      try {
        const channel = new BroadcastChannel("logout_channel");
        channel.postMessage({ type: "logout", reason: "token_invalid_401", timestamp: Date.now() });
        channel.close();
      } catch { }
    }
    throw err;
  }
};

// =====================
// Transport (singleton)
// =====================
const transport = createGrpcWebTransport({
  baseUrl: import.meta.env.VITE_GRPC_URL ?? "http://localhost:5213",
  useBinaryFormat: true,
  interceptors: [authInterceptor],
});

// =====================
// Clients (singleton)
// =====================
export const employeeClient = createClient(EmployeeService, transport);

export const officeClient = createClient(OfficeService, transport);

export const catalogClient = createClient(CatalogService, transport);

export const thamSoClient = createClient(ThamSoService, transport);

export const phanQuyenClient = createClient(PhanQuyenService, transport);

export const danhmucChuyenNganhClient = createClient(DanhMucChuyenNganhService, transport);
