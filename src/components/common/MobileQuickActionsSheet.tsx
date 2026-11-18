import React, { useRef, useCallback, useEffect } from 'react';
import {
  Zap,
  X,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Trash2,
  ShoppingCart,
  MessageSquare,
  Boxes,
  Network,
} from 'lucide-react';
import {
  DOUBLE_TAP_THRESHOLD_MS,
  evaluateDoubleTapGesture,
  buildMobileQuickActionsForTarget,
  MobileQuickActionTarget,
  MobileQuickActionDescriptor,
} from '../../core/mobileTouchEngine';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

export interface UseDoubleTapOptions<T> {
  itemId: string;
  onDoubleTap: (payload: T) => void;
  onSingleTap?: (payload: T) => void;
  thresholdMs?: number;
}

/**
 * Hook that detects Double-Tap on mobile touch devices (onTouchEnd / rapid taps)
 * as well as standard onDoubleClick events on desktop/headless browsers.
 */
export function useDoubleTapGesture() {
  const lastTapRef = useRef<{ timeMs: number; itemId: string | null }>({
    timeMs: 0,
    itemId: null,
  });

  const registerTap = useCallback(
    (
      itemId: string,
      onDoubleTapTriggered: () => void,
      thresholdMs: number = DOUBLE_TAP_THRESHOLD_MS
    ): boolean => {
      const now = Date.now();
      const result = evaluateDoubleTapGesture(
        lastTapRef.current.timeMs,
        lastTapRef.current.itemId,
        now,
        itemId,
        thresholdMs
      );
      lastTapRef.current = {
        timeMs: result.nextLastTapTimestampMs,
        itemId: result.nextLastTapItemId,
      };
      if (result.isDoubleTap) {
        onDoubleTapTriggered();
        return true;
      }
      return false;
    },
    []
  );

  return { registerTap };
}

export interface MobileQuickActionsSheetProps {
  target: MobileQuickActionTarget | null;
  onClose: () => void;
  onSelectAction: (action: MobileQuickActionDescriptor, target: MobileQuickActionTarget) => void;
  language?: string;
}

export const MobileQuickActionsSheet: React.FC<MobileQuickActionsSheetProps> = ({
  target,
  onClose,
  onSelectAction,
  language = 'ar',
}) => {
  const sheetLayer = useModalLayer(Boolean(target), 85);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sheetLayer.isTopLayer) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, sheetLayer.isTopLayer, onClose]);

  if (!target) return null;

  const isAr = language === 'ar';
  const actions = buildMobileQuickActionsForTarget(target);

  const getToneClasses = (tone: MobileQuickActionDescriptor['tone']) => {
    switch (tone) {
      case 'primary':
        return {
          iconBox: 'haseb-btn-primary text-white shadow-2xs',
          badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
          rowBorder: 'border-slate-200/90 hover:border-blue-400 dark:border-slate-800 dark:hover:border-blue-600',
        };
      case 'emerald':
        return {
          iconBox: 'bg-emerald-600 text-white shadow-2xs',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          rowBorder: 'border-slate-200/90 hover:border-emerald-400 dark:border-slate-800 dark:hover:border-emerald-600',
        };
      case 'amber':
        return {
          iconBox: 'bg-amber-500 text-white shadow-2xs',
          badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
          rowBorder: 'border-slate-200/90 hover:border-amber-400 dark:border-slate-800 dark:hover:border-amber-600',
        };
      case 'rose':
        return {
          iconBox: 'bg-rose-600 text-white shadow-2xs',
          badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
          rowBorder: 'border-rose-200/80 hover:border-rose-400 bg-rose-50/20 dark:border-rose-900/60',
        };
      case 'indigo':
        return {
          iconBox: 'bg-indigo-600 text-white shadow-2xs',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
          rowBorder: 'border-slate-200/90 hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-600',
        };
      default:
        return {
          iconBox: 'bg-slate-700 text-white shadow-2xs',
          badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          rowBorder: 'border-slate-200/90 hover:border-slate-400 dark:border-slate-800',
        };
    }
  };

  const renderActionIcon = (actionId: string, tone: MobileQuickActionDescriptor['tone']) => {
    if (tone === 'rose' || actionId.includes('delete') || actionId.includes('remove')) {
      return <Trash2 className="w-4 h-4" />;
    }
    if (actionId.includes('whatsapp') || actionId.includes('chat') || actionId.includes('send')) {
      return <MessageSquare className="w-4 h-4" />;
    }
    if (actionId.includes('pos') || actionId.includes('cart') || actionId.includes('add')) {
      return <ShoppingCart className="w-4 h-4" />;
    }
    if (actionId.includes('branch') || actionId.includes('probe') || actionId.includes('lan')) {
      return <Network className="w-4 h-4" />;
    }
    if (actionId.includes('stock') || actionId.includes('inv')) {
      return <Boxes className="w-4 h-4" />;
    }
    return <Sparkles className="w-4 h-4" />;
  };

  return renderModalPortal(
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      data-testid="mobile-quick-actions-sheet"
      data-context-type={target.contextType}
      data-target-id={target.itemId}
      data-modal-top={sheetLayer.isTopLayer ? 'true' : undefined}
      style={{ zIndex: sheetLayer.zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none touch-manipulation"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-150">
        {/* Top Grab Handle for Mobile Touch Ergonomics */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-11 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl haseb-btn-primary text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                  {isAr ? 'قائمة الإجراءات السريعة ⚡' : 'Quick Actions Menu ⚡'}
                </span>
                {target.badgeAr && (
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    dir="ltr"
                  >
                    {target.badgeAr}
                  </span>
                )}
              </div>
              <h3
                data-testid="mobile-quick-actions-title"
                className="font-black text-sm text-slate-900 dark:text-white truncate mt-1"
              >
                {target.titleAr}
              </h3>
              {target.subtitleAr && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {target.subtitleAr}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="close-mobile-quick-actions-btn"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق قائمة الإجراءات السريعة' : 'Close Quick Actions'}
            className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-300 flex items-center justify-center transition cursor-pointer shrink-0 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generous Touch-Friendly Action Buttons List */}
        <div className="p-4 space-y-2.5 max-h-[65vh] overflow-y-auto">
          {actions.map((action) => {
            const styles = getToneClasses(action.tone);
            return (
              <button
                key={action.id}
                type="button"
                data-testid={`mobile-quick-action-${action.id}`}
                onClick={() => {
                  onSelectAction(action, target);
                  onClose();
                }}
                className={`w-full min-h-[56px] p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border ${styles.rowBorder} flex items-center justify-between gap-3 text-start transition active:scale-[0.99] cursor-pointer shadow-2xs hover:shadow-sm touch-manipulation`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBox}`}
                  >
                    {renderActionIcon(action.id, action.tone)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {isAr ? action.labelAr : action.labelEn}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {action.subtitleAr}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {action.badgeText && (
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${styles.badge}`}
                      dir="ltr"
                    >
                      {action.badgeText}
                    </span>
                  )}
                  <ChevronLeft className="w-4 h-4 text-slate-400 rtl:rotate-0 ltr:rotate-180" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="px-5 py-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {isAr
                ? 'تلميح: انقر نقراً مزدوجاً على أي عنصر لإظهار هذه القائمة فوراً'
                : 'Tip: Double-tap any list item to open quick actions'}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 min-h-[38px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 cursor-pointer touch-manipulation"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
