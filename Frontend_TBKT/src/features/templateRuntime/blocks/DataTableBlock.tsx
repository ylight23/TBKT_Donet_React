import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import thamSoApi from '../../../apis/thamSoApi';
import { useTemplateRuntimeContext } from '../runtimeContext';
import { useMyPermissions } from '../../../hooks/useMyPermissions';
import { GridSkeleton } from '../../../components/Skeletons';

type ColumnDef = { label: string; key: string; align?: string };
type RowDef = Record<string, unknown>;
type RequestedColumnDef = ColumnDef & { sourceIndex: number };
type RowActionKey = 'view' | 'edit' | 'delete' | 'print' | 'export';
const CN_FIELD_CANDIDATES = [
  'IdChuyenNganhKT',
  'IDChuyenNganhKT',
  'id_chuyen_nganh_kt',
  'IdChuyenNganh',
  'IDChuyenNganh',
  'id_chuyen_nganh',
];

const resolveRowCnId = (row: RowDef): string => {
  for (const key of CN_FIELD_CANDIDATES) {
    const value = row[key];
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  const raw = row.__raw;
  if (raw && typeof raw === 'object') {
    return resolveRowCnId(raw as RowDef);
  }
  return '';
};

const mapRowActionToPermissionAction = (action: RowActionKey): 'view' | 'edit' | 'delete' | 'print' | 'download' =>
  action === 'export' ? 'download' : action;

const isEnabled = (value: unknown, fallback = false): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['yes', 'true', '1', 'on', 'bat', 'co', 'có', 'enable', 'enabled'].includes(normalized);
};

type Props = {
  title?: string;
  sourceKey?: string;
  visibleColumns?: Array<{ key?: string }>;
  columns?: ColumnDef[]; // legacy templates only
  rows?: RowDef[]; // legacy templates only
  striped?: string;
  bordered?: string;
  dense?: string;
  pageSize?: string;
  enableView?: string;
  enableEdit?: string;
  enableDelete?: string;
  enablePrint?: string;
  enableExport?: string;
};

