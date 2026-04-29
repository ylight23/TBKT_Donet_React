import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

interface CountProps {
    rows?: number;
    cols?: number;
}

interface SurfaceProps {
    height?: number | string;
}

const roundedSx = { borderRadius: 2 };
const blockSx = { borderRadius: 2.5 };

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

export const TreeSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
    <Box sx={{ p: 2 }}>
        {range(rows).map((index) => (
            <Stack
                key={index}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1, pl: `${(index % 3) * 16}px` }}
            >
                <Skeleton variant="circular" width={20} height={20} sx={{ flexShrink: 0 }} />
                <Skeleton variant="text" width={`${85 - (index % 4) * 12}%`} height={28} />
            </Stack>
        ))}
    </Box>
);

export const GridSkeleton: React.FC<CountProps> = ({ rows = 6, cols = 6 }) => (
    <Box sx={{ p: 2, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(72px, 1fr))`, gap: 1, mb: 1 }}>
            {range(cols).map((index) => (
                <Skeleton key={index} variant="rectangular" height={44} sx={blockSx} />
            ))}
        </Box>
        {range(rows).map((rowIndex) => (
            <Box
                key={rowIndex}
                sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(72px, 1fr))`, gap: 1, mb: 0.5 }}
            >
                {range(cols).map((colIndex) => (
                    <Skeleton key={colIndex} variant="rectangular" height={38} sx={{ borderRadius: 1.5 }} />
                ))}
            </Box>
        ))}
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
            <Skeleton variant="rectangular" width={120} height={34} sx={blockSx} />
            <Skeleton variant="rectangular" width={80} height={34} sx={blockSx} />
        </Stack>
    </Box>
);

export const MetricCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, gap: 1.5 }}>
        {range(count).map((index) => (
            <Paper
                key={index}
                variant="outlined"
                sx={{ p: 1.75, borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
            >
                <Skeleton variant="rounded" width={42} height={42} sx={roundedSx} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton variant="text" width="34%" height={28} />
                    <Skeleton variant="text" width="62%" height={18} />
                </Box>
            </Paper>
        ))}
    </Box>
);

export const FormSkeleton: React.FC<CountProps> = ({ rows = 8, cols = 2 }) => (
    <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
                <Skeleton variant="text" width={180} height={28} />
                <Skeleton variant="text" width={260} height={18} />
            </Box>
            <Skeleton variant="rectangular" width={120} height={34} sx={blockSx} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 1.5 }}>
            {range(rows).map((index) => (
                <Skeleton
                    key={index}
                    variant="rectangular"
                    height={index % 5 === 4 ? 82 : 48}
                    sx={blockSx}
                />
            ))}
        </Box>
    </Box>
);

