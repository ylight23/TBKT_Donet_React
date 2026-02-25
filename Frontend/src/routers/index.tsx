import React from 'react';
import { useRoutes, RouteObject } from 'react-router-dom';
import MainRoute from './MainRoute';
import AuthRoute from './AuthRoute';



export default function ThemeRoutes(): React.ReactElement | null {
    
   return useRoutes([MainRoute, AuthRoute] as RouteObject[]);
}
