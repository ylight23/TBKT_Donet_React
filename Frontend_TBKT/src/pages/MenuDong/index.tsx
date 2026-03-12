import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useLocation, useParams } from 'react-router-dom';
import { useDynamicMenuConfig } from '../../hooks/useDynamicMenuConfig';
import { normalizeColumnKeys, normalizeColumnNames, normalizeDataSource } from '../../configs/dynamicMenuConfig';
import thamSoApi from '../../apis/thamSoApi';

const MAX_COLUMNS = 12;

const getValueByKey = (source: Record<string, unknown>, key: string): string => {
  const value = source[key];
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('value' in (value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>).value;
      return nested == null ? '' : String(nested);
    }
    return '';
  }
  return String(value);
};

const MenuDong: React.FC = () => {
  const { menuId = '' } = useParams();
  const location = useLocation();
  const { items, dataSources } = useDynamicMenuConfig();
  const [backendRows, setBackendRows] = useState<Record<string, unknown>[]>([]);
  const [loadingRows, setLoadingRows] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');

  const menuConfig =
    items.find((item) => item.path === location.pathname) ||
    items.find((item) => item.id === menuId);

  const hasConfig = !!menuConfig;

  const gridCount = hasConfig ? Math.max(1, menuConfig!.gridCount) : 1;
  const dataSource = hasConfig ? normalizeDataSource(menuConfig!.dataSource) : '';
  const columnCount = hasConfig ? Math.min(MAX_COLUMNS, Math.max(1, menuConfig!.columnCount || 4)) : 4;
  const columnNames = hasConfig ? normalizeColumnNames(columnCount, menuConfig!.columnNames) : [];
  const columnKeys = hasConfig
    ? normalizeColumnKeys(dataSource, columnCount, menuConfig!.columnKeys, dataSources)
    : [];

  const gridColumns: GridColDef[] = columnNames.map((columnName, idx) => ({
    field: `col${idx + 1}`,
    headerName: columnName,
    flex: 1,
    minWidth: 140,
  }));
  const visibleColumnLabels = gridColumns.map((col) => col.headerName || col.field);

  const dsConfig = dataSources.find((ds) => ds.sourceKey === dataSource);
  const dsDisplayName = dsConfig?.sourceName || dataSource;

  useEffect(() => {
    if (!hasConfig || !dataSource) return;

    const loadRows = async (): Promise<void> => {
      try {
        setLoadingRows(true);
        setLoadError('');
        const rows = await thamSoApi.getDynamicMenuRows(dataSource);
        setBackendRows(rows);
      } catch (err) {
        setLoadError((err as Error)?.message || 'Không thể tải dữ liệu từ backend');
        setBackendRows([]);
      } finally {
        setLoadingRows(false);
      }
    };

    void loadRows();
  }, [dataSource, hasConfig, dsDisplayName]);

  const mappedRows = useMemo(() => {
    if (!backendRows.length) return [];
    return backendRows.map((source, rowIndex) => {
      const row: Record<string, string> = {
        id: String(source.id ?? `row-${rowIndex + 1}`),
      };
      columnKeys.forEach((key, colIdx) => {
        row[`col${colIdx + 1}`] = getValueByKey(source, key);
      });
      return row;
    });
  }, [backendRows, columnKeys]);

  if (!hasConfig) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          Không tìm thấy cấu hình menu động. Vui lòng kiểm tra lại trong trang cấu hình menu động.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        {menuConfig!.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Menu này đang cấu hình {gridCount} DataGrid, mỗi grid hiển thị {columnCount} cột, source:{' '}
        <strong>{dsDisplayName}</strong>.
      </Typography>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

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
              {visibleColumnLabels.map((label) => (
                <Chip key={`${index + 1}-${label}`} size="small" label={label} variant="outlined" />
              ))}
            </Stack>

            <Box sx={{ height: 320 }}>
              <DataGrid
                rows={mappedRows}
                columns={gridColumns}
                loading={loadingRows}
                disableRowSelectionOnClick
                pageSizeOptions={[5, 10, 20]}
                initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
              />
            </Box>

            {index < gridCount - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default MenuDong;