import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Component to check if check_session_iframe is loaded in DOM
 */
export const CheckSessionIframeDebug: React.FC = () => {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    console.log('[CheckSessionIframe] 🔍 Checking for check_session iframe in DOM...');

    // Wait a bit for iframe to be created
    const timer = setTimeout(() => {
      // Look for iframe in DOM
      const iframes = document.querySelectorAll('iframe');
      console.log('[CheckSessionIframe] Total iframes found:', iframes.length);
      
      iframes.forEach((iframe, index) => {
        const src = iframe.src;
        console.log(`[CheckSessionIframe] Iframe ${index}:`, src);
        
        if (src.includes('checksession') || src.includes('check_session')) {
          console.log('[CheckSessionIframe] ✅ FOUND check_session iframe!');
          console.log('[CheckSessionIframe] src:', src);
          console.log('[CheckSessionIframe] id:', iframe.id);
          console.log('[CheckSessionIframe] style:', iframe.style.cssText);
        }
      });

      // Listen for postMessage events
      const handleMessage = (event: MessageEvent) => {
        // Only log messages from WSO2 origin
        if (event.origin === 'https://localhost:9443') {
          console.log('[CheckSessionIframe] 📨 PostMessage from WSO2:', event.data);
        }
      };

      window.addEventListener('message', handleMessage);
      console.log('[CheckSessionIframe] 👂 Listening for postMessage events from WSO2...');

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }, 2000); // Wait 2 seconds for iframe to load

    return () => clearTimeout(timer);
  }, [auth.isAuthenticated]);

  // Monitor for session state changes
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) return;

    const sessionState = auth.user.session_state;
    console.log('[CheckSessionIframe] 📊 Current session_state:', sessionState);

    // Store initial session state
    const key = 'initial_session_state';
    const stored = sessionStorage.getItem(key);
    
    if (!stored) {
      sessionStorage.setItem(key, sessionState || '');
      console.log('[CheckSessionIframe] 💾 Saved initial session_state');
    } else if (stored !== sessionState) {
      console.log('[CheckSessionIframe] 🔴 SESSION STATE CHANGED!');
      console.log('[CheckSessionIframe] Old:', stored);
      console.log('[CheckSessionIframe] New:', sessionState);
    }
  }, [auth.isAuthenticated, auth.user?.session_state]);

  return null;
};
