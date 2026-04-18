// ============================================================
// TechnicalFieldsTab – Tab thông số kỹ thuật
// Hiển thị các FieldSet được nạp động theo mã danh mục trang bị.
// Mỗi FieldSet collapsed mặc định, expand on-demand — giảm DOM
// render khi có nhiều bộ dữ liệu.
// ============================================================
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Collapse from '@mui/material/Collapse';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import CategoryIcon from '@mui/icons-material/Category';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';

import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
} from '../../types/thamSo';
import { FieldSetGroup } from './GeneralInfoTab';

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
  <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
    <CircularProgress size={28} sx={{ mb: 2 }} />
    <Typography variant="body2" fontWeight={600}>
      Đang tải thông số kỹ thuật...
    </Typography>
    {selectedCategoryCode && (
      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.65 }}>
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
// Một FieldSet có thể collapsed/expanded. Mặc định collapsed.
interface CollapsibleFieldSetProps {
  item: TechnicalFieldSetItem;
  index: number;
  formData: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
}

const CollapsibleFieldSet: React.FC<CollapsibleFieldSetProps> = ({
  item,
  index,
  formData,
  onFieldChange,
}) => {
  const [expanded, setExpanded] = useState(false);
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
        onClick={() => setExpanded((prev) => !prev)}
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
          '&:hover': {
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)',
          },
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
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          {expanded
            ? <ExpandMoreIcon sx={{ fontSize: 18 }} />
            : <ChevronRightIcon sx={{ fontSize: 18 }} />
          }
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

      {/* Content – lazy render khi expanded */}
      <Collapse in={expanded} timeout={250}>
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

  // Có content — collapsible FieldSets
  return (
    <Stack spacing={0}>
      {/* Summary header */}
      <Box sx={{ px: 0.5, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
          Nhấn vào nhóm để mở rộng/thu gọn. {technicalTabContent.length} nhóm thông số.
        </Typography>
      </Box>

      {technicalTabContent.map((item, index) => (
        <CollapsibleFieldSet
          key={item.fieldSet.id ?? `fallback-${index}`}
          item={item}
          index={index}
          formData={formData}
          onFieldChange={onFieldChange}
        />
      ))}

      {/* Loading spinner khi đang nạp thêm (đã có content trước đó) */}
      {technicalLoading && (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
          <CircularProgress size={20} sx={{ mb: 1 }} />
          <Typography variant="body2">Đang tải thêm thông số kỹ thuật...</Typography>
        </Box>
      )}
    </Stack>
  );
};

export default TechnicalFieldsTab;
