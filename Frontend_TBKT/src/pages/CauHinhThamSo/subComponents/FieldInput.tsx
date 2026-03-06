import React, { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import InputAdornment from '@mui/material/InputAdornment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import IconButton from '@mui/material/IconButton';

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

const FieldInput: React.FC<FieldInputProps> = ({ field, value, error, onChange }) => {
    const currentValue = value ?? '';
    const [apiOptions, setApiOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [displayLabel, setDisplayLabel] = useState(currentValue);

    console.log('[FieldInput] Render:', { fieldKey: field.key, fieldType: field.type, value: currentValue, displayType: (field.validation as FieldValidation).displayType });

    // State cho Popover Dictionary
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Effect để lấy label hiển thị nếu đã có value (ID)
    useEffect(() => {
        if (field.type === 'select' && (field.validation as FieldValidation).displayType === 'tree' && currentValue) {
            // Chỉ fetch lấy tên nếu chưa có trong cache hoặc displayLabel đang là ID
            if (displayLabel === currentValue || !displayLabel) {
                officeApi.getOffice(currentValue)
                    .then(res => {
                        console.log('[FieldInput] getOffice success:', res);
                        if (res) {
                            const serialized = serializeProtoObject(res) as any;
                            setDisplayLabel(serialized.ten || serialized.tenDayDu || serialized.label || serialized.name || currentValue);
                        }
                    })
                    .catch((err) => {
                        console.error('[FieldInput] getOffice error:', err);
                    });
            }
        } else {
            setDisplayLabel(currentValue);
        }
    }, [currentValue, field]);

    useEffect(() => {
        const validation = field.validation as FieldValidation;
        // Chỉ tải apiOptions cho kiểu Dropdown/Tabs, riêng kiểu TREE sẽ để OfficeDictionary tự xử lý
        if (field.type === 'select' && validation.displayType !== 'tree' && validation.dataSource === 'api' && validation.apiUrl) {
            setLoading(true);
            fetch(validation.apiUrl)
                .then(res => res.json())
                .then(data => {
                    console.log('[FieldInput] fetch apiUrl success:', data);
                    const rawItems = data.items || data;
                    if (Array.isArray(rawItems)) {
                        const items = rawItems.map(item => serializeProtoObject(item));
                        setApiOptions(items);
                    }
                })
                .catch(err => console.error('[FieldInput] fetch apiUrl error:', err))
                .finally(() => setLoading(false));
        }
    }, [field]);

    if (field.type === 'select') {
        const validation = field.validation as FieldValidation;
        const displayType = validation.displayType ?? 'dropdown';

        // SỬ DỤNG OFFICE DICTIONARY TANSTACK LÀM POPOVER
        if (displayType === 'tree') {
            const handleOpen = () => setAnchorEl(containerRef.current);
            const handleClose = () => setAnchorEl(null);

            const handleSelect = (node: any) => {
                console.log('[FieldInput] OfficeDictionary selected:', node);
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

        // TỔNG HỢP OPTIONS CHO DROPDOWN/TABS
        const options = validation.dataSource === 'api'
            ? apiOptions.map(opt => typeof opt === 'string' ? opt : (opt.label || opt.name || opt.ten || opt.value || opt.id))
            : (validation.options ?? []);

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
                                fontWeight: 700, fontSize: '0.85rem', borderRadius: 1.5, mr: 1,
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
