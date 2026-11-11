/**
 * RLM ERP - Real Multi-Account WhatsApp Web Multi-Device Gateway
 * Powered by @whiskeysockets/baileys (Official Noise + Signal Protocol over wss://web.whatsapp.com/ws/chat)
 *
 * Capabilities:
 * - Connects directly to real WhatsApp Web Multi-Device servers (no fake QR codes!)
 * - Generates genuine auto-refreshing WhatsApp QR codes (https://wa.me/settings/linked_devices#2@...)
 *   that are 100% accepted by the WhatsApp mobile app ("الأجهزة المرتبطة -> ربط جهاز")
 * - Supports multiple simultaneous WhatsApp accounts with isolated disk auth folders (.data/whatsapp_auth/<accountId>)
 * - Supports real 8-character phone number pairing codes via sock.requestPairingCode()
 * - Dispatches real WhatsApp messages (invoices, receipts, debt reminders, chat messages) via sock.sendMessage()
 * - Captures real incoming WhatsApp messages (messages.upsert) and syncs them into the ERP chat threads
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const AUTH_BASE_DIR = path.resolve(process.cwd(), '.data', 'whatsapp_auth');
if (!fs.existsSync(AUTH_BASE_DIR)) {
  fs.mkdirSync(AUTH_BASE_DIR, { recursive: true });
}

const silentLogger = pino({ level: 'silent' });

/**
 * In-memory registry of active Baileys sockets and live state per accountId
 */
const gatewayInstances = new Map();

let cachedWaVersion = null;
async function getWhatsAppVersion() {
  if (cachedWaVersion) return cachedWaVersion;
  try {
    const { version } = await fetchLatestBaileysVersion();
    cachedWaVersion = version;
    return version;
  } catch {
    cachedWaVersion = [2, 3000, 1043857760];
    return cachedWaVersion;
  }
}

function formatJidToPhone(jid) {
  if (!jid) return '';
  const raw = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
  if (!raw) return '';
  if (raw.startsWith('967') && raw.length >= 12) {
    return `+967 ${raw.slice(3, 6)} ${raw.slice(6, 9)} ${raw.slice(9)}`;
  }
  if (raw.startsWith('966') && raw.length >= 12) {
    return `+966 ${raw.slice(3, 5)} ${raw.slice(5, 8)} ${raw.slice(8)}`;
  }
  return `+${raw}`;
}

function phoneToWhatsAppJid(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    digits = `967${digits}`;
  } else if (digits.length === 10 && digits.startsWith('05')) {
    digits = `966${digits.slice(1)}`;
  } else if (digits.length === 9 && digits.startsWith('5')) {
    digits = `966${digits}`;
  }
  return `${digits}@s.whatsapp.net`;
}

/**
 * Starts or retrieves a live Baileys WhatsApp Web Multi-Device session for `accountId`.
 */
