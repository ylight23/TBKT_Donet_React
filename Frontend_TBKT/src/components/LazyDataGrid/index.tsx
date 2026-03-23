import React, { Suspense } from 'react';
import Box from '@mui/material/Box';
import { GridSkeleton } from '../Skeletons';
import type { DataGridProps } from '@mui/x-data-grid';

export interface LazyDataGridProps extends DataGridProps<any> {
    includeToolbar?: boolean;
    fallbackRows?: number;
    fallbackCols?: number;
}

const DataGridLoader = React.lazy(async () => {
    const mod = await import('@mui/x-data-grid');

    const LazyDataGridInner: React.FC<LazyDataGridProps> = ({
        includeToolbar = false,
        slots,
        ...props
    }) => {
        const resolvedSlots = includeToolbar
            ? { ...slots, toolbar: mod.GridToolbar }
            : slots;

        return <mod.DataGrid {...props} slots={resolvedSlots} />;
    };

    return { default: LazyDataGridInner };
});

const LazyDataGrid: React.FC<LazyDataGridProps> = ({
    fallbackRows = 8,
    fallbackCols = 6,
    ...props
}) => (
    <Suspense
        fallback={(
            <Box sx={{ width: '100%', height: '100%' }}>
                <GridSkeleton rows={fallbackRows} cols={fallbackCols} />
            </Box>
        )}
    >
        <DataGridLoader {...props} />
    </Suspense>
);

export default LazyDataGrid;
