import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    FormControlLabel,
    IconButton,
    MenuItem,
    Select,
    type SelectChangeEvent,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import IconPickerPopover from '../CauHinhThamSo/subComponents/IconPickerPopover';
import {
    createDynamicMenuItem,
    normalizeColumnCount,
    normalizeColumnKeys,
    normalizeColumnNames,
    normalizeDataSource,
    normalizeGridCount,
} from '../../configs/dynamicMenuConfig';
import { useDynamicMenuConfig } from '../../hooks/useDynamicMenuConfig';
import type { DynamicMenuConfigItem } from '../../types/dynamicMenu';
import { nameToIcon } from '../../utils/thamSoUtils';
import {
    DynamicMenuFieldOption,
    DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK,
    getDefaultColumnKeysBySource,
    type DynamicMenuDataSource,
} from '../../configs/dynamicMenuDataSource';
import thamSoApi, { type LocalDynamicMenuDataSource } from '../../apis/thamSoApi';

interface FormState {
    id: string;
    title: string;
    path: string;
    icon: string;
    dataSource: string;
    gridCount: number;
    columnCount: number;
    columnNames: string[];
    columnKeys: string[];
}

const INITIAL_FORM: FormState = {
    id: '',
    title: '',
    path: '',
    icon: 'Assignment',
    dataSource: 'employee',
    gridCount: 1,
    columnCount: 4,
    columnNames: ['Cot 1', 'Cot 2', 'Cot 3', 'Cot 4'],
    columnKeys: ['id', 'id', 'id', 'id'],
};

