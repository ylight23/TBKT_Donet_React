import React, { Suspense, useMemo } from 'react';
import { RouteObject, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { PageSkeleton } from '../components/Skeletons';
import { permissionManifest } from '../config/permissionManifest';
import { useMyPermissions } from '../hooks/useMyPermissions';
import { useDynamicMenuConfig } from '../hooks/useDynamicMenuConfig';

const MainLayout = React.lazy(() => import('../layouts/MainLayout'));
const Dashboard = React.lazy(() => import('../pages/dashboard'));
const Employee = React.lazy(() => import('../pages/Employee'));
const Office = React.lazy(() => import('../pages/Office'));
const TrangBiNhom1 = React.lazy(() => import('../pages/TrangBiNhom1'));
const TrangBiNhom2 = React.lazy(() => import('../pages/TrangBiNhom2'));
const NhomDongBo = React.lazy(() => import('../pages/NhomDongBo'));
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
const DanhMucTrangBi = React.lazy(() => import('../pages/DanhMucTrangBi'));

const loadingSpinner = (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
    </Box>
);

type LazyPage = React.LazyExoticComponent<React.ComponentType<any>>;

const flattenStaticMenuPermissions = () => {
    const map = new Map<string, string[]>();

    const visit = (items: typeof permissionManifest.staticMenus) => {
        items.forEach((item) => {
            if (item.path) {
                const pathname = item.path.split('?')[0];
                const current = map.get(pathname) ?? [];
                map.set(pathname, [...new Set([...current, ...(item.permissionCodes ?? [])])]);
            }
            if (item.children?.length) {
                visit(item.children);
            }
        });
    };

    visit(permissionManifest.staticMenus);
    return map;
};

const staticRoutePermissionMap = flattenStaticMenuPermissions();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useAuth();

    if (auth.isLoading || auth.activeNavigator) {
        return loadingSpinner;
    }

    if (!auth.isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

const PermissionDenied: React.FC = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" px={3}>
        <Box maxWidth={520} width="100%">
            <Alert severity="warning" sx={{ mb: 2 }}>
                Bạn không có quyền truy cập đường dẫn này.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nếu bạn vừa được cấp quyền, hãy tải lại trang để cập nhật.
            </Typography>
            <Box display="flex" gap={1}>
                <Button variant="contained" onClick={() => window.location.reload()}>
                    Tải lại trang
                </Button>
                <Button variant="outlined" href="/">
                    Về trang chủ
                </Button>
            </Box>
        </Box>
    </Box>
);

const ManifestRouteGuard: React.FC<{
    children: React.ReactNode;
    staticCodes?: string[];
    dynamicMenu?: boolean;
}> = ({ children, staticCodes, dynamicMenu = false }) => {
    const location = useLocation();
    const { menuId = '' } = useParams();
    const { canFunc, isAdmin, loaded: permLoaded } = useMyPermissions();
    const { items: dynamicMenuItems, loading: dynamicMenuLoading } = useDynamicMenuConfig();

    const requiredCodes = useMemo(() => {
        if (staticCodes && staticCodes.length > 0) return staticCodes;
        const pathname = location.pathname.split('?')[0];
        return staticRoutePermissionMap.get(pathname) ?? [];
    }, [location.pathname, staticCodes]);

    const dynamicMenuPermissionCode = useMemo(() => {
        if (!dynamicMenu) return '';
        const pathname = location.pathname.split('?')[0];
        const matchedMenu = dynamicMenuItems.find((item) => item.path === pathname)
            ?? dynamicMenuItems.find((item) => pathname.startsWith('/menu-dong/') && item.id === menuId);
        return matchedMenu?.permissionCode || '';
    }, [dynamicMenu, dynamicMenuItems, location.pathname, menuId]);

    if (!permLoaded || (dynamicMenu && dynamicMenuLoading)) {
        return loadingSpinner;
    }

    if (isAdmin) {
        return <>{children}</>;
    }

    if (dynamicMenuPermissionCode) {
        return canFunc(dynamicMenuPermissionCode, 'view') ? <>{children}</> : <PermissionDenied />;
    }

    if (requiredCodes.length > 0) {
        const matched = requiredCodes.some((code) => canFunc(code, 'view'));
        if (!matched) {
            console.warn('[ManifestRouteGuard] Permission denied for route', {
                pathname: location.pathname,
                requiredCodes,
            });
        }
        return matched ? <>{children}</> : <PermissionDenied />;
    }

    return <>{children}</>;
};

const routeElement = (
    Component: LazyPage,
    options?: {
        staticCodes?: string[];
        dynamicMenu?: boolean;
    },
): React.ReactElement => {
    const page = (
        <Suspense fallback={<PageSkeleton />}>
            <Component />
        </Suspense>
    );

    return (
        <ManifestRouteGuard staticCodes={options?.staticCodes} dynamicMenu={options?.dynamicMenu}>
            {page}
        </ManifestRouteGuard>
    );
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
        { path: '/nhom-dong-bo', element: routeElement(NhomDongBo) },
        { path: '/tinh-trang-ky-thuat', element: routeElement(TinhTrangKyThuat) },
        { path: '/quan-ly-ky-thuat', element: <Navigate to="/bao-duong" replace /> },
        { path: '/quan-ly-ky-thuat/bao-quan', element: <Navigate to="/bao-quan" replace /> },
        { path: '/quan-ly-ky-thuat/bao-duong', element: <Navigate to="/bao-duong" replace /> },
        { path: '/quan-ly-ky-thuat/sua-chua', element: <Navigate to="/sua-chua" replace /> },
        { path: '/quan-ly-ky-thuat/niem-cat', element: <Navigate to="/niem-cat" replace /> },
        { path: '/quan-ly-ky-thuat/dieu-dong', element: <Navigate to="/dieu-dong" replace /> },
        { path: '/bao-quan', element: routeElement(BaoQuan, { staticCodes: ['trangbilog.bao_quan'] }) },
        { path: '/bao-duong', element: routeElement(BaoDuong, { staticCodes: ['trangbilog.bao_duong'] }) },
        { path: '/sua-chua', element: routeElement(SuaChua, { staticCodes: ['trangbilog.sua_chua'] }) },
        { path: '/niem-cat', element: routeElement(NiemCat, { staticCodes: ['trangbilog.niem_cat'] }) },
        { path: '/dieu-dong', element: routeElement(DieuDong, { staticCodes: ['trangbilog.dieu_dong'] }) },
        { path: '/chuyen-cap-chat-luong', element: routeElement(ChuyenCapChatLuong) },
        { path: '/thong-ke-bao-cao', element: routeElement(ThongKeBaoCao) },
        { path: '/cau-hinh-tham-so', element: routeElement(CauHinhThamSo, { staticCodes: staticRoutePermissionMap.get('/cau-hinh-tham-so') }) },
        { path: '/cau-hinh-menu', element: routeElement(CauHinhMenu, { staticCodes: staticRoutePermissionMap.get('/cau-hinh-menu') }) },
        { path: '/cau-hinh-data-source', element: routeElement(CauHinhDataSource, { staticCodes: staticRoutePermissionMap.get('/cau-hinh-data-source') }) },
        { path: '/cau-hinh-template', element: routeElement(CauHinhTemplate, { staticCodes: staticRoutePermissionMap.get('/cau-hinh-template') }) },
        { path: '/menu-dong/:menuId', element: routeElement(MenuDong, { dynamicMenu: true }) },
        { path: '/danh-muc-trang-bi', element: routeElement(DanhMucTrangBi) },
        { path: '/phan-quyen', element: routeElement(PhanQuyen, { staticCodes: staticRoutePermissionMap.get('/phan-quyen') }) },
        { path: '/employee', element: routeElement(Employee, { staticCodes: ['employee.view'] }) },
        { path: '/office', element: routeElement(Office, { staticCodes: ['office.view'] }) },
        { path: '*', element: routeElement(MenuDong, { dynamicMenu: true }) },
    ],
};

export default MainRoute;
