import React, { useMemo } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/GridLegacy';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LayersIcon from '@mui/icons-material/Layers';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';

import OfficeDictionary from './subComponent/OfficeDictionary';
import OfficeDataGrid from './subComponent/OfficeDataGrid';
import ModalOffice from './subComponent/ModalOffice';
import ExportExcel from '../../components/Buttons/ExportExcel';
import ImportExcel from '../../components/Buttons/ImportExcel';
import { OfficeProvider, useOffice } from '../../context/OfficeContext';
import { TreeSkeleton, GridSkeleton } from '../../components/Skeletons';

// ── Inner component ────────────────────────────────────────────────────────────
const OfficeInner: React.FC = () => {
    const theme = useTheme();
    const { state, actions, meta } = useOffice();
    const { allOffices, isTreeEmpty, loading } = state;
    const { importOffices, onImportSuccess } = actions;
    const { treeRef, officeColumnMapping } = meta;

    const [search, setSearch] = React.useState('');
    const [filterCap, setFilterCap] = React.useState('');
    const [filterTT, setFilterTT] = React.useState('active');
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

    const activeFilters = useMemo(() => {
        const chips = [];
        if (filterCap) {
            const label = filterCap === '1' ? 'Cấp Tổng cục' : filterCap === '2' ? 'Cấp Quân khu/Quân đoàn' : 'Cấp Sư đoàn/Lữ đoàn';
            chips.push({ key: 'cap', label: `Cấp: ${label}`, icon: <LayersIcon fontSize="small" /> });
        }
        if (filterTT) {
            chips.push({ key: 'tt', label: `Trạng thái: ${filterTT === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}`, icon: <ToggleOnIcon fontSize="small" /> });
        }
        return chips;
    }, [filterCap, filterTT]);

    const handleRemoveFilter = (key: string) => {
        if (key === 'cap') setFilterCap('');
        if (key === 'tt') setFilterTT('');
    };

    const handleClear = () => {
        setSearch('');
        setFilterCap('');
        setFilterTT('');
    };

    const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
    const handleClosePopover = () => setAnchorEl(null);
    const isPopoverOpen = Boolean(anchorEl);
    const popoverId = isPopoverOpen ? 'office-filter-popover' : undefined;

    const isInitialLoading = loading;

    return (
        <Box sx={{ p: 3 }}>
            {/* 1. Header + Toolbar */}
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                        QUẢN LÝ ĐƠN VỊ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Hệ thống phân cấp tổ chức và danh sách đơn vị toàn quân
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <ExportExcel
                        buttonText="Tải danh sách"
                        data={allOffices}
                        columnMapping={officeColumnMapping}
                        fileName="DanhSachDonVi"
                        sheetName="Danh sách đơn vị"
                    />
                    <ImportExcel
                        buttonText="Nhập từ Excel"
                        onImport={importOffices}
                        onImportSuccess={onImportSuccess}
                    />
                    {isTreeEmpty && <ModalOffice createLabel="Tạo mới" />}
                </Stack>
            </Box>

            {/* 2. Filter Panel */}
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
                            fullWidth size="small"
                            placeholder="Tìm kiếm mã unit, tên đơn vị, viết tắt…"
                            autoComplete="off"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment>,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            {search && (
                                                <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                                            )}
                                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
                                            <Tooltip title="Bộ lọc nâng cao">
                                                <Button
                                                    size="small" onClick={handleOpenPopover}
                                                    variant="text"
                                                    color={activeFilters.length > 0 ? "primary" : "inherit"}
                                                    startIcon={<FilterAltIcon fontSize="small" />}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        borderRadius: 2,
                                                        px: 1.5,
                                                        minWidth: 'auto',
                                                        position: 'relative',
                                                        bgcolor: activeFilters.length > 0 ? `${theme.palette.primary.main}15` : 'transparent',
                                                        '&:hover': {
                                                            bgcolor: activeFilters.length > 0 ? `${theme.palette.primary.main}25` : 'action.hover',
                                                        }
                                                    }}
                                                >
                                                    Bộ lọc
                                                    {activeFilters.length > 0 && (
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
                                ),
                                sx: { borderRadius: 3 }
                            }}
                            sx={{
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                                    '& fieldset': { borderColor: 'transparent' },
                                    transition: 'all 0.2s',
                                }
                            }}
                        />
                    </Box>

                    {activeFilters.length > 0 && (
                        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {activeFilters.map((f) => (
                                <Chip
                                    key={f.key}
                                    icon={React.cloneElement(f.icon as React.ReactElement<any>, { sx: { fontSize: '14px !important' } })}
                                    label={f.label}
                                    size="small"
                                    variant="outlined"
                                    onDelete={() => handleRemoveFilter(f.key)}
                                    sx={{ borderRadius: 1.5, fontWeight: 600, height: 24, fontSize: '0.75rem' }}
                                />
                            ))}
                            <Button
                                variant="text" size="small" onClick={handleClear}
                                sx={{ ml: 0.5, textTransform: 'none', fontWeight: 700, p: 0, height: 24, minWidth: 'auto', fontSize: '0.75rem' }}
                            >
                                Xóa tất cả
                            </Button>
                        </Box>
                    )}

                    <Popover
                        id={popoverId} open={isPopoverOpen} anchorEl={anchorEl} onClose={handleClosePopover}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            sx: {
                                mt: 1.5, p: 3, width: 500, borderRadius: 4,
                                boxShadow: theme.palette.mode === 'dark' ? '0 16px 48px rgba(0,0,0,0.7)' : '0 16px 48px rgba(0,0,0,0.15)',
                                border: `1px solid ${theme.palette.divider}`,
                                overflow: 'visible',
                                '&:before': {
                                    content: '""', position: 'absolute', top: 0, right: 24,
                                    width: 12, height: 12, bgcolor: 'background.paper',
                                    transform: 'translateY(-50%) rotate(45deg)',
                                    borderTop: `1px solid ${theme.palette.divider}`,
                                    borderLeft: `1px solid ${theme.palette.divider}`,
                                }
                            }
                        }}
                    >
                        <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" fontWeight={800} color="primary">Lọc nâng cao</Typography>
                            <Chip label={`Đã chọn ${activeFilters.length}`} size="small" color="primary" sx={{ fontWeight: 700, visibility: activeFilters.length > 0 ? 'visible' : 'hidden' }} />
                        </Box>

                        {activeFilters.length > 0 && (
                            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                                {activeFilters.map((f) => (
                                    <Chip
                                        key={f.key} label={f.label} size="small"
                                        onDelete={() => handleRemoveFilter(f.key)}
                                        sx={{ borderRadius: 1, height: 22, fontSize: '0.7rem' }}
                                    />
                                ))}
                            </Box>
                        )}

                        <Grid container spacing={2.5}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                    CẤP ĐƠN VỊ
                                </Typography>
                                <TextField select fullWidth size="small" value={filterCap} onChange={e => setFilterCap(e.target.value)}>
                                    <MenuItem value=""><em>-- Tất cả các cấp --</em></MenuItem>
                                    <MenuItem value="1">Cấp Tổng cục</MenuItem>
                                    <MenuItem value="2">Cấp Quân khu/Quân đoàn</MenuItem>
                                    <MenuItem value="3">Cấp Sư đoàn/Lữ đoàn</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                    TRẠNG THÁI
                                </Typography>
                                <TextField select fullWidth size="small" value={filterTT} onChange={e => setFilterTT(e.target.value)}>
                                    <MenuItem value="active">Đang hoạt động</MenuItem>
                                    <MenuItem value="inactive">Ngừng hoạt động</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                            <Button variant="outlined" color="inherit" onClick={handleClear} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 3 }}>
                                Thiết lập lại
                            </Button>
                            <Button variant="contained" color="primary" onClick={handleClosePopover} sx={{ borderRadius: 1.5, px: 5, textTransform: 'none', fontWeight: 700 }}>
                                Áp dụng
                            </Button>
                        </Box>
                    </Popover>
                </CardContent>
            </Card>

            {/* 3. Warning banner */}
            {isTreeEmpty && (
                <Box sx={{ mb: 2, p: 2, backgroundColor: theme.palette.warning.light + '15', borderRadius: 4, border: `1px solid ${theme.palette.warning.light}33`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HelpOutlineIcon color="warning" />
                    <Typography variant="body2" sx={{ color: theme.palette.warning.dark, fontWeight: 700 }}>
                        Nhấn "Tạo mới" để khởi tạo đơn vị đầu tiên trong hệ thống.
                    </Typography>
                </Box>
            )}

            {/* 4. Tree + Grid: skeleton → real content */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 2, height: 'calc(100vh - 220px)' }}>

                {/* Tree: skeleton khi chưa có data */}
                <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                    {isInitialLoading
                        ? <TreeSkeleton rows={10} />
                        : <OfficeDictionary ref={treeRef} />
                    }
                </Box>

                {/* Grid: skeleton khi chưa có data */}
                <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                    {isInitialLoading
                        ? <GridSkeleton rows={15} cols={6} />
                        : !isTreeEmpty && <OfficeDataGrid />
                    }
                </Box>

            </Box>
        </Box>
    );
};

// ── Page ───────────────────────────────────────────────────────────────────────
const Office: React.FC = () => (
    <OfficeProvider>
        <OfficeInner />
    </OfficeProvider>
);

export default Office;
