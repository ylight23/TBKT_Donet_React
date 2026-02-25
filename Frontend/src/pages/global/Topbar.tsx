import React, { useContext } from "react";
import { tokens, ColorModeContext } from "../../theme";


import Box          from '@mui/material/Box';
import IconButton   from '@mui/material/IconButton';
import Breadcrumbs  from '@mui/material/Breadcrumbs';
import Link         from '@mui/material/Link';
import Typography   from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';   // ← named export từ styles/index.js
import type { PaletteMode } from '@mui/material';

import NavigateNextIcon   from "@mui/icons-material/NavigateNext";
import HomeIcon           from "@mui/icons-material/Home";
import DarkModeOutlined   from "@mui/icons-material/DarkModeOutlined";
import ExitToApp          from "@mui/icons-material/ExitToApp";
import LightModeOutlined  from "@mui/icons-material/LightModeOutlined";

import { useDispatch }        from 'react-redux';
import { logout }             from "../../store/authReducer/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth }            from "react-oidc-context";
import { AppDispatch }        from '../../store';

interface RouteNameMap {
    [key: string]: string;
}

const Topbar: React.FC = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as PaletteMode);
    const colorMode = useContext(ColorModeContext);
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();

    const handleLogout = async (): Promise<void> => {
        try {
            console.log("[Topbar] User initiated logout");
            
            // 1. Get id_token BEFORE clearing storage (needed for id_token_hint)
            const idToken = auth.user?.id_token;
            
            if (!idToken) {
                console.warn("[Topbar] No id_token found, logout may fail");
            }
            
            // 2. Broadcast logout to all tabs
            try {
                const channel = new BroadcastChannel("logout_channel");
                channel.postMessage({
                    type: "logout",
                    reason: "user_initiated_logout",
                    timestamp: Date.now(),
                });
                channel.close();
                console.log("[Topbar] Logout broadcast sent to all tabs");
            } catch (broadcastErr) {
                console.warn("[Topbar] BroadcastChannel failed:", broadcastErr);
            }
            
            // 3. Clear local Redux state
            dispatch(logout());
            
            // 4. Clear ALL storage (both localStorage and sessionStorage)
            localStorage.clear();
            sessionStorage.clear();
            
            console.log("[Topbar] All storage cleared, redirecting to WSO2 logout...");
            
            // 5. OIDC signout redirect with id_token_hint
            await auth.signoutRedirect({
                post_logout_redirect_uri: window.location.origin + "/login",
                id_token_hint: idToken,  // Required by WSO2 IS for authorization
            });
            
        } catch (error) {
            console.error("[Topbar] Failed to logout:", error);
            // Fallback: force redirect
            window.location.href = "/login?reason=logout_error";
        }
    };

    // Tạo breadcrumb từ pathname
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Map routes sang tiếng Việt
    const routeNameMap: RouteNameMap = {
        'dashboard': 'Trang chủ',
        'employee': 'Quản lý Cán bộ',
        'office': 'Quản lý Đơn vị',
        'catalog': 'Danh mục',
        'settings': 'Cài đặt',
    };

    return (
        <Box display="flex" justifyContent="space-between" p={2}>
            {/* Breadcrumb Menu */}
            <Box
                display="flex"
                alignItems="center"
                bgcolor={colors.primary[400]}
                borderRadius="3px"
                px={2}
                py={1}
            >
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    aria-label="breadcrumb"
                >
                    <Link
                        underline="hover"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: colors.grey[100],
                            cursor: 'pointer',
                            '&:hover': {
                                color: colors.primary[100]
                            }
                        }}
                        onClick={() => navigate('/')}
                    >
                        <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Trang chủ
                    </Link>
                    {pathnames.map((value, index) => {
                        const last = index === pathnames.length - 1;
                        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const displayName = routeNameMap[value] || value.charAt(0).toUpperCase() + value.slice(1);

                        return last ? (
                            <Typography
                                key={to}
                                sx={{
                                    color: colors.greenAccent[500],
                                    fontWeight: 600
                                }}
                            >
                                {displayName}
                            </Typography>
                        ) : (
                            <Link
                                key={to}
                                underline="hover"
                                sx={{
                                    color: colors.grey[100],
                                    cursor: 'pointer',
                                    '&:hover': {
                                        color: colors.primary[100]
                                    }
                                }}
                                onClick={() => navigate(to)}
                            >
                                {displayName}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            </Box>
            <Box
                display="flex"
                bgcolor={colors.primary[400]}
                borderRadius="3px"
            >
                <IconButton onClick={colorMode.toggleColorMode}>
                    {theme.palette.mode === "light" ? (
                        <LightModeOutlined />
                    ) : (
                        <DarkModeOutlined />
                    )}
                </IconButton>
                <IconButton onClick={handleLogout}>
                    <ExitToApp />
                </IconButton>
            </Box>
        </Box>
    );
};

export default Topbar;
