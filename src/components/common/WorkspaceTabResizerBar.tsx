import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Columns2,
  PanelRightOpen,
  PanelLeftOpen,
  RotateCcw,
} from 'lucide-react';
import {
  DEFAULT_TAB_SCALE,
  TAB_SCALE_MIN,
  TAB_SCALE_MAX,
  clampTabScale,
  stepTabScale,
  computeTabLayoutCssVars,
  SplitPaneRatioMode,
} from '../../core/workspaceLayoutEngine';

export function applyGlobalTabScaleToDom(percent: number): number {
  const clamped = clampTabScale(percent);
  if (typeof document !== 'undefined') {
    const vars = computeTabLayoutCssVars(clamped);
    const root = document.documentElement;
    root.style.setProperty('--erp-tab-scale', String(vars.tabScaleRatio));
    root.style.setProperty('--erp-tab-py', `${vars.tabPadYRem}rem`);
    root.style.setProperty('--erp-tab-px', `${vars.tabPadXRem}rem`);
    root.style.setProperty('--erp-tab-font-size', `${vars.tabFontSizeRem}rem`);
    root.style.setProperty('--erp-tab-min-h', `${vars.tabMinHeightPx}px`);
    root.style.setProperty('--erp-card-gap', `${vars.cardGapRem}rem`);
    root.style.setProperty('--erp-section-padding', `${vars.sectionPaddingRem}rem`);
    root.dataset.erpTabScale = String(clamped);
    try {
      localStorage.setItem('haseb_tab_scale_percent', String(clamped));
      window.dispatchEvent(new CustomEvent('haseb-tab-scale-change', { detail: clamped }));
    } catch {
      // ignore storage errors
    }
  }
  return clamped;
}

export function getSavedTabScalePercent(): number {
  if (typeof window !== 'undefined') {
    const raw = Number(localStorage.getItem('haseb_tab_scale_percent'));
    if (Number.isFinite(raw) && raw >= TAB_SCALE_MIN && raw <= TAB_SCALE_MAX) {
      return clampTabScale(raw);
    }
  }
  return DEFAULT_TAB_SCALE;
}

interface WorkspaceTabResizerBarProps {
  /** Unique testid prefix for this view's resizer bar */
  testIdPrefix?: string;
  /** Optional split-pane control for 2-column views (POS, Sales, WhatsApp) */
  splitMode?: SplitPaneRatioMode;
  onSplitModeChange?: (mode: SplitPaneRatioMode) => void;
  primaryPaneLabel?: string;
  secondaryPaneLabel?: string;
  /** Optional full-width section maximize / collapse toggle */
  isSectionMaximized?: boolean;
  onToggleSectionMaximized?: () => void;
  maximizeLabel?: string;
}

