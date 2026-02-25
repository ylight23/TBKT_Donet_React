import React from 'react';
import { ColorModeContext, useMode } from "../theme";

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline       from '@mui/material/CssBaseline';

import { Outlet } from "react-router-dom";

export default function AuthLayout(): React.ReactElement {
    const [theme, colorMode] = useMode();
    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Outlet />
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}
