import React from 'react';
import { Icon } from '@iconify/react';
import SvgIcon from '@mui/material/SvgIcon';
import Assignment from '@mui/icons-material/Assignment';
import LibraryBooks from '@mui/icons-material/LibraryBooks';
import Settings from '@mui/icons-material/Settings';
import Build from '@mui/icons-material/Build';
import Category from '@mui/icons-material/Category';
import Tune from '@mui/icons-material/Tune';
import Dashboard from '@mui/icons-material/Dashboard';
import Storage from '@mui/icons-material/Storage';
import Memory from '@mui/icons-material/Memory';
import Widgets from '@mui/icons-material/Widgets';
import Info from '@mui/icons-material/Info';
import Description from '@mui/icons-material/Description';
import Folder from '@mui/icons-material/Folder';
import FolderOpen from '@mui/icons-material/FolderOpen';
import Bookmark from '@mui/icons-material/Bookmark';
import Label from '@mui/icons-material/Label';
import Tag from '@mui/icons-material/Tag';
import List from '@mui/icons-material/List';
import TableChart from '@mui/icons-material/TableChart';
import Search from '@mui/icons-material/Search';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Sort from '@mui/icons-material/Sort';
import Notifications from '@mui/icons-material/Notifications';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import Flight from '@mui/icons-material/Flight';
import Security from '@mui/icons-material/Security';
import MilitaryTech from '@mui/icons-material/MilitaryTech';
import Engineering from '@mui/icons-material/Engineering';
import Science from '@mui/icons-material/Science';
import Gavel from '@mui/icons-material/Gavel';
import GpsFixed from '@mui/icons-material/GpsFixed';
import Radar from '@mui/icons-material/Radar';
import Router from '@mui/icons-material/Router';
import SatelliteAlt from '@mui/icons-material/SatelliteAlt';
import ElectricBolt from '@mui/icons-material/ElectricBolt';
import Sensors from '@mui/icons-material/Sensors';
import PrecisionManufacturing from '@mui/icons-material/PrecisionManufacturing';
import Fireplace from '@mui/icons-material/Fireplace';
import Shield from '@mui/icons-material/Shield';
import Handyman from '@mui/icons-material/Handyman';
import Construction from '@mui/icons-material/Construction';
import Inventory from '@mui/icons-material/Inventory';
import LocalShipping from '@mui/icons-material/LocalShipping';
import Timer from '@mui/icons-material/Timer';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import EventNote from '@mui/icons-material/EventNote';
import Task from '@mui/icons-material/Task';
import AssignmentTurnedIn from '@mui/icons-material/AssignmentTurnedIn';
import AssignmentLate from '@mui/icons-material/AssignmentLate';
import Checklist from '@mui/icons-material/Checklist';
import PendingActions from '@mui/icons-material/PendingActions';
import Archive from '@mui/icons-material/Archive';
import Unarchive from '@mui/icons-material/Unarchive';
import Warehouse from '@mui/icons-material/Warehouse';
import LocalGasStation from '@mui/icons-material/LocalGasStation';
import OilBarrel from '@mui/icons-material/OilBarrel';
import ContentPaste from '@mui/icons-material/ContentPaste';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import People from '@mui/icons-material/People';
import Person from '@mui/icons-material/Person';
import Groups from '@mui/icons-material/Groups';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Apartment from '@mui/icons-material/Apartment';
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import ManageAccounts from '@mui/icons-material/ManageAccounts';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import ContactEmergency from '@mui/icons-material/ContactEmergency';
import AttachMoney from '@mui/icons-material/AttachMoney';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';
import BarChart from '@mui/icons-material/BarChart';
import PieChart from '@mui/icons-material/PieChart';
import ShowChart from '@mui/icons-material/ShowChart';
import Star from '@mui/icons-material/Star';
import Bolt from '@mui/icons-material/Bolt';
import Verified from '@mui/icons-material/Verified';
import Flag from '@mui/icons-material/Flag';
import Place from '@mui/icons-material/Place';
import Upgrade from '@mui/icons-material/Upgrade';
import Lock from '@mui/icons-material/Lock';
import LockOpen from '@mui/icons-material/LockOpen';
import Key from '@mui/icons-material/Key';
import QrCode from '@mui/icons-material/QrCode';
import Print from '@mui/icons-material/Print';
import Send from '@mui/icons-material/Send';
import Share from '@mui/icons-material/Share';
import Download from '@mui/icons-material/Download';
import Upload from '@mui/icons-material/Upload';
import Sync from '@mui/icons-material/Sync';
import History from '@mui/icons-material/History';
import Schedule from '@mui/icons-material/Schedule';
import WatchLater from '@mui/icons-material/WatchLater';
import HourglassBottom from '@mui/icons-material/HourglassBottom';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import Warning from '@mui/icons-material/Warning';
import Error from '@mui/icons-material/Error';
import Help from '@mui/icons-material/Help';
import Lightbulb from '@mui/icons-material/Lightbulb';

