import React from 'react';
import { useTheme, PaletteMode, Box } from "@mui/material";
import { tokens } from "../../theme";

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

interface GridCardProps {
    xs?: number;
    title?: string;
    content?: string | number;
    icon?: React.ReactNode;
}

const GridCard: React.FC<GridCardProps> = ({ xs, title, content, icon }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode as PaletteMode);

    // Calculate width based on xs prop for a 12-column grid
    const width = xs ? `${(xs / 12) * 100}%` : '100%';

    return (
        <Box sx={{ width, p: 1 }}>
            <Card sx={{ backgroundColor: colors.forestAccent[700] }}>
                <CardContent>
                    <Typography variant="h4" color="common.white" fontWeight="bold">
                        {title ?? 'Loading...'}
                    </Typography>
                    <Typography sx={{ mb: 1.5, margin: "20px 0" }} variant="h4" color="common.white">
                        {content ?? 'Loading...'}
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default GridCard;
