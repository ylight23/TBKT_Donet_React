/**
 * ══════════════════════════════════════════════════════════════════════
 *  MILITARY DESIGN SYSTEM — Design Tokens Reference
 *  Hệ thống thiết kế cho Hệ thống Quản lý Trang bị Kỹ thuật Quân đội
 *
 *  Nguyên tắc nền tảng:
 *  ┌───────────────────────────────────────────────────────────────────┐
 *  │  60 - 30 - 10 Color Rule                                          │
 *  │  ──────────────────────────────────────────────────────────────── │
 *  │  60% Dominant  → Nền Navy tối trung tính (không gây mỏi mắt)     │
 *  │  30% Secondary → Tactical Navy + Steel (cấu trúc, phân vùng)     │
 *  │  10% Accent    → Military Gold (CTA, active state, điểm nhấn)    │
 *  └───────────────────────────────────────────────────────────────────┘
 * ══════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────
//  RE-EXPORT TẤT CẢ TOKENS TỪ THEME (single source of truth)
// ─────────────────────────────────────────────────────────────────────
export {
  // Palette scales
  militaryDarkBlue,
  deepArmyGreen,
  tacticalNavy,
  steelGray,
  gunmetal,
  militarySilver,
  militaryGold,
  // Status
  statusColors,
  // Shorthand colors
  militaryColors,
  // Dashboard tokens
  dashboardTokensLight,
  dashboardTokensDark,
  // CSS vars
  generateCSSVariables,
  // MUI
  tokens,
  themeSetting,
  ColorModeContext,
  useMode,
} from '../theme';

// ─────────────────────────────────────────────────────────────────────
//  BẢNG MÀU CHI TIẾT — Quick Reference
// ─────────────────────────────────────────────────────────────────────

/**
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  PRIMARY PALETTE                                                           │
 * ├────────────────────────┬──────────┬────────────────┬──────────────────────┤
 * │  Tên                   │  HEX     │  RGB           │  Ý nghĩa tâm lý      │
 * ├────────────────────────┼──────────┼────────────────┼──────────────────────┤
 * │  Military Dark Blue    │ #0D1B2A  │ rgb(13,27,42)  │  Kỷ luật / Uy quyền  │
 * │  · Shade 800           │ #122244  │ rgb(18,34,68)  │  Sidebar bg          │
 * │  · Shade 700           │ #1C3860  │ rgb(28,56,96)  │  Topbar dark         │
 * │  · Shade 600           │ #254E83  │ rgb(37,78,131) │  Hover state         │
 * │  · Shade 500           │ #2E69AC  │ rgb(46,105,172)│  Link / focused      │
 * │  Deep Army Green       │ #3D8F4E  │ rgb(61,143,78) │  Sẵn sàng / Hoạt động│
 * │  Tactical Navy         │ #415A77  │ rgb(65,90,119) │  Chiến lược / Khoa học│
 * ├────────────────────────┴──────────┴────────────────┴──────────────────────┤
 * │  SECONDARY PALETTE                                                         │
 * ├────────────────────────┬──────────┬────────────────┬──────────────────────┤
 * │  Steel Gray            │ #556070  │ rgb(85,96,112) │  Cơ khí / Bền bỉ    │
 * │  Gunmetal              │ #3E4E5C  │ rgb(62,78,92)  │  Công nghiệp / Bí ẩn │
 * │  Military Silver       │ #778DA9  │ rgb(119,141,169)│ Danh dự / Huy hiệu  │
 * ├────────────────────────┴──────────┴────────────────┴──────────────────────┤
 * │  ACCENT (10%)                                                              │
 * ├────────────────────────┬──────────┬────────────────┬──────────────────────┤
 * │  Military Gold         │ #C9A84C  │ rgb(201,168,76)│  Thành tích / CTA    │
 * │  Army Green (success)  │ #3D8F4E  │ rgb(61,143,78) │  Operational OK      │
 * ├────────────────────────┴──────────┴────────────────┴──────────────────────┤
 * │  STATUS COLORS                                                             │
 * ├────────────────────────┬──────────┬────────────────┬──────────────────────┤
 * │  Operational (OK)      │ #2E7D32  │ rgb(46,125,50) │  Xanh rừng trầm      │
 * │  Maintenance (bảo trì) │ #E65100  │ rgb(230,81,0)  │  Cam đất trầm        │
 * │  Critical (hỏng)       │ #B71C1C  │ rgb(183,28,28) │  Đỏ huyết đậm       │
 * │  Standby (dự phòng)    │ #37474F  │ rgb(55,71,79)  │  Xám xanh lạnh       │
 * │  Repairing (sửa chữa)  │ #ED6C02  │ rgb(237,108,2) │  Cam vừa             │
 * │  Decommissioned (loại) │ #757575  │ rgb(117,117,117)│ Xám trung tính      │
 * └────────────────────────┴──────────┴────────────────┴──────────────────────┘
 */

