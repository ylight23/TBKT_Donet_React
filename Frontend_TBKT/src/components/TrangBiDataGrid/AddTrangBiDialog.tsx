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
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

import { FormDialog } from '../Dialog';
import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
  LocalFormConfig as FormConfig,
  LocalFormTabConfig as FormTabConfig,
} from '../../types/thamSo';
import FieldInput from '../../pages/CauHinhThamSo/subComponents/FieldInput';
import { getRealSetIds, parseTabMeta } from '../../pages/CauHinhThamSo/subComponents/formTabMeta';
import { militaryColors } from '../../theme';
import { buildByNormalizedId, normalizeId } from '../../utils/idUtils';

// ── Props ───────────────────────────────────────────────────
interface AddTrangBiDialogProps {
  open: boolean;
  onClose: () => void;
  formConfig: FormConfig | null;
  allFieldSets: FieldSet[];
  allFields: DynamicField[];
  activeMenu?: 'tbNhom1' | 'tbNhom2';
  configError?: string;
}

const CATEGORY_FIELD_CANDIDATES = ['MaDanhMucTrangBi', 'IDDanhMucTrangBi', 'IDNganh', 'IdNganh'];
const normalizeCategoryValue = (value?: string | null): string => String(value ?? '').trim().toUpperCase();

