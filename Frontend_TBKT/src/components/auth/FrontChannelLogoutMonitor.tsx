import React, { useEffect, useRef, useCallback } from "react";
import { useAuth }     from "react-oidc-context";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { clearPermissions } from "../../store/reducer/permissionReducer";
import { removeLocalStorage } from "../../utils";

export const FrontChannelLogoutMonitor: React.FC = () => {
    const auth     = useAuth();
    const dispatch = useDispatch<AppDispatch>();
    const isLoggingOutRef = useRef(false);

    const handleLogout = useCallback(async (
        reason:          string,
        shouldBroadcast: boolean = true,
        sid?:            string
    ) => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;

        dispatch(clearPermissions());
        removeLocalStorage();

        if (shouldBroadcast) {
            try {
                const channel = new BroadcastChannel("logout_channel");
                channel.postMessage({ type: "logout", reason, sid, timestamp: Date.now() });
                channel.close();
            } catch {}
        }

        const redirectReasons = ["user_initiated_logout", "token_deleted", "frontchannel_logout"];
        if (redirectReasons.includes(reason)) {
            window.location.href = "/login";
        } else {
            try {
                await auth.signoutRedirect({
                    post_logout_redirect_uri: window.location.origin + "/login",
                });
            } catch {
                window.location.href = "/login";
            }
        }
    // Rule: rerender-dependencies — dispatch stable, auth.signoutRedirect stable → không cần toàn bộ auth object
    }, [dispatch]);

    // ── BroadcastChannel ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!auth.isAuthenticated) return;

        const logoutChannel = new BroadcastChannel("logout_channel");

        logoutChannel.onmessage = async (event) => {
            if (event.data.type === "logout") {
                await handleLogout(event.data.reason || "token_revoked", false);
            }
        };

        return () => logoutChannel.close();
    }, [auth.isAuthenticated, handleLogout]);

    return null;
};
