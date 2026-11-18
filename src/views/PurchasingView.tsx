import React, { useState, useEffect } from 'react';
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
  Undo2,
  PackageCheck,
} from 'lucide-react';
import { CameraBarcodeScannerModal } from '../components/common/CameraBarcodeScannerModal';
import { allocateLandedCost } from '../core/inventoryEngine';
import {
  getAllProductUnitChoices,
  resolveProductUnitOption,
} from '../core/multiUnitAndProcurementEngine';

export const PurchasingView: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    recordSupplierPaymentVoucher,
    purchaseOrders,
    goodsReceipts,
    purchaseReturns,
    products,
    addPurchaseOrder,
    approvePurchaseOrder,
    receivePurchaseOrderPartial,
    createPurchaseReturn,
    applyLandedCostToProducts,
    currentWarehouse,
    currency,
    language,
    currentTenant,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'orders' | 'grn_returns' | 'suppliers' | 'landedCost'>('orders');

  useEffect(() => {
    const onCmdNavigate = (ev: Event) => {
      const item = (ev as CustomEvent)?.detail;
      if (!item || item.targetModule !== 'purchasing') return;
      if (item.targetSubTab && ['orders', 'grn_returns', 'suppliers', 'landedCost'].includes(item.targetSubTab)) {
        setActiveTab(item.targetSubTab as any);
      }
    };
    window.addEventListener('haseb-command-navigate', onCmdNavigate);
    return () => window.removeEventListener('haseb-command-navigate', onCmdNavigate);
  }, []);
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [purchasingBanner, setPurchasingBanner] = useState<string | null>(null);

  // Partial GRN Modal State
  const [grnModalPoId, setGrnModalPoId] = useState<string | null>(null);
  const [grnQuantities, setGrnQuantities] = useState<Record<string, number>>({});
  const [grnNotes, setGrnNotes] = useState('');

  // Purchase Return Form State
  const [prSupplierId, setPrSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [prPoId, setPrPoId] = useState<string>('');
  const [prProductId, setPrProductId] = useState<string>(products[0]?.id || '');
  const [prUnitName, setPrUnitName] = useState<string>('');
  const [prQty, setPrQty] = useState<number>(1);
  const [prUnitCost, setPrUnitCost] = useState<number>(products[0]?.costPrice || 100);
  const [prReason, setPrReason] = useState<string>('تلف أو عدم مطابقة مواصفات التوريد');

  // Supplier Payment Voucher State
  const [spvSupplierId, setSpvSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [spvAmount, setSpvAmount] = useState<number>(10000);
  const [spvMethod, setSpvMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [spvRef, setSpvRef] = useState<string>('SPV-2026-8801');

  // New PO State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedPoUnitName, setSelectedPoUnitName] = useState<string>('');
  const [orderQty, setOrderQty] = useState(50);
  const [unitCost, setUnitCost] = useState(products[0]?.costPrice || 100);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const handleCameraBarcodeScan = (scannedCode: string, matchedProduct?: any, qty = 1) => {
    if (matchedProduct) {
      setSelectedProductId(matchedProduct.id);
      setSelectedPoUnitName('');
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
  const activeGrnPO = purchaseOrders.find((p) => p.id === grnModalPoId) || null;
  const targetPrProduct = products.find((p) => p.id === prProductId) || products[0];

  const openPartialGrnModal = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;
    const initialMap: Record<string, number> = {};
    po.items.forEach((it) => {
      const rem = Math.max(0, Math.round((it.quantity - (it.receivedQty || 0)) * 1000) / 1000);
      initialMap[it.productId] = rem;
    });
    setGrnQuantities(initialMap);
    setGrnNotes('');
    setGrnModalPoId(po.id);
  };

  const handleSubmitPartialGrn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGrnPO) return;
    const lines = activeGrnPO.items.map((it) => ({
      productId: it.productId,
      receiveQty: Number(grnQuantities[it.productId] || 0),
    }));
    const res = receivePurchaseOrderPartial(activeGrnPO.id, lines, grnNotes);
    if (res.success) {
      setPurchasingBanner(res.messageAr || 'تم استلام الدفعة المخزنية بنجاح.');
      setGrnModalPoId(null);
    } else {
      setPurchasingBanner(res.messageAr || 'تعذر تنفيذ الاستلام الجزئي.');
    }
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !targetProduct) return;
    const resolvedUnit = resolveProductUnitOption(targetProduct, selectedPoUnitName);
    const subtotal = orderQty * unitCost;
    const taxAmount = subtotal * 0.15;
    const total = subtotal + taxAmount;

    addPurchaseOrder({
      tenantId: currentTenant.id,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.nameAr || selectedSupplier.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items: [
        {
          productId: targetProduct.id,
          productName: targetProduct.nameAr || targetProduct.name,
          sku: targetProduct.sku,
          quantity: orderQty,
          receivedQty: 0,
          unitName: resolvedUnit.unitNameAr,
          conversionFactor: resolvedUnit.conversionFactor,
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
    <div className="space-y-4">
      {/* Header (Unified Lumina POS Theme) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl haseb-btn-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'المشتريات وسلسلة التوريد' : 'Purchasing & Procurement'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'أوامر الشراء، اعتمادات التوريد، فواتير الموردين، وتوزيع تكاليف الشحن والجمارك (Landed Cost)'
                : 'Purchase orders, vendor bills, receiving workflows, and landed cost distribution'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub tabs (POS Rounded-Full Pills) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-1.5 rounded-full border transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 font-medium'
              }`}
            >
              {language === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}
            </button>
            <button
              type="button"
              data-testid="tab-grn-returns"
              onClick={() => setActiveTab('grn_returns')}
              className={`px-3.5 py-1.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'grn_returns'
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 font-medium'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الاستلام الجزئي والمرتجعات' : 'GRN & Returns'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`px-3.5 py-1.5 rounded-full border transition cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 font-medium'
              }`}
            >
              {language === 'ar' ? 'سجل الموردين' : 'Suppliers'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('landedCost')}
              className={`px-3.5 py-1.5 rounded-full border transition cursor-pointer ${
                activeTab === 'landedCost'
                  ? 'haseb-nav-active text-white font-semibold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 font-medium'
              }`}
            >
              {language === 'ar' ? 'حاسبة التكاليف الإضافية' : 'Landed Costs'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsNewPOModalOpen(true)}
            className="haseb-btn-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
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
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center">
                      <div className="max-w-sm mx-auto space-y-2.5">
                        <ShoppingCart className="w-9 h-9 text-slate-300 mx-auto" />
                        <div className="text-sm font-bold text-slate-800">
                          {language === 'ar'
                            ? 'لا توجد أوامر شراء مسجلة بعد'
                            : 'No purchase orders recorded yet'}
                        </div>
                        <p className="text-xs text-slate-500">
                          {language === 'ar'
                            ? 'أنشئ أول أمر شراء لتوريد البضائع وتحديث المستودع والذمم الدائنة تلقائياً.'
                            : 'Create your first purchase order to receive stock into warehouses.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsNewPOModalOpen(true)}
                          className="px-4 py-2 haseb-btn-primary text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'إنشاء أول أمر شراء' : 'Create Purchase Order'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const isReceived = po.status === 'RECEIVED';
                    const isPartial = po.status === 'PARTIALLY_RECEIVED';
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
                              {item.quantity} {item.unitName || ''} × {item.productName} ({item.unitCost} {currency})
                              {(item.receivedQty || 0) > 0 && (
                                <span className="ms-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  مستلم: {item.receivedQty}/{item.quantity}
                                </span>
                              )}
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
                                : isPartial
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {isReceived
                              ? (language === 'ar' ? 'تم الاستلام والترحيل' : 'Received')
                              : isPartial
                              ? (language === 'ar' ? 'مستلم جزئياً (GRN)' : 'Partially Received')
                              : (language === 'ar' ? 'معتمد وقيد الشحن' : 'Approved')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!isReceived && (
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              <button
                                type="button"
                                data-testid={`btn-partial-grn-${po.id}`}
                                onClick={() => openPartialGrnModal(po.id)}
                                className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-[11px] transition cursor-pointer"
                              >
                                {language === 'ar' ? 'استلام جزئي (GRN)' : 'Partial GRN'}
                              </button>
                              {!isPartial && (
                                <button
                                  type="button"
                                  data-testid={`btn-receive-po-${po.id}`}
                                  onClick={() => {
                                    const res = approvePurchaseOrder(po.id);
                                    if (res?.success) {
                                      setPurchasingBanner(
                                        `تم استلام بضاعة أمر الشراء (${po.poNumber}) بالكامل في المستودع وتحديث ذمة المورد وترحيل القيد المحاسبي (${res.entryNumber}) بنجاح.`
                                      );
                                    }
                                  }}
                                  className="haseb-btn-primary text-white font-semibold text-[11px] px-2.5 py-1 rounded transition cursor-pointer"
                                >
                                  {language === 'ar' ? 'استلام كلي' : 'Receive All'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partial GRN & Purchase Returns Tab */}
      {activeTab === 'grn_returns' && (
        <div className="space-y-4">
          {/* Purchase Return Form (مرتجع مشتريات / إشعار مدين للمورد) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Undo2 className="w-4 h-4 text-rose-600" />
                إصدار مرتجع مشتريات / إشعار مدين للمورد (Purchase Return & Debit Note)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                يتم خصم الكمية من رصيد المستودع وتخفيض ذمة المورد الدائنة وترحيل قيد يومية عكسي متوازن تلقائياً
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const effectiveSupplierId = prSupplierId || suppliers[0]?.id || '';
                const effectiveProductId = prProductId || products[0]?.id || '';
                const linkedPo = purchaseOrders.find((p) => p.id === prPoId);
                const res = createPurchaseReturn({
                  supplierId: effectiveSupplierId,
                  purchaseOrderId: linkedPo?.id,
                  poNumber: linkedPo?.poNumber,
                  reason: prReason,
                  returnLines: [
                    {
                      productId: effectiveProductId,
                      quantity: Number(prQty) || 0,
                      unitName: prUnitName || undefined,
                      unitCost: Number(prUnitCost) || 0,
                      taxRate: 0.15,
                    },
                  ],
                });
                setPurchasingBanner(res.messageAr || null);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">المورد</label>
                <select
                  data-testid="pr-supplier-select"
                  value={prSupplierId || suppliers[0]?.id || ''}
                  onChange={(e) => setPrSupplierId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr || s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الصنف المرتجع</label>
                <select
                  data-testid="pr-product-select"
                  value={prProductId || products[0]?.id || ''}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setPrProductId(e.target.value);
                    setPrUnitName('');
                    if (p) setPrUnitCost(p.costPrice);
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr || p.name} (متاح: {p.stockQty})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الوحدة</label>
                <select
                  value={prUnitName}
                  onChange={(e) => {
                    setPrUnitName(e.target.value);
                    if (targetPrProduct) {
                      const resolved = resolveProductUnitOption(targetPrProduct, e.target.value);
                      setPrUnitCost(resolved.costPrice);
                    }
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {targetPrProduct ? (
                    getAllProductUnitChoices(targetPrProduct).map((u) => (
                      <option key={u.unitId} value={u.unitNameAr}>
                        {u.unitNameAr} (×{u.conversionFactor})
                      </option>
                    ))
                  ) : (
                    <option value="">حبة (×1)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">كمية المرتجع</label>
                <input
                  data-testid="pr-qty-input"
                  type="number"
                  min={0.01}
                  step="any"
                  required
                  value={prQty}
                  onChange={(e) => setPrQty(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">سبب الإرجاع</label>
                <input
                  type="text"
                  value={prReason}
                  onChange={(e) => setPrReason(e.target.value)}
                  placeholder="سبب المرتجع..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="submit"
                data-testid="btn-submit-purchase-return"
                disabled={suppliers.length === 0 || products.length === 0}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-lg transition cursor-pointer"
              >
                ترحيل مرتجع مشتريات
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* GRN History */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">
                  سجل سندات الاستلام المخزني الجزئي (GRN)
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {goodsReceipts.length} سند
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-start">رقم GRN</th>
                      <th className="py-2 px-3 text-start">أمر الشراء / المورد</th>
                      <th className="py-2 px-3 text-end">الإجمالي</th>
                      <th className="py-2 px-3 text-center">القيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {goodsReceipts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          لا توجد سندات استلام جزئي مسجلة بعد
                        </td>
                      </tr>
                    ) : (
                      goodsReceipts.map((grn) => (
                        <tr key={grn.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {grn.grnNumber}
                            <div className="text-[10px] text-slate-400">{grn.receiptDate}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{grn.poNumber}</div>
                            <div className="text-[10px] text-slate-500">{grn.supplierName}</div>
                          </td>
                          <td className="py-2 px-3 text-end font-mono font-bold text-emerald-700">
                            {grn.total.toLocaleString()} {currency}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-600">
                            {grn.journalEntryNumber || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Returns History */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">
                  سجل مرتجعات المشتريات والإشعارات المدينة
                </span>
                <span className="text-[11px] font-mono font-bold text-rose-700">
                  {purchaseReturns.length} مرتجع
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-start">رقم المرتجع</th>
                      <th className="py-2 px-3 text-start">المورد / الصنف</th>
                      <th className="py-2 px-3 text-end">قيمة الخصم</th>
                      <th className="py-2 px-3 text-center">القيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseReturns.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          لا توجد مرتجعات مشتريات مسجلة بعد
                        </td>
                      </tr>
                    ) : (
                      purchaseReturns.map((prn) => (
                        <tr key={prn.id}>
                          <td className="py-2 px-3 font-mono font-bold text-rose-800">
                            {prn.returnNumber}
                            <div className="text-[10px] text-slate-400">{prn.returnDate}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{prn.supplierName}</div>
                            <div className="text-[10px] text-slate-500">
                              {prn.lines.map((l) => `${l.quantity} ${l.unitName || ''} × ${l.productName}`).join('، ')}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-end font-mono font-bold text-rose-700">
                            -{prn.total.toLocaleString()} {currency}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-600">
                            {prn.journalEntryNumber || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
                className="py-2 px-4 haseb-btn-primary text-white font-semibold rounded-md transition cursor-pointer"
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
                  taxNumber: taxInput?.trim() || '',
                  phone: phoneInput?.trim() || '',
                  email: '',
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
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewPOModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                {language === 'ar' ? 'إصدار أمر شراء رسمي جديد (PO)' : 'Issue New Purchase Order'}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPOModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition"
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
                      setSelectedPoUnitName('');
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

              {targetProduct && targetProduct.units && targetProduct.units.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    وحدة التوريد (معامل التحويل للمستودع)
                  </label>
                  <select
                    value={selectedPoUnitName}
                    onChange={(e) => {
                      setSelectedPoUnitName(e.target.value);
                      const resolved = resolveProductUnitOption(targetProduct, e.target.value);
                      setUnitCost(resolved.costPrice);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden font-bold"
                  >
                    {getAllProductUnitChoices(targetProduct).map((u) => (
                      <option key={u.unitId} value={u.unitNameAr}>
                        {u.unitNameAr} (يعادل {u.conversionFactor} وحدة أساسية)
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

      {/* Partial Goods Receipt Note (GRN) Modal */}
      {activeGrnPO && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setGrnModalPoId(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  سند استلام مخزني جزئي (GRN) — {activeGrnPO.poNumber}
                </h3>
                <p className="text-[11px] text-slate-500">المورد: {activeGrnPO.supplierName}</p>
              </div>
              <button
                type="button"
                onClick={() => setGrnModalPoId(null)}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitPartialGrn} className="p-5 space-y-3 text-xs">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeGrnPO.items.map((item) => {
                  const already = item.receivedQty || 0;
                  const remaining = Math.max(0, Math.round((item.quantity - already) * 1000) / 1000);
                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                        <div className="text-[10.5px] text-slate-500 font-mono">
                          المطلوب: {item.quantity} {item.unitName || ''} • مستلم سابقاً: {already} • المتبقي: {remaining}
                        </div>
                      </div>
                      <input
                        data-testid={`grn-qty-input-${item.productId}`}
                        type="number"
                        min={0}
                        max={remaining}
                        step="any"
                        value={grnQuantities[item.productId] ?? remaining}
                        onChange={(e) =>
                          setGrnQuantities((prev) => ({
                            ...prev,
                            [item.productId]: Number(e.target.value),
                          }))
                        }
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-center"
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات الدفعة (اختياري)</label>
                <input
                  type="text"
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  placeholder="مثال: استلام الدفعة الأولى بموجب بوليصة شحن #442"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGrnModalPoId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  data-testid="btn-confirm-partial-grn"
                  className="px-4 py-2 rounded-xl haseb-btn-primary text-white font-bold cursor-pointer"
                >
                  اعتماد سند الاستلام (GRN) وترحيل القيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
