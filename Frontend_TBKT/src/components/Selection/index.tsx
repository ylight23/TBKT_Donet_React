import React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import _ from 'lodash';

interface SelectOption {
    key: string;
    name: string;
}

interface SelectionProps {
    name?: string;
    values: string;
    data?: SelectOption[];
    handleChange: (event: SelectChangeEvent<string>) => void;
    error?: boolean;
    label: string;
    required?: boolean;
    helperText?: string;
}

const Selection: React.FC<SelectionProps> = (props) => {
    const { name, values, data = [], handleChange, error, label, required = false, helperText } = props;

    return (
        <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth error={error}>
                <InputLabel id="selection-label">{label}{required ? '*' : ''}</InputLabel>
                <Select
                    labelId="selection-label"
                    id="selection"
                    value={values}
                    label={label}
                    onChange={handleChange}
                >
                    {
                        _.size(data) > 0 ?
                            data.map((value) => (
                                <MenuItem key={value.key} value={value.key}>{value.name}</MenuItem>
                            )) : null
                    }
                </Select>
                {helperText && <FormHelperText>{helperText}</FormHelperText>}
            </FormControl>
        </Box>
    );
};

export default Selection;
