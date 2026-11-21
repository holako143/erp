import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextScheduledBackupIso,
  validateRecurringBackupConfig,
  resolveEffectiveCloudSchedule,
  buildScheduleSummaryLabel,
  DEFAULT_RECURRING_BACKUP_CONFIG,
} from './backupSchedulerEngine';
import {
  createDefaultPrinterProfiles,
  validatePrinterProfileInput,
  upsertPrinterProfile,
  setDefaultPrinterProfile,
  deletePrinterProfile,
  resolveDefaultPrinterForMode,
  resolveGlobalDefaultPrinter,
  buildPrinterTestTicketSummary,
} from './printerProfileEngine';

test('Recurring Backup Scheduler: computes next scheduled ISO accurately for all frequencies', () => {
  const baseMs = Date.parse('2026-11-20T10:00:00.000Z'); // Friday

  assert.equal(computeNextScheduledBackupIso({ schedule: 'OFF' }, baseMs), undefined);

  assert.equal(
    computeNextScheduledBackupIso({ schedule: 'HOURLY' }, baseMs),
    '2026-11-20T11:00:00.000Z'
  );

  assert.equal(
    computeNextScheduledBackupIso({ schedule: 'EVERY_6_HOURS' }, baseMs),
    '2026-11-20T16:00:00.000Z'
  );

  // Daily at 14:30 (later today)
  assert.equal(
    computeNextScheduledBackupIso({ schedule: 'DAILY', preferredTimeHHMM: '14:30' }, baseMs),
    '2026-11-20T14:30:00.000Z'
  );

  // Daily at 02:00 (already passed today -> tomorrow)
  assert.equal(
    computeNextScheduledBackupIso({ schedule: 'DAILY', preferredTimeHHMM: '02:00' }, baseMs),
    '2026-11-21T02:00:00.000Z'
  );

  // Weekly on Friday (dayOfWeek=5) at 02:00 (passed -> next Friday Nov 27)
  assert.equal(
    computeNextScheduledBackupIso(
      { schedule: 'WEEKLY', dayOfWeek: 5, preferredTimeHHMM: '02:00' },
      baseMs
    ),
    '2026-11-27T02:00:00.000Z'
  );

  // Weekly on Monday (dayOfWeek=1) at 03:00 -> Nov 23
  assert.equal(
    computeNextScheduledBackupIso(
      { schedule: 'WEEKLY', dayOfWeek: 1, preferredTimeHHMM: '03:00' },
      baseMs
    ),
    '2026-11-23T03:00:00.000Z'
  );

  // Monthly on day 1 at 02:00 -> Dec 1
  assert.equal(
    computeNextScheduledBackupIso(
      { schedule: 'MONTHLY', dayOfMonth: 1, preferredTimeHHMM: '02:00' },
      baseMs
    ),
    '2026-12-01T02:00:00.000Z'
  );
});

test('Recurring Backup Scheduler: validates local & cloud configs and rejects invalid inputs', () => {
  // Missing cloud URL when destination includes CLOUD
  const invalidCloud = validateRecurringBackupConfig({
    schedule: 'DAILY',
    destination: 'LOCAL_AND_CLOUD',
    cloudEndpointUrl: '',
    cloudBucketOrFolder: '',
    maxRetentionCount: 15,
  });
  assert.equal(invalidCloud.valid, false);
  assert.ok(invalidCloud.errors.length >= 2);

  // Invalid retention & invalid time
  const invalidParams = validateRecurringBackupConfig({
    schedule: 'DAILY',
    destination: 'LOCAL',
    maxRetentionCount: 1,
    preferredTimeHHMM: '25:99',
  });
  assert.equal(invalidParams.valid, false);
  assert.ok(invalidParams.errors.length >= 2);

  // Valid dual local + cloud weekly config
  const validDual = validateRecurringBackupConfig({
    schedule: 'WEEKLY',
    destination: 'LOCAL_AND_CLOUD',
    preferredTimeHHMM: '03:30',
    dayOfWeek: 5,
    maxRetentionCount: 25,
    cloudProvider: 'S3_COMPATIBLE',
    cloudEndpointUrl: 'https://s3.me-south-1.amazonaws.com/backups',
    cloudBucketOrFolder: 'haseb-prod-vault',
    cloudSyncFrequency: 'DAILY',
  });
  assert.equal(validDual.valid, true);
  assert.equal(validDual.errors.length, 0);
  assert.equal(validDual.normalized.destination, 'LOCAL_AND_CLOUD');
  assert.equal(resolveEffectiveCloudSchedule(validDual.normalized), 'DAILY');

  assert.equal(
    resolveEffectiveCloudSchedule({ ...DEFAULT_RECURRING_BACKUP_CONFIG, destination: 'LOCAL' }),
    'OFF'
  );

  const summary = buildScheduleSummaryLabel(validDual.normalized, 'ar');
  assert.ok(summary.includes('أسبوعياً'));
  assert.ok(summary.includes('محلي + سحابي'));
});

