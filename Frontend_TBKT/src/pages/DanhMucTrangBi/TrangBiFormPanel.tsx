import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
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
import danhMucTrangBiApi, {
    DANH_MUC_TRANG_BI_TREE_ENDPOINT,
    type DanhMucTrangBiTree,
    type TrangBiSpecializationOption,
} from '../../apis/danhMucTrangBiApi';
import TrangBiFormConfigDialog from './TrangBiFormConfigDialog';
import DynamicDataForm from '../CauHinhThamSo/subComponents/DynamicDataForm';
import type { RootState } from '../../store';
import type { LocalDynamicField, LocalFieldSet, LocalFormConfig } from '../../apis/thamSoApi';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import { getRealSetIds } from '../CauHinhThamSo/subComponents/formTabMeta';
import { buildByNormalizedId, normalizeId } from '../../utils/idUtils';

const STANDARD_KEYS = new Set(['ten', 'tenDayDu', 'vietTat', 'idCapTren', 'thuTu']);
const CATEGORY_FIELD_KEY = 'ma_danh_muc';

function nodeToFormData(node: DanhMucTrangBiTree): Record<string, string> {
    const data: Record<string, string> = {
        ten: node.ten ?? '',
        tenDayDu: node.tenDayDu ?? '',
        vietTat: node.vietTat ?? '',
        idCapTren: node.idCapTren ?? '',
        thuTu: String(node.thuTu ?? 0),
    };

    node.parameters.forEach((parameter) => {
        if (parameter.name) data[parameter.name] = parameter.stringValue ?? '';
    });

    return data;
}

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

interface TrangBiFormPanelProps {
    cn: string;
    cnLabel: string;
    cnOptions: TrangBiSpecializationOption[];
    node: DanhMucTrangBiTree | null;
    onSaved: (id: string, isNew: boolean) => void;
}

