import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Search,
  X,
  Package,
  Receipt,
  Calculator,
  Barcode,
  Layers,
  ArrowRight,
  ArrowLeft,
  Command,
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    products,
    salesInvoices,
    chartAccounts,
    setActiveTab,
    currency,
    language,
    direction,
  } = useERP();

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for Ctrl+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.nameAr.includes(query) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode.includes(query)
  );

  const filteredInvoices = salesInvoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(query.toLowerCase())
  );

  const filteredAccounts = chartAccounts.filter(
    (acc) =>
      acc.code.includes(query) ||
      acc.name.toLowerCase().includes(query.toLowerCase()) ||
      acc.nameAr.includes(query)
  );

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div
      data-testid="command-palette-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setIsCommandPaletteOpen(false);
        }
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Input Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              language === 'ar'
                ? 'ابحث بالاسم، الكود، الباركود، رقم الفاتورة أو شجرة الحسابات...'
                : 'Search products, SKU, barcodes, invoice numbers, or accounts...'
            }
            className="w-full text-sm outline-hidden text-slate-800 placeholder-slate-400 bg-transparent"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Module Navigation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
              {language === 'ar'
                ? 'الوصول السريع للوحدات الأساسية (إلكترونيات وطاقة شمسية)'
                : 'Core Sector Quick Navigation'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'pos', name: language === 'ar' ? 'نقطة البيع POS' : 'POS Register', icon: Receipt },
                { id: 'inventory', name: language === 'ar' ? 'المخزون والجرد WMS' : 'Inventory WMS', icon: Package },
                { id: 'sales', name: language === 'ar' ? 'المبيعات والضمان' : 'Sales & RMA', icon: Receipt },
                { id: 'accounting', name: language === 'ar' ? 'المحاسبة والقيود' : 'Accounting & Ledger', icon: Calculator },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition text-start"
                >
                  <item.icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {language === 'ar' ? `المنتجات والأصناف (${filteredProducts.length})` : `Products (${filteredProducts.length})`}
              </div>
              <div className="space-y-1">
                {filteredProducts.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveTab('inventory');
                      setIsCommandPaletteOpen(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50/70 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">
                          {language === 'ar' ? p.nameAr : p.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          SKU: {p.sku} | Barcode: {p.barcode}
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="font-bold text-slate-900">
                        {p.salePrice} {currency}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        Stock: {p.stockQty} {p.uom}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {filteredInvoices.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {language === 'ar' ? `فواتير المبيعات (${filteredInvoices.length})` : `Invoices (${filteredInvoices.length})`}
              </div>
              <div className="space-y-1">
                {filteredInvoices.slice(0, 4).map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setActiveTab('sales');
                      setIsCommandPaletteOpen(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50/70 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-500">{inv.customerName}</div>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="font-bold text-slate-900">
                        {inv.grandTotal} {currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accounts */}
          {filteredAccounts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {language === 'ar' ? `شجرة الحسابات القياسية (${filteredAccounts.length})` : `Accounts (${filteredAccounts.length})`}
              </div>
              <div className="space-y-1">
                {filteredAccounts.slice(0, 4).map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setActiveTab('accounting');
                      setIsCommandPaletteOpen(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50/70 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                        {acc.code}
                      </span>
                      <span className="font-medium text-slate-800">
                        {language === 'ar' ? acc.nameAr : acc.name}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-600">
                      {acc.balance.toLocaleString()} {currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Esc to close</span>
            <span>•</span>
            <span>Ctrl+K to toggle</span>
          </div>
          <span className="font-medium text-indigo-600">RLM ERP Universal Search</span>
        </div>
      </div>
    </div>
  );
};
