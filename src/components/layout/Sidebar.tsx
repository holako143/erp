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
  Plus,
  Minus,
} from 'lucide-react';
import { HasebBrandLogo } from '../common/HasebBrandLogo';
import {
  applyGlobalTabScaleToDom,
  getSavedTabScalePercent,
} from '../common/WorkspaceTabResizerBar';
import {
  stepTabScale,
  TAB_SCALE_MIN,
  TAB_SCALE_MAX,
} from '../../core/workspaceLayoutEngine';

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
  'communications',
  'POS',
  'Inventory',
  'Sales',
  'Accounting',
  'ReportsAndAI',
  'Communications',
] as const;

export function shouldDisplaySidebarMenuItem(
  item: { id: string; label?: string },
  sectorModeEnabled: boolean | undefined,
  hasAccess: (moduleId: string) => boolean
): boolean {
  // Security & Permissions is stealth-hidden from navigation menus and triggered via 7 rapid clicks on the Haseb icon
  if (item.id === 'security' || item.id === 'Security') {
    return false;
  }

  if (sectorModeEnabled) {
    const allowedModuleIds = getVisibleModulesList(true);
    if (
      (SECTOR_MODE_EXCLUDED_ITEMS as readonly string[]).includes(item.id) ||
      (item.label && (SECTOR_MODE_EXCLUDED_ITEMS as readonly string[]).includes(item.label))
    ) {
      return false;
    }
    return allowedModuleIds.includes(item.id) || item.id === 'communications';
  }

  return hasAccess(item.id) || item.id === 'communications';
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
    whatsappAccounts,
  } = useERP();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarTabScale, setSidebarTabScale] = useState<number>(() => getSavedTabScalePercent());

  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (typeof custom.detail === 'number') {
        setSidebarTabScale(custom.detail);
      }
    };
    window.addEventListener('haseb-tab-scale-change', handler);
    return () => window.removeEventListener('haseb-tab-scale-change', handler);
  }, []);

  const handleStepSidebarTabScale = (dir: 'INC' | 'DEC') => {
    const next = stepTabScale(sidebarTabScale, dir);
    setSidebarTabScale(next);
    applyGlobalTabScaleToDom(next);
  };

  const isSectorModeActive = Boolean(masterSystemConfig.sectorModeEnabled);

  const lowStockCount = products.filter((p) => p.stockQty <= p.reorderPoint).length;
  const pendingPOCount = purchaseOrders.filter((po) => po.status === 'PENDING_APPROVAL').length;
  const connectedWhatsAppCount = whatsappAccounts.filter(
    (acc) => acc.session.status === 'CONNECTED'
  ).length;

  // Master menu definition array with distinct, domain-accurate professional icons
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
      label: language === 'ar' ? 'نقطة البيع' : 'POS Terminal',
      subtitle: language === 'ar' ? 'الكاشير والفوترة الفورية' : 'Fast Checkout & Billing',
      icon: ScanBarcode,
      iconColorClass: 'text-slate-400',
      count: null,
    },
    {
      id: 'inventory',
      label: language === 'ar' ? 'المخزون' : 'Inventory',
      subtitle: language === 'ar' ? 'الأصناف والسيريال والمستودع' : 'Stock, Serials & WMS',
      icon: Boxes,
      iconColorClass: 'text-slate-400',
      count: lowStockCount > 0 ? lowStockCount : null,
    },
    {
      id: 'sales',
      label: language === 'ar' ? 'المبيعات' : 'Sales',
      subtitle: language === 'ar' ? 'الفواتير وفحص الضمان RMA' : 'Invoices & Warranty RMA',
      icon: Receipt,
      iconColorClass: 'text-slate-400',
      count: null,
    },
    {
      id: 'accounting',
      label: language === 'ar' ? 'المحاسبة' : 'Accounting',
      subtitle: language === 'ar' ? 'دفتر الأستاذ والسندات' : 'General Ledger & Vouchers',
      icon: Landmark,
      iconColorClass: 'text-slate-400',
      count: null,
    },
    {
      id: 'reportsAndAI',
      label: language === 'ar' ? 'التقارير' : 'Reports',
      subtitle: language === 'ar' ? 'الأرباح والمديونيات والتحليل' : 'Profits, Aging & Insights',
      icon: TrendingUp,
      iconColorClass: 'text-slate-400',
      count: null,
    },
    {
      id: 'communications',
      label: language === 'ar' ? 'خدمات التواصل' : 'Communications',
      subtitle: language === 'ar' ? 'محطة واتساب والرسائل الفورية' : 'WhatsApp & Instant Messaging',
      icon: MessageSquare,
      iconColorClass: 'text-emerald-600 dark:text-emerald-400',
      count: connectedWhatsAppCount > 0 ? connectedWhatsAppCount : null,
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

  const allowedModuleIds = Array.from(new Set([...getVisibleModules(), 'communications']));

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
      {/* Desktop Sidebar (lg and up) - Lumina Quiet Luxury Navigation Rail (Collapsible to Icons-Only) */}
      <aside
        data-testid="desktop-sidebar"
        data-collapsed={isSidebarCollapsed ? 'true' : 'false'}
        className={`hidden lg:flex flex-col justify-between shrink-0 h-full overflow-hidden select-none border-e z-20 transition-all duration-200 ${
          isSidebarCollapsed ? 'w-17 items-center px-2 py-3' : 'w-48 p-3'
        } ${
          isRoyalRail
            ? 'bg-[#0E1329] text-slate-200 border-[#1C2447]'
            : isDarkRail
            ? 'bg-[#080C14] text-slate-200 border-slate-800/90'
            : isSandRail
            ? 'bg-[#F5EFE4] text-stone-800 border-[#DFD3BE]'
            : 'bg-white text-slate-800 border-slate-200/70'
        }`}
      >
        <div className={`space-y-1 overflow-y-auto min-h-0 w-full ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Top Mini Header with Collapse / Expand Action */}
          <div
            className={`flex items-center mb-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-800/80 w-full ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between px-1.5'
            }`}
          >
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                {language === 'ar' ? 'القائمة الرئيسية' : 'Navigation'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={
                isSidebarCollapsed
                  ? language === 'ar'
                    ? 'توسيع القائمة الجانبية (إظهار النصوص)'
                    : 'Expand Sidebar'
                  : language === 'ar'
                  ? 'تصغير القائمة (أيقونات فقط)'
                  : 'Collapse to Icons'
              }
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isDarkRail
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <CollapseIcon className="w-4 h-4 shrink-0" />
            </button>
          </div>

          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isCommItem = item.id === 'communications';
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                title={isSidebarCollapsed ? item.label : item.subtitle || item.label}
                aria-label={item.label}
                className={`relative flex items-center rounded-xl text-[12px] transition-all cursor-pointer group ${
                  isSidebarCollapsed
                    ? 'w-10 h-10 justify-center p-0 mx-auto'
                    : 'w-full gap-2.5 px-3 py-2'
                } ${
                  isActive
                    ? isRoyalRail
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : isDarkRail
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-900 text-white font-semibold shadow-xs'
                    : isDarkRail
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
                    : isSandRail
                    ? 'text-stone-700 hover:text-stone-950 hover:bg-[#EFE7D6] font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : isCommItem
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isDarkRail
                      ? 'text-slate-400'
                      : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                  strokeWidth={isActive ? 2.1 : 1.85}
                />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}

                {!isSidebarCollapsed && item.count !== null && (
                  <span
                    className={`ms-auto px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isCommItem
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                    }`}
                  >
                    {item.count}
                  </span>
                )}

                {isSidebarCollapsed && item.count !== null && (
                  <span
                    className={`absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                      isCommItem ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Branch & Warehouse Info Card + Scale & Collapse Controls */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 w-full">
          {!isSidebarCollapsed && (
            <div
              className={`px-3 py-2 rounded-xl border text-[11px] space-y-1 ${
                isDarkRail
                  ? 'bg-slate-900/70 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200/60'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span>{language === 'ar' ? 'الفرع' : 'Branch'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {language === 'ar' ? 'المركز الرئيسي' : 'Main HQ'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>{language === 'ar' ? 'المستودع' : 'Warehouse'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {language === 'ar' ? 'طاقة #1' : 'Solar #1'}
                </span>
              </div>
            </div>
          )}

          {/* Compact Tab Scale Controls */}
          {!isSidebarCollapsed && (
            <div
              data-testid="sidebar-tab-scale-controls"
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[10px] ${
                isDarkRail
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : 'bg-slate-50/70 border-slate-200/60 text-slate-500'
              }`}
            >
              <span className="font-semibold">{language === 'ar' ? 'حجم التبويبات' : 'Tab Size'}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="sidebar-tab-scale-dec"
                  disabled={sidebarTabScale <= TAB_SCALE_MIN}
                  onClick={() => handleStepSidebarTabScale('DEC')}
                  className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title={language === 'ar' ? 'تصغير التبويبات' : 'Shrink Tabs'}
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span
                  data-testid="sidebar-tab-scale-value"
                  dir="ltr"
                  className="font-mono font-bold text-[10px] min-w-[34px] text-center text-slate-700 dark:text-slate-200"
                >
                  {sidebarTabScale}%
                </span>
                <button
                  type="button"
                  data-testid="sidebar-tab-scale-inc"
                  disabled={sidebarTabScale >= TAB_SCALE_MAX}
                  onClick={() => handleStepSidebarTabScale('INC')}
                  className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title={language === 'ar' ? 'تكبير التبويبات' : 'Enlarge Tabs'}
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          {/* Sidebar Collapse / Expand Toggle Button */}
          <button
            type="button"
            data-testid="toggle-sidebar"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={
              isSidebarCollapsed
                ? language === 'ar'
                  ? 'توسيع القائمة الجانبية'
                  : 'Expand Sidebar'
                : language === 'ar'
                ? 'تصغير القائمة (أيقونات فقط بدون نصوص)'
                : 'Collapse Sidebar (Icons Only)'
            }
            className={`flex items-center rounded-xl border text-[11px] font-medium transition cursor-pointer ${
              isSidebarCollapsed
                ? 'w-10 h-10 mx-auto justify-center p-0'
                : 'w-full justify-between px-3 py-1.5'
            } ${
              isDarkRail
                ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-slate-50/80 border-slate-200/70 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {!isSidebarCollapsed && (
              <span className="truncate">
                {language === 'ar' ? 'أيقونات فقط' : 'Icons Only'}
              </span>
            )}
            <CollapseIcon className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Mobile & Tablet Bottom Navigation Bar (lg:hidden) — Native App Feel */}
      <nav
        data-testid="mobile-bottom-nav"
        className={`lg:hidden fixed bottom-0 inset-x-0 z-40 px-1.5 py-1.5 border-t flex items-center justify-around shadow-lg backdrop-blur-md ${
          isDarkRail
            ? 'bg-[#080C14]/95 border-slate-800 text-slate-200'
            : 'bg-white/95 border-slate-200/80 text-slate-700'
        }`}
      >
        {[
          { id: 'pos', label: language === 'ar' ? 'نقطة البيع' : 'POS', icon: ScanBarcode },
          { id: 'inventory', label: language === 'ar' ? 'المخزون' : 'Inventory', icon: Boxes },
          { id: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales', icon: Receipt },
          { id: 'accounting', label: language === 'ar' ? 'المحاسبة' : 'Accounting', icon: Landmark },
          { id: 'communications', label: language === 'ar' ? 'واتساب' : 'WhatsApp', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`mobile-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer min-w-[54px] ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          data-testid="mobile-nav-more-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer min-w-[48px]"
        >
          <Menu className="w-4 h-4" />
          <span>{language === 'ar' ? 'المزيد' : 'More'}</span>
        </button>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-72 max-w-[85vw] bg-white text-slate-800 h-full p-4 overflow-y-auto flex flex-col justify-between border-s border-slate-200 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <HasebBrandLogo size="sm" theme={uiTheme} />
                  <span className="font-bold text-sm text-slate-900">حاسب — القائمة الكاملة</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== null && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px]">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center text-[11px] font-mono text-slate-400">
              منظومة حاسب المحاسبية المتكاملة
            </div>
          </div>
        </div>
      )}
    </>
  );
}
