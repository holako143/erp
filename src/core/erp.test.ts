import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEAN13CheckDigit,
  calculateEAN8CheckDigit,
  isValidEAN13,
  generateValidEAN13,
  generateUniqueSerialNumber,
} from './barcodeEngine';
import {
  validateJournalBalance,
  createReversingJournalEntry,
} from './accountingEngine';
import {
  calculateWeightedAverageCost,
  allocateLandedCost,
  evaluateStockHealth,
} from './inventoryEngine';
import {
  HardwareFingerprint,
  generateMachineRequestCode,
  validateMachineRequestCode,
  generateActivationSerial,
  verifyActivationSerial,
  evaluateSystemProtectionState,
} from './securityEngine';
import { JournalEntry } from '../types/erp';

// --- Barcode Engine Tests ---
test('calculateEAN13CheckDigit calculates GS1 standard check digit accurately', () => {
  // Test with standard GS1 barcode prefixes
  // e.g., 628104200001 -> check digit should be 9
  const check = calculateEAN13CheckDigit('628104200001');
  assert.equal(typeof check, 'number');
  assert.ok(check >= 0 && check <= 9);

  // Known standard GS1 example: 400638133393 -> check digit is 1
  assert.equal(calculateEAN13CheckDigit('400638133393'), 1);
});

test('isValidEAN13 validates valid codes and rejects corrupted ones', () => {
  const validCode = generateValidEAN13('628', '1042', '00001');
  assert.equal(validCode.length, 13);
  assert.equal(isValidEAN13(validCode), true);

  // Corrupting the last digit must fail validation
  const corrupted = validCode.slice(0, 12) + ((parseInt(validCode[12], 10) + 1) % 10).toString();
  assert.equal(isValidEAN13(corrupted), false);
});

test('calculateEAN8CheckDigit calculates 8-digit check digit correctly', () => {
  // Standard GS1 test: 9638507 -> 4
  const check = calculateEAN8CheckDigit('9638507');
  assert.equal(check, 4);
});

test('generateUniqueSerialNumber generates unique IDs without collision', () => {
  const serials = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const sn = generateUniqueSerialNumber('SN', 'T1');
    assert.equal(serials.has(sn), false);
    serials.add(sn);
  }
  assert.equal(serials.size, 100);
});

// --- Double-Entry Accounting Tests ---
test('validateJournalBalance strictly enforces debit equals credit', () => {
  // Balanced entry: 1150 debit, 1000 + 150 credit
  const balancedLines = [
    { debit: 1150, credit: 0 },
    { debit: 0, credit: 1000 },
    { debit: 0, credit: 150 },
  ];
  const balancedResult = validateJournalBalance(balancedLines);
  assert.equal(balancedResult.isValid, true);
  assert.equal(balancedResult.difference, 0);

  // Unbalanced entry: 1150 debit vs 1000 credit
  const unbalancedLines = [
    { debit: 1150, credit: 0 },
    { debit: 0, credit: 1000 },
  ];
  const unbalancedResult = validateJournalBalance(unbalancedLines);
  assert.equal(unbalancedResult.isValid, false);
  assert.ok(unbalancedResult.difference > 0);
  assert.ok(unbalancedResult.errorMessage?.includes('Unbalanced journal'));
});

test('validateJournalBalance forbids negative numbers', () => {
  const invalidLines = [
    { debit: -500, credit: 0 },
    { debit: 0, credit: -500 },
  ];
  const res = validateJournalBalance(invalidLines);
  assert.equal(res.isValid, false);
  assert.ok(res.errorMessage?.includes('Negative amounts are strictly prohibited'));
});

test('createReversingJournalEntry accurately swaps debits and credits while keeping balance', () => {
  const mockEntry: JournalEntry = {
    id: 'je-1',
    tenantId: 't1',
    entryNumber: 'JE-2026-001',
    date: '2026-10-01',
    referenceType: 'MANUAL',
    description: 'Original test entry',
    lines: [
      { id: '1', accountId: 'acc-1', accountCode: '1101', accountName: 'Cash', accountNameAr: 'النقدية', debit: 500, credit: 0 },
      { id: '2', accountId: 'acc-2', accountCode: '4101', accountName: 'Revenue', accountNameAr: 'الإيراد', debit: 0, credit: 500 },
    ],
    totalDebit: 500,
    totalCredit: 500,
    isPosted: true,
    isReversed: false,
    createdByName: 'Accountant',
    createdAt: new Date().toISOString(),
  };

  const reversal = createReversingJournalEntry(mockEntry, 'Correction of error', 'REV-001', 'Auditor');
  assert.equal(reversal.totalDebit, 500);
  assert.equal(reversal.totalCredit, 500);
  assert.equal(reversal.lines[0].debit, 0);
  assert.equal(reversal.lines[0].credit, 500);
  assert.equal(reversal.lines[1].debit, 500);
  assert.equal(reversal.lines[1].credit, 0);
});

// --- Inventory & WMS Valuation Tests ---
test('calculateWeightedAverageCost calculates accurate new unit cost on stock receipt', () => {
  const newCost = calculateWeightedAverageCost(100, 10, 50, 16);
  assert.equal(newCost, 12.0);
});

test('allocateLandedCost proportions freight and customs costs by value correctly', () => {
  const items = [
    { productId: 'p1', quantity: 10, baseCost: 100, totalBaseValue: 1000 },
    { productId: 'p2', quantity: 10, baseCost: 300, totalBaseValue: 3000 },
  ];
  const allocated = allocateLandedCost(items, 400, 'BY_VALUE');
  assert.equal(allocated[0].allocatedCost, 100);
  assert.equal(allocated[0].newEffectiveUnitCost, 110);
  assert.equal(allocated[1].allocatedCost, 300);
  assert.equal(allocated[1].newEffectiveUnitCost, 330);
});

test('evaluateStockHealth flags out-of-stock and reorder levels accurately', () => {
  assert.equal(evaluateStockHealth(0, 10, 100, 25).status, 'OUT_OF_STOCK');
  assert.equal(evaluateStockHealth(8, 10, 100, 25).status, 'CRITICAL');
  assert.equal(evaluateStockHealth(20, 10, 100, 25).status, 'REORDER_NOW');
  assert.equal(evaluateStockHealth(50, 10, 100, 25).status, 'OPTIMAL');
  assert.equal(evaluateStockHealth(120, 10, 100, 25).status, 'OVERSTOCKED');
});

// --- Multi-Hardware Licensing, Single-Device Binding & 30-Day Trial Tests ---
const PRIMARY_HW: HardwareFingerprint = {
  motherboardSerial: 'MB-ASUS-Z790-8842AF19',
  cpuProcessorId: 'CPU-I9-14900K-BFEBFBFF000B0671',
  gpuSiliconId: 'GPU-RTX4080-AD103-9921CC04',
  diskVolumeSerial: 'NVME-990PRO-S73JN0W104921',
  systemUuid: 'UUID-RLM-NODE-001A-9981',
};

const SECOND_DEVICE_HW: HardwareFingerprint = {
  ...PRIMARY_HW,
  motherboardSerial: 'MB-MSI-B650-DIFFERENT-BOARD',
};

test('generateMachineRequestCode produces valid composite request code and detects tampering', () => {
  const reqCode = generateMachineRequestCode(PRIMARY_HW);
  assert.ok(reqCode.startsWith('RLM-REQ-'));
  assert.equal(validateMachineRequestCode(reqCode).valid, true);

  // Tamper with one character
  const tampered = reqCode.slice(0, -1) + (reqCode.endsWith('A') ? 'B' : 'A');
  assert.equal(validateMachineRequestCode(tampered).valid, false);
});

test('generateActivationSerial binds strictly to single device and supports 1 day, 1 week, 1 month, 1 year, and custom days', () => {
  const now = 1760000000000;
  const reqCode1 = generateMachineRequestCode(PRIMARY_HW);
  const reqCode2 = generateMachineRequestCode(SECOND_DEVICE_HW);

  const serial1Day = generateActivationSerial(reqCode1, '1_DAY', undefined, now);
  const serial1Week = generateActivationSerial(reqCode1, '1_WEEK', undefined, now);
  const serial1Month = generateActivationSerial(reqCode1, '1_MONTH', undefined, now);
  const serial1Year = generateActivationSerial(reqCode1, '1_YEAR', undefined, now);
  const serialCustom45 = generateActivationSerial(reqCode1, 'CUSTOM_DAYS', 45, now);

  assert.equal(verifyActivationSerial(serial1Day, reqCode1, now).durationDays, 1);
  assert.equal(verifyActivationSerial(serial1Week, reqCode1, now).durationDays, 7);
  assert.equal(verifyActivationSerial(serial1Month, reqCode1, now).durationDays, 30);
  assert.equal(verifyActivationSerial(serial1Year, reqCode1, now).durationDays, 365);
  assert.equal(verifyActivationSerial(serialCustom45, reqCode1, now).durationDays, 45);

  // Must fail with DEVICE_MISMATCH if used on SECOND_DEVICE_HW
  const crossDeviceCheck = verifyActivationSerial(serial1Year, reqCode2, now);
  assert.equal(crossDeviceCheck.valid, false);
  assert.equal(crossDeviceCheck.reason, 'DEVICE_MISMATCH');

  // Must fail with EXPIRED after duration elapses (e.g., 2 days after a 1-day serial)
  const expiredCheck = verifyActivationSerial(serial1Day, reqCode1, now + 2 * 86400000);
  assert.equal(expiredCheck.valid, false);
  assert.equal(expiredCheck.reason, 'EXPIRED');
});

test('evaluateSystemProtectionState enforces 30-day trial and locks system after 30 days until activated', () => {
  const startMs = 1760000000000;
  // Day 10 of 30-day trial -> active, 20 days remaining
  const day10State = evaluateSystemProtectionState({
    hardware: PRIMARY_HW,
    trialStartedAtMs: startMs,
    nowMs: startMs + 10 * 86400000,
  });
  assert.equal(day10State.status, 'TRIAL_ACTIVE');
  assert.equal(day10State.isLocked, false);
  assert.equal(day10State.trialRemainingDays, 20);

  // Day 31 of 30-day trial -> expired & locked
  const day31Ms = startMs + 31 * 86400000;
  const expiredState = evaluateSystemProtectionState({
    hardware: PRIMARY_HW,
    trialStartedAtMs: startMs,
    nowMs: day31Ms,
  });
  assert.equal(expiredState.status, 'TRIAL_EXPIRED');
  assert.equal(expiredState.isLocked, true);
  assert.equal(expiredState.trialRemainingDays, 0);

  // Activating with a valid serial for PRIMARY_HW unlocks the system
  const validSerial = generateActivationSerial(expiredState.machineRequestCode, '1_YEAR', undefined, day31Ms);
  const unlockedState = evaluateSystemProtectionState({
    hardware: PRIMARY_HW,
    trialStartedAtMs: startMs,
    activeSerial: validSerial,
    nowMs: day31Ms + 1000,
  });
  assert.equal(unlockedState.status, 'LICENSE_ACTIVE');
  assert.equal(unlockedState.isLocked, false);
  assert.equal(unlockedState.licenseDetails?.durationDays, 365);
});

