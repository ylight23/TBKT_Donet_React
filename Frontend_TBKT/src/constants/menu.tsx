import React from 'react';
import DashboardIcon        from '@mui/icons-material/Dashboard';
import ComputerIcon         from '@mui/icons-material/Computer';
import DevicesOtherIcon    from '@mui/icons-material/DevicesOther';
import AssessmentIcon      from '@mui/icons-material/Assessment';
import BuildIcon           from '@mui/icons-material/Build';
import EngineeringIcon     from '@mui/icons-material/Engineering';
import InventoryIcon       from '@mui/icons-material/Inventory';
import LocalShippingIcon   from '@mui/icons-material/LocalShipping';
import StarRateIcon        from '@mui/icons-material/StarRate';
import BarChartIcon        from '@mui/icons-material/BarChart';
import ShieldIcon          from '@mui/icons-material/Shield';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import HandymanIcon        from '@mui/icons-material/Handyman';
import FactCheckIcon       from '@mui/icons-material/FactCheck';
import WarehouseIcon       from '@mui/icons-material/Warehouse';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

// ── Kiểu mục menu đơn ──────────────────────────────────────
export interface MenuItem {
    title:  string;
    path:   string;
    icon:   React.ReactNode;
    active: string;
}

// ── Kiểu mục menu có con (SubMenu) ─────────────────────────
export interface SubMenuItem {
    title:    string;
    icon:     React.ReactNode;
    active:   string;          // highlight cha khi bất kỳ con nào active
    children: MenuItem[];
}

// ── Union type ──────────────────────────────────────────────
export type MenuEntry = MenuItem | SubMenuItem;

export const isSubMenu = (entry: MenuEntry): entry is SubMenuItem =>
    'children' in entry && Array.isArray((entry as SubMenuItem).children);

const menu: MenuEntry[] = [
    // Bảng điều hành
    { title: 'Bảng điều hành',           path: '/',                       icon: <DashboardIcon />,             active: 'dashboard'            },
    // Trang bị kỹ thuật
    { title: 'Trang bị nhóm 1',          path: '/trang-bi-nhom-1',        icon: <ComputerIcon />,              active: 'tbNhom1'              },
    { title: 'Trang bị nhóm 2',          path: '/trang-bi-nhom-2',        icon: <DevicesOtherIcon />,          active: 'tbNhom2'              },
    // Quản lý kỹ thuật
    { title: 'Tình trạng kỹ thuật',      path: '/tinh-trang-ky-thuat',    icon: <ShieldIcon />,                active: 'tinhTrangKT'          },
    { title: 'Bảo quản',                 path: '/bao-quan',               icon: <InventoryIcon />,             active: 'baoQuan'              },
    { title: 'Bảo dưỡng',               path: '/bao-duong',              icon: <MiscellaneousServicesIcon />, active: 'baoDuong'             },
    // Sửa chữa — SubMenu mở rộng
    {
        title:  'Sửa chữa',
        icon:   <BuildIcon />,
        active: 'suaChua',
        children: [
            { title: 'Trang bị KT sửa chữa',  path: '/sua-chua?tab=1',  icon: <HandymanIcon />,  active: 'suaChuaTB'  },
            { title: 'Kết quả sửa chữa',       path: '/sua-chua?tab=2',  icon: <FactCheckIcon />, active: 'suaChuaKQ'  },
        ],
    },
    // Niêm cất — SubMenu mở rộng
    {
        title:  'Niêm cất',
        icon:   <EngineeringIcon />,
        active: 'niemCat',
        children: [
            { title: 'Trang bị KT niêm cất', path: '/niem-cat?tab=1', icon: <WarehouseIcon />,           active: 'niemCatTB' },
            { title: 'Kết quả niêm cất',     path: '/niem-cat?tab=2', icon: <AssignmentTurnedInIcon />, active: 'niemCatKQ' },
        ],
    },
    // Quản lý khác
    { title: 'Điều động',               path: '/dieu-dong',              icon: <LocalShippingIcon />,         active: 'dieuDong'             },
    { title: 'Chuyển cấp chất lượng',   path: '/chuyen-cap-chat-luong',  icon: <StarRateIcon />,              active: 'chuyenCap'            },
    { title: 'Thống kê báo cáo',        path: '/thong-ke-bao-cao',       icon: <BarChartIcon />,              active: 'thongKe'              },
    // Cũ (giữ lại tương thích)
    { title: 'Nhân Viên',               path: '/employee',               icon: <AssessmentIcon />,            active: 'employee'             },
];

export default menu;
