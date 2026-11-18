import {
  ChartAccount,
  Company,
  JournalEntry,
  SalesInvoice,
} from '../types/erp';

export type AccountingPdfTemplateId =
  | 'CORPORATE_STANDARD'
  | 'MODERN_EXECUTIVE'
  | 'MINIMAL_AUDIT'
  | 'ZATCA_TAX_COMPLIANT'
  | 'ROYAL_LEDGER';

export type AccountingPdfDocumentType =
  | 'SALES_INVOICE'
  | 'TRIAL_BALANCE'
  | 'INCOME_STATEMENT'
  | 'BALANCE_SHEET'
  | 'JOURNAL_VOUCHER';

export interface AccountingPdfBrandingOptions {
  templateId: AccountingPdfTemplateId;
  primaryColor: string;
  accentColor: string;
  showLogo: boolean;
  customLogoDataUrl?: string;
  companyNameOverride?: string;
  taxNumberOverride?: string;
  headerNote?: string;
  bodyTermsNote?: string;
  bankDetailsNote?: string;
  footerNote?: string;
  watermarkText?: string;
  includeSignatureBlock: boolean;
  includeQrCode: boolean;
  paperSize: 'A4' | 'LETTER';
  language: 'ar' | 'en';
}

export interface AccountingPdfReportRow {
  code: string;
  nameAr: string;
  nameEn: string;
  debit: number;
  credit: number;
  balance: number;
  category?: string;
}

export interface AccountingPdfGenerationInput {
  documentType: AccountingPdfDocumentType;
  companyInfo: Company;
  currency: string;
  branding: AccountingPdfBrandingOptions;
  invoice?: SalesInvoice | null;
  journalEntry?: JournalEntry | null;
  accounts?: ChartAccount[];
  reportPeriodLabel?: string;
  versionNumber?: number;
}

export interface GeneratedAccountingPdfDocument {
  id: string;
  documentType: AccountingPdfDocumentType;
  templateId: AccountingPdfTemplateId;
  titleAr: string;
  titleEn: string;
  referenceNumber: string;
  generatedAtIso: string;
  versionNumber: number;
  totalAmount: number;
  htmlContent: string;
}

// ============================================================================
// Document Versioning System Types & Pure Functions
// ============================================================================

export interface AccountingDocumentVersionPayload {
  documentType: AccountingPdfDocumentType;
  referenceId: string;
  referenceNumber: string;
  customerOrTitle: string;
  date: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  notes: string;
  brandingTemplateId: AccountingPdfTemplateId;
  lineItemsSummary: Array<{
    code: string;
    label: string;
    qtyOrDebit: number;
    priceOrCredit: number;
    total: number;
  }>;
  rawSnapshot?: Record<string, unknown>;
}

export interface AccountingDocumentVersion {
  versionId: string;
  documentId: string;
  documentType: AccountingPdfDocumentType;
  versionNumber: number;
  createdAtIso: string;
  createdBy: string;
  changeReason: string;
  payload: AccountingDocumentVersionPayload;
  checksum: string;
}

export interface DocumentVersionFieldDiff {
  fieldKey: string;
  labelAr: string;
  labelEn: string;
  previousValue: string | number;
  currentValue: string | number;
  changed: boolean;
  deltaNumeric?: number;
}

export interface DocumentVersionComparisonResult {
  baseVersion: AccountingDocumentVersion;
  targetVersion: AccountingDocumentVersion;
  hasDifferences: boolean;
  changedFieldsCount: number;
  totalAmountDelta: number;
  lineCountDelta: number;
  fieldDiffs: DocumentVersionFieldDiff[];
  lineDiffs: Array<{
    code: string;
    label: string;
    baseTotal: number;
    targetTotal: number;
    delta: number;
    status: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED';
  }>;
}

