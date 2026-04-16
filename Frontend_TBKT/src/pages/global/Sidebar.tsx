import React, { useState, useEffect, useMemo, Dispatch, SetStateAction } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';

import {
    Sidebar as SideBarLibrary,
    Menu,
    MenuItem,
    SubMenu,
    useProSidebar,
} from "react-pro-sidebar";
import ReorderIcon from "@mui/icons-material/Reorder";
import {
    dashboardTokensDark,
    dashboardTokensLight,
    gradientGreen,
} from "../../theme";
import userImage from "../../assets/user.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import menu, { isSubMenu, type MenuEntry } from "../../constants/menu";
import { useDynamicMenuConfig } from '../../hooks/useDynamicMenuConfig';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import { getActiveMenuName } from "../../utils";
import { nameToIcon } from '../../utils/thamSoUtils';

// ── Preload map: path → lazy import ───────────────────────────────────────────
const preloadMap: Record<string, () => Promise<unknown>> = {
    '/': () => import('../dashboard'),
    '/trang-bi-nhom-1': () => import('../TrangBiNhom1'),
    '/trang-bi-nhom-2': () => import('../TrangBiNhom2'),
    '/nhom-dong-bo': () => import('../NhomDongBo'),
    '/tinh-trang-ky-thuat': () => import('../TinhTrangKyThuat'),
    '/bao-quan': () => import('../BaoQuan'),
    '/bao-duong': () => import('../BaoDuong'),
    '/sua-chua': () => import('../SuaChua'),
    '/niem-cat': () => import('../NiemCat'),
    '/dieu-dong': () => import('../DieuDong'),
    '/chuyen-cap-chat-luong': () => import('../ChuyenCapChatLuong'),
    '/thong-ke-bao-cao': () => import('../ThongKeBaoCao'),
    '/cau-hinh-tham-so': () => import('../CauHinhThamSo'),
    '/cau-hinh-menu': () => import('../CauHinhMenu'),
    '/cau-hinh-data-source': () => import('../CauHinhDataSource'),
    '/cau-hinh-template': () => import('../CauHinhTemplate'),
    '/office': () => import('../Office'),
    '/employee': () => import('../Employee'),
};

const preloadRoute = (path: string): void => {
    if (typeof window === 'undefined') return;
    const cleanPath = path.split('?')[0];
    if (cleanPath.startsWith('/menu-dong/')) {
        void import('../MenuDong');
        return;
    }
    const loader = preloadMap[cleanPath];
    if (loader) {
        void loader();
        return;
    }
    // Dynamic menu custom paths (e.g. /kiem-dinh) still resolve to MenuDong page
    if (cleanPath.startsWith('/')) {
        void import('../MenuDong');
    }
};

// ─────────────────────────────────────────────────────────────────────────────

interface ItemProps {
    path: string;
    title: string;
    icon: React.ReactNode;
    selected: string;
    setSelected: Dispatch<SetStateAction<string>>;
    active: string;
}

const Item: React.FC<ItemProps> = ({ path, title, icon, selected, setSelected, active }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isDark = theme.palette.mode === 'dark';

    return (
        <div
            onMouseEnter={() => preloadRoute(path)}
            onFocus={() => preloadRoute(path)}
        >
            <MenuItem
                component={<Link to={path} />}
                active={selected === active}
                icon={icon}
                style={{
                    color: isDark ? 'rgba(255,255,255,0.87)' : '#1B2A1C'
                }}
                onClick={() => {
                    setSelected(active);
                    navigate(path);
                }}
            >
                <Typography>{title}</Typography>
            </MenuItem>
        </div>
    );
};

