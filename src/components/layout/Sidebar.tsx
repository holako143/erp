import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  LayoutDashboard,
  Barcode,
  Package,
  ShoppingCart,
  Receipt,
  Calculator,
  Briefcase,
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
  Utensils,
  Cpu,
  ShoppingBasket,
  Pill,
  HardHat,
  Layers,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { IndustryType } from '../../types/erp';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    t,
    products,
    purchaseOrders,
    language,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    activeIndustry,
    hasModuleAccess,
    uiTheme,
  } = useERP();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const lowStockCount = products.filter((p) => p.stockQty <= p.reorderPoint).length;
  const pendingPOCount = purchaseOrders.filter((po) => po.status === 'PENDING_APPROVAL').length;

  const industryMeta: Record<IndustryType, { labelAr: string; labelEn: string; icon: React.ElementType }> = {
    general: { labelAr: 'تجارة وصناعة شاملة', labelEn: 'General Enterprise', icon: Layers },
    restaurant: { labelAr: 'المطاعم والضيافة', labelEn: 'Restaurants & F&B', icon: Utensils },
    electronics: { labelAr: 'الإلكترونيات والطاقة الشمسية', labelEn: 'Electronics, Solar & Batteries', icon: Cpu },
    grocery: { labelAr: 'التموينات والسوبرماركت', labelEn: 'Supermarket & Scale', icon: ShoppingBasket },
    pharmacy: { labelAr: 'الصيدليات والطبي', labelEn: 'Pharmacy & Medical', icon: Pill },
    contracting: { labelAr: 'المقاولات والمشاريع', labelEn: 'Contracting & Engineering', icon: HardHat },
  };

  const currentIndustryMeta = industryMeta[activeIndustry] || industryMeta.general;
  const IndustryIcon = currentIndustryMeta.icon;

  const navGroups = [
    {
      groupId: 'operations',
      titleAr: 'العمليات ونقاط البيع',
      titleEn: 'CORE OPERATIONS',
      items: [
        {
          id: 'dashboard',
          label: t('dashboard'),
          icon: LayoutDashboard,
          count: null as number | null,
        },
        {
          id: 'pos',
          label: t('pos'),
          icon: CreditCard,
          count: null as number | null,
        },
        {
          id: 'sales',
          label: t('sales'),
          icon: Receipt,
          count: null as number | null,
        },
        {
          id: 'communications',
          label: language === 'ar' ? 'الواتساب والرسائل (USB)' : 'WhatsApp & SMS Hub',
          icon: MessageSquare,
          count: null as number | null,
        },
      ],
    },
    {
      groupId: 'supply',
      titleAr: 'المخزون وسلسلة الإمداد',
      titleEn: 'SUPPLY CHAIN & WMS',
      items: [
        {
          id: 'inventory',
          label: t('inventory'),
          icon: Package,
          count: lowStockCount > 0 ? lowStockCount : null,
        },
        {
          id: 'barcodeEngine',
          label: t('barcodeEngine'),
          icon: Barcode,
          count: null as number | null,
        },
        {
          id: 'purchasing',
          label: t('purchasing'),
          icon: ShoppingCart,
          count: pendingPOCount > 0 ? pendingPOCount : null,
        },
      ],
    },
    {
      groupId: 'finance',
      titleAr: 'المالية ووحدات الأعمال',
      titleEn: 'FINANCE & ENTERPRISE',
      items: [
        {
          id: 'accounting',
          label: t('accounting'),
          icon: Calculator,
          count: null as number | null,
        },
        {
          id: 'businessModules',
          label: t('businessModules'),
          icon: Briefcase,
          count: null as number | null,
        },
        {
          id: 'aiInsights',
          label: t('aiInsights'),
          icon: Bot,
          count: null as number | null,
        },
      ],
    },
    {
      groupId: 'governance',
      titleAr: 'الحوكمة والإدارة',
      titleEn: 'GOVERNANCE & SYSTEM',
      items: [
        {
          id: 'masterAdmin',
          label: language === 'ar' ? 'الإدارة العليا للنظام (Master)' : 'Master System Admin',
          icon: ShieldCheck,
          count: null as number | null,
        },
        {
          id: 'saasPlatform',
          label: t('saasPlatform'),
          icon: CloudCog,
          count: null as number | null,
        },
        {
          id: 'security',
          label: language === 'ar' ? 'الحماية والعضويات والترخيص' : 'Security & Licensing',
          icon: ShieldCheck,
          count: null as number | null,
        },
        {
          id: 'settings',
          label: t('settings'),
          icon: Settings,
          count: null as number | null,
        },
      ],
    },
  ];

  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => hasModuleAccess(item.id)),
    }))
    .filter((g) => g.items.length > 0);

  const flatNavItems = filteredGroups.flatMap((g) => g.items);

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
      {/* Desktop Sidebar (lg and up) - Institutional Swiss-Grid Navigation Rail */}
      <aside
        data-testid="desktop-sidebar"
        className={`hidden lg:flex flex-col shrink-0 min-h-[calc(100vh-49px)] select-none border-e transition-all duration-200 ${
          isSidebarCollapsed ? 'w-16' : 'w-60'
        } ${
          isLightSidebar
            ? 'bg-white text-zinc-700 border-zinc-200'
            : 'bg-[#0B1120] text-slate-300 border-slate-800/90'
        }`}
      >
        {/* Active Operational Sector Header & Collapse Trigger */}
        <div
          className={`border-b flex items-center ${
            isLightSidebar ? 'border-zinc-200' : 'border-slate-800/80'
          } ${isSidebarCollapsed ? 'p-2.5 justify-center' : 'px-3.5 py-3 justify-between'}`}
        >
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2.5 cursor-pointer group truncate text-start"
              title={language === 'ar' ? 'تغيير القطاع التشغيلي من الإعدادات' : 'Switch Operational Sector'}
            >
              <div
                className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
                  isLightSidebar
                    ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                    : 'bg-slate-900 border-slate-700/80 text-slate-200'
                }`}
              >
                <IndustryIcon className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="text-[10px] text-slate-400 font-medium leading-none">
                  {language === 'ar' ? 'القطاع التشغيلي' : 'Operational Sector'}
                </div>
                <div
                  className={`text-xs font-bold truncate mt-1 ${
                    isLightSidebar ? 'text-zinc-900' : 'text-slate-100'
                  }`}
                >
                  {language === 'ar' ? currentIndustryMeta.labelAr : currentIndustryMeta.labelEn}
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            data-testid="toggle-sidebar"
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
            className={`p-1.5 rounded-md border transition cursor-pointer shrink-0 ${
              isLightSidebar
                ? 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <CollapseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Grouped Navigation Sections */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.groupId} className={isSidebarCollapsed ? 'px-2' : 'px-2.5'}>
              {!isSidebarCollapsed && (
                <div
                  className={`px-2.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase ${
                    isLightSidebar ? 'text-zinc-400' : 'text-slate-500'
                  }`}
                >
                  {language === 'ar' ? group.titleAr : group.titleEn}
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`nav-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`relative w-full flex items-center rounded-md text-xs transition-colors cursor-pointer group ${
                        isSidebarCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-2.5 py-2'
                      } ${
                        isActive
                          ? isLightSidebar
                            ? 'bg-zinc-900 text-white font-semibold'
                            : 'bg-slate-800/90 text-white font-semibold border-s-2 border-emerald-400'
                          : isLightSidebar
                          ? 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100 font-medium'
                      }`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5 truncate'}`}>
                        <Icon
                          className={`${isSidebarCollapsed ? 'w-4 h-4' : 'w-4 h-4'} shrink-0 ${
                            isActive
                              ? isLightSidebar
                                ? 'text-white'
                                : 'text-emerald-400'
                              : isLightSidebar
                              ? 'text-zinc-500 group-hover:text-zinc-900'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Understated Tabular Counter Only for Actionable Alerts */}
                      {!isSidebarCollapsed && item.count !== null && (
                        <span
                          className={`font-mono text-[11px] font-semibold tabular-nums ${
                            isActive ? 'text-emerald-300' : 'text-amber-500'
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
            </div>
          ))}
        </nav>

        {/* Footer Collapse Control */}
        <div
          className={`p-2.5 border-t ${
            isLightSidebar ? 'border-zinc-200' : 'border-slate-800/80'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center transition cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            } ${
              isLightSidebar
                ? 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
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

      {/* Mobile Bottom Navigation Bar (sm/md only) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0B1120] border-t border-slate-800 z-40 px-2 py-1.5 flex items-center justify-around">
        {[
          { id: 'dashboard', label: language === 'ar' ? 'الرئيسية' : 'Home', icon: LayoutDashboard },
          { id: 'pos', label: 'POS', icon: CreditCard },
          { id: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales', icon: Receipt },
          { id: 'inventory', label: language === 'ar' ? 'المخزون' : 'Stock', icon: Package },
          { id: 'settings', label: language === 'ar' ? 'الإعدادات' : 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-[10px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>{language === 'ar' ? 'المزيد' : 'More'}</span>
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex justify-end">
          <div className="w-72 bg-[#0B1120] text-slate-200 h-full p-4 overflow-y-auto flex flex-col justify-between border-s border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="font-bold text-sm text-white">RLM Enterprise ERP</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {flatNavItems.map((item) => {
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                        isActive ? 'bg-slate-800 text-white border-s-2 border-emerald-400' : 'hover:bg-slate-900 text-slate-300'
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

            <div className="pt-4 border-t border-slate-800 text-center text-[11px] font-mono text-slate-500">
              RLM Financial Core v6.5
            </div>
          </div>
        </div>
      )}
    </>
  );
};