export const WorkspaceTabResizerBar: React.FC<WorkspaceTabResizerBarProps> = ({
  testIdPrefix = 'workspace-tab',
  splitMode,
  onSplitModeChange,
  primaryPaneLabel = 'القسم الأيمن',
  secondaryPaneLabel = 'القسم الأيسر',
  isSectionMaximized,
  onToggleSectionMaximized,
  maximizeLabel = 'ملء مساحة العمل',
}) => {
  const [tabScale, setTabScale] = useState<number>(() => getSavedTabScalePercent());

  useEffect(() => {
    applyGlobalTabScaleToDom(tabScale);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (typeof custom.detail === 'number') {
        setTabScale(custom.detail);
      }
    };
    window.addEventListener('haseb-tab-scale-change', handler);
    return () => window.removeEventListener('haseb-tab-scale-change', handler);
  }, []);

  const handleStep = (dir: 'INC' | 'DEC') => {
    const next = stepTabScale(tabScale, dir);
    setTabScale(next);
    applyGlobalTabScaleToDom(next);
  };

  const handleReset = () => {
    setTabScale(DEFAULT_TAB_SCALE);
    applyGlobalTabScaleToDom(DEFAULT_TAB_SCALE);
    if (onSplitModeChange) {
      onSplitModeChange('BALANCED');
    }
  };

  return (
    <div
      data-testid={`${testIdPrefix}-resizer-bar`}
      className="inline-flex flex-wrap items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-xs shrink-0"
    >
      {/* 1. Tab & Button Scale Controls (+ / - تکبير وتصغير التبويبات) */}
      <div className="inline-flex items-center gap-1">
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 pe-1 whitespace-nowrap">
          حجم التبويبات:
        </span>
        <button
          type="button"
          data-testid={`${testIdPrefix}-scale-dec`}
          disabled={tabScale <= TAB_SCALE_MIN}
          onClick={() => handleStep('DEC')}
          title="تصغير التبويبات والأزرار (-5%)"
          className="w-6.5 h-6.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold cursor-pointer disabled:opacity-40 transition"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span
          data-testid={`${testIdPrefix}-scale-value`}
          onClick={handleReset}
          title="انقر لإعادة حجم التبويبات للوضع المتوازن (100%)"
          className="min-w-[44px] text-center font-mono font-bold text-[11px] px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 cursor-pointer select-none"
          dir="ltr"
        >
          {tabScale}%
        </span>
        <button
          type="button"
          data-testid={`${testIdPrefix}-scale-inc`}
          disabled={tabScale >= TAB_SCALE_MAX}
          onClick={() => handleStep('INC')}
          title="تكبير التبويبات والأزرار (+5%)"
          className="w-6.5 h-6.5 rounded-lg bg-blue-600 hover:bg-blue-700 border border-blue-600 text-white flex items-center justify-center font-bold cursor-pointer disabled:opacity-40 transition"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Split-Pane Resizing & Maximizing Controls (تكبير وتصغير أقسام الشاشة المزدوجة) */}
      {splitMode && onSplitModeChange && (
        <>
          <span className="text-slate-300 dark:text-slate-600 select-none">|</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              data-testid={`${testIdPrefix}-split-expand-primary`}
              onClick={() =>
                onSplitModeChange(
                  splitMode === 'EXPAND_PRIMARY' ? 'MAXIMIZE_PRIMARY' : 'EXPAND_PRIMARY'
                )
              }
              title={`تكبير ${primaryPaneLabel} (انقر مرتين لملء العرض 100%)`}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer transition ${
                splitMode === 'EXPAND_PRIMARY' || splitMode === 'MAXIMIZE_PRIMARY'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
              <span>تكبير {primaryPaneLabel}</span>
            </button>

            <button
              type="button"
              data-testid={`${testIdPrefix}-split-balanced`}
              onClick={() => onSplitModeChange('BALANCED')}
              title="تقسيم متوازن بين القسمين"
              className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer transition ${
                splitMode === 'BALANCED'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>متوازن</span>
            </button>

            <button
              type="button"
              data-testid={`${testIdPrefix}-split-expand-secondary`}
              onClick={() =>
                onSplitModeChange(
                  splitMode === 'EXPAND_SECONDARY' ? 'MAXIMIZE_SECONDARY' : 'EXPAND_SECONDARY'
                )
              }
              title={`تكبير ${secondaryPaneLabel} (انقر مرتين لملء العرض 100%)`}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer transition ${
                splitMode === 'EXPAND_SECONDARY' || splitMode === 'MAXIMIZE_SECONDARY'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
              <span>تكبير {secondaryPaneLabel}</span>
            </button>
          </div>
        </>
      )}

      {/* 3. Optional Full-Section Maximize Toggle */}
      {onToggleSectionMaximized && (
        <>
          <span className="text-slate-300 dark:text-slate-600 select-none">|</span>
          <button
            type="button"
            data-testid={`${testIdPrefix}-toggle-maximize`}
            onClick={onToggleSectionMaximized}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer transition ${
              isSectionMaximized
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {isSectionMaximized ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>إظهار كافة الأقسام</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{maximizeLabel}</span>
              </>
            )}
          </button>
        </>
      )}

      {tabScale !== DEFAULT_TAB_SCALE && (
        <button
          type="button"
          onClick={handleReset}
          title="إعادة ضبط الحجم والتقسيم"
          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
