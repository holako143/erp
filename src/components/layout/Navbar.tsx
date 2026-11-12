import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Globe,
  Search,
  PanelLeft,
  LogOut,
  Bell,
  MessageSquare,
  Settings as SettingsIcon,
  MonitorSmartphone,
  User as UserAvatarIcon,
  ShieldCheck,
  ChevronDown,
  Palette,
  Check,
  Type,
  Coins,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { SystemNotificationCenterModal } from '../common/SystemNotificationCenterModal';
import { generateSystemNotifications } from '../../core/notificationsEngine';
import { HasebBrandLogo } from '../common/HasebBrandLogo';
import {
  HASEB_SCALE_PRESETS,
  DEFAULT_FONT_SCALE,
  DEFAULT_WINDOW_SCALE,
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
  WINDOW_SCALE_MIN,
  WINDOW_SCALE_MAX,
  clampFontScale,
  clampWindowScale,
  stepFontScale,
  stepWindowScale,
  computeHarmonizedScaleCssVars,
} from '../../core/uiScaleEngine';

export const HASEB_THEMES_LIST = [
  {
    id: 'corporate_slate' as const,
    nameAr: 'ياقوت حاسب الملكي (افتراضي مريح)',
    nameEn: 'Haseb Royal Sapphire',
    descAr: 'تدرجات الياقوت الأزرق الهادئ مع خلفية ثلجية مريحة للعين',
    swatchBg: 'bg-[#2563eb]',
    sidebarHex: '#f5f8fc',
    canvasHex: '#eef3f9',
    accentHex: '#2563eb',
  },
  {
    id: 'haseb_royal' as const,
    nameAr: 'نيلي حاسب الفاخر (أزرق نيلي مؤسسي)',
    nameEn: 'Haseb Imperial Indigo',
    descAr: 'هوية مصرفية فاخرة بتدرجات النيلي الملكي والأسطح اللؤلؤية',
    swatchBg: 'bg-[#4338ca]',
    sidebarHex: '#0e1329',
    canvasHex: '#f1f2f9',
    accentHex: '#4338ca',
  },
  {
    id: 'swiss_light' as const,
    nameAr: 'تيتانيوم حاسب الهادئ (سماوي نهاري)',
    nameEn: 'Haseb Nordic Titanium',
    descAr: 'سطوع نهاري ناعم بدون توهج بلمسات الأزرق المحيطي الهادئ',
    swatchBg: 'bg-[#0284c7]',
    sidebarHex: '#ffffff',
    canvasHex: '#f2f5f8',
    accentHex: '#0284c7',
  },
  {
    id: 'haseb_sand' as const,
    nameAr: 'كهرمان حاسب الدافئ (حماية العين)',
    nameEn: 'Haseb Warm Amber Paper',
    descAr: 'وضع الورق الكريمي الدافئ والبرونز بدون أشعة زرقاء لورديات الكاشير',
    swatchBg: 'bg-[#b45309]',
    sidebarHex: '#f4efe4',
    canvasHex: '#f3ede2',
    accentHex: '#b45309',
  },
  {
    id: 'obsidian_dark' as const,
    nameAr: 'ليل حاسب الكربوني (الوضع الليلي الأزرق)',
    nameEn: 'Haseb Carbon Sapphire Dark',
    descAr: 'وضع داكن كربوني مريح للعين بلمسات الياقوت السماوي الهادئ',
    swatchBg: 'bg-[#1e3a8a]',
    sidebarHex: '#080c14',
    canvasHex: '#111827',
    accentHex: '#3b82f6',
  },
];

