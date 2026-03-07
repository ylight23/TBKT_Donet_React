// ============================================================
// AddTrangBiDialog – Form nhập trang bị kỹ thuật (Nhóm 1, Nhóm 2)
// Thiết kế: Hiện đại, trực quan, dễ sử dụng
// Lấy dữ liệu từ FormConfig (Cấu hình tham số)
// ============================================================
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useTheme } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

import { FormDialog } from '../Dialog';
import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
  LocalFormConfig as FormConfig,
} from '../../types/thamSo';
import FieldInput from '../../pages/CauHinhThamSo/subComponents/FieldInput';
import { militaryColors } from '../../theme';

// ── Props ───────────────────────────────────────────────────
interface AddTrangBiDialogProps {
  open: boolean;
  onClose: () => void;
  formConfig: FormConfig | null;
  allFieldSets: FieldSet[];
  allFields: DynamicField[];
  activeMenu?: 'tbNhom1' | 'tbNhom2';
}

// ── Field Item Component ───────────────────────────────────
interface FormFieldItemProps {
  field: DynamicField;
  value: string;
  onFieldChange: (fieldKey: string, value: string) => void;
}

const FormFieldItem: React.FC<FormFieldItemProps> = React.memo(({ field, value, onFieldChange }) => {
  const handleChange = useCallback(
    (key: string, nextValue: string) => onFieldChange(key, nextValue),
    [onFieldChange],
  );
  const isWideField = field.type === 'textarea' || field.type === 'checkboxGroup';

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Grid size={{ xs: 12, md: isWideField ? 12 : 6 }}>
      <Box sx={{ mb: 1.5 }}>
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
            opacity: 0.85
          }}
        >
          {field.label}
          {field.required && (
            <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>
          )}
        </Typography>

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
            }
          },
          '& .MuiInputBase-input': {
            py: 1,
            px: 1.5,
            fontSize: '0.875rem'
          },
          '& .MuiSelect-select': {
            py: 1,
            px: 1.5,
          }
        }}>
          <FieldInput field={field} value={value} onChange={handleChange} />
        </Box>
      </Box>
    </Grid>
  );
}, (prevProps, nextProps) => (
  prevProps.field === nextProps.field &&
  prevProps.value === nextProps.value &&
  prevProps.onFieldChange === nextProps.onFieldChange
));

FormFieldItem.displayName = 'FormFieldItem';

// ── FieldSet Group Component ────────────────────────────────
interface FieldSetGroupProps {
  fieldSet: FieldSet;
  fields: DynamicField[];
  formData: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  color: string;
}

