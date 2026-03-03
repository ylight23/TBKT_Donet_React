/**
 * +--------------------------------------------------------------------+
 * |  MILITARY TECHNICAL EQUIPMENT MANAGEMENT SYSTEM                    |
 * |  Design System – Color Tokens & MUI Theme                          |
 * |  Version : 2.0.0                                                   |
 * |  Chuẩn   : WCAG AA | Material Design 3 | Quy tắc 60-30-10         |
 * +--------------------------------------------------------------------+
 */

import { createContext, useState, useMemo } from 'react';
import { createTheme as muiCreateTheme, Theme, PaletteMode } from '@mui/material/styles';

// -------------------------------------------------------------------
//  MILITARY DESIGN SYSTEM – CUSTOM VARIANTS TYPE EXTENSIONS
// -------------------------------------------------------------------
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    filterPanel: true;
  }
}



declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    militaryAction: true;
  }
}






// -------------------------------------------------------------------
//  SECTION 1 – PRIMARY PALETTE SCALES (50 - 900)
// -------------------------------------------------------------------

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

export const militaryOlive = armyOlive;

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

export const tacticalGreen = {
  50: '#E8F5E9',
  100: '#C8E6C9',
  200: '#A5D6A7',
  300: '#81C784',
  400: '#66BB6A',
  500: '#4CAF50',
  600: '#43A047',
  700: '#388E3C',
  800: '#2E7D32',
  900: '#1B5E20',
} as const;

export const tacticalNavy = tacticalGreen;

// -------------------------------------------------------------------
//  SECTION 2 – SECONDARY PALETTE (Steel / Gunmetal / Silver)
// -------------------------------------------------------------------

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

// -------------------------------------------------------------------
//  SECTION 3 – STATUS COLORS
// -------------------------------------------------------------------

export const statusColors = {
  operational: {
    main: '#2E7D32',
    light: '#4CAF50',
    dark: '#1B5E20',
    bg: '#E8F5E9',
    bgDark: '#0F2D10',
    label: 'Hoạt động tốt',
  },
  maintenance: {
    main: '#E65100',
    light: '#FF8C42',
    dark: '#BF360C',
    bg: '#FBE9E7',
    bgDark: '#2D1300',
    label: 'Đang bảo trì',
  },
  critical: {
    main: '#B71C1C',
    light: '#EF5350',
    dark: '#7F0000',
    bg: '#FFEBEE',
    bgDark: '#2D0000',
    label: 'Hỏng / Nguy cấp',
  },
  standby: {
    main: '#37474F',
    light: '#607D8B',
    dark: '#263238',
    bg: '#ECEFF1',
    bgDark: '#0E1517',
    label: 'Dự phòng / Niêm cất',
  },
  repairing: {
    main: '#ED6C02',
    light: '#FF9800',
    dark: '#C43E00',
    bg: '#FFF3E0',
    bgDark: '#2A1500',
    label: 'Đang sửa chữa',
  },
  decommissioned: {
    main: '#757575',
    light: '#9E9E9E',
    dark: '#424242',
    bg: '#FAFAFA',
    bgDark: '#1A1A1A',
    label: 'Loại biên / Thanh lý',
  },
} as const;

// -------------------------------------------------------------------
//  SECTION 4 – MILITARY COLORS
// -------------------------------------------------------------------

export const militaryColors = {
  deepOlive: armyOlive[900],
  midOlive: armyOlive[800],
  forestGreen: tacticalGreen[800],
  steel: militarySilver[500],
  gunmetal: gunmetal[500],
  lightSteel: steelGray[100],
  gold: militaryGold[500],
  armyGreen: deepArmyGreen[500],
  success: statusColors.operational.main,
  warning: statusColors.repairing.main,
  error: statusColors.critical.main,
  info: deepArmyGreen[400],
  navy: tacticalGreen[800],
} as const;

// -------------------------------------------------------------------
//  SECTION 5 – DASHBOARD COMPONENT TOKENS
// -------------------------------------------------------------------

export const gradientGreen = {
  light: 'linear-gradient(90deg, #66BB6A, #2E7D32)',
  lightSubtle: 'linear-gradient(90deg, #E8F5E9, #C8E6C9)',
  lightBtn: 'linear-gradient(90deg, #429c45ff, #2e6431ff)',
  lightBtnHov: 'linear-gradient(90deg, #388E3C, #1B5E20)',
  lightHeader: 'linear-gradient(90deg, #4CAF50, #1B5E20)',
  lightSidebar: 'linear-gradient(180deg, #4CAF50, #1B5E20)',
  dark: 'linear-gradient(90deg, #2E7D32, #3a7243ff)',
  darkSubtle: 'linear-gradient(90deg, #1B5E20, #071A0A)',
  darkBtn: 'linear-gradient(90deg, #438f47ff, #4e9653ff)',
  darkBtnHov: 'linear-gradient(90deg, #2E7D32, #1f5827ff)',
  darkHeader: 'linear-gradient(90deg, #1b4d1dff, #071A0A)',
  darkSidebar: 'linear-gradient(180deg, #2E7D32, #071A0A)',
} as const;

