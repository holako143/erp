/**
 * Haseb Enterprise ERP — Real-Time LAN State Sync & Delta Patch Engine
 * Pure TypeScript functions for cross-device preference normalization,
 * fast delta patch computation, echo suppression, and state merging.
 */

export type HasebUiFontId = 'ibm_plex' | 'cairo' | 'readex' | 'tajawal';

export type HasebUiThemeId =
  | 'corporate_slate'
  | 'swiss_light'
  | 'haseb_royal'
  | 'haseb_sand'
  | 'obsidian_dark';

export type HasebUiDensity = 'comfortable' | 'compact';

export interface SyncedUiPreferences {
  uiTheme: HasebUiThemeId;
  uiDensity: HasebUiDensity;
  language: 'ar' | 'en';
  uiFont: HasebUiFontId;
  fontScalePercent: number;
  windowScalePercent: number;
  tabScalePercent: number;
  isOnboardingCompleted: boolean;
}

/**
 * Normalizes legacy onboarding font tokens ('ibm', 'almarai') or Navbar tokens
 * ('ibm_plex', 'readex', 'cairo', 'tajawal') into canonical DOM dataset font IDs.
 */
export function normalizeUiFontId(raw?: string | null): HasebUiFontId {
  switch ((raw || '').trim()) {
    case 'cairo':
      return 'cairo';
    case 'tajawal':
      return 'tajawal';
    case 'readex':
    case 'almarai':
      return 'readex';
    case 'ibm_plex':
    case 'ibm':
    default:
      return 'ibm_plex';
  }
}

export const VALID_UI_THEMES: readonly HasebUiThemeId[] = [
  'corporate_slate',
  'swiss_light',
  'haseb_royal',
  'haseb_sand',
  'obsidian_dark',
] as const;

export function normalizeUiThemeId(raw?: string | null): HasebUiThemeId {
  if (raw && (VALID_UI_THEMES as readonly string[]).includes(raw)) {
    return raw as HasebUiThemeId;
  }
  return 'haseb_royal';
}

export function normalizeUiDensity(raw?: string | null): HasebUiDensity {
  return raw === 'compact' ? 'compact' : 'comfortable';
}

/**
 * Shallow-identity-fast delta computation between two ERP state snapshots.
 * In React immutable state, unchanged keys preserve identical reference identity (O(1)).
 */
export function computeStateDeltaPatch<T extends Record<string, any>>(
  prev: T | null,
  next: T,
  allowedKeys?: readonly string[]
): {
  hasChanges: boolean;
  patch: Partial<T>;
  changedKeys: string[];
} {
  const keys = allowedKeys ? Array.from(allowedKeys) : Object.keys(next);
  if (!prev) {
    const fullPatch: Partial<T> = {};
    for (const k of keys) {
      if (next[k] !== undefined) {
        (fullPatch as Record<string, any>)[k] = next[k];
      }
    }
    return {
      hasChanges: Object.keys(fullPatch).length > 0,
      patch: fullPatch,
      changedKeys: Object.keys(fullPatch),
    };
  }

  const patch: Partial<T> = {};
  const changedKeys: string[] = [];

  for (const key of keys) {
    const prevVal = prev[key];
    const nextVal = next[key];
    if (nextVal === undefined) continue;
    if (Object.is(prevVal, nextVal)) continue;

    // For objects/arrays where React may have produced a fresh reference with equal content
    if (
      prevVal !== null &&
      nextVal !== null &&
      typeof prevVal === 'object' &&
      typeof nextVal === 'object'
    ) {
      try {
        if (JSON.stringify(prevVal) === JSON.stringify(nextVal)) {
          continue;
        }
      } catch {
        // Fallback: treat as changed
      }
    }

    (patch as Record<string, any>)[key] = nextVal;
    changedKeys.push(key);
  }

  return {
    hasChanges: changedKeys.length > 0,
    patch,
    changedKeys,
  };
}

/**
 * Immutable merge of a partial remote patch into an existing ERP state object.
 * Ignores undefined values and preserves unrelated keys untouched.
 */
