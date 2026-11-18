import { Product } from '../types/erp';

export type SafetyThresholdWarningLevel =
  | 'NONE'
  | 'NEARING_SAFETY_THRESHOLD'
  | 'BELOW_SAFETY_THRESHOLD'
  | 'OUT_OF_STOCK';

export interface PosItemSafetyIndicatorMeta {
  productId: string;
  sku: string;
  stockQty: number;
  inCartBaseQty: number;
  remainingAvailableStock: number;
  safetyThreshold: number;
  nearThresholdCeiling: number;
  showAmberWarningIcon: boolean;
  warningLevel: SafetyThresholdWarningLevel;
  badgeLabelAr: string;
  badgeLabelEn: string;
  tooltipAr: string;
  tooltipEn: string;
}

export interface StrictStockValidationResult {
  allowed: boolean;
  isAddActionDisabled: boolean;
  requestedQty: number;
  requestedBaseQty: number;
  currentStockQty: number;
  inCartBaseQty: number;
  remainingAvailableStock: number;
  shortageQty: number;
  safetyIndicator: PosItemSafetyIndicatorMeta;
  toastTitleAr: string;
  toastTitleEn: string;
  toastMessageAr: string;
  toastMessageEn: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
}

/**
 * Evaluates whether an inventory item in the POS search dropdown or catalog is nearing
 * or at/below its predefined safety threshold (`reorderPoint`) to prevent overselling.
 */
export function evaluatePosItemSafetyThresholdWarning(
  product: Pick<Product, 'id' | 'sku' | 'name' | 'nameAr' | 'stockQty' | 'reorderPoint'>,
  inCartBaseQty = 0
): PosItemSafetyIndicatorMeta {
  const stockQty = Math.max(0, Math.round((Number(product.stockQty) || 0) * 1000) / 1000);
  const cleanInCart = Math.max(0, Math.round((Number(inCartBaseQty) || 0) * 1000) / 1000);
  const remainingAvailableStock = Math.max(0, Math.round((stockQty - cleanInCart) * 1000) / 1000);
  const safetyThreshold = Math.max(1, Number(product.reorderPoint) || 5);
  // Nearing safety threshold ceiling: within 35% above reorderPoint (or at least +3 units)
  const nearThresholdCeiling = Math.max(
    safetyThreshold + 3,
    Math.ceil(safetyThreshold * 1.35)
  );

  if (remainingAvailableStock <= 0 || stockQty <= 0) {
    return {
      productId: product.id,
      sku: product.sku,
      stockQty,
      inCartBaseQty: cleanInCart,
      remainingAvailableStock: 0,
      safetyThreshold,
      nearThresholdCeiling,
      showAmberWarningIcon: true,
      warningLevel: 'OUT_OF_STOCK',
      badgeLabelAr: 'نفد المتاح للبيع (0)',
      badgeLabelEn: 'Out of Available Stock (0)',
      tooltipAr: `تنبيه نفاد المخزون: المتبقي المتاح للإضافة (0) من أصل (${stockQty}) وحد الأمان (${safetyThreshold})`,
      tooltipEn: `Stock depleted: 0 remaining available out of ${stockQty} (Safety threshold: ${safetyThreshold})`,
    };
  }

  if (remainingAvailableStock <= safetyThreshold || stockQty <= safetyThreshold) {
    return {
      productId: product.id,
      sku: product.sku,
      stockQty,
      inCartBaseQty: cleanInCart,
      remainingAvailableStock,
      safetyThreshold,
      nearThresholdCeiling,
      showAmberWarningIcon: true,
      warningLevel: 'BELOW_SAFETY_THRESHOLD',
      badgeLabelAr: `وصل لحد الأمان (${remainingAvailableStock}/${safetyThreshold})`,
      badgeLabelEn: `At Safety Threshold (${remainingAvailableStock}/${safetyThreshold})`,
      tooltipAr: `تحذير لمنع البيع الزائد: الرصيد المتاح (${remainingAvailableStock}) وصل أو انخفض عن حد الأمان المحدد (${safetyThreshold})`,
      tooltipEn: `Overselling prevention warning: Available stock (${remainingAvailableStock}) is at/below safety threshold (${safetyThreshold})`,
    };
  }

  if (remainingAvailableStock <= nearThresholdCeiling || stockQty <= nearThresholdCeiling) {
    return {
      productId: product.id,
      sku: product.sku,
      stockQty,
      inCartBaseQty: cleanInCart,
      remainingAvailableStock,
      safetyThreshold,
      nearThresholdCeiling,
      showAmberWarningIcon: true,
      warningLevel: 'NEARING_SAFETY_THRESHOLD',
      badgeLabelAr: `يقترب من حد الأمان (${remainingAvailableStock})`,
      badgeLabelEn: `Nearing Safety Threshold (${remainingAvailableStock})`,
      tooltipAr: `تنبيه مبكر: الرصيد المتاح (${remainingAvailableStock}) يقترب من حد الأمان (${safetyThreshold}) — يرجى الانتباه لمنع البيع الزائد`,
      tooltipEn: `Early warning: Available stock (${remainingAvailableStock}) is nearing safety threshold (${safetyThreshold})`,
    };
  }

  return {
    productId: product.id,
    sku: product.sku,
    stockQty,
    inCartBaseQty: cleanInCart,
    remainingAvailableStock,
    safetyThreshold,
    nearThresholdCeiling,
    showAmberWarningIcon: false,
    warningLevel: 'NONE',
    badgeLabelAr: `متوفر (${remainingAvailableStock})`,
    badgeLabelEn: `In Stock (${remainingAvailableStock})`,
    tooltipAr: `المخزون المتاح آمن (${remainingAvailableStock} متاح • حد الأمان ${safetyThreshold})`,
    tooltipEn: `Healthy stock (${remainingAvailableStock} available • Safety threshold ${safetyThreshold})`,
  };
}

