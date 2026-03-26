import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import thamSoApi, {
  type DataSourceConfig,
  type DataSourceField,
  type StreamJobProgress,
} from '../../apis/thamSoApi';
import { notifyDynamicMenuConfigChanged } from '../../hooks/useDynamicMenuConfig';
import LazyDataGrid from '../../components/LazyDataGrid';
import { buildAuditSummary } from '../../utils/auditMeta';

interface DataSourceFormState {
  id: string;
  sourceKey: string;
  sourceName: string;
  collectionName: string;
  enabled: boolean;
  managementMode: 'proto' | 'manual';
  fields: DataSourceField[];
}

const EMPTY_FIELD: DataSourceField = {
  key: '',
  label: '',
  dataType: 'string',
};

const INITIAL_FORM: DataSourceFormState = {
  id: '',
  sourceKey: '',
  sourceName: '',
  collectionName: '',
  enabled: true,
  managementMode: 'manual',
  fields: [{ ...EMPTY_FIELD, key: 'id', label: 'ID' }],
};

const toSourceKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const CauHinhDataSource: React.FC = () => {
  const [items, setItems] = useState<DataSourceConfig[]>([]);
  const [deletedItems, setDeletedItems] = useState<DataSourceConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<DataSourceFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string>('');
  const [syncingFromProto, setSyncingFromProto] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<StreamJobProgress | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  // discover states
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [browseCollectionName, setBrowseCollectionName] = useState<string>('');
  const [browseFields, setBrowseFields] = useState<DataSourceField[]>([]);
  const [browseInfo, setBrowseInfo] = useState<string>('');
  const [browseError, setBrowseError] = useState<string>('');

  const loadItems = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const result = await thamSoApi.getListDynamicMenuDataSources();
      setItems(result);
    } catch (err) {
      setError((err as Error)?.message || 'Khong the tai danh sach datasource');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const rows = useMemo(() => {
    return items.map((item) => ({
      ...item,
      fieldsText: item.fields.map((field) => `${field.label || field.key} (${field.key})`).join(', '),
      managementModeText: item.managementMode === 'proto' ? 'Proto-managed' : 'Manual',
      auditText: buildAuditSummary(item.audit),
      statusText: item.enabled ? 'Bật' : 'Tắt',
    }));
  }, [items]);

  const columns: GridColDef[] = [
    { field: 'sourceKey', headerName: 'Source key', minWidth: 160, flex: 0.9 },
    { field: 'managementModeText', headerName: 'Mode', minWidth: 140, flex: 0.7 },
    { field: 'sourceName', headerName: 'Tên hiển thị', minWidth: 180, flex: 1 },
    { field: 'collectionName', headerName: 'Collection', minWidth: 160, flex: 0.9 },
    { field: 'statusText', headerName: 'Trạng thái', minWidth: 100, flex: 0.5 },
    { field: 'auditText', headerName: 'Cap nhat', minWidth: 190, flex: 1 },
    { field: 'fieldsText', headerName: 'Fields', minWidth: 260, flex: 1.5 },
  ];

  const resetForm = (): void => {
    setForm(INITIAL_FORM);
    setEditingId('');
  };

  const sanitizeFields = (fields: DataSourceField[]): DataSourceField[] => {
    const result = fields
      .map((field) => ({
        key: field.key.trim(),
        label: (field.label || field.key).trim(),
        dataType: (field.dataType || 'string').trim().toLowerCase(),
      }))
      .filter((field) => field.key.length > 0);

    if (result.length === 0) {
      return [{ key: 'id', label: 'ID', dataType: 'string' }];
    }

    const map = new Map<string, DataSourceField>();
    result.forEach((field) => {
      if (!map.has(field.key)) map.set(field.key, field);
    });

    return Array.from(map.values());
  };

  const handleSubmit = async (): Promise<void> => {
    const sourceKey = toSourceKey(form.sourceKey || form.sourceName);
    const sourceName = form.sourceName.trim() || sourceKey;
    const collectionName = form.collectionName.trim() || sourceName;

    if (!sourceKey) {
      setError('Vui lòng nhập source key hợp lệ.');
      return;
    }

    const duplicate = items.some((item) => item.sourceKey === sourceKey && item.id !== editingId);
    if (duplicate) {
      setError('Source key đã tồn tại, vui lòng chọn key khác.');
      return;
    }

    const payload: DataSourceConfig = {
      id: editingId,
      sourceKey,
      sourceName,
      collectionName,
      enabled: form.enabled,
      managementMode: form.managementMode,
      fields: sanitizeFields(form.fields),
    };

    try {
      setSaving(true);
      setError('');
      await thamSoApi.saveDynamicMenuDataSource(payload, !editingId);
      await loadItems();
      notifyDynamicMenuConfigChanged();
      resetForm();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể lưu datasource');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: DataSourceConfig): void => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      sourceKey: item.sourceKey,
      sourceName: item.sourceName,
      collectionName: item.collectionName,
      enabled: item.enabled,
      managementMode: item.managementMode,
      fields: item.fields.length > 0 ? item.fields : [{ ...EMPTY_FIELD, key: 'id', label: 'ID' }],
    });
  };

  const handleDelete = async (id: string): Promise<void> => {
    const target = items.find((item) => item.id === id);
    const deletedItem = items.find((item) => item.id === id);
    if (target && !window.confirm(`Xóa datasource "${target.sourceName}" sẽ soft delete các menu động đang dùng source này. Tiếp tục?`)) {
      return;
    }
    try {
      setError('');
      await thamSoApi.deleteDynamicMenuDataSource(id);
      if (deletedItem) {
        setDeletedItems((prev) => [deletedItem, ...prev.filter((item) => item.id !== deletedItem.id)]);
      }
      await loadItems();
      notifyDynamicMenuConfigChanged();
      if (editingId === id) resetForm();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể xóa datasource');
    }
  };

  const handleRestore = async (id: string): Promise<void> => {
    try {
      setError('');
      await thamSoApi.restoreDynamicMenuDataSource(id);
      setDeletedItems((prev) => prev.filter((item) => item.id !== id));
      await loadItems();
      notifyDynamicMenuConfigChanged();
    } catch (err) {
      setError((err as Error)?.message || 'Khong the khoi phuc datasource');
    }
  };

  /**
   * Đồng bộ fields từ proto schema vào registry.
   * Backend sử dụng MessageDescriptor (protobuf reflection) để đọc field name / type
   * trực tiếp từ các class C# đã generate, không cần scan MongoDB document.
   */
  const handleSyncFromProto = async (sourceKey = ''): Promise<void> => {
    try {
      setSyncingFromProto(true);
      setError('');
      setSyncLogs([]);
      setSyncProgress(null);
      const events = await thamSoApi.streamSyncDynamicMenuDataSourcesFromProto(sourceKey, (event) => {
        setSyncProgress(event);
        setSyncLogs((prev) => {
          const line = `${event.stage}: ${event.message}${event.currentKey ? ` (${event.currentKey})` : ''}`;
          return [line, ...prev].slice(0, 12);
        });
      });
      const synced = events;
      await loadItems();
      setError('');
      console.log('[CauHinhDataSource] syncFromProto:', synced.length, 'đã đồng bộ');
    } catch (err) {
      setError((err as Error)?.message || 'Đồng bộ từ proto thất bại');
    } finally {
      setSyncingFromProto(false);
    }
  };

  const handleFieldChange = (
    index: number,
    fieldName: keyof DataSourceField,
    value: string,
  ): void => {
    setForm((prev) => {
      const next = [...prev.fields];
      next[index] = { ...next[index], [fieldName]: value };
      return { ...prev, fields: next };
    });
  };

  const handleAddField = (): void => {
    setForm((prev) => ({ ...prev, fields: [...prev.fields, { ...EMPTY_FIELD }] }));
  };

  /**
   * Scan collection và auto-fill fields vào form hiện tại.
   */
  const handleDiscoverIntoForm = async (): Promise<void> => {
    const col = form.collectionName.trim();
    if (!col) { setError('Vui lòng nhập Collection name trước.'); return; }
    try {
      setDiscovering(true);
      setError('');
      const result = await thamSoApi.discoverCollectionFields(col);
      if (result.fields.length > 0) {
        setForm((prev) => ({ ...prev, fields: result.fields }));
      }
      setError(result.message);
    } catch (err) {
      setError((err as Error)?.message || 'Không thể khám phá collection');
    } finally {
      setDiscovering(false);
    }
  };

  /**
   * Scan bất kỳ collection nào và hiển thị cấu trúc ở panel riêng.
   */
  const handleBrowseCollection = async (): Promise<void> => {
    const col = browseCollectionName.trim();
    if (!col) { setBrowseError('Nhập tên collection.'); return; }
    try {
      setBrowseError('');
      setBrowseFields([]);
      setBrowseInfo('Dang scan...');
      const result = await thamSoApi.discoverCollectionFields(col);
      setBrowseFields(result.fields);
      setBrowseInfo(result.message);
    } catch (err) {
      setBrowseError((err as Error)?.message || 'Lỗi khi scan collection');
      setBrowseInfo('');
    }
  };

  const handleRemoveField = (index: number): void => {
    setForm((prev) => {
      const next = prev.fields.filter((_, idx) => idx !== index);
      return { ...prev, fields: next.length > 0 ? next : [{ ...EMPTY_FIELD, key: 'id', label: 'ID' }] };
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Quản trị datasource cho menu động</Typography>
            <Typography variant="body2" color="text.secondary">
              Trang này quản lý registry datasource. Cấu hình menu động sẽ đọc source và field mapping từ đây.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={() => void handleSyncFromProto()}
            disabled={syncingFromProto || loading}
            title="Đọc schema fields từ proto C# (MessageDescriptor) và lưu vào MongoDB. Hoạt động cả khi collection rỗng."
          >
            {syncingFromProto ? 'Đang đồng bộ...' : 'Sync từ Proto'}
          </Button>
        </Stack>

        {error && <Alert severity="warning">{error}</Alert>}
        {(syncingFromProto || syncProgress) && (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1}>
                  <Typography variant="h6" fontWeight={700}>Streaming progress</Typography>
                  {syncProgress && (
                    <Chip
                      size="small"
                      color={syncProgress.done ? (syncProgress.success ? 'success' : 'warning') : 'primary'}
                      label={syncProgress.stage || 'STARTED'}
                    />
                  )}
                </Stack>
                {syncProgress && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {syncProgress.message}
                    </Typography>
                    <LinearProgress
                      variant={syncProgress.total > 0 ? 'determinate' : 'indeterminate'}
                      value={syncProgress.total > 0 ? (syncProgress.processed / syncProgress.total) * 100 : 0}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Chip size="small" label={`Tien trinh ${syncProgress.processed}/${syncProgress.total || '?'}`} />
                      {syncProgress.currentKey && <Chip size="small" variant="outlined" label={syncProgress.currentKey} />}
                    </Stack>
                  </>
                )}
                {syncLogs.length > 0 && (
                  <Box sx={{ bgcolor: 'background.default', borderRadius: 1, p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Log gan nhat</Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {syncLogs.map((line, index) => (
                        <Typography key={`${line}-${index}`} variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {line}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
        <Alert severity="info">
          `Sync từ Proto` là nguồn chuẩn cho datasource entity chính. `Khám phá` collection chỉ dùng cho fallback/manual datasource hoặc dữ liệu legacy.
        </Alert>
        <Alert severity="info">
          `FormConfig` dùng cho form nhập động. `TemplateLayout` quyết định layout/runtime block và không thay thế cho FormConfig.
        </Alert>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              {form.managementMode === 'proto' && (
                <Alert severity="warning">
                  Datasource này đang ở chế độ `proto-managed`. Hãy dùng `Sync từ Proto` để cập nhật schema thay vì chỉnh tay field hoặc collection.
                </Alert>
              )}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Source key"
                  value={form.sourceKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, sourceKey: e.target.value }))}
                  helperText="Ví dụ: employee, office, catalog-vat-tu"
                  fullWidth
                  disabled={form.managementMode === 'proto' && Boolean(editingId)}
                />
                <TextField
                  label="Tên hiển thị"
                  value={form.sourceName}
                  onChange={(e) => setForm((prev) => ({ ...prev, sourceName: e.target.value }))}
                  fullWidth
                  disabled={form.managementMode === 'proto' && Boolean(editingId)}
                />
                <TextField
                  label="Tên collection"
                  value={form.collectionName}
                  onChange={(e) => setForm((prev) => ({ ...prev, collectionName: e.target.value }))}
                  disabled={form.managementMode === 'proto' && Boolean(editingId)}
                  helperText="Tên collection Mongo để tham chiếu"
                  fullWidth
                />
                <Tooltip title="Scan collection để tự động điền fields vào form">
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={discovering ? <CircularProgress size={16} /> : <SearchIcon />}
                      onClick={() => void handleDiscoverIntoForm()}
                      disabled={discovering || !form.collectionName.trim() || (form.managementMode === 'proto' && Boolean(editingId))}
                      sx={{ whiteSpace: 'nowrap', mt: { xs: 0, md: 2 } }}
                    >
                      Khám phá
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={600}>Danh sách field có thể map</Typography>
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddField}>Thêm field</Button>
                  <Switch
                    checked={form.enabled}
                    onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                  />
                </Stack>
              </Stack>

              <Stack spacing={1}>
                {form.fields.map((field, index) => (
                  <Stack key={`field-${index}`} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                    <TextField
                      label="Field key"
                      value={field.key}
                      onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                      sx={{ minWidth: 220 }}
                      disabled={form.managementMode === 'proto' && Boolean(editingId)}
                    />
                    <TextField
                      label="Field label"
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                      sx={{ minWidth: 220 }}
                      disabled={form.managementMode === 'proto' && Boolean(editingId)}
                    />
                    <TextField
                      label="Data type"
                      value={field.dataType}
                      onChange={(e) => handleFieldChange(index, 'dataType', e.target.value)}
                      sx={{ minWidth: 160 }}
                      disabled={form.managementMode === 'proto' && Boolean(editingId)}
                    />
                    <IconButton color="error" onClick={() => handleRemoveField(index)} disabled={form.managementMode === 'proto' && Boolean(editingId)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>

              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={() => void handleSubmit()} disabled={saving}>
                  {editingId ? 'Cập nhật datasource' : 'Thêm datasource'}
                </Button>
                {editingId && (
                  <Button variant="outlined" onClick={resetForm}>Hủy sửa</Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* ============================================================
            Panel: Xem cấu trúc bất kỳ collection nào
        ============================================================ */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Xem cấu trúc collection</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Nhập tên collection MongoDB bất kỳ → hiển thị các fields phát hiện từ tối đa 50 documents.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
              <TextField
                label="Tên collection"
                placeholder="Ví dụ: Employee, CapBac, NhomQuyen..."
                value={browseCollectionName}
                onChange={(e) => setBrowseCollectionName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleBrowseCollection(); }}
                sx={{ minWidth: 280 }}
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => void handleBrowseCollection()}
                disabled={!browseCollectionName.trim()}
              >
                Xem cấu trúc
              </Button>
              {browseFields.length > 0 && (
                <Tooltip title="Sao chép fields vào form đang chỉnh sửa">
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, fields: browseFields, collectionName: browseCollectionName.trim() }));
                    }}
                  >
                    Dùng cho form
                  </Button>
                </Tooltip>
              )}
            </Stack>

            {browseError && <Alert severity="error" sx={{ mt: 1.5 }}>{browseError}</Alert>}
            {browseInfo && !browseError && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {browseInfo}
              </Typography>
            )}

            {browseFields.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {browseFields.map((field) => (
                    <Chip
                      key={field.key}
                      label={
                        <span>
                          <strong>{field.key}</strong>
                          <span style={{ opacity: 0.7 }}> — {field.dataType}</span>
                        </span>
                      }
                      variant="outlined"
                      size="small"
                      color={
                        field.dataType === 'number'  ? 'primary'
                        : field.dataType === 'boolean' ? 'success'
                        : field.dataType === 'date'    ? 'warning'
                        : field.dataType === 'array'   ? 'secondary'
                        : field.dataType === 'object'  ? 'info'
                        : 'default'
                      }
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Danh sach datasource registry</Typography>
            <Box sx={{ height: 380 }}>
              <LazyDataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                onRowClick={(params) => handleEdit(params.row as DataSourceConfig)}
                pageSizeOptions={[5, 10, 20]}
                fallbackRows={6}
                fallbackCols={5}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1}>
              {items.map((item) => (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box>
                    <Typography fontWeight={600}>{item.sourceName} ({item.sourceKey})</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Collection: {item.collectionName} - {item.enabled ? 'Bật' : 'Tắt'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fields: {item.fields.map((field) => `${field.label || field.key} (${field.key})`).join(', ')}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {buildAuditSummary(item.audit)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => handleEdit(item)}>Sửa</Button>
                    <Button color="error" variant="outlined" onClick={() => void handleDelete(item.id)}>Xóa</Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
        {deletedItems.length > 0 && (
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Khoi phuc datasource da xoa</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Danh sach nay chi hien thi cac datasource da xoa trong phien lam viec hien tai.
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  {deletedItems.map((item) => (
                    <Stack
                      key={`restore-${item.id}`}
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', md: 'center' }}
                      sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{item.sourceName} ({item.sourceKey})</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Collection: {item.collectionName}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {buildAuditSummary(item.audit)}
                        </Typography>
                      </Box>
                      <Button variant="outlined" onClick={() => void handleRestore(item.id)}>
                        Khoi phuc
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default CauHinhDataSource;
