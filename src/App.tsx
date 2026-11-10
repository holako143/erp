/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { OfflineIndicator } from './components/layout/PWAInstallBanner';
import { LoginGate } from './components/security/LoginGate';
import { HardwareLockModal } from './components/security/HardwareLockModal';
import { QuickSendModal } from './components/messaging/QuickSendModal';
import { ShieldAlert, Wifi, Keyboard } from 'lucide-react';

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
import { SaaSAdminView } from './views/SaaSAdminView';
import { SettingsView } from './views/SettingsView';
import { SecurityCenterView } from './views/SecurityCenterView';
import { MasterAdminControlView } from './views/MasterAdminControlView';
import { StandaloneActivationPortal } from './views/StandaloneActivationPortal';
import { CommunicationsView } from './views/CommunicationsView';
import { CrossBranchStockModal } from './components/common/CrossBranchStockModal';
import { OnboardingWizardModal } from './components/common/OnboardingWizardModal';
import { MobileLanPortalModal } from './components/common/MobileLanPortalModal';

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
  } = useERP();

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

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
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
      case 'businessModules':
        return <BusinessModulesView />;
      case 'aiInsights':
        return <AIInsightsView />;
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
          className={`h-screen max-h-screen overflow-hidden flex flex-col selection:bg-slate-900 selection:text-white ${
            uiTheme === 'obsidian_dark'
              ? 'bg-slate-950 text-slate-100'
              : uiTheme === 'swiss_light'
              ? 'bg-zinc-50 text-zinc-900'
              : 'bg-[#f4f6f8] text-slate-900'
          }`}
        >
          {/* Top Enterprise Bar — rendered exclusively when authenticated */}
          {isAuthenticated && <Navbar />}

          {/* Main Workspace with Sidebar & Dynamic View */}
          <div className="flex-1 min-h-0 flex w-full overflow-hidden">
            {isAuthenticated && <Sidebar />}
            <main
              className={`flex-1 min-w-0 min-h-0 ${
                activeTab === 'pos'
                  ? 'overflow-hidden p-2.5 sm:p-3 flex flex-col'
                  : uiDensity === 'compact'
                  ? 'overflow-y-auto p-2.5 sm:p-3.5'
                  : 'overflow-y-auto p-3 sm:p-4'
              }`}
            >
              {renderActiveView()}
            </main>
          </div>

          {/* Fast Keyboard Shortcuts & LAN Status Bar (Desktop) */}
          {masterSystemConfig.uiElementsVisibility.showKeyboardShortcutsBar && (
            <div
              data-testid="keyboard-shortcuts-bar"
              className="hidden lg:flex shrink-0 items-center justify-between px-4 py-1 bg-[#0B1120] border-t border-slate-800 text-[11px] text-slate-400 select-none z-30"
            >
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Keyboard className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'اختصارات القطاع (إلكترونيات وطاقة شمسية):' : 'Sector Shortcuts:'}
                </span>
                {(masterSystemConfig.sectorModeEnabled
                  ? [
                      { k: 'F2', l: language === 'ar' ? 'نقطة البيع POS' : 'POS', tab: 'pos' },
                      { k: 'F3', l: language === 'ar' ? 'المخزون والجرد' : 'Inventory', tab: 'inventory' },
                      { k: 'F4', l: language === 'ar' ? 'المبيعات والضمان' : 'Sales', tab: 'sales' },
                      { k: 'F7', l: language === 'ar' ? 'المحاسبة المالية' : 'Accounting', tab: 'accounting' },
                    ]
                  : [
                      { k: 'F1', l: language === 'ar' ? 'الرئيسية' : 'Home', tab: 'dashboard' },
                      { k: 'F2', l: language === 'ar' ? 'نقطة البيع POS' : 'POS', tab: 'pos' },
                      { k: 'F3', l: language === 'ar' ? 'المخزون' : 'Inventory', tab: 'inventory' },
                      { k: 'F4', l: language === 'ar' ? 'المبيعات' : 'Sales', tab: 'sales' },
                      { k: 'F6', l: language === 'ar' ? 'المشتريات' : 'Purchasing', tab: 'purchasing' },
                      { k: 'F7', l: language === 'ar' ? 'المحاسبة' : 'Accounting', tab: 'accounting' },
                    ]
                ).map((item) => (
                  <button
                    key={item.k}
                    type="button"
                    onClick={() => setActiveTab(item.tab)}
                    className="hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[10px]">
                      {item.k}
                    </kbd>
                    <span>{item.l}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 font-mono text-[10px]">
                {/* Trial / License Status Badge in Bottom Bar */}
                <button
                  type="button"
                  data-testid="footer-license-btn"
                  onClick={() => setActiveTab('security')}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition cursor-pointer"
                  title={language === 'ar' ? 'حالة الترخيص وبصمة الجهاز' : 'Hardware License Status'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      protectionState.status === 'LICENSE_ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {protectionState.status === 'LICENSE_ACTIVE'
                      ? language === 'ar'
                        ? 'نسخة مرخصة'
                        : 'Licensed'
                      : language === 'ar'
                      ? `نسخة تجريبية · ${protectionState.trialRemainingDays} يوم`
                      : `Trial · ${protectionState.trialRemainingDays}d`}
                  </span>
                </button>

                {networkInfo && (
                  <button
                    type="button"
                    onClick={openLanPortal}
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition"
                    title={language === 'ar' ? 'انقر لفتح بوابة ربط الجوال والشبكة المحلية' : 'Click to open Mobile LAN Portal'}
                  >
                    <Wifi className="w-3 h-3" />
                    <span>LAN: {networkInfo.primaryLanUrl.replace('http://', '')}</span>
                  </button>
                )}
                <span className="text-emerald-400">RAM-DB SYNC: {syncLatencyMs}ms</span>
              </div>
            </div>
          )}

          {/* Global Command Palette (Ctrl+K), Omnichannel WhatsApp/SMS Modal, Cross-Branch Probe & Offline PWA Banner */}
          <CommandPalette />
          <QuickSendModal />
          <CrossBranchStockModal />
          <MobileLanPortalModal />
          <OnboardingWizardModal isOpen={isOnboardingOpen} onClose={closeOnboarding} />
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