/**
 * Strict Stock Validation Service for the POS Module:
 * Checks current available stock level in real-time BEFORE adding an item to the sales cart.
 * If the requested quantity exceeds the available stock, blocks the addition, marks the
 * add-to-cart action disabled, and produces a high-visibility shortage toast warning.
 */
export function validateStrictPosStockBeforeAdd(params: {
  product: Pick<Product, 'id' | 'sku' | 'name' | 'nameAr' | 'stockQty' | 'reorderPoint'>;
  inCartBaseQty?: number;
  requestedAddQty?: number;
  conversionFactor?: number;
  unitNameAr?: string;
}): StrictStockValidationResult {
  const {
    product,
    inCartBaseQty = 0,
    requestedAddQty = 1,
    conversionFactor = 1,
    unitNameAr = 'وحدة',
  } = params;

  const productNameAr = product.nameAr || product.name;
  const productNameEn = product.name || product.nameAr;
  const factor = Math.max(0.001, Number(conversionFactor) || 1);
  const cleanRequestedQty = Math.max(0, Math.round((Number(requestedAddQty) || 0) * 1000) / 1000);
  const requestedBaseQty = Math.round(cleanRequestedQty * factor * 1000) / 1000;

  const safetyIndicator = evaluatePosItemSafetyThresholdWarning(product, inCartBaseQty);
  const { stockQty, remainingAvailableStock } = safetyIndicator;

  if (cleanRequestedQty <= 0 || remainingAvailableStock <= 0 || requestedBaseQty > remainingAvailableStock) {
    const shortageQty = Math.max(
      1,
      Math.round((requestedBaseQty - remainingAvailableStock) * 1000) / 1000
    );

    return {
      allowed: false,
      isAddActionDisabled: true,
      requestedQty: cleanRequestedQty,
      requestedBaseQty,
      currentStockQty: stockQty,
      inCartBaseQty: safetyIndicator.inCartBaseQty,
      remainingAvailableStock,
      shortageQty,
      safetyIndicator,
      severity: 'critical',
      toastTitleAr: 'رفض الإضافة للسلة — عجز في المخزون المتاح!',
      toastTitleEn: 'Add to Cart Blocked — Stock Shortage!',
      toastMessageAr:
        remainingAvailableStock <= 0
          ? `لا يمكن إضافة (${productNameAr}) — الرصيد المتبقي المتاح للإضافة هو (0) لأن السلة تحتوي بالفعل على كامل المخزون (${stockQty}).`
          : `الكمية المطلوبة (${cleanRequestedQty} ${unitNameAr}) تتجاوز المتبقي المتاح في المخزون (${remainingAvailableStock}) بعجز قدره (${shortageQty}) — تم إيقاف الإضافة لمنع البيع الزائد.`,
      toastMessageEn:
        remainingAvailableStock <= 0
          ? `Cannot add (${productNameEn}) — Remaining available stock is (0) (Total stock: ${stockQty}).`
          : `Requested quantity (${cleanRequestedQty}) exceeds remaining available stock (${remainingAvailableStock}) by (${shortageQty}) — Add to cart blocked to prevent overselling.`,
    };
  }

  const nextRemaining = Math.max(0, Math.round((remainingAvailableStock - requestedBaseQty) * 1000) / 1000);
  const nextSafety = evaluatePosItemSafetyThresholdWarning(
    product,
    safetyIndicator.inCartBaseQty + requestedBaseQty
  );

  return {
    allowed: true,
    isAddActionDisabled: nextRemaining <= 0,
    requestedQty: cleanRequestedQty,
    requestedBaseQty,
    currentStockQty: stockQty,
    inCartBaseQty: safetyIndicator.inCartBaseQty,
    remainingAvailableStock,
    shortageQty: 0,
    safetyIndicator: nextSafety,
    severity: nextSafety.showAmberWarningIcon ? 'warning' : 'success',
    toastTitleAr: nextSafety.showAmberWarningIcon
      ? 'تنبيه حد الأمان للمخزون'
      : 'تمت الإضافة للسلة بنجاح',
    toastTitleEn: nextSafety.showAmberWarningIcon
      ? 'Safety Stock Threshold Alert'
      : 'Added to Cart',
    toastMessageAr: nextSafety.showAmberWarningIcon
      ? `تمت إضافة (${cleanRequestedQty} ${unitNameAr}) من (${productNameAr}) — تنبيه: المتبقي المتاح الآن (${nextRemaining}) يقترب من أو يساوي حد الأمان (${safetyIndicator.safetyThreshold}).`
      : `تمت إضافة (${cleanRequestedQty} ${unitNameAr}) من (${productNameAr}) إلى السلة (المتبقي المتاح: ${nextRemaining}).`,
    toastMessageEn: nextSafety.showAmberWarningIcon
      ? `Added (${cleanRequestedQty}) of (${productNameEn}) — Warning: Remaining stock (${nextRemaining}) is at/nearing safety threshold (${safetyIndicator.safetyThreshold}).`
      : `Added (${cleanRequestedQty}) of (${productNameEn}) to cart (Remaining stock: ${nextRemaining}).`,
  };
}

