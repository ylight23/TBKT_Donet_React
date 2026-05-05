import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { gradientGreen, militaryGold } from '../../theme';
import logoSrc from '../../assets/logo_TCKT.png';

const AppHeader: React.FC = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            component="header"
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 3,
                py: 1.25,
                // ── 30% gradient green đổi theo mode ──
                // background: isDark
                //     ? gradientGreen.darkHeader
                //     : gradientGreen.lightHeader,
                background: '#2E7D32',
                // borderBottom: `2px solid ${militaryGold[500]}`,
                boxShadow: isDark
                    ? '0 2px 16px rgba(0,0,0,0.50)'
                    : '0 2px 12px rgba(46,125,50,0.25)',
                flexShrink: 0,
                zIndex: 1200,
                position: 'relative',
                transition: 'background 0.3s ease',
            }}
        >
            {/* Logo */}
            <Box
                component="img"
                src={logoSrc}
                alt="Logo Hệ Sinh Thái Số Ngành"
                sx={{
                    height: 52,
                    width: 52,
                    objectFit: 'contain',
                    flexShrink: 0,
                    filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.4))',
                }}
            />

            {/* Gold divider dọc */}
            <Box
                sx={{
                    width: '2px',
                    height: 44,
                    background: `linear-gradient(180deg, transparent, ${militaryGold[400]}, transparent)`,
                    flexShrink: 0,
                }}
            />

            {/* Text block */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography
                    component="h1"
                    sx={{
                        fontSize: { xs: '0.85rem', sm: '1rem', md: '1.15rem' },
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        // Gold accent — luôn nổi trên nền green
                        color: militaryGold[300],
                        lineHeight: 1.25,
                        textTransform: 'uppercase',
                        fontFamily: 'inherit',
                        textShadow: '0 1px 6px rgba(0,0,0,0.45)',
                    }}
                >
                    Hệ Sinh Thái Số Ngành 
                </Typography>
                <Typography
                    component="p"
                    sx={{
                        fontSize: { xs: '0.7rem', sm: '0.78rem', md: '0.85rem' },
                        fontWeight: 400,
                        color: 'rgba(255,255,255,0.85)',
                        letterSpacing: '0.04em',
                        lineHeight: 1.4,
                        fontFamily: 'inherit',
                        mt: 0.25,
                    }}
                >
                    Chuyên sâu TBKT ngành Thông tin
                </Typography>
            </Box>
        </Box>
    );
};

export default AppHeader;
