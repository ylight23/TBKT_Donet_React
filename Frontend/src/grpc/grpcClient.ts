import { createClient, Interceptor } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import { EmployeeService } from "./generated/Employee_pb";
import { OfficeService } from "./generated/Office_pb";
import { CatalogService } from "./generated/Catalog_pb";

// =====================
// Auth interceptor
// =====================
const authInterceptor: Interceptor = (next) => async (req) => {
  const token = sessionStorage.getItem("_token");
  const hadToken = Boolean(token);

  console.log("[gRPC Interceptor] Request:", req.url);
  console.log("[gRPC Interceptor] Token exists:", hadToken);
  
  if (token) {
    const headerValue = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    console.log("[gRPC Interceptor] Token (first 50 chars):", token.substring(0, 50));
    console.log("[gRPC Interceptor] Setting authorization header");
    req.header.set("authorization", headerValue);
  } else {
    console.warn("[gRPC Interceptor] ⚠️ No token found in sessionStorage!");
  }

  try {
    const res = await next(req);
    console.log("[gRPC Interceptor] ✅ Request successful:", req.url);
    return res;
  } catch (err: any) {
    console.error("[gRPC Interceptor] ❌ Request failed:", {
      url: req.url,
      code: err.code,
      codeType: typeof err.code,
      message: err.message,
      rawMessage: err.rawMessage,
      fullError: err
    });
    
    // Check if error is 401 Unauthorized (Connect/RPC)
    // Connect code 16 = Unauthenticated
    // HTTP 401 may also appear in message
    const isUnauthenticated = 
      err.code === 16 || 
      err.code === "16" ||
      err.message?.toLowerCase().includes("401") || 
      err.message?.toLowerCase().includes("unauthorized") ||
      err.rawMessage?.toLowerCase().includes("401") ||
      err.rawMessage?.toLowerCase().includes("session revoked");
    
    console.log("[gRPC Interceptor] Is unauthenticated error?", isUnauthenticated, "hadToken:", hadToken);
    
    if (hadToken && isUnauthenticated) {
      console.warn("[gRPC Interceptor] Session revoked or token invalid!");
      
      // Broadcast logout to all tabs via BroadcastChannel
      try {
        const channel = new BroadcastChannel("logout_channel");
        channel.postMessage({
          type: "logout",
          reason: "token_invalid_401",
          timestamp: Date.now(),
        });
        channel.close();
        console.log("[gRPC Interceptor] Logout broadcast sent to all tabs");
      } catch (broadcastErr) {
        console.warn("[gRPC Interceptor] BroadcastChannel failed:", broadcastErr);
      }
      
      // Clear tokens
      sessionStorage.removeItem("_token");
      sessionStorage.removeItem("isAuthenticated");
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
