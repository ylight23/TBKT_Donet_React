/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  MILITARY TECHNICAL EQUIPMENT MANAGEMENT SYSTEM                    ║
 * ║  Design System — Color Tokens & MUI Theme                          ║
 * ║  Version : 2.0.0                                                   ║
 * ║  Chuẩn   : WCAG AA | Material Design 3 | Quy tắc 60-30-10         ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  QUY TẮC 60 - 30 - 10 (áp dụng cho giao diện quân sự)          │
 * │                                                                   │
 * │  60% → Dominant / Nền chủ đạo                                    │
 * │        Vietnam Army Olive (OD Green) – quân phục QĐNDVN          │
 * │        Light: #F0F2F5 (bg) + #FFFFFF (card)                       │
 * │        Dark : #0C1203 (bg) + #152008 (sidebar) + #1A280A (card)  │
 * │                                                                   │
 * │  30% → Secondary / Hỗ trợ cấu trúc                               │
 * │        Tactical Navy + Steel Gray                                 │
 * │        Dùng cho: card border, header, icon, typography phụ       │
 * │                                                                   │
 * │  10% → Accent / Điểm nhấn hành động                              │
 * │        Military Gold #C9A84C + Army Green #3D8F4E                │
 * │        Dùng cho: CTA button, active badge, highlight              │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { createContext, useState, useMemo } from 'react';
import { createTheme, Theme, PaletteMode } from '@mui/material/styles';

// ═══════════════════════════════════════════════════════════════════
//  SECTION 1 — PRIMARY PALETTE SCALES  (50 → 900)
// ═══════════════════════════════════════════════════════════════════

/**
 * 🪖 Vietnam Army Olive — Màu quân phục Quân đội Nhân dân Việt Nam (dominant 60%)
 * Tâm lý: Kiên định – Tổ quốc – Rừng núi – Sức mạnh nội tâm
 * HEX base: #5A7A28  |  RGB: (90, 122, 40)
 * Dùng: Sidebar, Topbar, DataGrid header, Page background family
 * Ref: Quân phục xanh đồng phục QĐNDVN (Olive Drab / OD Green)
 */
export const armyOlive = {
  50: '#EEF2E6',
  100: '#D1DCBA',
  200: '#B3C68B',
  300: '#94AF5C',
  400: '#799D38',
  500: '#5A7A28',
  600: '#46601E',
  700: '#334815',
  800: '#21300D',
  900: '#131C07',
} as const;

/** @deprecated Dùng armyOlive thay thế. Giữ lại để tương thích code cũ. */
export const militaryDarkBlue = armyOlive;

/**
 * 🌿 Deep Army Green — Màu kỹ thuật quân sự
 * Tâm lý: Hoạt động – Sẵn sàng chiến đấu – Thiên nhiên – Kiên nhẫn
 * RGB base: rgb(61, 143, 78)
 * Dùng: Operational status, Success badge, Active indicator
 */
export const deepArmyGreen = {
  50: '#EBF5EE',
  100: '#C6E5CE',
  200: '#9ED3AA',
  300: '#75C186',
  400: '#56A865',
  500: '#3D8F4E',
  600: '#2E7040',
  700: '#1F5230',
  800: '#163924',
  900: '#0C2217',
} as const;

/**
 * ⚓ Tactical Navy — Màu hải quân tác chiến
 * Tâm lý: Chiến lược – Chính xác – Sâu sắc – Khoa học
 * RGB base: rgb(65, 90, 119)
 * Dùng: Card border, Secondary button, Sub-header
 */
export const tacticalNavy = {
  50: '#ECF0F5',
  100: '#C8D3E3',
  200: '#A1B3CE',
  300: '#7A93B9',
  400: '#5A77A7',
  500: '#415A77',
  600: '#344A63',
  700: '#263950',
  800: '#19293C',
  900: '#0D1928',
} as const;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 2 — SECONDARY PALETTE (Steel / Gunmetal / Silver)
// ═══════════════════════════════════════════════════════════════════

/**
 * 🪖 Steel Gray — Thép quân sự
 * Tâm lý: Lạnh lùng – Kỷ luật – Bền bỉ – Cơ khí
 * RGB base: rgb(85, 96, 112)
 * Dùng: Divider, subtle border, muted text, disabled state
 */
export const steelGray = {
  50: '#F5F6F7',
  100: '#E4E7EB',
  200: '#CBD1D9',
  300: '#A8B2BE',
  400: '#7B8898',
  500: '#556070',
  600: '#424D5C',
  700: '#313A47',
  800: '#202830',
  900: '#131920',
} as const;

