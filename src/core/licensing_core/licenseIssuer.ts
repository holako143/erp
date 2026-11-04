/**
 * ASF Secure Licensing V2 - License Issuer Tool (Authority & Admin CLI)
 * Generates official Ed25519-signed licenses and serial keys for clients.
 */

import crypto from 'crypto';
import { LicenseClaims, SystemEdition, SystemModuleKey } from './licensingTypes';
import { LicenseRecord } from './activationManager';

export function createOfficialLicenseRecord(params: {
  customerName: string;
  customerId?: string;
  edition: SystemEdition;
  durationDays: number;
  allowedModules?: SystemModuleKey[];
  offlineGraceDays?: number;
  isLifetime?: boolean;
}): LicenseRecord {
  const licenseUuid = crypto.randomUUID();
  const issuedAtEpochMs = Date.now();
  const isLifetime = !!params.isLifetime || params.durationDays >= 36500;
  const expiresAtEpochMs = isLifetime
    ? issuedAtEpochMs + 100 * 365 * 86400000
    : issuedAtEpochMs + params.durationDays * 86400000;

  const defaultModules: SystemModuleKey[] =
    params.allowedModules || [
      'pos',
      'inventory',
      'accounting',
      'repairs',
      'ai_advisor',
      'lan_sync',
      'multi_branch',
      'whatsapp_sms',
    ];

  // User-friendly activation key format: ASF-V2-XXXX-XXXX-XXXX-XXXX
  const rawKeyHex = crypto.createHash('sha256').update(`${licenseUuid}:::${issuedAtEpochMs}`).digest('hex').toUpperCase();
  const k1 = rawKeyHex.slice(0, 4);
  const k2 = rawKeyHex.slice(4, 8);
  const k3 = rawKeyHex.slice(8, 12);
  const k4 = rawKeyHex.slice(12, 16);
  const licenseKey = `ASF-V2-${k1}-${k2}-${k3}-${k4}`;

  const claims: LicenseClaims = {
    licenseUuid,
    customerId: params.customerId || `CUST-${rawKeyHex.slice(16, 22)}`,
    customerName: params.customerName,
    edition: params.edition,
    issuedAtEpochMs,
    expiresAtEpochMs,
    maxDevices: 1, // Single-device strict policy
    offlineGraceDays: params.offlineGraceDays ?? 14,
    allowedModules: defaultModules,
    isLifetime,
  };

  return {
    licenseUuid,
    licenseKey,
    claims,
    status: 'ISSUED',
    activationCount: 0,
    maxActivations: 1,
  };
}
