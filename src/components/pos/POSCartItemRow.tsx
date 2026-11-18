import React from 'react';
import { CheckCircle2, Zap } from 'lucide-react';
import { InvoiceItem, Product } from '../../types/erp';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import { getAllProductUnitChoices } from '../../core/multiUnitAndProcurementEngine';
import { useDoubleTapGesture } from '../common/MobileQuickActionsSheet';

export interface POSCartItemRowProps {
  item: InvoiceItem;
  product?: Product;
  currency: string;
  onRemove: (productId: string) => void;
  onUpdateQty: (productId: string, newQty: number) => void;
  onUpdateUnit?: (productId: string, unitName: string) => void;
  onUpdateMeta: (
    productId: string,
    meta: { serialNumber?: string; warrantyMonths?: number }
  ) => void;
  onFocusField: (fieldId: string) => void;
  onOpenQuickActions?: (item: InvoiceItem) => void;
}

export const POSCartItemRow: React.FC<POSCartItemRowProps> = React.memo(
  ({
    item,
    product,
    currency,
    onRemove,
    onUpdateQty,
    onUpdateUnit,
    onUpdateMeta,
    onFocusField,
    onOpenQuickActions,
  }) => {
    const { registerTap } = useDoubleTapGesture();
    const serialFieldId = `pos-cart-serial-${item.productId}`;
    const warrantyFieldId = `pos-cart-warranty-${item.productId}`;
    const unitChoices = product && product.units && product.units.length > 0
      ? getAllProductUnitChoices(product)
      : [];

    return (
      <div
        data-testid={`pos-cart-item-${item.productId}`}
        onClick={() => {
          if (onOpenQuickActions) {
            registerTap(`cart-item-${item.productId}`, () => onOpenQuickActions(item));
          }
        }}
        onDoubleClick={(e) => {
          if (onOpenQuickActions) {
            e.stopPropagation();
            onOpenQuickActions(item);
          }
        }}
        className="haseb-touch-list-item pos-focus-group bg-slate-50/70 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-200/70 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
              {item.sku === 'SOL-PNL-585W'
                ? 'لوح طاقة شمسية مونو كريستال Jinko Tiger Neo'
                : item.productName}
            </h4>
            <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-mono block mt-0.5 truncate" dir="ltr">
              {item.sku} • {formatCleanNumber(item.unitPrice)} {currency}
              {item.unitName ? ` / ${item.unitName}` : ''}
              {item.conversionFactor && item.conversionFactor > 1 ? ` (×${item.conversionFactor})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onOpenQuickActions && (
              <button
                type="button"
                data-testid={`pos-cart-item-quick-actions-${item.productId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuickActions(item);
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                title="قائمة الإجراءات السريعة (أو انقر مرتين)"
              >
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.productId);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer touch-manipulation text-xs"
              title="حذف الصنف من السلة"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quantity Stepper, Multi-Unit Switcher & Line Total */}
        <div className="flex items-center justify-between pt-0.5 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-slate-200/80 rounded-lg sm:rounded-xl p-0.5 sm:p-1">
              <button
                type="button"
                data-testid={`pos-cart-qty-dec-${item.productId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(item.productId, item.quantity - 1);
                }}
                className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-md sm:rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer touch-manipulation"
                aria-label="إنقاص الكمية"
              >
                -
              </button>
              <span
                data-testid={`pos-cart-qty-value-${item.productId}`}
                className="w-7 sm:w-8 text-center text-[11px] sm:text-xs font-mono font-bold text-slate-800"
                dir="ltr"
              >
                {item.quantity}
              </span>
              <button
                type="button"
                data-testid={`pos-cart-qty-inc-${item.productId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(item.productId, item.quantity + 1);
                }}
                className={`w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-md sm:rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer touch-manipulation ${
                  product && item.quantity * (item.conversionFactor || 1) >= product.stockQty
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'hover:bg-slate-100 active:bg-slate-200 text-slate-700'
                }`}
                aria-label="زيادة الكمية"
              >
                +
              </button>
            </div>
            {product && (
              <span
                data-testid={`pos-cart-item-stock-badge-${item.productId}`}
                className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border ${
                  item.quantity * (item.conversionFactor || 1) >= product.stockQty
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-white text-slate-500 border-slate-200/80'
                }`}
              >
                المتوفر: {product.stockQty}
                {item.quantity * (item.conversionFactor || 1) >= product.stockQty
                  ? ' (الحد الأقصى)'
                  : ''}
              </span>
            )}
            {unitChoices.length > 1 && onUpdateUnit && (
              <select
                data-testid={`pos-cart-unit-${item.productId}`}
                value={item.unitName || unitChoices[0].unitNameAr}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdateUnit(item.productId, e.target.value)}
                className="px-2 py-1 rounded-lg bg-white border border-slate-200/90 text-[10.5px] font-bold text-slate-700 outline-hidden focus:border-blue-500 cursor-pointer"
                aria-label="تغيير وحدة البيع"
              >
                {unitChoices.map((u) => (
                  <option key={u.unitId} value={u.unitNameAr}>
                    {u.unitNameAr} (×{u.conversionFactor})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="text-left">
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono" dir="ltr">
              {formatCleanNumber(item.total)}{' '}
              <span className="text-[9.5px] sm:text-[10px] font-normal text-slate-500">{currency}</span>
            </span>
          </div>
        </div>

        {/* Serial & Warranty Bar */}
        <div className="bg-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-slate-200/60 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">
              ضمان {item.warrantyMonths ?? 144}ش
            </span>
            <input
              type="text"
              data-testid={serialFieldId}
              data-pos-field-id={serialFieldId}
              value={item.serialNumber || ''}
              onFocus={(e) => {
                onFocusField(serialFieldId);
                e.currentTarget.select();
              }}
              onChange={(e) =>
                onUpdateMeta(item.productId, { serialNumber: e.target.value })
              }
              placeholder="S/N أو IMEI..."
              dir="ltr"
              className="text-[10px] sm:text-[11px] font-mono text-slate-600 bg-transparent border-none outline-hidden w-full text-left min-w-0"
            />
            <select
              data-testid={warrantyFieldId}
              data-pos-field-id={warrantyFieldId}
              value={item.warrantyMonths ?? 144}
              onFocus={() => onFocusField(warrantyFieldId)}
              onChange={(e) =>
                onUpdateMeta(item.productId, {
                  warrantyMonths: Number(e.target.value),
                })
              }
              aria-label="مدة الضمان بالشهور"
              className="sr-only"
            >
              <option value={12}>ضمان 12 شهر</option>
              <option value={24}>ضمان 24 شهر</option>
              <option value={36}>ضمان 36 شهر</option>
              <option value={60}>ضمان 60 شهر</option>
              <option value={120}>ضمان 120 شهر</option>
              <option value={144}>ضمان 144 شهر</option>
            </select>
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        </div>
      </div>
    );
  }
);

POSCartItemRow.displayName = 'POSCartItemRow';
