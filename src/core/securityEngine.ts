/**
 * RLM ERP - Enterprise Security, Multi-Hardware Licensing, 30-Day Trial & RBAC Engine
 * Pure, deterministic cryptographic hardware binding & single-device serial keygen
 */

export interface HardwareRawTelemetry {
  gpuVendor: string;
  gpuRenderer: string;
  cpuModel: string;
  cpuCores: number;
  memoryGb: number;
  platform: string;
  screenSpec: string;
  hostMacOrMachineId: string;
}

export interface HardwareFingerprint {
  motherboardSerial: string;
  cpuProcessorId: string;
  gpuSiliconId: string;
  diskVolumeSerial: string;
  systemUuid: string;
  detectionSource?: 'LIVE_DEVICE_TELEMETRY' | 'WINDOWS_WMI_IMPORTED' | 'FOREIGN_PC_SIMULATION';
  rawTelemetry?: HardwareRawTelemetry;
}

export type LicenseDurationPreset =
  | '1_DAY'
  | '1_WEEK'
  | '1_MONTH'
  | '1_YEAR'
  | 'CUSTOM_DAYS'
  | 'LIFETIME';

export interface SerialVerificationResult {
  valid: boolean;
  reason?:
    | 'INVALID_FORMAT'
    | 'SIGNATURE_TAMPERED'
    | 'DEVICE_MISMATCH'
    | 'EXPIRED';
  durationDays?: number;
  durationLabelAr?: string;
  durationLabelEn?: string;
  issuedAtIso?: string;
  expiresAtIso?: string;
  remainingDays?: number;
  boundDeviceToken?: string;
  isLifetime?: boolean;
}

export type SystemLicenseStatus =
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'LICENSE_ACTIVE'
  | 'LICENSE_EXPIRED'
  | 'DEVICE_MISMATCH'
  | 'CLOCK_TAMPERED';

export interface HardwareComponentIntegrityResult {
  intact: boolean;
  failedComponents: ('MOTHERBOARD' | 'CPU' | 'GPU' | 'DISK_NVME' | 'SYSTEM_UUID')[];
  reasonAr: string;
  reasonEn: string;
}

export interface ClockTamperCheckResult {
  clockTampered: boolean;
  rollbackMinutes: number;
  updatedMaxClockMs: number;
  reasonAr: string;
  reasonEn: string;
}

export interface SystemProtectionEvaluation {
  status: SystemLicenseStatus;
  isLocked: boolean;
  trialTotalDays: number;
  trialElapsedDays: number;
  trialRemainingDays: number;
  licenseDetails?: SerialVerificationResult;
  machineRequestCode: string;
  failedHardwareComponents?: ('MOTHERBOARD' | 'CPU' | 'GPU' | 'DISK_NVME' | 'SYSTEM_UUID')[];
  clockRollbackMinutes?: number;
}

const MASTER_DEVELOPER_SECRET = 'RLM-ERP-V3-MASTER-CRYPTO-SALT-9948271635-SINGLE-NODE-LOCK';

/**
 * Deterministic 32-bit FNV-1a / Avalanche round hash returning 8 uppercase hex chars
 */
