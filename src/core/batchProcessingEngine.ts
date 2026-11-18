import { Customer, Product } from '../types/erp';

export type BatchEntityType = 'INVENTORY' | 'CUSTOMERS';

export type BatchRowStatus = 'VALID_UPDATE' | 'UNCHANGED' | 'NOT_FOUND' | 'INVALID';

export interface BatchFieldDiff {
  field: string;
  labelAr: string;
  labelEn: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
}

export interface BatchParsedRow {
  rowIndex: number; // 1-based data row index
  lineNumber: number; // 1-based line number in CSV
  matchKey: string;
  displayName: string;
  status: BatchRowStatus;
  errorAr?: string;
  errorEn?: string;
  diffs: BatchFieldDiff[];
  rawValues: Record<string, string>;
  updatedProduct?: Product;
  updatedCustomer?: Customer;
}

export interface BatchParseResult {
  entityType: BatchEntityType;
  headers: string[];
  rows: BatchParsedRow[];
  totalRows: number;
  validUpdateCount: number;
  unchangedCount: number;
  errorCount: number;
  totalFieldChanges: number;
}

export interface BatchExecutionLog {
  id: string;
  entityType: BatchEntityType;
  timestamp: string;
  updatedCount: number;
  skippedCount: number;
  totalFieldChanges: number;
  actorName: string;
}

export const INVENTORY_BATCH_HEADERS = [
  'sku',
  'nameAr',
  'name',
  'costPrice',
  'salePrice',
  'stockQty',
  'reorderPoint',
  'barcode',
  'isActive',
] as const;

export const CUSTOMER_BATCH_HEADERS = [
  'id',
  'code',
  'nameAr',
  'name',
  'phone',
  'email',
  'creditLimit',
  'balance',
] as const;

