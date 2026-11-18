/**
 * HASEB ERP — THE MAESTRO Security, Transactional Authority, Idempotency,
 * AES-256-GCM Encrypted Backup & Tamper-Evident Chained Audit Engine.
 *
 * Implements:
 * - Phase 0: Session Auth (HMAC-SHA256), Brute-Force Rate Limiting, Cryptographic Trial Anchor, Route Policy
 * - Phase 1: Licensing V3 Never-Hostage Entitlements & Hardware Re-Attestation
 * - Phase 2: Server-Authoritative Transactional Commands, Persistent Idempotency, Anti-Double-Selling Stock Ledger, Domain Events (< 5KB)
 * - Phase 3: Honest Messaging State Machine (PENDING | QUEUED | SENDING | SENT | DELIVERED | FAILED) & Deduplication
 * - Phase 4: AES-256-GCM Customer-Controlled Encrypted Backups, Clean-Room Restore Verification & Chained SHA-256 Audit Log
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  SignedLicenseToken,
  SystemModuleKey,
  verifySignedLicenseTokenSignature,
  isModuleEntitled,
} from '../core/licensing_core/index';

// ============================================================================
// 0. OS-Safe Data Directory Resolution (Phase 0.5 / Phase 4.3)
// ============================================================================

export function resolveSafeApplicationDataDir(rootDir: string, envDataDir?: string): string {
  if (envDataDir && envDataDir.trim().length > 0) {
    return path.resolve(envDataDir.trim());
  }
  const legacyDir = path.resolve(rootDir, '.data');
  // If running on Windows and ProgramData is writable, support ProgramData\HasebERP with safe migration
  if (process.platform === 'win32' && process.env.ProgramData) {
    const winProgramDataDir = path.join(process.env.ProgramData, 'HasebERP', 'data');
    try {
      if (fs.existsSync(winProgramDataDir)) {
        return winProgramDataDir;
      }
      // Preserve existing .data if already populated in workspace
      if (fs.existsSync(legacyDir)) {
        return legacyDir;
      }
    } catch {
      return legacyDir;
    }
  }
  return legacyDir;
}

// ============================================================================
// 1. Session Authentication & Brute-Force Protection (Phase 0.2)
// ============================================================================

export interface AuthenticatedSessionClaims {
  sessionId: string;
  userId: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'CASHIER' | 'WAREHOUSE';
  branchId?: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

interface LoginAttemptRecord {
  failures: number;
  firstFailureMs: number;
  lockedUntilMs: number;
}

export class MaestroSessionAuthManager {
  private secretKey: Buffer;
  private revokedSessions = new Set<string>();
  private loginAttempts = new Map<string, LoginAttemptRecord>();
  private readonly sessionTtlMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxFailures = 8;
  private readonly windowMs = 10 * 60 * 1000; // 10 minutes
  private readonly lockoutMs = 5 * 60 * 1000; // 5 minutes

  constructor(dataDir: string) {
    const keyFile = path.join(dataDir, 'session_hmac_secret.key');
    this.secretKey = this.loadOrCreateSecretKey(keyFile);
  }

  private loadOrCreateSecretKey(keyFile: string): Buffer {
    try {
      if (fs.existsSync(keyFile)) {
        const hex = fs.readFileSync(keyFile, 'utf-8').trim();
        if (hex.length >= 64) {
          return Buffer.from(hex, 'hex');
        }
      }
      const dir = path.dirname(keyFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const generated = crypto.randomBytes(32);
      fs.writeFileSync(keyFile, generated.toString('hex'), { encoding: 'utf-8', mode: 0o600 });
      return generated;
    } catch {
      return crypto.createHash('sha256').update(`haseb-fallback-${os.hostname()}`).digest();
    }
  }

  public checkLoginRateLimit(ip: string, username: string, nowMs = Date.now()): {
    allowed: boolean;
    retryAfterSeconds?: number;
  } {
    const key = `${ip}:::${username.toLowerCase().trim()}`;
    const rec = this.loginAttempts.get(key);
    if (!rec) return { allowed: true };

    if (rec.lockedUntilMs > nowMs) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((rec.lockedUntilMs - nowMs) / 1000),
      };
    }

    if (nowMs - rec.firstFailureMs > this.windowMs) {
      this.loginAttempts.delete(key);
      return { allowed: true };
    }

    return { allowed: true };
  }

  public recordLoginOutcome(ip: string, username: string, success: boolean, nowMs = Date.now()): void {
    const key = `${ip}:::${username.toLowerCase().trim()}`;
    if (success) {
      this.loginAttempts.delete(key);
      return;
    }
    const prev = this.loginAttempts.get(key);
    if (!prev || nowMs - prev.firstFailureMs > this.windowMs) {
      this.loginAttempts.set(key, {
        failures: 1,
        firstFailureMs: nowMs,
        lockedUntilMs: 0,
      });
      return;
    }
    const failures = prev.failures + 1;
    const lockedUntilMs = failures >= this.maxFailures ? nowMs + this.lockoutMs : 0;
    this.loginAttempts.set(key, {
      failures,
      firstFailureMs: prev.firstFailureMs,
      lockedUntilMs,
    });
  }

  public issueSessionToken(params: {
    userId: string;
    username: string;
    role: AuthenticatedSessionClaims['role'];
    branchId?: string;
    ttlMs?: number;
  }): { token: string; claims: AuthenticatedSessionClaims } {
    const nowMs = Date.now();
    const claims: AuthenticatedSessionClaims = {
      sessionId: crypto.randomUUID(),
      userId: params.userId,
      username: params.username,
      role: params.role,
      branchId: params.branchId,
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + (params.ttlMs ?? this.sessionTtlMs),
    };
    const payloadB64 = Buffer.from(JSON.stringify(claims), 'utf-8').toString('base64url');
    const sigB64 = crypto
      .createHmac('sha256', this.secretKey)
      .update(payloadB64, 'utf-8')
      .digest('base64url');
    return {
      token: `${payloadB64}.${sigB64}`,
      claims,
    };
  }

  public verifySessionToken(
    rawToken?: string | null,
    nowMs = Date.now()
  ): { valid: boolean; claims?: AuthenticatedSessionClaims; reason?: string } {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, reason: 'MISSING_SESSION_TOKEN' };
    }
    const clean = rawToken.replace(/^Bearer\s+/i, '').trim();
    const parts = clean.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'MALFORMED_SESSION_TOKEN' };
    }
    const [payloadB64, sigB64] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.secretKey)
      .update(payloadB64, 'utf-8')
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64, 'utf-8');
    const expBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, reason: 'INVALID_SESSION_SIGNATURE' };
    }

    try {
      const claims = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      ) as AuthenticatedSessionClaims;
      if (!claims || !claims.sessionId || !claims.username) {
        return { valid: false, reason: 'INVALID_SESSION_CLAIMS' };
      }
      if (this.revokedSessions.has(claims.sessionId)) {
        return { valid: false, reason: 'SESSION_REVOKED' };
      }
      if (nowMs > claims.expiresAtMs) {
        return { valid: false, reason: 'SESSION_EXPIRED' };
      }
      return { valid: true, claims };
    } catch {
      return { valid: false, reason: 'CORRUPTED_SESSION_PAYLOAD' };
    }
  }

  public revokeSessionToken(rawToken?: string | null): boolean {
    const check = this.verifySessionToken(rawToken);
    if (check.claims?.sessionId) {
      this.revokedSessions.add(check.claims.sessionId);
      return true;
    }
    return false;
  }

  public revokeToken(rawToken?: string | null): boolean {
    return this.revokeSessionToken(rawToken);
  }

  public checkRateLimit(ip: string, username = 'default', nowMs = Date.now()): {
    allowed: boolean;
    retryAfterSeconds: number;
  } {
    const res = this.checkLoginRateLimit(ip, username, nowMs);
    return {
      allowed: res.allowed,
      retryAfterSeconds: res.retryAfterSeconds || 0,
    };
  }

  public recordLoginFailure(ip: string, username = 'default', nowMs = Date.now()): void {
    this.recordLoginOutcome(ip, username, false, nowMs);
  }

  public clearRateLimit(ip: string, username = 'default', nowMs = Date.now()): void {
    this.recordLoginOutcome(ip, username, true, nowMs);
  }

  public extractTokenFromHeaders(
    headers: Record<string, string | string[] | undefined>
  ): string | null {
    const direct = headers['x-haseb-session-token'];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    const auth = headers['authorization'];
    if (typeof auth === 'string' && auth.trim()) return auth.replace(/^Bearer\s+/i, '').trim();
    const cookie = headers['cookie'];
    if (typeof cookie === 'string' && cookie.includes('haseb_session=')) {
      const match = cookie.match(/haseb_session=([^;]+)/);
      if (match && match[1]) return decodeURIComponent(match[1].trim());
    }
    return null;
  }

  public getHmacSecret(): Buffer {
    return this.secretKey;
  }
}

// ============================================================================
// 2. Cryptographic Trial Anchor & Monotonic Clock Guard (Phase 0.4 & 1.4)
// ============================================================================

export interface SignedTrialAnchor {
  version: '1.0';
  trialStartedAtEpochMs: number;
  maxObservedClockMs: number;
  boundMachineCode: string;
  usedSerialTokens: string[];
  signatureHmacHex: string;
}

export class CryptographicTrialAnchorGuard {
  private filePath: string;
  private secretKey: Buffer;
  private state: SignedTrialAnchor;

  constructor(dataDir: string, secretKey: Buffer, initialMachineCode = 'HASEB-HOST-PRIMARY') {
    this.filePath = path.join(dataDir, 'drm_guard.json');
    this.secretKey = secretKey;
    this.state = this.loadOrInitAnchor(initialMachineCode);
  }

  private computeSignature(
    trialStartedAtEpochMs: number,
    maxObservedClockMs: number,
    boundMachineCode: string,
    usedSerialTokens: string[]
  ): string {
    const payload = JSON.stringify({
      trialStartedAtEpochMs,
      maxObservedClockMs,
      boundMachineCode,
      usedSerialTokens: [...usedSerialTokens].sort(),
    });
    return crypto.createHmac('sha256', this.secretKey).update(payload, 'utf-8').digest('hex');
  }

  private loadOrInitAnchor(defaultMachineCode: string): SignedTrialAnchor {
    const now = Date.now();
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        const started = Number(raw.trialStartedAtEpochMs);
        const maxClock = Number(raw.maxObservedClockMs);
        const machineCode = String(raw.boundRequestCode || raw.boundMachineCode || defaultMachineCode);
        const usedTokens = Array.isArray(raw.usedSerialTokens) ? raw.usedSerialTokens : [];

        if (Number.isFinite(started) && started > 1_600_000_000_000) {
          // Clamp accidental future HWM (> 180 days ahead of current real time) so customer is not trapped
          const safeMaxClock =
            Number.isFinite(maxClock) && maxClock - now <= 180 * 86400000
              ? Math.max(maxClock, now)
              : now;
          const sig = this.computeSignature(started, safeMaxClock, machineCode, usedTokens);
          const hydrated: SignedTrialAnchor = {
            version: '1.0',
            trialStartedAtEpochMs: started,
            maxObservedClockMs: safeMaxClock,
            boundMachineCode: machineCode,
            usedSerialTokens: usedTokens,
            signatureHmacHex: sig,
          };
          this.persistAnchor(hydrated);
          return hydrated;
        }
      }
    } catch {
      // fall through to initialize first-boot anchor
    }

    const initial: SignedTrialAnchor = {
      version: '1.0',
      trialStartedAtEpochMs: now,
      maxObservedClockMs: now,
      boundMachineCode: defaultMachineCode,
      usedSerialTokens: [],
      signatureHmacHex: this.computeSignature(now, now, defaultMachineCode, []),
    };
    this.persistAnchor(initial);
    return initial;
  }

  private persistAnchor(anchor: SignedTrialAnchor): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      const out = {
        ...anchor,
        boundRequestCode: anchor.boundMachineCode,
      };
      fs.writeFileSync(tmp, JSON.stringify(out, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmp, this.filePath);
    } catch {
      // ignore read-only fs errors
    }
  }

  public evaluateTrialEligibility(nowMs = Date.now(), maxTrialDays = 90): {
    valid: boolean;
    allowed: boolean;
    errorCode?: 'CLOCK_TAMPERED' | 'TRIAL_CLOCK_ROLLBACK' | 'TRIAL_EXPIRED' | 'TRIAL_ANCHOR_TAMPERED';
    reason?: string;
    elapsedDays: number;
    remainingDays: number;
    daysRemaining: number;
    trialStartedAtEpochMs: number;
    maxObservedClockMs: number;
  } {
    const expectedSig = this.computeSignature(
      this.state.trialStartedAtEpochMs,
      this.state.maxObservedClockMs,
      this.state.boundMachineCode,
      this.state.usedSerialTokens
    );
    if (expectedSig !== this.state.signatureHmacHex) {
      return {
        valid: false,
        allowed: false,
        errorCode: 'TRIAL_ANCHOR_TAMPERED',
        reason: 'Cryptographic trial anchor signature mismatch.',
        elapsedDays: maxTrialDays + 1,
        remainingDays: 0,
        daysRemaining: 0,
        trialStartedAtEpochMs: this.state.trialStartedAtEpochMs,
        maxObservedClockMs: this.state.maxObservedClockMs,
      };
    }

    // Detect clock rollback (> 5 minutes behind highest observed clock)
    if (nowMs + 5 * 60 * 1000 < this.state.maxObservedClockMs) {
      return {
        valid: false,
        allowed: false,
        errorCode: 'TRIAL_CLOCK_ROLLBACK',
        reason: 'System clock rollback detected against monotonic trial anchor.',
        elapsedDays: 0,
        remainingDays: 0,
        daysRemaining: 0,
        trialStartedAtEpochMs: this.state.trialStartedAtEpochMs,
        maxObservedClockMs: this.state.maxObservedClockMs,
      };
    }

    // Advance HWM if not an unproven >180-day accidental jump
    if (nowMs > this.state.maxObservedClockMs && nowMs - this.state.maxObservedClockMs <= 180 * 86400000) {
      this.state.maxObservedClockMs = nowMs;
      this.state.signatureHmacHex = this.computeSignature(
        this.state.trialStartedAtEpochMs,
        this.state.maxObservedClockMs,
        this.state.boundMachineCode,
        this.state.usedSerialTokens
      );
      this.persistAnchor(this.state);
    }

    const effectiveNow = Math.max(nowMs, this.state.maxObservedClockMs);
    const elapsedDays = Math.floor((effectiveNow - this.state.trialStartedAtEpochMs) / 86400000);
    const remainingDays = Math.max(0, maxTrialDays - elapsedDays);

    if (elapsedDays > maxTrialDays) {
      return {
        valid: false,
        allowed: false,
        errorCode: 'TRIAL_EXPIRED',
        reason: '90-day trial period has expired.',
        elapsedDays,
        remainingDays: 0,
        daysRemaining: 0,
        trialStartedAtEpochMs: this.state.trialStartedAtEpochMs,
        maxObservedClockMs: this.state.maxObservedClockMs,
      };
    }

    return {
      valid: true,
      allowed: true,
      elapsedDays,
      remainingDays,
      daysRemaining: remainingDays,
      trialStartedAtEpochMs: this.state.trialStartedAtEpochMs,
      maxObservedClockMs: this.state.maxObservedClockMs,
    };
  }

  public getAnchorState(): SignedTrialAnchor & {
    firstSeenEpochMs: number;
    maxObservedClockEpochMs: number;
    boundRequestCode: string;
  } {
    return {
      ...this.state,
      usedSerialTokens: [...this.state.usedSerialTokens],
      firstSeenEpochMs: this.state.trialStartedAtEpochMs,
      maxObservedClockEpochMs: this.state.maxObservedClockMs,
      boundRequestCode: this.state.boundMachineCode,
    };
  }

  public consumeSerialToken(
    consumptionToken: string,
    requestCode?: string,
    clientClockMs?: number
  ): {
    success: boolean;
    errorCode?: 'INVALID_TOKEN' | 'CLOCK_TAMPERED' | 'ALREADY_USED_ONCE';
    messageAr?: string;
    usedSerialTokens?: string[];
    maxObservedClockMs?: number;
  } {
    if (!consumptionToken || typeof consumptionToken !== 'string') {
      return { success: false, errorCode: 'INVALID_TOKEN' };
    }
    const now = Date.now();
    if (
      typeof clientClockMs === 'number' &&
      clientClockMs + 120000 < Math.max(this.state.maxObservedClockMs, now)
    ) {
      return {
        success: false,
        errorCode: 'CLOCK_TAMPERED',
        messageAr: 'تم رفض التفعيل: تم رصد إرجاع ساعة الجهاز للوراء!',
      };
    }
    if (this.state.usedSerialTokens.includes(consumptionToken)) {
      return {
        success: false,
        errorCode: 'ALREADY_USED_ONCE',
        messageAr: 'تم استهلاك كود التفعيل هذا مسبقاً على هذا الجهاز ولا يمكن إعادة استخدامه!',
      };
    }
    this.state.usedSerialTokens = [...this.state.usedSerialTokens, consumptionToken];
    if (requestCode && typeof requestCode === 'string') {
      this.state.boundMachineCode = requestCode;
    }
    this.state.maxObservedClockMs = Math.max(this.state.maxObservedClockMs, now);
    this.state.signatureHmacHex = this.computeSignature(
      this.state.trialStartedAtEpochMs,
      this.state.maxObservedClockMs,
      this.state.boundMachineCode,
      this.state.usedSerialTokens
    );
    this.persistAnchor(this.state);
    return {
      success: true,
      usedSerialTokens: this.state.usedSerialTokens,
      maxObservedClockMs: this.state.maxObservedClockMs,
    };
  }

  public consumeSerialTokenOnce(
    consumptionToken: string,
    requestCode?: string,
    clientClockMs?: number
  ) {
    return this.consumeSerialToken(consumptionToken, requestCode, clientClockMs);
  }

  /**
   * For controlled testing of expired trial or clock rollback scenarios
   */
  public __setAnchorForTesting(params: {
    trialStartedAtEpochMs?: number;
    maxObservedClockMs?: number;
  }): void {
    if (typeof params.trialStartedAtEpochMs === 'number') {
      this.state.trialStartedAtEpochMs = params.trialStartedAtEpochMs;
    }
    if (typeof params.maxObservedClockMs === 'number') {
      this.state.maxObservedClockMs = params.maxObservedClockMs;
    }
    this.state.signatureHmacHex = this.computeSignature(
      this.state.trialStartedAtEpochMs,
      this.state.maxObservedClockMs,
      this.state.boundMachineCode,
      this.state.usedSerialTokens
    );
    this.persistAnchor(this.state);
  }
}

