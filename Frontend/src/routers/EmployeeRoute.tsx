import React from 'react';
import { RouteObject } from 'react-router-dom';
import Employee from "../pages/Employee";
import MainLayout from "../layouts/MainLayout";

const EmployeeRoute: RouteObject = {
    path: "/employee",
    element: <MainLayout />,
    children: [
        {
            path: "",
            element: <Employee />
        }
    ]
};

export default EmployeeRoute;
