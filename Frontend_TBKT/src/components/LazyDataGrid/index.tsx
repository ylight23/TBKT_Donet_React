import React, { Suspense } from 'react';
import Box from '@mui/material/Box';
import { GridSkeleton } from '../Skeletons';
import type { DataGridProps } from '@mui/x-data-grid';
import createDataGridActionColumn, {
    type DataGridActionKey,
    type DataGridRowAction,
} from '../DataGridActionColumn';

type RowActionHandler<R> = (row: R) => void | Promise<void>;

export interface LazyDataGridRowActions<R = any> {
    view?: RowActionHandler<R>;
    edit?: RowActionHandler<R>;
    delete?: RowActionHandler<R>;
    print?: RowActionHandler<R>;
    export?: RowActionHandler<R>;
    hidden?: Partial<Record<DataGridActionKey, boolean | ((row: R) => boolean)>>;
    disabled?: Partial<Record<DataGridActionKey, boolean | ((row: R) => boolean)>>;
    labels?: Partial<Record<DataGridActionKey, string>>;
    width?: number;
    headerName?: string;
    field?: string;
}

export interface LazyDataGridProps extends DataGridProps<any> {
    includeToolbar?: boolean;
    fallbackRows?: number;
    fallbackCols?: number;
    rowActions?: LazyDataGridRowActions<any>;
}

const DataGridLoader = React.lazy(async () => {
    const mod = await import('@mui/x-data-grid');

    const LazyDataGridInner: React.FC<LazyDataGridProps> = ({
        includeToolbar = false,
        slots,
        pageSizeOptions,
        columns,
        rowActions,
        ...props
    }) => {
        const resolvedSlots = includeToolbar
            ? { ...slots, toolbar: mod.GridToolbar }
            : slots;

        const normalizedPageSizeOptions = React.useMemo(() => {
            const raw = (pageSizeOptions ?? []) as Array<number | { value: number; label: string }>;
            if (!raw.length) return raw;

            const hasTwentyFive = raw.some((item) =>
                typeof item === 'number' ? item === 25 : item.value === 25,
            );
            if (hasTwentyFive) return raw;

            return [...raw, 25].sort((a, b) => {
                const av = typeof a === 'number' ? a : a.value;
                const bv = typeof b === 'number' ? b : b.value;
                return av - bv;
            });
        }, [pageSizeOptions]);

        const resolvedColumns = React.useMemo(() => {
            const baseColumns = Array.isArray(columns) ? columns : [];
            if (!rowActions) return baseColumns;

            const actionKeys: DataGridActionKey[] = ['view', 'edit', 'delete', 'print', 'export'];
            const builtActions: DataGridRowAction<any>[] = actionKeys
                .filter((key) => typeof rowActions[key] === 'function')
                .map((key) => ({
                    key,
                    label: rowActions.labels?.[key],
                    onClick: (row) => rowActions[key]!(row),
                    hidden: rowActions.hidden?.[key],
                    disabled: rowActions.disabled?.[key],
                }));

            if (!builtActions.length) return baseColumns;

            const actionField = rowActions.field || 'actions';
            const normalizedBase = baseColumns.filter((col) => col.field !== actionField);
            const actionColumn = createDataGridActionColumn({
                field: actionField,
                headerName: rowActions.headerName,
                width: rowActions.width,
                actions: builtActions,
            });
            return [...normalizedBase, actionColumn];
        }, [columns, rowActions]);

        return (
            <mod.DataGrid
                {...props}
                columns={resolvedColumns}
                pageSizeOptions={normalizedPageSizeOptions}
                slots={resolvedSlots}
            />
        );
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
