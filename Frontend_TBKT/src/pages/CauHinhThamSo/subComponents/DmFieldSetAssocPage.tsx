// ============================================================
// DmFieldSetAssocPage – Tab gán FieldSet ↔ DanhMucTrangBi
//
// Layout: TreePanel (danh mục) bên trái | DetailPanel bên phải
// TreePanel: DanhMucTrangBiDictionary với badge số FieldSet đã gán
// DetailPanel: hiển thị / Edit FieldSets gán cho DM đang chọn
//
// Cách dùng trong CauHinhThamSo/index.tsx:
//   import DmFieldSetAssocPage from './subComponents/DmFieldSetAssocPage';
//   {tab === 'dm-assoc' && (
//     <DmFieldSetAssocPage fields={fields} fieldSets={fieldSets} setFieldSets={setFieldSetsAndPersist} />
//   )}
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import type { DanhMucTrangBiTree } from '../../../apis/danhMucTrangBiApi';
import DanhMucTrangBiDictionary from '../../DanhMucTrangBi/DanhMucTrangBiDictionary';
import { FieldSet } from '../types';
import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import FieldSetEditorDialog from './FieldSetEditorDialog';

// ── Types ─────────────────────────────────────────────────────
interface DmFieldSetAssocPageProps {
    fields: DynamicField[];
    fieldSets: FieldSet[];
    setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
}

interface DmSetConfig {
    setId: string;
    set: FieldSet;
}

// ── Helpers ──────────────────────────────────────────────────
const normalizeText = (v: unknown): string => String(v ?? '').trim();

const buildBadgeCounts = (fieldSets: FieldSet[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const fs of fieldSets) {
        if (fs.maDanhMucTrangBi?.length) {
            for (const code of fs.maDanhMucTrangBi) {
                counts[code] = (counts[code] ?? 0) + 1;
            }
        }
    }
    return counts;
};

// ── Main Component ────────────────────────────────────────────
const TREE_PANEL_WIDTH = 320;

