import { createSlice } from "@reduxjs/toolkit";
import {
    safeSessionGet,
    safeSessionSet,
    safeSessionRemove,
    removeLocalStorage,
    STORAGE_KEYS,
    MinimalUser,
} from '../../utils';

const initialState = {
    isAuthenticated: safeSessionGet<boolean>(STORAGE_KEYS.IS_AUTHENTICATED) === true,
    currentUser:     safeSessionGet<MinimalUser>(STORAGE_KEYS.CURRENT_USER),
    // KHÔNG load token từ storage → OIDC tự quản lý
    accessToken:     null as string | null,
    idToken:         null as string | null,
    user:            null as any,
    message:         null as string | null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuth: (state, action) => {
            
            state.isAuthenticated = action.payload.isAuthenticated;
            state.accessToken     = action.payload.accessToken;
            state.idToken         = action.payload.idToken;
            state.user            = action.payload.user;

            // Store minimal fields từ currentUser
            if (action.payload.currentUser) {
                const { id, name, username, is_admin } = action.payload.currentUser;
                state.currentUser = { id, name, username, is_admin };
            }

            if (state.isAuthenticated) {
                safeSessionSet(STORAGE_KEYS.IS_AUTHENTICATED, JSON.stringify(true));
                if (state.currentUser) {
                    safeSessionSet(STORAGE_KEYS.CURRENT_USER, JSON.stringify(state.currentUser));
                }
                // KHÔNG lưu accessToken vào storage
            } else {
                safeSessionRemove(STORAGE_KEYS.IS_AUTHENTICATED);
                safeSessionRemove(STORAGE_KEYS.CURRENT_USER);
            }
        },

        logout: (state) => {
            state.isAuthenticated = false;
            state.currentUser     = null;
            state.accessToken     = null;
            state.idToken         = null;
            state.user            = null;
            state.message         = null;
            removeLocalStorage();   // Chỉ xóa keys của app
        },
    },
});

export const { logout, setAuth } = authSlice.actions;
export default authSlice.reducer;
