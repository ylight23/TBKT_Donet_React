import React, { useState } from 'react';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

type Props = {
  placeholder?: string;
  variant?: 'outlined' | 'filled' | 'standard';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';
  bgColor?: string;
  borderRadius?: string;
  fullWidth?: boolean;
  align?: string;
  showClear?: boolean;
};

const SearchBarBlockRender: React.FC<Props> = ({
  placeholder,
  variant,
  color,
  size,
  bgColor,
  borderRadius,
  fullWidth,
  align,
  showClear,
}) => {
  const [value, setValue] = useState('');
  return (
    <Box sx={{ display: 'flex', justifyContent: align || 'flex-start', p: '1px' }}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || 'Tìm kiếm...'}
        variant={variant || 'outlined'}
        color={color || 'primary'}
        size={size || 'small'}
        fullWidth={fullWidth ?? true}
        sx={{
          maxWidth: fullWidth ? undefined : 400,
          bgcolor: bgColor || undefined,
          '& .MuiOutlinedInput-root': { borderRadius: borderRadius || '8px' },
          '& .MuiFilledInput-root': { borderRadius: borderRadius || '8px' },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize={size === 'medium' ? 'medium' : 'small'} color={color || 'primary'} />
              </InputAdornment>
            ),
            endAdornment: showClear && value ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setValue('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />
    </Box>
  );
};

export const SearchBarBlockConfig = {
  label: 'Search Bar',
  fields: {
    placeholder: { type: 'text' as const, label: 'Placeholder' },
    variant: {
      type: 'select' as const,
      label: 'Kiểu viền',
      options: [
        { label: 'Outlined (viền)', value: 'outlined' },
        { label: 'Filled (nền đặc)', value: 'filled' },
        { label: 'Standard (gạch dưới)', value: 'standard' },
      ],
    },
    color: {
      type: 'select' as const,
      label: 'Màu accent',
      options: [
        { label: 'Primary (xanh dương)', value: 'primary' },
        { label: 'Secondary (tím)', value: 'secondary' },
        { label: 'Success (xanh lá)', value: 'success' },
        { label: 'Warning (cam)', value: 'warning' },
        { label: 'Error (đỏ)', value: 'error' },
        { label: 'Info (xanh nhạt)', value: 'info' },
      ],
    },
    size: {
      type: 'select' as const,
      label: 'Kích thước',
      options: [
        { label: 'Nhỏ (small)', value: 'small' },
        { label: 'Vừa (medium)', value: 'medium' },
      ],
    },
    bgColor: { type: 'text' as const, label: 'Màu nền (HEX / rgba)' },
    borderRadius: { type: 'text' as const, label: 'Bo góc (vd: 4px, 24px)' },
    fullWidth: {
      type: 'select' as const,
      label: 'Độ rộng',
      options: [
        { label: 'Full width', value: 'true' },
        { label: 'Cố định (max 400px)', value: 'false' },
      ],
    },
    align: {
      type: 'select' as const,
      label: 'Căn vị trí',
      options: [
        { label: 'Trái', value: 'flex-start' },
        { label: 'Giữa', value: 'center' },
        { label: 'Phải', value: 'flex-end' },
      ],
    },
    showClear: {
      type: 'select' as const,
      label: 'Nút xóa nội dung',
      options: [
        { label: 'Có', value: 'true' },
        { label: 'Không', value: 'false' },
      ],
    },
  },
  defaultProps: {
    placeholder: 'Tìm kiếm...',
    variant: 'outlined',
    color: 'primary',
    size: 'small',
    bgColor: '',
    borderRadius: '8px',
    fullWidth: true,
    align: 'flex-start',
    showClear: true,
  },
  render: (props: Props) => <SearchBarBlockRender {...props} />,
};
