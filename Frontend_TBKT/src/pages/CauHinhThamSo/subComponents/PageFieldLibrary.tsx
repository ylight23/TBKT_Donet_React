import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { nameToIcon } from '../../../utils/thamSoUtils';
import { FieldSet } from '../types';
import { hasValidationRules, typeOf } from '../utils';
import FieldConfigPanel from './FieldConfigPanel';
import FieldSetEditorDialog from './FieldSetEditorDialog';

interface PageFieldLibraryProps {
    fields: DynamicField[];
    setFields: React.Dispatch<React.SetStateAction<DynamicField[]>>;
    fieldSets: FieldSet[];
    setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
}

const PageFieldLibrary: React.FC<PageFieldLibraryProps> = ({
    fields,
    setFields,
    fieldSets,
    setFieldSets,
}) => {
    const [search, setSearch] = useState('');
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

    const [editingSet, setEditingSet] = useState<FieldSet | null>(null);
    const [isNewSetMode, setIsNewSetMode] = useState(false);

    const filteredFields = useMemo(
        () =>
            fields.filter(
                (field) =>
                    field.label.toLowerCase().includes(search.toLowerCase()) ||
                    field.key.toLowerCase().includes(search.toLowerCase()),
            ),
        [fields, search],
    );

    const editingField = editingFieldId ? fields.find((field) => field.id === editingFieldId) : undefined;

    const handleAddField = () => {
        const id = `field_${Math.random().toString(36).slice(2, 9)}`;
        const newField: DynamicField = {
            id,
            key: `truong_${fields.length + 1}`,
            label: 'Trường mới',
            type: 'text',
            required: false,
            validation: {},
        };

        setFields((prev) => [...prev, newField]);
        setEditingFieldId(id);
    };

    const handleSaveField = (nextField: DynamicField) => {
        setFields((prev) => prev.map((field) => (field.id === nextField.id ? nextField : field)));
        setEditingFieldId(null);
    };

    const handleDeleteField = (fieldId: string) => {
        setFields((prev) => prev.filter((field) => field.id !== fieldId));
        setFieldSets((prev) =>
            prev.map((set) => ({
                ...set,
                fieldIds: set.fieldIds.filter((id) => id !== fieldId),
            })),
        );
        if (editingFieldId === fieldId) {
            setEditingFieldId(null);
        }
    };

    const handleCreateSet = () => {
        setIsNewSetMode(true);
        setEditingSet({
            id: `set_${Math.random().toString(36).slice(2, 9)}`,
            name: '',
            icon: nameToIcon('Assignment'),
            color: '#3b82f6',
            desc: '',
            fieldIds: [],
        });
    };

    const handleEditSet = (set: FieldSet) => {
        setIsNewSetMode(false);
        setEditingSet(set);
    };

    const handleSaveSet = (nextSet: FieldSet) => {
        if (isNewSetMode) {
            setFieldSets((prev) => [...prev, nextSet]);
        } else {
            setFieldSets((prev) => prev.map((set) => (set.id === nextSet.id ? nextSet : set)));
        }
        setEditingSet(null);
    };

    const handleDeleteSet = (setId: string) => {
        setFieldSets((prev) => prev.filter((set) => set.id !== setId));
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1.45fr 1fr' },
                gap: 2,
                height: '100%',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ overflowY: 'auto', pr: { lg: 0.5 } }}>
                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="primary">
                                    Thư viện trường dữ liệu
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {fields.length} trường đã định nghĩa
                                </Typography>
                            </Box>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddField}>
                                Thêm trường
                            </Button>
                        </Stack>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm theo nhãn hoặc key..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            sx={{ mb: 1.5 }}
                        />

                        <Stack spacing={1}>
                            {filteredFields.map((field, index) => {
                                const active = editingFieldId === field.id;
                                const fieldMeta = typeOf(field.type);
                                return (
                                    <Box
                                        key={field.id}
                                        sx={{
                                            p: 1,
                                            borderRadius: 2.5,
                                            border: '1px solid',
                                            borderColor: active ? 'primary.main' : 'divider',
                                            bgcolor: active ? 'action.selected' : 'background.paper',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => setEditingFieldId(active ? null : field.id)}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography variant="caption" color="text.secondary" sx={{ width: 20 }}>
                                                {index + 1}
                                            </Typography>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} noWrap>
                                                    {field.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {field.key}
                                                </Typography>
                                            </Box>

                                            <Chip
                                                size="small"
                                                icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: fieldMeta.color }}>{fieldMeta.icon}</Box> as any}
                                                label={fieldMeta.label}
                                                sx={{
                                                    bgcolor: `${fieldMeta.color}22`,
                                                    color: fieldMeta.color,
                                                }}
                                            />

                                            <Chip
                                                size="small"
                                                color={field.required ? 'error' : 'default'}
                                                label={field.required ? 'Bắt buộc' : 'Tuỳ chọn'}
                                                variant="outlined"
                                            />

                                            <Chip
                                                size="small"
                                                color={hasValidationRules(field) ? 'success' : 'default'}
                                                label={hasValidationRules(field) ? 'Validate' : '—'}
                                                variant="outlined"
                                            />

                                            <IconButton
                                                size="small"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleDeleteField(field.id);
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="primary">
                                    Bộ dữ liệu (Field Sets)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Nhóm trường dữ liệu để dùng khi tạo trang bị
                                </Typography>
                            </Box>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateSet}>
                                Tạo bộ mới
                            </Button>
                        </Stack>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                            {fieldSets.map((set) => (
                                <Card key={set.id} variant="outlined">
                                    <CardContent sx={{ p: 1.5 }}>
                                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', color: set.color }}>{set.icon}</Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} noWrap>
                                                    {set.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {set.desc}
                                                </Typography>
                                            </Box>
                                            <Chip size="small" label={`${set.fieldIds.length} trường`} />
                                        </Stack>

                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={1.25}>
                                            {set.fieldIds.slice(0, 4).map((fieldId) => {
                                                const field = fields.find((item) => item.id === fieldId);
                                                return field ? <Chip key={fieldId} size="small" label={field.label} variant="outlined" /> : null;
                                            })}
                                            {set.fieldIds.length > 4 && <Chip size="small" label={`+${set.fieldIds.length - 4}`} />}
                                        </Stack>

                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                fullWidth
                                                size="small"
                                                variant="outlined"
                                                startIcon={<EditIcon fontSize="small" />}
                                                onClick={() => handleEditSet(set)}
                                            >
                                                Sửa
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                                onClick={() => handleDeleteSet(set.id)}
                                            >
                                                Xoá
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <Box sx={{ overflowY: 'auto', pl: { lg: 0.5 } }}>
                {editingField ? (
                    <FieldConfigPanel
                        key={editingField.id}
                        field={editingField}
                        onSave={handleSaveField}
                        onClose={() => setEditingFieldId(null)}
                    />
                ) : (
                    <Card sx={{ height: '100%' }}>
                        <CardContent
                            sx={{
                                minHeight: 260,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <SettingsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">Chọn một trường để cấu hình chi tiết</Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            {editingSet && (
                <FieldSetEditorDialog
                    open={Boolean(editingSet)}
                    setData={editingSet}
                    allFields={fields}
                    onSave={handleSaveSet}
                    onClose={() => setEditingSet(null)}
                />
            )}
        </Box>
    );
};

export default PageFieldLibrary;
