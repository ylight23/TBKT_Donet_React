import React, { Suspense } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import { useAuth }         from 'react-oidc-context';
import { useSelector }     from 'react-redux';
import { RootState }       from '../store';
import CircularProgress    from '@mui/material/CircularProgress';
import Box                 from '@mui/material/Box';
import { PageSkeleton }    from '../components/Skeletons';
import MainLayout          from "../layouts/MainLayout";

// ── Lazy load pages ────────────────────────────────────────────────────────────
const Dashboard = React.lazy(() => import('../pages/dashboard'));
const Employee  = React.lazy(() => import('../pages/Employee'));
const Office    = React.lazy(() => import('../pages/Office'));

// ── Auth guard ─────────────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth            = useAuth();
    const isAuthenticated = useSelector((s: RootState) => s.authReducer.isAuthenticated);

    // ✅ Đang loading hoặc OIDC đang xử lý (silent renew, ...) → spinner, không redirect
    if (auth.isLoading || auth.activeNavigator) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // ✅ Chỉ redirect khi CẢ HAI đều false
    if (!auth.isAuthenticated && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

// ── Routes ─────────────────────────────────────────────────────────────────────
const MainRoute: RouteObject = {
    path: "/",
    // ✅ Wrap MainLayout bằng PrivateRoute
    element: (
        <PrivateRoute>
            <MainLayout />
        </PrivateRoute>
    ),
    children: [
        {
            path: "",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <Dashboard />
                </Suspense>
            )
        },
        {
            path: "/employee",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <Employee />
                </Suspense>
            )
        },
        {
            path: "/office",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <Office />
                </Suspense>
            )
        },
    ]
};

export default MainRoute;