export const HASEB_FONTS_LIST = [
  {
    id: 'cairo' as const,
    nameAr: 'خط كايرو المؤسسي (Cairo Pro)',
    descAr: 'واضح وعريض — مثالي للمحاسبة ونقاط البيع',
  },
  {
    id: 'readex' as const,
    nameAr: 'خط ريدكس الهندسي (Readex Pro)',
    descAr: 'هندسي فائق الحداثة والوضوح الرقمي',
  },
  {
    id: 'tajawal' as const,
    nameAr: 'خط تجوال الانسيابي (Tajawal)',
    descAr: 'ناعم ومريح جداً للقراءة الطويلة',
  },
  {
    id: 'ibm_plex' as const,
    nameAr: 'خط بليكس المصرفي (IBM Plex)',
    descAr: 'طابع تقني ومصرفي رسمي دقيق',
  },
];

export type HasebFontId = (typeof HASEB_FONTS_LIST)[number]['id'];

export const Navbar: React.FC = () => {
  const {
    isAuthenticated,
    language,
    setLanguage,
    currency,
    setCurrency,
    t,
    setIsCommandPaletteOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    currentAccount,
    setActiveTab,
    logout,
    products,
    warrantyTickets,
    customers,
    salesInvoices,
    holdBills,
    currentShift,
    interBranchTransfers,
    uiTheme,
    setUiTheme,
    masterSystemConfig,
    whatsappAccounts,
    lastAutoSavedAt,
    setIsStandaloneKeygenOpen,
    openLanPortal,
  } = useERP();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [uiFont, setUiFont] = useState<HasebFontId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('haseb_ui_font') as HasebFontId | null;
      if (saved && ['cairo', 'readex', 'tajawal', 'ibm_plex'].includes(saved)) {
        return saved;
      }
    }
    return 'cairo';
  });

  const [fontScalePercent, setFontScalePercent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('haseb_font_scale_percent'));
      if (Number.isFinite(saved) && saved >= FONT_SCALE_MIN && saved <= FONT_SCALE_MAX) {
        return clampFontScale(saved);
      }
    }
    return DEFAULT_FONT_SCALE;
  });

  const [windowScalePercent, setWindowScalePercent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('haseb_window_scale_percent'));
      if (Number.isFinite(saved) && saved >= WINDOW_SCALE_MIN && saved <= WINDOW_SCALE_MAX) {
        return clampWindowScale(saved);
      }
    }
    return DEFAULT_WINDOW_SCALE;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.erpFont = uiFont;
      try {
        localStorage.setItem('haseb_ui_font', uiFont);
      } catch {
        // ignore storage errors
      }
    }
  }, [uiFont]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const vars = computeHarmonizedScaleCssVars(fontScalePercent, windowScalePercent);
      const root = document.documentElement;
      root.style.setProperty('--erp-font-scale', String(vars.fontScaleRatio));
      root.style.setProperty('--erp-window-scale', String(vars.windowScaleRatio));
      root.style.setProperty('--erp-root-font-px', `${vars.rootFontSizePx}px`);
      root.style.setProperty('--erp-spacing-unit', `${vars.spacingUnitRem}rem`);
      root.style.setProperty('--erp-sidebar-width', `${vars.sidebarWidthPx}px`);
      root.style.setProperty('--erp-navbar-height', `${vars.navbarHeightPx}px`);
      root.dataset.erpFontScale = String(fontScalePercent);
      root.dataset.erpWindowScale = String(windowScalePercent);
      try {
        localStorage.setItem('haseb_font_scale_percent', String(fontScalePercent));
        localStorage.setItem('haseb_window_scale_percent', String(windowScalePercent));
      } catch {
        // ignore storage errors
      }
    }
  }, [fontScalePercent, windowScalePercent]);

  const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isAuthenticated) {
    return null;
  }

  const handleSettingsRapidClick = () => {
    const now = Date.now();
    const recentClicks = [...clickTimestamps.filter((ts) => now - ts < 2500), now];
    setClickTimestamps(recentClicks);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (recentClicks.length >= 7) {
      setClickTimestamps([]);
      setIsProfileMenuOpen(false);
      setIsStandaloneKeygenOpen(true);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setIsProfileMenuOpen(false);
        setActiveTab('settings');
      }, 300);
    }
  };

  const systemNotifications = useMemo(() => {
    return generateSystemNotifications({
      products,
      customers: customers || [],
      salesInvoices: salesInvoices || [],
      warrantyTickets: warrantyTickets || [],
      holdBills: holdBills || [],
      currentShift: currentShift || ({ expectedCash: 0 } as any),
      currency,
      lastBackupTimestamp: localStorage.getItem('rlm_last_backup_timestamp'),
      pendingTransfersCount:
        interBranchTransfers?.filter(
          (t) => t.status === 'PENDING_APPROVAL' || t.status === 'IN_TRANSIT'
        ).length || 0,
    });
  }, [
    products,
    customers,
    salesInvoices,
    warrantyTickets,
    holdBills,
    currentShift,
    currency,
    interBranchTransfers,
  ]);

  const totalAlertsCount = systemNotifications.length;
  const connectedWaCount = whatsappAccounts.filter((a) => a.session.status === 'CONNECTED').length;

  const isDark = uiTheme === 'obsidian_dark';
  const isRoyal = uiTheme === 'haseb_royal';
  const isSand = uiTheme === 'haseb_sand';
  const isSwiss = uiTheme === 'swiss_light';

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-200 ${
        isDark
          ? 'bg-[#0B111E] border-slate-800/90 text-slate-100'
          : isSand
          ? 'bg-[#fbf8f2] border-[#dfd3be] text-stone-900'
          : isRoyal
          ? 'bg-white border-[#d8dcf0] text-slate-900'
          : isSwiss
          ? 'bg-white border-[#dae2ec] text-slate-900'
          : 'bg-white border-[#d5e0ee] text-slate-900'
      }`}
    >
      <div className="px-3 sm:px-5 h-14 flex items-center justify-between gap-4 max-w-full">
        {/* Zone 1 (Start): Minimalist Sidebar Toggle & Bespoke "حاسب" Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={
              isSidebarCollapsed
                ? language === 'ar'
                  ? 'تمديد القائمة الجانبية'
                  : 'Expand Sidebar'
                : language === 'ar'
                ? 'طي القائمة الجانبية'
                : 'Collapse Sidebar'
            }
            className={`hidden lg:flex items-center justify-center w-9 h-9 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : isSand
                ? 'bg-[#f3ede2] border-[#dfd3be] text-stone-700 hover:bg-[#eae1d0]'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div
            data-testid="haseb-brand-identity"
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <HasebBrandLogo size="md" theme={uiTheme} />
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="font-black text-base tracking-tight">
                  {language === 'ar' ? 'حاسب' : 'Haseb'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  · {language === 'ar' ? 'النظام المحاسبي والمؤسسي' : 'Enterprise ERP'}
                </span>
              </div>
              <span
                className="text-[11px] font-mono font-semibold text-blue-700 dark:text-blue-400"
                title={`قاعدة بيانات حاسب الفورية — آخر حفظ لحظي: ${lastAutoSavedAt}`}
              >
                حفظ تلقائي لحظي ✓
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2 (Center): Interactive Command & Global Search Bar (Ctrl+K) */}
        <div className="flex-1 max-w-lg mx-2">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className={`w-full h-9.5 flex items-center justify-between px-3.5 rounded-xl text-xs border transition cursor-pointer group ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300'
                : isSand
                ? 'bg-[#f3ede2] hover:bg-[#fbf8f2] border-[#dfd3be] text-stone-700'
                : 'bg-slate-50/90 hover:bg-white border-slate-200 hover:border-blue-400 text-slate-600 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 shrink-0 text-blue-600 group-hover:scale-105 transition-transform" />
              <span className="truncate whitespace-nowrap text-xs font-semibold">
                {language === 'ar'
                  ? 'بحث سريع في حاسب: صنف، سيريال، باركود، أو فاتورة...'
                  : 'Quick search in Haseb: product, serial, barcode, invoice...'}
              </span>
            </div>
            <kbd
              className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ms-2 border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Zone 3 (End): Streamlined Operational Bar + Unified Corner Membership Hub */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {/* 1. Windows Desktop App & Local Network (LAN) Multi-Device Hub Button */}
          <button
            type="button"
            data-testid="navbar-lan-portal-btn"
            onClick={openLanPortal}
            title={
              language === 'ar'
                ? 'تشغيل كبرنامج سطح مكتب للويندوز وربط أجهزة الشبكة (كمبيوتر / جوال / تابلت)'
                : 'Windows Desktop App & Multi-Device LAN Hub'
            }
            className={`hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white'
                : isSand
                ? 'bg-[#f3ede2] border-[#d5c6ad] text-stone-800 hover:bg-[#eae0cf]'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950 shadow-2xs'
            }`}
          >
            <MonitorSmartphone className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="hidden lg:inline">
              {language === 'ar' ? 'سطح المكتب والشبكة' : 'Desktop & LAN'}
            </span>
          </button>

          {/* 2. Unified Multi-Account WhatsApp & Instant Quick-Send Station Button */}
          <button
            type="button"
            data-testid="navbar-whatsapp-station-btn"
            onClick={() => setActiveTab('communications')}
            title={
              language === 'ar'
                ? 'مركز واتساب المتعدد والإرسال الفوري الموحد'
                : 'Unified Multi-Account WhatsApp & Quick-Send Hub'
            }
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-blue-950/80 hover:bg-blue-900/90 border-blue-700/80 text-blue-200'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {language === 'ar' ? 'محطة واتساب والإرسال الفوري' : 'WhatsApp & Quick Send'}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black ${
                isDark ? 'bg-blue-600 text-white' : 'bg-white/20 text-white'
              }`}
            >
              {connectedWaCount}/{whatsappAccounts.length}
            </span>
          </button>

          {/* 3. System Notifications Center */}
          <div className="relative">
            <button
              type="button"
              data-testid="navbar-notifications-btn"
              onClick={() => {
                setIsNotificationsOpen(true);
                setIsProfileMenuOpen(false);
              }}
              title={language === 'ar' ? 'التنبيهات التشغيلية الشاملة' : 'System Notifications Center'}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1 -end-1 px-1 min-w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <SystemNotificationCenterModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
              />
            )}
          </div>

          {/* 4. Corner Membership Avatar Hub (Integrates Profile, Themes, Fonts, Language, Currency & Settings) */}
          <div className="relative ps-1.5 border-s border-slate-200 dark:border-slate-800">
            <button
              type="button"
              data-testid="navbar-profile-dropdown-trigger"
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsNotificationsOpen(false);
              }}
              title={
                language === 'ar'
                  ? 'العضوية، المظهر والخطوط، تغيير اللغة، العملة، والإعدادات'
                  : 'Membership, Appearance & Fonts, Language, Currency & Settings'
              }
              className={`flex items-center gap-2 px-2.5 h-9 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800'
                  : isSand
                  ? 'bg-[#f3ede2] border-[#d5c6ad] text-stone-900 hover:bg-[#eae0cf]'
                  : 'bg-slate-50 border-slate-200/90 text-slate-800 hover:bg-slate-100 shadow-2xs'
              }`}
            >
              <span
                data-testid="navbar-theme-picker-btn"
                className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs"
              >
                <UserAvatarIcon className="w-3.5 h-3.5" />
              </span>
              <span className="hidden xl:inline text-xs font-bold max-w-[110px] truncate">
                {language === 'ar' ? 'العضوية والمظهر' : 'Account & Theme'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <div
                data-testid="navbar-profile-dropdown-menu"
                className={`absolute top-11 end-0 w-88 sm:w-[420px] max-w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl border shadow-2xl p-3.5 z-50 text-xs ${
                  isDark
                    ? 'bg-[#0f172a] border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {/* Part A: User Membership Identity Header */}
                <div
                  className={`p-3 rounded-xl border mb-3 flex items-center justify-between gap-2.5 ${
                    isDark
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-slate-50/90 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                      <UserAvatarIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-xs truncate">
                        {language === 'ar' ? currentAccount.nameAr : currentAccount.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                        {currentAccount.role}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="navbar-logout-btn"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-300 font-bold text-[11px] hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'خروج' : 'Sign Out'}</span>
                  </button>
                </div>

                {/* Part B: Quick System Controls (Language, Currency, Settings, Security, Desktop/LAN) */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {/* Language Switcher */}
                  <button
                    type="button"
                    data-testid="profile-menu-language-btn"
                    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                    className={`min-w-0 overflow-hidden flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'اللغة' : 'Language'}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] shrink-0">
                      {language === 'ar' ? 'English' : 'العربية'}
                    </span>
                  </button>

                  {/* Currency Switcher */}
                  {masterSystemConfig.uiElementsVisibility.showCurrencySwitcher && (
                    <div
                      className={`min-w-0 overflow-hidden flex items-center justify-between px-2.5 py-1.5 rounded-xl border ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1 font-bold text-[11px] shrink-0">
                        <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{language === 'ar' ? 'العملة:' : 'Curr:'}</span>
                      </span>
                      <select
                        data-testid="navbar-currency-select"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="bg-transparent font-mono font-bold text-xs outline-hidden cursor-pointer truncate"
                        title={t('currency')}
                      >
                        <option value="YER" className="text-slate-900 bg-white">
                          YER (ر.ي)
                        </option>
                        <option value="SAR" className="text-slate-900 bg-white">
                          SAR (ر.س)
                        </option>
                        <option value="USD" className="text-slate-900 bg-white">
                          USD ($)
                        </option>
                        <option value="AED" className="text-slate-900 bg-white">
                          AED (د.إ)
                        </option>
                        <option value="EUR" className="text-slate-900 bg-white">
                          EUR (€)
                        </option>
                        <option value="EGP" className="text-slate-900 bg-white">
                          EGP (ج.م)
                        </option>
                      </select>
                    </div>
                  )}

                  {/* System Settings Button (with 7-click stealth keygen support) */}
                  <button
                    type="button"
                    data-testid="navbar-settings-stealth-trigger"
                    onClick={handleSettingsRapidClick}
                    className={`min-w-0 overflow-hidden flex items-center gap-2 px-3 py-2 rounded-xl border font-bold transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
                    </span>
                  </button>

                  {/* Security & Permissions */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('security');
                      setIsProfileMenuOpen(false);
                    }}
                    className={`min-w-0 overflow-hidden flex items-center gap-2 px-3 py-2 rounded-xl border font-bold transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {language === 'ar' ? 'الأمان والصلاحيات' : 'Security & Roles'}
                    </span>
                  </button>
                </div>

                {/* Windows Desktop & LAN Quick Launch Row */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    openLanPortal();
                  }}
                  className={`w-full mb-3 px-3 py-2.5 rounded-xl border font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                    isDark
                      ? 'bg-blue-950/50 border-blue-800/70 text-blue-200 hover:bg-blue-900/60'
                      : 'bg-blue-50/80 border-blue-200 text-blue-900 hover:bg-blue-100/80'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    <MonitorSmartphone className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">
                      {language === 'ar'
                        ? 'برنامج ويندوز المكتبي والربط عبر الشبكة (LAN)'
                        : 'Windows Desktop App & LAN Network Hub'}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                    فتح
                  </span>
                </button>

                {/* Part C: Integrated Theme Studio (5 Non-Green Eye-Comfort Themes) */}
                <div
                  data-testid="navbar-theme-dropdown-menu"
                  className="pt-2.5 border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="px-1 pb-2 flex items-center justify-between">
                    <span className="font-black text-xs flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-600" />
                      {language === 'ar'
                        ? 'المظهر والثيمات المريحة للعين (5 أنماط)'
                        : 'Eye-Comfort Themes (5 Styles)'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      تغيير لحظي
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {HASEB_THEMES_LIST.map((th) => {
                      const active = uiTheme === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          data-testid={`theme-option-${th.id}`}
                          onClick={() => {
                            setUiTheme(th.id as any);
                          }}
                          className={`w-full min-w-0 overflow-hidden flex items-center justify-between gap-2.5 p-2 rounded-xl text-start transition cursor-pointer border ${
                            active
                              ? isDark
                                ? 'bg-blue-950/60 border-blue-500 text-white shadow-xs'
                                : 'bg-blue-50/90 border-blue-500 text-slate-900 shadow-xs'
                              : isDark
                              ? 'border-slate-800/80 hover:bg-slate-800/70 text-slate-300'
                              : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="flex items-center rounded-lg overflow-hidden border border-slate-300/80 dark:border-slate-600 shrink-0 shadow-2xs">
                              <span
                                className="w-2.5 h-5"
                                style={{ backgroundColor: th.sidebarHex }}
                              />
                              <span
                                className="w-2.5 h-5"
                                style={{ backgroundColor: th.canvasHex }}
                              />
                              <span
                                className="w-3 h-5"
                                style={{ backgroundColor: th.accentHex }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs truncate">
                                {language === 'ar' ? th.nameAr : th.nameEn}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {th.descAr}
                              </div>
                            </div>
                          </div>
                          {active && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Part D: Integrated Arabic Typography Suite (4 Fonts) */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-1 mb-2 flex items-center justify-between">
                    <span className="font-black text-xs flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-600" />
                      {language === 'ar' ? 'عائلة الخطوط العربية الاحترافية' : 'Arabic Fonts Suite'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">4 خطوط</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {HASEB_FONTS_LIST.map((f) => {
                      const activeFont = uiFont === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          data-testid={`font-option-${f.id}`}
                          onClick={() => setUiFont(f.id)}
                          className={`min-w-0 overflow-hidden p-2 rounded-xl border text-start transition cursor-pointer flex items-center justify-between gap-1.5 ${
                            activeFont
                              ? isDark
                                ? 'bg-blue-950/60 border-blue-500 text-white font-bold'
                                : 'bg-blue-50 border-blue-500 text-slate-900 font-bold'
                              : isDark
                              ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                              : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">{f.nameAr}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {f.descAr}
                            </div>
                          </div>
                          {activeFont && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Part E: Harmonized Size & Workspace Scale Studio (Font + / - & Windows/Tabs + / -) */}
                <div
                  data-testid="navbar-scale-studio-section"
                  className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5"
                >
                  <div className="px-1 flex items-center justify-between">
                    <span className="font-black text-xs flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                      {language === 'ar'
                        ? 'الحجم ومقياس العرض المتناسق'
                        : 'Font & Window Scale Studio'}
                    </span>
                    <button
                      type="button"
                      data-testid="scale-reset-default-btn"
                      onClick={() => {
                        setFontScalePercent(DEFAULT_FONT_SCALE);
                        setWindowScalePercent(DEFAULT_WINDOW_SCALE);
                      }}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title={
                        language === 'ar'
                          ? 'إعادة الحجم للوضع الافتراضي المتناسق (خط 110% • نوافذ 105%)'
                          : 'Reset to Harmonized Default (110% Font / 105% Windows)'
                      }
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{language === 'ar' ? 'افتراضي متناسق' : 'Reset'}</span>
                    </button>
                  </div>

                  {/* Default Size Presets (أحجام افتراضية جاهزة) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {HASEB_SCALE_PRESETS.map((preset) => {
                      const isPresetActive =
                        fontScalePercent === preset.fontScalePercent &&
                        windowScalePercent === preset.windowScalePercent;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          data-testid={`scale-preset-${preset.id}`}
                          onClick={() => {
                            setFontScalePercent(preset.fontScalePercent);
                            setWindowScalePercent(preset.windowScalePercent);
                          }}
                          className={`min-w-0 overflow-hidden px-2.5 py-1.5 rounded-xl border text-start transition cursor-pointer flex items-center justify-between gap-1 ${
                            isPresetActive
                              ? isDark
                                ? 'bg-blue-950/70 border-blue-500 text-white font-bold'
                                : 'bg-blue-50 border-blue-500 text-slate-900 font-bold'
                              : isDark
                              ? 'border-slate-800 hover:bg-slate-800/80 text-slate-300'
                              : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="text-[11px] font-bold truncate">
                            {language === 'ar' ? preset.labelAr : preset.labelEn}
                          </span>
                          {isPresetActive && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stepper 1: تكبير وتصغير الخطوط (+ / -) */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-800'
                        : 'bg-slate-50/90 border-slate-200/90'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                          {language === 'ar' ? 'تكبير / تصغير الخطوط' : 'Font Size Scale'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {language === 'ar'
                          ? 'وضوح القراءة والأرقام في الجداول والفواتير'
                          : 'Text & numbers clarity across tables & forms'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        data-testid="font-scale-decrease-btn"
                        disabled={fontScalePercent <= FONT_SCALE_MIN}
                        onClick={() =>
                          setFontScalePercent((prev) => stepFontScale(prev, 'DEC'))
                        }
                        aria-label={language === 'ar' ? 'تصغير الخط' : 'Decrease Font Size'}
                        className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center font-bold transition cursor-pointer disabled:opacity-40 ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span
                        data-testid="font-scale-value"
                        className="min-w-12 text-center font-mono font-black text-xs px-1.5 py-1 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                        dir="ltr"
                      >
                        {fontScalePercent}%
                      </span>

                      <button
                        type="button"
                        data-testid="font-scale-increase-btn"
                        disabled={fontScalePercent >= FONT_SCALE_MAX}
                        onClick={() =>
                          setFontScalePercent((prev) => stepFontScale(prev, 'INC'))
                        }
                        aria-label={language === 'ar' ? 'تكبير الخط' : 'Increase Font Size'}
                        className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center font-bold transition cursor-pointer disabled:opacity-40 ${
                          isDark
                            ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 border-blue-700 text-white shadow-2xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stepper 2: تكبير وتصغير النوافذ والتبويبات والقوالب (+ / -) */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-800'
                        : 'bg-slate-50/90 border-slate-200/90'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          {language === 'ar'
                            ? 'تكبير النوافذ والتبويبات'
                            : 'Windows & Tabs Scale'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {language === 'ar'
                          ? 'توسيع القوائم، البطاقات، الحقول، والقوالب بتناسق'
                          : 'Harmonious scaling of tabs, cards, inputs & modals'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        data-testid="window-scale-decrease-btn"
                        disabled={windowScalePercent <= WINDOW_SCALE_MIN}
                        onClick={() =>
                          setWindowScalePercent((prev) => stepWindowScale(prev, 'DEC'))
                        }
                        aria-label={
                          language === 'ar'
                            ? 'تصغير النوافذ والتبويبات'
                            : 'Decrease Windows & Tabs Scale'
                        }
                        className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center font-bold transition cursor-pointer disabled:opacity-40 ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span
                        data-testid="window-scale-value"
                        className="min-w-12 text-center font-mono font-black text-xs px-1.5 py-1 rounded-md bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                        dir="ltr"
                      >
                        {windowScalePercent}%
                      </span>

                      <button
                        type="button"
                        data-testid="window-scale-increase-btn"
                        disabled={windowScalePercent >= WINDOW_SCALE_MAX}
                        onClick={() =>
                          setWindowScalePercent((prev) => stepWindowScale(prev, 'INC'))
                        }
                        aria-label={
                          language === 'ar'
                            ? 'تكبير النوافذ والتبويبات'
                            : 'Increase Windows & Tabs Scale'
                        }
                        className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center font-bold transition cursor-pointer disabled:opacity-40 ${
                          isDark
                            ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white shadow-2xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
