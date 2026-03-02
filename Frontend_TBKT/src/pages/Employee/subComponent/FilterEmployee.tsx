import React, { useState, useMemo } from 'react';

// ✅ Direct imports
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Search from '@mui/icons-material/Search';
import Clear from '@mui/icons-material/Clear';
import Business from '@mui/icons-material/Business';
import Close from '@mui/icons-material/Close';
import Badge from '@mui/icons-material/Badge';
import Work from '@mui/icons-material/Work';
import AccountTree from '@mui/icons-material/AccountTree';
import FilterAlt from '@mui/icons-material/FilterAlt';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import Grid from '@mui/material/GridLegacy';
import { useTheme } from '@mui/material/styles';

import OfficeDictionaryDialog from './OfficeDictionaryDialog';
import { OfficeNode } from '../../Office/subComponent/OfficeDictionary';
import { useEmployee } from '../../../context/EmployeeContext';


// ── Types ──────────────────────────────────────────────────────────────────────

interface FilterValues {
    searchText: string;
    idCapBac: string;
    chucVu: string;
    idDonVi: string;
    idQuanTriDonVi: string;
}

interface ActiveFilterChip {
    key: keyof FilterValues;
    label: string;
    icon: React.ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default';
}

// ── Component ──────────────────────────────────────────────────────────────────

