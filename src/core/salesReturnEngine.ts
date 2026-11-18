import {
  InvoiceItem,
  JournalEntry,
  Product,
  ReturnedItemCondition,
  ReturnRefundMethod,
  SalesInvoice,
  SalesReturnDoc,
} from '../types/erp';
import { createSalesReturnCreditNoteJournal } from './accountingEngine';

export function isInvoiceVoidOrReturned(inv?: Partial<SalesInvoice> | null): boolean {
  return Boolean(inv && (inv.status === 'VOID' || inv.isReturned === true));
}

export function isCartItemWarrantyActive(
  item?: Pick<InvoiceItem, 'warrantyEnabled' | 'warrantyMonths'> | null
): boolean {
  if (!item) return false;
  if (item.warrantyEnabled === false) return false;
  return Number(item.warrantyMonths || 0) > 0;
}

export function doesInvoiceHaveAnyWarranty(invoice?: Pick<SalesInvoice, 'items' | 'warrantyCancelled'> | null): boolean {
  if (!invoice || invoice.warrantyCancelled) return false;
  return (invoice.items || []).some((it) => isCartItemWarrantyActive(it));
}

export interface FullInvoiceVoidReturnInput {
  invoice: SalesInvoice;
  products: Product[];
  condition: ReturnedItemCondition;
  refundMethod: ReturnRefundMethod;
  reason: string;
  tenantId: string;
  operatorName: string;
  creditNoteNumber?: string;
  entryNumber?: string;
  returnedAt?: string;
}

export interface FullInvoiceVoidReturnResult {
  success: boolean;
  messageAr: string;
  updatedInvoice?: SalesInvoice;
  restockDeltas: Array<{ productId: string; baseQtyRestocked: number }>;
  refundedAmount: number;
  debtReleasedAmount: number;
  cashRefundDelta: number;
  cardRefundDelta: number;
  creditNotes: SalesReturnDoc[];
  journalEntry?: JournalEntry;
}

