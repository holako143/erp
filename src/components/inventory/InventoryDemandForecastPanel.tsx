import React, { useState, useMemo, useDeferredValue, useCallback } from 'react';
import {
  Sparkles,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpRight,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  buildHistoricalDemandAnalysis,
  applySuggestedReorderPoints,
  AiDemandForecastResponse,
  AiReorderSuggestion,
  ForecastUrgency,
  ProductHistoricalDemandStat,
} from '../../core/demandForecastingEngine';

export const InventoryDemandForecastPanel: React.FC = () => {
  const {
    products,
    salesInvoices,
    updateProduct,
    batchUpdateProducts,
    hasPermission,
    language,
  } = useERP();

  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [safetyBufferDays, setSafetyBufferDays] = useState<number>(5);
  const [scopeFilter, setScopeFilter] = useState<'LOW_STOCK' | 'ALL'>('LOW_STOCK');

  const [isForecasting, setIsForecasting] = useState<boolean>(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [aiForecast, setAiForecast] = useState<AiDemandForecastResponse | null>(null);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const deferredProducts = useDeferredValue(products);
  const deferredInvoices = useDeferredValue(salesInvoices);

  const canModifyInventory = hasPermission('canEdit') || hasPermission('canCreate');

  const analysis = useMemo(
    () =>
      buildHistoricalDemandAnalysis({
        products: deferredProducts.filter((p) => !p.industry || p.industry === 'electronics'),
        salesInvoices: deferredInvoices,
        lookbackDays,
        leadTimeDays,
        safetyBufferDays,
      }),
    [deferredProducts, deferredInvoices, lookbackDays, leadTimeDays, safetyBufferDays]
  );

  const displayedItems = useMemo(() => {
    if (scopeFilter === 'LOW_STOCK') {
      const lowItems = analysis.items.filter((item) => item.isLowStock);
      return lowItems.length > 0 ? lowItems : analysis.items.slice(0, 12);
    }
    return analysis.items;
  }, [analysis.items, scopeFilter]);

  const suggestionByProductId = useMemo(() => {
    const map = new Map<string, AiReorderSuggestion>();
    if (!aiForecast?.suggestions) return map;
    for (const s of aiForecast.suggestions) {
      if (s.productId) map.set(s.productId, s);
      if (s.sku) map.set(`SKU:${s.sku.toUpperCase()}`, s);
    }
    return map;
  }, [aiForecast]);

  const findSuggestionFor = useCallback(
    (item: ProductHistoricalDemandStat): AiReorderSuggestion | undefined => {
      return (
        suggestionByProductId.get(item.productId) ||
        suggestionByProductId.get(`SKU:${item.sku.toUpperCase()}`)
      );
    },
    [suggestionByProductId]
  );

  const handleRunAiForecast = async () => {
    const targetItems =
      scopeFilter === 'LOW_STOCK'
        ? analysis.items.filter((i) => i.isLowStock || i.windowUnitsSold > 0).slice(0, 35)
        : analysis.items.slice(0, 40);

    const payloadItems = targetItems.length > 0 ? targetItems : analysis.items.slice(0, 20);
    if (payloadItems.length === 0) {
      setForecastError(
        language === 'ar'
          ? 'لا توجد أصناف في المخزون لتشغيل التنبؤ بالذكاء الاصطناعي.'
          : 'No inventory products available to forecast.'
      );
      return;
    }

    setIsForecasting(true);
    setForecastError(null);
    setAppliedBanner(null);

    try {
      const resp = await fetch('/api/v1/ai/inventory-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lookbackDays,
          leadTimeDays,
          safetyBufferDays,
          language,
          items: payloadItems,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        const msg =
          language === 'ar'
            ? data?.errorAr || data?.error || 'فشل الاتصال بخدمة التنبؤ الذكي للمخزون.'
            : data?.error || 'AI demand forecasting request failed.';
        setForecastError(msg);
        return;
      }

      setAiForecast({
        modelUsed: String(data.modelUsed || 'gemini-4-hydrogen'),
        generatedAt: String(data.generatedAt || new Date().toISOString()),
        executiveSummary: String(data.executiveSummary || ''),
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      });
    } catch (err: any) {
      setForecastError(
        language === 'ar'
          ? `تعذر الاتصال بخادم التنبؤ الذكي: ${err?.message || 'خطأ شبكة'}`
          : `Failed to reach AI forecast endpoint: ${err?.message || 'Network error'}`
      );
    } finally {
      setIsForecasting(false);
    }
  };

  const handleApplySingleSuggestion = (
    item: ProductHistoricalDemandStat,
    suggestedRop: number
  ) => {
    const existing = products.find((p) => p.id === item.productId || p.sku === item.sku);
    if (!existing) return;
    const result = applySuggestedReorderPoints([existing], [
      {
        productId: existing.id,
        sku: existing.sku,
        suggestedReorderPoint: suggestedRop,
      },
    ]);
    if (result.updatedCount > 0) {
      updateProduct(result.nextProducts[0]);
      setAppliedBanner(
        language === 'ar'
          ? `تم تحديث نقطة إعادة الطلب للصنف (${existing.nameAr}) من ${existing.reorderPoint} إلى ${result.nextProducts[0].reorderPoint}.`
          : `Updated reorder point for ${existing.name} (${existing.sku}) from ${existing.reorderPoint} to ${result.nextProducts[0].reorderPoint}.`
      );
    } else {
      setAppliedBanner(
        language === 'ar'
          ? `نقطة إعادة الطلب للصنف (${existing.nameAr}) مطابقة بالفعل للقيمة المقترحة (${suggestedRop}).`
          : `Reorder point for ${existing.sku} is already set to ${suggestedRop}.`
      );
    }
  };

  const handleApplyAllAiSuggestions = () => {
    if (!aiForecast?.suggestions?.length) return;
    const result = applySuggestedReorderPoints(products, aiForecast.suggestions);
    if (result.updatedCount === 0) {
      setAppliedBanner(
        language === 'ar'
          ? 'جميع نقاط إعادة الطلب الحالية مطابقة للتوصيات المقترحة ولا تتطلب تعديلاً.'
          : 'All current reorder points already match the AI recommendations.'
      );
      return;
    }
    batchUpdateProducts(result.nextProducts, {
      updatedCount: result.updatedCount,
      skippedCount: Math.max(0, aiForecast.suggestions.length - result.updatedCount),
      totalFieldChanges: result.totalFieldChanges,
    });
    setAppliedBanner(
      language === 'ar'
        ? `تم اعتماد وتحديث نقاط إعادة الطلب المثلى لـ (${result.updatedCount}) صنف دفعة واحدة في سجل المخزون.`
        : `Successfully applied optimal AI reorder points to ${result.updatedCount} inventory items.`
    );
  };

  const formatUrgencyLabel = (urgency: ForecastUrgency | ProductHistoricalDemandStat['riskTier']) => {
    if (urgency === 'OUT_OF_STOCK') {
      return {
        text: language === 'ar' ? 'نفذ من المخزون' : 'Out of Stock',
        dotClass: 'bg-rose-600',
        textClass: 'text-rose-700 dark:text-rose-400',
      };
    }
    if (urgency === 'CRITICAL') {
      return {
        text: language === 'ar' ? 'حرج جداً' : 'Critical',
        dotClass: 'bg-rose-500',
        textClass: 'text-rose-700 dark:text-rose-400',
      };
    }
    if (urgency === 'HIGH' || urgency === 'AT_RISK') {
      return {
        text: language === 'ar' ? 'معرض للنقص' : 'At Risk',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-700 dark:text-amber-400',
      };
    }
    if (urgency === 'MODERATE') {
      return {
        text: language === 'ar' ? 'مراقبة دورية' : 'Moderate',
        dotClass: 'bg-sky-500',
        textClass: 'text-sky-700 dark:text-sky-400',
      };
    }
    return {
      text: language === 'ar' ? 'مستقر' : 'Optimal',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-700 dark:text-emerald-400',
    };
  };

  const changedAiSuggestionsCount = useMemo(() => {
    if (!aiForecast?.suggestions?.length) return 0;
    return applySuggestedReorderPoints(products, aiForecast.suggestions).updatedCount;
  }, [products, aiForecast]);

  return (
    <div data-testid="ai-demand-forecast-panel" className="space-y-4">
      {/* Control Header & Parameters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar'
                  ? 'التنبؤ الذكي بالطلب ونقاط إعادة الطلب المثلى (AI Demand Forecasting)'
                  : 'AI Demand Forecasting & Optimal Reorder Point Engine'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'ar'
                  ? 'تحليل فواتير المبيعات التاريخية، تذبذب السحب اليومي، ومدة التوريد لاقتراح نقاط إعادة الطلب الدقيقة للأصناف الحرجة.'
                  : 'Analyzes historical sales velocity, demand volatility, and supplier lead times to recommend optimal reorder points.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="run-ai-forecast-btn"
              disabled={isForecasting}
              onClick={handleRunAiForecast}
              className="haseb-btn-primary text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isForecasting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {isForecasting
                  ? language === 'ar'
                    ? 'جاري تحليل المبيعات بالذكاء الاصطناعي...'
                    : 'Analyzing Historical Demand...'
                  : language === 'ar'
                  ? 'تشغيل التنبؤ بالذكاء الاصطناعي'
                  : 'Run AI Demand Forecast'}
              </span>
            </button>

            {aiForecast && aiForecast.suggestions.length > 0 && canModifyInventory && (
              <button
                type="button"
                data-testid="apply-all-ai-reorders-btn"
                onClick={handleApplyAllAiSuggestions}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {language === 'ar'
                    ? `اعتماد كافة المقترحات (${changedAiSuggestionsCount})`
                    : `Apply All Reorder Points (${changedAiSuggestionsCount})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Typographic Baseline Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'أصناف حرجة / نواقص' : 'Low-Stock SKUs'}
            </div>
            <div className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {analysis.metrics.lowStockCount}
              <span className="text-xs font-medium text-slate-400 ms-1.5">
                / {analysis.metrics.totalProducts}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {language === 'ar'
                ? `إجمالي المبيعات (${lookbackDays} يوم)`
                : `Window Units Sold (${lookbackDays}d)`}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {analysis.metrics.totalWindowUnitsSold.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'أصناف نافذة كلياً' : 'Out of Stock'}
            </div>
            <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {analysis.metrics.outOfStockCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'أصناف بسجل مبيعات نشط' : 'SKUs with Sales History'}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {analysis.metrics.itemsWithSalesHistory}
            </div>
          </div>
        </div>

        {/* Parameter Controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{language === 'ar' ? 'نطاق التحليل:' : 'Lookback:'}</span>
              <select
                aria-label="Lookback window days"
                data-testid="forecast-lookback-select"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 tabular-nums"
              >
                <option value={14}>14 {language === 'ar' ? 'يوم' : 'days'}</option>
                <option value={30}>30 {language === 'ar' ? 'يوم' : 'days'}</option>
                <option value={60}>60 {language === 'ar' ? 'يوم' : 'days'}</option>
                <option value={90}>90 {language === 'ar' ? 'يوم' : 'days'}</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>{language === 'ar' ? 'مدة التوريد (أيام):' : 'Lead Time (days):'}</span>
              <input
                type="number"
                min={1}
                max={90}
                data-testid="forecast-leadtime-input"
                value={leadTimeDays}
                onChange={(e) =>
                  setLeadTimeDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))
                }
                className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-center text-slate-800 dark:text-slate-100 tabular-nums"
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>{language === 'ar' ? 'مخزون أمان (أيام):' : 'Safety Buffer (days):'}</span>
              <input
                type="number"
                min={0}
                max={60}
                data-testid="forecast-safety-input"
                value={safetyBufferDays}
                onChange={(e) =>
                  setSafetyBufferDays(Math.max(0, Math.min(60, Number(e.target.value) || 0)))
                }
                className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-center text-slate-800 dark:text-slate-100 tabular-nums"
              />
            </label>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
            <button
              type="button"
              data-testid="forecast-scope-low-btn"
              onClick={() => setScopeFilter('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                scopeFilter === 'LOW_STOCK'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {language === 'ar'
                ? `الأصناف الحرجة والنواقص (${analysis.metrics.lowStockCount})`
                : `Low-Stock Focus (${analysis.metrics.lowStockCount})`}
            </button>
            <button
              type="button"
              data-testid="forecast-scope-all-btn"
              onClick={() => setScopeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                scopeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {language === 'ar'
                ? `كافة الأصناف (${analysis.metrics.totalProducts})`
                : `All SKUs (${analysis.metrics.totalProducts})`}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
      {appliedBanner && (
        <div
          data-testid="ai-forecast-applied-banner"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{appliedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppliedBanner(null)}
            className="text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {forecastError && (
        <div
          data-testid="ai-forecast-error-banner"
          className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                {language === 'ar'
                  ? 'تعذر إتمام التنبؤ بالذكاء الاصطناعي'
                  : 'AI Forecast Could Not Complete'}
              </div>
              <div className="text-rose-800 dark:text-rose-300">{forecastError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForecastError(null)}
            className="text-rose-700 dark:text-rose-300 font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Skeleton while waiting for server-side Gemini AI */}
      {isForecasting && (
        <div
          data-testid="ai-forecast-loading"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 animate-pulse"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span>
              {language === 'ar'
                ? 'يقوم محرك Gemini AI الآن بدراسة نمط المبيعات التاريخي وحساب نقاط إعادة الطلب...'
                : 'Gemini AI is analyzing sales history and calculating optimal reorder points...'}
            </span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        </div>
      )}

      {/* AI Executive Summary */}
      {aiForecast && !isForecasting && (
        <div
          data-testid="ai-forecast-summary"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 p-4 space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'الملخص التنفيذي للتنبؤ بالطلب (Gemini AI)'
                  : 'AI Demand Forecast Executive Summary'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              {aiForecast.modelUsed} • {new Date(aiForecast.generatedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {aiForecast.executiveSummary ||
              (language === 'ar'
                ? `تم تحليل ${aiForecast.suggestions.length} صنفاً واقتراح نقاط إعادة الطلب المثلى بناءً على حركة المبيعات التاريخية.`
                : `Analyzed ${aiForecast.suggestions.length} SKUs and generated optimal reorder recommendations.`)}
          </p>
        </div>
      )}

      {/* Demand Velocity & Reorder Points Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Package className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              {language === 'ar'
                ? 'مؤشرات الطلب التاريخي ونقاط إعادة الطلب المقترحة'
                : 'Historical Demand Velocity & Reorder Recommendations'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {displayedItems.length} {language === 'ar' ? 'صنف معروض' : 'SKUs shown'}
          </span>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'ar'
                ? 'لا توجد أصناف مطابقة للعرض حالياً.'
                : 'No inventory items match the selected filter.'}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Card Layout (< md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {displayedItems.map((item) => {
                const aiSug = findSuggestionFor(item);
                const recommendedRop = aiSug?.suggestedReorderPoint ?? item.statisticalReorderPoint;
                const deltaRop = recommendedRop - item.currentReorderPoint;
                const urgencyDisplay = formatUrgencyLabel(aiSug?.urgency ?? item.riskTier);
                const fallbackOrderQty = Math.max(0, recommendedRop * 2 - item.currentStock);
                const orderQty = aiSug ? aiSug.suggestedOrderQty : fallbackOrderQty;

                return (
                  <div
                    key={`m-${item.productId}`}
                    data-testid={`forecast-card-mobile-${item.sku}`}
                    className="p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {language === 'ar' ? item.nameAr || item.name : item.name || item.nameAr}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {item.sku} • {item.windowUnitsSold} {language === 'ar' ? 'مباع' : 'sold'}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 ${urgencyDisplay.textClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${urgencyDisplay.dotClass}`} />
                        <span>{urgencyDisplay.text}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 text-[11px]">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {language === 'ar' ? 'الرصيد' : 'Stock'}
                        </div>
                        <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {item.currentStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {language === 'ar' ? 'الطلب الحالي' : 'Current'}
                        </div>
                        <div className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                          {item.currentReorderPoint}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {aiForecast
                            ? language === 'ar'
                              ? 'مقترح AI'
                              : 'AI ROP'
                            : language === 'ar'
                            ? 'المقترح'
                            : 'Rec ROP'}
                        </div>
                        <div className="font-bold tabular-nums text-blue-700 dark:text-blue-400">
                          {recommendedRop}
                          {deltaRop !== 0 && (
                            <span className="text-[10px] ms-0.5">
                              ({deltaRop > 0 ? `+${deltaRop}` : deltaRop})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="truncate">
                        {language === 'ar' ? 'كمية الشراء المقترحة:' : 'Order qty:'}{' '}
                        <strong className="tabular-nums text-slate-900 dark:text-slate-100">
                          {orderQty}
                        </strong>
                      </span>
                      {canModifyInventory && (
                        <button
                          type="button"
                          data-testid={`apply-forecast-mobile-${item.sku}`}
                          onClick={() => handleApplySingleSuggestion(item, recommendedRop)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-semibold text-[11px] cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                          <span>{language === 'ar' ? 'تطبيق' : 'Apply'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop & Tablet Data Table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 text-start">{language === 'ar' ? 'الصنف / SKU' : 'Item / SKU'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'الرصيد الحالي' : 'Stock'}</th>
                    <th className="py-2.5 px-3 text-center">
                      {language === 'ar' ? 'الطلب اليومي' : 'Daily Velocity'}
                    </th>
                    <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'كفاية المخزون' : 'Cover'}</th>
                    <th className="py-2.5 px-3 text-center">
                      {language === 'ar' ? 'نقطة الطلب الحالية' : 'Current ROP'}
                    </th>
                    <th className="py-2.5 px-3 text-center">
                      {aiForecast
                        ? language === 'ar'
                          ? 'المقترح (AI)'
                          : 'AI ROP'
                        : language === 'ar'
                        ? 'المؤشر الإحصائي'
                        : 'Baseline ROP'}
                    </th>
                    <th className="py-2.5 px-3 text-center">
                      {language === 'ar' ? 'كمية الشراء' : 'Order Qty'}
                    </th>
                    <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'الأولوية' : 'Urgency'}</th>
                    <th className="py-2.5 px-3 text-start">
                      {language === 'ar' ? 'التفسير والتحليل' : 'Rationale'}
                    </th>
                    <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedItems.map((item) => {
                    const aiSug = findSuggestionFor(item);
                    const recommendedRop = aiSug?.suggestedReorderPoint ?? item.statisticalReorderPoint;
                    const deltaRop = recommendedRop - item.currentReorderPoint;
                    const urgencyDisplay = formatUrgencyLabel(aiSug?.urgency ?? item.riskTier);
                    const fallbackOrderQty = Math.max(
                      0,
                      recommendedRop * 2 - item.currentStock
                    );
                    const orderQty = aiSug ? aiSug.suggestedOrderQty : fallbackOrderQty;

                    return (
                      <tr
                        key={item.productId}
                        data-testid={`forecast-row-${item.sku}`}
                        className="min-h-10 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {language === 'ar' ? item.nameAr || item.name : item.name || item.nameAr}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {item.sku} • {item.windowUnitsSold} {language === 'ar' ? 'مباع' : 'sold'}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {item.currentStock}
                        </td>

                        <td className="py-2.5 px-3 text-center tabular-nums text-slate-700 dark:text-slate-300">
                          {(aiSug?.forecastDailyDemand ?? item.avgDailyDemand).toFixed(2)}
                          <span className="text-[10px] text-slate-400 ms-1">
                            /{language === 'ar' ? 'يوم' : 'd'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center tabular-nums text-slate-700 dark:text-slate-300">
                          {item.daysOfCover !== null
                            ? `${item.daysOfCover} ${language === 'ar' ? 'ي' : 'd'}`
                            : '∞'}
                        </td>

                        <td className="py-2.5 px-3 text-center tabular-nums text-slate-600 dark:text-slate-400">
                          {item.currentReorderPoint}
                        </td>

                        <td className="py-2.5 px-3 text-center tabular-nums">
                          <span className="font-bold text-blue-700 dark:text-blue-400">
                            {recommendedRop}
                          </span>
                          {deltaRop !== 0 && (
                            <span
                              className={`text-[10px] ms-1 font-semibold ${
                                deltaRop > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              ({deltaRop > 0 ? `+${deltaRop}` : deltaRop})
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {orderQty}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${urgencyDisplay.textClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${urgencyDisplay.dotClass}`} />
                            <span>{urgencyDisplay.text}</span>
                          </span>
                        </td>

                        <td className="py-2.5 px-3 max-w-xs text-[11px] text-slate-600 dark:text-slate-400">
                          {aiSug?.rationale ? (
                            <span>{aiSug.rationale}</span>
                          ) : (
                            <span>
                              {language === 'ar'
                                ? `معدل سحب ${item.avgDailyDemand.toFixed(2)}/يوم بتذبذب ${item.demandVolatility.toFixed(2)}`
                                : `Avg ${item.avgDailyDemand.toFixed(2)}/day, volatility ${item.demandVolatility.toFixed(2)}`}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {canModifyInventory && (
                            <button
                              type="button"
                              data-testid={`apply-forecast-${item.sku}`}
                              onClick={() => handleApplySingleSuggestion(item, recommendedRop)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <ArrowUpRight className="w-3 h-3 shrink-0" />
                              <span>{language === 'ar' ? 'تطبيق' : 'Apply'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryDemandForecastPanel;
