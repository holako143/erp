import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  AlertTriangle,
  ShieldAlert,
  Plus,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Package,
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';
import { Product } from '../../types/erp';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import {
  evaluatePosItemSafetyThresholdWarning,
  validateStrictPosStockBeforeAdd,
  evaluatePosItemDemandForecast,
  StrictStockValidationResult,
} from '../../core/posStrictStockValidationService';

export interface POSItemSearchDropdownProps {
  products: Product[];
  cartQtyByProductId: Record<string, number>;
  currency: string;
  language: 'ar' | 'en';
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  onStrictValidatedAdd: (
    product: Product,
    requestedQty: number,
    validation: StrictStockValidationResult
  ) => void;
  onTriggerShortageToast: (validation: StrictStockValidationResult, product: Product) => void;
}

export const POSItemSearchDropdown: React.FC<POSItemSearchDropdownProps> = ({
  products,
  cartQtyByProductId,
  currency,
  language,
  searchTerm,
  onSearchTermChange,
  onStrictValidatedAdd,
  onTriggerShortageToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [requestedQtyBySku, setRequestedQtyBySku] = useState<Record<string, number>>({});
  const [lastShortageAlert, setLastShortageAlert] = useState<{
    sku: string;
    productName: string;
    validation: StrictStockValidationResult;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const enrichedDropdownItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.nameAr.includes(searchTerm.trim()) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(searchTerm.trim())
      );
    });

    return filtered
      .map((product) => {
        const inCartQty = cartQtyByProductId[product.id] || 0;
        const requestedQty = requestedQtyBySku[product.sku] ?? 1;
        const safetyMeta = evaluatePosItemSafetyThresholdWarning(product, inCartQty);
        const strictValidation = validateStrictPosStockBeforeAdd({
          product,
          inCartBaseQty: inCartQty,
          requestedAddQty: requestedQty,
          conversionFactor: 1,
          unitNameAr: product.uom || 'وحدة',
        });
        const demandForecast = evaluatePosItemDemandForecast({
          product,
          allProducts: products,
          inCartBaseQty: inCartQty,
        });
        return {
          product,
          inCartQty,
          requestedQty,
          safetyMeta,
          strictValidation,
          demandForecast,
        };
      })
      .sort((a, b) => {
        // Prioritize items with safety warnings or AI depletion risk so cashiers see alerts immediately
        if (a.safetyMeta.showAmberWarningIcon !== b.safetyMeta.showAmberWarningIcon) {
          return a.safetyMeta.showAmberWarningIcon ? -1 : 1;
        }
        if (a.demandForecast.isLikelyToRunOut !== b.demandForecast.isLikelyToRunOut) {
          return a.demandForecast.isLikelyToRunOut ? -1 : 1;
        }
        return a.safetyMeta.remainingAvailableStock - b.safetyMeta.remainingAvailableStock;
      })
      .slice(0, 12);
  }, [products, cartQtyByProductId, searchTerm, requestedQtyBySku]);

  const safetyWarningItemsCount = useMemo(
    () =>
      products.filter((p) => {
        const inCart = cartQtyByProductId[p.id] || 0;
        return evaluatePosItemSafetyThresholdWarning(p, inCart).showAmberWarningIcon;
      }).length,
    [products, cartQtyByProductId]
  );

  const likelyToRunOutCount = useMemo(
    () =>
      products.filter((p) => {
        const inCart = cartQtyByProductId[p.id] || 0;
        return evaluatePosItemDemandForecast({
          product: p,
          allProducts: products,
          inCartBaseQty: inCart,
        }).isLikelyToRunOut;
      }).length,
    [products, cartQtyByProductId]
  );

  const handleQtyChange = (product: Product, rawQty: number) => {
    const cleanQty = Math.max(1, Math.round(Number(rawQty) || 1));
    setRequestedQtyBySku((prev) => ({
      ...prev,
      [product.sku]: cleanQty,
    }));

    const inCartQty = cartQtyByProductId[product.id] || 0;
    const validation = validateStrictPosStockBeforeAdd({
      product,
      inCartBaseQty: inCartQty,
      requestedAddQty: cleanQty,
      conversionFactor: 1,
      unitNameAr: product.uom || 'وحدة',
    });

    if (!validation.allowed) {
      setLastShortageAlert({
        sku: product.sku,
        productName: language === 'ar' ? product.nameAr : product.name,
        validation,
      });
      onTriggerShortageToast(validation, product);
    } else if (lastShortageAlert?.sku === product.sku) {
      setLastShortageAlert(null);
    }
  };

  const handleItemAddClick = (
    product: Product,
    requestedQty: number,
    validation: StrictStockValidationResult
  ) => {
    if (!validation.allowed) {
      setLastShortageAlert({
        sku: product.sku,
        productName: language === 'ar' ? product.nameAr : product.name,
        validation,
      });
      onTriggerShortageToast(validation, product);
      return;
    }
    onStrictValidatedAdd(product, requestedQty, validation);
    const nextInCart = (cartQtyByProductId[product.id] || 0) + requestedQty;
    const postCheck = validateStrictPosStockBeforeAdd({
      product,
      inCartBaseQty: nextInCart,
      requestedAddQty: requestedQty,
      conversionFactor: 1,
      unitNameAr: product.uom || 'وحدة',
    });
    if (!postCheck.allowed) {
      setLastShortageAlert({
        sku: product.sku,
        productName: language === 'ar' ? product.nameAr : product.name,
        validation: postCheck,
      });
    }
  };

  const handleAddAlternativeItem = (alternativeId: string) => {
    const altProduct = products.find((p) => p.id === alternativeId);
    if (!altProduct) return;
    const altInCart = cartQtyByProductId[altProduct.id] || 0;
    const altValidation = validateStrictPosStockBeforeAdd({
      product: altProduct,
      inCartBaseQty: altInCart,
      requestedAddQty: 1,
      conversionFactor: 1,
      unitNameAr: altProduct.uom || 'وحدة',
    });
    handleItemAddClick(altProduct, 1, altValidation);
  };

  return (
    <div
      ref={containerRef}
      data-testid="pos-item-search-dropdown-container"
      className="relative flex-1 min-w-[180px] max-w-md"
    >
      <div className="flex items-center gap-1 bg-white border border-slate-200/90 hover:border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/15 rounded-xl px-2.5 py-1 sm:py-1.5 shadow-2xs transition-all">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          data-testid="pos-dropdown-search-input"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onSearchTermChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={
            language === 'ar'
              ? 'بحث سريع بالأصناف مع توقع النفاد وفحص المخزون...'
              : 'Search POS items with AI Demand Forecast & stock check...'
          }
          className="w-full text-[11px] sm:text-xs bg-transparent border-none outline-hidden text-slate-800 placeholder:text-slate-400"
        />
        {safetyWarningItemsCount > 0 && (
          <button
            type="button"
            data-testid="pos-search-safety-summary-badge"
            onClick={() => setIsOpen((prev) => !prev)}
            title={
              language === 'ar'
                ? `${safetyWarningItemsCount} أصناف تقترب من أو وصلت لحد الأمان للمخزون`
                : `${safetyWarningItemsCount} items nearing/at safety stock threshold`
            }
            className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer hover:bg-amber-200 transition"
          >
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="font-mono">{safetyWarningItemsCount}</span>
          </button>
        )}
        <button
          type="button"
          data-testid="pos-search-dropdown-toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="قائمة البحث السريع للأصناف وفحص المخزون"
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer shrink-0"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          data-testid="pos-item-search-dropdown"
          className="absolute top-full mt-1.5 inset-x-0 sm:w-[495px] z-40 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          <div className="px-3.5 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {language === 'ar'
                  ? 'البحث الفوري + التنبؤ الذكي بالنفاد (AI Demand Forecast)'
                  : 'POS Search & AI Demand Forecasting'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-300 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>
                  {language === 'ar'
                    ? `توقع نفاد: ${likelyToRunOutCount}`
                    : `Likely to Run Out: ${likelyToRunOutCount}`}
                </span>
              </span>
              <span className="text-[10px] text-amber-300 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>
                  {language === 'ar'
                    ? `حد الأمان: ${safetyWarningItemsCount}`
                    : `Safety: ${safetyWarningItemsCount}`}
                </span>
              </span>
            </div>
          </div>

          {/* High-Visibility Inline Shortage Warning Banner inside Dropdown */}
          {lastShortageAlert && (
            <div
              data-testid="pos-dropdown-shortage-warning-banner"
              className="px-3.5 py-2.5 bg-rose-600 text-white text-xs font-bold flex items-start justify-between gap-2 border-b border-rose-700"
            >
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-black">
                    {language === 'ar'
                      ? lastShortageAlert.validation.toastTitleAr
                      : lastShortageAlert.validation.toastTitleEn}
                  </div>
                  <div className="text-[10.5px] font-normal text-rose-100 mt-0.5">
                    {language === 'ar'
                      ? lastShortageAlert.validation.toastMessageAr
                      : lastShortageAlert.validation.toastMessageEn}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLastShortageAlert(null)}
                className="text-rose-200 hover:text-white font-bold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="max-h-88 overflow-y-auto divide-y divide-slate-100">
            {enrichedDropdownItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {language === 'ar'
                  ? 'لا توجد أصناف مطابقة لعبارة البحث'
                  : 'No matching inventory items found'}
              </div>
            ) : (
              enrichedDropdownItems.map(
                ({
                  product,
                  inCartQty,
                  requestedQty,
                  safetyMeta,
                  strictValidation,
                  demandForecast,
                }) => {
                  const isDisabled = strictValidation.isAddActionDisabled;
                  const topAlternative = demandForecast.suggestedAlternatives[0];

                  return (
                    <div
                      key={product.id}
                      data-testid={`pos-search-dropdown-item-${product.sku}`}
                      className={`px-3.5 py-2.5 space-y-1.5 transition ${
                        safetyMeta.showAmberWarningIcon
                          ? 'bg-amber-50/45 hover:bg-amber-50/80'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Amber Exclamation Warning Indicator when nearing/at safety threshold */}
                            {safetyMeta.showAmberWarningIcon && (
                              <span
                                data-testid={`pos-search-item-safety-warning-${product.sku}`}
                                title={
                                  language === 'ar' ? safetyMeta.tooltipAr : safetyMeta.tooltipEn
                                }
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-black border shrink-0 ${
                                  safetyMeta.warningLevel === 'OUT_OF_STOCK'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                              >
                                <AlertTriangle
                                  className={`w-3 h-3 shrink-0 ${
                                    safetyMeta.warningLevel === 'OUT_OF_STOCK'
                                      ? 'text-rose-600'
                                      : 'text-amber-600'
                                  }`}
                                />
                                <span>
                                  {language === 'ar'
                                    ? safetyMeta.badgeLabelAr
                                    : safetyMeta.badgeLabelEn}
                                </span>
                              </span>
                            )}

                            {/* AI Demand Forecasting 'Likely to Run Out' Badge */}
                            {demandForecast.isLikelyToRunOut && (
                              <span
                                data-testid={`pos-search-likely-to-run-out-badge-${product.sku}`}
                                title={
                                  language === 'ar'
                                    ? demandForecast.advisoryMessageAr
                                    : demandForecast.advisoryMessageEn
                                }
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-black border shrink-0 ${
                                  demandForecast.depletionRiskLevel === 'CRITICAL_DEPLETION'
                                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                }`}
                              >
                                <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                                <span>
                                  {language === 'ar'
                                    ? demandForecast.badgeLabelAr
                                    : demandForecast.badgeLabelEn}
                                </span>
                              </span>
                            )}

                            <span className="text-xs font-bold text-slate-900 truncate">
                              {language === 'ar' ? product.nameAr : product.name}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1">
                            <span className="font-mono font-semibold text-slate-600" dir="ltr">
                              {product.sku}
                            </span>
                            <span>•</span>
                            <span className="font-mono font-bold text-slate-800" dir="ltr">
                              {formatCleanNumber(product.salePrice)} {currency}
                            </span>
                            <span>•</span>
                            <span>
                              {language === 'ar' ? 'المتبقي المتاح:' : 'Available:'}{' '}
                              <strong
                                data-testid={`pos-search-item-avail-${product.sku}`}
                                className={`font-mono ${
                                  safetyMeta.remainingAvailableStock <= 0
                                    ? 'text-rose-600'
                                    : safetyMeta.showAmberWarningIcon
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {safetyMeta.remainingAvailableStock}
                              </strong>{' '}
                              / {safetyMeta.stockQty}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">
                              {language === 'ar' ? 'حد الأمان:' : 'Safety:'}{' '}
                              <strong className="font-mono">{safetyMeta.safetyThreshold}</strong>
                            </span>
                            {inCartQty > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-mono font-bold">
                                بالسلة: ×{inCartQty}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Real-Time Quantity Request Input + Strict Stock Validated Add Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min={1}
                            data-testid={`pos-search-dropdown-qty-${product.sku}`}
                            value={requestedQty}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleQtyChange(product, Number(e.target.value))}
                            title={
                              language === 'ar'
                                ? 'الكمية المطلوب إضافتها للسلة (يتم فحصها لحظياً مقابل المخزون)'
                                : 'Requested quantity to add (validated in real-time against stock)'
                            }
                            className={`w-13 px-1.5 py-1 rounded-lg border text-center font-mono text-xs font-bold outline-hidden ${
                              isDisabled
                                ? 'bg-rose-50 border-rose-300 text-rose-700'
                                : 'bg-white border-slate-200 text-slate-800 focus:border-blue-600'
                            }`}
                            dir="ltr"
                          />

                          <button
                            type="button"
                            data-testid={`pos-search-dropdown-add-btn-${product.sku}`}
                            disabled={isDisabled}
                            aria-disabled={isDisabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemAddClick(product, requestedQty, strictValidation);
                            }}
                            title={
                              isDisabled
                                ? language === 'ar'
                                  ? strictValidation.toastMessageAr
                                  : strictValidation.toastMessageEn
                                : language === 'ar'
                                ? 'إضافة الصنف إلى السلة'
                                : 'Add item to cart'
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition ${
                              isDisabled
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-70'
                                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs'
                            }`}
                          >
                            {isDisabled ? (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{language === 'ar' ? 'مغلق (عجز)' : 'Disabled'}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span>{language === 'ar' ? 'إضافة' : 'Add'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* AI Demand Forecast Alternative Item Advisory Bar for Cashier */}
                      {demandForecast.isLikelyToRunOut && topAlternative && (
                        <div
                          data-testid={`pos-search-alternative-suggestion-${product.sku}`}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50/90 border border-purple-200/80 flex items-center justify-between gap-2 text-[10px]"
                        >
                          <div className="flex items-center gap-1.5 text-purple-900 min-w-0">
                            <ArrowLeftRight className="w-3 h-3 text-purple-600 shrink-0" />
                            <span className="truncate">
                              <strong>
                                {language === 'ar' ? 'بديل مقترح للعميل:' : 'Suggested Alternative:'}
                              </strong>{' '}
                              {language === 'ar' ? topAlternative.nameAr : topAlternative.name}{' '}
                              <span className="font-mono text-purple-700" dir="ltr">
                                (متوفر: {topAlternative.stockQty} •{' '}
                                {formatCleanNumber(topAlternative.salePrice)} {currency})
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            data-testid={`pos-search-add-alternative-btn-${product.sku}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddAlternativeItem(topAlternative.id);
                            }}
                            className="px-2 py-0.5 rounded-md bg-purple-700 hover:bg-purple-800 text-white font-bold shrink-0 cursor-pointer transition"
                          >
                            {language === 'ar' ? '+ إضافة البديل' : '+ Add Alt'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              )
            )}
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>
                {language === 'ar'
                  ? 'التنبؤ الذكي بالطلب + التحقق الصارم من المخزون: يقترح البدائل ويمنع البيع الزائد'
                  : 'AI Demand Forecast & Strict Stock Validation active'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق القائمة' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

