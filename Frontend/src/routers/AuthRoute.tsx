import React from 'react';
import { RouteObject } from 'react-router-dom';
import AuthLayout from "../layouts/AuthLayout";
import Login from "../pages/auth/login";
import FrontChannelLogout from "../pages/auth/frontchannel-logout";

const AuthRoute: RouteObject = {
    path: '/',
    element: <AuthLayout />,
    children: [
        {
            path: "login",
            element: <Login />
        },
        {
            path: "frontchannel-logout",
            element: <FrontChannelLogout />
        }
    ]
};

export default AuthRoute;
