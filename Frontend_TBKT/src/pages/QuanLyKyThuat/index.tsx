// ============================================================
// QuanLyKyThuat — Unified page for BaoQuan, SuaChua, NiemCat, DieuDong
//
// Routes:
//   /bao-duong → redirected to /bao-duong which now uses BaoDuong component
//   /quan-ly-ky-thuat/bao-duong → legacy redirect to /bao-duong
//   /quan-ly-ky-thuat/bao-quan → LogType = 1
//   /quan-ly-ky-thuat/sua-chua → LogType = 3
//   /quan-ly-ky-thuat/niem-cat → LogType = 4
//   /quan-ly-ky-thuat/dieu-dong → LogType = 5
//
// Layout: Calendar view (default) | Quarter view | Gantt view
// Stats bar: ke_hoach_thang | da_hoan_thanh | con_lai | ty_le
// Technician workload cards
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

import {
    getListTrangBiLog,
    getCalendarLog,
    getKTVWorkload,
    getLogStats,
    deleteTrangBiLog,
} from '../../apis/trangBiLogApi';
import {
    LOG_TYPE_LABELS,
    LOG_STATUS_LABELS,
    LOG_STATUS_COLORS,
} from '../../types/trangBiLog';
import type {
    LocalTrangBiLogSummary as TrangBiLogSummary,
    LocalCalendarItem as TrangBiLogCalendarItem,
    LocalKTVWorkloadItem as KTVWorkloadItem,
    LocalLogStats as LogStats,
} from '../../apis/trangBiLogApi';
import { LogType, LogStatus } from '../../grpc/generated/TrangBiLog_pb';


type ViewMode = 'month' | 'quarter' | 'gantt';

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const ROUTE_TO_LOGTYPE: Record<string, number> = {
    '/bao-quan': 1,
    '/bao-duong': 2,
    '/sua-chua': 3,
    '/niem-cat': 4,
    '/dieu-dong': 5,
    '/quan-ly-ky-thuat/bao-quan': 1,
    '/quan-ly-ky-thuat/bao-duong': 2,
    '/quan-ly-ky-thuat/sua-chua': 3,
    '/quan-ly-ky-thuat/niem-cat': 4,
    '/quan-ly-ky-thuat/dieu-dong': 5,
};

const LOGTYPE_TO_ICON: Record<number, React.ReactNode> = {
    1: <InventoryIcon />,
    2: <BuildIcon />,
    3: <HandymanIcon />,
    4: <WarehouseIcon />,
    5: <LocalShippingIcon />,
};

const LOGTYPE_TO_COLOR: Record<number, string> = {
    1: '#639922',
    2: '#3C3489',
    3: '#EF9F27',
    4: '#7F77DD',
    5: '#AFA9EC',
};

const STATUS_BADGE_COLORS: Record<number, { bg: string; color: string }> = {
    0: { bg: '#f5f5f5', color: '#757575' },
    1: { bg: '#EAF3DE', color: '#3B6D11' },
    2: { bg: '#FAEEDA', color: '#854F0B' },
    3: { bg: '#EEEDFE', color: '#3C3489' },
    4: { bg: '#FCEBEB', color: '#A32D2D' },
};

const QUARTER_MONTHS: Record<number, number[]> = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
};

// ── Stat Card ──────────────────────────────────────────────
const StatCard: React.FC<{
    label: string;
    value: number | string;
    warn?: boolean;
    success?: boolean;
}> = ({ label, value, warn, success }) => (
    <Box sx={{
        bgcolor: 'background.default',
        borderRadius: 2,
        p: 1.5,
        textAlign: 'center',
    }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{
            color: success ? '#3B6D11' : warn ? '#BA7517' : 'text.primary',
        }}>
            {value}
        </Typography>
    </Box>
);

