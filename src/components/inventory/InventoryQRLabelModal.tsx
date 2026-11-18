import React, { useEffect, useMemo, useState } from 'react';
import {
  QrCode,
  Printer,
  Search,
  Check,
  Copy,
  X,
  Plus,
  Minus,
  Layers,
  Tag,
} from 'lucide-react';
import { Product } from '../../types/erp';
import {
  buildInventoryItemQrPayload,
  generateLinearBarcodeBars,
  generateQRMatrix,
} from '../../core/barcodeEngine';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

export type QrLabelSizePreset = 'THERMAL_50X30' | 'COMPACT_38X25' | 'A4_GRID';

export interface InventoryQRLabelModalProps {
  isOpen: boolean;
  products: Product[];
  initialSelectedProductId?: string | null;
  currency: string;
  companyName?: string;
  onClose: () => void;
}

export const InventoryQRLabelModal: React.FC<InventoryQRLabelModalProps> = ({
  isOpen,
  products,
  initialSelectedProductId,
  currency,
  companyName = 'حاسب ERP',
  onClose,
}) => {
  const modalLayer = useModalLayer(isOpen, 65);
  const [searchQuery, setSearchQuery] = useState('');
  const [labelPreset, setLabelPreset] = useState<QrLabelSizePreset>('THERMAL_50X30');
  const [showSku, setShowSku] = useState(true);
  const [showBarcodeId, setShowBarcodeId] = useState(true);
  const [showLinearBarcode, setShowLinearBarcode] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBinLocation, setShowBinLocation] = useState(true);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  const [quantitiesById, setQuantitiesById] = useState<Record<string, number>>(() => {
    if (initialSelectedProductId) {
      return { [initialSelectedProductId]: 1 };
    }
    return products[0]?.id ? { [products[0].id]: 1 } : {};
  });

  useEffect(() => {
    if (!isOpen) return;
    if (initialSelectedProductId) {
      setQuantitiesById({ [initialSelectedProductId]: 1 });
    } else if (products[0]?.id) {
      setQuantitiesById((prev) =>
        Object.keys(prev).length > 0 ? prev : { [products[0].id]: 1 }
      );
    }
  }, [isOpen, initialSelectedProductId, products]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalLayer.isTopLayer) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, modalLayer.isTopLayer, onClose]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const selectedEntries = useMemo(() => {
    const entries: Array<{ product: Product; copies: number; payload: string; matrix: boolean[][] }> = [];
    for (const p of products) {
      const copies = Math.max(0, Math.min(200, Number(quantitiesById[p.id]) || 0));
      if (copies <= 0) continue;
      const payload = buildInventoryItemQrPayload({
        productId: p.id,
        sku: p.sku,
        barcode: p.barcode,
        nameAr: p.nameAr,
        salePrice: p.salePrice,
        binLocation: p.binLocation || 'ZA-01',
      });
      entries.push({
        product: p,
        copies,
        payload,
        matrix: generateQRMatrix(payload, 25),
      });
    }
    return entries;
  }, [products, quantitiesById]);

  const totalLabelsCount = useMemo(
    () => selectedEntries.reduce((sum, e) => sum + e.copies, 0),
    [selectedEntries]
  );

  const expandedLabelCards = useMemo(() => {
    const cards: Array<{
      key: string;
      product: Product;
      payload: string;
      matrix: boolean[][];
      copyIdx: number;
    }> = [];
    for (const entry of selectedEntries) {
      for (let i = 0; i < entry.copies; i++) {
        cards.push({
          key: `${entry.product.id}-copy-${i}`,
          product: entry.product,
          payload: entry.payload,
          matrix: entry.matrix,
          copyIdx: i + 1,
        });
      }
    }
    return cards;
  }, [selectedEntries]);

  const setProductCopies = (productId: string, nextQty: number) => {
    const clean = Math.max(0, Math.min(200, Math.round(nextQty || 0)));
    setQuantitiesById((prev) => {
      const copy = { ...prev };
      if (clean <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = clean;
      }
      return copy;
    });
  };

  const handleSelectAllFiltered = () => {
    const next: Record<string, number> = { ...quantitiesById };
    for (const p of filteredCatalog) {
      if (!next[p.id]) next[p.id] = 1;
    }
    setQuantitiesById(next);
  };

  const handleClearSelection = () => {
    setQuantitiesById({});
  };

  const handleCopyPayload = (productId: string, payload: string) => {
    navigator.clipboard?.writeText(payload);
    setCopiedPayloadId(productId);
    setTimeout(() => setCopiedPayloadId(null), 1800);
  };

  const handlePrintLabels = () => {
    if (expandedLabelCards.length === 0) return;
    document.body.dataset.printingQrLabels = 'true';
    const cleanup = () => {
      delete document.body.dataset.printingQrLabels;
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1200);
    }, 60);
  };

  if (!isOpen) return null;

  const primaryEntry = selectedEntries[0];

  return renderModalPortal(
    <div
      style={{ zIndex: modalLayer.zIndex }}
      data-modal-top={modalLayer.isTopLayer ? 'true' : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div
        data-testid="inventory-qr-label-modal"
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl haseb-btn-primary text-white flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                مولّد رموز QR وطباعة ملصقات الجرد المخزني (Barcode ID + SKU)
              </h2>
              <p className="text-[11px] text-slate-500">
                تشفير الباركود ورمز الصنف SKU وموقع الرف داخل QR ثنائي الأبعاد جاهز للطباعة الحرارية و A4
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-qr-label-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Right / Catalog Selector */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-e border-slate-200 dark:border-slate-800 flex flex-col min-h-0 max-h-[38vh] lg:max-h-none">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
                <input
                  type="text"
                  data-testid="qr-modal-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الصنف، SKU، أو رقم الباركود..."
                  className="w-full ps-8 pe-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-600"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-slate-600">
                  الأصناف المحددة: <span className="font-mono text-blue-700">{selectedEntries.length}</span> ({totalLabelsCount} ملصق)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="qr-select-all-btn"
                    onClick={handleSelectAllFiltered}
                    className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold cursor-pointer hover:bg-blue-100"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    data-testid="qr-clear-all-btn"
                    onClick={handleClearSelection}
                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer hover:bg-slate-200"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCatalog.map((p) => {
                const qty = quantitiesById[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    data-testid={`qr-catalog-item-${p.sku}`}
                    className={`p-2.5 flex items-center justify-between gap-2 transition ${
                      qty > 0 ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {p.nameAr}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5" dir="ltr">
                        <span className="text-blue-700 font-bold">SKU: {p.sku}</span>
                        <span>|</span>
                        <span>BAR: {p.barcode}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        data-testid={`qr-qty-dec-${p.sku}`}
                        onClick={() => setProductCopies(p.id, qty - 1)}
                        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        data-testid={`qr-qty-input-${p.sku}`}
                        value={qty}
                        onChange={(e) => setProductCopies(p.id, Number(e.target.value) || 0)}
                        className="w-11 text-center py-0.5 rounded-md border border-slate-200 bg-white font-mono text-xs font-bold"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        data-testid={`qr-qty-inc-${p.sku}`}
                        onClick={() => setProductCopies(p.id, qty + 1)}
                        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-blue-50 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      {[5, 10].map((presetQty) => (
                        <button
                          key={presetQty}
                          type="button"
                          onClick={() => setProductCopies(p.id, presetQty)}
                          className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold cursor-pointer"
                          title={`تعيين ${presetQty} ملصقات`}
                        >
                          ×{presetQty}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left / Settings + Printable QR Sheet Preview */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-50/60 dark:bg-slate-950/40">
            {/* Settings Bar */}
            <div className="shrink-0 p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-600 flex items-center gap-1 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>مقاس الملصق:</span>
                  </span>
                  {[
                    { id: 'THERMAL_50X30', label: 'حراري 50×30mm' },
                    { id: 'COMPACT_38X25', label: 'مدمج 38×25mm' },
                    { id: 'A4_GRID', label: 'شبكة A4' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`qr-preset-${opt.id}`}
                      onClick={() => setLabelPreset(opt.id as QrLabelSizePreset)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                        labelPreset === opt.id
                          ? 'haseb-nav-active text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {primaryEntry && (
                  <button
                    type="button"
                    data-testid="qr-copy-payload-btn"
                    onClick={() => handleCopyPayload(primaryEntry.product.id, primaryEntry.payload)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPayloadId === primaryEntry.product.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>تم نسخ محتوى QR</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>نسخ بيانات QR</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Field Toggles */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>بيانات الملصق:</span>
                </span>
                {[
                  { checked: showSku, set: setShowSku, label: 'رمز الصنف (SKU)' },
                  { checked: showBarcodeId, set: setShowBarcodeId, label: 'معرف الباركود (Barcode ID)' },
                  { checked: showLinearBarcode, set: setShowLinearBarcode, label: 'شريط Code-128' },
                  { checked: showPrice, set: setShowPrice, label: 'سعر البيع' },
                  { checked: showBinLocation, set: setShowBinLocation, label: 'موقع الرف (Bin)' },
                ].map((tog) => (
                  <label key={tog.label} className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={tog.checked}
                      onChange={(e) => tog.set(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>{tog.label}</span>
                  </label>
                ))}
              </div>

              {primaryEntry && (
                <div
                  data-testid="qr-encoded-payload-preview"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700 truncate"
                  dir="ltr"
                  title={primaryEntry.payload}
                >
                  QR Payload: {primaryEntry.payload}
                </div>
              )}
            </div>

            {/* Print Preview Sheet */}
            <div className="flex-1 overflow-y-auto p-4">
              {expandedLabelCards.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <QrCode className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">
                    لم يتم تحديد أي ملصقات للطباعة بعد
                  </p>
                  <p className="text-[11px]">
                    اختر عدد الملصقات من القائمة الجانبية لعرض معاينة QR وطباعتها فوراً.
                  </p>
                </div>
              ) : (
                <div
                  data-testid="qr-label-print-sheet"
                  className={`grid gap-3 ${
                    labelPreset === 'A4_GRID'
                      ? 'grid-cols-2 sm:grid-cols-3'
                      : labelPreset === 'COMPACT_38X25'
                      ? 'grid-cols-2 sm:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2'
                  }`}
                >
                  {expandedLabelCards.map(({ key, product, matrix, payload }) => {
                    const dim = matrix.length;
                    const bars = showLinearBarcode ? generateLinearBarcodeBars(product.barcode) : [];
                    const maxX = bars.length > 0 ? bars[bars.length - 1].x + bars[bars.length - 1].width + 10 : 120;
                    const qrSize = labelPreset === 'COMPACT_38X25' ? 68 : 82;

                    return (
                      <div
                        key={key}
                        data-testid={`qr-label-card-${product.sku}`}
                        data-qr-payload={payload}
                        className="bg-white border border-slate-300 rounded-xl p-2.5 shadow-2xs flex flex-col justify-between gap-1.5 break-inside-avoid"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-[9px] font-bold text-slate-400 truncate">
                              {companyName}
                            </div>
                            <div className="text-[11px] font-black text-slate-900 leading-tight line-clamp-2">
                              {product.nameAr}
                            </div>
                            {showSku && (
                              <div className="text-[10px] font-mono font-bold text-blue-800" dir="ltr">
                                SKU: {product.sku}
                              </div>
                            )}
                            {showBarcodeId && (
                              <div className="text-[10px] font-mono font-bold text-slate-700" dir="ltr">
                                BAR: {product.barcode}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {showPrice && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-black" dir="ltr">
                                  {product.salePrice.toLocaleString()} {currency}
                                </span>
                              )}
                              {showBinLocation && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[9px] font-bold" dir="ltr">
                                  BIN: {product.binLocation || 'ZA-01'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 2D QR SVG */}
                          <div className="shrink-0 p-1 bg-white border border-slate-200 rounded-lg">
                            <svg
                              data-testid={`qr-svg-${product.sku}`}
                              width={qrSize}
                              height={qrSize}
                              viewBox={`0 0 ${dim} ${dim}`}
                              shapeRendering="crispEdges"
                            >
                              <rect width={dim} height={dim} fill="#ffffff" />
                              {matrix.map((row, rIdx) =>
                                row.map((cell, cIdx) =>
                                  cell ? (
                                    <rect
                                      key={`${rIdx}-${cIdx}`}
                                      x={cIdx}
                                      y={rIdx}
                                      width={1}
                                      height={1}
                                      fill="#0f172a"
                                    />
                                  ) : null
                                )
                              )}
                            </svg>
                          </div>
                        </div>

                        {showLinearBarcode && bars.length > 0 && (
                          <div className="pt-1 border-t border-dashed border-slate-200">
                            <svg
                              viewBox={`0 0 ${maxX} 24`}
                              className="w-full h-5"
                              preserveAspectRatio="none"
                            >
                              {bars.map((b, bIdx) => (
                                <rect
                                  key={bIdx}
                                  x={b.x}
                                  y={0}
                                  width={b.width}
                                  height={24}
                                  fill="#0f172a"
                                />
                              ))}
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            يُشفّر كل رمز QR كلاً من <strong className="text-slate-800">Barcode ID</strong> و{' '}
            <strong className="text-slate-800">SKU</strong> لمسح المخزون والجرد بالكاميرا أو القارئ الفوري.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              data-testid="print-qr-labels-btn"
              disabled={expandedLabelCards.length === 0}
              onClick={handlePrintLabels}
              className="px-5 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الملصقات ({totalLabelsCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryQRLabelModal;
