import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Box, useTheme, Typography, IconButton, PaletteMode } from "@mui/material";
import {
    Sidebar as SideBarLibrary,
    Menu,
    MenuItem,
    useProSidebar,
} from "react-pro-sidebar";
import ReorderIcon from "@mui/icons-material/Reorder";
import { tokens } from "../../theme";
import userImage from "../../assets/user.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import menu from "../../constants/menu";
import { getActiveMenuName } from "../../utils";

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
    const colors = tokens(theme.palette.mode as PaletteMode);
    const navigate = useNavigate();

    return (
        <MenuItem
            component={<Link to={path} />}
            active={selected === active}
            icon={icon}
            style={{ color: colors.grey[100] }}
            onClick={() => {
                setSelected(active);
                navigate(path);
            }}
        >
            <Typography>{title}</Typography>
        </MenuItem>
    );
};

const Sidebar: React.FC = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as PaletteMode);
    const [isCollapse, setIsCollapse] = useState<boolean>(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [selected, setSelected] = useState<string>("dashboard");
    const { collapseSidebar } = useProSidebar();

    const handleCollapse = (): void => {
        collapseSidebar();
        setIsCollapse((prev) => !prev);
    };

    // Cập nhật selected khi route thay đổi
    useEffect(() => {
        const activeMenuName = getActiveMenuName();
        setSelected(activeMenuName);
    }, [location.pathname]);

    return (
        <Box
            sx={{
                display: "flex",
                height: "100%",
                "& .ps-sidebar-container": {
                    background: `${colors.primary[400]} !important`,
                },
                "& .pro-icon-wrapper": {
                    backgroundColor: "transparent !important",
                },
                ".ps-menuitem-root :hover": {
                    color: "#868dfb !important",
                },
                ".ps-menuitem-root.ps-active": {
                    color: "#868dfb !important",
                },
                ".ps-menuitem-root .ps-menu-button": {
                    backgroundColor: "transparent !important",
                },
                ".ps-menuitem-root.ps-active .ps-menu-button": {
                    color: "#868dfb !important",
                },
            }}
        >
            <SideBarLibrary
                rootStyles={{
                    border: "none",
                }}
            >
                <Menu>
                    {/* Title and Collapse */}
                    {!isCollapse ? (
                        <>
                            <Box
                                display="flex"
                                justifyContent="space-between"
                                alignContent="center"
                                sx={{ margin: "10px 10px 20px 10px" }}
                            >
                                <Typography variant="h3" color={colors.grey[100]}>
                                </Typography>
                                <IconButton onClick={handleCollapse}>
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
                                    },
                                }}
                            >
                                <img src={userImage} alt="user" />
                            </Box>
                            <Box display="flex" justifyContent="center" alignContent="center">
                                <Typography
                                    variant="h3"
                                    color={colors.grey[100]}
                                    fontWeight="bold"
                                >
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="center" alignContent="center">
                                <Typography variant="h5" color={colors.grey[100]}>
                                </Typography>
                            </Box>
                        </>
                    ) : (
                        <Box
                            display="flex"
                            justifyContent="center"
                            alignContent="center"
                            sx={{ margin: "10px 5px 20px 5px" }}
                        >
                            <IconButton onClick={handleCollapse}>
                                <ReorderIcon />
                            </IconButton>
                        </Box>
                    )}
                    {/* MenuItem */}
                    {menu.map((item, index) => {
                        return (
                            <Item
                                key={index}
                                title={item.title}
                                path={item.path}
                                icon={item.icon}
                                selected={selected}
                                setSelected={setSelected}
                                active={item.active}
                            />
                        );
                    })}
                </Menu>
            </SideBarLibrary>
        </Box>
    );
};

export default Sidebar;
