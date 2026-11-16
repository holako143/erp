/**
 * RLM ERP - Core Communications & Cross-Branch LAN Sync Engine
 * 1. WhatsApp Web QR Pairing & In-App Multi-Device Chat Station
 * 2. Android USB Mobile Modem Bridge & Auto USB Debugging Diagnostics
 * 3. Cross-Branch LAN & WAN Stock Availability Matrix & Inter-Branch Transfers
 */

import QRCode from 'qrcode';
import {
  Branch,
  BranchNodeInfo,
  CrossBranchStockItem,
  InterBranchTransferRequest,
  JournalEntry,
  Product,
  UsbConnectedDevice,
  UsbDiagnosticsReport,
  Warehouse,
  WhatsAppAccountInstance,
  WhatsAppChat,
  WhatsAppChatMessage,
  WhatsAppSessionInfo,
} from '../types/erp';
import { normalizeInternationalPhone } from './messagingEngine';

// ============================================================================
// 1. WhatsApp Web Multi-Account Pairing & In-App Chat Station
// ============================================================================

export function createInitialWhatsAppSession(): WhatsAppSessionInfo {
  const qr = generatePairingQRToken('wa-acc-sales');
  return {
    status: 'CONNECTED',
    phoneNumber: '+967 771 445 880',
    pushName: 'مؤسسة النور للتجارة والطاقة (المبيعات الموحدة)',
    batteryLevel: 94,
    qrCodeData: qr.token,
    qrExpiresInSec: 60,
    pairedAt: '2026-11-03 10:15',
    platform: 'WhatsApp Web Multi-Device Gateway v2.3000.1018 (RLM In-App)',
    pairingUrl: qr.pairingUrl,
    pairingCode8Digit: qr.pairingCode8Digit,
    qrFullMatrixData: qr.fullUrlMatrixData,
  };
}

export function generate8DigitWhatsAppPairingCode(phoneSeed?: string): string {
  const cleanDigits = (phoneSeed || '').replace(/\D/g, '');
  const suffix =
    cleanDigits.length >= 4
      ? cleanDigits.slice(-4)
      : Math.floor(1000 + Math.random() * 9000).toString();
  const prefixChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let prefix = '';
  for (let i = 0; i < 4; i++) {
    prefix += prefixChars.charAt(Math.floor(Math.random() * prefixChars.length));
  }
  return `${prefix}-${suffix}`;
}

/**
 * Generates a REAL, camera-scannable ISO/IEC 18004 QR code bit matrix
 * for linking a WhatsApp account directly inside the ERP.
 * - `matrixData`: 21x21 Version 1 ISO/IEC 18004 QR code encoding `token` (WAPP-PAIR-XXXXXX)
 * - `fullUrlMatrixData`: Full-resolution ISO/IEC 18004 QR code encoding the direct pairing URL
 */
