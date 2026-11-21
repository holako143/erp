import {
  AutoBackupConfig,
  AutoBackupSchedule,
  BackupDestinationMode,
  CloudBackupProvider,
  CloudSyncFrequency,
  UserRole,
} from '../types/erp';

export const DAILY_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const VALID_BACKUP_SCHEDULES: readonly AutoBackupSchedule[] = [
  'OFF',
  'HOURLY',
  'EVERY_6_HOURS',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
];

export const VALID_BACKUP_DESTINATIONS: readonly BackupDestinationMode[] = [
  'LOCAL',
  'CLOUD',
  'LOCAL_AND_CLOUD',
];

export const VALID_CLOUD_PROVIDERS: readonly CloudBackupProvider[] = [
  'S3_COMPATIBLE',
  'GOOGLE_DRIVE',
  'WEBDAV',
  'CUSTOM_WEBHOOK',
];

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

export const DEFAULT_RECURRING_BACKUP_CONFIG: AutoBackupConfig = {
  schedule: 'EVERY_6_HOURS',
  destination: 'LOCAL',
  maxRetentionCount: 15,
  includeSqliteCopy: true,
  encryptBackup: false,
  preferredTimeHHMM: '02:00',
  dayOfWeek: 5, // Friday
  dayOfMonth: 1,
  localDirectoryLabel: '.data/backups',
  cloudProvider: 'S3_COMPATIBLE',
  cloudEndpointUrl: '',
  cloudBucketOrFolder: 'haseb-erp-backups',
  cloudSyncFrequency: 'DAILY',
  hasCloudAuthToken: false,
  lastCloudSyncStatus: 'NOT_CONFIGURED',
};

export function parseTimeHHMM(value?: string): { hours: number; minutes: number } | null {
  if (!value || typeof value !== 'string') return null;
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
}

export function getSimpleScheduleIntervalMs(schedule: AutoBackupSchedule): number {
  switch (schedule) {
    case 'HOURLY':
      return 3600 * 1000;
    case 'EVERY_6_HOURS':
      return 6 * 3600 * 1000;
    case 'DAILY':
      return 24 * 3600 * 1000;
    case 'WEEKLY':
      return 7 * 24 * 3600 * 1000;
    case 'MONTHLY':
      return 30 * 24 * 3600 * 1000;
    case 'OFF':
    default:
      return 0;
  }
}

/**
 * Pure deterministic calculation of the next scheduled backup timestamp (UTC/local Date math)
 * supporting HOURLY, EVERY_6_HOURS, DAILY (at preferredTimeHHMM), WEEKLY (dayOfWeek + HH:MM),
 * and MONTHLY (dayOfMonth + HH:MM).
 */
export function computeNextScheduledBackupIso(
  config: Pick<
    AutoBackupConfig,
    'schedule' | 'preferredTimeHHMM' | 'dayOfWeek' | 'dayOfMonth'
  >,
  fromMs: number = Date.now()
): string | undefined {
  const schedule = config.schedule;
  if (!schedule || schedule === 'OFF') return undefined;

  if (schedule === 'HOURLY') {
    return new Date(fromMs + 3600 * 1000).toISOString();
  }
  if (schedule === 'EVERY_6_HOURS') {
    return new Date(fromMs + 6 * 3600 * 1000).toISOString();
  }

  const parsedTime = parseTimeHHMM(config.preferredTimeHHMM) || { hours: 2, minutes: 0 };
  const base = new Date(fromMs);

  if (schedule === 'DAILY') {
    const candidate = new Date(fromMs);
    candidate.setUTCHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    if (candidate.getTime() <= fromMs) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate.toISOString();
  }

  if (schedule === 'WEEKLY') {
    const targetDay =
      typeof config.dayOfWeek === 'number' && config.dayOfWeek >= 0 && config.dayOfWeek <= 6
        ? Math.trunc(config.dayOfWeek)
        : 5;
    const candidate = new Date(fromMs);
    candidate.setUTCHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    const currentDay = base.getUTCDay();
    let deltaDays = (targetDay - currentDay + 7) % 7;
    if (deltaDays === 0 && candidate.getTime() <= fromMs) {
      deltaDays = 7;
    }
    candidate.setUTCDate(candidate.getUTCDate() + deltaDays);
    return candidate.toISOString();
  }

  if (schedule === 'MONTHLY') {
    const targetDate =
      typeof config.dayOfMonth === 'number' && config.dayOfMonth >= 1 && config.dayOfMonth <= 28
        ? Math.trunc(config.dayOfMonth)
        : 1;
    const candidate = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        targetDate,
        parsedTime.hours,
        parsedTime.minutes,
        0,
        0
      )
    );
    if (candidate.getTime() <= fromMs) {
      candidate.setUTCMonth(candidate.getUTCMonth() + 1);
    }
    return candidate.toISOString();
  }

  return undefined;
}

