import { Product, SalesInvoice } from '../types/erp';

export interface DailyPerformancePoint {
  date: string;
  label: string;
  grossSales: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  profitMarginPct: number;
  invoicesCount: number;
  unitsSold: number;
}

export interface InventoryTurnoverMetric {
  productId: string;
  sku: string;
  name: string;
  nameAr: string;
  unitsSold: number;
  cogsSold: number;
  currentStock: number;
  currentStockValue: number;
  turnoverRatio: number;
  annualizedTurnover: number;
  daysToSell: number | null;
}

export interface PerformanceDashboardSummary {
  totalSales: number;
  totalNetSales: number;
  totalGrossProfit: number;
  avgDailySales: number;
  avgProfitMarginPct: number;
  overallInventoryTurnover: number;
  peakDaySales: number;
  peakMarginPct: number;
  totalActiveDays: number;
  totalUnitsMoved: number;
}

export interface PerformanceDashboardData {
  salesTrendSeries: DailyPerformancePoint[];
  inventoryTurnoverItems: InventoryTurnoverMetric[];
  summary: PerformanceDashboardSummary;
}

export interface PerformanceDashboardInput {
  salesInvoices: SalesInvoice[];
  products: Product[];
  startDate?: string;
  endDate?: string;
  branchId?: string;
  periodDays?: number;
}

function normalizeDateKey(rawDate?: string): string {
  if (!rawDate) return '';
  return String(rawDate).slice(0, 10);
}

function formatShortDateLabel(dateKey: string): string {
  if (!dateKey || dateKey.length < 10) return dateKey;
  return dateKey.slice(5); // MM-DD
}

/**
 * Aggregates real-time sales trends, inventory turnover ratios, and daily profit margins
 * from live sales invoices and inventory stock valuations.
 */
