/**
 * RLM ERP - Core TypeScript Types & Data Models
 * Enterprise Multi-Tenant & Multi-Industry Modular Architecture
 */

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';
export type Currency = 'YER' | 'SAR' | 'USD' | 'EUR' | 'AED' | 'EGP';

export type IndustryType =
  | 'general'
  | 'restaurant'
  | 'grocery'
  | 'electronics'
  | 'pharmacy'
  | 'contracting';

export type ThermalTemplateType =
  | 'thermal_80mm_onyx_pos'
  | 'thermal_80mm_standard'
  | 'thermal_80mm_restaurant'
  | 'thermal_58mm_compact'
  | 'thermal_80mm_warranty'
  | 'thermal_80mm_modern'
  | 'thermal_80mm_minimal';

export type StandardInvoiceTemplateType =
  | 'a4_onyx_yemen'
  | 'a4_global_sap_odoo'
  | 'a4_corporate_classic'
  | 'a4_modern_blue'
  | 'a4_warranty_electronics'
  | 'a4_medical_pharmacy'
  | 'a4_contracting_specs'
  | 'a4_minimalist_clean';

export interface InvoiceTemplateSettings {
  thermalTemplate: ThermalTemplateType;
  standardTemplate: StandardInvoiceTemplateType;
  headerTitleAr: string;
  headerTitleEn: string;
  footerNoteAr: string;
  footerNoteEn: string;
  showQR: boolean;
  showBarcode: boolean;
  showStampAndSignature: boolean;
  showWarrantyTerms: boolean;
  accentColor: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export type UserRole =
  | 'MASTER_SYSTEM_ADMIN'
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'ACCOUNTANT'
  | 'WAREHOUSE_MANAGER'
  | 'CASHIER'
  | 'SALES_REP'
  | 'HR_MANAGER';

export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  code: string;
  planId: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  activeModules: string[];
  createdAt: string;
}

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  nameAr: string;
  taxNumber: string;
  crNumber: string;
  currency: Currency;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  nameAr: string;
  phone: string;
  city: string;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  name: string;
  nameAr: string;
  isDefault: boolean;
}

export interface StorageBin {
  id: string;
  warehouseId: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  code: string;
}

export interface UserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canApprove: boolean;
  canManageUsers: boolean;
  canManageLicense: boolean;
}

export interface UserAccount {
  id: string;
  tenantId: string;
  username: string;
  password: string;
  email: string;
  name: string;
  nameAr: string;
  role: UserRole;
  branchId: string;
  avatarUrl?: string;
  isActive: boolean;
  allowedModules: string[];
  permissions: UserPermissions;
  lastLoginAt?: string;
  isHiddenMasterAdmin?: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  username?: string;
  email: string;
  name: string;
  nameAr?: string;
  role: UserRole;
  branchId: string;
  avatarUrl?: string;
  isActive: boolean;
  allowedModules?: string[];
  permissions?: UserPermissions;
  isHiddenMasterAdmin?: boolean;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

// -------------------------------------------------------------
// Barcode & Traceability Engine Models
// -------------------------------------------------------------
export type BarcodeFormat =
  | 'EAN-13'
  | 'EAN-8'
  | 'Code 128'
  | 'Code 39'
  | 'QR Code'
  | 'Data Matrix'
  | 'GS1-128';

export interface BarcodeItem {
  id: string;
  tenantId: string;
  code: string;
  format: BarcodeFormat;
  productId: string;
  productName: string;
  productSku: string;
  unitId?: string;
  serialNumber?: string;
  batchNumber?: string;
  isIndividualPiece: boolean;
  printedCount: number;
  scannedCount: number;
  createdAt: string;
}

export interface TraceabilityEvent {
  id: string;
  tenantId: string;
  serialNumber: string;
  productName: string;
  eventType: 'GENERATED' | 'RECEIVED' | 'MOVED' | 'COUNTED' | 'SOLD' | 'RETURNED' | 'MAINTENANCE';
  location: string;
  operator: string;
  referenceDoc: string;
  timestamp: string;
  notes?: string;
}

// -------------------------------------------------------------
// Products & Inventory Models
// -------------------------------------------------------------
export interface Category {
  id: string;
  tenantId: string;
  name: string;
  nameAr: string;
  code: string;
  industry?: IndustryType;
}

export type ElectronicsSubCategory =
  | 'SOLAR_PANEL'
  | 'HYBRID_INVERTER'
  | 'LITHIUM_BATTERY'
  | 'GEL_BATTERY'
  | 'SMART_SCREEN'
  | 'COMPUTING_MOBILE'
  | 'SOLAR_ACCESSORY';

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  barcode: string;
  name: string;
  nameAr: string;
  categoryId: string;
  industry?: IndustryType;
  subCategory?: ElectronicsSubCategory;
  uom: string;
  costPrice: number;
  salePrice: number;
  taxRate: number;
  stockQty: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  warehouseId: string;
  binLocation?: string;
  hasSerials: boolean;
  hasBatches: boolean;
  warrantyMonths?: number;
  powerRatingWatts?: number;
  batteryCapacitySpec?: string;
  voltageSpec?: string;
  screenSizeSpec?: string;
  efficiencySpec?: string;
  expiryDate?: string;
  batchNumber?: string;
  prepTimeMinutes?: number;
  calories?: number;
  isWeightedScale?: boolean;
  imageUrl?: string;
  isActive: boolean;
}

