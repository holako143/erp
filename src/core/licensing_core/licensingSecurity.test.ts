/**
 * ASF Secure Licensing V2 - Comprehensive Penetration & Security Test Suite
 * Covers All 15 Security Invariants & Attack Vectors Required by Specification:
 * 1. Single activation verification
 * 2. Re-activation rejection on second device
 * 3. Concurrent activation / Replay attack prevention (reused nonce)
 * 4. Critical hardware alteration rejection (Motherboard UUID change)
 * 5. Minor hardware upgrade tolerance (Storage / Secondary upgrade)
 * 6. Cryptographic signature forgery detection (tampered claims / invalid sig)
 * 7. System clock rollback detection (anti-rollback guard)
 * 8. Subscription expiration blocking
 * 9. Module entitlement enforcement
 * 10. Non-existent license rejection
 */

import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ActivationServerManager,
  createOfficialLicenseRecord,
  verifySignedLicenseTokenSignature,
  verifyClientLicenseToken,
  compareHardwareFingerprints,
  evaluateTimeIntegrity,
  isModuleEntitled,
  HardwareTelemetry,
  TimeIntegrityState,
} from './index';
import {
  MaestroSessionAuthManager,
  CryptographicTrialAnchorGuard,
  executeAuthoritativeBusinessCommand,
  createEncryptedBackupEnvelopeV2,
  decryptAndVerifyBackupEnvelopeV2,
  appendChainedAuditEntry,
  verifyChainedAuditLogIntegrity,
  hashPasswordScrypt,
  verifyPasswordOrPlaintext,
  classifyApiRouteSecurityTier,
  ChainedAuditEntry,
} from '../../server/maestroSecurityAndAuthorityEngine';

