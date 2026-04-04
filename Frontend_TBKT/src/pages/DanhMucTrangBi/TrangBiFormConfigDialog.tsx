import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import type { AppDispatch, RootState } from '../../store';
import type { LocalFormConfig, LocalFormTabConfig } from '../../apis/thamSoApi';
import { saveFormConfig } from '../../store/reducer/thamSo';
import type { TrangBiSpecializationOption } from '../../apis/catalogApi';

type Mode = 'new' | 'clone';

interface TrangBiFormConfigDialogProps {
    open: boolean;
    onClose: () => void;
    cn: string;
    cnLabel: string;
    cnOptions: TrangBiSpecializationOption[];
    onCreated: () => void;
}

const TrangBiFormConfigDialog: React.FC<TrangBiFormConfigDialogProps> = ({
    open,
    onClose,
    cn,
    cnLabel,
    cnOptions,
    onCreated,
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const { fieldSets, formConfigs } = useSelector((s: RootState) => s.thamSoReducer);

    const [mode, setMode] = useState<Mode>('new');
    const [name, setName] = useState(`Trang bị - ${cnLabel}`);
    const [desc, setDesc] = useState('');
    const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
    const [cloneSourceCn, setCloneSourceCn] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const targetKey = `trangbi-${cn.toLowerCase()}`;

    // FormConfigs that are already linked to a trangbi CN
    const existingTrangBiConfigs = useMemo(
        () => formConfigs.filter((fc) => fc.key.startsWith('trangbi-') && fc.key !== targetKey),
        [formConfigs, targetKey],
    );

    // CN options that already have a FormConfig (for clone source dropdown)
    const cloneableCnOptions = useMemo(() => {
        const existingKeys = new Set(existingTrangBiConfigs.map((fc) => fc.key));
        return cnOptions.filter((opt) => existingKeys.has(`trangbi-${opt.id.toLowerCase()}`));
    }, [cnOptions, existingTrangBiConfigs]);

    const cloneSource = useMemo(
        () => formConfigs.find((fc) => fc.key === `trangbi-${cloneSourceCn.toLowerCase()}`),
        [formConfigs, cloneSourceCn],
    );

    const toggleFieldSet = useCallback((setId: string) => {
        setSelectedSetIds((prev) =>
            prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId],
        );
    }, []);

    const handleSave = async () => {
        setError('');
        setSaving(true);
        try {
            let tabs: LocalFormTabConfig[];
            if (mode === 'clone' && cloneSource) {
                // Deep clone tabs from source, assign new IDs
                tabs = cloneSource.tabs.map((tab) => ({
                    id: `tab_${Math.random().toString(36).slice(2, 9)}`,
                    label: tab.label,
                    setIds: [...tab.setIds],
                }));
            } else {
                // Create one tab with selected field sets
                tabs = selectedSetIds.length > 0
                    ? [{ id: `tab_${Math.random().toString(36).slice(2, 9)}`, label: 'Thông tin chung', setIds: selectedSetIds }]
                    : [{ id: `tab_${Math.random().toString(36).slice(2, 9)}`, label: 'Tab 1', setIds: [] }];
            }

            const newFormConfig: LocalFormConfig = {
                id: `form_${Math.random().toString(36).slice(2, 9)}`,
                key: targetKey,
                name: name.trim() || `Trang bị - ${cnLabel}`,
                desc: desc.trim(),
                tabs,
            };

            await dispatch(saveFormConfig({ formConfig: newFormConfig, isNew: true })).unwrap();
            onCreated();
            onClose();
        } catch (err) {
            setError((err as Error).message || 'Không thể tạo cấu hình');
        } finally {
            setSaving(false);
        }
    };

    const handleModeChange = (_: React.MouseEvent, v: Mode | null) => {
        if (v) setMode(v);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Tạo cấu hình tham số cho <strong>{cnLabel}</strong> ({cn})
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ pt: 0.5 }}>
                    {/* Mode toggle */}
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={handleModeChange}
                        size="small"
                        fullWidth
                    >
                        <ToggleButton value="new">
                            <AddIcon sx={{ mr: 0.5, fontSize: 18 }} /> Tạo mới
                        </ToggleButton>
                        <ToggleButton value="clone" disabled={cloneableCnOptions.length === 0}>
                            <ContentCopyIcon sx={{ mr: 0.5, fontSize: 18 }} /> Sao chép từ CN khác
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Name & desc */}
                    <TextField
                        label="Tên cấu hình"
                        size="small"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <TextField
                        label="Key (tự động)"
                        size="small"
                        fullWidth
                        value={targetKey}
                        slotProps={{ input: { readOnly: true } }}
                        helperText="Key được tạo tự động theo chuyên ngành"
                    />
                    <TextField
                        label="Mô tả"
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />

                    <Divider />

                    {/* Mode-specific content */}
                    {mode === 'new' && (
                        <>
                            <Typography variant="subtitle2">
                                Chọn bộ dữ liệu (FieldSets) cho tab mặc định
                            </Typography>
                            {fieldSets.length === 0 ? (
                                <Alert severity="info">
                                    Chưa có bộ dữ liệu nào. Hãy tạo trong trang Cấu hình tham số trước.
                                </Alert>
                            ) : (
                                <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
                                    {fieldSets.map((fs) => (
                                        <ListItem key={fs.id} disablePadding>
                                            <ListItemButton onClick={() => toggleFieldSet(fs.id)} dense>
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <Checkbox
                                                        edge="start"
                                                        checked={selectedSetIds.includes(fs.id)}
                                                        tabIndex={-1}
                                                        disableRipple
                                                        size="small"
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={fs.name}
                                                    secondary={`${Math.max(fs.fields?.length ?? 0, fs.fieldIds?.length ?? 0)} trường`}
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </>
                    )}

                    {mode === 'clone' && (
                        <>
                            <TextField
                                select
                                label="Sao chép từ chuyên ngành"
                                size="small"
                                fullWidth
                                value={cloneSourceCn}
                                onChange={(e) => setCloneSourceCn(e.target.value)}
                            >
                                {cloneableCnOptions.map((opt) => (
                                    <MenuItem key={opt.id} value={opt.id}>
                                        {opt.id} — {opt.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            {cloneSource && (
                                <Alert severity="info" icon={false}>
                                    <Typography variant="body2" fontWeight={600}>{cloneSource.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {cloneSource.tabs.length} tab · {cloneSource.tabs.reduce(
                                            (a, t) => a + t.setIds.filter((id) => !id.startsWith('__meta:')).length,
                                            0,
                                        )} bộ dữ liệu
                                    </Typography>
                                </Alert>
                            )}
                        </>
                    )}

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Hủy</Button>
                <Button
                    variant="contained"
                    onClick={() => void handleSave()}
                    disabled={saving || (mode === 'clone' && !cloneSource)}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    Tạo cấu hình
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TrangBiFormConfigDialog;
