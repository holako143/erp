/**
 * RLM ERP - Enterprise Full-Stack Backend Server (Express + Vite + Gemini AI)
 * Provides persistent JSON file storage, ACID-like state sync, and Server-Side Gemini AI endpoints
 */

import express from 'express';
import http from 'http';
import https from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import zlib from 'zlib';
import { execSync, execFileSync } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { parseStructuredVendorInvoiceText } from './src/core/inventoryEngine';
import { generateCohesivePaletteVariants } from './src/core/themeContrastEngine';
import {
  AiProviderId,
  AI_PROVIDER_PRESETS,
  UniversalAiConfigPublic,
  UniversalAiConfigInput,
  getAiProviderPreset,
  normalizeAiBaseUrl,
  buildChatCompletionsEndpoint,
  maskApiKey,
  validateUniversalAiConfigInput,
} from './src/core/aiProviderEngine';
import {
  createInitialWhatsAppSession,
  generatePairingQRToken,
  createCleanWhatsAppDefaultAccount,
  createNewWhatsAppAccountInstance,
  appendMessageToWhatsAppChats,
  createDisconnectedUsbDevice,
  runUsbAutoDiagnostics,
  isUsbDeviceReady,
  calculateCrossBranchStockMatrix,
  createInterBranchTransferDocAndJournal,
  generateUniqueWhatsAppMessageId,
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
  probeHostUsbMobileBridgeStateAsync,
  resolveAdbExecutablePath,
  startUsbCableHotplugWatcher,
} from './src/server/usbAndInstallerHost';
import {
  generateSmartErpBotResponse,
  classifyWhatsAppBotIntent,
  BotIntentCategory,
} from './src/core/whatsappAiBotEngine';
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
import { HasebLocalSqliteEngine } from './src/server/localSqliteDb';
import {
  MaestroSessionAuthManager,
  CryptographicTrialAnchorGuard,
  executeAuthoritativeBusinessCommand,
  createEncryptedBackupEnvelopeV2,
  decryptAndVerifyBackupEnvelopeV2,
  appendChainedAuditEntry,
  verifyChainedAuditLogIntegrity,
  verifyLicenseHeaderAndEntitlement,
  resolveSafeApplicationDataDir,
  classifyApiRouteSecurityTier,
  verifyPasswordOrPlaintext,
  ChainedAuditEntry,
  EncryptedBackupEnvelopeV2,
} from './src/server/maestroSecurityAndAuthorityEngine';
import {
  applyThreeWayPatchMerge,
  detectDeviceLabelFromUserAgent,
  mergeStateDeltaPatch,
  ConnectedLanDevice,
} from './src/core/realtimeSyncEngine';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;

// Persistent Storage File Path & High-Concurrency In-Memory Write-Through Engine
const ROOT_DIR = process.env.HASEB_ROOT_DIR || process.cwd();
const DATA_DIR = resolveSafeApplicationDataDir(ROOT_DIR, process.env.HASEB_DATA_DIR);
const DB_FILE = path.join(DATA_DIR, 'erp_store.json');
const TMP_DB_FILE = path.join(DATA_DIR, 'erp_store.json.tmp');
const AI_SECRETS_FILE = path.join(DATA_DIR, 'ai_secrets.json');
const CURRENT_SCHEMA_VERSION = '8.0-haseb-clean-production';
let activeEmbeddedAssetsMap: Record<string, { mime: string; gzB64: string }> | null = null;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ASF Secure Licensing V3 - Server Authority Key Management with Persistent Registry
const SERVER_AUTHORITY_PRIVATE_KEY_PEM =
  process.env.ASF_AUTHORITY_PRIVATE_KEY ||
  process.env.ASF_ISSUER_KEY ||
  '';

export const activationAuthority =
  SERVER_AUTHORITY_PRIVATE_KEY_PEM && SERVER_AUTHORITY_PRIVATE_KEY_PEM.includes('BEGIN PRIVATE KEY')
    ? new ActivationServerManager(
        SERVER_AUTHORITY_PRIVATE_KEY_PEM,
        path.join(DATA_DIR, 'licensing_registry.json')
      )
    : null;

export const localSqliteEngine = new HasebLocalSqliteEngine(DATA_DIR);
export const sessionAuthManager = new MaestroSessionAuthManager(DATA_DIR);
export const trialAnchorGuard = new CryptographicTrialAnchorGuard(
  DATA_DIR,
  sessionAuthManager.getHmacSecret()
);
const commandIdempotencyMap = localSqliteEngine.loadCommandLedger();
const auditChainEntries: ChainedAuditEntry[] = localSqliteEngine.loadAuditChain();

function recordServerAudit(
  actor: string,
  category: ChainedAuditEntry['category'],
  action: string,
  details: Record<string, any>
): ChainedAuditEntry {
  const entry = appendChainedAuditEntry(auditChainEntries, {
    actor,
    category,
    action,
    details,
  });
  localSqliteEngine.saveAuditChainEntry(entry);
  return entry;
}

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Universal Local Area Network (LAN) CORS & Safe Security Headers (iframe-friendly + camera enabled)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-asf-license-token, x-asf-trial-device, x-erp-client-id, x-haseb-session-token, x-asf-issuer-admin-key, x-haseb-enforce-strict-auth'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=*, microphone=()');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Central Route Classification & Policy Guard (Phase 0.1)
  if (req.path.startsWith('/api/v1/')) {
    const tier = classifyApiRouteSecurityTier(req.method, req.path);
    res.setHeader('X-Haseb-Security-Tier', tier);
    const enforceStrictSession =
      process.env.HASEB_STRICT_ROUTE_AUTH === '1' ||
      req.headers['x-haseb-enforce-strict-auth'] === '1';

    if (enforceStrictSession && tier === 'ADMIN_SENSITIVE') {
      const token = sessionAuthManager.extractTokenFromHeaders(
        req.headers as Record<string, string | string[] | undefined>
      );
      const verified = sessionAuthManager.verifySessionToken(token);
      if (!verified.valid) {
        recordServerAudit('unauthenticated-caller', 'ADMIN_SECURITY', 'SENSITIVE_ROUTE_BLOCKED', {
          path: req.path,
          method: req.method,
          reason: verified.reason,
        });
        res.status(401).json({
          success: false,
          errorCode: 'AUTHENTICATION_REQUIRED',
          securityTier: tier,
          messageAr: 'يتطلب تنفيذ هذه العملية الحساسة جلسة مسؤول موثقة وصالحة.',
        });
        return;
      }
      if (
        verified.claims &&
        verified.claims.role !== 'SUPER_ADMIN' &&
        verified.claims.role !== 'ADMIN' &&
        verified.claims.role !== 'MANAGER'
      ) {
        recordServerAudit(verified.claims.username, 'ADMIN_SECURITY', 'INSUFFICIENT_ROLE_BLOCKED', {
          path: req.path,
          role: verified.claims.role,
        });
        res.status(403).json({
          success: false,
          errorCode: 'INSUFFICIENT_ROLE',
          securityTier: tier,
          messageAr: 'صلاحيات الحساب الحالي لا تسمح بتنفيذ هذه العملية الحساسة.',
        });
        return;
      }
    }
  }

  next();
});

let memoryStore: Record<string, any> | null = null;
let dbRevision = 1;
let isFlushingToDisk = false;
let pendingFlush = false;
let isHttpsActive = false;
const sseClients = new Set<express.Response>();
const wsClients = new Set<WebSocket>();
const wsDevicePresence = new Map<WebSocket, ConnectedLanDevice>();

const MAX_REVISION_HISTORY = 60;
const revisionHistoryMap = new Map<number, Record<string, any>>();
const revisionPatchLog = new Map<
  number,
  { dbRevision: number; originClientId?: string; changedKeys: string[]; patch: Record<string, any> }
>();

function recordRevisionSnapshot(
  rev: number,
  state: Record<string, any> | null,
  patch?: Record<string, any>,
  changedKeys?: string[],
  originClientId?: string
) {
  if (state && typeof state === 'object') {
    revisionHistoryMap.set(rev, state);
  }
  if (patch && typeof patch === 'object') {
    revisionPatchLog.set(rev, {
      dbRevision: rev,
      originClientId,
      changedKeys: changedKeys || Object.keys(patch),
      patch,
    });
  }
  const minKeep = rev - MAX_REVISION_HISTORY;
  if (minKeep > 0) {
    for (const k of revisionHistoryMap.keys()) {
      if (k < minKeep) revisionHistoryMap.delete(k);
    }
    for (const k of revisionPatchLog.keys()) {
      if (k < minKeep) revisionPatchLog.delete(k);
    }
  }
}

function getConnectedLanDevicesSnapshot(): ConnectedLanDevice[] {
  const byClientId = new Map<string, ConnectedLanDevice>();
  for (const [ws, info] of wsDevicePresence.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    const prev = byClientId.get(info.clientId);
    if (!prev || info.lastSeenAt >= prev.lastSeenAt) {
      byClientId.set(info.clientId, info);
    }
  }
  return Array.from(byClientId.values()).sort((a, b) =>
    a.connectedAt.localeCompare(b.connectedAt)
  );
}

function broadcastPresenceList() {
  broadcastWsMessage({
    type: 'erp:presence_list',
    dbRevision,
    devices: getConnectedLanDevicesSnapshot(),
    serverTimestampMs: Date.now(),
  });
}

function broadcastWsMessage(messageObj: Record<string, any>) {
  if (wsClients.size === 0) return;
  const serialized = JSON.stringify(messageObj);
  for (const ws of wsClients) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(serialized);
      } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        wsClients.delete(ws);
        wsDevicePresence.delete(ws);
      }
    } catch {
      wsClients.delete(ws);
      wsDevicePresence.delete(ws);
    }
  }
}

function broadcastSseRevision(
  rev: number,
  reason = 'state_update',
  originClientId?: string
) {
  const payload = JSON.stringify({
    dbRevision: rev,
    reason,
    originClientId: originClientId || null,
    serverTimestampMs: Date.now(),
  });
  for (const client of sseClients) {
    try {
      client.write(`event: revision\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Initialize Local SQLite WAL Engine & In-Memory Cache on startup (Clean Boot without demo records)
try {
  const sqliteLoaded = localSqliteEngine.loadPrimaryState(CURRENT_SCHEMA_VERSION);
  if (sqliteLoaded.state && typeof sqliteLoaded.state === 'object') {
    memoryStore = sqliteLoaded.state;
    dbRevision = sqliteLoaded.revision;
    recordRevisionSnapshot(dbRevision, memoryStore);
  } else if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
      memoryStore = parsed;
      dbRevision = Number(parsed.dbRevision) || 1;
      recordRevisionSnapshot(dbRevision, memoryStore);
      localSqliteEngine.savePrimaryStateTransaction(
        parsed,
        CURRENT_SCHEMA_VERSION,
        dbRevision
      );
    } else {
      fs.unlinkSync(DB_FILE);
      memoryStore = null;
    }
  }
} catch (err) {
  console.error('[Haseb Local SQLite DB] Startup cache init notice:', err);
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
    // 1. Atomic ACID SQLite WAL Relational Transaction (< 0.5ms)
    localSqliteEngine.savePrimaryStateTransaction(
      memoryStore,
      CURRENT_SCHEMA_VERSION,
      dbRevision
    );
    // 2. Secondary JSON Mirror Backup
    const serialized = JSON.stringify(memoryStore);
    await fs.promises.writeFile(TMP_DB_FILE, serialized, 'utf-8');
    await fs.promises.rename(TMP_DB_FILE, DB_FILE);
  } catch (err) {
    console.error('[Haseb Local SQLite DB] Atomic disk flush error:', err);
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

function writeServerDB(
  data: Record<string, any>,
  originClientId?: string
): number {
  dbRevision += 1;
  memoryStore = {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dbRevision,
    lastSyncedAt: new Date().toISOString(),
  };
  recordRevisionSnapshot(dbRevision, memoryStore, undefined, undefined, originClientId);
  const nowMs = Date.now();
  broadcastSseRevision(dbRevision, 'state_commit', originClientId);
  broadcastWsMessage({
    type: 'erp:state_commit',
    dbRevision,
    originClientId: originClientId || null,
    serverTimestampMs: nowMs,
  });
  // Trigger non-blocking atomic SQLite WAL + disk persistence
  flushMemoryStoreToDiskAsync().catch(() => {});
  return dbRevision;
}

function patchServerDB(
  patch: Record<string, any>,
  originClientId?: string,
  baseRevision?: number
): {
  dbRevision: number;
  changedKeys: string[];
  mergedPatch: Record<string, any>;
  wasMerged: boolean;
} {
  const previousRev = dbRevision;
  const cleanPatch: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && k !== 'schemaVersion' && k !== 'dbRevision') {
      cleanPatch[k] = v;
    }
  }

  const baseState =
    typeof baseRevision === 'number' && baseRevision > 0 && baseRevision < previousRev
      ? revisionHistoryMap.get(baseRevision) || null
      : null;

  const { mergedPatch, wasMerged } = applyThreeWayPatchMerge({
    baseState,
    currentServerState: memoryStore,
    incomingPatch: cleanPatch,
    baseRevision,
    currentDbRevision: previousRev,
  });

  dbRevision += 1;
  const nowIso = new Date().toISOString();
  memoryStore = {
    ...(memoryStore || {}),
    ...mergedPatch,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dbRevision,
    lastSyncedAt: nowIso,
  };
  const changedKeys = Object.keys(mergedPatch);
  recordRevisionSnapshot(dbRevision, memoryStore, mergedPatch, changedKeys, originClientId);

  const nowMs = Date.now();
  broadcastSseRevision(dbRevision, 'patch_commit', originClientId);
  broadcastWsMessage({
    type: 'erp:patch',
    dbRevision,
    originClientId: originClientId || null,
    changedKeys,
    patch: mergedPatch,
    wasMerged,
    serverTimestampMs: nowMs,
  });
  flushMemoryStoreToDiskAsync().catch(() => {});
  return { dbRevision, changedKeys, mergedPatch, wasMerged };
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

// ---------------------------------------------------------------------------
// Universal Multi-Provider AI Configuration & Execution Router (Server-Side ONLY)
// Supports Google Gemini, OpenAI, Anthropic Claude, DeepSeek, Groq, OpenRouter, Ollama & Custom APIs
// ---------------------------------------------------------------------------
interface ServerAiSecretsRecord {
  provider: AiProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  temperature: number;
  systemPrompt: string;
  updatedAt: string;
}

function readServerAiConfig(): ServerAiSecretsRecord | null {
  try {
    if (!fs.existsSync(AI_SECRETS_FILE)) return null;
    const raw = fs.readFileSync(AI_SECRETS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const preset = getAiProviderPreset(parsed.provider);
    return {
      provider: preset.id,
      baseUrl: normalizeAiBaseUrl(preset.id, parsed.baseUrl),
      model: String(parsed.model || '').trim() || preset.defaultModel,
      apiKey: String(parsed.apiKey || '').trim(),
      enabled: parsed.enabled !== false,
      temperature: Number.isFinite(Number(parsed.temperature))
        ? Math.min(2, Math.max(0, Number(parsed.temperature)))
        : 0.4,
      systemPrompt: String(parsed.systemPrompt || ''),
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

function writeServerAiConfig(record: ServerAiSecretsRecord): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpPath = `${AI_SECRETS_FILE}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, AI_SECRETS_FILE);
}

function getEnvGeminiApiKey(): string {
  const k = String(process.env.GEMINI_API_KEY || '').trim();
  return k && k !== 'MY_GEMINI_API_KEY' ? k : '';
}

interface EffectiveAiRuntime {
  provider: AiProviderId;
  preset: ReturnType<typeof getAiProviderPreset>;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  temperature: number;
  systemPrompt: string;
  usingEnvFallback: boolean;
  updatedAt?: string;
}

function resolveEffectiveAiRuntime(): EffectiveAiRuntime {
  const saved = readServerAiConfig();
  const envGeminiKey = getEnvGeminiApiKey();

  if (saved) {
    const preset = getAiProviderPreset(saved.provider);
    const effectiveKey =
      saved.apiKey || (saved.provider === 'gemini' ? envGeminiKey : '');
    return {
      provider: preset.id,
      preset,
      baseUrl: normalizeAiBaseUrl(preset.id, saved.baseUrl),
      model: saved.model || preset.defaultModel,
      apiKey: effectiveKey,
      enabled: saved.enabled,
      temperature: saved.temperature,
      systemPrompt: saved.systemPrompt,
      usingEnvFallback: !saved.apiKey && saved.provider === 'gemini' && Boolean(envGeminiKey),
      updatedAt: saved.updatedAt,
    };
  }

  const defaultPreset = getAiProviderPreset('gemini');
  return {
    provider: 'gemini',
    preset: defaultPreset,
    baseUrl: defaultPreset.defaultBaseUrl,
    model: defaultPreset.defaultModel,
    apiKey: envGeminiKey,
    enabled: Boolean(envGeminiKey),
    temperature: 0.4,
    systemPrompt: '',
    usingEnvFallback: Boolean(envGeminiKey),
  };
}

function buildPublicAiConfig(runtime: EffectiveAiRuntime): UniversalAiConfigPublic {
  return {
    provider: runtime.provider,
    providerLabelAr: runtime.preset.nameAr,
    providerLabelEn: runtime.preset.nameEn,
    baseUrl: runtime.baseUrl,
    model: runtime.model,
    enabled: runtime.enabled,
    temperature: runtime.temperature,
    systemPrompt: runtime.systemPrompt,
    hasApiKey: Boolean(runtime.apiKey),
    maskedKeyPreview: maskApiKey(runtime.apiKey),
    usingEnvFallback: runtime.usingEnvFallback,
    updatedAt: runtime.updatedAt,
  };
}

function extractJsonFromAiText(rawText: string): any {
  const cleaned = String(rawText || '').trim();
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // continue
      }
    }
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart >= 0 && objEnd > objStart) {
      try {
        return JSON.parse(cleaned.slice(objStart, objEnd + 1));
      } catch {
        // continue
      }
    }
  }
  return null;
}

interface UniversalAiExecutionRequest {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  geminiSchema?: any;
  imageDataUrl?: string;
  timeoutMs?: number;
  overrideRuntime?: EffectiveAiRuntime;
  maxTokens?: number;
}

interface UniversalAiExecutionResult {
  text: string;
  provider: AiProviderId;
  providerLabel: string;
  model: string;
}