test('detectRealHardwareFingerprint and parseWindowsWmiHardwareInput produce deterministic real hardware serials', async () => {
  const { detectRealHardwareFingerprint, parseWindowsWmiHardwareInput } = await import('./securityEngine');

  const liveHw = detectRealHardwareFingerprint({
    platform: 'win32-x64',
    cpuModel: 'Intel(R) Core(TM) i7-13700K',
    cpuCores: 24,
    totalMemGb: 32,
    primaryMac: 'AA:BB:CC:11:22:33',
    wmiBoardSerial: 'SN-ASUS-998877',
    wmiCpuId: 'BFEBFBFF000B0671',
  });

  assert.equal(liveHw.detectionSource, 'LIVE_DEVICE_TELEMETRY');
  assert.ok(liveHw.motherboardSerial.includes('SN-ASUS-998877'));
  assert.ok(liveHw.cpuProcessorId.includes('BFEBFBFF000B0671'));
  assert.equal(validateMachineRequestCode(generateMachineRequestCode(liveHw)).valid, true);

  const importedWmi = parseWindowsWmiHardwareInput(
    JSON.stringify({
      motherboardSerial: 'MB-WMI-GIGABYTE-7721',
      cpuProcessorId: 'CPU-WMI-RYZEN-9901',
      gpuSiliconId: 'GPU-WMI-RTX4070',
      diskVolumeSerial: 'DISK-WMI-SN850X',
    })
  );
  assert.ok(importedWmi);
  assert.equal(importedWmi?.detectionSource, 'WINDOWS_WMI_IMPORTED');
  assert.equal(importedWmi?.motherboardSerial, 'MB-WMI-GIGABYTE-7721');
});

test('calculateAssetDepreciation computes straight-line depreciation and respects salvage value floor', async () => {
  const { calculateAssetDepreciation } = await import('./accountingEngine');
  const res = calculateAssetDepreciation({
    purchaseCost: 100000,
    salvageValue: 10000,
    usefulLifeYears: 9,
    accumulatedDepreciation: 20000,
  });
  assert.equal(res.annualDepreciation, 10000);
  assert.equal(res.newAccumulatedDepreciation, 30000);
  assert.equal(res.newBookValue, 70000);

  // Near end of life: cannot depreciate below salvage value (10,000)
  const nearEnd = calculateAssetDepreciation({
    purchaseCost: 100000,
    salvageValue: 10000,
    usefulLifeYears: 9,
    accumulatedDepreciation: 85000,
  });
  assert.equal(nearEnd.newAccumulatedDepreciation, 90000);
  assert.equal(nearEnd.newBookValue, 10000);
});

test('calculateDynamicFinancialStatements aggregates live journals and VAT return accurately', async () => {
  const { calculateDynamicFinancialStatements } = await import('./accountingEngine');
  const stmt = calculateDynamicFinancialStatements(
    [
      {
        id: 'acc-1101',
        tenantId: 'ten-1',
        code: '1101',
        name: 'Cash',
        nameAr: 'النقدية',
        type: 'ASSET',
        level: 3,
        balance: 50000,
        isDebitNormal: true,
        isActive: true,
      },
      {
        id: 'acc-4101',
        tenantId: 'ten-1',
        code: '4101',
        name: 'Sales Revenue',
        nameAr: 'المبيعات',
        type: 'REVENUE',
        level: 3,
        balance: 100000,
        isDebitNormal: false,
        isActive: true,
      },
      {
        id: 'acc-5101',
        tenantId: 'ten-1',
        code: '5101',
        name: 'COGS',
        nameAr: 'تكلفة المبيعات',
        type: 'EXPENSE',
        level: 3,
        balance: 40000,
        isDebitNormal: true,
        isActive: true,
      },
    ],
    [],
    [
      {
        id: 'inv-1',
        tenantId: 'ten-1',
        invoiceNumber: 'INV-1',
        customerId: 'c1',
        customerName: 'Test',
        branchId: 'b1',
        date: '2026-01-01',
        items: [],
        subtotal: 1000,
        discountAmount: 0,
        taxAmount: 150,
        grandTotal: 1150,
        paidAmount: 1150,
        paymentMethod: 'CASH',
        status: 'PAID',
        qrData: 'QR',
      },
    ],
    []
  );

  assert.equal(stmt.revenues, 100000);
  assert.equal(stmt.expenses, 40000);
  assert.equal(stmt.netIncome, 60000);
  assert.equal(stmt.outputVat, 21150);
});

test('generateWeightedScaleBarcode and parseWeightedScaleBarcode accurately encode and decode Prefix 21 (Weight) and Prefix 20 (Price)', async () => {
  const { generateWeightedScaleBarcode, parseWeightedScaleBarcode } = await import('./barcodeEngine');

  // Prefix 21: 1250 grams (1.25 kg) for PLU 10045
  const weightBarcode = generateWeightedScaleBarcode('21', '10045', 1250);
  assert.equal(weightBarcode.length, 13);
  const parsedWeight = parseWeightedScaleBarcode(weightBarcode);
  assert.equal(parsedWeight.isValid, true);
  assert.equal(parsedWeight.mode, 'WEIGHT_GRAMS');
  assert.equal(parsedWeight.itemPlu, '10045');
  assert.equal(parsedWeight.weightGrams, 1250);
  assert.equal(parsedWeight.weightKg, 1.25);

  // Prefix 20: 4550 halalas (45.50 SAR) for PLU 20010
  const priceBarcode = generateWeightedScaleBarcode('20', '20010', 4550);
  const parsedPrice = parseWeightedScaleBarcode(priceBarcode);
  assert.equal(parsedPrice.isValid, true);
  assert.equal(parsedPrice.mode, 'PRICE_HALALAS');
  assert.equal(parsedPrice.itemPlu, '20010');
  assert.equal(parsedPrice.embeddedPrice, 45.5);
});

test('parseBulkProductsCSV parses Excel/CSV rows and computes opening stock valuation accurately', async () => {
  const { parseBulkProductsCSV } = await import('./inventoryEngine');
  const csvSample = [
    'SKU,Barcode,NameAr,NameEn,CostPrice,SalePrice,StockQty,UOM,ReorderPoint,Sector',
    'IMP-101,6281042009011,قهوة مختصة كولومبي 1 كجم,Colombian Specialty Coffee 1KG,45,75,30,KG,10,restaurant',
    'IMP-102,6281042009028,شاحن جداري فائق السرعة 65W,GaN Fast Charger 65W,60,110,20,PCS,5,electronics',
  ].join('\n');

  const result = parseBulkProductsCSV(csvSample, 'ten-1', 'wh-1', 'cat-1', 'general');
  assert.equal(result.errors.length, 0);
  assert.equal(result.validProducts.length, 2);
  assert.equal(result.totalOpeningQty, 50);
  // 30*45 (1350) + 20*60 (1200) = 2550
  assert.equal(result.totalOpeningValuation, 2550);
  assert.equal(result.validProducts[0].industry, 'restaurant');
  assert.equal(result.validProducts[1].hasSerials, true);
});

test('Bank Reconciliation, PDC Clearing Journal, and Multi-Currency Revaluation engines maintain strict double-entry balance', async () => {
  const {
    calculateBankReconciliationSummary,
    createPDCClearingJournalEntry,
    convertCurrencyAmount,
    calculateFXRevaluation,
    createFXRevaluationJournalEntry,
  } = await import('./accountingEngine');

  const recon = calculateBankReconciliationSummary(100000, [
    {
      id: 'bs-1',
      tenantId: 'ten-1',
      date: '2026-10-25',
      reference: 'DEP-101',
      description: 'POS Settlement',
      descriptionAr: 'تسوية نقاط البيع مدى',
      amount: 15000,
      status: 'MATCHED',
    },
    {
      id: 'bs-2',
      tenantId: 'ten-1',
      date: '2026-10-28',
      reference: 'FEE-99',
      description: 'Bank Wire Fee',
      descriptionAr: 'عمولة تحويل بنكي غير مسجلة بالدفاتر',
      amount: -250,
      status: 'UNRECONCILED',
    },
  ]);

  assert.equal(recon.unreconciledCount, 1);
  assert.equal(recon.unreconciledWithdrawals, 250);
  assert.equal(recon.adjustedLedgerTarget, 99750);

  const pdcEntry = createPDCClearingJournalEntry(
    {
      id: 'pdc-1',
      tenantId: 'ten-1',
      checkNumber: 'CHK-884210',
      type: 'RECEIVABLE',
      partyName: 'شركة المدار للمقاولات',
      bankName: 'مصرف الراجحي',
      amount: 18500,
      currency: 'SAR',
      issueDate: '2026-10-01',
      maturityDate: '2026-11-01',
      status: 'UNDER_COLLECTION',
    },
    'ten-1',
    'JE-PDC-001',
    'Auditor'
  );
  assert.equal(pdcEntry.totalDebit, 18500);
  assert.equal(pdcEntry.totalCredit, 18500);

  const rates = [
    {
      currency: 'SAR' as const,
      nameAr: 'ريال سعودي',
      nameEn: 'Saudi Riyal',
      symbol: 'ر.س',
      rateToSAR: 1,
      previousRateToSAR: 1,
      foreignMonetaryBalance: 0,
      lastUpdated: '2026-11-01',
    },
    {
      currency: 'USD' as const,
      nameAr: 'دولار أمريكي',
      nameEn: 'US Dollar',
      symbol: '$',
      rateToSAR: 3.76,
      previousRateToSAR: 3.75,
      foreignMonetaryBalance: 20000,
      lastUpdated: '2026-11-01',
    },
  ];

  // 1000 USD -> 3760 SAR
  assert.equal(convertCurrencyAmount(1000, 'USD', 'SAR', rates), 3760);

  const fxRev = calculateFXRevaluation(rates);
  // 20,000 USD * (3.76 - 3.75) = +200 SAR unrealized gain
  assert.equal(fxRev.netGainLossSAR, 200);

  const fxJournal = createFXRevaluationJournalEntry(fxRev.netGainLossSAR, 'ten-1', 'JE-FX-001', 'CFO');
  assert.equal(fxJournal.totalDebit, 200);
  assert.equal(fxJournal.totalCredit, 200);
});

test('calculateReceivablesPayablesAging, calculateExecutiveFinancialRatios, and createCustomerReceiptJournalEntry compute accurate institutional metrics', async () => {
  const {
    calculateReceivablesPayablesAging,
    calculateExecutiveFinancialRatios,
    createCustomerReceiptJournalEntry,
  } = await import('./accountingEngine');

  const aging = calculateReceivablesPayablesAging(
    [
      {
        id: 'cust-1',
        name: 'Al-Madar Trading',
        nameAr: 'شركة المدار للتجارة',
        balance: 40000,
        creditLimit: 50000,
      },
    ],
    [
      {
        id: 'sup-1',
        name: 'Global Tech Supply',
        nameAr: 'التوريدات التقنية العالمية',
        balance: 15000,
        creditLimit: 100000,
      },
    ]
  );

  assert.equal(aging.totals.totalReceivables, 40000);
  assert.equal(aging.totals.totalPayables, 15000);
  assert.equal(aging.totals.netWorkingCreditExposure, 25000);
  assert.equal(
    aging.customerAging[0].current0To30 +
      aging.customerAging[0].days31To60 +
      aging.customerAging[0].days61To90 +
      aging.customerAging[0].daysOver90,
    40000
  );

  const ratios = calculateExecutiveFinancialRatios({
    revenues: 200000,
    expenses: 150000,
    totalAssets: 500000,
    totalLiabilities: 200000,
    cashAndBankBalance: 120000,
    receivableChecksPending: 30000,
    payableChecksPending: 10000,
  });

  assert.equal(ratios.netIncome, 50000);
  assert.equal(ratios.netProfitMarginPercent, 25);
  assert.equal(ratios.currentRatio, 2.5);
  assert.equal(ratios.workingCapital, 300000);
  assert.equal(ratios.projected30DayCashBalance, 140000);

  const rvJournal = createCustomerReceiptJournalEntry({
    customerId: 'cust-1',
    customerName: 'شركة المدار للتجارة',
    amount: 12500,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: 'RV-2026-0091',
    tenantId: 'ten-1',
    entryNumber: 'JE-RV-0091',
    operatorName: 'CFO',
  });

  assert.equal(rvJournal.totalDebit, 12500);
  assert.equal(rvJournal.totalCredit, 12500);
  assert.equal(rvJournal.lines[0].accountCode, '1102');
  assert.equal(rvJournal.lines[1].accountCode, '1201');
});

