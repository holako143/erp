/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Profiler, useCallback, useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { OfflineIndicator } from './components/layout/PWAInstallBanner';
import { LoginGate } from './components/security/LoginGate';
import { HardwareLockModal } from './components/security/HardwareLockModal';
import { QuickSendModal } from './components/messaging/QuickSendModal';
import { ShieldAlert, MessageSquare, Send, Zap } from 'lucide-react';

// Views
import { DashboardView } from './views/DashboardView';
import { BarcodeEngineView } from './views/BarcodeEngineView';
import { InventoryView } from './views/InventoryView';
import { PurchasingView } from './views/PurchasingView';
import { SalesView } from './views/SalesView';
import { POSView } from './views/POSView';
import { AccountingView } from './views/AccountingView';
import { BusinessModulesView } from './views/BusinessModulesView';
import { AIInsightsView } from './views/AIInsightsView';
import { ReportsAnalyticsAndAIView } from './views/ReportsAnalyticsAndAIView';
import { SaaSAdminView } from './views/SaaSAdminView';
import { SettingsView } from './views/SettingsView';
import { SecurityCenterView } from './views/SecurityCenterView';
import { MasterAdminControlView } from './views/MasterAdminControlView';
import { StandaloneActivationPortal } from './views/StandaloneActivationPortal';
import { CommunicationsView } from './views/CommunicationsView';
import { CrossBranchStockModal } from './components/common/CrossBranchStockModal';
import { OnboardingWizardModal } from './components/common/OnboardingWizardModal';
import { MobileLanPortalModal } from './components/common/MobileLanPortalModal';
import { PerformanceMonitorOverlay } from './components/common/PerformanceMonitorOverlay';
import { performanceTelemetryStore } from './core/performanceMonitorEngine';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isAuthenticated,
    login,
    hasModuleAccess,
    antiTheftShieldEnabled,
    recordBlockedInspectAttempt,
    lastSecurityAlert,
    uiTheme,
    uiDensity,
    isStandaloneKeygenOpen,
    setIsStandaloneKeygenOpen,
    masterSystemConfig,
    networkInfo,
    language,
    syncLatencyMs,
    protectionState,
    openLanPortal,
    isOnboardingOpen,
    closeOnboarding,
    setIsCommandPaletteOpen,
    openQuickSendModal,
    whatsappAccounts,
  } = useERP();

  const connectedWhatsAppCount = whatsappAccounts.filter(
    (acc) => acc.session.status === 'CONNECTED'
  ).length;

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

      // Secret Master Admin Shortcut: Ctrl+Shift+M
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'M') {
        e.preventDefault();
        login('sysadmin', 'RLM-ROOT-9999');
        setActiveTab('masterAdmin');
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
    hasModuleAccess,
    login,
    setActiveTab,
    setIsStandaloneKeygenOpen,
  ]);

  const renderActiveView = () => {
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
  };

  return (
    <>
      {/* Live Anti-Theft Security Toast */}
      {lastSecurityAlert && (
        <div
          data-testid="security-shield-toast"
          className="fixed bottom-10 end-5 z-50 bg-slate-950 text-white border border-rose-500/80 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5 text-xs font-semibold"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{lastSecurityAlert}</span>
        </div>
      )}

      {/* Decoupled Standalone Cryptographic Licensing & Keygen Server */}
      {isStandaloneKeygenOpen && <StandaloneActivationPortal />}

      {/* Mandatory 30-Day Trial, Single-Device Component Lock & Anti-Clock Rollback Gate */}
      <HardwareLockModal />

      {/* Enterprise Login Gateway (Default: admin / admin) — Navbar & navigation hidden when unauthenticated */}
      {!isAuthenticated ? (
        <LoginGate />
      ) : (
        <div
          className={`h-screen max-h-screen overflow-hidden flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
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
              className={`flex-1 min-w-0 min-h-0 pb-16 lg:pb-0 ${
                activeTab === 'pos'
                  ? 'overflow-hidden flex flex-col'
                  : uiDensity === 'compact'
                  ? 'overflow-y-auto p-2.5 sm:p-4'
                  : 'overflow-y-auto p-3 sm:p-5'
              }`}
            >
              <Profiler id={activeTab} onRender={handleViewRenderProfile}>
                {renderActiveView()}
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
                  onClick={() => {
                    setActiveTab('pos');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('haseb-open-pos-customer-picker'));
                    }, 30);
                  }}
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
                  onClick={() => {
                    setActiveTab('pos');
                    window.dispatchEvent(new CustomEvent('haseb-trigger-pos-checkout'));
                  }}
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
                  onClick={() =>
                    openQuickSendModal({
                      recipientName: language === 'ar' ? 'عميل مباشر' : 'Direct Customer',
                      recipientPhone: '+967771234567',
                      channel: 'WHATSAPP',
                      category: 'CUSTOM_OPERATION',
                      referenceNumber: `MSG-${Date.now().toString().slice(-4)}`,
                      messageBody:
                        language === 'ar'
                          ? 'مرحباً بكم في مؤسسة حاسب للطاقة الشمسية والإلكترونيات الحديثة.'
                          : 'Welcome to Haseb Solar & Modern Electronics.',
                    })
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 text-[10px] font-medium transition cursor-pointer"
                  title={language === 'ar' ? 'إرسال رسالة واتساب فورية' : 'Instant WhatsApp Message'}
                >
                  <Send className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{language === 'ar' ? 'إرسال فوري' : 'Quick Send'}</span>
                </button>

                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>{language === 'ar' ? 'مستودع الطاقة الرئيسي' : 'Main Solar Warehouse'}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={openLanPortal}
                  className="font-mono text-[10px] text-emerald-600 font-medium hover:underline cursor-pointer"
                  title={
                    language === 'ar'
                      ? 'انقر لفتح مركز سطح المكتب والشبكة المحلية'
                      : 'Click to open Windows Desktop & LAN Hub'
                  }
                >
                  Cloud Sync OK
                </button>
              </div>
            </footer>
          )}

          {/* Global Command Palette (Ctrl+K), Omnichannel WhatsApp/SMS Modal, Cross-Branch Probe & Offline PWA Banner */}
          <CommandPalette />
          <QuickSendModal />
          <CrossBranchStockModal />
          <MobileLanPortalModal />
          <OnboardingWizardModal isOpen={isOnboardingOpen} onClose={closeOnboarding} />
          <PerformanceMonitorOverlay />
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
