import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Custom Session Monitor that manually implements OIDC Session Management
 * to work around WSO2 IS "Invalid OP IFrame Request" error
 */
export const CustomSessionMonitor: React.FC = () => {
  const auth = useAuth();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionStateRef = useRef<string>('');

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) {
      return;
    }

    const clientId = 'WFhffPHFgieZhvY8421q0fdG7tga';
    const sessionState = auth.user.session_state;
    const redirectUri = window.location.origin; // http://localhost:3001

    // WSO2 requires client_id and redirect_uri when multiple callback URLs configured
    const checkSessionUrl = `https://localhost:9443/oidc/checksession?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    if (!sessionState) {
      return;
    }


    lastSessionStateRef.current = sessionState;

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.src = checkSessionUrl;
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    iframe.style.position = 'fixed';
    iframe.style.left = '-1000px';
    iframe.style.top = '0';

    // Handle iframe load
    iframe.onload = () => {

      // Start polling after iframe loads
      intervalRef.current = setInterval(() => {
        if (!iframe.contentWindow) {

          return;
        }

        // OIDC Session Management spec format: "client_id session_state"
        const message = `${clientId} ${sessionState}`;

        try {
          iframe.contentWindow.postMessage(message, 'https://localhost:9443');
        } catch (err) {
        }
      }, 3000); // Poll every 3 seconds


    };

    iframe.onerror = (error) => {

    };

    // Listen for response from iframe
    const handleMessage = (event: MessageEvent) => {


      // Only accept messages from WSO2 origin
      if (event.origin !== 'https://localhost:9443') {

        return;
      }

      const status = event.data;

      if (status === 'changed') {


        // Stop polling temporarily
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Try to get new session state silently
        console.log('[CustomSessionMonitor] 🔄 Attempting silent authentication to check actual status...');

        auth.signinSilent()
          .then((user) => {
            if (user) {

              // Session state changed but user still logged in
              // The useEffect will re-initialize with new session_state
              // No need to do anything, component will remount
            } else {
              auth.removeUser();
              window.location.href = '/login?reason=session_ended';
            }
          })
          .catch((err) => {
            auth.removeUser();
            window.location.href = '/login?reason=session_ended';
          });

      } else if (status === 'unchanged') {

      } else if (status === 'error') {

      } else {

      }
    };

    window.addEventListener('message', handleMessage);
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    console.log('[CustomSessionMonitor] ✅ Iframe appended to DOM');

    // Cleanup
    return () => {
      console.log('[CustomSessionMonitor] 🧹 Cleaning up...');

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      window.removeEventListener('message', handleMessage);

      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };
  }, [auth.isAuthenticated, auth.user?.session_state]);

  return null;
};