export async function ensureRealWhatsAppSocket(accountId = 'wa-acc-sales', options = {}) {
  const existing = gatewayInstances.get(accountId);
  if (
    existing &&
    existing.sock &&
    !options.forceRestart &&
    (existing.status === 'CONNECTED' || existing.status === 'PAIRING_QR' || existing.status === 'CONNECTING')
  ) {
    return getAccountLiveSnapshot(accountId);
  }

  const accountAuthDir = path.join(AUTH_BASE_DIR, accountId.replace(/[^a-zA-Z0-9_-]/g, '_'));
  if (options.clearAuth && fs.existsSync(accountAuthDir)) {
    try {
      fs.rmSync(accountAuthDir, { recursive: true, force: true });
    } catch {}
  }
  if (!fs.existsSync(accountAuthDir)) {
    fs.mkdirSync(accountAuthDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(accountAuthDir);
  const version = await getWhatsAppVersion();

  const instanceState = existing || {
    accountId,
    sock: null,
    status: 'CONNECTING',
    qrRaw: null,
    qrDataUrl: null,
    qrGeneratedAt: 0,
    qrSequence: 0,
    pairingCode: null,
    connectedPhone: null,
    connectedName: null,
    pairedAt: null,
    lastError: null,
    inboundMessages: [],
    contactsMap: new Map(),
  };

  instanceState.status = 'CONNECTING';
  instanceState.lastError = null;
  gatewayInstances.set(accountId, instanceState);

  try {
    if (existing?.sock) {
      try {
        existing.sock.end(undefined);
      } catch {}
    }
  } catch {}

  const sock = makeWASocket({
    version,
    auth: state,
    logger: silentLogger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: true,
    connectTimeoutMs: 30000,
    defaultQueryTimeoutMs: 30000,
  });

  instanceState.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      instanceState.status = 'PAIRING_QR';
      instanceState.qrRaw = qr;
      instanceState.qrGeneratedAt = Date.now();
      instanceState.qrSequence += 1;
      try {
        instanceState.qrDataUrl = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: 'L',
          margin: 3,
          width: 320,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
      } catch (err) {
        instanceState.lastError = String(err?.message || err);
      }
    }

    if (connection === 'open') {
      const userJid = sock.user?.id || '';
      const formattedPhone = formatJidToPhone(userJid);
      const pushName = sock.user?.name || sock.user?.verifiedName || 'حساب واتساب مرتبط فعلياً';

      instanceState.status = 'CONNECTED';
      instanceState.qrRaw = null;
      instanceState.qrDataUrl = null;
      instanceState.connectedPhone = formattedPhone || userJid;
      instanceState.connectedName = pushName;
      instanceState.pairedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      instanceState.lastError = null;

      if (typeof options.onConnected === 'function') {
        try {
          options.onConnected({
            accountId,
            phoneNumber: instanceState.connectedPhone,
            pushName: instanceState.connectedName,
            pairedAt: instanceState.pairedAt,
          });
        } catch {}
      }
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.statusCode ||
        0;
      const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

      if (loggedOut) {
        instanceState.status = 'DISCONNECTED';
        instanceState.qrRaw = null;
        instanceState.qrDataUrl = null;
        instanceState.connectedPhone = null;
        try {
          fs.rmSync(accountAuthDir, { recursive: true, force: true });
        } catch {}
        // Automatically spin up a fresh QR session so user can re-pair immediately
        setTimeout(() => {
          ensureRealWhatsAppSocket(accountId, { forceRestart: true, clearAuth: true }).catch(() => {});
        }, 1200);
      } else {
        // Reconnect automatically on transient socket close or QR rotation
        setTimeout(() => {
          ensureRealWhatsAppSocket(accountId, { forceRestart: true }).catch(() => {});
        }, 1500);
      }
    }
  });

  sock.ev.on('messages.upsert', (event) => {
    if (!event?.messages) return;
    for (const msg of event.messages) {
      if (!msg.message) continue;
      const remoteJid = msg.key?.remoteJid || '';
      if (!remoteJid || remoteJid === 'status@broadcast') continue;

      const textContent =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.documentMessage?.caption ||
        '';

      if (!textContent) continue;

      const isFromMe = Boolean(msg.key?.fromMe);
      const senderPhone = formatJidToPhone(remoteJid);
      const pushName = msg.pushName || senderPhone || 'عميل واتساب';

      const entry = {
        id: msg.key?.id || `wa-live-${Date.now()}`,
        accountId,
        remoteJid,
        senderPhone,
        contactName: pushName,
        text: textContent,
        fromMe: isFromMe,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        rawTimestamp: Date.now(),
      };

      instanceState.inboundMessages = [
        entry,
        ...instanceState.inboundMessages.filter((m) => m.id !== entry.id),
      ].slice(0, 100);
    }
  });

  return getAccountLiveSnapshot(accountId);
}

/**
 * Waits up to `timeoutMs` for the QR code to be emitted by WhatsApp's servers if still connecting.
 */
