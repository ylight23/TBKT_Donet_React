import { configureStore } from '@reduxjs/toolkit';
import reducers from './reducer';

export const store = configureStore({
    reducer: reducers
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { dispatch } = store;