/**
 * 🔩 Gunmetal — Nòng súng / Vỏ thiết giáp
 * Tâm lý: Bí ẩn – Công nghiệp – Mạnh mẽ
 * RGB base: rgb(62, 78, 92)
 * Dùng: DataGrid row alt bg (dark), Tooltip bg
 */
export const gunmetal = {
  50: '#F2F4F5',
  100: '#DADEE1',
  200: '#B8BFC5',
  300: '#8F9BA5',
  400: '#637180',
  500: '#3E4E5C',
  600: '#303D49',
  700: '#232C36',
  800: '#171C23',
  900: '#0C1014',
} as const;

/**
 * ✨ Military Silver — Huy hiệu / Phù hiệu quân hàm
 * Tâm lý: Danh dự – Thành tích – Tinh tế
 * RGB base: rgb(119, 141, 169)
 * Dùng: Badge hạng nhất, Accent icon trên dark bg
 */
export const militarySilver = {
  50: '#FAFAFA',
  100: '#F0F0F2',
  200: '#DCDDE2',
  300: '#C1C3CC',
  400: '#A2A5B0',
  500: '#778DA9',
  600: '#5F7391',
  700: '#495A78',
  800: '#33415F',
  900: '#1E2946',
} as const;

/**
 * 🥇 Military Gold — Phù hiệu / Huân chương
 * Tâm lý: Thành tích – Uy danh – Giá trị cao – Cảnh báo quan trọng
 * RGB base: rgb(201, 168, 76)
 * Dùng: 10% Accent — Active menu, CTA primary, Award badge
 */
export const militaryGold = {
  50: '#FDF8EE',
  100: '#F9EDCC',
  200: '#F2D98A',
  300: '#E8C257',
  400: '#D9A832',
  500: '#C9A84C',
  600: '#A88638',
  700: '#82642A',
  800: '#5C441C',
  900: '#35270F',
} as const;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 3 — STATUS COLORS (Chuẩn quân sự – Operational Status)
// ═══════════════════════════════════════════════════════════════════

