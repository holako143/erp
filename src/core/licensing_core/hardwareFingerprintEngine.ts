/**
 * ASF Secure Licensing V2 - Hardware Fingerprint Engine
 * Calculates weighted composite silicon digest separating critical vs secondary components.
 */

import crypto from 'crypto';
import {
  HardwareTelemetry,
  HardwareFingerprintResult,
  HardwareComparisonResult,
} from './licensingTypes';

export function normalizeComponentString(val?: string | null): string {
  if (!val) return 'UNKNOWN_COMPONENT_VAL';
  return val.trim().replace(/\s+/g, '_').toUpperCase();
}

export function computeSha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Generates composite silicon hashes and a formatted human-readable Machine Request Code
 */
export function generateHardwareFingerprint(telemetry: HardwareTelemetry): HardwareFingerprintResult {
  const normMb = normalizeComponentString(telemetry.motherboardUuid);
  const normSysId = normalizeComponentString(telemetry.systemMachineId);
  const normCpu = normalizeComponentString(`${telemetry.cpuModel}:${telemetry.cpuCores}`);
  const normDisk = normalizeComponentString(telemetry.primaryDiskSerial);
  const normPlatform = normalizeComponentString(telemetry.platform);

  // Critical Silicon Hash (Weight 70%): Motherboard + System UUID
  const criticalRaw = `CRITICAL::MB:${normMb}::SYS:${normSysId}`;
  const criticalSiliconHash = computeSha256(criticalRaw);

  // Secondary Silicon Hash (Weight 30%): CPU + Storage Disk + Platform
  const secondaryRaw = `SECONDARY::CPU:${normCpu}::DISK:${normDisk}::PLATFORM:${normPlatform}`;
  const secondarySiliconHash = computeSha256(secondaryRaw);

  // Full Composite Hash
  const compositeHash = computeSha256(`${criticalSiliconHash}:::${secondarySiliconHash}`);

  // Human-readable Machine Request Code: ASF-REQ-XXXX-XXXX-XXXX-CCCC
  const hex12 = compositeHash.slice(0, 12).toUpperCase();
  const s1 = hex12.slice(0, 4);
  const s2 = hex12.slice(4, 8);
  const s3 = hex12.slice(8, 12);
  const checksum = computeSha256(`ASF-REQ-CKSUM:${s1}-${s2}-${s3}`).slice(0, 4).toUpperCase();
  const machineRequestCode = `ASF-REQ-${s1}-${s2}-${s3}-${checksum}`;

  return {
    compositeHash,
    criticalSiliconHash,
    secondarySiliconHash,
    machineRequestCode,
    telemetry,
  };
}

/**
 * Compares two hardware fingerprints with weighted tolerance
 */
export function compareHardwareFingerprints(
  original: HardwareTelemetry,
  current: HardwareTelemetry
): HardwareComparisonResult {
  const origFp = generateHardwareFingerprint(original);
  const currFp = generateHardwareFingerprint(current);

  const criticalMatch = origFp.criticalSiliconHash === currFp.criticalSiliconHash;
  const secondaryMatch = origFp.secondarySiliconHash === currFp.secondarySiliconHash;

  const changedComponents: string[] = [];
  if (normalizeComponentString(original.motherboardUuid) !== normalizeComponentString(current.motherboardUuid)) {
    changedComponents.push('MOTHERBOARD');
  }
  if (normalizeComponentString(original.systemMachineId) !== normalizeComponentString(current.systemMachineId)) {
    changedComponents.push('SYSTEM_MACHINE_ID');
  }
  if (
    normalizeComponentString(original.cpuModel) !== normalizeComponentString(current.cpuModel) ||
    original.cpuCores !== current.cpuCores
  ) {
    changedComponents.push('CPU');
  }
  if (normalizeComponentString(original.primaryDiskSerial) !== normalizeComponentString(current.primaryDiskSerial)) {
    changedComponents.push('PRIMARY_DISK');
  }

  // Similarity score calculation
  let similarityScore = 1.0;
  if (!criticalMatch) similarityScore -= 0.7;
  if (!secondaryMatch) similarityScore -= 0.3;
  similarityScore = Math.max(0, Math.min(1.0, similarityScore));

  let status: 'MATCH' | 'MINOR_CHANGE_ALLOWED' | 'HARDWARE_MISMATCH';
  if (criticalMatch && secondaryMatch) {
    status = 'MATCH';
  } else if (criticalMatch && !secondaryMatch) {
    // Critical motherboard/identity intact, disk or CPU upgraded
    status = 'MINOR_CHANGE_ALLOWED';
  } else {
    // Critical hardware identity tampered or moved to another computer
    status = 'HARDWARE_MISMATCH';
  }

  return {
    match: status !== 'HARDWARE_MISMATCH',
    criticalMatch,
    secondaryMatch,
    similarityScore,
    changedComponents,
    status,
  };
}
