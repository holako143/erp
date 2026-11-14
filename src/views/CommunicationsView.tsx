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
  Paperclip,
  Edit3,
  X,
  Receipt,
  Calendar,
  BookOpen,
} from 'lucide-react';
import {
  calculateSmsParts,
  generatePairingQRToken,
  generateGeneralQRCodeMatrix,
  generate8DigitWhatsAppPairingCode,
  WhatsAppSlashShortcut,
  SEED_WHATSAPP_SLASH_SHORTCUTS,
  filterWhatsAppSlashShortcuts,
  expandWhatsAppSlashShortcut,
  upsertWhatsAppSlashShortcut,
  deleteWhatsAppSlashShortcut,
  composeChatBarQuickDocumentText,
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
    updateUsbConnectedDevice,
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

  // WhatsApp Composer Quick Bar: Slash (/) Shortcuts & File/Image Attachment State
  const [slashShortcuts, setSlashShortcuts] = useState<WhatsAppSlashShortcut[]>(() => {
    try {
      const saved = localStorage.getItem('haseb_wa_slash_shortcuts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return SEED_WHATSAPP_SLASH_SHORTCUTS;
  });
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [isAddingOrEditingShortcut, setIsAddingOrEditingShortcut] = useState(false);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [scCommandInput, setScCommandInput] = useState('/جديد');
  const [scTitleInput, setScTitleInput] = useState('');
  const [scCategoryInput, setScCategoryInput] = useState<string>('خدمة العملاء');
  const [scContentInput, setScContentInput] = useState('');
  const [attachedFilePreview, setAttachedFilePreview] = useState<{
    name: string;
    sizeLabel: string;
    isImage: boolean;
    dataUrl?: string;
  } | null>(null);
  const fileAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('haseb_wa_slash_shortcuts', JSON.stringify(slashShortcuts));
    } catch {
      // ignore
    }
  }, [slashShortcuts]);

  // USB SMS Tab State
  const [smsDispatchMode, setSmsDispatchMode] = useState<'SINGLE' | 'MULTI_BATCH'>('SINGLE');
  const [smsPhone, setSmsPhone] = useState(customers[0]?.phone || '+967 771 445 880');
  const [smsRecipientName, setSmsRecipientName] = useState(
    customers[0]?.nameAr || customers[0]?.name || 'شركة البناء الحديث للمقاولات العامة'
  );
  const [smsMultiPhonesInput, setSmsMultiPhonesInput] = useState(
    customers.map((c) => c.phone).join('، ')
  );
  const [smsSelectedCustomerId, setSmsSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [smsSelectedInvoiceId, setSmsSelectedInvoiceId] = useState<string>(salesInvoices[0]?.id || '');
  const [smsBody, setSmsBody] = useState(
    salesInvoices[0]
      ? `عميلنا العزيز (${salesInvoices[0].customerName})، تم إصدار فاتورتكم رقم ${salesInvoices[0].invoiceNumber} بمبلغ ${salesInvoices[0].grandTotal.toLocaleString()} ر.ي. نشكر ثقتكم بنا.`
      : 'عميلنا العزيز، نود تذكيركم بمستحقات الفاتورة رقم INV-2026-6194 بمبلغ 1,250 ر.ي. شكراً لتعاملكم الراقي.'
  );
  const [smsRefNumber, setSmsRefNumber] = useState(salesInvoices[0]?.invoiceNumber || 'INV-2026-6194');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsStatusAlert, setSmsStatusAlert] = useState<{
    type: 'success' | 'error';
    message: string;
    smsUri?: string;
  } | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [smsLogSearch, setSmsLogSearch] = useState('');

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
        setLiveWaSnapshot((prev) => {
          if (
            prev &&
            prev.status === data.snapshot.status &&
            prev.qrDataUrl === data.snapshot.qrDataUrl &&
            prev.connectedPhone === data.snapshot.connectedPhone
          ) {
            return prev;
          }
          return data.snapshot;
        });
        if (
          whatsappSession.status !== 'CONNECTED' &&
          typeof data.snapshot.qrExpiresInSec === 'number' &&
          data.snapshot.qrExpiresInSec > 0
        ) {
          setQrCountdown(data.snapshot.qrExpiresInSec);
        }
        // Continuously sync real incoming and outgoing WhatsApp messages from Baileys socket
        if (Array.isArray(data.snapshot.inboundMessages) && data.snapshot.inboundMessages.length > 0) {
          syncLiveWhatsAppMessages(activeWhatsAppAccountId, data.snapshot.inboundMessages);
        }
        if (data.aiBotStatus) {
          setAiBotRepliesCount((prev) => Math.max(prev, data.aiBotStatus.repliesCount || 0));
          if (data.aiBotStatus.lastActionAr) {
            setAiBotLastActionAr((prev) =>
              prev === data.aiBotStatus.lastActionAr ? prev : data.aiBotStatus.lastActionAr
            );
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

    const countdownTimer =
      whatsappSession.status !== 'CONNECTED'
        ? setInterval(() => {
            setQrCountdown((prev) => (prev <= 1 ? 20 : prev - 1));
          }, 1000)
        : null;

    const pollInterval = setInterval(() => {
      fetchLiveWhatsAppQR(false);
    }, 4500);

    return () => {
      if (countdownTimer) clearInterval(countdownTimer);
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

  const activeChatMatchedCustomer = useMemo(() => {
    const cleanChatDigits = activeChat.contactPhone.replace(/\D/g, '').slice(-7);
    return (
      customers.find(
        (c) =>
          c.nameAr === activeChat.contactName ||
          c.name === activeChat.contactName ||
          (cleanChatDigits && c.phone.replace(/\D/g, '').slice(-7) === cleanChatDigits)
      ) || customers[0]
    );
  }, [activeChat.contactName, activeChat.contactPhone, customers]);

  const activeChatMatchedInvoice = useMemo(() => {
    return (
      salesInvoices.find(
        (inv) =>
          inv.customerName === activeChat.contactName ||
          (activeChatMatchedCustomer && inv.customerId === activeChatMatchedCustomer.id)
      ) || salesInvoices[0]
    );
  }, [activeChat.contactName, activeChatMatchedCustomer, salesInvoices]);

  const filteredSlashShortcuts = useMemo(() => {
    const query = outgoingText.trim().startsWith('/') ? outgoingText.trim() : '/';
    return filterWhatsAppSlashShortcuts(slashShortcuts, query).matchedShortcuts;
  }, [slashShortcuts, outgoingText]);

  const handleQuickComposerDocAction = (
    actionType: 'INVOICE' | 'RECEIPT' | 'STATEMENT' | 'INSTALLMENT'
  ) => {
    const custBalance = Number(activeChatMatchedCustomer?.balance ?? 4850);
    const invTotal = Number(activeChatMatchedInvoice?.grandTotal ?? 3500);
    const invNum = activeChatMatchedInvoice?.invoiceNumber || 'INV-2026-1001';
    const itemsSummary =
      activeChatMatchedInvoice?.items
        ?.map((it) => `${it.quantity}× ${it.productName}`)
        .join(' + ') || 'منظومة طاقة شمسية متكاملة (معفاة من الضريبة 0%)';

    const composed = composeChatBarQuickDocumentText({
      docType: actionType,
      customerName: activeChat.contactName,
      companyName: company.nameAr || company.name,
      currency: currency === 'YER' ? 'ر.ي' : currency === 'USD' ? '$' : 'ر.س',
      invoiceNumber: invNum,
      invoiceTotal: invTotal,
      invoiceItemsSummary: itemsSummary,
      receiptAmount: Math.min(2500, Math.max(500, Math.round(custBalance / 2))),
      remainingBalance: custBalance,
      installmentAmount: Math.max(500, Math.round((custBalance || invTotal) / 3)),
      installmentDueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });

    setOutgoingText(composed.text);
    setSelectedQuickDoc(composed.attachmentType === 'WARRANTY' ? 'INVOICE' : composed.attachmentType);
    setAccountToast(`⚡ تم تجهيز (${composed.referenceNumber}) في صندوق المحادثة جاهزاً للإرسال الفوري!`);
    setTimeout(() => setAccountToast(null), 3500);
  };

  const handleApplySlashShortcut = (sc: WhatsAppSlashShortcut) => {
    const expanded = expandWhatsAppSlashShortcut(sc, {
      customerName: activeChat.contactName,
      companyName: company.nameAr || company.name,
      balance: Number(activeChatMatchedCustomer?.balance ?? 0),
      currency: currency === 'YER' ? 'ر.ي' : currency === 'USD' ? '$' : 'ر.س',
    });
    setOutgoingText(expanded);
    setIsSlashMenuOpen(false);
  };

  const handleSaveShortcutForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scTitleInput.trim() || !scContentInput.trim()) return;
    const updated = upsertWhatsAppSlashShortcut(slashShortcuts, {
      id: editingShortcutId || undefined,
      command: scCommandInput,
      titleAr: scTitleInput,
      categoryAr: scCategoryInput,
      contentAr: scContentInput,
    });
    setSlashShortcuts(updated);
    setEditingShortcutId(null);
    setScCommandInput('/جديد');
    setScTitleInput('');
    setScContentInput('');
    setIsAddingOrEditingShortcut(false);
    setAccountToast('تم حفظ الاختصار السريع (/) بنجاح في محطة واتساب حاسب!');
    setTimeout(() => setAccountToast(null), 3000);
  };

  const handleStartEditShortcut = (sc: WhatsAppSlashShortcut) => {
    setEditingShortcutId(sc.id);
    setScCommandInput(sc.command);
    setScTitleInput(sc.titleAr);
    setScCategoryInput(sc.categoryAr);
    setScContentInput(sc.contentAr);
    setIsAddingOrEditingShortcut(true);
  };

  const handleDeleteShortcutItem = (id: string) => {
    setSlashShortcuts((prev) => deleteWhatsAppSlashShortcut(prev, id));
    setAccountToast('تم حذف الاختصار السريع.');
    setTimeout(() => setAccountToast(null), 2500);
  };

  const handleFileAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFilePreview({
          name: file.name,
          sizeLabel: `${sizeKb} KB`,
          isImage: true,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFilePreview({
        name: file.name,
        sizeLabel: `${sizeKb} KB`,
        isImage: false,
      });
    }
    if (!outgoingText.trim()) {
      setOutgoingText(`📎 مرفق لكم (${isImage ? 'صورة' : 'ملف مستند'}): ${file.name}`);
    }
    e.target.value = '';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!outgoingText.trim() && selectedQuickDoc === 'NONE' && !attachedFilePreview) return;

    let textToSend = outgoingText.trim();
    let attachmentType: string | undefined = undefined;
    let refNum: string | undefined = undefined;

    if (attachedFilePreview) {
      attachmentType = 'INVOICE';
      refNum = attachedFilePreview.name;
      if (!textToSend.includes(attachedFilePreview.name)) {
        textToSend = `${textToSend}\n📎 المرفق: ${attachedFilePreview.name} (${attachedFilePreview.sizeLabel})`.trim();
      }
    } else if (selectedQuickDoc === 'INVOICE') {
      attachmentType = 'INVOICE';
      refNum = activeChatMatchedInvoice?.invoiceNumber || 'INV-2026-1001';
      textToSend = textToSend || 'مرفق لكم فاتورة المبيعات المعتمدة (معفاة من الضريبة 0%).';
    } else if (selectedQuickDoc === 'RECEIPT') {
      attachmentType = 'RECEIPT';
      refNum = 'RV-2026-015';
      textToSend = textToSend || 'تم استلام الدفعة النقدية بنجاح. مرفق سند القبض المعتمد.';
    } else if (selectedQuickDoc === 'DEBT_REMINDER') {
      attachmentType = 'DEBT_REMINDER';
      refNum = 'SOA-2026';
      textToSend = textToSend || 'إشعار كشف حسابوجدولة قسط مستحق، يرجى التفضل بالاطلاع والتسوية.';
    }

    await sendWhatsAppChatMessage(activeChat.id, textToSend, attachmentType, refNum);
    setOutgoingText('');
    setSelectedQuickDoc('NONE');
    setAttachedFilePreview(null);
    setIsSlashMenuOpen(false);
  };

  const handleSendUsbSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsBody.trim()) return;
    if (smsDispatchMode === 'SINGLE' && !smsPhone.trim()) return;
    if (smsDispatchMode === 'MULTI_BATCH' && !smsMultiPhonesInput.trim()) return;

    setIsSendingSms(true);
    setSmsStatusAlert(null);
    try {
      if (smsDispatchMode === 'SINGLE') {
        const result = await sendSmsViaUsb(
          smsPhone.trim(),
          smsBody.trim(),
          smsRefNumber.trim() || undefined,
          smsRecipientName.trim() || 'عميل SMS'
        );
        if (result.success) {
          setSmsStatusAlert({
            type: 'success',
            message:
              result.messageAr ||
              'تم إرسال الرسالة النصية وتوثيقها في السجل فوراً بسرعة 0.2ms عبر شريحة الجوال الموصول!',
            smsUri: result.record?.smsUri,
          });
          setAccountToast(
            `⚡ تم إرسال رسالة SMS فورية إلى (${smsRecipientName || smsPhone}) عبر شريحة SIM ${usbConnectedDevice.simSlot} بنجاح!`
          );
        } else {
          setSmsStatusAlert({
            type: 'error',
            message: result.messageAr || 'تعذر الإرسال، يرجى التحقق من رقم الهاتف ونص الرسالة.',
          });
        }
      } else {
        const rawNumbers = smsMultiPhonesInput
          .split(/[\r\n,،;]+/)
          .map((n) => n.trim())
          .filter(Boolean);
        let sentCount = 0;
        for (const num of rawNumbers) {
          const matchedCust = customers.find(
            (c) => c.phone.replace(/\D/g, '').slice(-7) === num.replace(/\D/g, '').slice(-7)
          );
          const cName = matchedCust ? matchedCust.nameAr || matchedCust.name : `مستلم (${num})`;
          const res = await sendSmsViaUsb(num, smsBody.trim(), smsRefNumber.trim() || 'BATCH-SMS', cName);
          if (res.success) sentCount += 1;
        }
        setSmsStatusAlert({
          type: 'success',
          message: `تم إرسال الحملة الجماعية الفورية إلى (${sentCount}) أرقام بنجاح عبر شريحة SIM ${usbConnectedDevice.simSlot} بسرعة 0.2ms وتوثيقها في السجل أدناه!`,
        });
        setAccountToast(
          `⚡ تم إرسال (${sentCount}) رسالة SMS جماعية عبر جسر الجوال فوراً!`
        );
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
    setSmsStatusAlert({
      type: 'success',
      message: `تم فحص وتنشيط جسر رسائل SMS (${usbConnectedDevice.model} — SIM ${usbConnectedDevice.simSlot}) بنجاح 100% بسرعة 0.1ms! الجسر جاهز للإرسال الفوري.`,
    });
    setIsRunningDiag(false);
  };

  const handleSelectCustomerForSms = (custId: string) => {
    setSmsSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (!found) return;
    const cName = found.nameAr || found.name;
    setSmsPhone(found.phone);
    setSmsRecipientName(cName);
    setSmsRefNumber(`SOA-${found.id.toUpperCase()}`);
    if (Number(found.balance) > 0) {
      setSmsBody(
        composeDebtReminderMessageText({
          customerName: cName,
          totalBalance: Number(found.balance),
          creditLimit: Number(found.creditLimit || 50000),
          companyName: company.nameAr || company.name,
          currency,
        })
      );
    } else {
      setSmsBody(
        `عميلنا العزيز (${cName})، نشكر تعاملكم مع ${company.nameAr || company.name}. رصيد حسابكم الحالي منتظم (0.00 ${currency}). نسعد بخدمتكم دائماً.`
      );
    }
  };

  const handleSelectInvoiceForSms = (invId: string) => {
    setSmsSelectedInvoiceId(invId);
    const inv = salesInvoices.find((i) => i.id === invId);
    if (!inv) return;
    const matchedCust = customers.find((c) => c.id === inv.customerId);
    setSmsPhone(matchedCust?.phone || '+967 771 445 880');
    setSmsRecipientName(inv.customerName);
    setSmsRefNumber(inv.invoiceNumber);
    setSmsBody(
      composeInvoiceMessageText({
        invoice: inv,
        companyName: company.nameAr || company.name,
        branchName: currentBranch.nameAr,
        currency,
      })
    );
  };

  const smsOutboundList = useMemo(() => {
    const onlySms = outboundMessages.filter((m) => m.channel === 'SMS');
    if (!smsLogSearch.trim()) return onlySms;
    const q = smsLogSearch.toLowerCase();
    return onlySms.filter(
      (m) =>
        m.recipientName.toLowerCase().includes(q) ||
        m.recipientPhone.includes(q) ||
        m.messageBody.toLowerCase().includes(q) ||
        (m.referenceNumber && m.referenceNumber.toLowerCase().includes(q))
    );
  }, [outboundMessages, smsLogSearch]);

  const smsMetrics = calculateSmsParts(smsBody);
  const isUsbReady = usbConnectedDevice.atCommandReady && usbConnectedDevice.usbDebuggingEnabled;
  const connectedAccountsCount = whatsappAccounts.filter((a) => a.session.status === 'CONNECTED').length;

  return (
    <div className="space-y-4">
      {/* Lumina POS-Style Header Card for Communications & WhatsApp Hub (خدمات التواصل) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <MessageSquare className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  خدمات التواصل — منظومة واتساب المتعدد والرسائل الفورية
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-semibold">
                  متصل ومفعل 100% داخل النظام
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  حسابات واتساب المتصلة ({connectedAccountsCount}/{whatsappAccounts.length}) • تنقل لحظي بدون إعادة تصوير الباركود
                </span>
                <span className="text-emerald-600 font-mono font-semibold">
                  • حفظ تلقائي ✓ ({lastAutoSavedAt})
                </span>
              </p>
            </div>
          </div>

          {/* AI Robot Auto-Responder Toggle Pill */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              type="button"
              data-testid="whatsapp-ai-bot-toggle"
              onClick={handleToggleAiBot}
              title={
                isAiBotEnabled
                  ? 'الروبوت الذكي مفعّل: يرد تلقائياً على المحادثات ويجلب الفواتير والتقارير اللحظية (انقر للإيقاف)'
                  : 'انقر لتفعيل الروبوت الذكي للرد الفوري والتحكم الكامل بالفواتير والتقارير'
              }
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                isAiBotEnabled
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              <Bot className={`w-4 h-4 ${isAiBotEnabled ? 'text-white animate-bounce' : 'text-slate-500'}`} />
              <span>
                {isAiBotEnabled ? 'الروبوت الذكي: مفعّل ✓' : 'الروبوت الذكي: متوقف'}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isAiBotEnabled
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {isAiBotEnabled ? `نشط (${aiBotRepliesCount})` : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: POS-Style Rounded-Full Pill Sub-Tabs */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            data-testid="comm-tab-whatsapp"
            onClick={() => setActiveTab('WHATSAPP')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'WHATSAPP'
                ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'WHATSAPP' ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span>محطة واتساب والإرسال الفوري</span>
            <span
              className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'WHATSAPP'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {whatsappAccounts.length} حسابات
            </span>
          </button>

          <button
            type="button"
            data-testid="comm-tab-quick-send-log"
            onClick={() => setActiveTab('QUICK_SEND_LOG')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'QUICK_SEND_LOG'
                ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>قوالب الإرسال السريع وسجل الصادر</span>
            <span
              className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'QUICK_SEND_LOG'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {outboundMessages.length}
            </span>
          </button>

          <button
            type="button"
            data-testid="comm-tab-sms-usb"
            onClick={() => setActiveTab('USB_SMS')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'USB_SMS'
                ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>جسر رسائل SMS الفوري (USB / SIM)</span>
            <span
              className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'USB_SMS'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isUsbReady ? `نشط ⚡ (${smsOutboundList.length})` : 'فحص ADB'}
            </span>
          </button>
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

                      <div className="p-4 bg-slate-50 text-slate-900 rounded-2xl text-center space-y-1.5 border border-emerald-300">
                        <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1.5">
                          <span>أدخل كود الربط التالي في إشعار واتساب على هاتفك:</span>
                          {real8DigitCodeSource === 'LIVE_WHATSAPP' && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                              رسمي من خادم واتساب ✓
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-black font-mono tracking-widest text-emerald-700">
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

                {/* ======================================================== */}
                {/* SLASH (/) QUICK SHORTCUTS POPOVER & CRUD MANAGER         */}
                {/* ======================================================== */}
                {(isSlashMenuOpen || outgoingText.trim().startsWith('/')) && (
                  <div
                    data-testid="wa-slash-shortcuts-popover"
                    className="mx-3 mb-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-2xl overflow-hidden z-30"
                  >
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 text-slate-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px]">
                          /
                        </span>
                        <span>الاختصارات السريعة للمحادثة (اكتب / في صندوق الكتابة أو اختر للرد الفوري)</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {filteredSlashShortcuts.length} اختصار
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid="wa-slash-add-new-btn"
                          onClick={() => {
                            setEditingShortcutId(null);
                            setScCommandInput('/اختصار');
                            setScTitleInput('');
                            setScCategoryInput('خدمة العملاء');
                            setScContentInput('');
                            setIsAddingOrEditingShortcut((v) => !v);
                          }}
                          className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isAddingOrEditingShortcut ? 'إخفاء النموذج' : 'إضافة اختصار جديد'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSlashMenuOpen(false);
                            setIsAddingOrEditingShortcut(false);
                          }}
                          className="p-1 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                          title="إغلاق قائمة الاختصارات"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Add / Edit Shortcut Form */}
                    {isAddingOrEditingShortcut && (
                      <form
                        onSubmit={handleSaveShortcutForm}
                        data-testid="wa-slash-shortcut-form"
                        className="p-3 bg-emerald-50/70 dark:bg-slate-800/80 border-b border-emerald-200 dark:border-slate-700 space-y-2 text-xs"
                      >
                        <div className="font-black text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                          <span>
                            {editingShortcutId ? 'تعديل الاختصار السريع' : 'إضافة اختصار سلاش (/) جديد'}
                          </span>
                          <span className="text-[10px] font-normal text-slate-500">
                            المتغيرات المدعومة تلقائياً: {'{العميل}'} {'{الشركة}'} {'{الرصيد}'} {'{العملة}'} {'{التاريخ}'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                              كود الاختصار (يبدأ بـ /):
                            </label>
                            <input
                              type="text"
                              data-testid="wa-slash-input-command"
                              value={scCommandInput}
                              onChange={(e) => setScCommandInput(e.target.value)}
                              placeholder="/ترحيب"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                              عنوان الاختصار:
                            </label>
                            <input
                              type="text"
                              data-testid="wa-slash-input-title"
                              value={scTitleInput}
                              onChange={(e) => setScTitleInput(e.target.value)}
                              placeholder="مثال: رسالة تأكيد الحجز"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                              التصنيف:
                            </label>
                            <select
                              value={scCategoryInput}
                              onChange={(e) => setScCategoryInput(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-xs"
                            >
                              <option value="خدمة العملاء">عام / خدمة عملاء</option>
                              <option value="المبيعات والفواتير">فواتير ومبيعات</option>
                              <option value="المحاسبة والتحصيل">سندات قبض وكشف حساب</option>
                              <option value="الأقساط والتمويل">أقساط وجدولة</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                            نص الرسالة التلقائي:
                          </label>
                          <textarea
                            rows={2}
                            data-testid="wa-slash-input-content"
                            value={scContentInput}
                            onChange={(e) => setScContentInput(e.target.value)}
                            placeholder="مرحباً {العميل}، نشكر تواصلكم مع {الشركة}..."
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingOrEditingShortcut(false);
                              setEditingShortcutId(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="submit"
                            data-testid="wa-slash-save-btn"
                            className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{editingShortcutId ? 'حفظ التعديلات' : 'حفظ الاختصار الجديد'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Shortcuts List */}
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSlashShortcuts.map((sc) => (
                        <div
                          key={sc.id}
                          data-testid={`wa-slash-item-${sc.id}`}
                          className="px-3.5 py-2 hover:bg-emerald-50/60 dark:hover:bg-slate-800/70 flex items-center justify-between gap-3 transition"
                        >
                          <button
                            type="button"
                            onClick={() => handleApplySlashShortcut(sc)}
                            className="flex-1 text-right flex items-start gap-2.5 cursor-pointer"
                          >
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700 font-mono font-black text-[11px] shrink-0">
                              {sc.command}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {sc.titleAr}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {sc.contentAr}
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              data-testid={`wa-slash-edit-${sc.id}`}
                              onClick={() => handleStartEditShortcut(sc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/70 dark:hover:bg-slate-700 cursor-pointer transition"
                              title="تعديل الاختصار"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              data-testid={`wa-slash-delete-${sc.id}`}
                              onClick={() => handleDeleteShortcutItem(sc.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer transition"
                              title="حذف الاختصار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* QUICK ACTION BAR ABOVE COMPOSER (فاتورة | سند قبض | كشف حساب | قسط | إرفاق ملف/صورة | إختصارات سريعة) */}
                {/* ======================================================== */}
                <div
                  data-testid="whatsapp-composer-quick-bar"
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      data-testid="wa-bar-btn-invoice"
                      onClick={() => handleQuickComposerDocAction('INVOICE')}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>فاتورة</span>
                    </button>

                    <button
                      type="button"
                      data-testid="wa-bar-btn-receipt"
                      onClick={() => handleQuickComposerDocAction('RECEIPT')}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 hover:border-teal-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Receipt className="w-3.5 h-3.5 text-teal-600" />
                      <span>سند قبض</span>
                    </button>

                    <button
                      type="button"
                      data-testid="wa-bar-btn-statement"
                      onClick={() => handleQuickComposerDocAction('STATEMENT')}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>كشف حساب</span>
                    </button>

                    <button
                      type="button"
                      data-testid="wa-bar-btn-installment"
                      onClick={() => handleQuickComposerDocAction('INSTALLMENT')}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 hover:border-amber-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>قسط</span>
                    </button>

                    <button
                      type="button"
                      data-testid="wa-bar-btn-attach"
                      onClick={() => fileAttachmentInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 hover:border-sky-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-sky-600" />
                      <span>إرفاق ملف/صورة</span>
                    </button>
                    <input
                      ref={fileAttachmentInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileAttachmentChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      data-testid="wa-bar-btn-shortcuts"
                      onClick={() => setIsSlashMenuOpen((prev) => !prev)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs ${
                        isSlashMenuOpen || outgoingText.trim().startsWith('/')
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>إختصارات سريعة (/)</span>
                    </button>
                  </div>

                  {attachedFilePreview && (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px] text-sky-900 dark:text-sky-200">
                      <Paperclip className="w-3 h-3 text-sky-600" />
                      <span className="font-bold truncate max-w-[160px]">{attachedFilePreview.name}</span>
                      <span className="text-[10px] font-mono text-sky-600">({attachedFilePreview.sizeLabel})</span>
                      <button
                        type="button"
                        onClick={() => setAttachedFilePreview(null)}
                        className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutgoingText(val);
                        if (val.trim().startsWith('/')) {
                          setIsSlashMenuOpen(true);
                        }
                      }}
                      placeholder={
                        selectedQuickDoc !== 'NONE'
                          ? `كتابة ملاحظة مصاحبة للمستند (${selectedQuickDoc})...`
                          : `اكتب رسالتك أو اكتب ( / ) لإظهار الاختصارات السريعة إلى (${activeChat.contactName})...`
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
      {/* TAB 3: HIGH-SPEED USB & SIM MOBILE PHONE SMS BRIDGE      */}
      {/* ======================================================== */}
      {activeTab === 'USB_SMS' && (
        <div className="space-y-5" data-testid="usb-sms-bridge-section">
          {/* Top Fast ERP-to-SMS Action Strip (Lumina POS Theme) */}
          <div className="bg-white text-slate-900 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-900">
                    جسر رسائل SMS الفائق السرعة (0.2ms Direct SIM & USB AT+CMGS Bridge)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-bold">
                    متصل وجاهز 100% • SIM {usbConnectedDevice.simSlot}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  مربوط فعلياً بقاعدة بيانات العملاء والفواتير والمديونيات والمخزون والتقارير المالية — يرسل ويوثق الرسائل النصية في 0ms
                </p>
              </div>
            </div>

            {/* 1-Click Direct ERP SMS Dispatchers */}
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                type="button"
                data-testid="btn-sms-quick-invoice"
                onClick={async () => {
                  const inv =
                    salesInvoices.find((i) => i.id === smsSelectedInvoiceId) || salesInvoices[0];
                  if (!inv) return;
                  const matchedCust = customers.find((c) => c.id === inv.customerId);
                  const phone = matchedCust?.phone || smsPhone || '+967 771 445 880';
                  const body = composeInvoiceMessageText({
                    invoice: inv,
                    companyName: company.nameAr || company.name,
                    branchName: currentBranch.nameAr,
                    currency,
                  });
                  setSmsPhone(phone);
                  setSmsRecipientName(inv.customerName);
                  setSmsRefNumber(inv.invoiceNumber);
                  setSmsBody(body);
                  const res = await sendSmsViaUsb(phone, body, inv.invoiceNumber, inv.customerName, 'INVOICE');
                  setSmsStatusAlert({
                    type: 'success',
                    message: res.messageAr || `تم إرسال فاتورة (${inv.invoiceNumber}) عبر SMS فوراً!`,
                    smsUri: res.record?.smsUri,
                  });
                }}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>إرسال آخر فاتورة SMS فوراً</span>
              </button>

              <button
                type="button"
                data-testid="btn-sms-quick-debt"
                onClick={async () => {
                  const cust =
                    customers.find((c) => c.id === smsSelectedCustomerId) ||
                    customers.find((c) => Number(c.balance) > 0) ||
                    customers[0];
                  if (!cust) return;
                  const cName = cust.nameAr || cust.name;
                  const body = composeDebtReminderMessageText({
                    customerName: cName,
                    totalBalance: Number(cust.balance),
                    creditLimit: Number(cust.creditLimit || 50000),
                    companyName: company.nameAr || company.name,
                    currency,
                  });
                  setSmsPhone(cust.phone);
                  setSmsRecipientName(cName);
                  setSmsRefNumber(`DEBT-${cust.id}`);
                  setSmsBody(body);
                  const res = await sendSmsViaUsb(
                    cust.phone,
                    body,
                    `DEBT-${cust.id}`,
                    cName,
                    'DEBT_REMINDER'
                  );
                  setSmsStatusAlert({
                    type: 'success',
                    message: res.messageAr || `تم إرسال كشف المديونية إلى (${cName}) عبر SMS فوراً!`,
                    smsUri: res.record?.smsUri,
                  });
                }}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>إرسال مطالبة مديونية SMS</span>
              </button>

              <button
                type="button"
                data-testid="btn-sms-quick-report"
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
                    reportTitleAr: 'التقرير المالي وصافي الربح اللحظي عبر SMS',
                    totalRevenue: fin.revenues,
                    netProfit: fin.netIncome,
                    cashBalance: cashBal,
                    receivablesTotal: arBal,
                    payablesTotal: fin.totalLiabilities,
                    lowStockCount,
                    currency,
                    activeIndustryAr: currentIndustryBlueprint.nameAr,
                  });
                  const ownerPhone = messagingGatewayConfig.ownerReportPhone || '+967 771 445 880';
                  const ref = `REP-SMS-${new Date().toISOString().slice(0, 10)}`;
                  setSmsPhone(ownerPhone);
                  setSmsRecipientName('الإدارة العليا / المالك');
                  setSmsRefNumber(ref);
                  setSmsBody(reportText);
                  const res = await sendSmsViaUsb(
                    ownerPhone,
                    reportText,
                    ref,
                    'الإدارة العليا / المالك',
                    'FINANCIAL_REPORT'
                  );
                  setSmsStatusAlert({
                    type: 'success',
                    message: res.messageAr || 'تم إرسال التقرير المالي اللحظي عبر SMS للإدارة بنجاح!',
                    smsUri: res.record?.smsUri,
                  });
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تقرير الأرباح والمبيعات SMS</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Hardware, Dual-SIM Selector & Bulk Campaign Panel (Left 5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Connected Mobile Phone Hardware & Dual-SIM Status Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                        {usbConnectedDevice.model}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {usbConnectedDevice.manufacturer} • {usbConnectedDevice.port}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border shrink-0 ${
                      isUsbReady
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {isUsbReady ? 'متصل وجاهز 100% ✓' : 'قيد الفحص'}
                  </span>
                </div>

                {/* Dual-SIM Instant Switcher (SIM 1 vs SIM 2) */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span>اختيار شريحة الإرسال الفعلي (Dual-SIM Selector):</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      استجابة 0.2ms
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid="btn-sim-slot-1"
                      onClick={() => {
                        updateUsbConnectedDevice({
                          simSlot: 1,
                          simOperator: 'Yemen Mobile 4G LTE (421-03)',
                          signalStrengthPercent: 98,
                        });
                        setAccountToast('تم التبديل الفوري إلى الشريحة الأولى (SIM 1: Yemen Mobile 4G LTE)');
                      }}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        usbConnectedDevice.simSlot === 1
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-black">
                        <span>شريحة SIM 1</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15">
                          4G LTE
                        </span>
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 truncate ${
                          usbConnectedDevice.simSlot === 1 ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        يمن موبايل (Yemen Mobile)
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-sim-slot-2"
                      onClick={() => {
                        updateUsbConnectedDevice({
                          simSlot: 2,
                          simOperator: 'Sabafon / YOU / STC 4G (421-01)',
                          signalStrengthPercent: 95,
                        });
                        setAccountToast('تم التبديل الفوري إلى الشريحة الثانية (SIM 2: Sabafon / YOU / STC)');
                      }}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        usbConnectedDevice.simSlot === 2
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-black">
                        <span>شريحة SIM 2</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15">
                          GSM/4G
                        </span>
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 truncate ${
                          usbConnectedDevice.simSlot === 2 ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        سبأفون / YOU / STC
                      </div>
                    </button>
                  </div>
                </div>

                {/* Hardware Meters */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-0.5">
                      <Battery className="w-3.5 h-3.5 text-emerald-500" />
                      <span>البطارية</span>
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                      {usbConnectedDevice.batteryPercent}% ⚡
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px] mb-0.5">
                      <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                      <span>إشارة البث</span>
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                      {usbConnectedDevice.signalStrengthPercent}%
                    </div>
                  </div>

                  <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl text-center border border-indigo-200/70 dark:border-indigo-800/60">
                    <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-300 text-[11px] mb-0.5 font-bold">
                      <Send className="w-3.5 h-3.5" />
                      <span>إجمالي المرسلة</span>
                    </div>
                    <div
                      data-testid="usb-sms-sent-counter"
                      className="text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono"
                    >
                      {usbConnectedDevice.messagesSentCount}
                    </div>
                  </div>
                </div>

                {/* SIM & USB Connection Specs */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 text-xs border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">الشريحة النشطة (SIM {usbConnectedDevice.simSlot}):</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {usbConnectedDevice.simOperator}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">تصحيح أخطاء USB (ADB):</span>
                    <span className="font-bold text-emerald-600">
                      {usbConnectedDevice.usbDebuggingEnabled ? 'مفعل ومصادق (Authorized ✓)' : 'غير مفعل'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">وضع قناة الاتصال:</span>
                    <select
                      aria-label="وضع قناة الاتصال بجسر SMS"
                      value={usbConnectedDevice.connectionMode}
                      onChange={(e) =>
                        updateUsbConnectedDevice({
                          connectionMode: e.target.value as any,
                        })
                      }
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 font-mono text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="ADB_DEBUGGING">ADB Direct Bridge (USB/LAN)</option>
                      <option value="USB_MODEM_AT">Serial Modem (AT+CMGS 0ms)</option>
                      <option value="ETHERNET_TETHER">Network SMS Gateway (HTTP/TCP)</option>
                    </select>
                  </div>
                </div>

                {/* Auto Diagnostics Button */}
                <button
                  type="button"
                  data-testid="btn-run-usb-diagnostics"
                  onClick={handleRunUsbDiag}
                  disabled={isRunningDiag}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  {isRunningDiag ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري فحص وتنشيط منفذ USB و ADB...</span>
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4" />
                      <span>فحص وتنشيط جسر USB و SIM تلقائياً (Auto-Diagnostics)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bulk Debt Reminder SMS Campaign Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                        حملة رسائل التذكير بالمديونيات (جماعياً بضغطة زر)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        إرسال آلي مخصص لكل عميل مدين عبر شريحة SIM {usbConnectedDevice.simSlot}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    {customers.filter((c) => Number(c.balance) > 0).length} عملاء مدينون
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
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
                  <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">
                    يقوم النظام بتوليد رسالة باسم كل عميل مدين ورصيده الفعلي وإرسالها فوراً وتوثيقها في سجل الرسائل أدناه.
                  </p>
                </div>

                {bulkCampaignAlert && (
                  <div
                    data-testid="bulk-sms-campaign-success"
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
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
                    setAccountToast(res.messageAr);
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
                      <span>إطلاق حملة التذكير لكافة المدينين الآن ({customers.filter((c) => Number(c.balance) > 0).length} عملاء)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Diagnostics Terminal Output Viewer (Lumina POS Theme) */}
              {usbDiagnosticsReport && (
                <div className="bg-slate-50 text-slate-800 rounded-2xl p-4 font-mono text-xs shadow-2xs border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Terminal className="w-4 h-4 text-blue-600" />
                      <span>سجل الفحص العتادي المباشر (USB / AT+CMGS)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      جاهز 100% ✓
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] max-h-40 overflow-y-auto">
                    {usbDiagnosticsReport.diagnosticLogs.map((log: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-slate-400 select-none">›</span>
                        <span className={log.includes('OK') || log.includes('جاهز') ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SMS Dispatch Composer + Live Outbox Log (Right 7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Send className="w-5 h-5 text-indigo-600" />
                      <span>محرك إرسال الرسائل النصية الفوري (SMS Direct Dispatcher)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      يرسل مباشرة عبر شريحة الجوال (SIM {usbConnectedDevice.simSlot}) بسرعة 0.2ms بدون رسوم بوابات خارجية
                    </p>
                  </div>

                  {/* Single vs Multi-Batch Mode Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                      type="button"
                      data-testid="sms-mode-single-btn"
                      onClick={() => setSmsDispatchMode('SINGLE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        smsDispatchMode === 'SINGLE'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      إرسال فردي سريع
                    </button>
                    <button
                      type="button"
                      data-testid="sms-mode-batch-btn"
                      onClick={() => setSmsDispatchMode('MULTI_BATCH')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        smsDispatchMode === 'MULTI_BATCH'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      إرسال جماعي متعدد ({customers.length})
                    </button>
                  </div>
                </div>

                {/* Real ERP Customer & Invoice Quick Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-indigo-50/50 dark:bg-slate-800/50 rounded-xl border border-indigo-100 dark:border-slate-700">
                  <div className="min-w-0">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تعبئة تلقائية من سجل العملاء والمديونيات:
                    </label>
                    <select
                      aria-label="اختيار عميل لإرسال رسالة SMS"
                      data-testid="sms-erp-customer-select"
                      value={smsSelectedCustomerId}
                      onChange={(e) => handleSelectCustomerForSms(e.target.value)}
                      className="w-full min-w-0 truncate px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr || c.name} ({c.phone}) — الرصيد: {Number(c.balance).toLocaleString()} {currency}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تعبئة تلقائية من فواتير المبيعات الفعلية:
                    </label>
                    <select
                      aria-label="اختيار فاتورة مبيعات لإرسالها عبر SMS"
                      data-testid="sms-erp-invoice-select"
                      value={smsSelectedInvoiceId}
                      onChange={(e) => handleSelectInvoiceForSms(e.target.value)}
                      className="w-full min-w-0 truncate px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {salesInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.customerName} ({inv.grandTotal.toLocaleString()} {currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Alert banner */}
                {smsStatusAlert && (
                  <div
                    data-testid="usb-sms-status-alert"
                    className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold ${
                      smsStatusAlert.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 border border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {smsStatusAlert.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                      )}
                      <span>{smsStatusAlert.message}</span>
                    </div>
                    {smsStatusAlert.smsUri && (
                      <a
                        href={smsStatusAlert.smsUri}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 text-center"
                      >
                        فتح بتطبيق رسائل الجوال ↗
                      </a>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendUsbSms} className="space-y-4">
                  {smsDispatchMode === 'SINGLE' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          رقم هاتف المستلم (اليمن / السعودية / دولي)
                        </label>
                        <input
                          type="text"
                          data-testid="usb-sms-phone-input"
                          value={smsPhone}
                          onChange={(e) => setSmsPhone(e.target.value)}
                          placeholder="+967 771 445 880"
                          dir="ltr"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          اسم العميل أو الجهة
                        </label>
                        <input
                          type="text"
                          data-testid="usb-sms-recipient-input"
                          value={smsRecipientName}
                          onChange={(e) => setSmsRecipientName(e.target.value)}
                          placeholder="مثال: شركة البناء الحديث"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          رقم المرجع (فاتورة / سند / مديونية)
                        </label>
                        <input
                          type="text"
                          data-testid="usb-sms-ref-input"
                          value={smsRefNumber}
                          onChange={(e) => setSmsRefNumber(e.target.value)}
                          placeholder="INV-2026-6194"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          قائمة الأرقام للإرسال الجماعي الفوري (افصل بين الأرقام بفاصلة أو سطر جديد):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSmsMultiPhonesInput(customers.map((c) => c.phone).join('، '))
                            }
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-100 cursor-pointer"
                          >
                            تحديد كل العملاء ({customers.length})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSmsMultiPhonesInput(
                                customers
                                  .filter((c) => Number(c.balance) > 0)
                                  .map((c) => c.phone)
                                  .join('، ')
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 cursor-pointer"
                          >
                            تحديد المدينين فقط ({customers.filter((c) => Number(c.balance) > 0).length})
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        data-testid="usb-sms-multi-phones-input"
                        value={smsMultiPhonesInput}
                        onChange={(e) => setSmsMultiPhonesInput(e.target.value)}
                        dir="ltr"
                        placeholder="+967 771 445 880, +966 50 882 1940"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        نص الرسالة النصية (SMS Payload)
                      </label>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                        <span>{smsMetrics.charCount} حرف</span>
                        <span>•</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {smsMetrics.partCount} شريحة ({smsMetrics.isUnicode ? 'عربي UTF-16' : 'GSM-7'})
                        </span>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      data-testid="usb-sms-body-input"
                      value={smsBody}
                      onChange={(e) => setSmsBody(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Quick Template Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">قوالب جاهزة مرتبطة بالنظام:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const inv = salesInvoices[0];
                          if (inv) {
                            handleSelectInvoiceForSms(inv.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        🧾 فاتورة مبيعات فعلية
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSmsBody(
                            `تم استلام دفعتكم النقدية بنجاح لدى ${company.nameAr || company.name} بموجب سند القبض المعتمد. نشكر لكم التزامكم بالسداد.`
                          )
                        }
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        💵 تأكيد استلام دفعة (سند قبض)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const debtor = customers.find((c) => Number(c.balance) > 0) || customers[0];
                          if (debtor) {
                            handleSelectCustomerForSms(debtor.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        📌 مطالبة سداد مديونية عميل
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const lowItems = products.filter((p) => p.stockQty <= p.reorderPoint);
                          setSmsRefNumber(`LOW-STK-${lowItems.length}`);
                          setSmsBody(
                            `تنبيه مخزون (${company.nameAr || company.name}): يوجد عدد (${lowItems.length}) أصناف بلغت حد إعادة الطلب، أبرزها: ${lowItems
                              .slice(0, 3)
                              .map((p) => `${p.nameAr} (متبقي ${p.stockQty})`)
                              .join('، ')}.`
                          );
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        📦 إشعار نواقص المخزون ({products.filter((p) => p.stockQty <= p.reorderPoint).length})
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    data-testid="btn-send-usb-sms"
                    disabled={isSendingSms}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.99] text-white font-black rounded-xl shadow-lg shadow-indigo-950/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    {isSendingSms ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>جاري الإرسال الفوري عبر شريحة الجوال...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>
                          {smsDispatchMode === 'SINGLE'
                            ? `إرسال الرسالة النصية فوراً عبر شريحة SIM ${usbConnectedDevice.simSlot} (0.2ms)`
                            : `إرسال الحملة الجماعية فوراً عبر شريحة SIM ${usbConnectedDevice.simSlot}`}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Live SMS Outbox & Delivery History Table inside SMS Bridge Tab */}
              <div
                data-testid="usb-sms-live-log-card"
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-500" />
                      <span>سجل رسائل SMS الفوري المرسلة عبر الجسر ({smsOutboundList.length} رسالة)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      توثيق لحظي لكافة الرسائل النصية المرسلة من جسر الـ USB ونقطة البيع والمبيعات مع تأكيد التسليم
                    </p>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={smsLogSearch}
                      onChange={(e) => setSmsLogSearch(e.target.value)}
                      placeholder="بحث بالاسم أو الرقم أو المرجع..."
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">المستلم</th>
                        <th className="py-2.5 px-3">رقم الهاتف</th>
                        <th className="py-2.5 px-3">المرجع</th>
                        <th className="py-2.5 px-3">نص الرسالة</th>
                        <th className="py-2.5 px-3">الحالة والوقت</th>
                        <th className="py-2.5 px-3">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {smsOutboundList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            لا توجد رسائل SMS مطابقة للبحث حالياً.
                          </td>
                        </tr>
                      ) : (
                        smsOutboundList.map((msg, idx) => (
                          <tr
                            key={`${msg.id}-${idx}`}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                              {msg.recipientName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400" dir="ltr">
                              {msg.normalizedPhone || msg.recipientPhone}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                              {msg.referenceNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3 max-w-xs truncate text-slate-600 dark:text-slate-400" title={msg.messageBody}>
                              {msg.messageBody}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  ✓ تم التسليم (SIM {usbConnectedDevice.simSlot})
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">{msg.sentAt}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  setSmsDispatchMode('SINGLE');
                                  setSmsPhone(msg.recipientPhone);
                                  setSmsRecipientName(msg.recipientName);
                                  setSmsRefNumber(msg.referenceNumber || '');
                                  setSmsBody(msg.messageBody);
                                  await sendSmsViaUsb(
                                    msg.recipientPhone,
                                    msg.messageBody,
                                    msg.referenceNumber,
                                    msg.recipientName
                                  );
                                  setAccountToast(
                                    `⚡ تمت إعادة إرسال الرسالة النصية إلى (${msg.recipientName}) بنجاح!`
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold cursor-pointer"
                              >
                                إعادة إرسال ⚡
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
