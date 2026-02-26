import React from 'react';
import { Box, Typography, useTheme, PaletteMode } from "@mui/material";
import { tokens } from "../../theme";

interface HeaderProps {
    title: string;
    subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as PaletteMode);

    return (
        <Box mb="30px">
            <Typography
                variant="h2"
                fontWeight="bold"
                sx={{ color: colors.grey[100] }}
            >
                {title}
            </Typography>
            {subtitle && (
                <Typography
                    variant="h5"
                    sx={{ color: colors.greenAccent[400] }}
                >
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
};

export default Header;
