import { alpha, Theme } from '@mui/material/styles';

const getAltBackground = (theme: Theme): string =>
    theme.palette.mode === 'dark'
        ? alpha(theme.palette.success.light, 0.12)
        : '#f3fbf4';

const getHoverBackground = (theme: Theme): string =>
    theme.palette.mode === 'dark'
        ? alpha(theme.palette.success.light, 0.18)
        : '#e6f6e9';

export const getStripedRowBackground = (theme: Theme, index: number): string =>
    index % 2 === 1 ? getAltBackground(theme) : theme.palette.background.paper;

export const getStripedHoverBackground = (theme: Theme): string =>
    getHoverBackground(theme);

export const getStripedRowSx = (theme: Theme, index: number, isSelected = false) => ({
    bgcolor: isSelected
        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12)
        : getStripedRowBackground(theme, index),
    '&:hover': {
        bgcolor: isSelected
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.18)
            : getStripedHoverBackground(theme),
    },
});
