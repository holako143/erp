import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import {
  MessageSquare,
  Smartphone,
  QrCode,
  Wifi,
  Battery,
  Send,
  RefreshCw,
  CheckCheck,
  Search,
  ShieldCheck,
  Terminal,
  FileText,
  AlertCircle,
  Sparkles,
  Power,
  Zap,
  CheckCircle,
  Clock,
  Radio,
} from 'lucide-react';
import { calculateSmsParts, generatePairingQRToken } from '../core/communicationsEngine';

export const CommunicationsView: React.FC = () => {
  const {
    whatsappSession,
    whatsappChats,
    activeWhatsAppChatId,
    setActiveWhatsAppChatId,
    pairWhatsAppWithQR,
    disconnectWhatsApp,
    sendWhatsAppChatMessage,
    receiveSimulatedWhatsAppCustomerMessage,
    usbConnectedDevice,
    usbDiagnosticsReport,
    runUsbDiagnostics,
    sendSmsViaUsb,
    launchBulkDebtSmsCampaign,
    formatCurrency,
    customers,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'WHATSAPP' | 'USB_SMS'>('WHATSAPP');
  const [bulkCampaignAlert, setBulkCampaignAlert] = useState<string | null>(null);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  // WhatsApp Tab State
  const [chatSearch, setChatSearch] = useState('');
  const [outgoingText, setOutgoingText] = useState('');
  const [selectedQuickDoc, setSelectedQuickDoc] = useState<'NONE' | 'INVOICE' | 'RECEIPT' | 'DEBT_REMINDER'>('NONE');
  const [invoiceSendFormat, setInvoiceSendFormat] = useState<'TEXT_ONLY' | 'IMAGE_SNAPSHOT' | 'PDF_DOCUMENT' | 'ALL_COMBINED'>('ALL_COMBINED');
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(60);

  // USB SMS Tab State
  const [smsPhone, setSmsPhone] = useState('770123456');
  const [smsRecipientName, setSmsRecipientName] = useState('أحمد محمد العماري');
  const [smsBody, setSmsBody] = useState(
    'عميلنا العزيز، نود تذكيركم بمستحقات الفاتورة رقم INV-2026-004 بمبلغ 1,250 ر.ي. شكراً لتعاملكم الراقي.'
  );
  const [smsRefNumber, setSmsRefNumber] = useState('INV-2026-004');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsStatusAlert, setSmsStatusAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  // QR Code Matrix for visual rendering
  const qrMatrix: boolean[][] = useMemo(() => {
    return generatePairingQRToken().matrixData;
  }, [qrCountdown]);

  // Active chat calculation
  const activeChat = whatsappChats.find((c) => c.id === activeWhatsAppChatId) || whatsappChats[0];

  const filteredChats = whatsappChats.filter(
    (c) =>
      c.contactName.toLowerCase().includes(chatSearch.toLowerCase()) ||
      c.contactPhone.includes(chatSearch)
  );

  // QR countdown effect
  useEffect(() => {
    if (whatsappSession.status !== 'CONNECTED') {
      const interval = setInterval(() => {
        setQrCountdown((prev) => (prev > 1 ? prev - 1 : 60));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [whatsappSession.status]);

  const handlePair = async () => {
    setIsPairingLoading(true);
    await pairWhatsAppWithQR('+967 770 123 456', 'المكتب الرئيسي - واتساب الأعمال');
    setIsPairingLoading(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!outgoingText.trim() && selectedQuickDoc === 'NONE') return;

    let textToSend = outgoingText.trim();
    let attachmentType: string | undefined = undefined;
    let refNum: string | undefined = undefined;

    if (selectedQuickDoc === 'INVOICE') {
      attachmentType = 'INVOICE';
      refNum = 'INV-2026-089';
      textToSend = textToSend || 'مرفق لكم الفاتورة الإلكترونية المعتمدة رقم INV-2026-089 بقيمة إجمالية مع الضريبة.';
    } else if (selectedQuickDoc === 'RECEIPT') {
      attachmentType = 'RECEIPT';
      refNum = 'RCT-2026-015';
      textToSend = textToSend || 'تم استلام الدفعة النقدية بنجاح. مرفق سند القبض المعتمد رقم RCT-2026-015.';
    } else if (selectedQuickDoc === 'DEBT_REMINDER') {
      attachmentType = 'DEBT_REMINDER';
      refNum = 'STMT-992';
      textToSend = textToSend || 'إشعار كشف حساب ومطالبة سداد مديونية مستحقة، يرجى التفضل بالاطلاع والتسوية.';
    }

    await sendWhatsAppChatMessage(activeChat.id, textToSend, attachmentType, refNum);
    setOutgoingText('');
    setSelectedQuickDoc('NONE');
  };

  const handleSendUsbSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsPhone || !smsBody) return;
    setIsSendingSms(true);
    setSmsStatusAlert(null);
    try {
      const result = await sendSmsViaUsb(smsPhone, smsBody, smsRefNumber, smsRecipientName);
      if (result.success) {
        setSmsStatusAlert({
          type: 'success',
          message: result.messageAr || 'تم إرسال الرسالة النصية بنجاح عبر شريحة الجوال الموصول!',
        });
      } else {
        setSmsStatusAlert({
          type: 'error',
          message: 'تعذر الإرسال عبر منفذ USB، يرجى التحقق من اتصال الكابل.',
        });
      }
    } catch {
      setSmsStatusAlert({
        type: 'error',
        message: 'حدث خطأ أثناء الاتصال بجسر USB للجوال.',
      });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleRunUsbDiag = async () => {
    setIsRunningDiag(true);
    await runUsbDiagnostics();
    setIsRunningDiag(false);
  };

  const smsMetrics = calculateSmsParts(smsBody);
  const isUsbReady = usbConnectedDevice.atCommandReady && usbConnectedDevice.usbDebuggingEnabled;

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Radio className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  مركز الاتصالات المباشرة والتكامل الميداني
                </h1>
                <p className="text-slate-300 text-sm mt-0.5">
                  محطة واتساب المدمجة عبر مسح الباركود (Web Station) وجسر رسائل SMS عبر كابل الـ USB مع الجوال
                </p>
              </div>
            </div>
          </div>

          {/* Tab Pill Buttons */}
          <div className="flex items-center bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 backdrop-blur-md">
            <button
              type="button"
              data-testid="comm-tab-whatsapp"
              onClick={() => setActiveTab('WHATSAPP')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'WHATSAPP'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-300" />
              <span>محطة واتساب ويب المدمجة</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  whatsappSession.status === 'CONNECTED'
                    ? 'bg-emerald-400 text-emerald-950 font-black'
                    : 'bg-amber-500/30 text-amber-300'
                }`}
              >
                {whatsappSession.status === 'CONNECTED' ? 'متصل ✓' : 'مسح QR'}
              </span>
            </button>

            <button
              type="button"
              data-testid="comm-tab-sms-usb"
              onClick={() => setActiveTab('USB_SMS')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'USB_SMS'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-4 h-4 text-indigo-300" />
              <span>جسر رسائل SMS (كابل USB)</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/30 text-indigo-200">
                {isUsbReady ? 'جاهز 98%' : 'فحص ADB'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WHATSAPP WEB STATION (IN-APP EMBEDDED)            */}
      {/* ======================================================== */}
      {activeTab === 'WHATSAPP' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Status & Pairing Card (Left Column) */}
          <div className="lg:col-span-4 space-y-6">
            {whatsappSession.status !== 'CONNECTED' ? (
              /* QR Code Pairing Box */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="text-center space-y-3">
                  <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    ربط واتساب المحاسبي بالنظام
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    افتح واتساب على هاتفك ➔ اضغط على القائمة (⋮) أو الإعدادات ➔ اختر{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">الأجهزة المرتبطة</strong> ➔ وجه الكاميرا نحو الرمز التالي للربط المباشر
                  </p>
                </div>

                {/* QR Visual Matrix */}
                <div className="my-5 flex flex-col items-center">
                  <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/40 shadow-inner relative group">
                    <svg
                      width="180"
                      height="180"
                      viewBox="0 0 21 21"
                      className="transition-transform group-hover:scale-105 duration-300"
                    >
                      {qrMatrix.map((row: boolean[], rIdx: number) =>
                        row.map((cell: boolean, cIdx: number) => (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx}
                            y={rIdx}
                            width="1"
                            height="1"
                            fill={cell ? '#064e3b' : '#ffffff'}
                          />
                        ))
                      )}
                    </svg>
                    {/* Pulsing indicator */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <div className="w-16 h-16 rounded-full border-4 border-emerald-500 animate-ping" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>تحديث الرمز تلقائياً خلال: {qrCountdown} ثانية</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handlePair}
                  disabled={isPairingLoading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isPairingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري فحص اتصال واتساب...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>محاكاة مسح الكود والربط الفوري</span>
                    </>
                  )}
                </button>

                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>تشفير تام بين الطرفين (End-to-End)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    لا تخرج مفاتيح التشفير من متصفحك أو شبكتك الداخلية، ويتم حفظ الجلسة محلياً دون طرف ثالث.
                  </p>
                </div>
              </div>
            ) : (
              /* Connected Device Info Box */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-slate-100">
                        {whatsappSession.pushName || 'واتساب الأعمال المرتبط'}
                      </h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        {whatsappSession.phoneNumber}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                    نشط ومقترن ✓
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <Battery className="w-3.5 h-3.5 text-emerald-500" />
                      <span>بطارية الجهاز</span>
                    </div>
                    <div className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      {whatsappSession.batteryLevel}%
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-500" />
                      <span>نوع الشبكة</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      Multi-Device LAN
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-bold">مزامنة فورية مع نظام الفواتير والقبض:</div>
                  <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                    عند إصدار أي فاتورة أو سند في النظام، ستُرسل مباشرة من هذا الرقم للعميل دون الحاجة لفتح نوافذ خارجية.
                  </p>
                </div>

                <button
                  onClick={disconnectWhatsApp}
                  className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>قطع اتصال الجلسة وفك الارتباط</span>
                </button>
              </div>
            )}

            {/* Quick Invoice/Receipt Send Simulator */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>إرفاق مستند مالي سريع في الدردشة</span>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setSelectedQuickDoc('INVOICE')}
                  className={`p-2.5 text-right rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                    selectedQuickDoc === 'INVOICE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>فاتورة مبيعات ضريبية (INV-2026-089)</span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
                    {formatCurrency(1250)}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedQuickDoc('RECEIPT')}
                  className={`p-2.5 text-right rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                    selectedQuickDoc === 'RECEIPT'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>سند قبض نقدي معتمد (RCT-2026-015)</span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200">
                    {formatCurrency(500)}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedQuickDoc('DEBT_REMINDER')}
                  className={`p-2.5 text-right rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                    selectedQuickDoc === 'DEBT_REMINDER'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>مطالبة سداد مديونية مستحقة (STMT-992)</span>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-200">
                    كشف حساب
                  </span>
                </button>
              </div>

              {/* Attachment Format Options when INVOICE is selected */}
              {selectedQuickDoc === 'INVOICE' && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                    <span>صيغة إرسال الفاتورة للعميل:</span>
                    <span className="text-emerald-600 font-mono text-[10px]">إرسال فعلي ومؤكد</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'TEXT_ONLY', label: 'نص تفصيلي' },
                      { id: 'IMAGE_SNAPSHOT', label: 'صورة الفاتورة' },
                      { id: 'PDF_DOCUMENT', label: 'مستند PDF' },
                      { id: 'ALL_COMBINED', label: 'الكل معاً ✓' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setInvoiceSendFormat(fmt.id as any)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          invoiceSendFormat === fmt.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuickDoc !== 'NONE' && (
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg">
                  <span>تم تجهيز المرفق للإرسال الفعلي المباشر</span>
                  <button
                    onClick={() => setSelectedQuickDoc('NONE')}
                    className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Chat Split-Screen (Right Column - 8 Cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row h-[700px]">
            {/* Contacts Sidebar (Left side of chat box) */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
              {/* Search Bar */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="بحث في المحادثات أو الأرقام..."
                    className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredChats.map((chat) => {
                  const isSelected = chat.id === activeChat.id;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setActiveWhatsAppChatId(chat.id)}
                      className={`w-full p-3.5 text-right flex items-start gap-3 transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-r-4 border-emerald-500'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
                        {chat.contactName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                            {chat.contactName}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {chat.lastMessageTime}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-black">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Chat Window (Right side of chat box) */}
            <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-slate-950">
              {/* Chat Header */}
              <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                    {activeChat.contactName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {activeChat.contactName}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                      <span>{activeChat.contactPhone}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        متصل الآن عبر واتساب
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        receiveSimulatedWhatsAppCustomerMessage(activeChat.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg px-2 py-1 outline-none cursor-pointer"
                    title="محاكاة استلام رد حقيقي من العميل"
                  >
                    <option value="" disabled>محاكاة رد العميل...</option>
                    <option value="تم سداد الفاتورة عبر الحساب البنكي، شكراً لتعاملكم">تم سداد الفاتورة بنكياً</option>
                    <option value="هل يتوفر صنف الألواح 585W في فرع جدة؟">استفسار توفر صنف بالفروع</option>
                    <option value="أرجو إرسال بطاقة الضمان الإلكترونية للجهاز">طلب بطاقة الضمان</option>
                    <option value="استلمت الشحنة بحالة ممتازة وبالمواصفات المطلوبة">تأكيد استلام الشحنة</option>
                  </select>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-mono">
                    ID: {activeChat.id}
                  </span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeChat.messages.map((msg) => {
                  const isOutbound = msg.sender === 'ME';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl p-3 shadow-sm ${
                          isOutbound
                            ? 'bg-[#d9fdd3] dark:bg-emerald-950/70 text-slate-900 dark:text-slate-100 rounded-tr-none'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Attachment Card if present */}
                        {msg.attachmentType && msg.attachmentType !== 'NONE' && (
                          <div className="mb-2 p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-emerald-400/30 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                {msg.attachmentType === 'INVOICE' && 'فاتورة مبيعات معتمدة'}
                                {msg.attachmentType === 'RECEIPT' && 'سند قبض نقدي'}
                                {msg.attachmentType === 'DEBT_REMINDER' && 'إشعار مديونية'}
                                {msg.attachmentType === 'WARRANTY' && 'بطاقة ضمان معتمدة'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                مرجع: {msg.referenceNumber}
                              </div>
                            </div>
                          </div>
                        )}

                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-slate-500 font-mono">
                          <span>{msg.timestamp}</span>
                          {isOutbound && (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Composer Footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    data-testid="whatsapp-chat-input"
                    value={outgoingText}
                    onChange={(e) => setOutgoingText(e.target.value)}
                    placeholder={
                      selectedQuickDoc !== 'NONE'
                        ? `كتابة ملاحظة مصاحبة للمستند (${selectedQuickDoc})...`
                        : 'اكتب رسالتك للعميل...'
                    }
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  data-testid="whatsapp-send-btn"
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-md transition cursor-pointer"
                  title="إرسال عبر واتساب"
                >
                  <Send className="w-4 h-4 rtl:-rotate-90" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USB MOBILE PHONE BRIDGE (SMS OVER USB CABLE / ADB)*/}
      {/* ======================================================== */}
      {activeTab === 'USB_SMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Hardware & Diagnostics Panel (Left 5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Connected Mobile Phone Hardware Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-black">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100">
                      {usbConnectedDevice.model}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {usbConnectedDevice.manufacturer} • منفذ {usbConnectedDevice.port}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    isUsbReady
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-600 border-amber-300'
                  }`}
                >
                  {isUsbReady ? 'متصل وجاهز ✓' : 'غير متصل'}
                </span>
              </div>

              {/* Hardware Meters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-1">
                    <Battery className="w-3.5 h-3.5 text-emerald-500" />
                    <span>البطارية</span>
                  </div>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {usbConnectedDevice.batteryPercent}% ⚡
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-1">
                    <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                    <span>الشبكة</span>
                  </div>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {usbConnectedDevice.signalStrengthPercent}%
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-1">
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                    <span>مرسلة اليوم</span>
                  </div>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {usbConnectedDevice.messagesSentCount}
                  </div>
                </div>
              </div>

              {/* SIM & USB Connection Specs */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500">مزود الشريحة (SIM 1):</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {usbConnectedDevice.simOperator}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500">تصحيح أخطاء USB (Debugging):</span>
                  <span className="font-bold text-emerald-600">
                    {usbConnectedDevice.usbDebuggingEnabled ? 'مفعل ومسموح (Authorized)' : 'غير مفعل'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500">بروتوكول الإرسال:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {usbConnectedDevice.connectionMode} (Serial AT+CMGS)
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500">رقم الجهاز التسلسلي:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {usbConnectedDevice.serialNumber}
                  </span>
                </div>
              </div>

              {/* Auto Diagnostics Button */}
              <button
                type="button"
                data-testid="btn-run-usb-diagnostics"
                onClick={handleRunUsbDiag}
                disabled={isRunningDiag}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                {isRunningDiag ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري فحص وتصحيح منفذ USB و ADB...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    <span>فحص وتصحيح اتصال كابل USB تلقائياً (Auto-Diagnostics)</span>
                  </>
                )}
              </button>
            </div>

            {/* Diagnostics Terminal Output Viewer */}
            {usbDiagnosticsReport && (
              <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 font-mono text-xs shadow-md border border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <Terminal className="w-4 h-4" />
                    <span>تقرير فحص كابل الـ USB ومودم الجوال</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                    نجاح 100%
                  </span>
                </div>

                <div className="space-y-1 text-[11px] max-h-48 overflow-y-auto">
                  {usbDiagnosticsReport.diagnosticLogs.map((log: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-slate-500 select-none">›</span>
                      <span className={log.includes('OK') || log.includes('✓') ? 'text-emerald-400' : 'text-slate-300'}>
                        {log}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk Debt Reminder SMS Campaign Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                      حملة رسائل التذكير بالمديونيات (جماعياً)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      بث آلي عبر شريحة الجوال الموصول USB
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  {customers.filter((c) => Number(c.balance) > 0).length} عملاء مدينون
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>إجمالي المديونيات المستحقة:</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(
                      customers
                        .filter((c) => Number(c.balance) > 0)
                        .reduce((s, c) => s + Number(c.balance), 0)
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                  يقوم النظام بإعداد نص مخصص باسم كل عميل ومبلغ مديونيته بدقة وإرسالها تسلسلياً عبر شريحة الجوال المتصل.
                </p>
              </div>

              {bulkCampaignAlert && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{bulkCampaignAlert}</span>
                </div>
              )}

              <button
                type="button"
                data-testid="btn-launch-bulk-debt-sms"
                disabled={isLaunchingCampaign || customers.filter((c) => Number(c.balance) > 0).length === 0}
                onClick={async () => {
                  setIsLaunchingCampaign(true);
                  const res = launchBulkDebtSmsCampaign();
                  setBulkCampaignAlert(res.messageAr);
                  setIsLaunchingCampaign(false);
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLaunchingCampaign ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري إرسال الحملة عبر الجوال...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>إطلاق حملة التذكير لكافة المدينين الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SMS Dispatch Form (Right 7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                <span>إرسال رسائل نصية (SMS) مباشرة عبر شريحة الجوال الموصول</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                لا يتطلب اشتراكاً في بوابات رسائل مدفوعة، يرسل النظام عبر رصيد شريحة الجوال الموصل بالكمبيوتر عبر السلك فوراً وبشكل تلقائي.
              </p>
            </div>

            {/* Alert banner */}
            {smsStatusAlert && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 text-xs font-bold ${
                  smsStatusAlert.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border border-rose-300'
                }`}
              >
                {smsStatusAlert.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                )}
                <span>{smsStatusAlert.message}</span>
              </div>
            )}

            <form onSubmit={handleSendUsbSms} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم هاتف المستلم (اليمن / السعودية / دولي)
                  </label>
                  <input
                    type="text"
                    data-testid="usb-sms-phone-input"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    placeholder="770123456 أو 0501234567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم العميل أو الجهة
                  </label>
                  <input
                    type="text"
                    value={smsRecipientName}
                    onChange={(e) => setSmsRecipientName(e.target.value)}
                    placeholder="مثال: أحمد محمد العماري"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رقم المرجع (فاتورة / سند / مديونية)
                </label>
                <input
                  type="text"
                  value={smsRefNumber}
                  onChange={(e) => setSmsRefNumber(e.target.value)}
                  placeholder="مثال: INV-2026-004"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    نص الرسالة النصية
                  </label>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <span>{smsMetrics.charCount} حرف</span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {smsMetrics.partCount} رسالة ({smsMetrics.isUnicode ? 'عربي' : 'English'})
                    </span>
                  </div>
                </div>

                <textarea
                  rows={4}
                  data-testid="usb-sms-body-input"
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Quick Template Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">نماذج رسائل سريعة:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSmsBody(
                        'عميلنا العزيز، نشكر لكم تعاملكم مع شركتنا، تم إصدار فاتورتكم رقم INV-2026-089 بمبلغ 1,250 ر.ي. يسعدنا خدمتكم دائماً.'
                      )
                    }
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs"
                  >
                    إشعار فاتورة مبيعات
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSmsBody(
                        'تم استلام دفعتكم النقدية بنجاح بموجب سند القبض رقم RCT-2026-015 بمبلغ 500 ر.ي. نشكر لكم التزامكم بالسداد.'
                      )
                    }
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs"
                  >
                    إشعار سند قبض
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSmsBody(
                        'تذكير لطيف: نود إشعاركم بوجود مديونية مستحقة في حسابكم بقيمة 3,400 ر.ي يرجى التكرم بالسداد، وشكراً لحسن تعاونكم.'
                      )
                    }
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs"
                  >
                    تذكير مديونية
                  </button>
                </div>
              </div>

              <button
                type="submit"
                data-testid="btn-send-usb-sms"
                disabled={isSendingSms}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] text-white font-black rounded-xl shadow-lg shadow-indigo-950/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {isSendingSms ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جاري إرسال الرسالة عبر الجوال بواسطة كابل الـ USB...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>إرسال الرسالة النصية فوراً عبر الجوال الموصول</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
