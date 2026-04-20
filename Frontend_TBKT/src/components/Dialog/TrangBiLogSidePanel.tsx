// ============================================================
// TrangBiLogSidePanel — Panel mở rộng bên phải form nhật ký
// (bao_quan, bao_duong, sua_chua, niem_cat, dieu_dong).
// Rendered như Box trong flex layout, không phải Drawer viewport.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { getTrangBiLog, saveTrangBiLog, getFieldSetsByLogType, type LocalTrangBiLog } from '../../apis/trangBiLogApi';
import { LogType, LOG_TYPE_LABELS } from '../../types/trangBiLog';
import { FieldSetGroup } from '../TrangBiDataGrid/GeneralInfoTab';
import type { LocalDynamicField, LocalFieldSet as FieldSet } from '../../types/thamSo';
import type { LocalFieldSetDetail } from '../../apis/trangBiLogApi';

export interface TrangBiLogSidePanelProps {
    open: boolean;
    onClose: () => void;
    logType: LogType;
    trangBiId: string;
    trangBiName?: string;
    editingLogId?: string | null;
    onSaved?: () => void;
    width?: number | string;
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

const TrangBiLogSidePanel: React.FC<TrangBiLogSidePanelProps> = ({
    open,
    onClose,
    logType,
    trangBiId,
    trangBiName,
    editingLogId,
    onSaved,
    width = 480,
}) => {
    const isEditMode = Boolean(editingLogId);
    const accentColor = LOG_TYPE_COLORS[logType] ?? '#3b82f6';
    const logLabel = LOG_TYPE_LABELS[logType] ?? 'Nhật ký';
    const panelTitle = isEditMode ? `Chỉnh sửa ${logLabel.toLowerCase()}` : `Thêm ${logLabel.toLowerCase()}`;

    const [fieldSets, setFieldSets] = useState<LocalFieldSetDetail[]>([]);
    const [fieldSetsLoading, setFieldSetsLoading] = useState(false);
    const [fieldSetsError, setFieldSetsError] = useState('');

    const [existingLog, setExistingLog] = useState<LocalTrangBiLog | null>(null);
    const [logLoading, setLogLoading] = useState(false);
    const [logError, setLogError] = useState('');

    const [formData, setFormData] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Backend currently keeps the legacy request name, but service maps it to runtime FieldSet.Key.
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

    // ── Load field sets & existing log when panel opens ────────
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
        setLogLoading(true);

        getFieldSetsByLogType(apiLoaiNv)
            .then((data) => {
                if (cancelled) return;
                setFieldSets(data);
            })
            .catch((err) => {
                if (cancelled) return;
                setFieldSetsError((err as Error)?.message || 'Không tải được biểu mẫu nghiệp vụ.');
            })
            .finally(() => {
                if (!cancelled) setFieldSetsLoading(false);
            });

        if (isEditMode && editingLogId) {
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
        } else {
            setLogLoading(false);
        }

        return () => { cancelled = true; };
    }, [open, apiLoaiNv, isEditMode, editingLogId]);

    const handleFieldChange = useCallback((fieldKey: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
    }, []);

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

    const isLoading = fieldSetsLoading || logLoading;

    return (
        <Box
            sx={{
                width,
                flexShrink: 0,
                borderLeft: `3px solid ${accentColor}`,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                overflow: 'hidden',
            }}
        >
            {/* ── Header ─────────────────────────────────────────── */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={800} color="#fff" sx={{ lineHeight: 1.2 }}>
                        {panelTitle}
                    </Typography>
                    {trangBiName && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>
                            {trangBiName}
                        </Typography>
                    )}
                </Box>
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{
                        color: '#fff',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* ── Error alerts ────────────────────────────────────── */}
            {(fieldSetsError || logError || saveError) && (
                <Box sx={{ px: 2, pt: 1.5, pb: 0.5, flexShrink: 0 }}>
                    {fieldSetsError && <Alert severity="warning">{fieldSetsError}</Alert>}
                    {logError && <Alert severity="error" onClose={() => setLogError('')}>{logError}</Alert>}
                    {saveError && <Alert severity="error" onClose={() => setSaveError('')}>{saveError}</Alert>}
                </Box>
            )}

            {/* ── Loading skeleton ───────────────────────────────── */}
            {isLoading && (
                <Box sx={{ px: 2, pt: 1, pb: 2, flex: 1, overflowY: 'auto' }}>
                    <Stack spacing={1.5}>
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} variant="rectangular" height={i === 1 ? 72 : 52} sx={{ borderRadius: 2 }} />
                        ))}
                    </Stack>
                </Box>
            )}

            {/* ── Field sets ─────────────────────────────────────── */}
            {!isLoading && fieldSets.length === 0 && !fieldSetsError && (
                <Box sx={{ px: 2, pt: 1, pb: 2, flex: 1, overflowY: 'auto' }}>
                    <Alert severity="info">
                        Chưa có biểu mẫu cấu hình cho nghiệp vụ {logLabel.toLowerCase()}.
                        Vui lòng cấu hình bộ dữ liệu trong phần "Cấu hình tham số".
                    </Alert>
                </Box>
            )}

            {!isLoading && fieldSets.length > 0 && (
                <Box sx={{ px: 2, pt: 1, pb: 2, flex: 1, overflowY: 'auto' }}>
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
                                    <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                            <Box
                                                sx={{
                                                    width: 3, height: 12, borderRadius: '2px',
                                                    bgcolor: fsMeta.color || DEFAULT_SET_COLORS[idx % DEFAULT_SET_COLORS.length],
                                                }}
                                            />
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                {fsMeta.name}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                )}
                                <Box sx={{ px: 1.5, py: 1 }}>
                                    {hydratedFields.length === 0 ? (
                                        <Typography variant="body2" color="text.disabled" sx={{ py: 0.5 }}>
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

            {/* ── Footer actions ─────────────────────────────────── */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    bgcolor: 'background.default',
                }}
            >
                <Stack direction="row" spacing={1.5}>
                    <Box
                        component="button"
                        onClick={onClose}
                        disabled={saving}
                        sx={{
                            flex: 1, px: 2, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
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
                            flex: 2, px: 2, py: 1, borderRadius: 2, border: 'none', bgcolor: accentColor, color: '#fff',
                            cursor: 'pointer', fontWeight: 800, fontSize: '0.875rem', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                            boxShadow: `0 4px 12px ${accentColor}40`,
                            '&:hover': { filter: 'brightness(0.9)' },
                            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                        }}
                    >
                        {saving && <CircularProgress size={16} sx={{ color: 'inherit' }} />}
                        {saving ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Lưu nhật ký'}
                    </Box>
                </Stack>
            </Box>
        </Box>
    );
};

export default TrangBiLogSidePanel;
