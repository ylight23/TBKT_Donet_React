import type { LocalDynamicField } from '../../types/thamSo';
import type { RuntimeActionPayload } from '../../store/reducer/templateRuntimeAction';

export type CreateDialogState = {
  open: boolean;
  mode: 'create' | 'edit';
  loading: boolean;
  submitLoading: boolean;
  error: string;
  formKey: string;
  endpoint: string;
  actionKey: string;
  fields: LocalDynamicField[];
  tabGroups: Array<{ id: string; label: string; fields: LocalDynamicField[] }>;
  values: Record<string, string>;
  errors: Record<string, string | null>;
  info: string;
};

export type ViewDialogState = {
  open: boolean;
  title: string;
  row: Record<string, unknown> | null;
};

export type RuntimeIntentEvent = {
  intent?: RuntimeActionPayload['intent'] | 'custom' | 'api_call';
  actionKey?: string;
  payloadJson?: string;
  endpoint?: string;
};

export type RuntimeDataTableRowActionEvent = {
  action?: 'view' | 'edit' | 'delete' | 'print' | 'export';
  row?: Record<string, unknown>;
  sourceKey?: string | null;
};

