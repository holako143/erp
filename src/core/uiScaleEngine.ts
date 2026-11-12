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
