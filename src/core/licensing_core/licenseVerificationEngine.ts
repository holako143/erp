/**
 * ASF Secure Licensing V2 - License Verification Engine
 * Pure cryptographic client verification using Ed25519 Public Key.
 */

import {
  SignedLicenseToken,
  HardwareTelemetry,
  TimeIntegrityState,
  LicenseStatus,
} from './licensingTypes';
import { verifySignedLicenseTokenSignature, ASF_OFFICIAL_PUBLIC_KEY_PEM } from './cryptoEngine';
import { generateHardwareFingerprint, compareHardwareFingerprints } from './hardwareFingerprintEngine';
import { evaluateTimeIntegrity } from './timeIntegrityEngine';

export interface LicenseVerificationReport {
  isValid: boolean;
  status: LicenseStatus;
  edition?: string;
  customerName?: string;
  remainingDays?: number;
  expiresAtIso?: string;
  isLifetime?: boolean;
  allowedModules: string[];
  reasons: string[];
  hardwareStatus: 'MATCH' | 'MINOR_CHANGE_ALLOWED' | 'HARDWARE_MISMATCH';
  timeStatus: 'TIME_OK' | 'TIME_TAMPERING_DETECTED' | 'EXPIRED' | 'OFFLINE_GRACE_EXCEEDED';
}

export function verifyClientLicenseToken(
  token: SignedLicenseToken | null | undefined,
  currentHardware: HardwareTelemetry,
  timeState: TimeIntegrityState,
  currentEpochMs: number = Date.now(),
  publicKeyPem: string = ASF_OFFICIAL_PUBLIC_KEY_PEM
): LicenseVerificationReport {
  const reasons: string[] = [];

  if (!token) {
    return {
      isValid: false,
      status: 'ACTIVATION_PENDING',
      allowedModules: [],
      reasons: ['No license token found. System activation is required.'],
      hardwareStatus: 'HARDWARE_MISMATCH',
      timeStatus: 'TIME_OK',
    };
  }

  // 1. Ed25519 Cryptographic Signature Verification
  const sigCheck = verifySignedLicenseTokenSignature(token, publicKeyPem);
  if (!sigCheck.valid) {
    return {
      isValid: false,
      status: 'HARDWARE_MISMATCH',
      allowedModules: [],
      reasons: [`Cryptographic signature tampering detected: ${sigCheck.reason}`],
      hardwareStatus: 'HARDWARE_MISMATCH',
      timeStatus: 'TIME_OK',
    };
  }

  // 2. Hardware Fingerprint Binding Check
  const currentFp = generateHardwareFingerprint(currentHardware);
  const hardwareBound = token.boundDeviceFingerprintHash === currentFp.compositeHash;

  let hardwareStatus: 'MATCH' | 'MINOR_CHANGE_ALLOWED' | 'HARDWARE_MISMATCH' = 'HARDWARE_MISMATCH';
  if (hardwareBound) {
    hardwareStatus = 'MATCH';
  } else {
    // Check if it's a minor change
    const comp = compareHardwareFingerprints(currentHardware, currentHardware);
    hardwareStatus = comp.status;
    if (hardwareStatus === 'HARDWARE_MISMATCH') {
      reasons.push('Current hardware does not match the hardware bound to this license key.');
    }
  }

  // 3. Time Integrity & Expiration Check
  const timeEval = evaluateTimeIntegrity(currentEpochMs, timeState, {
    expiresAtEpochMs: token.claims.expiresAtEpochMs,
    offlineGraceDays: token.claims.offlineGraceDays,
  });

  if (!timeEval.intact) {
    reasons.push(timeEval.tamperReason || 'Time integrity failure.');
  }

  let finalStatus: LicenseStatus = 'ACTIVATED';
  if (hardwareStatus === 'HARDWARE_MISMATCH') {
    finalStatus = 'HARDWARE_MISMATCH';
  } else if (timeEval.status === 'TIME_TAMPERING_DETECTED') {
    finalStatus = 'TIME_TAMPERING_DETECTED';
  } else if (timeEval.status === 'EXPIRED') {
    finalStatus = 'EXPIRED';
  } else if (timeEval.status === 'OFFLINE_GRACE_EXCEEDED') {
    finalStatus = 'SUSPENDED';
  }

  const isLifetime = !!token.claims.isLifetime;
  const remainingMs = Math.max(0, token.claims.expiresAtEpochMs - currentEpochMs);
  const remainingDays = isLifetime ? 36500 : Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  const isValid =
    sigCheck.valid &&
    hardwareStatus !== 'HARDWARE_MISMATCH' &&
    timeEval.intact;

  return {
    isValid,
    status: finalStatus,
    edition: token.claims.edition,
    customerName: token.claims.customerName,
    remainingDays,
    expiresAtIso: isLifetime ? 'LIFETIME' : new Date(token.claims.expiresAtEpochMs).toISOString(),
    isLifetime,
    allowedModules: token.claims.allowedModules,
    reasons,
    hardwareStatus,
    timeStatus: timeEval.status,
  };
}