test('advanceSalesPipelineDocument transitions QUOTATION -> SALES_ORDER -> DELIVERY_NOTE -> INVOICED and generates balanced COGS journal', async () => {
  const {
    advanceSalesPipelineDocument,
    createDeliveryNoteCOGSJournalEntry,
  } = await import('./accountingEngine');

  const initialQuote = {
    id: 'pipe-1',
    tenantId: 'ten-1',
    branchId: 'br-1',
    warehouseId: 'wh-1',
    quoteNumber: 'QT-2026-1001',
    customerId: 'cust-1',
    customerName: 'شركة المدار للمقاولات',
    date: '2026-11-01',
    validUntil: '2026-11-15',
    items: [
      {
        productId: 'prd-1',
        productName: 'مضخة هيدروليكية صناعية 50 حصان',
        sku: 'IND-PUMP-500',
        quantity: 2,
        unitPrice: 5000,
        discount: 0,
        taxRate: 15,
        taxAmount: 1500,
        total: 11500,
      },
    ],
    subtotal: 10000,
    discountAmount: 0,
    taxAmount: 1500,
    grandTotal: 11500,
    paymentMethod: 'CREDIT' as const,
    stage: 'QUOTATION' as const,
    stockReserved: false,
    stockDeducted: false,
  };

  // Step 1: QUOTATION -> SALES_ORDER
  const asOrder = advanceSalesPipelineDocument(initialQuote, {
    generatedNumber: '2026-5001',
  });
  assert.equal(asOrder.stage, 'SALES_ORDER');
  assert.equal(asOrder.salesOrderNumber, 'SO-2026-5001');
  assert.equal(asOrder.stockReserved, true);
  assert.equal(asOrder.stockDeducted, false);

  // Step 2: SALES_ORDER -> DELIVERY_NOTE
  const asDelivery = advanceSalesPipelineDocument(asOrder, {
    generatedNumber: '2026-6001',
    cogsJournalNumber: 'JE-DN-6001',
  });
  assert.equal(asDelivery.stage, 'DELIVERY_NOTE');
  assert.equal(asDelivery.deliveryNoteNumber, 'DN-2026-6001');
  assert.equal(asDelivery.stockReserved, true);
  assert.equal(asDelivery.stockDeducted, true);
  assert.equal(asDelivery.cogsJournalNumber, 'JE-DN-6001');

  const cogsJournal = createDeliveryNoteCOGSJournalEntry({
    deliveryNoteNumber: asDelivery.deliveryNoteNumber!,
    customerName: asDelivery.customerName,
    totalCostOfGoods: 6400,
    tenantId: 'ten-1',
    entryNumber: 'JE-DN-6001',
    operatorName: 'WMS Lead',
  });
  assert.equal(cogsJournal.totalDebit, 6400);
  assert.equal(cogsJournal.totalCredit, 6400);
  assert.equal(cogsJournal.lines[0].accountCode, '5101');
  assert.equal(cogsJournal.lines[1].accountCode, '1104');

  // Step 3: DELIVERY_NOTE -> INVOICED
  const asInvoiced = advanceSalesPipelineDocument(asDelivery, {
    linkedInvoiceId: 'inv-9001',
    linkedInvoiceNumber: 'INV-2026-9001',
  });
  assert.equal(asInvoiced.stage, 'INVOICED');
  assert.equal(asInvoiced.linkedInvoiceNumber, 'INV-2026-9001');
});

test('calculateCostCenterBudgetVariance and createCostCenterExpenseJournalEntry compute live variance and over-budget alerts', async () => {
  const {
    calculateCostCenterBudgetVariance,
    createCostCenterExpenseJournalEntry,
  } = await import('./accountingEngine');

  const budgets = [
    {
      id: 'ccb-1',
      tenantId: 'ten-1',
      costCenterId: 'cc-1',
      costCenterCode: 'CC-OPS-RYD',
      costCenterName: 'Riyadh HQ Operations',
      costCenterNameAr: 'مركز تكلفة العمليات والتشغيل - المقر الرئيسي بالرياض',
      branchId: 'br-1',
      branchNameAr: 'فرع الرياض الرئيسي',
      fiscalPeriod: '2026-Q4',
      allocatedBudget: 100000,
      committedAmount: 15000,
      baseActualSpent: 70000,
      alertThresholdPercent: 85,
    },
  ];

  // Before posting additional journal: exposure = 70,000 + 15,000 = 85,000 (85% -> WARNING_NEAR_LIMIT)
  const initialEval = calculateCostCenterBudgetVariance(budgets, []);
  assert.equal(initialEval.rows[0].totalExposure, 85000);
  assert.equal(initialEval.rows[0].remainingVariance, 15000);
  assert.equal(initialEval.rows[0].utilizationPercent, 85);
  assert.equal(initialEval.rows[0].status, 'WARNING_NEAR_LIMIT');

  // Post a 20,000 SAR expense journal tagged to CC-OPS-RYD -> exposure = 105,000 (105% -> OVER_BUDGET_CRITICAL)
  const ccJournal = createCostCenterExpenseJournalEntry({
    costCenterCode: 'CC-OPS-RYD',
    costCenterNameAr: 'مركز تكلفة العمليات والتشغيل - المقر الرئيسي بالرياض',
    expenseAccountCode: '5203',
    expenseAccountNameAr: 'مصروفات صيانة وتشغيل المرافق',
    amount: 20000,
    paymentMethod: 'BANK',
    description: 'صيانة دورية لخطوط التبريد والمولدات الاحتياطية',
    tenantId: 'ten-1',
    entryNumber: 'JE-CC-2026-01',
    operatorName: 'CFO',
  });

  const afterEval = calculateCostCenterBudgetVariance(budgets, [ccJournal]);
  assert.equal(afterEval.rows[0].journalPostedSpent, 20000);
  assert.equal(afterEval.rows[0].totalActualSpent, 90000);
  assert.equal(afterEval.rows[0].totalExposure, 105000);
  assert.equal(afterEval.rows[0].remainingVariance, -5000);
  assert.equal(afterEval.rows[0].utilizationPercent, 105);
  assert.equal(afterEval.rows[0].status, 'OVER_BUDGET_CRITICAL');
  assert.equal(afterEval.totals.overBudgetCount, 1);
});

test('calculateSolarAndBatterySystemSizing computes accurate Inverter kW, LiFePO4/Gel Battery Bank kWh, and 585W Solar Array panels', async () => {
  const { calculateSolarAndBatterySystemSizing } = await import('./inventoryEngine');

  // Case 1: 3200W load for 5 hours on 48V LiFePO4 system (16,000 Wh = 16 kWh)
  const resLi = calculateSolarAndBatterySystemSizing({
    continuousLoadWatts: 3200,
    backupHours: 5,
    systemVoltage: 48,
    peakSunHours: 5.5,
    batteryType: 'LIFEPO4',
    singlePanelWatts: 585,
  });

  assert.equal(resLi.dailyEnergyWh, 16000);
  assert.equal(resLi.dailyEnergyKwh, 16);
  // 3200W * 1.25 = 4.0kW -> snaps to standard 5kW hybrid inverter
  assert.equal(resLi.recommendedInverterKw, 5);
  // 16kWh / (0.85 * 0.92) = ~20.46 kWh -> 2 units of 10.24kWh LiFePO4
  assert.equal(resLi.recommendedBatteryUnits, 2);
  assert.ok(resLi.recommendedPanelCount >= 6);

  // Case 2: 6000W load for 4 hours on 48V Tubular Gel system
  const resGel = calculateSolarAndBatterySystemSizing({
    continuousLoadWatts: 6000,
    backupHours: 4,
    systemVoltage: 48,
    peakSunHours: 5.5,
    batteryType: 'TUBULAR_GEL',
    singlePanelWatts: 585,
  });
  // 6000W * 1.25 = 7.5kW -> snaps to 8kW Deye Hybrid Inverter
  assert.equal(resGel.recommendedInverterKw, 8);
  // Must be a multiple of 4 (48V / 12V = 4 series Gel batteries per string)
  assert.equal(resGel.recommendedBatteryUnits % 4, 0);
});

test('createSalesReturnCreditNoteJournal generates balanced revenue reversal, VAT reversal, and COGS inventory restock lines', async () => {
  const { createSalesReturnCreditNoteJournal } = await import('./accountingEngine');

  const retJournal = createSalesReturnCreditNoteJournal({
    creditNoteNumber: 'CN-2026-9001',
    originalInvoiceNumber: 'INV-2026-1001',
    customerName: 'شركة المدار للمقاولات',
    subtotal: 4850,
    taxAmount: 727.5,
    totalRefund: 5577.5,
    totalCostOfReturnedGoods: 3950,
    restockToInventory: true,
    refundMethod: 'CREDIT_BALANCE',
    tenantId: 'ten-1',
    entryNumber: 'JE-RET-2026-9001',
    operatorName: 'Auditor',
  });

  // 5577.5 (Revenue + VAT reversal) + 3950 (Inventory restock / COGS reversal) = 9527.5
  assert.equal(retJournal.totalDebit, 9527.5);
  assert.equal(retJournal.totalCredit, 9527.5);
  assert.equal(retJournal.lines.length, 5);
});

test('createPurchaseOrderReceiptJournal and createSupplierPaymentJournalEntry post balanced A/P and inventory entries', async () => {
  const {
    createPurchaseOrderReceiptJournal,
    createSupplierPaymentJournalEntry,
  } = await import('./accountingEngine');

  const poJournal = createPurchaseOrderReceiptJournal(
    {
      id: 'po-901',
      tenantId: 'ten-1',
      poNumber: 'PO-2026-9001',
      supplierId: 'sup-1',
      supplierName: 'الشركة الوطنية للتوريدات الشمسية',
      orderDate: '2026-11-01',
      expectedDate: '2026-11-10',
      items: [],
      subtotal: 20000,
      taxAmount: 3000,
      total: 23000,
      status: 'RECEIVED',
      warehouseId: 'wh-1',
    },
    'ten-1',
    'JE-PO-2026-9001',
    'WMS Lead'
  );

  assert.equal(poJournal.totalDebit, 23000);
  assert.equal(poJournal.totalCredit, 23000);
  assert.equal(poJournal.lines[0].accountCode, '1104');
  assert.equal(poJournal.lines[2].accountCode, '2101');

  const spvJournal = createSupplierPaymentJournalEntry({
    supplierId: 'sup-1',
    supplierName: 'الشركة الوطنية للتوريدات الشمسية',
    amount: 10000,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: 'SPV-2026-501',
    tenantId: 'ten-1',
    entryNumber: 'JE-SPV-2026-501',
    operatorName: 'CFO',
  });

  assert.equal(spvJournal.totalDebit, 10000);
  assert.equal(spvJournal.totalCredit, 10000);
  assert.equal(spvJournal.lines[0].accountCode, '2101');
  assert.equal(spvJournal.lines[1].accountCode, '1102');
});

