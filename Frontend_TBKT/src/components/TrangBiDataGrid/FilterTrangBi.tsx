import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    GridLegacy as Grid,
    Typography,
    InputAdornment,
    IconButton,
    MenuItem,
    Stack,
    Collapse,
    Card,
    CardContent,
    useTheme,
    Chip,
    Tooltip,
    Select,
    Popover,
    Divider,
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import BusinessIcon from '@mui/icons-material/Business';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import HistoryIcon from '@mui/icons-material/History';
import CategoryIcon from '@mui/icons-material/Category';
import VerifiedIcon from '@mui/icons-material/Verified';
import EngineeringIcon from '@mui/icons-material/Engineering';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CommonFilter from '../Filter/CommonFilter';
import { ChatLuong, TrangThaiTrangBi } from '../../data/mockTBData';
import OfficeDictionaryDialog from '../../pages/Employee/subComponent/OfficeDictionaryDialog';
import { OfficeNode } from '../../pages/Office/subComponent/OfficeDictionary';
import OfficeContext from '../../context/OfficeContext';
import { listDanhMucChuyenNganh } from '../../apis/danhmucChuyenNganhApi';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FilterTrangBiValues {
    donVi: string;
    maTrangBi: string;
    nhom: string;
    tenTrangBi: string;
    phanNganh: string;
    capChatLuong: string;
    tinhTrangSuDung: string;
    tinhTrangKyThuat: string;
    soHieu: string;
    donViQuanLy: string;
    namSanXuat: string;
    namSuDung: string;
    fullTextSearch: string;
}