export function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r\t]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function splitDelimitedLine(line: string, delimiter: ',' | '\t'): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((cell) => cell.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
  }
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function serializeInventoryToCsv(products: Product[], maxRows?: number): string {
  const headerLine = INVENTORY_BATCH_HEADERS.join(',');
  const slice = typeof maxRows === 'number' ? products.slice(0, maxRows) : products;
  const dataLines = slice.map((p) =>
    [
      p.sku,
      p.nameAr,
      p.name,
      p.costPrice,
      p.salePrice,
      p.stockQty,
      p.reorderPoint,
      p.barcode,
      p.isActive,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

export function serializeCustomersToCsv(customers: Customer[], maxRows?: number): string {
  const headerLine = CUSTOMER_BATCH_HEADERS.join(',');
  const slice = typeof maxRows === 'number' ? customers.slice(0, maxRows) : customers;
  const dataLines = slice.map((c) =>
    [
      c.id,
      c.code || '',
      c.nameAr,
      c.name,
      c.phone,
      c.email,
      c.creditLimit,
      c.balance,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

function normalizeHeaderKey(raw: string, entityType: BatchEntityType): string {
  const clean = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (entityType === 'INVENTORY') {
    if (clean === 'sku' || clean === 'code' || clean === 'كودالصنف' || clean === 'الكود') return 'sku';
    if (clean === 'namear' || clean === 'الاسمبالعربية' || clean === 'الاسم') return 'nameAr';
    if (clean === 'name' || clean === 'nameen' || clean === 'الاسمبالإنجليزية') return 'name';
    if (clean === 'costprice' || clean === 'cost' || clean === 'التكلفة' || clean === 'سعرالتكلفة') return 'costPrice';
    if (clean === 'saleprice' || clean === 'price' || clean === 'السعر' || clean === 'سعرالبيع') return 'salePrice';
    if (clean === 'stockqty' || clean === 'stock' || clean === 'qty' || clean === 'الكمية' || clean === 'المخزون') return 'stockQty';
    if (clean === 'reorderpoint' || clean === 'reorder' || clean === 'حدالطلب') return 'reorderPoint';
    if (clean === 'barcode' || clean === 'الباركود') return 'barcode';
    if (clean === 'isactive' || clean === 'active' || clean === 'نشط') return 'isActive';
    return raw.trim();
  }

  if (clean === 'id' || clean === 'customerid' || clean === 'معرفالعميل') return 'id';
  if (clean === 'code' || clean === 'customercode' || clean === 'الكود') return 'code';
  if (clean === 'namear' || clean === 'الاسمبالعربية' || clean === 'اسمالمعميل' || clean === 'اسمالعميل') return 'nameAr';
  if (clean === 'name' || clean === 'nameen' || clean === 'الاسمبالإنجليزية') return 'name';
  if (clean === 'phone' || clean === 'mobile' || clean === 'الهاتف' || clean === 'الجوال') return 'phone';
  if (clean === 'email' || clean === 'البريد') return 'email';
  if (clean === 'creditlimit' || clean === 'الحدالائتماني') return 'creditLimit';
  if (clean === 'balance' || clean === 'debt' || clean === 'الرصيد' || clean === 'المديونية') return 'balance';
  return raw.trim();
}

function parseOptionalNonNegativeNumber(
  raw: string | undefined,
  fieldLabel: string
): { provided: boolean; value?: number; errorAr?: string; errorEn?: string } {
  if (raw === undefined || raw.trim() === '') {
    return { provided: false };
  }
  const num = Number(raw.replace(/,/g, '').trim());
  if (!Number.isFinite(num)) {
    return {
      provided: true,
      errorAr: `قيمة رقمية غير صالحة في الحقل (${fieldLabel})`,
      errorEn: `Invalid numeric value for (${fieldLabel})`,
    };
  }
  if (num < 0) {
    return {
      provided: true,
      errorAr: `لا يسمح بقيمة سالبة في الحقل (${fieldLabel})`,
      errorEn: `Negative value not allowed for (${fieldLabel})`,
    };
  }
  return { provided: true, value: Math.round(num * 1000) / 1000 };
}

function parseOptionalBoolean(
  raw: string | undefined
): { provided: boolean; value?: boolean; errorAr?: string; errorEn?: string } {
  if (raw === undefined || raw.trim() === '') {
    return { provided: false };
  }
  const lower = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'نعم', 'نشط', 'active'].includes(lower)) {
    return { provided: true, value: true };
  }
  if (['false', '0', 'no', 'n', 'لا', 'موقف', 'inactive'].includes(lower)) {
    return { provided: true, value: false };
  }
  return {
    provided: true,
    errorAr: 'قيمة الحالة (isActive) يجب أن تكون true أو false',
    errorEn: 'isActive must be true or false',
  };
}

export function parseAndValidateBatchCsv(input: {
  rawCsv: string;
  entityType: BatchEntityType;
  products: Product[];
  customers: Customer[];
}): BatchParseResult {
  const { entityType, products, customers } = input;
  const rawLines = (input.rawCsv || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const nonEmptyEntries: Array<{ lineNumber: number; text: string }> = [];
  rawLines.forEach((line, idx) => {
    if (line.trim().length > 0) {
      nonEmptyEntries.push({ lineNumber: idx + 1, text: line });
    }
  });

  const defaultHeaders =
    entityType === 'INVENTORY' ? [...INVENTORY_BATCH_HEADERS] : [...CUSTOMER_BATCH_HEADERS];

  if (nonEmptyEntries.length === 0) {
    return {
      entityType,
      headers: defaultHeaders,
      rows: [],
      totalRows: 0,
      validUpdateCount: 0,
      unchangedCount: 0,
      errorCount: 0,
      totalFieldChanges: 0,
    };
  }

  const delimiter: ',' | '\t' = nonEmptyEntries[0].text.includes('\t') ? '\t' : ',';
  const firstCols = splitDelimitedLine(nonEmptyEntries[0].text, delimiter);
  const firstNormalized = firstCols.map((c) => normalizeHeaderKey(c, entityType));

  const headerKnownSet = new Set<string>(defaultHeaders);
  const hasHeaderRow = firstNormalized.some((h) => headerKnownSet.has(h));

  const headers = hasHeaderRow ? firstNormalized : defaultHeaders;
  const dataEntries = hasHeaderRow ? nonEmptyEntries.slice(1) : nonEmptyEntries;

  const seenKeys = new Set<string>();
  const rows: BatchParsedRow[] = [];

  dataEntries.forEach((entry, dataIdx) => {
    const lineDelimiter: ',' | '\t' = entry.text.includes('\t') ? '\t' : delimiter;
    const cols = splitDelimitedLine(entry.text, lineDelimiter);
    const rawValues: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      rawValues[h] = cols[colIdx] !== undefined ? cols[colIdx] : '';
    });

    if (entityType === 'INVENTORY') {
      const skuRaw = (rawValues.sku || '').trim();
      const barcodeRaw = (rawValues.barcode || '').trim();
      const matchKey = skuRaw || barcodeRaw;

      if (!matchKey) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey: '—',
          displayName: rawValues.nameAr || rawValues.name || '—',
          status: 'INVALID',
          errorAr: 'كود الصنف (SKU) أو الباركود مطلوب للمطابقة.',
          errorEn: 'SKU or Barcode is required to match inventory item.',
          diffs: [],
          rawValues,
        });
        return;
      }

      const dedupeKey = matchKey.toUpperCase();
      if (seenKeys.has(dedupeKey)) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey,
          displayName: rawValues.nameAr || rawValues.name || matchKey,
          status: 'INVALID',
          errorAr: `تعارض: الكود (${matchKey}) مكرر داخل نفس الدفعة.`,
          errorEn: `Duplicate key (${matchKey}) within the same batch.`,
          diffs: [],
          rawValues,
        });
        return;
      }
      seenKeys.add(dedupeKey);

      const matched = products.find(
        (p) =>
          (skuRaw && p.sku.trim().toUpperCase() === skuRaw.toUpperCase()) ||
          (barcodeRaw && p.barcode.trim() === barcodeRaw)
      );

      if (!matched) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey,
          displayName: rawValues.nameAr || rawValues.name || matchKey,
          status: 'NOT_FOUND',
          errorAr: `لم يتم العثور على صنف مطابق للكود (${matchKey}).`,
          errorEn: `No inventory item found matching (${matchKey}).`,
          diffs: [],
          rawValues,
        });
        return;
      }

      const costCheck = parseOptionalNonNegativeNumber(rawValues.costPrice, 'costPrice');
      if (costCheck.errorAr) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey: matched.sku,
          displayName: matched.nameAr || matched.name,
          status: 'INVALID',
          errorAr: costCheck.errorAr,
          errorEn: costCheck.errorEn,
          diffs: [],
          rawValues,
        });
        return;
      }

      const saleCheck = parseOptionalNonNegativeNumber(rawValues.salePrice, 'salePrice');
      if (saleCheck.errorAr) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey: matched.sku,
          displayName: matched.nameAr || matched.name,
          status: 'INVALID',
          errorAr: saleCheck.errorAr,
          errorEn: saleCheck.errorEn,
          diffs: [],
          rawValues,
        });
        return;
      }

      const stockCheck = parseOptionalNonNegativeNumber(rawValues.stockQty, 'stockQty');
      if (stockCheck.errorAr) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey: matched.sku,
          displayName: matched.nameAr || matched.name,
          status: 'INVALID',
          errorAr: stockCheck.errorAr,
          errorEn: stockCheck.errorEn,
          diffs: [],
          rawValues,
        });
        return;
      }

      const reorderCheck = parseOptionalNonNegativeNumber(rawValues.reorderPoint, 'reorderPoint');
      if (reorderCheck.errorAr) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey: matched.sku,
          displayName: matched.nameAr || matched.name,
          status: 'INVALID',
          errorAr: reorderCheck.errorAr,
          errorEn: reorderCheck.errorEn,
          diffs: [],
          rawValues,
        });
        return;
      }

      const activeCheck = parseOptionalBoolean(rawValues.isActive);
      if (activeCheck.errorAr) {
        rows.push({
          rowIndex: dataIdx + 1,
          lineNumber: entry.lineNumber,
          matchKey: matched.sku,
          displayName: matched.nameAr || matched.name,
          status: 'INVALID',
          errorAr: activeCheck.errorAr,
          errorEn: activeCheck.errorEn,
          diffs: [],
          rawValues,
        });
        return;
      }

      const nextNameAr = rawValues.nameAr?.trim() ? rawValues.nameAr.trim() : matched.nameAr;
      const nextName = rawValues.name?.trim() ? rawValues.name.trim() : matched.name;
      const nextCost = costCheck.provided ? (costCheck.value as number) : matched.costPrice;
      const nextSale = saleCheck.provided ? (saleCheck.value as number) : matched.salePrice;
      const nextStock = stockCheck.provided ? (stockCheck.value as number) : matched.stockQty;
      const nextReorder = reorderCheck.provided
        ? (reorderCheck.value as number)
        : matched.reorderPoint;
      const nextBarcode = barcodeRaw ? barcodeRaw : matched.barcode;
      const nextActive = activeCheck.provided ? (activeCheck.value as boolean) : matched.isActive;

      const diffs: BatchFieldDiff[] = [];
      if (nextNameAr !== matched.nameAr) {
        diffs.push({
          field: 'nameAr',
          labelAr: 'الاسم بالعربية',
          labelEn: 'Arabic Name',
          oldValue: matched.nameAr,
          newValue: nextNameAr,
        });
      }
      if (nextName !== matched.name) {
        diffs.push({
          field: 'name',
          labelAr: 'الاسم بالإنجليزية',
          labelEn: 'English Name',
          oldValue: matched.name,
          newValue: nextName,
        });
      }
      if (nextCost !== matched.costPrice) {
        diffs.push({
          field: 'costPrice',
          labelAr: 'سعر التكلفة',
          labelEn: 'Cost Price',
          oldValue: matched.costPrice,
          newValue: nextCost,
        });
      }
      if (nextSale !== matched.salePrice) {
        diffs.push({
          field: 'salePrice',
          labelAr: 'سعر البيع',
          labelEn: 'Sale Price',
          oldValue: matched.salePrice,
          newValue: nextSale,
        });
      }
      if (nextStock !== matched.stockQty) {
        diffs.push({
          field: 'stockQty',
          labelAr: 'المخزون',
          labelEn: 'Stock Qty',
          oldValue: matched.stockQty,
          newValue: nextStock,
        });
      }
      if (nextReorder !== matched.reorderPoint) {
        diffs.push({
          field: 'reorderPoint',
          labelAr: 'حد إعادة الطلب',
          labelEn: 'Reorder Point',
          oldValue: matched.reorderPoint,
          newValue: nextReorder,
        });
      }
      if (nextBarcode !== matched.barcode) {
        diffs.push({
          field: 'barcode',
          labelAr: 'الباركود',
          labelEn: 'Barcode',
          oldValue: matched.barcode,
          newValue: nextBarcode,
        });
      }
      if (nextActive !== matched.isActive) {
        diffs.push({
          field: 'isActive',
          labelAr: 'الحالة',
          labelEn: 'Active',
          oldValue: matched.isActive,
          newValue: nextActive,
        });
      }

      const updatedProduct: Product = {
        ...matched,
        nameAr: nextNameAr,
        name: nextName,
        costPrice: nextCost,
        salePrice: nextSale,
        stockQty: nextStock,
        reorderPoint: nextReorder,
        barcode: nextBarcode,
        isActive: nextActive,
      };

      rows.push({
        rowIndex: dataIdx + 1,
        lineNumber: entry.lineNumber,
        matchKey: matched.sku,
        displayName: nextNameAr || nextName,
        status: diffs.length > 0 ? 'VALID_UPDATE' : 'UNCHANGED',
        diffs,
        rawValues,
        updatedProduct,
      });
      return;
    }

    // CUSTOMERS
    const idRaw = (rawValues.id || '').trim();
    const codeRaw = (rawValues.code || '').trim();
    const phoneRaw = (rawValues.phone || '').trim();
    const matchKey = idRaw || codeRaw || phoneRaw;

    if (!matchKey) {
      rows.push({
        rowIndex: dataIdx + 1,
        lineNumber: entry.lineNumber,
        matchKey: '—',
        displayName: rawValues.nameAr || rawValues.name || '—',
        status: 'INVALID',
        errorAr: 'معرف العميل (id) أو الكود (code) أو رقم الهاتف مطلوب للمطابقة.',
        errorEn: 'Customer id, code, or phone is required for matching.',
        diffs: [],
        rawValues,
      });
      return;
    }

    const matchedCustomer = customers.find(
      (c) =>
        (idRaw && c.id === idRaw) ||
        (codeRaw && c.code && c.code.trim().toUpperCase() === codeRaw.toUpperCase()) ||
        (!idRaw && !codeRaw && phoneRaw && c.phone.trim() === phoneRaw)
    );

    const dedupeCustomerKey = matchedCustomer ? matchedCustomer.id : matchKey.toUpperCase();
    if (seenKeys.has(dedupeCustomerKey)) {
      rows.push({
        rowIndex: dataIdx + 1,
        lineNumber: entry.lineNumber,
        matchKey,
        displayName: rawValues.nameAr || rawValues.name || matchKey,
        status: 'INVALID',
        errorAr: `تعارض: العميل (${matchKey}) مكرر داخل نفس الدفعة.`,
        errorEn: `Duplicate customer (${matchKey}) within the same batch.`,
        diffs: [],
        rawValues,
      });
      return;
    }
    seenKeys.add(dedupeCustomerKey);

    if (!matchedCustomer) {
      rows.push({
        rowIndex: dataIdx + 1,
        lineNumber: entry.lineNumber,
        matchKey,
        displayName: rawValues.nameAr || rawValues.name || matchKey,
        status: 'NOT_FOUND',
        errorAr: `لم يتم العثور على عميل مطابق لـ (${matchKey}).`,
        errorEn: `No customer found matching (${matchKey}).`,
        diffs: [],
        rawValues,
      });
      return;
    }

    const emailRaw = rawValues.email?.trim() || '';
    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      rows.push({
        rowIndex: dataIdx + 1,
        lineNumber: entry.lineNumber,
        matchKey: matchedCustomer.id,
        displayName: matchedCustomer.nameAr || matchedCustomer.name,
        status: 'INVALID',
        errorAr: `صيغة البريد الإلكتروني غير صالحة (${emailRaw}).`,
        errorEn: `Invalid email format (${emailRaw}).`,
        diffs: [],
        rawValues,
      });
      return;
    }

    const creditCheck = parseOptionalNonNegativeNumber(rawValues.creditLimit, 'creditLimit');
    if (creditCheck.errorAr) {
      rows.push({
        rowIndex: dataIdx + 1,
        lineNumber: entry.lineNumber,
        matchKey: matchedCustomer.id,
        displayName: matchedCustomer.nameAr || matchedCustomer.name,
        status: 'INVALID',
        errorAr: creditCheck.errorAr,
        errorEn: creditCheck.errorEn,
        diffs: [],
        rawValues,
      });
      return;
    }

    const balanceCheck = parseOptionalNonNegativeNumber(rawValues.balance, 'balance');
    if (balanceCheck.errorAr) {
      rows.push({
        rowIndex: dataIdx + 1,
        lineNumber: entry.lineNumber,
        matchKey: matchedCustomer.id,
        displayName: matchedCustomer.nameAr || matchedCustomer.name,
        status: 'INVALID',
        errorAr: balanceCheck.errorAr,
        errorEn: balanceCheck.errorEn,
        diffs: [],
        rawValues,
      });
      return;
    }

    const nextCode = codeRaw ? codeRaw : matchedCustomer.code;
    const nextNameAr = rawValues.nameAr?.trim() ? rawValues.nameAr.trim() : matchedCustomer.nameAr;
    const nextName = rawValues.name?.trim() ? rawValues.name.trim() : matchedCustomer.name;
    const nextPhone = phoneRaw ? phoneRaw : matchedCustomer.phone;
    const nextEmail = emailRaw ? emailRaw : matchedCustomer.email;
    const nextCreditLimit = creditCheck.provided
      ? (creditCheck.value as number)
      : matchedCustomer.creditLimit;
    const nextBalance = balanceCheck.provided
      ? (balanceCheck.value as number)
      : matchedCustomer.balance;

    const diffs: BatchFieldDiff[] = [];
    if (nextCode !== matchedCustomer.code) {
      diffs.push({
        field: 'code',
        labelAr: 'كود العميل',
        labelEn: 'Customer Code',
        oldValue: matchedCustomer.code || '',
        newValue: nextCode || '',
      });
    }
    if (nextNameAr !== matchedCustomer.nameAr) {
      diffs.push({
        field: 'nameAr',
        labelAr: 'الاسم بالعربية',
        labelEn: 'Arabic Name',
        oldValue: matchedCustomer.nameAr,
        newValue: nextNameAr,
      });
    }
    if (nextName !== matchedCustomer.name) {
      diffs.push({
        field: 'name',
        labelAr: 'الاسم بالإنجليزية',
        labelEn: 'English Name',
        oldValue: matchedCustomer.name,
        newValue: nextName,
      });
    }
    if (nextPhone !== matchedCustomer.phone) {
      diffs.push({
        field: 'phone',
        labelAr: 'الهاتف',
        labelEn: 'Phone',
        oldValue: matchedCustomer.phone,
        newValue: nextPhone,
      });
    }
    if (nextEmail !== matchedCustomer.email) {
      diffs.push({
        field: 'email',
        labelAr: 'البريد الإلكتروني',
        labelEn: 'Email',
        oldValue: matchedCustomer.email,
        newValue: nextEmail,
      });
    }
    if (nextCreditLimit !== matchedCustomer.creditLimit) {
      diffs.push({
        field: 'creditLimit',
        labelAr: 'الحد الائتماني',
        labelEn: 'Credit Limit',
        oldValue: matchedCustomer.creditLimit,
        newValue: nextCreditLimit,
      });
    }
    if (nextBalance !== matchedCustomer.balance) {
      diffs.push({
        field: 'balance',
        labelAr: 'الرصيد / المديونية',
        labelEn: 'Balance / Debt',
        oldValue: matchedCustomer.balance,
        newValue: nextBalance,
      });
    }

    const updatedCustomer: Customer = {
      ...matchedCustomer,
      code: nextCode,
      nameAr: nextNameAr,
      name: nextName,
      phone: nextPhone,
      email: nextEmail,
      creditLimit: nextCreditLimit,
      balance: nextBalance,
    };

    rows.push({
      rowIndex: dataIdx + 1,
      lineNumber: entry.lineNumber,
      matchKey: matchedCustomer.id,
      displayName: nextNameAr || nextName,
      status: diffs.length > 0 ? 'VALID_UPDATE' : 'UNCHANGED',
      diffs,
      rawValues,
      updatedCustomer,
    });
  });

  const validUpdateCount = rows.filter((r) => r.status === 'VALID_UPDATE').length;
  const unchangedCount = rows.filter((r) => r.status === 'UNCHANGED').length;
  const errorCount = rows.filter((r) => r.status === 'INVALID' || r.status === 'NOT_FOUND').length;
  const totalFieldChanges = rows.reduce((sum, r) => sum + r.diffs.length, 0);

  return {
    entityType,
    headers,
    rows,
    totalRows: rows.length,
    validUpdateCount,
    unchangedCount,
    errorCount,
    totalFieldChanges,
  };
}

