import React, { useState } from 'react';
import {
  AutoBackupConfig,
  AutoBackupSchedule,
  BackupDestinationMode,
  CloudBackupProvider,
  CloudSyncFrequency,
  ServerBackupMetadata,
} from '../../types/erp';
import {
  buildScheduleSummaryLabel,
  computeNextScheduledBackupIso,
  resolveEffectiveCloudSchedule,
  validateRecurringBackupConfig,
} from '../../core/backupSchedulerEngine';
import {
  Clock,
  Cloud,
  Database,
  Download,
  HardDrive,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
} from 'lucide-react';

interface RecurringBackupSchedulerCardProps {
  language: 'ar' | 'en';
  config: AutoBackupConfig;
  setConfig: React.Dispatch<React.SetStateAction<AutoBackupConfig>>;
  backupsList: ServerBackupMetadata[];
  setBackupsList: React.Dispatch<React.SetStateAction<ServerBackupMetadata[]>>;
  isBusy: boolean;
  setIsBusy: React.Dispatch<React.SetStateAction<boolean>>;
  onFeedback: (message: string) => void;
  onReloadServerState: () => Promise<boolean>;
}

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const RecurringBackupSchedulerCard: React.FC<RecurringBackupSchedulerCardProps> = ({
  language,
  config,
  setConfig,
  backupsList,
  setBackupsList,
  isBusy,
  setIsBusy,
  onFeedback,
  onReloadServerState,
}) => {
  const isAr = language === 'ar';
  const [cloudAuthTokenInput, setCloudAuthTokenInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [cloudTestResult, setCloudTestResult] = useState<{
    reachable: boolean;
    message: string;
  } | null>(null);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [confirmRestoreFilename, setConfirmRestoreFilename] = useState<string | null>(null);

  const destination: BackupDestinationMode = config.destination || 'LOCAL';
  const isCloudEnabled = destination === 'CLOUD' || destination === 'LOCAL_AND_CLOUD';
  const needsTimePicker =
    config.schedule === 'DAILY' || config.schedule === 'WEEKLY' || config.schedule === 'MONTHLY';
  const effectiveCloudSchedule = resolveEffectiveCloudSchedule(config);

  const previewNextLocal = config.nextBackupAt || computeNextScheduledBackupIso(config);
  const previewNextCloud =
    isCloudEnabled && effectiveCloudSchedule !== 'OFF'
      ? config.nextCloudBackupAt ||
        computeNextScheduledBackupIso({
          schedule: effectiveCloudSchedule,
          preferredTimeHHMM: config.preferredTimeHHMM,
          dayOfWeek: config.dayOfWeek,
          dayOfMonth: config.dayOfMonth,
        })
      : undefined;

  const handleSaveSchedule = async () => {
    const check = validateRecurringBackupConfig(config, config);
    if (!check.valid) {
      setValidationErrors(check.errors);
      return;
    }
    setValidationErrors([]);
    setIsBusy(true);
    try {
      const payload: Record<string, any> = {
        ...check.normalized,
      };
      if (cloudAuthTokenInput.trim()) {
        payload.cloudAuthToken = cloudAuthTokenInput.trim();
      }
      const res = await fetch('/api/v1/backups/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setValidationErrors(
          Array.isArray(json?.errors) && json.errors.length > 0
            ? json.errors
            : [json?.messageAr || 'تعذر حفظ إعدادات الجدولة.']
        );
        return;
      }
      setConfig(json.config);
      if (Array.isArray(json.backups)) setBackupsList(json.backups);
      setCloudAuthTokenInput('');
      onFeedback(
        isAr
          ? `✓ تم حفظ جدولة النسخ الاحتياطي المتكرر (${buildScheduleSummaryLabel(json.config, 'ar')}).`
          : `✓ Recurring backup schedule saved (${buildScheduleSummaryLabel(json.config, 'en')}).`
      );
    } catch {
      setValidationErrors([
        isAr
          ? 'تعذر الاتصال بالخادم لحفظ الجدولة.'
          : 'Could not reach server to persist backup schedule.',
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleTestCloudConnection = async () => {
    setCloudTestResult(null);
    setValidationErrors([]);
    if (!config.cloudEndpointUrl?.trim()) {
      setValidationErrors([
        isAr
          ? 'يرجى إدخال رابط نقطة السحابة قبل اختبار الاتصال.'
          : 'Please enter a cloud endpoint URL before testing.',
      ]);
      return;
    }
    setIsTestingCloud(true);
    try {
      const res = await fetch('/api/v1/backups/test-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudProvider: config.cloudProvider,
          cloudEndpointUrl: config.cloudEndpointUrl,
          cloudAuthToken: cloudAuthTokenInput.trim() || '__KEEP__',
        }),
      });
      const json = await res.json();
      setCloudTestResult({
        reachable: Boolean(json?.reachable),
        message:
          json?.messageAr ||
          (json?.reachable ? 'Cloud endpoint reachable.' : 'Cloud endpoint not reachable.'),
      });
    } catch {
      setCloudTestResult({
        reachable: false,
        message: isAr
          ? 'تعذر تنفيذ اختبار الاتصال بالخادم السحابي.'
          : 'Failed to execute cloud connectivity test.',
      });
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleRunBackupNow = async () => {
    setIsBusy(true);
    setValidationErrors([]);
    try {
      const res = await fetch('/api/v1/backups/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'MANUAL', destination }),
      });
      const json = await res.json();
      if (json?.success) {
        if (json.config) setConfig(json.config);
        if (Array.isArray(json.backups)) setBackupsList(json.backups);
        const cloudNote = json.created?.cloudSyncMessage ? ` — ${json.created.cloudSyncMessage}` : '';
        onFeedback(
          isAr
            ? `✓ تم إنشاء نسخة احتياطية محققة (${json.created?.filename})${cloudNote}`
            : `✓ Verified backup created (${json.created?.filename})${cloudNote}`
        );
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section
      data-testid="scheduled-auto-backup-panel"
      aria-labelledby="recurring-backup-scheduler-heading"
      className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      {/* Header Row */}
      <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h4
            id="recurring-backup-scheduler-heading"
            className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              {isAr
                ? 'جدولة النسخ الاحتياطي المتكرر (محلي وسحابي)'
                : 'Recurring Backup Scheduler (Local & Cloud)'}
            </span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {buildScheduleSummaryLabel(config, language)}
            <span aria-hidden="true"> · </span>
            <span className="font-mono tabular-nums">
              {isAr
                ? `الاحتفاظ: ${config.maxRetentionCount} نسخة`
                : `Retention: ${config.maxRetentionCount} snapshots`}
            </span>
          </p>
        </div>

        <button
          type="button"
          data-testid="btn-run-backup-now"
          disabled={isBusy}
          onClick={handleRunBackupNow}
          className="px-4 py-2 rounded-lg haseb-btn-primary text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isAr ? 'نسخ احتياطي فوري' : 'Run Backup Now'}</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Destination Segmented Control: Local vs Cloud vs Local + Cloud */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isAr ? 'وجهة حفظ النسخ الاحتياطية' : 'Backup Storage Destination'}
          </span>
          <div
            role="group"
            aria-label={isAr ? 'وجهة حفظ النسخ الاحتياطية' : 'Backup Storage Destination'}
            className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            {(
              [
                {
                  id: 'LOCAL' as BackupDestinationMode,
                  labelAr: 'تخزين محلي فقط',
                  labelEn: 'Local Storage Only',
                  icon: HardDrive,
                },
                {
                  id: 'CLOUD' as BackupDestinationMode,
                  labelAr: 'نسخ سحابي (Cloud)',
                  labelEn: 'Cloud Storage',
                  icon: Cloud,
                },
                {
                  id: 'LOCAL_AND_CLOUD' as BackupDestinationMode,
                  labelAr: 'محلي + سحابي (مزدوج)',
                  labelEn: 'Local + Cloud Hybrid',
                  icon: Layers,
                },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = destination === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`backup-dest-${opt.id.toLowerCase()}`}
                  aria-pressed={active}
                  onClick={() => {
                    setValidationErrors([]);
                    setConfig((prev) => ({ ...prev, destination: opt.id }));
                  }}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{isAr ? opt.labelAr : opt.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Validation Errors Banner */}
        {validationErrors.length > 0 && (
          <div
            role="alert"
            data-testid="backup-scheduler-validation-error"
            className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-1"
          >
            {validationErrors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Local / Primary Recurring Frequency Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label
              htmlFor="backup-schedule-frequency"
              className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {destination === 'CLOUD'
                ? isAr
                  ? 'تكرار النسخ السحابي'
                  : 'Cloud Frequency'
                : isAr
                ? 'تكرار النسخ المحلي'
                : 'Local Frequency'}
            </label>
            <select
              id="backup-schedule-frequency"
              data-testid="backup-schedule-select"
              value={config.schedule}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  schedule: e.target.value as AutoBackupSchedule,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="HOURLY">{isAr ? 'كل ساعة (Hourly)' : 'Hourly'}</option>
              <option value="EVERY_6_HOURS">
                {isAr ? 'كل 6 ساعات (موصى به)' : 'Every 6 Hours (Recommended)'}
              </option>
              <option value="DAILY">{isAr ? 'يومياً (Daily)' : 'Daily'}</option>
              <option value="WEEKLY">{isAr ? 'أسبوعياً (Weekly)' : 'Weekly'}</option>
              <option value="MONTHLY">{isAr ? 'شهرياً (Monthly)' : 'Monthly'}</option>
              <option value="OFF">{isAr ? 'إيقاف الجدولة' : 'Disabled (Off)'}</option>
            </select>
          </div>

          {needsTimePicker && (
            <div>
              <label
                htmlFor="backup-preferred-time"
                className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {isAr ? 'وقت التنفيذ (UTC)' : 'Run Time (HH:MM)'}
              </label>
              <input
                id="backup-preferred-time"
                data-testid="backup-preferred-time-input"
                type="time"
                value={config.preferredTimeHHMM || '02:00'}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    preferredTimeHHMM: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums font-semibold"
              />
            </div>
          )}

          {config.schedule === 'WEEKLY' && (
            <div>
              <label
                htmlFor="backup-day-of-week"
                className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {isAr ? 'يوم النسخ الأسبوعي' : 'Day of Week'}
              </label>
              <select
                id="backup-day-of-week"
                data-testid="backup-day-of-week-select"
                value={config.dayOfWeek ?? 5}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    dayOfWeek: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              >
                {(isAr ? WEEKDAYS_AR : WEEKDAYS_EN).map((dayLabel, idx) => (
                  <option key={idx} value={idx}>
                    {dayLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {config.schedule === 'MONTHLY' && (
            <div>
              <label
                htmlFor="backup-day-of-month"
                className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {isAr ? 'يوم الشهر (1 - 28)' : 'Day of Month (1–28)'}
              </label>
              <input
                id="backup-day-of-month"
                data-testid="backup-day-of-month-input"
                type="number"
                min={1}
                max={28}
                value={config.dayOfMonth ?? 1}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    dayOfMonth: Number(e.target.value) || 1,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums font-semibold"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="backup-retention-count"
              className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {isAr ? 'الحد الأقصى للاحتفاظ' : 'Max Retained Snapshots'}
            </label>
            <input
              id="backup-retention-count"
              data-testid="backup-retention-input"
              type="number"
              min={3}
              max={100}
              value={config.maxRetentionCount}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  maxRetentionCount: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tabular-nums font-semibold"
            />
          </div>
        </div>

        {/* Local Storage Options Row */}
        <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-700 dark:text-slate-300">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(config.includeSqliteCopy)}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, includeSqliteCopy: e.target.checked }))
              }
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              {isAr
                ? 'تضمين نسخة SQLite الكاملة بجانب JSON'
                : 'Include companion SQLite file copy'}
            </span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(config.encryptBackup)}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, encryptBackup: e.target.checked }))
              }
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              {isAr
                ? 'تفعيل تشفير النسخ المجدولة (AES-256-GCM)'
                : 'Encrypt scheduled archives (AES-256-GCM)'}
            </span>
          </label>
        </div>

        {/* Cloud Configuration Section (Shown when CLOUD or LOCAL_AND_CLOUD is active) */}
        {isCloudEnabled && (
          <div
            data-testid="backup-cloud-config-section"
            className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>
                  {isAr
                    ? 'إعدادات المزامنة والنسخ السحابي (Cloud Target & Frequency)'
                    : 'Cloud Backup Target & Sync Frequency'}
                </span>
              </div>
              <button
                type="button"
                data-testid="btn-test-cloud-backup"
                disabled={isTestingCloud}
                onClick={handleTestCloudConnection}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Wifi className={`w-3.5 h-3.5 ${isTestingCloud ? 'animate-pulse' : ''}`} />
                <span>{isAr ? 'اختبار الاتصال السحابي' : 'Test Cloud Connection'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label
                  htmlFor="cloud-backup-provider"
                  className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {isAr ? 'مزود الخدمة السحابية' : 'Cloud Provider'}
                </label>
                <select
                  id="cloud-backup-provider"
                  data-testid="backup-cloud-provider-select"
                  value={config.cloudProvider || 'S3_COMPATIBLE'}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cloudProvider: e.target.value as CloudBackupProvider,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="S3_COMPATIBLE">Amazon S3 / Cloudflare R2 / MinIO</option>
                  <option value="GOOGLE_DRIVE">Google Drive / Workspace Vault</option>
                  <option value="WEBDAV">WebDAV / Nextcloud Private Cloud</option>
                  <option value="CUSTOM_WEBHOOK">Custom HTTPS Backup Webhook</option>
                </select>
              </div>

              {destination === 'LOCAL_AND_CLOUD' && (
                <div>
                  <label
                    htmlFor="cloud-sync-frequency"
                    className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {isAr ? 'تكرار الرفع السحابي' : 'Cloud Upload Frequency'}
                  </label>
                  <select
                    id="cloud-sync-frequency"
                    data-testid="backup-cloud-frequency-select"
                    value={config.cloudSyncFrequency || 'DAILY'}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        cloudSyncFrequency: e.target.value as CloudSyncFrequency,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="SAME_AS_LOCAL">
                      {isAr ? 'مطابق للجدول المحلي' : 'Same as Local Schedule'}
                    </option>
                    <option value="HOURLY">{isAr ? 'كل ساعة (Hourly)' : 'Hourly'}</option>
                    <option value="EVERY_6_HOURS">
                      {isAr ? 'كل 6 ساعات' : 'Every 6 Hours'}
                    </option>
                    <option value="DAILY">{isAr ? 'يومياً (Daily)' : 'Daily'}</option>
                    <option value="WEEKLY">{isAr ? 'أسبوعياً (Weekly)' : 'Weekly'}</option>
                    <option value="MONTHLY">{isAr ? 'شهرياً (Monthly)' : 'Monthly'}</option>
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="cloud-bucket-folder"
                  className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {isAr ? 'اسم الحاوية / المجلد السحابي' : 'Bucket / Remote Folder'}
                </label>
                <input
                  id="cloud-bucket-folder"
                  data-testid="backup-cloud-bucket-input"
                  type="text"
                  dir="ltr"
                  placeholder="haseb-erp-backups"
                  value={config.cloudBucketOrFolder || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cloudBucketOrFolder: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="cloud-endpoint-url"
                  className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {isAr ? 'رابط نقطة الرفع السحابي (Endpoint URL)' : 'Cloud Endpoint URL'}
                </label>
                <input
                  id="cloud-endpoint-url"
                  data-testid="backup-cloud-endpoint-input"
                  type="url"
                  dir="ltr"
                  placeholder="https://s3.me-south-1.amazonaws.com/my-erp-backups"
                  value={config.cloudEndpointUrl || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cloudEndpointUrl: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="cloud-auth-token"
                  className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {isAr ? 'رمز التفويض السحابي (اختياري)' : 'Bearer Token / Secret (Optional)'}
                </label>
                <input
                  id="cloud-auth-token"
                  data-testid="backup-cloud-token-input"
                  type="password"
                  dir="ltr"
                  placeholder={
                    config.hasCloudAuthToken
                      ? `محفوظ (${config.cloudAuthTokenMasked || '••••'})`
                      : 'sk-cloud-...'
                  }
                  value={cloudAuthTokenInput}
                  onChange={(e) => setCloudAuthTokenInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            {cloudTestResult && (
              <div
                data-testid="backup-cloud-test-result"
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                  cloudTestResult.reachable
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                }`}
              >
                {cloudTestResult.reachable ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{cloudTestResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Schedule Telemetry Strip & Save Action */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span>{isAr ? 'آخر نسخة:' : 'Last Run:'}</span>{' '}
              <span
                className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200"
                dir="ltr"
              >
                {config.lastBackupAt
                  ? new Date(config.lastBackupAt).toLocaleString('en-GB')
                  : isAr
                  ? 'لم يُنفذ بعد'
                  : 'Never'}
              </span>
            </div>
            <div>
              <span>{isAr ? 'الموعد المحلي القادم:' : 'Next Local Run:'}</span>{' '}
              <span
                data-testid="backup-next-local-run"
                className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200"
                dir="ltr"
              >
                {previewNextLocal ? new Date(previewNextLocal).toLocaleString('en-GB') : '—'}
              </span>
            </div>
            {isCloudEnabled && (
              <div>
                <span>{isAr ? 'الرفع السحابي القادم:' : 'Next Cloud Sync:'}</span>{' '}
                <span
                  data-testid="backup-next-cloud-run"
                  className="font-mono tabular-nums font-semibold text-sky-700 dark:text-sky-300"
                  dir="ltr"
                >
                  {previewNextCloud ? new Date(previewNextCloud).toLocaleString('en-GB') : '—'}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="btn-save-backup-config"
            disabled={isBusy}
            onClick={handleSaveSchedule}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'حفظ إعدادات الجدولة' : 'Save Schedule Settings'}</span>
          </button>
        </div>

        {/* Verified Backup Archive History Table */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
            {isAr
              ? `أرشيف النسخ الاحتياطية المحققة (${backupsList.length})`
              : `Verified Backup Archives (${backupsList.length})`}
          </div>
          {backupsList.length === 0 ? (
            <div className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              {isAr
                ? 'لا توجد نسخ محفوظة بعد. اضغط "نسخ احتياطي فوري" لإنشاء أول لقطة محققة.'
                : 'No backup snapshots created yet. Click "Run Backup Now" to create the first verified archive.'}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {isAr ? 'الملف / البصمة' : 'Archive / SHA-256'}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {isAr ? 'النوع والوجهة' : 'Trigger & Target'}
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold">
                      {isAr ? 'الأصناف / الفواتير' : 'Items / Invoices'}
                    </th>
                    <th className="py-2.5 px-3 text-end font-semibold">
                      {isAr ? 'الحجم' : 'Size'}
                    </th>
                    <th className="py-2.5 px-3 text-end font-semibold">
                      {isAr ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {backupsList.slice(0, 8).map((bkp) => {
                    const destText =
                      bkp.destination === 'LOCAL_AND_CLOUD'
                        ? isAr
                          ? 'محلي + سحابي'
                          : 'Local + Cloud'
                        : bkp.destination === 'CLOUD'
                        ? isAr
                          ? 'سحابي'
                          : 'Cloud'
                        : isAr
                        ? 'محلي'
                        : 'Local';
                    return (
                      <tr
                        key={bkp.filename}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-2.5 px-3">
                          <div
                            className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[230px]"
                            dir="ltr"
                          >
                            {bkp.filename}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {new Date(bkp.createdAt).toLocaleString('en-GB')} ·{' '}
                            {bkp.checksumSha256.slice(0, 10)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">
                            {bkp.trigger === 'AUTO'
                              ? isAr
                                ? 'تلقائي'
                                : 'Auto'
                              : isAr
                              ? 'يدوي'
                              : 'Manual'}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span>{destText}</span>
                          {bkp.cloudSyncStatus === 'SYNCED' && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {' '}
                              · {isAr ? 'تم الرفع' : 'Synced'}
                            </span>
                          )}
                          {bkp.cloudSyncStatus === 'QUEUED_LOCAL_MIRROR' && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {' '}
                              · {isAr ? 'محفوظ محلياً بانتظار السحابة' : 'Local Mirror Queued'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {bkp.productsCount} / {bkp.invoicesCount}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          <span dir="ltr" className="inline-block">
                            {(bkp.sizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`/api/v1/backups/download/${encodeURIComponent(bkp.filename)}`}
                              download={bkp.filename}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Download className="w-3 h-3" />
                              <span>{isAr ? 'تنزيل' : 'Download'}</span>
                            </a>
                            {confirmRestoreFilename === bkp.filename ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={async () => {
                                  setIsBusy(true);
                                  try {
                                    const res = await fetch('/api/v1/backups/restore', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ filename: bkp.filename }),
                                    });
                                    const json = await res.json();
                                    if (json?.success) {
                                      await onReloadServerState();
                                    }
                                    setConfirmRestoreFilename(null);
                                    onFeedback(json?.messageAr || 'تمت الاستعادة بنجاح');
                                  } finally {
                                    setIsBusy(false);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer whitespace-nowrap"
                              >
                                {isAr ? 'تأكيد الاستعادة' : 'Confirm Restore'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-testid={`btn-restore-${bkp.filename}`}
                                onClick={() => setConfirmRestoreFilename(bkp.filename)}
                                className="px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer whitespace-nowrap"
                              >
                                {isAr ? 'استعادة' : 'Restore'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