test('parseSmartProductLabelOCR and evaluateSerialWarrantyStatus extract specs, detect duplicate serials, and verify warranty expiry', async () => {
  const {
    parseSmartProductLabelOCR,
    evaluateSerialWarrantyStatus,
  } = await import('./inventoryEngine');
  const { SEED_PRODUCTS } = await import('../data/seedData');

  const labelText =
    'JINKO SOLAR TIGER NEO N-TYPE 585W BIFACIAL | VOC: 51.4V | EFF: 22.65% | BARCODE: 6281042005014 | SN: SN-JNK-2026-88412';

  const ocrFirst = parseSmartProductLabelOCR(labelText, SEED_PRODUCTS, [
    'SN-EXISTING-001',
  ]);
  assert.equal(ocrFirst.manufacturer, 'Jinko Solar');
  assert.equal(ocrFirst.subCategory, 'SOLAR_PANEL');
  assert.equal(ocrFirst.powerRatingWatts, 585);
  assert.equal(ocrFirst.serialNumber, 'SN-JNK-2026-88412');
  assert.equal(ocrFirst.isDuplicateSerial, false);
  assert.equal(ocrFirst.matchedProductId, 'prd-sol-pnl-585');

  // Now test duplicate serial detection when the same serial already exists
  const ocrDuplicate = parseSmartProductLabelOCR(labelText, SEED_PRODUCTS, [
    'SN-JNK-2026-88412',
  ]);
  assert.equal(ocrDuplicate.isDuplicateSerial, true);

  // Test warranty coverage evaluation
  const warrantyEval = evaluateSerialWarrantyStatus({
    purchaseDateIso: '2026-01-01',
    warrantyMonths: 24,
    referenceDateIso: '2026-11-01',
  });
  assert.equal(warrantyEval.isUnderWarranty, true);
  assert.ok(warrantyEval.remainingDays > 300);
});

test('Full Cross-Module Accounting & Trial Balance Invariant: Sales, COGS, Credit Note Return, PO Receipt, Supplier Payment, and Cost Center Expense remain 100% balanced in Trial Balance', async () => {
  const {
    createSalesInvoiceJournal,
    createDeliveryNoteCOGSJournalEntry,
    createSalesReturnCreditNoteJournal,
    createPurchaseOrderReceiptJournal,
    createSupplierPaymentJournalEntry,
    createCostCenterExpenseJournalEntry,
    generateTrialBalance,
    calculateDynamicFinancialStatements,
  } = await import('./accountingEngine');
  const { SEED_CHART_OF_ACCOUNTS, SEED_JOURNAL_ENTRIES } = await import('../data/seedData');

  const saleJournal = createSalesInvoiceJournal(
    {
      id: 'inv-test-100',
      tenantId: 'tenant-alnoor',
      invoiceNumber: 'INV-2026-8800',
      customerId: 'cust-001',
      customerName: 'شركة البناء الحديث للمقاولات العامة',
      branchId: 'branch-ruh-01',
      date: '2026-11-02',
      items: [],
      subtotal: 10000,
      discountAmount: 0,
      taxAmount: 1500,
      grandTotal: 11500,
      paidAmount: 0,
      paymentMethod: 'CREDIT',
      status: 'PARTIAL',
    },
    'tenant-alnoor',
    'JE-INV-2026-8800'
  );

  const cogsJournal = createDeliveryNoteCOGSJournalEntry({
    deliveryNoteNumber: 'DN-2026-8800',
    customerName: 'شركة البناء الحديث للمقاولات العامة',
    totalCostOfGoods: 7200,
    tenantId: 'tenant-alnoor',
    entryNumber: 'JE-DN-2026-8800',
    operatorName: 'WMS Lead',
  });

  const returnJournal = createSalesReturnCreditNoteJournal({
    creditNoteNumber: 'CN-2026-8801',
    originalInvoiceNumber: 'INV-2026-8800',
    customerName: 'شركة البناء الحديث للمقاولات العامة',
    subtotal: 2000,
    taxAmount: 300,
    totalRefund: 2300,
    totalCostOfReturnedGoods: 1440,
    restockToInventory: true,
    refundMethod: 'CREDIT_BALANCE',
    tenantId: 'tenant-alnoor',
    entryNumber: 'JE-RET-2026-8801',
    operatorName: 'Auditor',
  });

  const poReceiptJournal = createPurchaseOrderReceiptJournal(
    {
      id: 'po-test-200',
      tenantId: 'tenant-alnoor',
      poNumber: 'PO-2026-8802',
      supplierId: 'sup-001',
      supplierName: 'الشركة السعودية للأتمتة الصناعية',
      orderDate: '2026-11-02',
      expectedDate: '2026-11-05',
      items: [],
      subtotal: 15000,
      taxAmount: 2250,
      total: 17250,
      status: 'RECEIVED',
      warehouseId: 'wh-ruh-main',
    },
    'tenant-alnoor',
    'JE-PO-2026-8802',
    'WMS Lead'
  );

  const supplierPaymentJournal = createSupplierPaymentJournalEntry({
    supplierId: 'sup-001',
    supplierName: 'الشركة السعودية للأتمتة الصناعية',
    amount: 7250,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: 'SPV-2026-8803',
    tenantId: 'tenant-alnoor',
    entryNumber: 'JE-SPV-2026-8803',
    operatorName: 'CFO',
  });

  const ccExpenseJournal = createCostCenterExpenseJournalEntry({
    costCenterCode: 'CC-OPS-RYD',
    costCenterNameAr: 'مركز تكلفة العمليات والتشغيل',
    expenseAccountCode: '5203',
    expenseAccountNameAr: 'مصروفات الصيانة والتشغيل',
    amount: 1800,
    paymentMethod: 'CASH',
    description: 'صيانة رافعات المستودع المركزي',
    tenantId: 'tenant-alnoor',
    entryNumber: 'JE-CC-2026-8804',
    operatorName: 'Accountant',
  });

  const combinedJournals = [
    ...SEED_JOURNAL_ENTRIES,
    saleJournal,
    cogsJournal,
    returnJournal,
    poReceiptJournal,
    supplierPaymentJournal,
    ccExpenseJournal,
  ];

  const tb = generateTrialBalance(SEED_CHART_OF_ACCOUNTS, combinedJournals);
  assert.equal(tb.isBalanced, true);
  assert.equal(tb.grandDebit, tb.grandCredit);

  const finStmt = calculateDynamicFinancialStatements(
    SEED_CHART_OF_ACCOUNTS,
    [returnJournal],
    [
      {
        id: 'inv-test-100',
        tenantId: 'tenant-alnoor',
        invoiceNumber: 'INV-2026-8800',
        customerId: 'cust-001',
        customerName: 'شركة البناء الحديث للمقاولات العامة',
        branchId: 'branch-ruh-01',
        date: '2026-11-02',
        items: [],
        subtotal: 10000,
        discountAmount: 0,
        taxAmount: 1500,
        grandTotal: 11500,
        paidAmount: 0,
        paymentMethod: 'CREDIT',
        status: 'PARTIAL',
      },
    ],
    []
  );
  // Base 21,000 + 1,500 invoice VAT - 300 credit note VAT reversal = 22,200
  assert.equal(finStmt.outputVat, 22200);
});

test('Boundary, Zero, Negative, and Duplicate Reversal Guards reject invalid financial operations', async () => {
  const {
    createCustomerReceiptJournalEntry,
    createSupplierPaymentJournalEntry,
    createSalesReturnCreditNoteJournal,
    createCostCenterExpenseJournalEntry,
    createFXRevaluationJournalEntry,
    createReversingJournalEntry,
  } = await import('./accountingEngine');

  assert.throws(() =>
    createCustomerReceiptJournalEntry({
      customerId: 'c1',
      customerName: 'Test',
      amount: 0,
      paymentMethod: 'CASH',
      referenceNumber: 'RV-0',
      tenantId: 't1',
      entryNumber: 'JE-0',
      operatorName: 'User',
    })
  );

  assert.throws(() =>
    createSupplierPaymentJournalEntry({
      supplierId: 's1',
      supplierName: 'Supplier',
      amount: 0,
      paymentMethod: 'CASH',
      referenceNumber: 'SPV-0',
      tenantId: 't1',
      entryNumber: 'JE-0',
      operatorName: 'User',
    })
  );

  assert.throws(() =>
    createSalesReturnCreditNoteJournal({
      creditNoteNumber: 'CN-0',
      originalInvoiceNumber: 'INV-0',
      customerName: 'Cust',
      subtotal: 0,
      taxAmount: 0,
      totalRefund: 0,
      totalCostOfReturnedGoods: 0,
      restockToInventory: true,
      refundMethod: 'CASH',
      tenantId: 't1',
      entryNumber: 'JE-0',
      operatorName: 'User',
    })
  );

  assert.throws(() =>
    createCostCenterExpenseJournalEntry({
      costCenterCode: 'CC-1',
      costCenterNameAr: 'CC',
      expenseAccountCode: '5203',
      expenseAccountNameAr: 'Exp',
      amount: 0,
      paymentMethod: 'CASH',
      description: 'Zero',
      tenantId: 't1',
      entryNumber: 'JE-0',
      operatorName: 'User',
    })
  );

  assert.throws(() => createFXRevaluationJournalEntry(0, 't1', 'JE-FX-0', 'User'));

  // Duplicate reversal guard: reversing an already reversed entry must throw
  assert.throws(() =>
    createReversingJournalEntry(
      {
        id: 'je-already-rev',
        tenantId: 't1',
        entryNumber: 'JE-1',
        date: '2026-11-01',
        referenceType: 'MANUAL',
        description: 'Already reversed',
        lines: [
          { id: '1', accountId: 'acc-1101', accountCode: '1101', accountName: 'Cash', accountNameAr: 'نقدية', debit: 100, credit: 0 },
          { id: '2', accountId: 'acc-4101', accountCode: '4101', accountName: 'Sales', accountNameAr: 'مبيعات', debit: 0, credit: 100 },
        ],
        totalDebit: 100,
        totalCredit: 100,
        isPosted: true,
        isReversed: true,
        createdByName: 'Admin',
        createdAt: new Date().toISOString(),
      },
      'Second reversal attempt',
      'REV-JE-1',
      'Auditor'
    )
  );
});

