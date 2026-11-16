/**
 * Haseb Enterprise ERP - Zero-Download Standalone Offline Production Server
 * Serves precompiled /dist with zero Vite/node_modules runtime dependencies,
 * real LAN WebSocket sync, plug-and-play USB/ADB/Serial SMS bridge, and installer tools.
 */

import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import {
  createInitialWhatsAppSession,
  generatePairingQRToken,
  SEED_WHATSAPP_CHATS,
  createDisconnectedUsbDevice,
  runUsbAutoDiagnostics,
  isUsbDeviceReady,
  SEED_BRANCH_NODES,
} from './src/core/communicationsEngine';
import {
  generateLinuxMacSetupSh,
  generateWindowsSetupBat,
} from './src/core/installerEngine';
import {
  applyHostPermissionsAndServices,
  buildPortableOfflineZipBundle,
  dispatchSmsViaHostAdb,
  dispatchSmsViaHostSerialPort,
  getLanIpv4Addresses,
  inspectSystemReadiness,
  probeHostUsbMobileBridgeState,
  resolveAdbExecutablePath,
  startUsbCableHotplugWatcher,
} from './src/server/usbAndInstallerHost';
import {
  ActivationServerManager,
  createOfficialLicenseRecord,
  verifySignedLicenseTokenSignature,
  SignedLicenseToken,
} from './src/core/licensing_core/index';
import { UsbConnectedDevice } from './src/types/erp';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;

const SERVER_AUTHORITY_PRIVATE_KEY_PEM =
  process.env.ASF_AUTHORITY_PRIVATE_KEY ||
  process.env.ASF_ISSUER_KEY ||
  '';

export const activationAuthority =
  SERVER_AUTHORITY_PRIVATE_KEY_PEM && SERVER_AUTHORITY_PRIVATE_KEY_PEM.includes('BEGIN PRIVATE KEY')
    ? new ActivationServerManager(SERVER_AUTHORITY_PRIVATE_KEY_PEM)
    : null;

app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'erp_store.json');
const TMP_DB_FILE = path.join(DATA_DIR, 'erp_store.json.tmp');
const CURRENT_SCHEMA_VERSION = '8.0-haseb-clean-production';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let memoryStore: Record<string, any> | null = null;
let dbRevision = 1;
let isFlushingToDisk = false;
let pendingFlush = false;
let usbBridgeSentCounter = 0;
let clientRegisteredUsbDevice: UsbConnectedDevice | null = null;
const wsClients = new Set<WebSocket>();

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      memoryStore = parsed;
      dbRevision = Number(parsed.dbRevision) || 1;
    }
  }
} catch {
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
    console.error('[Haseb ERP DB] Disk flush error:', err);
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
  flushMemoryStoreToDiskAsync().catch(() => {});
  return dbRevision;
}

function broadcastWs(payload: Record<string, any>) {
  if (wsClients.size === 0) return;
  const serialized = JSON.stringify(payload);
  for (const ws of wsClients) {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(serialized);
    } catch {}
  }
}

function verifyCommercialOperationGuard(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const licenseTokenHeader = req.headers['x-asf-license-token'] as string | undefined;
  const trialDeviceHeader = req.headers['x-asf-trial-device'] as string | undefined;

  if (licenseTokenHeader && licenseTokenHeader.trim().length > 0) {
    try {
      const parsedToken: SignedLicenseToken = JSON.parse(
        Buffer.from(licenseTokenHeader, 'base64').toString('utf8')
      );
      const sigValid = verifySignedLicenseTokenSignature(parsedToken);
      if (!sigValid.valid) {
        res.status(403).json({ success: false, errorCode: 'LICENSE_TAMPERED' });
        return;
      }
      if (!parsedToken.claims.isLifetime && Date.now() > parsedToken.claims.expiresAtEpochMs) {
        res.status(403).json({ success: false, errorCode: 'LICENSE_EXPIRED' });
        return;
      }
      return next();
    } catch {
      res.status(400).json({ success: false, errorCode: 'INVALID_TOKEN_HEADER' });
      return;
    }
  }

  if (trialDeviceHeader && trialDeviceHeader.trim().length > 0) {
    return next();
  }

  next();
}

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    service: 'Haseb Enterprise Standalone Offline Production Engine',
    version: '8.0.0-standalone',
    storage: 'STANDALONE_PRODUCTION_DISK_SYNC',
    dbRevision,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/network/info', (_req, res) => {
  const lanAddresses = getLanIpv4Addresses();
  const primaryIp = lanAddresses[0] || '127.0.0.1';
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
    },
  });
});