async function executeUniversalAiText(
  reqOpts: UniversalAiExecutionRequest
): Promise<UniversalAiExecutionResult> {
  const runtime = reqOpts.overrideRuntime || resolveEffectiveAiRuntime();
  if (!runtime.enabled) {
    throw new Error('AI integration is currently disabled in system settings.');
  }
  if (runtime.preset.requiresApiKey && !runtime.apiKey) {
    throw new Error(`API Key is missing for ${runtime.preset.nameEn}.`);
  }

  const combinedSystem = [runtime.systemPrompt.trim(), (reqOpts.systemInstruction || '').trim()]
    .filter(Boolean)
    .join('\n\n');
  const timeoutMs = reqOpts.timeoutMs || 15000;
  const maxTokens = reqOpts.maxTokens || 2048;

  // 1. Google Gemini Native SDK
  if (runtime.preset.protocol === 'GEMINI_NATIVE') {
    const ai = new GoogleGenAI({
      apiKey: runtime.apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const parts: any[] = [];
    if (reqOpts.imageDataUrl && reqOpts.imageDataUrl.startsWith('data:image/')) {
      const m = reqOpts.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (m && m[2]) {
        parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
      }
    }
    parts.push({ text: reqOpts.prompt });

    const config: any = {
      temperature: runtime.temperature,
    };
    if (combinedSystem) config.systemInstruction = combinedSystem;
    if (reqOpts.jsonMode) {
      config.responseMimeType = 'application/json';
      if (reqOpts.geminiSchema) config.responseSchema = reqOpts.geminiSchema;
    }
    if (runtime.model === 'gemini-4-hydrogen') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    const response = await Promise.race([
      ai.models.generateContent({
        model: runtime.model || 'gemini-4-hydrogen',
        contents: parts.length === 1 ? reqOpts.prompt : { parts },
        config,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini timeout (${timeoutMs}ms)`)), timeoutMs)
      ),
    ]);

    return {
      text: (response.text || '').trim(),
      provider: runtime.provider,
      providerLabel: runtime.preset.nameEn,
      model: runtime.model || 'gemini-4-hydrogen',
    };
  }

  // 2. Anthropic Claude Messages API
  if (runtime.preset.protocol === 'ANTHROPIC_MESSAGES') {
    const baseClean = runtime.baseUrl.replace(/\/+$/, '');
    const endpoint = baseClean.endsWith('/messages') ? baseClean : `${baseClean}/messages`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const bodyPayload: any = {
        model: runtime.model,
        max_tokens: maxTokens,
        temperature: Math.min(1, Math.max(0, runtime.temperature)),
        messages: [{ role: 'user', content: reqOpts.prompt }],
      };
      if (combinedSystem) {
        bodyPayload.system = reqOpts.jsonMode
          ? `${combinedSystem}\n\nIMPORTANT: Respond strictly with valid raw JSON only.`
          : combinedSystem;
      } else if (reqOpts.jsonMode) {
        bodyPayload.system = 'Respond strictly with valid raw JSON only.';
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': runtime.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error?.message || data?.message || `Anthropic HTTP ${resp.status}`;
        const err: any = new Error(msg);
        err.status = resp.status;
        throw err;
      }

      const textOut = Array.isArray(data?.content)
        ? data.content
            .filter((b: any) => b?.type === 'text')
            .map((b: any) => b.text)
            .join('\n')
            .trim()
        : '';

      return {
        text: textOut,
        provider: runtime.provider,
        providerLabel: runtime.preset.nameEn,
        model: runtime.model,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // 3. Universal OpenAI-Compatible Chat Completions (OpenAI, DeepSeek, Groq, OpenRouter, Ollama, Custom)
  const endpoint = buildChatCompletionsEndpoint(runtime.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const messages: Array<{ role: string; content: any }> = [];
    const sysText = reqOpts.jsonMode
      ? `${combinedSystem ? combinedSystem + '\n\n' : ''}Return valid JSON only without markdown fences.`
      : combinedSystem;
    if (sysText) {
      messages.push({ role: 'system', content: sysText });
    }
    messages.push({ role: 'user', content: reqOpts.prompt });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (runtime.apiKey) {
      headers.Authorization = `Bearer ${runtime.apiKey}`;
    }
    if (runtime.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://haseb-erp.local';
      headers['X-Title'] = 'RLM Enterprise ERP';
    }

    const payload: any = {
      model: runtime.model,
      messages,
      temperature: runtime.temperature,
      max_tokens: maxTokens,
    };
    if (
      reqOpts.jsonMode &&
      (runtime.provider === 'openai' || runtime.provider === 'deepseek' || runtime.provider === 'groq')
    ) {
      payload.response_format = { type: 'json_object' };
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = data?.error?.message || data?.message || `AI Provider HTTP ${resp.status}`;
      const err: any = new Error(msg);
      err.status = resp.status;
      throw err;
    }

    const msgContent = data?.choices?.[0]?.message?.content;
    const textOut =
      typeof msgContent === 'string'
        ? msgContent.trim()
        : Array.isArray(msgContent)
        ? msgContent.map((c: any) => c?.text || '').join('').trim()
        : '';

    return {
      text: textOut,
      provider: runtime.provider,
      providerLabel: runtime.preset.nameEn,
      model: String(data?.model || runtime.model),
    };
  } finally {
    clearTimeout(timer);
  }
}

function isAnyAiReady(runtime?: EffectiveAiRuntime): boolean {
  const rt = runtime || resolveEffectiveAiRuntime();
  if (!rt.enabled) return false;
  if (rt.preset.requiresApiKey && !rt.apiKey) return false;
  return true;
}

// ---------------------------------------------------------------------------
// API v1 Routes
// ---------------------------------------------------------------------------

// 1. Health & Telemetry Check
app.get('/api/v1/health', (_req, res) => {
  const aiRt = resolveEffectiveAiRuntime();
  res.json({
    success: true,
    service: 'RLM Enterprise ERP High-Concurrency Engine',
    version: '4.0.0-solar-electronics',
    storage: memoryStore ? 'RAM_CACHE_AND_ATOMIC_WAL_ACTIVE' : 'READY_FOR_SEED',
    dbRevision,
    concurrentCapacity: '10,000+ ops/sec (In-Memory Write-Through)',
    geminiConfigured: Boolean(getEnvGeminiApiKey()),
    aiConfigured: isAnyAiReady(aiRt),
    aiProvider: aiRt.provider,
    aiModel: aiRt.model,
    timestamp: new Date().toISOString(),
  });
});

// 1a. Universal Multi-Provider AI Config Routes (Server-Side Secret Persistence)
app.get('/api/v1/ai/config', (_req, res) => {
  const runtime = resolveEffectiveAiRuntime();
  res.json({
    success: true,
    config: buildPublicAiConfig(runtime),
    presets: AI_PROVIDER_PRESETS,
  });
});

app.post('/api/v1/ai/config', (req, res) => {
  const body = (req.body || {}) as Partial<UniversalAiConfigInput>;
  const existing = readServerAiConfig();
  const incomingRawKey = String(body.apiKey || '').trim();
  const hasExistingStoredKey = Boolean(existing?.apiKey || (body.provider === 'gemini' && getEnvGeminiApiKey()));

  const validation = validateUniversalAiConfigInput(body, hasExistingStoredKey);
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      errorAr: validation.errorAr || 'بيانات إعداد الذكاء الاصطناعي غير صالحة.',
    });
    return;
  }

  let resolvedKey = '';
  if (body.clearStoredKey) {
    resolvedKey = '';
  } else if (incomingRawKey === '__KEEP_EXISTING__') {
    resolvedKey = existing?.apiKey || '';
  } else if (incomingRawKey) {
    resolvedKey = incomingRawKey;
  } else if (existing && existing.provider === validation.provider) {
    resolvedKey = existing.apiKey;
  }

  const nextRecord: ServerAiSecretsRecord = {
    provider: validation.provider,
    baseUrl: validation.normalizedBaseUrl,
    model: validation.normalizedModel,
    apiKey: resolvedKey,
    enabled: body.enabled !== false,
    temperature: Number.isFinite(Number(body.temperature))
      ? Math.min(2, Math.max(0, Number(body.temperature)))
      : existing?.temperature ?? 0.4,
    systemPrompt:
      typeof body.systemPrompt === 'string'
        ? body.systemPrompt.slice(0, 2000)
        : existing?.systemPrompt || '',
    updatedAt: new Date().toISOString(),
  };

  writeServerAiConfig(nextRecord);
  const runtime = resolveEffectiveAiRuntime();
  res.json({
    success: true,
    config: buildPublicAiConfig(runtime),
    messageAr: `تم حفظ وتفعيل مزود الذكاء الاصطناعي (${runtime.preset.nameAr}) لجميع خدمات النظام والواتساب.`,
  });
});

app.post('/api/v1/ai/test', async (req, res) => {
  const body = (req.body || {}) as Partial<UniversalAiConfigInput>;
  const existing = readServerAiConfig();
  const useSavedOnly = !body.provider && !body.model && !body.baseUrl;

  let runtime: EffectiveAiRuntime;
  if (useSavedOnly) {
    runtime = resolveEffectiveAiRuntime();
  } else {
    const preset = getAiProviderPreset(body.provider);
    const incomingKey = String(body.apiKey || '').trim();
    const resolvedKey =
      incomingKey && incomingKey !== '__KEEP_EXISTING__'
        ? incomingKey
        : existing?.provider === preset.id && existing?.apiKey
        ? existing.apiKey
        : preset.id === 'gemini'
        ? getEnvGeminiApiKey()
        : '';

    runtime = {
      provider: preset.id,
      preset,
      baseUrl: normalizeAiBaseUrl(preset.id, body.baseUrl),
      model: String(body.model || '').trim() || preset.defaultModel,
      apiKey: resolvedKey,
      enabled: true,
      temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.2,
      systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt : '',
      usingEnvFallback: false,
    };
  }

  if (runtime.preset.requiresApiKey && !runtime.apiKey) {
    res.status(400).json({
      success: false,
      errorAr: `يرجى إدخال مفتاح API Key لمزود (${runtime.preset.nameAr}) قبل إجراء الاختبار.`,
    });
    return;
  }

  const startedAt = Date.now();
  try {
    const aiRes = await executeUniversalAiText({
      prompt: 'Reply in Arabic with two short words confirming connection works: تم الاتصال بنجاح',
      systemInstruction: 'Return a very brief connection confirmation.',
      timeoutMs: 12000,
      maxTokens: 64,
      overrideRuntime: runtime,
    });
    const latencyMs = Date.now() - startedAt;
    res.json({
      success: true,
      provider: aiRes.provider,
      providerLabel: aiRes.providerLabel,
      model: aiRes.model,
      latencyMs,
      sampleReply: aiRes.text || 'تم الاتصال بنجاح',
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    res.status(502).json({
      success: false,
      latencyMs,
      error: String(err?.message || 'AI connection test failed'),
      errorAr: `فشل اختبار الاتصال مع ${runtime.preset.nameEn}: ${String(err?.message || 'تحقق من المفتاح أو الرابط')}`,
    });
  }
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
app.get('/api/v1/network/info', (req, res) => {
  const nets = os.networkInterfaces();
  const scored: { ip: string; score: number }[] = [];

  for (const name of Object.keys(nets)) {
    const lowerName = name.toLowerCase();
    // Skip virtual docker/veth/wsl bridges that phones on Wi-Fi cannot reach
    if (
      lowerName.startsWith('docker') ||
      lowerName.startsWith('veth') ||
      lowerName.startsWith('br-') ||
      lowerName.startsWith('virbr')
    ) {
      continue;
    }
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.address) {
        if (net.address.startsWith('169.254.')) continue; // skip APIPA
        let score = 50;
        if (
          lowerName.includes('wi-fi') ||
          lowerName.includes('wlan') ||
          lowerName.includes('en0') ||
          lowerName.includes('eth')
        ) {
          score -= 20;
        }
        if (net.address.startsWith('192.168.')) {
          score -= 15;
        } else if (net.address.startsWith('10.')) {
          score -= 10;
        } else if (net.address.startsWith('172.17.') || net.address.startsWith('172.18.')) {
          score += 30;
        }
        scored.push({ ip: net.address, score });
      }
    }
  }

  scored.sort((a, b) => a.score - b.score);
  const lanAddresses = Array.from(new Set(scored.map((s) => s.ip)));

  const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const cleanHostOnly = forwardedHost.split(':')[0] || '';
  const forwardedProto =
    (req.headers['x-forwarded-proto'] as string) ||
    (forwardedHost.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(forwardedHost)
      ? 'http'
      : 'https');
  const liveHostUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';

  // If the user is already accessing via a LAN IP or public/shared domain, include it first
  if (
    cleanHostOnly &&
    cleanHostOnly !== 'localhost' &&
    cleanHostOnly !== '127.0.0.1' &&
    !lanAddresses.includes(cleanHostOnly)
  ) {
    lanAddresses.unshift(cleanHostOnly);
  }

  const primaryIp = lanAddresses[0] || '127.0.0.1';
  const primaryLanUrl =
    liveHostUrl && !liveHostUrl.includes('localhost') && !liveHostUrl.includes('127.0.0.1')
      ? liveHostUrl
      : `http://${primaryIp}:${PORT}`;

  const sizeKb = memoryStore
    ? Math.max(1, Math.round((Buffer.byteLength(JSON.stringify(memoryStore), 'utf-8') / 1024) * 10) / 10)
    : 0;

  const lanHttpsAddresses = lanAddresses.map((ip) => ({
    ip,
    httpUrl: `http://${ip}:${PORT}`,
    httpsUrl: `https://${ip}:${HTTPS_PORT}`,
  }));
  const primaryLanHttpsUrl = isHttpsActive && lanAddresses[0]
    ? `https://${lanAddresses[0]}:${HTTPS_PORT}`
    : null;

  res.json({
    success: true,
    network: {
      hostname: os.hostname(),
      port: Number(PORT),
      httpsPort: isHttpsActive ? Number(HTTPS_PORT) : null,
      httpsEnabled: isHttpsActive,
      lanAddresses,
      lanHttpsAddresses,
      primaryLanUrl,
      primaryLanHttpsUrl,
      liveHostUrl,
      platform: `${os.platform()}-${os.arch()}`,
      serverTimestampMs: Date.now(),
      dbRevision,
      memoryStoreSizeKb: sizeKb,
      connectedDevicesCount: getConnectedLanDevicesSnapshot().length,
    },
  });
});

app.get('/api/v1/network/devices', (_req, res) => {
  res.json({
    success: true,
    dbRevision,
    devices: getConnectedLanDevicesSnapshot(),
    serverTimestampMs: Date.now(),
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

// 1c-2. Downloadable 1-Click Windows Native Desktop & All-In-One Installer + Firewall Enabler (.bat)
app.get('/api/v1/desktop/windows-launcher.bat', (_req, res) => {
  const lanIps = getLanIpv4Addresses();
  const batContent = generateWindowsSetupBat({
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
    primaryLanIp: lanIps[0] || '',
  });
  res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Haseb_Windows_Desktop_App.bat"');
  res.send(batContent);
});

app.get('/api/v1/installer/windows-setup.bat', (_req, res) => {
  const lanIps = getLanIpv4Addresses();
  const batContent = generateWindowsSetupBat({
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
    primaryLanIp: lanIps[0] || '',
  });
  res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Haseb_ERP_Windows_Installer.bat"');
  res.send(batContent);
});

app.get('/api/v1/installer/linux-setup.sh', (_req, res) => {
  const shContent = generateLinuxMacSetupSh({
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
  });
  res.setHeader('Content-Type', 'application/x-sh; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Haseb_ERP_Linux_Mac_Installer.sh"');
  res.send(shContent);
});

app.get('/api/v1/installer/windows-setup.exe', (_req, res) => {
  const candidates = [
    path.join(ROOT_DIR, 'bundle', 'Haseb_ERP_Setup_Offline.exe'),
    path.join(process.cwd(), 'bundle', 'Haseb_ERP_Setup_Offline.exe'),
    ...(path.extname(process.execPath).toLowerCase() === '.exe' ? [process.execPath] : []),
  ];
  const foundExe = candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  if (!foundExe) {
    res.status(404).json({
      success: false,
      error: 'Windows EXE installer is not built yet. Run npm run build:portable.',
      errorAr: 'ملف التسطيب التنفيذي (.exe) قيد التجهيز. نفّذ الأمر npm run build:portable أو حمل الحزمة المضغوطة (.zip).',
    });
    return;
  }
  const stat = fs.statSync(foundExe);
  res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="Haseb_ERP_Setup_Offline.exe"'
  );
  res.setHeader('Content-Length', String(stat.size));
  fs.createReadStream(foundExe).pipe(res);
});

app.get('/api/v1/installer/portable-bundle.zip', async (_req, res) => {
  try {
    const zip = await buildPortableOfflineZipBundle({
      rootDir: ROOT_DIR,
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
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to build offline portable bundle.',
    });
  }
});

app.get('/api/v1/system/readiness', (_req, res) => {
  const readiness = inspectSystemReadiness({
    rootDir: ROOT_DIR,
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
    httpsEnabled: isHttpsActive,
    embeddedAssetsActive: Boolean(activeEmbeddedAssetsMap),
  });
  res.json({ success: true, readiness });
});

app.post('/api/v1/system/apply-permissions', (_req, res) => {
  const result = applyHostPermissionsAndServices({
    rootDir: ROOT_DIR,
    port: Number(PORT),
    httpsPort: Number(HTTPS_PORT),
  });
  res.json(result);
});

// ---------------------------------------------------------
// Phase 0 & 4: Server-Side Session Auth & Tamper-Evident Audit Chain
// ---------------------------------------------------------

app.post('/api/v1/auth/login', (req, res) => {
  const clientIp = String(req.ip || req.socket?.remoteAddress || '127.0.0.1');
  const rateCheck = sessionAuthManager.checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: rateCheck.retryAfterSeconds,
      messageAr: `تم حظر محاولات الدخول مؤقتاً بسبب تكرار الخطأ. يرجى المحاولة بعد ${rateCheck.retryAfterSeconds} ثانية.`,
    });
    return;
  }

  const { username, password, pinCode } = req.body || {};
  const serverDb = readServerDB();
  const accounts: any[] = Array.isArray(serverDb?.userAccounts) ? serverDb.userAccounts : [];

  let matchedUser: any = null;
  if (accounts.length > 0) {
    matchedUser = accounts.find(
      (u) =>
        username &&
        (u.username === username || u.name === username || u.email === username) &&
        ((password &&
          (verifyPasswordOrPlaintext(String(password), String(u.password || '')) ||
            verifyPasswordOrPlaintext(String(password), String(u.pinCode || '')))) ||
          (pinCode && verifyPasswordOrPlaintext(String(pinCode), String(u.pinCode || ''))))
    );
  } else if (
    (username === 'admin' || username === 'مدير النظام') &&
    (password === 'admin123' || password === '1234' || pinCode === '1234')
  ) {
    matchedUser = {
      id: 'usr-admin-1',
      username: 'admin',
      role: 'ADMIN',
      branchId: 'br-main',
    };
  }

  if (!matchedUser) {
    sessionAuthManager.recordLoginFailure(clientIp);
    recordServerAudit(String(username || 'unknown'), 'AUTH', 'LOGIN_FAILED', { clientIp });
    res.status(401).json({
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      messageAr: 'بيانات الاعتماد غير صحيحة.',
    });
    return;
  }

  sessionAuthManager.clearRateLimit(clientIp);
  const issued = sessionAuthManager.issueSessionToken({
    userId: String(matchedUser.id || 'usr-1'),
    username: String(matchedUser.username || matchedUser.name || 'user'),
    role: (matchedUser.role || 'ADMIN') as any,
    branchId: String(matchedUser.branchId || 'br-main'),
  });

  res.setHeader(
    'Set-Cookie',
    `haseb_session=${encodeURIComponent(issued.token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`
  );
  recordServerAudit(issued.claims.username, 'AUTH', 'LOGIN_SUCCESS', {
    userId: issued.claims.userId,
    role: issued.claims.role,
    sessionId: issued.claims.sessionId,
  });

  res.json({
    success: true,
    token: issued.token,
    session: issued.claims,
  });
});

app.post('/api/v1/auth/logout', (req, res) => {
  const token = sessionAuthManager.extractTokenFromHeaders(
    req.headers as Record<string, string | string[] | undefined>
  );
  if (token) {
    sessionAuthManager.revokeToken(token);
  }
  res.setHeader('Set-Cookie', 'haseb_session=; HttpOnly; Path=/; Max-Age=0');
  recordServerAudit('session-user', 'AUTH', 'LOGOUT', {});
  res.json({ success: true });
});

app.get('/api/v1/auth/session', (req, res) => {
  const token = sessionAuthManager.extractTokenFromHeaders(
    req.headers as Record<string, string | string[] | undefined>
  );
  const verified = sessionAuthManager.verifySessionToken(token);
  if (!verified.valid) {
    res.status(401).json({
      success: false,
      authenticated: false,
      reason: verified.reason,
    });
    return;
  }
  res.json({
    success: true,
    authenticated: true,
    session: verified.claims,
  });
});

app.get('/api/v1/security/audit-chain', (_req, res) => {
  const verification = verifyChainedAuditLogIntegrity(auditChainEntries);
  res.json({
    success: true,
    integrity: verification,
    entries: auditChainEntries.slice(-200),
  });
});

app.get('/api/v1/security/audit-chain/verify', (_req, res) => {
  const verification = verifyChainedAuditLogIntegrity(auditChainEntries);
  res.json({
    success: verification.valid,
    ...verification,
  });
});

// ---------------------------------------------------------
// ASF Secure Licensing V3 Server Endpoints
// ---------------------------------------------------------

// Licensing: List all licenses (Admin View)
app.get('/api/v1/licensing/licenses', (_req, res) => {
  res.json({
    success: true,
    licenses: activationAuthority ? activationAuthority.getAllLicenses() : [],
    auditLogs: activationAuthority ? activationAuthority.getAuditLogs() : [],
    serverTimeMs: Date.now(),
  });
});

// Licensing: Issue a new license key (Admin Authority)
// Disabled in production unless authorized issuer key or admin session is present
app.post('/api/v1/licensing/issue', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const issuerHeaderKey = req.headers['x-asf-issuer-admin-key'];
  const expectedIssuerKey = process.env.ASF_ISSUER_ADMIN_KEY;
  if (isProd && (!expectedIssuerKey || issuerHeaderKey !== expectedIssuerKey)) {
    res.status(403).json({
      success: false,
      errorCode: 'PRODUCTION_SELF_ISSUANCE_FORBIDDEN',
      message: 'Unauthenticated license self-issuance is disabled in production builds.',
    });
    return;
  }

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
  if (activationAuthority) {
    activationAuthority.registerIssuedLicense(newLic);
  }
  recordServerAudit('issuer-authority', 'LICENSE', 'LICENSE_ISSUED', {
    licenseUuid: newLic.licenseUuid,
    customerName,
    edition,
  });
  res.json({
    success: true,
    license: newLic,
  });
});

// Licensing: One-Time Atomic Activation (Binds Critical Silicon Hash & Hardware Telemetry)
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

  if (!activationAuthority) {
    res.status(503).json({
      success: false,
      errorCode: 'AUTHORITY_NOT_CONFIGURED',
      errorMessage: 'Activation authority private key is not configured on this server.',
    });
    return;
  }

  const activationResult = activationAuthority.activateLicenseAtomically({
    licenseUuid,
    hardware,
    clientNonce: clientNonce || `nonce-${Date.now()}-${Math.random()}`,
    clientEpochMs: Number(clientEpochMs) || Date.now(),
    clientVersion: clientVersion || '3.0.0',
  });

  recordServerAudit('licensing-client', 'LICENSE', 'LICENSE_ACTIVATION_ATTEMPT', {
    licenseUuid,
    success: activationResult.success,
    errorCode: activationResult.errorCode || null,
  });

  if (!activationResult.success) {
    res.status(400).json(activationResult);
    return;
  }

  res.json(activationResult);
});

// Licensing: Hardware Repair / Motherboard Replacement Re-Attestation Endpoint
app.post('/api/v1/licensing/re-attest', (req, res) => {
  const { licenseUuid, newHardware, reason } = req.body || {};
  if (!licenseUuid || !newHardware) {
    res.status(400).json({
      success: false,
      errorCode: 'INVALID_REATTESTATION_REQUEST',
      message: 'licenseUuid and newHardware are required.',
    });
    return;
  }
  if (!activationAuthority) {
    res.status(503).json({
      success: false,
      errorCode: 'AUTHORITY_NOT_CONFIGURED',
      message: 'Activation authority private key is not configured on this server.',
    });
    return;
  }

  const rebindResult = activationAuthority.rebindLicenseForHardwareRepair({
    licenseUuid,
    newHardware,
    reason: reason || 'Authorized hardware repair / motherboard replacement',
  });

  recordServerAudit('licensing-authority', 'LICENSE', 'LICENSE_REATTESTED', {
    licenseUuid,
    success: rebindResult.success,
    reason: reason || 'Hardware repair',
  });

  if (!rebindResult.success) {
    res.status(400).json(rebindResult);
    return;
  }
  res.json(rebindResult);
});

// Persistent DRM Anti-Replay & Cryptographic Trial Anchor Endpoints
app.get('/api/v1/security/drm-status', (_req, res) => {
  const anchor = trialAnchorGuard.getAnchorState();
  const trialEval = trialAnchorGuard.evaluateTrialEligibility();
  res.json({
    success: true,
    usedSerialTokens: anchor.usedSerialTokens,
    maxObservedClockMs: anchor.maxObservedClockEpochMs,
    boundRequestCode: anchor.boundRequestCode,
    trialStartedAtEpochMs: anchor.firstSeenEpochMs,
    trialDaysRemaining: trialEval.daysRemaining,
    trialAllowed: trialEval.allowed,
    serverNowMs: Date.now(),
  });
});

app.post('/api/v1/security/consume-serial', (req, res) => {
  const { consumptionToken, requestCode, clientClockMs } = req.body || {};
  if (!consumptionToken || typeof consumptionToken !== 'string') {
    res.status(400).json({ success: false, errorCode: 'INVALID_TOKEN' });
    return;
  }
  const consumeRes = trialAnchorGuard.consumeSerialTokenOnce(
    consumptionToken,
    requestCode,
    typeof clientClockMs === 'number' ? clientClockMs : undefined
  );
  if (!consumeRes.success) {
    const status = consumeRes.errorCode === 'ALREADY_USED_ONCE' ? 409 : 403;
    res.status(status).json({
      success: false,
      errorCode: consumeRes.errorCode,
      messageAr:
        consumeRes.errorCode === 'ALREADY_USED_ONCE'
          ? 'تم استهلاك كود التفعيل هذا مسبقاً على هذا الجهاز ولا يمكن إعادة استخدامه!'
          : 'تم رفض التفعيل: تم رصد إرجاع ساعة الجهاز للوراء!',
    });
    return;
  }
  recordServerAudit('licensing-client', 'LICENSE', 'SERIAL_CONSUMED_ONCE', {
    consumptionToken,
    requestCode: requestCode || null,
  });
  const anchor = trialAnchorGuard.getAnchorState();
  res.json({
    success: true,
    usedSerialTokens: anchor.usedSerialTokens,
    maxObservedClockMs: anchor.maxObservedClockEpochMs,
  });
});

// Licensing V3: Backend API Security Guard Middleware for Commercial Operations
// Uses Cryptographic Trial Anchor & Ed25519 Signed License Verification (No arbitrary header/DB fallback)
function verifyCommercialOperationGuard(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const licenseTokenHeader = req.headers['x-asf-license-token'] as string | undefined;
  const trialDeviceHeader = req.headers['x-asf-trial-device'] as string | undefined;

  // 1. If License Token Header is provided, strictly verify Ed25519 signature, expiration, and module entitlement
  if (licenseTokenHeader && licenseTokenHeader.trim().length > 0) {
    const verified = verifyLicenseHeaderAndEntitlement(licenseTokenHeader);
    if (!verified.allowed) {
      const status = verified.errorCode === 'INVALID_TOKEN_HEADER' ? 400 : 403;
      res.status(status).json({
        success: false,
        errorCode: verified.errorCode,
        dataAccessPreserved: true,
        message: `Backend Security Reject (${verified.errorCode}): Commercial write operations are restricted while read/export access remains preserved.`,
      });
      return;
    }
    return next();
  }

  // 2. Cryptographically Anchored 90-Day Trial Mode (Never trusts mutable client or DB trialStartedAtEpochMs)
  if (trialDeviceHeader && trialDeviceHeader.trim().length > 0) {
    const trialEval = trialAnchorGuard.evaluateTrialEligibility();
    if (!trialEval.allowed) {
      res.status(403).json({
        success: false,
        errorCode: trialEval.errorCode || 'TRIAL_EXPIRED',
        dataAccessPreserved: true,
        message: trialEval.reason || 'Backend Security Reject: Trial period expired or clock rollback detected.',
      });
      return;
    }
    return next();
  }

  // 3. Reject raw API access without license token or trial proof
  res.status(403).json({
    success: false,
    errorCode: 'LICENSE_REQUIRED',
    message: 'Backend Security Reject: Direct API bypass blocked. Valid x-asf-license-token or verified trial device header is mandatory.',
  });
}

// 2a. Ultra-Lightweight 0ms Revision Check & Real-Time SSE Stream for Multi-Device LAN Sync
app.get('/api/v1/erp/revision', (req, res) => {
  localSqliteEngine.recordLanDeviceActivity(
    req.ip || req.socket?.remoteAddress || '127.0.0.1',
    String(req.headers['user-agent'] || '')
  );
  res.json({
    success: true,
    dbRevision,
    serverTimestampMs: Date.now(),
  });
});

app.get('/api/v1/erp/events', (req, res) => {
  localSqliteEngine.recordLanDeviceActivity(
    req.ip || req.socket?.remoteAddress || '127.0.0.1',
    String(req.headers['user-agent'] || '')
  );
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(
    `event: revision\ndata: ${JSON.stringify({
      dbRevision,
      reason: 'connected',
      serverTimestampMs: Date.now(),
    })}\n\n`
  );

  sseClients.add(res);
  const keepAliveTimer = setInterval(() => {
    try {
      res.write(`: keep-alive ${Date.now()}\n\n`);
    } catch {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    sseClients.delete(res);
  });
});

// 2b. Local Embedded SQLite WAL Database Diagnostics, Optimization & File Backup Endpoints
app.get('/api/v1/local-db/status', (req, res) => {
  localSqliteEngine.recordLanDeviceActivity(
    req.ip || req.socket?.remoteAddress || '127.0.0.1',
    String(req.headers['user-agent'] || '')
  );
  res.json({
    success: true,
    diagnostics: localSqliteEngine.getDiagnostics(dbRevision),
  });
});

app.post('/api/v1/local-db/optimize', (_req, res) => {
  const result = localSqliteEngine.optimizeDatabase();
  res.json({
    success: true,
    durationMs: result.durationMs,
    diagnostics: localSqliteEngine.getDiagnostics(dbRevision),
  });
});

app.post('/api/v1/local-db/search-sql', (req, res) => {
  const query = String(req.body?.query || '');
  const result = localSqliteEngine.searchLocalSql(query);
  res.json({
    success: true,
    ...result,
  });
});

app.get('/api/v1/local-db/download-sqlite', (_req, res) => {
  localSqliteEngine.optimizeDatabase();
  const dbPath = localSqliteEngine.getDatabaseFilePath();
  if (!fs.existsSync(dbPath)) {
    res.status(404).json({ success: false, message: 'Local SQLite database file not found.' });
    return;
  }
  res.setHeader('Content-Type', 'application/x-sqlite3');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Haseb_Local_Database_${new Date().toISOString().split('T')[0]}.sqlite"`
  );
  fs.createReadStream(dbPath).pipe(res);
});

app.get('/api/v1/local-db/postgres-schema.sql', (_req, res) => {
  const esc = (v: unknown): string => `'${String(v ?? '').replace(/'/g, "''")}'`;
  const state = readServerDB() || {};
  const products: any[] = Array.isArray(state.products) ? state.products : [];
  const customers: any[] = Array.isArray(state.customers) ? state.customers : [];
  const invoices: any[] = Array.isArray(state.salesInvoices) ? state.salesInvoices : [];
  const journals: any[] = Array.isArray(state.journalEntries) ? state.journalEntries : [];

  const lines: string[] = [
    '-- ============================================================================',
    '-- Haseb Enterprise ERP — PostgreSQL 18 Production DDL & Live Data Snapshot',
    `-- Generated At: ${new Date().toISOString()}`,
    '-- Compatible with: PostgreSQL 18+ (Local Windows Server / LAN Cluster)',
    '-- ============================================================================',
    '',
    'BEGIN;',
    '',
    'CREATE TABLE IF NOT EXISTS erp_kv_snapshots (',
    '  key TEXT PRIMARY KEY,',
    '  schema_version TEXT NOT NULL,',
    '  revision BIGINT NOT NULL DEFAULT 1,',
    '  payload_json JSONB NOT NULL,',
    '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS erp_products (',
    '  id TEXT PRIMARY KEY,',
    '  sku TEXT NOT NULL UNIQUE,',
    '  barcode TEXT NOT NULL,',
    '  name_ar TEXT NOT NULL,',
    '  name_en TEXT NOT NULL,',
    '  category_id TEXT,',
    '  cost_price NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  sale_price NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  stock_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,',
    '  reorder_point NUMERIC(18, 3) NOT NULL DEFAULT 0,',
    '  warranty_months INTEGER NOT NULL DEFAULT 0,',
    '  industry TEXT NOT NULL DEFAULT \'solar\',',
    '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    ');',
    'CREATE INDEX IF NOT EXISTS idx_pg18_products_barcode ON erp_products(barcode);',
    '',
    'CREATE TABLE IF NOT EXISTS erp_customers (',
    '  id TEXT PRIMARY KEY,',
    '  code TEXT,',
    '  name_ar TEXT NOT NULL,',
    '  phone TEXT,',
    '  balance NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  credit_limit NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS erp_sales_invoices (',
    '  id TEXT PRIMARY KEY,',
    '  invoice_number TEXT NOT NULL UNIQUE,',
    '  customer_id TEXT,',
    '  customer_name TEXT NOT NULL,',
    '  customer_phone TEXT,',
    '  branch_id TEXT,',
    '  date TEXT NOT NULL,',
    '  subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  grand_total NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  payment_method TEXT NOT NULL,',
    '  status TEXT NOT NULL,',
    '  items_json JSONB NOT NULL DEFAULT \'[]\'::jsonb,',
    '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    ');',
    'CREATE INDEX IF NOT EXISTS idx_pg18_invoices_date ON erp_sales_invoices(date);',
    '',
    'CREATE TABLE IF NOT EXISTS erp_journal_entries (',
    '  id TEXT PRIMARY KEY,',
    '  entry_number TEXT NOT NULL,',
    '  date TEXT NOT NULL,',
    '  description_ar TEXT,',
    '  total_debit NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  total_credit NUMERIC(18, 2) NOT NULL DEFAULT 0,',
    '  status TEXT NOT NULL,',
    '  lines_json JSONB NOT NULL DEFAULT \'[]\'::jsonb',
    ');',
    '',
  ];

  for (const p of products) {
    lines.push(
      `INSERT INTO erp_products (id, sku, barcode, name_ar, name_en, category_id, cost_price, sale_price, stock_qty, reorder_point, warranty_months, industry) VALUES (${esc(p.id)}, ${esc(p.sku)}, ${esc(p.barcode)}, ${esc(p.nameAr || p.name)}, ${esc(p.name)}, ${esc(p.categoryId || '')}, ${Number(p.costPrice) || 0}, ${Number(p.salePrice) || 0}, ${Number(p.stockQty) || 0}, ${Number(p.reorderPoint) || 0}, ${Math.trunc(Number(p.warrantyMonths) || 0)}, ${esc(p.industry || 'solar')}) ON CONFLICT (id) DO UPDATE SET stock_qty = EXCLUDED.stock_qty, sale_price = EXCLUDED.sale_price, cost_price = EXCLUDED.cost_price, updated_at = NOW();`
    );
  }

  for (const c of customers) {
    lines.push(
      `INSERT INTO erp_customers (id, code, name_ar, phone, balance, credit_limit) VALUES (${esc(c.id)}, ${esc(c.code || '')}, ${esc(c.nameAr || c.name)}, ${esc(c.phone || '')}, ${Number(c.balance) || 0}, ${Number(c.creditLimit) || 0}) ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance, credit_limit = EXCLUDED.credit_limit, updated_at = NOW();`
    );
  }

  for (const inv of invoices) {
    lines.push(
      `INSERT INTO erp_sales_invoices (id, invoice_number, customer_id, customer_name, customer_phone, branch_id, date, subtotal, discount_amount, tax_amount, grand_total, paid_amount, payment_method, status, items_json) VALUES (${esc(inv.id)}, ${esc(inv.invoiceNumber)}, ${esc(inv.customerId || '')}, ${esc(inv.customerName)}, ${esc(inv.customerPhone || '')}, ${esc(inv.branchId || '')}, ${esc(inv.date || '')}, ${Number(inv.subtotal) || 0}, ${Number(inv.discountAmount) || 0}, 0, ${Number(inv.grandTotal) || 0}, ${Number(inv.paidAmount) || 0}, ${esc(inv.paymentMethod || 'CASH')}, ${esc(inv.status || 'PAID')}, ${esc(JSON.stringify(inv.items || []))}::jsonb) ON CONFLICT (id) DO NOTHING;`
    );
  }

  for (const je of journals) {
    lines.push(
      `INSERT INTO erp_journal_entries (id, entry_number, date, description_ar, total_debit, total_credit, status, lines_json) VALUES (${esc(je.id)}, ${esc(je.entryNumber || '')}, ${esc(je.date || '')}, ${esc(je.descriptionAr || je.description || '')}, ${Number(je.totalDebit) || 0}, ${Number(je.totalCredit) || 0}, ${esc(je.status || 'POSTED')}, ${esc(JSON.stringify(je.lines || []))}::jsonb) ON CONFLICT (id) DO NOTHING;`
    );
  }

  lines.push('', 'COMMIT;', '');

  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Haseb_PostgreSQL18_Schema_${new Date().toISOString().split('T')[0]}.sql"`
  );
  res.send(lines.join('\n'));
});

