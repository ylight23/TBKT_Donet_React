import React, { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Tooltip,
    tooltipClasses,
    type TooltipProps,
    Divider,
} from '@mui/material';
import CommonDialog from '../Dialog/CommonDialog';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Grid from '@mui/material/Grid';
import { styled, keyframes, useTheme } from '@mui/material/styles';
import { ResponsivePie } from '@nivo/pie';
import useTrangBiGridData, { type TrangBiGridItem } from '../../hooks/useTrangBiGridData';
import { getStatsByActiveMenu, isTrangBiStatsMenu, type CategoryStats } from '../../utils/statsCalculator';

const PIE_COLORS_LIGHT = ['#22C55E', '#38BDF8', '#F59E0B', '#FB7185', '#A78BFA', '#2DD4BF', '#F97316', '#84CC16'];
const PIE_COLORS_DARK = ['#86EFAC', '#7DD3FC', '#FDE68A', '#FDA4AF', '#C4B5FD', '#5EEAD4', '#FDBA74', '#BEF264'];

const useBrightPieColors = () => {
    const theme = useTheme();
    return theme.palette.mode === 'dark' ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;
};

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const StatsTooltipView = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: theme.palette.mode === 'dark' ? '#1B2A1C' : '#FFFFFF',
        color: theme.palette.text.primary,
        maxWidth: 280,
        fontSize: '0.85rem',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.3)' : '#C8E6C9'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        padding: '12px',
        borderRadius: 2.5,
        animation: `${fadeIn} 0.2s ease-out forwards`,
    },
    [`& .${tooltipClasses.arrow}`]: {
        color: theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.3)' : '#C8E6C9',
    },
}));

