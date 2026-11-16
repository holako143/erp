/**
 * Haseb Enterprise ERP — Multi-Unit Conversions, Partial Goods Receipt Notes (GRN), & Purchase Returns Engine
 * Pure TypeScript algorithms for UOM math, batch warehouse receiving, and supplier debit reversals.
 */

import {
  GoodsReceiptLine,
  GoodsReceiptNote,
  JournalEntry,
  JournalLine,
  Product,
  ProductUnitOption,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseReturn,
  PurchaseReturnLine,
  StockMove,
  Supplier,
} from '../types/erp';
import { validateJournalBalance } from './accountingEngine';
import { calculateWeightedAverageCost } from './inventoryEngine';

export interface ResolvedUnitMetrics {
  unitId: string;
  unitNameAr: string;
  unitNameEn: string;
  conversionFactor: number;
  salePrice: number;
  costPrice: number;
  barcode: string;
  isBaseUnit: boolean;
}

/**
 * Resolves unit conversion factor, salePrice, and costPrice for a Product.
 * Supports lookup by unitNameAr, unitNameEn, unitId, or secondary unit barcode.
 */
export function resolveProductUnitOption(
  product: Product,
  unitOrBarcode?: string
): ResolvedUnitMetrics {
  const baseUnitAr = normalizeBaseUomLabelAr(product.uom);
  const baseOption: ResolvedUnitMetrics = {
    unitId: 'base',
    unitNameAr: baseUnitAr,
    unitNameEn: product.uom || 'PCS',
    conversionFactor: 1,
    salePrice: Number(product.salePrice) || 0,
    costPrice: Number(product.costPrice) || 0,
    barcode: product.barcode,
    isBaseUnit: true,
  };

  if (!unitOrBarcode || !Array.isArray(product.units) || product.units.length === 0) {
    return baseOption;
  }

  const query = unitOrBarcode.trim().toLowerCase();
  if (!query || query === baseUnitAr.toLowerCase() || query === (product.uom || '').toLowerCase()) {
    return baseOption;
  }

  const matched = product.units.find(
    (u) =>
      u.id.toLowerCase() === query ||
      u.unitNameAr.trim().toLowerCase() === query ||
      (u.unitNameEn || '').trim().toLowerCase() === query ||
      (u.barcode || '').trim().toLowerCase() === query
  );

  if (!matched) {
    return baseOption;
  }

  const safeFactor =
    Number.isFinite(Number(matched.conversionFactor)) && Number(matched.conversionFactor) > 0
      ? Math.round(Number(matched.conversionFactor) * 1000) / 1000
      : 1;

  return {
    unitId: matched.id,
    unitNameAr: matched.unitNameAr,
    unitNameEn: matched.unitNameEn || matched.unitNameAr,
    conversionFactor: safeFactor,
    salePrice:
      Number(matched.salePrice) > 0
        ? Math.round(Number(matched.salePrice) * 100) / 100
        : Math.round(baseOption.salePrice * safeFactor * 100) / 100,
    costPrice:
      Number(matched.costPrice) >= 0 && matched.costPrice !== undefined
        ? Math.round(Number(matched.costPrice) * 100) / 100
        : Math.round(baseOption.costPrice * safeFactor * 100) / 100,
    barcode: matched.barcode?.trim() || product.barcode,
    isBaseUnit: safeFactor === 1 && matched.unitNameAr.trim() === baseUnitAr,
  };
}

export function normalizeBaseUomLabelAr(uom?: string): string {
  switch ((uom || '').trim().toUpperCase()) {
    case 'BOX':
      return 'كرتون';
    case 'SET':
      return 'منظومة';
    case 'KG':
      return 'كجم';
    case 'PCS':
    case '':
      return 'حبة';
    default:
      return uom || 'حبة';
  }
}

export function getAllProductUnitChoices(product: Product): ResolvedUnitMetrics[] {
  const base = resolveProductUnitOption(product);
  const extras = Array.isArray(product.units)
    ? product.units
        .filter((u) => u.unitNameAr.trim().length > 0 && Number(u.conversionFactor) > 0)
        .map((u) => resolveProductUnitOption(product, u.id))
        .filter((u) => !u.isBaseUnit || u.unitNameAr !== base.unitNameAr)
    : [];
  return [base, ...extras];
}

