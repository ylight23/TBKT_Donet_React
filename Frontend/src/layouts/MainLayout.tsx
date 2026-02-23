import React, { useEffect } from 'react';
import { ColorModeContext, useMode } from "../theme";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { Navigate, Outlet, useNavigate } from "react-router-dom";

import Topbar from "../pages/global/Topbar";
import Sidebar from "../pages/global/Sidebar";
import { ProSidebarProvider } from "react-pro-sidebar";
import { useSelector } from "react-redux";
import { RootState } from '../store';

import { useAuth } from "react-oidc-context";

export default function MainLayout(): React.ReactNode {
    const [theme, colorMode] = useMode();
    const auth = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate('/login');
        }
    }, [auth.isAuthenticated, auth.isLoading]);

    if (auth.isLoading) {
        return null; // Or a loading spinner
    }

    return (
        auth.isAuthenticated ? (
            <ColorModeContext.Provider value={colorMode}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <ProSidebarProvider>
                        <div className="app">
                            <Sidebar />

                            <main className="content">
                                <Topbar />
                                <Outlet />
                            </main>
                        </div>
                    </ProSidebarProvider>
                </ThemeProvider>
            </ColorModeContext.Provider>
        ) : (
            <Navigate to="/login" />
        )
    );
}
