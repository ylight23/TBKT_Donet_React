// ============================================================
// TechnicalFieldsTab – Tab thông số kỹ thuật
// Hiển thị các FieldSet được nạp động theo mã danh mục trang bị.
// Mỗi FieldSet luôn mở mặc định trong tab thông số kỹ thuật.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Collapse from '@mui/material/Collapse';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import CategoryIcon from '@mui/icons-material/Category';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';

import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
} from '../../types/thamSo';
import { FieldSetGroup } from './GeneralInfoTab';
import { FormSkeleton } from '../Skeletons';

// ── Types ─────────────────────────────────────────────────────
export interface TechnicalFieldSetItem {
  fieldSet: FieldSet;
  fields: DynamicField[];
}

export interface TechnicalFieldsTabProps {
  /** Danh sách FieldSet đã được lọc theo mã danh mục */
  technicalTabContent: TechnicalFieldSetItem[];
  technicalLoading: boolean;
  technicalError: string;
  /** Mã danh mục đang được chọn (để hiển thị gợi ý) */
  selectedCategoryCode: string;
  formData: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
}

// ── Default colors ────────────────────────────────────────────
const DEFAULT_SET_COLORS = ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

// ── Empty state helpers ──────────────────────────────────────
const EmptyStateLoading: React.FC<{ selectedCategoryCode: string }> = ({ selectedCategoryCode }) => (
  <Box>
    <FormSkeleton rows={6} cols={2} />
    {selectedCategoryCode && (
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, mt: -1, display: 'block', opacity: 0.65 }}>
        Mã danh mục: {selectedCategoryCode}
      </Typography>
    )}
  </Box>
);

const EmptyStateError: React.FC<{ error: string }> = ({ error }) => (
  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
    <SettingsSuggestIcon sx={{ fontSize: 32, mb: 1, opacity: 0.3, color: 'error.main' }} />
    <Typography variant="body2" fontWeight={600} color="error.main">
      Không thể tải thông số kỹ thuật
    </Typography>
    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.7 }}>
      {error}
    </Typography>
  </Box>
);

const EmptyStateNoCategory: React.FC = () => (
  <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
    <CategoryIcon sx={{ fontSize: 36, mb: 1.5, opacity: 0.2 }} />
    <Typography variant="body1" fontWeight={600}>
      Chưa chọn mã danh mục
    </Typography>
    <Typography variant="body2" sx={{ mt: 1, opacity: 0.6, maxWidth: 320, mx: 'auto' }}>
      Hãy chọn mã danh mục trang bị ở tab "Thông tin chung" để nạp thông số kỹ thuật tương ứng.
    </Typography>
  </Box>
);

const EmptyStateNoFields: React.FC<{ categoryCode: string }> = ({ categoryCode }) => (
  <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
    <SettingsSuggestIcon sx={{ fontSize: 36, mb: 1.5, opacity: 0.2 }} />
    <Typography variant="body1" fontWeight={600}>
      Chưa có trường dữ liệu được cấu hình
    </Typography>
    <Typography variant="body2" sx={{ mt: 1, opacity: 0.6, maxWidth: 360, mx: 'auto' }}>
      {`Chưa có thông số kỹ thuật được cấu hình cho mã danh mục "${categoryCode}".`}
    </Typography>
  </Box>
);

// ── CollapsibleFieldSet ────────────────────────────────────────
// Một FieldSet luôn hiển thị (không thu gọn) trong tab thông số kỹ thuật.
interface CollapsibleFieldSetProps {
  item: TechnicalFieldSetItem;
  index: number;
  formData: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  open: boolean;
  onToggle: () => void;
}

