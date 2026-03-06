import React from 'react';
import { Icon } from '@iconify/react';
import SvgIcon from '@mui/material/SvgIcon';

// ── Import toàn bộ @mui/icons-material dưới dạng namespace ─────────────────────
// Cách này không cần import từng icon, tự động phát hiện tất cả icons có sẵn
import * as MuiIcons from '@mui/icons-material';

export interface FieldSetIconOption {
    name: string;
    label: string;
    group?: string;
    node: React.ReactNode;
}

// ── Danh sách icon MUI với nhãn tiếng Việt ─────────────────────────────────────
// Thêm icon mới: chỉ cần thêm entry vào đây, KHÔNG cần import thêm
const muiIconRegistry: Array<{ name: string; label: string; group: string }> = [
    // Cơ bản
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

    // Quân sự & Trang bị
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

    // Nghiệp vụ
    { name: 'Shield', label: 'Bảo quản', group: 'Nghiệp vụ' },
    { name: 'Handyman', label: 'Bảo dưỡng', group: 'Nghiệp vụ' },
    { name: 'Construction', label: 'Sửa chữa', group: 'Nghiệp vụ' },
    { name: 'Inventory', label: 'Niêm cất', group: 'Nghiệp vụ' },
    { name: 'LocalShipping', label: 'Điều động', group: 'Nghiệp vụ' },
    { name: 'Timer', label: 'Thời gian', group: 'Nghiệp vụ' },
    { name: 'CalendarMonth', label: 'Lịch tháng', group: 'Nghiệp vụ' },
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

    // Nhân sự & Tổ chức
    { name: 'People', label: 'Nhân sự', group: 'Nhân sự' },
    { name: 'Person', label: 'Cá nhân', group: 'Nhân sự' },
    { name: 'Groups', label: 'Nhóm', group: 'Nhân sự' },
    { name: 'AccountBalance', label: 'Đơn vị', group: 'Nhân sự' },
    { name: 'Apartment', label: 'Cơ quan', group: 'Nhân sự' },
    { name: 'AdminPanelSettings', label: 'Quản trị viên', group: 'Nhân sự' },
    { name: 'ManageAccounts', label: 'Quản lý tài khoản', group: 'Nhân sự' },
    { name: 'BadgeOutlined', label: 'Chứng danh', group: 'Nhân sự' },
    { name: 'ContactEmergency', label: 'Hồ sơ khẩn', group: 'Nhân sự' },

    // Tài chính & Kế hoạch
    { name: 'AttachMoney', label: 'Kinh phí', group: 'Tài chính' },
    { name: 'AccountBalanceWallet', label: 'Ngân sách', group: 'Tài chính' },
    { name: 'TrendingUp', label: 'Xu hướng tăng', group: 'Tài chính' },
    { name: 'TrendingDown', label: 'Xu hướng giảm', group: 'Tài chính' },
    { name: 'BarChart', label: 'Thống kê', group: 'Tài chính' },
    { name: 'PieChart', label: 'Biểu đồ tròn', group: 'Tài chính' },
    { name: 'ShowChart', label: 'Đồ thị', group: 'Tài chính' },

    // Khác
    { name: 'Star', label: 'Ưu tiên', group: 'Khác' },
    { name: 'Bolt', label: 'Nhanh', group: 'Khác' },
    { name: 'Verified', label: 'Xác thực', group: 'Khác' },
    { name: 'Flag', label: 'Mốc chuẩn', group: 'Khác' },
    { name: 'Place', label: 'Vị trí', group: 'Khác' },
    { name: 'Upgrade', label: 'Nâng cấp', group: 'Khác' },
    { name: 'Lock', label: 'Khóa', group: 'Khác' },
    { name: 'LockOpen', label: 'Mở khóa', group: 'Khác' },
    { name: 'Key', label: 'Chìa khóa', group: 'Khác' },
    { name: 'QrCode', label: 'Mã QR', group: 'Khác' },
    { name: 'Barcode', label: 'Mã vạch', group: 'Khác' },
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

// ── Hàm lấy MUI icon component theo tên ─────────────────────────────────────────
// Tìm trong namespace @mui/icons-material, tránh phải import thủ công từng cái
const getMuiIconComponent = (name: string): React.ElementType | null => {
    // Thử các hậu tố phổ biến: Outlined, Rounded, TwoTone, Sharp
    const iconKey = name as keyof typeof MuiIcons;
    if (MuiIcons[iconKey]) return MuiIcons[iconKey] as React.ElementType;
    return null;
};

const createMuiIconNode = (name: string): React.ReactNode => {
    const Component = getMuiIconComponent(name);
    if (!Component) return <SvgIcon sx={{ fontSize: 18 }} />;
    return <Component sx={{ fontSize: 18 }} />;
};

// ── Tạo options cho Iconify ─────────────────────────────────────────────────────
const iconifyOptions: Array<Pick<FieldSetIconOption, 'name' | 'label' | 'group'>> = [
    // Trang bị nâng cao
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

    // Nghiệp vụ
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

    // Quản trị
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

const createIconifyNode = (iconName: string): React.ReactNode => (
    <Icon icon={iconName} width={18} height={18} />
);

// ── Build danh sách cuối cùng ───────────────────────────────────────────────────

const muiIconOptions: FieldSetIconOption[] = muiIconRegistry
    .filter(({ name }) => getMuiIconComponent(name) !== null) // bỏ qua name không tồn tại
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
    new Set(FIELD_SET_ICON_OPTIONS.map((option) => option.group ?? 'Khác')),
);

export const iconMapping: Record<string, React.ReactNode> = FIELD_SET_ICON_OPTIONS.reduce((acc, option) => {
    acc[option.name] = option.node;
    return acc;
}, {} as Record<string, React.ReactNode>);

export const nameToIcon = (name: string): React.ReactNode => {
    const normalized = name?.trim();
    if (!normalized) return createMuiIconNode('Assignment');

    // Thử tìm trong registry MUI
    const muiEntry = muiIconRegistry.find(e => e.name === normalized);
    if (muiEntry) return createMuiIconNode(normalized);

    // Thử dùng Iconify (mdi:...)
    if (normalized.startsWith('mdi:') || normalized.includes(':')) {
        return createIconifyNode(normalized);
    }

    // Fallback: thử trực tiếp trong @mui/icons-material
    const directComp = getMuiIconComponent(normalized);
    if (directComp) return React.createElement(directComp, { sx: { fontSize: 18 } });

    return createMuiIconNode('Assignment');
};

export const iconToName = (node: React.ReactNode): string => {
    if (!node) return 'Assignment';

    if (typeof node === 'string') {
        const normalized = node.trim();
        const inRegistry = muiIconRegistry.find(e => e.name === normalized);
        if (inRegistry || normalized.startsWith('mdi:')) return normalized;
        return 'Assignment';
    }

    const reactNode = node as any;

    // Iconify icon
    const iconProp = reactNode?.props?.icon;
    if (typeof iconProp === 'string' && iconProp.includes(':')) return iconProp;

    // MUI icon — so sánh component type
    const targetType = reactNode?.type;
    for (const option of muiIconOptions) {
        const sourceType = (option.node as any)?.type;
        if (sourceType && sourceType === targetType) return option.name;
    }

    // Fallback: so sánh tên displayName
    const typeName: string = targetType?.displayName || targetType?.name || '';
    if (typeName) {
        const found = muiIconRegistry.find(e =>
            typeName.toLowerCase().includes(e.name.toLowerCase()),
        );
        if (found) return found.name;
    }

    return 'Assignment';
};
