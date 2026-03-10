import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { thamSoApi } from '../../api/thamSoApiWithCache';
import type {
    LocalDynamicField,
    LocalFieldSet,
    LocalFormConfig,
} from '../../types/thamSo';

export interface ThamSoSchemaPayload {
    dynamicFields: LocalDynamicField[];
    fieldSets: LocalFieldSet[];
    formConfigs: LocalFormConfig[];
}

interface SaveDynamicFieldPayload {
    tempId: string;
    field: LocalDynamicField;
}

interface SaveFieldSetPayload {
    tempId: string;
    fieldSet: LocalFieldSet;
}

interface SaveFormConfigPayload {
    tempId: string;
    formConfig: LocalFormConfig;
}

export interface ThamSoState {
    dynamicFields: LocalDynamicField[];
    fieldSets: LocalFieldSet[];
    formConfigs: LocalFormConfig[];
    loading: boolean;
    syncing: boolean;
    loaded: boolean;
    error: string | null;
}

const initialState: ThamSoState = {
    dynamicFields: [],
    fieldSets: [],
    formConfigs: [],
    loading: false,
    syncing: false,
    loaded: false,
    error: null,
};

export const fetchThamSoSchema = createAsyncThunk<
    ThamSoSchemaPayload,
    void,
    { rejectValue: string }
>(
    'thamSo/fetchSchema',
    async (_, { rejectWithValue }) => {
        try {
            const [dynamicFields, fieldSets, formConfigs] = await Promise.all([
                thamSoApi.getListDynamicFields(),
                thamSoApi.getListFieldSets(),
                thamSoApi.getListFormConfigs(),
            ]);

            return { dynamicFields, fieldSets, formConfigs };
        } catch (error) {
            return rejectWithValue((error as Error).message || 'Không thể tải cấu hình tham số');
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as { thamSoReducer?: ThamSoState };
            return !state.thamSoReducer?.loading;
        },
    },
);

export const saveDynamicField = createAsyncThunk<
    SaveDynamicFieldPayload,
    { field: LocalDynamicField; isNew: boolean },
    { rejectValue: string }
>(
    'thamSo/saveDynamicField',
    async ({ field, isNew }, { rejectWithValue }) => {
        try {
            const savedField = await thamSoApi.saveDynamicField(field, isNew);
            return { tempId: field.id, field: savedField };
        } catch (error) {
            return rejectWithValue((error as Error).message || 'Không thể lưu trường dữ liệu');
        }
    },
);

export const deleteDynamicField = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'thamSo/deleteDynamicField',
    async (fieldId, { rejectWithValue }) => {
        try {
            await thamSoApi.deleteDynamicField(fieldId);
            return fieldId;
        } catch (error) {
            return rejectWithValue((error as Error).message || 'Không thể xóa trường dữ liệu');
        }
    },
);

export const saveFieldSet = createAsyncThunk<
    SaveFieldSetPayload,
    { fieldSet: LocalFieldSet; isNew: boolean },
    { rejectValue: string }
>(
    'thamSo/saveFieldSet',
    async ({ fieldSet, isNew }, { rejectWithValue, getState }) => {
        try {
            const state = getState() as { thamSoReducer?: ThamSoState };
            const allFields = state.thamSoReducer?.dynamicFields ?? [];
            const savedFieldSet = await thamSoApi.saveFieldSet(fieldSet, isNew, allFields);
            return { tempId: fieldSet.id, fieldSet: savedFieldSet };
        } catch (error) {
            return rejectWithValue((error as Error).message || 'Không thể lưu bộ dữ liệu');
        }
    },
);

export const deleteFieldSet = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'thamSo/deleteFieldSet',
    async (fieldSetId, { rejectWithValue }) => {
        try {
            await thamSoApi.deleteFieldSet(fieldSetId);
            return fieldSetId;
        } catch (error) {
            return rejectWithValue((error as Error).message || 'Không thể xóa bộ dữ liệu');
        }
    },
);

export const saveFormConfig = createAsyncThunk<
    SaveFormConfigPayload,
    { formConfig: LocalFormConfig; isNew: boolean },
    { rejectValue: string }
>(
    'thamSo/saveFormConfig',
    async ({ formConfig, isNew }, { rejectWithValue }) => {
        try {
            const savedFormConfig = await thamSoApi.saveFormConfig(formConfig, isNew);
            return { tempId: formConfig.id, formConfig: savedFormConfig };
        } catch (error) {
            return rejectWithValue((error as Error).message || 'Không thể lưu cấu hình form');
        }
    },
);

export const deleteFormConfig = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'thamSo/deleteFormConfig',
    async (formConfigId, { rejectWithValue }) => {
        try {
            await thamSoApi.deleteFormConfig(formConfigId);
            return formConfigId;
        } catch (error) {
            return rejectWithValue((error as Error).message || 'Không thể xóa cấu hình form');
        }
    },
);

