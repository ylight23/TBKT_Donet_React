import React, { useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    Container,
    Paper,
    useTheme,
    PaletteMode
} from "@mui/material";
import LockOpenIcon from '@mui/icons-material/LockOpen';
import KeyIcon from '@mui/icons-material/Key';
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { tokens } from "../../theme";

const Login: React.FC = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as PaletteMode);
    const autoLoginAttempted = useRef(false);
    const navigate = useNavigate();
    const auth = useAuth();

    const handleLogin = async (): Promise<void> => {
        try {
            await auth.signinRedirect();
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    // Auto-login logic: only redirect to SSO on a clean visit.
    // If we just came back from a sign-out or a forced revoke, DO NOT auto-login.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const reason = params.get("reason");
        const state = params.get("state");
        const code = params.get("code");
        const error = params.get("error");
        const errorDescription = params.get("error_description");
        
        console.log("[Login] ============ EFFECT TRIGGERED ============");
        console.log("[Login] Current URL:", window.location.href);
        console.log("[Login] URL params:", { reason, state, code: !!code, error });
        console.log("[Login] Auth state:", { isLoading: auth.isLoading, isAuthenticated: auth.isAuthenticated });
        console.log("[Login] autoLoginAttempted:", autoLoginAttempted.current);
        
        // Check for OAuth errors
        if (error) {
            console.error("[Login] ❌ OAuth error:", error, errorDescription);
            autoLoginAttempted.current = false;
            return;
        }
        
        // Don't auto-login if OAuth callback in progress (has code - let SDK handle it)
        const disableAutoLogin = Boolean(code);

        if (disableAutoLogin) {
            // Reset the flag so user can manually login again
            autoLoginAttempted.current = false;
            console.log("[Login] ⏸ OAuth callback detected - letting SDK handle it...");
            return;
        }
        
        // DISABLE auto-login after logout - require manual login
        // User must click Login button after logout
        // Check if coming from logout (no code param, and recently logged out)
        if (state === "sign_out_success" || reason || !code) {
            // Simple heuristic: if no OAuth callback params, assume manual visit
            console.log("[Login] ℹ️ Manual visit or after logout - auto-login DISABLED");
            autoLoginAttempted.current = false;
            return; // Don't auto-login after logout
        }

        // Check if already attempted to prevent infinite loops
        if (autoLoginAttempted.current) {
            console.log("[Login] ⏸ Auto-login already attempted, skipping");
            return;
        }

        if (!auth.isLoading && !auth.isAuthenticated) {
            console.log("[Login] 🚀 Triggering auto-login to SSO...");
            autoLoginAttempted.current = true;
            auth.signinRedirect().catch((error) => {
                console.error("[Login] ❌ Auto-login failed:", error);
                autoLoginAttempted.current = false; // Allow retry if signIn failed
            });
        } else {
            console.log("[Login] ⏸ Conditions not met:", { isLoading: auth.isLoading, isAuthenticated: auth.isAuthenticated });
        }
    }, [auth.isLoading, auth.isAuthenticated]);

    useEffect(() => {
        console.log("[Login] ============ SIGNIN STATUS CHANGED ============");
        console.log("[Login] isAuthenticated:", auth.isAuthenticated);
        
        if (auth.isAuthenticated) {
            console.log("[Login] ✅ User signed in, navigating to home");
            // Clean URL and navigate
            window.history.replaceState({}, document.title, '/');
            navigate('/', { replace: true });
        } else {
            console.log("[Login] ℹ️ User not signed in yet");
        }
    }, [auth.isAuthenticated]);

    if (auth.isLoading) {
        return (
            <Box
                sx={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme.palette.mode === 'dark' ? '#141b2d' : '#f2f0f0'
                }}
            >
                <Typography variant="h4" color={colors.grey[100]} sx={{ animate: 'pulse 1.5s infinite alternate' }}>
                    Đang khởi tạo phiên làm việc...
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #141b2d 0%, #1f2a40 100%)'
                    : 'linear-gradient(135deg, #f2f0f0 0%, #e0e0e0 100%)',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Background Decorative Elements */}
            <Box
                sx={{
                    position: 'absolute',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: colors.blueAccent[500],
                    filter: 'blur(100px)',
                    opacity: 0.2,
                    top: '-50px',
                    right: '-50px',
                    zIndex: 0
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: colors.greenAccent[500],
                    filter: 'blur(120px)',
                    opacity: 0.1,
                    bottom: '-100px',
                    left: '-100px',
                    zIndex: 0
                }}
            />

            <Container maxWidth="sm" sx={{ zIndex: 1 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        borderRadius: 4,
                        background: theme.palette.mode === 'dark'
                            ? 'rgba(31, 42, 64, 0.6)'
                            : 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}
                >
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '24px',
                            background: `linear-gradient(135deg, ${colors.blueAccent[600]} 0%, ${colors.greenAccent[500]} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 4,
                            boxShadow: `0 10px 20px -5px ${colors.blueAccent[500]}`
                        }}
                    >
                        <LockOpenIcon sx={{ fontSize: 40, color: '#fff' }} />
                    </Box>

                    <Typography variant="h3" fontWeight="800" gutterBottom color={colors.grey[100]}>
                        Chào mừng trở lại
                    </Typography>

                    <Typography variant="body1" sx={{ mb: 6, color: colors.grey[300], opacity: 0.8 }}>
                        Sử dụng tài khoản hệ thống của bạn để đăng nhập nhanh chóng và bảo mật qua SSO.
                    </Typography>

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        startIcon={<KeyIcon />}
                        onClick={handleLogin}
                        sx={{
                            py: 2,
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            textTransform: 'none',
                            borderRadius: 2,
                            background: `linear-gradient(to right, ${colors.blueAccent[600]}, ${colors.blueAccent[500]})`,
                            boxShadow: `0 4px 14px 0 ${colors.blueAccent[500]}66`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 6px 20px rgba(0, 0, 0, 0.23)`,
                                background: `linear-gradient(to right, ${colors.blueAccent[700]}, ${colors.blueAccent[600]})`,
                            },
                        }}
                    >
                        Đăng nhập bằng SSO
                    </Button>

                    <Box sx={{ mt: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Box sx={{ height: '1px', width: '40px', background: colors.grey[700] }} />
                        <Typography variant="caption" sx={{ color: colors.grey[500], fontWeight: 500 }}>
                            Hệ thống quản lý cán bộ
                        </Typography>
                        <Box sx={{ height: '1px', width: '40px', background: colors.grey[700] }} />
                    </Box>
                </Paper>

                <Typography
                    variant="caption"
                    sx={{
                        mt: 4,
                        display: 'block',
                        textAlign: 'center',
                        color: colors.grey[500],
                        opacity: 0.6
                    }}
                >
                    &copy; 2026 Toàn bộ quyền được bảo lưu. Powered by WSO2 Identity Server.
                </Typography>
            </Container>
        </Box>
    );
};

export default Login;
