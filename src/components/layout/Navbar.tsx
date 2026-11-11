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
  Smartphone,
  User as UserAvatarIcon,
  ShieldCheck,
  ChevronDown,
  Palette,
  Check,
  Type,
} from 'lucide-react';
import { SystemNotificationCenterModal } from '../common/SystemNotificationCenterModal';
import { generateSystemNotifications } from '../../core/notificationsEngine';
import { HasebBrandLogo } from '../common/HasebBrandLogo';

export const HASEB_THEMES_LIST = [
  {
    id: 'corporate_slate' as const,
    nameAr: 'زمرد حاسب الملكي (افتراضي مريح)',
    nameEn: 'Haseb Imperial Emerald',
    descAr: 'هوية مالية متكاملة بتدرجات الزمرد الملكي وخلفية عاجية مريحة للعين',
    swatchBg: 'bg-[#059669]',
    sidebarHex: '#f6faf8',
    canvasHex: '#eef4f2',
    accentHex: '#059669',
  },
  {
    id: 'haseb_royal' as const,
    nameAr: 'ياقوت حاسب المصرفي (أزرق ملكي)',
    nameEn: 'Haseb Royal Sapphire',
    descAr: 'طابع البنوك والمؤسسات الكبرى بتدرجات الياقوت الأزرق والكحلي',
    swatchBg: 'bg-[#1d4ed8]',
    sidebarHex: '#0a162c',
    canvasHex: '#edf3fc',
    accentHex: '#1d4ed8',
  },
  {
    id: 'swiss_light' as const,
    nameAr: 'كشمير حاسب السويسري (نيلي عصري)',
    nameEn: 'Haseb Swiss Cashmere',
    descAr: 'تصميم سويسري فائق النقاء بلمسات النيلي الملكي والأسطح اللؤلؤية',
    swatchBg: 'bg-[#4338ca]',
    sidebarHex: '#ffffff',
    canvasHex: '#f3f4f9',
    accentHex: '#4338ca',
  },
  {
    id: 'haseb_sand' as const,
    nameAr: 'رمال حاسب الدافئة (حماية العين)',
    nameEn: 'Haseb Warm Oasis Paper',
    descAr: 'وضع القراءة الورقية الدافئة بدون أشعة زرقاء لورديات الكاشير الطويلة',
    swatchBg: 'bg-[#0f766e]',
    sidebarHex: '#f5efe2',
    canvasHex: '#f2ece1',
    accentHex: '#0f766e',
  },
  {
    id: 'obsidian_dark' as const,
    nameAr: 'ليل حاسب الكربوني (الوضع الليلي)',
    nameEn: 'Haseb Obsidian Carbon',
    descAr: 'وضع داكن احترافي متكامل لجميع البطاقات والجداول بدون أي توهج',
    swatchBg: 'bg-[#0f172a]',
    sidebarHex: '#080c14',
    canvasHex: '#111827',
    accentHex: '#10b981',
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
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [uiFont, setUiFont] = useState<HasebFontId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('haseb_ui_font') as HasebFontId | null;
      if (saved && ['cairo', 'readex', 'tajawal', 'ibm_plex'].includes(saved)) {
        return saved;
      }
    }
    return 'cairo';
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
      setIsStandaloneKeygenOpen(true);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setActiveTab('settings');
      }, 400);
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
          ? 'bg-[#faf6ee] border-[#ddd2be] text-stone-900'
          : isRoyal
          ? 'bg-white border-[#cfddf2] text-slate-900'
          : isSwiss
          ? 'bg-white border-[#dce0f0] text-slate-900'
          : 'bg-white border-[#d3e2dc] text-slate-900'
      }`}
    >
      <div className="px-3 sm:px-5 h-14 flex items-center justify-between gap-3 max-w-full">
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
                ? 'bg-[#f2ece1] border-[#ddd2be] text-stone-700 hover:bg-[#e8dfd0]'
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
                className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400"
                title={`قاعدة بيانات حاسب الفورية — آخر حفظ لحظي: ${lastAutoSavedAt}`}
              >
                حفظ تلقائي لحظي ✓
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2 (Center): Interactive Command & Global Search Bar (Ctrl+K) */}
        <div className="flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className={`w-full h-9.5 flex items-center justify-between px-3.5 rounded-xl text-xs border transition cursor-pointer group ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300'
                : isSand
                ? 'bg-[#f2ece1] hover:bg-[#faf6ee] border-[#ddd2be] text-stone-700'
                : 'bg-slate-50/90 hover:bg-white border-slate-200 hover:border-emerald-400 text-slate-600 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 shrink-0 text-emerald-600 group-hover:scale-105 transition-transform" />
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

        {/* Zone 3 (End): Theme & Font Studio, WhatsApp Hub, Notifications & Profile */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Interactive Theme & Typography Studio Switcher */}
          <div className="relative">
            <button
              type="button"
              data-testid="navbar-theme-picker-btn"
              onClick={() => {
                setIsThemeMenuOpen(!isThemeMenuOpen);
                setIsNotificationsOpen(false);
                setIsProfileMenuOpen(false);
              }}
              title={
                language === 'ar'
                  ? 'استوديو ثيمات وخطوط حاسب الاحترافية'
                  : 'Haseb Themes & Typography Studio'
              }
              className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-emerald-300 hover:bg-slate-800'
                  : isSand
                  ? 'bg-[#f2ece1] border-[#d3c5ad] text-stone-800 hover:bg-[#e8dfd0]'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">
                {language === 'ar' ? 'المظهر والخطوط' : 'Themes & Fonts'}
              </span>
            </button>

            {isThemeMenuOpen && (
              <div
                data-testid="navbar-theme-dropdown-menu"
                className={`absolute top-11 end-0 w-80 sm:w-96 rounded-2xl border shadow-2xl p-3 z-50 text-xs ${
                  isDark
                    ? 'bg-[#0f172a] border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {/* Section 1: 5 Curated Enterprise Themes */}
                <div className="px-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
                  <span className="font-black text-xs flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-600" />
                    {language === 'ar' ? 'ثيمات حاسب المؤسسية (5 أنماط)' : 'Haseb Enterprise Themes'}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    تطبيق فوري شامل
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
                        className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-start transition cursor-pointer border ${
                          active
                            ? isDark
                              ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-xs'
                              : 'bg-emerald-50/90 border-emerald-500 text-slate-900 shadow-xs'
                            : isDark
                            ? 'border-slate-800/80 hover:bg-slate-800/70 text-slate-300'
                            : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Multi-Swatch Live Palette Chip (Sidebar + Canvas + Accent) */}
                          <div className="flex items-center rounded-lg overflow-hidden border border-slate-300/80 dark:border-slate-600 shrink-0 shadow-2xs">
                            <span
                              className="w-2.5 h-6"
                              style={{ backgroundColor: th.sidebarHex }}
                            />
                            <span
                              className="w-2.5 h-6"
                              style={{ backgroundColor: th.canvasHex }}
                            />
                            <span
                              className="w-3 h-6"
                              style={{ backgroundColor: th.accentHex }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">
                              {language === 'ar' ? th.nameAr : th.nameEn}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {th.descAr}
                            </div>
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Section 2: Professional Arabic Font Suite Selector */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-1.5 mb-2 flex items-center justify-between">
                    <span className="font-black text-xs flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-600" />
                      {language === 'ar' ? 'عائلة الخطوط العربية الاحترافية' : 'Arabic Typography Suite'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">4 خطوط معتمدة</span>
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
                          className={`p-2 rounded-xl border text-start transition cursor-pointer flex items-center justify-between gap-1.5 ${
                            activeFont
                              ? isDark
                                ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold'
                                : 'bg-emerald-50 border-emerald-500 text-slate-900 font-bold'
                              : isDark
                              ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                              : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
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
              </div>
            )}
          </div>

          {/* Mobile LAN Portal Button */}
          <button
            type="button"
            data-testid="navbar-lan-portal-btn"
            onClick={openLanPortal}
            title={
              language === 'ar'
                ? 'فتح بوابة ربط الجوال عبر الشبكة المحلية'
                : 'Open Mobile LAN Portal'
            }
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden lg:inline">
              {language === 'ar' ? 'ربط الجوال' : 'Mobile Link'}
            </span>
          </button>

          {/* Unified Multi-Account WhatsApp & Instant Quick-Send Station Button */}
          <button
            type="button"
            data-testid="navbar-whatsapp-station-btn"
            onClick={() => setActiveTab('communications')}
            title={
              language === 'ar'
                ? 'مركز واتساب المتعدد والإرسال الفوري الموحد (محادثات فعلية + قوالب الفواتير والمديونيات + SMS)'
                : 'Unified Multi-Account WhatsApp & Quick-Send Hub'
            }
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-emerald-950/80 hover:bg-emerald-900/90 border-emerald-700/80 text-emerald-300'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {language === 'ar' ? 'محطة واتساب والإرسال الفوري' : 'WhatsApp & Quick Send'}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black ${
                isDark ? 'bg-emerald-600 text-white' : 'bg-white/20 text-white'
              }`}
            >
              {connectedWaCount}/{whatsappAccounts.length}
            </span>
          </button>

          {/* System Notifications Center */}
          <div className="relative">
            <button
              type="button"
              data-testid="navbar-notifications-btn"
              onClick={() => {
                setIsNotificationsOpen(true);
                setIsProfileMenuOpen(false);
                setIsThemeMenuOpen(false);
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

          {/* Global Currency Selector */}
          {masterSystemConfig.uiElementsVisibility.showCurrencySwitcher && (
            <select
              data-testid="navbar-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className={`hidden sm:inline-block h-9 px-2.5 rounded-xl border text-xs font-mono font-bold outline-hidden cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
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
          )}

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className={`flex items-center gap-1 h-9 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={t('language')}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            data-testid="navbar-settings-stealth-trigger"
            onClick={handleSettingsRapidClick}
            title={language === 'ar' ? 'الإعدادات العامة للنظام' : 'System Settings'}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border text-xs transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Compact User Profile Dropdown Triggered by Avatar Icon */}
          <div className="relative ps-1.5 border-s border-slate-200 dark:border-slate-800">
            <button
              type="button"
              data-testid="navbar-profile-dropdown-trigger"
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsNotificationsOpen(false);
                setIsThemeMenuOpen(false);
              }}
              title={language === 'ar' ? 'قائمة الحساب والإعدادات' : 'Account & Profile Menu'}
              className={`flex items-center gap-1 px-2 h-9 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserAvatarIcon className="w-3.5 h-3.5" />
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <div
                data-testid="navbar-profile-dropdown-menu"
                className={`absolute top-11 end-0 w-56 rounded-xl border shadow-xl p-1.5 z-50 text-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div
                  className={`px-3 py-2 border-b mb-1 ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <div className="font-bold truncate">
                    {language === 'ar' ? currentAccount.nameAr : currentAccount.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {currentAccount.role}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('security');
                    setIsProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-start font-medium transition cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'ar' ? 'الأمان والصلاحيات' : 'Security & Permissions'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-start font-medium transition cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{language === 'ar' ? 'إعدادات النظام' : 'System Settings'}</span>
                </button>

                <div
                  className={`my-1 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                />

                <button
                  type="button"
                  data-testid="navbar-logout-btn"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-start font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