export function resolveEffectiveCloudSchedule(
  config: Pick<AutoBackupConfig, 'destination' | 'schedule' | 'cloudSyncFrequency'>
): AutoBackupSchedule {
  if (config.destination === 'LOCAL') return 'OFF';
  const freq = config.cloudSyncFrequency || 'SAME_AS_LOCAL';
  if (freq === 'SAME_AS_LOCAL') return config.schedule;
  return freq;
}

export interface BackupConfigValidationResult {
  valid: boolean;
  errors: string[];
  normalized: AutoBackupConfig;
}

export function validateRecurringBackupConfig(
  input: Partial<AutoBackupConfig>,
  existing: AutoBackupConfig = DEFAULT_RECURRING_BACKUP_CONFIG
): BackupConfigValidationResult {
  const errors: string[] = [];

  const schedule: AutoBackupSchedule = VALID_BACKUP_SCHEDULES.includes(
    input.schedule as AutoBackupSchedule
  )
    ? (input.schedule as AutoBackupSchedule)
    : existing.schedule;

  const destination: BackupDestinationMode = VALID_BACKUP_DESTINATIONS.includes(
    input.destination as BackupDestinationMode
  )
    ? (input.destination as BackupDestinationMode)
    : existing.destination || 'LOCAL';

  const rawRetention =
    input.maxRetentionCount !== undefined
      ? Number(input.maxRetentionCount)
      : existing.maxRetentionCount;
  if (!Number.isFinite(rawRetention) || rawRetention < 3 || rawRetention > 100) {
    errors.push('الحد الأقصى للنسخ المحفوظة يجب أن يكون بين 3 و 100 نسخة.');
  }
  const maxRetentionCount = Number.isFinite(rawRetention)
    ? Math.max(3, Math.min(100, Math.round(rawRetention)))
    : existing.maxRetentionCount;

  const preferredTimeHHMM =
    input.preferredTimeHHMM !== undefined
      ? String(input.preferredTimeHHMM).trim()
      : existing.preferredTimeHHMM || '02:00';
  if (
    (schedule === 'DAILY' || schedule === 'WEEKLY' || schedule === 'MONTHLY') &&
    !parseTimeHHMM(preferredTimeHHMM)
  ) {
    errors.push('صيغة وقت التنفيذ غير صالحة (يجب أن تكون مثل 02:00).');
  }

  const rawDayOfWeek =
    input.dayOfWeek !== undefined ? Number(input.dayOfWeek) : existing.dayOfWeek ?? 5;
  if (schedule === 'WEEKLY' && (!Number.isInteger(rawDayOfWeek) || rawDayOfWeek < 0 || rawDayOfWeek > 6)) {
    errors.push('يوم الأسبوع للنسخ الأسبوعي يجب أن يكون بين 0 و 6.');
  }
  const dayOfWeek = Number.isInteger(rawDayOfWeek)
    ? Math.max(0, Math.min(6, rawDayOfWeek))
    : 5;

  const rawDayOfMonth =
    input.dayOfMonth !== undefined ? Number(input.dayOfMonth) : existing.dayOfMonth ?? 1;
  if (
    schedule === 'MONTHLY' &&
    (!Number.isInteger(rawDayOfMonth) || rawDayOfMonth < 1 || rawDayOfMonth > 28)
  ) {
    errors.push('يوم الشهر للنسخ الشهري يجب أن يكون بين 1 و 28.');
  }
  const dayOfMonth = Number.isInteger(rawDayOfMonth)
    ? Math.max(1, Math.min(28, rawDayOfMonth))
    : 1;

  const cloudProvider: CloudBackupProvider = VALID_CLOUD_PROVIDERS.includes(
    input.cloudProvider as CloudBackupProvider
  )
    ? (input.cloudProvider as CloudBackupProvider)
    : existing.cloudProvider || 'S3_COMPATIBLE';

  const cloudEndpointUrl =
    input.cloudEndpointUrl !== undefined
      ? String(input.cloudEndpointUrl).trim()
      : existing.cloudEndpointUrl || '';

  const cloudBucketOrFolder =
    input.cloudBucketOrFolder !== undefined
      ? String(input.cloudBucketOrFolder).trim()
      : existing.cloudBucketOrFolder || 'haseb-erp-backups';

  const cloudSyncFrequency: CloudSyncFrequency =
    input.cloudSyncFrequency === 'SAME_AS_LOCAL' ||
    VALID_BACKUP_SCHEDULES.includes(input.cloudSyncFrequency as AutoBackupSchedule)
      ? (input.cloudSyncFrequency as CloudSyncFrequency)
      : existing.cloudSyncFrequency || 'DAILY';

  if (destination === 'CLOUD' || destination === 'LOCAL_AND_CLOUD') {
    if (!cloudEndpointUrl) {
      errors.push('يرجى إدخال رابط نقطة السحابة (Cloud Endpoint URL) عند تفعيل النسخ السحابي.');
    } else if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(cloudEndpointUrl)) {
      errors.push('رابط السحابة غير صالح؛ يجب أن يبدأ بـ https:// أو http://.');
    }
    if (!cloudBucketOrFolder) {
      errors.push('يرجى تحديد اسم المجلد أو الحاوية السحابية (Bucket / Folder).');
    }
  }

  const normalized: AutoBackupConfig = {
    ...existing,
    schedule,
    destination,
    maxRetentionCount,
    includeSqliteCopy:
      typeof input.includeSqliteCopy === 'boolean'
        ? input.includeSqliteCopy
        : existing.includeSqliteCopy,
    encryptBackup:
      typeof input.encryptBackup === 'boolean'
        ? input.encryptBackup
        : Boolean(existing.encryptBackup),
    preferredTimeHHMM: parseTimeHHMM(preferredTimeHHMM) ? preferredTimeHHMM : '02:00',
    dayOfWeek,
    dayOfMonth,
    localDirectoryLabel:
      typeof input.localDirectoryLabel === 'string' && input.localDirectoryLabel.trim()
        ? input.localDirectoryLabel.trim()
        : existing.localDirectoryLabel || '.data/backups',
    cloudProvider,
    cloudEndpointUrl,
    cloudBucketOrFolder,
    cloudSyncFrequency,
  };

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

