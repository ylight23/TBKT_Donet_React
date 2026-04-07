import React from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { TrangBiSpecializationOption } from '../../apis/danhMucTrangBiApi';

interface CnTabBarProps {
    options: TrangBiSpecializationOption[];
    loading: boolean;
    value: string;
    onChange: (cn: string) => void;
}

const CnTabBar: React.FC<CnTabBarProps> = ({ options, loading, value, onChange }) => {
    if (loading) {
        return (
            <Stack direction="row" spacing={1} sx={{ px: 2, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" width={72} height={32} />
                ))}
            </Stack>
        );
    }

    if (options.length === 0) {
        return (
            <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                    Chua co du lieu chuyen nganh tu DanhMucTrangBi.
                </Typography>
            </Box>
        );
    }

    return (
        <Stack
            direction="row"
            spacing={0}
            sx={{ px: 1.5, py: 1.5, flexWrap: 'wrap', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
            {options.map((opt) => (
                <Badge
                    key={opt.id}
                    badgeContent={opt.count > 999 ? '999+' : opt.count}
                    color="primary"
                    sx={{
                        '& .MuiBadge-badge': {
                            fontSize: 9,
                            height: 16,
                            minWidth: 16,
                            top: 4,
                            right: 4,
                        },
                    }}
                >
                    <Chip
                        label={opt.label}
                        onClick={() => onChange(opt.id)}
                        color={value === opt.id ? 'primary' : 'default'}
                        variant={value === opt.id ? 'filled' : 'outlined'}
                        size="small"
                        sx={{ fontWeight: value === opt.id ? 700 : 400 }}
                    />
                </Badge>
            ))}
        </Stack>
    );
};

export default CnTabBar;
