import React, { useEffect, useState } from 'react';
import { Clock, Lock, Play, ShieldCheck, X } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCleanNumber } from '../../core/systemConfigEngine';
import { isShiftActive } from '../../core/posShiftEngine';

export const ShiftControlModal: React.FC = () => {
  const {
    currentShift,
    currency,
    language,
    currentUser,
    isShiftModalOpen,
    closeShiftModal,
    openNewPOSShift,
    closePOSShift,
    pushLiveNotification,
  } = useERP();

  const isAr = language === 'ar';
  const shiftIsOpen = isShiftActive(currentShift);

  const [openingFloatInput, setOpeningFloatInput] = useState<number>(0);
  const [actualCashCount, setActualCashCount] = useState<number>(currentShift.expectedCash || 0);
  const [autoOpenNewShift, setAutoOpenNewShift] = useState<boolean>(false);
  const [newShiftStartingFloat, setNewShiftStartingFloat] = useState<number>(0);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Sync expected drawer cash whenever modal opens or shift changes
  useEffect(() => {
    if (isShiftModalOpen) {
      setActualCashCount(currentShift.expectedCash || 0);
      setOpeningFloatInput(0);
      setAutoOpenNewShift(false);
      setNewShiftStartingFloat(0);
      setFeedbackNotice(null);
    }
  }, [isShiftModalOpen, currentShift.expectedCash]);

  // Close with Escape key
  useEffect(() => {
    if (!isShiftModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeShiftModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShiftModalOpen, closeShiftModal]);

  if (!isShiftModalOpen) return null;

  const cashierDisplay =
    (isAr ? currentUser?.nameAr : currentUser?.name) || currentShift.cashierName || 'المدير العام';

  const handleConfirmOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFloat = Math.max(0, Number(openingFloatInput) || 0);
    openNewPOSShift(cleanFloat);
    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'success',
      titleAr: 'تم فتح وردية كاشير جديدة',
      titleEn: 'New Cashier Shift Opened',
      messageAr: `بدأت الوردية بنجاح للمستخدم (${cashierDisplay}) بعهدة افتتاحية ${formatCleanNumber(cleanFloat)} ${currency}.`,
      messageEn: `Shift opened by ${cashierDisplay} with float ${formatCleanNumber(cleanFloat)} ${currency}.`,
    });
    closeShiftModal();
  };

  const handleConfirmCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanActual = Math.max(0, Number(actualCashCount) || 0);
    const nextFloat = autoOpenNewShift ? Math.max(0, Number(newShiftStartingFloat) || 0) : undefined;
    closePOSShift(cleanActual, nextFloat);
    pushLiveNotification({
      category: 'LIVE_EVENTS',
      severity: 'info',
      titleAr: autoOpenNewShift ? 'تم إغلاق الوردية وفتح وردية جديدة' : 'تم إغلاق وتسليم الوردية (Z-Report)',
      titleEn: autoOpenNewShift ? 'Shift Closed & New Shift Started' : 'Cashier Shift Closed (Z-Report)',
      messageAr: autoOpenNewShift
        ? `تم تسليم الوردية بعدّ نقدي ${formatCleanNumber(cleanActual)} ${currency} وبدء وردية جديدة بعهدة ${formatCleanNumber(nextFloat || 0)} ${currency}.`
        : `تم إغلاق الوردية بنجاح بعدّ نقدي ${formatCleanNumber(cleanActual)} ${currency}. يعمل النظام الآن بالوضع المرن (بدون وردية).`,
      messageEn: `Shift closed with cash count ${formatCleanNumber(cleanActual)} ${currency}.`,
    });
    closeShiftModal();
  };

  const diff = Math.round(((Number(actualCashCount) || 0) - currentShift.expectedCash) * 100) / 100;

  return (
    <div
      data-testid="shift-control-modal-backdrop"
      dir={isAr ? 'rtl' : 'ltr'}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeShiftModal();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div
        data-testid="shift-control-modal-card"
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50/90 border-b border-slate-200/80 text-slate-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl haseb-card-gradient text-white flex items-center justify-center shrink-0">
              {shiftIsOpen ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 text-emerald-300" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 truncate">
                {shiftIsOpen
                  ? isAr
                    ? 'إغلاق وتسليم وردية الكاشير (Z-Report)'
                    : 'Close & Reconcile Shift (Z-Report)'
                  : isAr
                  ? 'فتح وردية كاشير (اختياري)'
                  : 'Open Cashier Shift (Optional)'}
              </h3>
              <p className="text-[10px] text-slate-500 truncate">
                {shiftIsOpen
                  ? isAr
                    ? `الكاشير: ${currentShift.cashierName} • بداية الوردية: ${currentShift.startTime}`
                    : `Cashier: ${currentShift.cashierName} • Started: ${currentShift.startTime}`
                  : isAr
                  ? 'النظام يعمل حالياً بكامل كفاءته بدون وردية (الوضع المرن)'
                  : 'System operates smoothly without requiring shifts (Flexible Mode)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="shift-control-modal-close-btn"
            onClick={closeShiftModal}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {!shiftIsOpen ? (
          <form onSubmit={handleConfirmOpenShift} className="p-5 space-y-4 text-xs overflow-y-auto">
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isAr
                    ? 'النظام يعمل بكفاءة بدون إلزامية الورديات'
                    : 'Flexible Shiftless Operation Active'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                {isAr
                  ? 'يمكنك البيع وإصدار الفواتير وترحيل القيود مباشرة دون فتح وردية. افتح وردية الآن فقط إذا رغبت بتحديد عهدة نقدية للدرج وإغلاقها بتقرير Z-Report.'
                  : 'You can sell, invoice, and post accounting entries directly without opening a shift. Open a shift only when you want drawer float tracking & Z-Report reconciliation.'}
              </p>
            </div>

            {feedbackNotice && (
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold text-[11px]">
                {feedbackNotice}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  {isAr
                    ? 'العهدة النقدية الافتتاحية بالدرج (اختياري):'
                    : 'Opening Cash Drawer Float (Optional):'}
                </label>
                <span className="text-[10px] font-mono text-slate-400">{currency}</span>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                autoFocus
                data-testid="open-shift-float-input"
                value={openingFloatInput}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setOpeningFloatInput(Math.max(0, Number(e.target.value) || 0))}
                className="w-full p-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-sm font-bold font-mono tabular-nums outline-hidden"
                dir="ltr"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                {[0, 1000, 5000, 10000, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOpeningFloatInput(preset)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold shrink-0 cursor-pointer transition ${
                      openingFloatInput === preset
                        ? 'haseb-btn-primary border-transparent text-white'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    dir="ltr"
                  >
                    {formatCleanNumber(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAr ? 'المسؤول عن الوردية:' : 'Assigned Operator:'}</span>
              </span>
              <span className="font-bold text-slate-900">{cashierDisplay}</span>
            </div>

            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeShiftModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                {isAr ? 'الاستمرار بدون وردية' : 'Stay Without Shift'}
              </button>
              <button
                type="submit"
                data-testid="btn-confirm-open-shift"
                className="px-5 py-2 haseb-btn-primary font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isAr ? 'تأكيد فتح الوردية' : 'Confirm Open Shift'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmCloseShift} className="p-5 space-y-4 text-xs overflow-y-auto">
            {/* Z-Report Financial Breakdown */}
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">
                  {isAr ? 'حالة الوردية الحالية:' : 'Shift Status:'}
                </span>
                <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                  {isAr ? 'مفتوحة ونشطة (OPEN)' : 'OPEN'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {isAr ? 'عهدة بداية الوردية:' : 'Opening Float:'}
                </span>
                <span className="font-bold font-mono tabular-nums" dir="ltr">
                  {formatCleanNumber(currentShift.startingCash)} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {isAr ? 'مبيعات الكاش (النقدية):' : 'Cash Sales:'}
                </span>
                <span className="font-bold text-emerald-700 font-mono tabular-nums" dir="ltr">
                  +{formatCleanNumber(currentShift.cashSales)} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {isAr ? 'مبيعات الشبكة والبطاقة:' : 'Card Sales:'}
                </span>
                <span className="font-bold text-indigo-700 font-mono tabular-nums" dir="ltr">
                  +{formatCleanNumber(currentShift.cardSales)} {currency}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-700">
                <span>{isAr ? 'إجمالي مبيعات الوردية:' : 'Shift Total Sales:'}</span>
                <span className="font-mono tabular-nums" dir="ltr">
                  {formatCleanNumber(currentShift.totalSales)} {currency}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-sm text-slate-900">
                <span>{isAr ? 'النقدية المتوقعة بالدرج:' : 'Expected Drawer Cash:'}</span>
                <span className="font-mono tabular-nums text-emerald-700" dir="ltr">
                  {formatCleanNumber(currentShift.expectedCash)} {currency}
                </span>
              </div>
            </div>

            {/* Actual Cash Count Input & Quick Match */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  {isAr ? 'العد الفعلي للنقدية بالدرج:' : 'Actual Cash Count:'}
                </label>
                <button
                  type="button"
                  onClick={() => setActualCashCount(currentShift.expectedCash)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  {isAr
                    ? `مطابقة مع المتوقع (${formatCleanNumber(currentShift.expectedCash)})`
                    : `Match Expected (${formatCleanNumber(currentShift.expectedCash)})`}
                </button>
              </div>
              <input
                type="number"
                step="any"
                autoFocus
                data-testid="close-shift-actual-cash-input"
                value={actualCashCount}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setActualCashCount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full p-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-sm font-bold font-mono tabular-nums outline-hidden"
                dir="ltr"
              />
            </div>

            {/* Discrepancy Indicator */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                diff === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : diff > 0
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <span>
                {diff === 0
                  ? isAr
                    ? 'مطابق تماماً — لا يوجد عجز أو فائض'
                    : 'Exact Match — Zero Variance'
                  : diff > 0
                  ? isAr
                    ? 'فائض نقدي بالصندوق:'
                    : 'Cash Overage:'
                  : isAr
                  ? 'عجز نقدي بالصندوق:'
                  : 'Cash Shortage:'}
              </span>
              <span className="font-mono tabular-nums text-sm" dir="ltr">
                {diff > 0 ? `+${formatCleanNumber(diff)}` : formatCleanNumber(diff)} {currency}
              </span>
            </div>

            {/* Optional Auto-Open New Shift Toggle (Defaults OFF so closing returns cleanly to flexible mode) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold text-slate-800">
                  {isAr
                    ? 'فتح وردية جديدة مباشرة بعد الإغلاق'
                    : 'Open a new shift immediately after closing'}
                </span>
                <input
                  type="checkbox"
                  checked={autoOpenNewShift}
                  onChange={(e) => setAutoOpenNewShift(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </label>
              {autoOpenNewShift && (
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80">
                  <span className="text-slate-600">
                    {isAr ? 'عهدة الوردية الجديدة:' : 'New Shift Float:'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={newShiftStartingFloat}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setNewShiftStartingFloat(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs text-center"
                    dir="ltr"
                  />
                </div>
              )}
            </div>

            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeShiftModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                data-testid="btn-confirm-close-shift"
                className="px-5 py-2 haseb-btn-primary font-bold rounded-xl transition cursor-pointer"
              >
                {autoOpenNewShift
                  ? isAr
                    ? 'إغلاق وبدء وردية جديدة'
                    : 'Close & Start New Shift'
                  : isAr
                  ? 'تأكيد إغلاق الوردية'
                  : 'Confirm Close Shift'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
