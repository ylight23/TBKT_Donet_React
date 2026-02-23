import employeeApi from '../../apis/employeeApi';
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import notify from "../../utils/notification";
//import { Employee } from '../../types';

import type { Employee } from '../../grpc/generated/Employee_pb';

// Extended Employee type with index for DataGrid
export interface EmployeeWithIndex extends Employee {
    index: number;
}


// Input: OfficeBody, EmployeeBody (plain object)
// Output: Office, Employee (buf Message)
// rejectValue: đặt ở generic thứ 3

// State interface
export interface EmployeeState {
    employeeApi: EmployeeWithIndex[];
    loading: boolean;
    error: string | null;
}

const initialState: EmployeeState = {
    employeeApi: [],
    loading: false,
    error: null,
}

export const fetchEmployee = createAsyncThunk<EmployeeWithIndex[], void, { rejectValue: string }>(
    "employee/fetchEmployee",
    async (_, { rejectWithValue }) => {
        try {
            console.log('[fetchEmployee thunk] Starting...');

            // Call API with null to use default parameters
            const data = await employeeApi.getListEmployees(null);

            console.log('[fetchEmployee thunk] Raw data from API:', data);
            console.log('[fetchEmployee thunk] Is array?', Array.isArray(data));
            console.log('[fetchEmployee thunk] Length:', Array.isArray(data) ? data.length : 'N/A');

            let list: EmployeeWithIndex[] = [];

            // data is already an array from employeeApi
            if (!Array.isArray(data)) return [];

            list = data.map((item, idx: number) => {
                return {
                    index: idx + 1,
                    ...item,
                    id: item.id || (item as any).Id,
                };
            });
            console.log('[fetchEmployee thunk] Processed list with', list.length, 'items');
            return list;
        }


        catch (error) {
            console.error('[fetchEmployee thunk] Error:', error);
            notify.error('Lỗi khi tải danh sách nhân viên');
            return rejectWithValue((error as Error).message);
        }
    }
)

export const create = createAsyncThunk<Employee, Employee, { rejectValue: string }>(
    "employee/create",
    async (body, { rejectWithValue }) => {
        try {
            const data = await employeeApi.create(body);
            
            notify.success('Thêm nhân viên thành công');
            return data;
        } catch (error) {
            console.error('Error creating employee:', error);
            notify.error('Thêm nhân viên thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)

export const update = createAsyncThunk<Employee, Employee, { rejectValue: string }>(
    "employee/update",
    async (body, { rejectWithValue }) => {
        try {
            const data = await employeeApi.update(body);
            //const unwrappedData = unwrapArray<Employee>([data])[0];
            notify.success('Cập nhật nhân viên thành công');
            return data;
        } catch (error) {
            console.error('Error updating employee:', error);
            notify.error('Cập nhật nhân viên thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)

interface DeleteBody {
    id?: string;
    ids?: string[];
}

export const deleteApi = createAsyncThunk<unknown, DeleteBody, { rejectValue: string }>(
    "employee/delete",
    async (body, { rejectWithValue }) => {
        try {
            const data = await employeeApi.deleteApi(body);
            notify.success('Xóa nhân viên thành công');
            return data;
        } catch (error) {
            console.error('Error deleting employee:', error);
            notify.error('Xóa nhân viên thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)

const employeeSlice = createSlice({
    name: "employee",
    initialState,
    reducers: {
        resetState: (state) => {
            state.employeeApi = [];
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // FETCH
            .addCase(fetchEmployee.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEmployee.fulfilled, (state, action: PayloadAction<EmployeeWithIndex[]>) => {
                state.loading = false;
                state.employeeApi = action.payload;
            })
            .addCase(fetchEmployee.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? null;
            })

            // CREATE
            .addCase(create.fulfilled, (state, action) => {
                state.employeeApi.push({
                    ...action.payload,
                    index: state.employeeApi.length + 1,
                });
            })

            // UPDATE
            .addCase(update.fulfilled, (state, action) => {
                const idx = state.employeeApi.findIndex(e => e.id === action.payload.id);
                if (idx !== -1) {
                    state.employeeApi[idx] = {
                        ...state.employeeApi[idx],
                        ...action.payload,
                    };
                }
            })

            // DELETE
            .addCase(deleteApi.fulfilled, (state, action) => {
                const ids = Array.isArray(action.meta.arg.ids)
                    ? action.meta.arg.ids
                    : action.meta.arg.id
                        ? [action.meta.arg.id]
                        : [];

                state.employeeApi = state.employeeApi
                    .filter(e => !ids.includes(e.id!))
                    .map((e, i) => ({ ...e, index: i + 1 }));
            });
    }
});

export default employeeSlice.reducer;