export interface FieldSetIconOption {
    name: string;
    label: string;
    group?: string;
    node: React.ReactNode;
}

const muiIconComponents: Record<string, React.ElementType> = {
    Assignment,
    LibraryBooks,
    Settings,
    Build,
    Category,
    Tune,
    Dashboard,
    Storage,
    Memory,
    Widgets,
    Info,
    Description,
    Folder,
    FolderOpen,
    Bookmark,
    Label,
    Tag,
    List,
    TableChart,
    Search,
    FilterAlt,
    Sort,
    Notifications,
    NotificationsActive,
    DirectionsBoat,
    Flight,
    Security,
    MilitaryTech,
    Engineering,
    Science,
    Gavel,
    GpsFixed,
    Radar,
    Router,
    SatelliteAlt,
    ElectricBolt,
    Sensors,
    PrecisionManufacturing,
    Fireplace,
    Shield,
    Handyman,
    Construction,
    Inventory,
    LocalShipping,
    Timer,
    CalendarMonth,
    EventNote,
    Task,
    AssignmentTurnedIn,
    AssignmentLate,
    Checklist,
    PendingActions,
    Archive,
    Unarchive,
    Warehouse,
    LocalGasStation,
    OilBarrel,
    ContentPaste,
    ReceiptLong,
    People,
    Person,
    Groups,
    AccountBalance,
    Apartment,
    AdminPanelSettings,
    ManageAccounts,
    BadgeOutlined,
    ContactEmergency,
    AttachMoney,
    AccountBalanceWallet,
    TrendingUp,
    TrendingDown,
    BarChart,
    PieChart,
    ShowChart,
    Star,
    Bolt,
    Verified,
    Flag,
    Place,
    Upgrade,
    Lock,
    LockOpen,
    Key,
    QrCode,
    Print,
    Send,
    Share,
    Download,
    Upload,
    Sync,
    History,
    Schedule,
    WatchLater,
    HourglassBottom,
    CheckCircle,
    Cancel,
    Warning,
    Error,
    Help,
    Lightbulb,
};

