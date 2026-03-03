import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    InputAdornment,
    IconButton,
    Stack,
    Divider,
    Tooltip,
    Button,
    Chip,
    Popover,
    Typography,
    useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

export interface ActiveFilter {
    key: string;
    label: string;
    icon?: React.ReactNode;
}

interface CommonFilterProps {
    // Search Bar
    search: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit?: () => void;
    placeholder?: string;

    // Export Button
    onExport?: () => void;
    exportLabel?: string;

    // Active Filter Chips
    activeFilters?: ActiveFilter[];
    onRemoveFilter?: (key: string) => void;
    onClearAll?: () => void;

    // Popover content
    popoverTitle?: string;
    popoverDescription?: string;
    popoverWidth?: number | string;
    children?: React.ReactNode;
    onApply?: () => void;

    // Customization
    showSearchButton?: boolean;
}

const CommonFilter: React.FC<CommonFilterProps> = ({
    search,
    onSearchChange,
    onSearchSubmit,
    placeholder = "Tìm kiếm nhanh...",
    onExport,
    exportLabel = "Xuất Excel",
    activeFilters = [],
    onRemoveFilter,
    onClearAll,
    popoverTitle = "Bộ lọc nâng cao",
    popoverDescription = "Tinh chỉnh kết quả tìm kiếm theo các tiêu chí cụ thể",
    popoverWidth = 500,
    children,
    onApply,
    showSearchButton = false,
}) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
    };

    const isPopoverOpen = Boolean(anchorEl);
    const popoverId = isPopoverOpen ? 'common-filter-popover' : undefined;

    const activeFilterCount = activeFilters.length;

    return (
        <>
            <Card variant={"filterPanel" as any} sx={{ mb: 3 }}>
                <CardContent sx={{ p: '12px 16px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={placeholder}
                            autoComplete="off"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && onSearchSubmit?.()}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            {search && (
                                                <IconButton size="small" onClick={() => onSearchChange('')}>
                                                    <ClearIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
                                            <Tooltip title="Bộ lọc nâng cao">
                                                <Button
                                                    size="small"
                                                    onClick={handleOpenPopover}
                                                    variant="text"
                                                    color={activeFilterCount > 0 ? "primary" : "inherit"}
                                                    startIcon={<FilterAltIcon fontSize="small" />}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        borderRadius: 2,
                                                        px: 1.5,
                                                        minWidth: 'auto',
                                                        position: 'relative',
                                                        bgcolor: activeFilterCount > 0 ? `${theme.palette.primary.main}15` : 'transparent',
                                                        '&:hover': {
                                                            bgcolor: activeFilterCount > 0 ? `${theme.palette.primary.main}25` : 'action.hover',
                                                        }
                                                    }}
                                                >
                                                    Nhấn bộ lọc tìm kiếm
                                                    {activeFilterCount > 0 && (
                                                        <Box sx={{
                                                            position: 'absolute', top: 4, right: 4,
                                                            width: 6, height: 6, bgcolor: 'error.main',
                                                            borderRadius: '50%', border: `1px solid ${theme.palette.background.paper}`
                                                        }} />
                                                    )}
                                                </Button>
                                            </Tooltip>
                                        </Stack>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ flex: 1 }}
                        />

                        {showSearchButton && (
                            <Button
                                variant={"militaryAction" as any}
                                color="primary"
                                onClick={onSearchSubmit}
                            >
                                Tìm kiếm
                            </Button>
                        )}

                        {onExport && (
                            <Button
                                variant={"militaryAction" as any}
                                color="primary"
                                startIcon={<FileDownloadIcon />}
                                onClick={onExport}
                            >
                                {exportLabel}
                            </Button>
                        )}
                    </Box>

                    {activeFilters.length > 0 && (
                        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {activeFilters.map((f) => (
                                <Chip
                                    key={f.key}
                                    icon={f.icon as React.ReactElement}
                                    label={f.label}
                                    size="small"
                                    variant="outlined"
                                    onDelete={() => onRemoveFilter?.(f.key)}
                                    sx={{ borderRadius: 1.5, fontWeight: 600, height: 24, fontSize: '0.75rem' }}
                                />
                            ))}
                            <Button
                                variant="text"
                                size="small"
                                onClick={onClearAll}
                                sx={{ ml: 0.5, textTransform: 'none', fontWeight: 700, p: 0, height: 24, minWidth: 'auto', fontSize: '0.75rem' }}
                            >
                                Xóa tất cả
                            </Button>
                        </Box>
                    )}

                    <Popover
                        id={popoverId}
                        open={isPopoverOpen}
                        anchorEl={anchorEl}
                        onClose={handleClosePopover}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            sx: {
                                mt: 1.5,
                                p: 3,
                                width: popoverWidth,
                                borderRadius: 4,
                                boxShadow: theme.palette.mode === 'dark' ? '0 16px 48px rgba(0,0,0,0.7)' : '0 16px 48px rgba(0,0,0,0.15)',
                                border: `1px solid ${theme.palette.divider}`,
                                overflow: 'visible',
                                '&:before': {
                                    content: '""',
                                    position: 'absolute', top: 0, right: 24,
                                    width: 12, height: 12, bgcolor: 'background.paper',
                                    transform: 'translateY(-50%) rotate(45deg)',
                                    borderTop: `1px solid ${theme.palette.divider}`,
                                    borderLeft: `1px solid ${theme.palette.divider}`,
                                }
                            }
                        }}
                    >
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="primary" sx={{ lineHeight: 1 }}>
                                    {popoverTitle}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {popoverDescription}
                                </Typography>
                            </Box>
                            <Chip
                                label={`Đã chọn ${activeFilterCount}`}
                                size="small" color="primary" variant="filled"
                                sx={{ fontWeight: 700, visibility: activeFilterCount > 0 ? 'visible' : 'hidden', borderRadius: 1.5 }}
                            />
                        </Box>

                        {activeFilters.length > 0 && (
                            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                                {activeFilters.map((f) => (
                                    <Chip
                                        key={f.key}
                                        label={f.label}
                                        size="small"
                                        onDelete={() => onRemoveFilter?.(f.key)}
                                        sx={{ borderRadius: 1, height: 22, fontSize: '0.7rem' }}
                                    />
                                ))}
                            </Box>
                        )}

                        <Box>
                            {children}
                        </Box>

                        <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined" color="inherit" onClick={onClearAll}
                                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 3 }}
                            >
                                Thiết lập lại
                            </Button>
                            <Button
                                variant="contained" color="primary" onClick={() => { onApply?.(); handleClosePopover(); }}
                                sx={{ borderRadius: 1.5, px: 5, textTransform: 'none', fontWeight: 700 }}
                            >
                                Áp dụng
                            </Button>
                        </Box>
                    </Popover>
                </CardContent>
            </Card>
        </>
    );
};

export default CommonFilter;
