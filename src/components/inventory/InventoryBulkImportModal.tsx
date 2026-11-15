import React, { useState, useMemo } from 'react';
import { Upload, Download } from 'lucide-react';
import { parseBulkProductsCSV } from '../../core/inventoryEngine';

export const SAMPLE_BULK_CSV = `SKU,Barcode,NameAr,NameEn,CostPrice,SalePrice,StockQty,UOM,ReorderPoint,Sector
SOL-600W-TOPCON,6281042009103,لوح طاقة شمسية N-Type بايفيشال 600W,N-Type Bifacial Solar Panel 600W,390,510,80,PCS,15,electronics
INV-DEYE-12KW,6281042009110,إنفرتر هجين ذكي Deye 12kW 3-Phase MPPT,Deye 12kW 3-Phase Hybrid Inverter,4200,5350,12,PCS,3,electronics
BAT-LFP-51V-300,6281042009127,بطارية ليثيوم جدارية LiFePO4 51.2V 300Ah 15kWh,LiFePO4 Rack Battery 51.2V 300Ah 15kWh,4850,6200,15,PCS,4,electronics
SCR-OLED-77-4K,6281042009134,شاشة ذكية 77 بوصة 4K OLED 120Hz WebOS,Smart 77-inch 4K OLED 120Hz TV,3100,4150,10,PCS,3,electronics`;

export interface InventoryBulkImportModalProps {
  tenantId: string;
  warehouseId: string;
  defaultCategoryId: string;
  currency: string;
  onConfirmImport: (csvText: string, postOpeningJournal: boolean) => void;
  onClose: () => void;
}

const InventoryBulkImportModal: React.FC<InventoryBulkImportModalProps> = React.memo(
  ({
    tenantId,
    warehouseId,
    defaultCategoryId,
    currency,
    onConfirmImport,
    onClose,
  }) => {
    const [bulkCsvText, setBulkCsvText] = useState<string>(SAMPLE_BULK_CSV);
    const [postOpeningJournal, setPostOpeningJournal] = useState<boolean>(true);

    const liveBulkPreview = useMemo(
      () =>
        parseBulkProductsCSV(
          bulkCsvText,
          tenantId,
          warehouseId,
          defaultCategoryId,
          'electronics'
        ),
      [bulkCsvText, tenantId, warehouseId, defaultCategoryId]
    );

    const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result;
        if (typeof content === 'string') {
          setBulkCsvText(content);
        }
      };
      reader.readAsText(file);
    };

    return (
      <div
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-black text-base text-slate-900">
                  معالج الاستيراد الجماعي للأصناف والأرصدة الافتتاحية (Excel / CSV Wizard)
                </h3>
                <p className="text-[11px] text-slate-500">
                  الصق البيانات مباشرة من ملف Excel أو ارفع ملف CSV لتسجيل الأصناف وتوليد الباركود وقيد الرصيد الافتتاحي آلياً
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Template & File Upload Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkCsvText(SAMPLE_BULK_CSV)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل نموذج قياسي جاهز (4 أصناف متنوعة)</span>
              </button>
              <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>رفع ملف .CSV أو .TXT</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              الأعمدة: SKU, Barcode, NameAr, NameEn, CostPrice, SalePrice, StockQty, UOM, ReorderPoint, Sector
            </div>
          </div>

          {/* Raw CSV Textarea */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              بيانات الجدول (يدعم الفاصلة `,` أو اللصق المباشر من خلايا Excel `Tab`):
            </label>
            <textarea
              data-testid="bulk-csv-textarea"
              rows={5}
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 text-slate-900 font-mono text-[11px] border border-slate-200/80 focus:bg-white focus:border-slate-900 outline-hidden"
            />
          </div>

          {/* Live Parsed Preview Table */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800">
                معاينة الأصناف الجاهزة للاستيراد ({liveBulkPreview.validProducts.length} صنف صالح):
              </span>
              <div className="flex items-center gap-3 font-mono font-bold">
                <span className="text-slate-600">
                  إجمالي الكميات:{' '}
                  <strong className="text-slate-900">{liveBulkPreview.totalOpeningQty}</strong>
                </span>
                <span className="text-blue-700">
                  إجمالي تقييم المخزون الافتتاحي:{' '}
                  <strong>
                    {liveBulkPreview.totalOpeningValuation.toLocaleString()} {currency}
                  </strong>
                </span>
              </div>
            </div>

            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-[11px] text-start">
                <thead className="bg-slate-100 text-slate-600 font-bold">
                  <tr>
                    <th className="py-2 px-3 text-start">SKU</th>
                    <th className="py-2 px-3 text-start">الباركود</th>
                    <th className="py-2 px-3 text-start">اسم الصنف</th>
                    <th className="py-2 px-3 text-center">القطاع</th>
                    <th className="py-2 px-3 text-end">التكلفة</th>
                    <th className="py-2 px-3 text-end">سعر البيع</th>
                    <th className="py-2 px-3 text-center">الكمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveBulkPreview.validProducts.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                        {item.sku}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-indigo-700">{item.barcode}</td>
                      <td className="py-1.5 px-3 font-bold text-slate-800">{item.nameAr}</td>
                      <td className="py-1.5 px-3 text-center">{item.industry}</td>
                      <td className="py-1.5 px-3 text-end font-mono">{item.costPrice}</td>
                      <td className="py-1.5 px-3 text-end font-mono font-bold">
                        {item.salePrice}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono font-black text-blue-700">
                        {item.stockQty} {item.uom}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Auto-Journal Checkbox & Submit */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={postOpeningJournal}
                onChange={(e) => setPostOpeningJournal(e.target.checked)}
                className="rounded text-indigo-600 w-4 h-4"
              />
              <span>
                إصدار وترحيل قيد يومية محاسبي تلقائي بالرصيد الافتتاحي للمخزون (
                {liveBulkPreview.totalOpeningValuation.toLocaleString()} {currency})
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                data-testid="confirm-bulk-import-btn"
                disabled={liveBulkPreview.validProducts.length === 0}
                onClick={() => onConfirmImport(bulkCsvText, postOpeningJournal)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-sm transition disabled:opacity-40 cursor-pointer"
              >
                اعتماد واستيراد الأصناف ({liveBulkPreview.validProducts.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InventoryBulkImportModal.displayName = 'InventoryBulkImportModal';
export default InventoryBulkImportModal;
