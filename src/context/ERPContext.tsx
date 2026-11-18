/**
 * RLM ERP - Core State Context & Store Provider
 * Multi-Tenant, Multi-Branch, Multi-Industry, Full-Stack Server Persistence & Gemini AI Integration
 */

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  GoodsReceiptNote,
  PurchaseReturn,
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
  ArchivedReturnedInvoiceRecord,
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
  WhatsAppAccountInstance,
  UsbConnectedDevice,
  UsbDiagnosticsReport,
  BranchNodeInfo,
  CrossBranchStockItem,
  InterBranchTransferRequest,
} from '../types/erp';
import {
  UniversalAiConfigPublic,
  UniversalAiConfigInput,
} from '../core/aiProviderEngine';
import {
  createInitialWhatsAppSession,
  generatePairingQRToken,
  createCleanWhatsAppDefaultAccount,
  createNewWhatsAppAccountInstance,
  appendMessageToWhatsAppChats,
  generateUniqueWhatsAppMessageId,
  createDisconnectedUsbDevice,
  runUsbAutoDiagnostics,
  isUsbDeviceReady,
  lookupUsbVendorName,
  parseModemAtIdentityResponses,
  calculateCrossBranchStockMatrix,
  createInterBranchTransferDocAndJournal,
  advanceInterBranchTransferStatus,
  buildBulkDebtSmsCampaign,
  createSimulatedInboundWhatsAppMessage,
} from '../core/communicationsEngine';
import {
  SEED_TENANTS,
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
  evaluatePosCartStockConstraint,
  PosCartStockCheckResult,
} from '../core/inventoryEngine';
import {
  computePartialGrnResult,
  createGrnReceiptJournal,
  computePurchaseReturnResult,
  createPurchaseReturnJournal,
  resolveProductUnitOption,
  computeBaseStockDelta,
  PartialGrnInputLine,
  PurchaseReturnInputLine,
} from '../core/multiUnitAndProcurementEngine';
import {
  computeFullInvoiceVoidAndReturn,
  isCartItemWarrantyActive,
} from '../core/salesReturnEngine';
import {
  computeOfflineStorageMetrics,
  idbLoadOfflineSnapshot,
  idbLoadPendingSyncQueue,
  idbReplacePendingSyncQueue,
  idbSaveOfflineSnapshot,
  OfflineIndexedDbMetrics,
} from '../core/offlineIndexedDbEngine';
import {
  HardwareFingerprint,
  LicenseDurationPreset,
  SystemProtectionEvaluation,
  SerialVerificationResult,
  evaluateSystemProtectionState,
  generateMachineRequestCode,
  generateActivationSerial,
  verifyActivationSerial,
  verifyOneTimeSerialActivation,
  computeSerialConsumptionToken,
  computeClockHighWaterIntegrityTag,
  verifyClockHighWaterIntegrityTag,
  detectRealHardwareFingerprint,
  parseWindowsWmiHardwareInput,
  EncryptedDatabaseSnapshot,
  encryptDatabaseSnapshotJSON,
  decryptDatabaseSnapshotJSON,
  hashUserPassword,
  verifyUserPassword,
  evaluateLoginAttemptLockout,
  evaluateUserModuleAccess,
} from '../core/securityEngine';
import {
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
  buildWhatsAppAndSmsProtocolLinks,
} from '../core/messagingEngine';
import {
  IndustryBlueprint,
  getIndustryBlueprint,
} from '../core/industryBlueprints';
import {
  SystemNotification,
  NotificationActionType,
  RemoteSyncToastSpec,
  generateSystemNotifications,
  computeNotificationStateSummary,
  buildRemotePatchToastMeta,
  triggerNativeBrowserNotification,
  enqueueToastNotification,
  dismissToastFromQueue,
} from '../core/notificationsEngine';
import {
  createDefaultShiftlessState,
  applySaleToShift,
} from '../core/posShiftEngine';
import {
  HasebUiFontId,
  normalizeUiFontId,
  normalizeUiThemeId,
  normalizeUiDensity,
  computeStateDeltaPatch,
  mergeStateDeltaPatch,
  shouldApplyRemoteRevision,
  classifyIncomingRevision,
  resolveSyncedOnboardingStatus,
  getOrCreateSyncClientId,
  buildErpSyncWebSocketUrl,
  PendingSyncTransaction,
  loadPendingSyncQueue,
  savePendingSyncQueue,
  enqueuePendingSyncEntry,
  ConnectedLanDevice,
  detectDeviceLabelFromUserAgent,
} from '../core/realtimeSyncEngine';
import {
  SoundAlertPreferences,
  normalizeSoundAlertPreferences,
  loadSoundAlertPreferences,
  saveSoundAlertPreferences,
} from '../core/soundAlertEngine';
import {
  DEFAULT_FONT_SCALE,
  DEFAULT_WINDOW_SCALE,
  clampFontScale,
  clampWindowScale,
  computeViewportAwareScaleCssVars,
} from '../core/uiScaleEngine';
import {
  DAILY_BACKUP_INTERVAL_MS,
  DailyBackupMetadata,
  isDailyBackupDue,
  shouldNotifyAdminOfBackup,
  buildDailyBackupArchivePayload,
} from '../core/backupSchedulerEngine';
import {
  DEFAULT_TAB_SCALE,
  clampTabScale,
  computeTabLayoutCssVars,
} from '../core/workspaceLayoutEngine';

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
  'reportsAndAI',
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
  'reportsAndAI',
] as const;

/**
 * Helper function that manages the visibility list of modules based on `masterSystemConfig.sectorModeEnabled`.
 * When `sectorModeEnabled` is active, returns only `['pos', 'inventory', 'sales', 'accounting', 'reportsAndAI']`.
 */
export function getVisibleModulesList(
  sectorModeEnabled: boolean | undefined,
  fallbackModules: readonly string[] = ALL_ERP_MODULES
): string[] {
  if (sectorModeEnabled) {
    return ['pos', 'inventory', 'sales', 'accounting', 'reportsAndAI'];
  }
  return [...fallbackModules];
}

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin-1',
    tenantId: 'ten-1',
    username: 'admin',
    password: hashUserPassword('admin', 'admin'),
    email: 'admin@haseb-erp.local',
    name: 'General Manager',
    nameAr: 'المدير العام',
    role: 'SUPER_ADMIN',
    branchId: 'branch-main-01',
    isActive: true,
    allowedModules: [...ALL_ERP_MODULES, 'communications'],
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
];

const DEFAULT_CLEAN_COMPANY: Company = {
  id: 'comp-01',
  tenantId: 'ten-1',
  name: 'Your Commercial Business',
  nameAr: 'منشأتك التجارية',
  taxNumber: '',
  crNumber: '',
  currency: 'YER',
  address: '',
  phone: '',
  email: '',
};

const DEFAULT_CLEAN_BRANCH: Branch = {
  id: 'branch-main-01',
  tenantId: 'ten-1',
  companyId: 'comp-01',
  code: 'BR-MAIN-01',
  name: 'Main Branch',
  nameAr: 'الفرع الرئيسي',
  phone: '',
  city: 'صنعاء',
  isActive: true,
};

const DEFAULT_CLEAN_WAREHOUSE: Warehouse = {
  id: 'wh-main-01',
  tenantId: 'ten-1',
  branchId: 'branch-main-01',
  code: 'WH-MAIN-01',
  name: 'Main Warehouse',
  nameAr: 'المستودع الرئيسي',
  isDefault: true,
};

const DEFAULT_CLEAN_TENANT: Tenant = {
  id: 'ten-1',
  name: 'Primary Organization',
  legalName: 'منشأتك التجارية المعتمدة',
  code: 'HASEB-MAIN',
  planId: 'enterprise',
  status: 'active',
  maxUsers: 50,
  maxBranches: 10,
  maxWarehouses: 20,
  activeModules: ['core', 'barcode', 'inventory', 'purchasing', 'sales', 'pos', 'accounting'],
  createdAt: new Date().toISOString(),
};

const DEFAULT_CLEAN_USER: User = {
  id: 'usr-admin-1',
  tenantId: 'ten-1',
  email: 'admin@haseb-erp.local',
  name: 'المدير العام',
  role: 'SUPER_ADMIN',
  branchId: 'branch-main-01',
  isActive: true,
  allowedModules: [...ALL_ERP_MODULES, 'communications'],
  permissions: INITIAL_USER_ACCOUNTS[0].permissions,
};

const DEFAULT_CLEAN_SHIFT: POSShift = createDefaultShiftlessState({
  tenantId: 'ten-1',
  branchId: 'branch-main-01',
  cashierId: 'usr-admin-1',
  cashierName: 'المدير العام',
});

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

