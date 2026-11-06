import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Building2,
  GitBranch,
  Globe,
  Search,
  PanelLeft,
  LogOut,
  Bell,
  AlertTriangle,
  GitPullRequest,
  Utensils,
  Sun,
  Moon,
  Contrast,
  Lock,
  ShieldAlert,
  Wifi,
  MessageSquare,
  Settings as SettingsIcon,
} from 'lucide-react';
import { IndustryType } from '../../types/erp';
import { PWAInstallButton } from './PWAInstallBanner';

export const Navbar: React.FC = () => {
  const {
    language,
    setLanguage,
    currency,
    setCurrency,
    t,
    currentTenant,
    tenants,
    setCurrentTenant,
    branches,
    currentBranch,
    setCurrentBranch,
    setIsCommandPaletteOpen,
    activeIndustry,
    setActiveIndustry,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    currentAccount,
    protectionState,
    setActiveTab,
    logout,
    products,
    workflowApprovals,
    kitchenTickets,
    uiTheme,
    setUiTheme,
    uiDensity,
    setUiDensity,
    syncLatencyMs,
    dbRevision,
    masterSystemConfig,
    networkInfo,
    openQuickSendModal,
    outboundMessages,
    setIsStandaloneKeygenOpen,
  } = useERP();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);

  const handleSettingsRapidClick = () => {
    const now = Date.now();
    // Keep clicks from the last 2.5 seconds
    const recentClicks = [...clickTimestamps.filter((t) => now - t < 2500), now];
    setClickTimestamps(recentClicks);

    if (recentClicks.length >= 7) {
      setClickTimestamps([]);
      setIsStandaloneKeygenOpen(true);
    } else {
      setActiveTab('settings');
    }
  };

  const lowStockCount = products.filter((p) => p.stockQty <= p.reorderPoint).length;
  const pendingWorkflowsCount = workflowApprovals.filter((w) => w.status === 'PENDING').length;
  const activeKotCount = kitchenTickets.filter((k) => k.status !== 'SERVED').length;
  const totalAlertsCount = lowStockCount + pendingWorkflowsCount + activeKotCount;

  const industryOptions: { id: IndustryType; labelAr: string; labelEn: string }[] = [
    { id: 'electronics', labelAr: 'القطاع: الإلكترونيات والطاقة الشمسية والبطاريات', labelEn: 'Sector: Electronics, Solar & Batteries' },
    { id: 'general', labelAr: 'القطاع: تجارة وصناعة شاملة', labelEn: 'Sector: General Enterprise' },
    { id: 'restaurant', labelAr: 'القطاع: المطاعم والضيافة', labelEn: 'Sector: Restaurants & F&B' },
    { id: 'grocery', labelAr: 'القطاع: التموينات والسوبرماركت', labelEn: 'Sector: Grocery & Scale' },
    { id: 'pharmacy', labelAr: 'القطاع: الصيدليات والطبي', labelEn: 'Sector: Pharmacy & Medical' },
    { id: 'contracting', labelAr: 'القطاع: المقاولات والمشاريع', labelEn: 'Sector: Contracting & Projects' },
  ];

  const isDark = uiTheme === 'obsidian_dark';

  const cycleTheme = () => {
    if (uiTheme === 'corporate_slate') setUiTheme('swiss_light');
    else if (uiTheme === 'swiss_light') setUiTheme('obsidian_dark');
    else setUiTheme('corporate_slate');
  };

  const themeLabelAr =
    uiTheme === 'corporate_slate'
      ? 'كحلي مؤسسي'
      : uiTheme === 'swiss_light'
      ? 'أبيض مصرفي'
      : 'داكن مالي';

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors ${
        isDark
          ? 'bg-[#0B1120] border-slate-800 text-slate-100'
          : 'bg-white border-slate-200/90 text-slate-900'
      }`}
    >
      <div className="px-3 sm:px-5 h-12 flex items-center justify-between gap-3 max-w-full">
        {/* Zone 1 (Start): Sidebar Toggle, Institutional Monogram, & Context Breadcrumb */}
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
            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-md border transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {/* Clean Institutional Brand Identity */}
          <div className="flex items-center gap-2 pe-2 border-e border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-md bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-xs tracking-tighter">
              RLM
            </div>
            <div className="hidden sm:block leading-none">
              <div className="font-bold text-xs tracking-tight">RLM Enterprise</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                <span>حفظ لحظي</span>
                <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400" dir="ltr">
                  {syncLatencyMs}ms · v{dbRevision}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Sector Selector (or Locked Single-Activity Badge) */}
          {masterSystemConfig.industryLockMode === 'SINGLE_LOCKED' ||
          !masterSystemConfig.uiElementsVisibility.showIndustrySwitcher ? (
            <div
              data-testid="navbar-locked-industry-badge"
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-bold max-w-[190px] truncate ${
                isDark
                  ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
              title={
                language === 'ar'
                  ? 'النظام مخصص ومقفل على هذا النشاط من قبل الإدارة العليا'
                  : 'System is dedicated and locked to this single industry'
              }
            >
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">
                {language === 'ar'
                  ? industryOptions.find((i) => i.id === activeIndustry)?.labelAr || activeIndustry
                  : industryOptions.find((i) => i.id === activeIndustry)?.labelEn || activeIndustry}
              </span>
            </div>
          ) : (
            <div
              className={`flex items-center h-8 px-2.5 rounded-md border text-xs transition max-w-[190px] ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <select
                data-testid="navbar-industry-select"
                value={activeIndustry}
                onChange={(e) => setActiveIndustry(e.target.value as IndustryType)}
                className="bg-transparent border-none outline-hidden cursor-pointer font-semibold truncate text-xs w-full"
                title={language === 'ar' ? 'تغيير القطاع التشغيلي' : 'Switch Operational Sector'}
              >
                {industryOptions.map((ind) => (
                  <option key={ind.id} value={ind.id} className="text-slate-900 bg-white">
                    {language === 'ar' ? ind.labelAr : ind.labelEn}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tenant & Branch Breadcrumb Selectors */}
          <div
            className={`hidden 2xl:flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={currentTenant.id}
              onChange={(e) => {
                const selected = tenants.find((t) => t.id === e.target.value);
                if (selected) setCurrentTenant(selected);
              }}
              className="bg-transparent border-none outline-hidden cursor-pointer font-medium truncate text-xs max-w-[120px]"
              title={t('tenant')}
            >
              {tenants.map((ten) => (
                <option key={ten.id} value={ten.id} className="text-slate-900 bg-white">
                  {ten.name}
                </option>
              ))}
            </select>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={currentBranch.id}
              onChange={(e) => {
                const b = branches.find((item) => item.id === e.target.value);
                if (b) setCurrentBranch(b);
              }}
              className="bg-transparent border-none outline-hidden cursor-pointer font-medium truncate text-xs max-w-[110px]"
              title={t('branch')}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="text-slate-900 bg-white">
                  {language === 'ar' ? b.nameAr : b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone 2 (Center): Institutional Command Bar Trigger */}
        <div className="flex-1 max-w-[160px] sm:max-w-xs mx-1">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className={`w-full h-8 flex items-center justify-between px-2.5 rounded-md text-xs border transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate whitespace-nowrap text-[11px]">{t('searchPlaceholder')}</span>
            </div>
            <kbd
              className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ms-1 border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Zone 3 (End): Theme & Density Switcher, WhatsApp/SMS Hub, Alerts, Currency/Lang, License Status, & User */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Quick Omnichannel WhatsApp & SMS Sender Trigger */}
          <button
            type="button"
            data-testid="navbar-quick-send-btn"
            onClick={() => openQuickSendModal({ channel: 'WHATSAPP', category: 'INVOICE' })}
            title={
              language === 'ar'
                ? 'إرسال فوري عبر واتساب أو رسالة نصية SMS لأي رقم'
                : 'Send via WhatsApp or SMS by phone number'
            }
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {language === 'ar' ? 'واتساب / SMS' : 'WhatsApp / SMS'}
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/60 text-emerald-200 font-mono text-[10px]">
              {outboundMessages.length}
            </span>
          </button>

          {/* Institutional Theme & Density Switcher */}
          <button
            type="button"
            data-testid="navbar-theme-switcher"
            onClick={cycleTheme}
            title={
              language === 'ar'
                ? 'تبديل المظهر المؤسسي (كحلي مؤسسي / أبيض مصرفي / داكن مالي)'
                : 'Switch Institutional Theme'
            }
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-xs font-semibold transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {uiTheme === 'obsidian_dark' ? (
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
            ) : uiTheme === 'swiss_light' ? (
              <Sun className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Contrast className="w-3.5 h-3.5 text-slate-700" />
            )}
            <span className="hidden lg:inline">{themeLabelAr}</span>
          </button>

          {/* Compact Density Toggle */}
          <button
            type="button"
            data-testid="navbar-density-toggle"
            onClick={() => setUiDensity(uiDensity === 'comfortable' ? 'compact' : 'comfortable')}
            title={language === 'ar' ? 'تبديل كثافة الجداول المالية (قياسي / مدمج)' : 'Toggle Grid Density'}
            className={`hidden 2xl:inline-flex items-center px-2 h-8 rounded-md border text-[11px] font-mono font-medium transition cursor-pointer ${
              uiDensity === 'compact'
                ? 'bg-slate-900 text-white border-slate-900'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {uiDensity === 'compact' ? 'كثافة: مدمج' : 'كثافة: قياسي'}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              type="button"
              data-testid="navbar-notifications-btn"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              title={language === 'ar' ? 'مركز التنبيهات التشغيلية' : 'Operational Alerts'}
              className={`relative flex items-center justify-center w-8 h-8 rounded-md border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1 -end-1 px-1 min-w-4 h-4 rounded bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute top-10 end-0 w-80 bg-white text-slate-900 rounded-lg border border-slate-200 shadow-xl p-3 space-y-2 z-50 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">
                    {language === 'ar' ? 'التنبيهات والمهام المعلقة' : 'System Alerts'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('inventory');
                    setIsNotificationsOpen(false);
                  }}
                  className="w-full p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-start transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        {language === 'ar' ? 'أصناف بلغت حد إعادة الطلب' : 'Low Stock Alerts'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {language === 'ar' ? 'مراجعة أرصدة المستودعات' : 'Review inventory levels'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-700">{lowStockCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('businessModules');
                    setIsNotificationsOpen(false);
                  }}
                  className="w-full p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-start transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-slate-700 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        {language === 'ar' ? 'طلبات اعتماد معلقة' : 'Pending Approvals'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {language === 'ar' ? 'بانتظار موافقة الإدارة' : 'Awaiting decision'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{pendingWorkflowsCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pos');
                    setIsNotificationsOpen(false);
                  }}
                  className="w-full p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-start transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        {language === 'ar' ? 'طلبات المطبخ النشطة (KDS)' : 'Active Kitchen Orders'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {language === 'ar' ? 'طلبات قيد التحضير' : 'Orders in preparation'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">{activeKotCount}</span>
                </button>
              </div>
            )}
          </div>

          <PWAInstallButton />

          {/* Unboxed / Clean License Status Trigger */}
          <button
            type="button"
            data-testid="navbar-license-btn"
            onClick={() => setActiveTab('security')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-xs font-medium transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={language === 'ar' ? 'حالة الترخيص وبصمة الجهاز' : 'Hardware License Status'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                protectionState.status === 'LICENSE_ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="font-mono text-[11px]">
              {protectionState.status === 'LICENSE_ACTIVE'
                ? language === 'ar'
                  ? 'مرخص'
                  : 'Licensed'
                : language === 'ar'
                ? `نسخة تجريبية · ${protectionState.trialRemainingDays}ي`
                : `Trial · ${protectionState.trialRemainingDays}d`}
            </span>
          </button>

          {/* LAN Local Network Status Badge & Mobile Access Trigger */}
          {masterSystemConfig.uiElementsVisibility.showLanNetworkBanner && networkInfo && (
            <button
              type="button"
              data-testid="navbar-lan-badge"
              onClick={() => openQuickSendModal({ channel: 'WHATSAPP', category: 'CUSTOM_OPERATION', messageBody: `رابط الدخول للنظام عبر الشبكة الداخلية: ${networkInfo.primaryLanUrl}` })}
              className={`hidden xl:flex items-center gap-1.5 px-2 h-8 rounded-md border text-[11px] font-mono transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-sky-400 hover:bg-slate-800'
                  : 'bg-sky-50/70 border-sky-200 text-sky-800 hover:bg-sky-100'
              }`}
              title={`LAN Network Access: ${networkInfo.primaryLanUrl} (انقر لمشاركة الرابط)`}
            >
              <Wifi className="w-3.5 h-3.5 text-sky-500 shrink-0 animate-pulse" />
              <span>LAN: {networkInfo.primaryLanUrl.replace('http://', '')}</span>
            </button>
          )}

          {/* Hidden Master Admin Quick Access Button (Only visible when logged in as sysadmin) */}
          {currentAccount.isHiddenMasterAdmin && (
            <button
              type="button"
              data-testid="navbar-master-admin-btn"
              onClick={() => setActiveTab('masterAdmin')}
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-sm"
              title={language === 'ar' ? 'لوحة الإدارة العليا المخفية للنظام' : 'Hidden Master System Admin'}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {language === 'ar' ? 'إدارة النظام العليا' : 'Master Admin'}
              </span>
            </button>
          )}

          {/* Global Currency Selector (YER / SAR / USD / AED / EUR / EGP) */}
          {(masterSystemConfig.uiElementsVisibility.showCurrencySwitcher ||
            currentAccount.isHiddenMasterAdmin) && (
            <select
              data-testid="navbar-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className={`hidden sm:inline-block h-8 px-2 rounded-md border text-xs font-mono font-semibold outline-hidden cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={t('currency')}
            >
              <option value="YER" className="text-slate-900 bg-white">
                YER (ر.ي - ريال يمني)
              </option>
              <option value="SAR" className="text-slate-900 bg-white">
                SAR (ر.س - ريال سعودي)
              </option>
              <option value="USD" className="text-slate-900 bg-white">
                USD ($ - دولار أمريكي)
              </option>
              <option value="AED" className="text-slate-900 bg-white">
                AED (د.إ - درهم إماراتي)
              </option>
              <option value="EUR" className="text-slate-900 bg-white">
                EUR (€ - يورو)
              </option>
              <option value="EGP" className="text-slate-900 bg-white">
                EGP (ج.م - جنيه مصري)
              </option>
            </select>
          )}

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className={`flex items-center gap-1 h-8 px-2 rounded-md border text-xs font-semibold transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={t('language')}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Settings Trigger with 7-Click Rapid Developer Trigger */}
          <button
            type="button"
            data-testid="navbar-settings-stealth-trigger"
            onClick={handleSettingsRapidClick}
            title={language === 'ar' ? 'الإعدادات العامة للنظام' : 'System Settings'}
            className={`flex items-center justify-center w-8 h-8 rounded-md border text-xs transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 ps-1.5 border-s border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-1.5 px-2 h-8 rounded-md border text-xs font-semibold cursor-pointer transition ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
              title={language === 'ar' ? 'العضوية والصلاحيات' : 'User Profile & Role'}
            >
              <span className="w-5 h-5 rounded bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-mono font-bold text-[10px]">
                {currentAccount.username.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden sm:inline font-mono text-[11px]">{currentAccount.username}</span>
            </button>

            <button
              type="button"
              data-testid="navbar-logout-btn"
              onClick={logout}
              title={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-900 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