export function findProductAndUnitByBarcodeOrSku(
  products: Product[],
  rawCode: string
): { product: Product; unit: ResolvedUnitMetrics } | null {
  const clean = rawCode.trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();

  for (const prod of products) {
    if (prod.barcode === clean || prod.sku.toLowerCase() === lower) {
      return { product: prod, unit: resolveProductUnitOption(prod) };
    }
    if (Array.isArray(prod.units)) {
      const unitMatch = prod.units.find(
        (u) => u.barcode && u.barcode.trim().toLowerCase() === lower
      );
      if (unitMatch) {
        return { product: prod, unit: resolveProductUnitOption(prod, unitMatch.id) };
      }
    }
  }
  return null;
}

export function computeBaseStockDelta(qty: number, conversionFactor = 1): number {
  const safeQty = Math.max(0, Number(qty) || 0);
  const safeFactor = Number(conversionFactor) > 0 ? Number(conversionFactor) : 1;
  return Math.round(safeQty * safeFactor * 1000) / 1000;
}

export function sanitizeProductUnitOptions(
  units: Partial<ProductUnitOption>[],
  baseCostPrice: number,
  baseSalePrice: number
): ProductUnitOption[] {
  const seenNames = new Set<string>();
  const clean: ProductUnitOption[] = [];
  for (let i = 0; i < units.length; i++) {
    const raw = units[i];
    const unitNameAr = String(raw.unitNameAr || '').trim();
    const factor = Number(raw.conversionFactor) || 0;
    if (!unitNameAr || factor <= 0) continue;
    const key = unitNameAr.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    clean.push({
      id: raw.id?.trim() || `uom-${Date.now()}-${i}`,
      unitNameAr,
      unitNameEn: raw.unitNameEn?.trim() || undefined,
      barcode: raw.barcode?.trim() || undefined,
      conversionFactor: Math.round(factor * 1000) / 1000,
      salePrice:
        Number(raw.salePrice) > 0
          ? Math.round(Number(raw.salePrice) * 100) / 100
          : Math.round(baseSalePrice * factor * 100) / 100,
      costPrice:
        Number(raw.costPrice) >= 0 && raw.costPrice !== undefined
          ? Math.round(Number(raw.costPrice) * 100) / 100
          : Math.round(baseCostPrice * factor * 100) / 100,
    });
  }
  return clean;
}

// ============================================================================
// Partial Goods Receipt Note (GRN) Computation
// ============================================================================

export interface PartialGrnInputLine {
  productId: string;
  receiveQty: number;
}

export interface PartialGrnComputationResult {
  success: boolean;
  errorAr?: string;
  grn?: GoodsReceiptNote;
  updatedPO?: PurchaseOrder;
  productStockPatches: {
    productId: string;
    addedBaseQty: number;
    newStockQty: number;
    newBaseCostPrice: number;
  }[];
  stockMoves: StockMove[];
  supplierPayableDelta: number;
}

