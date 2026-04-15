import TextFieldsIcon from '@mui/icons-material/TextFields';
import NumbersIcon from '@mui/icons-material/Numbers';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/List';
import SubjectIcon from '@mui/icons-material/Subject';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShieldIcon from '@mui/icons-material/Shield';
import HandymanIcon from '@mui/icons-material/Handyman';
import ConstructionIcon from '@mui/icons-material/Construction';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import UpgradeIcon from '@mui/icons-material/Upgrade';

import type {
    LocalDynamicField as DynamicField,
    LocalFieldSet as FieldSet,
    LocalFormConfig as FormConfig,
} from '../types/thamSo';

export type { DynamicField, FieldSet, FormConfig };

export const SEED_FIELDS: DynamicField[] = []; /* [
    { id: 'ma_danh_muc', key: 'ma_danh_muc', label: 'Mã danh mục', type: 'text', required: true, validation: { minLength: 2, maxLength: 50 } },
    { id: 'f02', key: 'ten_danh_muc', label: 'Tên danh mục', type: 'text', required: true, validation: { minLength: 3, maxLength: 200 } },
    { id: 'f03', key: 'don_vi_tinh', label: 'Đơn vị tính', type: 'text', required: false, validation: {} },
    { id: 'f04', key: 'don_vi_quan_ly', label: 'Đơn vị quản lý', type: 'text', required: false, validation: {} },
    { id: 'f05', key: 'don_vi_su_dung', label: 'Đơn vị sử dụng', type: 'text', required: false, validation: {} },
    { id: 'f06', key: 'so_luong', label: 'Số lượng', type: 'number', required: false, validation: { min: 0, max: 99999 } },
    { id: 'f07', key: 'cap_chat_luong', label: 'Cấp chất lượng', type: 'select', required: false, validation: { options: ['Loại 1', 'Loại 2', 'Loại 3', 'Loại 4'] } },
    { id: 'f08', key: 'serial_number', label: 'Serial Number', type: 'text', required: false, validation: {} },
    { id: 'f09', key: 'nam_san_xuat', label: 'Năm sản xuất', type: 'number', required: false, validation: { min: 1900, max: 2100 } },
    { id: 'f10', key: 'nam_su_dung', label: 'Năm đưa vào sử dụng', type: 'number', required: false, validation: { min: 1900, max: 2100 } },
    { id: 'f11', key: 'nuoc_san_xuat', label: 'Nước sản xuất', type: 'text', required: false, validation: {} },
    { id: 'f12', key: 'hang_san_xuat', label: 'Hãng sản xuất', type: 'text', required: false, validation: {} },
    { id: 'f13', key: 'nguon_hinh_thanh', label: 'Nguồn hình thành', type: 'text', required: false, validation: {} },
    { id: 'f14', key: 'tinh_trang', label: 'Tình trạng sử dụng', type: 'select', required: false, validation: { options: ['Đang sử dụng', 'Niêm cất', 'Chờ sửa chữa', 'Đã thanh lý'] } },
    { id: 'f15', key: 'nien_han', label: 'Niên hạn sử dụng', type: 'text', required: false, validation: {} },
    { id: 'f16', key: 'dv_dam_bao_kt', label: 'Đơn vị đảm bảo kỹ thuật', type: 'text', required: false, validation: {} },
    { id: 'f17', key: 'dv_hinh_thanh_kt', label: 'Đơn vị hình thành kỹ thuật', type: 'text', required: false, validation: {} },
    { id: 'f18', key: 'tinh_nang_chien_kt', label: 'Tính năng chiến - kỹ thuật', type: 'textarea', required: false, validation: { maxLength: 2000 } },
    { id: 'f19', key: 'ghi_chu', label: 'Ghi chú', type: 'textarea', required: false, validation: { maxLength: 1000 } },

    { id: 'f20', key: 'trong_tai', label: 'Trọng tải (tấn)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f21', key: 'mod_nuoc', label: 'Mớn nước (m)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f22', key: 'chieu_dai', label: 'Chiều dài (m)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f23', key: 'cong_suat_may', label: 'Công suất máy (HP)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f24', key: 'van_toc_tau', label: 'Vận tốc tối đa (hl/h)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f25', key: 'loai_dong_co_tau', label: 'Loại động cơ tàu', type: 'text', required: false, validation: {} },

    { id: 'f26', key: 'trong_luong_mb', label: 'Trọng lượng cất cánh (kg)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f27', key: 'toc_do_mb', label: 'Tốc độ tối đa (km/h)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f28', key: 'tran_bay', label: 'Trần bay (m)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f29', key: 'ban_kinh_hd', label: 'Bán kính hoạt động (km)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f30', key: 'loai_dong_co_mb', label: 'Loại động cơ', type: 'text', required: false, validation: {} },

    { id: 'f31', key: 'trong_luong_xt', label: 'Trọng lượng (tấn)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f32', key: 'vo_giap', label: 'Vỏ giáp (mm)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f33', key: 'cong_suat_xt', label: 'Công suất động cơ (HP)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f34', key: 'toc_do_xt', label: 'Tốc độ đường bộ (km/h)', type: 'number', required: false, validation: { min: 0 } },
    { id: 'f35', key: 'co_cau_vu_khi', label: 'Cơ cấu vũ khí', type: 'textarea', required: false, validation: { maxLength: 1000 } },

    // Maintenance & Repair
    { id: 'f36', key: 'ten_bao_quan', label: 'Tên bảo quản', type: 'text', required: true, validation: { maxLength: 200 } },
    { id: 'f37', key: 'can_cu_bq', label: 'Căn cứ (BQ)', type: 'text', required: false, validation: { maxLength: 300 } },
    { id: 'f38', key: 'don_vi_thuc_hien_bq', label: 'Đơn vị thực hiện (BQ)', type: 'text', required: false, validation: {} },
    { id: 'f39', key: 'ngay_bao_quan', label: 'Ngày bảo quản', type: 'date', required: false, validation: {} },
    { id: 'f40', key: 'nguoi_phu_trach_bq', label: 'Người phụ trách (BQ)', type: 'text', required: false, validation: {} },
    { id: 'f41', key: 'nguoi_thuc_hien_bq', label: 'Người thực hiện (BQ)', type: 'text', required: false, validation: {} },
    { id: 'f42', key: 'thoi_gian_lap_bq', label: 'Thời gian lập (BQ)', type: 'date', required: false, validation: {} },
    { id: 'f43', key: 'noi_dung_cong_viec_bq', label: 'Nội dung công việc (BQ)', type: 'textarea', required: false, validation: { maxLength: 2000 } },
    { id: 'f44', key: 'vat_chat_bao_dam_bq', label: 'Vật chất bảo đảm (BQ)', type: 'textarea', required: false, validation: { maxLength: 1000 } },
    { id: 'f45', key: 'ket_qua_bq', label: 'Kết quả bảo quản', type: 'select', required: false, validation: { options: ['Đạt', 'Không đạt', 'Đang thực hiện'] } },

    { id: 'f46', key: 'ten_bao_duong', label: 'Tên bảo dưỡng', type: 'text', required: true, validation: { maxLength: 200 } },
    { id: 'f47', key: 'can_cu_bd', label: 'Căn cứ (BD)', type: 'text', required: false, validation: { maxLength: 300 } },
    { id: 'f48', key: 'don_vi_thuc_hien_bd', label: 'Đơn vị thực hiện (BD)', type: 'text', required: false, validation: {} },
    { id: 'f49', key: 'ngay_bao_duong', label: 'Ngày bảo dưỡng', type: 'date', required: false, validation: {} },
    { id: 'f50', key: 'nguoi_phu_trach_bd', label: 'Người phụ trách (BD)', type: 'text', required: false, validation: {} },
    { id: 'f51', key: 'nguoi_thuc_hien_bd', label: 'Người thực hiện (BD)', type: 'text', required: false, validation: {} },
    { id: 'f52', key: 'thoi_gian_lap_bd', label: 'Thời gian lập (BD)', type: 'date', required: false, validation: {} },
    { id: 'f53', key: 'noi_dung_cong_viec_bd', label: 'Nội dung công việc (BD)', type: 'textarea', required: false, validation: { maxLength: 2000 } },
    { id: 'f54', key: 'vat_chat_bao_dam_bd', label: 'Vật chất bảo đảm (BD)', type: 'textarea', required: false, validation: { maxLength: 1000 } },
    { id: 'f55', key: 'ket_qua_bd', label: 'Kết quả bảo dưỡng', type: 'select', required: false, validation: { options: ['Đạt', 'Không đạt', 'Đang thực hiện'] } },

    { id: 'f56', key: 'tieu_de_sc', label: 'Tiêu đề (SC)', type: 'text', required: true, validation: { maxLength: 200 } },
    { id: 'f57', key: 'can_cu_sc', label: 'Căn cứ (SC)', type: 'text', required: false, validation: { maxLength: 300 } },
    { id: 'f58', key: 'muc_sua_chua', label: 'Mức sửa chữa', type: 'select', required: false, validation: { options: ['Nhỏ', 'Vừa', 'Lớn', 'Thiết bị'] } },
    { id: 'f59', key: 'cap_sua_chua', label: 'Cấp sửa chữa', type: 'select', required: false, validation: { options: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp nhà máy'] } },
    { id: 'f60', key: 'don_vi_sua_chua_sc', label: 'Đơn vị sửa chữa', type: 'text', required: false, validation: {} },
    { id: 'f61', key: 'don_vi_de_nghi_sc', label: 'Đơn vị đề nghị', type: 'text', required: false, validation: {} },
    { id: 'f62', key: 'ngay_de_nghi_sc', label: 'Ngày đề nghị (SC)', type: 'date', required: false, validation: {} },
    { id: 'f63', key: 'ghi_chu_sc', label: 'Ghi chú (SC)', type: 'textarea', required: false, validation: { maxLength: 1000 } }
]; */

