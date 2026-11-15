import React from 'react';
import { Plus, Camera } from 'lucide-react';
import { Product } from '../../types/erp';
import { getProductVisualIllustrationUri } from '../../core/inventoryEngine';
import { formatCleanNumber } from '../../core/systemConfigEngine';

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
  }) => {
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

    return (
      <div
        data-testid={`pos-product-card-${p.sku}`}
        onClick={() => onAddToCart(p)}
        className={`bg-white rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-md select-none overflow-hidden relative ${
          isInCart
            ? 'border-blue-600 ring-2 ring-blue-500/15'
            : 'border-slate-200/80 hover:border-blue-500/50'
        }`}
      >
        {/* Mode 1: WITH_IMAGES — Visual Product Thumbnail Header + Quick Attach Image Action */}
        {displayMode === 'WITH_IMAGES' && (
          <div className="relative h-28 sm:h-32 w-full bg-slate-50/90 border-b border-slate-100 flex items-center justify-center p-2 overflow-hidden">
            <img
              src={visualImgSrc}
              alt={p.nameAr || p.name}
              className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            {/* Top Overlay Badges */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none">
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shadow-2xs backdrop-blur-xs ${warrantyBadgeClass}`}
              >
                ضمان {warrantyMonths} شهر
              </span>
              {isInCart && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-600 text-white shadow-xs">
                  ×{inCartQuantity}
                </span>
              )}
            </div>

            {/* Direct Quick Image Upload Button on Product Card */}
            <label
              data-testid={`pos-card-attach-image-${p.sku}`}
              onClick={(e) => e.stopPropagation()}
              title="إرفاق أو تغيير صورة الصنف مباشرة"
              className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-lg bg-white/90 hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200/80 flex items-center justify-center shadow-2xs opacity-85 group-hover:opacity-100 transition cursor-pointer"
            >
              <Camera className="w-3 h-3" />
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
          </div>
        )}

        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span
                className="text-[10px] font-mono font-semibold text-slate-400 tracking-wide truncate"
                dir="ltr"
              >
                {p.sku}
              </span>
              {displayMode === 'DATA_ONLY' && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${warrantyBadgeClass}`}
                >
                  ضمان {warrantyMonths} شهر
                </span>
              )}
            </div>

            <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
              {displayName}
            </h3>

            <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 mb-2.5">
              <span
                className="bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 font-mono truncate max-w-[110px]"
                dir="ltr"
              >
                {chip1}
              </span>
              <span className="bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 truncate max-w-[110px]">
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

          <div className="pt-2.5 border-t border-slate-100 flex items-end justify-between gap-1">
            <div>
              <span className="block text-[9px] sm:text-[10px] text-slate-400">السعر النقدي</span>
              <span className="text-sm sm:text-base font-black text-slate-900 font-mono" dir="ltr">
                {formatCleanNumber(p.salePrice)}{' '}
                <span className="text-[10px] font-normal text-slate-400">{currency}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">
                المتوفر:{' '}
                <strong
                  className={`font-mono ${
                    p.stockQty <= p.reorderPoint ? 'text-rose-600' : 'text-slate-700'
                  }`}
                  dir="ltr"
                >
                  {p.stockQty}
                </strong>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(p);
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 group-hover:bg-slate-900 text-slate-700 group-hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

POSProductCard.displayName = 'POSProductCard';