const replaceById = <T extends { id: string }>(items: T[], tempId: string, nextItem: T): T[] => {
    const nextId = nextItem.id;
    const existingIndex = items.findIndex((item) => item.id === tempId || item.id === nextId);

    if (existingIndex === -1) {
        return [...items, nextItem];
    }

    return items.map((item, index) => (index === existingIndex ? nextItem : item));
};

const thamSoSlice = createSlice({
    name: 'thamSo',
    initialState,
    reducers: {
        resetThamSoState: (state) => {
            state.dynamicFields = [];
            state.fieldSets = [];
            state.formConfigs = [];
            state.loading = false;
            state.syncing = false;
            state.loaded = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchThamSoSchema.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchThamSoSchema.fulfilled, (state, action: PayloadAction<ThamSoSchemaPayload>) => {
                state.loading = false;
                state.loaded = true;
                state.error = null;
                state.dynamicFields = action.payload.dynamicFields;
                state.fieldSets = action.payload.fieldSets;
                state.formConfigs = action.payload.formConfigs;
            })
            .addCase(fetchThamSoSchema.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? 'Không thể tải cấu hình tham số';
            })
            .addCase(saveDynamicField.pending, (state) => {
                state.syncing = true;
                state.error = null;
            })
            .addCase(saveDynamicField.fulfilled, (state, action: PayloadAction<SaveDynamicFieldPayload>) => {
                state.syncing = false;
                state.error = null;
                state.loaded = true;
                state.dynamicFields = replaceById(state.dynamicFields, action.payload.tempId, action.payload.field);
            })
            .addCase(saveDynamicField.rejected, (state, action) => {
                state.syncing = false;
                state.error = action.payload ?? 'Không thể lưu trường dữ liệu';
            })
            .addCase(deleteDynamicField.pending, (state) => {
                state.syncing = true;
                state.error = null;
            })
            .addCase(deleteDynamicField.fulfilled, (state, action: PayloadAction<string>) => {
                state.syncing = false;
                state.error = null;
                state.dynamicFields = state.dynamicFields.filter((field) => field.id !== action.payload);
            })
            .addCase(deleteDynamicField.rejected, (state, action) => {
                state.syncing = false;
                state.error = action.payload ?? 'Không thể xóa trường dữ liệu';
            })
            .addCase(saveFieldSet.pending, (state) => {
                state.syncing = true;
                state.error = null;
            })
            .addCase(saveFieldSet.fulfilled, (state, action: PayloadAction<SaveFieldSetPayload>) => {
                state.syncing = false;
                state.error = null;
                state.loaded = true;
                state.fieldSets = replaceById(state.fieldSets, action.payload.tempId, action.payload.fieldSet);
            })
            .addCase(saveFieldSet.rejected, (state, action) => {
                state.syncing = false;
                state.error = action.payload ?? 'Không thể lưu bộ dữ liệu';
            })
            .addCase(deleteFieldSet.pending, (state) => {
                state.syncing = true;
                state.error = null;
            })
            .addCase(deleteFieldSet.fulfilled, (state, action: PayloadAction<string>) => {
                state.syncing = false;
                state.error = null;
                state.fieldSets = state.fieldSets.filter((fieldSet) => fieldSet.id !== action.payload);
            })
            .addCase(deleteFieldSet.rejected, (state, action) => {
                state.syncing = false;
                state.error = action.payload ?? 'Không thể xóa bộ dữ liệu';
            })
            .addCase(saveFormConfig.pending, (state) => {
                state.syncing = true;
                state.error = null;
            })
            .addCase(saveFormConfig.fulfilled, (state, action: PayloadAction<SaveFormConfigPayload>) => {
                state.syncing = false;
                state.error = null;
                state.loaded = true;
                state.formConfigs = replaceById(state.formConfigs, action.payload.tempId, action.payload.formConfig);
            })
            .addCase(saveFormConfig.rejected, (state, action) => {
                state.syncing = false;
                state.error = action.payload ?? 'Không thể lưu cấu hình form';
            })
            .addCase(deleteFormConfig.pending, (state) => {
                state.syncing = true;
                state.error = null;
            })
            .addCase(deleteFormConfig.fulfilled, (state, action: PayloadAction<string>) => {
                state.syncing = false;
                state.error = null;
                state.formConfigs = state.formConfigs.filter((formConfig) => formConfig.id !== action.payload);
            })
            .addCase(deleteFormConfig.rejected, (state, action) => {
                state.syncing = false;
                state.error = action.payload ?? 'Không thể xóa cấu hình form';
            });
    },
});

export const { resetThamSoState } = thamSoSlice.actions;
export default thamSoSlice.reducer;