export function cryptoHash32(input: string, salt = MASTER_DEVELOPER_SECRET): string {
  const combined = `${salt}::${input}::${salt.split('').reverse().join('')}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;

  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
    h2 = (h2 << 13) | (h2 >>> 19);
  }

  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  const mixed = (h1 ^ h2) >>> 0;
  return mixed.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Computes a 12-char uppercase hex hardware digest from Motherboard + CPU + GPU + Disk serials
 */
export function computeCompositeHardwareDigest(hw: HardwareFingerprint): string {
  const normalized = [
    hw.motherboardSerial.trim().toUpperCase(),
    hw.cpuProcessorId.trim().toUpperCase(),
    hw.gpuSiliconId.trim().toUpperCase(),
    hw.diskVolumeSerial.trim().toUpperCase(),
    hw.systemUuid.trim().toUpperCase(),
  ].join('|');

  const partA = cryptoHash32(normalized, 'HW-MB-CPU-SALT-A1');
  const partB = cryptoHash32(normalized, 'HW-GPU-DISK-SALT-B2');
  return (partA + partB.slice(0, 4)).toUpperCase();
}

/**
 * Generates the Machine Request Code sent by the client to the Developer:
 * Format: RLM-REQ-XXXX-XXXX-XXXX-CCCC (where CCCC is a 4-char integrity checksum)
 */
export function generateMachineRequestCode(hw: HardwareFingerprint): string {
  const digest12 = computeCompositeHardwareDigest(hw); // 12 hex chars
  const s1 = digest12.slice(0, 4);
  const s2 = digest12.slice(4, 8);
  const s3 = digest12.slice(8, 12);
  const checksum4 = cryptoHash32(`${s1}-${s2}-${s3}`, 'RLM-REQ-CHECKSUM').slice(0, 4);
  return `RLM-REQ-${s1}-${s2}-${s3}-${checksum4}`;
}

/**
 * Validates whether a Machine Request Code is structurally & cryptographically intact
 */
export function validateMachineRequestCode(requestCode: string): {
  valid: boolean;
  digest12?: string;
} {
  const cleaned = requestCode.trim().toUpperCase();
  const match = /^RLM-REQ-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})$/.exec(cleaned);
  if (!match) return { valid: false };

  const [, s1, s2, s3, checksum4] = match;
  const expectedChecksum = cryptoHash32(`${s1}-${s2}-${s3}`, 'RLM-REQ-CHECKSUM').slice(0, 4);
  if (checksum4 !== expectedChecksum) {
    return { valid: false };
  }
  return {
    valid: true,
    digest12: `${s1}${s2}${s3}`,
  };
}

/**
 * Resolves duration days from preset or custom days
 */
export function resolveLicenseDurationDays(
  preset: LicenseDurationPreset,
  customDays = 30
): number {
  switch (preset) {
    case '1_DAY':
      return 1;
    case '1_WEEK':
      return 7;
    case '1_MONTH':
      return 30;
    case '1_YEAR':
      return 365;
    case 'LIFETIME':
      return 36500; // 100 years
    case 'CUSTOM_DAYS':
      return Math.max(1, Math.min(36500, Math.floor(customDays || 1)));
    default:
      return 30;
  }
}

/**
 * Developer Keygen: Generates a Single-Device Activation Serial from a client's Request Code
 * Format: RLM-ACT-<DEV6>-<DUR4>-<ISS8>-<SIG8>
 * - DEV6: 6-char device-binding token derived from the 12-char hardware digest
 * - DUR4: 4-char hex of duration in days (0001 = 1 day, 0007 = 7 days, 001E = 30 days, 016D = 365 days, 8E94 = Lifetime)
 * - ISS8: 8-char hex of issue timestamp in minutes since epoch (allows exact expiry calculation)
 * - SIG8: 8-char cryptographic signature binding DEV6 + FULL_DIGEST12 + DUR4 + ISS8
 */
export function generateActivationSerial(
  requestCode: string,
  preset: LicenseDurationPreset,
  customDays = 30,
  nowMs: number = Date.now()
): string {
  const reqValidation = validateMachineRequestCode(requestCode);
  if (!reqValidation.valid || !reqValidation.digest12) {
    throw new Error('Invalid Machine Request Code');
  }

  const digest12 = reqValidation.digest12;
  const durationDays = resolveLicenseDurationDays(preset, customDays);
  const devToken6 = cryptoHash32(digest12, 'DEVICE-BIND-TOKEN').slice(0, 6);
  const durHex4 = durationDays.toString(16).toUpperCase().padStart(4, '0');
  const issuedMinutes = Math.floor(nowMs / 60000);
  const issHex8 = (issuedMinutes >>> 0).toString(16).toUpperCase().padStart(8, '0');

  // Crucial: Signature depends on full digest12 of the machine so no other machine can validate it
  const payloadToSign = `${digest12}|${devToken6}|${durHex4}|${issHex8}`;
  const sig8 = cryptoHash32(payloadToSign, MASTER_DEVELOPER_SECRET);

  return `RLM-ACT-${devToken6}-${durHex4}-${issHex8}-${sig8}`;
}

/**
 * Verifies an Activation Serial strictly against the current machine's Request Code and current time
 */
export function verifyActivationSerial(
  serial: string,
  currentRequestCode: string,
  nowMs: number = Date.now()
): SerialVerificationResult {
  const cleaned = serial.trim().toUpperCase();
  const match = /^RLM-ACT-([0-9A-F]{6})-([0-9A-F]{4})-([0-9A-F]{8})-([0-9A-F]{8})$/.exec(cleaned);
  if (!match) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const [, devToken6, durHex4, issHex8, sig8] = match;

  const reqValidation = validateMachineRequestCode(currentRequestCode);
  if (!reqValidation.valid || !reqValidation.digest12) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const currentDigest12 = reqValidation.digest12;
  const expectedDevToken6 = cryptoHash32(currentDigest12, 'DEVICE-BIND-TOKEN').slice(0, 6);

  // First check: Does the serial's device token match this machine's hardware?
  if (devToken6 !== expectedDevToken6) {
    return {
      valid: false,
      reason: 'DEVICE_MISMATCH',
      boundDeviceToken: devToken6,
    };
  }

  // Second check: Cryptographic signature verification against tampering
  const payloadToVerify = `${currentDigest12}|${devToken6}|${durHex4}|${issHex8}`;
  const expectedSig8 = cryptoHash32(payloadToVerify, MASTER_DEVELOPER_SECRET);
  if (sig8 !== expectedSig8) {
    return {
      valid: false,
      reason: 'SIGNATURE_TAMPERED',
      boundDeviceToken: devToken6,
    };
  }

  // Parse duration and issue timestamp
  const durationDays = parseInt(durHex4, 16);
  const issuedMinutes = parseInt(issHex8, 16);
  if (isNaN(durationDays) || durationDays <= 0 || isNaN(issuedMinutes)) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const issuedAtMs = issuedMinutes * 60000;
  const expiresAtMs = issuedAtMs + durationDays * 86400000;
  const isLifetime = durationDays >= 36500;

  if (!isLifetime && nowMs > expiresAtMs) {
    return {
      valid: false,
      reason: 'EXPIRED',
      durationDays,
      issuedAtIso: new Date(issuedAtMs).toISOString(),
      expiresAtIso: new Date(expiresAtMs).toISOString(),
      remainingDays: 0,
      boundDeviceToken: devToken6,
      isLifetime: false,
    };
  }

  const remainingMs = Math.max(0, expiresAtMs - nowMs);
  const remainingDays = isLifetime ? 36500 : Math.ceil(remainingMs / 86400000);

  let durationLabelAr = `${durationDays} يوم`;
  let durationLabelEn = `${durationDays} Days`;
  if (isLifetime) {
    durationLabelAr = 'ترخيص مدى الحياة (Lifetime)';
    durationLabelEn = 'Lifetime Enterprise License';
  } else if (durationDays === 1) {
    durationLabelAr = 'يوم واحد (24 ساعة)';
    durationLabelEn = '1 Day (24 Hours)';
  } else if (durationDays === 7) {
    durationLabelAr = 'أسبوع واحد (7 أيام)';
    durationLabelEn = '1 Week (7 Days)';
  } else if (durationDays === 30) {
    durationLabelAr = 'شهر واحد (30 يوماً)';
    durationLabelEn = '1 Month (30 Days)';
  } else if (durationDays === 365) {
    durationLabelAr = 'سنة كاملة (365 يوماً)';
    durationLabelEn = '1 Full Year (365 Days)';
  }

  return {
    valid: true,
    durationDays,
    durationLabelAr,
    durationLabelEn,
    issuedAtIso: new Date(issuedAtMs).toISOString(),
    expiresAtIso: new Date(expiresAtMs).toISOString(),
    remainingDays,
    boundDeviceToken: devToken6,
    isLifetime,
  };
}

/**
 * Verifies each individual internal hardware component (Motherboard, CPU, GPU, Disk, System UUID)
 * against the bound hardware snapshot. If any single component changes or fails, returns intact: false.
 */
export function verifyHardwareComponentIntegrity(
  boundHw: HardwareFingerprint,
  currentHw: HardwareFingerprint
): HardwareComponentIntegrityResult {
  const failed: ('MOTHERBOARD' | 'CPU' | 'GPU' | 'DISK_NVME' | 'SYSTEM_UUID')[] = [];

  if (
    boundHw.motherboardSerial.trim().toUpperCase() !==
    currentHw.motherboardSerial.trim().toUpperCase()
  ) {
    failed.push('MOTHERBOARD');
  }
  if (
    boundHw.cpuProcessorId.trim().toUpperCase() !==
    currentHw.cpuProcessorId.trim().toUpperCase()
  ) {
    failed.push('CPU');
  }
  if (
    boundHw.gpuSiliconId.trim().toUpperCase() !==
    currentHw.gpuSiliconId.trim().toUpperCase()
  ) {
    failed.push('GPU');
  }
  if (
    boundHw.diskVolumeSerial.trim().toUpperCase() !==
    currentHw.diskVolumeSerial.trim().toUpperCase()
  ) {
    failed.push('DISK_NVME');
  }
  if (
    boundHw.systemUuid.trim().toUpperCase() !==
    currentHw.systemUuid.trim().toUpperCase()
  ) {
    failed.push('SYSTEM_UUID');
  }

  if (failed.length === 0) {
    return {
      intact: true,
      failedComponents: [],
      reasonAr: 'جميع القطع الداخلية للجهاز مطابقة لبصمة الترخيص الأصلية',
      reasonEn: 'All internal hardware components match the original bound signature',
    };
  }

  const labelMapAr: Record<string, string> = {
    MOTHERBOARD: 'اللوحة الأم (Motherboard)',
    CPU: 'المعالج المركزي (CPU)',
    GPU: 'المعالج الرسومي (GPU)',
    DISK_NVME: 'القرص الصلب (NVMe/Disk)',
    SYSTEM_UUID: 'المعرف الفريد للنظام (UUID)',
  };

  return {
    intact: false,
    failedComponents: failed,
    reasonAr: `توقف أمني فوري: تم اكتشاف تغيير أو تعطل في القطع الداخلية المرتبطة بالسيريال (${failed
      .map((c) => labelMapAr[c] || c)
      .join('، ')})! السيريال يعمل على جهاز واحد فقط.`,
    reasonEn: `Immediate Security Lockout: Internal hardware component mismatch detected (${failed.join(
      ', '
    )})! License is strictly bound to a single machine.`,
  };
}

/**
 * Monotonic High-Water-Mark Clock Guard:
 * Prevents users from rolling back system date/time to bypass 30-day trial or license expiration.
 */
export function evaluateMonotonicClockGuard(
  currentNowMs: number,
  maxObservedClockMs: number,
  toleranceMs = 120000 // 2 minutes tolerance
): ClockTamperCheckResult {
  if (maxObservedClockMs > 0 && currentNowMs + toleranceMs < maxObservedClockMs) {
    const rollbackMinutes = Math.ceil((maxObservedClockMs - currentNowMs) / 60000);
    return {
      clockTampered: true,
      rollbackMinutes,
      updatedMaxClockMs: maxObservedClockMs,
      reasonAr: `تم إيقاف النظام فوراً: تم رصد تلاعب بإرجاع ساعة/تاريخ الجهاز للوراء بمقدار (${rollbackMinutes} دقيقة)! لا يمكن تجاوز الفترة التجريبية أو التفعيل عبر تغيير الوقت.`,
      reasonEn: `System Locked Immediately: System clock rollback detected (${rollbackMinutes} minutes backward)! Rolling back system time cannot bypass trial or license expiration.`,
    };
  }

  return {
    clockTampered: false,
    rollbackMinutes: 0,
    updatedMaxClockMs: Math.max(currentNowMs, maxObservedClockMs || 0),
    reasonAr: 'التوقيت الزمني للنظام سليم ومتسلسل',
    reasonEn: 'System monotonic clock is intact',
  };
}

/**
 * Evaluates the overall 30-Day Trial, Hardware Component Lockout, & Anti-Clock Tampering state
 */
export function evaluateSystemProtectionState(params: {
  hardware: HardwareFingerprint;
  boundHardware?: HardwareFingerprint | null;
  trialStartedAtMs: number;
  trialTotalDays?: number;
  activeSerial?: string | null;
  nowMs?: number;
  lastSeenClockMs?: number;
  forceTrialExpired?: boolean;
  forceClockTampered?: boolean;
}): SystemProtectionEvaluation {
  const {
    hardware,
    boundHardware = null,
    trialStartedAtMs,
    trialTotalDays = 30,
    activeSerial,
    nowMs = Date.now(),
    lastSeenClockMs = 0,
    forceTrialExpired = false,
    forceClockTampered = false,
  } = params;

  const machineRequestCode = generateMachineRequestCode(hardware);

  // 1. Strict Monotonic Anti-Clock Rollback Check
  const clockCheck = evaluateMonotonicClockGuard(nowMs, lastSeenClockMs);
  if (forceClockTampered || clockCheck.clockTampered) {
    const rollbackMins = forceClockTampered ? 4320 : clockCheck.rollbackMinutes;
    return {
      status: 'CLOCK_TAMPERED',
      isLocked: true,
      trialTotalDays,
      trialElapsedDays: trialTotalDays,
      trialRemainingDays: 0,
      machineRequestCode,
      clockRollbackMinutes: rollbackMins,
    };
  }

  // 2. Check internal hardware component integrity if boundHardware is provided
  if (boundHardware) {
    const integrity = verifyHardwareComponentIntegrity(boundHardware, hardware);
    if (!integrity.intact) {
      return {
        status: 'DEVICE_MISMATCH',
        isLocked: true,
        trialTotalDays,
        trialElapsedDays: trialTotalDays,
        trialRemainingDays: 0,
        machineRequestCode,
        failedHardwareComponents: integrity.failedComponents,
      };
    }
  }

  // 3. If an activation serial is installed, validate it against the current machine
  if (activeSerial && activeSerial.trim().length > 0) {
    const verification = verifyActivationSerial(activeSerial, machineRequestCode, nowMs);
    if (verification.valid) {
      return {
        status: 'LICENSE_ACTIVE',
        isLocked: false,
        trialTotalDays,
        trialElapsedDays: 0,
        trialRemainingDays: verification.remainingDays || trialTotalDays,
        licenseDetails: verification,
        machineRequestCode,
      };
    }

    if (verification.reason === 'DEVICE_MISMATCH') {
      return {
        status: 'DEVICE_MISMATCH',
        isLocked: true,
        trialTotalDays,
        trialElapsedDays: trialTotalDays,
        trialRemainingDays: 0,
        licenseDetails: verification,
        machineRequestCode,
      };
    }

    if (verification.reason === 'EXPIRED') {
      return {
        status: 'LICENSE_EXPIRED',
        isLocked: true,
        trialTotalDays,
        trialElapsedDays: trialTotalDays,
        trialRemainingDays: 0,
        licenseDetails: verification,
        machineRequestCode,
      };
    }
  }

  // 4. Otherwise evaluate 30-day trial
  const elapsedMs = Math.max(0, nowMs - trialStartedAtMs);
  const elapsedDays = forceTrialExpired
    ? trialTotalDays
    : Math.floor(elapsedMs / 86400000);
  const remainingDays = forceTrialExpired
    ? 0
    : Math.max(0, trialTotalDays - elapsedDays);

  if (remainingDays <= 0) {
    return {
      status: 'TRIAL_EXPIRED',
      isLocked: true,
      trialTotalDays,
      trialElapsedDays: elapsedDays,
      trialRemainingDays: 0,
      machineRequestCode,
    };
  }

  return {
    status: 'TRIAL_ACTIVE',
    isLocked: false,
    trialTotalDays,
    trialElapsedDays: elapsedDays,
    trialRemainingDays: remainingDays,
    machineRequestCode,
  };
}

/**
 * Sanitizes a raw hardware string into a clean uppercase token
 */
function cleanHwToken(raw: string, maxLen = 18): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (cleaned || 'HW').slice(0, maxLen);
}

/**
 * Extracts real WebGL Unmasked GPU Vendor & Renderer + GPU limits + Canvas 2D Silicon Hash
 * directly from the user's browser and merges optional host WMI/DMI probe data.
 */
export function detectRealHardwareFingerprint(hostProbe?: {
  platform?: string;
  hostname?: string;
  cpuModel?: string;
  cpuCores?: number;
  totalMemGb?: number;
  primaryMac?: string;
  wmiBoardSerial?: string | null;
  wmiCpuId?: string | null;
  wmiGpuId?: string | null;
  wmiDiskSerial?: string | null;
  wmiSystemUuid?: string | null;
}): HardwareFingerprint {
  let gpuVendor = 'WebGL-Vendor';
  let gpuRenderer = 'Integrated-GPU';
  let gpuMaxTex = 4096;
  let canvasHash = 'CANVAS-STD';

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 60;
      const gl =
        (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
        (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

      if (gl) {
        const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugExt) {
          gpuVendor =
            String(gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL) || '') ||
            String(gl.getParameter(gl.VENDOR) || 'GPU-Vendor');
          gpuRenderer =
            String(gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || '') ||
            String(gl.getParameter(gl.RENDERER) || 'GPU-Renderer');
        } else {
          gpuVendor = String(gl.getParameter(gl.VENDOR) || 'GPU-Vendor');
          gpuRenderer = String(gl.getParameter(gl.RENDERER) || 'GPU-Renderer');
        }
        gpuMaxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096);
      }

      // Deterministic Canvas 2D silicon rasterization signature
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        ctx2d.textBaseline = 'alphabetic';
        ctx2d.fillStyle = '#4f46e5';
        ctx2d.fillRect(10, 10, 100, 30);
        ctx2d.fillStyle = '#10b981';
        ctx2d.font = '14px monospace';
        ctx2d.fillText('RLM-HW-SILICON-LOCK', 14, 28);
        const dataUrl = canvas.toDataURL();
        canvasHash = cryptoHash32(dataUrl, 'CANVAS-SILICON-SALT');
      }
    } catch {
      // Fallback if headless or WebGL disabled
    }
  }

  const navCores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? Number(navigator.hardwareConcurrency)
      : hostProbe?.cpuCores || 8;

  const navMemGb =
    typeof navigator !== 'undefined' && (navigator as any).deviceMemory
      ? Number((navigator as any).deviceMemory)
      : hostProbe?.totalMemGb || 16;

  const navPlatform =
    typeof navigator !== 'undefined' && navigator.platform
      ? String(navigator.platform)
      : hostProbe?.platform || 'x86_64';

  const screenSpec =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}@${window.devicePixelRatio || 1}`
      : '1920x1080x24@1';

  const cpuModel = hostProbe?.cpuModel || `${navPlatform}-${navCores}C`;
  const hostMac = hostProbe?.primaryMac || 'LOCAL-NIC';

  // 1. Motherboard Serial: Use real WMI/DMI board serial if present, otherwise derive from Platform + MAC + Canvas Silicon + Host UUID
  const mbHash = cryptoHash32(
    `${navPlatform}|${hostMac}|${hostProbe?.wmiBoardSerial || ''}|${canvasHash}`,
    'MB-REAL-SILICON'
  );
  const motherboardSerial = hostProbe?.wmiBoardSerial
    ? `MB-${cleanHwToken(hostProbe.wmiBoardSerial, 14)}-${mbHash.slice(0, 6)}`
    : `MB-${cleanHwToken(navPlatform, 8)}-${canvasHash.slice(0, 4)}-${mbHash}`;

  // 2. CPU Processor ID: Use real WMI CPU ID or real CPU Model + Core Count + Architecture
  const cpuHash = cryptoHash32(
    `${cpuModel}|CORES:${navCores}|MEM:${navMemGb}|${navPlatform}`,
    'CPU-REAL-SILICON'
  );
  const cpuProcessorId = hostProbe?.wmiCpuId
    ? `CPU-${cleanHwToken(hostProbe.wmiCpuId, 16)}-${navCores}C`
    : `CPU-${cleanHwToken(cpuModel, 14)}-${navCores}C-${cpuHash}`;

  // 3. GPU Silicon ID: Extracted directly from WebGL Unmasked Renderer & Vendor
  const gpuHash = cryptoHash32(`${gpuVendor}|${gpuRenderer}|TEX:${gpuMaxTex}`, 'GPU-REAL-SILICON');
  const gpuSiliconId = hostProbe?.wmiGpuId
    ? `GPU-${cleanHwToken(hostProbe.wmiGpuId, 14)}-${gpuHash.slice(0, 6)}`
    : `GPU-${cleanHwToken(gpuRenderer, 16)}-${gpuHash.slice(0, 6)}`;

  // 4. Disk Volume Serial: Use real WMI/DMI disk serial or deterministic storage/partition signature
  const diskHash = cryptoHash32(
    `${hostProbe?.wmiDiskSerial || ''}|${screenSpec}|MEM:${navMemGb}GB|${hostMac}`,
    'DISK-REAL-SILICON'
  );
  const diskVolumeSerial = hostProbe?.wmiDiskSerial
    ? `NVME-${cleanHwToken(hostProbe.wmiDiskSerial, 14)}-${diskHash.slice(0, 6)}`
    : `DISK-${navMemGb}G-${cleanHwToken(screenSpec, 9)}-${diskHash}`;

  // 5. System UUID
  const uuidHash = cryptoHash32(
    `${motherboardSerial}|${cpuProcessorId}|${gpuSiliconId}|${diskVolumeSerial}`,
    'SYS-UUID-REAL'
  );
  const systemUuid = hostProbe?.wmiSystemUuid
    ? `UUID-${cleanHwToken(hostProbe.wmiSystemUuid, 20)}`
    : `SYS-UUID-${uuidHash}-${canvasHash.slice(0, 4)}`;

  return {
    motherboardSerial,
    cpuProcessorId,
    gpuSiliconId,
    diskVolumeSerial,
    systemUuid,
    detectionSource: 'LIVE_DEVICE_TELEMETRY',
    rawTelemetry: {
      gpuVendor,
      gpuRenderer,
      cpuModel,
      cpuCores: navCores,
      memoryGb: navMemGb,
      platform: navPlatform,
      screenSpec,
      hostMacOrMachineId: hostProbe?.wmiBoardSerial || hostMac,
    },
  };
}