const CollapsibleFieldSet: React.FC<CollapsibleFieldSetProps> = ({
  item,
  index,
  formData,
  onFieldChange,
  open,
  onToggle,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const color = item.fieldSet.color || DEFAULT_SET_COLORS[index % DEFAULT_SET_COLORS.length];
  const fieldCount = item.fields?.length ?? 0;
  const filledCount = item.fields?.filter((f) => formData[f.key]?.trim()).length ?? 0;

  return (
    <Box
      sx={{
        mb: 1.5,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider}`,
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
        },
      }}
    >
      {/* Header – click để expand/collapse */}
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          cursor: 'pointer',
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
          userSelect: 'none',
          transition: 'background-color 0.15s',
        }}
      >
        {/* Color accent bar */}
        <Box
          sx={{
            width: 3,
            height: 22,
            borderRadius: '2px',
            bgcolor: color,
            flexShrink: 0,
          }}
        />

        {/* Expand icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: 'text.secondary',
            flexShrink: 0,
          }}
        >
          <ExpandMoreIcon
            sx={{
              fontSize: 18,
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: '0.82rem',
            color: 'text.primary',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.fieldSet.name || `Nhóm thông số ${index + 1}`}
        </Typography>

        {/* Field count badge */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {filledCount > 0 && (
            <Box
              sx={{
                px: 1,
                py: 0.1,
                borderRadius: '8px',
                bgcolor: 'success.main',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                lineHeight: 1.6,
              }}
            >
              {filledCount}/{fieldCount}
            </Box>
          )}
          {fieldCount > 0 && (
            <Box
              sx={{
                px: 1,
                py: 0.1,
                borderRadius: '8px',
                bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                color: 'text.secondary',
                fontSize: '0.65rem',
                fontWeight: 600,
                lineHeight: 1.6,
              }}
            >
              {fieldCount} trường
            </Box>
          )}
        </Stack>
      </Box>

      {/* Content */}
      <Collapse in={open} timeout={0}>
        <Box sx={{ px: 2, py: 1.5 }}>
          {item.fields && item.fields.length > 0 ? (
            <FieldSetGroup
              key={`${item.fieldSet.id}-render`}
              fieldSet={item.fieldSet}
              fields={item.fields}
              formData={formData}
              onFieldChange={onFieldChange}
              color={color}
              showSectionHeader
            />
          ) : (
            <Stack spacing={1.5}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={52}
                  sx={{ borderRadius: 2, opacity: 0.4 }}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────
const TechnicalFieldsTab: React.FC<TechnicalFieldsTabProps> = ({
  technicalTabContent,
  technicalLoading,
  technicalError,
  selectedCategoryCode,
  formData,
  onFieldChange,
}) => {
  const hasContent = technicalTabContent.length > 0;
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const fieldSetIds = useMemo(
    () => technicalTabContent.map((item, index) => item.fieldSet.id || `fallback-${index}`),
    [technicalTabContent],
  );

  useEffect(() => {
    const next: Record<string, boolean> = {};
    fieldSetIds.forEach((id) => {
      next[id] = openMap[id] ?? true;
    });
    setOpenMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldSetIds.join('|')]);

  // Loading ban đầu (chưa có content)
  if (technicalLoading && !hasContent) {
    return <EmptyStateLoading selectedCategoryCode={selectedCategoryCode} />;
  }

  // Lỗi
  if (technicalError && !hasContent) {
    return <EmptyStateError error={technicalError} />;
  }

  // Chưa chọn danh mục
  if (!selectedCategoryCode && !hasContent) {
    return <EmptyStateNoCategory />;
  }

  // Đã chọn danh mục nhưng không có thông số
  if (!hasContent) {
    return <EmptyStateNoFields categoryCode={selectedCategoryCode} />;
  }

  // Có content — hiển thị phẳng, không lồng thêm section/tab phụ
  return (
    <Stack spacing={0}>
      <Box sx={{ px: 0.5, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
          {technicalTabContent.length} nhóm thông số.
        </Typography>
      </Box>

      {technicalTabContent.map((item, index) => {
        const id = item.fieldSet.id || `fallback-${index}`;
        return (
          <CollapsibleFieldSet
            key={id}
            item={item}
            index={index}
            formData={formData}
            onFieldChange={onFieldChange}
            open={openMap[id] ?? true}
            onToggle={() => {
              setOpenMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
            }}
          />
        );
      })}

      {/* Loading spinner khi đang nạp thêm (đã có content trước đó) */}
      {technicalLoading && (
        <FormSkeleton rows={2} cols={2} />
      )}
    </Stack>
  );
};

export default TechnicalFieldsTab;