interface FilterTrangBiProps {
    onSearch: (values: FilterTrangBiValues) => void;
    onClear: () => void;
    initialValues?: Partial<FilterTrangBiValues>;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CAP_CHAT_LUONG_OPTIONS = Object.values(ChatLuong);
const TINH_TRANG_SU_DUNG_OPTIONS = Object.values(TrangThaiTrangBi);

const NHOM_OPTIONS = [
    'Nhóm 1',
    'Nhóm 2',
    'Nhóm 3',
];

const TINH_TRANG_KY_THUAT_OPTIONS = [
    'Đang hoạt động',
    'Hư hỏng nhẹ',
    'Hư hỏng nặng',
    'Đang bảo trì',
    'Chờ sửa chữa',
];

// ── Component ──────────────────────────────────────────────────────────────────

const FilterTrangBi: React.FC<FilterTrangBiProps> = ({ onSearch, onClear, initialValues }) => {
    const theme = useTheme();
    const officeCtx = useContext(OfficeContext) as any;
    const officeList = officeCtx?.state?.allOffices ?? [];

    const [expanded, setExpanded] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [filters, setFilters] = useState<FilterTrangBiValues>({
        donVi: '',
        maTrangBi: '',
        nhom: '',
        tenTrangBi: '',
        phanNganh: '',
        capChatLuong: '',
        tinhTrangSuDung: '',
        tinhTrangKyThuat: '',
        soHieu: '',
        donViQuanLy: '',
        namSanXuat: '',
        namSuDung: '',
        fullTextSearch: '',
        ...initialValues,
    });

    const [officeNames, setOfficeNames] = useState({
        donVi: '',
        donViQuanLy: '',
    });

    const [openOfficeDialog, setOpenOfficeDialog] = useState(false);
    const [currentOfficeField, setCurrentOfficeField] = useState<'donVi' | 'donViQuanLy' | null>(null);
    const [phanNganhOptions, setPhanNganhOptions] = useState<string[]>([]);

    useEffect(() => {
        let isMounted = true;
        listDanhMucChuyenNganh()
            .then((items) => {
                if (!isMounted) return;
                const options = items
                    .map((item) => (item.vietTat?.trim() || item.ten?.trim() || item.id?.trim()))
                    .filter((value): value is string => Boolean(value));
                setPhanNganhOptions(options);
            })
            .catch(() => {
                if (isMounted) {
                    setPhanNganhOptions([]);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleFieldChange = (field: keyof FilterTrangBiValues, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenOfficeDialog = (field: 'donVi' | 'donViQuanLy') => {
        setCurrentOfficeField(field);
        setOpenOfficeDialog(true);
    };

    const handleSelectOffice = (office: OfficeNode | null) => {
        if (currentOfficeField) {
            const field = currentOfficeField;
            const id = office?.id ? String(office.id) : '';
            const name = office?.ten || office?.tenDayDu || '';

            setFilters(prev => ({ ...prev, [field]: id }));
            setOfficeNames(prev => ({ ...prev, [field]: name }));
        }
        setOpenOfficeDialog(false);
        setCurrentOfficeField(null);
    };

    const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'filter-popover' : undefined;

    const activeFilters = useMemo(() => {
        const chips = [];
        if (filters.donVi) chips.push({ key: 'donVi', label: `Đơn vị: ${officeNames.donVi || filters.donVi}`, icon: <BusinessIcon fontSize="small" /> });
        if (filters.donViQuanLy) chips.push({ key: 'donViQuanLy', label: `Quản lý: ${officeNames.donViQuanLy || filters.donViQuanLy}`, icon: <BusinessIcon fontSize="small" /> });
        if (filters.maTrangBi) chips.push({ key: 'maTrangBi', label: `Mã: ${filters.maTrangBi}`, icon: <CategoryIcon fontSize="small" /> });
        if (filters.soHieu) chips.push({ key: 'soHieu', label: `Số hiệu: ${filters.soHieu}`, icon: <CategoryIcon fontSize="small" /> });
        if (filters.nhom) chips.push({ key: 'nhom', label: `Nhóm: ${filters.nhom}`, icon: <CategoryIcon fontSize="small" /> });
        if (filters.phanNganh) chips.push({ key: 'phanNganh', label: `Ngành: ${filters.phanNganh}`, icon: <CategoryIcon fontSize="small" /> });
        if (filters.capChatLuong) chips.push({ key: 'capChatLuong', label: `CL: ${filters.capChatLuong}`, icon: <VerifiedIcon fontSize="small" /> });
        if (filters.tinhTrangKyThuat) chips.push({ key: 'tinhTrangKyThuat', label: `KT: ${filters.tinhTrangKyThuat}`, icon: <EngineeringIcon fontSize="small" /> });
        if (filters.tinhTrangSuDung) chips.push({ key: 'tinhTrangSuDung', label: `Sử dụng: ${filters.tinhTrangSuDung}`, icon: <HistoryIcon fontSize="small" /> });
        if (filters.namSanXuat) chips.push({ key: 'namSanXuat', label: `Năm SX: ${filters.namSanXuat}`, icon: <CalendarTodayIcon fontSize="small" /> });
        if (filters.namSuDung) chips.push({ key: 'namSuDung', label: `Năm SD: ${filters.namSuDung}`, icon: <CalendarTodayIcon fontSize="small" /> });
        if (filters.tenTrangBi) chips.push({ key: 'tenTrangBi', label: `Tên: ${filters.tenTrangBi}`, icon: <CategoryIcon fontSize="small" /> });
        return chips;
    }, [filters, officeNames]);

    const handleRemoveFilter = (key: keyof FilterTrangBiValues | string) => {
        const fieldKey = key as keyof FilterTrangBiValues;
        setFilters(prev => ({ ...prev, [fieldKey]: '' }));
        if (fieldKey === 'donVi') setOfficeNames(prev => ({ ...prev, donVi: '' }));
        if (fieldKey === 'donViQuanLy') setOfficeNames(prev => ({ ...prev, donViQuanLy: '' }));

        // Auto search after removing a chip
        setTimeout(() => {
            onSearch({ ...filters, [fieldKey]: '' });
        }, 0);
    };

    const handleSearch = () => {
        onSearch(filters);
    };

    const handleClear = () => {
        const cleared: FilterTrangBiValues = {
            donVi: '',
            maTrangBi: '',
            nhom: '',
            tenTrangBi: '',
            phanNganh: '',
            capChatLuong: '',
            tinhTrangSuDung: '',
            tinhTrangKyThuat: '',
            soHieu: '',
            donViQuanLy: '',
            namSanXuat: '',
            namSuDung: '',
            fullTextSearch: '',
        };
        setFilters(cleared);
        setOfficeNames({ donVi: '', donViQuanLy: '' });
        onClear();
        handleClosePopover();
    };

    const activeFilterCount = activeFilters.length;

    return (
        <>
            <CommonFilter
                search={filters.fullTextSearch}
                onSearchChange={(val) => handleFieldChange('fullTextSearch', val)}
                onSearchSubmit={handleSearch}
                placeholder="Tìm kiếm nhanh mã hiệu, tên, số hiệu trang bị..."
                activeFilters={activeFilters}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClear}
                showSearchButton={true}
                popoverTitle="Bộ lọc nâng cao"
                popoverDescription="Tinh chỉnh kết quả tìm kiếm theo các tiêu chí kỹ thuật"
                popoverWidth={720}
                onApply={handleSearch}
            >
                <Grid container spacing={2.5}>
                    {/* Row 1 */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            ĐƠN VỊ HIỆN TẠI
                        </Typography>
                        <TextField
                            fullWidth size="small"
                            value={officeNames.donVi}
                            placeholder="Chọn đơn vị…"
                            onClick={() => handleOpenOfficeDialog('donVi')}
                            InputProps={{
                                readOnly: true,
                                startAdornment: <InputAdornment position="start"><BusinessIcon fontSize="small" color="action" /></InputAdornment>,
                                sx: { cursor: 'pointer', borderRadius: 2.5}
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            ĐƠN VỊ QUẢN LÝ
                        </Typography>
                        <TextField
                            fullWidth size="small"
                            value={officeNames.donViQuanLy}
                            placeholder="Chọn đơn vị..."
                            onClick={() => handleOpenOfficeDialog('donViQuanLy')}
                            InputProps={{
                                readOnly: true,
                                startAdornment: <InputAdornment position="start"><BusinessIcon fontSize="small" color="action" /></InputAdornment>,
                                sx: { cursor: 'pointer', borderRadius: 2.5}
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            MÃ TRANG BỊ
                        </Typography>
                        <TextField
                            fullWidth size="small"
                            placeholder="Nhập mã..."
                            value={filters.maTrangBi}
                            onChange={(e) => handleFieldChange('maTrangBi', e.target.value)}
                            InputProps={{ sx: { borderRadius: 2.5} }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            SỐ HIỆU
                        </Typography>
                        <TextField
                            fullWidth size="small"
                            placeholder="Nhập số hiệu..."
                            value={filters.soHieu}
                            onChange={(e) => handleFieldChange('soHieu', e.target.value)}
                            InputProps={{ sx: { borderRadius: 2.5} }}
                        />
                    </Grid>

                    {/* Row 2 */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            NHÓM
                        </Typography>
                        <TextField
                            select fullWidth size="small"
                            value={filters.nhom}
                            onChange={(e) => handleFieldChange('nhom', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><CategoryIcon fontSize="small" color="action" /></InputAdornment>
                            }}
                        >
                            <MenuItem value=""><em>Tất cả</em></MenuItem>
                            {NHOM_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            PHÂN NGÀNH
                        </Typography>
                        <TextField
                            select fullWidth size="small"
                            value={filters.phanNganh}
                            onChange={(e) => handleFieldChange('phanNganh', e.target.value)}
                            InputProps={{ sx: { borderRadius: 2.5} }}
                        >
                            <MenuItem value=""><em>Tất cả</em></MenuItem>
                            {phanNganhOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            CẤP CHẤT LƯỢNG
                        </Typography>
                        <TextField
                            select fullWidth size="small"
                            value={filters.capChatLuong}
                            onChange={(e) => handleFieldChange('capChatLuong', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><VerifiedIcon fontSize="small" color="action" /></InputAdornment>
                            }}
                        >
                            <MenuItem value=""><em>Tất cả</em></MenuItem>
                            {CAP_CHAT_LUONG_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            TÌNH TRẠNG KỸ THUẬT
                        </Typography>
                        <TextField
                            select fullWidth size="small"
                            value={filters.tinhTrangKyThuat}
                            onChange={(e) => handleFieldChange('tinhTrangKyThuat', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><EngineeringIcon fontSize="small" color="action" /></InputAdornment>
                            }}
                        >
                            <MenuItem value=""><em>Tất cả</em></MenuItem>
                            {TINH_TRANG_KY_THUAT_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </TextField>
                    </Grid>

                    {/* Row 3 */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            TÌNH TRẠNG SỬ DỤNG
                        </Typography>
                        <TextField
                            select fullWidth size="small"
                            value={filters.tinhTrangSuDung}
                            onChange={(e) => handleFieldChange('tinhTrangSuDung', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><HistoryIcon fontSize="small" color="action" /></InputAdornment>
                            }}
                        >
                            <MenuItem value=""><em>Tất cả</em></MenuItem>
                            {TINH_TRANG_SU_DUNG_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            NĂM SẢN XUẤT
                        </Typography>
                        <TextField
                            fullWidth size="small" type="number"
                            placeholder="2024..."
                            value={filters.namSanXuat}
                            onChange={(e) => handleFieldChange('namSanXuat', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><CalendarTodayIcon fontSize="small" color="action" /></InputAdornment>
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            NĂM SỬ DỤNG
                        </Typography>
                        <TextField
                            fullWidth size="small" type="number"
                            placeholder="2024..."
                            value={filters.namSuDung}
                            onChange={(e) => handleFieldChange('namSuDung', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><CalendarTodayIcon fontSize="small" color="action" /></InputAdornment>
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            TÊN TRANG BỊ
                        </Typography>
                        <TextField
                            fullWidth size="small"
                            placeholder="Nhập tên..."
                            value={filters.tenTrangBi}
                            onChange={(e) => handleFieldChange('tenTrangBi', e.target.value)}
                            InputProps={{ sx: { borderRadius: 2.5} }}
                        />
                    </Grid>
                </Grid>
            </CommonFilter>

            <OfficeDictionaryDialog
                open={openOfficeDialog}
                onClose={() => setOpenOfficeDialog(false)}
                onSelect={handleSelectOffice}
                selectedId={currentOfficeField ? filters[currentOfficeField] : undefined}
                title={currentOfficeField === 'donVi' ? 'Chọn đơn vị hiện tại' : 'Chọn đơn vị quản lý'}
                offices={officeList}
            />
        </>
    );
};

export default FilterTrangBi;