const Sidebar: React.FC = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const dt = isDark ? dashboardTokensDark : dashboardTokensLight;
    const { items: dynamicMenuItems } = useDynamicMenuConfig();
    const { canFunc, canPhanHe, isAdmin, loaded: permLoaded } = useMyPermissions();

    const canAccessMenuCode = React.useCallback((code?: string | string[]) => {
        if (!code) return true;
        const codes = Array.isArray(code) ? code : [code];
        return codes.some((item) => canFunc(item, 'view'));
    }, [canFunc]);

    // Lọc menu tĩnh theo quyền chức năng
    const visibleMenu = useMemo<MenuEntry[]>(() => {
        if (!permLoaded || isAdmin) return menu; // chưa load xong hoặc admin → hiện tất cả
        return menu.filter(entry => {
            return canAccessMenuCode(entry.maChucNang);
        }).map(entry => {
            if (!isSubMenu(entry)) return entry;
            // Lọc children của SubMenu
            const children = entry.children.filter(child => {
                return canAccessMenuCode(child.maChucNang);
            });
            return children.length > 0 ? { ...entry, children } : null;
        }).filter(Boolean) as MenuEntry[];
    }, [permLoaded, isAdmin, canAccessMenuCode]);

    const visibleDynamicMenu = useMemo(() => {
        return dynamicMenuItems.filter((item) => {
            if (!item.enabled) return false;
            if (!permLoaded || isAdmin) return true;
            if (item.permissionCode) return canFunc(item.permissionCode, 'view');
            return canPhanHe(item.dataSource || '');
        });
    }, [dynamicMenuItems, permLoaded, isAdmin, canFunc, canPhanHe]);

    const sidebarEntries = useMemo<MenuEntry[]>(() => [
        ...visibleMenu,
        ...visibleDynamicMenu.map((item) => ({
            title: item.title,
            path: item.path,
            icon: nameToIcon(item.icon || 'Assignment') || <DashboardCustomizeIcon fontSize="small" />,
            active: item.active,
            maChucNang: item.permissionCode,
        })),
    ], [visibleMenu, visibleDynamicMenu]);

    const [isCollapse, setIsCollapse] = useState<boolean>(false);
    const location = useLocation();
    const [selected, setSelected] = useState<string>("dashboard");
    const { collapseSidebar } = useProSidebar();

    useEffect(() => {
        const dynamicActive = dynamicMenuItems.find((item) => item.path === location.pathname)?.active;
        if (dynamicActive) {
            setSelected(dynamicActive);
            return;
        }
        const activeMenuName = getActiveMenuName();
        setSelected(activeMenuName);
    }, [location.pathname, dynamicMenuItems]);

    const handleCollapse = (): void => {
        collapseSidebar();
        setIsCollapse((prev) => !prev);
    };

    return (
        <Box
            sx={{
                display: "flex",
                height: "100%",
                // ── Sidebar background = nền chính (trắng light / tối dark) ──
                "& .ps-sidebar-container": {
                    background: `${dt.pageBg} !important`,
                    borderRight: `1px solid ${dt.sidebarBorder} !important`,
                    transition: 'background 0.3s ease',
                },
                "& .pro-icon-wrapper": {
                    backgroundColor: "transparent !important",
                },
                // ── Menu item text — màu theo mode ──
                ".ps-menuitem-root .ps-menu-button": {
                    backgroundColor: "transparent !important",
                    color: `${isDark ? 'rgba(255,255,255,0.87)' : '#1B2A1C'} !important`,
                    transition: "background-color 0.2s ease, color 0.2s ease",
                },
                // ── Hover state — overlay nhẹ ──
                ".ps-menuitem-root:hover > .ps-menu-button": {
                    backgroundColor: `${isDark ? 'rgba(76,175,80,0.12)' : 'rgba(46,125,50,0.08)'} !important`,
                    color: `${isDark ? '#FFFFFF' : '#1B5E20'} !important`,
                },
                // ── Active state — CHỈ active dùng gradient 90° ──
                ".ps-menuitem-root.ps-active > .ps-menu-button": {
                    background: `${gradientGreen.darkBtn} !important`,   // gradient xanh 90°
                    color: '#FFFFFF !important',
                    borderLeft: `6px solid ${isDark ? '#b7cab7ff' : '#08440eff'}`,
                    fontWeight: 700,
                    boxShadow: isDark
                        ? '0 2px 8px rgba(76,175,80,0.25)'
                        : '0 2px 8px rgba(46,125,50,0.20)',
                },
                // ── SubMenu dropdown — cùng màu pageBg ──
                ".ps-submenu-content": {
                    background: `${dt.contentBg} !important`,
                    borderLeft: `2px solid ${isDark ? 'rgba(76,175,80,0.25)' : 'rgba(46,125,50,0.15)'}`,
                },
            }}
        >
            <SideBarLibrary rootStyles={{ border: "none" }}>
                <Menu>
                    {/* Title and Collapse */}
                    {!isCollapse ? (
                        <>
                            <Box
                                display="flex"
                                justifyContent="flex-end"
                                alignContent="center"
                                sx={{ margin: "10px 10px 20px 10px" }}
                            >
                                <IconButton
                                    onClick={handleCollapse}
                                    sx={{ color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1B2A1C', '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#4CAF50' : '#1B5E20' } }}
                                >
                                    <ReorderIcon />
                                </IconButton>
                            </Box>
                            <Box
                                display="flex"
                                justifyContent="center"
                                alignContent="center"
                                sx={{
                                    "& img": {
                                        width: "70px",
                                        cursor: "pointer",
                                        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
                                        borderRadius: 2.5,
                                    },
                                }}
                            >
                                <img src={userImage} alt="user" />
                            </Box>
                            <Box display="flex" justifyContent="center" alignContent="center">
                                <Typography variant="h3" color="text.primary" fontWeight="bold" />
                            </Box>
                            <Box display="flex" justifyContent="center" alignContent="center">
                                <Typography variant="h5" color="text.secondary" />
                            </Box>
                        </>
                    ) : (
                        <Box
                            display="flex"
                            justifyContent="center"
                            alignContent="center"
                            sx={{ margin: "10px 5px 20px 5px" }}
                        >
                            <IconButton
                                onClick={handleCollapse}
                                sx={{
                                    color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1B2A1C',
                                    '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#4CAF50' : '#1B5E20' }
                                }}
                            >
                                <ReorderIcon />
                            </IconButton>
                        </Box>
                    )}

                    {/* MenuItem */}
                    {sidebarEntries.map((entry, index) => {
                        if (isSubMenu(entry)) {
                            const isChildActive = entry.children.some(c => c.active === selected);
                            return (
                                <SubMenu
                                    key={index}
                                    label={entry.title}
                                    icon={entry.icon}
                                    active={isChildActive}
                                    defaultOpen={isChildActive}
                                    rootStyles={{
                                        ['& > .ps-menu-button']: {
                                            color: `${isDark ? 'rgba(255,255,255,0.87)' : '#1B2A1C'} !important`,
                                            backgroundColor: 'transparent !important',
                                            transition: 'background-color 0.2s ease, color 0.2s ease',
                                        },
                                        ['& > .ps-menu-button:hover']: {
                                            color: `${isDark ? '#FFFFFF' : '#1B5E20'} !important`,
                                            backgroundColor: `${isDark ? 'rgba(76,175,80,0.12)' : 'rgba(46,125,50,0.08)'} !important`,
                                        },
                                        ...(isChildActive && {
                                            ['& > .ps-menu-button']: {
                                                color: '#FFFFFF !important',
                                                background: `${gradientGreen.lightBtn} !important`,
                                                borderLeft: `3px solid ${isDark ? '#4CAF50' : '#1B5E20'}`,
                                                fontWeight: 700,
                                            },
                                        }),
                                    }}
                                >
                                    {entry.children.map((child, ci) => (
                                        <Item
                                            key={ci}
                                            title={child.title}
                                            path={child.path}
                                            icon={child.icon}
                                            selected={selected}
                                            setSelected={setSelected}
                                            active={child.active}
                                        />
                                    ))}
                                </SubMenu>
                            );
                        }
                        return (
                            <Item
                                key={index}
                                title={entry.title}
                                path={entry.path}
                                icon={entry.icon}
                                selected={selected}
                                setSelected={setSelected}
                                active={entry.active}
                            />
                        );
                    })}

                </Menu>
            </SideBarLibrary>
        </Box>
    );
};

export default Sidebar;
