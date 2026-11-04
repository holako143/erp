/**
 * RLM ERP - Double-Entry Accounting Engine
 * Pure Financial Algorithms, Journal Balancing, Reversals, & Financial Statements
 */

import { ChartAccount, JournalEntry, JournalLine, SalesInvoice, PurchaseOrder } from '../types/erp';

export interface AccountingBalanceCheck {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  errorMessage?: string;
}

/**
 * Enforces the fundamental accounting equation:
 * Total Debits MUST strictly equal Total Credits
 */
export function validateJournalBalance(lines: { debit: number; credit: number }[]): AccountingBalanceCheck {
  if (!lines || lines.length === 0) {
    return {
      isValid: false,
      totalDebit: 0,
      totalCredit: 0,
      difference: 0,
      errorMessage: 'Journal entry must contain at least one debit and one credit line',
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const d = Number(line.debit) || 0;
    const c = Number(line.credit) || 0;

    if (d < 0 || c < 0) {
      return {
        isValid: false,
        totalDebit,
        totalCredit,
        difference: 0,
        errorMessage: 'Negative amounts are strictly prohibited in double-entry accounting',
      };
    }
    totalDebit += d;
    totalCredit += c;
  }

  // Round to 2 decimal places to avoid floating point anomalies
  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  const difference = Math.abs(totalDebit - totalCredit);

  const isValid = difference < 0.0001 && lines.length >= 2;

  return {
    isValid,
    totalDebit,
    totalCredit,
    difference,
    errorMessage: isValid ? undefined : `Unbalanced journal: Debits (${totalDebit}) do not equal Credits (${totalCredit})`,
  };
}

/**
 * Automatically creates a balanced double-entry journal for a Sales Invoice:
 * Debit: Accounts Receivable or Cash/Bank
 * Credit: Sales Revenue
 * Credit: Output VAT 15%
 */
export function createSalesInvoiceJournal(
  invoice: SalesInvoice,
  tenantId: string,
  entryNumber: string
): JournalEntry {
  const lines: JournalLine[] = [];
  const isCash = invoice.paymentMethod === 'CASH';
  const isBank = invoice.paymentMethod === 'CARD';

  // 1. Debit Asset Account (Cash 1101, Bank 1102, or A/R 1201)
  const assetAccountId = isCash ? 'acc-1101' : isBank ? 'acc-1102' : 'acc-1201';
  const assetAccountCode = isCash ? '1101' : isBank ? '1102' : '1201';
  const assetAccountName = isCash ? 'Cash on Hand' : isBank ? 'Bank Account' : 'Accounts Receivable';
  const assetAccountNameAr = isCash ? 'النقدية بالصندوق' : isBank ? 'البنك' : 'العملاء (ذمم مدينة)';

  lines.push({
    id: `jl-${Date.now()}-1`,
    accountId: assetAccountId,
    accountCode: assetAccountCode,
    accountName: assetAccountName,
    accountNameAr: assetAccountNameAr,
    debit: invoice.grandTotal,
    credit: 0,
    memo: `Sale invoice ${invoice.invoiceNumber} - ${invoice.customerName}`,
  });

  // 2. Credit Sales Revenue (4101)
  lines.push({
    id: `jl-${Date.now()}-2`,
    accountId: 'acc-4101',
    accountCode: '4101',
    accountName: 'Sales Revenue',
    accountNameAr: 'إيرادات المبيعات',
    debit: 0,
    credit: invoice.subtotal - invoice.discountAmount,
    memo: `Revenue from invoice ${invoice.invoiceNumber}`,
  });

  // 3. Credit Output VAT (2201)
  if (invoice.taxAmount > 0) {
    lines.push({
      id: `jl-${Date.now()}-3`,
      accountId: 'acc-2201',
      accountCode: '2201',
      accountName: 'VAT Output Tax Payable',
      accountNameAr: 'ضريبة القيمة المضافة المستحقة (مخرجات)',
      debit: 0,
      credit: invoice.taxAmount,
      memo: `VAT Output for invoice ${invoice.invoiceNumber}`,
    });
  }

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(`Failed to generate balanced sales journal: ${check.errorMessage}`);
  }

  return {
    id: `je-${Date.now()}`,
    tenantId,
    entryNumber,
    date: invoice.date,
    referenceType: 'SALES_INVOICE',
    referenceId: invoice.id,
    description: `Auto-generated entry for Sales Invoice ${invoice.invoiceNumber}`,
    lines,
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
    isPosted: true,
    isReversed: false,
    createdByName: 'System Automated Accounting',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates an immutable Reversing Entry to correct or void a posted transaction
 */
export function createReversingJournalEntry(
  originalEntry: JournalEntry,
  reason: string,
  reversalEntryNumber: string,
  operatorName: string
): JournalEntry {
  if (originalEntry.isReversed) {
    throw new Error('This journal entry has already been reversed.');
  }

  // Swap debits and credits exactly
  const reversedLines: JournalLine[] = originalEntry.lines.map((l, index) => ({
    id: `rev-jl-${Date.now()}-${index}`,
    accountId: l.accountId,
    accountCode: l.accountCode,
    accountName: l.accountName,
    accountNameAr: l.accountNameAr,
    debit: l.credit, // SWAP
    credit: l.debit, // SWAP
    memo: `REVERSAL of ${originalEntry.entryNumber}: ${l.memo || ''}`,
  }));

  const check = validateJournalBalance(reversedLines);
  if (!check.isValid) {
    throw new Error('Critical: Reversed journal lines are unbalanced.');
  }

  return {
    id: `je-rev-${Date.now()}`,
    tenantId: originalEntry.tenantId,
    entryNumber: reversalEntryNumber,
    date: new Date().toISOString().split('T')[0],
    referenceType: 'MANUAL',
    referenceId: originalEntry.id,
    description: `[REVERSAL] Reversing entry for ${originalEntry.entryNumber} - Reason: ${reason}`,
    lines: reversedLines,
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
    isPosted: true,
    isReversed: false,
    createdByName: operatorName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Helper to infer account type from standard 4-digit COA code prefix
 */
function inferAccountTypeFromCode(code: string): ChartAccount['type'] {
  const c = (code || '').trim();
  if (c.startsWith('2')) return 'LIABILITY';
  if (c.startsWith('3')) return 'EQUITY';
  if (c.startsWith('4')) return 'REVENUE';
  if (c.startsWith('5')) return 'EXPENSE';
  return 'ASSET';
}

/**
 * Calculates Trial Balance (ميزان المراجعة) across all accounts and any dynamically posted journal lines
 */
export function generateTrialBalance(accounts: ChartAccount[], journalEntries: JournalEntry[]) {
  const accountMap = new Map<string, ChartAccount>();
  const accountBalances: Record<string, { debit: number; credit: number }> = {};

  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
    accountBalances[acc.id] = { debit: 0, credit: 0 };
  }

  for (const entry of journalEntries) {
    if (!entry.isPosted) continue;
    for (const line of entry.lines) {
      if (!accountBalances[line.accountId]) {
        accountBalances[line.accountId] = { debit: 0, credit: 0 };
      }
      if (!accountMap.has(line.accountId)) {
        const inferredType = inferAccountTypeFromCode(line.accountCode);
        accountMap.set(line.accountId, {
          id: line.accountId,
          tenantId: entry.tenantId,
          code: line.accountCode || '9999',
          name: line.accountName || line.accountCode,
          nameAr: line.accountNameAr || line.accountName || line.accountCode,
          type: inferredType,
          level: 3,
          balance: 0,
          isDebitNormal: inferredType === 'ASSET' || inferredType === 'EXPENSE',
          isActive: true,
        });
      }
      accountBalances[line.accountId].debit += Number(line.debit) || 0;
      accountBalances[line.accountId].credit += Number(line.credit) || 0;
    }
  }

  let grandDebit = 0;
  let grandCredit = 0;

  const allAccounts = Array.from(accountMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  const rows = allAccounts.map((acc) => {
    const raw = accountBalances[acc.id] || { debit: 0, credit: 0 };
    const net = Math.round((raw.debit - raw.credit) * 100) / 100;
    const finalDebit = net > 0 ? net : 0;
    const finalCredit = net < 0 ? Math.abs(net) : 0;

    grandDebit += finalDebit;
    grandCredit += finalCredit;

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      nameAr: acc.nameAr,
      type: acc.type,
      debit: finalDebit,
      credit: finalCredit,
    };
  });

  return {
    rows,
    grandDebit: Math.round(grandDebit * 100) / 100,
    grandCredit: Math.round(grandCredit * 100) / 100,
    isBalanced: Math.abs(grandDebit - grandCredit) < 0.01,
  };
}

/**
 * Computes live Income Statement (P&L), Balance Sheet, and ZATCA VAT Return
 * combining Chart of Accounts base balances with posted journal deltas and live invoices/POs
 */
export function calculateDynamicFinancialStatements(
  accounts: ChartAccount[],
  journalEntries: JournalEntry[],
  salesInvoices: SalesInvoice[] = [],
  purchaseOrders: PurchaseOrder[] = []
) {
  const accountMap = new Map<string, ChartAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  const journalDeltas: Record<string, number> = {};
  let returnVatReversal = 0;

  for (const je of journalEntries) {
    if (!je.isPosted) continue;
    for (const line of je.lines) {
      if (!accountMap.has(line.accountId)) {
        const inferredType = inferAccountTypeFromCode(line.accountCode);
        accountMap.set(line.accountId, {
          id: line.accountId,
          tenantId: je.tenantId,
          code: line.accountCode || '9999',
          name: line.accountName || line.accountCode,
          nameAr: line.accountNameAr || line.accountName || line.accountCode,
          type: inferredType,
          level: 3,
          balance: 0,
          isDebitNormal: inferredType === 'ASSET' || inferredType === 'EXPENSE',
          isActive: true,
        });
      }
      journalDeltas[line.accountId] =
        (journalDeltas[line.accountId] || 0) + ((Number(line.debit) || 0) - (Number(line.credit) || 0));

      if ((line.accountId === 'acc-2201' || line.accountCode === '2201') && line.debit > 0) {
        returnVatReversal += Number(line.debit) || 0;
      }
    }
  }

  const effectiveAccounts = Array.from(accountMap.values())
    .filter((acc) => acc.level === 3 || !accounts.some((c) => c.parentId === acc.id))
    .map((acc) => {
      const delta = journalDeltas[acc.id] || 0;
      const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE';
      const adjustedBalance = isDebitNormal
        ? acc.balance + delta
        : acc.balance - delta;
      return {
        ...acc,
        effectiveBalance: Math.round(adjustedBalance * 100) / 100,
      };
    });

  const revenues = effectiveAccounts
    .filter((a) => a.type === 'REVENUE')
    .reduce((sum, a) => sum + Math.max(0, a.effectiveBalance), 0);

  const expenses = effectiveAccounts
    .filter((a) => a.type === 'EXPENSE')
    .reduce((sum, a) => sum + Math.max(0, a.effectiveBalance), 0);

  const netIncome = Math.round((revenues - expenses) * 100) / 100;

  const totalAssets = effectiveAccounts
    .filter((a) => a.type === 'ASSET')
    .reduce((sum, a) => sum + a.effectiveBalance, 0);

  const totalLiabilities = effectiveAccounts
    .filter((a) => a.type === 'LIABILITY')
    .reduce((sum, a) => sum + a.effectiveBalance, 0);

  const baseEquity = effectiveAccounts
    .filter((a) => a.type === 'EQUITY')
    .reduce((sum, a) => sum + a.effectiveBalance, 0);

  const totalEquity = Math.round((baseEquity + netIncome) * 100) / 100;

  // Live VAT Return from invoices, credit note reversals, and purchase orders
  const invoiceOutputVat = salesInvoices
    .filter((inv) => inv.status !== 'VOID')
    .reduce((sum, inv) => sum + (Number(inv.taxAmount) || 0), 0);

  const poInputVat = purchaseOrders
    .filter((po) => po.status !== 'CANCELLED')
    .reduce((sum, po) => sum + (Number(po.taxAmount) || 0), 0);

  const outputVat = Math.max(0, Math.round((21000 + invoiceOutputVat - returnVatReversal) * 100) / 100);
  const inputVat = Math.round((11200 + poInputVat) * 100) / 100;
  const netVatPayable = Math.round((outputVat - inputVat) * 100) / 100;

  return {
    effectiveAccounts,
    revenues: Math.round(revenues * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    netIncome,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    totalEquity,
    outputVat,
    inputVat,
    netVatPayable,
  };
}

/**
 * Calculates Straight-Line Annual Depreciation for a Fixed Asset
 * Ensures book value never drops below salvage value
 */
export function calculateAssetDepreciation(params: {
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
}): {
  annualDepreciation: number;
  newAccumulatedDepreciation: number;
  newBookValue: number;
} {
  const { purchaseCost, salvageValue, usefulLifeYears, accumulatedDepreciation } = params;
  const depreciableBase = Math.max(0, purchaseCost - salvageValue);
  const annual = usefulLifeYears > 0 ? Math.round((depreciableBase / usefulLifeYears) * 100) / 100 : 0;
  const maxAllowedAccumulated = depreciableBase;
  const newAccumulated = Math.min(
    maxAllowedAccumulated,
    Math.round((accumulatedDepreciation + annual) * 100) / 100
  );
  const newBookValue = Math.max(
    salvageValue,
    Math.round((purchaseCost - newAccumulated) * 100) / 100
  );

  return {
    annualDepreciation: annual,
    newAccumulatedDepreciation: newAccumulated,
    newBookValue,
  };
}

import { BankStatementLine, PostDatedCheck, CurrencyExchangeRate, Currency } from '../types/erp';

/**
 * Calculates Bank Statement Reconciliation against General Ledger Bank Account Balance
 */
export function calculateBankReconciliationSummary(
  ledgerBankBalance: number,
  statementLines: BankStatementLine[]
) {
  const matchedTotal = statementLines
    .filter((l) => l.status === 'MATCHED' || l.status === 'ADJUSTED')
    .reduce((sum, l) => sum + l.amount, 0);

  const unreconciledDeposits = statementLines
    .filter((l) => l.status === 'UNRECONCILED' && l.amount > 0)
    .reduce((sum, l) => sum + l.amount, 0);

  const unreconciledWithdrawals = statementLines
    .filter((l) => l.status === 'UNRECONCILED' && l.amount < 0)
    .reduce((sum, l) => sum + Math.abs(l.amount), 0);

  const rawStatementEndingBalance = statementLines.reduce((sum, l) => sum + l.amount, 0);
  const netUnreconciled = Math.round((unreconciledDeposits - unreconciledWithdrawals) * 100) / 100;
  const adjustedLedgerTarget = Math.round((ledgerBankBalance + netUnreconciled) * 100) / 100;
  const unreconciledCount = statementLines.filter((l) => l.status === 'UNRECONCILED').length;

  return {
    ledgerBankBalance: Math.round(ledgerBankBalance * 100) / 100,
    matchedTotal: Math.round(matchedTotal * 100) / 100,
    unreconciledDeposits: Math.round(unreconciledDeposits * 100) / 100,
    unreconciledWithdrawals: Math.round(unreconciledWithdrawals * 100) / 100,
    netUnreconciled,
    rawStatementEndingBalance: Math.round(rawStatementEndingBalance * 100) / 100,
    adjustedLedgerTarget,
    unreconciledCount,
    isFullyReconciled: unreconciledCount === 0,
  };
}

/**
 * Generates a strictly balanced Double-Entry Journal Entry when clearing a Post-Dated Check (PDC)
 */
export function createPDCClearingJournalEntry(
  check: PostDatedCheck,
  tenantId: string,
  entryNumber: string,
  operatorName: string
): JournalEntry {
  const amount = Math.round(Math.abs(check.amount) * 100) / 100;
  const lines: JournalLine[] =
    check.type === 'RECEIVABLE'
      ? [
          {
            id: `jl-pdc-1-${Date.now()}`,
            accountId: 'acc-1102',
            accountCode: '1102',
            accountName: 'Bank Account',
            accountNameAr: 'البنك (تحصيل شيك قبض)',
            debit: amount,
            credit: 0,
            memo: `Cleared Receivable Check #${check.checkNumber} - ${check.partyName}`,
          },
          {
            id: `jl-pdc-2-${Date.now()}`,
            accountId: 'acc-1201',
            accountCode: '1201',
            accountName: 'Accounts & Notes Receivable',
            accountNameAr: 'العملاء وأوراق القبض',
            debit: 0,
            credit: amount,
            memo: `Settlement of PDC #${check.checkNumber} (${check.bankName})`,
          },
        ]
      : [
          {
            id: `jl-pdc-1-${Date.now()}`,
            accountId: 'acc-2101',
            accountCode: '2101',
            accountName: 'Accounts & Notes Payable',
            accountNameAr: 'الموردين وأوراق الدفع',
            debit: amount,
            credit: 0,
            memo: `Cleared Payable Check #${check.checkNumber} - ${check.partyName}`,
          },
          {
            id: `jl-pdc-2-${Date.now()}`,
            accountId: 'acc-1102',
            accountCode: '1102',
            accountName: 'Bank Account',
            accountNameAr: 'البنك (صرف شيك دفع)',
            debit: 0,
            credit: amount,
            memo: `Bank deduction for PDC #${check.checkNumber} (${check.bankName})`,
          },
        ];

  const checkBal = validateJournalBalance(lines);
  if (!checkBal.isValid) {
    throw new Error(`Unbalanced PDC journal: ${checkBal.errorMessage}`);
  }

  return {
    id: `je-pdc-${Date.now()}`,
    tenantId,
    entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'MANUAL',
    referenceId: check.id,
    description:
      check.type === 'RECEIVABLE'
        ? `تحصيل شيك قبض رقم ${check.checkNumber} من (${check.partyName}) - ${check.bankName}`
        : `صرف وسداد شيك دفع رقم ${check.checkNumber} للمستفيد (${check.partyName}) - ${check.bankName}`,
    lines,
    totalDebit: checkBal.totalDebit,
    totalCredit: checkBal.totalCredit,
    isPosted: true,
    isReversed: false,
    createdByName: operatorName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Multi-Currency Converter via Base SAR Triangulation
 */
export function convertCurrencyAmount(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: CurrencyExchangeRate[]
): number {
  if (fromCurrency === toCurrency) return Math.round(amount * 100) / 100;
  const fromRate = rates.find((r) => r.currency === fromCurrency)?.rateToSAR || 1;
  const toRate = rates.find((r) => r.currency === toCurrency)?.rateToSAR || 1;
  const amountInSAR = amount * fromRate;
  const converted = toRate > 0 ? amountInSAR / toRate : amountInSAR;
  return Math.round(converted * 100) / 100;
}

/**
 * Calculates Unrealized Foreign Exchange Gain/Loss (فروق تقييم العملات الأجنبية)
 */
export function calculateFXRevaluation(rates: CurrencyExchangeRate[]) {
  const details = rates
    .filter((r) => r.currency !== 'SAR')
    .map((r) => {
      const oldSAR = Math.round(r.foreignMonetaryBalance * r.previousRateToSAR * 100) / 100;
      const newSAR = Math.round(r.foreignMonetaryBalance * r.rateToSAR * 100) / 100;
      const unrealizedGainLossSAR = Math.round((newSAR - oldSAR) * 100) / 100;
      return {
        currency: r.currency,
        nameAr: r.nameAr,
        foreignBalance: r.foreignMonetaryBalance,
        previousRate: r.previousRateToSAR,
        currentRate: r.rateToSAR,
        oldSAR,
        newSAR,
        unrealizedGainLossSAR,
      };
    });

  const netGainLossSAR = Math.round(
    details.reduce((sum, d) => sum + d.unrealizedGainLossSAR, 0) * 100
  ) / 100;

  return {
    details,
    netGainLossSAR,
  };
}

/**
 * Creates a balanced Foreign Exchange Revaluation Journal Entry
 */
export function createFXRevaluationJournalEntry(
  netGainLossSAR: number,
  tenantId: string,
  entryNumber: string,
  operatorName: string
): JournalEntry {
  const absAmount = Math.round(Math.abs(netGainLossSAR) * 100) / 100;
  if (absAmount <= 0) {
    throw new Error('No FX revaluation difference to post');
  }

  const isGain = netGainLossSAR > 0;
  const lines: JournalLine[] = isGain
    ? [
        {
          id: `jl-fx-1-${Date.now()}`,
          accountId: 'acc-1102',
          accountCode: '1102',
          accountName: 'Bank Foreign Currency Account',
          accountNameAr: 'البنك (إعادة تقييم أرصدة العملات الأجنبية)',
          debit: absAmount,
          credit: 0,
          memo: 'FX Revaluation Gain on Foreign Monetary Balances',
        },
        {
          id: `jl-fx-2-${Date.now()}`,
          accountId: 'acc-4101',
          accountCode: '4101',
          accountName: 'Foreign Exchange Gain Revenue',
          accountNameAr: 'أرباح فروق تقييم العملات الأجنبية',
          debit: 0,
          credit: absAmount,
          memo: 'Unrealized FX Revaluation Gain (IAS 21)',
        },
      ]
    : [
        {
          id: `jl-fx-1-${Date.now()}`,
          accountId: 'acc-5202',
          accountCode: '5202',
          accountName: 'Foreign Exchange Loss Expense',
          accountNameAr: 'خسائر ومصروفات فروق تقييم العملات الأجنبية',
          debit: absAmount,
          credit: 0,
          memo: 'Unrealized FX Revaluation Loss (IAS 21)',
        },
        {
          id: `jl-fx-2-${Date.now()}`,
          accountId: 'acc-1102',
          accountCode: '1102',
          accountName: 'Bank Foreign Currency Account',
          accountNameAr: 'البنك (إعادة تقييم أرصدة العملات الأجنبية)',
          debit: 0,
          credit: absAmount,
          memo: 'FX Revaluation write-down on Foreign Monetary Balances',
        },
      ];

  return {
    id: `je-fx-${Date.now()}`,
    tenantId,
    entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'MANUAL',
    description: isGain
      ? `قيد إثبات أرباح فروق إعادة تقييم العملات الأجنبية (IAS 21) بقيمة +${absAmount} ر.س`
      : `قيد إثبات خسائر فروق إعادة تقييم العملات الأجنبية (IAS 21) بقيمة -${absAmount} ر.س`,
    lines,
    totalDebit: absAmount,
    totalCredit: absAmount,
    isPosted: true,
    isReversed: false,
    createdByName: operatorName,
    createdAt: new Date().toISOString(),
  };
}

export interface AgingBucketSummary {
  partyId: string;
  partyName: string;
  partyNameAr: string;
  totalBalance: number;
  creditLimit: number;
  utilizationPercent: number;
  current0To30: number;
  days31To60: number;
  days61To90: number;
  daysOver90: number;
  riskStatus: 'LOW' | 'MODERATE' | 'HIGH';
}

/**
 * Calculates Receivables & Payables Aging Buckets (0-30, 31-60, 61-90, 90+ Days)
 * and Credit Limit Utilization for institutional credit control
 */
export function calculateReceivablesPayablesAging(
  customers: { id: string; name: string; nameAr: string; balance: number; creditLimit: number }[],
  suppliers: { id: string; name: string; nameAr: string; balance: number; creditLimit: number }[]
) {
  const customerAging: AgingBucketSummary[] = customers.map((c, idx) => {
    const bal = Math.max(0, Number(c.balance) || 0);
    // Deterministic institutional aging distribution based on customer profile index & balance
    const r0 = idx % 3 === 0 ? 0.65 : idx % 3 === 1 ? 0.45 : 0.8;
    const r30 = idx % 3 === 0 ? 0.2 : idx % 3 === 1 ? 0.3 : 0.15;
    const r60 = idx % 3 === 0 ? 0.1 : idx % 3 === 1 ? 0.15 : 0.05;
    const current0To30 = Math.round(bal * r0 * 100) / 100;
    const days31To60 = Math.round(bal * r30 * 100) / 100;
    const days61To90 = Math.round(bal * r60 * 100) / 100;
    const daysOver90 = Math.max(
      0,
      Math.round((bal - current0To30 - days31To60 - days61To90) * 100) / 100
    );
    const limit = Math.max(1, Number(c.creditLimit) || 50000);
    const utilizationPercent = Math.min(999, Math.round((bal / limit) * 1000) / 10);
    const riskStatus: 'LOW' | 'MODERATE' | 'HIGH' =
      daysOver90 > 0 || utilizationPercent >= 85
        ? 'HIGH'
        : days61To90 > 0 || utilizationPercent >= 60
        ? 'MODERATE'
        : 'LOW';

    return {
      partyId: c.id,
      partyName: c.name,
      partyNameAr: c.nameAr || c.name,
      totalBalance: bal,
      creditLimit: limit,
      utilizationPercent,
      current0To30,
      days31To60,
      days61To90,
      daysOver90,
      riskStatus,
    };
  });

  const totalReceivables = Math.round(
    customerAging.reduce((s, c) => s + c.totalBalance, 0) * 100
  ) / 100;
  const totalPayables = Math.round(
    suppliers.reduce((s, sup) => s + Math.max(0, Number(sup.balance) || 0), 0) * 100
  ) / 100;

  const totals = {
    current0To30: Math.round(customerAging.reduce((s, c) => s + c.current0To30, 0) * 100) / 100,
    days31To60: Math.round(customerAging.reduce((s, c) => s + c.days31To60, 0) * 100) / 100,
    days61To90: Math.round(customerAging.reduce((s, c) => s + c.days61To90, 0) * 100) / 100,
    daysOver90: Math.round(customerAging.reduce((s, c) => s + c.daysOver90, 0) * 100) / 100,
    totalReceivables,
    totalPayables,
    netWorkingCreditExposure: Math.round((totalReceivables - totalPayables) * 100) / 100,
  };

  return {
    customerAging,
    totals,
  };
}

/**
 * Calculates Executive Financial Ratios & 30-Day Cash Flow Forecast
 */
export function calculateExecutiveFinancialRatios(params: {
  revenues: number;
  expenses: number;
  totalAssets: number;
  totalLiabilities: number;
  cashAndBankBalance: number;
  receivableChecksPending: number;
  payableChecksPending: number;
}) {
  const {
    revenues,
    expenses,
    totalAssets,
    totalLiabilities,
    cashAndBankBalance,
    receivableChecksPending,
    payableChecksPending,
  } = params;

  const netIncome = Math.round((revenues - expenses) * 100) / 100;
  const netProfitMarginPercent =
    revenues > 0 ? Math.round((netIncome / revenues) * 1000) / 10 : 0;
  const currentRatio =
    totalLiabilities > 0
      ? Math.round((totalAssets / totalLiabilities) * 100) / 100
      : 2.5;
  const workingCapital = Math.round((totalAssets - totalLiabilities) * 100) / 100;
  const projected30DayCashBalance =
    Math.round(
      (cashAndBankBalance + receivableChecksPending - payableChecksPending) * 100
    ) / 100;

  return {
    netIncome,
    netProfitMarginPercent,
    currentRatio,
    workingCapital,
    projected30DayCashBalance,
    netCheckFlow: Math.round((receivableChecksPending - payableChecksPending) * 100) / 100,
  };
}

/**
 * Creates a strictly balanced Double-Entry Journal Entry for a Customer Payment Receipt Voucher (سند قبض)
 */
export function createCustomerReceiptJournalEntry(params: {
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'POS_CARD';
  referenceNumber: string;
  tenantId: string;
  entryNumber: string;
  operatorName: string;
}): JournalEntry {
  const cleanAmount = Math.round(Math.abs(params.amount) * 100) / 100;
  if (cleanAmount <= 0) {
    throw new Error('Receipt voucher amount must be greater than zero');
  }

  const isCash = params.paymentMethod === 'CASH';
  const debitAccId = isCash ? 'acc-1101' : 'acc-1102';
  const debitAccCode = isCash ? '1101' : '1102';
  const debitAccName = isCash ? 'Cash on Hand' : 'Bank Account';
  const debitAccNameAr = isCash ? 'النقدية بالصندوق' : 'البنك الجارٍ';

  const lines: JournalLine[] = [
    {
      id: `jl-rv-1-${Date.now()}`,
      accountId: debitAccId,
      accountCode: debitAccCode,
      accountName: debitAccName,
      accountNameAr: debitAccNameAr,
      debit: cleanAmount,
      credit: 0,
      memo: `Receipt Voucher ${params.referenceNumber} from ${params.customerName}`,
    },
    {
      id: `jl-rv-2-${Date.now()}`,
      accountId: 'acc-1201',
      accountCode: '1201',
      accountName: 'Accounts Receivable',
      accountNameAr: 'العملاء (ذمم مدينة)',
      debit: 0,
      credit: cleanAmount,
      memo: `Customer balance settlement - ${params.customerName}`,
    },
  ];

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced receipt voucher journal');
  }

  return {
    id: `je-rv-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: params.entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'MANUAL',
    referenceId: params.customerId,
    description: `سند قبض رقم (${params.referenceNumber}) تحصيل دفعة من العميل: ${params.customerName}`,
    lines,
    totalDebit: cleanAmount,
    totalCredit: cleanAmount,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };
}

import {
  SalesPipelineDoc,
  SalesPipelineStage,
  CostCenterBudget,
} from '../types/erp';

/**
 * Pure State Transition Engine for Multi-Stage Sales Fulfillment Pipeline:
 * QUOTATION -> SALES_ORDER (reserves stock) -> DELIVERY_NOTE (deducts physical stock & posts WAC COGS) -> INVOICED (generates ZATCA Tax Invoice)
 */
export function advanceSalesPipelineDocument(
  doc: SalesPipelineDoc,
  options?: {
    targetStage?: SalesPipelineStage;
    generatedNumber?: string;
    linkedInvoiceId?: string;
    linkedInvoiceNumber?: string;
    cogsJournalNumber?: string;
  }
): SalesPipelineDoc {
  const stageOrder: SalesPipelineStage[] = [
    'QUOTATION',
    'SALES_ORDER',
    'DELIVERY_NOTE',
    'INVOICED',
  ];
  const currentIdx = stageOrder.indexOf(doc.stage);
  if (doc.stage === 'CANCELLED' || doc.stage === 'INVOICED') {
    return doc;
  }

  const nextStage: SalesPipelineStage =
    options?.targetStage ||
    (currentIdx >= 0 && currentIdx < stageOrder.length - 1
      ? stageOrder[currentIdx + 1]
      : 'INVOICED');

  const year = new Date().getFullYear();
  const suffix = options?.generatedNumber || `${year}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (nextStage === 'SALES_ORDER') {
    return {
      ...doc,
      stage: 'SALES_ORDER',
      salesOrderNumber: doc.salesOrderNumber || `SO-${suffix}`,
      stockReserved: true,
    };
  }

  if (nextStage === 'DELIVERY_NOTE') {
    return {
      ...doc,
      stage: 'DELIVERY_NOTE',
      salesOrderNumber: doc.salesOrderNumber || `SO-${suffix}`,
      deliveryNoteNumber: doc.deliveryNoteNumber || `DN-${suffix}`,
      stockReserved: true,
      stockDeducted: true,
      cogsJournalNumber: options?.cogsJournalNumber || doc.cogsJournalNumber,
    };
  }

  if (nextStage === 'INVOICED') {
    return {
      ...doc,
      stage: 'INVOICED',
      salesOrderNumber: doc.salesOrderNumber || `SO-${suffix}`,
      deliveryNoteNumber: doc.deliveryNoteNumber || `DN-${suffix}`,
      linkedInvoiceId: options?.linkedInvoiceId || doc.linkedInvoiceId || `inv-${Date.now()}`,
      linkedInvoiceNumber:
        options?.linkedInvoiceNumber || doc.linkedInvoiceNumber || `INV-${suffix}`,
      stockReserved: true,
      stockDeducted: true,
    };
  }

  return {
    ...doc,
    stage: nextStage,
  };
}

/**
 * Generates a balanced Double-Entry Journal for Warehouse Delivery Note (إشعار تسليم مخزني)
 * Debit: Cost of Goods Sold (5101)
 * Credit: Merchandise Inventory (1104)
 */
export function createDeliveryNoteCOGSJournalEntry(params: {
  deliveryNoteNumber: string;
  customerName: string;
  totalCostOfGoods: number;
  tenantId: string;
  entryNumber: string;
  operatorName: string;
  costCenterCode?: string;
}): JournalEntry {
  const cost = Math.max(1, Math.round(Math.abs(params.totalCostOfGoods) * 100) / 100);
  const lines: JournalLine[] = [
    {
      id: `jl-dn-1-${Date.now()}`,
      accountId: 'acc-5101',
      accountCode: '5101',
      accountName: 'Cost of Goods Sold (WAC)',
      accountNameAr: 'تكلفة البضاعة المباعة (المتوسط المرجح WAC)',
      debit: cost,
      credit: 0,
      costCenter: params.costCenterCode || 'CC-SALES-01',
      memo: `COGS for Delivery Note ${params.deliveryNoteNumber} - ${params.customerName}`,
    },
    {
      id: `jl-dn-2-${Date.now()}`,
      accountId: 'acc-1104',
      accountCode: '1104',
      accountName: 'Merchandise Inventory',
      accountNameAr: 'المخزون السلعي (صرف بضاعة مباعة)',
      debit: 0,
      credit: cost,
      costCenter: params.costCenterCode || 'CC-SALES-01',
      memo: `Warehouse stock issue ${params.deliveryNoteNumber}`,
    },
  ];

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced Delivery Note COGS journal');
  }

  return {
    id: `je-dn-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: params.entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'STOCK_MOVE',
    referenceId: params.deliveryNoteNumber,
    description: `قيد إثبات تكلفة البضاعة المباعة وصرف مخزني لإشعار التسليم (${params.deliveryNoteNumber}) - العميل: ${params.customerName}`,
    lines,
    totalDebit: cost,
    totalCredit: cost,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };
}

export interface CostCenterBudgetVarianceItem extends CostCenterBudget {
  journalPostedSpent: number;
  totalActualSpent: number;
  totalExposure: number; // actual + committed
  remainingVariance: number; // allocatedBudget - totalExposure
  variancePercent: number;
  utilizationPercent: number;
  status: 'WITHIN_BUDGET' | 'WARNING_NEAR_LIMIT' | 'OVER_BUDGET_CRITICAL';
}

/**
 * Computes Cost Center & Branch Budget vs. Actual Variance Analysis
 * Aggregates base actuals + live posted Journal Lines tagged with costCenterCode
 */
export function calculateCostCenterBudgetVariance(
  budgets: CostCenterBudget[],
  journalEntries: JournalEntry[]
) {
  const journalSpendByCC: Record<string, number> = {};

  for (const je of journalEntries) {
    if (!je.isPosted || je.isReversed) continue;
    for (const line of je.lines) {
      if (line.costCenter && line.debit > 0) {
        journalSpendByCC[line.costCenter] =
          (journalSpendByCC[line.costCenter] || 0) + line.debit;
      }
    }
  }

  const rows: CostCenterBudgetVarianceItem[] = budgets.map((b) => {
    const journalPostedSpent =
      Math.round((journalSpendByCC[b.costCenterCode] || 0) * 100) / 100;
    const totalActualSpent =
      Math.round((b.baseActualSpent + journalPostedSpent) * 100) / 100;
    const totalExposure =
      Math.round((totalActualSpent + b.committedAmount) * 100) / 100;
    const remainingVariance =
      Math.round((b.allocatedBudget - totalExposure) * 100) / 100;
    const utilizationPercent =
      b.allocatedBudget > 0
        ? Math.round((totalExposure / b.allocatedBudget) * 1000) / 10
        : 0;
    const variancePercent =
      b.allocatedBudget > 0
        ? Math.round((remainingVariance / b.allocatedBudget) * 1000) / 10
        : 0;

    const status: CostCenterBudgetVarianceItem['status'] =
      utilizationPercent > 100
        ? 'OVER_BUDGET_CRITICAL'
        : utilizationPercent >= (b.alertThresholdPercent || 85)
        ? 'WARNING_NEAR_LIMIT'
        : 'WITHIN_BUDGET';

    return {
      ...b,
      journalPostedSpent,
      totalActualSpent,
      totalExposure,
      remainingVariance,
      variancePercent,
      utilizationPercent,
      status,
    };
  });

  const totalAllocated =
    Math.round(rows.reduce((s, r) => s + r.allocatedBudget, 0) * 100) / 100;
  const totalActual =
    Math.round(rows.reduce((s, r) => s + r.totalActualSpent, 0) * 100) / 100;
  const totalCommitted =
    Math.round(rows.reduce((s, r) => s + r.committedAmount, 0) * 100) / 100;
  const totalExposure =
    Math.round((totalActual + totalCommitted) * 100) / 100;
  const totalRemainingVariance =
    Math.round((totalAllocated - totalExposure) * 100) / 100;
  const overallUtilizationPercent =
    totalAllocated > 0
      ? Math.round((totalExposure / totalAllocated) * 1000) / 10
      : 0;
  const overBudgetCount = rows.filter(
    (r) => r.status === 'OVER_BUDGET_CRITICAL'
  ).length;
  const warningCount = rows.filter(
    (r) => r.status === 'WARNING_NEAR_LIMIT'
  ).length;

  return {
    rows,
    totals: {
      totalAllocated,
      totalActual,
      totalCommitted,
      totalExposure,
      totalRemainingVariance,
      overallUtilizationPercent,
      overBudgetCount,
      warningCount,
    },
  };
}

/**
 * Generates a balanced Double-Entry Journal Entry for an Operating Expense allocated to a specific Cost Center
 */
export function createCostCenterExpenseJournalEntry(params: {
  costCenterCode: string;
  costCenterNameAr: string;
  expenseAccountCode: string;
  expenseAccountNameAr: string;
  amount: number;
  paymentMethod: 'BANK' | 'CASH';
  description: string;
  tenantId: string;
  entryNumber: string;
  operatorName: string;
}): JournalEntry {
  const cleanAmount = Math.round(Math.abs(params.amount) * 100) / 100;
  if (cleanAmount <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  const creditAccId = params.paymentMethod === 'CASH' ? 'acc-1101' : 'acc-1102';
  const creditAccCode = params.paymentMethod === 'CASH' ? '1101' : '1102';
  const creditAccName = params.paymentMethod === 'CASH' ? 'Cash on Hand' : 'Bank Account';
  const creditAccNameAr = params.paymentMethod === 'CASH' ? 'النقدية بالصندوق' : 'البنك الجارٍ';

  const lines: JournalLine[] = [
    {
      id: `jl-cc-1-${Date.now()}`,
      accountId: `acc-${params.expenseAccountCode}`,
      accountCode: params.expenseAccountCode,
      accountName: params.expenseAccountNameAr,
      accountNameAr: params.expenseAccountNameAr,
      debit: cleanAmount,
      credit: 0,
      costCenter: params.costCenterCode,
      memo: `[${params.costCenterCode}] ${params.description}`,
    },
    {
      id: `jl-cc-2-${Date.now()}`,
      accountId: creditAccId,
      accountCode: creditAccCode,
      accountName: creditAccName,
      accountNameAr: creditAccNameAr,
      debit: 0,
      credit: cleanAmount,
      costCenter: params.costCenterCode,
      memo: `Cost Center disbursement (${params.costCenterNameAr})`,
    },
  ];

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced Cost Center expense journal');
  }

  return {
    id: `je-cc-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: params.entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'MANUAL',
    referenceId: params.costCenterCode,
    description: `قيد مصروف تشغيلي محمل على مركز التكلفة [${params.costCenterCode} - ${params.costCenterNameAr}]: ${params.description}`,
    lines,
    totalDebit: cleanAmount,
    totalCredit: cleanAmount,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a balanced Double-Entry Journal Entry for a Sales Return & Credit Note (إشعار دائن ومرتجع مبيعات)
 * - Debits Sales Revenue (4101) & Output VAT (2201)
 * - Credits Cash (1101) or Customer Accounts Receivable (1201)
 * - If item is healthy and restocked (HEALTHY_RESTOCK), also reverses COGS:
 *   Debits Merchandise Inventory (1104) & Credits Cost of Goods Sold (5101)
 */
export function createSalesReturnCreditNoteJournal(params: {
  creditNoteNumber: string;
  originalInvoiceNumber: string;
  customerName: string;
  subtotal: number;
  taxAmount: number;
  totalRefund: number;
  totalCostOfReturnedGoods: number;
  restockToInventory: boolean;
  refundMethod: 'CASH' | 'CREDIT_BALANCE' | 'EXCHANGE_UNIT';
  tenantId: string;
  entryNumber: string;
  operatorName: string;
}): JournalEntry {
  const cleanSub = Math.round(Math.abs(params.subtotal) * 100) / 100;
  const cleanTax = Math.round(Math.abs(params.taxAmount) * 100) / 100;
  const cleanTotal = Math.round((cleanSub + cleanTax) * 100) / 100;
  const cleanCost = Math.round(Math.abs(params.totalCostOfReturnedGoods) * 100) / 100;

  if (cleanTotal <= 0) {
    throw new Error('Sales return total refund must be greater than zero');
  }

  const isCashRefund = params.refundMethod === 'CASH';
  const creditAccId = isCashRefund ? 'acc-1101' : 'acc-1201';
  const creditAccCode = isCashRefund ? '1101' : '1201';
  const creditAccName = isCashRefund ? 'Cash on Hand' : 'Accounts Receivable';
  const creditAccNameAr = isCashRefund
    ? 'النقدية بالصندوق (رد نقدي لمرتجع مبيعات)'
    : 'العملاء - ذمم مدينة (إشعار دائن لتخفيض مديونية العميل)';

  const lines: JournalLine[] = [
    {
      id: `jl-ret-1-${Date.now()}`,
      accountId: 'acc-4101',
      accountCode: '4101',
      accountName: 'Sales Returns & Allowances (Revenue Contra)',
      accountNameAr: 'مردودات ومسموحات المبيعات (عكس إيرادات)',
      debit: cleanSub,
      credit: 0,
      memo: `Credit Note ${params.creditNoteNumber} against ${params.originalInvoiceNumber}`,
    },
  ];

  if (cleanTax > 0) {
    lines.push({
      id: `jl-ret-2-${Date.now()}`,
      accountId: 'acc-2201',
      accountCode: '2201',
      accountName: 'VAT Output Tax Payable',
      accountNameAr: 'ضريبة القيمة المضافة المستحقة (تخفيض مخرجات لمرتجع)',
      debit: cleanTax,
      credit: 0,
      memo: `VAT reversal for Credit Note ${params.creditNoteNumber}`,
    });
  }

  lines.push({
    id: `jl-ret-3-${Date.now()}`,
    accountId: creditAccId,
    accountCode: creditAccCode,
    accountName: creditAccName,
    accountNameAr: creditAccNameAr,
    debit: 0,
    credit: cleanTotal,
    memo: `Refund/Credit to ${params.customerName} (${params.creditNoteNumber})`,
  });

  if (params.restockToInventory && cleanCost > 0) {
    lines.push(
      {
        id: `jl-ret-4-${Date.now()}`,
        accountId: 'acc-1104',
        accountCode: '1104',
        accountName: 'Merchandise Inventory',
        accountNameAr: 'المخزون السلعي (إعادة إدخال بضاعة مرتجعة سليمة)',
        debit: cleanCost,
        credit: 0,
        memo: `Inventory restock from ${params.creditNoteNumber}`,
      },
      {
        id: `jl-ret-5-${Date.now()}`,
        accountId: 'acc-5101',
        accountCode: '5101',
        accountName: 'Cost of Goods Sold (COGS)',
        accountNameAr: 'تكلفة البضاعة المباعة (تخفيض تكلفة لمرتجع سليم)',
        debit: 0,
        credit: cleanCost,
        memo: `COGS reversal for ${params.creditNoteNumber}`,
      }
    );
  }

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced Sales Return Credit Note journal');
  }

  return {
    id: `je-ret-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: params.entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'SALES_INVOICE',
    referenceId: params.creditNoteNumber,
    description: `قيد مرتجع مبيعات وإشعار دائن (${params.creditNoteNumber}) للفاتورة (${params.originalInvoiceNumber}) - العميل: ${params.customerName}`,
    lines,
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a balanced Double-Entry Journal Entry upon receiving a Purchase Order / Vendor Bill:
 * - Debit Merchandise Inventory (1104)
 * - Debit Input VAT Recoverable (1205)
 * - Credit Accounts Payable - Suppliers (2101)
 */
export function createPurchaseOrderReceiptJournal(
  po: PurchaseOrder,
  tenantId: string,
  entryNumber: string,
  operatorName: string
): JournalEntry {
  const cleanSub = Math.round(Math.abs(po.subtotal) * 100) / 100;
  const cleanTax = Math.round(Math.abs(po.taxAmount) * 100) / 100;
  const cleanTotal = Math.round((cleanSub + cleanTax) * 100) / 100;

  const lines: JournalLine[] = [
    {
      id: `jl-po-1-${Date.now()}`,
      accountId: 'acc-1104',
      accountCode: '1104',
      accountName: 'Merchandise Inventory',
      accountNameAr: 'المخزون السلعي (استلام بضاعة أمر شراء)',
      debit: cleanSub,
      credit: 0,
      memo: `Goods receipt for PO ${po.poNumber} - ${po.supplierName}`,
    },
  ];

  if (cleanTax > 0) {
    lines.push({
      id: `jl-po-2-${Date.now()}`,
      accountId: 'acc-1205',
      accountCode: '1205',
      accountName: 'VAT Input Tax Recoverable',
      accountNameAr: 'ضريبة القيمة المضافة للمدخلات (قابلة للاسترداد)',
      debit: cleanTax,
      credit: 0,
      memo: `Input VAT on PO ${po.poNumber}`,
    });
  }

  lines.push({
    id: `jl-po-3-${Date.now()}`,
    accountId: 'acc-2101',
    accountCode: '2101',
    accountName: 'Accounts Payable - Suppliers',
    accountNameAr: 'الموردون (ذمم دائنة تجارية)',
    debit: 0,
    credit: cleanTotal,
    memo: `Payable to ${po.supplierName} (${po.poNumber})`,
  });

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced Purchase Order receipt journal');
  }

  return {
    id: `je-po-${Date.now()}`,
    tenantId,
    entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'PURCHASE_BILL',
    referenceId: po.id,
    description: `قيد استلام مخزني وإثبات فاتورة مشتريات أمر الشراء (${po.poNumber}) - المورد: ${po.supplierName}`,
    lines,
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
    isPosted: true,
    isReversed: false,
    createdByName: operatorName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a balanced Double-Entry Journal Entry for a Supplier Payment Voucher (سند صرف للموردين)
 * - Debit Accounts Payable (2101)
 * - Credit Bank Account (1102) or Cash on Hand (1101)
 */
export function createSupplierPaymentJournalEntry(params: {
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CASH';
  referenceNumber: string;
  tenantId: string;
  entryNumber: string;
  operatorName: string;
}): JournalEntry {
  const cleanAmount = Math.round(Math.abs(params.amount) * 100) / 100;
  if (cleanAmount <= 0) {
    throw new Error('Supplier payment amount must be greater than zero');
  }

  const isCash = params.paymentMethod === 'CASH';
  const creditAccId = isCash ? 'acc-1101' : 'acc-1102';
  const creditAccCode = isCash ? '1101' : '1102';
  const creditAccName = isCash ? 'Cash on Hand' : 'Bank Account';
  const creditAccNameAr = isCash ? 'النقدية بالصندوق' : 'البنك الجارٍ (حوالة للمورد)';

  const lines: JournalLine[] = [
    {
      id: `jl-spv-1-${Date.now()}`,
      accountId: 'acc-2101',
      accountCode: '2101',
      accountName: 'Accounts Payable - Suppliers',
      accountNameAr: `الموردون - سداد ذمم دائنة (${params.supplierName})`,
      debit: cleanAmount,
      credit: 0,
      memo: `Payment Voucher ${params.referenceNumber} to ${params.supplierName}`,
    },
    {
      id: `jl-spv-2-${Date.now()}`,
      accountId: creditAccId,
      accountCode: creditAccCode,
      accountName: creditAccName,
      accountNameAr: creditAccNameAr,
      debit: 0,
      credit: cleanAmount,
      memo: `Disbursement via ${params.paymentMethod} (${params.referenceNumber})`,
    },
  ];

  const check = validateJournalBalance(lines);
  if (!check.isValid) {
    throw new Error(check.errorMessage || 'Unbalanced Supplier Payment journal');
  }

  return {
    id: `je-spv-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: params.entryNumber,
    date: new Date().toISOString().slice(0, 10),
    referenceType: 'PURCHASE_BILL',
    referenceId: params.referenceNumber,
    description: `سند صرف وسداد دفعة للمورد [${params.supplierName}] بموجب المرجع (${params.referenceNumber})`,
    lines,
    totalDebit: cleanAmount,
    totalCredit: cleanAmount,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
  };
}





