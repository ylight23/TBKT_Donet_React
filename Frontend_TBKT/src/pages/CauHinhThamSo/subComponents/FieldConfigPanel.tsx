import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import ListIcon from '@mui/icons-material/List';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import StorageIcon from '@mui/icons-material/Storage';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { FIELD_TYPES } from '../constants';
import { FieldType, FieldValidation } from '../types';

interface FieldConfigPanelProps {
    field: DynamicField;
    onSave: (field: DynamicField) => void;
    onClose: () => void;
}

const FieldConfigPanel: React.FC<FieldConfigPanelProps> = ({ field, onSave, onClose }) => {
    const [draft, setDraft] = useState<DynamicField>(field);
    const [activePanel, setActivePanel] = useState(0);
    const supportsOptionSource = draft.type === 'select' || draft.type === 'radio' || draft.type === 'checkboxGroup';

    const updateValidation = (key: keyof FieldValidation, value: any) => {
        setDraft((prev) => ({
            ...prev,
            validation: { ...(prev.validation || {}), [key]: value },
        }));
    };

    const handleAddOption = () => {
        const currentOptions = (draft.validation as FieldValidation).options || [];
        updateValidation('options', [...currentOptions, `Lựa chọn ${currentOptions.length + 1}`]);
    };

    const handleUpdateOption = (index: number, value: string) => {
        const currentOptions = [...((draft.validation as FieldValidation).options || [])];
        currentOptions[index] = value;
        updateValidation('options', currentOptions);
    };

    const handleRemoveOption = (index: number) => {
        const currentOptions = (draft.validation as FieldValidation).options || [];
        updateValidation('options', currentOptions.filter((_, i) => i !== index));
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
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
                    <Tab
                        icon={<StorageIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Dữ liệu"
                        disabled={!supportsOptionSource}
                    />
                </Tabs>

                {activePanel === 0 && (
                    <Stack spacing={2}>
                        <TextField
                            label="Nhãn hiển thị"
                            size="small"
                            value={draft.label}
                            onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
                        />

                        <TextField
                            label="Key"
                            size="small"
                            value={draft.key}
                            onChange={(event) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    key: event.target.value.replace(/\s+/g, '_').toLowerCase(),
                                }))
                            }
                        />

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

                        {draft.type === 'select' && (
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Kiểu hiển thị"
                                value={(draft.validation as FieldValidation).displayType ?? 'dropdown'}
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
                        )}
                    </Stack>
                )}

                {activePanel === 1 && supportsOptionSource && (() => {
                    const validation = draft.validation as FieldValidation;
                    return (
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
                                        label="Endpoint API"
                                        size="small"
                                        fullWidth
                                        placeholder="https://api.example.com/data"
                                        value={validation.apiUrl ?? ''}
                                        onChange={(e) => updateValidation('apiUrl', e.target.value)}
                                        helperText="URL API trả về mảng danh sách các lựa chọn."
                                    />
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
                    );
                })()}

                <Stack spacing={2} sx={{ mt: 3 }}>
                    <Divider />
                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={() => onSave(draft)} fullWidth size="large">
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
