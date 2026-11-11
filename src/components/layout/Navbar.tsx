import React, { useState, useRef, useMemo } from 'react';
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
import { SystemNotificationCenterModal } from '../common/SystemNotificationCenterModal';
import { generateSystemNotifications } from '../../core/notificationsEngine';

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
    masterSystemConfig,
    openQuickSendModal,
    outboundMessages,
    whatsappAccounts,
    lastAutoSavedAt,
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
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-xs tracking-tight leading-none">
                RLM Enterprise
              </span>
              <span
                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold mt-0.5"
                title={`حفظ تلقائي لحظي — آخر مزامنة: ${lastAutoSavedAt}`}
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
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs font-bold transition cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-700/70 text-emerald-300'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {language === 'ar' ? 'محطة واتساب والإرسال الفوري' : 'WhatsApp & Quick Send'}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-black ${
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
              }}
              title={language === 'ar' ? 'التنبيهات التشغيلية الشاملة' : 'System Notifications Center'}
              className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1 -end-1 px-1 min-w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
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


