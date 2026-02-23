import React from 'react';
import { RouteObject } from 'react-router-dom';
import MilitaryUnits from "../pages/Office";
import MainLayout from "../layouts/MainLayout";

const OfficeRoute: RouteObject = {
    path: "/office",
    element: <MainLayout />,
    children: [
        {
            path: "",
            element: <MilitaryUnits />
        }
    ]
};

export default OfficeRoute;
