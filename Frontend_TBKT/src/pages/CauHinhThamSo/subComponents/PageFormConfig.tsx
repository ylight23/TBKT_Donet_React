import React, { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
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
    LocalFormTabConfig as FormTabConfig,
} from '../../../types/thamSo';
import { FieldSet } from '../types';
import TabSetPickerDialog from './TabSetPickerDialog';
import { getRealSetIds, randomId } from './formTabMeta';
import { getStableFormConfigKey, normalizeFormConfigKey } from '../../../utils/formConfigKeys';
import { buildAuditSummary } from '../../../utils/auditMeta';
import { getStripedRowBackground } from '../../../utils/stripedSurface';

interface PageFormConfigProps {
    fieldSets: FieldSet[];
    fields: DynamicField[];
    forms: FormConfig[];
    deletedForms: FormConfig[];
    onRestoreForm: (id: string) => void | Promise<void>;
    setForms: React.Dispatch<React.SetStateAction<FormConfig[]>>;
    persistFormNow?: (form: FormConfig) => void | Promise<void>;
    activeFormId: string | null;
    setActiveFormId: (id: string | null) => void;
}

const PageFormConfig: React.FC<PageFormConfigProps> = ({
    fieldSets,
    fields,
    forms,
    deletedForms,
    onRestoreForm,
    setForms,
    persistFormNow,
    activeFormId,
    setActiveFormId,
}) => {
    const theme = useTheme();
    const [editingTab, setEditingTab] = useState<FormTabConfig | null>(null);
    const [previewTabId, setPreviewTabId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');

    const activeForm = forms.find((f) => f.id === activeFormId) ?? null;
    const fieldMap = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);

    const resolveSetFields = (set: FieldSet): DynamicField[] => {
        if (set.fields && set.fields.length > 0) return set.fields;
        return (set.fieldIds ?? [])
            .map((fieldId) => fieldMap.get(fieldId))
            .filter((field): field is DynamicField => Boolean(field));
    };

    const updateActiveForm = (next: FormConfig, options?: { immediate?: boolean }) => {
        setForms((prev) => prev.map((f) => (f.id === next.id ? next : f)));
        if (options?.immediate && persistFormNow) {
            void Promise.resolve(persistFormNow(next))
                .then(() => setSaveError(''))
                .catch((error) => setSaveError((error as Error)?.message || 'Khong the luu cau hinh form'));
        }
    };

    const createForm = () => {
        const id = `form_${Math.random().toString(36).slice(2, 9)}`;
        const newForm: FormConfig = {
            id,
            key: `form-${Math.random().toString(36).slice(2, 7)}`,
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
        const newTab: FormTabConfig = {
            id: randomId('tab'),
            label: `Tab ${activeForm.tabs.length + 1}`,
            setIds: [],
        };
        updateActiveForm({ ...activeForm, tabs: [...activeForm.tabs, newTab] });
    };

    const removeTab = (tabId: string) => {
        if (!activeForm) return;
        updateActiveForm({ ...activeForm, tabs: activeForm.tabs.filter((tab) => tab.id !== tabId) });
    };

    const moveTab = (tabId: string, dir: -1 | 1) => {
        if (!activeForm) return;
        const tabs = [...activeForm.tabs];
        const idx = tabs.findIndex((tab) => tab.id === tabId);
        const ni = idx + dir;
        if (idx < 0 || ni < 0 || ni >= tabs.length) return;
        [tabs[idx], tabs[ni]] = [tabs[ni], tabs[idx]];
        updateActiveForm({ ...activeForm, tabs });
    };

    const saveTab = (nextTab: FormTabConfig) => {
        if (!activeForm) return;
        updateActiveForm(
            { ...activeForm, tabs: activeForm.tabs.map((tab) => (tab.id === nextTab.id ? nextTab : tab)) },
            { immediate: true },
        );
        setEditingTab(null);
    };

    const previewTab = useMemo(() => {
        if (!activeForm || activeForm.tabs.length === 0) return null;
        return activeForm.tabs.find((tab) => tab.id === previewTabId) ?? activeForm.tabs[0];
    }, [activeForm, previewTabId]);

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '280px 1fr' }, gap: 2, height: '100%', overflow: 'hidden' }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={createForm}>
                        Tạo form mới
                    </Button>
                </CardContent>
                <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
                    <Stack spacing={0.75}>
                        {forms.map((form) => {
                            const isActive = form.id === activeFormId;
                            const totalSets = form.tabs.reduce((a, t) => a + t.setIds.length, 0);
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
                                    <Typography variant="caption" color="text.secondary" noWrap>{getStableFormConfigKey(form)}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>{form.desc}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap display="block">{buildAuditSummary(form.audit)}</Typography>
                                    <Stack direction="row" spacing={0.75} mt={0.75}>
                                        <Chip size="small" icon={<LibraryBooksIcon sx={{ fontSize: 12 }} />} label={`${form.tabs.length} tab`} />
                                        <Chip size="small" label={`${totalSets} bộ dữ liệu`} variant="outlined" />
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Stack>
                    {deletedForms.length > 0 && (
                        <>
                            <Divider sx={{ my: 1.5 }} />
                            <Stack spacing={0.75}>
                                <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                                    Form da xoa trong phien
                                </Typography>
                                {deletedForms.map((form) => (
                                    <Box
                                        key={`restore-${form.id}`}
                                        sx={{ p: 1.25, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}
                                    >
                                        <Typography variant="body2" fontWeight={700} noWrap>{form.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap>{form.desc}</Typography>
                                        <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => void onRestoreForm(form.id)}>
                                            Khoi phuc
                                        </Button>
                                    </Box>
                                ))}
                            </Stack>
                        </>
                    )}
                </Box>
            </Card>

            {activeForm ? (
                <Card sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {saveError && <Alert severity="warning" sx={{ mb: 1.5 }}>{saveError}</Alert>}
                        <Alert severity="info" sx={{ mb: 1.5 }}>
                            FormConfig dùng cho form nhập động. TemplateLayout.schemaJson là layout runtime riêng và không thay thế FormConfig.
                        </Alert>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                                <TextField
                                    fullWidth size="small" label="Form key"
                                    value={activeForm.key}
                                    onChange={(e) => updateActiveForm({ ...activeForm, key: normalizeFormConfigKey(e.target.value) })}
                                    helperText="Runtime sẽ lookup theo key ổn định, không theo tên hiển thị."
                                    sx={{ mb: 1 }}
                                />
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
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    {buildAuditSummary(activeForm.audit)}
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} alignSelf={{ xs: 'flex-start', sm: 'flex-end' }}>
                                <Chip
                                    size="small" color="primary" variant="outlined"
                                    icon={<LibraryBooksIcon sx={{ fontSize: 14 }} />}
                                    label={`${activeForm.tabs.length} tab`}
                                />
                                <Button color="error" variant="outlined" size="small" startIcon={<DeleteIcon />} onClick={() => deleteForm(activeForm.id)}>
                                    Xoá form
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>

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
                            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
                                <LibraryBooksIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                <Typography color="text.secondary" mb={1}>Form chưa có tab nào.</Typography>
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={addTab}>Thêm tab đầu tiên</Button>
                            </Box>
                        )}

                        <Stack spacing={1.5}>
                            {activeForm.tabs.map((tab, index) => {
                                const selectedSets = getRealSetIds(tab)
                                    .map((id) => fieldSets.find((s) => s.id === id))
                                    .filter(Boolean) as FieldSet[];
                                const totalFields = selectedSets.reduce((a, s) => a + (s.fields?.length ?? s.fieldIds.length), 0);

                                return (
                                    <Card key={`${tab.id}-${index}`} variant="outlined" sx={{ borderRadius: 2.5, '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}>
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Stack direction="row" alignItems="flex-start" spacing={1}>
                                                <Stack direction="column" spacing={0.5} sx={{ minWidth: 88 }}>
                                                    <Button size="small" variant="outlined" startIcon={<ArrowUpwardIcon fontSize="small" />} onClick={() => moveTab(tab.id, -1)} disabled={index === 0}>
                                                        Lên
                                                    </Button>
                                                    <Button size="small" variant="outlined" startIcon={<ArrowDownwardIcon fontSize="small" />} onClick={() => moveTab(tab.id, 1)} disabled={index === activeForm.tabs.length - 1}>
                                                        Xuống
                                                    </Button>
                                                </Stack>

                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
                                                        <Chip size="small" label={`Tab ${index + 1}`} sx={{ fontWeight: 700, fontFamily: 'monospace', bgcolor: 'action.selected' }} />
                                                        <Typography variant="body2" fontWeight={700}>{tab.label}</Typography>
                                                        <Chip size="small" label={`${selectedSets.length} bộ • ${totalFields} trường`} variant="outlined" />
                                                    </Stack>
                                                    {selectedSets.length > 0 ? (
                                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                            {selectedSets.map((set) => (
                                                                <Chip key={set.id} size="small" label={set.name} variant="outlined" />
                                                            ))}
                                                        </Stack>
                                                    ) : (
                                                        <Typography variant="caption" color="text.disabled">Chưa chọn bộ dữ liệu nào.</Typography>
                                                    )}
                                                </Box>

                                                <Stack spacing={0.5}>
                                                    <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditingTab(tab)}>
                                                        Cấu hình
                                                    </Button>
                                                    <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => removeTab(tab.id)}>
                                                        Xóa
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>

                        {activeForm.tabs.length > 0 && (
                            <Box sx={{ mt: 3 }}>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.secondary"
                                    sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                    Xem trước cấu trúc form
                                </Typography>
                                <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                                    <CardContent sx={{ p: 0 }}>
                                        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                                            {activeForm.tabs.map((tab, index) => {
                                                const isSelected = previewTab?.id === tab.id;
                                                return (
                                                    <Box
                                                        key={`${tab.id}-${index}`}
                                                        onClick={() => setPreviewTabId(tab.id)}
                                                        sx={{
                                                            px: 2, py: 1, borderRight: '1px solid', borderColor: 'divider',
                                                            bgcolor: isSelected ? 'action.selected' : 'transparent',
                                                            fontWeight: isSelected ? 700 : 400,
                                                            fontSize: '0.8rem', whiteSpace: 'nowrap',
                                                            color: isSelected ? 'primary.main' : 'text.secondary',
                                                            cursor: 'pointer',
                                                            '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
                                                        }}
                                                    >
                                                        {tab.label}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                        {(() => {
                                            if (!previewTab) return null;
                                            const previewFields = getRealSetIds(previewTab).flatMap((setId) => {
                                                const set = fieldSets.find((s) => s.id === setId);
                                                if (!set) return [];
                                                return resolveSetFields(set);
                                            });

                                            return (
                                                <Box sx={{ p: 2 }}>
                                                    <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                                        Nội dung tab "{previewTab.label}":
                                                    </Typography>
                                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
                                                        {previewFields.map((field, idx) => (
                                                            <Box
                                                                key={`${field.id}-${idx}`}
                                                                sx={{
                                                                    p: 1,
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    borderRadius: 2.5,
                                                                    bgcolor: getStripedRowBackground(theme, idx),
                                                                }}
                                                            >
                                                                <Typography variant="caption" fontWeight={600} noWrap>{field.label}</Typography>
                                                                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontFamily: 'monospace' }}>{field.type}</Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                    {previewFields.length === 0 && (
                                                        <Typography variant="caption" color="text.disabled">Tab chưa có bộ dữ liệu.</Typography>
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
