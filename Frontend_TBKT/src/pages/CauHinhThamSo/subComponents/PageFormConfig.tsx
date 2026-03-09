import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import BuildIcon from '@mui/icons-material/Build';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

import {
    LocalDynamicField as DynamicField,
    LocalFormConfig as FormConfig,
    LocalFormTabConfig as FormTabConfig
} from '../../../types/thamSo';
import { FieldSet } from '../types';
import TabSetPickerDialog from './TabSetPickerDialog';
import {
    getRealSetIds,
    parseTabMeta,
    randomId,
    withTabMeta,
} from './formTabMeta';

interface PageFormConfigProps {
    fieldSets: FieldSet[];
    fields: DynamicField[];
    forms: FormConfig[];
    setForms: React.Dispatch<React.SetStateAction<FormConfig[]>>;
    activeFormId: string | null;
    setActiveFormId: (id: string | null) => void;
}

const PageFormConfig: React.FC<PageFormConfigProps> = ({ fieldSets, fields, forms, setForms, activeFormId, setActiveFormId }) => {
    const [editingTab, setEditingTab] = useState<FormTabConfig | null>(null);
    const [previewRootTabId, setPreviewRootTabId] = useState<string | null>(null);

    const activeForm = forms.find((f) => f.id === activeFormId) ?? null;

    const updateActiveForm = (next: FormConfig) =>
        setForms((prev) => prev.map((f) => (f.id === next.id ? next : f)));

    const createForm = () => {
        const id = `form_${Math.random().toString(36).slice(2, 9)}`;
        const newForm: FormConfig = {
            id,
            name: 'Form mới',
            desc: '',
            tabs: [{ id: randomId('tab'), label: 'Tab 1', setIds: [] }],
        };
        setForms((prev) => [...prev, newForm]);
        setActiveFormId(id);
    };

    const deleteForm = (formId: string) => {
        const next = forms.filter((f) => f.id !== formId);
        setForms(next);
        setActiveFormId(next[0]?.id ?? null);
    };

    const addTab = () => {
        if (!activeForm) return;
        const newTab: FormTabConfig = { id: randomId('tab'), label: `Tab ${activeForm.tabs.length + 1}`, setIds: [] };
        updateActiveForm({ ...activeForm, tabs: [...activeForm.tabs, newTab] });
    };

    const addSyncStructure = () => {
        if (!activeForm) return;

        const syncGroupId = randomId('tab');
        const syncGroup = withTabMeta(
            {
                id: syncGroupId,
                label: 'Trang bị đồng bộ',
                setIds: [],
            },
            {
                tabType: 'sync-group',
                syncSourceType: 'root_equipment',
            },
        );

        // Only scaffold the sync parent tab. Users define child tabs and categories themselves.
        updateActiveForm({ ...activeForm, tabs: [...activeForm.tabs, syncGroup] });
        setPreviewRootTabId(syncGroupId);
    };

    const removeTab = (tabId: string) => {
        if (!activeForm) return;
        const removedIds = new Set([tabId]);
        activeForm.tabs.forEach((tab) => {
            const meta = parseTabMeta(tab);
            if (meta.parentTabId === tabId) {
                removedIds.add(tab.id);
            }
        });
        updateActiveForm({ ...activeForm, tabs: activeForm.tabs.filter((t) => !removedIds.has(t.id)) });
    };

    const saveTab = (next: FormTabConfig) => {
        if (!activeForm) return;
        updateActiveForm({ ...activeForm, tabs: activeForm.tabs.map((t) => (t.id === next.id ? next : t)) });
        setEditingTab(null);
    };

    const tabStructure = useMemo(() => {
        if (!activeForm) return { roots: [] as FormTabConfig[], childrenByParent: {} as Record<string, FormTabConfig[]> };

        const roots = activeForm.tabs.filter((tab) => !parseTabMeta(tab).parentTabId);
        const childrenByParent = activeForm.tabs.reduce<Record<string, FormTabConfig[]>>((acc, tab) => {
            const parentId = parseTabMeta(tab).parentTabId;
            if (parentId) {
                if (!acc[parentId]) acc[parentId] = [];
                acc[parentId].push(tab);
            }
            return acc;
        }, {});

        return { roots, childrenByParent };
    }, [activeForm]);

    const moveRootTab = (tabId: string, dir: -1 | 1) => {
        if (!activeForm) return;
        const { roots, childrenByParent } = tabStructure;
        const idx = roots.findIndex((t) => t.id === tabId);
        const ni = idx + dir;
        if (ni < 0 || ni >= roots.length) return;
        const newRoots = [...roots];
        [newRoots[idx], newRoots[ni]] = [newRoots[ni], newRoots[idx]];
        const newTabs: FormTabConfig[] = [];
        newRoots.forEach((r) => {
            newTabs.push(r);
            (childrenByParent[r.id] || []).forEach((c) => newTabs.push(c));
        });
        updateActiveForm({ ...activeForm, tabs: newTabs });
    };

    const moveChildTab = (parentId: string, tabId: string, dir: -1 | 1) => {
        if (!activeForm) return;
        const siblings = activeForm.tabs.filter((t) => parseTabMeta(t).parentTabId === parentId);
        const idx = siblings.findIndex((t) => t.id === tabId);
        const ni = idx + dir;
        if (ni < 0 || ni >= siblings.length) return;
        const next = [...activeForm.tabs];
        const i1 = next.findIndex((t) => t.id === siblings[idx].id);
        const i2 = next.findIndex((t) => t.id === siblings[ni].id);
        [next[i1], next[i2]] = [next[i2], next[i1]];
        updateActiveForm({ ...activeForm, tabs: next });
    };

    const previewRootTab = useMemo(() => {
        if (tabStructure.roots.length === 0) return null;
        return tabStructure.roots.find((tab) => tab.id === previewRootTabId) ?? tabStructure.roots[0];
    }, [tabStructure, previewRootTabId]);

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '280px 1fr' }, gap: 2, height: '100%', overflow: 'hidden' }}>

            {/* Left: form list */}
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={createForm}>
                        Tạo form mới
                    </Button>
                </CardContent>
                <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
                    <Stack spacing={0.75}>
                        {forms.map((form: FormConfig) => {
                            const isActive = form.id === activeFormId;
                            const totalSets = form.tabs.reduce((a: number, t: FormTabConfig) => a + t.setIds.length, 0);
                            return (
                                <Box
                                    key={form.id}
                                    onClick={() => setActiveFormId(form.id)}
                                    sx={{
                                        p: 1.5, borderRadius: 2.5, cursor: 'pointer', border: '1px solid',
                                        borderColor: isActive ? 'primary.main' : 'divider',
                                        bgcolor: isActive ? 'action.selected' : 'background.paper',
                                        '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={700} noWrap>{form.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>{form.desc}</Typography>
                                    <Stack direction="row" spacing={0.75} mt={0.75}>
                                        <Chip size="small" icon={<LibraryBooksIcon sx={{ fontSize: 12 }} />} label={`${form.tabs.length} tab`} />
                                        <Chip size="small" label={`${totalSets} bộ dữ liệu`} variant="outlined" />
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>
            </Card>

            {/* Right: form editor */}
            {activeForm ? (
                <Card sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Form header */}
                    <CardContent sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                                <TextField
                                    fullWidth size="small" label="Tên form"
                                    value={activeForm.name}
                                    onChange={(e) => updateActiveForm({ ...activeForm, name: e.target.value })}
                                    sx={{ mb: 1 }}
                                />
                                <TextField
                                    fullWidth size="small" label="Mô tả"
                                    value={activeForm.desc ?? ''}
                                    onChange={(e) => updateActiveForm({ ...activeForm, desc: e.target.value })}
                                />
                            </Box>
                            <Stack direction="row" spacing={1} alignSelf={{ xs: 'flex-start', sm: 'flex-end' }}>
                                <Chip
                                    size="small" color="primary" variant="outlined"
                                    icon={<LibraryBooksIcon sx={{ fontSize: 14 }} />}
                                    label={`${activeForm.tabs.length} tab`}
                                />
                                <Button color="error" variant="outlined" size="small" startIcon={<DeleteIcon />}
                                    onClick={() => deleteForm(activeForm.id)}>
                                    Xoá form
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>

                    {/* Tab list editor */}
                    <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', color: 'text.secondary' }}>
                                Cấu hình tab ({activeForm.tabs.length})
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addTab}>
                                    Thêm tab
                                </Button>
                                <Button size="small" variant="outlined" color="secondary" startIcon={<BuildIcon />} onClick={addSyncStructure}>
                                    Thêm cấu trúc đồng bộ
                                </Button>
                            </Stack>
                        </Stack>

                        {activeForm.tabs.length === 0 && (
                            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5}}>
                                <LibraryBooksIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                <Typography color="text.secondary" mb={1}>Form chưa có tab nào.</Typography>
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={addTab}>Thêm tab đầu tiên</Button>
                            </Box>
                        )}

                        <Stack spacing={1.5}>
                            {tabStructure.roots.map((tab: FormTabConfig, rootIndex: number) => {
                                const tabMeta = parseTabMeta(tab);
                                const rootIdx = tabStructure.roots.findIndex((t) => t.id === tab.id);
                                const selectedSets = getRealSetIds(tab)
                                    .map((id: string) => fieldSets.find((s: FieldSet) => s.id === id))
                                    .filter(Boolean) as FieldSet[];
                                const totalFields = selectedSets.reduce((a: number, s: FieldSet) => a + s.fieldIds.length, 0);
                                const children = tabStructure.childrenByParent[tab.id] || [];
                                const tabTypeLabel = tabMeta.tabType === 'sync-group' ? 'Nhóm đồng bộ' : 'Tab thường';

                                return (
                                    <Card
                                        key={`${tab.id}-${rootIndex}`}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 2.5,
                                            borderColor: tabMeta.tabType === 'sync-group' ? 'secondary.main' : 'divider',
                                            '&:hover': { boxShadow: 2 },
                                            transition: 'box-shadow 0.2s',
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Stack direction="row" alignItems="flex-start" spacing={1}>
                                                {/* Reorder root tabs */}
                                                <Stack direction="column" spacing={0.5} sx={{ minWidth: 88 }}>
                                                    <Button size="small" variant="outlined"
                                                        startIcon={<ArrowUpwardIcon fontSize="small" />}
                                                        onClick={() => moveRootTab(tab.id, -1)}
                                                        disabled={rootIdx === 0}>
                                                        Lên
                                                    </Button>
                                                    <Button size="small" variant="outlined"
                                                        startIcon={<ArrowDownwardIcon fontSize="small" />}
                                                        onClick={() => moveRootTab(tab.id, 1)}
                                                        disabled={rootIdx === tabStructure.roots.length - 1}>
                                                        Xuống
                                                    </Button>
                                                </Stack>

                                                {/* Content */}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
                                                        <Chip size="small" label={`Tab ${rootIdx + 1}`}
                                                            sx={{ fontWeight: 700, fontFamily: 'monospace', bgcolor: 'action.selected' }} />
                                                        <Typography variant="body1" fontWeight={700}>{tab.label}</Typography>
                                                        <Chip size="small" label={tabTypeLabel}
                                                            color={tabMeta.tabType === 'normal' ? 'default' : 'secondary'} variant="outlined" />
                                                        {tabMeta.tabType !== 'sync-group' && (
                                                            <Chip size="small" label={`${selectedSets.length} bộ • ${totalFields} trường`} variant="outlined" />
                                                        )}
                                                        {tabMeta.tabType === 'sync-group' && (
                                                            <Chip size="small" label={`${children.length} tab con`} color="secondary" />
                                                        )}
                                                    </Stack>
                                                    {tabMeta.tabType !== 'sync-group' && (
                                                        selectedSets.length === 0 ? (
                                                            <Typography variant="caption" color="text.disabled">Chưa chọn bộ dữ liệu nào.</Typography>
                                                        ) : (
                                                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                                {selectedSets.map((set: FieldSet, setIndex: number) => (
                                                                    <Chip key={`${set.id}-${setIndex}`} size="small"
                                                                        icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: set.color }}>{set.icon}</Box> as any}
                                                                        label={set.name}
                                                                        sx={{ border: `1px solid ${set.color}55`, bgcolor: `${set.color}11`, color: set.color }}
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        )
                                                    )}
                                                </Box>

                                                {/* Actions */}
                                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                    <Button size="small" variant="outlined"
                                                        startIcon={<EditIcon fontSize="small" />}
                                                        onClick={() => setEditingTab(tab)}>
                                                        Cấu hình
                                                    </Button>
                                                    <Button size="small" variant="outlined" color="error"
                                                        startIcon={<DeleteIcon fontSize="small" />}
                                                        onClick={() => removeTab(tab.id)}>
                                                        Xóa
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </CardContent>

                                        {/* Children section — rendered INSIDE the parent card */}
                                        {tabMeta.tabType === 'sync-group' && (
                                            <Box sx={{ mx: 1.5, mb: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'secondary.light' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={children.length > 0 ? 1 : 0.5}>
                                                    <Typography variant="caption" fontWeight={700} color="secondary.main"
                                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Tabs con ({children.length})
                                                    </Typography>
                                                    <Button size="small" variant="outlined" color="secondary"
                                                        startIcon={<AddIcon fontSize="small" />}
                                                        onClick={() => {
                                                            if (!activeForm) return;
                                                            const nextChild = withTabMeta(
                                                                { id: randomId('tab'), label: `Tab con ${children.length + 1}`, setIds: [] },
                                                                { tabType: 'sync-leaf', parentTabId: tab.id, syncSourceType: 'root_equipment' },
                                                            );
                                                            updateActiveForm({ ...activeForm, tabs: [...activeForm.tabs, nextChild] });
                                                            setPreviewRootTabId(tab.id);
                                                        }}>
                                                        Thêm tab con
                                                    </Button>
                                                </Stack>
                                                {children.length === 0 ? (
                                                    <Typography variant="caption" color="text.disabled">Chưa có tab con. Nhấn "+ Thêm tab con" để tạo.</Typography>
                                                ) : (
                                                    <Stack spacing={1}>
                                                        {children.map((child: FormTabConfig, ci: number) => {
                                                            const childMeta = parseTabMeta(child);
                                                            const childSets = getRealSetIds(child)
                                                                .map((id: string) => fieldSets.find((s: FieldSet) => s.id === id))
                                                                .filter(Boolean) as FieldSet[];
                                                            const childTotalFields = childSets.reduce((a: number, s: FieldSet) => a + s.fieldIds.length, 0);
                                                            return (
                                                                <Card key={`${child.id}-${ci}`} variant="outlined"
                                                                    sx={{ borderRadius: 1.5, bgcolor: 'background.paper', '&:hover': { boxShadow: 1 } }}>
                                                                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                                                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                                                            <Stack direction="row" spacing={0.25}>
                                                                                <Button size="small" variant="text"
                                                                                    sx={{ minWidth: 0, px: 0.5, fontSize: '0.7rem' }}
                                                                                    startIcon={<ArrowUpwardIcon sx={{ fontSize: '14px !important' }} />}
                                                                                    onClick={() => moveChildTab(tab.id, child.id, -1)}
                                                                                    disabled={ci === 0}>
                                                                                    Lên
                                                                                </Button>
                                                                                <Button size="small" variant="text"
                                                                                    sx={{ minWidth: 0, px: 0.5, fontSize: '0.7rem' }}
                                                                                    startIcon={<ArrowDownwardIcon sx={{ fontSize: '14px !important' }} />}
                                                                                    onClick={() => moveChildTab(tab.id, child.id, 1)}
                                                                                    disabled={ci === children.length - 1}>
                                                                                    Xuống
                                                                                </Button>
                                                                            </Stack>
                                                                            <Divider orientation="vertical" flexItem />
                                                                            <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 80 }}>{child.label}</Typography>
                                                                            <Chip size="small" label={`${childSets.length} bộ • ${childTotalFields} trường`} variant="outlined" />
                                                                            {childMeta.syncCategory && (
                                                                                <Chip size="small" label={`Loại: ${childMeta.syncCategory}`} color="info" variant="outlined" />
                                                                            )}
                                                                            <Button size="small" variant="outlined"
                                                                                startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                                                                                onClick={() => setEditingTab(child)}>
                                                                                Cấu hình
                                                                            </Button>
                                                                            <Button size="small" variant="outlined" color="error"
                                                                                startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                                                                                onClick={() => removeTab(child.id)}>
                                                                                Xóa
                                                                            </Button>
                                                                        </Stack>
                                                                    </CardContent>
                                                                </Card>
                                                            );
                                                        })}
                                                    </Stack>
                                                )}
                                            </Box>
                                        )}
                                    </Card>
                                );
                            })}
                        </Stack>

                        {/* Live structure preview */}
                        {activeForm.tabs.length > 0 && (
                            <Box sx={{ mt: 3 }}>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.secondary"
                                    sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                    Xem trước cấu trúc form
                                </Typography>
                                <Card variant="outlined" sx={{ borderRadius: 2.5}}>
                                    <CardContent sx={{ p: 0 }}>
                                        {/* Mock tab header - root tabs only */}
                                        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                                            {tabStructure.roots.map((tab: FormTabConfig, rootIndex: number) => {
                                                const meta = parseTabMeta(tab);
                                                const childCount = (tabStructure.childrenByParent[tab.id] || []).length;
                                                const isSelected = previewRootTab?.id === tab.id;
                                                return (
                                                    <Box key={`${tab.id}-${rootIndex}`} onClick={() => setPreviewRootTabId(tab.id)} sx={{
                                                        px: 2, py: 1, borderRight: '1px solid', borderColor: 'divider',
                                                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                                                        fontWeight: isSelected ? 700 : 400,
                                                        fontSize: '0.8rem', whiteSpace: 'nowrap',
                                                        color: isSelected ? 'primary.main' : 'text.secondary',
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
                                                    }}>
                                                        {tab.label}
                                                        {meta.tabType === 'sync-group' && childCount > 0 && (
                                                            <Box component="span" sx={{ ml: 0.5, fontSize: '0.7rem', color: 'secondary.main' }}>
                                                                ({childCount} tab con)
                                                            </Box>
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                        {/* First tab content preview */}
                                        {(() => {
                                            if (!previewRootTab) return null;
                                            const previewMeta = parseTabMeta(previewRootTab);
                                            if (previewMeta.tabType === 'sync-group') {
                                                const subTabs = tabStructure.childrenByParent[previewRootTab.id] || [];
                                                return (
                                                    <Box sx={{ p: 2 }}>
                                                        <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                                            Tab "{previewRootTab.label}" - Nhom dong bo, chua {subTabs.length} tab con:
                                                        </Typography>
                                                        {subTabs.length > 0 && (
                                                            <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', mb: 1.5 }}>
                                                                {subTabs.map((sub: FormTabConfig, si: number) => (
                                                                    <Box key={`${sub.id}-${si}`} sx={{
                                                                        px: 1.5, py: 0.75, borderRight: '1px solid', borderColor: 'divider',
                                                                        fontSize: '0.75rem',
                                                                        color: si === 0 ? 'secondary.main' : 'text.secondary',
                                                                        fontWeight: si === 0 ? 600 : 400,
                                                                    }}>
                                                                        {sub.label}
                                                                    </Box>
                                                                ))}
                                                            </Box>
                                                        )}
                                                        {subTabs.length === 0 && (
                                                            <Typography variant="caption" color="text.disabled">Ch\u01b0a c\u00f3 tab con n\u00e0o.</Typography>
                                                        )}
                                                    </Box>
                                                );
                                            }
                                            const previewFields = getRealSetIds(previewRootTab).flatMap((sid: string) => {
                                                const set = fieldSets.find((s: FieldSet) => s.id === sid);
                                                return (set?.fieldIds ?? []).map((fid: string) => fields.find((f: DynamicField) => f.id === fid)).filter(Boolean) as DynamicField[];
                                            });
                                            return (
                                                <Box sx={{ p: 2 }}>
                                                    <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                                        Noi dung tab "{previewRootTab.label}":
                                                    </Typography>
                                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
                                                        {previewFields.map((field: DynamicField, fieldIndex: number) => (
                                                            <Box key={`${field.id}-${fieldIndex}`} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                                                                <Typography variant="caption" fontWeight={600} noWrap>{field.label}</Typography>
                                                                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontFamily: 'monospace' }}>{field.type}</Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                    {previewFields.length === 0 && (
                                                        <Typography variant="caption" color="text.disabled">Tab chua co bo du lieu.</Typography>
                                                    )}
                                                </Box>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </Box>
                        )}
                    </Box>
                </Card>
            ) : (
                <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <BuildIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                        <Typography color="text.secondary" mb={1}>Chọn một form hoặc tạo mới</Typography>
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={createForm}>Tạo form mới</Button>
                    </CardContent>
                </Card>
            )}

            {editingTab && activeForm && (
                <TabSetPickerDialog
                    open={Boolean(editingTab)}
                    tab={editingTab}
                    allTabs={activeForm.tabs}
                    fieldSets={fieldSets}
                    fields={fields}
                    onSave={saveTab}
                    onClose={() => setEditingTab(null)}
                />
            )}
        </Box>
    );
};

export default PageFormConfig;
