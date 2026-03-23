import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControlLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import IconPickerPopover from '../CauHinhThamSo/subComponents/IconPickerPopover';
import {
    normalizeColumnCount,
    normalizeColumns,
    normalizeDataSource,
    normalizeGridCount,
    normalizeMenuPath,
    normalizePermissionCode,
} from '../../configs/dynamicMenuConfig';
import { buildFieldOptions, buildSourceOptions } from '../../configs/dynamicMenuDataSource';
import { notifyDynamicMenuConfigChanged, useDynamicMenuConfig } from '../../hooks/useDynamicMenuConfig';
import type { DynamicMenuConfigItem } from '../../types/dynamicMenu';
import { nameToIcon } from '../../utils/thamSoUtils';
import { buildAuditSummary } from '../../utils/auditMeta';
import thamSoApi, { type LocalTemplateLayout } from '../../apis/thamSoApi';
import LazyDataGrid from '../../components/LazyDataGrid';

interface FormColumnState {
    key: string;
    name: string;
}

interface FormState {
    id: string;
    title: string;
    path: string;
    icon: string;
    templateKey: string;
    permissionCode: string;
    dataSource: string;
    gridCount: number;
    columnCount: number;
    columns: FormColumnState[];
}

const INITIAL_FORM: FormState = {
    id: '',
    title: '',
    path: '',
    icon: 'Assignment',
    templateKey: '',
    permissionCode: '',
    dataSource: 'employee',
    gridCount: 1,
    columnCount: 4,
    columns: [],
};

const toSlug = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

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

