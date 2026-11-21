// src/shared/theme/tokens.ts
// Unified Multi-Role Design System Tokens for Super Admin, Admin, and Employee Panels

export type RoleType = 'Super Admin' | 'Admin' | 'Employee';

export interface RoleTheme {
  roleName: RoleType;
  badgeLabel: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
  accentBgClass: string;
  accentHoverClass: string;
  accentTextClass: string;
  accentBorderClass: string;
  activeNavBgClass: string;
  activeNavTextClass: string;
}

// Unified Design Palette across all 3 panels:
// Primary: #4F46E5, Primary Dark: #3730A3, Secondary: #7C3AED
// Page BG: #F8FAFC, Sidebar: #0F172A, Top View Bar: #000000, Cards: #FFFFFF

export const ROLE_THEMES: Record<RoleType, RoleTheme> = {
  'Super Admin': {
    roleName: 'Super Admin',
    badgeLabel: 'Super Admin',
    badgeBgClass: 'bg-indigo-500/10',
    badgeTextClass: 'text-indigo-400',
    badgeBorderClass: 'border-indigo-500/30',
    accentBgClass: 'bg-[#4F46E5]',
    accentHoverClass: 'hover:bg-[#3730A3]',
    accentTextClass: 'text-[#4F46E5]',
    accentBorderClass: 'border-[#4F46E5]',
    activeNavBgClass: 'bg-zinc-800',
    activeNavTextClass: 'text-white font-bold',
  },
  'Admin': {
    roleName: 'Admin',
    badgeLabel: 'Admin Panel',
    badgeBgClass: 'bg-indigo-500/10',
    badgeTextClass: 'text-indigo-400',
    badgeBorderClass: 'border-indigo-500/30',
    accentBgClass: 'bg-[#4F46E5]',
    accentHoverClass: 'hover:bg-[#3730A3]',
    accentTextClass: 'text-[#4F46E5]',
    accentBorderClass: 'border-[#4F46E5]',
    activeNavBgClass: 'bg-zinc-800',
    activeNavTextClass: 'text-white font-bold',
  },
  'Employee': {
    roleName: 'Employee',
    badgeLabel: 'Employee Portal',
    badgeBgClass: 'bg-indigo-500/10',
    badgeTextClass: 'text-indigo-400',
    badgeBorderClass: 'border-indigo-500/30',
    accentBgClass: 'bg-[#4F46E5]',
    accentHoverClass: 'hover:bg-[#3730A3]',
    accentTextClass: 'text-[#4F46E5]',
    accentBorderClass: 'border-[#4F46E5]',
    activeNavBgClass: 'bg-zinc-800',
    activeNavTextClass: 'text-white font-bold',
  },
};

export const DESIGN_TOKENS = {
  fontFamily: "'Inter', 'Noto Sans Devanagari', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  colors: {
    bgApp: 'bg-[#F5F2EB]',
    bgSidebar: 'bg-[#0F172A]',
    bgHeader: 'bg-zinc-800',
    bgCard: 'bg-[#FFFFFF]',
    border: 'border-[#E2E8F0]',
    borderDark: 'border-slate-800',
    borderHeader: 'border-b-2 border-white',
    textMain: 'text-[#1E293B]',
    textMuted: 'text-[#64748B]',
    textDarkMain: 'text-slate-100',
    textDarkMuted: 'text-slate-400',
    primary: '#4F46E5',
    primaryDark: '#3730A3',
    secondary: '#7C3AED',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  spacing: {
    paddingApp: 'p-6',
    gapCards: 'gap-4 md:gap-6',
  },
};