export interface BatchInfo {
  id: string;
  tenantId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expiryDate: string;
  receivedDate: string;
  warehouseId: string;
}

export interface StockMove {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  sku: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  qty: number;
  unitCost: number;
  moveType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  reference: string;
  date: string;
  userId: string;
}

export interface InventoryCount {
  id: string;
  tenantId: string;
  warehouseId: string;
  countNumber: string;
  countType: 'PERIODIC' | 'COMPREHENSIVE' | 'BLIND' | 'CYCLE';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ADJUSTED';
  date: string;
  itemsCounted: number;
  discrepanciesCount: number;
  notes?: string;
}

// -------------------------------------------------------------
// Purchasing Models
// -------------------------------------------------------------
export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  nameAr: string;
  taxNumber: string;
  phone: string;
  email: string;
  paymentTermsDays: number;
  balance: number;
  creditLimit: number;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'RECEIVED' | 'BILLED' | 'CANCELLED';
  approvedBy?: string;
  warehouseId: string;
}

export interface LandedCost {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  freightCost: number;
  customsDuty: number;
  insuranceCost: number;
  handlingCost: number;
  allocationMethod: 'BY_VALUE' | 'BY_QUANTITY';
  totalLandedCost: number;
}

// -------------------------------------------------------------
// Sales & POS Models
// -------------------------------------------------------------
export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  nameAr: string;
  taxNumber?: string;
  phone: string;
  email: string;
  balance: number;
  creditLimit: number;
  loyaltyPoints: number;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  serialNumber?: string;
  warrantyMonths?: number;
  batchNumber?: string;
  expiryDate?: string;
  kitchenNotes?: string;
}

export interface SalesInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  branchId: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'SPLIT' | 'CREDIT';
  status: 'DRAFT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'VOID';
  qrData?: string;
  notes?: string;
  industryMode?: IndustryType;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD';
  tableNumber?: string;
  couponCode?: string;
  couponDiscountAmount?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountValue?: number;
}

