import React from 'react';
import { ColorModeContext, useMode } from "../theme";
import { ThemeProvider, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Outlet } from "react-router-dom";
import Topbar from "../pages/global/Topbar";
import Sidebar from "../pages/global/Sidebar";
import AppHeader from "../pages/global/AppHeader";
import { ProSidebarProvider } from "react-pro-sidebar";
import bgImage from "../assets/background.png";

// ── InnerLayout: tách riêng để dùng useTheme bên trong ThemeProvider ──
function InnerLayout(): React.ReactElement {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <ProSidebarProvider>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
                <AppHeader />
                <div className="app" style={{ flex: 1, overflow: 'hidden' }}>
                    <Sidebar />
                    <main className="content" style={{ position: 'relative', overflowY: 'auto', height: '100%' }}>

                        {/* ── Lớp ảnh nền — tách biệt, không ảnh hưởng nội dung ── */}
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 0,
                                backgroundImage: `url(${bgImage})`,
                                backgroundColor: '#F4F7F4',
                                backgroundBlendMode: isDark ? 'overlay' : 'multiply',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                opacity: isDark ? 0.3 : 0.8,
                                filter: isDark
                                    ? 'brightness(1.2)'
                                    : 'contrast(1)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* ── Nội dung nằm trên lớp ảnh ── */}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <Topbar />
                            <Outlet />
                        </div>

                    </main>
                </div>
            </div>
        </ProSidebarProvider>
    );
}

export default function MainLayout(): React.ReactNode {
    const [theme, colorMode] = useMode();

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <InnerLayout />
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}