const muiIconRegistry: Array<{ name: string; label: string; group: string }> = [
    { name: 'Assignment', label: 'Tổng hợp', group: 'Cơ bản' },
    { name: 'LibraryBooks', label: 'Tài liệu', group: 'Cơ bản' },
    { name: 'Settings', label: 'Cài đặt', group: 'Cơ bản' },
    { name: 'Build', label: 'Kỹ thuật', group: 'Cơ bản' },
    { name: 'Category', label: 'Phân loại', group: 'Cơ bản' },
    { name: 'Tune', label: 'Tùy chỉnh', group: 'Cơ bản' },
    { name: 'Dashboard', label: 'Bảng điều hành', group: 'Cơ bản' },
    { name: 'Storage', label: 'Lưu trữ', group: 'Cơ bản' },
    { name: 'Memory', label: 'Hệ thống', group: 'Cơ bản' },
    { name: 'Widgets', label: 'Mô-đun', group: 'Cơ bản' },
    { name: 'Info', label: 'Thông tin', group: 'Cơ bản' },
    { name: 'Description', label: 'Mô tả', group: 'Cơ bản' },
    { name: 'Folder', label: 'Thư mục', group: 'Cơ bản' },
    { name: 'FolderOpen', label: 'Thư mục mở', group: 'Cơ bản' },
    { name: 'Bookmark', label: 'Đánh dấu', group: 'Cơ bản' },
    { name: 'Label', label: 'Nhãn', group: 'Cơ bản' },
    { name: 'Tag', label: 'Thẻ', group: 'Cơ bản' },
    { name: 'List', label: 'Danh sách', group: 'Cơ bản' },
    { name: 'TableChart', label: 'Bảng biểu', group: 'Cơ bản' },
    { name: 'Search', label: 'Tìm kiếm', group: 'Cơ bản' },
    { name: 'FilterAlt', label: 'Bộ lọc', group: 'Cơ bản' },
    { name: 'Sort', label: 'Sắp xếp', group: 'Cơ bản' },
    { name: 'Notifications', label: 'Thông báo', group: 'Cơ bản' },
    { name: 'NotificationsActive', label: 'Thông báo bật', group: 'Cơ bản' },
    { name: 'DirectionsBoat', label: 'Tàu thuyền', group: 'Trang bị' },
    { name: 'Flight', label: 'Máy bay', group: 'Trang bị' },
    { name: 'Security', label: 'An ninh / Giáp', group: 'Trang bị' },
    { name: 'MilitaryTech', label: 'Quân khí', group: 'Trang bị' },
    { name: 'Engineering', label: 'Công binh', group: 'Trang bị' },
    { name: 'Science', label: 'Nghiên cứu', group: 'Trang bị' },
    { name: 'Gavel', label: 'Pháp chế', group: 'Trang bị' },
    { name: 'GpsFixed', label: 'Định vị', group: 'Trang bị' },
    { name: 'Radar', label: 'Radar', group: 'Trang bị' },
    { name: 'Router', label: 'Liên lạc', group: 'Trang bị' },
    { name: 'SatelliteAlt', label: 'Vệ tinh', group: 'Trang bị' },
    { name: 'ElectricBolt', label: 'Điện lực', group: 'Trang bị' },
    { name: 'Sensors', label: 'Cảm biến', group: 'Trang bị' },
    { name: 'PrecisionManufacturing', label: 'Công xưởng', group: 'Trang bị' },
    { name: 'Fireplace', label: 'Hỏa lực', group: 'Trang bị' },
    { name: 'Shield', label: 'Bảo quản', group: 'Nghiệp vụ' },
    { name: 'Handyman', label: 'Bảo dưỡng', group: 'Nghiệp vụ' },
    { name: 'Construction', label: 'Sửa chữa', group: 'Nghiệp vụ' },
    { name: 'Inventory', label: 'Niêm cất', group: 'Nghiệp vụ' },
    { name: 'LocalShipping', label: 'Điều động', group: 'Nghiệp vụ' },
    { name: 'Timer', label: 'Thời gian', group: 'Nghiệp vụ' },
    { name: 'CalendarMonth', label: 'ịch tháng', group: 'Nghiệp vụ' },
    { name: 'EventNote', label: 'Nhật ký sự kiện', group: 'Nghiệp vụ' },
    { name: 'Task', label: 'Nhiệm vụ', group: 'Nghiệp vụ' },
    { name: 'AssignmentTurnedIn', label: 'Hoàn thành', group: 'Nghiệp vụ' },
    { name: 'AssignmentLate', label: 'Trễ hạn', group: 'Nghiệp vụ' },
    { name: 'Checklist', label: 'Danh sách kiểm tra', group: 'Nghiệp vụ' },
    { name: 'PendingActions', label: 'Chờ xử lý', group: 'Nghiệp vụ' },
    { name: 'Archive', label: 'Hồ sơ lưu trữ', group: 'Nghiệp vụ' },
    { name: 'Unarchive', label: 'Lấy ra khỏi lưu trữ', group: 'Nghiệp vụ' },
    { name: 'Warehouse', label: 'Kho hàng', group: 'Nghiệp vụ' },
    { name: 'LocalGasStation', label: 'Nhiên liệu', group: 'Nghiệp vụ' },
    { name: 'OilBarrel', label: 'Thùng dầu', group: 'Nghiệp vụ' },
    { name: 'ContentPaste', label: 'Biên bản', group: 'Nghiệp vụ' },
    { name: 'ReceiptLong', label: 'Biên lai', group: 'Nghiệp vụ' },
    { name: 'People', label: 'Nhân sự', group: 'Nhân sự' },
    { name: 'Person', label: 'Cá nhân', group: 'Nhân sự' },
    { name: 'Groups', label: 'Nhóm', group: 'Nhân sự' },
    { name: 'AccountBalance', label: 'Đơn vị', group: 'Nhân sự' },
    { name: 'Apartment', label: 'Cơ quan', group: 'Nhân sự' },
    { name: 'AdminPanelSettings', label: 'Quản trị viên', group: 'Nhân sự' },
    { name: 'ManageAccounts', label: 'Quản lý tài khoản', group: 'Nhân sự' },
    { name: 'BadgeOutlined', label: 'Chức danh', group: 'Nhân sự' },
    { name: 'ContactEmergency', label: 'Hồ sơ khẩn', group: 'Nhân sự' },
    { name: 'AttachMoney', label: 'Kinh phí', group: 'Tài chính' },
    { name: 'AccountBalanceWallet', label: 'Ngân sách', group: 'Tài chính' },
    { name: 'TrendingUp', label: 'Xu hướng tăng', group: 'Tài chính' },
    { name: 'TrendingDown', label: 'Xu hướng giảm', group: 'Tài chính' },
    { name: 'BarChart', label: 'Thống kê', group: 'Tài chính' },
    { name: 'PieChart', label: 'Biểu đồ tròn', group: 'Tài chính' },
    { name: 'ShowChart', label: 'Đồ thị', group: 'Tài chính' },
    { name: 'Star', label: 'Ưu tiên', group: 'Khác' },
    { name: 'Bolt', label: 'Nhanh', group: 'Khác' },
    { name: 'Verified', label: 'Xác thực', group: 'Khác' },
    { name: 'Flag', label: 'Cờ chuẩn', group: 'Khác' },
    { name: 'Place', label: 'Vị trí', group: 'Khác' },
    { name: 'Upgrade', label: 'Nâng cấp', group: 'Khác' },
    { name: 'Lock', label: 'Khóa', group: 'Khác' },
    { name: 'LockOpen', label: 'Mở khóa', group: 'Khác' },
    { name: 'Key', label: 'Chìa khóa', group: 'Khác' },
    { name: 'QrCode', label: 'Mã QR', group: 'Khác' },
    { name: 'Print', label: 'In ấn', group: 'Khác' },
    { name: 'Send', label: 'Gửi đi', group: 'Khác' },
    { name: 'Share', label: 'Chia sẻ', group: 'Khác' },
    { name: 'Download', label: 'Tải xuống', group: 'Khác' },
    { name: 'Upload', label: 'Tải lên', group: 'Khác' },
    { name: 'Sync', label: 'Đồng bộ', group: 'Khác' },
    { name: 'History', label: 'Lịch sử', group: 'Khác' },
    { name: 'Schedule', label: 'Lịch biểu', group: 'Khác' },
    { name: 'WatchLater', label: 'Theo dõi sau', group: 'Khác' },
    { name: 'HourglassBottom', label: 'Đang chờ', group: 'Khác' },
    { name: 'CheckCircle', label: 'Xác nhận', group: 'Khác' },
    { name: 'Cancel', label: 'Hủy bỏ', group: 'Khác' },
    { name: 'Warning', label: 'Cảnh báo', group: 'Khác' },
    { name: 'Error', label: 'Lỗi', group: 'Khác' },
    { name: 'Help', label: 'Trợ giúp', group: 'Khác' },
    { name: 'Lightbulb', label: 'Ý tưởng', group: 'Khác' },
];