export interface POSShift {
  id: string;
  tenantId: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  cashSales: number;
  cardSales: number;
  totalSales: number;
  expectedCash: number;
  actualClosingCash?: number;
  discrepancy?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface POSHoldBill {
  id: string;
  orderNumber: string;
  customerName: string;
  items: InvoiceItem[];
  savedAt: string;
  notes?: string;
  tableNumber?: string;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'STANDARD';
}

export interface KitchenOrderTicket {
  id: string;
  kotNumber: string;
  tableNumber?: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  items: { name: string; qty: number; notes?: string }[];
  status: 'PREPARING' | 'READY' | 'SERVED';
  createdAt: string;
}

// -------------------------------------------------------------
// Accounting & Financial Models
// -------------------------------------------------------------
export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE';

export interface ChartAccount {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr: string;
  type: AccountType;
  level: number;
  parentId?: string;
  balance: number;
  isDebitNormal: boolean;
  isActive: boolean;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountNameAr: string;
  debit: number;
  credit: number;
  costCenter?: string;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  entryNumber: string;
  date: string;
  referenceType: 'MANUAL' | 'SALES_INVOICE' | 'PURCHASE_BILL' | 'STOCK_MOVE' | 'PAYROLL' | 'DEPRECIATION';
  referenceId?: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isPosted: boolean;
  isReversed: boolean;
  reversedByEntryId?: string;
  createdByName: string;
  createdAt: string;
}

export interface CostCenter {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr: string;
}

// -------------------------------------------------------------
// Business Management Modules (HR, Assets, Manufacturing, etc.)
// -------------------------------------------------------------
export interface Employee {
  id: string;
  tenantId: string;
  employeeCode: string;
  fullName: string;
  fullNameAr: string;
  department: string;
  position: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  joinDate: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
}

export interface SalarySlip {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: 'PENDING' | 'PAID';
}

export interface FixedAsset {
  id: string;
  tenantId: string;
  assetCode: string;
  name: string;
  nameAr: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  location: string;
}

export interface BOMItem {
  productId: string;
  productName: string;
  sku: string;
  quantityRequired: number;
  unitCost: number;
}

export interface BillOfMaterials {
  id: string;
  tenantId: string;
  bomCode: string;
  finishedProductId: string;
  finishedProductName: string;
  outputQuantity: number;
  items: BOMItem[];
  laborCost: number;
  overheadCost: number;
  totalCostPerUnit: number;
}

export interface ProductionOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  bomId: string;
  finishedProductName: string;
  targetQuantity: number;
  completedQuantity: number;
  startDate: string;
  dueDate: string;
  status: 'PLANNED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';
}

export interface Project {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr: string;
  customerId?: string;
  budget: number;
  spentCost: number;
  startDate: string;
  endDate: string;
  progressPercent: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
}

export interface FleetVehicle {
  id: string;
  tenantId: string;
  plateNumber: string;
  model: string;
  driverName: string;
  fuelCapacity: number;
  mileageKm: number;
  status: 'AVAILABLE' | 'ON_ROUTE' | 'MAINTENANCE';
}

export interface QualityInspection {
  id: string;
  tenantId: string;
  inspectionNumber: string;
  type: 'RECEIPT' | 'IN_PROCESS' | 'FINAL_PRODUCT';
  referenceDoc: string;
  sampleSize: number;
  defectsCount: number;
  status: 'PASSED' | 'FAILED' | 'CONDITIONAL';
  inspector: string;
  date: string;
}

// -------------------------------------------------------------
// AI Models & Insights
// -------------------------------------------------------------
export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  dataSummary?: any;
  timestamp: string;
  actionsSuggested?: { label: string; actionId: string }[];
}

export interface RestockPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  daysRemaining: number;
  recommendedOrderQty: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

// -------------------------------------------------------------
// CRM, E-Commerce & Enterprise Workflows
// -------------------------------------------------------------
export interface CRMLead {
  id: string;
  tenantId: string;
  companyName?: string;
  contactName?: string;
  leadName?: string;
  leadNameAr?: string;
  company?: string;
  contactPerson?: string;
  source?: string;
  probability?: number;
  phone: string;
  email: string;
  estimatedValue: number;
  stage: 'NEW_LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  assignedTo: string;
  createdAt?: string;
}

