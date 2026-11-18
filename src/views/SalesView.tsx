import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Receipt,
  Users,
  Printer,
  Plus,
  FileText,
  CheckCircle2,
  Landmark,
  Wallet,
  ArrowLeft,
  PackageCheck,
  ClipboardList,
  MessageSquare,
  Smartphone,
  Network,
  Percent,
  Search,
  AlertTriangle,
  DollarSign,
  LayoutGrid,
  Sliders,
  Edit3,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  SalesInvoice,
  ThermalTemplateType,
  StandardInvoiceTemplateType,
} from '../types/erp';
import { InvoiceRenderer } from '../components/invoices/InvoiceRenderer';
import { InvoiceTemplateManager } from '../components/invoices/InvoiceTemplateManager';
import { calculateReceivablesPayablesAging } from '../core/accountingEngine';
import { isInvoiceVoidOrReturned } from '../core/salesReturnEngine';
import {
  composeInvoiceMessageText,
  composeDebtReminderMessageText,
  composeWarrantyRMAMessageText,
} from '../core/messagingEngine';
import { WorkspaceTabResizerBar } from '../components/common/WorkspaceTabResizerBar';
import { SplitPaneRatioMode, resolveSplitPaneLayout } from '../core/workspaceLayoutEngine';
import { useModalLayer, renderModalPortal } from '../core/modalLayerEngine';

