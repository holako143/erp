import React from 'react';
import {
  Plus,
  Minus,
  Edit3,
  ClipboardCheck,
  ShoppingCart,
  Network,
  Trash2,
  Zap,
} from 'lucide-react';
import { Product } from '../../types/erp';
import { getProductVisualIllustrationUri } from '../../core/inventoryEngine';
import { useDoubleTapGesture } from '../common/MobileQuickActionsSheet';

export interface InventoryProductRowProps {
  product: Product;
  specificClassificationAr: string;
  currency: string;
  language: string;
  showCostPrice: boolean;
  onQuickStockStep: (product: Product, delta: number) => void;
  onOpenEditModal: (product: Product) => void;
  onGoToStockTake: (product: Product) => void;
  onSellInPos: (product: Product) => void;
  onProbeCrossBranch: (sku: string) => void;
  onDeleteProduct: (product: Product) => void;
  onOpenQuickActions?: (product: Product) => void;
}

export const InventoryProductRow: React.FC<InventoryProductRowProps> = React.memo(
  ({
    product: p,
    specificClassificationAr,
    currency,
    language,
    showCostPrice,
    onQuickStockStep,
    onOpenEditModal,
    onGoToStockTake,
    onSellInPos,
    onProbeCrossBranch,
    onDeleteProduct,
    onOpenQuickActions,
  }) => {
    const { registerTap } = useDoubleTapGesture();
    const isReorder = p.stockQty <= p.reorderPoint;

    return (
      <tr
        data-testid={`inventory-row-${p.sku}`}
        onClick={() => {
          if (onOpenQuickActions) {
            registerTap(`inv-row-${p.id}`, () => onOpenQuickActions(p));
          }
        }}
        onDoubleClick={(e) => {
          if (onOpenQuickActions) {
            e.stopPropagation();
            onOpenQuickActions(p);
          }
        }}
        className="haseb-touch-list-item hover:bg-slate-50/70 transition cursor-pointer"
      >
        <td className="py-3.5 px-4">
          <div className="flex items-start gap-2.5">
            <img
              src={getProductVisualIllustrationUri(p)}
              alt={p.nameAr}
              loading="lazy"
              className="w-11 h-11 rounded-xl object-cover border border-slate-200/80 shrink-0 bg-slate-50"
            />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm">
                {language === 'ar' ? p.nameAr : p.name}
              </div>
              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span>
                  SKU:{' '}
                  <span
                    className="font-mono tabular-nums text-blue-800 font-bold"
                    dir="ltr"
                  >
                    {p.sku}
                  </span>
                </span>
                <span>·</span>
                <span>
                  الموقع:{' '}
                  <span className="font-mono tabular-nums text-slate-700" dir="ltr">
                    {p.binLocation || 'ZA-01'}
                  </span>
                </span>
              </div>
            </div>
          </div>
          {(p.powerRatingWatts ||
            p.batteryCapacitySpec ||
            p.voltageSpec ||
            p.screenSizeSpec) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {p.powerRatingWatts && (
                <span
                  className="text-[10px] font-mono tabular-nums bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded-xs font-semibold"
                  dir="ltr"
                >
                  {p.powerRatingWatts >= 1000
                    ? `${(p.powerRatingWatts / 1000).toFixed(1).replace('.0', '')} kW`
                    : `${p.powerRatingWatts} W`}
                </span>
              )}
              {p.batteryCapacitySpec && (
                <span
                  className="text-[10px] font-mono tabular-nums bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded-xs font-semibold"
                  dir="ltr"
                >
                  {p.batteryCapacitySpec}
                </span>
              )}
              {p.voltageSpec && (
                <span
                  className="text-[10px] font-mono tabular-nums bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-xs"
                  dir="ltr"
                >
                  {p.voltageSpec}
                </span>
              )}
              {p.screenSizeSpec && (
                <span
                  className="text-[10px] font-mono tabular-nums bg-sky-50 text-sky-900 border border-sky-200 px-1.5 py-0.5 rounded-xs font-semibold"
                  dir="ltr"
                >
                  {p.screenSizeSpec}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="py-3.5 px-4">
          <span
            data-testid={`product-specific-category-${p.sku}`}
            className="inline-block bg-blue-50 text-blue-900 border border-blue-200 font-bold px-2.5 py-0.5 rounded-xs text-[11px]"
          >
            {specificClassificationAr}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {p.warrantyMonths && (
              <span className="text-[10px] bg-indigo-50 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded-xs font-bold">
                ضمان{' '}
                <span className="font-mono tabular-nums" dir="ltr">
                  {p.warrantyMonths}
                </span>{' '}
                شهر
              </span>
            )}
            {p.hasSerials && (
              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-xs font-bold">
                تتبع S/N
              </span>
            )}
          </div>
        </td>
        <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-800" dir="ltr">
          {p.barcode}
        </td>
        {showCostPrice && (
          <td
            className="py-3.5 px-4 text-end font-semibold font-mono tabular-nums text-slate-700"
            dir="ltr"
          >
            {p.costPrice.toLocaleString()} {currency}
          </td>
        )}
        <td
          className="py-3.5 px-4 text-end font-bold font-mono tabular-nums text-slate-900"
          dir="ltr"
        >
          {p.salePrice.toLocaleString()} {currency}
        </td>
        <td className="py-3.5 px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <button
              type="button"
              data-testid={`quick-stock-dec-${p.sku}`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickStockStep(p, -1);
              }}
              title="إنقاص الرصيد (-1)"
              className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 flex items-center justify-center font-bold transition cursor-pointer touch-manipulation"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="px-1.5 min-w-[3rem] text-center">
              <span
                className="font-bold font-mono tabular-nums text-sm text-slate-900"
                dir="ltr"
              >
                {p.stockQty}
              </span>{' '}
              <span className="text-[10px] text-slate-500 font-medium">{p.uom}</span>
            </div>
            <button
              type="button"
              data-testid={`quick-stock-inc-${p.sku}`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickStockStep(p, 1);
              }}
              title="زيادة الرصيد (+1)"
              className="w-8 h-8 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 flex items-center justify-center font-bold transition cursor-pointer touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td className="py-3.5 px-4 text-center">
          <span
            className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold border ${
              isReorder
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {isReorder ? 'إعادة طلب' : 'متوفر'}
          </span>
        </td>
        <td className="py-3.5 px-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {onOpenQuickActions && (
              <button
                type="button"
                data-testid={`inv-row-quick-actions-${p.sku}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuickActions(p);
                }}
                className="px-2.5 py-1.5 min-h-[34px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer touch-manipulation"
                title="قائمة الإجراءات السريعة (أو انقر مرتين على الصف)"
              >
                <Zap className="w-3 h-3" />
                <span>سريع</span>
              </button>
            )}
            <button
              type="button"
              data-testid={`edit-product-btn-${p.sku}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditModal(p);
              }}
              className="px-2.5 py-1.5 min-h-[34px] bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer touch-manipulation"
              title="تعديل بيانات الصنف، السعر، الكود، الباركود، أو التصنيف المخزني"
            >
              <Edit3 className="w-3 h-3 text-blue-600" />
              <span>تعديل</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGoToStockTake(p);
              }}
              className="px-2.5 py-1.5 min-h-[34px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer touch-manipulation"
              title="جرد وتسوية الرصيد الفعلي للصنف"
            >
              <ClipboardCheck className="w-3 h-3 text-indigo-600" />
              <span>جرد</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSellInPos(p);
              }}
              className="px-2.5 py-1.5 min-h-[34px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer touch-manipulation"
              title="إضافة مباشرة لسلة نقطة البيع والانتقال للكاشير"
            >
              <ShoppingCart className="w-3 h-3 text-slate-700" />
              <span>بيع POS</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onProbeCrossBranch(p.sku);
              }}
              className="px-2.5 py-1.5 min-h-[34px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer touch-manipulation"
              title="فحص توفر الصنف في باقي الفروع والشبكة المحلية (LAN)"
            >
              <Network className="w-3 h-3 text-sky-600" />
              <span>الفروع</span>
            </button>
            <button
              type="button"
              data-testid={`delete-product-btn-${p.sku}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProduct(p);
              }}
              className="p-1.5 min-h-[34px] min-w-[34px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold inline-flex items-center justify-center transition cursor-pointer touch-manipulation"
              title="حذف الصنف من المخزون"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

InventoryProductRow.displayName = 'InventoryProductRow';