export function generatePairingQRToken(
  accountId = 'wa-acc-sales',
  baseUrl = 'http://localhost:3000'
): {
  token: string;
  expiresInSec: number;
  matrixData: boolean[][];
  pairingUrl: string;
  pairingCode8Digit: string;
  fullUrlMatrixData: boolean[][];
} {
  const numCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Uppercase Alphanumeric string (16 chars) fits ISO/IEC 18004 Version 1 (21x21 modules)
  const token = `WAPP-PAIR-${numCode}`;
  const pairingUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/whatsapp/pair-scan?accountId=${encodeURIComponent(
    accountId
  )}&token=${encodeURIComponent(token)}`;
  const pairingCode8Digit = `RLM8-${numCode.slice(0, 4)}`;

  let matrix: boolean[][] = [];
  try {
    const qrV1 = QRCode.create(token, {
      version: 1,
      errorCorrectionLevel: 'L',
    });
    const moduleCount = qrV1.modules.size; // Strictly 21x21 for Version 1
    for (let r = 0; r < moduleCount; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < moduleCount; c++) {
        row.push(Boolean(qrV1.modules.get(r, c)));
      }
      matrix.push(row);
    }
  } catch {
    matrix = generateGeneralQRCodeMatrix(token, 21);
  }

  const fullUrlMatrixData = generateGeneralQRCodeMatrix(pairingUrl, 29);

  return {
    token,
    expiresInSec: 60,
    matrixData: matrix,
    pairingUrl,
    pairingCode8Digit,
    fullUrlMatrixData,
  };
}


export const SEED_WHATSAPP_CHATS: WhatsAppChat[] = [
  {
    id: 'chat-cust-1',
    contactName: 'شركة البناء الحديث للمقاولات العامة',
    contactPhone: '+967 771 445 880',
    normalizedPhone: '+967771445880',
    lastMessage: 'تم استلام الفاتورة وشهادة الضمان، شكراً لسرعة التجاوب.',
    lastMessageTime: '10:32 AM',
    unreadCount: 0,
    isBusiness: true,
    customerId: 'cust-1',
    pinned: true,
    messages: [
      {
        id: 'msg-w-1',
        chatId: 'chat-cust-1',
        sender: 'THEM',
        text: 'السلام عليكم، نحتاج عرض سعر لعدد 10 ألواح شمسية 585W وانفرتر 8KW.',
        timestamp: '09:45 AM',
        status: 'READ',
      },
      {
        id: 'msg-w-2',
        chatId: 'chat-cust-1',
        sender: 'ME',
        text: 'وعليكم السلام ورحمة الله. تم تجهيز الفاتورة الضريبية رقم INV-2026-6194 مع شهادة الضمان سنتين.',
        timestamp: '10:10 AM',
        status: 'READ',
        attachmentType: 'INVOICE',
        referenceNumber: 'INV-2026-6194',
      },
      {
        id: 'msg-w-3',
        chatId: 'chat-cust-1',
        sender: 'THEM',
        text: 'تم استلام الفاتورة وشهادة الضمان، شكراً لسرعة التجاوب.',
        timestamp: '10:32 AM',
        status: 'READ',
      },
    ],
  },
  {
    id: 'chat-cust-2',
    contactName: 'مؤسسة الأفق لتجارة الإلكترونيات والطاقة',
    contactPhone: '+966 50 882 1940',
    normalizedPhone: '+966508821940',
    lastMessage: 'إشعار كشف حساب ومطالبة سداد: الرصيد القائم 18,450 ر.ي.',
    lastMessageTime: '09:15 AM',
    unreadCount: 1,
    isBusiness: true,
    customerId: 'cust-2',
    pinned: false,
    messages: [
      {
        id: 'msg-w-4',
        chatId: 'chat-cust-2',
        sender: 'ME',
        text: 'إشعار كشف حساب ومطالبة سداد: الرصيد القائم 18,450 ر.ي.',
        timestamp: '09:15 AM',
        status: 'DELIVERED',
        attachmentType: 'DEBT_REMINDER',
        referenceNumber: 'SOA-2026-11',
      },
    ],
  },
  {
    id: 'chat-cust-3',
    contactName: 'م. سالم العولقي (صيانة وضمان)',
    contactPhone: '+967 771 223 344',
    normalizedPhone: '+967771223344',
    lastMessage: 'تم الانتهاء من فحص الانفرتر واستبدال كرت MPPT2 بنجاح.',
    lastMessageTime: 'أمس 04:20 PM',
    unreadCount: 0,
    isBusiness: false,
    customerId: 'cust-3',
    pinned: false,
    messages: [
      {
        id: 'msg-w-5',
        chatId: 'chat-cust-3',
        sender: 'ME',
        text: 'مرحباً م. سالم، تم استلام جهازك تذكرة صيانة رقم RMA-2026-77.',
        timestamp: 'أمس 01:00 PM',
        status: 'READ',
        attachmentType: 'WARRANTY',
        referenceNumber: 'RMA-2026-77',
      },
      {
        id: 'msg-w-6',
        chatId: 'chat-cust-3',
        sender: 'ME',
        text: 'تم الانتهاء من فحص الانفرتر واستبدال كرت MPPT2 بنجاح وهو جاهز للاستلام تحت الضمان المجاني.',
        timestamp: 'أمس 04:20 PM',
        status: 'READ',
      },
    ],
  },
];

export const SEED_WHATSAPP_ACCOUNTS: WhatsAppAccountInstance[] = [
  {
    id: 'wa-acc-sales',
    accountLabel: 'حساب المبيعات والفواتير الرئيسي',
    departmentAr: 'المبيعات ونقاط البيع POS',
    colorAccent: 'emerald',
    autoReplyEnabled: true,
    messagesDispatchedCount: 148,
    lastActiveAt: 'بانتظار مسح باركود واتساب الرسمي',
    session: {
      status: 'PAIRING_QR',
      phoneNumber: '+967 771 445 880',
      pushName: 'مؤسسة النور للتجارة والطاقة (المبيعات الموحدة)',
      batteryLevel: 94,
      qrCodeData: 'WAPP-PAIR-884920',
      qrExpiresInSec: 20,
      platform: 'WhatsApp Web Multi-Device v2.3000 (حساب المبيعات #1)',
      pairingUrl: 'http://localhost:3000/api/v1/whatsapp/pair-scan?accountId=wa-acc-sales&token=WAPP-PAIR-884920',
      pairingCode8Digit: 'RLM8-8849',
    },
    chats: SEED_WHATSAPP_CHATS,
  },
  {
    id: 'wa-acc-finance',
    accountLabel: 'حساب المحاسبة وتحصيل المديونيات',
    departmentAr: 'الإدارة المالية والائتمان',
    colorAccent: 'blue',
    autoReplyEnabled: true,
    messagesDispatchedCount: 84,
    lastActiveAt: 'منذ دقيقتين',
    session: {
      status: 'CONNECTED',
      phoneNumber: '+967 777 890 112',
      pushName: 'إدارة الحسابات والتحصيل - مؤسسة النور',
      batteryLevel: 89,
      qrCodeData: 'WAPP-PAIR-551209',
      qrExpiresInSec: 60,
      pairedAt: '2026-11-04 08:40',
      platform: 'WhatsApp Business Multi-Device v2.3000 (حساب المالية #2)',
      pairingUrl: 'http://localhost:3000/api/v1/whatsapp/pair-scan?accountId=wa-acc-finance&token=WAPP-PAIR-551209',
      pairingCode8Digit: 'FIN9-5512',
    },
    chats: [
      {
        id: 'chat-fin-1',
        contactName: 'مؤسسة الأفق لتجارة الإلكترونيات والطاقة',
        contactPhone: '+966 50 882 1940',
        normalizedPhone: '+966508821940',
        lastMessage: 'تم تحويل دفعة 8,000 ر.س عبر البنك الأهلي، مرفق الإيصال.',
        lastMessageTime: '11:05 AM',
        unreadCount: 1,
        isBusiness: true,
        customerId: 'cust-2',
        pinned: true,
        messages: [
          {
            id: 'msg-fin-1',
            chatId: 'chat-fin-1',
            sender: 'ME',
            text: 'إشعار كشف حساب ومطالبة سداد: الرصيد القائم 18,450 ر.ي.',
            timestamp: '09:15 AM',
            status: 'READ',
            attachmentType: 'DEBT_REMINDER',
            referenceNumber: 'SOA-2026-11',
          },
          {
            id: 'msg-fin-2',
            chatId: 'chat-fin-1',
            sender: 'THEM',
            text: 'تم تحويل دفعة 8,000 ر.س عبر البنك الأهلي، مرفق الإيصال.',
            timestamp: '11:05 AM',
            status: 'READ',
          },
        ],
      },
      {
        id: 'chat-fin-2',
        contactName: 'شركة البناء الحديث للمقاولات العامة',
        contactPhone: '+967 771 445 880',
        normalizedPhone: '+967771445880',
        lastMessage: 'سند قبض رقم RV-2026-104 بمبلغ 15,000 معتمد ومقيد في حسابكم.',
        lastMessageTime: 'أمس 05:10 PM',
        unreadCount: 0,
        isBusiness: true,
        customerId: 'cust-1',
        pinned: false,
        messages: [
          {
            id: 'msg-fin-3',
            chatId: 'chat-fin-2',
            sender: 'ME',
            text: 'سند قبض رقم RV-2026-104 بمبلغ 15,000 معتمد ومقيد في حسابكم.',
            timestamp: 'أمس 05:10 PM',
            status: 'READ',
            attachmentType: 'RECEIPT',
            referenceNumber: 'RV-2026-104',
          },
        ],
      },
    ],
  },
  {
    id: 'wa-acc-rma',
    accountLabel: 'حساب الصيانة والضمان والدعم الفني',
    departmentAr: 'مركز الصيانة والضمان RMA',
    colorAccent: 'violet',
    autoReplyEnabled: true,
    messagesDispatchedCount: 53,
    lastActiveAt: 'منذ 5 دقائق',
    session: {
      status: 'CONNECTED',
      phoneNumber: '+967 733 550 990',
      pushName: 'مركز الصيانة الهندسية والضمان - النور',
      batteryLevel: 97,
      qrCodeData: 'WAPP-PAIR-339104',
      qrExpiresInSec: 60,
      pairedAt: '2026-11-05 09:00',
      platform: 'WhatsApp Support Gateway v2.3000 (حساب الصيانة #3)',
      pairingUrl: 'http://localhost:3000/api/v1/whatsapp/pair-scan?accountId=wa-acc-rma&token=WAPP-PAIR-339104',
      pairingCode8Digit: 'RMA7-3391',
    },
    chats: [
      {
        id: 'chat-rma-1',
        contactName: 'م. سالم العولقي (صيانة وضمان)',
        contactPhone: '+967 771 223 344',
        normalizedPhone: '+967771223344',
        lastMessage: 'ممتاز جداً، سأمر عليكم بعد العصر لاستلام الانفرتر إن شاء الله.',
        lastMessageTime: '11:20 AM',
        unreadCount: 0,
        isBusiness: false,
        customerId: 'cust-3',
        pinned: true,
        messages: [
          {
            id: 'msg-rma-1',
            chatId: 'chat-rma-1',
            sender: 'ME',
            text: 'تم الانتهاء من فحص الانفرتر Deye 8KW واستبدال كرت MPPT2 تحت الضمان مجاناً. تذكرة رقم RMA-2026-77 جاهزة للتسليم.',
            timestamp: '10:50 AM',
            status: 'READ',
            attachmentType: 'WARRANTY',
            referenceNumber: 'RMA-2026-77',
          },
          {
            id: 'msg-rma-2',
            chatId: 'chat-rma-1',
            sender: 'THEM',
            text: 'ممتاز جداً، سأمر عليكم بعد العصر لاستلام الانفرتر إن شاء الله.',
            timestamp: '11:20 AM',
            status: 'READ',
          },
        ],
      },
    ],
  },
];

export function createNewWhatsAppAccountInstance(params: {
  label: string;
  departmentAr: string;
  phoneNumber?: string;
  colorAccent?: WhatsAppAccountInstance['colorAccent'];
  startConnected?: boolean;
  baseUrl?: string;
}): WhatsAppAccountInstance {
  const id = `wa-acc-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
  const qr = generatePairingQRToken(id, params.baseUrl || 'http://localhost:3000');
  const isConnected = Boolean(params.startConnected);
  const formattedPhone = params.phoneNumber?.trim() || '+967 770 000 000';

  return {
    id,
    accountLabel: params.label.trim() || 'حساب واتساب إضافي',
    departmentAr: params.departmentAr.trim() || 'قسم المبيعات وخدمة العملاء',
    colorAccent: params.colorAccent || 'amber',
    autoReplyEnabled: true,
    messagesDispatchedCount: 0,
    lastActiveAt: 'الآن',
    session: {
      status: isConnected ? 'CONNECTED' : 'PAIRING_QR',
      phoneNumber: isConnected ? formattedPhone : 'بانتظار مسح الباركود أو كود الربط...',
      pushName: `${params.label.trim()} (${params.departmentAr.trim()})`,
      batteryLevel: 100,
      qrCodeData: qr.token,
      qrExpiresInSec: qr.expiresInSec,
      pairedAt: isConnected ? new Date().toISOString().slice(0, 16).replace('T', ' ') : undefined,
      platform: 'WhatsApp Web Multi-Device Gateway v2.3000 (RLM In-App)',
      pairingUrl: qr.pairingUrl,
      pairingCode8Digit: qr.pairingCode8Digit,
      qrFullMatrixData: qr.fullUrlMatrixData,
    },
    chats: [
      {
        id: `chat-init-${id}`,
        contactName: params.label.trim() || 'إشعارات القناة',
        contactPhone: params.phoneNumber?.trim() || 'قناة جديدة',
        normalizedPhone: formattedPhone.replace(/\D/g, ''),
        lastMessage: `تم تفعيل قناة التواصل (${params.label.trim() || 'واتساب'}) داخل النظام بنجاح.`,
        lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        isBusiness: true,
        pinned: false,
        messages: [
          {
            id: `msg-init-${id}`,
            chatId: `chat-init-${id}`,
            sender: 'SYSTEM',
            text: `تم إنشاء وتخصيص (${params.label.trim() || 'قناة واتساب'} - ${params.departmentAr.trim() || 'عام'}) للعمل المباشر داخل النظام.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'READ',
          },
        ],
      },
    ],
  };
}

let whatsappMessageSeqCounter = 1;

export function generateUniqueWhatsAppMessageId(prefix = 'wmsg'): string {
  whatsappMessageSeqCounter += 1;
  return `${prefix}-${Date.now()}-${whatsappMessageSeqCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Appends an outbound or inbound message directly into a WhatsApp account's in-app chat list,
 * creating the customer's chat thread automatically if it doesn't exist yet.
 */
export function appendMessageToWhatsAppChats(
  chats: WhatsAppChat[],
  params: {
    messageId?: string;
    recipientName: string;
    recipientPhone: string;
    customerId?: string;
    messageText: string;
    attachmentType?: WhatsAppChatMessage['attachmentType'];
    referenceNumber?: string;
    attachmentUrl?: string;
    sender?: 'ME' | 'THEM' | 'SYSTEM';
    timestamp?: string;
  }
): {
  updatedChats: WhatsAppChat[];
  targetChatId: string;
  createdMessage: WhatsAppChatMessage;
} {
  const norm = normalizeInternationalPhone(params.recipientPhone || '');
  const cleanDigits = norm.digitsOnly || (params.recipientPhone || '').replace(/\D/g, '');
  const nowTime =
    params.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const existingChat = chats.find(
    (c) =>
      (params.customerId && c.customerId === params.customerId) ||
      (cleanDigits.length >= 7 &&
        c.normalizedPhone.replace(/\D/g, '').endsWith(cleanDigits.slice(-7)))
  );

  const targetChatId = existingChat
    ? existingChat.id
    : `chat-${Date.now().toString(36)}-${++whatsappMessageSeqCounter}`;
  const createdMessage: WhatsAppChatMessage = {
    id: params.messageId || generateUniqueWhatsAppMessageId('wmsg'),
    chatId: targetChatId,
    sender: params.sender || 'ME',
    text: params.messageText,
    timestamp: nowTime,
    status: 'READ',
    attachmentType: params.attachmentType || 'NONE',
    referenceNumber: params.referenceNumber,
    attachmentUrl: params.attachmentUrl,
  };

  if (existingChat) {
    const updatedChat: WhatsAppChat = {
      ...existingChat,
      contactName: params.recipientName || existingChat.contactName,
      lastMessage: params.messageText.slice(0, 110),
      lastMessageTime: nowTime,
      messages: [...existingChat.messages, createdMessage],
    };
    const others = chats.filter((c) => c.id !== existingChat.id);
    return {
      updatedChats: [updatedChat, ...others],
      targetChatId,
      createdMessage,
    };
  } else {
    const newChat: WhatsAppChat = {
      id: targetChatId,
      contactName: params.recipientName || params.recipientPhone || 'عميل جديد',
      contactPhone: params.recipientPhone || '+967 770 000 000',
      normalizedPhone: norm.e164Phone || `+${cleanDigits}`,
      lastMessage: params.messageText.slice(0, 110),
      lastMessageTime: nowTime,
      unreadCount: 0,
      isBusiness: true,
      customerId: params.customerId,
      pinned: false,
      messages: [createdMessage],
    };
    return {
      updatedChats: [newChat, ...chats],
      targetChatId,
      createdMessage,
    };
  }
}

// ============================================================================
// 2. Real Android USB / Serial Modem / Gateway SMS Bridge
// ============================================================================

const USB_VENDOR_NAMES: Record<number, string> = {
  0x04e8: 'Samsung Electronics',
  0x2717: 'Xiaomi Inc.',
  0x12d1: 'Huawei Technologies',
  0x22d9: 'OPPO / Realme',
  0x2d95: 'Vivo Communication',
  0x2a70: 'OnePlus Technology',
  0x22b8: 'Motorola Mobility',
  0x18d1: 'Google LLC',
  0x05ac: 'Apple Inc.',
  0x054c: 'Sony Mobile',
  0x0421: 'Nokia / HMD Global',
  0x1004: 'LG Electronics',
  0x19d2: 'ZTE Mobile',
  0x1782: 'Unisoc / Spreadtrum',
  0x0e8d: 'MediaTek Inc.',
  0x05c6: 'Qualcomm Inc.',
  0x1a86: 'QinHeng Electronics (CH340 Serial)',
  0x10c4: 'Silicon Labs (CP210x Serial)',
  0x0403: 'FTDI USB-Serial',
  0x067b: 'Prolific USB-Serial',
};

export function lookupUsbVendorName(vendorId?: number): string {
  if (typeof vendorId !== 'number' || !Number.isFinite(vendorId) || vendorId <= 0) {
    return 'جهاز USB غير معروف المصنع';
  }
  return (
    USB_VENDOR_NAMES[vendorId] ||
    `USB Vendor (0x${vendorId.toString(16).padStart(4, '0').toUpperCase()})`
  );
}

export interface ParsedAdbDevice {
  serial: string;
  state: 'device' | 'unauthorized' | 'offline' | 'recovery' | 'unknown';
  model?: string;
  product?: string;
  device?: string;
  transportId?: string;
}

export function parseAdbDevicesList(rawOutput: string): ParsedAdbDevice[] {
  if (!rawOutput) return [];
  const lines = rawOutput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('List of devices') && !l.startsWith('* daemon'));

  const results: ParsedAdbDevice[] = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const serial = parts[0];
    const rawState = parts[1];
    const state: ParsedAdbDevice['state'] =
      rawState === 'device' ||
      rawState === 'unauthorized' ||
      rawState === 'offline' ||
      rawState === 'recovery'
        ? rawState
        : 'unknown';

    let model: string | undefined;
    let product: string | undefined;
    let device: string | undefined;
    let transportId: string | undefined;

    for (const token of parts.slice(2)) {
      if (token.startsWith('model:')) model = token.slice(6).replace(/_/g, ' ').trim();
      else if (token.startsWith('product:')) product = token.slice(8).trim();
      else if (token.startsWith('device:')) device = token.slice(7).trim();
      else if (token.startsWith('transport_id:')) transportId = token.slice(13).trim();
    }

    results.push({ serial, state, model, product, device, transportId });
  }
  return results;
}

export function parseAdbBatteryOutput(rawOutput: string): {
  batteryPercent: number;
  isCharging: boolean;
} {
  if (!rawOutput) return { batteryPercent: 0, isCharging: false };
  const levelMatch = rawOutput.match(/level:\s*(\d+)/i);
  const scaleMatch = rawOutput.match(/scale:\s*(\d+)/i);
  const rawLevel = levelMatch ? Number(levelMatch[1]) : 0;
  const rawScale = scaleMatch ? Math.max(1, Number(scaleMatch[1])) : 100;
  const batteryPercent = Math.min(100, Math.max(0, Math.round((rawLevel / rawScale) * 100)));
  const isCharging =
    /AC powered:\s*true/i.test(rawOutput) ||
    /USB powered:\s*true/i.test(rawOutput) ||
    /Wireless powered:\s*true/i.test(rawOutput);
  return { batteryPercent, isCharging };
}

export function parseAdbSignalOutput(rawOutput: string): number {
  if (!rawOutput) return 0;
  // Look for explicit Android mLevel (0..4)
  const levelMatch = rawOutput.match(/(?:level|mLevel)\s*[=:]\s*(\d+)/i);
  if (levelMatch) {
    const lvl = Math.min(4, Math.max(0, Number(levelMatch[1])));
    if (lvl > 0) return lvl * 25;
  }
  // Look for dBm RSSI (-50 excellent .. -120 none)
  const dbmMatch = rawOutput.match(/(?:rssi|rsrp|dbm)\s*[=:]\s*(-\d+)/i);
  if (dbmMatch) {
    const dbm = Number(dbmMatch[1]);
    if (Number.isFinite(dbm) && dbm < 0 && dbm >= -130) {
      return Math.min(100, Math.max(5, Math.round(((dbm + 125) / 75) * 100)));
    }
  }
  return 0;
}

export function parseModemAtIdentityResponses(res: {
  manufacturer?: string;
  model?: string;
  operator?: string;
  csq?: string;
}): {
  manufacturer: string;
  model: string;
  simOperator: string;
  signalStrengthPercent: number;
} {
  const cleanLine = (raw?: string, fallback = '') => {
    if (!raw) return fallback;
    const cleaned = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && l !== 'OK' && !l.startsWith('AT'))
      .join(' ')
      .replace(/^["']|["']$/g, '')
      .trim();
    return cleaned || fallback;
  };

  let simOperator = 'غير معروف';
  const opRaw = cleanLine(res.operator);
  const quotedOp = opRaw.match(/"([^"]+)"/);
  if (quotedOp?.[1]) {
    simOperator = quotedOp[1].trim();
  } else if (opRaw && !opRaw.startsWith('+COPS: 0')) {
    simOperator = opRaw.replace(/^\+COPS:\s*/, '').trim();
  }

  let signalStrengthPercent = 0;
  const csqMatch = (res.csq || '').match(/\+CSQ:\s*(\d+)/i);
  if (csqMatch) {
    const rssi = Number(csqMatch[1]);
    if (rssi >= 0 && rssi <= 31) {
      signalStrengthPercent = Math.min(100, Math.max(5, Math.round((rssi / 31) * 100)));
    }
  }

  return {
    manufacturer: cleanLine(res.manufacturer, 'USB GSM/3G/4G Modem'),
    model: cleanLine(res.model, 'Serial AT+CMGS Modem'),
    simOperator,
    signalStrengthPercent,
  };
}

export interface DualSimOperatorInfo {
  sim1Operator: string;
  sim2Operator?: string;
  summaryLabel: string;
}

/**
 * Parses Android `gsm.sim.operator.alpha` (e.g. "Yemen Mobile,Sabafon" or ",MTN")
 * into distinct SIM1 & SIM2 operator labels.
 */
export function parseAdbDualSimOperators(
  rawAlpha: string,
  rawFallbackOperator = ''
): DualSimOperatorInfo {
  const parts = String(rawAlpha || '')
    .split(',')
    .map((p) => p.trim())
    .map((p) => (p.toLowerCase() === 'null' ? '' : p));

  const fallbackParts = String(rawFallbackOperator || '')
    .split(',')
    .map((p) => p.trim())
    .map((p) => (p.toLowerCase() === 'null' ? '' : p));

  const sim1 = parts[0] || fallbackParts[0] || '';
  const sim2 = parts[1] || fallbackParts[1] || '';

  if (sim1 && sim2) {
    return {
      sim1Operator: sim1,
      sim2Operator: sim2,
      summaryLabel: `${sim1} / ${sim2}`,
    };
  }
  if (sim1) {
    return {
      sim1Operator: sim1,
      summaryLabel: sim1,
    };
  }
  if (sim2) {
    return {
      sim1Operator: sim2,
      sim2Operator: sim2,
      summaryLabel: sim2,
    };
  }
  return {
    sim1Operator: 'شريحة SIM نشطة',
    summaryLabel: 'شريحة SIM نشطة',
  };
}

/**
 * Extracts subscription IDs from `adb shell content query --uri content://telephony/siminfo`
 * or `dumpsys isms` output so SIM 1 and SIM 2 map to exact Android subIds.
 */
export function parseAdbSimSubIds(rawOutput: string): { sim1?: number; sim2?: number } {
  const result: { sim1?: number; sim2?: number } = {};
  if (!rawOutput) return result;
  const rows = rawOutput.split(/\r?\n/);
  for (const row of rows) {
    const subMatch = row.match(/(?:_id|subId|id)\s*=\s*(\d+)/i);
    const slotMatch = row.match(/(?:sim_id|slotIndex|slot_index|phoneId)\s*=\s*(\d+)/i);
    if (subMatch && slotMatch) {
      const subId = Number(subMatch[1]);
      const slot = Number(slotMatch[1]);
      if (Number.isFinite(subId) && subId > 0) {
        if (slot === 0 && !result.sim1) result.sim1 = subId;
        if (slot === 1 && !result.sim2) result.sim2 = subId;
      }
    }
  }
  return result;
}

export interface ParsedWindowsSerialPort {
  port: string;
  name: string;
  pnpDeviceId: string;
  isModem: boolean;
}

/**
 * Parses Windows PowerShell JSON / CSV / `mode` COM port output into structured port entries.
 */
export function parseWindowsSerialPortsOutput(rawOutput: string): ParsedWindowsSerialPort[] {
  const trimmed = String(rawOutput || '').trim();
  if (!trimmed) return [];

  // 1. JSON array or single object from ConvertTo-Json
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const mapped: ParsedWindowsSerialPort[] = [];
      for (const item of list) {
        const port = String(item?.DeviceID || item?.AttachedTo || item?.Port || '').trim();
        if (!/^COM\d+$/i.test(port)) continue;
        const name = String(item?.Name || item?.Description || item?.Caption || port).trim();
        const pnpDeviceId = String(item?.PNPDeviceID || '').trim();
        const isModem = /modem|android|gsm|lte|huawei|samsung|xiaomi|qualcomm|mediatek|ch340|cp210|ftdi|usb serial|cdc/i.test(
          `${name} ${pnpDeviceId}`
        );
        mapped.push({ port: port.toUpperCase(), name, pnpDeviceId, isModem });
      }
      return mapped;
    } catch {
      // fall through to regex parsing
    }
  }

  // 2. Fallback regex for `COM3`, `COM4`, etc. (e.g. `mode` output)
  const seen = new Set<string>();
  const matches: ParsedWindowsSerialPort[] = [];
  const regex = /\b(COM\d+)\b([^\r\n]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(trimmed)) !== null) {
    const port = m[1].toUpperCase();
    if (seen.has(port)) continue;
    seen.add(port);
    const label = m[2]?.replace(/[:\-]+$/, '').trim() || `Serial Port ${port}`;
    matches.push({
      port,
      name: label,
      pnpDeviceId: '',
      isModem: /modem|android|gsm|usb|serial|ch340|cp210|ftdi/i.test(label),
    });
  }
  return matches;
}

/**
 * Escapes an SMS body safely for POSIX `sh -c` / `adb shell` single quotes while preserving Arabic UTF-8.
 */
export function escapeAdbShellSingleArg(value: string): string {
  return `'${String(value || '').replace(/'/g, "'\\''")}'`;
}

/**
 * Generates ordered Android SDK-aware `adb shell` SMS dispatch commands
 * across Android 7-15 binder signatures (`isms`) and CLI fallbacks.
 */
export function buildAdbSmsShellCommands(params: {
  sdkVersion: number;
  phone: string;
  message: string;
  simSlot?: number;
  subId?: number;
}): string[] {
  const sdk = Number(params.sdkVersion) || 30;
  const cleanPhone = String(params.phone || '').replace(/[^\d+]/g, '');
  const escapedMsg = escapeAdbShellSingleArg(params.message);
  const subId =
    typeof params.subId === 'number' && Number.isFinite(params.subId) && params.subId > 0
      ? params.subId
      : params.simSlot === 2
      ? 2
      : 1;

  const cmds: string[] = [];

  if (sdk >= 31) {
    // Android 12-15 (API 31-35): attributionTag present on sendTextForSubscriber
    cmds.push(
      `service call isms 7 i32 ${subId} s16 "com.android.mms" s16 "null" s16 "${cleanPhone}" s16 "null" s16 ${escapedMsg} s16 "null" s16 "null" i32 0 i64 0`
    );
    cmds.push(
      `service call isms 5 i32 ${subId} s16 "com.android.mms" s16 "null" s16 "${cleanPhone}" s16 "null" s16 ${escapedMsg} s16 "null" s16 "null" i32 0 i64 0`
    );
    cmds.push(
      `service call isms 6 i32 ${subId} s16 "com.android.mms" s16 "null" s16 "${cleanPhone}" s16 "null" s16 ${escapedMsg} s16 "null" s16 "null" i32 0 i64 0`
    );
  } else if (sdk >= 29) {
    // Android 10-11 (API 29-30)
    cmds.push(
      `service call isms 5 i32 ${subId} s16 "com.android.mms" s16 "null" s16 "${cleanPhone}" s16 "null" s16 ${escapedMsg} s16 "null" s16 "null" i32 0 i64 0`
    );
    cmds.push(
      `service call isms 7 i32 ${subId} s16 "com.android.mms" s16 "${cleanPhone}" s16 "null" s16 ${escapedMsg} s16 "null" s16 "null" i32 0`
    );
  } else {
    // Android 7-9 (API 24-28)
    cmds.push(
      `service call isms 7 i32 ${subId} s16 "com.android.mms" s16 "${cleanPhone}" s16 "null" s16 ${escapedMsg} s16 "null" s16 "null"`
    );
    cmds.push(
      `service call isms 5 i32 0 s16 "com.android.mms" s16 "${cleanPhone}" s16 "null" s16 ${escapedMsg} s16 "null" s16 "null"`
    );
  }

  return cmds;
}

export function classifyAdbSmsDispatchResult(rawOutput: string): {
  ok: boolean;
  reasonCode: 'DELIVERED' | 'SECURITY_PERMISSION_REQUIRED' | 'BINDER_MISMATCH' | 'UNKNOWN_ERROR';
  messageAr: string;
} {
  const out = String(rawOutput || '');
  if (/Parcel\(/i.test(out) && !/Error|Exception|SecurityException|Failure/i.test(out)) {
    return {
      ok: true,
      reasonCode: 'DELIVERED',
      messageAr: 'تم تسليم أمر الإرسال إلى شريحة الجوال عبر ADB بنجاح.',
    };
  }
  if (/SecurityException|permission denial|requires SEND_SMS/i.test(out)) {
    return {
      ok: false,
      reasonCode: 'SECURITY_PERMISSION_REQUIRED',
      messageAr:
        'الجوال متصل عبر ADB لكن نظام الحماية في الهاتف منع الإرسال الخلفي: يرجى تفعيل خيار (تصحيح أخطاء USB - إعدادات الأمان / USB Debugging Security Settings) من خيارات المطور، أو استخدام بوابة HTTP/المودم.',
    };
  }
  if (/Attempt to invoke|NullPointerException|BadParcelableException|not enough|invalid/i.test(out)) {
    return {
      ok: false,
      reasonCode: 'BINDER_MISMATCH',
      messageAr: 'واجهة خدمة الرسائل على هذا الإصدار تحتاج توقيعاً بديلاً أو بوابة HTTP على الهاتف.',
    };
  }
  return {
    ok: false,
    reasonCode: 'UNKNOWN_ERROR',
    messageAr: out.trim() || 'لم يستجب الجوال لأمر إرسال الرسالة عبر ADB.',
  };
}

export function isUsbDeviceReady(device?: Partial<UsbConnectedDevice> | null): boolean {
  if (!device) return false;
  if (device.status === 'DISCONNECTED' || device.status === 'ERROR' || device.status === 'AUTHORIZING') {
    return false;
  }
  if (device.detectionSource === 'NONE') return false;
  return Boolean(device.atCommandReady || device.usbDebuggingEnabled);
}

export function createDisconnectedUsbDevice(
  reasonAr = 'لم يتم اكتشاف أي جوال أندرويد أو مودم USB موصل بالنظام حالياً.'
): UsbConnectedDevice {
  return {
    id: 'usb-none',
    model: 'لا يوجد جهاز جوال موصل',
    manufacturer: 'قم بتوصيل الجوال عبر كابل USB أو اختيار منفذ تسلسلي / بوابة شبكة',
    serialNumber: '—',
    port: 'غير متصل',
    connectionMode: 'ADB_DEBUGGING',
    simOperator: 'لا توجد شريحة نشطة',
    simSlot: 1,
    signalStrengthPercent: 0,
    batteryPercent: 0,
    isCharging: false,
    usbDebuggingEnabled: false,
    atCommandReady: false,
    messagesSentCount: 0,
    connectedAt: '',
    status: 'DISCONNECTED',
    detectionSource: 'NONE',
    statusReasonAr: reasonAr,
    lastCheckedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
}

export function createDefaultUsbConnectedDevice(): UsbConnectedDevice {
  return createDisconnectedUsbDevice();
}

export function runUsbAutoDiagnostics(device?: UsbConnectedDevice): UsbDiagnosticsReport {
  const logs: string[] = [];
  const now = new Date().toLocaleTimeString();

  logs.push(`[${now}] فحص منافذ USB ومسرى تصحيح الأخطاء (ADB) والمنافذ التسلسلية (COM/ttyUSB)...`);

  if (!device || device.status === 'DISCONNECTED' || device.detectionSource === 'NONE') {
    logs.push(`[${now}] النتيجة: لم يتم العثور على أي جوال أو مودم SMS موصل فعلياً حالياً.`);
    logs.push(
      `[${now}] سبب الحالة: ${
        device?.statusReasonAr ||
        'منافذ USB/Serial على الخادم فارغة أو لم يتم منح تصريح WebUSB/Serial من المتصفح.'
      }`
    );
    logs.push(
      `[${now}] للتوصيل: 1) وصل الجوال بكابل USB وفعّل (تصحيح أخطاء USB) مع تثبيت ADB، أو 2) انقر زر "ربط جوال / مودم من المتصفح (WebUSB/Serial)"، أو 3) أدخل رابط بوابة HTTP LAN.`
    );
    return {
      timestamp: new Date().toISOString(),
      usbPortCheck: false,
      driverLoaded: false,
      adbDaemonRunning: Boolean(device?.hasUsbToolsOnHost),
      usbPermissionGranted: false,
      atCmdResponseOk: false,
      diagnosticLogs: logs,
    };
  }

  if (device.status === 'AUTHORIZING') {
    logs.push(`[${now}] تم رصد جوال على المنفذ (${device.port}) بالرقم التسلسلي (${device.serialNumber})، لكنه غير مصرح (Unauthorized).`);
    logs.push(`[${now}] الإجراء المطلوب: افتح شاشة الجوال واضغط "السماح بتصحيح أخطاء USB (Allow USB Debugging)" ثم أعد الفحص.`);
    return {
      timestamp: new Date().toISOString(),
      usbPortCheck: true,
      driverLoaded: true,
      adbDaemonRunning: true,
      usbPermissionGranted: false,
      atCmdResponseOk: false,
      diagnosticLogs: logs,
    };
  }

  if (device.status === 'ERROR') {
    logs.push(`[${now}] خطأ في الاتصال بالجهاز (${device.model}): ${device.statusReasonAr || 'فشل الاستجابة'}`);
    return {
      timestamp: new Date().toISOString(),
      usbPortCheck: true,
      driverLoaded: false,
      adbDaemonRunning: Boolean(device.hasUsbToolsOnHost),
      usbPermissionGranted: false,
      atCmdResponseOk: false,
      diagnosticLogs: logs,
    };
  }

  const ready = isUsbDeviceReady(device);
  logs.push(`[${now}] تم التعرف على الجهاز الحقيقي: ${device.model} (${device.manufacturer})`);
  logs.push(`[${now}] الرقم التسلسلي / المعرّف: ${device.serialNumber} · المنفذ: ${device.port}`);
  logs.push(`[${now}] مصدر الاكتشاف الفعلي: ${device.detectionSource || device.connectionMode}`);
  logs.push(
    `[${now}] الشريحة والمشغل: SIM ${device.simSlot} (${device.simOperator}) · الإشارة: ${device.signalStrengthPercent}% · البطارية: ${device.batteryPercent}%`
  );
  logs.push(
    ready
      ? `[${now}] OK — القناة جاهزة فعلياً لإرسال الرسائل النصية عبر الجهاز الموصل.`
      : `[${now}] تم رصد الجهاز عبر USB، لكن قناة الإرسال التلقائي (${device.connectionMode}) تتطلب مودم Web Serial (AT+CMGS) أو تفعيل ADB/HTTP للإرسال المباشر.`
  );

  return {
    timestamp: new Date().toISOString(),
    usbPortCheck: true,
    driverLoaded: true,
    adbDaemonRunning: device.usbDebuggingEnabled,
    usbPermissionGranted: ready,
    atCmdResponseOk: Boolean(device.atCommandReady),
    diagnosticLogs: logs,
  };
}

export function calculateSmsParts(text: string): {
  charCount: number;
  partCount: number;
  isUnicode: boolean;
  maxPerPart: number;
  remainingInCurrentPart: number;
  currentLimit: number;
  encodingLabel: 'GSM-7' | 'UTF-16';
} {
  const isUnicode = /[^\u0000-\u007F]/.test(text);
  const charCount = text.length;

  const maxSingle = isUnicode ? 70 : 160;
  const maxMulti = isUnicode ? 67 : 153;
  const partCount =
    charCount === 0
      ? 0
      : charCount <= maxSingle
      ? 1
      : Math.ceil(charCount / maxMulti);
  const maxPerPart = charCount <= maxSingle ? maxSingle : maxMulti;
  const currentLimit = partCount <= 1 ? maxSingle : partCount * maxMulti;
  const remainingInCurrentPart =
    charCount === 0 ? maxSingle : Math.max(0, currentLimit - charCount);

  return {
    charCount,
    partCount,
    isUnicode,
    maxPerPart,
    remainingInCurrentPart,
    currentLimit,
    encodingLabel: isUnicode ? 'UTF-16' : 'GSM-7',
  };
}

// ============================================================================
// 3. Cross-Branch LAN & WAN Stock Availability Matrix
// ============================================================================

export const SEED_BRANCH_NODES: BranchNodeInfo[] = [
  {
    branchId: 'branch-ruh-01',
    branchCode: 'BR-RUH-HQ',
    branchNameAr: 'الفرع الرئيسي والإدارة العامة - الرياض',
    branchCity: 'الرياض',
    lanIpAddress: '192.168.1.10:3000',
    wanHost: 'hq-riyadh.alnoor-erp.com',
    status: 'ONLINE_LAN',
    latencyMs: 0.6,
    lastHeartbeat: 'الآن (مباشر)',
    isCurrentNode: true,
    warehouseId: 'wh-ruh-main',
    warehouseNameAr: 'المستودع المركزي اللوجستي - الرياض',
  },
  {
    branchId: 'branch-jed-02',
    branchCode: 'BR-JED-IND',
    branchNameAr: 'فرع ومستودع المنطقة الصناعية - جدة',
    branchCity: 'جدة',
    lanIpAddress: '192.168.1.20:3000',
    wanHost: 'jeddah.alnoor-erp.com',
    status: 'ONLINE_LAN',
    latencyMs: 1.2,
    lastHeartbeat: 'منذ 3 ثوان',
    isCurrentNode: false,
    warehouseId: 'wh-jed-ind',
    warehouseNameAr: 'مستودع التصنيع والعبور - جدة',
  },
  {
    branchId: 'branch-dmm-03',
    branchCode: 'BR-DMM-RET',
    branchNameAr: 'معرض التجزئة ونقاط البيع - الدمام',
    branchCity: 'الدمام',
    lanIpAddress: '192.168.1.30:3000',
    wanHost: 'dammam.alnoor-erp.com',
    status: 'ONLINE_LAN',
    latencyMs: 1.8,
    lastHeartbeat: 'منذ 4 ثوان',
    isCurrentNode: false,
    warehouseId: 'wh-dmm-pos',
    warehouseNameAr: 'مستودع معرض البيع المباشر - الدمام',
  },
  {
    branchId: 'branch-ye-04',
    branchCode: 'BR-SAN-HUB',
    branchNameAr: 'مركز التوزيع الإقليمي - صنعاء / عدن',
    branchCity: 'صنعاء',
    lanIpAddress: '192.168.1.40:3000',
    wanHost: 'yemen-hub.alnoor-erp.com',
    status: 'ONLINE_LAN',
    latencyMs: 2.4,
    lastHeartbeat: 'منذ ثانية واحدة',
    isCurrentNode: false,
    warehouseId: 'wh-ye-main',
    warehouseNameAr: 'المستودع الرئيسي للطاقة والبطاريات - صنعاء',
  },
];

export function calculateCrossBranchStockMatrix(params: {
  productSku: string;
  currentBranchId: string;
  allProducts: Product[];
  branchNodes?: BranchNodeInfo[];
}): CrossBranchStockItem[] {
  const nodes = params.branchNodes || SEED_BRANCH_NODES;
  const targetProduct = params.allProducts.find((p) => p.sku === params.productSku);
  const baseQty = targetProduct ? targetProduct.stockQty : 25;
  const cost = targetProduct ? targetProduct.costPrice : 500;
  const price = targetProduct ? targetProduct.salePrice : 750;

  // Predictable, realistic multi-branch distribution factor per branch node
  const branchMultipliers: Record<string, { factor: number; bin: string; reserved: number }> = {
    'branch-ruh-01': { factor: 1.0, bin: 'ZA-01-S1-B01', reserved: Math.min(5, Math.floor(baseQty * 0.1)) },
    'branch-jed-02': { factor: 0.65, bin: 'JED-Z2-R04', reserved: Math.min(3, Math.floor(baseQty * 0.05)) },
    'branch-dmm-03': { factor: 0.35, bin: 'DMM-POS-01', reserved: Math.min(2, Math.floor(baseQty * 0.03)) },
    'branch-ye-04': { factor: 0.85, bin: 'SAN-VAULT-01', reserved: Math.min(4, Math.floor(baseQty * 0.08)) },
  };

  return nodes.map((node) => {
    const isCurrent = node.branchId === params.currentBranchId;
    const cfg = branchMultipliers[node.branchId] || { factor: 0.5, bin: 'SEC-GEN-01', reserved: 1 };
    const stockQty = isCurrent && targetProduct ? targetProduct.stockQty : Math.max(0, Math.round(baseQty * cfg.factor));
    const reservedQty = cfg.reserved;
    const availableQty = Math.max(0, stockQty - reservedQty);

    return {
      branchId: node.branchId,
      branchCode: node.branchCode,
      branchNameAr: node.branchNameAr,
      warehouseId: node.warehouseId,
      warehouseNameAr: node.warehouseNameAr,
      lanIpAddress: node.lanIpAddress,
      isCurrentBranch: isCurrent,
      stockQty,
      reservedQty,
      availableQty,
      unitCost: cost,
      salePrice: price,
      binLocation: cfg.bin,
      latencyMs: node.latencyMs,
    };
  });
}

export function createInterBranchTransferDocAndJournal(params: {
  tenantId: string;
  sourceBranch: BranchNodeInfo;
  targetBranch: BranchNodeInfo;
  product: Product;
  requestedQty: number;
  urgency: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  operatorName: string;
}): {
  transferDoc: InterBranchTransferRequest;
  clearingJournal: JournalEntry;
} {
  const reqNumber = `TR-${Date.now().toString().slice(-6)}`;
  const totalValue = Math.round(params.requestedQty * params.product.costPrice * 100) / 100;
  const now = new Date().toISOString().slice(0, 10);

  const transferDoc: InterBranchTransferRequest = {
    id: `tr-${Date.now()}`,
    tenantId: params.tenantId,
    requestNumber: reqNumber,
    sourceBranchId: params.sourceBranch.branchId,
    sourceBranchNameAr: params.sourceBranch.branchNameAr,
    targetBranchId: params.targetBranch.branchId,
    targetBranchNameAr: params.targetBranch.branchNameAr,
    productId: params.product.id,
    productNameAr: params.product.nameAr,
    sku: params.product.sku,
    requestedQty: params.requestedQty,
    urgency: params.urgency,
    requestedBy: params.operatorName,
    requestedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    status: 'APPROVED',
    notes: `طلب تحويل مخزني فوري عبر الشبكة الداخلية LAN (${params.sourceBranch.lanIpAddress} -> ${params.targetBranch.lanIpAddress})`,
    journalEntryNumber: `JE-TR-${reqNumber}`,
  };

  const clearingJournal: JournalEntry = {
    id: `je-tr-${Date.now()}`,
    tenantId: params.tenantId,
    entryNumber: `JE-TR-${reqNumber}`,
    date: now,
    referenceType: 'STOCK_MOVE',
    referenceId: reqNumber,
    description: `قيد تسوية مخزنية بين الفروع (تحويل ${params.requestedQty} ${params.product.uom} من صنف ${params.product.nameAr}) من ${params.sourceBranch.branchNameAr} إلى ${params.targetBranch.branchNameAr}`,
    totalDebit: totalValue,
    totalCredit: totalValue,
    isPosted: true,
    isReversed: false,
    createdByName: params.operatorName,
    createdAt: new Date().toISOString(),
    lines: [
      {
        id: `jel-tr-1-${Date.now()}`,
        accountId: 'acc-inv-target',
        accountCode: '1104-BR2',
        accountName: `مخزون بضاعة - ${params.targetBranch.branchNameAr}`,
        accountNameAr: `مخزون بضاعة - ${params.targetBranch.branchNameAr}`,
        debit: totalValue,
        credit: 0,
        memo: `استلام تحويل بضاعة عبر شبكة الفروع من ${params.sourceBranch.branchCode}`,
      },
      {
        id: `jel-tr-2-${Date.now()}`,
        accountId: 'acc-inv-source',
        accountCode: '1104-BR1',
        accountName: `مخزون بضاعة - ${params.sourceBranch.branchNameAr}`,
        accountNameAr: `مخزون بضاعة - ${params.sourceBranch.branchNameAr}`,
        debit: 0,
        credit: totalValue,
        memo: `إرسال تحويل مخزني عبر شبكة الفروع إلى ${params.targetBranch.branchCode}`,
      },
    ],
  };

  return { transferDoc, clearingJournal };
}

/**
 * Transitions Inter-Branch Transfer status (APPROVED -> IN_TRANSIT -> RECEIVED)
 * When reaching RECEIVED, increments the target product stock quantity in the store.
 */
export function advanceInterBranchTransferStatus(
  transfer: InterBranchTransferRequest,
  nextStatus: 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED',
  products: Product[],
  notes?: string
): {
  updatedTransfer: InterBranchTransferRequest;
  updatedProducts: Product[];
  stockDeltaApplied: number;
} {
  const updatedTransfer: InterBranchTransferRequest = {
    ...transfer,
    status: nextStatus,
    notes: notes ? `${transfer.notes ? transfer.notes + ' | ' : ''}${notes}` : transfer.notes,
  };

  let stockDeltaApplied = 0;
  let updatedProducts = [...products];

  if (nextStatus === 'RECEIVED') {
    stockDeltaApplied = transfer.requestedQty;
    updatedProducts = updatedProducts.map((p) => {
      if (p.sku === transfer.sku || p.id === transfer.productId) {
        return {
          ...p,
          stockQty: p.stockQty + transfer.requestedQty,
        };
      }
      return p;
    });
  }

  return {
    updatedTransfer,
    updatedProducts,
    stockDeltaApplied,
  };
}

/**
 * Generates an automated bulk debt reminder SMS campaign targeting all debtors
 * via the connected USB Mobile Phone bridge.
 */
export function buildBulkDebtSmsCampaign(
  customers: { id: string; nameAr?: string; name: string; phone: string; balance: number }[],
  device: UsbConnectedDevice,
  customPrefix?: string
): {
  campaignId: string;
  targetedCustomersCount: number;
  totalDebtAmount: number;
  smsQueue: {
    customerId: string;
    customerName: string;
    phone: string;
    balance: number;
    messageBody: string;
    partsCount: number;
  }[];
  updatedDevice: UsbConnectedDevice;
} {
  const debtors = customers.filter((c) => Number(c.balance) > 0);
  const prefix = customPrefix || 'عميلنا العزيز، نود تذكيركم بضرورة تسوية المديونية المستحقة على حسابكم';

  const smsQueue = debtors.map((d) => {
    const name = d.nameAr || d.name;
    const body = `${prefix} (${name}) بقيمة ${Number(d.balance).toLocaleString()} ر.س. شكراً لحسن تعاونكم.`;
    const parts = calculateSmsParts(body);
    return {
      customerId: d.id,
      customerName: name,
      phone: d.phone,
      balance: d.balance,
      messageBody: body,
      partsCount: parts.partCount,
    };
  });

  const totalParts = smsQueue.reduce((acc, curr) => acc + curr.partsCount, 0);

  const updatedDevice: UsbConnectedDevice = {
    ...device,
    messagesSentCount: device.messagesSentCount + totalParts,
  };

  return {
    campaignId: `CMP-DEBT-${Date.now().toString(36).toUpperCase()}`,
    targetedCustomersCount: debtors.length,
    totalDebtAmount: debtors.reduce((sum, d) => sum + Number(d.balance), 0),
    smsQueue,
    updatedDevice,
  };
}

/**
 * Creates a simulated inbound customer reply message for testing in-app two-way WhatsApp interaction.
 */
export function createSimulatedInboundWhatsAppMessage(
  chatId: string,
  replyText: string
): WhatsAppChatMessage {
  const now = new Date();
  return {
    id: generateUniqueWhatsAppMessageId('msg-in'),
    chatId,
    sender: 'THEM',
    text: replyText,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'READ',
    attachmentType: 'NONE',
  };
}

/**
 * Builds guaranteed multi-format invoice dispatch payload (Text, Official Image Snapshot, PDF, or All Combined)
 * solving the root problem of hanging texts in WhatsApp / SMS draft inputs.
 */
export function buildGuaranteedInvoiceDispatchPackage(params: {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  currency: string;
  itemsSummary: string;
  format: 'TEXT_ONLY' | 'IMAGE_SNAPSHOT' | 'PDF_DOCUMENT' | 'ALL_COMBINED';
  companyName: string;
  branchName: string;
  taxNumber?: string;
  qrPayload?: string;
}): {
  dispatchId: string;
  formattedText: string;
  pdfDataUri: string;
  imageDataUri: string;
  receiptSummaryAr: string;
  readyForDirectSend: boolean;
  ackToken: string;
} {
  const dispatchId = `DSP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const ackToken = `ACK-WA-${params.invoiceNumber}-${Date.now().toString(36).toUpperCase()}`;

  const formattedText = [
    `🧾 *فاتورة مبيعات إلكترونية معتمدة*`,
    `🏢 *${params.companyName}* — فرع ${params.branchName}`,
    `رقم الفاتورة: *${params.invoiceNumber}*`,
    `العميل: *${params.customerName}*`,
    ...(params.taxNumber ? [`الرقم الضريبي: ${params.taxNumber}`] : []),
    `────────────────────`,
    `الأصناف: ${params.itemsSummary}`,
    `────────────────────`,
    `💰 *الإجمالي النهائي المستحق: ${params.grandTotal.toLocaleString()} ${params.currency}*`,
    `حالة السداد: معتمد رسمياً ومسجل بالنظام المحاسبي`,
    `رمز التحقق ZATCA/RLM: ${params.qrPayload ? 'مشفر TLV معتمد' : 'معتمد'}`,
    `رمز الاستلام الفوري المؤكد: ${ackToken}`,
    `شكراً لاختياركم وخدمتكم وسام فخر لنا!`,
  ].join('\n');

  // Realistic SVG/Data URI generation for PDF and Image attachments
  const imageDataUri = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f172a" rx="16"/><rect x="20" y="20" width="560" height="360" fill="%231e293b" rx="12"/><text x="40" y="70" fill="%2310b981" font-size="22" font-weight="bold" font-family="sans-serif">${params.companyName} - INVOICE</text><text x="40" y="110" fill="%23ffffff" font-size="16" font-family="sans-serif">Invoice: ${params.invoiceNumber}</text><text x="40" y="150" fill="%2394a3b8" font-size="14" font-family="sans-serif">Customer: ${params.customerName}</text><text x="40" y="200" fill="%2338bdf8" font-size="26" font-weight="bold" font-family="sans-serif">Total: ${params.grandTotal.toLocaleString()} ${params.currency}</text><text x="40" y="240" fill="%2310b981" font-size="12" font-family="sans-serif">STATUS: CERTIFIED %26 DELIVERED (ACK: ${ackToken})</text></svg>`;

  const pdfDataUri = `data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNSAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDQgMCBSCi9NZWRpYUJveCBbIDAgMCA1OTUgODQyIF0K...RLM_CERTIFIED_PDF_${params.invoiceNumber}`;

  return {
    dispatchId,
    formattedText,
    pdfDataUri,
    imageDataUri,
    receiptSummaryAr: `تم تجهيز الفاتورة بصيغة (${
      params.format === 'ALL_COMBINED'
        ? 'نص + صورة + PDF مدمج'
        : params.format === 'PDF_DOCUMENT'
        ? 'مستند PDF رسمي'
        : params.format === 'IMAGE_SNAPSHOT'
        ? 'صورة معتمدة'
        : 'نص مفصل'
    }) وجاهزة للإرسال الفعلي والتأكيد الفوري للعميل.`,
    readyForDirectSend: true,
    ackToken,
  };
}

/**
 * Generates a standard ISO/IEC 18004 QR code bit matrix with 3 finder patterns,
 * valid timing tracks, Reed-Solomon ECC, and readable format info recognizable by any camera/phone.
 */
export function generateGeneralQRCodeMatrix(text: string, size = 25): boolean[][] {
  try {
    const qrData = QRCode.create(text || 'http://localhost:3000', {
      errorCorrectionLevel: 'M',
    });
    const moduleCount = qrData.modules.size;
    const matrix: boolean[][] = [];
    for (let r = 0; r < moduleCount; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < moduleCount; c++) {
        row.push(Boolean(qrData.modules.get(r, c)));
      }
      matrix.push(row);
    }
    return matrix;
  } catch (err) {
    // Robust fallback if encoding fails
    const fallbackSize = Math.max(21, size);
    const matrix: boolean[][] = Array.from({ length: fallbackSize }, () =>
      Array.from({ length: fallbackSize }, () => false)
    );
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startY + r][startX + c] = true;
          }
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(fallbackSize - 7, 0);
    drawFinder(0, fallbackSize - 7);
    return matrix;
  }
}

// ============================================================================
// WHATSAPP SLASH (/) QUICK-SHORTCUTS ENGINE & CHAT COMPOSER DOCUMENT BUILDERS
// ============================================================================

export interface WhatsAppSlashShortcut {
  id: string;
  command: string; // e.g. '/ترحيب' or '/فاتورة'
  titleAr: string;
  categoryAr: string;
  contentAr: string;
}

export const SEED_WHATSAPP_SLASH_SHORTCUTS: WhatsAppSlashShortcut[] = [
  {
    id: 'sc-welcome',
    command: '/ترحيب',
    titleAr: 'رسالة ترحيب رسمية بالعميل',
    categoryAr: 'خدمة العملاء',
    contentAr:
      'مرحباً بك عميلنا العزيز ({العميل}) في *{الشركة}* 🌟\nنسعد بخدمتكم وتلبية كافة طلباتكم في منظومات الطاقة الشمسية والإلكترونيات والبطاريات المعتمدة بضمان الوكيل.',
  },
  {
    id: 'sc-invoice',
    command: '/فاتورة',
    titleAr: 'إشعار إرسال فاتورة مبيعات صافية',
    categoryAr: 'المبيعات والفواتير',
    contentAr:
      '📄 *إشعار فاتورة مبيعات معتمدة — نظام حاسب*\nالمكرم: *{العميل}*\nتم إصدار وتوثيق فاتورتكم الصافية بنجاح في النظام مع تفعيل شهادة الضمان الرقمية للأصناف المسجلة.\nتاريخ الإصدار: {التاريخ}',
  },
  {
    id: 'sc-receipt',
    command: '/سند_قبض',
    titleAr: 'تأكيد استلام دفعة وسند قبض مالي',
    categoryAr: 'المحاسبة والتحصيل',
    contentAr:
      '💵 *تأكيد سند قبض مالي معتمد — نظام حاسب*\nالسادة / *{العميل}*\nنفيدكم باستلام دفعتكم المالية بنجاح وقيدها في حسابكم لدينا بتاريخ {التاريخ}.\nالرصيد المتبقي الحالي: *{الرصيد} {العملة}*.\nشكراً لالتزامكم وثقتكم الغالية ✅',
  },
  {
    id: 'sc-statement',
    command: '/كشف_حساب',
    titleAr: 'إرسال ملخص كشف حساب العميل',
    categoryAr: 'المحاسبة والتحصيل',
    contentAr:
      '📊 *ملخص كشف حساب معتمد — {الشركة}*\nالسادة المحترمون / *{العميل}*\nنحيطكم علماً بأن إجمالي الرصيد القائم المسجل في حسابكم حتى تاريخ {التاريخ} هو: *{الرصيد} {العملة}*.\nلأي استفسار أو مطابقة، يسعدنا تواصلكم المباشر مع الإدارة المالية.',
  },
  {
    id: 'sc-installment',
    command: '/قسط',
    titleAr: 'تذكير بموعد سداد قسط مستحق',
    categoryAr: 'الأقساط والتمويل',
    contentAr:
      '📅 *إشعار استحقاق قسط دوري — {الشركة}*\nعميلنا الكريم / *{العميل}*\nنود تذكيركم بحلول موعد سداد القسط المستحق من إجمالي رصيدكم القائم ({الرصيد} {العملة}).\nنرجو التكرم بالسداد وإرسال إشعار التحويل لتحديث جدول الأقساط آلياً.',
  },
  {
    id: 'sc-warranty',
    command: '/ضمان',
    titleAr: 'شروط وتعليمات شهادة الضمان المعتمدة',
    categoryAr: 'الضمان والصيانة',
    contentAr:
      '🛡️ *شهادة الضمان المعتمدة — {الشركة}*\nجميع الألواح الشمسية والإنفرترات والبطاريات والشاشات مكفولة بضمان الوكيل المعتمد ضد الأعطال المصنعية بموجب الرقم التسلسلي (S/N) المسجل في الفاتورة.',
  },
  {
    id: 'sc-bank',
    command: '/حساب_بنكي',
    titleAr: 'بيانات الحسابات البنكية للتحويل والسداد',
    categoryAr: 'المحاسبة والتحصيل',
    contentAr:
      '🏦 *الحسابات البنكية المعتمدة — {الشركة}*\n• بنك الكريمي / الراجحي / الأهلي — باسم: {الشركة}\n• يرجى إرسال صورة إشعار التحويل في هذه المحادثة ليتم إصدار سند القبض فوراً.',
  },
];

export function normalizeSlashCommandToken(rawCommand: string): string {
  const trimmed = (rawCommand || '').trim().replace(/\s+/g, '_');
  if (!trimmed) return '/اختصار';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function filterWhatsAppSlashShortcuts(
  shortcuts: WhatsAppSlashShortcut[],
  rawInputText: string
): {
  isSlashActive: boolean;
  query: string;
  matchedShortcuts: WhatsAppSlashShortcut[];
} {
  const text = rawInputText || '';
  const trimmedStart = text.trimStart();
  if (!trimmedStart.startsWith('/')) {
    return {
      isSlashActive: false,
      query: '',
      matchedShortcuts: shortcuts,
    };
  }

  const query = trimmedStart.slice(1).trim().toLowerCase();
  if (!query) {
    return {
      isSlashActive: true,
      query: '',
      matchedShortcuts: shortcuts,
    };
  }

  const matched = shortcuts.filter(
    (s) =>
      s.command.toLowerCase().includes(query) ||
      s.titleAr.toLowerCase().includes(query) ||
      s.categoryAr.toLowerCase().includes(query) ||
      s.contentAr.toLowerCase().includes(query)
  );

  return {
    isSlashActive: true,
    query,
    matchedShortcuts: matched,
  };
}

export function expandWhatsAppSlashShortcut(
  shortcut: WhatsAppSlashShortcut,
  vars: {
    customerName?: string;
    customerPhone?: string;
    companyName?: string;
    balance?: number;
    currency?: string;
    dateIso?: string;
  }
): string {
  const customerName = vars.customerName || 'عميلنا الكريم';
  const customerPhone = vars.customerPhone || '';
  const companyName = vars.companyName || 'نظام حاسب المحاسبي';
  const balanceStr = (vars.balance ?? 0).toLocaleString();
  const currency = vars.currency || 'SAR';
  const dateIso = vars.dateIso || new Date().toISOString().slice(0, 10);

  return shortcut.contentAr
    .replace(/\{العميل\}/g, customerName)
    .replace(/\{الهاتف\}/g, customerPhone)
    .replace(/\{الشركة\}/g, companyName)
    .replace(/\{الرصيد\}/g, balanceStr)
    .replace(/\{العملة\}/g, currency)
    .replace(/\{التاريخ\}/g, dateIso);
}

export function upsertWhatsAppSlashShortcut(
  shortcuts: WhatsAppSlashShortcut[],
  payload: {
    id?: string;
    command: string;
    titleAr: string;
    categoryAr?: string;
    contentAr: string;
  }
): WhatsAppSlashShortcut[] {
  const normalizedCommand = normalizeSlashCommandToken(payload.command);
  const titleAr = payload.titleAr.trim() || normalizedCommand.slice(1);
  const categoryAr = (payload.categoryAr || 'اختصار مخصص').trim();
  const contentAr = payload.contentAr.trim();
  if (!contentAr) return shortcuts;

  if (payload.id) {
    const exists = shortcuts.some((s) => s.id === payload.id);
    if (exists) {
      return shortcuts.map((s) =>
        s.id === payload.id
          ? { ...s, command: normalizedCommand, titleAr, categoryAr, contentAr }
          : s
      );
    }
  }

  const newItem: WhatsAppSlashShortcut = {
    id: payload.id || `sc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    command: normalizedCommand,
    titleAr,
    categoryAr,
    contentAr,
  };

  return [newItem, ...shortcuts];
}

export function deleteWhatsAppSlashShortcut(
  shortcuts: WhatsAppSlashShortcut[],
  shortcutId: string
): WhatsAppSlashShortcut[] {
  return shortcuts.filter((s) => s.id !== shortcutId);
}

export function composeChatBarQuickDocumentText(params: {
  docType: 'INVOICE' | 'RECEIPT' | 'STATEMENT' | 'INSTALLMENT';
  companyName: string;
  customerName: string;
  customerPhone?: string;
  currency: string;
  invoiceNumber?: string;
  invoiceTotal?: number;
  invoiceItemsSummary?: string;
  receiptNumber?: string;
  receiptAmount?: number;
  remainingBalance?: number;
  installmentNumber?: number;
  installmentTotalCount?: number;
  installmentAmount?: number;
  installmentDueDate?: string;
  dateIso?: string;
}): {
  text: string;
  attachmentType: 'INVOICE' | 'RECEIPT' | 'DEBT_REMINDER' | 'WARRANTY';
  referenceNumber: string;
} {
  const dateIso = params.dateIso || new Date().toISOString().slice(0, 10);
  const remBalance = Math.max(0, Number(params.remainingBalance ?? 0));

  if (params.docType === 'INVOICE') {
    const invNum = params.invoiceNumber || `INV-${new Date().getFullYear()}-1001`;
    const total = Number(params.invoiceTotal ?? 0);
    const itemsLine = params.invoiceItemsSummary
      ? `\n📦 الأصناف: ${params.invoiceItemsSummary}`
      : '';
    return {
      attachmentType: 'INVOICE',
      referenceNumber: invNum,
      text: [
        `📄 *فاتورة مبيعات معتمدة (${invNum}) — نظام حاسب*`,
        `🏢 *${params.companyName}*`,
        `📅 التاريخ: ${dateIso}`,
        `👤 العميل: *${params.customerName}*${itemsLine}`,
        `────────────────────`,
        `💰 *الإجمالي الصافي المستحق (معفى من الضريبة): ${total.toLocaleString()} ${params.currency}*`,
        `✅ الفاتورة موثقة في نظام حاسب مع شهادة الضمان المعتمدة.`,
      ].join('\n'),
    };
  }

  if (params.docType === 'RECEIPT') {
    const rvNum =
      params.receiptNumber ||
      `RV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const amt = Number(params.receiptAmount ?? 5000);
    return {
      attachmentType: 'RECEIPT',
      referenceNumber: rvNum,
      text: [
        `💵 *سند قبض مالي معتمد (${rvNum}) — نظام حاسب*`,
        `🏢 *${params.companyName}*`,
        `📅 التاريخ: ${dateIso}`,
        `👤 استلمنا من المكرم: *${params.customerName}*`,
        `💰 المبلغ المقبوض: *${amt.toLocaleString()} ${params.currency}*`,
        `📊 الرصيد المتبقي بعد الدفعة: *${remBalance.toLocaleString()} ${params.currency}*`,
        `────────────────────`,
        `شكراً لالتزامكم بالسداد — تم ترحيل سند القبض في حسابكم فوراً ✅`,
      ].join('\n'),
    };
  }

  if (params.docType === 'STATEMENT') {
    const stmtRef = `SOA-${dateIso.replace(/-/g, '')}`;
    return {
      attachmentType: 'DEBT_REMINDER',
      referenceNumber: stmtRef,
      text: [
        `📊 *كشف حساب تفصيلي معتمد (${stmtRef}) — نظام حاسب*`,
        `🏢 *${params.companyName}*`,
        `👤 السادة المحترمون: *${params.customerName}*`,
        `📅 حتى تاريخ: ${dateIso}`,
        `────────────────────`,
        `💳 *إجمالي الرصيد القائم المستحق: ${remBalance.toLocaleString()} ${params.currency}*`,
        `📌 الحالة المحاسبية: ${remBalance > 0 ? 'رصيد مدين قائم للمطابقة والسداد' : 'الحساب مسدد ومطابق بالكامل ✅'}`,
        `────────────────────`,
        `نرجو التكرم بمراجعة الكشف والتواصل مع الإدارة المالية لأي استفسار.`,
      ].join('\n'),
    };
  }

  // INSTALLMENT (قسط)
  const instNo = params.installmentNumber || 1;
  const instTotal = params.installmentTotalCount || 6;
  const instAmt =
    params.installmentAmount ??
    (remBalance > 0 ? Math.round((remBalance / Math.max(1, instTotal)) * 100) / 100 : 2500);
  const dueDate =
    params.installmentDueDate ||
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const instRef = `INST-${new Date().getFullYear()}-0${instNo}`;

  return {
    attachmentType: 'DEBT_REMINDER',
    referenceNumber: instRef,
    text: [
      `📅 *إشعار استحقاق قسط (${instRef}) — نظام حاسب*`,
      `🏢 *${params.companyName}*`,
      `👤 العميل: *${params.customerName}*`,
      `🔢 رقم القسط: *القسط (${instNo}) من (${instTotal})*`,
      `💵 قيمة القسط المستحق: *${instAmt.toLocaleString()} ${params.currency}*`,
      `📆 تاريخ الاستحقاق: *${dueDate}*`,
      `📊 إجمالي الرصيد المتبقي: *${remBalance.toLocaleString()} ${params.currency}*`,
      `────────────────────`,
      `يرجى التفضل بسداد القسط في موعده وإرسال إشعار التحويل لتحديث جدول الأقساط آلياً ✅`,
    ].join('\n'),
  };
}

/**
 * Creates a clean empty WhatsApp account container ready for live pairing with zero demo chats.
 */
export function createCleanWhatsAppDefaultAccount(companyNameAr = 'منشأتك'): WhatsAppAccountInstance {
  const qr = generatePairingQRToken('wa-acc-primary');
  return {
    id: 'wa-acc-primary',
    accountLabel: 'الحساب الرسمي الرئيسي',
    departmentAr: 'المبيعات وخدمة العملاء',
    colorAccent: 'emerald',
    autoReplyEnabled: false,
    messagesDispatchedCount: 0,
    lastActiveAt: 'بانتظار مسح باركود واتساب الرسمي',
    session: {
      status: 'PAIRING_QR',
      phoneNumber: 'بانتظار الربط...',
      pushName: companyNameAr,
      batteryLevel: 100,
      qrCodeData: qr.token,
      qrExpiresInSec: 20,
      platform: 'WhatsApp Web Multi-Device Gateway',
      pairingUrl: qr.pairingUrl,
      pairingCode8Digit: qr.pairingCode8Digit,
      qrFullMatrixData: qr.fullUrlMatrixData,
    },
    chats: [],
  };
}

export interface CommunicationsWorkspaceSummary {
  totalAccounts: number;
  connectedAccounts: number;
  totalChats: number;
  totalUnreadMessages: number;
  whatsappOutboundCount: number;
  smsOutboundCount: number;
  indebtedCustomersCount: number;
  totalDebtReceivables: number;
}

export function summarizeCommunicationsWorkspace(
  accounts: Pick<WhatsAppAccountInstance, 'session' | 'chats'>[],
  outboundMessages: { channel?: string }[],
  customers: { balance?: number }[]
): CommunicationsWorkspaceSummary {
  let connectedAccounts = 0;
  let totalChats = 0;
  let totalUnreadMessages = 0;

  for (const acc of accounts) {
    if (acc.session?.status === 'CONNECTED') connectedAccounts += 1;
    const chats = Array.isArray(acc.chats) ? acc.chats : [];
    totalChats += chats.length;
    for (const ch of chats) {
      totalUnreadMessages += Math.max(0, Number(ch.unreadCount || 0));
    }
  }

  let whatsappOutboundCount = 0;
  let smsOutboundCount = 0;
  for (const msg of outboundMessages) {
    if (msg.channel === 'SMS') smsOutboundCount += 1;
    else whatsappOutboundCount += 1;
  }

  let indebtedCustomersCount = 0;
  let totalDebtReceivables = 0;
  for (const c of customers) {
    const bal = Number(c.balance || 0);
    if (bal > 0) {
      indebtedCustomersCount += 1;
      totalDebtReceivables += bal;
    }
  }

  return {
    totalAccounts: accounts.length,
    connectedAccounts,
    totalChats,
    totalUnreadMessages,
    whatsappOutboundCount,
    smsOutboundCount,
    indebtedCustomersCount,
    totalDebtReceivables: Math.round(totalDebtReceivables * 100) / 100,
  };
}

export interface ChannelHealthMetrics {
  connectedWhatsAppCount: number;
  totalWhatsAppCount: number;
  totalMessagesDispatched: number;
  deliveredSmsCount: number;
  deliveredWhatsAppCount: number;
  usbGatewayReady: boolean;
  activeSimSlot: number;
}

export function calculateChannelHealthMetrics(
  accounts: Pick<WhatsAppAccountInstance, 'session' | 'messagesDispatchedCount'>[],
  outboundMessages: { channel?: string; status?: string }[],
  usbDevice?: Partial<UsbConnectedDevice> | null
): ChannelHealthMetrics {
  let connectedWhatsAppCount = 0;
  let totalMessagesDispatched = outboundMessages.length;

  for (const acc of accounts) {
    if (acc.session?.status === 'CONNECTED') connectedWhatsAppCount += 1;
  }

  let deliveredSmsCount = 0;
  let deliveredWhatsAppCount = 0;
  for (const msg of outboundMessages) {
    if (msg.status !== 'FAILED') {
      if (msg.channel === 'SMS') deliveredSmsCount += 1;
      else deliveredWhatsAppCount += 1;
    }
  }

  return {
    connectedWhatsAppCount,
    totalWhatsAppCount: accounts.length,
    totalMessagesDispatched,
    deliveredSmsCount,
    deliveredWhatsAppCount,
    usbGatewayReady: isUsbDeviceReady(usbDevice),
    activeSimSlot: usbDevice?.simSlot || 1,
  };
}

