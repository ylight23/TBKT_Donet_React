import { createSlice } from "@reduxjs/toolkit";
import { getLocalStorage, removeLocalStorage } from '../../utils';



const initialState = {
  currentUser: getLocalStorage('currentUser'),
  permission: getLocalStorage('permission'),
  message: null as string | null,

  isAuthenticated: !!getLocalStorage('isAuthenticated'),
  accessToken: getLocalStorage('_token'),
  idToken: null,
  user: null,

}


const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    setAuth: (state, action) => {
      console.log('[authReducer] setAuth called with:', {
        isAuthenticated: action.payload.isAuthenticated,
        hasAccessToken: !!action.payload.accessToken,
        accessTokenLength: action.payload.accessToken?.length,
        user: action.payload.user
      });

      state.isAuthenticated = action.payload.isAuthenticated;
      state.accessToken = action.payload.accessToken;
      state.idToken = action.payload.idToken;
      state.user = action.payload.user;
      state.currentUser = action.payload.currentUser;

      if (state.isAuthenticated) {
        console.log('[authReducer] Saving to sessionStorage...');
        sessionStorage.setItem('isAuthenticated', 'true');
        if (state.accessToken) {
          sessionStorage.setItem('_token', state.accessToken as string);
          console.log('[authReducer] ✅ Token saved to sessionStorage, length:', (state.accessToken as string).length);
        } else {
          console.warn('[authReducer] ⚠️ No accessToken to save!');
        }
        if (state.currentUser) sessionStorage.setItem('currentUser', JSON.stringify(state.currentUser));
      } else {
        console.log('[authReducer] Not authenticated, removing from sessionStorage');
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('_token');
        sessionStorage.removeItem('currentUser');
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.accessToken = null;
      state.idToken = null;
      state.user = null;
      removeLocalStorage();
    }
  },
});

export const { logout, setAuth } = authSlice.actions;
export default authSlice.reducer;
