import React from 'react';
import { CheckCircle2, Shield, ShieldOff, Zap } from 'lucide-react';
import { InvoiceItem, Product } from '../../types/erp';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import { getAllProductUnitChoices } from '../../core/multiUnitAndProcurementEngine';
import { isCartItemWarrantyActive } from '../../core/salesReturnEngine';
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
    meta: { serialNumber?: string; warrantyEnabled?: boolean; warrantyMonths?: number }
  ) => void;
  onFocusField: (fieldId: string) => void;
  onOpenQuickActions?: (item: InvoiceItem) => void;
}

const WARRANTY_DURATION_OPTIONS = [1, 3, 6, 12, 18, 24, 36, 48, 60, 120, 144];

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

    const warrantyActive = isCartItemWarrantyActive(item);
    const activeWarrantyMonths = warrantyActive ? Number(item.warrantyMonths) || 12 : 0;
    const durationChoices = WARRANTY_DURATION_OPTIONS.includes(activeWarrantyMonths)
      ? WARRANTY_DURATION_OPTIONS
      : activeWarrantyMonths > 0
      ? [...WARRANTY_DURATION_OPTIONS, activeWarrantyMonths].sort((a, b) => a - b)
      : WARRANTY_DURATION_OPTIONS;

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
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono tabular-nums" dir="ltr">
              {formatCleanNumber(item.total)}{' '}
              <span className="text-[9.5px] sm:text-[10px] font-normal text-slate-500">{currency}</span>
            </span>
          </div>
        </div>

        {/* Serial & Interactive Warranty Control Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-slate-200/70 space-y-1.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                data-testid={`pos-cart-warranty-toggle-${item.productId}`}
                aria-pressed={warrantyActive}
                onClick={() =>
                  onUpdateMeta(item.productId, {
                    warrantyEnabled: !warrantyActive,
                    warrantyMonths: !warrantyActive
                      ? product?.warrantyMonths && product.warrantyMonths > 0
                        ? product.warrantyMonths
                        : 12
                      : 0,
                  })
                }
                className={`px-2 py-1 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 transition cursor-pointer ${
                  warrantyActive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
                title={warrantyActive ? 'انقر لإلغاء الضمان عن هذا الصنف' : 'انقر لتفعيل الضمان لهذا الصنف'}
              >
                {warrantyActive ? (
                  <>
                    <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>الضمان مفعل</span>
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>بدون ضمان (ملغى)</span>
                  </>
                )}
              </button>

              <select
                data-testid={warrantyFieldId}
                data-pos-field-id={warrantyFieldId}
                value={warrantyActive ? activeWarrantyMonths : 0}
                onFocus={() => onFocusField(warrantyFieldId)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateMeta(item.productId, {
                    warrantyEnabled: val > 0,
                    warrantyMonths: val,
                  });
                }}
                aria-label={`مدة الضمان للصنف ${item.productName}`}
                className={`px-2 py-1 rounded-md border text-[10px] font-bold outline-hidden cursor-pointer ${
                  warrantyActive
                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <option value={0}>بدون ضمان (0 شهر)</option>
                {durationChoices.map((m) => (
                  <option key={m} value={m}>
                    ضمان {m} شهر
                  </option>
                ))}
              </select>
            </div>

            {warrantyActive ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <span className="text-[9.5px] font-semibold text-rose-600">لن يظهر في الفاتورة</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[9.5px] font-mono text-slate-400 shrink-0">S/N:</span>
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
              placeholder="الرقم التسلسلي S/N أو IMEI (اختياري)..."
              dir="ltr"
              className="text-[10px] sm:text-[11px] font-mono text-slate-700 bg-transparent border-none outline-hidden w-full text-left min-w-0"
            />
          </div>
        </div>
      </div>
    );
  }
);

POSCartItemRow.displayName = 'POSCartItemRow';
