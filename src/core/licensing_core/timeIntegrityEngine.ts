/**
 * ASF Secure Licensing V2 - Time Integrity Engine
 * Detects system clock rollback, verifies monotonic progression, and enforces offline grace periods.
 */

import { TimeIntegrityState } from './licensingTypes';

// Maximum allowable clock backward drift before flagging tampering (e.g. 5 minutes for NTP drift)
const MAX_ALLOWABLE_CLOCK_DRIFT_MS = 5 * 60 * 1000;

export function evaluateTimeIntegrity(
  currentEpochMs: number,
  state: TimeIntegrityState,
  options?: {
    expiresAtEpochMs?: number;
    offlineGraceDays?: number;
  }
): {
  intact: boolean;
  status: 'TIME_OK' | 'TIME_TAMPERING_DETECTED' | 'EXPIRED' | 'OFFLINE_GRACE_EXCEEDED';
  updatedState: TimeIntegrityState;
  tamperReason?: string;
} {
  const updatedState: TimeIntegrityState = {
    ...state,
    lastTrustedEpochMs: state.lastTrustedEpochMs || currentEpochMs,
    maxRecordedEpochMs: Math.max(state.maxRecordedEpochMs || 0, currentEpochMs),
  };

  // 1. Clock Rollback Detection (Clock shifted backwards behind last trusted recorded time)
  if (currentEpochMs < updatedState.maxRecordedEpochMs - MAX_ALLOWABLE_CLOCK_DRIFT_MS) {
    const rollbackMins = Math.round((updatedState.maxRecordedEpochMs - currentEpochMs) / 60000);
    const reason = `System clock was rolled backward by ~${rollbackMins} minutes behind max recorded time.`;
    updatedState.isTampered = true;
    updatedState.tamperReason = reason;
    return {
      intact: false,
      status: 'TIME_TAMPERING_DETECTED',
      updatedState,
      tamperReason: reason,
    };
  }

  // 2. Expiration check
  if (options?.expiresAtEpochMs && options.expiresAtEpochMs > 0) {
    if (currentEpochMs >= options.expiresAtEpochMs) {
      return {
        intact: false,
        status: 'EXPIRED',
        updatedState,
        tamperReason: 'License subscription period has expired.',
      };
    }
  }

  // 3. Offline grace period check
  if (options?.offlineGraceDays && options.offlineGraceDays > 0 && state.lastServerProofEpochMs) {
    const offlineDurationMs = Math.max(0, currentEpochMs - state.lastServerProofEpochMs);
    const maxOfflineMs = options.offlineGraceDays * 24 * 60 * 60 * 1000;
    if (offlineDurationMs > maxOfflineMs) {
      return {
        intact: false,
        status: 'OFFLINE_GRACE_EXCEEDED',
        updatedState,
        tamperReason: `Offline operation exceeded allowed grace period of ${options.offlineGraceDays} days.`,
      };
    }
  }

  // Time is forward and intact
  updatedState.lastTrustedEpochMs = currentEpochMs;
  updatedState.maxRecordedEpochMs = Math.max(updatedState.maxRecordedEpochMs, currentEpochMs);
  updatedState.isTampered = false;

  return {
    intact: true,
    status: 'TIME_OK',
    updatedState,
  };
}
