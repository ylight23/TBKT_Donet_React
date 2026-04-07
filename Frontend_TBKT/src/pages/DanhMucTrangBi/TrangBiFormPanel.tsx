import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import danhMucTrangBiApi, { type DanhMucTrangBiTree, type TrangBiSpecializationOption } from '../../apis/danhMucTrangBiApi';
import TrangBiFormConfigDialog from './TrangBiFormConfigDialog';
import DynamicDataForm from '../CauHinhThamSo/subComponents/DynamicDataForm';
import type { AppDispatch, RootState } from '../../store';
import type { LocalDynamicField, LocalFieldSet, LocalFormConfig } from '../../apis/thamSoApi';
import { saveFormConfig } from '../../store/reducer/thamSo';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import { getRealSetIds } from '../CauHinhThamSo/subComponents/formTabMeta';
import { buildByNormalizedId, normalizeId } from '../../utils/idUtils';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STANDARD_KEYS = new Set(['ten', 'tenDayDu', 'vietTat', 'idCapTren', 'thuTu']);

/**
 * Extract the first-level category number from a DanhMucTrangBi node ID.
 * e.g. 'B.1.01.00.00.00.001' → '1', 'T.3.02.01.00.00.000' → '3'
 * Returns '' for root-level or unrecognised IDs.
 */
function extractCategoryL1(nodeId: string | undefined | null): string {
    if (!nodeId) return '';
    const parts = nodeId.split('.');
    // parts[0]=CN, parts[1]=L1, parts[2..]=deeper levels
    if (parts.length >= 2) {
        const l1 = parts[1];
        // root nodes have L1='0', skip those
        if (l1 && l1 !== '0') return l1;
    }
    return '';
}

