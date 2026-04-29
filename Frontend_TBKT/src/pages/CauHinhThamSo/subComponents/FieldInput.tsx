import React, { useMemo, useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
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
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { CountryRegionData } from 'react-country-region-selector';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { FieldValidation } from '../types';
import OfficeDictionary from '../../Office/subComponent/OfficeDictionary';
import DanhMucTrangBiDictionary, { preloadDanhMucTrangBiTree } from '../../DanhMucTrangBi/DanhMucTrangBiDictionary';
import danhMucTrangBiApi from '../../../apis/danhMucTrangBiApi';
import officeApi from '../../../apis/officeApi';
import {
    isDanhMucTrangBiTreeOptionKey,
    isMaDinhDanhTrangBiListOptionKey,
    isMaDinhDanhTrangBiOptionKey,
    isOfficeOptionKey,
    resolveDynamicOptions,
    type DynamicOptionItem,
} from '../../../apis/dynamicOptionApi';
import { serializeProtoObject } from '../../../utils/serializeProto';
import { parseManualOptions } from '../../../utils/manualOptionConfig';
import VirtualOptionPicker from './VirtualOptionPicker';

interface FieldInputProps {
    field: DynamicField;
    value: string | undefined;
    error?: string;
    useMuiLabel?: boolean;
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
const STANDARD_CONTROL_HEIGHT = 42;

const getFieldLabel = (field: DynamicField): string => field.label;
const toManualOptionItems = (options: string[] | undefined): DynamicOptionItem[] =>
    parseManualOptions(options).map((option) => ({
        value: option.value,
        label: option.label,
        color: option.color,
    }));
const getValidationHint = (field: DynamicField): string => {
    if (field.type === 'number') {
        const min = field.validation?.min;
        const max = field.validation?.max;
        if (typeof min === 'number' && typeof max === 'number') {
            return `Nhập giá trị từ ${min} đến ${max}.`;
        }
        if (typeof min === 'number') {
            return `Nhập giá trị lớn hơn hoặc bằng ${min}.`;
        }
        if (typeof max === 'number') {
            return `Nhập giá trị nhỏ hơn hoặc bằng ${max}.`;
        }
    }

    if (field.type === 'text' || field.type === 'textarea') {
        const minLength = field.validation?.minLength;
        const maxLength = field.validation?.maxLength;
        if (typeof minLength === 'number' && typeof maxLength === 'number') {
            return `Nhập từ ${minLength} đến ${maxLength} ký tự.`;
        }
        if (typeof minLength === 'number') {
            return `Nhập tối thiểu ${minLength} ký tự.`;
        }
        if (typeof maxLength === 'number') {
            return `Nhập tối đa ${maxLength} ký tự.`;
        }
    }

    return ' ';
};

const renderOptionContent = (option: DynamicOptionItem) => {
    if (!option.color) {
        return option.label;
    }

    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Chip
                size="small"
                label={option.label}
                sx={{
                    bgcolor: `${option.color}18`,
                    color: option.color,
                    border: `1px solid ${option.color}55`,
                    fontWeight: 700,
                    maxWidth: 220,
                    '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },
                }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'inherit' }}>
                {option.value}
            </Typography>
        </Stack>
    );
};

