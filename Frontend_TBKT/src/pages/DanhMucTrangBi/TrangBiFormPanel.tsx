import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import catalogApi, { type CatalogTree } from '../../apis/catalogApi';
import DynamicDataForm from '../CauHinhThamSo/subComponents/DynamicDataForm';
import type { RootState } from '../../store';
import type { LocalDynamicField, LocalFieldSet, LocalFormConfig } from '../../apis/thamSoApi';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STANDARD_KEYS = new Set(['ten', 'tenDayDu', 'vietTat', 'idCapTren', 'thuTu']);

/** Extract form data from a CatalogTree node */
function nodeToFormData(node: CatalogTree): Record<string, string> {
    const data: Record<string, string> = {
        ten: node.ten ?? '',
        tenDayDu: node.tenDayDu ?? '',
        vietTat: node.vietTat ?? '',
        idCapTren: node.idCapTren ?? '',
        thuTu: String(node.thuTu ?? 0),
    };
    node.parameters.forEach((p) => {
        if (p.name) data[p.name] = p.stringValue ?? '';
    });
    return data;
}

/** Resolve fields for one FormConfig tab from Redux fieldSets + dynamicFields */
function resolveTabFields(
    setIds: string[],
    allFieldSets: LocalFieldSet[],
    allFields: LocalDynamicField[],
): LocalDynamicField[] {
    const realIds = setIds.filter((id) => !id.startsWith('__meta:'));
    return realIds.flatMap((setId) => {
        const fieldSet =
            allFieldSets.find((fs) => fs.id === setId);
        if (!fieldSet) return [];
        const ids = fieldSet.fieldIds ?? [];
        return ids.map((fid) => allFields.find((f) => f.id === fid)).filter(Boolean) as LocalDynamicField[];
    });
}

// ─── component ────────────────────────────────────────────────────────────────

interface TrangBiFormPanelProps {
    cn: string;
    node: CatalogTree | null;
    /** Called after a successful save with the updated/new node id */
    onSaved: (id: string, isNew: boolean) => void;
}

const CATALOG_NAME = 'DanhMucTrangBi';

const TrangBiFormPanel: React.FC<TrangBiFormPanelProps> = ({ cn, node, onSaved }) => {
    const { formConfigs, fieldSets, dynamicFields, loaded } = useSelector(
        (s: RootState) => s.thamSoReducer,
    );

    const formConfig: LocalFormConfig | undefined = useMemo(
        () => formConfigs.find((fc) => fc.key === `trangbi-${cn}`),
        [formConfigs, cn],
    );

    const tabGroups = useMemo(() => {
        if (!formConfig) return [];
        return formConfig.tabs
            .filter((tab) => {
                // exclude pure meta/sync-group tabs (they have only __meta: entries)
                const realIds = tab.setIds.filter((id) => !id.startsWith('__meta:'));
                return realIds.length > 0;
            })
            .map((tab) => ({
                id: tab.id,
                label: tab.label,
                fields: resolveTabFields(tab.setIds, fieldSets, dynamicFields),
            }));
    }, [formConfig, fieldSets, dynamicFields]);

    const allFields = useMemo(
        () => tabGroups.flatMap((g) => g.fields),
        [tabGroups],
    );

    const [isNew, setIsNew] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Sync formData when node changes (auto-fill from catalog)
    useEffect(() => {
        if (!node) {
            setFormData({});
            setErrors({});
            setIsNew(false);
            return;
        }
        setFormData(nodeToFormData(node));
        setErrors({});
        setIsNew(false);
    }, [node]);

    const handleNew = () => {
        const parentId = node?.id ?? cn;
        setFormData({ idCapTren: parentId });
        setErrors({});
        setIsNew(true);
    };

    const handleChange = useCallback((key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: null }));
    }, []);

    const handleSave = async () => {
        // Validate required fields
        const nextErrors: Record<string, string | null> = {};
        allFields.forEach((field) => {
            if (field.required && !String(formData[field.key] ?? '').trim()) {
                nextErrors[field.key] = `${field.label} la bat buoc`;
            }
        });
        if (Object.values(nextErrors).some(Boolean)) {
            setErrors(nextErrors);
            return;
        }

        // Split standard fields / parameters
        const { ten = '', tenDayDu, vietTat, idCapTren, thuTu, ...rest } = formData;
        const parameters: Record<string, string> = {};
        Object.entries(rest).forEach(([k, v]) => {
            if (!STANDARD_KEYS.has(k)) parameters[k] = v;
        });

        setSaving(true);
        try {
            const res = await catalogApi.saveCatalogTreeItem(
                CATALOG_NAME,
                {
                    id: isNew ? undefined : node?.id ?? undefined,
                    idCapTren,
                    ten,
                    tenDayDu,
                    vietTat,
                    thuTu: thuTu ? Number(thuTu) : undefined,
                    parameters,
                },
                { isNew, oldId: isNew ? undefined : node?.id ?? undefined },
            );
            setSnack({ open: true, message: 'Luu thanh cong!', severity: 'success' });
            onSaved(res.id, isNew);
            if (isNew) setIsNew(false);
        } catch (err) {
            setSnack({ open: true, message: (err as Error).message, severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // ── render ──────────────────────────────────────────────────────────────

    if (!loaded) {
        return (
            <Stack spacing={1.5} sx={{ p: 2 }}>
                <Skeleton variant="text" width={180} height={28} />
                <Skeleton variant="rounded" height={48} />
                <Skeleton variant="rounded" height={48} />
                <Skeleton variant="rounded" height={48} />
            </Stack>
        );
    }

    if (!formConfig) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="info">
                    Chua co FormConfig cho chuyen nganh <strong>{cn}</strong>.
                    <br />
                    Vao <em>Cau hinh tham so</em> va tao FormConfig voi key <code>trangbi-{cn}</code>.
                </Alert>
            </Box>
        );
    }

    if (!node && !isNew) {
        return (
            <Stack
                alignItems="center"
                justifyContent="center"
                spacing={2}
                sx={{ height: '100%', color: 'text.secondary' }}
            >
                <Typography variant="body2">Chon mot trang bi tu cay ben trai de xem chi tiet.</Typography>
                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleNew}>
                    Them moi
                </Button>
            </Stack>
        );
    }

    return (
        <Stack sx={{ height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle2" noWrap sx={{ maxWidth: 260 }}>
                        {isNew
                            ? `+ Them moi (Cap tren: ${formData.idCapTren ?? ''})`
                            : (node?.tenDayDu ?? node?.ten ?? node?.id ?? '')}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={handleNew}
                            disabled={saving}
                        >
                            Them moi
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                            onClick={() => void handleSave()}
                            disabled={saving}
                        >
                            Luu
                        </Button>
                    </Stack>
                </Stack>
                {node && !isNew && (
                    <Typography variant="caption" color="text.secondary">
                        ID: {node.id}
                    </Typography>
                )}
            </Box>

            <Divider />

            {/* Form */}
            <Box sx={{ flex: 1, overflow: 'hidden auto', p: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <DynamicDataForm
                        fields={allFields}
                        tabGroups={tabGroups.length > 1 ? tabGroups : undefined}
                        data={formData}
                        errors={errors}
                        onChange={handleChange}
                    />
                </Paper>
            </Box>

            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
            >
                <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Stack>
    );
};

export default TrangBiFormPanel;