const SimpleStatsView: React.FC<{ stats: CategoryStats }> = ({ stats }) => {
    const colors = useBrightPieColors();
    const pieData = stats.stats.map((s, index) => ({ id: s.label, label: s.label, value: s.count, color: colors[index % colors.length] }));

    return (
        <Box sx={{ minWidth: 200, p: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 1.5, borderBottom: '1px solid rgba(0,0,0,0.05)', pb: 0.5 }}>
                {stats.title.toUpperCase()}
            </Typography>

            <Box sx={{ height: 160, mb: 1.5 }}>
                <ResponsivePie
                    data={pieData}
                    innerRadius={0.7}
                    padAngle={2}
                    cornerRadius={3}
                    colors={{ datum: 'data.color' }}
                    enableArcLinkLabels={false}
                    arcLabelsTextColor="#ffffff"
                    arcLabelsSkipAngle={15}
                    theme={{ labels: { text: { fontSize: 11, fontWeight: 900 } } }}
                />
            </Box>

            <Box display="flex" flexDirection="column" gap={0.75}>
                {stats.stats.map((s, index) => (
                    <Box key={s.label} display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: 2.5, bgcolor: colors[index % colors.length] }} />
                            <Typography variant="caption" fontWeight={600} sx={{ opacity: 0.85 }}>{s.label}</Typography>
                        </Box>
                        <Typography variant="caption" fontWeight={800} color="primary">{s.count}</Typography>
                    </Box>
                ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic', opacity: 0.7, textAlign: 'center' }}>
                *Click de xem phan tich chi tiet
            </Typography>
        </Box>
    );
};

const RichStatsView: React.FC<{ stats: CategoryStats }> = ({ stats }) => {
    const totalCount = stats.stats.reduce((acc, curr) => acc + curr.count, 0);
    const colors = useBrightPieColors();
    const pieData = stats.stats.map((s, index) => ({ ...s, id: s.label, value: s.count, color: colors[index % colors.length] }));

    return (
        <Grid container spacing={4} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ height: 320 }}>
                    <ResponsivePie
                        data={pieData}
                        innerRadius={0.6}
                        padAngle={1}
                        cornerRadius={3}
                        colors={{ datum: 'data.color' }}
                        enableArcLinkLabels={false}
                        arcLabel={(d) => `${d.value}`}
                        arcLabelsTextColor="#fff"
                        arcLabelsSkipAngle={10}
                        theme={{ labels: { text: { fontSize: 13, fontWeight: 700 } } }}
                    />
                </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
                <Box display="flex" flexDirection="column" gap={2.5}>
                    <Typography variant="h6" fontWeight={800} sx={{ opacity: 0.9, letterSpacing: '0.02em' }}>
                        PHAN TICH CHI TIET
                    </Typography>
                    <Divider />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {stats.stats.map((s, i) => {
                            const percent = totalCount > 0 ? (s.count / totalCount) * 100 : 0;
                            return (
                                <Box key={s.label} sx={{ animation: `${fadeIn} 0.4s ease-out forwards`, animationDelay: `${i * 0.1}s` }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={1}>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Box sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 2.5,
                                                bgcolor: `${s.color}15`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: s.color,
                                                border: `1px solid ${s.color}33`,
                                            }}>
                                                <AssessmentIcon fontSize="small" />
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" fontWeight={800} sx={{ opacity: 0.8 }}>{s.label}</Typography>
                                                <Typography variant="caption" color="text.secondary">{s.count} ban ghi</Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" fontWeight={900} color={s.color}>{percent.toFixed(1)}%</Typography>
                                    </Box>
                                    <Box sx={{ width: '100%', height: 8, borderRadius: 2.5, bgcolor: `${s.color}10`, overflow: 'hidden' }}>
                                        <Box sx={{
                                            width: `${percent}%`,
                                            height: '100%',
                                            bgcolor: s.color,
                                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                        }} />
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    <Box sx={{
                        mt: 4,
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: 'rgba(46,125,50,0.04)',
                        border: '1px dashed rgba(46,125,50,0.2)',
                        animation: `${fadeIn} 0.6s ease-out forwards`,
                    }}>
                        <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssessmentIcon fontSize="small" /> NHAN XET CUA HE THONG
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                            Du lieu cho thay chi so cua <strong>{stats.title}</strong> dang duoc tong hop tu nguon API hien tai.
                            Ty le {stats.stats[0]?.label} dang chiem uu the ({totalCount > 0 ? ((stats.stats[0]?.count / totalCount) * 100).toFixed(1) : '0.0'}%).
                        </Typography>
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};

interface StatsButtonProps {
    activeMenu: string;
    trangBiData?: TrangBiGridItem[];
}

const StatsButton: React.FC<StatsButtonProps> = ({ activeMenu, trangBiData }) => {
    const shouldLoadTrangBiStats = isTrangBiStatsMenu(activeMenu) && !trangBiData;
    const { data: loadedTrangBiData } = useTrangBiGridData(shouldLoadTrangBiStats);
    const effectiveTrangBiData = trangBiData ?? loadedTrangBiData;
    const stats = useMemo(
        () => getStatsByActiveMenu(activeMenu, effectiveTrangBiData),
        [activeMenu, effectiveTrangBiData],
    );
    const [openDialog, setOpenDialog] = useState(false);

    if (!stats) return null;

    return (
        <>
            <StatsTooltipView title={<SimpleStatsView stats={stats} />} placement="bottom-end" arrow enterDelay={300}>
                <Button
                    variant="outlined"
                    startIcon={<BarChartIcon />}
                    onClick={() => setOpenDialog(true)}
                    sx={{
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        px: 2,
                        '&:hover': {
                            bgcolor: 'primary.main',
                            color: '#fff',
                            boxShadow: '0 6px 16px rgba(46,125,50,0.25)',
                        },
                        transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                    }}
                >
                    Thong ke nhanh
                </Button>
            </StatsTooltipView>

            <CommonDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="md"
                mode="info"
                title={stats.title.toUpperCase()}
                subtitle="BAO CAO PHAN TICH HE THONG - CHI TIET CHI SO"
                icon={<BarChartIcon />}
                confirmText="Dong bao cao"
                onConfirm={() => setOpenDialog(false)}
                showCancel={false}
            >
                <RichStatsView stats={stats} />
            </CommonDialog>
        </>
    );
};

export default StatsButton;