const iconifyOptions: Array<Pick<FieldSetIconOption, 'name' | 'label' | 'group'>> = [
    { name: 'mdi:radar', label: 'Radar', group: 'MDI: Trang bị' },
    { name: 'mdi:crosshairs', label: 'Mục tiêu', group: 'MDI: Trang bị' },
    { name: 'mdi:submarine', label: 'Tàu ngầm', group: 'MDI: Trang bị' },
    { name: 'mdi:tank', label: 'Xe tăng', group: 'MDI: Trang bị' },
    { name: 'mdi:airplane', label: 'Không quân', group: 'MDI: Trang bị' },
    { name: 'mdi:rocket', label: 'Tên lửa', group: 'MDI: Trang bị' },
    { name: 'mdi:satellite-variant', label: 'Vệ tinh', group: 'MDI: Trang bị' },
    { name: 'mdi:pistol', label: 'Vũ khí nhỏ', group: 'MDI: Trang bị' },
    { name: 'mdi:bomb', label: 'Bom đạn', group: 'MDI: Trang bị' },
    { name: 'mdi:drone', label: 'Máy bay không người lái', group: 'MDI: Trang bị' },
    { name: 'mdi:helicopter', label: 'Trực thăng', group: 'MDI: Trang bị' },
    { name: 'mdi:ship-wheel', label: 'Hải quân', group: 'MDI: Trang bị' },
    { name: 'mdi:radio-tower', label: 'Đài phát sóng', group: 'MDI: Trang bị' },
    { name: 'mdi:warehouse', label: 'Kho bãi', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:clipboard-list', label: 'Danh mục công việc', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:file-document-edit', label: 'Biểu mẫu', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:calendar-check', label: 'Lịch theo dõi', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:timeline-clock', label: 'Tiến độ thời gian', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:map-marker-path', label: 'Lộ trình', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:truck-fast', label: 'Vận chuyển nhanh', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:shield-check', label: 'Bảo đảm an toàn', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:barcode-scan', label: 'Quét mã vạch', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:qrcode-scan', label: 'Quét mã QR', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:oil-barrel', label: 'Xăng dầu', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:fuel', label: 'Nhiên liệu', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:wrench-check', label: 'Kiểm tra kỹ thuật', group: 'MDI: Nghiệp vụ' },
    { name: 'mdi:cog', label: 'Cấu hình hệ thống', group: 'MDI: Quản trị' },
    { name: 'mdi:wrench', label: 'Bảo trì kỹ thuật', group: 'MDI: Quản trị' },
    { name: 'mdi:tools', label: 'Bộ công cụ', group: 'MDI: Quản trị' },
    { name: 'mdi:database-cog', label: 'CSDL cấu hình', group: 'MDI: Quản trị' },
    { name: 'mdi:chart-line', label: 'Phân tích xu hướng', group: 'MDI: Quản trị' },
    { name: 'mdi:clipboard-text-clock', label: 'Nhật ký thao tác', group: 'MDI: Quản trị' },
    { name: 'mdi:notebook-edit', label: 'Sổ cấu hình', group: 'MDI: Quản trị' },
    { name: 'mdi:layers', label: 'Lớp dữ liệu', group: 'MDI: Quản trị' },
    { name: 'mdi:package-variant-closed', label: 'Gói dữ liệu', group: 'MDI: Quản trị' },
    { name: 'mdi:account-cog', label: 'Tài khoản quản trị', group: 'MDI: Quản trị' },
    { name: 'mdi:shield-account', label: 'Phân quyền', group: 'MDI: Quản trị' },
    { name: 'mdi:server-network', label: 'Mạng máy chủ', group: 'MDI: Quản trị' },
];

