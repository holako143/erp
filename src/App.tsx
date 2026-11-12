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
        if (e.key === 'F8' && hasModuleAccess('reportsAndAI')) {
          e.preventDefault();
          setActiveTab('reportsAndAI');
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
              className={`flex-1 min-w-0 min-h-0 ${
                activeTab === 'pos'
                  ? 'overflow-hidden flex flex-col'
                  : uiDensity === 'compact'
                  ? 'overflow-y-auto p-3 sm:p-4'
                  : 'overflow-y-auto p-4 sm:p-5'
              }`}
            >
              {renderActiveView()}
            </main>
          </div>

          {/* Minimal Bottom Shortcuts Bar (Matches Lumina / Haseb ERP Reference) */}
          {masterSystemConfig.uiElementsVisibility.showKeyboardShortcutsBar && (
            <footer
              data-testid="keyboard-shortcuts-bar"
              className={`hidden lg:flex shrink-0 items-center justify-between px-5 h-8 border-t text-[11px] select-none z-30 ${
                uiTheme === 'obsidian_dark'
                  ? 'bg-[#080c14] border-slate-800 text-slate-400'
                  : 'bg-white border-slate-200/70 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-4 text-slate-500">
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="flex items-center gap-1.5 hover:text-slate-800 transition cursor-pointer"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold text-slate-600">
                    F1
                  </kbd>
                  <span>{language === 'ar' ? 'مسح الباركود' : 'Scan Barcode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="flex items-center gap-1.5 hover:text-slate-800 transition cursor-pointer"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold text-slate-600">
                    F2
                  </kbd>
                  <span>{language === 'ar' ? 'نقطة البيع' : 'POS'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="flex items-center gap-1.5 hover:text-slate-800 transition cursor-pointer"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold text-slate-600">
                    F3
                  </kbd>
                  <span>{language === 'ar' ? 'المخزون' : 'Inventory'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pos');
                    window.dispatchEvent(new CustomEvent('haseb-trigger-pos-checkout'));
                  }}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <kbd className="px-1.5 py-0.5 bg-slate-900 rounded text-[10px] font-mono font-semibold text-white">
                    F9
                  </kbd>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {language === 'ar' ? 'الدفع الفوري' : 'Instant Pay'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <span>{language === 'ar' ? 'مستودع الطاقة الرئيسي' : 'Main Solar Warehouse'}</span>
                <span>•</span>
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
