import React, { Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import MainLayout from "../layouts/MainLayout";
import { PageSkeleton } from '../components/Skeletons';

// ── Lazy load ──────────────────────────────────────────────────────────────────
const Office = React.lazy(() => import('../pages/Office'));

const OfficeRoute: RouteObject = {
    path: "/office",
    element: <MainLayout />,
    children: [
        {
            path: "",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <Office />
                </Suspense>
            )
        }
    ]
};

export default OfficeRoute;
