import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { logout } from "../../store/authReducer/auth";

/**
 * Front-Channel Logout Monitor
 * 
 * Monitors for token invalidation (401 errors from gRPC calls)
 * and synchronizes logout across all tabs in the same browser
 * using BroadcastChannel API.
 * 
 * Flow:
 * 1. Any tab makes gRPC call → gets 401 Unauthenticated
 * 2. gRPC interceptor broadcasts logout signal via BroadcastChannel
 * 3. All tabs (including the one that got 401) receive signal
 * 4. All tabs logout simultaneously
 * 
 * No polling, no iframe, no server requests needed!
 */
export const FrontChannelLogoutMonitor: React.FC = () => {
  const auth = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  console.log("[Logout Monitor] 🔄 Component render, isAuthenticated:", auth.isAuthenticated);

  // Use ref to prevent duplicate logout calls
  const isLoggingOutRef = useRef(false);

  // Define handleLogout with useCallback to have stable reference
  const handleLogout = useCallback(async (
    reason: string,
    shouldBroadcast: boolean = true,
    sid?: string
  ) => {
    // Prevent duplicate logout calls
    if (isLoggingOutRef.current) {
      console.log(`[Front-Channel] Already logging out, skipping duplicate call for: ${reason}`);
      return;
    }
    
    isLoggingOutRef.current = true;
    console.log(`[Front-Channel] Processing logout: ${reason}` + (sid ? ` (sid: ${sid})` : ""));

    // Clear Redux state
    dispatch(logout());

    // Clear sessionStorage
    sessionStorage.removeItem("_token");
    sessionStorage.removeItem("isAuthenticated");

    // Broadcast to other tabs (if initiated from this tab)
    if (shouldBroadcast) {
      try {
        const channel = new BroadcastChannel("logout_channel");
        channel.postMessage({
          type: "logout",
          reason,
          sid,
          timestamp: Date.now(),
        });
        channel.close();
      } catch (err) {
        console.warn("[Logout Monitor] BroadcastChannel not supported:", err);
      }
    }

    // Handle logout based on who initiated it
    if (reason === "user_initiated_logout" || reason === "token_deleted" || reason === "frontchannel_logout") {
      // Another tab already initiated logout
      // Clear local state and redirect IMMEDIATELY
      console.log(`[Logout Monitor] Other tab initiated logout (${reason}), clearing state and redirecting...`);
      
      // Clear all storage (both localStorage and sessionStorage)
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect immediately - no query params needed
      window.location.href = "/login";
    } else {
      // Token revoked (401) or other reasons - this tab is the first to detect it
      // Call signOut() to revoke WSO2 session
      console.log(`[Logout Monitor] Calling signOut() to revoke WSO2 session (reason: ${reason})`);
      
      try {
        await auth.signoutRedirect({
          post_logout_redirect_uri: window.location.origin + "/login"
        });
        console.log("[Logout Monitor] signOut() completed successfully");
      } catch (err) {
        console.error("[Logout Monitor] signOut() failed:", err);
        // Fallback - clear all storage
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
      }
    }
  }, [dispatch, auth]);

  // Monitor token deletion - if token is removed, logout immediately
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    console.log("[Logout Monitor] 🔍 Starting token existence monitor...");
    
    // Check token every 500ms
    const tokenCheckInterval = setInterval(() => {
      const token = sessionStorage.getItem("_token");
      
      if (!token && !isLoggingOutRef.current) {
        console.log("[Logout Monitor] ⚠️ Token no longer exists - logging out!");
        clearInterval(tokenCheckInterval);
        
        // Token was deleted by another tab - logout this tab
        handleLogout("token_deleted", false);
      }
    }, 500);

    return () => {
      console.log("[Logout Monitor] 🛑 Stopping token existence monitor");
      clearInterval(tokenCheckInterval);
    };
  }, [auth.isAuthenticated, handleLogout]);

  useEffect(() => {
    console.log("[Logout Monitor] 🎯 useEffect triggered, isAuthenticated:", auth.isAuthenticated);
    
    if (!auth.isAuthenticated) {
      console.log("[Logout Monitor] ⏸️ Not signed in, skipping monitor setup");
      return;
    }

    console.log("[Logout Monitor] 🎬 Starting monitor - creating BroadcastChannel");

    // Create BroadcastChannel for cross-tab communication
    const logoutChannel = new BroadcastChannel("logout_channel");

    // Handle logout from ANY tab (including this one)
    logoutChannel.onmessage = async (event) => {
      console.log("[Logout Monitor] 📡 BroadcastChannel message received:", event.data);
      if (event.data.type === "logout") {
        console.log("[Logout Monitor] ✅ Logout signal confirmed, reason:", event.data.reason);
        await handleLogout(event.data.reason || "token_revoked", false);
      } else {
        console.log("[Logout Monitor] ⚠️ Unknown message type:", event.data);
      }
    };

    console.log("[Logout Monitor] ✅ Monitoring active for logout signals...");

    // Cleanup
    return () => {
      logoutChannel.close();
    };
  }, [auth.isAuthenticated, handleLogout]);

  return null;
};