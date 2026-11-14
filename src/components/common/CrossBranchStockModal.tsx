import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Network,
  X,
  ArrowRightLeft,
  Server,
  Wifi,
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Zap,
} from 'lucide-react';

export const CrossBranchStockModal: React.FC = () => {
  const {
    isCrossBranchModalOpen,
    crossBranchModalSku,
    closeCrossBranchModal,
    probeCrossBranchStock,
    requestInterBranchTransfer,
    products,
    formatCurrency,
    currentBranch,
  } = useERP();

  const [selectedTargetBranch, setSelectedTargetBranch] = useState<string>('branch-jed-02');
  const [requestedQty, setRequestedQty] = useState<number>(5);
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT' | 'EMERGENCY'>('NORMAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isCrossBranchModalOpen || !crossBranchModalSku) return null;

  const product = products.find((p) => p.sku === crossBranchModalSku);
  const branchStockList = probeCrossBranchStock(crossBranchModalSku);

  const totalEnterpriseAvailable = branchStockList.reduce((sum, b) => sum + b.availableQty, 0);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetBranch || requestedQty <= 0) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      const result = await requestInterBranchTransfer({
        sourceBranchId: selectedTargetBranch,
        targetBranchId: currentBranch.id,
        productSku: crossBranchModalSku,
        requestedQty,
        urgency,
      });

      if (result.success) {
        setSuccessMessage(result.messageAr);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="cross-branch-stock-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeCrossBranchModal();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100">
        {/* Lumina POS-Style Modal Header */}
        <div className="px-5 py-4 bg-slate-50/90 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Network className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                فحص توفر الصنف في شبكة الفروع (LAN & WAN Stock Probe)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                استعلام لحظي عن المخزون عبر الشبكة المحلية والربط الفوري بين المستودعات
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-branch-modal"
            onClick={closeCrossBranchModal}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 bg-[#F8FAFC] dark:bg-slate-950">
          {/* Target Product Info Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-slate-100 text-base">
                  {product?.nameAr || crossBranchModalSku}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                  <span>SKU: {crossBranchModalSku}</span>
                  <span>•</span>
                  <span>سعر التكلفة: {formatCurrency(product?.costPrice || 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-bold">إجمالي المتوفر بكافة الفروع:</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {totalEnterpriseAvailable} قطعة
              </span>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-3 text-xs font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Cross Branch Availability Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-500" />
              <span>عقد الشبكة وحالة التوفر في الفروع المترابطة (Local Nodes)</span>
            </h4>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">الفرع والعقدة الشبكية</th>
                    <th className="p-3">عنوان الـ IP وحالة الربط</th>
                    <th className="p-3 text-center">الرصيد الكلي</th>
                    <th className="p-3 text-center">المحجوز</th>
                    <th className="p-3 text-center">المتوفر الفعلي</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {branchStockList.map((node) => {
                    return (
                      <tr
                        key={node.branchId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                          {node.branchNameAr}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                node.latencyMs < 50
                                  ? 'bg-emerald-500 animate-pulse'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span>{node.lanIpAddress}</span>
                            <span className="text-[10px] text-slate-400">({node.latencyMs}ms)</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {node.stockQty}
                        </td>
                        <td className="p-3 text-center font-mono text-amber-600">
                          {node.reservedQty}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {node.availableQty}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTargetBranch(node.branchId);
                              setRequestedQty(Math.min(node.availableQty, 5) || 1);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              selectedTargetBranch === node.branchId
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50'
                            }`}
                          >
                            تحديد للتحويل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transfer Request Dispatch Panel */}
          <form
            onSubmit={handleTransferSubmit}
            className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-100">
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
              <span>إرسال أمر تحويل مخزني فوري وقيد محاسبي متوازن (Inter-Branch Clearing)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  الفرع المصدر للقطعة
                </label>
                <select
                  value={selectedTargetBranch}
                  onChange={(e) => setSelectedTargetBranch(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  {branchStockList.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      {b.branchNameAr} (متوفر: {b.availableQty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  الكمية المطلوبة
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={requestedQty}
                  onChange={(e) => setRequestedQty(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  درجة الأولوية
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="NORMAL">عادي (خلال 24 ساعة)</option>
                  <option value="URGENT">عاجل (خلال 4 ساعات)</option>
                  <option value="EMERGENCY">طارئ لعميل POS مباشر (فوري)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-500">
                سيقوم النظام تلقائياً بترحيل قيد مقاصة بين الفروع (ح/ جاري الفروع) لتوازن ميزان المراجعة.
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>جاري إصدار أمر التحويل والقيد...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>تأكيد طلب التحويل المخزني</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
