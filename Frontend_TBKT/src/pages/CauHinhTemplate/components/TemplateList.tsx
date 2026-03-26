import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  LinearProgress,
  Snackbar,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FolderDeleteIcon from '@mui/icons-material/FolderDelete';
import StorageIcon from '@mui/icons-material/Storage';
import type { GridColDef } from '@mui/x-data-grid';
import type { LocalTemplateLayout, StreamJobProgress } from '../../../apis/thamSoApi';
import thamSoApi from '../../../apis/thamSoApi';
import LazyDataGrid from '../../../components/LazyDataGrid';
import { buildAuditSummary } from '../../../utils/auditMeta';

interface TemplateListProps {
  items: LocalTemplateLayout[];
  deletedItems: LocalTemplateLayout[];
  loading: boolean;
  onEdit: (item: LocalTemplateLayout) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void | Promise<void>;
  onTogglePublish: (item: LocalTemplateLayout) => Promise<void>;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  items,
  deletedItems,
  loading,
  onEdit,
  onDelete,
  onRestore,
  onTogglePublish,
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<StreamJobProgress | null>(null);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error'; msg: string }>({
    open: false,
    severity: 'success',
    msg: '',
  });

  const handleExportOne = async (item: LocalTemplateLayout, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await thamSoApi.exportTemplateToServer(item);
      setSnack({ open: true, severity: 'success', msg: `Da ghi public/templates/${item.key}.json` });
    } catch (err: any) {
      setSnack({ open: true, severity: 'error', msg: err.message ?? 'Export that bai' });
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    setExportProgress(null);
    setExportLogs([]);
    try {
      const events = await thamSoApi.streamExportTemplateLayouts(items, (event) => {
        setExportProgress(event);
        setExportLogs((prev) => [...prev, ...[event.message, ...event.warnings].filter(Boolean)].slice(-12));
      });
      const finalEvent = events.at(-1);
      if (finalEvent?.warnings?.length) {
        setSnack({ open: true, severity: 'error', msg: finalEvent.message || 'Export co canh bao' });
      } else {
        setSnack({
          open: true,
          severity: 'success',
          msg: finalEvent?.message || `Da ghi ${items.filter((item) => item.published).length} file vao public/templates/`,
        });
      }
    } catch (err: any) {
      setSnack({ open: true, severity: 'error', msg: err.message ?? 'Export that bai' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteFile = async (item: LocalTemplateLayout, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Xoa file public/templates/${item.key}.json?`)) return;
    try {
      await thamSoApi.deleteTemplateFile(item.key);
      setSnack({ open: true, severity: 'success', msg: `Da xoa public/templates/${item.key}.json` });
    } catch (err: any) {
      setSnack({ open: true, severity: 'error', msg: err.message ?? 'Xoa file that bai' });
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    { field: 'key', headerName: 'Template key', minWidth: 160, flex: 1 },
    {
      field: '_audit',
      headerName: 'Cap nhat',
      minWidth: 190,
      flex: 1,
      sortable: false,
      valueGetter: (_, row) => buildAuditSummary((row as LocalTemplateLayout).audit),
    },
    { field: 'name', headerName: 'Ten template', minWidth: 200, flex: 1.2 },
    {
      field: 'published',
      headerName: 'Published',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const item = params.row as LocalTemplateLayout;
        return (
          <Tooltip title={item.published ? 'Click de dat lai thanh Draft' : 'Click de Published'}>
            <Stack direction="row" alignItems="center" spacing={0.5} onClick={(e) => { e.stopPropagation(); void onTogglePublish(item); }}>
              <Switch checked={item.published} size="small" color="success" />
              <Typography variant="caption" color={item.published ? 'success.main' : 'text.secondary'} fontWeight={600}>
                {item.published ? 'Published' : 'Draft'}
              </Typography>
            </Stack>
          </Tooltip>
        );
      },
    },
    {
      field: '_export',
      headerName: 'File tinh',
      width: 105,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={`Ghi public/templates/${(params.row as LocalTemplateLayout).key}.json vao ma nguon`}>
          <span>
            <Button size="small" startIcon={<DownloadIcon />} onClick={(e) => void handleExportOne(params.row as LocalTemplateLayout, e)}>
              Ghi file
            </Button>
          </span>
        </Tooltip>
      ),
    },
    {
      field: '_deleteFile',
      headerName: 'Xoa file',
      width: 115,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={`Xoa public/templates/${(params.row as LocalTemplateLayout).key}.json khoi ma nguon`}>
          <span>
            <Button size="small" color="warning" variant="outlined" startIcon={<FolderDeleteIcon />} onClick={(e) => void handleDeleteFile(params.row as LocalTemplateLayout, e)}>
              Xoa file
            </Button>
          </span>
        </Tooltip>
      ),
    },
    {
      field: '_deleteDb',
      headerName: 'Xoa DB',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={`Xoa template "${(params.row as LocalTemplateLayout).key}" khoi MongoDB`}>
          <span>
            <Button size="small" color="error" variant="outlined" startIcon={<StorageIcon />} onClick={(e) => { e.stopPropagation(); onDelete((params.row as LocalTemplateLayout).id); }}>
              Xoa DB
            </Button>
          </span>
        </Tooltip>
      ),
    },
  ], [onDelete, onTogglePublish]);

  const publishedCount = items.filter((item) => item.published).length;

  return (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={600}>Danh sach template</Typography>
            <Tooltip title="Backend ghi tat ca published template vao public/templates/ de production dung file static">
              <span>
                <Button
                  startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                  variant="outlined"
                  size="small"
                  disabled={publishedCount === 0 || exporting}
                  onClick={() => void handleExportAll()}
                >
                  Export tat ca ({publishedCount} published)
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {exportProgress && (
            <Alert severity={exportProgress.done && !exportProgress.success ? 'warning' : 'info'} sx={{ mb: 1.5 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>Export template dang chay</Typography>
                <Typography variant="body2">{exportProgress.message}</Typography>
                <LinearProgress
                  variant={exportProgress.total > 0 ? 'determinate' : 'indeterminate'}
                  value={exportProgress.total > 0 ? (exportProgress.processed / exportProgress.total) * 100 : 0}
                />
                <Typography variant="caption" color="text.secondary">
                  {`${exportProgress.processed}/${exportProgress.total}`}
                  {exportProgress.currentKey ? ` | Dang xu ly: ${exportProgress.currentKey}` : ''}
                </Typography>
                {exportLogs.length > 0 && (
                  <Box sx={{ maxHeight: 120, overflow: 'auto', bgcolor: 'background.default', borderRadius: 1, p: 1 }}>
                    {exportLogs.map((line, idx) => (
                      <Typography key={`${idx}-${line}`} variant="caption" display="block" color="text.secondary">
                        {line}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Stack>
            </Alert>
          )}

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="caption" color="text.disabled">Chu thich:</Typography>
            {([
              { icon: <DownloadIcon sx={{ fontSize: 13 }} />, label: 'Ghi file', color: 'primary.main' },
              { icon: <FolderDeleteIcon sx={{ fontSize: 13 }} />, label: 'Xoa file', color: 'warning.main' },
              { icon: <StorageIcon sx={{ fontSize: 13 }} />, label: 'Xoa DB', color: 'error.main' },
            ] as const).map(({ icon, label, color }) => (
              <Stack key={label} direction="row" alignItems="center" spacing={0.25} sx={{ color }}>
                {icon}
                <Typography variant="caption" sx={{ color }}>{label}</Typography>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ mb: 1 }} />

          <Box sx={{ height: 400 }}>
            <LazyDataGrid
              rows={items}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              onRowClick={(params) => onEdit(params.row as LocalTemplateLayout)}
              pageSizeOptions={[5, 10, 20]}
              fallbackRows={6}
              fallbackCols={5}
            />
          </Box>
        </CardContent>
      </Card>

      {deletedItems.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h6" fontWeight={600}>Khoi phuc template da xoa</Typography>
                <Typography variant="body2" color="text.secondary">
                  Danh sach nay chi giu cac template da xoa trong phien lam viec hien tai.
                </Typography>
              </Box>
              <Stack spacing={1}>
                {deletedItems.map((item) => (
                  <Stack
                    key={`restore-template-${item.id}`}
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Box>
                      <Typography fontWeight={600}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.key}</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">{buildAuditSummary(item.audit)}</Typography>
                    </Box>
                    <Button variant="outlined" onClick={() => void onRestore(item.id)}>
                      Khoi phuc
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
};