const matchesSyncCategory = (selectedCategory: string, syncCategory?: string): boolean => {
  const normalizedSelected = normalizeCategoryValue(selectedCategory);
  const normalizedSync = normalizeCategoryValue(syncCategory);

  if (!normalizedSync) return true;
  if (!normalizedSelected) return false;

  return normalizedSelected === normalizedSync
    || normalizedSelected.startsWith(normalizedSync)
    || normalizedSync.startsWith(normalizedSelected);
};

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
      <Box sx={{ mb: 1.5 }}>
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
              opacity: 0.85
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
          <FieldInput field={field} value={value} useMuiLabel={shouldUseMuiLabel} onChange={handleChange} />
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
  configError,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeChildTabByParent, setActiveChildTabByParent] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setActiveChildTabByParent({});
      setFormData({});
    }
  }, [open, formConfig?.id]);

  // Create lookup maps
  const fieldSetById = useMemo(
    () => buildByNormalizedId(allFieldSets),
    [allFieldSets],
  );

  // Build parent-child structure from tab metadata
  const tabStructure = useMemo(() => {
    const tabs = formConfig?.tabs ?? [];
    const roots = tabs.filter((tab) => !parseTabMeta(tab).parentTabId);
    const childrenByParent = tabs.reduce<Record<string, FormTabConfig[]>>((acc, tab) => {
      const parentId = parseTabMeta(tab).parentTabId;
      if (parentId) {
        if (!acc[parentId]) acc[parentId] = [];
        acc[parentId].push(tab);
      }
      return acc;
    }, {});
    return { roots, childrenByParent };
  }, [formConfig]);

  const rootTabs = tabStructure.roots;
  const currentRootTab = rootTabs[activeTab];
  const currentRootMeta = currentRootTab ? parseTabMeta(currentRootTab) : null;
  const rawRootChildren = currentRootTab ? (tabStructure.childrenByParent[currentRootTab.id] || []) : [];
  const selectedCategoryCode = useMemo(
    () => CATEGORY_FIELD_CANDIDATES
      .map((key) => formData[key])
      .find((value) => normalizeCategoryValue(value).length > 0) ?? '',
    [formData],
  );
  const currentRootChildren = useMemo(() => {
    if (!currentRootTab) return [];
    if (currentRootMeta?.tabType !== 'sync-group') return rawRootChildren;
    return rawRootChildren.filter((child) => matchesSyncCategory(selectedCategoryCode, parseTabMeta(child).syncCategory));
  }, [currentRootMeta?.tabType, currentRootTab, rawRootChildren, selectedCategoryCode]);

  const activeChildTabIndex = currentRootTab
    ? Math.min(activeChildTabByParent[currentRootTab.id] ?? 0, Math.max(currentRootChildren.length - 1, 0))
    : 0;

  const effectiveTab = useMemo(() => {
    if (!currentRootTab) return null;
    if (currentRootMeta?.tabType === 'sync-group' && currentRootChildren.length > 0) {
      return currentRootChildren[activeChildTabIndex] ?? currentRootChildren[0] ?? currentRootTab;
    }
    return currentRootTab;
  }, [currentRootTab, currentRootMeta, currentRootChildren, activeChildTabIndex]);

  // Get fieldSets and fields for current tab
  const currentTabContent = useMemo(() => {
    if (!effectiveTab) return [];

    // Keep only unique set IDs to avoid duplicate render keys when a set is selected multiple times.
    const setIds = Array.from(new Set(getRealSetIds(effectiveTab)));

    return setIds
      .map((setId) => {
        const fieldSet = fieldSetById.get(normalizeId(setId));
        if (!fieldSet) return null;
        const fields = fieldSet.fields ?? [];

        return { fieldSet, fields };
      })
      .filter((item): item is { fieldSet: FieldSet; fields: DynamicField[] } => item !== null);
  }, [effectiveTab, fieldSetById]);

  const missingFieldSetIds = useMemo(() => {
    if (!effectiveTab) return [];
    return Array.from(new Set(
      getRealSetIds(effectiveTab)
        .filter((setId) => !fieldSetById.has(normalizeId(setId))),
    ));
  }, [effectiveTab, fieldSetById]);

  const missingFieldRefs = useMemo(() => {
    return currentTabContent.flatMap(({ fieldSet }) => {
      const fieldMap = new Set((fieldSet.fields ?? []).map((field) => field.id));
      return fieldSet.fieldIds
        .filter((fieldId) => !fieldMap.has(fieldId))
        .map((fieldId) => `${fieldSet.name}:${fieldId}`);
    });
  }, [currentTabContent]);

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

    rootTabs.forEach((rootTab) => {
      const rootMeta = parseTabMeta(rootTab);
      const tabsToCount = rootMeta.tabType === 'sync-group'
        ? (tabStructure.childrenByParent[rootTab.id] || []).filter((tab) =>
          matchesSyncCategory(selectedCategoryCode, parseTabMeta(tab).syncCategory))
        : [rootTab];

      tabsToCount.forEach((tab) => {
        const setIds = getRealSetIds(tab);
        setIds.forEach((setId) => {
          const fieldSet = fieldSetById.get(normalizeId(setId));
          if (fieldSet) {
            const fields = fieldSet.fields ?? [];

            totalFields += fields.length;
            filledFields += fields.filter(f => formData[f.key]?.trim()).length;
          }
        });
      });
    });

    if (totalFields === 0) return 0;
    return Math.round((filledFields / totalFields) * 100);
  }, [fieldSetById, formData, rootTabs, selectedCategoryCode, tabStructure]);

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
    if (!currentRootTab || !currentRootMeta) return;

    if (currentRootMeta.tabType === 'sync-group' && currentRootChildren.length > 0 && activeChildTabIndex > 0) {
      setActiveChildTabByParent((prev) => ({
        ...prev,
        [currentRootTab.id]: activeChildTabIndex - 1,
      }));
      return;
    }

    if (activeTab <= 0) return;

    const prevRootIndex = activeTab - 1;
    const prevRoot = rootTabs[prevRootIndex];
    if (!prevRoot) {
      setActiveTab(prevRootIndex);
      return;
    }

    const prevRootMeta = parseTabMeta(prevRoot);
    const prevChildren = tabStructure.childrenByParent[prevRoot.id] || [];

    setActiveTab(prevRootIndex);

    if (prevRootMeta.tabType === 'sync-group' && prevChildren.length > 0) {
      setActiveChildTabByParent((prev) => ({
        ...prev,
        [prevRoot.id]: prevChildren.length - 1,
      }));
    }
  }, [activeChildTabIndex, activeTab, currentRootChildren, currentRootMeta, currentRootTab, rootTabs, tabStructure]);

  const handleNextTab = useCallback(() => {
    if (!currentRootTab || !currentRootMeta) return;

    if (currentRootMeta.tabType === 'sync-group' && currentRootChildren.length > 0 && activeChildTabIndex < currentRootChildren.length - 1) {
      setActiveChildTabByParent((prev) => ({
        ...prev,
        [currentRootTab.id]: activeChildTabIndex + 1,
      }));
      return;
    }

    setActiveTab((prev) => Math.min(prev + 1, Math.max(rootTabs.length - 1, 0)));
  }, [activeChildTabIndex, currentRootChildren, currentRootMeta, currentRootTab, rootTabs.length]);

  useEffect(() => {
    if (rootTabs.length === 0) {
      if (activeTab !== 0) setActiveTab(0);
      return;
    }
    if (activeTab > rootTabs.length - 1) {
      setActiveTab(rootTabs.length - 1);
    }
  }, [activeTab, rootTabs.length]);

  const isAtStart = activeTab === 0 && !(currentRootMeta?.tabType === 'sync-group' && activeChildTabIndex > 0);
  const isAtEnd = activeTab >= rootTabs.length - 1
    && !(currentRootMeta?.tabType === 'sync-group' && currentRootChildren.length > 0 && activeChildTabIndex < currentRootChildren.length - 1);

  if (!formConfig) {
    return (
      <FormDialog
        open={open}
        onClose={onClose}
        mode="add"
        maxWidth="sm"
        title="Khong mo duoc form nhap dong"
        contentPadding={0}
        showConfirm={false}
        showCancel={false}
      >
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">
            {configError || 'Khong tim thay FormConfig hop le cho menu hien tai.'}
          </Alert>
        </Box>
      </FormDialog>
    );
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
            disabled={isAtStart}
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

            {!isAtEnd ? (
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
        {configError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {configError}
          </Alert>
        )}
        {missingFieldSetIds.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Tab hien tai dang tham chieu fieldset khong ton tai: {missingFieldSetIds.join(', ')}.
          </Alert>
        )}
        {missingFieldRefs.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            FieldSet hien tai dang thieu field active: {missingFieldRefs.join(', ')}.
          </Alert>
        )}
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
          {rootTabs.map((tab, index) => {
            const isActive = activeTab === index;
            const meta = parseTabMeta(tab);
            const childCount = (tabStructure.childrenByParent[tab.id] || []).length;

            return (
              <Tab
                key={`${tab.id}-${index}`}
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
                      {meta.tabType === 'sync-group' && childCount > 0 ? ` (${childCount} tab con)` : ''}
                    </Typography>
                  </Stack>
                }
              />
            );
          })}
        </Tabs>

        {currentRootMeta?.tabType === 'sync-group' && currentRootChildren.length > 0 && currentRootTab && (
          <Tabs
            value={activeChildTabIndex}
            onChange={(_, v) => {
              setActiveChildTabByParent((prev) => ({
                ...prev,
                [currentRootTab.id]: v,
              }));
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 3,
              minHeight: 44,
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50',
              '& .MuiTab-root': { minHeight: 44, py: 0.75 },
              '& .MuiTabs-indicator': { bgcolor: 'secondary.main' },
            }}
          >
            {currentRootChildren.map((child, index) => (
              <Tab
                key={`${child.id}-${index}`}
                value={index}
                label={child.label}
                sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: activeChildTabIndex === index ? 700 : 500 }}
              />
            ))}
          </Tabs>
        )}
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
                key={`${item.fieldSet.id}-${index}`}
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
                {currentRootMeta?.tabType === 'sync-group'
                  ? (selectedCategoryCode
                    ? `Chưa có bộ dữ liệu chi tiết nào được cấu hình cho mã danh mục "${selectedCategoryCode}".`
                    : 'Hãy chọn mã danh mục trang bị ở tab "Thông tin chung" để nạp tab chi tiết tương ứng.')
                  : 'Vui lòng cấu hình form trong phần "Cấu hình tham số"'}
              </Typography>
            </Box>
          )}

        </Box>
      </Box>
    </FormDialog>
  );
};

export default AddTrangBiDialog;
