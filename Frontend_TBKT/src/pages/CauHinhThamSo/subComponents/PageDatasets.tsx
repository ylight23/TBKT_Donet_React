import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { nameToIcon } from '../../../utils/thamSoUtils';
import { FieldSet } from '../types';
import { typeOf } from '../utils';
import FieldSetEditorDialog from './FieldSetEditorDialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const SET_ROW_HEIGHT = 86;
const FIELD_ROW_HEIGHT = 44;
const OVERSCAN = 12;

// ─── Props ────────────────────────────────────────────────────────────────────

interface PageDatasetsProps {
    fields: DynamicField[];
    fieldSets: FieldSet[];
    setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
    activeSetId: string | null;
    setActiveSetId: (id: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PageDatasets: React.FC<PageDatasetsProps> = ({ fields, fieldSets, setFieldSets, activeSetId, setActiveSetId }) => {
    const [search, setSearch] = useState('');
    const [fieldSearch, setFieldSearch] = useState('');
    const [editingSet, setEditingSet] = useState<FieldSet | null>(null);
    const [isNewMode, setIsNewMode] = useState(false);

    const setListScrollRef = useRef<HTMLDivElement>(null);
    const fieldListScrollRef = useRef<HTMLDivElement>(null);

    const activeSet = fieldSets.find((s) => s.id === activeSetId) ?? null;

    const resolveFieldsForSet = useMemo(
        () => (fieldSet: FieldSet): DynamicField[] => fieldSet.fields ?? [],
        [],
    );

    const filteredSets = useMemo(
        () => {
            const lower = search.toLowerCase().trim();
            if (!lower) return fieldSets;
            return fieldSets.filter((s) => s.name.toLowerCase().includes(lower) || (s.desc ?? '').toLowerCase().includes(lower));
        },
        [fieldSets, search],
    );

    // Resolve fields for active set
    const activeFields = useMemo(() => {
        if (!activeSet) return [];
        const resolved = resolveFieldsForSet(activeSet);

        const lower = fieldSearch.toLowerCase().trim();
        if (!lower) return resolved;
        return resolved.filter((f) => f.label.toLowerCase().includes(lower) || f.key.toLowerCase().includes(lower));
    }, [activeSet, fieldSearch, resolveFieldsForSet]);

    // ── Virtualizers ──

    const setVirtualizer = useVirtualizer({
        count: filteredSets.length,
        getScrollElement: () => setListScrollRef.current,
        estimateSize: () => SET_ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    const fieldVirtualizer = useVirtualizer({
        count: activeFields.length,
        getScrollElement: () => fieldListScrollRef.current,
        estimateSize: () => FIELD_ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    // ── Helpers ──

    const attachFields = (fieldSet: FieldSet): FieldSet => ({
        ...fieldSet,
            fields: resolveFieldsForSet(fieldSet),
    });

    // ── Handlers ──

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

    const handleDuplicate = (setToDuplicate: FieldSet) => {
        let nextId = '';
        do { nextId = `set_${Math.random().toString(36).slice(2, 9)}`; }
        while (fieldSets.some((s) => s.id === nextId));

        const baseName = `${setToDuplicate.name} (Bản sao)`;
        let dupName = baseName;
        if (fieldSets.some((s) => s.name === baseName)) {
            let i = 2;
            while (fieldSets.some((s) => s.name === `${baseName} ${i}`)) i++;
            dupName = `${baseName} ${i}`;
        }

        const dup: FieldSet = {
            ...setToDuplicate,
            id: nextId,
            name: dupName,
            fieldIds: [...setToDuplicate.fieldIds],
            fields: [...(setToDuplicate.fields ?? [])],
        };
        setFieldSets((prev) => [...prev, dup]);
        setActiveSetId(dup.id);
    };

    // ── Render ──
    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 1.5 }}>
            {/* ── Left: FieldSet list (virtualized) ── */}
            <Card sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CardContent sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                        fullWidth size="small"
                        placeholder="Tìm bộ dữ liệu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ mb: 1 }}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                                endAdornment: search ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            },
                        }}
                    />
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                            {filteredSets.length.toLocaleString('vi')} / {fieldSets.length.toLocaleString('vi')} bộ
                        </Typography>
                        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleCreate}
                            sx={{ textTransform: 'none', fontSize: 12 }}>
                            Tạo mới
                        </Button>
                    </Stack>
                </CardContent>

                <Box ref={setListScrollRef} sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <Box sx={{ height: setVirtualizer.getTotalSize(), position: 'relative' }}>
                        {setVirtualizer.getVirtualItems().map((vRow) => {
                            const s = filteredSets[vRow.index];
                            const isActive = s.id === activeSetId;
                            return (
                                <Box
                                    key={vRow.key}
                                    data-index={vRow.index}
                                    ref={setVirtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${vRow.start}px)`,
                                    }}
                                >
                                    <Box
                                        onClick={() => { setActiveSetId(s.id); setFieldSearch(''); }}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            px: 1.25, py: 0.75, mx: 0.5,
                                            height: SET_ROW_HEIGHT - 1,
                                            borderRadius: 2, cursor: 'pointer',
                                            border: '1px solid',
                                            borderColor: isActive ? 'primary.main' : 'transparent',
                                            bgcolor: isActive ? 'action.selected' : 'transparent',
                                            '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
                                            transition: 'background-color 0.1s',
                                        }}
                                    >
                                        <Box sx={{ color: s.color, display: 'flex', alignItems: 'center', fontSize: 20 }}>{s.icon}</Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={700} noWrap>{s.name || '(chưa đặt tên)'}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>{s.desc}</Typography>
                                            <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                                                {resolveFieldsForSet(s).slice(0, 3).map((field) => (
                                                    <Chip
                                                        key={`${s.id}-${field.id}`}
                                                        size="small"
                                                        label={field.label}
                                                        variant="outlined"
                                                        sx={{ fontSize: 10, height: 18 }}
                                                    />
                                                ))}
                                                {resolveFieldsForSet(s).length > 3 && (
                                                    <Chip
                                                        size="small"
                                                        label={`+${resolveFieldsForSet(s).length - 3}`}
                                                        variant="outlined"
                                                        sx={{ fontSize: 10, height: 18 }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                        <Chip size="small" label={Math.max(s.fields?.length ?? 0, s.fieldIds?.length ?? 0)}
                                            sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: `${s.color}22`, color: s.color }} />
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {filteredSets.length === 0 && (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {search ? 'Không tìm thấy bộ nào.' : 'Chưa có bộ dữ liệu.'}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Card>

            {/* ── Right: Detail + virtualized field list ── */}
            {activeSet ? (
                <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    {/* Header */}
                    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box sx={{ color: activeSet.color, display: 'flex', alignItems: 'center', fontSize: 28 }}>{activeSet.icon}</Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="h6" fontWeight={800} noWrap color={activeSet.color}>{activeSet.name}</Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>{activeSet.desc}</Typography>
                            </Box>
                            <Stack direction="row" spacing={0.75}>
                                <Tooltip title="Nhân bản">
                                    <IconButton size="small" onClick={() => handleDuplicate(activeSet)}>
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Chỉnh sửa">
                                    <IconButton size="small" onClick={() => { setIsNewMode(false); setEditingSet(activeSet); }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xoá">
                                    <IconButton size="small" color="error" onClick={() => handleDelete(activeSet.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1} mt={1} alignItems="center">
                            <Chip size="small" icon={<LibraryBooksIcon sx={{ fontSize: 14 }} />}
                                label={`${Math.max(activeSet.fields?.length ?? 0, activeSet.fieldIds?.length ?? 0)} trường`} color="primary" variant="outlined" />
                            <Box sx={{ width: 14, height: 14, borderRadius: 1.5, bgcolor: activeSet.color, border: '2px solid', borderColor: 'background.paper', boxShadow: `0 0 0 1px ${activeSet.color}` }} />
                        </Stack>
                        {activeFields.length > 0 && (
                            <Stack direction="row" spacing={0.5} mt={1.25} flexWrap="wrap" useFlexGap>
                                {activeFields.map((field) => (
                                    <Chip
                                        key={`active-${field.id}`}
                                        size="small"
                                        label={`${field.label} (${field.key})`}
                                        variant="outlined"
                                        sx={{ fontSize: 10, height: 20 }}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>

                    {/* Field list toolbar */}
                    <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Tìm trường trong bộ..."
                            value={fieldSearch}
                            onChange={(e) => setFieldSearch(e.target.value)}
                            sx={{ flex: 1, maxWidth: 320, '& .MuiInputBase-input': { fontSize: 13 } }}
                            slotProps={{
                                input: {
                                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                                    endAdornment: fieldSearch ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setFieldSearch('')}><ClearIcon fontSize="small" /></IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                },
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {activeFields.length} trường
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Button size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />}
                            onClick={() => { setIsNewMode(false); setEditingSet(activeSet); }}
                            sx={{ textTransform: 'none', fontSize: 12 }}>
                            Thêm / xoá trường
                        </Button>
                    </Box>

                    {/* Virtualized field list */}
                    <Box ref={fieldListScrollRef} sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                        {activeFields.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary" mb={1}>
                                    {fieldSearch ? 'Không tìm thấy trường nào.' : 'Bộ dữ liệu này chưa có trường nào.'}
                                </Typography>
                                {!fieldSearch && (
                                    <Button variant="outlined" onClick={() => { setIsNewMode(false); setEditingSet(activeSet); }}>
                                        Thêm trường ngay
                                    </Button>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ height: fieldVirtualizer.getTotalSize(), position: 'relative' }}>
                                {fieldVirtualizer.getVirtualItems().map((vRow) => {
                                    const field = activeFields[vRow.index];
                                    const meta = typeOf(field.type);
                                    return (
                                        <Box
                                            key={vRow.key}
                                            data-index={vRow.index}
                                            ref={fieldVirtualizer.measureElement}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${vRow.start}px)`,
                                            }}
                                        >
                                            <Box sx={{
                                                display: 'flex', alignItems: 'center', gap: 1,
                                                px: 2, height: FIELD_ROW_HEIGHT - 1,
                                                borderBottom: '1px solid', borderColor: 'divider',
                                                '&:hover': { bgcolor: 'action.hover' },
                                            }}>
                                                <Typography variant="caption" color="text.disabled"
                                                    sx={{ width: 32, textAlign: 'right', fontFamily: 'monospace' }}>
                                                    {vRow.index + 1}
                                                </Typography>

                                                <Box sx={{ p: 0.5, borderRadius: 1.5, bgcolor: `${meta.color}15`, color: meta.color, display: 'flex' }}>
                                                    {meta.icon}
                                                </Box>

                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={600} noWrap>{field.label}</Typography>
                                                </Box>

                                                <Typography variant="caption" color="text.secondary"
                                                    sx={{ fontFamily: 'monospace', minWidth: 80, textAlign: 'right' }} noWrap>
                                                    {field.key}
                                                </Typography>

                                                <Chip size="small" label={meta.label}
                                                    sx={{ height: 18, fontSize: 10, bgcolor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}44` }} />

                                                {field.required && (
                                                    <Chip size="small" label="Bắt buộc" color="error" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                </Card>
            ) : (
                <Card sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
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