const getMuiIconComponent = (name: string): React.ElementType | null => muiIconComponents[name] ?? null;

const createMuiIconNode = (name: string): React.ReactNode => {
    const Component = getMuiIconComponent(name);
    if (!Component) return <SvgIcon sx={{ fontSize: 18 }} />;
    return <Component sx={{ fontSize: 18 }} />;
};

const createIconifyNode = (iconName: string): React.ReactNode => (
    <Icon icon={iconName} width={18} height={18} />
);

const muiIconOptions: FieldSetIconOption[] = muiIconRegistry
    .filter(({ name }) => getMuiIconComponent(name) !== null)
    .map(({ name, label, group }) => ({
        name,
        label,
        group,
        node: createMuiIconNode(name),
    }));

const iconifyIconOptions: FieldSetIconOption[] = iconifyOptions.map((option) => ({
    ...option,
    node: createIconifyNode(option.name),
}));

export const FIELD_SET_ICON_OPTIONS: FieldSetIconOption[] = [...muiIconOptions, ...iconifyIconOptions];

export const FIELD_SET_ICON_GROUPS: string[] = Array.from(
    new Set(FIELD_SET_ICON_OPTIONS.map((option) => option.group ?? 'Khac')),
);

export const iconMapping: Record<string, React.ReactNode> = FIELD_SET_ICON_OPTIONS.reduce((acc, option) => {
    acc[option.name] = option.node;
    return acc;
}, {} as Record<string, React.ReactNode>);

export const nameToIcon = (name: string): React.ReactNode => {
    const normalized = name?.trim();
    if (!normalized) return createMuiIconNode('Assignment');

    if (normalized === 'Barcode') return createMuiIconNode('QrCode');

    const mappedIcon = iconMapping[normalized];
    if (mappedIcon) return mappedIcon;

    if (normalized.startsWith('mdi:') || normalized.includes(':')) {
        return createIconifyNode(normalized);
    }

    const directComp = getMuiIconComponent(normalized);
    if (directComp) return React.createElement(directComp, { sx: { fontSize: 18 } });

    return createMuiIconNode('Assignment');
};

export const iconToName = (node: React.ReactNode): string => {
    if (!node) return 'Assignment';

    if (typeof node === 'string') {
        const normalized = node.trim();
        if (iconMapping[normalized] || normalized.startsWith('mdi:')) return normalized;
        return 'Assignment';
    }

    const reactNode = node as any;
    const iconProp = reactNode?.props?.icon;
    if (typeof iconProp === 'string' && iconProp.includes(':')) return iconProp;

    const targetType = reactNode?.type;
    for (const option of muiIconOptions) {
        const sourceType = (option.node as any)?.type;
        if (sourceType && sourceType === targetType) return option.name;
    }

    const typeName: string = targetType?.displayName || targetType?.name || '';
    if (typeName) {
        const found = muiIconRegistry.find((entry) =>
            typeName.toLowerCase().includes(entry.name.toLowerCase()),
        );
        if (found) return found.name;
    }

    return 'Assignment';
};
