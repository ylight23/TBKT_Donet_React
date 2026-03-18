import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PhanHePermission {
    maPhanHe: string;
    duocTruyCap: boolean;
    duocQuanTri: boolean;
}

export interface ChucNangPermission {
    maChucNang: string;
    maPhanHe: string;
    actions: Record<string, boolean>;
}

export interface PermissionState {
    phanHe: PhanHePermission[];
    chucNang: ChucNangPermission[];
    scopeType: string;
    anchorNodeId: string;
    nganhDocIds: string[];
    loaded: boolean;
}

const initialState: PermissionState = {
    phanHe: [],
    chucNang: [],
    scopeType: '',
    anchorNodeId: '',
    nganhDocIds: [],
    loaded: false,
};

const permissionSlice = createSlice({
    name: 'permission',
    initialState,
    reducers: {
        setPermissions: (state, action: PayloadAction<Omit<PermissionState, 'loaded'>>) => {
            state.phanHe      = action.payload.phanHe;
            state.chucNang    = action.payload.chucNang;
            state.scopeType   = action.payload.scopeType;
            state.anchorNodeId = action.payload.anchorNodeId;
            state.nganhDocIds = action.payload.nganhDocIds;
            state.loaded      = true;
        },
        clearPermissions: () => initialState,
    },
});

export const { setPermissions, clearPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
