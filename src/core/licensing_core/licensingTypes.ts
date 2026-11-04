/**
 * ASF Secure Licensing V2 - Core Types & Declarations
 * Enterprise Software Licensing, Hardware Binding & Cryptographic Proofs
 */

export type LicenseStatus =
  | 'ISSUED'
  | 'ACTIVATION_PENDING'
  | 'ACTIVATED'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'TRANSFER_PENDING'
  | 'HARDWARE_MISMATCH'
  | 'TIME_TAMPERING_DETECTED';

export type SystemEdition = 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ULTIMATE';

export type SystemModuleKey =
  | 'pos'
  | 'inventory'
  | 'accounting'
  | 'repairs'
  | 'ai_advisor'
  | 'lan_sync'
  | 'multi_branch'
  | 'whatsapp_sms';

export interface LicenseClaims {
  licenseUuid: string;
  customerId: string;
  customerName: string;
  edition: SystemEdition;
  issuedAtEpochMs: number;
  expiresAtEpochMs: number;
  maxDevices: number;
  offlineGraceDays: number;
  allowedModules: SystemModuleKey[];
  isLifetime: boolean;
  metadata?: Record<string, string>;
}

export interface SignedLicenseToken {
  version: '2.0';
  claims: LicenseClaims;
  boundDeviceFingerprintHash: string; // SHA-256 of hardware composite
  activatedAtEpochMs: number;
  tokenNonce: string;
  signature: string; // Ed25519 hex signature over serialized claims + boundDevice
  keyId: string;
}

export interface HardwareTelemetry {
  motherboardUuid: string;
  cpuModel: string;
  cpuCores: number;
  primaryDiskSerial: string;
  systemMachineId: string;
  platform: string;
  gpuVendorRenderer?: string;
  tpmPresent?: boolean;
  tpmId?: string;
}

export interface HardwareFingerprintResult {
  compositeHash: string; // SHA-256
  criticalSiliconHash: string; // Motherboard + System UUID (Weight 70%)
  secondarySiliconHash: string; // CPU + Storage + Platform (Weight 30%)
  machineRequestCode: string; // Human readable formatted code
  telemetry: HardwareTelemetry;
}

export interface HardwareComparisonResult {
  match: boolean;
  criticalMatch: boolean;
  secondaryMatch: boolean;
  similarityScore: number; // 0.0 to 1.0
  changedComponents: string[];
  status: 'MATCH' | 'MINOR_CHANGE_ALLOWED' | 'HARDWARE_MISMATCH';
}

export interface ActivationRequest {
  licenseUuid: string;
  hardware: HardwareTelemetry;
  clientNonce: string;
  clientEpochMs: number;
  clientVersion: string;
}

export interface ActivationResponse {
  success: boolean;
  status: LicenseStatus;
  licenseToken?: SignedLicenseToken;
  serverEpochMs: number;
  serverProofSignature?: string;
  errorMessage?: string;
  errorCode?:
    | 'LICENSE_NOT_FOUND'
    | 'ALREADY_ACTIVATED'
    | 'DEVICE_MISMATCH'
    | 'EXPIRED'
    | 'REVOKED'
    | 'CLOCK_DESYNC'
    | 'INTERNAL_ERROR';
}

export interface TimeIntegrityState {
  lastTrustedEpochMs: number;
  maxRecordedEpochMs: number;
  lastServerProofEpochMs?: number;
  lastServerProofSig?: string;
  isTampered: boolean;
  tamperReason?: string;
}

export interface LicenseAuditEvent {
  id: string;
  licenseUuid: string;
  deviceId: string;
  eventType:
    | 'LICENSE_ISSUED'
    | 'ACTIVATION_ATTEMPT'
    | 'ACTIVATION_SUCCESS'
    | 'ACTIVATION_REJECTED'
    | 'VERIFICATION_SUCCESS'
    | 'VERIFICATION_FAILED'
    | 'HARDWARE_MISMATCH_DETECTED'
    | 'TIME_ROLLBACK_DETECTED'
    | 'LICENSE_EXPIRED'
    | 'LICENSE_REVOKED'
    | 'MODULE_ACCESS_DENIED';
  timestampEpochMs: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details: string;
  ipAddress?: string;
}
