import React from 'react';
import { Button, ButtonProps, SxProps, Theme } from '@mui/material';
import { Add } from '@mui/icons-material';

interface CreateProps extends Omit<ButtonProps, 'onClick'> {
    onClick: () => void;
    label?: string;
    startIcon?: React.ReactNode;
    sx?: SxProps<Theme>;
}

const Create: React.FC<CreateProps> = ({ 
    onClick, 
    label = "Tạo mới", 
    color = "primary",
    size = "medium",
    variant = "contained",
    startIcon = <Add />,
    disabled = false,
    sx = {},
    ...otherProps
}) => {
    return (
        <Button
            variant={variant}
            color={color}
            size={size}
            onClick={onClick}
            startIcon={startIcon}
            disabled={disabled}
            sx={sx}
            {...otherProps}
        >
            {label}
        </Button>
    );
};

export default Create;
