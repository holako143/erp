import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { Product } from '../../types/erp';
import {
  applyPosBulkStockAdjustments,
  BulkStockAdjustmentBatchResult,
} from '../../core/posStrictStockValidationService';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

export interface POSBulkStockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  cartQtyByProductId: Record<string, number>;
  language: 'ar' | 'en';
  onCommitBulkAdjustments: (result: BulkStockAdjustmentBatchResult) => void;
}

export const POSBulkStockAdjustModal: React.FC<POSBulkStockAdjustModalProps> = ({
  isOpen,
  onClose,
  products,
  cartQtyByProductId,
  language,
  onCommitBulkAdjustments,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'MODIFIED' | 'LOW_STOCK'>('ALL');
  const [reasonAr, setReasonAr] = useState(
    'مطابقة الجرد الفعلي السريع أثناء البيع في نقطة البيع (POS Discrepancy Check)'
  );
  const [physicalQtyMap, setPhysicalQtyMap] = useState<Record<string, number>>({});
  const { zIndex, isTopLayer } = useModalLayer(isOpen, 70);

  const previewResult = useMemo(() => {
    const adjustments = Object.entries(physicalQtyMap).map(([productId, newPhysicalQty]) => ({
      productId,
      newPhysicalQty: Number(newPhysicalQty),
    }));
    return applyPosBulkStockAdjustments({
      products,
      adjustments,
      reasonAr,
    });
  }, [products, physicalQtyMap, reasonAr]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nameAr.includes(searchQuery.trim()) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(searchQuery.trim());
      if (!matchesSearch) return false;

      if (filterMode === 'MODIFIED') {
        const draftQty = physicalQtyMap[p.id];
        return draftQty !== undefined && Number(draftQty) !== Number(p.stockQty);
      }
      if (filterMode === 'LOW_STOCK') {
        return Number(p.stockQty) <= Math.ceil((Number(p.reorderPoint) || 5) * 1.35);
      }
      return true;
    });
  }, [products, searchQuery, filterMode, physicalQtyMap]);

  if (!isOpen) return null;

  const handleSetPhysicalQty = (product: Product, rawValue: number) => {
    const clean = Math.max(0, Math.round((Number(rawValue) || 0) * 1000) / 1000);
    setPhysicalQtyMap((prev) => ({
      ...prev,
      [product.id]: clean,
    }));
  };

  const handleResetAll = () => {
    setPhysicalQtyMap({});
  };

  const handleCommit = () => {
    if (previewResult.updatedCount === 0) return;
    onCommitBulkAdjustments(previewResult);
    setPhysicalQtyMap({});
    onClose();
  };

  return renderModalPortal(
    <div
      data-testid="pos-bulk-stock-adjust-modal"
      data-modal-top={isTopLayer ? 'true' : 'false'}
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>
                  {language === 'ar'
                    ? 'التعديل الجماعي السريع للمخزون (POS Bulk Stock Adjust)'
                    : 'POS Bulk Stock Adjustment'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                  {language === 'ar' ? 'صلاحية مدير المعرض' : 'Manager Override'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'ar'
                  ? 'تعديل الأرصدة الفعلية لعدة أصناف دفعة واحدة من شاشة الكاشير عند اكتشاف فارق جرد فعلي أثناء البيع'
                  : 'Quickly modify physical stock levels for multiple items directly from the POS interface'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="pos-bulk-adjust-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Reason Toolbar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="pos-bulk-adjust-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'ابحث بالاسم أو كود SKU أو الباركود...'
                    : 'Search by item name, SKU, or barcode...'
                }
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-hidden focus:border-blue-600"
              />
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
              {[
                { id: 'ALL', labelAr: `الكل (${products.length})`, labelEn: `All (${products.length})` },
                {
                  id: 'LOW_STOCK',
                  labelAr: 'قريب من النفاد',
                  labelEn: 'Low Stock',
                },
                {
                  id: 'MODIFIED',
                  labelAr: `المعدّلة (${previewResult.updatedCount})`,
                  labelEn: `Modified (${previewResult.updatedCount})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`pos-bulk-adjust-filter-${tab.id.toLowerCase()}`}
                  onClick={() => setFilterMode(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    filterMode === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-slate-600 shrink-0">
              {language === 'ar' ? 'سبب التسوية:' : 'Reason:'}
            </label>
            <select
              data-testid="pos-bulk-adjust-reason-select"
              value={reasonAr}
              onChange={(e) => setReasonAr(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 outline-hidden"
            >
              <option value="مطابقة الجرد الفعلي السريع أثناء البيع في نقطة البيع (POS Discrepancy Check)">
                مطابقة الجرد الفعلي السريع أثناء البيع (POS Discrepancy)
              </option>
              <option value="إضافة وحدات معروضة على الرف لم تكن مدرجة بالرصيد">
                إضافة وحدات معروضة على الرف لم تكن مدرجة بالرصيد
              </option>
              <option value="استبعاد وحدات تالفة أو غير صالحة للبيع">
                استبعاد وحدات تالفة أو غير صالحة للبيع
              </option>
              <option value="تصحيح خطأ إدخال سابق في رصيد الصنف">
                تصحيح خطأ إدخال سابق في رصيد الصنف
              </option>
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 text-[11px] font-black border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">الصنف والرمز (SKU)</th>
                <th className="py-2.5 px-2 text-center">الرصيد بالنظام</th>
                <th className="py-2.5 px-2 text-center">حد الأمان</th>
                <th className="py-2.5 px-3 text-center">العدد الفعلي الجديد (Physical Count)</th>
                <th className="py-2.5 px-2.5 text-center">الفارق (Variance)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const systemQty = Number(product.stockQty) || 0;
                const currentDraftQty =
                  physicalQtyMap[product.id] !== undefined
                    ? Number(physicalQtyMap[product.id])
                    : systemQty;
                const variance = Math.round((currentDraftQty - systemQty) * 1000) / 1000;
                const inCart = cartQtyByProductId[product.id] || 0;
                const isModified = variance !== 0;

                return (
                  <tr
                    key={product.id}
                    data-testid={`pos-bulk-adjust-row-${product.sku}`}
                    className={`transition ${
                      isModified
                        ? 'bg-blue-50/60 hover:bg-blue-50'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">
                        {language === 'ar' ? product.nameAr : product.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-slate-600" dir="ltr">
                          {product.sku}
                        </span>
                        {inCart > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono font-bold">
                            بالسلة حالياً: {inCart}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <span
                        data-testid={`pos-bulk-adjust-system-qty-${product.sku}`}
                        className="font-mono font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100"
                        dir="ltr"
                      >
                        {systemQty}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono text-slate-500" dir="ltr">
                      {product.reorderPoint}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1.5" dir="ltr">
                        <button
                          type="button"
                          data-testid={`pos-bulk-adjust-dec-${product.sku}`}
                          onClick={() => handleSetPhysicalQty(product, currentDraftQty - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min={0}
                          data-testid={`pos-bulk-adjust-qty-input-${product.sku}`}
                          value={currentDraftQty}
                          onChange={(e) => handleSetPhysicalQty(product, Number(e.target.value))}
                          className={`w-20 px-2 py-1 rounded-lg border text-center font-mono text-xs font-black outline-hidden ${
                            isModified
                              ? 'bg-white border-blue-600 text-blue-900 ring-2 ring-blue-500/15'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />

                        <button
                          type="button"
                          data-testid={`pos-bulk-adjust-inc-${product.sku}`}
                          onClick={() => handleSetPhysicalQty(product, currentDraftQty + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          data-testid={`pos-bulk-adjust-plus5-${product.sku}`}
                          onClick={() => handleSetPhysicalQty(product, currentDraftQty + 5)}
                          className="px-2 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono text-[10px] font-bold cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-center">
                      <span
                        data-testid={`pos-bulk-adjust-variance-${product.sku}`}
                        className={`inline-block px-2 py-0.5 rounded-full font-mono text-[11px] font-black ${
                          variance > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : variance < 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                        dir="ltr"
                      >
                        {variance > 0 ? `+${variance}` : variance}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary & Commit Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              data-testid="pos-bulk-adjust-modified-count"
              className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black"
            >
              الأصناف المعدلة: {previewResult.updatedCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-200">
              فائض (+): +{previewResult.totalPositiveVariance}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-mono font-bold border border-rose-200">
              عجز (-): -{previewResult.totalNegativeVariance}
            </span>
            {previewResult.updatedCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تعيين</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              data-testid="pos-bulk-adjust-submit-btn"
              disabled={previewResult.updatedCount === 0}
              onClick={handleCommit}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                previewResult.updatedCount === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? `اعتماد وتحديث المخزون (${previewResult.updatedCount} صنف)`
                  : `Apply Bulk Adjustment (${previewResult.updatedCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