export const SEED_SETS: FieldSet[] = []; /* [
    {
        id: 'gs01',
        name: 'Trang bị chuyên ngành',
        icon: 'Assignment',
        color: '#3b82f6',
        desc: '19 trường thông tin gốc bắt buộc theo quy định',
        fieldIds: ['ma_danh_muc', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f08', 'f09', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19'],
    },
    {
        id: 'gs02',
        name: 'Tàu thuyền',
        icon: 'DirectionsBoat',
        color: '#22d3ee',
        desc: 'Thông số kỹ thuật chuyên ngành tàu thuyền',
        fieldIds: ['f20', 'f21', 'f22', 'f23', 'f24', 'f25'],
    },
    {
        id: 'gs03',
        name: 'Máy bay',
        icon: 'Flight',
        color: '#a78bfa',
        desc: 'Thông số kỹ thuật chuyên ngành máy bay',
        fieldIds: ['f26', 'f27', 'f28', 'f29', 'f30'],
    },
    {
        id: 'gs04',
        name: 'Xe tăng - Xe bọc thép',
        icon: 'Security',
        color: '#fbbf24',
        desc: 'Thông số kỹ thuật chuyên ngành xe tăng / thiết giáp',
        fieldIds: ['f31', 'f32', 'f33', 'f34', 'f35'],
    },
    {
        id: 'gs05',
        name: 'Bảo quản',
        icon: 'Shield',
        color: '#34d399',
        desc: 'Bộ trường nhập liệu cho kế hoạch và kết quả bảo quản',
        fieldIds: ['f36', 'f37', 'f38', 'f39', 'f40', 'f41', 'f42', 'f43', 'f44', 'f45'],
    },
    {
        id: 'gs06',
        name: 'Bảo dưỡng',
        icon: 'Handyman',
        color: '#38bdf8',
        desc: 'Bộ trường nhập liệu cho kế hoạch và kết quả bảo dưỡng',
        fieldIds: ['f46', 'f47', 'f48', 'f49', 'f50', 'f51', 'f52', 'f53', 'f54', 'f55'],
    },
    {
        id: 'gs07',
        name: 'Sửa chữa',
        icon: 'Construction',
        color: '#fbbf24',
        desc: 'Bộ trường nhập liệu cho phếu đề nghị và kết quả sửa chữa',
        fieldIds: ['f56', 'f57', 'f58', 'f59', 'f60', 'f61', 'f62', 'f63'],
    },
]; */

export const SEED_FORMS: FormConfig[] = []; /* [
    {
        id: 'f-nhom1',
        name: 'Trang bị Nhóm 1',
        desc: 'Cấu hình nhập liệu cho phương tiện thông tin',
        tabs: [
            { id: 't-g-1', label: 'Thông tin chung', setIds: ['gs01'] },
            { id: 't-s-1', label: 'Thông số kỹ thuật (Tàu)', setIds: ['gs02'] },
            { id: 't-b-1', label: 'Thông số kỹ thuật (Bảo quản)', setIds: ['gs05'] },
        ],
    },
    {
        id: 'f-nhom2',
        name: 'Trang bị Nhóm 2',
        desc: 'Cấu hình nhập liệu cho phương tiện bay, xe thiết giáp',
        tabs: [
            { id: 't-g-2', label: 'Thông tin chung', setIds: ['gs01'] },
            { id: 't-s-2', label: 'Thông số kỹ thuật (Bay)', setIds: ['gs03'] },
            { id: 't-x-2', label: 'Thông số kỹ thuật (Xe thiết giáp)', setIds: ['gs04'] },
        ],
    },
]; */
