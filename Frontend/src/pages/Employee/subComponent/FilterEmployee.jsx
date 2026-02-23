import React, { useState, useMemo } from 'react';
import {
    Box,
    TextField,
    MenuItem,
    Button,
    Grid,
    Paper,
    Typography,
    InputAdornment,
    IconButton,
    Collapse,
    Chip,
    Stack,
    Popover,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider
} from '@mui/material';
import {
    Search,
    FilterList,
    Clear,
    ExpandMore,
    ExpandLess,
    Business,
    Close,
    Badge,
    Work,
    AccountTree
} from '@mui/icons-material';
import OfficeDictionaryDialog from './OfficeDictionaryDialog';

const FilterEmployee = ({
    onFilter,
    capBacList = [],
    officeList = [],
    colors
}) => {
    const [filters, setFilters] = useState({
        searchText: '',
        idCapBac: '',
        chucVu: '',
        idDonVi: '',
        idQuanTriDonVi: ''
    });

    // State cho OfficeDictionaryDialog
    const [openOfficePopup, setOpenOfficePopup] = useState(false);
    const [currentOfficeField, setCurrentOfficeField] = useState(null);
    const [officeNames, setOfficeNames] = useState({
        idDonVi: '',
        idQuanTriDonVi: ''
    });

    // State cho Popover - sử dụng anchorEl thay vì boolean
    const [anchorEl, setAnchorEl] = useState(null);
    const [filterType, setFilterType] = useState(null);

    // Map để lấy tên cấp bậc
    const capBacMap = useMemo(() => {
        const map = {};
        capBacList.forEach(item => {
            map[item.id] = item.ten || item.id;
        });
        return map;
    }, [capBacList]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Mở Popover cho Cấp bậc và Chức vụ
    const handleOpenPopover = (event, type) => {
        setAnchorEl(event.currentTarget);
        setFilterType(type);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
        setFilterType(null);
    };

    // Mở dialog chọn đơn vị
    const handleOpenOfficeDialog = (event, fieldName) => {
        setCurrentOfficeField(fieldName);
        setOpenOfficePopup(true);
    };

    const handleSelectOffice = (office) => {
        if (currentOfficeField) {
            if (office) {
                setFilters(prev => ({
                    ...prev,
                    [currentOfficeField]: office.id || office._id
                }));
                setOfficeNames(prev => ({
                    ...prev,
                    [currentOfficeField]: office.ten || office.tenDayDu || office._label || office.id
                }));
            } else {
                setFilters(prev => ({
                    ...prev,
                    [currentOfficeField]: ''
                }));
                setOfficeNames(prev => ({
                    ...prev,
                    [currentOfficeField]: ''
                }));
            }
        }
        setOpenOfficePopup(false);
        setCurrentOfficeField(null);
    };

    // Chọn cấp bậc
    const handleSelectCapBac = (id) => {
        handleFilterChange('idCapBac', id);
        handleClosePopover();
    };

    // Xóa một filter cụ thể
    const handleRemoveFilter = (filterKey) => {
        setFilters(prev => ({
            ...prev,
            [filterKey]: ''
        }));
        if (filterKey === 'idDonVi' || filterKey === 'idQuanTriDonVi') {
            setOfficeNames(prev => ({
                ...prev,
                [filterKey]: ''
            }));
        }
    };

    const handleSearch = () => {
        if (onFilter) {
            onFilter(filters);
        }
    };

    const handleClearAll = () => {
        setFilters({
            searchText: '',
            idCapBac: '',
            chucVu: '',
            idDonVi: '',
            idQuanTriDonVi: ''
        });
        setOfficeNames({
            idDonVi: '',
            idQuanTriDonVi: ''
        });
        if (onFilter) {
            onFilter({
                searchText: '',
                idCapBac: '',
                chucVu: '',
                idDonVi: '',
                idQuanTriDonVi: ''
            });
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Lấy danh sách các filter đang active để hiển thị chips
    const activeFilters = useMemo(() => {
        const chips = [];
        if (filters.idCapBac) {
            chips.push({
                key: 'idCapBac',
                label: `Cấp bậc: ${capBacMap[filters.idCapBac] || filters.idCapBac}`,
                icon: <Badge fontSize="small" />,
                color: 'primary'
            });
        }
        if (filters.chucVu) {
            chips.push({
                key: 'chucVu',
                label: `Chức vụ: ${filters.chucVu}`,
                icon: <Work fontSize="small" />,
                color: 'secondary'
            });
        }
        if (filters.idDonVi) {
            chips.push({
                key: 'idDonVi',
                label: `Đơn vị: ${officeNames.idDonVi || filters.idDonVi}`,
                icon: <Business fontSize="small" />,
                color: 'success'
            });
        }
        if (filters.idQuanTriDonVi) {
            chips.push({
                key: 'idQuanTriDonVi',
                label: `QT đơn vị: ${officeNames.idQuanTriDonVi || filters.idQuanTriDonVi}`,
                icon: <AccountTree fontSize="small" />,
                color: 'warning'
            });
        }
        return chips;
    }, [filters, capBacMap, officeNames]);

    const open = Boolean(anchorEl);

    return (
        <>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 2 }}>
                    <TextField
                        placeholder="Tìm kiếm theo tên, email, điện thoại..."
                        size="small"
                        fullWidth
                        value={filters.searchText}
                        onChange={(e) => handleFilterChange('searchText', e.target.value)}
                        onKeyPress={handleKeyPress}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                            endAdornment: filters.searchText && (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleFilterChange('searchText', '')}
                                    >
                                        <Clear fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {/* Hiển thị các filter chips bên dưới thanh tìm kiếm */}
                    <Box sx={{ minHeight: activeFilters.length > 0 ? '40px' : '0px', mt: activeFilters.length > 0 ? 1 : 0 }}>
                        {activeFilters.length > 0 && (
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                {activeFilters.map((filter) => (
                                    <Chip
                                        key={filter.key}
                                        icon={filter.icon}
                                        label={filter.label}
                                        size="small"
                                        color={filter.color}
                                        onDelete={() => handleRemoveFilter(filter.key)}
                                        sx={{
                                            '& .MuiChip-deleteIcon': {
                                                fontSize: '16px'
                                            }
                                        }}
                                    />
                                ))}
                                {activeFilters.length > 1 && (
                                    <Chip
                                        label="Xóa tất cả"
                                        size="small"
                                        variant="outlined"
                                        onDelete={handleClearAll}
                                        deleteIcon={<Clear />}
                                        sx={{ color: 'error.main', borderColor: 'error.main' }}
                                    />
                                )}
                            </Stack>
                        )}
                    </Box>
                </Box>

                {/* Các nút chọn filter */}
                <Stack direction="row" spacing={1}>
                    <Button
                        variant={filters.idCapBac ? "contained" : "outlined"}
                        size="small"
                        startIcon={<Badge />}
                        onClick={(e) => handleOpenPopover(e, 'capBac')}
                        color={filters.idCapBac ? "primary" : "inherit"}
                    >
                        Cấp bậc
                    </Button>
                    <Button
                        variant={filters.chucVu ? "contained" : "outlined"}
                        size="small"
                        startIcon={<Work />}
                        onClick={(e) => handleOpenPopover(e, 'chucVu')}
                        color={filters.chucVu ? "secondary" : "inherit"}
                    >
                        Chức vụ
                    </Button>
                    {/* <Button
                        variant={filters.idDonVi ? "contained" : "outlined"}
                        size="small"
                        startIcon={<Business />}
                        onClick={(e) => handleOpenOfficeDialog(e, 'idDonVi')}
                        color={filters.idDonVi ? "success" : "inherit"}
                    >
                        Đơn vị
                    </Button>
                    <Button
                        variant={filters.idQuanTriDonVi ? "contained" : "outlined"}
                        size="small"
                        startIcon={<AccountTree />}
                        onClick={(e) => handleOpenOfficeDialog(e, 'idQuanTriDonVi')}
                        color={filters.idQuanTriDonVi ? "warning" : "inherit"}
                    >
                        QT Đơn vị
                    </Button> */}
                </Stack>

                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Search />}
                    onClick={handleSearch}
                    sx={{ minWidth: 120 }}
                >
                    Tìm kiếm
                </Button>
            </Box>

            {/* ✅ Popover cho Cấp bậc */}
            <Popover
                open={open && filterType === 'capBac'}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: { width: 280, maxHeight: 400 }
                }}
            >
                <Box sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>Chọn cấp bậc</Typography>
                        <IconButton size="small" onClick={handleClosePopover}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <List dense>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={!filters.idCapBac}
                                onClick={() => handleSelectCapBac('')}
                            >
                                <ListItemText primary="-- Tất cả --" />
                            </ListItemButton>
                        </ListItem>
                        {capBacList.map((item) => (
                            <ListItem key={item.id} disablePadding>
                                <ListItemButton
                                    selected={filters.idCapBac === item.id}
                                    onClick={() => handleSelectCapBac(item.id)}
                                >
                                    <ListItemText primary={item.ten || item.id} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Popover>

            {/* Popover cho Chức vụ */}
            <Popover
                open={open && filterType === 'chucVu'}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: { width: 320, p: 2 }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600}>Nhập chức vụ</Typography>
                    <IconButton size="small" onClick={handleClosePopover}>
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
                <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    label="Chức vụ"
                    value={filters.chucVu}
                    onChange={(e) => handleFilterChange('chucVu', e.target.value)}
                    placeholder="Nhập chức vụ cần tìm..."
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleClosePopover();
                        }
                    }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        onClick={() => {
                            handleFilterChange('chucVu', '');
                            handleClosePopover();
                        }}
                    >
                        Xóa
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        onClick={handleClosePopover}
                    >
                        Áp dụng
                    </Button>
                </Stack>
            </Popover>

            {/* OfficeDictionaryDialog cho chọn đơn vị */}
            <OfficeDictionaryDialog
                open={openOfficePopup}
                onClose={() => { setOpenOfficePopup(false); setCurrentOfficeField(null); }}
                onSelect={handleSelectOffice}
                selectedId={currentOfficeField === 'idDonVi' ? filters.idDonVi : filters.idQuanTriDonVi}
                title={currentOfficeField === 'idDonVi' ? 'Chọn đơn vị công tác' : 'Chọn đơn vị quản trị'}
                offices={officeList}
            />
        </>
    );
};

export default FilterEmployee;