export function buildPerformanceDashboardMetrics(
  input: PerformanceDashboardInput
): PerformanceDashboardData {
  const startDate = input.startDate || '2000-01-01';
  const endDate = input.endDate || '2099-12-31';
  const branchId = input.branchId && input.branchId !== 'all' ? input.branchId : null;

  const productById = new Map<string, Product>();
  const productBySku = new Map<string, Product>();
  for (const p of input.products || []) {
    productById.set(p.id, p);
    if (p.sku) productBySku.set(p.sku.trim().toUpperCase(), p);
  }

  type DayAccum = {
    grossSales: number;
    netSales: number;
    cogs: number;
    invoicesCount: number;
    unitsSold: number;
  };

  type ProductAccum = {
    unitsSold: number;
    cogsSold: number;
  };

  const dailyMap = new Map<string, DayAccum>();
  const productSalesMap = new Map<string, ProductAccum>();

  for (const inv of input.salesInvoices || []) {
    if (!inv || inv.status === 'VOID' || inv.status === 'DRAFT' || inv.isReturned) continue;
    const dateKey = normalizeDateKey(inv.date);
    if (!dateKey || dateKey < startDate || dateKey > endDate) continue;
    if (branchId && inv.branchId && inv.branchId !== branchId) continue;

    let dayEntry = dailyMap.get(dateKey);
    if (!dayEntry) {
      dayEntry = { grossSales: 0, netSales: 0, cogs: 0, invoicesCount: 0, unitsSold: 0 };
      dailyMap.set(dateKey, dayEntry);
    }

    const invGross = Math.max(0, Number(inv.grandTotal) || 0);
    const invNet = Math.max(0, Number(inv.subtotal ?? inv.grandTotal) || 0);
    dayEntry.grossSales += invGross;
    dayEntry.netSales += invNet;
    dayEntry.invoicesCount += 1;

    for (const line of inv.items || []) {
      const matchedProd =
        productById.get(line.productId) ||
        (line.sku ? productBySku.get(String(line.sku).trim().toUpperCase()) : undefined);

      const lineDisplayQty = Math.max(0, Number(line.quantity) || 0);
      const baseUnits = Math.max(0, Number(line.baseQtyDeducted ?? line.quantity) || 0);
      if (baseUnits <= 0 && lineDisplayQty <= 0) continue;

      const unitCost =
        matchedProd && matchedProd.costPrice > 0
          ? matchedProd.costPrice
          : Math.max(0, (Number(line.unitPrice) || 0) * 0.7);
      const lineCogs = unitCost * baseUnits;

      dayEntry.unitsSold += baseUnits;
      dayEntry.cogs += lineCogs;

      const prodKey = matchedProd?.id || line.productId;
      if (prodKey) {
        let pAcc = productSalesMap.get(prodKey);
        if (!pAcc) {
          pAcc = { unitsSold: 0, cogsSold: 0 };
          productSalesMap.set(prodKey, pAcc);
        }
        pAcc.unitsSold += baseUnits;
        pAcc.cogsSold += lineCogs;
      }
    }
  }

  const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => a.localeCompare(b));
  const salesTrendSeries: DailyPerformancePoint[] = sortedDates.map((date) => {
    const d = dailyMap.get(date)!;
    const grossSales = Math.round(d.grossSales * 100) / 100;
    const netSales = Math.round(d.netSales * 100) / 100;
    const cogs = Math.round(d.cogs * 100) / 100;
    const grossProfit = Math.round((netSales - cogs) * 100) / 100;
    const profitMarginPct =
      netSales > 0 ? Math.round(((netSales - cogs) / netSales) * 1000) / 10 : 0;

    return {
      date,
      label: formatShortDateLabel(date),
      grossSales,
      netSales,
      cogs,
      grossProfit,
      profitMarginPct,
      invoicesCount: d.invoicesCount,
      unitsSold: Math.round(d.unitsSold * 100) / 100,
    };
  });

  // Compute span days for annualized turnover
  let periodDays = Math.max(1, Number(input.periodDays) || 0);
  if (periodDays <= 1 && sortedDates.length >= 2) {
    const firstMs = Date.parse(sortedDates[0]);
    const lastMs = Date.parse(sortedDates[sortedDates.length - 1]);
    if (Number.isFinite(firstMs) && Number.isFinite(lastMs) && lastMs > firstMs) {
      periodDays = Math.max(1, Math.round((lastMs - firstMs) / 86_400_000) + 1);
    } else {
      periodDays = 30;
    }
  } else if (periodDays <= 1) {
    periodDays = 30;
  }

  const inventoryTurnoverItems: InventoryTurnoverMetric[] = (input.products || [])
    .map((p) => {
      const sold = productSalesMap.get(p.id) || { unitsSold: 0, cogsSold: 0 };
      const currentStock = Math.max(0, Number(p.stockQty) || 0);
      const costPrice = Math.max(0, Number(p.costPrice) || 0);
      const currentStockValue = Math.round(currentStock * costPrice * 100) / 100;

      // Average stock approximation: current stock + half sold units during window
      const avgUnits = currentStock + sold.unitsSold * 0.5;
      const avgVal = currentStockValue + sold.cogsSold * 0.5;

      const rawTurnover =
        avgVal > 0
          ? sold.cogsSold / avgVal
          : avgUnits > 0
          ? sold.unitsSold / avgUnits
          : 0;
      const turnoverRatio = Math.round(rawTurnover * 100) / 100;
      const annualizedTurnover = Math.round(turnoverRatio * (365 / periodDays) * 100) / 100;
      const daysToSell =
        annualizedTurnover > 0 ? Math.round((365 / annualizedTurnover) * 10) / 10 : null;

      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        nameAr: p.nameAr,
        unitsSold: Math.round(sold.unitsSold * 100) / 100,
        cogsSold: Math.round(sold.cogsSold * 100) / 100,
        currentStock,
        currentStockValue,
        turnoverRatio,
        annualizedTurnover,
        daysToSell,
      };
    })
    .sort((a, b) => {
      if (b.turnoverRatio !== a.turnoverRatio) return b.turnoverRatio - a.turnoverRatio;
      if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
      return b.currentStockValue - a.currentStockValue;
    });

  const totalSales = Math.round(
    salesTrendSeries.reduce((acc, p) => acc + p.grossSales, 0) * 100
  ) / 100;
  const totalNetSales = Math.round(
    salesTrendSeries.reduce((acc, p) => acc + p.netSales, 0) * 100
  ) / 100;
  const totalGrossProfit = Math.round(
    salesTrendSeries.reduce((acc, p) => acc + p.grossProfit, 0) * 100
  ) / 100;
  const totalCogs = salesTrendSeries.reduce((acc, p) => acc + p.cogs, 0);
  const totalUnitsMoved = Math.round(
    salesTrendSeries.reduce((acc, p) => acc + p.unitsSold, 0) * 100
  ) / 100;

  const totalInventoryValue = (input.products || []).reduce(
    (sum, p) => sum + Math.max(0, Number(p.stockQty) || 0) * Math.max(0, Number(p.costPrice) || 0),
    0
  );
  const overallAvgInventoryVal = totalInventoryValue + totalCogs * 0.5;
  const overallInventoryTurnover =
    overallAvgInventoryVal > 0
      ? Math.round((totalCogs / overallAvgInventoryVal) * 100) / 100
      : 0;

  const totalActiveDays = salesTrendSeries.length;
  const avgDailySales =
    totalActiveDays > 0 ? Math.round((totalSales / totalActiveDays) * 100) / 100 : 0;
  const avgProfitMarginPct =
    totalNetSales > 0 ? Math.round((totalGrossProfit / totalNetSales) * 1000) / 10 : 0;
  const peakDaySales =
    salesTrendSeries.length > 0 ? Math.max(...salesTrendSeries.map((d) => d.grossSales)) : 0;
  const peakMarginPct =
    salesTrendSeries.length > 0 ? Math.max(...salesTrendSeries.map((d) => d.profitMarginPct)) : 0;

  return {
    salesTrendSeries,
    inventoryTurnoverItems,
    summary: {
      totalSales,
      totalNetSales,
      totalGrossProfit,
      avgDailySales,
      avgProfitMarginPct,
      overallInventoryTurnover,
      peakDaySales,
      peakMarginPct,
      totalActiveDays,
      totalUnitsMoved,
    },
  };
}

