import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfileState {
    userId: string;
    sub: string;
    username: string;
    preferredUsername: string;
    fullName: string;
    greetingName: string;
    email: string;
    roles: string[];
    loaded: boolean;
}

const initialState: UserProfileState = {
    userId: '',
    sub: '',
    username: '',
    preferredUsername: '',
    fullName: '',
    greetingName: '',
    email: '',
    roles: [],
    loaded: false,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserProfile: (state, action: PayloadAction<Omit<UserProfileState, 'loaded'>>) => {
            state.userId = action.payload.userId;
            state.sub = action.payload.sub;
            state.username = action.payload.username;
            state.preferredUsername = action.payload.preferredUsername;
            state.fullName = action.payload.fullName;
            state.greetingName = action.payload.greetingName;
            state.email = action.payload.email;
            state.roles = action.payload.roles;
            state.loaded = true;
        },
        clearUserProfile: () => initialState,
    },
});

export const { setUserProfile, clearUserProfile } = userSlice.actions;
export default userSlice.reducer;