export interface EcommerceOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  customerName: string;
  city: string;
  channel?: string;
  itemsCount: number;
  totalAmount: number;
  paymentGateway: 'MADA' | 'APPLE_PAY' | 'TAMARA' | 'TABBY' | 'COD';
  fulfillmentStatus: 'NEW_ORDER' | 'PACKING' | 'SHIPPED' | 'DELIVERED';
  createdAt?: string;
}

export interface WorkflowApproval {
  id: string;
  tenantId: string;
  requestNumber: string;
  module: 'PURCHASING' | 'ACCOUNTING' | 'HR' | 'INVENTORY';
  title: string;
  titleAr: string;
  requestedBy: string;
  approverRole?: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date?: string;
}

// -------------------------------------------------------------
// Track 3: Bank Reconciliation, Post-Dated Checks (PDC) & Multi-Currency
// -------------------------------------------------------------
export interface BankStatementLine {
  id: string;
  tenantId: string;
  date: string;
  reference: string;
  description: string;
  descriptionAr: string;
  amount: number; // Positive = Credit/Deposit in Bank, Negative = Debit/Withdrawal in Bank
  status: 'MATCHED' | 'UNRECONCILED' | 'ADJUSTED';
  matchedJournalEntryId?: string;
}

export interface PostDatedCheck {
  id: string;
  tenantId: string;
  checkNumber: string;
  type: 'RECEIVABLE' | 'PAYABLE'; // شيك قبض وارد من عميل | شيك دفع صادر لمورد
  partyName: string;
  bankName: string;
  amount: number;
  currency: Currency;
  issueDate: string;
  maturityDate: string;
  status: 'UNDER_COLLECTION' | 'CLEARED' | 'BOUNCED';
  journalEntryId?: string;
  notes?: string;
}

export interface CurrencyExchangeRate {
  currency: Currency;
  nameAr: string;
  nameEn: string;
  symbol: string;
  rateToSAR: number; // 1 unit of Currency = X SAR
  previousRateToSAR: number;
  foreignMonetaryBalance: number;
  lastUpdated: string;
}

// -------------------------------------------------------------
// Track 4: Multi-Stage Sales Fulfillment Pipeline & Cost Center Budgets
// -------------------------------------------------------------
export type SalesPipelineStage =
  | 'QUOTATION'
  | 'SALES_ORDER'
  | 'DELIVERY_NOTE'
  | 'INVOICED'
  | 'CANCELLED';

export interface SalesPipelineDoc {
  id: string;
  tenantId: string;
  branchId: string;
  warehouseId: string;
  quoteNumber: string;
  salesOrderNumber?: string;
  deliveryNoteNumber?: string;
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  customerId: string;
  customerName: string;
  date: string;
  validUntil: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'CARD' | 'CREDIT';
  stage: SalesPipelineStage;
  stockReserved: boolean;
  stockDeducted: boolean;
  cogsJournalNumber?: string;
  notes?: string;
}

export interface CostCenterBudget {
  id: string;
  tenantId: string;
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  costCenterNameAr: string;
  branchId: string;
  branchNameAr: string;
  fiscalPeriod: string;
  allocatedBudget: number;
  committedAmount: number;
  baseActualSpent: number;
  alertThresholdPercent: number;
  notes?: string;
}

// -------------------------------------------------------------
// Track 5: Sales Returns, Exchanges & Credit Notes (Section 9)
// -------------------------------------------------------------
export type ReturnedItemCondition =
  | 'HEALTHY_RESTOCK'
  | 'DEFECTIVE_QUARANTINE'
  | 'EXCHANGE_REPLACED';

export type ReturnRefundMethod = 'CASH' | 'CREDIT_BALANCE' | 'EXCHANGE_UNIT';

