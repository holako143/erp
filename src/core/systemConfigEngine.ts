/**
 * RLM ERP - Master System Configuration, Global Currencies, and Visibility Engine
 * Controls hidden Master Admin visibility switches, Single-Industry vs Multi-Industry mode,
 * and Global Currency (YER / SAR / USD) formatting & conversion.
 */

import { Currency, IndustryType, Language, MasterSystemConfig } from '../types/erp';

export interface GlobalCurrencyMeta {
  code: Currency;
  symbolAr: string;
  symbolEn: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  defaultExchangeRateToUSD: number;
}

export const GLOBAL_CURRENCIES_META: Record<Currency, GlobalCurrencyMeta> = {
  YER: {
    code: 'YER',
    symbolAr: 'ر.ي',
    symbolEn: 'YER',
    nameAr: 'الريال اليمني (Yemeni Rial)',
    nameEn: 'Yemeni Rial (YER)',
    countryAr: 'اليمن',
    countryEn: 'Yemen',
    defaultExchangeRateToUSD: 535,
  },
  SAR: {
    code: 'SAR',
    symbolAr: 'ر.س',
    symbolEn: 'SAR',
    nameAr: 'الريال السعودي (Saudi Riyal)',
    nameEn: 'Saudi Riyal (SAR)',
    countryAr: 'السعودية',
    countryEn: 'Saudi Arabia',
    defaultExchangeRateToUSD: 3.75,
  },
  USD: {
    code: 'USD',
    symbolAr: '$',
    symbolEn: 'USD',
    nameAr: 'الدولار الأمريكي (US Dollar)',
    nameEn: 'US Dollar (USD)',
    countryAr: 'عالمي / دولي',
    countryEn: 'Global / International',
    defaultExchangeRateToUSD: 1.0,
  },
  EUR: {
    code: 'EUR',
    symbolAr: '€',
    symbolEn: 'EUR',
    nameAr: 'اليورو الأوروبي (Euro)',
    nameEn: 'Euro (EUR)',
    countryAr: 'الاتحاد الأوروبي',
    countryEn: 'European Union',
    defaultExchangeRateToUSD: 0.92,
  },
  AED: {
    code: 'AED',
    symbolAr: 'د.إ',
    symbolEn: 'AED',
    nameAr: 'الدرهم الإماراتي (UAE Dirham)',
    nameEn: 'UAE Dirham (AED)',
    countryAr: 'الإمارات',
    countryEn: 'UAE',
    defaultExchangeRateToUSD: 3.67,
  },
  EGP: {
    code: 'EGP',
    symbolAr: 'ج.م',
    symbolEn: 'EGP',
    nameAr: 'الجنيه المصري (Egyptian Pound)',
    nameEn: 'Egyptian Pound (EGP)',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    defaultExchangeRateToUSD: 48.5,
  },
};

export const DEFAULT_MASTER_SYSTEM_CONFIG: MasterSystemConfig = {
  industryLockMode: 'MULTI_SELECTABLE',
  lockedIndustry: 'electronics',
  globalCountryMode: 'GLOBAL',
  globalDefaultCurrency: 'SAR',
  defaultTaxRatePercent: 15,
  enableTaxCalculation: true,
  cardPaymentLabelAr: 'بطاقة بنكية / دفع إلكتروني (POS Card)',
  cashPaymentLabelAr: 'نقدي فوري (Cash)',
  visibleModules: {
    dashboard: true,
    pos: true,
    barcodeEngine: true,
    inventory: true,
    purchasing: true,
    sales: true,
    accounting: true,
    businessModules: true,
    aiInsights: true,
    saasPlatform: true,
    security: true,
    settings: true,
    communications: true,
  },
  uiElementsVisibility: {
    showIndustrySwitcher: true,
    showCurrencySwitcher: true,
    showCouponsAndPromotions: true,
    showProfitMarginsInPOS: true,
    showCostPriceInInventory: true,
    showExportImportButtons: true,
    showLanNetworkBanner: true,
    showKeyboardShortcutsBar: true,
    showTaxAndFiscalBadges: true,
    showAIInsightsWidget: true,
    showSolarSizingEngine: true,
    showWarrantyAndRMA: true,
    showSmartLabelOCR: true,
    showScaleBarcodeTools: true,
    showLandedCostCalculator: true,
    showMultiCurrencyEngine: true,
    showManufacturingAndProjects: true,
    showAIInsights: true,
    showTaxAndComplianceFields: true,
  },
  keyboardShortcutsEnabled: true,
  lanSyncEnabled: true,
  updatedAt: '2026-11-03T00:00:00.000Z',
};

/**
 * Evaluates whether a module is visible and accessible given Master System Config
 * Hidden Master Admin always retains access to 'masterAdmin' and all modules when needed.
 */
export function isModuleVisibleUnderMasterConfig(
  moduleId: string,
  config: MasterSystemConfig,
  isHiddenMasterAdmin = false
): boolean {
  if (moduleId === 'masterAdmin') {
    return Boolean(isHiddenMasterAdmin);
  }
  if (!config || !config.visibleModules) {
    return true;
  }
  const flag = config.visibleModules[moduleId];
  return flag !== false;
}

/**
 * Resolves the effective industry mode based on whether the Master Admin locked the system to a single industry
 */
export function resolveEffectiveIndustryMode(
  currentIndustry: IndustryType,
  config: MasterSystemConfig
): IndustryType {
  if (config?.industryLockMode === 'SINGLE_LOCKED' && config.lockedIndustry) {
    return config.lockedIndustry;
  }
  return currentIndustry;
}

/**
 * Formats an amount with its global currency symbol (YER, SAR, USD, etc.)
 */
export function formatCurrencyAmount(
  amount: number,
  currency: Currency,
  language: Language = 'ar'
): string {
  const safeVal = Number(amount) || 0;
  const meta = GLOBAL_CURRENCIES_META[currency] || GLOBAL_CURRENCIES_META.SAR;
  const formatted = safeVal.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return language === 'ar' ? `${formatted} ${meta.symbolAr}` : `${formatted} ${meta.symbolEn}`;
}