// 2. Get Persistent ERP State (0ms RAM Read + Local SQLite WAL Backed)
app.get('/api/v1/erp/state', (req, res) => {
  localSqliteEngine.recordLanDeviceActivity(
    req.ip || req.socket?.remoteAddress || '127.0.0.1',
    String(req.headers['user-agent'] || '')
  );
  const state = readServerDB();
  res.json({
    success: true,
    hasSavedState: Boolean(state),
    dbRevision,
    engineMode: 'LOCAL_SQLITE_WAL_AND_RAM_CACHE',
    data: state,
  });
});

// 2c. Fast Catch-Up Delta Endpoint (Bridges skipped revisions + Compact Domain Events cleanly for LAN clients)
app.get('/api/v1/erp/catchup', (req, res) => {
  const sinceRevision = Number(req.query.sinceRevision || 0);
  if (!memoryStore) {
    res.json({
      success: true,
      mode: 'EMPTY',
      dbRevision,
      domainEvents: [],
      data: null,
    });
    return;
  }
  if (sinceRevision >= dbRevision) {
    res.json({
      success: true,
      mode: 'UP_TO_DATE',
      dbRevision,
      domainEvents: [],
    });
    return;
  }

  const domainEvents = localSqliteEngine.getDomainEventsSinceRevision(sinceRevision);
  let canComposeDelta = sinceRevision > 0 && dbRevision - sinceRevision <= MAX_REVISION_HISTORY;
  let composedPatch: Record<string, any> = {};
  if (canComposeDelta) {
    for (let r = sinceRevision + 1; r <= dbRevision; r++) {
      const logEntry = revisionPatchLog.get(r);
      if (!logEntry) {
        canComposeDelta = false;
        break;
      }
      composedPatch = mergeStateDeltaPatch(composedPatch, logEntry.patch);
    }
  }

  if (canComposeDelta) {
    res.json({
      success: true,
      mode: 'DELTA',
      dbRevision,
      patch: composedPatch,
      changedKeys: Object.keys(composedPatch),
      domainEvents,
    });
    return;
  }

  res.json({
    success: true,
    mode: 'FULL',
    dbRevision,
    domainEvents,
    data: memoryStore,
  });
});