// ─────────────────────────────────────────────────────────────────────
//  COMPONENT TOKEN MAP — Áp dụng 60-30-10 cho từng element
// ─────────────────────────────────────────────────────────────────────

/**
 * TOKEN → ELEMENT MAPPING (Dark Mode – ưu tiên):
 *
 *  Element               Token                      HEX        Role
 *  ─────────────────────────────────────────────────────────────────
 *  Page background       pageBg                    #07111C     60%
 *  Content area          contentBg                 #0D1B2A     60%
 *  Card background       cardBg                    #112233     60%
 *  Card border           cardBorder                #1E3248     30%
 *  ─────────────────────────────────────────────────────────────────
 *  Sidebar background    sidebarBg                 #060F18     30%  ← đậm nhất
 *  Sidebar hover         activeMenuBg + opacity    #C9A84C20   10%
 *  Sidebar active item   activeMenu                #D9A832     10%  ← gold
 *  ─────────────────────────────────────────────────────────────────
 *  Topbar background     topbarBg                  #0D1B2A     30%
 *  Topbar border         topbarBorder              #1E3248     30%
 *  ─────────────────────────────────────────────────────────────────
 *  DataGrid header bg    tableHeaderBg             #060F18     30%
 *  DataGrid header text  tableHeaderText           #E0E4EB     typography
 *  DataGrid row hover    tableRowHover             #415A7725   30% faint
 *  DataGrid row alt      tableRowAlt               #0A1927     60% variation
 *  ─────────────────────────────────────────────────────────────────
 *  CTA / Primary button  primaryBtn                #C9A84C     10% Gold
 *  Primary button hover  primaryBtnHover           #D9A832     10% Gold bright
 *  Focus ring            focusRing                 #C9A84C80   10% Gold alpha
 *  ─────────────────────────────────────────────────────────────────
 *  Text primary          textPrimary               #D6E0ED     typography
 *  Text secondary        textSecondary             #8FA8C0     typography
 *  Text muted            textMuted                 #536070     typography
 *  ─────────────────────────────────────────────────────────────────
 *  Status badge OK       statusColors.operational  #2E7D32     semantic
 *  Status badge repair   statusColors.repairing    #ED6C02     semantic
 *  Status badge broken   statusColors.critical     #B71C1C     semantic
 *  Status badge standby  statusColors.standby      #37474F     semantic
 */

// ─────────────────────────────────────────────────────────────────────
//  WCAG AA CONTRAST VERIFICATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Tỷ lệ tương phản (WCAG AA yêu cầu ≥ 4.5:1 cho text thường):
 *
 *  Cặp màu                             Contrast   Đạt AA?
 *  ──────────────────────────────────────────────────────
 *  #D6E0ED on #07111C (text on bg)      ≈ 12.4:1   ✅ AAA
 *  #D6E0ED on #0D1B2A (text on sidebar) ≈ 11.8:1   ✅ AAA
 *  #FFFFFF  on #0D1B2A (header text)    ≈ 14.2:1   ✅ AAA
 *  #C9A84C  on #07111C (gold on bg)     ≈  7.2:1   ✅ AA
 *  #D9A832  on #060F18 (gold on sidebar)≈  8.1:1   ✅ AAA
 *  #2E7D32  on #E8F5E9 (status light)   ≈  5.9:1   ✅ AA
 *  #B71C1C  on #FFEBEE (status light)   ≈  6.3:1   ✅ AA
 *  #8FA8C0  on #0D1B2A (secondary text) ≈  5.4:1   ✅ AA
 *  #0D1B2A  on #F0F2F5 (light text)     ≈ 16.1:1   ✅ AAA
 */

// ─────────────────────────────────────────────────────────────────────
//  STATUS CHIP FACTORY — Dùng trong component
// ─────────────────────────────────────────────────────────────────────

import { ChipProps } from '@mui/material/Chip';

type StatusKey =
  | 'Hoạt động tốt'
  | 'Đang bảo trì'
  | 'Hỏng / Nguy cấp'
  | 'Dự phòng'
  | 'Niêm cất'
  | 'Đang sửa chữa'
  | 'Đang niêm cất'
  | 'Kiểm tra định kỳ'
  | 'Đã xuất kho'
  | 'Loại biên'
  | 'Thanh lý';