export const ACCOUNTING_PDF_TEMPLATES: Array<{
  id: AccountingPdfTemplateId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  defaultPrimary: string;
  defaultAccent: string;
}> = [
  {
    id: 'CORPORATE_STANDARD',
    nameAr: 'القالب المؤسسي المعتمد (Corporate Standard)',
    nameEn: 'Corporate Standard',
    descriptionAr: 'تصميم رسمي متوازن للفواتير الضريبية والتقارير الختامية مع ترويسة كاملة.',
    descriptionEn: 'Balanced corporate layout for tax invoices and financial statements.',
    defaultPrimary: '#1e3a8a',
    defaultAccent: '#2563eb',
  },
  {
    id: 'MODERN_EXECUTIVE',
    nameAr: 'القالب التنفيذي الحديث (Modern Executive)',
    nameEn: 'Modern Executive',
    descriptionAr: 'تصميم عصري عالي التباين مع شريط جانبي ملون وملخصات مالية بارزة.',
    descriptionEn: 'High-contrast executive layout with accent header bar and KPI callouts.',
    defaultPrimary: '#0f172a',
    defaultAccent: '#0d9488',
  },
  {
    id: 'MINIMAL_AUDIT',
    nameAr: 'قالب التدقيق المحاسبي (Minimal Audit)',
    nameEn: 'Minimal Audit',
    descriptionAr: 'تصميم نظيف مخصص للمراجعين القانونيين وميزان المراجعة بدون زخارف زائدة.',
    descriptionEn: 'Clean, ink-saving audit layout ideal for statutory review and ledgers.',
    defaultPrimary: '#18181b',
    defaultAccent: '#52525b',
  },
  {
    id: 'ZATCA_TAX_COMPLIANT',
    nameAr: 'القالب الضريبي المعتمد (ZATCA / Tax Authority)',
    nameEn: 'Tax Authority Compliant',
    descriptionAr: 'متوافق مع متطلبات الفوترة الإلكترونية مع إبراز الرقم الضريبي ورمز الاستجابة السريعة.',
    descriptionEn: 'E-invoicing compliant layout highlighting VAT registration and QR seal.',
    defaultPrimary: '#064e3b',
    defaultAccent: '#059669',
  },
  {
    id: 'ROYAL_LEDGER',
    nameAr: 'السجل المالي الفاخر (Royal Ledger)',
    nameEn: 'Royal Ledger',
    descriptionAr: 'إطار كلاسيكي مزدوج مع ختم رسمي وتوقيعات معتمدة للتقارير السنوية.',
    descriptionEn: 'Classic double-bordered ledger with official crest and signature blocks.',
    defaultPrimary: '#312e81',
    defaultAccent: '#d97706',
  },
];

