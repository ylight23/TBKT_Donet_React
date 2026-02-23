import { useEffect } from 'react';
import { useAuth } from "react-oidc-context";
import { useDispatch } from 'react-redux';
import { setAuth, logout } from '../../store/authReducer/auth';
import { AppDispatch } from '../../store';

const AuthSync: React.FC = () => {
    const auth = useAuth();
    const dispatch = useDispatch<AppDispatch>();

    // Check for force logout flag (set by gRPC interceptor when session revoked)
    useEffect(() => {
        const forceLogoutFlag = sessionStorage.getItem('force_logout');
        if (forceLogoutFlag === 'true') {
            console.warn('[AuthSync] 🚨 Detected force_logout flag - session was revoked by backend');
            sessionStorage.removeItem('force_logout');
            dispatch(logout());
            
            console.log('[AuthSync] Calling signOut() to redirect through WSO2 SSO logout...');
            auth.signoutRedirect().catch((err: unknown) => {
                console.error('[AuthSync] Error during signOut():', err);
                // Fallback to direct redirect if signOut fails
                window.location.href = '/login?reason=revoked';
            });
        }
    }, [auth, dispatch]); // Run when auth or dispatch changes

    useEffect(() => {
        if (auth.isLoading) return;
        const sync = async () => {
            try {
                if (auth.isAuthenticated && auth.user) {
                    console.log("[AuthSync] User is authenticated, syncing tokens...");
                    const accessToken = auth.user.access_token;
                    const idToken = auth.user.id_token;

                    console.log("[AuthSync] Access token length:", accessToken?.length);
                    console.log("[AuthSync] Access token (first 50 chars):", accessToken?.substring(0, 50));
                    console.log("[AuthSync] User profile:", auth.user.profile);

                    // Check if access token is a valid JWT (has 3 parts separated by dots)
                    const isValidJwt = typeof accessToken === "string" && 
                                      accessToken.trim().length > 0 && 
                                      accessToken.split(".").length === 3;

                    console.log("[AuthSync] Is access token a valid JWT?", isValidJwt);

                    if (!isValidJwt) {
                        console.error("❌ ACCESS TOKEN IS NOT A VALID JWT!");
                        console.error("Backend authentication will FAIL with 401.");
                        console.error("SOLUTION: Configure WSO2 to issue JWT access tokens:");
                        console.error("  1. Go to WSO2 Console → Applications → Your App");
                        console.error("  2. Protocol tab → Access Token → Token Type: JWT");
                    } else {
                        console.log("✅ Access token is a valid JWT");
                    }

                    dispatch(setAuth({
                        isAuthenticated: true,
                        accessToken: accessToken || null,
                        idToken: idToken || null,
                        user: auth.user.profile?.preferred_username || auth.user.profile?.email || null,
                        currentUser: auth.user.profile
                    }));
                    console.log("[AuthSync] ✅ Dispatched setAuth with authenticated state");
                } else {
                    console.log("[AuthSync] User not authenticated, dispatching logout state");
                    dispatch(setAuth({
                        isAuthenticated: false,
                        accessToken: null,
                        idToken: null,
                        user: null,
                        currentUser: null
                    }));
                }
            } catch (error) {
                console.error("AuthSync failed to sync tokens:", error);
                // Clear state if token sync fails to prevent ghost login
                dispatch(setAuth({
                    isAuthenticated: false,
                    accessToken: null,
                    idToken: null,
                    user: null,
                    currentUser: null
                }));
            }
        };

        sync();
    }, [auth.isAuthenticated, auth.isLoading, auth.user, dispatch]);

    return null;
};

export default AuthSync;