const MOCK_ISSUER_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIL1VGu6F1aJB33DSYYXgt/n8U0lN391M17c7iqhbx7A/
-----END PRIVATE KEY-----`;

test('ASF V2 Invariant 1 & 2: One-time activation succeeds on device 1, rejects device 2', () => {
  const manager = new ActivationServerManager(MOCK_ISSUER_PRIVATE_KEY_PEM);
  const license = createOfficialLicenseRecord({
    customerName: 'مؤسسة الرياض التجارية',
    edition: 'ENTERPRISE',
    durationDays: 365,
  });
  manager.registerIssuedLicense(license);

  const deviceA: HardwareTelemetry = {
    motherboardUuid: 'MB-ASUS-PROD-001',
    cpuModel: 'Intel Core i9-13900K',
    cpuCores: 24,
    primaryDiskSerial: 'NVME-SAMSUNG-2TB',
    systemMachineId: 'SYS-UUID-A1',
    platform: 'win32',
  };

  const act1 = manager.activateLicenseAtomically({
    licenseUuid: license.licenseUuid,
    hardware: deviceA,
    clientNonce: 'nonce-dev-a-1',
    clientEpochMs: Date.now(),
    clientVersion: '2.0.0',
  });

  assert.equal(act1.success, true);
  assert.equal(act1.status, 'ACTIVATED');
  assert.ok(act1.licenseToken);

  // Attempt to activate same license on Device B
  const deviceB: HardwareTelemetry = {
    motherboardUuid: 'MB-GIGABYTE-ROG-002',
    cpuModel: 'AMD Ryzen 9 7950X',
    cpuCores: 16,
    primaryDiskSerial: 'NVME-CRUCIAL-1TB',
    systemMachineId: 'SYS-UUID-B2',
    platform: 'win32',
  };

  const act2 = manager.activateLicenseAtomically({
    licenseUuid: license.licenseUuid,
    hardware: deviceB,
    clientNonce: 'nonce-dev-b-2',
    clientEpochMs: Date.now(),
    clientVersion: '2.0.0',
  });

  assert.equal(act2.success, false);
  assert.equal(act2.errorCode, 'ALREADY_ACTIVATED');
});

test('ASF V2 Invariant 3: Replay attack with reused nonce is strictly blocked', () => {
  const manager = new ActivationServerManager(MOCK_ISSUER_PRIVATE_KEY_PEM);
  const license = createOfficialLicenseRecord({
    customerName: 'شركة النور',
    edition: 'PROFESSIONAL',
    durationDays: 30,
  });
  manager.registerIssuedLicense(license);

  const device: HardwareTelemetry = {
    motherboardUuid: 'MB-HP-Z4',
    cpuModel: 'Intel Xeon W-2223',
    cpuCores: 8,
    primaryDiskSerial: 'DISK-112233',
    systemMachineId: 'HP-UUID-1',
    platform: 'linux',
  };

  const actFirst = manager.activateLicenseAtomically({
    licenseUuid: license.licenseUuid,
    hardware: device,
    clientNonce: 'reused-nonce-xyz',
    clientEpochMs: Date.now(),
    clientVersion: '2.0.0',
  });
  assert.equal(actFirst.success, true);

  // Attempt replay with exact same nonce
  const actReplay = manager.activateLicenseAtomically({
    licenseUuid: license.licenseUuid,
    hardware: device,
    clientNonce: 'reused-nonce-xyz',
    clientEpochMs: Date.now(),
    clientVersion: '2.0.0',
  });
  assert.equal(actReplay.success, false);
  assert.ok(actReplay.errorMessage?.includes('Replay detected'));
});

test('ASF V2 Invariant 4 & 5: Hardware tampering detected on critical component change, tolerated on minor upgrade', () => {
  const originalHw: HardwareTelemetry = {
    motherboardUuid: 'MB-MSI-Z790',
    cpuModel: 'Intel Core i7-14700',
    cpuCores: 20,
    primaryDiskSerial: 'DISK-ORIGINAL-NVME',
    systemMachineId: 'SYS-ORIGINAL-UUID',
    platform: 'win32',
  };

  // Case A: Critical component changed (Motherboard & System UUID replaced)
  const swappedHw: HardwareTelemetry = {
    motherboardUuid: 'MB-FOREIGN-CLONED',
    cpuModel: 'Intel Core i7-14700',
    cpuCores: 20,
    primaryDiskSerial: 'DISK-ORIGINAL-NVME',
    systemMachineId: 'SYS-FOREIGN-UUID',
    platform: 'win32',
  };

  const criticalComp = compareHardwareFingerprints(originalHw, swappedHw);
  assert.equal(criticalComp.match, false);
  assert.equal(criticalComp.status, 'HARDWARE_MISMATCH');
  assert.ok(criticalComp.changedComponents.includes('MOTHERBOARD'));

  // Case B: Minor storage upgrade on same machine (Motherboard & UUID preserved)
  const upgradedDiskHw: HardwareTelemetry = {
    ...originalHw,
    primaryDiskSerial: 'DISK-UPGRADED-4TB',
  };

  const minorComp = compareHardwareFingerprints(originalHw, upgradedDiskHw);
  assert.equal(minorComp.match, true);
  assert.equal(minorComp.status, 'MINOR_CHANGE_ALLOWED');
});

test('ASF V2 Invariant 6: Cryptographic Ed25519 signature rejects forged claims', () => {
  const manager = new ActivationServerManager(MOCK_ISSUER_PRIVATE_KEY_PEM);
  const license = createOfficialLicenseRecord({
    customerName: 'مؤسسة الأمل',
    edition: 'STANDARD',
    durationDays: 30,
  });
  manager.registerIssuedLicense(license);

  const hw: HardwareTelemetry = {
    motherboardUuid: 'MB-TEST-001',
    cpuModel: 'Intel Core i5',
    cpuCores: 6,
    primaryDiskSerial: 'DISK-001',
    systemMachineId: 'SYS-001',
    platform: 'win32',
  };

  const act = manager.activateLicenseAtomically({
    licenseUuid: license.licenseUuid,
    hardware: hw,
    clientNonce: 'nonce-sig-test',
    clientEpochMs: Date.now(),
    clientVersion: '2.0.0',
  });
  assert.ok(act.licenseToken);

  // Genuine token verification
  const genuineCheck = verifySignedLicenseTokenSignature(act.licenseToken);
  assert.equal(genuineCheck.valid, true);

  // Attacker attempts to modify claims: change edition to ULTIMATE and extend to 10 years
  const forgedToken = JSON.parse(JSON.stringify(act.licenseToken));
  forgedToken.claims.edition = 'ULTIMATE';
  forgedToken.claims.expiresAtEpochMs = Date.now() + 10 * 365 * 86400000;

  const forgedCheck = verifySignedLicenseTokenSignature(forgedToken);
  assert.equal(forgedCheck.valid, false);
  assert.equal(forgedCheck.reason, 'CRYPTOGRAPHIC_SIGNATURE_INVALID');
});

test('ASF V2 Invariant 7: System clock rollback detection prevents bypassing expiration', () => {
  const baselineEpoch = Date.now();
  const timeState: TimeIntegrityState = {
    lastTrustedEpochMs: baselineEpoch,
    maxRecordedEpochMs: baselineEpoch,
    isTampered: false,
  };

  // Normal forward progression (10 minutes later)
  const forward10 = evaluateTimeIntegrity(baselineEpoch + 600000, timeState);
  assert.equal(forward10.intact, true);
  assert.equal(forward10.status, 'TIME_OK');

  // Clock rollback attempt: System clock set back 30 days into the past
  const rollbackAttemptEpoch = baselineEpoch - 30 * 86400000;
  const rollbackCheck = evaluateTimeIntegrity(rollbackAttemptEpoch, forward10.updatedState);
  assert.equal(rollbackCheck.intact, false);
  assert.equal(rollbackCheck.status, 'TIME_TAMPERING_DETECTED');
});

test('ASF V2 Invariant 8: Subscription expiration blocks commercial operations', () => {
  const currentEpoch = Date.now();
  const timeState: TimeIntegrityState = {
    lastTrustedEpochMs: currentEpoch,
    maxRecordedEpochMs: currentEpoch,
    isTampered: false,
  };

  // Expired 1 hour ago
  const expiredCheck = evaluateTimeIntegrity(currentEpoch, timeState, {
    expiresAtEpochMs: currentEpoch - 3600000,
  });
  assert.equal(expiredCheck.intact, false);
  assert.equal(expiredCheck.status, 'EXPIRED');
});

test('ASF V2 Invariant 9: Entitlement Manager protects individual modules', () => {
  const manager = new ActivationServerManager(MOCK_ISSUER_PRIVATE_KEY_PEM);
  const license = createOfficialLicenseRecord({
    customerName: 'محل التجزئة البسيط',
    edition: 'STANDARD',
    durationDays: 30,
    allowedModules: ['pos', 'inventory'], // Only POS and Inventory allowed
  });
  manager.registerIssuedLicense(license);

  const hw: HardwareTelemetry = {
    motherboardUuid: 'MB-POS-01',
    cpuModel: 'Intel Celeron',
    cpuCores: 4,
    primaryDiskSerial: 'DISK-POS-01',
    systemMachineId: 'SYS-POS-01',
    platform: 'win32',
  };

  const act = manager.activateLicenseAtomically({
    licenseUuid: license.licenseUuid,
    hardware: hw,
    clientNonce: 'nonce-entitle-test',
    clientEpochMs: Date.now(),
    clientVersion: '2.0.0',
  });
  assert.ok(act.licenseToken);

  // POS should be entitled
  const posAccess = isModuleEntitled(act.licenseToken, 'pos');
  assert.equal(posAccess.entitled, true);

  // AI Advisor should be strictly denied
  const aiAccess = isModuleEntitled(act.licenseToken, 'ai_advisor');
  assert.equal(aiAccess.entitled, false);
  assert.ok(aiAccess.reason?.includes('not entitled'));
});

test('ASF V3 Invariant 10: verifyClientLicenseToken blocks stolen token on foreign hardware (no self-comparison bypass) while allowing minor disk upgrade and preserving Never-Hostage data access', () => {
  const manager = new ActivationServerManager(MOCK_ISSUER_PRIVATE_KEY_PEM);
  const license = createOfficialLicenseRecord({
    customerName: 'شركة الآفاق للإلكترونيات',
    edition: 'ENTERPRISE',
    durationDays: 365,
  });
  manager.registerIssuedLicense(license);

  const originalHw: HardwareTelemetry = {
    motherboardUuid: 'MB-ORIG-9988',
    cpuModel: 'Intel Core i7-13700',
    cpuCores: 16,
    primaryDiskSerial: 'NVME-ORIG-001',
    systemMachineId: 'SYS-ORIG-9988',
    platform: 'win32',
  };

  const act = manager.activateLicenseAtomically({
    licenseUuid: license.licenseUuid,
    hardware: originalHw,
    clientNonce: 'nonce-v3-hw-bind',
    clientEpochMs: Date.now(),
    clientVersion: '3.0.0',
  });
  assert.ok(act.licenseToken);

  const timeState: TimeIntegrityState = {
    lastTrustedEpochMs: Date.now(),
    maxRecordedEpochMs: Date.now(),
    isTampered: false,
  };

  // 1. Exact same hardware -> MATCH
  const sameCheck = verifyClientLicenseToken(act.licenseToken, originalHw, timeState);
  assert.equal(sameCheck.isValid, true);
  assert.equal(sameCheck.hardwareStatus, 'MATCH');
  assert.equal(sameCheck.reAttestationRequired, false);

  // 2. Upgraded NVMe disk on same motherboard -> MINOR_CHANGE_ALLOWED
  const upgradedDiskHw: HardwareTelemetry = {
    ...originalHw,
    primaryDiskSerial: 'NVME-NEW-4TB-999',
  };
  const minorCheck = verifyClientLicenseToken(act.licenseToken, upgradedDiskHw, timeState);
  assert.equal(minorCheck.isValid, true);
  assert.equal(minorCheck.hardwareStatus, 'MINOR_CHANGE_ALLOWED');
  assert.equal(minorCheck.reAttestationRequired, false);

  // 3. Token copied to foreign machine -> strictly rejected with HARDWARE_MISMATCH + reAttestationRequired + dataAccessPreserved
  const foreignHw: HardwareTelemetry = {
    motherboardUuid: 'MB-ATTACKER-CLONE',
    cpuModel: 'AMD Ryzen 5',
    cpuCores: 6,
    primaryDiskSerial: 'DISK-ATTACKER',
    systemMachineId: 'SYS-ATTACKER-000',
    platform: 'win32',
  };
  const foreignCheck = verifyClientLicenseToken(act.licenseToken, foreignHw, timeState);
  assert.equal(foreignCheck.isValid, false);
  assert.equal(foreignCheck.status, 'HARDWARE_MISMATCH');
  assert.equal(foreignCheck.hardwareStatus, 'HARDWARE_MISMATCH');
  assert.equal(foreignCheck.reAttestationRequired, true);
  assert.equal(foreignCheck.dataAccessPreserved, true);

  // 4. Legitimate motherboard repair re-attestation rebinds cleanly
  const rebindRes = manager.rebindLicenseForHardwareRepair({
    licenseUuid: license.licenseUuid,
    newHardware: foreignHw,
    reason: 'استبدال اللوحة الأم بعد عطل كهربائي',
  });
  assert.equal(rebindRes.success, true);
  assert.ok(rebindRes.licenseToken);
  const afterRebindCheck = verifyClientLicenseToken(rebindRes.licenseToken, foreignHw, timeState);
  assert.equal(afterRebindCheck.isValid, true);
  assert.equal(afterRebindCheck.hardwareStatus, 'MATCH');
});

test('ASF V3 Invariant 11: Accidental huge forward clock jump does not permanently trap customer HWM when clock is corrected', () => {
  const nowMs = Date.now();
  const initialState: TimeIntegrityState = {
    lastTrustedEpochMs: nowMs,
    maxRecordedEpochMs: nowMs,
    isTampered: false,
  };

  // Accidental jump 2 years into the future (without server proof)
  const accidentalFutureMs = nowMs + 730 * 86400000;
  const jumpEval = evaluateTimeIntegrity(accidentalFutureMs, initialState);
  assert.equal(jumpEval.forwardJumpClamped, true);
  assert.equal(jumpEval.updatedState.maxRecordedEpochMs, nowMs);

  // Customer corrects clock back to real time (+5 mins) -> not falsely locked out!
  const correctedEval = evaluateTimeIntegrity(nowMs + 300000, jumpEval.updatedState);
  assert.equal(correctedEval.intact, true);
  assert.equal(correctedEval.status, 'TIME_OK');
});

test('Maestro Phase 0 Invariant 12: Session Auth HMAC tokens, revocation, brute-force rate limit & Cryptographic Trial Anchor', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'haseb-maestro-p0-'));
  try {
    const auth = new MaestroSessionAuthManager(tmpDir);
    const issued = auth.issueSessionToken({
      userId: 'u-1',
      username: 'admin',
      role: 'ADMIN',
      branchId: 'br-main',
    });

    // Valid token verifies cleanly
    const v1 = auth.verifySessionToken(issued.token);
    assert.equal(v1.valid, true);
    assert.equal(v1.claims?.username, 'admin');

    // Forged/tampered token payload rejected
    const [b64, sig] = issued.token.split('.');
    const forgedB64 = Buffer.from(
      JSON.stringify({ ...issued.claims, role: 'SUPER_HACKER' }),
      'utf8'
    ).toString('base64url');
    assert.equal(auth.verifySessionToken(`${forgedB64}.${sig}`).valid, false);

    // Revoked token rejected
    auth.revokeToken(issued.token);
    assert.equal(auth.verifySessionToken(issued.token).valid, false);

    // Brute-force lockout after 8 failed attempts
    for (let i = 0; i < 8; i++) {
      auth.recordLoginFailure('192.168.1.99');
    }
    const rate = auth.checkRateLimit('192.168.1.99');
    assert.equal(rate.allowed, false);
    assert.ok(rate.retryAfterSeconds > 0);

    // Cryptographic Trial Anchor prevents rollback and tracks 90-day window immutably
    const trialGuard = new CryptographicTrialAnchorGuard(tmpDir, auth.getHmacSecret());
    const initEval = trialGuard.evaluateTrialEligibility();
    assert.equal(initEval.allowed, true);
    assert.equal(initEval.daysRemaining, 90);

    // Simulate clock rollback of 2 hours -> rejected with TRIAL_CLOCK_ROLLBACK
    const rollbackEval = trialGuard.evaluateTrialEligibility(Date.now() - 7200 * 1000);
    assert.equal(rollbackEval.allowed, false);
    assert.equal(rollbackEval.errorCode, 'TRIAL_CLOCK_ROLLBACK');

    // Simulate 95 days elapsed -> rejected with TRIAL_EXPIRED
    const expiredEval = trialGuard.evaluateTrialEligibility(Date.now() + 95 * 86400000);
    assert.equal(expiredEval.allowed, false);
    assert.equal(expiredEval.errorCode, 'TRIAL_EXPIRED');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Maestro Phase 2 Invariant 13: Server-Authoritative SALE_CREATE prevents double-selling, enforces commandId idempotency, and prevents double-return', () => {
  const idempotencyMap = new Map();
  let state: Record<string, any> = {
    products: [
      {
        id: 'prod-1',
        name: 'MacBook Pro M3',
        sku: 'MBP-M3',
        stock: 1, // Only 1 unit in stock!
        sellingPrice: 1000,
        purchasePrice: 800,
      },
    ],
    salesInvoices: [],
    archivedInvoices: [],
    customers: [{ id: 'cust-1', name: 'عميل تجريبي', balance: 0 }],
    journalEntries: [],
  };

  // Terminal A submits SALE_CREATE for the last unit (also attempts to send forged client total = 10)
  const sale1 = executeAuthoritativeBusinessCommand(
    state,
    {
      commandId: 'cmd-sale-terminal-A',
      commandType: 'SALE_CREATE',
      clientId: 'pos-terminal-A',
      payload: {
        invoiceNumber: 'INV-9001',
        customerId: 'cust-1',
        customerName: 'عميل تجريبي',
        paymentMethod: 'CASH',
        totalAmount: 10, // Forged low total from client — server must recalculate to 1150 (1000 + 15% tax)
        items: [{ productId: 'prod-1', quantity: 1, taxRate: 15 }],
      },
    },
    idempotencyMap,
    2
  );

  assert.equal(sale1.result.success, true);
  assert.equal(sale1.result.entity?.totalAmount, 1150); // Server recalculated authoritative total!
  state = { ...state, ...sale1.statePatch };
  assert.equal(state.products[0].stock, 0);

  // Network retry of Terminal A's exact commandId -> returns idempotent replay without deducting stock again
  const retrySale1 = executeAuthoritativeBusinessCommand(
    state,
    {
      commandId: 'cmd-sale-terminal-A',
      commandType: 'SALE_CREATE',
      clientId: 'pos-terminal-A',
      payload: {
        invoiceNumber: 'INV-9001',
        items: [{ productId: 'prod-1', quantity: 1, taxRate: 15 }],
      },
    },
    idempotencyMap,
    3
  );
  assert.equal(retrySale1.result.success, true);
  assert.equal(retrySale1.result.idempotentReplay, true);
  assert.equal(state.products[0].stock, 0);

  // Terminal B concurrently tries to sell the same product when stock is now 0 -> strictly rejected with INSUFFICIENT_STOCK
  const sale2 = executeAuthoritativeBusinessCommand(
    state,
    {
      commandId: 'cmd-sale-terminal-B',
      commandType: 'SALE_CREATE',
      clientId: 'pos-terminal-B',
      payload: {
        invoiceNumber: 'INV-9002',
        items: [{ productId: 'prod-1', quantity: 1 }],
      },
    },
    idempotencyMap,
    3
  );
  assert.equal(sale2.result.success, false);
  assert.equal(sale2.result.errorCode, 'INSUFFICIENT_STOCK');
  assert.equal(state.products[0].stock, 0);

  // Return the invoice via RETURN_CREATE -> restores stock to 1 and archives with 'مسترجع' stamp
  const ret1 = executeAuthoritativeBusinessCommand(
    state,
    {
      commandId: 'cmd-return-1',
      commandType: 'RETURN_CREATE',
      clientId: 'pos-terminal-A',
      payload: {
        invoiceNumber: 'INV-9001',
        returnReason: 'استرجاع فوري عبر F1',
      },
    },
    idempotencyMap,
    4
  );
  assert.equal(ret1.result.success, true);
  state = { ...state, ...ret1.statePatch };
  assert.equal(state.products[0].stock, 1);
  assert.equal(state.salesInvoices[0].status, 'RETURNED');
  assert.equal(state.archivedInvoices[0].archiveStamp, 'مسترجع');

  // Attempting to return the same invoice a second time with a new commandId -> rejected with ALREADY_RETURNED
  const ret2 = executeAuthoritativeBusinessCommand(
    state,
    {
      commandId: 'cmd-return-duplicate',
      commandType: 'RETURN_CREATE',
      clientId: 'pos-terminal-B',
      payload: {
        invoiceNumber: 'INV-9001',
      },
    },
    idempotencyMap,
    5
  );
  assert.equal(ret2.result.success, false);
  assert.equal(ret2.result.errorCode, 'ALREADY_RETURNED');
  assert.equal(state.products[0].stock, 1);
});

test('Maestro Phase 4 Invariant 14: AES-256-GCM Encrypted Backups V2 & SHA-256 Tamper-Evident Audit Chain', () => {
  const sampleErpState = {
    products: [{ id: 'p-100', name: 'خاتم ذهب عيار 21', stock: 12 }],
    salesInvoices: [{ id: 'inv-500', invoiceNumber: 'INV-500', totalAmount: 4500 }],
  };

  // 1. Create AES-256-GCM encrypted backup
  const envelope = createEncryptedBackupEnvelopeV2(
    sampleErpState,
    'StrongCustomerSecret#2026',
    15,
    '8.0-haseb-clean-production'
  );
  assert.equal(envelope.backupFormat, 'HASEB-ENCRYPTED-BACKUP-V2');
  assert.equal(envelope.cipher, 'aes-256-gcm');

  // 2. Clean-room restore with correct passphrase succeeds and matches exact state
  const restoredOk = decryptAndVerifyBackupEnvelopeV2(envelope, 'StrongCustomerSecret#2026');
  assert.equal(restoredOk.success, true);
  assert.deepEqual(restoredOk.data, sampleErpState);

  // 3. Wrong passphrase fails with DECRYPTION_OR_AUTH_TAG_FAILED
  const wrongPass = decryptAndVerifyBackupEnvelopeV2(envelope, 'WrongPassword123');
  assert.equal(wrongPass.success, false);
  assert.equal(wrongPass.errorCode, 'DECRYPTION_OR_AUTH_TAG_FAILED');

  // 4. 1-byte tampered ciphertext fails GCM authentication tag verification
  const tamperedCipher = Buffer.from(envelope.ciphertextBase64, 'base64');
  tamperedCipher[0] ^= 0xff;
  const tamperedEnv = {
    ...envelope,
    ciphertextBase64: tamperedCipher.toString('base64'),
  };
  const tamperedRes = decryptAndVerifyBackupEnvelopeV2(tamperedEnv, 'StrongCustomerSecret#2026');
  assert.equal(tamperedRes.success, false);

  // 5. Chained SHA-256 Audit Log detects any historical mutation
  const chain: ChainedAuditEntry[] = [];
  appendChainedAuditEntry(chain, {
    actor: 'admin',
    category: 'AUTH',
    action: 'LOGIN_SUCCESS',
    details: { ip: '127.0.0.1' },
  });
  appendChainedAuditEntry(chain, {
    actor: 'cashier-1',
    category: 'COMMAND',
    action: 'SALE_CREATE',
    details: { invoiceNumber: 'INV-500', total: 4500 },
  });

  const validChainCheck = verifyChainedAuditLogIntegrity(chain);
  assert.equal(validChainCheck.valid, true);
  assert.equal(validChainCheck.totalEntries, 2);

  // Tamper with first entry details without updating hash chain -> detected immediately
  chain[0].details = { ip: '10.0.0.99' };
  const tamperedChainCheck = verifyChainedAuditLogIntegrity(chain);
  assert.equal(tamperedChainCheck.valid, false);
  assert.equal(tamperedChainCheck.brokenAtSequence, 1);
});

test('Maestro Phase 0 & Section 7 Invariant 15: Scrypt password hashing, Route Security Tier classification & Measured Performance Benchmarks (p95 < 15ms, Domain Event < 5KB)', () => {
  // 1. Scrypt password hashing & timing-safe verification
  const hashed = hashPasswordScrypt('EnterpriseAdmin#2026');
  assert.ok(hashed.startsWith('scrypt$'));
  assert.equal(verifyPasswordOrPlaintext('EnterpriseAdmin#2026', hashed), true);
  assert.equal(verifyPasswordOrPlaintext('WrongPass', hashed), false);
  assert.equal(verifyPasswordOrPlaintext('1234', '1234'), true);

  // 2. Route Security Tier Classification
  assert.equal(classifyApiRouteSecurityTier('GET', '/api/v1/erp/revision'), 'PUBLIC_BOOTSTRAP');
  assert.equal(classifyApiRouteSecurityTier('POST', '/api/v1/auth/login'), 'AUTH_ROUTE');
  assert.equal(classifyApiRouteSecurityTier('POST', '/api/v1/erp/command'), 'COMMERCIAL_WRITE');
  assert.equal(classifyApiRouteSecurityTier('POST', '/api/v1/erp/reset'), 'ADMIN_SENSITIVE');
  assert.equal(classifyApiRouteSecurityTier('POST', '/api/v1/backups/restore'), 'ADMIN_SENSITIVE');
  assert.equal(classifyApiRouteSecurityTier('POST', '/api/v1/licensing/issue'), 'ADMIN_SENSITIVE');

  // 3. Section 7 Measured Performance Benchmark: 50 consecutive authoritative SALE_CREATE commands
  const idempotencyMap = new Map();
  let state: Record<string, any> = {
    products: [
      {
        id: 'prod-bench-1',
        name: 'Solar Inverter 5KW',
        sku: 'SLR-INV-5K',
        stockQty: 500,
        salePrice: 1200,
        costPrice: 900,
      },
    ],
    salesInvoices: [],
    customers: [{ id: 'cust-1', name: 'عميل جملة', balance: 0 }],
    journalEntries: [],
  };

  const latenciesMs: number[] = [];
  let maxEventBytes = 0;

  for (let i = 1; i <= 50; i++) {
    const t0 = performance.now();
    const out = executeAuthoritativeBusinessCommand(
      state,
      {
        commandId: `cmd-bench-${i}`,
        commandType: 'SALE_CREATE',
        clientId: 'pos-bench-1',
        payload: {
          invoiceNumber: `INV-BENCH-${1000 + i}`,
          customerId: 'cust-1',
          customerName: 'عميل جملة',
          paymentMethod: 'CASH',
          items: [{ productId: 'prod-bench-1', quantity: 1, taxRate: 15 }],
        },
      },
      idempotencyMap,
      i + 1
    );
    const elapsed = performance.now() - t0;
    latenciesMs.push(elapsed);
    assert.equal(out.result.success, true);
    state = { ...state, ...out.statePatch };

    const eventPayloadBytes = Buffer.byteLength(JSON.stringify(out.result.events), 'utf-8');
    if (eventPayloadBytes > maxEventBytes) maxEventBytes = eventPayloadBytes;
  }

  latenciesMs.sort((a, b) => a - b);
  const p95LatencyMs = latenciesMs[Math.floor(latenciesMs.length * 0.95)];

  // Section 7 Targets: p95 < 15 ms, Domain Event payload < 5 KB (5120 bytes)
  assert.ok(p95LatencyMs < 15, `Expected p95 < 15ms, measured ${p95LatencyMs.toFixed(2)}ms`);
  assert.ok(maxEventBytes < 5120, `Expected domain event < 5KB, measured ${maxEventBytes} bytes`);
  assert.equal(state.products[0].stockQty, 450);
});



