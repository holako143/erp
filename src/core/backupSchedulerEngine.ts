import { UserRole } from '../types/erp';

export const DAILY_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface DailyBackupMetadata {
  filename: string;
  createdAt: string;
  sizeBytes: number;
  trigger: 'AUTO_DAILY' | 'MANUAL';
  checksumSha256?: string;
  productsCount: number;
  invoicesCount: number;
  customersCount: number;
  source: 'SERVER' | 'LOCAL';
  jsonString?: string;
}

export function isDailyBackupDue(
  lastAutoBackupAt: string | null | undefined,
  nowMs: number = Date.now(),
  intervalMs: number = DAILY_BACKUP_INTERVAL_MS
): boolean {
  if (!lastAutoBackupAt || typeof lastAutoBackupAt !== 'string') {
    return true;
  }
  const parsedMs = Date.parse(lastAutoBackupAt);
  if (!Number.isFinite(parsedMs) || parsedMs <= 0) {
    return true;
  }
  return nowMs - parsedMs >= intervalMs;
}

export function computeNextDailyBackupIso(
  lastAutoBackupAt: string | null | undefined,
  intervalMs: number = DAILY_BACKUP_INTERVAL_MS
): string {
  const baseMs = lastAutoBackupAt ? Date.parse(lastAutoBackupAt) : NaN;
  if (Number.isFinite(baseMs) && baseMs > 0) {
    return new Date(baseMs + intervalMs).toISOString();
  }
  return new Date(Date.now() + intervalMs).toISOString();
}

export function shouldNotifyAdminOfBackup(
  role?: UserRole | string,
  canManageLicense?: boolean
): boolean {
  if (canManageLicense === true) return true;
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MASTER_ADMIN';
}

export function buildDailyBackupArchivePayload(input: {
  tenantCode?: string;
  tenant?: unknown;
  company?: unknown;
  activeIndustry?: unknown;
  invoiceTemplateSettings?: unknown;
  branches?: unknown[];
  warehouses?: unknown[];
  products?: unknown[];
  customers?: unknown[];
  suppliers?: unknown[];
  salesInvoices?: unknown[];
  salesReturns?: unknown[];
  warrantyTickets?: unknown[];
  salesPipelineDocs?: unknown[];
  purchaseOrders?: unknown[];
  goodsReceipts?: unknown[];
  journalEntries?: unknown[];
  chartAccounts?: unknown[];
  trigger?: 'AUTO_DAILY' | 'MANUAL';
  createdAtIso?: string;
}): {
  filename: string;
  jsonString: string;
  sizeBytes: number;
  createdAt: string;
  productsCount: number;
  invoicesCount: number;
  customersCount: number;
} {
  const createdAt = input.createdAtIso || new Date().toISOString();
  const dateStamp = createdAt.slice(0, 10);
  const triggerTag = input.trigger === 'AUTO_DAILY' ? 'daily-auto' : 'manual';
  const tenantSlug = (input.tenantCode || 'ERP').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `haseb-backup-${tenantSlug}-${dateStamp}-${triggerTag}.json`;

  const products = input.products || [];
  const salesInvoices = input.salesInvoices || [];
  const customers = input.customers || [];

  const payload = {
    backupFormat: 'HASEB-CLIENT-BACKUP-V1',
    trigger: input.trigger || 'AUTO_DAILY',
    exportedAt: createdAt,
    tenant: input.tenant,
    company: input.company,
    activeIndustry: input.activeIndustry,
    invoiceTemplateSettings: input.invoiceTemplateSettings,
    branches: input.branches || [],
    warehouses: input.warehouses || [],
    counts: {
      products: products.length,
      customers: customers.length,
      salesInvoices: salesInvoices.length,
    },
    data: {
      products,
      customers,
      suppliers: input.suppliers || [],
      salesInvoices,
      salesReturns: input.salesReturns || [],
      warrantyTickets: input.warrantyTickets || [],
      salesPipelineDocs: input.salesPipelineDocs || [],
      purchaseOrders: input.purchaseOrders || [],
      goodsReceipts: input.goodsReceipts || [],
      journalEntries: input.journalEntries || [],
      chartAccounts: input.chartAccounts || [],
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const sizeBytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(jsonString).byteLength
      : Buffer.byteLength(jsonString, 'utf8');

  return {
    filename,
    jsonString,
    sizeBytes,
    createdAt,
    productsCount: products.length,
    invoicesCount: salesInvoices.length,
    customersCount: customers.length,
  };
}
