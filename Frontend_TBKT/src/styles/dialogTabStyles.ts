/**
 * ══════════════════════════════════════════════════════════════════════
 *  DIALOG TAB STYLES — Shared MUI sx styles for tabbed form dialogs
 *
 *  Áp dụng cho tất cả form dialog có tabs (Thêm mới / Sửa):
 *  - Tabs header bar (sticky, border bottom)
 *  - Individual Tab items (selected, hover, indicator)
 *  - Tab content area (padding, scroll, background)
 *  - Dialog Paper size presets
 * ══════════════════════════════════════════════════════════════════════
 */

import { militaryColors } from '../theme';

// ─────────────────────────────────────────────────────────────────────
//  DIALOG PAPER SIZE PRESETS
// ─────────────────────────────────────────────────────────────────────

/** Dialog form tiêu chuẩn – rộng tối đa 960px, đủ cho form + side panel */
export const dialogPaperSx = {
  '& .MuiDialog-paper': {
    width: 'min(960px, calc(100vw - 32px))',
    maxHeight: '90vh',
    height: 'auto',
  },
} as const;

/** Dialog form rộng – rộng tối đa 1120px */
export const dialogPaperWideSx = {
  '& .MuiDialog-paper': {
    width: 'min(1120px, calc(100vw - 32px))',
    maxHeight: '88vh',
    height: 'auto',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
//  TAB HEADER CONTAINER (sticky bar chứa <Tabs>)
// ─────────────────────────────────────────────────────────────────────

export const dialogTabHeaderSx = (isDark: boolean) => ({
  bgcolor: 'background.paper',
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
  borderBottom: 1,
  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'divider',
});

// ─────────────────────────────────────────────────────────────────────
//  TABS COMPONENT sx (áp lên <Tabs>)
// ─────────────────────────────────────────────────────────────────────

/**
 * Tạo sx prop cho `<Tabs>` bên trong dialog.
 *
 * @param isDark    - theme.palette.mode === 'dark'
 * @param accent    - màu active indicator + selected text (default: militaryColors.navy)
 */
export const createDialogTabsSx = (
  isDark: boolean,
  accent: string = militaryColors.navy,
) => ({
  px: 1.5,
  minHeight: 40,
  '& .MuiTab-root': {
    minHeight: 40,
    py: 0.5,
    px: 2,
    mx: 0.25,
    textTransform: 'none' as const,
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    border: '1px solid',
    borderBottom: 0,
    borderColor: 'transparent',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
    '&.Mui-selected': {
      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : `${accent}0d`,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider',
      color: accent,
    },
    '&:not(.Mui-selected):hover': {
      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
  },
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: '3px 3px 0 0',
    bgcolor: accent,
  },
});

// ─────────────────────────────────────────────────────────────────────
//  TAB CONTENT AREA sx (vùng cuộn chứa nội dung tab)
// ─────────────────────────────────────────────────────────────────────

export const dialogTabContentSx = (isDark: boolean) => ({
  px: 2.5,
  py: 2,
  flex: 1,
  overflowY: 'auto' as const,
  bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50',
  minHeight: 280,
});

// ─────────────────────────────────────────────────────────────────────
//  ACTION BUTTON STYLES (Quay lại / Tiếp tục / Hủy / Lưu)
// ─────────────────────────────────────────────────────────────────────

export const dialogActionBtnSx = {
  textTransform: 'none' as const,
  fontWeight: 600,
  px: 2.25,
  py: 0.65,
  minWidth: 0,
  fontSize: 13,
};

export const dialogCancelBtnSx = {
  ...dialogActionBtnSx,
  borderColor: 'error.main',
  color: 'error.main',
  '&:hover': {
    borderColor: 'error.dark',
    bgcolor: 'error.main',
    color: '#fff',
  },
};

export const dialogPrimaryBtnSx = (accent: string = militaryColors.navy) => ({
  ...dialogActionBtnSx,
  fontWeight: 700,
  px: 2.75,
  bgcolor: accent,
  '&:hover': {
    bgcolor: accent,
    filter: 'brightness(1.1)',
  },
});

export const dialogSaveBtnSx = {
  ...dialogActionBtnSx,
  fontWeight: 700,
  px: 2.75,
  bgcolor: 'success.main',
  '&:hover': {
    bgcolor: 'success.dark',
  },
};