test('Multi-Category Smart Label OCR & Expired Warranty Detection accurately classify Inverter, LiFePO4 Battery, Smart Screen, and Out-of-Warranty claims', async () => {
  const {
    parseSmartProductLabelOCR,
    evaluateSerialWarrantyStatus,
  } = await import('./inventoryEngine');
  const { SEED_PRODUCTS } = await import('../data/seedData');

  const deyeOcr = parseSmartProductLabelOCR(
    'DEYE HYBRID INVERTER SUN-8K-SG01LP1-EU | POWER: 8kW | BUS: 48VDC | SN: SN-DEYE-8K-2026-9911',
    SEED_PRODUCTS,
    []
  );
  assert.equal(deyeOcr.subCategory, 'HYBRID_INVERTER');
  assert.equal(deyeOcr.powerRatingWatts, 8000);
  assert.equal(deyeOcr.matchedProductId, 'prd-sol-inv-8k');

  const batteryOcr = parseSmartProductLabelOCR(
    'FELICITY SOLAR LIFEPO4 BATTERY LPBF48200-M | 48V | 200Ah (10.24kWh) | SN: SN-FLC-2026-3310',
    SEED_PRODUCTS,
    []
  );
  assert.equal(batteryOcr.subCategory, 'LITHIUM_BATTERY');
  assert.equal(batteryOcr.matchedProductId, 'prd-bat-li-200');

  const screenOcr = parseSmartProductLabelOCR(
    'SAMSUNG 65" 4K QLED SMART TV 120HZ | MODEL: QA65Q70DAUXZN | SN: SN-SAM-QLED65-7720',
    SEED_PRODUCTS,
    []
  );
  assert.equal(screenOcr.subCategory, 'SMART_SCREEN');
  assert.equal(screenOcr.matchedProductId, 'prd-scr-qled-65');

  // Expired warranty test: purchased 2022-01-01 with 24 months warranty, evaluated on 2026-11-02
  const expiredEval = evaluateSerialWarrantyStatus({
    purchaseDateIso: '2022-01-01',
    warrantyMonths: 24,
    referenceDateIso: '2026-11-02',
  });
  assert.equal(expiredEval.isUnderWarranty, false);
  assert.equal(expiredEval.remainingDays, 0);
});

test('Landed Cost allocation (BY_VALUE and BY_QUANTITY) accurately updates Effective Unit Cost (WAC) and preserves exact total extra cost', async () => {
  const { allocateLandedCost } = await import('./inventoryEngine');

  const items = [
    { productId: 'prd-1', quantity: 10, baseCost: 1000 }, // 10,000 value
    { productId: 'prd-2', quantity: 30, baseCost: 500 },  // 15,000 value
  ];
  const totalExtra = 2500; // 10% of 25,000 total value

  const byValue = allocateLandedCost(items, totalExtra, 'BY_VALUE');
  assert.equal(byValue.length, 2);
  // prd-1 has 40% of total value -> 1000 extra -> +100 per unit -> 1100
  assert.equal(byValue[0].allocatedCost, 1000);
  assert.equal(byValue[0].newEffectiveUnitCost, 1100);
  // prd-2 has 60% of total value -> 1500 extra -> +50 per unit -> 550
  assert.equal(byValue[1].allocatedCost, 1500);
  assert.equal(byValue[1].newEffectiveUnitCost, 550);

  const byQty = allocateLandedCost(items, 2000, 'BY_QUANTITY');
  // 40 total units -> +50 per unit for both items
  assert.equal(byQty[0].allocatedCost, 500);
  assert.equal(byQty[0].newEffectiveUnitCost, 1050);
  assert.equal(byQty[1].allocatedCost, 1500);
  assert.equal(byQty[1].newEffectiveUnitCost, 550);
});

test('Direct Sales & POS Checkout dual-journal invariant (Revenue + VAT and Perpetual COGS) maintains Trial Balance equilibrium and accurate Gross Margin', async () => {
  const {
    createSalesInvoiceJournal,
    createDeliveryNoteCOGSJournalEntry,
    generateTrialBalance,
    calculateDynamicFinancialStatements,
  } = await import('./accountingEngine');
  const { SEED_CHART_OF_ACCOUNTS, SEED_JOURNAL_ENTRIES } = await import('../data/seedData');

  const sampleInv = {
    id: 'inv-dual-test',
    tenantId: 'ten-1',
    invoiceNumber: 'INV-2026-7700',
    customerId: 'cust-1',
    customerName: 'شركة الطاقة الشمسية المتقدمة',
    branchId: 'br-1',
    date: '2026-11-02',
    items: [
      {
        productId: 'prd-sol-inv-8k',
        productName: 'إنفرتر هجين Deye 8kW',
        sku: 'SOL-INV-DEYE8K',
        quantity: 2,
        unitPrice: 4800,
        discount: 0,
        taxRate: 15,
        taxAmount: 1440,
        total: 11040,
      },
    ],
    subtotal: 9600,
    discountAmount: 0,
    taxAmount: 1440,
    grandTotal: 11040,
    paidAmount: 0,
    paymentMethod: 'CREDIT' as const,
    status: 'PARTIAL' as const,
    qrData: 'ZATCA-TEST',
  };

  const revJournal = createSalesInvoiceJournal(sampleInv, 'ten-1', 'JE-INV-7700');
  const cogsJournal = createDeliveryNoteCOGSJournalEntry({
    deliveryNoteNumber: sampleInv.invoiceNumber,
    customerName: sampleInv.customerName,
    totalCostOfGoods: 7200, // 2 * 3600 WAC
    tenantId: 'ten-1',
    entryNumber: 'JE-COGS-7700',
    operatorName: 'System',
  });

  const combinedJournals = [revJournal, cogsJournal, ...SEED_JOURNAL_ENTRIES];
  const tb = generateTrialBalance(SEED_CHART_OF_ACCOUNTS, combinedJournals);
  assert.equal(tb.isBalanced, true);
  assert.equal(tb.grandDebit, tb.grandCredit);

  const fin = calculateDynamicFinancialStatements(
    SEED_CHART_OF_ACCOUNTS,
    combinedJournals,
    [sampleInv],
    []
  );
  assert.ok(fin.revenues >= 9600);
  assert.ok(fin.expenses >= 7200);
});

test('parseStructuredVendorInvoiceText dynamically extracts vendor, invoice number, items, subtotal, VAT, and totalDue from diverse OCR inputs', async () => {
  const { parseStructuredVendorInvoiceText } = await import('./inventoryEngine');

  const rawA = `INVOICE #INV-9021
Vendor: Global Tools & Machinery GmbH
Item: Hydraulic High-Pressure Pump 50HP
Qty: 2
Unit Price: SAR 4,200
Subtotal: SAR 8,400
VAT 15%: SAR 1,260
Total Due: SAR 9,660`;

  const parsedA = parseStructuredVendorInvoiceText(rawA);
  assert.equal(parsedA.vendor, 'Global Tools & Machinery GmbH');
  assert.equal(parsedA.invoiceNumber, 'INV-9021');
  assert.equal(parsedA.subtotal, 8400);
  assert.equal(parsedA.vat15, 1260);
  assert.equal(parsedA.totalDue, 9660);
  assert.equal(parsedA.items.length, 1);
  assert.equal(parsedA.items[0].qty, 2);
  assert.equal(parsedA.items[0].total, 8400);

  // Different input MUST yield different dynamic output (Anti-Fake Verification Rule #3)
  const rawB = `رقم الفاتورة: INV-SOLAR-2026-55
المورد: شركة تقنية الطاقة الشمسية المتقدمة
10x لوح شمسي مونو 550 واط @ 500 SAR
2x إنفرتر هجين 8 كيلوواط @ 3,500 SAR`;

  const parsedB = parseStructuredVendorInvoiceText(rawB);
  assert.equal(parsedB.vendor, 'شركة تقنية الطاقة الشمسية المتقدمة');
  assert.equal(parsedB.invoiceNumber, 'INV-SOLAR-2026-55');
  assert.equal(parsedB.items.length, 2);
  assert.equal(parsedB.subtotal, 12000); // 10*500 + 2*3500
  assert.equal(parsedB.vat15, 1800); // 15% of 12,000
  assert.equal(parsedB.totalDue, 13800);
});

test('parseStructuredVendorInvoiceText safely handles empty or whitespace-only input with zero confidence and zero amounts', async () => {
  const { parseStructuredVendorInvoiceText } = await import('./inventoryEngine');

  const emptyRes = parseStructuredVendorInvoiceText('   ');
  assert.equal(emptyRes.vendor, '');
  assert.equal(emptyRes.invoiceNumber, '');
  assert.equal(emptyRes.subtotal, 0);
  assert.equal(emptyRes.vat15, 0);
  assert.equal(emptyRes.totalDue, 0);
  assert.equal(emptyRes.confidence, 0);
  assert.equal(emptyRes.items.length, 0);
});

test('validateAndCalculateCouponDiscount & evaluateAutomaticPromotionalOffers validate percentage, fixed, min order, expired, and bulk offers accurately', async () => {
  const {
    validateAndCalculateCouponDiscount,
    evaluateAutomaticPromotionalOffers,
    SEED_PROMO_COUPONS,
    SEED_PROMOTIONAL_OFFERS,
  } = await import('./promotionsEngine');

  // 1. Valid percentage coupon SOLAR10 (10% off, min 500, cap 2500)
  const validSolar = validateAndCalculateCouponDiscount({
    code: 'solar10',
    subtotal: 2000,
    coupons: SEED_PROMO_COUPONS,
    activeIndustry: 'electronics',
    nowIso: '2026-11-03',
  });
  assert.equal(validSolar.valid, true);
  assert.equal(validSolar.discountAmount, 200);
  assert.equal(validSolar.netSubtotal, 1800);

  // 2. Below minimum order for VIP250 (requires 1500)
  const belowMin = validateAndCalculateCouponDiscount({
    code: 'VIP250',
    subtotal: 800,
    coupons: SEED_PROMO_COUPONS,
    activeIndustry: 'electronics',
    nowIso: '2026-11-03',
  });
  assert.equal(belowMin.valid, false);
  assert.equal(belowMin.reasonCode, 'BELOW_MIN_ORDER');
  assert.equal(belowMin.discountAmount, 0);

  // 3. Expired coupon EXPIRED2024
  const expired = validateAndCalculateCouponDiscount({
    code: 'EXPIRED2024',
    subtotal: 3000,
    coupons: SEED_PROMO_COUPONS,
    activeIndustry: 'electronics',
    nowIso: '2026-11-03',
  });
  assert.equal(expired.valid, false);
  assert.equal(expired.reasonCode, 'EXPIRED');

  // 4. Automatic bulk offer (4+ units -> 5% off)
  const bulkOffer = evaluateAutomaticPromotionalOffers({
    items: [
      { quantity: 2, unitPrice: 1000 },
      { quantity: 3, unitPrice: 500 },
    ],
    offers: SEED_PROMOTIONAL_OFFERS,
    subtotal: 3500,
    nowIso: '2026-11-03',
  });
  assert.equal(bulkOffer.appliedOfferId, 'off-solar-bundle');
  assert.equal(bulkOffer.offerDiscountAmount, 175); // 5% of 3500
});

