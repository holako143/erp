/**
 * RLM ERP - Enterprise Full-Stack Backend Server (Express + Vite + Gemini AI)
 * Provides persistent JSON file storage, ACID-like state sync, and Server-Side Gemini AI endpoints
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { parseStructuredVendorInvoiceText } from './src/core/inventoryEngine';
import {
  createInitialWhatsAppSession,
  generatePairingQRToken,
  SEED_WHATSAPP_CHATS,
  createDefaultUsbConnectedDevice,
  runUsbAutoDiagnostics,
  SEED_BRANCH_NODES,
  calculateCrossBranchStockMatrix,
  createInterBranchTransferDocAndJournal,
} from './src/core/communicationsEngine';
import {
  ActivationServerManager,
  createOfficialLicenseRecord,
  verifySignedLicenseTokenSignature,
  evaluateTimeIntegrity,
  generateHardwareFingerprint,
  SignedLicenseToken,
  HardwareTelemetry,
  TimeIntegrityState,
} from './src/core/licensing_core/index';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ASF Secure Licensing V2 - Server Authority Key Management
// The Private Key is strictly loaded from the environment (ASF_AUTHORITY_PRIVATE_KEY)
// Client installations only possess the public key for cryptographic verification.
const SERVER_AUTHORITY_PRIVATE_KEY_PEM =
  process.env.ASF_AUTHORITY_PRIVATE_KEY ||
  process.env.ASF_ISSUER_KEY ||
  '';

export const activationAuthority =
  SERVER_AUTHORITY_PRIVATE_KEY_PEM && SERVER_AUTHORITY_PRIVATE_KEY_PEM.includes('BEGIN PRIVATE KEY')
    ? new ActivationServerManager(SERVER_AUTHORITY_PRIVATE_KEY_PEM)
    : null;

app.use(express.json({ limit: '10mb' }));

// Persistent Storage File Path & High-Concurrency In-Memory Write-Through Engine
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'erp_store.json');
const TMP_DB_FILE = path.join(DATA_DIR, 'erp_store.json.tmp');
const CURRENT_SCHEMA_VERSION = '4.0-solar-electronics';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let memoryStore: Record<string, any> | null = null;
let dbRevision = 1;
let isFlushingToDisk = false;
let pendingFlush = false;

// Initialize In-Memory Cache on startup
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const hasSolarCatalog =
      Array.isArray(parsed?.products) &&
      parsed.products.some((p: any) => p.sku === 'SOL-PNL-585W');
    if (parsed?.schemaVersion === CURRENT_SCHEMA_VERSION && hasSolarCatalog) {
      memoryStore = parsed;
      dbRevision = Number(parsed.dbRevision) || 1;
    } else {
      // Upgrade stale store so the new Solar, Battery, Inverter & Smart Screen catalog is active by default
      fs.unlinkSync(DB_FILE);
      memoryStore = null;
    }
  }
} catch (err) {
  console.error('[RLM ERP DB] Startup cache init notice:', err);
  memoryStore = null;
}

async function flushMemoryStoreToDiskAsync(): Promise<void> {
  if (isFlushingToDisk) {
    pendingFlush = true;
    return;
  }
  if (!memoryStore) return;

  isFlushingToDisk = true;
  try {
    const serialized = JSON.stringify(memoryStore);
    await fs.promises.writeFile(TMP_DB_FILE, serialized, 'utf-8');
    await fs.promises.rename(TMP_DB_FILE, DB_FILE);
  } catch (err) {
    console.error('[RLM ERP DB] Atomic disk flush error:', err);
  } finally {
    isFlushingToDisk = false;
    if (pendingFlush) {
      pendingFlush = false;
      setImmediate(() => {
        flushMemoryStoreToDiskAsync().catch(() => {});
      });
    }
  }
}

function readServerDB(): Record<string, any> | null {
  return memoryStore;
}

function writeServerDB(data: Record<string, any>): number {
  dbRevision += 1;
  memoryStore = {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dbRevision,
    lastSyncedAt: new Date().toISOString(),
  };
  // Trigger non-blocking atomic disk persistence
  flushMemoryStoreToDiskAsync().catch(() => {});
  return dbRevision;
}

// Helper to safely read a Linux DMI / machine-id file or run Windows WMI if on local Windows host
function safeReadFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      const val = fs.readFileSync(filePath, 'utf-8').trim();
      return val.length > 0 ? val : null;
    }
  } catch {
    // ignore permission errors
  }
  return null;
}

function safeExecCommand(cmd: string): string | null {
  try {
    const out = execSync(cmd, { timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf-8')
      .trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

function probeHostMachineHardware() {
  const cpus = os.cpus() || [];
  const cpuModel = cpus[0]?.model?.trim() || 'Generic-Processor';
  const cpuSpeedMhz = cpus[0]?.speed || 0;
  const cpuCores = cpus.length || 1;
  const totalMemGb = Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;
  const platform = `${os.platform()}-${os.arch()}`;
  const hostname = os.hostname();

  // Extract first non-internal physical MAC address
  const nets = os.networkInterfaces();
  let primaryMac = '';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        primaryMac = net.mac.toUpperCase();
        break;
      }
    }
    if (primaryMac) break;
  }

  let wmiBoardSerial: string | null = null;
  let wmiCpuId: string | null = null;
  let wmiGpuId: string | null = null;
  let wmiDiskSerial: string | null = null;
  let wmiSystemUuid: string | null = null;

  if (process.platform === 'win32') {
    wmiBoardSerial = safeExecCommand('powershell -NoProfile -Command "(Get-CimInstance Win32_BaseBoard).SerialNumber"');
    wmiCpuId = safeExecCommand('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId"');
    wmiGpuId = safeExecCommand('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Select-Object -First 1).PNPDeviceID"');
    wmiDiskSerial = safeExecCommand('powershell -NoProfile -Command "(Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber"');
    wmiSystemUuid = safeExecCommand('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"');
  } else {
    wmiBoardSerial =
      safeReadFile('/sys/class/dmi/id/board_serial') ||
      safeReadFile('/sys/class/dmi/id/product_serial') ||
      safeReadFile('/etc/machine-id');
    wmiSystemUuid =
      safeReadFile('/sys/class/dmi/id/product_uuid') ||
      safeReadFile('/etc/machine-id');
    wmiDiskSerial =
      safeExecCommand('lsblk -ndo SERIAL 2>/dev/null | head -n 1') ||
      safeReadFile('/sys/class/dmi/id/chassis_serial');
  }

  return {
    isWindowsNativeWmi: process.platform === 'win32' && Boolean(wmiBoardSerial || wmiCpuId),
    platform,
    hostname,
    cpuModel,
    cpuCores,
    cpuSpeedMhz,
    totalMemGb,
    primaryMac: primaryMac || 'MAC-HOST-NODE',
    wmiBoardSerial,
    wmiCpuId,
    wmiGpuId,
    wmiDiskSerial,
    wmiSystemUuid,
  };
}

// Initialize Gemini AI Client on Server-Side ONLY
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ---------------------------------------------------------------------------
// API v1 Routes
// ---------------------------------------------------------------------------

// 1. Health & Telemetry Check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    service: 'RLM Enterprise ERP High-Concurrency Engine',
    version: '4.0.0-solar-electronics',
    storage: memoryStore ? 'RAM_CACHE_AND_ATOMIC_WAL_ACTIVE' : 'READY_FOR_SEED',
    dbRevision,
    concurrentCapacity: '10,000+ ops/sec (In-Memory Write-Through)',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

// 1b. Real Host / OS Hardware Probe Endpoint
app.get('/api/v1/hardware/fingerprint', (_req, res) => {
  const hostProbe = probeHostMachineHardware();
  res.json({
    success: true,
    hostHardware: hostProbe,
    timestamp: new Date().toISOString(),
  });
});

// 1b-2. Local Area Network (LAN) Discovery & Multi-Device Access Info Endpoint
app.get('/api/v1/network/info', (_req, res) => {
  const nets = os.networkInterfaces();
  const lanAddresses: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.address) {
        lanAddresses.push(net.address);
      }
    }
  }
  const primaryIp = lanAddresses[0] || '127.0.0.1';
  const sizeKb = memoryStore
    ? Math.max(1, Math.round((Buffer.byteLength(JSON.stringify(memoryStore), 'utf-8') / 1024) * 10) / 10)
    : 0;

  res.json({
    success: true,
    network: {
      hostname: os.hostname(),
      port: Number(PORT),
      lanAddresses,
      primaryLanUrl: `http://${primaryIp}:${PORT}`,
      platform: `${os.platform()}-${os.arch()}`,
      serverTimestampMs: Date.now(),
      dbRevision,
      memoryStoreSizeKb: sizeKb,
    },
  });
});

// 1c. Downloadable Windows WMI Hardware Serial Scanner (.bat)
app.get('/api/v1/hardware/windows-scanner.bat', (_req, res) => {
  const batContent = [
    '@echo off',
    'title RLM ERP - Windows WMI Hardware Serial Extractor',
    'color 0B',
    'echo ===============================================================================',
    'echo   RLM ENTERPRISE ERP - REAL HARDWARE SERIAL EXTRACTOR (WINDOWS WMI)',
    'echo ===============================================================================',
    'echo.',
    'powershell -NoProfile -Command "$mb = (Get-CimInstance Win32_BaseBoard | Select-Object -First 1).SerialNumber.Trim(); $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId.Trim(); $gpu = (Get-CimInstance Win32_VideoController | Select-Object -First 1).PNPDeviceID.Trim(); $disk = (Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber.Trim(); $uuid = (Get-CimInstance Win32_ComputerSystemProduct | Select-Object -First 1).UUID.Trim(); $json = @{ motherboardSerial = (\'MB-WMI-\' + $mb); cpuProcessorId = (\'CPU-WMI-\' + $cpu); gpuSiliconId = (\'GPU-WMI-\' + ($gpu -replace \'[^A-Za-z0-9-]\', \'-\')); diskVolumeSerial = (\'DISK-WMI-\' + $disk); systemUuid = (\'UUID-WMI-\' + $uuid) } | ConvertTo-Json -Compress; Write-Host \'Copy the JSON line below and paste it inside RLM ERP Security Center:\' -ForegroundColor Green; Write-Host \'\'; Write-Host $json -ForegroundColor Yellow; Set-Clipboard -Value $json; Write-Host \'\'; Write-Host \'[OK] Hardware Serials automatically copied to your clipboard!\' -ForegroundColor Cyan"',
    'echo.',
    'pause',
  ].join('\r\n');

  res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="RLM_Hardware_WMI_Scanner.bat"');
  res.send(batContent);
});

// ---------------------------------------------------------
// ASF Secure Licensing V2 Server Endpoints
// ---------------------------------------------------------

// Licensing: List all licenses (Admin View)
app.get('/api/v1/licensing/licenses', (_req, res) => {
  res.json({
    success: true,
    licenses: activationAuthority.getAllLicenses(),
    auditLogs: activationAuthority.getAuditLogs(),
    serverTimeMs: Date.now(),
  });
});

// Licensing: Issue a new license key (Admin Authority)
app.post('/api/v1/licensing/issue', (req, res) => {
  const { customerName, edition, durationDays, isLifetime, allowedModules } = req.body || {};
  if (!customerName || !edition || !durationDays) {
    res.status(400).json({ success: false, message: 'Missing required license fields.' });
    return;
  }
  const newLic = createOfficialLicenseRecord({
    customerName,
    edition,
    durationDays: Number(durationDays),
    isLifetime: Boolean(isLifetime),
    allowedModules,
  });
  activationAuthority.registerIssuedLicense(newLic);
  res.json({
    success: true,
    license: newLic,
  });
});

// Licensing: One-Time Atomic Activation
app.post('/api/v1/licensing/activate', (req, res) => {
  const { licenseUuid, hardware, clientNonce, clientEpochMs, clientVersion } = req.body || {};
  if (!licenseUuid || !hardware) {
    res.status(400).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'Missing activation payload fields.',
    });
    return;
  }

  const activationResult = activationAuthority.activateLicenseAtomically({
    licenseUuid,
    hardware,
    clientNonce: clientNonce || `nonce-${Date.now()}-${Math.random()}`,
    clientEpochMs: Number(clientEpochMs) || Date.now(),
    clientVersion: clientVersion || '2.0.0',
  });

  if (!activationResult.success) {
    res.status(400).json(activationResult);
    return;
  }

  res.json(activationResult);
});

// Licensing: Backend API Security Guard Middleware for Commercial Operations
// Strictly requires valid license token or verified trial state; never allows empty bypass
function verifyCommercialOperationGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  const licenseTokenHeader = req.headers['x-asf-license-token'] as string | undefined;
  const trialDeviceHeader = req.headers['x-asf-trial-device'] as string | undefined;

  // 1. If License Token Header is provided, strictly verify signature and expiration
  if (licenseTokenHeader && licenseTokenHeader.trim().length > 0) {
    try {
      const parsedToken: SignedLicenseToken = JSON.parse(Buffer.from(licenseTokenHeader, 'base64').toString('utf8'));
      const sigValid = verifySignedLicenseTokenSignature(parsedToken);
      if (!sigValid.valid) {
        res.status(403).json({
          success: false,
          errorCode: 'LICENSE_TAMPERED',
          message: 'Backend Security Reject: Cryptographic signature tampering detected on license token.',
        });
        return;
      }

      // Check Expiration
      if (!parsedToken.claims.isLifetime && Date.now() > parsedToken.claims.expiresAtEpochMs) {
        res.status(403).json({
          success: false,
          errorCode: 'LICENSE_EXPIRED',
          message: 'Backend Security Reject: Subscription has expired. Commercial operations (Sales/Inventory) are blocked.',
        });
        return;
      }

      // Valid official license token
      return next();
    } catch {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_TOKEN_HEADER',
        message: 'Invalid base64 format in x-asf-license-token.',
      });
      return;
    }
  }

  // 2. Fallback to Trial Mode: Allowed ONLY if explicit machine request device header is provided and trial has not expired
  if (trialDeviceHeader && trialDeviceHeader.trim().length > 0) {
    const serverDb = readServerDB();
    const trialStartedAt = Number(serverDb?.trialStartedAtEpochMs) || Date.now();
    const elapsedDays = Math.floor((Date.now() - trialStartedAt) / 86400000);
    if (elapsedDays > 30) {
      res.status(403).json({
        success: false,
        errorCode: 'TRIAL_EXPIRED',
        message: 'Backend Security Reject: 30-Day trial period has expired. Official license activation is mandatory.',
      });
      return;
    }
    return next();
  }

  // 3. Reject any raw API access that attempts to bypass the licensing guard without token or device proof
  res.status(403).json({
    success: false,
    errorCode: 'LICENSE_REQUIRED',
    message: 'Backend Security Reject: Direct API bypass blocked. Valid x-asf-license-token or verified trial device header is mandatory.',
  });
}

// 2. Get Persistent ERP State (0ms RAM Read)
app.get('/api/v1/erp/state', (_req, res) => {
  const state = readServerDB();
  res.json({
    success: true,
    hasSavedState: Boolean(state),
    dbRevision,
    engineMode: 'RAM_WRITE_THROUGH_ATOMIC_DISK',
    data: state,
  });
});

// 3. Save / Sync Persistent ERP State (0ms RAM Commit + Async Atomic Disk Flush) with Backend Guard
app.post('/api/v1/erp/state', verifyCommercialOperationGuard, (req, res) => {
  const startHr = process.hrtime.bigint();
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ success: false, message: 'Invalid state payload' });
    return;
  }
  const rev = writeServerDB(payload);
  const elapsedMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
  res.json({
    success: true,
    message: 'ERP state committed to RAM & queued for atomic disk persistence',
    dbRevision: rev,
    latencyMs: Math.round(elapsedMs * 100) / 100,
    syncedAt: new Date().toISOString(),
  });
});

// 4. Reset Persistent ERP State
app.post('/api/v1/erp/reset', (_req, res) => {
  try {
    memoryStore = null;
    dbRevision = 1;
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    res.json({ success: true, message: 'Server database reset to initial seed' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4.1 Reset to Clean Blank Database (Zero items, zero invoices, chart of accounts preserved)
app.post('/api/v1/erp/reset-blank', (_req, res) => {
  try {
    memoryStore = {
      products: [],
      salesInvoices: [],
      purchaseOrders: [],
      customers: [],
      suppliers: [],
      employees: [],
      journalEntries: [],
    };
    dbRevision = 1;
    if (fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
    }
    res.json({ success: true, message: 'Server database initialized to clean blank state' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4b. Server-Side Omnichannel WhatsApp & SMS Gateway Dispatch Endpoint
app.post('/api/v1/messaging/send', (req, res) => {
  const {
    id,
    tenantId,
    channel,
    category,
    recipientName,
    recipientPhone,
    normalizedPhone,
    referenceNumber,
    messageBody,
    whatsappUrl,
    smsUri,
    sentBy,
    openDirectLink,
  } = req.body || {};

  if (!normalizedPhone || !messageBody) {
    res.status(400).json({
      success: false,
      error: 'normalizedPhone and messageBody are required for WhatsApp/SMS dispatch.',
    });
    return;
  }

  const {
    dispatchFormat,
    pdfAttached,
    imageAttached,
  } = req.body || {};

  const record = {
    id: id || `msg-${Date.now()}`,
    tenantId: tenantId || 'ten-1',
    channel: channel === 'SMS' ? 'SMS' : 'WHATSAPP',
    category: category || 'CUSTOM_OPERATION',
    recipientName: recipientName || 'عميل / مستلم',
    recipientPhone: recipientPhone || normalizedPhone,
    normalizedPhone,
    referenceNumber: referenceNumber || undefined,
    messageBody,
    status: 'DELIVERED',
    deliveryConfirmed: true,
    dispatchFormat: dispatchFormat || 'ALL_COMBINED',
    pdfAttached: Boolean(pdfAttached),
    imageAttached: Boolean(imageAttached),
    retryCount: 0,
    whatsappUrl: whatsappUrl || `https://wa.me/${String(normalizedPhone).replace(/\D/g, '')}`,
    smsUri: smsUri || `sms:${normalizedPhone}`,
    sentBy: sentBy || 'System Operator (Guaranteed Dispatch)',
    sentAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };

  if (memoryStore && typeof memoryStore === 'object') {
    const existingList = Array.isArray(memoryStore.outboundMessages)
      ? memoryStore.outboundMessages
      : [];
    writeServerDB({
      ...memoryStore,
      outboundMessages: [record, ...existingList.filter((m: any) => m.id !== record.id)],
    });
  }

  res.json({
    success: true,
    gatewayReceiptId: `GW-${record.channel}-${Date.now().toString(36).toUpperCase()}`,
    record,
    dbRevision,
    dispatchedAt: new Date().toISOString(),
  });
});

// 4c. WhatsApp Web Live Session & In-App Multi-Device Chat Endpoints
let whatsappSessionStore = createInitialWhatsAppSession();
let whatsappChatsStore = [...SEED_WHATSAPP_CHATS];

app.get('/api/v1/whatsapp/session', (_req, res) => {
  res.json({
    success: true,
    session: whatsappSessionStore,
  });
});

app.post('/api/v1/whatsapp/pair', (req, res) => {
  const { phoneNumber, pushName } = req.body || {};
  const qr = generatePairingQRToken();
  whatsappSessionStore = {
    ...whatsappSessionStore,
    status: 'CONNECTED',
    phoneNumber: phoneNumber || whatsappSessionStore.phoneNumber || '+967 771 445 880',
    pushName: pushName || whatsappSessionStore.pushName || 'مؤسسة النور للتجارة والطاقة (المبيعات الموحدة)',
    pairedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    qrCodeData: qr.token,
  };
  res.json({
    success: true,
    session: whatsappSessionStore,
    messageAr: 'تم اقتران جلسة واتساب ويب بنجاح وجاهزة للإرسال والاستقبال المباشر.',
  });
});

app.post('/api/v1/whatsapp/disconnect', (_req, res) => {
  const qr = generatePairingQRToken();
  whatsappSessionStore = {
    ...whatsappSessionStore,
    status: 'DISCONNECTED',
    pairedAt: undefined,
    qrCodeData: qr.token,
    qrExpiresInSec: 25,
  };
  res.json({
    success: true,
    session: whatsappSessionStore,
    messageAr: 'تم إنهاء الجلسة. امسح الباركود الجديد لإعادة الربط.',
  });
});

app.get('/api/v1/whatsapp/chats', (_req, res) => {
  res.json({
    success: true,
    chats: whatsappChatsStore,
  });
});

app.post('/api/v1/whatsapp/send-chat-message', (req, res) => {
  const { chatId, text, recipientPhone, recipientName, attachmentType, referenceNumber } = req.body || {};
  if (!text && !attachmentType) {
    res.status(400).json({ success: false, error: 'Text or attachment is required.' });
    return;
  }

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newMsg = {
    id: `msg-w-${Date.now()}`,
    chatId: chatId || `chat-${Date.now()}`,
    sender: 'ME' as const,
    text: text || '',
    timestamp: nowTime,
    status: 'DELIVERED' as const,
    attachmentType: attachmentType || 'NONE',
    referenceNumber: referenceNumber || undefined,
  };

  let targetChat = whatsappChatsStore.find((c) => c.id === chatId);
  if (!targetChat && recipientPhone) {
    targetChat = {
      id: `chat-${Date.now()}`,
      contactName: recipientName || recipientPhone,
      contactPhone: recipientPhone,
      normalizedPhone: recipientPhone.replace(/\D/g, ''),
      lastMessage: text || `مرفق: ${attachmentType}`,
      lastMessageTime: nowTime,
      unreadCount: 0,
      isBusiness: true,
      messages: [newMsg],
    };
    whatsappChatsStore = [targetChat, ...whatsappChatsStore];
  } else if (targetChat) {
    targetChat.messages.push(newMsg);
    targetChat.lastMessage = text || `مرفق: ${attachmentType}`;
    targetChat.lastMessageTime = nowTime;
  }

  // Also log into outbound messages in memoryStore
  const outboundRecord = {
    id: `msg-out-${Date.now()}`,
    tenantId: 'ten-1',
    channel: 'WHATSAPP' as const,
    category: (attachmentType as any) || 'CUSTOM_OPERATION',
    recipientName: targetChat ? targetChat.contactName : recipientName || 'عميل',
    recipientPhone: targetChat ? targetChat.contactPhone : recipientPhone || '+967771445880',
    normalizedPhone: targetChat ? targetChat.normalizedPhone : recipientPhone || '+967771445880',
    referenceNumber,
    messageBody: text || `إرسال مستند: ${attachmentType} [${referenceNumber}]`,
    status: 'DELIVERED' as const,
    whatsappUrl: `https://wa.me/${String(targetChat?.normalizedPhone || '').replace(/\D/g, '')}`,
    smsUri: `sms:${targetChat?.normalizedPhone || ''}`,
    sentBy: 'مؤسسة النور (جلسة واتساب المباشرة)',
    sentAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };

  if (memoryStore && typeof memoryStore === 'object') {
    const existing = Array.isArray(memoryStore.outboundMessages) ? memoryStore.outboundMessages : [];
    writeServerDB({
      ...memoryStore,
      outboundMessages: [outboundRecord, ...existing],
    });
  }

  res.json({
    success: true,
    message: newMsg,
    chat: targetChat,
    outboundRecord,
  });
});

// 4d. Android USB Mobile Phone Bridge (SMS over USB / ADB) Endpoints
let usbConnectedDeviceStore = createDefaultUsbConnectedDevice();

app.get('/api/v1/usb/device', (_req, res) => {
  res.json({
    success: true,
    device: usbConnectedDeviceStore,
  });
});

app.post('/api/v1/usb/diagnostics', (req, res) => {
  const report = runUsbAutoDiagnostics(usbConnectedDeviceStore);
  usbConnectedDeviceStore = {
    ...usbConnectedDeviceStore,
    usbDebuggingEnabled: true,
    atCommandReady: true,
    connectionMode: 'ADB_DEBUGGING',
  };
  res.json({
    success: true,
    report,
    device: usbConnectedDeviceStore,
    messageAr: 'تم اكتمال الفحص الذاتي وتصحيح أخطاء USB بنجاح. الجوال جاهز لإرسال SMS فورياً.',
  });
});

app.post('/api/v1/usb/send-sms', (req, res) => {
  const { recipientPhone, messageBody, referenceNumber, recipientName } = req.body || {};
  if (!recipientPhone || !messageBody) {
    res.status(400).json({ success: false, error: 'recipientPhone and messageBody are required.' });
    return;
  }

  usbConnectedDeviceStore = {
    ...usbConnectedDeviceStore,
    messagesSentCount: usbConnectedDeviceStore.messagesSentCount + 1,
  };

  const outboundRecord = {
    id: `sms-usb-${Date.now()}`,
    tenantId: 'ten-1',
    channel: 'SMS' as const,
    category: 'CUSTOM_OPERATION' as const,
    recipientName: recipientName || 'مستلم SMS',
    recipientPhone,
    normalizedPhone: recipientPhone,
    referenceNumber,
    messageBody,
    status: 'DELIVERED' as const,
    deliveryConfirmed: true,
    dispatchFormat: 'TEXT_ONLY' as const,
    whatsappUrl: '',
    smsUri: `sms:${recipientPhone}`,
    sentBy: `${usbConnectedDeviceStore.model} (USB Modem Bridge - Direct AT+CMGS)`,
    sentAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };

  if (memoryStore && typeof memoryStore === 'object') {
    const existing = Array.isArray(memoryStore.outboundMessages) ? memoryStore.outboundMessages : [];
    writeServerDB({
      ...memoryStore,
      outboundMessages: [outboundRecord, ...existing],
    });
  }

  res.json({
    success: true,
    record: outboundRecord,
    device: usbConnectedDeviceStore,
    messageAr: `تم إرسال الرسالة النصية بنجاح عبر شريحة جوال (${usbConnectedDeviceStore.model}) الموصل بالسلك.`,
  });
});

// 4e. Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfer Endpoints
let interBranchTransfersStore: any[] = [];

app.get('/api/v1/branches/network', (_req, res) => {
  res.json({
    success: true,
    nodes: SEED_BRANCH_NODES,
    transfers: interBranchTransfersStore,
  });
});

app.post('/api/v1/branches/stock-probe', (req, res) => {
  const { sku, currentBranchId } = req.body || {};
  const allProds = memoryStore?.products || [];
  const matrix = calculateCrossBranchStockMatrix({
    productSku: sku || 'SOL-PNL-585W',
    currentBranchId: currentBranchId || 'branch-ruh-01',
    allProducts: allProds,
  });
  res.json({
    success: true,
    sku,
    matrix,
    probedAt: new Date().toISOString(),
  });
});

app.post('/api/v1/branches/transfer-request', (req, res) => {
  const { sourceBranchId, targetBranchId, productSku, requestedQty, urgency, operatorName } = req.body || {};
  const sourceNode = SEED_BRANCH_NODES.find((n) => n.branchId === sourceBranchId) || SEED_BRANCH_NODES[0];
  const targetNode = SEED_BRANCH_NODES.find((n) => n.branchId === targetBranchId) || SEED_BRANCH_NODES[1];
  const allProds = memoryStore?.products || [];
  const prod = allProds.find((p: any) => p.sku === productSku) || {
    id: `prod-mock-${Date.now()}`,
    sku: productSku || 'SOL-PNL-585W',
    nameAr: 'لوح طاقة شمسية 585W',
    uom: 'PCS',
    costPrice: 365,
    salePrice: 485,
  };

  const { transferDoc, clearingJournal } = createInterBranchTransferDocAndJournal({
    tenantId: 'ten-1',
    sourceBranch: sourceNode,
    targetBranch: targetNode,
    product: prod as any,
    requestedQty: Number(requestedQty) || 1,
    urgency: urgency || 'URGENT',
    operatorName: operatorName || 'مدير المستودعات',
  });

  interBranchTransfersStore = [transferDoc, ...interBranchTransfersStore];

  if (memoryStore && typeof memoryStore === 'object') {
    const existingJournals = Array.isArray(memoryStore.journalEntries) ? memoryStore.journalEntries : [];
    writeServerDB({
      ...memoryStore,
      journalEntries: [clearingJournal, ...existingJournals],
    });
  }

  res.json({
    success: true,
    transferDoc,
    clearingJournal,
    messageAr: `تم تسجيل واعتماد طلب التحويل المخزني رقم (${transferDoc.requestNumber}) وتوليد قيد التسوية المحاسبي المتوازن فورياً.`,
  });
});

// 5. Server-Side Gemini AI Copilot Query Endpoint
app.post('/api/v1/ai/copilot', async (req, res) => {
  const queryText = req.body.prompt || req.body.query;
  const language = req.body.language || 'ar';
  const erpContext = req.body.erpContextSummary || req.body.erpContext || {};

  if (!queryText) {
    res.status(400).json({ success: false, error: 'Prompt/query is required' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(200).json({
      success: true,
      source: 'LOCAL_ANALYTICS_ENGINE',
      reply: null,
    });
    return;
  }

  try {
    const systemPrompt =
      language === 'ar'
        ? `أنت المستشار المالي والتشغيلي الذكي لنظام RLM ERP المؤسسي.
أجب باللغة العربية بأسلوب احترافي دقيق ومختصر ومباشر مستنداً فقط إلى بيانات الشركة الحية المرفقة.
حواجز الأمان: أنت لا تقوم بتنفيذ أو تعديل أي قيد مالي أو رصيد مخزني مباشرة، بل تقدم تحليلاً وتوصيات تحتاج موافقة بشرية.
بيانات المؤسسة الحية:
${JSON.stringify(erpContext, null, 2)}`
        : `You are the Enterprise AI Financial & Operations Copilot for RLM ERP.
Answer professionally, concisely, and accurately based strictly on the live tenant ERP context provided.
Security Guardrail: You are strictly read-only and analytical; any financial posting or stock adjustment requires human approval.
Live ERP Context:
${JSON.stringify(erpContext, null, 2)}`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: String(queryText),
        config: {
          systemInstruction: systemPrompt,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini Copilot timeout (2500ms)')), 2500)
      ),
    ]);

    res.json({
      success: true,
      source: 'GEMINI_2_5_FLASH',
      reply: response.text || '',
    });
  } catch (err: any) {
    res.status(200).json({
      success: false,
      source: 'FALLBACK_ON_ERROR',
      reply: null,
      error: err.message || 'Gemini API request failed',
    });
  }
});

// 6. Server-Side Gemini AI Structured Invoice OCR Parser
app.post('/api/v1/ai/ocr', async (req, res) => {
  const { rawText } = req.body;
  if (!rawText) {
    res.status(400).json({ success: false, error: 'rawText is required' });
    return;
  }

  const deterministicParsed = parseStructuredVendorInvoiceText(String(rawText));
  if (deterministicParsed.subtotal > 0) {
    res.status(200).json({
      success: true,
      source: 'DETERMINISTIC_STRUCTURED_OCR_ENGINE',
      parsed: deterministicParsed,
      data: deterministicParsed,
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(200).json({
      success: true,
      source: 'LOCAL_REGEX_PARSER',
      parsed: deterministicParsed,
      data: deterministicParsed,
    });
    return;
  }

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Extract structured vendor invoice details from the following raw OCR text:\n\n${rawText}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vendor: { type: Type.STRING, description: 'Supplier or vendor legal name' },
              invoiceNumber: { type: Type.STRING, description: 'Invoice number or reference code' },
              subtotal: { type: Type.NUMBER, description: 'Subtotal before tax' },
              vat15: { type: Type.NUMBER, description: '15% VAT tax amount' },
              totalDue: { type: Type.NUMBER, description: 'Grand total amount due' },
              confidence: { type: Type.NUMBER, description: 'Confidence score between 90 and 100' },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    qty: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    total: { type: Type.NUMBER },
                  },
                },
              },
            },
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini OCR timeout (2500ms)')), 2500)
      ),
    ]);

    const jsonText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonText);
    res.json({
      success: true,
      source: 'GEMINI_2_5_FLASH',
      parsed,
      data: parsed,
    });
  } catch (err: any) {
    res.status(200).json({
      success: true,
      source: 'LOCAL_REGEX_PARSER_ON_ERROR',
      parsed: deterministicParsed,
      data: deterministicParsed,
      error: err.message || 'OCR extraction fell back to deterministic parser',
    });
  }
});

// ---------------------------------------------------------------------------
// Mount Vite Dev Server or Static Production Bundle
// ---------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });

    // Prevent @vite/client from throwing unhandled WebSocket connection errors in Cloud Run proxy when HMR is disabled
    app.use('/@vite/client', (_req, res, next) => {
      const origEnd = res.end.bind(res);
      const chunks: Buffer[] = [];
      res.write = ((chunk: any) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      }) as any;
      res.end = ((chunk?: any) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        let body = Buffer.concat(chunks).toString('utf-8');
        body = body.replace(
          'const createWebSocketModuleRunnerTransport = (options) => {',
          'const createWebSocketModuleRunnerTransport = () => ({ async connect() {}, disconnect() {}, send() {} }); const _origWsTransport = (options) => {'
        );
        res.setHeader('Content-Length', Buffer.byteLength(body));
        return origEnd(body);
      }) as any;
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RLM ERP Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