const toSlug = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const CauHinhMenuDong: React.FC = () => {
    const {items, loading, error: loadError, createItem, updateItem, deleteItem } = useDynamicMenuConfig();
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [dataSources, setDataSources] = useState<LocalDynamicMenuDataSource[]>([]);
    const [iconPickerAnchorEl, setIconPickerAnchorEl] = useState<HTMLElement | null>(null);
    const [activeColumnTab, setActiveColumnTab] = useState<number>(0);

    useEffect(() => {
        const loadDataSources = async (): Promise<void> => {
            try {
                const result = await thamSoApi.getListDynamicMenuDataSources();
                setDataSources(result.filter((item) => item.enabled));
            } catch {
                setDataSources([]);
            }
        };
        void loadDataSources();
    }, []);

    useEffect(() => {
        if (dataSources.length === 0) return;
        setForm((prev) => {
            const source = dataSources.find((s) => s.sourceKey === prev.dataSource);
            if (!source || source.fields.length === 0) return prev;
            const validKeys = new Set(source.fields.map((f) => f.key));
            const allValid = prev.columnKeys.every((key) => validKeys.has(key));
            if (allValid) return prev; 
            const firstKey = source.fields[0]?.key ?? 'id';
            return {
                ...prev,
                columnKeys: prev.columnKeys.map((key) => (validKeys.has(key) ? key : firstKey)),
            };
        });
    }, [dataSources, form.dataSource]);

    

    const sourceOptions = useMemo(
        () => (dataSources.length > 0
            ? dataSources.map((item) => ({ value: item.sourceKey, label: item.sourceName || item.sourceKey }))
            : DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK),
        [dataSources],
    );

    const fieldOptionsBySource = useMemo((): Record<string, Array<{ key: string; label: string }>> => {
    const next: Record<string, Array<{ key: string; label: string }>> = {};
    dataSources.forEach((source) => {
        next[source.sourceKey] = source.fields.map((field: { key: string; label: string }) => ({
            key: field.key,
            label: field.label || field.key,
        }));
    });
    return next;
}, [dataSources]);
    const activeFieldOptions = useMemo(() => {
        const fromSource = fieldOptionsBySource[form.dataSource]  ?? [];
        if (fromSource.length > 0) return fromSource;
        // const fromEmployee = fieldOptionsBySource.employee ?? [];
        // if (fromEmployee.length > 0) return fromEmployee;
        return [{ key: 'id', label: 'ID' }];
    }, [fieldOptionsBySource, form.dataSource]);

    const activeColumnKeyValue = useMemo(() => {
        const normalizedKeys = normalizeColumnKeys(form.dataSource, form.columnCount, form.columnKeys);
        const currentValue = normalizedKeys[activeColumnTab] || '';
        const hasCurrent = activeFieldOptions.some((field) => field.key === currentValue);
        if (hasCurrent) return currentValue;
        return activeFieldOptions[0]?.key || '';
    }, [form.dataSource, form.columnCount, form.columnKeys, activeColumnTab, activeFieldOptions]);

    const getDefaultKeys = (source: string, count: number): string[] => {
        const fromRegistry = fieldOptionsBySource[source] ?? [];
        if (fromRegistry.length > 0) {
            const keys = fromRegistry.slice(0, count).map((item) => item.key);
            while (keys.length < count) keys.push(keys.length === 0 ? 'id' : keys[0]);
            return keys;
        }
        return getDefaultColumnKeysBySource(source, count);
    };

    const rows = useMemo(
        () => items.map((item) => ({ ...item, statusText: item.enabled ? 'Bật' : 'Tắt' })),
        [items],
    );

    const columns: GridColDef[] = [
        { field: 'title', headerName: 'Tên menu', flex: 1.2, minWidth: 180 },
        { field: 'path', headerName: 'Đường dẫn', flex: 1.2, minWidth: 180 },
        {
            field: 'icon',
            headerName: 'Icon',
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    {nameToIcon((params.value as string) || 'Assignment')}
                </Box>
            ),
        },
        { field: 'gridCount', headerName: 'Số DataGrid', width: 140, align: 'center', headerAlign: 'center' },
        { field: 'columnCount', headerName: 'Số cột/Grid', width: 130, align: 'center', headerAlign: 'center' },
        { field: 'dataSource', headerName: 'Data source', width: 130, align: 'center', headerAlign: 'center' },
        {
            field: 'columnNames',
            headerName: 'Tên cột',
            flex: 1,
            minWidth: 220,
            renderCell: (params) => Array.isArray(params.value) ? params.value.join(', ') : '',
        },
        { field: 'statusText', headerName: 'Trạng thái', width: 120, align: 'center', headerAlign: 'center' },
    ];

    const resetForm = (): void => {
        setForm(INITIAL_FORM);
        setEditingId(null);
        setError('');
        setActiveColumnTab(0);
    };

    const handleCreateOrUpdate = async (): Promise<void> => {
        const normalizedTitle = form.title.trim();
        const normalizedId = editingId ?? toSlug(form.id || normalizedTitle);

        if (!normalizedTitle) {
            setError('Vui lòng nhập tên menu.');
            return;
        }

        if (!normalizedId) {
            setError('Mã menu không hợp lệ. Chỉ dùng chữ cái, số và dấu gạch ngang.');
            return;
        }

        const duplicate = items.some((item) => item.id === normalizedId && item.id !== editingId);
        if (duplicate) {
            setError('Mã menu đã tồn tại. Vui lòng đổi mã khác.');
            return;
        }

        const safeColumnCount = normalizeColumnCount(form.columnCount);
        const safeColumnNames = normalizeColumnNames(safeColumnCount, form.columnNames);
        const safeDataSource = form.dataSource || 'employee';
        const safeColumnKeys = normalizeColumnKeys(safeDataSource, safeColumnCount, form.columnKeys);

        const nextItem = createDynamicMenuItem(
            normalizedId,
            normalizedTitle,
            normalizeGridCount(form.gridCount),
            form.path,
            form.icon,
            safeDataSource,
            safeColumnCount,
            safeColumnNames,
            safeColumnKeys,
        );

        try {
            if (editingId) {
                const current = items.find((item) => item.id === editingId);
                await updateItem({ ...nextItem, enabled: current?.enabled ?? true });
                resetForm();
                return;
            }

            await createItem(nextItem);
            resetForm();
        } catch (err) {
            setError((err as Error)?.message || 'Không thể lưu menu động');
        }
    };

    const handleEdit = (row: DynamicMenuConfigItem): void => {
        setEditingId(row.id);
        setForm({
            id: row.id,
            title: row.title,
            path: row.path,
            icon: row.icon || 'Assignment',
            dataSource: row.dataSource || 'employee',
            gridCount: row.gridCount,
            columnCount: row.columnCount || 4,
            columnNames: row.columnNames?.length ? row.columnNames : normalizeColumnNames(row.columnCount || 4),
            columnKeys: row.columnKeys?.length
                ? row.columnKeys
                : getDefaultKeys(row.dataSource || 'employee', row.columnCount || 4),
        });
        setActiveColumnTab(0);
        setError('');
    };

    const handleColumnCountChange = (value: number): void => {
        const safeCount = normalizeColumnCount(value || 1);
        setForm((prev) => ({
            ...prev,
            columnCount: safeCount,
            columnNames: normalizeColumnNames(safeCount, prev.columnNames),
            columnKeys: normalizeColumnKeys(prev.dataSource, safeCount, prev.columnKeys),
        }));
        setActiveColumnTab((prev) => Math.min(prev, safeCount - 1));
    };

    const handleAddColumnTab = (): void => {
        const nextCount = normalizeColumnCount(form.columnCount + 1);
        if (nextCount === form.columnCount) return;
        const nextNames = normalizeColumnNames(nextCount, [...form.columnNames, `Cot ${nextCount}`]);
        const nextKeys = normalizeColumnKeys(form.dataSource, nextCount, [...form.columnKeys, 'id']);
        setForm((prev) => ({ ...prev, columnCount: nextCount, columnNames: nextNames, columnKeys: nextKeys }));
        setActiveColumnTab(nextCount - 1);
    };

    const handleRemoveColumnTab = (index: number): void => {
        if (form.columnCount <= 1) return;
        const nextNames = form.columnNames.filter((_, idx) => idx !== index);
        const nextKeys = form.columnKeys.filter((_, idx) => idx !== index);
        const nextCount = normalizeColumnCount(form.columnCount - 1);
        const normalized = normalizeColumnNames(nextCount, nextNames);
        const normalizedKeys = normalizeColumnKeys(form.dataSource, nextCount, nextKeys);
        setForm((prev) => ({ ...prev, columnCount: nextCount, columnNames: normalized, columnKeys: normalizedKeys }));
        setActiveColumnTab((prev) => Math.min(prev, nextCount - 1));
    };

    const handleColumnNameChange = (index: number, value: string): void => {
        setForm((prev) => {
            const next = [...prev.columnNames];
            next[index] = value;
            return { ...prev, columnNames: next };
        });
    };

    const handleColumnKeyChange = (index: number, value: string): void => {
        setForm((prev) => {
            const next = [...prev.columnKeys];
            next[index] = value;
            return { ...prev, columnKeys: next };
        });
    };

    const handleDataSourceChange = (event: SelectChangeEvent): void => {
        const nextSource = event.target.value;
        setForm((prev) => {
            const sourceData = dataSources.find((s) => s.sourceKey === nextSource);
            const defaultKeys = sourceData && sourceData.fields.length > 0
                ? Array.from({ length: prev.columnCount }, (_, i) =>
                    sourceData.fields[i]?.key ?? sourceData.fields[0]?.key ?? 'id')
                : getDefaultKeys(nextSource, prev.columnCount);

            return {
                ...prev,
                dataSource: nextSource,
                columnKeys: normalizeColumnKeys(nextSource, prev.columnCount, defaultKeys),
            };
        });
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
        } catch (err) {
            setError((err as Error)?.message || 'Không thể cập nhật trạng thái menu');
        }
    };

    const handleDelete = async (id: string): Promise<void> => {
        try {
            await deleteItem(id);
            if (editingId === id) {
                resetForm();
            }
        } catch (err) {
            setError((err as Error)?.message || 'Không thể xóa menu động');
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
                <Typography variant="h4" fontWeight={700}>Cấu hình menu động trên Sidebar</Typography>
                <Typography variant="body2" color="text.secondary">
                    Mỗi menu động sẽ tạo 1 route dạng /menu-dong/ma-menu và hiển thị số DataGrid theo cấu hình.
                </Typography>

                {loadError && <Alert severity="error">{loadError}</Alert>}
                {error && <Alert severity="warning">{error}</Alert>}

                <Card>
                    <CardContent>
                        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                            <TextField
                                label="Tên menu"
                                value={form.title}
                                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Mã menu"
                                value={form.id}
                                onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
                                helperText={editingId ? 'Không cho đổi mã menu khi đang sửa (để giữ ID bản ghi)' : 'Để trống thì hệ thống tự sinh từ tên menu'}
                                disabled={Boolean(editingId)}
                                fullWidth
                            />
                            <TextField
                                label="Đường dẫn menu"
                                value={form.path}
                                onChange={(e) => setForm((prev) => ({ ...prev, path: e.target.value }))}
                                helperText="Ví dụ: /menu/bao-cao-1 hoặc /menu-phong-ban"
                                fullWidth
                            />
                            <TextField
                                type="number"
                                label="Số DataGrid"
                                inputProps={{ min: 1, max: 6 }}
                                value={form.gridCount}
                                onChange={(e) => setForm((prev) => ({ ...prev, gridCount: Number(e.target.value) || 1 }))}
                                sx={{ minWidth: 160 }}
                            />
                            <Select
                                value={form.dataSource}
                                onChange={handleDataSourceChange}
                                sx={{ minWidth: 160 }}
                                size="small"
                            >
                                {sourceOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </Select>
                            <TextField
                                type="number"
                                label="Số cột / DataGrid"
                                inputProps={{ min: 1, max: 12 }}
                                value={form.columnCount}
                                onChange={(e) => handleColumnCountChange(Number(e.target.value) || 1)}
                                sx={{ minWidth: 160 }}
                            />
                        </Stack>

                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Cấu hình tên cột theo tab</Typography>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <Tabs
                                    value={activeColumnTab}
                                    onChange={(_, next) => setActiveColumnTab(next)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    sx={{ minHeight: 36 }}
                                >
                                    {Array.from({ length: form.columnCount }, (_, index) => (
                                        <Tab
                                            key={`col-tab-${index}`}
                                            label={(form.columnNames[index] || '').trim() || `Cột ${index + 1}`}
                                            sx={{ minHeight: 36, textTransform: 'none' }}
                                        />
                                    ))}
                                </Tabs>
                                <IconButton size="small" onClick={handleAddColumnTab} disabled={form.columnCount >= 12}>
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ width: '100%' }}>
                                    <TextField
                                        fullWidth
                                        label={`Tên cột #${activeColumnTab + 1}`}
                                        value={form.columnNames[activeColumnTab] ?? ''}
                                        onChange={(e) => handleColumnNameChange(activeColumnTab, e.target.value)}
                                        helperText={`Đang cấu hình ${form.columnCount} cột cho mỗi DataGrid`}
                                    />
                                    <Select
                                        value={activeColumnKeyValue}
                                        onChange={(e) => handleColumnKeyChange(activeColumnTab, e.target.value)}
                                        size="small"
                                        sx={{ minWidth: 220 }}
                                    >
                                        {activeFieldOptions.map((field) => (
                                            <MenuItem key={field.key} value={field.key}>
                                                {field.label} ({field.key})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Stack>
                                <IconButton
                                    color="error"
                                    onClick={() => handleRemoveColumnTab(activeColumnTab)}
                                    disabled={form.columnCount <= 1}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </Stack>
                        </Box>

                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Icon menu</Typography>
                            <Button
                                variant="outlined"
                                onClick={(e) => setIconPickerAnchorEl(e.currentTarget)}
                                sx={{
                                    justifyContent: 'space-between',
                                    minWidth: 260,
                                    textTransform: 'none',
                                }}
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

                        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                            <Button variant="contained" onClick={() => void handleCreateOrUpdate()} disabled={loading}>
                                {editingId ? 'Cập nhật menu' : 'Thêm menu'}
                            </Button>
                            {editingId && (
                                <Button variant="outlined" onClick={resetForm}>Hủy sửa</Button>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Danh sách menu động</Typography>
                        <Box sx={{ height: 360 }}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                loading={loading}
                                disableRowSelectionOnClick
                                onRowClick={(params) => handleEdit(params.row as DynamicMenuConfigItem)}
                                pageSizeOptions={[5, 10, 20]}
                            />
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={1.5}>
                            {items.map((item) => (
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
                                            {item.path} - {item.gridCount} DataGrid - {item.columnCount || 4} cột/Grid - source: {item.dataSource || 'employee'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Cột: {(item.columnNames?.length ? item.columnNames : normalizeColumnNames(item.columnCount || 4)).join(', ')}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Keys: {(item.columnKeys?.length ? item.columnKeys : normalizeColumnKeys(normalizeDataSource(item.dataSource), item.columnCount || 4)).join(', ')}
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
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>
        </Box>
    );
};

export default CauHinhMenuDong;
