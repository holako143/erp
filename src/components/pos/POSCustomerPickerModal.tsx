import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Users, UserPlus } from 'lucide-react';
import { Customer } from '../../types/erp';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import {
  filterPosCustomersForQuickPicker,
  DEFAULT_WALKIN_CUSTOMER_LABEL_AR,
} from '../../core/posKeyboardNavigation';

export interface POSCustomerPickerModalProps {
  customers: Customer[];
  selectedCustomerId: string;
  warrantyCustomerName: string;
  language: string;
  currency: string;
  onSelectCustomer: (cust: {
    id: string;
    nameAr: string;
    name?: string;
    phone?: string;
  }) => void;
  onQuickCreateCustomer: (name: string, phone: string) => void;
  onClose: () => void;
}

const POSCustomerPickerModal: React.FC<POSCustomerPickerModalProps> = React.memo(
  ({
    customers,
    selectedCustomerId,
    warrantyCustomerName,
    language,
    currency,
    onSelectCustomer,
    onQuickCreateCustomer,
    onClose,
  }) => {
    const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
    const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState<boolean>(false);
    const [quickNewCustomerName, setQuickNewCustomerName] = useState<string>('');
    const [quickNewCustomerPhone, setQuickNewCustomerPhone] = useState<string>('');
    const customerSearchInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      const timer = setTimeout(() => {
        customerSearchInputRef.current?.focus();
      }, 30);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [onClose]);

    const filteredPickerCustomers = useMemo(
      () => filterPosCustomersForQuickPicker(customers, customerSearchQuery),
      [customers, customerSearchQuery]
    );

    const handleQuickSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const cleanName = quickNewCustomerName.trim();
      if (!cleanName) return;
      const cleanPhone = quickNewCustomerPhone.trim() || '+967 770 000 000';
      onQuickCreateCustomer(cleanName, cleanPhone);
      setQuickNewCustomerName('');
      setQuickNewCustomerPhone('');
      setIsQuickAddCustomerOpen(false);
    };

    return (
      <div
        data-testid="pos-customer-picker-modal"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/65 backdrop-blur-xs p-0 sm:p-4"
      >
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl haseb-card-gradient text-white flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                    اختيار العميل المستفيد للفاتورة
                  </h3>
                  <kbd className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px] font-bold">
                    F8
                  </kbd>
                </div>
                <p className="text-[10px] text-slate-500">
                  ابحث بالاسم أو رقم الجوال لتسجيل الفاتورة والضمان باسم العميل
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="pos-customer-picker-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Search Bar + Quick Add Toggle */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={customerSearchInputRef}
                  type="text"
                  autoFocus
                  data-testid="pos-customer-picker-search"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredPickerCustomers.length > 0 && customerSearchQuery.trim()) {
                        onSelectCustomer(filteredPickerCustomers[0]);
                      } else {
                        onSelectCustomer({
                          id: 'cust-pos-walkin',
                          nameAr: DEFAULT_WALKIN_CUSTOMER_LABEL_AR,
                          phone: '',
                        });
                      }
                    }
                  }}
                  placeholder="ابحث باسم العميل، رقم الجوال، أو الكود ثم اضغط Enter..."
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2 pr-9 pl-3 text-xs font-semibold text-slate-900 outline-hidden transition"
                />
              </div>
              <button
                type="button"
                data-testid="pos-customer-picker-new-toggle"
                onClick={() => setIsQuickAddCustomerOpen((prev) => !prev)}
                className="px-3 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>عميل جديد</span>
              </button>
            </div>

            {/* Inline Quick Add Customer Mini-Form */}
            {isQuickAddCustomerOpen && (
              <form
                onSubmit={handleQuickSubmit}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
              >
                <div className="font-bold text-slate-800">
                  تسجيل عميل جديد واعتماده للفاتورة فوراً:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    data-testid="pos-quick-new-customer-name"
                    value={quickNewCustomerName}
                    onChange={(e) => setQuickNewCustomerName(e.target.value)}
                    placeholder="اسم العميل الرباعي أو المؤسسة *"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-600"
                  />
                  <input
                    type="text"
                    data-testid="pos-quick-new-customer-phone"
                    value={quickNewCustomerPhone}
                    onChange={(e) => setQuickNewCustomerPhone(e.target.value)}
                    placeholder="رقم الجوال (+967...)"
                    dir="ltr"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 outline-hidden focus:border-blue-600"
                  />
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddCustomerOpen(false)}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    data-testid="pos-quick-new-customer-save-btn"
                    className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                  >
                    حفظ واختيار العميل
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Customers List */}
          <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
            {/* Default Walk-in Cash Customer Option */}
            <button
              type="button"
              data-testid="pos-customer-option-walkin"
              onClick={() =>
                onSelectCustomer({
                  id: 'cust-pos-walkin',
                  nameAr: DEFAULT_WALKIN_CUSTOMER_LABEL_AR,
                  phone: '',
                })
              }
              className={`w-full p-2.5 rounded-xl border text-right transition flex items-center justify-between gap-2 cursor-pointer ${
                selectedCustomerId === 'cust-pos-walkin' ||
                warrantyCustomerName === DEFAULT_WALKIN_CUSTOMER_LABEL_AR
                  ? 'haseb-nav-active text-white shadow-xs'
                  : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    selectedCustomerId === 'cust-pos-walkin'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  نقد
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">
                    {DEFAULT_WALKIN_CUSTOMER_LABEL_AR} (الافتراضي)
                  </div>
                  <div
                    className={`text-[10px] ${
                      selectedCustomerId === 'cust-pos-walkin' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    مبيعات نقدية فورية مباشرة بدون ذمم آجلة
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  selectedCustomerId === 'cust-pos-walkin'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                افتراضي
              </span>
            </button>

            {/* Filtered Registered Customers */}
            {filteredPickerCustomers.map((cust) => {
              const isSelected =
                selectedCustomerId === cust.id &&
                warrantyCustomerName !== DEFAULT_WALKIN_CUSTOMER_LABEL_AR;
              return (
                <button
                  key={cust.id}
                  type="button"
                  data-testid={`pos-customer-option-${cust.id}`}
                  onClick={() => onSelectCustomer(cust)}
                  className={`w-full p-2.5 rounded-xl border text-right transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {(cust.nameAr || cust.name || 'ع').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">
                        {language === 'ar' ? cust.nameAr : cust.name}
                      </div>
                      <div
                        className={`text-[10px] font-mono flex items-center gap-2 ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                        dir="ltr"
                      >
                        <span>{cust.phone}</span>
                        {cust.code && <span>• {cust.code}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div
                      className={`text-[10px] font-mono font-bold ${
                        isSelected
                          ? 'text-white'
                          : (cust.balance || 0) > 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                      dir="ltr"
                    >
                      {formatCleanNumber(cust.balance || 0)} {currency}
                    </div>
                    <div
                      className={`text-[9px] ${
                        isSelected ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      الرصيد الحالي
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredPickerCustomers.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                لا يوجد عميل مطابق للبحث &quot;{customerSearchQuery}&quot; — اضغط على &quot;عميل جديد&quot; لإضافته فوراً
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span>إجمالي العملاء المسجلين: {customers.length} عميل</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }
);

POSCustomerPickerModal.displayName = 'POSCustomerPickerModal';
export default POSCustomerPickerModal;
