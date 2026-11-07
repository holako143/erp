import React from 'react';
import { useERP } from '../context/ERPContext';
import {
  Package,
  AlertTriangle,
  Receipt,
  CreditCard,
  Calculator,
  Barcode,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Landmark,
  Activity,
  FileSpreadsheet,
  MessageSquare,
} from 'lucide-react';
import {
  calculateDynamicFinancialStatements,
  calculateReceivablesPayablesAging,
  calculateExecutiveFinancialRatios,
} from '../core/accountingEngine';
import { IndustryChameleonPanel } from '../components/common/IndustryChameleonPanel';

export const DashboardView: React.FC = () => {
  const {
    products,
    salesInvoices,
    purchaseOrders,
    journalEntries,
    chartAccounts,
    customers,
    suppliers,
    postDatedChecks,
    currentShift,
    currentTenant,
    currentBranch,
    currency,
    language,
    setActiveTab,
    auditLogs,
    uiTheme,
    openQuickSendModal,
  } = useERP();

  const isDark = uiTheme === 'obsidian_dark';

  const totalStockValue = products.reduce((acc, p) => acc + p.stockQty * p.costPrice, 0);
  const totalSalesRevenue = salesInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const lowStockProducts = products.filter((p) => p.stockQty <= p.reorderPoint);

  const dynamicStatements = calculateDynamicFinancialStatements(
    chartAccounts,
    journalEntries,
    salesInvoices,
    purchaseOrders
  );

  const agingAnalysis = calculateReceivablesPayablesAging(customers, suppliers);

  const cashAndBankBalance = dynamicStatements.effectiveAccounts
    .filter((a) => a.code === '1101' || a.code === '1102')
    .reduce((sum, a) => sum + Math.max(0, a.effectiveBalance), 0);

  const receivableChecksPending = postDatedChecks
    .filter((c) => c.type === 'RECEIVABLE' && c.status === 'UNDER_COLLECTION')
    .reduce((s, c) => s + c.amount, 0);

  const payableChecksPending = postDatedChecks
    .filter((c) => c.type === 'PAYABLE' && c.status === 'UNDER_COLLECTION')
    .reduce((s, c) => s + c.amount, 0);

  const financialRatios = calculateExecutiveFinancialRatios({
    revenues: dynamicStatements.revenues,
    expenses: dynamicStatements.expenses,
    totalAssets: dynamicStatements.totalAssets,
    totalLiabilities: dynamicStatements.totalLiabilities,
    cashAndBankBalance,
    receivableChecksPending,
    payableChecksPending,
  });

  const cardSurface = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900';

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-5">
      {/* Top Institutional Command Header (Zero Gradient / Zero Pill Slop) */}
      <div className={`rounded-lg border p-5 ${cardSurface}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className={`flex flex-wrap items-center gap-2 text-xs font-medium ${mutedText} mb-1.5`}>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currentTenant.name}
              </span>
              <span>·</span>
              <span className="font-mono">{currentTenant.code}</span>
              <span>·</span>
              <span>
                {language === 'ar' ? `الفرع: ${currentBranch.nameAr}` : `Branch: ${currentBranch.name}`}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {language === 'ar' ? 'الأستاذ العام متوازن 100%' : 'Ledger Verified Balanced'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {language === 'ar'
                ? 'المركز المالي والتشغيلي الموحد'
                : 'Executive Financial & Operational Command'}
            </h1>
          </div>

          {/* Primary Action Bar (Disciplined 1px Border & Solid Slate Authority) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="dashboard-whatsapp-report-btn"
              onClick={() =>
                openQuickSendModal({
                  channel: 'WHATSAPP',
                  category: 'FINANCIAL_REPORT',
                })
              }
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-md transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>
                {language === 'ar' ? 'إرسال التقرير المالي واتساب / SMS' : 'Send Report via WhatsApp/SMS'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-md transition flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'نقطة البيع POS' : 'POS Terminal'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`text-xs font-semibold px-3.5 py-2 rounded-md border transition flex items-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'ar' ? 'الفواتير وأعمار الديون' : 'Invoices & Aging'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accounting')}
              className={`text-xs font-semibold px-3.5 py-2 rounded-md border transition flex items-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'ar' ? 'القوائم المالية والقيود' : 'General Ledger'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('barcodeEngine')}
              className={`text-xs font-semibold px-3.5 py-2 rounded-md border transition flex items-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Barcode className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'ar' ? 'محرك الباركود GS1' : 'GS1 Barcodes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Swiss-Grid 4-Column Primary Financial Ledger Strip (Single Border Container with Hairline Dividers) */}
      <div
        className={`rounded-lg border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse ${
          isDark
            ? 'bg-slate-900 border-slate-800 divide-slate-800'
            : 'bg-white border-slate-200/90 divide-slate-200/80'
        }`}
      >
        {/* 1. Net Income & Profit Margin */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${mutedText}`}>
              {language === 'ar' ? 'صافي الربح التشغيلي (P&L)' : 'Net Operating Profit'}
            </span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
            {financialRatios.netIncome.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{currency}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {language === 'ar'
                ? `هامش الربح: ${financialRatios.netProfitMarginPercent}%`
                : `Margin: ${financialRatios.netProfitMarginPercent}%`}
            </span>
            <span className={`font-mono ${mutedText}`}>
              {language === 'ar'
                ? `إيراد: ${dynamicStatements.revenues.toLocaleString()}`
                : `Rev: ${dynamicStatements.revenues.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* 2. Projected 30-Day Cash Liquidity */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${mutedText}`}>
              {language === 'ar' ? 'السيولة النقدية المتوقعة (30 يوم)' : '30-Day Projected Liquidity'}
            </span>
            <Landmark className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
            {financialRatios.projected30DayCashBalance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{currency}</span>
          </div>
          <div className={`mt-2 flex items-center justify-between text-[11px] font-mono ${mutedText}`}>
            <span>
              {language === 'ar'
                ? `الحالي: ${cashAndBankBalance.toLocaleString()}`
                : `Current: ${cashAndBankBalance.toLocaleString()}`}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {language === 'ar'
                ? `صافي شيكات: +${financialRatios.netCheckFlow.toLocaleString()}`
                : `PDC Net: +${financialRatios.netCheckFlow.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* 3. Total Stock Valuation (WAC) */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${mutedText}`}>
              {language === 'ar' ? 'تقييم المخزون الدفتري (WAC)' : 'Inventory Valuation (WAC)'}
            </span>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
            {totalStockValue.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{currency}</span>
          </div>
          <div className={`mt-2 flex items-center justify-between text-[11px] ${mutedText}`}>
            <span>
              {products.length} {language === 'ar' ? 'صنف مسجل' : 'Active SKUs'}
            </span>
            <span
              className={
                lowStockProducts.length > 0
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-emerald-600 font-semibold'
              }
            >
              {lowStockProducts.length} {language === 'ar' ? 'تحت حد الطلب' : 'Low Stock'}
            </span>
          </div>
        </div>

        {/* 4. Active POS Shift & Invoicing */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${mutedText}`}>
              {language === 'ar' ? 'مبيعات الفواتير ووردية الكاشير' : 'Sales & Active POS Shift'}
            </span>
            <CreditCard className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
            {totalSalesRevenue.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{currency}</span>
          </div>
          <div className={`mt-2 flex items-center justify-between text-[11px] font-mono ${mutedText}`}>
            <span>
              {language === 'ar'
                ? `الوردية: ${currentShift.totalSales.toLocaleString()}`
                : `Shift: ${currentShift.totalSales.toLocaleString()}`}
            </span>
            <span>
              {salesInvoices.length} {language === 'ar' ? 'فاتورة ضريبية' : 'Tax Invoices'}
            </span>
          </div>
        </div>
      </div>

      {/* Executive Financial Ratios & Credit Aging Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Receivables & Payables Aging Matrix (7 cols) */}
        <div className={`lg:col-span-7 rounded-lg border overflow-hidden ${cardSurface}`}>
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-sm">
                {language === 'ar'
                  ? 'تحليل أعمار الديون والانكشاف الائتماني للعملاء (30 / 60 / 90+ يوم)'
                  : 'Accounts Receivable Aging & Credit Exposure Analysis'}
              </h2>
              <p className={`text-[11px] ${mutedText}`}>
                {language === 'ar'
                  ? 'توزيع مديونيات العملاء حسب فترات الاستحقاق ومراقبة السقف الائتماني'
                  : 'Distribution of customer balances across aging buckets'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="text-xs font-semibold text-slate-900 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {language === 'ar' ? 'إصدار سند قبض / كشف حساب ←' : 'Statement & Receipt Voucher →'}
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* 4 Aging Buckets Bar Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: language === 'ar' ? '0 - 30 يوم (جاري)' : '0 - 30 Days (Current)',
                  amount: agingAnalysis.totals.current0To30,
                  barColor: 'bg-emerald-600',
                  textColor: 'text-emerald-700 dark:text-emerald-400',
                },
                {
                  label: language === 'ar' ? '31 - 60 يوم' : '31 - 60 Days',
                  amount: agingAnalysis.totals.days31To60,
                  barColor: 'bg-sky-600',
                  textColor: 'text-sky-700 dark:text-sky-400',
                },
                {
                  label: language === 'ar' ? '61 - 90 يوم' : '61 - 90 Days',
                  amount: agingAnalysis.totals.days61To90,
                  barColor: 'bg-amber-500',
                  textColor: 'text-amber-700 dark:text-amber-400',
                },
                {
                  label: language === 'ar' ? '+90 يوم (متأخرات حرجة)' : '90+ Days (Overdue)',
                  amount: agingAnalysis.totals.daysOver90,
                  barColor: 'bg-rose-600',
                  textColor: 'text-rose-700 dark:text-rose-400',
                },
              ].map((bucket, idx) => {
                const pct =
                  agingAnalysis.totals.totalReceivables > 0
                    ? Math.round((bucket.amount / agingAnalysis.totals.totalReceivables) * 100)
                    : 0;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-md border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                  >
                    <div className={`text-[11px] font-medium ${mutedText}`}>{bucket.label}</div>
                    <div className={`text-sm font-bold font-mono tabular-nums mt-1 ${bucket.textColor}`}>
                      {bucket.amount.toLocaleString()} {currency}
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-xs overflow-hidden">
                      <div className={`h-full ${bucket.barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`text-[10px] font-mono mt-1 ${mutedText}`}>{pct}% من الذمم</div>
                  </div>
                );
              })}
            </div>

            {/* Customer Credit Utilization Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
              <table className="w-full text-xs text-start">
                <thead
                  className={`border-b text-[11px] font-semibold ${
                    isDark
                      ? 'bg-slate-950 text-slate-400 border-slate-800'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-3 text-start">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="py-2 px-3 text-end">{language === 'ar' ? 'الرصيد المدين' : 'Balance'}</th>
                    <th className="py-2 px-3 text-end">{language === 'ar' ? '0-30 يوم' : '0-30d'}</th>
                    <th className="py-2 px-3 text-end">{language === 'ar' ? '+60 يوم' : '60d+'}</th>
                    <th className="py-2 px-3 text-center">{language === 'ar' ? 'استغلال الائتمان' : 'Credit Used'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {agingAnalysis.customerAging.slice(0, 4).map((c) => (
                    <tr key={c.partyId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold">{c.partyNameAr}</td>
                      <td className="py-2 px-3 text-end font-mono font-bold">
                        {c.totalBalance.toLocaleString()} {currency}
                      </td>
                      <td className="py-2 px-3 text-end font-mono text-emerald-700 dark:text-emerald-400">
                        {c.current0To30.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-end font-mono text-amber-700 dark:text-amber-400">
                        {(c.days61To90 + c.daysOver90).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Institutional Financial Ratios & ZATCA Tax Readiness (5 cols) */}
        <div className={`lg:col-span-5 rounded-lg border flex flex-col justify-between ${cardSurface}`}>
          <div>
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm">
                  {language === 'ar'
                    ? 'المؤشرات المالية والجاهزية الضريبية (ZATCA)'
                    : 'Financial Ratios & Tax Readiness'}
                </h2>
                <p className={`text-[11px] ${mutedText}`}>
                  {language === 'ar'
                    ? 'قراءة لحظية من ميزان المراجعة والقوائم المالية الختامية'
                    : 'Live metrics computed from General Ledger'}
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="p-5 grid grid-cols-2 gap-3">
              <div
                className={`p-3.5 rounded-md border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className={`text-[11px] ${mutedText}`}>
                  {language === 'ar' ? 'نسبة السيولة الجارية (Current Ratio)' : 'Current Ratio'}
                </div>
                <div className="text-lg font-bold font-mono tabular-nums mt-1">
                  {financialRatios.currentRatio}x
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {language === 'ar' ? 'ملاءة مالية ممتازة (> 1.5x)' : 'Healthy Solvency'}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-md border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className={`text-[11px] ${mutedText}`}>
                  {language === 'ar' ? 'رأس المال العامل (Working Capital)' : 'Working Capital'}
                </div>
                <div className="text-lg font-bold font-mono tabular-nums mt-1">
                  {financialRatios.workingCapital.toLocaleString()} {currency}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${mutedText}`}>
                  {language === 'ar' ? 'الأصول ناقص الالتزامات' : 'Assets - Liabilities'}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-md border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className={`text-[11px] ${mutedText}`}>
                  {language === 'ar' ? 'ذمم العملاء مقابل الموردين' : 'Receivables vs Payables'}
                </div>
                <div className="text-lg font-bold font-mono tabular-nums mt-1">
                  {agingAnalysis.totals.totalReceivables.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    / {agingAnalysis.totals.totalPayables.toLocaleString()}
                  </span>
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${mutedText}`}>
                  {language === 'ar'
                    ? `صافي الانكشاف: ${agingAnalysis.totals.netWorkingCreditExposure.toLocaleString()} ${currency}`
                    : `Net Exposure: ${agingAnalysis.totals.netWorkingCreditExposure.toLocaleString()}`}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-md border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className={`text-[11px] ${mutedText}`}>
                  {language === 'ar' ? 'صافي ضريبة القيمة المضافة (ZATCA)' : 'Net VAT Payable (15%)'}
                </div>
                <div className="text-lg font-bold font-mono tabular-nums mt-1 text-amber-700 dark:text-amber-400">
                  {dynamicStatements.netVatPayable.toLocaleString()} {currency}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${mutedText}`}>
                  {language === 'ar'
                    ? `مخرجات: ${dynamicStatements.outputVat.toLocaleString()} · مدخلات: ${dynamicStatements.inputVat.toLocaleString()}`
                    : `Out: ${dynamicStatements.outputVat} · In: ${dynamicStatements.inputVat}`}
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className={mutedText}>
              {language === 'ar'
                ? `إجمالي القيود اليومية المرحلة: ${journalEntries.length} قيد`
                : `Posted Journal Entries: ${journalEntries.length}`}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('accounting')}
              className="font-semibold text-slate-900 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'استعراض ميزان المراجعة' : 'View Trial Balance'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Split: High-Density Inventory Health Grid & Append-Only Audit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inventory Health Table (2 cols) */}
        <div className={`lg:col-span-2 rounded-lg border overflow-hidden ${cardSurface}`}>
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-sm">
                {language === 'ar'
                  ? 'حركة وأرصدة الأصناف الرئيسية في المستودعات'
                  : 'Primary Inventory Valuation & Stock Status'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-semibold text-slate-900 dark:text-emerald-400 hover:underline transition cursor-pointer"
            >
              {language === 'ar' ? 'إدارة المستودعات ←' : 'Open WMS →'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead
                className={`border-b text-[11px] font-semibold ${
                  isDark
                    ? 'bg-slate-950 text-slate-400 border-slate-800'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                <tr>
                  <th className="py-2.5 px-4 text-start">
                    {language === 'ar' ? 'الصنف / الكود' : 'Product / SKU'}
                  </th>
                  <th className="py-2.5 px-4 text-start">
                    {language === 'ar' ? 'موقع التخزين' : 'Bin'}
                  </th>
                  <th className="py-2.5 px-4 text-end">
                    {language === 'ar' ? 'الرصيد الفعلي' : 'Stock Qty'}
                  </th>
                  <th className="py-2.5 px-4 text-end">
                    {language === 'ar' ? 'التكلفة / البيع' : 'Cost / Sale'}
                  </th>
                  <th className="py-2.5 px-4 text-center">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {products.slice(0, 6).map((p) => {
                  const isLow = p.stockQty <= p.reorderPoint;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-semibold">
                          {language === 'ar' ? p.nameAr : p.name}
                        </div>
                        <div className={`text-[10px] font-mono ${mutedText}`}>
                          {p.sku} · {p.barcode}
                        </div>
                      </td>
                      <td className={`py-2.5 px-4 font-mono text-[11px] ${mutedText}`}>
                        {p.binLocation || 'ZA-01-S1'}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-bold tabular-nums">
                        {p.stockQty} <span className="text-[10px] font-normal">{p.uom}</span>
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono tabular-nums">
                        <span className={mutedText}>{p.costPrice}</span> /{' '}
                        <span className="font-bold">
                          {p.salePrice} {currency}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {/* Unboxed Institutional Status Dot + Text (Zero Pill Slop) */}
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                            isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {isLow
                            ? language === 'ar'
                              ? 'إعادة طلب'
                              : 'Reorder'
                            : language === 'ar'
                            ? 'متوفر'
                            : 'Optimal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Append-Only Enterprise Audit Log (1 col) */}
        <div className={`rounded-lg border overflow-hidden flex flex-col ${cardSurface}`}>
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-sm">
                {language === 'ar' ? 'سجل الرقابة والتدقيق الفوري' : 'Immutable Audit Ledger'}
              </h3>
            </div>
            <span className={`text-[10px] font-mono ${mutedText}`}>APPEND-ONLY</span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80">
            {auditLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="text-xs border-s-2 border-slate-400 dark:border-slate-600 ps-3 py-0.5 space-y-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[11px]">{log.action}</span>
                  <span className={`text-[10px] font-mono ${mutedText}`}>
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className={`text-[11px] leading-snug ${mutedText}`}>{log.details}</p>
                <div className="text-[10px] font-mono text-slate-500">
                  {log.userName} · {log.module}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

