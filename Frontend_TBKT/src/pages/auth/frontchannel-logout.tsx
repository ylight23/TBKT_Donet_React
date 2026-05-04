import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearPermissions } from "../../store/reducer/permissionReducer";
import { AppDispatch } from "../../store";

const FrontChannelLogout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const iss = params.get("iss");
    const sid = params.get("sid");

    console.log("[FrontChannelLogout] Received front-channel logout", { iss, sid });

    // Clear app state
    dispatch(clearPermissions());

    // Notify other tabs of the same app
    try {
      const channel = new BroadcastChannel("logout_channel");
      channel.postMessage({
        type: "logout",
        reason: "frontchannel_logout",
        sid,
        timestamp: Date.now(),
      });
      channel.close();
    } catch (err) {
      console.warn("[FrontChannelLogout] BroadcastChannel not supported:", err);
    }

    // Notify parent window (if embedded) that logout was processed
    try {
      window.parent?.postMessage(
        {
          type: "frontchannel_logout_done",
          reason: "frontchannel_logout",
          sid,
          appOrigin: window.location.origin,
          timestamp: Date.now(),
        },
        "*"
      );
    } catch (err) {
      console.warn("[FrontChannelLogout] postMessage failed:", err);
    }
  }, [dispatch]);

  return (
    <div style={{ padding: 16, fontFamily: "inherit" }}>
      Logout processed. You may close this tab.
    </div>
  );
};

export default FrontChannelLogout;
