import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Search,
  X,
  Package,
  Receipt,
  Calculator,
  Users,
  FileText,
  ShoppingBag,
  ShieldCheck,
  Undo2,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import {
  GlobalSearchCategory,
  GlobalSearchResultItem,
  searchGlobalEntities,
} from '../../core/globalSearchEngine';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    products,
    customers,
    suppliers,
    salesInvoices,
    salesReturns,
    salesPipelineDocs,
    warrantyTickets,
    purchaseOrders,
    goodsReceipts,
    journalEntries,
    chartAccounts,
    setActiveTab,
    currency,
    language,
    direction,
  } = useERP();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedCategory, setSelectedCategory] = useState<GlobalSearchCategory>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const { zIndex, isTopLayer } = useModalLayer(isCommandPaletteOpen, 85);

  // Keyboard shortcut listener for Ctrl+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen && isTopLayer) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isTopLayer, setIsCommandPaletteOpen]);

  const searchOutput = useMemo(
    () =>
      searchGlobalEntities({
        query: deferredQuery,
        category: selectedCategory,
        products,
        customers,
        suppliers,
        salesInvoices,
        salesReturns,
        salesPipelineDocs,
        warrantyTickets,
        purchaseOrders,
        goodsReceipts,
        journalEntries,
        chartAccounts,
        currency,
        language,
        limitPerGroup: selectedCategory === 'ALL' ? 6 : 15,
      }),
    [
      deferredQuery,
      selectedCategory,
      products,
      customers,
      suppliers,
      salesInvoices,
      salesReturns,
      salesPipelineDocs,
      warrantyTickets,
      purchaseOrders,
      goodsReceipts,
      journalEntries,
      chartAccounts,
      currency,
      language,
    ]
  );

  useEffect(() => {
    setHighlightedIndex(0);
    if (!isCommandPaletteOpen) {
      setQuery('');
    }
  }, [deferredQuery, selectedCategory, isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const handleActivateResult = (item: GlobalSearchResultItem) => {
    setActiveTab(item.targetModule);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('haseb-command-navigate', { detail: item }));
    }, 40);
    setIsCommandPaletteOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchOutput.flatResults.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % searchOutput.flatResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchOutput.flatResults.length > 0) {
        setHighlightedIndex((prev) =>
          (prev - 1 + searchOutput.flatResults.length) % searchOutput.flatResults.length
        );
      }
    } else if (e.key === 'Enter' && searchOutput.flatResults.length > 0) {
      e.preventDefault();
      const chosen = searchOutput.flatResults[highlightedIndex] || searchOutput.flatResults[0];
      if (chosen) handleActivateResult(chosen);
    }
  };

  const getDocumentIcon = (subType?: GlobalSearchResultItem['subType']) => {
    switch (subType) {
      case 'PURCHASE_ORDER':
      case 'GOODS_RECEIPT':
        return <ShoppingBag className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'WARRANTY_RMA':
        return <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'SALES_RETURN':
        return <Undo2 className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'JOURNAL_ENTRY':
        return <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'QUOTE_ORDER':
        return <FileText className="w-4 h-4 text-violet-600 shrink-0" />;
      case 'INVOICE':
      default:
        return <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />;
    }
  };

  const categories: Array<{
    id: GlobalSearchCategory;
    labelAr: string;
    labelEn: string;
  }> = [
    { id: 'ALL', labelAr: 'الكل', labelEn: 'All' },
    { id: 'DOCUMENTS', labelAr: 'المستندات والفواتير', labelEn: 'Documents' },
    { id: 'CUSTOMERS', labelAr: 'العملاء', labelEn: 'Customers' },
    { id: 'INVENTORY', labelAr: 'المخزون والأصناف', labelEn: 'Inventory' },
    { id: 'ACCOUNTS', labelAr: 'شجرة الحسابات', labelEn: 'Accounts' },
  ];

  const renderResultRow = (
    item: GlobalSearchResultItem,
    iconNode: React.ReactNode,
    globalIdx: number
  ) => {
    const isHighlighted = globalIdx === highlightedIndex;
    return (
      <button
        key={item.id}
        type="button"
        data-testid={`command-result-${item.id}`}
        onClick={() => handleActivateResult(item)}
        onMouseEnter={() => {
          if (globalIdx >= 0) setHighlightedIndex(globalIdx);
        }}
        className={`w-full text-start flex items-center justify-between gap-3 p-2.5 rounded-lg transition cursor-pointer ${
          isHighlighted
            ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-300 dark:ring-indigo-700'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {iconNode}
          <div className="min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
              {language === 'ar' ? item.titleAr : item.titleEn}
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
              {language === 'ar' ? item.subtitleAr : item.subtitleEn}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
            {language === 'ar' ? item.badgeAr : item.badgeEn}
          </span>
          {item.amountText && (
            <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
              {item.amountText}
            </span>
          )}
          <ArrowIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </button>
    );
  };

  return renderModalPortal(
    <div
      data-testid="command-palette-backdrop"
      data-modal-top={isTopLayer ? 'true' : 'false'}
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setIsCommandPaletteOpen(false);
        }
      }}
      className="fixed inset-0 flex items-start justify-center pt-16 bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={language === 'ar' ? 'البحث الشامل في النظام' : 'Global System Search'}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col"
      >
        {/* Input Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            data-testid="command-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={
              language === 'ar'
                ? 'ابحث عن المستندات، الفواتير، أوامر الشراء، العملاء، الأصناف، أو الحسابات...'
                : 'Search documents, invoices, POs, customers, inventory items, or accounts...'
            }
            className="w-full text-sm outline-hidden text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent"
            autoFocus
          />
          {query && (
            <button
              type="button"
              aria-label={language === 'ar' ? 'مسح البحث' : 'Clear search'}
              onClick={() => setQuery('')}
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              {language === 'ar' ? 'مسح' : 'Clear'}
            </button>
          )}
          <button
            type="button"
            aria-label={language === 'ar' ? 'إغلاق البحث الشامل' : 'Close global search'}
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => {
            const count = searchOutput.countsByCategory[cat.id];
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                data-testid={`cmd-filter-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                }`}
              >
                <span>{language === 'ar' ? cat.labelAr : cat.labelEn}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Module Navigation (shown when query is empty) */}
          {!deferredQuery.trim() && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                {language === 'ar'
                  ? 'الوصول السريع للوحدات الأساسية'
                  : 'Quick Module Navigation'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { id: 'pos', name: language === 'ar' ? 'نقطة البيع' : 'POS', icon: Receipt },
                  { id: 'inventory', name: language === 'ar' ? 'المخزون' : 'Inventory', icon: Package },
                  { id: 'sales', name: language === 'ar' ? 'المبيعات' : 'Sales', icon: Receipt },
                  { id: 'purchasing', name: language === 'ar' ? 'المشتريات' : 'Purchasing', icon: ShoppingBag },
                  { id: 'settings', name: language === 'ar' ? 'الإعدادات والنسخ' : 'Settings & Backup', icon: SlidersHorizontal },
                  {
                    id: 'businessModules',
                    name: language === 'ar' ? 'المعالجة الجماعية CSV' : 'Batch Processing (CSV)',
                    icon: FileSpreadsheet,
                    testId: 'cmd-quick-batch-processing',
                    openBatch: true,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={item.testId}
                    onClick={() => {
                      if (item.openBatch && typeof window !== 'undefined') {
                        (window as any).__hasebOpenBatchTab = true;
                        window.dispatchEvent(new CustomEvent('haseb-open-batch-processing'));
                      }
                      setActiveTab(item.id);
                      setIsCommandPaletteOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-200 font-medium transition text-start cursor-pointer"
                  >
                    <item.icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Direct Action Match for Batch Processing */}
          {deferredQuery.trim() &&
            /batch|csv|bulk|معالجة|جماعي|استيراد/i.test(deferredQuery.trim()) && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                  {language === 'ar' ? 'إجراء سريع للوحدات' : 'Module Action'}
                </div>
                <button
                  type="button"
                  data-testid="cmd-action-batch-processing"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      (window as any).__hasebOpenBatchTab = true;
                      window.dispatchEvent(new CustomEvent('haseb-open-batch-processing'));
                    }
                    setActiveTab('businessModules');
                    setIsCommandPaletteOpen(false);
                  }}
                  className="w-full text-start flex items-center justify-between gap-3 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {language === 'ar' ? 'وحدة المعالجة الجماعية (CSV)' : 'Batch Processing (CSV)'}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                        {language === 'ar'
                          ? 'تحديث جماعي لأصناف المخزون أو سجلات العملاء عبر CSV'
                          : 'Bulk update inventory items or customer records via CSV'}
                      </div>
                    </div>
                  </div>
                  <ArrowIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                </button>
              </div>
            )}

          {/* Inventory Items */}
          {searchOutput.inventory.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {language === 'ar'
                  ? `المخزون والأصناف (${searchOutput.countsByCategory.INVENTORY})`
                  : `Inventory Items (${searchOutput.countsByCategory.INVENTORY})`}
              </div>
              <div className="space-y-1">
                {searchOutput.inventory.map((item) =>
                  renderResultRow(
                    item,
                    <Package className="w-4 h-4 text-emerald-600 shrink-0" />,
                    searchOutput.flatResults.indexOf(item)
                  )
                )}
              </div>
            </div>
          )}

          {/* Customers */}
          {searchOutput.customers.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {language === 'ar'
                  ? `العملاء (${searchOutput.countsByCategory.CUSTOMERS})`
                  : `Customers (${searchOutput.countsByCategory.CUSTOMERS})`}
              </div>
              <div className="space-y-1">
                {searchOutput.customers.map((item) =>
                  renderResultRow(
                    item,
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />,
                    searchOutput.flatResults.indexOf(item)
                  )
                )}
              </div>
            </div>
          )}

          {/* Documents across all modules */}
          {searchOutput.documents.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {language === 'ar'
                  ? `المستندات والفواتير والقيود (${searchOutput.countsByCategory.DOCUMENTS})`
                  : `Documents Across All Modules (${searchOutput.countsByCategory.DOCUMENTS})`}
              </div>
              <div className="space-y-1">
                {searchOutput.documents.map((item) =>
                  renderResultRow(
                    item,
                    getDocumentIcon(item.subType),
                    searchOutput.flatResults.indexOf(item)
                  )
                )}
              </div>
            </div>
          )}

          {/* Accounts */}
          {searchOutput.accounts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {language === 'ar'
                  ? `شجرة الحسابات (${searchOutput.countsByCategory.ACCOUNTS})`
                  : `Accounts (${searchOutput.countsByCategory.ACCOUNTS})`}
              </div>
              <div className="space-y-1">
                {searchOutput.accounts.map((item) =>
                  renderResultRow(
                    item,
                    <Calculator className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />,
                    searchOutput.flatResults.indexOf(item)
                  )
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {searchOutput.totalMatches === 0 && (
            <div
              data-testid="command-palette-empty"
              className="py-8 text-center text-slate-500 dark:text-slate-400 space-y-1"
            >
              <div className="font-bold text-slate-700 dark:text-slate-200">
                {language === 'ar'
                  ? 'لا توجد نتائج مطابقة لبحثك'
                  : 'No matching documents, customers, or inventory items found'}
              </div>
              <div className="text-[11px]">
                {language === 'ar'
                  ? 'جرّب البحث برقم الفاتورة، اسم العميل، كود الصنف (SKU)، الباركود، أو رقم أمر الشراء.'
                  : 'Try searching by invoice number, customer name/phone, SKU, barcode, or PO number.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>{language === 'ar' ? '↑↓ للتنقل • Enter للفتح • Esc للإغلاق' : '↑↓ Navigate • Enter Open • Esc Close'}</span>
          </div>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {language === 'ar' ? 'البحث الشامل — حاسب ERP' : 'Haseb ERP Global Search'}
          </span>
        </div>
      </div>
    </div>
  );
};
