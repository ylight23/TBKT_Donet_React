import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Divider,
    IconButton,
    Stack,
    TextField,
    Typography,
    Grid,
    Paper
} from '@mui/material';
import CommonDialog from '../../../components/Dialog/CommonDialog';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';

import {
    LocalDynamicField as DynamicField,
    LocalFormTabConfig as FormTabConfig
} from '../../../types/thamSo';
import { FieldSet } from '../types';

interface TabSetPickerDialogProps {
    open: boolean;
    tab: FormTabConfig;
    fieldSets: FieldSet[];
    fields: DynamicField[];
    onSave: (next: FormTabConfig) => void;
    onClose: () => void;
}

const TabSetPickerDialog: React.FC<TabSetPickerDialogProps> = ({ open, tab, fieldSets, fields, onSave, onClose }) => {
    const [draft, setDraft] = useState<FormTabConfig>(tab);

    useEffect(() => { setDraft(tab); }, [tab]);

    const toggle = (setId: string) =>
        setDraft((prev: FormTabConfig) => ({
            ...prev,
            setIds: prev.setIds.includes(setId)
                ? prev.setIds.filter((id: string) => id !== setId)
                : [...prev.setIds, setId],
        }));

    const selectedSets = draft.setIds
        .map((id) => fieldSets.find((s) => s.id === id))
        .filter(Boolean) as FieldSet[];

    const fieldCount = selectedSets.reduce((acc, s) => acc + s.fieldIds.length, 0);

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
            onConfirm={() => onSave(draft)}
            confirmText="Cập nhật cấu hình"
            disabled={draft.setIds.length === 0 || !draft.label}
        >
            <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: 'text.secondary' }}>TÊN HIỂN THỊ CỦA TAB</Typography>
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
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary"> BỘ DỮ LIỆU CÓ SẴN</Typography>
                        <Chip size="small" label={fieldSets.length} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default', height: 400, overflowY: 'auto' }}>
                        <Stack spacing={1.5}>
                            {fieldSets.map((set) => {
                                const selected = draft.setIds.includes(set.id);
                                return (
                                    <Box
                                        key={set.id}
                                        onClick={() => toggle(set.id)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            border: '2px solid',
                                            borderColor: selected ? set.color : 'divider',
                                            bgcolor: selected ? `${set.color}08` : 'background.paper',
                                            transition: 'all 0.2s',
                                            '&:hover': { borderColor: selected ? set.color : 'primary.main', bgcolor: selected ? `${set.color}10` : 'action.hover' }
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Checkbox checked={selected} size="small" sx={{ color: set.color, '&.Mui-checked': { color: set.color }, p: 0 }} />
                                            <Box sx={{ color: set.color, bgcolor: selected ? 'background.paper' : `${set.color}11`, p: 1, borderRadius: 1.5, boxShadow: selected ? 1 : 0 }}>{set.icon}</Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" fontWeight={800}>{set.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{set.fieldIds.length} trường</Typography>
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
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary"> ĐÃ CHỌN CHO TAB</Typography>
                        <Chip size="small" color="primary" label={selectedSets.length} sx={{ fontWeight: 700 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
                        {selectedSets.length > 0 ? (
                            <Box sx={{ overflowY: 'auto', flex: 1, pr: 1 }}>
                                <Stack spacing={1}>
                                    {selectedSets.map((set) => (
                                        <Box key={set.id} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${set.color}22`, bgcolor: `${set.color}05` }}>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box sx={{ color: set.color, display: 'flex', alignItems: 'center' }}>{set.icon}</Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={800}>{set.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                                        {set.fieldIds.map((fid) => fields.find((f) => f.id === fid)?.label).filter(Boolean).slice(0, 4).join(', ')}
                                                        {set.fieldIds.length > 4 ? ` và ${set.fieldIds.length - 4} trường khác...` : ''}
                                                    </Typography>
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
