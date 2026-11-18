/**
 * ASF Secure Licensing V2 - Time Integrity Engine
 * Detects system clock rollback, verifies monotonic progression, and enforces offline grace periods.
 */

import { TimeIntegrityState } from './licensingTypes';

// Maximum allowable clock backward drift before flagging tampering (5 minutes for NTP drift)
const MAX_ALLOWABLE_CLOCK_DRIFT_MS = 5 * 60 * 1000;

// Maximum single-step forward jump without server proof before clamping HWM (180 days)
// Prevents an accidental CMOS/date typo to 2099 from permanently locking out a legitimate customer
const MAX_UNPROVEN_FORWARD_JUMP_MS = 180 * 24 * 60 * 60 * 1000;

export function evaluateTimeIntegrity(
  currentEpochMs: number,
  state: TimeIntegrityState,
  options?: {
    expiresAtEpochMs?: number;
    offlineGraceDays?: number;
    authoritativeFloorEpochMs?: number;
  }
): {
  intact: boolean;
  status: 'TIME_OK' | 'TIME_TAMPERING_DETECTED' | 'EXPIRED' | 'OFFLINE_GRACE_EXCEEDED';
  updatedState: TimeIntegrityState;
  tamperReason?: string;
  forwardJumpClamped?: boolean;
} {
  const floorMs = Math.max(
    Number(state?.maxRecordedEpochMs) || 0,
    Number(state?.lastTrustedEpochMs) || 0,
    Number(options?.authoritativeFloorEpochMs) || 0
  );

  const priorTrusted = Number(state?.lastTrustedEpochMs) || floorMs || currentEpochMs;
  const isUnprovenHugeForwardJump =
    floorMs > 0 &&
    currentEpochMs - priorTrusted > MAX_UNPROVEN_FORWARD_JUMP_MS &&
    (!state?.lastServerProofEpochMs ||
      Math.abs(currentEpochMs - state.lastServerProofEpochMs) > MAX_ALLOWABLE_CLOCK_DRIFT_MS);

  // If the clock jumped forward > 180 days in a single step without server proof, do NOT poison HWM
  const nextMaxRecorded = isUnprovenHugeForwardJump
    ? floorMs
    : Math.max(floorMs, currentEpochMs);

  const updatedState: TimeIntegrityState = {
    ...state,
    lastTrustedEpochMs: priorTrusted,
    maxRecordedEpochMs: nextMaxRecorded,
  };

  // 1. Clock Rollback Detection (Clock shifted backwards behind highest recorded monotonic watermark)
  if (floorMs > 0 && currentEpochMs < floorMs - MAX_ALLOWABLE_CLOCK_DRIFT_MS) {
    const rollbackMins = Math.round((floorMs - currentEpochMs) / 60000);
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
    const effectiveNowMs = Math.max(currentEpochMs, floorMs);
    if (effectiveNowMs >= options.expiresAtEpochMs) {
      return {
        intact: false,
        status: 'EXPIRED',
        updatedState,
        tamperReason: 'License subscription period has expired.',
      };
    }
  }

  // 3. Offline grace period check
  if (options?.offlineGraceDays && options.offlineGraceDays > 0 && state?.lastServerProofEpochMs) {
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
  if (!isUnprovenHugeForwardJump) {
    updatedState.lastTrustedEpochMs = currentEpochMs;
    updatedState.maxRecordedEpochMs = Math.max(updatedState.maxRecordedEpochMs, currentEpochMs);
  }
  updatedState.isTampered = false;
  updatedState.tamperReason = undefined;

  return {
    intact: true,
    status: 'TIME_OK',
    updatedState,
    forwardJumpClamped: isUnprovenHugeForwardJump,
  };
}