const FieldInput: React.FC<FieldInputProps> = ({ field, value, error, useMuiLabel = false, onChange }) => {
    const currentValue = value ?? '';
    const isFieldDisabled = Boolean(field.disabled);
    const effectiveHelperText = error || getValidationHint(field);
    const [apiOptions, setApiOptions] = useState<DynamicOptionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [displayLabel, setDisplayLabel] = useState(currentValue);
    const validation = field.validation as FieldValidation;
    const isOfficeApiSelect = field.type === 'select'
        && validation.dataSource === 'api'
        && isOfficeOptionKey(validation.apiUrl);
    const isDanhMucTreeSelect = field.type === 'select'
        && validation.dataSource === 'api'
        && isDanhMucTrangBiTreeOptionKey(validation.apiUrl);
    const isMaDinhDanhListSelect = field.type === 'select'
        && validation.dataSource === 'api'
        && isMaDinhDanhTrangBiListOptionKey(validation.apiUrl);
    const isTreeSelect = field.type === 'select'
        && (isOfficeApiSelect || isDanhMucTreeSelect);
    const isCountrySelect = field.type === 'select' && validation.dataSource === 'country';
    const isVirtualOptionSelect = field.type === 'select'
        && validation.dataSource === 'api'
        && (isMaDinhDanhListSelect || (isMaDinhDanhTrangBiOptionKey(validation.apiUrl) && !isDanhMucTreeSelect))
        && !isDanhMucTreeSelect;
    const [countrySearch, setCountrySearch] = useState('');

    // State cho Popover Dictionary
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isDanhMucTreeSelect) {
            return;
        }

        void preloadDanhMucTrangBiTree().catch((err) => {
            console.error('[FieldInput] preloadDanhMucTrangBiTree error:', err);
        });
    }, [isDanhMucTreeSelect]);

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
            const resolveTreeDisplayLabel = async () => {
                try {
                    if (isOfficeApiSelect) {
                        const res = await officeApi.getOffice(currentValue);
                        if (!res || cancelled) {
                            return;
                        }

                        const serialized = serializeProtoObject(res) as any;
                        setDisplayLabel(serialized.ten || serialized.tenDayDu || serialized.label || serialized.name || currentValue);
                        return;
                    }

                    if (isDanhMucTreeSelect) {
                        const res = await danhMucTrangBiApi.getTreeItem(currentValue);
                        if (!res || cancelled) {
                            return;
                        }

                        setDisplayLabel(res.ten || res.tenDayDu || res.id || currentValue);
                    }
                } catch (err) {
                    if (!cancelled) {
                        console.error('[FieldInput] tree label resolve error:', err);
                    }
                }
            };

            void resolveTreeDisplayLabel();
        }

        return () => {
            cancelled = true;
        };
    }, [currentValue, displayLabel, isDanhMucTreeSelect, isOfficeApiSelect, isTreeSelect]);

    useEffect(() => {
        if (!isCountrySelect) {
            return;
        }

        setDisplayLabel(currentValue);
    }, [currentValue, isCountrySelect]);

    useEffect(() => {
        // Chỉ tải apiOptions cho kiểu Dropdown/Tabs, riêng kiểu TREE sẽ để OfficeDictionary tự xử lý
        if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkboxGroup') && !isTreeSelect && validation.dataSource === 'api' && validation.apiUrl) {
            setLoading(true);
            resolveDynamicOptions(validation.apiUrl)
                .then((items) => {
                    setApiOptions(items);
                })
                .catch(err => console.error('[FieldInput] resolveDynamicOptions error:', err))
                .finally(() => setLoading(false));
        } else {
            setApiOptions([]);
            setLoading(false);
        }
    }, [field.type, isTreeSelect, validation.apiUrl, validation.dataSource, validation.displayType]);

    const options = validation.dataSource === 'api'
        ? apiOptions
        : toManualOptionItems(validation.options);
    const commonTextFieldProps = {
        fullWidth: true,
        size: 'small' as const,
        variant: 'outlined' as const,
        required: Boolean(field.required),
        disabled: isFieldDisabled,
        error: Boolean(error),
        helperText: effectiveHelperText,
        label: useMuiLabel ? getFieldLabel(field) : undefined,
        FormHelperTextProps: {
            sx: {
                mt: 0.75,
                mx: 0,
                minHeight: 20,
                lineHeight: 1.4,
            },
        },
        sx: {
            '& .MuiFormLabel-root': {
                fontSize: '0.92rem',
                fontWeight: 500,
            },
            '& .MuiFormLabel-asterisk': {
                color: 'error.main',
            },
            '& .MuiOutlinedInput-root': {
                minHeight: `${STANDARD_CONTROL_HEIGHT}px`,
            },
            '& .MuiInputBase-input': {
                paddingTop: '10px',
                paddingBottom: '10px',
                boxSizing: 'border-box',
            },
            '& .MuiSelect-select': {
                minHeight: 'auto',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
            },
        },
    };
    const commonChoiceControlSx = {
        px: 1.25,
        py: 1,
        border: '1px solid',
        borderColor: Boolean(error) ? 'error.main' : 'divider',
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': {
            borderColor: Boolean(error) ? 'error.main' : 'text.secondary',
            bgcolor: 'action.hover',
        },
    };
    const commonFormLabelSx = {
        mb: 0.75,
        fontSize: '0.92rem',
        fontWeight: 500,
        color: 'text.secondary',
        '&.Mui-focused': {
            color: 'primary.main',
        },
    };
    const commonFormHelperTextSx = {
        mt: 0.75,
        mx: 0,
        minHeight: 20,
        lineHeight: 1.4,
    };
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
        if (isTreeSelect) {
            const handleOpen = () => {
                if (isFieldDisabled) {
                    return;
                }
                setAnchorEl(containerRef.current);
            };
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
                        {...commonTextFieldProps}
                        value={displayLabel}
                        onClick={handleOpen}
                        placeholder={isDanhMucTreeSelect ? '-- Chọn danh mục trang bị --' : '-- Chọn đơn vị từ danh sách --'}
                        InputProps={{
                            readOnly: true,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleOpen} disabled={isFieldDisabled}>
                                        <AccountTreeIcon fontSize="small" color={anchorEl ? 'primary' : 'action'} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { cursor: isFieldDisabled ? 'default' : 'pointer', '& input': { cursor: isFieldDisabled ? 'default' : 'pointer' } },
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
                            {isDanhMucTreeSelect ? (
                                <DanhMucTrangBiDictionary selectedId={currentValue} onSelect={handleSelect} />
                            ) : (
                                <OfficeDictionary onSelect={handleSelect} />
                            )}
                        </Box>
                    </Popover>
                </Box>
            );
        }

        if (validation.dataSource === 'country') {
            const handleOpen = () => {
                if (isFieldDisabled) {
                    return;
                }
                setAnchorEl(containerRef.current);
            };
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
                        {...commonTextFieldProps}
                        value={displayLabel}
                        onClick={handleOpen}
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
                                    <IconButton size="small" onClick={handleOpen} disabled={isFieldDisabled}>
                                        <SearchIcon fontSize="small" color={anchorEl ? 'primary' : 'action'} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { cursor: isFieldDisabled ? 'default' : 'pointer', '& input': { cursor: isFieldDisabled ? 'default' : 'pointer' } },
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
                                {...commonTextFieldProps}
                                placeholder="Tìm quốc gia..."
                                value={countrySearch}
                                onChange={(event) => setCountrySearch(event.target.value)}
                                helperText={undefined}
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

        if (isVirtualOptionSelect || displayType === 'dropdown' || displayType === 'tree' || displayType === 'autocomplete') {
            return (
                <VirtualOptionPicker
                    label={useMuiLabel ? getFieldLabel(field) : undefined}
                    placeholder={isVirtualOptionSelect ? 'Chọn mã định danh' : 'Chọn giá trị'}
                    value={currentValue}
                    options={options}
                    required={Boolean(field.required)}
                    disabled={isFieldDisabled}
                    error={Boolean(error)}
                    helperText={effectiveHelperText}
                    loading={loading}
                    onChange={(nextValue) => onChange(field.key, nextValue)}
                />
            );
        }

        if (displayType === 'tabs') {
            return (
                <FormControl fullWidth error={Boolean(error)} sx={{ width: '100%' }}>
                    {useMuiLabel && (
                        <FormLabel required={Boolean(field.required)} sx={commonFormLabelSx}>
                            {field.label}
                        </FormLabel>
                    )}
                    <Tabs
                        value={options.findIndex((option) => option.value === currentValue) === -1 ? false : options.findIndex((option) => option.value === currentValue)}
                        onChange={(_, val) => {
                            if (typeof val === 'number' && options[val]) onChange(field.key, options[val].value);
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
                        {options.map((opt, idx) => <Tab key={opt.value} label={opt.label} value={idx} disabled={isFieldDisabled} />)}
                    </Tabs>
                    <FormHelperText sx={commonFormHelperTextSx}>{effectiveHelperText}</FormHelperText>
                </FormControl>
            );
        }

        return (
            <TextField
                {...commonTextFieldProps}
                select
                value={currentValue}
                onChange={(event) => onChange(field.key, event.target.value)}
                InputProps={{
                    endAdornment: loading ? <CircularProgress color="inherit" size={16} sx={{ mr: 3 }} /> : null,
                }}
            >
                <MenuItem value=""><em>{loading ? 'Đang tải...' : '-- Chọn --'}</em></MenuItem>
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {renderOptionContent(option)}
                    </MenuItem>
                ))}
            </TextField>
        );
    }

    if (field.type === 'radio') {
        return (
            <FormControl fullWidth error={Boolean(error)} sx={{ width: '100%' }}>
                <FormLabel required={Boolean(field.required)} sx={commonFormLabelSx}>
                    {field.label}
                </FormLabel>
                <RadioGroup value={currentValue} onChange={(event) => onChange(field.key, event.target.value)} sx={commonChoiceControlSx}>
                    {options.map((option) => (
                        <FormControlLabel key={option.value} value={option.value} control={<Radio size="small" disabled={isFieldDisabled} />} label={option.label} disabled={isFieldDisabled} />
                    ))}
                </RadioGroup>
                <FormHelperText sx={commonFormHelperTextSx}>{effectiveHelperText}</FormHelperText>
            </FormControl>
        );
    }

    // Các kiểu input khác (textarea, checkbox, text/number/date)
    if (field.type === 'textarea') {
        return <TextField {...commonTextFieldProps} multiline minRows={3} value={currentValue} onChange={(e) => onChange(field.key, e.target.value)} />;
    }

    if (field.type === 'checkbox') {
        const checked = currentValue === 'true';
        return (
            <FormControl fullWidth error={Boolean(error)} sx={{ width: '100%' }}>
                <FormLabel required={Boolean(field.required)} sx={commonFormLabelSx}>
                    {field.label}
                </FormLabel>
                <Box sx={commonChoiceControlSx}>
                    <FormControlLabel control={<Checkbox checked={checked} disabled={isFieldDisabled} onChange={(_, checked) => onChange(field.key, checked ? 'true' : 'false')} />} label={checked ? 'Có' : 'Không'} disabled={isFieldDisabled} />
                </Box>
                <FormHelperText sx={commonFormHelperTextSx}>{effectiveHelperText}</FormHelperText>
            </FormControl>
        );
    }

    if (field.type === 'checkboxGroup') {
        const selectedValues = parseMultiValue(currentValue);

        const toggleOption = (optionValue: string) => {
            const nextValues = selectedValues.includes(optionValue)
                ? selectedValues.filter((item) => item !== optionValue)
                : [...selectedValues, optionValue];
            onChange(field.key, JSON.stringify(nextValues));
        };

        return (
            <FormControl fullWidth error={Boolean(error)} sx={{ width: '100%' }}>
                <FormLabel required={Boolean(field.required)} sx={commonFormLabelSx}>
                    {field.label}
                </FormLabel>
                <FormGroup sx={commonChoiceControlSx}>
                    {options.map((option) => (
                        <FormControlLabel
                            key={option.value}
                            control={<Checkbox checked={selectedValues.includes(option.value)} disabled={isFieldDisabled} onChange={() => toggleOption(option.value)} />}
                            label={option.label}
                            disabled={isFieldDisabled}
                        />
                    ))}
                </FormGroup>
                <FormHelperText sx={commonFormHelperTextSx}>{effectiveHelperText}</FormHelperText>
            </FormControl>
        );
    }

    if (field.type === 'text') {
        return (
            <TextField
                {...commonTextFieldProps}
                type="text"
                value={currentValue}
                onChange={(e) => onChange(field.key, e.target.value)}
                inputProps={{ inputMode: 'text' }}
                autoComplete="off"
            />
        );
    }

    return (
        <TextField
            {...commonTextFieldProps}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={currentValue}
            onChange={(e) => onChange(field.key, e.target.value)}
            autoComplete="off"
            InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
            inputProps={field.type === 'number' ? { min: field.validation.min, max: field.validation.max } : undefined}
        />
    );
};

export default FieldInput;
