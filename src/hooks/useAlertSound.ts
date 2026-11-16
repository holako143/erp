import { useCallback, useEffect, useMemo, useRef } from 'react';
import { HasebUiThemeId } from '../core/realtimeSyncEngine';
import { RemoteSyncToastSpec } from '../core/notificationsEngine';
import {
  AlertSoundKind,
  DEFAULT_SOUND_ALERT_PREFERENCES,
  SoundAlertPreferences,
  ThemeAlertSoundProfile,
  getThemeAlertSoundProfile,
  mapToastSeverityToSoundKind,
  synthesizeThemeAlertSound,
} from '../core/soundAlertEngine';

export interface UseAlertSoundOptions {
  uiTheme: HasebUiThemeId;
  preferences?: SoundAlertPreferences;
  activeToastNotification?: RemoteSyncToastSpec | null;
  lastSecurityAlert?: string | null;
  blockedInspectCount?: number;
}

export interface UseAlertSoundResult {
  playAlertSound: (kind: AlertSoundKind, overrideVolumePercent?: number) => boolean;
  activeSoundProfile: ThemeAlertSoundProfile;
}

/**
 * Plays subtle, theme-appropriate Web Audio sound alerts whenever a toast notification
 * or security alert appears, respecting user configuration in Settings.
 */
export function useAlertSound({
  uiTheme,
  preferences = DEFAULT_SOUND_ALERT_PREFERENCES,
  activeToastNotification = null,
  lastSecurityAlert = null,
  blockedInspectCount = 0,
}: UseAlertSoundOptions): UseAlertSoundResult {
  const sharedAudioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayedToastIdRef = useRef<string | null>(null);
  const lastPlayedSecurityKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const ctx = sharedAudioCtxRef.current;
      sharedAudioCtxRef.current = null;
      if (ctx && ctx.state !== 'closed' && typeof ctx.close === 'function') {
        ctx.close().catch(() => {});
      }
    };
  }, []);

  const playAlertSound = useCallback(
    (kind: AlertSoundKind, overrideVolumePercent?: number): boolean => {
      const effectiveVolume =
        typeof overrideVolumePercent === 'number'
          ? overrideVolumePercent
          : preferences.volumePercent;
      const profile = getThemeAlertSoundProfile(uiTheme, kind, effectiveVolume);
      return synthesizeThemeAlertSound(profile, sharedAudioCtxRef);
    },
    [uiTheme, preferences.volumePercent]
  );

  // Play subtle theme-appropriate chime when a new toast notification appears
  useEffect(() => {
    if (!activeToastNotification?.id) {
      lastPlayedToastIdRef.current = null;
      return;
    }
    if (lastPlayedToastIdRef.current === activeToastNotification.id) {
      return;
    }
    lastPlayedToastIdRef.current = activeToastNotification.id;

    if (!preferences.enabled || !preferences.toastEnabled) {
      return;
    }

    const kind = mapToastSeverityToSoundKind(activeToastNotification.severity);
    playAlertSound(kind);
  }, [
    activeToastNotification,
    preferences.enabled,
    preferences.toastEnabled,
    playAlertSound,
  ]);

  // Play distinct theme-appropriate operator warning tone when a security alert appears
  useEffect(() => {
    if (!lastSecurityAlert) {
      return;
    }
    const securityTriggerKey = `${blockedInspectCount}:${lastSecurityAlert}`;
    if (!isMountedRef.current) {
      lastPlayedSecurityKeyRef.current = securityTriggerKey;
      return;
    }
    if (lastPlayedSecurityKeyRef.current === securityTriggerKey) {
      return;
    }
    lastPlayedSecurityKeyRef.current = securityTriggerKey;

    if (!preferences.enabled || !preferences.securityEnabled) {
      return;
    }

    playAlertSound('security_alert');
  }, [
    lastSecurityAlert,
    blockedInspectCount,
    preferences.enabled,
    preferences.securityEnabled,
    playAlertSound,
  ]);

  const activeSoundProfile = useMemo(
    () =>
      getThemeAlertSoundProfile(
        uiTheme,
        'toast_info',
        preferences.volumePercent
      ),
    [uiTheme, preferences.volumePercent]
  );

  return {
    playAlertSound,
    activeSoundProfile,
  };
}