const FilterEmployee: React.FC = () => {
    const theme = useTheme();
    const { state, actions } = useEmployee();
    const { capBacList, officeList } = state;
    const { filterEmployees } = actions;

    const [filters, setFilters] = useState<FilterValues>({
        searchText: '', idCapBac: '', chucVu: '', idDonVi: '', idQuanTriDonVi: '',
    });
    const [openOfficePopup, setOpenOfficePopup] = useState(false);
    const [currentOfficeField, setCurrentOfficeField] = useState<keyof FilterValues | null>(null);
    const [officeNames, setOfficeNames] = useState<{ idDonVi: string; idQuanTriDonVi: string }>({ idDonVi: '', idQuanTriDonVi: '' });
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const capBacMap = useMemo(() => {
        const map: Record<string, string> = {};
        capBacList.forEach(item => { map[item.id] = item.ten || item.id; });
        return map;
    }, [capBacList]);

    const handleFilterChange = (field: keyof FilterValues, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenPopover = (event: React.MouseEvent<HTMLElement>, type: string) => {
        setAnchorEl(event.currentTarget);
        setFilterType(type);
    };

    const handleClosePopover = () => { setAnchorEl(null); setFilterType(null); };

    const handleOpenOfficeDialog = (_event: React.MouseEvent, fieldName: keyof FilterValues) => {
        setCurrentOfficeField(fieldName);
        setOpenOfficePopup(true);
    };

    const handleSelectOffice = (office: OfficeNode | null) => {
        if (currentOfficeField) {
            if (office) {
                setFilters(prev => ({ ...prev, [currentOfficeField!]: String(office.id || '') }));
                setOfficeNames(prev => ({ ...prev, [currentOfficeField!]: (office.ten || office.tenDayDu || office.id) as string }));
            } else {
                setFilters(prev => ({ ...prev, [currentOfficeField!]: '' }));
                setOfficeNames(prev => ({ ...prev, [currentOfficeField!]: '' }));
            }
        }
        setOpenOfficePopup(false);
        setCurrentOfficeField(null);
    };

    const handleSelectCapBac = (id: string) => { handleFilterChange('idCapBac', id); handleClosePopover(); };

    const handleRemoveFilter = (filterKey: keyof FilterValues) => {
        setFilters(prev => ({ ...prev, [filterKey]: '' }));
        if (filterKey === 'idDonVi' || filterKey === 'idQuanTriDonVi') {
            setOfficeNames(prev => ({ ...prev, [filterKey]: '' }));
        }
    };

    const handleSearch = () => { filterEmployees(filters); };

    const handleClearAll = () => {
        const empty: FilterValues = { searchText: '', idCapBac: '', chucVu: '', idDonVi: '', idQuanTriDonVi: '' };
        setFilters(empty);
        setOfficeNames({ idDonVi: '', idQuanTriDonVi: '' });
        filterEmployees(empty);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

    const activeFilters = useMemo<ActiveFilterChip[]>(() => {
        const chips: ActiveFilterChip[] = [];
        if (filters.idCapBac) chips.push({ key: 'idCapBac', label: `Cấp bậc: ${capBacMap[filters.idCapBac] || filters.idCapBac}`, icon: <Badge fontSize="small" />, color: 'primary' });
        if (filters.chucVu) chips.push({ key: 'chucVu', label: `Chức vụ: ${filters.chucVu}`, icon: <Work fontSize="small" />, color: 'secondary' });
        if (filters.idDonVi) chips.push({ key: 'idDonVi', label: `Đơn vị: ${officeNames.idDonVi || filters.idDonVi}`, icon: <Business fontSize="small" />, color: 'success' });
        if (filters.idQuanTriDonVi) chips.push({ key: 'idQuanTriDonVi', label: `QT đơn vị: ${officeNames.idQuanTriDonVi || filters.idQuanTriDonVi}`, icon: <AccountTree fontSize="small" />, color: 'warning' });
        return chips;
    }, [filters, capBacMap, officeNames]);

    const open = Boolean(anchorEl);

    const [mainPopoverAnchor, setMainPopoverAnchor] = useState<HTMLButtonElement | null>(null);

    const handleOpenMainPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMainPopoverAnchor(event.currentTarget);
    };

    const handleCloseMainPopover = () => {
        setMainPopoverAnchor(null);
    };

    const isMainPopoverOpen = Boolean(mainPopoverAnchor);
    const mainPopoverId = isMainPopoverOpen ? 'employee-filter-popover' : undefined;

    const activeFilterCount = activeFilters.length;

    return (
        <>
            <Card
                elevation={0}
                sx={{
                    mb: 4,
                    borderRadius: 4,
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        borderColor: theme.palette.primary.light,
                        boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.06)',
                    }
                }}
            >
                <CardContent sx={{ p: '12px 16px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm kiếm nhân sự theo tên, email, số điện thoại..."
                            autoComplete="off"
                            value={filters.searchText}
                            onChange={(e) => handleFilterChange('searchText', e.target.value)}
                            onKeyPress={handleKeyPress}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search color="action" fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            {filters.searchText && (
                                                <IconButton size="small" onClick={() => handleFilterChange('searchText', '')}>
                                                    <Clear fontSize="small" />
                                                </IconButton>
                                            )}
                                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
                                            <Tooltip title="Bộ lọc nâng cao">
                                                <Button
                                                    size="small"
                                                    onClick={handleOpenMainPopover}
                                                    variant="text"
                                                    color={activeFilterCount > 0 ? "primary" : "inherit"}
                                                    startIcon={<FilterAlt fontSize="small" />}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        borderRadius: 2,
                                                        px: 1.5,
                                                        minWidth: 'auto',
                                                        position: 'relative',
                                                        bgcolor: activeFilterCount > 0 ? `${theme.palette.primary.main}15` : 'transparent',
                                                        '&:hover': {
                                                            bgcolor: activeFilterCount > 0 ? `${theme.palette.primary.main}25` : theme.palette.action.hover
                                                        }
                                                    }}
                                                >
                                                    Bộ lọc
                                                    {activeFilterCount > 0 && (
                                                        <Box sx={{
                                                            position: 'absolute', top: 4, right: 4,
                                                            width: 6, height: 6, bgcolor: 'error.main',
                                                            borderRadius: '50%', border: `1px solid ${theme.palette.background.paper}`
                                                        }} />
                                                    )}
                                                </Button>
                                            </Tooltip>
                                        </Stack>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                                    '& fieldset': { borderColor: 'transparent' },
                                    '&:hover fieldset': { borderColor: theme.palette.primary.light },
                                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                                    transition: 'all 0.2s',
                                }
                            }}
                        />

                        <Button
                            variant="contained"
                            onClick={handleSearch}
                            sx={{
                                borderRadius: 3, px: 3.5, height: 40,
                                textTransform: 'none', fontWeight: 700,
                                boxShadow: `0 4px 14px ${theme.palette.primary.main}44`,
                                '&:hover': { boxShadow: `0 6px 20px ${theme.palette.primary.main}66` }
                            }}
                        >
                            Tìm kiếm
                        </Button>
                    </Box>

                    {activeFilters.length > 0 && (
                        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {activeFilters.map((filter) => (
                                <Chip
                                    key={filter.key}
                                    icon={filter.icon as React.ReactElement}
                                    label={filter.label}
                                    size="small"
                                    color={filter.color}
                                    onDelete={() => handleRemoveFilter(filter.key)}
                                    sx={{ borderRadius: 1.5, fontWeight: 500 }}
                                />
                            ))}
                        </Box>
                    )}

                    <Popover
                        id={mainPopoverId}
                        open={isMainPopoverOpen}
                        anchorEl={mainPopoverAnchor}
                        onClose={handleCloseMainPopover}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            sx: {
                                mt: 1.5,
                                p: 3,
                                width: 520,
                                borderRadius: 4,
                                boxShadow: theme.palette.mode === 'dark' ? '0 16px 48px rgba(0,0,0,0.7)' : '0 16px 48px rgba(0,0,0,0.15)',
                                border: `1px solid ${theme.palette.divider}`,
                                overflow: 'visible',
                                '&:before': {
                                    content: '""',
                                    position: 'absolute', top: 0, right: 24,
                                    width: 12, height: 12, bgcolor: 'background.paper',
                                    transform: 'translateY(-50%) rotate(45deg)',
                                    borderTop: `1px solid ${theme.palette.divider}`,
                                    borderLeft: `1px solid ${theme.palette.divider}`,
                                }
                            }
                        }}
                    >
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="primary" sx={{ lineHeight: 1 }}>
                                    Lọc nâng cao
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Tìm kiếm nhân sự chính xác theo vị trí và cấp bậc
                                </Typography>
                            </Box>
                            <Chip
                                label={`Đã chọn ${activeFilterCount}`}
                                size="small" color="primary" variant="filled"
                                sx={{ fontWeight: 700, visibility: activeFilterCount > 0 ? 'visible' : 'hidden', borderRadius: 1.5 }}
                            />
                        </Box>

                        {activeFilters.length > 0 && (
                            <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                                {activeFilters.map((f) => (
                                    <Chip
                                        key={f.key} label={f.label} size="small"
                                        onDelete={() => { handleRemoveFilter(f.key); if (activeFilters.length === 1) handleCloseMainPopover(); }}
                                        sx={{ borderRadius: 1, height: 22, fontSize: '0.7rem' }}
                                    />
                                ))}
                            </Box>
                        )}

                        <Grid container spacing={2.5}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                    ĐƠN VỊ CÔNG TÁC
                                </Typography>
                                <Button
                                    fullWidth variant="outlined" size="small"
                                    startIcon={<Business fontSize="small" />}
                                    onClick={(e) => handleOpenOfficeDialog(e, 'idDonVi')}
                                    color={filters.idDonVi ? "primary" : "inherit"}
                                    sx={{ justifyContent: 'flex-start', borderRadius: 2, textTransform: 'none', py: 1, borderColor: filters.idDonVi ? undefined : 'divider' }}
                                >
                                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {officeNames.idDonVi || "Chọn đơn vị..."}
                                    </Box>
                                </Button>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                    PHẠM VI QUẢN TRỊ
                                </Typography>
                                <Button
                                    fullWidth variant="outlined" size="small"
                                    startIcon={<AccountTree fontSize="small" />}
                                    onClick={(e) => handleOpenOfficeDialog(e, 'idQuanTriDonVi')}
                                    color={filters.idQuanTriDonVi ? "primary" : "inherit"}
                                    sx={{ justifyContent: 'flex-start', borderRadius: 2, textTransform: 'none', py: 1, borderColor: filters.idQuanTriDonVi ? undefined : 'divider' }}
                                >
                                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {officeNames.idQuanTriDonVi || "Chọn đơn vị..."}
                                    </Box>
                                </Button>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                    CẤP BẬC
                                </Typography>
                                <TextField
                                    select fullWidth size="small"
                                    value={filters.idCapBac}
                                    onChange={(e) => handleFilterChange('idCapBac', e.target.value)}
                                    InputProps={{
                                        sx: { borderRadius: 2 },
                                        startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action" /></InputAdornment>
                                    }}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="">Tất cả cấp bậc</option>
                                    {capBacList.map((item) => (
                                        <option key={item.id} value={item.id}>{item.ten || item.id}</option>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                    CHỨC VỤ
                                </Typography>
                                <TextField
                                    fullWidth size="small"
                                    placeholder="Nhập chức vụ..."
                                    value={filters.chucVu}
                                    onChange={(e) => handleFilterChange('chucVu', e.target.value)}
                                    InputProps={{
                                        sx: { borderRadius: 2 },
                                        startAdornment: <InputAdornment position="start"><Work fontSize="small" color="action" /></InputAdornment>
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined" color="inherit" onClick={handleClearAll}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3 }}
                            >
                                Thiết lập lại
                            </Button>
                            <Button
                                variant="contained" color="primary" onClick={() => { handleSearch(); handleCloseMainPopover(); }}
                                sx={{ borderRadius: 2, px: 5, textTransform: 'none', fontWeight: 700 }}
                            >
                                Áp dụng
                            </Button>
                        </Box>
                    </Popover>
                </CardContent>
            </Card>

            <OfficeDictionaryDialog
                open={openOfficePopup}
                onClose={() => { setOpenOfficePopup(false); setCurrentOfficeField(null); }}
                onSelect={handleSelectOffice}
                selectedId={currentOfficeField === 'idDonVi' ? filters.idDonVi : filters.idQuanTriDonVi}
                title={currentOfficeField === 'idDonVi' ? 'Chọn đơn vị công tác' : 'Chọn đơn vị quản trị'}
                offices={officeList}
            />
        </>
    );
};

export default FilterEmployee;