export const statusColors = {
  operational: {
    main: '#2E7D32',  // rgb(46,125,50)  – Xanh rừng trầm
    light: '#4CAF50',
    dark: '#1B5E20',
    bg: '#E8F5E9',
    bgDark: '#0F2D10',
    label: 'Hoạt động tốt',
  },
  maintenance: {
    main: '#E65100',  // rgb(230,81,0)   – Cam trầm
    light: '#FF8C42',
    dark: '#BF360C',
    bg: '#FBE9E7',
    bgDark: '#2D1300',
    label: 'Đang bảo trì',
  },
  critical: {
    main: '#B71C1C',  // rgb(183,28,28)  – Đỏ huyết đậm
    light: '#EF5350',
    dark: '#7F0000',
    bg: '#FFEBEE',
    bgDark: '#2D0000',
    label: 'Hỏng / Nguy cấp',
  },
  standby: {
    main: '#37474F',  // rgb(55,71,79)   – Xám xanh lạnh
    light: '#607D8B',
    dark: '#263238',
    bg: '#ECEFF1',
    bgDark: '#0E1517',
    label: 'Dự phòng / Niêm cất',
  },
  repairing: {
    main: '#ED6C02',  // rgb(237,108,2)  – Cam vừa
    light: '#FF9800',
    dark: '#C43E00',
    bg: '#FFF3E0',
    bgDark: '#2A1500',
    label: 'Đang sửa chữa',
  },
  decommissioned: {
    main: '#757575',  // rgb(117,117,117) – Xám trung tính
    light: '#9E9E9E',
    dark: '#424242',
    bg: '#FAFAFA',
    bgDark: '#1A1A1A',
    label: 'Loại biên / Thanh lý',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 4 — MILITARY COLORS (Shorthand – backward compatible)
// ═══════════════════════════════════════════════════════════════════

export const militaryColors = {
  // 60% Dominant — Vietnam Army Olive
  darkBlue: armyOlive[900],   // '#131C07' — compat alias kept
  midBlue: armyOlive[800],   // '#21300D' — compat alias kept
  navy: tacticalNavy[500],
  // 30% Secondary
  steel: militarySilver[500],
  gunmetal: gunmetal[500],
  lightSteel: steelGray[100],
  // 10% Accent
  gold: militaryGold[500],
  armyGreen: deepArmyGreen[500],
  // Semantic
  success: statusColors.operational.main,
  warning: statusColors.repairing.main,
  error: statusColors.critical.main,
  info: tacticalNavy[400],
} as const;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 5 — DASHBOARD COMPONENT TOKENS
//  Cụ thể hóa 60-30-10 cho từng element giao diện
// ═══════════════════════════════════════════════════════════════════

/**
 * ─── GRADIENT GREEN (30% Secondary Rule) ─────────────────────────────────────
 * 2 màu stop duy nhất — 90deg — green base thuần
 * Light: xanh sáng  → xanh đậm
 * Dark : xanh đậm   → xanh rất tối
 */
export const gradientGreen = {
  // ── Light (tông sáng) ──────────────────────────────────────────────────
  light: 'linear-gradient(90deg, #66BB6A, #2E7D32)',   // bright → forest
  lightSubtle: 'linear-gradient(90deg, #E8F5E9, #C8E6C9)',   // pale mint → soft green
  lightBtn: 'linear-gradient(90deg, #4CAF50, #2E7D32)',   // medium → forest
  lightBtnHov: 'linear-gradient(90deg, #388E3C, #1B5E20)',   // forest → deep
  lightHeader: 'linear-gradient(90deg, #4CAF50, #1B5E20)',   // medium → deep
  lightSidebar: 'linear-gradient(180deg, #4CAF50, #1B5E20)',  // top bright → bottom deep
  // ── Dark (tông tối) ──────────────────────────────────────────────────
  dark: 'linear-gradient(90deg, #2E7D32, #071A0A)',   // forest → near-black
  darkSubtle: 'linear-gradient(90deg, #1B5E20, #071A0A)',   // deep → near-black
  darkBtn: 'linear-gradient(90deg, #388E3C, #1B5E20)',   // forest → deep
  darkBtnHov: 'linear-gradient(90deg, #2E7D32, #0D3B12)',   // forest → very dark
  darkHeader: 'linear-gradient(90deg, #2E7D32, #071A0A)',   // forest → near-black
  darkSidebar: 'linear-gradient(180deg, #2E7D32, #071A0A)',  // top forest → bottom dark
} as const;

export const dashboardTokensLight = {
  pageBg: '#F4F7F4',
  contentBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: '#C8E6C9',
  sidebarBg: '#2E7D32',
  sidebarBorder: '#1B5E20',
  sidebarGradient: gradientGreen.lightSidebar,
  topbarBg: '#FFFFFF',
  topbarBorder: '#C8E6C9',
  tableHeaderBg: '#43A047',
  tableHeaderGradient: gradientGreen.lightHeader,
  tableHeaderText: '#FFFFFF',
  tableRowAlt: '#F1F8F1',
  tableRowHover: 'rgba(46,125,50,0.08)',
  divider: '#C8E6C9',
  activeMenu: militaryGold[500],
  activeMenuBg: '#C9A84C18',
  primaryBtn: '#2E7D32',
  primaryBtnGradient: gradientGreen.lightBtn,
  primaryBtnHoverGradient: gradientGreen.lightBtnHov,
  primaryBtnHover: '#1B5E20',
  secondaryAccentGradient: gradientGreen.light,
  cardAccentGradient: gradientGreen.lightSubtle,
  focusRing: '#4CAF5066',
  textPrimary: '#0D0D0D',
  textSecondary: '#424242',
  textMuted: '#757575',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.72)',
} as const;

export const dashboardTokensDark = {
  pageBg: '#050D06',
  contentBg: '#0A140B',
  cardBg: '#0C1A0E',
  cardBorder: '#163B19',
  sidebarBg: '#071009',
  sidebarBorder: '#122415',
  sidebarGradient: gradientGreen.darkSidebar,
  topbarBg: '#0A140B',
  topbarBorder: '#163B19',
  tableHeaderBg: '#1B5E20',
  tableHeaderGradient: gradientGreen.darkHeader,
  tableHeaderText: '#FFFFFF',
  tableRowAlt: '#081009',
  tableRowHover: 'rgba(76,175,80,0.12)',
  divider: '#163B19',
  activeMenu: militaryGold[400],
  activeMenuBg: '#C9A84C20',
  primaryBtn: '#2E7D32',
  primaryBtnGradient: gradientGreen.darkBtn,
  primaryBtnHoverGradient: gradientGreen.darkBtnHov,
  primaryBtnHover: '#1B5E20',
  secondaryAccentGradient: gradientGreen.dark,
  cardAccentGradient: gradientGreen.darkSubtle,
  focusRing: '#4CAF5050',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.50)',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.60)',
} as const;

