import React from 'react';
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from '@mui/icons-material/Group';
import CameraIndoorIcon from '@mui/icons-material/CameraIndoor';

interface MenuItem {
    title: string;
    path: string;
    icon: React.ReactNode;
    active: string;
}

const menu: MenuItem[] = [
    { title: "Dashboard", path: "/", icon: <DashboardIcon />, active: 'dashboard' },
    { title: "Nhân Viên", path: "/employee", icon: <GroupIcon />, active: 'employee' },
    { title: "Đơn vị", path: "/office", icon: <CameraIndoorIcon />, active: 'office' },
];

export default menu;
