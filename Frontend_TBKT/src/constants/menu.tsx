import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ComputerIcon from '@mui/icons-material/Computer';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import BuildIcon from '@mui/icons-material/Build';
import EngineeringIcon from '@mui/icons-material/Engineering';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StarRateIcon from '@mui/icons-material/StarRate';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShieldIcon from '@mui/icons-material/Shield';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import HandymanIcon from '@mui/icons-material/Handyman';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type { PermissionManifestMenuItem } from '../config/permissionManifest';
import { permissionManifest } from '../config/permissionManifest';

const iconMap: Record<string, React.ReactNode> = {
    Dashboard: <DashboardIcon />,
    Computer: <ComputerIcon />,
    DevicesOther: <DevicesOtherIcon />,
    Build: <BuildIcon />,
    Engineering: <EngineeringIcon />,
    Inventory: <InventoryIcon />,
    LocalShipping: <LocalShippingIcon />,
    StarRate: <StarRateIcon />,
    BarChart: <BarChartIcon />,
    Shield: <ShieldIcon />,
    MiscellaneousServices: <MiscellaneousServicesIcon />,
    Handyman: <HandymanIcon />,
    FactCheck: <FactCheckIcon />,
    Warehouse: <WarehouseIcon />,
    AssignmentTurnedIn: <AssignmentTurnedInIcon />,
    Settings: <SettingsIcon />,
    Storage: <StorageIcon />,
    LibraryBooks: <LibraryBooksIcon />,
    AdminPanelSettings: <AdminPanelSettingsIcon />,
    Assessment: <AssessmentIcon />,
};

export interface MenuItem {
    title: string;
    path: string;
    icon: React.ReactNode;
    active: string;
    maChucNang?: string | string[];
}

export interface SubMenuItem {
    title: string;
    icon: React.ReactNode;
    active: string;
    children: MenuItem[];
    maChucNang?: string | string[];
}

export type MenuEntry = MenuItem | SubMenuItem;

export const isSubMenu = (entry: MenuEntry): entry is SubMenuItem =>
    'children' in entry && Array.isArray((entry as SubMenuItem).children);

const toIconNode = (iconName: string): React.ReactNode =>
    iconMap[iconName] ?? <AssessmentIcon />;

const toMenuEntry = (item: PermissionManifestMenuItem): MenuEntry => {
    if (item.children?.length) {
        return {
            title: item.title,
            icon: toIconNode(item.icon),
            active: item.active,
            maChucNang: item.permissionCodes,
            children: item.children.map((child) => ({
                title: child.title,
                path: child.path ?? '/',
                icon: toIconNode(child.icon),
                active: child.active,
                maChucNang: child.permissionCodes,
            })),
        };
    }

    return {
        title: item.title,
        path: item.path ?? '/',
        icon: toIconNode(item.icon),
        active: item.active,
        maChucNang: item.permissionCodes,
    };
};

const menu: MenuEntry[] = [
    ...permissionManifest.staticMenus.map(toMenuEntry),
];

export default menu;
