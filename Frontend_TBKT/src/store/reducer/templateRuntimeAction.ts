import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import notify from '../../utils/notification';
import thamSoApi from '../../apis/thamSoApi';
import fileTransferApi from '../../apis/fileTransferApi';

export interface RuntimeActionPayload {
  intent: 'export_list' | 'print_list' | 'import_list';
  endpoint?: string;
  payloadJson?: string;
  actionKey?: string;
  successMessage?: string;
  failureMessage?: string;
}

export interface RuntimeImportPayload extends RuntimeActionPayload {
  file: File;
}

interface RuntimeActionState {
  exporting: boolean;
  importing: boolean;
  printing: boolean;
  lastError: string | null;
}

const initialState: RuntimeActionState = {
  exporting: false,
  importing: false,
  printing: false,
  lastError: null,
};

const parsePayload = (raw: string | undefined): unknown => {
  if (!raw?.trim()) return undefined;
  return JSON.parse(raw);
};

const getPayloadObject = (payloadJson?: string): Record<string, unknown> => {
  const parsed = parsePayload(payloadJson);
  if (!parsed) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { payload: parsed };
  }
  return parsed as Record<string, unknown>;
};

export const exportListThunk = createAsyncThunk<
  string,
  RuntimeActionPayload,
  { rejectValue: string }
>('templateRuntime/exportList', async (payload, { rejectWithValue }) => {
  try {
    const p = getPayloadObject(payload.payloadJson);
    const actionKey = (payload.actionKey || '').trim().toLowerCase();

    if (actionKey === 'thamso.template.exportpublished') {
      const templates = await thamSoApi.getListTemplateLayouts();
      await thamSoApi.streamExportTemplateLayouts(templates, undefined, { onlyPublished: true });
      const msg = payload.successMessage || 'Export template published thanh cong';
      notify.success(msg);
      return msg;
    }

    if (actionKey === 'thamso.template.exportbykey') {
      const key = String(p.key || '').trim();
      if (!key) return rejectWithValue('Thieu key template de export');
      const templates = await thamSoApi.getListTemplateLayouts();
      const found = templates.find((item) => item.key === key);
      if (!found) return rejectWithValue(`Khong tim thay template key: ${key}`);
      await thamSoApi.streamExportTemplateLayouts([found], undefined, { onlyPublished: false });
      const msg = payload.successMessage || `Export template thanh cong: ${key}`;
      notify.success(msg);
      return msg;
    }

    const fileId = String(p.fileId || '').trim();
    if (!fileId) return rejectWithValue('Thieu actionKey/fileId cho export grpc');
    const result = await fileTransferApi.saveDownloadedFile(fileId);
    const fileName = result.file?.originalFileName || result.file?.fileName || fileId;
    notify.success(payload.successMessage || `Tai xuong thanh cong: ${fileName}`);
    return fileName;
  } catch (error) {
    const msg = payload.failureMessage || (error as Error).message || 'Export that bai';
    notify.error(msg);
    return rejectWithValue(msg);
  }
});

export const printListThunk = createAsyncThunk<
  void,
  RuntimeActionPayload,
  { rejectValue: string }
>('templateRuntime/printList', async (payload, { rejectWithValue }) => {
  try {
    const p = getPayloadObject(payload.payloadJson);
    const fileId = String(p.fileId || '').trim();

    if (fileId) {
      const { blob } = await fileTransferApi.downloadFileStream(fileId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        URL.revokeObjectURL(url);
        return rejectWithValue('Trinh duyet chan popup in');
      }
      setTimeout(() => {
        try {
          win.print();
        } finally {
          URL.revokeObjectURL(url);
        }
      }, 450);
      notify.success(payload.successMessage || 'Da mo ban in');
      return;
    }

    window.print();
    notify.success(payload.successMessage || 'In danh sach thanh cong');
  } catch (error) {
    const msg = payload.failureMessage || (error as Error).message || 'In that bai';
    notify.error(msg);
    return rejectWithValue(msg);
  }
});

export const importListThunk = createAsyncThunk<
  void,
  RuntimeImportPayload,
  { rejectValue: string }
>('templateRuntime/importList', async (payload, { rejectWithValue }) => {
  try {
    const p = getPayloadObject(payload.payloadJson);
    const metadata: Record<string, string> = {};
    Object.entries(p).forEach(([key, value]) => {
      if (key === 'category') return;
      if (key === 'fileId') return;
      metadata[key] = value == null ? '' : String(value);
    });
    metadata.actionKey = payload.actionKey || '';
    metadata.intent = payload.intent;
    await fileTransferApi.uploadFile(payload.file, {
      category: String(p.category || 'template-runtime-import'),
      metadata,
    });

    notify.success(payload.successMessage || `Import thanh cong: ${payload.file.name}`);
  } catch (error) {
    const msg = payload.failureMessage || (error as Error).message || 'Import that bai';
    notify.error(msg);
    return rejectWithValue(msg);
  }
});

const templateRuntimeActionSlice = createSlice({
  name: 'templateRuntimeAction',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(exportListThunk.pending, (state) => {
        state.exporting = true;
        state.lastError = null;
      })
      .addCase(exportListThunk.fulfilled, (state) => {
        state.exporting = false;
      })
      .addCase(exportListThunk.rejected, (state, action) => {
        state.exporting = false;
        state.lastError = action.payload ?? 'Export that bai';
      })
      .addCase(printListThunk.pending, (state) => {
        state.printing = true;
        state.lastError = null;
      })
      .addCase(printListThunk.fulfilled, (state) => {
        state.printing = false;
      })
      .addCase(printListThunk.rejected, (state, action) => {
        state.printing = false;
        state.lastError = action.payload ?? 'Print that bai';
      })
      .addCase(importListThunk.pending, (state) => {
        state.importing = true;
        state.lastError = null;
      })
      .addCase(importListThunk.fulfilled, (state) => {
        state.importing = false;
      })
      .addCase(importListThunk.rejected, (state, action) => {
        state.importing = false;
        state.lastError = action.payload ?? 'Import that bai';
      });
  },
});

export default templateRuntimeActionSlice.reducer;
