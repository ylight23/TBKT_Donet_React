import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import { useSelector } from 'react-redux';
import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import ListIcon from '@mui/icons-material/List';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import StorageIcon from '@mui/icons-material/Storage';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { FIELD_TYPES } from '../constants';
import { FieldType, FieldValidation } from '../types';
import type { DanhMucChuyenNganhOption } from '../../../apis/danhmucChuyenNganhApi';
import { DYNAMIC_OPTION_API_HINTS } from '../../../apis/dynamicOptionApi';
import type { RootState } from '../../../store';

const GRID_RENDER_OPTIONS = [
    { value: 'text', label: 'Văn bản thường' },
    { value: 'badge', label: 'Nhãn màu (badge)' },
    { value: 'date', label: 'Ngày tháng' },
    { value: 'currency', label: 'Số tiền' },
    { value: 'boolean', label: 'Có / Không' },
] as const;

const GRID_WIDTH_OPTIONS = [
    { value: 'narrow', label: 'Hẹp' },
    { value: 'medium', label: 'Vừa' },
    { value: 'wide', label: 'Rộng' },
    { value: 'xwide', label: 'Rất rộng' },
] as const;

const FIELD_KEY_PRESETS = [
    {
        id: 'ma_danh_muc',
        title: 'Mã danh mục',
        key: 'ma_danh_muc',
        label: 'Mã danh mục trang bị',
        type: 'select' as FieldType,
        disabled: false,
        validation: {
            dataSource: 'api' as const,
            apiUrl: '/DanhMucTrangBi.DanhMucTrangBiService/GetListTree',
            displayType: 'tree' as const,
            options: undefined,
        },
    },
    {
        id: 'ten_danh_muc',
        title: 'Tên danh mục',
        key: 'ten_danh_muc',
        label: 'Tên danh mục trang bị',
        type: 'text' as FieldType,
        disabled: true,
        validation: {},
    },
    {
        id: 'id_cap_tren',
        title: 'Mã cấp trên',
        key: 'id_cap_tren',
        label: 'Mã cấp trên',
        type: 'text' as FieldType,
        disabled: true,
        validation: {},
    },
];
const YEAR_FIELD_PRESET = {
    min: 1900,
    max: new Date().getFullYear() + 100,
};

interface FieldConfigPanelProps {
    field: DynamicField;
    onSave: (field: DynamicField) => void;
    onClose: () => void;
    cnOptions?: DanhMucChuyenNganhOption[];
    keyEditable?: boolean;
}