const DmFieldSetAssocPage: React.FC<DmFieldSetAssocPageProps> = ({ fields, fieldSets, setFieldSets }) => {
    // ── Selection state ────────────────────────────────────────
    const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<DanhMucTrangBiTree | null>(null);

    // ── Editor state ───────────────────────────────────────────
    const [editingSet, setEditingSet] = useState<FieldSet | null>(null);
    const [isNewMode, setIsNewMode] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignSearch, setAssignSearch] = useState('');

    // ── Badge counts (record<danhMucId, count>) ─────────────────
    const badgeCounts = useMemo(() => buildBadgeCounts(fieldSets), [fieldSets]);

    // ── Selected DM metadata ───────────────────────────────────
    const assignedSets: DmSetConfig[] = useMemo(() => {
        if (!selectedDmId) return [];
        return fieldSets
            .filter((fs) => fs.maDanhMucTrangBi?.includes(selectedDmId))
            .map((fs) => ({ setId: fs.id, set: fs }));
    }, [fieldSets, selectedDmId]);

    const unassignedSets: DmSetConfig[] = useMemo(() => {
        return fieldSets
            .filter((fs) => !fs.maDanhMucTrangBi?.includes(selectedDmId ?? ''))
            .map((fs) => ({ setId: fs.id, set: fs }));
    }, [fieldSets, selectedDmId]);

    // ── Handlers ─────────────────────────────────────────────
    const handleSelect = useCallback((node: DanhMucTrangBiTree) => {
        setSelectedDmId((prev) => (prev === node.id ? null : (node.id ?? null)));
        setSelectedNode(node.id === selectedDmId ? null : node);
    }, [selectedDmId]);

    const handleBack = useCallback(() => {
        setSelectedDmId(null);
        setSelectedNode(null);
    }, []);

    const handleAssignSets = useCallback(
        (setIdsToAssign: string[], setIdsToUnassign: string[]) => {
            if (!selectedDmId) return;
            setFieldSets((prev) =>
                prev.map((fs) => {
                    let changed = false;
                    let maDanhMucTrangBi = [...(fs.maDanhMucTrangBi ?? [])];

                    if (setIdsToAssign.includes(fs.id)) {
                        if (!maDanhMucTrangBi.includes(selectedDmId)) {
                            maDanhMucTrangBi.push(selectedDmId);
                            changed = true;
                        }
                    }
                    if (setIdsToUnassign.includes(fs.id)) {
                        maDanhMucTrangBi = maDanhMucTrangBi.filter((id) => id !== selectedDmId);
                        changed = true;
                    }

                    if (!changed) return fs;
                    return {
                        ...fs,
                        maDanhMucTrangBi: maDanhMucTrangBi.length > 0 ? maDanhMucTrangBi : undefined,
                    };
                }),
            );
        },
        [selectedDmId, setFieldSets],
    );

    const handleCreateSet = useCallback(() => {
        setIsNewMode(true);
        setEditingSet({
            id: `set_${Math.random().toString(36).slice(2, 9)}`,
            name: '',
            icon: <SettingsIcon />,
            color: '#3b82f6',
            desc: '',
            fieldIds: [],
            fields: [],
            maDanhMucTrangBi: selectedDmId ? [selectedDmId] : undefined,
        });
    }, [selectedDmId]);

    const handleEditSet = useCallback((set: FieldSet) => {
        setIsNewMode(false);
        setEditingSet(set);
    }, []);

    const handleSaveSet = useCallback(
        (next: FieldSet) => {
            if (isNewMode) {
                setFieldSets((prev) => [...prev, next]);
            } else {
                setFieldSets((prev) => prev.map((s) => (s.id === next.id ? next : s)));
            }
            setEditingSet(null);
        },
        [isNewMode, setFieldSets],
    );

    const handleDeleteSet = useCallback(
        (setId: string) => {
            if (!window.confirm('Xoá bộ dữ liệu này khỏi danh mục đang chọn?')) return;
            handleAssignSets([], [setId]);
        },
        [handleAssignSets],
    );

    // ── Assign dialog helpers ─────────────────────────────────
    const filteredUnassignedSets = useMemo(() => {
        const q = assignSearch.trim().toLowerCase();
        if (!q) return unassignedSets;
        return unassignedSets.filter(
            (s) =>
                s.set.name.toLowerCase().includes(q) ||
                normalizeText(s.set.desc).toLowerCase().includes(q),
        );
    }, [unassignedSets, assignSearch]);

    const filteredAssignedSets = useMemo(() => {
        const q = assignSearch.trim().toLowerCase();
        if (!q) return assignedSets;
        return assignedSets.filter(
            (s) =>
                s.set.name.toLowerCase().includes(q) ||
                normalizeText(s.set.desc).toLowerCase().includes(q),
        );
    }, [assignedSets, assignSearch]);

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 1.5 }}>
            {/* ── Left: Tree panel ── */}
            <Paper
                variant="outlined"
                sx={{
                    width: TREE_PANEL_WIDTH,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderTop: 0,
                    borderBottom: 0,
                    borderLeft: 0,
                }}
            >
                {/* Header */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <SettingsIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="subtitle2" fontWeight={700}>
                            Danh mục trang bị
                        </Typography>
                    </Stack>
                </Box>

                {/* Tree */}
                <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    <DanhMucTrangBiDictionary
                        selectedId={selectedDmId ?? ''}
                        onSelect={handleSelect}
                        badgeCounts={badgeCounts}
                    />
                </Box>
            </Paper>

            {/* ── Right: Detail panel ── */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                {selectedDmId ? (
                    <>
                        {/* Detail header */}
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Button
                                    size="small"
                                    variant="text"
                                    startIcon={<ArrowBackIcon fontSize="small" />}
                                    onClick={handleBack}
                                    sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0 }}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={700} noWrap>
                                        {normalizeText(selectedNode?.ten) || normalizeText(selectedNode?.tenDayDu) || selectedDmId}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'inherit' }}>
                                        {selectedDmId}
                                    </Typography>
                                </Box>
                                <Chip
                                    size="small"
                                    label={`${assignedSets.length} bộ dữ liệu`}
                                    color={assignedSets.length > 0 ? 'primary' : 'default'}
                                    icon={<SettingsIcon sx={{ fontSize: 14 }} />}
                                />
                            </Stack>
                        </Box>

                        {/* Action toolbar */}
                        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<AddIcon fontSize="small" />}
                                    onClick={handleCreateSet}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                    Tạo bộ mới
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EditIcon fontSize="small" />}
                                    onClick={() => setAssignDialogOpen(true)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Gán bộ dữ liệu
                                </Button>
                                <Box sx={{ flex: 1 }} />
                                <Typography variant="caption" color="text.secondary">
                                    {assignedSets.length} bộ đã gán cho danh mục này
                                </Typography>
                            </Stack>
                        </Box>

                        {/* Assigned sets list */}
                        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {assignedSets.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <SettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5, opacity: 0.3 }} />
                                    <Typography variant="body1" fontWeight={600} color="text.secondary" mb={0.5}>
                                        Chưa có bộ dữ liệu nào được gán
                                    </Typography>
                                    <Typography variant="body2" color="text.disabled" mb={2}>
                                        Gán bộ dữ liệu từ thư viện hoặc tạo bộ mới cho danh mục này.
                                    </Typography>
                                    <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateSet} sx={{ textTransform: 'none' }}>
                                        Tạo bộ dữ liệu mới
                                    </Button>
                                </Box>
                            ) : (
                                <Stack spacing={1} sx={{ p: 2 }}>
                                    {assignedSets.map(({ setId, set }) => (
                                        <Card
                                            key={setId}
                                            variant="outlined"
                                            sx={{
                                                borderColor: `${set.color}44`,
                                                borderLeftWidth: 4,
                                                borderLeftColor: set.color,
                                                transition: 'box-shadow 0.2s',
                                                '&:hover': { boxShadow: 1 },
                                            }}
                                        >
                                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                                                    <Box sx={{ color: set.color, display: 'flex', alignItems: 'center', fontSize: 22, pt: 0.25 }}>
                                                        {set.icon}
                                                    </Box>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" fontWeight={700} noWrap>
                                                            {set.name || '(chưa đặt tên)'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {Math.max(set.fields?.length ?? 0, set.fieldIds?.length ?? 0)} trường
                                                            {set.desc ? ` · ${set.desc}` : ''}
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title="Chỉnh sửa bộ dữ liệu">
                                                            <IconButton size="small" onClick={() => handleEditSet(set)} sx={{ color: 'text.secondary' }}>
                                                                <EditIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Xoá khỏi danh mục này">
                                                            <IconButton size="small" color="error" onClick={() => handleDeleteSet(setId)}>
                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </>
                ) : (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                        }}
                    >
                        <LibraryBooksIcon sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.25 }} />
                        <Typography variant="h6" fontWeight={600} color="text.secondary" textAlign="center">
                            Chọn danh mục trang bị để xem / gán bộ dữ liệu
                        </Typography>
                        <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ maxWidth: 360 }}>
                            Chọn một mục trong cây danh mục bên trái để xem các bộ dữ liệu đã gán hoặc tạo mới.
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* ── Assign dialog ── */}
            <Dialog
                open={assignDialogOpen}
                onClose={() => { setAssignDialogOpen(false); setAssignSearch(''); }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon color="primary" />
                    Gán bộ dữ liệu cho danh mục
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => { setAssignDialogOpen(false); setAssignSearch(''); }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 2, pb: 2 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Lọc bộ dữ liệu..."
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        sx={{ mb: 2 }}
                        slotProps={{
                            input: {
                                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, opacity: 0.5 }} />,
                            },
                        }}
                    />

                    <Grid container spacing={2}>
                        {/* Left: Unassigned */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                                CHƯA GÁN ({filteredUnassignedSets.length})
                            </Typography>
                            <Paper variant="outlined" sx={{ maxHeight: 340, overflowY: 'auto' }}>
                                {filteredUnassignedSets.length === 0 ? (
                                    <Box sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.disabled">
                                            {unassignedSets.length === 0 ? 'Tất cả bộ đã được gán' : 'Không tìm thấy'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense disablePadding>
                                        {filteredUnassignedSets.map(({ setId, set }) => (
                                            <ListItem key={setId} divider sx={{ py: 0.75 }}>
                                                <ListItemIcon sx={{ minWidth: 32 }}>
                                                    <Checkbox
                                                        size="small"
                                                        onChange={() => handleAssignSets([setId], [])}
                                                        sx={{ p: 0.25, color: set.color, '&.Mui-checked': { color: set.color } }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={set.name || '(chưa đặt tên)'}
                                                    secondary={`${Math.max(set.fields?.length ?? 0, set.fieldIds?.length ?? 0)} trường`}
                                                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
                                                    secondaryTypographyProps={{ fontSize: '0.72rem' }}
                                                />
                                                <ListItemSecondaryAction>
                                                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: set.color }} />
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                        </Grid>

                        {/* Right: Assigned */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1}>
                                ĐÃ GÁN ({filteredAssignedSets.length})
                            </Typography>
                            <Paper variant="outlined" sx={{ maxHeight: 340, overflowY: 'auto' }}>
                                {filteredAssignedSets.length === 0 ? (
                                    <Box sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.disabled">
                                            {assignedSets.length === 0 ? 'Chưa gán bộ nào' : 'Không tìm thấy'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense disablePadding>
                                        {filteredAssignedSets.map(({ setId, set }) => (
                                            <ListItem key={setId} divider sx={{ py: 0.75, bgcolor: `${set.color}08` }}>
                                                <ListItemIcon sx={{ minWidth: 32 }}>
                                                    <Checkbox
                                                        size="small"
                                                        checked
                                                        onChange={() => handleAssignSets([], [setId])}
                                                        sx={{ p: 0.25, color: set.color, '&.Mui-checked': { color: set.color } }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={set.name || '(chưa đặt tên)'}
                                                    secondary={`${Math.max(set.fields?.length ?? 0, set.fieldIds?.length ?? 0)} trường`}
                                                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
                                                    secondaryTypographyProps={{ fontSize: '0.72rem' }}
                                                />
                                                <ListItemSecondaryAction>
                                                    <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
            </Dialog>

            {/* ── FieldSet editor dialog ── */}
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

export default DmFieldSetAssocPage;
