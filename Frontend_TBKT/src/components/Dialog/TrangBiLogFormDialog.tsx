// ============================================================
// TrangBiLogFormDialog — Shared Add/Edit dialog for TrangBiLog
// entries (bao_quan, bao_duong, sua_chua, niem_cat, dieu_dong).
// FieldSets are loaded from ThamSoService and
// filtered by runtime FieldSet.Key mapped from logType.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';

import { FormDialog } from '../Dialog';
import {
    getTrangBiLog,
    saveTrangBiLog,
    getFieldSetsByLogType,
    type LocalTrangBiLog,
    type LocalFieldSetDetail,
} from '../../apis/trangBiLogApi';
import type { LocalDynamicField, LocalFieldSet as FieldSet } from '../../types/thamSo';
import { LogType, LOG_TYPE_LABELS } from '../../types/trangBiLog';
import { FieldSetGroup } from '../TrangBiDataGrid/GeneralInfoTab';

export interface TrangBiLogFormDialogProps {
    open: boolean;
    onClose: () => void;
    logType: LogType;
    trangBiId: string;
    trangBiName?: string;
    editingLogId?: string | null;
    onSaved?: () => void;
}

const LOG_TYPE_COLORS: Record<number, string> = {
    [LogType.BaoQuan]: '#22c55e',
    [LogType.BaoDuong]: '#3b82f6',
    [LogType.SuaChua]: '#f59e0b',
    [LogType.NiemCat]: '#8b5cf6',
    [LogType.DieuDong]: '#06b6d4',
    [LogType.Unspecified]: '#64748b',
};

const DEFAULT_SET_COLORS = [
    '#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6',
];