export function mergeStateDeltaPatch<T extends Record<string, any>>(
  current: T,
  patch: Partial<T> | null | undefined
): T {
  if (!patch || typeof patch !== 'object') return current;
  const next: Record<string, any> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next as T;
}

/**
 * Evaluates whether an incoming WebSocket or SSE revision should be applied on this client.
 * Eliminates echo loops cleanly using originClientId instead of brittle blind time windows.
 */
export function shouldApplyRemoteRevision(input: {
  incomingRevision: number;
  currentRevision: number;
  originClientId?: string | null;
  localClientId: string;
}): boolean {
  if (!Number.isFinite(input.incomingRevision) || input.incomingRevision <= 0) {
    return false;
  }
  if (input.originClientId && input.originClientId === input.localClientId) {
    return false;
  }
  return input.incomingRevision > input.currentRevision;
}

/**
 * Builds or retrieves a persistent per-browser-tab/session client identifier used to
 * suppress self-echo over WebSocket & SSE real-time broadcasts.
 */
export function getOrCreateSyncClientId(
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
): string {
  const key = 'haseb_sync_client_id';
  try {
    const existing = storage?.getItem(key);
    if (existing && existing.trim().length >= 6) {
      return existing.trim();
    }
  } catch {
    // ignore storage restrictions
  }
  const generated = `cli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    storage?.setItem(key, generated);
  } catch {
    // ignore storage restrictions
  }
  return generated;
}

/**
 * Determines whether the server state indicates initial setup has already been completed
 * on the host or another LAN client so secondary devices sync directly without re-prompting.
 */
export function resolveSyncedOnboardingStatus(
  d: Record<string, any>,
  localFlag: boolean
): boolean {
  if (typeof d.isOnboardingCompleted === 'boolean') {
    return d.isOnboardingCompleted;
  }
  if (localFlag) return true;
  // Backward compatibility: if server already has real userAccounts or configured company
  if (
    d.company &&
    typeof d.company.nameAr === 'string' &&
    d.company.nameAr.trim().length > 0 &&
    Array.isArray(d.userAccounts) &&
    d.userAccounts.length > 0
  ) {
    return true;
  }
  return false;
}

/**
 * Computes the WebSocket URL matching the current browser origin protocol (ws:// vs wss://).
 */
export function buildErpSyncWebSocketUrl(locationLike: {
  protocol: string;
  host: string;
}): string {
  const wsProto = locationLike.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${locationLike.host}/ws/erp-sync`;
}

// ============================================================================
// Pending Server Synchronization Queue & Footer Visual Status Helpers
// ============================================================================

export const PENDING_SYNC_QUEUE_STORAGE_KEY = 'haseb_pending_sync_queue_v1';

export interface PendingSyncTransaction {
  id: string;
  createdAt: string;
  endpoint: '/api/v1/erp/patch' | '/api/v1/erp/state';
  changedKeys: string[];
  baseRevision: number;
  patchPayload?: Record<string, any>;
}

export type FooterSyncVisualState = 'SYNCED' | 'SYNCING' | 'PENDING' | 'OFFLINE';

export interface FooterSyncStatusMeta {
  state: FooterSyncVisualState;
  pendingCount: number;
  tone: 'emerald' | 'blue' | 'amber' | 'rose';
  shortLabelAr: string;
  shortLabelEn: string;
  tooltipAr: string;
  tooltipEn: string;
}

export function loadPendingSyncQueue(
  storage?: Pick<Storage, 'getItem'> | null
): PendingSyncTransaction[] {
  try {
    const raw = storage?.getItem(PENDING_SYNC_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingSyncTransaction =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        (item.endpoint === '/api/v1/erp/patch' || item.endpoint === '/api/v1/erp/state')
    );
  } catch {
    return [];
  }
}