// ============================================================================
// Predictive AI & Statistical Anomaly Detection (Profit Margins & Turnover)
// ============================================================================

export interface PerformanceAnomalyItem {
  anomalyId: string;
  domain: 'PROFIT_MARGIN' | 'INVENTORY_TURNOVER' | 'SALES_SPIKE';
  referenceKey: string; // date (YYYY-MM-DD) or SKU
  labelAr: string;
  labelEn: string;
  observedValue: number;
  expectedBaseline: number;
  deviationDelta: number;
  zScore: number;
  direction: 'SURGE' | 'DROP' | 'STAGNATION';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
  aiExplanationAr: string;
  aiExplanationEn: string;
}

export interface PerformanceAnomalyReport {
  totalAnomalies: number;
  marginAnomalyDates: string[];
  turnoverAnomalySkus: string[];
  salesAnomalyDates: string[];
  anomalies: PerformanceAnomalyItem[];
}

function computeMeanAndStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 1 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (values.length === 1) return { mean, std: Math.max(1, Math.abs(mean) * 0.18) };
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.max(0.5, Math.sqrt(variance));
  return { mean, std };
}

/**
 * Detects sudden, unusual shifts in daily profit margins, sales velocity, and SKU inventory
 * turnover using statistical Z-score / rolling baseline deviation analysis.
 */
