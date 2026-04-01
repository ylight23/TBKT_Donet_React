import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  executeTemplateButtonAction,
  type TemplateButtonIntent,
} from '../actions/buttonActionRegistry';
import { useTemplateRuntimeContext } from '../runtimeContext';

type Props = {
  text?: string;
  href?: string;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error';
  align?: string;
  intent?: TemplateButtonIntent;
  endpoint?: string;
  // Legacy-only: kept for backward compatibility with old saved templates.
  payloadJson?: string;
  confirmMessage?: string;
  successMessage?: string;
  failureMessage?: string;
  actionKey?: string;
  createFormKey?: string;
  actionPreset?: 'none' | 'create' | 'edit' | 'delete' | 'print' | 'import' | 'export';
};

export const ButtonBlockConfig = {
  fields: {
    text: { type: 'text' as const, label: 'Nhan nut' },
    href: { type: 'text' as const, label: 'URL lien ket (navigate)' },
    variant: {
      type: 'select' as const,
      label: 'Kieu nut',
      options: [
        { label: 'Nen day', value: 'contained' },
        { label: 'Vien', value: 'outlined' },
        { label: 'Chu', value: 'text' },
      ],
    },
    color: {
      type: 'select' as const,
      label: 'Mau',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
      ],
    },
    align: {
      type: 'select' as const,
      label: 'Canh le',
      options: [
        { label: 'Trai', value: 'flex-start' },
        { label: 'Giua', value: 'center' },
        { label: 'Phai', value: 'flex-end' },
      ],
    },
    actionPreset: {
      type: 'select' as const,
      label: 'Preset loai hanh dong',
      options: [
        { label: 'Khong dung preset', value: 'none' },
        { label: 'Them moi', value: 'create' },
        { label: 'Sua', value: 'edit' },
        { label: 'Xoa', value: 'delete' },
        { label: 'In danh sach', value: 'print' },
        { label: 'Nhap danh sach', value: 'import' },
        { label: 'Xuat danh sach', value: 'export' },
      ],
    },
    intent: {
      type: 'select' as const,
      label: 'Intent',
      options: [
        { label: 'Navigate', value: 'navigate' },
        { label: 'API Call', value: 'api_call' },
        { label: 'Print List', value: 'print_list' },
        { label: 'Import List', value: 'import_list' },
        { label: 'Export List', value: 'export_list' },
        { label: 'Refresh Page', value: 'refresh' },
        { label: 'Custom Event', value: 'custom' },
      ],
    },
    endpoint: { type: 'text' as const, label: 'Endpoint/Resource (vi du: catalog:trangbi_nhom2)' },
    confirmMessage: { type: 'text' as const, label: 'Confirm message' },
    successMessage: { type: 'text' as const, label: 'Success message' },
    failureMessage: { type: 'text' as const, label: 'Failure message' },
    actionKey: { type: 'text' as const, label: 'Action key (optional)' },
    createFormKey: { type: 'text' as const, label: 'Form key (de mo popup Them moi)' },
  },
  resolveFields: (data: Props, { fields }: { fields: Record<string, unknown> }) => {
    const preset = (data.actionPreset || 'none').trim().toLowerCase();
    if (preset === 'none') return fields;
    const nextFields = { ...fields };
    delete nextFields.intent;
    return nextFields;
  },
  defaultProps: {
    text: 'Nut bam',
    intent: 'navigate',
    variant: 'contained',
    color: 'primary',
    align: 'flex-start',
    actionPreset: 'none',
  },
  render: ({
    text,
    href,
    variant,
    color,
    align,
    intent,
    endpoint,
    payloadJson,
    confirmMessage,
    successMessage,
    failureMessage,
    actionKey,
    createFormKey,
    actionPreset,
  }: Props) => {
    const navigate = useNavigate();
    const { isRuntime } = useTemplateRuntimeContext();
    const [loading, setLoading] = useState(false);
    const requiresCreateFormKey = (actionPreset || 'none').trim().toLowerCase() === 'create';
    const missingCreateFormKey = requiresCreateFormKey && !(createFormKey || '').trim();

    const handleClick = async () => {
      if (loading) return;
      setLoading(true);
      try {
        const preset = actionPreset || 'none';
        const resolvedIntent: TemplateButtonIntent =
          preset === 'print'
            ? 'print_list'
            : preset === 'import'
              ? 'import_list'
              : preset === 'export'
                ? 'export_list'
                : preset === 'create' || preset === 'edit' || preset === 'delete'
                  ? 'custom'
                  : (intent || 'navigate');

        const resolvedActionKey =
          preset === 'create'
            ? 'create_item'
            : preset === 'edit'
              ? 'edit_item'
              : preset === 'delete'
                ? 'delete_item'
                : (actionKey || '');

        const fallbackConfirm =
          preset === 'delete' ? 'Ban co chac chan muon xoa ban ghi nay?' : undefined;

        await executeTemplateButtonAction({
          config: {
            intent: resolvedIntent,
            href,
            endpoint,
            payloadJson:
              resolvedIntent === 'custom' &&
              (resolvedActionKey || '').trim().toLowerCase() === 'create_item' &&
              !payloadJson?.trim()
                ? JSON.stringify({
                    formKey: (createFormKey || '').trim(),
                    endpoint: (endpoint || '').trim() || undefined,
                  })
                : payloadJson,
            confirmMessage: confirmMessage || fallbackConfirm,
            successMessage,
            failureMessage,
            actionKey: resolvedActionKey,
          },
          navigate,
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, justifyContent: align || 'flex-start', p: '1px' }}>
        {!isRuntime && missingCreateFormKey && (
          <Alert severity="warning" sx={{ py: 0.25, px: 1, '& .MuiAlert-message': { py: 0.25, fontSize: 12 } }}>
            Button preset create dang thieu createFormKey.
          </Alert>
        )}
        <Box sx={{ display: 'flex', justifyContent: align || 'flex-start' }}>
          <Button
            variant={variant || 'contained'}
            color={color || 'primary'}
            onClick={() => void handleClick()}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {text || 'Nut bam'}
          </Button>
        </Box>
      </Box>
    );
  },
};
