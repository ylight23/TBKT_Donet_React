import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    FormControlLabel,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import type { GridColDef } from '@mui/x-data-grid';
import LazyDataGrid from '../../components/LazyDataGrid';
import thamSoApi, { type DataSourceConfig, type DataSourceField, type LocalTemplateLayout, type StreamJobProgress } from '../../apis/thamSoApi';
import { notifyDynamicMenuConfigChanged } from '../../hooks/useDynamicMenuConfig';
import { buildAuditSummary } from '../../utils/auditMeta';

interface DataSourceFormState {
    id: string;
    sourceKey: string;
    sourceName: string;
    collectionName: string;
    templateKey: string;
    enabled: boolean;
    managementMode: 'proto' | 'manual';
    fields: DataSourceField[];
}

const EMPTY_FIELD: DataSourceField = { key: '', label: '', dataType: 'string', required: false };
const INITIAL_FORM: DataSourceFormState = {
    id: '',
    sourceKey: '',
    sourceName: '',
    collectionName: '',
    templateKey: '',
    enabled: true,
    managementMode: 'manual',
    fields: [{ ...EMPTY_FIELD, key: 'id', label: 'ID' }],
};

const toSourceKey = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9\s_-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const CauHinhDataSource: React.FC = () => {
    const [items, setItems] = useState<DataSourceConfig[]>([]);
    const [deletedItems, setDeletedItems] = useState<DataSourceConfig[]>([]);
    const [templates, setTemplates] = useState<LocalTemplateLayout[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState<DataSourceFormState>(INITIAL_FORM);
    const [editingId, setEditingId] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<StreamJobProgress | null>(null);
    const [browseName, setBrowseName] = useState('');
    const [browseInfo, setBrowseInfo] = useState('');
    const [browseFields, setBrowseFields] = useState<DataSourceField[]>([]);

    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            setItems(await thamSoApi.getListDynamicMenuDataSources());
        } catch (e) {
            setError((e as Error)?.message || 'Không thể tải datasource');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadItems(); }, [loadItems]);
    useEffect(() => { void (async () => { try { setTemplates(await thamSoApi.getListTemplateLayouts()); } catch { setTemplates([]); } })(); }, []);

    const resetForm = useCallback(() => {
        setForm(INITIAL_FORM);
        setEditingId('');
    }, []);

    const sanitizeFields = (fields: DataSourceField[]) => {
        const rows = fields
            .map((f) => ({ ...f, key: f.key.trim(), label: (f.label || f.key).trim(), dataType: (f.dataType || 'string').trim().toLowerCase(), required: Boolean(f.required) }))
            .filter((f) => f.key.length > 0);
        return rows.length > 0 ? rows : [{ key: 'id', label: 'ID', dataType: 'string', required: false }];
    };

    const handleSave = async () => {
        const sourceKey = toSourceKey(form.sourceKey || form.sourceName);
        if (!sourceKey) return setError('Vui lòng nhập source key hợp lệ.');
        if (items.some((i) => i.sourceKey === sourceKey && i.id !== editingId)) return setError('Source key đã tồn tại.');
        const payload: DataSourceConfig = {
            id: editingId,
            sourceKey,
            sourceName: form.sourceName.trim() || sourceKey,
            collectionName: form.collectionName.trim() || form.sourceName.trim() || sourceKey,
            templateKey: form.templateKey.trim(),
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
        } catch (e) {
            setError((e as Error)?.message || 'Không thể lưu datasource');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = useCallback((item: DataSourceConfig) => {
        setEditingId(item.id);
        setForm({
            id: item.id,
            sourceKey: item.sourceKey,
            sourceName: item.sourceName,
            collectionName: item.collectionName,
            templateKey: item.templateKey || '',
            enabled: item.enabled,
            managementMode: item.managementMode,
            fields: item.fields.length > 0 ? item.fields : [{ ...EMPTY_FIELD, key: 'id', label: 'ID' }],
        });
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        const target = items.find((x) => x.id === id);
        try {
            await thamSoApi.deleteDynamicMenuDataSource(id);
            if (target) setDeletedItems((p) => [target, ...p.filter((x) => x.id !== id)]);
            await loadItems();
            notifyDynamicMenuConfigChanged();
            if (editingId === id) resetForm();
        } catch (e) {
            setError((e as Error)?.message || 'Không thể xóa datasource');
        }
    }, [editingId, items, loadItems, resetForm]);

    const handleRestore = useCallback(async (id: string) => {
        await thamSoApi.restoreDynamicMenuDataSource(id);
        setDeletedItems((p) => p.filter((x) => x.id !== id));
        await loadItems();
        notifyDynamicMenuConfigChanged();
    }, [loadItems]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            setSyncProgress(null);
            await thamSoApi.streamSyncDynamicMenuDataSourcesFromProto('', (event) => setSyncProgress(event));
            await loadItems();
        } catch (e) {
            setError((e as Error)?.message || 'Đồng bộ Proto thất bại');
        } finally {
            setSyncing(false);
        }
    };

    const handleBrowse = async () => {
        if (!browseName.trim()) return;
        try {
            setBrowseInfo('');
            setBrowseFields([]);
            const result = await thamSoApi.discoverCollectionFields(browseName.trim());
            setBrowseFields(result.fields);
            setBrowseInfo(result.message);
        } catch (e) {
            setError((e as Error)?.message || 'Không thể scan cấu trúc collection');
        }
    };

    const gridRows = useMemo(() => items.map((x) => ({
        ...x,
        statusText: x.enabled ? 'Bật' : 'Tắt',
        modeText: x.managementMode === 'proto' ? 'Proto' : 'Thủ công',
        auditText: buildAuditSummary(x.audit),
        fieldsCount: `${x.fields.length} fields`,
    })), [items]);

    const gridCols = useMemo<GridColDef[]>(() => [
        { field: 'sourceKey', headerName: 'Source key', minWidth: 140, flex: 1 },
        { field: 'modeText', headerName: 'Chế độ', minWidth: 110, flex: 0.6 },
        { field: 'sourceName', headerName: 'Tên', minWidth: 160, flex: 1 },
        { field: 'collectionName', headerName: 'Collection', minWidth: 150, flex: 1 },
        { field: 'fieldsCount', headerName: 'Fields', minWidth: 90, flex: 0.6 },
        { field: 'statusText', headerName: 'Trạng thái', minWidth: 90, flex: 0.6 },
        { field: 'auditText', headerName: 'Cập nhật', minWidth: 190, flex: 1 },
    ], []);

    const isProtoLocked = form.managementMode === 'proto' && Boolean(editingId);

    return (
        <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Quản trị datasource</Typography>
                    <Typography variant="body2" color="text.secondary">Đồng bộ style với Cấu hình menu động</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />} onClick={() => void handleSync()}>{syncing ? 'Đang đồng bộ...' : 'Sync từ Proto'}</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={resetForm}>Thêm datasource</Button>
                </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Chip size="small" color="success" label="1 Sync Proto" />
                    <Chip size="small" color="success" label="2 Cấu hình form" />
                    <Chip size="small" color="primary" label="3 Kiểm tra field" />
                </Stack>
            </Paper>

            {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {syncProgress && <Alert severity={syncProgress.success ? 'success' : 'info'} sx={{ mb: 2 }}>{syncProgress.message}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' }, gap: 2.5 }}>
                <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>{editingId ? 'Chỉnh sửa datasource' : 'Thêm datasource mới'}</Typography>
                        <Stack spacing={1.5}>
                            {isProtoLocked && <Alert severity="info" sx={{ py: 0.5 }}>Chế độ Proto: cập nhật schema bằng Sync từ Proto.</Alert>}
                            <Stack direction="row" spacing={1.5}>
                                <TextField size="small" fullWidth label="Source key" value={form.sourceKey} disabled={isProtoLocked} onChange={(e) => setForm((p) => ({ ...p, sourceKey: e.target.value }))} />
                                <TextField size="small" fullWidth label="Tên hiển thị" value={form.sourceName} disabled={isProtoLocked} onChange={(e) => setForm((p) => ({ ...p, sourceName: e.target.value }))} />
                            </Stack>
                            <TextField size="small" fullWidth label="Collection name" value={form.collectionName} disabled={isProtoLocked} onChange={(e) => setForm((p) => ({ ...p, collectionName: e.target.value }))} />
                            <TextField select size="small" fullWidth label="Template key" value={form.templateKey} onChange={(e) => setForm((p) => ({ ...p, templateKey: e.target.value }))}>
                                <MenuItem value="">(Không gắn)</MenuItem>
                                {templates.map((t) => <MenuItem key={t.key} value={t.key}>{t.name} ({t.key})</MenuItem>)}
                            </TextField>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    color={form.managementMode === 'proto' ? 'info' : 'default'}
                                    label={form.managementMode === 'proto' ? 'Chế độ: Proto sync' : 'Chế độ: Thủ công'}
                                />
                                <FormControlLabel control={<Switch checked={form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} />} label={form.enabled ? 'Bật' : 'Tắt'} />
                            </Stack>
                            <Divider />
                            {form.fields.map((f, idx) => (
                                <Stack key={`f-${idx}`} direction="row" spacing={1}>
                                    <TextField size="small" label="Key" value={f.key} disabled={isProtoLocked} onChange={(e) => setForm((p) => { const next = [...p.fields]; next[idx] = { ...next[idx], key: e.target.value }; return { ...p, fields: next }; })} />
                                    <TextField size="small" label="Label" value={f.label || ''} disabled={isProtoLocked} onChange={(e) => setForm((p) => { const next = [...p.fields]; next[idx] = { ...next[idx], label: e.target.value }; return { ...p, fields: next }; })} />
                                    <TextField size="small" label="Type" value={f.dataType || 'string'} disabled={isProtoLocked} onChange={(e) => setForm((p) => { const next = [...p.fields]; next[idx] = { ...next[idx], dataType: e.target.value }; return { ...p, fields: next }; })} />
                                </Stack>
                            ))}
                            <Stack direction="row" spacing={1}>
                                <Button variant="outlined" onClick={() => setForm((p) => ({ ...p, fields: [...p.fields, { ...EMPTY_FIELD }] }))} disabled={isProtoLocked}>Thêm field</Button>
                                <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>{editingId ? 'Cập nhật' : 'Thêm datasource'}</Button>
                                {editingId && <Button variant="outlined" onClick={resetForm}>Hủy sửa</Button>}
                            </Stack>
                        </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Xem cấu trúc collection</Typography>
                        <Stack direction="row" spacing={1}>
                            <TextField size="small" fullWidth value={browseName} onChange={(e) => setBrowseName(e.target.value)} placeholder="Tên collection..." />
                            <Button size="small" variant="contained" startIcon={<SearchIcon />} onClick={() => void handleBrowse()}>Scan</Button>
                        </Stack>
                        {browseInfo && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{browseInfo}</Typography>}
                        {browseFields.length > 0 && <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => setForm((p) => ({ ...p, fields: browseFields, collectionName: browseName.trim() }))}>Dùng cho form hiện tại</Button>}
                        {browseFields.length > 0 && (
                            <Stack spacing={0.75} sx={{ mt: 1.25, maxHeight: 260, overflow: 'auto', pr: 0.5 }}>
                                {browseFields.map((field) => (
                                    <Paper key={field.key} variant="outlined" sx={{ p: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                            <Typography sx={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>{field.key}</Typography>
                                            <Chip size="small" label={field.dataType || 'string'} />
                                            {field.required && <Chip size="small" color="warning" variant="outlined" label="Bat buoc" />}
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">
                                            {field.label || field.key}
                                        </Typography>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Paper>
                </Box>

                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight={700}>Datasource registry <Chip size="small" label={items.length} /></Typography>
                        </Box>
                        <Box sx={{ height: 300 }}>
                            <LazyDataGrid rows={gridRows} columns={gridCols} loading={loading} disableRowSelectionOnClick onRowClick={(params) => handleEdit(params.row as DataSourceConfig)} pageSizeOptions={[5, 10]} fallbackRows={5} fallbackCols={5} />
                        </Box>
                    </Paper>

                    <Box sx={{ maxHeight: 420, overflow: 'auto', pr: 0.5 }}>
                    {items.map((item) => (
                        <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderColor: editingId === item.id ? 'primary.main' : 'divider' }} onClick={() => handleEdit(item)}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" fontWeight={700}>{item.sourceName} <Typography component="span" variant="caption" color="text.secondary">({item.sourceKey})</Typography></Typography>
                                <Chip size="small" label={item.enabled ? 'Bật' : 'Tắt'} color={item.enabled ? 'success' : 'default'} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{item.collectionName}</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>{buildAuditSummary(item.audit)}</Typography>
                                <Button size="small" variant="outlined" onClick={() => handleEdit(item)}>Sửa</Button>
                                <Button size="small" color="error" variant="outlined" onClick={() => void handleDelete(item.id)}>Xóa</Button>
                            </Stack>
                        </Paper>
                    ))}
                    </Box>

                    {deletedItems.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Khôi phục datasource đã xóa</Typography>
                            <Stack spacing={1}>
                                {deletedItems.map((item) => (
                                    <Stack key={`restore-${item.id}`} direction="row" justifyContent="space-between" sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                        <Box><Typography variant="body2">{item.sourceName} ({item.sourceKey})</Typography><Typography variant="caption" color="text.secondary">{item.collectionName}</Typography></Box>
                                        <Button size="small" variant="outlined" onClick={() => void handleRestore(item.id)}>Khôi phục</Button>
                                    </Stack>
                                ))}
                            </Stack>
                        </Paper>
                    )}
                </Stack>
            </Box>
        </Box>
    );
};

export default CauHinhDataSource;
