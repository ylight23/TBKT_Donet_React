import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "react-oidc-context";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { clearPermissions } from "../../store/reducer/permissionReducer";

/**
 * SignalR Real-Time Logout Monitor
 * 
 * Connects to backend SignalR hub to receive instant notifications
 * when backend revokes the session via back-channel logout.
 * 
 * Benefits:
 * - INSTANT detection (no polling delay)
 * - Low network usage (persistent connection)
 * - Automatic reconnection on connection loss
 * - Better UX than polling every 30s
 */
const SignalRLogoutMonitor: React.FC = () => {
  const auth = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const logoutTriggeredRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 50; // Max 5 seconds (50 * 100ms)

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated) {
      // Disconnect if not signed in
      if (connectionRef.current) {
        console.log("[SignalR] Stopping connection (user not signed in)");
        connectionRef.current.stop();
        connectionRef.current = null;
      }
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
      logoutTriggeredRef.current = false;
      return;
    }

    // Helper function to check token and setup connection
    const setupConnection = () => {
      const token = auth.user?.access_token;
      if (!token || token.trim().length === 0) {
        retryCountRef.current++;
        if (retryCountRef.current <= maxRetries) {
          console.log(`[SignalR] Token not ready (attempt ${retryCountRef.current}/${maxRetries}), retrying in 100ms...`);
          retryTimeoutRef.current = setTimeout(setupConnection, 100);
        } else {
          console.log("[SignalR] Token still not available after 5 seconds, giving up");
        }
        return;
      }

      console.log("[SignalR] Token ready, initializing connection...");
      retryCountRef.current = 0; // Reset counter

      const baseUrl = import.meta.env.VITE_GRPC_URL ?? "http://localhost:5213";
    
    console.log("[SignalR] Creating connection to:", `${baseUrl}/hubs/session`);

    // Create SignalR connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/session`, {
        accessTokenFactory: () => {
          // Đọc accessToken từ Redux store (không lưu trong sessionStorage)
          return auth.user?.access_token ?? "";
        },
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 10s, 30s
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // ==========================================
    // Event Handlers
    // ==========================================

    // Handle SessionRevoked event (specific session logout)
    connection.on("SessionRevoked", async (data) => {
      console.log("[SignalR] SessionRevoked event received:", data);
      await handleLogout("session_revoked");
    });

    // Handle SubjectRevoked event (all sessions for user)
    connection.on("SubjectRevoked", async (data) => {
      console.log("[SignalR] SubjectRevoked event received:", data);
      await handleLogout("all_sessions_revoked");
    });

    // Connection lifecycle events
    connection.onclose((error) => {
      if (error) {
        console.log("[SignalR] Connection closed with error:", error);
      } else {
        console.log("[SignalR] Connection closed normally");
      }
      connectionRef.current = null;
    });

    connection.onreconnecting((error) => {
      console.log("[SignalR] Reconnecting...", error?.message);
    });

    connection.onreconnected((connectionId) => {
      console.log("[SignalR] Reconnected with connectionId:", connectionId);
      logoutTriggeredRef.current = false; // Reset flag on reconnect
    });

    // ==========================================
    // Logout Handler
    // ==========================================
    const handleLogout = async (reason: string) => {
      // Prevent multiple simultaneous logout attempts
      if (logoutTriggeredRef.current) {
        console.log("[SignalR] Logout already in progress, skipping");
        return;
      }
      
      logoutTriggeredRef.current = true;
      
      console.log(`[SignalR] Processing logout: ${reason}`);
      
      // Clear local state immediately
      dispatch(clearPermissions());
      
      // Disconnect SignalR before redirect
      if (connectionRef.current) {
        await connectionRef.current.stop();
        connectionRef.current = null;
      }
      
      // Call OIDC signOut - will redirect through WSO2 logout
      try {
        await auth.signoutRedirect({
          post_logout_redirect_uri: window.location.origin + "/login"
        });
        console.log("[SignalR] signOut() completed, redirecting...");
      } catch (err) {
        console.log("[SignalR] Error during signOut():", err);
        // Fallback: manual redirect if signOut fails
        window.location.href = `/login?reason=${reason}`;
      }
    };

    // ==========================================
    // Start Connection
    // ==========================================
    const startConnection = async () => {
      try {
        await connection.start();
        console.log("[SignalR] Connected successfully");
        console.log("[SignalR] ConnectionId:", connection.connectionId);
        connectionRef.current = connection;
        
        // Optional: Send ping to verify connection
        try {
          await connection.invoke("Ping");
          console.log("[SignalR] Ping successful");
        } catch (pingErr) {
          console.log("[SignalR] Ping failed (hub may not implement Ping method):", pingErr);
        }
      } catch (err) {
        console.log("[SignalR] Connection failed:", err);
        // Will auto-retry via withAutomaticReconnect
      }
    };

    startConnection();

    // ==========================================
    // Cleanup
    // ==========================================
    return () => {
      if (connectionRef.current) {
        console.log("[SignalR] Cleanup: stopping connection");
        connectionRef.current.stop();
        connectionRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
    }; // End of setupConnection

    // Start the connection setup process
    setupConnection();

    // ==========================================
    // Cleanup
    // ==========================================
    return () => {
      if (connectionRef.current) {
        console.log("[SignalR] Cleanup: stopping connection");
        connectionRef.current.stop();
        connectionRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [auth.isLoading, auth.isAuthenticated, auth.user?.access_token, auth, dispatch]);

  return null; // This is a headless component
};

export default SignalRLogoutMonitor;

