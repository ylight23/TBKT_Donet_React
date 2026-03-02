import React from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

// ── Tree Skeleton ──────────────────────────────────────────────────────────────
export const TreeSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
    <Box sx={{ p: 2 }}>
        {[...Array(rows)].map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 1, pl: `${(i % 3) * 16}px` }}>
                <Skeleton variant="circular" width={20} height={20} sx={{ mr: 1, flexShrink: 0 }} />
                <Skeleton variant="text" width={`${85 - (i % 4) * 12}%`} height={28} />
            </Box>
        ))}
    </Box>
);

// ── Grid Skeleton ──────────────────────────────────────────────────────────────
export const GridSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 6 }) => (
    <Box sx={{ p: 2 }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            {[...Array(cols)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={48} sx={{ flex: 1, borderRadius: 1 }} />
            ))}
        </Box>
        {/* Data rows */}
        {[...Array(rows)].map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: '2px' }}>
                {[...Array(cols)].map((_, j) => (
                    <Skeleton key={j} variant="rectangular" height={40} sx={{ flex: 1 }} />
                ))}
            </Box>
        ))}
        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
            <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={80}  height={36} sx={{ borderRadius: 1 }} />
        </Box>
    </Box>
);

// ── Page Skeleton (dùng cho React.lazy fallback) ───────────────────────────────
export const PageSkeleton: React.FC = () => (
    <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
                <Skeleton variant="text" width={200} height={36} />
                <Skeleton variant="text" width={300} height={24} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 1 }} />
            </Box>
        </Box>

        {/* Toolbar */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" width={160} height={40} sx={{ borderRadius: 1 }} />
            ))}
        </Box>

        {/* Content: Tree + Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2px', height: 'calc(100vh - 200px)' }}>
            <TreeSkeleton rows={10} />
            <GridSkeleton rows={8} cols={7} />
        </Box>
    </Box>
);
