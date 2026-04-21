import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TodayIcon from '@mui/icons-material/Today';

import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import type { MaintenanceSchedule } from '../../pages/BaoDuong';

interface GanttViewProps {
    schedules: MaintenanceSchedule[];
    onScheduleClick: (schedule: MaintenanceSchedule) => void;
    loading?: boolean;
}

type ViewMode = 'month' | 'week';
type DisplayMode = 'gantt' | 'table';

const STATUS_COLORS = {
    overdue: { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595', label: 'Quá hạn' },
    inprogress: { bg: '#FAEEDA', color: '#854F0B', border: '#EF9F27', label: 'Đang thực hiện' },
    upcoming: { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC', label: 'Chưa bắt đầu' },
    completed: { bg: '#EAF3DE', color: '#3B6D11', border: '#97C459', label: 'Hoàn thành' },
    none: { bg: '#f5f5f5', color: '#757575', border: '#e0e0e0', label: 'Chưa cập nhật' },
};

const resolveStatus = (schedule: MaintenanceSchedule): keyof typeof STATUS_COLORS => {
    if (schedule.ketQua && schedule.ketQua.trim() !== '') return 'completed';
    const now = Date.now();
    const start = schedule.thoiGianThucHien ? new Date(schedule.thoiGianThucHien).getTime() : null;
    const end = schedule.thoiGianKetThuc ? new Date(schedule.thoiGianKetThuc).getTime() : null;
    if (!start) return 'none';
    if (end && end < now) return 'overdue';
    if (start <= now && (!end || end >= now)) return 'inprogress';
    return 'upcoming';
};

const DOWS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const getDaysInPeriod = (year: number, month: number, viewMode: ViewMode): number => {
    if (viewMode === 'week') {
        const first = new Date(year, month, 1);
        const dow = first.getDay();
        const startOffset = dow === 0 ? 6 : dow - 1;
        return 7;
    }
    return new Date(year, month + 1, 0).getDate();
};

const getDayWidth = (totalDays: number, containerWidth: number): number => {
    return Math.floor(containerWidth / totalDays);
};

const GanttBar: React.FC<{
    schedule: MaintenanceSchedule;
    dayWidth: number;
    startOffset: number;
    totalDays: number;
    rowHeight: number;
    onClick: () => void;
}> = ({ schedule, dayWidth, startOffset, totalDays, rowHeight, onClick }) => {
    const st = resolveStatus(schedule);
    const sc = STATUS_COLORS[st];

    const start = schedule.thoiGianThucHien ? new Date(schedule.thoiGianThucHien) : null;
    const end = schedule.thoiGianKetThuc ? new Date(schedule.thoiGianKetThuc) : start;

    if (!start) return null;

    const dayOfMonth = start.getDate();
    const barLeft = (dayOfMonth - 1 + startOffset) * dayWidth;
    const durationDays = end ? Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1;
    const barWidth = Math.max(durationDays * dayWidth - 2, dayWidth * 0.5);

    return (
        <Tooltip title={`${schedule.tenLich}${schedule.soTrangBi ? ` · ${schedule.soTrangBi} trang bị` : ''}${schedule.nguoiPhuTrach ? ` · ${schedule.nguoiPhuTrach}` : ''}`} placement="top">
            <Box
                onClick={onClick}
                sx={{
                    position: 'absolute',
                    left: barLeft,
                    width: barWidth,
                    height: rowHeight - 16,
                    top: 8,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    px: 0.75,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    bgcolor: sc.bg,
                    color: sc.color,
                    border: `0.5px solid ${sc.border}`,
                    transition: 'filter 0.15s',
                    '&:hover': { filter: 'brightness(0.92)' },
                    zIndex: 1,
                }}
            >
                {barWidth > 80 && schedule.tenLich}
            </Box>
        </Tooltip>
    );
};

const GanttChartView: React.FC<{
    schedules: MaintenanceSchedule[];
    year: number;
    month: number;
    viewMode: ViewMode;
    onScheduleClick: (schedule: MaintenanceSchedule) => void;
}> = ({ schedules, year, month, viewMode, onScheduleClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(800);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const totalDays = getDaysInPeriod(year, month, viewMode);
    const dayWidth = Math.max(getDayWidth(totalDays, containerWidth - 180), 20);

    const firstDayOfMonth = new Date(year, month, 1);
    const firstDow = firstDayOfMonth.getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;

    const dayLabels = useMemo(() => {
        return Array.from({ length: totalDays }, (_, i) => {
            if (viewMode === 'week') {
                const d = new Date(year, month, 1);
                d.setDate(d.getDate() - startOffset + i);
                return { label: `${DOWS_VI[d.getDay()]}, ${d.getDate()}`, isWeekend: d.getDay() === 0 || d.getDay() === 6 };
            }
            const d = i + 1;
            const show = d % 5 === 0 || d === 1 || totalDays <= 10;
            return { label: show ? String(d) : '', isWeekend: false };
        });
    }, [year, month, totalDays, viewMode, startOffset]);

    const ROW_HEIGHT = 44;
    const totalWidth = totalDays * dayWidth;

    const sortedSchedules = useMemo(() => {
        return [...schedules].sort((a, b) => {
            const da = a.thoiGianLap ? new Date(a.thoiGianLap).getTime() : 0;
            const db = b.thoiGianLap ? new Date(b.thoiGianLap).getTime() : 0;
            return db - da;
        });
    }, [schedules]);

    return (
        <Box ref={containerRef} sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 180 + totalWidth, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', borderBottom: '0.5px solid', borderColor: 'divider' }}>
                    <Box sx={{ width: 180, flexShrink: 0, p: 1, borderRight: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">Kế hoạch</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flex: 1 }}>
                        {dayLabels.map((item, i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: dayWidth,
                                    minWidth: dayWidth,
                                    textAlign: 'center',
                                    py: 0.75,
                                    borderRight: '0.5px solid',
                                    borderColor: 'divider',
                                    bgcolor: item.isWeekend ? 'action.hover' : 'background.default',
                                }}
                            >
                                <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 500 }}>
                                    {item.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Rows */}
                {sortedSchedules.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.disabled">Không có kế hoạch bảo dưỡng nào trong tháng này</Typography>
                    </Box>
                ) : (
                    sortedSchedules.map((schedule) => {
                        const st = resolveStatus(schedule);
                        const sc = STATUS_COLORS[st];
                        return (
                            <Box
                                key={schedule.id}
                                sx={{
                                    display: 'flex',
                                    height: ROW_HEIGHT,
                                    borderBottom: '0.5px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <Box
                                    sx={{ width: 180, flexShrink: 0, p: 1, borderRight: '0.5px solid', borderColor: 'divider', cursor: 'pointer' }}
                                    onClick={() => onScheduleClick(schedule)}
                                >
                                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {schedule.tenLich}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                        {schedule.soTrangBi} TB{schedule.nguoiPhuTrach ? ` · ${schedule.nguoiPhuTrach}` : ''}
                                    </Typography>
                                </Box>
                                <Box sx={{ position: 'relative', flex: 1 }}>
                                    {dayLabels.map((_, i) => {
                                        const dow = (startOffset + i) % 7;
                                        return (
                                            <Box
                                                key={i}
                                                sx={{
                                                    position: 'absolute',
                                                    left: i * dayWidth,
                                                    width: dayWidth,
                                                    height: ROW_HEIGHT,
                                                    borderRight: '0.5px solid',
                                                    borderColor: 'divider',
                                                    bgcolor: dow >= 5 ? 'rgba(0,0,0,0.015)' : 'transparent',
                                                }}
                                            />
                                        );
                                    })}
                                    <GanttBar
                                        schedule={schedule}
                                        dayWidth={dayWidth}
                                        startOffset={startOffset}
                                        totalDays={totalDays}
                                        rowHeight={ROW_HEIGHT}
                                        onClick={() => onScheduleClick(schedule)}
                                    />
                                </Box>
                            </Box>
                        );
                    })
                )}
            </Box>
        </Box>
    );
};

const TableView: React.FC<{
    schedules: MaintenanceSchedule[];
    onScheduleClick: (schedule: MaintenanceSchedule) => void;
    filterKetQua: string;
    onFilterChange: (v: string) => void;
}> = ({ schedules, onScheduleClick, filterKetQua, onFilterChange }) => {
    const uniqueKetQua = useMemo(() => (
        [...new Set(schedules.map((s) => s.ketQua).filter(Boolean))]
    ), [schedules]);

    const columns = useMemo<GridColDef[]>(() => [
        { field: 'tenLich', headerName: 'Tên kế hoạch', minWidth: 220, flex: 1, valueGetter: (_, row: MaintenanceSchedule) => row.tenLich },
        {
            field: 'thoiGianThucHien', headerName: 'Bắt đầu', width: 110,
            valueGetter: (_, row: MaintenanceSchedule) => {
                if (!row.thoiGianThucHien) return '';
                return new Date(row.thoiGianThucHien).toLocaleDateString('vi-VN');
            },
        },
        {
            field: 'thoiGianKetThuc', headerName: 'Kết thúc', width: 110,
            valueGetter: (_, row: MaintenanceSchedule) => {
                if (!row.thoiGianKetThuc) return '';
                return new Date(row.thoiGianKetThuc).toLocaleDateString('vi-VN');
            },
        },
        { field: 'soTrangBi', headerName: 'Số TB', width: 80 },
        { field: 'nguoiPhuTrach', headerName: 'Người phụ trách', width: 150 },
        {
            field: 'ketQua', headerName: 'Trạng thái', width: 150,
            valueGetter: (_, row: MaintenanceSchedule) => row.ketQua,
            renderCell: (params: GridRenderCellParams<MaintenanceSchedule, string>) => {
                const st = resolveStatus(params.row);
                const sc = STATUS_COLORS[st];
                return (
                    <Chip
                        size="small"
                        label={sc.label}
                        sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: sc.bg,
                            color: sc.color,
                            border: `0.5px solid ${sc.border}`,
                        }}
                    />
                );
            },
        },
    ], []);

    const filtered = useMemo(() => {
        if (!filterKetQua) return schedules;
        return schedules.filter((s) => s.ketQua === filterKetQua);
    }, [schedules, filterKetQua]);

    return (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                    {filtered.length} kế hoạch
                </Typography>
                <Stack direction="row" spacing={0.5}>
                    {['', ...uniqueKetQua].map((v) => (
                        <Chip
                            key={v || 'all'}
                            label={v || 'Tất cả'}
                            size="small"
                            variant={filterKetQua === v ? 'filled' : 'outlined'}
                            onClick={() => onFilterChange(v)}
                            sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                        />
                    ))}
                </Stack>
            </Stack>
            <DataGrid
                rows={filtered}
                columns={columns}
                getRowId={(row) => row.id}
                hideFooter
                density="compact"
                onRowClick={(params) => onScheduleClick(params.row as MaintenanceSchedule)}
                sx={{
                    height: 400,
                    cursor: 'pointer',
                    '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
                }}
            />
        </Box>
    );
};

const GanttView: React.FC<GanttViewProps> = ({ schedules, onScheduleClick, loading }) => {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('gantt');
    const [filterKetQua, setFilterKetQua] = useState('');

    const navigateMonth = useCallback((dir: number) => {
        setMonth((prev) => {
            let next = prev + dir;
            if (next > 11) { next = 0; setYear((y) => y + 1); }
            else if (next < 0) { next = 11; setYear((y) => y - 1); }
            return next;
        });
    }, []);

    const goToToday = useCallback(() => {
        setYear(today.getFullYear());
        setMonth(today.getMonth());
    }, []);

    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

    return (
        <Box sx={{ border: '0.5px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 2, py: 1.25, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default', flexWrap: 'wrap', gap: 1 }}
                >
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={800}>
                            {displayMode === 'gantt'
                                ? `Lịch Gantt — ${MONTHS_VI[month]} ${year}`
                                : `Danh sách kế hoạch — ${MONTHS_VI[month]} ${year}`}
                        </Typography>
                        <Button size="small" onClick={goToToday} startIcon={<TodayIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.7rem', textTransform: 'none' }}>
                            Hôm nay
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        {displayMode === 'gantt' && (
                            <ButtonGroup size="small" sx={{ '& .MuiButtonGroup-grouped': { minWidth: 40 } }}>
                                <Button
                                    variant={viewMode === 'month' ? 'contained' : 'outlined'}
                                    onClick={() => setViewMode('month')}
                                    sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                                >Tháng</Button>
                                <Button
                                    variant={viewMode === 'week' ? 'contained' : 'outlined'}
                                    onClick={() => setViewMode('week')}
                                    sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                                >Tuần</Button>
                            </ButtonGroup>
                        )}

                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setDisplayMode((prev) => prev === 'gantt' ? 'table' : 'gantt')}
                            sx={{ fontSize: '0.72rem', textTransform: 'none' }}
                        >
                            {displayMode === 'gantt' ? 'Xem dang bang' : 'Xem dang gantt'}
                        </Button>

                        <Stack direction="row" spacing={0.25}>
                            <Button size="small" onClick={() => navigateMonth(-1)} sx={{ minWidth: 28, p: 0.25 }}>
                                <NavigateBeforeIcon fontSize="small" />
                            </Button>
                            <Button size="small" onClick={() => navigateMonth(1)} sx={{ minWidth: 28, p: 0.25 }}>
                                <NavigateNextIcon fontSize="small" />
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>

                <Box sx={{ p: displayMode === 'table' ? 0 : 1.5 }}>
                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>Đang tải...</Box>
                    ) : displayMode === 'gantt' ? (
                        <GanttChartView
                            schedules={schedules}
                            year={year}
                            month={month}
                            viewMode={viewMode}
                            onScheduleClick={onScheduleClick}
                        />
                    ) : (
                        <TableView
                            schedules={schedules}
                            onScheduleClick={onScheduleClick}
                            filterKetQua={filterKetQua}
                            onFilterChange={setFilterKetQua}
                        />
                    )}
                </Box>
        </Box>
    );
};

export default GanttView;