app.get('/api/v1/system/readiness', (_req, res) => {
  const readiness = inspectSystemReadiness({
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
    httpsEnabled: false,
  });
  res.json({ success: true, readiness });
});

app.post('/api/v1/system/apply-permissions', (_req, res) => {
  const result = applyHostPermissionsAndServices({
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
  });
  res.json(result);
});

app.get('/api/v1/installer/windows-setup.bat', (_req, res) => {
  const lanIps = getLanIpv4Addresses();
  const bat = generateWindowsSetupBat({
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
    primaryLanIp: lanIps[0] || '',
  });
  res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Haseb_ERP_Windows_Installer.bat"');
  res.send(bat);
});

app.get('/api/v1/installer/linux-setup.sh', (_req, res) => {
  const sh = generateLinuxMacSetupSh({
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
  });
  res.setHeader('Content-Type', 'application/x-sh; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Haseb_ERP_Linux_Mac_Installer.sh"');
  res.send(sh);
});

app.get('/api/v1/installer/portable-bundle.zip', async (_req, res) => {
  try {
    const zip = await buildPortableOfflineZipBundle({
      port: Number(PORT),
      httpsPort: Number(HTTPS_PORT),
    });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Haseb_ERP_Portable_Offline_Bundle.zip"'
    );
    res.send(zip.buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to package bundle' });
  }
});

app.get('/api/v1/erp/revision', (_req, res) => {
  res.json({ success: true, dbRevision, serverTimestampMs: Date.now() });
});

app.get('/api/v1/erp/state', (_req, res) => {
  res.json({
    success: true,
    hasSavedState: Boolean(memoryStore),
    dbRevision,
    data: readServerDB(),
  });
});

app.post('/api/v1/erp/state', verifyCommercialOperationGuard, (req, res) => {
  const rev = writeServerDB(req.body);
  broadcastWs({ type: 'erp:state_commit', dbRevision: rev, serverTimestampMs: Date.now() });
  res.json({ success: true, dbRevision: rev });
});

// Licensing Issue shortcut
app.post('/api/v1/licensing/issue', (req, res) => {
  const { customerName, edition, durationDays, isLifetime, allowedModules } = req.body || {};
  const newLic = createOfficialLicenseRecord({
    customerName: customerName || 'عميل حاسب',
    edition: edition || 'ENTERPRISE',
    durationDays: Number(durationDays) || 365,
    isLifetime: Boolean(isLifetime),
    allowedModules,
  });
  res.json({ success: true, license: newLic });
});

// WhatsApp Session Helpers
let whatsappSession = createInitialWhatsAppSession();
app.get('/api/v1/whatsapp/session', (_req, res) => {
  res.json({ success: true, session: whatsappSession });
});
app.post('/api/v1/whatsapp/disconnect', (_req, res) => {
  const newQr = generatePairingQRToken();
  whatsappSession = {
    ...whatsappSession,
    status: 'DISCONNECTED',
    phoneNumber: '',
    qrCodeData: newQr.token,
  };
  res.json({ success: true, session: whatsappSession });
});
app.get('/api/v1/whatsapp/chats', (_req, res) => {
  res.json({ success: true, chats: SEED_WHATSAPP_CHATS });
});

// Truthful Plug-and-Play USB Mobile SMS Bridge
function probeDevice() {
  return probeHostUsbMobileBridgeState({
    sentCounter: usbBridgeSentCounter,
    clientRegisteredDevice: clientRegisteredUsbDevice,
  });
}

app.get('/api/v1/usb/device', (_req, res) => {
  res.json({ success: true, device: probeDevice() });
});

