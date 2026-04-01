import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import type { GridColDef, GridRenderCellParams, GridValidRowModel } from '@mui/x-data-grid';

export type DataGridActionKey = 'view' | 'edit' | 'delete' | 'print' | 'export';

export interface DataGridRowAction<R extends GridValidRowModel = GridValidRowModel> {
    key: DataGridActionKey;
    label?: string;
    onClick: (row: R) => void | Promise<void>;
    disabled?: boolean | ((row: R) => boolean);
    hidden?: boolean | ((row: R) => boolean);
}

export interface DataGridActionColumnOptions<R extends GridValidRowModel = GridValidRowModel> {
    field?: string;
    headerName?: string;
    width?: number;
    actions: DataGridRowAction<R>[];
}

const getDefaultIcon = (key: DataGridActionKey): React.ReactNode => {
    switch (key) {
        case 'view':
            return <VisibilityIcon fontSize="small" />;
        case 'edit':
            return <EditIcon fontSize="small" />;
        case 'delete':
            return <DeleteOutlineIcon fontSize="small" />;
        case 'print':
            return <PrintIcon fontSize="small" />;
        case 'export':
            return <DownloadIcon fontSize="small" />;
        default:
            return null;
    }
};

const getDefaultLabel = (key: DataGridActionKey): string => {
    switch (key) {
        case 'view':
            return 'Xem';
        case 'edit':
            return 'Sua';
        case 'delete':
            return 'Xoa';
        case 'print':
            return 'In';
        case 'export':
            return 'Xuat';
        default:
            return key;
    }
};

export const createDataGridActionColumn = <R extends GridValidRowModel = GridValidRowModel>(
    options: DataGridActionColumnOptions<R>,
): GridColDef<R> => {
    const {
        field = 'actions',
        headerName = 'Thao tac',
        width = 210,
        actions,
    } = options;

    return {
        field,
        headerName,
        width,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<R>) => {
            const row = params.row;
            const visibleActions = actions.filter((action) => {
                if (typeof action.hidden === 'function') {
                    return !action.hidden(row);
                }
                return !action.hidden;
            });

            return (
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        {visibleActions.map((action) => {
                            const disabled = typeof action.disabled === 'function'
                                ? action.disabled(row)
                                : Boolean(action.disabled);
                            return (
                                <Tooltip key={action.key} title={action.label || getDefaultLabel(action.key)} arrow>
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={disabled}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void action.onClick(row);
                                            }}
                                        >
                                            {getDefaultIcon(action.key)}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            );
                        })}
                    </Stack>
                </Box>
            );
        },
    };
};

export default createDataGridActionColumn;
