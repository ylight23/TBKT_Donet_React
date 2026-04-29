import React, { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ViewListIcon from '@mui/icons-material/ViewList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTheme } from '@mui/material/styles';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getStripedRowSx } from '../../../utils/stripedSurface';

export interface VirtualOptionItem {
    value: string;
    label: string;
    color?: string;
}

interface VirtualOptionPickerProps {
    label?: string;
    placeholder?: string;
    value: string;
    options: VirtualOptionItem[];
    required?: boolean;
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    loading?: boolean;
    onChange: (value: string) => void;
}

const ROW_HEIGHT = 44;
const VIRTUALIZE_THRESHOLD = 80;
const STANDARD_CONTROL_HEIGHT = 42;

const VirtualOptionPicker: React.FC<VirtualOptionPickerProps> = ({
    label,
    placeholder,
    value,
    options,
    required = false,
    disabled = false,
    error = false,
    helperText,
    loading = false,
    onChange,
}) => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const [searchText, setSearchText] = useState('');

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    const filteredOptions = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) {
            return options;
        }

        return options.filter((option) =>
            option.label.toLowerCase().includes(keyword) || option.value.toLowerCase().includes(keyword),
        );
    }, [options, searchText]);
    const shouldVirtualize = filteredOptions.length > VIRTUALIZE_THRESHOLD;

    const virtualizer = useVirtualizer({
        count: filteredOptions.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 8,
        getItemKey: (index) => filteredOptions[index]?.value ?? `option-${index}`,
    });

    const handleOpen = () => {
        if (disabled) {
            return;
        }
        setAnchorEl(containerRef.current);
    };
    const handleClose = () => {
        setAnchorEl(null);
        setSearchText('');
    };

    return (
        <Box sx={{ width: '100%' }} ref={containerRef}>
            <TextField
                fullWidth
                size="small"
                variant="outlined"
                label={label}
                required={required}
                disabled={disabled}
                error={error}
                helperText={helperText}
                value={selectedOption?.label ?? ''}
                placeholder={placeholder}
                onClick={handleOpen}
                InputProps={{
                    readOnly: true,
                    endAdornment: (
                        <InputAdornment position="end">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                {selectedOption && (
                                    <Chip
                                        size="small"
                                        label={selectedOption.value}
                                        variant="outlined"
                                        sx={{
                                            ...(selectedOption.color
                                                ? {
                                                    bgcolor: `${selectedOption.color}18`,
                                                    color: selectedOption.color,
                                                    borderColor: `${selectedOption.color}55`,
                                                }
                                                : {}),
                                            maxWidth: 132,
                                            '& .MuiChip-label': {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            },
                                        }}
                                        />
                                    )}
                                <IconButton size="small" onClick={handleOpen} disabled={disabled}>
                                    {selectedOption ? (
                                        <KeyboardArrowDownIcon fontSize="small" color={anchorEl ? 'primary' : 'action'} />
                                    ) : (
                                        <ViewListIcon fontSize="small" color={anchorEl ? 'primary' : 'action'} />
                                    )}
                                </IconButton>
                            </Box>
                        </InputAdornment>
                    ),
                    sx: { cursor: disabled ? 'default' : 'pointer', '& input': { cursor: disabled ? 'default' : 'pointer' } },
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        minHeight: `${STANDARD_CONTROL_HEIGHT}px`,
                    },
                    '& .MuiInputBase-input': {
                        paddingTop: '10px',
                        paddingBottom: '10px',
                    },
                }}
            />

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            width: anchorEl?.offsetWidth || 460,
                            height: 420,
                            mt: 0.75,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.18)',
                        },
                    },
                }}
            >
                <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        {label || placeholder || 'Danh muc lua chon'}
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        placeholder="Tìm mã định danh..."
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: searchText ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchText('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : undefined,
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {loading ? 'Đang tải danh mục...' : `${filteredOptions.length} mã định danh`}
                    </Typography>
                </Box>

                <Box sx={{ flex: 1, overflow: 'hidden', p: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {filteredOptions.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="body2">
                                {loading ? 'Đang tải danh mục...' : 'Không tìm thấy mã định danh phù hợp.'}
                            </Typography>
                        </Box>
                    ) : !shouldVirtualize ? (
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                            {filteredOptions.map((option, index) => {
                                const isSelected = option.value === value;

                                return (
                                    <ListItemButton
                                        key={option.value}
                                        selected={isSelected}
                                        onClick={() => {
                                            onChange(option.value);
                                            handleClose();
                                        }}
                                        sx={{
                                            height: ROW_HEIGHT,
                                            borderRadius: 2,
                                            mb: 0.5,
                                            alignItems: 'center',
                                            ...getStripedRowSx(theme, index, isSelected),
                                        }}
                                    >
                                        <ListItemText
                                            primary={option.color ? (
                                                <Chip
                                                    size="small"
                                                    label={option.label}
                                                    sx={{
                                                        bgcolor: `${option.color}18`,
                                                        color: option.color,
                                                        border: `1px solid ${option.color}55`,
                                                        fontWeight: 700,
                                                        maxWidth: '100%',
                                                        '& .MuiChip-label': {
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        },
                                                    }}
                                                />
                                            ) : option.label}
                                            secondary={option.value}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: isSelected ? 700 : 500 }}
                                            secondaryTypographyProps={{ variant: 'caption', sx: { fontFamily: 'inherit' } }}
                                        />
                                    </ListItemButton>
                                );
                            })}
                        </Box>
                    ) : (
                        <div ref={scrollRef} style={{ height: '100%', overflow: 'auto' }}>
                            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                                {virtualizer.getVirtualItems().map((virtualRow) => {
                                    const option = filteredOptions[virtualRow.index];
                                    const isSelected = option?.value === value;
                                    if (!option) return null;

                                    return (
                                        <ListItemButton
                                            key={virtualRow.key}
                                            selected={isSelected}
                                            onClick={() => {
                                                onChange(option.value);
                                                handleClose();
                                            }}
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                transform: `translateY(${virtualRow.start}px)`,
                                                height: ROW_HEIGHT,
                                                borderRadius: 2,
                                                mb: 0.5,
                                                alignItems: 'center',
                                                ...getStripedRowSx(theme, virtualRow.index, isSelected),
                                            }}
                                        >
                                            <ListItemText
                                                primary={option.color ? (
                                                    <Chip
                                                        size="small"
                                                        label={option.label}
                                                        sx={{
                                                            bgcolor: `${option.color}18`,
                                                            color: option.color,
                                                            border: `1px solid ${option.color}55`,
                                                            fontWeight: 700,
                                                            maxWidth: '100%',
                                                            '& .MuiChip-label': {
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            },
                                                        }}
                                                    />
                                                ) : option.label}
                                                secondary={option.value}
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: isSelected ? 700 : 500 }}
                                                secondaryTypographyProps={{ variant: 'caption', sx: { fontFamily: 'inherit' } }}
                                            />
                                        </ListItemButton>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Box>
            </Popover>
        </Box>
    );
};

export default VirtualOptionPicker;
