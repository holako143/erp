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
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
    whatsappUrl?: string;
    smsUri?: string;
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

    setFeedbackBanner({
      type: 'success',
      text: `تم إرسال وتوثيق الرسالة عبر ${
        channel === 'WHATSAPP' ? 'واتساب للأعمال (WhatsApp)' : 'بوابة الرسائل النصية (SMS)'
      } إلى الرقم ${res.record?.normalizedPhone} بنجاح!`,
      whatsappUrl: res.whatsappUrl,
      smsUri: res.smsUri,
    });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      data-testid="quick-send-modal"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-l from-emerald-950/90 via-slate-900 to-cyan-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  مركز الإرسال الموحد عبر الرقم (واتساب WhatsApp & رسائل نصية SMS)
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  متصل بالنظام المحاسبي
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                إرسال الفواتير، كشوف المديونيات، سندات القبض، إشعارات الصيانة، والتقارير المالية مباشرة لأي رقم هاتف محلي أو دولي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeQuickSendModal}
            data-testid="close-quick-send-modal-btn"
            aria-label="إغلاق نافذة الإرسال"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('COMPOSE')}
              data-testid="tab-msg-compose"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'COMPOSE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>إنشاء وإرسال رسالة فورية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              data-testid="tab-msg-history"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'HISTORY'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل الرسائل المرسلة ({outboundMessages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              data-testid="tab-msg-settings"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'SETTINGS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>إعدادات الربط والدولة الافتراضية</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>المفتاح الدولي الافتراضي: {messagingGatewayConfig.defaultCountryDialCode}</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'COMPOSE' && (
            <>
              {/* Feedback Banner */}
              {feedbackBanner && (
                <div
                  data-testid="msg-dispatch-success-banner"
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    feedbackBanner.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    {feedbackBanner.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span>{feedbackBanner.text}</span>
                  </div>
                  {feedbackBanner.type === 'success' && (
                    <div className="flex items-center gap-2 shrink-0">
                      {feedbackBanner.whatsappUrl && (
                        <a
                          href={feedbackBanner.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح في واتساب الآن</span>
                        </a>
                      )}
                      {feedbackBanner.smsUri && (
                        <a
                          href={feedbackBanner.smsUri}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>تطبيق الرسائل SMS</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Top Row: Channel Selection & Template Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Channel Selector */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-400 mb-2">
                    1. اختر قناة الإرسال للرقم المستهدف
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setChannel('WHATSAPP')}
                      data-testid="msg-channel-whatsapp"
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                        channel === 'WHATSAPP'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>إرسال عبر واتساب (WhatsApp)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('SMS')}
                      data-testid="msg-channel-sms"
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                        channel === 'SMS'
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span>رسالة نصية للرقم (SMS)</span>
                    </button>
                  </div>
                </div>

                {/* Category / Operation Preset Selector */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-400 mb-2">
                    2. نوع العملية / القالب المحاسبي الجاهز
                  </label>
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
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          category === item.id
                            ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Autofill from Existing Customers or Invoices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    اختيار سريع من دليل العملاء (لتعبئة الاسم والرقم تلقائياً)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    data-testid="msg-customer-select"
                    aria-label="اختيار عميل"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    أو اختيار فاتورة مبيعات لتوليد نص الفاتورة والضمان فوراً
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleSelectInvoice(e.target.value)}
                    data-testid="msg-invoice-select"
                    aria-label="اختيار فاتورة"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    اسم المستلم / العميل
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      data-testid="msg-recipient-name-input"
                      placeholder="مثال: شركة البناء الحديث / م. سالم"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    رقم الجوال / الواتساب (محلي أو دولي) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      dir="ltr"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      data-testid="msg-recipient-phone-input"
                      placeholder="771234567 أو +966501234567"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  {/* Normalized Phone Preview Badge */}
                  <div
                    className="mt-1.5 flex items-center justify-between text-[11px]"
                    data-testid="msg-normalized-phone-badge"
                  >
                    {protocolLinks.valid ? (
                      <>
                        <span className="text-emerald-400 font-mono font-bold" dir="ltr">
                          {protocolLinks.normalized.e164Phone}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {countryLabelMap[protocolLinks.normalized.countryDetected]}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-400">
                        {protocolLinks.normalized.errorAr || 'أدخل رقم الهاتف لتفعيل روابط الإرسال'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    رقم المرجع (فاتورة / سند / تذكرة)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      data-testid="msg-reference-input"
                      placeholder="INV-2026-1001"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Message Body Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>نص الرسالة الجاهزة للإرسال (قابل للتعديل الفوري)</span>
                  </label>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>عدد الأحرف: {messageBody.length}</span>
                    <span>شرائح SMS: {smsSegments}</span>
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedFlag ? 'تم النسخ!' : 'نسخ النص'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  data-testid="msg-body-textarea"
                  placeholder="اكتب نص الفاتورة أو الإشعار المراد إرساله..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-100 leading-relaxed focus:border-emerald-500 focus:outline-none font-sans"
                />
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Direct WhatsApp Web/App Link */}
                  {protocolLinks.valid && (
                    <a
                      href={protocolLinks.whatsappWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleDispatchMessage(true)}
                      data-testid="msg-direct-whatsapp-link"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح محادثة واتساب مباشرة ({protocolLinks.normalized.e164Phone})</span>
                    </a>
                  )}

                  {/* Direct SMS Native URI Link */}
                  {protocolLinks.valid && (
                    <a
                      href={protocolLinks.smsUri}
                      onClick={() => handleDispatchMessage(true)}
                      data-testid="msg-direct-sms-link"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>فتح تطبيق الرسائل النصية (SMS)</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={closeQuickSendModal}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDispatchMessage(false)}
                    data-testid="msg-dispatch-gateway-btn"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
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
            <div className="space-y-3" data-testid="msg-history-list">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  سجل الإشعارات والفواتير المرسلة عبر واتساب و SMS ({outboundMessages.length})
                </h3>
                <span className="text-xs text-slate-400">
                  يتم الحفظ الفوري في قاعدة البيانات وسجل المراجعة
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/70">
                    {outboundMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              msg.channel === 'WHATSAPP'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {msg.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-medium">{msg.category}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{msg.recipientName}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400" dir="ltr">
                          {msg.normalizedPhone}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {msg.referenceNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{msg.sentAt}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[11px]">
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
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold"
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
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400">
                    إعدادات الترقيم الدولي وبوابة الـ SMS
                  </h4>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      مفتاح الدولة الافتراضي للأرقام المحلية
                    </label>
                    <select
                      value={messagingGatewayConfig.defaultCountryDialCode}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ defaultCountryDialCode: e.target.value })
                      }
                      data-testid="msg-default-country-select"
                      aria-label="مفتاح الدولة الافتراضي"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="+967">اليمن (+967)</option>
                      <option value="+966">السعودية (+966)</option>
                      <option value="+971">الإمارات (+971)</option>
                      <option value="+20">مصر (+20)</option>
                      <option value="+1">الولايات المتحدة / دولي (+1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      اسم المرسل في الرسائل النصية (SMS Sender ID)
                    </label>
                    <input
                      type="text"
                      value={messagingGatewayConfig.smsSenderId}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ smsSenderId: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      رقم جوال المدير العام لاستقبال التقارير المالية اليومية
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={messagingGatewayConfig.ownerReportPhone}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ ownerReportPhone: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-cyan-400">
                    خيارات تضمين تفاصيل الفاتورة والتوقيع
                  </h4>
                  <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={messagingGatewayConfig.autoIncludeInvoiceItems}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({
                          autoIncludeInvoiceItems: e.target.checked,
                        })
                      }
                      className="rounded border-slate-600 text-emerald-500"
                    />
                    <span>إدراج جدول الأصناف والكميات داخل رسالة الفاتورة تلقائياً</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={messagingGatewayConfig.autoIncludeWarrantyTerms}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({
                          autoIncludeWarrantyTerms: e.target.checked,
                        })
                      }
                      className="rounded border-slate-600 text-emerald-500"
                    />
                    <span>إدراج الرقم التسلسلي (S/N) وفترة الضمان للألواح والبطاريات والإلكترونيات</span>
                  </label>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      التوقيع الرسمي في أسفل رسائل الواتساب والـ SMS
                    </label>
                    <input
                      type="text"
                      value={messagingGatewayConfig.customSignatureAr}
                      onChange={(e) =>
                        updateMessagingGatewayConfig({ customSignatureAr: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
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
