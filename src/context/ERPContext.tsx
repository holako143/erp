/**
 * RLM ERP - Core State Context & Store Provider
 * Multi-Tenant, Multi-Branch, Multi-Industry, Full-Stack Server Persistence & Gemini AI Integration
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Tenant,
  Company,
  Branch,
  Warehouse,
  User,
  Category,
  Product,
  BarcodeItem,
  TraceabilityEvent,
  Supplier,
  Customer,
  PurchaseOrder,
  SalesInvoice,
  ChartAccount,
  JournalEntry,
  POSShift,
  POSHoldBill,
  KitchenOrderTicket,
  Employee,
  FixedAsset,
  BillOfMaterials,
  ProductionOrder,
  Project,
  FleetVehicle,
  QualityInspection,
  CRMLead,
  EcommerceOrder,
  WorkflowApproval,
  AuditLog,
  Language,
  Direction,
  Currency,
  UserRole,
  AIChatMessage,
  InvoiceItem,
  IndustryType,
  InvoiceTemplateSettings,
  UserAccount,
  UserPermissions,
  BankStatementLine,
  PostDatedCheck,
  CurrencyExchangeRate,
  SalesPipelineDoc,
  CostCenterBudget,
  SalesReturnDoc,
  ReturnedItemCondition,
  ReturnRefundMethod,
  WarrantyMaintenanceTicket,
  SmartLabelOCRResult,
  UIElementsVisibilityConfig,
  MasterSystemConfig,
  PromoCoupon,
  PromotionalOffer,
  NetworkHostInfo,
  MessagingChannel,
  MessageTemplateCategory,
  OutboundMessageRecord,
  MessagingGatewayConfig,
  WhatsAppSessionInfo,
  WhatsAppChat,
  WhatsAppChatMessage,
  UsbConnectedDevice,
  UsbDiagnosticsReport,
  BranchNodeInfo,
  CrossBranchStockItem,
  InterBranchTransferRequest,
} from '../types/erp';
import {
  createInitialWhatsAppSession,
  generatePairingQRToken,
  SEED_WHATSAPP_CHATS,
  createDefaultUsbConnectedDevice,
  runUsbAutoDiagnostics,
  SEED_BRANCH_NODES,
  calculateCrossBranchStockMatrix,
  createInterBranchTransferDocAndJournal,
  advanceInterBranchTransferStatus,
  buildBulkDebtSmsCampaign,
  createSimulatedInboundWhatsAppMessage,
} from '../core/communicationsEngine';
import {
  SEED_TENANTS,
  SEED_COMPANY,
  SEED_BRANCHES,
  SEED_WAREHOUSES,
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_BARCODES,
  SEED_TRACEABILITY,
  SEED_SUPPLIERS,
  SEED_CUSTOMERS,
  SEED_CHART_OF_ACCOUNTS,
  SEED_JOURNAL_ENTRIES,
  SEED_SALES_INVOICES,
  SEED_PURCHASE_ORDERS,
  SEED_POS_SHIFTS,
  SEED_EMPLOYEES,
  SEED_FIXED_ASSETS,
  SEED_BOMS,
  SEED_PRODUCTION_ORDERS,
  SEED_PROJECTS,
  SEED_FLEET,
  SEED_QUALITY,
  SEED_CRM_LEADS,
  SEED_ECOMMERCE_ORDERS,
  SEED_WORKFLOW_APPROVALS,
  SEED_AUDIT_LOGS,
} from '../data/seedData';
import { TRANSLATIONS } from '../i18n/translations';
import {
  generateValidEAN13,
  generateUniqueSerialNumber,
} from '../core/barcodeEngine';
import {
  validateJournalBalance,
  createSalesInvoiceJournal,
  createReversingJournalEntry,
  calculateAssetDepreciation,
  createPDCClearingJournalEntry,
  calculateFXRevaluation,
  createFXRevaluationJournalEntry,
  createCustomerReceiptJournalEntry,
  advanceSalesPipelineDocument,
  createDeliveryNoteCOGSJournalEntry,
  createCostCenterExpenseJournalEntry,
  createSalesReturnCreditNoteJournal,
  createPurchaseOrderReceiptJournal,
  createSupplierPaymentJournalEntry,
  generateTrialBalance,
  calculateDynamicFinancialStatements,
} from '../core/accountingEngine';
import {
  calculateWeightedAverageCost,
  parseBulkProductsCSV,
  SolarSystemSizingOutput,
  parseSmartProductLabelOCR,
  evaluateSerialWarrantyStatus,
  parseStructuredVendorInvoiceText,
} from '../core/inventoryEngine';
import {
  HardwareFingerprint,
  LicenseDurationPreset,
  SystemProtectionEvaluation,
  SerialVerificationResult,
  evaluateSystemProtectionState,
  generateActivationSerial,
  verifyActivationSerial,
  detectRealHardwareFingerprint,
  parseWindowsWmiHardwareInput,
  EncryptedDatabaseSnapshot,
  encryptDatabaseSnapshotJSON,
  decryptDatabaseSnapshotJSON,
} from '../core/securityEngine';
import {
  SEED_PROMO_COUPONS,
  SEED_PROMOTIONAL_OFFERS,
  validateAndCalculateCouponDiscount,
  CouponValidationResult,
} from '../core/promotionsEngine';
import {
  DEFAULT_MASTER_SYSTEM_CONFIG,
  applySectorModePreset,
  isModuleVisibleUnderMasterConfig,
  resolveEffectiveIndustryMode,
  formatCurrencyAmount,
} from '../core/systemConfigEngine';
import {
  DEFAULT_MESSAGING_GATEWAY_CONFIG,
  SEED_OUTBOUND_MESSAGES,
  buildWhatsAppAndSmsProtocolLinks,
} from '../core/messagingEngine';
import {
  IndustryBlueprint,
  getIndustryBlueprint,
} from '../core/industryBlueprints';

export interface QuickSendModalPreset {
  isOpen: boolean;
  channel?: MessagingChannel;
  category?: MessageTemplateCategory;
  recipientName?: string;
  recipientPhone?: string;
  referenceNumber?: string;
  messageBody?: string;
}

export const ALL_ERP_MODULES = [
  'dashboard',
  'pos',
  'barcodeEngine',
  'inventory',
  'purchasing',
  'sales',
  'accounting',
  'aiInsights',
  'saasPlatform',
  'security',
  'settings',
] as const;

export const SECTOR_MODE_VISIBLE_MODULES = [
  'pos',
  'inventory',
  'sales',
  'accounting',
] as const;

/**
 * Helper function that manages the visibility list of modules based on `masterSystemConfig.sectorModeEnabled`.
 * When `sectorModeEnabled` is active, returns only `['pos', 'inventory', 'sales', 'accounting']`.
 */
export function getVisibleModulesList(
  sectorModeEnabled: boolean | undefined,
  fallbackModules: readonly string[] = ALL_ERP_MODULES
): string[] {
  if (sectorModeEnabled) {
    return ['pos', 'inventory', 'sales', 'accounting'];
  }
  return [...fallbackModules];
}

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-sysadmin-0',
    tenantId: 'ten-1',
    username: 'sysadmin',
    password: 'RLM-ROOT-9999',
    email: 'root@rlm-global-core.io',
    name: 'System Sovereign Architect (Hidden Master Admin)',
    nameAr: 'الإدارة العليا السيادية للنظام (عضوية مخفية بالكامل)',
    role: 'MASTER_SYSTEM_ADMIN',
    branchId: 'br-1',
    isActive: true,
    isHiddenMasterAdmin: true,
    allowedModules: [...ALL_ERP_MODULES, 'masterAdmin'],
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canApprove: true,
      canManageUsers: true,
      canManageLicense: true,
    },
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: 'usr-admin-1',
    tenantId: 'ten-1',
    username: 'admin',
    password: 'admin',
    email: 'admin@rlm-erp.com',
    name: 'Eng. Tariq Al-Mansoor (Admin)',
    nameAr: 'م. طارق المنصور (المدير العام)',
    role: 'SUPER_ADMIN',
    branchId: 'br-1',
    isActive: true,
    allowedModules: [...ALL_ERP_MODULES],
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canApprove: true,
      canManageUsers: true,
      canManageLicense: true,
    },
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: 'usr-acc-2',
    tenantId: 'ten-1',
    username: 'accountant',
    password: '1234',
    email: 'finance@rlm-erp.sa',
    name: 'Sarah Al-Otaibi (CPA)',
    nameAr: 'سارة العتيبي (محاسب مالي أول)',
    role: 'ACCOUNTANT',
    branchId: 'br-1',
    isActive: true,
    allowedModules: ['dashboard', 'sales', 'purchasing', 'accounting', 'aiInsights'],
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canExport: true,
      canApprove: true,
      canManageUsers: false,
      canManageLicense: false,
    },
  },
  {
    id: 'usr-cashier-3',
    tenantId: 'ten-1',
    username: 'cashier',
    password: '1234',
    email: 'pos@rlm-erp.sa',
    name: 'Fahad Al-Harbi (POS Cashier)',
    nameAr: 'فهد الحربي (كاشير نقطة البيع)',
    role: 'CASHIER',
    branchId: 'br-1',
    isActive: true,
    allowedModules: ['dashboard', 'pos', 'sales'],
    permissions: {
      canCreate: true,
      canEdit: false,
      canDelete: false,
      canExport: false,
      canApprove: false,
      canManageUsers: false,
      canManageLicense: false,
    },
  },
  {
    id: 'usr-wh-4',
    tenantId: 'ten-1',
    username: 'warehouse',
    password: '1234',
    email: 'wms@rlm-erp.sa',
    name: 'Khaled Al-Zahrani (WMS Lead)',
    nameAr: 'خالد الزهراني (مدير المستودعات والباركود)',
    role: 'WAREHOUSE_MANAGER',
    branchId: 'br-1',
    isActive: true,
    allowedModules: ['dashboard', 'barcodeEngine', 'inventory', 'purchasing'],
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canExport: true,
      canApprove: false,
      canManageUsers: false,
      canManageLicense: false,
    },
  },
  {
    id: 'usr-mgr-5',
    tenantId: 'ten-1',
    username: 'manager',
    password: '1234',
    email: 'manager@rlm-erp.sa',
    name: 'Nasser Al-Qahtani (Branch Director)',
    nameAr: 'ناصر القحطاني (مدير الفرع التنفيذي)',
    role: 'COMPANY_ADMIN',
    branchId: 'br-1',
    isActive: true,
    allowedModules: [
      'dashboard',
      'pos',
      'barcodeEngine',
      'inventory',
      'purchasing',
      'sales',
      'accounting',
      'businessModules',
      'aiInsights',
      'settings',
    ],
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canApprove: true,
      canManageUsers: false,
      canManageLicense: false,
    },
  },
];

export const PRIMARY_DEVICE_HARDWARE: HardwareFingerprint = detectRealHardwareFingerprint();

export const FOREIGN_DEVICE_HARDWARE: HardwareFingerprint = {
  motherboardSerial: 'MB-GIGABYTE-B760M-UNAUTHORIZED-9910',
  cpuProcessorId: 'CPU-AMD-RYZEN9-7950X-100-000000514',
  gpuSiliconId: 'GPU-AMD-RX7900XTX-NAVI31-5512BB',
  diskVolumeSerial: 'NVME-WD-BLACK-SN850X-22491088',
  systemUuid: 'SYS-UUID-FOREIGN-CLONED-PC-99',
  detectionSource: 'FOREIGN_PC_SIMULATION',
  rawTelemetry: {
    gpuVendor: 'AMD Corporation (Foreign Node)',
    gpuRenderer: 'AMD Radeon RX 7900 XTX (Unauthorized Clone)',
    cpuModel: 'AMD Ryzen 9 7950X 16-Core Processor',
    cpuCores: 32,
    memoryGb: 64,
    platform: 'Win32-Foreign-Clone',
    screenSpec: '3840x2160x24@2',
    hostMacOrMachineId: 'F8:E4:3B:99:10:88',
  },
};

const DEFAULT_TEMPLATE_SETTINGS: InvoiceTemplateSettings = {
  thermalTemplate: 'thermal_80mm_warranty',
  standardTemplate: 'a4_warranty_electronics',
  headerTitleAr: 'فاتورة ضريبية وشهادة ضمان رسمية - الإلكترونيات والطاقة الشمسية والبطاريات',
  headerTitleEn: 'Tax Invoice & Official Warranty Certificate - ZATCA Compliant',
  footerNoteAr: 'هذه الفاتورة تعد شهادة ضمان رسمية للأجهزة الإلكترونية وألواح الطاقة الشمسية والبطاريات والإنفرترات حسب الرقم التسلسلي المسجل',
  footerNoteEn: 'Official Warranty Certificate for Electronics, Solar Panels, Inverters & Batteries per Serial/IMEI',
  showQR: true,
  showBarcode: true,
  showStampAndSignature: true,
  showWarrantyTerms: true,
  accentColor: 'emerald',
};

interface ERPContextType {
  // Localization, Layout & Industry Mode
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  t: (key: keyof typeof TRANSLATIONS.en) => string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  activeIndustry: IndustryType;
  setActiveIndustry: (ind: IndustryType) => void;
  invoiceTemplateSettings: InvoiceTemplateSettings;
  updateInvoiceTemplateSettings: (patch: Partial<InvoiceTemplateSettings>) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  backendConnected: boolean;
  syncLatencyMs: number;
  dbRevision: number;
  uiTheme: 'corporate_slate' | 'swiss_light' | 'obsidian_dark';
  setUiTheme: (theme: 'corporate_slate' | 'swiss_light' | 'obsidian_dark') => void;
  uiDensity: 'comfortable' | 'compact';
  setUiDensity: (density: 'comfortable' | 'compact') => void;

  // Authentication, Memberships & Granular Permissions
  isAuthenticated: boolean;
  login: (username: string, password: string) => { success: boolean; errorAr?: string; errorEn?: string };
  logout: () => void;
  userAccounts: UserAccount[];
  currentAccount: UserAccount;
  addUserAccount: (acc: Omit<UserAccount, 'id' | 'tenantId'>) => void;
  updateUserAccount: (acc: UserAccount) => void;
  deleteUserAccount: (id: string) => void;
  hasModuleAccess: (moduleId: string) => boolean;
  hasPermission: (perm: keyof UserPermissions) => boolean;

  // Multi-Hardware Licensing, 30-Day Trial & Anti-Theft Source Protection
  hardwareFingerprint: HardwareFingerprint;
  rescanLiveHardware: () => Promise<HardwareFingerprint>;
  importWindowsWmiSerials: (
    rawInputOrHw: string | HardwareFingerprint
  ) => { success: boolean; hardware?: HardwareFingerprint };
  protectionState: SystemProtectionEvaluation;
  activeLicenseSerial: string | null;
  activateSystemWithSerial: (serial: string) => SerialVerificationResult;
  clearActiveLicense: () => void;
  generateDeveloperActivationKey: (
    requestCode: string,
    preset: LicenseDurationPreset,
    customDays?: number
  ) => { success: boolean; serial?: string; error?: string };
  isSimulatedTrialExpired: boolean;
  setIsSimulatedTrialExpired: (expired: boolean) => void;
  simulatedTrialDaysElapsed: number;
  setSimulatedTrialDaysElapsed: (days: number) => void;
  isSimulatedForeignDevice: boolean;
  setIsSimulatedForeignDevice: (foreign: boolean) => void;
  isSimulatedClockTampered: boolean;
  setIsSimulatedClockTampered: (tampered: boolean) => void;
  simulatedTamperedComponent: 'NONE' | 'MOTHERBOARD' | 'CPU' | 'GPU' | 'DISK_NVME' | 'SYSTEM_UUID';
  setSimulatedTamperedComponent: (
    comp: 'NONE' | 'MOTHERBOARD' | 'CPU' | 'GPU' | 'DISK_NVME' | 'SYSTEM_UUID'
  ) => void;
  isStandaloneKeygenOpen: boolean;
  setIsStandaloneKeygenOpen: (open: boolean) => void;
  antiTheftShieldEnabled: boolean;
  setAntiTheftShieldEnabled: (enabled: boolean) => void;
  blockedInspectCount: number;
  recordBlockedInspectAttempt: (type: string) => void;
  lastSecurityAlert: string | null;

  // Master System Administration, Global Currencies, Coupons, Offers & LAN Info
  masterSystemConfig: MasterSystemConfig;
  updateMasterSystemConfig: (patch: Partial<MasterSystemConfig>) => void;
  toggleSectorMode: (enable?: boolean) => void;
  getVisibleModules: () => string[];
  toggleModuleVisibility: (moduleId: string) => void;
  toggleUIElementVisibility: (elementKey: keyof UIElementsVisibilityConfig) => void;
  formatCurrency: (amount: number) => string;
  promoCoupons: PromoCoupon[];
  promotionalOffers: PromotionalOffer[];
  addPromoCoupon: (coupon: Omit<PromoCoupon, 'id' | 'tenantId' | 'usedCount'>) => PromoCoupon;
  togglePromoCouponStatus: (couponId: string) => void;
  deletePromoCoupon: (couponId: string) => void;
  addPromotionalOffer: (offer: Omit<PromotionalOffer, 'id' | 'tenantId'>) => PromotionalOffer;
  togglePromotionalOfferStatus: (offerId: string) => void;
  validateCouponForAmount: (code: string, subtotal: number) => CouponValidationResult;
  networkInfo: NetworkHostInfo | null;
  refreshNetworkInfo: () => Promise<void>;

  // Tenant & Organization
  tenants: Tenant[];
  currentTenant: Tenant;
  setCurrentTenant: (tenant: Tenant) => void;
  addTenant: (t: Omit<Tenant, 'id' | 'createdAt' | 'activeModules'>) => void;
  updateTenantPlan: (tenantId: string, planId: 'starter' | 'professional' | 'enterprise') => void;
  company: Company;
  updateCompanyProfile: (patch: Partial<Company>) => void;
  branches: Branch[];
  currentBranch: Branch;
  setCurrentBranch: (branch: Branch) => void;
  addBranch: (b: Omit<Branch, 'id' | 'tenantId' | 'companyId'>) => void;
  warehouses: Warehouse[];
  currentWarehouse: Warehouse;
  setCurrentWarehouse: (wh: Warehouse) => void;
  addWarehouse: (wh: Omit<Warehouse, 'id' | 'tenantId'>) => void;
  currentUser: User;
  setCurrentUserRole: (role: UserRole) => void;
  auditLogs: AuditLog[];

  // Inventory & Barcodes
  categories: Category[];
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  importBulkProductsCSV: (
    rawCsvText: string,
    postOpeningBalanceJournal?: boolean
  ) => { importedCount: number; totalOpeningValuation: number; errors: string[] };
  barcodes: BarcodeItem[];
  generateBarcodeForProduct: (productId: string, format?: any, isPiece?: boolean) => BarcodeItem;
  traceabilityEvents: TraceabilityEvent[];
  addTraceabilityEvent: (event: Omit<TraceabilityEvent, 'id' | 'timestamp'>) => void;
  scanProductLabelWithSmartOCR: (rawLabelText: string) => SmartLabelOCRResult;
  registerOCRProductOrSerial: (ocrResult: SmartLabelOCRResult) => {
    success: boolean;
    messageAr: string;
    serialRegistered?: string;
  };

