import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Calculator,
  Plus,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  Landmark,
  Coins,
  ArrowRightLeft,
  Target,
  MessageSquare,
} from 'lucide-react';
import {
  generateTrialBalance,
  validateJournalBalance,
  calculateDynamicFinancialStatements,
  calculateBankReconciliationSummary,
  convertCurrencyAmount,
  calculateFXRevaluation,
  calculateCostCenterBudgetVariance,
} from '../core/accountingEngine';
import { AccountType, Currency } from '../types/erp';
import { WorkspaceTabResizerBar } from '../components/common/WorkspaceTabResizerBar';

export const AccountingView: React.FC = () => {
  const {
    chartAccounts,
    addChartAccount,
    journalEntries,
    addManualJournalEntry,
    reverseJournalEntry,
    bankStatementLines,
    reconcileBankStatementLine,
    postDatedChecks,
    addPostDatedCheck,
    clearPostDatedCheck,
    bouncePostDatedCheck,
    exchangeRates,
    updateExchangeRate,
    postFXRevaluationEntry,
    costCenterBudgets,
    updateCostCenterBudgetCap,
    postCostCenterExpense,
    salesInvoices,
    purchaseOrders,
    currency,
    setCurrency,
    language,
    currentTenant,
    openQuickSendModal,
  } = useERP();

  const [activeTab, setActiveTab] = useState<
    | 'journal'
    | 'chart'
    | 'trialBalance'
    | 'pnl'
    | 'balanceSheet'
    | 'vatReturn'
    | 'bankAndPdc'
    | 'multiCurrency'
    | 'budgets'
  >('journal');
  const [accountingNotice, setAccountingNotice] = useState<string | null>(null);

  // Cost Center Expense Allocation Form State
  const [selectedBudgetCC, setSelectedBudgetCC] = useState<string>(
    costCenterBudgets[0]?.costCenterCode || 'CC-OPS-RYD'
  );
  const [ccExpenseAccCode, setCcExpenseAccCode] = useState<string>('5202');
  const [ccExpenseAmount, setCcExpenseAmount] = useState<number>(15000);
  const [ccPaymentMethod, setCcPaymentMethod] = useState<'BANK' | 'CASH'>('BANK');
  const [ccExpenseDesc, setCcExpenseDesc] = useState<string>(
    'توريد مستلزمات تشغيل وصيانة وقائية للمركز'
  );

  // PDC Creation Form State
  const [newCheckNumber, setNewCheckNumber] = useState('CHK-880192');
  const [newCheckType, setNewCheckType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [newCheckParty, setNewCheckParty] = useState('شركة الإنماء للمشاريع الهندسية');
  const [newCheckBank, setNewCheckBank] = useState('مصرف الراجحي');
  const [newCheckAmount, setNewCheckAmount] = useState<number>(19500);
  const [newCheckMaturity, setNewCheckMaturity] = useState('2026-11-25');

  // Currency Converter State
  const [convAmount, setConvAmount] = useState<number>(1000);
  const [convFrom, setConvFrom] = useState<Currency>('USD');
  const [convTo, setConvTo] = useState<Currency>('SAR');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(
    journalEntries[0]?.id || null
  );

  // New Chart Account Form State
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccCode, setNewAccCode] = useState('1109');
  const [newAccNameAr, setNewAccNameAr] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('ASSET');
  const [newAccBalance, setNewAccBalance] = useState(0);

  // Manual Journal Form State
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    {
      accountId: chartAccounts[2]?.id || '',
      debit: 1000,
      credit: 0,
      memo: 'Operating funds transfer',
    },
    { accountId: chartAccounts[3]?.id || '', debit: 0, credit: 1000, memo: 'Bank debit' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Reversal Modal State
  const [reversalTargetId, setReversalTargetId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState(
    'Error in cost allocation; adjusting via reversing entry'
  );
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Calculate Trial Balance & Dynamic Statements
  const trialBalance = generateTrialBalance(chartAccounts, journalEntries);
  const dynamicStatements = calculateDynamicFinancialStatements(
    chartAccounts,
    journalEntries,
    salesInvoices,
    purchaseOrders
  );

  // Real-time Balance Check for Modal
  const liveCheck = validateJournalBalance(lines);

  const handleAddLine = () => {
    setLines([
      ...lines,
      { accountId: chartAccounts[0]?.id || '', debit: 0, credit: 0, memo: '' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError(language === 'ar' ? 'الوصف مطلوب' : 'Description is required');
      return;
    }

    const res = addManualJournalEntry({
      description,
      lines,
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to post entry');
    } else {
      setIsManualModalOpen(false);
      setDescription('');
      setFormError(null);
    }
  };

  const handleConfirmReversal = () => {
    if (!reversalTargetId) return;
    const res = reverseJournalEntry(reversalTargetId, reversalReason);
    if (!res.success) {
      setReversalError(res.error || 'Reversal failed');
    } else {
      setReversalError(null);
      setReversalTargetId(null);
    }
  };

  const handleAddChartAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNameAr.trim() || !newAccCode.trim()) return;
    const isDebitNormal = newAccType === 'ASSET' || newAccType === 'EXPENSE';
    addChartAccount({
      code: newAccCode.trim(),
      name: newAccNameAr.trim(),
      nameAr: newAccNameAr.trim(),
      type: newAccType,
      level: 3,
      balance: Number(newAccBalance) || 0,
      isDebitNormal,
      isActive: true,
    });
    setNewAccNameAr('');
    setShowAddAccountForm(false);
  };

  const handleExportTrialBalanceCSV = () => {
    const headers = ['Account Code', 'Account Name (AR)', 'Account Type', 'Debit', 'Credit'];
    const rows = trialBalance.rows.map((r) => [
      r.code,
      `"${r.nameAr.replace(/"/g, '""')}"`,
      r.type,
      r.debit,
      r.credit,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `RLM_TrialBalance_${currentTenant.code}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Organized Header Card: Row 1 Title & Actions + Row 2 Resizable Sub-tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="truncate">
                {language === 'ar'
                  ? 'المحاسبة والمالية ومراكز التكلفة (Double-Entry Engine)'
                  : 'Full Double-Entry Accounting & Cost Center Budgets'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 ps-10">
              {language === 'ar'
                ? 'شجرة حسابات معيارية، قيود يومية متوازنة، موازنات مراكز التكلفة والانحرافات، وقوائم مالية ختامية فورية'
                : 'Chart of accounts, balanced journal entries, cost center budget variance, and live financial statements'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsManualModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'ar' ? 'إنشاء قيد يومية يدوي' : 'New Manual Journal'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportTrialBalanceCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{language === 'ar' ? 'تصدير ميزان المراجعة CSV' : 'Export Trial Balance'}</span>
            </button>

            <button
              type="button"
              data-testid="accounting-whatsapp-report-btn"
              onClick={() =>
                openQuickSendModal({
                  channel: 'WHATSAPP',
                  category: 'FINANCIAL_REPORT',
                })
              }
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'ar' ? 'إرسال التقرير المالي' : 'Send Report via WhatsApp/SMS'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Resizable Accounting Sub-Tabs + Workspace Tab Resizer */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ar' ? 'سجل القيود اليومية' : 'Journal Entries'} ({journalEntries.length})
            </button>
            <button
              type="button"
              data-testid="acc-tab-budgets"
              onClick={() => setActiveTab('budgets')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'budgets'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'الموازنات التقديرية ومراكز التكلفة'
                  : 'Cost Center Budgets'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeTab === 'chart'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ar' ? 'شجرة الحسابات (COA)' : 'Chart of Accounts'} ({chartAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trialBalance')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeTab === 'trialBalance'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pnl')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeTab === 'pnl'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ar' ? 'قائمة الدخل (P&L)' : 'Income Statement'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('balanceSheet')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeTab === 'balanceSheet'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vatReturn')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeTab === 'vatReturn'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ar' ? 'الإقرار الضريبي VAT' : 'VAT Return'}
            </button>
            <button
              type="button"
              data-testid="acc-tab-bankAndPdc"
              onClick={() => setActiveTab('bankAndPdc')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'bankAndPdc'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 shrink-0" />
              <span>
                {language === 'ar' ? 'التسوية البنكية والشيكات (PDC)' : 'Bank Recon & PDC'}
              </span>
            </button>
            <button
              type="button"
              data-testid="acc-tab-multiCurrency"
              onClick={() => setActiveTab('multiCurrency')}
              className={`erp-resizable-tab px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'multiCurrency'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>
                {language === 'ar' ? 'العملات وفروق الصرف (FX)' : 'Multi-Currency & FX'}
              </span>
            </button>
          </div>

          <WorkspaceTabResizerBar testIdPrefix="accounting-workspace" />
        </div>
      </div>

      {accountingNotice && (
        <div
          data-testid="accounting-action-banner"
          className="p-3.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 text-xs font-bold flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{accountingNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAccountingNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: Journal Entries with Drill-down Lines */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">
                    {language === 'ar' ? 'رقم القيد / التاريخ' : 'Entry # / Date'}
                  </th>
                  <th className="py-3 px-4 text-start">
                    {language === 'ar' ? 'المصدر / البيان' : 'Source & Description'}
                  </th>
                  <th className="py-3 px-4 text-end">
                    {language === 'ar' ? 'إجمالي المدين' : 'Total Debit'}
                  </th>
                  <th className="py-3 px-4 text-end">
                    {language === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {language === 'ar' ? 'حالة الترحيل' : 'Status'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {language === 'ar' ? 'التفاصيل / العكس' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journalEntries.map((je) => {
                  const isExpanded = expandedJournalId === je.id;
                  return (
                    <React.Fragment key={je.id}>
                      <tr className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono text-sm">
                            {je.entryNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">{je.date}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{je.description}</div>
                          <div className="text-[10px] text-indigo-600 font-mono">
                            Source: {je.referenceType} • By: {je.createdByName}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-end font-black text-slate-900 font-mono">
                          {je.totalDebit.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-4 text-end font-black text-slate-900 font-mono">
                          {je.totalCredit.toLocaleString()} {currency}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {je.isReversed ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              {language === 'ar' ? 'معكوس' : 'Reversed'}
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {language === 'ar' ? 'مرحل ومتوازن ✅' : 'Posted & Balanced ✅'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedJournalId(isExpanded ? null : je.id)
                              }
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              <span>{language === 'ar' ? 'الأطراف' : 'Lines'}</span>
                            </button>
                            {!je.isReversed && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReversalTargetId(je.id);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 text-rose-600" />
                                <span>{language === 'ar' ? 'عكس القيد' : 'Reverse'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                              <div className="text-[11px] font-bold text-slate-700">
                                {language === 'ar'
                                  ? `تفصيل أطراف القيد المحاسبي (${je.entryNumber}):`
                                  : `Journal Entry Line Items (${je.entryNumber}):`}
                              </div>
                              <table className="w-full text-[11px]">
                                <thead className="bg-slate-100 text-slate-600 font-bold">
                                  <tr>
                                    <th className="py-1.5 px-3 text-start">الحساب</th>
                                    <th className="py-1.5 px-3 text-start">البيان الفرعي</th>
                                    <th className="py-1.5 px-3 text-end text-emerald-700">مدين (Debit)</th>
                                    <th className="py-1.5 px-3 text-end text-indigo-700">دائن (Credit)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                  {je.lines.map((line) => (
                                    <tr key={line.id}>
                                      <td className="py-1.5 px-3 font-sans font-bold text-slate-800">
                                        <span className="font-mono text-indigo-600 me-1.5">
                                          [{line.accountCode}]
                                        </span>
                                        {language === 'ar' ? line.accountNameAr : line.accountName}
                                      </td>
                                      <td className="py-1.5 px-3 font-sans text-slate-500">
                                        {line.memo || '-'}
                                      </td>
                                      <td className="py-1.5 px-3 text-end font-bold text-emerald-700">
                                        {line.debit > 0 ? `${line.debit.toLocaleString()} ${currency}` : '-'}
                                      </td>
                                      <td className="py-1.5 px-3 text-end font-bold text-indigo-700">
                                        {line.credit > 0 ? `${line.credit.toLocaleString()} ${currency}` : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Chart of Accounts */}
      {activeTab === 'chart' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'ar'
                  ? 'الدليل المحاسبي وشجرة الحسابات (Standard Chart of Accounts)'
                  : 'Standard Chart of Accounts (COA)'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAccountForm(!showAddAccountForm)}
              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة حساب مالي جديد' : 'Add Account'}</span>
            </button>
          </div>

          {showAddAccountForm && (
            <form
              onSubmit={handleAddChartAccount}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">رمز الحساب</label>
                <input
                  type="text"
                  required
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الحساب المالي</label>
                <input
                  type="text"
                  required
                  value={newAccNameAr}
                  onChange={(e) => setNewAccNameAr(e.target.value)}
                  placeholder="مثال: عهدة صندوق المصروفات النثرية"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">تصنيف الحساب</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="ASSET">أصول (ASSET)</option>
                  <option value="LIABILITY">التزامات / خصوم (LIABILITY)</option>
                  <option value="EQUITY">حقوق ملكية (EQUITY)</option>
                  <option value="REVENUE">إيرادات (REVENUE)</option>
                  <option value="EXPENSE">مصروفات (EXPENSE)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الرصيد الافتتاحي</label>
                <input
                  type="number"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                إدراج في الشجرة
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'رمز الحساب' : 'Code'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'المستوى' : 'Level'}</th>
                  <th className="py-3 px-4 text-end">{language === 'ar' ? 'الرصيد الفعلي المحدث' : 'Live Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {dynamicStatements.effectiveAccounts.map((acc) => {
                  const isParent = acc.level === 1 || acc.level === 2;
                  return (
                    <tr
                      key={acc.id}
                      className={isParent ? 'bg-slate-50/70 font-bold' : 'hover:bg-slate-50/40'}
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-800">{acc.code}</td>
                      <td className="py-2.5 px-4 font-sans">
                        <span style={{ paddingInlineStart: `${(acc.level - 1) * 16}px` }}>
                          {language === 'ar' ? acc.nameAr : acc.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans text-[11px] text-slate-600">
                        {acc.type}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-500">{acc.level}</td>
                      <td className="py-2.5 px-4 text-end font-bold text-slate-900">
                        {acc.effectiveBalance.toLocaleString()} {currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Trial Balance */}
      {activeTab === 'trialBalance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'ar' ? 'ميزان المراجعة بالأرصدة والحركات' : 'Trial Balance Report'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? 'التحقق الرياضي من تطابق مجموع الأرصدة المدينة والدائنة'
                  : 'Debit-Credit reconciliation proof'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{language === 'ar' ? 'الميزان متوازن بدقة 100%' : '100% Balanced'}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'رمز الحساب' : 'Code'}</th>
                  <th className="py-2.5 px-4 text-start">{language === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="py-2.5 px-4 text-end text-emerald-800">{language === 'ar' ? 'مدين (Debit)' : 'Debit'}</th>
                  <th className="py-2.5 px-4 text-end text-indigo-800">{language === 'ar' ? 'دائن (Credit)' : 'Credit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {trialBalance.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 font-bold text-slate-800">{row.code}</td>
                    <td className="py-2 px-4 font-sans text-slate-800">
                      {language === 'ar' ? row.nameAr : row.name}
                    </td>
                    <td className="py-2 px-4 text-end font-semibold text-emerald-700">
                      {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                    </td>
                    <td className="py-2 px-4 text-end font-semibold text-indigo-700">
                      {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black text-sm">
                <tr>
                  <td colSpan={2} className="py-3 px-4 font-sans">
                    {language === 'ar' ? 'المجموع الإجمالي المتطابق:' : 'Grand Totals (Balanced):'}
                  </td>
                  <td className="py-3 px-4 text-end font-mono text-emerald-400">
                    {trialBalance.grandDebit.toLocaleString()} {currency}
                  </td>
                  <td className="py-3 px-4 text-end font-mono text-emerald-400">
                    {trialBalance.grandCredit.toLocaleString()} {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Income Statement (P&L) */}
      {activeTab === 'pnl' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {language === 'ar'
                  ? 'قائمة الدخل والأرباح والخسائر التفاعلية (Income Statement)'
                  : 'Income Statement (P&L)'}
              </h3>
              <p className="text-xs text-slate-500">{currentTenant.legalName} • Live Fiscal Ledger</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> طباعة القائمة
            </button>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* Revenue Section */}
            <div className="space-y-1.5">
              <div className="font-bold font-sans text-slate-800 text-sm border-b border-slate-100 pb-1">
                {language === 'ar' ? '1. إيرادات المبيعات والتشغيل' : '1. Operating Revenue'}
              </div>
              {dynamicStatements.effectiveAccounts
                .filter((a) => a.type === 'REVENUE')
                .map((acc) => (
                  <div key={acc.id} className="flex justify-between text-slate-600 ps-4">
                    <span className="font-sans">{language === 'ar' ? acc.nameAr : acc.name}</span>
                    <span>{Math.abs(acc.effectiveBalance).toLocaleString()} {currency}</span>
                  </div>
                ))}
              <div className="flex justify-between font-bold text-slate-900 ps-4 pt-1 border-t border-slate-100">
                <span>{language === 'ar' ? 'إجمالي الإيرادات:' : 'Total Revenues:'}</span>
                <span className="text-emerald-700">
                  {dynamicStatements.revenues.toLocaleString()} {currency}
                </span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="space-y-1.5">
              <div className="font-bold font-sans text-slate-800 text-sm border-b border-slate-100 pb-1">
                {language === 'ar' ? '2. التكاليف والمصروفات التشغيلية' : '2. Operating Expenses & COGS'}
              </div>
              {dynamicStatements.effectiveAccounts
                .filter((a) => a.type === 'EXPENSE')
                .map((acc) => (
                  <div key={acc.id} className="flex justify-between text-slate-600 ps-4">
                    <span className="font-sans">{language === 'ar' ? acc.nameAr : acc.name}</span>
                    <span>{Math.abs(acc.effectiveBalance).toLocaleString()} {currency}</span>
                  </div>
                ))}
              <div className="flex justify-between font-bold text-slate-900 ps-4 pt-1 border-t border-slate-100">
                <span>{language === 'ar' ? 'إجمالي المصروفات:' : 'Total Expenses:'}</span>
                <span className="text-rose-700">
                  {dynamicStatements.expenses.toLocaleString()} {currency}
                </span>
              </div>
            </div>

            {/* Net Income */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center text-sm">
              <span className="font-bold font-sans">
                {language === 'ar' ? 'صافي الربح التشغيلي للفترة:' : 'Net Operating Profit:'}
              </span>
              <span className="font-black text-emerald-400 text-base">
                {dynamicStatements.netIncome.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Balance Sheet */}
      {activeTab === 'balanceSheet' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="text-center border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base text-slate-900">
              {language === 'ar'
                ? 'الميزانية العمومية والمركز المالي (Balance Sheet)'
                : 'Balance Sheet Statement'}
            </h3>
            <p className="text-xs text-slate-500">Assets = Liabilities + Equity</p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* Assets */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="font-bold font-sans text-emerald-950 text-sm">
                {language === 'ar' ? 'إجمالي الأصول (Assets)' : 'Total Assets'}
              </div>
              {dynamicStatements.effectiveAccounts
                .filter((a) => a.type === 'ASSET' && a.level >= 2)
                .map((acc) => (
                  <div key={acc.id} className="flex justify-between text-slate-700 ps-2">
                    <span className="font-sans">{language === 'ar' ? acc.nameAr : acc.name}</span>
                    <span>{acc.effectiveBalance.toLocaleString()} {currency}</span>
                  </div>
                ))}
              <div className="flex justify-between font-black text-emerald-900 border-t border-emerald-300 pt-1.5 text-sm">
                <span>Total Assets:</span>
                <span>{dynamicStatements.totalAssets.toLocaleString()} {currency}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="font-bold font-sans text-indigo-950 text-sm">
                {language === 'ar'
                  ? 'الالتزامات وحقوق الملكية (Liabilities & Equity)'
                  : 'Liabilities & Equity'}
              </div>
              <div className="flex justify-between text-slate-700 ps-2">
                <span>Total Liabilities (A/P, VAT, Accruals)</span>
                <span>{dynamicStatements.totalLiabilities.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-slate-700 ps-2">
                <span>Equity (Capital + Retained Earnings + Net Profit)</span>
                <span>{dynamicStatements.totalEquity.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between font-black text-indigo-950 border-t border-indigo-300 pt-1.5 text-sm">
                <span>Total Liabilities & Equity:</span>
                <span>
                  {(dynamicStatements.totalLiabilities + dynamicStatements.totalEquity).toLocaleString()}{' '}
                  {currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: VAT Return Report */}
      {activeTab === 'vatReturn' && (
        <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4 text-xs font-mono">
          <div className="text-center border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base text-slate-900 font-sans">
              {language === 'ar'
                ? 'إقرار ضريبة القيمة المضافة الحي (ZATCA VAT Return)'
                : 'Live VAT Return Tax Summary'}
            </h3>
            <p className="text-slate-500 font-sans">
              15% Standard Tax Rate • يتحدث تلقائياً مع كل فاتورة مبيعات أو أمر شراء
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
              <span className="font-sans font-bold text-slate-700">
                Output VAT (ضريبة المخرجات من فواتير المبيعات):
              </span>
              <span className="font-black text-slate-900">
                {dynamicStatements.outputVat.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
              <span className="font-sans font-bold text-slate-700">
                Input VAT (ضريبة المدخلات القابلة للاسترداد من المشتريات):
              </span>
              <span className="font-black text-emerald-700">
                -{dynamicStatements.inputVat.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-violet-50 border border-violet-200 rounded-xl font-sans font-black text-sm text-violet-950">
              <span>
                {language === 'ar'
                  ? 'صافي الضريبة الواجب سدادها لهيئة الزكاة والضريبة:'
                  : 'Net Tax Payable to ZATCA:'}
              </span>
              <span>
                {dynamicStatements.netVatPayable.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Bank Reconciliation & Post-Dated Checks (PDC) */}
      {activeTab === 'bankAndPdc' && (() => {
        const bankAcc =
          dynamicStatements.effectiveAccounts.find((a) => a.code === '1102') ||
          dynamicStatements.effectiveAccounts[0];
        const reconSummary = calculateBankReconciliationSummary(
          bankAcc?.effectiveBalance || 185000,
          bankStatementLines
        );
        return (
          <div className="space-y-6">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-bold">رصيد البنك بالدفاتر (1102)</div>
                <div className="text-lg font-black text-slate-900 font-mono mt-1">
                  {reconSummary.ledgerBankBalance.toLocaleString()} {currency}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-bold">إيداعات بنكية غير مطابقة</div>
                <div className="text-lg font-black text-emerald-700 font-mono mt-1">
                  +{reconSummary.unreconciledDeposits.toLocaleString()} {currency}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-bold">عمولات ومسحوبات غير مسجلة</div>
                <div className="text-lg font-black text-rose-700 font-mono mt-1">
                  -{reconSummary.unreconciledWithdrawals.toLocaleString()} {currency}
                </div>
              </div>
              <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xs">
                <div className="text-slate-300 font-bold">الرصيد البنكي المعدل بعد المطابقة</div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                  {reconSummary.adjustedLedgerTarget.toLocaleString()} {currency}
                </div>
              </div>
            </div>

            {/* Bank Statement Lines Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    مذكرة التسوية البنكية ومطابقة كشف حساب البنك (Bank Statement Reconciliation)
                  </h3>
                  <p className="text-xs text-slate-500">
                    انقر "مطابقة وترحيل قيد التسوية" على أي حركة بنكية معلقة لتوليد قيد يومية متوازن آلياً
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {reconSummary.unreconciledCount === 0
                    ? '✓ كشف الحساب مطابق 100%'
                    : `${reconSummary.unreconciledCount} حركات بانتظار التسوية`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-start">التاريخ / المرجع</th>
                      <th className="py-2.5 px-4 text-start">بيان كشف حساب البنك</th>
                      <th className="py-2.5 px-4 text-end">المبلغ</th>
                      <th className="py-2.5 px-4 text-center">الحالة</th>
                      <th className="py-2.5 px-4 text-center">الإجراء المحاسبي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankStatementLines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono">
                          <div className="font-bold text-slate-900">{line.reference}</div>
                          <div className="text-[10px] text-slate-400">{line.date}</div>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          {line.descriptionAr}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-end font-mono font-black ${
                            line.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {line.amount >= 0 ? '+' : ''}
                          {line.amount.toLocaleString()} {currency}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          {line.status === 'UNRECONCILED' ? (
                            <span className="text-amber-700">معلق (غير مطابق)</span>
                          ) : (
                            <span className="text-emerald-700">✓ مطابق ({line.matchedJournalEntryId})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {line.status === 'UNRECONCILED' ? (
                            <button
                              type="button"
                              data-testid={`reconcile-line-${line.id}`}
                              onClick={() => {
                                reconcileBankStatementLine(line.id);
                                setAccountingNotice(
                                  `تمت مطابقة حركة البنك (${line.reference}) وترحيل قيد التسوية للأستاذ العام بنجاح!`
                                );
                              }}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer"
                            >
                              مطابقة وترحيل قيد التسوية
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">تمت المطابقة</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Post-Dated Checks (PDC) Portfolio */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    حافظة الشيكات المؤجلة وأوراق القبض والدفع (Post-Dated Checks - PDC)
                  </h3>
                  <p className="text-xs text-slate-500">
                    متابعة استحقاق الشيكات الواردة من العملاء والصادرة للموردين مع الترحيل التلقائي لحساب البنك عند التحصيل أو الصرف
                  </p>
                </div>
              </div>

              {/* Quick Add PDC Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCheckNumber.trim() || !newCheckParty.trim()) return;
                  addPostDatedCheck({
                    checkNumber: newCheckNumber.trim(),
                    type: newCheckType,
                    partyName: newCheckParty.trim(),
                    bankName: newCheckBank.trim(),
                    amount: Number(newCheckAmount) || 5000,
                    currency,
                    issueDate: new Date().toISOString().slice(0, 10),
                    maturityDate: newCheckMaturity,
                  });
                  setAccountingNotice(
                    `تم تسجيل الشيك المؤجل (${newCheckNumber}) في حافظة الشيكات برسم التحصيل!`
                  );
                }}
                className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs items-end"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الشيك</label>
                  <input
                    type="text"
                    value={newCheckNumber}
                    onChange={(e) => setNewCheckNumber(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الشيك</label>
                  <select
                    value={newCheckType}
                    onChange={(e) => setNewCheckType(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="RECEIVABLE">شيك قبض (وارد من عميل)</option>
                    <option value="PAYABLE">شيك دفع (صادر لمورد)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">العميل / المستفيد</label>
                  <input
                    type="text"
                    value={newCheckParty}
                    onChange={(e) => setNewCheckParty(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المبلغ ({currency})</label>
                  <input
                    type="number"
                    value={newCheckAmount}
                    onChange={(e) => setNewCheckAmount(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={newCheckMaturity}
                    onChange={(e) => setNewCheckMaturity(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  + إدراج الشيك بالحافظة
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-start">رقم الشيك / البنك</th>
                      <th className="py-2.5 px-4 text-start">النوع والطرف المقابل</th>
                      <th className="py-2.5 px-4 text-center">تاريخ الاستحقاق</th>
                      <th className="py-2.5 px-4 text-end">المبلغ</th>
                      <th className="py-2.5 px-4 text-center">الحالة</th>
                      <th className="py-2.5 px-4 text-center">تحصيل / ترحيل للبنك</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {postDatedChecks.map((chk) => (
                      <tr key={chk.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4">
                          <div className="font-mono font-bold text-slate-900">{chk.checkNumber}</div>
                          <div className="text-[11px] text-slate-500">{chk.bankName}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{chk.partyName}</div>
                          <div className="text-[11px] text-indigo-600 font-bold">
                            {chk.type === 'RECEIVABLE' ? 'ورقة قبض (وارد)' : 'ورقة دفع (صادر)'}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700">
                          {chk.maturityDate}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono font-black text-slate-900">
                          {chk.amount.toLocaleString()} {chk.currency}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          {chk.status === 'CLEARED' ? (
                            <span className="text-emerald-700">✓ تم التحصيل والترحيل</span>
                          ) : chk.status === 'BOUNCED' ? (
                            <span className="text-rose-700">✕ مرتجع (Bounced)</span>
                          ) : (
                            <span className="text-amber-700">برسم التحصيل</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {chk.status === 'UNDER_COLLECTION' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                data-testid={`clear-pdc-${chk.id}`}
                                onClick={() => {
                                  const res = clearPostDatedCheck(chk.id);
                                  if (res.success) {
                                    setAccountingNotice(
                                      `تم تحصيل/صرف الشيك (${chk.checkNumber}) وترحيل القيد المحاسبي (${res.entryNumber}) إلى حساب البنك!`
                                    );
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                              >
                                تحصيل وترحيل القيد
                              </button>
                              <button
                                type="button"
                                onClick={() => bouncePostDatedCheck(chk.id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] cursor-pointer"
                              >
                                مرتجع
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">مكتمل</span>
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

      {/* TAB 8: Multi-Currency Exchange Rates & IAS 21 FX Revaluation */}
      {activeTab === 'multiCurrency' && (() => {
        const fxEval = calculateFXRevaluation(exchangeRates);
        const convertedResult = convertCurrencyAmount(convAmount, convFrom, convTo, exchangeRates);
        return (
          <div className="space-y-6">
            {/* Live Currency Converter & Active Display Currency */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <span>محول العملات الفوري المرتبط بأسعار الصرف المعتمدة</span>
                  </h3>
                  <span className="text-slate-500 font-mono">Base: SAR = 1.0000</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">المبلغ المراد تحويله</label>
                    <input
                      type="number"
                      value={convAmount}
                      onChange={(e) => setConvAmount(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">من العملة</label>
                    <select
                      value={convFrom}
                      onChange={(e) => setConvFrom(e.target.value as Currency)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    >
                      {exchangeRates.map((r) => (
                        <option key={r.currency} value={r.currency}>
                          {r.currency} - {r.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">إلى العملة</label>
                    <select
                      value={convTo}
                      onChange={(e) => setConvTo(e.target.value as Currency)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    >
                      {exchangeRates.map((r) => (
                        <option key={r.currency} value={r.currency}>
                          {r.currency} - {r.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between font-mono">
                  <span>
                    {convAmount.toLocaleString()} {convFrom} =
                  </span>
                  <span className="text-base font-black text-emerald-400">
                    {convertedResult.toLocaleString()} {convTo}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-2xs flex flex-col justify-between text-xs">
                <div className="space-y-1">
                  <div className="text-indigo-300 font-bold">إعادة تقييم العملات الأجنبية (IAS 21 FX Revaluation)</div>
                  <h3 className="text-base font-black">
                    صافي فروق أسعار الصرف غير المحققة:{' '}
                    <span className={fxEval.netGainLossSAR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {fxEval.netGainLossSAR >= 0 ? '+' : ''}
                      {fxEval.netGainLossSAR.toLocaleString()} SAR
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    يقوم المحرك بحساب فروق سعر الصرف للأرصدة النقدية بالعملات الأجنبية (USD, EUR, AED, EGP) وترحيل قيد أرباح أو خسائر فروق العملة.
                  </p>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    data-testid="post-fx-revaluation-btn"
                    onClick={() => {
                      const res = postFXRevaluationEntry();
                      if (res.success) {
                        setAccountingNotice(
                          `تم ترحيل قيد فروق إعادة تقييم العملات الأجنبية (${res.entryNumber}) بقيمة ${res.netGainLossSAR} ر.س بنجاح!`
                        );
                      } else {
                        setAccountingNotice('لا توجد فروق أسعار صرف جديدة غير مرحلة حالياً.');
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer"
                  >
                    إصدار وترحيل قيد فروق تقييم العملات (IAS 21)
                  </button>
                </div>
              </div>
            </div>

            {/* Exchange Rates Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900">
                  جدول أسعار الصرف والأرصدة النقدية بالعملات الأجنبية
                </h3>
                <span className="text-xs text-slate-500">يمكنك تعديل سعر الصرف اللحظي أو اعتماد العملة كعملة عرض للنظام</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-start">العملة</th>
                      <th className="py-2.5 px-4 text-center">سعر الصرف السابق (SAR)</th>
                      <th className="py-2.5 px-4 text-center">سعر الصرف الحالي (SAR)</th>
                      <th className="py-2.5 px-4 text-end">الرصيد الأجنبي بالخزينة/البنك</th>
                      <th className="py-2.5 px-4 text-end">فروق التقييم (SAR)</th>
                      <th className="py-2.5 px-4 text-center">اعتماد كعملة عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exchangeRates.map((rate) => {
                      const diffSAR = Math.round(
                        rate.foreignMonetaryBalance * (rate.rateToSAR - rate.previousRateToSAR) * 100
                      ) / 100;
                      return (
                        <tr key={rate.currency} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4">
                            <div className="font-black text-slate-900">
                              {rate.currency} ({rate.symbol})
                            </div>
                            <div className="text-[11px] text-slate-500">{rate.nameAr}</div>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                            {rate.previousRateToSAR}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {rate.currency === 'SAR' ? (
                              <span className="font-mono font-bold text-slate-900">1.0000</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                value={rate.rateToSAR}
                                onChange={(e) =>
                                  updateExchangeRate(rate.currency, Number(e.target.value))
                                }
                                className="w-24 p-1.5 text-center bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-end font-mono font-bold text-slate-800">
                            {rate.foreignMonetaryBalance.toLocaleString()} {rate.currency}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-end font-mono font-black ${
                              diffSAR > 0
                                ? 'text-emerald-700'
                                : diffSAR < 0
                                ? 'text-rose-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {diffSAR > 0 ? `+${diffSAR}` : diffSAR} SAR
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setCurrency(rate.currency)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                                currency === rate.currency
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-100 hover:bg-indigo-50 text-slate-700'
                              }`}
                            >
                              {currency === rate.currency ? '✓ العملة النشطة' : 'تفعيل العرض'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 9: Cost Center & Branch Budget vs. Actual Variance Engine */}
      {activeTab === 'budgets' && (() => {
        const budgetVariance = calculateCostCenterBudgetVariance(
          costCenterBudgets,
          journalEntries
        );
        const expenseAccounts = chartAccounts.filter((a) => a.type === 'EXPENSE');

        return (
          <div className="space-y-5" data-testid="cost-center-budgets-section">
            {/* Top 4-Card Swiss-Grid KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="text-slate-500">إجمالي الموازنة المعتمدة لمراكز التكلفة</div>
                <div
                  data-testid="budget-total-allocated"
                  className="text-lg font-bold text-slate-900 font-mono tabular-nums"
                >
                  {budgetVariance.totals.totalAllocated.toLocaleString()} {currency}
                </div>
                <div className="text-[11px] text-slate-400">
                  موزعة على {budgetVariance.rows.length} مراكز تكلفة وفروع رئيسية
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="text-slate-500">الإنفاق الفعلي + الالتزامات القائمة</div>
                <div
                  data-testid="budget-total-exposure"
                  className="text-lg font-bold text-slate-900 font-mono tabular-nums"
                >
                  {budgetVariance.totals.totalExposure.toLocaleString()} {currency}
                </div>
                <div className="text-[11px] text-slate-500">
                  الفعلي:{' '}
                  <span className="font-mono">
                    {budgetVariance.totals.totalActual.toLocaleString()}
                  </span>{' '}
                  · التزامات:{' '}
                  <span className="font-mono">
                    {budgetVariance.totals.totalCommitted.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="text-slate-500">صافي الانحراف والوفر المتبقي (Variance)</div>
                <div
                  data-testid="budget-remaining-variance"
                  className={`text-lg font-bold font-mono tabular-nums ${
                    budgetVariance.totals.totalRemainingVariance >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {budgetVariance.totals.totalRemainingVariance >= 0 ? '+' : ''}
                  {budgetVariance.totals.totalRemainingVariance.toLocaleString()} {currency}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  نسبة الاستهلاك الإجمالية: {budgetVariance.totals.overallUtilizationPercent}%
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-1">
                <div className="text-slate-500">حالة الرقابة المالية وتجاوز السقوف</div>
                <div className="text-lg font-bold font-mono tabular-nums text-rose-700">
                  {budgetVariance.totals.overBudgetCount} مركز متجاوز ·{' '}
                  <span className="text-amber-600">{budgetVariance.totals.warningCount} قرب السقف</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  تنبيه تلقائي عند بلوغ 85% من الموازنة المعتمدة
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* Cost Center Budget vs. Actual Table (8 cols) */}
              <div className="xl:col-span-8 bg-white rounded-lg border border-slate-200/90 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      جدول الموازنات التقديرية والانحرافات لمراكز التكلفة والفروع (Budget vs. Actual)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يمكنك تعديل سقف الموازنة المعتمد لأي مركز تكلفة مباشرة أو تحميل قيد مصروفات لاختبار الانحراف الفوري
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Fiscal: 2026-Q4</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-start">مركز التكلفة / الفرع</th>
                        <th className="py-2.5 px-3 text-end">الموازنة المعتمدة</th>
                        <th className="py-2.5 px-3 text-end">المنصرف الفعلي + الالتزام</th>
                        <th className="py-2.5 px-3 text-end">الانحراف (Variance)</th>
                        <th className="py-2.5 px-3 text-center">نسبة الاستهلاك</th>
                        <th className="py-2.5 px-3 text-center">الحالة الرقابية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budgetVariance.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-900">
                              {row.costCenterCode}
                            </div>
                            <div className="font-semibold text-slate-800">{row.costCenterNameAr}</div>
                            <div className="text-[10px] text-slate-400">
                              {row.branchNameAr} · {row.fiscalPeriod}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-end">
                            <input
                              type="number"
                              step={5000}
                              aria-label={`سقف موازنة ${row.costCenterCode}`}
                              value={row.allocatedBudget}
                              onChange={(e) =>
                                updateCostCenterBudgetCap(
                                  row.costCenterCode,
                                  Number(e.target.value)
                                )
                              }
                              className="w-28 px-2 py-1 text-end bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 tabular-nums"
                            />
                          </td>
                          <td className="py-3 px-3 text-end tabular-nums">
                            <div className="font-mono font-bold text-slate-900">
                              {row.totalExposure.toLocaleString()} {currency}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              فعلي:{' '}
                              <span className="font-mono">
                                {row.totalActualSpent.toLocaleString()}
                              </span>{' '}
                              · التزام:{' '}
                              <span className="font-mono">
                                {row.committedAmount.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td
                            className={`py-3 px-3 text-end font-mono font-bold tabular-nums ${
                              row.remainingVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            <div>
                              {row.remainingVariance >= 0 ? '+' : ''}
                              {row.remainingVariance.toLocaleString()} {currency}
                            </div>
                            <div className="text-[10px] font-normal">
                              ({row.variancePercent >= 0 ? '+' : ''}
                              {row.variancePercent}%)
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center w-36">
                            <div className="font-mono font-bold text-slate-900 text-[11px] mb-1 tabular-nums">
                              {row.utilizationPercent}%
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded overflow-hidden">
                              <div
                                className={`h-full ${
                                  row.status === 'OVER_BUDGET_CRITICAL'
                                    ? 'bg-rose-600'
                                    : row.status === 'WARNING_NEAR_LIMIT'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                                style={{
                                  width: `${Math.min(100, row.utilizationPercent)}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-[11px]">
                            {row.status === 'OVER_BUDGET_CRITICAL' && (
                              <span className="text-rose-700">تجاوز السقف المعتمد</span>
                            )}
                            {row.status === 'WARNING_NEAR_LIMIT' && (
                              <span className="text-amber-700">قرب السقف (85%+)</span>
                            )}
                            {row.status === 'WITHIN_BUDGET' && (
                              <span className="text-emerald-700">ضمن الموازنة الآمنة</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Direct Cost Center Expense Allocation Form (4 cols) */}
              <div className="xl:col-span-4 bg-white rounded-lg border border-slate-200/90 p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-slate-700" />
                    <span>تحميل مصروف تشغيلي على مركز تكلفة</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    يُنشئ قيد يومية مزدوج متوازن مربوط برمز مركز التكلفة ويحدث نسبة الاستهلاك والانحراف آلياً
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = postCostCenterExpense({
                      costCenterCode: selectedBudgetCC,
                      expenseAccountCode: ccExpenseAccCode,
                      amount: ccExpenseAmount,
                      paymentMethod: ccPaymentMethod,
                      description: ccExpenseDesc,
                    });
                    if (res.success) {
                      setAccountingNotice(
                        `تم ترحيل قيد المصروف رقم (${res.entryNumber}) بقيمة ${ccExpenseAmount.toLocaleString()} ${currency} وتحميله على مركز التكلفة [${selectedBudgetCC}] بنجاح!`
                      );
                    }
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      مركز التكلفة المستهدف
                    </label>
                    <select
                      data-testid="cc-expense-select"
                      value={selectedBudgetCC}
                      onChange={(e) => setSelectedBudgetCC(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white font-semibold"
                    >
                      {costCenterBudgets.map((b) => (
                        <option key={b.costCenterCode} value={b.costCenterCode}>
                          {b.costCenterCode} — {b.costCenterNameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      حساب المصروف (شجرة الحسابات)
                    </label>
                    <select
                      value={ccExpenseAccCode}
                      onChange={(e) => setCcExpenseAccCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white"
                    >
                      {expenseAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          [{acc.code}] {acc.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        قيمة المصروف ({currency})
                      </label>
                      <input
                        type="number"
                        min={100}
                        data-testid="cc-expense-amount-input"
                        value={ccExpenseAmount}
                        onChange={(e) => setCcExpenseAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono font-bold tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        طريقة الصرف
                      </label>
                      <select
                        value={ccPaymentMethod}
                        onChange={(e) => setCcPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white"
                      >
                        <option value="BANK">حوالة بنكية (1102)</option>
                        <option value="CASH">نقداً من الصندوق (1101)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      البيان / سبب الصرف
                    </label>
                    <input
                      type="text"
                      value={ccExpenseDesc}
                      onChange={(e) => setCcExpenseDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-300"
                    />
                  </div>

                  <button
                    type="submit"
                    data-testid="post-cc-expense-btn"
                    className="w-full py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>اعتماد المصروف وتحديث انحراف الموازنة</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Manual Journal Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                {language === 'ar'
                  ? 'قيد يومية يدوي جديد (متوازن إجبارياً)'
                  : 'New Balanced Journal Entry'}
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'بيان / شرح القيد' : 'Entry Description'}
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly facility lease payment adjustment"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                />
              </div>

              {/* Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {language === 'ar' ? 'أطراف القيد المحاسبي:' : 'Journal Lines:'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-violet-600 hover:text-violet-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة طرف' : 'Add Line'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {lines.map((l, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
                    >
                      <select
                        value={l.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded text-xs outline-hidden font-medium"
                      >
                        {chartAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {language === 'ar' ? acc.nameAr : acc.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Debit"
                        value={l.debit || ''}
                        onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value))}
                        className="w-24 p-1.5 bg-white border border-slate-200 rounded text-xs text-end font-bold font-mono outline-hidden"
                      />
                      <input
                        type="number"
                        placeholder="Credit"
                        value={l.credit || ''}
                        onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value))}
                        className="w-24 p-1.5 bg-white border border-slate-200 rounded text-xs text-end font-bold font-mono outline-hidden"
                      />
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Verification Bar */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between font-mono font-bold ${
                  liveCheck.isValid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div>
                  <span>Debits: {liveCheck.totalDebit}</span> |{' '}
                  <span>Credits: {liveCheck.totalCredit}</span>
                </div>
                <div>
                  {liveCheck.isValid ? (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> Balanced ✅
                    </span>
                  ) : (
                    <span>Diff: {liveCheck.difference.toFixed(2)} ❌</span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!liveCheck.isValid}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-40 cursor-pointer"
                >
                  {language === 'ar' ? 'ترحيل القيد المالي' : 'Post Journal Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Entry Confirmation Modal */}
      {reversalTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <RotateCcw className="w-5 h-5" />
              <span>
                {language === 'ar' ? 'تأكيد إنشاء قيد عكسي موثق' : 'Create Reversing Entry'}
              </span>
            </div>
            {reversalError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg font-bold">
                {reversalError}
              </div>
            )}
            <p className="text-slate-600">
              {language === 'ar'
                ? 'القواعد المحاسبية تمنع حذف القيود المرحلة. سيتم إصدار قيد عكسي مطابق ومبين لسبب التصحيح مع ربطه بالقيد الأصلي.'
                : 'Accounting standards prohibit deleting posted entries. A balanced reversing entry will be generated.'}
            </p>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'سبب العكس المحاسبي:' : 'Audit Reversal Reason:'}
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                rows={3}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReversalTargetId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {language === 'ar' ? 'تأكيد وترحيل القيد العكسي' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
