import React, { Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import AuthLayout from "../layouts/AuthLayout";
import { PageSkeleton } from '../components/Skeletons';

// ── Lazy load ──────────────────────────────────────────────────────────────────
const Login              = React.lazy(() => import('../pages/auth/login'));
const FrontChannelLogout = React.lazy(() => import('../pages/auth/frontchannel-logout'));

const AuthRoute: RouteObject = {
    path: '/',
    element: <AuthLayout />,
    children: [
        {
            path: "login",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <Login />
                </Suspense>
            )
        },
        {
            path: "frontchannel-logout",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <FrontChannelLogout />
                </Suspense>
            )
        }
    ]
};

export default AuthRoute;
