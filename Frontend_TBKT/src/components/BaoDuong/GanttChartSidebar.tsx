import React, { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import type { ScheduleGanttItem } from './GanttView';

interface GanttChartSidebarProps {
    schedules: ScheduleGanttItem[];
    onScheduleClick?: (schedule: ScheduleGanttItem) => void;
    panelHeight?: number | string;
}

const DOWS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS_VI = [
    'Thang 1', 'Thang 2', 'Thang 3', 'Thang 4',
    'Thang 5', 'Thang 6', 'Thang 7', 'Thang 8',
    'Thang 9', 'Thang 10', 'Thang 11', 'Thang 12',
];

const resolveStatus = (schedule: ScheduleGanttItem): 'overdue' | 'inprogress' | 'upcoming' | 'completed' | 'none' => {
    if (schedule.ketQua && schedule.ketQua.trim() !== '') return 'completed';
    const now = Date.now();
    const start = schedule.thoiGianThucHien ? new Date(schedule.thoiGianThucHien).getTime() : null;
    const end = schedule.thoiGianKetThuc ? new Date(schedule.thoiGianKetThuc).getTime() : null;
    if (!start) return 'none';
    if (end && end < now) return 'overdue';
    if (start <= now && (!end || end >= now)) return 'inprogress';
    return 'upcoming';
};

const MiniCalendar: React.FC<{
    year: number;
    month: number;
    eventDays: number[];
    onPrev: () => void;
    onNext: () => void;
}> = ({ year, month, eventDays, onPrev, onNext }) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <IconButton size="small" onClick={onPrev} sx={{ width: 22, height: 22, border: '0.5px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <NavigateBeforeIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Typography variant="caption" fontWeight={700}>{MONTHS_VI[month]}, {year}</Typography>
                <IconButton size="small" onClick={onNext} sx={{ width: 22, height: 22, border: '0.5px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <NavigateNextIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                {DOWS_VI.map((d) => (
                    <Typography key={d} variant="caption" sx={{ textAlign: 'center', fontSize: '0.62rem', color: 'text.secondary', fontWeight: 700 }}>
                        {d}
                    </Typography>
                ))}
                {Array.from({ length: startOffset }, (_, i) => <Box key={`pad-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const hasEvent = eventDays.includes(d);
                    return (
                        <Box key={`day-${d}`} sx={{ textAlign: 'center', py: 0.25 }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 1, fontSize: '0.7rem', position: 'relative' }}>
                                {d}
                                {hasEvent && (
                                    <Box sx={{ position: 'absolute', bottom: 1, width: 3, height: 3, borderRadius: '50%', bgcolor: '#3C3489' }} />
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

const GanttChartSidebar: React.FC<GanttChartSidebarProps> = ({ schedules, onScheduleClick, panelHeight }) => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const navigateMonth = useCallback((dir: number) => {
        setViewMonth((prev) => {
            let next = prev + dir;
            if (next > 11) {
                next = 0;
                setViewYear((y) => y + 1);
            } else if (next < 0) {
                next = 11;
                setViewYear((y) => y - 1);
            }
            return next;
        });
    }, []);

    const eventDays = useMemo(() => {
        const days = new Set<number>();
        schedules.forEach((s) => {
            const start = s.thoiGianThucHien ? new Date(s.thoiGianThucHien) : null;
            const end = s.thoiGianKetThuc ? new Date(s.thoiGianKetThuc) : start;
            if (!start || !end) return;
            const cur = new Date(start);
            while (cur <= end) {
                if (cur.getFullYear() === viewYear && cur.getMonth() === viewMonth) days.add(cur.getDate());
                cur.setDate(cur.getDate() + 1);
            }
        });
        return Array.from(days);
    }, [schedules, viewMonth, viewYear]);

    const upcomingSchedules = useMemo(() => {
        return schedules
            .filter((s) => {
                const st = resolveStatus(s);
                return st === 'upcoming' || st === 'inprogress';
            })
            .sort((a, b) => {
                const da = a.thoiGianThucHien ? new Date(a.thoiGianThucHien).getTime() : Infinity;
                const db = b.thoiGianThucHien ? new Date(b.thoiGianThucHien).getTime() : Infinity;
                return da - db;
            })
            .slice(0, 5);
    }, [schedules]);

    const actionItems = useMemo(() => {
        const now = Date.now();
        const items: Array<{ schedule: ScheduleGanttItem; type: 'overdue' | 'duesoon'; days: number }> = [];

        schedules.forEach((s) => {
            const st = resolveStatus(s);
            if (st === 'overdue') {
                const end = s.thoiGianKetThuc ? new Date(s.thoiGianKetThuc).getTime() : now;
                const days = Math.round((now - end) / (1000 * 60 * 60 * 24));
                items.push({ schedule: s, type: 'overdue', days });
            } else if (st === 'inprogress') {
                const end = s.thoiGianKetThuc ? new Date(s.thoiGianKetThuc).getTime() : null;
                if (end) {
                    const days = Math.round((end - now) / (1000 * 60 * 60 * 24));
                    if (days >= 0 && days <= 7) items.push({ schedule: s, type: 'duesoon', days });
                }
            }
        });

        return items.sort((a, b) => a.days - b.days).slice(0, 6);
    }, [schedules]);

    const resolvedHeight = typeof panelHeight === 'number'
        ? `${panelHeight}px`
        : (panelHeight || '100%');

    return (
        <Stack spacing={1.5} sx={{ height: resolvedHeight, minHeight: 0 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, flex: 1, minHeight: 0 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, height: '100%', overflow: 'auto' }}>
                    <MiniCalendar
                        year={viewYear}
                        month={viewMonth}
                        eventDays={eventDays}
                        onPrev={() => navigateMonth(-1)}
                        onNext={() => navigateMonth(1)}
                    />
                    <Box mt={1.5} pt={1.5} sx={{ borderTop: '0.5px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Sap dien ra
                        </Typography>
                        {upcomingSchedules.length === 0 ? (
                            <Typography variant="caption" color="text.disabled">Khong co ke hoach sap toi</Typography>
                        ) : (
                            upcomingSchedules.map((s) => (
                                <Box
                                    key={s.id}
                                    onClick={() => onScheduleClick?.(s)}
                                    sx={{ py: 0.75, borderBottom: '0.5px solid', borderColor: 'divider', cursor: 'pointer', '&:last-child': { borderBottom: 'none' } }}
                                >
                                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>{s.tenLich}</Typography>
                                    <Typography variant="caption" color="text.secondary">{s.soTrangBi} trang bi</Typography>
                                </Box>
                            ))
                        )}
                    </Box>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 2, flex: 1, minHeight: 0 }}>
                <CardHeader
                    title={(
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <WarningAmberIcon sx={{ fontSize: 15, color: '#A32D2D' }} />
                            <Typography variant="caption" fontWeight={700} color="error.main">Can xu ly</Typography>
                        </Stack>
                    )}
                    sx={{ p: 1.5, pb: 0.5 }}
                />
                <CardContent sx={{ p: 1.5, pt: 0.75, '&:last-child': { pb: 1.5 }, height: '100%', overflow: 'auto' }}>
                    {actionItems.length === 0 ? (
                        <Stack alignItems="center" spacing={0.5} py={1}>
                            <ScheduleIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.disabled">Khong co muc can xu ly</Typography>
                        </Stack>
                    ) : (
                        actionItems.map(({ schedule, type, days }) => (
                            <Box key={schedule.id} onClick={() => onScheduleClick?.(schedule)} sx={{ py: 0.75, borderBottom: '0.5px solid', borderColor: 'divider', cursor: 'pointer', '&:last-child': { borderBottom: 'none' } }}>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <Chip
                                        label={type === 'overdue' ? 'Qua han' : 'Sap han'}
                                        size="small"
                                        sx={{
                                            fontSize: '0.6rem',
                                            height: 18,
                                            fontWeight: 700,
                                            bgcolor: type === 'overdue' ? '#FCEBEB' : '#FAEEDA',
                                            color: type === 'overdue' ? '#A32D2D' : '#854F0B',
                                            border: `0.5px solid ${type === 'overdue' ? '#F09595' : '#EF9F27'}`,
                                            mt: 0.25,
                                        }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', fontSize: '0.78rem' }}>{schedule.tenLich}</Typography>
                                        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: type === 'overdue' ? '#A32D2D' : '#854F0B' }}>
                                            {type === 'overdue' ? `Qua han ${days} ngay` : `Con ${days} ngay`}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        ))
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
};

export default GanttChartSidebar;