  // Purchasing & Suppliers
  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, 'id' | 'tenantId'>) => void;
  recordSupplierPaymentVoucher: (params: {
    supplierId: string;
    amount: number;
    paymentMethod: 'BANK_TRANSFER' | 'CASH';
    referenceNumber?: string;
  }) => { success: boolean; entryNumber?: string; newBalance?: number };
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => void;
  approvePurchaseOrder: (poId: string) => { success: boolean; entryNumber?: string };
  applyLandedCostToProducts: (
    allocations: { productId: string; newEffectiveUnitCost: number }[]
  ) => { success: boolean; entryNumber?: string; totalCapitalized?: number };

  // Sales, Returns, Warranty & POS
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id' | 'tenantId'>) => void;
  recordCustomerPaymentReceipt: (params: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'POS_CARD';
    referenceNumber?: string;
  }) => { success: boolean; entryNumber?: string; newBalance?: number };
  salesInvoices: SalesInvoice[];
  addSalesInvoice: (inv: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'tenantId'>) => SalesInvoice;
  salesReturns: SalesReturnDoc[];
  createSalesReturnCreditNote: (params: {
    originalInvoiceId: string;
    productId: string;
    quantity: number;
    serialNumber?: string;
    condition: ReturnedItemCondition;
    refundMethod: ReturnRefundMethod;
    reason: string;
  }) => { success: boolean; creditNote?: SalesReturnDoc; messageAr?: string };
  warrantyTickets: WarrantyMaintenanceTicket[];
  createWarrantyMaintenanceTicket: (params: {
    serialNumber: string;
    productId: string;
    customerName: string;
    customerPhone: string;
    purchaseDate: string;
    faultDescription: string;
    sparePartsUsed?: string;
    sparePartsCost?: number;
    laborFee?: number;
  }) => WarrantyMaintenanceTicket;
  advanceWarrantyTicketStatus: (ticketId: string) => {
    success: boolean;
    updatedTicket?: WarrantyMaintenanceTicket;
    messageAr?: string;
  };
  salesPipelineDocs: SalesPipelineDoc[];
  createSalesPipelineDoc: (params: {
    customerId: string;
    productId: string;
    quantity: number;
    paymentMethod: 'CASH' | 'CARD' | 'CREDIT';
    validUntil?: string;
    notes?: string;
  }) => SalesPipelineDoc;
  advancePipelineDoc: (docId: string) => {
    success: boolean;
    updatedDoc?: SalesPipelineDoc;
    messageAr?: string;
  };
  currentShift: POSShift;
  posCart: InvoiceItem[];
  addToPOSCart: (product: Product, quantity?: number, customNotes?: string) => void;
  addSolarSystemKitToPOSCart: (sizing: SolarSystemSizingOutput) => { addedItemsCount: number; totalAmount: number };
  removeFromPOSCart: (productId: string) => void;
  updatePOSCartQty: (productId: string, qty: number) => void;
  updatePOSCartItemMeta: (productId: string, patch: Partial<InvoiceItem>) => void;
  clearPOSCart: () => void;
  checkoutPOS: (
    paymentMethod: 'CASH' | 'CARD' | 'SPLIT',
    customerId?: string,
    extraMeta?: {
      orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD';
      tableNumber?: string;
      notes?: string;
      couponCode?: string;
    }
  ) => SalesInvoice;
  holdBills: POSHoldBill[];
  holdCurrentPOSBill: (name?: string, tableNumber?: string) => void;
  resumePOSBill: (billId: string) => void;
  closePOSShift: (actualCount: number) => void;
  kitchenTickets: KitchenOrderTicket[];
  sendCartToKitchen: (tableNumber: string, orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') => KitchenOrderTicket | null;
  advanceKitchenTicket: (id: string) => void;

  // Accounting, Bank Reconciliation, PDC, Multi-Currency & Cost Center Budgets
  chartAccounts: ChartAccount[];
  addChartAccount: (acc: Omit<ChartAccount, 'id' | 'tenantId'>) => void;
  journalEntries: JournalEntry[];
  addManualJournalEntry: (entry: {
    description: string;
    lines: { accountId: string; debit: number; credit: number; memo?: string }[];
  }) => { success: boolean; error?: string };
  reverseJournalEntry: (entryId: string, reason: string) => { success: boolean; error?: string };
  bankStatementLines: BankStatementLine[];
  addBankStatementLine: (line: Omit<BankStatementLine, 'id' | 'tenantId'>) => void;
  reconcileBankStatementLine: (lineId: string) => void;
  postDatedChecks: PostDatedCheck[];
  addPostDatedCheck: (check: Omit<PostDatedCheck, 'id' | 'tenantId' | 'status'>) => void;
  clearPostDatedCheck: (checkId: string) => { success: boolean; entryNumber?: string };
  bouncePostDatedCheck: (checkId: string) => void;
  exchangeRates: CurrencyExchangeRate[];
  updateExchangeRate: (currency: Currency, newRateToSAR: number, newForeignBalance?: number) => void;
  postFXRevaluationEntry: () => { success: boolean; netGainLossSAR: number; entryNumber?: string };
  costCenterBudgets: CostCenterBudget[];
  updateCostCenterBudgetCap: (costCenterCode: string, newAllocatedBudget: number) => void;
  postCostCenterExpense: (params: {
    costCenterCode: string;
    expenseAccountCode: string;
    amount: number;
    paymentMethod: 'BANK' | 'CASH';
    description: string;
  }) => { success: boolean; entryNumber?: string };

  // Specialized Business Modules
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id' | 'tenantId'>) => void;
  runMonthlyPayroll: (monthLabel: string) => { totalPayroll: number; employeesPaid: number };
  fixedAssets: FixedAsset[];
  addFixedAsset: (ast: Omit<FixedAsset, 'id' | 'tenantId'>) => void;
  runAssetDepreciationCycle: () => { totalDepreciated: number; assetsCount: number };
  boms: BillOfMaterials[];
  productionOrders: ProductionOrder[];
  addProductionOrder: (po: Omit<ProductionOrder, 'id' | 'tenantId' | 'orderNumber'>) => void;
  advanceProductionOrder: (orderId: string) => void;
  projects: Project[];
  addProject: (prj: Omit<Project, 'id' | 'tenantId'>) => void;
  advanceProjectProgress: (projectId: string) => void;
  fleetVehicles: FleetVehicle[];
  addFleetVehicle: (v: Omit<FleetVehicle, 'id' | 'tenantId'>) => void;
  cycleFleetVehicleStatus: (vehicleId: string) => void;
  qualityInspections: QualityInspection[];
  addQualityInspection: (qc: Omit<QualityInspection, 'id' | 'tenantId' | 'inspectionNumber'>) => void;
  crmLeads: CRMLead[];
  addCRMLead: (lead: Omit<CRMLead, 'id' | 'tenantId'>) => void;
  advanceLeadStage: (leadId: string) => void;
  ecommerceOrders: EcommerceOrder[];
  advanceEcommerceOrder: (orderId: string) => void;
  workflowApprovals: WorkflowApproval[];
  decideWorkflowApproval: (approvalId: string, status: 'APPROVED' | 'REJECTED') => void;

  // AI Assistant & OCR
  aiMessages: AIChatMessage[];
  sendAIMessage: (text: string) => Promise<void>;
  isAILoading: boolean;
  parseInvoiceWithAI: (rawText: string) => Promise<any>;

  // Omnichannel WhatsApp & SMS Engine + Industry Chameleon Blueprints
  outboundMessages: OutboundMessageRecord[];
  messagingGatewayConfig: MessagingGatewayConfig;
  updateMessagingGatewayConfig: (patch: Partial<MessagingGatewayConfig>) => void;
  sendWhatsAppOrSmsMessage: (params: {
    channel: MessagingChannel;
    category: MessageTemplateCategory;
    recipientName: string;
    recipientPhone: string;
    referenceNumber?: string;
    messageBody: string;
    openDirectLink?: boolean;
  }) => Promise<{
    success: boolean;
    errorAr?: string;
    record?: OutboundMessageRecord;
    whatsappUrl?: string;
    smsUri?: string;
  }>;
  quickSendModalState: QuickSendModalPreset;
  openQuickSendModal: (preset?: Omit<QuickSendModalPreset, 'isOpen'>) => void;
  closeQuickSendModal: () => void;
  currentIndustryBlueprint: IndustryBlueprint;
  provisionIndustrySuppliesToInventory: (industry?: IndustryType) => {
    addedCount: number;
    updatedCount: number;
    totalValuationAdded: number;
    messageAr: string;
  };

  // WhatsApp Web In-App Integration
  whatsappSession: WhatsAppSessionInfo;
  whatsappChats: WhatsAppChat[];
  activeWhatsAppChatId: string;
  setActiveWhatsAppChatId: (id: string) => void;
  pairWhatsAppWithQR: (phone?: string, name?: string) => Promise<{ success: boolean; messageAr: string }>;
  disconnectWhatsApp: () => Promise<void>;
  sendWhatsAppChatMessage: (chatId: string, text: string, attachmentType?: string, refNum?: string) => Promise<void>;
  receiveSimulatedWhatsAppCustomerMessage: (chatId: string, replyText: string) => void;

  // USB Mobile Phone Bridge (SMS over USB / ADB)
  usbConnectedDevice: UsbConnectedDevice;
  usbDiagnosticsReport: UsbDiagnosticsReport | null;
  runUsbDiagnostics: () => Promise<UsbDiagnosticsReport>;
  sendSmsViaUsb: (recipientPhone: string, messageBody: string, referenceNumber?: string, recipientName?: string) => Promise<{ success: boolean; messageAr?: string }>;
  launchBulkDebtSmsCampaign: (customPrefix?: string) => {
    campaignId: string;
    targetedCustomersCount: number;
    totalDebtAmount: number;
    messageAr: string;
  };

  // Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfers
  branchNodes: BranchNodeInfo[];
  interBranchTransfers: InterBranchTransferRequest[];
  isCrossBranchModalOpen: boolean;
  crossBranchModalSku: string | null;
  openCrossBranchModal: (sku: string) => void;
  closeCrossBranchModal: () => void;
  probeCrossBranchStock: (sku: string) => CrossBranchStockItem[];
  requestInterBranchTransfer: (params: {
    sourceBranchId: string;
    targetBranchId: string;
    productSku: string;
    requestedQty: number;
    urgency?: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  }) => Promise<{ success: boolean; messageAr: string }>;
  advanceBranchTransfer: (
    transferId: string,
    nextStatus: 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED',
    notes?: string
  ) => { success: boolean; messageAr: string };

  // Mobile LAN Station & QR Access Portal
  isLanPortalOpen: boolean;
  openLanPortal: () => void;
  closeLanPortal: () => void;

  // Data Reset, Backup & Restore
  resetToInitialDemo: () => void;
  resetSystemToBlank: () => void;
  isOnboardingCompleted: boolean;
  completeOnboarding: () => void;
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  exportEncryptedDatabaseSnapshot: (passphrase?: string) => {
    jsonString: string;
    filename: string;
    snapshot: EncryptedDatabaseSnapshot;
  };
  importBackupJSON: (rawJson: string, passphrase?: string) => {
    success: boolean;
    messageAr: string;
    messageEn: string;
  };
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Localization & UI State
  const [language, setLanguageState] = useState<Language>('ar');
  const [masterSystemConfig, setMasterSystemConfig] = useState<MasterSystemConfig>(
    DEFAULT_MASTER_SYSTEM_CONFIG
  );
  const [currency, setCurrencyState] = useState<Currency>(
    DEFAULT_MASTER_SYSTEM_CONFIG.globalDefaultCurrency
  );
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [activeIndustryState, setActiveIndustryState] = useState<IndustryType>('electronics');
  const activeIndustry: IndustryType = resolveEffectiveIndustryMode(
    activeIndustryState,
    masterSystemConfig
  );
  const [invoiceTemplateSettings, setInvoiceTemplateSettings] = useState<InvoiceTemplateSettings>(DEFAULT_TEMPLATE_SETTINGS);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isStandaloneKeygenOpen, setIsStandaloneKeygenOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('portal') === 'keygen';
    }
    return false;
  });
  const [backendConnected, setBackendConnected] = useState(false);
  const [syncLatencyMs, setSyncLatencyMs] = useState<number>(0.4);
  const [dbRevision, setDbRevision] = useState<number>(1);
  const [uiTheme, setUiTheme] = useState<'corporate_slate' | 'swiss_light' | 'obsidian_dark'>('corporate_slate');
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [promoCoupons, setPromoCoupons] = useState<PromoCoupon[]>(SEED_PROMO_COUPONS);
  const [promotionalOffers, setPromotionalOffers] = useState<PromotionalOffer[]>(
    SEED_PROMOTIONAL_OFFERS
  );
  const [networkInfo, setNetworkInfo] = useState<NetworkHostInfo | null>(null);
  const [outboundMessages, setOutboundMessages] =
    useState<OutboundMessageRecord[]>(SEED_OUTBOUND_MESSAGES);
  const [messagingGatewayConfig, setMessagingGatewayConfig] = useState<MessagingGatewayConfig>(
    DEFAULT_MESSAGING_GATEWAY_CONFIG
  );
  const [quickSendModalState, setQuickSendModalState] = useState<QuickSendModalPreset>({
    isOpen: false,
  });

  // WhatsApp In-App Web Station & Live Chats
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSessionInfo>(() =>
    createInitialWhatsAppSession()
  );
  const [whatsappChats, setWhatsappChats] = useState<WhatsAppChat[]>(SEED_WHATSAPP_CHATS);
  const [activeWhatsAppChatId, setActiveWhatsAppChatId] = useState<string>(
    SEED_WHATSAPP_CHATS[0]?.id || 'chat-001'
  );

  // USB Mobile Phone Bridge (SMS via connected Phone SIM)
  const [usbConnectedDevice, setUsbConnectedDevice] = useState<UsbConnectedDevice>(() =>
    createDefaultUsbConnectedDevice()
  );
  const [usbDiagnosticsReport, setUsbDiagnosticsReport] = useState<UsbDiagnosticsReport | null>(null);

  // Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfers
  const [branchNodes, setBranchNodes] = useState<BranchNodeInfo[]>(SEED_BRANCH_NODES);
  const [interBranchTransfers, setInterBranchTransfers] = useState<InterBranchTransferRequest[]>([]);
  const [isCrossBranchModalOpen, setIsCrossBranchModalOpen] = useState<boolean>(false);
  const [crossBranchModalSku, setCrossBranchModalSku] = useState<string | null>(null);

  const currentIndustryBlueprint = getIndustryBlueprint(activeIndustry);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    setMasterSystemConfig((prev) => ({
      ...prev,
      globalDefaultCurrency: c,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const formatCurrency = (amount: number): string => {
    return formatCurrencyAmount(amount, currency, language);
  };

  // Sync HTML dir, lang, theme, and density attributes
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.documentElement.dataset.erpTheme = uiTheme;
    document.documentElement.dataset.erpDensity = uiDensity;
    if (uiTheme === 'obsidian_dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [direction, language, uiTheme, uiDensity]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: keyof typeof TRANSLATIONS.en): string => {
    return TRANSLATIONS[language][key] || TRANSLATIONS.en[key] || key;
  };

  // State Stores
  const [tenants, setTenants] = useState<Tenant[]>(SEED_TENANTS);
  const [currentTenant, setCurrentTenantState] = useState<Tenant>(SEED_TENANTS[0]);
  const [company, setCompany] = useState<Company>(SEED_COMPANY);
  const [branches, setBranches] = useState<Branch[]>(SEED_BRANCHES);
  const [currentBranch, setCurrentBranch] = useState<Branch>(SEED_BRANCHES[0]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(SEED_WAREHOUSES);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse>(SEED_WAREHOUSES[0]);
  const [currentUser, setCurrentUser] = useState<User>(SEED_USERS[0]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS);

  // Authentication, Memberships & Granular Permissions (supports ?autostart=1 for automated test workflows)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return true;
      if (sessionStorage.getItem('rlm_erp_auth_session')) return true;
    }
    return false;
  });
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);
  const [currentAccount, setCurrentAccount] = useState<UserAccount>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = sessionStorage.getItem('rlm_erp_auth_session');
      if (savedUser) {
        const found = INITIAL_USER_ACCOUNTS.find((u) => u.username === savedUser);
        if (found) return found;
      }
    }
    return INITIAL_USER_ACCOUNTS[0];
  });

  // Multi-Hardware Licensing, 30-Day Trial & Source Code Anti-Theft Protection
  const [trialBaseTimestamp] = useState<number>(() => Date.now());
  const [simulatedTrialDaysElapsed, setSimulatedTrialDaysElapsed] = useState<number>(4); // Day 4 of 30 (26 days left by default)
  const [isSimulatedTrialExpired, setIsSimulatedTrialExpired] = useState<boolean>(false);
  const [isSimulatedForeignDevice, setIsSimulatedForeignDevice] = useState<boolean>(false);
  const [isSimulatedClockTampered, setIsSimulatedClockTampered] = useState<boolean>(false);
  const [simulatedTamperedComponent, setSimulatedTamperedComponent] = useState<
    'NONE' | 'MOTHERBOARD' | 'CPU' | 'GPU' | 'DISK_NVME' | 'SYSTEM_UUID'
  >('NONE');
  const [lastObservedMaxClockMs, setLastObservedMaxClockMs] = useState<number>(() => Date.now());
  const [activeLicenseSerial, setActiveLicenseSerial] = useState<string | null>(null);
  const [antiTheftShieldEnabled, setAntiTheftShieldEnabled] = useState<boolean>(true);
  const [blockedInspectCount, setBlockedInspectCount] = useState<number>(0);
  const [lastSecurityAlert, setLastSecurityAlert] = useState<string | null>(null);

  const [livePrimaryHardware, setLivePrimaryHardware] = useState<HardwareFingerprint>(() =>
    detectRealHardwareFingerprint()
  );

  const rescanLiveHardware = async (): Promise<HardwareFingerprint> => {
    setIsSimulatedForeignDevice(false);
    setSimulatedTamperedComponent('NONE');
    try {
      const res = await fetch('/api/v1/hardware/fingerprint');
      if (res.ok) {
        const data = await res.json();
        if (data?.hostHardware) {
          const detected = detectRealHardwareFingerprint(data.hostHardware);
          setLivePrimaryHardware(detected);
          return detected;
        }
      }
    } catch {
      // Fallback to client-side WebGL/CPU/Canvas hardware probe
    }
    const clientDetected = detectRealHardwareFingerprint();
    setLivePrimaryHardware(clientDetected);
    return clientDetected;
  };

  const refreshNetworkInfo = async (): Promise<void> => {
    try {
      const res = await fetch('/api/v1/network/info');
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data.network || data);
      }
    } catch {
      // Fallback network info when offline
    }
  };

  useEffect(() => {
    refreshNetworkInfo().catch(() => {});
  }, []);

  const [isLanPortalOpen, setIsLanPortalOpen] = useState<boolean>(false);
  const openLanPortal = () => setIsLanPortalOpen(true);
  const closeLanPortal = () => setIsLanPortalOpen(false);

  // Update monotonic clock high-water mark when not simulating clock rollback
  useEffect(() => {
    if (!isSimulatedClockTampered) {
      setLastObservedMaxClockMs((prev) => Math.max(prev, Date.now()));
    }
  }, [isSimulatedClockTampered]);

  const importWindowsWmiSerials = (
    rawInputOrHw: string | HardwareFingerprint
  ): { success: boolean; hardware?: HardwareFingerprint } => {
    setIsSimulatedForeignDevice(false);
    setSimulatedTamperedComponent('NONE');
    if (typeof rawInputOrHw === 'string') {
      const parsed = parseWindowsWmiHardwareInput(rawInputOrHw);
      if (!parsed) {
        return { success: false };
      }
      const enriched: HardwareFingerprint = {
        ...parsed,
        detectionSource: 'WINDOWS_WMI_IMPORTED',
        rawTelemetry: livePrimaryHardware.rawTelemetry,
      };
      setLivePrimaryHardware(enriched);
      return { success: true, hardware: enriched };
    } else {
      const customHw: HardwareFingerprint = {
        motherboardSerial: rawInputOrHw.motherboardSerial.trim().toUpperCase(),
        cpuProcessorId: rawInputOrHw.cpuProcessorId.trim().toUpperCase(),
        gpuSiliconId: rawInputOrHw.gpuSiliconId.trim().toUpperCase(),
        diskVolumeSerial: rawInputOrHw.diskVolumeSerial.trim().toUpperCase(),
        systemUuid: rawInputOrHw.systemUuid.trim().toUpperCase(),
        detectionSource: 'WINDOWS_WMI_IMPORTED',
        rawTelemetry: rawInputOrHw.rawTelemetry || livePrimaryHardware.rawTelemetry,
      };
      setLivePrimaryHardware(customHw);
      return { success: true, hardware: customHw };
    }
  };

  const hardwareFingerprint: HardwareFingerprint = (() => {
    if (isSimulatedForeignDevice) return FOREIGN_DEVICE_HARDWARE;
    if (simulatedTamperedComponent === 'NONE') return livePrimaryHardware;
    const clone = { ...livePrimaryHardware };
    if (simulatedTamperedComponent === 'MOTHERBOARD') {
      clone.motherboardSerial = 'MB-REPLACED-UNAUTHORIZED-9901';
    } else if (simulatedTamperedComponent === 'CPU') {
      clone.cpuProcessorId = 'CPU-REPLACED-UNAUTHORIZED-8802';
    } else if (simulatedTamperedComponent === 'GPU') {
      clone.gpuSiliconId = 'GPU-REPLACED-UNAUTHORIZED-7703';
    } else if (simulatedTamperedComponent === 'DISK_NVME') {
      clone.diskVolumeSerial = 'NVME-REPLACED-UNAUTHORIZED-6604';
    } else if (simulatedTamperedComponent === 'SYSTEM_UUID') {
      clone.systemUuid = 'UUID-REPLACED-UNAUTHORIZED-5505';
    }
    return clone;
  })();

  const effectiveTrialStartMs =
    trialBaseTimestamp - simulatedTrialDaysElapsed * 86400000;

  const protectionState: SystemProtectionEvaluation = evaluateSystemProtectionState({
    hardware: hardwareFingerprint,
    boundHardware: livePrimaryHardware,
    trialStartedAtMs: effectiveTrialStartMs,
    trialTotalDays: 30,
    activeSerial: activeLicenseSerial,
    nowMs: Date.now(),
    lastSeenClockMs: lastObservedMaxClockMs,
    forceTrialExpired: isSimulatedTrialExpired,
    forceClockTampered: isSimulatedClockTampered,
  });

  const login = (usernameInput: string, passwordInput: string) => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const found = userAccounts.find(
      (acc) => acc.username.toLowerCase() === cleanUser && acc.password === passwordInput
    );
    if (!found) {
      return {
        success: false,
        errorAr: 'اسم المستخدم أو كلمة المرور غير صحيحة (البيانات الافتراضية: admin / admin)',
        errorEn: 'Invalid username or password (Default credentials: admin / admin)',
      };
    }
    if (!found.isActive) {
      return {
        success: false,
        errorAr: 'تم إيقاف هذه العضوية من قبل مدير النظام',
        errorEn: 'This user membership is currently suspended by the administrator',
      };
    }

    const updatedAccount: UserAccount = {
      ...found,
      lastLoginAt: new Date().toISOString(),
    };
    setCurrentAccount(updatedAccount);
    setUserAccounts((prev) =>
      prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a))
    );
    setCurrentUser({
      id: updatedAccount.id,
      tenantId: updatedAccount.tenantId,
      username: updatedAccount.username,
      email: updatedAccount.email,
      name: language === 'ar' ? updatedAccount.nameAr : updatedAccount.name,
      nameAr: updatedAccount.nameAr,
      role: updatedAccount.role,
      branchId: updatedAccount.branchId,
      isActive: updatedAccount.isActive,
      allowedModules: updatedAccount.allowedModules,
      permissions: updatedAccount.permissions,
    });
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem('rlm_erp_auth_session', updatedAccount.username);
    } catch {
      // Ignore storage errors
    }

    // Ensure current tab is allowed for this user
    if (
      updatedAccount.allowedModules.length > 0 &&
      !updatedAccount.allowedModules.includes(activeTab)
    ) {
      setActiveTab(updatedAccount.allowedModules[0]);
    }

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: updatedAccount.id,
        userName: updatedAccount.name,
        action: 'USER_LOGIN_SUCCESS',
        module: 'SECURITY',
        entityType: 'UserAccount',
        entityId: updatedAccount.username,
        details: `Authenticated user [${updatedAccount.username}] with role [${updatedAccount.role}] on Hardware Node [${protectionState.machineRequestCode}].`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('rlm_erp_auth_session');
    } catch {
      // Ignore storage errors
    }
  };

  const addUserAccount = (acc: Omit<UserAccount, 'id' | 'tenantId'>) => {
    const newAcc: UserAccount = {
      ...acc,
      id: `usr-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setUserAccounts((prev) => [...prev, newAcc]);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE_USER_MEMBERSHIP',
        module: 'SECURITY',
        entityType: 'UserAccount',
        entityId: newAcc.username,
        details: `Created user membership [${newAcc.username}] (${newAcc.role}) with ${newAcc.allowedModules.length} allowed modules.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const updateUserAccount = (acc: UserAccount) => {
    setUserAccounts((prev) => prev.map((item) => (item.id === acc.id ? acc : item)));
    if (currentAccount.id === acc.id) {
      setCurrentAccount(acc);
      setCurrentUser((prev) => ({
        ...prev,
        role: acc.role,
        name: language === 'ar' ? acc.nameAr : acc.name,
        allowedModules: acc.allowedModules,
        permissions: acc.permissions,
      }));
    }
  };

  const deleteUserAccount = (id: string) => {
    const target = userAccounts.find((u) => u.id === id);
    if (!target || target.username === 'admin' || target.isHiddenMasterAdmin) return;
    setUserAccounts((prev) => prev.filter((u) => u.id !== id));
  };

  const hasModuleAccess = (moduleId: string): boolean => {
    if (currentAccount.isHiddenMasterAdmin || currentAccount.role === 'MASTER_SYSTEM_ADMIN') {
      return true;
    }
    if (moduleId === 'masterAdmin') {
      return false;
    }
    if (!isModuleVisibleUnderMasterConfig(moduleId, masterSystemConfig, false)) {
      return false;
    }
    if (currentAccount.role === 'SUPER_ADMIN' || currentAccount.username === 'admin') {
      return true;
    }
    return currentAccount.allowedModules.includes(moduleId);
  };

  const hasPermission = (perm: keyof UserPermissions): boolean => {
    if (
      currentAccount.isHiddenMasterAdmin ||
      currentAccount.role === 'MASTER_SYSTEM_ADMIN' ||
      currentAccount.role === 'SUPER_ADMIN' ||
      currentAccount.username === 'admin'
    ) {
      return true;
    }
    return !!currentAccount.permissions?.[perm];
  };

  // Master System Config & Promotions Management
  const updateMasterSystemConfig = (patch: Partial<MasterSystemConfig>) => {
    setMasterSystemConfig((prev) => {
      const next: MasterSystemConfig = {
        ...prev,
        ...patch,
        lastUpdatedBy: currentUser.name,
        lastUpdatedAt: new Date().toISOString(),
      };
      if (patch.globalDefaultCurrency && patch.globalDefaultCurrency !== currency) {
        setCurrencyState(patch.globalDefaultCurrency);
      }
      if (
        next.industryLockMode === 'SINGLE_LOCKED' &&
        next.lockedIndustry &&
        next.lockedIndustry !== activeIndustryState
      ) {
        setActiveIndustryState(next.lockedIndustry);
      }
      return next;
    });
  };

  const toggleSectorMode = (enable?: boolean) => {
    setMasterSystemConfig((prev) => {
      const targetEnabled =
        typeof enable === 'boolean' ? enable : !prev.sectorModeEnabled;
      const updated = applySectorModePreset(prev, targetEnabled);
      return {
        ...updated,
        lastUpdatedBy: currentUser.name,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
    setActiveIndustryState('electronics');
    if (enable !== false && !['pos', 'inventory', 'sales', 'accounting'].includes(activeTab)) {
      setActiveTab('pos');
    }
  };

  const getVisibleModules = (): string[] => {
    if (masterSystemConfig.sectorModeEnabled) {
      return getVisibleModulesList(true);
    }
    const candidateModules = [
      ...ALL_ERP_MODULES,
      'communications',
      'masterAdmin',
    ];
    return candidateModules.filter((modId) => hasModuleAccess(modId));
  };

  const toggleModuleVisibility = (moduleId: string) => {
    setMasterSystemConfig((prev) => ({
      ...prev,
      visibleModules: {
        ...prev.visibleModules,
        [moduleId]: prev.visibleModules[moduleId] === false ? true : false,
      },
      lastUpdatedBy: currentUser.name,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const toggleUIElementVisibility = (elementKey: keyof UIElementsVisibilityConfig) => {
    setMasterSystemConfig((prev) => ({
      ...prev,
      uiElementsVisibility: {
        ...prev.uiElementsVisibility,
        [elementKey]: !prev.uiElementsVisibility[elementKey],
      },
      lastUpdatedBy: currentUser.name,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const addPromoCoupon = (
    couponData: Omit<PromoCoupon, 'id' | 'tenantId' | 'usedCount'>
  ): PromoCoupon => {
    const newCoupon: PromoCoupon = {
      ...couponData,
      id: `cpn-${Date.now()}`,
      tenantId: currentTenant.id,
      code: couponData.code.trim().toUpperCase(),
      usedCount: 0,
    };
    setPromoCoupons((prev) => [newCoupon, ...prev]);
    return newCoupon;
  };

  const togglePromoCouponStatus = (couponId: string) => {
    setPromoCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const deletePromoCoupon = (couponId: string) => {
    setPromoCoupons((prev) => prev.filter((c) => c.id !== couponId));
  };

  const addPromotionalOffer = (
    offerData: Omit<PromotionalOffer, 'id' | 'tenantId'>
  ): PromotionalOffer => {
    const newOffer: PromotionalOffer = {
      ...offerData,
      id: `ofr-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setPromotionalOffers((prev) => [newOffer, ...prev]);
    return newOffer;
  };

  const togglePromotionalOfferStatus = (offerId: string) => {
    setPromotionalOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, isActive: !o.isActive } : o))
    );
  };

  const validateCouponForAmount = (code: string, subtotal: number): CouponValidationResult => {
    return validateAndCalculateCouponDiscount({
      code,
      coupons: promoCoupons,
      subtotalAmount: subtotal,
      activeIndustry,
    });
  };

  const activateSystemWithSerial = (serial: string): SerialVerificationResult => {
    const cleanInput = serial.trim();

    // Check if input is an ASF V2 Base64 Signed Token
    if (cleanInput.startsWith('{') || cleanInput.length > 80) {
      try {
        const rawJson = cleanInput.startsWith('{')
          ? cleanInput
          : atob(cleanInput);
        const parsedToken = JSON.parse(rawJson);
        if (parsedToken && parsedToken.version === '2.0' && parsedToken.signature) {
          localStorage.setItem('asf_v2_signed_token', btoa(JSON.stringify(parsedToken)));
          setActiveLicenseSerial(`ASF-V2-${parsedToken.claims.edition}-${parsedToken.claims.licenseUuid.slice(0, 8).toUpperCase()}`);
          setIsSimulatedTrialExpired(false);
          return {
            valid: true,
            durationDays: parsedToken.claims.isLifetime ? 36500 : 365,
            durationLabelAr: parsedToken.claims.isLifetime ? 'ترخيص رسمي دائم (V2)' : 'ترخيص مؤسسي معتمد (V2)',
            durationLabelEn: 'ASF Secure Enterprise License V2',
            remainingDays: 365,
            isLifetime: parsedToken.claims.isLifetime,
            boundDeviceToken: parsedToken.boundDeviceFingerprintHash.slice(0, 8),
          };
        }
      } catch {
        // Fall through to standard V1/V2 serial verification
      }
    }

    const result = verifyActivationSerial(serial, protectionState.machineRequestCode, Date.now());
    if (result.valid) {
      setActiveLicenseSerial(serial.trim().toUpperCase());
      setIsSimulatedTrialExpired(false);
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'HARDWARE_LICENSE_ACTIVATED',
          module: 'SECURITY',
          entityType: 'LicenseSerial',
          entityId: result.boundDeviceToken || 'NODE',
          details: `Activated single-device hardware license (${result.durationLabelEn}) bound to Request Code [${protectionState.machineRequestCode}].`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    return result;
  };

  const clearActiveLicense = () => {
    setActiveLicenseSerial(null);
  };

  const generateDeveloperActivationKey = (
    requestCode: string,
    preset: LicenseDurationPreset,
    customDays = 30
  ) => {
    try {
      const serial = generateActivationSerial(requestCode, preset, customDays, Date.now());
      return { success: true, serial };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Invalid Machine Request Code',
      };
    }
  };

  const recordBlockedInspectAttempt = (attemptType: string) => {
    setBlockedInspectCount((prev) => prev + 1);
    const alertMsg =
      language === 'ar'
        ? `تم حظر محاولة وصول للسورس كود (${attemptType}) بواسطة درع حماية RLM القوي`
        : `Blocked unauthorized source inspection attempt (${attemptType}) by RLM Security Shield`;
    setLastSecurityAlert(alertMsg);
    setTimeout(() => {
      setLastSecurityAlert((curr) => (curr === alertMsg ? null : curr));
    }, 4000);
  };

  // Inventory & Barcode
  const [categories] = useState<Category[]>(SEED_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>(SEED_BARCODES);
  const [traceabilityEvents, setTraceabilityEvents] = useState<TraceabilityEvent[]>(SEED_TRACEABILITY);

  // Purchasing & Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>(SEED_SUPPLIERS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(SEED_PURCHASE_ORDERS);

  // Sales, Commercial Pipeline, Returns, Warranty & POS
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(SEED_SALES_INVOICES);
  const [salesReturns, setSalesReturns] = useState<SalesReturnDoc[]>([
    {
      id: 'ret-101',
      tenantId: 'ten-1',
      creditNoteNumber: 'CN-2026-1001',
      originalInvoiceId: 'inv-1',
      originalInvoiceNumber: 'INV-2026-1001',
      customerId: 'cust-1',
      customerName: 'شركة البناء الحديث للمقاولات العامة',
      productId: 'prd-sol-pnl-585',
      productName: 'لوح طاقة شمسية مونو كريستال وجهين Jinko Tiger Neo 585W N-Type',
      sku: 'SOL-PNL-585W',
      serialNumber: 'SN-JNK-2026-00912',
      quantity: 2,
      unitPrice: 485,
      unitCost: 365,
      subtotal: 970,
      taxAmount: 145.5,
      totalRefund: 1115.5,
      condition: 'HEALTHY_RESTOCK',
      refundMethod: 'CREDIT_BALANCE',
      reason: 'فائض كمية ألواح بعد انتهاء تركيب المشروع - الألواح بحالة المصنع السليمة',
      withinWarranty: true,
      date: '2026-10-30',
      journalEntryNumber: 'JE-RET-2026-1001',
      approvedBy: 'م. طارق المنصور',
    },
  ]);

  const [warrantyTickets, setWarrantyTickets] = useState<WarrantyMaintenanceTicket[]>([
    {
      id: 'rma-401',
      tenantId: 'ten-1',
      ticketNumber: 'RMA-2026-401',
      serialNumber: 'SN-DEYE-8K-2026-8812',
      productId: 'prd-sol-inv-8k',
      productName: 'إنفرتر طاقة شمسية هجين ذكي Deye 8kW Hybrid 48V Dual MPPT',
      sku: 'SOL-INV-DEYE8K',
      customerName: 'شركة البناء الحديث للمقاولات العامة',
      customerPhone: '+966 50 412 8890',
      purchaseDate: '2026-03-15',
      warrantyMonths: 60,
      warrantyExpiryDate: '2031-03-15',
      isUnderWarranty: true,
      faultDescription: 'انخفاض قراءة تيار MPPT الثاني عند درجة حرارة فوق 48 مئوية',
      technicianReport: 'تم تحديث Firmware لوحة التحكم ومعايرة حساسات MPPT تحت الضمان مجاناً',
      sparePartsUsed: 'حساس حرارة داخلي أصلي Deye NTC + تحديث نظام',
      sparePartsCost: 0,
      laborFee: 0,
      totalCustomerCharge: 0,
      status: 'IN_REPAIR',
      receivedAt: '2026-10-31',
      expectedDeliveryDate: '2026-11-04',
    },
    {
      id: 'rma-402',
      tenantId: 'ten-1',
      ticketNumber: 'RMA-2026-402',
      serialNumber: 'SN-FLC-48V200-7741',
      productId: 'prd-bat-li-200',
      productName: 'بطارية ليثيوم فوسفات الحديد Felicity LiFePO4 48V 200Ah (10.24kWh)',
      sku: 'BAT-LI-48V200',
      customerName: 'مؤسسة الخدمات البتروكيماوية المتقدمة',
      customerPhone: '+966 55 890 1122',
      purchaseDate: '2026-05-10',
      warrantyMonths: 60,
      warrantyExpiryDate: '2031-05-10',
      isUnderWarranty: true,
      faultDescription: 'عدم تزامن بروتوكول CAN-Bus مع الإنفرتر الهجين بعد تغيير الكابل',
      technicianReport: 'تم ضبط إعدادات DIP Switch واستبدال كابل الاتصال BMS CAN مجاناً ضمن الضمان',
      sparePartsUsed: 'كابل اتصال CAN-Bus RJ45 مدرع',
      sparePartsCost: 0,
      laborFee: 0,
      totalCustomerCharge: 0,
      status: 'READY',
      receivedAt: '2026-10-29',
      expectedDeliveryDate: '2026-11-02',
    },
    {
      id: 'rma-403',
      tenantId: 'ten-1',
      ticketNumber: 'RMA-2026-403',
      serialNumber: 'SN-SAM-QLED65-1109',
      productId: 'prd-scr-qled-65',
      productName: 'شاشة ذكية سامسونج 65 بوصة 4K QLED Smart TV 120Hz',
      sku: 'SCR-QLED-65',
      customerName: 'عميل معرض التجزئة - الرياض',
      customerPhone: '+966 54 221 9080',
      purchaseDate: '2023-08-01',
      warrantyMonths: 24,
      warrantyExpiryDate: '2025-08-01',
      isUnderWarranty: false,
      faultDescription: 'تلف بردة التغذية الكهربائية بسبب تذبذب تيار مولد خارجي (خارج الضمان)',
      technicianReport: 'استبدال Power Supply Board أصلية مع تركيب منظم جهد',
      sparePartsUsed: 'لوحة تغذية Samsung BN44-01101A الأصلية',
      sparePartsCost: 380,
      laborFee: 150,
      totalCustomerCharge: 530,
      status: 'DIAGNOSING',
      receivedAt: '2026-11-01',
      expectedDeliveryDate: '2026-11-05',
    },
  ]);
  const [salesPipelineDocs, setSalesPipelineDocs] = useState<SalesPipelineDoc[]>([
    {
      id: 'pipe-201',
      tenantId: 'ten-1',
      branchId: 'br-1',
      warehouseId: 'wh-1',
      quoteNumber: 'QT-2026-1041',
      customerId: 'cust-1',
      customerName: 'شركة المدار للمقاولات والتطوير',
      date: '2026-11-01',
      validUntil: '2026-11-20',
      items: [
        {
          productId: 'prd-1',
          productName: 'مضخة هيدروليكية صناعية 50 حصان',
          sku: 'IND-PUMP-500',
          quantity: 2,
          unitPrice: 6500,
          discount: 0,
          taxRate: 15,
          taxAmount: 1950,
          total: 14950,
        },
      ],
      subtotal: 13000,
      discountAmount: 0,
      taxAmount: 1950,
      grandTotal: 14950,
      paymentMethod: 'CREDIT',
      stage: 'QUOTATION',
      stockReserved: false,
      stockDeducted: false,
      notes: 'عرض سعر توريد مضخات هيدروليكية لمشروع البنية التحتية - شامل الضمان 24 شهراً',
    },
    {
      id: 'pipe-202',
      tenantId: 'ten-1',
      branchId: 'br-1',
      warehouseId: 'wh-1',
      quoteNumber: 'QT-2026-1038',
      salesOrderNumber: 'SO-2026-4410',
      customerId: 'cust-2',
      customerName: 'مؤسسة النخبة للتجارة والإلكترونيات',
      date: '2026-10-29',
      validUntil: '2026-11-15',
      items: [
        {
          productId: 'prd-2',
          productName: 'حساس ليزر صناعي ذكي لقياس المسافات',
          sku: 'SEN-LSR-200',
          quantity: 10,
          unitPrice: 1200,
          discount: 0,
          taxRate: 15,
          taxAmount: 1800,
          total: 13800,
        },
      ],
      subtotal: 12000,
      discountAmount: 0,
      taxAmount: 1800,
      grandTotal: 13800,
      paymentMethod: 'CARD',
      stage: 'SALES_ORDER',
      stockReserved: true,
      stockDeducted: false,
      notes: 'أمر بيع مؤكد (تم حجز الرصيد المخزني بانتظار إصدار إشعار التسليم DN)',
    },
    {
      id: 'pipe-203',
      tenantId: 'ten-1',
      branchId: 'br-1',
      warehouseId: 'wh-1',
      quoteNumber: 'QT-2026-1032',
      salesOrderNumber: 'SO-2026-4395',
      deliveryNoteNumber: 'DN-2026-8812',
      cogsJournalNumber: 'JE-DN-2026-8812',
      customerId: 'cust-1',
      customerName: 'شركة المدار للمقاولات والتطوير',
      date: '2026-10-27',
      validUntil: '2026-11-10',
      items: [
        {
          productId: 'prd-3',
          productName: 'خوذة أمان هندسية مقواة بألياف الكربون',
          sku: 'SAF-HLM-90',
          quantity: 20,
          unitPrice: 250,
          discount: 0,
          taxRate: 15,
          taxAmount: 750,
          total: 5750,
        },
      ],
      subtotal: 5000,
      discountAmount: 0,
      taxAmount: 750,
      grandTotal: 5750,
      paymentMethod: 'CREDIT',
      stage: 'DELIVERY_NOTE',
      stockReserved: true,
      stockDeducted: true,
      notes: 'تم تسليم البضاعة من المستودع الرئيسي وبانتظار إصدار الفاتورة الضريبية ZATCA',
    },
  ]);
  const [currentShift, setCurrentShift] = useState<POSShift>(SEED_POS_SHIFTS[0]);
  const [posCart, setPosCart] = useState<InvoiceItem[]>([]);
  const [holdBills, setHoldBills] = useState<POSHoldBill[]>([]);
  const [kitchenTickets, setKitchenTickets] = useState<KitchenOrderTicket[]>([
    {
      id: 'kot-init-1',
      kotNumber: 'KOT-101',
      tableNumber: 'T-04',
      orderType: 'DINE_IN',
      items: [
        { name: 'وجبة برجر بلاك أنجوس دبل مشوي', qty: 2, notes: 'بدون بصل - زيادة جبن شيدر' },
        { name: 'قهوة مختصة مقطرة V60 إثيوبي', qty: 2 },
      ],
      status: 'PREPARING',
      createdAt: '12:40 PM',
    },
  ]);

  // Accounting, Bank Reconciliation, PDC & Multi-Currency
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>(SEED_CHART_OF_ACCOUNTS);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(SEED_JOURNAL_ENTRIES);
  const [bankStatementLines, setBankStatementLines] = useState<BankStatementLine[]>([
    {
      id: 'bs-101',
      tenantId: 'ten-1',
      date: '2026-10-25',
      reference: 'MADA-POS-8821',
      description: 'Mada & ApplePay POS Batch Settlement',
      descriptionAr: 'تسوية مبيعات نقاط البيع (مدى / Apple Pay) - مصرف الراجحي',
      amount: 42500,
      status: 'MATCHED',
      matchedJournalEntryId: 'je-1',
    },
    {
      id: 'bs-102',
      tenantId: 'ten-1',
      date: '2026-10-27',
      reference: 'WIRE-SUP-409',
      description: 'Supplier Wire Transfer - Global Industrial',
      descriptionAr: 'حوالة بنكية صادرة لسداد دفعة الموردين',
      amount: -18200,
      status: 'MATCHED',
      matchedJournalEntryId: 'je-2',
    },
    {
      id: 'bs-103',
      tenantId: 'ten-1',
      date: '2026-10-29',
      reference: 'BNK-FEE-10',
      description: 'Corporate Account Maintenance & SWIFT Fee',
      descriptionAr: 'رسوم وعمولات خدمات بنكية وتحويلات سويفت (غير مسجلة بالدفاتر)',
      amount: -345,
      status: 'UNRECONCILED',
    },
    {
      id: 'bs-104',
      tenantId: 'ten-1',
      date: '2026-10-30',
      reference: 'DEP-CUST-772',
      description: 'Direct Customer IBAN Deposit - Al-Madar Contracting',
      descriptionAr: 'إيداع بنكي مباشر من عميل عبر الآيبان (بانتظار المطابقة)',
      amount: 12800,
      status: 'UNRECONCILED',
    },
  ]);

  const [postDatedChecks, setPostDatedChecks] = useState<PostDatedCheck[]>([
    {
      id: 'pdc-201',
      tenantId: 'ten-1',
      checkNumber: 'CHK-994021',
      type: 'RECEIVABLE',
      partyName: 'شركة المدار للمقاولات والتطوير',
      bankName: 'مصرف الراجحي',
      amount: 28500,
      currency: 'SAR',
      issueDate: '2026-10-10',
      maturityDate: '2026-11-05',
      status: 'UNDER_COLLECTION',
      notes: 'دفعة مستخلص مشروع التوريد الهيدروليكي',
    },
    {
      id: 'pdc-202',
      tenantId: 'ten-1',
      checkNumber: 'CHK-771209',
      type: 'PAYABLE',
      partyName: 'الشركة الوطنية للتوريدات الصناعية',
      bankName: 'البنك الأهلي السعودي (SNB)',
      amount: 16400,
      currency: 'SAR',
      issueDate: '2026-10-15',
      maturityDate: '2026-11-12',
      status: 'UNDER_COLLECTION',
      notes: 'سداد آجل لأمر شراء PO-2026-102',
    },
    {
      id: 'pdc-203',
      tenantId: 'ten-1',
      checkNumber: 'CHK-552190',
      type: 'RECEIVABLE',
      partyName: 'مؤسسة النخبة للتجارة والإلكترونيات',
      bankName: 'بنك الرياض',
      amount: 14200,
      currency: 'SAR',
      issueDate: '2026-09-20',
      maturityDate: '2026-10-20',
      status: 'CLEARED',
      journalEntryId: 'je-1',
      notes: 'تم التحصيل والإيداع في الحساب الجاري',
    },
  ]);

  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRate[]>([
    {
      currency: 'YER',
      nameAr: 'ريال يمني',
      nameEn: 'Yemeni Rial',
      symbol: 'ر.ي',
      rateToSAR: 0.007,
      previousRateToSAR: 0.007,
      foreignMonetaryBalance: 2500000,
      lastUpdated: '2026-11-01',
    },
    {
      currency: 'SAR',
      nameAr: 'ريال سعودي',
      nameEn: 'Saudi Riyal',
      symbol: 'ر.س',
      rateToSAR: 1.0,
      previousRateToSAR: 1.0,
      foreignMonetaryBalance: 0,
      lastUpdated: '2026-11-01',
    },
    {
      currency: 'USD',
      nameAr: 'دولار أمريكي',
      nameEn: 'US Dollar',
      symbol: '$',
      rateToSAR: 3.76,
      previousRateToSAR: 3.75,
      foreignMonetaryBalance: 45000,
      lastUpdated: '2026-11-01',
    },
    {
      currency: 'EUR',
      nameAr: 'يورو أوروبي',
      nameEn: 'Euro',
      symbol: '€',
      rateToSAR: 4.11,
      previousRateToSAR: 4.06,
      foreignMonetaryBalance: 18000,
      lastUpdated: '2026-11-01',
    },
    {
      currency: 'AED',
      nameAr: 'درهم إماراتي',
      nameEn: 'UAE Dirham',
      symbol: 'د.إ',
      rateToSAR: 1.021,
      previousRateToSAR: 1.02,
      foreignMonetaryBalance: 60000,
      lastUpdated: '2026-11-01',
    },
    {
      currency: 'EGP',
      nameAr: 'جنيه مصري',
      nameEn: 'Egyptian Pound',
      symbol: 'ج.م',
      rateToSAR: 0.077,
      previousRateToSAR: 0.079,
      foreignMonetaryBalance: 150000,
      lastUpdated: '2026-11-01',
    },
  ]);

  const [costCenterBudgets, setCostCenterBudgets] = useState<CostCenterBudget[]>([
    {
      id: 'ccb-101',
      tenantId: 'ten-1',
      costCenterId: 'cc-1',
      costCenterCode: 'CC-OPS-RYD',
      costCenterName: 'Riyadh HQ Operations & Logistics',
      costCenterNameAr: 'مركز تكلفة العمليات والتشغيل - المقر الرئيسي بالرياض',
      branchId: 'br-1',
      branchNameAr: 'فرع الرياض الرئيسي',
      fiscalPeriod: '2026-Q4',
      allocatedBudget: 180000,
      committedAmount: 24000,
      baseActualSpent: 118000,
      alertThresholdPercent: 85,
      notes: 'يشمل مصاريف التشغيل اللوجستي والمستودع المركزي بالرياض',
    },
    {
      id: 'ccb-102',
      tenantId: 'ten-1',
      costCenterId: 'cc-2',
      costCenterCode: 'CC-SALES-JED',
      costCenterName: 'Jeddah Commercial & Showrooms',
      costCenterNameAr: 'مركز تكلفة المبيعات والمعارض - فرع جدة الغربي',
      branchId: 'br-2',
      branchNameAr: 'فرع جدة التجاري',
      fiscalPeriod: '2026-Q4',
      allocatedBudget: 120000,
      committedAmount: 18500,
      baseActualSpent: 91000,
      alertThresholdPercent: 85,
      notes: 'تنبيه: اقترب الإنفاق الفعلي والالتزامات من سقف الموازنة الربع سنوية (91.3%)',
    },
    {
      id: 'ccb-103',
      tenantId: 'ten-1',
      costCenterId: 'cc-3',
      costCenterCode: 'CC-MFG-DMM',
      costCenterName: 'Dammam Industrial Assembly Line',
      costCenterNameAr: 'مركز تكلفة خطوط التجميع والصيانة الصناعية - الدمام',
      branchId: 'br-3',
      branchNameAr: 'فرع الدمام الصناعي',
      fiscalPeriod: '2026-Q4',
      allocatedBudget: 95000,
      committedAmount: 14000,
      baseActualSpent: 86500,
      alertThresholdPercent: 85,
      notes: 'تجاوز السقف المعتمد بسبب صيانة طارئة للمضخات الهيدروليكية (105.8%)',
    },
    {
      id: 'ccb-104',
      tenantId: 'ten-1',
      costCenterId: 'cc-4',
      costCenterCode: 'CC-IT-CLOUD',
      costCenterName: 'Digital Infrastructure & Cloud ERP',
      costCenterNameAr: 'مركز تكلفة البنية الرقمية والأمن السيبراني',
      branchId: 'br-1',
      branchNameAr: 'فرع الرياض الرئيسي',
      fiscalPeriod: '2026-Q4',
      allocatedBudget: 65000,
      committedAmount: 5000,
      baseActualSpent: 32000,
      alertThresholdPercent: 85,
      notes: 'تراخيص الخوادم السحابية والربط مع بوابة فاتورة ZATCA',
    },
  ]);

  // Business Modules
  const [employees, setEmployees] = useState<Employee[]>(SEED_EMPLOYEES);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(SEED_FIXED_ASSETS);
  const [boms] = useState<BillOfMaterials[]>(SEED_BOMS);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(SEED_PRODUCTION_ORDERS);
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>(SEED_FLEET);
  const [qualityInspections, setQualityInspections] = useState<QualityInspection[]>(SEED_QUALITY);
  const [crmLeads, setCrmLeads] = useState<CRMLead[]>(SEED_CRM_LEADS);
  const [ecommerceOrders, setEcommerceOrders] = useState<EcommerceOrder[]>(SEED_ECOMMERCE_ORDERS);
  const [workflowApprovals, setWorkflowApprovals] = useState<WorkflowApproval[]>(SEED_WORKFLOW_APPROVALS);

  // AI Copilot
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'ai-init',
      sender: 'assistant',
      text: language === 'ar'
        ? 'مرحباً بك في مساعد RLM ERP الذكي! أنا متصل مباشرة بقاعدة بياناتك المؤسسية وخادم التحليل الذكي. يمكنك سؤالي عن: مؤشرات المبيعات، أصناف المخزون التي تحتاج إعادة طلب، تحليل القيود المحاسبية، أو طلب تلخيص مالي.'
        : 'Welcome to RLM ERP AI Copilot! I am directly integrated with your enterprise database and AI server. Ask me about sales velocity, stock replenishment forecasting, journal entries, or financial summaries.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isAILoading, setIsAILoading] = useState(false);

  const isHydratedRef = useRef(false);

  // Switch Industry Mode and auto-adapt default invoice templates, headers, and footers from IndustryBlueprint
  const setActiveIndustry = (ind: IndustryType) => {
    setActiveIndustryState(ind);
    setMasterSystemConfig((prev) => ({
      ...prev,
      lockedIndustry: ind,
    }));
    const bp = getIndustryBlueprint(ind);
    setInvoiceTemplateSettings((prev) => ({
      ...prev,
      thermalTemplate: bp.thermalTemplate,
      standardTemplate: bp.standardTemplate,
      headerTitleAr: bp.invoiceHeaderAr,
      footerNoteAr: bp.invoiceFooterAr,
      showWarrantyTerms: bp.defaultWarrantyMonths > 0,
    }));

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'SWITCH_INDUSTRY_MODE',
        module: 'SETTINGS',
        entityType: 'IndustryMode',
        entityId: ind,
        details: `Switched platform operational industry profile to [${ind.toUpperCase()}] (${bp.nameAr}).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const updateMessagingGatewayConfig = (patch: Partial<MessagingGatewayConfig>) => {
    setMessagingGatewayConfig((prev) => ({ ...prev, ...patch }));
  };

  const openQuickSendModal = (preset?: Omit<QuickSendModalPreset, 'isOpen'>) => {
    setQuickSendModalState({
      isOpen: true,
      channel: preset?.channel || 'WHATSAPP',
      category: preset?.category || 'INVOICE',
      recipientName: preset?.recipientName || '',
      recipientPhone: preset?.recipientPhone || '',
      referenceNumber: preset?.referenceNumber || '',
      messageBody: preset?.messageBody || '',
    });
  };

  const closeQuickSendModal = () => {
    setQuickSendModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const sendWhatsAppOrSmsMessage = async (params: {
    channel: MessagingChannel;
    category: MessageTemplateCategory;
    recipientName: string;
    recipientPhone: string;
    referenceNumber?: string;
    messageBody: string;
    openDirectLink?: boolean;
  }): Promise<{
    success: boolean;
    errorAr?: string;
    record?: OutboundMessageRecord;
    whatsappUrl?: string;
    smsUri?: string;
  }> => {
    const built = buildWhatsAppAndSmsProtocolLinks(
      params.recipientPhone,
      params.messageBody,
      messagingGatewayConfig.defaultCountryDialCode
    );
    if (!built.valid) {
      return {
        success: false,
        errorAr: built.normalized.errorAr || 'رقم الهاتف غير صالح للإرسال.',
      };
    }
    if (!params.messageBody || !params.messageBody.trim()) {
      return {
        success: false,
        errorAr: 'يرجى كتابة نص الرسالة قبل الإرسال.',
      };
    }

    const newRecord: OutboundMessageRecord = {
      id: `msg-${Date.now()}`,
      tenantId: currentTenant.id,
      channel: params.channel,
      category: params.category,
      recipientName: params.recipientName || 'عميل / مستلم',
      recipientPhone: params.recipientPhone,
      normalizedPhone: built.normalized.e164Phone,
      referenceNumber: params.referenceNumber,
      messageBody: params.messageBody.trim(),
      status: params.openDirectLink ? 'OPENED_DIRECT_LINK' : 'DISPATCHED_GATEWAY',
      whatsappUrl: built.whatsappWebUrl,
      smsUri: built.smsUri,
      sentBy: currentUser.nameAr || currentUser.name,
      sentAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setOutboundMessages((prev) => [newRecord, ...prev]);

    try {
      await fetch('/api/v1/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRecord,
          openDirectLink: params.openDirectLink,
        }),
      });
    } catch {
      // Offline / local fallback already updated state
    }

    setAuditLogs((prev) => [
      {
        id: `aud-msg-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `SEND_${params.channel}_${params.category}`,
        module: 'COMMUNICATIONS',
        entityType: 'OutboundMessage',
        entityId: newRecord.id,
        details: `Dispatched ${params.channel} (${params.category}) to ${newRecord.recipientName} [${newRecord.normalizedPhone}]${params.referenceNumber ? ` Ref: ${params.referenceNumber}` : ''}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return {
      success: true,
      record: newRecord,
      whatsappUrl: built.whatsappWebUrl,
      smsUri: built.smsUri,
    };
  };

  const provisionIndustrySuppliesToInventory = (targetIndustry?: IndustryType) => {
    const ind = targetIndustry || activeIndustry;
    const bp = getIndustryBlueprint(ind);
    let addedCount = 0;
    let updatedCount = 0;
    let totalValuationAdded = 0;

    const existingSkus = new Set(products.map((p) => p.sku));
    const newProductsToInsert: Product[] = [];
    const newBarcodesToInsert: BarcodeItem[] = [];

    const updatedExistingProducts = products.map((prod) => {
      const matchingSupply = bp.supplies.find((s) => s.sku === prod.sku);
      if (matchingSupply) {
        updatedCount += 1;
        const addedVal = matchingSupply.defaultStock * matchingSupply.costPrice;
        totalValuationAdded += addedVal;
        return {
          ...prod,
          stockQty: prod.stockQty + matchingSupply.defaultStock,
        };
      }
      return prod;
    });

    bp.supplies.forEach((sup, idx) => {
      if (!existingSkus.has(sup.sku)) {
        addedCount += 1;
        const addedVal = sup.defaultStock * sup.costPrice;
        totalValuationAdded += addedVal;
        const prodId = `prd-sup-${ind}-${Date.now()}-${idx}`;
        newProductsToInsert.push({
          id: prodId,
          tenantId: currentTenant.id,
          sku: sup.sku,
          barcode: sup.barcode,
          name: sup.nameEn,
          nameAr: sup.nameAr,
          categoryId: categories[0]?.id || 'cat-1',
          industry: ind,
          subCategory: 'SOLAR_ACCESSORY',
          uom: sup.uom,
          costPrice: sup.costPrice,
          salePrice: sup.salePrice,
          taxRate: 15,
          stockQty: sup.defaultStock,
          minStock: sup.minStockAlert,
          maxStock: sup.defaultStock * 5,
          reorderPoint: sup.minStockAlert,
          warehouseId: currentWarehouse.id,
          binLocation: `SUP-${ind.slice(0, 3).toUpperCase()}-0${idx + 1}`,
          hasSerials: !sup.isConsumable && sup.warrantyMonths > 0,
          hasBatches: sup.isConsumable,
          warrantyMonths: sup.warrantyMonths,
          efficiencySpec: sup.specificationsAr,
          isActive: true,
        });
        newBarcodesToInsert.push({
          id: `bc-sup-${Date.now()}-${idx}`,
          tenantId: currentTenant.id,
          productId: prodId,
          productName: sup.nameAr,
          productSku: sup.sku,
          code: sup.barcode,
          format: 'EAN-13',
          isIndividualPiece: false,
          printedCount: 1,
          scannedCount: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    });

    setProducts([...newProductsToInsert, ...updatedExistingProducts]);
    if (newBarcodesToInsert.length > 0) {
      setBarcodes((prev) => [...newBarcodesToInsert, ...prev]);
    }

    if (totalValuationAdded > 0) {
      const invAccount =
        chartAccounts.find((a) => a.code === '1104') ||
        chartAccounts.find((a) => a.type === 'ASSET');
      const eqAccount =
        chartAccounts.find((a) => a.code === '3101') ||
        chartAccounts.find((a) => a.type === 'EQUITY');
      if (invAccount && eqAccount) {
        const je: JournalEntry = {
          id: `je-sup-${Date.now()}`,
          tenantId: currentTenant.id,
          entryNumber: `JE-SUP-${Date.now().toString().slice(-5)}`,
          date: new Date().toISOString().slice(0, 10),
          referenceType: 'STOCK_MOVE',
          referenceId: `SUPPLIES-${ind.toUpperCase()}`,
          description: `إثبات مخزون مستلزمات وتجهيزات النشاط (${bp.nameAr}) — عدد ${addedCount + updatedCount} صنف`,
          totalDebit: Math.round(totalValuationAdded * 100) / 100,
          totalCredit: Math.round(totalValuationAdded * 100) / 100,
          isPosted: true,
          isReversed: false,
          createdByName: currentUser.name,
          createdAt: new Date().toISOString(),
          lines: [
            {
              id: `jel-sup-1-${Date.now()}`,
              accountId: invAccount.id,
              accountCode: invAccount.code,
              accountName: invAccount.name,
              accountNameAr: invAccount.nameAr,
              debit: Math.round(totalValuationAdded * 100) / 100,
              credit: 0,
              memo: `توريد مستلزمات نشاط ${bp.nameAr}`,
            },
            {
              id: `jel-sup-2-${Date.now()}`,
              accountId: eqAccount.id,
              accountCode: eqAccount.code,
              accountName: eqAccount.name,
              accountNameAr: eqAccount.nameAr,
              debit: 0,
              credit: Math.round(totalValuationAdded * 100) / 100,
              memo: `مقابل تمويل مستلزمات النشاط الافتتاحية`,
            },
          ],
        };
        setJournalEntries((prev) => [je, ...prev]);
      }
    }

    const messageAr = `تم تجهيز وإضافة مستلزمات نشاط (${bp.nameAr}) إلى المستودع بنجاح (${addedCount} أصناف جديدة، ${updatedCount} أصناف محدّثة) بقيمة مخزنية ${totalValuationAdded.toLocaleString()} ${currency}.`;
    return {
      addedCount,
      updatedCount,
      totalValuationAdded,
      messageAr,
    };
  };

  const updateInvoiceTemplateSettings = (patch: Partial<InvoiceTemplateSettings>) => {
    setInvoiceTemplateSettings((prev) => ({ ...prev, ...patch }));
  };

  const updateCompanyProfile = (patch: Partial<Company>) => {
    setCompany((prev) => ({ ...prev, ...patch }));
  };

  const addBranch = (b: Omit<Branch, 'id' | 'tenantId' | 'companyId'>) => {
    const newBranch: Branch = {
      ...b,
      id: `br-${Date.now()}`,
      tenantId: currentTenant.id,
      companyId: company.id,
    };
    setBranches((prev) => [...prev, newBranch]);
  };

  const addWarehouse = (wh: Omit<Warehouse, 'id' | 'tenantId'>) => {
    const newWh: Warehouse = {
      ...wh,
      id: `wh-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setWarehouses((prev) => [...prev, newWh]);
  };

  // Helper to hydrate all persisted state slices consistently
  const applyHydratedState = (d: Record<string, any>) => {
    const hasSolarItems =
      Array.isArray(d.products) &&
      d.products.some((p: Product) => p.sku === 'SOL-PNL-585W');
    if (hasSolarItems && d.products.length >= SEED_PRODUCTS.length) {
      setProducts(d.products);
    }
    if (Array.isArray(d.barcodes) && d.barcodes.length > 0) setBarcodes(d.barcodes);
    if (Array.isArray(d.traceabilityEvents)) setTraceabilityEvents(d.traceabilityEvents);
    if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers);
    if (Array.isArray(d.purchaseOrders)) setPurchaseOrders(d.purchaseOrders);
    if (Array.isArray(d.customers)) setCustomers(d.customers);
    if (Array.isArray(d.salesInvoices)) setSalesInvoices(d.salesInvoices);
    if (Array.isArray(d.salesReturns)) setSalesReturns(d.salesReturns);
    if (Array.isArray(d.warrantyTickets)) setWarrantyTickets(d.warrantyTickets);
    if (Array.isArray(d.salesPipelineDocs)) setSalesPipelineDocs(d.salesPipelineDocs);
    if (Array.isArray(d.chartAccounts) && d.chartAccounts.length >= SEED_CHART_OF_ACCOUNTS.length) {
      setChartAccounts(d.chartAccounts);
    }
    if (Array.isArray(d.journalEntries)) setJournalEntries(d.journalEntries);
    if (Array.isArray(d.bankStatementLines)) setBankStatementLines(d.bankStatementLines);
    if (Array.isArray(d.postDatedChecks)) setPostDatedChecks(d.postDatedChecks);
    if (Array.isArray(d.exchangeRates)) setExchangeRates(d.exchangeRates);
    if (Array.isArray(d.costCenterBudgets)) setCostCenterBudgets(d.costCenterBudgets);
    if (Array.isArray(d.employees)) setEmployees(d.employees);
    if (Array.isArray(d.fixedAssets)) setFixedAssets(d.fixedAssets);
    if (Array.isArray(d.productionOrders)) setProductionOrders(d.productionOrders);
    if (Array.isArray(d.projects)) setProjects(d.projects);
    if (Array.isArray(d.fleetVehicles)) setFleetVehicles(d.fleetVehicles);
    if (Array.isArray(d.qualityInspections)) setQualityInspections(d.qualityInspections);
    if (Array.isArray(d.crmLeads)) setCrmLeads(d.crmLeads);
    if (Array.isArray(d.ecommerceOrders)) setEcommerceOrders(d.ecommerceOrders);
    if (Array.isArray(d.workflowApprovals)) setWorkflowApprovals(d.workflowApprovals);
    if (Array.isArray(d.auditLogs)) setAuditLogs(d.auditLogs);
    if (Array.isArray(d.tenants) && d.tenants.length > 0) {
      setTenants(d.tenants);
      setCurrentTenantState((prev) => d.tenants.find((t: Tenant) => t.id === prev.id) || d.tenants[0]);
    }
    if (Array.isArray(d.branches) && d.branches.length > 0) {
      setBranches(d.branches);
      setCurrentBranch((prev) => d.branches.find((b: Branch) => b.id === prev.id) || d.branches[0]);
    }
    if (Array.isArray(d.warehouses) && d.warehouses.length > 0) {
      setWarehouses(d.warehouses);
      setCurrentWarehouse((prev) => d.warehouses.find((w: Warehouse) => w.id === prev.id) || d.warehouses[0]);
    }
    if (d.activeIndustry) setActiveIndustryState(d.activeIndustry);
    if (d.currency) setCurrencyState(d.currency);
    if (d.masterSystemConfig) {
      setMasterSystemConfig((prev) => {
        if (d.masterSystemConfig.sectorMode === undefined) {
          return applySectorModePreset(
            {
              ...prev,
              ...d.masterSystemConfig,
            },
            true
          );
        }
        return {
          ...prev,
          ...d.masterSystemConfig,
          visibleModules: { ...prev.visibleModules, ...(d.masterSystemConfig.visibleModules || {}) },
          uiElementsVisibility: {
            ...prev.uiElementsVisibility,
            ...(d.masterSystemConfig.uiElementsVisibility || {}),
          },
        };
      });
      if (d.masterSystemConfig.globalDefaultCurrency && !d.currency) {
        setCurrencyState(d.masterSystemConfig.globalDefaultCurrency);
      }
    }
    if (Array.isArray(d.promoCoupons) && d.promoCoupons.length > 0) {
      setPromoCoupons(d.promoCoupons);
    }
    if (Array.isArray(d.promotionalOffers) && d.promotionalOffers.length > 0) {
      setPromotionalOffers(d.promotionalOffers);
    }
    if (typeof d.activeLicenseSerial === 'string' && d.activeLicenseSerial.trim()) {
      const check = verifyActivationSerial(
        d.activeLicenseSerial,
        protectionState.machineRequestCode,
        Date.now()
      );
      if (check.valid) {
        setActiveLicenseSerial(d.activeLicenseSerial);
      } else {
        setActiveLicenseSerial(null);
      }
    } else if (d.activeLicenseSerial === null) {
      setActiveLicenseSerial(null);
    }
    if (typeof d.isSimulatedTrialExpired === 'boolean') {
      setIsSimulatedTrialExpired(d.isSimulatedTrialExpired);
    }
    if (typeof d.isSimulatedClockTampered === 'boolean') {
      setIsSimulatedClockTampered(d.isSimulatedClockTampered);
    }
    if (d.simulatedTamperedComponent) {
      setSimulatedTamperedComponent(d.simulatedTamperedComponent);
    }
    if (d.invoiceTemplateSettings) {
      setInvoiceTemplateSettings({ ...DEFAULT_TEMPLATE_SETTINGS, ...d.invoiceTemplateSettings });
    }
    if (Array.isArray(d.outboundMessages) && d.outboundMessages.length > 0) {
      setOutboundMessages(d.outboundMessages);
    }
    if (d.messagingGatewayConfig) {
      setMessagingGatewayConfig((prev) => ({ ...prev, ...d.messagingGatewayConfig }));
    }
  };

  // Load persisted state from 0ms LocalStorage cache + Express RAM backend on mount
  useEffect(() => {
    let active = true;
    const INSTANT_CACHE_KEY = 'rlm_erp_instant_v4_solar';

    try {
      const cachedRaw = localStorage.getItem(INSTANT_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (
          Array.isArray(cached.products) &&
          cached.products.some((p: Product) => p.sku === 'SOL-PNL-585W')
        ) {
          applyHydratedState(cached);
        }
      }
    } catch {
      // ignore local storage quota or parse errors
    }

    fetch('/api/v1/erp/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json) return;
        setBackendConnected(true);
        if (typeof json.dbRevision === 'number') {
          setDbRevision(json.dbRevision);
        }
        if (json.data) {
          applyHydratedState(json.data);
        }
        isHydratedRef.current = true;
      })
      .catch(() => {
        isHydratedRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  // Instant 0ms Write-Through LocalStorage + Ultra-Fast 60ms Server RAM Sync
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const INSTANT_CACHE_KEY = 'rlm_erp_instant_v4_solar';
    const stateSnapshot = {
      products,
      barcodes,
      traceabilityEvents,
      suppliers,
      purchaseOrders,
      customers,
      salesInvoices,
      salesReturns,
      warrantyTickets,
      salesPipelineDocs,
      chartAccounts,
      journalEntries,
      bankStatementLines,
      postDatedChecks,
      exchangeRates,
      costCenterBudgets,
      employees,
      fixedAssets,
      productionOrders,
      projects,
      fleetVehicles,
      qualityInspections,
      crmLeads,
      ecommerceOrders,
      workflowApprovals,
      auditLogs,
      tenants,
      branches,
      warehouses,
      activeIndustry: activeIndustryState,
      currency,
      masterSystemConfig,
      promoCoupons,
      promotionalOffers,
      activeLicenseSerial,
      isSimulatedTrialExpired,
      isSimulatedClockTampered,
      simulatedTamperedComponent,
      invoiceTemplateSettings,
      outboundMessages,
      messagingGatewayConfig,
    };

    // 1. Immediate 0ms Client Write-Through
    try {
      localStorage.setItem(INSTANT_CACHE_KEY, JSON.stringify(stateSnapshot));
    } catch {
      // ignore storage quota limits
    }

    // 2. High-Speed 60ms Server RAM + Atomic Disk Sync
    const timer = setTimeout(() => {
      const t0 = performance.now();
      // Include official ASF V2 license token or device verification headers
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const activeV2Token = localStorage.getItem('asf_v2_signed_token');
      if (activeV2Token) {
        headers['x-asf-license-token'] = activeV2Token;
      } else {
        headers['x-asf-trial-device'] = activeLicenseSerial || 'LOCAL-TRIAL-CLIENT';
      }

      fetch('/api/v1/erp/state', {
        method: 'POST',
        headers,
        body: JSON.stringify(stateSnapshot),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((resp) => {
          const dt = Math.max(0.2, Math.round((performance.now() - t0) * 10) / 10);
          setSyncLatencyMs(resp?.latencyMs ?? dt);
          if (resp?.dbRevision) setDbRevision(resp.dbRevision);
          setBackendConnected(true);
        })
        .catch(() => {});
    }, 60);
    return () => clearTimeout(timer);
  }, [
    products,
    barcodes,
    traceabilityEvents,
    suppliers,
    purchaseOrders,
    customers,
    salesInvoices,
    salesReturns,
    warrantyTickets,
    salesPipelineDocs,
    chartAccounts,
    journalEntries,
    bankStatementLines,
    postDatedChecks,
    exchangeRates,
    costCenterBudgets,
    employees,
    fixedAssets,
    productionOrders,
    projects,
    fleetVehicles,
    qualityInspections,
    crmLeads,
    ecommerceOrders,
    workflowApprovals,
    auditLogs,
    tenants,
    branches,
    warehouses,
    activeIndustryState,
    currency,
    masterSystemConfig,
    promoCoupons,
    promotionalOffers,
    activeLicenseSerial,
    isSimulatedTrialExpired,
    isSimulatedClockTampered,
    simulatedTamperedComponent,
    invoiceTemplateSettings,
    outboundMessages,
    messagingGatewayConfig,
  ]);

  // Tenant Switcher
  const setCurrentTenant = (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    const log: AuditLog = {
      id: `aud-${Date.now()}`,
      tenantId: tenant.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'SWITCH_TENANT_WORKSPACE',
      module: 'SAAS',
      entityType: 'Tenant',
      entityId: tenant.id,
      details: `Switched active enterprise tenant to ${tenant.name} (${tenant.code}).`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const setCurrentUserRole = (role: UserRole) => {
    setCurrentUser((prev) => ({ ...prev, role }));
    const matchingAccount = userAccounts.find((a) => a.role === role);
    if (matchingAccount) {
      setCurrentAccount(matchingAccount);
    } else {
      setCurrentAccount((prev) => ({ ...prev, role }));
    }
  };

  const updateTenantPlan = (
    tenantId: string,
    planId: 'starter' | 'professional' | 'enterprise'
  ) => {
    const maxUsers = planId === 'enterprise' ? 50 : planId === 'professional' ? 15 : 5;
    const maxBranches = planId === 'enterprise' ? 10 : planId === 'professional' ? 3 : 1;
    const maxWarehouses = planId === 'enterprise' ? 20 : planId === 'professional' ? 8 : 3;

    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? { ...t, planId, maxUsers, maxBranches, maxWarehouses }
          : t
      )
    );
    if (currentTenant.id === tenantId) {
      setCurrentTenantState((prev) => ({
        ...prev,
        planId,
        maxUsers,
        maxBranches,
        maxWarehouses,
      }));
    }
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UPGRADE_TENANT_PLAN',
        module: 'SAAS',
        entityType: 'Tenant',
        entityId: tenantId,
        details: `Updated commercial subscription plan for tenant [${tenantId}] to [${planId.toUpperCase()}] (${maxUsers} users / ${maxBranches} branches).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  // Add Product
  const addProduct = (p: Omit<Product, 'id'>) => {
    const nowTs = Date.now();
    const newId = `prd-${nowTs}`;
    const newProduct: Product = {
      ...p,
      id: newId,
      tenantId: currentTenant.id,
      industry: p.industry || activeIndustry,
    };
    setProducts((prev) => [newProduct, ...prev]);

    const barItem: BarcodeItem = {
      id: `bar-${nowTs}`,
      tenantId: currentTenant.id,
      code: p.barcode,
      format: 'EAN-13',
      productId: newId,
      productName: p.name,
      productSku: p.sku,
      isIndividualPiece: false,
      printedCount: 1,
      scannedCount: 0,
      createdAt: new Date().toISOString(),
    };
    setBarcodes((prev) => [barItem, ...prev]);

    const openingValuation = Math.round((Number(p.stockQty) || 0) * (Number(p.costPrice) || 0) * 100) / 100;
    if (openingValuation > 0) {
      const entryNum = `JE-OB-PRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const obJournal: JournalEntry = {
        id: `je-ob-prd-${nowTs}`,
        tenantId: currentTenant.id,
        entryNumber: entryNum,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'STOCK_MOVE',
        referenceId: p.sku,
        description: `قيد إثبات رصيد مخزون افتتاحي للصنف الجديد [${p.nameAr || p.name} - SKU: ${p.sku}] (${p.stockQty} ${p.uom})`,
        lines: [
          {
            id: `jl-ob-prd-1-${nowTs}`,
            accountId: 'acc-1104',
            accountCode: '1104',
            accountName: 'Merchandise Inventory',
            accountNameAr: 'المخزون السلعي (رصيد افتتاحي لصنف جديد)',
            debit: openingValuation,
            credit: 0,
            memo: `Opening stock +${p.stockQty} ${p.uom} @ ${p.costPrice}`,
          },
          {
            id: `jl-ob-prd-2-${nowTs}`,
            accountId: 'acc-3101',
            accountCode: '3101',
            accountName: 'Share Capital & Opening Equity',
            accountNameAr: 'رأس المال والأرصدة الافتتاحية',
            debit: 0,
            credit: openingValuation,
            memo: `Opening inventory valuation contra-account (${p.sku})`,
          },
        ],
        totalDebit: openingValuation,
        totalCredit: openingValuation,
        isPosted: true,
        isReversed: false,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setJournalEntries((prev) => [obJournal, ...prev]);

      setTraceabilityEvents((prev) => [
        {
          id: `trc-ob-${nowTs}`,
          tenantId: currentTenant.id,
          serialNumber: p.barcode,
          productId: newId,
          productName: p.nameAr || p.name,
          eventType: 'RECEIVED',
          location: currentWarehouse.nameAr,
          referenceDoc: entryNum,
          operator: currentUser.name,
          timestamp: new Date().toISOString(),
          notes: `تسجيل رصيد افتتاحي للصنف (${p.stockQty} ${p.uom}) بتكلفة ${p.costPrice}`,
        },
        ...prev,
      ]);
    }

    setAuditLogs((prev) => [
      {
        id: `aud-${nowTs}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE_PRODUCT',
        module: 'INVENTORY',
        entityType: 'Product',
        entityId: newId,
        details: `Created product ${p.name} (SKU: ${p.sku}) with stock ${p.stockQty} and opening valuation ${openingValuation}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const updateProduct = (p: Product) => {
    setProducts((prev) => prev.map((item) => (item.id === p.id ? p : item)));
  };

  const importBulkProductsCSV = (
    rawCsvText: string,
    postOpeningBalanceJournal = true
  ): { importedCount: number; totalOpeningValuation: number; errors: string[] } => {
    const parsed = parseBulkProductsCSV(
      rawCsvText,
      currentTenant.id,
      currentWarehouse.id,
      categories[0]?.id || 'cat-1',
      activeIndustry
    );

    if (parsed.validProducts.length === 0) {
      return {
        importedCount: 0,
        totalOpeningValuation: 0,
        errors: parsed.errors.length > 0 ? parsed.errors : ['لم يتم العثور على صفوف صالحة للاستيراد'],
      };
    }

    const nowTs = Date.now();
    const createdProducts: Product[] = parsed.validProducts.map((p, idx) => ({
      ...p,
      id: `prd-imp-${nowTs}-${idx}`,
    }));

    const createdBarcodes: BarcodeItem[] = createdProducts.map((p, idx) => ({
      id: `bar-imp-${nowTs}-${idx}`,
      tenantId: currentTenant.id,
      code: p.barcode,
      format: 'EAN-13',
      productId: p.id,
      productName: p.name,
      productSku: p.sku,
      isIndividualPiece: false,
      printedCount: 1,
      scannedCount: 0,
      createdAt: new Date().toISOString(),
    }));

    setProducts((prev) => [...createdProducts, ...prev]);
    setBarcodes((prev) => [...createdBarcodes, ...prev]);

    if (postOpeningBalanceJournal && parsed.totalOpeningValuation > 0) {
      const entryNum = `JE-OB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const obJournal: JournalEntry = {
        id: `je-ob-${nowTs}`,
        tenantId: currentTenant.id,
        entryNumber: entryNum,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'STOCK_MOVE',
        description: `قيد إثبات الأرصدة الافتتاحية للمخزون المستورد عبر Excel/CSV (${createdProducts.length} صنف)`,
        lines: [
          {
            id: `jl-ob-1-${nowTs}`,
            accountId: 'acc-1104',
            accountCode: '1104',
            accountName: 'Merchandise Inventory',
            accountNameAr: 'المخزون السلعي (أرصدة افتتاحية مستوردة)',
            debit: parsed.totalOpeningValuation,
            credit: 0,
            memo: `Opening stock import (${parsed.totalOpeningQty} units)`,
          },
          {
            id: `jl-ob-2-${nowTs}`,
            accountId: 'acc-3101',
            accountCode: '3101',
            accountName: 'Share Capital & Opening Equity',
            accountNameAr: 'رأس المال والأرصدة الافتتاحية',
            debit: 0,
            credit: parsed.totalOpeningValuation,
            memo: 'Opening inventory valuation contra-account',
          },
        ],
        totalDebit: parsed.totalOpeningValuation,
        totalCredit: parsed.totalOpeningValuation,
        isPosted: true,
        isReversed: false,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setJournalEntries((prev) => [obJournal, ...prev]);
    }

    setAuditLogs((prev) => [
      {
        id: `aud-${nowTs}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'BULK_CSV_IMPORT',
        module: 'INVENTORY',
        entityType: 'ProductBatch',
        entityId: `IMP-${createdProducts.length}`,
        details: `Imported ${createdProducts.length} products via Bulk CSV/Excel Wizard with opening valuation ${parsed.totalOpeningValuation} ${currency}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return {
      importedCount: createdProducts.length,
      totalOpeningValuation: parsed.totalOpeningValuation,
      errors: parsed.errors,
    };
  };

  // Barcode Generation for piece or product
  const generateBarcodeForProduct = (productId: string, _format = 'Code 128', isPiece = false): BarcodeItem => {
    const prod = products.find((p) => p.id === productId);
    const code = isPiece
      ? generateUniqueSerialNumber('SN', currentTenant.code)
      : generateValidEAN13('628', '1042', Math.floor(100 + Math.random() * 900).toString());

    const newItem: BarcodeItem = {
      id: `bar-${Date.now()}`,
      tenantId: currentTenant.id,
      code,
      format: isPiece ? 'Code 128' : 'EAN-13',
      productId,
      productName: prod ? prod.name : 'Custom Item',
      productSku: prod ? prod.sku : 'CUSTOM',
      serialNumber: isPiece ? code : undefined,
      isIndividualPiece: isPiece,
      printedCount: 1,
      scannedCount: 0,
      createdAt: new Date().toISOString(),
    };

    setBarcodes((prev) => [newItem, ...prev]);

    if (isPiece) {
      addTraceabilityEvent({
        tenantId: currentTenant.id,
        serialNumber: code,
        productName: prod ? prod.name : 'Custom Item',
        eventType: 'GENERATED',
        location: currentWarehouse.name,
        operator: currentUser.name,
        referenceDoc: 'BARCODE-GEN',
        notes: 'Generated serialized unique piece barcode with individual traceability.',
      });
    }

    return newItem;
  };

  const addTraceabilityEvent = (event: Omit<TraceabilityEvent, 'id' | 'timestamp'>) => {
    const newEvent: TraceabilityEvent = {
      ...event,
      id: `trace-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setTraceabilityEvents((prev) => [newEvent, ...prev]);
  };

  // Smart Camera / Label OCR Identification & Duplicate Serial Guard
  const scanProductLabelWithSmartOCR = (rawLabelText: string): SmartLabelOCRResult => {
    const existingSerials = [
      ...traceabilityEvents.map((e) => e.serialNumber),
      ...barcodes.filter((b) => b.serialNumber).map((b) => b.serialNumber!),
    ];
    const parsed = parseSmartProductLabelOCR(rawLabelText, products, existingSerials);
    const dupEvent = traceabilityEvents.find(
      (e) => e.serialNumber.toUpperCase() === parsed.serialNumber.toUpperCase()
    );
    return {
      ...parsed,
      duplicateLocationInfo: dupEvent
        ? `مسجل مسبقاً بتاريخ ${dupEvent.timestamp.slice(0, 10)} في (${dupEvent.location}) - مرجع: ${dupEvent.referenceDoc}`
        : undefined,
    };
  };

  const registerOCRProductOrSerial = (
    ocrResult: SmartLabelOCRResult
  ): { success: boolean; messageAr: string; serialRegistered?: string } => {
    const cleanSn = (ocrResult.serialNumber || '').trim().toUpperCase();
    const liveDup =
      ocrResult.isDuplicateSerial ||
      traceabilityEvents.some((e) => e.serialNumber.toUpperCase() === cleanSn) ||
      barcodes.some((b) => (b.serialNumber || '').toUpperCase() === cleanSn);

    if (liveDup) {
      return {
        success: false,
        messageAr: `تنبيه أمني: الرقم التسلسلي (${cleanSn}) مسجل مسبقاً في قاعدة البيانات! يمنع النظام تكرار السيريال لنفس القطعة.`,
      };
    }

    let targetProd = products.find((p) => p.id === ocrResult.matchedProductId);
    if (!targetProd) {
      const newProdId = `prd-ocr-${Date.now()}`;
      targetProd = {
        id: newProdId,
        tenantId: currentTenant.id,
        sku: ocrResult.modelCode || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: ocrResult.barcode,
        name: `${ocrResult.manufacturer} ${ocrResult.modelCode}`,
        nameAr: ocrResult.extractedNameAr,
        categoryId: categories[0]?.id || 'cat-ele-solar',
        industry: 'electronics',
        subCategory: ocrResult.subCategory,
        uom: 'PCS',
        costPrice: 1200,
        salePrice: 1550,
        taxRate: 0.15,
        stockQty: 1,
        minStock: 5,
        maxStock: 100,
        reorderPoint: 10,
        warehouseId: currentWarehouse.id,
        binLocation: 'OCR-RCV-01',
        hasSerials: true,
        hasBatches: true,
        warrantyMonths: 24,
        powerRatingWatts: ocrResult.powerRatingWatts,
        voltageSpec: ocrResult.voltageSpec,
        batteryCapacitySpec: ocrResult.batteryCapacitySpec,
        efficiencySpec: ocrResult.efficiencySpec,
        isActive: true,
      };
      setProducts((prev) => [targetProd!, ...prev]);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === targetProd!.id ? { ...p, stockQty: p.stockQty + 1 } : p))
      );
    }

    const barItem: BarcodeItem = {
      id: `bar-ocr-${Date.now()}`,
      tenantId: currentTenant.id,
      code: cleanSn,
      format: 'Code 128',
      productId: targetProd.id,
      productName: targetProd.nameAr,
      productSku: targetProd.sku,
      serialNumber: cleanSn,
      isIndividualPiece: true,
      printedCount: 1,
      scannedCount: 1,
      createdAt: new Date().toISOString(),
    };
    setBarcodes((prev) => [barItem, ...prev]);

    addTraceabilityEvent({
      tenantId: currentTenant.id,
      serialNumber: cleanSn,
      productName: targetProd.nameAr,
      eventType: 'RECEIVED',
      location: currentWarehouse.nameAr || currentWarehouse.name,
      operator: currentUser.name,
      referenceDoc: `OCR-SCAN-${ocrResult.modelCode}`,
      notes: `تم التعرف الضوئي الذكي (OCR) وتوثيق السيريال الفريد للمواصفة (${ocrResult.powerRatingWatts || ''}W ${ocrResult.voltageSpec || ''})`,
    });

    return {
      success: true,
      serialRegistered: cleanSn,
      messageAr: `تم اعتماد وتوثيق القطعة بالسيريال الفريد (${cleanSn}) للصنف «${targetProd.nameAr}» وإضافتها لرصيد المستودع.`,
    };
  };

  // Purchasing & Supplier Payments
  const addPurchaseOrder = (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => {
    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPO: PurchaseOrder = {
      ...po,
      id: `po-${Date.now()}`,
      poNumber,
      tenantId: currentTenant.id,
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
  };

  const approvePurchaseOrder = (poId: string): { success: boolean; entryNumber?: string } => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO || targetPO.status === 'RECEIVED') {
      return { success: false };
    }

    // 1. Update stock quantities & recalculate Weighted Average Cost (WAC)
    targetPO.items.forEach((item) => {
      setProducts((currProducts) =>
        currProducts.map((p) =>
          p.id === item.productId
            ? {
                ...p,
                costPrice: calculateWeightedAverageCost(
                  p.stockQty,
                  p.costPrice,
                  item.quantity,
                  item.unitCost
                ),
                stockQty: p.stockQty + item.quantity,
              }
            : p
        )
      );
      addTraceabilityEvent({
        tenantId: currentTenant.id,
        serialNumber: `BATCH-${targetPO.poNumber}-${item.sku}`,
        productName: item.productName,
        eventType: 'RECEIVED',
        location: currentWarehouse.nameAr || currentWarehouse.name,
        operator: currentUser.name,
        referenceDoc: targetPO.poNumber,
        notes: `استلام مخزني معتمد بعدد (${item.quantity}) وحدة بتكلفة ${item.unitCost} ${currency}`,
      });
    });

    // 2. Update Supplier payable balance
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === targetPO.supplierId
          ? { ...s, balance: Math.round((s.balance + targetPO.total) * 100) / 100 }
          : s
      )
    );

    // 3. Post balanced Purchase Receipt & Input VAT Journal Entry
    const entryNumber = `JE-PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const poJournal = createPurchaseOrderReceiptJournal(
      targetPO,
      currentTenant.id,
      entryNumber,
      currentUser.name
    );
    setJournalEntries((prev) => [poJournal, ...prev]);

    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === poId ? { ...po, status: 'RECEIVED', approvedBy: currentUser.name } : po
      )
    );

    setAuditLogs((prev) => [
      {
        id: `aud-po-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'RECEIVE_PURCHASE_ORDER',
        module: 'PURCHASING',
        entityType: 'PurchaseOrder',
        entityId: targetPO.poNumber,
        details: `Received Purchase Order [${targetPO.poNumber}] from ${targetPO.supplierName} (${targetPO.total} ${currency}) and posted journal [${entryNumber}].`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true, entryNumber };
  };

  const recordSupplierPaymentVoucher = (params: {
    supplierId: string;
    amount: number;
    paymentMethod: 'BANK_TRANSFER' | 'CASH';
    referenceNumber?: string;
  }) => {
    const targetSupplier = suppliers.find((s) => s.id === params.supplierId);
    const cleanAmount = Math.round(Math.abs(Number(params.amount) || 0) * 100) / 100;
    if (!targetSupplier || cleanAmount <= 0) {
      return { success: false };
    }

    const refNo =
      params.referenceNumber?.trim() ||
      `SPV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const entryNumber = `JE-SPV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const journal = createSupplierPaymentJournalEntry({
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.nameAr || targetSupplier.name,
      amount: cleanAmount,
      paymentMethod: params.paymentMethod,
      referenceNumber: refNo,
      tenantId: currentTenant.id,
      entryNumber,
      operatorName: currentUser.name,
    });

    const newBalance = Math.max(0, Math.round((targetSupplier.balance - cleanAmount) * 100) / 100);
    setSuppliers((prev) =>
      prev.map((s) => (s.id === targetSupplier.id ? { ...s, balance: newBalance } : s))
    );
    setJournalEntries((prev) => [journal, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `aud-spv-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'POST_SUPPLIER_PAYMENT_VOUCHER',
        module: 'PURCHASING',
        entityType: 'SupplierPaymentVoucher',
        entityId: refNo,
        details: `Disbursed Supplier Payment Voucher [${refNo}] to ${targetSupplier.nameAr} (${cleanAmount} ${currency}). Journal: ${entryNumber}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true, entryNumber, newBalance };
  };

  // Customers, Direct B2B Sales Invoices, Returns & Warranty RMA
  const addCustomer = (c: Omit<Customer, 'id' | 'tenantId'>) => {
    const newCustomer: Customer = {
      ...c,
      id: `cust-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const createSalesReturnCreditNote = (params: {
    originalInvoiceId: string;
    productId: string;
    quantity: number;
    serialNumber?: string;
    condition: ReturnedItemCondition;
    refundMethod: ReturnRefundMethod;
    reason: string;
  }): { success: boolean; creditNote?: SalesReturnDoc; messageAr?: string } => {
    const origInv =
      salesInvoices.find((i) => i.id === params.originalInvoiceId) || salesInvoices[0];
    const prod = products.find((p) => p.id === params.productId) || products[0];
    if (!origInv || !prod) {
      return { success: false };
    }

    const rawQty = Number(params.quantity);
    if (!Number.isFinite(rawQty) || rawQty <= 0) {
      return {
        success: false,
        messageAr: 'خطأ في المدخلات: الكمية المرتجعة يجب أن تكون أكبر من الصفر.',
      };
    }

    const cleanSerial = params.serialNumber?.trim().toUpperCase();
    if (
      cleanSerial &&
      salesReturns.some(
        (r) => r.serialNumber && r.serialNumber.trim().toUpperCase() === cleanSerial
      )
    ) {
      return {
        success: false,
        messageAr: `تنبيه منع التكرار: الرقم التسلسلي (${cleanSerial}) تم إرجاعه وإصدار إشعار دائن له مسبقاً!`,
      };
    }

    const matchingInvLine = origInv.items.find((i) => i.productId === prod.id);
    if (matchingInvLine) {
      const alreadyReturnedQty = salesReturns
        .filter((r) => r.originalInvoiceId === origInv.id && r.productId === prod.id)
        .reduce((s, r) => s + r.quantity, 0);
      if (alreadyReturnedQty + rawQty > matchingInvLine.quantity) {
        return {
          success: false,
          messageAr: `خطأ: الكمية المطلوب إرجاعها (${rawQty}) تتجاوز الكمية المباعة المتبقية في الفاتورة الأصلية (${matchingInvLine.quantity - alreadyReturnedQty}).`,
        };
      }
    }

    const qty = Math.round(rawQty * 1000) / 1000;
    const unitPrice = matchingInvLine ? matchingInvLine.unitPrice : prod.salePrice;
    const unitCost = prod.costPrice || Math.round(unitPrice * 0.72);
    const subtotal = Math.round(unitPrice * qty * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.15 * 100) / 100;
    const totalRefund = Math.round((subtotal + taxAmount) * 100) / 100;
    const totalCost = Math.round(unitCost * qty * 100) / 100;

    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const creditNoteNumber = `CN-${year}-${rand}`;
    const entryNumber = `JE-RET-${year}-${rand}`;
    const restock = params.condition === 'HEALTHY_RESTOCK';

    const retJournal = createSalesReturnCreditNoteJournal({
      creditNoteNumber,
      originalInvoiceNumber: origInv.invoiceNumber,
      customerName: origInv.customerName,
      subtotal,
      taxAmount,
      totalRefund,
      totalCostOfReturnedGoods: totalCost,
      restockToInventory: restock,
      refundMethod: params.refundMethod,
      tenantId: currentTenant.id,
      entryNumber,
      operatorName: currentUser.name,
    });

    if (restock) {
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, stockQty: p.stockQty + qty } : p))
      );
    }

    if (params.refundMethod === 'CREDIT_BALANCE') {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === origInv.customerId
            ? { ...c, balance: Math.max(0, Math.round((c.balance - totalRefund) * 100) / 100) }
            : c
        )
      );
    }

    if (params.serialNumber) {
      addTraceabilityEvent({
        tenantId: currentTenant.id,
        serialNumber: params.serialNumber,
        productName: prod.nameAr,
        eventType: 'RETURNED',
        location: restock ? currentWarehouse.nameAr : 'منطقة العزل والفحص الفني (Quarantine)',
        operator: currentUser.name,
        referenceDoc: creditNoteNumber,
        notes: `مرتجع مبيعات (${params.condition === 'HEALTHY_RESTOCK' ? 'إعادة للمخزون السليم' : 'عزل تالف/فحص ضمان'}): ${params.reason}`,
      });
    }

    const creditNote: SalesReturnDoc = {
      id: `ret-${Date.now()}`,
      tenantId: currentTenant.id,
      creditNoteNumber,
      originalInvoiceId: origInv.id,
      originalInvoiceNumber: origInv.invoiceNumber,
      customerId: origInv.customerId,
      customerName: origInv.customerName,
      productId: prod.id,
      productName: prod.nameAr,
      sku: prod.sku,
      serialNumber: params.serialNumber || `SN-RET-${rand}`,
      quantity: qty,
      unitPrice,
      unitCost,
      subtotal,
      taxAmount,
      totalRefund,
      condition: params.condition,
      refundMethod: params.refundMethod,
      reason: params.reason,
      withinWarranty: true,
      date: new Date().toISOString().slice(0, 10),
      journalEntryNumber: entryNumber,
      approvedBy: currentUser.name,
    };

    setSalesReturns((prev) => [creditNote, ...prev]);
    setJournalEntries((prev) => [retJournal, ...prev]);

    return {
      success: true,
      creditNote,
      messageAr: `تم إصدار إشعار الدائن (${creditNoteNumber}) بمبلغ ${totalRefund.toLocaleString()} ${currency} وترحيل القيد العكسي (${entryNumber}) بنجاح.`,
    };
  };

  const createWarrantyMaintenanceTicket = (params: {
    serialNumber: string;
    productId: string;
    customerName: string;
    customerPhone: string;
    purchaseDate: string;
    faultDescription: string;
    sparePartsUsed?: string;
    sparePartsCost?: number;
    laborFee?: number;
  }): WarrantyMaintenanceTicket => {
    const prod = products.find((p) => p.id === params.productId) || products[0];
    const warrantyMonths = prod.warrantyMonths || 24;
    const evalStatus = evaluateSerialWarrantyStatus({
      purchaseDateIso: params.purchaseDate,
      warrantyMonths,
    });

    const partsCost = evalStatus.isUnderWarranty ? 0 : Math.max(0, Number(params.sparePartsCost) || 0);
    const labor = evalStatus.isUnderWarranty ? 0 : Math.max(0, Number(params.laborFee) || 0);
    const totalCharge = partsCost + labor;
    const ticketNumber = `RMA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newTicket: WarrantyMaintenanceTicket = {
      id: `rma-${Date.now()}`,
      tenantId: currentTenant.id,
      ticketNumber,
      serialNumber: params.serialNumber.trim().toUpperCase(),
      productId: prod.id,
      productName: prod.nameAr,
      sku: prod.sku,
      customerName: params.customerName.trim(),
      customerPhone: params.customerPhone.trim(),
      purchaseDate: params.purchaseDate,
      warrantyMonths,
      warrantyExpiryDate: evalStatus.warrantyExpiryDate,
      isUnderWarranty: evalStatus.isUnderWarranty,
      faultDescription: params.faultDescription,
      technicianReport: evalStatus.isUnderWarranty
        ? 'تحت الفحص الهندسي المشمول بالضمان المصنعي'
        : 'تحت الفحص الهندسي (خارج فترة الضمان - تطبق رسوم الإصلاح وقطع الغيار)',
      sparePartsUsed: params.sparePartsUsed || 'قيد التحديد بعد الفحص',
      sparePartsCost: partsCost,
      laborFee: labor,
      totalCustomerCharge: totalCharge,
      status: 'RECEIVED',
      receivedAt: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    };

    setWarrantyTickets((prev) => [newTicket, ...prev]);

    addTraceabilityEvent({
      tenantId: currentTenant.id,
      serialNumber: newTicket.serialNumber,
      productName: newTicket.productName,
      eventType: 'MAINTENANCE',
      location: 'مركز الصيانة والضمان المعتمد',
      operator: currentUser.name,
      referenceDoc: ticketNumber,
      notes: `فتح بطاقة صيانة وضمان (${newTicket.isUnderWarranty ? 'داخل الضمان' : 'خارج الضمان'}): ${params.faultDescription}`,
    });

    return newTicket;
  };

  const advanceWarrantyTicketStatus = (
    ticketId: string
  ): {
    success: boolean;
    updatedTicket?: WarrantyMaintenanceTicket;
    messageAr?: string;
  } => {
    const target = warrantyTickets.find((t) => t.id === ticketId);
    if (!target || target.status === 'DELIVERED' || target.status === 'REJECTED') {
      return { success: false };
    }

    const flow: WarrantyMaintenanceTicket['status'][] = [
      'RECEIVED',
      'DIAGNOSING',
      'IN_REPAIR',
      'READY',
      'DELIVERED',
    ];
    const currIdx = flow.indexOf(target.status);
    const nextStatus = currIdx >= 0 && currIdx < flow.length - 1 ? flow[currIdx + 1] : 'DELIVERED';

    let journalNo = target.journalEntryNumber;
    if (nextStatus === 'DELIVERED' && target.totalCustomerCharge > 0 && !journalNo) {
      journalNo = `JE-RMA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const charge = target.totalCustomerCharge;
      const rmaJournal: JournalEntry = {
        id: `je-rma-${Date.now()}`,
        tenantId: currentTenant.id,
        entryNumber: journalNo,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'SALES_INVOICE',
        referenceId: target.ticketNumber,
        description: `قيد تحصيل إيرادات صيانة وقطع غيار خارج الضمان للبطاقة (${target.ticketNumber}) - الجهاز: ${target.serialNumber}`,
        lines: [
          {
            id: `jl-rma-1-${Date.now()}`,
            accountId: 'acc-1101',
            accountCode: '1101',
            accountName: 'Cash on Hand',
            accountNameAr: 'النقدية بالصندوق (تحصيل رسوم صيانة)',
            debit: charge,
            credit: 0,
            memo: target.ticketNumber,
          },
          {
            id: `jl-rma-2-${Date.now()}`,
            accountId: 'acc-4101',
            accountCode: '4101',
            accountName: 'Maintenance & After-Sales Revenue',
            accountNameAr: 'إيرادات المبيعات وخدمات الصيانة المعتمدة',
            debit: 0,
            credit: charge,
            memo: `RMA Service ${target.ticketNumber}`,
          },
        ],
        totalDebit: charge,
        totalCredit: charge,
        isPosted: true,
        isReversed: false,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setJournalEntries((prev) => [rmaJournal, ...prev]);
    }

    const updated: WarrantyMaintenanceTicket = {
      ...target,
      status: nextStatus,
      journalEntryNumber: journalNo,
    };

    setWarrantyTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));

    return {
      success: true,
      updatedTicket: updated,
      messageAr: `تم تحديث حالة بطاقة الضمان والصيانة (${target.ticketNumber}) للجهاز (${target.serialNumber}) إلى [${nextStatus}]${journalNo ? ` وترحيل القيد المحاسبي (${journalNo})` : ''}.`,
    };
  };

  const recordCustomerPaymentReceipt = (params: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'POS_CARD';
    referenceNumber?: string;
  }) => {
    const targetCustomer = customers.find((c) => c.id === params.customerId);
    const cleanAmount = Math.round(Math.abs(Number(params.amount) || 0) * 100) / 100;
    if (!targetCustomer || cleanAmount <= 0) {
      return { success: false };
    }

    const refNo =
      params.referenceNumber?.trim() ||
      `RV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const entryNumber = `JE-RV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const journal = createCustomerReceiptJournalEntry({
      customerId: targetCustomer.id,
      customerName: targetCustomer.nameAr || targetCustomer.name,
      amount: cleanAmount,
      paymentMethod: params.paymentMethod,
      referenceNumber: refNo,
      tenantId: currentTenant.id,
      entryNumber,
      operatorName: currentUser.name,
    });

    const newBalance = Math.max(0, Math.round((targetCustomer.balance - cleanAmount) * 100) / 100);
    setCustomers((prev) =>
      prev.map((c) => (c.id === targetCustomer.id ? { ...c, balance: newBalance } : c))
    );
    setJournalEntries((prev) => [journal, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud-rv-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'POST_CUSTOMER_RECEIPT_VOUCHER',
        module: 'ACCOUNTING',
        entityType: 'ReceiptVoucher',
        entityId: refNo,
        details: `Posted Customer Receipt Voucher [${refNo}] for ${targetCustomer.nameAr} (${cleanAmount} ${currency}) via ${params.paymentMethod}. Journal: ${entryNumber}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return {
      success: true,
      entryNumber,
      newBalance,
    };
  };

  const addSalesInvoice = (invData: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'tenantId'>): SalesInvoice => {
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInv: SalesInvoice = {
      ...invData,
      id: `inv-${Date.now()}`,
      tenantId: currentTenant.id,
      invoiceNumber: invNumber,
      qrData: `ZATCA-QR-INVOICE-${invNumber}-TOTAL-${invData.grandTotal}-VAT-${invData.taxAmount}`,
    };

    // Deduct stock & log serialized item sale traceability
    setProducts((prev) =>
      prev.map((prod) => {
        const line = invData.items.find((ci) => ci.productId === prod.id);
        if (line) {
          return { ...prod, stockQty: Math.max(0, prod.stockQty - line.quantity) };
        }
        return prod;
      })
    );

    invData.items.forEach((line) => {
      if (line.serialNumber) {
        addTraceabilityEvent({
          tenantId: currentTenant.id,
          serialNumber: line.serialNumber,
          productName: line.productName,
          eventType: 'SOLD',
          location: currentBranch.nameAr || currentBranch.name,
          operator: currentUser.name,
          referenceDoc: invNumber,
          notes: `مبيعات فاتورة ضريبية (${invNumber}) للعميل: ${invData.customerName}`,
        });
      }
    });

    // Update customer receivable balance when sold on credit or partial payment
    const unpaidDelta = Math.max(0, Math.round(((invData.grandTotal || 0) - (invData.paidAmount || 0)) * 100) / 100);
    if (invData.paymentMethod === 'CREDIT' || unpaidDelta > 0) {
      const addBal = unpaidDelta > 0 ? unpaidDelta : invData.grandTotal;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === invData.customerId
            ? { ...c, balance: Math.round((c.balance + addBal) * 100) / 100 }
            : c
        )
      );
    }

    // Post balanced Revenue + VAT journal AND Perpetual Inventory COGS journal
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const entryNumber = `JE-INV-${year}-${rand}`;
    const journalEntry = createSalesInvoiceJournal(newInv, currentTenant.id, entryNumber);

    const totalCostOfGoods = Math.round(
      invData.items.reduce((sum, line) => {
        const matchedProd = products.find((p) => p.id === line.productId);
        const unitCost = matchedProd?.costPrice || Math.round(line.unitPrice * 0.72 * 100) / 100;
        return sum + unitCost * line.quantity;
      }, 0) * 100
    ) / 100;

    if (totalCostOfGoods > 0) {
      const cogsEntryNumber = `JE-COGS-${year}-${rand}`;
      const cogsJournal = createDeliveryNoteCOGSJournalEntry({
        deliveryNoteNumber: invNumber,
        customerName: newInv.customerName,
        totalCostOfGoods,
        tenantId: currentTenant.id,
        entryNumber: cogsEntryNumber,
        operatorName: currentUser.name,
      });
      setJournalEntries((prev) => [journalEntry, cogsJournal, ...prev]);
    } else {
      setJournalEntries((prev) => [journalEntry, ...prev]);
    }

    setSalesInvoices((prev) => [newInv, ...prev]);
    return newInv;
  };

  const createSalesPipelineDoc = (params: {
    customerId: string;
    productId: string;
    quantity: number;
    paymentMethod: 'CASH' | 'CARD' | 'CREDIT';
    validUntil?: string;
    notes?: string;
  }): SalesPipelineDoc => {
    const customer = customers.find((c) => c.id === params.customerId) || customers[0];
    const product = products.find((p) => p.id === params.productId) || products[0];
    const qty = Math.max(1, Number(params.quantity) || 1);
    const subtotal = Math.round(product.salePrice * qty * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.15 * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
    const quoteNumber = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDoc: SalesPipelineDoc = {
      id: `pipe-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      warehouseId: currentWarehouse.id,
      quoteNumber,
      customerId: customer.id,
      customerName: customer.nameAr || customer.name,
      date: new Date().toISOString().slice(0, 10),
      validUntil:
        params.validUntil ||
        new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      items: [
        {
          productId: product.id,
          productName: product.nameAr || product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice: product.salePrice,
          discount: 0,
          taxRate: 15,
          taxAmount,
          total: grandTotal,
          warrantyMonths: product.warrantyMonths || 24,
        },
      ],
      subtotal,
      discountAmount: 0,
      taxAmount,
      grandTotal,
      paymentMethod: params.paymentMethod,
      stage: 'QUOTATION',
      stockReserved: false,
      stockDeducted: false,
      notes: params.notes || 'عرض سعر تجاري معتمد - خاضع للشروط والأحكام القياسية',
    };

    setSalesPipelineDocs((prev) => [newDoc, ...prev]);
    return newDoc;
  };

  const advancePipelineDoc = (
    docId: string
  ): {
    success: boolean;
    updatedDoc?: SalesPipelineDoc;
    messageAr?: string;
  } => {
    const target = salesPipelineDocs.find((d) => d.id === docId);
    if (!target || target.stage === 'INVOICED' || target.stage === 'CANCELLED') {
      return { success: false };
    }

    const year = new Date().getFullYear();
    const randSuffix = `${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (target.stage === 'QUOTATION') {
      const updated = advanceSalesPipelineDocument(target, {
        targetStage: 'SALES_ORDER',
        generatedNumber: randSuffix,
      });
      setSalesPipelineDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      return {
        success: true,
        updatedDoc: updated,
        messageAr: `تم تحويل عرض السعر (${target.quoteNumber}) إلى أمر بيع مؤكد (${updated.salesOrderNumber}) وحجز الكميات بالمستودع.`,
      };
    }

    if (target.stage === 'SALES_ORDER') {
      const cogsEntryNo = `JE-DN-${randSuffix}`;
      const updated = advanceSalesPipelineDocument(target, {
        targetStage: 'DELIVERY_NOTE',
        generatedNumber: randSuffix,
        cogsJournalNumber: cogsEntryNo,
      });

      // Deduct physical stock & compute WAC cost
      let totalCost = 0;
      setProducts((prev) =>
        prev.map((prod) => {
          const item = target.items.find((i) => i.productId === prod.id);
          if (item) {
            totalCost += (prod.costPrice || prod.salePrice * 0.65) * item.quantity;
            return {
              ...prod,
              stockQty: Math.max(0, prod.stockQty - item.quantity),
            };
          }
          return prod;
        })
      );

      const fallbackCost =
        totalCost > 0
          ? totalCost
          : target.items.reduce((s, i) => s + i.unitPrice * 0.65 * i.quantity, 0);

      const cogsJournal = createDeliveryNoteCOGSJournalEntry({
        deliveryNoteNumber: updated.deliveryNoteNumber || `DN-${randSuffix}`,
        customerName: target.customerName,
        totalCostOfGoods: fallbackCost,
        tenantId: currentTenant.id,
        entryNumber: cogsEntryNo,
        operatorName: currentUser.name,
      });

      setJournalEntries((prev) => [cogsJournal, ...prev]);
      setSalesPipelineDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));

      return {
        success: true,
        updatedDoc: updated,
        messageAr: `تم إصدار إشعار التسليم المخزني (${updated.deliveryNoteNumber}) وصرف البضاعة وترحيل قيد تكلفة المبيعات (${cogsEntryNo}).`,
      };
    }

    if (target.stage === 'DELIVERY_NOTE') {
      const invNumber = `INV-${randSuffix}`;
      const newInv: SalesInvoice = {
        id: `inv-${Date.now()}`,
        tenantId: currentTenant.id,
        invoiceNumber: invNumber,
        customerId: target.customerId,
        customerName: target.customerName,
        branchId: target.branchId,
        date: new Date().toISOString().slice(0, 10),
        items: target.items,
        subtotal: target.subtotal,
        discountAmount: target.discountAmount,
        taxAmount: target.taxAmount,
        grandTotal: target.grandTotal,
        paidAmount: target.paymentMethod === 'CREDIT' ? 0 : target.grandTotal,
        paymentMethod: target.paymentMethod,
        status: target.paymentMethod === 'CREDIT' ? 'PARTIAL' : 'PAID',
        qrData: `ZATCA-QR-INVOICE-${invNumber}-TOTAL-${target.grandTotal}-VAT-${target.taxAmount}`,
        industryMode: activeIndustry,
        notes: `صادرة من إشعار تسليم (${target.deliveryNoteNumber}) وأمر بيع (${target.salesOrderNumber})`,
      };

      const jeNumber = `JE-INV-${randSuffix}`;
      const revJournal = createSalesInvoiceJournal(newInv, currentTenant.id, jeNumber);

      if (target.paymentMethod === 'CREDIT') {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === target.customerId
              ? { ...c, balance: Math.round((c.balance + target.grandTotal) * 100) / 100 }
              : c
          )
        );
      }

      const updated = advanceSalesPipelineDocument(target, {
        targetStage: 'INVOICED',
        linkedInvoiceId: newInv.id,
        linkedInvoiceNumber: newInv.invoiceNumber,
      });

      setSalesInvoices((prev) => [newInv, ...prev]);
      setJournalEntries((prev) => [revJournal, ...prev]);
      setSalesPipelineDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));

      return {
        success: true,
        updatedDoc: updated,
        messageAr: `تم تحويل إشعار التسليم إلى فاتورة ضريبية معتمدة (${newInv.invoiceNumber}) وترحيل قيد الإيرادات والضريبة (${jeNumber}) بنجاح!`,
      };
    }

    return { success: false };
  };

  // POS Cart
  const addToPOSCart = (product: Product, quantity = 1, customNotes?: string) => {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => {
          if (item.productId === product.id) {
            const newQty = Math.round((item.quantity + quantity) * 1000) / 1000;
            const sub = newQty * item.unitPrice - item.discount;
            const tax = Math.round(sub * item.taxRate * 100) / 100;
            return {
              ...item,
              quantity: newQty,
              taxAmount: tax,
              total: sub + tax,
              kitchenNotes: customNotes || item.kitchenNotes,
            };
          }
          return item;
        });
      }

      const sub = quantity * product.salePrice;
      const tax = Math.round(sub * product.taxRate * 100) / 100;
      const autoSerial = product.hasSerials
        ? generateUniqueSerialNumber('IMEI', currentTenant.code)
        : undefined;

      return [
        ...prev,
        {
          productId: product.id,
          productName: language === 'ar' ? product.nameAr : product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity,
          unitPrice: product.salePrice,
          discount: 0,
          taxRate: product.taxRate,
          taxAmount: tax,
          total: sub + tax,
          serialNumber: autoSerial,
          warrantyMonths: product.warrantyMonths,
          batchNumber: product.batchNumber,
          expiryDate: product.expiryDate,
          kitchenNotes: customNotes,
        },
      ];
    });
  };

  const addSolarSystemKitToPOSCart = (
    sizing: SolarSystemSizingOutput
  ): { addedItemsCount: number; totalAmount: number } => {
    const panelProd =
      products.find((p) => p.sku === 'SOL-PNL-585W') ||
      products.find((p) => p.subCategory === 'SOLAR_PANEL');
    const inverterProd =
      sizing.recommendedInverterKw >= 8
        ? products.find((p) => p.sku === 'SOL-INV-DEYE8K') ||
          products.find((p) => p.subCategory === 'HYBRID_INVERTER')
        : products.find((p) => p.sku === 'SOL-INV-GROW5K') ||
          products.find((p) => p.subCategory === 'HYBRID_INVERTER');
    const batteryProd =
      sizing.recommendedBatteryUnitSpec.includes('LiFePO4') &&
      products.find((p) => p.sku === 'BAT-LI-48V200')
        ? products.find((p) => p.sku === 'BAT-LI-48V200')
        : products.find((p) => p.sku === 'BAT-GEL-12V200') ||
          products.find((p) => p.subCategory === 'LITHIUM_BATTERY');
    const protectionKit = products.find((p) => p.sku === 'SOL-ACC-DCKIT');

    let addedCount = 0;
    let totalAmount = 0;

    if (panelProd) {
      addToPOSCart(
        panelProd,
        sizing.recommendedPanelCount,
        `مصفوفة ألواح شمسية (${sizing.requiredSolarArrayKwp} kWp)`
      );
      addedCount += sizing.recommendedPanelCount;
      totalAmount += panelProd.salePrice * sizing.recommendedPanelCount * 1.15;
    }
    if (inverterProd) {
      addToPOSCart(
        inverterProd,
        1,
        `إنفرتر هجين معتمد (${sizing.recommendedInverterKw} kW)`
      );
      addedCount += 1;
      totalAmount += inverterProd.salePrice * 1.15;
    }
    if (batteryProd) {
      addToPOSCart(
        batteryProd,
        sizing.recommendedBatteryUnits,
        `بنك بطاريات تخزين (${sizing.requiredBatteryStorageKwh} kWh)`
      );
      addedCount += sizing.recommendedBatteryUnits;
      totalAmount += batteryProd.salePrice * sizing.recommendedBatteryUnits * 1.15;
    }
    if (protectionKit) {
      addToPOSCart(protectionKit, 1, 'لوحة حماية DC قواطع ومانع صواعق وكوابل');
      addedCount += 1;
      totalAmount += protectionKit.salePrice * 1.15;
    }

    return {
      addedItemsCount: addedCount,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  };

  const removeFromPOSCart = (productId: string) => {
    setPosCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updatePOSCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromPOSCart(productId);
      return;
    }
    setPosCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const roundedQty = Math.round(qty * 1000) / 1000;
          const sub = roundedQty * item.unitPrice - item.discount;
          const tax = Math.round(sub * item.taxRate * 100) / 100;
          return { ...item, quantity: roundedQty, taxAmount: tax, total: sub + tax };
        }
        return item;
      })
    );
  };

  const updatePOSCartItemMeta = (productId: string, patch: Partial<InvoiceItem>) => {
    setPosCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const merged = { ...item, ...patch };
        const sub = merged.quantity * merged.unitPrice - merged.discount;
        const tax = Math.round(sub * merged.taxRate * 100) / 100;
        return { ...merged, taxAmount: tax, total: Math.max(0, sub + tax) };
      })
    );
  };

  const clearPOSCart = () => {
    setPosCart([]);
  };

  const holdCurrentPOSBill = (customerName = 'POS Customer', tableNumber?: string) => {
    if (posCart.length === 0) return;
    const holdBill: POSHoldBill = {
      id: `hold-${Date.now()}`,
      orderNumber: `HLD-${Math.floor(100 + Math.random() * 900)}`,
      customerName,
      tableNumber,
      items: [...posCart],
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHoldBills((prev) => [holdBill, ...prev]);
    clearPOSCart();
  };

  const resumePOSBill = (billId: string) => {
    const bill = holdBills.find((b) => b.id === billId);
    if (!bill) return;
    setPosCart(bill.items);
    setHoldBills((prev) => prev.filter((b) => b.id !== billId));
  };

  const sendCartToKitchen = (tableNumber: string, orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'): KitchenOrderTicket | null => {
    if (posCart.length === 0) return null;
    const kot: KitchenOrderTicket = {
      id: `kot-${Date.now()}`,
      kotNumber: `KOT-${Math.floor(100 + Math.random() * 900)}`,
      tableNumber: orderType === 'DINE_IN' ? tableNumber : undefined,
      orderType,
      items: posCart.map((i) => ({
        name: i.productName,
        qty: i.quantity,
        notes: i.kitchenNotes,
      })),
      status: 'PREPARING',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setKitchenTickets((prev) => [kot, ...prev]);
    return kot;
  };

  const advanceKitchenTicket = (id: string) => {
    setKitchenTickets((prev) =>
      prev.map((k) => {
        if (k.id !== id) return k;
        const next = k.status === 'PREPARING' ? 'READY' : 'SERVED';
        return { ...k, status: next };
      })
    );
  };

  // Complete POS Checkout
  const checkoutPOS = (
    paymentMethod: 'CASH' | 'CARD' | 'SPLIT',
    customerId = 'cust-pos-walkin',
    extraMeta?: {
      orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD';
      tableNumber?: string;
      notes?: string;
      couponCode?: string;
    }
  ): SalesInvoice => {
    if (posCart.length === 0) throw new Error('Cart is empty');

    const subtotal = posCart.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
    const lineDiscounts = posCart.reduce((acc, curr) => acc + curr.discount, 0);

    let couponDiscount = 0;
    let appliedCouponCode: string | undefined;
    if (extraMeta?.couponCode) {
      const cpnEval = validateAndCalculateCouponDiscount({
        code: extraMeta.couponCode,
        coupons: promoCoupons,
        subtotalAmount: Math.max(0, subtotal - lineDiscounts),
        activeIndustry,
      });
      if (cpnEval.valid && cpnEval.discountAmount > 0 && cpnEval.coupon) {
        couponDiscount = cpnEval.discountAmount;
        appliedCouponCode = cpnEval.coupon.code;
        setPromoCoupons((prev) =>
          prev.map((c) =>
            c.id === cpnEval.coupon!.id ? { ...c, usedCount: c.usedCount + 1 } : c
          )
        );
      }
    }

    const discountAmount = Math.round((lineDiscounts + couponDiscount) * 100) / 100;
    const netTaxable = Math.max(0, subtotal - discountAmount);
    const avgTaxRate = posCart[0]?.taxRate ?? 0.15;
    const taxAmount = Math.round(netTaxable * avgTaxRate * 100) / 100;
    const grandTotal = Math.round((netTaxable + taxAmount) * 100) / 100;
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const targetCustomer = customers.find((c) => c.id === customerId) || customers[2] || customers[0];

    const invoice: SalesInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: currentTenant.id,
      invoiceNumber: invNumber,
      customerId: targetCustomer.id,
      customerName: language === 'ar' ? targetCustomer.nameAr : targetCustomer.name,
      branchId: currentBranch.id,
      date: new Date().toISOString().split('T')[0],
      items: [...posCart],
      subtotal,
      discountAmount,
      couponCode: appliedCouponCode,
      couponDiscountAmount: couponDiscount > 0 ? couponDiscount : undefined,
      taxAmount,
      grandTotal,
      paidAmount: grandTotal,
      paymentMethod,
      status: 'PAID',
      qrData: `GLOBAL-TAX-QR-${invNumber}-TOTAL-${grandTotal}-TAX-${taxAmount}`,
      notes:
        extraMeta?.notes ||
        (appliedCouponCode
          ? `Completed via POS Register (Coupon: ${appliedCouponCode})`
          : 'Completed via POS Register'),
      industryMode: activeIndustry,
      orderType: extraMeta?.orderType || 'STANDARD',
      tableNumber: extraMeta?.tableNumber,
    };

    setProducts((prev) =>
      prev.map((prod) => {
        const cartItem = posCart.find((ci) => ci.productId === prod.id);
        if (cartItem) {
          return { ...prod, stockQty: Math.max(0, Math.round((prod.stockQty - cartItem.quantity) * 100) / 100) };
        }
        return prod;
      })
    );

    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const entryNumber = `JE-POS-${year}-${rand}`;
    const journalEntry = createSalesInvoiceJournal(invoice, currentTenant.id, entryNumber);

    const totalPosCogs = Math.round(
      posCart.reduce((sum, item) => {
        const matchedProd = products.find((p) => p.id === item.productId);
        const unitCost = matchedProd?.costPrice || Math.round(item.unitPrice * 0.72 * 100) / 100;
        return sum + unitCost * item.quantity;
      }, 0) * 100
    ) / 100;

    if (totalPosCogs > 0) {
      const cogsEntryNumber = `JE-POS-COGS-${year}-${rand}`;
      const cogsJournal = createDeliveryNoteCOGSJournalEntry({
        deliveryNoteNumber: invNumber,
        customerName: invoice.customerName,
        totalCostOfGoods: totalPosCogs,
        tenantId: currentTenant.id,
        entryNumber: cogsEntryNumber,
        operatorName: currentUser.name,
      });
      setJournalEntries((prev) => [journalEntry, cogsJournal, ...prev]);
    } else {
      setJournalEntries((prev) => [journalEntry, ...prev]);
    }

    setCurrentShift((prev) => ({
      ...prev,
      cashSales: paymentMethod === 'CASH' ? prev.cashSales + grandTotal : prev.cashSales,
      cardSales: paymentMethod === 'CARD' ? prev.cardSales + grandTotal : prev.cardSales,
      totalSales: prev.totalSales + grandTotal,
      expectedCash: paymentMethod === 'CASH' ? prev.expectedCash + grandTotal : prev.expectedCash,
    }));

    setSalesInvoices((prev) => [invoice, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'POS_CHECKOUT',
        module: 'POS',
        entityType: 'SalesInvoice',
        entityId: invoice.id,
        details: `POS transaction ${invNumber} for ${grandTotal.toFixed(2)} ${currency} (${paymentMethod}) in [${activeIndustry}] mode.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    clearPOSCart();
    return invoice;
  };

  const closePOSShift = (actualCount: number) => {
    setCurrentShift((prev) => ({
      ...prev,
      endTime: new Date().toISOString(),
      actualClosingCash: actualCount,
      discrepancy: actualCount - prev.expectedCash,
      status: 'CLOSED',
    }));
  };

  // Accounting Manual Journal
  const addManualJournalEntry = (entry: {
    description: string;
    lines: { accountId: string; debit: number; credit: number; memo?: string }[];
  }) => {
    const mappedLines = entry.lines.map((l, idx) => {
      const acc = chartAccounts.find((a) => a.id === l.accountId);
      return {
        id: `jl-${Date.now()}-${idx}`,
        accountId: l.accountId,
        accountCode: acc ? acc.code : '9999',
        accountName: acc ? acc.name : 'Unknown Account',
        accountNameAr: acc ? acc.nameAr : 'حساب غير معروف',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        memo: l.memo,
      };
    });

    const check = validateJournalBalance(mappedLines);
    if (!check.isValid) {
      return { success: false, error: check.errorMessage };
    }

    const entryNumber = `JE-MAN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newEntry: JournalEntry = {
      id: `je-${Date.now()}`,
      tenantId: currentTenant.id,
      entryNumber,
      date: new Date().toISOString().split('T')[0],
      referenceType: 'MANUAL',
      description: entry.description,
      lines: mappedLines,
      totalDebit: check.totalDebit,
      totalCredit: check.totalCredit,
      isPosted: true,
      isReversed: false,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    setJournalEntries((prev) => [newEntry, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'POST_MANUAL_JOURNAL',
        module: 'ACCOUNTING',
        entityType: 'JournalEntry',
        entityId: newEntry.id,
        details: `Posted balanced manual journal ${entryNumber} totaling ${check.totalDebit} ${currency}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true };
  };

  const reverseJournalEntry = (entryId: string, reason: string) => {
    const original = journalEntries.find((j) => j.id === entryId);
    if (!original) return { success: false, error: 'Entry not found' };

    try {
      const revNumber = `REV-${original.entryNumber}`;
      const reversal = createReversingJournalEntry(original, reason, revNumber, currentUser.name);

      setJournalEntries((prev) => [
        reversal,
        ...prev.map((j) => (j.id === entryId ? { ...j, isReversed: true, reversedByEntryId: reversal.id } : j)),
      ]);

      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'REVERSE_JOURNAL',
          module: 'ACCOUNTING',
          entityType: 'JournalEntry',
          entityId: reversal.id,
          details: `Reversed journal ${original.entryNumber} via reversal entry ${revNumber}. Reason: ${reason}.`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Bank Reconciliation, PDC & Multi-Currency Handlers
  const addBankStatementLine = (line: Omit<BankStatementLine, 'id' | 'tenantId'>) => {
    const newLine: BankStatementLine = {
      ...line,
      id: `bs-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setBankStatementLines((prev) => [newLine, ...prev]);
  };

  const reconcileBankStatementLine = (lineId: string) => {
    const target = bankStatementLines.find((l) => l.id === lineId);
    if (!target || target.status !== 'UNRECONCILED') return;

    const absAmt = Math.round(Math.abs(target.amount) * 100) / 100;
    const entryNumber = `JE-BNK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (absAmt > 0) {
      const isDeposit = target.amount > 0;
      const reconJournal: JournalEntry = {
        id: `je-bnk-${Date.now()}`,
        tenantId: currentTenant.id,
        entryNumber,
        date: target.date,
        referenceType: 'MANUAL',
        referenceId: target.id,
        description: `قيد تسوية ومطابقة كشف البنك (${target.reference}): ${target.descriptionAr}`,
        lines: isDeposit
          ? [
              {
                id: `jl-bnk-1-${Date.now()}`,
                accountId: 'acc-1102',
                accountCode: '1102',
                accountName: 'Bank Account',
                accountNameAr: 'البنك (إيداع مطابق من كشف الحساب)',
                debit: absAmt,
                credit: 0,
                memo: target.reference,
              },
              {
                id: `jl-bnk-2-${Date.now()}`,
                accountId: 'acc-1201',
                accountCode: '1201',
                accountName: 'Accounts Receivable',
                accountNameAr: 'العملاء (تحصيل إيداع بنكي)',
                debit: 0,
                credit: absAmt,
                memo: target.descriptionAr,
              },
            ]
          : [
              {
                id: `jl-bnk-1-${Date.now()}`,
                accountId: 'acc-5202',
                accountCode: '5202',
                accountName: 'Bank Charges & Admin Expenses',
                accountNameAr: 'مصروفات وعمولات بنكية وإدارية',
                debit: absAmt,
                credit: 0,
                memo: target.descriptionAr,
              },
              {
                id: `jl-bnk-2-${Date.now()}`,
                accountId: 'acc-1102',
                accountCode: '1102',
                accountName: 'Bank Account',
                accountNameAr: 'البنك (خصم عمولات كشف الحساب)',
                debit: 0,
                credit: absAmt,
                memo: target.reference,
              },
            ],
        totalDebit: absAmt,
        totalCredit: absAmt,
        isPosted: true,
        isReversed: false,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setJournalEntries((prev) => [reconJournal, ...prev]);
    }

    setBankStatementLines((prev) =>
      prev.map((l) =>
        l.id === lineId ? { ...l, status: 'ADJUSTED', matchedJournalEntryId: entryNumber } : l
      )
    );
  };

  const addPostDatedCheck = (check: Omit<PostDatedCheck, 'id' | 'tenantId' | 'status'>) => {
    const newCheck: PostDatedCheck = {
      ...check,
      id: `pdc-${Date.now()}`,
      tenantId: currentTenant.id,
      status: 'UNDER_COLLECTION',
    };
    setPostDatedChecks((prev) => [newCheck, ...prev]);
  };

  const clearPostDatedCheck = (checkId: string): { success: boolean; entryNumber?: string } => {
    const target = postDatedChecks.find((c) => c.id === checkId);
    if (!target || target.status === 'CLEARED') return { success: false };

    const entryNumber = `JE-PDC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const journal = createPDCClearingJournalEntry(
      target,
      currentTenant.id,
      entryNumber,
      currentUser.name
    );

    setJournalEntries((prev) => [journal, ...prev]);
    setPostDatedChecks((prev) =>
      prev.map((c) =>
        c.id === checkId ? { ...c, status: 'CLEARED', journalEntryId: journal.id } : c
      )
    );

    return { success: true, entryNumber };
  };

  const bouncePostDatedCheck = (checkId: string) => {
    setPostDatedChecks((prev) =>
      prev.map((c) => (c.id === checkId ? { ...c, status: 'BOUNCED' } : c))
    );
  };

  const updateExchangeRate = (
    targetCurrency: Currency,
    newRateToSAR: number,
    newForeignBalance?: number
  ) => {
    setExchangeRates((prev) =>
      prev.map((r) => {
        if (r.currency !== targetCurrency) return r;
        return {
          ...r,
          previousRateToSAR: r.rateToSAR,
          rateToSAR: Math.max(0.0001, Number(newRateToSAR) || r.rateToSAR),
          foreignMonetaryBalance:
            newForeignBalance !== undefined ? Math.max(0, newForeignBalance) : r.foreignMonetaryBalance,
          lastUpdated: new Date().toISOString().slice(0, 10),
        };
      })
    );
  };

  const postFXRevaluationEntry = (): {
    success: boolean;
    netGainLossSAR: number;
    entryNumber?: string;
  } => {
    const fxCalc = calculateFXRevaluation(exchangeRates);
    if (Math.abs(fxCalc.netGainLossSAR) < 0.01) {
      return { success: false, netGainLossSAR: 0 };
    }
    const entryNumber = `JE-FX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fxEntry = createFXRevaluationJournalEntry(
      fxCalc.netGainLossSAR,
      currentTenant.id,
      entryNumber,
      currentUser.name
    );
    setJournalEntries((prev) => [fxEntry, ...prev]);
    setExchangeRates((prev) =>
      prev.map((r) => ({ ...r, previousRateToSAR: r.rateToSAR }))
    );
    return { success: true, netGainLossSAR: fxCalc.netGainLossSAR, entryNumber };
  };

  const updateCostCenterBudgetCap = (
    costCenterCode: string,
    newAllocatedBudget: number
  ) => {
    const cleanCap = Math.max(1000, Math.round(Number(newAllocatedBudget) || 0));
    setCostCenterBudgets((prev) =>
      prev.map((b) =>
        b.costCenterCode === costCenterCode ? { ...b, allocatedBudget: cleanCap } : b
      )
    );
  };

  const postCostCenterExpense = (params: {
    costCenterCode: string;
    expenseAccountCode: string;
    amount: number;
    paymentMethod: 'BANK' | 'CASH';
    description: string;
  }): { success: boolean; entryNumber?: string } => {
    const targetCC = costCenterBudgets.find(
      (b) => b.costCenterCode === params.costCenterCode
    );
    const cleanAmount = Math.round(Math.abs(Number(params.amount) || 0) * 100) / 100;
    if (!targetCC || cleanAmount <= 0) {
      return { success: false };
    }

    const expAccount = chartAccounts.find((a) => a.code === params.expenseAccountCode);
    const entryNumber = `JE-CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const journal = createCostCenterExpenseJournalEntry({
      costCenterCode: targetCC.costCenterCode,
      costCenterNameAr: targetCC.costCenterNameAr,
      expenseAccountCode: params.expenseAccountCode,
      expenseAccountNameAr: expAccount?.nameAr || 'مصروفات تشغيلية وإدارية',
      amount: cleanAmount,
      paymentMethod: params.paymentMethod,
      description: params.description,
      tenantId: currentTenant.id,
      entryNumber,
      operatorName: currentUser.name,
    });

    setJournalEntries((prev) => [journal, ...prev]);
    return { success: true, entryNumber };
  };

  // CRM, E-Commerce, Workflow & Business Module Actions
  const addTenant = (tData: Omit<Tenant, 'id' | 'createdAt' | 'activeModules'>) => {
    const newTenant: Tenant = {
      ...tData,
      id: `ten-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      activeModules: [...ALL_ERP_MODULES],
    };
    setTenants((prev) => [...prev, newTenant]);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'PROVISION_NEW_TENANT',
        module: 'SAAS',
        entityType: 'Tenant',
        entityId: newTenant.code,
        details: `Provisioned new enterprise tenant [${newTenant.legalName}] (${newTenant.code}) on plan [${newTenant.planId}].`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const addSupplier = (s: Omit<Supplier, 'id' | 'tenantId'>) => {
    const newSup: Supplier = {
      ...s,
      id: `sup-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setSuppliers((prev) => [newSup, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE_SUPPLIER',
        module: 'PURCHASING',
        entityType: 'Supplier',
        entityId: newSup.id,
        details: `Registered new approved supplier [${newSup.nameAr}] with VAT [${newSup.taxNumber}].`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const applyLandedCostToProducts = (
    allocations: { productId: string; newEffectiveUnitCost: number }[]
  ): { success: boolean; entryNumber?: string; totalCapitalized?: number } => {
    let totalCapitalized = 0;
    allocations.forEach((alloc) => {
      const prod = products.find((p) => p.id === alloc.productId);
      if (prod && alloc.newEffectiveUnitCost > prod.costPrice) {
        totalCapitalized += (alloc.newEffectiveUnitCost - prod.costPrice) * prod.stockQty;
      }
    });
    const cleanCapitalized = Math.round(totalCapitalized * 100) / 100;

    setProducts((prev) =>
      prev.map((prod) => {
        const match = allocations.find((a) => a.productId === prod.id);
        return match ? { ...prod, costPrice: match.newEffectiveUnitCost } : prod;
      })
    );

    let entryNumber: string | undefined;
    if (cleanCapitalized > 0) {
      entryNumber = `JE-LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const lcJournal: JournalEntry = {
        id: `je-lc-${Date.now()}`,
        tenantId: currentTenant.id,
        entryNumber,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'STOCK_MOVE',
        description: `قيد رسملة التكاليف الإضافية للشحن والجمارك (Landed Cost Capitalization) وتحديث WAC`,
        lines: [
          {
            id: `jl-lc-1-${Date.now()}`,
            accountId: 'acc-1104',
            accountCode: '1104',
            accountName: 'Merchandise Inventory (Landed Cost)',
            accountNameAr: 'المخزون السلعي (رسملة شحن وجمارك وتأمين)',
            debit: cleanCapitalized,
            credit: 0,
            memo: `Landed cost WAC capitalization (${allocations.length} items)`,
          },
          {
            id: `jl-lc-2-${Date.now()}`,
            accountId: 'acc-1102',
            accountCode: '1102',
            accountName: 'Bank Account',
            accountNameAr: 'البنك الجارٍ (سداد مصاريف تخليص وشحن)',
            debit: 0,
            credit: cleanCapitalized,
            memo: 'Freight, customs & insurance settlement',
          },
        ],
        totalDebit: cleanCapitalized,
        totalCredit: cleanCapitalized,
        isPosted: true,
        isReversed: false,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setJournalEntries((prev) => [lcJournal, ...prev]);
    }

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'APPLY_LANDED_COST_WAC',
        module: 'PURCHASING',
        entityType: 'LandedCost',
        entityId: entryNumber || `LC-${Date.now()}`,
        details: `Applied landed cost allocation to ${allocations.length} inventory SKUs (+${cleanCapitalized} ${currency}) and updated Weighted Average Cost (WAC).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true, entryNumber, totalCapitalized: cleanCapitalized };
  };

  const addChartAccount = (acc: Omit<ChartAccount, 'id' | 'tenantId'>) => {
    const newAcc: ChartAccount = {
      ...acc,
      id: `acc-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setChartAccounts((prev) => [...prev, newAcc].sort((a, b) => a.code.localeCompare(b.code)));
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE_COA_ACCOUNT',
        module: 'ACCOUNTING',
        entityType: 'ChartAccount',
        entityId: newAcc.code,
        details: `Added account [${newAcc.code} - ${newAcc.nameAr}] (${newAcc.type}) to Chart of Accounts.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const addEmployee = (emp: Omit<Employee, 'id' | 'tenantId'>) => {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setEmployees((prev) => [newEmp, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'HIRE_EMPLOYEE',
        module: 'HR',
        entityType: 'Employee',
        entityId: newEmp.employeeCode,
        details: `Added employee [${newEmp.fullNameAr}] (${newEmp.position}) in [${newEmp.department}].`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const runMonthlyPayroll = (monthLabel: string) => {
    const activeEmps = employees.filter((e) => e.status === 'ACTIVE');
    const totalPayroll = activeEmps.reduce(
      (sum, e) => sum + e.basicSalary + e.housingAllowance + e.transportAllowance,
      0
    );
    const entryNumber = `JE-PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payrollEntry: JournalEntry = {
      id: `je-pay-${Date.now()}`,
      tenantId: currentTenant.id,
      entryNumber,
      date: new Date().toISOString().slice(0, 10),
      referenceType: 'PAYROLL',
      description: `مسير رواتب وأجور الموظفين لشهر ${monthLabel} (${activeEmps.length} موظف)`,
      lines: [
        {
          id: `jl-pay-1-${Date.now()}`,
          accountId: 'acc-5201',
          accountCode: '5201',
          accountName: 'Salaries & Wages Expense',
          accountNameAr: 'مصروف الرواتب والأجور والبدلات',
          debit: totalPayroll,
          credit: 0,
          memo: `Payroll expense for ${monthLabel}`,
        },
        {
          id: `jl-pay-2-${Date.now()}`,
          accountId: 'acc-1102',
          accountCode: '1102',
          accountName: 'Bank Account',
          accountNameAr: 'البنك (تحويل رواتب WPS)',
          debit: 0,
          credit: totalPayroll,
          memo: `WPS Bank transfer for ${monthLabel}`,
        },
      ],
      totalDebit: totalPayroll,
      totalCredit: totalPayroll,
      isPosted: true,
      isReversed: false,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
    };
    setJournalEntries((prev) => [payrollEntry, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'POST_MONTHLY_PAYROLL',
        module: 'HR',
        entityType: 'PayrollRun',
        entityId: entryNumber,
        details: `Disbursed and posted balanced payroll run for [${monthLabel}] totaling ${totalPayroll.toLocaleString()} ${currency} across ${activeEmps.length} employees.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    return { totalPayroll, employeesPaid: activeEmps.length };
  };

  const addFixedAsset = (ast: Omit<FixedAsset, 'id' | 'tenantId'>) => {
    const newAst: FixedAsset = {
      ...ast,
      id: `ast-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setFixedAssets((prev) => [newAst, ...prev]);
  };

  const runAssetDepreciationCycle = () => {
    let totalDepreciated = 0;
    const updatedAssets = fixedAssets.map((ast) => {
      const calc = calculateAssetDepreciation({
        purchaseCost: ast.purchaseCost,
        salvageValue: ast.salvageValue,
        usefulLifeYears: ast.usefulLifeYears,
        accumulatedDepreciation: ast.accumulatedDepreciation,
      });
      const diff = Math.max(0, calc.newAccumulatedDepreciation - ast.accumulatedDepreciation);
      totalDepreciated += diff;
      return {
        ...ast,
        accumulatedDepreciation: calc.newAccumulatedDepreciation,
        currentBookValue: calc.newBookValue,
      };
    });
    setFixedAssets(updatedAssets);

    if (totalDepreciated > 0) {
      const roundedDep = Math.round(totalDepreciated * 100) / 100;
      const entryNumber = `JE-DEP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const depEntry: JournalEntry = {
        id: `je-dep-${Date.now()}`,
        tenantId: currentTenant.id,
        entryNumber,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'DEPRECIATION',
        description: `قيد إهلاك الأصول الثابتة الدوري (القسط الثابت Straight-Line)`,
        lines: [
          {
            id: `jl-dep-1-${Date.now()}`,
            accountId: 'acc-5301',
            accountCode: '5301',
            accountName: 'Depreciation Expense',
            accountNameAr: 'مصروف إهلاك الأصول الثابتة',
            debit: roundedDep,
            credit: 0,
            memo: 'Periodic straight-line asset depreciation',
          },
          {
            id: `jl-dep-2-${Date.now()}`,
            accountId: 'acc-1301',
            accountCode: '1301',
            accountName: 'Accumulated Depreciation',
            accountNameAr: 'مجمع إهلاك الأصول الثابتة',
            debit: 0,
            credit: roundedDep,
            memo: 'Accumulated depreciation reserve',
          },
        ],
        totalDebit: roundedDep,
        totalCredit: roundedDep,
        isPosted: true,
        isReversed: false,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setJournalEntries((prev) => [depEntry, ...prev]);
    }
    return { totalDepreciated: Math.round(totalDepreciated * 100) / 100, assetsCount: fixedAssets.length };
  };

  const addProductionOrder = (po: Omit<ProductionOrder, 'id' | 'tenantId' | 'orderNumber'>) => {
    const newOrder: ProductionOrder = {
      ...po,
      id: `mo-${Date.now()}`,
      tenantId: currentTenant.id,
      orderNumber: `MO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    };
    setProductionOrders((prev) => [newOrder, ...prev]);
  };

  const advanceProductionOrder = (orderId: string) => {
    const targetMo = productionOrders.find((m) => m.id === orderId);
    if (!targetMo || targetMo.status === 'COMPLETED') return;

    const step = Math.max(1, Math.ceil(targetMo.targetQuantity * 0.25));
    const nextCompleted = Math.min(targetMo.targetQuantity, targetMo.completedQuantity + step);
    const actualDeltaQty = Math.max(0, nextCompleted - targetMo.completedQuantity);
    const nextStatus: ProductionOrder['status'] =
      nextCompleted >= targetMo.targetQuantity ? 'COMPLETED' : 'IN_PRODUCTION';

    setProductionOrders((prev) =>
      prev.map((mo) =>
        mo.id === orderId
          ? { ...mo, completedQuantity: nextCompleted, status: nextStatus }
          : mo
      )
    );

    if (actualDeltaQty > 0) {
      const matchedBom = boms.find((b) => b.id === targetMo.bomId) || boms[0];
      const unitMfgCost = matchedBom
        ? matchedBom.totalCostPerUnit ||
          matchedBom.items.reduce((s, c) => s + c.quantityRequired * c.unitCost, 0) +
            matchedBom.laborCost +
            matchedBom.overheadCost
        : 1200;
      const batchMfgCost = Math.round(unitMfgCost * actualDeltaQty * 100) / 100;
      const entryNumber = `JE-MFG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const mfgEntry: JournalEntry = {
        id: `je-mfg-${Date.now()}`,
        tenantId: currentTenant.id,
        entryNumber,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'STOCK_MOVE',
        referenceId: targetMo.orderNumber,
        description: `قيد تكلفة إنتاج وتصنيع دفعة (${actualDeltaQty} وحدة) لأمر الإنتاج [${targetMo.orderNumber} - ${targetMo.finishedProductName}]`,
        lines: [
          {
            id: `jl-mfg-1-${Date.now()}`,
            accountId: 'acc-1104',
            accountCode: '1104',
            accountName: 'Finished Goods Inventory',
            accountNameAr: 'المخزون السلعي والتام الصنع (إنتاج تام)',
            debit: batchMfgCost,
            credit: 0,
            memo: `Finished output +${actualDeltaQty} units (${targetMo.orderNumber})`,
          },
          {
            id: `jl-mfg-2-${Date.now()}`,
            accountId: 'acc-1102',
            accountCode: '1102',
            accountName: 'Bank / Manufacturing Clearing',
            accountNameAr: 'البنك وتكاليف التشغيل الصناعي المباشرة',
            debit: 0,
            credit: batchMfgCost,
            memo: `BOM components & direct labor absorption (${targetMo.orderNumber})`,
          },
        ],
        totalDebit: batchMfgCost,
        totalCredit: batchMfgCost,
        isPosted: true,
        isReversed: false,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };
      setJournalEntries((prev) => [mfgEntry, ...prev]);
    }
  };

  const addProject = (prj: Omit<Project, 'id' | 'tenantId'>) => {
    const newPrj: Project = {
      ...prj,
      id: `prj-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setProjects((prev) => [newPrj, ...prev]);
  };

  const advanceProjectProgress = (projectId: string) => {
    const targetPrj = projects.find((p) => p.id === projectId);
    if (!targetPrj || targetPrj.status === 'COMPLETED') return;

    const nextPct = Math.min(100, targetPrj.progressPercent + 10);
    const nextSpent = Math.min(
      targetPrj.budget,
      Math.round(targetPrj.spentCost + targetPrj.budget * 0.08)
    );
    const deltaSpent = Math.max(0, nextSpent - targetPrj.spentCost);

    setProjects((prev) =>
      prev.map((prj) =>
        prj.id === projectId
          ? {
              ...prj,
              progressPercent: nextPct,
              spentCost: nextSpent,
              status: nextPct >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
            }
          : prj
      )
    );

    if (deltaSpent > 0) {
      const entryNumber = `JE-PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const prjJournal = createCostCenterExpenseJournalEntry({
        costCenterCode: targetPrj.code,
        costCenterNameAr: targetPrj.nameAr || targetPrj.name,
        expenseAccountCode: '5203',
        expenseAccountNameAr: 'مصروفات تشغيل وتنفيذ المشاريع الهندسية',
        amount: deltaSpent,
        paymentMethod: 'BANK',
        description: `صرف مستخلص مرحلة إنجاز (${nextPct}%) للمشروع [${targetPrj.code}]`,
        tenantId: currentTenant.id,
        entryNumber,
        operatorName: currentUser.name,
      });
      setJournalEntries((prev) => [prjJournal, ...prev]);
    }
  };

  const addFleetVehicle = (v: Omit<FleetVehicle, 'id' | 'tenantId'>) => {
    const newVeh: FleetVehicle = {
      ...v,
      id: `flt-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setFleetVehicles((prev) => [newVeh, ...prev]);
  };

  const cycleFleetVehicleStatus = (vehicleId: string) => {
    const order: FleetVehicle['status'][] = ['AVAILABLE', 'ON_ROUTE', 'MAINTENANCE'];
    setFleetVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;
        const next = order[(order.indexOf(v.status) + 1) % order.length];
        return { ...v, status: next, mileageKm: v.mileageKm + (next === 'ON_ROUTE' ? 120 : 0) };
      })
    );
  };

  const addQualityInspection = (
    qc: Omit<QualityInspection, 'id' | 'tenantId' | 'inspectionNumber'>
  ) => {
    const newQc: QualityInspection = {
      ...qc,
      id: `qc-${Date.now()}`,
      tenantId: currentTenant.id,
      inspectionNumber: `QC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    };
    setQualityInspections((prev) => [newQc, ...prev]);
  };

  const addCRMLead = (lead: Omit<CRMLead, 'id' | 'tenantId'>) => {
    const newLead: CRMLead = {
      ...lead,
      id: `lead-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setCrmLeads((prev) => [newLead, ...prev]);
  };

  const advanceLeadStage = (leadId: string) => {
    const stages: CRMLead['stage'][] = ['NEW_LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];
    setCrmLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const idx = stages.indexOf(l.stage);
        const nextStage = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : 'WON';
        const nextProb = nextStage === 'WON' ? 100 : Math.min(95, (l.probability || 50) + 20);
        return { ...l, stage: nextStage, probability: nextProb };
      })
    );
  };

  const advanceEcommerceOrder = (orderId: string) => {
    const statuses: EcommerceOrder['fulfillmentStatus'][] = ['NEW_ORDER', 'PACKING', 'SHIPPED', 'DELIVERED'];
    setEcommerceOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const idx = statuses.indexOf(o.fulfillmentStatus);
        const nextStatus = idx >= 0 && idx < statuses.length - 1 ? statuses[idx + 1] : 'DELIVERED';
        return { ...o, fulfillmentStatus: nextStatus };
      })
    );
  };

  const decideWorkflowApproval = (approvalId: string, status: 'APPROVED' | 'REJECTED') => {
    setWorkflowApprovals((prev) =>
      prev.map((w) => (w.id === approvalId ? { ...w, status } : w))
    );
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `WORKFLOW_${status}`,
        module: 'WORKFLOW',
        entityType: 'WorkflowApproval',
        entityId: approvalId,
        details: `Workflow request ${approvalId} marked as ${status} by ${currentUser.name}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  // AI Assistant Query Handler
  const sendAIMessage = async (text: string) => {
    const userMsg: AIChatMessage = {
      id: `usr-msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setIsAILoading(true);

    try {
      const lowStockItems = products.filter((p) => p.stockQty <= p.reorderPoint);
      const res = await fetch('/api/v1/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          language,
          erpContextSummary: {
            tenant: currentTenant.name,
            branch: currentBranch.name,
            activeIndustry,
            totalProducts: products.length,
            lowStockProducts: lowStockItems.map((p) => ({ sku: p.sku, name: p.name, nameAr: p.nameAr, stockQty: p.stockQty, reorderPoint: p.reorderPoint })),
            totalInvoices: salesInvoices.length,
            shiftSales: currentShift.totalSales,
            journalEntriesCount: journalEntries.length,
            openWorkflows: workflowApprovals.filter((w) => w.status === 'PENDING').length,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setAiMessages((prev) => [
            ...prev,
            {
              id: `ai-msg-${Date.now()}`,
              sender: 'assistant',
              text: data.reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          setIsAILoading(false);
          return;
        }
      }
    } catch {
      // Fallback below
    }

    let reply = '';
    const lower = text.toLowerCase();

    if (lower.includes('مبيعات') || lower.includes('sales') || lower.includes('أكثر') || lower.includes('top')) {
      const productSalesMap = new Map<string, { nameAr: string; name: string; sku: string; qty: number; rev: number }>();
      for (const inv of salesInvoices) {
        if (inv.status === 'VOID') continue;
        for (const item of inv.items) {
          const prod = products.find((p) => p.id === item.productId);
          const existing = productSalesMap.get(item.productId) || {
            nameAr: prod?.nameAr || item.productName,
            name: prod?.name || item.productName,
            sku: prod?.sku || item.productId,
            qty: 0,
            rev: 0,
          };
          existing.qty += item.quantity;
          existing.rev += item.total;
          productSalesMap.set(item.productId, existing);
        }
      }
      const ranked = Array.from(productSalesMap.values()).sort((a, b) => b.rev - a.rev);
      const top = ranked[0];
      const second = ranked[1];
      const totalInvoicedRevenue = salesInvoices
        .filter((i) => i.status !== 'VOID')
        .reduce((s, i) => s + i.grandTotal, 0);

      if (top) {
        reply = language === 'ar'
          ? `بناءً على سجل الفواتير الفعلي (${salesInvoices.length} فاتورة)، الصنف الأعلى مبيعاً هو **${top.nameAr}** (SKU: ${top.sku}) بإجمالي إيراد ${top.rev.toLocaleString()} ر.س (${top.qty} وحدة)${second ? `، يليه **${second.nameAr}** بعدد ${second.qty} وحدة` : ''}. إجمالي الفواتير المسجلة بلغ ${totalInvoicedRevenue.toLocaleString()} ر.س، ومبيعات الوردية الحالية ${currentShift.totalSales.toLocaleString()} ر.س.`
          : `Based on your live sales ledger (${salesInvoices.length} invoices), the top-performing product is **${top.name}** (SKU: ${top.sku}) generating SAR ${top.rev.toLocaleString()} (${top.qty} units)${second ? `, followed by **${second.name}** with ${second.qty} units` : ''}. Total invoiced sales stand at SAR ${totalInvoicedRevenue.toLocaleString()}, and active POS shift sales at SAR ${currentShift.totalSales.toLocaleString()}.`;
      } else {
        reply = language === 'ar'
          ? `لا توجد فواتير مبيعات مرحلة حالياً. مبيعات الوردية الحالية: ${currentShift.totalSales.toLocaleString()} ر.س.`
          : `No posted sales invoices found. Active POS shift sales: SAR ${currentShift.totalSales.toLocaleString()}.`;
      }
    } else if (lower.includes('مخزون') || lower.includes('stock') || lower.includes('طلب') || lower.includes('reorder')) {
      const lowStockItems = products.filter((p) => p.stockQty <= p.reorderPoint);
      reply = language === 'ar'
        ? `لدينا حالياً ${lowStockItems.length} أصناف وصلت إلى حد إعادة الطلب: ${lowStockItems.map((i) => `**${i.nameAr}** (الرصيد: ${i.stockQty} / الحد: ${i.reorderPoint})`).join('، ') || 'لا يوجد أصناف حرجة'}. التوصية: إصدار أمر شراء RFQ للموردين المعتمدين فوراً.`
        : `Currently ${lowStockItems.length} products have reached their reorder thresholds: ${lowStockItems.map((i) => `**${i.name}** (Current: ${i.stockQty} / Reorder Point: ${i.reorderPoint})`).join(', ') || 'None'}. Recommended Action: Issue RFQ purchase orders immediately.`;
    } else if (lower.includes('محاسب') || lower.includes('accounting') || lower.includes('ميزان') || lower.includes('trial') || lower.includes('ضريبة')) {
      const tb = generateTrialBalance(chartAccounts, journalEntries);
      const fin = calculateDynamicFinancialStatements(chartAccounts, journalEntries);
      reply = language === 'ar'
        ? `جميع القيود اليومية المسجلة (${journalEntries.length} قيد) ${tb.isBalanced ? 'متوازنة تماماً 100%' : 'تحتاج مراجعة توازن'}. إجمالي المدين (${tb.grandDebit.toLocaleString()} ر.س) يعادل إجمالي الدائن (${tb.grandCredit.toLocaleString()} ر.س). ضريبة المخرجات المستحقة فعلياً هي ${fin.outputVat.toLocaleString()} ر.س والمدخلات القابلة للاسترداد هي ${fin.inputVat.toLocaleString()} ر.س، وصافي الضريبة المستحقة للهيئة هو ${fin.netVatPayable.toLocaleString()} ر.س، وصافي الربح التشغيلي ${fin.netIncome.toLocaleString()} ر.س.`
        : `All registered journal entries (${journalEntries.length} entries) are ${tb.isBalanced ? '100% strictly balanced' : 'out of balance'}. Total Debit (SAR ${tb.grandDebit.toLocaleString()}) matches Total Credit (SAR ${tb.grandCredit.toLocaleString()}). Live Output VAT payable stands at SAR ${fin.outputVat.toLocaleString()} against recoverable Input VAT of SAR ${fin.inputVat.toLocaleString()}, resulting in net tax payable of SAR ${fin.netVatPayable.toLocaleString()} and net operating profit of SAR ${fin.netIncome.toLocaleString()}.`;
    } else {
      const tb = generateTrialBalance(chartAccounts, journalEntries);
      reply = language === 'ar'
        ? `تم تحليل الاستعلام في سياق المستأجر [${currentTenant.name}] والنشاط [${activeIndustry}]. النظام يعمل بكامل طاقته التشغيلية مع ${products.length} صنف مسجل، ${salesInvoices.length} فاتورة، و${journalEntries.length} قيد محاسبي متوازن (إجمالي ميزان المراجعة: ${tb.grandDebit.toLocaleString()} ر.س).`
        : `Analyzed query within Tenant [${currentTenant.name}] and Industry [${activeIndustry}]. Platform operational with ${products.length} registered products, ${salesInvoices.length} invoices, and ${journalEntries.length} balanced journal entries (Trial Balance: SAR ${tb.grandDebit.toLocaleString()}).`;
    }

    setAiMessages((prev) => [
      ...prev,
      {
        id: `ai-msg-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setIsAILoading(false);
  };

  // AI Structured OCR Parser
  const parseInvoiceWithAI = async (rawText: string) => {
    try {
      const res = await fetch('/api/v1/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.parsed) return data.parsed;
      }
    } catch {
      // Fallback below
    }

    return parseStructuredVendorInvoiceText(rawText);
  };

  const resetToInitialDemo = () => {
    setTenants(SEED_TENANTS);
    setProducts(SEED_PRODUCTS);
    setBarcodes(SEED_BARCODES);
    setTraceabilityEvents(SEED_TRACEABILITY);
    setSuppliers(SEED_SUPPLIERS);
    setCustomers(SEED_CUSTOMERS);
    setChartAccounts(SEED_CHART_OF_ACCOUNTS);
    setJournalEntries(SEED_JOURNAL_ENTRIES);
    setSalesInvoices(SEED_SALES_INVOICES);
    setPurchaseOrders(SEED_PURCHASE_ORDERS);
    setEmployees(SEED_EMPLOYEES);
    setFixedAssets(SEED_FIXED_ASSETS);
    setProductionOrders(SEED_PRODUCTION_ORDERS);
    setProjects(SEED_PROJECTS);
    setFleetVehicles(SEED_FLEET);
    setQualityInspections(SEED_QUALITY);
    setCrmLeads(SEED_CRM_LEADS);
    setEcommerceOrders(SEED_ECOMMERCE_ORDERS);
    setWorkflowApprovals(SEED_WORKFLOW_APPROVALS);
    setPosCart([]);
    setHoldBills([]);
    fetch('/api/v1/erp/reset', { method: 'POST' }).catch(() => {});
  };

  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    return localStorage.getItem('asf_onboarding_completed') === 'true';
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem('asf_onboarding_completed') !== 'true';
  });

  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => setIsOnboardingOpen(false);

  const completeOnboarding = () => {
    localStorage.setItem('asf_onboarding_completed', 'true');
    setIsOnboardingCompleted(true);
    setIsOnboardingOpen(false);
  };

  const resetSystemToBlank = () => {
    // Zero out all products, stock, customer records, vendor records, invoices, orders, employees
    setProducts([]);
    setBarcodes([]);
    setTraceabilityEvents([]);
    setSuppliers([]);
    setCustomers([]);
    setSalesInvoices([]);
    setPurchaseOrders([]);
    setEmployees([]);
    setFixedAssets([]);
    setProductionOrders([]);
    setProjects([]);
    setFleetVehicles([]);
    setQualityInspections([]);
    setCrmLeads([]);
    setEcommerceOrders([]);
    setWorkflowApprovals([]);
    setPosCart([]);
    setHoldBills([]);
    setPostDatedChecks([]);
    setKitchenTickets([]);

    // Keep Chart of Accounts intact, but initialize balanced zero/clean journal
    setChartAccounts(SEED_CHART_OF_ACCOUNTS);
    setJournalEntries([]);

    // Clear server state if available
    fetch('/api/v1/erp/reset-blank', { method: 'POST' }).catch(() => {});
  };

  const exportEncryptedDatabaseSnapshot = (passphrase?: string) => {
    let fullSnapshot: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('rlm_erp_instant_v4_solar');
      if (raw) fullSnapshot = JSON.parse(raw);
    } catch {
      // Fallback to active slices
    }

    const backupPayload = {
      exportedAt: new Date().toISOString(),
      tenant: currentTenant,
      company,
      activeIndustry,
      invoiceTemplateSettings,
      branches,
      warehouses,
      productsCount: products.length,
      salesInvoicesCount: salesInvoices.length,
      journalEntriesCount: journalEntries.length,
      auditLogsCount: auditLogs.length,
      data: {
        ...fullSnapshot,
        products,
        barcodes,
        traceabilityEvents,
        suppliers,
        customers,
        salesInvoices,
        salesReturns,
        warrantyTickets,
        salesPipelineDocs,
        purchaseOrders,
        journalEntries,
        employees,
        fixedAssets,
        productionOrders,
        projects,
        fleetVehicles,
        qualityInspections,
        crmLeads,
        ecommerceOrders,
        workflowApprovals,
      },
    };

    const encryptedSnapshot = encryptDatabaseSnapshotJSON(backupPayload, passphrase);
    const jsonString = JSON.stringify(encryptedSnapshot, null, 2);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `RLM-ERP-Encrypted-Snapshot-${currentTenant.code}-${dateStamp}.enc.json`;

    setAuditLogs((prev) => [
      {
        id: `aud-snap-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'EXPORT_ENCRYPTED_DB_SNAPSHOT',
        module: 'SETTINGS',
        entityType: 'SystemBackup',
        entityId: encryptedSnapshot.integritySignature,
        details: `Exported encrypted database snapshot (${filename}) with signature [${encryptedSnapshot.integritySignature}].`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return {
      jsonString,
      filename,
      snapshot: encryptedSnapshot,
    };
  };

  const importBackupJSON = (rawJson: string, passphrase?: string) => {
    try {
      const decrypted = decryptDatabaseSnapshotJSON(rawJson, passphrase);
      if (!decrypted.success || !decrypted.payload) {
        return {
          success: false,
          messageAr: decrypted.errorAr || 'ملف النسخة الاحتياطية غير صالح أو مفتاح التشفير غير صحيح',
          messageEn: decrypted.errorEn || 'Invalid backup JSON or incorrect passphrase',
        };
      }
      const parsed = decrypted.payload;
      const dataObj = parsed.data || parsed;
      if (!dataObj || typeof dataObj !== 'object') {
        return {
          success: false,
          messageAr: 'ملف النسخة الاحتياطية غير صالح',
          messageEn: 'Invalid backup JSON structure',
        };
      }
      applyHydratedState(dataObj);
      if (parsed.activeIndustry) setActiveIndustryState(parsed.activeIndustry);
      if (parsed.invoiceTemplateSettings) {
        setInvoiceTemplateSettings((prev) => ({ ...prev, ...parsed.invoiceTemplateSettings }));
      }
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: decrypted.isEncrypted ? 'RESTORE_ENCRYPTED_DB_SNAPSHOT' : 'RESTORE_JSON_BACKUP',
          module: 'SETTINGS',
          entityType: 'SystemBackup',
          entityId: decrypted.isEncrypted ? 'ENCRYPTED-RESTORE' : 'JSON-RESTORE',
          details: decrypted.isEncrypted
            ? `Restored system state from encrypted disaster recovery snapshot.`
            : `Restored system state from JSON backup archive.`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      return {
        success: true,
        messageAr: decrypted.isEncrypted
          ? 'تم فك التشفير واستعادة لقطة قاعدة البيانات بنجاح!'
          : 'تم استيراد واستعادة النسخة الاحتياطية بنجاح!',
        messageEn: decrypted.isEncrypted
          ? 'Encrypted database snapshot decrypted and restored successfully!'
          : 'Backup archive restored successfully!',
      };
    } catch {
      return {
        success: false,
        messageAr: 'تعذر قراءة ملف JSON، تأكد من صحة صيغة الملف',
        messageEn: 'Failed to parse JSON backup file',
      };
    }
  };

  // WhatsApp in-app operations
  const pairWhatsAppWithQR = async (
    phone = '+967 770 123 456',
    name = 'المكتب الرئيسي - واتساب الأعمال'
  ): Promise<{ success: boolean; messageAr: string }> => {
    try {
      const res = await fetch('/api/v1/whatsapp/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (data.session) {
        setWhatsappSession(data.session);
        return { success: true, messageAr: 'تم ربط جهاز واتساب بنجاح وتفعيل المزامنة المباشرة!' };
      }
    } catch {
      // In-memory fallback
    }
    const tokenData = generatePairingQRToken();
    const pairedSession: WhatsAppSessionInfo = {
      ...whatsappSession,
      status: 'CONNECTED',
      phoneNumber: phone,
      pushName: name,
      batteryLevel: 94,
      qrCodeData: tokenData.token,
      qrExpiresInSec: tokenData.expiresInSec,
      pairedAt: new Date().toISOString(),
      platform: 'WhatsApp Web Multi-Device Gateway v2.24.18 (RLM Dedicated)',
    };
    setWhatsappSession(pairedSession);
    return { success: true, messageAr: 'تم ربط جهاز واتساب بنجاح وتفعيل المزامنة المباشرة!' };
  };

  const disconnectWhatsApp = async () => {
    try {
      await fetch('/api/v1/whatsapp/disconnect', { method: 'POST' });
    } catch {}
    setWhatsappSession(createInitialWhatsAppSession());
  };

  const sendWhatsAppChatMessage = async (
    chatId: string,
    text: string,
    attachmentType?: string,
    refNum?: string
  ) => {
    try {
      await fetch('/api/v1/whatsapp/send-chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, text, attachmentType, refNum }),
      });
    } catch {}
    const newMsg: WhatsAppChatMessage = {
      id: `wmsg-${Date.now()}`,
      chatId,
      sender: 'ME',
      text,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      status: 'READ',
      attachmentType: (attachmentType as any) || 'NONE',
      referenceNumber: refNum,
    };
    setWhatsappChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            lastMessage: text,
            lastMessageTime: new Date().toISOString(),
            messages: [...chat.messages, newMsg],
          };
        }
        return chat;
      })
    );
  };

  // USB Mobile Phone Bridge (SMS via connected device SIM)
  const runUsbDiagnostics = async (): Promise<UsbDiagnosticsReport> => {
    try {
      const res = await fetch('/api/v1/usb/diagnostics', { method: 'POST' });
      const data = await res.json();
      if (data.report) {
        setUsbDiagnosticsReport(data.report);
        if (data.device) setUsbConnectedDevice(data.device);
        return data.report;
      }
    } catch {}
    const report = runUsbAutoDiagnostics(usbConnectedDevice);
    setUsbDiagnosticsReport(report);
    return report;
  };

  const sendSmsViaUsb = async (
    recipientPhone: string,
    messageBody: string,
    referenceNumber?: string,
    recipientName?: string
  ): Promise<{ success: boolean; messageAr?: string }> => {
    try {
      const res = await fetch('/api/v1/usb/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          messageBody,
          referenceNumber,
          recipientName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.device) setUsbConnectedDevice(data.device);
        return { success: true, messageAr: data.messageAr };
      }
    } catch {}
    // In-memory fallback
    setUsbConnectedDevice((prev) => ({
      ...prev,
      messagesSentCount: prev.messagesSentCount + 1,
    }));
    return {
      success: true,
      messageAr: 'تم إرسال الرسالة النصية بنجاح عبر شريحة الجوال الموصول بالـ USB!',
    };
  };

  // Cross-Branch Stock Probe & Transfers
  const probeCrossBranchStock = (sku: string): CrossBranchStockItem[] => {
    return calculateCrossBranchStockMatrix({
      productSku: sku,
      currentBranchId: currentBranch.id,
      allProducts: products,
      branchNodes,
    });
  };

  const openCrossBranchModal = (sku: string) => {
    setCrossBranchModalSku(sku);
    setIsCrossBranchModalOpen(true);
  };

  const closeCrossBranchModal = () => {
    setIsCrossBranchModalOpen(false);
    setCrossBranchModalSku(null);
  };

  const requestInterBranchTransfer = async (params: {
    sourceBranchId: string;
    targetBranchId: string;
    productSku: string;
    requestedQty: number;
    urgency?: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  }): Promise<{ success: boolean; messageAr: string }> => {
    try {
      const res = await fetch('/api/v1/branches/transfer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.success && data.transfer) {
        setInterBranchTransfers((prev) => [data.transfer, ...prev]);
        if (data.journalEntry) {
          setJournalEntries((prev) => [data.journalEntry, ...prev]);
        }
        return {
          success: true,
          messageAr:
            data.messageAr ||
            'تم إنشاء طلب التحويل المخزني والقيد المحاسبي المتوازن بين الفرعين بنجاح!',
        };
      }
    } catch {}

    const sourceBranch =
      branchNodes.find((b) => b.branchId === params.sourceBranchId) || branchNodes[0];
    const targetBranch =
      branchNodes.find((b) => b.branchId === params.targetBranchId) || branchNodes[1];
    const product = products.find((p) => p.sku === params.productSku) || products[0];
    const { transferDoc, clearingJournal } = createInterBranchTransferDocAndJournal({
      tenantId: currentTenant.id,
      sourceBranch,
      targetBranch,
      product,
      requestedQty: params.requestedQty,
      urgency: params.urgency || 'NORMAL',
      operatorName: currentUser.name,
    });
    setInterBranchTransfers((prev) => [transferDoc, ...prev]);
    setJournalEntries((prev) => [clearingJournal, ...prev]);
    return {
      success: true,
      messageAr: 'تم إنشاء طلب التحويل المخزني والقيد المحاسبي المتوازن بين الفرعين بنجاح!',
    };
  };

  const receiveSimulatedWhatsAppCustomerMessage = (chatId: string, replyText: string) => {
    const inboundMsg = createSimulatedInboundWhatsAppMessage(chatId, replyText);
    setWhatsappChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          return {
            ...c,
            lastMessage: replyText,
            lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: c.unreadCount + 1,
            messages: [...c.messages, inboundMsg],
          };
        }
        return c;
      })
    );
  };

  const launchBulkDebtSmsCampaign = (
    customPrefix?: string
  ): {
    campaignId: string;
    targetedCustomersCount: number;
    totalDebtAmount: number;
    messageAr: string;
  } => {
    const campaign = buildBulkDebtSmsCampaign(customers, usbConnectedDevice, customPrefix);
    setUsbConnectedDevice(campaign.updatedDevice);

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newRecords: OutboundMessageRecord[] = campaign.smsQueue.map((item, idx) => ({
      id: `bulk-sms-${campaign.campaignId}-${idx}`,
      tenantId: currentTenant.id,
      channel: 'SMS',
      category: 'DEBT_REMINDER',
      recipientName: item.customerName,
      recipientPhone: item.phone,
      normalizedPhone: item.phone.replace(/\D/g, ''),
      referenceNumber: `DEBT-${item.customerId}`,
      messageBody: item.messageBody,
      status: 'DELIVERED',
      whatsappUrl: '',
      smsUri: `sms:${item.phone}`,
      sentBy: `${usbConnectedDevice.model} (USB Bulk Queue)`,
      sentAt: nowStr,
    }));

    setOutboundMessages((prev) => [...newRecords, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `aud-bulk-sms-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'RUN_BULK_SMS_CAMPAIGN',
        module: 'COMMUNICATIONS',
        entityType: 'DebtCampaign',
        entityId: campaign.campaignId,
        details: `Dispatched bulk debt reminders via USB Mobile SIM to ${campaign.targetedCustomersCount} debtors (Total Debt: ${campaign.totalDebtAmount} ${currency}).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return {
      campaignId: campaign.campaignId,
      targetedCustomersCount: campaign.targetedCustomersCount,
      totalDebtAmount: campaign.totalDebtAmount,
      messageAr: `تم إطلاق حملة التذكير بنجاح وإرسال ${campaign.targetedCustomersCount} رسالة نصية عبر شريحة الجوال الموصول بالـ USB!`,
    };
  };

  const advanceBranchTransfer = (
    transferId: string,
    nextStatus: 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED',
    notes?: string
  ): { success: boolean; messageAr: string } => {
    const target = interBranchTransfers.find((t) => t.id === transferId);
    if (!target) {
      return { success: false, messageAr: 'أمر التحويل غير موجود' };
    }

    const { updatedTransfer, updatedProducts, stockDeltaApplied } = advanceInterBranchTransferStatus(
      target,
      nextStatus,
      products,
      notes
    );

    setInterBranchTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? updatedTransfer : t))
    );

    if (stockDeltaApplied > 0) {
      setProducts(updatedProducts);
    }

    setAuditLogs((prev) => [
      {
        id: `aud-tr-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UPDATE_INTER_BRANCH_TRANSFER',
        module: 'INVENTORY',
        entityType: 'TransferRequest',
        entityId: target.requestNumber,
        details: `Updated transfer ${target.requestNumber} status to ${nextStatus}. Stock delta: +${stockDeltaApplied} units.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return {
      success: true,
      messageAr:
        nextStatus === 'RECEIVED'
          ? `تم تأكيد استلام البضاعة في المستودع وإضافة ${stockDeltaApplied} قطعة إلى رصيد المخزون بنجاح!`
          : `تم تحديث حالة التحويل إلى (${nextStatus}) بنجاح!`,
    };
  };

  return (
    <ERPContext.Provider
      value={{
        language,
        direction,
        setLanguage,
        currency,
        setCurrency,
        t,
        activeTab,
        setActiveTab,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        activeIndustry,
        setActiveIndustry,
        invoiceTemplateSettings,
        updateInvoiceTemplateSettings,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        backendConnected,
        syncLatencyMs,
        dbRevision,
        uiTheme,
        setUiTheme,
        uiDensity,
        setUiDensity,

        isAuthenticated,
        login,
        logout,
        userAccounts,
        currentAccount,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,
        hasModuleAccess,
        hasPermission,

        hardwareFingerprint,
        rescanLiveHardware,
        importWindowsWmiSerials,
        protectionState,
        activeLicenseSerial,
        activateSystemWithSerial,
        clearActiveLicense,
        generateDeveloperActivationKey,
        isSimulatedTrialExpired,
        setIsSimulatedTrialExpired,
        simulatedTrialDaysElapsed,
        setSimulatedTrialDaysElapsed,
        isSimulatedForeignDevice,
        setIsSimulatedForeignDevice,
        isSimulatedClockTampered,
        setIsSimulatedClockTampered,
        simulatedTamperedComponent,
        setSimulatedTamperedComponent,
        isStandaloneKeygenOpen,
        setIsStandaloneKeygenOpen,
        antiTheftShieldEnabled,
        setAntiTheftShieldEnabled,
        blockedInspectCount,
        recordBlockedInspectAttempt,
        lastSecurityAlert,

        masterSystemConfig,
        updateMasterSystemConfig,
        toggleSectorMode,
        getVisibleModules,
        toggleModuleVisibility,
        toggleUIElementVisibility,
        formatCurrency,
        promoCoupons,
        promotionalOffers,
        addPromoCoupon,
        togglePromoCouponStatus,
        deletePromoCoupon,
        addPromotionalOffer,
        togglePromotionalOfferStatus,
        validateCouponForAmount,
        networkInfo,
        refreshNetworkInfo,

        tenants,
        currentTenant,
        setCurrentTenant,
        addTenant,
        updateTenantPlan,
        company,
        updateCompanyProfile,
        branches,
        currentBranch,
        setCurrentBranch,
        addBranch,
        warehouses,
        currentWarehouse,
        setCurrentWarehouse,
        addWarehouse,
        currentUser,
        setCurrentUserRole,
        auditLogs,

        categories,
        products,
        addProduct,
        updateProduct,
        importBulkProductsCSV,
        barcodes,
        generateBarcodeForProduct,
        traceabilityEvents,
        addTraceabilityEvent,
        scanProductLabelWithSmartOCR,
        registerOCRProductOrSerial,

        suppliers,
        addSupplier,
        recordSupplierPaymentVoucher,
        purchaseOrders,
        addPurchaseOrder,
        approvePurchaseOrder,
        applyLandedCostToProducts,

        customers,
        addCustomer,
        recordCustomerPaymentReceipt,
        salesInvoices,
        addSalesInvoice,
        salesReturns,
        createSalesReturnCreditNote,
        warrantyTickets,
        createWarrantyMaintenanceTicket,
        advanceWarrantyTicketStatus,
        salesPipelineDocs,
        createSalesPipelineDoc,
        advancePipelineDoc,
        currentShift,
        posCart,
        addToPOSCart,
        addSolarSystemKitToPOSCart,
        removeFromPOSCart,
        updatePOSCartQty,
        updatePOSCartItemMeta,
        clearPOSCart,
        checkoutPOS,
        holdBills,
        holdCurrentPOSBill,
        resumePOSBill,
        closePOSShift,
        kitchenTickets,
        sendCartToKitchen,
        advanceKitchenTicket,

        chartAccounts,
        addChartAccount,
        journalEntries,
        addManualJournalEntry,
        reverseJournalEntry,
        bankStatementLines,
        addBankStatementLine,
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

        employees,
        addEmployee,
        runMonthlyPayroll,
        fixedAssets,
        addFixedAsset,
        runAssetDepreciationCycle,
        boms,
        productionOrders,
        addProductionOrder,
        advanceProductionOrder,
        projects,
        addProject,
        advanceProjectProgress,
        fleetVehicles,
        addFleetVehicle,
        cycleFleetVehicleStatus,
        qualityInspections,
        addQualityInspection,
        crmLeads,
        addCRMLead,
        advanceLeadStage,
        ecommerceOrders,
        advanceEcommerceOrder,
        workflowApprovals,
        decideWorkflowApproval,

        aiMessages,
        sendAIMessage,
        isAILoading,
        parseInvoiceWithAI,

        outboundMessages,
        messagingGatewayConfig,
        updateMessagingGatewayConfig,
        sendWhatsAppOrSmsMessage,
        quickSendModalState,
        openQuickSendModal,
        closeQuickSendModal,
        currentIndustryBlueprint,
        provisionIndustrySuppliesToInventory,

        // WhatsApp Web In-App Integration
        whatsappSession,
        whatsappChats,
        activeWhatsAppChatId,
        setActiveWhatsAppChatId,
        pairWhatsAppWithQR,
        disconnectWhatsApp,
        sendWhatsAppChatMessage,
        receiveSimulatedWhatsAppCustomerMessage,

        // USB Mobile Phone Bridge (SMS over USB)
        usbConnectedDevice,
        usbDiagnosticsReport,
        runUsbDiagnostics,
        sendSmsViaUsb,
        launchBulkDebtSmsCampaign,

        // Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfers
        branchNodes,
        interBranchTransfers,
        isCrossBranchModalOpen,
        crossBranchModalSku,
        openCrossBranchModal,
        closeCrossBranchModal,
        probeCrossBranchStock,
        requestInterBranchTransfer,
        advanceBranchTransfer,

        isLanPortalOpen,
        openLanPortal,
        closeLanPortal,

        resetToInitialDemo,
        resetSystemToBlank,
        isOnboardingCompleted,
        completeOnboarding,
        isOnboardingOpen,
        openOnboarding,
        closeOnboarding,
        exportEncryptedDatabaseSnapshot,
        importBackupJSON,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
