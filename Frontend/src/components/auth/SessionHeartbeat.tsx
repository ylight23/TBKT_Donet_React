import { useEffect, useRef } from "react";
import { useAsgardeo } from "@asgardeo/react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { logout } from "../../store/authReducer/auth";

const DEFAULT_INTERVAL_MS = 30000;

const SessionHeartbeat: React.FC = () => {
  const { isSignedIn, isLoading, signOut } = useAsgardeo();
  const dispatch = useDispatch<AppDispatch>();
  const logoutTriggeredRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isSignedIn) {
      // Reset flag when signed out or loading
      logoutTriggeredRef.current = false;
      return;
    }

    let cancelled = false;
    const baseUrl = (import.meta as any).env?.VITE_GRPC_URL ?? "http://localhost:5213";

    const tick = async () => {
      // Don't check if already triggered logout
      if (logoutTriggeredRef.current) return;

      const token = sessionStorage.getItem("_token");
      if (!token || token.trim().length === 0) {
        console.log("[SessionHeartbeat] No token in sessionStorage, skipping check");
        return;
      }

      const headerValue = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

      try {
        console.log("[SessionHeartbeat] Pinging backend...");
        const res = await fetch(`${baseUrl}/api/session/ping`, {
          method: "GET",
          headers: {
            authorization: headerValue
          }
        });

        if (cancelled) return;

        console.log("[SessionHeartbeat] Response status:", res.status);
        if (res.status === 401) {
          console.warn("[SessionHeartbeat] 🚨 Session revoked (401). Calling signOut()...");
          logoutTriggeredRef.current = true;
          
          // Clear local state first
          dispatch(logout());
          sessionStorage.removeItem("_token");
          sessionStorage.removeItem("isAuthenticated");
          
          // Call signOut() - this will redirect to WSO2 logout, then back to signOutRedirectURL
          // DON'T manually redirect after this - Asgardeo handles it
          try {
            await signOut();
            console.log("[SessionHeartbeat] ✅ signOut() called, Asgardeo will handle redirect");
          } catch (err) {
            console.error("[SessionHeartbeat] Error during signOut:", err);
            // Fallback: manual redirect if signOut fails
            window.location.href = '/login?reason=revoked';
          }
        } else {
          console.log("[SessionHeartbeat] ✅ Session valid");
        }
      } catch (err) {
        console.error("[SessionHeartbeat] Ping failed:", err);
        // ignore network errors (backend may be temporarily down)
      }
    };

    // Run immediately and then periodically.
    tick();
    const id = window.setInterval(tick, DEFAULT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isLoading, isSignedIn]);

  return null;
};

export default SessionHeartbeat;
