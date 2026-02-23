import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Debug component to log Session Monitoring status
 */
export const SessionMonitorDebug: React.FC = () => {
  const auth = useAuth();

  useEffect(() => {
    console.log('[SessionMonitorDebug] 🔍 Checking Session Monitoring status...');
    console.log('[SessionMonitorDebug] isAuthenticated:', auth.isAuthenticated);
    console.log('[SessionMonitorDebug] isLoading:', auth.isLoading);
    
    if (auth.isAuthenticated && auth.user) {
      console.log('[SessionMonitorDebug] ✅ User authenticated');
      console.log('[SessionMonitorDebug] Session state:', auth.user.session_state);
      console.log('[SessionMonitorDebug] ID Token (first 50):', auth.user.id_token?.substring(0, 50));
      
      // Check metadata for check_session_iframe endpoint
      const settings = (auth as any)._settings || (auth as any).settings;
      console.log('[SessionMonitorDebug] Auth settings:', settings);
      
      // Try to access UserManager via internal auth context
      try {
        const userManager = (auth as any)._userManager || (auth as any).userManager;
        if (userManager) {
          console.log('[SessionMonitorDebug] ✅ UserManager found');
          console.log('[SessionMonitorDebug] UserManager.settings:', userManager.settings);
          console.log('[SessionMonitorDebug] UserManager.settings.monitorSession:', userManager.settings?.monitorSession);
          console.log('[SessionMonitorDebug] UserManager._sessionMonitor:', userManager._sessionMonitor);
          
          // Check metadata
          if (userManager.settings?.metadata) {
            console.log('[SessionMonitorDebug] 🔍 Metadata check_session_iframe:', 
              userManager.settings.metadata.check_session_iframe);
          }
        } else {
          console.log('[SessionMonitorDebug] ❌ UserManager not accessible via useAuth');
          console.log('[SessionMonitorDebug] ⚠️ This is expected - react-oidc-context may not expose it');
        }
      } catch (err) {
        console.log('[SessionMonitorDebug] ⚠️ Error accessing UserManager:', err);
      }
    } else {
      console.log('[SessionMonitorDebug] ⏸️ User not authenticated');
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    console.log('[SessionMonitorDebug] 🎬 Setting up event listeners for Session Monitoring...');

    const onUserSignedOut = () => {
      console.log('[SessionMonitorDebug] 🔴 EVENT: onUserSignedOut - Session changed at IdP!');
      console.log('[SessionMonitorDebug] 🔴 User was logged out at Identity Provider');
      console.log('[SessionMonitorDebug] 🔴 This should trigger automatic local logout');
    };

    const onUserLoaded = (user: any) => {
      console.log('[SessionMonitorDebug] 🟢 EVENT: onUserLoaded');
      console.log('[SessionMonitorDebug] User session_state:', user.session_state);
    };

    const onUserUnloaded = () => {
      console.log('[SessionMonitorDebug] 🟡 EVENT: onUserUnloaded');
    };

    const onSilentRenewError = (error: any) => {
      console.error('[SessionMonitorDebug] 🔴 EVENT: onSilentRenewError', error);
    };

    // These events are handled internally by AuthProvider
    // We just log them for debugging
    console.log('[SessionMonitorDebug] ✅ Event listeners ready');
    
    // We can't directly access UserManager events from useAuth
    // But react-oidc-context will call our config event handlers
    
    return () => {
      console.log('[SessionMonitorDebug] 🧹 Cleaning up event listeners');
    };
  }, [auth.isAuthenticated]);

  // Check Network tab for iframe loading
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      console.log('[SessionMonitorDebug] 📡 Check Network tab for:');
      console.log('[SessionMonitorDebug]   🔍 Request to: https://localhost:9443/oidc/checksession');
      console.log('[SessionMonitorDebug]   ⚠️ If 404/500 error → WSO2 doesn\'t support Session Monitoring');
      console.log('[SessionMonitorDebug]   ⚠️ If no request → monitorSession may be false or not working');
    }
  }, [auth.isAuthenticated, auth.user]);

  return null; // This is a monitoring-only component
};