/**
 * Parses JSON output from RLM_Hardware_WMI_Scanner.bat or manual serial lines
 */
export function parseWindowsWmiHardwareInput(rawInput: string): HardwareFingerprint | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed.motherboardSerial || parsed.cpuProcessorId || parsed.gpuSiliconId)
    ) {
      return {
        motherboardSerial: String(parsed.motherboardSerial || 'MB-WMI-CUSTOM').trim().toUpperCase(),
        cpuProcessorId: String(parsed.cpuProcessorId || 'CPU-WMI-CUSTOM').trim().toUpperCase(),
        gpuSiliconId: String(parsed.gpuSiliconId || 'GPU-WMI-CUSTOM').trim().toUpperCase(),
        diskVolumeSerial: String(parsed.diskVolumeSerial || 'DISK-WMI-CUSTOM').trim().toUpperCase(),
        systemUuid: String(parsed.systemUuid || 'UUID-WMI-CUSTOM').trim().toUpperCase(),
        detectionSource: 'WINDOWS_WMI_IMPORTED',
      };
    }
  } catch {
    // Allow key=value or line-by-line format fallback
  }

  const lines = trimmed
    .split(/[\r\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return {
      motherboardSerial: (lines[0] || 'MB-WMI-01').toUpperCase(),
      cpuProcessorId: (lines[1] || 'CPU-WMI-01').toUpperCase(),
      gpuSiliconId: (lines[2] || 'GPU-WMI-01').toUpperCase(),
      diskVolumeSerial: (lines[3] || 'DISK-WMI-01').toUpperCase(),
      systemUuid: (lines[4] || `UUID-WMI-${cryptoHash32(trimmed)}`).toUpperCase(),
      detectionSource: 'WINDOWS_WMI_IMPORTED',
    };
  }

  return null;
}

