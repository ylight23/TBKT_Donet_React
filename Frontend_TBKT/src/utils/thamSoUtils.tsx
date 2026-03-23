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
    { name: 'Assignment', label: 'Tong hop', group: 'Co ban' },
    { name: 'LibraryBooks', label: 'Tai lieu', group: 'Co ban' },
    { name: 'Settings', label: 'Cai dat', group: 'Co ban' },
    { name: 'Build', label: 'Ky thuat', group: 'Co ban' },
    { name: 'Category', label: 'Phan loai', group: 'Co ban' },
    { name: 'Tune', label: 'Tuy chinh', group: 'Co ban' },
    { name: 'Dashboard', label: 'Bang dieu hanh', group: 'Co ban' },
    { name: 'Storage', label: 'Luu tru', group: 'Co ban' },
    { name: 'Memory', label: 'He thong', group: 'Co ban' },
    { name: 'Widgets', label: 'Mo-dun', group: 'Co ban' },
    { name: 'Info', label: 'Thong tin', group: 'Co ban' },
    { name: 'Description', label: 'Mo ta', group: 'Co ban' },
    { name: 'Folder', label: 'Thu muc', group: 'Co ban' },
    { name: 'FolderOpen', label: 'Thu muc mo', group: 'Co ban' },
    { name: 'Bookmark', label: 'Danh dau', group: 'Co ban' },
    { name: 'Label', label: 'Nhan', group: 'Co ban' },
    { name: 'Tag', label: 'The', group: 'Co ban' },
    { name: 'List', label: 'Danh sach', group: 'Co ban' },
    { name: 'TableChart', label: 'Bang bieu', group: 'Co ban' },
    { name: 'Search', label: 'Tim kiem', group: 'Co ban' },
    { name: 'FilterAlt', label: 'Bo loc', group: 'Co ban' },
    { name: 'Sort', label: 'Sap xep', group: 'Co ban' },
    { name: 'Notifications', label: 'Thong bao', group: 'Co ban' },
    { name: 'NotificationsActive', label: 'Thong bao bat', group: 'Co ban' },
    { name: 'DirectionsBoat', label: 'Tau thuyen', group: 'Trang bi' },
    { name: 'Flight', label: 'May bay', group: 'Trang bi' },
    { name: 'Security', label: 'An ninh / Giap', group: 'Trang bi' },
    { name: 'MilitaryTech', label: 'Quan khi', group: 'Trang bi' },
    { name: 'Engineering', label: 'Cong binh', group: 'Trang bi' },
    { name: 'Science', label: 'Nghien cuu', group: 'Trang bi' },
    { name: 'Gavel', label: 'Phap che', group: 'Trang bi' },
    { name: 'GpsFixed', label: 'Dinh vi', group: 'Trang bi' },
    { name: 'Radar', label: 'Radar', group: 'Trang bi' },
    { name: 'Router', label: 'Lien lac', group: 'Trang bi' },
    { name: 'SatelliteAlt', label: 'Ve tinh', group: 'Trang bi' },
    { name: 'ElectricBolt', label: 'Dien luc', group: 'Trang bi' },
    { name: 'Sensors', label: 'Cam bien', group: 'Trang bi' },
    { name: 'PrecisionManufacturing', label: 'Cong xuong', group: 'Trang bi' },
    { name: 'Fireplace', label: 'Hoa luc', group: 'Trang bi' },
    { name: 'Shield', label: 'Bao quan', group: 'Nghiep vu' },
    { name: 'Handyman', label: 'Bao duong', group: 'Nghiep vu' },
    { name: 'Construction', label: 'Sua chua', group: 'Nghiep vu' },
    { name: 'Inventory', label: 'Niem cat', group: 'Nghiep vu' },
    { name: 'LocalShipping', label: 'Dieu dong', group: 'Nghiep vu' },
    { name: 'Timer', label: 'Thoi gian', group: 'Nghiep vu' },
    { name: 'CalendarMonth', label: 'Lich thang', group: 'Nghiep vu' },
    { name: 'EventNote', label: 'Nhat ky su kien', group: 'Nghiep vu' },
    { name: 'Task', label: 'Nhiem vu', group: 'Nghiep vu' },
    { name: 'AssignmentTurnedIn', label: 'Hoan thanh', group: 'Nghiep vu' },
    { name: 'AssignmentLate', label: 'Tre han', group: 'Nghiep vu' },
    { name: 'Checklist', label: 'Danh sach kiem tra', group: 'Nghiep vu' },
    { name: 'PendingActions', label: 'Cho xu ly', group: 'Nghiep vu' },
    { name: 'Archive', label: 'Ho so luu tru', group: 'Nghiep vu' },
    { name: 'Unarchive', label: 'Lay ra khoi luu tru', group: 'Nghiep vu' },
    { name: 'Warehouse', label: 'Kho hang', group: 'Nghiep vu' },
    { name: 'LocalGasStation', label: 'Nhien lieu', group: 'Nghiep vu' },
    { name: 'OilBarrel', label: 'Thung dau', group: 'Nghiep vu' },
    { name: 'ContentPaste', label: 'Bien ban', group: 'Nghiep vu' },
    { name: 'ReceiptLong', label: 'Bien lai', group: 'Nghiep vu' },
    { name: 'People', label: 'Nhan su', group: 'Nhan su' },
    { name: 'Person', label: 'Ca nhan', group: 'Nhan su' },
    { name: 'Groups', label: 'Nhom', group: 'Nhan su' },
    { name: 'AccountBalance', label: 'Don vi', group: 'Nhan su' },
    { name: 'Apartment', label: 'Co quan', group: 'Nhan su' },
    { name: 'AdminPanelSettings', label: 'Quan tri vien', group: 'Nhan su' },
    { name: 'ManageAccounts', label: 'Quan ly tai khoan', group: 'Nhan su' },
    { name: 'BadgeOutlined', label: 'Chuc danh', group: 'Nhan su' },
    { name: 'ContactEmergency', label: 'Ho so khan', group: 'Nhan su' },
    { name: 'AttachMoney', label: 'Kinh phi', group: 'Tai chinh' },
    { name: 'AccountBalanceWallet', label: 'Ngan sach', group: 'Tai chinh' },
    { name: 'TrendingUp', label: 'Xu huong tang', group: 'Tai chinh' },
    { name: 'TrendingDown', label: 'Xu huong giam', group: 'Tai chinh' },
    { name: 'BarChart', label: 'Thong ke', group: 'Tai chinh' },
    { name: 'PieChart', label: 'Bieu do tron', group: 'Tai chinh' },
    { name: 'ShowChart', label: 'Do thi', group: 'Tai chinh' },
    { name: 'Star', label: 'Uu tien', group: 'Khac' },
    { name: 'Bolt', label: 'Nhanh', group: 'Khac' },
    { name: 'Verified', label: 'Xac thuc', group: 'Khac' },
    { name: 'Flag', label: 'Moc chuan', group: 'Khac' },
    { name: 'Place', label: 'Vi tri', group: 'Khac' },
    { name: 'Upgrade', label: 'Nang cap', group: 'Khac' },
    { name: 'Lock', label: 'Khoa', group: 'Khac' },
    { name: 'LockOpen', label: 'Mo khoa', group: 'Khac' },
    { name: 'Key', label: 'Chia khoa', group: 'Khac' },
    { name: 'QrCode', label: 'Ma QR', group: 'Khac' },
    { name: 'Print', label: 'In an', group: 'Khac' },
    { name: 'Send', label: 'Gui di', group: 'Khac' },
    { name: 'Share', label: 'Chia se', group: 'Khac' },
    { name: 'Download', label: 'Tai xuong', group: 'Khac' },
    { name: 'Upload', label: 'Tai len', group: 'Khac' },
    { name: 'Sync', label: 'Dong bo', group: 'Khac' },
    { name: 'History', label: 'Lich su', group: 'Khac' },
    { name: 'Schedule', label: 'Lich bieu', group: 'Khac' },
    { name: 'WatchLater', label: 'Theo doi sau', group: 'Khac' },
    { name: 'HourglassBottom', label: 'Dang cho', group: 'Khac' },
    { name: 'CheckCircle', label: 'Xac nhan', group: 'Khac' },
    { name: 'Cancel', label: 'Huy bo', group: 'Khac' },
    { name: 'Warning', label: 'Canh bao', group: 'Khac' },
    { name: 'Error', label: 'Loi', group: 'Khac' },
    { name: 'Help', label: 'Tro giup', group: 'Khac' },
    { name: 'Lightbulb', label: 'Y tuong', group: 'Khac' },
];

