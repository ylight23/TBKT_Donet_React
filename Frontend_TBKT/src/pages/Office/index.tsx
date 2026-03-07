import React, { useMemo } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/GridLegacy';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LayersIcon from '@mui/icons-material/Layers';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';

import CommonFilter from '../../components/Filter/CommonFilter';
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
            <CommonFilter
                search={search}
                onSearchChange={setSearch}
                placeholder="Tìm kiếm mã unit, tên đơn vị, viết tắt…"
                activeFilters={activeFilters}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClear}
                popoverTitle="Lọc nâng cao"
                popoverDescription="Tinh chỉnh danh sách đơn vị theo cấp và trạng thái"
                popoverWidth={500}
                onApply={() => undefined}
            >
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
            </CommonFilter>

            {/* 3. Warning banner */}
            {isTreeEmpty && (
                <Box sx={{ mb: 2, p: 2, backgroundColor: theme.palette.warning.light + '15', borderRadius: 2.5, border: `1px solid ${theme.palette.warning.light}33`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HelpOutlineIcon color="warning" />
                    <Typography variant="body2" sx={{ color: theme.palette.warning.dark, fontWeight: 700 }}>
                        Nhấn "Tạo mới" để khởi tạo đơn vị đầu tiên trong hệ thống.
                    </Typography>
                </Box>
            )}

            {/* 4. Tree + Grid: skeleton → real content */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 2, height: 'calc(100vh - 220px)' }}>

                {/* Tree: skeleton khi chưa có data */}
                <Box sx={{ bgcolor: 'background.paper', borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                    {isInitialLoading
                        ? <TreeSkeleton rows={10} />
                        : <OfficeDictionary ref={treeRef} />
                    }
                </Box>

                {/* Grid: skeleton khi chưa có data */}
                <Box sx={{ bgcolor: 'background.paper', borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
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
