import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Checkbox,
    Chip,
    Grid,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import CommonDialog from '../../../components/Dialog/CommonDialog';
import {
    LocalDynamicField as DynamicField,
    LocalFormTabConfig as FormTabConfig,
} from '../../../types/thamSo';
import { FieldSet } from '../types';
import { getRealSetIds } from './formTabMeta';

interface TabSetPickerDialogProps {
    open: boolean;
    tab: FormTabConfig;
    allTabs: FormTabConfig[];
    fieldSets: FieldSet[];
    fields: DynamicField[];
    onSave: (next: FormTabConfig) => void;
    onClose: () => void;
}

const TabSetPickerDialog: React.FC<TabSetPickerDialogProps> = ({ open, tab, fieldSets, onSave, onClose }) => {
    const [draft, setDraft] = useState<FormTabConfig>(tab);

    useEffect(() => {
        setDraft(tab);
    }, [tab]);

    const validFieldSetIds = useMemo(() => new Set(fieldSets.map((set) => set.id)), [fieldSets]);
    const selectedSetIds = useMemo(() => getRealSetIds(draft), [draft]);
    const selectedSets = useMemo(
        () => selectedSetIds
            .map((id) => fieldSets.find((set) => set.id === id))
            .filter(Boolean) as FieldSet[],
        [fieldSets, selectedSetIds],
    );
    const fieldCount = useMemo(
        () => selectedSets.reduce((acc, set) => acc + Math.max(set.fields?.length ?? 0, set.fieldIds?.length ?? 0), 0),
        [selectedSets],
    );
    const orphanSetIds = useMemo(() => selectedSetIds.filter((id) => !validFieldSetIds.has(id)), [selectedSetIds, validFieldSetIds]);

    const toggle = (setId: string) => {
        setDraft((prev) => {
            const current = getRealSetIds(prev);
            const has = current.includes(setId);
            return {
                ...prev,
                setIds: has ? current.filter((id) => id !== setId) : [...current, setId],
            };
        });
    };

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            mode="custom"
            title="Sửa cấu hình Tab"
            subtitle={`Đang cấu hình: ${draft.label || 'Tab không tên'}`}
            icon={<ViewQuiltIcon />}
            color="#ec4899"
            maxWidth="md"
            onConfirm={() => {
                const sanitizedSetIds = getRealSetIds(draft).filter((id) => validFieldSetIds.has(id));
                onSave({ ...draft, setIds: sanitizedSetIds });
            }}
            confirmText="Cập nhật cấu hình"
            disabled={selectedSets.length === 0 || !draft.label.trim()}
        >
            {orphanSetIds.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="warning.main">
                        Phát hiện {orphanSetIds.length} field set cũ không còn tồn tại, hệ thống sẽ tự loại khi lưu.
                    </Typography>
                </Box>
            )}
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: 'text.secondary' }}>
                    TÊN HIỂN THỊ CỦA TAB
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Nhập tên tab ví dụ: Thông tin chung, Cấu hình kỹ thuật..."
                    value={draft.label}
                    onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                    InputProps={{ startAdornment: <DynamicFormIcon sx={{ mr: 1, color: 'action.active' }} fontSize="small" /> }}
                />
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">BỘ DỮ LIỆU CÓ SẴN</Typography>
                        <Chip size="small" label={fieldSets.length} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.default', height: 360, overflowY: 'auto' }}>
                        <Stack spacing={1.5}>
                            {fieldSets.map((set) => {
                                const selected = selectedSetIds.includes(set.id);
                                return (
                                    <Box
                                        key={set.id}
                                        onClick={() => toggle(set.id)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2.5,
                                            cursor: 'pointer',
                                            border: '2px solid',
                                            borderColor: selected ? set.color : 'divider',
                                            bgcolor: selected ? `${set.color}08` : 'background.paper',
                                            transition: 'all 0.2s',
                                            '&:hover': { borderColor: selected ? set.color : 'primary.main', bgcolor: selected ? `${set.color}10` : 'action.hover' },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Checkbox checked={selected} size="small" sx={{ color: set.color, '&.Mui-checked': { color: set.color }, p: 0 }} />
                                            <Box sx={{ color: set.color, bgcolor: selected ? 'background.paper' : `${set.color}11`, p: 1, borderRadius: 2.5 }}>{set.icon}</Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" fontWeight={800}>{set.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {Math.max(set.fields?.length ?? 0, set.fieldIds?.length ?? 0)} trường
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">ĐÃ CHỌN CHO TAB</Typography>
                        <Chip size="small" color="primary" label={selectedSets.length} sx={{ fontWeight: 700 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: 360, display: 'flex', flexDirection: 'column' }}>
                        {selectedSets.length > 0 ? (
                            <Box sx={{ overflowY: 'auto', flex: 1, pr: 1 }}>
                                <Stack spacing={1}>
                                    {selectedSets.map((set) => (
                                        <Box key={set.id} sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${set.color}22`, bgcolor: `${set.color}05` }}>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box sx={{ color: set.color, display: 'flex', alignItems: 'center' }}>{set.icon}</Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={800}>{set.name}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        ) : (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.disabled', gap: 2 }}>
                                <ViewQuiltIcon sx={{ fontSize: 48, opacity: 0.2 }} />
                                <Typography variant="body2" fontWeight={600}>Chưa chọn bộ dữ liệu nào cho tab này</Typography>
                            </Box>
                        )}
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" fontWeight={700} color="primary.main">
                                Tổng cộng: {fieldCount} trường dữ liệu sẽ hiển thị trong tab này.
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </CommonDialog>
    );
};

export default TabSetPickerDialog;

