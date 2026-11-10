import React, { useState, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Globe,
  Search,
  PanelLeft,
  LogOut,
  Bell,
  AlertTriangle,
  MessageSquare,
  Settings as SettingsIcon,
  Smartphone,
  Wrench,
  User as UserAvatarIcon,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

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
    uiTheme,
    masterSystemConfig,
    openQuickSendModal,
    outboundMessages,
    setIsStandaloneKeygenOpen,
    openLanPortal,
  } = useERP();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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

  const lowStockCount = products.filter((p) => p.stockQty <= p.reorderPoint).length;
  const openWarrantyCount = warrantyTickets.filter(
    (w) => w.status !== 'DELIVERED' && w.status !== 'REJECTED'
  ).length;
  const totalAlertsCount = lowStockCount + openWarrantyCount;

  const isDark = uiTheme === 'obsidian_dark';

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors ${
        isDark
          ? 'bg-[#0B1120] border-slate-800 text-slate-100'
          : 'bg-white border-slate-200/90 text-slate-900'
      }`}
    >
      <div className="px-3 sm:px-5 h-13 flex items-center justify-between gap-3 max-w-full">
        {/* Zone 1 (Start): Minimalist Sidebar Toggle & Brand Identity */}
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
            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-xs tracking-tighter shadow-2xs">
              RLM
            </div>
            <span className="hidden sm:inline font-bold text-xs tracking-tight">
              RLM Enterprise
            </span>
          </div>
        </div>

        {/* Zone 2 (Center): Interactive Command & Global Search Bar (Ctrl+K) */}
        <div className="flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs border transition cursor-pointer group ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300'
                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300 text-slate-600 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-105 transition-transform" />
              <span className="truncate whitespace-nowrap text-xs font-medium">
                {language === 'ar'
                  ? 'بحث سريع: صنف، سيريال، باركود، أو فاتورة...'
                  : 'Quick search: product, serial, barcode, invoice...'}
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

        {/* Zone 3 (End): Essential System Status & Compact Avatar Profile Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
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
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-bold transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-sky-400 hover:bg-slate-800'
                : 'bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="hidden lg:inline">
              {language === 'ar' ? 'ربط الجوال' : 'Mobile Link'}
            </span>
          </button>

          {/* Quick WhatsApp & SMS Sender Trigger */}
          <button
            type="button"
            data-testid="navbar-quick-send-btn"
            onClick={() => openQuickSendModal({ channel: 'WHATSAPP', category: 'INVOICE' })}
            title={
              language === 'ar'
                ? 'إرسال فوري عبر واتساب أو رسالة نصية SMS'
                : 'Send via WhatsApp or SMS'
            }
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {language === 'ar' ? 'واتساب / SMS' : 'WhatsApp / SMS'}
            </span>
            {outboundMessages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/50 text-emerald-100 font-mono text-[10px]">
                {outboundMessages.length}
              </span>
            )}
          </button>

          {/* System Notifications Center */}
          <div className="relative">
            <button
              type="button"
              data-testid="navbar-notifications-btn"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileMenuOpen(false);
              }}
              title={language === 'ar' ? 'التنبيهات التشغيلية' : 'Operational Alerts'}
              className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1 -end-1 px-1 min-w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute top-10 end-0 w-80 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-xl p-3 space-y-2 z-50 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">
                    {language === 'ar' ? 'التنبيهات التشغيلية' : 'Operational Alerts'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-start">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        {language === 'ar' ? 'أصناف بلغت حد إعادة الطلب' : 'Low Stock Alerts'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {language === 'ar' ? 'تنبيهات الحد الأدنى للأصناف' : 'Reorder threshold alerts'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    {lowStockCount}
                  </span>
                </div>

                <div className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-start">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        {language === 'ar' ? 'تذاكر الصيانة النشطة (RMA)' : 'Active RMA Tickets'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {language === 'ar' ? 'متابعة حالة السيريال والضمان' : 'Serial & warranty status'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                    {openWarrantyCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Global Currency Selector */}
          {masterSystemConfig.uiElementsVisibility.showCurrencySwitcher && (
            <select
              data-testid="navbar-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className={`hidden sm:inline-block h-8 px-2 rounded-lg border text-xs font-mono font-bold outline-hidden cursor-pointer ${
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
            className={`flex items-center gap-1 h-8 px-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={t('language')}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            data-testid="navbar-settings-stealth-trigger"
            onClick={handleSettingsRapidClick}
            title={language === 'ar' ? 'الإعدادات العامة للنظام' : 'System Settings'}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          {/* Compact User Profile Dropdown Triggered by Avatar Icon */}
          <div className="relative ps-1.5 border-s border-slate-200 dark:border-slate-800">
            <button
              type="button"
              data-testid="navbar-profile-dropdown-trigger"
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsNotificationsOpen(false);
              }}
              title={language === 'ar' ? 'قائمة الحساب والإعدادات' : 'Account & Profile Menu'}
              className={`flex items-center gap-1 px-2 h-8 rounded-lg border transition cursor-pointer ${
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
                className={`absolute top-10 end-0 w-56 rounded-xl border shadow-xl p-1.5 z-50 text-xs ${
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


