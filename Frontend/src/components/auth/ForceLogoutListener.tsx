import { useEffect, useRef } from "react";
import { useAsgardeo } from "@asgardeo/react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { logout } from "../../store/authReducer/auth";

declare global {
  interface WindowEventMap {
    "auth:force-logout": CustomEvent<{ reason?: string }>;
  }
}

const ForceLogoutListener: React.FC = () => {
  const { signOut } = useAsgardeo();
  const dispatch = useDispatch<AppDispatch>();
  const inProgressRef = useRef(false);

  useEffect(() => {
    const handler = async (event: CustomEvent<{ reason?: string }>) => {
      console.warn("[ForceLogoutListener] 🚨 Received force-logout event:", event.detail);
      
      if (inProgressRef.current) {
        console.log("[ForceLogoutListener] Already in progress, ignoring");
        return;
      }
      inProgressRef.current = true;

      try {
        // Try to terminate IdP session too (not just clear local token)
        console.log("[ForceLogoutListener] Calling Asgardeo signOut()...");
        await signOut();
        console.log("[ForceLogoutListener] ✅ Asgardeo signOut complete");
      } catch (err) {
        console.error("[ForceLogoutListener] Error during signOut:", err);
        // If SDK signOut fails, still clear local app state
      } finally {
        console.log("[ForceLogoutListener] Dispatching logout action and redirecting...");
        dispatch(logout());
        const reason = event?.detail?.reason ? encodeURIComponent(event.detail.reason) : "revoked";
        window.location.href = `/login?reason=${reason}`;
      }
    };

    console.log("[ForceLogoutListener] Listener registered");
    window.addEventListener("auth:force-logout", handler as unknown as EventListener);
    return () => {
      console.log("[ForceLogoutListener] Listener unregistered");
      window.removeEventListener("auth:force-logout", handler as unknown as EventListener);
    };
  }, [dispatch, signOut]);

  return null;
};

export default ForceLogoutListener;
