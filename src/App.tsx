/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Profiler, Suspense, lazy, useCallback, useEffect, useMemo } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { OfflineIndicator, useOnlineStatus } from './components/layout/PWAInstallBanner';
import { LoginGate } from './components/security/LoginGate';
import { HardwareLockModal } from './components/security/HardwareLockModal';
import {
  ShieldAlert,
  MessageSquare,
  Send,
  Zap,
  BellRing,
  X,
  ArrowUpLeft,
  CheckCircle2,
  RefreshCw,
  CloudUpload,
  WifiOff,
} from 'lucide-react';
import { HasebBrandLogo } from './components/common/HasebBrandLogo';
import { ThemeToastStack } from './components/common/ThemeToastStack';
import { computeFooterSyncStatusMeta } from './core/realtimeSyncEngine';
import { useAlertSound } from './hooks/useAlertSound';

// Eager initial view for instant first paint on POS default route
import { POSView } from './views/POSView';
import { performanceTelemetryStore } from './core/performanceMonitorEngine';

// Lazy-loaded Views (Code-Split Chunks)
const DashboardView = lazy(() =>
  import('./views/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const BarcodeEngineView = lazy(() =>
  import('./views/BarcodeEngineView').then((m) => ({ default: m.BarcodeEngineView }))
);
const InventoryView = lazy(() =>
  import('./views/InventoryView')
);
const PurchasingView = lazy(() =>
  import('./views/PurchasingView').then((m) => ({ default: m.PurchasingView }))
);
const SalesView = lazy(() =>
  import('./views/SalesView').then((m) => ({ default: m.SalesView }))
);
const AccountingView = lazy(() =>
  import('./views/AccountingView').then((m) => ({ default: m.AccountingView }))
);
const BusinessModulesView = lazy(() =>
  import('./views/BusinessModulesView').then((m) => ({ default: m.BusinessModulesView }))
);
const ReportsAnalyticsAndAIView = lazy(() =>
  import('./views/ReportsAnalyticsAndAIView').then((m) => ({ default: m.ReportsAnalyticsAndAIView }))
);
const SaaSAdminView = lazy(() =>
  import('./views/SaaSAdminView').then((m) => ({ default: m.SaaSAdminView }))
);
const SettingsView = lazy(() =>
  import('./views/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const SecurityCenterView = lazy(() =>
  import('./views/SecurityCenterView').then((m) => ({ default: m.SecurityCenterView }))
);
const MasterAdminControlView = lazy(() =>
  import('./views/MasterAdminControlView').then((m) => ({ default: m.MasterAdminControlView }))
);
const StandaloneActivationPortal = lazy(() =>
  import('./views/StandaloneActivationPortal').then((m) => ({ default: m.StandaloneActivationPortal }))
);
const CommunicationsView = lazy(() =>
  import('./views/CommunicationsView').then((m) => ({ default: m.CommunicationsView }))
);

// Lazy-loaded Global Modals
const CommandPalette = lazy(() =>
  import('./components/layout/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);
const QuickSendModal = lazy(() =>
  import('./components/messaging/QuickSendModal').then((m) => ({ default: m.QuickSendModal }))
);
const CrossBranchStockModal = lazy(() =>
  import('./components/common/CrossBranchStockModal').then((m) => ({ default: m.CrossBranchStockModal }))
);
const OnboardingWizardModal = lazy(() =>
  import('./components/common/OnboardingWizardModal').then((m) => ({ default: m.OnboardingWizardModal }))
);
const MobileLanPortalModal = lazy(() =>
  import('./components/common/MobileLanPortalModal').then((m) => ({ default: m.MobileLanPortalModal }))
);
const ShiftControlModal = lazy(() =>
  import('./components/common/ShiftControlModal').then((m) => ({ default: m.ShiftControlModal }))
);

const ViewLoadingFallback: React.FC<{
  language: 'ar' | 'en';
  uiTheme: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark';
}> = React.memo(({ language, uiTheme }) => (
  <div
    data-testid="lazy-view-fallback"
    className="flex flex-col items-center justify-center min-h-[360px] h-full w-full p-6 select-none"
  >
    <div
      className={`relative flex flex-col items-center gap-4 px-8 py-7 rounded-3xl border shadow-lg transition-all ${
        uiTheme === 'obsidian_dark'
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : uiTheme === 'haseb_sand'
          ? 'bg-[#fbf8f2] border-[#dfd3be] text-stone-900'
          : 'bg-white/95 border-slate-200/80 text-slate-900'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute -inset-2.5 rounded-3xl opacity-35 blur-md haseb-card-gradient animate-pulse"
        />
        <HasebBrandLogo size="xl" theme={uiTheme} className="relative z-10 shadow-xl" />
      </div>

      <div className="text-center space-y-1">
        <div className="text-sm font-black tracking-tight">
          {language === 'ar' ? 'نظام حاسب المحاسبي المتكامل' : 'Haseb Enterprise ERP'}
        </div>
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {language === 'ar' ? 'جاري تجهيز الواجهة والبيانات...' : 'Preparing module workspace...'}
        </div>
      </div>

      <div className="w-44 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
        <div className="w-20 h-full rounded-full haseb-shimmer-bar" />
      </div>
    </div>
  </div>
));
ViewLoadingFallback.displayName = 'ViewLoadingFallback';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isAuthenticated,
    isTerminalLocked,
    lockTerminal,
    idleTimeoutMinutes,
    currentAccount,
    hasModuleAccess,
    antiTheftShieldEnabled,
    recordBlockedInspectAttempt,
    blockedInspectCount,
    lastSecurityAlert,
    uiTheme,
    uiDensity,
    isStandaloneKeygenOpen,
    setIsStandaloneKeygenOpen,
    masterSystemConfig,
    language,
    openLanPortal,
    isOnboardingCompleted,
    isOnboardingOpen,
    closeOnboarding,
    setIsCommandPaletteOpen,
    openQuickSendModal,
    whatsappAccounts,
    company,
    currentWarehouse,
    activeToastNotification,
    toastQueue,
    dismissToastNotification,
    pauseToastTimer,
    pendingSyncTransactionsCount,
    isServerSyncing,
    flushPendingSyncQueue,
    realtimeSyncStatus,
    isInitialServerSyncDone,
    connectedLanDevices,
    soundAlertPrefs,
  } = useERP();

  const isOnline = useOnlineStatus();

  // Play subtle, theme-appropriate audio cues when toast notifications or security alerts appear
  useAlertSound({
    uiTheme,
    preferences: soundAlertPrefs,
    activeToastNotification,
    lastSecurityAlert,
    blockedInspectCount,
  });

  const footerSyncMeta = useMemo(
    () =>
      computeFooterSyncStatusMeta({
        pendingCount: pendingSyncTransactionsCount,
        isOnline,
        isSyncing: isServerSyncing,
        realtimeSyncStatus,
      }),
    [pendingSyncTransactionsCount, isOnline, isServerSyncing, realtimeSyncStatus]
  );

  const connectedWhatsAppCount = useMemo(
    () => whatsappAccounts.filter((acc) => acc.session.status === 'CONNECTED').length,
    [whatsappAccounts]
  );

  const handleViewRenderProfile = useCallback(
    (
      id: string,
      phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number
    ) => {
      performanceTelemetryStore.recordSample(id, actualDuration, phase);
    },
    []
  );

  // Global Anti-Theft Source Code Protection Shield & Fast Keyboard Shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (!antiTheftShieldEnabled) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
      recordBlockedInspectAttempt('Right-Click Inspect');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      // Authenticated Master Admin Shortcut: Ctrl+Shift+M (no credential bypass)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'M') {
        if (
          isAuthenticated &&
          (currentAccount.role === 'SUPER_ADMIN' || currentAccount.role === 'MASTER_SYSTEM_ADMIN')
        ) {
          e.preventDefault();
          setActiveTab('masterAdmin');
        }
        return;
      }

      // Quick Terminal Lock Shortcut: Ctrl+L
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'L') {
        if (isAuthenticated && !isTerminalLocked) {
          e.preventDefault();
          lockTerminal();
        }
        return;
      }

      // Standalone Licensing Portal Shortcut: Ctrl+Shift+L
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'L') {
        e.preventDefault();
        setIsStandaloneKeygenOpen(true);
        return;
      }

      // Fast Function Key Shortcuts (F1 - F7)
      if (isAuthenticated && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === 'F1') {
          e.preventDefault();
          setActiveTab('dashboard');
          return;
        }
        if (e.key === 'F2' && hasModuleAccess('pos')) {
          e.preventDefault();
          setActiveTab('pos');
          return;
        }
        if (e.key === 'F3' && hasModuleAccess('inventory')) {
          e.preventDefault();
          setActiveTab('inventory');
          return;
        }
        if (e.key === 'F4' && hasModuleAccess('sales')) {
          e.preventDefault();
          setActiveTab('sales');
          return;
        }
        if (e.key === 'F6' && hasModuleAccess('purchasing')) {
          e.preventDefault();
          setActiveTab('purchasing');
          return;
        }
        if (e.key === 'F7' && hasModuleAccess('accounting')) {
          e.preventDefault();
          setActiveTab('accounting');
          return;
        }
        if (e.key === 'F8') {
          e.preventDefault();
          if (activeTab !== 'pos') {
            setActiveTab('pos');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('haseb-open-pos-customer-picker'));
            }, 60);
          } else {
            window.dispatchEvent(new CustomEvent('haseb-open-pos-customer-picker'));
          }
          return;
        }
      }

      if (!antiTheftShieldEnabled) return;

      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        recordBlockedInspectAttempt('F12 DevTools');
        return;
      }
      // Block Ctrl+Shift+I / J / C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === 'I' || key === 'J' || key === 'C')) {
        e.preventDefault();
        recordBlockedInspectAttempt(`Ctrl+Shift+${key}`);
        return;
      }
      // Block Ctrl+U (View Source) or Ctrl+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (key === 'U' || key === 'S')) {
        e.preventDefault();
        recordBlockedInspectAttempt(`Ctrl+${key} Source Dump`);
      }
    };

    // Universal Click-Outside & Escape Dismissal for all Modal Backdrops across the App
    const triggerModalDismissButton = (backdropEl: HTMLElement) => {
      // Do not auto-dismiss mandatory security lock screen
      if (backdropEl.hasAttribute('data-mandatory-lock')) return;
      const buttons = Array.from(backdropEl.querySelectorAll('button'));
      const closeBtn = buttons.find((btn) => {
        const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const text = (btn.textContent || '').trim();
        if (
          testId.includes('close') ||
          testId.includes('cancel') ||
          ariaLabel.includes('إغلاق') ||
          ariaLabel.includes('close') ||
          title.includes('إغلاق') ||
          title.includes('close')
        ) {
          return true;
        }
        if (
          text === '✕' ||
          text === '×' ||
          text === 'إغلاق' ||
          text === 'إلغاء' ||
          text === 'إغلاق النافذة' ||
          text === 'Cancel' ||
          text === 'Close'
        ) {
          return true;
        }
        // Check if button only contains an X icon (lucide-x)
        if (text === '' && btn.querySelector('svg.lucide-x')) {
          return true;
        }
        return false;
      });
      if (closeBtn) {
        closeBtn.click();
      }
    };

    const handleGlobalModalBackdropPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.classList &&
        target.classList.contains('fixed') &&
        target.classList.contains('inset-0')
      ) {
        // Defer slightly so explicit React onMouseDown handlers run first without double-firing
        setTimeout(() => {
          if (document.body.contains(target)) {
            triggerModalDismissButton(target);
          }
        }, 10);
      }
    };

    const handleGlobalEscapeDismiss = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const openBackdrops = Array.from(
        document.querySelectorAll<HTMLElement>('div.fixed.inset-0')
      );
      if (openBackdrops.length > 0) {
        const topmostBackdrop = openBackdrops[openBackdrops.length - 1];
        setTimeout(() => {
          if (document.body.contains(topmostBackdrop)) {
            triggerModalDismissButton(topmostBackdrop);
          }
        }, 10);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleGlobalEscapeDismiss);
    document.addEventListener('mousedown', handleGlobalModalBackdropPointerDown);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleGlobalEscapeDismiss);
      document.removeEventListener('mousedown', handleGlobalModalBackdropPointerDown);
    };
  }, [
    antiTheftShieldEnabled,
    recordBlockedInspectAttempt,
    isAuthenticated,
    isTerminalLocked,
    lockTerminal,
    currentAccount.role,
    hasModuleAccess,
    activeTab,
    setActiveTab,
    setIsStandaloneKeygenOpen,
  ]);

  // Automatic Idle Terminal Lock based on idleTimeoutMinutes
  useEffect(() => {
    if (!isAuthenticated || isTerminalLocked || idleTimeoutMinutes <= 0) return;
    let timeoutId: number;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        lockTerminal();
      }, idleTimeoutMinutes * 60 * 1000);
    };
    resetTimer();
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'] as const;
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [isAuthenticated, isTerminalLocked, idleTimeoutMinutes, lockTerminal]);

  const renderActiveView = useCallback(() => {
    if (activeTab === 'masterAdmin' && hasModuleAccess('masterAdmin')) {
      return <MasterAdminControlView />;
    }

    // Always allow Settings, Security, Communications, and Sales when opened from topbar/footer or POS/Inventory action buttons
    if (activeTab === 'settings') {
      return <SettingsView />;
    }
    if (activeTab === 'security') {
      return <SecurityCenterView />;
    }
    if (activeTab === 'communications') {
      return <CommunicationsView />;
    }
    if (activeTab === 'sales') {
      return <SalesView />;
    }
    if (activeTab === 'reportsAndAI') {
      return <ReportsAnalyticsAndAIView />;
    }

    // Enforce RBAC & Master Admin module visibility
    if (!hasModuleAccess(activeTab)) {
      return <POSView />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'barcodeEngine':
        return <BarcodeEngineView />;
      case 'inventory':
        return <InventoryView />;
      case 'purchasing':
        return <PurchasingView />;
      case 'sales':
        return <SalesView />;
      case 'pos':
        return <POSView />;
      case 'accounting':
        return <AccountingView />;
      case 'reportsAndAI':
        return <ReportsAnalyticsAndAIView />;
      case 'businessModules':
        return <BusinessModulesView />;
      case 'aiInsights':
        return <ReportsAnalyticsAndAIView />;
      case 'saasPlatform':
        return <SaaSAdminView />;
      case 'security':
        return <SecurityCenterView />;
      case 'settings':
        return <SettingsView />;
      case 'communications':
        return <CommunicationsView />;
      default:
        return <POSView />;
    }
  }, [activeTab, hasModuleAccess]);

  const handleOpenFooterCustomerPicker = useCallback(() => {
    setActiveTab('pos');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('haseb-open-pos-customer-picker'));
    }, 30);
  }, [setActiveTab]);

  const handleTriggerFooterInstantPay = useCallback(() => {
    setActiveTab('pos');
    window.dispatchEvent(new CustomEvent('haseb-trigger-pos-checkout'));
  }, [setActiveTab]);

  const handleOpenFooterQuickSend = useCallback(() => {
    openQuickSendModal({
      recipientName: language === 'ar' ? 'عميل مباشر' : 'Direct Customer',
      recipientPhone: '',
      channel: 'WHATSAPP',
      category: 'CUSTOM_OPERATION',
      referenceNumber: `MSG-${Date.now().toString().slice(-4)}`,
      messageBody:
        language === 'ar'
          ? `مرحباً بكم في ${company.nameAr || 'منشأتنا'}.`
          : `Welcome to ${company.name || 'our company'}.`,
    });
  }, [language, openQuickSendModal, company.nameAr, company.name]);

  return (
    <>
      <ThemeToastStack
        uiTheme={uiTheme}
        language={language}
        toastQueue={toastQueue}
        lastSecurityAlert={lastSecurityAlert}
        onDismissToast={dismissToastNotification}
        onPauseToastTimer={pauseToastTimer}
        onNavigateAction={(mapAction) => {
          if (mapAction === 'POS') setActiveTab('pos');
          else if (mapAction === 'SALES') setActiveTab('sales');
          else if (mapAction === 'INVENTORY' || mapAction === 'BRANCH_TRANSFERS') {
            setActiveTab('inventory');
          } else if (mapAction === 'PURCHASING') setActiveTab('purchasing');
          else if (mapAction === 'COMMUNICATIONS') setActiveTab('communications');
          else if (mapAction === 'SETTINGS') setActiveTab('settings');
          else if (mapAction === 'DEBTS' || mapAction === 'BACKUP') setActiveTab('accounting');
          else if (mapAction === 'MAINTENANCE') setActiveTab('businessModules');
        }}
      />

      {/* Mandatory 30-Day Trial, Single-Device Component Lock & Anti-Clock Rollback Gate */}
      <HardwareLockModal />

      {/* Decoupled Standalone Cryptographic Licensing & Keygen Server (Must render above HardwareLockModal) */}
      {isStandaloneKeygenOpen && (
        <Suspense fallback={<ViewLoadingFallback language={language} uiTheme={uiTheme} />}>
          <StandaloneActivationPortal />
        </Suspense>
      )}

      {/* Mandatory First-Launch Welcome Wizard OR Encrypted Login / Terminal Unlock Gate */}
      {!isInitialServerSyncDone && !isAuthenticated ? (
        <div
          data-testid="initial-server-sync-loader"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className={`min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 ${
            uiTheme === 'obsidian_dark'
              ? 'bg-[#080c14] text-slate-100'
              : 'bg-[#f8fafc] text-slate-900'
          }`}
        >
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mb-3" />
          <p className="text-sm font-bold">
            {language === 'ar'
              ? 'جاري مزامنة النظام الموحد مع الخادم...'
              : 'Synchronizing unified ERP state...'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ar'
              ? 'يتم ربط الجلسة ببيانات المنشأة والمخزون والفواتير لحظياً'
              : 'Connecting session to live company & inventory data'}
          </p>
        </div>
      ) : !isAuthenticated ? (
        !isOnboardingCompleted ? (
          <Suspense fallback={<ViewLoadingFallback language={language} uiTheme={uiTheme} />}>
            <OnboardingWizardModal isOpen isMandatoryFirstRun onClose={closeOnboarding} />
          </Suspense>
        ) : (
          <LoginGate />
        )
      ) : isTerminalLocked ? (
        <LoginGate />
      ) : (
        <div
          className={`h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
            uiTheme === 'obsidian_dark'
              ? 'bg-[#080c14] text-slate-100'
              : uiTheme === 'swiss_light'
              ? 'bg-[#f8fafc] text-slate-800'
              : uiTheme === 'haseb_royal'
              ? 'bg-[#f8fafc] text-slate-800'
              : uiTheme === 'haseb_sand'
              ? 'bg-[#f3ede2] text-stone-900'
              : 'bg-[#F8FAFC] text-slate-800'
          }`}
        >
          {/* Top Enterprise Bar — rendered exclusively when authenticated */}
          {isAuthenticated && <Navbar />}

          {/* Main Workspace with Sidebar & Dynamic View */}
          <div className="flex-1 min-h-0 flex w-full overflow-hidden">
            {isAuthenticated && <Sidebar />}
            <main
              className={`flex-1 min-w-0 min-h-0 w-full max-w-full ${
                activeTab === 'pos'
                  ? 'overflow-hidden flex flex-col pb-0'
                  : uiDensity === 'compact'
                  ? 'overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 pb-20 lg:pb-4'
                  : 'overflow-y-auto overflow-x-hidden p-3 sm:p-5 pb-20 lg:pb-5'
              }`}
            >
              <Profiler id={activeTab} onRender={handleViewRenderProfile}>
                <Suspense fallback={<ViewLoadingFallback language={language} uiTheme={uiTheme} />}>
                  {renderActiveView()}
                </Suspense>
              </Profiler>
            </main>
          </div>

          {/* Bottom Shortcuts & WhatsApp Bar (Lumina / Haseb ERP Reference) */}
          {masterSystemConfig.uiElementsVisibility.showKeyboardShortcutsBar && (
            <footer
              data-testid="keyboard-shortcuts-bar"
              className={`hidden lg:flex shrink-0 items-center justify-between px-5 h-9 border-t text-[11px] select-none z-30 ${
                uiTheme === 'obsidian_dark'
                  ? 'bg-[#080c14] border-slate-800 text-slate-400'
                  : 'bg-white border-slate-200/70 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-3.5 text-slate-500 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                    F1
                  </kbd>
                  <span>{language === 'ar' ? 'مسح الباركود' : 'Scan Barcode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                    F2
                  </kbd>
                  <span>{language === 'ar' ? 'نقطة البيع' : 'POS'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                    F3
                  </kbd>
                  <span>{language === 'ar' ? 'المخزون' : 'Inventory'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                    F4
                  </kbd>
                  <span>{language === 'ar' ? 'المبيعات' : 'Sales'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('accounting')}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                    F7
                  </kbd>
                  <span>{language === 'ar' ? 'المحاسبة' : 'Accounting'}</span>
                </button>
                <button
                  type="button"
                  data-testid="footer-f8-customer-picker-btn"
                  onClick={handleOpenFooterCustomerPicker}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-[10px] font-mono font-semibold text-blue-700 dark:text-blue-300">
                    F8
                  </kbd>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {language === 'ar' ? 'العميل المستفيد' : 'Select Customer'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerFooterInstantPay}
                  className="flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-900 dark:bg-blue-600 rounded text-[10px] font-mono font-semibold text-white">
                    F9
                  </kbd>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {language === 'ar' ? 'الدفع الفوري' : 'Instant Pay'}
                  </span>
                </button>

                <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

                {/* Quick Shortcut Launcher Button */}
                <button
                  type="button"
                  data-testid="footer-quick-action-btn"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer shrink-0"
                  title={language === 'ar' ? 'فتح لوحة الاختصارات السريعة (Ctrl+K)' : 'Quick Action Palette (Ctrl+K)'}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{language === 'ar' ? 'اختصار سريع' : 'Quick Action'}</span>
                  <kbd className="px-1 py-0.2 bg-white dark:bg-slate-900 rounded text-[9px] font-mono text-slate-500 border border-slate-200/70 dark:border-slate-700">
                    Ctrl+K
                  </kbd>
                </button>
              </div>

              <div className="flex items-center gap-2.5 text-slate-400 shrink-0">
                {/* WhatsApp Station Shortcut in Bottom Bar */}
                <button
                  type="button"
                  data-testid="footer-whatsapp-hub-btn"
                  onClick={() => setActiveTab('communications')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition cursor-pointer ${
                    activeTab === 'communications'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50/90 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                  }`}
                  title={language === 'ar' ? 'فتح خدمات التواصل ومحطة واتساب' : 'Open WhatsApp & Communications'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <MessageSquare className="w-3 h-3" />
                  <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                  <span className="font-mono text-[10px] opacity-85">({connectedWhatsAppCount})</span>
                </button>

                {/* Instant WhatsApp Send Modal Trigger */}
                <button
                  type="button"
                  data-testid="footer-whatsapp-quick-send-btn"
                  onClick={handleOpenFooterQuickSend}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 text-[10px] font-medium transition cursor-pointer"
                  title={language === 'ar' ? 'إرسال رسالة واتساب فورية' : 'Instant WhatsApp Message'}
                >
                  <Send className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{language === 'ar' ? 'إرسال فوري' : 'Quick Send'}</span>
                </button>

                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>
                  {language === 'ar'
                    ? currentWarehouse?.nameAr || 'المستودع الرئيسي'
                    : currentWarehouse?.name || 'Main Warehouse'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openLanPortal}
                    data-testid="footer-lan-portal-trigger"
                    className={`font-mono text-[10px] font-medium hover:underline cursor-pointer flex items-center gap-1 ${
                      footerSyncMeta.tone === 'emerald'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : footerSyncMeta.tone === 'blue'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                    title={
                      language === 'ar'
                        ? 'انقر لفتح مركز الشبكة وتعدد الأجهزة المتصلة'
                        : 'Click to open Multi-Device LAN Hub'
                    }
                  >
                    <span>Local LAN Sync OK</span>
                    {connectedLanDevices.length > 0 && (
                      <span
                        data-testid="footer-connected-devices-count"
                        className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-sans font-bold text-[9px]"
                      >
                        {connectedLanDevices.length} {language === 'ar' ? 'جهاز' : 'dev'}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid="footer-sync-status-indicator"
                    data-sync-state={footerSyncMeta.state}
                    data-pending-count={footerSyncMeta.pendingCount}
                    onClick={() => {
                      if (footerSyncMeta.pendingCount > 0) {
                        flushPendingSyncQueue().catch(() => {});
                      } else {
                        openLanPortal();
                      }
                    }}
                    title={language === 'ar' ? footerSyncMeta.tooltipAr : footerSyncMeta.tooltipEn}
                    aria-label={
                      language === 'ar'
                        ? `حالة المزامنة: ${footerSyncMeta.shortLabelAr}`
                        : `Sync status: ${footerSyncMeta.shortLabelEn}`
                    }
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition cursor-pointer shrink-0 ${
                      footerSyncMeta.tone === 'emerald'
                        ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                        : footerSyncMeta.tone === 'blue'
                        ? 'bg-blue-50/90 text-blue-700 border-blue-200/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                        : 'bg-amber-50/95 text-amber-800 border-amber-300/90 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/70'
                    }`}
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      {(footerSyncMeta.state === 'PENDING' || footerSyncMeta.state === 'SYNCING') && (
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            footerSyncMeta.tone === 'blue' ? 'bg-blue-400' : 'bg-amber-400'
                          }`}
                        />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          footerSyncMeta.tone === 'emerald'
                            ? 'bg-emerald-500'
                            : footerSyncMeta.tone === 'blue'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </span>
                    {footerSyncMeta.state === 'SYNCING' ? (
                      <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                    ) : footerSyncMeta.state === 'OFFLINE' ? (
                      <WifiOff className="w-3 h-3 shrink-0" />
                    ) : footerSyncMeta.state === 'PENDING' ? (
                      <CloudUpload className="w-3 h-3 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    )}
                    <span>
                      {language === 'ar' ? footerSyncMeta.shortLabelAr : footerSyncMeta.shortLabelEn}
                    </span>
                  </button>
                </div>
              </div>
            </footer>
          )}

          {/* Global Command Palette (Ctrl+K), Omnichannel WhatsApp/SMS Modal, Cross-Branch Probe & Offline PWA Banner */}
          <Suspense fallback={null}>
            <CommandPalette />
            <QuickSendModal />
            <CrossBranchStockModal />
            <MobileLanPortalModal />
            <ShiftControlModal />
            {isOnboardingOpen && (
              <OnboardingWizardModal isOpen={isOnboardingOpen} onClose={closeOnboarding} />
            )}
          </Suspense>
          <OfflineIndicator />
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <ERPProvider>
      <MainLayout />
    </ERPProvider>
  );
}