test('MasterSystemConfig engine resolves Single-Industry Lock, Module Visibility, and Global Currencies (YER, SAR, USD)', async () => {
  const {
    DEFAULT_MASTER_SYSTEM_CONFIG,
    isModuleVisibleUnderMasterConfig,
    resolveEffectiveIndustryMode,
    formatCurrencyAmount,
    GLOBAL_CURRENCIES_META,
  } = await import('./systemConfigEngine');

  assert.equal(GLOBAL_CURRENCIES_META.YER.symbolAr, 'ر.ي');
  assert.equal(GLOBAL_CURRENCIES_META.SAR.symbolAr, 'ر.س');
  assert.equal(GLOBAL_CURRENCIES_META.USD.symbolAr, '$');
  assert.ok(formatCurrencyAmount(150000, 'YER', 'ar').includes('ر.ي'));

  // Hidden masterAdmin module is ONLY visible when isHiddenMasterAdmin=true
  assert.equal(
    isModuleVisibleUnderMasterConfig('masterAdmin', DEFAULT_MASTER_SYSTEM_CONFIG, false),
    false
  );
  assert.equal(
    isModuleVisibleUnderMasterConfig('masterAdmin', DEFAULT_MASTER_SYSTEM_CONFIG, true),
    true
  );

  // Single-industry lock overrides activeIndustry
  const lockedCfg = {
    ...DEFAULT_MASTER_SYSTEM_CONFIG,
    industryLockMode: 'SINGLE_LOCKED' as const,
    lockedIndustry: 'electronics' as const,
  };
  assert.equal(resolveEffectiveIndustryMode('restaurant', lockedCfg), 'electronics');
});

test('verifyHardwareComponentIntegrity & evaluateMonotonicClockGuard immediately lock system on single-component failure or backward clock rollback', async () => {
  const {
    detectRealHardwareFingerprint,
    verifyHardwareComponentIntegrity,
    evaluateMonotonicClockGuard,
    evaluateSystemProtectionState,
  } = await import('./securityEngine');

  const baseHw = detectRealHardwareFingerprint({ hostname: 'NODE-100' });
  const intactCheck = verifyHardwareComponentIntegrity(baseHw, baseHw);
  assert.equal(intactCheck.intact, true);
  assert.equal(intactCheck.failedComponents.length, 0);

  // Tamper ONLY the Motherboard serial (1 out of 5 internal components)
  const tamperedMbHw = {
    ...baseHw,
    motherboardSerial: 'MB-REPLACED-999999',
  };
  const mbCheck = verifyHardwareComponentIntegrity(baseHw, tamperedMbHw);
  assert.equal(mbCheck.intact, false);
  assert.deepEqual(mbCheck.failedComponents, ['MOTHERBOARD']);

  const stateOnHardwareTamper = evaluateSystemProtectionState({
    hardware: tamperedMbHw,
    boundHardware: baseHw,
    trialStartedAtMs: Date.parse('2026-11-01T00:00:00.000Z'),
    activeSerial: null,
    nowMs: Date.parse('2026-11-03T12:00:00.000Z'),
  });
  assert.equal(stateOnHardwareTamper.isLocked, true);
  assert.equal(stateOnHardwareTamper.status, 'DEVICE_MISMATCH');
  assert.deepEqual(stateOnHardwareTamper.failedHardwareComponents, ['MOTHERBOARD']);

  // Monotonic clock rollback detection (system time moved backward by 2 hours)
  const maxSeenMs = Date.parse('2026-11-10T12:00:00.000Z');
  const rolledBackNowMs = Date.parse('2026-11-10T09:00:00.000Z');
  const clockGuard = evaluateMonotonicClockGuard(rolledBackNowMs, maxSeenMs);
  assert.equal(clockGuard.clockTampered, true);

  const stateOnClockRollback = evaluateSystemProtectionState({
    hardware: baseHw,
    boundHardware: baseHw,
    trialStartedAtMs: Date.parse('2026-11-01T00:00:00.000Z'),
    activeSerial: null,
    nowMs: rolledBackNowMs,
    lastSeenClockMs: maxSeenMs,
  });
  assert.equal(stateOnClockRollback.isLocked, true);
  assert.equal(stateOnClockRollback.status, 'CLOCK_TAMPERED');
});

test('Track 9 Omnichannel Messaging Engine: normalizeInternationalPhone, buildWhatsAppAndSmsProtocolLinks, and composers work for Yemen (+967), Saudi (+966), and International numbers', async () => {
  const {
    normalizeInternationalPhone,
    buildWhatsAppAndSmsProtocolLinks,
    composeInvoiceMessageText,
    composeDebtReminderMessageText,
    composeReceiptVoucherMessageText,
    composeWarrantyRMAMessageText,
    composeExecutiveReportMessageText,
  } = await import('./messagingEngine');

  // 1. Yemeni local mobile number (77xxxxxxx)
  const yemenNorm = normalizeInternationalPhone('771 445 880', '+967');
  assert.equal(yemenNorm.valid, true);
  assert.equal(yemenNorm.e164Phone, '+967771445880');
  assert.equal(yemenNorm.digitsOnly, '967771445880');
  assert.equal(yemenNorm.countryDetected, 'YEMEN');

  // 2. Saudi local mobile number (05xxxxxxxx)
  const saudiNorm = normalizeInternationalPhone('0508821940', '+966');
  assert.equal(saudiNorm.valid, true);
  assert.equal(saudiNorm.e164Phone, '+966508821940');
  assert.equal(saudiNorm.digitsOnly, '966508821940');
  assert.equal(saudiNorm.countryDetected, 'SAUDI');

  // 3. Invalid short or empty input
  const invalidNorm = normalizeInternationalPhone('123');
  assert.equal(invalidNorm.valid, false);
  assert.equal(invalidNorm.countryDetected, 'INVALID');

  // 4. Deep protocol links (wa.me & sms:)
  const links = buildWhatsAppAndSmsProtocolLinks('771445880', 'فاتورة رقم INV-101', '+967');
  assert.equal(links.valid, true);
  assert.ok(links.whatsappWebUrl.startsWith('https://wa.me/967771445880?text='));
  assert.ok(links.smsUri.startsWith('sms:+967771445880?body='));

  // 5. Structured composers
  const invMsg = composeInvoiceMessageText({
    invoice: {
      id: 'inv-1',
      tenantId: 'ten-1',
      invoiceNumber: 'INV-2026-5001',
      customerId: 'cust-1',
      customerName: 'مؤسسة الطاقة الحديثة',
      branchId: 'br-1',
      date: '2026-11-03',
      items: [
        {
          productId: 'p-1',
          productName: 'بطارية ليثيوم 200Ah',
          sku: 'BAT-LFP-200',
          quantity: 2,
          unitPrice: 3500,
          discount: 0,
          taxRate: 15,
          taxAmount: 1050,
          total: 7000,
          serialNumber: 'SN-LFP-901',
          warrantyMonths: 60,
        },
      ],
      subtotal: 7000,
      discountAmount: 500,
      couponCode: 'SOLAR10',
      taxAmount: 975,
      grandTotal: 7475,
      paidAmount: 5000,
      paymentMethod: 'CREDIT',
      status: 'PARTIAL',
    },
    companyName: 'شركة النور للطاقة والإلكترونيات',
    currency: 'YER',
  });
  assert.ok(invMsg.includes('INV-2026-5001'));
  assert.ok(invMsg.includes('SN-LFP-901'));
  assert.ok(invMsg.includes('SOLAR10'));
  assert.ok(invMsg.includes('2,475')); // Remaining unpaid balance

  const debtMsg = composeDebtReminderMessageText({
    customerName: 'مؤسسة الأفق',
    totalBalance: 18450,
    current0To30: 5000,
    daysOver90: 13450,
    companyName: 'شركة النور',
    currency: 'SAR',
  });
  assert.ok(debtMsg.includes('18,450'));
  assert.ok(debtMsg.includes('13,450'));

  const rvMsg = composeReceiptVoucherMessageText({
    voucherNumber: 'RV-2026-99',
    customerName: 'مؤسسة الأفق',
    amountReceived: 4000,
    remainingBalance: 14450,
    paymentMethod: 'حوالة بنكية',
    companyName: 'شركة النور',
    currency: 'SAR',
  });
  assert.ok(rvMsg.includes('RV-2026-99'));
  assert.ok(rvMsg.includes('14,450'));

  const rmaMsg = composeWarrantyRMAMessageText({
    ticket: {
      id: 'rma-1',
      tenantId: 'ten-1',
      ticketNumber: 'RMA-2026-77',
      customerName: 'م. سالم العولقي',
      customerPhone: '+967771223344',
      productId: 'p-inv-1',
      productName: 'انفرتر هجين Deye 8KW',
      sku: 'INV-DEYE-8K',
      serialNumber: 'SN-DEYE-8821',
      purchaseDate: '2026-01-10',
      warrantyMonths: 24,
      warrantyExpiryDate: '2028-01-10',
      isUnderWarranty: true,
      faultDescription: 'توقف شحن MPPT2',
      technicianReport: 'تم استبدال بردة الحماية مجاناً تحت الضمان',
      sparePartsUsed: 'بردة حماية MPPT',
      sparePartsCost: 0,
      laborFee: 0,
      totalCustomerCharge: 0,
      status: 'READY',
      receivedAt: '2026-11-01',
      expectedDeliveryDate: '2026-11-05',
    },
    companyName: 'شركة النور',
    currency: 'YER',
  });
  assert.ok(rmaMsg.includes('RMA-2026-77'));
  assert.ok(rmaMsg.includes('SN-DEYE-8821'));

  const execMsg = composeExecutiveReportMessageText({
    companyName: 'شركة النور',
    reportTitleAr: 'التقرير المالي اليومي للإدارة العليا',
    totalRevenue: 250000,
    netProfit: 64000,
    cashBalance: 180000,
    receivablesTotal: 42000,
    payablesTotal: 19000,
    lowStockCount: 3,
    currency: 'YER',
    activeIndustryAr: 'الإلكترونيات والطاقة الشمسية',
  });
  assert.ok(execMsg.includes('250,000'));
  assert.ok(execMsg.includes('64,000'));
});

test('Track 10 Industry Chameleon Blueprints: All 6 industries have complete blueprints, calculators, and specialized supplies catalogs', async () => {
  const { INDUSTRY_BLUEPRINTS, getIndustryBlueprint } = await import('./industryBlueprints');
  const industries = ['electronics', 'restaurant', 'grocery', 'pharmacy', 'contracting', 'general'] as const;

  for (const ind of industries) {
    const bp = getIndustryBlueprint(ind);
    assert.equal(bp.id, ind);
    assert.ok(bp.nameAr.length > 5);
    assert.ok(bp.posTitleAr.length > 5);
    assert.ok(bp.inventoryTitleAr.length > 5);
    assert.ok(bp.supplies.length >= 4, `Expected >= 4 supplies for ${ind}`);
    // Test quick calculator
    const calcOut = bp.quickCalculator.computeDescription(
      bp.quickCalculator.defaultInput1,
      bp.quickCalculator.defaultInput2
    );
    assert.ok(calcOut.primaryResult > 0);
    assert.ok(calcOut.recommendationAr.length > 10);
  }
  assert.equal(Object.keys(INDUSTRY_BLUEPRINTS).length, 6);
});