// ═══════════════════════════════════════════════════════════════════
//  SECTION 6 — LEGACY TOKEN MAP (tương thích code cũ)
// ═══════════════════════════════════════════════════════════════════
interface ColorShades {
  100: string; 200: string; 300: string; 400: string; 500: string;
  600: string; 700: string; 800: string; 900: string;
}
interface TokenColors {
  grey: ColorShades;
  primary: ColorShades;
  greenAccent: ColorShades;
  redAccent: ColorShades;
  blueAccent: ColorShades;
}

export const tokens = (mode: PaletteMode): TokenColors => ({
  ...(mode === 'dark'
    ? {
      grey: {
        100: steelGray[100], 200: steelGray[200], 300: steelGray[300],
        400: steelGray[400], 500: steelGray[500], 600: steelGray[600],
        700: steelGray[700], 800: steelGray[800], 900: steelGray[900],
      },
      primary: {
        100: armyOlive[100], 200: armyOlive[200],
        300: armyOlive[300], 400: armyOlive[900],  // sidebar bg in dark mode
        500: armyOlive[500], 600: armyOlive[600],
        700: armyOlive[700], 800: armyOlive[800],
        900: armyOlive[900],
      },
      greenAccent: {
        100: deepArmyGreen[100], 200: deepArmyGreen[200], 300: deepArmyGreen[300],
        400: deepArmyGreen[400], 500: deepArmyGreen[500], 600: deepArmyGreen[600],
        700: deepArmyGreen[700], 800: deepArmyGreen[800], 900: deepArmyGreen[900],
      },
      redAccent: {
        100: '#2c100f', 200: '#58201e', 300: '#832f2c', 400: '#af3f3b',
        500: '#db4f4a', 600: '#e2726e', 700: '#e99592', 800: '#f1b9b7', 900: '#f8dcdb',
      },
      blueAccent: {
        100: tacticalNavy[100], 200: tacticalNavy[200], 300: tacticalNavy[300],
        400: tacticalNavy[400], 500: tacticalNavy[500], 600: tacticalNavy[600],
        700: tacticalNavy[700], 800: tacticalNavy[800], 900: tacticalNavy[900],
      },
    }
    : {
      grey: {
        100: steelGray[900], 200: steelGray[800], 300: steelGray[700],
        400: steelGray[600], 500: steelGray[500], 600: steelGray[400],
        700: steelGray[300], 800: steelGray[200], 900: steelGray[100],
      },
      primary: {
        100: armyOlive[900], 200: armyOlive[800],
        300: armyOlive[700], 400: '#F0F2F5',
        500: armyOlive[500], 600: armyOlive[400],
        700: armyOlive[300], 800: armyOlive[200],
        900: armyOlive[100],
      },
      greenAccent: {
        100: deepArmyGreen[900], 200: deepArmyGreen[800], 300: deepArmyGreen[700],
        400: deepArmyGreen[600], 500: deepArmyGreen[500], 600: deepArmyGreen[400],
        700: deepArmyGreen[300], 800: deepArmyGreen[200], 900: deepArmyGreen[100],
      },
      redAccent: {
        100: '#2c100f', 200: '#58201e', 300: '#832f2c', 400: '#af3f3b',
        500: '#db4f4a', 600: '#e2726e', 700: '#e99592', 800: '#f1b9b7', 900: '#f8dcdb',
      },
      blueAccent: {
        100: tacticalNavy[900], 200: tacticalNavy[800], 300: tacticalNavy[700],
        400: tacticalNavy[600], 500: tacticalNavy[500], 600: tacticalNavy[400],
        700: tacticalNavy[300], 800: tacticalNavy[200], 900: tacticalNavy[100],
      },
    }),
});

