/**
 * Haseb Enterprise ERP — Theme-Appropriate Web Audio Alert Synthesizer & Preferences Engine
 * Pure TypeScript functions for mapping active UI themes and alert severities
 * into subtle, pleasant, non-intrusive POS acoustic feedback without external audio files.
 */

import { HasebUiThemeId } from './realtimeSyncEngine';
import { NotificationSeverity } from './notificationsEngine';
import { MasterSystemConfig } from '../types/erp';

export type AlertSoundKind =
  | 'toast_info'
  | 'toast_success'
  | 'toast_warning'
  | 'toast_critical'
  | 'security_alert';

export interface SoundAlertPreferences {
  enabled: boolean;
  toastEnabled: boolean;
  securityEnabled: boolean;
  volumePercent: number; // 0..100
}

export interface ThemeAlertSoundNote {
  frequencyHz: number;
  startOffsetSec: number;
  durationSec: number;
  gainMultiplier?: number;
  waveform?: 'sine' | 'triangle';
}

export interface ThemeAlertSoundProfile {
  theme: HasebUiThemeId;
  kind: AlertSoundKind;
  waveform: 'sine' | 'triangle';
  baseGain: number;
  notes: ThemeAlertSoundNote[];
  signatureNameAr: string;
  signatureNameEn: string;
}

export const SOUND_ALERT_PREFS_STORAGE_KEY = 'haseb_sound_alert_prefs_v1';

export const DEFAULT_SOUND_ALERT_PREFERENCES: SoundAlertPreferences = {
  enabled: true,
  toastEnabled: true,
  securityEnabled: true,
  volumePercent: 35,
};

export function clampSoundAlertVolume(value: number | undefined | null): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_SOUND_ALERT_PREFERENCES.volumePercent;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export function normalizeSoundAlertPreferences(
  config?: Partial<MasterSystemConfig> | null,
  localOverride?: Partial<SoundAlertPreferences> | null
): SoundAlertPreferences {
  return {
    enabled:
      typeof localOverride?.enabled === 'boolean'
        ? localOverride.enabled
        : typeof config?.soundAlertsEnabled === 'boolean'
        ? config.soundAlertsEnabled
        : DEFAULT_SOUND_ALERT_PREFERENCES.enabled,
    toastEnabled:
      typeof localOverride?.toastEnabled === 'boolean'
        ? localOverride.toastEnabled
        : typeof config?.soundAlertToastEnabled === 'boolean'
        ? config.soundAlertToastEnabled
        : DEFAULT_SOUND_ALERT_PREFERENCES.toastEnabled,
    securityEnabled:
      typeof localOverride?.securityEnabled === 'boolean'
        ? localOverride.securityEnabled
        : typeof config?.soundAlertSecurityEnabled === 'boolean'
        ? config.soundAlertSecurityEnabled
        : DEFAULT_SOUND_ALERT_PREFERENCES.securityEnabled,
    volumePercent: clampSoundAlertVolume(
      localOverride?.volumePercent ?? config?.soundAlertVolume
    ),
  };
}

