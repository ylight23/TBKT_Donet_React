import React, { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/GridLegacy';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CommonFilter from '../../components/Filter/CommonFilter';
import StatsButton from '../../components/Stats/StatsButton';
import { ChatLuong, TrangThaiTrangBi } from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import useTrangBiGridData, { type TrangBiGridItem } from '../../hooks/useTrangBiGridData';

const clColor: Record<ChatLuong, string> = {
    [ChatLuong.Tot]: '#2e7d32',
    [ChatLuong.Kha]: '#1565c0',
    [ChatLuong.TrungBinh]: '#ef6c00',
    [ChatLuong.Xau]: '#c62828',
    [ChatLuong.HỏngHoc]: '#6a1b9a',
};

interface SummaryCardProps {
    label: string;
    count: number;
    total: number;
    color: string;
    icon: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, count, total, color, icon }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 2.5,
                border: `1px solid ${color}33`,
                bgcolor: `${color}05`,
                overflow: 'hidden',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {label}
                    </Typography>
                    <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: `${color}15`, color }}>
                        {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { fontSize: 20 } })}
                    </Box>
                </Box>
                <Box display="flex" alignItems="baseline" gap={1}>
                    <Typography variant="h4" fontWeight={800} color={color}>{count}</Typography>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">/ {total}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    {pct}% tong trang bi
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                        height: 6,
                        borderRadius: 2.5,
                        bgcolor: `${color}15`,
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2.5 },
                    }}
                />
            </CardContent>
        </Card>
    );
};

const TinhTrangKyThuat: React.FC = () => {
    const { data: allTrangBi, loading, errorMessage } = useTrangBiGridData();
    const total = allTrangBi.length;
    const [search, setSearch] = useState('');
    const [filterCL, setFilterCL] = useState('');

    const activeFilters = useMemo(() => {
        const chips: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
        if (filterCL) {
            chips.push({
                key: 'cl',
                label: `Chat luong: ${filterCL}`,
                icon: <VerifiedIcon fontSize="small" />,
            });
        }
        return chips;
    }, [filterCL]);

    const count = useMemo(() => ({
        tot: allTrangBi.filter((t) => t.chatLuong === ChatLuong.Tot).length,
        kha: allTrangBi.filter((t) => t.chatLuong === ChatLuong.Kha).length,
        trungBinh: allTrangBi.filter((t) => t.chatLuong === ChatLuong.TrungBinh).length,
        xau: allTrangBi.filter((t) => t.chatLuong === ChatLuong.Xau).length,
        hong: allTrangBi.filter((t) => t.chatLuong === ChatLuong.HỏngHoc).length,
    }), [allTrangBi]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return allTrangBi.filter((row) => {
            const matchSearch = !q || [row.maTrangBi, row.tenTrangBi, row.donVi, row.soHieu, row.loai]
                .some((v) => (v || '').toLowerCase().includes(q));
            const matchCL = !filterCL || row.chatLuong === filterCL;
            return matchSearch && matchCL;
        });
    }, [allTrangBi, search, filterCL]);

    const columns: GridColDef[] = [
        {
            field: 'maTrangBi',
            headerName: 'Ma trang bi',
            width: 140,
            renderCell: (p) => (
                <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>
                    {p.value}
                </Typography>
            ),
        },
        { field: 'tenTrangBi', headerName: 'Ten trang bi', flex: 1, minWidth: 220 },
        { field: 'loai', headerName: 'Loai', width: 180 },
        { field: 'donVi', headerName: 'Don vi', flex: 1, minWidth: 160 },
        {
            field: 'chatLuong',
            headerName: 'Chat luong',
            width: 140,
            renderCell: (p: GridRenderCellParams<TrangBiGridItem, string>) => (
                <Chip
                    label={p.value}
                    size="small"
                    sx={{
                        bgcolor: `${clColor[p.value as ChatLuong] ?? '#9e9e9e'}22`,
                        color: clColor[p.value as ChatLuong] ?? '#616161',
                        fontWeight: 600,
                        fontSize: 11,
                        border: `1px solid ${clColor[p.value as ChatLuong] ?? '#9e9e9e'}55`,
                    }}
                />
            ),
        },
        {
            field: 'trangThai',
            headerName: 'Trang thai',
            width: 150,
            renderCell: (p: GridRenderCellParams<TrangBiGridItem, string>) => (
                <Chip
                    label={p.value}
                    size="small"
                    color={
                        p.value === TrangThaiTrangBi.HoatDong ? 'success' :
                            p.value === TrangThaiTrangBi.SuaChua ? 'warning' : 'default'
                    }
                />
            ),
        },
        { field: 'tinhTrangKyThuat', headerName: 'Tinh trang KT', width: 160 },
        { field: 'soHieu', headerName: 'So hieu', width: 140 },
        { field: 'namSuDung', headerName: 'Nam su dung', type: 'number', width: 120 },
        { field: 'nienHanSuDung', headerName: 'Nien han SD', type: 'number', width: 130 },
        {
            field: 'actions',
            headerName: 'Thao tac',
            width: 160,
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
                        TINH TRANG KY THUAT
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Tong hop chat luong trang bi tu nguon read-model nhom 1 va nhom 2
                    </Typography>
                </Box>
                <StatsButton activeMenu="tinhTrangKT" trangBiData={allTrangBi} />
            </Stack>

            {errorMessage && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
                    {errorMessage}
                </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                    <SummaryCard label="Tot" count={count.tot} total={total} color={clColor[ChatLuong.Tot]} icon={<VerifiedIcon />} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <SummaryCard label="Kha" count={count.kha} total={total} color={clColor[ChatLuong.Kha]} icon={<VerifiedIcon />} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <SummaryCard label="Trung binh" count={count.trungBinh} total={total} color={clColor[ChatLuong.TrungBinh]} icon={<WarningAmberIcon />} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <SummaryCard label="Xau/Hong hoc" count={count.xau + count.hong} total={total} color={clColor[ChatLuong.Xau]} icon={<ErrorOutlineIcon />} />
                </Grid>
            </Grid>

            <CommonFilter
                search={search}
                onSearchChange={setSearch}
                placeholder="Tim kiem ma, ten trang bi, don vi, so hieu..."
                onExport={() => alert('[Gia lap] Xuat Excel tinh trang ky thuat')}
                activeFilters={activeFilters}
                onRemoveFilter={(key) => {
                    if (key === 'cl') setFilterCL('');
                }}
                onClearAll={() => {
                    setSearch('');
                    setFilterCL('');
                }}
                popoverTitle="Loc ky thuat"
                popoverWidth={400}
            >
                <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                        <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}
                        >
                            PHAN CAP CHAT LUONG
                        </Typography>
                        <TextField select fullWidth size="small" value={filterCL} onChange={(e) => setFilterCL(e.target.value)}>
                            <MenuItem value=""><em>-- Tat ca chat luong --</em></MenuItem>
                            {Object.values(ChatLuong).map((cl) => (
                                <MenuItem key={cl} value={cl}>{cl}</MenuItem>
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

export default TinhTrangKyThuat;