export const SalesView: React.FC = () => {
  const {
    salesInvoices,
    salesReturns,
    createSalesReturnCreditNote,
    voidAndReturnSalesInvoice,
    warrantyTickets,
    createWarrantyMaintenanceTicket,
    advanceWarrantyTicketStatus,
    salesPipelineDocs,
    createSalesPipelineDoc,
    advancePipelineDoc,
    customers,
    suppliers,
    products,
    addCustomer,
    recordCustomerPaymentReceipt,
    addSalesInvoice,
    currency,
    language,
    currentTenant,
    company,
    currentBranch,
    invoiceTemplateSettings,
    updateInvoiceTemplateSettings,
    activeIndustry,
    masterSystemConfig,
    promoCoupons,
    validateCouponForAmount,
    openQuickSendModal,
    openCrossBranchModal,
    setActiveTab: setMainAppTab,
  } = useERP();

  const [activeTab, setActiveTab] = useState<
    'invoices' | 'pipeline' | 'returns' | 'warranty' | 'customers' | 'aging'
  >('invoices');
  const [salesSplitMode, setSalesSplitMode] = useState<SplitPaneRatioMode>('BALANCED');
  const salesSplitLayout = resolveSplitPaneLayout(salesSplitMode, 'SALES');
  const [pipelineFeedback, setPipelineFeedback] = useState<string | null>(null);
  const [returnFeedback, setReturnFeedback] = useState<string | null>(null);
  const [retInvoiceId, setRetInvoiceId] = useState(salesInvoices[0]?.id || '');
  const [retProductId, setRetProductId] = useState(products[0]?.id || '');
  const [retQty, setRetQty] = useState<number>(1);
  const [retSerial, setRetSerial] = useState<string>('SN-JNK-2026-99104');
  const [retCondition, setRetCondition] = useState<
    'HEALTHY_RESTOCK' | 'DEFECTIVE_QUARANTINE' | 'EXCHANGE_REPLACED'
  >('HEALTHY_RESTOCK');
  const [retRefundMethod, setRetRefundMethod] = useState<'CREDIT_BALANCE' | 'CASH' | 'EXCHANGE_UNIT'>(
    'CREDIT_BALANCE'
  );
  const [retReason, setRetReason] = useState<string>('إرجاع/استبدال صنف ضمن فترة الضمان المعتمدة');

  // Warranty & Maintenance RMA State
  const [rmaFeedback, setRmaFeedback] = useState<string | null>(null);
  const [rmaSerial, setRmaSerial] = useState<string>('SN-DEYE-8K-2026-5501');
  const [rmaProductId, setRmaProductId] = useState<string>(products[1]?.id || products[0]?.id || '');
  const [rmaCustomerName, setRmaCustomerName] = useState<string>(customers[0]?.nameAr || 'عميل ضمان');
  const [rmaCustomerPhone, setRmaCustomerPhone] = useState<string>('+967 770 112 233');
  const [rmaPurchaseDate, setRmaPurchaseDate] = useState<string>('2026-04-10');
  const [rmaFaultDesc, setRmaFaultDesc] = useState<string>(
    'فحص كفاءة MPPT ومعايرة دائرة شحن البطاريات الليثيوم 48V'
  );
  const [rmaPartsCost, setRmaPartsCost] = useState<number>(0);
  const [rmaLaborFee, setRmaLaborFee] = useState<number>(0);
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [quoteCustomerId, setQuoteCustomerId] = useState(customers[0]?.id || '');
  const [quoteProductId, setQuoteProductId] = useState(products[0]?.id || '');
  const [quoteQty, setQuoteQty] = useState<number>(3);
  const [quotePaymentMethod, setQuotePaymentMethod] = useState<'CASH' | 'CARD' | 'CREDIT'>('CREDIT');
  const [quoteNotes, setQuoteNotes] = useState<string>('عرض سعر توريد بضاعة شامل الضمان والصيانة الدورية');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice>(
    salesInvoices[0] || ({} as SalesInvoice)
  );
  const [previewMode, setPreviewMode] = useState<'a4' | 'thermal'>('a4');
  const [templateOverrideA4, setTemplateOverrideA4] = useState<
    StandardInvoiceTemplateType | undefined
  >(undefined);
  const [templateOverrideThermal, setTemplateOverrideThermal] = useState<
    ThermalTemplateType | undefined
  >(undefined);

  // Modals for adding New Invoice, New Customer, or Settling Invoice Debt
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [settlingInvoice, setSettlingInvoice] = useState<SalesInvoice | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'POS_CARD'>('CASH');
  const [settleRef, setSettleRef] = useState<string>('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');
  const deferredInvoiceSearch = useDeferredValue(invoiceSearchQuery);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'PAID' | 'DEBT' | 'CREDIT' | 'VOID'>('ALL');
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isInlineTemplateEditOpen, setIsInlineTemplateEditOpen] = useState(false);

  // Full Invoice Void & Return Modal State
  const [voidTargetInvoice, setVoidTargetInvoice] = useState<SalesInvoice | null>(null);
  const [voidCondition, setVoidCondition] = useState<'HEALTHY_RESTOCK' | 'DEFECTIVE_QUARANTINE'>('HEALTHY_RESTOCK');
  const [voidRefundMethod, setVoidRefundMethod] = useState<'CASH' | 'CREDIT_BALANCE'>('CASH');
  const [voidReason, setVoidReason] = useState<string>('إلغاء فاتورة واسترجاع الأصناف بالكامل للعميل');

  const templateManagerLayer = useModalLayer(isTemplateManagerOpen, 60);
  const settleInvoiceLayer = useModalLayer(Boolean(settlingInvoice), 60);
  const newInvoiceLayer = useModalLayer(isNewInvoiceOpen, 60);
  const newCustomerLayer = useModalLayer(isNewCustomerOpen, 60);
  const newQuoteLayer = useModalLayer(isNewQuoteOpen, 60);
  const voidReturnLayer = useModalLayer(Boolean(voidTargetInvoice), 65);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (voidReturnLayer.isTopLayer) {
        setVoidTargetInvoice(null);
      } else if (templateManagerLayer.isTopLayer) {
        setIsTemplateManagerOpen(false);
      } else if (settleInvoiceLayer.isTopLayer) {
        setSettlingInvoice(null);
      } else if (newInvoiceLayer.isTopLayer) {
        setIsNewInvoiceOpen(false);
      } else if (newCustomerLayer.isTopLayer) {
        setIsNewCustomerOpen(false);
      } else if (newQuoteLayer.isTopLayer) {
        setIsNewQuoteOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    voidReturnLayer.isTopLayer,
    templateManagerLayer.isTopLayer,
    settleInvoiceLayer.isTopLayer,
    newInvoiceLayer.isTopLayer,
    newCustomerLayer.isTopLayer,
    newQuoteLayer.isTopLayer,
  ]);

  // Keep selectedInvoice synced with latest salesInvoices state (e.g. after partial payment settlement)
  useEffect(() => {
    if (!salesInvoices.length) return;
    if (!selectedInvoice?.id) {
      setSelectedInvoice(salesInvoices[0]);
      return;
    }
    const latest = salesInvoices.find((inv) => inv.id === selectedInvoice.id);
    if (latest && latest !== selectedInvoice) {
      setSelectedInvoice(latest);
    }
  }, [salesInvoices, selectedInvoice]);

  useEffect(() => {
    const onCmdNavigate = (ev: Event) => {
      const item = (ev as CustomEvent)?.detail;
      if (!item || item.targetModule !== 'sales') return;
      if (item.targetSubTab && ['invoices', 'pipeline', 'returns', 'warranty', 'customers', 'aging'].includes(item.targetSubTab)) {
        setActiveTab(item.targetSubTab as any);
      }
      if (item.subType === 'INVOICE' && item.focusId) {
        const matchInv = salesInvoices.find((i) => i.id === item.focusId);
        if (matchInv) setSelectedInvoice(matchInv);
        if (item.searchToken) setInvoiceSearchQuery(item.searchToken);
      } else if (item.entityType === 'CUSTOMER' && item.focusId) {
        setStatementCustomerId(item.focusId);
      }
    };
    window.addEventListener('haseb-command-navigate', onCmdNavigate);
    return () => window.removeEventListener('haseb-command-navigate', onCmdNavigate);
  }, [salesInvoices]);

  const openSettleInvoiceModal = (inv: SalesInvoice) => {
    const paid = Math.min(inv.grandTotal, Math.max(0, Number(inv.paidAmount) || 0));
    const rem = Math.max(0, Math.round((inv.grandTotal - paid) * 100) / 100);
    setSettlingInvoice(inv);
    setSettleAmount(rem);
    setSettleMethod('CASH');
    setSettleRef(`RV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleConfirmSettleInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingInvoice || settleAmount <= 0) return;
    const res = recordCustomerPaymentReceipt({
      customerId: settlingInvoice.customerId || 'cust-pos-walkin',
      amount: settleAmount,
      paymentMethod: settleMethod,
      referenceNumber: settleRef,
      invoiceId: settlingInvoice.id,
    });
    if (res.success) {
      setReceiptFeedback(
        `تم تحصيل ${settleAmount.toLocaleString()} ${currency} للفاتورة (${settlingInvoice.invoiceNumber}) وترحيل القيد (${res.entryNumber})`
      );
      setTimeout(() => setReceiptFeedback(null), 6000);
      setSettlingInvoice(null);
    }
  };

  const openVoidReturnModal = (inv: SalesInvoice) => {
    const paid = Math.min(inv.grandTotal, Math.max(0, Number(inv.paidAmount ?? inv.grandTotal) || 0));
    setVoidTargetInvoice(inv);
    setVoidCondition('HEALTHY_RESTOCK');
    setVoidRefundMethod(paid > 0.01 ? 'CASH' : 'CREDIT_BALANCE');
    setVoidReason('إلغاء فاتورة واسترجاع الأصناف بالكامل للعميل');
  };

  const handleConfirmVoidAndReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTargetInvoice) return;
    const res = voidAndReturnSalesInvoice({
      invoiceId: voidTargetInvoice.id,
      reason: voidReason,
      condition: voidCondition,
      refundMethod: voidRefundMethod,
    });
    if (res.success && res.updatedInvoice) {
      setSelectedInvoice(res.updatedInvoice);
      setReceiptFeedback(res.messageAr ?? null);
      setTimeout(() => setReceiptFeedback(null), 7000);
      setVoidTargetInvoice(null);
    } else if (res.messageAr) {
      setReceiptFeedback(res.messageAr);
      setTimeout(() => setReceiptFeedback(null), 6000);
      setVoidTargetInvoice(null);
    }
  };

  // New Invoice State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [invoiceQty, setInvoiceQty] = useState(1);
  const [serialNumberInput, setSerialNumberInput] = useState('IMEI-3599102948110');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'CREDIT'>('CARD');
  const [newInvoicePaidOverride, setNewInvoicePaidOverride] = useState<string>('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number | ''>('');

  // Invoices Tab Summary KPIs & Filtered List (Strictly excludes voided/returned invoices from active totals)
  const invoicesSummary = useMemo(() => {
    let totalSold = 0;
    let totalCollected = 0;
    let totalRemainingDebt = 0;
    let totalQtySold = 0;
    let indebtedInvoicesCount = 0;
    let activeCount = 0;
    let voidedCount = 0;
    let refundedTotal = 0;

    for (const inv of salesInvoices) {
      if (isInvoiceVoidOrReturned(inv)) {
        voidedCount += 1;
        refundedTotal += Number(inv.refundedAmount ?? inv.paidAmount ?? 0) || 0;
        continue;
      }
      activeCount += 1;
      const paid = Math.min(inv.grandTotal, Math.max(0, Number(inv.paidAmount ?? inv.grandTotal) || 0));
      const rem = Math.max(0, Math.round((inv.grandTotal - paid) * 100) / 100);
      totalSold += inv.grandTotal || 0;
      totalCollected += paid;
      totalRemainingDebt += rem;
      if (rem > 0.01) indebtedInvoicesCount += 1;
      for (const it of inv.items || []) {
        totalQtySold += Number(it.quantity) || 0;
      }
    }

    return {
      totalSold: Math.round(totalSold * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalRemainingDebt: Math.round(totalRemainingDebt * 100) / 100,
      totalQtySold: Math.round(totalQtySold * 100) / 100,
      indebtedInvoicesCount,
      activeCount,
      voidedCount,
      refundedTotal: Math.round(refundedTotal * 100) / 100,
    };
  }, [salesInvoices]);

  const filteredSalesInvoices = useMemo(() => {
    const q = deferredInvoiceSearch.trim().toLowerCase();
    return salesInvoices.filter((inv) => {
      const isVoided = isInvoiceVoidOrReturned(inv);
      const paid = Math.min(inv.grandTotal, Math.max(0, Number(inv.paidAmount ?? inv.grandTotal) || 0));
      const rem = Math.max(0, Math.round((inv.grandTotal - paid) * 100) / 100);

      if (invoiceStatusFilter === 'VOID' && !isVoided) return false;
      if (invoiceStatusFilter === 'PAID' && (isVoided || rem > 0.01)) return false;
      if (invoiceStatusFilter === 'DEBT' && (isVoided || rem <= 0.01)) return false;
      if (invoiceStatusFilter === 'CREDIT' && (isVoided || inv.paymentMethod !== 'CREDIT')) return false;

      if (!q) return true;
      const itemsText = (inv.items || []).map((it) => `${it.productName} ${it.sku}`).join(' ').toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.customerName || '').toLowerCase().includes(q) ||
        (inv.customerPhone || '').toLowerCase().includes(q) ||
        itemsText.includes(q)
      );
    });
  }, [salesInvoices, deferredInvoiceSearch, invoiceStatusFilter]);

  // New Customer State
  const [custNameAr, setCustNameAr] = useState('');
  const [custPhone, setCustPhone] = useState('+967 77 ');
  const [custTaxNumber, setCustTaxNumber] = useState('310000000000003');
  const [custCreditLimit, setCustCreditLimit] = useState(25000);

  // Customer Statement & Receipt Voucher State
  const [statementCustomerId, setStatementCustomerId] = useState(customers[0]?.id || '');
  const [receiptAmount, setReceiptAmount] = useState<number>(5000);
  const [receiptMethod, setReceiptMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'POS_CARD'>('BANK_TRANSFER');
  const [receiptRef, setReceiptRef] = useState<string>('RV-2026-0105');
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);

  const agingData = calculateReceivablesPayablesAging(customers, suppliers);
  const selectedStatementCustomer =
    agingData.customerAging.find((c) => c.partyId === statementCustomerId) ||
    agingData.customerAging[0];

  const handlePostCustomerReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatementCustomer || receiptAmount <= 0) return;
    const res = recordCustomerPaymentReceipt({
      customerId: selectedStatementCustomer.partyId,
      amount: receiptAmount,
      paymentMethod: receiptMethod,
      referenceNumber: receiptRef,
    });
    if (res.success) {
      setReceiptFeedback(
        `تم إصدار سند القبض وترحيل القيد المحاسبي رقم (${res.entryNumber}) بنجاح — الرصيد المتبقي للعميل: ${res.newBalance?.toLocaleString()} ${currency}`
      );
      setReceiptRef(`RV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setTimeout(() => setReceiptFeedback(null), 6000);
    }
  };

  const [stockCapNotice, setStockCapNotice] = useState<string | null>(null);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    const product = products.find((p) => p.id === selectedProductId) || products[0];
    if (!customer || !product) return;

    if (product.stockQty <= 0) {
      setStockCapNotice(
        `لا يمكن إصدار الفاتورة — الرصيد المتوفر في المخزون للصنف (${product.nameAr}) هو (0).`
      );
      return;
    }

    const effectiveQty = Math.min(Math.max(1, invoiceQty), product.stockQty);
    const sub = product.salePrice * effectiveQty;
    let discountAmount = 0;
    let appliedDiscountLabel: string | undefined;

    if (typeof discountValue === 'number' && discountValue > 0) {
      if (discountType === 'PERCENT') {
        const pct = Math.min(100, Math.max(0, discountValue));
        discountAmount = Math.round(((sub * pct) / 100) * 100) / 100;
        appliedDiscountLabel = `خصم ${discountValue}%`;
      } else {
        discountAmount = Math.min(sub, discountValue);
        appliedDiscountLabel = `خصم نقدي (${(Math.round(discountAmount * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency})`;
      }
    }

    const netTaxable = Math.max(0, sub - discountAmount);
    const configuredTaxPct = 0;
    const tax = 0;
    const total = Math.round(netTaxable * 100) / 100;
    const rawPaid =
      newInvoicePaidOverride.trim() !== ''
        ? Number(newInvoicePaidOverride)
        : paymentMethod === 'CREDIT'
        ? 0
        : total;
    const cleanPaid = Math.min(total, Math.max(0, Math.round((Number(rawPaid) || 0) * 100) / 100));
    const remDebt = Math.max(0, Math.round((total - cleanPaid) * 100) / 100);

    const created = addSalesInvoice({
      customerId: customer.id,
      customerName: customer.nameAr,
      customerPhone: customer.phone,
      branchId: currentBranch.id,
      date: new Date().toISOString().slice(0, 10),
      subtotal: sub,
      discountAmount,
      couponCode: appliedDiscountLabel,
      discountType: discountAmount > 0 ? discountType : undefined,
      discountValue: discountAmount > 0 && typeof discountValue === 'number' ? discountValue : undefined,
      taxAmount: tax,
      grandTotal: total,
      paidAmount: cleanPaid,
      remainingAmount: remDebt,
      paymentMethod,
      status: remDebt <= 0.01 ? 'PAID' : 'PARTIAL',
      industryMode: activeIndustry,
      items: [
        {
          productId: product.id,
          productName: product.nameAr,
          sku: product.sku,
          quantity: effectiveQty,
          unitPrice: product.salePrice,
          discount: discountAmount,
          taxRate: configuredTaxPct,
          taxAmount: tax,
          total,
          serialNumber: serialNumberInput || undefined,
          warrantyEnabled: (product.warrantyMonths || 0) > 0,
          warrantyMonths: product.warrantyMonths || 0,
          batchNumber: product.batchNumber,
          expiryDate: product.expiryDate,
        },
      ],
    });

    setSelectedInvoice(created);
    setDiscountValue('');
    setNewInvoicePaidOverride('');
    setStockCapNotice(null);
    setIsNewInvoiceOpen(false);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custNameAr.trim()) return;
    addCustomer({
      name: custNameAr.trim(),
      nameAr: custNameAr.trim(),
      phone: custPhone.trim(),
      email: 'client@enterprise.sa',
      taxNumber: custTaxNumber.trim(),
      balance: 0,
      creditLimit: Number(custCreditLimit) || 10000,
      loyaltyPoints: 100,
    });
    setCustNameAr('');
    setIsNewCustomerOpen(false);
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createSalesPipelineDoc({
      customerId: quoteCustomerId,
      productId: quoteProductId,
      quantity: quoteQty,
      paymentMethod: quotePaymentMethod,
      notes: quoteNotes,
    });
    setIsNewQuoteOpen(false);
    setPipelineFeedback(
      `تم إصدار عرض السعر رقم (${created.quoteNumber}) للعميل ${created.customerName} بقيمة ${created.grandTotal.toLocaleString()} ${currency}`
    );
  };

  const handleAdvancePipelineStage = (docId: string) => {
    const res = advancePipelineDoc(docId);
    if (res.success && res.messageAr) {
      setPipelineFeedback(res.messageAr);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-4">
      {/* Lumina POS-Style Header Card: Title, Primary Actions & Pill Sub-tabs */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3 min-w-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl haseb-card-gradient text-white flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {language === 'ar'
                  ? 'المبيعات والفواتير المعتمدة وأعمار الديون — نظام حاسب'
                  : 'Sales Invoices, Credit Aging & Customer Ledgers — Haseb ERP'}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                إصدار فواتير المبيعات وشهادات الضمان المعتمدة (معفاة من الضريبة 0%)، كشوف حسابات العملاء، وسندات القبض الفورية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsNewInvoiceOpen(true)}
              className="haseb-btn-primary text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>إصدار فاتورة مبيعات</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewCustomerOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>إضافة عميل</span>
            </button>
          </div>
        </div>

        {/* Row 2: POS-Style Rounded-Full Sub-tabs + Resizable Split-Pane Controls */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap text-xs min-w-0 max-w-full">
            <button
              type="button"
              data-testid="sales-tab-invoices"
              onClick={() => setActiveTab('invoices')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full border transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'invoices'
                  ? 'haseb-nav-active font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              سجل الفواتير ({salesInvoices.length})
            </button>
            <button
              type="button"
              data-testid="sales-tab-pipeline"
              onClick={() => setActiveTab('pipeline')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full border transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'pipeline'
                  ? 'haseb-nav-active font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              عروض الأسعار وأوامر البيع ({salesPipelineDocs.length})
            </button>
            <button
              type="button"
              data-testid="sales-tab-returns"
              onClick={() => setActiveTab('returns')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full border transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'returns'
                  ? 'haseb-nav-active font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              المرتجعات وإشعارات الدائن ({salesReturns.length})
            </button>
            <button
              type="button"
              data-testid="sales-tab-warranty"
              onClick={() => setActiveTab('warranty')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full border transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'warranty'
                  ? 'haseb-nav-active font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              الضمان والصيانة RMA ({warrantyTickets.length})
            </button>
            <button
              type="button"
              data-testid="sales-tab-aging"
              onClick={() => setActiveTab('aging')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full border transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'aging'
                  ? 'haseb-nav-active font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              أعمار الديون وسندات القبض
            </button>
            <button
              type="button"
              data-testid="sales-tab-customers"
              onClick={() => setActiveTab('customers')}
              className={`erp-resizable-tab px-4 py-1.5 rounded-full border transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'customers'
                  ? 'haseb-nav-active font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              دليل العملاء ({customers.length})
            </button>
          </div>

          <WorkspaceTabResizerBar
            testIdPrefix="sales-workspace"
            splitMode={activeTab === 'invoices' ? salesSplitMode : undefined}
            onSplitModeChange={activeTab === 'invoices' ? setSalesSplitMode : undefined}
            primaryPaneLabel="جدول الفواتير"
            secondaryPaneLabel="معاينة الفاتورة"
          />
        </div>
      </div>

      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {receiptFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{receiptFeedback}</span>
            </div>
          )}

          {/* Sales Invoices Financial KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500">إجمالي المبيعات النشطة (بكم باع)</div>
              <div className="text-lg font-black font-mono text-slate-900 mt-1" dir="ltr">
                {invoicesSummary.totalSold.toLocaleString()} <span className="text-xs font-sans text-slate-500">{currency}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {invoicesSummary.activeCount} فاتورة نشطة
                {invoicesSummary.voidedCount > 0 ? ` • ${invoicesSummary.voidedCount} ملغاة ومسترجعة` : ''}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-700">إجمالي المحصل المدفوع</div>
              <div className="text-lg font-black font-mono text-emerald-700 mt-1" dir="ltr">
                {invoicesSummary.totalCollected.toLocaleString()} <span className="text-xs font-sans">{currency}</span>
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">نقداً + شبكة مستلمة</div>
            </div>
            <div
              className={`p-3.5 rounded-2xl border shadow-2xs ${
                invoicesSummary.totalRemainingDebt > 0.01
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-white border-slate-200/70'
              }`}
            >
              <div className="text-[11px] font-bold text-rose-800">المديونية المتبقية على العملاء</div>
              <div className="text-lg font-black font-mono text-rose-700 mt-1" dir="ltr">
                {invoicesSummary.totalRemainingDebt.toLocaleString()} <span className="text-xs font-sans">{currency}</span>
              </div>
              <div className="text-[10px] text-rose-700/80 mt-0.5">
                {invoicesSummary.indebtedInvoicesCount} فواتير غير مسددة بالكامل
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500">إجمالي الكميات المباعة</div>
              <div className="text-lg font-black font-mono text-slate-900 mt-1" dir="ltr">
                {invoicesSummary.totalQtySold.toLocaleString()} <span className="text-xs font-sans text-slate-500">وحدة</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">مجموع بنود كافة الفواتير</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* Invoices List (Resizable Split Pane - Lumina Card) */}
            <div
              data-testid="sales-invoices-list-pane"
              className={`${salesSplitLayout.primaryColClass} bg-white rounded-2xl border border-slate-200/70 shadow-2xs overflow-hidden transition-all duration-200`}
            >
              <div className="px-4 py-3 border-b border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-800">
                    سجل الفواتير الصادرة وتفاصيل السداد والمديونية
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {filteredSalesInvoices.length} / {salesInvoices.length}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2" />
                    <input
                      type="text"
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      placeholder="بحث برقم الفاتورة، العميل، الصنف..."
                      className="w-full ps-8 pe-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] outline-hidden focus:border-slate-800"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
                    {[
                      { id: 'ALL', label: 'الكل' },
                      { id: 'DEBT', label: `مديونية (${invoicesSummary.indebtedInvoicesCount})` },
                      { id: 'PAID', label: 'مسددة' },
                      { id: 'CREDIT', label: 'آجل' },
                      { id: 'VOID', label: `ملغاة ومسترجعة (${invoicesSummary.voidedCount})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        data-testid={`sales-status-filter-${f.id}`}
                        onClick={() => setInvoiceStatusFilter(f.id as any)}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                          invoiceStatusFilter === f.id
                            ? 'haseb-nav-active'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10.5px] text-start">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-1.5 text-start whitespace-nowrap">الفاتورة</th>
                      <th className="py-2 px-1 text-start">العميل والأصناف</th>
                      <th className="py-2 px-1 text-end whitespace-nowrap">الإجمالي</th>
                      <th className="py-2 px-1 text-end whitespace-nowrap">المدفوع</th>
                      <th className="py-2 px-1 text-end whitespace-nowrap">المتبقي</th>
                      <th className="py-2 px-1.5 text-center whitespace-nowrap">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSalesInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-4 text-center">
                          <div className="max-w-xs mx-auto space-y-2.5">
                            <FileText className="w-9 h-9 text-slate-300 mx-auto" />
                            <div className="text-sm font-bold text-slate-800">
                              لا توجد فواتير مطابقة للعرض
                            </div>
                            <p className="text-xs text-slate-500">
                              أصدر أول فاتورة مبيعات أو أجرِ عملية بيع عبر نقطة البيع لتظهر هنا فوراً.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsNewInvoiceOpen(true)}
                              className="px-4 py-2 haseb-btn-primary text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إصدار أول فاتورة مبيعات</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSalesInvoices.map((inv) => {
                        const isSelected = selectedInvoice?.id === inv.id;
                        const isVoided = isInvoiceVoidOrReturned(inv);
                        const paidAmt = isVoided
                          ? 0
                          : Math.min(
                              inv.grandTotal,
                              Math.max(0, Number(inv.paidAmount ?? inv.grandTotal) || 0)
                            );
                        const remDebt = isVoided
                          ? 0
                          : Math.max(
                              0,
                              Math.round((inv.grandTotal - paidAmt) * 100) / 100
                            );
                        const qtyCount = (inv.items || []).reduce(
                          (sum, it) => sum + (Number(it.quantity) || 0),
                          0
                        );
                        const firstItemName = inv.items?.[0]?.productName || 'مبيعات متنوعة';
                        return (
                          <tr
                            key={inv.id}
                            data-testid={`sales-invoice-row-${inv.invoiceNumber}`}
                            onClick={() => setSelectedInvoice(inv)}
                            className={`hover:bg-slate-50/80 cursor-pointer transition ${
                              isVoided ? 'bg-rose-50/40 opacity-85' : isSelected ? 'bg-slate-100/80' : ''
                            }`}
                          >
                            <td className="py-2 px-1.5 align-top whitespace-nowrap">
                              <div className={`font-bold font-mono text-[10px] ${isVoided ? 'line-through text-rose-700' : 'text-slate-900'}`} dir="ltr">
                                {inv.invoiceNumber}
                              </div>
                              <div className="text-[9px] font-mono text-slate-400" dir="ltr">{inv.date}</div>
                              <div className="text-[9px] font-bold text-slate-500 mt-0.5">
                                {inv.paymentMethod === 'CASH'
                                  ? 'نقداً'
                                  : inv.paymentMethod === 'CARD'
                                  ? 'شبكة'
                                  : inv.paymentMethod === 'SPLIT'
                                  ? 'مشترك'
                                  : 'آجل'}
                              </div>
                            </td>
                            <td className="py-2 px-1 align-top">
                              <div className="font-semibold text-slate-900 truncate max-w-[92px]">{inv.customerName}</div>
                              <div className="text-[9.5px] text-slate-500 truncate max-w-[96px]">
                                {inv.items.length} صنف ({qtyCount}): {firstItemName}
                                {inv.items.length > 1 ? ` +${inv.items.length - 1}` : ''}
                              </div>
                            </td>
                            <td className="py-2 px-1 text-end font-mono font-bold tabular-nums align-top whitespace-nowrap" dir="ltr">
                              <span className={isVoided ? 'line-through text-slate-400' : 'text-slate-900'}>
                                {inv.grandTotal.toLocaleString()}{' '}
                                <span className="text-[8.5px] font-normal text-slate-400">{currency}</span>
                              </span>
                            </td>
                            <td className="py-2 px-1 text-end font-mono font-bold tabular-nums align-top whitespace-nowrap" dir="ltr">
                              {isVoided ? (
                                <span className="text-[9.5px] text-rose-700 font-bold">
                                  مرتجع {(inv.refundedAmount || 0).toLocaleString()} {currency}
                                </span>
                              ) : (
                                <span className="text-emerald-700">
                                  {paidAmt.toLocaleString()}{' '}
                                  <span className="text-[8.5px] font-normal opacity-75">{currency}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-1 text-end font-mono font-black tabular-nums align-top whitespace-nowrap" dir="ltr">
                              {!isVoided && remDebt > 0.01 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">
                                  {remDebt.toLocaleString()}{' '}
                                  <span className="text-[8px] font-normal ms-0.5">{currency}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">0</span>
                              )}
                            </td>
                            <td className="py-2 px-1.5 text-center align-top whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                {isVoided ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] font-bold whitespace-nowrap bg-rose-100 text-rose-800 border-rose-300">
                                    ملغاة — مسترجعة
                                  </span>
                                ) : (
                                  <>
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] font-semibold whitespace-nowrap ${
                                        remDebt <= 0.01
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                          : paidAmt > 0
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          remDebt <= 0.01
                                            ? 'bg-emerald-500'
                                            : paidAmt > 0
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                      />
                                      {remDebt <= 0.01
                                        ? 'مسددة'
                                        : paidAmt > 0
                                        ? 'جزئي'
                                        : 'آجل'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {remDebt > 0.01 && (
                                        <button
                                          type="button"
                                          data-testid={`settle-invoice-btn-${inv.invoiceNumber}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openSettleInvoiceModal(inv);
                                          }}
                                          className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9.5px] flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                                        >
                                          <DollarSign className="w-2.5 h-2.5" />
                                          <span>تحصيل</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        data-testid={`void-return-btn-${inv.invoiceNumber}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openVoidReturnModal(inv);
                                        }}
                                        title="إلغاء الفاتورة واسترجاع المبلغ والأصناف"
                                        className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[9px] flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                        <span>إلغاء/استرجاع</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Multi-Template Tax Invoice Preview (Resizable Split Pane) */}
            {selectedInvoice && selectedInvoice.id && (() => {
              const selVoided = isInvoiceVoidOrReturned(selectedInvoice);
              const selPaid = selVoided
                ? 0
                : Math.min(
                    selectedInvoice.grandTotal,
                    Math.max(0, Number(selectedInvoice.paidAmount ?? selectedInvoice.grandTotal) || 0)
                  );
              const selRem = selVoided
                ? 0
                : Math.max(
                    0,
                    Math.round((selectedInvoice.grandTotal - selPaid) * 100) / 100
                  );
              const selQty = (selectedInvoice.items || []).reduce(
                (s, it) => s + (Number(it.quantity) || 0),
                0
              );
              return (
                <div
                  data-testid="sales-invoice-preview-pane"
                  className={`${salesSplitLayout.secondaryColClass} bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs space-y-4 transition-all duration-200`}
                >
                  {selVoided && (
                    <div
                      data-testid="sales-preview-returned-alert"
                      className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 font-bold">
                        <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          فاتورة ملغاة ومسترجعة رسمياً — لا تُحتسب ضمن إيرادات المبيعات
                        </span>
                      </div>
                      <div className="font-mono text-[11px] font-black text-rose-800" dir="ltr">
                        تم إرجاع المبلغ: {(Number(selectedInvoice.refundedAmount) || 0).toLocaleString()} {currency}
                        {selectedInvoice.returnCreditNoteNumber ? ` • ${selectedInvoice.returnCreditNoteNumber}` : ''}
                      </div>
                    </div>
                  )}

                  {/* Selected Invoice Financial Breakdown & Debt Bar */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">الأصناف والكميات</div>
                      <div className="font-mono font-bold text-slate-900">
                        {selectedInvoice.items?.length || 0} صنف ({selQty} وحدة)
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">الإجمالي (بكم باع)</div>
                      <div className={`font-mono font-black ${selVoided ? 'line-through text-slate-400' : 'text-slate-900'}`} dir="ltr">
                        {selectedInvoice.grandTotal.toLocaleString()} {currency}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-700">
                        {selVoided ? 'المبلغ المسترجع للعميل' : 'المدفوع المحصل'}
                      </div>
                      <div className={`font-mono font-black ${selVoided ? 'text-rose-700' : 'text-emerald-700'}`} dir="ltr">
                        {(selVoided ? Number(selectedInvoice.refundedAmount) || 0 : selPaid).toLocaleString()} {currency}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-rose-700">المتبقي (مديونية)</div>
                        <div
                          className={`font-mono font-black ${
                            !selVoided && selRem > 0.01 ? 'text-rose-700' : 'text-slate-500'
                          }`}
                          dir="ltr"
                        >
                          {selRem.toLocaleString()} {currency}
                        </div>
                      </div>
                      {!selVoided && selRem > 0.01 && (
                        <button
                          type="button"
                          onClick={() => openSettleInvoiceModal(selectedInvoice)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer shrink-0"
                        >
                          تحصيل
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Template Selector Bar */}
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-slate-600 me-1" />
                      {[
                        { mode: 'a4', tpl: 'a4_onyx_yemen', label: 'A4 القالب التنفيذي المعتمد' },
                        { mode: 'a4', tpl: 'a4_executive_grid_pro', label: 'A4 الشبكي التنفيذي Pro' },
                        { mode: 'a4', tpl: 'a4_global_sap_odoo', label: 'A4 الضريبي المؤسسي B2B' },
                        { mode: 'a4', tpl: 'a4_warranty_electronics', label: 'A4 وثيقة الضمان والسيريال' },
                        { mode: 'a4', tpl: 'a4_corporate_classic', label: 'A4 الكلاسيكي للشركات' },
                        { mode: 'a4', tpl: 'a4_modern_blue', label: 'A4 الهوية البصرية المتدرج' },
                        { mode: 'a4', tpl: 'a4_contracting_specs', label: 'A4 المستخلصات الهندسية' },
                        { mode: 'a4', tpl: 'a4_medical_pharmacy', label: 'A4 التوريد الطبي FEFO' },
                        { mode: 'a4', tpl: 'a4_minimalist_clean', label: 'A4 السويسري النقي' },
                        { mode: 'thermal', tpl: 'thermal_80mm_onyx_pos', label: '80mm الإيصال التنفيذي Pro' },
                        { mode: 'thermal', tpl: 'thermal_80mm_warranty', label: '80mm إيصال الضمان S/N' },
                        { mode: 'thermal', tpl: 'thermal_80mm_standard', label: '80mm الضريبي القياسي' },
                        { mode: 'thermal', tpl: 'thermal_80mm_modern', label: '80mm الهوية الرقمية' },
                        { mode: 'thermal', tpl: 'thermal_80mm_minimal', label: '80mm السويسري الموفّر' },
                        { mode: 'thermal', tpl: 'thermal_80mm_restaurant', label: '80mm الضيافة والمطاعم' },
                        { mode: 'thermal', tpl: 'thermal_58mm_compact', label: '58mm المدمج المحمول' },
                      ].map((opt) => (
                        <button
                          key={opt.tpl}
                          type="button"
                          onClick={() => {
                            setPreviewMode(opt.mode as any);
                            if (opt.mode === 'a4') {
                              setTemplateOverrideA4(opt.tpl as StandardInvoiceTemplateType);
                            } else {
                              setTemplateOverrideThermal(opt.tpl as ThermalTemplateType);
                            }
                          }}
                          className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                            (previewMode === 'a4' &&
                              (templateOverrideA4 || invoiceTemplateSettings.standardTemplate) ===
                                opt.tpl) ||
                            (previewMode === 'thermal' &&
                              (templateOverrideThermal || invoiceTemplateSettings.thermalTemplate) ===
                                opt.tpl)
                              ? 'haseb-btn-primary text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        data-testid="sales-quick-edit-invoice-toggle"
                        onClick={() => setIsInlineTemplateEditOpen((p) => !p)}
                        className={`px-2.5 py-1 rounded font-bold border transition cursor-pointer flex items-center gap-1 ${
                          isInlineTemplateEditOpen
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تحرير سريع</span>
                      </button>
                      <button
                        type="button"
                        data-testid="sales-open-template-manager-btn"
                        onClick={() => setIsTemplateManagerOpen(true)}
                        className="px-2.5 py-1 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span>مدير القوالب الشبكي</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        data-testid="sales-invoice-whatsapp-btn"
                        onClick={() => {
                          const matchedCust = customers.find((c) => c.id === selectedInvoice.customerId);
                          openQuickSendModal({
                            channel: 'WHATSAPP',
                            category: 'INVOICE',
                            recipientName: selectedInvoice.customerName,
                            recipientPhone: matchedCust?.phone || selectedInvoice.customerPhone || '',
                            referenceNumber: selectedInvoice.invoiceNumber,
                            messageBody: composeInvoiceMessageText({
                              invoice: selectedInvoice,
                              companyName: company.nameAr || currentTenant.legalName,
                              branchName: currentBranch.nameAr,
                              currency,
                            }),
                          });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>إرسال واتساب</span>
                      </button>

                      <button
                        type="button"
                        data-testid="sales-invoice-sms-btn"
                        onClick={() => {
                          const matchedCust = customers.find((c) => c.id === selectedInvoice.customerId);
                          openQuickSendModal({
                            channel: 'SMS',
                            category: 'INVOICE',
                            recipientName: selectedInvoice.customerName,
                            recipientPhone: matchedCust?.phone || selectedInvoice.customerPhone || '',
                            referenceNumber: selectedInvoice.invoiceNumber,
                            messageBody: composeInvoiceMessageText({
                              invoice: selectedInvoice,
                              companyName: company.nameAr || currentTenant.legalName,
                              branchName: currentBranch.nameAr,
                              currency,
                            }),
                          });
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>SMS</span>
                      </button>

                      {!selVoided && (
                        <button
                          type="button"
                          data-testid="sales-void-return-invoice-btn"
                          onClick={() => openVoidReturnModal(selectedInvoice)}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إلغاء واسترجاع الفاتورة</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="haseb-btn-primary text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Live Invoice Quick-Edit Panel */}
                  {isInlineTemplateEditOpen && (
                    <div
                      data-testid="sales-inline-invoice-editor"
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-black text-slate-800 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-blue-700" />
                          <span>التحرير الفوري لتصميم ونصوص الفاتورة</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsInlineTemplateEditOpen(false)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block font-bold text-slate-600 mb-1">عنوان الفاتورة:</label>
                          <input
                            type="text"
                            data-testid="sales-inline-header-input"
                            value={invoiceTemplateSettings.headerTitleAr || ''}
                            onChange={(e) =>
                              updateInvoiceTemplateSettings({ headerTitleAr: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600 mb-1">رقم IBAN المصرفي:</label>
                          <input
                            type="text"
                            dir="ltr"
                            placeholder="YE00 / SA00 ..."
                            value={invoiceTemplateSettings.bankIban || ''}
                            onChange={(e) =>
                              updateInvoiceTemplateSettings({
                                bankIban: e.target.value,
                                showBankAccounts: true,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-600 mb-1">حجم الخط:</label>
                            <select
                              value={invoiceTemplateSettings.fontScale || 'normal'}
                              onChange={(e) =>
                                updateInvoiceTemplateSettings({ fontScale: e.target.value as any })
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                            >
                              <option value="compact">مضغوط</option>
                              <option value="normal">قياسي</option>
                              <option value="large">كبير</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 mb-1">اللون:</label>
                            <input
                              type="color"
                              value={invoiceTemplateSettings.primaryColorHex || '#1e3a8a'}
                              onChange={(e) =>
                                updateInvoiceTemplateSettings({ primaryColorHex: e.target.value })
                              }
                              className="w-full h-8 rounded border border-slate-300 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">ملاحظة التذييل:</label>
                        <input
                          type="text"
                          value={invoiceTemplateSettings.footerNoteAr || ''}
                          onChange={(e) =>
                            updateInvoiceTemplateSettings({ footerNoteAr: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { key: 'showItemSku', label: 'SKU' },
                          { key: 'showItemDiscount', label: 'الخصم' },
                          { key: 'showItemTax', label: 'الضريبة' },
                          { key: 'showSerialAndWarranty', label: 'السيريال/الضمان' },
                          { key: 'showTafqeet', label: 'التفقيط' },
                          { key: 'showQR', label: 'QR' },
                          { key: 'showBarcode', label: 'الباركود' },
                          { key: 'showStampAndSignature', label: 'الختم والتوقيع' },
                        ].map((opt) => (
                          <label
                            key={opt.key}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 font-bold cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(invoiceTemplateSettings as any)[opt.key] !== false}
                              onChange={(e) =>
                                updateInvoiceTemplateSettings({ [opt.key]: e.target.checked })
                              }
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rendered Invoice */}
                  <InvoiceRenderer
                    invoice={selectedInvoice}
                    mode={previewMode}
                    standardTemplate={templateOverrideA4}
                    thermalTemplate={templateOverrideThermal}
                    settings={invoiceTemplateSettings}
                    companyName={company.nameAr || currentTenant.legalName}
                    companyNameEn={company.name}
                    companyLogo={company.logo}
                    taxNumber={company.taxNumber || '—'}
                    branchName={currentBranch.nameAr}
                    branchAddress={currentBranch.city}
                    branchPhone={currentBranch.phone}
                    currency={currency}
                  />
                </div>
              );
            })()}
          </div>

          {/* Full Drag-and-Drop Invoice Template Manager Modal */}
          {isTemplateManagerOpen &&
            renderModalPortal(
              <div
                data-testid="sales-template-manager-modal"
                data-modal-top={templateManagerLayer.isTopLayer ? 'true' : undefined}
                style={{ zIndex: templateManagerLayer.zIndex }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setIsTemplateManagerOpen(false);
                }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
              >
                <div className="w-full max-w-[1380px]">
                  <InvoiceTemplateManager
                    isModal
                    sampleInvoice={selectedInvoice}
                    onClose={() => setIsTemplateManagerOpen(false)}
                    onApplied={(tpl) => {
                      setPreviewMode(tpl.format === 'a4' ? 'a4' : 'thermal');
                      if (tpl.format === 'a4') {
                        setTemplateOverrideA4(tpl.baseTemplateId as StandardInvoiceTemplateType);
                      } else {
                        setTemplateOverrideThermal(tpl.baseTemplateId as ThermalTemplateType);
                      }
                      setIsTemplateManagerOpen(false);
                    }}
                  />
                </div>
              </div>
            )}
        </div>
      )}

      {/* Multi-Stage Commercial Fulfillment Pipeline Tab */}
      {activeTab === 'pipeline' && (() => {
        const quoteCount = salesPipelineDocs.filter((d) => d.stage === 'QUOTATION').length;
        const orderCount = salesPipelineDocs.filter((d) => d.stage === 'SALES_ORDER').length;
        const deliveryCount = salesPipelineDocs.filter((d) => d.stage === 'DELIVERY_NOTE').length;
        const invoicedCount = salesPipelineDocs.filter((d) => d.stage === 'INVOICED').length;
        const totalPipelineValue = salesPipelineDocs.reduce((s, d) => s + d.grandTotal, 0);

        return (
          <div className="space-y-5" data-testid="sales-pipeline-section">
            {pipelineFeedback && (
              <div
                data-testid="pipeline-feedback-banner"
                className="p-3.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pipelineFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPipelineFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-950 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 4-Stage Pipeline Progression Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>01. عروض الأسعار (Quotations)</span>
                  <span className="font-mono font-bold text-slate-700">{quoteCount}</span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                  {salesPipelineDocs
                    .filter((d) => d.stage === 'QUOTATION')
                    .reduce((s, d) => s + d.grandTotal, 0)
                    .toLocaleString()}{' '}
                  {currency}
                </div>
                <div className="text-[11px] text-slate-500">بانتظار تعميد العميل وتحويلها لأمر بيع</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>02. أوامر البيع المؤكدة (Sales Orders)</span>
                  <span className="font-mono font-bold text-sky-700">{orderCount}</span>
                </div>
                <div className="text-lg font-bold font-mono text-sky-700 tabular-nums">
                  {salesPipelineDocs
                    .filter((d) => d.stage === 'SALES_ORDER')
                    .reduce((s, d) => s + d.grandTotal, 0)
                    .toLocaleString()}{' '}
                  {currency}
                </div>
                <div className="text-[11px] text-slate-500">تم حجز الكميات بالمستودع آلياً</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>03. إشعارات التسليم المخزني (Delivery Notes)</span>
                  <span className="font-mono font-bold text-amber-700">{deliveryCount}</span>
                </div>
                <div className="text-lg font-bold font-mono text-amber-700 tabular-nums">
                  {salesPipelineDocs
                    .filter((d) => d.stage === 'DELIVERY_NOTE')
                    .reduce((s, d) => s + d.grandTotal, 0)
                    .toLocaleString()}{' '}
                  {currency}
                </div>
                <div className="text-[11px] text-slate-500">تم خصم المخزون وترحيل قيد تكلفة البضاعة WAC</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>04. مفوترة ضريبياً (ZATCA Invoiced)</span>
                  <span className="font-mono font-bold text-emerald-700">{invoicedCount}</span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
                  {salesPipelineDocs
                    .filter((d) => d.stage === 'INVOICED')
                    .reduce((s, d) => s + d.grandTotal, 0)
                    .toLocaleString()}{' '}
                  {currency}
                </div>
                <div className="text-[11px] text-slate-500">تم إصدار الفاتورة الضريبية وترحيل الإيراد</div>
              </div>
            </div>

            {/* Pipeline Table */}
            <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-slate-700" />
                    <span>سجل الدورة المستندية للمبيعات (Quotation → SO → DN → Tax Invoice)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    إجمالي قيمة العقود والعروض الجارية: {totalPipelineValue.toLocaleString()} {currency}
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="open-new-quote-modal-btn"
                  onClick={() => setIsNewQuoteOpen(true)}
                  className="haseb-btn-primary text-white text-xs font-semibold px-3.5 py-2 rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إنشاء عرض سعر تجاري جديد</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-start">أرقام المستندات المتسلسلة</th>
                      <th className="py-2.5 px-3 text-start">العميل / البنود</th>
                      <th className="py-2.5 px-3 text-center">الصلاحية والدفع</th>
                      <th className="py-2.5 px-3 text-end">الإجمالي (شامل VAT)</th>
                      <th className="py-2.5 px-3 text-center">المرحلة الحالية وحالة المخزون</th>
                      <th className="py-2.5 px-3 text-center">الإجراء التنفيذي التالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesPipelineDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-mono space-y-0.5">
                          <div className="font-bold text-slate-900">{doc.quoteNumber}</div>
                          {doc.salesOrderNumber && (
                            <div className="text-[11px] text-sky-700">SO: {doc.salesOrderNumber}</div>
                          )}
                          {doc.deliveryNoteNumber && (
                            <div className="text-[11px] text-amber-700">DN: {doc.deliveryNoteNumber}</div>
                          )}
                          {doc.linkedInvoiceNumber && (
                            <div className="text-[11px] text-emerald-700 font-bold">
                              INV: {doc.linkedInvoiceNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{doc.customerName}</div>
                          <div className="text-[11px] text-slate-500">
                            {doc.items.map((i) => `${i.productName} (×${i.quantity})`).join(' · ')}
                          </div>
                          {doc.notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{doc.notes}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-[11px] text-slate-600">
                          <div>
                            صالح حتى: <span className="font-mono">{doc.validUntil}</span>
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            الدفع: {doc.paymentMethod === 'CREDIT' ? 'آجل ذمم' : doc.paymentMethod === 'CARD' ? 'شبكة/بنك' : 'نقدي'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 tabular-nums">
                          <div>
                            {doc.grandTotal.toLocaleString()} {currency}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            ضريبة: {doc.taxAmount.toLocaleString()} {currency}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-semibold text-slate-900">
                            {doc.stage === 'QUOTATION' && '01 · عرض سعر مبدئي'}
                            {doc.stage === 'SALES_ORDER' && '02 · أمر بيع مؤكد (SO)'}
                            {doc.stage === 'DELIVERY_NOTE' && '03 · إشعار تسليم مخزني (DN)'}
                            {doc.stage === 'INVOICED' && '04 · مفوتر ضريبياً (ZATCA)'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {doc.stockDeducted
                              ? `تم الصرف المخزني (${doc.cogsJournalNumber || 'WAC'})`
                              : doc.stockReserved
                              ? 'الكمية محجوزة بالمستودع'
                              : 'لم يتم حجز المخزون بعد'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {doc.stage === 'QUOTATION' && (
                            <button
                              type="button"
                              data-testid={`advance-pipeline-${doc.id}`}
                              onClick={() => handleAdvancePipelineStage(doc.id)}
                              className="px-3 py-1.5 rounded-md haseb-btn-primary text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <span>تحويل إلى أمر بيع (SO)</span>
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}
                          {doc.stage === 'SALES_ORDER' && (
                            <button
                              type="button"
                              data-testid={`advance-pipeline-${doc.id}`}
                              onClick={() => handleAdvancePipelineStage(doc.id)}
                              className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>إصدار إشعار تسليم مخزني (DN)</span>
                            </button>
                          )}
                          {doc.stage === 'DELIVERY_NOTE' && (
                            <button
                              type="button"
                              data-testid={`advance-pipeline-${doc.id}`}
                              onClick={() => handleAdvancePipelineStage(doc.id)}
                              className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>إصدار فاتورة ضريبية (ZATCA)</span>
                            </button>
                          )}
                          {doc.stage === 'INVOICED' && (
                            <button
                              type="button"
                              onClick={() => {
                                const foundInv = salesInvoices.find(
                                  (i) => i.invoiceNumber === doc.linkedInvoiceNumber
                                );
                                if (foundInv) {
                                  setSelectedInvoice(foundInv);
                                }
                                setActiveTab('invoices');
                              }}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                            >
                              عرض الفاتورة ({doc.linkedInvoiceNumber})
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Statement of Account, Aging Analysis & Customer Receipt Voucher Tab */}
      {activeTab === 'aging' && (
        <div className="space-y-5">
          {receiptFeedback && (
            <div
              data-testid="customer-receipt-banner"
              className="p-3.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{receiptFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptFeedback(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Aging Table across all Customers (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200/90 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    جدول أعمار الديون التفصيلي للعملاء (Aging Schedule)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    انقر على أي عميل لعرض كشف حسابه أو إصدار سند قبض فوري
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-900">
                  الإجمالي: {agingData.totals.totalReceivables.toLocaleString()} {currency}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-start">العميل</th>
                      <th className="py-2.5 px-3 text-end">الرصيد القائم</th>
                      <th className="py-2.5 px-3 text-end">0-30 يوم</th>
                      <th className="py-2.5 px-3 text-end">31-60 يوم</th>
                      <th className="py-2.5 px-3 text-end">61-90 يوم</th>
                      <th className="py-2.5 px-3 text-end">+90 يوم</th>
                      <th className="py-2.5 px-3 text-center">المخاطر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agingData.customerAging.map((c) => {
                      const isSel = c.partyId === selectedStatementCustomer?.partyId;
                      return (
                        <tr
                          key={c.partyId}
                          onClick={() => setStatementCustomerId(c.partyId)}
                          className={`cursor-pointer transition ${
                            isSel ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-slate-900">{c.partyNameAr}</td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900">
                            {c.totalBalance.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono text-emerald-700">
                            {c.current0To30.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono text-sky-700">
                            {c.days31To60.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono text-amber-700">
                            {c.days61To90.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono text-rose-700">
                            {c.daysOver90.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                c.riskStatus === 'HIGH'
                                  ? 'text-rose-600'
                                  : c.riskStatus === 'MODERATE'
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.riskStatus === 'HIGH'
                                    ? 'bg-rose-600'
                                    : c.riskStatus === 'MODERATE'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              {c.utilizationPercent}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instant Customer Receipt Voucher Form (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200/90 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    إصدار سند قبض رسمي من عميل (Receipt Voucher)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500">قيد مزدوج آلي</span>
              </div>

              {selectedStatementCustomer && (
                <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">العميل المحدد:</span>
                    <span className="font-bold text-slate-900">
                      {selectedStatementCustomer.partyNameAr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الرصيد المدين الحالي:</span>
                    <span
                      data-testid="selected-customer-balance"
                      className="font-mono font-bold text-sm text-slate-900"
                    >
                      {selectedStatementCustomer.totalBalance.toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الحد الائتماني المسموح:</span>
                    <span className="font-mono text-slate-700">
                      {selectedStatementCustomer.creditLimit.toLocaleString()} {currency} (
                      {selectedStatementCustomer.utilizationPercent}%)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      data-testid="sales-aging-whatsapp-btn"
                      onClick={() => {
                        const matchedCust = customers.find(
                          (c) => c.id === selectedStatementCustomer.partyId
                        );
                        openQuickSendModal({
                          channel: 'WHATSAPP',
                          category: 'DEBT_REMINDER',
                          recipientName: selectedStatementCustomer.partyNameAr,
                          recipientPhone: matchedCust?.phone || '+966 50 882 1940',
                          referenceNumber: `SOA-${selectedStatementCustomer.partyId.slice(-4)}`,
                          messageBody: composeDebtReminderMessageText({
                            customerName: selectedStatementCustomer.partyNameAr,
                            totalBalance: selectedStatementCustomer.totalBalance,
                            current0To30: selectedStatementCustomer.current0To30,
                            days31To60: selectedStatementCustomer.days31To60,
                            days61To90: selectedStatementCustomer.days61To90,
                            daysOver90: selectedStatementCustomer.daysOver90,
                            companyName: company.nameAr || currentTenant.legalName,
                            currency,
                          }),
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>إرسال كشف حساب ومطالبة سداد واتساب / SMS</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handlePostCustomerReceipt} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اختر العميل</label>
                  <select
                    value={statementCustomerId}
                    onChange={(e) => setStatementCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white font-semibold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr} — الرصيد: {c.balance.toLocaleString()} {currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      المبلغ المحصل ({currency})
                    </label>
                    <input
                      type="number"
                      min={1}
                      data-testid="receipt-voucher-amount"
                      value={receiptAmount}
                      onChange={(e) => setReceiptAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">طريقة التحصيل</label>
                    <select
                      value={receiptMethod}
                      onChange={(e) => setReceiptMethod(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white"
                    >
                      <option value="BANK_TRANSFER">تحويل بنكي (ح/ البنك 1102)</option>
                      <option value="CASH">{masterSystemConfig.cashPaymentLabelAr} (ح/ الصندوق 1101)</option>
                      <option value="POS_CARD">{masterSystemConfig.cardPaymentLabelAr} (ح/ البنك 1102)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    رقم سند القبض / المرجع البنكي
                  </label>
                  <input
                    type="text"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  data-testid="post-customer-receipt-btn"
                  className="w-full py-2.5 rounded-md haseb-btn-primary text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <span>اعتماد سند القبض وترحيل القيد المحاسبي</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Customers Directory Tab */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-lg border border-slate-200/90 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {language === 'ar' ? c.nameAr : c.name}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {c.loyaltyPoints} نقطة
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 font-mono">
                <div>الهاتف: {c.phone}</div>
                <div>الرقم الضريبي: {c.taxNumber || '310000000000003'}</div>
                <div>
                  الحد الائتماني: {c.creditLimit.toLocaleString()} {currency}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-500">الرصيد المدين:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {c.balance.toLocaleString()} {currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Quick Invoice Debt Settlement */}
      {settlingInvoice && (() => {
        const paidSoFar = Math.min(
          settlingInvoice.grandTotal,
          Math.max(0, Number(settlingInvoice.paidAmount ?? settlingInvoice.grandTotal) || 0)
        );
        const owedNow = Math.max(0, Math.round((settlingInvoice.grandTotal - paidSoFar) * 100) / 100);
        const afterSettleRem = Math.max(0, Math.round((owedNow - (Number(settleAmount) || 0)) * 100) / 100);
        return renderModalPortal(
          <div
            style={{ zIndex: settleInvoiceLayer.zIndex }}
            data-modal-top={settleInvoiceLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSettlingInvoice(null);
            }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">
                  سداد وتحصيل مديونية الفاتورة ({settlingInvoice.invoiceNumber})
                </h3>
                <button
                  type="button"
                  onClick={() => setSettlingInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleConfirmSettleInvoice} className="p-5 space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">العميل:</span>
                    <span className="font-bold text-slate-900">{settlingInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">إجمالي الفاتورة:</span>
                    <span className="font-mono font-bold">{settlingInvoice.grandTotal.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>المدفوع سابقاً:</span>
                    <span className="font-mono font-bold">{paidSoFar.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-black pt-1 border-t border-slate-200">
                    <span>المتبقي المستحق للتحصيل:</span>
                    <span className="font-mono">{owedNow.toLocaleString()} {currency}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">المبلغ المحصل الآن ({currency})</label>
                    <button
                      type="button"
                      onClick={() => setSettleAmount(owedNow)}
                      className="text-[11px] font-bold text-emerald-700 underline cursor-pointer"
                    >
                      سداد كامل المتبقي
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min={0.01}
                    max={owedNow}
                    required
                    data-testid="settle-invoice-amount-input"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(Math.min(owedNow, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-black text-base"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">وسيلة التحصيل</label>
                    <select
                      value={settleMethod}
                      onChange={(e) => setSettleMethod(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="CASH">نقداً (صندوق الكاشير)</option>
                      <option value="BANK_TRANSFER">تحويل مصرفي / بنك</option>
                      <option value="POS_CARD">شبكة / بطاقة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم السند</label>
                    <input
                      type="text"
                      value={settleRef}
                      onChange={(e) => setSettleRef(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between font-bold text-emerald-900">
                  <span>المتبقي بعد هذا التحصيل:</span>
                  <span className="font-mono" dir="ltr">{afterSettleRem.toLocaleString()} {currency}</span>
                </div>

                <div className="pt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlingInvoice(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    data-testid="confirm-settle-invoice-btn"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد السداد وترحيل القيد</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal: Full Invoice Cancellation & Return (إلغاء الفاتورة والاسترجاع مع ختم الاسترجاع) */}
      {voidTargetInvoice && (() => {
        const paidSoFar = Math.min(
          voidTargetInvoice.grandTotal,
          Math.max(0, Number(voidTargetInvoice.paidAmount ?? voidTargetInvoice.grandTotal) || 0)
        );
        const debtToRelease = Math.max(
          0,
          Math.round((voidTargetInvoice.grandTotal - paidSoFar) * 100) / 100
        );
        return renderModalPortal(
          <div
            style={{ zIndex: voidReturnLayer.zIndex }}
            data-modal-top={voidReturnLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setVoidTargetInvoice(null);
            }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
          >
            <div
              data-testid="sales-void-return-modal"
              className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-sm text-rose-950">
                    إلغاء واسترجاع الفاتورة ({voidTargetInvoice.invoiceNumber})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setVoidTargetInvoice(null)}
                  className="text-rose-500 hover:text-rose-800 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleConfirmVoidAndReturn} className="p-5 space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">العميل:</span>
                    <span className="font-bold text-slate-900">{voidTargetInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">إجمالي الفاتورة الملغاة:</span>
                    <span className="font-mono font-bold text-slate-900" dir="ltr">
                      {voidTargetInvoice.grandTotal.toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>المبلغ الواجب إرجاعه للعميل:</span>
                    <span className="font-mono" dir="ltr">
                      {paidSoFar.toLocaleString()} {currency}
                    </span>
                  </div>
                  {debtToRelease > 0.01 && (
                    <div className="flex justify-between text-amber-800 font-bold">
                      <span>المديونية المسقطة عن العميل:</span>
                      <span className="font-mono" dir="ltr">
                        {debtToRelease.toLocaleString()} {currency}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-semibold">
                  سيتم وسم الفاتورة بختم «ملغاة — تم الاسترجاع»، واستبعادها تماماً من إحصائيات المبيعات والأرباح، وإصدار إشعار دائن وقيد محاسبي عكسي تلقائياً.
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة الأصناف المسترجعة للمخزون</label>
                  <select
                    data-testid="void-return-condition-select"
                    value={voidCondition}
                    onChange={(e) => setVoidCondition(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="HEALTHY_RESTOCK">سليمة — إعادة كاملة للرصيد المتاح بالمستودع</option>
                    <option value="DEFECTIVE_QUARANTINE">معيبة / تالفة — عزل فني دون زيادة المتاح</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">طريقة إرجاع المبلغ</label>
                  <select
                    data-testid="void-return-refund-method-select"
                    value={voidRefundMethod}
                    onChange={(e) => setVoidRefundMethod(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="CASH">رد المبلغ نقداً / تحويل مباشر للعميل</option>
                    <option value="CREDIT_BALANCE">تسوية في رصيد/حساب العميل (إشعار دائن)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">سبب الإلغاء والاسترجاع</label>
                  <input
                    type="text"
                    required
                    data-testid="void-return-reason-input"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="pt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVoidTargetInvoice(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                  >
                    تراجع
                  </button>
                  <button
                    type="submit"
                    data-testid="confirm-void-return-btn"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد إلغاء الفاتورة والاسترجاع</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal: New Sales Invoice */}
      {isNewInvoiceOpen && (() => {
        const selProd = products.find((p) => p.id === selectedProductId) || products[0];
        const rawSub = (selProd?.salePrice || 0) * invoiceQty;
        let previewDisc = 0;
        if (typeof discountValue === 'number' && discountValue > 0) {
          if (discountType === 'PERCENT') {
            const pct = Math.min(100, Math.max(0, discountValue));
            previewDisc = Math.round(((rawSub * pct) / 100) * 100) / 100;
          } else {
            previewDisc = Math.min(rawSub, discountValue);
          }
        }
        const previewTaxRate = 0;
        const previewTax = 0;
        const previewNet = Math.round(Math.max(0, rawSub - previewDisc) * 100) / 100;
        const effectivePaidVal =
          newInvoicePaidOverride.trim() !== ''
            ? Math.min(previewNet, Math.max(0, Number(newInvoicePaidOverride) || 0))
            : paymentMethod === 'CREDIT'
            ? 0
            : previewNet;
        const previewRemainingDebt = Math.max(0, Math.round((previewNet - effectivePaidVal) * 100) / 100);

        return renderModalPortal(
          <div
            style={{ zIndex: newInvoiceLayer.zIndex }}
            data-modal-top={newInvoiceLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsNewInvoiceOpen(false);
            }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md max-h-[92vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">إصدار فاتورة مبيعات جديدة</h3>
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">العميل / الجهة</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-slate-300 bg-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الصنف المباع</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedProductId(nextId);
                      const nextProd = products.find((p) => p.id === nextId);
                      if (nextProd && invoiceQty > nextProd.stockQty) {
                        const capped = Math.max(1, nextProd.stockQty);
                        setInvoiceQty(capped);
                        setStockCapNotice(
                          `تنبيه المخزون: الرصيد المتاح للصنف (${nextProd.nameAr}) هو (${nextProd.stockQty}) فقط — تم ضبط الكمية على (${capped}).`
                        );
                      } else {
                        setStockCapNotice(null);
                      }
                    }}
                    className="w-full p-2.5 rounded-md border border-slate-300 bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameAr} ({p.salePrice} {currency} • المتوفر: {p.stockQty})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      الكمية (المتوفر: {selProd?.stockQty ?? 0})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, selProd?.stockQty ?? 1)}
                      value={invoiceQty}
                      onChange={(e) => {
                        const rawVal = Number(e.target.value) || 1;
                        const maxStock = Math.max(0, selProd?.stockQty ?? 0);
                        if (maxStock <= 0) {
                          setInvoiceQty(0);
                          setStockCapNotice(
                            `نفد المخزون المتاح للصنف (${selProd?.nameAr}) — الرصيد الحالي (0).`
                          );
                        } else if (rawVal > maxStock) {
                          setInvoiceQty(maxStock);
                          setStockCapNotice(
                            `لا يمكن تجاوز المخزون المتاح للصنف (${selProd?.nameAr}) — المتوفر (${maxStock}) فقط وتم ضبط الكمية عليه.`
                          );
                        } else {
                          setInvoiceQty(Math.max(1, rawVal));
                          setStockCapNotice(null);
                        }
                      }}
                      className="w-full p-2.5 rounded-md border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">طريقة الدفع</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        const nextMethod = e.target.value as 'CASH' | 'CARD' | 'CREDIT';
                        setPaymentMethod(nextMethod);
                        setNewInvoicePaidOverride(nextMethod === 'CREDIT' ? '0' : String(previewNet));
                      }}
                      className="w-full p-2.5 rounded-md border border-slate-300 bg-white"
                    >
                      <option value="CARD">{masterSystemConfig.cardPaymentLabelAr}</option>
                      <option value="CASH">{masterSystemConfig.cashPaymentLabelAr}</option>
                      <option value="CREDIT">آجل (ذمم عملاء)</option>
                    </select>
                  </div>
                </div>

                {stockCapNotice && (
                  <div
                    data-testid="sales-invoice-stock-cap-notice"
                    className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{stockCapNotice}</span>
                  </div>
                )}

                {/* Editable Paid Amount -> Automatic Debt Calculation */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">
                      المبلغ المدفوع الآن (اتركه أقل من الصافي لتسجيل مديونية):
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewInvoicePaidOverride(String(previewNet))}
                      className="text-[10px] font-bold text-emerald-700 underline cursor-pointer shrink-0"
                    >
                      كامل ({previewNet.toLocaleString()})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    max={previewNet}
                    data-testid="new-invoice-paid-input"
                    value={newInvoicePaidOverride}
                    onChange={(e) => setNewInvoicePaidOverride(e.target.value)}
                    placeholder={String(paymentMethod === 'CREDIT' ? 0 : previewNet)}
                    className="w-full p-2 rounded-md border border-slate-300 bg-white font-mono font-bold text-slate-900"
                    dir="ltr"
                  />
                  {previewRemainingDebt > 0.01 && (
                    <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>مديونية مسجلة على العميل:</span>
                      </span>
                      <span className="font-mono" dir="ltr">
                        {previewRemainingDebt.toLocaleString()} {currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Discount Section: Percent (%) vs Fixed Amount */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تطبيق خصم:</span>
                    </span>
                    <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-200 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType('PERCENT');
                          if (discountType === 'AMOUNT' && typeof discountValue === 'number' && discountValue > 100) {
                            setDiscountValue(10);
                          }
                        }}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          discountType === 'PERCENT'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        نسبة مئوية (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('AMOUNT')}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          discountType === 'AMOUNT'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        مبلغ مقطوع ({currency})
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'PERCENT' ? 100 : rawSub}
                        step={discountType === 'PERCENT' ? '1' : '1'}
                        value={discountValue}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                          if (val === '') {
                            setDiscountValue('');
                          } else if (!isNaN(val)) {
                            setDiscountValue(Math.max(0, val));
                          }
                        }}
                        placeholder={
                          discountType === 'PERCENT'
                            ? 'حدد النسبة المئوية (مثلاً: 10 أو 15 أو 25)...'
                            : `حدد مبلغ الخصم بـ ${currency} (مثلاً: 50 أو 100)...`
                        }
                        className="w-full pr-3 pl-8 py-1.5 rounded-md border border-slate-300 font-mono text-xs"
                      />
                      <span className="absolute left-2.5 top-1.5 font-bold text-xs text-slate-400">
                        {discountType === 'PERCENT' ? '%' : currency}
                      </span>
                    </div>

                    {typeof discountValue === 'number' && discountValue > 0 && (
                      <button
                        type="button"
                        onClick={() => setDiscountValue('')}
                        className="px-2.5 py-1.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>

                  {previewDisc > 0 && (
                    <div className="text-[11px] font-bold text-emerald-700">
                      قيمة الخصم المحسوبة: -{previewDisc.toLocaleString()} {currency} (
                      {discountType === 'PERCENT'
                        ? `${discountValue}%`
                        : `${discountValue} ${currency}`}
                      )
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    الرقم التسلسلي (IMEI / Serial) للضمان (اختياري)
                  </label>
                  <input
                    type="text"
                    value={serialNumberInput}
                    onChange={(e) => setSerialNumberInput(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-slate-300 font-mono"
                  />
                </div>
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">المجموع الفرعي:</span>
                    <span>{rawSub.toLocaleString()} {currency}</span>
                  </div>
                  {previewDisc > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span className="font-sans">
                        الخصم المطبق (
                        {discountType === 'PERCENT'
                          ? `نسبة ${discountValue}%`
                          : `مبلغ ${discountValue} ${currency}`}
                        ):
                      </span>
                      <span>-{previewDisc.toLocaleString()} {currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">الضريبة ({previewTaxRate}%):</span>
                    <span>{previewTax.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-xs pt-1 border-t border-slate-200">
                    <span className="font-sans">الصافي المستحق:</span>
                    <span>{previewNet.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span className="font-sans">المدفوع:</span>
                    <span>{effectivePaidVal.toLocaleString()} {currency}</span>
                  </div>
                  <div className={`flex justify-between font-bold ${previewRemainingDebt > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    <span className="font-sans">المتبقي (مديونية):</span>
                    <span>{previewRemainingDebt.toLocaleString()} {currency}</span>
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewInvoiceOpen(false)}
                    className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-new-sales-invoice-btn"
                    className="px-5 py-2 rounded-md haseb-btn-primary text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> حفظ وترحيل الفاتورة
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal: New Customer */}
      {isNewCustomerOpen &&
        renderModalPortal(
          <div
            style={{ zIndex: newCustomerLayer.zIndex }}
            data-modal-top={newCustomerLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsNewCustomerOpen(false);
            }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">إضافة عميل جديد لدليل المبيعات</h3>
              <button
                type="button"
                onClick={() => setIsNewCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم العميل / المنشأة</label>
                <input
                  type="text"
                  required
                  value={custNameAr}
                  onChange={(e) => setCustNameAr(e.target.value)}
                  placeholder="مثال: مؤسسة آفاق التوريد التجارية"
                  className="w-full p-2.5 rounded-md border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الجوال</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الحد الائتماني</label>
                  <input
                    type="number"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(Number(e.target.value))}
                    className="w-full p-2.5 rounded-md border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الرقم الضريبي للعميل (VAT)</label>
                <input
                  type="text"
                  value={custTaxNumber}
                  onChange={(e) => setCustTaxNumber(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerOpen(false)}
                  className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md haseb-btn-primary text-white font-semibold cursor-pointer"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

      {/* Modal: New Commercial Quotation */}
      {isNewQuoteOpen &&
        renderModalPortal(
          <div
            style={{ zIndex: newQuoteLayer.zIndex }}
            data-modal-top={newQuoteLayer.isTopLayer ? 'true' : undefined}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsNewQuoteOpen(false);
            }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          >
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                إنشاء عرض سعر تجاري جديد (Quotation)
              </h3>
              <button
                type="button"
                onClick={() => setIsNewQuoteOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuote} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">العميل / الجهة</label>
                <select
                  value={quoteCustomerId}
                  onChange={(e) => setQuoteCustomerId(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الصنف المطلوب تسعيره</label>
                <select
                  value={quoteProductId}
                  onChange={(e) => setQuoteProductId(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} ({p.salePrice} {currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الكمية</label>
                  <input
                    type="number"
                    min={1}
                    value={quoteQty}
                    onChange={(e) => setQuoteQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-md border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">شروط السداد</label>
                  <select
                    value={quotePaymentMethod}
                    onChange={(e) => setQuotePaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 rounded-md border border-slate-300 bg-white"
                  >
                    <option value="CREDIT">آجل (ذمم عملاء 30 يوم)</option>
                    <option value="CARD">حوالة بنكية / شبكة</option>
                    <option value="CASH">نقداً عند التوريد</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">شروط التوريد والملاحظات</label>
                <input
                  type="text"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewQuoteOpen(false)}
                  className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  data-testid="submit-new-quote-btn"
                  className="px-5 py-2 rounded-md haseb-btn-primary text-white font-semibold cursor-pointer"
                >
                  إصدار عرض السعر
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

      {/* TAB: Sales Returns, Exchanges & Credit Notes (Section 9) */}
      {activeTab === 'returns' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Issue Credit Note / Sales Return Form */}
          <div className="xl:col-span-4 bg-white rounded-md border border-slate-200 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                إصدار مرتجع مبيعات وإشعار دائن (Credit Note)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                فحص حالة القطعة المرتجعة بالسيريال، تحديد الإعادة للمخزون السليم أو العزل، وترحيل قيد عكس الإيراد وتكلفة البضاعة المباعة (COGS)
              </p>
            </div>

            {returnFeedback && (
              <div
                data-testid="sales-return-feedback-banner"
                className={`p-3 rounded-md border text-xs font-semibold ${
                  returnFeedback.includes('تنبيه') || returnFeedback.includes('خطأ')
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                {returnFeedback}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = createSalesReturnCreditNote({
                  originalInvoiceId: retInvoiceId,
                  productId: retProductId,
                  quantity: retQty,
                  serialNumber: retSerial,
                  condition: retCondition,
                  refundMethod: retRefundMethod,
                  reason: retReason,
                });
                if (res.messageAr) {
                  setReturnFeedback(res.messageAr);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  الفاتورة الأصلية المرجعية
                </label>
                <select
                  value={retInvoiceId}
                  onChange={(e) => setRetInvoiceId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 bg-white"
                >
                  {salesInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customerName} ({inv.grandTotal.toLocaleString()} {currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  الصنف المرتجع / المستبدل
                </label>
                <select
                  value={retProductId}
                  onChange={(e) => setRetProductId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} (سعر البيع: {p.salePrice} {currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الكمية المرتجعة</label>
                  <input
                    type="number"
                    min={1}
                    value={retQty}
                    onChange={(e) => setRetQty(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 rounded-md border border-slate-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    الرقم التسلسلي (SN / IMEI)
                  </label>
                  <input
                    type="text"
                    value={retSerial}
                    onChange={(e) => setRetSerial(e.target.value)}
                    className="w-full p-2 rounded-md border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  نتيجة الفحص الفني وحالة القطعة
                </label>
                <select
                  value={retCondition}
                  onChange={(e) => setRetCondition(e.target.value as any)}
                  className="w-full p-2 rounded-md border border-slate-300 bg-white"
                >
                  <option value="HEALTHY_RESTOCK">
                    سليمة وبحالة المصنع (إعادة للرصيد المتاح وعكس تكلفة COGS)
                  </option>
                  <option value="DEFECTIVE_QUARANTINE">
                    معيبة / تالفة (تحويل لمنطقة العزل والفحص الفني دون زيادة المتاح)
                  </option>
                  <option value="EXCHANGE_REPLACED">
                    استبدال بقطعة جديدة تحت الضمان بالسيريال
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  طريقة التسوية المالية للعميل
                </label>
                <select
                  value={retRefundMethod}
                  onChange={(e) => setRetRefundMethod(e.target.value as any)}
                  className="w-full p-2 rounded-md border border-slate-300 bg-white"
                >
                  <option value="CREDIT_BALANCE">
                    إشعار دائن لتخفيض مديونية العميل (Credit Note to A/R)
                  </option>
                  <option value="CASH">رد المبلغ نقداً من الصندوق</option>
                  <option value="EXCHANGE_UNIT">استبدال مباشر بقطعة بديلة</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">سبب الإرجاع الموثق</label>
                <input
                  type="text"
                  value={retReason}
                  onChange={(e) => setRetReason(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300"
                />
              </div>

              <button
                type="submit"
                data-testid="btn-submit-sales-return"
                className="w-full py-2.5 haseb-btn-primary text-white font-semibold rounded-md transition cursor-pointer"
              >
                اعتماد المرتجع وإصدار إشعار الدائن والقيد المحاسبي
              </button>
            </form>
          </div>

          {/* Credit Notes & Returns Ledger */}
          <div className="xl:col-span-8 bg-white rounded-md border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  سجل إشعارات الدائن ومرتجعات المبيعات المعتمدة ({salesReturns.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  توثيق كامل لمرجع الفاتورة الأصلية، الرقم التسلسلي، حالة الفحص المخزني، ورقم القيد العكسي في الأستاذ العام
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-start">رقم إشعار الدائن / الفاتورة</th>
                    <th className="py-3 px-4 text-start">العميل</th>
                    <th className="py-3 px-4 text-start">الصنف والسيريال</th>
                    <th className="py-3 px-4 text-center">حالة الفحص المخزني</th>
                    <th className="py-3 px-4 text-end">إجمالي المرتجع (شامل الضريبة)</th>
                    <th className="py-3 px-4 text-center">القيد المحاسبي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">{ret.creditNoteNumber}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          مرجع: {ret.originalInvoiceNumber} · {ret.date}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{ret.customerName}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {ret.quantity} × {ret.productName}
                        </div>
                        <div className="text-[11px] font-mono text-teal-700 mt-0.5">
                          SN: {ret.serialNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            ret.condition === 'HEALTHY_RESTOCK'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {ret.condition === 'HEALTHY_RESTOCK'
                            ? 'أعيد للمخزون السليم'
                            : ret.condition === 'DEFECTIVE_QUARANTINE'
                            ? 'معزول للفحص (تالف)'
                            : 'استبدال ضمان'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end font-mono font-bold text-slate-900 tabular-nums">
                        {ret.totalRefund.toLocaleString()} {currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800">
                          {ret.journalEntryNumber}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Warranty Claims & After-Sales Maintenance Center (Section 16) */}
      {activeTab === 'warranty' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Open New RMA / Maintenance Ticket */}
          <div className="xl:col-span-4 bg-white rounded-md border border-slate-200 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                استلام جهاز وفتح بطاقة ضمان وصيانة (RMA)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                التحقق التلقائي من سريان الضمان حسب السيريال وتاريخ الشراء، وتتبع مراحل الفحص والإصلاح والتسليم
              </p>
            </div>

            {rmaFeedback && (
              <div className="p-3 rounded-md bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
                {rmaFeedback}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const created = createWarrantyMaintenanceTicket({
                  serialNumber: rmaSerial,
                  productId: rmaProductId,
                  customerName: rmaCustomerName,
                  customerPhone: rmaCustomerPhone,
                  purchaseDate: rmaPurchaseDate,
                  faultDescription: rmaFaultDesc,
                  sparePartsCost: rmaPartsCost,
                  laborFee: rmaLaborFee,
                });
                setRmaFeedback(
                  `تم فتح بطاقة الصيانة والضمان رقم (${created.ticketNumber}) للجهاز (${created.serialNumber}) — الحالة: ${
                    created.isUnderWarranty ? 'مشمول بالضمان المجاني' : 'خارج الضمان (مدفوع)'
                  }`
                );
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  الرقم التسلسلي للقطعة / الجهاز (SN / IMEI)
                </label>
                <input
                  type="text"
                  required
                  value={rmaSerial}
                  onChange={(e) => setRmaSerial(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  الجهاز / اللوح / الإنفرتر / البطارية / الشاشة
                </label>
                <select
                  value={rmaProductId}
                  onChange={(e) => setRmaProductId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} (ضمان: {p.warrantyMonths || 24} شهر)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم العميل</label>
                  <input
                    type="text"
                    required
                    value={rmaCustomerName}
                    onChange={(e) => setRmaCustomerName(e.target.value)}
                    className="w-full p-2 rounded-md border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاريخ الشراء</label>
                  <input
                    type="date"
                    value={rmaPurchaseDate}
                    onChange={(e) => setRmaPurchaseDate(e.target.value)}
                    className="w-full p-2 rounded-md border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">وصف العطل الفني</label>
                <input
                  type="text"
                  required
                  value={rmaFaultDesc}
                  onChange={(e) => setRmaFaultDesc(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    تكلفة قطع الغيار (إن كان خارج الضمان)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rmaPartsCost}
                    onChange={(e) => setRmaPartsCost(Number(e.target.value))}
                    className="w-full p-2 rounded-md border border-slate-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    أجور الفحص والإصلاح
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rmaLaborFee}
                    onChange={(e) => setRmaLaborFee(Number(e.target.value))}
                    className="w-full p-2 rounded-md border border-slate-300 font-mono tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="btn-submit-rma-ticket"
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-semibold rounded-md transition cursor-pointer"
              >
                فتح بطاقة صيانة وفحص سريان الضمان
              </button>
            </form>
          </div>

          {/* RMA & Warranty Tickets Table */}
          <div className="xl:col-span-8 bg-white rounded-md border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  مركز متابعة مطالبات الضمان والصيانة الهندسية ({warrantyTickets.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  دورة عمل متكاملة: استلام الجهاز (RECEIVED) ← تشخيص فني (DIAGNOSING) ← تحت الإصلاح (IN_REPAIR) ← جاهز للتسليم (READY) ← تم التسليم (DELIVERED)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-start">رقم البطاقة / السيريال</th>
                    <th className="py-3 px-4 text-start">الجهاز والعميل</th>
                    <th className="py-3 px-4 text-center">حالة الضمان</th>
                    <th className="py-3 px-4 text-start">العطل والتقرير الفني</th>
                    <th className="py-3 px-4 text-center">مرحلة الصيانة</th>
                    <th className="py-3 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warrantyTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">{t.ticketNumber}</div>
                        <div className="text-[11px] text-teal-700 font-mono">{t.serialNumber}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          {t.customerName} · {t.customerPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            t.isUnderWarranty
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {t.isUnderWarranty
                            ? `ساري حتى ${t.warrantyExpiryDate}`
                            : `خارج الضمان (${t.totalCustomerCharge} ${currency})`}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-800 font-medium">{t.faultDescription}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{t.technicianReport}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-semibold text-slate-800">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`btn-rma-whatsapp-${t.id}`}
                            onClick={() =>
                              openQuickSendModal({
                                channel: 'WHATSAPP',
                                category: 'RMA_WARRANTY',
                                recipientName: t.customerName,
                                recipientPhone: t.customerPhone || '+967 770 112 233',
                                referenceNumber: t.ticketNumber,
                                messageBody: composeWarrantyRMAMessageText({
                                  ticket: t,
                                  companyName: company.nameAr || currentTenant.legalName,
                                  currency,
                                }),
                              })
                            }
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="إرسال حالة الضمان والصيانة للعميل عبر واتساب أو SMS"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>إشعار واتساب</span>
                          </button>

                          {t.status !== 'DELIVERED' ? (
                            <button
                              type="button"
                              data-testid={`btn-advance-rma-${t.id}`}
                              onClick={() => {
                                const res = advanceWarrantyTicketStatus(t.id);
                                if (res.success && res.messageAr) {
                                  setRmaFeedback(res.messageAr);
                                }
                              }}
                              className="px-2.5 py-1 haseb-btn-primary text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              ترقية المرحلة ←
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              تم التسليم {t.journalEntryNumber ? `(${t.journalEntryNumber})` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

