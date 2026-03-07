import React, { useState, useMemo } from 'react';

// ✅ Direct imports
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import Grid from '@mui/material/GridLegacy';
import { useTheme } from '@mui/material/styles';
import Badge from '@mui/icons-material/Badge';
import Work from '@mui/icons-material/Work';
import Business from '@mui/icons-material/Business';
import AccountTree from '@mui/icons-material/AccountTree';
import Search from '@mui/icons-material/Search';
import Clear from '@mui/icons-material/Clear';
import FilterAlt from '@mui/icons-material/FilterAlt';
import CommonFilter from '../../../components/Filter/CommonFilter';

import OfficeDictionaryDialog from './OfficeDictionaryDialog';
import { OfficeNode } from '../../Office/subComponent/OfficeDictionary';
import { useEmployee } from '../../../context/EmployeeContext';


// ── Types ──────────────────────────────────────────────────────────────────────

interface FilterValues {
    searchText: string;
    idCapBac: string;
    chucVu: string;
    idDonVi: string;
    idQuanTriDonVi: string;
}

interface ActiveFilterChip {
    key: keyof FilterValues;
    label: string;
    icon: React.ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default';
}

// ── Component ──────────────────────────────────────────────────────────────────

const FilterEmployee: React.FC = () => {
    const theme = useTheme();
    const { state, actions } = useEmployee();
    const { capBacList, officeList } = state;
    const { filterEmployees } = actions;

    const [filters, setFilters] = useState<FilterValues>({
        searchText: '', idCapBac: '', chucVu: '', idDonVi: '', idQuanTriDonVi: '',
    });
    const [openOfficePopup, setOpenOfficePopup] = useState(false);
    const [currentOfficeField, setCurrentOfficeField] = useState<keyof FilterValues | null>(null);
    const [officeNames, setOfficeNames] = useState<{ idDonVi: string; idQuanTriDonVi: string }>({ idDonVi: '', idQuanTriDonVi: '' });

    const capBacMap = useMemo(() => {
        const map: Record<string, string> = {};
        capBacList.forEach(item => { map[item.id] = item.ten || item.id; });
        return map;
    }, [capBacList]);

    const handleFilterChange = (field: keyof FilterValues, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };


    const handleOpenOfficeDialog = (_event: React.MouseEvent, fieldName: keyof FilterValues) => {
        setCurrentOfficeField(fieldName);
        setOpenOfficePopup(true);
    };

    const handleSelectOffice = (office: OfficeNode | null) => {
        if (currentOfficeField) {
            if (office) {
                setFilters(prev => ({ ...prev, [currentOfficeField!]: String(office.id || '') }));
                setOfficeNames(prev => ({ ...prev, [currentOfficeField!]: (office.ten || office.tenDayDu || office.id) as string }));
            } else {
                setFilters(prev => ({ ...prev, [currentOfficeField!]: '' }));
                setOfficeNames(prev => ({ ...prev, [currentOfficeField!]: '' }));
            }
        }
        setOpenOfficePopup(false);
        setCurrentOfficeField(null);
    };

    const handleSelectCapBac = (id: string) => { handleFilterChange('idCapBac', id); };

    const handleRemoveFilter = (filterKey: keyof FilterValues) => {
        setFilters(prev => ({ ...prev, [filterKey]: '' }));
        if (filterKey === 'idDonVi' || filterKey === 'idQuanTriDonVi') {
            setOfficeNames(prev => ({ ...prev, [filterKey]: '' }));
        }
    };

    const handleSearch = () => { filterEmployees(filters); };

    const handleClearAll = () => {
        const empty: FilterValues = { searchText: '', idCapBac: '', chucVu: '', idDonVi: '', idQuanTriDonVi: '' };
        setFilters(empty);
        setOfficeNames({ idDonVi: '', idQuanTriDonVi: '' });
        filterEmployees(empty);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

    const activeFilters = useMemo<ActiveFilterChip[]>(() => {
        const chips: ActiveFilterChip[] = [];
        if (filters.idCapBac) chips.push({ key: 'idCapBac', label: `Cấp bậc: ${capBacMap[filters.idCapBac] || filters.idCapBac}`, icon: <Badge fontSize="small" />, color: 'primary' });
        if (filters.chucVu) chips.push({ key: 'chucVu', label: `Chức vụ: ${filters.chucVu}`, icon: <Work fontSize="small" />, color: 'secondary' });
        if (filters.idDonVi) chips.push({ key: 'idDonVi', label: `Đơn vị: ${officeNames.idDonVi || filters.idDonVi}`, icon: <Business fontSize="small" />, color: 'success' });
        if (filters.idQuanTriDonVi) chips.push({ key: 'idQuanTriDonVi', label: `QT đơn vị: ${officeNames.idQuanTriDonVi || filters.idQuanTriDonVi}`, icon: <AccountTree fontSize="small" />, color: 'warning' });
        return chips;
    }, [filters, capBacMap, officeNames]);


    return (
        <>
            <CommonFilter
                search={filters.searchText}
                onSearchChange={(val) => handleFilterChange('searchText', val)}
                onSearchSubmit={handleSearch}
                placeholder="Tìm kiếm nhân sự theo tên, email, số điện thoại..."
                activeFilters={activeFilters}
                onRemoveFilter={(key) => handleRemoveFilter(key as keyof FilterValues)}
                onClearAll={handleClearAll}
                showSearchButton={true}
                popoverTitle="Lọc nâng cao"
                popoverDescription="Tìm kiếm nhân sự chính xác theo vị trí và cấp bậc"
                popoverWidth={520}
                onApply={handleSearch}
            >
                <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            ĐƠN VỊ CÔNG TÁC
                        </Typography>
                        <Button
                            fullWidth variant="outlined" size="small"
                            startIcon={<Business fontSize="small" />}
                            onClick={(e) => handleOpenOfficeDialog(e, 'idDonVi')}
                            color={filters.idDonVi ? "primary" : "inherit"}
                            sx={{ justifyContent: 'flex-start', borderRadius: 2.5, textTransform: 'none', py: 1, borderColor: filters.idDonVi ? undefined : 'divider' }}
                        >
                            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {officeNames.idDonVi || "Chọn đơn vị..."}
                            </Box>
                        </Button>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            PHẠM VI QUẢN TRỊ
                        </Typography>
                        <Button
                            fullWidth variant="outlined" size="small"
                            startIcon={<AccountTree fontSize="small" />}
                            onClick={(e) => handleOpenOfficeDialog(e, 'idQuanTriDonVi')}
                            color={filters.idQuanTriDonVi ? "primary" : "inherit"}
                            sx={{ justifyContent: 'flex-start', borderRadius: 2.5, textTransform: 'none', py: 1, borderColor: filters.idQuanTriDonVi ? undefined : 'divider' }}
                        >
                            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {officeNames.idQuanTriDonVi || "Chọn đơn vị..."}
                            </Box>
                        </Button>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            CẤP BẬC
                        </Typography>
                        <TextField
                            select fullWidth size="small"
                            value={filters.idCapBac}
                            onChange={(e) => handleFilterChange('idCapBac', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action" /></InputAdornment>
                            }}
                            SelectProps={{ native: true }}
                        >
                            <option value="">Tất cả cấp bậc</option>
                            {capBacList.map((item) => (
                                <option key={item.id} value={item.id}>{item.ten || item.id}</option>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            CHỨC VỤ
                        </Typography>
                        <TextField
                            fullWidth size="small"
                            placeholder="Nhập chức vụ..."
                            value={filters.chucVu}
                            onChange={(e) => handleFilterChange('chucVu', e.target.value)}
                            InputProps={{
                                sx: { borderRadius: 2.5},
                                startAdornment: <InputAdornment position="start"><Work fontSize="small" color="action" /></InputAdornment>
                            }}
                        />
                    </Grid>
                </Grid>
            </CommonFilter>

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