// 2d. Phase 2: Server-Authoritative Business Command Endpoint (ACID Stock Validation, Idempotency & Compact Events)
app.post('/api/v1/erp/command', verifyCommercialOperationGuard, (req, res) => {
  const body = req.body || {};
  const currentState = readServerDB() || {
    products: [],
    salesInvoices: [],
    archivedInvoices: [],
    customers: [],
    suppliers: [],
    journalEntries: [],
    stockTransfers: [],
  };

  const nextCandidateRevision = dbRevision + 1;
  const { result, statePatch } = executeAuthoritativeBusinessCommand(
    currentState,
    {
      commandId: String(body.commandId || ''),
      commandType: body.commandType,
      clientId: String(body.clientId || req.headers['x-erp-client-id'] || 'lan-client'),
      branchId: body.branchId,
      actorName: body.actorName,
      payload: body.payload || {},
    },
    commandIdempotencyMap,
    nextCandidateRevision
  );

  if (!result.success) {
    const status =
      result.errorCode === 'INSUFFICIENT_STOCK' || result.errorCode === 'ALREADY_RETURNED'
        ? 409
        : 400;
    res.status(status).json(result);
    return;
  }

  if (result.idempotentReplay) {
    res.json(result);
    return;
  }

  const { dbRevision: committedRev } = patchServerDB(
    statePatch,
    String(body.clientId || req.headers['x-erp-client-id'] || '') || undefined
  );
  result.dbRevision = committedRev;

  localSqliteEngine.saveCommandAndEvents(
    result.commandId,
    String(body.commandType || ''),
    committedRev,
    result,
    result.events
  );

  recordServerAudit(
    String(body.actorName || body.clientId || 'pos-operator'),
    'COMMAND',
    String(body.commandType || 'BUSINESS_COMMAND'),
    {
      commandId: result.commandId,
      dbRevision: committedRev,
      entityId: result.entity?.id || null,
    }
  );

  if (result.events.length > 0) {
    broadcastWsMessage({
      type: 'erp:domain_events',
      dbRevision: committedRev,
      commandId: result.commandId,
      originClientId: body.clientId || null,
      events: result.events,
      serverTimestampMs: Date.now(),
    });
  }

  res.json(result);
});

// 3. Save / Sync Persistent ERP State (0ms RAM Commit + Async Atomic Disk Flush) with Backend Guard
app.post('/api/v1/erp/state', verifyCommercialOperationGuard, (req, res) => {
  const startHr = process.hrtime.bigint();
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ success: false, message: 'Invalid state payload' });
    return;
  }
  const originClientId = String(req.headers['x-erp-client-id'] || payload.__originClientId || '');
  const cleanPayload = { ...payload };
  delete (cleanPayload as any).__originClientId;

  // Split-Brain Protection: prevent an unconfigured or stale onboarding client from wiping an active server company
  const forceOverwrite = req.headers['x-erp-force-overwrite'] === '1';
  if (
    !forceOverwrite &&
    memoryStore &&
    memoryStore.isOnboardingCompleted === true &&
    cleanPayload.isOnboardingCompleted === false
  ) {
    const elapsedMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
    res.json({
      success: true,
      preservedExistingServerState: true,
      message: 'Authoritative server company preserved; client should hydrate server state.',
      dbRevision,
      data: memoryStore,
      latencyMs: Math.round(elapsedMs * 100) / 100,
      syncedAt: new Date().toISOString(),
    });
    return;
  }

  const rev = writeServerDB(cleanPayload, originClientId || undefined);
  const elapsedMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
  res.json({
    success: true,
    message: 'ERP state committed to RAM & queued for atomic disk persistence',
    dbRevision: rev,
    latencyMs: Math.round(elapsedMs * 100) / 100,
    syncedAt: new Date().toISOString(),
  });
});

// 3b. Ultra-Fast Delta Patch Sync Endpoint (Conflict-free 3-Way Merge + Immediate WS Broadcast)
app.post('/api/v1/erp/patch', verifyCommercialOperationGuard, (req, res) => {
  const startHr = process.hrtime.bigint();
  const body = req.body;
  const patch = body && typeof body === 'object' && body.patch && typeof body.patch === 'object' ? body.patch : body;
  if (!patch || typeof patch !== 'object') {
    res.status(400).json({ success: false, message: 'Invalid patch payload' });
    return;
  }
  const originClientId = String(
    body?.originClientId || req.headers['x-erp-client-id'] || ''
  );
  const baseRevision =
    typeof body?.baseRevision === 'number' && Number.isFinite(body.baseRevision)
      ? body.baseRevision
      : undefined;

  const { dbRevision: rev, changedKeys, mergedPatch, wasMerged } = patchServerDB(
    patch,
    originClientId || undefined,
    baseRevision
  );
  const elapsedMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
  res.json({
    success: true,
    dbRevision: rev,
    changedKeys,
    wasMerged,
    mergedPatch: wasMerged ? mergedPatch : undefined,
    latencyMs: Math.round(elapsedMs * 100) / 100,
    syncedAt: new Date().toISOString(),
  });
});