const CauHinhMenuDong: React.FC = () => {
    const { items, dataSources, loading, error: loadError, reload, createItem, updateItem, deleteItem } = useDynamicMenuConfig();
    const [deletedItems, setDeletedItems] = useState<DynamicMenuConfigItem[]>([]);
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [templates, setTemplates] = useState<LocalTemplateLayout[]>([]);
    const [iconPickerAnchorEl, setIconPickerAnchorEl] = useState<HTMLElement | null>(null);
    const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
    const [previewLoading, setPreviewLoading] = useState<boolean>(false);
    const [previewError, setPreviewError] = useState<string>('');

    useEffect(() => {
        const loadTemplates = async (): Promise<void> => {
            try {
                const result = await thamSoApi.getListTemplateLayouts();
                setTemplates(result);
            } catch {
                setTemplates([]);
            }
        };
        void loadTemplates();
    }, []);

    const normalizedDataSource = normalizeDataSource(form.dataSource);
    const normalizedColumnCount = normalizeColumnCount(form.columnCount);
    const normalizedGridCount = normalizeGridCount(form.gridCount);
    const sourceOptions = useMemo(() => buildSourceOptions(dataSources), [dataSources]);
    const selectedDataSource = dataSources.find((item) => item.sourceKey === normalizedDataSource) ?? null;
    const fieldOptions = useMemo(
        () => buildFieldOptions(normalizedDataSource, dataSources),
        [normalizedDataSource, dataSources],
    );
    const normalizedFormColumns = useMemo(
        () => normalizeColumns(normalizedDataSource, normalizedColumnCount, form.columns, dataSources),
        [normalizedDataSource, normalizedColumnCount, form.columns, dataSources],
    );

    useEffect(() => {
        setForm((prev) => {
            const nextColumns = normalizeColumns(
                normalizeDataSource(prev.dataSource),
                normalizeColumnCount(prev.columnCount),
                prev.columns,
                dataSources,
            );

            if (nextColumns.length === prev.columns.length &&
                nextColumns.every((item, index) => item.key === prev.columns[index]?.key && item.name === prev.columns[index]?.name)) {
                return prev;
            }

            return {
                ...prev,
                columns: nextColumns,
            };
        });
    }, [dataSources]);

    useEffect(() => {
        if (!normalizedDataSource) {
            setPreviewRows([]);
            setPreviewError('');
            return;
        }

        const loadPreview = async (): Promise<void> => {
            try {
                setPreviewLoading(true);
                setPreviewError('');
                const rows = await thamSoApi.getDynamicMenuRows(normalizedDataSource, 10);
                setPreviewRows(rows);
            } catch (err) {
                setPreviewRows([]);
                setPreviewError((err as Error)?.message || 'Khong the tai preview du lieu');
            } finally {
                setPreviewLoading(false);
            }
        };

        void loadPreview();
    }, [normalizedDataSource]);

    const mismatchColumns = useMemo(() => {
        if (!selectedDataSource) {
            return normalizedFormColumns;
        }

        const fieldKeySet = new Set(selectedDataSource.fields.map((field) => field.key));
        return normalizedFormColumns.filter((column) => !fieldKeySet.has(column.key));
    }, [normalizedFormColumns, selectedDataSource]);

    const rows = useMemo(
        () => items.map((item) => {
            const ds = dataSources.find((source) => source.sourceKey === item.dataSource);
            const fieldKeySet = new Set((ds?.fields ?? []).map((field) => field.key));
            const mismatchCount = (item.columns ?? []).filter((column) => !fieldKeySet.has(column.key)).length;

            return {
                ...item,
                statusText: item.enabled ? 'Bat' : 'Tat',
                templateName: templates.find((t) => t.key === item.templateKey)?.name || item.templateKey || '—',
                sourceName: ds?.sourceName || item.dataSource,
                mappingText: mismatchCount > 0 ? `${mismatchCount} cot loi` : 'Hop le',
                auditText: buildAuditSummary(item.audit),
            };
        }),
        [items, templates, dataSources],
    );

    const columns: GridColDef[] = [
        { field: 'title', headerName: 'Ten menu', flex: 1.2, minWidth: 180 },
        { field: 'path', headerName: 'Duong dan', flex: 1.2, minWidth: 180 },
        { field: 'sourceName', headerName: 'Datasource', flex: 1, minWidth: 160 },
        { field: 'mappingText', headerName: 'Mapping', flex: 0.8, minWidth: 140 },
        { field: 'permissionCode', headerName: 'Ma quyen', flex: 1.1, minWidth: 180 },
        { field: 'auditText', headerName: 'Cap nhat', flex: 1, minWidth: 190 },
        {
            field: 'icon',
            headerName: 'Icon',
            width: 80,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    {nameToIcon((params.value as string) || 'Assignment')}
                </Box>
            ),
        },
        { field: 'templateName', headerName: 'Template', flex: 1, minWidth: 160 },
        { field: 'statusText', headerName: 'Trang thai', width: 120, align: 'center', headerAlign: 'center' },
    ];

    const previewGridColumns: GridColDef[] = normalizedFormColumns.map((column, index) => ({
        field: `col_${index + 1}`,
        headerName: column.name,
        minWidth: 150,
        flex: 1,
    }));

    const previewGridRows = useMemo(
        () => previewRows.map((row, rowIndex) => {
            const item: Record<string, string> = {
                id: String(row.id ?? `preview-${rowIndex + 1}`),
            };
            normalizedFormColumns.forEach((column, columnIndex) => {
                item[`col_${columnIndex + 1}`] = getValueByKey(row, column.key);
            });
            return item;
        }),
        [previewRows, normalizedFormColumns],
    );

    const resetForm = (): void => {
        setForm(INITIAL_FORM);
        setEditingId(null);
        setError('');
        setPreviewError('');
    };

    const handleColumnsSync = (nextSourceKey: string, nextColumnCount: number): void => {
        setForm((prev) => ({
            ...prev,
            dataSource: nextSourceKey,
            columnCount: nextColumnCount,
            columns: normalizeColumns(nextSourceKey, nextColumnCount, prev.columns, dataSources),
        }));
    };

    const handleCreateOrUpdate = async (): Promise<void> => {
        const normalizedTitle = form.title.trim();
        const normalizedId = editingId ?? toSlug(form.id || normalizedTitle);
        const nextSourceKey = normalizeDataSource(form.dataSource);
        const nextColumns = normalizeColumns(nextSourceKey, normalizedColumnCount, form.columns, dataSources);

        if (!normalizedTitle) {
            setError('Vui long nhap ten menu.');
            return;
        }

        if (!normalizedId) {
            setError('Ma menu khong hop le. Chi dung chu cai, so va dau gach ngang.');
            return;
        }

        if (!selectedDataSource) {
            setError('Vui long chon datasource hop le cho menu dong.');
            return;
        }

        const duplicate = items.some((item) => item.id === normalizedId && item.id !== editingId);
        if (duplicate) {
            setError('Ma menu da ton tai. Vui long doi ma khac.');
            return;
        }

        const nextItem: DynamicMenuConfigItem = {
            id: normalizedId,
            title: normalizedTitle,
            path: normalizeMenuPath(form.path || '', normalizedId),
            active: `menuDong_${normalizedId}`,
            icon: (form.icon || 'Assignment').trim(),
            permissionCode: normalizePermissionCode(form.permissionCode, normalizedId),
            templateKey: form.templateKey.trim(),
            dataSource: nextSourceKey,
            gridCount: normalizedGridCount,
            columnCount: normalizedColumnCount,
            columns: nextColumns,
            enabled: true,
        };

        try {
            if (editingId) {
                const current = items.find((item) => item.id === editingId);
                await updateItem({ ...nextItem, enabled: current?.enabled ?? true });
            } else {
                await createItem(nextItem);
            }

            notifyDynamicMenuConfigChanged();
            resetForm();
        } catch (err) {
            setError((err as Error)?.message || 'Khong the luu menu dong');
        }
    };

    const handleEdit = (row: DynamicMenuConfigItem): void => {
        setEditingId(row.id);
        setForm({
            id: row.id,
            title: row.title,
            path: row.path,
            icon: row.icon || 'Assignment',
            templateKey: row.templateKey || '',
            permissionCode: row.permissionCode || '',
            dataSource: normalizeDataSource(row.dataSource),
            gridCount: normalizeGridCount(row.gridCount),
            columnCount: normalizeColumnCount(row.columnCount),
            columns: normalizeColumns(
                normalizeDataSource(row.dataSource),
                normalizeColumnCount(row.columnCount),
                row.columns,
                dataSources,
            ),
        });
        setError('');
    };

    const handleSelectIcon = (iconName: string): void => {
        setForm((prev) => ({ ...prev, icon: iconName || 'Assignment' }));
        setIconPickerAnchorEl(null);
    };

    const handleToggle = async (id: string): Promise<void> => {
        try {
            const target = items.find((item) => item.id === id);
            if (!target) return;
            await updateItem({ ...target, enabled: !target.enabled });
            notifyDynamicMenuConfigChanged();
        } catch (err) {
            setError((err as Error)?.message || 'Khong the cap nhat trang thai menu');
        }
    };

    const handleDelete = async (id: string): Promise<void> => {
        const deletedItem = items.find((item) => item.id === id);
        try {
            await deleteItem(id);
            if (deletedItem) {
                setDeletedItems((prev) => [deletedItem, ...prev.filter((item) => item.id !== deletedItem.id)]);
            }
            notifyDynamicMenuConfigChanged();
            if (editingId === id) {
                resetForm();
            }
        } catch (err) {
            setError((err as Error)?.message || 'Khong the xoa menu dong');
        }
    };

    const handleRestore = async (id: string): Promise<void> => {
        try {
            setError('');
            await thamSoApi.restoreDynamicMenu(id);
            setDeletedItems((prev) => prev.filter((item) => item.id !== id));
            notifyDynamicMenuConfigChanged();
            await reload();
        } catch (err) {
            setError((err as Error)?.message || 'Khong the khoi phuc menu dong');
        }
    };

    const handleColumnChange = (index: number, field: keyof FormColumnState, value: string): void => {
        setForm((prev) => {
            const nextColumns = [...normalizedFormColumns];
            nextColumns[index] = {
                ...nextColumns[index],
                [field]: value,
            };
            return {
                ...prev,
                columns: nextColumns,
            };
        });
    };

    return (
        <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
                <Typography variant="h4" fontWeight={700}>Cau hinh menu dong tren Sidebar</Typography>

                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                    <Typography variant="caption" color="text.disabled">Quy trinh:</Typography>
                    {([
                        { label: '1 Tao template', color: 'text.secondary', tooltip: 'Vao CauHinhTemplate de tao template va dat key.' },
                        { label: '2 Chon datasource', color: 'text.secondary', tooltip: 'Menu dong runtime se doc du lieu tu datasource dang active.' },
                        { label: '3 Chon columns + preview', color: 'primary.main', tooltip: 'Kiem tra mapping columns va sample rows truoc khi dua vao runtime.' },
                    ] as const).map(({ label, color, tooltip }, i) => (
                        <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
                            {i > 0 && <Typography variant="caption" color="text.disabled">→</Typography>}
                            <Tooltip title={tooltip} arrow>
                                <Typography variant="caption" sx={{ color, cursor: 'help', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                                    {label}
                                </Typography>
                            </Tooltip>
                        </Stack>
                    ))}
                </Stack>

                {loadError && <Alert severity="error">{loadError}</Alert>}
                {error && <Alert severity="warning">{error}</Alert>}
                {!selectedDataSource && (
                    <Alert severity="warning">
                        Datasource hien tai khong ton tai hoac da bi tat. Ban can chon lai datasource hop le truoc khi luu.
                    </Alert>
                )}
                {mismatchColumns.length > 0 && (
                    <Alert severity="warning">
                        Phat hien {mismatchColumns.length} cot dang map toi field khong con ton tai trong datasource: {mismatchColumns.map((item) => item.key).join(', ')}.
                    </Alert>
                )}

                <Card>
                    <CardContent>
                        <Stack spacing={2}>
                            <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                                <TextField
                                    label="Ten menu"
                                    value={form.title}
                                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                    fullWidth
                                />
                                <TextField
                                    label="Ma menu"
                                    value={form.id}
                                    onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
                                    helperText={editingId ? 'Khong cho doi ma menu khi dang sua' : 'De trong se tu sinh tu ten'}
                                    disabled={Boolean(editingId)}
                                    fullWidth
                                />
                                <TextField
                                    label="Duong dan menu"
                                    value={form.path}
                                    onChange={(e) => setForm((prev) => ({ ...prev, path: e.target.value }))}
                                    helperText="Vi du: /menu-dong/bao-cao-1"
                                    fullWidth
                                />
                                <TextField
                                    label="Ma quyen"
                                    value={form.permissionCode}
                                    onChange={(e) => setForm((prev) => ({ ...prev, permissionCode: e.target.value }))}
                                    helperText="De trong se tu sinh theo ma menu"
                                    fullWidth
                                />
                            </Stack>

                            <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems="flex-start">
                                <Box sx={{ minWidth: 260 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Template</Typography>
                                    <Select
                                        value={form.templateKey}
                                        onChange={(e) => setForm((prev) => ({ ...prev, templateKey: e.target.value }))}
                                        displayEmpty
                                        size="small"
                                        sx={{ minWidth: 260 }}
                                    >
                                        <MenuItem value="">
                                            <em>— Chua chon template —</em>
                                        </MenuItem>
                                        {templates.map((t) => (
                                            <MenuItem key={t.key} value={t.key}>
                                                {t.published ? '' : '[Draft] '}{t.name} ({t.key})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Box>

                                <Box sx={{ minWidth: 260 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Datasource</Typography>
                                    <Select
                                        value={normalizedDataSource}
                                        onChange={(e) => handleColumnsSync(e.target.value, normalizedColumnCount)}
                                        size="small"
                                        sx={{ minWidth: 260 }}
                                    >
                                        {sourceOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label} ({option.value})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        Xoa datasource se soft delete cac menu dang tham chieu source nay.
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Icon menu</Typography>
                                    <Button
                                        variant="outlined"
                                        onClick={(e) => setIconPickerAnchorEl(e.currentTarget)}
                                        sx={{ justifyContent: 'space-between', minWidth: 260, textTransform: 'none' }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {nameToIcon(form.icon || 'Assignment')}
                                            <Typography variant="body2">{form.icon || 'Assignment'}</Typography>
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">Chon icon</Typography>
                                    </Button>
                                    <IconPickerPopover
                                        anchorEl={iconPickerAnchorEl}
                                        open={Boolean(iconPickerAnchorEl)}
                                        selectedIconName={form.icon || 'Assignment'}
                                        selectedColor="#2e7d32"
                                        onSelect={handleSelectIcon}
                                        onClose={() => setIconPickerAnchorEl(null)}
                                    />
                                </Box>
                            </Stack>

                            <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                                <TextField
                                    label="So DataGrid"
                                    type="number"
                                    value={normalizedGridCount}
                                    onChange={(e) => setForm((prev) => ({ ...prev, gridCount: Number(e.target.value) || 1 }))}
                                    inputProps={{ min: 1, max: 6 }}
                                    sx={{ maxWidth: 180 }}
                                />
                                <TextField
                                    label="So cot"
                                    type="number"
                                    value={normalizedColumnCount}
                                    onChange={(e) => handleColumnsSync(normalizedDataSource, Number(e.target.value) || 1)}
                                    inputProps={{ min: 1, max: 12 }}
                                    sx={{ maxWidth: 180 }}
                                />
                            </Stack>

                            <Divider />

                            <Stack spacing={1}>
                                <Typography variant="subtitle1" fontWeight={600}>Mapping cot runtime</Typography>
                                {normalizedFormColumns.map((column, index) => {
                                    const isMismatch = mismatchColumns.some((item) => item.key === column.key);

                                    return (
                                        <Stack key={`column-${index}`} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                                            <TextField
                                                label={`Ten cot ${index + 1}`}
                                                value={column.name}
                                                onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                                                fullWidth
                                            />
                                            <Select
                                                value={column.key}
                                                onChange={(e) => handleColumnChange(index, 'key', e.target.value)}
                                                size="small"
                                                sx={{ minWidth: 260, borderColor: isMismatch ? 'warning.main' : undefined }}
                                            >
                                                {fieldOptions.map((option) => (
                                                    <MenuItem key={`${index}-${option.key}`} value={option.key}>
                                                        {option.label} ({option.key})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <Chip
                                                color={isMismatch ? 'warning' : 'success'}
                                                variant="outlined"
                                                label={isMismatch ? 'Mismatch' : 'Hop le'}
                                                sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                                            />
                                        </Stack>
                                    );
                                })}
                            </Stack>

                            <Stack direction="row" spacing={1.5}>
                                <Button variant="contained" onClick={() => void handleCreateOrUpdate()} disabled={loading}>
                                    {editingId ? 'Cap nhat menu' : 'Them menu'}
                                </Button>
                                {editingId && (
                                    <Button variant="outlined" onClick={resetForm}>Huy sua</Button>
                                )}
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Stack spacing={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight={600}>Preview runtime</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Xem truoc 10 ban ghi dau tien tu datasource va cach columns hien thi o runtime.
                                </Typography>
                            </Box>

                            {previewError && <Alert severity="warning">{previewError}</Alert>}
                            {!previewError && previewRows.length === 0 && !previewLoading && (
                                <Alert severity="info">Datasource hien tai chua co ban ghi mau de preview.</Alert>
                            )}

                            <Box sx={{ height: 320 }}>
                                <LazyDataGrid
                                    rows={previewGridRows}
                                    columns={previewGridColumns}
                                    loading={previewLoading}
                                    disableRowSelectionOnClick
                                    pageSizeOptions={[5, 10]}
                                    fallbackRows={5}
                                    fallbackCols={Math.max(previewGridColumns.length, 3)}
                                />
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Danh sach menu dong</Typography>
                        <Box sx={{ height: 360 }}>
                            <LazyDataGrid
                                rows={rows}
                                columns={columns}
                                loading={loading}
                                disableRowSelectionOnClick
                                onRowClick={(params) => handleEdit(params.row as DynamicMenuConfigItem)}
                                pageSizeOptions={[5, 10, 20]}
                                fallbackRows={6}
                                fallbackCols={6}
                            />
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={1.5}>
                            {items.map((item) => {
                                const ds = dataSources.find((source) => source.sourceKey === item.dataSource);
                                const fieldKeySet = new Set((ds?.fields ?? []).map((field) => field.key));
                                const mismatchCount = (item.columns ?? []).filter((column) => !fieldKeySet.has(column.key)).length;

                                return (
                                    <Stack
                                        key={item.id}
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={1.5}
                                        justifyContent="space-between"
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                        sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                                    >
                                        <Box>
                                            <Typography fontWeight={600}>{item.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.path} • quyen: {item.permissionCode || '(chua gan)'} • datasource: {ds?.sourceName || item.dataSource}
                                            </Typography>
                                            <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                                                <Chip size="small" variant="outlined" label={`${item.gridCount} grid`} />
                                                <Chip size="small" variant="outlined" label={`${item.columnCount} cot`} />
                                                <Chip
                                                    size="small"
                                                    color={mismatchCount > 0 ? 'warning' : 'success'}
                                                    variant="outlined"
                                                    label={mismatchCount > 0 ? `${mismatchCount} cot loi` : 'Mapping hop le'}
                                                />
                                            </Stack>
                                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                                {buildAuditSummary(item.audit)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}>
                                            {nameToIcon(item.icon || 'Assignment')}
                                        </Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <FormControlLabel
                                                control={<Switch checked={item.enabled} onChange={() => void handleToggle(item.id)} />}
                                                label={item.enabled ? 'Bat' : 'Tat'}
                                            />
                                            <Button variant="outlined" onClick={() => handleEdit(item)}>Sua</Button>
                                            <Button color="error" variant="outlined" onClick={() => void handleDelete(item.id)}>Xoa</Button>
                                        </Stack>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </CardContent>
                </Card>

                {deletedItems.length > 0 && (
                    <Card>
                        <CardContent>
                            <Stack spacing={1.5}>
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>Khoi phuc menu da xoa</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Danh sach nay chi giu cac menu da xoa trong phien lam viec hien tai.
                                    </Typography>
                                </Box>
                                <Stack spacing={1}>
                                    {deletedItems.map((item) => (
                                        <Stack
                                            key={`restore-${item.id}`}
                                            direction={{ xs: 'column', md: 'row' }}
                                            spacing={1.5}
                                            justifyContent="space-between"
                                            alignItems={{ xs: 'flex-start', md: 'center' }}
                                            sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}
                                        >
                                            <Box>
                                                <Typography fontWeight={600}>{item.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {item.path} - quyen: {item.permissionCode || '(chua gan)'}
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

export default CauHinhMenuDong;
