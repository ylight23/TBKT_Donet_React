/**
 * IconPickerPopover – Full MUI Icon Library Picker
 *
 * - Tải toàn bộ ~2000+ icons từ @mui/icons-material (namespace import)
 * - Tìm kiếm realtime theo tên icon
 * - Virtual scrolling (Tanstack react-virtual) để render mượt
 * - Lưu tên icon (string) → serialize về backend dễ dàng
 */
import React, {
    useMemo, useState, useRef, useCallback, useTransition, useEffect,
} from 'react';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';
import { useVirtualizer } from '@tanstack/react-virtual';

// ── Import full MUI Icons namespace ──────────────────────────────────────────
import * as MuiIcons from '@mui/icons-material';

// ── Build danh sách toàn bộ icon 1 lần (module-level, không re-compute) ──────

interface IconEntry {
    name: string;       // e.g. "AccountCircle"
    nameLower: string;  // lowercase để search nhanh
}

// Lọc ra các key thực sự là icon component (function, có chữ hoa đầu)
const ALL_MUI_ICON_ENTRIES: IconEntry[] = Object.keys(MuiIcons)
    .filter(key => /^[A-Z]/.test(key) && typeof (MuiIcons as any)[key] === 'object')
    .map(name => ({ name, nameLower: name.toLowerCase() }));

const ICON_SIZE = 76;       // px mỗi ô icon (vuông)
const ICONS_PER_ROW = 7;    // số cột

interface IconPickerPopoverProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    selectedIconName: string;
    selectedColor: string;
    onSelect: (name: string) => void;
    onClose: () => void;
    // Props cũ (vẫn support để không break FieldSetEditorDialog)
    search?: string;
    groups?: string[];
    groupedOptions?: Record<string, any[]>;
    onSearchChange?: (value: string) => void;
}

const IconPickerPopover: React.FC<IconPickerPopoverProps> = React.memo(({
    anchorEl,
    open,
    selectedIconName,
    selectedColor,
    onSelect,
    onClose,
}) => {
    const [query, setQuery] = useState('');
    const [deferredQuery, setDeferredQuery] = useState('');
    const [, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset khi mở lại
    useEffect(() => {
        if (open) {
            setQuery('');
            setDeferredQuery('');
        }
    }, [open]);

    const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        startTransition(() => setDeferredQuery(val));
    }, []);

    const handleClear = useCallback(() => {
        setQuery('');
        startTransition(() => setDeferredQuery(''));
    }, []);

    // ── Lọc theo từ khóa ─────────────────────────────────────────────────────
    const filtered: IconEntry[] = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        if (!q) return ALL_MUI_ICON_ENTRIES;
        return ALL_MUI_ICON_ENTRIES.filter(e => e.nameLower.includes(q));
    }, [deferredQuery]);

    // Chia thành các hàng (row) để virtual scroll theo hàng
    const rows: IconEntry[][] = useMemo(() => {
        const result: IconEntry[][] = [];
        for (let i = 0; i < filtered.length; i += ICONS_PER_ROW) {
            result.push(filtered.slice(i, i + ICONS_PER_ROW));
        }
        return result;
    }, [filtered]);

    // ── Virtual scroll ────────────────────────────────────────────────────────
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ICON_SIZE,
        overscan: 5,
    });

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
                paper: {
                    sx: {
                        width: { xs: 'calc(100vw - 32px)', sm: 560 },
                        height: 520,
                        display: 'flex',
                        flexDirection: 'column',
                        p: 1.5,
                        gap: 1,
                    },
                },
            }}
        >
            {/* ── Search box ── */}
            <TextField
                autoFocus
                fullWidth
                size="small"
                placeholder={`Tìm trong ${ALL_MUI_ICON_ENTRIES.length.toLocaleString()} icons...`}
                value={query}
                onChange={handleQueryChange}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                        </InputAdornment>
                    ),
                    endAdornment: query ? (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={handleClear} edge="end">
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : null,
                }}
            />

            {/* ── Kết quả & count ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                    {filtered.length.toLocaleString()} icons
                    {deferredQuery ? ` phù hợp với "${deferredQuery}"` : ' · Nhấn để chọn'}
                </Typography>
                {selectedIconName && (
                    <Chip
                        size="small"
                        label={selectedIconName}
                        onDelete={() => onSelect('')}
                        sx={{ height: 20, fontSize: 10, bgcolor: `${selectedColor}22`, color: selectedColor, border: `1px solid ${selectedColor}44` }}
                    />
                )}
            </Box>

            {/* ── Virtual grid ── */}
            <Box
                ref={scrollRef}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    position: 'relative',
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-thumb': { borderRadius: 2.5, bgcolor: 'divider' },
                }}
            >
                {filtered.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="body2" color="text.secondary">
                            Không tìm thấy icon phù hợp.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualizer.getVirtualItems().map(virtualRow => {
                            const rowItems = rows[virtualRow.index];
                            return (
                                <Box
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: virtualRow.start,
                                        left: 0,
                                        right: 0,
                                        height: ICON_SIZE,
                                        display: 'flex',
                                        gap: 4,
                                        padding: '2px 0',
                                    }}
                                >
                                    {rowItems.map(entry => (
                                        <IconCell
                                            key={entry.name}
                                            entry={entry}
                                            isSelected={selectedIconName === entry.name}
                                            selectedColor={selectedColor}
                                            onSelect={onSelect}
                                        />
                                    ))}
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        </Popover>
    );
});

// ── Icon cell (tách riêng để memo hoạt động tốt) ──────────────────────────────

interface IconCellProps {
    entry: IconEntry;
    isSelected: boolean;
    selectedColor: string;
    onSelect: (name: string) => void;
}

const IconCell: React.FC<IconCellProps> = React.memo(({ entry, isSelected, selectedColor, onSelect }) => {
    const IconComponent = useMemo(
        () => (MuiIcons as any)[entry.name] as React.ElementType | undefined,
        [entry.name],
    );

    if (!IconComponent) return null;

    return (
        <Tooltip title={entry.name} placement="top" arrow enterDelay={400}>
            <Box
                onClick={() => onSelect(entry.name)}
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    borderRadius: 2.5,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isSelected ? selectedColor : 'divider',
                    bgcolor: isSelected ? `${selectedColor}18` : 'transparent',
                    color: isSelected ? selectedColor : 'text.secondary',
                    transition: 'all 0.12s ease',
                    userSelect: 'none',
                    px: 0.5,
                    '&:hover': {
                        borderColor: selectedColor,
                        bgcolor: `${selectedColor}12`,
                        color: selectedColor,
                        transform: 'scale(1.05)',
                    },
                }}
            >
                <IconComponent sx={{ fontSize: 22 }} />
                <Typography
                    variant="caption"
                    noWrap
                    sx={{
                        fontSize: 9,
                        fontWeight: isSelected ? 700 : 400,
                        maxWidth: '100%',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        color: 'inherit',
                    }}
                >
                    {entry.name}
                </Typography>
            </Box>
        </Tooltip>
    );
});

IconCell.displayName = 'IconCell';
IconPickerPopover.displayName = 'IconPickerPopover';

export default IconPickerPopover;
