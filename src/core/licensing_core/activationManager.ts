/**
 * ASF Secure Licensing V2 - One-Time Activation Manager & Atomic Server Engine
 * Enforces single-device binding, atomic transitions, and prevents replay attacks.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  ActivationRequest,
  ActivationResponse,
  LicenseClaims,
  SignedLicenseToken,
  LicenseAuditEvent,
  HardwareTelemetry,
} from './licensingTypes';
import { generateHardwareFingerprint } from './hardwareFingerprintEngine';
import { signLicenseClaimsWithEd25519, ASF_KEY_ID } from './cryptoEngine';

export interface LicenseRecord {
  licenseUuid: string;
  licenseKey: string;
  claims: LicenseClaims;
  status: 'ISSUED' | 'ACTIVATED' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED' | 'REATTESTATION_PENDING';
  activatedAtEpochMs?: number;
  boundDeviceFingerprintHash?: string;
  boundCriticalSiliconHash?: string;
  boundSecondarySiliconHash?: string;
  boundMachineRequestCode?: string;
  boundHardwareTelemetry?: HardwareTelemetry;
  boundHardwareDetails?: string;
  activationCount: number;
  maxActivations: number;
  reAttestationHistory?: Array<{
    previousRequestCode?: string;
    newRequestCode: string;
    reboundAtEpochMs: number;
    reason: string;
  }>;
}

export interface PersistedActivationAuthorityState {
  licenses: LicenseRecord[];
  auditLogs: LicenseAuditEvent[];
  processedNonces: string[];
  updatedAtIso: string;
}

export class ActivationServerManager {
  private licenses: Map<string, LicenseRecord> = new Map();
  private auditLogs: LicenseAuditEvent[] = [];
  private processedNonces: Set<string> = new Set();
  private privateKeyPem: string;
  private persistenceFilePath?: string;

  constructor(issuerPrivateKeyPem: string, persistenceFilePath?: string) {
    this.privateKeyPem = issuerPrivateKeyPem;
    this.persistenceFilePath = persistenceFilePath;
    if (this.persistenceFilePath) {
      this.loadFromPersistenceFile();
    }
  }

  private loadFromPersistenceFile(): void {
    if (!this.persistenceFilePath) return;
    try {
      if (!fs.existsSync(this.persistenceFilePath)) return;
      const raw = fs.readFileSync(this.persistenceFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedActivationAuthorityState>;
      this.hydrateStateSnapshot(parsed);
    } catch {
      // ignore corrupted persistence file on boot
    }
  }

  private saveToPersistenceFile(): void {
    if (!this.persistenceFilePath) return;
    try {
      const dir = path.dirname(this.persistenceFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.persistenceFilePath}.tmp`;
      const snapshot = this.exportStateSnapshot();
      fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmpPath, this.persistenceFilePath);
    } catch {
      // ignore write failure in read-only environments
    }
  }

  public exportStateSnapshot(): PersistedActivationAuthorityState {
    return {
      licenses: Array.from(this.licenses.values()),
      auditLogs: [...this.auditLogs],
      processedNonces: Array.from(this.processedNonces.values()).slice(-2000),
      updatedAtIso: new Date().toISOString(),
    };
  }

  public hydrateStateSnapshot(snapshot: Partial<PersistedActivationAuthorityState>): void {
    if (Array.isArray(snapshot.licenses)) {
      this.licenses.clear();
      for (const lic of snapshot.licenses) {
        if (lic && lic.licenseUuid) {
          this.licenses.set(lic.licenseUuid, lic);
        }
      }
    }
    if (Array.isArray(snapshot.auditLogs)) {
      this.auditLogs = snapshot.auditLogs.slice(0, 500);
    }
    if (Array.isArray(snapshot.processedNonces)) {
      this.processedNonces = new Set(snapshot.processedNonces);
    }
  }

  /**
   * Registers a newly issued license in the authority store
   */
  public registerIssuedLicense(record: LicenseRecord): void {
    this.licenses.set(record.licenseUuid, record);
    this.logEvent({
      id: crypto.randomUUID(),
      licenseUuid: record.licenseUuid,
      deviceId: 'ISSUER_AUTHORITY',
      eventType: 'LICENSE_ISSUED',
      timestampEpochMs: Date.now(),
      severity: 'INFO',
      details: `License ${record.licenseUuid} issued for ${record.claims.customerName} (${record.claims.edition}).`,
    });
    this.saveToPersistenceFile();
  }

  /**
   * Performs Atomic One-Time Activation for a specific machine
   */
  public activateLicenseAtomically(request: ActivationRequest): ActivationResponse {
    const serverNow = Date.now();

    // 1. Replay Prevention: Verify client nonce has not been used before
    if (this.processedNonces.has(request.clientNonce)) {
      this.logEvent({
        id: crypto.randomUUID(),
        licenseUuid: request.licenseUuid,
        deviceId: 'UNKNOWN',
        eventType: 'ACTIVATION_REJECTED',
        timestampEpochMs: serverNow,
        severity: 'CRITICAL',
        details: `Replay attack detected! Reused client nonce: ${request.clientNonce}`,
      });
      this.saveToPersistenceFile();
      return {
        success: false,
        status: 'SUSPENDED',
        serverEpochMs: serverNow,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'Invalid activation request: Replay detected (Reused Nonce).',
      };
    }
    this.processedNonces.add(request.clientNonce);

    // 2. Fetch License Record (by UUID or License Key)
    let record = this.licenses.get(request.licenseUuid);
    if (!record) {
      for (const candidate of this.licenses.values()) {
        if (candidate.licenseKey === request.licenseUuid) {
          record = candidate;
          break;
        }
      }
    }
    if (!record) {
      this.saveToPersistenceFile();
      return {
        success: false,
        status: 'ISSUED',
        serverEpochMs: serverNow,
        errorCode: 'LICENSE_NOT_FOUND',
        errorMessage: 'License key was not found in the official registry.',
      };
    }

    // 3. Status Validation
    if (record.status === 'REVOKED') {
      this.saveToPersistenceFile();
      return {
        success: false,
        status: 'REVOKED',
        serverEpochMs: serverNow,
        errorCode: 'REVOKED',
        errorMessage: 'This license has been permanently revoked by the administrator.',
      };
    }

    if (record.status === 'EXPIRED' || serverNow > record.claims.expiresAtEpochMs) {
      record.status = 'EXPIRED';
      this.saveToPersistenceFile();
      return {
        success: false,
        status: 'EXPIRED',
        serverEpochMs: serverNow,
        errorCode: 'EXPIRED',
        errorMessage: 'This license has expired and cannot be activated.',
      };
    }

    // Calculate current hardware fingerprint
    const fp = generateHardwareFingerprint(request.hardware);

    // 4. One-Time Activation & Multi-Device Lock (Enforce atomic single activation)
    if (record.status === 'ACTIVATED') {
      // Same authorized machine (exact composite match OR same critical silicon motherboard/UUID after minor disk/RAM upgrade)
      const sameComposite = record.boundDeviceFingerprintHash === fp.compositeHash;
      const sameCriticalSilicon =
        Boolean(record.boundCriticalSiliconHash) &&
        record.boundCriticalSiliconHash === fp.criticalSiliconHash;

      if (sameComposite || sameCriticalSilicon) {
        record.boundDeviceFingerprintHash = fp.compositeHash;
        record.boundCriticalSiliconHash = fp.criticalSiliconHash;
        record.boundSecondarySiliconHash = fp.secondarySiliconHash;
        record.boundMachineRequestCode = fp.machineRequestCode;
        record.boundHardwareTelemetry = request.hardware;

        const licenseToken = signLicenseClaimsWithEd25519(
          record.claims,
          fp.compositeHash,
          this.privateKeyPem,
          ASF_KEY_ID,
          {
            boundCriticalSiliconHash: fp.criticalSiliconHash,
            boundSecondarySiliconHash: fp.secondarySiliconHash,
            boundMachineRequestCode: fp.machineRequestCode,
            boundHardwareTelemetry: request.hardware,
          }
        );
        this.saveToPersistenceFile();
        return {
          success: true,
          status: 'ACTIVATED',
          licenseToken,
          serverEpochMs: serverNow,
        };
      }

      // Foreign machine attempting to use an already-activated license key
      this.logEvent({
        id: crypto.randomUUID(),
        licenseUuid: record.licenseUuid,
        deviceId: fp.machineRequestCode,
        eventType: 'ACTIVATION_REJECTED',
        timestampEpochMs: serverNow,
        severity: 'CRITICAL',
        details: `Multi-device activation blocked! Key is already bound to hardware hash ${record.boundDeviceFingerprintHash}.`,
      });
      this.saveToPersistenceFile();

      return {
        success: false,
        status: 'ACTIVATED',
        serverEpochMs: serverNow,
        errorCode: 'ALREADY_ACTIVATED',
        errorMessage: 'This license key is already activated and permanently bound to another device.',
      };
    }

    // 5. ATOMIC COMMIT: Bind to this machine permanently
    record.status = 'ACTIVATED';
    record.activatedAtEpochMs = serverNow;
    record.boundDeviceFingerprintHash = fp.compositeHash;
    record.boundCriticalSiliconHash = fp.criticalSiliconHash;
    record.boundSecondarySiliconHash = fp.secondarySiliconHash;
    record.boundMachineRequestCode = fp.machineRequestCode;
    record.boundHardwareTelemetry = request.hardware;
    record.boundHardwareDetails = `${request.hardware.motherboardUuid} | ${request.hardware.cpuModel}`;
    record.activationCount = (record.activationCount || 0) + 1;

    // Issue cryptographic Ed25519 Signed Token with full hardware binding metadata
    const licenseToken = signLicenseClaimsWithEd25519(
      record.claims,
      fp.compositeHash,
      this.privateKeyPem,
      ASF_KEY_ID,
      {
        boundCriticalSiliconHash: fp.criticalSiliconHash,
        boundSecondarySiliconHash: fp.secondarySiliconHash,
        boundMachineRequestCode: fp.machineRequestCode,
        boundHardwareTelemetry: request.hardware,
      }
    );

    this.logEvent({
      id: crypto.randomUUID(),
      licenseUuid: record.licenseUuid,
      deviceId: fp.machineRequestCode,
      eventType: 'ACTIVATION_SUCCESS',
      timestampEpochMs: serverNow,
      severity: 'INFO',
      details: `Single-device activation completed successfully for machine ${fp.machineRequestCode}.`,
    });
    this.saveToPersistenceFile();

    return {
      success: true,
      status: 'ACTIVATED',
      licenseToken,
      serverEpochMs: serverNow,
    };
  }

  /**
   * Re-binds an existing valid license to repaired/replaced hardware (Motherboard Replacement Re-Attestation)
   */
  public rebindLicenseForHardwareRepair(params: {
    licenseUuid: string;
    newHardware: HardwareTelemetry;
    reason: string;
  }): ActivationResponse {
    const serverNow = Date.now();
    const record = this.licenses.get(params.licenseUuid);
    if (!record) {
      return {
        success: false,
        status: 'ISSUED',
        serverEpochMs: serverNow,
        errorCode: 'LICENSE_NOT_FOUND',
        errorMessage: 'License record not found for hardware re-attestation.',
      };
    }
    if (record.status === 'REVOKED' || record.status === 'EXPIRED' || serverNow > record.claims.expiresAtEpochMs) {
      return {
        success: false,
        status: record.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED',
        serverEpochMs: serverNow,
        errorCode: record.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED',
        errorMessage: 'Cannot re-attest an expired or revoked license.',
      };
    }

    const fp = generateHardwareFingerprint(params.newHardware);
    const previousRequestCode = record.boundMachineRequestCode;
    record.status = 'ACTIVATED';
    record.boundDeviceFingerprintHash = fp.compositeHash;
    record.boundCriticalSiliconHash = fp.criticalSiliconHash;
    record.boundSecondarySiliconHash = fp.secondarySiliconHash;
    record.boundMachineRequestCode = fp.machineRequestCode;
    record.boundHardwareTelemetry = params.newHardware;
    record.boundHardwareDetails = `${params.newHardware.motherboardUuid} | ${params.newHardware.cpuModel}`;
    record.reAttestationHistory = [
      ...(record.reAttestationHistory || []),
      {
        previousRequestCode,
        newRequestCode: fp.machineRequestCode,
        reboundAtEpochMs: serverNow,
        reason: params.reason || 'Hardware repair re-attestation',
      },
    ];

    const licenseToken = signLicenseClaimsWithEd25519(
      record.claims,
      fp.compositeHash,
      this.privateKeyPem,
      ASF_KEY_ID,
      {
        boundCriticalSiliconHash: fp.criticalSiliconHash,
        boundSecondarySiliconHash: fp.secondarySiliconHash,
        boundMachineRequestCode: fp.machineRequestCode,
        boundHardwareTelemetry: params.newHardware,
      }
    );

    this.logEvent({
      id: crypto.randomUUID(),
      licenseUuid: record.licenseUuid,
      deviceId: fp.machineRequestCode,
      eventType: 'ACTIVATION_SUCCESS',
      timestampEpochMs: serverNow,
      severity: 'WARNING',
      details: `Hardware re-attestation completed from ${previousRequestCode || 'INITIAL'} to ${fp.machineRequestCode}: ${params.reason}`,
    });
    this.saveToPersistenceFile();

    return {
      success: true,
      status: 'ACTIVATED',
      licenseToken,
      serverEpochMs: serverNow,
    };
  }

  public getLicense(licenseUuid: string): LicenseRecord | undefined {
    return this.licenses.get(licenseUuid);
  }

  public getAllLicenses(): LicenseRecord[] {
    return Array.from(this.licenses.values());
  }

  public getAuditLogs(): LicenseAuditEvent[] {
    return [...this.auditLogs];
  }

  private logEvent(event: LicenseAuditEvent): void {
    this.auditLogs.unshift(event);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }
}
