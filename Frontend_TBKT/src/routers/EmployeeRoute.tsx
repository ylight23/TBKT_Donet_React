import React, { Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import MainLayout from "../layouts/MainLayout";
import { PageSkeleton } from '../components/Skeletons';

// ── Lazy load ──────────────────────────────────────────────────────────────────
const Employee = React.lazy(() => import('../pages/Employee'));

const EmployeeRoute: RouteObject = {
    path: "/employee",
    element: <MainLayout />,
    children: [
        {
            path: "",
            element: (
                <Suspense fallback={<PageSkeleton />}>
                    <Employee />
                </Suspense>
            )
        }
    ]
};

export default EmployeeRoute;
