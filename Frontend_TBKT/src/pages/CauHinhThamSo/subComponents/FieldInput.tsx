import React, { useMemo, useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import InputAdornment from '@mui/material/InputAdornment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import { CountryRegionData } from 'react-country-region-selector';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { FieldValidation } from '../types';
import OfficeDictionary from '../../Office/subComponent/OfficeDictionary';
import officeApi from '../../../apis/officeApi';
import { serializeProtoObject } from '../../../utils/serializeProto';

interface FieldInputProps {
    field: DynamicField;
    value: string | undefined;
    error?: string;
    onChange: (key: string, value: string) => void;
}

interface CountryOption {
    code: string;
    label: string;
}

type CountryRegionTuple = [string, string, string[]?];

const toFlagEmoji = (countryCode: string): string => (
    countryCode
        .toUpperCase()
        .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
);

const rawCountryRegionData = (
    (CountryRegionData as unknown as { default?: CountryRegionTuple[] }).default
    ?? (CountryRegionData as unknown as CountryRegionTuple[])
);

const COUNTRY_OPTIONS: CountryOption[] = rawCountryRegionData.map(([label, code]) => ({
    label,
    code,
}));

const parseMultiValue = (rawValue: string | undefined): string[] => {
    if (!rawValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        }
    } catch {
        return rawValue.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return [];
};

const FieldInput: React.FC<FieldInputProps> = ({ field, value, error, onChange }) => {
    const currentValue = value ?? '';
    const [apiOptions, setApiOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [displayLabel, setDisplayLabel] = useState(currentValue);
    const validation = field.validation as FieldValidation;
    const isTreeSelect = field.type === 'select' && validation.displayType === 'tree';
    const isCountrySelect = field.type === 'select' && validation.dataSource === 'country';
    const [countrySearch, setCountrySearch] = useState('');

    // State cho Popover Dictionary
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isTreeSelect) {
            return;
        }

        if (!currentValue) {
            setDisplayLabel('');
            return;
        }

        let cancelled = false;

        if (displayLabel === currentValue || !displayLabel) {
            officeApi.getOffice(currentValue)
                .then((res) => {
                    if (!res || cancelled) {
                        return;
                    }

                    const serialized = serializeProtoObject(res) as any;
                    setDisplayLabel(serialized.ten || serialized.tenDayDu || serialized.label || serialized.name || currentValue);
                })
                .catch((err) => {
                    if (!cancelled) {
                        console.error('[FieldInput] getOffice error:', err);
                    }
                });
        }

        return () => {
            cancelled = true;
        };
    }, [currentValue, displayLabel, isTreeSelect]);

    useEffect(() => {
        if (!isCountrySelect) {
            return;
        }

        setDisplayLabel(currentValue);
    }, [currentValue, isCountrySelect]);

    useEffect(() => {
        // Chỉ tải apiOptions cho kiểu Dropdown/Tabs, riêng kiểu TREE sẽ để OfficeDictionary tự xử lý
        if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkboxGroup') && validation.displayType !== 'tree' && validation.dataSource === 'api' && validation.apiUrl) {
            setLoading(true);
            fetch(validation.apiUrl)
                .then(res => res.json())
                .then(data => {
                    const rawItems = data.items || data;
                    if (Array.isArray(rawItems)) {
                        const items = rawItems.map(item => serializeProtoObject(item));
                        setApiOptions(items);
                    }
                })
                .catch(err => console.error('[FieldInput] fetch apiUrl error:', err))
                .finally(() => setLoading(false));
        }
    }, [field.type, validation.apiUrl, validation.dataSource, validation.displayType]);

    const options = validation.dataSource === 'api'
        ? apiOptions.map((opt) => typeof opt === 'string' ? opt : (opt.label || opt.name || opt.ten || opt.value || opt.id))
        : (validation.options ?? []);
    const filteredCountryOptions = useMemo(() => {
        const normalizedSearch = countrySearch.trim().toLowerCase();
        if (!normalizedSearch) {
            return COUNTRY_OPTIONS;
        }

        return COUNTRY_OPTIONS.filter((option) =>
            option.label.toLowerCase().includes(normalizedSearch) || option.code.toLowerCase().includes(normalizedSearch),
        );
    }, [countrySearch]);

    if (field.type === 'select') {
        const displayType = validation.displayType ?? 'dropdown';

        // SỬ DỤNG OFFICE DICTIONARY TANSTACK LÀM POPOVER
        if (displayType === 'tree') {
            const handleOpen = () => setAnchorEl(containerRef.current);
            const handleClose = () => setAnchorEl(null);

            const handleSelect = (node: any) => {
                const selectedId = node.id?.value || node.id || '';
                const selectedTen = node.ten?.value || node.ten || node.label || '';

                setDisplayLabel(selectedTen);
                onChange(field.key, String(selectedId));
                handleClose();
            };

            return (
                <Box sx={{ width: '100%' }} ref={containerRef}>
                    <TextField
                        fullWidth
                        size="small"
                        value={displayLabel}
                        onClick={handleOpen}
                        error={Boolean(error)}
                        helperText={error || ' '}
                        placeholder="-- Chọn đơn vị từ danh sách --"
                        InputProps={{
                            readOnly: true,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleOpen}>
                                        <AccountTreeIcon fontSize="small" color={anchorEl ? "primary" : "action"} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { cursor: 'pointer', '& input': { cursor: 'pointer' } }
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
                                    width: anchorEl?.offsetWidth || 400,
                                    height: 400,
                                    mt: 1,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }
                            }
                        }}
                    >
                        <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            {/* Để OfficeDictionary tự fetch dữ liệu gốc nếu không truyền prop offices */}
                            <OfficeDictionary onSelect={handleSelect} />
                        </Box>
                    </Popover>
                </Box>
            );
        }

        if (validation.dataSource === 'country') {
            const handleOpen = () => setAnchorEl(containerRef.current);
            const handleClose = () => {
                setAnchorEl(null);
                setCountrySearch('');
            };

            const selectedCountry = COUNTRY_OPTIONS.find((option) => option.label === currentValue);

            const handleSelectCountry = (option: CountryOption) => {
                setDisplayLabel(option.label);
                onChange(field.key, option.label);
                handleClose();
            };

            return (
                <Box sx={{ width: '100%' }} ref={containerRef}>
                    <TextField
                        fullWidth
                        size="small"
                        value={displayLabel}
                        onClick={handleOpen}
                        error={Boolean(error)}
                        helperText={error || ' '}
                        placeholder="-- Chọn quốc gia --"
                        InputProps={{
                            readOnly: true,
                            startAdornment: selectedCountry ? (
                                <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontSize: '1.15rem', lineHeight: 1 }}>
                                        {toFlagEmoji(selectedCountry.code)}
                                    </Typography>
                                </InputAdornment>
                            ) : undefined,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleOpen}>
                                        <SearchIcon fontSize="small" color={anchorEl ? 'primary' : 'action'} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { cursor: 'pointer', '& input': { cursor: 'pointer' } },
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
                                    width: anchorEl?.offsetWidth || 420,
                                    height: 420,
                                    mt: 1,
                                    boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                },
                            },
                        }}
                    >
                        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <TextField
                                autoFocus
                                fullWidth
                                size="small"
                                placeholder="Tìm quốc gia..."
                                value={countrySearch}
                                onChange={(event) => setCountrySearch(event.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                            {filteredCountryOptions.length > 0 ? (
                                <List disablePadding>
                                    {filteredCountryOptions.map((option) => (
                                        <ListItemButton
                                            key={option.code}
                                            selected={option.label === currentValue}
                                            onClick={() => handleSelectCountry(option)}
                                            sx={{ py: 1, px: 1.5 }}
                                        >
                                            <Box sx={{ width: 28, textAlign: 'center', mr: 1, fontSize: '1.1rem', lineHeight: 1 }}>
                                                {toFlagEmoji(option.code)}
                                            </Box>
                                            <ListItemText
                                                primary={option.label}
                                                secondary={option.code}
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                                secondaryTypographyProps={{ variant: 'caption' }}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            ) : (
                                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                    <Typography variant="body2">Không tìm thấy quốc gia phù hợp.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Popover>
                </Box>
            );
        }

        if (displayType === 'tabs') {
            return (
                <Box sx={{ width: '100%' }}>
                    <Tabs
                        value={options.indexOf(currentValue) === -1 ? false : options.indexOf(currentValue)}
                        onChange={(_, val) => {
                            if (typeof val === 'number' && options[val]) onChange(field.key, options[val]);
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 36,
                            '& .MuiTab-root': {
                                minHeight: 36, py: 0, px: 2, textTransform: 'none',
                                fontWeight: 700, fontSize: '0.85rem', borderRadius: 2.5, mr: 1,
                                border: '1px solid', borderColor: 'divider',
                                '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' },
                            },
                        }}
                        TabIndicatorProps={{ style: { display: 'none' } }}
                    >
                        {options.map((opt, idx) => <Tab key={opt} label={opt} value={idx} />)}
                    </Tabs>
                    {error && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{error}</Typography>}
                </Box>
            );
        }

        return (
            <TextField
                select fullWidth size="small"
                value={currentValue}
                onChange={(event) => onChange(field.key, event.target.value)}
                error={Boolean(error)}
                helperText={error || ' '}
                InputProps={{
                    endAdornment: loading ? <CircularProgress color="inherit" size={16} sx={{ mr: 3 }} /> : null,
                }}
            >
                <MenuItem value=""><em>{loading ? 'Đang tải...' : '-- Chọn --'}</em></MenuItem>
                {options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
            </TextField>
        );
    }

    if (field.type === 'radio') {
        return (
            <Box sx={{ px: 1, py: 0.5 }}>
                <RadioGroup value={currentValue} onChange={(event) => onChange(field.key, event.target.value)}>
                    {options.map((option) => (
                        <FormControlLabel key={option} value={option} control={<Radio size="small" />} label={option} />
                    ))}
                </RadioGroup>
                {error && <Typography variant="caption" color="error.main">{error}</Typography>}
            </Box>
        );
    }

    // Các kiểu input khác (textarea, checkbox, text/number/date)
    if (field.type === 'textarea') {
        return <TextField multiline minRows={3} fullWidth size="small" value={currentValue} onChange={(e) => onChange(field.key, e.target.value)} error={Boolean(error)} helperText={error || ' '} />;
    }

    if (field.type === 'checkbox') {
        const checked = currentValue === 'true';
        return (
            <Box sx={{ px: 1 }}>
                <FormControlLabel control={<Checkbox checked={checked} onChange={(_, checked) => onChange(field.key, checked ? 'true' : 'false')} />} label={checked ? 'Có' : 'Không'} />
                {error && <Typography variant="caption" color="error.main">{error}</Typography>}
            </Box>
        );
    }

    if (field.type === 'checkboxGroup') {
        const selectedValues = parseMultiValue(currentValue);

        const toggleOption = (option: string) => {
            const nextValues = selectedValues.includes(option)
                ? selectedValues.filter((item) => item !== option)
                : [...selectedValues, option];
            onChange(field.key, JSON.stringify(nextValues));
        };

        return (
            <Box sx={{ px: 1, py: 0.5 }}>
                <FormGroup>
                    {options.map((option) => (
                        <FormControlLabel
                            key={option}
                            control={<Checkbox checked={selectedValues.includes(option)} onChange={() => toggleOption(option)} />}
                            label={option}
                        />
                    ))}
                </FormGroup>
                {error && <Typography variant="caption" color="error.main">{error}</Typography>}
            </Box>
        );
    }

    if (field.type === 'text') {
        return (
            <TextField
                fullWidth
                size="small"
                type="text"
                value={currentValue}
                onChange={(e) => onChange(field.key, e.target.value)}
                error={Boolean(error)}
                helperText={error || ' '}
                inputProps={{ inputMode: 'text' }}
            />
        );
    }

    return (
        <TextField
            fullWidth size="small"
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={currentValue}
            onChange={(e) => onChange(field.key, e.target.value)}
            error={Boolean(error)}
            helperText={error || ' '}
            inputProps={field.type === 'number' ? { min: field.validation.min, max: field.validation.max } : undefined}
        />
    );
};

export default FieldInput;