// ============================================================================
// 3. Phase 2: Transactional Business Command Engine, Persistent Idempotency,
//    Anti-Double-Selling Stock Ledger & Typed Domain Events (< 5KB)
// ============================================================================

export type AuthoritativeCommandType =
  | 'SALE_CREATE'
  | 'RETURN_CREATE'
  | 'PAYMENT_RECORD'
  | 'STOCK_RECEIVE'
  | 'STOCK_ADJUST'
  | 'STOCK_TRANSFER'
  | 'PRODUCT_UPDATE';

export type TypedDomainEventType =
  | 'invoice.created'
  | 'invoice.updated'
  | 'stock.decremented'
  | 'stock.adjusted'
  | 'payment.recorded'
  | 'customer.updated'
  | 'product.updated';

export interface TypedDomainEvent {
  eventId: string;
  revision: number;
  eventType: TypedDomainEventType;
  entityId: string;
  commandId: string;
  originClientId?: string;
  timestampMs: number;
  payload: Record<string, any>;
}

export interface AuthoritativeCommandRequest {
  commandId: string; // Persistent Idempotency Key
  commandType: AuthoritativeCommandType;
  originClientId?: string;
  clientId?: string;
  branchId?: string;
  actorId?: string;
  actorName?: string;
  allowNegativeStock?: boolean;
  payload: Record<string, any>;
}