export function computeFullInvoiceVoidAndReturn(
  input: FullInvoiceVoidReturnInput
): FullInvoiceVoidReturnResult {
  const { invoice, products, condition, refundMethod, reason, tenantId, operatorName } = input;
  if (!invoice || !invoice.id) {
    return {
      success: false,
      messageAr: 'تعذر العثور على الفاتورة المطلوبة للإلغاء والاسترجاع.',
      restockDeltas: [],
      refundedAmount: 0,
      debtReleasedAmount: 0,
      cashRefundDelta: 0,
      cardRefundDelta: 0,
      creditNotes: [],
    };
  }

  if (isInvoiceVoidOrReturned(invoice)) {
    return {
      success: false,
      messageAr: `الفاتورة (${invoice.invoiceNumber}) ملغاة ومسترجعة مسبقاً.`,
      restockDeltas: [],
      refundedAmount: 0,
      debtReleasedAmount: 0,
      cashRefundDelta: 0,
      cardRefundDelta: 0,
      creditNotes: [],
    };
  }

  const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const creditNoteNumber = input.creditNoteNumber || `CN-${year}-${rand}`;
  const entryNumber = input.entryNumber || `JE-VOID-${year}-${rand}`;
  const returnedAt = input.returnedAt || new Date().toISOString().slice(0, 10);

  const originalGrandTotal = Math.max(0, r2(invoice.grandTotal));
  const paidPortion = Math.min(
    originalGrandTotal,
    Math.max(0, r2(invoice.paidAmount ?? originalGrandTotal))
  );
  const debtReleasedAmount = Math.max(0, r2(originalGrandTotal - paidPortion));
  const refundedAmount = paidPortion;

  const origCash = Math.min(
    paidPortion,
    Math.max(
      0,
      r2(
        invoice.cashPaidAmount !== undefined
          ? invoice.cashPaidAmount
          : invoice.paymentMethod === 'CARD'
          ? 0
          : paidPortion
      )
    )
  );
  const origCard = Math.max(0, r2(paidPortion - origCash));
  const cashRefundDelta = refundMethod === 'CASH' ? paidPortion : origCash;
  const cardRefundDelta = refundMethod === 'CASH' ? 0 : origCard;

  const restock = condition === 'HEALTHY_RESTOCK';
  const restockDeltas: Array<{ productId: string; baseQtyRestocked: number }> = [];
  let totalCostOfReturnedGoods = 0;

  const creditNotes: SalesReturnDoc[] = (invoice.items || []).map((item, idx) => {
    const matchedProd = products.find((p) => p.id === item.productId);
    const factor = Number(item.conversionFactor) || 1;
    const baseQty =
      Number(item.baseQtyDeducted) > 0
        ? Number(item.baseQtyDeducted)
        : Math.round(Number(item.quantity || 0) * factor * 1000) / 1000;

    if (restock && item.productId && baseQty > 0) {
      restockDeltas.push({ productId: item.productId, baseQtyRestocked: baseQty });
    }

    const baseCost =
      matchedProd?.costPrice && matchedProd.costPrice > 0
        ? matchedProd.costPrice
        : r2((Number(item.unitPrice) || 0) / factor * 0.72);
    const lineCost = r2(baseCost * baseQty);
    totalCostOfReturnedGoods = r2(totalCostOfReturnedGoods + lineCost);

    const lineTax = r2(item.taxAmount || 0);
    const lineSub = r2(Math.max(0, (Number(item.total) || 0) - lineTax));

    return {
      id: `ret-void-${Date.now()}-${idx}`,
      tenantId,
      creditNoteNumber:
        (invoice.items || []).length > 1 ? `${creditNoteNumber}-${idx + 1}` : creditNoteNumber,
      originalInvoiceId: invoice.id,
      originalInvoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      serialNumber: item.serialNumber || `VOID-${invoice.invoiceNumber}-${idx + 1}`,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      unitCost: baseCost,
      subtotal: lineSub,
      taxAmount: lineTax,
      totalRefund: r2(item.total || lineSub + lineTax),
      condition,
      refundMethod,
      reason: reason.trim() || 'إلغاء فاتورة واسترجاع كامل المبلغ',
      withinWarranty: true,
      date: returnedAt,
      journalEntryNumber: entryNumber,
      approvedBy: operatorName,
    };
  });

  let journalEntry: JournalEntry | undefined;
  if (originalGrandTotal > 0) {
    const invTax = r2(invoice.taxAmount || 0);
    const invNetSub = r2(Math.max(0, originalGrandTotal - invTax));
    journalEntry = createSalesReturnCreditNoteJournal({
      creditNoteNumber,
      originalInvoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      subtotal: invNetSub > 0 ? invNetSub : originalGrandTotal,
      taxAmount: invNetSub > 0 ? invTax : 0,
      totalRefund: originalGrandTotal,
      totalCostOfReturnedGoods,
      restockToInventory: restock,
      refundMethod,
      tenantId,
      entryNumber,
      operatorName,
    });
  }

  const updatedInvoice: SalesInvoice = {
    ...invoice,
    status: 'VOID',
    isReturned: true,
    returnedAt,
    refundedAmount,
    refundMethod,
    returnReason: reason.trim() || 'إلغاء واسترجاع الفاتورة بالكامل',
    returnCreditNoteNumber: creditNoteNumber,
    returnJournalEntryNumber: entryNumber,
    paidAmount: 0,
    remainingAmount: 0,
    cashPaidAmount: 0,
    cardPaidAmount: 0,
  };

  return {
    success: true,
    messageAr:
      refundedAmount > 0
        ? `تم إلغاء الفاتورة (${invoice.invoiceNumber}) وعمل ختم الاسترجاع، وتم إرجاع مبلغ ${refundedAmount.toLocaleString('en-US')} وإصدار إشعار دائن (${creditNoteNumber}).`
        : `تم إلغاء الفاتورة (${invoice.invoiceNumber}) وعمل ختم الاسترجاع وإسقاط المديونية (${debtReleasedAmount.toLocaleString('en-US')}) وإصدار إشعار دائن (${creditNoteNumber}).`,
    updatedInvoice,
    restockDeltas,
    refundedAmount,
    debtReleasedAmount,
    cashRefundDelta,
    cardRefundDelta,
    creditNotes,
    journalEntry,
  };
}

export interface ReturnReportRow {
  id: string;
  referenceNumber: string;
  originalInvoiceNumber: string;
  customerName: string;
  date: string;
  refundedAmount: number;
  originalTotal: number;
  debtReleasedAmount: number;
  refundMethod: ReturnRefundMethod;
  reason: string;
  journalEntryNumber?: string;
  kind: 'FULL_INVOICE_VOID' | 'PARTIAL_CREDIT_NOTE';
}