export const DEFAULT_TEMPLATE_SETTINGS: InvoiceTemplateSettings = {
  thermalTemplate: 'thermal_80mm_warranty',
  standardTemplate: 'a4_warranty_electronics',
  headerTitleAr: 'فاتورة مبيعات ضريبية ومستند ضمان معتمد',
  headerTitleEn: 'Official Sales Invoice & Warranty Certificate',
  footerNoteAr: 'شكراً لتعاملكم معنا — هذه الفاتورة صادرة إلكترونياً وموثقة بالباركود ورمز التحقق.',
  footerNoteEn: 'Thank you for your business — Electronically verified invoice with QR & Barcode.',
  showQR: true,
  showBarcode: true,
  showStampAndSignature: true,
  showWarrantyTerms: true,
  accentColor: 'emerald',
  primaryColorHex: '#0f172a',
  secondaryColorHex: '#059669',
  fontScale: 'normal',
  paperMargin: 'normal',
  logoSize: 'md',
  logoPosition: 'right',
  showCompanyLogo: true,
  showCompanyNameEn: true,
  showCustomerPhone: true,
  showCustomerId: false,
  showItemSku: true,
  showItemDiscount: true,
  showItemTax: false,
  showSerialAndWarranty: true,
  showTafqeet: true,
  showBankAccounts: false,
  customBankDetailsAr: '',
  showWatermark: false,
  watermarkText: 'نسخة معتمدة',
  qrSizePx: 88,
  barcodeWidthPx: 140,
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
  requestedSettingsTab:
    | 'central_hub'
    | 'templates'
    | 'company'
    | 'sound_alerts'
    | 'backup'
    | 'system_setup'
    | null;
  setRequestedSettingsTab: (
    tab:
      | 'central_hub'
      | 'templates'
      | 'company'
      | 'sound_alerts'
      | 'backup'
      | 'system_setup'
      | null
  ) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  activeIndustry: IndustryType;
  setActiveIndustry: (ind: IndustryType) => void;
  invoiceTemplateSettings: InvoiceTemplateSettings;
  updateInvoiceTemplateSettings: (patch: Partial<InvoiceTemplateSettings>) => void;
  resetInvoiceTemplateSettings: () => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  backendConnected: boolean;
  isInitialServerSyncDone: boolean;
  realtimeSyncStatus: 'WS_LIVE' | 'SSE_LIVE' | 'POLLING' | 'RECONNECTING';
  syncLatencyMs: number;
  dbRevision: number;
  connectedLanDevices: ConnectedLanDevice[];
  pendingSyncTransactionsCount: number;
  isServerSyncing: boolean;
  flushPendingSyncQueue: () => Promise<boolean>;
  offlineStorageMetrics: OfflineIndexedDbMetrics;
  reloadStateFromServer: () => Promise<boolean>;
  uiTheme: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark';
  setUiTheme: (theme: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark') => void;
  uiDensity: 'comfortable' | 'compact';
  setUiDensity: (density: 'comfortable' | 'compact') => void;
  uiFont: HasebUiFontId;
  setUiFont: (font: HasebUiFontId) => void;
  fontScalePercent: number;
  setFontScalePercent: (val: number | ((prev: number) => number)) => void;
  windowScalePercent: number;
  setWindowScalePercent: (val: number | ((prev: number) => number)) => void;
  tabScalePercent: number;
  setTabScalePercent: (val: number | ((prev: number) => number)) => void;

  // Authentication, Memberships & Granular Permissions
  isAuthenticated: boolean;
  isTerminalLocked: boolean;
  lockTerminal: () => void;
  unlockTerminal: (password: string) => { success: boolean; errorAr?: string; errorEn?: string };
  idleTimeoutMinutes: number;
  setIdleTimeoutMinutes: (mins: number) => void;
  failedLoginAttempts: number;
  loginLockoutUntilMs: number;
  login: (username: string, password: string) => { success: boolean; errorAr?: string; errorEn?: string };
  logout: () => void;
  switchUserAccount: (accountId: string) => void;
  changeUserPassword: (accountId: string, newPassword: string) => { success: boolean; errorAr?: string };
  userAccounts: UserAccount[];
  currentAccount: UserAccount;
  addUserAccount: (acc: Omit<UserAccount, 'id' | 'tenantId'>) => void;
  updateUserAccount: (acc: UserAccount) => void;
  deleteUserAccount: (id: string) => void;
  hasModuleAccess: (moduleId: string) => boolean;
  hasPermission: (perm: keyof UserPermissions) => boolean;
  usedSerialTokens: string[];
  boundHardware: HardwareFingerprint;
  maxObservedClockMs: number;

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
  addBranch: (b: Omit<Branch, 'id' | 'tenantId' | 'companyId'>) => Branch;
  updateBranch: (branchId: string, patch: Partial<Branch>) => { success: boolean; messageAr?: string };
  deleteBranch: (branchId: string) => { success: boolean; messageAr: string };
  warehouses: Warehouse[];
  currentWarehouse: Warehouse;
  setCurrentWarehouse: (wh: Warehouse) => void;
  addWarehouse: (wh: Omit<Warehouse, 'id' | 'tenantId'>) => Warehouse;
  updateWarehouse: (whId: string, patch: Partial<Warehouse>) => { success: boolean; messageAr?: string };
  deleteWarehouse: (whId: string) => { success: boolean; messageAr: string };
  currentUser: User;
  setCurrentUserRole: (role: UserRole) => void;
  auditLogs: AuditLog[];

  // Inventory & Barcodes
  categories: Category[];
  addCategory: (nameAr: string, nameEn?: string) => Category;
  updateCategory: (category: Category) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  importBulkProductsCSV: (
    rawCsvText: string,
    postOpeningBalanceJournal?: boolean
  ) => { importedCount: number; totalOpeningValuation: number; errors: string[] };
  batchUpdateProducts: (
    nextProducts: Product[],
    summary: { updatedCount: number; skippedCount: number; totalFieldChanges: number }
  ) => void;
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
  goodsReceipts: GoodsReceiptNote[];
  purchaseReturns: PurchaseReturn[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => void;
  approvePurchaseOrder: (poId: string) => { success: boolean; entryNumber?: string };
  receivePurchaseOrderPartial: (
    poId: string,
    receiptLines: PartialGrnInputLine[],
    notes?: string
  ) => { success: boolean; grn?: GoodsReceiptNote; entryNumber?: string; messageAr?: string };
  createPurchaseReturn: (params: {
    supplierId: string;
    returnLines: PurchaseReturnInputLine[];
    purchaseOrderId?: string;
    poNumber?: string;
    reason?: string;
  }) => { success: boolean; purchaseReturn?: PurchaseReturn; entryNumber?: string; messageAr?: string };
  applyLandedCostToProducts: (
    allocations: { productId: string; newEffectiveUnitCost: number }[]
  ) => { success: boolean; entryNumber?: string; totalCapitalized?: number };

  // Sales, Returns, Warranty & POS
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id' | 'tenantId'>) => Customer;
  batchUpdateCustomers: (
    nextCustomers: Customer[],
    summary: { updatedCount: number; skippedCount: number; totalFieldChanges: number }
  ) => void;
  recordCustomerPaymentReceipt: (params: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'POS_CARD';
    referenceNumber?: string;
    invoiceId?: string;
  }) => { success: boolean; entryNumber?: string; newBalance?: number };
  salesInvoices: SalesInvoice[];
  addSalesInvoice: (inv: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'tenantId'>) => SalesInvoice;
  salesReturns: SalesReturnDoc[];
  returnedInvoicesArchive: ArchivedReturnedInvoiceRecord[];
  autoArchiveReturnedInvoices: boolean;
  setAutoArchiveReturnedInvoices: (enabled: boolean) => void;
  createSalesReturnCreditNote: (params: {
    originalInvoiceId: string;
    productId: string;
    quantity: number;
    serialNumber?: string;
    condition: ReturnedItemCondition;
    refundMethod: ReturnRefundMethod;
    reason: string;
  }) => { success: boolean; creditNote?: SalesReturnDoc; messageAr?: string };
  voidAndReturnSalesInvoice: (params: {
    invoiceId: string;
    condition?: ReturnedItemCondition;
    refundMethod?: ReturnRefundMethod;
    reason?: string;
    autoArchive?: boolean;
  }) => {
    success: boolean;
    updatedInvoice?: SalesInvoice;
    archivedRecord?: ArchivedReturnedInvoiceRecord;
    creditNotes?: SalesReturnDoc[];
    messageAr?: string;
  };
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
  shiftHistory: POSShift[];
  posCart: InvoiceItem[];
  addToPOSCart: (
    product: Product,
    quantity?: number,
    customNotes?: string,
    unitName?: string
  ) => PosCartStockCheckResult;
  addSolarSystemKitToPOSCart: (sizing: SolarSystemSizingOutput) => { addedItemsCount: number; totalAmount: number };
  removeFromPOSCart: (productId: string) => void;
  updatePOSCartQty: (productId: string, qty: number) => PosCartStockCheckResult | undefined;
  updatePOSCartItemUnit: (productId: string, unitName: string) => PosCartStockCheckResult | undefined;
  updatePOSCartItemMeta: (productId: string, patch: Partial<InvoiceItem>) => void;
  toggleAllPOSCartWarranty: (enabled: boolean, months?: number) => void;
  clearPOSCart: () => void;
  checkoutPOS: (
    paymentMethod: 'CASH' | 'CARD' | 'SPLIT' | 'CREDIT',
    customerId?: string,
    extraMeta?: {
      orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD';
      tableNumber?: string;
      notes?: string;
      couponCode?: string;
      manualDiscountType?: 'PERCENT' | 'AMOUNT';
      manualDiscountValue?: number;
      manualDiscountAmount?: number;
      customerName?: string;
      customerPhone?: string;
      splitCashAmount?: number;
      splitCardAmount?: number;
      paidAmount?: number;
      tenderedAmount?: number;
      cardReference?: string;
    }
  ) => SalesInvoice;
  holdBills: POSHoldBill[];
  holdCurrentPOSBill: (name?: string, tableNumber?: string) => void;
  resumePOSBill: (billId: string) => void;
  closePOSShift: (actualCount: number, openNewShiftWithFloat?: number) => void;
  openNewPOSShift: (startingCash?: number) => void;
  isShiftModalOpen: boolean;
  openShiftModal: () => void;
  closeShiftModal: () => void;
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

  // AI Assistant, Universal Multi-Provider AI Config & OCR
  aiMessages: AIChatMessage[];
  sendAIMessage: (text: string) => Promise<void>;
  isAILoading: boolean;
  parseInvoiceWithAI: (rawText: string) => Promise<any>;
  universalAiConfig: UniversalAiConfigPublic | null;
  refreshUniversalAiConfig: () => Promise<UniversalAiConfigPublic | null>;
  saveUniversalAiConfig: (input: UniversalAiConfigInput) => Promise<{
    success: boolean;
    config?: UniversalAiConfigPublic;
    messageAr?: string;
    errorAr?: string;
  }>;

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

  // WhatsApp Web Multi-Account In-App Integration
  whatsappAccounts: WhatsAppAccountInstance[];
  activeWhatsAppAccountId: string;
  switchWhatsAppAccount: (accountId: string) => void;
  addWhatsAppAccount: (params: {
    label: string;
    departmentAr: string;
    phoneNumber?: string;
    colorAccent?: WhatsAppAccountInstance['colorAccent'];
    startConnected?: boolean;
  }) => WhatsAppAccountInstance;
  removeWhatsAppAccount: (accountId: string) => { success: boolean; messageAr: string };
  startOrOpenWhatsAppChat: (recipientName: string, recipientPhone: string, customerId?: string) => string;
  lastAutoSavedAt: string;
  whatsappSession: WhatsAppSessionInfo;
  whatsappChats: WhatsAppChat[];
  activeWhatsAppChatId: string;
  setActiveWhatsAppChatId: (id: string) => void;
  markWhatsAppChatRead: (chatId: string) => void;
  pairWhatsAppWithQR: (phone?: string, name?: string) => Promise<{ success: boolean; messageAr: string }>;
  disconnectWhatsApp: () => Promise<void>;
  sendWhatsAppChatMessage: (chatId: string, text: string, attachmentType?: string, refNum?: string) => Promise<void>;
  receiveSimulatedWhatsAppCustomerMessage: (chatId: string, replyText: string) => void;
  syncLiveWhatsAppMessages: (
    accountId: string,
    inboundMessages: Array<{
      id: string;
      senderPhone: string;
      contactName: string;
      text: string;
      fromMe: boolean;
      timestamp?: string;
    }>
  ) => void;

  // USB Mobile Phone Bridge (SMS over USB / ADB / WebUSB / Web Serial / HTTP Gateway)
  usbConnectedDevice: UsbConnectedDevice;
  updateUsbConnectedDevice: (patch: Partial<UsbConnectedDevice>) => void;
  usbDiagnosticsReport: UsbDiagnosticsReport | null;
  refreshUsbConnectedDevice: () => Promise<UsbConnectedDevice>;
  connectWebUsbDevice: () => Promise<{ success: boolean; messageAr: string }>;
  connectWebSerialModem: () => Promise<{ success: boolean; messageAr: string }>;
  disconnectUsbDevice: () => Promise<void>;
  runUsbDiagnostics: (options?: {
    connectionMode?: UsbConnectedDevice['connectionMode'];
    gatewayEndpoint?: string;
    simSlot?: number;
  }) => Promise<UsbDiagnosticsReport>;
  sendSmsViaUsb: (
    recipientPhone: string,
    messageBody: string,
    referenceNumber?: string,
    recipientName?: string,
    category?: MessageTemplateCategory,
    gatewayEndpointOverride?: string
  ) => Promise<{
    success: boolean;
    messageAr?: string;
    record?: OutboundMessageRecord;
    smsUri?: string;
  }>;
  launchBulkDebtSmsCampaign: (customPrefix?: string) => {
    success?: boolean;
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
  completeFirstLaunchSetup: (params: {
    companyNameAr: string;
    companyNameEn?: string;
    logoDataUrl?: string;
    taxNumber?: string;
    phone?: string;
    address?: string;
    city?: string;
    branchNameAr: string;
    warehouseNameAr: string;
    currency: Currency;
    industry: IndustryType;
    uiTheme: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark';
    arabicFont: 'cairo' | 'tajawal' | 'almarai' | 'ibm';
    adminNameAr: string;
    adminUsername: string;
    adminPassword: string;
    idleTimeoutMinutes: number;
  }) => { success: boolean; errorAr?: string };
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

  // Real-Time Connected System Notifications Engine
  systemNotifications: SystemNotification[];
  unreadNotificationsCount: number;
  criticalNotificationsCount: number;
  lastBackupTimestamp: string | null;
  pushLiveNotification: (
    notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'> & { id?: string },
    options?: { showToast?: boolean }
  ) => void;
  markNotificationRead: (id: string) => void;
  toggleNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearReadNotifications: () => void;
  recordBackupCompleted: (isoTimestamp?: string) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  browserNotificationsEnabled: boolean;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  requestBrowserNotificationPermission: () => Promise<boolean>;
  activeToastNotification: RemoteSyncToastSpec | null;
  toastQueue: RemoteSyncToastSpec[];
  dismissToastNotification: (toastId?: string) => void;
  pauseToastTimer: (toastId: string, paused: boolean) => void;
  dispatchToastAndPushNotification: (
    spec: Omit<RemoteSyncToastSpec, 'id'> & { id?: string }
  ) => void;
  soundAlertPrefs: SoundAlertPreferences;
  updateSoundAlertPrefs: (patch: Partial<SoundAlertPreferences>) => void;

  // Automated Daily System Backup & Admin Notification
  autoDailyBackupEnabled: boolean;
  setAutoDailyBackupEnabled: (enabled: boolean) => void;
  lastAutoDailyBackupAt: string | null;
  latestDailyBackupInfo: DailyBackupMetadata | null;
  isRunningDailyBackup: boolean;
  runDailyBackupNow: (trigger?: 'AUTO' | 'MANUAL') => Promise<DailyBackupMetadata | null>;
  downloadLatestDailyBackup: () => {
    success: boolean;
    filename: string;
    sizeBytes: number;
  };
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Localization & UI State
  const [language, setLanguageState] = useState<Language>('ar');
  const [masterSystemConfig, setMasterSystemConfig] = useState<MasterSystemConfig>(() => {
    if (typeof window !== 'undefined') {
      const localSound = loadSoundAlertPreferences(window.localStorage);
      if (localSound) {
        return {
          ...DEFAULT_MASTER_SYSTEM_CONFIG,
          ...(typeof localSound.enabled === 'boolean' ? { soundAlertsEnabled: localSound.enabled } : {}),
          ...(typeof localSound.toastEnabled === 'boolean' ? { soundAlertToastEnabled: localSound.toastEnabled } : {}),
          ...(typeof localSound.securityEnabled === 'boolean' ? { soundAlertSecurityEnabled: localSound.securityEnabled } : {}),
          ...(typeof localSound.volumePercent === 'number' ? { soundAlertVolume: localSound.volumePercent } : {}),
        };
      }
    }
    return DEFAULT_MASTER_SYSTEM_CONFIG;
  });
  const [currency, setCurrencyState] = useState<Currency>(
    DEFAULT_MASTER_SYSTEM_CONFIG.globalDefaultCurrency
  );
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [requestedSettingsTab, setRequestedSettingsTab] = useState<
    'central_hub' | 'templates' | 'company' | 'sound_alerts' | 'backup' | 'system_setup' | null
  >(null);
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
  const [isInitialServerSyncDone, setIsInitialServerSyncDone] = useState(false);
  const [realtimeSyncStatus, setRealtimeSyncStatus] = useState<
    'WS_LIVE' | 'SSE_LIVE' | 'POLLING' | 'RECONNECTING'
  >('POLLING');
  const [syncLatencyMs, setSyncLatencyMs] = useState<number>(0.4);
  const [dbRevision, setDbRevision] = useState<number>(1);
  const [connectedLanDevices, setConnectedLanDevices] = useState<ConnectedLanDevice[]>([]);
  const [pendingSyncQueue, setPendingSyncQueue] = useState<PendingSyncTransaction[]>(() =>
    typeof window !== 'undefined' ? loadPendingSyncQueue(window.localStorage) : []
  );
  const pendingSyncQueueRef = useRef<PendingSyncTransaction[]>(pendingSyncQueue);
  const [isServerSyncing, setIsServerSyncing] = useState<boolean>(false);
  const [offlineSnapshotStats, setOfflineSnapshotStats] = useState<{
    sizeBytes: number;
    updatedAt: string | null;
  }>({ sizeBytes: 0, updatedAt: null });
  const offlineStorageMetrics = useMemo(
    () =>
      computeOfflineStorageMetrics({
        queue: pendingSyncQueue,
        snapshotSizeBytes: offlineSnapshotStats.sizeBytes,
        snapshotUpdatedAt: offlineSnapshotStats.updatedAt,
      }),
    [pendingSyncQueue, offlineSnapshotStats]
  );
  const soundAlertPrefs = useMemo(
    () => normalizeSoundAlertPreferences(masterSystemConfig),
    [masterSystemConfig]
  );
  const updateSoundAlertPrefs = useCallback((patch: Partial<SoundAlertPreferences>) => {
    setMasterSystemConfig((prev) => {
      const normalized = normalizeSoundAlertPreferences(prev, patch);
      if (typeof window !== 'undefined') {
        saveSoundAlertPreferences(window.localStorage, normalized);
      }
      return {
        ...prev,
        soundAlertsEnabled: normalized.enabled,
        soundAlertToastEnabled: normalized.toastEnabled,
        soundAlertSecurityEnabled: normalized.securityEnabled,
        soundAlertVolume: normalized.volumePercent,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);
  const [uiTheme, setUiThemeState] = useState<'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('haseb_ui_theme');
      if (saved === 'corporate_slate' || saved === 'swiss_light' || saved === 'haseb_royal' || saved === 'haseb_sand' || saved === 'obsidian_dark') {
        return saved;
      }
    }
    return 'corporate_slate';
  });
  const setUiTheme = (theme: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark') => {
    setUiThemeState(theme);
    try {
      localStorage.setItem('haseb_ui_theme', theme);
    } catch {
      // ignore storage errors
    }
  };
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [uiFont, setUiFontState] = useState<HasebUiFontId>(() => {
    if (typeof window !== 'undefined') {
      const savedPrimary = localStorage.getItem('haseb_ui_font');
      if (savedPrimary) return normalizeUiFontId(savedPrimary);
      const savedLegacy = localStorage.getItem('haseb_arabic_font');
      if (savedLegacy) return normalizeUiFontId(savedLegacy);
    }
    return 'ibm_plex';
  });
  const setUiFont = useCallback((font: HasebUiFontId) => {
    const normalized = normalizeUiFontId(font);
    setUiFontState(normalized);
    try {
      localStorage.setItem('haseb_ui_font', normalized);
    } catch {
      // ignore
    }
  }, []);

  const [fontScalePercent, setFontScalePercentState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('haseb_font_scale_percent'));
      if (Number.isFinite(saved) && saved >= 90 && saved <= 140) {
        return clampFontScale(saved);
      }
    }
    return DEFAULT_FONT_SCALE;
  });
  const setFontScalePercent = useCallback((val: number | ((prev: number) => number)) => {
    setFontScalePercentState((prev) => {
      const resolved = typeof val === 'function' ? val(prev) : val;
      return clampFontScale(resolved);
    });
  }, []);

  const [windowScalePercent, setWindowScalePercentState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('haseb_window_scale_percent'));
      if (Number.isFinite(saved) && saved >= 90 && saved <= 130) {
        return clampWindowScale(saved);
      }
    }
    return DEFAULT_WINDOW_SCALE;
  });
  const setWindowScalePercent = useCallback((val: number | ((prev: number) => number)) => {
    setWindowScalePercentState((prev) => {
      const resolved = typeof val === 'function' ? val(prev) : val;
      return clampWindowScale(resolved);
    });
  }, []);

  const [tabScalePercent, setTabScalePercentState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('haseb_tab_scale_percent'));
      if (Number.isFinite(saved) && saved >= 85 && saved <= 125) {
        return clampTabScale(saved);
      }
    }
    return DEFAULT_TAB_SCALE;
  });
  const setTabScalePercent = useCallback((val: number | ((prev: number) => number)) => {
    setTabScalePercentState((prev) => {
      const resolved = typeof val === 'function' ? val(prev) : val;
      return clampTabScale(resolved);
    });
  }, []);

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });
  const [browserNotificationsEnabled, setBrowserNotificationsEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('haseb_browser_push_enabled') !== 'false';
    }
    return true;
  });
  const setBrowserNotificationsEnabled = useCallback((enabled: boolean) => {
    setBrowserNotificationsEnabledState(enabled);
    try {
      localStorage.setItem('haseb_browser_push_enabled', enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, []);
  const [toastQueue, setToastQueue] = useState<RemoteSyncToastSpec[]>([]);
  const activeToastNotification = toastQueue[0] || null;
  const toastTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dismissToastNotification = useCallback((toastId?: string) => {
    if (toastId && toastTimersRef.current[toastId]) {
      clearTimeout(toastTimersRef.current[toastId]);
      delete toastTimersRef.current[toastId];
    } else if (!toastId) {
      Object.values(toastTimersRef.current).forEach(clearTimeout);
      toastTimersRef.current = {};
    }
    setToastQueue((prev) => (toastId ? dismissToastFromQueue(prev, toastId) : []));
  }, []);
  const scheduleToastDismiss = useCallback((id: string, delayMs = 4800) => {
    if (toastTimersRef.current[id]) {
      clearTimeout(toastTimersRef.current[id]);
    }
    toastTimersRef.current[id] = setTimeout(() => {
      delete toastTimersRef.current[id];
      setToastQueue((prev) => dismissToastFromQueue(prev, id));
    }, delayMs);
  }, []);
  const pauseToastTimer = useCallback(
    (toastId: string, paused: boolean) => {
      if (paused) {
        if (toastTimersRef.current[toastId]) {
          clearTimeout(toastTimersRef.current[toastId]);
          delete toastTimersRef.current[toastId];
        }
      } else {
        scheduleToastDismiss(toastId, 3200);
      }
    },
    [scheduleToastDismiss]
  );
  const dispatchToastAndPushNotification = useCallback(
    (spec: Omit<RemoteSyncToastSpec, 'id'> & { id?: string }) => {
      const fullSpec: RemoteSyncToastSpec = {
        ...spec,
        id: spec.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setToastQueue((prev) => enqueueToastNotification(prev, fullSpec, 3));
      scheduleToastDismiss(fullSpec.id, 4800);

      if (browserNotificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          triggerNativeBrowserNotification({
            title: language === 'ar' ? fullSpec.titleAr : fullSpec.titleEn,
            body: language === 'ar' ? fullSpec.messageAr : fullSpec.messageEn,
            tag: fullSpec.id,
          }).catch(() => {});
        }
      }
    },
    [browserNotificationsEnabled, language, scheduleToastDismiss]
  );

  const requestBrowserNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        setBrowserNotificationsEnabled(true);
        triggerNativeBrowserNotification({
          title: 'حاسب ERP — تم تفعيل الإشعارات الفورية',
          body: 'ستصلك تنبيهات الفواتير، المبيعات، المخزون، والمزامنة اللحظية تلقائياً.',
          tag: 'haseb-perm-enabled',
        }).catch(() => {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setBrowserNotificationsEnabled]);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return true;
      return localStorage.getItem('haseb_onboarding_completed_v8') === 'true';
    }
    return true;
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
      if (params.get('onboarding') === '1') return true;
    }
    return false;
  });
  const [promoCoupons, setPromoCoupons] = useState<PromoCoupon[]>([]);
  const [promotionalOffers, setPromotionalOffers] = useState<PromotionalOffer[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkHostInfo | null>(null);
  const [outboundMessages, setOutboundMessages] = useState<OutboundMessageRecord[]>([]);
  const [messagingGatewayConfig, setMessagingGatewayConfig] = useState<MessagingGatewayConfig>(
    DEFAULT_MESSAGING_GATEWAY_CONFIG
  );
  const [quickSendModalState, setQuickSendModalState] = useState<QuickSendModalPreset>({
    isOpen: false,
  });

  // WhatsApp Multi-Account In-App Web Station & Live Chats (Clean initial state — zero fake chats)
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccountInstance[]>(() => [
    createCleanWhatsAppDefaultAccount(DEFAULT_CLEAN_COMPANY.nameAr),
  ]);
  const [activeWhatsAppAccountId, setActiveWhatsAppAccountId] = useState<string>('wa-acc-primary');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string>(() =>
    new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const activeWhatsAppAccountObj =
    whatsappAccounts.find((a) => a.id === activeWhatsAppAccountId) ||
    whatsappAccounts[0] ||
    createCleanWhatsAppDefaultAccount();

  const whatsappSession: WhatsAppSessionInfo = activeWhatsAppAccountObj.session;
  const whatsappChats: WhatsAppChat[] = activeWhatsAppAccountObj.chats;

  const [activeWhatsAppChatId, setActiveWhatsAppChatIdState] = useState<string>('');
  const markWhatsAppChatRead = useCallback((chatId: string) => {
    if (!chatId) return;
    setWhatsappAccounts((prev) => {
      let modified = false;
      const next = prev.map((acc) => {
        const hasUnread = acc.chats.some((c) => c.id === chatId && c.unreadCount > 0);
        if (!hasUnread) return acc;
        modified = true;
        return {
          ...acc,
          chats: acc.chats.map((c) =>
            c.id === chatId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c
          ),
        };
      });
      return modified ? next : prev;
    });
  }, []);
  const setActiveWhatsAppChatId = useCallback(
    (id: string) => {
      setActiveWhatsAppChatIdState(id);
      if (id) {
        markWhatsAppChatRead(id);
      }
    },
    [markWhatsAppChatRead]
  );

  // USB Mobile Phone Bridge (Real Hardware State — never seeded with fake Samsung data)
  const [usbConnectedDevice, setUsbConnectedDevice] = useState<UsbConnectedDevice>(() =>
    createDisconnectedUsbDevice()
  );
  const [usbDiagnosticsReport, setUsbDiagnosticsReport] = useState<UsbDiagnosticsReport | null>(null);
  const activeWebSerialPortRef = useRef<any>(null);

  const updateUsbConnectedDevice = (patch: Partial<UsbConnectedDevice>) => {
    setUsbConnectedDevice((prev) => ({ ...prev, ...patch }));
  };

  const refreshUsbConnectedDevice = useCallback(async (): Promise<UsbConnectedDevice> => {
    // Preserve live Web Serial active session if already connected in browser
    if (activeWebSerialPortRef.current?.writable) {
      return usbConnectedDevice;
    }
    const mergePreservingSimSlot = (nextDev: UsbConnectedDevice): UsbConnectedDevice => {
      setUsbConnectedDevice((prev) => {
        if (prev.id && nextDev.id && prev.id === nextDev.id) {
          return {
            ...nextDev,
            simSlot: prev.simSlot === 2 ? 2 : 1,
          };
        }
        return nextDev;
      });
      return nextDev;
    };
    try {
      const res = await fetch('/api/v1/usb/device');
      if (res.ok) {
        const data = await res.json();
        if (data?.device) {
          return mergePreservingSimSlot(data.device);
        }
      }
    } catch {}
    // Fallback check for previously granted WebUSB devices in browser
    try {
      const usbApi = (navigator as any)?.usb;
      if (usbApi?.getDevices) {
        const paired = await usbApi.getDevices();
        if (Array.isArray(paired) && paired.length > 0) {
          const d = paired[0];
          const detected: UsbConnectedDevice = {
            ...createDisconnectedUsbDevice(
              'تم التعرف على الجوال عبر متصفح WebUSB. للإرسال المباشر استخدم Web Serial (AT+CMGS) أو ADB أو بوابة HTTP.'
            ),
            id: `webusb-${d.vendorId}-${d.productId}`,
            model: d.productName || `${lookupUsbVendorName(d.vendorId)} USB Device`,
            manufacturer: d.manufacturerName || lookupUsbVendorName(d.vendorId),
            serialNumber: d.serialNumber || `VID_${d.vendorId?.toString(16)}`,
            port: `WebUSB (${d.vendorId?.toString(16).padStart(4, '0')}:${d.productId?.toString(16).padStart(4, '0')})`,
            connectionMode: 'DIRECT_USB_CABLE',
            status: 'AUTHORIZING',
            detectionSource: 'WEB_USB',
            usbVendorId: d.vendorId,
            usbProductId: d.productId,
            connectedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };
          return mergePreservingSimSlot(detected);
        }
      }
    } catch {}
    const fallback = createDisconnectedUsbDevice();
    setUsbConnectedDevice(fallback);
    return fallback;
  }, [usbConnectedDevice]);

  useEffect(() => {
    void refreshUsbConnectedDevice();
    const usbApi = typeof navigator !== 'undefined' ? (navigator as any).usb : undefined;
    const serialApi = typeof navigator !== 'undefined' ? (navigator as any).serial : undefined;
    const handleUsbConnect = () => {
      void refreshUsbConnectedDevice();
    };
    const handleUsbDisconnect = () => {
      activeWebSerialPortRef.current = null;
      void fetch('/api/v1/usb/disconnect', { method: 'POST' }).catch(() => {});
      void refreshUsbConnectedDevice();
    };
    usbApi?.addEventListener?.('connect', handleUsbConnect);
    usbApi?.addEventListener?.('disconnect', handleUsbDisconnect);
    serialApi?.addEventListener?.('connect', handleUsbConnect);
    serialApi?.addEventListener?.('disconnect', handleUsbDisconnect);
    return () => {
      usbApi?.removeEventListener?.('connect', handleUsbConnect);
      usbApi?.removeEventListener?.('disconnect', handleUsbDisconnect);
      serialApi?.removeEventListener?.('connect', handleUsbConnect);
      serialApi?.removeEventListener?.('disconnect', handleUsbDisconnect);
    };
  }, []);

  // Lightweight live cable polling while Communications module is open (complements WebSocket push)
  useEffect(() => {
    if (activeTab !== 'communications') return;
    void refreshUsbConnectedDevice();
    const timer = setInterval(() => {
      void refreshUsbConnectedDevice();
    }, 3500);
    return () => clearInterval(timer);
  }, [activeTab]);

  // Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfers
  const [branchNodes, setBranchNodes] = useState<BranchNodeInfo[]>([]);
  const [interBranchTransfers, setInterBranchTransfers] = useState<InterBranchTransferRequest[]>([]);
  const [isCrossBranchModalOpen, setIsCrossBranchModalOpen] = useState<boolean>(false);
  const [crossBranchModalSku, setCrossBranchModalSku] = useState<string | null>(null);

  // Real-Time Connected Notifications Engine State (Persisted across reload & navigation)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('haseb_notif_read_ids_v1');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('haseb_notif_dismissed_ids_v1');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [liveEventNotifications, setLiveEventNotifications] = useState<SystemNotification[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('haseb_notif_live_events_v1');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 25) : [];
    } catch {
      return [];
    }
  });
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('rlm_last_backup_timestamp');
    } catch {
      return null;
    }
  });
  const [autoDailyBackupEnabled, setAutoDailyBackupEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('haseb_auto_daily_backup_enabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [lastAutoDailyBackupAt, setLastAutoDailyBackupAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('haseb_last_auto_daily_backup_at');
    } catch {
      return null;
    }
  });
  const [latestDailyBackupInfo, setLatestDailyBackupInfo] = useState<DailyBackupMetadata | null>(
    null
  );
  const [isRunningDailyBackup, setIsRunningDailyBackup] = useState(false);
  const dailyBackupInFlightRef = useRef(false);
  const notifiedBackupIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem('haseb_notif_read_ids_v1', JSON.stringify(readNotificationIds.slice(-150)));
    } catch {
      // ignore storage errors
    }
  }, [readNotificationIds]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'haseb_notif_dismissed_ids_v1',
        JSON.stringify(dismissedNotificationIds.slice(-150))
      );
    } catch {
      // ignore storage errors
    }
  }, [dismissedNotificationIds]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'haseb_notif_live_events_v1',
        JSON.stringify(liveEventNotifications.slice(0, 25))
      );
    } catch {
      // ignore storage errors
    }
  }, [liveEventNotifications]);

  const pushLiveNotification = useCallback(
    (
      notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'> & { id?: string },
      options: { showToast?: boolean } = {}
    ) => {
      const entryId =
        notif.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const entry: SystemNotification = {
        ...notif,
        id: entryId,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      setLiveEventNotifications((prev) => [entry, ...prev].slice(0, 25));
      if (options.showToast !== false) {
        dispatchToastAndPushNotification({
          id: `toast-${entryId}`,
          category: entry.category,
          severity: entry.severity,
          titleAr: entry.titleAr,
          titleEn: entry.titleEn,
          messageAr: entry.messageAr,
          messageEn: entry.messageEn,
          actionType: (entry.actionType as NotificationActionType | undefined) || 'COMMUNICATIONS',
        });
      }
    },
    [dispatchToastAndPushNotification]
  );

  const recordBackupCompleted = useCallback((isoTimestamp?: string) => {
    const ts = isoTimestamp || new Date().toISOString();
    setLastBackupTimestamp(ts);
    try {
      localStorage.setItem('rlm_last_backup_timestamp', ts);
    } catch {
      // ignore
    }
    setDismissedNotificationIds((prev) => prev.filter((id) => id !== 'alert-system-backup-needed'));
  }, []);

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

  // Sync HTML dir, lang, theme, density, font, and harmonized scale CSS vars globally across ALL devices
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => {
    const root = document.documentElement;
    root.dir = direction;
    root.lang = language;
    root.dataset.erpTheme = uiTheme;
    root.dataset.erpDensity = uiDensity;
    root.dataset.erpFont = uiFont;
    if (uiTheme === 'obsidian_dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('haseb_ui_theme', uiTheme);
      localStorage.setItem('haseb_ui_font', uiFont);
    } catch {
      // ignore storage errors
    }
  }, [direction, language, uiTheme, uiDensity, uiFont]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const applyResponsiveScaleVars = () => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const vars = computeViewportAwareScaleCssVars(fontScalePercent, windowScalePercent, vw);
      const tabVars = computeTabLayoutCssVars(tabScalePercent);
      const isMobileOrTablet = vw < 1024;
      const root = document.documentElement;
      root.style.setProperty('--erp-font-scale', String(vars.fontScaleRatio));
      root.style.setProperty('--erp-window-scale', String(vars.windowScaleRatio));
      root.style.setProperty('--erp-root-font-px', `${vars.rootFontSizePx}px`);
      root.style.setProperty('--erp-spacing-unit', `${vars.spacingUnitRem}rem`);
      root.style.setProperty('--erp-sidebar-width', `${vars.sidebarWidthPx}px`);
      root.style.setProperty('--erp-navbar-height', `${vars.navbarHeightPx}px`);
      root.style.setProperty(
        '--erp-tab-scale',
        String(isMobileOrTablet ? vars.windowScaleRatio : tabVars.tabScaleRatio)
      );
      root.style.setProperty(
        '--erp-tab-py',
        `${isMobileOrTablet ? vars.tabPadYRem : tabVars.tabPadYRem}rem`
      );
      root.style.setProperty(
        '--erp-tab-px',
        `${isMobileOrTablet ? vars.tabPadXRem : tabVars.tabPadXRem}rem`
      );
      root.style.setProperty(
        '--erp-tab-font-size',
        `${isMobileOrTablet ? vars.tabFontSizeRem : tabVars.tabFontSizeRem}rem`
      );
      root.style.setProperty(
        '--erp-tab-min-h',
        `${isMobileOrTablet ? vars.tabMinHeightPx : tabVars.tabMinHeightPx}px`
      );
      root.style.setProperty(
        '--erp-card-gap',
        `${isMobileOrTablet ? 0.5 : tabVars.cardGapRem}rem`
      );
      root.style.setProperty(
        '--erp-section-padding',
        `${isMobileOrTablet ? 0.65 : tabVars.sectionPaddingRem}rem`
      );
      root.dataset.erpFontScale = String(fontScalePercent);
      root.dataset.erpWindowScale = String(windowScalePercent);
      root.dataset.erpTabScale = String(tabScalePercent);
      root.dataset.erpDeviceClass = vars.deviceClass;
    };

    applyResponsiveScaleVars();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', applyResponsiveScaleVars);
    }
    try {
      localStorage.setItem('haseb_font_scale_percent', String(fontScalePercent));
      localStorage.setItem('haseb_window_scale_percent', String(windowScalePercent));
      localStorage.setItem('haseb_tab_scale_percent', String(tabScalePercent));
    } catch {
      // ignore
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', applyResponsiveScaleVars);
      }
    };
  }, [fontScalePercent, windowScalePercent, tabScalePercent]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: keyof typeof TRANSLATIONS.en): string => {
    return TRANSLATIONS[language][key] || TRANSLATIONS.en[key] || key;
  };

  // Clean State Stores (Zero pre-loaded demo data)
  const [tenants, setTenants] = useState<Tenant[]>([DEFAULT_CLEAN_TENANT]);
  const [currentTenant, setCurrentTenantState] = useState<Tenant>(DEFAULT_CLEAN_TENANT);
  const [company, setCompany] = useState<Company>(DEFAULT_CLEAN_COMPANY);
  const [branches, setBranches] = useState<Branch[]>([DEFAULT_CLEAN_BRANCH]);
  const [currentBranch, setCurrentBranch] = useState<Branch>(DEFAULT_CLEAN_BRANCH);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([DEFAULT_CLEAN_WAREHOUSE]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse>(DEFAULT_CLEAN_WAREHOUSE);
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_CLEAN_USER);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Authentication, Single General Manager Default Membership, Brute-Force Lockout & Terminal Lock
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return true;
      if (sessionStorage.getItem('rlm_erp_auth_session')) return true;
    }
    return false;
  });
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutesState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('haseb_idle_timeout_min'));
      if (Number.isFinite(saved) && saved >= 1 && saved <= 240) return saved;
    }
    return 15;
  });
  const setIdleTimeoutMinutes = (mins: number) => {
    const safe = Math.max(1, Math.min(240, Math.round(mins || 15)));
    setIdleTimeoutMinutesState(safe);
    try {
      localStorage.setItem('haseb_idle_timeout_min', String(safe));
    } catch {
      // ignore
    }
  };
  const [failedLoginAttempts, setFailedLoginAttempts] = useState<number>(0);
  const [loginLockoutUntilMs, setLoginLockoutUntilMs] = useState<number>(0);
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

  // Strict Single-Device DRM Hardware Binding, Monotonic Clock Guard & Single-Use Serial Registry
  const [trialBaseTimestamp, setTrialBaseTimestamp] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('haseb_drm_trial_start_ms_v1'));
      if (Number.isFinite(saved) && saved > 1700000000000) return saved;
      const now = Date.now();
      try {
        localStorage.setItem('haseb_drm_trial_start_ms_v1', String(now));
      } catch {}
      return now;
    }
    return Date.now();
  });
  const [simulatedTrialDaysElapsed, setSimulatedTrialDaysElapsed] = useState<number>(0);
  const [isSimulatedTrialExpired, setIsSimulatedTrialExpired] = useState<boolean>(false);
  const [isSimulatedForeignDevice, setIsSimulatedForeignDevice] = useState<boolean>(false);
  const [isSimulatedClockTampered, setIsSimulatedClockTampered] = useState<boolean>(false);
  const [simulatedTamperedComponent, setSimulatedTamperedComponent] = useState<
    'NONE' | 'MOTHERBOARD' | 'CPU' | 'GPU' | 'DISK_NVME' | 'SYSTEM_UUID'
  >('NONE');

  const [livePrimaryHardware, setLivePrimaryHardware] = useState<HardwareFingerprint>(() =>
    detectRealHardwareFingerprint()
  );

  // Persisted Bound Hardware Baseline (detects hardware replacement or DB copy to another PC)
  const [boundHardware, setBoundHardware] = useState<HardwareFingerprint>(() => {
    const detected = detectRealHardwareFingerprint();
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('haseb_drm_bound_hw_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.motherboardSerial && parsed?.cpuProcessorId && parsed?.systemUuid) {
            return parsed;
          }
        }
        localStorage.setItem('haseb_drm_bound_hw_v1', JSON.stringify(detected));
      } catch {}
    }
    return detected;
  });

  // Persisted High-Water Monotonic Clock Guard (tamper-sealed)
  const [lastObservedMaxClockMs, setLastObservedMaxClockMs] = useState<number>(() => {
    const initialReq = generateMachineRequestCode(PRIMARY_DEVICE_HARDWARE);
    const now = Date.now();
    if (typeof window !== 'undefined') {
      try {
        const savedClock = Number(localStorage.getItem('haseb_drm_clock_hwm_v1'));
        const savedTag = localStorage.getItem('haseb_drm_clock_tag_v1') || '';
        if (
          Number.isFinite(savedClock) &&
          savedClock > 0 &&
          verifyClockHighWaterIntegrityTag(savedClock, savedTag, initialReq)
        ) {
          return savedClock;
        }
        localStorage.setItem('haseb_drm_clock_hwm_v1', String(now));
        localStorage.setItem(
          'haseb_drm_clock_tag_v1',
          computeClockHighWaterIntegrityTag(now, initialReq)
        );
      } catch {}
    }
    return now;
  });

  // Persisted Consumed Single-Use Activation Serials Registry
  const [usedSerialTokens, setUsedSerialTokens] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('haseb_drm_used_serials_v1');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {}
    }
    return [];
  });

  const [activeLicenseSerial, setActiveLicenseSerial] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('haseb_drm_active_serial_v1');
    }
    return null;
  });
  const [antiTheftShieldEnabled, setAntiTheftShieldEnabled] = useState<boolean>(true);
  const [blockedInspectCount, setBlockedInspectCount] = useState<number>(0);
  const [lastSecurityAlert, setLastSecurityAlert] = useState<string | null>(null);
  const keygenCounterRef = useRef<number>(0);

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
          setBoundHardware(detected);
          try {
            localStorage.setItem('haseb_drm_bound_hw_v1', JSON.stringify(detected));
          } catch {}
          return detected;
        }
      }
    } catch {
      // Fallback to client-side WebGL/CPU/Canvas hardware probe
    }
    const clientDetected = detectRealHardwareFingerprint();
    setLivePrimaryHardware(clientDetected);
    setBoundHardware(clientDetected);
    try {
      localStorage.setItem('haseb_drm_bound_hw_v1', JSON.stringify(clientDetected));
    } catch {}
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
    // Hydrate server DRM consumed serial tokens and monotonic server clock high-water mark
    fetch('/api/v1/security/drm-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((drm) => {
        if (!drm?.success) return;
        if (Array.isArray(drm.usedSerialTokens) && drm.usedSerialTokens.length > 0) {
          setUsedSerialTokens((prev) => {
            const merged = Array.from(new Set([...prev, ...drm.usedSerialTokens]));
            try {
              localStorage.setItem('haseb_drm_used_serials_v1', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
        const serverMaxClock = Math.max(
          Number(drm.maxObservedClockMs) || 0,
          Number(drm.serverNowMs) || 0
        );
        if (serverMaxClock > 0) {
          setLastObservedMaxClockMs((prev) => {
            const next = Math.max(prev, serverMaxClock);
            try {
              const req = generateMachineRequestCode(boundHardware);
              localStorage.setItem('haseb_drm_clock_hwm_v1', String(next));
              localStorage.setItem(
                'haseb_drm_clock_tag_v1',
                computeClockHighWaterIntegrityTag(next, req)
              );
            } catch {}
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  const [isLanPortalOpen, setIsLanPortalOpen] = useState<boolean>(false);
  const openLanPortal = () => setIsLanPortalOpen(true);
  const closeLanPortal = () => setIsLanPortalOpen(false);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const openShiftModal = useCallback(() => setIsShiftModalOpen(true), []);
  const closeShiftModal = useCallback(() => setIsShiftModalOpen(false), []);

  useEffect(() => {
    const handleLegacyOpenShift = () => setIsShiftModalOpen(true);
    window.addEventListener('haseb-open-close-shift-modal', handleLegacyOpenShift);
    return () => window.removeEventListener('haseb-open-close-shift-modal', handleLegacyOpenShift);
  }, []);

  // Update & persist monotonic clock high-water mark continuously (anti-rollback protection)
  useEffect(() => {
    const updateClockHwm = () => {
      if (isSimulatedClockTampered) return;
      const now = Date.now();
      setLastObservedMaxClockMs((prev) => {
        if (now <= prev) return prev;
        try {
          const req = generateMachineRequestCode(boundHardware);
          localStorage.setItem('haseb_drm_clock_hwm_v1', String(now));
          localStorage.setItem(
            'haseb_drm_clock_tag_v1',
            computeClockHighWaterIntegrityTag(now, req)
          );
        } catch {}
        return now;
      });
    };
    updateClockHwm();
    const timer = setInterval(updateClockHwm, 30000);
    return () => clearInterval(timer);
  }, [isSimulatedClockTampered, boundHardware]);

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
      setBoundHardware(enriched);
      try {
        localStorage.setItem('haseb_drm_bound_hw_v1', JSON.stringify(enriched));
      } catch {}
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
      setBoundHardware(customHw);
      try {
        localStorage.setItem('haseb_drm_bound_hw_v1', JSON.stringify(customHw));
      } catch {}
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

  const isLanRemoteClient =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    !isSimulatedForeignDevice &&
    simulatedTamperedComponent === 'NONE';

  const protectionState: SystemProtectionEvaluation = evaluateSystemProtectionState({
    hardware: hardwareFingerprint,
    boundHardware,
    trialStartedAtMs: effectiveTrialStartMs,
    trialTotalDays: 30,
    activeSerial: activeLicenseSerial,
    nowMs: Date.now(),
    lastSeenClockMs: lastObservedMaxClockMs,
    forceTrialExpired: isSimulatedTrialExpired,
    forceClockTampered: isSimulatedClockTampered,
    isLanRemoteClient,
  });

  const login = (usernameInput: string, passwordInput: string) => {
    const nowMs = Date.now();
    if (loginLockoutUntilMs > nowMs) {
      const remSec = Math.max(1, Math.ceil((loginLockoutUntilMs - nowMs) / 1000));
      return {
        success: false,
        errorAr: `تم تعليق محاولات الدخول مؤقتاً لأسباب أمنية. يرجى الانتظار ${remSec} ثانية.`,
        errorEn: `Login temporarily locked for security. Please wait ${remSec} seconds.`,
      };
    }

    const cleanUser = usernameInput.trim().toLowerCase();
    const found = userAccounts.find(
      (acc) =>
        acc.username.toLowerCase() === cleanUser &&
        verifyUserPassword(passwordInput, acc.password, acc.username)
    );
    if (!found) {
      const lockoutEval = evaluateLoginAttemptLockout(failedLoginAttempts, loginLockoutUntilMs, nowMs);
      setFailedLoginAttempts(lockoutEval.nextFailedCount);
      setLoginLockoutUntilMs(lockoutEval.nextLockUntilMs);
      if (lockoutEval.isLocked) {
        return {
          success: false,
          errorAr: `تجاوزت الحد المسموح (5 محاولات فاشلة). تم قفل تسجيل الدخول لمدة ${lockoutEval.remainingSec} ثانية.`,
          errorEn: `Exceeded maximum login attempts (5). Locked for ${lockoutEval.remainingSec} seconds.`,
        };
      }
      const remainingTries = Math.max(1, 5 - lockoutEval.nextFailedCount);
      return {
        success: false,
        errorAr: `بيانات الدخول غير صحيحة. المحاولات المتبقية قبل القفل المؤقت: ${remainingTries}`,
        errorEn: `Invalid username or password. Remaining attempts: ${remainingTries}`,
      };
    }
    if (!found.isActive) {
      return {
        success: false,
        errorAr: 'تم إيقاف هذه العضوية من قبل المدير العام',
        errorEn: 'This user membership is currently suspended by the administrator',
      };
    }

    setFailedLoginAttempts(0);
    setLoginLockoutUntilMs(0);

    // Upgrade legacy plaintext passwords cleanly to salted digest on first login
    const securedPassword = found.password.startsWith('HSH-V1-')
      ? found.password
      : hashUserPassword(passwordInput, found.username);

    const updatedAccount: UserAccount = {
      ...found,
      password: securedPassword,
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
    setIsTerminalLocked(false);
    try {
      sessionStorage.setItem('rlm_erp_auth_session', updatedAccount.username);
    } catch {
      // Ignore storage errors
    }

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
        userName: updatedAccount.nameAr || updatedAccount.name,
        action: 'USER_LOGIN_SUCCESS',
        module: 'SECURITY',
        entityType: 'UserAccount',
        entityId: updatedAccount.username,
        details: `Authenticated [${updatedAccount.username}] (${updatedAccount.role}) on Hardware Node [${protectionState.machineRequestCode}].`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsTerminalLocked(false);
    try {
      sessionStorage.removeItem('rlm_erp_auth_session');
    } catch {
      // Ignore storage errors
    }
  };

  const lockTerminal = () => {
    if (isAuthenticated) {
      setIsTerminalLocked(true);
    }
  };

  const unlockTerminal = (passwordInput: string) => {
    const valid = verifyUserPassword(passwordInput, currentAccount.password, currentAccount.username);
    if (!valid) {
      return {
        success: false,
        errorAr: 'كلمة المرور غير صحيحة لإلغاء قفل الشاشة',
        errorEn: 'Incorrect password to unlock terminal',
      };
    }
    setIsTerminalLocked(false);
    return { success: true };
  };

  const switchUserAccount = (accountId: string) => {
    const target = userAccounts.find((a) => a.id === accountId);
    if (!target || !target.isActive) return;
    setCurrentAccount(target);
    setCurrentUser({
      id: target.id,
      tenantId: target.tenantId,
      username: target.username,
      email: target.email,
      name: language === 'ar' ? target.nameAr : target.name,
      nameAr: target.nameAr,
      role: target.role,
      branchId: target.branchId,
      isActive: target.isActive,
      allowedModules: target.allowedModules,
      permissions: target.permissions,
    });
    if (target.allowedModules.length > 0 && !target.allowedModules.includes(activeTab)) {
      setActiveTab(target.allowedModules[0]);
    }
    try {
      sessionStorage.setItem('rlm_erp_auth_session', target.username);
    } catch {}
  };

  const changeUserPassword = (accountId: string, newPassword: string) => {
    const cleanPwd = (newPassword || '').trim();
    if (cleanPwd.length < 4) {
      return { success: false, errorAr: 'يجب أن لا تقل كلمة المرور الجديدة عن 4 أحرف.' };
    }
    const target = userAccounts.find((a) => a.id === accountId);
    if (!target) return { success: false, errorAr: 'العضوية غير موجودة.' };
    const hashed = hashUserPassword(cleanPwd, target.username);
    setUserAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, password: hashed } : a)));
    if (currentAccount.id === accountId) {
      setCurrentAccount((prev) => ({ ...prev, password: hashed }));
    }
    return { success: true };
  };

  const addUserAccount = (acc: Omit<UserAccount, 'id' | 'tenantId'>) => {
    const securedPassword = acc.password.startsWith('HSH-V1-')
      ? acc.password
      : hashUserPassword(acc.password, acc.username);
    const newAcc: UserAccount = {
      ...acc,
      password: securedPassword,
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
      return currentAccount.role === 'SUPER_ADMIN';
    }
    if (!isModuleVisibleUnderMasterConfig(moduleId, masterSystemConfig, false)) {
      return false;
    }
    return evaluateUserModuleAccess(currentAccount, moduleId, masterSystemConfig);
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
    if (enable !== false && !['pos', 'inventory', 'sales', 'accounting', 'reportsAndAI'].includes(activeTab)) {
      setActiveTab('pos');
    }
  };

  const getVisibleModules = (): string[] => {
    if (masterSystemConfig.sectorModeEnabled) {
      return getVisibleModulesList(true).filter((modId) => hasModuleAccess(modId));
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

    if (protectionState.status === 'CLOCK_TAMPERED') {
      return {
        valid: false,
        reason: 'EXPIRED',
      };
    }

    // Check if input is an ASF V2 Base64 Signed Token
    if (cleanInput.startsWith('{') || cleanInput.length > 80) {
      try {
        const rawJson = cleanInput.startsWith('{')
          ? cleanInput
          : atob(cleanInput);
        const parsedToken = JSON.parse(rawJson);
        if (parsedToken && parsedToken.version === '2.0' && parsedToken.signature) {
          const v2ConsumeToken = `SER-V2-${parsedToken.claims?.licenseUuid || parsedToken.signature.slice(0, 12)}`;
          if (usedSerialTokens.includes(v2ConsumeToken)) {
            return {
              valid: false,
              reason: 'ALREADY_USED_ONCE',
              boundDeviceToken: parsedToken.boundDeviceFingerprintHash?.slice(0, 8),
            };
          }
          const nextTokens = [...usedSerialTokens, v2ConsumeToken];
          setUsedSerialTokens(nextTokens);
          const serialLabel = `ASF-V2-${parsedToken.claims.edition}-${parsedToken.claims.licenseUuid.slice(0, 8).toUpperCase()}`;
          localStorage.setItem('asf_v2_signed_token', btoa(JSON.stringify(parsedToken)));
          localStorage.setItem('haseb_drm_used_serials_v1', JSON.stringify(nextTokens));
          localStorage.setItem('haseb_drm_active_serial_v1', serialLabel);
          setActiveLicenseSerial(serialLabel);
          setIsSimulatedTrialExpired(false);
          fetch('/api/v1/security/consume-serial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consumptionToken: v2ConsumeToken,
              requestCode: protectionState.machineRequestCode,
              clientClockMs: Date.now(),
            }),
          }).catch(() => {});
          return {
            valid: true,
            consumptionToken: v2ConsumeToken,
            durationDays: parsedToken.claims.isLifetime ? 36500 : 365,
            durationLabelAr: parsedToken.claims.isLifetime ? 'ترخيص رسمي دائم (V2) — استخدام وحيد' : 'ترخيص مؤسسي معتمد (V2) — استخدام وحيد',
            durationLabelEn: 'ASF Secure Enterprise License V2 (Single-Use)',
            remainingDays: 365,
            isLifetime: parsedToken.claims.isLifetime,
            boundDeviceToken: parsedToken.boundDeviceFingerprintHash.slice(0, 8),
          };
        }
      } catch {
        // Fall through to standard serial verification
      }
    }

    const result = verifyOneTimeSerialActivation({
      serial,
      currentRequestCode: protectionState.machineRequestCode,
      usedSerialTokens,
      nowMs: Date.now(),
    });
    if (result.valid && result.consumptionToken) {
      const normalizedSerial = serial.trim().toUpperCase();
      const nextTokens = Array.from(new Set([...usedSerialTokens, result.consumptionToken]));
      setUsedSerialTokens(nextTokens);
      setActiveLicenseSerial(normalizedSerial);
      setIsSimulatedTrialExpired(false);
      setBoundHardware(hardwareFingerprint);
      try {
        localStorage.setItem('haseb_drm_used_serials_v1', JSON.stringify(nextTokens));
        localStorage.setItem('haseb_drm_active_serial_v1', normalizedSerial);
        localStorage.setItem('haseb_drm_bound_hw_v1', JSON.stringify(hardwareFingerprint));
      } catch {}
      fetch('/api/v1/security/consume-serial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumptionToken: result.consumptionToken,
          requestCode: protectionState.machineRequestCode,
          clientClockMs: Date.now(),
        }),
      }).catch(() => {});
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'ONE_TIME_HARDWARE_LICENSE_ACTIVATED',
          module: 'SECURITY',
          entityType: 'LicenseSerial',
          entityId: result.boundDeviceToken || 'NODE',
          details: `Consumed single-use hardware license (${result.durationLabelEn}) bound exclusively to [${protectionState.machineRequestCode}].`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    return result;
  };

  const clearActiveLicense = () => {
    setActiveLicenseSerial(null);
    try {
      localStorage.removeItem('haseb_drm_active_serial_v1');
    } catch {}
  };

  const generateDeveloperActivationKey = (
    requestCode: string,
    preset: LicenseDurationPreset,
    customDays = 30
  ) => {
    try {
      // Subtract unique counter minutes so multiple keys generated within the same minute are cryptographically distinct
      keygenCounterRef.current += 1;
      const offsetMs = (keygenCounterRef.current - 1) * 60000;
      const serial = generateActivationSerial(requestCode, preset, customDays, Date.now() - offsetMs);
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

  // Inventory & Barcode (Clean Initial State)
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [products, setProducts] = useState<Product[]>([]);
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>([]);
  const [traceabilityEvents, setTraceabilityEvents] = useState<TraceabilityEvent[]>([]);

  // Purchasing & Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptNote[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);

  // Sales, Commercial Pipeline, Returns, Warranty & POS
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturnDoc[]>([]);
  const [warrantyTickets, setWarrantyTickets] = useState<WarrantyMaintenanceTicket[]>([]);
  const [salesPipelineDocs, setSalesPipelineDocs] = useState<SalesPipelineDoc[]>([]);
  const [currentShift, setCurrentShift] = useState<POSShift>(DEFAULT_CLEAN_SHIFT);
  const [shiftHistory, setShiftHistory] = useState<POSShift[]>([]);
  const [posCart, setPosCart] = useState<InvoiceItem[]>([]);
  const [holdBills, setHoldBills] = useState<POSHoldBill[]>([]);
  const [kitchenTickets, setKitchenTickets] = useState<KitchenOrderTicket[]>([]);

  // Accounting, Bank Reconciliation, PDC & Multi-Currency
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>(SEED_CHART_OF_ACCOUNTS);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [bankStatementLines, setBankStatementLines] = useState<BankStatementLine[]>([]);
  const [postDatedChecks, setPostDatedChecks] = useState<PostDatedCheck[]>([]);

  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRate[]>([
    {
      currency: 'YER',
      nameAr: 'ريال يمني',
      nameEn: 'Yemeni Rial',
      symbol: 'ر.ي',
      rateToSAR: 0.007,
      previousRateToSAR: 0.007,
      foreignMonetaryBalance: 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      currency: 'SAR',
      nameAr: 'ريال سعودي',
      nameEn: 'Saudi Riyal',
      symbol: 'ر.س',
      rateToSAR: 1.0,
      previousRateToSAR: 1.0,
      foreignMonetaryBalance: 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      currency: 'USD',
      nameAr: 'دولار أمريكي',
      nameEn: 'US Dollar',
      symbol: '$',
      rateToSAR: 3.76,
      previousRateToSAR: 3.75,
      foreignMonetaryBalance: 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      currency: 'EUR',
      nameAr: 'يورو أوروبي',
      nameEn: 'Euro',
      symbol: '€',
      rateToSAR: 4.11,
      previousRateToSAR: 4.06,
      foreignMonetaryBalance: 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      currency: 'AED',
      nameAr: 'درهم إماراتي',
      nameEn: 'UAE Dirham',
      symbol: 'د.إ',
      rateToSAR: 1.021,
      previousRateToSAR: 1.02,
      foreignMonetaryBalance: 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    {
      currency: 'EGP',
      nameAr: 'جنيه مصري',
      nameEn: 'Egyptian Pound',
      symbol: 'ج.م',
      rateToSAR: 0.077,
      previousRateToSAR: 0.079,
      foreignMonetaryBalance: 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
  ]);

  const [costCenterBudgets, setCostCenterBudgets] = useState<CostCenterBudget[]>([]);

  // Business Modules
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [boms] = useState<BillOfMaterials[]>(SEED_BOMS);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [qualityInspections, setQualityInspections] = useState<QualityInspection[]>([]);
  const [crmLeads, setCrmLeads] = useState<CRMLead[]>([]);
  const [ecommerceOrders, setEcommerceOrders] = useState<EcommerceOrder[]>([]);
  const [workflowApprovals, setWorkflowApprovals] = useState<WorkflowApproval[]>([]);

  // AI Copilot
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'ai-init',
      sender: 'assistant',
      text: language === 'ar'
        ? 'مرحباً بك في مساعد نظام حاسب الذكي! يمكنك سؤالي عن مؤشرات المبيعات، أصناف المخزون، أو تحليل القيود المحاسبية.'
        : 'Welcome to Haseb ERP AI Copilot! Ask me about sales velocity, stock replenishment, or financial summaries.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isAILoading, setIsAILoading] = useState(false);

  const isHydratedRef = useRef(false);
  const remoteSyncInFlightRef = useRef<boolean>(false);
  const remoteSyncedKeysRef = useRef<Set<string>>(new Set());

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

    // If channel is WHATSAPP, immediately append the sent message into the active in-app WhatsApp account's chats!
    if (params.channel === 'WHATSAPP') {
      const attachmentMap: Record<string, WhatsAppChatMessage['attachmentType']> = {
        INVOICE: 'INVOICE',
        RECEIPT_VOUCHER: 'RECEIPT',
        DEBT_REMINDER: 'DEBT_REMINDER',
        WARRANTY_RMA: 'WARRANTY',
      };
      const mappedAttachment = attachmentMap[params.category] || 'NONE';

      let targetChatIdCreated = '';
      setWhatsappAccounts((prevAccounts) =>
        prevAccounts.map((acc) => {
          if (acc.id !== activeWhatsAppAccountObj.id) return acc;
          const appended = appendMessageToWhatsAppChats(acc.chats, {
            recipientName: params.recipientName || 'عميل / مستلم',
            recipientPhone: params.recipientPhone,
            messageText: params.messageBody.trim(),
            attachmentType: mappedAttachment,
            referenceNumber: params.referenceNumber,
            sender: 'ME',
          });
          targetChatIdCreated = appended.targetChatId;
          return {
            ...acc,
            messagesDispatchedCount: acc.messagesDispatchedCount + 1,
            lastActiveAt: 'الآن',
            chats: appended.updatedChats,
          };
        })
      );
      if (targetChatIdCreated) {
        setActiveWhatsAppChatId(targetChatIdCreated);
      }
    } else if (params.channel === 'SMS') {
      setUsbConnectedDevice((prev) => ({
        ...prev,
        messagesSentCount: prev.messagesSentCount + 1,
      }));
    }

    try {
      await fetch('/api/v1/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRecord,
          openDirectLink: false,
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
        details: `Dispatched in-app ${params.channel} (${params.category}) via [${activeWhatsAppAccountObj.accountLabel}] to ${newRecord.recipientName} [${newRecord.normalizedPhone}]${params.referenceNumber ? ` Ref: ${params.referenceNumber}` : ''}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'success',
      titleAr: params.channel === 'SMS' ? 'تم إرسال رسالة SMS فورية' : 'تم إرسال رسالة واتساب فورية',
      titleEn: params.channel === 'SMS' ? 'SMS Dispatched' : 'WhatsApp Dispatched',
      messageAr: `إلى ${newRecord.recipientName} (${newRecord.normalizedPhone})${
        params.referenceNumber ? ` — مرجع ${params.referenceNumber}` : ''
      }`,
      messageEn: `Sent to ${newRecord.recipientName} (${newRecord.normalizedPhone})`,
      actionType: 'COMMUNICATIONS',
    });

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

  const resetInvoiceTemplateSettings = () => {
    setInvoiceTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
  };

  const updateCompanyProfile = (patch: Partial<Company>) => {
    setCompany((prev) => ({ ...prev, ...patch }));
  };

  const addBranch = (b: Omit<Branch, 'id' | 'tenantId' | 'companyId'>): Branch => {
    const newBranch: Branch = {
      ...b,
      id: `br-${Date.now()}`,
      tenantId: currentTenant.id,
      companyId: company.id,
    };
    setBranches((prev) => [...prev, newBranch]);
    setAuditLogs((prev) => [
      {
        id: `aud-br-add-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE_BRANCH',
        module: 'SETTINGS',
        entityType: 'Branch',
        entityId: newBranch.id,
        details: `Created new branch "${newBranch.nameAr}" (${newBranch.code}) in ${newBranch.city}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    return newBranch;
  };

  const updateBranch = (branchId: string, patch: Partial<Branch>): { success: boolean; messageAr?: string } => {
    let updated = false;
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === branchId) {
          updated = true;
          const merged = { ...b, ...patch };
          if (currentBranch.id === branchId) {
            setCurrentBranch(merged);
          }
          return merged;
        }
        return b;
      })
    );
    if (updated) {
      setAuditLogs((prev) => [
        {
          id: `aud-br-upd-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'UPDATE_BRANCH',
          module: 'SETTINGS',
          entityType: 'Branch',
          entityId: branchId,
          details: `Updated branch settings for ${branchId}.`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      return { success: true, messageAr: 'تم تحديث بيانات الفرع بنجاح.' };
    }
    return { success: false, messageAr: 'لم يتم العثور على الفرع المطلوب.' };
  };

  const deleteBranch = (branchId: string): { success: boolean; messageAr: string } => {
    if (branches.length <= 1) {
      return {
        success: false,
        messageAr: 'لا يمكن حذف الفرع الوحيد المتبقي في النظام! يجب توفر فرع تشغيلي واحد على الأقل.',
      };
    }
    if (currentBranch.id === branchId) {
      return {
        success: false,
        messageAr: 'لا يمكن حذف الفرع الحالي النشط الذي تعمل عليه الآن. يرجى التبديل لفرع آخر أولاً.',
      };
    }
    // Check if branch has linked invoices
    const hasInvoices = salesInvoices.some((inv) => inv.branchId === branchId);
    if (hasInvoices) {
      // Soft-disable rather than hard delete to preserve accounting integrity
      setBranches((prev) =>
        prev.map((b) => (b.id === branchId ? { ...b, isActive: false } : b))
      );
      return {
        success: false,
        messageAr: 'تنبيه أمان الدفاتر: الفرع مرتبط بفواتير وقيود مرحّلة سابقة. تم إيقاف نشاطه (تعطيل) وحمايته من الحذف الفيزيائي لمنع تلف البيانات المحاسبية.',
      };
    }

    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    setAuditLogs((prev) => [
      {
        id: `aud-br-del-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'DELETE_BRANCH',
        module: 'SETTINGS',
        entityType: 'Branch',
        entityId: branchId,
        details: `Safely removed unreferenced branch ${branchId}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    return { success: true, messageAr: 'تم حذف الفرع الخالي من الحركات بنجاح.' };
  };

  const addWarehouse = (wh: Omit<Warehouse, 'id' | 'tenantId'>): Warehouse => {
    const newWh: Warehouse = {
      ...wh,
      id: `wh-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setWarehouses((prev) => [...prev, newWh]);
    setAuditLogs((prev) => [
      {
        id: `aud-wh-add-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE_WAREHOUSE',
        module: 'SETTINGS',
        entityType: 'Warehouse',
        entityId: newWh.id,
        details: `Created warehouse "${newWh.nameAr}" (${newWh.code}) assigned to branch ${newWh.branchId}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    return newWh;
  };

  const updateWarehouse = (whId: string, patch: Partial<Warehouse>): { success: boolean; messageAr?: string } => {
    let updated = false;
    setWarehouses((prev) =>
      prev.map((w) => {
        if (w.id === whId) {
          updated = true;
          const merged = { ...w, ...patch };
          if (currentWarehouse.id === whId) {
            setCurrentWarehouse(merged);
          }
          return merged;
        }
        return w;
      })
    );
    if (updated) {
      setAuditLogs((prev) => [
        {
          id: `aud-wh-upd-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'UPDATE_WAREHOUSE',
          module: 'SETTINGS',
          entityType: 'Warehouse',
          entityId: whId,
          details: `Updated warehouse settings for ${whId}.`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      return { success: true, messageAr: 'تم تحديث بيانات المستودع بنجاح.' };
    }
    return { success: false, messageAr: 'لم يتم العثور على المستودع المطلوب.' };
  };

  const deleteWarehouse = (whId: string): { success: boolean; messageAr: string } => {
    if (warehouses.length <= 1) {
      return {
        success: false,
        messageAr: 'لا يمكن حذف المستودع الوحيد المتبقي! يجب توفر مستودع تخزين واحد على الأقل.',
      };
    }
    if (currentWarehouse.id === whId) {
      return {
        success: false,
        messageAr: 'لا يمكن حذف المستودع الافتراضي النشط حالياً. يرجى تحديد مستودع آخر كمستودع نشط أولاً.',
      };
    }
    // Check if products have stock located in this warehouse
    const hasStock = products.some((p) => p.warehouseId === whId && p.stockQty > 0);
    if (hasStock) {
      return {
        success: false,
        messageAr: 'يمنع الحذف: المستودع يحتوي على بضائع ومخزون فعلي قائم! يرجى نقل البضائع أو تصفير الرصيد أولاً.',
      };
    }

    setWarehouses((prev) => prev.filter((w) => w.id !== whId));
    setAuditLogs((prev) => [
      {
        id: `aud-wh-del-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'DELETE_WAREHOUSE',
        module: 'SETTINGS',
        entityType: 'Warehouse',
        entityId: whId,
        details: `Safely removed empty warehouse ${whId}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    return { success: true, messageAr: 'تم حذف المستودع بنجاح.' };
  };

  // Helper to hydrate all persisted state slices consistently
  const applyHydratedState = (d: Record<string, any>) => {
    if (Array.isArray(d.products)) {
      setProducts(d.products);
    }
    if (Array.isArray(d.barcodes)) setBarcodes(d.barcodes);
    if (Array.isArray(d.traceabilityEvents)) setTraceabilityEvents(d.traceabilityEvents);
    if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers);
    if (Array.isArray(d.purchaseOrders)) setPurchaseOrders(d.purchaseOrders);
    if (Array.isArray(d.goodsReceipts)) setGoodsReceipts(d.goodsReceipts);
    if (Array.isArray(d.purchaseReturns)) setPurchaseReturns(d.purchaseReturns);
    if (Array.isArray(d.customers)) setCustomers(d.customers);
    if (Array.isArray(d.salesInvoices)) setSalesInvoices(d.salesInvoices);
    if (Array.isArray(d.salesReturns)) setSalesReturns(d.salesReturns);
    if (Array.isArray(d.warrantyTickets)) setWarrantyTickets(d.warrantyTickets);
    if (Array.isArray(d.salesPipelineDocs)) setSalesPipelineDocs(d.salesPipelineDocs);
    if (Array.isArray(d.chartAccounts) && d.chartAccounts.length >= SEED_CHART_OF_ACCOUNTS.length) {
      setChartAccounts(
        d.chartAccounts.map((acc: ChartAccount) => {
          if (acc.code === '1102') {
            return {
              ...acc,
              name: 'Al-Kuraimi Islamic Bank - Main Corporate',
              nameAr: 'بنك الكريمي للتمويل الأصغر الإسلامي - الحساب الجاري الرئيسي',
            };
          }
          if (acc.code === '1103') {
            return {
              ...acc,
              name: 'Tadhamon International Islamic Bank - Operations',
              nameAr: 'بنك التضامن الإسلامي الدولي - حساب العمليات والموردين',
            };
          }
          return acc;
        })
      );
    }
    if (Array.isArray(d.journalEntries)) {
      setJournalEntries(
        d.journalEntries.map((je: JournalEntry) => ({
          ...je,
          lines: je.lines.map((line) => ({
            ...line,
            accountName: line.accountName.replace(/Al-Rajhi Bank/gi, 'Al-Kuraimi Islamic Bank'),
            accountNameAr: line.accountNameAr
              .replace(/مصرف الراجحي/g, 'بنك الكريمي للتمويل الأصغر الإسلامي')
              .replace(/مصرف الإنماء/g, 'بنك التضامن الإسلامي الدولي'),
          })),
        }))
      );
    }
    if (Array.isArray(d.bankStatementLines)) {
      setBankStatementLines(
        d.bankStatementLines.map((line: BankStatementLine) => ({
          ...line,
          descriptionAr: line.descriptionAr
            .replace(/مصرف الراجحي/g, 'بنك الكريمي للتمويل الأصغر الإسلامي')
            .replace(/مدى \/ Apple Pay/g, 'خدمة حاسب / ام فلوس'),
        }))
      );
    }
    if (Array.isArray(d.postDatedChecks)) {
      setPostDatedChecks(
        d.postDatedChecks.map((chk: PostDatedCheck) => ({
          ...chk,
          bankName: chk.bankName
            .replace(/مصرف الراجحي/g, 'بنك الكريمي للتمويل الأصغر الإسلامي')
            .replace(/البنك الأهلي السعودي \(SNB\)|البنك الأهلي/g, 'بنك التضامن الإسلامي الدولي')
            .replace(/بنك الرياض/g, 'بنك اليمن والكويت للتجارة والاستثمار'),
          currency: chk.currency === 'SAR' ? 'YER' : chk.currency,
        }))
      );
    }
    if (Array.isArray(d.exchangeRates)) setExchangeRates(d.exchangeRates);
    if (Array.isArray(d.costCenterBudgets)) {
      setCostCenterBudgets(
        d.costCenterBudgets.map((cc: CostCenterBudget) => ({
          ...cc,
          costCenterNameAr: cc.costCenterNameAr
            .replace(/بالرياض/g, 'بصنعاء')
            .replace(/فرع جدة الغربي/g, 'فرع عدن التجاري')
            .replace(/الدمام/g, 'فرع تعز'),
          branchNameAr: cc.branchNameAr
            .replace(/فرع الرياض الرئيسي/g, 'المركز الرئيسي - صنعاء')
            .replace(/فرع جدة التجاري/g, 'فرع عدن التجاري')
            .replace(/فرع الدمام الصناعي/g, 'فرع تعز الصناعي'),
        }))
      );
    }
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
    if ('currency' in d && d.currency) {
      setCurrencyState(d.currency);
    } else if ('yemenCurrencyMigratedV7' in d && !d.yemenCurrencyMigratedV7) {
      setCurrencyState('YER');
    }
    if ('language' in d && (d.language === 'ar' || d.language === 'en')) {
      setLanguageState(d.language);
    }
    if ('uiTheme' in d && typeof d.uiTheme === 'string') {
      const normalizedTheme = normalizeUiThemeId(d.uiTheme);
      setUiThemeState(normalizedTheme);
      try {
        localStorage.setItem('haseb_ui_theme', normalizedTheme);
      } catch {}
    }
    if ('uiDensity' in d && typeof d.uiDensity === 'string') {
      setUiDensity(normalizeUiDensity(d.uiDensity));
    }
    if ('uiFont' in d && typeof d.uiFont === 'string') {
      const normalizedFont = normalizeUiFontId(d.uiFont);
      setUiFontState(normalizedFont);
      try {
        localStorage.setItem('haseb_ui_font', normalizedFont);
      } catch {}
    }
    if ('fontScalePercent' in d && typeof d.fontScalePercent === 'number') {
      setFontScalePercentState(clampFontScale(d.fontScalePercent));
    }
    if ('windowScalePercent' in d && typeof d.windowScalePercent === 'number') {
      setWindowScalePercentState(clampWindowScale(d.windowScalePercent));
    }
    if ('tabScalePercent' in d && typeof d.tabScalePercent === 'number') {
      setTabScalePercentState(clampTabScale(d.tabScalePercent));
    }
    if ('idleTimeoutMinutes' in d && typeof d.idleTimeoutMinutes === 'number') {
      setIdleTimeoutMinutes(d.idleTimeoutMinutes);
    }
    if ('readNotificationIds' in d && Array.isArray(d.readNotificationIds)) {
      setReadNotificationIds(d.readNotificationIds);
    }
    if ('dismissedNotificationIds' in d && Array.isArray(d.dismissedNotificationIds)) {
      setDismissedNotificationIds(d.dismissedNotificationIds);
    }
    if ('liveEventNotifications' in d && Array.isArray(d.liveEventNotifications)) {
      setLiveEventNotifications(d.liveEventNotifications.slice(0, 25));
    }
    if ('lastBackupTimestamp' in d && (typeof d.lastBackupTimestamp === 'string' || d.lastBackupTimestamp === null)) {
      setLastBackupTimestamp(d.lastBackupTimestamp);
    }
    if ('trialBaseTimestamp' in d && typeof d.trialBaseTimestamp === 'number' && d.trialBaseTimestamp > 1700000000000) {
      setTrialBaseTimestamp(d.trialBaseTimestamp);
      try {
        localStorage.setItem('haseb_drm_trial_start_ms_v1', String(d.trialBaseTimestamp));
      } catch {}
    }
    const localOnboardingDone = (() => {
      try {
        return localStorage.getItem('haseb_onboarding_completed_v8') === 'true';
      } catch {
        return false;
      }
    })();
    if (resolveSyncedOnboardingStatus(d, localOnboardingDone)) {
      setIsOnboardingCompleted(true);
      setIsOnboardingOpen(false);
      try {
        localStorage.setItem('haseb_onboarding_completed_v8', 'true');
      } catch {}
    }
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
          globalDefaultCurrency:
            'yemenCurrencyMigratedV7' in d && !d.yemenCurrencyMigratedV7
              ? 'YER'
              : d.masterSystemConfig.globalDefaultCurrency || prev.globalDefaultCurrency || 'YER',
          visibleModules: {
            ...prev.visibleModules,
            ...(d.masterSystemConfig.visibleModules || {}),
            communications: d.masterSystemConfig.communicationsExplicitlyHidden === true ? false : true,
          },
          uiElementsVisibility: {
            ...prev.uiElementsVisibility,
            ...(d.masterSystemConfig.uiElementsVisibility || {}),
          },
        };
      });
    }
    if (Array.isArray(d.promoCoupons)) {
      setPromoCoupons(d.promoCoupons);
    }
    if (Array.isArray(d.promotionalOffers)) {
      setPromotionalOffers(d.promotionalOffers);
    }
    if (Array.isArray(d.usedSerialTokens) && d.usedSerialTokens.length > 0) {
      setUsedSerialTokens((prev) => Array.from(new Set([...prev, ...d.usedSerialTokens])));
    }
    if ('activeLicenseSerial' in d) {
      if (typeof d.activeLicenseSerial === 'string' && d.activeLicenseSerial.trim()) {
        const check = verifyActivationSerial(
          d.activeLicenseSerial,
          protectionState.machineRequestCode,
          Date.now()
        );
        if (check.valid || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
          setActiveLicenseSerial(d.activeLicenseSerial);
        } else {
          setActiveLicenseSerial(null);
        }
      } else if (d.activeLicenseSerial === null) {
        setActiveLicenseSerial(null);
      }
    }
    if (d.invoiceTemplateSettings) {
      setInvoiceTemplateSettings({ ...DEFAULT_TEMPLATE_SETTINGS, ...d.invoiceTemplateSettings });
    }
    if (Array.isArray(d.outboundMessages)) {
      setOutboundMessages(d.outboundMessages);
    }
    if (d.messagingGatewayConfig) {
      setMessagingGatewayConfig((prev) => ({ ...prev, ...d.messagingGatewayConfig }));
    }
    if (Array.isArray(d.whatsappAccounts) && d.whatsappAccounts.length > 0) {
      setWhatsappAccounts(d.whatsappAccounts);
    }
    if (typeof d.activeWhatsAppAccountId === 'string') {
      setActiveWhatsAppAccountId(d.activeWhatsAppAccountId);
    }
    if (d.currentShift && typeof d.currentShift === 'object') {
      setCurrentShift(d.currentShift);
    }
    if (Array.isArray(d.shiftHistory)) {
      setShiftHistory(d.shiftHistory);
    }
    if (Array.isArray(d.posCart)) {
      setPosCart(d.posCart);
    }
    if (Array.isArray(d.holdBills)) {
      setHoldBills(d.holdBills);
    }
    if (Array.isArray(d.interBranchTransfers)) {
      setInterBranchTransfers(d.interBranchTransfers);
    }
    if (Array.isArray(d.userAccounts) && d.userAccounts.length > 0) {
      setUserAccounts(d.userAccounts);
      setCurrentAccount((prev) => {
        const updated = d.userAccounts.find(
          (u: UserAccount) => u.id === prev.id || u.username === prev.username
        );
        return updated || d.userAccounts[0];
      });
    }
    if (d.company && typeof d.company === 'object') {
      setCompany((prev) => ({ ...prev, ...d.company }));
    }
    if (Array.isArray(d.categories) && d.categories.length > 0) {
      const existingIds = new Set(d.categories.map((c: Category) => c.id));
      const merged = [
        ...SEED_CATEGORIES.filter((sc) => !existingIds.has(sc.id)),
        ...d.categories,
      ];
      setCategories(merged);
    }
  };

  const applyRemoteSyncedPayload = useCallback(
    (payload: Record<string, any>, isFullState: boolean) => {
      remoteSyncInFlightRef.current = true;
      if (isFullState) {
        remoteSyncedKeysRef.current.add('__ALL__');
      } else {
        for (const k of Object.keys(payload)) {
          remoteSyncedKeysRef.current.add(k);
        }
      }
      applyHydratedState(payload);
    },
    []
  );

  const syncClientIdRef = useRef<string>(
    typeof window !== 'undefined' ? getOrCreateSyncClientId(window.sessionStorage) : 'cli-ssr'
  );
  const wsSocketRef = useRef<WebSocket | null>(null);
  const activeTabRef = useRef<string>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const currentUserNameRef = useRef<string>(currentAccount?.nameAr || currentUser?.nameAr || 'المدير العام');
  useEffect(() => {
    currentUserNameRef.current =
      currentAccount?.nameAr || currentAccount?.username || currentUser?.nameAr || 'المدير العام';
  }, [currentAccount, currentUser]);

  const sendLivePresenceFrame = useCallback(() => {
    const ws = wsSocketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const uaInfo = detectDeviceLabelFromUserAgent(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    try {
      ws.send(
        JSON.stringify({
          type: 'erp:presence',
          clientId: syncClientIdRef.current,
          deviceLabel: uaInfo.deviceLabel,
          platformType: uaInfo.platformType,
          userName: currentUserNameRef.current,
          activeTab: activeTabRef.current,
        })
      );
    } catch {}
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      sendLivePresenceFrame();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeTab, currentAccount?.nameAr, currentAccount?.username, sendLivePresenceFrame]);

  const localRevisionRef = useRef<number>(1);
  const isSavingRef = useRef<boolean>(false);
  const hasSeededServerRef = useRef<boolean>(false);
  const latestSnapshotRef = useRef<Record<string, any> | null>(null);
  const lastPushedSnapshotRef = useRef<Record<string, any> | null>(null);
  const lastQueuedSnapshotRef = useRef<Record<string, any> | null>(null);
  const activeLicenseSerialRef = useRef<string | null>(activeLicenseSerial);
  useEffect(() => {
    activeLicenseSerialRef.current = activeLicenseSerial;
  }, [activeLicenseSerial]);

  const commitPendingQueue = useCallback((nextQueue: PendingSyncTransaction[]) => {
    pendingSyncQueueRef.current = nextQueue;
    setPendingSyncQueue(nextQueue);
    if (typeof window !== 'undefined') {
      savePendingSyncQueue(window.localStorage, nextQueue);
      idbReplacePendingSyncQueue(nextQueue).catch(() => {});
    }
  }, []);

  const flushPendingSyncQueue = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) {
      return pendingSyncQueueRef.current.length === 0;
    }
    if (pendingSyncQueueRef.current.length === 0) {
      return true;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }

    isSavingRef.current = true;
    setIsServerSyncing(true);
    let allSucceeded = true;

    try {
      while (pendingSyncQueueRef.current.length > 0) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          allSucceeded = false;
          break;
        }
        const queue = pendingSyncQueueRef.current;
        const head = queue[0];
        const tStart = performance.now();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-erp-client-id': syncClientIdRef.current,
        };
        const activeV2Token =
          typeof window !== 'undefined' ? localStorage.getItem('asf_v2_signed_token') : null;
        if (activeV2Token) {
          headers['x-asf-license-token'] = activeV2Token;
        } else {
          headers['x-asf-trial-device'] =
            activeLicenseSerialRef.current || 'LOCAL-TRIAL-CLIENT';
        }

        const isFullStateEntry =
          head.endpoint === '/api/v1/erp/state' || !head.patchPayload;
        const endpoint = isFullStateEntry ? '/api/v1/erp/state' : '/api/v1/erp/patch';
        const payloadObj = isFullStateEntry
          ? latestSnapshotRef.current || {}
          : {
              originClientId: syncClientIdRef.current,
              baseRevision: head.baseRevision > 0 ? head.baseRevision : localRevisionRef.current,
              patch: head.patchPayload,
            };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payloadObj),
        });

        if (!res.ok) {
          allSucceeded = false;
          break;
        }

        const resp = await res.json().catch(() => null);
        if (resp) {
          hasSeededServerRef.current = true;
          if (typeof resp.dbRevision === 'number' && resp.dbRevision > localRevisionRef.current) {
            localRevisionRef.current = resp.dbRevision;
            setDbRevision(resp.dbRevision);
          }
          const rtt = Number((performance.now() - tStart).toFixed(1));
          if (Number.isFinite(rtt)) setSyncLatencyMs(rtt);
          setBackendConnected((prev) => (prev ? prev : true));

          // If server preserved existing company state against a cold client, hydrate authoritative server state
          if (resp.preservedExistingServerState && resp.data && typeof resp.data === 'object') {
            lastPushedSnapshotRef.current = resp.data;
            lastQueuedSnapshotRef.current = resp.data;
            applyRemoteSyncedPayload(resp.data, true);
            commitPendingQueue([]);
            break;
          }

          // If server 3-way merged concurrent multi-device changes, converge sender immediately
          if (resp.wasMerged && resp.mergedPatch && typeof resp.mergedPatch === 'object') {
            lastPushedSnapshotRef.current = mergeStateDeltaPatch(
              lastPushedSnapshotRef.current || {},
              resp.mergedPatch
            );
            lastQueuedSnapshotRef.current = mergeStateDeltaPatch(
              lastQueuedSnapshotRef.current || {},
              resp.mergedPatch
            );
            applyRemoteSyncedPayload(resp.mergedPatch, false);
          }
        }

        if (isFullStateEntry) {
          if (latestSnapshotRef.current) {
            lastPushedSnapshotRef.current = latestSnapshotRef.current;
          }
          commitPendingQueue([]);
          break;
        } else {
          if (head.patchPayload && !resp?.wasMerged) {
            lastPushedSnapshotRef.current = mergeStateDeltaPatch(
              lastPushedSnapshotRef.current || {},
              head.patchPayload
            );
          }
          commitPendingQueue(pendingSyncQueueRef.current.slice(1));
        }
      }
    } catch {
      allSucceeded = false;
      setBackendConnected(false);
    } finally {
      isSavingRef.current = false;
      setIsServerSyncing(false);
      if (allSucceeded && pendingSyncQueueRef.current.length > 0 && navigator.onLine !== false) {
        setTimeout(() => {
          flushPendingSyncQueue().catch(() => {});
        }, 0);
      }
    }

    return allSucceeded;
  }, [commitPendingQueue, applyRemoteSyncedPayload]);

  // Keep a live ref to dispatchToastAndPushNotification so WS handler always uses current preferences
  const dispatchRemoteToastRef = useRef(dispatchToastAndPushNotification);
  useEffect(() => {
    dispatchRemoteToastRef.current = dispatchToastAndPushNotification;
  }, [dispatchToastAndPushNotification]);

  const reloadStateFromServer = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/erp/state');
      if (!res.ok) return false;
      const json = await res.json();
      if (!json) return false;
      setBackendConnected(true);
      if (typeof json.dbRevision === 'number') {
        localRevisionRef.current = json.dbRevision;
        setDbRevision(json.dbRevision);
      }
      if (json.data && typeof json.data === 'object') {
        hasSeededServerRef.current = true;
        lastPushedSnapshotRef.current = json.data;
        lastQueuedSnapshotRef.current = json.data;
        applyRemoteSyncedPayload(json.data, true);
        idbSaveOfflineSnapshot('haseb_erp_clean_v8', json.data)
          .then((snapRes) => {
            if (snapRes.saved) {
              setOfflineSnapshotStats({ sizeBytes: snapRes.sizeBytes, updatedAt: snapRes.updatedAt });
            }
          })
          .catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }, [applyRemoteSyncedPayload]);

  // Load persisted state from 0ms LocalStorage + IndexedDB fallback + Express RAM/SQLite backend on mount
  useEffect(() => {
    let active = true;
    const INSTANT_CACHE_KEY = 'haseb_erp_clean_v8';
    const bootSyncSafetyTimer = setTimeout(() => {
      if (active) {
        isHydratedRef.current = true;
        setIsInitialServerSyncDone(true);
      }
    }, 1500);

    try {
      const cachedRaw = localStorage.getItem(INSTANT_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && typeof cached === 'object') {
          applyRemoteSyncedPayload(cached, true);
        }
      }
    } catch {
      // ignore local storage quota or parse errors
    }

    // Hydrate pending sync queue & large snapshot from IndexedDB if available
    idbLoadPendingSyncQueue()
      .then((idbQueue) => {
        if (!active) return;
        if (idbQueue.length > 0 && pendingSyncQueueRef.current.length === 0) {
          commitPendingQueue(idbQueue);
        }
      })
      .catch(() => {});

    idbLoadOfflineSnapshot(INSTANT_CACHE_KEY)
      .then((snapRecord) => {
        if (!active || !snapRecord) return;
        setOfflineSnapshotStats({
          sizeBytes: snapRecord.payloadSizeBytes,
          updatedAt: snapRecord.updatedAt,
        });
        if (!hasSeededServerRef.current && snapRecord.data && typeof snapRecord.data === 'object') {
          applyRemoteSyncedPayload(snapRecord.data, true);
        }
      })
      .catch(() => {});

    fetch('/api/v1/erp/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        clearTimeout(bootSyncSafetyTimer);
        if (json) {
          setBackendConnected(true);
          if (typeof json.dbRevision === 'number') {
            localRevisionRef.current = json.dbRevision;
            setDbRevision(json.dbRevision);
          }
          if (json.data && typeof json.data === 'object') {
            hasSeededServerRef.current = true;
            lastPushedSnapshotRef.current = json.data;
            lastQueuedSnapshotRef.current = json.data;
            applyRemoteSyncedPayload(json.data, true);
            idbSaveOfflineSnapshot(INSTANT_CACHE_KEY, json.data)
              .then((snapRes) => {
                if (active && snapRes.saved) {
                  setOfflineSnapshotStats({ sizeBytes: snapRes.sizeBytes, updatedAt: snapRes.updatedAt });
                }
              })
              .catch(() => {});
          }
        }
        isHydratedRef.current = true;
        setIsInitialServerSyncDone(true);
      })
      .catch(() => {
        clearTimeout(bootSyncSafetyTimer);
        if (active) {
          isHydratedRef.current = true;
          setIsInitialServerSyncDone(true);
        }
      });
    return () => {
      active = false;
      clearTimeout(bootSyncSafetyTimer);
    };
  }, [applyRemoteSyncedPayload]);

  // Real-Time Full-Duplex LAN WebSocket + SSE + Fast Catch-Up + Live Presence Sync Engine
  useEffect(() => {
    let isDisposed = false;
    let ws: WebSocket | null = null;
    let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let wsPingTimer: ReturnType<typeof setInterval> | null = null;
    let wsRetryDelayMs = 800;
    let catchupInFlight = false;

    const catchUpFromServer = (incomingRev: number, originClientId?: string | null) => {
      if (!isHydratedRef.current || isDisposed || catchupInFlight) return;
      if (
        !shouldApplyRemoteRevision({
          incomingRevision: incomingRev,
          currentRevision: localRevisionRef.current,
          originClientId,
          localClientId: syncClientIdRef.current,
        })
      ) {
        return;
      }

      catchupInFlight = true;
      const sinceRev = localRevisionRef.current;
      fetch(`/api/v1/erp/catchup?sinceRevision=${encodeURIComponent(sinceRev)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((resp) => {
          if (isDisposed || !resp?.success) return;
          if (typeof resp.dbRevision !== 'number' || resp.dbRevision <= localRevisionRef.current) {
            return;
          }

          if (resp.mode === 'DELTA' && resp.patch && typeof resp.patch === 'object') {
            localRevisionRef.current = resp.dbRevision;
            setDbRevision(resp.dbRevision);
            hasSeededServerRef.current = true;
            lastPushedSnapshotRef.current = mergeStateDeltaPatch(
              lastPushedSnapshotRef.current || {},
              resp.patch
            );
            lastQueuedSnapshotRef.current = mergeStateDeltaPatch(
              lastQueuedSnapshotRef.current || {},
              resp.patch
            );
            applyRemoteSyncedPayload(resp.patch, false);
            const changedKeys = Array.isArray(resp.changedKeys)
              ? resp.changedKeys
              : Object.keys(resp.patch);
            if (changedKeys.length > 0) {
              const toastSpec = buildRemotePatchToastMeta(changedKeys);
              if (toastSpec) dispatchRemoteToastRef.current(toastSpec);
            }
            return;
          }

          if (resp.data && typeof resp.data === 'object') {
            const changedDelta = computeStateDeltaPatch(
              lastPushedSnapshotRef.current,
              resp.data
            );
            localRevisionRef.current = resp.dbRevision;
            setDbRevision(resp.dbRevision);
            hasSeededServerRef.current = true;
            lastPushedSnapshotRef.current = mergeStateDeltaPatch(
              lastPushedSnapshotRef.current || {},
              resp.data
            );
            lastQueuedSnapshotRef.current = mergeStateDeltaPatch(
              lastQueuedSnapshotRef.current || {},
              resp.data
            );
            applyRemoteSyncedPayload(resp.data, true);
            if (changedDelta.changedKeys.length > 0) {
              const toastSpec = buildRemotePatchToastMeta(changedDelta.changedKeys);
              if (toastSpec) dispatchRemoteToastRef.current(toastSpec);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          catchupInFlight = false;
        });
    };

    const connectWebSocket = () => {
      if (isDisposed || typeof WebSocket === 'undefined') return;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
      }
      try {
        const baseWsUrl = buildErpSyncWebSocketUrl(window.location);
        const sep = baseWsUrl.includes('?') ? '&' : '?';
        const wsUrl = `${baseWsUrl}${sep}clientId=${encodeURIComponent(
          syncClientIdRef.current
        )}&userName=${encodeURIComponent(currentUserNameRef.current)}&activeTab=${encodeURIComponent(
          activeTabRef.current
        )}`;
        ws = new WebSocket(wsUrl);
        wsSocketRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) return;
          wsRetryDelayMs = 800;
          setRealtimeSyncStatus('WS_LIVE');
          setBackendConnected(true);
          sendLivePresenceFrame();
          if (pendingSyncQueueRef.current.length > 0) {
            flushPendingSyncQueue().catch(() => {});
          }
          // Immediate catch-up revision check upon WS reconnect
          fetch('/api/v1/erp/revision')
            .then((r) => (r.ok ? r.json() : null))
            .then((revJson) => {
              if (revJson?.success && typeof revJson.dbRevision === 'number') {
                catchUpFromServer(revJson.dbRevision, null);
              }
            })
            .catch(() => {});

          if (wsPingTimer) clearInterval(wsPingTimer);
          wsPingTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(
                  JSON.stringify({
                    type: 'erp:ping',
                    clientId: syncClientIdRef.current,
                    sentAtMs: Date.now(),
                  })
                );
              } catch {}
            }
          }, 12000);
        };

        ws.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const msg = JSON.parse(String(event.data || '{}'));

            if (msg?.type === 'erp:pong') {
              if (typeof msg.sentAtMs === 'number') {
                const rtt = Math.max(0.2, Number((Date.now() - msg.sentAtMs).toFixed(1)));
                if (Number.isFinite(rtt) && rtt < 10000) setSyncLatencyMs(rtt);
              }
              return;
            }

            if (msg?.type === 'erp:presence_list' && Array.isArray(msg.devices)) {
              setConnectedLanDevices(
                msg.devices.map((d: ConnectedLanDevice) => ({
                  ...d,
                  isSelf: d.clientId === syncClientIdRef.current,
                }))
              );
              return;
            }

            if (msg?.type === 'erp:usb_device_update' && msg.device) {
              if (!activeWebSerialPortRef.current?.writable) {
                setUsbConnectedDevice((prev) => {
                  const incoming = msg.device as UsbConnectedDevice;
                  const preservedSimSlot =
                    prev.id && incoming.id && prev.id === incoming.id ? prev.simSlot : incoming.simSlot;
                  const merged = { ...incoming, simSlot: preservedSimSlot };
                  setUsbDiagnosticsReport(runUsbAutoDiagnostics(merged));
                  return merged;
                });
              }
              return;
            }

            if (msg?.type === 'erp:daily_backup_completed' && msg.backup) {
              const bkp = msg.backup;
              const createdIso = bkp.createdAt || new Date().toISOString();
              const fname = bkp.filename || `haseb-backup-${createdIso.slice(0, 10)}.json`;
              setLastAutoDailyBackupAt(createdIso);
              try {
                localStorage.setItem('haseb_last_auto_daily_backup_at', createdIso);
              } catch {
                // ignore
              }
              recordBackupCompleted(createdIso);
              setLatestDailyBackupInfo((prev) => ({
                filename: fname,
                createdAt: createdIso,
                sizeBytes: prev?.sizeBytes || 0,
                trigger: 'AUTO_DAILY',
                checksumSha256: bkp.checksumSha256,
                productsCount: prev?.productsCount ?? products.length,
                invoicesCount: prev?.invoicesCount ?? salesInvoices.length,
                customersCount: prev?.customersCount ?? customers.length,
                source: 'SERVER',
              }));
              window.dispatchEvent(
                new CustomEvent('haseb-daily-backup-completed', { detail: bkp })
              );
              return;
            }

            if (typeof msg?.dbRevision !== 'number') return;

            if (msg.type === 'erp:hello') {
              if (Array.isArray(msg.devices)) {
                setConnectedLanDevices(
                  msg.devices.map((d: ConnectedLanDevice) => ({
                    ...d,
                    isSelf: d.clientId === syncClientIdRef.current,
                  }))
                );
              }
              if (msg.dbRevision > localRevisionRef.current) {
                catchUpFromServer(msg.dbRevision, null);
              }
              return;
            }

            const decision = classifyIncomingRevision({
              incomingRevision: msg.dbRevision,
              currentRevision: localRevisionRef.current,
              originClientId: msg.originClientId,
              localClientId: syncClientIdRef.current,
            });
            if (decision === 'IGNORE') return;

            if (
              decision === 'APPLY_PATCH' &&
              msg.type === 'erp:patch' &&
              msg.patch &&
              typeof msg.patch === 'object'
            ) {
              localRevisionRef.current = msg.dbRevision;
              setDbRevision(msg.dbRevision);
              hasSeededServerRef.current = true;
              lastPushedSnapshotRef.current = mergeStateDeltaPatch(
                lastPushedSnapshotRef.current || {},
                msg.patch
              );
              lastQueuedSnapshotRef.current = mergeStateDeltaPatch(
                lastQueuedSnapshotRef.current || {},
                msg.patch
              );
              applyRemoteSyncedPayload(msg.patch, false);

              const changedKeys = Array.isArray(msg.changedKeys)
                ? msg.changedKeys
                : Object.keys(msg.patch);
              const toastSpec = buildRemotePatchToastMeta(changedKeys);
              if (toastSpec) {
                dispatchRemoteToastRef.current(toastSpec);
              }
              return;
            }

            // Skipped intermediate revisions or full state_commit -> seamless catch-up
            catchUpFromServer(msg.dbRevision, msg.originClientId);
          } catch {
            // ignore malformed frame
          }
        };

        ws.onclose = () => {
          if (wsPingTimer) {
            clearInterval(wsPingTimer);
            wsPingTimer = null;
          }
          if (wsSocketRef.current === ws) wsSocketRef.current = null;
          if (isDisposed) return;
          setRealtimeSyncStatus('RECONNECTING');
          if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
          wsReconnectTimer = setTimeout(() => {
            wsRetryDelayMs = Math.min(4000, Math.round(wsRetryDelayMs * 1.5));
            connectWebSocket();
          }, wsRetryDelayMs);
        };

        ws.onerror = () => {
          try {
            ws?.close();
          } catch {}
        };
      } catch {
        setRealtimeSyncStatus('SSE_LIVE');
      }
    };

    connectWebSocket();

    // Secondary SSE fallback stream (handles proxies that strip WS upgrades)
    let eventSource: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/v1/erp/events');
        eventSource.addEventListener('revision', (ev: MessageEvent) => {
          try {
            const parsed = JSON.parse(ev.data);
            if (typeof parsed?.dbRevision === 'number') {
              catchUpFromServer(parsed.dbRevision, parsed.originClientId || null);
            }
          } catch {}
        });
      } catch {}
    }

    const triggerCatchupCheck = () => {
      if (!isHydratedRef.current || isSavingRef.current || isDisposed) return;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        wsRetryDelayMs = 800;
        connectWebSocket();
      }
      if (pendingSyncQueueRef.current.length > 0) {
        flushPendingSyncQueue().catch(() => {});
      }
      fetch('/api/v1/erp/revision')
        .then((r) => (r.ok ? r.json() : null))
        .then((revJson) => {
          if (revJson?.success && typeof revJson.dbRevision === 'number') {
            catchUpFromServer(revJson.dbRevision, null);
          }
        })
        .catch(() => {});
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        triggerCatchupCheck();
      }
    };

    window.addEventListener('focus', triggerCatchupCheck);
    window.addEventListener('online', triggerCatchupCheck);
    window.addEventListener('pageshow', triggerCatchupCheck);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const syncInterval = setInterval(triggerCatchupCheck, 4000);

    return () => {
      isDisposed = true;
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      if (wsPingTimer) clearInterval(wsPingTimer);
      try {
        ws?.close();
      } catch {}
      wsSocketRef.current = null;
      eventSource?.close();
      clearInterval(syncInterval);
      window.removeEventListener('focus', triggerCatchupCheck);
      window.removeEventListener('online', triggerCatchupCheck);
      window.removeEventListener('pageshow', triggerCatchupCheck);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [applyRemoteSyncedPayload, sendLivePresenceFrame, flushPendingSyncQueue]);

  // Ensure any pending snapshot is flushed synchronously if tab closes or reloads
  useEffect(() => {
    const INSTANT_CACHE_KEY = 'haseb_erp_clean_v8';
    const flushOnUnload = () => {
      if (latestSnapshotRef.current) {
        try {
          localStorage.setItem(INSTANT_CACHE_KEY, JSON.stringify(latestSnapshotRef.current));
        } catch {
          // ignore quota error
        }
      }
    };
    window.addEventListener('beforeunload', flushOnUnload);
    return () => window.removeEventListener('beforeunload', flushOnUnload);
  }, []);

  // Instant Non-Blocking Delta Write-Through LocalStorage + Express WebSocket Broadcast Sync
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const INSTANT_CACHE_KEY = 'haseb_erp_clean_v8';
    const stateSnapshot = {
      yemenCurrencyMigratedV7: true,
      categories,
      products,
      barcodes,
      traceabilityEvents,
      suppliers,
      purchaseOrders,
      goodsReceipts,
      purchaseReturns,
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
      company,
      userAccounts,
      activeIndustry: activeIndustryState,
      currency,
      language,
      uiTheme,
      uiDensity,
      uiFont,
      fontScalePercent,
      windowScalePercent,
      tabScalePercent,
      isOnboardingCompleted,
      idleTimeoutMinutes,
      readNotificationIds,
      dismissedNotificationIds,
      liveEventNotifications,
      lastBackupTimestamp,
      trialBaseTimestamp,
      usedSerialTokens,
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
      whatsappAccounts,
      activeWhatsAppAccountId,
      currentShift,
      shiftHistory,
      posCart,
      holdBills,
      interBranchTransfers,
    };

    latestSnapshotRef.current = stateSnapshot;

    // Absorb post-remote-hydration normalizations before diffing so remote syncs produce zero echo patches
    if (remoteSyncInFlightRef.current) {
      const syncedKeys = Array.from(remoteSyncedKeysRef.current);
      remoteSyncInFlightRef.current = false;
      remoteSyncedKeysRef.current.clear();
      if (syncedKeys.includes('__ALL__')) {
        lastQueuedSnapshotRef.current = stateSnapshot;
        lastPushedSnapshotRef.current = stateSnapshot;
      } else if (syncedKeys.length > 0) {
        const nextQueued = { ...(lastQueuedSnapshotRef.current || {}) };
        const nextPushed = { ...(lastPushedSnapshotRef.current || {}) };
        for (const key of syncedKeys) {
          if (key in stateSnapshot) {
            (nextQueued as Record<string, any>)[key] = (stateSnapshot as Record<string, any>)[key];
            (nextPushed as Record<string, any>)[key] = (stateSnapshot as Record<string, any>)[key];
          }
        }
        lastQueuedSnapshotRef.current = nextQueued;
        lastPushedSnapshotRef.current = nextPushed;
      }
    }

    // Do not push unconfigured blank defaults to an unseeded/remote server before onboarding/auth
    if (!hasSeededServerRef.current && !isOnboardingCompleted && !isAuthenticated) {
      return;
    }

    // Compute delta against last queued snapshot — prevents echo loops & duplicate queue entries
    const baselineForDelta = lastQueuedSnapshotRef.current || lastPushedSnapshotRef.current;
    const delta = computeStateDeltaPatch(baselineForDelta, stateSnapshot);
    if (!delta.hasChanges && hasSeededServerRef.current) {
      try {
        localStorage.setItem(INSTANT_CACHE_KEY, JSON.stringify(stateSnapshot));
      } catch {}
      if (pendingSyncQueueRef.current.length > 0 && navigator.onLine !== false) {
        const retryTimer = setTimeout(() => {
          flushPendingSyncQueue().catch(() => {});
        }, 1200);
        return () => clearTimeout(retryTimer);
      }
      return;
    }

    lastQueuedSnapshotRef.current = stateSnapshot;
    const sendDeltaMode = hasSeededServerRef.current && delta.changedKeys.length > 0;
    const queuedEntry: PendingSyncTransaction = {
      id: `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      endpoint: sendDeltaMode ? '/api/v1/erp/patch' : '/api/v1/erp/state',
      changedKeys: delta.changedKeys,
      baseRevision: localRevisionRef.current,
      patchPayload: sendDeltaMode ? (delta.patch as Record<string, any>) : undefined,
    };

    try {
      const serializedFull = JSON.stringify(stateSnapshot);
      localStorage.setItem(INSTANT_CACHE_KEY, serializedFull);
      const formattedNow = new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastAutoSavedAt((prev) => (prev === formattedNow ? prev : formattedNow));
    } catch {
      // ignore storage quota limits
    }

    // Async mirror full snapshot into IndexedDB (no 5MB localStorage ceiling)
    idbSaveOfflineSnapshot(INSTANT_CACHE_KEY, stateSnapshot)
      .then((res) => {
        if (res.saved) {
          setOfflineSnapshotStats({ sizeBytes: res.sizeBytes, updatedAt: res.updatedAt });
        }
      })
      .catch(() => {});

    commitPendingQueue(enqueuePendingSyncEntry(pendingSyncQueueRef.current, queuedEntry));

    const timer = setTimeout(() => {
      flushPendingSyncQueue().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [
    categories,
    products,
    barcodes,
    traceabilityEvents,
    suppliers,
    purchaseOrders,
    goodsReceipts,
    purchaseReturns,
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
    company,
    userAccounts,
    activeIndustryState,
    currency,
    language,
    uiTheme,
    uiDensity,
    uiFont,
    fontScalePercent,
    windowScalePercent,
    tabScalePercent,
    isOnboardingCompleted,
    idleTimeoutMinutes,
    readNotificationIds,
    dismissedNotificationIds,
    liveEventNotifications,
    lastBackupTimestamp,
    trialBaseTimestamp,
    usedSerialTokens,
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
    whatsappAccounts,
    activeWhatsAppAccountId,
    currentShift,
    shiftHistory,
    posCart,
    holdBills,
    interBranchTransfers,
    isInitialServerSyncDone,
    isAuthenticated,
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
    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'info',
      titleAr: `إضافة صنف جديد (${p.nameAr || p.name})`,
      titleEn: `New Item Added (${p.name})`,
      messageAr: `تم تسجيل الصنف [${p.sku}] في المخزون برصيد افتتاحي ${p.stockQty} ${p.uom || 'حبة'}.`,
      messageEn: `Registered SKU [${p.sku}] with opening stock ${p.stockQty}.`,
      actionType: 'INVENTORY',
      actionLabelAr: 'عرض المخزون ↗',
      actionLabelEn: 'View Inventory ↗',
    });

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
    setAuditLogs((prev) => [
      {
        id: `aud-upd-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UPDATE_PRODUCT',
        module: 'INVENTORY',
        entityType: 'Product',
        entityId: p.id,
        details: `Updated product ${p.nameAr || p.name} (SKU: ${p.sku}) — Price: ${p.salePrice}, Stock: ${p.stockQty}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const batchUpdateProducts = (
    nextProducts: Product[],
    summary: { updatedCount: number; skippedCount: number; totalFieldChanges: number }
  ) => {
    setProducts(nextProducts);
    setAuditLogs((prev) => [
      {
        id: `aud-batch-prod-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'BATCH_UPDATE_PRODUCTS',
        module: 'INVENTORY',
        entityType: 'ProductBatch',
        entityId: `batch-${Date.now()}`,
        details: `Bulk updated ${summary.updatedCount} inventory items (${summary.totalFieldChanges} field changes, ${summary.skippedCount} skipped) via CSV Batch Processor.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const deleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((item) => item.id !== productId));
    if (target) {
      setAuditLogs((prev) => [
        {
          id: `aud-del-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'DELETE_PRODUCT',
          module: 'INVENTORY',
          entityType: 'Product',
          entityId: productId,
          details: `Deleted product ${target.nameAr || target.name} (SKU: ${target.sku})`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const addCategory = (nameAr: string, nameEn?: string): Category => {
    const cleanAr = nameAr.trim();
    const newCat: Category = {
      id: `cat-custom-${Date.now()}`,
      tenantId: currentTenant.id,
      code: `CAT-${Math.floor(100 + Math.random() * 899)}`,
      name: (nameEn || cleanAr).trim(),
      nameAr: cleanAr,
      industry: 'electronics',
    };
    setCategories((prev) => [newCat, ...prev]);
    return newCat;
  };

  const updateCategory = (updated: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
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
        taxRate: 0,
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

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'success',
      titleAr: `اعتماد واستلام أمر شراء (${targetPO.poNumber})`,
      titleEn: `Purchase Order Received (${targetPO.poNumber})`,
      messageAr: `تم استلام البضاعة من (${targetPO.supplierName}) بقيمة ${Math.round(targetPO.total).toLocaleString('en-US')} ${currency} وترحيل القيد المحاسبي [${entryNumber}].`,
      messageEn: `Received PO ${targetPO.poNumber} from ${targetPO.supplierName}.`,
      actionType: 'PURCHASING',
      actionLabelAr: 'عرض المشتريات ↗',
      actionLabelEn: 'View Purchasing ↗',
    });

    return { success: true, entryNumber };
  };

  const receivePurchaseOrderPartial = (
    poId: string,
    receiptLines: PartialGrnInputLine[],
    notes?: string
  ): { success: boolean; grn?: GoodsReceiptNote; entryNumber?: string; messageAr?: string } => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO) {
      return { success: false, messageAr: 'أمر الشراء غير موجود.' };
    }

    const result = computePartialGrnResult({
      purchaseOrder: targetPO,
      receiptLines,
      products,
      warehouseId: currentWarehouse.id,
      operatorName: currentUser.name,
      userId: currentUser.id,
      notes,
    });

    if (!result.success || !result.grn || !result.updatedPO) {
      return { success: false, messageAr: result.errorAr || 'تعذر تنفيذ الاستلام الجزئي.' };
    }

    const entryNumber = `JE-GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const grnJournal = createGrnReceiptJournal({
      grn: result.grn,
      tenantId: currentTenant.id,
      entryNumber,
      operatorName: currentUser.name,
    });

    const savedGrn: GoodsReceiptNote = {
      ...result.grn,
      journalEntryNumber: entryNumber,
    };

    const patchMap = new Map(
      result.productStockPatches.map((patch) => [patch.productId, patch])
    );

    setProducts((prev) =>
      prev.map((prod) => {
        const patch = patchMap.get(prod.id);
        if (!patch) return prod;
        return {
          ...prod,
          stockQty: patch.newStockQty,
          costPrice: patch.newBaseCostPrice,
        };
      })
    );

    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === targetPO.supplierId
          ? {
              ...s,
              balance: Math.round((s.balance + result.supplierPayableDelta) * 100) / 100,
            }
          : s
      )
    );

    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? result.updatedPO! : po))
    );
    setGoodsReceipts((prev) => [savedGrn, ...prev]);
    setJournalEntries((prev) => [grnJournal, ...prev]);

    savedGrn.lines.forEach((line) => {
      addTraceabilityEvent({
        tenantId: currentTenant.id,
        serialNumber: `${savedGrn.grnNumber}-${line.sku}`,
        productName: line.productName,
        eventType: 'RECEIVED',
        location: currentWarehouse.nameAr || currentWarehouse.name,
        operator: currentUser.name,
        referenceDoc: savedGrn.grnNumber,
        notes: `استلام جزئي بموجب ${savedGrn.grnNumber}: ${line.receivedQty} ${line.unitName || ''} (${line.baseQtyAdded} وحدة أساسية)`,
      });
    });

    setAuditLogs((prev) => [
      {
        id: `aud-grn-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'RECEIVE_PARTIAL_GRN',
        module: 'PURCHASING',
        entityType: 'GoodsReceiptNote',
        entityId: savedGrn.grnNumber,
        details: `Received partial GRN [${savedGrn.grnNumber}] against PO [${targetPO.poNumber}] totaling ${savedGrn.total} ${currency} (Journal: ${entryNumber}).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'success',
      titleAr: `سند استلام مخزني (${savedGrn.grnNumber})`,
      titleEn: `Goods Receipt (${savedGrn.grnNumber})`,
      messageAr: `تم استلام دفعة لأمر الشراء (${targetPO.poNumber}) بقيمة ${Math.round(savedGrn.total).toLocaleString('en-US')} ${currency} — القيد: [${entryNumber}].`,
      messageEn: `Recorded partial GRN ${savedGrn.grnNumber} for PO ${targetPO.poNumber}.`,
      actionType: 'PURCHASING',
      actionLabelAr: 'عرض المشتريات ↗',
      actionLabelEn: 'View Purchasing ↗',
    });

    return {
      success: true,
      grn: savedGrn,
      entryNumber,
      messageAr: `تم إصدار سند الاستلام (${savedGrn.grnNumber}) وترحيل القيد (${entryNumber}) بنجاح.`,
    };
  };

  const createPurchaseReturn = (params: {
    supplierId: string;
    returnLines: PurchaseReturnInputLine[];
    purchaseOrderId?: string;
    poNumber?: string;
    reason?: string;
  }): {
    success: boolean;
    purchaseReturn?: PurchaseReturn;
    entryNumber?: string;
    messageAr?: string;
  } => {
    const supplier = suppliers.find((s) => s.id === params.supplierId);
    if (!supplier) {
      return { success: false, messageAr: 'يرجى اختيار المورد أولاً.' };
    }

    const result = computePurchaseReturnResult({
      supplier,
      returnLines: params.returnLines,
      products,
      warehouseId: currentWarehouse.id,
      tenantId: currentTenant.id,
      operatorName: currentUser.name,
      userId: currentUser.id,
      purchaseOrderId: params.purchaseOrderId,
      poNumber: params.poNumber,
      reason: params.reason,
    });

    if (!result.success || !result.purchaseReturn) {
      return { success: false, messageAr: result.errorAr || 'تعذر تنفيذ مرتجع المشتريات.' };
    }

    const entryNumber = `JE-PRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const prnJournal = createPurchaseReturnJournal({
      purchaseReturn: result.purchaseReturn,
      tenantId: currentTenant.id,
      entryNumber,
      operatorName: currentUser.name,
    });

    const savedReturn: PurchaseReturn = {
      ...result.purchaseReturn,
      journalEntryNumber: entryNumber,
    };

    const patchMap = new Map(
      result.productStockPatches.map((patch) => [patch.productId, patch])
    );

    setProducts((prev) =>
      prev.map((prod) => {
        const patch = patchMap.get(prod.id);
        return patch ? { ...prod, stockQty: patch.newStockQty } : prod;
      })
    );

    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplier.id
          ? {
              ...s,
              balance: Math.round((s.balance - result.supplierPayableReduction) * 100) / 100,
            }
          : s
      )
    );

    setPurchaseReturns((prev) => [savedReturn, ...prev]);
    setJournalEntries((prev) => [prnJournal, ...prev]);

    savedReturn.lines.forEach((line) => {
      addTraceabilityEvent({
        tenantId: currentTenant.id,
        serialNumber: `${savedReturn.returnNumber}-${line.sku}`,
        productName: line.productName,
        eventType: 'RETURNED',
        location: currentWarehouse.nameAr || currentWarehouse.name,
        operator: currentUser.name,
        referenceDoc: savedReturn.returnNumber,
        notes: `مرتجع مشتريات (${savedReturn.returnNumber}): ${line.quantity} ${line.unitName || ''} (${line.baseQtyDeducted} وحدة أساسية)`,
      });
    });

    setAuditLogs((prev) => [
      {
        id: `aud-prn-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE_PURCHASE_RETURN',
        module: 'PURCHASING',
        entityType: 'PurchaseReturn',
        entityId: savedReturn.returnNumber,
        details: `Issued Purchase Return [${savedReturn.returnNumber}] to ${supplier.nameAr || supplier.name} for ${savedReturn.total} ${currency} (Journal: ${entryNumber}).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'info',
      titleAr: `مرتجع مشتريات (${savedReturn.returnNumber})`,
      titleEn: `Purchase Return (${savedReturn.returnNumber})`,
      messageAr: `تم خصم المرتجع للمورد (${supplier.nameAr || supplier.name}) بقيمة ${Math.round(savedReturn.total).toLocaleString('en-US')} ${currency} وترحيل القيد [${entryNumber}].`,
      messageEn: `Purchase return ${savedReturn.returnNumber} posted.`,
      actionType: 'PURCHASING',
      actionLabelAr: 'عرض المشتريات ↗',
      actionLabelEn: 'View Purchasing ↗',
    });

    return {
      success: true,
      purchaseReturn: savedReturn,
      entryNumber,
      messageAr: `تم اعتماد مرتجع المشتريات (${savedReturn.returnNumber}) وتخفيض رصيد المورد وترحيل القيد (${entryNumber}).`,
    };
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
  const addCustomer = (c: Omit<Customer, 'id' | 'tenantId'>): Customer => {
    const newCustomer: Customer = {
      ...c,
      id: `cust-${Date.now()}`,
      tenantId: currentTenant.id,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const batchUpdateCustomers = (
    nextCustomers: Customer[],
    summary: { updatedCount: number; skippedCount: number; totalFieldChanges: number }
  ) => {
    setCustomers(nextCustomers);
    setAuditLogs((prev) => [
      {
        id: `aud-batch-cust-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'BATCH_UPDATE_CUSTOMERS',
        module: 'SALES',
        entityType: 'CustomerBatch',
        entityId: `batch-cust-${Date.now()}`,
        details: `Bulk updated ${summary.updatedCount} customer records (${summary.totalFieldChanges} field changes, ${summary.skippedCount} skipped) via CSV Batch Processor.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
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

    const nextSalesReturns = [creditNote, ...salesReturns];
    setSalesReturns(nextSalesReturns);
    setJournalEntries((prev) => [retJournal, ...prev]);

    // Check if cumulative returned units cover the entire original invoice -> mark original invoice VOID/returned
    const totalOrigQty = (origInv.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const totalReturnedForInv = nextSalesReturns
      .filter((r) => r.originalInvoiceId === origInv.id)
      .reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    if (totalOrigQty > 0 && totalReturnedForInv >= totalOrigQty && origInv.status !== 'VOID') {
      const refundedAmt = Math.min(
        origInv.grandTotal,
        Math.max(0, Number(origInv.paidAmount ?? origInv.grandTotal) || 0)
      );
      setSalesInvoices((prev) =>
        prev.map((inv) =>
          inv.id === origInv.id
            ? {
                ...inv,
                status: 'VOID',
                isReturned: true,
                returnedAt: creditNote.date,
                refundedAmount: refundedAmt,
                refundMethod: params.refundMethod,
                returnReason: params.reason,
                returnCreditNoteNumber: creditNoteNumber,
                returnJournalEntryNumber: entryNumber,
                paidAmount: 0,
                remainingAmount: 0,
              }
            : inv
        )
      );
    }

    return {
      success: true,
      creditNote,
      messageAr: `تم إصدار إشعار الدائن (${creditNoteNumber}) بمبلغ ${totalRefund.toLocaleString()} ${currency} وترحيل القيد العكسي (${entryNumber}) بنجاح.`,
    };
  };

  // Returned Invoices Auto-Archive Database & Toggle
  const [autoArchiveReturnedInvoices, setAutoArchiveReturnedInvoicesState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const v = localStorage.getItem('haseb_auto_archive_returns_v1');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });

  const setAutoArchiveReturnedInvoices = useCallback((enabled: boolean) => {
    setAutoArchiveReturnedInvoicesState(Boolean(enabled));
    try {
      localStorage.setItem('haseb_auto_archive_returns_v1', String(Boolean(enabled)));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const [returnedInvoicesArchive, setReturnedInvoicesArchive] = useState<ArchivedReturnedInvoiceRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('haseb_returned_invoices_archive_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const voidAndReturnSalesInvoice = (params: {
    invoiceId: string;
    condition?: ReturnedItemCondition;
    refundMethod?: ReturnRefundMethod;
    reason?: string;
    autoArchive?: boolean;
  }): {
    success: boolean;
    updatedInvoice?: SalesInvoice;
    archivedRecord?: ArchivedReturnedInvoiceRecord;
    creditNotes?: SalesReturnDoc[];
    messageAr?: string;
  } => {
    const targetInv = salesInvoices.find((i) => i.id === params.invoiceId);
    if (!targetInv) {
      return { success: false, messageAr: 'لم يتم العثور على الفاتورة المطلوبة.' };
    }

    const defaultRefundMethod: ReturnRefundMethod =
      params.refundMethod || (targetInv.paymentMethod === 'CREDIT' ? 'CREDIT_BALANCE' : 'CASH');
    const shouldArchive =
      params.autoArchive !== undefined ? params.autoArchive : autoArchiveReturnedInvoices;

    const res = computeFullInvoiceVoidAndReturn({
      invoice: targetInv,
      products,
      condition: params.condition || 'HEALTHY_RESTOCK',
      refundMethod: defaultRefundMethod,
      reason: params.reason || 'إلغاء الفاتورة واسترجاع المبلغ بالكامل',
      tenantId: currentTenant.id,
      operatorName: currentUser.name,
      autoArchive: shouldArchive,
    });

    if (!res.success || !res.updatedInvoice) {
      return { success: false, messageAr: res.messageAr };
    }

    setSalesInvoices((prev) =>
      prev.map((inv) => (inv.id === targetInv.id ? res.updatedInvoice! : inv))
    );

    if (shouldArchive && res.archivedRecord) {
      setReturnedInvoicesArchive((prev) => {
        const next = [
          res.archivedRecord!,
          ...prev.filter((a) => a.originalInvoiceId !== targetInv.id),
        ];
        try {
          localStorage.setItem('haseb_returned_invoices_archive_v1', JSON.stringify(next));
        } catch {
          // ignore storage quota
        }
        return next;
      });
    }

    if (res.restockDeltas.length > 0) {
      setProducts((prev) =>
        prev.map((prod) => {
          const delta = res.restockDeltas
            .filter((d) => d.productId === prod.id)
            .reduce((s, d) => s + d.baseQtyRestocked, 0);
          if (delta <= 0) return prod;
          return {
            ...prod,
            stockQty: Math.round((prod.stockQty + delta) * 1000) / 1000,
          };
        })
      );
    }

    if (res.debtReleasedAmount > 0 && targetInv.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === targetInv.customerId
            ? {
                ...c,
                balance: Math.max(
                  0,
                  Math.round((c.balance - res.debtReleasedAmount) * 100) / 100
                ),
              }
            : c
        )
      );
    }

    if (res.creditNotes.length > 0) {
      setSalesReturns((prev) => [...res.creditNotes, ...prev]);
    }

    if (res.journalEntry) {
      setJournalEntries((prev) => [res.journalEntry!, ...prev]);
    }

    if (
      targetInv.shiftId &&
      targetInv.shiftId === currentShift.id &&
      (res.cashRefundDelta > 0 || res.cardRefundDelta > 0)
    ) {
      setCurrentShift((prev) => ({
        ...prev,
        cashSales: Math.max(0, Math.round((prev.cashSales - res.cashRefundDelta) * 100) / 100),
        cardSales: Math.max(0, Math.round((prev.cardSales - res.cardRefundDelta) * 100) / 100),
        totalSales: Math.max(
          0,
          Math.round((prev.totalSales - (targetInv.grandTotal || 0)) * 100) / 100
        ),
        expectedCash: Math.max(
          0,
          Math.round((prev.expectedCash - res.cashRefundDelta) * 100) / 100
        ),
        transactionCount: Math.max(0, (prev.transactionCount || 1) - 1),
      }));
    }

    setAuditLogs((prev) => [
      {
        id: `aud-void-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'SALES_INVOICE_VOID_RETURN',
        module: 'SALES',
        entityType: 'SalesInvoice',
        entityId: targetInv.id,
        details: `Voided & returned invoice ${targetInv.invoiceNumber} (Refunded: ${res.refundedAmount}, Debt Released: ${res.debtReleasedAmount}, CN: ${res.updatedInvoice?.returnCreditNoteNumber}).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'warning',
      titleAr: `تم إلغاء واسترجاع الفاتورة (${targetInv.invoiceNumber})`,
      titleEn: `Invoice Voided & Returned (${targetInv.invoiceNumber})`,
      messageAr: res.messageAr,
      messageEn: `Voided invoice ${targetInv.invoiceNumber} and issued credit note ${res.updatedInvoice.returnCreditNoteNumber}.`,
      actionType: 'SALES',
      actionLabelAr: 'عرض الفاتورة المسترجعة ↗',
      actionLabelEn: 'View Returned Invoice ↗',
    });

    return {
      success: true,
      updatedInvoice: res.updatedInvoice,
      archivedRecord: res.archivedRecord,
      creditNotes: res.creditNotes,
      messageAr: res.messageAr,
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
    invoiceId?: string;
  }) => {
    const targetInvoice = params.invoiceId
      ? salesInvoices.find((inv) => inv.id === params.invoiceId)
      : undefined;
    const matchedCustomer = customers.find((c) => c.id === params.customerId);
    const cleanAmount = Math.round(Math.abs(Number(params.amount) || 0) * 100) / 100;
    if ((!matchedCustomer && !targetInvoice) || cleanAmount <= 0) {
      return { success: false };
    }

    const partyId =
      matchedCustomer?.id || targetInvoice?.customerId || params.customerId || 'cust-pos-walkin';
    const partyNameAr =
      matchedCustomer?.nameAr ||
      matchedCustomer?.name ||
      targetInvoice?.customerName ||
      'عميل نقدي عام';
    const partyNameEn =
      matchedCustomer?.name ||
      matchedCustomer?.nameAr ||
      targetInvoice?.customerName ||
      'Walk-in Customer';

    const refNo =
      params.referenceNumber?.trim() ||
      `RV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const entryNumber = `JE-RV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const journal = createCustomerReceiptJournalEntry({
      customerId: partyId,
      customerName: partyNameAr,
      amount: cleanAmount,
      paymentMethod: params.paymentMethod,
      referenceNumber: refNo,
      tenantId: currentTenant.id,
      entryNumber,
      operatorName: currentUser.name,
    });

    const newBalance = matchedCustomer
      ? Math.max(0, Math.round((matchedCustomer.balance - cleanAmount) * 100) / 100)
      : Math.max(
          0,
          Math.round(
            (Math.max(
              0,
              (targetInvoice?.grandTotal || 0) -
                Math.min(
                  targetInvoice?.grandTotal || 0,
                  Math.max(0, Number(targetInvoice?.paidAmount) || 0)
                )
            ) -
              cleanAmount) *
              100
          ) / 100
        );

    if (matchedCustomer) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === matchedCustomer.id ? { ...c, balance: newBalance } : c))
      );
    }

    // Apply collected payment directly to target invoiceId (or FIFO across customer's unpaid invoices)
    setSalesInvoices((prev) => {
      let remainingToAllocate = cleanAmount;

      if (params.invoiceId) {
        return prev.map((inv) => {
          if (inv.id !== params.invoiceId || remainingToAllocate <= 0) return inv;
          const currPaid = Math.min(inv.grandTotal, Math.max(0, Number(inv.paidAmount) || 0));
          const currDebt = Math.max(0, Math.round((inv.grandTotal - currPaid) * 100) / 100);
          const applied = Math.min(currDebt, remainingToAllocate);
          remainingToAllocate = Math.round((remainingToAllocate - applied) * 100) / 100;
          const updatedPaid = Math.round((currPaid + applied) * 100) / 100;
          const updatedRem = Math.max(0, Math.round((inv.grandTotal - updatedPaid) * 100) / 100);
          return {
            ...inv,
            paidAmount: updatedPaid,
            remainingAmount: updatedRem,
            cashPaidAmount:
              params.paymentMethod === 'CASH'
                ? Math.round(((inv.cashPaidAmount || 0) + applied) * 100) / 100
                : inv.cashPaidAmount,
            cardPaidAmount:
              params.paymentMethod !== 'CASH'
                ? Math.round(((inv.cardPaidAmount || 0) + applied) * 100) / 100
                : inv.cardPaidAmount,
            status: updatedRem <= 0.01 ? 'PAID' : 'PARTIAL',
          };
        });
      }

      // FIFO settlement by oldest date for customer's unpaid/partial invoices
      const unpaidIdsOrdered = prev
        .filter(
          (inv) =>
            inv.customerId === partyId &&
            inv.status !== 'VOID' &&
            inv.grandTotal - (Number(inv.paidAmount) || 0) > 0.01
        )
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map((inv) => inv.id);

      const allocMap = new Map<string, number>();
      for (const invId of unpaidIdsOrdered) {
        if (remainingToAllocate <= 0.005) break;
        const found = prev.find((i) => i.id === invId);
        if (!found) continue;
        const owed = Math.max(0, found.grandTotal - (Number(found.paidAmount) || 0));
        const take = Math.min(owed, remainingToAllocate);
        if (take > 0) {
          allocMap.set(invId, take);
          remainingToAllocate = Math.round((remainingToAllocate - take) * 100) / 100;
        }
      }

      if (allocMap.size === 0) return prev;
      return prev.map((inv) => {
        const applied = allocMap.get(inv.id);
        if (!applied) return inv;
        const updatedPaid = Math.round(((Number(inv.paidAmount) || 0) + applied) * 100) / 100;
        const updatedRem = Math.max(0, Math.round((inv.grandTotal - updatedPaid) * 100) / 100);
        return {
          ...inv,
          paidAmount: updatedPaid,
          remainingAmount: updatedRem,
          status: updatedRem <= 0.01 ? 'PAID' : 'PARTIAL',
        };
      });
    });

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
        details: `Posted Customer Receipt Voucher [${refNo}] for ${partyNameAr} (${cleanAmount} ${currency}) via ${params.paymentMethod}. Journal: ${entryNumber}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'success',
      titleAr: `سند قبض جديد (${refNo})`,
      titleEn: `Customer Payment Receipt (${refNo})`,
      messageAr: `تم تحصيل ${Math.round(cleanAmount).toLocaleString('en-US')} ${currency} من العميل (${partyNameAr}) والرصيد المتبقي ${Math.round(newBalance).toLocaleString('en-US')} ${currency}.`,
      messageEn: `Received ${cleanAmount} ${currency} from ${partyNameEn}.`,
      actionType: 'DEBTS',
      actionLabelAr: 'كشف حساب العميل ↗',
      actionLabelEn: 'View Debt Ledger ↗',
    });

    return {
      success: true,
      entryNumber,
      newBalance,
    };
  };

  const addSalesInvoice = (invData: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'tenantId'>): SalesInvoice => {
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanGrand = Math.max(0, Math.round((invData.grandTotal || 0) * 100) / 100);
    const defaultPaid = invData.paymentMethod === 'CREDIT' ? 0 : cleanGrand;
    const rawPaid = invData.paidAmount !== undefined ? Number(invData.paidAmount) : defaultPaid;
    const cleanPaid = Math.min(cleanGrand, Math.max(0, Math.round(rawPaid * 100) / 100));
    const remainingDebt = Math.max(0, Math.round((cleanGrand - cleanPaid) * 100) / 100);
    const resolvedStatus: SalesInvoice['status'] =
      remainingDebt <= 0.01
        ? 'PAID'
        : invData.status === 'OVERDUE'
        ? 'OVERDUE'
        : 'PARTIAL';

    const newInv: SalesInvoice = {
      ...invData,
      id: `inv-${Date.now()}`,
      tenantId: currentTenant.id,
      invoiceNumber: invNumber,
      grandTotal: cleanGrand,
      paidAmount: cleanPaid,
      remainingAmount: remainingDebt,
      cashPaidAmount: invData.cashPaidAmount ?? (invData.paymentMethod === 'CARD' ? 0 : cleanPaid),
      cardPaidAmount: invData.cardPaidAmount ?? (invData.paymentMethod === 'CARD' ? cleanPaid : 0),
      status: resolvedStatus,
      qrData: `ZATCA-QR-INVOICE-${invNumber}-TOTAL-${cleanGrand}-VAT-${invData.taxAmount}`,
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
          notes: `مبيعات فاتورة (${invNumber}) للعميل: ${invData.customerName}`,
        });
      }
    });

    // Update customer receivable balance when sold on credit or partial payment
    if (remainingDebt > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === invData.customerId
            ? { ...c, balance: Math.round((c.balance + remainingDebt) * 100) / 100 }
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
    if (!product) {
      throw new Error(language === 'ar' ? 'يرجى إضافة صنف واحد على الأقل أولاً' : 'Please add at least one product first');
    }
    const resolvedPipeCustomerId = customer?.id || 'cust-pos-walkin';
    const resolvedPipeCustomerName =
      customer?.nameAr || customer?.name || (language === 'ar' ? 'عميل نقدي عام' : 'Walk-in Customer');
    const qty = Math.max(1, Number(params.quantity) || 1);
    const subtotal = Math.round(product.salePrice * qty * 100) / 100;
    const taxAmount = 0;
    const grandTotal = subtotal;
    const quoteNumber = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDoc: SalesPipelineDoc = {
      id: `pipe-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      warehouseId: currentWarehouse.id,
      quoteNumber,
      customerId: resolvedPipeCustomerId,
      customerName: resolvedPipeCustomerName,
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
          taxRate: 0,
          taxAmount: 0,
          total: grandTotal,
          warrantyMonths: product.warrantyMonths || 24,
        },
      ],
      subtotal,
      discountAmount: 0,
      taxAmount: 0,
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

  // POS Cart (Zero-Tax / Tax-Exempt Haseb Mode + Multi-Unit UOM Conversions + Strict Stock Cap)
  const addToPOSCart = (
    product: Product,
    quantity = 1,
    customNotes?: string,
    unitName?: string
  ): PosCartStockCheckResult => {
    const liveProduct = products.find((p) => p.id === product.id) || product;
    const resolvedUnit = resolveProductUnitOption(liveProduct, unitName);
    const existingItem = posCart.find((item) => item.productId === liveProduct.id);
    const activeFactor = existingItem
      ? unitName
        ? resolvedUnit.conversionFactor
        : existingItem.conversionFactor || 1
      : resolvedUnit.conversionFactor || 1;
    const activeUnitName = existingItem
      ? unitName
        ? resolvedUnit.unitNameAr
        : existingItem.unitName || resolvedUnit.unitNameAr
      : resolvedUnit.unitNameAr;
    const currentCartQty = existingItem ? existingItem.quantity : 0;
    const requestedTotalQty = Math.round((currentCartQty + quantity) * 1000) / 1000;

    const stockCheck = evaluatePosCartStockConstraint({
      productNameAr: liveProduct.nameAr || liveProduct.name,
      productNameEn: liveProduct.name || liveProduct.nameAr,
      availableBaseStock: liveProduct.stockQty,
      requestedTotalQtyInUnit: requestedTotalQty,
      currentCartQtyInUnit: currentCartQty,
      conversionFactor: activeFactor,
      unitNameAr: activeUnitName,
      isWeightedScale: Boolean(liveProduct.isWeightedScale),
    });

    if (stockCheck.wasCapped) {
      dispatchToastAndPushNotification({
        titleAr: stockCheck.titleAr,
        titleEn: stockCheck.titleEn,
        messageAr: stockCheck.messageAr,
        messageEn: stockCheck.messageEn,
        severity: 'warning',
        category: 'LIVE_EVENTS',
      });
    }

    if (stockCheck.allowedQtyInUnit <= 0) {
      return stockCheck;
    }

    setPosCart((prev) => {
      const existing = prev.find((item) => item.productId === liveProduct.id);
      if (existing) {
        const prevCheck = evaluatePosCartStockConstraint({
          productNameAr: liveProduct.nameAr || liveProduct.name,
          productNameEn: liveProduct.name || liveProduct.nameAr,
          availableBaseStock: liveProduct.stockQty,
          requestedTotalQtyInUnit: Math.round((existing.quantity + quantity) * 1000) / 1000,
          currentCartQtyInUnit: existing.quantity,
          conversionFactor: unitName ? resolvedUnit.conversionFactor : existing.conversionFactor || 1,
          unitNameAr: unitName ? resolvedUnit.unitNameAr : existing.unitName || resolvedUnit.unitNameAr,
          isWeightedScale: Boolean(liveProduct.isWeightedScale),
        });
        const newQty = prevCheck.allowedQtyInUnit;
        if (newQty <= 0) return prev;
        return prev.map((item) => {
          if (item.productId === liveProduct.id) {
            const factor = unitName ? resolvedUnit.conversionFactor : item.conversionFactor || 1;
            const uName = unitName ? resolvedUnit.unitNameAr : item.unitName || resolvedUnit.unitNameAr;
            const activeUnitPrice = unitName ? resolvedUnit.salePrice : item.unitPrice;
            const sub = Math.max(0, newQty * activeUnitPrice - item.discount);
            return {
              ...item,
              unitName: uName,
              conversionFactor: factor,
              baseQtyDeducted: computeBaseStockDelta(newQty, factor),
              unitPrice: activeUnitPrice,
              quantity: newQty,
              taxRate: 0,
              taxAmount: 0,
              total: sub,
              kitchenNotes: customNotes || item.kitchenNotes,
            };
          }
          return item;
        });
      }

      const cappedQty = stockCheck.allowedQtyInUnit;
      const sub = cappedQty * resolvedUnit.salePrice;
      const autoSerial = liveProduct.hasSerials
        ? generateUniqueSerialNumber('IMEI', currentTenant.code)
        : undefined;

      const hasDefaultWarranty = (liveProduct.warrantyMonths || 0) > 0;

      return [
        ...prev,
        {
          productId: liveProduct.id,
          productName: language === 'ar' ? liveProduct.nameAr : liveProduct.name,
          sku: liveProduct.sku,
          barcode: resolvedUnit.barcode || liveProduct.barcode,
          unitName: resolvedUnit.unitNameAr,
          conversionFactor: resolvedUnit.conversionFactor,
          baseQtyDeducted: computeBaseStockDelta(cappedQty, resolvedUnit.conversionFactor),
          quantity: cappedQty,
          unitPrice: resolvedUnit.salePrice,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          total: sub,
          serialNumber: autoSerial,
          warrantyEnabled: hasDefaultWarranty,
          warrantyMonths: hasDefaultWarranty ? liveProduct.warrantyMonths : 0,
          batchNumber: liveProduct.batchNumber,
          expiryDate: liveProduct.expiryDate,
          kitchenNotes: customNotes,
        },
      ];
    });

    return stockCheck;
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
      const res = addToPOSCart(
        panelProd,
        sizing.recommendedPanelCount,
        `مصفوفة ألواح شمسية (${sizing.requiredSolarArrayKwp} kWp)`
      );
      addedCount += res.addedDeltaInUnit;
      totalAmount += panelProd.salePrice * res.addedDeltaInUnit;
    }
    if (inverterProd) {
      const res = addToPOSCart(
        inverterProd,
        1,
        `إنفرتر هجين معتمد (${sizing.recommendedInverterKw} kW)`
      );
      addedCount += res.addedDeltaInUnit;
      totalAmount += inverterProd.salePrice * res.addedDeltaInUnit;
    }
    if (batteryProd) {
      const res = addToPOSCart(
        batteryProd,
        sizing.recommendedBatteryUnits,
        `بنك بطاريات تخزين (${sizing.requiredBatteryStorageKwh} kWh)`
      );
      addedCount += res.addedDeltaInUnit;
      totalAmount += batteryProd.salePrice * res.addedDeltaInUnit;
    }
    if (protectionKit) {
      const res = addToPOSCart(protectionKit, 1, 'لوحة حماية DC قواطع ومانع صواعق وكوابل');
      addedCount += res.addedDeltaInUnit;
      totalAmount += protectionKit.salePrice * res.addedDeltaInUnit;
    }

    return {
      addedItemsCount: addedCount,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  };

  const removeFromPOSCart = (productId: string) => {
    setPosCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updatePOSCartQty = (productId: string, qty: number): PosCartStockCheckResult | undefined => {
    if (qty <= 0) {
      removeFromPOSCart(productId);
      return undefined;
    }
    const targetProduct = products.find((p) => p.id === productId);
    const existingItem = posCart.find((it) => it.productId === productId);
    const factor = existingItem?.conversionFactor || 1;
    const unitNameAr = existingItem?.unitName || targetProduct?.uom || 'وحدة';

    const stockCheck = evaluatePosCartStockConstraint({
      productNameAr: targetProduct?.nameAr || existingItem?.productName || 'الصنف',
      productNameEn: targetProduct?.name || existingItem?.productName || 'Product',
      availableBaseStock: targetProduct ? targetProduct.stockQty : qty * factor,
      requestedTotalQtyInUnit: qty,
      currentCartQtyInUnit: existingItem?.quantity || 0,
      conversionFactor: factor,
      unitNameAr,
      isWeightedScale: Boolean(targetProduct?.isWeightedScale),
    });

    if (stockCheck.wasCapped) {
      dispatchToastAndPushNotification({
        titleAr: stockCheck.titleAr,
        titleEn: stockCheck.titleEn,
        messageAr: stockCheck.messageAr,
        messageEn: stockCheck.messageEn,
        severity: 'warning',
        category: 'LIVE_EVENTS',
      });
    }

    if (stockCheck.allowedQtyInUnit <= 0) {
      removeFromPOSCart(productId);
      return stockCheck;
    }

    setPosCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const roundedQty = stockCheck.allowedQtyInUnit;
          const itemFactor = item.conversionFactor || 1;
          const sub = Math.max(0, roundedQty * item.unitPrice - item.discount);
          return {
            ...item,
            quantity: roundedQty,
            baseQtyDeducted: computeBaseStockDelta(roundedQty, itemFactor),
            taxRate: 0,
            taxAmount: 0,
            total: sub,
          };
        }
        return item;
      })
    );
    return stockCheck;
  };

  const updatePOSCartItemUnit = (productId: string, unitName: string): PosCartStockCheckResult | undefined => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return undefined;
    const resolvedUnit = resolveProductUnitOption(targetProduct, unitName);
    const existingItem = posCart.find((it) => it.productId === productId);
    const currentQty = existingItem?.quantity || 1;

    const stockCheck = evaluatePosCartStockConstraint({
      productNameAr: targetProduct.nameAr || targetProduct.name,
      productNameEn: targetProduct.name || targetProduct.nameAr,
      availableBaseStock: targetProduct.stockQty,
      requestedTotalQtyInUnit: currentQty,
      currentCartQtyInUnit: currentQty,
      conversionFactor: resolvedUnit.conversionFactor,
      unitNameAr: resolvedUnit.unitNameAr,
      isWeightedScale: Boolean(targetProduct.isWeightedScale),
    });

    if (stockCheck.wasCapped) {
      dispatchToastAndPushNotification({
        titleAr: stockCheck.titleAr,
        titleEn: stockCheck.titleEn,
        messageAr: stockCheck.messageAr,
        messageEn: stockCheck.messageEn,
        severity: 'warning',
        category: 'LIVE_EVENTS',
      });
    }

    if (stockCheck.allowedQtyInUnit <= 0) {
      return stockCheck;
    }

    setPosCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const effectiveQty = stockCheck.allowedQtyInUnit;
        const sub = Math.max(0, effectiveQty * resolvedUnit.salePrice - item.discount);
        return {
          ...item,
          quantity: effectiveQty,
          unitName: resolvedUnit.unitNameAr,
          conversionFactor: resolvedUnit.conversionFactor,
          baseQtyDeducted: computeBaseStockDelta(effectiveQty, resolvedUnit.conversionFactor),
          unitPrice: resolvedUnit.salePrice,
          barcode: resolvedUnit.barcode || item.barcode,
          taxRate: 0,
          taxAmount: 0,
          total: sub,
        };
      })
    );
    return stockCheck;
  };

  const updatePOSCartItemMeta = (productId: string, patch: Partial<InvoiceItem>) => {
    setPosCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const merged = { ...item, ...patch };
        if (patch.warrantyEnabled === false) {
          merged.warrantyMonths = 0;
        } else if (
          patch.warrantyEnabled === true &&
          (!merged.warrantyMonths || merged.warrantyMonths <= 0)
        ) {
          const matchedProd = products.find((p) => p.id === item.productId);
          merged.warrantyMonths =
            matchedProd?.warrantyMonths && matchedProd.warrantyMonths > 0
              ? matchedProd.warrantyMonths
              : 12;
        } else if (patch.warrantyMonths !== undefined && patch.warrantyEnabled === undefined) {
          merged.warrantyEnabled = Number(patch.warrantyMonths) > 0;
        }
        const sub = Math.max(0, merged.quantity * merged.unitPrice - merged.discount);
        return { ...merged, taxRate: 0, taxAmount: 0, total: sub };
      })
    );
  };

  const toggleAllPOSCartWarranty = (enabled: boolean, months?: number) => {
    setPosCart((prev) =>
      prev.map((item) => {
        if (!enabled) {
          return { ...item, warrantyEnabled: false, warrantyMonths: 0 };
        }
        const matchedProd = products.find((p) => p.id === item.productId);
        const resolvedMonths =
          months && months > 0
            ? months
            : item.warrantyMonths && item.warrantyMonths > 0
            ? item.warrantyMonths
            : matchedProd?.warrantyMonths && matchedProd.warrantyMonths > 0
            ? matchedProd.warrantyMonths
            : 12;
        return { ...item, warrantyEnabled: true, warrantyMonths: resolvedMonths };
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
    paymentMethod: 'CASH' | 'CARD' | 'SPLIT' | 'CREDIT',
    customerId = 'cust-pos-walkin',
    extraMeta?: {
      orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD';
      tableNumber?: string;
      notes?: string;
      couponCode?: string;
      manualDiscountType?: 'PERCENT' | 'AMOUNT';
      manualDiscountValue?: number;
      manualDiscountAmount?: number;
      customerName?: string;
      customerPhone?: string;
      splitCashAmount?: number;
      splitCardAmount?: number;
      paidAmount?: number;
      tenderedAmount?: number;
      cardReference?: string;
    }
  ): SalesInvoice => {
    if (posCart.length === 0) throw new Error('Cart is empty');
    const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

    const subtotal = posCart.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
    const lineDiscounts = posCart.reduce((acc, curr) => acc + curr.discount, 0);

    let finalDiscountFromCart = 0;
    let appliedDiscountLabel: string | undefined;

    if (typeof extraMeta?.manualDiscountAmount === 'number' && extraMeta.manualDiscountAmount > 0) {
      finalDiscountFromCart = Math.min(subtotal, extraMeta.manualDiscountAmount);
      if (extraMeta.manualDiscountType === 'PERCENT' && extraMeta.manualDiscountValue) {
        appliedDiscountLabel = `خصم ${extraMeta.manualDiscountValue}%`;
      } else {
        appliedDiscountLabel = `خصم نقدي (${finalDiscountFromCart.toFixed(2)} ${currency})`;
      }
    } else if (extraMeta?.couponCode) {
      const cpnEval = validateAndCalculateCouponDiscount({
        code: extraMeta.couponCode,
        coupons: promoCoupons,
        subtotalAmount: Math.max(0, subtotal - lineDiscounts),
        activeIndustry,
      });
      if (cpnEval.valid && cpnEval.discountAmount > 0 && cpnEval.coupon) {
        finalDiscountFromCart = cpnEval.discountAmount;
        appliedDiscountLabel = cpnEval.coupon.code;
        setPromoCoupons((prev) =>
          prev.map((c) =>
            c.id === cpnEval.coupon!.id ? { ...c, usedCount: c.usedCount + 1 } : c
          )
        );
      }
    }

    const discountAmount = round2(lineDiscounts + finalDiscountFromCart);
    const netTaxable = Math.max(0, subtotal - discountAmount);
    const taxAmount = 0;
    const grandTotal = round2(netTaxable);
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const targetCustomer =
      customerId === 'cust-pos-walkin'
        ? customers.find((c) => c.id === 'cust-pos-walkin')
        : customers.find((c) => c.id === customerId) || customers[0];
    const resolvedCustomerId = targetCustomer?.id || 'cust-pos-walkin';
    const resolvedCustomerName =
      extraMeta?.customerName?.trim() ||
      (targetCustomer
        ? language === 'ar'
          ? targetCustomer.nameAr
          : targetCustomer.name
        : language === 'ar'
        ? 'عميل نقدي عام (Walk-in Customer)'
        : 'Walk-in Cash Customer');
    const resolvedCustomerPhone =
      extraMeta?.customerPhone?.trim() || targetCustomer?.phone || '';

    // Compute exact collected cash, collected card, and remaining debt (مديونية)
    let cashCollected = 0;
    let cardCollected = 0;
    if (paymentMethod === 'CASH') {
      const rawCash =
        extraMeta?.paidAmount !== undefined
          ? Number(extraMeta.paidAmount)
          : extraMeta?.tenderedAmount !== undefined
          ? Number(extraMeta.tenderedAmount)
          : grandTotal;
      cashCollected = Math.min(grandTotal, Math.max(0, round2(rawCash)));
    } else if (paymentMethod === 'CARD') {
      const rawCard = extraMeta?.paidAmount !== undefined ? Number(extraMeta.paidAmount) : grandTotal;
      cardCollected = Math.min(grandTotal, Math.max(0, round2(rawCard)));
    } else if (paymentMethod === 'SPLIT') {
      cashCollected = Math.min(grandTotal, Math.max(0, round2(Number(extraMeta?.splitCashAmount) || 0)));
      const maxRemainingForCard = Math.max(0, round2(grandTotal - cashCollected));
      cardCollected =
        extraMeta?.splitCardAmount !== undefined
          ? Math.min(maxRemainingForCard, Math.max(0, round2(Number(extraMeta.splitCardAmount) || 0)))
          : maxRemainingForCard;
    } else {
      // CREDIT (آجل / دفع جزئي بمقدم)
      const downPayment = extraMeta?.paidAmount !== undefined ? Number(extraMeta.paidAmount) : 0;
      cashCollected = Math.min(grandTotal, Math.max(0, round2(downPayment)));
    }

    const actualPaid = Math.min(grandTotal, Math.max(0, round2(cashCollected + cardCollected)));
    const remainingDebt = Math.max(0, round2(grandTotal - actualPaid));
    const resolvedStatus: SalesInvoice['status'] = remainingDebt <= 0.01 ? 'PAID' : 'PARTIAL';
    const tenderedAmount =
      extraMeta?.tenderedAmount !== undefined
        ? round2(Math.max(0, Number(extraMeta.tenderedAmount) || 0))
        : actualPaid;

    // Respect explicit warranty toggle/duration per cart item — cancelled warranties must NOT appear on invoice
    const finalizedItems = posCart.map((item) => {
      const matchedProd = products.find((p) => p.id === item.productId);
      const warrantyActive = isCartItemWarrantyActive(item);
      const needsSerialMeta =
        warrantyActive &&
        (activeIndustry === 'electronics' ||
          matchedProd?.hasSerials ||
          Boolean(item.serialNumber));
      const resolvedWarrantyMonths = warrantyActive
        ? Number(item.warrantyMonths) > 0
          ? Number(item.warrantyMonths)
          : matchedProd?.warrantyMonths || 24
        : 0;
      return {
        ...item,
        serialNumber:
          item.serialNumber?.trim() ||
          (needsSerialMeta
            ? generateUniqueSerialNumber('IMEI', currentTenant.code)
            : undefined),
        warrantyEnabled: warrantyActive,
        warrantyMonths: resolvedWarrantyMonths,
      };
    });
    const allWarrantyCancelled =
      finalizedItems.length > 0 && finalizedItems.every((it) => !isCartItemWarrantyActive(it));

    const invoice: SalesInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: currentTenant.id,
      invoiceNumber: invNumber,
      customerId: resolvedCustomerId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      branchId: currentBranch.id,
      date: new Date().toISOString().split('T')[0],
      items: finalizedItems,
      subtotal,
      discountAmount,
      couponCode: appliedDiscountLabel,
      couponDiscountAmount: finalDiscountFromCart > 0 ? finalDiscountFromCart : undefined,
      discountType: extraMeta?.manualDiscountType,
      discountValue: extraMeta?.manualDiscountValue,
      taxAmount,
      grandTotal,
      paidAmount: actualPaid,
      remainingAmount: remainingDebt,
      cashPaidAmount: cashCollected,
      cardPaidAmount: cardCollected,
      tenderedAmount,
      paymentMethod,
      status: resolvedStatus,
      warrantyCancelled: allWarrantyCancelled,
      qrData: `GLOBAL-TAX-QR-${invNumber}-TOTAL-${grandTotal}-PAID-${actualPaid}-DEBT-${remainingDebt}`,
      notes:
        extraMeta?.notes ||
        (remainingDebt > 0
          ? `بيع عبر POS — مدفوع ${actualPaid.toLocaleString()} ${currency} ومتبقي مديونية ${remainingDebt.toLocaleString()} ${currency}`
          : appliedDiscountLabel
          ? `Completed via POS Register (${appliedDiscountLabel})`
          : 'Completed via POS Register'),
      industryMode: activeIndustry,
      orderType: extraMeta?.orderType || 'STANDARD',
      tableNumber: extraMeta?.tableNumber,
      shiftId: currentShift.status === 'OPEN' ? currentShift.id : 'shift-none',
      shiftMode: currentShift.status === 'OPEN' ? 'EXPLICIT_SHIFT' : 'FLEXIBLE_SHIFTLESS',
    };

    // Increment Customer Balance if any remaining debt exists (including Walk-in Customer)
    if (remainingDebt > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === resolvedCustomerId
            ? { ...c, balance: round2((c.balance || 0) + remainingDebt) }
            : c
        )
      );
    }

    setProducts((prev) =>
      prev.map((prod) => {
        const cartItem = posCart.find((ci) => ci.productId === prod.id);
        if (cartItem) {
          const baseDeduct = computeBaseStockDelta(
            cartItem.quantity,
            cartItem.conversionFactor || 1
          );
          return {
            ...prod,
            stockQty: Math.max(0, Math.round((prod.stockQty - baseDeduct) * 1000) / 1000),
          };
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
        const deductBaseQty = computeBaseStockDelta(item.quantity, item.conversionFactor || 1);
        const unitCost =
          matchedProd?.costPrice ||
          Math.round((item.unitPrice / (item.conversionFactor || 1)) * 0.72 * 100) / 100;
        return sum + unitCost * deductBaseQty;
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

    setCurrentShift((prev) =>
      applySaleToShift(prev, {
        grandTotal,
        cashPortion: cashCollected,
        cardPortion: cardCollected,
      })
    );

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
        details: `POS transaction ${invNumber} for ${grandTotal.toFixed(2)} ${currency} (${paymentMethod}, Paid: ${actualPaid.toFixed(2)}, Debt: ${remainingDebt.toFixed(2)}) in [${activeIndustry}] mode.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: remainingDebt > 0 ? 'warning' : 'success',
      titleAr:
        remainingDebt > 0
          ? `فاتورة بمديونية متبقية (${invNumber})`
          : `فاتورة مبيعات جديدة (${invNumber})`,
      titleEn:
        remainingDebt > 0
          ? `POS Partial/Credit Sale (${invNumber})`
          : `New POS Sale (${invNumber})`,
      messageAr:
        remainingDebt > 0
          ? `تم إصدار الفاتورة للعميل (${resolvedCustomerName}) بمبلغ ${Math.round(grandTotal).toLocaleString('en-US')} ${currency} — المدفوع ${Math.round(actualPaid).toLocaleString('en-US')} ${currency} والمتبقي مديونية ${Math.round(remainingDebt).toLocaleString('en-US')} ${currency}.`
          : `تم إصدار الفاتورة للعميل (${resolvedCustomerName}) بمبلغ ${Math.round(grandTotal).toLocaleString('en-US')} ${currency} — ترحيل القيد المحاسبي تلقائياً.`,
      messageEn:
        remainingDebt > 0
          ? `Issued POS invoice ${invNumber} for ${Math.round(grandTotal)} ${currency} (Paid ${Math.round(actualPaid)}, Debt ${Math.round(remainingDebt)}).`
          : `Issued POS invoice ${invNumber} for ${Math.round(grandTotal)} ${currency}.`,
      actionType: remainingDebt > 0 ? 'DEBTS' : 'SALES',
      actionLabelAr: remainingDebt > 0 ? 'عرض المديونيات والفواتير ↗' : 'عرض الفاتورة بالمبيعات ↗',
      actionLabelEn: remainingDebt > 0 ? 'View Debt Ledger ↗' : 'View in Sales ↗',
    });

    clearPOSCart();
    return invoice;
  };

  const openNewPOSShift = (startingCash = 0) => {
    const cleanFloat = Math.max(0, Number(startingCash) || 0);
    const newShift: POSShift = {
      id: `shf-${Date.now()}`,
      tenantId: currentTenant.id,
      cashierId: currentUser.id,
      cashierName: (language === 'ar' ? currentUser.nameAr : currentUser.name) || currentUser.name,
      branchId: currentBranch.id,
      startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      startingCash: cleanFloat,
      cashSales: 0,
      cardSales: 0,
      totalSales: 0,
      expectedCash: cleanFloat,
      status: 'OPEN',
      transactionCount: 0,
      mode: 'EXPLICIT_SHIFT',
    };
    setCurrentShift(newShift);
    setAuditLogs((prev) => [
      {
        id: `aud-shf-open-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'POS_SHIFT_OPEN',
        module: 'POS',
        entityType: 'POSShift',
        entityId: newShift.id,
        details: `Opened new POS shift (${newShift.id}) with starting cash float ${cleanFloat.toFixed(2)} ${currency}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const closePOSShift = (actualCount: number, openNewShiftWithFloat?: number) => {
    if (currentShift.status !== 'OPEN') {
      return;
    }
    const cleanActual = Math.max(0, Number(actualCount) || 0);
    const variance = Math.round((cleanActual - currentShift.expectedCash) * 100) / 100;
    const closedRecord: POSShift = {
      ...currentShift,
      endTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      actualClosingCash: cleanActual,
      discrepancy: variance,
      status: 'CLOSED',
      mode: 'EXPLICIT_SHIFT',
    };

    setShiftHistory((prev) => [closedRecord, ...prev.filter((s) => s.id !== closedRecord.id)]);

    setAuditLogs((prev) => [
      {
        id: `aud-shf-close-${Date.now()}`,
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'POS_SHIFT_CLOSE',
        module: 'POS',
        entityType: 'POSShift',
        entityId: closedRecord.id,
        details: `Closed POS shift (${closedRecord.id}). Expected Cash: ${closedRecord.expectedCash.toFixed(2)} ${currency}, Actual Count: ${cleanActual.toFixed(2)} ${currency}, Variance: ${variance.toFixed(2)} ${currency}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    if (openNewShiftWithFloat !== undefined) {
      openNewPOSShift(openNewShiftWithFloat);
    } else {
      setCurrentShift(closedRecord);
    }
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

  // Universal Multi-Provider AI Config State & Actions in ERPContext
  const [universalAiConfig, setUniversalAiConfig] = useState<UniversalAiConfigPublic | null>(null);

  const refreshUniversalAiConfig = useCallback(async (): Promise<UniversalAiConfigPublic | null> => {
    try {
      const resp = await fetch('/api/v1/ai/config');
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data?.config) {
        setUniversalAiConfig(data.config);
        return data.config as UniversalAiConfigPublic;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const saveUniversalAiConfig = useCallback(
    async (
      input: UniversalAiConfigInput
    ): Promise<{
      success: boolean;
      config?: UniversalAiConfigPublic;
      messageAr?: string;
      errorAr?: string;
    }> => {
      try {
        const resp = await fetch('/api/v1/ai/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await resp.json();
        if (!resp.ok || !data?.success) {
          return {
            success: false,
            errorAr: data?.errorAr || data?.error || 'تعذر حفظ إعدادات الذكاء الاصطناعي.',
          };
        }
        const saved = data.config as UniversalAiConfigPublic;
        setUniversalAiConfig(saved);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('haseb-ai-config-updated', { detail: saved }));
        }
        return {
          success: true,
          config: saved,
          messageAr: data.messageAr,
        };
      } catch {
        return {
          success: false,
          errorAr: 'خطأ في الاتصال بالخادم أثناء حفظ إعدادات الذكاء الاصطناعي.',
        };
      }
    },
    []
  );

  useEffect(() => {
    void refreshUniversalAiConfig();
    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail) {
        setUniversalAiConfig(detail);
      } else {
        void refreshUniversalAiConfig();
      }
    };
    window.addEventListener('haseb-ai-config-updated', onUpdated);
    return () => window.removeEventListener('haseb-ai-config-updated', onUpdated);
  }, [refreshUniversalAiConfig]);

  // AI Assistant Query Handler (Uses custom configured AI provider & key via server router)
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
      const activeNonVoidInvoices = salesInvoices.filter(
        (i) => i.status !== 'VOID' && i.isReturned !== true
      );
      const res = await fetch('/api/v1/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          language,
          preferredProvider: universalAiConfig?.provider,
          preferredModel: universalAiConfig?.model,
          erpContextSummary: {
            tenant: currentTenant.name,
            branch: currentBranch.name,
            activeIndustry,
            totalProducts: products.length,
            lowStockProducts: lowStockItems.map((p) => ({
              sku: p.sku,
              name: p.name,
              nameAr: p.nameAr,
              stockQty: p.stockQty,
              reorderPoint: p.reorderPoint,
            })),
            totalInvoices: activeNonVoidInvoices.length,
            archivedReturnedInvoicesCount: returnedInvoicesArchive.length,
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

    const activeInvoicesList = salesInvoices.filter((i) => i.status !== 'VOID' && i.isReturned !== true);

    if (lower.includes('مبيعات') || lower.includes('sales') || lower.includes('أكثر') || lower.includes('top')) {
      const productSalesMap = new Map<string, { nameAr: string; name: string; sku: string; qty: number; rev: number }>();
      for (const inv of activeInvoicesList) {
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
      const totalInvoicedRevenue = activeInvoicesList.reduce((s, i) => s + i.grandTotal, 0);

      if (top) {
        reply = language === 'ar'
          ? `بناءً على سجل الفواتير الفعلي (${activeInvoicesList.length} فاتورة نشطة)، الصنف الأعلى مبيعاً هو **${top.nameAr}** (SKU: ${top.sku}) بإجمالي إيراد ${top.rev.toLocaleString()} ر.س (${top.qty} وحدة)${second ? `، يليه **${second.nameAr}** بعدد ${second.qty} وحدة` : ''}. إجمالي الفواتير النشطة بلغ ${totalInvoicedRevenue.toLocaleString()} ر.س، ومبيعات الوردية الحالية ${currentShift.totalSales.toLocaleString()} ر.س.`
          : `Based on your live sales ledger (${activeInvoicesList.length} active invoices), the top-performing product is **${top.name}** (SKU: ${top.sku}) generating SAR ${top.rev.toLocaleString()} (${top.qty} units)${second ? `, followed by **${second.name}** with ${second.qty} units` : ''}. Total active invoiced sales stand at SAR ${totalInvoicedRevenue.toLocaleString()}, and active POS shift sales at SAR ${currentShift.totalSales.toLocaleString()}.`;
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
      const fin = calculateDynamicFinancialStatements(chartAccounts, journalEntries, salesInvoices, purchaseOrders);
      reply = language === 'ar'
        ? `جميع القيود اليومية المسجلة (${journalEntries.length} قيد) ${tb.isBalanced ? 'متوازنة تماماً 100%' : 'تحتاج مراجعة توازن'}. إجمالي المدين (${tb.grandDebit.toLocaleString()} ر.س) يعادل إجمالي الدائن (${tb.grandCredit.toLocaleString()} ر.س). ضريبة المخرجات المستحقة فعلياً هي ${fin.outputVat.toLocaleString()} ر.س والمدخلات القابلة للاسترداد هي ${fin.inputVat.toLocaleString()} ر.س، وصافي الضريبة المستحقة للهيئة هو ${fin.netVatPayable.toLocaleString()} ر.س، وصافي الربح التشغيلي ${fin.netIncome.toLocaleString()} ر.س.`
        : `All registered journal entries (${journalEntries.length} entries) are ${tb.isBalanced ? '100% strictly balanced' : 'out of balance'}. Total Debit (SAR ${tb.grandDebit.toLocaleString()}) matches Total Credit (SAR ${tb.grandCredit.toLocaleString()}). Live Output VAT payable stands at SAR ${fin.outputVat.toLocaleString()} against recoverable Input VAT of SAR ${fin.inputVat.toLocaleString()}, resulting in net tax payable of SAR ${fin.netVatPayable.toLocaleString()} and net operating profit of SAR ${fin.netIncome.toLocaleString()}.`;
    } else {
      const tb = generateTrialBalance(chartAccounts, journalEntries);
      reply = language === 'ar'
        ? `تم تحليل الاستعلام في سياق المستأجر [${currentTenant.name}] والنشاط [${activeIndustry}]. النظام يعمل بكامل طاقته التشغيلية مع ${products.length} صنف مسجل، ${activeInvoicesList.length} فاتورة نشطة، و${journalEntries.length} قيد محاسبي متوازن (إجمالي ميزان المراجعة: ${tb.grandDebit.toLocaleString()} ر.س).`
        : `Analyzed query within Tenant [${currentTenant.name}] and Industry [${activeIndustry}]. Platform operational with ${products.length} registered products, ${activeInvoicesList.length} active invoices, and ${journalEntries.length} balanced journal entries (Trial Balance: SAR ${tb.grandDebit.toLocaleString()}).`;
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
    setGoodsReceipts([]);
    setPurchaseReturns([]);
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

  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => setIsOnboardingOpen(false);

  const completeOnboarding = () => {
    try {
      localStorage.setItem('haseb_onboarding_completed_v8', 'true');
    } catch {}
    setIsOnboardingCompleted(true);
    setIsOnboardingOpen(false);
  };

  const completeFirstLaunchSetup = (params: {
    companyNameAr: string;
    companyNameEn?: string;
    logoDataUrl?: string;
    taxNumber?: string;
    phone?: string;
    address?: string;
    city?: string;
    branchNameAr: string;
    warehouseNameAr: string;
    currency: Currency;
    industry: IndustryType;
    uiTheme: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark';
    arabicFont: 'cairo' | 'tajawal' | 'almarai' | 'ibm';
    adminNameAr: string;
    adminUsername: string;
    adminPassword: string;
    idleTimeoutMinutes: number;
  }) => {
    const cleanCompany = params.companyNameAr.trim() || 'منشأتك التجارية';
    const cleanUsername = params.adminUsername.trim().toLowerCase() || 'admin';
    const cleanPwd = params.adminPassword.trim();
    if (cleanPwd.length < 4) {
      return { success: false, errorAr: 'يجب أن لا تقل كلمة المرور عن 4 أحرف.' };
    }

    const updatedCompany: Company = {
      ...company,
      nameAr: cleanCompany,
      name: params.companyNameEn?.trim() || cleanCompany,
      logo: params.logoDataUrl || company.logo,
      taxNumber: params.taxNumber?.trim() || '',
      phone: params.phone?.trim() || '',
      address: params.address?.trim() || '',
      currency: params.currency,
    };
    setCompany(updatedCompany);

    const updatedBranch: Branch = {
      ...DEFAULT_CLEAN_BRANCH,
      nameAr: params.branchNameAr.trim() || 'الفرع الرئيسي',
      name: params.branchNameAr.trim() || 'Main Branch',
      city: params.city?.trim() || 'صنعاء',
      phone: params.phone?.trim() || '',
    };
    setBranches([updatedBranch]);
    setCurrentBranch(updatedBranch);

    const updatedWarehouse: Warehouse = {
      ...DEFAULT_CLEAN_WAREHOUSE,
      branchId: updatedBranch.id,
      nameAr: params.warehouseNameAr.trim() || 'المستودع الرئيسي',
      name: params.warehouseNameAr.trim() || 'Main Warehouse',
    };
    setWarehouses([updatedWarehouse]);
    setCurrentWarehouse(updatedWarehouse);

    setCurrencyState(params.currency);
    setActiveIndustry(params.industry);
    setUiTheme(params.uiTheme);
    setIdleTimeoutMinutes(params.idleTimeoutMinutes || 15);
    setUiFont(normalizeUiFontId(params.arabicFont));
    try {
      localStorage.setItem('haseb_arabic_font', params.arabicFont);
    } catch {}

    // Single General Manager Account (no other default memberships)
    const cleanAdminNameAr = params.adminNameAr.trim() || 'المدير العام';
    const adminAcc: UserAccount = {
      id: 'usr-admin-1',
      tenantId: currentTenant.id,
      username: cleanUsername,
      password: hashUserPassword(cleanPwd, cleanUsername),
      email: `${cleanUsername}@haseb-erp.local`,
      name: cleanAdminNameAr,
      nameAr: cleanAdminNameAr,
      role: 'SUPER_ADMIN',
      branchId: updatedBranch.id,
      isActive: true,
      allowedModules: [...ALL_ERP_MODULES, 'communications'],
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
    };
    setUserAccounts([adminAcc]);
    setCurrentAccount(adminAcc);
    setCurrentUser({
      id: adminAcc.id,
      tenantId: adminAcc.tenantId,
      username: adminAcc.username,
      email: adminAcc.email,
      name: cleanAdminNameAr,
      nameAr: cleanAdminNameAr,
      role: adminAcc.role,
      branchId: updatedBranch.id,
      isActive: true,
      allowedModules: adminAcc.allowedModules,
      permissions: adminAcc.permissions,
    });
    setWhatsappAccounts([createCleanWhatsAppDefaultAccount(cleanCompany)]);
    setIsAuthenticated(true);
    setIsTerminalLocked(false);

    try {
      sessionStorage.setItem('rlm_erp_auth_session', adminAcc.username);
      localStorage.setItem('haseb_onboarding_completed_v8', 'true');
      const now = Date.now();
      localStorage.setItem('haseb_drm_trial_start_ms_v1', String(now));
      localStorage.setItem('haseb_drm_bound_hw_v1', JSON.stringify(livePrimaryHardware));
      setTrialBaseTimestamp(now);
    } catch {}

    setIsOnboardingCompleted(true);
    setIsOnboardingOpen(false);
    return { success: true };
  };

  const resetSystemToBlank = () => {
    // Zero out all operational business records (keeps General Manager membership & DRM consumed tokens intact)
    setProducts([]);
    setBarcodes([]);
    setTraceabilityEvents([]);
    setSuppliers([]);
    setCustomers([]);
    setSalesInvoices([]);
    setPurchaseOrders([]);
    setGoodsReceipts([]);
    setPurchaseReturns([]);
    setSalesReturns([]);
    setWarrantyTickets([]);
    setSalesPipelineDocs([]);
    setBankStatementLines([]);
    setCostCenterBudgets([]);
    setEmployees([]);
    setFixedAssets([]);
    setProductionOrders([]);
    setProjects([]);
    setFleetVehicles([]);
    setQualityInspections([]);
    setCrmLeads([]);
    setEcommerceOrders([]);
    setWorkflowApprovals([]);
    setOutboundMessages([]);
    setPosCart([]);
    setHoldBills([]);
    setPostDatedChecks([]);
    setKitchenTickets([]);
    setWhatsappAccounts([createCleanWhatsAppDefaultAccount(company.nameAr)]);
    setActiveWhatsAppChatId('');

    // Keep Chart of Accounts intact, clear journals & return to flexible shiftless mode
    setChartAccounts(SEED_CHART_OF_ACCOUNTS);
    setJournalEntries([]);
    setCurrentShift(DEFAULT_CLEAN_SHIFT);
    setShiftHistory([]);

    fetch('/api/v1/erp/reset-blank', { method: 'POST' }).catch(() => {});
  };

  const exportEncryptedDatabaseSnapshot = (passphrase?: string) => {
    let fullSnapshot: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('haseb_erp_clean_v8');
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

    recordBackupCompleted();
    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'success',
      titleAr: 'تم تنزيل نسخة احتياطية مشفرة بنجاح',
      titleEn: 'Encrypted Backup Downloaded',
      messageAr: `تم إنشاء وتنزيل اللقطة المشفرة (${filename}) مع التوقيع الرقمي [${encryptedSnapshot.integritySignature}].`,
      messageEn: `Exported encrypted snapshot ${filename}.`,
      actionType: 'SETTINGS',
      actionLabelAr: 'إعدادات النسخ الاحتياطي ↗',
      actionLabelEn: 'Backup Settings ↗',
    });

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

  const setAutoDailyBackupEnabled = useCallback((enabled: boolean) => {
    setAutoDailyBackupEnabledState(enabled);
    try {
      localStorage.setItem('haseb_auto_daily_backup_enabled', String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const notifyAdminOfDailyBackup = useCallback(
    (meta: DailyBackupMetadata) => {
      if (!shouldNotifyAdminOfBackup(currentUser?.role, currentUser?.permissions?.canManageLicense)) {
        return;
      }
      const dedupeKey = `${meta.filename}|${meta.createdAt.slice(0, 16)}`;
      if (notifiedBackupIdsRef.current.has(dedupeKey)) return;
      notifiedBackupIdsRef.current.add(dedupeKey);

      pushLiveNotification({
        id: `daily-bkp-${Date.now()}`,
        category: 'LIVE_EVENTS',
        severity: 'success',
        titleAr: 'اكتمل النسخ الاحتياطي اليومي للنظام',
        titleEn: 'Daily System Backup Complete',
        messageAr: `تم إنشاء وحفظ النسخة الاحتياطية اليومية (${meta.filename}) بنجاح — الأصناف: ${meta.productsCount} • الفواتير: ${meta.invoicesCount}. يمكنك تنزيلها من الإعدادات.`,
        messageEn: `Daily system backup (${meta.filename}) completed (${meta.productsCount} items, ${meta.invoicesCount} invoices). Download Backup is available in Settings.`,
        actionType: 'BACKUP',
        actionLabelAr: 'تنزيل النسخة الاحتياطية ↗',
        actionLabelEn: 'Download Backup ↗',
      });
    },
    [currentUser?.role, currentUser?.permissions?.canManageLicense, pushLiveNotification]
  );

  const runDailyBackupNow = useCallback(
    async (trigger: 'AUTO' | 'MANUAL' = 'MANUAL'): Promise<DailyBackupMetadata | null> => {
      if (dailyBackupInFlightRef.current) return null;
      dailyBackupInFlightRef.current = true;
      setIsRunningDailyBackup(true);
      try {
        const localArchive = buildDailyBackupArchivePayload({
          tenantCode: currentTenant.code,
          tenant: currentTenant,
          company,
          activeIndustry,
          invoiceTemplateSettings,
          branches,
          warehouses,
          products,
          customers,
          suppliers,
          salesInvoices,
          salesReturns,
          warrantyTickets,
          salesPipelineDocs,
          purchaseOrders,
          goodsReceipts,
          journalEntries,
          chartAccounts,
          trigger: trigger === 'AUTO' ? 'AUTO_DAILY' : 'MANUAL',
        });

        let finalMeta: DailyBackupMetadata = {
          filename: localArchive.filename,
          createdAt: localArchive.createdAt,
          sizeBytes: localArchive.sizeBytes,
          trigger: trigger === 'AUTO' ? 'AUTO_DAILY' : 'MANUAL',
          productsCount: localArchive.productsCount,
          invoicesCount: localArchive.invoicesCount,
          customersCount: localArchive.customersCount,
          source: 'LOCAL',
          jsonString: localArchive.jsonString,
        };

        try {
          const res = await fetch('/api/v1/backups/run-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trigger }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.success && json?.created) {
              finalMeta = {
                ...finalMeta,
                filename: json.created.filename || finalMeta.filename,
                createdAt: json.created.createdAt || finalMeta.createdAt,
                checksumSha256: json.created.checksumSha256,
                source: 'SERVER',
              };
            }
          }
        } catch {
          // Offline or client-only fallback already prepared cleanly
        }

        setLastAutoDailyBackupAt(finalMeta.createdAt);
        try {
          localStorage.setItem('haseb_last_auto_daily_backup_at', finalMeta.createdAt);
        } catch {
          // ignore
        }
        recordBackupCompleted(finalMeta.createdAt);
        setLatestDailyBackupInfo(finalMeta);

        setAuditLogs((prev) => [
          {
            id: `aud-daily-bkp-${Date.now()}`,
            tenantId: currentTenant.id,
            userId: currentUser.id,
            userName: currentUser.name,
            action:
              trigger === 'AUTO' ? 'AUTOMATED_DAILY_SYSTEM_BACKUP' : 'MANUAL_SYSTEM_BACKUP',
            module: 'SETTINGS',
            entityType: 'SystemBackup',
            entityId: finalMeta.checksumSha256 || finalMeta.filename,
            details: `Completed ${trigger === 'AUTO' ? 'automated daily' : 'manual'} system backup (${finalMeta.filename}).`,
            timestamp: finalMeta.createdAt,
          },
          ...prev,
        ]);

        notifyAdminOfDailyBackup(finalMeta);
        return finalMeta;
      } finally {
        dailyBackupInFlightRef.current = false;
        setIsRunningDailyBackup(false);
      }
    },
    [
      currentTenant,
      company,
      activeIndustry,
      invoiceTemplateSettings,
      branches,
      warehouses,
      products,
      customers,
      suppliers,
      salesInvoices,
      salesReturns,
      warrantyTickets,
      salesPipelineDocs,
      purchaseOrders,
      goodsReceipts,
      journalEntries,
      chartAccounts,
      currentUser.id,
      currentUser.name,
      recordBackupCompleted,
      notifyAdminOfDailyBackup,
    ]
  );

  const downloadLatestDailyBackup = useCallback(() => {
    const archive = buildDailyBackupArchivePayload({
      tenantCode: currentTenant.code,
      tenant: currentTenant,
      company,
      activeIndustry,
      invoiceTemplateSettings,
      branches,
      warehouses,
      products,
      customers,
      suppliers,
      salesInvoices,
      salesReturns,
      warrantyTickets,
      salesPipelineDocs,
      purchaseOrders,
      goodsReceipts,
      journalEntries,
      chartAccounts,
      trigger: 'MANUAL',
    });

    const filename = latestDailyBackupInfo?.filename || archive.filename;
    const jsonContent = latestDailyBackupInfo?.jsonString || archive.jsonString;
    const sizeBytes = latestDailyBackupInfo?.sizeBytes || archive.sizeBytes;

    try {
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Fallback for non-DOM environments
    }

    recordBackupCompleted();
    return {
      success: true,
      filename,
      sizeBytes,
    };
  }, [
    currentTenant,
    company,
    activeIndustry,
    invoiceTemplateSettings,
    branches,
    warehouses,
    products,
    customers,
    suppliers,
    salesInvoices,
    salesReturns,
    warrantyTickets,
    salesPipelineDocs,
    purchaseOrders,
    goodsReceipts,
    journalEntries,
    chartAccounts,
    latestDailyBackupInfo,
    recordBackupCompleted,
  ]);

  // Trigger automated daily system backup when due after login & every 60s check
  useEffect(() => {
    if (!isAuthenticated || !autoDailyBackupEnabled) return;

    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    if (isDailyBackupDue(lastAutoDailyBackupAt, Date.now(), DAILY_BACKUP_INTERVAL_MS)) {
      startupTimer = setTimeout(() => {
        if (isHydratedRef.current && isDailyBackupDue(lastAutoDailyBackupAt)) {
          runDailyBackupNow('AUTO');
        }
      }, 1500);
    }

    const periodicTimer = setInterval(() => {
      if (isHydratedRef.current && isDailyBackupDue(lastAutoDailyBackupAt)) {
        runDailyBackupNow('AUTO');
      }
    }, 60_000);

    return () => {
      if (startupTimer) clearTimeout(startupTimer);
      clearInterval(periodicTimer);
    };
  }, [isAuthenticated, autoDailyBackupEnabled, lastAutoDailyBackupAt, runDailyBackupNow]);

  // Listen to server SSE/WS broadcast when scheduled server backup completes
  useEffect(() => {
    const onServerDailyBackup = (ev: Event) => {
      const bkp = (ev as CustomEvent)?.detail;
      if (!bkp) return;
      notifyAdminOfDailyBackup({
        filename: bkp.filename || `haseb-backup-${new Date().toISOString().slice(0, 10)}.json`,
        createdAt: bkp.createdAt || new Date().toISOString(),
        sizeBytes: 0,
        trigger: 'AUTO_DAILY',
        checksumSha256: bkp.checksumSha256,
        productsCount: products.length,
        invoicesCount: salesInvoices.length,
        customersCount: customers.length,
        source: 'SERVER',
      });
    };
    window.addEventListener('haseb-daily-backup-completed', onServerDailyBackup);
    return () => window.removeEventListener('haseb-daily-backup-completed', onServerDailyBackup);
  }, [notifyAdminOfDailyBackup, products.length, salesInvoices.length, customers.length]);

  // WhatsApp Multi-Account in-app operations
  const switchWhatsAppAccount = (accountId: string) => {
    const target = whatsappAccounts.find((a) => a.id === accountId);
    if (!target) return;
    setActiveWhatsAppAccountId(accountId);
    if (target.chats.length > 0) {
      setActiveWhatsAppChatId(target.chats[0].id);
    }
  };

  const addWhatsAppAccount = (params: {
    label: string;
    departmentAr: string;
    phoneNumber?: string;
    colorAccent?: WhatsAppAccountInstance['colorAccent'];
    startConnected?: boolean;
  }): WhatsAppAccountInstance => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const newAcc = createNewWhatsAppAccountInstance({
      ...params,
      baseUrl,
    });
    setWhatsappAccounts((prev) => [...prev, newAcc]);
    setActiveWhatsAppAccountId(newAcc.id);
    if (newAcc.chats.length > 0) {
      setActiveWhatsAppChatId(newAcc.chats[0].id);
    }
    fetch('/api/v1/whatsapp/accounts/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).catch(() => {});
    return newAcc;
  };

  const removeWhatsAppAccount = (accountId: string): { success: boolean; messageAr: string } => {
    if (whatsappAccounts.length <= 1) {
      return {
        success: false,
        messageAr: 'لا يمكن حذف الحساب الوحيد المتبقي في النظام. يجب بقاء حساب واتساب واحد على الأقل.',
      };
    }
    const remaining = whatsappAccounts.filter((a) => a.id !== accountId);
    setWhatsappAccounts(remaining);
    if (activeWhatsAppAccountId === accountId) {
      const nextAcc = remaining[0];
      setActiveWhatsAppAccountId(nextAcc.id);
      if (nextAcc.chats.length > 0) {
        setActiveWhatsAppChatId(nextAcc.chats[0].id);
      }
    }
    return {
      success: true,
      messageAr: 'تم إزالة حساب الواتساب الفرعي بنجاح دون المساس ببقية الحسابات.',
    };
  };

  const startOrOpenWhatsAppChat = (
    recipientName: string,
    recipientPhone: string,
    customerId?: string
  ): string => {
    let resolvedChatId = '';
    setWhatsappAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeWhatsAppAccountObj.id) return acc;
        const cleanDigits = (recipientPhone || '').replace(/\D/g, '');
        const existing = acc.chats.find(
          (c) =>
            (customerId && c.customerId === customerId) ||
            (cleanDigits.length >= 7 &&
              c.normalizedPhone.replace(/\D/g, '').endsWith(cleanDigits.slice(-7)))
        );
        if (existing) {
          resolvedChatId = existing.id;
          return acc;
        }
        const newId = `chat-${Date.now().toString(36)}`;
        resolvedChatId = newId;
        const newChat: WhatsAppChat = {
          id: newId,
          contactName: recipientName || recipientPhone || 'عميل جديد',
          contactPhone: recipientPhone || '+967 770 000 000',
          normalizedPhone: `+${cleanDigits || '967770000000'}`,
          lastMessage: 'محادثة مباشرة مفتوحة داخل النظام',
          lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unreadCount: 0,
          isBusiness: true,
          customerId,
          pinned: false,
          messages: [],
        };
        return {
          ...acc,
          chats: [newChat, ...acc.chats],
        };
      })
    );
    if (resolvedChatId) {
      setActiveWhatsAppChatId(resolvedChatId);
    }
    return resolvedChatId;
  };

  const pairWhatsAppWithQR = async (
    phone = '+967 771 445 880',
    name = 'المكتب الرئيسي - واتساب الأعمال'
  ): Promise<{ success: boolean; messageAr: string }> => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const tokenData = generatePairingQRToken(activeWhatsAppAccountObj.id, baseUrl);
    try {
      await fetch('/api/v1/whatsapp/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeWhatsAppAccountObj.id,
          phoneNumber: phone,
          pushName: name,
        }),
      });
    } catch {
      // In-memory fallback
    }
    setWhatsappAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeWhatsAppAccountObj.id) return acc;
        return {
          ...acc,
          lastActiveAt: 'الآن',
          session: {
            ...acc.session,
            status: 'CONNECTED',
            phoneNumber: phone,
            pushName: name,
            batteryLevel: 96,
            qrCodeData: tokenData.token,
            qrExpiresInSec: tokenData.expiresInSec,
            pairedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            platform: 'WhatsApp Web Multi-Device Gateway v2.3000 (RLM In-App)',
            pairingUrl: tokenData.pairingUrl,
            pairingCode8Digit: tokenData.pairingCode8Digit,
            qrFullMatrixData: tokenData.fullUrlMatrixData,
          },
        };
      })
    );
    return {
      success: true,
      messageAr: `تم ربط حساب (${activeWhatsAppAccountObj.accountLabel}) بنجاح وتفعيل المزامنة المباشرة داخل النظام!`,
    };
  };

  const disconnectWhatsApp = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const qr = generatePairingQRToken(activeWhatsAppAccountObj.id, baseUrl);
    try {
      await fetch('/api/v1/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: activeWhatsAppAccountObj.id }),
      });
    } catch {}
    setWhatsappAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeWhatsAppAccountObj.id) return acc;
        return {
          ...acc,
          session: {
            ...acc.session,
            status: 'PAIRING_QR',
            pairedAt: undefined,
            qrCodeData: qr.token,
            qrExpiresInSec: qr.expiresInSec,
            pairingUrl: qr.pairingUrl,
            pairingCode8Digit: qr.pairingCode8Digit,
            qrFullMatrixData: qr.fullUrlMatrixData,
          },
        };
      })
    );
  };

  const sendWhatsAppChatMessage = async (
    chatId: string,
    text: string,
    attachmentType?: string,
    refNum?: string
  ) => {
    const targetChat = activeWhatsAppAccountObj.chats.find((c) => c.id === chatId);
    const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const uniqueMsgId = generateUniqueWhatsAppMessageId('wmsg');
    const newMsg: WhatsAppChatMessage = {
      id: uniqueMsgId,
      chatId,
      sender: 'ME',
      text,
      timestamp: nowTime,
      status: 'READ',
      attachmentType: (attachmentType as any) || 'NONE',
      referenceNumber: refNum,
    };

    // Optimistic 0ms UI update
    setWhatsappAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeWhatsAppAccountObj.id) return acc;
        return {
          ...acc,
          messagesDispatchedCount: acc.messagesDispatchedCount + 1,
          lastActiveAt: 'الآن',
          chats: acc.chats.map((chat) => {
            if (chat.id === chatId) {
              if (chat.messages.some((m) => m.id === newMsg.id)) return chat;
              return {
                ...chat,
                lastMessage: text,
                lastMessageTime: nowTime,
                messages: [...chat.messages, newMsg],
              };
            }
            return chat;
          }),
        };
      })
    );

    try {
      await fetch('/api/v1/whatsapp/send-chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeWhatsAppAccountObj.id,
          chatId,
          text,
          recipientPhone: targetChat?.contactPhone || targetChat?.normalizedPhone,
          recipientName: targetChat?.contactName,
          attachmentType,
          referenceNumber: refNum,
        }),
      });
    } catch {}
  };

  const syncLiveWhatsAppMessages = (
    accountId: string,
    inboundMessages: Array<{
      id: string;
      senderPhone: string;
      contactName: string;
      text: string;
      fromMe: boolean;
      timestamp?: string;
    }>
  ) => {
    if (!Array.isArray(inboundMessages) || inboundMessages.length === 0) return;
    setWhatsappAccounts((prev) => {
      const targetAcc = prev.find((acc) => acc.id === accountId);
      if (!targetAcc) return prev;

      let updatedChats = [...targetAcc.chats];
      let changed = false;
      for (const inMsg of inboundMessages) {
        if (!inMsg || !inMsg.id || !inMsg.text) continue;
        const alreadyExists = updatedChats.some((c) =>
          c.messages.some((m) => m.id === inMsg.id)
        );
        if (!alreadyExists) {
          const appended = appendMessageToWhatsAppChats(updatedChats, {
            messageId: inMsg.id,
            recipientName: inMsg.contactName || inMsg.senderPhone || 'عميل واتساب',
            recipientPhone: inMsg.senderPhone || '+967770000000',
            messageText: inMsg.text,
            sender: inMsg.fromMe ? 'ME' : 'THEM',
            timestamp: inMsg.timestamp,
          });
          updatedChats = appended.updatedChats;
          changed = true;
        }
      }
      // Bail out with the exact same array reference if no new messages arrived
      if (!changed) return prev;

      return prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              lastActiveAt: 'الآن (مزامنة حية)',
              chats: updatedChats,
            }
          : acc
      );
    });
  };

  // Real WebUSB phone identification from browser
  const connectWebUsbDevice = async (): Promise<{ success: boolean; messageAr: string }> => {
    const usbApi = typeof navigator !== 'undefined' ? (navigator as any).usb : undefined;
    if (!usbApi?.requestDevice) {
      return {
        success: false,
        messageAr:
          'المتصفح الحالي لا يدعم واجهة WebUSB أو أن الصفحة ليست في سياق آمن (HTTPS/localhost). يمكنك استخدام بوابة HTTP الشبكية أو ADB على الجهاز المضيف.',
      };
    }
    try {
      const usbDev = await usbApi.requestDevice({ filters: [] });
      const brand = usbDev.manufacturerName || lookupUsbVendorName(usbDev.vendorId);
      const model = usbDev.productName || `${brand} Android/USB Device`;
      const serial =
        usbDev.serialNumber ||
        `VID_${(usbDev.vendorId || 0).toString(16)}_${(usbDev.productId || 0).toString(16)}`;
      const realDevice: UsbConnectedDevice = {
        ...createDisconnectedUsbDevice(
          `تم التعرف على الجوال الحقيقي (${model}). ملاحظة: المتصفحات تمنع إرسال SMS مباشرة عبر WebUSB بدون ADB أو منفذ Serial (AT+CMGS) أو تطبيق بوابة HTTP LAN.`
        ),
        id: `webusb-${usbDev.vendorId}-${usbDev.productId}`,
        model,
        manufacturer: brand,
        serialNumber: serial,
        port: `WebUSB (${Number(usbDev.vendorId || 0).toString(16).padStart(4, '0')}:${Number(usbDev.productId || 0).toString(16).padStart(4, '0')})`,
        connectionMode: 'DIRECT_USB_CABLE',
        simOperator: 'تم كشف العتاد (يلزم Serial AT أو ADB للإرسال الآلي)',
        simSlot: 1,
        batteryPercent: 0,
        signalStrengthPercent: 0,
        usbDebuggingEnabled: false,
        atCommandReady: false,
        connectedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: 'AUTHORIZING',
        detectionSource: 'WEB_USB',
        usbVendorId: usbDev.vendorId,
        usbProductId: usbDev.productId,
      };
      setUsbConnectedDevice(realDevice);
      setUsbDiagnosticsReport(runUsbAutoDiagnostics(realDevice));
      await fetch('/api/v1/usb/register-client-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: realDevice }),
      }).catch(() => {});
      return {
        success: true,
        messageAr: `تم التعرف على الجهاز الحقيقي (${model} — ${brand} — S/N: ${serial})!`,
      };
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        return { success: false, messageAr: 'لم يتم اختيار أي جهاز USB من النافذة.' };
      }
      return {
        success: false,
        messageAr: `تعذر قراءة جهاز WebUSB: ${err?.message || 'غير مصرح'}`,
      };
    }
  };

  // Real Web Serial COM / AT+CMGS modem connection from browser
  const connectWebSerialModem = async (): Promise<{ success: boolean; messageAr: string }> => {
    const serialApi = typeof navigator !== 'undefined' ? (navigator as any).serial : undefined;
    if (!serialApi?.requestPort) {
      return {
        success: false,
        messageAr:
          'واجهة Web Serial غير مدعومة في هذا المتصفح (يتوفر في Chrome/Edge على سطح المكتب أو عبر HTTPS/localhost).',
      };
    }
    try {
      const port = await serialApi.requestPort();
      try {
        if (!port.readable || !port.writable) {
          await port.open({ baudRate: 115200 });
        }
      } catch (openErr: any) {
        return {
          success: false,
          messageAr: `تعذر فتح المنفذ التسلسلي: ${openErr?.message || 'المنفذ مشغول بتطبيق آخر'}`,
        };
      }
      activeWebSerialPortRef.current = port;
      const sendAtProbe = async (cmd: string): Promise<string> => {
        if (!port.writable || !port.readable) return '';
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(`${cmd}\r\n`));
        writer.releaseLock();

        const reader = port.readable.getReader();
        const decoder = new TextDecoder();
        let output = '';
        const deadline = Date.now() + 900;
        try {
          while (Date.now() < deadline) {
            const raceRes: any = await Promise.race([
              reader.read(),
              new Promise((resolve) => setTimeout(() => resolve({ done: true, timeout: true }), 450)),
            ]);
            if (raceRes?.value) {
              output += decoder.decode(raceRes.value, { stream: true });
              if (output.includes('OK') || output.includes('ERROR')) break;
            } else {
              break;
            }
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {}
        }
        return output;
      };

      const atPing = await sendAtProbe('AT');
      const atOk = /OK/i.test(atPing);
      const cgmi = atOk ? await sendAtProbe('AT+CGMI') : '';
      const cgmm = atOk ? await sendAtProbe('AT+CGMM') : '';
      const cops = atOk ? await sendAtProbe('AT+COPS?') : '';
      const csq = atOk ? await sendAtProbe('AT+CSQ') : '';
      const parsed = parseModemAtIdentityResponses({
        manufacturer: cgmi,
        model: cgmm,
        operator: cops,
        csq,
      });
      const portInfo = port.getInfo?.() || {};
      const vendorLabel = lookupUsbVendorName(portInfo.usbVendorId);

      const realSerialDevice: UsbConnectedDevice = {
        id: `webserial-${portInfo.usbVendorId || 'com'}-${portInfo.usbProductId || Date.now()}`,
        model: parsed.model !== 'Serial AT+CMGS Modem' ? parsed.model : `${vendorLabel} Serial Modem`,
        manufacturer: parsed.manufacturer !== 'USB GSM/3G/4G Modem' ? parsed.manufacturer : vendorLabel,
        serialNumber: portInfo.usbVendorId
          ? `USB_${Number(portInfo.usbVendorId).toString(16)}:${Number(portInfo.usbProductId || 0).toString(16)}`
          : 'SERIAL_COM_PORT',
        port: portInfo.usbVendorId
          ? `WebSerial COM (${Number(portInfo.usbVendorId).toString(16).padStart(4, '0')}:${Number(portInfo.usbProductId || 0).toString(16).padStart(4, '0')})`
          : 'WebSerial COM Port',
        connectionMode: 'USB_MODEM_AT',
        simOperator: parsed.simOperator,
        simSlot: 1,
        signalStrengthPercent: parsed.signalStrengthPercent,
        batteryPercent: 100,
        isCharging: true,
        usbDebuggingEnabled: false,
        atCommandReady: atOk,
        messagesSentCount: usbConnectedDevice.messagesSentCount || 0,
        connectedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: atOk ? 'CONNECTED' : 'ERROR',
        detectionSource: 'WEB_SERIAL',
        usbVendorId: portInfo.usbVendorId,
        usbProductId: portInfo.usbProductId,
        statusReasonAr: atOk
          ? `متصل فعلياً عبر المنفذ التسلسلي وجاهز لإرسال أوامر AT+CMGS.`
          : 'تم فتح المنفذ التسلسلي لكن المودم لم يستجب لأمر AT. تأكد أن المنفذ خاص بمودم GSM/3G/4G.',
      };
      setUsbConnectedDevice(realSerialDevice);
      setUsbDiagnosticsReport(runUsbAutoDiagnostics(realSerialDevice));
      await fetch('/api/v1/usb/register-client-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: realSerialDevice }),
      }).catch(() => {});

      return {
        success: atOk,
        messageAr: atOk
          ? `تم الاتصال الفعلي بالمودم التسلسلي (${realSerialDevice.model}) — الشبكة: ${realSerialDevice.simOperator}.`
          : 'تم فتح المنفذ لكن المودم لم يستجب لأمر الفحص (AT).',
      };
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        return { success: false, messageAr: 'لم يتم اختيار أي منفذ تسلسلي (COM Port).' };
      }
      return {
        success: false,
        messageAr: `فشل فتح المنفذ التسلسلي: ${err?.message || 'خطأ غير متوقع'}`,
      };
    }
  };

  const disconnectUsbDevice = async (): Promise<void> => {
    try {
      if (activeWebSerialPortRef.current?.close) {
        await activeWebSerialPortRef.current.close();
      }
    } catch {}
    activeWebSerialPortRef.current = null;
    try {
      await fetch('/api/v1/usb/disconnect', { method: 'POST' });
    } catch {}
    const disconnected = createDisconnectedUsbDevice();
    setUsbConnectedDevice(disconnected);
    setUsbDiagnosticsReport(runUsbAutoDiagnostics(disconnected));
  };

  // Real Hardware Probe Diagnostics (never fakes success when nothing is attached)
  const runUsbDiagnostics = async (options?: {
    connectionMode?: UsbConnectedDevice['connectionMode'];
    gatewayEndpoint?: string;
    simSlot?: number;
  }): Promise<UsbDiagnosticsReport> => {
    // If user is actively using a browser Web Serial port and not probing HTTP gateway
    if (activeWebSerialPortRef.current?.writable && options?.connectionMode !== 'ETHERNET_TETHER') {
      const report = runUsbAutoDiagnostics(usbConnectedDevice);
      setUsbDiagnosticsReport(report);
      return report;
    }

    try {
      const res = await fetch('/api/v1/usb/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionMode: options?.connectionMode || usbConnectedDevice.connectionMode,
          gatewayEndpoint: options?.gatewayEndpoint,
          simSlot: options?.simSlot || usbConnectedDevice.simSlot,
        }),
      });
      const data = await res.json();
      if (data?.device) setUsbConnectedDevice(data.device);
      if (data?.report) {
        setUsbDiagnosticsReport(data.report);
        return data.report;
      }
    } catch {}

    const honestFallback = runUsbAutoDiagnostics(usbConnectedDevice);
    setUsbDiagnosticsReport(honestFallback);
    return honestFallback;
  };

  const sendSmsViaUsb = async (
    recipientPhone: string,
    messageBody: string,
    referenceNumber?: string,
    recipientName?: string,
    category: MessageTemplateCategory = 'CUSTOM_OPERATION',
    gatewayEndpointOverride?: string
  ): Promise<{
    success: boolean;
    messageAr?: string;
    record?: OutboundMessageRecord;
    smsUri?: string;
  }> => {
    const cleanPhone = (recipientPhone || '').trim();
    const cleanBody = (messageBody || '').trim();
    if (!cleanPhone || !cleanBody) {
      return {
        success: false,
        messageAr: 'يرجى إدخال رقم هاتف المستلم ونص الرسالة النصية قبل الإرسال.',
      };
    }

    const built = buildWhatsAppAndSmsProtocolLinks(
      cleanPhone,
      cleanBody,
      messagingGatewayConfig.defaultCountryDialCode
    );
    const e164Phone = built.valid ? built.normalized.e164Phone : cleanPhone;
    const smsUri = built.smsUri || `sms:${cleanPhone}?body=${encodeURIComponent(cleanBody)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Path A: Direct Browser Web Serial AT+CMGS transmission if COM modem is actively open
    if (activeWebSerialPortRef.current?.writable && usbConnectedDevice.detectionSource === 'WEB_SERIAL') {
      try {
        const port = activeWebSerialPortRef.current;
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode('AT+CMGF=1\r\n'));
        await new Promise((r) => setTimeout(r, 150));
        await writer.write(encoder.encode(`AT+CMGS="${e164Phone}"\r\n`));
        await new Promise((r) => setTimeout(r, 200));
        await writer.write(encoder.encode(`${cleanBody}\x1A`));
        writer.releaseLock();

        let modemResponse = '';
        if (port.readable) {
          const reader = port.readable.getReader();
          const decoder = new TextDecoder();
          const deadline = Date.now() + 2500;
          try {
            while (Date.now() < deadline) {
              const chunk: any = await Promise.race([
                reader.read(),
                new Promise((resolve) => setTimeout(() => resolve({ done: true }), 800)),
              ]);
              if (chunk?.value) {
                modemResponse += decoder.decode(chunk.value, { stream: true });
                if (modemResponse.includes('+CMGS:') || modemResponse.includes('OK') || modemResponse.includes('ERROR')) {
                  break;
                }
              } else {
                break;
              }
            }
          } finally {
            try {
              reader.releaseLock();
            } catch {}
          }
        }

        if (modemResponse.includes('ERROR')) {
          return {
            success: false,
            smsUri,
            messageAr: 'رفض المودم التسلسلي إرسال الرسالة (AT+CMGS ERROR). تحقق من رصيد الشريحة وتغطية الشبكة.',
          };
        }

        const serverRes = await fetch('/api/v1/usb/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: cleanPhone,
            messageBody: cleanBody,
            referenceNumber,
            recipientName,
            dispatchedViaClientSerial: true,
          }),
        }).then((r) => r.json()).catch(() => null);

        const newRecord: OutboundMessageRecord = serverRes?.record || {
          id: `sms-serial-${Date.now()}`,
          tenantId: currentTenant.id,
          channel: 'SMS',
          category,
          recipientName: recipientName?.trim() || 'عميل / مستلم SMS',
          recipientPhone: cleanPhone,
          normalizedPhone: e164Phone,
          referenceNumber: referenceNumber?.trim() || undefined,
          messageBody: cleanBody,
          status: 'DELIVERED',
          deliveryConfirmed: true,
          dispatchFormat: 'TEXT_ONLY',
          whatsappUrl: built.whatsappWebUrl || '',
          smsUri,
          sentBy: `${usbConnectedDevice.model} (Web Serial AT+CMGS)`,
          sentAt: nowStr,
        };
        setOutboundMessages((prev) => [newRecord, ...prev]);
        setUsbConnectedDevice((prev) => ({
          ...prev,
          messagesSentCount: prev.messagesSentCount + 1,
        }));
        return {
          success: true,
          record: newRecord,
          smsUri,
          messageAr: `تم إرسال الرسالة النصية فعلياً عبر المودم التسلسلي (${usbConnectedDevice.model}) إلى ${e164Phone}.`,
        };
      } catch (err: any) {
        return {
          success: false,
          smsUri,
          messageAr: `فشل الإرسال عبر المنفذ التسلسلي: ${err?.message || 'تحقق من اتصال المودم'}`,
        };
      }
    }

    // Path B: Dispatch through verified Server ADB or LAN HTTP SMS Gateway (NO fake optimistic success!)
    try {
      const serverRes = await fetch('/api/v1/usb/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: cleanPhone,
          messageBody: cleanBody,
          referenceNumber,
          recipientName,
          simSlot: usbConnectedDevice.simSlot,
          subId:
            usbConnectedDevice.simSlot === 2
              ? usbConnectedDevice.subIds?.sim2
              : usbConnectedDevice.subIds?.sim1,
          simOperator: usbConnectedDevice.simOperator,
          gatewayEndpoint: gatewayEndpointOverride || usbConnectedDevice.gatewayEndpoint,
        }),
      });
      const data = await serverRes.json().catch(() => null);
      if (data?.device) {
        setUsbConnectedDevice(data.device);
      }

      if (!serverRes.ok || !data?.success) {
        return {
          success: false,
          smsUri,
          messageAr:
            data?.errorAr ||
            'لا يوجد جوال أو مودم SMS موصل بالنظام حالياً. وصّل جوالاً عبر USB / Web Serial / بوابة HTTP أو استخدم تطبيق الرسائل أدناه.',
        };
      }

      const persistedRecord: OutboundMessageRecord = {
        ...(data.record || {}),
        id: data.record?.id || `sms-usb-${Date.now()}`,
        tenantId: currentTenant.id,
        channel: 'SMS',
        category,
        recipientName: recipientName?.trim() || 'عميل / مستلم SMS',
        recipientPhone: cleanPhone,
        normalizedPhone: e164Phone,
        referenceNumber: referenceNumber?.trim() || undefined,
        messageBody: cleanBody,
        status: 'DELIVERED',
        deliveryConfirmed: true,
        dispatchFormat: 'TEXT_ONLY',
        whatsappUrl: built.whatsappWebUrl || '',
        smsUri,
        sentBy: data.record?.sentBy || `${usbConnectedDevice.model} (SIM ${usbConnectedDevice.simSlot})`,
        sentAt: nowStr,
      };

      setOutboundMessages((prev) => [persistedRecord, ...prev]);
      setAuditLogs((prev) => [
        {
          id: `aud-usb-sms-${Date.now()}`,
          tenantId: currentTenant.id,
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'SEND_USB_SMS',
          module: 'COMMUNICATIONS',
          entityType: 'OutboundMessage',
          entityId: persistedRecord.id,
          details: `Dispatched real SMS via ${persistedRecord.sentBy} to ${persistedRecord.recipientName} [${e164Phone}]${referenceNumber ? ` Ref: ${referenceNumber}` : ''}.`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      pushLiveNotification({
        category: 'LIVE_EVENTS',
        severity: 'success',
        titleAr: `إرسال رسالة SMS عبر ${usbConnectedDevice.model}`,
        titleEn: `SMS Dispatched`,
        messageAr: `تم الإرسال إلى ${persistedRecord.recipientName} (${e164Phone})`,
        messageEn: `Sent SMS to ${persistedRecord.recipientName} (${e164Phone})`,
        actionType: 'COMMUNICATIONS',
      });

      return {
        success: true,
        record: persistedRecord,
        smsUri,
        messageAr: data.messageAr || `تم إرسال الرسالة النصية إلى (${persistedRecord.recipientName} — ${e164Phone}) بنجاح!`,
      };
    } catch {
      return {
        success: false,
        smsUri,
        messageAr: 'تعذر الوصول إلى خادم جسر SMS للتحقق من الجوال الموصل.',
      };
    }
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
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetChatName =
      activeWhatsAppAccountObj.chats.find((c) => c.id === chatId)?.contactName || 'عميل واتساب';
    setWhatsappAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== activeWhatsAppAccountObj.id) return acc;
        return {
          ...acc,
          lastActiveAt: 'الآن',
          chats: acc.chats.map((c) => {
            if (c.id === chatId) {
              return {
                ...c,
                lastMessage: replyText,
                lastMessageTime: nowTime,
                unreadCount: c.unreadCount + 1,
                messages: [...c.messages, inboundMsg],
              };
            }
            return c;
          }),
        };
      })
    );
    pushLiveNotification({
      category: 'WHATSAPP_INBOX',
      severity: 'info',
      titleAr: `رسالة واتساب جديدة من ${targetChatName}`,
      titleEn: `New WhatsApp Message from ${targetChatName}`,
      messageAr: replyText.slice(0, 120),
      messageEn: replyText.slice(0, 120),
      actionType: 'COMMUNICATIONS',
    });
  };

  const launchBulkDebtSmsCampaign = (
    customPrefix?: string
  ): {
    success?: boolean;
    campaignId: string;
    targetedCustomersCount: number;
    totalDebtAmount: number;
    messageAr: string;
  } => {
    if (!isUsbDeviceReady(usbConnectedDevice)) {
      return {
        success: false,
        campaignId: '',
        targetedCustomersCount: 0,
        totalDebtAmount: 0,
        messageAr:
          'تعذر إطلاق الحملة الجماعية: لا يوجد جوال أندرويد أو مودم SMS موصل وجاهز حالياً. قم بتوصيل الجوال عبر USB / Web Serial أو بوابة الشبكة أولاً.',
      };
    }

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
      sentBy: `${usbConnectedDevice.model} (Bulk Queue)`,
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
        details: `Dispatched bulk debt reminders via ${usbConnectedDevice.model} to ${campaign.targetedCustomersCount} debtors (Total Debt: ${campaign.totalDebtAmount} ${currency}).`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'success',
      titleAr: `حملة SMS جماعية (${campaign.targetedCustomersCount} عملاء)`,
      titleEn: `Bulk SMS Campaign (${campaign.targetedCustomersCount} recipients)`,
      messageAr: `تم إطلاق تذكير المديونيات عبر (${usbConnectedDevice.model}) بإجمالي ${campaign.totalDebtAmount.toLocaleString()} ${currency}.`,
      messageEn: `Bulk debt SMS campaign sent to ${campaign.targetedCustomersCount} debtors.`,
      actionType: 'COMMUNICATIONS',
    });

    return {
      success: true,
      campaignId: campaign.campaignId,
      targetedCustomersCount: campaign.targetedCustomersCount,
      totalDebtAmount: campaign.totalDebtAmount,
      messageAr: `تم إطلاق حملة التذكير بنجاح وتجهيز ${campaign.targetedCustomersCount} رسالة نصية عبر (${usbConnectedDevice.model})!`,
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

  // Compute Live Connected Notifications Summary (Synced between Navbar Badge & Center Modal)
  const whatsappUnreadTotal = useMemo(
    () =>
      whatsappAccounts.reduce(
        (accSum, acc) =>
          accSum + acc.chats.reduce((cSum, ch) => cSum + (Number(ch.unreadCount) || 0), 0),
        0
      ),
    [whatsappAccounts]
  );

  const pendingPoMetrics = useMemo(() => {
    const pending = purchaseOrders.filter((po) => po.status !== 'RECEIVED');
    return {
      count: pending.length,
      total: pending.reduce((sum, po) => sum + (Number(po.total) || 0), 0),
    };
  }, [purchaseOrders]);

  const rawSystemNotifications = useMemo(() => {
    return generateSystemNotifications({
      products,
      customers,
      salesInvoices,
      warrantyTickets,
      holdBills,
      currentShift,
      currency,
      lastBackupTimestamp,
      pendingTransfersCount: interBranchTransfers.filter(
        (t) => t.status === 'PENDING_APPROVAL' || t.status === 'IN_TRANSIT'
      ).length,
      whatsappUnreadCount: whatsappUnreadTotal,
      pendingPurchaseOrdersCount: pendingPoMetrics.count,
      pendingPurchaseOrdersTotal: pendingPoMetrics.total,
      liveEventNotifications,
    });
  }, [
    products,
    customers,
    salesInvoices,
    warrantyTickets,
    holdBills,
    currentShift,
    currency,
    lastBackupTimestamp,
    interBranchTransfers,
    whatsappUnreadTotal,
    pendingPoMetrics,
    liveEventNotifications,
  ]);

  const notificationSummary = useMemo(
    () =>
      computeNotificationStateSummary({
        rawNotifications: rawSystemNotifications,
        readIds: readNotificationIds,
        dismissedIds: dismissedNotificationIds,
      }),
    [rawSystemNotifications, readNotificationIds, dismissedNotificationIds]
  );

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const toggleNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const ids = notificationSummary.notifications.map((n) => n.id);
    setReadNotificationIds((prev) => Array.from(new Set([...prev, ...ids])));
  }, [notificationSummary.notifications]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const clearReadNotifications = useCallback(() => {
    const readIds = notificationSummary.notifications.filter((n) => n.isRead).map((n) => n.id);
    setDismissedNotificationIds((prev) => Array.from(new Set([...prev, ...readIds])));
  }, [notificationSummary.notifications]);

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
        requestedSettingsTab,
        setRequestedSettingsTab,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        activeIndustry,
        setActiveIndustry,
        invoiceTemplateSettings,
        updateInvoiceTemplateSettings,
        resetInvoiceTemplateSettings,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        backendConnected,
        isInitialServerSyncDone,
        realtimeSyncStatus,
        syncLatencyMs,
        dbRevision,
        connectedLanDevices,
        pendingSyncTransactionsCount: pendingSyncQueue.length,
        isServerSyncing,
        flushPendingSyncQueue,
        offlineStorageMetrics,
        reloadStateFromServer,
        uiTheme,
        setUiTheme,
        uiDensity,
        setUiDensity,
        uiFont,
        setUiFont,
        fontScalePercent,
        setFontScalePercent,
        windowScalePercent,
        setWindowScalePercent,
        tabScalePercent,
        setTabScalePercent,

        isAuthenticated,
        isTerminalLocked,
        lockTerminal,
        unlockTerminal,
        idleTimeoutMinutes,
        setIdleTimeoutMinutes,
        failedLoginAttempts,
        loginLockoutUntilMs,
        login,
        logout,
        switchUserAccount,
        changeUserPassword,
        userAccounts,
        currentAccount,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,
        hasModuleAccess,
        hasPermission,
        usedSerialTokens,
        boundHardware,
        maxObservedClockMs: lastObservedMaxClockMs,

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
        updateBranch,
        deleteBranch,
        warehouses,
        currentWarehouse,
        setCurrentWarehouse,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        currentUser,
        setCurrentUserRole,
        auditLogs,

        categories,
        addCategory,
        updateCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        importBulkProductsCSV,
        batchUpdateProducts,
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
        goodsReceipts,
        purchaseReturns,
        addPurchaseOrder,
        approvePurchaseOrder,
        receivePurchaseOrderPartial,
        createPurchaseReturn,
        applyLandedCostToProducts,

        customers,
        addCustomer,
        batchUpdateCustomers,
        recordCustomerPaymentReceipt,
        salesInvoices,
        addSalesInvoice,
        salesReturns,
        returnedInvoicesArchive,
        autoArchiveReturnedInvoices,
        setAutoArchiveReturnedInvoices,
        createSalesReturnCreditNote,
        voidAndReturnSalesInvoice,
        warrantyTickets,
        createWarrantyMaintenanceTicket,
        advanceWarrantyTicketStatus,
        salesPipelineDocs,
        createSalesPipelineDoc,
        advancePipelineDoc,
        currentShift,
        shiftHistory,
        posCart,
        addToPOSCart,
        addSolarSystemKitToPOSCart,
        removeFromPOSCart,
        updatePOSCartQty,
        updatePOSCartItemUnit,
        updatePOSCartItemMeta,
        toggleAllPOSCartWarranty,
        clearPOSCart,
        checkoutPOS,
        holdBills,
        holdCurrentPOSBill,
        resumePOSBill,
        closePOSShift,
        openNewPOSShift,
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
        universalAiConfig,
        refreshUniversalAiConfig,
        saveUniversalAiConfig,

        outboundMessages,
        messagingGatewayConfig,
        updateMessagingGatewayConfig,
        sendWhatsAppOrSmsMessage,
        quickSendModalState,
        openQuickSendModal,
        closeQuickSendModal,
        currentIndustryBlueprint,
        provisionIndustrySuppliesToInventory,

        // WhatsApp Web Multi-Account In-App Integration
        whatsappAccounts,
        activeWhatsAppAccountId,
        switchWhatsAppAccount,
        addWhatsAppAccount,
        removeWhatsAppAccount,
        startOrOpenWhatsAppChat,
        lastAutoSavedAt,
        whatsappSession,
        whatsappChats,
        activeWhatsAppChatId,
        setActiveWhatsAppChatId,
        markWhatsAppChatRead,
        pairWhatsAppWithQR,
        disconnectWhatsApp,
        sendWhatsAppChatMessage,
        receiveSimulatedWhatsAppCustomerMessage,
        syncLiveWhatsAppMessages,

        // USB Mobile Phone Bridge (SMS over USB)
        usbConnectedDevice,
        updateUsbConnectedDevice,
        usbDiagnosticsReport,
        refreshUsbConnectedDevice,
        connectWebUsbDevice,
        connectWebSerialModem,
        disconnectUsbDevice,
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
        isShiftModalOpen,
        openShiftModal,
        closeShiftModal,

        resetToInitialDemo,
        resetSystemToBlank,
        isOnboardingCompleted,
        completeOnboarding,
        completeFirstLaunchSetup,
        isOnboardingOpen,
        openOnboarding,
        closeOnboarding,
        exportEncryptedDatabaseSnapshot,
        importBackupJSON,

        systemNotifications: notificationSummary.notifications,
        unreadNotificationsCount: notificationSummary.unreadCount,
        criticalNotificationsCount: notificationSummary.criticalCount,
        lastBackupTimestamp,
        pushLiveNotification,
        markNotificationRead,
        toggleNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        clearReadNotifications,
        recordBackupCompleted,
        notificationPermission,
        browserNotificationsEnabled,
        setBrowserNotificationsEnabled,
        requestBrowserNotificationPermission,
        activeToastNotification,
        toastQueue,
        dismissToastNotification,
        pauseToastTimer,
        dispatchToastAndPushNotification,
        soundAlertPrefs,
        updateSoundAlertPrefs,
        autoDailyBackupEnabled,
        setAutoDailyBackupEnabled,
        lastAutoDailyBackupAt,
        latestDailyBackupInfo,
        isRunningDailyBackup,
        runDailyBackupNow,
        downloadLatestDailyBackup,
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
