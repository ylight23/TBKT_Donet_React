import employeeApi from '../../apis/employeeApi';
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import notify from "../../utils/notification";
import type { Employee } from '../../grpc/generated/Employee_pb';
import { serializeProtoObject } from '../../utils/serializeProto';

export interface EmployeeWithIndex extends Employee {
    index: number;
}

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
            const data = await employeeApi.getListEmployees({});

            let list: EmployeeWithIndex[] = [];

            if (Array.isArray(data) && data.length > 0) {
                list = data.map((item: Employee, index: number) =>
                    serializeProtoObject({
                        ...item,
                        index: index + 1,
                        id: item.id || (item as any).Id,
                    })
                );
            }

            return list;
        } catch (error) {
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
            return serializeProtoObject(data);
        } catch (error) {
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
            notify.success('Cập nhật nhân viên thành công');
            return serializeProtoObject(data);
        } catch (error) {
            notify.error('Cập nhật nhân viên thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)

export const deleteApi = createAsyncThunk<unknown, Record<string, any>, { rejectValue: string }>(
    "employee/delete",
    async (body, { rejectWithValue }) => {
        try {
            const data = await employeeApi.deleteApi(body);
            notify.success('Xóa nhân viên thành công');
            return serializeProtoObject(data);
        } catch (error) {
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
            .addCase(fetchEmployee.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEmployee.fulfilled, (state, action: PayloadAction<EmployeeWithIndex[]>) => {
                state.loading = false;
                state.employeeApi = action.payload;
                state.error = null;
            })
            .addCase(fetchEmployee.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? null;
            })
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

export const { resetState } = employeeSlice.actions;
export default employeeSlice.reducer;