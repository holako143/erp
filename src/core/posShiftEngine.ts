import { POSShift, SalesInvoice } from '../types/erp';

export interface ShiftActionControlMeta {
  isOpen: boolean;
  mode: 'OPEN' | 'CLOSE';
  label: string;
  shortLabel: string;
  statusBadge: string;
}

export interface ShiftAnalyticsRow {
  rowId: string;
  shiftNumberLabel: string;
  isShiftActivated: boolean;
  status: 'OPEN' | 'CLOSED' | 'FLEXIBLE_ACTIVE';
  statusLabelAr: string;
  statusLabelEn: string;
  cashierName: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  transactionCount: number;
  startingCash: number;
  cashPayments: number;
  cardPayments: number;
  splitPayments: number;
  creditPayments: number;
  totalSales: number;
  paidTotal: number;
  expectedCash: number;
  actualClosingCash?: number;
  discrepancy: number;
}

export interface ShiftAnalyticsSummary {
  totalSessionsCount: number;
  explicitShiftsCount: number;
  flexibleSessionsCount: number;
  grandTotalSales: number;
  totalTransactions: number;
  totalCashPayments: number;
  totalCardPayments: number;
  totalSplitPayments: number;
  totalCreditPayments: number;
  totalDiscrepancy: number;
}

export interface ShiftAnalyticsReport {
  rows: ShiftAnalyticsRow[];
  summary: ShiftAnalyticsSummary;
}

/**
 * Creates a clean default shiftless state (`CLOSED`) so the ERP runs seamlessly
 * on first launch without forcing the user to open or close a shift.
 */
export const createDefaultShiftlessState = (params?: {
  tenantId?: string;
  branchId?: string;
  cashierId?: string;
  cashierName?: string;
}): POSShift => ({
  id: 'shift-none',
  tenantId: params?.tenantId || 'ten-1',
  branchId: params?.branchId || 'branch-main-01',
  cashierId: params?.cashierId || 'usr-admin-1',
  cashierName: params?.cashierName || 'المدير العام',
  startTime: '',
  startingCash: 0,
  cashSales: 0,
  cardSales: 0,
  totalSales: 0,
  expectedCash: 0,
  transactionCount: 0,
  mode: 'FLEXIBLE_SHIFTLESS',
  status: 'CLOSED',
});

/**
 * Returns true only when a cashier shift has been explicitly opened.
 */
export const isShiftActive = (shift?: POSShift | null): boolean =>
  Boolean(shift && shift.status === 'OPEN');

/**
 * Accumulates POS checkout totals into `currentShift` ONLY if a shift is currently OPEN.
 * When no shift is open (`CLOSED`), the ERP operates in flexible shiftless mode and
 * leaves `shift` untouched (`CLOSED`) instead of creating a phantom open shift.
 */
export const applySaleToShift = (
  shift: POSShift,
  sale: { grandTotal: number; cashPortion: number; cardPortion: number }
): POSShift => {
  if (!shift || shift.status !== 'OPEN') {
    return shift;
  }
  const cleanGrand = Math.max(0, Number(sale.grandTotal) || 0);
  const cleanCash = Math.max(0, Number(sale.cashPortion) || 0);
  const cleanCard = Math.max(0, Number(sale.cardPortion) || 0);

  return {
    ...shift,
    status: 'OPEN',
    mode: 'EXPLICIT_SHIFT',
    transactionCount: (shift.transactionCount || 0) + 1,
    cashSales: Math.round((shift.cashSales + cleanCash) * 100) / 100,
    cardSales: Math.round((shift.cardSales + cleanCard) * 100) / 100,
    totalSales: Math.round((shift.totalSales + cleanGrand) * 100) / 100,
    expectedCash: Math.round((shift.expectedCash + cleanCash) * 100) / 100,
  };
};

/**
 * Returns bilingual UI labels & action modes for navbar/profile/POS shift controls.
 */
