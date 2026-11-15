import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../../types/erp';
import { calculateStockAdjustmentVariance } from '../../core/inventoryEngine';

export interface StockTakingRowProps {
  product: Product;
  countedQty: number;
  specificClassificationAr: string;
  formatCurrency: (val: number) => string;
  onStepCount: (product: Product, delta: number) => void;
  onSetCount: (productId: string, nextCount: number) => void;
  onCommitSingle: (product: Product) => void;
}

export const StockTakingRow: React.FC<StockTakingRowProps> = React.memo(
  ({
    product: p,
    countedQty,
    specificClassificationAr,
    formatCurrency,
    onStepCount,
    onSetCount,
    onCommitSingle,
  }) => {
    const variance = calculateStockAdjustmentVariance(
      p.id,
      p.stockQty,
      countedQty,
      p.costPrice
    );

    return (
      <tr className="hover:bg-slate-50/70 transition">
        <td className="py-3 px-4">
          <div className="font-bold text-slate-900">{p.nameAr}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
            <span className="font-mono text-blue-800 font-bold" dir="ltr">
              {p.sku}
            </span>
            <span>·</span>
            <span>{specificClassificationAr}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700" dir="ltr">
          {p.stockQty} {p.uom}
        </td>
        <td className="py-3 px-4 text-center">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              data-testid={`stock-step-dec-${p.sku}`}
              onClick={() => onStepCount(p, -1)}
              className="w-7 h-7 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-slate-300 flex items-center justify-center font-bold cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={0}
              data-testid={`stock-count-input-${p.sku}`}
              value={countedQty}
              onChange={(e) => onSetCount(p.id, Math.max(0, Number(e.target.value)))}
              className="w-20 text-center font-mono font-bold p-1.5 bg-slate-50 border border-slate-300 rounded-md focus:border-blue-600 outline-hidden"
            />
            <button
              type="button"
              data-testid={`stock-step-inc-${p.sku}`}
              onClick={() => onStepCount(p, 1)}
              className="w-7 h-7 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 border border-slate-300 flex items-center justify-center font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td className="py-3 px-4 text-center font-mono font-bold" dir="ltr">
          <span
            className={`px-2 py-0.5 rounded text-[11px] ${
              variance.adjustmentType === 'SURPLUS'
                ? 'bg-blue-100 text-blue-800'
                : variance.adjustmentType === 'DEFICIT'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {variance.varianceQty > 0 ? `+${variance.varianceQty}` : variance.varianceQty}
          </span>
        </td>
        <td className="py-3 px-4 text-end font-mono font-bold text-slate-800" dir="ltr">
          {formatCurrency(variance.varianceValue)}
        </td>
        <td className="py-3 px-4 text-center">
          <button
            type="button"
            data-testid={`commit-stock-take-btn-${p.sku}`}
            onClick={() => onCommitSingle(p)}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-md font-bold text-xs transition cursor-pointer"
          >
            اعتماد الجرد وترحيل القيد
          </button>
        </td>
      </tr>
    );
  }
);

StockTakingRow.displayName = 'StockTakingRow';