export interface SalesReturnDoc {
  id: string;
  tenantId: string;
  creditNoteNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  sku: string;
  serialNumber?: string;
  replacementSerialNumber?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  taxAmount: number;
  totalRefund: number;
  condition: ReturnedItemCondition;
  refundMethod: ReturnRefundMethod;
  reason: string;
  withinWarranty: boolean;
  date: string;
  journalEntryNumber: string;
  approvedBy: string;
}

// -------------------------------------------------------------
// Track 6: Warranty Claims & After-Sales Maintenance Center (Section 16)
// -------------------------------------------------------------
export type MaintenanceTicketStatus =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'WAITING_APPROVAL'
  | 'WAITING_PARTS'
  | 'IN_REPAIR'
  | 'TESTING'
  | 'READY'
  | 'DELIVERED'
  | 'REJECTED';

export interface WarrantyMaintenanceTicket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  serialNumber: string;
  productId: string;
  productName: string;
  sku: string;
  customerName: string;
  customerPhone: string;
  purchaseDate: string;
  warrantyMonths: number;
  warrantyExpiryDate: string;
  isUnderWarranty: boolean;
  faultDescription: string;
  technicianReport: string;
  sparePartsUsed: string;
  sparePartsCost: number;
  laborFee: number;
  totalCustomerCharge: number;
  status: MaintenanceTicketStatus;
  receivedAt: string;
  expectedDeliveryDate: string;
  journalEntryNumber?: string;
}

// -------------------------------------------------------------
// Track 7: Smart Product Label Camera / OCR Identification (Section 4)
// -------------------------------------------------------------
export interface SmartLabelOCRResult {
  rawLabelText: string;
  manufacturer: string;
  modelCode: string;
  extractedNameAr: string;
  serialNumber: string;
  imeiNumber?: string;
  barcode: string;
  subCategory: ElectronicsSubCategory;
  powerRatingWatts?: number;
  voltageSpec?: string;
  batteryCapacitySpec?: string;
  efficiencySpec?: string;
  matchedProductId?: string;
  matchedProductName?: string;
  isDuplicateSerial: boolean;
  duplicateLocationInfo?: string;
  confidencePercent: number;
}

// -------------------------------------------------------------
// Track 8: Hidden Master Admin Configuration, Coupons & Promotions, and LAN Hub
// -------------------------------------------------------------
export interface UIElementsVisibilityConfig {
  showIndustrySwitcher: boolean;
  showCurrencySwitcher: boolean;
  showCouponsAndPromotions: boolean;
  showProfitMarginsInPOS: boolean;
  showCostPriceInInventory: boolean;
  showExportImportButtons: boolean;
  showLanNetworkBanner: boolean;
  showKeyboardShortcutsBar: boolean;
  showTaxAndFiscalBadges: boolean;
  showAIInsightsWidget: boolean;
  showSolarSizingEngine: boolean;
  showWarrantyAndRMA: boolean;
  showSmartLabelOCR: boolean;
  showScaleBarcodeTools: boolean;
  showLandedCostCalculator: boolean;
  showMultiCurrencyEngine: boolean;
  showManufacturingAndProjects: boolean;
  showAIInsights: boolean;
  showTaxAndComplianceFields: boolean;
}

export type SectorModeType = 'SOLAR_ELECTRONICS_CORE' | 'FULL_SUITE';

export interface MasterSystemConfig {
  industryLockMode: 'SINGLE_LOCKED' | 'MULTI_SELECTABLE';
  lockedIndustry: IndustryType;
  sectorMode?: SectorModeType;
  sectorModeEnabled?: boolean;
  globalCountryMode: 'GLOBAL' | 'YEMEN' | 'SAUDI' | 'INTERNATIONAL';
  globalDefaultCurrency: Currency;
  defaultTaxRatePercent: number;
  enableTaxCalculation: boolean;
  cardPaymentLabelAr: string;
  cashPaymentLabelAr: string;
  visibleModules: Record<string, boolean>;
  uiElementsVisibility: UIElementsVisibilityConfig;
  keyboardShortcutsEnabled: boolean;
  lanSyncEnabled: boolean;
  updatedAt: string;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
}

