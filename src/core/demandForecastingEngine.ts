import { Product, SalesInvoice } from '../types/erp';

export interface ProductHistoricalDemandStat {
  productId: string;
  sku: string;
  name: string;
  nameAr: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  currentReorderPoint: number;
  costPrice: number;
  salePrice: number;
  totalUnitsSold: number;
  windowUnitsSold: number;
  invoiceHits: number;
  avgDailyDemand: number;
  demandVolatility: number;
  totalRevenue: number;
  daysOfCover: number | null;
  statisticalReorderPoint: number;
  isLowStock: boolean;
  riskTier: 'OUT_OF_STOCK' | 'CRITICAL' | 'AT_RISK' | 'OPTIMAL';
  recentDailySeries: Array<{ date: string; qty: number }>;
}

export interface DemandForecastSummaryMetrics {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalWindowUnitsSold: number;
  itemsWithSalesHistory: number;
}

export type ForecastUrgency = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'OPTIMAL';

export interface AiReorderSuggestion {
  productId: string;
  sku: string;
  forecastDailyDemand: number;
  projected30DayDemand: number;
  suggestedReorderPoint: number;
  suggestedSafetyStock: number;
  suggestedOrderQty: number;
  urgency: ForecastUrgency;
  confidencePercent: number;
  rationale: string;
}

export interface AiDemandForecastResponse {
  modelUsed: string;
  generatedAt: string;
  executiveSummary: string;
  suggestions: AiReorderSuggestion[];
}

export interface DemandAnalysisInput {
  products: Product[];
  salesInvoices: SalesInvoice[];
  lookbackDays?: number;
  leadTimeDays?: number;
  safetyBufferDays?: number;
  referenceDateIso?: string;
}

