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

export interface ScheduleGanttItem {
    id: string;
    tenLich: string;
    canCu: string;
    thoiGianLap: string;
    donVi: string;
    nguoiPhuTrach: string;
    thoiGianThucHien: string;
    thoiGianKetThuc: string;
    noiDungCongViec: string;
    vatChatBaoDam: string;
    ketQua: string;
    parameters: Record<string, string>;
    equipmentKeys: string[];
    soTrangBi: number;
    version?: number;
}

interface GanttViewProps {
    schedules: ScheduleGanttItem[];
    onScheduleClick: (schedule: ScheduleGanttItem) => void;
    loading?: boolean;
    panelHeight?: number | string;
    tableColumns?: GridColDef<ScheduleGanttItem>[];
}

type ViewMode = 'week' | 'month' | 'year';
type DisplayMode = 'gantt' | 'table';

type DateRange = {
    start: Date;
    end: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_COLORS = {
    overdue: { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595', label: 'Qua han' },
    inprogress: { bg: '#FAEEDA', color: '#854F0B', border: '#EF9F27', label: 'Dang thuc hien' },
    upcoming: { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC', label: 'Chua bat dau' },
    completed: { bg: '#EAF3DE', color: '#3B6D11', border: '#97C459', label: 'Hoan thanh' },
    none: { bg: '#f5f5f5', color: '#757575', border: '#e0e0e0', label: 'Chua cap nhat' },
};

const DOWS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const parseDate = (value: string): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const startOfWeek = (date: Date): Date => {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
};

const endOfWeek = (date: Date): Date => {
    const d = startOfWeek(date);
    d.setDate(d.getDate() + 6);
    return endOfDay(d);
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const startOfYear = (date: Date): Date => new Date(date.getFullYear(), 0, 1);
const endOfYear = (date: Date): Date => new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

const addByViewMode = (date: Date, viewMode: ViewMode, delta: number): Date => {
    const next = new Date(date);
    if (viewMode === 'week') {
        next.setDate(next.getDate() + (delta * 7));
        return next;
    }
    if (viewMode === 'month') {
        next.setMonth(next.getMonth() + delta);
        return next;
    }
    next.setFullYear(next.getFullYear() + delta);
    return next;
};

const getRangeByView = (anchorDate: Date, viewMode: ViewMode): DateRange => {
    if (viewMode === 'week') return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
    if (viewMode === 'month') return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
    return { start: startOfYear(anchorDate), end: endOfYear(anchorDate) };
};

const formatRangeLabel = (range: DateRange, viewMode: ViewMode): string => {
    if (viewMode === 'year') return `Năm ${range.start.getFullYear()}`;
    if (viewMode === 'month') return `${MONTHS_VI[range.start.getMonth()]} ${range.start.getFullYear()}`;
    const from = `${String(range.start.getDate()).padStart(2, '0')}/${String(range.start.getMonth() + 1).padStart(2, '0')}`;
    const to = `${String(range.end.getDate()).padStart(2, '0')}/${String(range.end.getMonth() + 1).padStart(2, '0')}/${range.end.getFullYear()}`;
    return `Tuần ${from} - ${to}`;
};

const enumerateDays = (range: DateRange): Date[] => {
    const days: Date[] = [];
    const cursor = startOfDay(range.start);
    const end = endOfDay(range.end);
    while (cursor <= end) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
};

const getScheduleRange = (schedule: ScheduleGanttItem): DateRange | null => {
    const startCandidate = parseDate(schedule.thoiGianThucHien) ?? parseDate(schedule.thoiGianLap);
    if (!startCandidate) return null;
    const endCandidate = parseDate(schedule.thoiGianKetThuc) ?? startCandidate;
    const start = startOfDay(startCandidate);
    const end = endOfDay(endCandidate);
    return end < start ? { start, end: endOfDay(start) } : { start, end };
};

const resolveStatus = (schedule: ScheduleGanttItem): keyof typeof STATUS_COLORS => {
    if (schedule.ketQua && schedule.ketQua.trim() !== '') return 'completed';
    const range = getScheduleRange(schedule);
    if (!range) return 'none';
    const now = Date.now();
    if (range.end.getTime() < now) return 'overdue';
    if (range.start.getTime() <= now && range.end.getTime() >= now) return 'inprogress';
    return 'upcoming';
};

const resolveLevel = (schedule: ScheduleGanttItem): string => {
    const p = schedule.parameters || {};
    return (
        p.cap_bao_quan ||
        p.cap_bao_duong ||
        p.muc_sua_chua ||
        p.cap_sua_chua ||
        p.loai_niem_cat ||
        p.loai_de_nghi ||
        p.cap_chat_luong ||
        ''
    );
};

const intersectsRange = (scheduleRange: DateRange, viewRange: DateRange): boolean =>
    scheduleRange.end.getTime() >= viewRange.start.getTime() && scheduleRange.start.getTime() <= viewRange.end.getTime();

const GanttBar: React.FC<{
    schedule: ScheduleGanttItem;
    scheduleRange: DateRange;
    viewRange: DateRange;
    dayWidth: number;
    rowHeight: number;
    totalDays: number;
    onClick: () => void;
}> = ({ schedule, scheduleRange, viewRange, dayWidth, rowHeight, totalDays, onClick }) => {
    const st = resolveStatus(schedule);
    const sc = STATUS_COLORS[st];

    const clampedStart = Math.max(
        0,
        Math.floor((startOfDay(scheduleRange.start).getTime() - startOfDay(viewRange.start).getTime()) / DAY_MS),
    );
    const clampedEndExclusive = Math.min(
        totalDays,
        Math.ceil((endOfDay(scheduleRange.end).getTime() - startOfDay(viewRange.start).getTime()) / DAY_MS),
    );

    if (clampedEndExclusive <= 0 || clampedStart >= totalDays || clampedEndExclusive <= clampedStart) return null;

    const barLeft = clampedStart * dayWidth;
    const barWidth = Math.max((clampedEndExclusive - clampedStart) * dayWidth - 2, Math.min(dayWidth, 8));

    return (
        <Tooltip title={`${schedule.tenLich}${schedule.soTrangBi ? ` · ${schedule.soTrangBi} trang bi` : ''}${schedule.nguoiPhuTrach ? ` · ${schedule.nguoiPhuTrach}` : ''}`} placement="top">
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
    schedules: ScheduleGanttItem[];
    viewMode: ViewMode;
    anchorDate: Date;
    onScheduleClick: (schedule: ScheduleGanttItem) => void;
}> = ({ schedules, viewMode, anchorDate, onScheduleClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(980);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) setContainerWidth(entry.contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const viewRange = useMemo(() => getRangeByView(anchorDate, viewMode), [anchorDate, viewMode]);
    const dayCells = useMemo(() => enumerateDays(viewRange), [viewRange]);
    const totalDays = dayCells.length;

    const dayWidth = useMemo(() => {
        const timelineArea = Math.max(containerWidth - 180, 360);
        if (viewMode === 'year') return Math.max(Math.floor(timelineArea / totalDays), 2);
        if (viewMode === 'week') return Math.max(Math.floor(timelineArea / totalDays), 38);
        return Math.max(Math.floor(timelineArea / totalDays), 18);
    }, [containerWidth, totalDays, viewMode]);

    const scheduleRows = useMemo(() => {
        return schedules
            .map((schedule) => ({ schedule, range: getScheduleRange(schedule) }))
            .filter((item): item is { schedule: ScheduleGanttItem; range: DateRange } => Boolean(item.range))
            .filter((item) => intersectsRange(item.range, viewRange))
            .sort((a, b) => a.range.start.getTime() - b.range.start.getTime());
    }, [schedules, viewRange]);

    const yearSegments = useMemo(() => {
        if (viewMode !== 'year') return [];
        const year = viewRange.start.getFullYear();
        return Array.from({ length: 12 }, (_, month) => {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            return {
                key: `${year}-${month + 1}`,
                month,
                width: daysInMonth * dayWidth,
                isAlt: month % 2 === 1,
            };
        });
    }, [dayWidth, viewMode, viewRange.start]);

    const ROW_HEIGHT = 44;
    const totalWidth = totalDays * dayWidth;

    return (
        <Box ref={containerRef} sx={{ overflow: 'auto', height: '100%', minHeight: 0 }}>
            <Box sx={{ minWidth: 180 + totalWidth, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', borderBottom: '0.5px solid', borderColor: 'divider' }}>
                    <Box sx={{ width: 180, flexShrink: 0, p: 1, borderRight: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">Ke hoach</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flex: 1 }}>
                        {viewMode === 'year' ? (
                            yearSegments.map((segment) => (
                                <Box
                                    key={segment.key}
                                    sx={{
                                        width: segment.width,
                                        minWidth: segment.width,
                                        textAlign: 'center',
                                        py: 0.75,
                                        borderRight: '0.5px solid',
                                        borderColor: 'divider',
                                        bgcolor: segment.isAlt ? 'action.hover' : 'background.default',
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', fontWeight: 600 }}>
                                        {MONTHS_VI[segment.month]}
                                    </Typography>
                                </Box>
                            ))
                        ) : (
                            dayCells.map((day) => {
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                const label = viewMode === 'week'
                                    ? `${DOWS_VI[day.getDay()]}, ${day.getDate()}`
                                    : ((day.getDate() % 2 === 0 || day.getDate() === 1 || totalDays <= 10) ? String(day.getDate()) : '');
                                return (
                                    <Box
                                        key={day.toISOString()}
                                        sx={{
                                            width: dayWidth,
                                            minWidth: dayWidth,
                                            textAlign: 'center',
                                            py: 0.75,
                                            borderRight: '0.5px solid',
                                            borderColor: 'divider',
                                            bgcolor: isWeekend ? 'action.hover' : 'background.default',
                                        }}
                                    >
                                        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 500 }}>
                                            {label}
                                        </Typography>
                                    </Box>
                                );
                            })
                        )}
                    </Box>
                </Box>

                {scheduleRows.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.disabled">
                            Không có kế hoạch trong khoảng thời gian đang xem
                        </Typography>
                    </Box>
                ) : (
                    scheduleRows.map(({ schedule, range }) => {
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
                                    {viewMode === 'year' ? (
                                        yearSegments.map((segment, index) => (
                                            <Box
                                                key={`bg-year-${segment.key}`}
                                                sx={{
                                                    position: 'absolute',
                                                    left: yearSegments.slice(0, index).reduce((sum, item) => sum + item.width, 0),
                                                    width: segment.width,
                                                    height: ROW_HEIGHT,
                                                    borderRight: '0.5px solid',
                                                    borderColor: 'divider',
                                                    bgcolor: segment.isAlt ? 'rgba(0,0,0,0.015)' : 'transparent',
                                                }}
                                            />
                                        ))
                                    ) : (
                                        dayCells.map((day, i) => {
                                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                            return (
                                                <Box
                                                    key={`bg-day-${schedule.id}-${day.toISOString()}`}
                                                    sx={{
                                                        position: 'absolute',
                                                        left: i * dayWidth,
                                                        width: dayWidth,
                                                        height: ROW_HEIGHT,
                                                        borderRight: '0.5px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: isWeekend ? 'rgba(0,0,0,0.015)' : 'transparent',
                                                    }}
                                                />
                                            );
                                        })
                                    )}
                                    <GanttBar
                                        schedule={schedule}
                                        scheduleRange={range}
                                        viewRange={viewRange}
                                        dayWidth={dayWidth}
                                        rowHeight={ROW_HEIGHT}
                                        totalDays={totalDays}
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
    schedules: ScheduleGanttItem[];
    onScheduleClick: (schedule: ScheduleGanttItem) => void;
    columns?: GridColDef<ScheduleGanttItem>[];
}> = ({ schedules, onScheduleClick, columns: columnsOverride }) => {
    const columns = useMemo<GridColDef[]>(() => [
        { field: 'tenLich', headerName: 'Tên kế hoạch', minWidth: 160, flex: 1.2, valueGetter: (_, row: ScheduleGanttItem) => row.tenLich },
        { field: 'canCu', headerName: 'Căn cứ', minWidth: 120, flex: 1, valueGetter: (_, row: ScheduleGanttItem) => row.canCu || '' },
        { field: 'donVi', headerName: 'Đơn vị thực hiện', minWidth: 120, flex: 1, valueGetter: (_, row: ScheduleGanttItem) => row.donVi || '' },
        {
            field: 'thoiGianThucHien', headerName: 'Bắt đầu', minWidth: 95, flex: 0.65,
            valueGetter: (_, row: ScheduleGanttItem) => {
                const start = parseDate(row.thoiGianThucHien) ?? parseDate(row.thoiGianLap);
                return start ? start.toLocaleDateString('vi-VN') : '';
            },
        },
        {
            field: 'thoiGianKetThuc', headerName: 'Kết thúc', minWidth: 95, flex: 0.65,
            valueGetter: (_, row: ScheduleGanttItem) => {
                const end = parseDate(row.thoiGianKetThuc);
                return end ? end.toLocaleDateString('vi-VN') : '';
            },
        },
        {
            field: 'cap', headerName: 'Cấp', minWidth: 100, flex: 0.7,
            valueGetter: (_, row: ScheduleGanttItem) => resolveLevel(row),
        },
        {
            field: 'noiDungCongViec', headerName: 'Nội dung thực hiện', minWidth: 140, flex: 1.1,
            valueGetter: (_, row: ScheduleGanttItem) => row.noiDungCongViec || '',
        },
        // { field: 'soTrangBi', headerName: 'Số TB', minWidth: 70, flex: 0.45 },
        // { field: 'nguoiPhuTrach', headerName: 'Người phụ trách', minWidth: 110, flex: 0.8 },
        // {
        //     field: 'status', headerName: 'Trạng thái', minWidth: 110, flex: 0.8,
        //     valueGetter: (_, row: ScheduleGanttItem) => resolveStatus(row),
        //     renderCell: (params: GridRenderCellParams<ScheduleGanttItem, string>) => {
        //         const sc = STATUS_COLORS[(params.value || 'none') as keyof typeof STATUS_COLORS] || STATUS_COLORS.none;
        //         return (
        //             <Chip
        //                 size="small"
        //                 label={sc.label}
        //                 sx={{
        //                     fontSize: '0.7rem',
        //                     fontWeight: 600,
        //                     bgcolor: sc.bg,
        //                     color: sc.color,
        //                     border: `0.5px solid ${sc.border}`,
        //                 }}
        //             />
        //         );
        //     },
        // },
    ], []);

    const resolvedColumns = columnsOverride || columns;

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, width: '100%', overflow: 'hidden' }}>
            <DataGrid
                rows={schedules}
                columns={resolvedColumns}
                getRowId={(row) => row.id}
                hideFooter
                density="compact"
                onRowClick={(params) => onScheduleClick(params.row as ScheduleGanttItem)}
                disableColumnMenu
                sx={{
                    height: '100%',
                    width: '100%',
                    minWidth: 0,
                    cursor: 'pointer',
                    '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
                    '& .MuiDataGrid-main': { overflow: 'hidden' },
                }}
            />
        </Box>
    );
};

const GanttView: React.FC<GanttViewProps> = ({ schedules, onScheduleClick, loading, panelHeight, tableColumns }) => {
    const today = useMemo(() => new Date(), []);
    const [anchorDate, setAnchorDate] = useState<Date>(today);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('gantt');

    const viewRange = useMemo(() => getRangeByView(anchorDate, viewMode), [anchorDate, viewMode]);
    const rangeLabel = useMemo(() => formatRangeLabel(viewRange, viewMode), [viewMode, viewRange]);

    const visibleSchedules = useMemo(() => {
        return schedules.filter((schedule) => {
            const scheduleRange = getScheduleRange(schedule);
            return scheduleRange ? intersectsRange(scheduleRange, viewRange) : false;
        });
    }, [schedules, viewRange]);

    const navigate = useCallback((delta: number) => {
        setAnchorDate((prev) => addByViewMode(prev, viewMode, delta));
    }, [viewMode]);

    const goToToday = useCallback(() => setAnchorDate(new Date()), []);

    const resolvedHeight = typeof panelHeight === 'number'
        ? `${panelHeight}px`
        : (panelHeight || '100%');

    return (
        <Box
            sx={{
                border: '0.5px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                height: resolvedHeight,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2, py: 1.25, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default', flexWrap: 'wrap', gap: 1 }}
            >
                <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800}>
                        {displayMode === 'gantt' ? `Biểu đồ tiến độ — ${rangeLabel}` : `Danh sách kế hoạch — ${rangeLabel}`}
                    </Typography>
                    <Button size="small" onClick={goToToday} startIcon={<TodayIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.7rem', textTransform: 'none' }}>
                        Hôm nay
                    </Button>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    {displayMode === 'gantt' && (
                        <ButtonGroup size="small" sx={{ '& .MuiButtonGroup-grouped': { minWidth: 48 } }}>
                            <Button
                                variant={viewMode === 'week' ? 'contained' : 'outlined'}
                                onClick={() => setViewMode('week')}
                                sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                            >
                                Tuần
                            </Button>
                            <Button
                                variant={viewMode === 'month' ? 'contained' : 'outlined'}
                                onClick={() => setViewMode('month')}
                                sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                            >
                                Tháng
                            </Button>
                            <Button
                                variant={viewMode === 'year' ? 'contained' : 'outlined'}
                                onClick={() => setViewMode('year')}
                                sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                            >
                                Năm
                            </Button>
                        </ButtonGroup>
                    )}

                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDisplayMode((prev) => prev === 'gantt' ? 'table' : 'gantt')}
                        sx={{ fontSize: '0.72rem', textTransform: 'none' }}
                    >
                        {displayMode === 'gantt' ? 'Xem dạng bảng' : 'Xem biểu đồ tiến độ'}
                    </Button>

                    <Stack direction="row" spacing={0.25}>
                        <Button size="small" onClick={() => navigate(-1)} sx={{ minWidth: 28, p: 0.25 }}>
                            <NavigateBeforeIcon fontSize="small" />
                        </Button>
                        <Button size="small" onClick={() => navigate(1)} sx={{ minWidth: 28, p: 0.25 }}>
                            <NavigateNextIcon fontSize="small" />
                        </Button>
                    </Stack>
                </Stack>
            </Stack>

            <Box sx={{ p: displayMode === 'table' ? 0 : 1.5, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 4, height: '100%' }}>Dang tai...</Box>
                ) : displayMode === 'gantt' ? (
                    <GanttChartView
                        schedules={visibleSchedules}
                        viewMode={viewMode}
                        anchorDate={anchorDate}
                        onScheduleClick={onScheduleClick}
                    />
                ) : (
                    <TableView
                        schedules={visibleSchedules}
                        onScheduleClick={onScheduleClick}
                        columns={tableColumns}
                    />
                )}
            </Box>
        </Box>
    );
};

export default GanttView;
