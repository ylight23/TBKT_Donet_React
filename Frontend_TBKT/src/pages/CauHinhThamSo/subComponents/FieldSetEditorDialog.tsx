import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import CommonDialog from '../../../components/Dialog/CommonDialog';
import {
    Box,
    Button,
    Grid,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import {
    FIELD_SET_ICON_OPTIONS,
    iconToName,
    nameToIcon,
} from '../../../utils/thamSoUtils';
import { SET_COLORS, HEX_COLOR_REGEX, COLOR_COMMIT_DEBOUNCE_MS } from '../constants';
import { FieldSet } from '../types';
import IconPickerPopover from './IconPickerPopover';
import FieldSelectionPanel from './FieldSelectionPanel';

interface FieldSetEditorDialogProps {
    open: boolean;
    setData: FieldSet;
    allFields: DynamicField[];
    onSave: (set: FieldSet) => void;
    onClose: () => void;
}

const FieldSetEditorDialog: React.FC<FieldSetEditorDialogProps> = ({ open, setData, allFields, onSave, onClose }) => {
    const [name, setName] = useState(setData.name);
    const [desc, setDesc] = useState(setData.desc ?? '');
    const [color, setColor] = useState((setData.color || '#3b82f6').toLowerCase());
    const [pickerColor, setPickerColor] = useState((setData.color || '#3b82f6').toLowerCase());
    const [customColor, setCustomColor] = useState((setData.color || '#3b82f6').toLowerCase());
    const [iconPickerAnchorEl, setIconPickerAnchorEl] = useState<HTMLElement | null>(null);
    const [iconName, setIconName] = useState<string>(() => {
        const current = iconToName(setData.icon);
        if (FIELD_SET_ICON_OPTIONS.some((opt) => opt.name === current)) return current;
        return 'Assignment';
    });
    const [selectedIds, setSelectedIds] = useState<string[]>([...setData.fieldIds]);
    const [fieldSearch, setFieldSearch] = useState('');
    const colorCommitTimeoutRef = useRef<number | null>(null);

    const clearPendingColorCommit = useCallback(() => {
        if (colorCommitTimeoutRef.current !== null) {
            window.clearTimeout(colorCommitTimeoutRef.current);
            colorCommitTimeoutRef.current = null;
        }
    }, []);

    const scheduleCommittedColor = useCallback((nextColor: string) => {
        clearPendingColorCommit();
        colorCommitTimeoutRef.current = window.setTimeout(() => {
            setColor(nextColor);
            colorCommitTimeoutRef.current = null;
        }, COLOR_COMMIT_DEBOUNCE_MS);
    }, [clearPendingColorCommit]);

    useEffect(() => {
        clearPendingColorCommit();
        setName(setData.name);
        setDesc(setData.desc ?? '');
        const nextColor = (setData.color || '#3b82f6').toLowerCase();
        setColor(nextColor);
        setPickerColor(nextColor);
        setCustomColor(nextColor);
        setIconPickerAnchorEl(null);
        setSelectedIds([...setData.fieldIds]);
        setFieldSearch('');

        const current = iconToName(setData.icon);
        if (FIELD_SET_ICON_OPTIONS.some((opt) => opt.name === current)) {
            setIconName(current);
        } else {
            setIconName('Assignment');
        }
    }, [clearPendingColorCommit, setData]);

    useEffect(() => () => {
        clearPendingColorCommit();
    }, [clearPendingColorCommit]);

    const isCustomColorValid = HEX_COLOR_REGEX.test(customColor.trim());

    const filteredAllFields = useMemo(
        () => allFields.filter(
            (f) =>
                f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                f.key.toLowerCase().includes(fieldSearch.toLowerCase()),
        ),
        [allFields, fieldSearch],
    );

    const toggle = useCallback((fieldId: string) => {
        setSelectedIds((prev) =>
            prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId],
        );
    }, []);

    const handleFieldSearchChange = useCallback((value: string) => {
        setFieldSearch(value);
    }, []);

    const openIconPicker = useCallback((anchor: HTMLElement) => {
        setIconPickerAnchorEl(anchor);
    }, []);

    const closeIconPicker = useCallback(() => {
        setIconPickerAnchorEl(null);
    }, []);

    const handleSelectIcon = useCallback((nextName: string) => {
        setIconName(nextName);
        setIconPickerAnchorEl(null);
    }, []);

    const handleSelectAllFields = useCallback(() => {
        setSelectedIds(allFields.map((field) => field.id));
    }, [allFields]);

    const handleClearAllFields = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const handleSave = () => {
        const iconNode = FIELD_SET_ICON_OPTIONS.find((o) => o.name === iconName)?.node ?? nameToIcon('Assignment');
        const normalizedCustomColor = customColor.trim().toLowerCase();
        const finalColor = HEX_COLOR_REGEX.test(normalizedCustomColor) ? normalizedCustomColor : pickerColor;

        onSave({
            ...setData,
            name: name.trim() || '(chưa đặt tên)',
            desc,
            color: finalColor,
            icon: iconNode,
            fieldIds: [...new Set(selectedIds)],
        });
    };

    const selectColor = useCallback((next: string) => {
        const normalized = next.toLowerCase();
        clearPendingColorCommit();
        setColor(normalized);
        setPickerColor(normalized);
        setCustomColor(normalized);
    }, [clearPendingColorCommit]);

    const handleColorPickerChange = useCallback((next: string) => {
        const normalized = next.toLowerCase();
        setPickerColor(normalized);
        setCustomColor(normalized);
        scheduleCommittedColor(normalized);
    }, [scheduleCommittedColor]);

    const displayColor = HEX_COLOR_REGEX.test(pickerColor) ? pickerColor : '#3b82f6';
    const currentIconNode = FIELD_SET_ICON_OPTIONS.find((o) => o.name === iconName)?.node ?? nameToIcon('Assignment');

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            mode={setData.id ? 'edit' : 'add'}
            title={setData.name || (setData.id ? 'Sửa bộ dữ liệu' : 'Tạo bộ dữ liệu mới')}
            subtitle="Cấu hình thông tin, màu sắc và danh sách trường áp dụng"
            color={displayColor}
            icon={currentIconNode}
            maxWidth="xl"
            sx={{ width: 'min(96vw, 1480px)' }}
            confirmText={setData.id ? 'Cập nhật ngay' : 'Thêm bộ dữ liệu'}
            onConfirm={handleSave}
            disabled={!name.trim()}
        >
            <Grid container spacing={2.5} alignItems="stretch">
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Stack spacing={2.5} sx={{ height: '100%' }}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.default' }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                                Thông tin chung
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Tên bộ dữ liệu"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ví dụ: Thông số kỹ thuật..."
                                    autoFocus
                                    InputProps={{ sx: { fontWeight: 600 } }}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Mô tả ngắn"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    multiline
                                    rows={3}
                                    placeholder="Bộ dữ liệu này dùng để làm gì..."
                                />
                            </Stack>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.default' }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                                Biểu tượng (Icon)
                            </Typography>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={(e) => openIconPicker(e.currentTarget)}
                                sx={{
                                    justifyContent: 'space-between',
                                    textTransform: 'none',
                                    borderStyle: 'dashed',
                                    borderWidth: 2,
                                    borderRadius: 2.5,
                                    py: 1.5,
                                    px: 2,
                                    borderColor: 'divider',
                                    '&:hover': { borderStyle: 'solid', borderColor: displayColor, bgcolor: `${displayColor}08` },
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ color: displayColor, display: 'flex', alignItems: 'center', p: 1, bgcolor: `${displayColor}10`, borderRadius: 2.5 }}>
                                        {currentIconNode}
                                    </Box>
                                    <Box sx={{ textAlign: 'left' }}>
                                        <Typography variant="body2" fontWeight={700}>
                                            {FIELD_SET_ICON_OPTIONS.find((o) => o.name === iconName)?.label ?? 'Chọn icon đại diện'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {iconName}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Box sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 2.5, color: 'text.secondary', fontSize: 10, fontWeight: 700 }}>
                                    THAY ĐỔI
                                </Box>
                            </Button>
                            <IconPickerPopover
                                anchorEl={iconPickerAnchorEl}
                                open={Boolean(iconPickerAnchorEl)}
                                selectedIconName={iconName}
                                selectedColor={displayColor}
                                onSelect={handleSelectIcon}
                                onClose={closeIconPicker}
                            />
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.default' }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                                Màu sắc chủ đạo
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center" sx={{ mb: 2 }}>
                                {SET_COLORS.map((c) => (
                                    <Box
                                        key={c}
                                        onClick={() => selectColor(c)}
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 2.5,
                                            bgcolor: c,
                                            cursor: 'pointer',
                                            border: color === c ? '3px solid' : '2px solid transparent',
                                            borderColor: color === c ? 'background.paper' : 'transparent',
                                            boxShadow: color === c ? `0 0 0 3px ${c}` : 'rgba(0,0,0,0.08) 0px 2px 4px',
                                            '&:hover': { transform: 'scale(1.12)' },
                                        }}
                                    />
                                ))}
                            </Stack>

                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                '.react-colorful': {
                                    width: '100%',
                                    maxWidth: 260,
                                    height: 130,
                                    borderRadius: 2.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                },
                                '.react-colorful__saturation': { borderRadius: 2.5 },
                                '.react-colorful__hue': { height: 16, borderRadius: 2.5 },
                                '.react-colorful__hue-pointer': { width: 16, height: 16 },
                            }}>
                                <HexColorPicker color={displayColor} onChange={handleColorPickerChange} />
                            </Box>

                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
                                <TextField
                                    size="small"
                                    label="Mã HEX tùy chỉnh"
                                    placeholder="#3b82f6"
                                    value={customColor}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setCustomColor(next);
                                        const normalizedNext = next.trim().toLowerCase();
                                        if (HEX_COLOR_REGEX.test(normalizedNext)) {
                                            clearPendingColorCommit();
                                            setColor(normalizedNext);
                                            setPickerColor(normalizedNext);
                                        }
                                    }}
                                    error={customColor.trim().length > 0 && !isCustomColorValid}
                                    InputProps={{
                                        startAdornment: <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>#</Typography>,
                                        sx: { fontFamily: 'monospace', fontWeight: 700 },
                                    }}
                                    sx={{ flex: 1 }}
                                />
                                <Box sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 2.5,
                                    bgcolor: displayColor,
                                    border: '4px solid',
                                    borderColor: 'background.paper',
                                }} />
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper
                        variant="outlined"
                        sx={{ p: 1.75, borderRadius: 2.5, height: 720, display: 'flex', flexDirection: 'column' }}
                    >
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2 }}>
                            Danh sách trường áp dụng
                        </Typography>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <FieldSelectionPanel
                                selectedIds={selectedIds}
                                totalFields={allFields.length}
                                filteredAllFields={filteredAllFields}
                                fieldSearch={fieldSearch}
                                selectedColor={color}
                                onFieldSearchChange={handleFieldSearchChange}
                                onSelectAll={handleSelectAllFields}
                                onClearAll={handleClearAllFields}
                                onToggle={toggle}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </CommonDialog>
    );
};

export default FieldSetEditorDialog;
