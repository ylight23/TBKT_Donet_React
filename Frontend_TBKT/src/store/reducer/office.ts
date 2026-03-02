import officeApi from '../../apis/officeApi';
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import notify from "../../utils/notification";
import type { Office } from '../../grpc/generated/Office_pb';
import { serializeProtoObject } from '../../utils/serializeProto';

export interface OfficeWithIndex extends Office {
    index: number;
}

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
            const data = await officeApi.getListOffices({
                parentID: '',
                loadAll: true,
                inIDs: [],
                searchText: '',
            });

            let list: OfficeWithIndex[] = [];

            if (Array.isArray(data) && data.length > 0) {
                list = data.map((item: Office, index: number) =>
                    serializeProtoObject({
                        ...item,
                        index: index + 1,
                        id: item.id || (item as any).Id,
                    })
                );
            }

            return list;
        } catch (error) {
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
            return serializeProtoObject(data);
        } catch (error) {
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
            return serializeProtoObject(data);
        } catch (error) {
            notify.error('Cập nhật đơn vị thất bại');
            return rejectWithValue((error as Error).message);
        }
    }
)

export const deleteApi = createAsyncThunk<unknown, string, { rejectValue: string }>(
    "office/delete",
    async (body, { rejectWithValue }) => {
        try {
            const data = await officeApi.delete(body);
            notify.success('Xóa đơn vị thành công');
            return serializeProtoObject(data);
        } catch (error) {
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
            .addCase(fetchOffice.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOffice.fulfilled, (state, action: PayloadAction<OfficeWithIndex[]>) => {
                state.loading = false;
                state.officeApi = action.payload;
                state.error = null;
            })
            .addCase(fetchOffice.rejected, (state, action) => {
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

export const { resetState } = officeSlice.actions;
export default officeSlice.reducer;
