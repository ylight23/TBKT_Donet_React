import React, { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import CommonFilter from '../../components/Filter/CommonFilter';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/GridLegacy';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import StatsButton from '../../components/Stats/StatsButton';
import { TrangThaiTrangBi } from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import useTrangBiGridData, { type TrangBiGridItem } from '../../hooks/useTrangBiGridData';

const BaoQuan: React.FC = () => {
    const { data: allTrangBi, loading, errorMessage } = useTrangBiGridData();
    const [search, setSearch] = useState('');
    const [filterTT, setFilterTT] = useState('');

    const baoQuanRows = useMemo(
        () => allTrangBi.filter((t) =>
            t.trangThai === TrangThaiTrangBi.HoatDong ||
            t.trangThai === TrangThaiTrangBi.NiemCat,
        ),
        [allTrangBi],
    );

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return baoQuanRows.filter((r) => {
            const matchSearch = !q || [r.maDanhMuc, r.tenDanhMuc, r.donVi, r.donViQuanLy, r.soHieu]
                .some((v) => (v || '').toLowerCase().includes(q));
            const matchTT = !filterTT || r.trangThai === filterTT;
            return matchSearch && matchTT;
        });
    }, [baoQuanRows, filterTT, search]);

    const activeFilters = useMemo(() => {
        const chips: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
        if (filterTT) {
            chips.push({
                key: 'tt',
                label: `Trang thai: ${filterTT}`,
                icon: <CheckCircleIcon fontSize="small" />,
            });
        }
        return chips;
    }, [filterTT]);

    const columns: GridColDef[] = [
        { field: 'maDanhMuc', headerName: 'Ma trang bi', width: 140 },
        { field: 'tenDanhMuc', headerName: 'Ten trang bi', minWidth: 220, flex: 1 },
        { field: 'soHieu', headerName: 'So hieu', width: 140 },
        { field: 'donVi', headerName: 'Don vi', minWidth: 180, flex: 1 },
        { field: 'donViQuanLy', headerName: 'Don vi quan ly', width: 180 },
        { field: 'tenDanhMuc', headerName: 'Danh muc', width: 180 },
        {
            field: 'trangThai',
            headerName: 'Trang thai',
            width: 140,
            renderCell: (p: GridRenderCellParams<TrangBiGridItem, string>) => {
                const color =
                    p.value === TrangThaiTrangBi.HoatDong ? 'success' :
                        p.value === TrangThaiTrangBi.NiemCat ? 'info' : 'default';
                return <Chip label={p.value} color={color} size="small" sx={{ fontWeight: 600 }} />;
            },
        },
        { field: 'chatLuong', headerName: 'Chat luong', width: 140 },
        { field: 'tinhTrangKyThuat', headerName: 'Tinh trang KT', width: 170 },
        {
            field: 'actions',
            headerName: 'Thao tac',
            width: 150,
            sortable: false,
            filterable: false,
            renderCell: () => (
                <Box display="flex" gap={0.5} justifyContent="center" width="100%">
                    <Tooltip title="Xem chi tiet">
                        <IconButton size="small" sx={{ color: militaryColors.navy }}><VisibilityIcon fontSize="inherit" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Chinh sua">
                        <IconButton size="small" sx={{ color: militaryColors.warning }}><EditIcon fontSize="inherit" /></IconButton>
                    </Tooltip>
                    <Tooltip title="In chi tiet">
                        <IconButton size="small" sx={{ color: militaryColors.success }}><PrintIcon fontSize="inherit" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Xoa">
                        <IconButton size="small" sx={{ color: militaryColors.error }}><DeleteIcon fontSize="inherit" /></IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box>
                    <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                        BAO QUAN TRANG BI
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Danh sach trang bi thuoc dien bao quan lay truc tiep tu du lieu thuc
                    </Typography>
                </Box>
                <StatsButton activeMenu="baoQuan" trangBiData={allTrangBi} />
            </Stack>

            {errorMessage && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
                    {errorMessage}
                </Alert>
            )}

            <CommonFilter
                search={search}
                onSearchChange={setSearch}
                placeholder="Tim kiem ma, ten trang bi, don vi, so hieu..."
                onExport={() => alert('[Gia lap] Xuat Excel bao quan')}
                activeFilters={activeFilters}
                onRemoveFilter={(key) => {
                    if (key === 'tt') setFilterTT('');
                }}
                onClearAll={() => {
                    setSearch('');
                    setFilterTT('');
                }}
            >
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}
                        >
                            TRANG THAI BAO QUAN
                        </Typography>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            variant="outlined"
                            value={filterTT}
                            onChange={(e) => setFilterTT(e.target.value)}
                        >
                            <MenuItem value=""><em>-- Tat ca trang thai --</em></MenuItem>
                            {[TrangThaiTrangBi.HoatDong, TrangThaiTrangBi.NiemCat].map((t) => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </CommonFilter>

            <DataGrid
                rows={filtered}
                columns={columns}
                getRowId={(r) => r.id}
                loading={loading}
                sx={{
                    height: {
                        xs: 500,
                        sm: 550,
                        md: 'calc(100vh - 350px)',
                    },
                    minHeight: 450,
                    width: '100%',
                }}
            />
        </Box>
    );
};

export default BaoQuan;