export const dashboardTokensLight = {
  pageBg: '#F4F7F4',
  contentBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: '#C8E6C9',
  sidebarBg: '#2E7D32',
  sidebarBorder: '#1B5E20',
  sidebarGradient: gradientGreen.lightSidebar,
  topbarBg: '#F4F7F4',
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

// -------------------------------------------------------------------
//  SECTION 6 – LEGACY TOKEN MAP
// -------------------------------------------------------------------
interface ColorShades {
  100: string; 200: string; 300: string; 400: string; 500: string;
  600: string; 700: string; 800: string; 900: string;
}
interface TokenColors {
  grey: ColorShades;
  primary: ColorShades;
  greenAccent: ColorShades;
  redAccent: ColorShades;
  forestAccent: ColorShades;
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
        300: armyOlive[300], 400: armyOlive[900],
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
      forestAccent: {
        100: tacticalGreen[100], 200: tacticalGreen[200], 300: tacticalGreen[300],
        400: tacticalGreen[400], 500: tacticalGreen[500], 600: tacticalGreen[600],
        700: tacticalGreen[700], 800: tacticalGreen[800], 900: tacticalGreen[900],
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
      forestAccent: {
        100: tacticalGreen[900], 200: tacticalGreen[800], 300: tacticalGreen[700],
        400: tacticalGreen[600], 500: tacticalGreen[500], 600: tacticalGreen[400],
        700: tacticalGreen[300], 800: tacticalGreen[200], 900: tacticalGreen[100],
      },
    }),
});

// -------------------------------------------------------------------
//  SECTION 7 – CSS VARIABLES GENERATOR
// -------------------------------------------------------------------
export function generateCSSVariables(isDark: boolean): Record<string, string> {
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

    '--mil-green-alt-50': tacticalGreen[50], '--mil-green-alt-100': tacticalGreen[100],
    '--mil-green-alt-200': tacticalGreen[200], '--mil-green-alt-300': tacticalGreen[300],
    '--mil-green-alt-400': tacticalGreen[400], '--mil-green-alt-500': tacticalGreen[500],
    '--mil-green-alt-600': tacticalGreen[600], '--mil-green-alt-700': tacticalGreen[700],
    '--mil-green-alt-800': tacticalGreen[800], '--mil-green-alt-900': tacticalGreen[900],

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

    '--color-primary': militaryColors.deepOlive,
    '--color-secondary': militaryColors.forestGreen,
    '--color-accent': militaryColors.gold,
    '--color-success': militaryColors.success,
    '--color-warning': militaryColors.warning,
    '--color-error': militaryColors.error,
    '--datagrid-header-bg': isDark ? gradientGreen.darkHeader : gradientGreen.lightHeader,
    '--datagrid-header-text': isDark ? '#FFFFFF' : '#000000',
    '--mil-text-primary': isDark ? '#FFFFFF' : '#0D0D0D',
  };
}

