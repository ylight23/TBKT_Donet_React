import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
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

    const activeForm = forms.find((f) => f.id === activeFormId) ?? null;

    const updateActiveForm = (next: FormConfig) =>
        setForms((prev) => prev.map((f) => (f.id === next.id ? next : f)));

    const createForm = () => {
        const id = `form_${Math.random().toString(36).slice(2, 9)}`;
        const newForm: FormConfig = {
            id,
            name: 'Form mới',
            desc: '',
            tabs: [{ id: `tab_${Math.random().toString(36).slice(2, 9)}`, label: 'Tab 1', setIds: [] }],
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
        const newTab: FormTabConfig = { id: `tab_${Math.random().toString(36).slice(2, 9)}`, label: `Tab ${activeForm.tabs.length + 1}`, setIds: [] };
        updateActiveForm({ ...activeForm, tabs: [...activeForm.tabs, newTab] });
    };

    const removeTab = (tabId: string) => {
        if (!activeForm) return;
        updateActiveForm({ ...activeForm, tabs: activeForm.tabs.filter((t) => t.id !== tabId) });
    };

    const saveTab = (next: FormTabConfig) => {
        if (!activeForm) return;
        updateActiveForm({ ...activeForm, tabs: activeForm.tabs.map((t) => (t.id === next.id ? next : t)) });
        setEditingTab(null);
    };

    const moveTab = (index: number, dir: -1 | 1) => {
        if (!activeForm) return;
        const ni = index + dir;
        if (ni < 0 || ni >= activeForm.tabs.length) return;
        const next = [...activeForm.tabs];
        [next[index], next[ni]] = [next[ni], next[index]];
        updateActiveForm({ ...activeForm, tabs: next });
    };

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
                            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addTab}>
                                Thêm tab
                            </Button>
                        </Stack>

                        {activeForm.tabs.length === 0 && (
                            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5}}>
                                <LibraryBooksIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                <Typography color="text.secondary" mb={1}>Form chưa có tab nào.</Typography>
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={addTab}>Thêm tab đầu tiên</Button>
                            </Box>
                        )}

                        <Stack spacing={1.5}>
                            {activeForm.tabs.map((tab: FormTabConfig, idx: number) => {
                                const selectedSets = tab.setIds
                                    .map((id: string) => fieldSets.find((s: FieldSet) => s.id === id))
                                    .filter(Boolean) as FieldSet[];
                                const totalFields = selectedSets.reduce((a: number, s: FieldSet) => a + s.fieldIds.length, 0);

                                return (
                                    <Card
                                        key={tab.id}
                                        variant="outlined"
                                        sx={{ borderRadius: 2.5, borderColor: 'divider', '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}
                                    >
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Stack direction="row" alignItems="flex-start" spacing={1}>
                                                {/* Reorder */}
                                                <Stack direction="column" spacing={0.25}>
                                                    <IconButton size="small" onClick={() => moveTab(idx, -1)} disabled={idx === 0}>
                                                        <ArrowUpwardIcon fontSize="inherit" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => moveTab(idx, 1)} disabled={idx === activeForm.tabs.length - 1}>
                                                        <ArrowDownwardIcon fontSize="inherit" />
                                                    </IconButton>
                                                </Stack>

                                                {/* Content */}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                                        <Chip
                                                            size="small"
                                                            label={`Tab ${idx + 1}`}
                                                            sx={{ fontWeight: 700, fontFamily: 'monospace', bgcolor: 'action.selected' }}
                                                        />
                                                        <Typography variant="body1" fontWeight={700}>{tab.label}</Typography>
                                                        <Chip size="small" label={`${selectedSets.length} bộ • ${totalFields} trường`} variant="outlined" />
                                                    </Stack>

                                                    {/* Selected sets display */}
                                                    {selectedSets.length === 0 ? (
                                                        <Typography variant="caption" color="text.disabled">Chưa chọn bộ dữ liệu nào.</Typography>
                                                    ) : (
                                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                            {selectedSets.map((set: FieldSet) => (
                                                                <Chip
                                                                    key={set.id} size="small"
                                                                    icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: set.color }}>{set.icon}</Box> as any}
                                                                    label={set.name}
                                                                    sx={{ border: `1px solid ${set.color}55`, bgcolor: `${set.color}11`, color: set.color }}
                                                                />
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Box>

                                                {/* Actions */}
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Cấu hình tab">
                                                        <IconButton size="small" onClick={() => setEditingTab(tab)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Xóa tab">
                                                        <IconButton size="small" color="error" onClick={() => removeTab(tab.id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
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
                                        {/* Mock tab header */}
                                        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                                            {activeForm.tabs.map((tab: FormTabConfig, i: number) => (
                                                <Box
                                                    key={tab.id}
                                                    sx={{
                                                        px: 2, py: 1, borderRight: '1px solid', borderColor: 'divider',
                                                        bgcolor: i === 0 ? 'action.selected' : 'transparent',
                                                        fontWeight: i === 0 ? 700 : 400,
                                                        fontSize: '0.8rem', whiteSpace: 'nowrap', color: i === 0 ? 'primary.main' : 'text.secondary',
                                                    }}
                                                >
                                                    {tab.label}
                                                </Box>
                                            ))}
                                        </Box>
                                        {/* First tab fields preview */}
                                        <Box sx={{ p: 2 }}>
                                            <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                                Nội dung tab “{activeForm.tabs[0]?.label}”:
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
                                                {activeForm.tabs[0]?.setIds
                                                    .flatMap((sid: string) => {
                                                        const set = fieldSets.find((s: FieldSet) => s.id === sid);
                                                        return (set?.fieldIds ?? []).map((fid: string) => fields.find((f: DynamicField) => f.id === fid)).filter(Boolean) as DynamicField[];
                                                    })
                                                    .map((field: DynamicField) => (
                                                        <Box key={field.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2.5}}>
                                                            <Typography variant="caption" fontWeight={600} noWrap>{field.label}</Typography>
                                                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontFamily: 'monospace' }}>{field.type}</Typography>
                                                        </Box>
                                                    ))
                                                }
                                            </Box>
                                            {activeForm.tabs[0]?.setIds.length === 0 && (
                                                <Typography variant="caption" color="text.disabled">Tab chưa có bộ dữ liệu.</Typography>
                                            )}
                                        </Box>
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
