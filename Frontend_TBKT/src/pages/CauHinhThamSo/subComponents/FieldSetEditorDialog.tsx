import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import CommonDialog from '../../../components/Dialog/CommonDialog';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Grid,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TRANG_BI_FIELD_SET_KEY_OPTIONS } from '../../../constants/fieldSetKeys';
import type { DanhMucTrangBiTree } from '../../../apis/danhMucTrangBiApi';
import danhMucTrangBiApi from '../../../apis/danhMucTrangBiApi';
import DanhMucTrangBiDictionary from '../../DanhMucTrangBi/DanhMucTrangBiDictionary';
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

// FieldSet editor
interface FieldSetEditorDialogProps {
    open: boolean;
    setData: FieldSet;
    allFields: DynamicField[];
    onSave: (set: FieldSet) => void;
    onClose: () => void;
}

const FieldSetEditorDialog: React.FC<FieldSetEditorDialogProps> = ({ open, setData, allFields, onSave, onClose }) => {
    const normalizeFieldSetSlug = useCallback((value: string): string => (
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/_+/g, '_')
    ), []);

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
    const [fieldSetKey, setFieldSetKey] = useState<string>(setData.key ?? '');
    const [keyManuallyEdited, setKeyManuallyEdited] = useState(Boolean(setData.key));
    const [maDanhMucTrangBi, setMaDanhMucTrangBi] = useState<string[]>(setData.maDanhMucTrangBi ?? []);
    const [danhMucLabels, setDanhMucLabels] = useState<Record<string, string>>({});
    const [loadingDanhMucLabels, setLoadingDanhMucLabels] = useState(false);
    const [generalCollapsed, setGeneralCollapsed] = useState(false);
    const [categoryCollapsed, setCategoryCollapsed] = useState(true);
    const [selectedDanhMucSearch, setSelectedDanhMucSearch] = useState('');
    const [lastPickedDanhMucId, setLastPickedDanhMucId] = useState('');
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
        setFieldSetKey(setData.key ?? '');
        setKeyManuallyEdited(Boolean(setData.key));
        setMaDanhMucTrangBi(setData.maDanhMucTrangBi ?? []);
        setDanhMucLabels({});
        setGeneralCollapsed(false);
        setCategoryCollapsed(true);
        setSelectedDanhMucSearch('');
        setLastPickedDanhMucId('');

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

    useEffect(() => {
        const ids = [...new Set(maDanhMucTrangBi.map((item) => item.trim()).filter(Boolean))];
        if (ids.length === 0) {
            setDanhMucLabels({});
            setLoadingDanhMucLabels(false);
            return;
        }

        let cancelled = false;
        setLoadingDanhMucLabels(true);

        Promise.all(ids.map(async (id) => {
            try {
                const node = await danhMucTrangBiApi.getTreeItem(id);
                const label = node
                    ? [node.ten, node.tenDayDu]
                        .filter((value, index, arr) => value && arr.indexOf(value) === index)
                        .join(' - ') || node.id || id
                    : id;
                return [id, label] as const;
            } catch {
                return [id, id] as const;
            }
        }))
            .then((entries) => {
                if (cancelled) return;
                setDanhMucLabels(Object.fromEntries(entries));
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingDanhMucLabels(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [maDanhMucTrangBi]);

    const isCustomColorValid = HEX_COLOR_REGEX.test(customColor.trim());

    const filteredAllFields = useMemo(
        () => allFields.filter(
            (f) =>
                f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                f.key.toLowerCase().includes(fieldSearch.toLowerCase()),
        ),
        [allFields, fieldSearch],
    );

    const filteredSelectedDanhMuc = useMemo(() => {
        const keyword = selectedDanhMucSearch.trim().toLowerCase();
        if (!keyword) return maDanhMucTrangBi;

        return maDanhMucTrangBi.filter((ma) => {
            const label = String(danhMucLabels[ma] ?? '').toLowerCase();
            return ma.toLowerCase().includes(keyword) || label.includes(keyword);
        });
    }, [danhMucLabels, maDanhMucTrangBi, selectedDanhMucSearch]);

    const autoMatchedRuntimeKey = useMemo(() => {
        const normalizedName = normalizeFieldSetSlug(name);
        if (!normalizedName) return '';

        return TRANG_BI_FIELD_SET_KEY_OPTIONS.find((option) =>
            normalizeFieldSetSlug(option.label) === normalizedName)?.value ?? '';
    }, [name, normalizeFieldSetSlug]);

    useEffect(() => {
        if (keyManuallyEdited) return;
        setFieldSetKey(autoMatchedRuntimeKey);
    }, [autoMatchedRuntimeKey, keyManuallyEdited]);

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

    const handlePickDanhMuc = useCallback((node: DanhMucTrangBiTree) => {
        const id = node.id ?? '';
        if (!id) return;

        setMaDanhMucTrangBi((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setLastPickedDanhMucId(id);
        setCategoryCollapsed(false);
    }, []);

    const handleSave = () => {
        const iconNode = FIELD_SET_ICON_OPTIONS.find((o) => o.name === iconName)?.node ?? nameToIcon('Assignment');
        const normalizedCustomColor = customColor.trim().toLowerCase();
        const finalColor = HEX_COLOR_REGEX.test(normalizedCustomColor) ? normalizedCustomColor : pickerColor;

        onSave({
            ...setData,
            name: name.trim() || '(chua dat ten)',
            key: fieldSetKey.trim() || undefined,
            desc,
            color: finalColor,
            icon: iconNode,
            fieldIds: [...new Set(selectedIds)],
            maDanhMucTrangBi: maDanhMucTrangBi.length > 0 ? [...maDanhMucTrangBi] : undefined,
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
    const sidebarPaperSx = {
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: 'background.default',
    } as const;
    const panelToggleButtonSx = {
        textTransform: 'none',
        bgcolor: 'text.primary',
        color: 'background.paper',
        boxShadow: 'none',
        '&:hover': {
            bgcolor: 'text.primary',
            boxShadow: 'none',
        },
    } as const;
    const panelSizes = generalCollapsed && categoryCollapsed
        ? { general: 1, fields: 10, category: 1 }
        : generalCollapsed
            ? { general: 1, fields: 8, category: 3 }
            : categoryCollapsed
                ? { general: 3, fields: 8, category: 1 }
                : { general: 3, fields: 6, category: 3 };

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            mode={setData.id ? 'edit' : 'add'}
            title={setData.name || (setData.id ? 'Sua bo du lieu' : 'Tao bo du lieu moi')}
            subtitle="Cau hinh thong tin, mau sac va danh sach truong ap dung"
            color={displayColor}
            icon={currentIconNode}
            maxWidth="xl"
            sx={{ width: 'min(98vw, 1880px)' }}
            confirmText={setData.id ? 'Lưu' : 'Thêm'}
            onConfirm={handleSave}
            disabled={!name.trim()}
        >
            <Grid container spacing={2.5} alignItems="stretch">
                <Grid size={{ xs: 12, lg: panelSizes.general }}>
                    {generalCollapsed ? (
                        <Paper
                            variant="outlined"
                            sx={{
                                ...sidebarPaperSx,
                                height: 1000,
                                maxHeight: 'calc(100vh - 180px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: 0.75,
                            }}
                        >
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<ChevronRightIcon />}
                                onClick={() => setGeneralCollapsed(false)}
                                sx={{
                                    ...panelToggleButtonSx,
                                    minWidth: 0,
                                    height: '100%',
                                    writingMode: 'vertical-rl',
                                    transform: 'rotate(180deg)',
                                    transition: 'none',
                                    '&:hover': { ...panelToggleButtonSx['&:hover'], transform: 'rotate(180deg)' },
                                    gap: 1,
                                    fontWeight: 800,
                                }}
                            >
                                Thong tin chung
                            </Button>
                        </Paper>
                    ) : (
                        <Paper
                            variant="outlined"
                            sx={{
                                ...sidebarPaperSx,
                                height: 1000,
                                maxHeight: 'calc(100vh - 180px)',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Header */}
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, flexShrink: 0 }}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Thong tin chung
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    endIcon={<ChevronLeftIcon />}
                                    onClick={() => setGeneralCollapsed(true)}
                                    sx={{ ...panelToggleButtonSx }}
                                >
                                    Thu gon
                                </Button>
                            </Stack>

                            {/* Name + desc */}
                            <Stack spacing={1.25} sx={{ flexShrink: 0 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Ten bo du lieu"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Vi du: Thong so ky thuat..."
                                    autoFocus
                                    InputProps={{ sx: { fontWeight: 600 } }}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Mo ta ngan"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    multiline
                                    rows={2}
                                    placeholder="Bo du lieu nay dung de lam gi..."
                                />

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Key"
                                    value={fieldSetKey}
                                    onChange={(e) => {
                                        setFieldSetKey(e.target.value);
                                        setKeyManuallyEdited(true);
                                    }}
                                    placeholder="Vi du: trang_bi.thong_tin_chung"
                                    helperText={autoMatchedRuntimeKey && !keyManuallyEdited
                                        ? `Tu dong chon theo ten: ${autoMatchedRuntimeKey}`
                                        : 'FieldSet se duoc truy van theo key nay.'}
                                    slotProps={{
                                        htmlInput: {
                                            spellCheck: 'false',
                                        },
                                    }}
                                />

                                {/* Icon picker button */}
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={(e) => openIconPicker(e.currentTarget)}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        textTransform: 'none',
                                        borderStyle: 'dashed',
                                        borderWidth: 1.5,
                                        borderRadius: 2,
                                        py: 0.875,
                                        px: 1,
                                        borderColor: 'divider',
                                        '&:hover': { borderStyle: 'solid', borderColor: displayColor, bgcolor: `${displayColor}08` },
                                    }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                        <Box
                                            sx={{
                                                color: displayColor,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                p: 0.75,
                                                bgcolor: `${displayColor}10`,
                                                borderRadius: 2,
                                                flexShrink: 0,
                                                '& svg': { fontSize: 18 },
                                            }}
                                        >
                                            {currentIconNode}
                                        </Box>
                                        <Box sx={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                                Bieu tuong
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} noWrap>
                                                {FIELD_SET_ICON_OPTIONS.find((o) => o.name === iconName)?.label ?? 'Chon icon dai dien'}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                bgcolor: 'action.hover',
                                                px: 0.75,
                                                py: 0.375,
                                                borderRadius: 2,
                                                color: 'text.secondary',
                                                fontSize: 9,
                                                fontWeight: 700,
                                                flexShrink: 0,
                                            }}
                                        >
                                            DOI
                                        </Box>
                                    </Stack>
                                </Button>
                                <IconPickerPopover
                                    anchorEl={iconPickerAnchorEl}
                                    open={Boolean(iconPickerAnchorEl)}
                                    selectedIconName={iconName}
                                    selectedColor={displayColor}
                                    onSelect={handleSelectIcon}
                                    onClose={closeIconPicker}
                                />
                            </Stack>

                            {/* Divider label */}
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mt: 2, mb: 1, flexShrink: 0, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                Mau sac chu dao
                            </Typography>

                            {/* Color swatches + HEX preview side by side */}
                            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flexShrink: 0, mb: 1.5 }}>
                                <Stack direction="row" spacing={0.625} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
                                    {SET_COLORS.map((c) => (
                                        <Box
                                            key={c}
                                            onClick={() => selectColor(c)}
                                            sx={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 1.5,
                                                bgcolor: c,
                                                cursor: 'pointer',
                                                border: color === c ? '3px solid' : '2px solid transparent',
                                                borderColor: color === c ? 'background.paper' : 'transparent',
                                                boxShadow: color === c ? `0 0 0 2.5px ${c}` : 'rgba(0,0,0,0.08) 0px 2px 4px',
                                                '&:hover': { transform: 'scale(1.15)', zIndex: 1 },
                                            }}
                                        />
                                    ))}
                                </Stack>
                                {/* Live color preview swatch */}
                                <Box sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 2,
                                    bgcolor: displayColor,
                                    border: '3px solid',
                                    borderColor: 'background.paper',
                                    boxShadow: `0 0 0 1.5px ${displayColor}60`,
                                    flexShrink: 0,
                                }} />
                            </Stack>

                            {/* HEX color picker — flex: 1 fills remaining space */}
                            <Box sx={{
                                flex: 1,
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                '.react-colorful': {
                                    width: '100%',
                                    height: '100%',
                                    maxHeight: 200,
                                    borderRadius: 2.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                },
                                '.react-colorful__saturation': { borderRadius: '10px 10px 0 0' },
                                '.react-colorful__hue': { height: 16, borderRadius: '0 0 10px 10px' },
                                '.react-colorful__hue-pointer': { width: 16, height: 16 },
                            }}>
                                <HexColorPicker color={displayColor} onChange={handleColorPickerChange} />
                            </Box>

                            {/* HEX input */}
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, flexShrink: 0 }}>
                                <TextField
                                    size="small"
                                    label="Ma HEX tuy chinh"
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
                            </Stack>
                        </Paper>
                    )}
                </Grid>

                <Grid size={{ xs: 12, lg: panelSizes.fields }}>
                    <Paper
                        variant="outlined"
                        sx={{ p: 1.75, borderRadius: 2.5, height: 1000, maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={800}>
                                Danh sach truong ap dung
                            </Typography>
                        </Stack>
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

                <Grid size={{ xs: 12, lg: panelSizes.category }}>
                    {categoryCollapsed ? (
                        <Paper
                            variant="outlined"
                            sx={{
                                ...sidebarPaperSx,
                                height: 1000,
                                maxHeight: 'calc(100vh - 180px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: 0.75,
                            }}
                        >
                            <Button
                                fullWidth
                                variant="contained"
                                endIcon={<ChevronLeftIcon />}
                                onClick={() => setCategoryCollapsed(false)}
                                sx={{
                                    ...panelToggleButtonSx,
                                    minWidth: 0,
                                    height: '100%',
                                    writingMode: 'vertical-rl',
                                    transition: 'none',
                                    gap: 1,
                                    fontWeight: 800,
                                }}
                            >
                                Danh muc trang bi
                            </Button>
                        </Paper>
                    ) : (
                        <Paper
                            variant="outlined"
                            sx={{ p: 1.75, borderRadius: 2.5, height: 1000, maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75, flexShrink: 0 }}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Danh muc trang bi
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    endIcon={<ChevronRightIcon />}
                                    onClick={() => setCategoryCollapsed(true)}
                                    sx={{
                                        ...panelToggleButtonSx,
                                    }}
                                >
                                    Thu gon
                                </Button>
                            </Stack>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, flexShrink: 0 }}>
                                Chon tu cay danh muc de luu `MaDanhMucTrangBi`, khong nhap tay ma.
                            </Typography>

                            {loadingDanhMucLabels && (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexShrink: 0 }}>
                                    <CircularProgress size={16} />
                                    <Typography variant="caption" color="text.secondary">
                                        Dang tai thong tin danh muc da chon...
                                    </Typography>
                                </Stack>
                            )}

                            {maDanhMucTrangBi.length > 0 && (
                                <TextField
                                    size="small"
                                    fullWidth
                                    value={selectedDanhMucSearch}
                                    onChange={(e) => setSelectedDanhMucSearch(e.target.value)}
                                    placeholder="Tim trong danh sach da ap dung..."
                                    sx={{ mb: 1.25, flexShrink: 0 }}
                                />
                            )}

                            <Box sx={{ mb: 1.25, flexShrink: 0, maxHeight: 180, overflowY: 'auto' }}>
                                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                    {filteredSelectedDanhMuc.map((ma) => (
                                        <Tooltip key={ma} title={ma}>
                                            <Chip
                                                label={danhMucLabels[ma] ? `${danhMucLabels[ma]} (${ma})` : ma}
                                                size="small"
                                                onDelete={() => setMaDanhMucTrangBi((prev) => prev.filter((x) => x !== ma))}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </Tooltip>
                                    ))}
                                </Stack>
                            </Box>

                            {maDanhMucTrangBi.length > 0 && filteredSelectedDanhMuc.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, flexShrink: 0 }}>
                                    Khong tim thay danh muc phu hop voi tu khoa loc.
                                </Typography>
                            )}

                            <Box sx={{ flex: 1, minHeight: 0 }}>
                                <DanhMucTrangBiDictionary
                                    selectedId={lastPickedDanhMucId}
                                    onSelect={handlePickDanhMuc}
                                />
                            </Box>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </CommonDialog>
    );
};

export default FieldSetEditorDialog;

