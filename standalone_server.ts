/**
 * ASF Enterprise ERP - Production Standalone Offline Server
 * Completely zero-dependency at runtime: serves production build from /dist without Vite dev server.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
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
} from './src/core/licensing_core/index';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const SERVER_AUTHORITY_PRIVATE_KEY_PEM =
  process.env.ASF_AUTHORITY_PRIVATE_KEY ||
  process.env.ASF_ISSUER_KEY ||
  '';

export const activationAuthority =
  SERVER_AUTHORITY_PRIVATE_KEY_PEM && SERVER_AUTHORITY_PRIVATE_KEY_PEM.includes('BEGIN PRIVATE KEY')
    ? new ActivationServerManager(SERVER_AUTHORITY_PRIVATE_KEY_PEM)
    : null;

app.use(express.json({ limit: '10mb' }));

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

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion === CURRENT_SCHEMA_VERSION) {
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
    console.error('[ASF ERP DB] Disk flush error:', err);
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

// Security Guard
function verifyCommercialOperationGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  const licenseTokenHeader = req.headers['x-asf-license-token'] as string | undefined;
  const trialDeviceHeader = req.headers['x-asf-trial-device'] as string | undefined;

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
      if (!parsedToken.claims.isLifetime && Date.now() > parsedToken.claims.expiresAtEpochMs) {
        res.status(403).json({
          success: false,
          errorCode: 'LICENSE_EXPIRED',
          message: 'Backend Security Reject: Subscription has expired. Commercial operations blocked.',
        });
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

  res.status(403).json({
    success: false,
    errorCode: 'LICENSE_REQUIRED',
    message: 'Backend Security Reject: Direct API bypass blocked.',
  });
}

// 1. Health & Telemetry Check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    service: 'ASF Enterprise Standalone Offline Production Engine',
    version: '4.0.0-standalone',
    storage: 'STANDALONE_PRODUCTION_DISK_SYNC',
    dbRevision,
    timestamp: new Date().toISOString(),
  });
});

// Network Info
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

// ERP State Endpoints
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
  res.json({ success: true, dbRevision: rev });
});

// WhatsApp & USB Messaging Endpoints
let whatsappSession = createInitialWhatsAppSession();
let usbDevice = createDefaultUsbConnectedDevice();

app.get('/api/v1/whatsapp/session', (_req, res) => {
  res.json({ success: true, session: whatsappSession });
});

app.post('/api/v1/whatsapp/pair', (_req, res) => {
  whatsappSession = {
    ...whatsappSession,
    status: 'PAIRED_READY',
    phoneConnected: '+967771234567',
    connectedDeviceName: 'Direct In-App WhatsApp Web Active Session',
    lastSyncTimestamp: new Date().toISOString(),
  };
  res.json({ success: true, session: whatsappSession });
});

app.post('/api/v1/whatsapp/disconnect', (_req, res) => {
  whatsappSession = {
    ...whatsappSession,
    status: 'DISCONNECTED',
    phoneConnected: undefined,
    qrToken: generatePairingQRToken(),
  };
  res.json({ success: true, session: whatsappSession });
});

app.get('/api/v1/whatsapp/chats', (_req, res) => {
  res.json({ success: true, chats: SEED_WHATSAPP_CHATS });
});

app.get('/api/v1/usb/device', (_req, res) => {
  res.json({ success: true, device: usbDevice });
});

app.post('/api/v1/usb/diagnostics', (_req, res) => {
  const diag = runUsbAutoDiagnostics(usbDevice);
  usbDevice = { ...usbDevice, status: 'CONNECTED_READY', signalStrength: '92%' };
  res.json({ success: true, diagnostics: diag, device: usbDevice });
});

app.post('/api/v1/usb/send-sms', (req, res) => {
  res.json({
    success: true,
    messageId: `usb-sms-${Date.now()}`,
    status: 'DELIVERED',
    simSlot: 1,
    deliveryReceiptAckToken: `ACK-USB-${Date.now()}`,
    deliveredAt: new Date().toISOString(),
  });
});

app.get('/api/v1/branches/network', (_req, res) => {
  res.json({ success: true, branches: SEED_BRANCH_NODES });
});

// Serve compiled static files
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ASF Enterprise Offline Production Engine] Running on http://0.0.0.0:${PORT}`);
});
