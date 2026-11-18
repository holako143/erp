import {
  ChartAccount,
  Customer,
  GoodsReceiptNote,
  JournalEntry,
  Language,
  Product,
  PurchaseOrder,
  SalesInvoice,
  SalesPipelineDoc,
  SalesReturnDoc,
  Supplier,
  WarrantyMaintenanceTicket,
} from '../types/erp';

export type GlobalSearchCategory = 'ALL' | 'DOCUMENTS' | 'CUSTOMERS' | 'INVENTORY' | 'ACCOUNTS';

export type GlobalSearchDocumentSubtype =
  | 'INVOICE'
  | 'SALES_RETURN'
  | 'QUOTE_ORDER'
  | 'WARRANTY_RMA'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'JOURNAL_ENTRY';

export interface GlobalSearchResultItem {
  id: string;
  entityType: 'DOCUMENT' | 'CUSTOMER' | 'INVENTORY' | 'ACCOUNT';
  subType?: GlobalSearchDocumentSubtype;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  badgeAr: string;
  badgeEn: string;
  amountText?: string;
  targetModule: 'sales' | 'inventory' | 'purchasing' | 'accounting';
  targetSubTab?: string;
  focusId?: string;
  searchToken?: string;
  score: number;
}

export interface GlobalSearchInput {
  query: string;
  category?: GlobalSearchCategory;
  products: Product[];
  customers: Customer[];
  suppliers?: Supplier[];
  salesInvoices: SalesInvoice[];
  salesReturns?: SalesReturnDoc[];
  salesPipelineDocs?: SalesPipelineDoc[];
  warrantyTickets?: WarrantyMaintenanceTicket[];
  purchaseOrders?: PurchaseOrder[];
  goodsReceipts?: GoodsReceiptNote[];
  journalEntries?: JournalEntry[];
  chartAccounts: ChartAccount[];
  currency: string;
  language?: Language;
  limitPerGroup?: number;
}

export interface GlobalSearchGroupedOutput {
  totalMatches: number;
  countsByCategory: Record<GlobalSearchCategory, number>;
  documents: GlobalSearchResultItem[];
  customers: GlobalSearchResultItem[];
  inventory: GlobalSearchResultItem[];
  accounts: GlobalSearchResultItem[];
  flatResults: GlobalSearchResultItem[];
}

function computeMatchScore(qLower: string, fields: Array<string | number | undefined | null>): number {
  if (!qLower) return 1;
  let best = 0;
  for (let i = 0; i < fields.length; i += 1) {
    const raw = fields[i];
    if (raw === undefined || raw === null) continue;
    const str = String(raw).toLowerCase().trim();
    if (!str) continue;
    if (str === qLower) {
      best = Math.max(best, i === 0 ? 100 : 85);
    } else if (str.startsWith(qLower)) {
      best = Math.max(best, i === 0 ? 75 : 60);
    } else if (str.includes(qLower)) {
      best = Math.max(best, i === 0 ? 45 : 30);
    }
  }
  return best;
}

