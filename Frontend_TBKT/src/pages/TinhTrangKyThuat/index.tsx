import React, { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/GridLegacy';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import CommonFilter from '../../components/Filter/CommonFilter';
import StatsButton from '../../components/Stats/StatsButton';
import { militaryColors } from '../../theme';
import useTrangBiGridData, { type TrangBiGridItem } from '../../hooks/useTrangBiGridData';

const QUALITY_COLORS = {
    good: '#2e7d32',
    medium: '#ef6c00',
    bad: '#c62828',
    unknown: '#616161',
};

const normalizeText = (value?: string): string => (
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
);

const includesAny = (value: string | undefined, terms: string[]): boolean => {
    const normalized = normalizeText(value);
    return terms.some((term) => normalized.includes(term));
};

const isGoodQuality = (value?: string): boolean => includesAny(value, ['tot', 'kha']);
const isMediumQuality = (value?: string): boolean => includesAny(value, ['trung binh']);
const isBadQuality = (value?: string): boolean => includesAny(value, ['xau', 'hong']);
const isOperating = (value?: string): boolean => includesAny(value, ['hoat dong']);
const isRepairing = (value?: string): boolean => includesAny(value, ['sua chua']);

const getQualityColor = (value?: string): string => {
    if (isGoodQuality(value)) return QUALITY_COLORS.good;
    if (isMediumQuality(value)) return QUALITY_COLORS.medium;
    if (isBadQuality(value)) return QUALITY_COLORS.bad;
    return QUALITY_COLORS.unknown;
};

interface SummaryCardProps {
    title: string;
    items: Array<{ label: string; count: number; color: string }>;
    total: number;
    accentColor: string;
    icon: React.ReactNode;
}

const buildStatItems = (
    rows: TrangBiGridItem[],
    selector: (row: TrangBiGridItem) => string | undefined,
    colorResolver: (value: string) => string,
) => {
    const counter = new Map<string, number>();
    rows.forEach((row) => {
        const label = (selector(row) || 'Chua co').trim() || 'Chua co';
        counter.set(label, (counter.get(label) || 0) + 1);
    });

    return Array.from(counter.entries())
        .map(([label, count]) => ({ label, count, color: colorResolver(label) }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'));
};

const getUsageColor = (value: string): string => {
    if (isOperating(value)) return '#2e7d32';
    if (isRepairing(value)) return '#ef6c00';
    if (includesAny(value, ['niem cat', 'bao quan'])) return '#1565c0';
    if (includesAny(value, ['thanh ly'])) return '#c62828';
    return QUALITY_COLORS.unknown;
};

const getTechnicalColor = (value: string): string => {
    if (isGoodQuality(value) || includesAny(value, ['dong bo', 'hoat dong tot'])) return '#2e7d32';
    if (isMediumQuality(value) || includesAny(value, ['can theo doi'])) return '#ef6c00';
    if (isBadQuality(value) || includesAny(value, ['khong dong bo'])) return '#c62828';
    return QUALITY_COLORS.unknown;
};

const SummaryStatGroup: React.FC<SummaryCardProps> = ({ title, items, total, accentColor, icon }) => {
    return (
        <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${accentColor}33`, bgcolor: `${accentColor}05`, overflow: 'hidden', height: '100%' }}>
            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </Typography>
                    <Box sx={{ p: 0.6, borderRadius: 1.5, bgcolor: `${accentColor}15`, color: accentColor, display: 'flex' }}>
                        {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { fontSize: 16 } })}
                    </Box>
                </Box>
                <Stack spacing={0.65}>
                    {items.length > 0 ? items.slice(0, 4).map((item) => {
                        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        return (
                            <Box key={item.label}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                                    <Typography variant="caption" fontWeight={700} noWrap title={item.label}>
                                        {item.label}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={800} sx={{ color: item.color, flexShrink: 0 }}>
                                        {item.count} ({pct}%)
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    sx={{
                                        mt: 0.25,
                                        height: 3,
                                        borderRadius: 2,
                                        bgcolor: `${item.color}14`,
                                        '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 2 },
                                    }}
                                />
                            </Box>
                        );
                    }) : (
                        <Typography variant="caption" color="text.secondary">Chua co du lieu</Typography>
                    )}
                </Stack>
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
            chips.push({ key: 'cl', label: `Chat luong: ${filterCL}`, icon: <VerifiedIcon fontSize="small" /> });
        }
        return chips;
    }, [filterCL]);

    const qualityStats = useMemo(() => (
        buildStatItems(allTrangBi, (row) => row.chatLuong, getQualityColor)
    ), [allTrangBi]);

    const usageStats = useMemo(() => (
        buildStatItems(allTrangBi, (row) => row.trangThai, getUsageColor)
    ), [allTrangBi]);

    const technicalStats = useMemo(() => (
        buildStatItems(allTrangBi, (row) => row.tinhTrangKyThuat, getTechnicalColor)
    ), [allTrangBi]);

    const qualityOptions = useMemo(() => (
        Array.from(new Set(allTrangBi.map((row) => row.chatLuong).filter(Boolean))).sort()
    ), [allTrangBi]);

    const filtered = useMemo(() => {
        const q = normalizeText(search);
        return allTrangBi.filter((row) => {
            const matchSearch = !q || [
                row.maDanhMuc,
                row.tenDanhMuc,
                row.donVi,
                row.donViQuanLy,
                row.soHieu,
                row.loai,
                row.tinhTrangKyThuat,
            ].some((v) => normalizeText(v).includes(q));
            const matchCL = !filterCL || row.chatLuong === filterCL;
            return matchSearch && matchCL;
        });
    }, [allTrangBi, search, filterCL]);

    const columns: GridColDef<TrangBiGridItem>[] = [
        {
            field: 'nhomTrangBi',
            headerName: 'Nhom',
            width: 90,
            renderCell: (p: GridRenderCellParams<TrangBiGridItem, 1 | 2>) => <Chip label={`Nhom ${p.value}`} size="small" />,
        },
        {
            field: 'maDanhMuc',
            headerName: 'Ma trang bi',
            width: 160,
            renderCell: (p) => (
                <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>
                    {p.value}
                </Typography>
            ),
        },
        { field: 'tenDanhMuc', headerName: 'Ten trang bi', flex: 1, minWidth: 220 },
        { field: 'idCapTren', headerName: 'Phan nganh', width: 170 },
        { field: 'donViQuanLy', headerName: 'Don vi quan ly', flex: 1, minWidth: 170 },
        {
            field: 'chatLuong',
            headerName: 'Chat luong',
            width: 140,
            renderCell: (p: GridRenderCellParams<TrangBiGridItem, string>) => (
                <Chip
                    label={p.value || 'Chua co'}
                    size="small"
                    sx={{
                        bgcolor: `${getQualityColor(p.value)}22`,
                        color: getQualityColor(p.value),
                        fontWeight: 600,
                        fontSize: 11,
                        border: `1px solid ${getQualityColor(p.value)}55`,
                    }}
                />
            ),
        },
        {
            field: 'trangThai',
            headerName: 'Trang thai SD',
            width: 150,
            renderCell: (p: GridRenderCellParams<TrangBiGridItem, string>) => (
                <Chip
                    label={p.value || 'Chua co'}
                    size="small"
                    color={isOperating(p.value) ? 'success' : isRepairing(p.value) ? 'warning' : 'default'}
                />
            ),
        },
        { field: 'tinhTrangKyThuat', headerName: 'Tinh trang KT', width: 170 },
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
                    <Tooltip title="Xem chi tiet"><IconButton size="small" sx={{ color: militaryColors.navy }}><VisibilityIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Chinh sua"><IconButton size="small" sx={{ color: militaryColors.warning }}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="In chi tiet"><IconButton size="small" sx={{ color: militaryColors.success }}><PrintIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Xoa"><IconButton size="small" sx={{ color: militaryColors.error }}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ p: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} gap={1}>
                <Box>
                    <Typography variant="h5" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.25 }}>
                        TINH TRANG KY THUAT
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Tong hop trang bi tu read-model nhom 1 va nhom 2
                    </Typography>
                </Box>
                <StatsButton activeMenu="tinhTrangKT" trangBiData={allTrangBi} />
            </Stack>

            {errorMessage && <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>{errorMessage}</Alert>}

            <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid item xs={12} md={4}>
                    <SummaryStatGroup
                        title="Cap chat luong"
                        items={qualityStats}
                        total={total}
                        accentColor={QUALITY_COLORS.good}
                        icon={<VerifiedIcon />}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SummaryStatGroup
                        title="Tinh trang su dung"
                        items={usageStats}
                        total={total}
                        accentColor="#1565c0"
                        icon={<WarningAmberIcon />}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SummaryStatGroup
                        title="Tinh trang ky thuat"
                        items={technicalStats}
                        total={total}
                        accentColor={QUALITY_COLORS.medium}
                        icon={<ErrorOutlineIcon />}
                    />
                </Grid>
            </Grid>

            <CommonFilter
                search={search}
                onSearchChange={setSearch}
                placeholder="Tim kiem ma, ten trang bi, don vi, so hieu..."
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
                <Grid container spacing={1.5}>
                    <Grid item xs={12}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            Phan cap chat luong
                        </Typography>
                        <TextField select fullWidth size="small" value={filterCL} onChange={(e) => setFilterCL(e.target.value)}>
                            <MenuItem value=""><em>-- Tat ca chat luong --</em></MenuItem>
                            {qualityOptions.map((cl) => <MenuItem key={cl} value={cl}>{cl}</MenuItem>)}
                        </TextField>
                    </Grid>
                </Grid>
            </CommonFilter>

            <DataGrid
                rows={filtered}
                columns={columns}
                getRowId={(r) => r.id}
                loading={loading}
                rowHeight={42}
                columnHeaderHeight={42}
                density="compact"
                sx={{
                    height: { xs: 480, sm: 520, md: 'calc(100vh - 325px)' },
                    minHeight: 380,
                    width: '100%',
                    '& .MuiDataGrid-cell': { py: 0.25 },
                    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 800, fontSize: 12 },
                }}
            />
        </Box>
    );
};

export default TinhTrangKyThuat;