const TrangBiFormPanel: React.FC<TrangBiFormPanelProps> = ({ cn, cnLabel, cnOptions, node, onSaved }) => {
    const { canCnAction, loaded: permissionLoaded } = useMyPermissions();
    const { formConfigs, fieldSets, loaded } = useSelector(
        (s: RootState) => s.thamSoReducer,
    );

    const cnLower = cn.toLowerCase();
    const commonConfig: LocalFormConfig | undefined = useMemo(
        () => formConfigs.find((fc) => fc.key === `trangbi-${cnLower}`),
        [formConfigs, cnLower],
    );

    const [technicalFieldSets, setTechnicalFieldSets] = useState<LocalFieldSet[]>([]);
    const [technicalLoading, setTechnicalLoading] = useState(false);
    const [technicalError, setTechnicalError] = useState('');
    const technicalFetchRef = useRef(0);
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

    const applyFieldOverrides = useCallback((fields: LocalDynamicField[]): LocalDynamicField[] => (
        fields.map((field) => {
            if (field.key !== CATEGORY_FIELD_KEY) {
                return field;
            }

            return {
                ...field,
                type: 'select',
                validation: {
                    ...field.validation,
                    dataSource: 'api',
                    apiUrl: DANH_MUC_TRANG_BI_TREE_ENDPOINT,
                    displayType: 'tree',
                },
            };
        })
    ), []);

    const commonTabGroups = useMemo(() => {
        if (!commonConfig) return [];
        return commonConfig.tabs
            .filter((tab) => tab.setIds.some((id) => !id.startsWith('__meta:')))
            .map((tab) => ({
                id: tab.id,
                label: tab.label,
                fields: applyFieldOverrides(resolveTabFields(tab.setIds, fieldSets)),
            }));
    }, [applyFieldOverrides, commonConfig, fieldSets]);

    const selectedCategoryCode = useMemo(
        () => String(formData[CATEGORY_FIELD_KEY] ?? '').trim(),
        [formData],
    );

    const hasCategorySelector = useMemo(
        () => commonTabGroups.some((group) => group.fields.some((field) => field.key === CATEGORY_FIELD_KEY)),
        [commonTabGroups],
    );

    const technicalTabGroups = useMemo(
        () => technicalFieldSets
            .map((fieldSet) => ({
                id: `technical_${fieldSet.id}`,
                label: fieldSet.name,
                fields: applyFieldOverrides(fieldSet.fields ?? []),
            }))
            .filter((group) => group.fields.length > 0),
        [applyFieldOverrides, technicalFieldSets],
    );

    const hasAnyConfig = !!commonConfig || technicalTabGroups.length > 0;

    const allFields = useMemo(
        () => [
            ...commonTabGroups.flatMap((g) => g.fields),
            ...technicalTabGroups.flatMap((g) => g.fields),
        ],
        [commonTabGroups, technicalTabGroups],
    );

    useEffect(() => {
        if (!node) {
            setFormData({});
            setErrors({});
            setIsNew(false);
            setTechnicalFieldSets([]);
            setTechnicalLoading(false);
            setTechnicalError('');
            return;
        }

        setFormData(nodeToFormData(node));
        setErrors({});
        setIsNew(false);
    }, [node]);

    useEffect(() => {
        if (!hasCategorySelector) {
            setTechnicalFieldSets([]);
            setTechnicalLoading(false);
            setTechnicalError('');
            return;
        }

        if (!selectedCategoryCode) {
            setTechnicalFieldSets([]);
            setTechnicalLoading(false);
            setTechnicalError('');
            return;
        }

        const fetchId = ++technicalFetchRef.current;
        setTechnicalLoading(true);
        setTechnicalError('');

        danhMucTrangBiApi.getFieldSetsByMaDanhMuc(selectedCategoryCode)
            .then((items) => {
                if (technicalFetchRef.current !== fetchId) return;
                setTechnicalFieldSets(items);
            })
            .catch((err) => {
                if (technicalFetchRef.current !== fetchId) return;
                console.error('[TrangBiFormPanel] getFieldSetsByMaDanhMuc error', err);
                setTechnicalFieldSets([]);
                setTechnicalError((err as Error)?.message || 'Khong tai duoc thong so ky thuat');
            })
            .finally(() => {
                if (technicalFetchRef.current === fetchId) {
                    setTechnicalLoading(false);
                }
            });
    }, [hasCategorySelector, selectedCategoryCode]);

    const handleNew = () => {
        if (!canCnAction('add', cn)) return;
        const parentId = node?.id ?? cn;
        setFormData({ idCapTren: parentId });
        setErrors({});
        setIsNew(true);
        setTechnicalFieldSets([]);
        setTechnicalLoading(false);
        setTechnicalError('');
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
                    Chua co cau hinh tham so cho chuyen nganh <strong>{cnLabel}</strong> ({cn}).
                </Alert>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<BuildIcon />}
                        onClick={() => setConfigDialogOpen(true)}
                        disabled={!canAddInCn}
                    >
                        Tao cau hinh nhanh
                    </Button>
                </Stack>
                <TrangBiFormConfigDialog
                    open={configDialogOpen}
                    onClose={() => setConfigDialogOpen(false)}
                    cn={cn}
                    cnLabel={cnLabel}
                    cnOptions={cnOptions}
                    onCreated={() => setSnack({ open: true, message: 'Da tao cau hinh thanh cong!', severity: 'success' })}
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

            <Box sx={{ flex: 1, overflow: 'hidden auto', p: 2 }}>
                {commonTabGroups.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <SettingsIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2" fontWeight={700} color="primary">
                                Thong so chung
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

                {(hasCategorySelector || selectedCategoryCode || technicalLoading || technicalError || technicalTabGroups.length > 0) && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <BuildIcon fontSize="small" color="secondary" />
                            <Typography variant="subtitle2" fontWeight={700} color="secondary">
                                Thong so ky thuat
                            </Typography>
                            {selectedCategoryCode && (
                                <Chip
                                    label={selectedCategoryCode}
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                />
                            )}
                        </Stack>

                        {!selectedCategoryCode && hasCategorySelector && (
                            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                                Chon ma danh muc trang bi trong phan <strong>Thong so chung</strong> de tai thong so ky thuat tu API.
                            </Alert>
                        )}

                        {technicalError && (
                            <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
                                {technicalError}
                            </Alert>
                        )}

                        {technicalLoading ? (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                                <CircularProgress size={18} />
                                <Typography variant="body2" color="text.secondary">
                                    Dang tai thong so ky thuat...
                                </Typography>
                            </Stack>
                        ) : (
                            <DynamicDataForm
                                fields={technicalTabGroups.flatMap((g) => g.fields)}
                                tabGroups={technicalTabGroups.length > 1 ? technicalTabGroups : undefined}
                                data={formData}
                                errors={errors}
                                onChange={handleChange}
                            />
                        )}
                    </Paper>
                )}

                {commonTabGroups.length === 0 && technicalTabGroups.length === 0 && (
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
