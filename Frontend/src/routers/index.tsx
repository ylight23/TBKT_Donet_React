import React from 'react';
import { useRoutes, RouteObject } from 'react-router-dom';

import MainRoute from './MainRoute';
import AuthRoute from './AuthRoute';
import EmployeeRoute from './EmployeeRoute';
import OfficeRoute from './OfficeRoute';

export default function ThemeRoutes(): React.ReactElement | null {
   return useRoutes([MainRoute, AuthRoute, EmployeeRoute, OfficeRoute] as RouteObject[]);
}
