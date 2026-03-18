import { combineReducers } from '@reduxjs/toolkit';

import employeeReducer from './employee';
import officeReducer from './office';
import authReducer from '../authReducer/auth';
import thamSoReducer from './thamSo';
import permissionReducer from './permissionReducer';

const reducers = combineReducers({
    employeeReducer,
    officeReducer,
    authReducer,
    thamSoReducer,
    permissionReducer,
    // dummy: (state = {}) => state
});

export default reducers;