export function computePartialGrnResult(params: {
  purchaseOrder: PurchaseOrder;
  receiptLines: PartialGrnInputLine[];
  products: Product[];
  warehouseId: string;
  operatorName: string;
  userId?: string;
  receiptDate?: string;
  notes?: string;
}): PartialGrnComputationResult {
  const { purchaseOrder, receiptLines, products, warehouseId, operatorName } = params;
  if (
    purchaseOrder.status === 'RECEIVED' ||
    purchaseOrder.status === 'CANCELLED' ||
    purchaseOrder.status === 'BILLED'
  ) {
    return {
      success: false,
      errorAr: `أمر الشراء (${purchaseOrder.poNumber}) مكتمل أو ملغى ولا يقبل استلام دفعات جديدة.`,
      productStockPatches: [],
      stockMoves: [],
      supplierPayableDelta: 0,
    };
  }

  const lineQtyMap = new Map<string, number>();
  for (const line of receiptLines) {
    const qty = Math.round((Number(line.receiveQty) || 0) * 1000) / 1000;
    if (qty > 0) {
      lineQtyMap.set(line.productId, (lineQtyMap.get(line.productId) || 0) + qty);
    }
  }

  if (lineQtyMap.size === 0) {
    return {
      success: false,
      errorAr: 'يرجى تحديد كمية استلام واحدة على الأقل أكبر من صفر.',
      productStockPatches: [],
      stockMoves: [],
      supplierPayableDelta: 0,
    };
  }

  const today = params.receiptDate || new Date().toISOString().split('T')[0];
  const grnLines: GoodsReceiptLine[] = [];
  const productStockPatches: PartialGrnComputationResult['productStockPatches'] = [];
  const stockMoves: StockMove[] = [];
  const updatedItems: PurchaseOrderItem[] = [];

  for (const poItem of purchaseOrder.items) {
    const alreadyReceived = Math.round((Number(poItem.receivedQty) || 0) * 1000) / 1000;
    const remaining = Math.max(0, Math.round((poItem.quantity - alreadyReceived) * 1000) / 1000);
    const requested = lineQtyMap.get(poItem.productId) || 0;

    if (requested > remaining + 0.0001) {
      return {
        success: false,
        errorAr: `الكمية المستلمة (${requested}) للصنف (${poItem.productName}) تتجاوز المتبقي من أمر الشراء (${remaining}).`,
        productStockPatches: [],
        stockMoves: [],
        supplierPayableDelta: 0,
      };
    }

    const nextReceived = Math.round((alreadyReceived + requested) * 1000) / 1000;
    updatedItems.push({
      ...poItem,
      receivedQty: nextReceived,
    });

    if (requested > 0) {
      const factor =
        Number(poItem.conversionFactor) > 0 ? Number(poItem.conversionFactor) : 1;
      const addedBaseQty = computeBaseStockDelta(requested, factor);
      const baseUnitCost = Math.round((poItem.unitCost / factor) * 100) / 100;
      const lineSubtotal = Math.round(requested * poItem.unitCost * 100) / 100;
      const taxRate = Number(poItem.taxRate) >= 0 ? Number(poItem.taxRate) : 0.15;
      const taxAmount = Math.round(lineSubtotal * taxRate * 100) / 100;
      const lineTotal = Math.round((lineSubtotal + taxAmount) * 100) / 100;

      grnLines.push({
        productId: poItem.productId,
        productName: poItem.productName,
        sku: poItem.sku,
        orderedQty: poItem.quantity,
        receivedQty: requested,
        unitName: poItem.unitName,
        conversionFactor: factor,
        baseQtyAdded: addedBaseQty,
        unitCost: poItem.unitCost,
        lineSubtotal,
        taxAmount,
        lineTotal,
      });

      const matchedProd = products.find((p) => p.id === poItem.productId);
      if (matchedProd) {
        const nextStock = Math.round((matchedProd.stockQty + addedBaseQty) * 1000) / 1000;
        const nextCost = calculateWeightedAverageCost(
          matchedProd.stockQty,
          matchedProd.costPrice,
          addedBaseQty,
          baseUnitCost
        );
        productStockPatches.push({
          productId: matchedProd.id,
          addedBaseQty,
          newStockQty: nextStock,
          newBaseCostPrice: nextCost,
        });
      }

      stockMoves.push({
        id: `sm-grn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tenantId: purchaseOrder.tenantId,
        productId: poItem.productId,
        productName: poItem.productName,
        sku: poItem.sku,
        toWarehouseId: warehouseId,
        qty: addedBaseQty,
        unitCost: baseUnitCost,
        moveType: 'RECEIPT',
        reference: purchaseOrder.poNumber,
        date: today,
        userId: params.userId || operatorName,
      });
    }
  }

  const allCompleted = updatedItems.every(
    (it) => Math.round((it.receivedQty || 0) * 1000) >= Math.round(it.quantity * 1000)
  );

  const grnSubtotal =
    Math.round(grnLines.reduce((acc, l) => acc + l.lineSubtotal, 0) * 100) / 100;
  const grnTax =
    Math.round(grnLines.reduce((acc, l) => acc + l.taxAmount, 0) * 100) / 100;
  const grnTotal = Math.round((grnSubtotal + grnTax) * 100) / 100;

  const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const grn: GoodsReceiptNote = {
    id: `grn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: purchaseOrder.tenantId,
    grnNumber,
    purchaseOrderId: purchaseOrder.id,
    poNumber: purchaseOrder.poNumber,
    supplierId: purchaseOrder.supplierId,
    supplierName: purchaseOrder.supplierName,
    warehouseId,
    receiptDate: today,
    lines: grnLines,
    subtotal: grnSubtotal,
    taxAmount: grnTax,
    total: grnTotal,
    notes: params.notes?.trim() || undefined,
    receivedByName: operatorName,
    createdAt: new Date().toISOString(),
  };

  const updatedPO: PurchaseOrder = {
    ...purchaseOrder,
    items: updatedItems,
    status: allCompleted ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
    approvedBy: operatorName,
    lastGrnDate: today,
  };

  return {
    success: true,
    grn,
    updatedPO,
    productStockPatches,
    stockMoves,
    supplierPayableDelta: grnTotal,
  };
}

export function createGrnReceiptJournal(params: {
  grn: GoodsReceiptNote;
  tenantId: string;
  entryNumber: string;
  operatorName: string;
}): JournalEntry {
  const cleanSub = Math.round(Math.abs(params.grn.subtotal) * 100) / 100;
  const cleanTax = Math.round(Math.abs(params.grn.taxAmount) * 100) / 100;
  const cleanTotal = Math.round((cleanSub + cleanTax) * 100) / 100;

  const lines: JournalLine[] = [
    {
      id: `jl-grn-1-${Date.now()}`,
      accountId: 'acc-1104',
      accountCode: '1104',
      accountName: 'Merchandise Inventory',
      accountNameAr: `المخزون السلعي (سند استلام ${params.grn.grnNumber})`,
      debit: cleanSub,
      credit: 0,
      memo: `GRN ${params.grn.grnNumber} for PO ${params.grn.poNumber}`,
    },
  ];

  if (cleanTax > 0) {
    lines.push({
      id: `jl-grn-2-${Date.now()}`,
      accountId: 'acc-1205',
      accountCode: '1205',
      accountName: 'VAT Input Tax Recoverable',
      accountNameAr: 'ضريبة القيمة المضافة للمدخلات (قابلة للاسترداد)',
      debit: cleanTax,
      credit: 0,
      memo: `Input VAT on ${params.grn.grnNumber}`,
    });
  }

  lines.push({
    id: `jl-grn-3-${Date.now()}`,
    accountId: 'acc-2101',
    accountCode: '2101',
    accountName: 'Accounts Payable - Suppliers',
    accountNameAr: 'الموردون (ذمم دائنة تجارية)',
    debit: 0,
    credit: cleanTotal,
    memo: `Payable to ${params.grn.supplierName} (${params.grn.grnNumber})`,
  });

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced GRN receipt journal');
  }

  return {
    id: `je-grn-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: params.entryNumber,
    date: params.grn.receiptDate,
    referenceType: 'PURCHASE_BILL',
    referenceId: params.grn.id,
    description: `قيد استلام دفعة مشتريات (${params.grn.grnNumber}) لأمر الشراء (${params.grn.poNumber}) — ${params.grn.supplierName}`,
    lines,
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// Purchase Return (Supplier Debit Note) Computation
// ============================================================================

export interface PurchaseReturnInputLine {
  productId: string;
  quantity: number;
  unitName?: string;
  conversionFactor?: number;
  unitCost?: number;
  taxRate?: number;
}

export interface PurchaseReturnComputationResult {
  success: boolean;
  errorAr?: string;
  purchaseReturn?: PurchaseReturn;
  productStockPatches: {
    productId: string;
    deductedBaseQty: number;
    newStockQty: number;
  }[];
  stockMoves: StockMove[];
  supplierPayableReduction: number;
}

export function computePurchaseReturnResult(params: {
  supplier: Supplier;
  returnLines: PurchaseReturnInputLine[];
  products: Product[];
  warehouseId: string;
  tenantId: string;
  operatorName: string;
  userId?: string;
  purchaseOrderId?: string;
  poNumber?: string;
  reason?: string;
  returnDate?: string;
}): PurchaseReturnComputationResult {
  const validInputs = params.returnLines.filter((l) => Number(l.quantity) > 0);
  if (validInputs.length === 0) {
    return {
      success: false,
      errorAr: 'يرجى تحديد صنف وكمية مرتجع أكبر من صفر.',
      productStockPatches: [],
      stockMoves: [],
      supplierPayableReduction: 0,
    };
  }

  const today = params.returnDate || new Date().toISOString().split('T')[0];
  const lines: PurchaseReturnLine[] = [];
  const productStockPatches: PurchaseReturnComputationResult['productStockPatches'] = [];
  const stockMoves: StockMove[] = [];

  for (const input of validInputs) {
    const product = params.products.find((p) => p.id === input.productId);
    if (!product) {
      return {
        success: false,
        errorAr: 'لم يتم العثور على الصنف المحدد للمرتجع.',
        productStockPatches: [],
        stockMoves: [],
        supplierPayableReduction: 0,
      };
    }

    const resolvedUnit = resolveProductUnitOption(product, input.unitName);
    const factor =
      Number(input.conversionFactor) > 0
        ? Number(input.conversionFactor)
        : resolvedUnit.conversionFactor;
    const qty = Math.round(Number(input.quantity) * 1000) / 1000;
    const baseQtyDeducted = computeBaseStockDelta(qty, factor);

    if (baseQtyDeducted > product.stockQty + 0.0001) {
      return {
        success: false,
        errorAr: `الرصيد المتاح في المستودع للصنف (${product.nameAr}) هو (${product.stockQty}) ولا يكفي لإرجاع (${baseQtyDeducted}) وحدة أساسية.`,
        productStockPatches: [],
        stockMoves: [],
        supplierPayableReduction: 0,
      };
    }

    const unitCost =
      Number(input.unitCost) > 0 ? Number(input.unitCost) : resolvedUnit.costPrice;
    const taxRate = Number(input.taxRate) >= 0 ? Number(input.taxRate) : 0.15;
    const lineSubtotal = Math.round(qty * unitCost * 100) / 100;
    const taxAmount = Math.round(lineSubtotal * taxRate * 100) / 100;
    const lineTotal = Math.round((lineSubtotal + taxAmount) * 100) / 100;

    lines.push({
      productId: product.id,
      productName: product.nameAr || product.name,
      sku: product.sku,
      quantity: qty,
      unitName: input.unitName || resolvedUnit.unitNameAr,
      conversionFactor: factor,
      baseQtyDeducted,
      unitCost,
      taxRate,
      lineSubtotal,
      taxAmount,
      lineTotal,
    });

    const nextStock = Math.max(
      0,
      Math.round((product.stockQty - baseQtyDeducted) * 1000) / 1000
    );
    productStockPatches.push({
      productId: product.id,
      deductedBaseQty: baseQtyDeducted,
      newStockQty: nextStock,
    });

    stockMoves.push({
      id: `sm-prn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: params.tenantId,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      fromWarehouseId: params.warehouseId,
      qty: baseQtyDeducted,
      unitCost: Math.round((unitCost / factor) * 100) / 100,
      moveType: 'ADJUSTMENT_OUT',
      reference: params.poNumber || 'PURCHASE-RETURN',
      date: today,
      userId: params.userId || params.operatorName,
    });
  }

  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineSubtotal, 0) * 100) / 100;
  const taxAmount = Math.round(lines.reduce((s, l) => s + l.taxAmount, 0) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const returnNumber = `PRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const purchaseReturn: PurchaseReturn = {
    id: `prn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: params.tenantId,
    returnNumber,
    supplierId: params.supplier.id,
    supplierName: params.supplier.nameAr || params.supplier.name,
    purchaseOrderId: params.purchaseOrderId,
    poNumber: params.poNumber,
    warehouseId: params.warehouseId,
    returnDate: today,
    lines,
    subtotal,
    taxAmount,
    total,
    reason: params.reason?.trim() || 'مرتجع بضاعة للمورد / إشعار مدين',
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    purchaseReturn,
    productStockPatches,
    stockMoves,
    supplierPayableReduction: total,
  };
}

