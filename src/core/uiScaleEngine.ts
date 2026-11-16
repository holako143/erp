/**
 * Haseb ERP — Harmonized Typography & Workspace Window/Tab Scaling Engine
 * Ensures proportional, crystal-clear Arabic & numeric legibility across all screens
 * without layout overflow or visual distortion.
 */

export const FONT_SCALE_MIN = 90;
export const FONT_SCALE_MAX = 140;
export const FONT_SCALE_STEP = 5;
export const DEFAULT_FONT_SCALE = 110; // Default 110% so text is immediately clear and comfortable

export const WINDOW_SCALE_MIN = 90;
export const WINDOW_SCALE_MAX = 130;
export const WINDOW_SCALE_STEP = 5;
export const DEFAULT_WINDOW_SCALE = 105; // Default 105% for generous, balanced tabs & templates

export interface HasebScalePreset {
  id: 'compact' | 'standard' | 'comfortable' | 'large' | 'xlarge';
  labelAr: string;
  labelEn: string;
  descAr: string;
  fontScalePercent: number;
  windowScalePercent: number;
}

export const HASEB_SCALE_PRESETS: readonly HasebScalePreset[] = [
  {
    id: 'standard',
    labelAr: 'قياسي (100%)',
    labelEn: 'Standard (100%)',
    descAr: 'الحجم القياسي المتوازن للشاشات العادية',
    fontScalePercent: 100,
    windowScalePercent: 100,
  },
  {
    id: 'comfortable',
    labelAr: 'واضح ومريح — افتراضي (110%)',
    labelEn: 'Clear & Comfortable (110%)',
    descAr: 'تكبير متناسق للخطوط والقوالب لراحة العين',
    fontScalePercent: 110,
    windowScalePercent: 105,
  },
  {
    id: 'large',
    labelAr: 'كبير وعريض (120%)',
    labelEn: 'Large Display (120%)',
    descAr: 'مثالي لشاشات الكاشير اللمسية والمحاسبين',
    fontScalePercent: 120,
    windowScalePercent: 115,
  },
  {
    id: 'xlarge',
    labelAr: 'فائق الوضوح (130%)',
    labelEn: 'Extra Large (130%)',
    descAr: 'أعلى وضوح للخطوط والتبويبات والنوافذ',
    fontScalePercent: 130,
    windowScalePercent: 120,
  },
] as const;

export function clampFontScale(percent: number): number {
  if (!Number.isFinite(percent)) return DEFAULT_FONT_SCALE;
  const rounded = Math.round(percent / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, rounded));
}

export function clampWindowScale(percent: number): number {
  if (!Number.isFinite(percent)) return DEFAULT_WINDOW_SCALE;
  const rounded = Math.round(percent / WINDOW_SCALE_STEP) * WINDOW_SCALE_STEP;
  return Math.max(WINDOW_SCALE_MIN, Math.min(WINDOW_SCALE_MAX, rounded));
}

export function stepFontScale(currentPercent: number, direction: 'INC' | 'DEC'): number {
  const delta = direction === 'INC' ? FONT_SCALE_STEP : -FONT_SCALE_STEP;
  return clampFontScale(currentPercent + delta);
}

export function stepWindowScale(currentPercent: number, direction: 'INC' | 'DEC'): number {
  const delta = direction === 'INC' ? WINDOW_SCALE_STEP : -WINDOW_SCALE_STEP;
  return clampWindowScale(currentPercent + delta);
}

export interface HarmonizedScaleCssVariables {
  fontScaleRatio: number;
  windowScaleRatio: number;
  rootFontSizePx: number;
  spacingUnitRem: number;
  sidebarWidthPx: number;
  navbarHeightPx: number;
}

/**
 * Computes proportional CSS custom properties so that scaling fonts and windows/tabs
 * expands typography, buttons, tabs, and containers harmoniously without breaking flex/grid bounds.
 */
export function computeHarmonizedScaleCssVars(
  fontScalePercent: number,
  windowScalePercent: number
): HarmonizedScaleCssVariables {
  const clampedFont = clampFontScale(fontScalePercent);
  const clampedWindow = clampWindowScale(windowScalePercent);

  const fontScaleRatio = Number((clampedFont / 100).toFixed(3));
  const windowScaleRatio = Number((clampedWindow / 100).toFixed(3));

  // Root font size blends font scale (70%) and window scale (30%) for seamless rem harmony
  const blendedRatio = 1 + (fontScaleRatio - 1) * 0.65 + (windowScaleRatio - 1) * 0.35;
  const rootFontSizePx = Number((16 * blendedRatio).toFixed(2));

  // Tailwind v4 base --spacing is 0.25rem; scale gently with windowScaleRatio
  const spacingUnitRem = Number((0.25 * (1 + (windowScaleRatio - 1) * 0.75)).toFixed(4));

  // Proportional sidebar & navbar dimensions
  const sidebarWidthPx = Math.round(256 * (1 + (windowScaleRatio - 1) * 0.6));
  const navbarHeightPx = Math.round(58 * (1 + (windowScaleRatio - 1) * 0.55));

  return {
    fontScaleRatio,
    windowScaleRatio,
    rootFontSizePx,
    spacingUnitRem,
    sidebarWidthPx,
    navbarHeightPx,
  };
}

