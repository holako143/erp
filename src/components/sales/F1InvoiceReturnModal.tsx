import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera,
  RotateCcw,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  QrCode,
  ShieldAlert,
  PackageCheck,
  FileText,
  Archive,
  Database,
  BookOpenCheck,
  Eye,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  ArchivedReturnedInvoiceRecord,
  ReturnedItemCondition,
  ReturnRefundMethod,
  SalesInvoice,
} from '../../types/erp';
import {
  isInvoiceVoidOrReturned,
  resolveInvoiceFromScanPayload,
} from '../../core/salesReturnEngine';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';
import { CameraBarcodeScannerModal } from '../common/CameraBarcodeScannerModal';
import { InvoiceRenderer } from '../invoices/InvoiceRenderer';

interface F1InvoiceReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const F1InvoiceReturnModal: React.FC<F1InvoiceReturnModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    salesInvoices,
    addSalesInvoice,
    products,
    voidAndReturnSalesInvoice,
    returnedInvoicesArchive,
    autoArchiveReturnedInvoices,
    setAutoArchiveReturnedInvoices,
    company,
    currentBranch,
    invoiceTemplateSettings,
    currency,
    language,
    uiTheme,
  } = useERP();

  const isAr = language === 'ar';
  const isDark = uiTheme === 'obsidian_dark';
  const { zIndex, isTopLayer } = useModalLayer(isOpen, 70);

  const [activeViewTab, setActiveViewTab] = useState<'SCAN_RETURN' | 'ARCHIVE_DB'>('SCAN_RETURN');
  const [scanInput, setScanInput] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedArchivedRecord, setSelectedArchivedRecord] =
    useState<ArchivedReturnedInvoiceRecord | null>(null);
  const [matchedByLabel, setMatchedByLabel] = useState<string>('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [condition, setCondition] = useState<ReturnedItemCondition>('HEALTHY_RESTOCK');
  const [refundMethod, setRefundMethod] = useState<ReturnRefundMethod>('CASH');
  const [reason, setReason] = useState('إرجاع وإلغاء الفاتورة عبر المسح السريع (F1)');
  const [previewMode, setPreviewMode] = useState<'a4' | 'thermal'>('a4');

  const [returnSuccessBanner, setReturnSuccessBanner] = useState<string | null>(null);
  const [returnErrorBanner, setReturnErrorBanner] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLookupError(null);
    setReturnErrorBanner(null);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 90);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopLayer && !isCameraOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isTopLayer, isCameraOpen, onClose]);

  const activeBranch = currentBranch;

  const resolvedInvoice: SalesInvoice | null = useMemo(() => {
    if (selectedArchivedRecord) {
      return (
        salesInvoices.find((inv) => inv.id === selectedArchivedRecord.originalInvoiceId) ||
        selectedArchivedRecord.invoiceSnapshot
      );
    }
    if (!selectedInvoiceId) return null;
    return salesInvoices.find((inv) => inv.id === selectedInvoiceId) || null;
  }, [salesInvoices, selectedInvoiceId, selectedArchivedRecord]);

  const recentInvoices = useMemo(() => salesInvoices.slice(0, 6), [salesInvoices]);

  const handleScanLookup = (rawCode: string) => {
    const query = rawCode.trim();
    if (!query) {
      setLookupError(
        isAr
          ? 'يرجى مسح باركود الفاتورة أو رمز QR أو كتابة رقم الفاتورة.'
          : 'Please scan or enter an invoice barcode, QR, or number.'
      );
      return;
    }

    setActiveViewTab('SCAN_RETURN');
    setSelectedArchivedRecord(null);

    const res = resolveInvoiceFromScanPayload(query, salesInvoices);
    if (!res.matched) {
      setSelectedInvoiceId(null);
      setMatchedByLabel('');
      setLookupError(
        isAr
          ? `لم يتم العثور على أي فاتورة مطابقة للكود: "${query}". تأكد من رقم الفاتورة أو صور باركود/QR الفاتورة بوضوح.`
          : `No invoice matched code "${query}".`
      );
      return;
    }

    setLookupError(null);
    setReturnSuccessBanner(null);
    setReturnErrorBanner(null);
    setSelectedInvoiceId(res.matched.id);
    setScanInput(res.matched.invoiceNumber);
    const labelMap: Record<string, string> = {
      INVOICE_NUMBER: isAr ? 'تطابق برقم/باركود الفاتورة' : 'Matched by Invoice Barcode',
      INVOICE_ID: isAr ? 'تطابق بمعرّف الفاتورة' : 'Matched by Invoice ID',
      QR_DATA: isAr ? 'تطابق برمز QR الفاتورة' : 'Matched by Invoice QR',
      ZATCA_QR_NUMBER: isAr ? 'تطابق بـ ZATCA QR (الرقم الضريبي)' : 'Matched by ZATCA Phase-2 QR',
      ZATCA_QR_TOTAL_DATE: isAr
        ? 'تطابق بـ ZATCA QR (التاريخ والمبلغ)'
        : 'Matched by ZATCA QR Total+Date',
    };
    setMatchedByLabel(labelMap[res.matchedBy] || '');
  };

  const handleConfirmVoidReturn = () => {
    if (!resolvedInvoice) return;
    if (isInvoiceVoidOrReturned(resolvedInvoice)) {
      setReturnErrorBanner(
        isAr
          ? `الفاتورة (${resolvedInvoice.invoiceNumber}) ملغاة ومسترجعة مسبقاً ومحفوظة بختم مسترجع.`
          : `Invoice (${resolvedInvoice.invoiceNumber}) is already voided & returned.`
      );
      return;
    }

    const result = voidAndReturnSalesInvoice({
      invoiceId: resolvedInvoice.id,
      condition,
      refundMethod,
      reason: reason.trim() || 'إرجاع فاتورة عبر F1',
      autoArchive: autoArchiveReturnedInvoices,
    });

    if (result.success) {
      setReturnErrorBanner(null);
      setReturnSuccessBanner(
        result.messageAr ||
          `تم إلغاء الفاتورة ${resolvedInvoice.invoiceNumber} ووضع ختم (مسترجع) وأرشفتها تلقائياً مع إرجاع المبلغ واستبعادها من الأرباح والتقارير والمحاسبة.`
      );
    } else {
      setReturnSuccessBanner(null);
      setReturnErrorBanner(result.messageAr || 'تعذر تنفيذ عملية إرجاع الفاتورة.');
    }
  };

  if (!isOpen) return null;

  const isAlreadyVoided = isInvoiceVoidOrReturned(resolvedInvoice);

  return renderModalPortal(
    <>
      <div
        data-testid="f1-invoice-return-modal"
        data-modal-top={isTopLayer ? 'true' : 'false'}
        style={{ zIndex }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !isCameraOpen) onClose();
        }}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5"
      >
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className={`w-full max-w-6xl max-h-[94dvh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div
            className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-sm sm:text-base truncate">
                    {isAr
                      ? 'استرجاع وأرشفة الفواتير السريع (باركود / QR)'
                      : 'Fast F1 Invoice Return, Barcode/QR Scan & Auto-Archive'}
                  </h2>
                  <kbd className="px-2 py-0.5 rounded bg-rose-600/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-mono text-[11px] font-black">
                    F1
                  </kbd>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {isAr
                    ? 'مسح باركود أو QR الفاتورة لاسترجاعها وأرشفتها بختم «مسترجع» مع تحديث المخزون والمحاسبة فوراً وعدم احتسابها في الأرباح.'
                    : 'Scan invoice barcode/QR to refund, auto-archive with RETURNED stamp, update inventory & accounting immediately, and exclude from profits.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Auto-Archive Mode Toggle */}
              <label
                data-testid="f1-auto-archive-toggle-label"
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                  autoArchiveReturnedInvoices
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  data-testid="f1-auto-archive-toggle"
                  checked={autoArchiveReturnedInvoices}
                  onChange={(e) => setAutoArchiveReturnedInvoices(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                />
                <Archive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {isAr ? 'وضع الأرشفة التلقائي (بختم مسترجع)' : 'Auto-Archive Mode'}
                </span>
              </label>

              {/* View Mode Switcher Tabs */}
              <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-xs font-bold">
                <button
                  type="button"
                  data-testid="f1-tab-scan"
                  onClick={() => setActiveViewTab('SCAN_RETURN')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition ${
                    activeViewTab === 'SCAN_RETURN'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isAr ? 'مسح واسترجاع' : 'Scan & Return'}</span>
                </button>
                <button
                  type="button"
                  data-testid="f1-tab-archive"
                  onClick={() => setActiveViewTab('ARCHIVE_DB')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition ${
                    activeViewTab === 'ARCHIVE_DB'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'قاعدة بيانات الأرشيف' : 'Returned Archive'}</span>
                  <span
                    data-testid="f1-archive-count-badge"
                    className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-mono text-[10px]"
                  >
                    {returnedInvoicesArchive.length}
                  </span>
                </button>
              </div>

              <button
                type="button"
                data-testid="f1-return-close-btn"
                onClick={onClose}
                aria-label={isAr ? 'إغلاق نافذة استرجاع الفواتير' : 'Close invoice return modal'}
                className="w-9 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-300/70 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Scan Toolbar */}
          <div
            className={`px-4 py-3 border-b shrink-0 space-y-2.5 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanLookup(scanInput);
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  data-testid="f1-invoice-scan-input"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder={
                    isAr
                      ? 'وجّه قارئ الباركود هنا أو الصق رمز QR / رقم الفاتورة (مثل INV-2026-...) واضغط Enter'
                      : 'Scan barcode / paste QR payload or invoice number (e.g. INV-...) and press Enter'
                  }
                  dir="ltr"
                  className={`w-full ps-9 pe-3 py-2.5 rounded-xl border text-xs font-mono font-bold outline-hidden transition ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  data-testid="f1-lookup-invoice-btn"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isAr ? 'جلب الفاتورة' : 'Find Invoice'}</span>
                </button>

                <button
                  type="button"
                  data-testid="f1-open-camera-scan-btn"
                  onClick={() => setIsCameraOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isAr ? 'تصوير باركود / QR بالكاميرا' : 'Scan via Camera'}</span>
                </button>
              </div>
            </form>

            {/* Quick Click Strip of Recent Invoices */}
            {recentInvoices.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  {isAr ? 'أحدث الفواتير:' : 'Recent:'}
                </span>
                {recentInvoices.map((inv) => {
                  const invVoided = isInvoiceVoidOrReturned(inv);
                  const active = resolvedInvoice?.id === inv.id;
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      data-testid={`f1-quick-invoice-chip-${inv.invoiceNumber}`}
                      onClick={() => {
                        setScanInput(inv.invoiceNumber);
                        handleScanLookup(inv.invoiceNumber);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold shrink-0 flex items-center gap-1.5 cursor-pointer transition ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : invVoided
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70'
                          : isDark
                          ? 'bg-slate-800 text-slate-200 border-slate-700 hover:border-blue-500'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <Receipt className="w-3 h-3 shrink-0" />
                      <span>{inv.invoiceNumber}</span>
                      <span className="opacity-80">
                        ({Number(inv.grandTotal || 0).toLocaleString()})
                      </span>
                      {invVoided && (
                        <span className="px-1 rounded bg-rose-600 text-white text-[9px] font-sans">
                          مسترجع
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Workspace */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {lookupError && (
              <div
                data-testid="f1-lookup-error-banner"
                className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            {returnSuccessBanner && (
              <div
                data-testid="f1-return-success-banner"
                className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{returnSuccessBanner}</span>
              </div>
            )}

            {returnErrorBanner && (
              <div
                data-testid="f1-return-error-banner"
                className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2.5"
              >
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{returnErrorBanner}</span>
              </div>
            )}

            {activeViewTab === 'ARCHIVE_DB' ? (
              <div data-testid="f1-archive-database-view" className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                        قاعدة بيانات أرشيف الفواتير المسترجعة (بختم «مسترجع»)
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        جميع الفواتير المؤرشفة هنا تم تحديث مخزونها وعكس قيودها المحاسبية ولا تُحتسب إطلاقاً في صافي المبيعات أو الأرباح.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-mono text-xs font-black">
                    {returnedInvoicesArchive.length} فاتورة مؤرشفة
                  </span>
                </div>

                {returnedInvoicesArchive.length === 0 ? (
                  <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <Archive className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      لا توجد فواتير مسترجعة في قاعدة بيانات الأرشيف حالياً.
                    </div>
                    <p className="text-[11px] text-slate-400">
                      عند استرجاع أي فاتورة مع تفعيل «وضع الأرشفة التلقائي» سيتم حفظ نسختها المختومة هنا فوراً.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-start">
                        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-3 py-2.5 text-start">رقم الأرشيف</th>
                            <th className="px-3 py-2.5 text-start">رقم الفاتورة</th>
                            <th className="px-3 py-2.5 text-start">العميل</th>
                            <th className="px-3 py-2.5 text-start">الختم الرسمي</th>
                            <th className="px-3 py-2.5 text-start">المبلغ المسترد</th>
                            <th className="px-3 py-2.5 text-start">المخزون المعاد</th>
                            <th className="px-3 py-2.5 text-start">القيد المحاسبي العكسي</th>
                            <th className="px-3 py-2.5 text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {returnedInvoicesArchive.map((rec) => (
                            <tr
                              key={rec.id}
                              data-testid={`f1-archive-row-${rec.invoiceNumber}`}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                            >
                              <td className="px-3 py-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {rec.archiveCode}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-black">
                                {rec.invoiceNumber}
                              </td>
                              <td className="px-3 py-2.5 font-bold">{rec.customerName}</td>
                              <td className="px-3 py-2.5">
                                <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black">
                                  {rec.stampLabelAr || 'مسترجع'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono font-black text-emerald-600">
                                {Number(rec.refundedAmount || 0).toLocaleString()} {currency}
                              </td>
                              <td className="px-3 py-2.5 font-mono">
                                {rec.restockedItemsCount} وحدة
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                                {rec.reversalJournalEntryNumber}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  data-testid={`f1-archive-preview-btn-${rec.invoiceNumber}`}
                                  onClick={() => {
                                    setSelectedArchivedRecord(rec);
                                    setSelectedInvoiceId(rec.originalInvoiceId);
                                    setActiveViewTab('SCAN_RETURN');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>معاينة بالختم</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : !resolvedInvoice ? (
              <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                  <QrCode className="w-7 h-7" />
                </div>
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  {isAr
                    ? 'جاهز لقراءة باركود أو كود QR الفاتورة'
                    : 'Ready to Scan Invoice Barcode or QR Code'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? 'استخدم قارئ الباركود الضوئي، أو اضغط على زر «تصوير باركود / QR بالكاميرا»، أو اختر أي فاتورة من الشريط السريع بالأعلى لمعاينتها وتنفيذ الاسترجاع الكامل.'
                    : 'Use a handheld scanner, open the live camera scanner, or click a recent invoice chip above to inspect and void/return.'}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  {salesInvoices.some((inv) => !isInvoiceVoidOrReturned(inv)) ? (
                    <button
                      type="button"
                      data-testid="f1-quick-scan-latest-btn"
                      onClick={() => {
                        const target = salesInvoices.find((inv) => !isInvoiceVoidOrReturned(inv));
                        if (target) {
                          setScanInput(`*${target.invoiceNumber}*`);
                          handleScanLookup(`*${target.invoiceNumber}*`);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>
                        {isAr
                          ? 'مسح أحدث فاتورة مبيعات نشطة تلقائياً'
                          : 'Auto-Scan Latest Active Invoice'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="f1-quick-scan-latest-btn"
                      onClick={() => {
                        const firstProd = products[0];
                        const created = addSalesInvoice({
                          branchId: activeBranch?.id || 'br-main',
                          customerId: 'walk-in',
                          customerName: 'عميل نقدي مباشر',
                          date: new Date().toISOString().slice(0, 10),
                          items: [
                            {
                              productId: firstProd?.id || 'prod-f1-sample',
                              sku: firstProd?.sku || 'SCN-PRO-100',
                              productName: firstProd?.nameAr || 'جهاز قارئ باركود ليزري احترافي',
                              quantity: 1,
                              unitPrice: firstProd?.salePrice || 1500,
                              discount: 0,
                              taxRate: 15,
                              taxAmount: Math.round((firstProd?.salePrice || 1500) * 0.15),
                              total: Math.round((firstProd?.salePrice || 1500) * 1.15),
                              warrantyMonths: 12,
                              warrantyEnabled: true,
                            },
                          ],
                          subtotal: firstProd?.salePrice || 1500,
                          discountAmount: 0,
                          taxAmount: Math.round((firstProd?.salePrice || 1500) * 0.15),
                          grandTotal: Math.round((firstProd?.salePrice || 1500) * 1.15),
                          paidAmount: Math.round((firstProd?.salePrice || 1500) * 1.15),
                          paymentMethod: 'CASH',
                          status: 'PAID',
                        });
                        setSelectedInvoiceId(created.id);
                        setScanInput(`*${created.invoiceNumber}*`);
                        setMatchedByLabel('قراءة الباركود 1D المباشر للفاتورة');
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>
                        {isAr
                          ? 'إصدار ومسح فاتورة مبيعات فورية لتجربة الاسترجاع والأرشفة (F1)'
                          : 'Issue & Scan Instant POS Invoice to Test Return'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Right/Side Return Control Panel */}
                <div className="lg:col-span-5 space-y-3.5">
                  {/* Invoice Summary Card */}
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isAlreadyVoided
                        ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-300 dark:border-rose-800'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                            {resolvedInvoice.invoiceNumber}
                          </span>
                          {matchedByLabel && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              {matchedByLabel}
                            </span>
                          )}
                          {resolvedInvoice.archiveCode && (
                            <span
                              data-testid="f1-invoice-archive-code-badge"
                              className="px-2 py-0.5 rounded bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold"
                            >
                              {resolvedInvoice.archiveCode}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold mt-1">
                          {resolvedInvoice.customerName || 'عميل نقدي'} •{' '}
                          <span className="font-mono text-slate-500">{resolvedInvoice.date}</span>
                        </div>
                      </div>

                      {isAlreadyVoided ? (
                        <span
                          data-testid="f1-invoice-voided-status-badge"
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black shrink-0"
                        >
                          مسترجع — ملغاة ومؤرشفة
                        </span>
                      ) : (
                        <span
                          data-testid="f1-invoice-active-status-badge"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-black shrink-0"
                        >
                          فاتورة مبيعات نشطة
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-center">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500">إجمالي الفاتورة</div>
                        <div className="font-mono font-black text-xs mt-0.5">
                          {Number(resolvedInvoice.grandTotal || 0).toLocaleString()} {currency}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500">المدفوع / المسترد</div>
                        <div className="font-mono font-black text-xs mt-0.5 text-emerald-600">
                          {Number(
                            isAlreadyVoided
                              ? resolvedInvoice.refundedAmount ??
                                  resolvedInvoice.paidAmount ??
                                  resolvedInvoice.grandTotal
                              : resolvedInvoice.paidAmount ?? resolvedInvoice.grandTotal
                          ).toLocaleString()}{' '}
                          {currency}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500">عدد البنود</div>
                        <div className="font-mono font-black text-xs mt-0.5">
                          {(resolvedInvoice.items || []).length}
                        </div>
                      </div>
                    </div>

                    {isAlreadyVoided && (
                      <div className="p-2.5 rounded-xl bg-rose-600/10 border border-rose-500/30 text-[11px] text-rose-800 dark:text-rose-200 font-bold leading-relaxed space-y-1">
                        <div>
                          تم إلغاء وأرشفة هذه الفاتورة بختم «مسترجع» بتاريخ (
                          {resolvedInvoice.returnedAt || resolvedInvoice.date})
                          {resolvedInvoice.returnReason
                            ? ` — السبب: (${resolvedInvoice.returnReason})`
                            : ''}
                          .
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                          {resolvedInvoice.returnCreditNoteNumber && (
                            <span className="px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900">
                              إشعار دائن: {resolvedInvoice.returnCreditNoteNumber}
                            </span>
                          )}
                          {resolvedInvoice.returnJournalEntryNumber && (
                            <span className="px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900">
                              قيد عكسي: {resolvedInvoice.returnJournalEntryNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items Quick Table */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-between">
                      <span>{isAr ? 'أصناف الفاتورة' : 'Invoice Items'}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {(resolvedInvoice.items || []).reduce(
                          (s, it) => s + Number(it.quantity || 0),
                          0
                        )}{' '}
                        قطعة
                      </span>
                    </div>
                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(resolvedInvoice.items || []).map((it, idx) => (
                        <div
                          key={`${it.productId}-${idx}`}
                          className="px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold truncate">{it.productName}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {it.sku} • {it.quantity} × {Number(it.unitPrice || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="font-mono font-black shrink-0">
                            {Number(it.total || 0).toLocaleString()} {currency}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return Execution Form */}
                  {!isAlreadyVoided && (
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-950/40">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            حالة البضاعة المرتجعة
                          </label>
                          <select
                            data-testid="f1-return-condition-select"
                            value={condition}
                            onChange={(e) =>
                              setCondition(e.target.value as ReturnedItemCondition)
                            }
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-hidden"
                          >
                            <option value="HEALTHY_RESTOCK">سليمة — إعادة للمخزون فوراً</option>
                            <option value="DAMAGED_QUARANTINE">تالفة — حجر وعدم إعادة للبيع</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            طريقة إرجاع المبلغ
                          </label>
                          <select
                            data-testid="f1-return-refund-method-select"
                            value={refundMethod}
                            onChange={(e) =>
                              setRefundMethod(e.target.value as ReturnRefundMethod)
                            }
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-hidden"
                          >
                            <option value="CASH">صرف نقدي من الصندوق (Cash)</option>
                            <option value="CREDIT_BALANCE">قيد دائن / تسوية حساب العميل</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          سبب الإرجاع (يظهر على ختم الفاتورة وقاعدة الأرشيف)
                        </label>
                        <input
                          type="text"
                          data-testid="f1-return-reason-input"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-hidden focus:border-rose-500"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            {autoArchiveReturnedInvoices ? (
                              <>
                                <strong>وضع الأرشفة التلقائي مفعّل:</strong> سيتم حفظ الفاتورة في
                                قاعدة بيانات الأرشيف بختم أحمر بارز{' '}
                                <strong className="text-rose-600">«مسترجع»</strong> وتحديث سجلات
                                المخزون والمحاسبة فوراً.
                              </>
                            ) : (
                              <>
                                سيتم إلغاء الفاتورة ووضع ختم{' '}
                                <strong className="text-rose-600">«مسترجع»</strong> وتحديث المخزون
                                والمحاسبة فوراً.
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                          <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            ضمان دقة التقارير: لا يتم احتساب المبالغ المسترجعة في المبيعات أو صافي الأرباح.
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid="f1-confirm-void-return-btn"
                        onClick={handleConfirmVoidReturn}
                        className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>
                          {autoArchiveReturnedInvoices
                            ? 'تأكيد الاسترجاع والأرشفة التلقائية بختم «مسترجع»'
                            : 'تأكيد إلغاء الفاتورة واسترجاع المبلغ وختم «مسترجع»'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Stamped Invoice Renderer Preview */}
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>
                        {isAr
                          ? 'معاينة الفاتورة الأصلية مع الختم الضريبي والباركود'
                          : 'Invoice Live Preview'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('a4')}
                          className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                            previewMode === 'a4'
                              ? 'bg-white dark:bg-slate-900 shadow-2xs text-slate-900 dark:text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          A4
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('thermal')}
                          className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                            previewMode === 'thermal'
                              ? 'bg-white dark:bg-slate-900 shadow-2xs text-slate-900 dark:text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          حراري 80mm
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 p-3 sm:p-4 max-h-[60dvh] overflow-auto flex justify-center">
                    <div className="shadow-lg rounded-xl overflow-hidden bg-white text-slate-900">
                      <InvoiceRenderer
                        invoice={resolvedInvoice}
                        mode={previewMode}
                        thermalTemplate={invoiceTemplateSettings.thermalTemplate}
                        standardTemplate={invoiceTemplateSettings.standardTemplate}
                        settings={invoiceTemplateSettings}
                        companyName={company.nameAr || company.name}
                        companyNameEn={company.name}
                        companyLogo={company.logo || company.logoUrl}
                        taxNumber={company.taxNumber}
                        branchName={activeBranch?.nameAr || 'المركز الرئيسي'}
                        branchAddress={activeBranch?.city || company.address}
                        branchPhone={activeBranch?.phone || company.phone}
                        currency={currency}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCameraOpen && (
        <CameraBarcodeScannerModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          contextMode="INVOICE_RETURN"
          initialScanMode="SINGLE"
          title={
            isAr
              ? 'مسح باركود أو كود QR الفاتورة للاسترجاع'
              : 'Scan Invoice Barcode / QR for Return'
          }
          onScan={(code) => {
            setScanInput(code);
            handleScanLookup(code);
          }}
        />
      )}
    </>
  );
};