export function loadSoundAlertPreferences(
  storage?: Pick<Storage, 'getItem'> | null
): Partial<SoundAlertPreferences> | null {
  try {
    const raw = storage?.getItem(SOUND_ALERT_PREFS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const result: Partial<SoundAlertPreferences> = {};
    if (typeof parsed.enabled === 'boolean') result.enabled = parsed.enabled;
    if (typeof parsed.toastEnabled === 'boolean') result.toastEnabled = parsed.toastEnabled;
    if (typeof parsed.securityEnabled === 'boolean') result.securityEnabled = parsed.securityEnabled;
    if (typeof parsed.volumePercent === 'number') {
      result.volumePercent = clampSoundAlertVolume(parsed.volumePercent);
    }
    return result;
  } catch {
    return null;
  }
}

export function saveSoundAlertPreferences(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  prefs: SoundAlertPreferences
): void {
  try {
    storage?.setItem(SOUND_ALERT_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota errors
  }
}

export function mapToastSeverityToSoundKind(
  severity?: NotificationSeverity | null
): AlertSoundKind {
  switch (severity) {
    case 'success':
      return 'toast_success';
    case 'warning':
      return 'toast_warning';
    case 'critical':
      return 'toast_critical';
    case 'info':
    default:
      return 'toast_info';
  }
}

interface ThemeAcousticIdentity {
  waveform: 'sine' | 'triangle';
  signatureNameAr: string;
  signatureNameEn: string;
  infoFreqs: [number, number];
  successFreqs: [number, number, number];
  warningFreqs: [number, number];
  securityFreqs: [number, number, number];
}

const THEME_ACOUSTIC_MAP: Record<HasebUiThemeId, ThemeAcousticIdentity> = {
  corporate_slate: {
    waveform: 'sine',
    signatureNameAr: 'رنين مؤسسي متزن (لومينا سلات)',
    signatureNameEn: 'Balanced Corporate Chime (Lumina Slate)',
    infoFreqs: [523.25, 659.25], // C5 -> E5
    successFreqs: [523.25, 659.25, 783.99], // C5 -> E5 -> G5
    warningFreqs: [493.88, 440.0], // B4 -> A4
    securityFreqs: [659.25, 440.0, 659.25], // Distinct double-pulse alert
  },
  haseb_royal: {
    waveform: 'sine',
    signatureNameAr: 'رنين نيلي ملكي متناغم (إمبريال إنديجو)',
    signatureNameEn: 'Imperial Indigo Harmonic Fifth',
    infoFreqs: [440.0, 659.25], // A4 -> E5
    successFreqs: [440.0, 554.37, 880.0], // A4 -> C#5 -> A5
    warningFreqs: [523.25, 392.0], // C5 -> G4
    securityFreqs: [587.33, 392.0, 587.33],
  },
  swiss_light: {
    waveform: 'sine',
    signatureNameAr: 'نغمة بلورية نقية خفيفة (نورديك تيتانيوم)',
    signatureNameEn: 'Crisp Nordic Crystal Tone',
    infoFreqs: [659.25, 987.77], // E5 -> B5
    successFreqs: [587.33, 739.99, 880.0], // D5 -> F#5 -> A5
    warningFreqs: [622.25, 523.25],
    securityFreqs: [783.99, 523.25, 783.99],
  },
  haseb_sand: {
    waveform: 'sine',
    signatureNameAr: 'إيقاع خشبي دافئ مريح للأذن (كهرمان دافئ)',
    signatureNameEn: 'Warm Amber Soft Marimba Tone',
    infoFreqs: [349.23, 440.0], // F4 -> A4
    successFreqs: [349.23, 440.0, 523.25], // F4 -> A4 -> C5
    warningFreqs: [392.0, 329.63], // G4 -> E4
    securityFreqs: [440.0, 311.13, 440.0],
  },
  obsidian_dark: {
    waveform: 'triangle',
    signatureNameAr: 'صدى ليلي عميق وهادئ (كربون أوبسيديان)',
    signatureNameEn: 'Deep Velvet Obsidian Resonance',
    infoFreqs: [293.66, 440.0], // D4 -> A4
    successFreqs: [293.66, 369.99, 587.33], // D4 -> F#4 -> D5
    warningFreqs: [329.63, 261.63], // E4 -> C4
    securityFreqs: [415.3, 277.18, 415.3],
  },
};

/**
 * Generates a subtle, theme-matched Web Audio API sound profile for a toast or security alert.
 * Peak gain is capped intentionally low (<= 0.16 at 100% volume) so POS operators get clear
 * auditory awareness without startling customers at checkout.
 */
export function getThemeAlertSoundProfile(
  theme: HasebUiThemeId,
  kind: AlertSoundKind,
  volumePercent = DEFAULT_SOUND_ALERT_PREFERENCES.volumePercent
): ThemeAlertSoundProfile {
  const safeTheme: HasebUiThemeId =
    theme in THEME_ACOUSTIC_MAP ? theme : 'corporate_slate';
  const palette = THEME_ACOUSTIC_MAP[safeTheme];
  const normalizedVol = clampSoundAlertVolume(volumePercent) / 100;
  // Subtle amplitude floor/ceiling tailored for retail POS environments
  const maxAmplitude = kind === 'security_alert' || kind === 'toast_critical' ? 0.16 : 0.11;
  const baseGain = Number((normalizedVol * maxAmplitude).toFixed(4));

  if (kind === 'toast_success') {
    const [f1, f2, f3] = palette.successFreqs;
    return {
      theme: safeTheme,
      kind,
      waveform: palette.waveform,
      baseGain,
      signatureNameAr: palette.signatureNameAr,
      signatureNameEn: palette.signatureNameEn,
      notes: [
        { frequencyHz: f1, startOffsetSec: 0, durationSec: 0.085, gainMultiplier: 0.85 },
        { frequencyHz: f2, startOffsetSec: 0.065, durationSec: 0.095, gainMultiplier: 0.95 },
        { frequencyHz: f3, startOffsetSec: 0.135, durationSec: 0.15, gainMultiplier: 1.0 },
      ],
    };
  }

  if (kind === 'toast_warning') {
    const [f1, f2] = palette.warningFreqs;
    return {
      theme: safeTheme,
      kind,
      waveform: 'triangle',
      baseGain,
      signatureNameAr: palette.signatureNameAr,
      signatureNameEn: palette.signatureNameEn,
      notes: [
        { frequencyHz: f1, startOffsetSec: 0, durationSec: 0.1, gainMultiplier: 0.9 },
        { frequencyHz: f2, startOffsetSec: 0.11, durationSec: 0.14, gainMultiplier: 0.95 },
      ],
    };
  }

  if (kind === 'toast_critical' || kind === 'security_alert') {
    const [f1, f2, f3] = palette.securityFreqs;
    return {
      theme: safeTheme,
      kind,
      waveform: 'triangle',
      baseGain,
      signatureNameAr: palette.signatureNameAr,
      signatureNameEn: palette.signatureNameEn,
      notes: [
        { frequencyHz: f1, startOffsetSec: 0, durationSec: 0.095, gainMultiplier: 1.0, waveform: 'triangle' },
        { frequencyHz: f2, startOffsetSec: 0.11, durationSec: 0.105, gainMultiplier: 0.95, waveform: 'triangle' },
        { frequencyHz: f3, startOffsetSec: 0.23, durationSec: 0.14, gainMultiplier: 1.0, waveform: 'sine' },
      ],
    };
  }

  // Default: 'toast_info'
  const [f1, f2] = palette.infoFreqs;
  return {
    theme: safeTheme,
    kind: 'toast_info',
    waveform: palette.waveform,
    baseGain,
    signatureNameAr: palette.signatureNameAr,
    signatureNameEn: palette.signatureNameEn,
    notes: [
      { frequencyHz: f1, startOffsetSec: 0, durationSec: 0.085, gainMultiplier: 0.85 },
      { frequencyHz: f2, startOffsetSec: 0.07, durationSec: 0.13, gainMultiplier: 1.0 },
    ],
  };
}

/**
 * Plays a ThemeAlertSoundProfile using Web Audio API.
 * Uses a shared AudioContext ref when supplied to avoid leaking AudioContexts across rapid alerts.
 */
export function synthesizeThemeAlertSound(
  profile: ThemeAlertSoundProfile,
  sharedCtxRef?: { current: AudioContext | null }
): boolean {
  if (typeof window === 'undefined' || profile.baseGain <= 0.0005 || profile.notes.length === 0) {
    return false;
  }

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;

    let ctx = sharedCtxRef?.current || null;
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContextClass();
      if (sharedCtxRef) {
        sharedCtxRef.current = ctx;
      }
    }

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }

    const baseTime = ctx.currentTime + 0.01;
    for (const note of profile.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = baseTime + Math.max(0, note.startOffsetSec);
      const stopTime = startTime + Math.max(0.04, note.durationSec);
      const peak = Math.max(0.002, profile.baseGain * (note.gainMultiplier ?? 1));

      osc.type = note.waveform || profile.waveform;
      osc.frequency.setValueAtTime(note.frequencyHz, startTime);

      // Gentle 12ms fade-in + smooth exponential decay to prevent clicking/popping
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + Math.min(0.015, note.durationSec * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(stopTime + 0.01);
    }

    return true;
  } catch {
    return false;
  }
}