const FieldSetGroup: React.FC<FieldSetGroupProps> = ({
  fieldSet,
  fields,
  formData,
  onFieldChange,
  color,
}) => {
  return (
    <Box
      sx={{
        mb: 4,
        borderTop: '2px solid',
        borderColor: color,
        pt: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{ color: 'text.primary', fontSize: '0.9rem', letterSpacing: '-0.01em' }}
        >
          {fieldSet.name}
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {fields.map((field) => (
          <FormFieldItem
            key={field.id}
            field={field}
            value={formData[field.key] ?? ''}
            onFieldChange={onFieldChange}
          />
        ))}
      </Grid>
    </Box>
  );
};

// ── Main Dialog Component ───────────────────────────────────
const AddTrangBiDialog: React.FC<AddTrangBiDialogProps> = ({
  open,
  onClose,
  formConfig,
  allFieldSets,
  allFields,
  activeMenu,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setFormData({});
    }
  }, [open, formConfig?.id]);

  // Create lookup maps
  const fieldSetById = useMemo(
    () => new Map(allFieldSets.map((set) => [set.id, set])),
    [allFieldSets],
  );

  const fieldById = useMemo(
    () => new Map(allFields.map((field) => [field.id, field])),
    [allFields],
  );

  // Get tabs from formConfig
  const tabs = useMemo(() => formConfig?.tabs ?? [], [formConfig]);
  const currentTab = tabs[activeTab];

  // Get fieldSets and fields for current tab
  const currentTabContent = useMemo(() => {
    if (!currentTab) return [];

    const setIds = currentTab.setIds ?? [];

    return setIds
      .map((setId) => {
        const fieldSet = fieldSetById.get(setId);
        if (!fieldSet) return null;

        const fields = (fieldSet.fieldIds ?? [])
          .map((fid: string) => fieldById.get(fid))
          .filter((f): f is DynamicField => Boolean(f));

        return { fieldSet, fields };
      })
      .filter((item): item is { fieldSet: FieldSet; fields: DynamicField[] } => item !== null);
  }, [currentTab, fieldSetById, fieldById]);

  // Get all fields in current tab
  const currentTabFields = useMemo(() => {
    return currentTabContent.flatMap(item => item.fields);
  }, [currentTabContent]);

  // Calculate progress for current tab
  const tabProgress = useMemo(() => {
    const total = currentTabFields.length;
    if (total === 0) return 0;
    const filled = currentTabFields.filter(f => formData[f.key]?.trim()).length;
    return Math.round((filled / total) * 100);
  }, [currentTabFields, formData]);

  // Calculate overall progress across all tabs
  const overallProgress = useMemo(() => {
    let totalFields = 0;
    let filledFields = 0;

    tabs.forEach((tab) => {
      const setIds = tab.setIds ?? [];
      setIds.forEach((setId) => {
        const fieldSet = fieldSetById.get(setId);
        if (fieldSet) {
          const fields = (fieldSet.fieldIds ?? [])
            .map((fid: string) => fieldById.get(fid))
            .filter((f): f is DynamicField => Boolean(f));

          totalFields += fields.length;
          filledFields += fields.filter(f => formData[f.key]?.trim()).length;
        }
      });
    });

    if (totalFields === 0) return 0;
    return Math.round((filledFields / totalFields) * 100);
  }, [tabs, formData, fieldSetById, fieldById]);

  // Calculate field stats per tab
  const tabFieldStats = useMemo(() => {
    return tabs.map((tab) => {
      let total = 0;
      let filled = 0;

      const setIds = tab.setIds ?? [];
      setIds.forEach((setId) => {
        const fieldSet = fieldSetById.get(setId);
        if (fieldSet) {
          const fields = (fieldSet.fieldIds ?? [])
            .map((fid: string) => fieldById.get(fid))
            .filter((f): f is DynamicField => Boolean(f));

          total += fields.length;
          filled += fields.filter(f => formData[f.key]?.trim()).length;
        }
      });

      return { total, filled };
    });
  }, [tabs, formData, fieldSetById, fieldById]);

  const handleFieldChange = useCallback((fieldKey: string, value: string) => {
    setFormData((prev) => {
      if (prev[fieldKey] === value) return prev;
      return { ...prev, [fieldKey]: value };
    });
  }, []);

  const handleSave = useCallback(() => {
    console.log('Add Equipment:', formData);
    alert('Lưu thành công! (Giả lập)');
    onClose();
  }, [formData, onClose]);

  const handlePreviousTab = useCallback(() => {
    setActiveTab((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNextTab = useCallback(() => {
    setActiveTab((prev) => Math.min(prev + 1, Math.max(tabs.length - 1, 0)));
  }, [tabs.length]);

  if (!formConfig) {
    return null;
  }

  // Default colors for field sets
  const setColors = ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      mode="add"
      maxWidth="lg"
      title="Thêm trang bị kỹ thuật mới"
      subtitle={`Nhóm ${activeMenu === 'tbNhom1' ? '1 - Phương tiện thông tin' : '2 - Phương tiện bay, xe thiết giáp'}`}
      icon={<AddIcon />}
      onConfirm={handleSave}
      confirmText="Lưu trang bị"
      contentPadding={0}
      sx={{ '& .MuiDialog-paper': { height: '88vh', maxHeight: '900px' } }}
      contentSx={{ overflow: 'hidden' }}
      showConfirm={false}
      showCancel={false}
      customActions={(
        <>
          <Button
            variant="outlined"
            onClick={handlePreviousTab}
            disabled={activeTab === 0}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            ← Quay lại
          </Button>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                borderColor: 'error.main',
                color: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  bgcolor: 'error.main',
                  color: '#fff',
                }
              }}
            >
              Hủy
            </Button>

            {activeTab < tabs.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNextTab}
                sx={{
                  bgcolor: militaryColors.navy,
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 4,
                  '&:hover': {
                    bgcolor: militaryColors.navy,
                    filter: 'brightness(1.1)',
                  }
                }}
              >
                Tiếp tục →
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSave}
                startIcon={<SaveIcon />}
                sx={{
                  bgcolor: 'success.main',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 4,
                  '&:hover': {
                    bgcolor: 'success.dark',
                  }
                }}
              >
                Lưu trang bị
              </Button>
            )}
          </Stack>
        </>
      )}
    >
      {/* Progress Header */}
      <Box sx={{
        px: 3,
        py: 2,
        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Tiến độ nhập liệu
          </Typography>
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {overallProgress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallProgress}
          sx={{
            height: 6,
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 2.5,
              background: `linear-gradient(90deg, ${militaryColors.navy} 0%, ${militaryColors.deepOlive} 100%)`,
            }
          }}
        />
      </Box>

      {/* Tabs - Lấy từ formConfig */}
      <Box sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            minHeight: 56,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 2.5,
              bgcolor: militaryColors.navy,
            },
          }}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === index;

            return (
              <Tab
                key={tab.id}
                value={index}
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography
                      variant="inherit"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.82rem',
                      }}
                    >
                      {tab.label}
                    </Typography>
                  </Stack>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Tab Content - Hiển thị theo FieldSets từ formConfig */}
      <Box sx={{
        p: 3,
        flex: 1,
        overflowY: 'auto',
        bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50',
        minHeight: 400,
      }}>
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {/* Field Sets - Lấy từ formConfig */}
          {currentTabContent.length > 0 ? (
            currentTabContent.map((item, index) => (
              <FieldSetGroup
                key={item.fieldSet.id}
                fieldSet={item.fieldSet}
                fields={item.fields}
                formData={formData}
                onFieldChange={handleFieldChange}
                color={item.fieldSet.color || setColors[index % setColors.length]}
              />
            ))
          ) : (
            <Box sx={{
              py: 8,
              textAlign: 'center',
              color: 'text.secondary',
            }}>
              <Typography variant="body1" fontWeight={600}>
                Chưa có trường dữ liệu được cấu hình
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                Vui lòng cấu hình form trong phần "Cấu hình tham số"
              </Typography>
            </Box>
          )}

        </Box>
      </Box>
    </FormDialog>
  );
};

export default AddTrangBiDialog;
