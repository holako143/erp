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
  Lock,
} from 'lucide-react';
import { SystemNotificationCenterModal } from '../common/SystemNotificationCenterModal';
import { generateSystemNotifications } from '../../core/notificationsEngine';
import {
  GlobalPopoverId,
  derivePopoverFlags,
  toggleExclusivePopover,
  closeAllPopovers,
  evaluateGlobalClickOutside,
} from '../../core/globalPopoverManager';
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
    nameAr: 'لومينا حاسب المؤسسي (افتراضي مريح)',
    nameEn: 'Haseb Lumina Slate',
    descAr: 'خلفية ثلجية (#F8FAFC) وبطاقات بيضاء مع كحلي عميق وياقوت أزرق',
    swatchBg: 'bg-[#0F172A]',
    sidebarHex: '#FFFFFF',
    canvasHex: '#F8FAFC',
    accentHex: '#2563EB',
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
    id: 'ibm_plex' as const,
    nameAr: 'خط بليكس المصرفي (IBM Plex Sans Arabic)',
    descAr: 'الخط الافتراضي — هندسي ومصرفي رسمي فائق الوضوح',
  },
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
];

export type HasebFontId = (typeof HASEB_FONTS_LIST)[number]['id'];

export interface NavbarOutsideDismissalInput {
  isNotificationsOpen: boolean;
  isProfileMenuOpen: boolean;
  clickedInsideNotifications: boolean;
  clickedInsideProfileMenu: boolean;
}

export function evaluateNavbarOutsideClickDismissal(input: NavbarOutsideDismissalInput): {
  nextNotificationsOpen: boolean;
  nextProfileMenuOpen: boolean;
} {
  return {
    nextNotificationsOpen:
      input.isNotificationsOpen && !input.clickedInsideNotifications
        ? false
        : input.isNotificationsOpen,
    nextProfileMenuOpen:
      input.isProfileMenuOpen && !input.clickedInsideProfileMenu
        ? false
        : input.isProfileMenuOpen,
  };
}

