import React, { useState } from 'react';
import { useERP, getVisibleModulesList } from '../../context/ERPContext';
import {
  LayoutDashboard,
  Barcode,
  Package,
  ShoppingCart,
  Receipt,
  Calculator,
  Bot,
  CloudCog,
  Settings,
  CreditCard,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Layers,
  ShieldCheck,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

export interface SidebarMenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  count: number | null;
}

export const SECTOR_MODE_EXCLUDED_ITEMS = [
  'projects',
  'fleet',
  'manufacturing',
  'businessModules',
  'Projects',
  'Fleet',
  'Manufacturing',
  'Business Modules',
] as const;

export const SECTOR_MODE_ALLOWED_ITEMS = [
  'pos',
  'inventory',
  'sales',
  'accounting',
  'reportsAndAI',
  'POS',
  'Inventory',
  'Sales',
  'Accounting',
  'ReportsAndAI',
] as const;

export function shouldDisplaySidebarMenuItem(
  item: { id: string; label?: string },
  sectorModeEnabled: boolean | undefined,
  hasAccess: (moduleId: string) => boolean
): boolean {
  // ============================================================================
  // SECTOR MODE BRANCH (Distraction-Free UI for Electronics & Solar Retailers)
  // ============================================================================
  if (sectorModeEnabled) {
    const allowedModuleIds = getVisibleModulesList(true);
    if (
      (SECTOR_MODE_EXCLUDED_ITEMS as readonly string[]).includes(item.id) ||
      (item.label && (SECTOR_MODE_EXCLUDED_ITEMS as readonly string[]).includes(item.label))
    ) {
      return false;
    }
    return allowedModuleIds.includes(item.id);
  }

  // ============================================================================
  // STANDARD ENTERPRISE BRANCH (RBAC + Master System Visibility)
  // ============================================================================
  return hasAccess(item.id);
}

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    t,
    products,
    purchaseOrders,
    language,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    hasModuleAccess,
    getVisibleModules,
    uiTheme,
    masterSystemConfig,
  } = useERP();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSectorModeActive = Boolean(masterSystemConfig.sectorModeEnabled);

  const lowStockCount = products.filter((p) => p.stockQty <= p.reorderPoint).length;
  const pendingPOCount = purchaseOrders.filter((po) => po.status === 'PENDING_APPROVAL').length;

  // Master menu definition array before dynamic filtering
  const rawMenuItems: SidebarMenuItem[] = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
      count: null,
    },
    {
      id: 'pos',
      label: language === 'ar' ? 'نقطة البيع (POS)' : 'POS',
      subtitle: language === 'ar' ? 'الكاشير والفوترة الفورية' : 'Fast Checkout & Billing',
      icon: CreditCard,
      count: null,
    },
    {
      id: 'inventory',
      label: language === 'ar' ? 'المخزون والجرد' : 'Inventory',
      subtitle: language === 'ar' ? 'الأصناف والسيريال والمستودع' : 'Stock, Serials & WMS',
      icon: Package,
      count: lowStockCount > 0 ? lowStockCount : null,
    },
    {
      id: 'sales',
      label: language === 'ar' ? 'المبيعات والضمان' : 'Sales',
      subtitle: language === 'ar' ? 'الفواتير وفحص الضمان RMA' : 'Invoices & Warranty RMA',
      icon: Receipt,
      count: null,
    },
    {
      id: 'accounting',
      label: language === 'ar' ? 'المحاسبة المالية' : 'Accounting',
      subtitle: language === 'ar' ? 'دفتر الأستاذ والسندات' : 'General Ledger & Vouchers',
      icon: Calculator,
      count: null,
    },
    {
      id: 'reportsAndAI',
      label: language === 'ar' ? 'التقارير والتحليل والذكاء الاصطناعي' : 'Reports, Analytics & AI',
      subtitle: language === 'ar' ? 'تحليل المبيعات، الأرباح، المديونيات والذكاء المحلي' : 'Sales, Profits, Receivables & Local AI',
      icon: TrendingUp,
      count: null,
    },
    {
      id: 'communications',
      label: language === 'ar' ? 'الواتساب والرسائل (USB)' : 'WhatsApp & SMS Hub',
      icon: MessageSquare,
      count: null,
    },
    {
      id: 'barcodeEngine',
      label: t('barcodeEngine'),
      icon: Barcode,
      count: null,
    },
    {
      id: 'purchasing',
      label: t('purchasing'),
      icon: ShoppingCart,
      count: pendingPOCount > 0 ? pendingPOCount : null,
    },
    {
      id: 'businessModules',
      label: language === 'ar' ? t('businessModules') : 'Business Modules',
      icon: Layers,
      count: null,
    },
    {
      id: 'projects',
      label: language === 'ar' ? 'إدارة المشاريع' : 'Projects',
      icon: Layers,
      count: null,
    },
    {
      id: 'fleet',
      label: language === 'ar' ? 'الأسطول والنقل' : 'Fleet',
      icon: Layers,
      count: null,
    },
    {
      id: 'manufacturing',
      label: language === 'ar' ? 'التصنيع والإنتاج' : 'Manufacturing',
      icon: Layers,
      count: null,
    },
    {
      id: 'aiInsights',
      label: t('aiInsights'),
      icon: Bot,
      count: null,
    },
    {
      id: 'masterAdmin',
      label: language === 'ar' ? 'الإدارة العليا للنظام (Master)' : 'Master System Admin',
      icon: ShieldCheck,
      count: null,
    },
    {
      id: 'saasPlatform',
      label: t('saasPlatform'),
      icon: CloudCog,
      count: null,
    },
    {
      id: 'security',
      label: language === 'ar' ? 'الحماية والعضويات والترخيص' : 'Security & Licensing',
      icon: ShieldCheck,
      count: null,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: Settings,
      count: null,
    },
  ];

  // Retrieve allowed module IDs from ERPContext helper based on masterSystemConfig.sectorModeEnabled
  const allowedModuleIds = getVisibleModules();

  // ============================================================================
  // DYNAMIC MENU FILTERING SEPARATOR:
  // Path A (masterSystemConfig.sectorModeEnabled === true):
  //   Distraction-free mode for Electronics & Solar retailers — maps strictly
  //   ['pos', 'inventory', 'sales', 'accounting'] into a unified card-based list
  //   with zero legacy category separators.
  // Path B (masterSystemConfig.sectorModeEnabled === false):
  //   Expanded suite filtered by user permissions and Master Admin visibility.
  // ============================================================================
  const visibleMenuItems: SidebarMenuItem[] = masterSystemConfig.sectorModeEnabled
    ? allowedModuleIds
        .map((modId) => rawMenuItems.find((item) => item.id === modId))
        .filter((item): item is SidebarMenuItem =>
          Boolean(item && shouldDisplaySidebarMenuItem(item, true, hasModuleAccess))
        )
    : rawMenuItems.filter(
        (item) =>
          allowedModuleIds.includes(item.id) &&
          shouldDisplaySidebarMenuItem(item, false, hasModuleAccess)
      );

  const CollapseIcon =
    language === 'ar'
      ? isSidebarCollapsed
        ? PanelRightOpen
        : PanelRightClose
      : isSidebarCollapsed
      ? PanelLeftOpen
      : PanelLeftClose;

  const isLightSidebar = uiTheme === 'swiss_light';

  return (
    <>
      {/* Desktop Sidebar (lg and up) - Clean Card-Based Navigation Rail */}
      <aside
        data-testid="desktop-sidebar"
        className={`hidden lg:flex flex-col shrink-0 h-full overflow-hidden select-none border-e transition-all duration-200 ${
          isSidebarCollapsed ? 'w-16' : 'w-60'
        } ${
          isLightSidebar
            ? 'bg-white text-zinc-700 border-zinc-200'
            : 'bg-[#0B1120] text-slate-300 border-slate-800/90'
        }`}
      >
        {/* Unified Card-Based Navigation List (Zero Legacy Category Separators) */}
        <nav className={`flex-1 min-h-0 py-3 overflow-y-auto ${isSidebarCollapsed ? 'px-2' : 'px-2.5'}`}>
          <div
            className={
              isSidebarCollapsed
                ? 'space-y-2'
                : `rounded-2xl border p-2.5 space-y-2 shadow-xs ${
                    isLightSidebar
                      ? 'bg-zinc-50/80 border-zinc-200/90'
                      : 'bg-slate-900/60 border-slate-800/90'
                  }`
            }
          >
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`relative w-full flex items-center rounded-xl border text-xs transition-all cursor-pointer group ${
                    isSidebarCollapsed
                      ? 'justify-center py-2.5 px-0'
                      : 'justify-between px-3 py-3'
                  } ${
                    isActive
                      ? isLightSidebar
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm font-semibold'
                        : 'bg-slate-800/95 border-emerald-500/60 text-white shadow-sm font-semibold'
                      : isLightSidebar
                      ? 'bg-white border-zinc-200/80 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 font-medium'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white font-medium'
                  }`}
                >
                  <div
                    className={`flex items-center ${
                      isSidebarCollapsed ? 'justify-center' : 'gap-3 truncate text-start'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? isLightSidebar
                            ? 'bg-white/15 text-white'
                            : 'bg-emerald-500/20 text-emerald-400'
                          : isLightSidebar
                          ? 'bg-zinc-100 text-zinc-600 group-hover:text-zinc-900'
                          : 'bg-slate-900 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="truncate">
                        <div className="truncate leading-snug">{item.label}</div>
                        {item.subtitle && (
                          <div
                            className={`text-[10px] truncate mt-0.5 ${
                              isActive
                                ? isLightSidebar
                                  ? 'text-zinc-300'
                                  : 'text-emerald-300/80'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Understated Tabular Counter Only for Actionable Alerts */}
                  {!isSidebarCollapsed && item.count !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold tabular-nums ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}

                  {isSidebarCollapsed && item.count !== null && (
                    <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Minimalist Footer Collapse Control */}
        <div className="p-3">
          <button
            type="button"
            data-testid="toggle-sidebar"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`w-full px-3 py-2 rounded-xl border text-xs flex items-center transition cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            } ${
              isLightSidebar
                ? 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            {!isSidebarCollapsed && (
              <span className="font-medium text-[11px]">
                {language === 'ar' ? 'طي القائمة الجانبية' : 'Collapse Navigation'}
              </span>
            )}
            <CollapseIcon className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (sm/md only) - Focused on POS, Inventory, Sales, Accounting */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0B1120] border-t border-slate-800 z-40 px-2 py-1.5 flex items-center justify-around">
        {[
          { id: 'pos', label: language === 'ar' ? 'نقطة البيع POS' : 'POS', icon: CreditCard },
          { id: 'inventory', label: language === 'ar' ? 'المخزون' : 'Inventory', icon: Package },
          { id: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales', icon: Receipt },
          { id: 'accounting', label: language === 'ar' ? 'المحاسبة' : 'Accounting', icon: Calculator },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        {!isSectorModeActive && (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[10px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            <span>{language === 'ar' ? 'المزيد' : 'More'}</span>
          </button>
        )}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex justify-end">
          <div className="w-72 bg-[#0B1120] text-slate-200 h-full p-4 overflow-y-auto flex flex-col justify-between border-s border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3">
                <span className="font-bold text-sm text-white">RLM Enterprise ERP</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-2 space-y-1.5">
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 border-emerald-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 text-center text-[11px] font-mono text-slate-500">
              RLM Financial Core v6.5
            </div>
          </div>
        </div>
      )}
    </>
  );
}

