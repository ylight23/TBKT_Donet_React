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
const Dashboard            = React.lazy(() => import('../pages/dashboard'));
const Employee             = React.lazy(() => import('../pages/Employee'));
const Office               = React.lazy(() => import('../pages/Office'));
// Trang bị kỹ thuật
const TrangBiNhom1         = React.lazy(() => import('../pages/TrangBiNhom1'));
const TrangBiNhom2         = React.lazy(() => import('../pages/TrangBiNhom2'));
// Quản lý kỹ thuật
const TinhTrangKyThuat     = React.lazy(() => import('../pages/TinhTrangKyThuat'));
const BaoQuan              = React.lazy(() => import('../pages/BaoQuan'));
const BaoDuong             = React.lazy(() => import('../pages/BaoDuong'));
const SuaChua              = React.lazy(() => import('../pages/SuaChua'));
const NiemCat              = React.lazy(() => import('../pages/NiemCat'));
// Quản lý khác
const DieuDong             = React.lazy(() => import('../pages/DieuDong'));
const ChuyenCapChatLuong   = React.lazy(() => import('../pages/ChuyenCapChatLuong'));
const ThongKeBaoCao        = React.lazy(() => import('../pages/ThongKeBaoCao'));
const CauHinhThamSo        = React.lazy(() => import('../pages/CauHinhThamSo'));

// ── Hoisted static JSX (Rule: hoist-jsx) ──────────────────────────────────────
const loadingSpinner = (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
    </Box>
);

// ── Auth guard ─────────────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth            = useAuth();
    const isAuthenticated = useSelector((s: RootState) => s.authReducer.isAuthenticated);

    // Đang loading hoặc OIDC đang xử lý (silent renew, ...) → spinner, không redirect
    if (auth.isLoading || auth.activeNavigator) {
        return loadingSpinner;
    }

    // Chỉ redirect khi CẢ HAI đều false
    if (!auth.isAuthenticated && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

// ── Routes ─────────────────────────────────────────────────────────────────────
const MainRoute: RouteObject = {
    path: "/",
    // Wrap MainLayout bằng PrivateRoute
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
        // ── Trang bị kỹ thuật ─────────────────────────────────────────────
        {
            path: "/trang-bi-nhom-1",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <TrangBiNhom1 />
                </Suspense>
            )
        },
        {
            path: "/trang-bi-nhom-2",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <TrangBiNhom2 />
                </Suspense>
            )
        },
        // ── Quản lý kỹ thuật ──────────────────────────────────────────────
        {
            path: "/tinh-trang-ky-thuat",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <TinhTrangKyThuat />
                </Suspense>
            )
        },
        {
            path: "/bao-quan",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <BaoQuan />
                </Suspense>
            )
        },
        {
            path: "/bao-duong",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <BaoDuong />
                </Suspense>
            )
        },
        {
            path: "/sua-chua",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <SuaChua />
                </Suspense>
            )
        },{
            path: "/niem-cat",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <NiemCat />
                </Suspense>
            )
        },
        // ── Quản lý khác ──────────────────────────────────────────────────
        {
            path: "/dieu-dong",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <DieuDong />
                </Suspense>
            )
        },
        {
            path: "/chuyen-cap-chat-luong",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <ChuyenCapChatLuong />
                </Suspense>
            )
        },
        {
            path: "/thong-ke-bao-cao",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <ThongKeBaoCao />
                </Suspense>
            )
        },
        {
            path: "/cau-hinh-tham-so",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <CauHinhThamSo />
                </Suspense>
            )
        },
        // ── Legacy routes ─────────────────────────────────────────────────
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