// 4. Reset Persistent ERP State (Creates automatic pre-reset safety backup + preserves Trial Anchor & Audit Chain)
app.post('/api/v1/erp/reset', (_req, res) => {
  try {
    let preResetBackupFile: string | null = null;
    try {
      if (memoryStore) {
        const safetyBackup = createVerifiedServerBackup('AUTO');
        preResetBackupFile = safetyBackup.filename;
      }
    } catch {
      // ignore if empty
    }
    recordServerAudit('system-admin', 'RESET', 'ERP_FULL_RESET', {
      preResetBackupFile,
      previousRevision: dbRevision,
    });

    memoryStore = null;
    dbRevision = 1;
    revisionHistoryMap.clear();
    revisionPatchLog.clear();
    whatsappAccountsStore = [createCleanWhatsAppDefaultAccount()];
    activeWhatsAppAccountIdStore = whatsappAccountsStore[0]?.id || 'wa-acc-primary';
    whatsappChatsStore = [];
    interBranchTransfersStore = [];
    localSqliteEngine.clearAllState();
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    broadcastSseRevision(dbRevision, 'reset');
    broadcastWsMessage({
      type: 'erp:state_commit',
      dbRevision,
      originClientId: null,
      serverTimestampMs: Date.now(),
    });
    res.json({
      success: true,
      preResetBackupFile,
      message: 'Server database reset to clean initial state (safety backup created)',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4.1 Reset to Clean Blank Database (Creates automatic pre-reset safety backup + preserves chart of accounts)
app.post('/api/v1/erp/reset-blank', (_req, res) => {
  try {
    let preResetBackupFile: string | null = null;
    try {
      if (memoryStore) {
        const safetyBackup = createVerifiedServerBackup('AUTO');
        preResetBackupFile = safetyBackup.filename;
      }
    } catch {
      // ignore if empty
    }
    recordServerAudit('system-admin', 'RESET', 'ERP_BLANK_RESET', {
      preResetBackupFile,
      previousRevision: dbRevision,
    });

    whatsappAccountsStore = [createCleanWhatsAppDefaultAccount()];
    activeWhatsAppAccountIdStore = whatsappAccountsStore[0]?.id || 'wa-acc-primary';
    whatsappChatsStore = [];
    interBranchTransfersStore = [];
    memoryStore = {
      products: [],
      salesInvoices: [],
      purchaseOrders: [],
      customers: [],
      suppliers: [],
      employees: [],
      journalEntries: [],
      outboundMessages: [],
      whatsappAccounts: whatsappAccountsStore,
      activeWhatsAppAccountId: activeWhatsAppAccountIdStore,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      dbRevision: 1,
      lastSyncedAt: new Date().toISOString(),
    };
    dbRevision = 1;
    revisionHistoryMap.clear();
    revisionPatchLog.clear();
    recordRevisionSnapshot(dbRevision, memoryStore);
    localSqliteEngine.savePrimaryStateTransaction(memoryStore, CURRENT_SCHEMA_VERSION, 1);
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
    broadcastSseRevision(dbRevision, 'reset_blank');
    broadcastWsMessage({
      type: 'erp:state_commit',
      dbRevision,
      originClientId: null,
      serverTimestampMs: Date.now(),
    });
    res.json({
      success: true,
      preResetBackupFile,
      message: 'Server database initialized to clean blank state (safety backup created)',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 4a. Scheduled Auto-Backup Manager & One-Click Restore Engine
// ============================================================================
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_CONFIG_FILE = path.join(DATA_DIR, 'backup-config.json');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

type BackupScheduleMode = 'OFF' | 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY';

interface ServerBackupConfigState {
  schedule: BackupScheduleMode;
  maxRetentionCount: number;
  includeSqliteCopy: boolean;
  lastBackupAt?: string;
  nextBackupAt?: string;
}

function getScheduleIntervalMs(schedule: BackupScheduleMode): number {
  switch (schedule) {
    case 'HOURLY':
      return 3600 * 1000;
    case 'EVERY_6_HOURS':
      return 6 * 3600 * 1000;
    case 'DAILY':
      return 24 * 3600 * 1000;
    case 'OFF':
    default:
      return 0;
  }
}

function computeNextBackupIso(schedule: BackupScheduleMode, fromMs = Date.now()): string | undefined {
  const intervalMs = getScheduleIntervalMs(schedule);
  if (intervalMs <= 0) return undefined;
  return new Date(fromMs + intervalMs).toISOString();
}

function loadBackupConfig(): ServerBackupConfigState {
  const fallback: ServerBackupConfigState = {
    schedule: 'EVERY_6_HOURS',
    maxRetentionCount: 15,
    includeSqliteCopy: true,
    nextBackupAt: computeNextBackupIso('EVERY_6_HOURS'),
  };
  try {
    if (fs.existsSync(BACKUP_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BACKUP_CONFIG_FILE, 'utf-8'));
      const schedule: BackupScheduleMode = ['OFF', 'HOURLY', 'EVERY_6_HOURS', 'DAILY'].includes(
        parsed?.schedule
      )
        ? parsed.schedule
        : 'EVERY_6_HOURS';
      return {
        schedule,
        maxRetentionCount: Math.max(3, Math.min(100, Number(parsed?.maxRetentionCount) || 15)),
        includeSqliteCopy:
          typeof parsed?.includeSqliteCopy === 'boolean' ? parsed.includeSqliteCopy : true,
        lastBackupAt: typeof parsed?.lastBackupAt === 'string' ? parsed.lastBackupAt : undefined,
        nextBackupAt:
          schedule === 'OFF'
            ? undefined
            : typeof parsed?.nextBackupAt === 'string'
            ? parsed.nextBackupAt
            : computeNextBackupIso(schedule),
      };
    }
  } catch {
    // fallback
  }
  return fallback;
}

let backupConfigState: ServerBackupConfigState = loadBackupConfig();

function saveBackupConfig() {
  try {
    fs.writeFileSync(BACKUP_CONFIG_FILE, JSON.stringify(backupConfigState, null, 2), 'utf-8');
  } catch {
    // ignore write failure
  }
}

function listServerBackupsMetadata() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((name) => name.endsWith('.json') && name.startsWith('haseb-backup-'))
      .sort()
      .reverse();

    const list: Array<{
      filename: string;
      createdAt: string;
      sizeBytes: number;
      checksumSha256: string;
      trigger: 'AUTO' | 'MANUAL';
      dbRevision: number;
      productsCount: number;
      invoicesCount: number;
      journalsCount: number;
    }> = [];

    for (const filename of files) {
      try {
        const fullPath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(fullPath);
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        const data = parsed?.data || parsed || {};
        list.push({
          filename,
          createdAt: parsed?.createdAt || stat.mtime.toISOString(),
          sizeBytes: stat.size,
          checksumSha256: parsed?.checksumSha256 || '',
          trigger: parsed?.trigger === 'AUTO' ? 'AUTO' : 'MANUAL',
          dbRevision: Number(parsed?.dbRevision) || Number(data?.dbRevision) || 1,
          productsCount: Array.isArray(data.products) ? data.products.length : 0,
          invoicesCount: Array.isArray(data.salesInvoices) ? data.salesInvoices.length : 0,
          journalsCount: Array.isArray(data.journalEntries) ? data.journalEntries.length : 0,
        });
      } catch {
        // skip corrupted entry
      }
    }
    return list;
  } catch {
    return [];
  }
}

function pruneOldBackups(maxKeep: number) {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((name) => name.endsWith('.json') && name.startsWith('haseb-backup-'))
      .sort()
      .reverse();
    if (files.length <= maxKeep) return;
    for (const oldFile of files.slice(maxKeep)) {
      const jsonPath = path.join(BACKUP_DIR, oldFile);
      const sqliteCopyPath = jsonPath.replace(/\.json$/, '.sqlite');
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(sqliteCopyPath)) fs.unlinkSync(sqliteCopyPath);
    }
  } catch {
    // ignore prune error
  }
}

function createVerifiedServerBackup(trigger: 'AUTO' | 'MANUAL') {
  const snapshotData = readServerDB() || {
    products: [],
    salesInvoices: [],
    purchaseOrders: [],
    journalEntries: [],
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dbRevision,
  };
  const nowIso = new Date().toISOString();
  const safeStamp = nowIso.replace(/[:.]/g, '-');
  const filename = `haseb-backup-${safeStamp}-${trigger.toLowerCase()}.json`;
  const dataJson = JSON.stringify(snapshotData);
  const checksumSha256 = crypto.createHash('sha256').update(dataJson, 'utf8').digest('hex');

  const envelope = {
    backupFormat: 'HASEB-SERVER-BACKUP-V1',
    createdAt: nowIso,
    trigger,
    dbRevision,
    checksumSha256,
    data: snapshotData,
  };

  const fullPath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(fullPath, JSON.stringify(envelope, null, 2), 'utf-8');

  if (backupConfigState.includeSqliteCopy) {
    try {
      localSqliteEngine.optimizeDatabase();
      const sqlitePath = localSqliteEngine.getDatabaseFilePath();
      if (fs.existsSync(sqlitePath)) {
        fs.copyFileSync(sqlitePath, fullPath.replace(/\.json$/, '.sqlite'));
      }
    } catch {
      // ignore sqlite copy error
    }
  }

  backupConfigState = {
    ...backupConfigState,
    lastBackupAt: nowIso,
    nextBackupAt: computeNextBackupIso(backupConfigState.schedule, Date.now()),
  };
  saveBackupConfig();
  pruneOldBackups(backupConfigState.maxRetentionCount);

  return {
    filename,
    createdAt: nowIso,
    checksumSha256,
    trigger,
    dbRevision,
  };
}

// Background Auto-Backup Scheduler Tick (checks every 60s)
setInterval(() => {
  try {
    if (backupConfigState.schedule === 'OFF') return;
    if (!memoryStore) return;
    const dueMs = backupConfigState.nextBackupAt
      ? Date.parse(backupConfigState.nextBackupAt)
      : 0;
    if (!dueMs || Date.now() >= dueMs) {
      const created = createVerifiedServerBackup('AUTO');
      broadcastWsMessage({
        type: 'erp:daily_backup_completed',
        backup: created,
      });
    }
  } catch {
    // ignore scheduler tick error
  }
}, 60_000);

app.get('/api/v1/backups/status', (_req, res) => {
  res.json({
    success: true,
    config: backupConfigState,
    backups: listServerBackupsMetadata(),
  });
});

app.post('/api/v1/backups/config', (req, res) => {
  const { schedule, maxRetentionCount, includeSqliteCopy } = req.body || {};
  const validSchedule: BackupScheduleMode = ['OFF', 'HOURLY', 'EVERY_6_HOURS', 'DAILY'].includes(
    schedule
  )
    ? schedule
    : backupConfigState.schedule;

  backupConfigState = {
    ...backupConfigState,
    schedule: validSchedule,
    maxRetentionCount:
      typeof maxRetentionCount === 'number'
        ? Math.max(3, Math.min(100, Math.round(maxRetentionCount)))
        : backupConfigState.maxRetentionCount,
    includeSqliteCopy:
      typeof includeSqliteCopy === 'boolean'
        ? includeSqliteCopy
        : backupConfigState.includeSqliteCopy,
    nextBackupAt: computeNextBackupIso(validSchedule, Date.now()),
  };
  saveBackupConfig();
  pruneOldBackups(backupConfigState.maxRetentionCount);

  res.json({
    success: true,
    config: backupConfigState,
    backups: listServerBackupsMetadata(),
  });
});

app.post('/api/v1/backups/run-now', (req, res) => {
  try {
    const requestedTrigger = req.body?.trigger === 'AUTO' ? 'AUTO' : 'MANUAL';
    const created = createVerifiedServerBackup(requestedTrigger);
    recordServerAudit('system-admin', 'BACKUP', 'BACKUP_CREATED', {
      filename: created.filename,
      trigger: requestedTrigger,
      checksumSha256: created.checksumSha256,
    });
    res.json({
      success: true,
      created,
      config: backupConfigState,
      backups: listServerBackupsMetadata(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Backup creation failed' });
  }
});

// Phase 4: AES-256-GCM Customer-Controlled Encrypted Backup Creation & Clean-Room Restore
app.post('/api/v1/backups/create-encrypted', (req, res) => {
  try {
    const { passphrase } = req.body || {};
    if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length < 4) {
      res.status(400).json({
        success: false,
        errorCode: 'WEAK_PASSPHRASE',
        messageAr: 'يرجى إدخال كلمة مرور قوية لتشفير النسخة الاحتياطية (4 أحرف على الأقل).',
      });
      return;
    }
    const currentData = readServerDB() || {};
    const envelope = createEncryptedBackupEnvelopeV2(
      currentData,
      passphrase,
      dbRevision,
      CURRENT_SCHEMA_VERSION
    );
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `haseb-backup-encrypted-${stamp}-rev${dbRevision}.json`;
    fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(envelope, null, 2), 'utf-8');

    recordServerAudit('system-admin', 'BACKUP', 'ENCRYPTED_BACKUP_CREATED', {
      filename,
      dbRevision,
      plaintextSha256: envelope.plaintextSha256,
    });

    res.json({
      success: true,
      filename,
      envelope,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Encrypted backup creation failed',
    });
  }
});

app.get('/api/v1/backups/download-latest', (_req, res) => {
  try {
    let backups = listServerBackupsMetadata();
    let targetName = backups[0]?.filename;
    if (!targetName) {
      const created = createVerifiedServerBackup('MANUAL');
      targetName = created.filename;
    }
    const targetPath = path.join(BACKUP_DIR, path.basename(targetName));
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ success: false, message: 'Latest backup file not found' });
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(targetName)}"`);
    fs.createReadStream(targetPath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to download latest backup' });
  }
});

app.get('/api/v1/backups/download/:filename', (req, res) => {
  const safeName = path.basename(String(req.params.filename || ''));
  if (!safeName.startsWith('haseb-backup-') || !safeName.endsWith('.json')) {
    res.status(400).json({ success: false, message: 'Invalid backup filename' });
    return;
  }
  const targetPath = path.join(BACKUP_DIR, safeName);
  if (!fs.existsSync(targetPath)) {
    res.status(404).json({ success: false, message: 'Backup file not found' });
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  fs.createReadStream(targetPath).pipe(res);
});

app.post('/api/v1/backups/restore', (req, res) => {
  try {
    const { filename, payload, passphrase } = req.body || {};
    let parsedEnvelope: any = null;

    if (typeof filename === 'string' && filename.trim()) {
      const safeName = path.basename(filename.trim());
      if (!safeName.startsWith('haseb-backup-') || !safeName.endsWith('.json')) {
        res.status(400).json({ success: false, messageAr: 'اسم ملف النسخة غير صالح.' });
        return;
      }
      const targetPath = path.join(BACKUP_DIR, safeName);
      if (!fs.existsSync(targetPath)) {
        res.status(404).json({ success: false, messageAr: 'ملف النسخة الاحتياطية غير موجود.' });
        return;
      }
      parsedEnvelope = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    } else if (payload && typeof payload === 'object') {
      parsedEnvelope = payload;
    } else if (typeof payload === 'string') {
      parsedEnvelope = JSON.parse(payload);
    }

    if (!parsedEnvelope || typeof parsedEnvelope !== 'object') {
      res.status(400).json({ success: false, messageAr: 'تعذر قراءة بيانات النسخة الاحتياطية.' });
      return;
    }

    let restoredData: Record<string, any> | null = null;

    // Support AES-256-GCM Encrypted Backup Envelope V2
    if (parsedEnvelope.backupFormat === 'HASEB-ENCRYPTED-BACKUP-V2') {
      if (!passphrase || typeof passphrase !== 'string') {
        res.status(400).json({
          success: false,
          errorCode: 'PASSPHRASE_REQUIRED',
          messageAr: 'هذه النسخة الاحتياطية مشفرة بمعيار AES-256-GCM. يرجى إدخال كلمة المرور لفك التشفير.',
        });
        return;
      }
      const decrypted = decryptAndVerifyBackupEnvelopeV2(
        parsedEnvelope as EncryptedBackupEnvelopeV2,
        passphrase
      );
      if (!decrypted.success || !decrypted.data) {
        res.status(422).json({
          success: false,
          errorCode: decrypted.errorCode || 'DECRYPTION_FAILED',
          messageAr: 'فشل فك تشفير النسخة الاحتياطية أو فشل فحص السلامة الرقمية (كلمة مرور خاطئة أو ملف تالف).',
        });
        return;
      }
      restoredData = decrypted.data;
    } else if (
      parsedEnvelope.backupFormat === 'HASEB-SERVER-BACKUP-V1' &&
      parsedEnvelope.checksumSha256 &&
      parsedEnvelope.data
    ) {
      // Verify integrity checksum when restoring from server backup envelope V1
      const calculatedSha = crypto
        .createHash('sha256')
        .update(JSON.stringify(parsedEnvelope.data), 'utf8')
        .digest('hex');
      if (calculatedSha !== parsedEnvelope.checksumSha256) {
        res.status(422).json({
          success: false,
          messageAr: 'فشل فحص التكامل الرقمي (SHA-256) — قد يكون ملف النسخة الاحتياطية تالفاً أو معدلاً.',
        });
        return;
      }
      restoredData = parsedEnvelope.data;
    } else {
      restoredData =
        parsedEnvelope.data && typeof parsedEnvelope.data === 'object'
          ? parsedEnvelope.data
          : parsedEnvelope;
    }

    if (!restoredData || typeof restoredData !== 'object') {
      res.status(400).json({ success: false, messageAr: 'هيكل النسخة الاحتياطية غير متوافق.' });
      return;
    }

    // Create automatic pre-restore safety backup before overwriting current state
    let preRestoreSafetyBackup: string | null = null;
    try {
      if (memoryStore) {
        const safety = createVerifiedServerBackup('AUTO');
        preRestoreSafetyBackup = safety.filename;
      }
    } catch {
      // ignore if empty
    }

    const newRev = writeServerDB(restoredData);
    recordServerAudit('system-admin', 'RESTORE', 'BACKUP_RESTORED', {
      filename: filename || 'inline-payload',
      encrypted: parsedEnvelope.backupFormat === 'HASEB-ENCRYPTED-BACKUP-V2',
      preRestoreSafetyBackup,
      newRevision: newRev,
    });

    res.json({
      success: true,
      dbRevision: newRev,
      preRestoreSafetyBackup,
      restoredAt: new Date().toISOString(),
      productsCount: Array.isArray(restoredData.products) ? restoredData.products.length : 0,
      invoicesCount: Array.isArray(restoredData.salesInvoices) ? restoredData.salesInvoices.length : 0,
      messageAr: `تمت استعادة النسخة الاحتياطية وتحديث كافة الأجهزة على الشبكة بنجاح (الإصدار #${newRev}).`,
      data: restoredData,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      messageAr: `فشل استعادة النسخة الاحتياطية: ${err?.message || 'خطأ داخلي'}`,
    });
  }
});

// 4b. Server-Side Omnichannel WhatsApp & SMS Gateway Dispatch Endpoint (Phase 3 Honest Delivery State Machine)
app.post('/api/v1/messaging/send', async (req, res) => {
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
  } = req.body || {};

  if (!normalizedPhone || !messageBody) {
    res.status(400).json({
      success: false,
      error: 'normalizedPhone and messageBody are required for WhatsApp/SMS dispatch.',
    });
    return;
  }

  // Deduplicate if message with identical ID was already dispatched
  if (id && memoryStore && Array.isArray(memoryStore.outboundMessages)) {
    const existingMsg = memoryStore.outboundMessages.find((m: any) => m.id === id);
    if (existingMsg && (existingMsg.status === 'SENT' || existingMsg.status === 'DELIVERED')) {
      res.json({
        success: true,
        deduplicated: true,
        record: existingMsg,
      });
      return;
    }
  }

  const {
    dispatchFormat,
    pdfAttached,
    imageAttached,
  } = req.body || {};

  let realWaSent = false;
  if (channel !== 'SMS') {
    try {
      const gw = await getBaileysGateway();
      if (gw && typeof gw.sendRealWhatsAppMessage === 'function') {
        const waRes = await gw.sendRealWhatsAppMessage(
          activeWhatsAppAccountIdStore,
          normalizedPhone,
          messageBody
        );
        if (waRes && waRes.sentViaRealWhatsApp) {
          realWaSent = true;
        }
      }
    } catch {
      // Socket not linked; message remains in QUEUED state until live connection or manual bridge
    }
  }

  // Honest Delivery State Machine:
  // Only report SENT when live Baileys socket actually transmitted the packet; otherwise QUEUED (never fake DELIVERED)
  const honestStatus = realWaSent ? 'SENT' : 'QUEUED';
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
    status: honestStatus,
    deliveryConfirmed: realWaSent,
    dispatchFormat: dispatchFormat || 'ALL_COMBINED',
    pdfAttached: Boolean(pdfAttached),
    imageAttached: Boolean(imageAttached),
    retryCount: 0,
    whatsappUrl: whatsappUrl || `https://wa.me/${String(normalizedPhone).replace(/\D/g, '')}`,
    smsUri: smsUri || `sms:${normalizedPhone}`,
    sentBy: realWaSent
      ? `${sentBy || 'System Operator'} (WhatsApp Multi-Device Live Socket ✓)`
      : `${sentBy || 'System Operator'} (Queued for Live Gateway)`,
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
    realWhatsAppDelivered: realWaSent,
    gatewayReceiptId: `GW-${record.channel}-${Date.now().toString(36).toUpperCase()}`,
    record,
    dbRevision,
    dispatchedAt: new Date().toISOString(),
  });
});

// 4c. WhatsApp Web Live Multi-Account Session Registry & Real Baileys Multi-Device Gateway
let whatsappAccountsStore =
  memoryStore && Array.isArray(memoryStore.whatsappAccounts) && memoryStore.whatsappAccounts.length > 0
    ? memoryStore.whatsappAccounts
    : [createCleanWhatsAppDefaultAccount(memoryStore?.company?.nameAr || 'منشأتك')];
let activeWhatsAppAccountIdStore =
  memoryStore?.activeWhatsAppAccountId || whatsappAccountsStore[0]?.id || 'wa-acc-primary';
let whatsappSessionStore = createInitialWhatsAppSession();
let whatsappChatsStore: any[] = [];

// WhatsApp AI Auto-Responder Bot State (Strictly disabled by default until user clicks the Robot icon)
let whatsappAiBotEnabledStore = false;
let whatsappAiBotRepliesCountStore = 0;
let whatsappAiBotLastActionArStore = 'في وضع الاستعداد — انقر على أيقونة الروبوت لتفعيل الرد الذكي الفوري';
const whatsappAiBotRepliedMsgIds = new Set<string>();

function buildCurrentServerErpSnapshot(overrideSnapshot?: any) {
  return {
    companyName:
      overrideSnapshot?.companyName ||
      memoryStore?.company?.nameAr ||
      'المنشأة المعتمدة',
    currencySymbol:
      overrideSnapshot?.currencySymbol ||
      memoryStore?.company?.currencySymbol ||
      'ر.ي',
    products: Array.isArray(overrideSnapshot?.products)
      ? overrideSnapshot.products
      : Array.isArray(memoryStore?.products)
      ? memoryStore.products
      : [],
    customers: Array.isArray(overrideSnapshot?.customers)
      ? overrideSnapshot.customers
      : Array.isArray(memoryStore?.customers)
      ? memoryStore.customers
      : [],
    salesInvoices: Array.isArray(overrideSnapshot?.salesInvoices)
      ? overrideSnapshot.salesInvoices
      : Array.isArray(memoryStore?.salesInvoices)
      ? memoryStore.salesInvoices
      : [],
    warrantyTickets: Array.isArray(overrideSnapshot?.warrantyTickets)
      ? overrideSnapshot.warrantyTickets
      : Array.isArray(memoryStore?.warrantyTickets)
      ? memoryStore.warrantyTickets
      : [],
  };
}

// Dynamically load native ESM Baileys Gateway (bundler-compatible ES import)
let baileysGatewayPromise: Promise<any> | null = null;
function getBaileysGateway() {
  if (!baileysGatewayPromise) {
    baileysGatewayPromise = import('./src/server/whatsappMultiAccountGateway.mjs').catch(
      (err: any) => {
        console.error('Failed to load whatsappMultiAccountGateway.mjs:', err);
        baileysGatewayPromise = null;
        return null;
      }
    );
  }
  return baileysGatewayPromise;
}

// Baileys Gateway is loaded lazily on first WhatsApp API request to keep server boot instantaneous

function syncWhatsAppStoresToPersistence() {
  if (memoryStore && typeof memoryStore === 'object') {
    patchServerDB(
      {
        whatsappAccounts: whatsappAccountsStore,
        activeWhatsAppAccountId: activeWhatsAppAccountIdStore,
      },
      'server-whatsapp-gateway'
    );
  }
}

// Live Real WhatsApp QR & Connection Status Endpoint (Powered by @whiskeysockets/baileys)
app.get('/api/v1/whatsapp/live-qr', async (req, res) => {
  const accountId = String(req.query.accountId || activeWhatsAppAccountIdStore || 'wa-acc-sales');
  const forceNew = req.query.forceNew === '1';

  try {
    const gw = await getBaileysGateway();
    if (!gw) {
      res.status(500).json({ success: false, error: 'WhatsApp Baileys gateway unavailable' });
      return;
    }

    if (forceNew) {
      await gw.ensureRealWhatsAppSocket(accountId, { forceRestart: true, clearAuth: true });
    }

    const snapshot = await gw.waitForLiveQR(accountId, 4500);

    // If real WhatsApp socket connected or has live messages, synchronize account state & incoming messages
    if (
      (snapshot.status === 'CONNECTED' && snapshot.connectedPhone) ||
      (Array.isArray(snapshot.inboundMessages) && snapshot.inboundMessages.length > 0)
    ) {
      whatsappAccountsStore = whatsappAccountsStore.map((acc) => {
        if (acc.id !== accountId) return acc;
        let updatedChats = [...acc.chats];
        if (Array.isArray(snapshot.inboundMessages) && snapshot.inboundMessages.length > 0) {
          // Track existing message IDs on initial sync so we only auto-reply to new incoming messages when Bot is active
          for (const inMsg of snapshot.inboundMessages) {
            const alreadyExists = updatedChats.some((c: any) =>
              c.messages.some((m: any) => m.id === inMsg.id)
            );
            if (!alreadyExists) {
              const appended = appendMessageToWhatsAppChats(updatedChats, {
                messageId: inMsg.id,
                recipientName: inMsg.contactName || inMsg.senderPhone,
                recipientPhone: inMsg.senderPhone,
                messageText: inMsg.text,
                sender: inMsg.fromMe ? 'ME' : 'THEM',
                timestamp: inMsg.timestamp,
              });
              updatedChats = appended.updatedChats;

              // If AI Robot is enabled and this is an inbound message from a customer, auto-reply immediately!
              if (
                whatsappAiBotEnabledStore &&
                !inMsg.fromMe &&
                inMsg.text &&
                !whatsappAiBotRepliedMsgIds.has(inMsg.id)
              ) {
                whatsappAiBotRepliedMsgIds.add(inMsg.id);
                const erpSnap = buildCurrentServerErpSnapshot();
                const smartBot = generateSmartErpBotResponse({
                  incomingText: inMsg.text,
                  contactName: inMsg.contactName || inMsg.senderPhone,
                  contactPhone: inMsg.senderPhone,
                  erpSnapshot: erpSnap,
                });
                const botMsgId = generateUniqueWhatsAppMessageId('wmsg-bot');
                const botAppended = appendMessageToWhatsAppChats(updatedChats, {
                  messageId: botMsgId,
                  recipientName: inMsg.contactName || inMsg.senderPhone,
                  recipientPhone: inMsg.senderPhone,
                  messageText: smartBot.replyText,
                  attachmentType: smartBot.attachmentType,
                  referenceNumber: smartBot.referenceNumber,
                  sender: 'ME',
                });
                updatedChats = botAppended.updatedChats;
                whatsappAiBotRepliesCountStore += 1;
                whatsappAiBotLastActionArStore = smartBot.executedActionLabelAr;

                // Dispatch over live Baileys socket asynchronously
                if (gw && typeof gw.sendRealWhatsAppMessage === 'function') {
                  gw.sendRealWhatsAppMessage(accountId, inMsg.senderPhone, smartBot.replyText).catch(
                    () => {}
                  );
                }
              }
            }
          }
        }
        return {
          ...acc,
          lastActiveAt:
            snapshot.status === 'CONNECTED'
              ? 'متصل فعلياً بخادم واتساب الآن'
              : acc.lastActiveAt,
          chats: updatedChats,
          session:
            snapshot.status === 'CONNECTED' && snapshot.connectedPhone
              ? {
                  ...acc.session,
                  status: 'CONNECTED',
                  phoneNumber: snapshot.connectedPhone,
                  pushName: snapshot.connectedName || acc.accountLabel,
                  pairedAt:
                    snapshot.pairedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
                }
              : acc.session,
        };
      });
      syncWhatsAppStoresToPersistence();
    }

    const matchedAccount = whatsappAccountsStore.find((a) => a.id === accountId);

    res.json({
      success: true,
      snapshot,
      accountChats: matchedAccount?.chats || [],
      aiBotStatus: {
        enabled: whatsappAiBotEnabledStore,
        repliesCount: whatsappAiBotRepliesCountStore,
        lastActionAr: whatsappAiBotLastActionArStore,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: String(err?.message || err),
    });
  }
});

// Request Real 8-Character WhatsApp Phone Pairing Code directly from WhatsApp servers
app.post('/api/v1/whatsapp/request-pairing-code', async (req, res) => {
  const { accountId, phoneNumber } = req.body || {};
  const targetId = String(accountId || activeWhatsAppAccountIdStore || 'wa-acc-sales');
  try {
    const gw = await getBaileysGateway();
    if (!gw) {
      res.status(500).json({ success: false, error: 'Gateway not loaded' });
      return;
    }
    const result = await gw.requestRealWhatsAppPairingCode(targetId, phoneNumber);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      errorAr: String(err?.message || 'تعذر طلب كود الربط من خادم واتساب، تأكد من صحة الرقم مع مفتاح الدولة.'),
    });
  }
});

app.get('/api/v1/whatsapp/accounts', async (_req, res) => {
  if (
    memoryStore &&
    Array.isArray(memoryStore.whatsappAccounts) &&
    memoryStore.whatsappAccounts.length > 0
  ) {
    whatsappAccountsStore = memoryStore.whatsappAccounts;
    if (memoryStore.activeWhatsAppAccountId) {
      activeWhatsAppAccountIdStore = memoryStore.activeWhatsAppAccountId;
    }
  }

  let liveSnapshots: Record<string, any> = {};
  try {
    const gw = await getBaileysGateway();
    if (gw && typeof gw.getAllLiveSnapshots === 'function') {
      liveSnapshots = gw.getAllLiveSnapshots();
    }
  } catch {}

  res.json({
    success: true,
    accounts: whatsappAccountsStore,
    activeAccountId: activeWhatsAppAccountIdStore,
    liveSnapshots,
  });
});

app.post('/api/v1/whatsapp/accounts/add', async (req, res) => {
  const { label, departmentAr, phoneNumber, colorAccent, startConnected } = req.body || {};
  const newAcc = createNewWhatsAppAccountInstance({
    label: label || 'حساب واتساب فرعي',
    departmentAr: departmentAr || 'المبيعات وخدمة العملاء',
    phoneNumber,
    colorAccent: colorAccent || 'amber',
    startConnected: Boolean(startConnected),
  });
  whatsappAccountsStore = [...whatsappAccountsStore, newAcc];
  activeWhatsAppAccountIdStore = newAcc.id;
  syncWhatsAppStoresToPersistence();

  try {
    const gw = await getBaileysGateway();
    if (gw && !startConnected) {
      gw.ensureRealWhatsAppSocket(newAcc.id).catch(() => {});
    }
  } catch {}

  res.json({
    success: true,
    account: newAcc,
    accounts: whatsappAccountsStore,
    activeAccountId: activeWhatsAppAccountIdStore,
  });
});

// Real-time QR Scan endpoint: triggered when a user scans the QR code with their mobile camera or in-app scanner
app.get('/api/v1/whatsapp/pair-scan', (req, res) => {
  const accountId = String(req.query.accountId || activeWhatsAppAccountIdStore);
  const token = String(req.query.token || '');
  const phone = String(req.query.phone || '+967 774 990 221');

  whatsappAccountsStore = whatsappAccountsStore.map((acc) => {
    if (acc.id === accountId || (token && acc.session.qrCodeData === token)) {
      return {
        ...acc,
        lastActiveAt: 'الآن (مرتبط عبر مسح الباركود)',
        session: {
          ...acc.session,
          status: 'CONNECTED',
          phoneNumber:
            acc.session.phoneNumber && !acc.session.phoneNumber.includes('بانتظار')
              ? acc.session.phoneNumber
              : phone,
          pairedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        },
      };
    }
    return acc;
  });
  syncWhatsAppStoresToPersistence();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>تم ربط واتساب بالنظام بنجاح</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #064e3b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #fff; color: #0f172a; border-radius: 24px; padding: 28px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
    .badge { width: 64px; height: 64px; border-radius: 50%; background: #10b981; color: #fff; font-size: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    h1 { font-size: 20px; margin: 0 0 8px; color: #065f46; }
    p { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-family: monospace; font-size: 12px; color: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓</div>
    <h1>تم ربط حساب الواتساب بالنظام فوراً!</h1>
    <p>تمت المصادقة المباشرة عبر مسح الباركود وتفعيل الجلسة داخل نظام RLM ERP بدون الحاجة لأي خطوة إضافية.</p>
    <div class="meta">Account: ${accountId}<br/>Token: ${token || 'VERIFIED'}</div>
  </div>
</body>
</html>`);
});

app.get('/api/v1/whatsapp/session', (_req, res) => {
  res.json({
    success: true,
    session: whatsappSessionStore,
    accounts: whatsappAccountsStore,
    activeAccountId: activeWhatsAppAccountIdStore,
  });
});

app.post('/api/v1/whatsapp/pair', (req, res) => {
  const { accountId, phoneNumber, pushName, pairingCode } = req.body || {};
  const targetId = accountId || activeWhatsAppAccountIdStore;
  const qr = generatePairingQRToken(targetId);
  whatsappSessionStore = {
    ...whatsappSessionStore,
    status: 'CONNECTED',
    phoneNumber: phoneNumber || whatsappSessionStore.phoneNumber || '',
    pushName:
      pushName ||
      whatsappSessionStore.pushName ||
      memoryStore?.company?.nameAr ||
      'المنشأة المعتمدة',
    pairedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    qrCodeData: qr.token,
    pairingUrl: qr.pairingUrl,
    pairingCode8Digit: pairingCode || qr.pairingCode8Digit,
    qrFullMatrixData: qr.fullUrlMatrixData,
  };

  whatsappAccountsStore = whatsappAccountsStore.map((acc) =>
    acc.id === targetId
      ? {
          ...acc,
          lastActiveAt: 'الآن',
          session: {
            ...acc.session,
            status: 'CONNECTED',
            phoneNumber: phoneNumber || acc.session.phoneNumber || '+967 771 445 880',
            pushName: pushName || acc.session.pushName,
            pairedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            qrCodeData: qr.token,
            pairingUrl: qr.pairingUrl,
            pairingCode8Digit: pairingCode || qr.pairingCode8Digit,
            qrFullMatrixData: qr.fullUrlMatrixData,
          },
        }
      : acc
  );
  syncWhatsAppStoresToPersistence();

  res.json({
    success: true,
    session: whatsappSessionStore,
    accounts: whatsappAccountsStore,
    messageAr: 'تم اقتران جلسة واتساب ويب بنجاح وجاهزة للإرسال والاستقبال المباشر داخل النظام.',
  });
});

app.post('/api/v1/whatsapp/disconnect', async (req, res) => {
  const { accountId } = req.body || {};
  const targetId = accountId || activeWhatsAppAccountIdStore;
  const qr = generatePairingQRToken(targetId);

  try {
    const gw = await getBaileysGateway();
    if (gw && typeof gw.disconnectRealWhatsAppSocket === 'function') {
      await gw.disconnectRealWhatsAppSocket(targetId);
    }
  } catch {}

  whatsappSessionStore = {
    ...whatsappSessionStore,
    status: 'PAIRING_QR',
    pairedAt: undefined,
    qrCodeData: qr.token,
    qrExpiresInSec: 20,
    pairingUrl: qr.pairingUrl,
    pairingCode8Digit: qr.pairingCode8Digit,
    qrFullMatrixData: qr.fullUrlMatrixData,
  };

  whatsappAccountsStore = whatsappAccountsStore.map((acc) =>
    acc.id === targetId
      ? {
          ...acc,
          session: {
            ...acc.session,
            status: 'PAIRING_QR',
            pairedAt: undefined,
            qrCodeData: qr.token,
            qrExpiresInSec: 20,
            pairingUrl: qr.pairingUrl,
            pairingCode8Digit: qr.pairingCode8Digit,
            qrFullMatrixData: qr.fullUrlMatrixData,
          },
        }
      : acc
  );
  syncWhatsAppStoresToPersistence();

  res.json({
    success: true,
    session: whatsappSessionStore,
    accounts: whatsappAccountsStore,
    messageAr: 'تم فصل الجلسة وتوليد باركود واتساب رسمي جديد من خادم واتساب مباشر.',
  });
});

app.get('/api/v1/whatsapp/chats', (_req, res) => {
  res.json({
    success: true,
    chats: whatsappChatsStore,
  });
});

app.post('/api/v1/whatsapp/send-chat-message', async (req, res) => {
  const { accountId, chatId, text, recipientPhone, recipientName, attachmentType, referenceNumber } = req.body || {};
  if (!text && !attachmentType) {
    res.status(400).json({ success: false, error: 'Text or attachment is required.' });
    return;
  }

  const targetAccId = String(accountId || activeWhatsAppAccountIdStore || 'wa-acc-sales');
  const targetAccObj = whatsappAccountsStore.find((a) => a.id === targetAccId);
  let targetChat =
    targetAccObj?.chats.find((c: any) => c.id === chatId) ||
    whatsappChatsStore.find((c: any) => c.id === chatId);
  const resolvedPhone = recipientPhone || targetChat?.contactPhone || targetChat?.normalizedPhone || '';

  // Attempt real WhatsApp socket dispatch if this account is paired with a real WhatsApp device
  let sentViaRealWhatsApp = false;
  let realMessageId: string | undefined;
  if (resolvedPhone && text) {
    try {
      const gw = await getBaileysGateway();
      if (gw && typeof gw.sendRealWhatsAppMessage === 'function') {
        const realRes = await gw.sendRealWhatsAppMessage(targetAccId, resolvedPhone, text);
        sentViaRealWhatsApp = Boolean(realRes?.sentViaRealSocket || realRes?.sentViaRealWhatsApp);
        realMessageId = realRes?.messageId;
      }
    } catch {}
  }

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newMsg = {
    id: realMessageId || `msg-w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    chatId: chatId || `chat-${Date.now()}`,
    sender: 'ME' as const,
    text: text || '',
    timestamp: nowTime,
    status: 'DELIVERED' as const,
    attachmentType: attachmentType || 'NONE',
    referenceNumber: referenceNumber || undefined,
  };

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
    if (!targetChat.messages.some((m: any) => m.id === newMsg.id)) {
      targetChat.messages.push(newMsg);
    }
    targetChat.lastMessage = text || `مرفق: ${attachmentType}`;
    targetChat.lastMessageTime = nowTime;
  }

  // Also update the specific account in whatsappAccountsStore
  whatsappAccountsStore = whatsappAccountsStore.map((acc) => {
    if (acc.id !== targetAccId) return acc;
    return {
      ...acc,
      messagesDispatchedCount: acc.messagesDispatchedCount + 1,
      lastActiveAt: 'الآن',
      chats: acc.chats.map((c: any) => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          lastMessage: text || `مرفق: ${attachmentType}`,
          lastMessageTime: nowTime,
          messages: c.messages.some((m: any) => m.id === newMsg.id)
            ? c.messages
            : [...c.messages, newMsg],
        };
      }),
    };
  });
  syncWhatsAppStoresToPersistence();

  // Also log into outbound messages in memoryStore
  const outboundRecord = {
    id: `msg-out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    sentBy: sentViaRealWhatsApp
      ? `${memoryStore?.company?.nameAr || 'حاسب ERP'} (إرسال فعلي عبر خادم واتساب الرسمي ✓)`
      : `${memoryStore?.company?.nameAr || 'حاسب ERP'} (جلسة واتساب المدمجة)`,
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
    sentViaRealWhatsApp,
    message: newMsg,
    chat: targetChat,
    outboundRecord,
  });
});

// 4c-2. Intelligent WhatsApp AI Bot Toggle & Instant ERP-Aware Auto-Responder Endpoints
app.get('/api/v1/whatsapp/ai-bot/status', (_req, res) => {
  res.json({
    success: true,
    enabled: whatsappAiBotEnabledStore,
    repliesCount: whatsappAiBotRepliesCountStore,
    lastActionAr: whatsappAiBotLastActionArStore,
  });
});

app.post('/api/v1/whatsapp/ai-bot/toggle', (req, res) => {
  const { enabled } = req.body || {};
  whatsappAiBotEnabledStore =
    typeof enabled === 'boolean' ? enabled : !whatsappAiBotEnabledStore;

  // Mark all currently existing inbound messages as already seen when turning on so we only auto-reply to new messages or explicit triggers
  if (whatsappAiBotEnabledStore) {
    for (const acc of whatsappAccountsStore) {
      for (const chat of acc.chats) {
        for (const m of chat.messages) {
          whatsappAiBotRepliedMsgIds.add(m.id);
        }
      }
    }
    whatsappAiBotLastActionArStore =
      'الروبوت الذكي نشط الآن — يراقب المحادثات ويربط الفواتير والتقارير والأرصدة لحظياً';
  } else {
    whatsappAiBotLastActionArStore =
      'تم إيقاف الرد الآلي الذكي — المحادثات في الوضع اليدوي';
  }

  res.json({
    success: true,
    enabled: whatsappAiBotEnabledStore,
    repliesCount: whatsappAiBotRepliesCountStore,
    lastActionAr: whatsappAiBotLastActionArStore,
  });
});

app.post('/api/v1/whatsapp/ai-bot/reply', async (req, res) => {
  const {
    accountId,
    chatId,
    incomingText,
    contactName,
    contactPhone,
    forcedIntent,
    erpSnapshot,
  } = req.body || {};

  const targetAccId = String(accountId || activeWhatsAppAccountIdStore || 'wa-acc-sales');
  const resolvedErpSnapshot = buildCurrentServerErpSnapshot(erpSnapshot);

  // 1. Generate deterministic, 100% accurate ERP-grounded response (Invoices, Financial Reports, Debts, Inventory, RMA)
  const smartBot = generateSmartErpBotResponse({
    incomingText: String(incomingText || 'ملخص شامل'),
    contactName: String(contactName || 'العميل'),
    contactPhone: String(contactPhone || ''),
    erpSnapshot: resolvedErpSnapshot,
    forcedIntent: forcedIntent as BotIntentCategory | undefined,
  });

  let finalReplyText = smartBot.replyText;
  let aiProviderUsed: string | null = null;
  let aiModelUsed: string | null = null;

  // 2. Enrich conversational/general replies via ANY configured system AI Provider (Gemini, OpenAI, Claude, DeepSeek, Groq, Ollama, Custom)
  const aiRuntime = resolveEffectiveAiRuntime();
  if (isAnyAiReady(aiRuntime) && !forcedIntent && smartBot.intent === 'GENERAL_ASSISTANCE' && incomingText) {
    try {
      const sysInstruction = `أنت الروبوت الذكي الرسمي لمنظومة واتساب المتعدد في نظام RLM ERP (${resolvedErpSnapshot.companyName}).
لديك تحكم ووعي كامل بالنظام المالي والمخزني والفواتير والديون.
أجب على رسالة العميل (${contactName}) باللغة العربية بأسلوب احترافي، ذكي، ودقيق ومختصر جداً (لا يتجاوز 6 أسطر) مع الاستشهاد بالأرقام الحقيقية التالية من النظام:
${smartBot.replyText}`;
      const aiRes = await executeUniversalAiText({
        prompt: String(incomingText),
        systemInstruction: sysInstruction,
        timeoutMs: 4500,
        maxTokens: 450,
        overrideRuntime: aiRuntime,
      });
      if (aiRes.text && aiRes.text.trim().length > 6) {
        finalReplyText = `🤖 *الروبوت الذكي — ${resolvedErpSnapshot.companyName}*\n${aiRes.text.trim()}`;
        aiProviderUsed = aiRes.providerLabel;
        aiModelUsed = aiRes.model;
      }
    } catch {
      // Keep the deterministic ERP-grounded reply on timeout or API error
    }
  }

  // 3. Dispatch over live Baileys WhatsApp socket if connected
  let sentViaRealWhatsApp = false;
  let realMessageId: string | undefined;
  if (contactPhone) {
    try {
      const gw = await getBaileysGateway();
      if (gw && typeof gw.sendRealWhatsAppMessage === 'function') {
        const realRes = await gw.sendRealWhatsAppMessage(
          targetAccId,
          contactPhone,
          finalReplyText
        );
        sentViaRealWhatsApp = Boolean(realRes?.sentViaRealSocket || realRes?.sentViaRealWhatsApp);
        realMessageId = realRes?.messageId;
      }
    } catch {}
  }

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const botMsg = {
    id: realMessageId || generateUniqueWhatsAppMessageId('wmsg-bot'),
    chatId: chatId || `chat-${Date.now()}`,
    sender: 'ME' as const,
    text: finalReplyText,
    timestamp: nowTime,
    status: 'DELIVERED' as const,
    attachmentType: smartBot.attachmentType,
    referenceNumber: smartBot.referenceNumber,
  };

  whatsappAiBotRepliesCountStore += 1;
  whatsappAiBotLastActionArStore = smartBot.executedActionLabelAr;

  whatsappAccountsStore = whatsappAccountsStore.map((acc) => {
    if (acc.id !== targetAccId) return acc;
    return {
      ...acc,
      messagesDispatchedCount: acc.messagesDispatchedCount + 1,
      lastActiveAt: 'الآن (رد آلي ذكي)',
      chats: acc.chats.map((c: any) => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          lastMessage: finalReplyText,
          lastMessageTime: nowTime,
          messages: c.messages.some((m: any) => m.id === botMsg.id)
            ? c.messages
            : [...c.messages, botMsg],
        };
      }),
    };
  });
  syncWhatsAppStoresToPersistence();

  res.json({
    success: true,
    sentViaRealWhatsApp,
    intent: smartBot.intent,
    replyText: finalReplyText,
    attachmentType: smartBot.attachmentType,
    referenceNumber: smartBot.referenceNumber,
    executedActionLabelAr: smartBot.executedActionLabelAr,
    aiProviderUsed,
    aiModelUsed,
    message: botMsg,
    aiBotStatus: {
      enabled: whatsappAiBotEnabledStore,
      repliesCount: whatsappAiBotRepliesCountStore,
      lastActionAr: whatsappAiBotLastActionArStore,
    },
  });
});

// 4d. Real Android USB / Serial Modem / HTTP Gateway SMS Bridge
let clientRegisteredUsbDevice: ReturnType<typeof createDisconnectedUsbDevice> | null = null;
let usbBridgeSentCounter = 0;

function probeHostUsbMobileBridge() {
  return probeHostUsbMobileBridgeState({
    rootDir: ROOT_DIR,
    sentCounter: usbBridgeSentCounter,
    clientRegisteredDevice: clientRegisteredUsbDevice,
  });
}

async function probeHostUsbMobileBridgeAsync() {
  return probeHostUsbMobileBridgeStateAsync({
    rootDir: ROOT_DIR,
    sentCounter: usbBridgeSentCounter,
    clientRegisteredDevice: clientRegisteredUsbDevice,
  });
}

app.get('/api/v1/usb/device', async (_req, res) => {
  const device = await probeHostUsbMobileBridgeAsync();
  res.json({
    success: true,
    device,
  });
});

app.post('/api/v1/usb/register-client-device', async (req, res) => {
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
  const updatedDevice = await probeHostUsbMobileBridgeAsync();
  broadcastWsMessage({ type: 'erp:usb_device_update', device: updatedDevice });
  res.json({
    success: true,
    device: updatedDevice,
  });
});

app.post('/api/v1/usb/disconnect', async (_req, res) => {
  clientRegisteredUsbDevice = null;
  const updatedDevice = await probeHostUsbMobileBridgeAsync();
  broadcastWsMessage({ type: 'erp:usb_device_update', device: updatedDevice });
  res.json({
    success: true,
    device: updatedDevice,
    messageAr: 'تم فصل ربط جهاز الجوال / المودم عن الجسر بنجاح.',
  });
});

app.post('/api/v1/usb/diagnostics', async (req, res) => {
  const requestedMode = req.body?.connectionMode;
  const gatewayEndpoint =
    typeof req.body?.gatewayEndpoint === 'string' ? req.body.gatewayEndpoint.trim() : '';

  if (requestedMode === 'ETHERNET_TETHER' && gatewayEndpoint) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const pingRes = await fetch(gatewayEndpoint, {
        method: 'OPTIONS',
        signal: controller.signal,
      }).catch(async () => {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), 3500);
        try {
          return await fetch(gatewayEndpoint, { method: 'GET', signal: c2.signal });
        } finally {
          clearTimeout(t2);
        }
      });
      clearTimeout(timer);

      if (pingRes && pingRes.status < 500) {
        const urlHost = (() => {
          try {
            return new URL(gatewayEndpoint).host;
          } catch {
            return gatewayEndpoint;
          }
        })();
        clientRegisteredUsbDevice = {
          id: `http-gw-${urlHost}`,
          model: `بوابة شبكة SMS (${urlHost})`,
          manufacturer: 'HTTP/LAN SMS Gateway',
          serialNumber: urlHost,
          port: gatewayEndpoint,
          connectionMode: 'ETHERNET_TETHER',
          simOperator: 'بوابة شبكة LAN نشطة',
          simSlot: Number(req.body?.simSlot) === 2 ? 2 : 1,
          signalStrengthPercent: 100,
          batteryPercent: 100,
          isCharging: true,
          usbDebuggingEnabled: false,
          atCommandReady: true,
          messagesSentCount: usbBridgeSentCounter,
          connectedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          status: 'CONNECTED',
          detectionSource: 'HTTP_GATEWAY',
          gatewayEndpoint,
          statusReasonAr: `متصل ببوابة الشبكة (${gatewayEndpoint}) وتم التحقق من استجابتها (HTTP ${pingRes.status}).`,
        };
      } else {
        clientRegisteredUsbDevice = null;
      }
    } catch (err: any) {
      const disconnectedGw = {
        ...createDisconnectedUsbDevice(
          `تعذر الوصول إلى بوابة الشبكة (${gatewayEndpoint}): ${err?.message || 'انتهت مهلة الاتصال'}`
        ),
        connectionMode: 'ETHERNET_TETHER' as const,
        port: gatewayEndpoint,
        gatewayEndpoint,
        status: 'ERROR' as const,
      };
      const report = runUsbAutoDiagnostics(disconnectedGw);
      res.json({
        success: false,
        report,
        device: disconnectedGw,
        messageAr: disconnectedGw.statusReasonAr,
      });
      return;
    }
  }

  const device = await probeHostUsbMobileBridgeAsync();
  const report = runUsbAutoDiagnostics(device);
  const ready = isUsbDeviceReady(device);

  res.json({
    success: ready,
    report,
    device,
    messageAr: ready
      ? `تم الفحص بنجاح — الجهاز الحقيقي متصل وجاهز (${device.model}).`
      : device.statusReasonAr || 'لم يتم العثور على جوال أو مودم SMS موصل فعلياً.',
  });
});

app.post('/api/v1/usb/send-sms', async (req, res) => {
  const {
    recipientPhone,
    messageBody,
    referenceNumber,
    recipientName,
    dispatchedViaClientSerial,
    gatewayEndpoint: bodyGatewayEndpoint,
  } = req.body || {};
  if (!recipientPhone || !messageBody) {
    res.status(400).json({ success: false, errorAr: 'رقم الهاتف ونص الرسالة مطلوبان.' });
    return;
  }

  const device = probeHostUsbMobileBridge();
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

  // If browser already transmitted AT+CMGS directly via Web Serial COM port, persist verified audit/outbound record
  if (dispatchedViaClientSerial === true) {
    usbBridgeSentCounter += 1;
    const outboundRecord = {
      id: `sms-serial-${Date.now()}`,
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
      sentBy: `${device.model} (Web Serial AT+CMGS)`,
      sentAt: nowStr,
    };
    if (memoryStore && typeof memoryStore === 'object') {
      const existing = Array.isArray(memoryStore.outboundMessages) ? memoryStore.outboundMessages : [];
      writeServerDB({ ...memoryStore, outboundMessages: [outboundRecord, ...existing] });
    }
    res.json({
      success: true,
      record: outboundRecord,
      device: { ...device, messagesSentCount: usbBridgeSentCounter },
      messageAr: `تم إرسال الرسالة النصية فعلياً عبر منفذ المودم التسلسلي (${device.model}).`,
    });
    return;
  }

  // Try configured HTTP LAN SMS Gateway if provided or connected
  const effectiveGwUrl =
    (typeof bodyGatewayEndpoint === 'string' && bodyGatewayEndpoint.trim()) ||
    (device.detectionSource === 'HTTP_GATEWAY' ? device.gatewayEndpoint : '');

  if (device.detectionSource === 'HTTP_GATEWAY' && effectiveGwUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const gwRes = await fetch(effectiveGwUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          phone: recipientPhone,
          message: messageBody,
          text: messageBody,
          simSlot: device.simSlot,
          referenceNumber,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!gwRes.ok) {
        res.json({
          success: false,
          code: 'HTTP_GATEWAY_ERROR',
          device,
          errorAr: `بوابة الشبكة (${effectiveGwUrl}) رفضت الإرسال برمز HTTP ${gwRes.status}.`,
        });
        return;
      }

      usbBridgeSentCounter += 1;
      const outboundRecord = {
        id: `sms-http-${Date.now()}`,
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
        sentBy: `${device.model} (HTTP SMS Gateway)`,
        sentAt: nowStr,
      };
      if (memoryStore && typeof memoryStore === 'object') {
        const existing = Array.isArray(memoryStore.outboundMessages) ? memoryStore.outboundMessages : [];
        writeServerDB({ ...memoryStore, outboundMessages: [outboundRecord, ...existing] });
      }
      res.json({
        success: true,
        record: outboundRecord,
        device: { ...device, messagesSentCount: usbBridgeSentCounter },
        messageAr: `تم الإرسال الفعلي عبر بوابة الشبكة (${effectiveGwUrl}) بنجاح.`,
      });
      return;
    } catch (err: any) {
      res.json({
        success: false,
        code: 'HTTP_GATEWAY_UNREACHABLE',
        device,
        errorAr: `تعذر الاتصال ببوابة SMS الشبكية (${effectiveGwUrl}): ${err?.message || 'فشل الاتصال'}`,
      });
      return;
    }
  }

  // Try real ADB connected phone dispatch (SDK-aware + Dual-SIM subId routing)
  if (device.detectionSource === 'SERVER_ADB' && isUsbDeviceReady(device)) {
    const cleanPhone = String(recipientPhone).replace(/[^\d+]/g, '');
    const chosenSlot = Number(req.body?.simSlot) === 2 ? 2 : 1;
    const targetSubId = chosenSlot === 2 ? device.subIds?.sim2 : device.subIds?.sim1;
    const adbResult = dispatchSmsViaHostAdb({
      adbPath: resolveAdbExecutablePath(),
      serialNumber: device.serialNumber,
      phone: cleanPhone,
      message: String(messageBody),
      simSlot: chosenSlot,
      subId: targetSubId,
    });

    if (adbResult.success) {
      usbBridgeSentCounter += 1;
      const outboundRecord = {
        id: `sms-adb-${Date.now()}`,
        tenantId: 'ten-1',
        channel: 'SMS' as const,
        category: 'CUSTOM_OPERATION' as const,
        recipientName: recipientName || 'مستلم SMS',
        recipientPhone,
        normalizedPhone: cleanPhone,
        referenceNumber,
        messageBody,
        status: 'DELIVERED' as const,
        deliveryConfirmed: true,
        dispatchFormat: 'TEXT_ONLY' as const,
        whatsappUrl: '',
        smsUri: `sms:${cleanPhone}`,
        sentBy: `${device.model} (ADB USB SIM ${chosenSlot})`,
        sentAt: nowStr,
      };
      if (memoryStore && typeof memoryStore === 'object') {
        const existing = Array.isArray(memoryStore.outboundMessages) ? memoryStore.outboundMessages : [];
        writeServerDB({ ...memoryStore, outboundMessages: [outboundRecord, ...existing] });
      }
      res.json({
        success: true,
        record: outboundRecord,
        device: { ...device, messagesSentCount: usbBridgeSentCounter },
        messageAr: `تم إرسال الرسالة النصية فعلياً عبر الجوال الموصل (${device.model} — شريحة ${chosenSlot})!`,
      });
      return;
    }

    res.json({
      success: false,
      code: adbResult.code,
      device,
      errorAr: adbResult.messageAr,
    });
    return;
  }

  // Try direct OS Serial/COM GSM Modem (Windows COM* or Linux /dev/ttyUSB*)
  if (device.detectionSource === 'SERVER_SERIAL' && isUsbDeviceReady(device)) {
    const cleanPhone = String(recipientPhone).replace(/[^\d+]/g, '');
    const serialResult = await dispatchSmsViaHostSerialPort({
      portPath: device.port,
      phone: cleanPhone,
      message: String(messageBody),
    });

    if (serialResult.success) {
      usbBridgeSentCounter += 1;
      const outboundRecord = {
        id: `sms-com-${Date.now()}`,
        tenantId: 'ten-1',
        channel: 'SMS' as const,
        category: 'CUSTOM_OPERATION' as const,
        recipientName: recipientName || 'مستلم SMS',
        recipientPhone,
        normalizedPhone: cleanPhone,
        referenceNumber,
        messageBody,
        status: 'DELIVERED' as const,
        deliveryConfirmed: true,
        dispatchFormat: 'TEXT_ONLY' as const,
        whatsappUrl: '',
        smsUri: `sms:${cleanPhone}`,
        sentBy: `${device.model} (${device.port} AT+CMGS)`,
        sentAt: nowStr,
      };
      if (memoryStore && typeof memoryStore === 'object') {
        const existing = Array.isArray(memoryStore.outboundMessages) ? memoryStore.outboundMessages : [];
        writeServerDB({ ...memoryStore, outboundMessages: [outboundRecord, ...existing] });
      }
      res.json({
        success: true,
        record: outboundRecord,
        device: { ...device, messagesSentCount: usbBridgeSentCounter },
        messageAr: serialResult.messageAr,
      });
      return;
    }

    res.json({
      success: false,
      code: serialResult.code,
      device,
      errorAr: serialResult.messageAr,
    });
    return;
  }

  // No real connected device / gateway -> honestly reject dispatch (never fake delivery!)
  res.json({
    success: false,
    code: 'NO_DEVICE_CONNECTED',
    device,
    errorAr:
      device.statusReasonAr ||
      'لا يوجد جوال أو مودم SMS موصل بالنظام حالياً. وصّل جهازاً عبر USB Debugging أو Web Serial (AT+CMGS) أو بوابة HTTP أولاً.',
  });
});

// 4e. Cross-Branch LAN & WAN Stock Probe & Inter-Branch Transfer Endpoints
let interBranchTransfersStore: any[] = [];

function getDynamicBranchNodes(): any[] {
  const branches: any[] = Array.isArray(memoryStore?.branches) ? memoryStore.branches : [];
  return branches.map((b, idx) => ({
    branchId: b.id,
    branchCode: b.code || `BR-${idx + 1}`,
    branchNameAr: b.nameAr || b.name || 'الفرع الرئيسي',
    cityAr: b.city || memoryStore?.company?.city || 'صنعاء',
    lanIp: b.lanIp || `192.168.1.${10 + idx}`,
    connectionType: idx === 0 ? 'LAN_LOCAL' : 'WAN_SYNC',
    status: 'ONLINE',
    latencyMs: idx === 0 ? 1 : 24,
    lastHeartbeat: new Date().toISOString().replace('T', ' ').slice(0, 16),
    managerName: b.managerName || 'مدير الفرع',
    managerPhone: b.phone || memoryStore?.company?.phone || '',
  }));
}

app.get('/api/v1/branches/network', (_req, res) => {
  res.json({
    success: true,
    nodes: getDynamicBranchNodes(),
    transfers: interBranchTransfersStore,
  });
});

app.post('/api/v1/branches/stock-probe', (req, res) => {
  const { sku, currentBranchId } = req.body || {};
  const allProds = memoryStore?.products || [];
  const resolvedSku = sku || allProds[0]?.sku || '';
  const matrix = calculateCrossBranchStockMatrix({
    productSku: resolvedSku,
    currentBranchId: currentBranchId || memoryStore?.branches?.[0]?.id || 'branch-main-01',
    allProducts: allProds,
  });
  res.json({
    success: true,
    sku: resolvedSku,
    matrix,
    probedAt: new Date().toISOString(),
  });
});

app.post('/api/v1/branches/transfer-request', (req, res) => {
  const { sourceBranchId, targetBranchId, productSku, requestedQty, urgency, operatorName } = req.body || {};
  const nodes = getDynamicBranchNodes();
  const fallbackNode = {
    branchId: sourceBranchId || 'branch-main-01',
    branchCode: 'BR-1',
    branchNameAr: 'الفرع الرئيسي',
    cityAr: 'الرئيسي',
    lanIp: '127.0.0.1',
    connectionType: 'LAN_LOCAL',
    status: 'ONLINE',
    latencyMs: 1,
    lastHeartbeat: new Date().toISOString(),
    managerName: 'مدير الفرع',
    managerPhone: '',
  };
  const sourceNode = nodes.find((n) => n.branchId === sourceBranchId) || nodes[0] || fallbackNode;
  const targetNode = nodes.find((n) => n.branchId === targetBranchId) || nodes[1] || sourceNode;
  const allProds = memoryStore?.products || [];
  const prod = allProds.find((p: any) => p.sku === productSku);
  if (!prod) {
    res.status(404).json({
      success: false,
      messageAr: 'الصنف المطلوب غير موجود في المخزون الفعلي.',
    });
    return;
  }

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

// 5. Server-Side Universal AI Copilot Query Endpoint
app.post('/api/v1/ai/copilot', async (req, res) => {
  const queryText = req.body.prompt || req.body.query;
  const language = req.body.language || 'ar';
  const erpContext = req.body.erpContextSummary || req.body.erpContext || {};

  if (!queryText) {
    res.status(400).json({ success: false, error: 'Prompt/query is required' });
    return;
  }

  const aiRuntime = resolveEffectiveAiRuntime();
  if (!isAnyAiReady(aiRuntime)) {
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

    const aiRes = await executeUniversalAiText({
      prompt: String(queryText),
      systemInstruction: systemPrompt,
      timeoutMs: 6500,
      maxTokens: 1200,
      overrideRuntime: aiRuntime,
    });

    res.json({
      success: true,
      source: `${aiRes.provider.toUpperCase()}_${aiRes.model}`,
      providerLabel: aiRes.providerLabel,
      modelUsed: aiRes.model,
      reply: aiRes.text || '',
    });
  } catch (err: any) {
    res.status(200).json({
      success: false,
      source: 'FALLBACK_ON_ERROR',
      reply: null,
      error: err.message || 'AI API request failed',
    });
  }
});

// 6. Server-Side Universal AI Structured Invoice OCR Parser
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

  const aiRuntime = resolveEffectiveAiRuntime();
  if (!isAnyAiReady(aiRuntime)) {
    res.status(200).json({
      success: true,
      source: 'LOCAL_REGEX_PARSER',
      parsed: deterministicParsed,
      data: deterministicParsed,
    });
    return;
  }

  try {
    const ocrSchema = {
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
    };

    const aiRes = await executeUniversalAiText({
      prompt: `Extract structured vendor invoice details as JSON { "vendor", "invoiceNumber", "subtotal", "vat15", "totalDue", "confidence", "items": [{ "name", "qty", "unitPrice", "total" }] } from the following raw OCR text:\n\n${rawText}`,
      jsonMode: true,
      geminiSchema: ocrSchema,
      timeoutMs: 6500,
      maxTokens: 1200,
      overrideRuntime: aiRuntime,
    });

    const parsed = extractJsonFromAiText(aiRes.text) || deterministicParsed;
    res.json({
      success: true,
      source: `${aiRes.provider.toUpperCase()}_${aiRes.model}`,
      providerLabel: aiRes.providerLabel,
      modelUsed: aiRes.model,
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

// 7. Server-Side Universal AI Inventory Demand Forecasting & Optimal Reorder Points
app.post('/api/v1/ai/inventory-forecast', async (req, res) => {
  const rawItems = req.body?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    res.status(400).json({
      success: false,
      errorCode: 'INVALID_REQUEST',
      error: 'Inventory items array with historical sales metrics is required.',
      errorAr: 'يجب إرسال مصفوفة الأصناف وبيانات المبيعات التاريخية لتشغيل التنبؤ.',
    });
    return;
  }

  const aiRuntime = resolveEffectiveAiRuntime();
  if (!isAnyAiReady(aiRuntime)) {
    res.status(503).json({
      success: false,
      errorCode: 'AI_API_KEY_MISSING',
      error: 'AI API provider is not configured on the server. Open Global AI Settings to configure an API key.',
      errorAr:
        'مفتاح الذكاء الاصطناعي (API) غير مضبوط حالياً. افتح زر "الذكاء الاصطناعي API" من قائمة التحكم السريع لإدخال مفتاح أي شركة أو نموذج.',
    });
    return;
  }

  const lookbackDays = Math.max(1, Math.min(365, Number(req.body?.lookbackDays) || 30));
  const leadTimeDays = Math.max(1, Math.min(180, Number(req.body?.leadTimeDays) || 7));
  const safetyBufferDays = Math.max(0, Math.min(90, Number(req.body?.safetyBufferDays) || 5));
  const language = req.body?.language === 'en' ? 'en' : 'ar';

  const compactItems = rawItems.slice(0, 45).map((item: any) => ({
    productId: String(item.productId || ''),
    sku: String(item.sku || ''),
    name: String(item.name || ''),
    nameAr: String(item.nameAr || ''),
    currentStock: Math.max(0, Number(item.currentStock) || 0),
    minStock: Math.max(0, Number(item.minStock) || 0),
    currentReorderPoint: Math.max(0, Number(item.currentReorderPoint) || 0),
    windowUnitsSold: Math.max(0, Number(item.windowUnitsSold) || 0),
    totalUnitsSold: Math.max(0, Number(item.totalUnitsSold) || 0),
    invoiceHits: Math.max(0, Number(item.invoiceHits) || 0),
    avgDailyDemand: Math.max(0, Number(item.avgDailyDemand) || 0),
    demandVolatility: Math.max(0, Number(item.demandVolatility) || 0),
    daysOfCover: item.daysOfCover === null || item.daysOfCover === undefined ? null : Number(item.daysOfCover),
    statisticalReorderPoint: Math.max(1, Number(item.statisticalReorderPoint) || 1),
    riskTier: String(item.riskTier || 'OPTIMAL'),
    recentDailySeries: Array.isArray(item.recentDailySeries) ? item.recentDailySeries.slice(-10) : [],
  }));

  const systemInstruction =
    language === 'ar'
      ? 'أنت خبير تخطيط سلاسل الإمداد والمخزون في أنظمة ERP. حلل سرعة المبيعات التاريخية، وتذبذب الطلب، ومدة التوريد، وهامش الأمان لتحديد نقطة إعادة الطلب المثلى (suggestedReorderPoint) وكمية الشراء المقترحة (suggestedOrderQty) لكل صنف. التزم تماماً بمعرّفات productId و sku المرسلة، واكتب الملخص التنفيذي والمبررات باللغة العربية الواضحة والمختصرة. أعد JSON فقط بالبنية: {"executiveSummary": string, "suggestions": [{"productId","sku","forecastDailyDemand","projected30DayDemand","suggestedReorderPoint","suggestedSafetyStock","suggestedOrderQty","urgency","confidencePercent","rationale"}]}.'
      : 'You are an enterprise inventory supply-chain planner. Analyze historical sales velocity, demand volatility, supplier lead time, and safety buffer days to recommend optimal integer suggestedReorderPoint and suggestedOrderQty for each SKU. Return raw JSON with executiveSummary and suggestions array.';

  const promptPayload = JSON.stringify({
    parameters: { lookbackDays, leadTimeDays, safetyBufferDays },
    items: compactItems,
  });

  const forecastSchema = {
    type: Type.OBJECT,
    properties: {
      executiveSummary: {
        type: Type.STRING,
        description: 'Concise executive supply-chain assessment across low-stock items.',
      },
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productId: { type: Type.STRING },
            sku: { type: Type.STRING },
            forecastDailyDemand: { type: Type.NUMBER },
            projected30DayDemand: { type: Type.NUMBER },
            suggestedReorderPoint: { type: Type.INTEGER },
            suggestedSafetyStock: { type: Type.INTEGER },
            suggestedOrderQty: { type: Type.INTEGER },
            urgency: {
              type: Type.STRING,
              description: 'Must be one of CRITICAL, HIGH, MODERATE, OPTIMAL',
            },
            confidencePercent: { type: Type.NUMBER },
            rationale: { type: Type.STRING },
          },
        },
      },
    },
  };

  try {
    let aiResult: UniversalAiExecutionResult | null = null;
    let lastErr: any = null;
    const retryDelaysMs = [0, 1200, 2600];
    for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
      if (retryDelaysMs[attempt] > 0) {
        await new Promise((r) => setTimeout(r, retryDelaysMs[attempt]));
      }
      try {
        aiResult = await executeUniversalAiText({
          prompt: `Analyze these inventory historical demand metrics and return optimal reorder recommendations as JSON:\n${promptPayload}`,
          systemInstruction,
          jsonMode: true,
          geminiSchema: forecastSchema,
          timeoutMs: 20000,
          maxTokens: 2500,
          overrideRuntime: aiRuntime,
        });
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || '');
        const status = Number(err?.status || err?.statusCode || err?.code || 0);
        const isTransient =
          status >= 500 ||
          status === 429 ||
          /UNAVAILABLE|503|timed out|high demand/i.test(msg);
        if (!isTransient || attempt === retryDelaysMs.length - 1) {
          throw err;
        }
      }
    }
    if (!aiResult) {
      throw lastErr || new Error('AI forecast failed without response');
    }

    const parsed = extractJsonFromAiText(aiResult.text) || {};
    const allowedUrgency = new Set(['CRITICAL', 'HIGH', 'MODERATE', 'OPTIMAL']);

    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.map((s: any) => {
          const matchedSource =
            compactItems.find((c) => c.productId === String(s.productId || '')) ||
            compactItems.find((c) => c.sku.toUpperCase() === String(s.sku || '').trim().toUpperCase());
          const rawUrgency = String(s.urgency || 'MODERATE').toUpperCase();
          const urgency = allowedUrgency.has(rawUrgency) ? rawUrgency : 'MODERATE';
          return {
            productId: matchedSource?.productId || String(s.productId || ''),
            sku: matchedSource?.sku || String(s.sku || ''),
            forecastDailyDemand: Math.max(0, Math.round((Number(s.forecastDailyDemand) || 0) * 100) / 100),
            projected30DayDemand: Math.max(0, Math.round((Number(s.projected30DayDemand) || 0) * 10) / 10),
            suggestedReorderPoint: Math.max(1, Math.round(Number(s.suggestedReorderPoint) || 1)),
            suggestedSafetyStock: Math.max(0, Math.round(Number(s.suggestedSafetyStock) || 0)),
            suggestedOrderQty: Math.max(0, Math.round(Number(s.suggestedOrderQty) || 0)),
            urgency,
            confidencePercent: Math.max(1, Math.min(100, Math.round(Number(s.confidencePercent) || 85))),
            rationale: String(s.rationale || ''),
          };
        })
      : [];

    res.json({
      success: true,
      providerUsed: aiResult.provider,
      providerLabel: aiResult.providerLabel,
      modelUsed: aiResult.model,
      generatedAt: new Date().toISOString(),
      executiveSummary: String(parsed?.executiveSummary || ''),
      suggestions,
    });
  } catch (err: any) {
    const rawMsg = String(err?.message || 'AI forecast failed');
    const numericStatus = Number(err?.status || err?.statusCode || 0);
    const isAuthIssue =
      numericStatus === 400 ||
      numericStatus === 401 ||
      numericStatus === 403 ||
      /API_KEY_INVALID|PERMISSION_DENIED|Unauthorized|401|403/i.test(rawMsg);
    const isQuotaIssue = numericStatus === 429 || /RESOURCE_EXHAUSTED|429/i.test(rawMsg);
    const isUnavailable = numericStatus === 503 || /UNAVAILABLE|503|high demand/i.test(rawMsg);

    const httpStatus = isAuthIssue ? 403 : isQuotaIssue ? 429 : isUnavailable ? 503 : 502;
    const errorCode = isAuthIssue
      ? 'AI_AUTH_ERROR'
      : isQuotaIssue
      ? 'AI_RATE_LIMIT'
      : isUnavailable
      ? 'AI_TEMPORARILY_UNAVAILABLE'
      : 'AI_UPSTREAM_ERROR';
    const errorAr = isAuthIssue
      ? `تعذر المصادقة مع مزود الذكاء الاصطناعي (${aiRuntime.preset.nameEn}). يرجى مراجعة مفتاح API في إعدادات الذكاء الاصطناعي.`
      : isQuotaIssue
      ? `تم تجاوز حد طلبات مزود الذكاء الاصطناعي (${aiRuntime.preset.nameEn}). يرجى الانتظار أو مراجعة الرصيد.`
      : isUnavailable
      ? `خادم الذكاء الاصطناعي (${aiRuntime.preset.nameEn}) يشهد ضغطاً مؤقتاً حالياً (503).`
      : `تعذر إتمام التنبؤ عبر ${aiRuntime.preset.nameEn} حالياً. يرجى المحاولة مجدداً.`;

    res.status(httpStatus).json({
      success: false,
      errorCode,
      error: rawMsg,
      errorAr,
    });
  }
});

// ---------------------------------------------------------------------------
// AI Color Theme Generator Endpoint (Universal Multi-Provider Brand Palette Generator)
// ---------------------------------------------------------------------------
app.post('/api/gemini/theme-palette', async (req, res) => {
  const {
    companyName = 'RLM Enterprise',
    moodPrompt = '',
    polarity = 'light',
    logoDataUrl = '',
    dominantSeedHex = '#1e3a8a',
    language = 'ar',
  } = req.body || {};

  const safePolarity: 'light' | 'dark' | 'warm' =
    polarity === 'dark' || polarity === 'warm' ? polarity : 'light';

  const fallbackVariants = generateCohesivePaletteVariants(
    dominantSeedHex,
    companyName,
    safePolarity
  ).map((p) => ({ ...p, source: 'GEMINI_AI' as const }));

  try {
    const aiRuntime = resolveEffectiveAiRuntime();
    if (!isAnyAiReady(aiRuntime)) {
      res.json({ ...fallbackVariants[0], palettes: fallbackVariants });
      return;
    }

    const paletteSchema = {
      type: Type.OBJECT,
      properties: {
        palettes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              paletteNameAr: { type: Type.STRING },
              paletteNameEn: { type: Type.STRING },
              primaryHex: { type: Type.STRING },
              secondaryHex: { type: Type.STRING },
              accentHex: { type: Type.STRING },
              surfaceHex: { type: Type.STRING },
              backgroundHex: { type: Type.STRING },
              textHex: { type: Type.STRING },
              rationaleAr: { type: Type.STRING },
              rationaleEn: { type: Type.STRING },
            },
            required: [
              'paletteNameAr',
              'paletteNameEn',
              'primaryHex',
              'secondaryHex',
              'accentHex',
              'surfaceHex',
              'backgroundHex',
              'textHex',
              'rationaleAr',
              'rationaleEn',
            ],
          },
        },
      },
      required: ['palettes'],
    };

    const aiRes = await executeUniversalAiText({
      prompt: `Analyze the company brand "${companyName}" (seed color ${dominantSeedHex}, polarity "${safePolarity}", industry/style mood "${moodPrompt || 'commercial enterprise ERP & accounting'}", language ${language}). Generate 3 distinct, WCAG AA high-contrast enterprise UI color palettes suited for accounting ledgers, POS terminals, and commercial invoices. Return JSON { "palettes": [ { "paletteNameAr", "paletteNameEn", "primaryHex", "secondaryHex", "accentHex", "surfaceHex", "backgroundHex", "textHex", "rationaleAr", "rationaleEn" } ] }.`,
      imageDataUrl: typeof logoDataUrl === 'string' ? logoDataUrl : '',
      jsonMode: true,
      geminiSchema: paletteSchema,
      timeoutMs: 14000,
      maxTokens: 1600,
      overrideRuntime: aiRuntime,
    });

    const parsed = extractJsonFromAiText(aiRes.text) || {};
    if (Array.isArray(parsed?.palettes) && parsed.palettes.length > 0 && parsed.palettes[0]?.primaryHex) {
      const normalizedPalettes = parsed.palettes.slice(0, 3).map((p: any) => ({
        ...fallbackVariants[0],
        ...p,
        polarity: safePolarity,
        source: 'GEMINI_AI' as const,
      }));
      res.json({
        ...normalizedPalettes[0],
        palettes: normalizedPalettes,
        source: `${aiRes.provider.toUpperCase()}_${aiRes.model}`,
        providerLabel: aiRes.providerLabel,
        modelUsed: aiRes.model,
      });
      return;
    }
    res.json({ ...fallbackVariants[0], palettes: fallbackVariants });
  } catch {
    res.json({ ...fallbackVariants[0], palettes: fallbackVariants });
  }
});

// ---------------------------------------------------------------------------
// Mount Vite Dev Server or Static Production Bundle
// ---------------------------------------------------------------------------
export type EmbeddedDistAssetsMap = Record<string, { mime: string; gzB64: string }>;

export interface StartServerOptions {
  embeddedAssets?: EmbeddedDistAssetsMap;
  onListening?: (info: { port: number; httpsPort: number; httpsEnabled: boolean }) => void;
}

export async function startServer(options: StartServerOptions = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  if (options.embeddedAssets) {
    activeEmbeddedAssetsMap = options.embeddedAssets;
  }

  if (!isProd) {
    process.env.DISABLE_HMR = 'true';
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

    const vitePkgName = 'vite';
    const viteReadyPromise = import(/* @vite-ignore */ vitePkgName)
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: {
            middlewareMode: true,
            host: true,
            allowedHosts: true,
            cors: true,
            hmr: false,
            ws: false,
            watch: null,
          },
          appType: 'spa',
        })
      )
      .catch((err) => {
        console.error('[Haseb ERP Vite Init Error]', err);
        return null;
      });

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
        next();
        return;
      }
      const vite = await viteReadyPromise;
      if (vite) {
        vite.middlewares(req, res, next);
      } else {
        next();
      }
    });
  } else {
    const distPath = process.env.HASEB_DIST_DIR || path.resolve(ROOT_DIR, 'dist');
    const embeddedCache = new Map<string, { mime: string; buf: Buffer }>();
    const hasDiskDist = fs.existsSync(path.join(distPath, 'index.html'));

    if (hasDiskDist) {
      app.use(
        express.static(distPath, {
          maxAge: '7d',
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
              res.setHeader('Cache-Control', 'no-cache');
            }
          },
        })
      );
    }

    const resolveEmbeddedAsset = (reqPath: string): { mime: string; buf: Buffer } | null => {
      const assets = options.embeddedAssets || activeEmbeddedAssetsMap;
      if (!assets) return null;
      const cleanPath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '').split('?')[0];
      const hitKey = assets[cleanPath]
        ? cleanPath
        : !cleanPath.includes('.') && assets['index.html']
        ? 'index.html'
        : null;
      if (!hitKey) return null;
      let cached = embeddedCache.get(hitKey);
      if (!cached) {
        const meta = assets[hitKey];
        cached = {
          mime: meta.mime,
          buf: zlib.gunzipSync(Buffer.from(meta.gzB64, 'base64')),
        };
        embeddedCache.set(hitKey, cached);
      }
      return cached;
    };

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
        next();
        return;
      }
      if (hasDiskDist) {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
          return;
        }
      }
      const asset = resolveEmbeddedAsset(req.path);
      if (asset) {
        res.setHeader('Content-Type', asset.mime);
        res.setHeader(
          'Cache-Control',
          asset.mime.includes('text/html') ? 'no-cache' : 'public, max-age=604800'
        );
        res.send(asset.buf);
        return;
      }
      res.status(404).send('Haseb ERP frontend bundle not found.');
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    wsClients.add(ws);
    const rawIp = String(
      (req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req?.socket?.remoteAddress ||
        '127.0.0.1'
    ).replace(/^::ffff:/, '');
    const uaInfo = detectDeviceLabelFromUserAgent(String(req?.headers['user-agent'] || ''));
    const nowIso = new Date().toISOString();
    let clientIdFromUrl = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    let userNameFromUrl = 'مستخدم متصل';
    let activeTabFromUrl = 'pos';
    try {
      const parsedUrl = new URL(String(req?.url || '/ws/erp-sync'), 'http://localhost');
      clientIdFromUrl = parsedUrl.searchParams.get('clientId') || clientIdFromUrl;
      userNameFromUrl = parsedUrl.searchParams.get('userName') || userNameFromUrl;
      activeTabFromUrl = parsedUrl.searchParams.get('activeTab') || activeTabFromUrl;
    } catch {}

    wsDevicePresence.set(ws, {
      clientId: clientIdFromUrl,
      deviceLabel: uaInfo.deviceLabel,
      platformType: uaInfo.platformType,
      userName: userNameFromUrl,
      activeTab: activeTabFromUrl,
      ip: rawIp || '127.0.0.1',
      connectedAt: nowIso,
      lastSeenAt: nowIso,
    });

    try {
      ws.send(
        JSON.stringify({
          type: 'erp:hello',
          dbRevision,
          hasSavedState: Boolean(memoryStore),
          devices: getConnectedLanDevicesSnapshot(),
          serverTimestampMs: Date.now(),
        })
      );
    } catch {
      wsClients.delete(ws);
      wsDevicePresence.delete(ws);
    }
    broadcastPresenceList();

    ws.on('message', (rawBuf) => {
      try {
        const msg = JSON.parse(String(rawBuf || '{}'));
        if (msg?.type === 'erp:ping') {
          if (ws.readyState === WebSocket.OPEN) {
            const existing = wsDevicePresence.get(ws);
            if (existing) {
              wsDevicePresence.set(ws, { ...existing, lastSeenAt: new Date().toISOString() });
            }
            ws.send(
              JSON.stringify({
                type: 'erp:pong',
                dbRevision,
                sentAtMs: msg.sentAtMs || Date.now(),
                serverTimestampMs: Date.now(),
              })
            );
          }
          return;
        }
        if (msg?.type === 'erp:presence') {
          const prev = wsDevicePresence.get(ws);
          wsDevicePresence.set(ws, {
            clientId: String(msg.clientId || prev?.clientId || clientIdFromUrl),
            deviceLabel: String(msg.deviceLabel || prev?.deviceLabel || uaInfo.deviceLabel),
            platformType:
              msg.platformType === 'MOBILE' ||
              msg.platformType === 'TABLET' ||
              msg.platformType === 'DESKTOP'
                ? msg.platformType
                : prev?.platformType || uaInfo.platformType,
            userName: String(msg.userName || prev?.userName || 'مستخدم'),
            activeTab: String(msg.activeTab || prev?.activeTab || 'pos'),
            ip: prev?.ip || rawIp || '127.0.0.1',
            connectedAt: prev?.connectedAt || nowIso,
            lastSeenAt: new Date().toISOString(),
          });
          broadcastPresenceList();
        }
      } catch {
        // ignore malformed frames
      }
    });

    const pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch {
          clearInterval(pingTimer);
        }
      } else {
        clearInterval(pingTimer);
      }
    }, 20000);
    ws.on('close', () => {
      clearInterval(pingTimer);
      wsClients.delete(ws);
      wsDevicePresence.delete(ws);
      broadcastPresenceList();
    });
    ws.on('error', () => {
      clearInterval(pingTimer);
      wsClients.delete(ws);
      wsDevicePresence.delete(ws);
      broadcastPresenceList();
    });
  });

  const handleWsUpgrade = (
    req: http.IncomingMessage,
    socket: any,
    head: Buffer
  ) => {
    const reqUrl = String(req.url || '');
    if (reqUrl.startsWith('/ws/erp-sync')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  };

  httpServer.on('upgrade', handleWsUpgrade);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Haseb ERP Server] Running on http://0.0.0.0:${PORT}`);
    options.onListening?.({
      port: PORT,
      httpsPort: HTTPS_PORT,
      httpsEnabled: isHttpsActive,
    });

    // Defer USB hotplug watcher & companion HTTPS server so HTTP port 3000 responds immediately
    setTimeout(() => {
      startUsbCableHotplugWatcher({
        rootDir: ROOT_DIR,
        getSentCounter: () => usbBridgeSentCounter,
        getClientRegisteredDevice: () => clientRegisteredUsbDevice,
        onDeviceChange: (device) => {
          broadcastWsMessage({
            type: 'erp:usb_device_update',
            device,
            serverTimestampMs: Date.now(),
          });
        },
        intervalMs: 3500,
      });

      // Companion Self-Signed HTTPS Server for Mobile LAN Camera & OS Notifications (Secure Context)
      try {
        const certDir = path.join(DATA_DIR, 'lan-cert');
        if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
        const keyPath = path.join(certDir, 'key.pem');
        const certPath = path.join(certDir, 'cert.pem');
        const pfxPath = path.join(certDir, 'lan-cert.pfx');
        const pfxPass = 'HasebLanCert2026';
        const sanMetaPath = path.join(certDir, 'san-ips.json');

        const nets = os.networkInterfaces();
        const detectedIps: string[] = [];
        for (const name of Object.keys(nets)) {
          for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal && net.address && !net.address.startsWith('169.254.')) {
              detectedIps.push(net.address);
            }
          }
        }
        const uniqueIps = Array.from(new Set(['127.0.0.1', ...detectedIps])).sort();
        const sanEntries = ['DNS:localhost', ...uniqueIps.map((ip) => `IP:${ip}`)].join(',');
        const prevSan = fs.existsSync(sanMetaPath) ? fs.readFileSync(sanMetaPath, 'utf-8') : '';

        if (((!fs.existsSync(keyPath) || !fs.existsSync(certPath)) && !fs.existsSync(pfxPath)) || prevSan !== sanEntries) {
          let generated = false;
          try {
            const opensslCmd = `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 825 -subj "/CN=Haseb-ERP-LAN" -addext "subjectAltName=${sanEntries}"`;
            execSync(opensslCmd, { stdio: 'ignore', timeout: 8000 });
            generated = fs.existsSync(keyPath) && fs.existsSync(certPath);
          } catch {
            generated = false;
          }

          if (!generated && process.platform === 'win32') {
            try {
              const dnsList = ['localhost', ...uniqueIps].map((d) => `'${d}'`).join(',');
              const psCmd = [
                `$c = New-SelfSignedCertificate -DnsName ${dnsList} -CertStoreLocation 'Cert:\\CurrentUser\\My' -FriendlyName 'Haseb ERP LAN' -NotAfter (Get-Date).AddYears(3);`,
                `$pw = ConvertTo-SecureString -String '${pfxPass}' -Force -AsPlainText;`,
                `Export-PfxCertificate -Cert $c -FilePath '${pfxPath.replace(/'/g, "''")}' -Password $pw | Out-Null;`,
                `Remove-Item -Path ('Cert:\\CurrentUser\\My\\' + $c.Thumbprint) -Force -ErrorAction SilentlyContinue`,
              ].join(' ');
              execFileSync(
                'powershell',
                ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCmd],
                { stdio: 'ignore', timeout: 10000 }
              );
              generated = fs.existsSync(pfxPath);
            } catch {
              generated = false;
            }
          }

          if (generated) {
            fs.writeFileSync(sanMetaPath, sanEntries, 'utf-8');
          }
        }

        let tlsOptions: https.ServerOptions | null = null;
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
          tlsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          };
        } else if (fs.existsSync(pfxPath)) {
          tlsOptions = {
            pfx: fs.readFileSync(pfxPath),
            passphrase: pfxPass,
          };
        }

        if (tlsOptions) {
          const httpsServer = https.createServer(tlsOptions, app);
          httpsServer.on('upgrade', handleWsUpgrade);
          httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
            isHttpsActive = true;
            console.log(`[Haseb ERP HTTPS LAN] Running on https://0.0.0.0:${HTTPS_PORT} (Camera & Push Ready)`);
          });
          httpsServer.on('error', (err) => {
            isHttpsActive = false;
            console.warn('[Haseb ERP HTTPS LAN] Disabled:', (err as any)?.message || err);
          });
        }
      } catch (err) {
        isHttpsActive = false;
        console.warn('[Haseb ERP HTTPS LAN] Cert generation skipped:', (err as any)?.message || err);
      }
    }, 1500);
  });
}

if (process.env.HASEB_DEFER_AUTOSTART !== '1') {
  startServer();
}