export const getShiftActionControlMeta = (
  shift: POSShift | null | undefined,
  language: 'ar' | 'en'
): ShiftActionControlMeta => {
  const active = isShiftActive(shift);
  if (active) {
    return {
      isOpen: true,
      mode: 'CLOSE',
      label: language === 'ar' ? 'إغلاق الوردية' : 'Close Shift',
      shortLabel: language === 'ar' ? 'إغلاق وردية' : 'Close Shift',
      statusBadge: language === 'ar' ? 'وردية نشطة' : 'Shift Open',
    };
  }
  return {
    isOpen: false,
    mode: 'OPEN',
    label: language === 'ar' ? 'فتح وردية' : 'Open Shift',
    shortLabel: language === 'ar' ? 'فتح وردية' : 'Open Shift',
    statusBadge: language === 'ar' ? 'وضع مرن (بدون وردية)' : 'Flexible (No Shift)',
  };
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Builds comprehensive Shift Analytics combining both explicitly activated shifts
 * (OPEN/CLOSED) AND flexible unshifted sales sessions ("غير مفعلة / بدون وردية").
 */
export const buildShiftAnalyticsReport = (params: {
  currentShift: POSShift;
  shiftHistory: POSShift[];
  salesInvoices: SalesInvoice[];
}): ShiftAnalyticsReport => {
  const { currentShift, shiftHistory, salesInvoices } = params;

  const validInvoices = (salesInvoices || []).filter((inv) => inv.status !== 'VOID');

  // Collect unique explicit shifts (current active/recently closed if not placeholder, plus history)
  const explicitShiftMap = new Map<string, POSShift>();

  for (const h of shiftHistory || []) {
    if (h && h.id && h.id !== 'shift-none') {
      explicitShiftMap.set(h.id, h);
    }
  }
  if (
    currentShift &&
    currentShift.id &&
    currentShift.id !== 'shift-none' &&
    (currentShift.status === 'OPEN' || currentShift.mode === 'EXPLICIT_SHIFT')
  ) {
    explicitShiftMap.set(currentShift.id, currentShift);
  }

  const explicitIds = new Set(explicitShiftMap.keys());
  const rows: ShiftAnalyticsRow[] = [];

  const summarizeInvoicesForRow = (invs: SalesInvoice[]) => {
    let cashPayments = 0;
    let cardPayments = 0;
    let splitPayments = 0;
    let creditPayments = 0;
    let totalSales = 0;
    let paidTotal = 0;

    for (const inv of invs) {
      const grand = round2(inv.grandTotal || 0);
      const paid = Math.min(grand, Math.max(0, round2(inv.paidAmount ?? grand)));
      const unpaid = Math.max(0, round2(grand - paid));

      totalSales += grand;
      paidTotal += paid;
      creditPayments += unpaid;

      if (inv.paymentMethod === 'CASH') cashPayments += paid;
      else if (inv.paymentMethod === 'CARD') cardPayments += paid;
      else if (inv.paymentMethod === 'SPLIT') splitPayments += paid;
      else if (inv.paymentMethod === 'CREDIT') cashPayments += paid;
      else cashPayments += paid;
    }

    return {
      cashPayments: round2(cashPayments),
      cardPayments: round2(cardPayments),
      splitPayments: round2(splitPayments),
      creditPayments: round2(creditPayments),
      totalSales: round2(totalSales),
      paidTotal: round2(paidTotal),
    };
  };

  // 1. Process explicit shifts (مفعلة)
  const explicitList = Array.from(explicitShiftMap.values()).reverse();
  explicitList.forEach((sh, index) => {
    const linkedInvoices = validInvoices.filter((inv) => inv.shiftId === sh.id);
    const hasLinked = linkedInvoices.length > 0;
    const summary = hasLinked ? summarizeInvoicesForRow(linkedInvoices) : null;

    const cashPayments = summary ? summary.cashPayments : round2(sh.cashSales);
    const cardPayments = summary ? summary.cardPayments : round2(sh.cardSales);
    const splitPayments = summary ? summary.splitPayments : 0;
    const creditPayments = summary ? summary.creditPayments : 0;
    const totalSales = summary ? summary.totalSales : round2(sh.totalSales);
    const paidTotal = summary ? summary.paidTotal : round2(sh.cashSales + sh.cardSales);

    const txCount = hasLinked
      ? linkedInvoices.length
      : sh.transactionCount || (totalSales > 0 ? 1 : 0);

    const dateLabel =
      linkedInvoices[0]?.date ||
      (sh.startTime && sh.startTime.includes('-') ? sh.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10));

    rows.push({
      rowId: sh.id,
      shiftNumberLabel: `SHF-${String(explicitList.length - index).padStart(3, '0')}`,
      isShiftActivated: true,
      status: sh.status,
      statusLabelAr: sh.status === 'OPEN' ? 'وردية مفعلة (مفتوحة)' : 'وردية مفعلة (مغلقة)',
      statusLabelEn: sh.status === 'OPEN' ? 'Active Shift (Open)' : 'Closed Shift',
      cashierName: sh.cashierName || 'المدير العام',
      dateLabel,
      startTime: sh.startTime || '—',
      endTime: sh.status === 'OPEN' ? 'جارية الآن' : sh.endTime || '—',
      transactionCount: txCount,
      startingCash: round2(sh.startingCash),
      cashPayments,
      cardPayments,
      splitPayments,
      creditPayments,
      totalSales,
      paidTotal,
      expectedCash: round2(sh.expectedCash),
      actualClosingCash: sh.actualClosingCash !== undefined ? round2(sh.actualClosingCash) : undefined,
      discrepancy: round2(sh.discrepancy || 0),
    });
  });

  // 2. Group invoices created in Flexible Shiftless Mode ("غير مفعلة — بدون وردية") by date
  const shiftlessInvoices = validInvoices.filter(
    (inv) =>
      inv.shiftMode === 'FLEXIBLE_SHIFTLESS' ||
      inv.shiftId === 'shift-none' ||
      !inv.shiftId ||
      !explicitIds.has(inv.shiftId)
  );

  const byDate = new Map<string, SalesInvoice[]>();
  for (const inv of shiftlessInvoices) {
    const key = inv.date || new Date().toISOString().slice(0, 10);
    const existing = byDate.get(key) || [];
    existing.push(inv);
    byDate.set(key, existing);
  }

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
  sortedDates.forEach((dateKey) => {
    const invs = byDate.get(dateKey) || [];
    const summary = summarizeInvoicesForRow(invs);
    const cashPayments = summary.cashPayments;
    const cardPayments = summary.cardPayments;
    const splitPayments = summary.splitPayments;
    const creditPayments = summary.creditPayments;
    const totalSales = summary.totalSales;
    const paidTotal = summary.paidTotal;

    rows.push({
      rowId: `shiftless-${dateKey}`,
      shiftNumberLabel: `FLEX-${dateKey}`,
      isShiftActivated: false,
      status: 'FLEXIBLE_ACTIVE',
      statusLabelAr: 'غير مفعلة (الوضع المرن بدون وردية)',
      statusLabelEn: 'Unshifted (Flexible Mode)',
      cashierName: 'عمليات مباشرة بدون وردية',
      dateLabel: dateKey,
      startTime: 'متواصل',
      endTime: 'تلقائي',
      transactionCount: invs.length,
      startingCash: 0,
      cashPayments,
      cardPayments,
      splitPayments,
      creditPayments,
      totalSales,
      paidTotal,
      expectedCash: cashPayments,
      actualClosingCash: undefined,
      discrepancy: 0,
    });
  });

  // Sort combined rows newest/open first
  rows.sort((a, b) => {
    if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
    if (b.status === 'OPEN' && a.status !== 'OPEN') return 1;
    return b.dateLabel.localeCompare(a.dateLabel);
  });

  const summary: ShiftAnalyticsSummary = {
    totalSessionsCount: rows.length,
    explicitShiftsCount: rows.filter((r) => r.isShiftActivated).length,
    flexibleSessionsCount: rows.filter((r) => !r.isShiftActivated).length,
    grandTotalSales: round2(rows.reduce((s, r) => s + r.totalSales, 0)),
    totalTransactions: rows.reduce((s, r) => s + r.transactionCount, 0),
    totalCashPayments: round2(rows.reduce((s, r) => s + r.cashPayments, 0)),
    totalCardPayments: round2(rows.reduce((s, r) => s + r.cardPayments, 0)),
    totalSplitPayments: round2(rows.reduce((s, r) => s + r.splitPayments, 0)),
    totalCreditPayments: round2(rows.reduce((s, r) => s + r.creditPayments, 0)),
    totalDiscrepancy: round2(rows.reduce((s, r) => s + r.discrepancy, 0)),
  };

  return { rows, summary };
};

