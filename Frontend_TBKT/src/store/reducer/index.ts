import { combineReducers } from '@reduxjs/toolkit';

import employeeReducer from './employee';
import officeReducer from './office';
import authReducer from '../authReducer/auth';
import thamSoReducer from './thamSo';

const reducers = combineReducers({
    employeeReducer,
    officeReducer,
    authReducer,
    thamSoReducer,
    // dummy: (state = {}) => state
});

export default reducers;
