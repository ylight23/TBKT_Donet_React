import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import thamSoApi from '../../../apis/thamSoApi';

type ColumnDef = { label: string; key: string; align?: string };
type RowDef = Record<string, string | undefined>;

type Props = {
  title?: string;
  sourceKey?: string;
  columns?: ColumnDef[];
  rows?: RowDef[];
  striped?: string;
  bordered?: string;
  dense?: string;
  pageSize?: string;
};

export const DataTableBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề bảng' },
    sourceKey: { type: 'text' as const, label: 'Source key (datasource)' },
    striped: {
      type: 'select' as const,
      label: 'Dòng xen màu (striped)',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
    bordered: {
      type: 'select' as const,
      label: 'Viền ô',
      options: [
        { label: 'Không', value: 'no' },
        { label: 'Có', value: 'yes' },
      ],
    },
    dense: {
      type: 'select' as const,
      label: 'Compact (dense)',
      options: [
        { label: 'Không', value: 'no' },
        { label: 'Có', value: 'yes' },
      ],
    },
    pageSize: {
      type: 'select' as const,
      label: 'Số dòng mỗi trang',
      options: [
        { label: 'Tất cả', value: '0' },
        { label: '5', value: '5' },
        { label: '10', value: '10' },
        { label: '20', value: '20' },
        { label: '50', value: '50' },
      ],
    },
    columns: {
      type: 'array' as const,
      label: 'Cột',
      arrayFields: {
        label: { type: 'text' as const, label: 'Tiêu đề cột' },
        key:   { type: 'text' as const, label: 'Key (c1 - c5)' },
        align: {
          type: 'select' as const,
          label: 'Căn',
          options: [
            { label: 'Trái', value: 'left' },
            { label: 'Giữa', value: 'center' },
            { label: 'Phải', value: 'right' },
          ],
        },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Cột',
    },
    rows: {
      type: 'array' as const,
      label: 'Dòng dữ liệu',
      arrayFields: {
        c1: { type: 'text' as const, label: 'Cột 1' },
        c2: { type: 'text' as const, label: 'Cột 2' },
        c3: { type: 'text' as const, label: 'Cột 3' },
        c4: { type: 'text' as const, label: 'Cột 4' },
        c5: { type: 'text' as const, label: 'Cột 5' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.c1 as string) || 'Dòng',
    },
  },
  render: ({ title, sourceKey, columns, rows, striped, bordered, dense, pageSize }: Props) => {
    const cols = columns && columns.length > 0 ? columns : [
      { label: 'Cột 1', key: 'c1' },
      { label: 'Cột 2', key: 'c2' },
      { label: 'Cột 3', key: 'c3' },
    ];
    const cellBorder = bordered === 'yes' ? '1px solid' : undefined;
    const cellBorderColor = 'divider';

    // Runtime: fetch data từ API nếu có sourceKey
    const [dynamicRows, setDynamicRows] = useState<RowDef[]>([]);
    const [loadingRows, setLoadingRows] = useState(false);
    const [loadError, setLoadError] = useState('');

    // Dùng ref để tránh stale closure trong useEffect
    const colsRef = useRef(cols);
    colsRef.current = cols;

    useEffect(() => {
      if (!sourceKey) return;
      let cancelled = false;
      setLoadingRows(true);
      setLoadError('');
      thamSoApi.getDynamicMenuRows(sourceKey)
        .then((data) => {
          if (cancelled) return;
          const currentCols = colsRef.current;
          setDynamicRows(data.map((r) => {
            const rowFields = Object.keys(r);
            const mapped: RowDef = {};
            for (let i = 0; i < currentCols.length; i++) {
              const col = currentCols[i];
              let val: unknown;
              if (col.key) {
                // Thử exact match trước, nếu không có thì case-insensitive
                val = r[col.key];
                if (val === undefined) {
                  const keyLower = col.key.toLowerCase();
                  const matchKey = rowFields.find((k) => k.toLowerCase() === keyLower);
                  if (matchKey) val = r[matchKey];
                }
              } else if (rowFields[i] !== undefined) {
                // Không có key → dùng vị trí thứ i trong API row
                val = r[rowFields[i]];
              }
              const storeKey = col.key || `__pos_${i}`;
              mapped[storeKey] = val == null ? '' : String(
                typeof val === 'object' && val !== null && 'value' in val
                  ? (val as { value: unknown }).value ?? ''
                  : val
              );
            }
            return mapped;
          }));
        })
        .catch((err) => { if (!cancelled) setLoadError(String(err)); })
        .finally(() => { if (!cancelled) setLoadingRows(false); });
      return () => { cancelled = true; };
    }, [sourceKey]);

    // Nếu có sourceKey → dùng dynamic data, không thì dùng static rows từ Puck editor
    const allRows = sourceKey ? dynamicRows : (rows || []);

    // Pagination
    const pageSizeNum = parseInt(pageSize || '10', 10);
    const rowsPerPage = pageSizeNum > 0 ? pageSizeNum : 0;
    const [page, setPage] = useState(1);
    const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage || 10);
    const effectiveRpp = rowsPerPage > 0 ? rowsPerPage : rowsPerPageState;
    const totalPages = Math.ceil(allRows.length / effectiveRpp);
    const displayRows = rowsPerPage === 0 && pageSizeNum === 0
      ? allRows
      : allRows.slice((page - 1) * effectiveRpp, page * effectiveRpp);

    return (
      <Box sx={{ p: '1px' }}>
        {title && (
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
        )}
        {loadError && <Alert severity="error" sx={{ mb: 1 }}>{loadError}</Alert>}
        {loadingRows ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size={dense === 'yes' ? 'small' : 'medium'}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  {cols.map((col, ci) => (
                    <TableCell
                      key={ci}
                      align={(col.align as 'left' | 'center' | 'right') || 'left'}
                      sx={{ fontWeight: 700, border: cellBorder, borderColor: cellBorderColor }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={cols.length} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                      {sourceKey ? 'Không có dữ liệu từ datasource' : 'Chưa có dữ liệu'}
                    </TableCell>
                  </TableRow>
                )}
                {displayRows.map((row, ri) => (
                  <TableRow
                    key={ri}
                    sx={{ bgcolor: striped === 'yes' && ri % 2 === 1 ? 'grey.50' : 'inherit' }}
                  >
                    {cols.map((col, ci) => (
                      <TableCell
                        key={ci}
                        align={(col.align as 'left' | 'center' | 'right') || 'left'}
                        sx={{ border: cellBorder, borderColor: cellBorderColor }}
                      >
                        {row[col.key || `__pos_${ci}`] || '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!loadingRows && allRows.length > 0 && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" color="text.secondary">Dòng/trang:</Typography>
              <Select
                size="small"
                value={rowsPerPage > 0 ? rowsPerPage : rowsPerPageState}
                onChange={(e) => {
                  setRowsPerPageState(Number(e.target.value));
                  setPage(1);
                }}
                sx={{ fontSize: 13, '& .MuiSelect-select': { py: 0.4, px: 1 } }}
              >
                {[5, 10, 20, 50].map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">
                {allRows.length} bản ghi
              </Typography>
            </Stack>
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                color="primary"
                showFirstButton
                showLastButton
              />
            )}
          </Stack>
        )}
      </Box>
    );
  },
};
