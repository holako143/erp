import React, { useState } from 'react';
import {
  ShieldAlert,
  Eye,
  EyeOff,
  Globe,
  Coins,
  Lock,
  Unlock,
  Tag,
  Wifi,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  KeyRound,
  Keyboard,
  Smartphone,
  Monitor,
  Layers,
  Sparkles,
  Copy,
} from 'lucide-react';
import { useERP, ALL_ERP_MODULES } from '../context/ERPContext';
import {
  Currency,
  IndustryType,
  UIElementsVisibilityConfig,
} from '../types/erp';
import { GLOBAL_CURRENCIES_META } from '../core/systemConfigEngine';

const MODULE_LABELS: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: 'لوحة القيادة التنفيذية', en: 'Executive Dashboard' },
  pos: { ar: 'نقطة البيع السريعة (POS)', en: 'POS Terminal' },
  barcodeEngine: { ar: 'محرك الباركود والتتبع', en: 'Barcode & Traceability' },
  inventory: { ar: 'المخزون والمستودعات (WMS)', en: 'Inventory & WMS' },
  purchasing: { ar: 'المشتريات والموردون', en: 'Purchasing & Suppliers' },
  sales: { ar: 'المبيعات والضمان والمرتجعات', en: 'Sales, Returns & RMA' },
  accounting: { ar: 'المحاسبة المالية ودفتر الأستاذ', en: 'Financial Accounting' },
  businessModules: { ar: 'الأنظمة المؤسسية (HR/CRM/المشاريع)', en: 'Enterprise Modules' },
  aiInsights: { ar: 'المساعد الذكي والتحليلات', en: 'Smart Analytics' },
  saasPlatform: { ar: 'إدارة الفروع والباقات', en: 'Branches & Plans' },
  security: { ar: 'مركز الأمان والعضويات', en: 'Security & Memberships' },
  settings: { ar: 'الإعدادات وقوالب الطباعة', en: 'Settings & Templates' },
};

const UI_ELEMENT_LABELS: {
  key: keyof UIElementsVisibilityConfig;
  ar: string;
  en: string;
  descAr: string;
}[] = [
  {
    key: 'showIndustrySwitcher',
    ar: 'مبدل الأنشطة التجارية في الشريط العلوي',
    en: 'Topbar Industry Switcher',
    descAr: 'إظهار أو إخفاء قائمة تبديل النشاط التجاري أمام المستخدمين',
  },
  {
    key: 'showCurrencySwitcher',
    ar: 'مبدل العملة العالمية (YER / SAR / USD)',
    en: 'Global Currency Switcher',
    descAr: 'السماح بتغيير عملة العرض أو قفلها على العملة المعتمدة',
  },
  {
    key: 'showCouponsAndPromotions',
    ar: 'نظام كوبونات الخصم والعروض الترويجية في الكاشير والمبيعات',
    en: 'Coupons & Promotional Offers in POS/Sales',
    descAr: 'تفعيل حقل كود الخصم والعروض التلقائية في شاشة الكاشير والفواتير',
  },
  {
    key: 'showProfitMarginsInPOS',
    ar: 'إظهار هامش الربح والتكلفة في الكاشير',
    en: 'Show Profit Margin in POS',
    descAr: 'إخفاء تكلفة الشراء وهامش الربح عن الكاشير لحماية سرية الأسعار',
  },
  {
    key: 'showCostPriceInInventory',
    ar: 'إظهار أسعار التكلفة (WAC) في شاشة المخزون',
    en: 'Show Cost Price in Inventory',
    descAr: 'التحكم بظهور تكلفة الوحدة وأرصدة التقييم المخزني للموظفين',
  },
  {
    key: 'showExportImportButtons',
    ar: 'أزرار التصدير والاستيراد (Excel / CSV / JSON)',
    en: 'Export & Import Buttons',
    descAr: 'تمكين أو إخفاء أزرار تصدير واستيراد المنتجات والنسخ الاحتياطي',
  },
  {
    key: 'showLanNetworkBanner',
    ar: 'مؤشر الاتصال بالشبكة المحلية (LAN) والجوال',
    en: 'LAN & Mobile Access Indicator',
    descAr: 'عرض عنوان IP المحلي ورابط الدخول السريع من الجوال أو الكمبيوتر الفرعي',
  },
  {
    key: 'showKeyboardShortcutsBar',
    ar: 'شريط الاختصارات السريعة للوحة المفاتيح (F1 - F10)',
    en: 'Keyboard Shortcuts Bar',
    descAr: 'إظهار شريط الاختصارات السفلية لتسريع عمل الكاشير والمحاسب',
  },
  {
    key: 'showTaxAndFiscalBadges',
    ar: 'شارات الضريبة والربط الضريبي في الفواتير',
    en: 'Tax & Fiscal Compliance Badges',
    descAr: 'إظهار أو إخفاء شارات الضريبة ورموز QR الضريبية حسب الدولة',
  },
  {
    key: 'showAIInsightsWidget',
    ar: 'بطاقات التوصيات الذكية في لوحة القيادة',
    en: 'Smart Recommendations Widget',
    descAr: 'إظهار أو إخفاء تنبيهات التحليل الذكي في الشاشة الرئيسية',
  },
];

