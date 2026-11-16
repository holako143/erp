import React from 'react';
import { CheckCircle2, Zap } from 'lucide-react';
import { InvoiceItem } from '../../types/erp';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import { useDoubleTapGesture } from '../common/MobileQuickActionsSheet';

export interface POSCartItemRowProps {
  item: InvoiceItem;
  currency: string;
  onRemove: (productId: string) => void;
  onUpdateQty: (productId: string, newQty: number) => void;
  onUpdateMeta: (
    productId: string,
    meta: { serialNumber?: string; warrantyMonths?: number }
  ) => void;
  onFocusField: (fieldId: string) => void;
  onOpenQuickActions?: (item: InvoiceItem) => void;
}

export const POSCartItemRow: React.FC<POSCartItemRowProps> = React.memo(
  ({ item, currency, onRemove, onUpdateQty, onUpdateMeta, onFocusField, onOpenQuickActions }) => {
    const { registerTap } = useDoubleTapGesture();
    const serialFieldId = `pos-cart-serial-${item.productId}`;
    const warrantyFieldId = `pos-cart-warranty-${item.productId}`;

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
        className="haseb-touch-list-item pos-focus-group bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/70 space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-800 leading-snug">
              {item.sku === 'SOL-PNL-585W'
                ? 'لوح طاقة شمسية مونو كريستال Jinko Tiger Neo'
                : item.productName}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5" dir="ltr">
              {item.sku} • {formatCleanNumber(item.unitPrice)} {currency}
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
                className="w-8 h-8 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                title="قائمة الإجراءات السريعة (أو انقر مرتين)"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.productId);
              }}
              className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
              title="حذف الصنف من السلة"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quantity Stepper & Line Total — Expanded Touch Targets */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQty(item.productId, item.quantity - 1);
              }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer touch-manipulation"
              aria-label="إنقاص الكمية"
            >
              -
            </button>
            <span
              className="w-9 text-center text-xs font-mono font-bold text-slate-800"
              dir="ltr"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQty(item.productId, item.quantity + 1);
              }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer touch-manipulation"
              aria-label="زيادة الكمية"
            >
              +
            </button>
          </div>
          <div className="text-left">
            <span className="text-sm font-bold text-slate-900 font-mono" dir="ltr">
              {formatCleanNumber(item.total)}{' '}
              <span className="text-[10px] font-normal text-slate-500">{currency}</span>
            </span>
          </div>
        </div>

        {/* Serial & Warranty Bar */}
        <div className="bg-white rounded-xl p-2 border border-slate-200/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
              ضمان {item.warrantyMonths ?? 144} شهر
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
              className="text-[11px] font-mono text-slate-600 bg-transparent border-none outline-hidden w-full text-left"
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