export interface StrictSalesAndReturnsReportSummary {
  activeInvoices: SalesInvoice[];
  activeInvoicesCount: number;
  voidedInvoices: SalesInvoice[];
  voidedInvoicesCount: number;
  grossSales: number;
  totalCollectedPaid: number;
  totalRemainingDebt: number;
  totalUnitsSold: number;
  debtInvoicesCount: number;
  netSalesTaxExcluded: number;
  totalTaxCollected: number;
  totalDiscountsGiven: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPct: number;
  averageBasketSize: number;
  totalVoidedOriginalAmount: number;
  totalRefundedAmount: number;
  totalReturnsCount: number;
  returnOperations: ReturnReportRow[];
  productPerformance: Array<{
    id: string;
    name: string;
    nameAr: string;
    sku: string;
    category: string;
    qtySold: number;
    revenue: number;
    cost: number;
    profit: number;
    marginPct: number;
  }>;
  paymentMethodStats: {
    cash: number;
    card: number;
    split: number;
    credit: number;
    cashPct: number;
    cardPct: number;
    splitPct: number;
    creditPct: number;
  };
}

export function computeStrictSalesAndReturnsReportSummary(params: {
  invoices: SalesInvoice[];
  salesReturns: SalesReturnDoc[];
  products: Product[];
  productCostMap: Map<string, number>;
  startDate?: string;
  endDate?: string;
}): StrictSalesAndReturnsReportSummary {
  const { invoices, salesReturns, products, productCostMap, startDate, endDate } = params;
  const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

  const activeInvoices: SalesInvoice[] = [];
  const voidedInvoices: SalesInvoice[] = [];

  for (const inv of invoices) {
    if (!inv || inv.status === 'DRAFT') continue;
    if (isInvoiceVoidOrReturned(inv)) {
      voidedInvoices.push(inv);
    } else {
      activeInvoices.push(inv);
    }
  }

  let grossSales = 0;
  let totalCollectedPaid = 0;
  let totalRemainingDebt = 0;
  let totalUnitsSold = 0;
  let debtInvoicesCount = 0;
  let netSalesTaxExcluded = 0;
  let totalTaxCollected = 0;
  let totalDiscountsGiven = 0;
  let totalCOGS = 0;

  let cash = 0;
  let card = 0;
  let split = 0;
  let credit = 0;

  const itemMap = new Map<
    string,
    {
      id: string;
      name: string;
      nameAr: string;
      sku: string;
      category: string;
      qtySold: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
    }
  >();

  for (const inv of activeInvoices) {
    const grand = Number(inv.grandTotal) || 0;
    const paid = Math.min(grand, Math.max(0, Number(inv.paidAmount ?? grand) || 0));
    const rem = Math.max(0, r2(grand - paid));

    grossSales += grand;
    totalCollectedPaid += paid;
    totalRemainingDebt += rem;
    if (rem > 0.01) debtInvoicesCount += 1;

    netSalesTaxExcluded += Number(inv.subtotal) || 0;
    totalTaxCollected += Number(inv.taxAmount) || 0;
    totalDiscountsGiven += Number(inv.discountAmount) || 0;

    credit += rem;
    if (inv.paymentMethod === 'CASH') cash += paid;
    else if (inv.paymentMethod === 'CARD') card += paid;
    else if (inv.paymentMethod === 'SPLIT') split += paid;
    else cash += paid;

    for (const item of inv.items || []) {
      const qty = Number(item.quantity) || 0;
      const baseQty = Number(item.baseQtyDeducted) > 0 ? Number(item.baseQtyDeducted) : qty * (Number(item.conversionFactor) || 1);
      const prod = products.find((p) => p.id === item.productId);
      const unitCost = productCostMap.get(item.productId) || item.unitPrice * 0.7;
      const lineCost = unitCost * baseQty;
      const lineRev = Number(item.total) || 0;
      const lineProfit = lineRev - lineCost;

      totalUnitsSold += qty;
      totalCOGS += lineCost;

      const existing = itemMap.get(item.productId);
      if (existing) {
        existing.qtySold += qty;
        existing.revenue += lineRev;
        existing.cost += lineCost;
        existing.profit += lineProfit;
        existing.marginPct = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      } else {
        itemMap.set(item.productId, {
          id: item.productId,
          name: prod?.name || item.productName,
          nameAr: prod?.nameAr || item.productName,
          sku: prod?.sku || item.sku,
          category: prod?.categoryId || 'عام',
          qtySold: qty,
          revenue: lineRev,
          cost: lineCost,
          profit: lineProfit,
          marginPct: lineRev > 0 ? (lineProfit / lineRev) * 100 : 0,
        });
      }
    }
  }

  const grossProfit = Math.max(0, netSalesTaxExcluded - totalCOGS);
  const grossMarginPct = netSalesTaxExcluded > 0 ? (grossProfit / netSalesTaxExcluded) * 100 : 0;

  cash = r2(cash);
  card = r2(card);
  split = r2(split);
  credit = r2(credit);
  const payTotal = cash + card + split + credit || 1;

  // Build strict Return Operations ledger (deduplicating voided invoices vs their generated credit notes)
  const voidedInvoiceIds = new Set(voidedInvoices.map((v) => v.id));
  const returnOperations: ReturnReportRow[] = [];
  let totalVoidedOriginalAmount = 0;
  let totalRefundedAmount = 0;

  for (const v of voidedInvoices) {
    const orig = Number(v.grandTotal) || 0;
    const refAmt = v.refundedAmount !== undefined ? Number(v.refundedAmount) : orig;
    const debtRel = Math.max(0, r2(orig - refAmt));
    totalVoidedOriginalAmount = r2(totalVoidedOriginalAmount + orig);
    totalRefundedAmount = r2(totalRefundedAmount + refAmt);
    returnOperations.push({
      id: `void-${v.id}`,
      referenceNumber: v.returnCreditNoteNumber || `VOID-${v.invoiceNumber}`,
      originalInvoiceNumber: v.invoiceNumber,
      customerName: v.customerName,
      date: v.returnedAt || v.date,
      refundedAmount: refAmt,
      originalTotal: orig,
      debtReleasedAmount: debtRel,
      refundMethod: v.refundMethod || 'CASH',
      reason: v.returnReason || 'إلغاء فاتورة واسترجاع كامل المبلغ',
      journalEntryNumber: v.returnJournalEntryNumber,
      kind: 'FULL_INVOICE_VOID',
    });
  }

  for (const ret of salesReturns) {
    if (!ret) continue;
    if (voidedInvoiceIds.has(ret.originalInvoiceId)) continue;
    if (startDate && ret.date < startDate) continue;
    if (endDate && ret.date > endDate) continue;
    const refAmt = Number(ret.totalRefund) || 0;
    totalVoidedOriginalAmount = r2(totalVoidedOriginalAmount + refAmt);
    totalRefundedAmount = r2(totalRefundedAmount + refAmt);
    returnOperations.push({
      id: ret.id,
      referenceNumber: ret.creditNoteNumber,
      originalInvoiceNumber: ret.originalInvoiceNumber,
      customerName: ret.customerName,
      date: ret.date,
      refundedAmount: refAmt,
      originalTotal: refAmt,
      debtReleasedAmount: ret.refundMethod === 'CREDIT_BALANCE' ? refAmt : 0,
      refundMethod: ret.refundMethod,
      reason: ret.reason,
      journalEntryNumber: ret.journalEntryNumber,
      kind: 'PARTIAL_CREDIT_NOTE',
    });
  }

  returnOperations.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    activeInvoices,
    activeInvoicesCount: activeInvoices.length,
    voidedInvoices,
    voidedInvoicesCount: voidedInvoices.length,
    grossSales: r2(grossSales),
    totalCollectedPaid: r2(totalCollectedPaid),
    totalRemainingDebt: r2(totalRemainingDebt),
    totalUnitsSold: r2(totalUnitsSold),
    debtInvoicesCount,
    netSalesTaxExcluded: r2(netSalesTaxExcluded),
    totalTaxCollected: r2(totalTaxCollected),
    totalDiscountsGiven: r2(totalDiscountsGiven),
    totalCOGS: r2(totalCOGS),
    grossProfit: r2(grossProfit),
    grossMarginPct,
    averageBasketSize: activeInvoices.length > 0 ? grossSales / activeInvoices.length : 0,
    totalVoidedOriginalAmount,
    totalRefundedAmount,
    totalReturnsCount: returnOperations.length,
    returnOperations,
    productPerformance: Array.from(itemMap.values()).sort((a, b) => b.profit - a.profit),
    paymentMethodStats: {
      cash,
      card,
      split,
      credit,
      cashPct: Math.round((cash / payTotal) * 100),
      cardPct: Math.round((card / payTotal) * 100),
      splitPct: Math.round((split / payTotal) * 100),
      creditPct: Math.round((credit / payTotal) * 100),
    },
  };
}
