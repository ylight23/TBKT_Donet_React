import React from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import LazyDataGrid from '../../../components/LazyDataGrid';

type Props = {
  gridCount: number;
  columnLabels: string[];
  mappedRows: Record<string, unknown>[];
  gridColumns: GridColDef[];
  loadingRows: boolean;
  onView: (row: Record<string, unknown>) => void;
  onEdit: (row: Record<string, unknown>) => Promise<void>;
  onDelete: (row: Record<string, unknown>) => Promise<void>;
  onPrint: (row: Record<string, unknown>) => void;
  onExport: (row: Record<string, unknown>) => void;
};

const LegacyMenuGrid: React.FC<Props> = ({
  gridCount,
  columnLabels,
  mappedRows,
  gridColumns,
  loadingRows,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onExport,
}) => (
  <Box
    sx={{
      display: 'grid',
      gap: 2,
      gridTemplateColumns: { xs: '1fr', xl: gridCount > 1 ? '1fr 1fr' : '1fr' },
    }}
  >
    {Array.from({ length: gridCount }).map((_, index) => (
      <Box
        key={`grid-${index + 1}`}
        sx={{ px: 0.5, py: 1, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          DataGrid #{index + 1}
        </Typography>

        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
          {columnLabels.map((label) => (
            <Chip key={`${index + 1}-${label}`} size="small" label={label} variant="outlined" />
          ))}
        </Stack>

        <Box sx={{ height: 320 }}>
          <LazyDataGrid
            rows={mappedRows}
            columns={gridColumns}
            rowActions={{
              view: (row) => onView(row as Record<string, unknown>),
              edit: async (row) => { await onEdit(row as Record<string, unknown>); },
              delete: async (row) => { await onDelete(row as Record<string, unknown>); },
              print: (row) => onPrint(row as Record<string, unknown>),
              export: (row) => onExport(row as Record<string, unknown>),
            }}
            loading={loadingRows}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 20]}
            initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
            fallbackRows={5}
            fallbackCols={Math.max(columnLabels.length, 4)}
          />
        </Box>

        {index < gridCount - 1 && <Divider sx={{ mt: 2 }} />}
      </Box>
    ))}
  </Box>
);

export default LegacyMenuGrid;