export function searchGlobalEntities(input: GlobalSearchInput): GlobalSearchGroupedOutput {
  const qLower = (input.query || '').trim().toLowerCase();
  const category = input.category || 'ALL';
  const limit = Math.max(1, input.limitPerGroup ?? 8);
  const currency = input.currency || 'YER';

  const docResults: GlobalSearchResultItem[] = [];
  const custResults: GlobalSearchResultItem[] = [];
  const invResults: GlobalSearchResultItem[] = [];
  const accResults: GlobalSearchResultItem[] = [];

  // 1. Documents across ALL modules
  // 1a. Sales Invoices
  for (const inv of input.salesInvoices || []) {
    const itemTokens = (inv.items || [])
      .map((it) => `${it.productName} ${it.serialNumber || ''}`)
      .join(' ');
    const score = computeMatchScore(qLower, [
      inv.invoiceNumber,
      inv.customerName,
      inv.customerPhone,
      inv.date,
      inv.notes,
      itemTokens,
    ]);
    if (score > 0) {
      const rem = Math.max(0, Math.round(((inv.grandTotal || 0) - (inv.paidAmount ?? inv.grandTotal ?? 0)) * 100) / 100);
      docResults.push({
        id: `doc-inv-${inv.id}`,
        entityType: 'DOCUMENT',
        subType: 'INVOICE',
        titleAr: `${inv.invoiceNumber} — ${inv.customerName}`,
        titleEn: `${inv.invoiceNumber} — ${inv.customerName}`,
        subtitleAr: `${inv.date} • ${inv.items?.length || 0} أصناف${rem > 0 ? ` • متبقي مديونية: ${rem.toLocaleString()} ${currency}` : ' • مسددة'}`,
        subtitleEn: `${inv.date} • ${inv.items?.length || 0} items${rem > 0 ? ` • Debt: ${rem.toLocaleString()} ${currency}` : ' • Paid'}`,
        badgeAr: 'فاتورة مبيعات',
        badgeEn: 'Sales Invoice',
        amountText: `${(inv.grandTotal || 0).toLocaleString()} ${currency}`,
        targetModule: 'sales',
        targetSubTab: 'invoices',
        focusId: inv.id,
        searchToken: inv.invoiceNumber,
        score,
      });
    }
  }

  // 1b. Sales Pipeline Docs (Quotations, Sales Orders, Delivery Notes)
  for (const doc of input.salesPipelineDocs || []) {
    const primaryNumber =
      doc.deliveryNoteNumber || doc.salesOrderNumber || doc.quoteNumber;
    const score = computeMatchScore(qLower, [
      doc.quoteNumber,
      doc.salesOrderNumber,
      doc.deliveryNoteNumber,
      doc.customerName,
      doc.date,
      doc.notes,
    ]);
    if (score > 0) {
      docResults.push({
        id: `doc-pipe-${doc.id}`,
        entityType: 'DOCUMENT',
        subType: 'QUOTE_ORDER',
        titleAr: `${primaryNumber} — ${doc.customerName}`,
        titleEn: `${primaryNumber} — ${doc.customerName}`,
        subtitleAr: `${doc.date} • المرحلة: ${doc.stage}`,
        subtitleEn: `${doc.date} • Stage: ${doc.stage}`,
        badgeAr: doc.stage === 'QUOTATION' ? 'عرض سعر' : doc.stage === 'DELIVERY_NOTE' ? 'إذن تسليم' : 'أمر بيع',
        badgeEn: doc.stage === 'QUOTATION' ? 'Quotation' : doc.stage === 'DELIVERY_NOTE' ? 'Delivery Note' : 'Sales Order',
        amountText: `${(doc.grandTotal || 0).toLocaleString()} ${currency}`,
        targetModule: 'sales',
        targetSubTab: 'pipeline',
        focusId: doc.id,
        searchToken: primaryNumber,
        score,
      });
    }
  }

  // 1c. Sales Returns / Credit Notes
  for (const ret of input.salesReturns || []) {
    const score = computeMatchScore(qLower, [
      ret.creditNoteNumber,
      ret.originalInvoiceNumber,
      ret.customerName,
      ret.productName,
      ret.reason,
      ret.date,
    ]);
    if (score > 0) {
      docResults.push({
        id: `doc-ret-${ret.id}`,
        entityType: 'DOCUMENT',
        subType: 'SALES_RETURN',
        titleAr: `${ret.creditNoteNumber} — ${ret.customerName}`,
        titleEn: `${ret.creditNoteNumber} — ${ret.customerName}`,
        subtitleAr: `مرجع الفاتورة: ${ret.originalInvoiceNumber} • ${ret.date}`,
        subtitleEn: `Invoice Ref: ${ret.originalInvoiceNumber} • ${ret.date}`,
        badgeAr: 'مرتجع / إشعار دائن',
        badgeEn: 'Sales Return',
        amountText: `${(ret.totalRefund || 0).toLocaleString()} ${currency}`,
        targetModule: 'sales',
        targetSubTab: 'returns',
        focusId: ret.id,
        searchToken: ret.creditNoteNumber,
        score,
      });
    }
  }

  // 1d. Warranty / RMA Tickets
  for (const tkt of input.warrantyTickets || []) {
    const score = computeMatchScore(qLower, [
      tkt.ticketNumber,
      tkt.serialNumber,
      tkt.customerName,
      tkt.customerPhone,
      tkt.productName,
      tkt.faultDescription,
    ]);
    if (score > 0) {
      docResults.push({
        id: `doc-rma-${tkt.id}`,
        entityType: 'DOCUMENT',
        subType: 'WARRANTY_RMA',
        titleAr: `${tkt.ticketNumber} — ${tkt.productName}`,
        titleEn: `${tkt.ticketNumber} — ${tkt.productName}`,
        subtitleAr: `العميل: ${tkt.customerName} • S/N: ${tkt.serialNumber}`,
        subtitleEn: `Customer: ${tkt.customerName} • S/N: ${tkt.serialNumber}`,
        badgeAr: 'تذكرة ضمان RMA',
        badgeEn: 'Warranty RMA',
        amountText: `${(tkt.laborFee + (tkt.sparePartsCost || 0)).toLocaleString()} ${currency}`,
        targetModule: 'sales',
        targetSubTab: 'warranty',
        focusId: tkt.id,
        searchToken: tkt.ticketNumber,
        score,
      });
    }
  }

  // 1e. Purchase Orders
  for (const po of input.purchaseOrders || []) {
    const score = computeMatchScore(qLower, [po.poNumber, po.supplierName, po.orderDate, po.expectedDate]);
    if (score > 0) {
      docResults.push({
        id: `doc-po-${po.id}`,
        entityType: 'DOCUMENT',
        subType: 'PURCHASE_ORDER',
        titleAr: `${po.poNumber} — ${po.supplierName}`,
        titleEn: `${po.poNumber} — ${po.supplierName}`,
        subtitleAr: `${po.orderDate} • الحالة: ${po.status}`,
        subtitleEn: `${po.orderDate} • Status: ${po.status}`,
        badgeAr: 'أمر شراء',
        badgeEn: 'Purchase Order',
        amountText: `${(po.total || 0).toLocaleString()} ${currency}`,
        targetModule: 'purchasing',
        targetSubTab: 'orders',
        focusId: po.id,
        searchToken: po.poNumber,
        score,
      });
    }
  }

  // 1f. Goods Receipts (GRN)
  for (const grn of input.goodsReceipts || []) {
    const score = computeMatchScore(qLower, [
      grn.grnNumber,
      grn.poNumber,
      grn.supplierName,
      grn.receiptDate,
      grn.notes,
    ]);
    if (score > 0) {
      docResults.push({
        id: `doc-grn-${grn.id}`,
        entityType: 'DOCUMENT',
        subType: 'GOODS_RECEIPT',
        titleAr: `${grn.grnNumber} — ${grn.supplierName}`,
        titleEn: `${grn.grnNumber} — ${grn.supplierName}`,
        subtitleAr: `أمر الشراء: ${grn.poNumber} • ${grn.receiptDate}`,
        subtitleEn: `PO Ref: ${grn.poNumber} • ${grn.receiptDate}`,
        badgeAr: 'إذن استلام بضاعة',
        badgeEn: 'Goods Receipt',
        amountText: `${(grn.total || 0).toLocaleString()} ${currency}`,
        targetModule: 'purchasing',
        targetSubTab: 'grn_returns',
        focusId: grn.id,
        searchToken: grn.grnNumber,
        score,
      });
    }
  }

  // 1g. Journal Entries
  for (const je of input.journalEntries || []) {
    const score = computeMatchScore(qLower, [
      je.entryNumber,
      je.description,
      je.referenceId,
      je.createdByName,
      je.date,
    ]);
    if (score > 0) {
      const totalDebit =
        je.totalDebit || (je.lines || []).reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
      docResults.push({
        id: `doc-je-${je.id}`,
        entityType: 'DOCUMENT',
        subType: 'JOURNAL_ENTRY',
        titleAr: `${je.entryNumber} — ${je.description}`,
        titleEn: `${je.entryNumber} — ${je.description}`,
        subtitleAr: `${je.date} • المرجع: ${je.referenceId || '—'}`,
        subtitleEn: `${je.date} • Ref: ${je.referenceId || '—'}`,
        badgeAr: 'قيد محاسبي',
        badgeEn: 'Journal Entry',
        amountText: `${totalDebit.toLocaleString()} ${currency}`,
        targetModule: 'accounting',
        targetSubTab: 'journals',
        focusId: je.id,
        searchToken: je.entryNumber,
        score,
      });
    }
  }

  // 2. Customers
  for (const c of input.customers || []) {
    const score = computeMatchScore(qLower, [c.nameAr, c.name, c.phone, c.email, c.code, c.id]);
    if (score > 0) {
      const bal = Number(c.balance) || 0;
      custResults.push({
        id: `cust-${c.id}`,
        entityType: 'CUSTOMER',
        titleAr: c.nameAr || c.name,
        titleEn: c.name || c.nameAr,
        subtitleAr: `${c.phone || 'بدون هاتف'}${c.email ? ` • ${c.email}` : ''}`,
        subtitleEn: `${c.phone || 'No phone'}${c.email ? ` • ${c.email}` : ''}`,
        badgeAr: bal > 0 ? 'عميل (مدين)' : 'عميل',
        badgeEn: bal > 0 ? 'Customer (Due)' : 'Customer',
        amountText: `${bal.toLocaleString()} ${currency}`,
        targetModule: 'sales',
        targetSubTab: bal > 0 ? 'aging' : 'customers',
        focusId: c.id,
        searchToken: c.nameAr || c.name,
        score,
      });
    }
  }

  // 3. Inventory Items
  for (const p of input.products || []) {
    const score = computeMatchScore(qLower, [
      p.sku,
      p.barcode,
      p.nameAr,
      p.name,
      p.subCategory,
      p.categoryId,
      p.voltageSpec,
      p.batteryCapacitySpec,
    ]);
    if (score > 0) {
      invResults.push({
        id: `inv-${p.id}`,
        entityType: 'INVENTORY',
        titleAr: p.nameAr || p.name,
        titleEn: p.name || p.nameAr,
        subtitleAr: `SKU: ${p.sku} • باركود: ${p.barcode || '—'} • المتوفر: ${p.stockQty} ${p.uom}`,
        subtitleEn: `SKU: ${p.sku} • Barcode: ${p.barcode || '—'} • Stock: ${p.stockQty} ${p.uom}`,
        badgeAr: p.stockQty <= p.reorderPoint ? 'مخزون منخفض' : 'صنف مخزني',
        badgeEn: p.stockQty <= p.reorderPoint ? 'Low Stock' : 'Inventory Item',
        amountText: `${p.salePrice.toLocaleString()} ${currency}`,
        targetModule: 'inventory',
        focusId: p.id,
        searchToken: p.sku || p.nameAr || p.name,
        score,
      });
    }
  }

  // 4. Chart of Accounts
  for (const acc of input.chartAccounts || []) {
    const score = computeMatchScore(qLower, [acc.code, acc.nameAr, acc.name, acc.type]);
    if (score > 0) {
      accResults.push({
        id: `acc-${acc.id}`,
        entityType: 'ACCOUNT',
        titleAr: `${acc.code} — ${acc.nameAr}`,
        titleEn: `${acc.code} — ${acc.name}`,
        subtitleAr: `التصنيف: ${acc.type}`,
        subtitleEn: `Type: ${acc.type}`,
        badgeAr: 'حساب مالي',
        badgeEn: 'Account',
        amountText: `${(acc.balance || 0).toLocaleString()} ${currency}`,
        targetModule: 'accounting',
        focusId: acc.id,
        searchToken: acc.code,
        score,
      });
    }
  }

  const sortDesc = (a: GlobalSearchResultItem, b: GlobalSearchResultItem) => b.score - a.score;
  docResults.sort(sortDesc);
  custResults.sort(sortDesc);
  invResults.sort(sortDesc);
  accResults.sort(sortDesc);

  const countsByCategory: Record<GlobalSearchCategory, number> = {
    ALL: docResults.length + custResults.length + invResults.length + accResults.length,
    DOCUMENTS: docResults.length,
    CUSTOMERS: custResults.length,
    INVENTORY: invResults.length,
    ACCOUNTS: accResults.length,
  };

  const slicedDocuments =
    category === 'ALL' || category === 'DOCUMENTS' ? docResults.slice(0, limit) : [];
  const slicedCustomers =
    category === 'ALL' || category === 'CUSTOMERS' ? custResults.slice(0, limit) : [];
  const slicedInventory =
    category === 'ALL' || category === 'INVENTORY' ? invResults.slice(0, limit) : [];
  const slicedAccounts =
    category === 'ALL' || category === 'ACCOUNTS' ? accResults.slice(0, limit) : [];

  return {
    totalMatches: countsByCategory[category],
    countsByCategory,
    documents: slicedDocuments,
    customers: slicedCustomers,
    inventory: slicedInventory,
    accounts: slicedAccounts,
    flatResults: [...slicedInventory, ...slicedCustomers, ...slicedDocuments, ...slicedAccounts],
  };
}