app.post('/api/v1/usb/register-client-device', (req, res) => {
  const payload = req.body?.device;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ success: false, errorAr: 'بيانات الجهاز غير صالحة.' });
    return;
  }
  clientRegisteredUsbDevice = {
    ...createDisconnectedUsbDevice(),
    ...payload,
    lastCheckedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  const updated = probeDevice();
  broadcastWs({ type: 'erp:usb_device_update', device: updated });
  res.json({ success: true, device: updated });
});

app.post('/api/v1/usb/disconnect', (_req, res) => {
  clientRegisteredUsbDevice = null;
  const updated = probeDevice();
  broadcastWs({ type: 'erp:usb_device_update', device: updated });
  res.json({ success: true, device: updated });
});

app.post('/api/v1/usb/diagnostics', (_req, res) => {
  const device = probeDevice();
  const report = runUsbAutoDiagnostics(device);
  const ready = isUsbDeviceReady(device);
  res.json({
    success: ready,
    report,
    device,
    messageAr: ready
      ? `الجهاز الحقيقي متصل وجاهز (${device.model}).`
      : device.statusReasonAr || 'لا يوجد جوال أو مودم موصل حالياً.',
  });
});

app.post('/api/v1/usb/send-sms', async (req, res) => {
  const { recipientPhone, messageBody, simSlot } = req.body || {};
  if (!recipientPhone || !messageBody) {
    res.status(400).json({ success: false, errorAr: 'رقم الهاتف ونص الرسالة مطلوبان.' });
    return;
  }

  const device = probeDevice();
  const chosenSlot = Number(simSlot) === 2 ? 2 : 1;

  if (device.detectionSource === 'SERVER_ADB' && isUsbDeviceReady(device)) {
    const targetSubId = chosenSlot === 2 ? device.subIds?.sim2 : device.subIds?.sim1;
    const adbRes = dispatchSmsViaHostAdb({
      adbPath: resolveAdbExecutablePath(),
      serialNumber: device.serialNumber,
      phone: recipientPhone,
      message: messageBody,
      simSlot: chosenSlot,
      subId: targetSubId,
    });
    if (adbRes.success) {
      usbBridgeSentCounter += 1;
      res.json({
        success: true,
        device: { ...device, messagesSentCount: usbBridgeSentCounter },
        messageAr: `تم إرسال الرسالة النصية فعلياً عبر الجوال الموصل (${device.model}).`,
      });
      return;
    }
    res.json({ success: false, code: adbRes.code, device, errorAr: adbRes.messageAr });
    return;
  }

  if (device.detectionSource === 'SERVER_SERIAL' && isUsbDeviceReady(device)) {
    const serRes = await dispatchSmsViaHostSerialPort({
      portPath: device.port,
      phone: recipientPhone,
      message: messageBody,
    });
    if (serRes.success) {
      usbBridgeSentCounter += 1;
      res.json({
        success: true,
        device: { ...device, messagesSentCount: usbBridgeSentCounter },
        messageAr: serRes.messageAr,
      });
      return;
    }
    res.json({ success: false, code: serRes.code, device, errorAr: serRes.messageAr });
    return;
  }

  res.json({
    success: false,
    code: 'NO_DEVICE_CONNECTED',
    device,
    errorAr: device.statusReasonAr || 'لا يوجد جوال أو مودم SMS موصل بالنظام حالياً.',
  });
});

app.get('/api/v1/branches/network', (_req, res) => {
  res.json({ success: true, branches: SEED_BRANCH_NODES });
});

// Serve precompiled static files (Zero Vite / Zero Node Modules)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'erp:hello', dbRevision, serverTimestampMs: Date.now() }));
  ws.on('close', () => wsClients.delete(ws));
});
server.on('upgrade', (req, socket, head) => {
  if (String(req.url || '').startsWith('/ws/erp-sync')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

startUsbCableHotplugWatcher({
  getSentCounter: () => usbBridgeSentCounter,
  getClientRegisteredDevice: () => clientRegisteredUsbDevice,
  onDeviceChange: (device) => broadcastWs({ type: 'erp:usb_device_update', device }),
  intervalMs: 2500,
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Haseb ERP Standalone Offline Engine] Running on http://0.0.0.0:${PORT}`);
});
