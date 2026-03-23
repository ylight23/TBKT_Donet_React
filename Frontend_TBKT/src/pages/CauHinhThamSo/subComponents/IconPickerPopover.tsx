import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { FIELD_SET_ICON_OPTIONS } from '../../../utils/thamSoUtils';

interface IconPickerPopoverProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    selectedIconName: string;
    selectedColor: string;
    onSelect: (name: string) => void;
    onClose: () => void;
    search?: string;
    groups?: string[];
    groupedOptions?: Record<string, unknown[]>;
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

    useEffect(() => {
        if (open) {
            setQuery('');
        }
    }, [open]);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return FIELD_SET_ICON_OPTIONS;

        return FIELD_SET_ICON_OPTIONS.filter((option) => {
            const haystacks = [
                option.name,
                option.label,
                option.group ?? '',
            ];

            return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [query]);

    const groupedOptions = useMemo(() => {
        return filteredOptions.reduce<Record<string, typeof FIELD_SET_ICON_OPTIONS>>((acc, option) => {
            const group = option.group ?? 'Khac';
            if (!acc[group]) {
                acc[group] = [];
            }

            acc[group].push(option);
            return acc;
        }, {});
    }, [filteredOptions]);

    const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    }, []);

    const handleClear = useCallback(() => {
        setQuery('');
    }, []);

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
                        maxHeight: 520,
                        display: 'flex',
                        flexDirection: 'column',
                        p: 1.5,
                        gap: 1.5,
                    },
                },
            }}
        >
            <TextField
                autoFocus
                fullWidth
                size="small"
                placeholder={`Tim trong ${FIELD_SET_ICON_OPTIONS.length} icon...`}
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                    {filteredOptions.length} icon
                    {query ? ` phu hop voi "${query.trim()}"` : ' san sang de chon'}
                </Typography>
                {selectedIconName && (
                    <Chip
                        size="small"
                        label={selectedIconName}
                        onDelete={() => onSelect('')}
                        sx={{
                            height: 20,
                            fontSize: 10,
                            bgcolor: `${selectedColor}22`,
                            color: selectedColor,
                            border: `1px solid ${selectedColor}44`,
                        }}
                    />
                )}
            </Box>

            <Box
                sx={{
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-thumb': { borderRadius: 2.5, bgcolor: 'divider' },
                }}
            >
                {Object.entries(groupedOptions).map(([group, options]) => (
                    <Box key={group} sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, fontWeight: 700 }}>
                            {group}
                        </Typography>
                        <Box
                            sx={{
                                mt: 1,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                                gap: 0.75,
                            }}
                        >
                            {options.map((option) => {
                                const isSelected = selectedIconName === option.name;
                                return (
                                    <Box
                                        key={option.name}
                                        onClick={() => onSelect(option.name)}
                                        sx={{
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
                                            py: 1,
                                            '&:hover': {
                                                borderColor: selectedColor,
                                                bgcolor: `${selectedColor}12`,
                                                color: selectedColor,
                                                transform: 'scale(1.03)',
                                            },
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>{option.node}</Box>
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
                                            {option.label}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Popover>
    );
});

IconPickerPopover.displayName = 'IconPickerPopover';

export default IconPickerPopover;