/** Extract form data from a DanhMucTrangBi node */
function nodeToFormData(node: DanhMucTrangBiTree): Record<string, string> {
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

/** Resolve fields for one FormConfig tab from Redux FieldSets (hydrated by backend). */
function resolveTabFields(
    setIds: string[],
    allFieldSets: LocalFieldSet[],
): LocalDynamicField[] {
    const fieldSetById = buildByNormalizedId(allFieldSets);
    const seenFieldIds = new Set<string>();
    const resolved: LocalDynamicField[] = [];

    getRealSetIds({ id: '', label: '', setIds }).forEach((setId) => {
        const fieldSet = fieldSetById.get(normalizeId(setId));
        if (!fieldSet) return;

        const hydratedFields = (fieldSet.fields ?? [])
            .filter(Boolean)
            .filter((field) => {
                const key = normalizeId(field.id);
                if (!key || seenFieldIds.has(key)) return false;
                seenFieldIds.add(key);
                return true;
            });

        resolved.push(...hydratedFields);
    });

    return resolved;
}

// ─── component ────────────────────────────────────────────────────────────────

interface TrangBiFormPanelProps {
    cn: string;
    cnLabel: string;
    cnOptions: TrangBiSpecializationOption[];
    node: DanhMucTrangBiTree | null;
    /** Called after a successful save with the updated/new node id */
    onSaved: (id: string, isNew: boolean) => void;
}

const TrangBiFormPanel: React.FC<TrangBiFormPanelProps> = ({ cn, cnLabel, cnOptions, node, onSaved }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { canCnAction, loaded: permissionLoaded } = useMyPermissions();
    const { formConfigs, fieldSets, loaded } = useSelector(
        (s: RootState) => s.thamSoReducer,
    );

    // Common config: trangbi-{cn} — backend normalizes to lowercase
    const cnLower = cn.toLowerCase();
    const commonConfig: LocalFormConfig | undefined = useMemo(
        () => formConfigs.find((fc) => fc.key === `trangbi-${cnLower}`),
        [formConfigs, cnLower],
    );

    // Category-specific config: trangbi-{cn}-{L1}
    const categoryL1 = useMemo(() => extractCategoryL1(node?.id), [node?.id]);
    const categoryConfig: LocalFormConfig | undefined = useMemo(
        () => categoryL1 ? formConfigs.find((fc) => fc.key === `trangbi-${cnLower}-${categoryL1}`) : undefined,
        [formConfigs, cnLower, categoryL1],
    );

    // Either config existing means we can show something
    const hasAnyConfig = !!commonConfig || !!categoryConfig;

    // Build tab groups from common config
    const commonTabGroups = useMemo(() => {
        if (!commonConfig) return [];
        return commonConfig.tabs
            .filter((tab) => {
                const realIds = tab.setIds.filter((id) => !id.startsWith('__meta:'));
                return realIds.length > 0;
            })
            .map((tab) => ({
                id: tab.id,
                label: tab.label,
                fields: resolveTabFields(tab.setIds, fieldSets),
            }));
    }, [commonConfig, fieldSets]);

    // Build tab groups from category config
    const categoryTabGroups = useMemo(() => {
        if (!categoryConfig) return [];
        return categoryConfig.tabs
            .filter((tab) => {
                const realIds = tab.setIds.filter((id) => !id.startsWith('__meta:'));
                return realIds.length > 0;
            })
            .map((tab) => ({
                id: `cat_${tab.id}`,
                label: tab.label,
                fields: resolveTabFields(tab.setIds, fieldSets),
            }));
    }, [categoryConfig, fieldSets]);

    // Merge all fields for validation
    const allFields = useMemo(
        () => [
            ...commonTabGroups.flatMap((g) => g.fields),
            ...categoryTabGroups.flatMap((g) => g.fields),
        ],
        [commonTabGroups, categoryTabGroups],
    );

    // Merge all tab groups for display
    const mergedTabGroups = useMemo(() => {
        const groups = [
            ...commonTabGroups,
            ...categoryTabGroups,
        ];
        return groups;
    }, [commonTabGroups, categoryTabGroups]);

    const [isNew, setIsNew] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [saving, setSaving] = useState(false);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
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
        if (!canCnAction('add', cn)) return;
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
        const canSave = isNew ? canCnAction('add', cn) : canCnAction('edit', cn);
        if (!canSave) {
            setSnack({ open: true, message: 'Khong co quyen thao tac voi chuyen nganh nay', severity: 'error' });
            return;
        }

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
            const res = await danhMucTrangBiApi.saveTreeItem(
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

    const canAddInCn = permissionLoaded ? canCnAction('add', cn) : true;
    const canEditInCn = permissionLoaded ? canCnAction('edit', cn) : true;
    const saveDisabled = saving || (isNew ? !canAddInCn : !canEditInCn);

    if (!hasAnyConfig) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Chưa có cấu hình tham số cho chuyên ngành <strong>{cnLabel}</strong> ({cn}).
                </Alert>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<BuildIcon />}
                        onClick={() => setConfigDialogOpen(true)}
                        disabled={!canAddInCn}
                    >
                        Tạo cấu hình nhanh
                    </Button>
                </Stack>
                <TrangBiFormConfigDialog
                    open={configDialogOpen}
                    onClose={() => setConfigDialogOpen(false)}
                    cn={cn}
                    cnLabel={cnLabel}
                    cnOptions={cnOptions}
                    onCreated={() => setSnack({ open: true, message: 'Đã tạo cấu hình thành công!', severity: 'success' })}
                />
                <Snackbar
                    open={snack.open}
                    autoHideDuration={3500}
                    onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
                >
                    <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
                        {snack.message}
                    </Alert>
                </Snackbar>
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
                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleNew} disabled={!canAddInCn}>
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
                            disabled={saving || !canAddInCn}
                        >
                            Them moi
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                            onClick={() => void handleSave()}
                            disabled={saveDisabled}
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
                {permissionLoaded && !(isNew ? canAddInCn : canEditInCn) && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        Tai khoan hien tai khong co quyen {isNew ? 'them moi' : 'chinh sua'} du lieu thuoc chuyen nganh {cnLabel}.
                    </Alert>
                )}
            </Box>

            <Divider />

            {/* Form */}
            <Box sx={{ flex: 1, overflow: 'hidden auto', p: 2 }}>
                {/* Common parameters section */}
                {commonTabGroups.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <SettingsIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2" fontWeight={700} color="primary">
                                Thông số chung
                            </Typography>
                            <Chip label={commonConfig?.name ?? ''} size="small" variant="outlined" />
                        </Stack>
                        <DynamicDataForm
                            fields={commonTabGroups.flatMap((g) => g.fields)}
                            tabGroups={commonTabGroups.length > 1 ? commonTabGroups : undefined}
                            data={formData}
                            errors={errors}
                            onChange={handleChange}
                        />
                    </Paper>
                )}

                {/* Category-specific parameters section */}
                {categoryTabGroups.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <BuildIcon fontSize="small" color="secondary" />
                            <Typography variant="subtitle2" fontWeight={700} color="secondary">
                                Thông số kĩ thuật riêng
                            </Typography>
                            <Chip
                                label={`${categoryConfig?.name ?? ''} (${cn}.${categoryL1})`}
                                size="small"
                                variant="outlined"
                                color="secondary"
                            />
                        </Stack>
                        <DynamicDataForm
                            fields={categoryTabGroups.flatMap((g) => g.fields)}
                            tabGroups={categoryTabGroups.length > 1 ? categoryTabGroups : undefined}
                            data={formData}
                            errors={errors}
                            onChange={handleChange}
                        />
                    </Paper>
                )}

                {/* Hint when no category config exists but node is selected */}
                {node && categoryL1 && !categoryConfig && (
                    <Alert
                        severity="info"
                        variant="outlined"
                        sx={{ mb: 2 }}
                        action={
                            <Button
                                size="small"
                                startIcon={<BuildIcon />}
                                onClick={() => {
                                    const catKey = `trangbi-${cnLower}-${categoryL1}`;
                                    void dispatch(saveFormConfig({
                                        formConfig: {
                                            id: `form_${Math.random().toString(36).slice(2, 9)}`,
                                            key: catKey,
                                            name: `TSKT ${cnLabel} / ${cn}.${categoryL1}`,
                                            desc: '',
                                            tabs: [{ id: `tab_${Math.random().toString(36).slice(2, 9)}`, label: 'Thông số kĩ thuật', setIds: [] }],
                                        },
                                        isNew: true,
                                    })).unwrap().then(() => {
                                        setSnack({ open: true, message: `Đã tạo cấu hình ${catKey}`, severity: 'success' });
                                    }).catch(() => {
                                        setSnack({ open: true, message: 'Lỗi tạo cấu hình', severity: 'error' });
                                    });
                                }}
                            >
                                Tạo nhanh
                            </Button>
                        }
                    >
                        Chưa có thông số kĩ thuật riêng cho danh mục <strong>{cn}.{categoryL1}</strong>.
                    </Alert>
                )}

                {/* Fallback: no fields at all from either config */}
                {commonTabGroups.length === 0 && categoryTabGroups.length === 0 && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <DynamicDataForm
                            fields={[]}
                            data={formData}
                            errors={errors}
                            onChange={handleChange}
                        />
                    </Paper>
                )}
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
