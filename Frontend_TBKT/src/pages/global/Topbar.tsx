import React, { useContext } from "react";
import { ColorModeContext, dashboardTokensDark, dashboardTokensLight, gradientGreen } from "../../theme";

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import ExitToApp from "@mui/icons-material/ExitToApp";

import { useDispatch } from 'react-redux';
import { logout } from "../../store/authReducer/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { AppDispatch } from '../../store';

interface RouteNameMap {
    [key: string]: string;
}

const Topbar: React.FC = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const dt = isDark ? dashboardTokensDark : dashboardTokensLight;
    const colorMode = useContext(ColorModeContext);
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();

    const handleLogout = async (): Promise<void> => {
        try {
            console.log("[Topbar] User initiated logout");
            const idToken = auth.user?.id_token;
            if (!idToken) console.warn("[Topbar] No id_token found, logout may fail");

            try {
                const channel = new BroadcastChannel("logout_channel");
                channel.postMessage({ type: "logout", reason: "user_initiated_logout", timestamp: Date.now() });
                channel.close();
            } catch (broadcastErr) {
                console.warn("[Topbar] BroadcastChannel failed:", broadcastErr);
            }

            dispatch(logout());
            localStorage.clear();
            sessionStorage.clear();

            await auth.signoutRedirect({
                post_logout_redirect_uri: window.location.origin + "/login",
                id_token_hint: idToken,
            });
        } catch (error) {
            console.error("[Topbar] Failed to logout:", error);
            window.location.href = "/login?reason=logout_error";
        }
    };

    const pathnames = location.pathname.split('/').filter((x) => x);

    const routeNameMap: RouteNameMap = {
        'dashboard': 'Trang chủ',
        'employee': 'Quản lý Cán bộ',
        'office': 'Quản lý Đơn vị',
        'catalog': 'Danh mục',
        'settings': 'Cài đặt',
        'trang-bi-nhom-1': 'Trang bị Nhóm 1',
        'trang-bi-nhom-2': 'Trang bị Nhóm 2',
        'tinh-trang-ky-thuat': 'Tình trạng Kỹ thuật',
        'bao-quan': 'Bảo quản',
        'bao-duong': 'Bảo dưỡng',
        'sua-chua': 'Sửa chữa trang bị',
        'niem-cat': 'Niêm cất',
        'dieu-dong': 'Điều động',
        'chuyen-cap-chat-luong': 'Chuyển cấp Chất lượng',
        'thong-ke-bao-cao': 'Thống kê Báo cáo',
    };

    // ── Breadcrumb màu theo Light/Dark (WCAG AA contrast) ──────────────────
    const breadcrumbBg = isDark ? 'rgba(76,175,80,0.10)' : 'rgba(46,125,50,0.08)';
    const breadcrumbBorder = isDark ? '1px solid rgba(76,175,80,0.20)' : '1px solid #C8E6C9';
    const linkColor = isDark ? '#A5D6A7' : '#1B5E20';   // pas 4.5:1 on bg
    const linkHoverColor = isDark ? '#C8E6C9' : '#2E7D32';
    const activeColor = isDark ? '#66BB6A' : '#2E7D32';   // current page — bold

    // ── Action buttons ──────────────────────────────────────────────────────
    const actionBg = isDark ? 'rgba(76,175,80,0.10)' : 'rgba(46,125,50,0.08)';
    const iconColor = isDark ? '#A5D6A7' : '#2E7D32';
    const iconHoverBg = isDark ? 'rgba(76,175,80,0.20)' : 'rgba(46,125,50,0.15)';

    return (
        <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1.25}
            sx={{
                bgcolor: dt.topbarBg, // Removed invalid 'brightness(1.2)' concatenation
                borderBottom: `1px solid ${dt.topbarBorder}`,
                transition: 'background-color 0.3s ease',
                minHeight: 56,
            }}
        >
            {/* ── Breadcrumb ── */}
            <Box
                display="flex"
                alignItems="center"
                sx={{
                    bgcolor: breadcrumbBg,
                    border: breadcrumbBorder,
                    borderRadius: 2.5,
                    px: 2,
                    py: 0.75,
                    transition: 'background 0.25s ease',
                }}
            >
                <Breadcrumbs
                    separator={
                        <NavigateNextIcon
                            fontSize="small"
                            sx={{ color: isDark ? '#66BB6A' : '#4CAF50', opacity: 0.7 }}
                        />
                    }
                    aria-label="breadcrumb"
                >
                    <Link
                        underline="hover"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: linkColor,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            transition: 'color 0.2s ease',
                            '&:hover': { color: linkHoverColor },
                        }}
                        onClick={() => navigate('/')}
                    >
                        <HomeIcon fontSize="small" />
                        Trang chủ
                    </Link>
                    {pathnames.map((value, index) => {
                        const last = index === pathnames.length - 1;
                        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const displayName =
                            routeNameMap[value] ||
                            value.charAt(0).toUpperCase() + value.slice(1);

                        return last ? (
                            <Typography
                                key={to}
                                sx={{
                                    color: activeColor,
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    // subtle gradient text cho trang hiện tại
                                    background: isDark
                                        ? gradientGreen.lightBtn   // bright trên dark bg
                                        : gradientGreen.darkBtn,   // dark trên light bg
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {displayName}
                            </Typography>
                        ) : (
                            <Link
                                key={to}
                                underline="hover"
                                sx={{
                                    color: linkColor,
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '0.85rem',
                                    transition: 'color 0.2s ease',
                                    '&:hover': { color: linkHoverColor },
                                }}
                                onClick={() => navigate(to)}
                            >
                                {displayName}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            </Box>

            {/* ── Action buttons (toggle + logout) ── */}
            <Box
                display="flex"
                alignItems="center"
                gap={0.5}
                sx={{
                    bgcolor: actionBg,
                    border: breadcrumbBorder,
                    borderRadius: 2.5,
                    px: 0.5,
                    py: 0.25,
                }}
            >
                <Tooltip title={isDark ? "Chuyển Light Mode" : "Chuyển Dark Mode"} arrow>
                    <IconButton
                        onClick={colorMode.toggleColorMode}
                        aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                        sx={{
                            color: iconColor,
                            transition: 'background-color 0.2s ease',
                            '&:hover': { bgcolor: iconHoverBg },
                        }}
                    >
                        {isDark ? <LightModeOutlined /> : <DarkModeOutlined />}
                    </IconButton>
                </Tooltip>
                <Tooltip title="Đăng xuất" arrow>
                    <IconButton
                        onClick={handleLogout}
                        aria-label="Đăng xuất khỏi hệ thống"
                        sx={{
                            color: iconColor,
                            transition: 'background-color 0.2s ease',
                            '&:hover': {
                                bgcolor: 'rgba(183,28,28,0.12)',
                                color: '#EF5350',
                            },
                        }}
                    >
                        <ExitToApp />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

export default Topbar;