function parseDateMs(dateStr?: string): number {
  if (!dateStr) return NaN;
  const parsed = Date.parse(dateStr);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Aggregates historical invoice line-item sales per product and calculates
 * velocity, demand volatility, days of cover, and baseline statistical reorder points.
 */
export function buildHistoricalDemandAnalysis(input: DemandAnalysisInput): {
  items: ProductHistoricalDemandStat[];
  metrics: DemandForecastSummaryMetrics;
} {
  const lookbackDays = Math.max(1, Math.min(365, Math.round(input.lookbackDays ?? 30)));
  const leadTimeDays = Math.max(1, Math.min(180, Math.round(input.leadTimeDays ?? 7)));
  const safetyBufferDays = Math.max(0, Math.min(90, Math.round(input.safetyBufferDays ?? 5)));
  const refMs = input.referenceDateIso ? parseDateMs(input.referenceDateIso) : Date.now();
  const safeRefMs = Number.isFinite(refMs) ? refMs : Date.now();
  const windowStartMs = safeRefMs - lookbackDays * 86_400_000;

  type Accum = {
    totalUnitsSold: number;
    windowUnitsSold: number;
    totalRevenue: number;
    invoiceIds: Set<string>;
    dailyQtyMap: Map<string, number>;
  };

  const byProductId = new Map<string, Accum>();
  const bySkuUpper = new Map<string, Accum>();

  const getOrCreateAccum = (map: Map<string, Accum>, key: string): Accum => {
    let entry = map.get(key);
    if (!entry) {
      entry = {
        totalUnitsSold: 0,
        windowUnitsSold: 0,
        totalRevenue: 0,
        invoiceIds: new Set<string>(),
        dailyQtyMap: new Map<string, number>(),
      };
      map.set(key, entry);
    }
    return entry;
  };

  for (const inv of input.salesInvoices || []) {
    if (!inv || inv.status === 'VOID' || inv.status === 'DRAFT' || !Array.isArray(inv.items)) {
      continue;
    }
    const invMs = parseDateMs(inv.date);
    const inWindow = !Number.isFinite(invMs) || (invMs >= windowStartMs && invMs <= safeRefMs + 86_400_000);
    const dayKey = (inv.date || new Date(safeRefMs).toISOString()).slice(0, 10);

    for (const line of inv.items) {
      const qty = Math.max(0, Number(line.baseQtyDeducted ?? line.quantity) || 0);
      if (qty <= 0) continue;
      const lineRevenue = Math.max(0, Number(line.total) || 0);

      const addRecord = (acc: Accum) => {
        acc.totalUnitsSold += qty;
        acc.totalRevenue += lineRevenue;
        acc.invoiceIds.add(inv.id);
        if (inWindow) {
          acc.windowUnitsSold += qty;
          acc.dailyQtyMap.set(dayKey, (acc.dailyQtyMap.get(dayKey) || 0) + qty);
        }
      };

      if (line.productId) {
        addRecord(getOrCreateAccum(byProductId, String(line.productId)));
      } else if (line.sku) {
        addRecord(getOrCreateAccum(bySkuUpper, String(line.sku).trim().toUpperCase()));
      }
    }
  }

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalWindowUnitsSold = 0;
  let itemsWithSalesHistory = 0;

  const items: ProductHistoricalDemandStat[] = (input.products || []).map((p) => {
    const skuKey = String(p.sku || '').trim().toUpperCase();
    const accById = byProductId.get(p.id);
    const accBySku = skuKey ? bySkuUpper.get(skuKey) : undefined;

    const totalUnitsSold = (accById?.totalUnitsSold || 0) + (accBySku?.totalUnitsSold || 0);
    const windowUnitsSold = (accById?.windowUnitsSold || 0) + (accBySku?.windowUnitsSold || 0);
    const totalRevenue = (accById?.totalRevenue || 0) + (accBySku?.totalRevenue || 0);
    const invoiceHits = (accById?.invoiceIds.size || 0) + (accBySku?.invoiceIds.size || 0);

    const mergedDailyMap = new Map<string, number>();
    accById?.dailyQtyMap.forEach((v, k) => mergedDailyMap.set(k, (mergedDailyMap.get(k) || 0) + v));
    accBySku?.dailyQtyMap.forEach((v, k) => mergedDailyMap.set(k, (mergedDailyMap.get(k) || 0) + v));

    const recentDailySeries = Array.from(mergedDailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, qty]) => ({ date, qty: Math.round(qty * 100) / 100 }));

    if (totalUnitsSold > 0) {
      itemsWithSalesHistory += 1;
    }
    totalWindowUnitsSold += windowUnitsSold;

    const avgDailyDemand = Math.round((windowUnitsSold / lookbackDays) * 1000) / 1000;

    // Sample standard deviation over active lookback days (including zero-sale days in window)
    let demandVolatility = 0;
    if (windowUnitsSold > 0) {
      const activeDayValues = Array.from(mergedDailyMap.values());
      const zeroDays = Math.max(0, lookbackDays - activeDayValues.length);
      let sumSqDiff = zeroDays * Math.pow(0 - avgDailyDemand, 2);
      for (const v of activeDayValues) {
        sumSqDiff += Math.pow(v - avgDailyDemand, 2);
      }
      demandVolatility = Math.round(Math.sqrt(sumSqDiff / lookbackDays) * 1000) / 1000;
    }

    const currentStock = Math.max(0, Number(p.stockQty) || 0);
    const minStock = Math.max(0, Number(p.minStock) || 0);
    const maxStock = Math.max(0, Number(p.maxStock) || 0);
    const currentReorderPoint = Math.max(0, Number(p.reorderPoint) || 0);

    const daysOfCover =
      avgDailyDemand > 0 ? Math.round((currentStock / avgDailyDemand) * 10) / 10 : null;

    // Statistical ROP = (Avg Daily Demand * Lead Time) + Z(1.28) * sigma * sqrt(Lead Time) + safety buffer
    const leadTimeDemand = avgDailyDemand * leadTimeDays;
    const statisticalSafety =
      avgDailyDemand > 0
        ? Math.max(
            avgDailyDemand * safetyBufferDays,
            1.28 * demandVolatility * Math.sqrt(leadTimeDays)
          )
        : currentReorderPoint;

    const statisticalReorderPoint =
      avgDailyDemand > 0
        ? Math.max(1, Math.ceil(leadTimeDemand + statisticalSafety))
        : Math.max(1, currentReorderPoint);

    const belowThreshold =
      currentStock <= 0 ||
      currentStock <= minStock ||
      currentStock <= currentReorderPoint ||
      (daysOfCover !== null && daysOfCover <= leadTimeDays + safetyBufferDays);

    let riskTier: ProductHistoricalDemandStat['riskTier'] = 'OPTIMAL';
    if (currentStock <= 0) {
      riskTier = 'OUT_OF_STOCK';
    } else if (
      currentStock <= minStock ||
      (daysOfCover !== null && daysOfCover <= leadTimeDays)
    ) {
      riskTier = 'CRITICAL';
    } else if (belowThreshold) {
      riskTier = 'AT_RISK';
    }

    if (currentStock <= 0) outOfStockCount += 1;
    if (belowThreshold) lowStockCount += 1;

    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      nameAr: p.nameAr,
      currentStock,
      minStock,
      maxStock,
      currentReorderPoint,
      costPrice: Number(p.costPrice) || 0,
      salePrice: Number(p.salePrice) || 0,
      totalUnitsSold: Math.round(totalUnitsSold * 100) / 100,
      windowUnitsSold: Math.round(windowUnitsSold * 100) / 100,
      invoiceHits,
      avgDailyDemand,
      demandVolatility,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      daysOfCover,
      statisticalReorderPoint,
      isLowStock: belowThreshold,
      riskTier,
      recentDailySeries,
    };
  });

  // Sort most urgent / low-stock + highest sales velocity first
  const riskWeight: Record<ProductHistoricalDemandStat['riskTier'], number> = {
    OUT_OF_STOCK: 4,
    CRITICAL: 3,
    AT_RISK: 2,
    OPTIMAL: 1,
  };

  items.sort((a, b) => {
    const rw = riskWeight[b.riskTier] - riskWeight[a.riskTier];
    if (rw !== 0) return rw;
    if (b.windowUnitsSold !== a.windowUnitsSold) return b.windowUnitsSold - a.windowUnitsSold;
    return a.currentStock - b.currentStock;
  });

  return {
    items,
    metrics: {
      totalProducts: items.length,
      lowStockCount,
      outOfStockCount,
      totalWindowUnitsSold: Math.round(totalWindowUnitsSold * 100) / 100,
      itemsWithSalesHistory,
    },
  };
}

