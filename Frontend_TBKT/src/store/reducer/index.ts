import { combineReducers } from '@reduxjs/toolkit';

import employeeReducer from './employee';
import officeReducer from './office';
import authReducer from '../authReducer/auth';
import thamSoReducer from './thamSo';
import permissionReducer from './permissionReducer';
import templateRuntimeActionReducer from './templateRuntimeAction';

const reducers = combineReducers({
    employeeReducer,
    officeReducer,
    authReducer,
    thamSoReducer,
    permissionReducer,
    templateRuntimeActionReducer,
    // dummy: (state = {}) => state
});

export default reducers;