export interface PromoCoupon {
  id: string;
  tenantId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  titleAr?: string;
  titleEn?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount: number;
  minInvoiceAmount?: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableIndustry: IndustryType | 'ALL';
}

export interface PromotionalOffer {
  id: string;
  tenantId: string;
  titleAr: string;
  titleEn: string;
  nameAr?: string;
  nameEn?: string;
  offerType: 'BUNDLE_DISCOUNT' | 'BUY_X_GET_DISCOUNT' | 'SEASONAL_SALE';
  minQty: number;
  minOrderAmount?: number;
  discountPercent: number;
  badgeTextAr: string;
  isActive: boolean;
  validUntil: string;
}

export interface NetworkHostInfo {
  hostname: string;
  port: number;
  lanAddresses: string[];
  primaryLanUrl: string;
  platform: string;
  serverTimestampMs: number;
  dbRevision: number;
  memoryStoreSizeKb: number;
}

// -------------------------------------------------------------
// Track 9: Omnichannel WhatsApp & SMS Notification Engine
// -------------------------------------------------------------
export type MessagingChannel = 'WHATSAPP' | 'SMS';

export type MessageTemplateCategory =
  | 'INVOICE'
  | 'DEBT_REMINDER'
  | 'RECEIPT_VOUCHER'
  | 'RMA_WARRANTY'
  | 'FINANCIAL_REPORT'
  | 'LOW_STOCK_ALERT'
  | 'CUSTOM_OPERATION';

export type InvoiceAttachmentDispatchFormat =
  | 'TEXT_ONLY'
  | 'IMAGE_SNAPSHOT'
  | 'PDF_DOCUMENT'
  | 'ALL_COMBINED';

export interface OutboundMessageRecord {
  id: string;
  tenantId: string;
  channel: MessagingChannel;
  category: MessageTemplateCategory;
  recipientName: string;
  recipientPhone: string;
  normalizedPhone: string;
  referenceNumber?: string;
  messageBody: string;
  status: 'DELIVERED' | 'DISPATCHED_GATEWAY' | 'OPENED_DIRECT_LINK' | 'FAILED';
  whatsappUrl: string;
  smsUri: string;
  sentBy: string;
  sentAt: string;
  dispatchFormat?: InvoiceAttachmentDispatchFormat;
  pdfAttached?: boolean;
  imageAttached?: boolean;
  deliveryConfirmed?: boolean;
  retryCount?: number;
}

export interface MessagingGatewayConfig {
  defaultCountryDialCode: string; // e.g., '+967' or '+966'
  smsSenderId: string;
  whatsappBusinessConnected: boolean;
  smsGatewayConnected: boolean;
  autoSendOnPOSCheckout: boolean;
  autoIncludeInvoiceItems: boolean;
  autoIncludeWarrantyTerms: boolean;
  preferredInvoiceFormat: InvoiceAttachmentDispatchFormat;
  guaranteedActualDispatch: boolean;
  usbModemDirectPort: string;
  ownerReportPhone: string;
  customSignatureAr: string;
}

export interface IndustrySupplyItem {
  id: string;
  industry: IndustryType;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  categoryAr: string;
  uom: string;
  costPrice: number;
  salePrice: number;
  minStockAlert: number;
  defaultStock: number;
  specificationsAr: string;
  isConsumable: boolean;
  warrantyMonths: number;
}

// -------------------------------------------------------------
// Track 11: Integrated WhatsApp Web Session & In-App Chat Station
// -------------------------------------------------------------
export type WhatsAppSessionStatus =
  | 'DISCONNECTED'
  | 'PAIRING_QR'
  | 'CONNECTING'
  | 'CONNECTED';