export const buildShiftAnalyticsCsv = (rows: ShiftAnalyticsRow[], currency: string): string => {
  const headers = [
    'Session Code',
    'Shift Mode',
    'Status',
    'Operator',
    'Date',
    'Start Time',
    'End Time',
    'Transactions',
    `Cash Payments (${currency})`,
    `Card Payments (${currency})`,
    `Split Payments (${currency})`,
    `Credit Sales (${currency})`,
    `Total Sales (${currency})`,
    `Discrepancy (${currency})`,
  ];

  const csvRows = rows.map((r) => [
    r.shiftNumberLabel,
    r.isShiftActivated ? 'EXPLICIT_SHIFT' : 'FLEXIBLE_SHIFTLESS',
    `"${r.statusLabelAr.replace(/"/g, '""')}"`,
    `"${r.cashierName.replace(/"/g, '""')}"`,
    r.dateLabel,
    `"${r.startTime}"`,
    `"${r.endTime}"`,
    r.transactionCount,
    r.cashPayments,
    r.cardPayments,
    r.splitPayments,
    r.creditPayments,
    r.totalSales,
    r.discrepancy,
  ]);

  return '\uFEFF' + [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
};

const escapeHtml = (val: string) =>
  String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildShiftAnalyticsPrintableHtml = (params: {
  rows: ShiftAnalyticsRow[];
  summary: ShiftAnalyticsSummary;
  companyName: string;
  companyLogo?: string;
  currency: string;
  generatedAt?: string;
}): string => {
  const { rows, summary, companyName, companyLogo, currency, generatedAt } = params;
  const timestamp = generatedAt || new Date().toLocaleString('ar-YE');

  const rowsHtml =
    rows.length === 0
      ? `<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748b;">لا توجد ورديات أو عمليات مسجلة في النطاق المحدد</td></tr>`
      : rows
          .map(
            (r) => `
          <tr>
            <td style="font-family:monospace;font-weight:700;">${escapeHtml(r.shiftNumberLabel)}</td>
            <td>
              <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:${
                r.isShiftActivated ? '#e0e7ff' : '#ecfdf5'
              };color:${r.isShiftActivated ? '#1e3a8a' : '#065f46'};">
                ${escapeHtml(r.statusLabelAr)}
              </span>
            </td>
            <td>${escapeHtml(r.cashierName)}</td>
            <td style="font-family:monospace;">${escapeHtml(r.dateLabel)}<br/><small style="color:#64748b;">${escapeHtml(r.startTime)} - ${escapeHtml(r.endTime)}</small></td>
            <td style="text-align:center;font-family:monospace;font-weight:700;">${r.transactionCount}</td>
            <td style="font-family:monospace;color:#047857;">${r.cashPayments.toLocaleString('en-US')}</td>
            <td style="font-family:monospace;color:#4338ca;">${r.cardPayments.toLocaleString('en-US')}</td>
            <td style="font-family:monospace;color:#b45309;">${(r.splitPayments + r.creditPayments).toLocaleString('en-US')}</td>
            <td style="font-family:monospace;font-weight:800;">${r.totalSales.toLocaleString('en-US')} ${escapeHtml(currency)}</td>
          </tr>
        `
          )
          .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>تقرير إحصائيات الورديات والمدفوعات - ${escapeHtml(companyName)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
    body { margin: 0; padding: 20px; color: #0f172a; background: #ffffff; direction: rtl; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand img { width: 44px; height: 44px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; }
    h1 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
    .sub { margin: 3px 0 0; font-size: 11px; color: #475569; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
    .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; }
    .kpi-val { font-size: 15px; font-weight: 800; font-family: monospace; margin-top: 4px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #1e293b; color: #ffffff; padding: 9px 8px; text-align: right; font-weight: 700; }
    td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: middle; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${companyLogo ? `<img src="${escapeHtml(companyLogo)}" alt="logo" />` : ''}
      <div>
        <h1>${escapeHtml(companyName || 'تقرير الورديات التحليلي')}</h1>
        <div class="sub">تقرير إحصائيات الورديات (المفعلة والوضع المرن بدون وردية) وتحليل المدفوعات</div>
      </div>
    </div>
    <div style="text-align:left;font-size:11px;color:#475569;">
      <div><strong>تاريخ الإصدار:</strong> ${escapeHtml(timestamp)}</div>
      <div><strong>العملة:</strong> ${escapeHtml(currency)}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">إجمالي المبيعات</div>
      <div class="kpi-val">${summary.grandTotalSales.toLocaleString('en-US')} ${escapeHtml(currency)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">إجمالي عدد العمليات</div>
      <div class="kpi-val">${summary.totalTransactions.toLocaleString('en-US')} عملية</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">المدفوعات النقدية / البطاقة</div>
      <div class="kpi-val">${summary.totalCashPayments.toLocaleString('en-US')} / ${summary.totalCardPayments.toLocaleString('en-US')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">سجل الورديات (مفعلة / مرنة)</div>
      <div class="kpi-val">${summary.explicitShiftsCount} مفعلة • ${summary.flexibleSessionsCount} مرنة</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>الكود</th>
        <th>حالة الوردية</th>
        <th>المسؤول / النمط</th>
        <th>التاريخ والوقت</th>
        <th style="text-align:center;">عدد العمليات</th>
        <th>نقداً (كاش)</th>
        <th>بطاقة / شبكة</th>
        <th>مقسم / آجل</th>
        <th>إجمالي المبيعات</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <span>نظام الإدارة المحاسبية المتكامل</span>
    <span>إجمالي الفروقات النقدية: ${summary.totalDiscrepancy.toLocaleString('en-US')} ${escapeHtml(currency)}</span>
  </div>
</body>
</html>`;
};
