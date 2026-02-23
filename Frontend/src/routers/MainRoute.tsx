import React from 'react';
import { RouteObject } from 'react-router-dom';
import Dashboard from "../pages/dashboard";
import MainLayout from "../layouts/MainLayout";
import Employee from "../pages/Employee";
import Office from "../pages/Office";

const MainRoute: RouteObject = {
    path: "/",
    element: <MainLayout />,
    children: [
        {
            path: "",
            element: <Dashboard />
        },
        {
            path: "/employee",
            element: <Employee />
        },
        {
            path: "/office",
            element: <Office />
        },
    ]
};

export default MainRoute;