test('Track 11 & 12 Communications: WhatsApp Web QR pairing, in-app chats, USB Phone ADB Bridge & SMS parts calculation', async () => {
  const {
    createInitialWhatsAppSession,
    generatePairingQRToken,
    SEED_WHATSAPP_CHATS,
    createDefaultUsbConnectedDevice,
    runUsbAutoDiagnostics,
    calculateSmsParts,
  } = await import('./communicationsEngine');

  // 1. WhatsApp Web Pairing & QR
  const session = createInitialWhatsAppSession();
  assert.equal(session.status, 'CONNECTED');
  assert.ok(session.phoneNumber.includes('+967'));
  assert.ok(session.batteryLevel > 80);

  const qr = generatePairingQRToken();
  assert.ok(qr.token.startsWith('WAPP-PAIR-'));
  assert.equal(qr.matrixData.length, 21);
  assert.equal(qr.matrixData[0].length, 21);
  assert.equal(qr.matrixData[0][0], true); // Top-left finder marker is black/true

  // 2. In-App Chat List
  assert.ok(SEED_WHATSAPP_CHATS.length >= 3);
  const custChat = SEED_WHATSAPP_CHATS[0];
  assert.equal(custChat.id, 'chat-cust-1');
  assert.ok(custChat.messages.length >= 2);
  assert.equal(custChat.messages[1].attachmentType, 'INVOICE');

  // 3. USB Mobile Phone Bridge & Diagnostics
  const usbDev = createDefaultUsbConnectedDevice();
  assert.equal(usbDev.connectionMode, 'ADB_DEBUGGING');
  assert.ok(usbDev.signalStrengthPercent >= 90);
  assert.ok(usbDev.model.includes('Samsung'));

  const diag = runUsbAutoDiagnostics(usbDev);
  assert.equal(diag.usbPortCheck, true);
  assert.equal(diag.driverLoaded, true);
  assert.equal(diag.adbDaemonRunning, true);
  assert.equal(diag.usbPermissionGranted, true);
  assert.equal(diag.atCmdResponseOk, true);
  assert.ok(diag.diagnosticLogs.length >= 7);

  // 4. SMS Character & Part Counting
  const arSms = calculateSmsParts('فاتورة ضريبية من شركة النور رقم INV-2026-1001 بمبلغ 5000 ر.س');
  assert.equal(arSms.isUnicode, true);
  assert.equal(arSms.partCount, 1);
  assert.ok(arSms.charCount <= 70);

  const longArSms = calculateSmsParts('أ'.repeat(80));
  assert.equal(longArSms.partCount, 2);
});

test('Track 13 Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfer with Balanced Clearing Journal', async () => {
  const {
    SEED_BRANCH_NODES,
    calculateCrossBranchStockMatrix,
    createInterBranchTransferDocAndJournal,
  } = await import('./communicationsEngine');

  assert.equal(SEED_BRANCH_NODES.length, 4);

  const mockProducts = [
    {
      id: 'p-sol-585',
      tenantId: 'ten-1',
      sku: 'SOL-PNL-585W',
      barcode: '6281042005014',
      name: 'Jinko Solar Panel 585W',
      nameAr: 'لوح طاقة شمسية 585W',
      categoryId: 'cat-1',
      uom: 'PCS',
      costPrice: 365,
      salePrice: 485,
      taxRate: 15,
      stockQty: 160,
      minStock: 20,
      maxStock: 500,
      reorderPoint: 30,
      warehouseId: 'wh-ruh-main',
      hasSerials: true,
      hasBatches: false,
      isActive: true,
    },
  ];

  // 1. Calculate live cross-branch stock matrix
  const matrix = calculateCrossBranchStockMatrix({
    productSku: 'SOL-PNL-585W',
    currentBranchId: 'branch-ruh-01',
    allProducts: mockProducts as any,
  });

  assert.equal(matrix.length, 4);
  const currentBranchItem = matrix.find((m) => m.isCurrentBranch);
  assert.ok(currentBranchItem);
  assert.equal(currentBranchItem?.stockQty, 160);
  assert.ok(currentBranchItem?.availableQty > 150);

  const otherBranchItem = matrix.find((m) => m.branchId === 'branch-jed-02');
  assert.ok(otherBranchItem);
  assert.ok(otherBranchItem!.stockQty > 50);
  assert.ok(otherBranchItem!.availableQty > 40);

  // 2. Create inter-branch stock transfer & verify double-entry clearing journal equilibrium
  const sourceNode = SEED_BRANCH_NODES[0];
  const targetNode = SEED_BRANCH_NODES[1];

  const { transferDoc, clearingJournal } = createInterBranchTransferDocAndJournal({
    tenantId: 'ten-1',
    sourceBranch: sourceNode,
    targetBranch: targetNode,
    product: mockProducts[0] as any,
    requestedQty: 10,
    urgency: 'URGENT',
    operatorName: 'م. طارق المنصور',
  });

  assert.equal(transferDoc.requestedQty, 10);
  assert.equal(transferDoc.status, 'APPROVED');
  assert.equal(clearingJournal.lines.length, 2);
  assert.equal(clearingJournal.totalDebit, clearingJournal.totalCredit);
  assert.equal(clearingJournal.totalDebit, 3650); // 10 units * 365 cost
  assert.equal(clearingJournal.lines[0].debit, 3650);
  assert.equal(clearingJournal.lines[1].credit, 3650);
});

test('Track 14 Advance Inter-Branch Transfer status updates inventory upon receipt', async () => {
  const { advanceInterBranchTransferStatus } = await import('./communicationsEngine');

  const mockTransfer = {
    id: 'tr-100',
    tenantId: 'ten-1',
    requestNumber: 'TR-100',
    sourceBranchId: 'branch-ruh-01',
    sourceBranchNameAr: 'الرياض',
    targetBranchId: 'branch-jed-02',
    targetBranchNameAr: 'جدة',
    productId: 'p-1',
    productNameAr: 'إنفرتر هجين',
    sku: 'INV-HYB-5K',
    requestedQty: 6,
    urgency: 'URGENT' as const,
    requestedBy: 'أحمد',
    requestedAt: '2026-11-03',
    status: 'APPROVED' as const,
  };

  const currentProducts = [
    {
      id: 'p-1',
      sku: 'INV-HYB-5K',
      nameAr: 'إنفرتر هجين',
      stockQty: 20,
    },
  ];

  // Transition to IN_TRANSIT
  const inTransitResult = advanceInterBranchTransferStatus(
    mockTransfer,
    'IN_TRANSIT',
    currentProducts as any,
    'تم تسليم البضاعة لسائق الشاحنة'
  );
  assert.equal(inTransitResult.updatedTransfer.status, 'IN_TRANSIT');
  assert.equal(inTransitResult.stockDeltaApplied, 0);
  assert.equal(inTransitResult.updatedProducts[0].stockQty, 20);

  // Transition to RECEIVED -> must increase inventory by 6
  const receivedResult = advanceInterBranchTransferStatus(
    inTransitResult.updatedTransfer,
    'RECEIVED',
    inTransitResult.updatedProducts as any,
    'تم استلام وتفريغ البضاعة بالمستودع بنجاح'
  );
  assert.equal(receivedResult.updatedTransfer.status, 'RECEIVED');
  assert.equal(receivedResult.stockDeltaApplied, 6);
  assert.equal(receivedResult.updatedProducts[0].stockQty, 26);
});

test('Track 15 Bulk Debt SMS Campaign filters debtors and increments USB SIM dispatch count', async () => {
  const {
    buildBulkDebtSmsCampaign,
    createDefaultUsbConnectedDevice,
    createSimulatedInboundWhatsAppMessage,
  } = await import('./communicationsEngine');

  const mockCustomers = [
    { id: 'c-1', name: 'Al-Amari Trading', nameAr: 'شركة العماري', phone: '0501234567', balance: 5400 },
    { id: 'c-2', name: 'Zero Balance Customer', nameAr: 'عميل مسدد', phone: '0559998888', balance: 0 },
    { id: 'c-3', name: 'Negative Advance Customer', nameAr: 'عميل دائن', phone: '0541112222', balance: -200 },
    { id: 'c-4', name: 'Yemen Solar Tech', nameAr: 'تقنية الطاقة صنعاء', phone: '770987654', balance: 12500 },
  ];

  const device = createDefaultUsbConnectedDevice();
  const initialSent = device.messagesSentCount;

  const campaign = buildBulkDebtSmsCampaign(mockCustomers, device);
  assert.equal(campaign.targetedCustomersCount, 2); // only c-1 and c-4 have positive debt
  assert.equal(campaign.totalDebtAmount, 17900);
  assert.equal(campaign.smsQueue.length, 2);
  assert.ok(campaign.smsQueue[0].messageBody.includes('5,400'));
  assert.ok(campaign.smsQueue[1].messageBody.includes('12,500'));
  assert.ok(campaign.updatedDevice.messagesSentCount > initialSent);

  // Simulate customer inbound WhatsApp reply
  const reply = createSimulatedInboundWhatsAppMessage('chat-cust-1', 'تم تحويل الدفعة بنجاح عبر البنك الأهلي');
  assert.equal(reply.sender, 'THEM');
  assert.equal(reply.status, 'READ');
  assert.equal(reply.text, 'تم تحويل الدفعة بنجاح عبر البنك الأهلي');
});

test('Track 16 LAN Mobile QR Matrix Generator renders accurate 25x25 matrix with 3 standard finder patterns', async () => {
  const { generateGeneralQRCodeMatrix } = await import('./communicationsEngine');

  const lanUrl = 'http://192.168.1.105:3000';
  const matrix = generateGeneralQRCodeMatrix(lanUrl, 25);

  assert.equal(matrix.length, 25);
  assert.equal(matrix[0].length, 25);

  // Check Top-Left Finder (7x7) corners
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[0][6], true);
  assert.equal(matrix[6][0], true);
  assert.equal(matrix[6][6], true);
  assert.equal(matrix[3][3], true); // Center dot

  // Check Top-Right Finder (7x7) corners
  assert.equal(matrix[0][18], true);
  assert.equal(matrix[0][24], true);
  assert.equal(matrix[6][18], true);
  assert.equal(matrix[6][24], true);

  // Check Bottom-Left Finder (7x7) corners
  assert.equal(matrix[18][0], true);
  assert.equal(matrix[18][6], true);
  assert.equal(matrix[24][0], true);
  assert.equal(matrix[24][6], true);
});

test('Track 17 Mobile Stock-Taking Engine: calculateStockAdjustmentVariance computes surplus/deficit and balanced journals', async () => {
  const { calculateStockAdjustmentVariance } = await import('./inventoryEngine');

  // Case 1: Surplus (Physical count 35 > System stock 30)
  const surplus = calculateStockAdjustmentVariance('prd-sol-585', 30, 35, 650);
  assert.equal(surplus.adjustmentType, 'SURPLUS');
  assert.equal(surplus.varianceQty, 5);
  assert.equal(surplus.varianceValue, 3250); // 5 * 650
  assert.equal(surplus.isBalanced, true);
  assert.equal(surplus.journalLines.length, 2);
  assert.equal(surplus.journalLines[0].accountId, '1103'); // Debit Inventory
  assert.equal(surplus.journalLines[0].debit, 3250);
  assert.equal(surplus.journalLines[1].accountId, '4104'); // Credit Discrepancy Gain
  assert.equal(surplus.journalLines[1].credit, 3250);

  // Case 2: Deficit (Physical count 18 < System stock 22)
  const deficit = calculateStockAdjustmentVariance('prd-bat-100ah', 22, 18, 1200);
  assert.equal(deficit.adjustmentType, 'DEFICIT');
  assert.equal(deficit.varianceQty, -4);
  assert.equal(deficit.varianceValue, 4800); // 4 * 1200
  assert.equal(deficit.isBalanced, true);
  assert.equal(deficit.journalLines.length, 2);
  assert.equal(deficit.journalLines[0].accountId, '5103'); // Debit Inventory Shrinkage Loss
  assert.equal(deficit.journalLines[0].debit, 4800);
  assert.equal(deficit.journalLines[1].accountId, '1103'); // Credit Inventory
  assert.equal(deficit.journalLines[1].credit, 4800);

  // Case 3: Matched (Physical count 15 == System stock 15)
  const matched = calculateStockAdjustmentVariance('prd-inv-5kw', 15, 15, 3100);
  assert.equal(matched.adjustmentType, 'MATCHED');
  assert.equal(matched.varianceQty, 0);
  assert.equal(matched.varianceValue, 0);
  assert.equal(matched.journalLines.length, 0);
  assert.equal(matched.isBalanced, true);
});

