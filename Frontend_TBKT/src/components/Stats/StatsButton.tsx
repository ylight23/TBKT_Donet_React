import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip, { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import BarChartIcon from '@mui/icons-material/BarChart';
import Grid from '@mui/material/GridLegacy';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { styled, keyframes, useTheme } from '@mui/material/styles';
import { getStatsByActiveMenu, CategoryStats } from '../../utils/statsCalculator';
import { ResponsivePie } from '@nivo/pie';

// ── Pure CSS Animations ──────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

// ── Custom Styled Tooltip for Hover ──────────────────────────
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
        borderRadius: '12px',
        animation: `${fadeIn} 0.2s ease-out forwards`
    },
    [`& .${tooltipClasses.arrow}`]: {
        color: theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.3)' : '#C8E6C9',
    },
}));

const SimpleStatsView: React.FC<{ stats: CategoryStats }> = ({ stats }) => (
    <Box sx={{ minWidth: 200, p: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 1.5, borderBottom: '1px solid rgba(0,0,0,0.05)', pb: 0.5 }}>
            {stats.title.toUpperCase()}
        </Typography>

        <Box sx={{ height: 160, mb: 1.5 }}>
            <ResponsivePie
                data={stats.stats.map(s => ({ id: s.label, label: s.label, value: s.count, color: s.color }))}
                innerRadius={0.7}
                padAngle={2}
                cornerRadius={3}
                colors={{ datum: 'data.color' }}
                enableArcLinkLabels={false}
                arcLabelsTextColor="#ffffff"
                arcLabelsSkipAngle={15}
                theme={{
                    labels: { text: { fontSize: 11, fontWeight: 900 } }
                }}
            />
        </Box>

        <Box display="flex" flexDirection="column" gap={0.75}>
            {stats.stats.map((s, i) => (
                <Box key={i} display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                        <Typography variant="caption" fontWeight={600} sx={{ opacity: 0.85 }}>{s.label}</Typography>
                    </Box>
                    <Typography variant="caption" fontWeight={800} color="primary">{s.count}</Typography>
                </Box>
            ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic', opacity: 0.7, textAlign: 'center' }}>
            *Click để xem phân tích chi tiết
        </Typography>
    </Box>
);

const RichStatsView: React.FC<{ stats: CategoryStats }> = ({ stats }) => {
    const totalCount = stats.stats.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <Grid container spacing={4} sx={{ mt: 0 }}>
            {/* Left: Nivo Pie Chart */}
            <Grid item xs={12} md={5}>
                <Box sx={{ height: 320 }}>
                    <ResponsivePie
                        data={stats.stats.map(s => ({ ...s, id: s.label, value: s.count }))}
                        innerRadius={0.6}
                        padAngle={1}
                        cornerRadius={3}
                        colors={{ datum: 'data.color' }}
                        enableArcLinkLabels={false}
                        arcLabel={d => `${d.value}`}
                        arcLabelsTextColor="#fff"
                        arcLabelsSkipAngle={10}
                        theme={{
                            labels: { text: { fontSize: 13, fontWeight: 700 } }
                        }}
                    />
                </Box>
            </Grid>

            {/* Right: Detailed List and Metrics */}
            <Grid item xs={12} md={7}>
                <Box display="flex" flexDirection="column" gap={2.5}>
                    <Typography variant="h6" fontWeight={800} sx={{ opacity: 0.9, letterSpacing: '0.02em' }}>
                        PHÂN TÍCH CHI TIẾT
                    </Typography>
                    <Divider />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {stats.stats.map((s, i) => {
                            const percent = totalCount > 0 ? (s.count / totalCount) * 100 : 0;
                            return (
                                <Box key={i} sx={{ animation: `${fadeIn} 0.4s ease-out forwards`, animationDelay: `${i * 0.1}s` }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={1}>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Box sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 2,
                                                bgcolor: `${s.color}15`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: s.color,
                                                border: `1px solid ${s.color}33`
                                            }}>
                                                <AssessmentIcon fontSize="small" />
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" fontWeight={800} sx={{ opacity: 0.8 }}>{s.label}</Typography>
                                                <Typography variant="caption" color="text.secondary">{s.count} bản ghi</Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" fontWeight={900} color={s.color}>{percent.toFixed(1)}%</Typography>
                                    </Box>
                                    <Box sx={{ width: '100%', height: 8, borderRadius: 4, bgcolor: `${s.color}10`, overflow: 'hidden' }}>
                                        <Box sx={{
                                            width: `${percent}%`,
                                            height: '100%',
                                            bgcolor: s.color,
                                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Insights Section */}
                    <Box sx={{
                        mt: 4,
                        p: 2,
                        borderRadius: '16px',
                        bgcolor: 'rgba(46,125,50,0.04)',
                        border: '1px dashed rgba(46,125,50,0.2)',
                        animation: `${fadeIn} 0.6s ease-out forwards`
                    }}>
                        <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssessmentIcon fontSize="small" /> NHẬN XÉT CỦA HỆ THỐNG
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                            Dữ liệu cho thấy chỉ số của <strong>{stats.title}</strong> đang duy trì ở mức ổn định.
                            Tỷ lệ {stats.stats[0]?.label} chiếm đa số ({((stats.stats[0]?.count / totalCount) * 100).toFixed(1)}%).
                            Hệ thống tự động đánh giá các chỉ số kỹ thuật hiện tại nằm trong phạm vi an toàn.
                        </Typography>
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};

interface StatsButtonProps {
    activeMenu: string;
}

const StatsButton: React.FC<StatsButtonProps> = ({ activeMenu }) => {
    const stats = getStatsByActiveMenu(activeMenu);
    const [openDialog, setOpenDialog] = useState(false);

    if (!stats) return null;

    const handleOpen = () => setOpenDialog(true);
    const handleClose = () => setOpenDialog(false);

    return (
        <>
            <StatsTooltipView
                title={<SimpleStatsView stats={stats} />}
                placement="bottom-end"
                arrow
                enterDelay={300}
            >
                <Button
                    variant="outlined"
                    startIcon={<BarChartIcon />}
                    onClick={handleOpen}
                    sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        px: 2,
                        '&:hover': {
                            bgcolor: 'primary.main',
                            color: '#fff',
                            boxShadow: '0 6px 16px rgba(46,125,50,0.25)',
                            transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    Thống kê nhanh
                </Button>
            </StatsTooltipView>

            <Dialog
                open={openDialog}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        p: 1.5,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 1
                }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{
                            p: 1,
                            borderRadius: '12px',
                            bgcolor: 'primary.main',
                            color: '#fff',
                            display: 'flex',
                            boxShadow: '0 4px 12px rgba(46,125,50,0.3)'
                        }}>
                            <BarChartIcon />
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight={900} color="primary">
                                {stats.title.toUpperCase()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                BÁO CÁO PHÂN TÍCH HỆ THỐNG
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleClose} sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ py: 2 }}>
                    <RichStatsView stats={stats} />
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button
                        onClick={handleClose}
                        variant="contained"
                        sx={{
                            borderRadius: '12px',
                            px: 4,
                            py: 1.25,
                            fontWeight: 800,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                    >
                        Đóng báo cáo
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default StatsButton;
