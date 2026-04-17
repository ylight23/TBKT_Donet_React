// ============================================================
// GeneralInfoTab – Tab thông tin chung
// FormFieldItem và FieldSetGroup được export để TechnicalFieldsTab
// và các tab khác có thể tái sử dụng với cùng styling.
// ============================================================
import React, { useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import ListAltIcon from '@mui/icons-material/ListAlt';

import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
} from '../../types/thamSo';
import FieldInput from '../../pages/CauHinhThamSo/subComponents/FieldInput';

// ── Types ─────────────────────────────────────────────────────
export interface GeneralFieldSetItem {
  fieldSet: FieldSet;
  fields: DynamicField[];
}

export interface GeneralInfoTabProps {
  generalTabContent: GeneralFieldSetItem[];
  formData: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  setColors?: string[];
}

// ── FormFieldItem ──────────────────────────────────────────────
// Styled input row — sử dụng lại cho cả GeneralInfoTab và TechnicalFieldsTab
export interface FormFieldItemProps {
  field: DynamicField;
  value: string;
  onFieldChange: (fieldKey: string, value: string) => void;
}

export const FormFieldItem: React.FC<FormFieldItemProps> = React.memo(
  ({ field, value, onFieldChange }) => {
    const handleChange = useCallback(
      (key: string, nextValue: string) => onFieldChange(key, nextValue),
      [onFieldChange],
    );

    const isWideField = field.type === 'textarea' || field.type === 'checkboxGroup';
    const shouldUseMuiLabel =
      field.type === 'text'
      || field.type === 'number'
      || field.type === 'date'
      || field.type === 'textarea'
      || field.type === 'select'
      || field.type === 'radio'
      || field.type === 'checkbox'
      || field.type === 'checkboxGroup';

    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
      <Grid size={{ xs: 12, md: isWideField ? 12 : 6 }}>
        <Box sx={{ mb: 1 }}>
          {!shouldUseMuiLabel && (
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
                mb: 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.primary',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.85,
              }}
            >
              {field.label}
              {field.required && (
                <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>
              )}
            </Typography>
          )}

          <Box sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fafbfc',
              borderRadius: 2.5,
              transition: 'all 0.2s ease',
              '& fieldset': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                borderWidth: '1px',
              },
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f5f6f8',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                },
              },
              '&.Mui-focused': {
                bgcolor: 'background.paper',
                '& fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                },
                boxShadow: `0 0 0 3px ${theme.palette.primary.main}15`,
              },
            },
            '& .MuiInputBase-input': {
              py: 0.85,
              px: 1.5,
              fontSize: '0.875rem',
            },
            '& .MuiSelect-select': {
              py: 0.85,
              px: 1.5,
            },
          }}>
            <FieldInput
              field={field}
              value={value}
              useMuiLabel={shouldUseMuiLabel}
              onChange={handleChange}
            />
          </Box>
        </Box>
      </Grid>
    );
  },
  (prev, next) => (
    prev.field === next.field
    && prev.value === next.value
    && prev.onFieldChange === next.onFieldChange
  ),
);

FormFieldItem.displayName = 'FormFieldItem';

// ── FieldSetGroup ─────────────────────────────────────────────
// Bật showSectionHeader để hiển thị tên nhóm (dùng cho TechnicalFieldsTab)
export interface FieldSetGroupProps {
  fieldSet: FieldSet;
  fields: DynamicField[];
  formData: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  color: string;
  renderVersion?: number;
  /** Hiển thị thanh tên nhóm (mặc định: false) */
  showSectionHeader?: boolean;
}

export const FieldSetGroup: React.FC<FieldSetGroupProps> = ({
  fieldSet,
  fields,
  formData,
  onFieldChange,
  color,
  renderVersion = 0,
  showSectionHeader = false,
}) => (
  <Box sx={{ mb: 2, pt: 0.75 }}>
    {showSectionHeader && fieldSet.name && (
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        <Box
          sx={{
            width: 3,
            height: 16,
            borderRadius: '2px',
            bgcolor: color,
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '0.73rem',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            color,
            opacity: 0.85,
          }}
        >
          {fieldSet.name}
        </Typography>
      </Stack>
    )}
    <Grid container spacing={1.5}>
      {fields.map((field) => (
        <FormFieldItem
          key={`${field.id}-${renderVersion}`}
          field={field}
          value={formData[field.key] ?? ''}
          onFieldChange={onFieldChange}
        />
      ))}
    </Grid>
  </Box>
);

// ── Main component ─────────────────────────────────────────────
const DEFAULT_SET_COLORS = ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

const GeneralInfoTab: React.FC<GeneralInfoTabProps> = ({
  generalTabContent,
  formData,
  onFieldChange,
  setColors = DEFAULT_SET_COLORS,
}) => {
  if (generalTabContent.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
        <ListAltIcon sx={{ fontSize: 36, mb: 1.5, opacity: 0.2 }} />
        <Typography variant="body1" fontWeight={600}>
          Chưa có trường dữ liệu được cấu hình
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
          Vui lòng cấu hình các bộ trường dữ liệu trong phần "Cấu hình tham số"
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {generalTabContent.map((item, index) => (
        <FieldSetGroup
          key={`${item.fieldSet.id}-${index}`}
          fieldSet={item.fieldSet}
          fields={item.fields}
          formData={formData}
          onFieldChange={onFieldChange}
          color={item.fieldSet.color || setColors[index % setColors.length]}
        />
      ))}
    </>
  );
};

export default GeneralInfoTab;
