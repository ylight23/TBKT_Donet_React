import React, { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store";
import { setPermissions, clearPermissions } from "../../store/reducer/permissionReducer";
import { getMyPermissions } from "../../apis/phanQuyenApi";

const RETRY_DELAY_MS = 5000;
const REFRESH_INTERVAL_MS = 30000;

const PermissionSync: React.FC = () => {
  const auth = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated) {
      dispatch(clearPermissions());
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let requestInFlight = false;

    const clearRetryTimer = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const fetchPermissions = async (reason: string) => {
      if (requestInFlight || cancelled) return;
      requestInFlight = true;
      try {
        const perms = await getMyPermissions();
        if (!cancelled) {
          clearRetryTimer();
          console.log("[PermissionSync] Permissions refreshed:", reason);
          dispatch(setPermissions(perms));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[PermissionSync] Failed to load permissions, retrying in", RETRY_DELAY_MS, "ms:", error);
          // Retry sau RETRY_DELAY_MS thay vì clearPermissions() vĩnh viễn
          clearRetryTimer();
          retryTimer = setTimeout(() => {
            if (!cancelled) void fetchPermissions("retry");
          }, RETRY_DELAY_MS);
        }
      } finally {
        requestInFlight = false;
      }
    };

    const handleFocusRefresh = () => {
      void fetchPermissions("focus");
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        void fetchPermissions("visibilitychange");
      }
    };

    void fetchPermissions("initial");

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    refreshInterval = setInterval(() => {
      void fetchPermissions("interval");
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearRetryTimer();
      if (refreshInterval) clearInterval(refreshInterval);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [auth.isAuthenticated, auth.isLoading, dispatch]);

  return null;
};

export default PermissionSync;
