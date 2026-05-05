import { combineReducers } from '@reduxjs/toolkit';

import employeeReducer from './employee';
import officeReducer from './office';
import thamSoReducer from './thamSo';
import permissionReducer from './permissionReducer';
import templateRuntimeActionReducer from './templateRuntimeAction';
import userReducer from './userReducer';

const reducers = combineReducers({
    employeeReducer,
    officeReducer,
    thamSoReducer,
    permissionReducer,
    templateRuntimeActionReducer,
    userReducer,
    // dummy: (state = {}) => state
});

export default reducers;
