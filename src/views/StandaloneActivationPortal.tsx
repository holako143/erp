import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Cpu,
  Lock,
  Copy,
  CheckCircle2,
  X,
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
  const [showPinText, setShowPinText] = useState(false);

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
          ? 'رمز المطور غير صحيح! يرجى التأكد من إدخال الرمز السري المعتمد.'
          : 'Invalid Developer PIN! Please enter the authorized secret PIN.'
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
          ? `✓ تم تفعيل هذا الجهاز وحفظ الترخيص لحظياً! الصلاحية: ${actRes.durationLabelAr}`
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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden text-slate-900 flex flex-col my-auto max-h-[95vh]">
        {/* Top Developer Header (Unified Lumina POS Theme) */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  منصة إصدار وتشفير التراخيص المستقلة
                </h2>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 font-bold">
                  DEVELOPER
                </span>
              </div>
              <p className="text-xs text-slate-500">
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
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Developer Authentication Gate */}
        {!isUnlocked ? (
          <form onSubmit={handleUnlockPortal} className="p-8 max-w-md mx-auto w-full space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-2xs">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? 'مصادقة وصول المطور' : 'Developer Access Verification'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isAr
                  ? 'هذه المنصة محمية للمطور والناشر المعتمد فقط لتوليد تراخيص العملاء.'
                  : 'This generator is restricted to the authorized developer to issue licenses.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  {isAr ? 'رمز المطور السري:' : 'Developer Secret PIN:'}
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPinText ? 'text' : 'password'}
                  data-testid="standalone-keygen-pin-input"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••••••••"
                  dir="ltr"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-slate-900 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPinText((prev) => !prev)}
                  className="absolute inset-y-0 end-3 text-[11px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  {showPinText ? (isAr ? 'إخفاء' : 'Hide') : isAr ? 'إظهار' : 'Show'}
                </button>
              </div>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="standalone-keygen-unlock-btn"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4" />
              {isAr ? 'فتح منصة إصدار السريالات' : 'Unlock Activation Portal'}
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Hardware Binding Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-slate-700" />
                    {isAr ? 'العتاد المرتبط للجهاز الحي' : 'Live Hardware Silicon Profile'}
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    ED25519-BOUND
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">سيريال الماذربورد:</span>
                    <span className="font-mono font-bold text-slate-900">{hardwareFingerprint.motherboardSerial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">معرف المعالج CPU:</span>
                    <span className="font-mono font-bold text-slate-900">{hardwareFingerprint.cpuProcessorId.slice(0, 18)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">سيريال قرص التخزين:</span>
                    <span className="font-mono font-bold text-slate-900">{hardwareFingerprint.diskVolumeSerial}</span>
                  </div>
                </div>
              </div>

              {/* Generator Controls */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                  {isAr ? 'توليد سيريال لجهاز عميل أو هذا الجهاز' : 'Generate Key for Device'}
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    كود الجهاز المطلوب ترخيصه (Request Code):
                  </label>
                  <input
                    type="text"
                    value={targetRequestCode}
                    onChange={(e) => setTargetRequestCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200/80 font-mono text-xs font-bold text-slate-900 outline-hidden focus:border-slate-900"
                    placeholder="ASF-XXXX-XXXX-XXXX"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">مدة الترخيص:</label>
                    <select
                      value={durationPreset}
                      onChange={(e) => setDurationPreset(e.target.value as LicenseDurationPreset)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-900 outline-hidden focus:border-slate-900"
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
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">عدد الأيام:</label>
                      <input
                        type="number"
                        min="1"
                        value={customDays}
                        onChange={(e) => setCustomDays(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-900 font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
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
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>توليد السيريال المخصص</span>
                  </button>
                )}
              </div>
            </div>

            {/* Generated Serial Result */}
            {generatedSerial && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>السيريال الرقمي المولد بنجاح:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySerial}
                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSerial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSerial ? 'تم النسخ' : 'نسخ السيريال'}</span>
                  </button>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 font-mono text-xs sm:text-sm font-bold text-slate-900 break-all select-all">
                  {generatedSerial}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDirectApplyToCurrentMachine}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    تطبيق وتفعيل هذا الجهاز فورياً بهذا السيريال
                  </button>
                  {directApplyFeedback && (
                    <span className="text-xs font-bold text-emerald-700">{directApplyFeedback}</span>
                  )}
                </div>
              </div>
            )}

            {genError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {genError}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>ASF Ed25519 Standalone Cryptographic Authority</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold transition cursor-pointer"
          >
            إغلاق المنصة
          </button>
        </div>
      </div>
    </div>
  );
};