const FieldConfigPanel: React.FC<FieldConfigPanelProps> = ({
    field,
    onSave,
    onClose,
    cnOptions = [],
    keyEditable = false,
}) => {
    const visibleCNs = useSelector((state: RootState) => state.permissionReducer.visibleCNs);
    const [draft, setDraft] = useState<DynamicField>(field);
    const [activePanel, setActivePanel] = useState(0);
    const [cnError, setCnError] = useState('');
    const [keyError, setKeyError] = useState('');
    const [keyTouched, setKeyTouched] = useState(false);
    const supportsOptionSource = draft.type === 'select' || draft.type === 'radio' || draft.type === 'checkboxGroup';
    const visibleCnSet = useMemo(() => new Set(visibleCNs), [visibleCNs]);
    const allowedCnOptions = useMemo(
        () => (visibleCNs.length === 0
            ? cnOptions
            : cnOptions.filter((cn) => visibleCnSet.has(cn.id))),
        [cnOptions, visibleCNs.length, visibleCnSet],
    );
    const validation = draft.validation as FieldValidation;

    const updateValidation = useCallback((key: keyof FieldValidation, value: any) => {
        setDraft((prev) => ({
            ...prev,
            validation: { ...(prev.validation || {}), [key]: value },
        }));
    }, []);

    const updateGridUserConfig = useCallback((nextPartial: Partial<NonNullable<DynamicField['gridUserConfig']>>) => {
        setDraft((prev) => ({
            ...prev,
            gridUserConfig: {
                showInGrid: prev.gridUserConfig?.showInGrid ?? false,
                displayOrder: prev.gridUserConfig?.displayOrder ?? 9999,
                displayLabel: prev.gridUserConfig?.displayLabel ?? '',
                ...nextPartial,
            },
        }));
    }, []);

    const updateGridTechConfig = useCallback((nextPartial: Partial<NonNullable<DynamicField['gridTechConfig']>>) => {
        setDraft((prev) => ({
            ...prev,
            gridTechConfig: {
                renderType: prev.gridTechConfig?.renderType ?? 'text',
                widthPreset: prev.gridTechConfig?.widthPreset ?? 'medium',
                sortable: prev.gridTechConfig?.sortable ?? true,
                filterable: prev.gridTechConfig?.filterable ?? true,
                ...nextPartial,
            },
        }));
    }, []);

    const normalizeFieldKey = useCallback((raw: string): string => {
        const lowered = (raw || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
        return lowered
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .replace(/_+/g, '_');
    }, []);

    const applyYearValidationPreset = useCallback(() => {
        setDraft((prev) => ({
            ...prev,
            type: 'number',
            validation: {
                ...(prev.validation || {}),
                min: YEAR_FIELD_PRESET.min,
                max: YEAR_FIELD_PRESET.max,
            },
        }));
    }, []);

    const applyFieldKeyPreset = useCallback((preset: typeof FIELD_KEY_PRESETS[number]) => {
        setDraft((prev) => ({
            ...prev,
            key: preset.key,
            label: (!prev.label || !keyTouched) ? preset.label : prev.label,
            type: preset.type,
            disabled: preset.disabled || undefined,
            validation: {
                ...(preset.type === prev.type ? prev.validation : {}),
                ...preset.validation,
            },
        }));
        setKeyTouched(true);
        setKeyError('');
    }, [keyTouched]);

    const handleAddOption = () => {
        const currentOptions = validation.options || [];
        updateValidation('options', [...currentOptions, `Lựa chọn ${currentOptions.length + 1}`]);
    };

    const handleUpdateOption = (index: number, value: string) => {
        const currentOptions = [...(validation.options || [])];
        currentOptions[index] = value;
        updateValidation('options', currentOptions);
    };

    const handleRemoveOption = (index: number) => {
        const currentOptions = validation.options || [];
        updateValidation('options', currentOptions.filter((_, i) => i !== index));
    };

    useEffect(() => {
        setCnError('');
    }, [draft.cnIds, visibleCNs]);

    useEffect(() => {
        setKeyTouched(false);
    }, [field.id]);

    const handleSave = () => {
        const normalizedKey = normalizeFieldKey(draft.key || '');
        if (!normalizedKey) {
            setKeyError('Key khong hop le. Chi duoc dung chu thuong, so va dau _.');
            return;
        }

        const requestedCnIds = (draft.cnIds ?? []).filter(Boolean);
        if (visibleCNs.length > 0) {
            const invalidCnIds = requestedCnIds.filter((cnId) => !visibleCnSet.has(cnId));
            if (invalidCnIds.length > 0) {
                setCnError(`Khong duoc gan field cho chuyen nganh ngoai pham vi: ${invalidCnIds.join(', ')}`);
                return;
            }
        }

        setCnError('');
        setKeyError('');
        onSave({ ...draft, key: normalizedKey });
    };

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={800} color="primary">
                        Cấu hình trường
                    </Typography>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>

                <Tabs
                    value={activePanel}
                    onChange={(_, v) => setActivePanel(v)}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                >
                    <Tab icon={<InfoIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Cấu hình" />
                    <Tab icon={<ViewWeekIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Hiển thị bảng" />
                    <Tab
                        icon={<StorageIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Dữ liệu"
                        disabled={!supportsOptionSource}
                    />
                </Tabs>

                {activePanel === 0 && (
                    <Stack spacing={2}>
                        {cnError && <Alert severity="warning">{cnError}</Alert>}
                        {keyError && <Alert severity="warning">{keyError}</Alert>}
                        <TextField
                            label="Nhãn hiển thị"
                            size="small"
                            value={draft.label}
                            onChange={(event) => {
                                const nextLabel = event.target.value;
                                setDraft((prev) => {
                                    const next = { ...prev, label: nextLabel };
                                    if (keyEditable && !keyTouched) {
                                        next.key = normalizeFieldKey(nextLabel);
                                    }
                                    return next;
                                });
                            }}
                        />

                        <TextField
                            label="Key"
                            size="small"
                            value={draft.key}
                            onChange={(event) => {
                                const nextKey = normalizeFieldKey(event.target.value);
                                setDraft((prev) => ({
                                    ...prev,
                                    key: nextKey,
                                }));
                                setKeyTouched(true);
                                if (keyError) setKeyError('');
                            }}
                            onBlur={() => {
                                const normalized = normalizeFieldKey(draft.key || '');
                                if (normalized !== draft.key) {
                                    setDraft((prev) => ({ ...prev, key: normalized }));
                                }
                            }}
                            helperText="Chi dung chu thuong (a-z), so (0-9) va dau _"
                            disabled={!keyEditable}
                        />

                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>
                                Preset field hệ thống
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {FIELD_KEY_PRESETS.map((preset) => (
                                    <Chip
                                        key={preset.id}
                                        size="small"
                                        label={preset.title}
                                        variant={draft.key === preset.key ? 'filled' : 'outlined'}
                                        color={draft.key === preset.key ? 'primary' : 'default'}
                                        onClick={() => applyFieldKeyPreset(preset)}
                                        sx={{ fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                    />
                                ))}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                                Bấm để tự điền key chuẩn và cấu hình mặc định cho mã danh mục, tên danh mục hoặc mã cấp trên.
                            </Typography>
                        </Box>

                        <TextField
                            select
                            label="Kiểu nhập liệu"
                            size="small"
                            value={draft.type}
                            onChange={(event) => {
                                const nextType = event.target.value as FieldType;
                                setDraft((prev) => ({
                                    ...prev,
                                    type: nextType,
                                    validation: prev.type === nextType
                                        ? prev.validation
                                        : (nextType === 'select' || nextType === 'radio' || nextType === 'checkboxGroup'
                                            ? {
                                                dataSource: 'manual',
                                                displayType: nextType === 'select' ? 'dropdown' : undefined,
                                                options: [],
                                            }
                                            : {}),
                                }));
                            }}
                        >
                            {FIELD_TYPES.map((typeItem) => (
                                <MenuItem key={typeItem.value} value={typeItem.value}>
                                    {typeItem.icon} {typeItem.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={draft.required}
                                    onChange={(_, checked) => setDraft((prev) => ({ ...prev, required: checked }))}
                                />
                            }
                            label="Trường bắt buộc"
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={Boolean(draft.disabled)}
                                    onChange={(_, checked) => setDraft((prev) => ({ ...prev, disabled: checked || undefined }))}
                                />
                            }
                            label="Khóa người dùng nhập"
                        />

                        {/* CN tags */}
                        {allowedCnOptions.length > 0 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                    Chuyên ngành
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {allowedCnOptions.map((cn) => {
                                        const selected = draft.cnIds?.includes(cn.id) ?? false;
                                        return (
                                            <Chip
                                                key={cn.id}
                                                size="small"
                                                label={cn.vietTat || cn.ten}
                                                onClick={() => {
                                                    setDraft((prev) => {
                                                        const current = prev.cnIds ?? [];
                                                        const next = selected
                                                            ? current.filter((id) => id !== cn.id)
                                                            : [...current, cn.id];
                                                        return { ...prev, cnIds: next.length > 0 ? next : undefined };
                                                    });
                                                }}
                                                sx={{
                                                    cursor: 'pointer',
                                                    fontSize: 11,
                                                    fontWeight: selected ? 700 : 400,
                                                    bgcolor: selected ? 'info.main' : undefined,
                                                    color: selected ? 'info.contrastText' : undefined,
                                                    '&:hover': { bgcolor: selected ? 'info.dark' : 'action.hover' },
                                                }}
                                                variant={selected ? 'filled' : 'outlined'}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}

                        {draft.type === 'select' && (
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Kiểu hiển thị"
                                value={validation.displayType ?? 'dropdown'}
                                onChange={(e) => updateValidation('displayType', e.target.value)}
                            >
                                <MenuItem value="dropdown">Dropdown (Danh sách thả xuống)</MenuItem>
                                <MenuItem value="autocomplete">Autocomplete / tìm kiếm</MenuItem>
                                <MenuItem value="tabs">Tabs (Dải nút ngăn cách)</MenuItem>
                                <MenuItem value="tree">Hệ thống cây (Tree)</MenuItem>
                            </TextField>
                        )}

                        <Divider />
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            Cấu hình validate
                        </Typography>

                        {(draft.type === 'text' || draft.type === 'textarea') && (
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField
                                    label="Min length"
                                    type="number"
                                    size="small"
                                    value={draft.validation.minLength ?? ''}
                                    onChange={(event) =>
                                        updateValidation(
                                            'minLength',
                                            event.target.value === '' ? undefined : Number(event.target.value),
                                        )
                                    }
                                    fullWidth
                                />
                                <TextField
                                    label="Max length"
                                    type="number"
                                    size="small"
                                    value={draft.validation.maxLength ?? ''}
                                    onChange={(event) =>
                                        updateValidation(
                                            'maxLength',
                                            event.target.value === '' ? undefined : Number(event.target.value),
                                        )
                                    }
                                    fullWidth
                                />
                            </Stack>
                        )}

                        {draft.type === 'number' && (
                            <Stack spacing={1.25}>
                                <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        label={`Preset năm ${YEAR_FIELD_PRESET.min}-${YEAR_FIELD_PRESET.max}`}
                                        onClick={applyYearValidationPreset}
                                        sx={{ fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Dùng cho năm sản xuất, niên hạn, hạn sử dụng để form có thông báo khoảng năm hợp lệ.
                                    </Typography>
                                </Stack>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                    <TextField
                                        label="Min"
                                        type="number"
                                        size="small"
                                        value={draft.validation.min ?? ''}
                                        onChange={(event) =>
                                            updateValidation('min', event.target.value === '' ? undefined : Number(event.target.value))
                                        }
                                        fullWidth
                                    />
                                    <TextField
                                        label="Max"
                                        type="number"
                                        size="small"
                                        value={draft.validation.max ?? ''}
                                        onChange={(event) =>
                                            updateValidation('max', event.target.value === '' ? undefined : Number(event.target.value))
                                        }
                                        fullWidth
                                    />
                                </Stack>
                            </Stack>
                        )}
                    </Stack>
                )}

                {activePanel === 1 && (
                    <Stack spacing={2}>
                        <FormControlLabel
                            control={(
                                <Checkbox
                                    checked={Boolean(draft.gridUserConfig?.showInGrid)}
                                    onChange={(_, checked) => updateGridUserConfig({ showInGrid: checked })}
                                />
                            )}
                            label="Hiển thị cột trong DataGrid"
                        />

                        <TextField
                            label="Thứ tự hiển thị"
                            type="number"
                            size="small"
                            value={draft.gridUserConfig?.displayOrder ?? 9999}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                updateGridUserConfig({
                                    displayOrder: Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 9999,
                                });
                            }}
                            helperText="Số nhỏ hơn sẽ hiển thị trước."
                        />

                        <TextField
                            label="Nhãn cột hiển thị (tùy chọn)"
                            size="small"
                            value={draft.gridUserConfig?.displayLabel ?? ''}
                            onChange={(event) => updateGridUserConfig({ displayLabel: event.target.value })}
                            helperText="Để trống để dùng nhãn gốc của trường."
                        />

                        <TextField
                            select
                            label="Kiểu hiển thị"
                            size="small"
                            value={draft.gridTechConfig?.renderType ?? 'text'}
                            onChange={(event) =>
                                updateGridTechConfig({
                                    renderType: event.target.value as any,
                                })
                            }
                        >
                            {GRID_RENDER_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Độ rộng cột"
                            size="small"
                            value={draft.gridTechConfig?.widthPreset ?? 'medium'}
                            onChange={(event) =>
                                updateGridTechConfig({
                                    widthPreset: event.target.value as any,
                                })
                            }
                        >
                            {GRID_WIDTH_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                            <FormControlLabel
                                control={(
                                    <Checkbox
                                        checked={draft.gridTechConfig?.sortable ?? true}
                                        onChange={(_, checked) => updateGridTechConfig({ sortable: checked })}
                                    />
                                )}
                                label="Cho phép sắp xếp"
                            />
                            <FormControlLabel
                                control={(
                                    <Checkbox
                                        checked={draft.gridTechConfig?.filterable ?? true}
                                        onChange={(_, checked) => updateGridTechConfig({ filterable: checked })}
                                    />
                                )}
                                label="Cho phép lọc"
                            />
                        </Stack>
                    </Stack>
                )}

                {activePanel === 2 && supportsOptionSource && (
                        <Stack spacing={2}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Nguồn dữ liệu lựa chọn"
                                value={validation.dataSource ?? 'manual'}
                                onChange={(e) => {
                                    const nextSource = e.target.value as FieldValidation['dataSource'];
                                    setDraft((prev) => ({
                                        ...prev,
                                        validation: {
                                            ...(prev.validation || {}),
                                            dataSource: nextSource,
                                            apiUrl: nextSource === 'api' ? prev.validation.apiUrl ?? '' : undefined,
                                            options: nextSource === 'manual' ? prev.validation.options ?? [] : undefined,
                                            displayType: nextSource === 'country' && prev.type === 'select'
                                                ? 'dropdown'
                                                : prev.validation.displayType,
                                        },
                                    }));
                                }}
                            >
                                <MenuItem value="manual">Nhập thủ công</MenuItem>
                                <MenuItem value="api">API Backend</MenuItem>
                                <MenuItem value="country">react-country-region-selector</MenuItem>
                            </TextField>

                            {validation.dataSource === 'api' ? (
                                <Stack spacing={2}>
                                    <TextField
                                        label="Endpoint service"
                                        size="small"
                                        fullWidth
                                        placeholder="/Office.OfficeService/GetListOffice"
                                        value={validation.apiUrl ?? ''}
                                        onChange={(e) => updateValidation('apiUrl', e.target.value)}
                                        helperText="Nhap truc tiep endpoint gRPC cua service. Vi du: /Office.OfficeService/GetListOffice hoac /DanhMucTrangBi.DanhMucTrangBiService/GetListTree"
                                    />
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                        {DYNAMIC_OPTION_API_HINTS.map((hint) => (
                                            <Chip
                                                key={hint}
                                                size="small"
                                                label={hint}
                                                variant="outlined"
                                                onClick={() => updateValidation('apiUrl', hint)}
                                                sx={{ fontSize: 11, cursor: 'pointer' }}
                                            />
                                        ))}
                                    </Box>
                                    <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'info.main' + '08' }}>
                                        <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PlayArrowIcon fontSize="inherit" /> Dữ liệu sẽ được tải động khi mở Form.
                                        </Typography>
                                    </Box>
                                </Stack>
                            ) : validation.dataSource === 'country' ? (
                                <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'success.main' + '08' }}>
                                    <Typography variant="body2" fontWeight={700} color="success.dark" sx={{ mb: 0.5 }}>
                                        Danh sách quốc gia dùng `react-country-region-selector`
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Trường này sẽ render bằng popover tìm kiếm lấy dữ liệu từ `react-country-region-selector`, có hiển thị cờ quốc gia và phù hợp cho nước xuất xứ, quốc gia sản xuất, quốc tịch hoặc nước đăng ký.
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                        <Typography variant="subtitle2" fontWeight={800}>
                                            Danh sách giá trị ({(validation.options ?? []).length})
                                        </Typography>
                                        <Button startIcon={<AddIcon />} size="small" variant="outlined" onClick={handleAddOption}>
                                            Thêm giá trị
                                        </Button>
                                    </Stack>

                                    <Stack spacing={1}>
                                        {(validation.options ?? []).map((opt, idx) => (
                                            <Box
                                                key={`opt-${idx}`}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    p: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 2.5,
                                                    bgcolor: 'background.paper',
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 24, color: 'text.disabled' }}>
                                                    {idx + 1}.
                                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    placeholder="Nhập giá trị..."
                                    value={opt}
                                    onChange={(e) => handleUpdateOption(idx, e.target.value)}
                                    InputProps={{ sx: { fontWeight: 600 } }}
                                />
                                                <IconButton size="small" color="error" onClick={() => handleRemoveOption(idx)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                        {(validation.options ?? []).length === 0 && (
                                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 2.5}}>
                                                Chưa có dữ liệu. Hãy nhấn "Thêm giá trị".
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>
                            )}
                        </Stack>
                )}

                <Stack spacing={2} sx={{ mt: 3, position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 1 }}>
                    <Divider />
                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={handleSave} fullWidth size="large">
                            Lưu cấu hình
                        </Button>
                        <Button variant="outlined" onClick={onClose} size="large">
                            Bỏ qua
                        </Button>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default FieldConfigPanel;
