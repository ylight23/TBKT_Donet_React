import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ChuyenNganhAccessEntry } from '../../types/permission';

export interface PhanHePermission {
    maPhanHe: string;
    duocTruyCap: boolean;
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
    visibleCNs: string[];
    actionsPerCn: ChuyenNganhAccessEntry[];
    loaded: boolean;
}

const initialState: PermissionState = {
    phanHe: [],
    chucNang: [],
    scopeType: '',
    anchorNodeId: '',
    visibleCNs: [],
    actionsPerCn: [],
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
            state.visibleCNs = action.payload.visibleCNs;
            state.actionsPerCn = action.payload.actionsPerCn;
            state.loaded      = true;
        },
        clearPermissions: () => initialState,
    },
});

export const { setPermissions, clearPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
