import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Cpu,
  HardDrive,
  Lock,
  Copy,
  CheckCircle2,
  X,
  Terminal,
  AlertTriangle,
  Sparkles,
  Fingerprint,
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { LicenseDurationPreset } from '../core/securityEngine';

const MASTER_DEVELOPER_PIN = 'RLM-DEV-9999';

export const StandaloneActivationPortal: React.FC = () => {
  const {
    language,
    hardwareFingerprint,
    protectionState,
    generateDeveloperActivationKey,
    activateSystemWithSerial,
    setIsStandaloneKeygenOpen,
  } = useERP();
  const isAr = language === 'ar';

  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [targetRequestCode, setTargetRequestCode] = useState(
    protectionState.machineRequestCode
  );
  const [durationPreset, setDurationPreset] = useState<LicenseDurationPreset>('1_YEAR');
  const [customDays, setCustomDays] = useState<number>(90);
  const [generatedSerial, setGeneratedSerial] = useState<string>('');
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [directApplyFeedback, setDirectApplyFeedback] = useState<string | null>(null);

  const handleUnlockPortal = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === MASTER_DEVELOPER_PIN) {
      setIsUnlocked(true);
      setPinError(null);
      setTargetRequestCode(protectionState.machineRequestCode);
    } else {
      setPinError(
        isAr
          ? 'رمز PIN التطويري غير صحيح! هذه المنصة منفصلة ومحمية للمطور والناشر المعتمد فقط.'
          : 'Invalid Developer PIN! This standalone licensing portal is restricted to the authorized publisher.'
      );
    }
  };

  const handleGenerateKey = () => {
    setGenError(null);
    setDirectApplyFeedback(null);
    const res = generateDeveloperActivationKey(
      targetRequestCode.trim().toUpperCase(),
      durationPreset,
      customDays
    );
    if (res.success && res.serial) {
      setGeneratedSerial(res.serial);
    } else {
      setGenError(
        res.error ||
          (isAr ? 'كود طلب الجهاز غير صالح' : 'Invalid Machine Request Code')
      );
    }
  };

  const handleCopySerial = () => {
    if (!generatedSerial) return;
    navigator.clipboard?.writeText(generatedSerial).catch(() => {});
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2000);
  };

  const handleDirectInjectToClient = () => {
    if (!generatedSerial) return;
    const res = activateSystemWithSerial(generatedSerial);
    if (res.valid) {
      setDirectApplyFeedback(
        isAr
          ? 'تم إرسال السريال وتفعيل النظام المحاسبي للجهاز المطابق بنجاح!'
          : 'Serial injected and client ERP activated successfully!'
      );
    } else {
      setGenError(res.reason || (isAr ? 'السريال غير صالح' : 'Invalid serial'));
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wider uppercase">
                  {isAr ? 'نظام مستقل ومنفصل تماماً' : 'DECOUPLED STANDALONE PORTAL'}
                </span>
                <span className="text-xs font-mono text-slate-400">RLM-CRYPTO-KEYGEN v4.5</span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                {isAr
                  ? 'منصة إصدار وتشفير التراخيص المستقلة (مرتبطة بالقطع الداخلية للجهاز)'
                  : 'Standalone Hardware Cryptographic Licensing & Keygen Server'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsStandaloneKeygenOpen(false)}
            data-testid="close-standalone-keygen-btn"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={isAr ? 'إغلاق والعودة للنظام المحاسبي' : 'Close and return to ERP'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isUnlocked ? (
          <form onSubmit={handleUnlockPortal} className="p-8 max-w-lg mx-auto space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {isAr
                  ? 'بوابة التشفير المستقلة محمية برمز المطور (PIN)'
                  : 'Standalone Licensing Server Protected by Developer PIN'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'تم فصل نظام التوليد والتفعيل نهائياً عن النظام المحاسبي لضمان عدم إمكانية كسر الحماية أو إصدار سريالات من قِبل المستخدم النهائي.'
                  : 'The activation generator is strictly separated from the accounting ERP so end-users cannot self-issue licenses.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? 'رمز المطور السري (Master Developer PIN):' : 'Master Developer PIN:'}
              </label>
              <input
                type="password"
                data-testid="standalone-keygen-pin-input"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="RLM-DEV-XXXX"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                {isAr ? 'للاختبار الفوري المعتمد: RLM-DEV-9999' : 'Authorized Lab PIN: RLM-DEV-9999'}
              </p>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="standalone-keygen-unlock-btn"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {isAr ? 'فتح منصة إصدار السريالات المستقلة' : 'Unlock Standalone Keygen Server'}
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-6">
            {/* Hardware Binding Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    {isAr
                      ? 'بصمة القطع الداخلية الخمس للجهاز المستهدف'
                      : '5-Component Internal Hardware DNA'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                    SINGLE-MACHINE LOCK
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="flex justify-between bg-slate-900/90 px-2.5 py-1.5 rounded">
                    <span className="text-slate-400">1. Motherboard:</span>
                    <span className="text-emerald-300">{hardwareFingerprint.motherboardSerial}</span>
                  </div>
                  <div className="flex justify-between bg-slate-900/90 px-2.5 py-1.5 rounded">
                    <span className="text-slate-400">2. CPU Processor:</span>
                    <span className="text-cyan-300">{hardwareFingerprint.cpuProcessorId}</span>
                  </div>
                  <div className="flex justify-between bg-slate-900/90 px-2.5 py-1.5 rounded">
                    <span className="text-slate-400">3. GPU Silicon:</span>
                    <span className="text-amber-300">{hardwareFingerprint.gpuSiliconId}</span>
                  </div>
                  <div className="flex justify-between bg-slate-900/90 px-2.5 py-1.5 rounded">
                    <span className="text-slate-400">4. NVMe / Disk:</span>
                    <span className="text-purple-300">{hardwareFingerprint.diskVolumeSerial}</span>
                  </div>
                  <div className="flex justify-between bg-slate-900/90 px-2.5 py-1.5 rounded">
                    <span className="text-slate-400">5. System UUID:</span>
                    <span className="text-sky-300">{hardwareFingerprint.systemUuid}</span>
                  </div>
                </div>
              </div>

              {/* Generator Form */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isAr
                      ? 'كود طلب الجهاز المستهدف (Machine Request Code):'
                      : 'Target Machine Request Code:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-testid="standalone-keygen-req-input"
                      value={targetRequestCode}
                      onChange={(e) => setTargetRequestCode(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setTargetRequestCode(protectionState.machineRequestCode)}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                    >
                      {isAr ? 'جلب كود الجهاز الحالي' : 'Use Local Node'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isAr ? 'مدة صلاحية السريال المشفر:' : 'License Validity Duration:'}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(
                      [
                        { id: '1_WEEK', labelAr: '7 أيام', labelEn: '7 Days' },
                        { id: '1_MONTH', labelAr: 'شهر (30 يوم)', labelEn: '30 Days' },
                        { id: '1_YEAR', labelAr: 'سنة كاملة', labelEn: '1 Year' },
                        { id: 'LIFETIME', labelAr: 'مدى الحياة', labelEn: 'Lifetime' },
                        { id: 'CUSTOM_DAYS', labelAr: 'مخصص', labelEn: 'Custom' },
                      ] as { id: LicenseDurationPreset; labelAr: string; labelEn: string }[]
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`keygen-preset-${p.id}`}
                        onClick={() => setDurationPreset(p.id)}
                        className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition ${
                          durationPreset === p.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isAr ? p.labelAr : p.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {durationPreset === 'CUSTOM_DAYS' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      {isAr ? 'عدد الأيام المخصصة:' : 'Custom Days:'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value) || 30)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                )}

                <button
                  type="button"
                  data-testid="standalone-generate-serial-btn"
                  onClick={handleGenerateKey}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAr
                    ? 'توليد سريال مشفر لجهاز واحد فقط (Single-Device Serial)'
                    : 'Generate Single-Device Encrypted Serial'}
                </button>
              </div>
            </div>

            {genError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300">
                {genError}
              </div>
            )}

            {generatedSerial && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4" />
                    {isAr
                      ? 'السريال المشفر الصادر (يعمل على هذا الجهاز فقط ويتوقف فور تغيير أي قطعة داخلية):'
                      : 'Issued Cryptographic Serial (Bound exclusively to this machine):'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <code
                    data-testid="standalone-generated-serial-code"
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-emerald-500/40 font-mono text-sm font-black text-emerald-400 tracking-wider select-all"
                  >
                    {generatedSerial}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySerial}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    {copiedSerial ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedSerial ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ السريال' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    data-testid="standalone-apply-serial-btn"
                    onClick={handleDirectInjectToClient}
                    className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
                  >
                    <Terminal className="w-4 h-4" />
                    {isAr ? 'تفعيل الجهاز الحالي بهذا السريال' : 'Activate Local Client Node'}
                  </button>
                </div>

                {directApplyFeedback && (
                  <div
                    data-testid="standalone-apply-feedback"
                    className="text-xs text-emerald-300 font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{directApplyFeedback}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
