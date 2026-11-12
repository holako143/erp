/**
 * Haseb ERP — Interactive Workspace Layout, Resizable Tabs & Split-Pane Engine
 * Provides deterministic calculations for:
 * 1. Tab & Button Sizing (+ / - steppers & presets: Compact, Standard, Large, Extra-Large)
 * 2. Resizable / Maximizable Split-Panes (POS Catalog vs Cart, Sales Table vs Invoice Preview, WhatsApp Chats vs Conversation)
 * 3. Collapsible / Expandable Workspace Sections & Focus Mode
 */

export const TAB_SCALE_MIN = 85;
export const TAB_SCALE_MAX = 135;
export const TAB_SCALE_STEP = 5;
export const DEFAULT_TAB_SCALE = 100;

export type TabSizePresetId = 'compact' | 'standard' | 'large' | 'xlarge';

export interface TabSizePreset {
  id: TabSizePresetId;
  labelAr: string;
  labelEn: string;
  tabScalePercent: number;
}

export const TAB_SIZE_PRESETS: readonly TabSizePreset[] = [
  {
    id: 'compact',
    labelAr: 'مدمج (90%)',
    labelEn: 'Compact (90%)',
    tabScalePercent: 90,
  },
  {
    id: 'standard',
    labelAr: 'متوازن (100%)',
    labelEn: 'Balanced (100%)',
    tabScalePercent: 100,
  },
  {
    id: 'large',
    labelAr: 'كبير وواضح (115%)',
    labelEn: 'Large Tabs (115%)',
    tabScalePercent: 115,
  },
  {
    id: 'xlarge',
    labelAr: 'عريض جداً (125%)',
    labelEn: 'Extra Large (125%)',
    tabScalePercent: 125,
  },
] as const;

export function clampTabScale(percent: number): number {
  if (!Number.isFinite(percent)) return DEFAULT_TAB_SCALE;
  const rounded = Math.round(percent / TAB_SCALE_STEP) * TAB_SCALE_STEP;
  return Math.max(TAB_SCALE_MIN, Math.min(TAB_SCALE_MAX, rounded));
}

export function stepTabScale(currentPercent: number, direction: 'INC' | 'DEC'): number {
  const delta = direction === 'INC' ? TAB_SCALE_STEP : -TAB_SCALE_STEP;
  return clampTabScale(currentPercent + delta);
}

export interface TabLayoutCssVars {
  tabScaleRatio: number;
  tabPadYRem: number;
  tabPadXRem: number;
  tabFontSizeRem: number;
  tabMinHeightPx: number;
  cardGapRem: number;
  sectionPaddingRem: number;
}

export function computeTabLayoutCssVars(tabScalePercent: number): TabLayoutCssVars {
  const clamped = clampTabScale(tabScalePercent);
  const ratio = Number((clamped / 100).toFixed(3));

  const tabPadYRem = Number((0.5 * ratio).toFixed(3));
  const tabPadXRem = Number((0.95 * ratio).toFixed(3));
  const tabFontSizeRem = Number((0.82 * (1 + (ratio - 1) * 0.65)).toFixed(3));
  const tabMinHeightPx = Math.round(38 * ratio);
  const cardGapRem = Number((0.85 * (1 + (ratio - 1) * 0.4)).toFixed(3));
  const sectionPaddingRem = Number((1.1 * (1 + (ratio - 1) * 0.45)).toFixed(3));

  return {
    tabScaleRatio: ratio,
    tabPadYRem,
    tabPadXRem,
    tabFontSizeRem,
    tabMinHeightPx,
    cardGapRem,
    sectionPaddingRem,
  };
}

export type SplitPaneRatioMode =
  | 'BALANCED'
  | 'EXPAND_PRIMARY'
  | 'EXPAND_SECONDARY'
  | 'MAXIMIZE_PRIMARY'
  | 'MAXIMIZE_SECONDARY';

export interface SplitPaneLayoutConfig {
  mode: SplitPaneRatioMode;
  labelAr: string;
  shortLabelAr: string;
  primaryColClass: string;
  secondaryColClass: string;
  hidePrimary: boolean;
  hideSecondary: boolean;
}

/**
 * Resolves responsive 12-column grid classes for two-pane workspaces
 * (e.g., POS Catalog vs Cart, Sales Invoices vs Preview, WhatsApp Contacts vs Chat).
 */
