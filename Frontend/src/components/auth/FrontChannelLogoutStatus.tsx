import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

const allowedOrigins = new Set([
  window.location.origin,
  "http://localhost:3001",
  "http://localhost:3002",
]);

export const FrontChannelLogoutStatus: React.FC = () => {
  const shownRef = useRef(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!allowedOrigins.has(event.origin)) return;

      const data = event.data as {
        type?: string;
        reason?: string;
        appOrigin?: string;
      };

      if (!data || data.type !== "frontchannel_logout_done") return;
      if (shownRef.current) return;

      shownRef.current = true;
      toast.info("Front-channel logout completed in another app.", {
        autoClose: 2500,
      });
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return null;
};
