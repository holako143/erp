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

export const ELECTRONICS_SOLAR_CORE_MODULES = ['pos', 'inventory', 'sales', 'accounting'] as const;

export const EXCLUDED_SECTOR_MODULES = [
  'projects',
  'fleet',
  'manufacturing',
  'businessModules',
] as const;

export const DEFAULT_MASTER_SYSTEM_CONFIG: MasterSystemConfig = {
  industryLockMode: 'SINGLE_LOCKED',
  lockedIndustry: 'electronics',
  sectorMode: 'SOLAR_ELECTRONICS_CORE',
  sectorModeEnabled: true,
  globalCountryMode: 'GLOBAL',
  globalDefaultCurrency: 'SAR',
  defaultTaxRatePercent: 15,
  enableTaxCalculation: true,
  cardPaymentLabelAr: 'بطاقة بنكية / دفع إلكتروني (POS Card)',
  cashPaymentLabelAr: 'نقدي فوري (Cash)',
  visibleModules: {
    dashboard: false,
    pos: true,
    barcodeEngine: false,
    inventory: true,
    purchasing: false,
    sales: true,
    accounting: true,
    businessModules: false,
    projects: false,
    fleet: false,
    manufacturing: false,
    aiInsights: false,
    saasPlatform: false,
    security: false,
    settings: false,
    communications: false,
  },
  uiElementsVisibility: {
    showIndustrySwitcher: false,
    showCurrencySwitcher: true,
    showCouponsAndPromotions: true,
    showProfitMarginsInPOS: true,
    showCostPriceInInventory: true,
    showExportImportButtons: true,
    showLanNetworkBanner: true,
    showKeyboardShortcutsBar: true,
    showTaxAndFiscalBadges: true,
    showAIInsightsWidget: false,
    showSolarSizingEngine: true,
    showWarrantyAndRMA: true,
    showSmartLabelOCR: true,
    showScaleBarcodeTools: false,
    showLandedCostCalculator: true,
    showMultiCurrencyEngine: true,
    showManufacturingAndProjects: false,
    showAIInsights: false,
    showTaxAndComplianceFields: true,
  },
  keyboardShortcutsEnabled: true,
  lanSyncEnabled: true,
  updatedAt: '2026-11-10T00:00:00.000Z',
};

/**
 * Applies the 'Sector Mode' configuration for Electronics & Solar Energy.
 * When enabled ('SOLAR_ELECTRONICS_CORE'), filters out 'projects', 'fleet', 'manufacturing',
 * and 'businessModules', ensuring only POS, Inventory, Sales, and Accounting remain visible.
 */
export function applySectorModePreset(
  config: MasterSystemConfig,
  enableSectorMode: boolean
): MasterSystemConfig {
  if (enableSectorMode) {
    return {
      ...config,
      industryLockMode: 'SINGLE_LOCKED',
      lockedIndustry: 'electronics',
      sectorMode: 'SOLAR_ELECTRONICS_CORE',
      sectorModeEnabled: true,
      visibleModules: {
        ...config.visibleModules,
        dashboard: false,
        pos: true,
        barcodeEngine: false,
        inventory: true,
        purchasing: false,
        sales: true,
        accounting: true,
        businessModules: false,
        projects: false,
        fleet: false,
        manufacturing: false,
        aiInsights: false,
        saasPlatform: false,
        security: false,
        settings: false,
        communications: false,
      },
      uiElementsVisibility: {
        ...config.uiElementsVisibility,
        showIndustrySwitcher: false,
        showManufacturingAndProjects: false,
        showScaleBarcodeTools: false,
        showAIInsightsWidget: false,
        showAIInsights: false,
        showSolarSizingEngine: true,
        showWarrantyAndRMA: true,
        showSmartLabelOCR: true,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...config,
    sectorMode: 'FULL_SUITE',
    sectorModeEnabled: false,
    visibleModules: {
      ...config.visibleModules,
      dashboard: true,
      pos: true,
      barcodeEngine: true,
      inventory: true,
      purchasing: true,
      sales: true,
      accounting: true,
      businessModules: false,
      projects: false,
      fleet: false,
      manufacturing: false,
      aiInsights: false,
      saasPlatform: false,
      security: true,
      settings: true,
      communications: true,
    },
    uiElementsVisibility: {
      ...config.uiElementsVisibility,
      showManufacturingAndProjects: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Evaluates whether a module is visible and accessible given Master System Config.
 * In Sector Mode ('SOLAR_ELECTRONICS_CORE'), filters out 'projects', 'fleet', 'manufacturing', and 'businessModules',
 * ensuring only POS, Inventory, Sales, and Accounting links remain in main navigation.
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
  if (!config) {
    return true;
  }
  // Always filter out 'projects', 'fleet', 'manufacturing', and 'businessModules' when Sector Mode or Electronics lock is active
  if ((EXCLUDED_SECTOR_MODULES as readonly string[]).includes(moduleId)) {
    if (
      config.sectorModeEnabled ||
      config.sectorMode === 'SOLAR_ELECTRONICS_CORE' ||
      config.lockedIndustry === 'electronics' ||
      config.uiElementsVisibility?.showManufacturingAndProjects === false
    ) {
      return false;
    }
  }
  if (
    config.sectorModeEnabled ||
    config.sectorMode === 'SOLAR_ELECTRONICS_CORE'
  ) {
    if (!(ELECTRONICS_SOLAR_CORE_MODULES as readonly string[]).includes(moduleId)) {
      return false;
    }
    if (config.visibleModules && typeof config.visibleModules[moduleId] === 'boolean') {
      return config.visibleModules[moduleId];
    }
    return true;
  }
  if (!config.visibleModules) {
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
  if (config?.sectorModeEnabled || config?.sectorMode === 'SOLAR_ELECTRONICS_CORE') {
    return 'electronics';
  }
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