export function createPurchaseReturnJournal(params: {
  purchaseReturn: PurchaseReturn;
  tenantId: string;
  entryNumber: string;
  operatorName: string;
}): JournalEntry {
  const cleanSub = Math.round(Math.abs(params.purchaseReturn.subtotal) * 100) / 100;
  const cleanTax = Math.round(Math.abs(params.purchaseReturn.taxAmount) * 100) / 100;
  const cleanTotal = Math.round((cleanSub + cleanTax) * 100) / 100;

  const lines: JournalLine[] = [
    {
      id: `jl-prn-1-${Date.now()}`,
      accountId: 'acc-2101',
      accountCode: '2101',
      accountName: 'Accounts Payable - Suppliers',
      accountNameAr: `الموردون (إشعار مدين ${params.purchaseReturn.returnNumber})`,
      debit: cleanTotal,
      credit: 0,
      memo: `Debit Note ${params.purchaseReturn.returnNumber} to ${params.purchaseReturn.supplierName}`,
    },
    {
      id: `jl-prn-2-${Date.now()}`,
      accountId: 'acc-1104',
      accountCode: '1104',
      accountName: 'Merchandise Inventory',
      accountNameAr: 'المخزون السلعي (تخفيض بمرتجع مشتريات)',
      debit: 0,
      credit: cleanSub,
      memo: `Inventory reduction for ${params.purchaseReturn.returnNumber}`,
    },
  ];

  if (cleanTax > 0) {
    lines.push({
      id: `jl-prn-3-${Date.now()}`,
      accountId: 'acc-1205',
      accountCode: '1205',
      accountName: 'VAT Input Tax Recoverable',
      accountNameAr: 'عكس ضريبة المدخلات (مرتجع مشتريات)',
      debit: 0,
      credit: cleanTax,
      memo: `Input VAT reversal for ${params.purchaseReturn.returnNumber}`,
    });
  }

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced Purchase Return journal');
  }

  return {
    id: `je-prn-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: params.entryNumber,
    date: params.purchaseReturn.returnDate,
    referenceType: 'PURCHASE_RETURN',
    referenceId: params.purchaseReturn.id,
    description: `قيد مرتجع مشتريات / إشعار مدين (${params.purchaseReturn.returnNumber}) — المورد: ${params.purchaseReturn.supplierName}`,
    lines,
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };
}