export interface ViewportAwareScaleResult extends HarmonizedScaleCssVariables {
  deviceClass: 'COMPACT_PHONE' | 'PHONE' | 'TABLET' | 'DESKTOP';
  viewportWidthPx: number;
  tabPadYRem: number;
  tabPadXRem: number;
  tabFontSizeRem: number;
  tabMinHeightPx: number;
}

/**
 * Computes viewport-aware CSS variables that automatically adapt font scale, spacing units,
 * table/card density, and tab dimensions to ANY phone or tablet screen size (320px -> 1024px+)
 * so elements never overflow or look oversized on mobile devices.
 */
export function computeViewportAwareScaleCssVars(
  fontScalePercent: number,
  windowScalePercent: number,
  viewportWidthPx = 1280
): ViewportAwareScaleResult {
  const desktopBase = computeHarmonizedScaleCssVars(fontScalePercent, windowScalePercent);
  const safeWidth = Number.isFinite(viewportWidthPx) && viewportWidthPx > 0 ? viewportWidthPx : 1280;

  // Relative user preference delta from default (110% font, 105% window)
  const clampedFont = clampFontScale(fontScalePercent);
  const clampedWindow = clampWindowScale(windowScalePercent);
  const userFontDeltaRatio = (clampedFont - DEFAULT_FONT_SCALE) / 100;
  const userWindowDeltaRatio = (clampedWindow - DEFAULT_WINDOW_SCALE) / 100;

  if (safeWidth < 380) {
    // Compact phones (320px - 379px, e.g. iPhone SE / compact Androids)
    const fluidBasePx = Math.max(11.75, Math.min(12.75, safeWidth * 0.0355));
    const rootFontSizePx = Number(
      Math.max(11.5, Math.min(13.25, fluidBasePx * (1 + userFontDeltaRatio * 0.3))).toFixed(2)
    );
    const spacingUnitRem = Number(
      Math.max(0.195, Math.min(0.22, 0.208 * (1 + userWindowDeltaRatio * 0.25))).toFixed(4)
    );
    return {
      fontScaleRatio: Number((rootFontSizePx / 16).toFixed(3)),
      windowScaleRatio: 0.85,
      rootFontSizePx,
      spacingUnitRem,
      sidebarWidthPx: 240,
      navbarHeightPx: 46,
      deviceClass: 'COMPACT_PHONE',
      viewportWidthPx: safeWidth,
      tabPadYRem: 0.26,
      tabPadXRem: 0.52,
      tabFontSizeRem: 0.68,
      tabMinHeightPx: 28,
    };
  }

  if (safeWidth < 640) {
    // Standard & large smartphones (380px - 639px)
    const fluidBasePx = Math.max(12.5, Math.min(13.6, safeWidth * 0.034));
    const rootFontSizePx = Number(
      Math.max(12.0, Math.min(14.0, fluidBasePx * (1 + userFontDeltaRatio * 0.35))).toFixed(2)
    );
    const spacingUnitRem = Number(
      Math.max(0.205, Math.min(0.23, 0.218 * (1 + userWindowDeltaRatio * 0.3))).toFixed(4)
    );
    return {
      fontScaleRatio: Number((rootFontSizePx / 16).toFixed(3)),
      windowScaleRatio: 0.88,
      rootFontSizePx,
      spacingUnitRem,
      sidebarWidthPx: 248,
      navbarHeightPx: 48,
      deviceClass: 'PHONE',
      viewportWidthPx: safeWidth,
      tabPadYRem: 0.28,
      tabPadXRem: 0.6,
      tabFontSizeRem: 0.7,
      tabMinHeightPx: 30,
    };
  }

  if (safeWidth < 1024) {
    // Tablets & foldable screens (640px - 1023px)
    const rootFontSizePx = Number(
      Math.max(13.5, Math.min(15.5, 14.4 * (1 + userFontDeltaRatio * 0.45))).toFixed(2)
    );
    const spacingUnitRem = Number(
      Math.max(0.22, Math.min(0.245, 0.234 * (1 + userWindowDeltaRatio * 0.4))).toFixed(4)
    );
    return {
      fontScaleRatio: Number((rootFontSizePx / 16).toFixed(3)),
      windowScaleRatio: 0.94,
      rootFontSizePx,
      spacingUnitRem,
      sidebarWidthPx: 252,
      navbarHeightPx: 52,
      deviceClass: 'TABLET',
      viewportWidthPx: safeWidth,
      tabPadYRem: 0.34,
      tabPadXRem: 0.72,
      tabFontSizeRem: 0.73,
      tabMinHeightPx: 32,
    };
  }

  return {
    ...desktopBase,
    deviceClass: 'DESKTOP',
    viewportWidthPx: safeWidth,
    tabPadYRem: 0.4,
    tabPadXRem: 0.85,
    tabFontSizeRem: 0.75,
    tabMinHeightPx: 34,
  };
}