export interface WhatsAppSessionInfo {
  status: WhatsAppSessionStatus;
  phoneNumber: string;
  pushName: string;
  batteryLevel: number;
  qrCodeData: string;
  qrExpiresInSec: number;
  pairedAt?: string;
  platform: string;
  pairingUrl?: string;
  pairingCode8Digit?: string;
  qrFullMatrixData?: boolean[][];
}

export interface WhatsAppChatMessage {
  id: string;
  chatId: string;
  sender: 'ME' | 'THEM' | 'SYSTEM';
  text: string;
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  attachmentType?: 'INVOICE' | 'RECEIPT' | 'DEBT_REMINDER' | 'WARRANTY' | 'IMAGE' | 'NONE';
  referenceNumber?: string;
  attachmentUrl?: string;
}

export interface WhatsAppChat {
  id: string;
  contactName: string;
  contactPhone: string;
  normalizedPhone: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isBusiness: boolean;
  customerId?: string;
  pinned?: boolean;
  messages: WhatsAppChatMessage[];
}

export interface WhatsAppAccountInstance {
  id: string;
  accountLabel: string;
  departmentAr: string;
  colorAccent: 'emerald' | 'blue' | 'amber' | 'violet' | 'rose';
  session: WhatsAppSessionInfo;
  chats: WhatsAppChat[];
  autoReplyEnabled: boolean;
  messagesDispatchedCount: number;
  lastActiveAt: string;
}


// -------------------------------------------------------------
// Track 12: Android USB Cable / Mobile Phone Modem Bridge (SMS over USB / ADB)
// -------------------------------------------------------------
export type UsbDeviceStatus =
  | 'DISCONNECTED'
  | 'DETECTING'
  | 'AUTHORIZING'
  | 'CONNECTED'
  | 'ERROR';

export interface UsbConnectedDevice {
  id: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  port: string;
  connectionMode: 'ADB_DEBUGGING' | 'SERIAL_MODEM_AT' | 'DIRECT_USB_CABLE';
  simOperator: string;
  simSlot: number;
  signalStrengthPercent: number;
  batteryPercent: number;
  isCharging: boolean;
  usbDebuggingEnabled: boolean;
  atCommandReady: boolean;
  messagesSentCount: number;
  connectedAt: string;
}

export interface UsbDiagnosticsReport {
  timestamp: string;
  usbPortCheck: boolean;
  driverLoaded: boolean;
  adbDaemonRunning: boolean;
  usbPermissionGranted: boolean;
  atCmdResponseOk: boolean;
  diagnosticLogs: string[];
}

// -------------------------------------------------------------
// Track 13: Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfer
// -------------------------------------------------------------
export type BranchNetworkNodeStatus = 'ONLINE_LAN' | 'ONLINE_WAN' | 'OFFLINE';

export interface BranchNodeInfo {
  branchId: string;
  branchCode: string;
  branchNameAr: string;
  branchCity: string;
  lanIpAddress: string;
  wanHost?: string;
  status: BranchNetworkNodeStatus;
  latencyMs: number;
  lastHeartbeat: string;
  isCurrentNode: boolean;
  warehouseId: string;
  warehouseNameAr: string;
}

export interface CrossBranchStockItem {
  branchId: string;
  branchCode: string;
  branchNameAr: string;
  warehouseId: string;
  warehouseNameAr: string;
  lanIpAddress: string;
  isCurrentBranch: boolean;
  stockQty: number;
  reservedQty: number;
  availableQty: number;
  unitCost: number;
  salePrice: number;
  binLocation: string;
  latencyMs: number;
}

export interface InterBranchTransferRequest {
  id: string;
  tenantId: string;
  requestNumber: string;
  sourceBranchId: string;
  sourceBranchNameAr: string;
  targetBranchId: string;
  targetBranchNameAr: string;
  productId: string;
  productNameAr: string;
  sku: string;
  requestedQty: number;
  urgency: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  requestedBy: string;
  requestedAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  notes?: string;
  journalEntryNumber?: string;
}