export function buildScheduleSummaryLabel(
  config: AutoBackupConfig,
  language: 'ar' | 'en' = 'ar'
): string {
  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const time = config.preferredTimeHHMM || '02:00';

  const freqLabel = (() => {
    switch (config.schedule) {
      case 'HOURLY':
        return language === 'ar' ? 'كل ساعة' : 'Hourly';
      case 'EVERY_6_HOURS':
        return language === 'ar' ? 'كل 6 ساعات' : 'Every 6 hours';
      case 'DAILY':
        return language === 'ar' ? `يومياً (${time})` : `Daily (${time})`;
      case 'WEEKLY':
        return language === 'ar'
          ? `أسبوعياً - ${daysAr[config.dayOfWeek ?? 5]} (${time})`
          : `Weekly - ${daysEn[config.dayOfWeek ?? 5]} (${time})`;
      case 'MONTHLY':
        return language === 'ar'
          ? `شهرياً - يوم ${config.dayOfMonth ?? 1} (${time})`
          : `Monthly - Day ${config.dayOfMonth ?? 1} (${time})`;
      case 'OFF':
      default:
        return language === 'ar' ? 'متوقف' : 'Disabled';
    }
  })();

  const destLabel = (() => {
    switch (config.destination) {
      case 'CLOUD':
        return language === 'ar' ? 'سحابي فقط' : 'Cloud Only';
      case 'LOCAL_AND_CLOUD':
        return language === 'ar' ? 'محلي + سحابي' : 'Local + Cloud';
      case 'LOCAL':
      default:
        return language === 'ar' ? 'محلي فقط' : 'Local Only';
    }
  })();

  return `${freqLabel} · ${destLabel}`;
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