const TrangBiLogFormDialog: React.FC<TrangBiLogFormDialogProps> = ({
    open,
    onClose,
    logType,
    trangBiId,
    trangBiName,
    editingLogId,
    onSaved,
}) => {
    const isEditMode = Boolean(editingLogId);
    const dialogMode = isEditMode ? 'edit' : 'add';
    const accentColor = LOG_TYPE_COLORS[logType] ?? '#3b82f6';
    const logLabel = LOG_TYPE_LABELS[logType] ?? 'Nhật ký';

    const dialogTitle = isEditMode
        ? `Chỉnh sửa ${logLabel.toLowerCase()}`
        : `Thêm ${logLabel.toLowerCase()}`;
    const dialogIcon = isEditMode ? <EditIcon /> : <SaveIcon />;

    // Field sets filtered by runtime key (from server)
    const [fieldSets, setFieldSets] = useState<LocalFieldSetDetail[]>([]);
    const [fieldSetsLoading, setFieldSetsLoading] = useState(false);
    const [fieldSetsError, setFieldSetsError] = useState('');

    // Existing log record (for edit mode)
    const [existingLog, setExistingLog] = useState<LocalTrangBiLog | null>(null);
    const [logLoading, setLogLoading] = useState(false);
    const [logError, setLogError] = useState('');

    // Form state — key = field.key, value = field value
    const [formData, setFormData] = useState<Record<string, string>>({});

    // Save state
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // ── Derive the backend log filter from logType ───────────────
    const apiLoaiNv = (() => {
        switch (logType) {
            case LogType.BaoQuan: return 'bao_quan';
            case LogType.BaoDuong: return 'bao_duong';
            case LogType.SuaChua: return 'sua_chua';
            case LogType.NiemCat: return 'niem_cat';
            case LogType.DieuDong: return 'dieu_dong';
            default: return '';
        }
    })();

    // ── Load field sets when dialog opens ──────────────────────
    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        setFieldSets([]);
        setFieldSetsError('');
        setFormData({});
        setExistingLog(null);
        setLogError('');
        setSaveError('');

        setFieldSetsLoading(true);

        getFieldSetsByLogType(apiLoaiNv)
            .then((data) => {
                if (cancelled) return;
                setFieldSets(data);
                console.log(`[TrangBiLogFormDialog] Loaded ${data.length} field sets for "${apiLoaiNv}":`, data.map(fs => ({ id: fs.fieldSet.id, name: fs.fieldSet.name, fields: fs.fields.length })));
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('[TrangBiLogFormDialog] Load error:', err);
                setFieldSetsError((err as Error)?.message || 'Không tải được biểu mẫu nghiệp vụ.');
            })
            .finally(() => {
                if (!cancelled) setFieldSetsLoading(false);
            });

        return () => { cancelled = true; };
    }, [open, apiLoaiNv]);

    // ── Load existing log when editing ─────────────────────────
    useEffect(() => {
        if (!open || !isEditMode || !editingLogId) return;
        let cancelled = false;

        setLogLoading(true);
        setLogError('');

        getTrangBiLog(editingLogId)
            .then((log) => {
                if (cancelled) return;
                setExistingLog(log);
                setFormData(prev => ({ ...prev, ...(log.parameters ?? {}) }));
            })
            .catch((err) => {
                if (cancelled) return;
                setLogError((err as Error)?.message || 'Không tải được chi tiết nhật ký.');
            })
            .finally(() => {
                if (!cancelled) setLogLoading(false);
            });

        return () => { cancelled = true; };
    }, [open, isEditMode, editingLogId]);

    // ── Field change handler ────────────────────────────────────
    const handleFieldChange = useCallback((fieldKey: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
    }, []);

    // ── Save handler ────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaveError('');

        try {
            const payload: Partial<LocalTrangBiLog> = {
                id: editingLogId ?? undefined,
                logType,
                idTrangBi: trangBiId,
                parameters: formData,
            };

            await saveTrangBiLog(payload);
            onSaved?.();
            onClose();
        } catch (err) {
            setSaveError((err as Error)?.message || 'Lưu nhật ký thất bại.');
        } finally {
            setSaving(false);
        }
    }, [editingLogId, logType, trangBiId, formData, onSaved, onClose]);

    const subtitle = trangBiName ? `Trang bị: ${trangBiName}` : undefined;
    const isLoading = fieldSetsLoading || logLoading;

    return (
        <FormDialog
            open={open}
            onClose={onClose}
            mode={dialogMode}
            maxWidth="md"
            title={dialogTitle}
            subtitle={subtitle}
            icon={dialogIcon}
            color={accentColor}
            confirmText={isEditMode ? 'Cập nhật' : 'Lưu nhật ký'}
            loading={saving}
            disabled={isLoading}
            showConfirm={false}
            showCancel={false}
            customActions={
                <Stack direction="row" spacing={1.5} sx={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Box
                        component="button"
                        onClick={onClose}
                        disabled={saving}
                        sx={{
                            px: 3, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                            bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit',
                            '&:hover': { bgcolor: 'action.hover' },
                            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                        }}
                    >
                        Hủy
                    </Box>
                    <Box
                        component="button"
                        onClick={handleSave}
                        disabled={saving || isLoading}
                        sx={{
                            px: 4, py: 1, borderRadius: 2, border: 'none', bgcolor: accentColor, color: '#fff',
                            cursor: 'pointer', fontWeight: 800, fontSize: '0.875rem', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: 1,
                            boxShadow: `0 4px 12px ${accentColor}40`,
                            '&:hover': { filter: 'brightness(0.9)' },
                            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                        }}
                    >
                        {saving && <CircularProgress size={16} sx={{ color: 'inherit' }} />}
                        {saving ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Lưu nhật ký'}
                    </Box>
                </Stack>
            }
        >
            {/* Error alerts */}
            {(fieldSetsError || logError || saveError) && (
                <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'grid', gap: 1 }}>
                    {fieldSetsError && <Alert severity="warning">{fieldSetsError}</Alert>}
                    {logError && <Alert severity="error" onClose={() => setLogError('')}>{logError}</Alert>}
                    {saveError && <Alert severity="error" onClose={() => setSaveError('')}>{saveError}</Alert>}
                </Box>
            )}

            {/* Loading skeleton */}
            {isLoading && (
                <Box sx={{ px: 2.5, pt: 1, pb: 2 }}>
                    <Stack spacing={1.5}>
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} variant="rectangular" height={i === 1 ? 72 : 52} sx={{ borderRadius: 2 }} />
                        ))}
                    </Stack>
                </Box>
            )}

            {!isLoading && fieldSets.length === 0 && !fieldSetsError && (
                <Box sx={{ px: 2.5, pt: 1, pb: 2 }}>
                    <Alert severity="info">
                        Chưa có biểu mẫu cấu hình cho nghiệp vụ {logLabel.toLowerCase()}.
                        Vui lòng cấu hình bộ dữ liệu trong phần "Cấu hình tham số".
                    </Alert>
                </Box>
            )}

            {!isLoading && fieldSets.length > 0 && (
                <Box sx={{ px: 2.5, pt: 1, pb: 2, maxHeight: '65vh', overflowY: 'auto' }}>
                    {fieldSets.map((fs, idx) => {
                        const hydratedFields: LocalDynamicField[] = (fs.fields ?? []).map((field) => ({
                            ...field,
                            validation: field.validation ?? {},
                        }));
                        const fsMeta = fs.fieldSet;

                        return (
                            <Box
                                key={fsMeta.id ?? `fs-${idx}`}
                                sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
                            >
                                {fsMeta.name && (
                                    <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Box
                                                sx={{
                                                    width: 3, height: 14, borderRadius: '2px',
                                                    bgcolor: fsMeta.color || DEFAULT_SET_COLORS[idx % DEFAULT_SET_COLORS.length],
                                                }}
                                            />
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                {fsMeta.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                ({hydratedFields.length} trường)
                                            </Typography>
                                        </Stack>
                                    </Box>
                                )}
                                <Box sx={{ px: 2, py: 1.5 }}>
                                    {hydratedFields.length === 0 ? (
                                        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
                                            Chưa có trường dữ liệu cho bộ này.
                                        </Typography>
                                    ) : (
                                        <FieldSetGroup
                                            fieldSet={fsMeta}
                                            fields={hydratedFields}
                                            formData={formData}
                                            onFieldChange={handleFieldChange}
                                            color={fsMeta.color || DEFAULT_SET_COLORS[idx % DEFAULT_SET_COLORS.length]}
                                            showSectionHeader={false}
                                        />
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </FormDialog>
    );
};

export default TrangBiLogFormDialog;
