import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

import {
    Sidebar as SideBarLibrary,
    Menu,
    MenuItem,
    SubMenu,
    useProSidebar,
} from "react-pro-sidebar";
import ReorderIcon from "@mui/icons-material/Reorder";
import {
    tokens,
    dashboardTokensDark,
    dashboardTokensLight,
    gradientGreen,
} from "../../theme";
import userImage from "../../assets/user.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import menu, { isSubMenu, type MenuEntry, type MenuItem as MenuItemType } from "../../constants/menu";
import { getActiveMenuName } from "../../utils";

// ── Preload map: path → lazy import ───────────────────────────────────────────
const preloadMap: Record<string, () => Promise<unknown>> = {
    '/': () => import('../dashboard'),
    '/trang-bi-nhom-1': () => import('../TrangBiNhom1'),
    '/trang-bi-nhom-2': () => import('../TrangBiNhom2'),
    '/tinh-trang-ky-thuat': () => import('../TinhTrangKyThuat'),
    '/bao-quan': () => import('../BaoQuan'),
    '/bao-duong': () => import('../BaoDuong'),
    '/sua-chua': () => import('../SuaChua'),
    '/niem-cat': () => import('../NiemCat'),
    '/dieu-dong': () => import('../DieuDong'),
    '/chuyen-cap-chat-luong': () => import('../ChuyenCapChatLuong'),
    '/thong-ke-bao-cao': () => import('../ThongKeBaoCao'),
    '/office': () => import('../Office'),
    '/employee': () => import('../Employee'),
};

const preloadRoute = (path: string): void => {
    if (typeof window === 'undefined') return;
    const cleanPath = path.split('?')[0];
    const loader = preloadMap[cleanPath];
    if (loader) void loader();
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
    const dt = theme.palette.mode === 'dark' ? dashboardTokensDark : dashboardTokensLight;
    const navigate = useNavigate();

    return (
        <div
            onMouseEnter={() => preloadRoute(path)}
            onFocus={() => preloadRoute(path)}
        >
            <MenuItem
                component={<Link to={path} />}
                active={selected === active}
                icon={icon}
                style={{ color: '#FFFFFF' }}
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
    const colors = tokens(theme.palette.mode as PaletteMode);
    const isDark = theme.palette.mode === 'dark';
    const dt = isDark ? dashboardTokensDark : dashboardTokensLight;

    const [isCollapse, setIsCollapse] = useState<boolean>(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [selected, setSelected] = useState<string>("dashboard");
    const { collapseSidebar } = useProSidebar();

    // ── Pure green palette cho sidebar ──────────────────────────────────────
    //  Light: hover = #388E3C26, active = #1B5E2030
    //  Dark : hover = #4CAF5022, active = #66BB6A28
    const hoverBg = isDark ? 'rgba(76,175,80,0.14)' : 'rgba(56,142,60,0.18)';
    const activeBg = isDark ? 'rgba(102,187,106,0.20)' : 'rgba(27,94,32,0.22)';
    const activeColor = isDark ? '#A5D6A7' : '#E8F5E9';  // nhạt hơn nền green
    const hoverColor = isDark ? '#C8E6C9' : '#F1F8E9';  // rất nhạt

    const handleCollapse = (): void => {
        collapseSidebar();
        setIsCollapse((prev) => !prev);
    };

    useEffect(() => {
        const activeMenuName = getActiveMenuName();
        setSelected(activeMenuName);
    }, [location.pathname]);

    return (
        <Box
            sx={{
                display: "flex",
                height: "100%",
                // ── Gradient sidebar background (30%) ──
                "& .ps-sidebar-container": {
                    background: `${isDark ? gradientGreen.darkSidebar : gradientGreen.lightSidebar} !important`,
                    borderRight: `1px solid ${dt.sidebarBorder} !important`,
                    transition: 'background 0.3s ease',
                },
                "& .pro-icon-wrapper": {
                    backgroundColor: "transparent !important",
                },
                // ── Menu item text ──
                ".ps-menuitem-root .ps-menu-button": {
                    backgroundColor: "transparent !important",
                    color: "#FFFFFF !important",
                    transition: "background-color 0.2s ease, color 0.2s ease",
                },
                // ── Hover state ──
                ".ps-menuitem-root:hover > .ps-menu-button": {
                    backgroundColor: `${hoverBg} !important`,
                    color: `${hoverColor} !important`,
                },
                // ── Active state ──
                ".ps-menuitem-root.ps-active > .ps-menu-button": {
                    color: `${activeColor} !important`,
                    backgroundColor: `${activeBg} !important`,
                    borderLeft: isDark
                        ? '3px solid #4CAF50'
                        : '3px solid #A5D6A7',
                    fontWeight: 700,
                },
                // ── SubMenu dropdown: kế thừa gradient tông tối hơn ──
                ".ps-submenu-content": {
                    background: isDark
                        ? 'rgba(5,15,6,0.85) !important'
                        : 'rgba(27,94,32,0.10) !important',
                    backdropFilter: 'blur(4px)',
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
                                    sx={{ color: '#FFFFFF', '&:hover': { bgcolor: hoverBg } }}
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
                                        borderRadius: '50%',
                                    },
                                }}
                            >
                                <img src={userImage} alt="user" />
                            </Box>
                            <Box display="flex" justifyContent="center" alignContent="center">
                                <Typography variant="h3" color="#FFFFFF" fontWeight="bold" />
                            </Box>
                            <Box display="flex" justifyContent="center" alignContent="center">
                                <Typography variant="h5" color="rgba(255,255,255,0.72)" />
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
                                sx={{ color: '#FFFFFF', '&:hover': { bgcolor: hoverBg } }}
                            >
                                <ReorderIcon />
                            </IconButton>
                        </Box>
                    )}

                    {/* MenuItem */}
                    {menu.map((entry, index) => {
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
                                            color: '#FFFFFF !important',
                                            backgroundColor: 'transparent !important',
                                            transition: 'background-color 0.2s ease, color 0.2s ease',
                                        },
                                        ['& > .ps-menu-button:hover']: {
                                            color: `${hoverColor} !important`,
                                            backgroundColor: `${hoverBg} !important`,
                                        },
                                        ...(isChildActive && {
                                            ['& > .ps-menu-button']: {
                                                color: `${activeColor} !important`,
                                                backgroundColor: `${activeBg} !important`,
                                                borderLeft: isDark
                                                    ? '3px solid #4CAF50'
                                                    : '3px solid #A5D6A7',
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