// ── Calendar Cell ──────────────────────────────────────────
const CalendarCell: React.FC<{
    day: number;
    tasks: TrangBiLogCalendarItem[];
    isToday: boolean;
    onTaskClick: (task: TrangBiLogCalendarItem) => void;
}> = ({ day, tasks, isToday, onTaskClick }) => (
    <Box sx={{
        minHeight: 56,
        borderRadius: 1.5,
        border: '0.5px solid',
        borderColor: isToday ? '#AFA9EC' : 'divider',
        bgcolor: tasks.length > 0 ? 'action.hover' : 'background.paper',
        p: 0.5,
        cursor: tasks.length > 0 ? 'pointer' : 'default',
        transition: 'background 0.15s',
        '&:hover': tasks.length > 0 ? { bgcolor: 'action.selected' } : {},
    }}>
        <Typography variant="caption" sx={{
            fontSize: '0.7rem',
            color: isToday ? '#3C3489' : 'text.secondary',
            fontWeight: isToday ? 700 : 400,
            display: 'block',
            mb: 0.25,
        }}>
            {day}
        </Typography>
        {tasks.slice(0, 2).map((task) => {
            const color = LOGTYPE_TO_COLOR[task.logType] ?? '#757575';
            return (
                <Box
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    sx={{
                        fontSize: '0.62rem',
                        px: 0.5,
                        py: '1px',
                        borderRadius: 99,
                        mb: '2px',
                        bgcolor: `${color}22`,
                        color: color,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                    }}
                >
                    {task.tenTrangBi ?? `Log #${task.id.slice(-4)}`}
                </Box>
            );
        })}
        {tasks.length > 2 && (
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                +{tasks.length - 2} khác
            </Typography>
        )}
    </Box>
);

