import React from 'react';
import { ColorModeContext, useMode } from "../theme";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Outlet } from "react-router-dom";
import Topbar from "../pages/global/Topbar";
import Sidebar from "../pages/global/Sidebar";
import AppHeader from "../pages/global/AppHeader";
import { ProSidebarProvider } from "react-pro-sidebar";

export default function MainLayout(): React.ReactNode {
    const [theme, colorMode] = useMode();

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <ProSidebarProvider>
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                        <AppHeader />
                        <div className="app" style={{ flex: 1, overflow: 'hidden' }}>
                            <Sidebar />
                            <main className="content">
                                <Topbar />
                                <Outlet />
                            </main>
                        </div>
                    </div>
                </ProSidebarProvider>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}