/**
 * Applies validated AI reorder point suggestions to the inventory products array.
 * Keeps stock quantities intact while updating `reorderPoint` and adjusting `minStock` / `maxStock` bounds safely.
 */
export function applySuggestedReorderPoints(
  currentProducts: Product[],
  suggestions: Array<Pick<AiReorderSuggestion, 'productId' | 'sku' | 'suggestedReorderPoint'>>
): {
  nextProducts: Product[];
  updatedCount: number;
  totalFieldChanges: number;
} {
  const suggestionById = new Map<string, number>();
  const suggestionBySku = new Map<string, number>();

  for (const s of suggestions) {
    const rop = Math.max(1, Math.round(Number(s.suggestedReorderPoint) || 0));
    if (!Number.isFinite(rop) || rop <= 0) continue;
    if (s.productId) suggestionById.set(s.productId, rop);
    if (s.sku) suggestionBySku.set(s.sku.trim().toUpperCase(), rop);
  }

  let updatedCount = 0;
  const nextProducts = currentProducts.map((p) => {
    const targetRop =
      suggestionById.get(p.id) ?? suggestionBySku.get(String(p.sku || '').trim().toUpperCase());
    if (targetRop === undefined || targetRop === p.reorderPoint) {
      return p;
    }
    updatedCount += 1;
    const nextMinStock = Math.max(1, Math.min(p.minStock || Math.floor(targetRop / 2), Math.floor(targetRop * 0.6)));
    const nextMaxStock = Math.max(p.maxStock || 0, targetRop * 3);
    return {
      ...p,
      reorderPoint: targetRop,
      minStock: nextMinStock,
      maxStock: nextMaxStock,
    };
  });

  return {
    nextProducts,
    updatedCount,
    totalFieldChanges: updatedCount,
  };
}
