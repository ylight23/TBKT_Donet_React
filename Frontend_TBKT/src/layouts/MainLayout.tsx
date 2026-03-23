import React, { Suspense } from 'react';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Outlet } from 'react-router-dom';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { ColorModeContext, useMode } from '../theme';
import bgImage from '../assets/background.png';

const Topbar = React.lazy(() => import('../pages/global/Topbar'));
const Sidebar = React.lazy(() => import('../pages/global/Sidebar'));
const AppHeader = React.lazy(() => import('../pages/global/AppHeader'));

function InnerLayout(): React.ReactElement {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const headerFallback = <div style={{ height: 56 }} />;
    const sidebarFallback = <div style={{ width: 80, flexShrink: 0 }} />;
    const topbarFallback = <div style={{ height: 48 }} />;

    return (
        <ProSidebarProvider>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
                <Suspense fallback={headerFallback}>
                    <AppHeader />
                </Suspense>
                <div className="app" style={{ flex: 1, overflow: 'hidden' }}>
                    <Suspense fallback={sidebarFallback}>
                        <Sidebar />
                    </Suspense>
                    <main className="content" style={{ position: 'relative', overflowY: 'auto', height: '100%' }}>
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
                                filter: isDark ? 'brightness(1.2)' : 'contrast(1)',
                                pointerEvents: 'none',
                            }}
                        />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <Suspense fallback={topbarFallback}>
                                    <Topbar />
                                </Suspense>
                            </div>
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
