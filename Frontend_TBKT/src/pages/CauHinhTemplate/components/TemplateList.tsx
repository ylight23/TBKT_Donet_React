import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Snackbar, Stack, Switch, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FolderDeleteIcon from '@mui/icons-material/FolderDelete';
import StorageIcon from '@mui/icons-material/Storage';
import type { GridColDef } from '@mui/x-data-grid';
import type { LocalTemplateLayout } from '../../../apis/thamSoApi';
import thamSoApi from '../../../apis/thamSoApi';
import LazyDataGrid from '../../../components/LazyDataGrid';

interface TemplateListProps {
  items: LocalTemplateLayout[];
  loading: boolean;
  onEdit: (item: LocalTemplateLayout) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (item: LocalTemplateLayout) => Promise<void>;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  items,
  loading,
  onEdit,
  onDelete,
  onTogglePublish,
}) => {
  const [exporting, setExporting] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error'; msg: string }>({
    open: false, severity: 'success', msg: '',
  });

  const handleExportOne = async (item: LocalTemplateLayout, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await thamSoApi.exportTemplateToServer(item);
      setSnack({ open: true, severity: 'success', msg: `Đã ghi public/templates/${item.key}.json` });
    } catch (err: any) {
      setSnack({ open: true, severity: 'error', msg: err.message ?? 'Export thất bại' });
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const result = await thamSoApi.exportAllTemplatesToServer(items);
      if (result.errors.length > 0) {
        setSnack({ open: true, severity: 'error', msg: `Lỗi: ${result.errors.join(', ')}` });
      } else {
        setSnack({ open: true, severity: 'success', msg: `Đã ghi ${result.saved.length} file vào public/templates/` });
      }
    } catch (err: any) {
      setSnack({ open: true, severity: 'error', msg: err.message ?? 'Export thất bại' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteFile = async (item: LocalTemplateLayout, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Xóa file public/templates/${item.key}.json?`)) return;
    try {
      await thamSoApi.deleteTemplateFile(item.key);
      setSnack({ open: true, severity: 'success', msg: `Đã xóa public/templates/${item.key}.json` });
    } catch (err: any) {
      setSnack({ open: true, severity: 'error', msg: err.message ?? 'Xóa file thất bại' });
    }
  };

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'key', headerName: 'Template key', minWidth: 160, flex: 1 },
      { field: 'name', headerName: 'Tên template', minWidth: 200, flex: 1.2 },
      {
        field: 'published',
        headerName: 'Published',
        width: 120,
        sortable: false,
        renderCell: (params) => {
          const item = params.row as LocalTemplateLayout;
          return (
            <Tooltip title={item.published ? 'Click để đặt lại thành Draft' : 'Click để Published — sẽ hiện trong menu'}>
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
        headerName: '📁 File tĩnh',
        width: 105,
        sortable: false,
        renderCell: (params) => (
          <Tooltip title={`Ghi public/templates/${(params.row as LocalTemplateLayout).key}.json vào mã nguồn`}>
            <span>
              <Button size="small" startIcon={<DownloadIcon />}
                onClick={(e) => void handleExportOne(params.row as LocalTemplateLayout, e)}>
                Ghi file
              </Button>
            </span>
          </Tooltip>
        ),
      },
      {
        field: '_deleteFile',
        headerName: '🗑 Xóa file',
        width: 115,
        sortable: false,
        renderCell: (params) => (
          <Tooltip title={`Xóa public/templates/${(params.row as LocalTemplateLayout).key}.json khỏi mã nguồn (không ảnh hưởng DB)`}>
            <span>
              <Button size="small" color="warning" variant="outlined" startIcon={<FolderDeleteIcon />}
                onClick={(e) => void handleDeleteFile(params.row as LocalTemplateLayout, e)}>
                Xóa file
              </Button>
            </span>
          </Tooltip>
        ),
      },
      {
        field: '_deleteDb',
        headerName: '🗄 Xóa DB',
        width: 110,
        sortable: false,
        renderCell: (params) => (
          <Tooltip title={`Xóa template "${(params.row as LocalTemplateLayout).key}" khỏi MongoDB (không ảnh hưởng file tĩnh)`}>
            <span>
              <Button size="small" color="error" variant="outlined" startIcon={<StorageIcon />}
                onClick={(e) => { e.stopPropagation(); onDelete((params.row as LocalTemplateLayout).id); }}>
                Xóa DB
              </Button>
            </span>
          </Tooltip>
        ),
      },
    ],
    [onDelete],
  );

  const publishedCount = items.filter((t) => t.published).length;

  return (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={600}>Danh sách template</Typography>
            <Tooltip title="Backend ghi tất cả published template vào public/templates/ → commit git → production dùng static">
              <span>
                <Button
                  startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                  variant="outlined"
                  size="small"
                  disabled={publishedCount === 0 || exporting}
                  onClick={() => void handleExportAll()}
                >
                  Export tất cả ({publishedCount} published)
                </Button>
              </span>
            </Tooltip>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="caption" color="text.disabled">Chú thích:</Typography>
            {([
              { icon: <DownloadIcon sx={{ fontSize: 13 }} />, label: 'Ghi file', color: 'primary.main', tooltip: 'Xuất file JSON vào public/templates/ trong mã nguồn — hệ thống đọc file này khi render' },
              { icon: <FolderDeleteIcon sx={{ fontSize: 13 }} />, label: 'Xóa file', color: 'warning.main', tooltip: 'Xóa file JSON khỏi mã nguồn (không ảnh hưởng bản ghi MongoDB)' },
              { icon: <StorageIcon sx={{ fontSize: 13 }} />, label: 'Xóa DB', color: 'error.main', tooltip: 'Xóa template khỏi MongoDB (không ảnh hưởng file tĩnh đã ghi)' },
            ] as const).map(({ icon, label, color, tooltip }) => (
              <Tooltip key={label} title={tooltip} arrow placement="top">
                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ cursor: 'help', color }}>
                  {icon}
                  <Typography variant="caption" sx={{ color }}>{label}</Typography>
                </Stack>
              </Tooltip>
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