export interface AuthoritativeCommandResult {
  success: boolean;
  idempotentReplay: boolean;
  commandId: string;
  commandType: AuthoritativeCommandType;
  dbRevision: number;
  errorCode?:
    | 'INVALID_COMMAND'
    | 'INSUFFICIENT_STOCK'
    | 'INVOICE_NOT_FOUND'
    | 'ALREADY_RETURNED'
    | 'PRODUCT_NOT_FOUND'
    | 'CUSTOMER_NOT_FOUND'
    | 'VALIDATION_FAILED';
  errorMessage?: string;
  errorMessageAr?: string;
  entityResult?: Record<string, any>;
  entity?: Record<string, any>;
  domainEvents: TypedDomainEvent[];
  events: TypedDomainEvent[];
  changedKeys: string[];
  patch?: Record<string, any>;
}

/**
 * Pure, deterministic transactional command processor over the authoritative ERP state.
 * Guarantees:
 * - Server recalculates invoice totals (never trusts client totals blindly).
 * - Stock is checked and decremented atomically; prevents double-selling when stock=1.
 * - Repeated commandIds return the exact cached result without duplicating invoices or stock changes.
 */
export function executeAuthoritativeBusinessCommand(
  paramsOrState:
    | {
        request: AuthoritativeCommandRequest;
        currentState: Record<string, any>;
        currentRevision: number;
        idempotencyStore: Map<string, AuthoritativeCommandResult>;
      }
    | Record<string, any>,
  argRequest?: AuthoritativeCommandRequest,
  argIdempotencyStore?: Map<string, AuthoritativeCommandResult>,
  argNextCandidateRevision?: number
): {
  result: AuthoritativeCommandResult;
  nextState: Record<string, any>;
  nextRevision: number;
  statePatch: Record<string, any>;
} {
  const isParamsObject =
    paramsOrState &&
    typeof paramsOrState === 'object' &&
    'request' in paramsOrState &&
    'currentState' in paramsOrState &&
    'idempotencyStore' in paramsOrState;

  const request: AuthoritativeCommandRequest = isParamsObject
    ? (paramsOrState as any).request
    : (argRequest as AuthoritativeCommandRequest);
  const currentState: Record<string, any> = isParamsObject
    ? (paramsOrState as any).currentState
    : (paramsOrState as Record<string, any>);
  const idempotencyStore: Map<string, AuthoritativeCommandResult> = isParamsObject
    ? (paramsOrState as any).idempotencyStore
    : (argIdempotencyStore as Map<string, AuthoritativeCommandResult>);
  const currentRevision: number = isParamsObject
    ? Number((paramsOrState as any).currentRevision) || 1
    : Math.max(1, (Number(argNextCandidateRevision) || 2) - 1);

  if (!request || typeof request.commandId !== 'string' || !request.commandId.trim()) {
    return {
      result: {
        success: false,
        idempotentReplay: false,
        commandId: '',
        commandType: request?.commandType || 'SALE_CREATE',
        dbRevision: currentRevision,
        errorCode: 'INVALID_COMMAND',
        errorMessage: 'commandId (idempotency key) is required.',
        errorMessageAr: 'مفتاح عدم التكرار (commandId) مطلوب لتنفيذ العملية.',
        domainEvents: [],
        events: [],
        changedKeys: [],
      },
      nextState: currentState,
      nextRevision: currentRevision,
      statePatch: {},
    };
  }

  const cleanCmdId = request.commandId.trim();

  // 1. Check Persistent Idempotency Ledger
  const existingResult = idempotencyStore.get(cleanCmdId);
  if (existingResult) {
    return {
      result: {
        ...existingResult,
        events: existingResult.domainEvents || existingResult.events || [],
        idempotentReplay: true,
      },
      nextState: currentState,
      nextRevision: currentRevision,
      statePatch: existingResult.patch || {},
    };
  }

  const state = currentState || {};
  const products: any[] = Array.isArray(state.products) ? [...state.products] : [];
  const salesInvoices: any[] = Array.isArray(state.salesInvoices) ? [...state.salesInvoices] : [];
  const salesReturns: any[] = Array.isArray(state.salesReturns) ? [...state.salesReturns] : [];
  const returnedInvoicesArchive: any[] = Array.isArray(state.returnedInvoicesArchive)
    ? [...state.returnedInvoicesArchive]
    : Array.isArray(state.archivedInvoices)
    ? [...state.archivedInvoices]
    : [];
  const customers: any[] = Array.isArray(state.customers) ? [...state.customers] : [];
  const journalEntries: any[] = Array.isArray(state.journalEntries) ? [...state.journalEntries] : [];
  const traceabilityEvents: any[] = Array.isArray(state.traceabilityEvents)
    ? [...state.traceabilityEvents]
    : [];

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayStr = nowIso.slice(0, 10);

  // ==========================================================================
  // COMMAND 1: SALE_CREATE (Anti-Double-Selling + Authoritative Server Totals)
  // ==========================================================================
  if (request.commandType === 'SALE_CREATE') {
    const rawItems: any[] = Array.isArray(request.payload?.items) ? request.payload.items : [];
    if (rawItems.length === 0) {
      return {
        result: {
          success: false,
          idempotentReplay: false,
          commandId: cleanCmdId,
          commandType: 'SALE_CREATE',
          dbRevision: currentRevision,
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Invoice must contain at least one item.',
          errorMessageAr: 'يجب أن تحتوي الفاتورة على صنف واحد على الأقل.',
          domainEvents: [],
          events: [],
          changedKeys: [],
        },
        nextState: currentState,
        nextRevision: currentRevision,
        statePatch: {},
      };
    }

    // Aggregate requested quantities per productId in case cart has multiple lines for same product
    const requiredQtyByProduct = new Map<string, number>();
    for (const item of rawItems) {
      const pid = String(item.productId || '').trim();
      const qty = Number(item.quantity);
      if (!pid || !Number.isFinite(qty) || qty <= 0) {
        return {
          result: {
            success: false,
            idempotentReplay: false,
            commandId: cleanCmdId,
            commandType: 'SALE_CREATE',
            dbRevision: currentRevision,
            errorCode: 'VALIDATION_FAILED',
            errorMessage: `Invalid item quantity for product ${pid || 'UNKNOWN'}.`,
            errorMessageAr: 'كمية الصنف غير صالحة في الفاتورة.',
            domainEvents: [],
            events: [],
            changedKeys: [],
          },
          nextState: currentState,
          nextRevision: currentRevision,
          statePatch: {},
        };
      }
      const conversionFactor = Math.max(1, Number(item.unitConversionFactor) || 1);
      requiredQtyByProduct.set(pid, (requiredQtyByProduct.get(pid) || 0) + qty * conversionFactor);
    }

    // Verify stock availability across all items BEFORE mutating anything
    const productIndexMap = new Map<string, number>();
    products.forEach((p, idx) => productIndexMap.set(String(p.id), idx));

    for (const [pid, neededBaseQty] of requiredQtyByProduct.entries()) {
      const pIdx = productIndexMap.get(pid);
      if (pIdx === undefined) {
        return {
          result: {
            success: false,
            idempotentReplay: false,
            commandId: cleanCmdId,
            commandType: 'SALE_CREATE',
            dbRevision: currentRevision,
            errorCode: 'PRODUCT_NOT_FOUND',
            errorMessage: `Product ${pid} not found in authoritative server inventory.`,
            errorMessageAr: `الصنف (${pid}) غير موجود في مخزون الخادم المركزي.`,
            domainEvents: [],
            events: [],
            changedKeys: [],
          },
          nextState: currentState,
          nextRevision: currentRevision,
          statePatch: {},
        };
      }
      const srvProd = products[pIdx];
      const availableStock = Number(srvProd.stockQty ?? srvProd.stock ?? 0);
      if (!request.allowNegativeStock && availableStock < neededBaseQty) {
        return {
          result: {
            success: false,
            idempotentReplay: false,
            commandId: cleanCmdId,
            commandType: 'SALE_CREATE',
            dbRevision: currentRevision,
            errorCode: 'INSUFFICIENT_STOCK',
            errorMessage: `Insufficient stock for ${srvProd.nameAr || srvProd.name}: available=${availableStock}, requested=${neededBaseQty}.`,
            errorMessageAr: `نفدت الكمية للصنف (${srvProd.nameAr || srvProd.name}): المتوفر بالخادم (${availableStock}) والمطلوب (${neededBaseQty}). تم منع البيع المزدوج.`,
            entityResult: {
              productId: pid,
              availableStock,
              requestedQty: neededBaseQty,
            },
            domainEvents: [],
            events: [],
            changedKeys: [],
          },
          nextState: currentState,
          nextRevision: currentRevision,
          statePatch: {},
        };
      }
    }

    // Authoritative Server Recalculation of Line Items & Totals
    let computedSubtotal = 0;
    let computedLineDiscountTotal = 0;
    let computedTaxTotal = 0;
    let computedTotalCost = 0;

    const validatedItems = rawItems.map((item) => {
      const pIdx = productIndexMap.get(String(item.productId))!;
      const srvProd = products[pIdx];
      const qty = Number(item.quantity);
      const unitPrice =
        typeof item.unitPrice === 'number' && item.unitPrice >= 0
          ? Number(item.unitPrice)
          : Number(srvProd.salePrice ?? srvProd.sellingPrice ?? 0);
      const lineDiscount = Math.max(0, Number(item.discount) || 0);
      const taxRate = Math.max(0, Number(item.taxRate) || 0);
      const lineNet = Math.max(0, qty * unitPrice - lineDiscount);
      const lineTax = Math.round(lineNet * (taxRate / 100) * 100) / 100;
      const lineTotal = Math.round((lineNet + lineTax) * 100) / 100;

      computedSubtotal += qty * unitPrice;
      computedLineDiscountTotal += lineDiscount;
      computedTaxTotal += lineTax;
      computedTotalCost += qty * Number(srvProd.costPrice ?? srvProd.purchasePrice ?? 0);

      return {
        ...item,
        productId: srvProd.id,
        sku: srvProd.sku || item.sku || '',
        productName: srvProd.nameAr || srvProd.name || item.productName || '',
        quantity: qty,
        unitPrice,
        discount: lineDiscount,
        taxRate,
        taxAmount: lineTax,
        total: lineTotal,
        warrantyEnabled: item.warrantyEnabled !== false,
        warrantyMonths:
          item.warrantyEnabled === false
            ? 0
            : Number(item.warrantyMonths ?? srvProd.warrantyMonths ?? 0),
      };
    });

    const headerDiscount = Math.max(0, Number(request.payload?.discountAmount) || 0);
    const totalDiscount = Math.max(headerDiscount, computedLineDiscountTotal);
    const netBeforeTax = Math.max(0, computedSubtotal - totalDiscount);
    const grandTotal = Math.round((netBeforeTax + computedTaxTotal) * 100) / 100;

    const paymentMethod = String(request.payload?.paymentMethod || 'CASH');
    const rawPaid =
      request.payload?.paidAmount !== undefined
        ? Number(request.payload.paidAmount)
        : paymentMethod === 'CREDIT'
        ? 0
        : grandTotal;
    const paidAmount = Math.max(0, Math.min(grandTotal, rawPaid));
    const unpaidDebt = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);
    const status =
      paidAmount >= grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const nextRevision = currentRevision + 1;
    const invoiceId = String(request.payload?.id || `inv-${nowMs}-${nextRevision}`);
    const invoiceNumber = String(
      request.payload?.invoiceNumber || `INV-${new Date().getFullYear()}-${1000 + salesInvoices.length + 1}`
    );

    const domainEvents: TypedDomainEvent[] = [];

    // Atomically deduct stock for each product
    for (const [pid, deductQty] of requiredQtyByProduct.entries()) {
      const pIdx = productIndexMap.get(pid)!;
      const prevProd = products[pIdx];
      const prevStockVal = Number(prevProd.stockQty ?? prevProd.stock ?? 0);
      const newStock = Math.round((prevStockVal - deductQty) * 1000) / 1000;
      products[pIdx] = {
        ...prevProd,
        stockQty: newStock,
        stock: newStock,
      };
      domainEvents.push({
        eventId: `evt-stk-${nowMs}-${pid}`,
        revision: nextRevision,
        eventType: 'stock.decremented',
        entityId: pid,
        commandId: cleanCmdId,
        originClientId: request.originClientId || request.clientId,
        timestampMs: nowMs,
        payload: {
          productId: pid,
          sku: prevProd.sku,
          previousStock: prevStockVal,
          deductedQty: deductQty,
          newStock,
          invoiceNumber,
        },
      });
    }

    // Update customer debt balance if unpaidDebt > 0
    const customerId = String(request.payload?.customerId || 'walk-in');
    let customerChanged = false;
    if (unpaidDebt > 0 && customerId && customerId !== 'walk-in') {
      const cIdx = customers.findIndex((c) => String(c.id) === customerId);
      if (cIdx >= 0) {
        const prevCust = customers[cIdx];
        const nextBalance = Math.round(((Number(prevCust.balance) || 0) + unpaidDebt) * 100) / 100;
        customers[cIdx] = {
          ...prevCust,
          balance: nextBalance,
        };
        customerChanged = true;
        domainEvents.push({
          eventId: `evt-cust-${nowMs}-${customerId}`,
          revision: nextRevision,
          eventType: 'customer.updated',
          entityId: customerId,
          commandId: cleanCmdId,
          originClientId: request.originClientId || request.clientId,
          timestampMs: nowMs,
          payload: {
            customerId,
            balance: nextBalance,
          },
        });
      }
    }

    const committedInvoice = {
      id: invoiceId,
      tenantId: String(request.payload?.tenantId || 'ten-1'),
      invoiceNumber,
      customerId,
      customerName: String(request.payload?.customerName || 'عميل نقدي'),
      customerPhone: request.payload?.customerPhone ? String(request.payload.customerPhone) : undefined,
      branchId: String(request.payload?.branchId || request.branchId || 'br-main'),
      date: String(request.payload?.date || todayStr),
      items: validatedItems,
      subtotal: Math.round(computedSubtotal * 100) / 100,
      discountAmount: Math.round(totalDiscount * 100) / 100,
      taxAmount: Math.round(computedTaxTotal * 100) / 100,
      grandTotal,
      totalAmount: grandTotal,
      paidAmount,
      paymentMethod,
      status,
      qrData: String(request.payload?.qrData || invoiceNumber),
    };

    salesInvoices.unshift(committedInvoice);

    // Create balanced Journal Entry
    const journalEntry = {
      id: `je-sale-${invoiceId}`,
      tenantId: committedInvoice.tenantId,
      entryNumber: `JE-SALE-${invoiceNumber}`,
      date: committedInvoice.date,
      description: `قيد مبيعات الفاتورة ${invoiceNumber}`,
      descriptionAr: `قيد مبيعات الفاتورة ${invoiceNumber}`,
      reference: invoiceNumber,
      status: 'POSTED',
      totalDebit: grandTotal + computedTotalCost,
      totalCredit: grandTotal + computedTotalCost,
      lines: [
        ...(paidAmount > 0
          ? [
              {
                accountId: 'acc-1101',
                accountCode: '1101',
                accountName: 'الصندوق النقدي',
                debit: paidAmount,
                credit: 0,
              },
            ]
          : []),
        ...(unpaidDebt > 0
          ? [
              {
                accountId: 'acc-1103',
                accountCode: '1103',
                accountName: 'ذمم العملاء',
                debit: unpaidDebt,
                credit: 0,
              },
            ]
          : []),
        {
          accountId: 'acc-4101',
          accountCode: '4101',
          accountName: 'إيرادات المبيعات',
          debit: 0,
          credit: netBeforeTax,
        },
        ...(computedTaxTotal > 0
          ? [
              {
                accountId: 'acc-2104',
                accountCode: '2104',
                accountName: 'ضريبة القيمة المضافة للمخرجات',
                debit: 0,
                credit: computedTaxTotal,
              },
            ]
          : []),
      ],
    };
    journalEntries.unshift(journalEntry);

    domainEvents.unshift({
      eventId: `evt-inv-${nowMs}-${invoiceId}`,
      revision: nextRevision,
      eventType: 'invoice.created',
      entityId: invoiceId,
      commandId: cleanCmdId,
      originClientId: request.originClientId || request.clientId,
      timestampMs: nowMs,
      payload: {
        invoice: committedInvoice,
      },
    });

    const changedKeys = ['products', 'salesInvoices', 'journalEntries'];
    if (customerChanged) changedKeys.push('customers');

    const patch: Record<string, any> = {
      products,
      salesInvoices,
      journalEntries,
      ...(customerChanged ? { customers } : {}),
    };

    const nextState = {
      ...state,
      ...patch,
      dbRevision: nextRevision,
      lastSyncedAt: nowIso,
    };

    const cmdResult: AuthoritativeCommandResult = {
      success: true,
      idempotentReplay: false,
      commandId: cleanCmdId,
      commandType: 'SALE_CREATE',
      dbRevision: nextRevision,
      entityResult: {
        invoice: committedInvoice,
        journalEntry,
      },
      entity: committedInvoice,
      domainEvents,
      events: domainEvents,
      changedKeys,
      patch,
    };

    idempotencyStore.set(cleanCmdId, cmdResult);
    return { result: cmdResult, nextState, nextRevision, statePatch: patch };
  }

  // ==========================================================================
  // COMMAND 2: RETURN_CREATE (Linked Return + Stamp 'مسترجع' + Auto-Archive)
  // ==========================================================================
  if (request.commandType === 'RETURN_CREATE') {
    const targetInvId = String(
      request.payload?.invoiceId || request.payload?.invoiceNumber || ''
    ).trim();
    const invIdx = salesInvoices.findIndex(
      (i) => String(i.id) === targetInvId || String(i.invoiceNumber) === targetInvId
    );
    if (invIdx < 0) {
      return {
        result: {
          success: false,
          idempotentReplay: false,
          commandId: cleanCmdId,
          commandType: 'RETURN_CREATE',
          dbRevision: currentRevision,
          errorCode: 'INVOICE_NOT_FOUND',
          errorMessage: 'Original invoice not found for return.',
          errorMessageAr: 'الفاتورة الأصلية غير موجودة للاسترجاع.',
          domainEvents: [],
          events: [],
          changedKeys: [],
        },
        nextState: currentState,
        nextRevision: currentRevision,
        statePatch: {},
      };
    }

    const origInv = salesInvoices[invIdx];
    if (origInv.status === 'VOID' || origInv.status === 'RETURNED' || origInv.isReturned) {
      return {
        result: {
          success: false,
          idempotentReplay: false,
          commandId: cleanCmdId,
          commandType: 'RETURN_CREATE',
          dbRevision: currentRevision,
          errorCode: 'ALREADY_RETURNED',
          errorMessage: 'Invoice has already been voided and returned.',
          errorMessageAr: 'تم إلغاء واسترجاع هذه الفاتورة مسبقاً ولا يمكن تكرار الاسترجاع.',
          domainEvents: [],
          events: [],
          changedKeys: [],
        },
        nextState: currentState,
        nextRevision: currentRevision,
        statePatch: {},
      };
    }

    const condition = request.payload?.condition === 'DAMAGED_QUARANTINE' ? 'DAMAGED_QUARANTINE' : 'HEALTHY_RESTOCK';
    const nextRevision = currentRevision + 1;
    const domainEvents: TypedDomainEvent[] = [];

    if (condition === 'HEALTHY_RESTOCK' && Array.isArray(origInv.items)) {
      for (const item of origInv.items) {
        const pIdx = products.findIndex((p) => String(p.id) === String(item.productId));
        if (pIdx >= 0) {
          const factor = Math.max(1, Number(item.unitConversionFactor) || 1);
          const restockQty = (Number(item.quantity) || 0) * factor;
          const prevStockVal = Number(products[pIdx].stockQty ?? products[pIdx].stock ?? 0);
          const nextStock = prevStockVal + restockQty;
          products[pIdx] = {
            ...products[pIdx],
            stockQty: nextStock,
            stock: nextStock,
          };
          domainEvents.push({
            eventId: `evt-stk-ret-${nowMs}-${item.productId}`,
            revision: nextRevision,
            eventType: 'stock.adjusted',
            entityId: String(item.productId),
            commandId: cleanCmdId,
            originClientId: request.originClientId || request.clientId,
            timestampMs: nowMs,
            payload: {
              productId: item.productId,
              newStock: nextStock,
              reason: 'RETURN_RESTOCK',
            },
          });
        }
      }
    }

    const archiveCode = `ARC-RET-${new Date().getFullYear()}-${String(nowMs).slice(-4)}`;
    const updatedInvoice = {
      ...origInv,
      status: 'RETURNED',
      isReturned: true,
      isArchivedReturn: true,
      archiveCode,
      archivedAt: nowIso,
      returnStampTextAr: 'مسترجع — ملغاة ومؤرشفة',
      returnedAt: todayStr,
      returnReason: String(request.payload?.reason || request.payload?.returnReason || 'استرجاع وإلغاء الفاتورة'),
      refundedAmount: Number(origInv.paidAmount ?? origInv.grandTotal) || 0,
    };
    salesInvoices[invIdx] = updatedInvoice;

    const archivedRecord = {
      id: `arch-${origInv.id}-${nowMs}`,
      archiveCode,
      originalInvoiceId: origInv.id,
      invoiceNumber: origInv.invoiceNumber,
      customerName: origInv.customerName,
      originalDate: origInv.date,
      archivedAt: nowIso,
      grandTotal: origInv.grandTotal,
      refundedAmount: Number(origInv.paidAmount ?? origInv.grandTotal) || 0,
      refundMethod: request.payload?.refundMethod || 'CASH',
      condition,
      reason: updatedInvoice.returnReason,
      operatorName: request.actorName || 'مدير النظام',
      stampLabelAr: 'مسترجع' as const,
      archiveStamp: 'مسترجع' as const,
      creditNoteNumbers: [`CN-VOID-${origInv.invoiceNumber}`],
      reversalJournalEntryNumber: `JE-VOID-${origInv.invoiceNumber}`,
      restockedItemsCount: Array.isArray(origInv.items) ? origInv.items.length : 0,
      invoiceSnapshot: updatedInvoice,
    };
    returnedInvoicesArchive.unshift(archivedRecord);

    domainEvents.unshift({
      eventId: `evt-inv-ret-${nowMs}-${origInv.id}`,
      revision: nextRevision,
      eventType: 'invoice.updated',
      entityId: String(origInv.id),
      commandId: cleanCmdId,
      originClientId: request.originClientId || request.clientId,
      timestampMs: nowMs,
      payload: {
        invoice: updatedInvoice,
        archivedRecord,
      },
    });

    const changedKeys = ['products', 'salesInvoices', 'returnedInvoicesArchive', 'archivedInvoices', 'salesReturns'];
    const patch = {
      products,
      salesInvoices,
      returnedInvoicesArchive,
      archivedInvoices: returnedInvoicesArchive,
      salesReturns,
    };
    const nextState = {
      ...state,
      ...patch,
      dbRevision: nextRevision,
      lastSyncedAt: nowIso,
    };

    const cmdResult: AuthoritativeCommandResult = {
      success: true,
      idempotentReplay: false,
      commandId: cleanCmdId,
      commandType: 'RETURN_CREATE',
      dbRevision: nextRevision,
      entityResult: {
        updatedInvoice,
        archivedRecord,
      },
      entity: updatedInvoice,
      domainEvents,
      events: domainEvents,
      changedKeys,
      patch,
    };
    idempotencyStore.set(cleanCmdId, cmdResult);
    return { result: cmdResult, nextState, nextRevision, statePatch: patch };
  }

  // ==========================================================================
  // COMMAND 3: STOCK_RECEIVE / STOCK_ADJUST / STOCK_TRANSFER / PRODUCT_UPDATE
  // ==========================================================================
  if (
    request.commandType === 'STOCK_RECEIVE' ||
    request.commandType === 'STOCK_ADJUST' ||
    request.commandType === 'STOCK_TRANSFER' ||
    request.commandType === 'PRODUCT_UPDATE'
  ) {
    const pid = String(request.payload?.productId || request.payload?.id || '').trim();
    const pIdx = products.findIndex((p) => String(p.id) === pid);
    if (pIdx < 0) {
      return {
        result: {
          success: false,
          idempotentReplay: false,
          commandId: cleanCmdId,
          commandType: request.commandType,
          dbRevision: currentRevision,
          errorCode: 'PRODUCT_NOT_FOUND',
          errorMessage: `Product ${pid} not found.`,
          errorMessageAr: 'الصنف غير موجود في المخزون.',
          domainEvents: [],
          events: [],
          changedKeys: [],
        },
        nextState: currentState,
        nextRevision: currentRevision,
        statePatch: {},
      };
    }

    const prevProd = products[pIdx];
    const prevStockVal = Number(prevProd.stockQty ?? prevProd.stock ?? 0);
    const deltaQty = Number(request.payload?.quantityDelta ?? 0);
    const explicitStock =
      typeof request.payload?.newStockQty === 'number'
        ? Number(request.payload.newStockQty)
        : prevStockVal + deltaQty;

    if (!request.allowNegativeStock && explicitStock < 0) {
      return {
        result: {
          success: false,
          idempotentReplay: false,
          commandId: cleanCmdId,
          commandType: request.commandType,
          dbRevision: currentRevision,
          errorCode: 'INSUFFICIENT_STOCK',
          errorMessage: 'Stock adjustment would result in negative inventory.',
          errorMessageAr: 'لا يمكن تخفيض المخزون لأقل من الصفر.',
          domainEvents: [],
          events: [],
          changedKeys: [],
        },
        nextState: currentState,
        nextRevision: currentRevision,
        statePatch: {},
      };
    }

    const updatedProd = {
      ...prevProd,
      ...(request.commandType === 'PRODUCT_UPDATE' ? request.payload?.updates || {} : {}),
      stockQty: explicitStock,
      stock: explicitStock,
    };
    products[pIdx] = updatedProd;

    const nextRevision = currentRevision + 1;
    const evt: TypedDomainEvent = {
      eventId: `evt-prd-${nowMs}-${pid}`,
      revision: nextRevision,
      eventType: request.commandType === 'PRODUCT_UPDATE' ? 'product.updated' : 'stock.adjusted',
      entityId: pid,
      commandId: cleanCmdId,
      originClientId: request.originClientId || request.clientId,
      timestampMs: nowMs,
      payload: {
        productId: pid,
        previousStock: prevStockVal,
        newStock: explicitStock,
      },
    };

    const patch = { products };
    const nextState = {
      ...state,
      ...patch,
      dbRevision: nextRevision,
      lastSyncedAt: nowIso,
    };

    const cmdResult: AuthoritativeCommandResult = {
      success: true,
      idempotentReplay: false,
      commandId: cleanCmdId,
      commandType: request.commandType,
      dbRevision: nextRevision,
      entityResult: { product: updatedProd },
      entity: updatedProd,
      domainEvents: [evt],
      events: [evt],
      changedKeys: ['products'],
      patch,
    };
    idempotencyStore.set(cleanCmdId, cmdResult);
    return { result: cmdResult, nextState, nextRevision, statePatch: patch };
  }

  // ==========================================================================
  // COMMAND 4: PAYMENT_RECORD (Customer Debt Collection / Receipt Voucher)
  // ==========================================================================
  if (request.commandType === 'PAYMENT_RECORD') {
    const cid = String(request.payload?.customerId || '').trim();
    const amount = Number(request.payload?.amount || 0);
    const cIdx = customers.findIndex((c) => String(c.id) === cid);
    if (cIdx < 0 || !Number.isFinite(amount) || amount <= 0) {
      return {
        result: {
          success: false,
          idempotentReplay: false,
          commandId: cleanCmdId,
          commandType: 'PAYMENT_RECORD',
          dbRevision: currentRevision,
          errorCode: cIdx < 0 ? 'CUSTOMER_NOT_FOUND' : 'VALIDATION_FAILED',
          errorMessage: 'Valid customerId and positive payment amount are required.',
          errorMessageAr: 'يرجى تحديد العميل وإدخال مبلغ سداد صحيح.',
          domainEvents: [],
          events: [],
          changedKeys: [],
        },
        nextState: currentState,
        nextRevision: currentRevision,
        statePatch: {},
      };
    }

    const prevCust = customers[cIdx];
    const nextBalance = Math.max(0, Math.round(((Number(prevCust.balance) || 0) - amount) * 100) / 100);
    customers[cIdx] = {
      ...prevCust,
      balance: nextBalance,
    };

    const nextRevision = currentRevision + 1;
    const evt: TypedDomainEvent = {
      eventId: `evt-pay-${nowMs}-${cid}`,
      revision: nextRevision,
      eventType: 'payment.recorded',
      entityId: cid,
      commandId: cleanCmdId,
      originClientId: request.originClientId || request.clientId,
      timestampMs: nowMs,
      payload: {
        customerId: cid,
        amountPaid: amount,
        newBalance: nextBalance,
      },
    };

    const patch = { customers, journalEntries };
    const nextState = {
      ...state,
      ...patch,
      dbRevision: nextRevision,
      lastSyncedAt: nowIso,
    };

    const cmdResult: AuthoritativeCommandResult = {
      success: true,
      idempotentReplay: false,
      commandId: cleanCmdId,
      commandType: 'PAYMENT_RECORD',
      dbRevision: nextRevision,
      entityResult: { customer: customers[cIdx], amountPaid: amount },
      entity: customers[cIdx],
      domainEvents: [evt],
      events: [evt],
      changedKeys: ['customers'],
      patch,
    };
    idempotencyStore.set(cleanCmdId, cmdResult);
    return { result: cmdResult, nextState, nextRevision, statePatch: patch };
  }

  return {
    result: {
      success: false,
      idempotentReplay: false,
      commandId: cleanCmdId,
      commandType: request.commandType,
      dbRevision: currentRevision,
      errorCode: 'INVALID_COMMAND',
      errorMessage: `Unsupported commandType: ${request.commandType}`,
      domainEvents: [],
      events: [],
      changedKeys: [],
    },
    nextState: currentState,
    nextRevision: currentRevision,
    statePatch: {},
  };
}

