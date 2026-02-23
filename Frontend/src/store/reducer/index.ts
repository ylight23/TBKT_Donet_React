import { combineReducers } from '@reduxjs/toolkit';

import employeeReducer from './employee';
import officeReducer from './office';
import authReducer from '../authReducer/auth';

const reducers = combineReducers({
    employeeReducer,
    officeReducer,
    authReducer,
    // dummy: (state = {}) => state
});

export default reducers;