export function applyInventoryBatchUpdates(
  currentProducts: Product[],
  parsed: BatchParseResult
): {
  nextProducts: Product[];
  updatedCount: number;
  skippedCount: number;
  totalFieldChanges: number;
} {
  const updatesById = new Map<string, Product>();
  let totalFieldChanges = 0;
  for (const row of parsed.rows) {
    if (row.status === 'VALID_UPDATE' && row.updatedProduct) {
      updatesById.set(row.updatedProduct.id, row.updatedProduct);
      totalFieldChanges += row.diffs.length;
    }
  }
  const nextProducts = currentProducts.map((p) => updatesById.get(p.id) || p);
  return {
    nextProducts,
    updatedCount: updatesById.size,
    skippedCount: parsed.totalRows - updatesById.size,
    totalFieldChanges,
  };
}

export function applyCustomerBatchUpdates(
  currentCustomers: Customer[],
  parsed: BatchParseResult
): {
  nextCustomers: Customer[];
  updatedCount: number;
  skippedCount: number;
  totalFieldChanges: number;
} {
  const updatesById = new Map<string, Customer>();
  let totalFieldChanges = 0;
  for (const row of parsed.rows) {
    if (row.status === 'VALID_UPDATE' && row.updatedCustomer) {
      updatesById.set(row.updatedCustomer.id, row.updatedCustomer);
      totalFieldChanges += row.diffs.length;
    }
  }
  const nextCustomers = currentCustomers.map((c) => updatesById.get(c.id) || c);
  return {
    nextCustomers,
    updatedCount: updatesById.size,
    skippedCount: parsed.totalRows - updatesById.size,
    totalFieldChanges,
  };
}