export const Navbar: React.FC = () => {
  const {
    isAuthenticated,
    language,
    setLanguage,
    currency,
    setCurrency,
    t,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    currentAccount,
    activeTab,
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
    setIsStandaloneKeygenOpen,
    isLanPortalOpen,
    openLanPortal,
    closeLanPortal,
    quickSendModalState,
    closeQuickSendModal,
  } = useERP();

  const [activePopover, setActivePopover] = useState<GlobalPopoverId>('NONE');
  const popoverFlags = derivePopoverFlags(activePopover);
  const isNotificationsOpen = popoverFlags.isNotificationsOpen;
  const isProfileMenuOpen = popoverFlags.isProfileMenuOpen;

  const setIsNotificationsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    setActivePopover((prev) => {
      const currentBool = prev === 'NOTIFICATIONS';
      const resolved = typeof next === 'function' ? next(currentBool) : next;
      return resolved ? 'NOTIFICATIONS' : prev === 'NOTIFICATIONS' ? 'NONE' : prev;
    });
  };

  const setIsProfileMenuOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    setActivePopover((prev) => {
      const currentBool = prev === 'PROFILE_SETTINGS';
      const resolved = typeof next === 'function' ? next(currentBool) : next;
      return resolved ? 'PROFILE_SETTINGS' : prev === 'PROFILE_SETTINGS' ? 'NONE' : prev;
    });
  };

  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const profileContainerRef = useRef<HTMLDivElement | null>(null);

  const [uiFont, setUiFont] = useState<HasebFontId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('haseb_ui_font') as HasebFontId | null;
      if (saved && ['cairo', 'readex', 'tajawal', 'ibm_plex'].includes(saved)) {
        return saved;
      }
    }
    return 'ibm_plex';
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

  // If any global modal (Command Palette, LAN Portal, Quick Send Modal) opens, automatically close Navbar popovers
  useEffect(() => {
    if (isCommandPaletteOpen || isLanPortalOpen || quickSendModalState.isOpen) {
      setActivePopover(closeAllPopovers());
    }
  }, [isCommandPaletteOpen, isLanPortalOpen, quickSendModalState.isOpen]);

  // Global Click-Outside & Escape Handler for all Navigation Bar Popovers/Dropdowns
  useEffect(() => {
    if (activePopover === 'NONE') return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;

      const clickedInsideNotifications = Boolean(
        notificationsContainerRef.current && notificationsContainerRef.current.contains(targetNode)
      );
      const clickedInsideProfileMenu = Boolean(
        profileContainerRef.current && profileContainerRef.current.contains(targetNode)
      );

      const clickedInsideActiveContent =
        (activePopover === 'NOTIFICATIONS' && clickedInsideNotifications) ||
        (activePopover === 'PROFILE_SETTINGS' && clickedInsideProfileMenu);

      const evalResult = evaluateGlobalClickOutside({
        activePopover,
        clickedInsidePopoverContent: clickedInsideActiveContent,
        clickedTriggerPopoverId: null,
      });

      if (evalResult.didClose) {
        setActivePopover(evalResult.nextPopover);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePopover(closeAllPopovers());
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePopover]);

  const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const totalAlertsCount = systemNotifications.length;
  const connectedWaCount = whatsappAccounts.filter((a) => a.session.status === 'CONNECTED').length;

  const isDark = uiTheme === 'obsidian_dark';
  const isSand = uiTheme === 'haseb_sand';

  const activeTabLabelMap: Record<string, { ar: string; en: string }> = {
    pos: { ar: 'نقطة البيع', en: 'POS' },
    inventory: { ar: 'المخزون', en: 'Inventory' },
    sales: { ar: 'المبيعات', en: 'Sales' },
    accounting: { ar: 'المحاسبة', en: 'Accounting' },
    reportsAndAI: { ar: 'التقارير', en: 'Reports' },
    dashboard: { ar: 'الرئيسية', en: 'Dashboard' },
    communications: { ar: 'خدمات التواصل', en: 'Communications' },
    settings: { ar: 'الإعدادات', en: 'Settings' },
    security: { ar: 'الأمان', en: 'Security' },
  };
  const currentTabBadge = activeTabLabelMap[activeTab]
    ? language === 'ar'
      ? activeTabLabelMap[activeTab].ar
      : activeTabLabelMap[activeTab].en
    : language === 'ar'
    ? 'نقطة البيع'
    : 'POS';

  const rawAccountName = language === 'ar' ? currentAccount.nameAr : currentAccount.name;
  const cleanAccountName = rawAccountName.replace(/\s*\(.*?\)\s*/g, '').trim() || rawAccountName;
  const accountWords = cleanAccountName
    .replace(/^م\.\s*|^Eng\.\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const accountInitials =
    accountWords.length >= 2
      ? `${accountWords[0][0]}${accountWords[1][0]}`
      : cleanAccountName.slice(0, 2).toUpperCase();

  return (
    <header
      className={`h-14 border-b px-5 flex items-center justify-between shrink-0 z-30 transition-colors duration-200 relative ${
        isDark
          ? 'bg-[#0B111E] border-slate-800/90 text-slate-100'
          : isSand
          ? 'bg-[#fbf8f2] border-[#dfd3be] text-stone-900'
          : 'bg-white border-slate-200/70 text-slate-900'
      }`}
    >
      {/* Right: Brand Identity & Active Module Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          data-testid="haseb-brand-identity"
          onClick={() => {
            setActivePopover(closeAllPopovers());
            closeLanPortal();
            closeQuickSendModal();
            setIsCommandPaletteOpen(false);
            setActiveTab('pos');
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            ح
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              {language === 'ar' ? 'حاسب ERP' : 'Haseb ERP'}
            </span>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">
              {currentTabBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar (Rounded Full Pill with Ctrl + K) */}
      <div className="flex-1 max-w-xl mx-6">
        <button
          type="button"
          onClick={() => {
            setActivePopover(closeAllPopovers());
            closeLanPortal();
            closeQuickSendModal();
            setIsCommandPaletteOpen(true);
          }}
          className={`relative w-full flex items-center justify-between border rounded-full py-2 pr-9 pl-16 text-xs transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              : 'bg-slate-50 hover:bg-white border-slate-200/70 hover:border-slate-300 text-slate-400'
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <span className="truncate">
            {language === 'ar'
              ? 'ابحث بالاسم، الباركود، الرقم التسلسلي، أو العميل...'
              : 'Search by name, barcode, serial number, or customer...'}
          </span>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd
              className={`px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-400'
                  : 'text-slate-400 bg-white border-slate-200/80'
              }`}
            >
              Ctrl + K
            </kbd>
          </div>
        </button>
      </div>

      {/* Left: Notifications Bell (Instead of 'متصل'), Logged-in Membership Capsule, and Close Shift Action */}
      <div className="flex items-center gap-2.5 shrink-0 relative">
        {/* System Notifications Bell Button (Anchored Downward Dropdown) */}
        <div ref={notificationsContainerRef} className="relative">
          <button
            type="button"
            data-testid="navbar-notifications-btn"
            aria-expanded={isNotificationsOpen}
            onClick={() => {
              closeLanPortal();
              closeQuickSendModal();
              setIsCommandPaletteOpen(false);
              setActivePopover((prev) => toggleExclusivePopover(prev, 'NOTIFICATIONS'));
            }}
            title={
              language === 'ar'
                ? `مركز الإشعارات والتنبيهات التشغيلية (${totalAlertsCount})`
                : `System Notifications (${totalAlertsCount})`
            }
            className={`relative flex items-center justify-center w-9 h-9 rounded-full border transition cursor-pointer ${
              isNotificationsOpen
                ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                : isDark
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            {totalAlertsCount > 0 && (
              <span className="absolute -top-1 -end-1 px-1 min-w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-2xs">
                {totalAlertsCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <SystemNotificationCenterModal
              isOpen={isNotificationsOpen}
              onClose={() => setActivePopover(closeAllPopovers())}
            />
          )}
        </div>

        {/* Logged-In Membership & Shift Capsule (Opens Unified Membership, Themes, Fonts, Scale & Settings Menu) */}
        <div ref={profileContainerRef} className="relative">
          <button
            type="button"
            data-testid="navbar-profile-dropdown-trigger"
            aria-expanded={isProfileMenuOpen}
            onClick={() => {
              closeLanPortal();
              closeQuickSendModal();
              setIsCommandPaletteOpen(false);
              setActivePopover((prev) => toggleExclusivePopover(prev, 'PROFILE_SETTINGS'));
            }}
            title={
              language === 'ar'
                ? `العضوية الحالية: ${currentAccount.nameAr} — المظهر والخطوط والحجم والإعدادات`
                : `Current Account: ${currentAccount.name} — Appearance, Fonts, Scale & Settings`
            }
            className={`flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-full border transition cursor-pointer ${
              isProfileMenuOpen
                ? isDark
                  ? 'bg-slate-800 border-blue-500 text-white'
                  : 'bg-slate-100 border-slate-300 text-slate-900'
                : isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800'
                : 'border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div
              data-testid="navbar-theme-picker-btn"
              className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0"
            >
              {accountInitials}
            </div>
            <div className="text-[11px] leading-none flex items-center gap-1.5">
              <span
                data-testid="navbar-logged-in-account-name"
                className="font-semibold text-slate-700 dark:text-slate-200 max-w-[160px] truncate"
              >
                {cleanAccountName}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-mono" dir="ltr">
                @{currentAccount.username}
              </span>
            </div>
          </button>

          {isProfileMenuOpen && (
            <div
              data-testid="navbar-profile-dropdown-menu"
              className={`absolute top-11 left-0 w-88 sm:w-[420px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-4.75rem)] overflow-y-auto overflow-x-hidden rounded-2xl border shadow-2xl p-3.5 z-50 text-xs ${
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
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                      <UserAvatarIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-xs truncate">
                        {language === 'ar' ? currentAccount.nameAr : currentAccount.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                        {currentAccount.role} • @{currentAccount.username}
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

                {/* Windows Desktop & LAN + Communication Services Quick Launch Row */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <button
                    type="button"
                    data-testid="navbar-whatsapp-station-btn"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setActiveTab('communications');
                    }}
                    className={`min-w-0 overflow-hidden flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'خدمات التواصل' : 'Communications'}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600/15 text-emerald-700 font-mono text-[10px] shrink-0">
                      {connectedWaCount}/{whatsappAccounts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="navbar-lan-portal-btn"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      openLanPortal();
                    }}
                    className={`min-w-0 overflow-hidden flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <MonitorSmartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'سطح المكتب والشبكة' : 'Desktop & LAN'}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] shrink-0">
                      متصل
                    </span>
                  </button>
                </div>

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

        {/* Quiet Close Shift Action */}
        <button
          type="button"
          data-testid="navbar-close-shift-btn"
          onClick={() => {
            setIsNotificationsOpen(false);
            setIsProfileMenuOpen(false);
            setActiveTab('pos');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('haseb-open-close-shift-modal'));
            }, 40);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-rose-700 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'إغلاق الوردية' : 'Close Shift'}</span>
        </button>
      </div>
    </header>
  );
};