export const DataTableBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tieu de bang' },
    striped: {
      type: 'select' as const,
      label: 'Dong xen mau',
      options: [
        { label: 'Co', value: 'yes' },
        { label: 'Khong', value: 'no' },
      ],
    },
    bordered: {
      type: 'select' as const,
      label: 'Vien o',
      options: [
        { label: 'Khong', value: 'no' },
        { label: 'Co', value: 'yes' },
      ],
    },
    dense: {
      type: 'select' as const,
      label: 'Compact',
      options: [
        { label: 'Khong', value: 'no' },
        { label: 'Co', value: 'yes' },
      ],
    },
    pageSize: {
      type: 'select' as const,
      label: 'So dong moi trang',
      options: [
        { label: 'Tat ca', value: '0' },
        { label: '5', value: '5' },
        { label: '10', value: '10' },
        { label: '20', value: '20' },
        { label: '50', value: '50' },
      ],
    },
    enableView: {
      type: 'select' as const,
      label: 'Thao tac: Xem',
      options: [
        { label: 'Bat', value: 'yes' },
        { label: 'Tat', value: 'no' },
      ],
    },
    enableEdit: {
      type: 'select' as const,
      label: 'Thao tac: Sua',
      options: [
        { label: 'Bat', value: 'yes' },
        { label: 'Tat', value: 'no' },
      ],
    },
    enableDelete: {
      type: 'select' as const,
      label: 'Thao tac: Xoa',
      options: [
        { label: 'Bat', value: 'yes' },
        { label: 'Tat', value: 'no' },
      ],
    },
    enablePrint: {
      type: 'select' as const,
      label: 'Thao tac: In',
      options: [
        { label: 'Bat', value: 'yes' },
        { label: 'Tat', value: 'no' },
      ],
    },
    enableExport: {
      type: 'select' as const,
      label: 'Thao tac: Xuat',
      options: [
        { label: 'Bat', value: 'yes' },
        { label: 'Tat', value: 'no' },
      ],
    },
    visibleColumns: {
      type: 'array' as const,
      label: 'Cot hien thi (chon nhieu)',
      arrayFields: {
        key: { type: 'text' as const, label: 'Field key tu datasource' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.key as string) || 'Cot',
    },
  },
  defaultProps: {
    striped: 'yes',
    bordered: 'no',
    dense: 'no',
    pageSize: '10',
    enableView: 'yes',
    enableEdit: 'no',
    enableDelete: 'no',
    enablePrint: 'no',
    enableExport: 'no',
  },
  render: ({
    title,
    sourceKey,
    visibleColumns,
    columns,
    rows,
    striped,
    bordered,
    dense,
    pageSize,
    enableView,
    enableEdit,
    enableDelete,
    enablePrint,
    enableExport,
  }: Props) => {
    const { defaultSourceKey, defaultColumnLabels, defaultColumns, isRuntime, permissionCode } = useTemplateRuntimeContext();
    const { canFunc, canCnAction, loaded: permissionLoaded } = useMyPermissions();
    const effectiveSourceKey = (sourceKey || '').trim() || (defaultSourceKey || '').trim();

    const staticCols = columns && columns.length > 0
      ? columns
      : [
        { label: 'Cot 1', key: 'c1' },
        { label: 'Cot 2', key: 'c2' },
        { label: 'Cot 3', key: 'c3' },
      ];

    const [dynamicCols, setDynamicCols] = useState<ColumnDef[]>([]);
    const [dynamicRows, setDynamicRows] = useState<RowDef[]>([]);
    const [loadingRows, setLoadingRows] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [refreshTick, setRefreshTick] = useState(0);

    const requestedColumns = Array.isArray(visibleColumns) ? visibleColumns : [];
    const requestedColumnDefs: RequestedColumnDef[] = requestedColumns.map((item, index) => {
      const key = (item?.key || '').trim();
      if (!key) {
        return {
          key: `__template_col_${index + 1}`,
          label: `Cot ${index + 1}`,
          sourceIndex: index,
        };
      }
      const overrideLabel =
        defaultColumnLabels?.[key] ??
        defaultColumnLabels?.[key.toLowerCase()] ??
        key;
      return { key, label: overrideLabel, sourceIndex: index };
    });

    const cols = (() => {
      // Editor preview: khong co datasource, van hien thi dung so cot da cau hinh
      if (!effectiveSourceKey) {
        return requestedColumnDefs.length > 0 ? requestedColumnDefs : staticCols;
      }

      if (requestedColumnDefs.length === 0) {
        const withOverride = dynamicCols.map((c) => {
          const overrideLabel =
            defaultColumnLabels?.[c.key] ??
            defaultColumnLabels?.[c.key.toLowerCase()];
          return { ...c, label: overrideLabel || c.label || c.key };
        });
        if (withOverride.length > 0) return withOverride;
        if (Array.isArray(defaultColumns) && defaultColumns.length > 0) {
          return defaultColumns
            .filter((c) => !!c?.key)
            .map((c) => ({
              key: c.key,
              label: (
                defaultColumnLabels?.[c.key] ??
                defaultColumnLabels?.[c.key.toLowerCase()] ??
                c.name ??
                c.key
              ),
              align: 'left',
            }));
        }
        return dynamicCols;
      }

      const byLowerKey = new Map(dynamicCols.map((c) => [c.key.toLowerCase(), c]));
      return requestedColumnDefs.map((requestedCol, idx) => {
        const matched = byLowerKey.get(requestedCol.key.toLowerCase());
        if (!matched) {
          const fallbackByOrder = Array.isArray(defaultColumns) ? defaultColumns[idx] : undefined;
          if (fallbackByOrder?.key) {
            const fallbackLabel =
              defaultColumnLabels?.[fallbackByOrder.key] ??
              defaultColumnLabels?.[fallbackByOrder.key.toLowerCase()] ??
              fallbackByOrder.name ??
              fallbackByOrder.key;
            return {
              key: fallbackByOrder.key,
              label: fallbackLabel,
              align: 'left',
            };
          }
          return requestedCol;
        }
        const overrideLabel =
          defaultColumnLabels?.[matched.key] ??
          defaultColumnLabels?.[matched.key.toLowerCase()];
        return {
          ...matched,
          label: overrideLabel || matched.label || requestedCol.label,
        };
      });
    })();
    const cellBorder = bordered === 'yes' ? '1px solid' : undefined;
    const cellBorderColor = 'divider';

    useEffect(() => {
      if (!effectiveSourceKey) {
        setDynamicCols([]);
        setDynamicRows([]);
        return;
      }

      let cancelled = false;
      setLoadingRows(true);
      setLoadError('');

      Promise.all([
        thamSoApi.getDynamicMenuRows(effectiveSourceKey),
        thamSoApi.getListDynamicMenuDataSources(),
      ])
        .then(([data, dataSources]) => {
          if (cancelled) return;

          const ds = dataSources.find((item) => item.sourceKey === effectiveSourceKey);
          const configuredCols: ColumnDef[] = (ds?.fields ?? [])
            .filter((f) => !!f.key)
            .map((f) => ({
              key: f.key,
              label: f.label || f.key,
            }));

          const inferredCols: ColumnDef[] =
            configuredCols.length > 0
              ? configuredCols
              : (data[0] ? Object.keys(data[0]).map((key) => ({ key, label: key })) : []);

          setDynamicCols(inferredCols);

          const mappedRows: RowDef[] = data.map((r) => {
            const rowFields = Object.keys(r);
            const mapped: RowDef = { __raw: r };
            for (let i = 0; i < inferredCols.length; i++) {
              const col = inferredCols[i];
              let val: unknown = r[col.key];
              if (val === undefined) {
                const keyLower = col.key.toLowerCase();
                const matchKey = rowFields.find((k) => k.toLowerCase() === keyLower);
                if (matchKey) val = r[matchKey];
              }

              mapped[col.key] = val == null
                ? ''
                : String(
                  typeof val === 'object' && val !== null && 'value' in val
                    ? (val as { value: unknown }).value ?? ''
                    : val,
                );
            }
            return mapped;
          });

          setDynamicRows(mappedRows);
        })
        .catch((err) => {
          if (!cancelled) setLoadError(String(err));
        })
        .finally(() => {
          if (!cancelled) setLoadingRows(false);
        });

      return () => {
        cancelled = true;
      };
    }, [effectiveSourceKey, refreshTick]);

    useEffect(() => {
      const onRefresh = (evt: Event) => {
        const event = evt as CustomEvent<{ sourceKey?: string | null }>;
        const sourceKey = String(event.detail?.sourceKey || '').trim();
        if (!sourceKey || sourceKey === effectiveSourceKey) {
          setRefreshTick((prev) => prev + 1);
        }
      };
      window.addEventListener('template:datasource:refresh', onRefresh as EventListener);
      return () => {
        window.removeEventListener('template:datasource:refresh', onRefresh as EventListener);
      };
    }, [effectiveSourceKey]);

    const allRows = effectiveSourceKey ? dynamicRows : (rows || []);
    const resolvedEnableView = isEnabled(enableView, true);
    const resolvedEnableEdit = isEnabled(enableEdit, false);
    const resolvedEnableDelete = isEnabled(enableDelete, false);
    const resolvedEnablePrint = isEnabled(enablePrint, false);
    const resolvedEnableExport = isEnabled(enableExport, false);

    const rowActions = ([
      resolvedEnableView ? 'view' : null,
      resolvedEnableEdit ? 'edit' : null,
      resolvedEnableDelete ? 'delete' : null,
      resolvedEnablePrint ? 'print' : null,
      resolvedEnableExport ? 'export' : null,
    ].filter(Boolean) as RowActionKey[]);
    const hasActionColumn = rowActions.length > 0;

    const canUseRowAction = (action: RowActionKey, row: RowDef): boolean => {
      if (!isRuntime || !permissionLoaded) return true;
      const cnId = resolveRowCnId(row);
      const permissionAction = mapRowActionToPermissionAction(action);
      const allowedByFunc = permissionCode ? canFunc(permissionCode, permissionAction) : true;
      const allowedByCn = canCnAction(permissionAction, cnId);
      return allowedByFunc && allowedByCn;
    };

    const fireRowAction = (action: RowActionKey, row: RowDef): void => {
      if (!canUseRowAction(action, row)) return;
      const raw = (row.__raw as Record<string, unknown>) || row;
      if (isRuntime) {
        window.dispatchEvent(
          new CustomEvent('template:datatable:row-action', {
            detail: { action, row: raw, sourceKey: effectiveSourceKey || null },
          }),
        );
      } else {
        console.log('[Template][DataTable] row action preview', { action, row: raw, sourceKey: effectiveSourceKey || null });
      }
    };

    const renderActionIcon = (action: RowActionKey, row: RowDef) => {
      const allowed = canUseRowAction(action, row);
      const icon = action === 'view'
        ? <VisibilityIcon fontSize="small" />
        : action === 'edit'
          ? <EditIcon fontSize="small" />
          : action === 'delete'
            ? <DeleteOutlineIcon fontSize="small" />
            : action === 'print'
              ? <PrintIcon fontSize="small" />
              : <DownloadIcon fontSize="small" />;
      const label = action === 'view'
        ? 'Xem'
        : action === 'edit'
          ? 'Sua'
          : action === 'delete'
            ? 'Xoa'
            : action === 'print'
              ? 'In'
              : 'Xuat';
      return (
        <Tooltip key={action} title={label} arrow>
          <span>
            <IconButton size="small" onClick={() => fireRowAction(action, row)} disabled={!allowed}>
              {icon}
            </IconButton>
          </span>
        </Tooltip>
      );
    };

    const pageSizeNum = parseInt(pageSize || '10', 10);
    const rowsPerPage = pageSizeNum > 0 ? pageSizeNum : 0;
    const [page, setPage] = useState(1);
    const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage || 10);
    const effectiveRpp = rowsPerPage > 0 ? rowsPerPage : rowsPerPageState;
    const totalPages = effectiveRpp > 0 ? Math.ceil(allRows.length / effectiveRpp) : 1;
    const displayRows = rowsPerPage === 0 && pageSizeNum === 0
      ? allRows
      : allRows.slice((page - 1) * effectiveRpp, page * effectiveRpp);

    return (
      <Box sx={{ p: '1px' }}>
        {title && (
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            {title}
          </Typography>
        )}

        {loadError && <Alert severity="error" sx={{ mb: 1 }}>{loadError}</Alert>}

        {loadingRows ? (
          <GridSkeleton rows={6} cols={Math.max(cols.length + (hasActionColumn ? 1 : 0), 4)} />
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
                  {hasActionColumn && (
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 700, border: cellBorder, borderColor: cellBorderColor, width: 180 }}
                    >
                      Thao tac
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(cols.length + (hasActionColumn ? 1 : 0), 1)}
                      align="center"
                      sx={{ color: 'text.secondary', py: 3 }}
                    >
                      {effectiveSourceKey ? 'Khong co du lieu tu datasource' : 'Chua co du lieu'}
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
                        {String(row[col.key] ?? '-')}
                      </TableCell>
                    ))}
                    {hasActionColumn && (
                      <TableCell
                        align="center"
                        sx={{ border: cellBorder, borderColor: cellBorderColor, whiteSpace: 'nowrap' }}
                      >
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          {rowActions.map((action) => renderActionIcon(action, row))}
                        </Stack>
                      </TableCell>
                    )}
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
              <Typography variant="caption" color="text.secondary">
                Dong/trang:
              </Typography>
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
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">
                {allRows.length} ban ghi
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
