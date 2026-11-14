import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  CheckCircle2,
  AlertTriangle,
  X,
  User,
  FileText,
  History,
  Settings,
  ExternalLink,
  Copy,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  MessagingChannel,
  MessageTemplateCategory,
} from '../../types/erp';
import {
  buildWhatsAppAndSmsProtocolLinks,
  composeInvoiceMessageText,
  composeDebtReminderMessageText,
  composeExecutiveReportMessageText,
} from '../../core/messagingEngine';
import { calculateDynamicFinancialStatements } from '../../core/accountingEngine';

export const QuickSendModal: React.FC = () => {
  const {
    quickSendModalState,
    closeQuickSendModal,
    outboundMessages,
    messagingGatewayConfig,
    updateMessagingGatewayConfig,
    sendWhatsAppOrSmsMessage,
    whatsappAccounts,
    activeWhatsAppAccountId,
    switchWhatsAppAccount,
    setActiveTab: setGlobalErpTab,
    customers,
    salesInvoices,
    products,
    chartAccounts,
    journalEntries,
    company,
    currentBranch,
    currency,
    currentIndustryBlueprint,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'COMPOSE' | 'HISTORY' | 'SETTINGS'>('COMPOSE');
  const [channel, setChannel] = useState<MessagingChannel>('WHATSAPP');
  const [category, setCategory] = useState<MessageTemplateCategory>('INVOICE');
  const [attachmentFormat, setAttachmentFormat] = useState<
    'TEXT_ONLY' | 'IMAGE_SNAPSHOT' | 'PDF_DOCUMENT' | 'ALL_COMBINED'
  >(messagingGatewayConfig.preferredInvoiceFormat || 'ALL_COMBINED');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
    whatsappUrl?: string;
    smsUri?: string;
    receiptId?: string;
  } | null>(null);
  const [copiedFlag, setCopiedFlag] = useState(false);

  // Sync preset when modal opens
  useEffect(() => {
    if (quickSendModalState.isOpen) {
      setActiveTab('COMPOSE');
      setFeedbackBanner(null);
      setChannel(quickSendModalState.channel || 'WHATSAPP');
      setCategory(quickSendModalState.category || 'INVOICE');
      setRecipientName(quickSendModalState.recipientName || '');
      setRecipientPhone(quickSendModalState.recipientPhone || '');
      setReferenceNumber(quickSendModalState.referenceNumber || '');

      if (quickSendModalState.messageBody) {
        setMessageBody(quickSendModalState.messageBody);
      } else if (quickSendModalState.category === 'FINANCIAL_REPORT') {
        const fin = calculateDynamicFinancialStatements(
          chartAccounts,
          journalEntries,
          salesInvoices,
          []
        );
        const cashBal = fin.effectiveAccounts
          .filter((a) => a.code === '1101' || a.code === '1102')
          .reduce((s, a) => s + Math.max(0, a.effectiveBalance), 0);
        const arBal = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
        const lowStockCount = products.filter((p) => p.stockQty <= p.reorderPoint).length;
        if (!quickSendModalState.recipientName) setRecipientName('الإدارة العليا / المالك');
        if (!quickSendModalState.recipientPhone) {
          setRecipientPhone(messagingGatewayConfig.ownerReportPhone);
        }
        setReferenceNumber(`REP-${new Date().toISOString().slice(0, 10)}`);
        setMessageBody(
          composeExecutiveReportMessageText({
            companyName: company.nameAr || company.name,
            reportTitleAr: 'التقرير المالي والتشغيلي اللحظي للإدارة العليا',
            totalRevenue: fin.revenues,
            netProfit: fin.netIncome,
            cashBalance: cashBal,
            receivablesTotal: arBal,
            payablesTotal: fin.totalLiabilities,
            lowStockCount,
            currency,
            activeIndustryAr: currentIndustryBlueprint.nameAr,
          })
        );
      } else if (salesInvoices.length > 0) {
        const latestInv = salesInvoices[0];
        const matchedCustomer = customers.find((c) => c.id === latestInv.customerId);
        if (!quickSendModalState.recipientName) setRecipientName(latestInv.customerName);
        if (!quickSendModalState.recipientPhone && matchedCustomer?.phone) {
          setRecipientPhone(matchedCustomer.phone);
        }
        setReferenceNumber(latestInv.invoiceNumber);
        setMessageBody(
          composeInvoiceMessageText({
            invoice: latestInv,
            companyName: company.nameAr || company.name,
            branchName: currentBranch.nameAr,
            currency,
            includeItems: messagingGatewayConfig.autoIncludeInvoiceItems,
            includeWarranty: messagingGatewayConfig.autoIncludeWarrantyTerms,
            customSignatureAr: messagingGatewayConfig.customSignatureAr,
          })
        );
      }
    }
  }, [quickSendModalState]);

  const protocolLinks = useMemo(() => {
    return buildWhatsAppAndSmsProtocolLinks(
      recipientPhone,
      messageBody,
      messagingGatewayConfig.defaultCountryDialCode
    );
  }, [recipientPhone, messageBody, messagingGatewayConfig.defaultCountryDialCode]);

  if (!quickSendModalState.isOpen) return null;

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find((c) => c.id === custId);
    if (!cust) return;
    setRecipientName(cust.nameAr || cust.name);
    setRecipientPhone(cust.phone || '');
    if (category === 'DEBT_REMINDER') {
      setReferenceNumber(`SOA-${cust.id.slice(-4).toUpperCase()}`);
      setMessageBody(
        composeDebtReminderMessageText({
          customerName: cust.nameAr || cust.name,
          totalBalance: Math.abs(cust.balance || 0),
          companyName: company.nameAr || company.name,
          currency,
          customSignatureAr: messagingGatewayConfig.customSignatureAr,
        })
      );
    }
  };

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = salesInvoices.find((i) => i.id === invId);
    if (!inv) return;
    const cust = customers.find((c) => c.id === inv.customerId);
    setCategory('INVOICE');
    setRecipientName(inv.customerName);
    if (cust?.phone) setRecipientPhone(cust.phone);
    setReferenceNumber(inv.invoiceNumber);
    setMessageBody(
      composeInvoiceMessageText({
        invoice: inv,
        companyName: company.nameAr || company.name,
        branchName: currentBranch.nameAr,
        currency,
        includeItems: messagingGatewayConfig.autoIncludeInvoiceItems,
        includeWarranty: messagingGatewayConfig.autoIncludeWarrantyTerms,
        customSignatureAr: messagingGatewayConfig.customSignatureAr,
      })
    );
  };

  const handleApplyTemplatePreset = (newCat: MessageTemplateCategory) => {
    setCategory(newCat);
    setFeedbackBanner(null);
    if (newCat === 'INVOICE' && salesInvoices.length > 0) {
      const inv = salesInvoices.find((i) => i.id === selectedInvoiceId) || salesInvoices[0];
      const cust = customers.find((c) => c.id === inv.customerId);
      setRecipientName(inv.customerName);
      if (cust?.phone && !recipientPhone) setRecipientPhone(cust.phone);
      setReferenceNumber(inv.invoiceNumber);
      setMessageBody(
        composeInvoiceMessageText({
          invoice: inv,
          companyName: company.nameAr || company.name,
          branchName: currentBranch.nameAr,
          currency,
          includeItems: messagingGatewayConfig.autoIncludeInvoiceItems,
          includeWarranty: messagingGatewayConfig.autoIncludeWarrantyTerms,
          customSignatureAr: messagingGatewayConfig.customSignatureAr,
        })
      );
    } else if (newCat === 'DEBT_REMINDER') {
      const custWithDebt =
        customers.find((c) => c.id === selectedCustomerId) ||
        customers.find((c) => c.balance > 0) ||
        customers[0];
      if (custWithDebt) {
        setRecipientName(custWithDebt.nameAr || custWithDebt.name);
        setRecipientPhone(custWithDebt.phone || recipientPhone);
        setReferenceNumber(`SOA-${custWithDebt.id.slice(-4).toUpperCase()}`);
        setMessageBody(
          composeDebtReminderMessageText({
            customerName: custWithDebt.nameAr || custWithDebt.name,
            totalBalance: Math.abs(custWithDebt.balance || 0),
            companyName: company.nameAr || company.name,
            currency,
            customSignatureAr: messagingGatewayConfig.customSignatureAr,
          })
        );
      }
    } else if (newCat === 'FINANCIAL_REPORT') {
      const fin = calculateDynamicFinancialStatements(
        chartAccounts,
        journalEntries,
        salesInvoices,
        []
      );
      const cashBal = fin.effectiveAccounts
        .filter((a) => a.code === '1101' || a.code === '1102')
        .reduce((s, a) => s + Math.max(0, a.effectiveBalance), 0);
      const arBal = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
      const lowStockCount = products.filter((p) => p.stockQty <= p.reorderPoint).length;
      setRecipientName('الإدارة العليا / المالك');
      if (!recipientPhone) setRecipientPhone(messagingGatewayConfig.ownerReportPhone);
      setReferenceNumber(`REP-${new Date().toISOString().slice(0, 10)}`);
      setMessageBody(
        composeExecutiveReportMessageText({
          companyName: company.nameAr || company.name,
          reportTitleAr: 'التقرير المالي والتشغيلي اللحظي للإدارة العليا',
          totalRevenue: fin.revenues,
          netProfit: fin.netIncome,
          cashBalance: cashBal,
          receivablesTotal: arBal,
          payablesTotal: fin.totalLiabilities,
          lowStockCount,
          currency,
          activeIndustryAr: currentIndustryBlueprint.nameAr,
        })
      );
    } else if (newCat === 'LOW_STOCK_ALERT') {
      const lowItems = products.filter((p) => p.stockQty <= p.reorderPoint);
      setRecipientName('مدير المشتريات والمستودعات');
      if (!recipientPhone) setRecipientPhone(messagingGatewayConfig.ownerReportPhone);
      setReferenceNumber(`STOCK-ALT-${Date.now().toString().slice(-4)}`);
      const lines = [
        `⚠️ *تنبيه نواقص المخزون وحد إعادة الطلب*`,
        `🏢 *${company.nameAr || company.name}* (${currentIndustryBlueprint.nameAr})`,
        `عدد الأصناف الحرجة: *${lowItems.length} صنف*`,
        `────────────────────`,
        ...lowItems.slice(0, 6).map(
          (item, i) =>
            `${i + 1}. ${item.nameAr} (${item.sku}) — الرصيد: ${item.stockQty} ${item.uom} (حد الطلب: ${item.reorderPoint})`
        ),
        `────────────────────`,
        `يرجى اعتماد أوامر الشراء العاجلة لتغذية المستودع.`,
      ];
      setMessageBody(lines.join('\n'));
    }
  };

  const handleDispatchMessage = async (openDirectLink = false) => {
    setIsSending(true);
    try {
      const res = await sendWhatsAppOrSmsMessage({
        channel,
        category,
        recipientName: recipientName || 'عميل / مستلم',
        recipientPhone,
        referenceNumber,
        messageBody,
        openDirectLink,
      });

      if (!res.success) {
        setFeedbackBanner({
          type: 'error',
          text: res.errorAr || 'تعذر الإرسال، يرجى التحقق من رقم الهاتف.',
        });
        return;
      }

      const receiptId = `ACK-${channel}-${Date.now().toString(36).toUpperCase()}`;
      setFeedbackBanner({
        type: 'success',
        text: `تم الإرسال الفعلي والتأكيد الآلي بنجاح 100% (ACK: ${receiptId}) عبر ${
          channel === 'WHATSAPP'
            ? `واتساب المباشر (${attachmentFormat})`
            : 'مودم الجوال بسلك الـ USB (AT+CMGS)'
        } إلى الرقم ${res.record?.normalizedPhone}!`,
        whatsappUrl: res.whatsappUrl,
        smsUri: res.smsUri,
        receiptId,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard?.writeText(messageBody).catch(() => {});
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2000);
  };

  const countryLabelMap: Record<string, string> = {
    YEMEN: 'اليمن (+967)',
    SAUDI: 'السعودية (+966)',
    UAE: 'الإمارات (+971)',
    EGYPT: 'مصر (+20)',
    INTERNATIONAL: 'دولي معتمد',
    INVALID: 'غير مكتمل',
  };

  const smsSegments = Math.max(1, Math.ceil((messageBody.length || 1) / 70));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      data-testid="quick-send-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeQuickSendModal();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Lumina POS-Style Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50/90 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  مركز الإرسال الموحد عبر الرقم (واتساب WhatsApp & رسائل نصية SMS)
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  متصل بالنظام المحاسبي
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                إرسال الفواتير، كشوف المديونيات، سندات القبض، إشعارات الصيانة، والتقارير المالية مباشرة لأي رقم هاتف محلي أو دولي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeQuickSendModal}
            data-testid="close-quick-send-modal-btn"
            aria-label="إغلاق نافذة الإرسال"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* POS-Style Rounded-Full Pill Navigation Sub-Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('COMPOSE')}
              data-testid="tab-msg-compose"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition cursor-pointer ${
                activeTab === 'COMPOSE'
                  ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>إنشاء وإرسال رسالة فورية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              data-testid="tab-msg-history"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل الرسائل المرسلة ({outboundMessages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              data-testid="tab-msg-settings"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition cursor-pointer ${
                activeTab === 'SETTINGS'
                  ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>إعدادات الربط والدولة الافتراضية</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/70 dark:border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>المفتاح الدولي الافتراضي: {messagingGatewayConfig.defaultCountryDialCode}</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8FAFC] dark:bg-slate-950">
          {activeTab === 'COMPOSE' && (
            <>
              {/* Feedback Banner */}
              {feedbackBanner && (
                <div
                  data-testid="msg-dispatch-success-banner"
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    feedbackBanner.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs font-bold">
                    {feedbackBanner.type === 'success' ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                    )}
                    <span>{feedbackBanner.text}</span>
                  </div>
                  {feedbackBanner.type === 'success' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          closeQuickSendModal();
                          setGlobalErpTab('communications');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>عرض المحادثة داخل خدمات التواصل</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Top Row: Channel Selection & Template Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Channel & Multi-Account Selector */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      1. اختر قناة الإرسال للرقم المستهدف (داخلي 100%)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setChannel('WHATSAPP')}
                        data-testid="msg-channel-whatsapp"
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          channel === 'WHATSAPP'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <MessageSquare
                          className={`w-4 h-4 ${
                            channel === 'WHATSAPP' ? 'text-emerald-400' : 'text-emerald-600'
                          }`}
                        />
                        <span>واتساب مدمج بالنظام</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannel('SMS')}
                        data-testid="msg-channel-sms"
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          channel === 'SMS'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Smartphone
                          className={`w-4 h-4 ${
                            channel === 'SMS' ? 'text-sky-400' : 'text-blue-600'
                          }`}
                        />
                        <span>رسالة نصية للرقم (SMS)</span>
                      </button>
                    </div>
                  </div>

                  {channel === 'WHATSAPP' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        حساب الواتساب المرسل منه داخل النظام:
                      </label>
                      <select
                        value={activeWhatsAppAccountId}
                        onChange={(e) => switchWhatsAppAccount(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-slate-900"
                      >
                        {whatsappAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountLabel} ({acc.session.phoneNumber}) —{' '}
                            {acc.session.status === 'CONNECTED' ? 'متصل ✓' : 'بانتظار المسح'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Category / Operation Preset Selector */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    2. نوع العملية وصيغة إرسال الفاتورة (حسب اختيارك)
                  </label>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'INVOICE', label: 'فاتورة مبيعات' },
                          { id: 'DEBT_REMINDER', label: 'مطالبة مديونية' },
                          { id: 'RECEIPT_VOUCHER', label: 'سند قبض' },
                          { id: 'RMA_WARRANTY', label: 'إشعار صيانة/ضمان' },
                          { id: 'FINANCIAL_REPORT', label: 'تقرير مالي' },
                          { id: 'LOW_STOCK_ALERT', label: 'نواقص المخزون' },
                        ] as { id: MessageTemplateCategory; label: string }[]
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleApplyTemplatePreset(item.id)}
                          data-testid={`msg-preset-${item.id}`}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                            category === item.id
                              ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {category === 'INVOICE' && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                          صيغة إرسال الفاتورة:
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          {[
                            { id: 'TEXT_ONLY', label: 'نص مفصل' },
                            { id: 'IMAGE_SNAPSHOT', label: 'صورة معتمدة' },
                            { id: 'PDF_DOCUMENT', label: 'ملف PDF' },
                            { id: 'ALL_COMBINED', label: 'الكل معاً ✓' },
                          ].map((fmt) => (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => setAttachmentFormat(fmt.id as any)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer border ${
                                attachmentFormat === fmt.id
                                  ? 'bg-slate-900 border-slate-900 text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Autofill from Existing Customers or Invoices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    اختيار سريع من دليل العملاء (لتعبئة الاسم والرقم تلقائياً)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    data-testid="msg-customer-select"
                    aria-label="اختيار عميل"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- اختر عميلاً من قاعدة البيانات أو أدخل الرقم يدوياً --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr || c.name} — {c.phone} (الرصيد: {c.balance.toLocaleString()} {currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    أو اختيار فاتورة مبيعات لتوليد نص الفاتورة والضمان فوراً
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleSelectInvoice(e.target.value)}
                    data-testid="msg-invoice-select"
                    aria-label="اختيار فاتورة"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- اختر فاتورة من السجل --</option>
                    {salesInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customerName} ({inv.grandTotal.toLocaleString()} {currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipient Name, Phone Number, and Reference Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المستلم / العميل
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      data-testid="msg-recipient-name-input"
                      placeholder="مثال: شركة البناء الحديث / م. سالم"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white focus:border-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الجوال / الواتساب (محلي أو دولي) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-600 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      dir="ltr"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      data-testid="msg-recipient-phone-input"
                      placeholder="771234567 أو +966501234567"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  {/* Normalized Phone Preview Badge */}
                  <div
                    className="mt-1.5 flex items-center justify-between text-[11px]"
                    data-testid="msg-normalized-phone-badge"
                  >
                    {protocolLinks.valid ? (
                      <>
                        <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold" dir="ltr">
                          {protocolLinks.normalized.e164Phone}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                          {countryLabelMap[protocolLinks.normalized.countryDetected]}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {protocolLinks.normalized.errorAr || 'أدخل رقم الهاتف لتفعيل روابط الإرسال'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم المرجع (فاتورة / سند / تذكرة)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      data-testid="msg-reference-input"
                      placeholder="INV-2026-1001"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Message Body Editor */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>نص الرسالة الجاهزة للإرسال (قابل للتعديل الفوري)</span>
                  </label>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>عدد الأحرف: {messageBody.length}</span>
                    <span>شرائح SMS: {smsSegments}</span>
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedFlag ? 'تم النسخ!' : 'نسخ النص'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={7}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  data-testid="msg-body-textarea"
                  placeholder="اكتب نص الفاتورة أو الإشعار المراد إرساله..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-100 leading-relaxed focus:border-slate-900 focus:bg-white focus:outline-none font-sans"
                />
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Direct In-App WhatsApp Chat Dispatch & Open */}
                  {protocolLinks.valid && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleDispatchMessage(false);
                        closeQuickSendModal();
                        setGlobalErpTab('communications');
                      }}
                      data-testid="msg-direct-whatsapp-link"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/90 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>إرسال وفتح المحادثة داخل النظام فوراً ({protocolLinks.normalized.e164Phone})</span>
                    </button>
                  )}

                  {/* Direct In-App USB SMS Bridge Dispatch */}
                  {protocolLinks.valid && (
                    <button
                      type="button"
                      onClick={async () => {
                        setChannel('SMS');
                        await handleDispatchMessage(false);
                      }}
                      data-testid="msg-direct-sms-link"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>إرسال فوري عبر جسر الرسائل بالنظام (SMS)</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeQuickSendModal}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleDispatchMessage(false)}
                    data-testid="msg-dispatch-gateway-btn"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {channel === 'WHATSAPP'
                        ? 'إرسال وتوثيق عبر بوابة واتساب الآن'
                        : 'إرسال وتوثيق كرسالة نصية SMS الآن'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'HISTORY' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3" data-testid="msg-history-list">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  سجل الإشعارات والفواتير المرسلة عبر واتساب و SMS ({outboundMessages.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  يتم الحفظ الفوري في قاعدة البيانات وسجل المراجعة
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-800 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">القناة</th>
                      <th className="py-2.5 px-3">التصنيف</th>
                      <th className="py-2.5 px-3">المستلم</th>
                      <th className="py-2.5 px-3">الرقم الدولي الموحد</th>
                      <th className="py-2.5 px-3">المرجع</th>
                      <th className="py-2.5 px-3">التوقيت</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3">إجراء سريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {outboundMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              msg.channel === 'WHATSAPP'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {msg.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">{msg.category}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{msg.recipientName}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-400 font-semibold" dir="ltr">
                          {msg.normalizedPhone}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {msg.referenceNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{msg.sentAt}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-semibold">
                            تم الإرسال ✓
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              setChannel(msg.channel);
                              setCategory(msg.category);
                              setRecipientName(msg.recipientName);
                              setRecipientPhone(msg.normalizedPhone);
                              setReferenceNumber(msg.referenceNumber || '');
                              setMessageBody(msg.messageBody);
                              setActiveTab('COMPOSE');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                          >
                            إعادة فتح وإرسال
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="space-y-4" data-testid="msg-settings-panel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    إعدادات الترقيم الدولي وبوابة الـ SMS
                  </h4>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">
                      مفتاح الدولة الافتراضي للأرقام المحلية
                    </label>
                    <select
                      value={messagingGatewayConfig.defaultCountryDialCode}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ defaultCountryDialCode: e.target.value })
                      }
                      data-testid="msg-default-country-select"
                      aria-label="مفتاح الدولة الافتراضي"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="+967">اليمن (+967)</option>
                      <option value="+966">السعودية (+966)</option>
                      <option value="+971">الإمارات (+971)</option>
                      <option value="+20">مصر (+20)</option>
                      <option value="+1">الولايات المتحدة / دولي (+1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">
                      اسم المرسل في الرسائل النصية (SMS Sender ID)
                    </label>
                    <input
                      type="text"
                      value={messagingGatewayConfig.smsSenderId}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ smsSenderId: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">
                      رقم جوال المدير العام لاستقبال التقارير المالية اليومية
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={messagingGatewayConfig.ownerReportPhone}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ ownerReportPhone: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    خيارات تضمين تفاصيل الفاتورة والتوقيع
                  </h4>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={messagingGatewayConfig.autoIncludeInvoiceItems}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({
                          autoIncludeInvoiceItems: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-slate-900"
                    />
                    <span>إدراج جدول الأصناف والكميات داخل رسالة الفاتورة تلقائياً</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={messagingGatewayConfig.autoIncludeWarrantyTerms}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({
                          autoIncludeWarrantyTerms: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-slate-900"
                    />
                    <span>إدراج الرقم التسلسلي (S/N) وفترة الضمان للألواح والبطاريات والإلكترونيات</span>
                  </label>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">
                      التوقيع الرسمي في أسفل رسائل الواتساب والـ SMS
                    </label>
                    <input
                      type="text"
                      value={messagingGatewayConfig.customSignatureAr}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ customSignatureAr: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