export function updateCsvCellValue(input: {
  rawCsv: string;
  entityType: BatchEntityType;
  lineNumber: number;
  columnKey: string;
  newValue: string;
}): string {
  const lines = (input.rawCsv || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const targetIdx = input.lineNumber - 1;
  if (targetIdx < 0 || targetIdx >= lines.length) return input.rawCsv;

  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
  const defaultHeaders =
    input.entityType === 'INVENTORY' ? [...INVENTORY_BATCH_HEADERS] : [...CUSTOMER_BATCH_HEADERS];
  const headerDelim: ',' | '\t' = firstNonEmpty.includes('\t') ? '\t' : ',';
  const firstCols = splitDelimitedLine(firstNonEmpty, headerDelim).map((c) =>
    normalizeHeaderKey(c, input.entityType)
  );
  const headerKnownSet = new Set<string>(defaultHeaders);
  const headers = firstCols.some((h) => headerKnownSet.has(h)) ? firstCols : defaultHeaders;

  const colIndex = headers.indexOf(input.columnKey);
  if (colIndex < 0) return input.rawCsv;

  const rowLine = lines[targetIdx];
  const rowDelim: ',' | '\t' = rowLine.includes('\t') ? '\t' : ',';
  const cells = splitDelimitedLine(rowLine, rowDelim);
  while (cells.length < headers.length) cells.push('');
  cells[colIndex] = input.newValue;

  lines[targetIdx] =
    rowDelim === '\t' ? cells.join('\t') : cells.map((cell) => escapeCsvCell(cell)).join(',');
  return lines.join('\n');
}