export async function waitForLiveQR(accountId = 'wa-acc-sales', timeoutMs = 6000) {
  await ensureRealWhatsAppSocket(accountId);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = getAccountLiveSnapshot(accountId);
    if (snap.status === 'CONNECTED' || snap.qrDataUrl) {
      return snap;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return getAccountLiveSnapshot(accountId);
}

/**
 * Requests a real 8-character pairing code from WhatsApp's servers for phone-number linking.
 */
export async function requestRealWhatsAppPairingCode(accountId, phoneNumber) {
  let cleanDigits = String(phoneNumber || '').replace(/\D/g, '');
  if (cleanDigits.startsWith('00')) cleanDigits = cleanDigits.slice(2);
  if (cleanDigits.length === 9 && cleanDigits.startsWith('7')) {
    cleanDigits = `967${cleanDigits}`;
  } else if (cleanDigits.length === 10 && cleanDigits.startsWith('05')) {
    cleanDigits = `966${cleanDigits.slice(1)}`;
  }

  if (cleanDigits.length < 10) {
    throw new Error('يرجى إدخال رقم الهاتف مع مفتاح الدولة (مثال: 967771234567)');
  }

  await ensureRealWhatsAppSocket(accountId);
  // Wait briefly until socket is ready to request pairing code
  await new Promise((r) => setTimeout(r, 1200));
  const inst = gatewayInstances.get(accountId);
  if (!inst || !inst.sock) {
    throw new Error('جاري تهيئة اتصال خادم واتساب، حاول مرة أخرى بعد ثانية.');
  }

  const code = await inst.sock.requestPairingCode(cleanDigits);
  const formattedCode =
    code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
  inst.pairingCode = formattedCode;
  return {
    success: true,
    pairingCode: formattedCode,
    phoneNumber: `+${cleanDigits}`,
  };
}

/**
 * Sends a real WhatsApp text message via the connected Baileys socket for `accountId`.
 */
export async function sendRealWhatsAppMessage(accountId, recipientPhone, messageText) {
  const inst = gatewayInstances.get(accountId);
  if (!inst || !inst.sock || inst.status !== 'CONNECTED') {
    return {
      sentViaRealSocket: false,
      sentViaRealWhatsApp: false,
      reason: 'SOCKET_NOT_CONNECTED',
    };
  }

  const jid = phoneToWhatsAppJid(recipientPhone);
  if (!jid) {
    return {
      sentViaRealSocket: false,
      sentViaRealWhatsApp: false,
      reason: 'INVALID_PHONE',
    };
  }

  const result = await inst.sock.sendMessage(jid, { text: messageText });
  const msgId = result?.key?.id || `wa-real-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    sentViaRealSocket: true,
    sentViaRealWhatsApp: true,
    messageId: msgId,
    jid,
  };
}

/**
 * Disconnects and logs out a real WhatsApp session for `accountId`, then prepares a fresh QR code.
 */
export async function disconnectRealWhatsAppSocket(accountId) {
  const inst = gatewayInstances.get(accountId);
  if (inst?.sock) {
    try {
      await inst.sock.logout();
    } catch {}
    try {
      inst.sock.end(undefined);
    } catch {}
  }
  return waitForLiveQR(accountId, 4500);
}

export function getAccountLiveSnapshot(accountId) {
  const inst = gatewayInstances.get(accountId);
  if (!inst) {
    return {
      accountId,
      isSocketInitialized: false,
      status: 'IDLE',
      qrRaw: null,
      qrDataUrl: null,
      qrSequence: 0,
      qrAgeSec: 0,
      qrExpiresInSec: 20,
      pairingCode: null,
      connectedPhone: null,
      connectedName: null,
      pairedAt: null,
      inboundMessages: [],
    };
  }

  const ageSec = inst.qrGeneratedAt
    ? Math.floor((Date.now() - inst.qrGeneratedAt) / 1000)
    : 0;
  const expiresInSec = Math.max(1, 20 - (ageSec % 20));

  return {
    accountId,
    isSocketInitialized: true,
    status: inst.status,
    qrRaw: inst.qrRaw,
    qrDataUrl: inst.qrDataUrl,
    qrSequence: inst.qrSequence,
    qrAgeSec: ageSec,
    qrExpiresInSec: expiresInSec,
    pairingCode: inst.pairingCode,
    connectedPhone: inst.connectedPhone,
    connectedName: inst.connectedName,
    pairedAt: inst.pairedAt,
    inboundMessages: inst.inboundMessages || [],
    lastError: inst.lastError,
  };
}

export function getAllLiveSnapshots() {
  const out = {};
  for (const [id] of gatewayInstances.entries()) {
    out[id] = getAccountLiveSnapshot(id);
  }
  return out;
}
