import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Stack,
    Select,
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
import { parseTabMeta, getRealSetIds, withTabMeta, type TabMeta } from './formTabMeta';

interface TabSetPickerDialogProps {
    open: boolean;
    tab: FormTabConfig;
    allTabs: FormTabConfig[];
    fieldSets: FieldSet[];
    fields: DynamicField[];
    onSave: (next: FormTabConfig) => void;
    onClose: () => void;
}

const TabSetPickerDialog: React.FC<TabSetPickerDialogProps> = ({ open, tab, allTabs, fieldSets, fields, onSave, onClose }) => {
    const [draft, setDraft] = useState<FormTabConfig>(tab);
    const [meta, setMeta] = useState<TabMeta>(parseTabMeta(tab));

    useEffect(() => {
        setDraft(tab);
        setMeta(parseTabMeta(tab));
    }, [tab]);

    const isSyncGroup = meta.tabType === 'sync-group';
    const isSyncLeaf = meta.tabType === 'sync-leaf';

    const parentCandidates = allTabs.filter((candidate) => {
        if (candidate.id === draft.id) {
            return false;
        }
        const candidateMeta = parseTabMeta(candidate);
        return candidateMeta.tabType === 'sync-group';
    });

    const toggle = (setId: string) =>
        setDraft((prev: FormTabConfig) => ({
            ...prev,
            setIds: prev.setIds.includes(setId)
                ? prev.setIds.filter((id: string) => id !== setId)
                : [...getRealSetIds(prev), setId],
        }));

    const selectedSets = getRealSetIds(draft)
        .map((id) => fieldSets.find((s) => s.id === id))
        .filter(Boolean) as FieldSet[];

    const selectedRealSetCount = selectedSets.length;

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
            onConfirm={() => onSave(withTabMeta(draft, meta, getRealSetIds(draft)))}
            confirmText="Cập nhật cấu hình"
            disabled={(!isSyncGroup && selectedRealSetCount === 0) || !draft.label || (isSyncLeaf && !meta.parentTabId)}
        >
            <Box sx={{ mb: 3 }}>
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

            <Card variant="outlined" sx={{ mb: 3, borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: 'text.secondary' }}>
                        CẤU HÌNH TAB CHA/CON VÀ HIỂN THỊ
                    </Typography>
                    <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Loại tab</InputLabel>
                                <Select
                                    label="Loại tab"
                                    value={meta.tabType}
                                    onChange={(e) => {
                                        const nextType = e.target.value as TabMeta['tabType'];
                                        setMeta((prev) => ({
                                            ...prev,
                                            tabType: nextType,
                                            parentTabId: nextType === 'sync-leaf' ? prev.parentTabId : undefined,
                                            syncSourceType: nextType !== 'normal' ? (prev.syncSourceType ?? 'root_equipment') : undefined,
                                            syncCategory: nextType === 'sync-leaf' ? (prev.syncCategory ?? '') : undefined,
                                        }));
                                    }}
                                >
                                    <MenuItem value="normal">Tab thường</MenuItem>
                                    <MenuItem value="sync-group">Tab nhóm đồng bộ</MenuItem>
                                    <MenuItem value="sync-leaf">Tab con đồng bộ</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {isSyncLeaf && (
                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Tab cha</InputLabel>
                                    <Select
                                        label="Tab cha"
                                        value={meta.parentTabId ?? ''}
                                        onChange={(e) => setMeta((prev) => ({ ...prev, parentTabId: e.target.value || undefined }))}
                                    >
                                        <MenuItem value="">Chọn tab cha...</MenuItem>
                                        {parentCandidates.map((tabItem) => (
                                            <MenuItem key={tabItem.id} value={tabItem.id}>{tabItem.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {(isSyncGroup || isSyncLeaf) && (
                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Nguồn đồng bộ</InputLabel>
                                    <Select
                                        label="Nguồn đồng bộ"
                                        value={meta.syncSourceType ?? 'root_equipment'}
                                        onChange={(e) => setMeta((prev) => ({ ...prev, syncSourceType: e.target.value as TabMeta['syncSourceType'] }))}
                                    >
                                        <MenuItem value="root_equipment">Danh mục đồng bộ gốc</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {isSyncLeaf && (
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Mã chuyên ngành (category)"
                                    value={meta.syncCategory ?? ''}
                                    onChange={(e) => setMeta((prev) => ({ ...prev, syncCategory: e.target.value }))}
                                    placeholder="Ví dụ: RADAR, TAU_THUYEN"
                                />
                            </Grid>
                        )}

                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Kiểu hiển thị</InputLabel>
                                <Select
                                    label="Kiểu hiển thị"
                                    value={meta.displayMode ?? 'grid'}
                                    onChange={(e) => setMeta((prev) => ({ ...prev, displayMode: e.target.value as TabMeta['displayMode'] }))}
                                >
                                    <MenuItem value="grid">Grid</MenuItem>
                                    <MenuItem value="table">Table</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Số cột hiển thị</InputLabel>
                                <Select
                                    label="Số cột hiển thị"
                                    value={meta.displayColumns ?? 2}
                                    onChange={(e) => setMeta((prev) => ({ ...prev, displayColumns: Number(e.target.value) as 1 | 2 | 3 | 4 }))}
                                >
                                    <MenuItem value={1}>1 cột</MenuItem>
                                    <MenuItem value={2}>2 cột</MenuItem>
                                    <MenuItem value={3}>3 cột</MenuItem>
                                    <MenuItem value={4}>4 cột</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <Stack spacing={0} sx={{ pt: 0.25 }}>
                                <FormControlLabel
                                    control={<Checkbox checked={meta.showSetBadges !== false} onChange={(e) => setMeta((prev) => ({ ...prev, showSetBadges: e.target.checked }))} />}
                                    label="Hiện badge bộ dữ liệu"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={meta.showFieldCount !== false} onChange={(e) => setMeta((prev) => ({ ...prev, showFieldCount: e.target.checked }))} />}
                                    label="Hiện tổng số trường"
                                />
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary"> BỘ DỮ LIỆU CÓ SẴN</Typography>
                        <Chip size="small" label={fieldSets.length} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.default', height: 360, overflowY: 'auto' }}>
                        <Stack spacing={1.5}>
                            {fieldSets.map((set) => {
                                const selected = draft.setIds.includes(set.id);
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
                                            '&:hover': { borderColor: selected ? set.color : 'primary.main', bgcolor: selected ? `${set.color}10` : 'action.hover' }
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Checkbox checked={selected} size="small" sx={{ color: set.color, '&.Mui-checked': { color: set.color }, p: 0 }} />
                                            <Box sx={{ color: set.color, bgcolor: selected ? 'background.paper' : `${set.color}11`, p: 1, borderRadius: 2.5, boxShadow: selected ? 1 : 0 }}>{set.icon}</Box>
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