// ═══════════════════════════════════════════════════════════════════
//  SECTION 7 — CSS VARIABLES GENERATOR
// ═══════════════════════════════════════════════════════════════════
export function generateCSSVariables(): Record<string, string> {
  return {
    '--mil-olive-50': armyOlive[50], '--mil-olive-100': armyOlive[100],
    '--mil-olive-200': armyOlive[200], '--mil-olive-300': armyOlive[300],
    '--mil-olive-400': armyOlive[400], '--mil-olive-500': armyOlive[500],
    '--mil-olive-600': armyOlive[600], '--mil-olive-700': armyOlive[700],
    '--mil-olive-800': armyOlive[800], '--mil-olive-900': armyOlive[900],

    '--mil-green-50': deepArmyGreen[50], '--mil-green-100': deepArmyGreen[100],
    '--mil-green-200': deepArmyGreen[200], '--mil-green-300': deepArmyGreen[300],
    '--mil-green-400': deepArmyGreen[400], '--mil-green-500': deepArmyGreen[500],
    '--mil-green-600': deepArmyGreen[600], '--mil-green-700': deepArmyGreen[700],
    '--mil-green-800': deepArmyGreen[800], '--mil-green-900': deepArmyGreen[900],

    '--mil-navy-50': tacticalNavy[50], '--mil-navy-100': tacticalNavy[100],
    '--mil-navy-200': tacticalNavy[200], '--mil-navy-300': tacticalNavy[300],
    '--mil-navy-400': tacticalNavy[400], '--mil-navy-500': tacticalNavy[500],
    '--mil-navy-600': tacticalNavy[600], '--mil-navy-700': tacticalNavy[700],
    '--mil-navy-800': tacticalNavy[800], '--mil-navy-900': tacticalNavy[900],

    '--mil-steel-50': steelGray[50], '--mil-steel-100': steelGray[100],
    '--mil-steel-200': steelGray[200], '--mil-steel-300': steelGray[300],
    '--mil-steel-400': steelGray[400], '--mil-steel-500': steelGray[500],
    '--mil-steel-600': steelGray[600], '--mil-steel-700': steelGray[700],
    '--mil-steel-800': steelGray[800], '--mil-steel-900': steelGray[900],

    '--mil-gold-50': militaryGold[50], '--mil-gold-100': militaryGold[100],
    '--mil-gold-200': militaryGold[200], '--mil-gold-300': militaryGold[300],
    '--mil-gold-400': militaryGold[400], '--mil-gold-500': militaryGold[500],
    '--mil-gold-600': militaryGold[600], '--mil-gold-700': militaryGold[700],
    '--mil-gold-800': militaryGold[800], '--mil-gold-900': militaryGold[900],

    '--status-operational': statusColors.operational.main,
    '--status-operational-bg': statusColors.operational.bg,
    '--status-maintenance': statusColors.maintenance.main,
    '--status-maintenance-bg': statusColors.maintenance.bg,
    '--status-critical': statusColors.critical.main,
    '--status-critical-bg': statusColors.critical.bg,
    '--status-standby': statusColors.standby.main,
    '--status-standby-bg': statusColors.standby.bg,
    '--status-repairing': statusColors.repairing.main,
    '--status-repairing-bg': statusColors.repairing.bg,

    '--color-primary': militaryColors.darkBlue,
    '--color-secondary': militaryColors.navy,
    '--color-accent': militaryColors.gold,
    '--color-success': militaryColors.success,
    '--color-warning': militaryColors.warning,
    '--color-error': militaryColors.error,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 8 — MUI createTheme FACTORY
// ═══════════════════════════════════════════════════════════════════
export const themeSetting = (mode: PaletteMode) => {
  const isDark = mode === 'dark';
  const dt = isDark ? dashboardTokensDark : dashboardTokensLight;

  return {
    palette: {
      mode,
      primary: {
        main: militaryColors.darkBlue,
        light: armyOlive[600],
        dark: armyOlive[900],
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: militaryColors.navy,
        light: tacticalNavy[400],
        dark: tacticalNavy[700],
        contrastText: '#FFFFFF',
      },
      success: {
        main: statusColors.operational.main,
        light: statusColors.operational.light,
        dark: statusColors.operational.dark,
      },
      warning: {
        main: statusColors.repairing.main,
        light: statusColors.repairing.light,
        dark: statusColors.repairing.dark,
      },
      error: {
        main: statusColors.critical.main,
        light: statusColors.critical.light,
        dark: statusColors.critical.dark,
      },
      info: {
        main: militaryColors.info,
        light: tacticalNavy[300],
        dark: tacticalNavy[700],
      },
      background: {
        default: dt.pageBg,
        paper: dt.cardBg,
      },
      text: {
        primary: dt.textPrimary,
        secondary: dt.textSecondary,
        disabled: dt.textMuted,
      },
      divider: dt.divider,
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: ['Inter', 'Roboto', 'sans-serif'].join(','),
      fontSize: 13,
      h1: { fontFamily: 'Inter, Roboto, sans-serif', fontSize: 36, fontWeight: 700, letterSpacing: '-0.5px' },
      h2: { fontFamily: 'Inter, Roboto, sans-serif', fontSize: 28, fontWeight: 700 },
      h3: { fontFamily: 'Inter, Roboto, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' },
      h4: { fontFamily: 'Inter, Roboto, sans-serif', fontSize: 18, fontWeight: 600 },
      h5: { fontFamily: 'Inter, Roboto, sans-serif', fontSize: 15, fontWeight: 600 },
      h6: { fontFamily: 'Inter, Roboto, sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' },
      body1: { fontSize: 14, lineHeight: 1.6 },
      body2: { fontSize: 13, lineHeight: 1.5 },
      caption: { fontSize: 11.5, letterSpacing: '0.3px' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            ...generateCSSVariables(),
            // ── Gradient Green CSS vars (30% rule) ──
            '--gradient-green-primary': isDark ? gradientGreen.dark : gradientGreen.light,
            '--gradient-green-subtle': isDark ? gradientGreen.darkSubtle : gradientGreen.lightSubtle,
            '--gradient-green-btn': isDark ? gradientGreen.darkBtn : gradientGreen.lightBtn,
            '--gradient-green-btn-hov': isDark ? gradientGreen.darkBtnHov : gradientGreen.lightBtnHov,
            '--gradient-green-header': isDark ? gradientGreen.darkHeader : gradientGreen.lightHeader,
            '--gradient-green-sidebar': isDark ? gradientGreen.darkSidebar : gradientGreen.lightSidebar,
          },
          body: {
            backgroundColor: dt.pageBg,
            color: dt.textPrimary,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            textTransform: 'none' as const,
            fontWeight: 600,
            letterSpacing: '0.2px',
            transition: 'all 0.25s ease',
          },
          // ── Primary button: gradient green (30% accent) ──
          containedPrimary: {
            background: isDark ? gradientGreen.darkBtn : gradientGreen.lightBtn,
            color: '#FFFFFF',
            boxShadow: isDark
              ? '0 2px 8px rgba(0,0,0,0.45)'
              : '0 2px 6px rgba(46,125,50,0.30)',
            '&:hover': {
              background: isDark ? gradientGreen.darkBtnHov : gradientGreen.lightBtnHov,
              boxShadow: isDark
                ? '0 4px 14px rgba(0,0,0,0.55)'
                : '0 4px 12px rgba(46,125,50,0.40)',
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            border: '1px solid ' + dt.cardBorder,
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.55)'
              : '0 1px 4px rgba(46,125,50,0.10)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 600, fontSize: 12 },
          // Color chips dùng gradient subtle
          colorPrimary: {
            background: isDark ? gradientGreen.darkSubtle : gradientGreen.lightSubtle,
            color: isDark ? '#A5D6A7' : '#1B5E20',
            border: isDark ? '1px solid #2E7D32' : '1px solid #81C784',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: isDark ? gradientGreen.dark : gradientGreen.light,
            color: '#FFFFFF',
            fontSize: 12,
            borderRadius: 6,
            boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
          },
          arrow: {
            color: isDark ? '#1B5E20' : '#3C754C',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: dt.topbarBg,
            borderBottom: '1px solid ' + dt.topbarBorder,
            boxShadow: 'none',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              background: isDark ? gradientGreen.darkHeader : gradientGreen.lightHeader,
              color: '#FFFFFF',
              fontWeight: 700,
              letterSpacing: '0.3px',
              borderBottom: 'none',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: dt.divider },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4 },
          // Bar dùng gradient
          bar: {
            background: isDark ? gradientGreen.darkBtn : gradientGreen.lightBtn,
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          track: {
            background: isDark ? gradientGreen.darkBtn : gradientGreen.lightBtn,
            border: 'none',
          },
          thumb: {
            background: isDark ? '#4CAF50' : '#2E7D32',
            '&:hover': { boxShadow: '0 0 0 8px rgba(76,175,80,0.16)' },
          },
        },
      },
    },
  };
};

// ═══════════════════════════════════════════════════════════════════
//  SECTION 9 — COLOR MODE CONTEXT + useMode HOOK
// ═══════════════════════════════════════════════════════════════════
interface ColorModeContextType {
  toggleColorMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => { },
});

export const useMode = (): [Theme, ColorModeContextType] => {
  const [mode, setMode] = useState<PaletteMode>('dark');

  const colorMode = useMemo<ColorModeContextType>(
    () => ({
      toggleColorMode: () =>
        setMode(prev => (prev === 'light' ? 'dark' : 'light')),
    }),
    [],
  );

  const theme = useMemo(() => createTheme(themeSetting(mode)), [mode]);
  return [theme, colorMode];
};