export function savePendingSyncQueue(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined,
  queue: PendingSyncTransaction[]
): void {
  try {
    if (!storage) return;
    if (queue.length === 0) {
      storage.removeItem(PENDING_SYNC_QUEUE_STORAGE_KEY);
    } else {
      storage.setItem(PENDING_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function enqueuePendingSyncEntry(
  queue: PendingSyncTransaction[],
  entry: PendingSyncTransaction,
  maxQueueLength = 25
): PendingSyncTransaction[] {
  const next = [...queue.filter((item) => item.id !== entry.id), entry];
  if (next.length <= maxQueueLength) {
    return next;
  }
  // Coalesce oldest patch entries when queue grows large while retaining keys & full fallback
  const overflow = next.slice(0, next.length - maxQueueLength + 1);
  const mergedKeys = Array.from(
    new Set(overflow.flatMap((item) => item.changedKeys || []))
  );
  const coalesced: PendingSyncTransaction = {
    id: overflow[overflow.length - 1].id,
    createdAt: overflow[overflow.length - 1].createdAt,
    endpoint: '/api/v1/erp/state',
    changedKeys: mergedKeys,
    baseRevision: overflow[0].baseRevision,
  };
  return [coalesced, ...next.slice(overflow.length)];
}

export function computeFooterSyncStatusMeta(input: {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  realtimeSyncStatus?: 'WS_LIVE' | 'SSE_LIVE' | 'POLLING' | 'RECONNECTING';
}): FooterSyncStatusMeta {
  const safePending = Math.max(0, Math.floor(Number(input.pendingCount) || 0));

  if (!input.isOnline) {
    if (safePending > 0) {
      return {
        state: 'OFFLINE',
        pendingCount: safePending,
        tone: 'amber',
        shortLabelAr: `${safePending} بانتظار الشبكة`,
        shortLabelEn: `${safePending} queued (offline)`,
        tooltipAr: `وضع عدم الاتصال: توجد ${safePending} معاملة محفوظة محلياً وستُرفع للخادم فور عودة الاتصال.`,
        tooltipEn: `Offline: ${safePending} queued transaction(s) waiting for network reconnection.`,
      };
    }
    return {
      state: 'OFFLINE',
      pendingCount: 0,
      tone: 'amber',
      shortLabelAr: 'غير متصل',
      shortLabelEn: 'Offline',
      tooltipAr: 'لا يوجد اتصال بالشبكة حالياً — يتم الحفظ محلياً بأمان.',
      tooltipEn: 'Network offline — changes are saved locally.',
    };
  }

  if (safePending > 0 && input.isSyncing) {
    return {
      state: 'SYNCING',
      pendingCount: safePending,
      tone: 'blue',
      shortLabelAr: `جاري مزامنة (${safePending})`,
      shortLabelEn: `Syncing (${safePending})`,
      tooltipAr: `جاري رفع ${safePending} معاملة معلقة إلى خادم الشبكة المحلية الآن...`,
      tooltipEn: `Synchronizing ${safePending} queued transaction(s) with the server...`,
    };
  }

  if (safePending > 0) {
    return {
      state: 'PENDING',
      pendingCount: safePending,
      tone: 'amber',
      shortLabelAr: `${safePending} قيد الانتظار`,
      shortLabelEn: `${safePending} pending`,
      tooltipAr: `توجد ${safePending} معاملة معلقة بانتظار المزامنة مع الخادم — انقر للمزامنة الفورية.`,
      tooltipEn: `${safePending} queued transaction(s) awaiting server synchronization — click to sync now.`,
    };
  }

  if (input.isSyncing) {
    return {
      state: 'SYNCING',
      pendingCount: 0,
      tone: 'blue',
      shortLabelAr: 'مزامنة جارية',
      shortLabelEn: 'Syncing',
      tooltipAr: 'جاري التحقق من المزامنة مع خادم الشبكة المحلية...',
      tooltipEn: 'Synchronizing state with LAN server...',
    };
  }

  return {
    state: 'SYNCED',
    pendingCount: 0,
    tone: 'emerald',
    shortLabelAr: 'متزامن (0 معلق)',
    shortLabelEn: 'Synced (0 pending)',
    tooltipAr:
      input.realtimeSyncStatus === 'WS_LIVE'
        ? 'جميع المعاملات متزامنة لحظياً عبر WebSocket (0 معاملات معلقة).'
        : 'جميع المعاملات متزامنة مع الخادم (0 معاملات معلقة).',
    tooltipEn: 'All transactions synchronized with server (0 pending queued transactions).',
  };
}

