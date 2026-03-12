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
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import thamSoApi, {
  type LocalDynamicMenuDataSource,
  type LocalDynamicMenuDataSourceField,
} from '../../apis/thamSoApi';

interface DataSourceFormState {
  id: string;
  sourceKey: string;
  sourceName: string;
  collectionName: string;
  enabled: boolean;
  fields: LocalDynamicMenuDataSourceField[];
}

const EMPTY_FIELD: LocalDynamicMenuDataSourceField = {
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
  const [items, setItems] = useState<LocalDynamicMenuDataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<DataSourceFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string>('');
  const [syncingFromProto, setSyncingFromProto] = useState<boolean>(false);
  // discover states
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [browseCollectionName, setBrowseCollectionName] = useState<string>('');
  const [browseFields, setBrowseFields] = useState<LocalDynamicMenuDataSourceField[]>([]);
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
      statusText: item.enabled ? 'Bật' : 'Tắt',
    }));
  }, [items]);

  const columns: GridColDef[] = [
    { field: 'sourceKey', headerName: 'Source key', minWidth: 160, flex: 0.9 },
    { field: 'sourceName', headerName: 'Tên hiển thị', minWidth: 180, flex: 1 },
    { field: 'collectionName', headerName: 'Collection', minWidth: 160, flex: 0.9 },
    { field: 'statusText', headerName: 'Trạng thái', minWidth: 100, flex: 0.5 },
    { field: 'fieldsText', headerName: 'Fields', minWidth: 260, flex: 1.5 },
  ];

  const resetForm = (): void => {
    setForm(INITIAL_FORM);
    setEditingId('');
  };

  const sanitizeFields = (fields: LocalDynamicMenuDataSourceField[]): LocalDynamicMenuDataSourceField[] => {
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

    const map = new Map<string, LocalDynamicMenuDataSourceField>();
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

    const payload: LocalDynamicMenuDataSource = {
      id: editingId,
      sourceKey,
      sourceName,
      collectionName,
      enabled: form.enabled,
      fields: sanitizeFields(form.fields),
    };

    try {
      setSaving(true);
      setError('');
      await thamSoApi.saveDynamicMenuDataSource(payload, !editingId);
      await loadItems();
      resetForm();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể lưu datasource');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: LocalDynamicMenuDataSource): void => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      sourceKey: item.sourceKey,
      sourceName: item.sourceName,
      collectionName: item.collectionName,
      enabled: item.enabled,
      fields: item.fields.length > 0 ? item.fields : [{ ...EMPTY_FIELD, key: 'id', label: 'ID' }],
    });
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      setError('');
      await thamSoApi.deleteDynamicMenuDataSource(id);
      await loadItems();
      if (editingId === id) resetForm();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể xóa datasource');
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
      const synced = await thamSoApi.syncDynamicMenuDataSourcesFromProto(sourceKey);
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
    fieldName: keyof LocalDynamicMenuDataSourceField,
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

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Source key"
                  value={form.sourceKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, sourceKey: e.target.value }))}
                  helperText="Ví dụ: employee, office, catalog-vat-tu"
                  fullWidth
                />
                <TextField
                  label="Tên hiển thị"
                  value={form.sourceName}
                  onChange={(e) => setForm((prev) => ({ ...prev, sourceName: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Tên collection"
                  value={form.collectionName}
                  onChange={(e) => setForm((prev) => ({ ...prev, collectionName: e.target.value }))}
                  helperText="Tên collection Mongo để tham chiếu"
                  fullWidth
                />
                <Tooltip title="Scan collection để tự động điền fields vào form">
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={discovering ? <CircularProgress size={16} /> : <SearchIcon />}
                      onClick={() => void handleDiscoverIntoForm()}
                      disabled={discovering || !form.collectionName.trim()}
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
                    />
                    <TextField
                      label="Field label"
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                      sx={{ minWidth: 220 }}
                    />
                    <TextField
                      label="Data type"
                      value={field.dataType}
                      onChange={(e) => handleFieldChange(index, 'dataType', e.target.value)}
                      sx={{ minWidth: 160 }}
                    />
                    <IconButton color="error" onClick={() => handleRemoveField(index)}>
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
              <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                onRowClick={(params) => handleEdit(params.row as LocalDynamicMenuDataSource)}
                pageSizeOptions={[5, 10, 20]}
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
      </Stack>
    </Box>
  );
};

export default CauHinhDataSource;