function escapeHtml(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function computeSimpleChecksum(payload: AccountingDocumentVersionPayload): string {
  const raw = JSON.stringify({
    r: payload.referenceNumber,
    t: payload.grandTotal,
    s: payload.subtotal,
    x: payload.taxAmount,
    d: payload.discountAmount,
    n: payload.notes,
    b: payload.brandingTemplateId,
    l: payload.lineItemsSummary.length,
  });
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `VER-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Generates an inline SVG QR seal representing the document verification payload.
 */
export function buildDocumentVerificationQrSvg(
  sellerName: string,
  taxNumber: string,
  dateIso: string,
  totalAmount: number,
  taxAmount: number,
  color = '#0f172a'
): string {
  const seed = `${sellerName}|${taxNumber}|${dateIso}|${totalAmount.toFixed(2)}|${taxAmount.toFixed(2)}`;
  const size = 11;
  const cells: string[] = [];

  const isFinder = (r: number, c: number) =>
    (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3);

  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let active = false;
      if (isFinder(r, c)) {
        active = true;
      } else {
        const bitIdx = (r * size + c) % 31;
        active = (((h >>> bitIdx) ^ (r * 7 + c * 13)) & 1) === 1;
      }
      if (active) {
        cells.push(
          `<rect x="${c * 6 + 4}" y="${r * 6 + 4}" width="5" height="5" rx="1" fill="${escapeHtml(color)}" />`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 74 74" width="74" height="74" style="border:1px solid #cbd5e1;border-radius:8px;background:#ffffff;padding:2px;">${cells.join('')}</svg>`;
}

/**
 * Generates a complete, professionally styled printable PDF HTML document for Accounting
 * Invoices and Financial Reports using standard templates, branding, logos, and custom notes.
 */
export function generateAccountingPdfDocument(
  input: AccountingPdfGenerationInput
): GeneratedAccountingPdfDocument {
  const {
    documentType,
    companyInfo,
    currency,
    branding,
    invoice,
    journalEntry,
    accounts = [],
    reportPeriodLabel = new Date().toISOString().slice(0, 10),
    versionNumber = 1,
  } = input;

  const isAr = branding.language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const companyName =
    branding.companyNameOverride?.trim() ||
    companyInfo.nameAr ||
    companyInfo.name ||
    'RLM Enterprise ERP';
  const taxNumber = branding.taxNumberOverride?.trim() || companyInfo.taxNumber || '300000000000003';
  const primary = branding.primaryColor || '#1e3a8a';
  const accent = branding.accentColor || '#2563eb';
  const logoSrc = branding.customLogoDataUrl || companyInfo.logo || companyInfo.logoUrl || '';

  let titleAr = 'فاتورة ضريبية معتمدة';
  let titleEn = 'Certified Tax Invoice';
  let referenceNumber = invoice?.invoiceNumber || `DOC-${Date.now().toString().slice(-6)}`;
  let totalAmount = 0;
  let bodyTableHtml = '';
  let summaryBlockHtml = '';

  if (documentType === 'SALES_INVOICE') {
    const inv = invoice || {
      id: 'inv-preview',
      tenantId: 'ten-1',
      customerId: 'c1',
      branchId: 'b1',
      invoiceNumber: 'INV-2025-001',
      date: reportPeriodLabel,
      customerName: isAr ? 'شركة الآفاق للتجارة والمقاولات' : 'Al-Afaq Trading Co.',
      items: [
        {
          productId: 'p1',
          sku: 'SKU-1001',
          productName: isAr ? 'خادم سحابي للمؤسسات' : 'Enterprise Cloud Server',
          quantity: 2,
          unitPrice: 4500,
          discount: 0,
          taxRate: 15,
          taxAmount: 1350,
          total: 10350,
        },
      ],
      subtotal: 9000,
      discountAmount: 0,
      taxAmount: 1350,
      grandTotal: 10350,
      paidAmount: 10350,
      paymentMethod: 'CASH' as const,
      status: 'PAID' as const,
    };

    titleAr = 'فاتورة مبيعات ضريبية';
    titleEn = 'Tax Sales Invoice';
    referenceNumber = inv.invoiceNumber;
    totalAmount = Number(inv.grandTotal) || 0;

    const rowsHtml = (inv.items || [])
      .map(
        (item, idx) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;">${idx + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;">${escapeHtml(item.sku || '-')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(item.productName)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;text-align:center;">${Number(item.quantity).toLocaleString()}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;text-align:end;">${Number(item.unitPrice).toLocaleString()} ${escapeHtml(currency)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;text-align:end;">${Number(item.taxAmount || 0).toLocaleString()} ${escapeHtml(currency)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;text-align:end;">${Number(item.total).toLocaleString()} ${escapeHtml(currency)}</td>
        </tr>`
      )
      .join('');

    bodyTableHtml = `
      <div style="display:flex;justify-content:space-between;gap:16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:18px;font-size:13px;">
        <div>
          <div style="color:#64748b;font-size:11px;">${isAr ? 'العميل / الجهة المستفيدة' : 'Billed To Customer'}</div>
          <div style="font-weight:700;color:#0f172a;font-size:15px;margin-top:2px;">${escapeHtml(inv.customerName)}</div>
          <div style="color:#475569;font-size:12px;margin-top:2px;">${isAr ? 'طريقة الدفع:' : 'Payment Method:'} ${escapeHtml(inv.paymentMethod)}</div>
        </div>
        <div style="text-align:${isAr ? 'left' : 'right'};">
          <div style="color:#64748b;font-size:11px;">${isAr ? 'رقم الفاتورة' : 'Invoice Number'}</div>
          <div style="font-weight:800;font-family:monospace;color:${escapeHtml(primary)};font-size:16px;">${escapeHtml(inv.invoiceNumber)}</div>
          <div style="color:#475569;font-size:12px;margin-top:2px;">${isAr ? 'تاريخ الإصدار:' : 'Issue Date:'} ${escapeHtml(String(inv.date).slice(0, 10))}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="background:${escapeHtml(primary)};color:#ffffff;">
            <th style="padding:10px 12px;text-align:start;">#</th>
            <th style="padding:10px 12px;text-align:start;">SKU</th>
            <th style="padding:10px 12px;text-align:start;">${isAr ? 'البيان / الصنف' : 'Description'}</th>
            <th style="padding:10px 12px;text-align:center;">${isAr ? 'الكمية' : 'Qty'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'الضريبة' : 'Tax'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'الإجمالي' : 'Line Total'}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    summaryBlockHtml = `
      <div style="margin-top:18px;display:flex;justify-content:flex-end;">
        <div style="width:320px;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#ffffff;">
          <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px;">
            <span style="color:#64748b;">${isAr ? 'المجموع قبل الضريبة' : 'Subtotal'}</span>
            <strong style="font-family:monospace;">${Number(inv.subtotal).toLocaleString()} ${escapeHtml(currency)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px;">
            <span style="color:#64748b;">${isAr ? 'إجمالي الخصم' : 'Total Discount'}</span>
            <strong style="font-family:monospace;">${Number(inv.discountAmount || 0).toLocaleString()} ${escapeHtml(currency)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12.5px;">
            <span style="color:#64748b;">${isAr ? 'ضريبة القيمة المضافة' : 'VAT Amount'}</span>
            <strong style="font-family:monospace;">${Number(inv.taxAmount || 0).toLocaleString()} ${escapeHtml(currency)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 14px;background:${escapeHtml(primary)};color:#ffffff;font-size:14px;">
            <span style="font-weight:700;">${isAr ? 'الصافي النهائي المستحق' : 'Grand Total'}</span>
            <strong style="font-family:monospace;font-size:15px;">${Number(inv.grandTotal).toLocaleString()} ${escapeHtml(currency)}</strong>
          </div>
        </div>
      </div>
    `;
  } else if (documentType === 'JOURNAL_VOUCHER' && journalEntry) {
    titleAr = 'سند قيد يومية محاسبي';
    titleEn = 'Journal Entry Voucher';
    referenceNumber = journalEntry.entryNumber;
    const totalDebit = (journalEntry.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = (journalEntry.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
    totalAmount = totalDebit;

    const linesHtml = (journalEntry.lines || [])
      .map(
        (l, idx) => `
        <tr>
          <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;">${idx + 1}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;">${escapeHtml(l.accountCode || l.accountId)}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(l.accountNameAr || l.accountName || l.memo || '-')}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;text-align:end;color:#059669;font-weight:700;">${Number(l.debit || 0).toLocaleString()}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;text-align:end;color:#2563eb;font-weight:700;">${Number(l.credit || 0).toLocaleString()}</td>
        </tr>`
      )
      .join('');

    bodyTableHtml = `
      <div style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:16px;font-size:13px;">
        <strong>${isAr ? 'بيان القيد:' : 'Memo:'}</strong> ${escapeHtml(journalEntry.description)}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="background:${escapeHtml(primary)};color:#ffffff;">
            <th style="padding:10px 12px;text-align:start;">#</th>
            <th style="padding:10px 12px;text-align:start;">${isAr ? 'كود الحساب' : 'Account'}</th>
            <th style="padding:10px 12px;text-align:start;">${isAr ? 'اسم الحساب / البيان' : 'Account Name'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'مدين (Debit)' : 'Debit'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'دائن (Credit)' : 'Credit'}</th>
          </tr>
        </thead>
        <tbody>${linesHtml}</tbody>
        <tfoot>
          <tr style="background:#f1f5f9;font-weight:800;">
            <td colspan="3" style="padding:10px 12px;">${isAr ? 'إجمالي القيد المتوازن' : 'Balanced Voucher Totals'}</td>
            <td style="padding:10px 12px;text-align:end;font-family:monospace;">${totalDebit.toLocaleString()} ${escapeHtml(currency)}</td>
            <td style="padding:10px 12px;text-align:end;font-family:monospace;">${totalCredit.toLocaleString()} ${escapeHtml(currency)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  } else {
    // Financial Statements: TRIAL_BALANCE, INCOME_STATEMENT, BALANCE_SHEET
    if (documentType === 'TRIAL_BALANCE') {
      titleAr = 'تقرير ميزان المراجعة العام';
      titleEn = 'General Trial Balance Report';
      referenceNumber = `TB-${reportPeriodLabel}`;
    } else if (documentType === 'INCOME_STATEMENT') {
      titleAr = 'قائمة الدخل والأرباح والخسائر';
      titleEn = 'Income Statement (Profit & Loss)';
      referenceNumber = `IS-${reportPeriodLabel}`;
    } else {
      titleAr = 'قائمة المركز المالي (الميزانية العمومية)';
      titleEn = 'Statement of Financial Position (Balance Sheet)';
      referenceNumber = `BS-${reportPeriodLabel}`;
    }

    const filteredAccounts = accounts.filter((acc) => {
      if (documentType === 'INCOME_STATEMENT') {
        return acc.type === 'REVENUE' || acc.type === 'EXPENSE';
      }
      if (documentType === 'BALANCE_SHEET') {
        return acc.type === 'ASSET' || acc.type === 'LIABILITY' || acc.type === 'EQUITY';
      }
      return true;
    });

    const displayAccounts =
      filteredAccounts.length > 0
        ? filteredAccounts
        : [
            {
              id: '1101',
              tenantId: 'ten-1',
              code: '1101',
              nameAr: 'النقدية بالصندوق والبنوك',
              name: 'Cash and Banks',
              type: 'ASSET' as const,
              level: 2,
              balance: 185000,
              isDebitNormal: true,
              isActive: true,
            },
            {
              id: '4101',
              tenantId: 'ten-1',
              code: '4101',
              nameAr: 'إيرادات المبيعات التشغيلية',
              name: 'Operating Sales Revenue',
              type: 'REVENUE' as const,
              level: 2,
              balance: 310000,
              isDebitNormal: false,
              isActive: true,
            },
          ];

    totalAmount = displayAccounts.reduce((sum, a) => sum + Math.abs(Number(a.balance) || 0), 0);

    const accRowsHtml = displayAccounts
      .map((acc) => {
        const bal = Number(acc.balance) || 0;
        const isDebitNature = acc.type === 'ASSET' || acc.type === 'EXPENSE';
        const debitVal = isDebitNature ? Math.max(0, bal) : Math.max(0, -bal);
        const creditVal = !isDebitNature ? Math.max(0, bal) : Math.max(0, -bal);
        return `
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;">${escapeHtml(acc.code)}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(isAr ? acc.nameAr : acc.name || acc.nameAr)}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#475569;">${escapeHtml(acc.type)}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;text-align:end;">${debitVal.toLocaleString()}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;text-align:end;">${creditVal.toLocaleString()}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;text-align:end;">${bal.toLocaleString()} ${escapeHtml(currency)}</td>
          </tr>`;
      })
      .join('');

    bodyTableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="background:${escapeHtml(primary)};color:#ffffff;">
            <th style="padding:10px 12px;text-align:start;">${isAr ? 'رقم الحساب' : 'Code'}</th>
            <th style="padding:10px 12px;text-align:start;">${isAr ? 'اسم الحساب المالي' : 'Account Title'}</th>
            <th style="padding:10px 12px;text-align:start;">${isAr ? 'التصنيف' : 'Category'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'مدين' : 'Debit'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'دائن' : 'Credit'}</th>
            <th style="padding:10px 12px;text-align:end;">${isAr ? 'الرصيد الصافي' : 'Net Balance'}</th>
          </tr>
        </thead>
        <tbody>${accRowsHtml}</tbody>
      </table>
    `;
  }

  const qrSvg = branding.includeQrCode
    ? buildDocumentVerificationQrSvg(
        companyName,
        taxNumber,
        reportPeriodLabel,
        totalAmount,
        totalAmount * 0.15,
        primary
      )
    : '';

  const logoHtml =
    branding.showLogo && logoSrc
      ? `<img src="${escapeHtml(logoSrc)}" alt="Company Logo" style="max-height:58px;max-width:150px;object-fit:contain;border-radius:8px;" />`
      : branding.showLogo
      ? `<div style="width:54px;height:54px;border-radius:12px;background:${escapeHtml(primary)};color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;letter-spacing:1px;">RLM</div>`
      : '';

  const customNotesHtml = `
    <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${
        branding.bodyTermsNote
          ? `<div style="padding:12px;border-radius:8px;background:#f8fafc;border-inline-start:4px solid ${escapeHtml(primary)};font-size:12px;">
              <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${isAr ? 'الشروط والملاحظات التعاقدية' : 'Terms & Conditions'}</div>
              <div style="color:#475569;line-height:1.5;">${escapeHtml(branding.bodyTermsNote)}</div>
            </div>`
          : ''
      }
      ${
        branding.bankDetailsNote
          ? `<div style="padding:12px;border-radius:8px;background:#f8fafc;border-inline-start:4px solid ${escapeHtml(accent)};font-size:12px;">
              <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${isAr ? 'بيانات الحساب البنكي للسداد' : 'Bank Remittance Details'}</div>
              <div style="color:#475569;line-height:1.5;font-family:monospace;">${escapeHtml(branding.bankDetailsNote)}</div>
            </div>`
          : ''
      }
    </div>
  `;

  const signatureHtml = branding.includeSignatureBlock
    ? `
      <div style="margin-top:28px;padding-top:16px;border-top:1px dashed #cbd5e1;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#475569;">
        <div style="text-align:center;min-width:150px;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:28px;">${isAr ? 'إعداد المحاسب المختص' : 'Prepared By Accountant'}</div>
          <div style="border-top:1px solid #94a3b8;padding-top:4px;">${isAr ? 'التوقيع والتاريخ' : 'Signature & Date'}</div>
        </div>
        <div style="text-align:center;">
          <div style="display:inline-block;padding:6px 16px;border:2px double ${escapeHtml(accent)};border-radius:999px;color:${escapeHtml(accent)};font-weight:800;font-size:11px;letter-spacing:0.5px;">
            ${isAr ? 'معتمد رسمياً • CERTIFIED' : 'OFFICIAL CERTIFIED SEAL'}
          </div>
        </div>
        <div style="text-align:center;min-width:150px;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:28px;">${isAr ? 'اعتماد الإدارة المالية' : 'Financial Controller Approval'}</div>
          <div style="border-top:1px solid #94a3b8;padding-top:4px;">${isAr ? 'الختم الرسمي' : 'Authorized Stamp'}</div>
        </div>
      </div>
    `
    : '';

  const borderStyle =
    branding.templateId === 'ROYAL_LEDGER'
      ? `border:4px double ${escapeHtml(primary)};`
      : `border:1px solid #e2e8f0;`;

  const htmlContent = `<!DOCTYPE html>
<html lang="${branding.language}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(isAr ? titleAr : titleEn)} - ${escapeHtml(referenceNumber)}</title>
  <style>
    @page { size: ${branding.paperSize}; margin: 14mm; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .pdf-sheet {
      max-width: 820px;
      margin: 0 auto;
      padding: 28px;
      border-radius: 14px;
      position: relative;
      background: #ffffff;
      ${borderStyle}
    }
    .watermark {
      position: absolute;
      top: 46%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-24deg);
      font-size: 56px;
      font-weight: 900;
      color: rgba(15, 23, 42, 0.04);
      pointer-events: none;
      white-space: nowrap;
      user-select: none;
    }
  </style>
</head>
<body>
  <div class="pdf-sheet">
    ${branding.watermarkText ? `<div class="watermark">${escapeHtml(branding.watermarkText)}</div>` : ''}
    <!-- Header Banner -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:18px;border-bottom:3px solid ${escapeHtml(primary)};margin-bottom:18px;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${logoHtml}
        <div>
          <h1 style="margin:0;font-size:20px;color:${escapeHtml(primary)};font-weight:800;">${escapeHtml(companyName)}</h1>
          <div style="font-size:12px;color:#475569;margin-top:3px;">
            ${isAr ? 'الرقم الضريبي:' : 'Tax Registration:'} <strong style="font-family:monospace;">${escapeHtml(taxNumber)}</strong>
          </div>
          ${
            companyInfo.address
              ? `<div style="font-size:11.5px;color:#64748b;margin-top:2px;">${escapeHtml(companyInfo.address)} · ${escapeHtml(companyInfo.phone || '')}</div>`
              : ''
          }
          ${
            branding.headerNote
              ? `<div style="margin-top:6px;font-size:11.5px;color:${escapeHtml(accent)};font-weight:600;">${escapeHtml(branding.headerNote)}</div>`
              : ''
          }
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="text-align:${isAr ? 'left' : 'right'};">
          <div style="display:inline-block;padding:4px 10px;border-radius:6px;background:${escapeHtml(accent)};color:#ffffff;font-size:11px;font-weight:700;">
            ${escapeHtml(branding.templateId.replace(/_/g, ' '))} · v${versionNumber}
          </div>
          <h2 style="margin:6px 0 2px 0;font-size:17px;color:#0f172a;">${escapeHtml(isAr ? titleAr : titleEn)}</h2>
          <div style="font-size:11.5px;color:#64748b;font-family:monospace;">Ref: ${escapeHtml(referenceNumber)}</div>
        </div>
        ${qrSvg}
      </div>
    </div>

    ${bodyTableHtml}
    ${summaryBlockHtml}
    ${customNotesHtml}
    ${signatureHtml}

    <div style="margin-top:22px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
      <span>${escapeHtml(branding.footerNote || (isAr ? 'تم إصدار هذا المستند آلياً من نظام الإدارة المالية المتكامل ويعتبر معتمداً.' : 'Generated electronically by the Enterprise Accounting Engine.'))}</span>
      <span style="font-family:monospace;">v${versionNumber} · ${escapeHtml(reportPeriodLabel)}</span>
    </div>
  </div>
</body>
</html>`;

  return {
    id: `pdf-${documentType.toLowerCase()}-${Date.now()}`,
    documentType,
    templateId: branding.templateId,
    titleAr,
    titleEn,
    referenceNumber,
    generatedAtIso: new Date().toISOString(),
    versionNumber,
    totalAmount: Math.round(totalAmount * 100) / 100,
    htmlContent,
  };
}

/**
 * Downloads the generated PDF HTML document as a standalone printable file.
 */
export function downloadAccountingPdfHtmlSnapshot(doc: GeneratedAccountingPdfDocument): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([doc.htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.referenceNumber}-v${doc.versionNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Prints the generated PDF HTML inside a hidden iframe without using window.open.
 */
export function printAccountingPdfHtml(htmlContent: string): void {
  if (typeof document === 'undefined') return;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Ignore print cancellation in headless browsers
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 500);
      }
    }, 150);
  }
}

// ============================================================================
// Document Versioning System Implementation
// ============================================================================

/**
 * Creates an immutable version snapshot for an Accounting Invoice or Financial Report.
 */
export function createDocumentVersionSnapshot(params: {
  documentId: string;
  existingVersions: AccountingDocumentVersion[];
  payload: AccountingDocumentVersionPayload;
  createdBy: string;
  changeReason: string;
  nowIso?: string;
}): AccountingDocumentVersion {
  const {
    documentId,
    existingVersions,
    payload,
    createdBy,
    changeReason,
    nowIso = new Date().toISOString(),
  } = params;

  const docVersions = existingVersions.filter((v) => v.documentId === documentId);
  const nextVersionNumber =
    docVersions.length > 0
      ? Math.max(...docVersions.map((v) => v.versionNumber)) + 1
      : 1;

  const clonedPayload: AccountingDocumentVersionPayload = JSON.parse(JSON.stringify(payload));
  const checksum = computeSimpleChecksum(clonedPayload);

  return {
    versionId: `ver-${documentId}-v${nextVersionNumber}-${Date.now().toString().slice(-4)}`,
    documentId,
    documentType: clonedPayload.documentType,
    versionNumber: nextVersionNumber,
    createdAtIso: nowIso,
    createdBy: createdBy || 'System Accountant',
    changeReason: changeReason || `Version v${nextVersionNumber} snapshot`,
    payload: clonedPayload,
    checksum,
  };
}

/**
 * Compares two versions of an invoice or financial report and computes field-level
 * and line-item-level diffs.
 */
export function compareDocumentVersions(
  baseVersion: AccountingDocumentVersion,
  targetVersion: AccountingDocumentVersion
): DocumentVersionComparisonResult {
  const b = baseVersion.payload;
  const t = targetVersion.payload;

  const fieldSpecs: Array<{
    key: keyof AccountingDocumentVersionPayload;
    labelAr: string;
    labelEn: string;
    numeric?: boolean;
  }> = [
    { key: 'referenceNumber', labelAr: 'الرقم المرجعي', labelEn: 'Reference Number' },
    { key: 'customerOrTitle', labelAr: 'العميل / عنوان التقرير', labelEn: 'Customer / Title' },
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Document Date' },
    { key: 'status', labelAr: 'الحالة المحاسبية', labelEn: 'Status' },
    { key: 'subtotal', labelAr: 'المجموع الفرعي', labelEn: 'Subtotal', numeric: true },
    { key: 'discountAmount', labelAr: 'الخصم', labelEn: 'Discount', numeric: true },
    { key: 'taxAmount', labelAr: 'الضريبة (VAT)', labelEn: 'Tax Amount', numeric: true },
    { key: 'grandTotal', labelAr: 'الإجمالي النهائي', labelEn: 'Grand Total', numeric: true },
    { key: 'brandingTemplateId', labelAr: 'قالب الطباعة', labelEn: 'PDF Template' },
    { key: 'notes', labelAr: 'الملاحظات والشروط', labelEn: 'Notes & Terms' },
  ];

  const fieldDiffs: DocumentVersionFieldDiff[] = fieldSpecs.map((spec) => {
    const prevVal = (b[spec.key] as string | number) ?? '';
    const currVal = (t[spec.key] as string | number) ?? '';
    const changed = String(prevVal) !== String(currVal);
    const deltaNumeric = spec.numeric
      ? Math.round(((Number(currVal) || 0) - (Number(prevVal) || 0)) * 100) / 100
      : undefined;

    return {
      fieldKey: String(spec.key),
      labelAr: spec.labelAr,
      labelEn: spec.labelEn,
      previousValue: prevVal,
      currentValue: currVal,
      changed,
      deltaNumeric,
    };
  });

  const baseLinesMap = new Map<string, AccountingDocumentVersionPayload['lineItemsSummary'][0]>();
  for (const item of b.lineItemsSummary || []) {
    baseLinesMap.set(`${item.code}::${item.label}`, item);
  }

  const targetLinesMap = new Map<string, AccountingDocumentVersionPayload['lineItemsSummary'][0]>();
  for (const item of t.lineItemsSummary || []) {
    targetLinesMap.set(`${item.code}::${item.label}`, item);
  }

  const allKeys = Array.from(
    new Set([...Array.from(baseLinesMap.keys()), ...Array.from(targetLinesMap.keys())])
  );

  const lineDiffs = allKeys.map((key) => {
    const bLine = baseLinesMap.get(key);
    const tLine = targetLinesMap.get(key);
    const baseTotal = bLine ? Number(bLine.total) || 0 : 0;
    const targetTotal = tLine ? Number(tLine.total) || 0 : 0;
    const delta = Math.round((targetTotal - baseTotal) * 100) / 100;

    let status: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED' = 'UNCHANGED';
    if (!bLine && tLine) status = 'ADDED';
    else if (bLine && !tLine) status = 'REMOVED';
    else if (delta !== 0 || bLine?.qtyOrDebit !== tLine?.qtyOrDebit) status = 'MODIFIED';

    return {
      code: (tLine || bLine)?.code || '-',
      label: (tLine || bLine)?.label || '-',
      baseTotal,
      targetTotal,
      delta,
      status,
    };
  });

  const changedFieldsCount =
    fieldDiffs.filter((f) => f.changed).length +
    lineDiffs.filter((l) => l.status !== 'UNCHANGED').length;

  return {
    baseVersion,
    targetVersion,
    hasDifferences: changedFieldsCount > 0,
    changedFieldsCount,
    totalAmountDelta: Math.round(((Number(t.grandTotal) || 0) - (Number(b.grandTotal) || 0)) * 100) / 100,
    lineCountDelta: (t.lineItemsSummary?.length || 0) - (b.lineItemsSummary?.length || 0),
    fieldDiffs,
    lineDiffs,
  };
}

/**
 * Restores a selected document version and creates an automatic audit version entry
 * recording the restoration.
 */
export function restoreDocumentVersionPayload(params: {
  versionToRestore: AccountingDocumentVersion;
  existingVersions: AccountingDocumentVersion[];
  restoredBy: string;
  nowIso?: string;
}): {
  restoredPayload: AccountingDocumentVersionPayload;
  auditVersionSnapshot: AccountingDocumentVersion;
} {
  const { versionToRestore, existingVersions, restoredBy, nowIso } = params;
  const restoredPayload: AccountingDocumentVersionPayload = JSON.parse(
    JSON.stringify(versionToRestore.payload)
  );

  const auditVersionSnapshot = createDocumentVersionSnapshot({
    documentId: versionToRestore.documentId,
    existingVersions,
    payload: restoredPayload,
    createdBy: restoredBy,
    changeReason: `Restored from v${versionToRestore.versionNumber} (${versionToRestore.checksum})`,
    nowIso,
  });

  return {
    restoredPayload,
    auditVersionSnapshot,
  };
}