export interface SuggestedAlternativeItem {
  id: string;
  sku: string;
  name: string;
  nameAr: string;
  stockQty: number;
  salePrice: number;
  uom: string;
  matchReasonAr: string;
  matchReasonEn: string;
}

export interface PosDemandForecastBadgeMeta {
  productId: string;
  sku: string;
  remainingAvailableStock: number;
  dailySalesVelocity: number;
  predictedDaysLeft: number;
  isLikelyToRunOut: boolean;
  depletionRiskLevel: 'CRITICAL_DEPLETION' | 'LIKELY_TO_RUN_OUT' | 'STABLE';
  badgeLabelAr: string;
  badgeLabelEn: string;
  advisoryMessageAr: string;
  advisoryMessageEn: string;
  suggestedAlternatives: SuggestedAlternativeItem[];
}

/**
 * AI-Powered Demand Forecasting for the POS Item Search Dropdown:
 * Analyzes sales velocity and remaining stock to flag items that are 'Likely to Run Out'
 * and suggests healthy in-stock alternative items so cashiers can advise customers.
 */
export function evaluatePosItemDemandForecast(params: {
  product: Product;
  allProducts: Product[];
  inCartBaseQty?: number;
  recentSoldQtyByProductId?: Record<string, number>;
}): PosDemandForecastBadgeMeta {
  const {
    product,
    allProducts,
    inCartBaseQty = 0,
    recentSoldQtyByProductId = {},
  } = params;

  const stockQty = Math.max(0, Math.round((Number(product.stockQty) || 0) * 1000) / 1000);
  const cleanInCart = Math.max(0, Math.round((Number(inCartBaseQty) || 0) * 1000) / 1000);
  const remainingAvailableStock = Math.max(0, Math.round((stockQty - cleanInCart) * 1000) / 1000);
  const safetyThreshold = Math.max(1, Number(product.reorderPoint) || 5);

  // Derive daily velocity from recent sales or intelligent baseline demand model
  const historicalSold = Number(recentSoldQtyByProductId[product.id]) || 0;
  const baselineDailyVelocity = Math.max(
    1.2,
    Math.round(((safetyThreshold * 0.35) + (historicalSold * 0.25)) * 10) / 10
  );
  const dailySalesVelocity = Math.max(0.5, baselineDailyVelocity);

  const predictedDaysLeft =
    remainingAvailableStock <= 0
      ? 0
      : Math.max(1, Math.round((remainingAvailableStock / dailySalesVelocity) * 10) / 10);

  const nearThresholdCeiling = Math.max(safetyThreshold + 3, Math.ceil(safetyThreshold * 1.35));
  const isLikelyToRunOut =
    remainingAvailableStock <= nearThresholdCeiling || predictedDaysLeft <= 5;

  const depletionRiskLevel: PosDemandForecastBadgeMeta['depletionRiskLevel'] =
    remainingAvailableStock <= 0 || predictedDaysLeft <= 2 || remainingAvailableStock <= safetyThreshold
      ? 'CRITICAL_DEPLETION'
      : isLikelyToRunOut
      ? 'LIKELY_TO_RUN_OUT'
      : 'STABLE';

  // Find up to 2 healthy in-stock alternative products for cashier customer advisory
  const suggestedAlternatives: SuggestedAlternativeItem[] = isLikelyToRunOut
    ? allProducts
        .filter((candidate) => {
          if (candidate.id === product.id) return false;
          const candStock = Number(candidate.stockQty) || 0;
          const candSafety = Math.max(1, Number(candidate.reorderPoint) || 5);
          return candStock > candSafety;
        })
        .map((candidate) => {
          const sameSubCategory =
            Boolean(product.subCategory) && candidate.subCategory === product.subCategory;
          const sameCategory =
            Boolean(product.categoryId) && candidate.categoryId === product.categoryId;
          const priceDiffRatio =
            product.salePrice > 0
              ? Math.abs(candidate.salePrice - product.salePrice) / product.salePrice
              : 1;
          const score =
            (sameSubCategory ? 100 : 0) +
            (sameCategory ? 50 : 0) +
            Math.max(0, 25 - Math.round(priceDiffRatio * 20)) +
            Math.min(20, Number(candidate.stockQty) || 0);
          return {
            candidate,
            score,
            sameSubCategory,
            sameCategory,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(({ candidate, sameSubCategory, sameCategory }) => ({
          id: candidate.id,
          sku: candidate.sku,
          name: candidate.name,
          nameAr: candidate.nameAr,
          stockQty: Number(candidate.stockQty) || 0,
          salePrice: Number(candidate.salePrice) || 0,
          uom: candidate.uom || 'وحدة',
          matchReasonAr: sameSubCategory
            ? 'بديل مطابق بنفس الفئة الفرعية ومتوفر بوفرة'
            : sameCategory
            ? 'بديل من نفس التصنيف بمخزون آمن'
            : 'بديل مقترح متوفر بالمخزون',
          matchReasonEn: sameSubCategory
            ? 'Direct subcategory match with healthy stock'
            : sameCategory
            ? 'Same category alternative with healthy stock'
            : 'Recommended in-stock alternative',
        }))
    : [];

  const badgeLabelAr =
    remainingAvailableStock <= 0
      ? 'على وشك النفاد • نفد المتاح (0)'
      : `على وشك النفاد • Likely to Run Out (~${Math.ceil(predictedDaysLeft)} يوم)`;
  const badgeLabelEn =
    remainingAvailableStock <= 0
      ? 'Likely to Run Out • Depleted (0d)'
      : `Likely to Run Out (~${Math.ceil(predictedDaysLeft)}d left)`;

  const topAlt = suggestedAlternatives[0];
  const advisoryMessageAr = topAlt
    ? `توقع الذكاء الاصطناعي: معدل السحب (${dailySalesVelocity}/يوم) ينبئ بنفاد الصنف خلال ~${Math.ceil(
        predictedDaysLeft
      )} يوم. ننصح الكاشير باقتراح البديل المتوفر: (${topAlt.nameAr} — متوفر ${topAlt.stockQty}).`
    : `توقع الذكاء الاصطناعي: معدل السحب (${dailySalesVelocity}/يوم) ينبئ بنفاد الصنف قريباً.`;

  const advisoryMessageEn = topAlt
    ? `AI Demand Forecast: Depletion in ~${Math.ceil(
        predictedDaysLeft
      )}d (${dailySalesVelocity}/day). Advise customer on alternative: ${topAlt.name} (${topAlt.stockQty} in stock).`
    : `AI Demand Forecast: Predicted stock depletion in ~${Math.ceil(predictedDaysLeft)} days.`;

  return {
    productId: product.id,
    sku: product.sku,
    remainingAvailableStock,
    dailySalesVelocity,
    predictedDaysLeft,
    isLikelyToRunOut,
    depletionRiskLevel,
    badgeLabelAr,
    badgeLabelEn,
    advisoryMessageAr,
    advisoryMessageEn,
    suggestedAlternatives,
  };
}

export interface BulkStockAdjustmentInput {
  productId: string;
  newPhysicalQty: number;
  noteAr?: string;
}

export interface BulkStockAdjustmentLineResult {
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  previousStockQty: number;
  newPhysicalQty: number;
  varianceQty: number;
  reorderPoint: number;
  reasonAr: string;
}

export interface BulkStockAdjustmentBatchResult {
  updatedProducts: Product[];
  adjustedLines: BulkStockAdjustmentLineResult[];
  updatedCount: number;
  skippedCount: number;
  totalPositiveVariance: number;
  totalNegativeVariance: number;
  netVariance: number;
}

/**
 * Pure service for POS 'Bulk Adjust' feature:
 * Allows managers to quickly modify stock levels for multiple items directly from the POS interface
 * when they identify a physical count discrepancy during a sale.
 */
export function applyPosBulkStockAdjustments(params: {
  products: Product[];
  adjustments: BulkStockAdjustmentInput[];
  reasonAr?: string;
}): BulkStockAdjustmentBatchResult {
  const { products, adjustments, reasonAr = 'تسوية جرد فعلي سريع من نقطة البيع (POS Bulk Adjust)' } = params;

  const adjustmentByProductId = new Map<string, BulkStockAdjustmentInput>();
  for (const adj of adjustments) {
    if (!adj || !adj.productId) continue;
    const cleanNewQty = Math.max(0, Math.round((Number(adj.newPhysicalQty) || 0) * 1000) / 1000);
    adjustmentByProductId.set(adj.productId, {
      ...adj,
      newPhysicalQty: cleanNewQty,
    });
  }

  const adjustedLines: BulkStockAdjustmentLineResult[] = [];
  let updatedCount = 0;
  let skippedCount = 0;
  let totalPositiveVariance = 0;
  let totalNegativeVariance = 0;

  const updatedProducts = products.map((product) => {
    const requested = adjustmentByProductId.get(product.id);
    if (!requested) {
      skippedCount += 1;
      return product;
    }

    const previousStockQty = Math.max(0, Math.round((Number(product.stockQty) || 0) * 1000) / 1000);
    const newPhysicalQty = requested.newPhysicalQty;
    const varianceQty = Math.round((newPhysicalQty - previousStockQty) * 1000) / 1000;

    if (varianceQty === 0) {
      skippedCount += 1;
      return product;
    }

    updatedCount += 1;
    if (varianceQty > 0) {
      totalPositiveVariance = Math.round((totalPositiveVariance + varianceQty) * 1000) / 1000;
    } else {
      totalNegativeVariance = Math.round((totalNegativeVariance + Math.abs(varianceQty)) * 1000) / 1000;
    }

    adjustedLines.push({
      productId: product.id,
      sku: product.sku,
      nameAr: product.nameAr,
      nameEn: product.name,
      previousStockQty,
      newPhysicalQty,
      varianceQty,
      reorderPoint: product.reorderPoint,
      reasonAr: requested.noteAr?.trim() || reasonAr,
    });

    return {
      ...product,
      stockQty: newPhysicalQty,
    };
  });

  return {
    updatedProducts,
    adjustedLines,
    updatedCount,
    skippedCount,
    totalPositiveVariance,
    totalNegativeVariance,
    netVariance: Math.round((totalPositiveVariance - totalNegativeVariance) * 1000) / 1000,
  };
}

export interface ThemeAwareInvoicePalette {
  themeId: string;
  primaryAccent: string;
  secondaryAccent: string;
  headerSurfaceBg: string;
  headerBorderColor: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  tableHeaderBorder: string;
  tableStripeBg: string;
  netPayableBg: string;
  netPayableText: string;
  netPayableBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  verificationPodBg: string;
  verificationPodBorder: string;
}

/**
 * Resolves a refined, theme-adaptive color palette for A4 and Thermal invoice templates.
 * Replaces harsh black (#0f172a) table headers and dark blocks with executive, soft-tinted
 * surfaces that dynamically adapt to the active global workspace theme (`uiTheme`).
 */
export function resolveThemeAwareInvoicePalette(params: {
  uiTheme?: string;
  rawPrimaryHex?: string;
  rawSecondaryHex?: string;
  templateId?: string;
}): ThemeAwareInvoicePalette {
  const {
    uiTheme = 'corporate_slate',
    rawPrimaryHex = '#0f172a',
    rawSecondaryHex = '#0284c7',
    templateId = 'a4_onyx_yemen',
  } = params;

  const normalizedPrimary = (rawPrimaryHex || '').trim().toLowerCase();
  const isDefaultDarkSlate =
    !normalizedPrimary ||
    normalizedPrimary === '#0f172a' ||
    normalizedPrimary === '#000000' ||
    normalizedPrimary === '#111827' ||
    normalizedPrimary === '#1e293b';

  // Map workspace themes to refined executive palettes when default dark hex is present
  if (uiTheme === 'haseb_royal' || templateId === 'a4_global_sap_odoo') {
    const primaryAccent = isDefaultDarkSlate ? '#3730a3' : rawPrimaryHex;
    const secondaryAccent = rawSecondaryHex || '#4f46e5';
    return {
      themeId: uiTheme,
      primaryAccent,
      secondaryAccent,
      headerSurfaceBg: '#eef2ff',
      headerBorderColor: '#c7d2fe',
      tableHeaderBg: '#e0e7ff',
      tableHeaderText: '#1e1b4b',
      tableHeaderBorder: '#4338ca',
      tableStripeBg: '#f5f7ff',
      netPayableBg: '#eef2ff',
      netPayableText: '#1e1b4b',
      netPayableBorder: '#6366f1',
      badgeBg: '#e0e7ff',
      badgeText: '#312e81',
      badgeBorder: '#a5b4fc',
      verificationPodBg: '#f8faff',
      verificationPodBorder: '#c7d2fe',
    };
  }

  if (uiTheme === 'haseb_sand') {
    const primaryAccent = isDefaultDarkSlate ? '#92400e' : rawPrimaryHex;
    const secondaryAccent = rawSecondaryHex || '#d97706';
    return {
      themeId: uiTheme,
      primaryAccent,
      secondaryAccent,
      headerSurfaceBg: '#fffbeb',
      headerBorderColor: '#fde68a',
      tableHeaderBg: '#fef3c7',
      tableHeaderText: '#78350f',
      tableHeaderBorder: '#b45309',
      tableStripeBg: '#fffdf5',
      netPayableBg: '#fef3c7',
      netPayableText: '#78350f',
      netPayableBorder: '#d97706',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
      badgeBorder: '#fcd34d',
      verificationPodBg: '#fffdf7',
      verificationPodBorder: '#fde68a',
    };
  }

  if (uiTheme === 'obsidian_dark') {
    const primaryAccent = isDefaultDarkSlate ? '#1d4ed8' : rawPrimaryHex;
    const secondaryAccent = rawSecondaryHex || '#0ea5e9';
    return {
      themeId: uiTheme,
      primaryAccent,
      secondaryAccent,
      headerSurfaceBg: '#f1f5f9',
      headerBorderColor: '#cbd5e1',
      tableHeaderBg: '#e2e8f0',
      tableHeaderText: '#0f172a',
      tableHeaderBorder: '#2563eb',
      tableStripeBg: '#f8fafc',
      netPayableBg: '#eff6ff',
      netPayableText: '#1e3a8a',
      netPayableBorder: '#3b82f6',
      badgeBg: '#e0f2fe',
      badgeText: '#0369a1',
      badgeBorder: '#7dd3fc',
      verificationPodBg: '#f8fafc',
      verificationPodBorder: '#cbd5e1',
    };
  }

  // Default for corporate_slate, swiss_light, or custom user brand colors
  const primaryAccent = isDefaultDarkSlate ? '#1d4ed8' : rawPrimaryHex;
  const secondaryAccent = rawSecondaryHex || '#0284c7';
  return {
    themeId: uiTheme,
    primaryAccent,
    secondaryAccent,
    headerSurfaceBg: '#eff6ff',
    headerBorderColor: '#bfdbfe',
    tableHeaderBg: '#dbeafe',
    tableHeaderText: '#1e3a8a',
    tableHeaderBorder: primaryAccent,
    tableStripeBg: '#f8fafc',
    netPayableBg: '#eff6ff',
    netPayableText: '#1e3a8a',
    netPayableBorder: primaryAccent,
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    badgeBorder: '#bae6fd',
    verificationPodBg: '#f8fafc',
    verificationPodBorder: '#bfdbfe',
  };
}