test('POS Printer Configuration Manager: CRUD, validation, default invariants & mode resolution', () => {
  const initial = createDefaultPrinterProfiles();
  assert.equal(initial.length, 3);
  assert.equal(resolveGlobalDefaultPrinter(initial)?.category, 'RECEIPT');
  assert.equal(resolveDefaultPrinterForMode(initial, 'thermal')?.paperSize, '80mm');
  assert.equal(resolveDefaultPrinterForMode(initial, 'a4')?.paperSize, 'A4');

  // Validation rejects empty name, mismatched paper size, invalid IP
  const bad1 = validatePrinterProfileInput({
    name: '',
    category: 'RECEIPT',
    paperSize: 'A4',
    connectionType: 'NETWORK_IP',
    addressOrPort: 'not-an-ip',
    copies: 9,
  });
  assert.equal(bad1.valid, false);
  assert.ok(bad1.errors.length >= 4);

  // Add a new A4 network printer and promote to category default
  const validNewInput = {
    name: 'طابعة المستودع A4 الشبكية',
    category: 'A4' as const,
    paperSize: 'A4' as const,
    connectionType: 'NETWORK_IP' as const,
    addressOrPort: '192.168.1.200:9100',
    copies: 2,
    autoPrintOnSale: true,
    isDefaultForCategory: true,
  };
  assert.equal(validatePrinterProfileInput(validNewInput).valid, true);

  const { profiles: afterAdd, saved } = upsertPrinterProfile(initial, validNewInput);
  assert.equal(afterAdd.length, 4);
  assert.equal(resolveDefaultPrinterForMode(afterAdd, 'a4')?.id, saved.id);
  // Global default should still be the original receipt printer
  assert.equal(resolveGlobalDefaultPrinter(afterAdd)?.id, 'prn-receipt-main-80mm');

  // Promote new A4 printer to global default
  const afterGlobal = setDefaultPrinterProfile(afterAdd, saved.id, 'GLOBAL');
  assert.equal(resolveGlobalDefaultPrinter(afterGlobal)?.id, saved.id);
  assert.equal(afterGlobal.filter((p) => p.isGlobalDefault).length, 1);
  // Receipt category still keeps its own category default!
  assert.equal(resolveDefaultPrinterForMode(afterGlobal, 'thermal')?.id, 'prn-receipt-main-80mm');

  // Delete the global default -> another active printer is automatically promoted
  const delRes = deletePrinterProfile(afterGlobal, saved.id);
  assert.equal(delRes.success, true);
  assert.equal(delRes.profiles.length, 3);
  assert.equal(delRes.profiles.filter((p) => p.isGlobalDefault).length, 1);
  assert.ok(resolveDefaultPrinterForMode(delRes.profiles, 'a4'));

  // Deleting the last remaining printer is blocked
  const oneLeft = [delRes.profiles[0]];
  const blockedDel = deletePrinterProfile(oneLeft, oneLeft[0].id);
  assert.equal(blockedDel.success, false);

  // Test ticket summary builder
  const ticket = buildPrinterTestTicketSummary(saved, 'مؤسسة النجم للطاقة');
  assert.ok(ticket.title.includes('A4'));
  assert.ok(ticket.lines.some((l) => l.includes('192.168.1.200:9100')));
});
