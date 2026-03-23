import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SettingsIcon from '@mui/icons-material/Settings';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { nameToIcon } from '../../../utils/thamSoUtils';
import { FieldSet } from '../types';
import { typeOf } from '../utils';
import FieldSetEditorDialog from './FieldSetEditorDialog';

interface PageDatasetsProps {
    fields: DynamicField[];
    fieldSets: FieldSet[];
    setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
    activeSetId: string | null;
    setActiveSetId: (id: string | null) => void;
}

const PageDatasets: React.FC<PageDatasetsProps> = ({ fields, fieldSets, setFieldSets, activeSetId, setActiveSetId }) => {
    const [search, setSearch] = useState('');
    const [editingSet, setEditingSet] = useState<FieldSet | null>(null);
    const [isNewMode, setIsNewMode] = useState(false);

    const activeSet = fieldSets.find((s) => s.id === activeSetId) ?? null;

    const filteredSets = useMemo(
        () => fieldSets.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
        [fieldSets, search],
    );

    const activeFields = useMemo(
        () => activeSet?.fields ?? [],
        [activeSet],
    );

    const attachFields = (fieldSet: FieldSet): FieldSet => ({
        ...fieldSet,
        fields: fieldSet.fieldIds
            .map((fieldId) => fields.find((field) => field.id === fieldId))
            .filter((field): field is DynamicField => Boolean(field)),
    });

    const handleCreate = () => {
        setIsNewMode(true);
        setEditingSet({
            id: `set_${Math.random().toString(36).slice(2, 9)}`,
            name: '',
            icon: nameToIcon('Assignment'),
            color: '#3b82f6',
            desc: '',
            fieldIds: [],
            fields: [],
        });
    };

    const handleSave = (next: FieldSet) => {
        const nextFieldSet = attachFields(next);
        if (isNewMode) {
            setFieldSets((prev) => [...prev, nextFieldSet]);
            setActiveSetId(nextFieldSet.id);
        } else {
            setFieldSets((prev) => prev.map((s) => (s.id === nextFieldSet.id ? nextFieldSet : s)));
        }
        setEditingSet(null);
    };

    const handleDelete = (setId: string) => {
        const next = fieldSets.filter((s) => s.id !== setId);
        setFieldSets(next);
        setActiveSetId(next[0]?.id ?? null);
    };

    const generateUniqueSetId = (existingSets: FieldSet[]): string => {
        let nextId = '';
        do {
            nextId = `set_${Math.random().toString(36).slice(2, 9)}`;
        } while (existingSets.some((set) => set.id === nextId));
        return nextId;
    };

    const generateDuplicateName = (sourceName: string, existingSets: FieldSet[]): string => {
        const baseName = `${sourceName} (Bản sao)`;
        if (!existingSets.some((set) => set.name === baseName)) {
            return baseName;
        }

        let index = 2;
        while (existingSets.some((set) => set.name === `${baseName} ${index}`)) {
            index += 1;
        }
        return `${baseName} ${index}`;
    };

    const handleDuplicate = (setToDuplicate: FieldSet) => {
        const duplicatedSet: FieldSet = {
            ...setToDuplicate,
            id: generateUniqueSetId(fieldSets),
            name: generateDuplicateName(setToDuplicate.name, fieldSets),
            fieldIds: [...setToDuplicate.fieldIds],
            fields: [...(setToDuplicate.fields ?? [])],
        };

        setFieldSets((prev) => [...prev, duplicatedSet]);
        setActiveSetId(duplicatedSet.id);
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' },
                gap: 2,
                height: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Left: set list */}
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                        fullWidth size="small"
                        placeholder="Tìm bộ dữ liệu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ mb: 1 }}
                    />
                    <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                        Tạo bộ dữ liệu mới
                    </Button>
                </CardContent>

                <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
                    <Stack spacing={0.75}>
                        {filteredSets.map((set) => {
                            const isActive = set.id === activeSetId;
                            return (
                                <Box
                                    key={set.id}
                                    onClick={() => setActiveSetId(set.id)}
                                    sx={{
                                        p: 1.25, borderRadius: 2.5, cursor: 'pointer',
                                        border: '1px solid',
                                        borderColor: isActive ? 'primary.main' : 'divider',
                                        bgcolor: isActive ? 'action.selected' : 'background.paper',
                                        '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ color: set.color, display: 'flex', alignItems: 'center' }}>{set.icon}</Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={700} noWrap>{set.name}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>{set.desc}</Typography>
                                        </Box>
                                        <Chip size="small" label={`${set.fieldIds.length}`} sx={{ bgcolor: `${set.color}22`, color: set.color, fontWeight: 700 }} />
                                    </Stack>
                                </Box>
                            );
                        })}
                        {filteredSets.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>Không tìm thấy bộ nào.</Typography>
                        )}
                    </Stack>
                </Box>
            </Card>

            {/* Right: preview + actions */}
            {activeSet ? (
                <Card sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                            <Box sx={{ color: activeSet.color, display: 'flex', alignItems: 'center', fontSize: 28 }}>{activeSet.icon}</Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" fontWeight={800} color={activeSet.color}>{activeSet.name}</Typography>
                                <Typography variant="body2" color="text.secondary">{activeSet.desc}</Typography>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="outlined" size="small"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={() => handleDuplicate(activeSet)}
                                >
                                    Nhân bản
                                </Button>
                                <Button
                                    variant="outlined" size="small"
                                    startIcon={<EditIcon />}
                                    onClick={() => { setIsNewMode(false); setEditingSet(activeSet); }}
                                >
                                    Chỉnh sửa
                                </Button>
                                <Button
                                    variant="outlined" size="small" color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => handleDelete(activeSet.id)}
                                >
                                    Xoá
                                </Button>
                            </Stack>
                        </Stack>
                        <Stack direction="row" spacing={1} mt={1}>
                            <Chip size="small" icon={<LibraryBooksIcon sx={{ fontSize: 14 }} />} label={`${activeFields.length} trường`} color="primary" variant="outlined" />
                            <Box
                                sx={{
                                    width: 16, height: 16, borderRadius: 2.5,
                                    bgcolor: activeSet.color, border: '2px solid',
                                    borderColor: 'background.paper',
                                    boxShadow: `0 0 0 1px ${activeSet.color}`,
                                }}
                            />
                        </Stack>
                    </CardContent>

                    <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
                        <Typography
                            variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary"
                            sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}
                        >
                            Danh sách trường trong bộ ({activeFields.length})
                        </Typography>

                        {activeFields.length === 0 && (
                            <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5}}>
                                <Typography color="text.secondary">Bộ dữ liệu này chưa có trường nào.</Typography>
                                <Button variant="outlined" sx={{ mt: 1 }} onClick={() => { setIsNewMode(false); setEditingSet(activeSet); }}>
                                    Thêm trường ngay
                                </Button>
                            </Box>
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, gap: 1.5 }}>
                            {activeFields.map((field, idx) => {
                                const meta = typeOf(field.type);
                                return (
                                    <Card key={field.id} variant="outlined" sx={{ border: `1px solid ${meta.color}44`, borderRadius: 2.5}}>
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Stack direction="row" alignItems="flex-start" spacing={1}>
                                                <Box sx={{ p: 0.75, borderRadius: 2.5, bgcolor: `${meta.color}18`, color: meta.color, display: 'flex', mt: 0.25 }}>{meta.icon}</Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack direction="row" alignItems="center" spacing={0.75} mb={0.25}>
                                                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>{idx + 1}</Typography>
                                                        <Typography variant="body2" fontWeight={700} noWrap>{field.label}</Typography>
                                                        {field.required && <Chip size="small" label="*" color="error" sx={{ height: 16, fontSize: 10 }} />}
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }} noWrap>
                                                        key: {field.key}
                                                    </Typography>
                                                    <Chip
                                                        size="small" label={meta.label}
                                                        sx={{ mt: 0.5, height: 18, fontSize: 10, bgcolor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}44` }}
                                                    />
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Box>
                    </Box>
                </Card>
            ) : (
                <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <SettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                        <Typography color="text.secondary" mb={1}>Chọn một bộ dữ liệu hoặc tạo mới</Typography>
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreate}>Tạo bộ dữ liệu mới</Button>
                    </CardContent>
                </Card>
            )}

            {editingSet && (
                <FieldSetEditorDialog
                    open={Boolean(editingSet)}
                    setData={editingSet}
                    allFields={fields}
                    onSave={handleSave}
                    onClose={() => setEditingSet(null)}
                />
            )}
        </Box>
    );
};

export default PageDatasets;
