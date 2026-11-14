import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Cpu,
  CircuitBoard,
  HardDrive,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Sparkles,
  Unlock,
  RefreshCw,
  Clock,
  ExternalLink,
  Fingerprint,
} from 'lucide-react';

export const HardwareLockModal: React.FC = () => {
  const {
    language,
    hardwareFingerprint,
    protectionState,
    activateSystemWithSerial,
    isSimulatedForeignDevice,
    setIsSimulatedForeignDevice,
    isSimulatedTrialExpired,
    setIsSimulatedTrialExpired,
    isSimulatedClockTampered,
    setIsSimulatedClockTampered,
    simulatedTamperedComponent,
    setSimulatedTamperedComponent,
    setIsStandaloneKeygenOpen,
  } = useERP();

  const [serialInput, setSerialInput] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [copiedReq, setCopiedReq] = useState(false);

  if (!protectionState.isLocked) {
    return null;
  }

  const handleCopyRequestCode = () => {
    navigator.clipboard?.writeText(protectionState.machineRequestCode).catch(() => {});
    setCopiedReq(true);
    setTimeout(() => setCopiedReq(false), 2000);
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError(null);

    if (protectionState.status === 'CLOCK_TAMPERED') {
      setActivationError(
        language === 'ar'
          ? 'رفض أمني صارم: تم رصد تلاعب بإرجاع وقت/تاريخ الجهاز للخلف! يجب إعادة ضبط ساعة النظام للوقت الحقيقي أولاً.'
          : 'Anti-Tamper Lock: System clock rollback detected! Restore accurate system time first.'
      );
      return;
    }

    const res = activateSystemWithSerial(serialInput);
    if (!res.valid) {
      if (res.reason === 'DEVICE_MISMATCH') {
        setActivationError(
          language === 'ar'
            ? 'رفض أمني صارم: هذا السيريال مرخص لجهاز آخر مختلف في القطع الداخلية (اللوحة الأم / المعالج / القرص) ولا يعمل إلا على جهاز واحد فقط!'
            : 'Hardware Lock Violation: This serial is cryptographically bound to a different machine and only works on a single device!'
        );
      } else if (res.reason === 'EXPIRED') {
        setActivationError(
          language === 'ar'
            ? 'انتهت صلاحية سيريال التفعيل هذا. يرجى طلب سيريال تجديد مشفر من نظام التراخيص المستقل.'
            : 'This activation serial has expired. Request a renewal serial from the standalone licensing server.'
        );
      } else {
        setActivationError(
          language === 'ar'
            ? 'سيريال التفعيل غير صحيح أو تم التلاعب بتوقيعه التشفيري!'
            : 'Invalid or tampered cryptographic activation serial!'
        );
      }
    }
  };

  const failedSet = new Set(protectionState.failedHardwareComponents || []);

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      data-testid="hardware-lock-modal"
      data-mandatory-lock="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] text-slate-900 overflow-y-auto flex items-center justify-center p-4 sm:p-6 select-none"
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header (Unified Lumina POS Light Theme with Rose Security Accent) */}
        <div className="bg-white px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
              {protectionState.status === 'CLOCK_TAMPERED' ? (
                <Clock className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  data-testid="lock-status-code-badge"
                  className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[10px] font-bold"
                >
                  {protectionState.status}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  SINGLE-MACHINE HARDWARE CRYPTO LOCK
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {protectionState.status === 'CLOCK_TAMPERED'
                  ? language === 'ar'
                    ? 'تم إيقاف النظام فوراً: تم رصد تلاعب بإرجاع ساعة وتاريخ الجهاز للخلف!'
                    : 'SYSTEM HALTED: Monotonic Clock Rollback Tampering Detected!'
                  : protectionState.status === 'DEVICE_MISMATCH'
                  ? language === 'ar'
                    ? 'تم إيقاف النظام فوراً: تغيرت أو تعطلت إحدى القطع الداخلية للجهاز المرخص!'
                    : 'SYSTEM HALTED: Internal Hardware Component Mismatch Detected!'
                  : language === 'ar'
                  ? 'تم إقفال النظام: انتهت الفترة التجريبية أو التفعيل — لا يفتح إلا بسريال الجهاز'
                  : 'SYSTEM LOCKED: Trial / License Expired — Single-Device Serial Required'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ar'
                  ? 'نظام التفعيل منفصل تماماً عن النظام المحاسبي. السريال يعمل على جهاز واحد فقط ومرتبط بالقطع الداخلية للجهاز.'
                  : 'Licensing is strictly decoupled from the accounting ERP. Each serial is bound to a single machine’s internal silicon.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(isSimulatedForeignDevice ||
              isSimulatedTrialExpired ||
              isSimulatedClockTampered ||
              simulatedTamperedComponent !== 'NONE') && (
              <button
                type="button"
                data-testid="reset-hardware-simulation-btn"
                onClick={() => {
                  setIsSimulatedForeignDevice(false);
                  setIsSimulatedTrialExpired(false);
                  setIsSimulatedClockTampered(false);
                  setSimulatedTamperedComponent('NONE');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar'
                    ? 'إعادة القطع والوقت للحالة الطبيعية'
                    : 'Restore Original Hardware & Clock'}
                </span>
              </button>
            )}

            <button
              type="button"
              data-testid="open-decoupled-keygen-portal-btn"
              onClick={() => setIsStandaloneKeygenOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {language === 'ar'
                  ? 'فتح بوابة التفعيل المستقلة (PIN المطور)'
                  : 'Open Standalone Licensing Portal'}
              </span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Specific Component / Clock Tamper Diagnostic Banner */}
          {protectionState.status === 'CLOCK_TAMPERED' && (
            <div
              data-testid="clock-tampered-alert-box"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-3"
            >
              <Clock className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-sm text-rose-950">
                  {language === 'ar'
                    ? 'حماية منع التلاعب بالوقت (Monotonic Anti-Rollback Guard):'
                    : 'Monotonic Anti-Rollback Time Guard Triggered:'}
                </div>
                <p className="mt-0.5">
                  {language === 'ar'
                    ? 'تم اكتشاف محاولة إرجاع تاريخ/وقت الكمبيوتر إلى وقت سابق لتمديد الفترة التجريبية أو التفعيل. يتوقف البرنامج مباشرة ولا يقبل أي تلاعب بالزمن.'
                    : 'System detected that the computer clock was rolled backward to bypass trial/license expiration. Execution is immediately halted.'}
                </p>
              </div>
            </div>
          )}

          {protectionState.failedHardwareComponents &&
            protectionState.failedHardwareComponents.length > 0 && (
              <div
                data-testid="failed-hardware-components-box"
                className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5"
              >
                <div className="font-bold text-sm text-rose-950 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>
                    {language === 'ar'
                      ? 'تم رصد تغير أو تعطل في القطع الداخلية التالية (توقف فوري للنظام):'
                      : 'Detected replacement or failure in the following internal hardware components:'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {protectionState.failedHardwareComponents.map((comp) => (
                    <span
                      key={comp}
                      className="px-2.5 py-1 rounded-full bg-white border border-rose-300 text-rose-700 font-mono text-xs font-bold"
                    >
                      ✗ {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Step 1: 5 Internal Hardware Components Inspection */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-slate-700" />
                {language === 'ar'
                  ? 'فحص المطابقة للقطع الداخلية الخمس للجهاز وكود طلب التفعيل'
                  : '5-Component Internal Silicon Verification & Machine Request Code'}
              </span>
              <span className="text-[10px] font-mono bg-white px-2.5 py-0.5 rounded-full text-slate-600 border border-slate-200/80 font-bold">
                SHA/FNV-64 SINGLE-NODE LOCK
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              {(
                [
                  {
                    key: 'MOTHERBOARD',
                    labelAr: 'اللوحة الأم (Motherboard)',
                    val: hardwareFingerprint.motherboardSerial,
                    icon: CircuitBoard,
                  },
                  {
                    key: 'CPU',
                    labelAr: 'المعالج (CPU ID)',
                    val: hardwareFingerprint.cpuProcessorId,
                    icon: Cpu,
                  },
                  {
                    key: 'GPU',
                    labelAr: 'كرت الشاشة (GPU ID)',
                    val: hardwareFingerprint.gpuSiliconId,
                    icon: Sparkles,
                  },
                  {
                    key: 'DISK_NVME',
                    labelAr: 'القرص الصلب (NVMe SN)',
                    val: hardwareFingerprint.diskVolumeSerial,
                    icon: HardDrive,
                  },
                  {
                    key: 'SYSTEM_UUID',
                    labelAr: 'معرف النظام (UUID)',
                    val: hardwareFingerprint.systemUuid,
                    icon: Fingerprint,
                  },
                ] as const
              ).map((item) => {
                const isFailed = failedSet.has(item.key);
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`p-3 rounded-xl border ${
                      isFailed
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-white border-slate-200/80 text-slate-900'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Icon className="w-3 h-3 text-slate-700" />
                        {item.labelAr}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isFailed ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isFailed ? 'MISMATCH' : 'OK'}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-[11px] mt-1 truncate">{item.val}</div>
                  </div>
                );
              })}
            </div>

            {/* Request Code to Send to Standalone Licensing Server */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-slate-500 font-bold">
                  {language === 'ar'
                    ? 'كود طلب الجهاز الفريد (يُنسخ ويُدخل في نظام التفعيل المستقل لإصدار السريال):'
                    : 'Unique Machine Request Code (Input into Standalone Licensing Portal):'}
                </div>
                <div
                  data-testid="lock-request-code"
                  className="font-mono text-sm sm:text-base font-black text-slate-900 tracking-wider mt-0.5 select-all"
                >
                  {protectionState.machineRequestCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyRequestCode}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                {copiedReq ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'ar' ? 'تم نسخ الكود' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{language === 'ar' ? 'نسخ كود الجهاز' : 'Copy Request Code'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Enter Encrypted Single-Device Serial */}
          <form
            onSubmit={handleActivate}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-900">
                {language === 'ar'
                  ? 'إدخال سيريال التفعيل الرسمي الصادر لهذا الجهاز فقط'
                  : 'Enter Official Single-Machine Activation Serial'}
              </div>
              <span className="text-[11px] text-slate-500">
                {language === 'ar'
                  ? 'لا يفتح النظام إلا بسريال موقع رقمياً لبصمة هذا الجهاز'
                  : 'Requires valid signature matching this device'}
              </span>
            </div>

            {activationError && (
              <div
                data-testid="activation-error-msg"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
              >
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{activationError}</span>
              </div>
            )}

            <div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute top-3.5 start-3.5" />
                <input
                  type="text"
                  data-testid="activation-serial-input"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="RLM-ACT-XXXXXX-XXXX-XXXXXXXX-XXXXXXXX"
                  className="w-full bg-white border border-slate-200/80 focus:border-slate-900 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-hidden"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="activate-serial-submit-btn"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? 'تحقق من مطابقة القطع الداخلية وتفعيل النظام الآن'
                  : 'Verify Hardware Silicon & Activate License Now'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
