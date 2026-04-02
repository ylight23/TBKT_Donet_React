import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CategoryIcon from '@mui/icons-material/Category';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewListIcon from '@mui/icons-material/ViewList';

import type { AppDispatch, RootState } from '../../../store';
import type {
    LocalDynamicField,
    LocalFieldSet,
    LocalFormConfig,
    LocalFormTabConfig,
} from '../../../types/thamSo';
import { saveFormConfig, saveFieldSet, saveDynamicField } from '../../../store/reducer/thamSo';
import { nameToIcon, iconToName } from '../../../utils/thamSoUtils';
import { getRealSetIds, randomId } from './formTabMeta';
import type { FieldSet, TrangBiSelection } from '../types';
import TabSetPickerDialog from './TabSetPickerDialog';
import FieldSetEditorDialog from './FieldSetEditorDialog';

// ─── helpers ──────────────────────────────────────────────────────────────────

type SubTab = 'form' | 'fieldsets' | 'fields';

const mapStoreToUiFieldSet = (fs: LocalFieldSet): FieldSet => ({
    ...fs,
    icon: nameToIcon(fs.icon),
});

// ─── main component ───────────────────────────────────────────────────────────

interface TrangBiContextEditorProps {
    selection: TrangBiSelection;
}

const TrangBiContextEditor: React.FC<TrangBiContextEditorProps> = ({ selection }) => {
    const dispatch = useDispatch<AppDispatch>();
    const {
        formConfigs,
        fieldSets: storeFieldSets,
        dynamicFields,
    } = useSelector((s: RootState) => s.thamSoReducer);

    const [subTab, setSubTab] = useState<SubTab>('form');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [editingTab, setEditingTab] = useState<LocalFormTabConfig | null>(null);
    const [newFieldSetDialogOpen, setNewFieldSetDialogOpen] = useState(false);

    // The FormConfig for the current selection
    const formConfig = useMemo(
        () => formConfigs.find((fc) => fc.key === selection.configKey) ?? null,
        [formConfigs, selection.configKey],
    );

    // All FieldSets as UI type (for dialogs that expect React.ReactNode icons)
    const uiFieldSets = useMemo(
        () => storeFieldSets.map(mapStoreToUiFieldSet),
        [storeFieldSets],
    );

    // Scoped FieldSets: those used in this FormConfig's tabs
    const scopedSetIds = useMemo(() => {
        if (!formConfig) return new Set<string>();
        return new Set(formConfig.tabs.flatMap((t) => getRealSetIds(t)));
    }, [formConfig]);

    const scopedFieldSets = useMemo(
        () => storeFieldSets.filter((fs) => scopedSetIds.has(fs.id)),
        [storeFieldSets, scopedSetIds],
    );

    // Scoped Fields: fields inside the scoped FieldSets
    const scopedFieldIds = useMemo(
        () => new Set(scopedFieldSets.flatMap((fs) => fs.fieldIds)),
        [scopedFieldSets],
    );

    const scopedFields = useMemo(
        () => dynamicFields.filter((f) => scopedFieldIds.has(f.id)),
        [dynamicFields, scopedFieldIds],
    );

    // Available (unused) FieldSets not in any tab of this config
    const availableFieldSets = useMemo(
        () => storeFieldSets.filter((fs) => !scopedSetIds.has(fs.id)),
        [storeFieldSets, scopedSetIds],
    );

    // ── Create FormConfig ──

    const handleCreateConfig = async () => {
        setSaving(true);
        setError('');
        try {
            const namePrefix = selection.configType === 'common' ? 'Thông số chung' : 'TSKT riêng';
            const nameSuffix = selection.configType === 'common'
                ? selection.cnLabel
                : `${selection.cnLabel} / ${selection.l1Label}`;
            const newForm: LocalFormConfig = {
                id: `form_${Math.random().toString(36).slice(2, 9)}`,
                key: selection.configKey,
                name: `${namePrefix} - ${nameSuffix}`,
                desc: '',
                tabs: [{
                    id: randomId('tab'),
                    label: selection.configType === 'common' ? 'Thông số chung' : 'Thông số kĩ thuật',
                    setIds: [],
                }],
            };
            await dispatch(saveFormConfig({ formConfig: newForm, isNew: true })).unwrap();
            setSuccessMsg('Đã tạo cấu hình!');
        } catch (err) {
            setError((err as Error).message || 'Lỗi tạo cấu hình');
        } finally {
            setSaving(false);
        }
    };

    // ── Form operations ──

    const updateFormConfig = useCallback(async (next: LocalFormConfig) => {
        setSaving(true);
        setError('');
        try {
            await dispatch(saveFormConfig({ formConfig: next, isNew: false })).unwrap();
        } catch (err) {
            setError((err as Error).message || 'Lỗi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    }, [dispatch]);

    const addTab = useCallback(() => {
        if (!formConfig) return;
        const newTab: LocalFormTabConfig = {
            id: randomId('tab'),
            label: `Tab ${formConfig.tabs.length + 1}`,
            setIds: [],
        };
        void updateFormConfig({ ...formConfig, tabs: [...formConfig.tabs, newTab] });
    }, [formConfig, updateFormConfig]);

    const removeTab = useCallback((tabId: string) => {
        if (!formConfig) return;
        void updateFormConfig({
            ...formConfig,
            tabs: formConfig.tabs.filter((t) => t.id !== tabId),
        });
    }, [formConfig, updateFormConfig]);

    const moveTab = useCallback((tabId: string, dir: -1 | 1) => {
        if (!formConfig) return;
        const tabs = [...formConfig.tabs];
        const idx = tabs.findIndex((t) => t.id === tabId);
        const ni = idx + dir;
        if (ni < 0 || ni >= tabs.length) return;
        [tabs[idx], tabs[ni]] = [tabs[ni], tabs[idx]];
        void updateFormConfig({ ...formConfig, tabs });
    }, [formConfig, updateFormConfig]);

    const saveTabFromDialog = useCallback((nextTab: LocalFormTabConfig) => {
        if (!formConfig) return;
        void updateFormConfig({
            ...formConfig,
            tabs: formConfig.tabs.map((t) => (t.id === nextTab.id ? nextTab : t)),
        });
        setEditingTab(null);
    }, [formConfig, updateFormConfig]);

    // ── Add existing FieldSet to first tab ──

    const addExistingFieldSet = useCallback(async (fieldSetId: string) => {
        if (!formConfig || formConfig.tabs.length === 0) return;
        setSaving(true);
        setError('');
        try {
            const firstTab = formConfig.tabs[0];
            const updatedTab = { ...firstTab, setIds: [...firstTab.setIds, fieldSetId] };
            await dispatch(saveFormConfig({
                formConfig: {
                    ...formConfig,
                    tabs: formConfig.tabs.map((t) => (t.id === firstTab.id ? updatedTab : t)),
                },
                isNew: false,
            })).unwrap();
            const fsName = storeFieldSets.find((fs) => fs.id === fieldSetId)?.name ?? fieldSetId;
            setSuccessMsg(`Đã thêm "${fsName}" vào tab "${firstTab.label}"`);
        } catch (err) {
            setError((err as Error).message || 'Lỗi thêm bộ dữ liệu');
        } finally {
            setSaving(false);
        }
    }, [dispatch, formConfig, storeFieldSets]);

    // ── Create new FieldSet + add to first tab ──

    const emptyFieldSet: FieldSet = useMemo(() => ({
        id: '',
        name: '',
        icon: nameToIcon('Assignment'),
        color: '#3b82f6',
        desc: '',
        fieldIds: [],
    }), []);

    const handleCreateFieldSet = useCallback(async (uiSet: FieldSet) => {
        setSaving(true);
        setError('');
        try {
            const storeSet: LocalFieldSet = {
                id: uiSet.id || `set_${Math.random().toString(36).slice(2, 9)}`,
                name: uiSet.name,
                icon: iconToName(uiSet.icon),
                color: uiSet.color,
                desc: uiSet.desc ?? '',
                fieldIds: uiSet.fieldIds,
            };
            const result = await dispatch(saveFieldSet({ fieldSet: storeSet, isNew: true })).unwrap();
            // Auto-add to first tab
            if (formConfig && formConfig.tabs.length > 0) {
                const firstTab = formConfig.tabs[0];
                const updatedTab = { ...firstTab, setIds: [...firstTab.setIds, result.fieldSet.id] };
                await dispatch(saveFormConfig({
                    formConfig: {
                        ...formConfig,
                        tabs: formConfig.tabs.map((t) => (t.id === firstTab.id ? updatedTab : t)),
                    },
                    isNew: false,
                })).unwrap();
            }
            setNewFieldSetDialogOpen(false);
            setSuccessMsg(`Đã tạo bộ dữ liệu "${uiSet.name}"`);
        } catch (err) {
            setError((err as Error).message || 'Lỗi tạo bộ dữ liệu');
        } finally {
            setSaving(false);
        }
    }, [dispatch, formConfig]);

    // ── Create new Field + add to a FieldSet ──

    const handleCreateField = useCallback(async (
        label: string, key: string, type: string, targetSetId: string,
    ) => {
        setSaving(true);
        setError('');
        try {
            const field: LocalDynamicField = {
                id: `field_${Math.random().toString(36).slice(2, 9)}`,
                key,
                label,
                type,
                required: false,
                validation: {},
            };
            const result = await dispatch(saveDynamicField({ field, isNew: true })).unwrap();
            // Add to the target FieldSet
            const targetSet = storeFieldSets.find((fs) => fs.id === targetSetId);
            if (targetSet) {
                await dispatch(saveFieldSet({
                    fieldSet: { ...targetSet, fieldIds: [...targetSet.fieldIds, result.field.id] },
                    isNew: false,
                })).unwrap();
            }
            setSuccessMsg(`Đã tạo trường "${label}"`);
        } catch (err) {
            setError((err as Error).message || 'Lỗi tạo trường');
        } finally {
            setSaving(false);
        }
    }, [dispatch, storeFieldSets]);

    // ── Render ──

    const isCommon = selection.configType === 'common';
    const contextLabel = isCommon
        ? `${selection.cn} — ${selection.cnLabel}`
        : `${selection.cn}.${selection.l1} — ${selection.cnLabel} / ${selection.l1Label}`;

    return (
        <Card sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <CardContent sx={{ p: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip
                                size="small"
                                label={isCommon ? 'Chung' : 'KT riêng'}
                                color={isCommon ? 'primary' : 'secondary'}
                                sx={{ height: 22, fontSize: 11 }}
                            />
                            <Typography variant="subtitle1" fontWeight={700} noWrap>{contextLabel}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                            key: {selection.configKey}
                        </Typography>
                    </Box>
                    {formConfig && (
                        <Stack direction="row" spacing={0.75}>
                            <Chip size="small" icon={<LibraryBooksIcon sx={{ fontSize: 12 }} />}
                                label={`${formConfig.tabs.length} tab`} variant="outlined" sx={{ fontSize: 11 }} />
                            <Chip size="small" label={`${scopedFieldSets.length} bộ`} variant="outlined" sx={{ fontSize: 11 }} />
                            <Chip size="small" label={`${scopedFields.length} trường`} variant="outlined" sx={{ fontSize: 11 }} />
                        </Stack>
                    )}
                </Stack>
            </CardContent>

            {/* No config state */}
            {!formConfig ? (
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                    <Stack alignItems="center" spacing={2}>
                        <CategoryIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
                        <Typography color="text.secondary" textAlign="center">
                            Chưa có cấu hình cho {isCommon ? 'thông số chung' : 'thông số KT riêng'} của {contextLabel}
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                            onClick={() => void handleCreateConfig()}
                            disabled={saving}
                        >
                            Tạo cấu hình
                        </Button>
                        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                    </Stack>
                </Box>
            ) : (
                <>
                    {/* Sub-tabs */}
                    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
                        <Tabs
                            value={subTab}
                            onChange={(_, v: SubTab) => setSubTab(v)}
                            sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 36, fontSize: 13 } }}
                        >
                            <Tab value="form" icon={<SettingsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Cấu trúc biểu mẫu" />
                            <Tab value="fieldsets" icon={<LibraryBooksIcon sx={{ fontSize: 16 }} />} iconPosition="start"
                                label={`Bộ dữ liệu (${scopedFieldSets.length})`} />
                            <Tab value="fields" icon={<ViewListIcon sx={{ fontSize: 16 }} />} iconPosition="start"
                                label={`Trường (${scopedFields.length})`} />
                        </Tabs>
                    </Box>

                    {/* Notifications */}
                    <Box sx={{ px: 1.5, pt: (error || successMsg) ? 1 : 0 }}>
                        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 0.5 }}>{error}</Alert>}
                        {successMsg && <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ mb: 0.5 }}>{successMsg}</Alert>}
                    </Box>

                    {/* Sub-tab content */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
                        {subTab === 'form' && (
                            <FormSubTab
                                formConfig={formConfig}
                                uiFieldSets={uiFieldSets}
                                onAddTab={addTab}
                                onRemoveTab={removeTab}
                                onMoveTab={moveTab}
                                onEditTab={setEditingTab}
                                saving={saving}
                            />
                        )}
                        {subTab === 'fieldsets' && (
                            <FieldSetsSubTab
                                scopedFieldSets={scopedFieldSets}
                                availableFieldSets={availableFieldSets}
                                dynamicFields={dynamicFields}
                                formConfig={formConfig}
                                onCreateNew={() => setNewFieldSetDialogOpen(true)}
                                onAddExisting={addExistingFieldSet}
                                saving={saving}
                            />
                        )}
                        {subTab === 'fields' && (
                            <FieldsSubTab
                                scopedFields={scopedFields}
                                scopedFieldSets={scopedFieldSets}
                                onCreateField={handleCreateField}
                                saving={saving}
                            />
                        )}
                    </Box>
                </>
            )}

            {/* TabSetPickerDialog */}
            {editingTab && formConfig && (
                <TabSetPickerDialog
                    open={Boolean(editingTab)}
                    tab={editingTab}
                    allTabs={formConfig.tabs}
                    fieldSets={uiFieldSets}
                    fields={dynamicFields}
                    onSave={saveTabFromDialog}
                    onClose={() => setEditingTab(null)}
                />
            )}

            {/* FieldSetEditorDialog */}
            {newFieldSetDialogOpen && (
                <FieldSetEditorDialog
                    open={newFieldSetDialogOpen}
                    setData={emptyFieldSet}
                    allFields={dynamicFields}
                    onSave={(uiSet) => void handleCreateFieldSet(uiSet)}
                    onClose={() => setNewFieldSetDialogOpen(false)}
                />
            )}
        </Card>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FormSubTab — Tab structure editor
// ═══════════════════════════════════════════════════════════════════════════════

interface FormSubTabProps {
    formConfig: LocalFormConfig;
    uiFieldSets: FieldSet[];
    onAddTab: () => void;
    onRemoveTab: (tabId: string) => void;
    onMoveTab: (tabId: string, dir: -1 | 1) => void;
    onEditTab: (tab: LocalFormTabConfig) => void;
    saving: boolean;
}

const FormSubTab: React.FC<FormSubTabProps> = ({
    formConfig, uiFieldSets, onAddTab, onRemoveTab, onMoveTab, onEditTab, saving,
}) => (
    <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={800}
                sx={{ fontSize: 12, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.04em' }}>
                Cấu hình Tab ({formConfig.tabs.length})
            </Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onAddTab} disabled={saving}>
                Thêm tab
            </Button>
        </Stack>

        {formConfig.tabs.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <LibraryBooksIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary" mb={1}>Chưa có tab nào.</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddTab}>Thêm tab đầu tiên</Button>
            </Box>
        )}

        {formConfig.tabs.map((tab, idx) => {
            const selectedSets = getRealSetIds(tab)
                .map((id) => uiFieldSets.find((s) => s.id === id))
                .filter(Boolean) as FieldSet[];
            const totalFields = selectedSets.reduce((a, s) => a + s.fieldIds.length, 0);

            return (
                <Card key={tab.id} variant="outlined" sx={{ borderRadius: 2, '&:hover': { boxShadow: 1 }, transition: 'box-shadow 0.2s' }}>
                    <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            {/* Reorder */}
                            <Stack spacing={0.25}>
                                <IconButton size="small" onClick={() => onMoveTab(tab.id, -1)} disabled={idx === 0}
                                    sx={{ p: 0.25 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                                <IconButton size="small" onClick={() => onMoveTab(tab.id, 1)} disabled={idx === formConfig.tabs.length - 1}
                                    sx={{ p: 0.25 }}>
                                    <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Stack>

                            {/* Content */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5} flexWrap="wrap" useFlexGap>
                                    <Chip size="small" label={`Tab ${idx + 1}`}
                                        sx={{ fontWeight: 700, fontFamily: 'monospace', bgcolor: 'action.selected', fontSize: 11 }} />
                                    <Typography variant="body2" fontWeight={700}>{tab.label}</Typography>
                                    <Chip size="small" label={`${selectedSets.length} bộ · ${totalFields} trường`}
                                        variant="outlined" sx={{ fontSize: 11 }} />
                                </Stack>
                                {selectedSets.length > 0 ? (
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {selectedSets.map((set) => (
                                            <Chip key={set.id} size="small"
                                                icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: set.color }}>{set.icon}</Box> as React.ReactElement}
                                                label={set.name}
                                                sx={{ border: `1px solid ${set.color}55`, bgcolor: `${set.color}11`, color: set.color, fontSize: 11 }}
                                            />
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography variant="caption" color="text.disabled">Chưa chọn bộ dữ liệu nào.</Typography>
                                )}
                            </Box>

                            {/* Actions */}
                            <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Cấu hình bộ dữ liệu">
                                    <IconButton size="small" onClick={() => onEditTab(tab)}>
                                        <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa tab">
                                    <IconButton size="small" color="error" onClick={() => onRemoveTab(tab.id)}>
                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            );
        })}
    </Stack>
);

// ═══════════════════════════════════════════════════════════════════════════════
// FieldSetsSubTab — Scoped FieldSet management
// ═══════════════════════════════════════════════════════════════════════════════

interface FieldSetsSubTabProps {
    scopedFieldSets: LocalFieldSet[];
    availableFieldSets: LocalFieldSet[];
    dynamicFields: LocalDynamicField[];
    formConfig: LocalFormConfig;
    onCreateNew: () => void;
    onAddExisting: (fieldSetId: string) => Promise<void>;
    saving: boolean;
}

const FieldSetsSubTab: React.FC<FieldSetsSubTabProps> = ({
    scopedFieldSets, availableFieldSets, dynamicFields, formConfig, onCreateNew, onAddExisting, saving,
}) => {
    const [showAvailable, setShowAvailable] = useState(false);

    return (
        <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight={800}
                    sx={{ fontSize: 12, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.04em' }}>
                    Bộ dữ liệu đang dùng ({scopedFieldSets.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                    {availableFieldSets.length > 0 && (
                        <Button size="small" variant="outlined" onClick={() => setShowAvailable((v) => !v)}>
                            {showAvailable ? 'Ẩn bộ có sẵn' : `Thêm bộ có sẵn (${availableFieldSets.length})`}
                        </Button>
                    )}
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={onCreateNew} disabled={saving}>
                        Tạo bộ mới
                    </Button>
                </Stack>
            </Stack>

            {scopedFieldSets.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography color="text.secondary" mb={0.5}>Chưa có bộ dữ liệu nào.</Typography>
                    <Typography variant="caption" color="text.disabled">
                        Tạo bộ mới hoặc thêm bộ có sẵn.
                    </Typography>
                </Box>
            ) : (
                scopedFieldSets.map((fs) => {
                    const usedInTabs = formConfig.tabs
                        .filter((t) => getRealSetIds(t).includes(fs.id))
                        .map((t) => t.label);
                    const fields = fs.fieldIds
                        .map((fid) => dynamicFields.find((f) => f.id === fid))
                        .filter(Boolean) as LocalDynamicField[];

                    return (
                        <Card key={fs.id} variant="outlined"
                            sx={{ borderRadius: 2, borderLeft: `3px solid ${fs.color || '#999'}` }}>
                            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box sx={{ color: fs.color || '#999', display: 'flex', alignItems: 'center' }}>
                                        {nameToIcon(fs.icon)}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={700}>{fs.name}</Typography>
                                        <Stack direction="row" spacing={0.5} mt={0.25} flexWrap="wrap" useFlexGap>
                                            <Chip size="small" label={`${fields.length} trường`}
                                                variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                                            {usedInTabs.map((tabName) => (
                                                <Chip key={tabName} size="small" label={tabName}
                                                    sx={{ fontSize: 10, height: 18, bgcolor: 'action.hover' }} />
                                            ))}
                                        </Stack>
                                    </Box>
                                </Stack>
                                {fields.length > 0 && (
                                    <Box sx={{ mt: 0.75, pl: 4 }}>
                                        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
                                            {fields.map((f) => (
                                                <Chip key={f.id} size="small"
                                                    label={`${f.label} (${f.type})`}
                                                    variant="outlined"
                                                    sx={{ fontSize: 10, height: 20 }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            )}

            {/* Available FieldSets (not in this config) */}
            <Collapse in={showAvailable && availableFieldSets.length > 0}>
                <Divider sx={{ my: 0.5 }} />
                <Typography variant="subtitle2" fontWeight={800} mb={1}
                    sx={{ fontSize: 12, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.04em' }}>
                    Bộ có sẵn ({availableFieldSets.length})
                </Typography>
                <Stack spacing={0.75}>
                    {availableFieldSets.map((fs) => (
                        <Card key={fs.id} variant="outlined"
                            sx={{ borderRadius: 1.5, borderStyle: 'dashed', borderLeft: `3px solid ${fs.color || '#ccc'}` }}>
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box sx={{ color: fs.color || '#ccc', display: 'flex', alignItems: 'center' }}>
                                        {nameToIcon(fs.icon)}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600}>{fs.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {fs.fieldIds.length} trường
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => void onAddExisting(fs.id)}
                                        disabled={saving}
                                        sx={{ fontSize: 11, minWidth: 0 }}
                                    >
                                        Thêm
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </Collapse>
        </Stack>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FieldsSubTab — Scoped field listing + quick create
// ═══════════════════════════════════════════════════════════════════════════════

const FIELD_TYPES = ['text', 'number', 'date', 'select', 'textarea', 'checkbox', 'radio', 'checkboxGroup'];

interface FieldsSubTabProps {
    scopedFields: LocalDynamicField[];
    scopedFieldSets: LocalFieldSet[];
    onCreateField: (label: string, key: string, type: string, targetSetId: string) => Promise<void>;
    saving: boolean;
}

const FieldsSubTab: React.FC<FieldsSubTabProps> = ({
    scopedFields, scopedFieldSets, onCreateField, saving,
}) => {
    const [newLabel, setNewLabel] = useState('');
    const [newKey, setNewKey] = useState('');
    const [newType, setNewType] = useState('text');
    const [newTargetSet, setNewTargetSet] = useState('');

    // Group fields by FieldSet
    const groupedFields = useMemo(() => {
        const groups: { fieldSet: LocalFieldSet; fields: LocalDynamicField[] }[] = [];
        scopedFieldSets.forEach((fs) => {
            const fields = fs.fieldIds
                .map((fid) => scopedFields.find((f) => f.id === fid))
                .filter(Boolean) as LocalDynamicField[];
            if (fields.length > 0) {
                groups.push({ fieldSet: fs, fields });
            }
        });
        return groups;
    }, [scopedFieldSets, scopedFields]);

    // Stats
    const typeStats = useMemo(() => {
        const stats = new Map<string, number>();
        scopedFields.forEach((f) => stats.set(f.type, (stats.get(f.type) ?? 0) + 1));
        return Array.from(stats.entries()).sort((a, b) => b[1] - a[1]);
    }, [scopedFields]);

    const handleCreate = async () => {
        if (!newLabel.trim() || !newKey.trim() || !newTargetSet) return;
        await onCreateField(newLabel.trim(), newKey.trim(), newType, newTargetSet);
        setNewLabel('');
        setNewKey('');
        setNewType('text');
    };

    return (
        <Stack spacing={2}>
            {/* Stats */}
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`Tổng: ${scopedFields.length}`} color="primary" variant="outlined" />
                {typeStats.map(([type, count]) => (
                    <Chip key={type} size="small" label={`${type}: ${count}`} variant="outlined" sx={{ fontSize: 11 }} />
                ))}
            </Stack>

            {/* Grouped fields */}
            {groupedFields.map(({ fieldSet, fields }) => (
                <Box key={fieldSet.id}>
                    <Stack direction="row" alignItems="center" spacing={0.75} mb={0.75}>
                        <Box sx={{ color: fieldSet.color || '#999', display: 'flex' }}>
                            {nameToIcon(fieldSet.icon)}
                        </Box>
                        <Typography variant="subtitle2" fontWeight={700}>{fieldSet.name}</Typography>
                        <Chip size="small" label={String(fields.length)} sx={{ fontSize: 10, height: 18 }} />
                    </Stack>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 0.75,
                        pl: 3.5,
                    }}>
                        {fields.map((f) => (
                            <Box key={f.id} sx={{ p: 0.75, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                                <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12 }}>{f.label}</Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: 10 }}>
                                        {f.key}
                                    </Typography>
                                    <Chip size="small" label={f.type} sx={{ fontSize: 9, height: 16 }} />
                                    {f.required && <Chip size="small" label="*" color="error" sx={{ fontSize: 9, height: 16 }} />}
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                </Box>
            ))}

            {scopedFields.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography color="text.secondary">
                        Chưa có trường nào. Tạo bộ dữ liệu và thêm trường bên dưới.
                    </Typography>
                </Box>
            )}

            <Divider />

            {/* Quick create field */}
            <Box>
                <Typography variant="subtitle2" fontWeight={800} mb={1}
                    sx={{ fontSize: 12, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.04em' }}>
                    Tạo nhanh trường dữ liệu
                </Typography>
                {scopedFieldSets.length === 0 ? (
                    <Alert severity="info" sx={{ fontSize: 12 }}>
                        Cần tạo ít nhất 1 bộ dữ liệu trước khi tạo trường.
                    </Alert>
                ) : (
                    <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                        <TextField size="small" label="Tên hiển thị" value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="VD: Tốc độ tối đa"
                            sx={{ minWidth: 150 }}
                        />
                        <TextField size="small" label="Key" value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            placeholder="VD: toc_do_max"
                            sx={{ minWidth: 130 }}
                        />
                        <TextField size="small" select label="Kiểu" value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                            sx={{ minWidth: 100 }}
                        >
                            {FIELD_TYPES.map((t) => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                        </TextField>
                        <TextField size="small" select label="Thuộc bộ" value={newTargetSet}
                            onChange={(e) => setNewTargetSet(e.target.value)}
                            sx={{ minWidth: 160 }}
                        >
                            {scopedFieldSets.map((fs) => (
                                <MenuItem key={fs.id} value={fs.id}>{fs.name}</MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="contained" size="small"
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                            onClick={() => void handleCreate()}
                            disabled={saving || !newLabel.trim() || !newKey.trim() || !newTargetSet}
                            sx={{ minHeight: 40 }}
                        >
                            Tạo
                        </Button>
                    </Stack>
                )}
            </Box>
        </Stack>
    );
};

export default TrangBiContextEditor;
