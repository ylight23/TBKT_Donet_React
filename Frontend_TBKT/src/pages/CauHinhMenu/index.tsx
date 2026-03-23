import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
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
import { normalizeMenuPath, normalizePermissionCode } from '../../configs/dynamicMenuConfig';
import { useDynamicMenuConfig } from '../../hooks/useDynamicMenuConfig';
import type { DynamicMenuConfigItem } from '../../types/dynamicMenu';
import { nameToIcon } from '../../utils/thamSoUtils';
import thamSoApi, { type LocalTemplateLayout } from '../../apis/thamSoApi';
import LazyDataGrid from '../../components/LazyDataGrid';

interface FormState {
    id: string;
    title: string;
    path: string;
    icon: string;
    templateKey: string;
    permissionCode: string;
}

const INITIAL_FORM: FormState = {
    id: '',
    title: '',
    path: '',
    icon: 'Assignment',
    templateKey: '',
    permissionCode: '',
};

const toSlug = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const CauHinhMenuDong: React.FC = () => {
    const { items, loading, error: loadError, createItem, updateItem, deleteItem } = useDynamicMenuConfig();
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [templates, setTemplates] = useState<LocalTemplateLayout[]>([]);
    const [iconPickerAnchorEl, setIconPickerAnchorEl] = useState<HTMLElement | null>(null);

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

    const rows = useMemo(
        () => items.map((item) => ({
            ...item,
            statusText: item.enabled ? 'Bật' : 'Tắt',
            templateName: templates.find((t) => t.key === item.templateKey)?.name || item.templateKey || '—',
        })),
        [items, templates],
    );

    const columns: GridColDef[] = [
        { field: 'title', headerName: 'Tên menu', flex: 1.2, minWidth: 180 },
        { field: 'path', headerName: 'Đường dẫn', flex: 1.2, minWidth: 180 },
        { field: 'permissionCode', headerName: 'Mã quyền', flex: 1.1, minWidth: 180 },
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
        { field: 'statusText', headerName: 'Trạng thái', width: 120, align: 'center', headerAlign: 'center' },
    ];

    const resetForm = (): void => {
        setForm(INITIAL_FORM);
        setEditingId(null);
        setError('');
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

        const nextItem: DynamicMenuConfigItem = {
            id: normalizedId,
            title: normalizedTitle,
            path: normalizeMenuPath(form.path || '', normalizedId),
            active: `menuDong_${normalizedId}`,
            icon: (form.icon || 'Assignment').trim(),
            permissionCode: normalizePermissionCode(form.permissionCode, normalizedId),
            templateKey: form.templateKey.trim(),
            // Legacy fields kept for backward compat with existing data
            dataSource: 'employee',
            gridCount: 1,
            columnCount: 0,
            columns: [],
            enabled: true,
        };

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
            templateKey: row.templateKey || '',
            permissionCode: row.permissionCode || '',
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

                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                    <Typography variant="caption" color="text.disabled">Quy trình:</Typography>
                    {([
                        { label: '① Tạo template', color: 'text.secondary', tooltip: 'Vào Thiết kế giao diện (CauHinhTemplate) → tạo và đặt key cho template' },
                        { label: '② Ghi file (Export)', color: 'text.secondary', tooltip: 'Xuất template thành file JSON vào public/templates/ để hệ thống có thể đọc' },
                        { label: '③ Tạo menu → Chọn template', color: 'primary.main', tooltip: 'Tạo menu item tại đây → chọn đúng template key để áp dụng giao diện' },
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

                <Card>
                    <CardContent>
                        <Stack spacing={2}>
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
                                    helperText={editingId ? 'Không cho đổi mã menu khi đang sửa' : 'Để trống → tự sinh từ tên'}
                                    disabled={Boolean(editingId)}
                                    fullWidth
                                />
                                <TextField
                                    label="Đường dẫn menu"
                                    value={form.path}
                                    onChange={(e) => setForm((prev) => ({ ...prev, path: e.target.value }))}
                                    helperText="Ví dụ: /menu/bao-cao-1"
                                    fullWidth
                                />
                                <TextField
                                    label="Mã quyền"
                                    value={form.permissionCode}
                                    onChange={(e) => setForm((prev) => ({ ...prev, permissionCode: e.target.value }))}
                                    helperText="Để trống → tự sinh theo mã menu"
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
                                            <em>— Chưa chọn template —</em>
                                        </MenuItem>
                                        {templates.map((t) => (
                                            <MenuItem key={t.key} value={t.key}>
                                                {t.published ? '' : '[Draft] '}{t.name} ({t.key})
                                            </MenuItem>
                                        ))}
                                    </Select>
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
                                        <Typography variant="caption" color="text.secondary">Chọn icon</Typography>
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

                            <Stack direction="row" spacing={1.5}>
                                <Button variant="contained" onClick={() => void handleCreateOrUpdate()} disabled={loading}>
                                    {editingId ? 'Cập nhật menu' : 'Thêm menu'}
                                </Button>
                                {editingId && (
                                    <Button variant="outlined" onClick={resetForm}>Hủy sửa</Button>
                                )}
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Danh sách menu động</Typography>
                        <Box sx={{ height: 360 }}>
                            <LazyDataGrid
                                rows={rows}
                                columns={columns}
                                loading={loading}
                                disableRowSelectionOnClick
                                onRowClick={(params) => handleEdit(params.row as DynamicMenuConfigItem)}
                                pageSizeOptions={[5, 10, 20]}
                                fallbackRows={6}
                                fallbackCols={5}
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
                                            {item.path} — quyền: {item.permissionCode || '(chưa gán)'} — template: {templates.find((t) => t.key === item.templateKey)?.name || item.templateKey || '(chưa gán)'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}>
                                        {nameToIcon(item.icon || 'Assignment')}
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <FormControlLabel
                                            control={<Switch checked={item.enabled} onChange={() => void handleToggle(item.id)} />}
                                            label={item.enabled ? 'Bật' : 'Tắt'}
                                        />
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

export default CauHinhMenuDong;