export const DialogSkeleton: React.FC<CountProps> = ({ rows = 8, cols = 2 }) => (
    <Box sx={{ width: '100%', minHeight: 420 }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Skeleton variant="text" width={240} height={30} />
            <Skeleton variant="text" width={360} height={18} />
        </Box>
        <FormSkeleton rows={rows} cols={cols} />
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ px: 2.5, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Skeleton variant="rectangular" width={90} height={36} sx={blockSx} />
            <Skeleton variant="rectangular" width={120} height={36} sx={blockSx} />
        </Stack>
    </Box>
);

export const GanttSkeleton: React.FC<SurfaceProps> = ({ height = '100%' }) => (
    <Box sx={{ height, minHeight: 260, display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Skeleton variant="text" width={220} height={26} />
            <Stack direction="row" spacing={1}>
                <Skeleton variant="rectangular" width={58} height={30} sx={blockSx} />
                <Skeleton variant="rectangular" width={58} height={30} sx={blockSx} />
                <Skeleton variant="rectangular" width={58} height={30} sx={blockSx} />
            </Stack>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 1, flex: 1, minHeight: 0 }}>
            <Stack spacing={1}>
                {range(6).map((index) => (
                    <Skeleton key={index} variant="rectangular" height={36} sx={roundedSx} />
                ))}
            </Stack>
            <Box sx={{ position: 'relative', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', p: 1 }}>
                {range(7).map((index) => (
                    <Skeleton
                        key={index}
                        variant="rectangular"
                        height={index % 2 === 0 ? 16 : 22}
                        width={`${42 + (index % 4) * 12}%`}
                        sx={{ ...roundedSx, mt: 1.1, ml: `${(index % 3) * 12}%` }}
                    />
                ))}
            </Box>
        </Box>
    </Box>
);

export const CalendarSkeleton: React.FC = () => (
    <Box sx={{ p: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Skeleton variant="rectangular" width={28} height={28} sx={roundedSx} />
            <Skeleton variant="text" width={110} height={24} />
            <Skeleton variant="rectangular" width={28} height={28} sx={roundedSx} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
            {range(35).map((index) => (
                <Skeleton key={index} variant="rounded" height={28} sx={{ borderRadius: 1.25 }} />
            ))}
        </Box>
    </Box>
);

export const ChartSkeleton: React.FC<SurfaceProps> = ({ height = '100%' }) => (
    <Box sx={{ height, minHeight: 240, display: 'grid', placeItems: 'center', p: 2 }}>
        <Box sx={{ position: 'relative', width: 190, height: 190 }}>
            <Skeleton variant="circular" width={190} height={190} />
            <Skeleton
                variant="circular"
                width={92}
                height={92}
                sx={{ position: 'absolute', left: 49, top: 49, bgcolor: 'background.paper' }}
            />
        </Box>
    </Box>
);

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
    <Stack spacing={1}>
        {range(rows).map((index) => (
            <Paper key={index} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <Skeleton variant="text" width={82} height={18} />
                    <Skeleton variant="rounded" width={72} height={18} sx={{ borderRadius: 1 }} />
                </Stack>
                <Skeleton variant="text" width={`${62 + (index % 3) * 10}%`} height={22} />
                <Skeleton variant="text" width={`${38 + (index % 2) * 14}%`} height={16} />
            </Paper>
        ))}
    </Stack>
);

export const SchedulePageSkeleton: React.FC<SurfaceProps> = ({ height = 'calc(100vh - 160px)' }) => (
    <Box sx={{ height, minHeight: 560, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 1.5, p: 1.5 }}>
        <MetricCardsSkeleton />
        <Box sx={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 260px', gap: 1.5, minHeight: 0 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Skeleton variant="rectangular" height={42} />
                <TreeSkeleton rows={10} />
            </Paper>
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', minWidth: 0 }}>
                <GanttSkeleton />
            </Paper>
            <Stack spacing={1.5} sx={{ minHeight: 0 }}>
                <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                    <CalendarSkeleton />
                </Paper>
                <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 1.5, flex: 1 }}>
                    <Skeleton variant="text" width={110} height={24} />
                    {range(4).map((index) => (
                        <Skeleton key={index} variant="rectangular" height={44} sx={{ ...roundedSx, mt: 1 }} />
                    ))}
                </Paper>
            </Stack>
        </Box>
    </Box>
);

export const PageSkeleton: React.FC = () => (
    <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
                <Skeleton variant="text" width={200} height={36} />
                <Skeleton variant="text" width={300} height={24} />
            </Box>
            <Stack direction="row" spacing={1}>
                <Skeleton variant="rectangular" width={120} height={36} sx={blockSx} />
                <Skeleton variant="rectangular" width={140} height={36} sx={blockSx} />
            </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {range(4).map((index) => (
                <Skeleton key={index} variant="rectangular" width={160} height={40} sx={blockSx} />
            ))}
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1.5, height: 'calc(100vh - 200px)', minHeight: 420 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <TreeSkeleton rows={10} />
            </Paper>
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', minWidth: 0 }}>
                <GridSkeleton rows={8} cols={7} />
            </Paper>
        </Box>
    </Box>
);
