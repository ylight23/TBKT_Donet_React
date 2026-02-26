import React from 'react';
import { Box, Typography, useTheme, PaletteMode } from "@mui/material";
import { tokens } from "../../theme";

interface TableHeaderProps {
    title: string;
    subtitle?: string;
}

const TableHeader: React.FC<TableHeaderProps> = ({ title, subtitle }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as PaletteMode);

    return (
        <Box>
            <Typography variant="h2" color={colors.grey[100]} fontWeight="bold">
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="h5" color={colors.greenAccent[400]}>
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
};

export default TableHeader;
