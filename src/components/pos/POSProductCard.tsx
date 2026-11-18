import React from 'react';
import { Plus, Camera, Zap, AlertTriangle } from 'lucide-react';
import { Product } from '../../types/erp';
import { getProductVisualIllustrationUri } from '../../core/inventoryEngine';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import { useDoubleTapGesture } from '../common/MobileQuickActionsSheet';
import { evaluatePosItemSafetyThresholdWarning } from '../../core/posStrictStockValidationService';

export interface POSProductCardProps {
  product: Product;
  inCartQuantity: number;
  displayMode: 'WITH_IMAGES' | 'DATA_ONLY';
  currency: string;
  displayName: string;
  chip1: string;
  chip2: string;
  onAddToCart: (product: Product) => void;
  onProbeBranches: (sku: string) => void;
  onUpdateProductImage: (product: Product, imageDataUri: string) => void;
  onOpenQuickActions?: (product: Product) => void;
}

export const POSProductCard: React.FC<POSProductCardProps> = React.memo(
  ({
    product: p,
    inCartQuantity,
    displayMode,
    currency,
    displayName,
    chip1,
    chip2,
    onAddToCart,
    onProbeBranches,
    onUpdateProductImage,
    onOpenQuickActions,
  }) => {
    const { registerTap } = useDoubleTapGesture();
    const warrantyMonths = p.warrantyMonths || 12;
    const warrantyBadgeClass =
      warrantyMonths >= 100
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
        : warrantyMonths >= 48
        ? 'bg-blue-50 text-blue-700 border-blue-200/70'
        : warrantyMonths >= 24
        ? 'bg-amber-50 text-amber-700 border-amber-200/70'
        : 'bg-slate-100 text-slate-600 border-slate-200/70';

    const visualImgSrc = displayMode === 'WITH_IMAGES' ? getProductVisualIllustrationUri(p) : '';
    const isInCart = inCartQuantity > 0;
    const safetyMeta = evaluatePosItemSafetyThresholdWarning(p, inCartQuantity);
    const isAddDisabled = safetyMeta.remainingAvailableStock <= 0;

    return (
      <div
        data-testid={`pos-product-card-${p.sku}`}
        onClick={() => {
          if (
            onOpenQuickActions &&
            registerTap(`pos-prod-${p.id}`, () => onOpenQuickActions(p))
          ) {
            return;
          }
          onAddToCart(p);
        }}
        onDoubleClick={(e) => {
          if (onOpenQuickActions) {
            e.stopPropagation();
            onOpenQuickActions(p);
          }
        }}
        className={`haseb-touch-list-item bg-white rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-md select-none overflow-hidden relative ${
          isInCart
            ? 'border-blue-600 ring-2 ring-blue-500/15'
            : 'border-slate-200/80 hover:border-blue-500/50'
        }`}
      >
        {/* Mode 1: WITH_IMAGES — Visual Product Thumbnail Header + Quick Attach Image Action */}
        {displayMode === 'WITH_IMAGES' && (
          <div className="relative h-20 sm:h-28 w-full bg-slate-50/90 border-b border-slate-100 flex items-center justify-center p-1.5 sm:p-2 overflow-hidden">
            <img
              src={visualImgSrc}
              alt={p.nameAr || p.name}
              className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            {/* Top Overlay Badges */}
            <div className="absolute top-1.5 sm:top-2 inset-x-1.5 sm:inset-x-2 flex items-center justify-between gap-1 pointer-events-none">
              <span
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-bold border shadow-2xs backdrop-blur-xs truncate max-w-[75%] ${warrantyBadgeClass}`}
              >
                ضمان {warrantyMonths} شهر
              </span>
              {isInCart && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-blue-600 text-white shadow-xs shrink-0">
                  ×{inCartQuantity}
                </span>
              )}
            </div>

            {/* Direct Quick Image Upload Button & Quick Actions Trigger */}
            <div className="absolute bottom-1 sm:bottom-1.5 inset-x-1 sm:inset-x-1.5 flex items-center justify-between gap-1">
              <label
                data-testid={`pos-card-attach-image-${p.sku}`}
                onClick={(e) => e.stopPropagation()}
                title="إرفاق أو تغيير صورة الصنف مباشرة"
                className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-white/95 hover:bg-blue-600 text-slate-600 hover:text-white border border-slate-200/80 flex items-center justify-center shadow-2xs opacity-90 group-hover:opacity-100 transition cursor-pointer touch-manipulation"
              >
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    e.stopPropagation();
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        onUpdateProductImage(p, reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              {onOpenQuickActions && (
                <button
                  type="button"
                  data-testid={`pos-card-quick-actions-${p.sku}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuickActions(p);
                  }}
                  title="قائمة الإجراءات السريعة للصنف (أو انقر مرتين)"
                  aria-label={`الإجراءات السريعة للصنف ${displayName}`}
                  className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-white/95 hover:bg-blue-600 text-blue-600 hover:text-white border border-slate-200/80 flex items-center justify-center shadow-2xs opacity-90 group-hover:opacity-100 transition cursor-pointer touch-manipulation"
                >
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className="text-[9.5px] sm:text-[10px] font-mono font-semibold text-slate-400 tracking-wide truncate"
                dir="ltr"
              >
                {p.sku}
              </span>
              {displayMode === 'DATA_ONLY' && (
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium border ${warrantyBadgeClass}`}
                  >
                    ضمان {warrantyMonths}ش
                  </span>
                  {onOpenQuickActions && (
                    <button
                      type="button"
                      data-testid={`pos-card-quick-actions-${p.sku}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQuickActions(p);
                      }}
                      title="قائمة الإجراءات السريعة للصنف"
                      aria-label={`الإجراءات السريعة للصنف ${displayName}`}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition cursor-pointer touch-manipulation"
                    >
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <h3 className="text-[11px] sm:text-[12.5px] font-bold text-slate-800 leading-snug mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
              {displayName}
            </h3>

            <div className="flex flex-wrap items-center gap-1 text-[9px] sm:text-[10px] text-slate-500 mb-2">
              <span
                className="bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 font-mono truncate max-w-[85px] sm:max-w-[110px]"
                dir="ltr"
              >
                {chip1}
              </span>
              <span className="bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 truncate max-w-[85px] sm:max-w-[110px]">
                {chip2}
              </span>
              <button
                type="button"
                data-testid={`btn-probe-branches-${p.sku}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onProbeBranches(p.sku);
                }}
                className="sr-only"
                title="فحص توفر الصنف في باقي الفروع"
              >
                فحص الفروع
              </button>
            </div>
          </div>

          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-end justify-between gap-1.5 min-w-0">
            <div className="min-w-0">
              <span className="block text-[8.5px] sm:text-[10px] text-slate-400 truncate">السعر النقدي</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono block truncate" dir="ltr">
                {formatCleanNumber(p.salePrice)}{' '}
                <span className="text-[9px] sm:text-[10px] font-normal text-slate-400">{currency}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {safetyMeta.showAmberWarningIcon && (
                <span
                  data-testid={`pos-card-safety-warning-${p.sku}`}
                  title={safetyMeta.tooltipAr}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 shrink-0"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                </span>
              )}
              <span
                data-testid={`pos-card-stock-${p.sku}`}
                className="text-[9px] sm:text-[10px] text-slate-500 flex items-center gap-1"
              >
                <span className="hidden xs:inline">المتوفر: </span>
                <strong
                  className={`font-mono ${
                    p.stockQty <= 0 || inCartQuantity >= p.stockQty
                      ? 'text-rose-600'
                      : safetyMeta.showAmberWarningIcon
                      ? 'text-amber-600'
                      : 'text-slate-700'
                  }`}
                  dir="ltr"
                >
                  {p.stockQty}
                </strong>
                {inCartQuantity >= p.stockQty && (
                  <span
                    data-testid={`pos-card-stock-max-badge-${p.sku}`}
                    className="px-1 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[8px] font-bold"
                  >
                    {p.stockQty <= 0 ? 'نفد' : 'الحد الأقصى'}
                  </span>
                )}
              </span>
              <button
                type="button"
                data-testid={`pos-card-add-btn-${p.sku}`}
                disabled={isAddDisabled}
                aria-disabled={isAddDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(p);
                }}
                aria-label={`إضافة ${displayName} للسلة`}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 touch-manipulation ${
                  isAddDisabled
                    ? 'bg-rose-50 text-rose-400 border border-rose-200 cursor-not-allowed opacity-60'
                    : 'bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white cursor-pointer'
                }`}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

POSProductCard.displayName = 'POSProductCard';