// -------------------------------------------------------------------
//  SECTION 8 – MUI createTheme FACTORY
// -------------------------------------------------------------------
export const themeSetting = (mode: PaletteMode) => {
  const isDark = mode === 'dark';
  const dt = isDark ? dashboardTokensDark : dashboardTokensLight;

  return {
    palette: {
      mode,
      primary: {
        main: armyOlive[800],
        light: armyOlive[600],
        dark: armyOlive[900],
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: tacticalGreen[600],
        light: tacticalGreen[400],
        dark: tacticalGreen[800],
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
        main: tacticalGreen[500],
        light: tacticalGreen[300],
        dark: tacticalGreen[700],
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
            ...generateCSSVariables(isDark),
            // -- Gradient Green CSS vars (30% rule) --
            '--gradient-green-primary': isDark ? gradientGreen.dark : gradientGreen.light,
            '--gradient-green-subtle': isDark ? gradientGreen.darkSubtle : gradientGreen.lightSubtle,
            '--gradient-green-btn': isDark ? gradientGreen.darkBtn : gradientGreen.lightBtn,
            '--gradient-green-btn-hov': isDark ? gradientGreen.darkBtnHov : gradientGreen.lightBtnHov,
            '--gradient-green-header': isDark ? gradientGreen.darkHeader : gradientGreen.lightHeader,
            '--gradient-green-sidebar': isDark ? gradientGreen.darkSidebar : gradientGreen.lightSidebar,
            colorScheme: isDark ? 'dark' : 'light',
          },
          body: {
            backgroundColor: dt.pageBg,
            color: dt.textPrimary,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ ownerState, theme }: { ownerState: any; theme: Theme }) => ({
            borderRadius: 10,
            border: '1px solid ' + dt.cardBorder,
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.55)'
              : '0 1px 4px rgba(46,125,50,0.10)',
            ...(ownerState.variant === 'filterPanel' && {
              borderRadius: 16,
              border: `1px solid ${theme.palette.divider}`,
              background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: theme.palette.primary.light,
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.06)',
              }
            })
          }),
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': {
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
            '&:hover fieldset': {
              borderColor: theme.palette.primary.light + ' !important',
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main + ' !important',
              borderWidth: '1px !important',
            },
            '&.Mui-focused': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
              boxShadow: isDark
                ? '0 4px 20px rgba(0,0,0,0.4)'
                : '0 4px 20px rgba(46,125,50,0.08)',
            }
          }),
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined' as const,
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ ownerState, theme }: { ownerState: any; theme: Theme }) => ({
            borderRadius: 6,
            textTransform: 'none' as const,
            fontWeight: 600,
            letterSpacing: '0.2px',
            transition: 'background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
            ...(ownerState.variant === 'militaryAction' && {
              borderRadius: 12,
              paddingLeft: 24,
              paddingRight: 24,
              height: 40,
              fontWeight: 700,
              boxShadow: isDark
                ? '0 4px 14px rgba(0,0,0,0.5)'
                : `0 4px 14px rgba(46,125,50,0.25)`,
              '&:hover': {
                boxShadow: isDark
                  ? '0 6px 20px rgba(0,0,0,0.6)'
                  : `0 6px 20px rgba(46,125,50,0.35)`,
              }
            })
          }),
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
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 600, fontSize: 12 },
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
      MuiTableCell: {
        styleOverrides: {
          root: {
            textAlign: 'center' as const,
            verticalAlign: 'middle' as const,
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
              textAlign: 'center' as const,
              display: 'table-cell',
              verticalAlign: 'middle' as const,
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
            background: isDark ? '#368a39ff' : '#256328ff',
            '&:hover': { boxShadow: '0 0 0 8px rgba(76,175,80,0.16)' },
          },
        },
      },
      MuiDataGrid: {
        defaultProps: {
          density: 'compact' as const,
          columnHeaderHeight: 70, // Increased to support wrapped headers
          rowHeight: 48,
          disableRowSelectionOnClick: true,
          pageSizeOptions: [10, 25, 50, 100],
          initialState: {
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
          },

        },
        styleOverrides: {
          root: {
            border: `1px solid ${dt.divider}`,
            borderRadius: "6px",
            backgroundColor: dt.contentBg,
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.4)"
              : "0 8px 32px rgba(0,0,0,0.05)",
            fontSize: "0.875rem",
            overflow: "hidden",
            // Header - Đảm bảo phủ 100% kể cả khi có scroll hoặc filler
            "& .MuiDataGrid-columnHeaders": {
              background: dt.tableHeaderGradient,
              color: "#FFFFFF",
              borderBottom: "none",
              borderRadius: 0,

              "& .MuiDataGrid-columnHeaderRow": {
                background: "transparent",
                overflow: "visible !important",
              },
              "& .MuiDataGrid-filler": {
                background: "transparent",
              },
              "& .MuiDataGrid-scrollbarFiller": {
                background: "transparent",
              },
              // Fix for sticky headers in column containers
              "& .MuiDataGrid-columnHeadersInner": {
                overflow: "visible !important",
              },
            },
            // Từng ô tiêu đề đơn lẻ
            "& .MuiDataGrid-columnHeader": {
              background: "transparent",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              alignContent: "center",
              textAlign: "center",
              whiteSpace: "normal !important",
              lineHeight: "1.2 !important",
              "& .MuiDataGrid-columnHeaderTitleContainer": {
                justifyContent: "center",
                alignItems: "center",
                alignContent: "center",
                width: "100%",
                flex: 1,
              },
              "& .MuiDataGrid-columnHeaderTitleContainerContent": {
                overflow: "visible",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "0.8rem",
                letterSpacing: "0.04em",
                whiteSpace: "normal",
                textAlign: "center",
              },
              "& .MuiDataGrid-iconButtonContainer": {
                color: "rgba(255, 255, 255, 0.85)",
              },
              "& .MuiDataGrid-menuIcon": {
                color: "rgba(255, 255, 255, 0.85)",
              },
            },
            // Đường phân cách giữa các cột
            "& .MuiDataGrid-columnSeparator": {
              color: "rgba(255, 255, 255, 0.15)",
            },
            // Cell
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${dt.divider}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignContent: 'center',
              textAlign: 'center !important' as any,
            },
            // Force center alignment for all text-align classes MUI uses
            '& .MuiDataGrid-cell--textLeft': {
              justifyContent: 'center !important',
              textAlign: 'center !important' as any,
            },
            '& .MuiDataGrid-cell--textRight': {
              justifyContent: 'center !important',
              textAlign: 'center !important' as any,
            },
            '& .MuiDataGrid-columnHeader--alignLeft': {
              '& .MuiDataGrid-columnHeaderTitleContainer': {
                justifyContent: 'center !important',
              },
            },
            '& .MuiDataGrid-columnHeader--alignRight': {
              '& .MuiDataGrid-columnHeaderTitleContainer': {
                justifyContent: 'center !important',
              },
            },
            // Simulate pinned/sticky actions column removed from here, merged below
            '& .MuiDataGrid-cell[data-field="actions"]': {
              position: 'sticky !important',
              right: '0 !important',
              backgroundColor: isDark ? '#0C1A0E !important' : '#FFFFFF !important',
              zIndex: '100 !important' as any, // Extremely high to stay above all cells
              boxShadow: '-4px 0 10px rgba(0,0,0,0.15)',
              borderLeft: `2px solid ${dt.divider} !important`,
              display: 'flex',
              justifyContent: 'center !important',
              alignItems: 'center',
            },
            '& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field="actions"]': {
              backgroundColor: isDark ? 'rgba(76,175,80,0.15)' : 'rgba(46,125,50,0.12)', // Match dt.tableRowHover
            },
            '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell[data-field="actions"]': {
              borderBottom: `1px solid ${dt.divider}33`,
            },
            // Row
            '& .MuiDataGrid-row': {
              transition: 'background-color 0.2s',
              overflow: 'visible !important',
              width: 'max-content', // Encourage row to span full width
              minWidth: '100%',
              display: 'flex', // Ensure row is flex for its children
              '&:hover': {
                backgroundColor: dt.tableRowHover,
              },
            },
            // Critical: the scroll container itself must allow sticky
            '& .MuiDataGrid-virtualScroller': {
              overflow: 'auto !important',
            },
            '& .MuiDataGrid-virtualScrollerContent': {
              overflow: 'visible !important',
            },
            '& .MuiDataGrid-virtualScrollerRenderZone': {
              overflow: 'visible !important',
            },
            // Ensure header also sticks correctly
            '& .MuiDataGrid-columnHeader[data-field="actions"]': {
              position: 'sticky !important',
              right: '0 !important',
              backgroundColor: isDark ? '#1b4d1d !important' : '#43A047 !important',
              zIndex: '101 !important' as any,
              boxShadow: '-4px 0 8px rgba(0,0,0,0.2)',
              borderLeft: `2px solid rgba(255,255,255,0.3) !important`,
            },
            // Footer
            '& .MuiDataGrid-footerContainer': {
              borderTop: `2px solid ${dt.divider}`,
              minHeight: 48,
            },
            // Scrollbar (Global for all grids)
            '& ::-webkit-scrollbar': { width: 8, height: 8 },
            '& ::-webkit-scrollbar-track': { background: 'transparent' },
            '& ::-webkit-scrollbar-thumb': {
              background: dt.divider,
              borderRadius: 4,
              '&:hover': { background: dt.textSecondary }
            },
          },
        },
      },
    },
  };
};

// -------------------------------------------------------------------
//  SECTION 9 – COLOR MODE CONTEXT + useMode HOOK
// -------------------------------------------------------------------
interface ColorModeContextType {
  toggleColorMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => { },
});

export const useMode = (): [Theme, ColorModeContextType] => {
  const [mode, setMode] = useState<PaletteMode>('light');

  const colorMode = useMemo<ColorModeContextType>(
    () => ({
      toggleColorMode: () =>
        setMode(prev => (prev === 'light' ? 'dark' : 'light')),
    }),
    [],
  );

  const themeValue = useMemo(() => muiCreateTheme(themeSetting(mode)), [mode]);
  return [themeValue, colorMode];
};
