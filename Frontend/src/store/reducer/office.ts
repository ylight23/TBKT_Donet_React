import officeApi, { DeleteBody } from '../../apis/officeApi';
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import notify from "../../utils/notification";
import type { Office } from '../../grpc/generated/Office_pb';
///import { unwrapArray } from '../../utils/protobufUnwrap';


// Input: OfficeBody, EmployeeBody (plain object)
// Output: Office, Employee (buf Message)
// rejectValue: đặt ở generic thứ 3

// Extended Office type with index for DataGrid
export interface OfficeWithIndex extends Office {
    index: number;
}

// State interface
export interface OfficeState {
    officeApi: OfficeWithIndex[];
    loading: boolean;
    error: string | null;
}

const initialState: OfficeState = {
    officeApi: [],
    loading: false,
    error: null,
}

export const fetchOffice = createAsyncThunk<OfficeWithIndex[], void, { rejectValue: string }>(
    "office/fetchOffice",
    async (_, { rejectWithValue }) => {
        try {
            console.log('[fetchOffice thunk] Starting...');
            
            // Call API with proper filters to get all offices
            const data = await officeApi.getListOffices({
                parentID: '',
                loadAll: true,
                inIDs: [],
                searchText: '',
            });
            
            console.log('[fetchOffice thunk] Raw data from API:', data);
            console.log('[fetchOffice thunk] Is array?', Array.isArray(data));
            console.log('[fetchOffice thunk] Length:', Array.isArray(data) ? data.length : 'N/A');
            
            let list: OfficeWithIndex[] = [];
            
            if (Array.isArray(data) && data.length > 0) {
                // Unwrap protobuf wrapper types before mapping
                //const Data = unwrapArray<Office>(data);
                
                list = data.map((item: Office, index: number) => {
                    return {
                        index: index + 1,
                        ...item,
                        id: item.id || (item as any).Id,
                    };
                });
                console.log('[fetchOffice thunk] Processed list with', list.length, 'items');
            } else {
                console.warn('[fetchOffice thunk] Data is not array or empty:', data);
            }
            
            return list;
        } catch (error) {
            console.error('[fetchOffice thunk] Error:', error);
            notify.error('Lỗi khi tải danh sách đơn vị');
            return rejectWithValue((error as Error).message);
        }
    }
)

export const create = createAsyncThunk<Office, Office, { rejectValue: string }>(
    "office/create",
    async (body, { rejectWithValue }) => {
        try {
            const data = await officeApi.create(body);
            notify.success('Thêm đơn vị thành công');
            return data;
        } catch (error) {
            console.error('Error creating office:', error);
            notify.error('Thêm đơn vị thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)

export const update = createAsyncThunk<Office, Office, { rejectValue: string }>(
    "office/update",
    async (body, { rejectWithValue }) => {
        try {
            const data = await officeApi.update(body);
            notify.success('Cập nhật đơn vị thành công');
            return data;
        } catch (error) {
            console.error('Error updating office:', error);
            notify.error('Cập nhật đơn vị thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)



export const deleteApi = createAsyncThunk<unknown, string , { rejectValue: string }>(
    "office/delete",
    async (body, { rejectWithValue }) => {
        try {
            const data = await officeApi.delete(body);
            notify.success('Xóa đơn vị thành công');
            return data;
        } catch (error) {
            console.error('Error deleting office:', error);
            notify.error('Xóa đơn vị thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)

const officeSlice = createSlice({
    name: "office",
    initialState,
    reducers: {
        resetState: (state) => {
            state.officeApi = [];
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch offices
            .addCase(fetchOffice.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOffice.fulfilled, (state, action: PayloadAction<OfficeWithIndex[]>) => {
                state.loading = false;
                state.officeApi = action.payload;
                state.error = null;
                console.log('[office reducer] Set state.officeApi with', action.payload.length, 'items');
            })
            .addCase(fetchOffice.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? null;
                console.error('[office reducer] Fetch failed:', state.error);
            })
            // Create office
            .addCase(create.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(create.fulfilled, (state) => {
                state.loading = false;
                state.error = null;
            })
            .addCase(create.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? null;
            })
            // Update office
            .addCase(update.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(update.fulfilled, (state) => {
                state.loading = false;
                state.error = null;
            })
            .addCase(update.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? null;
            })
            // Delete office
            .addCase(deleteApi.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteApi.fulfilled, (state) => {
                state.loading = false;
                state.error = null;
            })
            .addCase(deleteApi.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? null;
            });
    }
})

export const { resetState } = officeSlice.actions;
export default officeSlice.reducer;