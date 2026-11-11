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

const MASTER_DEVELOPER_PIN = 'AbuSaif143';

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

  const handleClose = () => {
    // Purge memory and credentials immediately on close
    setPinInput('');
    setIsUnlocked(false);
    setPinError(null);
    setGeneratedSerial('');
    setIsStandaloneKeygenOpen(false);
  };

  const handleUnlockPortal = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === MASTER_DEVELOPER_PIN) {
      setIsUnlocked(true);
      setPinError(null);
      setTargetRequestCode(protectionState.machineRequestCode);
    } else {
      setPinError(
        isAr
          ? 'رمز المطور غير صحيح! هذه المنصة محمية وخاصة بالمطور المعتمد فقط.'
          : 'Invalid Developer PIN! Restricted to authorized developer.'
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
          (isAr
            ? 'فشل توليد السيريال، تأكد من صحة كود الجهاز المُدخل'
            : 'Failed to generate serial key for given request code')
      );
    }
  };

  const handleCopySerial = () => {
    if (!generatedSerial) return;
    navigator.clipboard.writeText(generatedSerial);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2000);
  };

  const handleDirectApplyToCurrentMachine = () => {
    if (!generatedSerial) return;
    const actRes = activateSystemWithSerial(generatedSerial);
    if (actRes.valid) {
      setDirectApplyFeedback(
        isAr
          ? `✓ تم تفعيل هذا الجهاز بنجاح! الصلاحية: ${actRes.durationLabelAr}`
          : `✓ Successfully activated this machine! Valid: ${actRes.durationLabelEn}`
      );
    } else {
      setDirectApplyFeedback(
        actRes.reason ||
          (isAr ? 'تعذر تطبيق السيريال على هذا الجهاز' : 'Failed to apply serial to this device')
      );
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Top Developer Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/90 via-slate-900 to-indigo-950/90 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base text-white">
                  منصة إصدار وتشفير التراخيص المستقلة
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  DEVELOPER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'إصدار سريالات تفعيل مشفرة مرتبطة بالقطع الداخلية للجهاز'
                  : 'Standalone Hardware-Locked Activation Key Generator'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-standalone-keygen-btn"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auth Gate: AbuSaif143 */}
        {!isUnlocked ? (
          <form onSubmit={handleUnlockPortal} className="p-8 max-w-md mx-auto w-full space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'مصادقة وصول المطور' : 'Developer Access Verification'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'هذه المنصة محمية للمطور والناشر المعتمد فقط لتوليد تراخيص العملاء.'
                  : 'This generator is restricted to the authorized developer to issue licenses.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? 'رمز المطور السري:' : 'Developer Secret PIN:'}
              </label>
              <input
                type="password"
                data-testid="standalone-keygen-pin-input"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-500"
              />
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
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/50"
            >
              <ShieldCheck className="w-4 h-4" />
              {isAr ? 'فتح منصة إصدار السريالات' : 'Unlock Activation Portal'}
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Hardware Binding Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    {isAr ? 'العتاد المرتبط للجهاز الحي' : 'Live Hardware Silicon Profile'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    ED25519-BOUND
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">سيريال الماذربورد:</span>
                    <span className="font-mono text-slate-200">{hardwareFingerprint.motherboardSerial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">معرف المعالج CPU:</span>
                    <span className="font-mono text-slate-200">{hardwareFingerprint.cpuProcessorId.slice(0, 18)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">سيريال قرص التخزين:</span>
                    <span className="font-mono text-slate-200">{hardwareFingerprint.diskVolumeSerial}</span>
                  </div>
                </div>
              </div>

              {/* Generator Generator Controls */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4" />
                  {isAr ? 'توليد سيريال لجهاز عميل أو هذا الجهاز' : 'Generate Key for Device'}
                </span>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    كود الجهاز المطلوب ترخيصه (Request Code):
                  </label>
                  <input
                    type="text"
                    value={targetRequestCode}
                    onChange={(e) => setTargetRequestCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-amber-300"
                    placeholder="ASF-XXXX-XXXX-XXXX"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">مدة الترخيص:</label>
                    <select
                      value={durationPreset}
                      onChange={(e) => setDurationPreset(e.target.value as LicenseDurationPreset)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                    >
                      <option value="1_DAY">يوم واحد (1 Day)</option>
                      <option value="1_WEEK">أسبوع واحد (1 Week)</option>
                      <option value="1_MONTH">شهر واحد (1 Month)</option>
                      <option value="3_MONTHS">3 أشهر (90 يوماً - 3 Months)</option>
                      <option value="1_YEAR">سنة كاملة (1 Year)</option>
                      <option value="LIFETIME">مدى الحياة (Lifetime)</option>
                      <option value="CUSTOM_DAYS">مدة مخصصة بالأيام</option>
                    </select>
                  </div>

                  {durationPreset === 'CUSTOM_DAYS' ? (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">عدد الأيام:</label>
                      <input
                        type="number"
                        min="1"
                        value={customDays}
                        onChange={(e) => setCustomDays(Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>توليد السيريال</span>
                      </button>
                    </div>
                  )}
                </div>

                {durationPreset === 'CUSTOM_DAYS' && (
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>توليد السيريال المخصص</span>
                  </button>
                )}
              </div>
            </div>

            {/* Generated Serial Result */}
            {generatedSerial && (
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>السيريال الرقمي المولد بنجاح:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySerial}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSerial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSerial ? 'تم النسخ' : 'نسخ السيريال'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs sm:text-sm text-emerald-300 break-all select-all">
                  {generatedSerial}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleDirectApplyToCurrentMachine}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer"
                  >
                    تطبيق وتفعيل هذا الجهاز فورياً بهذا السيريال
                  </button>
                  {directApplyFeedback && (
                    <span className="text-xs font-bold text-emerald-400">{directApplyFeedback}</span>
                  )}
                </div>
              </div>
            )}

            {genError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                {genError}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>ASF Ed25519 Standalone Cryptographic Authority</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            إغلاق المنصة
          </button>
        </div>
      </div>
    </div>
  );
};
