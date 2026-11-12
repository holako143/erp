import React, { useState } from 'react';
import { useERP, getVisibleModulesList } from '../../context/ERPContext';
import {
  LayoutDashboard,
  QrCode,
  Boxes,
  ShoppingCart,
  Receipt,
  Landmark,
  Bot,
  CloudCog,
  SlidersHorizontal,
  ScanBarcode,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Briefcase,
  FolderKanban,
  Truck,
  Factory,
  Crown,
  ShieldCheck,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { HasebBrandLogo } from '../common/HasebBrandLogo';

export interface SidebarMenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColorClass?: string;
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

  // Master menu definition array with distinct, domain-accurate professional icons (Zero Green)
  const rawMenuItems: SidebarMenuItem[] = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      subtitle: language === 'ar' ? 'المؤشرات والملخص التنفيذي' : 'Executive Overview',
      icon: LayoutDashboard,
      iconColorClass: 'text-blue-600 dark:text-blue-400',
      count: null,
    },
    {
      id: 'pos',
      label: language === 'ar' ? 'نقطة البيع (POS)' : 'POS Terminal',
      subtitle: language === 'ar' ? 'الكاشير والفوترة الفورية' : 'Fast Checkout & Billing',
      icon: ScanBarcode,
      iconColorClass: 'text-blue-600 dark:text-blue-400',
      count: null,
    },
    {
      id: 'inventory',
      label: language === 'ar' ? 'المخزون والجرد' : 'Inventory & WMS',
      subtitle: language === 'ar' ? 'الأصناف والسيريال والمستودع' : 'Stock, Serials & WMS',
      icon: Boxes,
      iconColorClass: 'text-amber-600 dark:text-amber-400',
      count: lowStockCount > 0 ? lowStockCount : null,
    },
    {
      id: 'sales',
      label: language === 'ar' ? 'المبيعات والضمان' : 'Sales & Warranty',
      subtitle: language === 'ar' ? 'الفواتير وفحص الضمان RMA' : 'Invoices & Warranty RMA',
      icon: Receipt,
      iconColorClass: 'text-indigo-600 dark:text-indigo-400',
      count: null,
    },
    {
      id: 'accounting',
      label: language === 'ar' ? 'المحاسبة المالية' : 'Financial Accounting',
      subtitle: language === 'ar' ? 'دفتر الأستاذ والسندات' : 'General Ledger & Vouchers',
      icon: Landmark,
      iconColorClass: 'text-sky-600 dark:text-sky-400',
      count: null,
    },
    {
      id: 'reportsAndAI',
      label: language === 'ar' ? 'التقارير والتحليل الذكي' : 'Reports & Analytics',
      subtitle: language === 'ar' ? 'الأرباح والمديونيات والتحليل' : 'Profits, Aging & Insights',
      icon: TrendingUp,
      iconColorClass: 'text-violet-600 dark:text-violet-400',
      count: null,
    },
    {
      id: 'communications',
      label: language === 'ar' ? 'الواتساب والرسائل (USB)' : 'WhatsApp & SMS Hub',
      subtitle: language === 'ar' ? 'محادثات فورية وإرسال سريع' : 'Live Multi-Account Hub',
      icon: MessageSquare,
      iconColorClass: 'text-blue-600 dark:text-blue-400',
      count: null,
    },
    {
      id: 'barcodeEngine',
      label: t('barcodeEngine'),
      subtitle: language === 'ar' ? 'طباعة الملصقات والباركود' : 'Label & Barcode Studio',
      icon: QrCode,
      iconColorClass: 'text-sky-600 dark:text-sky-400',
      count: null,
    },
    {
      id: 'purchasing',
      label: t('purchasing'),
      subtitle: language === 'ar' ? 'الموردون وأوامر الشراء' : 'Vendors & Purchase Orders',
      icon: ShoppingCart,
      iconColorClass: 'text-indigo-600 dark:text-indigo-400',
      count: pendingPOCount > 0 ? pendingPOCount : null,
    },
    {
      id: 'businessModules',
      label: language === 'ar' ? t('businessModules') : 'Business Modules',
      icon: Briefcase,
      iconColorClass: 'text-violet-600 dark:text-violet-400',
      count: null,
    },
    {
      id: 'projects',
      label: language === 'ar' ? 'إدارة المشاريع' : 'Projects',
      icon: FolderKanban,
      iconColorClass: 'text-purple-600 dark:text-purple-400',
      count: null,
    },
    {
      id: 'fleet',
      label: language === 'ar' ? 'الأسطول والنقل' : 'Fleet',
      icon: Truck,
      iconColorClass: 'text-amber-600 dark:text-amber-400',
      count: null,
    },
    {
      id: 'manufacturing',
      label: language === 'ar' ? 'التصنيع والإنتاج' : 'Manufacturing',
      icon: Factory,
      iconColorClass: 'text-orange-600 dark:text-orange-400',
      count: null,
    },
    {
      id: 'aiInsights',
      label: t('aiInsights'),
      icon: Bot,
      iconColorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
      count: null,
    },
    {
      id: 'masterAdmin',
      label: language === 'ar' ? 'الإدارة العليا للنظام (Master)' : 'Master System Admin',
      icon: Crown,
      iconColorClass: 'text-amber-500',
      count: null,
    },
    {
      id: 'saasPlatform',
      label: t('saasPlatform'),
      icon: CloudCog,
      iconColorClass: 'text-sky-500',
      count: null,
    },
    {
      id: 'security',
      label: language === 'ar' ? 'الحماية والعضويات والترخيص' : 'Security & Licensing',
      icon: ShieldCheck,
      iconColorClass: 'text-rose-600 dark:text-rose-400',
      count: null,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: SlidersHorizontal,
      iconColorClass: 'text-slate-600 dark:text-slate-400',
      count: null,
    },
  ];

  const allowedModuleIds = getVisibleModules();

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

  const isDarkRail = uiTheme === 'obsidian_dark' || uiTheme === 'haseb_royal';
  const isSandRail = uiTheme === 'haseb_sand';
  const isRoyalRail = uiTheme === 'haseb_royal';

  return (
    <>
      {/* Desktop Sidebar (lg and up) - Harmonized Architectural Navigation Rail */}
      <aside
        data-testid="desktop-sidebar"
        className={`hidden lg:flex flex-col shrink-0 h-full overflow-hidden select-none border-e transition-all duration-200 ${
          isSidebarCollapsed ? 'w-17' : 'w-64'
        } ${
          isRoyalRail
            ? 'bg-[#0E1329] text-slate-200 border-[#1C2447]'
            : isDarkRail
            ? 'bg-[#080C14] text-slate-200 border-slate-800/90'
            : isSandRail
            ? 'bg-[#F5EFE4] text-stone-800 border-[#DFD3BE]'
            : uiTheme === 'swiss_light'
            ? 'bg-white text-slate-800 border-[#DAE2EC]'
            : 'bg-[#F6F9FD] text-slate-800 border-[#D5E0EE]'
        }`}
      >
        <nav className={`flex-1 min-h-0 py-3 overflow-y-auto ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}>
          <div className="space-y-1.5">
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
                      : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? isRoyalRail
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950/50 font-bold'
                        : isDarkRail
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-950/50 font-bold'
                        : 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                      : isDarkRail
                      ? 'bg-slate-900/55 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white font-semibold'
                      : isSandRail
                      ? 'bg-[#FBF8F2] border-[#E3D7C4] text-stone-800 hover:border-amber-600/50 hover:bg-white font-semibold shadow-2xs'
                      : 'bg-white border-slate-200/85 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-slate-950 font-semibold shadow-2xs'
                  }`}
                >
                  <div
                    className={`flex items-center ${
                      isSidebarCollapsed ? 'justify-center' : 'gap-3 truncate text-start'
                    }`}
                  >
                    <div
                      className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isActive
                          ? 'bg-white/20 text-white shadow-inner'
                          : isDarkRail
                          ? 'bg-slate-800/90 text-blue-400 group-hover:scale-105'
                          : isSandRail
                          ? 'bg-[#EFE7D6] text-amber-700 group-hover:scale-105'
                          : `bg-slate-100/90 ${item.iconColorClass || 'text-blue-600'} group-hover:scale-105`
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.25 : 1.95} />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="truncate">
                        <div className="truncate leading-snug text-[13px]">{item.label}</div>
                        {item.subtitle && (
                          <div
                            className={`text-[11px] truncate mt-0.5 font-normal ${
                              isActive
                                ? 'text-white/85'
                                : isDarkRail
                                ? 'text-slate-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actionable Alert Counter */}
                  {!isSidebarCollapsed && item.count !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold tabular-nums ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}

                  {isSidebarCollapsed && item.count !== null && (
                    <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Minimalist Footer Collapse Control */}
        <div className="p-3 border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            data-testid="toggle-sidebar"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`w-full px-3 py-2 rounded-xl border text-xs flex items-center transition cursor-pointer font-semibold ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            } ${
              isDarkRail
                ? 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                : isSandRail
                ? 'bg-[#FBF8F2] border-[#DFD3BE] text-stone-700 hover:bg-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {!isSidebarCollapsed && (
              <span className="text-xs">
                {language === 'ar' ? 'طي القائمة الجانبية' : 'Collapse Navigation'}
              </span>
            )}
            <CollapseIcon className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (sm/md only) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0B1120] border-t border-slate-800 z-40 px-2 py-1.5 flex items-center justify-around">
        {[
          { id: 'pos', label: language === 'ar' ? 'نقطة البيع POS' : 'POS', icon: ScanBarcode },
          { id: 'inventory', label: language === 'ar' ? 'المخزون' : 'Inventory', icon: Boxes },
          { id: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales', icon: Receipt },
          { id: 'accounting', label: language === 'ar' ? 'المحاسبة' : 'Accounting', icon: Landmark },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
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
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[11px] font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
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
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <HasebBrandLogo size="sm" theme={uiTheme} />
                  <span className="font-bold text-sm text-white">حاسب — النظام المحاسبي</span>
                </div>
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-500 text-white'
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

            <div className="pt-4 text-center text-xs font-mono text-slate-400">
              منظومة حاسب المحاسبية المتكاملة
            </div>
          </div>
        </div>
      )}
    </>
  );
}
