import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  FileText,
  DollarSign,
  Package,
  Calculator,
  Camera,
} from 'lucide-react';
import { CameraBarcodeScannerModal } from '../components/common/CameraBarcodeScannerModal';
import { allocateLandedCost } from '../core/inventoryEngine';

export const PurchasingView: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    recordSupplierPaymentVoucher,
    purchaseOrders,
    products,
    addPurchaseOrder,
    approvePurchaseOrder,
    applyLandedCostToProducts,
    currentWarehouse,
    currency,
    language,
    currentTenant,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers' | 'landedCost'>('orders');
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [purchasingBanner, setPurchasingBanner] = useState<string | null>(null);

  // Supplier Payment Voucher State
  const [spvSupplierId, setSpvSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [spvAmount, setSpvAmount] = useState<number>(10000);
  const [spvMethod, setSpvMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [spvRef, setSpvRef] = useState<string>('SPV-2026-8801');

  // New PO State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [orderQty, setOrderQty] = useState(50);
  const [unitCost, setUnitCost] = useState(products[0]?.costPrice || 100);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const handleCameraBarcodeScan = (scannedCode: string, matchedProduct?: any, qty = 1) => {
    if (matchedProduct) {
      setSelectedProductId(matchedProduct.id);
      setUnitCost(matchedProduct.costPrice);
      setPurchasingBanner(`تم تحديد الصنف المطلوب توريده بالكاميرا: ${matchedProduct.nameAr || matchedProduct.name}`);
    } else {
      setPurchasingBanner(`الباركود [${scannedCode}] غير مسجل بقاعدة الأصناف.`);
    }
  };

  // Landed Cost Calculator State
  const [freightAmount, setFreightAmount] = useState(1500);
  const [customsAmount, setCustomsAmount] = useState(2500);
  const [insuranceAmount, setInsuranceAmount] = useState(500);
  const [allocationMethod, setAllocationMethod] = useState<'BY_VALUE' | 'BY_QUANTITY'>('BY_VALUE');

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  const targetProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = orderQty * unitCost;
    const taxAmount = subtotal * 0.15;
    const total = subtotal + taxAmount;

    addPurchaseOrder({
      tenantId: currentTenant.id,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items: [
        {
          productId: targetProduct.id,
          productName: targetProduct.name,
          sku: targetProduct.sku,
          quantity: orderQty,
          unitCost,
          taxRate: 0.15,
          taxAmount,
          total,
        },
      ],
      subtotal,
      taxAmount,
      total,
      status: 'APPROVED',
      warehouseId: currentWarehouse.id,
    });

    setIsNewPOModalOpen(false);
  };

  // Run Landed Cost Simulation
  const sampleLandedItems = products.slice(0, 3).map((p) => ({
    productId: p.id,
    name: language === 'ar' ? p.nameAr : p.name,
    sku: p.sku,
    quantity: p.stockQty,
    baseCost: p.costPrice,
    totalBaseValue: p.stockQty * p.costPrice,
  }));
  const totalExtraCosts = freightAmount + customsAmount + insuranceAmount;
  const landedResults = allocateLandedCost(sampleLandedItems, totalExtraCosts, allocationMethod);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-teal-600" />
            <span>{language === 'ar' ? 'المشتريات وسلسلة التوريد' : 'Purchasing & Procurement'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'أوامر الشراء، اعتمادات التوريد، فواتير الموردين، وتوزيع تكاليف الشحن والجمارك (Landed Cost)'
              : 'Purchase orders, vendor bills, receiving workflows, and landed cost distribution'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'orders' ? 'bg-white text-teal-700 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              {language === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'suppliers' ? 'bg-white text-teal-700 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              {language === 'ar' ? 'سجل الموردين' : 'Suppliers'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('landedCost')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === 'landedCost' ? 'bg-white text-teal-700 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              {language === 'ar' ? 'حاسبة التكاليف الإضافية' : 'Landed Costs'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsNewPOModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'أمر شراء جديد (PO)' : 'New Purchase Order'}</span>
          </button>
        </div>
      </div>

      {purchasingBanner && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{purchasingBanner}</span>
          <button
            type="button"
            onClick={() => setPurchasingBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'رقم الأمر / التاريخ' : 'PO Number / Date'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'الأصناف المطلوبة' : 'Ordered Items'}</th>
                  <th className="py-3 px-4 text-end">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</th>
                  <th className="py-3 px-4 text-end">{language === 'ar' ? 'ضريبة 15%' : 'VAT 15%'}</th>
                  <th className="py-3 px-4 text-end">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((po) => {
                  const isReceived = po.status === 'RECEIVED';
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono text-sm">{po.poNumber}</div>
                        <div className="text-[10px] text-slate-400">{po.orderDate}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {po.supplierName}
                      </td>
                      <td className="py-3 px-4">
                        {po.items.map((item, idx) => (
                          <div key={idx} className="font-medium text-slate-700">
                            {item.quantity}x {item.productName} ({item.unitCost} {currency})
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-end font-semibold text-slate-700 font-mono tabular-nums">
                        {(po.subtotal ?? 0).toLocaleString()} {currency}
                      </td>
                      <td className="py-3 px-4 text-end text-slate-500 font-mono tabular-nums">
                        {(po.taxAmount ?? (po as any).taxTotal ?? 0).toLocaleString()} {currency}
                      </td>
                      <td className="py-3 px-4 text-end font-bold text-slate-900 text-sm font-mono tabular-nums">
                        {(po.total ?? (po as any).grandTotal ?? 0).toLocaleString()} {currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded border text-[11px] font-semibold ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {isReceived
                            ? (language === 'ar' ? 'تم الاستلام والترحيل' : 'Received')
                            : (language === 'ar' ? 'معتمد وقيد الشحن' : 'Approved')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isReceived && (
                          <button
                            type="button"
                            data-testid={`btn-receive-po-${po.id}`}
                            onClick={() => {
                              const res = approvePurchaseOrder(po.id);
                              if (res?.success) {
                                setPurchasingBanner(
                                  `تم استلام بضاعة أمر الشراء (${po.poNumber}) في المستودع وتحديث ذمة المورد وترحيل القيد المحاسبي (${res.entryNumber}) بنجاح.`
                                );
                              }
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            {language === 'ar' ? 'استلام المخزون وترحيل الفاتورة' : 'Receive Goods'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Supplier Payment Voucher (سند صرف للموردين) */}
          <div className="bg-white p-5 rounded-md border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  إصدار سند صرف وسداد دفعة لمورد (Supplier Payment Voucher)
                </h3>
                <p className="text-[11px] text-slate-500">
                  تخفيض رصيد الذمم الدائنة للمورد وترحيل قيد يومية مزدوج متوازن (من حـ/ الموردين 2101 إلى حـ/ البنك 1102 أو الصندوق 1101)
                </p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = recordSupplierPaymentVoucher({
                  supplierId: spvSupplierId,
                  amount: spvAmount,
                  paymentMethod: spvMethod,
                  referenceNumber: spvRef,
                });
                if (res.success) {
                  setPurchasingBanner(
                    `تم إصدار سند الصرف (${spvRef}) وترحيل القيد المحاسبي (${res.entryNumber}) — الرصيد المستحق المتبقي للمورد: ${res.newBalance?.toLocaleString()} ${currency}`
                  );
                  setSpvRef(`SPV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
                }
              }}
              className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">المورد المستفيد</label>
                <select
                  value={spvSupplierId}
                  onChange={(e) => setSpvSupplierId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr} (المستحق: {s.balance.toLocaleString()} {currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">المبلغ المدفوع ({currency})</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={spvAmount}
                  onChange={(e) => setSpvAmount(Number(e.target.value))}
                  className="w-full p-2 rounded-md border border-slate-300 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">طريقة الصرف</label>
                <select
                  value={spvMethod}
                  onChange={(e) => setSpvMethod(e.target.value as any)}
                  className="w-full p-2 rounded-md border border-slate-300 bg-white"
                >
                  <option value="BANK_TRANSFER">حوالة بنكية (حـ/ البنك 1102)</option>
                  <option value="CASH">نقداً (حـ/ الصندوق 1101)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">رقم السند / الحوالة</label>
                <input
                  type="text"
                  value={spvRef}
                  onChange={(e) => setSpvRef(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 font-mono"
                />
              </div>
              <button
                type="submit"
                data-testid="btn-submit-supplier-payment"
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition cursor-pointer"
              >
                اعتماد سند الصرف والترحيل
              </button>
            </form>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'ar'
                  ? `سجل الموردين المعتمدين (${suppliers.length})`
                  : `Approved Suppliers Directory (${suppliers.length})`}
              </h3>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const nameInput = (form.elements.namedItem('supName') as HTMLInputElement)?.value;
                const taxInput = (form.elements.namedItem('supTax') as HTMLInputElement)?.value;
                const phoneInput = (form.elements.namedItem('supPhone') as HTMLInputElement)?.value;
                if (!nameInput?.trim()) return;
                addSupplier({
                  name: nameInput.trim(),
                  nameAr: nameInput.trim(),
                  taxNumber: taxInput?.trim() || '300099112200003',
                  phone: phoneInput?.trim() || '+966 11 400 9000',
                  email: 'procurement@vendor.sa',
                  paymentTermsDays: 30,
                  balance: 0,
                  creditLimit: 100000,
                });
                form.reset();
              }}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <input
                name="supName"
                type="text"
                required
                placeholder="اسم المورد الجديد..."
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
              />
              <input
                name="supTax"
                type="text"
                placeholder="الرقم الضريبي (15 رقم)..."
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono w-40"
              />
              <input
                name="supPhone"
                type="text"
                placeholder="الهاتف..."
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono w-32"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مورد</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <div key={sup.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {language === 'ar' ? sup.nameAr : sup.name}
                  </span>
                  <span className="text-[10px] bg-slate-100 font-mono px-2 py-0.5 rounded text-slate-600">
                    {sup.paymentTermsDays} {language === 'ar' ? 'يوم سداد' : 'Days Term'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div>الرقم الضريبي: <span className="font-mono text-slate-700 font-bold">{sup.taxNumber}</span></div>
                  <div>الهاتف: {sup.phone}</div>
                  <div>البريد: {sup.email}</div>
                </div>
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{language === 'ar' ? 'المستحق الحالي له:' : 'Current Payable:'}</span>
                  <span className="font-black text-rose-700 text-sm">
                    {sup.balance.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Landed Cost Calculator */}
      {activeTab === 'landedCost' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-teal-600" />
              <span>{language === 'ar' ? 'مدخلات التكاليف الإضافية (Landed Cost)' : 'Landed Cost Parameters'}</span>
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'تكاليف الشحن الدولي والنقل' : 'Freight & Shipping Cost'}
              </label>
              <input
                type="number"
                value={freightAmount}
                onChange={(e) => setFreightAmount(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الرسوم الجمركية والتخليص' : 'Customs & Clearance Duty'}
              </label>
              <input
                type="number"
                value={customsAmount}
                onChange={(e) => setCustomsAmount(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'التأمين والمناولة' : 'Insurance & Handling'}
              </label>
              <input
                type="number"
                value={insuranceAmount}
                onChange={(e) => setInsuranceAmount(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'طريقة التوزيع' : 'Allocation Method'}
              </label>
              <select
                value={allocationMethod}
                onChange={(e) => setAllocationMethod(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold outline-hidden"
              >
                <option value="BY_VALUE">{language === 'ar' ? 'نسبة وتناسب مع قيمة البضاعة (By Value)' : 'Proportional to Value'}</option>
                <option value="BY_QUANTITY">{language === 'ar' ? 'نسبة وتناسب مع عدد القطع (By Quantity)' : 'Proportional to Quantity'}</option>
              </select>
            </div>
            <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 text-xs text-teal-900 font-bold flex justify-between">
              <span>{language === 'ar' ? 'إجمالي التكاليف الموزعة:' : 'Total Extra Allocated:'}</span>
              <span>{totalExtraCosts.toLocaleString()} {currency}</span>
            </div>
            <button
              type="button"
              data-testid="btn-apply-landed-cost"
              onClick={() => {
                const res = applyLandedCostToProducts(landedResults);
                if (res?.success) {
                  setPurchasingBanner(
                    `تم اعتماد وتوزيع التكاليف الإضافية (${totalExtraCosts.toLocaleString()} ${currency}) وتحديث المتوسط المرجح للتكلفة (WAC)${res.entryNumber ? ` وترحيل قيد رسملة المخزون (${res.entryNumber})` : ''} بنجاح.`
                  );
                }
              }}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {language === 'ar'
                ? 'اعتماد وتحديث متوسط التكلفة المرجح (WAC) في المخزون'
                : 'Apply Landed Cost to Inventory WAC'}
            </button>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {language === 'ar' ? 'أثر التوزيع على التكلفة الفعلية للوحدة' : 'Effective Unit Cost Impact'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-start">{language === 'ar' ? 'الصنف' : 'Product'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                    <th className="py-2.5 px-3 text-end">{language === 'ar' ? 'التكلفة الأصلية' : 'Base Cost'}</th>
                    <th className="py-2.5 px-3 text-end">{language === 'ar' ? 'المصاريف الموزعة' : 'Allocated Landed'}</th>
                    <th className="py-2.5 px-3 text-end">{language === 'ar' ? 'التكلفة الفعلية الجديدة' : 'New Effective Cost'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleLandedItems.map((item, idx) => {
                    const res = landedResults[idx];
                    return (
                      <tr key={item.productId} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-end font-semibold text-slate-700">{item.baseCost} {currency}</td>
                        <td className="py-2.5 px-3 text-end font-bold text-teal-700">+{res.allocatedCost} {currency}</td>
                        <td className="py-2.5 px-3 text-end font-black text-slate-900 bg-teal-50/50">
                          {res.newEffectiveUnitCost} {currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                {language === 'ar' ? 'إصدار أمر شراء رسمي جديد (PO)' : 'Issue New Purchase Order'}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPOModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'المورد المعتمد' : 'Supplier'}
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden font-medium"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {language === 'ar' ? s.nameAr : s.name} ({s.taxNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الصنف المطلوب توريده' : 'Product to Procure'}
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const p = products.find((x) => x.id === e.target.value);
                      if (p) setUnitCost(p.costPrice);
                    }}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden font-medium"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {language === 'ar' ? p.nameAr : p.name} (Cost: {p.costPrice} {currency})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    data-testid="po-camera-scan-btn"
                    onClick={() => setIsCameraScannerOpen(true)}
                    title="مسح باركود الصنف بالكاميرا لتحديده في أمر الشراء"
                    className="shrink-0 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>كاميرا</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'الكمية المطلوبة' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'سعر التوريد المتفق عليه' : 'Agreed Unit Cost'}
                  </label>
                  <input
                    type="number"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                  <span className="font-bold">{(orderQty * unitCost).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'ar' ? 'ضريبة القيمة المضافة 15%:' : 'VAT 15%:'}</span>
                  <span className="font-bold">{(orderQty * unitCost * 0.15).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900 text-sm">
                  <span>{language === 'ar' ? 'إجمالي أمر الشراء:' : 'Grand Total:'}</span>
                  <span className="text-teal-700">{(orderQty * unitCost * 1.15).toLocaleString()} {currency}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPOModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {language === 'ar' ? 'اعتماد وإصدار أمر الشراء' : 'Issue & Approve Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Camera Barcode & QR Scanner Modal */}
      {isCameraScannerOpen && (
        <CameraBarcodeScannerModal
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={handleCameraBarcodeScan}
          contextMode="PURCHASING"
          title="مسح الباركود والكود بالكاميرا - المشتريات والتوريد"
        />
      )}
    </div>
  );
};
