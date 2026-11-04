/**
 * ASF Secure Licensing V2 - One-Time Activation Manager & Atomic Server Engine
 * Enforces single-device binding, atomic transitions, and prevents replay attacks.
 */

import crypto from 'crypto';
import {
  ActivationRequest,
  ActivationResponse,
  LicenseClaims,
  SignedLicenseToken,
  LicenseAuditEvent,
} from './licensingTypes';
import { generateHardwareFingerprint } from './hardwareFingerprintEngine';
import { signLicenseClaimsWithEd25519 } from './cryptoEngine';

export interface LicenseRecord {
  licenseUuid: string;
  licenseKey: string;
  claims: LicenseClaims;
  status: 'ISSUED' | 'ACTIVATED' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  activatedAtEpochMs?: number;
  boundDeviceFingerprintHash?: string;
  boundMachineRequestCode?: string;
  boundHardwareDetails?: string;
  activationCount: number;
  maxActivations: number;
}

export class ActivationServerManager {
  private licenses: Map<string, LicenseRecord> = new Map();
  private auditLogs: LicenseAuditEvent[] = [];
  private processedNonces: Set<string> = new Set();
  private privateKeyPem: string;

  constructor(issuerPrivateKeyPem: string) {
    this.privateKeyPem = issuerPrivateKeyPem;
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
      return {
        success: false,
        status: 'SUSPENDED',
        serverEpochMs: serverNow,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'Invalid activation request: Replay detected (Reused Nonce).',
      };
    }
    this.processedNonces.add(request.clientNonce);

    // 2. Fetch License Record
    const record = this.licenses.get(request.licenseUuid);
    if (!record) {
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
      // Check if it's the SAME authorized device asking for re-fetching its token (Idempotent)
      if (record.boundDeviceFingerprintHash === fp.compositeHash) {
        // Idempotent recovery for the exact same machine
        const licenseToken = signLicenseClaimsWithEd25519(
          record.claims,
          fp.compositeHash,
          this.privateKeyPem
        );
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
        licenseUuid: request.licenseUuid,
        deviceId: fp.machineRequestCode,
        eventType: 'ACTIVATION_REJECTED',
        timestampEpochMs: serverNow,
        severity: 'CRITICAL',
        details: `Multi-device activation blocked! Key is already bound to hardware hash ${record.boundDeviceFingerprintHash}.`,
      });

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
    record.boundMachineRequestCode = fp.machineRequestCode;
    record.boundHardwareDetails = `${request.hardware.motherboardUuid} | ${request.hardware.cpuModel}`;
    record.activationCount = 1;

    // Issue cryptographic Ed25519 Signed Token
    const licenseToken = signLicenseClaimsWithEd25519(
      record.claims,
      fp.compositeHash,
      this.privateKeyPem
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