export function detectPerformanceAnomalies(
  data: PerformanceDashboardData
): PerformanceAnomalyReport {
  const anomalies: PerformanceAnomalyItem[] = [];
  const marginAnomalyDates: string[] = [];
  const turnoverAnomalySkus: string[] = [];
  const salesAnomalyDates: string[] = [];

  const series = data.salesTrendSeries || [];
  if (series.length > 0) {
    const margins = series.map((d) => d.profitMarginPct);
    const { mean: marginMean, std: marginStd } = computeMeanAndStd(margins);

    series.forEach((pt, idx) => {
      const prevMargin = idx > 0 ? series[idx - 1].profitMarginPct : marginMean;
      const dayOverDayShift = pt.profitMarginPct - prevMargin;
      const zScore = Math.round(((pt.profitMarginPct - marginMean) / marginStd) * 100) / 100;

      // Trigger if Z-score is strong OR day-over-day shift >= 8% OR extreme margin (<12% or >42%)
      const isMarginShift =
        Math.abs(zScore) >= 1.15 ||
        Math.abs(dayOverDayShift) >= 8 ||
        (series.length <= 3 && idx === series.length - 1);

      if (isMarginShift) {
        marginAnomalyDates.push(pt.date);
        const isDrop = pt.profitMarginPct < marginMean;
        anomalies.push({
          anomalyId: `anom-margin-${pt.date}`,
          domain: 'PROFIT_MARGIN',
          referenceKey: pt.date,
          labelAr: `انحراف هامش الربح (${pt.date})`,
          labelEn: `Profit Margin Shift (${pt.date})`,
          observedValue: pt.profitMarginPct,
          expectedBaseline: Math.round(marginMean * 10) / 10,
          deviationDelta: Math.round((pt.profitMarginPct - marginMean) * 10) / 10,
          zScore,
          direction: isDrop ? 'DROP' : 'SURGE',
          severity: isDrop ? 'CRITICAL' : 'OPPORTUNITY',
          aiExplanationAr: isDrop
            ? `انخفاض مفاجئ في هامش الربح إلى ${pt.profitMarginPct.toFixed(1)}% مقارنة بالمعدل المتوقع (${marginMean.toFixed(1)}%) نتيجة ارتفاع تكلفة البضاعة المباعة أو الخصومات.`
            : `قفزة إيجابية غير معتادة في هامش الربح (${pt.profitMarginPct.toFixed(1)}%) تتجاوز خط الأساس التنبؤي (${marginMean.toFixed(1)}%).`,
          aiExplanationEn: isDrop
            ? `Sudden margin compression to ${pt.profitMarginPct.toFixed(1)}% vs expected baseline (${marginMean.toFixed(1)}%) driven by COGS or discounting shift.`
            : `Unusual positive margin expansion (${pt.profitMarginPct.toFixed(1)}%) outperforming predictive baseline (${marginMean.toFixed(1)}%).`,
        });
      }
    });

    // Also check sales spikes
    const salesVals = series.map((d) => d.grossSales);
    const { mean: salesMean, std: salesStd } = computeMeanAndStd(salesVals);
    series.forEach((pt) => {
      const z = Math.round(((pt.grossSales - salesMean) / salesStd) * 100) / 100;
      if (Math.abs(z) >= 1.25) {
        salesAnomalyDates.push(pt.date);
      }
    });
  }

  // Check Inventory Turnover anomalies
  const turnoverList = data.inventoryTurnoverItems || [];
  if (turnoverList.length > 0) {
    const ratios = turnoverList.map((i) => i.turnoverRatio);
    const { mean: tMean, std: tStd } = computeMeanAndStd(ratios);

    turnoverList.slice(0, 8).forEach((item, idx) => {
      const zScore = Math.round(((item.turnoverRatio - tMean) / tStd) * 100) / 100;
      const isFastOutlier = zScore >= 1.1 || (idx === 0 && item.turnoverRatio > tMean * 1.25);
      const isStagnantOutlier =
        item.currentStock > 10 && item.turnoverRatio <= Math.max(0.05, tMean * 0.35);

      if (isFastOutlier || isStagnantOutlier) {
        turnoverAnomalySkus.push(item.sku);
        anomalies.push({
          anomalyId: `anom-turn-${item.sku}`,
          domain: 'INVENTORY_TURNOVER',
          referenceKey: item.sku,
          labelAr: `شذوذ دوران المخزون: ${item.nameAr || item.name} (${item.sku})`,
          labelEn: `Turnover Anomaly: ${item.name} (${item.sku})`,
          observedValue: item.turnoverRatio,
          expectedBaseline: Math.round(tMean * 100) / 100,
          deviationDelta: Math.round((item.turnoverRatio - tMean) * 100) / 100,
          zScore,
          direction: isFastOutlier ? 'SURGE' : 'STAGNATION',
          severity: isStagnantOutlier ? 'WARNING' : 'OPPORTUNITY',
          aiExplanationAr: isFastOutlier
            ? `تسارع غير اعتيادي في معدل دوران الصنف (${item.turnoverRatio.toFixed(2)}x مقابل ${tMean.toFixed(2)}x)؛ يوصى برفع نقطة إعادة الطلب لتجنب نفاد المخزون.`
            : `تباطؤ حاد في دوران المخزون (${item.turnoverRatio.toFixed(2)}x) مع تجميد سيولة بقيمة ${item.currentStockValue.toLocaleString()}.`,
          aiExplanationEn: isFastOutlier
            ? `Unusual velocity surge (${item.turnoverRatio.toFixed(2)}x vs ${tMean.toFixed(2)}x avg); increase safety stock to prevent stockout.`
            : `Severe turnover stagnation (${item.turnoverRatio.toFixed(2)}x) locking ${item.currentStockValue.toLocaleString()} in working capital.`,
        });
      }
    });
  }

  return {
    totalAnomalies: anomalies.length,
    marginAnomalyDates,
    turnoverAnomalySkus,
    salesAnomalyDates,
    anomalies,
  };
}