const iconifyOptions: Array<Pick<FieldSetIconOption, 'name' | 'label' | 'group'>> = [
    { name: 'mdi:radar', label: 'Radar', group: 'MDI: Trang bi' },
    { name: 'mdi:crosshairs', label: 'Muc tieu', group: 'MDI: Trang bi' },
    { name: 'mdi:submarine', label: 'Tau ngam', group: 'MDI: Trang bi' },
    { name: 'mdi:tank', label: 'Xe tang', group: 'MDI: Trang bi' },
    { name: 'mdi:airplane', label: 'Khong quan', group: 'MDI: Trang bi' },
    { name: 'mdi:rocket', label: 'Ten lua', group: 'MDI: Trang bi' },
    { name: 'mdi:satellite-variant', label: 'Ve tinh', group: 'MDI: Trang bi' },
    { name: 'mdi:pistol', label: 'Vu khi nho', group: 'MDI: Trang bi' },
    { name: 'mdi:bomb', label: 'Bom dan', group: 'MDI: Trang bi' },
    { name: 'mdi:drone', label: 'May bay khong nguoi lai', group: 'MDI: Trang bi' },
    { name: 'mdi:helicopter', label: 'Truc thang', group: 'MDI: Trang bi' },
    { name: 'mdi:ship-wheel', label: 'Hai quan', group: 'MDI: Trang bi' },
    { name: 'mdi:radio-tower', label: 'Dai phat song', group: 'MDI: Trang bi' },
    { name: 'mdi:warehouse', label: 'Kho bai', group: 'MDI: Nghiep vu' },
    { name: 'mdi:clipboard-list', label: 'Danh muc cong viec', group: 'MDI: Nghiep vu' },
    { name: 'mdi:file-document-edit', label: 'Bieu mau', group: 'MDI: Nghiep vu' },
    { name: 'mdi:calendar-check', label: 'Lich theo doi', group: 'MDI: Nghiep vu' },
    { name: 'mdi:timeline-clock', label: 'Tien do thoi gian', group: 'MDI: Nghiep vu' },
    { name: 'mdi:map-marker-path', label: 'Lo trinh', group: 'MDI: Nghiep vu' },
    { name: 'mdi:truck-fast', label: 'Van chuyen nhanh', group: 'MDI: Nghiep vu' },
    { name: 'mdi:shield-check', label: 'Bao dam an toan', group: 'MDI: Nghiep vu' },
    { name: 'mdi:barcode-scan', label: 'Quet ma vach', group: 'MDI: Nghiep vu' },
    { name: 'mdi:qrcode-scan', label: 'Quet ma QR', group: 'MDI: Nghiep vu' },
    { name: 'mdi:oil-barrel', label: 'Xang dau', group: 'MDI: Nghiep vu' },
    { name: 'mdi:fuel', label: 'Nhien lieu', group: 'MDI: Nghiep vu' },
    { name: 'mdi:wrench-check', label: 'Kiem tra ky thuat', group: 'MDI: Nghiep vu' },
    { name: 'mdi:cog', label: 'Cau hinh he thong', group: 'MDI: Quan tri' },
    { name: 'mdi:wrench', label: 'Bao tri ky thuat', group: 'MDI: Quan tri' },
    { name: 'mdi:tools', label: 'Bo cong cu', group: 'MDI: Quan tri' },
    { name: 'mdi:database-cog', label: 'CSDL cau hinh', group: 'MDI: Quan tri' },
    { name: 'mdi:chart-line', label: 'Phan tich xu huong', group: 'MDI: Quan tri' },
    { name: 'mdi:clipboard-text-clock', label: 'Nhat ky thao tac', group: 'MDI: Quan tri' },
    { name: 'mdi:notebook-edit', label: 'So cau hinh', group: 'MDI: Quan tri' },
    { name: 'mdi:layers', label: 'Lop du lieu', group: 'MDI: Quan tri' },
    { name: 'mdi:package-variant-closed', label: 'Goi du lieu', group: 'MDI: Quan tri' },
    { name: 'mdi:account-cog', label: 'Tai khoan quan tri', group: 'MDI: Quan tri' },
    { name: 'mdi:shield-account', label: 'Phan quyen', group: 'MDI: Quan tri' },
    { name: 'mdi:server-network', label: 'Mang may chu', group: 'MDI: Quan tri' },
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