test('Track 18 Guaranteed Multi-Format Invoice Package: builds Text, Image, PDF, and All-in-One packages with delivery token', async () => {
  const { buildGuaranteedInvoiceDispatchPackage } = await import('./communicationsEngine');

  const pkg = buildGuaranteedInvoiceDispatchPackage({
    invoiceNumber: 'INV-2026-8800',
    customerName: 'شركة البناء والتعمير',
    customerPhone: '+967771234567',
    grandTotal: 15400,
    currency: 'YER',
    itemsSummary: '10× لوح طاقة 585W + 1× إنفرتر 8kW',
    format: 'ALL_COMBINED',
    companyName: 'مؤسسة النور للطاقة',
    branchName: 'الفرع الرئيسي',
    taxNumber: '300059281900003',
  });

  assert.ok(pkg.dispatchId.startsWith('DSP-'));
  assert.ok(pkg.ackToken.startsWith('ACK-WA-INV-2026-8800'));
  assert.equal(pkg.readyForDirectSend, true);
  assert.ok(pkg.formattedText.includes('15,400'));
  assert.ok(pkg.formattedText.includes('لوح طاقة 585W'));
  assert.ok(pkg.imageDataUri.startsWith('data:image/svg+xml'));
  assert.ok(pkg.pdfDataUri.startsWith('data:application/pdf'));
  assert.ok(pkg.receiptSummaryAr.includes('نص + صورة + PDF'));
});

test('Track 19 Encrypted Database Snapshot: encryptDatabaseSnapshotJSON and decryptDatabaseSnapshotJSON perform authenticated encryption and reject tampered or wrong-passphrase payloads', async () => {
  const {
    encryptDatabaseSnapshotJSON,
    decryptDatabaseSnapshotJSON,
  } = await import('./securityEngine');

  const rawBackupPayload = {
    version: '4.2.0',
    exportedAt: '2026-11-10T08:00:00.000Z',
    tenant: { code: 'TENANT-SOLAR-01', name: 'مؤسسة رواد الطاقة للإلكترونيات' },
    productsCount: 1,
    salesInvoicesCount: 1,
    journalEntriesCount: 2,
    auditLogsCount: 5,
    data: {
      products: [{ id: 'p-1', nameAr: 'لوح شمسي 585W', stockQty: 140 }],
      salesInvoices: [{ id: 'inv-1', grandTotal: 25800 }],
    },
  };

  // 1. Encrypt with custom passphrase
  const encryptedEnvelope = encryptDatabaseSnapshotJSON(
    rawBackupPayload,
    'SECRET-RECOVERY-KEY-2026'
  );

  assert.equal(encryptedEnvelope.format, 'RLM_ENCRYPTED_DATABASE_SNAPSHOT_V1');
  assert.equal(encryptedEnvelope.encryptionAlgorithm, 'RLM-STREAM-256+HMAC-FNV32');
  assert.equal(encryptedEnvelope.metadata.productsCount, 1);
  assert.ok(encryptedEnvelope.integritySignature.length >= 15);
  assert.ok(encryptedEnvelope.keyFingerprint.length >= 8);
  assert.ok(!encryptedEnvelope.ciphertext.includes('لوح شمسي'));

  const serializedSnapshot = JSON.stringify(encryptedEnvelope, null, 2);

  // 2. Decrypt with matching passphrase -> restores exact original JSON object
  const decryptedOk = decryptDatabaseSnapshotJSON(serializedSnapshot, 'SECRET-RECOVERY-KEY-2026');
  assert.equal(decryptedOk.success, true);
  assert.equal(decryptedOk.isEncrypted, true);
  assert.deepEqual(decryptedOk.payload, rawBackupPayload);

  // 3. Reject wrong passphrase
  const wrongKeyResult = decryptDatabaseSnapshotJSON(serializedSnapshot, 'WRONG-PASSPHRASE');
  assert.equal(wrongKeyResult.success, false);
  assert.equal(wrongKeyResult.isEncrypted, true);
  assert.ok(wrongKeyResult.errorAr?.includes('مفتاح فك التشفير غير مطابق'));

  // 4. Reject tampered ciphertext
  const tamperedEnvelope = {
    ...encryptedEnvelope,
    ciphertext: encryptedEnvelope.ciphertext.slice(0, -4) + 'AAAA',
  };
  const tamperedResult = decryptDatabaseSnapshotJSON(
    JSON.stringify(tamperedEnvelope),
    'SECRET-RECOVERY-KEY-2026'
  );
  assert.equal(tamperedResult.success, false);
  assert.equal(tamperedResult.isEncrypted, true);
  assert.ok(tamperedResult.errorAr?.includes('التوقيع الرقمي'));
});

test('Track 20 Sector Mode Configuration filters out Projects, Fleet, Manufacturing, and Business Modules and ensures only POS, Inventory, Sales, and Accounting remain for Electronics & Solar', async () => {
  const {
    DEFAULT_MASTER_SYSTEM_CONFIG,
    ELECTRONICS_SOLAR_CORE_MODULES,
    EXCLUDED_SECTOR_MODULES,
    applySectorModePreset,
    isModuleVisibleUnderMasterConfig,
    resolveEffectiveIndustryMode,
  } = await import('./systemConfigEngine');

  assert.deepEqual(
    [...ELECTRONICS_SOLAR_CORE_MODULES],
    ['pos', 'inventory', 'sales', 'accounting']
  );
  assert.deepEqual(
    [...EXCLUDED_SECTOR_MODULES],
    ['projects', 'fleet', 'manufacturing', 'businessModules']
  );
  assert.equal(DEFAULT_MASTER_SYSTEM_CONFIG.sectorMode, 'SOLAR_ELECTRONICS_CORE');
  assert.equal(DEFAULT_MASTER_SYSTEM_CONFIG.sectorModeEnabled, true);
  assert.equal(DEFAULT_MASTER_SYSTEM_CONFIG.uiElementsVisibility.showManufacturingAndProjects, false);

  // Core 4 modules (POS, Inventory, Sales, Accounting) must be visible in Sector Mode
  assert.equal(isModuleVisibleUnderMasterConfig('pos', DEFAULT_MASTER_SYSTEM_CONFIG), true);
  assert.equal(isModuleVisibleUnderMasterConfig('inventory', DEFAULT_MASTER_SYSTEM_CONFIG), true);
  assert.equal(isModuleVisibleUnderMasterConfig('sales', DEFAULT_MASTER_SYSTEM_CONFIG), true);
  assert.equal(isModuleVisibleUnderMasterConfig('accounting', DEFAULT_MASTER_SYSTEM_CONFIG), true);

  // Excluded modules ('projects', 'fleet', 'manufacturing', 'businessModules') and non-essential modules must be hidden
  assert.equal(isModuleVisibleUnderMasterConfig('projects', DEFAULT_MASTER_SYSTEM_CONFIG), false);
  assert.equal(isModuleVisibleUnderMasterConfig('fleet', DEFAULT_MASTER_SYSTEM_CONFIG), false);
  assert.equal(isModuleVisibleUnderMasterConfig('manufacturing', DEFAULT_MASTER_SYSTEM_CONFIG), false);
  assert.equal(isModuleVisibleUnderMasterConfig('businessModules', DEFAULT_MASTER_SYSTEM_CONFIG), false);
  assert.equal(isModuleVisibleUnderMasterConfig('saasPlatform', DEFAULT_MASTER_SYSTEM_CONFIG), false);
  assert.equal(isModuleVisibleUnderMasterConfig('aiInsights', DEFAULT_MASTER_SYSTEM_CONFIG), false);
  assert.equal(isModuleVisibleUnderMasterConfig('barcodeEngine', DEFAULT_MASTER_SYSTEM_CONFIG), false);
  assert.equal(isModuleVisibleUnderMasterConfig('purchasing', DEFAULT_MASTER_SYSTEM_CONFIG), false);

  // Effective industry mode must resolve to 'electronics'
  assert.equal(resolveEffectiveIndustryMode('restaurant', DEFAULT_MASTER_SYSTEM_CONFIG), 'electronics');

  // Toggling Sector Mode off expands support modules while keeping projects/fleet/manufacturing/businessModules disabled
  const expandedCfg = applySectorModePreset(DEFAULT_MASTER_SYSTEM_CONFIG, false);
  assert.equal(expandedCfg.sectorMode, 'FULL_SUITE');
  assert.equal(expandedCfg.sectorModeEnabled, false);
  assert.equal(isModuleVisibleUnderMasterConfig('dashboard', expandedCfg), true);
  assert.equal(isModuleVisibleUnderMasterConfig('projects', expandedCfg), false);
  assert.equal(isModuleVisibleUnderMasterConfig('fleet', expandedCfg), false);
  assert.equal(isModuleVisibleUnderMasterConfig('manufacturing', expandedCfg), false);
  assert.equal(isModuleVisibleUnderMasterConfig('businessModules', expandedCfg), false);

  // Toggling Sector Mode back on restores strict 4-module focus (POS, Inventory, Sales, Accounting)
  const restoredSectorCfg = applySectorModePreset(expandedCfg, true);
  assert.equal(restoredSectorCfg.sectorModeEnabled, true);
  assert.equal(isModuleVisibleUnderMasterConfig('pos', restoredSectorCfg), true);
  assert.equal(isModuleVisibleUnderMasterConfig('inventory', restoredSectorCfg), true);
  assert.equal(isModuleVisibleUnderMasterConfig('sales', restoredSectorCfg), true);
  assert.equal(isModuleVisibleUnderMasterConfig('accounting', restoredSectorCfg), true);
  assert.equal(isModuleVisibleUnderMasterConfig('dashboard', restoredSectorCfg), false);

  // Verify ERPContext helper getVisibleModulesList and Sidebar conditional rendering filter
  const { getVisibleModulesList } = await import('../context/ERPContext');
  assert.deepEqual(getVisibleModulesList(true), ['pos', 'inventory', 'sales', 'accounting']);
  assert.ok(getVisibleModulesList(false).includes('dashboard'));

  const { shouldDisplaySidebarMenuItem } = await import('../components/layout/Sidebar');
  const sampleMenu = [
    { id: 'dashboard', label: 'Executive Dashboard' },
    { id: 'pos', label: 'POS' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'sales', label: 'Sales' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'projects', label: 'Projects' },
    { id: 'fleet', label: 'Fleet' },
    { id: 'manufacturing', label: 'Manufacturing' },
    { id: 'businessModules', label: 'Business Modules' },
  ];
  const renderedWhenSectorModeTrue = sampleMenu.filter((item) =>
    shouldDisplaySidebarMenuItem(item, true, () => true)
  );
  assert.deepEqual(
    renderedWhenSectorModeTrue.map((i) => i.id),
    ['pos', 'inventory', 'sales', 'accounting']
  );
  assert.deepEqual(
    renderedWhenSectorModeTrue.map((i) => i.label),
    ['POS', 'Inventory', 'Sales', 'Accounting']
  );
});

