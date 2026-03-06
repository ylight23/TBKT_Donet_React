import React from 'react';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import NumbersIcon from '@mui/icons-material/Numbers';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/List';
import SubjectIcon from '@mui/icons-material/Subject';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ShieldIcon from '@mui/icons-material/Shield';
import HandymanIcon from '@mui/icons-material/Handyman';
import ConstructionIcon from '@mui/icons-material/Construction';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TimerIcon from '@mui/icons-material/Timer';

import { FieldType, LogType } from './types';

export const FIELD_TYPES: Array<{ value: FieldType; label: string; icon: React.ReactNode; color: string }> = [
    { value: 'text', label: 'Văn bản', icon: <TextFieldsIcon sx={{ fontSize: 14 }} />, color: '#3b82f6' },
    { value: 'number', label: 'Số', icon: <NumbersIcon sx={{ fontSize: 14 }} />, color: '#34d399' },
    { value: 'date', label: 'Ngày tháng', icon: <CalendarMonthIcon sx={{ fontSize: 14 }} />, color: '#22d3ee' },
    { value: 'select', label: 'Danh sách chọn', icon: <ListIcon sx={{ fontSize: 14 }} />, color: '#a78bfa' },
    { value: 'textarea', label: 'Văn bản dài', icon: <SubjectIcon sx={{ fontSize: 14 }} />, color: '#fbbf24' },
    { value: 'checkbox', label: 'Có / Không', icon: <CheckBoxIcon sx={{ fontSize: 14 }} />, color: '#fb923c' },
];

export const LOG_TYPES: Record<LogType, { label: string; color: string; icon: React.ReactNode; fields: string[] }> = {
    bao_quan: {
        label: 'Bảo quản',
        color: '#34d399',
        icon: <ShieldIcon fontSize="small" />,
        fields: ['noi_dung', 'don_vi_thuc_hien', 'ket_qua', 'lan_tiep_theo'],
    },
    bao_duong: {
        label: 'Bảo dưỡng',
        color: '#38bdf8',
        icon: <HandymanIcon fontSize="small" />,
        fields: ['hang_muc', 'don_vi_thuc_hien', 'chi_phi', 'ket_qua', 'lan_tiep_theo'],
    },
    sua_chua: {
        label: 'Sửa chữa',
        color: '#fbbf24',
        icon: <ConstructionIcon fontSize="small" />,
        fields: ['ly_do', 'don_vi_sua_chua', 'hang_muc', 'chi_phi', 'ket_qua'],
    },
    niem_cat: {
        label: 'Niêm cất',
        color: '#a78bfa',
        icon: <InventoryIcon fontSize="small" />,
        fields: ['vi_tri', 'don_vi_quan_ly', 'ngay_bat_dau', 'ngay_ket_thuc'],
    },
    dieu_dong: {
        label: 'Điều động',
        color: '#f472b6',
        icon: <LocalShippingIcon fontSize="small" />,
        fields: ['tu_don_vi', 'den_don_vi', 'ly_do_dd', 'so_quyet_dinh'],
    },
    gio_su_dung: {
        label: 'Giờ sử dụng',
        color: '#fb923c',
        icon: <TimerIcon fontSize="small" />,
        fields: ['so_gio', 'tu_ngay', 'den_ngay', 'nhiem_vu'],
    },
};

export const LOG_LABELS: Record<string, string> = {
    noi_dung: 'Nội dung',
    don_vi_thuc_hien: 'Đơn vị thực hiện',
    ket_qua: 'Kết quả',
    lan_tiep_theo: 'Lần tiếp theo',
    hang_muc: 'Hạng mục',
    chi_phi: 'Chi phí (đ)',
    ly_do: 'Lý do',
    don_vi_sua_chua: 'Đơn vị sửa chữa',
    vi_tri: 'Vị trí niêm cất',
    don_vi_quan_ly: 'Đơn vị quản lý',
    ngay_bat_dau: 'Ngày bắt đầu',
    ngay_ket_thuc: 'Ngày kết thúc',
    tu_don_vi: 'Từ đơn vị',
    den_don_vi: 'Đến đơn vị',
    ly_do_dd: 'Lý do điều động',
    so_quyet_dinh: 'Số quyết định',
    so_gio: 'Số giờ',
    tu_ngay: 'Từ ngày',
    den_ngay: 'Đến ngày',
    nhiem_vu: 'Nhiệm vụ',
};

export const SET_COLORS = [
    '#3b82f6', '#2563eb', '#1d4ed8',
    '#22d3ee', '#06b6d4', '#0ea5e9',
    '#34d399', '#10b981', '#059669',
    '#fbbf24', '#f59e0b', '#d97706',
    '#a78bfa', '#8b5cf6', '#7c3aed',
    '#fb923c', '#f97316', '#ea580c',
    '#f43f5e', '#e11d48', '#be123c',
    '#ec4899', '#db2777', '#be185d',
    '#64748b', '#475569', '#334155',
];

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const COLOR_COMMIT_DEBOUNCE_MS = 80;
