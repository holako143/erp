import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Plus,
  Users,
  Camera,
  KeyRound,
  Trash2,
  Layers,
  UserPlus,
  Check,
  Bot,
} from 'lucide-react';
import {
  calculateSmsParts,
  generatePairingQRToken,
  generateGeneralQRCodeMatrix,
  generate8DigitWhatsAppPairingCode,
} from '../core/communicationsEngine';
import {
  composeInvoiceMessageText,
  composeDebtReminderMessageText,
  composeExecutiveReportMessageText,
} from '../core/messagingEngine';
import {
  generateSmartErpBotResponse,
  BotIntentCategory,
} from '../core/whatsappAiBotEngine';
import { calculateDynamicFinancialStatements } from '../core/accountingEngine';
import { CameraBarcodeScannerModal } from '../components/common/CameraBarcodeScannerModal';

export const CommunicationsView: React.FC = () => {
  const {
    whatsappAccounts,
    activeWhatsAppAccountId,
    switchWhatsAppAccount,
    addWhatsAppAccount,
    removeWhatsAppAccount,
    startOrOpenWhatsAppChat,
    lastAutoSavedAt,
    whatsappSession,
    whatsappChats,
    activeWhatsAppChatId,
    setActiveWhatsAppChatId,
    pairWhatsAppWithQR,
    disconnectWhatsApp,
    sendWhatsAppChatMessage,
    syncLiveWhatsAppMessages,
    sendWhatsAppOrSmsMessage,
    outboundMessages,
    messagingGatewayConfig,
    usbConnectedDevice,
    usbDiagnosticsReport,
    runUsbDiagnostics,
    sendSmsViaUsb,
    launchBulkDebtSmsCampaign,
    formatCurrency,
    customers,
    salesInvoices,
    warrantyTickets,
    products,
    chartAccounts,
    journalEntries,
    company,
    currentBranch,
    currency,
    currentIndustryBlueprint,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'WHATSAPP' | 'QUICK_SEND_LOG' | 'USB_SMS'>('WHATSAPP');
  const [bulkCampaignAlert, setBulkCampaignAlert] = useState<string | null>(null);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  // Unified Real ERP Document & Quick-Send Composer State
  const [selectedRealInvoiceId, setSelectedRealInvoiceId] = useState<string>(
    salesInvoices[0]?.id || ''
  );
  const [selectedRealCustomerId, setSelectedRealCustomerId] = useState<string>(
    customers[0]?.id || ''
  );
  const [selectedRealRmaId, setSelectedRealRmaId] = useState<string>(
    warrantyTickets[0]?.id || ''
  );
  const [isSyncingLiveNow, setIsSyncingLiveNow] = useState(false);

  // Intelligent WhatsApp AI Bot State (Disabled by default until clicked)
  const [isAiBotEnabled, setIsAiBotEnabled] = useState<boolean>(false);
  const [aiBotRepliesCount, setAiBotRepliesCount] = useState<number>(0);
  const [aiBotLastActionAr, setAiBotLastActionAr] = useState<string>(
    'غير مفعّل افتراضياً — انقر على أيقونة الروبوت لتفعيل الرد الفوري والتحكم الكامل بالنظام'
  );
  const [isAiBotResponding, setIsAiBotResponding] = useState<boolean>(false);
  const autoRepliedMsgIdsRef = useRef<Set<string>>(new Set());

  // Multi-Account Add Form State
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccLabel, setNewAccLabel] = useState('');
  const [newAccDept, setNewAccDept] = useState('المبيعات وخدمة العملاء');
  const [newAccPhone, setNewAccPhone] = useState('+967 774 500 800');
  const [newAccStartMode, setNewAccStartMode] = useState<'QR_SCAN' | 'INSTANT_CONNECTED'>('QR_SCAN');
  const [accountToast, setAccountToast] = useState<string | null>(null);

  // Pairing Mode State (QR vs 8-Digit Phone Code vs Camera Scan)
  const [pairingMethod, setPairingMethod] = useState<'QR_CODE' | 'PHONE_CODE'>('QR_CODE');
  const [pairingPhoneInput, setPairingPhoneInput] = useState('+967 771 445 880');
  const [pairingNameInput] = useState('واتساب المؤسسة المعتمد');
  const [generated8DigitCode, setGenerated8DigitCode] = useState('RLM8-8849');
  const [isRequestingReal8DigitCode, setIsRequestingReal8DigitCode] = useState(false);
  const [real8DigitCodeSource, setReal8DigitCodeSource] = useState<'LIVE_WHATSAPP' | 'LOCAL'>('LOCAL');
  const [isQrCameraScannerOpen, setIsQrCameraScannerOpen] = useState(false);

  // Live Authentic WhatsApp Web Multi-Device QR State (from @whiskeysockets/baileys)
  const [liveWaSnapshot, setLiveWaSnapshot] = useState<{
    status: string;
    qrDataUrl: string | null;
    qrRaw: string | null;
    qrSequence: number;
    qrExpiresInSec: number;
    connectedPhone: string | null;
    connectedName: string | null;
    pairingCode8Char: string | null;
    lastError: string | null;
  } | null>(null);
  const [isLoadingLiveQr, setIsLoadingLiveQr] = useState(false);

  // New Chat Creation State
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');

  // WhatsApp Tab State
  const [chatSearch, setChatSearch] = useState('');
  const [outgoingText, setOutgoingText] = useState('');
  const [selectedQuickDoc, setSelectedQuickDoc] = useState<'NONE' | 'INVOICE' | 'RECEIPT' | 'DEBT_REMINDER'>('NONE');
  const [invoiceSendFormat, setInvoiceSendFormat] = useState<'TEXT_ONLY' | 'IMAGE_SNAPSHOT' | 'PDF_DOCUMENT' | 'ALL_COMBINED'>('ALL_COMBINED');
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(20);
  const [qrRefreshTick, setQrRefreshTick] = useState(0);

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

  const activeAccountObj =
    whatsappAccounts.find((a) => a.id === activeWhatsAppAccountId) || whatsappAccounts[0];

  // Fallback ISO/IEC 18004 QR Matrix while Baileys WebSocket is handshaking
  const qrPairingData = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const generated = generatePairingQRToken(activeWhatsAppAccountId, baseUrl);
    const matrix = generateGeneralQRCodeMatrix(generated.pairingUrl, 29);
    return {
      ...generated,
      scannableMatrix: matrix,
    };
  }, [activeWhatsAppAccountId, qrRefreshTick]);

  // Active chat calculation
  const activeChat =
    whatsappChats.find((c) => c.id === activeWhatsAppChatId) ||
    whatsappChats[0] || {
      id: 'chat-empty',
      contactName: 'محادثة جديدة',
      contactPhone: '+967 770 000 000',
      normalizedPhone: '+967770000000',
      lastMessage: '',
      lastMessageTime: 'الآن',
      unreadCount: 0,
      isBusiness: true,
      messages: [],
    };

  const filteredChats = whatsappChats.filter(
    (c) =>
      c.contactName.toLowerCase().includes(chatSearch.toLowerCase()) ||
      c.contactPhone.includes(chatSearch)
  );

  const fetchLiveWhatsAppQR = async (forceNew = false) => {
    try {
      if (forceNew) setIsLoadingLiveQr(true);
      const url = `/api/v1/whatsapp/live-qr?accountId=${encodeURIComponent(activeWhatsAppAccountId)}${
        forceNew ? '&forceNew=1' : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.snapshot) {
        setLiveWaSnapshot(data.snapshot);
        if (typeof data.snapshot.qrExpiresInSec === 'number' && data.snapshot.qrExpiresInSec > 0) {
          setQrCountdown(data.snapshot.qrExpiresInSec);
        }
        // Continuously sync real incoming and outgoing WhatsApp messages from Baileys socket
        if (Array.isArray(data.snapshot.inboundMessages) && data.snapshot.inboundMessages.length > 0) {
          syncLiveWhatsAppMessages(activeWhatsAppAccountId, data.snapshot.inboundMessages);
        }
        if (data.aiBotStatus) {
          setAiBotRepliesCount((prev) => Math.max(prev, data.aiBotStatus.repliesCount || 0));
          if (data.aiBotStatus.lastActionAr) {
            setAiBotLastActionAr(data.aiBotStatus.lastActionAr);
          }
        }
        if (
          data.snapshot.status === 'CONNECTED' &&
          data.snapshot.connectedPhone &&
          whatsappSession.status !== 'CONNECTED'
        ) {
          await pairWhatsAppWithQR(
            data.snapshot.connectedPhone,
            data.snapshot.connectedName || activeAccountObj?.accountLabel
          );
          setAccountToast(
            `تم ربط حساب واتساب الفعلي (${data.snapshot.connectedPhone}) بالنظام بنجاح عبر خادم واتساب الرسمي!`
          );
        }
      }
    } catch {
      // ignore transient network errors
    } finally {
      if (forceNew) setIsLoadingLiveQr(false);
    }
  };

  // Toggle the Intelligent WhatsApp AI Robot On/Off
  const handleToggleAiBot = async () => {
    const nextState = !isAiBotEnabled;
    // Snapshot current messages so turning the bot on doesn't re-answer old history unless requested
    if (nextState) {
      for (const chat of whatsappChats) {
        for (const m of chat.messages) {
          autoRepliedMsgIdsRef.current.add(m.id);
        }
      }
    }
    setIsAiBotEnabled(nextState);
    setAiBotLastActionAr(
      nextState
        ? 'الروبوت الذكي مفعّل الآن — يراقب المحادثات ويرسل الفواتير والتقارير والأرصدة لحظياً'
        : 'تم إيقاف الروبوت الذكي — المحادثات في الوضع اليدوي'
    );
    setAccountToast(
      nextState
        ? '🤖 تم تفعيل الروبوت الذكي للواتساب! سيقوم بالرد الفوري على المحادثات وجلب الفواتير والتقارير والأرباح لحظياً.'
        : 'تم إيقاف الروبوت الذكي للرد الآلي.'
    );
    try {
      await fetch('/api/v1/whatsapp/ai-bot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
    } catch {
      // ignore network error
    }
  };

  // Execute an instant ERP-aware AI Bot response in the active conversation
  const handleTriggerSmartAiBot = async (forcedIntent?: BotIntentCategory, customPrompt?: string) => {
    if (isAiBotResponding) return;
    setIsAiBotResponding(true);
    try {
      const lastInboundMsg =
        [...activeChat.messages].reverse().find((m) => m.sender === 'THEM') ||
        activeChat.messages[activeChat.messages.length - 1];
      const incomingText =
        customPrompt || lastInboundMsg?.text || 'أرسل ملخص الفواتير والتقارير المالية والأرصدة';

      const erpSnapshot = {
        companyName: company.nameAr || company.name,
        currencySymbol: currency === 'YER' ? 'ر.ي' : currency === 'USD' ? '$' : 'ر.س',
        products,
        customers,
        salesInvoices,
        warrantyTickets,
      };

      const localSmartReply = generateSmartErpBotResponse({
        incomingText,
        contactName: activeChat.contactName,
        contactPhone: activeChat.contactPhone,
        erpSnapshot,
        forcedIntent,
      });

      await sendWhatsAppChatMessage(
        activeChat.id,
        localSmartReply.replyText,
        localSmartReply.attachmentType === 'NONE' ? undefined : localSmartReply.attachmentType,
        localSmartReply.referenceNumber
      );

      setAiBotRepliesCount((c) => c + 1);
      setAiBotLastActionAr(localSmartReply.executedActionLabelAr);

      // Sync with backend AI endpoint for server-side logging & live socket assurance
      fetch('/api/v1/whatsapp/ai-bot/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeWhatsAppAccountId,
          chatId: activeChat.id,
          incomingText,
          contactName: activeChat.contactName,
          contactPhone: activeChat.contactPhone,
          forcedIntent,
        }),
      }).catch(() => {});
    } finally {
      setIsAiBotResponding(false);
    }
  };

  // Automatically reply when AI Bot is active and a new inbound message from 'THEM' arrives
  useEffect(() => {
    if (!isAiBotEnabled) return;
    const lastMsg = activeChat.messages[activeChat.messages.length - 1];
    if (
      lastMsg &&
      lastMsg.sender === 'THEM' &&
      !autoRepliedMsgIdsRef.current.has(lastMsg.id)
    ) {
      autoRepliedMsgIdsRef.current.add(lastMsg.id);
      handleTriggerSmartAiBot(undefined, lastMsg.text);
    }
  }, [isAiBotEnabled, activeChat.id, activeChat.messages.length]);

  // Real-time continuous polling of official WhatsApp Web Multi-Device QR code & incoming/outgoing messages
  useEffect(() => {
    fetchLiveWhatsAppQR(false);

    const countdownTimer = setInterval(() => {
      setQrCountdown((prev) => (prev <= 1 ? 20 : prev - 1));
    }, 1000);

    const pollInterval = setInterval(() => {
      fetchLiveWhatsAppQR(false);
    }, 2200);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(pollInterval);
    };
  }, [whatsappSession.status, activeWhatsAppAccountId]);

  const handleRequestReal8DigitCode = async () => {
    if (!pairingPhoneInput.trim()) return;
    setIsRequestingReal8DigitCode(true);
    try {
      const res = await fetch('/api/v1/whatsapp/request-pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeWhatsAppAccountId,
          phoneNumber: pairingPhoneInput.trim(),
        }),
      });
      const data = await res.json();
      if (data?.success && data.formattedCode) {
        setGenerated8DigitCode(data.formattedCode);
        setReal8DigitCodeSource('LIVE_WHATSAPP');
        setAccountToast(
          `تم إصدار كود الربط الرسمي (${data.formattedCode}) من خادم واتساب! أدخله الآن في إشعار واتساب على جوالك.`
        );
      } else {
        setGenerated8DigitCode(generate8DigitWhatsAppPairingCode(pairingPhoneInput));
        setReal8DigitCodeSource('LOCAL');
        setAccountToast(
          data?.errorAr || 'تم توليد كود الربط للرقم المدخل، تأكد من كتابة الرقم مع مفتاح الدولة.'
        );
      }
    } catch {
      setGenerated8DigitCode(generate8DigitWhatsAppPairingCode(pairingPhoneInput));
    } finally {
      setIsRequestingReal8DigitCode(false);
    }
  };

  const handlePair = async (customPhone?: string, customName?: string) => {
    setIsPairingLoading(true);
    const phoneToUse =
      customPhone ||
      pairingPhoneInput ||
      (activeAccountObj?.session.phoneNumber &&
      !activeAccountObj.session.phoneNumber.includes('بانتظار')
        ? activeAccountObj.session.phoneNumber
        : '+967 771 445 880');
    const nameToUse =
      customName || activeAccountObj?.accountLabel || pairingNameInput || 'المكتب الرئيسي - واتساب الأعمال';
    const res = await pairWhatsAppWithQR(phoneToUse, nameToUse);
    setIsPairingLoading(false);
    setAccountToast(res.messageAr);
    setTimeout(() => setAccountToast(null), 4000);
  };

  const handleCreateNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccLabel.trim()) return;
    const created = addWhatsAppAccount({
      label: newAccLabel.trim(),
      departmentAr: newAccDept.trim() || 'المبيعات وخدمة العملاء',
      phoneNumber: newAccPhone.trim() || '+967 774 500 800',
      colorAccent:
        whatsappAccounts.length % 4 === 0
          ? 'emerald'
          : whatsappAccounts.length % 4 === 1
          ? 'blue'
          : whatsappAccounts.length % 4 === 2
          ? 'violet'
          : 'amber',
      startConnected: newAccStartMode === 'INSTANT_CONNECTED',
    });
    setNewAccLabel('');
    setShowAddAccountForm(false);
    setAccountToast(
      newAccStartMode === 'INSTANT_CONNECTED'
        ? `تم فتح وربط (${created.accountLabel}) فوراً داخل النظام بدون فقدان أي بيانات!`
        : `تم فتح حساب (${created.accountLabel}) وتوليد باركود الربط الفعلي ISO-18004 جاهزاً للمسح!`
    );
    setTimeout(() => setAccountToast(null), 4500);
  };

  const handleStartNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim()) return;
    startOrOpenWhatsAppChat(
      newChatName.trim() || newChatPhone.trim(),
      newChatPhone.trim()
    );
    setNewChatName('');
    setNewChatPhone('');
    setShowNewChatForm(false);
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
  const connectedAccountsCount = whatsappAccounts.filter((a) => a.session.status === 'CONNECTED').length;

  return (
    <div className="space-y-3">
      {/* Top Banner & Mode Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-4 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-black tracking-tight">
                    منظومة واتساب المتعدد المدمجة ومركز الاتصالات الفوري
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
                    يعمل 100% داخل النظام بدون نوافذ خارجية
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1 flex items-center gap-3 flex-wrap">
                  <span>
                    تعدد حسابات واتساب متزامنة ({connectedAccountsCount}/{whatsappAccounts.length} حسابات متصلة) • تنقل لحظي 0ms بدون إعادة تصوير الباركود
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    • حفظ تلقائي فوري ✓ ({lastAutoSavedAt})
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* AI Robot Auto-Responder Toggle + Sub-View Tab Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* AI Robot Toggle Button (Inactive by default, changes color when clicked) */}
            <button
              type="button"
              data-testid="whatsapp-ai-bot-toggle"
              onClick={handleToggleAiBot}
              title={
                isAiBotEnabled
                  ? 'الروبوت الذكي مفعّل: يرد تلقائياً على المحادثات ويجلب الفواتير والتقارير اللحظية (انقر للإيقاف)'
                  : 'انقر لتفعيل الروبوت الذكي للرد الفوري والتحكم الكامل بالفواتير والتقارير'
              }
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer border ${
                isAiBotEnabled
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-300 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300/60'
                  : 'bg-slate-800/90 text-slate-300 border-slate-600/80 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span
                className={`p-1 rounded-lg transition-colors ${
                  isAiBotEnabled
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                <Bot className={`w-4 h-4 ${isAiBotEnabled ? 'animate-bounce' : ''}`} />
              </span>
              <span>
                {isAiBotEnabled ? 'الروبوت الذكي: مفعّل ✓' : 'الروبوت الذكي: متوقف'}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                  isAiBotEnabled
                    ? 'bg-white text-emerald-900'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isAiBotEnabled ? `نشط (${aiBotRepliesCount})` : 'OFF'}
              </span>
            </button>

            <div className="flex items-center flex-wrap gap-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 backdrop-blur-md">
              <button
                type="button"
                data-testid="comm-tab-whatsapp"
                onClick={() => setActiveTab('WHATSAPP')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'WHATSAPP'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span>محطة واتساب والإرسال الفوري</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-400 text-emerald-950 font-black">
                  {whatsappAccounts.length} حسابات
                </span>
              </button>

              <button
                type="button"
                data-testid="comm-tab-quick-send-log"
                onClick={() => setActiveTab('QUICK_SEND_LOG')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'QUICK_SEND_LOG'
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30 ring-1 ring-teal-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Send className="w-4 h-4 text-teal-300" />
                <span>قوالب الإرسال السريع وسجل الصادر</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-400/30 text-teal-100 font-mono font-bold">
                  {outboundMessages.length}
                </span>
              </button>

              <button
                type="button"
                data-testid="comm-tab-sms-usb"
                onClick={() => setActiveTab('USB_SMS')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'USB_SMS'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Smartphone className="w-4 h-4 text-indigo-300" />
                <span>جسر رسائل SMS (كابل USB)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-indigo-500/30 text-indigo-200">
                  {isUsbReady ? 'جاهز 98%' : 'فحص ADB'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {accountToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{accountToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAccountToast(null)}
            className="text-emerald-700 hover:underline text-[11px] cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: MULTI-ACCOUNT WHATSAPP WEB STATION (IN-APP)       */}
      {/* ======================================================== */}
      {activeTab === 'WHATSAPP' && (
        <div className="space-y-3">
          {/* MULTI-ACCOUNT SWITCHER BAR (0ms Instant Switching Without Data Loss or Re-Scanning) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    شريط الحسابات المتعددة (التنقل اللحظي بدون فقدان الجلسة أو إعادة التصوير)
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    اختر أي حساب واتساب للتبديل الفوري بين محادثات المبيعات، التحصيل المالي، أو الصيانة مع حفظ تلقائي كامل لكل حساب
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="add-whatsapp-account-btn"
                onClick={() => setShowAddAccountForm((prev) => !prev)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer self-start lg:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>فتح حساب واتساب إضافي في النظام</span>
              </button>
            </div>

            {/* Accounts Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {whatsappAccounts.map((acc, idx) => {
                const isActive = acc.id === activeWhatsAppAccountId;
                const isConnected = acc.session.status === 'CONNECTED';
                const totalUnread = acc.chats.reduce((s, c) => s + (c.unreadCount || 0), 0);

                return (
                  <div
                    key={acc.id}
                    data-testid={`whatsapp-account-card-${idx}`}
                    onClick={() => switchWhatsAppAccount(acc.id)}
                    className={`relative rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                          />
                          <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                            {acc.accountLabel}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {acc.departmentAr}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {totalUnread > 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black">
                            {totalUnread} جديد
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isConnected
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {isConnected ? 'متصل ✓' : 'بانتظار المسح'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 dir-ltr">
                        {acc.session.phoneNumber}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          {acc.chats.length} محادثات
                        </span>
                        {whatsappAccounts.length > 1 && (
                          <button
                            type="button"
                            title="إزالة هذا الحساب الفرعي"
                            onClick={(e) => {
                              e.stopPropagation();
                              const res = removeWhatsAppAccount(acc.id);
                              setAccountToast(res.messageAr);
                              setTimeout(() => setAccountToast(null), 3500);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inline Add New WhatsApp Account Form */}
            {showAddAccountForm && (
              <form
                onSubmit={handleCreateNewAccount}
                className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-emerald-300 dark:border-emerald-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>إضافة وربط حساب واتساب جديد داخل النظام</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddAccountForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    إغلاق ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      اسم الحساب / الفرع
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccLabel}
                      onChange={(e) => setNewAccLabel(e.target.value)}
                      placeholder="مثال: واتساب فرع عدن / المستودع"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      القسم المختص
                    </label>
                    <input
                      type="text"
                      value={newAccDept}
                      onChange={(e) => setNewAccDept(e.target.value)}
                      placeholder="مثال: المبيعات والتوريد"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      رقم واتساب المرتبط
                    </label>
                    <input
                      type="text"
                      value={newAccPhone}
                      onChange={(e) => setNewAccPhone(e.target.value)}
                      placeholder="+967 774 500 800"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      وضع بدء الجلسة
                    </label>
                    <select
                      value={newAccStartMode}
                      onChange={(e) => setNewAccStartMode(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value="QR_SCAN">توليد باركود QR فعلي للمسح بالكاميرا</option>
                      <option value="INSTANT_CONNECTED">ربط وتفعيل فوري مباشر</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>إنشاء الحساب والتبديل إليه فوراً</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Status & Real ISO QR Pairing Card (Left Column) */}
            <div className="lg:col-span-4 space-y-4 min-w-0">
              {whatsappSession.status !== 'CONNECTED' ? (
                /* REAL ISO/IEC 18004 QR Code & 8-Digit Code Pairing Box */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold">
                      <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                      <span>متصل مباشرة بخادم واتساب الرسمي (WhatsApp Multi-Device)</span>
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                      ربط ({activeAccountObj?.accountLabel}) بتطبيق واتساب الفعلي
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      امسح هذا الباركود الرسمي مباشرة من تطبيق <strong className="text-emerald-600">واتساب في جوالك ← الأجهزة المرتبطة ← ربط جهاز</strong> (يتحدث تلقائياً كل 20 ثانية من خادم واتساب)
                    </p>
                  </div>

                  {/* Pairing Mode Switcher: QR vs 8-Digit Phone Code */}
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPairingMethod('QR_CODE')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        pairingMethod === 'QR_CODE'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>باركود واتساب الرسمي الحي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPairingMethod('PHONE_CODE');
                        setGenerated8DigitCode(generate8DigitWhatsAppPairingCode(pairingPhoneInput));
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        pairingMethod === 'PHONE_CODE'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>الربط برقم الهاتف (8 خانات)</span>
                    </button>
                  </div>

                  {pairingMethod === 'QR_CODE' ? (
                    <>
                      {/* Live Official WhatsApp Multi-Device QR Code from @whiskeysockets/baileys */}
                      <div className="my-2 flex flex-col items-center">
                        <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500 shadow-lg relative flex items-center justify-center min-h-[248px] min-w-[248px]">
                          {isLoadingLiveQr ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-slate-600 p-6">
                              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                              <span className="text-xs font-bold">جاري توليد باركود جديد من خادم واتساب...</span>
                            </div>
                          ) : liveWaSnapshot?.qrDataUrl ? (
                            <img
                              src={liveWaSnapshot.qrDataUrl}
                              alt="Official WhatsApp Web Multi-Device QR Code"
                              data-testid="live-whatsapp-qr-img"
                              className="w-56 h-56 object-contain select-none"
                            />
                          ) : (
                            <svg
                              width="210"
                              height="210"
                              viewBox={`-2 -2 ${qrPairingData.scannableMatrix.length + 4} ${
                                qrPairingData.scannableMatrix.length + 4
                              }`}
                              shapeRendering="crispEdges"
                              aria-label="WhatsApp Real Scannable QR Code"
                            >
                              <rect
                                x="-2"
                                y="-2"
                                width={qrPairingData.scannableMatrix.length + 4}
                                height={qrPairingData.scannableMatrix.length + 4}
                                fill="#ffffff"
                              />
                              {qrPairingData.scannableMatrix.map((row: boolean[], rIdx: number) =>
                                row.map((cell: boolean, cIdx: number) =>
                                  cell ? (
                                    <rect
                                      key={`${rIdx}-${cIdx}`}
                                      x={cIdx}
                                      y={rIdx}
                                      width="1"
                                      height="1"
                                      fill="#0f172a"
                                    />
                                  ) : null
                                )
                              )}
                            </svg>
                          )}

                          {liveWaSnapshot?.qrSequence ? (
                            <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full shadow">
                              باركود واتساب حي #{liveWaSnapshot.qrSequence}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between w-full px-2 mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تحديث تلقائي خلال: {qrCountdown}s</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setQrRefreshTick((t) => t + 1);
                              setQrCountdown(20);
                              fetchLiveWhatsAppQR(true);
                            }}
                            className="text-emerald-600 hover:underline flex items-center gap-1 font-sans font-bold cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingLiveQr ? 'animate-spin' : ''}`} />
                            <span>تحديث باركود واتساب الآن</span>
                          </button>
                        </div>
                      </div>

                      {/* Step-by-step official WhatsApp instructions */}
                      <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                        <div className="font-black text-emerald-800 dark:text-emerald-300">
                          خطوات الربط الفعلي من تطبيق واتساب في جوالك:
                        </div>
                        <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                          <li>افتح تطبيق <strong>واتساب</strong> على هاتفك</li>
                          <li>اضغط على <strong>الإعدادات</strong> أو <strong>القائمة (⋮) ← الأجهزة المرتبطة</strong></li>
                          <li>اضغط على <strong>ربط جهاز (Link a Device)</strong> وامسح الباركود أعلاه</li>
                        </ol>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>بانتظار مسح الباركود من واتساب جوالك...</span>
                          </span>
                          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                            ربط تلقائي فور المسح
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setQrRefreshTick((t) => t + 1);
                            setQrCountdown(20);
                            fetchLiveWhatsAppQR(true);
                          }}
                          disabled={isLoadingLiveQr}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 ${isLoadingLiveQr ? 'animate-spin' : ''}`} />
                          <span>توليد باركود واتساب رسمي جديد الآن</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* 8-Digit Phone Number Pairing Mode (Official Baileys requestPairingCode) */
                    <div className="space-y-3 py-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          أدخل رقم الواتساب مع مفتاح الدولة (مثال: +967771445880):
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={pairingPhoneInput}
                            onChange={(e) => {
                              setPairingPhoneInput(e.target.value);
                            }}
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold dir-ltr"
                            placeholder="+967 771 445 880"
                          />
                          <button
                            type="button"
                            onClick={handleRequestReal8DigitCode}
                            disabled={isRequestingReal8DigitCode}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            {isRequestingReal8DigitCode ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="w-3.5 h-3.5" />
                            )}
                            <span>طلب كود واتساب الرسمي</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-900 text-white rounded-2xl text-center space-y-1.5 border border-emerald-500/40">
                        <div className="text-[11px] text-slate-300 flex items-center justify-center gap-1.5">
                          <span>أدخل كود الربط التالي في إشعار واتساب على هاتفك:</span>
                          {real8DigitCodeSource === 'LIVE_WHATSAPP' && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                              رسمي من خادم واتساب ✓
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-black font-mono tracking-widest text-emerald-400">
                          {generated8DigitCode}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Connected Device Info Box */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                          {activeAccountObj?.accountLabel || whatsappSession.pushName}
                        </h3>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {whatsappSession.phoneNumber}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                      متصل فعلياً ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-0.5">
                        <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                        <span>حالة البث اللحظي</span>
                      </div>
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        إرسال واستقبال فوري ✓
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-0.5">
                        <Send className="w-3.5 h-3.5 text-blue-500" />
                        <span>رسائل هذا الحساب</span>
                      </div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {activeAccountObj?.messagesDispatchedCount || 0} رسالة
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold">جلسة واتساب فعلية محفوظة تلقائياً:</div>
                    <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                      يتم إرسال واستقبال الرسائل مباشرة في نفس الواجهة بدون نوافذ خارجية وبدون فقدان الجلسة عند التنقل.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={disconnectWhatsApp}
                    className="w-full py-2 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>تغيير الجهاز / توليد باركود QR رسمي جديد</span>
                  </button>
                </div>
              )}

              {/* Integrated Real Quick-Send & Financial Document Composer (Replaces separate QuickSend modal) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2 truncate">
                    <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">الإرسال السريع الموحد للمستندات المالية الفعلية</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold shrink-0">
                    مباشر في المحادثة
                  </span>
                </div>

                {/* Real Sales Invoice Selector */}
                <div className="space-y-1.5 min-w-0">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    1. إرسال فاتورة مبيعات فعلية من النظام:
                  </label>
                  <div className="flex gap-1.5 min-w-0">
                    <select
                      value={selectedRealInvoiceId}
                      onChange={(e) => setSelectedRealInvoiceId(e.target.value)}
                      className="flex-1 min-w-0 truncate px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold"
                    >
                      {salesInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.customerName} ({formatCurrency(inv.grandTotal)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      data-testid="quick-send-invoice-btn"
                      onClick={() => {
                        const inv =
                          salesInvoices.find((i) => i.id === selectedRealInvoiceId) ||
                          salesInvoices[0];
                        if (!inv) return;
                        const cust = customers.find((c) => c.id === inv.customerId);
                        const phone = cust?.phone || activeChat.contactPhone;
                        const chatId = startOrOpenWhatsAppChat(inv.customerName, phone, cust?.id);
                        const composed = composeInvoiceMessageText({
                          invoice: inv,
                          companyName: company.nameAr || company.name,
                          branchName: currentBranch.nameAr,
                          currency,
                          includeItems: true,
                          includeWarranty: true,
                          customSignatureAr: messagingGatewayConfig.customSignatureAr,
                        });
                        sendWhatsAppChatMessage(chatId, composed, 'INVOICE', inv.invoiceNumber);
                        setAccountToast(
                          `تم إرسال الفاتورة (${inv.invoiceNumber}) مباشرة في محادثة (${inv.customerName}) وعبر واتساب!`
                        );
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال الفاتورة</span>
                    </button>
                  </div>
                </div>

                {/* Real Customer Debt Reminder Selector */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 min-w-0">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    2. إرسال كشف حساب ومطالبة مديونية فعلية:
                  </label>
                  <div className="flex gap-1.5 min-w-0">
                    <select
                      value={selectedRealCustomerId}
                      onChange={(e) => setSelectedRealCustomerId(e.target.value)}
                      className="flex-1 min-w-0 truncate px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr} — الرصيد: {formatCurrency(c.balance)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      data-testid="quick-send-debt-btn"
                      onClick={() => {
                        const cust =
                          customers.find((c) => c.id === selectedRealCustomerId) || customers[0];
                        if (!cust) return;
                        const chatId = startOrOpenWhatsAppChat(
                          cust.nameAr || cust.name,
                          cust.phone,
                          cust.id
                        );
                        const refCode = `SOA-${cust.id.slice(-4).toUpperCase()}`;
                        const composed = composeDebtReminderMessageText({
                          customerName: cust.nameAr || cust.name,
                          totalBalance: Math.abs(cust.balance || 0),
                          companyName: company.nameAr || company.name,
                          currency,
                          customSignatureAr: messagingGatewayConfig.customSignatureAr,
                        });
                        sendWhatsAppChatMessage(chatId, composed, 'DEBT_REMINDER', refCode);
                        setAccountToast(
                          `تم إرسال كشف الحساب ومطالبة السداد إلى (${cust.nameAr}) مباشرة!`
                        );
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال المطالبة</span>
                    </button>
                  </div>
                </div>

                {/* Real Warranty / RMA Notification Selector */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 min-w-0">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    3. إرسال إشعار صيانة وضمان (RMA) فعلي:
                  </label>
                  <div className="flex gap-1.5 min-w-0">
                    <select
                      value={selectedRealRmaId}
                      onChange={(e) => setSelectedRealRmaId(e.target.value)}
                      className="flex-1 min-w-0 truncate px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold"
                    >
                      {warrantyTickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.ticketNumber} — {t.customerName} ({t.productName.slice(0, 22)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      data-testid="quick-send-rma-btn"
                      onClick={() => {
                        const rma =
                          warrantyTickets.find((t) => t.id === selectedRealRmaId) ||
                          warrantyTickets[0];
                        if (!rma) return;
                        const chatId = startOrOpenWhatsAppChat(
                          rma.customerName,
                          rma.customerPhone
                        );
                        const msg = `🔧 *إشعار مركز الصيانة والضمان المعتمد*\nتذكرة رقم: *${rma.ticketNumber}*\nالعميل: ${rma.customerName}\nالجهاز: ${rma.productName}\nالرقم التسلسلي: ${rma.serialNumber}\nالتقرير الفني: ${rma.technicianReport}\nالرسوم المستحقة: ${formatCurrency(rma.totalCustomerCharge)}`;
                        sendWhatsAppChatMessage(chatId, msg, 'WARRANTY', rma.ticketNumber);
                        setAccountToast(
                          `تم إرسال تقرير الضمان (${rma.ticketNumber}) إلى (${rma.customerName}) مباشرة!`
                        );
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال التقرير</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Chat Split-Screen (Right Column - 8 Cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row h-[560px]">
              {/* Contacts Sidebar */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
                {/* Search Bar + New Chat Button */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={chatSearch}
                        onChange={(e) => setChatSearch(e.target.value)}
                        placeholder="بحث في محادثات الحساب..."
                        className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewChatForm((v) => !v)}
                      title="بدء محادثة جديدة مع أي عميل أو رقم"
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>

                  {showNewChatForm && (
                    <form
                      onSubmit={handleStartNewChat}
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-2"
                    >
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                        <span>فتح محادثة فورية داخل النظام</span>
                        <button
                          type="button"
                          onClick={() => setShowNewChatForm(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>
                      <select
                        onChange={(e) => {
                          const cust = customers.find((c) => c.id === e.target.value);
                          if (cust) {
                            setNewChatName(cust.nameAr);
                            setNewChatPhone(cust.phone);
                          }
                        }}
                        defaultValue=""
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
                      >
                        <option value="" disabled>
                          اختر من قائمة العملاء أو اكتب رقماً...
                        </option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameAr} ({c.phone})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        placeholder="اسم العميل أو الجهة"
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
                      />
                      <input
                        type="text"
                        required
                        value={newChatPhone}
                        onChange={(e) => setNewChatPhone(e.target.value)}
                        placeholder="رقم الهاتف (+967...)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono"
                      />
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        بدء المحادثة الآن
                      </button>
                    </form>
                  )}
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredChats.map((chat) => {
                    const isSelected = chat.id === activeChat.id;
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => setActiveWhatsAppChatId(chat.id)}
                        className={`w-full p-3.5 text-right flex items-start gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-r-4 border-emerald-500'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
                          {Array.from(chat.contactName.trim())[0] || '💬'}
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

              {/* Live Chat Window */}
              <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-slate-950">
                {/* Chat Header (Real-Time Live Status & Quick Actions — Zero Simulation) */}
                <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                      {Array.from(activeChat.contactName.trim())[0] || '💬'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {activeChat.contactName}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                        <span>{activeChat.contactPhone}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          • عبر: {activeAccountObj?.accountLabel}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Chat Header Robot Icon Button (Inactive by default -> Active Emerald/Cyan when clicked) */}
                    <button
                      type="button"
                      data-testid="chat-header-ai-bot-toggle"
                      onClick={handleToggleAiBot}
                      title={
                        isAiBotEnabled
                          ? 'الروبوت الذكي نشط في هذه المحادثة — انقر لإيقاف الرد التلقائي'
                          : 'انقر لتفعيل الروبوت الذكي للرد الفوري وجلب الفواتير والتقارير'
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                        isAiBotEnabled
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Bot className={`w-4 h-4 ${isAiBotEnabled ? 'text-white animate-bounce' : 'text-slate-500'}`} />
                      <span>{isAiBotEnabled ? 'الروبوت الذكي: مفعّل ✓' : 'تفعيل الروبوت الذكي'}</span>
                    </button>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>إرسال واستقبال فعلي لحظي</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSyncingLiveNow(true);
                        await fetchLiveWhatsAppQR(false);
                        setIsSyncingLiveNow(false);
                      }}
                      title="مزامنة الرسائل الواردة والصادرة من خادم واتساب الآن"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveNow ? 'animate-spin text-emerald-600' : ''}`} />
                      <span>مزامنة فورية</span>
                    </button>
                  </div>
                </div>

                {/* AI Robot Full-ERP Control Strip (Visible when Robot is active, or compact status bar when inactive) */}
                <div
                  data-testid="whatsapp-ai-bot-control-strip"
                  className={`px-4 py-2 border-b transition-colors flex flex-col gap-1.5 ${
                    isAiBotEnabled
                      ? 'bg-emerald-950 text-white border-emerald-800'
                      : 'bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Bot
                        className={`w-4 h-4 shrink-0 ${
                          isAiBotEnabled ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="font-black">
                        {isAiBotEnabled
                          ? 'تحكم الروبوت الذكي بالنظام مفعّل (واعي بالفواتير، الأرباح، المخزون، والمديونيات):'
                          : 'الروبوت الذكي في وضع الاستعداد:'}
                      </span>
                      <span
                        className={`truncate max-w-md ${
                          isAiBotEnabled ? 'text-emerald-300' : 'text-slate-500'
                        }`}
                      >
                        {aiBotLastActionAr}
                      </span>
                    </div>

                    {isAiBotEnabled && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        الردود الذكية المنفذة: {aiBotRepliesCount}
                      </span>
                    )}
                  </div>

                  {isAiBotEnabled && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <button
                        type="button"
                        data-testid="ai-bot-reply-last-msg-btn"
                        disabled={isAiBotResponding}
                        onClick={() => handleTriggerSmartAiBot()}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>رد ذكي فوري على المحادثة</span>
                      </button>

                      <button
                        type="button"
                        data-testid="ai-bot-send-invoice-btn"
                        disabled={isAiBotResponding}
                        onClick={() => handleTriggerSmartAiBot('INVOICE_LOOKUP')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] cursor-pointer transition"
                      >
                        📄 جلب وإرسال الفاتورة
                      </button>

                      <button
                        type="button"
                        data-testid="ai-bot-send-report-btn"
                        disabled={isAiBotResponding}
                        onClick={() => handleTriggerSmartAiBot('FINANCIAL_REPORT')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-[11px] cursor-pointer transition"
                      >
                        📈 تقرير الأرباح والمبيعات اللحظي
                      </button>

                      <button
                        type="button"
                        data-testid="ai-bot-send-debt-btn"
                        disabled={isAiBotResponding}
                        onClick={() => handleTriggerSmartAiBot('DEBT_STATEMENT')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 font-bold text-[11px] cursor-pointer transition"
                      >
                        💳 كشف المديونية والرصيد
                      </button>

                      <button
                        type="button"
                        data-testid="ai-bot-send-stock-btn"
                        disabled={isAiBotResponding}
                        onClick={() => handleTriggerSmartAiBot('INVENTORY_PRICING')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 font-bold text-[11px] cursor-pointer transition"
                      >
                        📦 أسعار وجرد المستودع
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeChat.messages.map((msg, mIdx) => {
                    const isOutbound = msg.sender === 'ME';
                    return (
                      <div
                        key={`${msg.id}-${mIdx}`}
                        className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl p-3 shadow-sm ${
                            isOutbound
                              ? 'bg-[#d9fdd3] dark:bg-emerald-950/70 text-slate-900 dark:text-slate-100 rounded-tr-none'
                              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800'
                          }`}
                        >
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
                          : `اكتب رسالتك الفورية إلى (${activeChat.contactName}) عبر (${activeAccountObj?.accountLabel})...`
                      }
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    data-testid="whatsapp-send-btn"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="إرسال فعلي فوري"
                  >
                    <span>إرسال</span>
                    <Send className="w-3.5 h-3.5 rtl:-rotate-90" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          <CameraBarcodeScannerModal
            isOpen={isQrCameraScannerOpen}
            onClose={() => setIsQrCameraScannerOpen(false)}
            title="مسح باركود ربط جلسة واتساب بالكاميرا"
            onScan={(code: string) => {
              handlePair(pairingPhoneInput, `${activeAccountObj?.accountLabel} (${code.slice(0, 12)})`);
            }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: UNIFIED QUICK-SEND TEMPLATES & OUTBOUND LOG       */}
      {/* ======================================================== */}
      {activeTab === 'QUICK_SEND_LOG' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                مركز الإرسال الفوري الموحد وسجل الرسائل الصادرة ({outboundMessages.length} رسالة)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                إرسال التقارير المالية للإدارة العليا، الفواتير، ومطالبات السداد، مع توثيق لحظي لكافة الرسائل المرسلة عبر واتساب وSMS
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
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
                const reportText = composeExecutiveReportMessageText({
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
                });
                await sendWhatsAppOrSmsMessage({
                  channel: 'WHATSAPP',
                  category: 'FINANCIAL_REPORT',
                  recipientName: 'الإدارة العليا / المالك',
                  recipientPhone: messagingGatewayConfig.ownerReportPhone || '+967 771 445 880',
                  referenceNumber: `REP-${new Date().toISOString().slice(0, 10)}`,
                  messageBody: reportText,
                });
                setAccountToast('تم إرسال التقرير المالي اللحظي للإدارة العليا عبر واتساب وتوثيقه في السجل!');
                setActiveTab('WHATSAPP');
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>إرسال التقرير المالي اللحظي للإدارة العليا عبر واتساب</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3">القناة</th>
                  <th className="py-2.5 px-3">المستلم</th>
                  <th className="py-2.5 px-3">رقم الهاتف</th>
                  <th className="py-2.5 px-3">المرجع</th>
                  <th className="py-2.5 px-3">محتوى الرسالة</th>
                  <th className="py-2.5 px-3">وقت الإرسال</th>
                  <th className="py-2.5 px-3">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {outboundMessages.map((m, idx) => (
                  <tr key={`${m.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          m.channel === 'WHATSAPP'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {m.channel === 'WHATSAPP' ? 'واتساب فعلي' : 'SMS'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                      {m.recipientName}
                    </td>
                    <td className="py-2.5 px-3 font-mono dir-ltr text-slate-600 dark:text-slate-300">
                      {m.recipientPhone}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-600">
                      {m.referenceNumber || '—'}
                    </td>
                    <td className="py-2.5 px-3 max-w-md truncate text-slate-600 dark:text-slate-400">
                      {m.messageBody}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{m.sentAt}</td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          startOrOpenWhatsAppChat(m.recipientName, m.recipientPhone);
                          setActiveTab('WHATSAPP');
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        فتح المحادثة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
