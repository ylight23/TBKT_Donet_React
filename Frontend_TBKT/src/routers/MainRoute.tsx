import React, { Suspense } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useSelector } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { PageSkeleton } from '../components/Skeletons';
import type { RootState } from '../store';

const MainLayout = React.lazy(() => import('../layouts/MainLayout'));
const Dashboard = React.lazy(() => import('../pages/dashboard'));
const Employee = React.lazy(() => import('../pages/Employee'));
const Office = React.lazy(() => import('../pages/Office'));
const TrangBiNhom1 = React.lazy(() => import('../pages/TrangBiNhom1'));
const TrangBiNhom2 = React.lazy(() => import('../pages/TrangBiNhom2'));
const TinhTrangKyThuat = React.lazy(() => import('../pages/TinhTrangKyThuat'));
const BaoQuan = React.lazy(() => import('../pages/BaoQuan'));
const BaoDuong = React.lazy(() => import('../pages/BaoDuong'));
const SuaChua = React.lazy(() => import('../pages/SuaChua'));
const NiemCat = React.lazy(() => import('../pages/NiemCat'));
const DieuDong = React.lazy(() => import('../pages/DieuDong'));
const ChuyenCapChatLuong = React.lazy(() => import('../pages/ChuyenCapChatLuong'));
const ThongKeBaoCao = React.lazy(() => import('../pages/ThongKeBaoCao'));
const CauHinhThamSo = React.lazy(() => import('../pages/CauHinhThamSo'));
const CauHinhMenu = React.lazy(() => import('../pages/CauHinhMenu'));
const CauHinhDataSource = React.lazy(() => import('../pages/CauHinhDataSource'));
const CauHinhTemplate = React.lazy(() => import('../pages/CauHinhTemplate'));
const MenuDong = React.lazy(() => import('../pages/MenuDong'));
const PhanQuyen = React.lazy(() => import('../pages/PhanQuyen'));

const loadingSpinner = (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
    </Box>
);

type LazyPage = React.LazyExoticComponent<React.ComponentType<any>>;

const routeElement = (Component: LazyPage): React.ReactElement => (
    <Suspense fallback={<PageSkeleton />}>
        <Component />
    </Suspense>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useAuth();
    const isAuthenticated = useSelector((s: RootState) => s.authReducer.isAuthenticated);

    if (auth.isLoading || auth.activeNavigator) {
        return loadingSpinner;
    }

    if (!auth.isAuthenticated && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

const MainRoute: RouteObject = {
    path: '/',
    element: (
        <PrivateRoute>
            <Suspense fallback={<PageSkeleton />}>
                <MainLayout />
            </Suspense>
        </PrivateRoute>
    ),
    children: [
        { path: '', element: routeElement(Dashboard) },
        { path: '/trang-bi-nhom-1', element: routeElement(TrangBiNhom1) },
        { path: '/trang-bi-nhom-2', element: routeElement(TrangBiNhom2) },
        { path: '/tinh-trang-ky-thuat', element: routeElement(TinhTrangKyThuat) },
        { path: '/bao-quan', element: routeElement(BaoQuan) },
        { path: '/bao-duong', element: routeElement(BaoDuong) },
        { path: '/sua-chua', element: routeElement(SuaChua) },
        { path: '/niem-cat', element: routeElement(NiemCat) },
        { path: '/dieu-dong', element: routeElement(DieuDong) },
        { path: '/chuyen-cap-chat-luong', element: routeElement(ChuyenCapChatLuong) },
        { path: '/thong-ke-bao-cao', element: routeElement(ThongKeBaoCao) },
        { path: '/cau-hinh-tham-so', element: routeElement(CauHinhThamSo) },
        { path: '/cau-hinh-menu', element: routeElement(CauHinhMenu) },
        { path: '/cau-hinh-data-source', element: routeElement(CauHinhDataSource) },
        { path: '/cau-hinh-template', element: routeElement(CauHinhTemplate) },
        { path: '/menu-dong/:menuId', element: routeElement(MenuDong) },
        { path: '/phan-quyen', element: routeElement(PhanQuyen) },
        { path: '/employee', element: routeElement(Employee) },
        { path: '/office', element: routeElement(Office) },
        { path: '*', element: routeElement(MenuDong) },
    ],
};

export default MainRoute;