export function resolveSplitPaneLayout(
  mode: SplitPaneRatioMode,
  context: 'POS' | 'SALES' | 'COMMUNICATIONS' = 'POS'
): SplitPaneLayoutConfig {
  if (mode === 'MAXIMIZE_PRIMARY') {
    return {
      mode,
      labelAr:
        context === 'POS'
          ? 'تكبير كتالوج الأصناف (100%)'
          : context === 'SALES'
          ? 'تكبير جدول الفواتير (100%)'
          : 'تكبير قائمة المحادثات (100%)',
      shortLabelAr: 'تكبير القسم الأيمن 100%',
      primaryColClass: 'lg:col-span-12 xl:col-span-12',
      secondaryColClass: 'hidden',
      hidePrimary: false,
      hideSecondary: true,
    };
  }

  if (mode === 'MAXIMIZE_SECONDARY') {
    return {
      mode,
      labelAr:
        context === 'POS'
          ? 'تكبير سلة المبيعات والضمان (100%)'
          : context === 'SALES'
          ? 'تكبير معاينة الفاتورة (100%)'
          : 'تكبير نافذة المحادثة (100%)',
      shortLabelAr: 'تكبير القسم الأيسر 100%',
      primaryColClass: 'hidden',
      secondaryColClass: 'lg:col-span-12 xl:col-span-12',
      hidePrimary: true,
      hideSecondary: false,
    };
  }

  if (mode === 'EXPAND_PRIMARY') {
    return {
      mode,
      labelAr:
        context === 'POS'
          ? 'توسيع الكتالوج (65% / 35%)'
          : context === 'SALES'
          ? 'توسيع قائمة الفواتير (60% / 40%)'
          : 'توسيع قائمة الحسابات (45% / 55%)',
      shortLabelAr: 'توسيع اليمين',
      primaryColClass:
        context === 'SALES'
          ? 'lg:col-span-7 xl:col-span-7'
          : context === 'COMMUNICATIONS'
          ? 'lg:col-span-5 xl:col-span-5'
          : 'lg:col-span-8 xl:col-span-8',
      secondaryColClass:
        context === 'SALES'
          ? 'lg:col-span-5 xl:col-span-5'
          : context === 'COMMUNICATIONS'
          ? 'lg:col-span-7 xl:col-span-7'
          : 'lg:col-span-4 xl:col-span-4',
      hidePrimary: false,
      hideSecondary: false,
    };
  }

  if (mode === 'EXPAND_SECONDARY') {
    return {
      mode,
      labelAr:
        context === 'POS'
          ? 'توسيع سلة المبيعات (40% / 60%)'
          : context === 'SALES'
          ? 'توسيع معاينة الفاتورة (35% / 65%)'
          : 'توسيع شاشة المحادثة (25% / 75%)',
      shortLabelAr: 'توسيع اليسار',
      primaryColClass:
        context === 'SALES'
          ? 'lg:col-span-4 xl:col-span-4'
          : context === 'COMMUNICATIONS'
          ? 'lg:col-span-3 xl:col-span-3'
          : 'lg:col-span-5 xl:col-span-5',
      secondaryColClass:
        context === 'SALES'
          ? 'lg:col-span-8 xl:col-span-8'
          : context === 'COMMUNICATIONS'
          ? 'lg:col-span-9 xl:col-span-9'
          : 'lg:col-span-7 xl:col-span-7',
      hidePrimary: false,
      hideSecondary: false,
    };
  }

  // Default: BALANCED
  return {
    mode: 'BALANCED',
    labelAr: 'تقسيم متوازن ومرتب',
    shortLabelAr: 'متوازن',
    primaryColClass:
      context === 'SALES'
        ? 'lg:col-span-5 xl:col-span-5'
        : context === 'COMMUNICATIONS'
        ? 'lg:col-span-4 xl:col-span-4'
        : 'lg:col-span-7 xl:col-span-7',
    secondaryColClass:
      context === 'SALES'
        ? 'lg:col-span-7 xl:col-span-7'
        : context === 'COMMUNICATIONS'
        ? 'lg:col-span-8 xl:col-span-8'
        : 'lg:col-span-5 xl:col-span-5',
    hidePrimary: false,
    hideSecondary: false,
  };
}

export function cycleSplitPaneMode(
  current: SplitPaneRatioMode,
  direction: 'NEXT' | 'PREV' = 'NEXT'
): SplitPaneRatioMode {
  const order: SplitPaneRatioMode[] = [
    'BALANCED',
    'EXPAND_PRIMARY',
    'EXPAND_SECONDARY',
    'MAXIMIZE_PRIMARY',
    'MAXIMIZE_SECONDARY',
  ];
  const idx = order.indexOf(current);
  if (idx === -1) return 'BALANCED';
  const nextIdx =
    direction === 'NEXT'
      ? (idx + 1) % order.length
      : (idx - 1 + order.length) % order.length;
  return order[nextIdx];
}