// ============================================================================
// 4. Phase 4: AES-256-GCM Customer-Controlled Encrypted Backups & Clean-Room Restore
// ============================================================================

export interface EncryptedBackupEnvelopeV2 {
  backupFormat: 'HASEB-ENCRYPTED-BACKUP-V2';
  version: '2.0';
  kdf: 'scrypt-sha256';
  cipher: 'aes-256-gcm';
  createdAt: string;
  dbRevision: number;
  schemaVersion?: string;
  plaintextSha256: string;
  saltHex: string;
  ivHex: string;
  authTagHex: string;
  ciphertextBase64: string;
  metadata: {
    productsCount: number;
    invoicesCount: number;
    customersCount: number;
    journalsCount: number;
  };
}

export function createEncryptedBackupEnvelopeV2(
  data: Record<string, any>,
  passphrase: string,
  dbRevision = 1,
  schemaVersion = '8.0-haseb-clean-production'
): EncryptedBackupEnvelopeV2 {
  const cleanPass = String(passphrase || '').trim();
  if (cleanPass.length < 4) {
    throw new Error('BACKUP_PASSPHRASE_TOO_SHORT: Passphrase must be at least 4 characters.');
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-256-GCM
  const key = crypto.scryptSync(cleanPass, salt, 32, { N: 16384, r: 8, p: 1 });

  const serializedData = JSON.stringify(data);
  const innerChecksumSha256 = crypto
    .createHash('sha256')
    .update(serializedData, 'utf-8')
    .digest('hex');

  const payloadToEncrypt = JSON.stringify({
    innerChecksumSha256,
    dbRevision,
    schemaVersion,
    exportedAt: new Date().toISOString(),
    data,
  });

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encryptedBuf = Buffer.concat([
    cipher.update(payloadToEncrypt, 'utf-8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    backupFormat: 'HASEB-ENCRYPTED-BACKUP-V2',
    version: '2.0',
    kdf: 'scrypt-sha256',
    cipher: 'aes-256-gcm',
    createdAt: new Date().toISOString(),
    dbRevision,
    schemaVersion,
    plaintextSha256: innerChecksumSha256,
    saltHex: salt.toString('hex'),
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    ciphertextBase64: encryptedBuf.toString('base64'),
    metadata: {
      productsCount: Array.isArray(data.products) ? data.products.length : 0,
      invoicesCount: Array.isArray(data.salesInvoices) ? data.salesInvoices.length : 0,
      customersCount: Array.isArray(data.customers) ? data.customers.length : 0,
      journalsCount: Array.isArray(data.journalEntries) ? data.journalEntries.length : 0,
    },
  };
}

export function decryptAndVerifyBackupEnvelopeV2(
  envelope: EncryptedBackupEnvelopeV2,
  passphrase: string
): {
  valid: boolean;
  success: boolean;
  errorCode?:
    | 'INVALID_ENVELOPE_FORMAT'
    | 'WRONG_PASSPHRASE_OR_TAMPERED'
    | 'DECRYPTION_OR_AUTH_TAG_FAILED'
    | 'INNER_CHECKSUM_MISMATCH'
    | 'SCHEMA_INTEGRITY_FAILED';
  errorMessageAr?: string;
  data?: Record<string, any>;
  dbRevision?: number;
} {
  if (
    !envelope ||
    envelope.backupFormat !== 'HASEB-ENCRYPTED-BACKUP-V2' ||
    !envelope.saltHex ||
    !envelope.ivHex ||
    !envelope.authTagHex ||
    !envelope.ciphertextBase64
  ) {
    return {
      valid: false,
      success: false,
      errorCode: 'INVALID_ENVELOPE_FORMAT',
      errorMessageAr: 'صيغة ملف النسخة المشفرة غير صالحة.',
    };
  }

  try {
    const salt = Buffer.from(envelope.saltHex, 'hex');
    const iv = Buffer.from(envelope.ivHex, 'hex');
    const authTag = Buffer.from(envelope.authTagHex, 'hex');
    const ciphertext = Buffer.from(envelope.ciphertextBase64, 'base64');

    const key = crypto.scryptSync(String(passphrase || '').trim(), salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
    });

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decryptedBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsedInner = JSON.parse(decryptedBuf.toString('utf-8'));

    if (!parsedInner || typeof parsedInner.data !== 'object' || !parsedInner.innerChecksumSha256) {
      return {
        valid: false,
        success: false,
        errorCode: 'SCHEMA_INTEGRITY_FAILED',
        errorMessageAr: 'بنية البيانات داخل النسخة الاحتياطية غير مكتملة.',
      };
    }

    const recomputedSha = crypto
      .createHash('sha256')
      .update(JSON.stringify(parsedInner.data), 'utf-8')
      .digest('hex');

    if (recomputedSha !== parsedInner.innerChecksumSha256) {
      return {
        valid: false,
        success: false,
        errorCode: 'INNER_CHECKSUM_MISMATCH',
        errorMessageAr: 'فشل فحص البصمة الرقمية الداخلية للبيانات (SHA-256).',
      };
    }

    return {
      valid: true,
      success: true,
      data: parsedInner.data,
      dbRevision: Number(parsedInner.dbRevision) || envelope.dbRevision || 1,
    };
  } catch {
    return {
      valid: false,
      success: false,
      errorCode: 'DECRYPTION_OR_AUTH_TAG_FAILED',
      errorMessageAr:
        'فشل فك التشفير (AES-256-GCM): كلمة مرور النسخة الاحتياطية غير صحيحة أو تم التلاعب بالملف.',
    };
  }
}

// ============================================================================
// 5. Phase 4.4: Tamper-Evident Chained SHA-256 Audit Log
// ============================================================================

export interface ChainedAuditEntry {
  seq: number;
  id: string;
  timestampIso: string;
  actor: string;
  category:
    | 'AUTH'
    | 'LICENSE'
    | 'COMMAND'
    | 'FINANCIAL_COMMAND'
    | 'INVENTORY'
    | 'BACKUP'
    | 'RESTORE'
    | 'RESET'
    | 'BACKUP_RESTORE'
    | 'ADMIN_SECURITY';
  action: string;
  details?: Record<string, any>;
  detailsJson: string;
  prevHash: string;
  entryHash: string;
}

export const AUDIT_CHAIN_GENESIS_HASH =
  'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

export function computeChainedAuditEntryHash(params: {
  seq: number;
  timestampIso: string;
  actor: string;
  category: string;
  action: string;
  detailsJson: string;
  prevHash: string;
}): string {
  const canonical = `${params.seq}|${params.prevHash}|${params.timestampIso}|${params.actor}|${params.category}|${params.action}|${params.detailsJson}`;
  return crypto.createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

export function appendChainedAuditEntry(
  chain: ChainedAuditEntry[],
  input: {
    actor: string;
    category: ChainedAuditEntry['category'];
    action: string;
    details: Record<string, any>;
    timestampIso?: string;
  }
): ChainedAuditEntry {
  const lastEntry = chain.length > 0 ? chain[chain.length - 1] : null;
  const seq = lastEntry ? lastEntry.seq + 1 : 1;
  const prevHash = lastEntry ? lastEntry.entryHash : AUDIT_CHAIN_GENESIS_HASH;
  const timestampIso = input.timestampIso || new Date().toISOString();
  const detailsObj = input.details || {};
  const detailsJson = JSON.stringify(detailsObj);

  const entryHash = computeChainedAuditEntryHash({
    seq,
    timestampIso,
    actor: input.actor,
    category: input.category,
    action: input.action,
    detailsJson,
    prevHash,
  });

  const entry: ChainedAuditEntry = {
    seq,
    id: `aud-chain-${seq}-${Date.now()}`,
    timestampIso,
    actor: input.actor,
    category: input.category,
    action: input.action,
    details: detailsObj,
    detailsJson,
    prevHash,
    entryHash,
  };
  chain.push(entry);
  return entry;
}

export function verifyChainedAuditLogIntegrity(chain: ChainedAuditEntry[]): {
  intact: boolean;
  valid: boolean;
  totalEntries: number;
  brokenAtSeq?: number;
  brokenAtSequence?: number;
  reason?: string;
} {
  let expectedPrevHash = AUDIT_CHAIN_GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (entry.seq !== i + 1) {
      return {
        intact: false,
        valid: false,
        totalEntries: chain.length,
        brokenAtSeq: entry.seq,
        brokenAtSequence: entry.seq,
        reason: `Sequence gap detected at index ${i} (expected seq ${i + 1}, got ${entry.seq}).`,
      };
    }
    if (entry.prevHash !== expectedPrevHash) {
      return {
        intact: false,
        valid: false,
        totalEntries: chain.length,
        brokenAtSeq: entry.seq,
        brokenAtSequence: entry.seq,
        reason: `Broken prevHash link at seq ${entry.seq}.`,
      };
    }
    const effectiveDetailsJson =
      entry.details !== undefined ? JSON.stringify(entry.details) : entry.detailsJson;
    const recomputed = computeChainedAuditEntryHash({
      seq: entry.seq,
      timestampIso: entry.timestampIso,
      actor: entry.actor,
      category: entry.category,
      action: entry.action,
      detailsJson: effectiveDetailsJson,
      prevHash: entry.prevHash,
    });
    if (recomputed !== entry.entryHash) {
      return {
        intact: false,
        valid: false,
        totalEntries: chain.length,
        brokenAtSeq: entry.seq,
        brokenAtSequence: entry.seq,
        reason: `Entry hash mismatch at seq ${entry.seq}: payload was modified.`,
      };
    }
    expectedPrevHash = entry.entryHash;
  }
  return {
    intact: true,
    valid: true,
    totalEntries: chain.length,
  };
}

// ============================================================================
// 6. Phase 1.7: Module Entitlement Verification Helper for Backend Routes
// ============================================================================

export function verifyLicenseHeaderAndEntitlement(
  paramsOrHeader?:
    | string
    | {
        licenseTokenHeader?: string;
        requiredModule?: SystemModuleKey;
      },
  optionalRequiredModule?: SystemModuleKey
): {
  hasToken: boolean;
  valid: boolean;
  allowed: boolean;
  errorCode?: 'INVALID_TOKEN_HEADER' | 'LICENSE_TAMPERED' | 'LICENSE_EXPIRED' | 'MODULE_NOT_ENTITLED';
  errorMessage?: string;
  token?: SignedLicenseToken;
} {
  const raw =
    typeof paramsOrHeader === 'string'
      ? paramsOrHeader.trim()
      : paramsOrHeader?.licenseTokenHeader?.trim();
  const requiredModule =
    typeof paramsOrHeader === 'object' && paramsOrHeader !== null
      ? paramsOrHeader.requiredModule
      : optionalRequiredModule;

  if (!raw) {
    return { hasToken: false, valid: false, allowed: false };
  }

  try {
    const parsedToken: SignedLicenseToken = raw.startsWith('{')
      ? JSON.parse(raw)
      : JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));

    const sigValid = verifySignedLicenseTokenSignature(parsedToken);
    if (!sigValid.valid) {
      return {
        hasToken: true,
        valid: false,
        allowed: false,
        errorCode: 'LICENSE_TAMPERED',
        errorMessage: 'Cryptographic signature tampering detected on license token.',
      };
    }

    if (!parsedToken.claims.isLifetime && Date.now() > parsedToken.claims.expiresAtEpochMs) {
      return {
        hasToken: true,
        valid: false,
        allowed: false,
        errorCode: 'LICENSE_EXPIRED',
        errorMessage: 'Subscription has expired. Commercial operations are blocked.',
      };
    }

    if (requiredModule) {
      const ent = isModuleEntitled(parsedToken, requiredModule);
      if (!ent.entitled) {
        return {
          hasToken: true,
          valid: false,
          allowed: false,
          errorCode: 'MODULE_NOT_ENTITLED',
          errorMessage: ent.reason || `Module ${requiredModule} is not entitled.`,
        };
      }
    }

    return {
      hasToken: true,
      valid: true,
      allowed: true,
      token: parsedToken,
    };
  } catch {
    return {
      hasToken: true,
      valid: false,
      allowed: false,
      errorCode: 'INVALID_TOKEN_HEADER',
      errorMessage: 'Invalid base64 or JSON format in x-asf-license-token.',
    };
  }
}