// ── Workload Card ─────────────────────────────────────────
const WorkloadCard: React.FC<{ item: KTVWorkloadItem; color: string }> = ({ item, color }) => {
    const pct = Math.round(item.taiPhanCong * 100);
    const isOverload = pct >= 80;
    return (
        <Box sx={{
            border: '0.5px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            p: 1.25,
        }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {item.tenKtv}
            </Typography>
            <Box sx={{ height: 5, bgcolor: 'background.default', borderRadius: 99, mb: 0.5, overflow: 'hidden' }}>
                <Box sx={{
                    height: '100%',
                    width: `${pct}%`,
                    bgcolor: isOverload ? '#E24B4A' : color,
                    borderRadius: 99,
                }} />
            </Box>
            <Typography variant="caption" color="text.secondary">
                {item.daHoanThanh} / {item.tongNhiemVu} nhiệm vụ · tải{' '}
                <strong style={{ color: isOverload ? '#A32D2D' : 'inherit' }}>{pct}%</strong>
            </Typography>
        </Box>
    );
};

// ── Main Component ────────────────────────────────────────
const QuanLyKyThuat: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname.replace(/\?.*/, '');

    const logType = (ROUTE_TO_LOGTYPE[pathname] ?? 2) as number;
    const logTypeLabel = LOG_TYPE_LABELS[logType as LogType] ?? 'Nghiệp vụ';
    const pageColor = LOGTYPE_TO_COLOR[logType] ?? '#3C3489';
    const pageIcon = LOGTYPE_TO_ICON[logType] ?? <BuildIcon />;

    // ── View state ────────────────────────────────────────
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [curYear, setCurYear] = useState(new Date().getFullYear());
    const [curMonth, setCurMonth] = useState(new Date().getMonth() + 1);
    const [curQuarter, setCurQuarter] = useState(
        Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4
    );

    // ── Data state ─────────────────────────────────────
    const [stats, setStats] = useState<LogStats | null>(null);
    const [calendarItems, setCalendarItems] = useState<TrangBiLogCalendarItem[]>([]);
    const [workloadItems, setWorkloadItems] = useState<KTVWorkloadItem[]>([]);
    const [listItems, setListItems] = useState<TrangBiLogSummary[]>([]);

    // ── UI state ────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TrangBiLogSummary | null>(null);
    const [selectedTask, setSelectedTask] = useState<TrangBiLogCalendarItem | null>(null);

    // ── Load data ────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsData, calData, wlData, listData] = await Promise.all([
                getLogStats({ logType, year: curYear, month: viewMode === 'quarter' ? 0 : curMonth, quarter: viewMode === 'quarter' ? curQuarter : 0 }),
                viewMode === 'month' ? getCalendarLog({ logType, year: curYear, month: curMonth }) : Promise.resolve([]),
                viewMode === 'month' && logType === 2 ? getKTVWorkload({ logType, year: curYear, month: curMonth }) : Promise.resolve([]),
                getListTrangBiLog({ logType, year: curYear, month: curMonth, searchText }),
            ]);
            setStats(statsData);
            setCalendarItems(calData);
            setWorkloadItems(wlData);
            setListItems(listData);
        } catch (err) {
            setError((err as Error).message ?? 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [logType, curYear, curMonth, curQuarter, viewMode, searchText]);

    useEffect(() => { void loadData(); }, [loadData]);

    // ── Calendar helpers ──────────────────────────────────
    const calendarTasksByDay = useMemo(() => {
        const map: Record<number, TrangBiLogCalendarItem[]> = {};
        for (const item of calendarItems) {
            if (!item.ngay) continue;
            const d = new Date(item.ngay);
            if (d.getFullYear() === curYear && d.getMonth() + 1 === curMonth) {
                const day = d.getDate();
                if (!map[day]) map[day] = [];
                map[day].push(item);
            }
        }
        return map;
    }, [calendarItems, curYear, curMonth]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(curYear, curMonth - 1, 1).getDay();
        const daysInMonth = new Date(curYear, curMonth, 0).getDate();
        return { firstDay, daysInMonth };
    }, [curYear, curMonth]);

    const today = useMemo(() => {
        const now = new Date();
        return now.getFullYear() === curYear && now.getMonth() + 1 === curMonth ? now.getDate() : 0;
    }, [curYear, curMonth]);

    const monthLabel = `${MONTHS[curMonth - 1]} / ${curYear}`;

    // ── Navigation ──────────────────────────────────────
    const prevMonth = () => {
        if (curMonth === 1) { setCurYear(y => y - 1); setCurMonth(12); }
        else setCurMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (curMonth === 12) { setCurYear(y => y + 1); setCurMonth(1); }
        else setCurMonth(m => m + 1);
    };

    const filteredList = useMemo(() => {
        if (!searchText.trim()) return listItems;
        const q = searchText.toLowerCase();
        return listItems.filter(item =>
            (item.tenTrangBi?.toLowerCase().includes(q)) ||
            (item.soHieuTrangBi?.toLowerCase().includes(q)) ||
            (item.donViChuQuan?.toLowerCase().includes(q)) ||
            (item.ktvChinh?.toLowerCase().includes(q))
        );
    }, [listItems, searchText]);

    const handleEdit = (item: TrangBiLogSummary) => {
        setEditingItem(item);
        setEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xóa bản ghi này?')) return;
        try {
            await deleteTrangBiLog([id]);
            void loadData();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const statusColorBadge = (status: LogStatus) => {
        const sc = STATUS_BADGE_COLORS[status] ?? STATUS_BADGE_COLORS[0];
        return (
            <Chip
                size="small"
                label={LOG_STATUS_LABELS[status] ?? ''}
                sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.68rem' }}
            />
        );
    };

    return (
        <Box sx={{ p: 1.5 }}>
            {/* ── Header ── */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: pageColor, display: 'flex', alignItems: 'center' }}>
                        {pageIcon}
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight={800} sx={{ color: pageColor, letterSpacing: '-0.02em' }}>
                            {logTypeLabel}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Kế hoạch {MONTHS[curMonth - 1]} {curYear} · Quý {curQuarter} {curYear}
                        </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tabs
                        value={viewMode}
                        onChange={(_, v) => setViewMode(v)}
                        sx={{
                            minHeight: 34,
                            '& .MuiTab-root': { minHeight: 34, fontSize: '0.78rem', fontWeight: 600, textTransform: 'none', px: 1.5 },
                        }}
                    >
                        <Tab value="month" label="Tháng" />
                        <Tab value="quarter" label="Quý" />
                        <Tab value="gantt" label="Gantt" />
                    </Tabs>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            if (logType === 2) {
                                navigate('/bao-duong');
                                return;
                            }
                            setEditingItem(null);
                            setEditorOpen(true);
                        }}
                        sx={{
                            bgcolor: pageColor,
                            textTransform: 'none',
                            fontWeight: 700,
                            '&:hover': { bgcolor: pageColor, opacity: 0.9 },
                        }}
                    >
                        Thêm kế hoạch
                    </Button>
                </Stack>
            </Stack>

            {/* ── Stats ── */}
            {stats && (
                <Grid container spacing={1} mb={1.5}>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <StatCard label={`Kế hoạch ${MONTHS[curMonth - 1]}`} value={stats.keHoachThang} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <StatCard label="Đã hoàn thành" value={stats.daHoanThanh} success />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <StatCard label="Còn lại trong tháng" value={stats.conLai} warn />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <StatCard label="Hoàn thành Q" value={`${Math.round(stats.tyLeHoanThanh * 100)}%`} success />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <StatCard label="Quá hạn" value={stats.quaHan} warn />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <StatCard label="Sắp đến hạn (≤15 ngày)" value={stats.sapDenHan} />
                    </Grid>
                </Grid>
            )}

            {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* ── Month View ── */}
            {viewMode === 'month' && (
                <>
                    {/* Calendar card */}
                    <Card sx={{ mb: 1.5 }}>
                        <CardContent sx={{ p: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconButton size="small" onClick={prevMonth}><ChevronLeftIcon fontSize="small" /></IconButton>
                                    <Typography variant="subtitle1" fontWeight={700}>{monthLabel}</Typography>
                                    <IconButton size="small" onClick={nextMonth}><ChevronRightIcon fontSize="small" /></IconButton>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    {[
                                        { color: '#97C459', label: 'Đã hoàn thành' },
                                        { color: '#AFA9EC', label: 'Kế hoạch' },
                                        { color: '#E24B4A', label: 'Quá hạn' },
                                    ].map(s => (
                                        <Stack key={s.label} direction="row" spacing={0.5} alignItems="center">
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Stack>

                            <Grid container spacing={0.5}>
                                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                                    <Grid key={d} size={{ xs: 12/7 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', fontWeight: 600 }}>
                                            {d}
                                        </Typography>
                                    </Grid>
                                ))}
                                {Array.from({ length: calendarDays.firstDay }).map((_, i) => (
                                    <Grid key={`empty-${i}`} size={{ xs: 12/7 }} />
                                ))}
                                {Array.from({ length: calendarDays.daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const tasks = calendarTasksByDay[day] ?? [];
                                    return (
                                        <Grid key={day} size={{ xs: 12/7 }}>
                                            <CalendarCell
                                                day={day}
                                                tasks={tasks}
                                                isToday={day === today}
                                                onTaskClick={setSelectedTask}
                                            />
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Technician workload (BaoDuong only) */}
                    {logType === 2 && workloadItems.length > 0 && (
                        <Card sx={{ mb: 1.5 }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                                    Phân công kỹ thuật viên — {monthLabel}
                                </Typography>
                                <Grid container spacing={1}>
                                    {workloadItems.map(item => (
                                        <Grid key={item.ktvId} size={{ xs: 12, sm: 6, md: 4 }}>
                                            <WorkloadCard item={item} color={pageColor} />
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}

                    {/* List table */}
                    <Card>
                        <CardContent sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                                <TextField
                                    size="small"
                                    placeholder="Tìm tên TB, đơn vị, KTV..."
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 0.5, opacity: 0.5 }} /> } }}
                                    sx={{ maxWidth: 280 }}
                                />
                                <Box sx={{ flex: 1 }} />
                                <Typography variant="caption" color="text.secondary">
                                    {filteredList.length} bản ghi
                                </Typography>
                            </Stack>

                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'background.default' }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Trang bị</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>KTV phụ trách</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Ngày dự kiến</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Ngày thực hiện</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'right' }}>Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>
                                                    <CircularProgress size={24} />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                                                    Chưa có bản ghi nào cho {logTypeLabel.toLowerCase()} tháng này
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredList.map(item => (
                                            <TableRow key={item.id} hover sx={{ cursor: 'pointer' }}>
                                                <TableCell sx={{ fontSize: '0.82rem' }}>
                                                    <Typography fontWeight={600}>{item.tenTrangBi ?? '(không tên)'}</Typography>
                                                    {item.soHieuTrangBi && (
                                                        <Typography variant="caption" color="text.secondary">{item.soHieuTrangBi}</Typography>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                        {item.donViChuQuan}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.82rem' }}>{item.ktvChinh ?? '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                    {item.ngayDuKien ? new Date(item.ngayDuKien).toLocaleDateString('vi-VN') : '—'}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                    {item.ngayThucHien ? new Date(item.ngayThucHien).toLocaleDateString('vi-VN') : '—'}
                                                </TableCell>
                                                <TableCell>{statusColorBadge(item.status)}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" onClick={() => handleEdit(item)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Quarter View ── */}
            {viewMode === 'quarter' && (
                <Card>
                    <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                            Tổng quan Q{curQuarter}/{curYear} ({MONTHS[QUARTER_MONTHS[curQuarter][0] - 1]} — {MONTHS[QUARTER_MONTHS[curQuarter][2] - 1]})
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'background.default' }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Trang bị</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Đơn vị</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>
                                            T{QUARTER_MONTHS[curQuarter][0]}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>
                                            T{QUARTER_MONTHS[curQuarter][1]}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>
                                            T{QUARTER_MONTHS[curQuarter][2]}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                                                Chưa có dữ liệu quý này
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredList.map(item => (
                                        <TableRow key={item.id} hover>
                                            <TableCell sx={{ fontSize: '0.82rem' }}>
                                                <Typography fontWeight={600}>{item.tenTrangBi}</Typography>
                                                {item.soHieuTrangBi && <Typography variant="caption" color="text.secondary">{item.soHieuTrangBi}</Typography>}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.82rem' }}>{item.donViChuQuan}</TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>{statusColorBadge(item.status)}</TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>—</TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>—</TableCell>
                                            <TableCell>{statusColorBadge(item.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* ── Gantt View ── */}
            {viewMode === 'gantt' && (
                <Card>
                    <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                            Biểu đồ Gantt — {monthLabel}
                        </Typography>
                        {filteredList.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Chưa có dữ liệu Gantt</Box>
                        ) : (
                            <Stack spacing={1}>
                                {filteredList.slice(0, 20).map(item => (
                                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 160, flexShrink: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>{item.tenTrangBi}</Typography>
                                            <Typography variant="caption" color="text.secondary">{item.ktvChinh ?? '—'}</Typography>
                                        </Box>
                                        <Box sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 99, height: 10, position: 'relative', overflow: 'hidden' }}>
                                            {item.ngayThucHien && (
                                                <Box sx={{
                                                    position: 'absolute',
                                                    left: '20%',
                                                    width: '30%',
                                                    height: '100%',
                                                    bgcolor: item.status === 1 ? '#97C459' : item.status === 4 ? '#E24B4A' : '#AFA9EC',
                                                    borderRadius: 99,
                                                }} />
                                            )}
                                        </Box>
                                        {statusColorBadge(item.status)}
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Task detail dialog ── */}
            <Dialog open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: pageColor }}>{pageIcon}</Box>
                    Chi tiết {logTypeLabel.toLowerCase()}
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => setSelectedTask(null)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedTask && (
                        <Stack spacing={1.5}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Trang bị</Typography>
                                <Typography fontWeight={600}>{selectedTask.tenTrangBi}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">KTV phụ trách</Typography>
                                <Typography>{selectedTask.ktvChinh ?? '—'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Ngày</Typography>
                                <Typography>{selectedTask.ngay ? new Date(selectedTask.ngay).toLocaleDateString('vi-VN') : '—'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                <Box mt={0.5}>{statusColorBadge(selectedTask.status)}</Box>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Editor dialog placeholder ── */}
            <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: pageColor }}>{pageIcon}</Box>
                    {editingItem ? 'Chỉnh sửa' : 'Thêm mới'} {logTypeLabel}
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => setEditorOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mt: 1 }}>
                        Form chỉnh sửa chi tiết sẽ được triển khai theo mẫu HTML đã cung cấp.
                        Hiện tại đang ở chế độ xem danh sách.
                    </Alert>
                    <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
                        <Button variant="outlined" onClick={() => setEditorOpen(false)}>Đóng</Button>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: pageColor, '&:hover': { bgcolor: pageColor, opacity: 0.9 } }}
                            onClick={() => setEditorOpen(false)}
                        >
                            Lưu (placeholder)
                        </Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default QuanLyKyThuat;
