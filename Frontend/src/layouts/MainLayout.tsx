import React from 'react';
import { ColorModeContext, useMode } from "../theme";
import { ThemeProvider }  from '@mui/material/styles';
import CssBaseline        from '@mui/material/CssBaseline';
import { Outlet } from "react-router-dom";
import Topbar  from "../pages/global/Topbar";
import Sidebar from "../pages/global/Sidebar";
import { ProSidebarProvider } from "react-pro-sidebar";

export default function MainLayout(): React.ReactNode {
    const [theme, colorMode] = useMode();

    // ✅ Bỏ toàn bộ auth check — đã có PrivateRoute xử lý rồi
    // const auth = useAuth();
    // const isAuthenticated = useSelector(...)
    // if (!auth.isAuthenticated) return <Navigate to="/login" />

    return (
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
    );
}
