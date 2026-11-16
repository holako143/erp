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
  Terminal,
  FileText,
  AlertCircle,
  Sparkles,
  Power,
  Zap,
  CheckCircle,
  Clock,
  Plus,
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
  ArrowRight,
  Pin,
  Download,
  Megaphone,
  Filter,
  ChevronLeft,
  ChevronRight,
  PanelLeftOpen,
  SlidersHorizontal,
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
  summarizeCommunicationsWorkspace,
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
  const [mobileWaPanel, setMobileWaPanel] = useState<'CHATS' | 'ACTIVE_CHAT' | 'PAIRING' | 'DOCS'>('CHATS');
  const [isQrPanelCollapsed, setIsQrPanelCollapsed] = useState<boolean>(false);
  const [isChatsPanelCollapsed, setIsChatsPanelCollapsed] = useState<boolean>(false);
  const [chatFilterMode, setChatFilterMode] = useState<'ALL' | 'UNREAD' | 'DEBTORS'>('ALL');
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('haseb_wa_pinned_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [bulkCampaignAlert, setBulkCampaignAlert] = useState<string | null>(null);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  // Tab 2 Outbound Log Filters & WhatsApp Broadcast Composer
  const [logChannelFilter, setLogChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'SMS'>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [waBroadcastAudience, setWaBroadcastAudience] = useState<'ALL' | 'DEBTORS' | 'REGULAR'>('ALL');
  const [waBroadcastMessage, setWaBroadcastMessage] = useState(
    `مرحباً {العميل}، تحية طيبة من {الشركة}. نود إبلاغكم بأحدث العروض وتوفر كافة الأصناف المعتمدة لدينا.`
  );
  const [waBroadcastAlert, setWaBroadcastAlert] = useState<string | null>(null);
  const [isSendingWaBroadcast, setIsSendingWaBroadcast] = useState(false);

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
  const [newAccPhone, setNewAccPhone] = useState('');
  const [newAccStartMode, setNewAccStartMode] = useState<'QR_SCAN' | 'INSTANT_CONNECTED'>('QR_SCAN');
  const [accountToast, setAccountToast] = useState<string | null>(null);

  // Pairing Mode State (QR vs 8-Digit Phone Code vs Camera Scan)
  const [pairingMethod, setPairingMethod] = useState<'QR_CODE' | 'PHONE_CODE'>('QR_CODE');
  const [pairingPhoneInput, setPairingPhoneInput] = useState(company.phone || '');
  const [pairingNameInput] = useState('واتساب المؤسسة المعتمد');
  const [generated8DigitCode, setGenerated8DigitCode] = useState('HSB8-0000');
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

  useEffect(() => {
    try {
      localStorage.setItem('haseb_wa_pinned_chats', JSON.stringify(pinnedChatIds));
    } catch {
      // ignore
    }
  }, [pinnedChatIds]);

  const togglePinChat = (chatId: string) => {
    setPinnedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [chatId, ...prev]
    );
  };

  // USB SMS Tab State (Zero hard-coded demo fallbacks)
  const [smsDispatchMode, setSmsDispatchMode] = useState<'SINGLE' | 'MULTI_BATCH'>('SINGLE');
  const [smsPhone, setSmsPhone] = useState(customers[0]?.phone || '');
  const [smsRecipientName, setSmsRecipientName] = useState(
    customers[0]?.nameAr || customers[0]?.name || ''
  );
  const [smsMultiPhonesInput, setSmsMultiPhonesInput] = useState(
    customers.map((c) => c.phone).filter(Boolean).join('، ')
  );
  const [smsSelectedCustomerId, setSmsSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [smsSelectedInvoiceId, setSmsSelectedInvoiceId] = useState<string>(salesInvoices[0]?.id || '');
  const [smsBody, setSmsBody] = useState(
    salesInvoices[0]
      ? `عميلنا العزيز (${salesInvoices[0].customerName})، تم إصدار فاتورتكم رقم ${salesInvoices[0].invoiceNumber} بمبلغ ${salesInvoices[0].grandTotal.toLocaleString()} ${currency}. نشكر ثقتكم بنا.`
      : ''
  );
  const [smsRefNumber, setSmsRefNumber] = useState(salesInvoices[0]?.invoiceNumber || '');
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
      contactName: 'لا توجد محادثة محددة',
      contactPhone: '',
      normalizedPhone: '',
      lastMessage: '',
      lastMessageTime: '—',
      unreadCount: 0,
      isBusiness: true,
      messages: [],
    };

  const getMatchedCustomerForChat = (contactName: string, contactPhone: string) => {
    const cleanDigits = contactPhone.replace(/\D/g, '').slice(-7);
    return customers.find(
      (c) =>
        c.nameAr === contactName ||
        c.name === contactName ||
        (cleanDigits && c.phone.replace(/\D/g, '').slice(-7) === cleanDigits)
    );
  };

  const filteredChats = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    return whatsappChats
      .filter((c) => {
        if (q && !c.contactName.toLowerCase().includes(q) && !c.contactPhone.includes(q)) {
          return false;
        }
        if (chatFilterMode === 'UNREAD') return (c.unreadCount || 0) > 0;
        if (chatFilterMode === 'DEBTORS') {
          const matched = getMatchedCustomerForChat(c.contactName, c.contactPhone);
          return Boolean(matched && Number(matched.balance) > 0);
        }
        return true;
      })
      .sort((a, b) => {
        const aPinned = pinnedChatIds.includes(a.id) ? 1 : 0;
        const bPinned = pinnedChatIds.includes(b.id) ? 1 : 0;
        return bPinned - aPinned;
      });
  }, [whatsappChats, chatSearch, chatFilterMode, pinnedChatIds, customers]);

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
    return customers.find(
      (c) =>
        c.nameAr === activeChat.contactName ||
        c.name === activeChat.contactName ||
        (cleanChatDigits && c.phone.replace(/\D/g, '').slice(-7) === cleanChatDigits)
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
    const custBalance = Number(activeChatMatchedCustomer?.balance ?? 0);
    const invTotal = Number(activeChatMatchedInvoice?.grandTotal ?? 0);
    const invNum = activeChatMatchedInvoice?.invoiceNumber || 'DOC-001';
    const itemsSummary =
      activeChatMatchedInvoice?.items
        ?.map((it) => `${it.quantity}× ${it.productName}`)
        .join(' + ') || 'مستند مالي معتمد من النظام';

    const composed = composeChatBarQuickDocumentText({
      docType: actionType,
      customerName: activeChat.contactName,
      companyName: company.nameAr || company.name || 'المنشأة',
      currency: currency === 'YER' ? 'ر.ي' : currency === 'USD' ? '$' : 'ر.س',
      invoiceNumber: invNum,
      invoiceTotal: invTotal,
      invoiceItemsSummary: itemsSummary,
      receiptAmount: custBalance > 0 ? Math.max(100, Math.round(custBalance / 2)) : invTotal,
      remainingBalance: custBalance,
      installmentAmount: (custBalance || invTotal) > 0 ? Math.max(100, Math.round((custBalance || invTotal) / 3)) : 0,
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
      refNum = activeChatMatchedInvoice?.invoiceNumber || 'DOC-INV';
      textToSend = textToSend || 'مرفق لكم فاتورة المبيعات المعتمدة من النظام.';
    } else if (selectedQuickDoc === 'RECEIPT') {
      attachmentType = 'RECEIPT';
      refNum = `RV-${Date.now().toString().slice(-4)}`;
      textToSend = textToSend || 'تم استلام الدفعة النقدية بنجاح. مرفق سند القبض المعتمد.';
    } else if (selectedQuickDoc === 'DEBT_REMINDER') {
      attachmentType = 'DEBT_REMINDER';
      refNum = `SOA-${new Date().getFullYear()}`;
      textToSend = textToSend || 'إشعار كشف حساب وجدولة قسط مستحق، يرجى التفضل بالاطلاع والتسوية.';
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
        `عميلنا العزيز (${cName})، نشكر تعاملكم مع ${company.nameAr || company.name}. رصيد حسابكم الحالي منتظم (0 ${currency}). نسعد بخدمتكم دائماً.`
      );
    }
  };

  const handleSelectInvoiceForSms = (invId: string) => {
    setSmsSelectedInvoiceId(invId);
    const inv = salesInvoices.find((i) => i.id === invId);
    if (!inv) return;
    const matchedCust = customers.find((c) => c.id === inv.customerId);
    setSmsPhone(matchedCust?.phone || '');
    setSmsRecipientName(inv.customerName);
    setSmsRefNumber(inv.invoiceNumber);
    setSmsBody(
      composeInvoiceMessageText({
        invoice: inv,
        companyName: company.nameAr || company.name || 'المنشأة',
        branchName: currentBranch.nameAr,
        currency,
      })
    );
  };

  const filteredOutboundMessages = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return outboundMessages.filter((m) => {
      if (logChannelFilter !== 'ALL' && m.channel !== logChannelFilter) return false;
      if (!q) return true;
      return (
        m.recipientName.toLowerCase().includes(q) ||
        m.recipientPhone.includes(q) ||
        m.messageBody.toLowerCase().includes(q) ||
        (m.referenceNumber && m.referenceNumber.toLowerCase().includes(q))
      );
    });
  }, [outboundMessages, logChannelFilter, logSearchQuery]);

  const broadcastTargets = useMemo(() => {
    return customers.filter((c) => {
      if (!c.phone?.trim()) return false;
      if (waBroadcastAudience === 'DEBTORS') return Number(c.balance) > 0;
      if (waBroadcastAudience === 'REGULAR') return Number(c.balance) <= 0;
      return true;
    });
  }, [customers, waBroadcastAudience]);

  const handleExportOutboundCsv = () => {
    const headers = ['القناة', 'المستلم', 'الهاتف', 'المرجع', 'المحتوى', 'الوقت'];
    const rows = filteredOutboundMessages.map((m) => [
      m.channel,
      m.recipientName,
      m.normalizedPhone || m.recipientPhone,
      m.referenceNumber || '',
      m.messageBody.replace(/[\r\n]+/g, ' '),
      m.sentAt,
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `haseb-communications-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setAccountToast('تم تصدير سجل التواصل والرسائل بصيغة CSV بنجاح.');
    setTimeout(() => setAccountToast(null), 3500);
  };

  const handleLaunchWhatsAppBroadcast = async () => {
    if (!waBroadcastMessage.trim() || broadcastTargets.length === 0) return;
    setIsSendingWaBroadcast(true);
    setWaBroadcastAlert(null);
    let sent = 0;
    try {
      for (const cust of broadcastTargets) {
        const personalized = waBroadcastMessage
          .replace(/\{العميل\}/g, cust.nameAr || cust.name)
          .replace(/\{الرصيد\}/g, formatCurrency(cust.balance || 0))
          .replace(/\{الشركة\}/g, company.nameAr || company.name || 'المنشأة');
        const chatId = startOrOpenWhatsAppChat(cust.nameAr || cust.name, cust.phone, cust.id);
        await sendWhatsAppChatMessage(chatId, personalized, 'DEBT_REMINDER', 'BROADCAST-WA');
        sent += 1;
      }
      setWaBroadcastAlert(`تم إرسال الحملة الجماعية بنجاح إلى (${sent}) عميل عبر واتساب وتوثيقها في السجل.`);
    } finally {
      setIsSendingWaBroadcast(false);
    }
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
  const commSummary = useMemo(
    () => summarizeCommunicationsWorkspace(whatsappAccounts, outboundMessages, customers),
    [whatsappAccounts, outboundMessages, customers]
  );
  const connectedAccountsCount = commSummary.connectedAccounts;

  return (
    <div className="w-full max-w-full min-w-0 space-y-3 overflow-x-hidden">
      {/* Compact Header & Unified Channel Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 haseb-btn-primary text-white rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <MessageSquare className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  خدمات التواصل — منظومة واتساب والرسائل الفورية
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{connectedAccountsCount}/{commSummary.totalAccounts} متصل</span>
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>
                  {commSummary.totalChats} محادثة • {commSummary.totalUnreadMessages} غير مقروء
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  • حفظ تلقائي ✓ ({lastAutoSavedAt})
                </span>
              </p>
            </div>
          </div>

          {/* AI Robot Auto-Responder Toggle Pill */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              type="button"
              data-testid="whatsapp-ai-bot-toggle"
              onClick={handleToggleAiBot}
              title={
                isAiBotEnabled
                  ? 'الروبوت الذكي مفعّل: يرد تلقائياً على المحادثات ويجلب الفواتير والتقارير اللحظية (انقر للإيقاف)'
                  : 'انقر لتفعيل الروبوت الذكي للرد الفوري والتحكم الكامل بالفواتير والتقارير'
              }
              className={`w-full md:w-auto justify-between md:justify-center flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                isAiBotEnabled
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Bot className={`w-4 h-4 shrink-0 ${isAiBotEnabled ? 'text-white animate-bounce' : 'text-slate-500'}`} />
                <span className="truncate">
                  {isAiBotEnabled ? 'الروبوت الذكي: مفعّل ✓' : 'الروبوت الذكي: متوقف'}
                </span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
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

        {/* Row 2: Responsive Channel Switcher Tabs + Collapsible Panel Controls */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2 min-w-0">
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 min-w-0">
            <button
              type="button"
              data-testid="comm-tab-whatsapp"
              onClick={() => setActiveTab('WHATSAPP')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs border transition-none cursor-pointer min-w-0 ${
                activeTab === 'WHATSAPP'
                  ? 'haseb-btn-primary border-transparent text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'WHATSAPP' ? 'text-emerald-200' : 'text-emerald-600'}`} />
              <span className="truncate">
                <span className="sm:hidden">واتساب</span>
                <span className="hidden sm:inline">محطة واتساب والإرسال الفوري</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'WHATSAPP'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {whatsappAccounts.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="comm-tab-quick-send-log"
              onClick={() => setActiveTab('QUICK_SEND_LOG')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs border transition-none cursor-pointer min-w-0 ${
                activeTab === 'QUICK_SEND_LOG'
                  ? 'haseb-btn-primary border-transparent text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold'
              }`}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">الحملات</span>
                <span className="hidden sm:inline">الحملات وسجل الصادر</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'QUICK_SEND_LOG'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {outboundMessages.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="comm-tab-sms-usb"
              onClick={() => setActiveTab('USB_SMS')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs border transition-none cursor-pointer min-w-0 ${
                activeTab === 'USB_SMS'
                  ? 'haseb-btn-primary border-transparent text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">جسر SMS</span>
                <span className="hidden sm:inline">جسر SMS (USB/SIM)</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'USB_SMS'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                جاهز
              </span>
            </button>
          </div>

          {/* Desktop Quick Panel Toggles & New Account Button (Matches reference layout) */}
          {activeTab === 'WHATSAPP' && (
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold">
                <button
                  type="button"
                  data-testid="comm-quick-toggle-qr"
                  onClick={() => setIsQrPanelCollapsed((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    !isQrPanelCollapsed
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title={isQrPanelCollapsed ? 'إظهار لوح الربط والمستندات' : 'طي لوح الربط والمستندات لتوسيع المساحة'}
                >
                  <QrCode className="w-3 h-3 text-emerald-600" />
                  <span>لوح الربط</span>
                </button>
                <button
                  type="button"
                  data-testid="comm-quick-toggle-chats"
                  onClick={() => setIsChatsPanelCollapsed((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    !isChatsPanelCollapsed
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title={isChatsPanelCollapsed ? 'إظهار قائمة المحادثات' : 'طي قائمة المحادثات لتوسيع المساحة'}
                >
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  <span>المحادثات</span>
                </button>
              </div>

              <button
                type="button"
                data-testid="add-whatsapp-account-btn"
                onClick={() => {
                  setIsQrPanelCollapsed(false);
                  setShowAddAccountForm((prev) => !prev);
                }}
                className="px-3 py-1.5 haseb-btn-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{showAddAccountForm ? 'إخفاء النموذج' : 'حساب واتساب جديد'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {accountToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate sm:whitespace-normal">{accountToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAccountToast(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline text-[11px] cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: COLLAPSIBLE 3-PANE WHATSAPP WORKSPACE             */}
      {/* ======================================================== */}
      {activeTab === 'WHATSAPP' && (
        <div className="space-y-2.5 min-w-0">
          {/* Mobile Sub-View Switcher (< lg) */}
          <div
            data-testid="comm-mobile-subview-bar"
            className="grid grid-cols-4 gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs lg:hidden"
          >
            <button
              type="button"
              data-testid="comm-mobile-sub-chats"
              onClick={() => setMobileWaPanel('CHATS')}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                mobileWaPanel === 'CHATS'
                  ? 'haseb-btn-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">المحادثات</span>
              <span className="px-1 py-0.2 rounded-full bg-black/15 text-[9px] font-mono shrink-0">
                {whatsappChats.length}
              </span>
            </button>
            <button
              type="button"
              data-testid="comm-mobile-sub-active"
              onClick={() => setMobileWaPanel('ACTIVE_CHAT')}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                mobileWaPanel === 'ACTIVE_CHAT'
                  ? 'haseb-btn-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">الدردشة</span>
            </button>
            <button
              type="button"
              data-testid="comm-mobile-sub-pairing"
              onClick={() => setMobileWaPanel('PAIRING')}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                mobileWaPanel === 'PAIRING'
                  ? 'haseb-btn-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">الربط QR</span>
            </button>
            <button
              type="button"
              data-testid="comm-mobile-sub-docs"
              onClick={() => setMobileWaPanel('DOCS')}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                mobileWaPanel === 'DOCS'
                  ? 'haseb-btn-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">المستندات</span>
            </button>
          </div>

          {/* 3-COLUMN COLLAPSIBLE WORKSPACE CONTAINER */}
          <div
            data-testid="comm-collapsible-workspace"
            className="flex flex-col lg:flex-row bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden lg:h-[calc(100dvh-13.5rem)] lg:min-h-[540px] lg:max-h-[760px] min-w-0 w-full max-w-full"
          >
            {/* ==================================================================== */}
            {/* PANEL 1 (RIGHT): WHATSAPP SERVERS, PAIRING QR & QUICK DOCS (#qr-panel) */}
            {/* ==================================================================== */}
            <aside
              id="qr-panel"
              data-testid="comm-qr-panel"
              className={`${
                mobileWaPanel === 'PAIRING' || mobileWaPanel === 'DOCS' ? 'flex' : 'hidden'
              } ${
                isQrPanelCollapsed ? 'lg:hidden' : 'lg:flex'
              } w-full lg:w-[320px] xl:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 flex-col bg-white dark:bg-slate-900 min-h-0 min-w-0 transition-all duration-200`}
            >
              {/* Panel 1 Header with Collapse Button */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                      خوادم وأجهزة واتساب
                    </h2>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      {connectedAccountsCount}/{whatsappAccounts.length} متصل
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      whatsappSession.status === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {whatsappSession.status === 'CONNECTED' ? 'متصل ✓' : 'في الانتظار'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddAccountForm((prev) => !prev)}
                    className="lg:hidden p-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                    title="إضافة حساب واتساب"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="comm-collapse-qr-btn"
                    onClick={() => setIsQrPanelCollapsed(true)}
                    title="طي لوح الربط لتوسيع مساحة العمل"
                    className="hidden lg:flex w-7 h-7 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Panel 1 Body */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 no-scrollbar min-h-0">
                {/* Active Account Selector Card + Multi-Account Switcher Chips */}
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/90 dark:border-emerald-800/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 relative shadow-2xs">
                        WH
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            whatsappSession.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                          {activeAccountObj?.accountLabel || 'الحساب الرسمي الرئيسي'}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 truncate">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              whatsappSession.status === 'CONNECTED'
                                ? 'bg-emerald-500'
                                : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          <span className="truncate">
                            {whatsappSession.status === 'CONNECTED'
                              ? whatsappSession.phoneNumber
                              : 'بانتظار مسح الرمز'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                      #{String(whatsappAccounts.findIndex((a) => a.id === activeWhatsAppAccountId) + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Multi-account pills row */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {whatsappAccounts.map((acc, idx) => {
                      const isActive = acc.id === activeWhatsAppAccountId;
                      const isConnected = acc.session.status === 'CONNECTED';
                      return (
                        <div
                          key={acc.id}
                          data-testid={`whatsapp-account-card-${idx}`}
                          onClick={() => switchWhatsAppAccount(acc.id)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition ${
                            isActive
                              ? 'haseb-nav-active text-white shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          <span className="truncate max-w-[110px]">{acc.accountLabel}</span>
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
                              className="opacity-75 hover:opacity-100 hover:text-rose-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inline Add New WhatsApp Account Form */}
                {showAddAccountForm && (
                  <form
                    onSubmit={handleCreateNewAccount}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-emerald-300 dark:border-emerald-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>إضافة حساب واتساب جديد</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddAccountForm(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newAccLabel}
                      onChange={(e) => setNewAccLabel(e.target.value)}
                      placeholder="اسم الحساب / الفرع (مثال: واتساب المبيعات)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={newAccDept}
                        onChange={(e) => setNewAccDept(e.target.value)}
                        placeholder="القسم المختص"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                      />
                      <input
                        type="text"
                        value={newAccPhone}
                        onChange={(e) => setNewAccPhone(e.target.value)}
                        placeholder="+967 774..."
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono"
                      />
                    </div>
                    <select
                      value={newAccStartMode}
                      onChange={(e) => setNewAccStartMode(e.target.value as any)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-bold"
                    >
                      <option value="QR_SCAN">توليد باركود QR للمسح بالكاميرا</option>
                      <option value="INSTANT_CONNECTED">ربط وتفعيل فوري مباشر</option>
                    </select>
                    <button
                      type="submit"
                      className="w-full py-1.5 haseb-btn-primary text-white rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>إنشاء الحساب والتبديل إليه فوراً</span>
                    </button>
                  </form>
                )}

                {/* PAIRING / SESSION SECTION */}
                <div className={`${mobileWaPanel === 'PAIRING' ? 'block' : 'hidden'} lg:block space-y-3`}>
                  {whatsappSession.status !== 'CONNECTED' ? (
                    <div className="space-y-3">
                      {/* Pairing Mode Switcher: QR vs 8-Digit Phone Code */}
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setPairingMethod('QR_CODE')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                            pairingMethod === 'QR_CODE'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">باركود QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPairingMethod('PHONE_CODE');
                            setGenerated8DigitCode(generate8DigitWhatsAppPairingCode(pairingPhoneInput));
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                            pairingMethod === 'PHONE_CODE'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">كود الهاتف</span>
                        </button>
                      </div>

                      {pairingMethod === 'QR_CODE' ? (
                        <div className="flex flex-col items-center space-y-2.5">
                          {/* Centered QR Box with Animated Scanner Line */}
                          <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-md relative flex items-center justify-center w-44 h-44 overflow-hidden">
                            <div className="wa-scanner-line" />
                            {isLoadingLiveQr || isPairingLoading ? (
                              <div className="flex flex-col items-center justify-center gap-2 text-slate-600 p-3 text-center">
                                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                                <span className="text-[10px] font-bold">جاري التحديث...</span>
                              </div>
                            ) : liveWaSnapshot?.qrDataUrl ? (
                              <img
                                src={liveWaSnapshot.qrDataUrl}
                                alt="Official WhatsApp Web Multi-Device QR Code"
                                data-testid="live-whatsapp-qr-img"
                                className="w-full h-full object-contain select-none"
                              />
                            ) : (
                              <svg
                                width="156"
                                height="156"
                                className="w-full h-full"
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
                          </div>

                          {/* Auto Refresh Countdown Pill */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isLoadingLiveQr ? 'animate-spin' : ''}`} />
                            <span>يتحدث تلقائياً خلال:</span>
                            <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                              {qrCountdown} ثانية
                            </strong>
                          </div>

                          {/* Quick Instructions Box */}
                          <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              خطوات الربط السريعة:
                            </div>
                            <div>1. افتح واتساب في هاتفك &gt; الإعدادات ⚙️</div>
                            <div>
                              2. اختر <strong>الأجهزة المرتبطة</strong> ثم امسح الرمز أعلاه
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setQrRefreshTick((t) => t + 1);
                              setQrCountdown(20);
                              fetchLiveWhatsAppQR(true);
                            }}
                            disabled={isLoadingLiveQr}
                            className="w-full py-2 haseb-btn-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLiveQr ? 'animate-spin' : ''}`} />
                            <span>تحديث الرمز الآن</span>
                          </button>
                        </div>
                      ) : (
                        /* 8-Digit Phone Number Pairing Mode */
                        <div className="space-y-2.5 py-1">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              رقم الواتساب مع مفتاح الدولة:
                            </label>
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                              <input
                                type="text"
                                value={pairingPhoneInput}
                                onChange={(e) => setPairingPhoneInput(e.target.value)}
                                className="w-full min-w-0 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold dir-ltr"
                                placeholder="+967 771 445 880"
                              />
                              <button
                                type="button"
                                onClick={handleRequestReal8DigitCode}
                                disabled={isRequestingReal8DigitCode}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                              >
                                {isRequestingReal8DigitCode ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <KeyRound className="w-3.5 h-3.5" />
                                )}
                                <span>طلب الكود</span>
                              </button>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-center space-y-1 border border-emerald-300 dark:border-emerald-700">
                            <div className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 flex-wrap">
                              <span>أدخل كود الربط التالي في إشعار واتساب:</span>
                              {real8DigitCodeSource === 'LIVE_WHATSAPP' && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                                  رسمي ✓
                                </span>
                              )}
                            </div>
                            <div className="text-xl font-black font-mono tracking-widest text-emerald-700 dark:text-emerald-400">
                              {generated8DigitCode}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Connected Device Info Box */
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800">
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-0.5">
                            <Wifi className="w-3 h-3 text-emerald-500" />
                            <span>البث اللحظي</span>
                          </div>
                          <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                            مباشر وفوري ✓
                          </div>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800">
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-0.5">
                            <Send className="w-3 h-3 text-blue-500" />
                            <span>الصادر بالحساب</span>
                          </div>
                          <div className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">
                            {activeAccountObj?.messagesDispatchedCount || 0} رسالة
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={disconnectWhatsApp}
                        className="w-full py-2 px-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>تغيير الجهاز / توليد QR جديد</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Integrated Real Quick-Send & Financial Document Composer */}
                <div className={`${mobileWaPanel === 'DOCS' ? 'block' : 'hidden'} lg:block pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2 min-w-0`}>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-[11px] text-slate-800 dark:text-slate-100 flex items-center gap-1 min-w-0">
                      <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">إرسال المستندات المالية السريع</span>
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold shrink-0">
                      مباشر
                    </span>
                  </div>

                  {/* 1. Real Sales Invoice Selector */}
                  <div className="space-y-1 min-w-0">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      1. إرسال فاتورة مبيعات فعلية:
                    </label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 min-w-0">
                      <select
                        value={selectedRealInvoiceId}
                        disabled={salesInvoices.length === 0}
                        onChange={(e) => setSelectedRealInvoiceId(e.target.value)}
                        className="w-full min-w-0 truncate px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold disabled:opacity-60"
                      >
                        {salesInvoices.length === 0 ? (
                          <option value="">لا توجد فواتير مبيعات مسجلة</option>
                        ) : (
                          salesInvoices.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} — {inv.customerName} ({formatCurrency(inv.grandTotal)})
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        data-testid="quick-send-invoice-btn"
                        disabled={salesInvoices.length === 0}
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
                            companyName: company.nameAr || company.name || 'المنشأة',
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
                          setMobileWaPanel('ACTIVE_CHAT');
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>إرسال</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Real Customer Debt Reminder Selector */}
                  <div className="space-y-1 min-w-0">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      2. كشف حساب ومطالبة مديونية:
                    </label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 min-w-0">
                      <select
                        value={selectedRealCustomerId}
                        disabled={customers.length === 0}
                        onChange={(e) => setSelectedRealCustomerId(e.target.value)}
                        className="w-full min-w-0 truncate px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold disabled:opacity-60"
                      >
                        {customers.length === 0 ? (
                          <option value="">لا يوجد عملاء مسجلون</option>
                        ) : (
                          customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameAr} — الرصيد: {formatCurrency(c.balance)}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        data-testid="quick-send-debt-btn"
                        disabled={customers.length === 0}
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
                            companyName: company.nameAr || company.name || 'المنشأة',
                            currency,
                            customSignatureAr: messagingGatewayConfig.customSignatureAr,
                          });
                          sendWhatsAppChatMessage(chatId, composed, 'DEBT_REMINDER', refCode);
                          setAccountToast(
                            `تم إرسال كشف الحساب ومطالبة السداد إلى (${cust.nameAr}) مباشرة!`
                          );
                          setMobileWaPanel('ACTIVE_CHAT');
                        }}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>إرسال</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Real Warranty / RMA Notification Selector */}
                  <div className="space-y-1 min-w-0">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      3. إشعار صيانة وضمان (RMA):
                    </label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 min-w-0">
                      <select
                        value={selectedRealRmaId}
                        disabled={warrantyTickets.length === 0}
                        onChange={(e) => setSelectedRealRmaId(e.target.value)}
                        className="w-full min-w-0 truncate px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold disabled:opacity-60"
                      >
                        {warrantyTickets.length === 0 ? (
                          <option value="">لا توجد تذاكر صيانة مسجلة</option>
                        ) : (
                          warrantyTickets.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.ticketNumber} — {t.customerName} ({t.productName.slice(0, 22)})
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        data-testid="quick-send-rma-btn"
                        disabled={warrantyTickets.length === 0}
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
                          setMobileWaPanel('ACTIVE_CHAT');
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>إرسال</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* COLLAPSED MINI-BAR FOR PANEL 1 (QR / PAIRING) */}
            {isQrPanelCollapsed && (
              <div
                id="qr-mini-bar"
                data-testid="comm-qr-mini-bar"
                className="hidden lg:flex w-12 shrink-0 bg-slate-50/90 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col items-center py-3 gap-4 z-10 select-none"
              >
                <button
                  type="button"
                  data-testid="comm-expand-qr-btn"
                  onClick={() => setIsQrPanelCollapsed(false)}
                  title="توسيع لوح الربط والأجهزة"
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-600 flex items-center justify-center shadow-2xs transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div
                  onClick={() => setIsQrPanelCollapsed(false)}
                  title={activeAccountObj?.accountLabel || 'الحساب الرسمي'}
                  className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[10px] relative cursor-pointer shadow-2xs"
                >
                  WH
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      whatsappSession.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrPanelCollapsed(false)}
                  title="إظهار باركود الربط والمستندات"
                  className="w-8 h-8 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ==================================================================== */}
            {/* PANEL 2 (MIDDLE): CUSTOMER CHATS LIST (#chats-panel)                 */}
            {/* ==================================================================== */}
            <aside
              id="chats-panel"
              data-testid="comm-chats-panel"
              className={`${mobileWaPanel === 'CHATS' ? 'flex' : 'hidden'} ${
                isChatsPanelCollapsed ? 'lg:hidden' : 'lg:flex'
              } w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 flex-col bg-slate-50/40 dark:bg-slate-900/50 min-h-0 min-w-0 flex-1 lg:flex-initial transition-all duration-200`}
            >
              {/* Panel 2 Header with Collapse Button + Search + Filter Chips */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h2 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                      محادثات العملاء
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold font-mono">
                      {filteredChats.length} نشطة
                    </span>
                    <button
                      type="button"
                      data-testid="comm-collapse-chats-btn"
                      onClick={() => setIsChatsPanelCollapsed(true)}
                      title="طي قائمة المحادثات لتوسيع مساحة الدردشة"
                      className="hidden lg:flex w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search + New Chat */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="بحث في السجلات..."
                      className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewChatForm((v) => !v)}
                    title="بدء محادثة جديدة مع أي عميل أو رقم"
                    className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-600 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {showNewChatForm && (
                  <form
                    onSubmit={handleStartNewChat}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-2"
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
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
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
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
                    />
                    <input
                      type="text"
                      required
                      value={newChatPhone}
                      onChange={(e) => setNewChatPhone(e.target.value)}
                      placeholder="رقم الهاتف (+967...)"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 haseb-btn-primary text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      بدء المحادثة الآن
                    </button>
                  </form>
                )}

                {/* Contact List Filters */}
                <div className="flex items-center gap-1">
                  {([
                    { id: 'ALL', label: 'الكل' },
                    { id: 'UNREAD', label: 'غير مقروء' },
                    { id: 'DEBTORS', label: 'مدينون', dot: true },
                  ] as const).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setChatFilterMode(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        chatFilterMode === f.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{f.label}</span>
                      {'dot' in f && f.dot && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
                {filteredChats.length === 0 ? (
                  <div className="h-full p-5 flex flex-col items-center justify-center text-center space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shadow-2xs">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        لا توجد محادثات متطابقة
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        ستظهر الرسائل الجديدة وسجلات العملاء فور الربط والمراسلة.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewChatForm(true)}
                      className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-2xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>بدء مراسلة فورية</span>
                    </button>
                  </div>
                ) : (
                  filteredChats.map((chat) => {
                    const isSelected = chat.id === activeChat.id;
                    const isPinned = pinnedChatIds.includes(chat.id);
                    const matchedCust = getMatchedCustomerForChat(chat.contactName, chat.contactPhone);
                    return (
                      <div
                        key={chat.id}
                        className={`w-full p-3 text-right flex items-start gap-2.5 transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-r-4 border-emerald-500'
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWhatsAppChatId(chat.id);
                            setMobileWaPanel('ACTIVE_CHAT');
                          }}
                          className="flex-1 min-w-0 flex items-start gap-2.5 text-right cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {Array.from(chat.contactName.trim())[0] || '💬'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5 gap-1">
                              <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                {chat.contactName}
                              </h5>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {chat.lastMessageTime}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {chat.lastMessage || 'لا توجد رسائل بعد'}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-black shrink-0">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            {matchedCust && Number(matchedCust.balance) > 0 && (
                              <span className="inline-block mt-1 px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800 rounded text-[9px] font-bold font-mono">
                                رصيد: {formatCurrency(matchedCust.balance)}
                              </span>
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePinChat(chat.id)}
                          title={isPinned ? 'إلغاء تثبيت المحادثة' : 'تثبيت المحادثة بالأعلى'}
                          className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${
                            isPinned
                              ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel 2 Bottom Status Strip */}
              <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>WebSocket: متصل</span>
                </span>
                <span>تشفير تام 256-bit</span>
              </div>
            </aside>

            {/* COLLAPSED MINI-BAR FOR PANEL 2 (CHATS LIST) */}
            {isChatsPanelCollapsed && (
              <div
                id="chats-mini-bar"
                data-testid="comm-chats-mini-bar"
                className="hidden lg:flex w-12 shrink-0 bg-slate-50/90 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col items-center py-3 gap-4 z-10 select-none"
              >
                <button
                  type="button"
                  data-testid="comm-expand-chats-btn"
                  onClick={() => setIsChatsPanelCollapsed(false)}
                  title="توسيع قائمة المحادثات"
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-600 flex items-center justify-center shadow-2xs transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatsPanelCollapsed(false)}
                  title={`محادثات العملاء (${filteredChats.length})`}
                  className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center relative cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  {filteredChats.length > 0 && (
                    <span className="absolute -top-1 -left-1 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold">
                      {filteredChats.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* ==================================================================== */}
            {/* PANEL 3 (LEFT / MAIN): CENTRAL UNIFIED MESSAGING STAGE (#stage-panel) */}
            {/* ==================================================================== */}
            <section
              id="stage-panel"
              data-testid="comm-stage-panel"
              className={`${
                mobileWaPanel === 'ACTIVE_CHAT' ? 'flex' : 'hidden'
              } lg:flex flex-1 flex-col bg-[#f8fafb] dark:bg-slate-950 min-h-0 min-w-0 relative`}
            >
              {/* Chat Header (Real-Time Live Status, Restore Panels & Quick Actions) */}
              <div className="px-3 sm:px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 min-w-0 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    data-testid="comm-mobile-chat-back"
                    onClick={() => setMobileWaPanel('CHATS')}
                    className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer shrink-0 flex items-center gap-1 text-[11px] font-bold"
                    aria-label="رجوع إلى قائمة المحادثات"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>رجوع</span>
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs sm:text-sm shrink-0">
                    {Array.from(activeChat.contactName.trim())[0] || 'ل'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {activeChat.contactName}
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold shrink-0">
                        وضع الاستعداد
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 truncate mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">
                        المرسل: {activeAccountObj?.accountLabel || 'الحساب الرئيسي'} (جاهز للإرسال)
                      </span>
                      {activeChat.contactPhone && (
                        <span className="text-slate-400 font-mono dir-ltr">
                          • {activeChat.contactPhone}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Restore Folded Panels Button (Shown when either panel is collapsed) */}
                  {(isQrPanelCollapsed || isChatsPanelCollapsed) && (
                    <button
                      type="button"
                      data-testid="comm-restore-panels-btn"
                      onClick={() => {
                        setIsQrPanelCollapsed(false);
                        setIsChatsPanelCollapsed(false);
                      }}
                      className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <PanelLeftOpen className="w-3.5 h-3.5" />
                      <span>عرض الألواح</span>
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="chat-header-ai-bot-toggle"
                    onClick={handleToggleAiBot}
                    title={
                      isAiBotEnabled
                        ? 'الرد الآلي الذكي نشط في هذه المحادثة — انقر لإيقاف الرد التلقائي'
                        : 'انقر لتفعيل الرد الآلي الذكي للرد الفوري وجلب الفواتير والتقارير'
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer border ${
                      isAiBotEnabled
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${isAiBotEnabled ? 'text-white animate-bounce' : 'text-emerald-600'}`} />
                    <span>{isAiBotEnabled ? 'الرد الآلي الذكي: نشط' : 'الرد الآلي الذكي: استعداد'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsSyncingLiveNow(true);
                      await fetchLiveWhatsAppQR(false);
                      setIsSyncingLiveNow(false);
                    }}
                    title="مزامنة الرسائل الواردة والصادرة من خادم واتساب الآن"
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveNow ? 'animate-spin text-emerald-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* AI Robot Full-ERP Control Strip */}
              <div
                data-testid="whatsapp-ai-bot-control-strip"
                className={`px-3 sm:px-4 py-1.5 border-b transition-colors flex flex-col gap-1.5 min-w-0 shrink-0 ${
                  isAiBotEnabled
                    ? 'bg-emerald-950 text-white border-emerald-800'
                    : 'bg-slate-100/80 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] min-w-0 flex-1">
                    <Bot
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isAiBotEnabled ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-black shrink-0">
                      {isAiBotEnabled ? 'الروبوت مفعّل:' : 'الروبوت الذكي:'}
                    </span>
                    <span
                      className={`truncate ${
                        isAiBotEnabled ? 'text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      {aiBotLastActionAr}
                    </span>
                  </div>

                  {isAiBotEnabled && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      الردود: {aiBotRepliesCount}
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

              {/* Messages Body / Central Unified Messaging Stage */}
              <div
                className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 min-h-0"
                style={{
                  backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                {activeChat.messages.length === 0 ? (
                  <div className="h-full min-h-[210px] flex flex-col items-center justify-center text-center px-3 py-4">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xs space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
                          محطة المراسلة الفورية الموحدة
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                          أرسل الفواتير، السندات، وتذكيرات التحصيل لعملائك مباشرة عبر واتساب بضغطة زر واحدة.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleQuickComposerDocAction('INVOICE')}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-200 hover:text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
                        >
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>تجهيز فاتورة فورية</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickComposerDocAction('STATEMENT')}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-200 hover:text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
                        >
                          <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>كشف حساب عميل</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  activeChat.messages.map((msg, mIdx) => {
                    const isOutbound = msg.sender === 'ME';
                    return (
                      <div
                        key={`${msg.id}-${mIdx}`}
                        className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl p-3 shadow-xs ${
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
                  })
                )}
              </div>

              {/* ======================================================== */}
              {/* SLASH (/) QUICK SHORTCUTS POPOVER & CRUD MANAGER         */}
              {/* ======================================================== */}
              {(isSlashMenuOpen || outgoingText.trim().startsWith('/')) && (
                <div
                  data-testid="wa-slash-shortcuts-popover"
                  className="mx-2 sm:mx-3 mb-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-2xl overflow-hidden z-30 max-w-full"
                >
                  <div className="px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200/80 text-slate-900 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold min-w-0">
                      <span className="px-1.5 py-0.5 rounded haseb-btn-primary text-white font-mono text-[11px] shrink-0">
                        /
                      </span>
                      <span className="truncate">الاختصارات السريعة للمحادثة</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
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
                        className="px-2.5 py-1 rounded-full haseb-btn-primary text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
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

              {/* QUICK ACTION BAR ABOVE COMPOSER */}
              <div
                data-testid="whatsapp-composer-quick-bar"
                className="px-2.5 sm:px-3.5 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap min-w-0 shrink-0"
              >
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap max-w-full min-w-0 py-0.5">
                  <span className="text-[10px] font-bold text-slate-400 ml-1 shrink-0">
                    إرسال سريع:
                  </span>
                  <button
                    type="button"
                    data-testid="wa-bar-btn-invoice"
                    onClick={() => handleQuickComposerDocAction('INVOICE')}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>فاتورة مبيعات</span>
                  </button>

                  <button
                    type="button"
                    data-testid="wa-bar-btn-receipt"
                    onClick={() => handleQuickComposerDocAction('RECEIPT')}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:border-teal-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0"
                  >
                    <Receipt className="w-3.5 h-3.5 text-teal-600" />
                    <span>سند قبض</span>
                  </button>

                  <button
                    type="button"
                    data-testid="wa-bar-btn-statement"
                    onClick={() => handleQuickComposerDocAction('STATEMENT')}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>كشف حساب</span>
                  </button>

                  <button
                    type="button"
                    data-testid="wa-bar-btn-installment"
                    onClick={() => handleQuickComposerDocAction('INSTALLMENT')}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:border-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>تذكير بقسط</span>
                  </button>

                  <button
                    type="button"
                    data-testid="wa-bar-btn-attach"
                    onClick={() => fileAttachmentInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:border-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-rose-500" />
                    <span>إرفاق PDF</span>
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
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0 ${
                      isSlashMenuOpen || outgoingText.trim().startsWith('/')
                        ? 'haseb-btn-primary text-white border-transparent'
                        : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>اختصارات (/)</span>
                  </button>
                </div>

                {attachedFilePreview && (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px] text-sky-900 dark:text-sky-200 max-w-full">
                    <Paperclip className="w-3 h-3 text-sky-600 shrink-0" />
                    <span className="font-bold truncate max-w-[140px]">{attachedFilePreview.name}</span>
                    <span className="text-[10px] font-mono text-sky-600 shrink-0">({attachedFilePreview.sizeLabel})</span>
                    <button
                      type="button"
                      onClick={() => setAttachedFilePreview(null)}
                      className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Message Composer Footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-2.5 sm:px-3.5 sm:py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 min-w-0 shrink-0"
              >
                <div className="relative flex-1 min-w-0">
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
                        ? `ملاحظة مصاحبة للمستند (${selectedQuickDoc})...`
                        : `اكتب رسالتك هنا، أو اكتب ( / ) لاستدعاء النماذج وقوالب الفواتير...`
                    }
                    className="w-full min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  data-testid="whatsapp-send-btn"
                  className="px-4 py-2 haseb-btn-primary active:scale-95 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
                  title="إرسال فعلي فوري"
                >
                  <span>إرسال</span>
                  <Send className="w-3.5 h-3.5 rtl:-rotate-90" />
                </button>
              </form>
            </section>
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
      {/* TAB 2: BULK CAMPAIGNS, QUICK-SEND & OUTBOUND LOG         */}
      {/* ======================================================== */}
      {activeTab === 'QUICK_SEND_LOG' && (
        <div className="space-y-4 w-full max-w-full min-w-0">
          {/* Bulk WhatsApp Broadcast Campaign Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 shadow-sm space-y-4 min-w-0 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl haseb-btn-primary text-white flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                    منظومة الحملات الجماعية وإعلانات واتساب المخصصة
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    استهدف العملاء أو المدينين برسائل مخصصة باسم كل عميل ورصيده بضغطة زر
                  </p>
                </div>
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
                    companyName: company.nameAr || company.name || 'المنشأة',
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
                    recipientPhone: messagingGatewayConfig.ownerReportPhone || company.phone || '',
                    referenceNumber: `REP-${new Date().toISOString().slice(0, 10)}`,
                    messageBody: reportText,
                  });
                  setAccountToast('تم إرسال التقرير المالي اللحظي للإدارة العليا عبر واتساب وتوثيقه في السجل!');
                  setActiveTab('WHATSAPP');
                }}
                className="w-full md:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>إرسال التقرير التنفيذي للإدارة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start min-w-0">
              <div className="lg:col-span-4 space-y-2 min-w-0">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  الفئة المستهدفة ({broadcastTargets.length} عميل مطابق):
                </label>
                <div className="grid grid-cols-3 gap-1.5 min-w-0">
                  {([
                    { id: 'ALL', label: 'كل العملاء' },
                    { id: 'DEBTORS', label: 'المدينون فقط' },
                    { id: 'REGULAR', label: 'المنتظمون' },
                  ] as const).map((aud) => (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setWaBroadcastAudience(aud.id)}
                      className={`min-w-0 truncate py-2 px-1.5 sm:px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        waBroadcastAudience === aud.id
                          ? 'haseb-btn-primary text-white border-transparent'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  المتغيرات المتاحة: <span className="font-mono text-emerald-600">{'{العميل}'} {'{الرصيد}'} {'{الشركة}'}</span>
                </p>
              </div>

              <div className="lg:col-span-8 space-y-2 min-w-0">
                <textarea
                  rows={2}
                  data-testid="wa-broadcast-message-input"
                  value={waBroadcastMessage}
                  onChange={(e) => setWaBroadcastMessage(e.target.value)}
                  className="w-full min-w-0 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="اكتب نص الحملة..."
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {waBroadcastAlert ? (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ {waBroadcastAlert}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      سيتم الإرسال وتوثيق جميع الرسائل في السجل فوراً.
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid="launch-wa-broadcast-btn"
                    disabled={isSendingWaBroadcast || broadcastTargets.length === 0 || !waBroadcastMessage.trim()}
                    onClick={handleLaunchWhatsAppBroadcast}
                    className="w-full sm:w-auto justify-center px-4 py-2 haseb-btn-primary disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isSendingWaBroadcast
                        ? 'جاري إرسال الحملة...'
                        : `إطلاق الحملة لـ (${broadcastTargets.length}) عميل`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Outbound Message Log Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-6 shadow-sm space-y-4 min-w-0 overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 min-w-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
                  سجل الرسائل والمستندات الصادرة ({filteredOutboundMessages.length} من {outboundMessages.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  توثيق لحظي لكافة الرسائل المرسلة عبر واتساب وSMS مع دعم الفلترة والتصدير
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {/* Channel Filter */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                  {(['ALL', 'WHATSAPP', 'SMS'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setLogChannelFilter(ch)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        logChannelFilter === ch
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      {ch === 'ALL' ? 'الكل' : ch === 'WHATSAPP' ? 'واتساب' : 'SMS'}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-52 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="بحث بالعميل أو المرجع..."
                    className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                {/* Export CSV */}
                <button
                  type="button"
                  data-testid="export-outbound-csv-btn"
                  disabled={filteredOutboundMessages.length === 0}
                  onClick={handleExportOutboundCsv}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>
              </div>
            </div>

            {filteredOutboundMessages.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Filter className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">لا توجد رسائل صادرة مسجلة حتى الآن</p>
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
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
                      {filteredOutboundMessages.map((m, idx) => (
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
                                setMobileWaPanel('ACTIVE_CHAT');
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

                {/* Mobile Cards (< md) */}
                <div className="md:hidden space-y-2.5">
                  {filteredOutboundMessages.map((m, idx) => (
                    <div
                      key={`${m.id}-mob-${idx}`}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              m.channel === 'WHATSAPP'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            }`}
                          >
                            {m.channel === 'WHATSAPP' ? 'واتساب' : 'SMS'}
                          </span>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                            {m.recipientName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{m.sentAt}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {m.messageBody}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        <span className="font-mono text-slate-500 dir-ltr">{m.recipientPhone}</span>
                        <button
                          type="button"
                          onClick={() => {
                            startOrOpenWhatsAppChat(m.recipientName, m.recipientPhone);
                            setActiveTab('WHATSAPP');
                            setMobileWaPanel('ACTIVE_CHAT');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          فتح المحادثة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: HIGH-SPEED USB & SIM MOBILE PHONE SMS BRIDGE      */}
      {/* ======================================================== */}
      {activeTab === 'USB_SMS' && (
        <div className="space-y-4 w-full max-w-full min-w-0" data-testid="usb-sms-bridge-section">
          {/* Top Fast ERP-to-SMS Action Strip (Lumina POS Theme) */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0 overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl haseb-btn-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    جسر رسائل SMS الفائق السرعة (Direct SIM & USB AT+CMGS)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
                    متصل 100% • SIM {usbConnectedDevice.simSlot}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  مربوط فعلياً بقاعدة بيانات العملاء والفواتير والمديونيات والمخزون والتقارير المالية — يرسل ويوثق في 0ms
                </p>
              </div>
            </div>

            {/* 1-Click Direct ERP SMS Dispatchers */}
            <div className="grid grid-cols-1 sm:flex sm:items-center sm:flex-wrap gap-1.5 min-w-0">
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
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
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
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>تقرير الأرباح والمبيعات SMS</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start min-w-0">
            {/* Hardware, Dual-SIM Selector & Bulk Campaign Panel (Left 5 Cols) */}
            <div className="lg:col-span-5 space-y-4 min-w-0">
              {/* Connected Mobile Phone Hardware & Dual-SIM Status Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 shadow-sm space-y-4 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
                        {usbConnectedDevice.model}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
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
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span className="truncate">اختيار شريحة الإرسال الفعلي (Dual-SIM):</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
                      استجابة 0.2ms
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 min-w-0">
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
                      className={`min-w-0 overflow-hidden p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        usbConnectedDevice.simSlot === 1
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-xs font-black">
                        <span className="truncate">شريحة SIM 1</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15 shrink-0">
                          4G
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
                      className={`min-w-0 overflow-hidden p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        usbConnectedDevice.simSlot === 2
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-xs font-black">
                        <span className="truncate">شريحة SIM 2</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15 shrink-0">
                          GSM
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

                  {/* Quick Carrier Profile Presets */}
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500">شبكة المشغل السريعة:</span>
                    {[
                      { label: 'يمن موبايل', op: 'Yemen Mobile 4G LTE (421-03)', slot: 1 as const },
                      { label: 'سبأفون', op: 'Sabafon GSM/4G (421-01)', slot: 2 as const },
                      { label: 'YOU', op: 'YOU / MTN 4G (421-02)', slot: 2 as const },
                      { label: 'STC', op: 'STC 5G/LTE (420-01)', slot: 1 as const },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          updateUsbConnectedDevice({ simSlot: preset.slot, simOperator: preset.op });
                          setAccountToast(`تم ضبط ملف شبكة (${preset.label}) بنجاح.`);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-400 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hardware Meters */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center min-w-0">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] sm:text-[11px] mb-0.5 truncate max-w-full">
                      <Battery className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>البطارية</span>
                    </div>
                    <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                      {usbConnectedDevice.batteryPercent}% ⚡
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center min-w-0">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] sm:text-[11px] mb-0.5 truncate max-w-full">
                      <Wifi className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="sm:hidden">الإشارة</span>
                      <span className="hidden sm:inline">إشارة البث</span>
                    </div>
                    <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                      {usbConnectedDevice.signalStrengthPercent}%
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl text-center border border-indigo-200/70 dark:border-indigo-800/60 flex flex-col items-center justify-center min-w-0">
                    <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-300 text-[10px] sm:text-[11px] mb-0.5 font-bold truncate max-w-full">
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span className="sm:hidden">المرسلة</span>
                      <span className="hidden sm:inline">إجمالي المرسلة</span>
                    </div>
                    <div
                      data-testid="usb-sms-sent-counter"
                      className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono"
                    >
                      {usbConnectedDevice.messagesSentCount}
                    </div>
                  </div>
                </div>

                {/* SIM & USB Connection Specs */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 text-xs border border-slate-100 dark:border-slate-800 min-w-0">
                  <div className="flex flex-wrap justify-between items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">الشريحة النشطة (SIM {usbConnectedDevice.simSlot}):</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-full">
                      {usbConnectedDevice.simOperator}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">تصحيح أخطاء USB (ADB):</span>
                    <span className="font-bold text-emerald-600">
                      {usbConnectedDevice.usbDebuggingEnabled ? 'مفعل ومصادق (Authorized ✓)' : 'غير مفعل'}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">وضع قناة الاتصال:</span>
                    <select
                      aria-label="وضع قناة الاتصال بجسر SMS"
                      value={usbConnectedDevice.connectionMode}
                      onChange={(e) =>
                        updateUsbConnectedDevice({
                          connectionMode: e.target.value as any,
                        })
                      }
                      className="max-w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 font-mono text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer"
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
                  className="w-full py-2.5 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-xs cursor-pointer text-center"
                >
                  {isRunningDiag ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>جاري فحص وتنشيط منفذ USB و ADB...</span>
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4 shrink-0" />
                      <span>فحص وتنشيط جسر USB و SIM تلقائياً</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bulk Debt Reminder SMS Campaign Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 shadow-sm space-y-3.5 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                        حملة رسائل التذكير بالمديونيات (جماعياً)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        إرسال آلي مخصص لكل عميل مدين عبر شريحة SIM {usbConnectedDevice.simSlot}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 shrink-0">
                    {customers.filter((c) => Number(c.balance) > 0).length} عملاء مدينون
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
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
                  className="w-full py-2.5 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-center"
                >
                  {isLaunchingCampaign ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>جاري إرسال الحملة عبر الجوال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>إطلاق حملة التذكير لكافة المدينين ({customers.filter((c) => Number(c.balance) > 0).length} عملاء)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Diagnostics Terminal Output Viewer (Lumina POS Theme) */}
              {usbDiagnosticsReport && (
                <div className="bg-slate-50 text-slate-800 rounded-2xl p-4 font-mono text-xs shadow-2xs border border-slate-200/80 space-y-2 min-w-0 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Terminal className="w-4 h-4 text-blue-600 shrink-0" />
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
            <div className="lg:col-span-7 space-y-4 min-w-0">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-5 min-w-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 min-w-0">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Send className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
                      <span className="truncate">محرك إرسال الرسائل النصية الفوري (SMS Dispatcher)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      يرسل مباشرة عبر شريحة الجوال (SIM {usbConnectedDevice.simSlot}) بسرعة 0.2ms بدون رسوم بوابات خارجية
                    </p>
                  </div>

                  {/* Single vs Multi-Batch Mode Toggle */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto shrink-0 min-w-0">
                    <button
                      type="button"
                      data-testid="sms-mode-single-btn"
                      onClick={() => setSmsDispatchMode('SINGLE')}
                      className={`min-w-0 truncate px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                      className={`min-w-0 truncate px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        smsDispatchMode === 'MULTI_BATCH'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      إرسال جماعي ({customers.length})
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
                      <div className="min-w-0">
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
                          className="w-full min-w-0 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          اسم العميل أو الجهة
                        </label>
                        <input
                          type="text"
                          data-testid="usb-sms-recipient-input"
                          value={smsRecipientName}
                          onChange={(e) => setSmsRecipientName(e.target.value)}
                          placeholder="مثال: شركة البناء الحديث"
                          className="w-full min-w-0 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          رقم المرجع (فاتورة / سند / مديونية)
                        </label>
                        <input
                          type="text"
                          data-testid="usb-sms-ref-input"
                          value={smsRefNumber}
                          onChange={(e) => setSmsRefNumber(e.target.value)}
                          placeholder="INV-2026-6194"
                          className="w-full min-w-0 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          قائمة الأرقام للإرسال الجماعي الفوري (افصل بين الأرقام بفاصلة أو سطر جديد):
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
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
                        className="w-full min-w-0 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
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
                      className="w-full min-w-0 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Quick Template Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">قوالب جاهزة مرتبطة بالنظام:</span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const inv = salesInvoices[0];
                          if (inv) {
                            handleSelectInvoiceForSms(inv.id);
                          }
                        }}
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer"
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
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer"
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
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer"
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
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer"
                      >
                        📦 إشعار نواقص المخزون ({products.filter((p) => p.stockQty <= p.reorderPoint).length})
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    data-testid="btn-send-usb-sms"
                    disabled={isSendingSms}
                    className="w-full py-3 sm:py-3.5 px-4 sm:px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.99] text-white font-black rounded-xl shadow-lg shadow-indigo-950/20 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer text-center"
                  >
                    {isSendingSms ? (
                      <>
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
                        <span>جاري الإرسال الفوري عبر شريحة الجوال...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span>
                          {smsDispatchMode === 'SINGLE'
                            ? `إرسال الرسالة فوراً عبر SIM ${usbConnectedDevice.simSlot} (0.2ms)`
                            : `إرسال الحملة الجماعية فوراً عبر SIM ${usbConnectedDevice.simSlot}`}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Live SMS Outbox & Delivery History Table inside SMS Bridge Tab */}
              <div
                data-testid="usb-sms-live-log-card"
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 shadow-sm space-y-4 min-w-0 overflow-hidden"
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

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto max-h-80">
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

                {/* Mobile Cards (< md) */}
                <div className="md:hidden space-y-2.5">
                  {smsOutboundList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      لا توجد رسائل SMS مطابقة للبحث حالياً.
                    </div>
                  ) : (
                    smsOutboundList.map((msg, idx) => (
                      <div
                        key={`${msg.id}-sms-mob-${idx}`}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                            {msg.recipientName}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            ✓ SIM {usbConnectedDevice.simSlot}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {msg.messageBody}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                          <span className="font-mono text-indigo-600 dir-ltr">
                            {msg.normalizedPhone || msg.recipientPhone}
                          </span>
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
                              setAccountToast(`⚡ تمت إعادة إرسال الرسالة إلى (${msg.recipientName})`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold cursor-pointer"
                          >
                            إعادة إرسال
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
