import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  KeyRound,
  Copy,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Unlock,
  RefreshCw,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const HardwareLockModal: React.FC = () => {
  const {
    language,
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
          ? 'يرجى إعادة ضبط تاريخ ووقت الجهاز على التوقيت الحقيقي أولاً قبل إدخال رمز التفعيل.'
          : 'Please restore accurate system date and time before attempting activation.'
      );
      return;
    }

    const res = activateSystemWithSerial(serialInput);
    if (!res.valid) {
      if (res.reason === 'ALREADY_USED_ONCE') {
        setActivationError(
          language === 'ar'
            ? 'تعذر التفعيل: تم استخدام رمز التفعيل هذا مسبقاً. كل رمز صالح للاستخدام مرة واحدة فقط.'
            : 'Activation denied: This activation serial has already been used.'
        );
      } else if (res.reason === 'DEVICE_MISMATCH') {
        setActivationError(
          language === 'ar'
            ? 'تعذر التفعيل: رمز التفعيل المدخل غير مرتبط بهذا الجهاز ولا يعمل إلا على جهاز واحد فقط.'
            : 'License Verification Failed: This activation serial is bound to a different authorized machine.'
        );
      } else if (res.reason === 'EXPIRED') {
        setActivationError(
          language === 'ar'
            ? 'انتهت صلاحية رمز التفعيل هذا. يرجى طلب رمز تجديد معتمد من الدعم الفني.'
            : 'This activation serial has expired. Please request a renewal serial.'
        );
      } else if (res.reason === 'CLOCK_TAMPERED') {
        setActivationError(
          language === 'ar'
            ? 'تعذر التفعيل: يرجى التحقق من ضبط تاريخ ووقت الجهاز على التوقيت الحقيقي.'
            : 'Time Verification Required: Please check system date and time.'
        );
      } else {
        setActivationError(
          language === 'ar'
            ? 'رمز التفعيل غير صحيح! يرجى التأكد من إدخال الرمز الصحيح والمعتمد.'
            : 'Invalid activation serial! Please verify and try again.'
        );
      }
    }
  };

  const hasActiveSimulation =
    isSimulatedForeignDevice ||
    isSimulatedTrialExpired ||
    isSimulatedClockTampered ||
    simulatedTamperedComponent !== 'NONE';

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      data-testid="hardware-lock-modal"
      data-mandatory-lock="true"
      className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-[2px] text-slate-900 overflow-y-auto flex items-center justify-center p-4 sm:p-6 select-none"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Executive Header */}
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
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  data-testid="lock-status-code-badge"
                  className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[10px] font-bold"
                >
                  {protectionState.status}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {language === 'ar' ? 'حماية الترخيص والتشغيل' : 'LICENSE SECURITY HOLD'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {protectionState.status === 'CLOCK_TAMPERED'
                  ? language === 'ar'
                    ? 'تم إيقاف النظام مؤقتاً: يلزم التحقق من توقيت الجهاز'
                    : 'System Paused: System Time Verification Required'
                  : protectionState.status === 'DEVICE_MISMATCH'
                  ? language === 'ar'
                    ? 'تم إيقاف النظام مؤقتاً: يلزم التحقق من ترخيص هذا الجهاز'
                    : 'System Paused: Device License Verification Required'
                  : language === 'ar'
                  ? 'تم إقفال النظام: يلزم إدخال رمز تفعيل صالح للمتابعة'
                  : 'System Locked: Valid Device Activation Required'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {language === 'ar'
                  ? 'بوابة التفعيل مستقلة تماماً عن بياناتك المحاسبية. يرجى نسخ رمز الطلب وإدخال رمز التفعيل المعتمد.'
                  : 'Licensing is isolated from your accounting records. Copy your request code and enter an authorized activation key.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {hasActiveSimulation && (
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
                  {language === 'ar' ? 'إعادة الوضع الطبيعي' : 'Restore Normal State'}
                </span>
              </button>
            )}

            <button
              type="button"
              data-testid="open-decoupled-keygen-portal-btn"
              onClick={() => setIsStandaloneKeygenOpen(true)}
              className="px-4 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {language === 'ar'
                  ? 'فتح بوابة التفعيل المستقلة'
                  : 'Open Standalone Activation Portal'}
              </span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {protectionState.status === 'CLOCK_TAMPERED' && (
            <div
              data-testid="clock-tampered-alert-box"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-3"
            >
              <Clock className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-sm text-rose-950">
                  {language === 'ar'
                    ? 'تنبيه التحقق من توقيت النظام:'
                    : 'System Time Verification Notice:'}
                </div>
                <p className="mt-0.5 leading-relaxed">
                  {language === 'ar'
                    ? 'تم رصد اختلاف في تاريخ ووقت الجهاز عن التوقيت المعتمد. يرجى ضبط الساعة على التوقيت الصحيح ثم إعادة المحاولة.'
                    : 'A discrepancy in system date/time was detected. Please restore accurate system time and try again.'}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Unique Request Code */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500 font-bold">
                {language === 'ar'
                  ? 'رمز طلب التفعيل الخاص بهذا الجهاز:'
                  : 'Unique Machine Activation Request Code:'}
              </div>
              <div
                data-testid="lock-request-code"
                className="font-mono text-sm sm:text-base font-black text-slate-900 tracking-wider mt-0.5 select-all break-all"
              >
                {protectionState.machineRequestCode}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyRequestCode}
              className="px-4 py-2 rounded-xl haseb-btn-primary text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {copiedReq ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{language === 'ar' ? 'تم نسخ الكود' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{language === 'ar' ? 'نسخ رمز الجهاز' : 'Copy Request Code'}</span>
                </>
              )}
            </button>
          </div>

          {/* Step 2: Enter Official Activation Serial */}
          <form
            onSubmit={handleActivate}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900">
                {language === 'ar'
                  ? 'إدخال رمز التفعيل المعتمد لهذا الجهاز'
                  : 'Enter Official Single-Device Activation Key'}
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                {language === 'ar'
                  ? 'صالح للاستخدام مرة واحدة وعلى جهاز واحد فقط'
                  : 'Single-use • Bound to one device'}
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
                  dir="ltr"
                  className="w-full bg-white border border-slate-200/80 focus:border-blue-600 rounded-xl ps-10 pe-4 py-3 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-hidden"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="activate-serial-submit-btn"
              className="w-full py-3.5 px-4 rounded-xl haseb-btn-primary text-white font-bold text-xs sm:text-sm shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? 'التحقق من الترخيص وتفعيل النظام الآن'
                  : 'Verify License & Activate System Now'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