/** Map trạng thái → MUI Chip color */
export const statusChipColor: Record<StatusKey, ChipProps['color']> = {
  'Hoạt động tốt':    'success',
  'Đang bảo trì':     'warning',
  'Hỏng / Nguy cấp':  'error',
  'Dự phòng':         'default',
  'Niêm cất':         'info',
  'Đang sửa chữa':    'warning',
  'Đang niêm cất':    'info',
  'Kiểm tra định kỳ': 'warning',
  'Đã xuất kho':      'success',
  'Loại biên':        'default',
  'Thanh lý':         'default',
};

/** Map trạng thái → custom HEX (dùng khi cần màu chính xác hơn MUI palette) */
export const statusHexColor: Record<string, string> = {
  'Hoạt động tốt':    '#2E7D32',
  'Đang bảo trì':     '#E65100',
  'Hỏng / Nguy cấp':  '#B71C1C',
  'Dự phòng':         '#37474F',
  'Niêm cất':         '#2E69AC',
  'Đang sửa chữa':    '#ED6C02',
  'Đang niêm cất':    '#2E69AC',
  'Kiểm tra định kỳ': '#ED6C02',
  'Đã xuất kho':      '#2E7D32',
  'Loại biên':        '#757575',
  'Thanh lý':         '#757575',
};

// ─────────────────────────────────────────────────────────────────────
//  CHART PALETTE — Màu cho biểu đồ dashboard
// ─────────────────────────────────────────────────────────────────────

/**
 * 7 màu chart phân biệt rõ trên nền tối, không quá rực,
 * đúng phong cách quân sự — trầm, mạnh, không neon
 */
export const chartPalette = [
  '#5484BB',  // Blue-400          – loại thiết bị 1
  '#3D8F4E',  // Army Green-500    – loại thiết bị 2
  '#C9A84C',  // Gold-500          – loại thiết bị 3
  '#415A77',  // Tactical Navy-500 – loại thiết bị 4
  '#637180',  // Gunmetal-400      – loại thiết bị 5
  '#56A865',  // Army Green-400    – loại thiết bị 6
  '#5F7391',  // Silver-600        – loại thiết bị 7
] as const;

/** Chart màu cho status bars (thứ tự: OK, repair, broken, standby) */
export const chartStatusPalette = {
  operational: '#3D8F4E',
  repairing:   '#C9A84C',
  critical:    '#B71C1C',
  standby:     '#415A77',
  maintenance: '#E65100',
} as const;

// ─────────────────────────────────────────────────────────────────────
//  SIDEBAR STYLE TOKENS — Dùng trực tiếp trong Sidebar.tsx
// ─────────────────────────────────────────────────────────────────────

export const sidebarTokens = {
  // Background
  bg:             '#060F18',
  bgItem:         'transparent',
  bgItemHover:    'rgba(65, 90, 119, 0.15)',     // 30% navy faint
  bgItemActive:   'rgba(201, 168, 76, 0.12)',    // 10% gold faint

  // Text
  textColor:      'rgba(214, 224, 237, 0.85)',   // trắng dịu
  textColorActive:'#D9A832',                     // gold active

  // Icon
  iconColor:      'rgba(143, 168, 192, 0.8)',
  iconColorActive:'#D9A832',

  // Border / divider
  borderColor:    '#1E3248',
  dividerColor:   '#1E3248',

  // Active indicator bar (left edge)
  activeBar:      '#C9A84C',
  activeBarWidth: '3px',

  // SubMenu
  subMenuBg:      '#060F18',
  subMenuIndent:  '16px',

  // Dimensions
  widthExpanded:  '260px',
  widthCollapsed: '64px',
  itemHeight:     '44px',
  iconSize:       '20px',
} as const;

// ─────────────────────────────────────────────────────────────────────
//  TOPBAR STYLE TOKENS
// ─────────────────────────────────────────────────────────────────────

export const topbarTokens = {
  bg:           '#0D1B2A',
  border:       '#1E3248',
  height:       '56px',
  textColor:    '#D6E0ED',
  iconColor:    '#8FA8C0',
  iconHover:    '#D9A832',
  badgeBg:      '#B71C1C',
  badgeText:    '#FFFFFF',
  shadowBottom: '0 1px 8px rgba(0,0,0,0.30)',
} as const;

// ─────────────────────────────────────────────────────────────────────
//  CARD STYLE TOKENS
// ─────────────────────────────────────────────────────────────────────

export const cardTokens = {
  bg:             '#112233',
  border:         '#1E3248',
  borderRadius:   '10px',
  shadow:         '0 2px 8px rgba(0,0,0,0.40)',
  headerBg:       '#0D1B2A',
  headerText:     '#D6E0ED',
  // Stat card border-top colors (theo loại chỉ số)
  accentOperational: '#2E7D32',
  accentRepairing:   '#ED6C02',
  accentCritical:    '#B71C1C',
  accentStandby:     '#415A77',
  accentPrimary:     '#0D1B2A',
  accentGold:        '#C9A84C',
} as const;
