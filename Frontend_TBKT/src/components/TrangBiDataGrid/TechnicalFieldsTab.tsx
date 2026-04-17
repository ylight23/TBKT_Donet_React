// ============================================================
// TechnicalFieldsTab – Tab thông số kỹ thuật
// Hiển thị các FieldSet được nạp động theo mã danh mục trang bị
// ============================================================
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import CategoryIcon from '@mui/icons-material/Category';

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
  setColors?: string[];
}

const DEFAULT_SET_COLORS = ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

// ── Main component ────────────────────────────────────────────
const TechnicalFieldsTab: React.FC<TechnicalFieldsTabProps> = ({
  technicalTabContent,
  technicalLoading,
  technicalError,
  selectedCategoryCode,
  formData,
  onFieldChange,
  setColors = DEFAULT_SET_COLORS,
}) => {
  const hasContent = technicalTabContent.length > 0;

  // Loading ban đầu (chưa có content)
  if (technicalLoading && !hasContent) {
    return (
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
  }

  // Lỗi
  if (technicalError && !hasContent) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
        <SettingsSuggestIcon sx={{ fontSize: 32, mb: 1, opacity: 0.3, color: 'error.main' }} />
        <Typography variant="body2" fontWeight={600} color="error.main">
          Không thể tải thông số kỹ thuật
        </Typography>
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.7 }}>
          {technicalError}
        </Typography>
      </Box>
    );
  }

  // Chưa chọn danh mục
  if (!selectedCategoryCode && !hasContent) {
    return (
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
  }

  // Đã chọn danh mục nhưng không có thông số
  if (!hasContent) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
        <SettingsSuggestIcon sx={{ fontSize: 36, mb: 1.5, opacity: 0.2 }} />
        <Typography variant="body1" fontWeight={600}>
          Chưa có trường dữ liệu được cấu hình
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.6, maxWidth: 360, mx: 'auto' }}>
          {`Chưa có thông số kỹ thuật được cấu hình cho mã danh mục "${selectedCategoryCode}".`}
        </Typography>
      </Box>
    );
  }

  // Có content — dùng FieldSetGroup với showSectionHeader để phân nhóm rõ ràng
  return (
    <>
      {technicalTabContent.map((item, index) => (
        <FieldSetGroup
          key={item.fieldSet.id ?? index}
          fieldSet={item.fieldSet}
          fields={item.fields}
          formData={formData}
          onFieldChange={onFieldChange}
          color={item.fieldSet.color || setColors[index % setColors.length]}
          showSectionHeader
        />
      ))}
      {/* Loading spinner khi đang nạp thêm (đã có content trước đó) */}
      {technicalLoading && (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
          <CircularProgress size={20} sx={{ mb: 1 }} />
          <Typography variant="body2">Đang tải thêm thông số kỹ thuật...</Typography>
        </Box>
      )}
    </>
  );
};

export default TechnicalFieldsTab;