const INDUSTRIES_LIST: { id: IndustryType; ar: string; en: string }[] = [
  {
    id: 'electronics',
    ar: 'الإلكترونيات والطاقة الشمسية والبطاريات والشاشات (الافتراضي المتخصص)',
    en: 'Electronics, Solar Panels, Batteries & Displays',
  },
  { id: 'grocery', ar: 'السوبرماركت والهايبرماركت', en: 'Supermarket & Hypermarket' },
  { id: 'restaurant', ar: 'المطاعم والكافيهات', en: 'Restaurants & Cafes' },
  { id: 'pharmacy', ar: 'الصيدليات والمستلزمات الطبية', en: 'Pharmacy & Medical' },
  { id: 'general', ar: 'التجارة العامة والأزياء والعطور', en: 'General Retail & Fashion' },
  { id: 'contracting', ar: 'المقاولات والمشاريع الهندسية', en: 'Contracting & Engineering' },
];

export const MasterAdminControlView: React.FC = () => {
  const {
    language,
    currency,
    setCurrency,
    masterSystemConfig,
    updateMasterSystemConfig,
    toggleModuleVisibility,
    toggleUIElementVisibility,
    promoCoupons,
    promotionalOffers,
    addPromoCoupon,
    togglePromoCouponStatus,
    deletePromoCoupon,
    togglePromotionalOfferStatus,
    networkInfo,
    refreshNetworkInfo,
    setIsStandaloneKeygenOpen,
    setActiveIndustry,
  } = useERP();

  const isAr = language === 'ar';

  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponTitleAr, setNewCouponTitleAr] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState<number>(15);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<number>(100);
  const [newCouponMaxCap, setNewCouponMaxCap] = useState<number>(500);
  const [couponCreatedMsg, setCouponCreatedMsg] = useState<string | null>(null);
  const [copiedLanUrl, setCopiedLanUrl] = useState(false);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const labelAr = newCouponTitleAr.trim() || `كوبون خصم (${newCouponCode.toUpperCase()})`;
    const labelEn = `Promo Coupon (${newCouponCode.toUpperCase()})`;
    const minVal = Number(newCouponMinOrder) || 0;
    const created = addPromoCoupon({
      code: newCouponCode.trim().toUpperCase(),
      nameAr: labelAr,
      nameEn: labelEn,
      titleAr: labelAr,
      titleEn: labelEn,
      discountType: newCouponType,
      discountValue: Number(newCouponValue) || 10,
      minOrderAmount: minVal,
      minInvoiceAmount: minVal,
      maxDiscountAmount: newCouponMaxCap > 0 ? Number(newCouponMaxCap) : undefined,
      usageLimit: 500,
      validFrom: '2025-01-01',
      validUntil: '2028-12-31',
      applicableIndustry: 'ALL',
      isActive: true,
    });
    setNewCouponCode('');
    setNewCouponTitleAr('');
    setCouponCreatedMsg(
      isAr
        ? `تم إنشاء وتفعيل الكوبون [${created.code}] بنجاح وهو متاح فوراً في الكاشير والمبيعات!`
        : `Coupon [${created.code}] created and activated across POS & Sales!`
    );
    setTimeout(() => setCouponCreatedMsg(null), 4000);
  };

  const lanUrl =
    networkInfo?.primaryLanUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://192.168.1.100:3000');

  return (
    <div className="space-y-6 pb-10">
      {/* Sovereign Master Admin Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/60 border border-amber-500/30 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black tracking-wider">
                  {isAr ? 'عضوية إدارة النظام المخفية (ROOT SOVEREIGN)' : 'HIDDEN MASTER SYSTEM ADMIN'}
                </span>
                <span className="text-xs font-mono text-slate-400">sysadmin • Invisible Mode</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                {isAr
                  ? 'لوحة التحكم السيادية وتخصيص النظام العالمي والأقسام والعروض والشبكة'
                  : 'Master System Governance, Global Currency, Industry Lock, Coupons & LAN Hub'}
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                {isAr
                  ? 'هذه العضوية مخفية تماماً ولا تظهر لأي مستخدم في شاشة الدخول أو قائمة الموظفين، وتتحكم بإخفاء/إظهار أي عنصر أو قسم وتخصيص النشاط والعملة.'
                  : 'This hidden root account is invisible on login and user lists, controlling all modules, UI elements, single-industry lock, and global currencies.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="open-standalone-keygen-from-master-btn"
            onClick={() => setIsStandaloneKeygenOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition"
          >
            <KeyRound className="w-4 h-4" />
            {isAr
              ? 'فتح نظام التفعيل المستقل (Keygen Server)'
              : 'Launch Standalone Licensing Portal'}
          </button>
        </div>
      </div>

      {/* Section 1: Global Currency (YER / SAR / USD) & Single vs Multi-Industry Lock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Currency & Tax Configuration */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  {isAr
                    ? 'النظام العالمي والعملات (الريال اليمني / السعودي / الدولار)'
                    : 'Global System & Multi-Currency (YER / SAR / USD)'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'اختر العملة الافتراضية للنظام ونسبة الضريبة ومسميات الدفع العالمية'
                    : 'Select default currency, tax rate, and global payment terminology'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">
              {currency} ({GLOBAL_CURRENCIES_META[currency]?.symbolAr})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(['YER', 'SAR', 'USD', 'AED', 'EUR', 'EGP'] as Currency[]).map((currCode) => {
              const meta = GLOBAL_CURRENCIES_META[currCode];
              const isSelected = currency === currCode;
              return (
                <button
                  key={currCode}
                  type="button"
                  data-testid={`master-currency-btn-${currCode}`}
                  onClick={() => setCurrency(currCode)}
                  className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-900/70 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black font-mono">{currCode}</span>
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {meta.symbolAr}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold">{isAr ? meta.nameAr : meta.nameEn}</div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {isAr ? meta.countryAr : meta.countryEn}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نسبة الضريبة الافتراضية (%):' : 'Default Global Tax Rate (%):'}
              </label>
              <div className="flex gap-1.5">
                {[0, 5, 15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    data-testid={`master-tax-rate-${rate}`}
                    onClick={() => updateMasterSystemConfig({ defaultTaxRatePercent: rate })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                      masterSystemConfig.defaultTaxRatePercent === rate
                        ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {rate}% {rate === 0 ? (isAr ? '(معفى/بدون)' : '(Exempt)') : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مسمى الدفع بالبطاقة/الشبكة عالمياً:' : 'Global POS Card Label:'}
              </label>
              <input
                type="text"
                value={masterSystemConfig.cardPaymentLabelAr}
                onChange={(e) =>
                  updateMasterSystemConfig({ cardPaymentLabelAr: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Single-Industry Lock vs Multi-Industry */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                {masterSystemConfig.industryLockMode === 'SINGLE_LOCKED' ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Unlock className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  {isAr
                    ? 'تخصيص النظام لنشاط واحد مقفل أو متعدد الأنشطة'
                    : 'Single-Industry Lock vs Multi-Industry Mode'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'يمكن للإدارة قفل البرنامج بالكامل على نشاط واحد فقط أو فتح تعدد الأنشطة'
                    : 'Lock the entire ERP to one dedicated industry or allow multi-sector switching'}
                </p>
              </div>
            </div>
            <span
              data-testid="industry-lock-status-badge"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                masterSystemConfig.industryLockMode === 'SINGLE_LOCKED'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
              }`}
            >
              {masterSystemConfig.industryLockMode === 'SINGLE_LOCKED'
                ? isAr
                  ? 'مخصص لنشاط واحد (مقفل)'
                  : 'SINGLE INDUSTRY LOCKED'
                : isAr
                ? 'متعدد الأنشطة (مفتوح)'
                : 'MULTI-INDUSTRY'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="lock-single-industry-btn"
              onClick={() =>
                updateMasterSystemConfig({
                  industryLockMode: 'SINGLE_LOCKED',
                  uiElementsVisibility: {
                    ...masterSystemConfig.uiElementsVisibility,
                    showIndustrySwitcher: false,
                  },
                })
              }
              className={`p-3 rounded-xl border text-right transition flex items-center gap-3 ${
                masterSystemConfig.industryLockMode === 'SINGLE_LOCKED'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-xs font-black">
                  {isAr ? 'قفل على نشاط واحد فقط' : 'Lock to Single Industry'}
                </div>
                <div className="text-[10px] opacity-80">
                  {isAr
                    ? 'إخفاء مبدل الأنشطة وتخصيص النظام لنشاط العميل فقط'
                    : 'Hide switcher & dedicate ERP to one sector'}
                </div>
              </div>
            </button>

            <button
              type="button"
              data-testid="unlock-multi-industry-btn"
              onClick={() =>
                updateMasterSystemConfig({
                  industryLockMode: 'MULTI_SELECTABLE',
                  uiElementsVisibility: {
                    ...masterSystemConfig.uiElementsVisibility,
                    showIndustrySwitcher: true,
                  },
                })
              }
              className={`p-3 rounded-xl border text-right transition flex items-center gap-3 ${
                masterSystemConfig.industryLockMode === 'MULTI_SELECTABLE'
                  ? 'bg-sky-600 text-white border-sky-500 font-black shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Layers className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-xs font-black">
                  {isAr ? 'تفعيل تعدد الأنشطة' : 'Enable Multi-Industry'}
                </div>
                <div className="text-[10px] opacity-80">
                  {isAr
                    ? 'السماح بالتبديل بين الأنشطة التجارية المختلفة'
                    : 'Allow switching across commercial sectors'}
                </div>
              </div>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr
                ? 'النشاط المعتمد للنظام (الافتراضي: الإلكترونيات والطاقة الشمسية والبطاريات):'
                : 'Dedicated / Default Operational Industry:'}
            </label>
            <select
              data-testid="master-locked-industry-select"
              value={masterSystemConfig.lockedIndustry}
              onChange={(e) => {
                const selectedInd = e.target.value as IndustryType;
                updateMasterSystemConfig({ lockedIndustry: selectedInd });
                setActiveIndustry(selectedInd);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            >
              {INDUSTRIES_LIST.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {isAr ? ind.ar : ind.en}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Hide / Show System Modules & Granular UI Elements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hide / Show ERP Modules */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  {isAr
                    ? 'إخفاء وإظهار الأقسام الرئيسية للنظام (Modules Visibility)'
                    : 'Show / Hide System Modules Globally'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'أي قسم يتم إيقافه يختفي فوراً من القائمة الجانبية لجميع المستخدمين'
                    : 'Disabled modules are immediately hidden from non-master users'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_ERP_MODULES.map((modId) => {
              const isVisible = masterSystemConfig.visibleModules[modId] !== false;
              const label = MODULE_LABELS[modId] || { ar: modId, en: modId };
              return (
                <div
                  key={modId}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    isVisible
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      : 'bg-rose-500/5 border-rose-500/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isVisible ? (
                      <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {isAr ? label.ar : label.en}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{modId}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`toggle-module-vis-${modId}`}
                    onClick={() => toggleModuleVisibility(modId)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      isVisible
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-rose-500 text-white hover:bg-rose-600'
                    }`}
                  >
                    {isVisible ? (isAr ? 'ظاهر (مفعل)' : 'Visible') : isAr ? 'مخفي (موقوف)' : 'Hidden'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hide / Show Granular UI Elements */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  {isAr
                    ? 'التحكم الدقيق بإظهار وإخفاء عناصر الواجهات (UI Elements)'
                    : 'Granular UI Elements Visibility Control'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'تخصيص الأدوات والأزرار الفرعية داخل شاشات الكاشير والمخزون والشريط العلوي'
                    : 'Customize internal buttons, cost visibility, coupons, and topbar widgets'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {UI_ELEMENT_LABELS.map((item) => {
              const enabled = masterSystemConfig.uiElementsVisibility[item.key];
              return (
                <div
                  key={item.key}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {isAr ? item.ar : item.en}
                    </div>
                    <div className="text-[11px] text-slate-500">{item.descAr}</div>
                  </div>
                  <button
                    type="button"
                    data-testid={`toggle-ui-el-${item.key}`}
                    onClick={() => toggleUIElementVisibility(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                      enabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {enabled ? (isAr ? 'مفعل (ظاهر)' : 'Shown') : isAr ? 'مخفي' : 'Hidden'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Discount Coupons & Promotional Offers Engine */}
      <div className="erp-card p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {isAr
                  ? 'إدارة كوبونات الخصم والعروض الترويجية (Coupons & Promotions Engine)'
                  : 'Discount Coupons & Promotional Campaigns Engine'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isAr
                  ? 'أنشئ أكواد خصم بنسبة مئوية أو مبلغ ثابت مع حد أدنى للفاتورة وتاريخ صلاحية، وتعمل فوراً في شاشة الكاشير POS والمبيعات'
                  : 'Create percentage or fixed-amount promo codes linked directly to POS & Sales checkout'}
              </p>
            </div>
          </div>
        </div>

        {/* Create New Coupon Form */}
        <form
          onSubmit={handleCreateCoupon}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'كود الكوبون (Code):' : 'Coupon Code:'}
            </label>
            <input
              type="text"
              data-testid="new-coupon-code-input"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              placeholder="SAVE20"
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'اسم العرض / الكوبون:' : 'Campaign Title:'}
            </label>
            <input
              type="text"
              data-testid="new-coupon-title-input"
              value={newCouponTitleAr}
              onChange={(e) => setNewCouponTitleAr(e.target.value)}
              placeholder={isAr ? 'خصم الطاقة الشمسية الخاص' : 'Solar Promo'}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'نوع الخصم:' : 'Discount Type:'}
            </label>
            <select
              value={newCouponType}
              onChange={(e) =>
                setNewCouponType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')
              }
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold"
            >
              <option value="PERCENTAGE">{isAr ? 'نسبة مئوية (%)' : 'Percentage (%)'}</option>
              <option value="FIXED_AMOUNT">
                {isAr ? `مبلغ ثابت (${currency})` : `Fixed Amount (${currency})`}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'قيمة الخصم:' : 'Discount Value:'}
            </label>
            <input
              type="number"
              data-testid="new-coupon-value-input"
              min={1}
              value={newCouponValue}
              onChange={(e) => setNewCouponValue(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'الحد الأدنى للفاتورة:' : 'Min Invoice Subtotal:'}
            </label>
            <input
              type="number"
              min={0}
              value={newCouponMinOrder}
              onChange={(e) => setNewCouponMinOrder(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              data-testid="create-coupon-submit-btn"
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              {isAr ? 'إضافة الكوبون' : 'Add Coupon'}
            </button>
          </div>
        </form>

        {couponCreatedMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{couponCreatedMsg}</span>
          </div>
        )}

        {/* Active Coupons Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {promoCoupons.map((cpn) => (
            <div
              key={cpn.id}
              data-testid={`coupon-card-${cpn.code}`}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                cpn.isActive
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-100/60 dark:bg-slate-950/50 border-slate-200/50 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-xs font-black">
                    {cpn.code}
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {cpn.discountType === 'PERCENTAGE'
                      ? `${cpn.discountValue}% OFF`
                      : `${cpn.discountValue} ${currency}`}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-2">
                  {isAr ? cpn.titleAr || cpn.nameAr : cpn.titleEn || cpn.nameEn}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5 font-mono">
                  <div>
                    {isAr ? 'الحد الأدنى:' : 'Min:'}{' '}
                    {(cpn.minInvoiceAmount ?? cpn.minOrderAmount ?? 0).toLocaleString()}{' '}
                    {currency}
                  </div>
                  <div>
                    {isAr ? 'الاستخدام:' : 'Used:'} {cpn.usedCount} / {cpn.usageLimit}
                  </div>
                  <div>
                    {isAr ? 'الصلاحية:' : 'Expires:'} {cpn.validUntil}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => togglePromoCouponStatus(cpn.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    cpn.isActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  {cpn.isActive ? (isAr ? 'نشط' : 'Active') : isAr ? 'موقوف' : 'Paused'}
                </button>
                <button
                  type="button"
                  onClick={() => deletePromoCoupon(cpn.id)}
                  className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Automatic Promotional Offers */}
        <div className="pt-2">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {isAr
              ? 'العروض الترويجية التلقائية للمتجر والمنظومات (Promotional Campaigns):'
              : 'Automatic Promotional Campaigns:'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {promotionalOffers.map((ofr) => (
              <div
                key={ofr.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    {ofr.badgeTextAr}
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                    {isAr ? ofr.nameAr || ofr.titleAr : ofr.nameEn || ofr.titleEn}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {isAr ? 'الحد الأدنى للكمية:' : 'Min Qty:'} {ofr.minQty}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePromotionalOfferStatus(ofr.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                    ofr.isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {ofr.isActive ? (isAr ? 'مفعل' : 'Active') : isAr ? 'موقوف' : 'Off'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Local Area Network (LAN) Multi-Device Hub & Keyboard Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  {isAr
                    ? 'العمل عبر الشبكة الداخلية (LAN) والدخول من الجوال والكمبيوتر'
                    : 'Local Area Network (LAN) Multi-Device & Mobile Access'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'مزامنة لحظية فائقة السرعة (RAM + Disk) لجميع أجهزة الجوال والتابلت والكمبيوترات على نفس الشبكة'
                    : 'Real-time sub-millisecond RAM sync across PCs, tablets, and phones on LAN'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refreshNetworkInfo()}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold"
            >
              {isAr ? 'تحديث الشبكة' : 'Refresh LAN'}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 text-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                {isAr
                  ? 'رابط الدخول المباشر من الجوال أو الكمبيوتر عبر الشبكة:'
                  : 'Direct LAN Access URL (Mobile / PC):'}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                0.3ms RAM SYNC
              </span>
            </div>

            <div className="flex items-center gap-2">
              <code
                data-testid="lan-primary-url"
                className="flex-1 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 select-all"
              >
                {lanUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(lanUrl).catch(() => {});
                  setCopiedLanUrl(true);
                  setTimeout(() => setCopiedLanUrl(false), 2000);
                }}
                className="px-3 py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedLanUrl ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ الرابط' : 'Copy'}
              </button>
            </div>

            {Array.isArray(networkInfo?.lanAddresses) && networkInfo.lanAddresses.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-slate-300">
                {networkInfo.lanAddresses.map((addr, idx) => (
                  <div key={idx} className="px-2.5 py-1.5 rounded bg-slate-900/90">
                    LAN #{idx + 1}: <span className="text-sky-300">http://{addr}:{networkInfo.port}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Keyboard Shortcuts */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {isAr
                  ? 'الاختصارات السريعة للوحة المفاتيح (Fast Keyboard Shortcuts)'
                  : 'Global High-Speed Keyboard Shortcuts'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isAr
                  ? 'تعمل في كافة الشاشات لتسريع عمليات البيع والجرد والمحاسبة'
                  : 'Active across the entire system for rapid operation'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { key: 'F1', ar: 'لوحة القيادة', en: 'Dashboard' },
              { key: 'F2', ar: 'نقطة البيع POS', en: 'POS Register' },
              { key: 'F3', ar: 'المخزون والمستودع', en: 'Inventory WMS' },
              { key: 'F4', ar: 'المبيعات والضمان', en: 'Sales & RMA' },
              { key: 'F6', ar: 'المشتريات والموردون', en: 'Purchasing' },
              { key: 'F7', ar: 'المحاسبة والميزان', en: 'Accounting' },
              { key: 'Ctrl + K', ar: 'البحث الفوري الشامل', en: 'Command Palette' },
              { key: 'Ctrl+Shift+M', ar: 'الإدارة العليا المخفية', en: 'Hidden Master Admin' },
              { key: 'Ctrl+Shift+L', ar: 'بوابة التفعيل المستقلة', en: 'Standalone Keygen' },
            ].map((sc) => (
              <div
                key={sc.key}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? sc.ar : sc.en}
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[10px] font-bold">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
