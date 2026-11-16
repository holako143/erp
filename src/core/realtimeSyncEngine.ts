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

// ============================================================================
// Multi-Device Conflict-Free 3-Way Entity Merge & Revision Catch-Up Engine
// ============================================================================

export const ENTITY_COLLECTION_KEYS: readonly string[] = [
  'categories',
  'products',
  'barcodes',
  'traceabilityEvents',
  'suppliers',
  'purchaseOrders',
  'goodsReceipts',
  'purchaseReturns',
  'customers',
  'salesInvoices',
  'salesReturns',
  'warrantyTickets',
  'salesPipelineDocs',
  'chartAccounts',
  'journalEntries',
  'bankStatementLines',
  'postDatedChecks',
  'exchangeRates',
  'costCenterBudgets',
  'employees',
  'fixedAssets',
  'productionOrders',
  'projects',
  'fleetVehicles',
  'qualityInspections',
  'crmLeads',
  'ecommerceOrders',
  'workflowApprovals',
  'auditLogs',
  'tenants',
  'branches',
  'warehouses',
  'userAccounts',
  'promoCoupons',
  'promotionalOffers',
  'outboundMessages',
  'whatsappAccounts',
  'shiftHistory',
  'posCart',
  'holdBills',
  'interBranchTransfers',
  'liveEventNotifications',
] as const;

const ENTITY_COLLECTION_KEY_SET = new Set<string>(ENTITY_COLLECTION_KEYS);

function areJsonValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function defaultEntityKey(item: any, fallbackIdx: number): string {
  if (item && typeof item === 'object') {
    if (typeof item.id === 'string' && item.id.length > 0) return `id:${item.id}`;
    if (typeof item.productId === 'string' && item.productId.length > 0) {
      return `pid:${item.productId}`;
    }
    if (typeof item.code === 'string' && item.code.length > 0) return `code:${item.code}`;
    try {
      return `json:${JSON.stringify(item)}`;
    } catch {
      return `idx:${fallbackIdx}`;
    }
  }
  return `prim:${String(item)}:${fallbackIdx}`;
}

/**
 * Conflict-free 3-way merge for ID-keyed entity arrays across concurrent LAN devices.
 * Preserves concurrent additions and untouched edits made on other devices after baseRevision,
 * while applying the incoming client's additions, updates, and intentional deletions.
 */
export function mergeEntityArraysThreeWay<T = any>(params: {
  base: T[];
  currentServer: T[];
  incomingClient: T[];
  getItemKey?: (item: T, idx: number) => string;
}): T[] {
  const getKey = params.getItemKey || defaultEntityKey;
  const baseArr = Array.isArray(params.base) ? params.base : [];
  const serverArr = Array.isArray(params.currentServer) ? params.currentServer : [];
  const clientArr = Array.isArray(params.incomingClient) ? params.incomingClient : [];

  const baseMap = new Map<string, T>();
  baseArr.forEach((item, idx) => {
    baseMap.set(getKey(item, idx), item);
  });

  const serverMap = new Map<string, T>();
  serverArr.forEach((item, idx) => {
    serverMap.set(getKey(item, idx), item);
  });

  const clientMap = new Map<string, T>();
  clientArr.forEach((item, idx) => {
    clientMap.set(getKey(item, idx), item);
  });

  const result: T[] = [];
  const seenKeys = new Set<string>();

  // 1. Preserve concurrent server-only additions (added after baseRevision by another device)
  const serverOnlyAdditions: { key: string; item: T }[] = [];
  serverArr.forEach((srvItem, idx) => {
    const key = getKey(srvItem, idx);
    if (!clientMap.has(key) && !baseMap.has(key)) {
      serverOnlyAdditions.push({ key, item: srvItem });
    }
  });

  // Prepend server additions made after baseRevision if server uses newest-first convention,
  // or keep them cleanly merged without duplicate keys.
  for (const added of serverOnlyAdditions) {
    if (!seenKeys.has(added.key)) {
      seenKeys.add(added.key);
      result.push(added.item);
    }
  }

  // 2. Process incoming client array in its chosen order
  clientArr.forEach((cliItem, idx) => {
    const key = getKey(cliItem, idx);
    if (seenKeys.has(key)) return;
    const baseItem = baseMap.get(key);
    const hasServer = serverMap.has(key);
    const srvItem = serverMap.get(key);

    if (baseItem === undefined) {
      // Newly added on this client (or also concurrently added on server)
      seenKeys.add(key);
      result.push(cliItem);
      return;
    }

    if (!areJsonValuesEqual(cliItem, baseItem)) {
      // Client intentionally modified this item -> take client's update
      seenKeys.add(key);
      result.push(cliItem);
      return;
    }

    // Client left this item untouched relative to base:
    if (hasServer && srvItem !== undefined) {
      // Preserve any concurrent edit performed by another device on the server
      seenKeys.add(key);
      result.push(srvItem);
    }
    // If server deleted it after base and client didn't touch it, keep server's deletion.
  });

  return result;
}

function mergeWhatsAppAccountsThreeWay(
  baseAccounts: any[],
  serverAccounts: any[],
  clientAccounts: any[]
): any[] {
  const mergedTop = mergeEntityArraysThreeWay({
    base: baseAccounts,
    currentServer: serverAccounts,
    incomingClient: clientAccounts,
  });

  const baseById = new Map<string, any>(
    (Array.isArray(baseAccounts) ? baseAccounts : []).map((a) => [String(a?.id || ''), a])
  );
  const serverById = new Map<string, any>(
    (Array.isArray(serverAccounts) ? serverAccounts : []).map((a) => [String(a?.id || ''), a])
  );
  const clientById = new Map<string, any>(
    (Array.isArray(clientAccounts) ? clientAccounts : []).map((a) => [String(a?.id || ''), a])
  );

  return mergedTop.map((acc) => {
    const id = String(acc?.id || '');
    const bAcc = baseById.get(id);
    const sAcc = serverById.get(id);
    const cAcc = clientById.get(id);
    if (!bAcc || !sAcc || !cAcc) return acc;

    const mergedChats = mergeEntityArraysThreeWay({
      base: Array.isArray(bAcc.chats) ? bAcc.chats : [],
      currentServer: Array.isArray(sAcc.chats) ? sAcc.chats : [],
      incomingClient: Array.isArray(cAcc.chats) ? cAcc.chats : [],
    }).map((chat: any) => {
      const chatId = String(chat?.id || '');
      const bChat = (bAcc.chats || []).find((c: any) => c.id === chatId);
      const sChat = (sAcc.chats || []).find((c: any) => c.id === chatId);
      const cChat = (cAcc.chats || []).find((c: any) => c.id === chatId);
      if (!bChat || !sChat || !cChat) return chat;
      const mergedMsgs = mergeEntityArraysThreeWay({
        base: Array.isArray(bChat.messages) ? bChat.messages : [],
        currentServer: Array.isArray(sChat.messages) ? sChat.messages : [],
        incomingClient: Array.isArray(cChat.messages) ? cChat.messages : [],
      });
      const lastMsg = mergedMsgs[mergedMsgs.length - 1];
      return {
        ...chat,
        messages: mergedMsgs,
        ...(lastMsg ? { lastMessage: lastMsg.text || chat.lastMessage, lastMessageTime: lastMsg.timestamp || chat.lastMessageTime } : {}),
      };
    });

    return {
      ...acc,
      chats: mergedChats,
    };
  });
}

/**
 * Applies a 3-way conflict-free merge over a partial delta patch when a client's
 * baseRevision lags behind the server's current dbRevision.
 */
export function applyThreeWayPatchMerge(params: {
  baseState: Record<string, any> | null | undefined;
  currentServerState: Record<string, any> | null | undefined;
  incomingPatch: Record<string, any>;
  baseRevision?: number;
  currentDbRevision: number;
}): { mergedPatch: Record<string, any>; wasMerged: boolean } {
  const { baseState, currentServerState, incomingPatch, baseRevision, currentDbRevision } = params;
  const mergedPatch: Record<string, any> = { ...incomingPatch };

  if (
    !baseState ||
    !currentServerState ||
    !Number.isFinite(baseRevision) ||
    !baseRevision ||
    baseRevision <= 0 ||
    baseRevision >= currentDbRevision
  ) {
    return { mergedPatch, wasMerged: false };
  }

  let wasMerged = false;

  for (const [key, clientVal] of Object.entries(incomingPatch)) {
    if (!ENTITY_COLLECTION_KEY_SET.has(key)) continue;
    if (!Array.isArray(clientVal)) continue;

    const serverVal = currentServerState[key];
    const baseVal = baseState[key];
    if (!Array.isArray(serverVal)) continue;

    // Skip expensive merge if server did not touch this slice since baseRevision
    if (Array.isArray(baseVal) && areJsonValuesEqual(baseVal, serverVal)) {
      continue;
    }

    let mergedArr: any[];
    if (key === 'whatsappAccounts') {
      mergedArr = mergeWhatsAppAccountsThreeWay(
        Array.isArray(baseVal) ? baseVal : [],
        serverVal,
        clientVal
      );
    } else if (key === 'posCart') {
      mergedArr = mergeEntityArraysThreeWay({
        base: Array.isArray(baseVal) ? baseVal : [],
        currentServer: serverVal,
        incomingClient: clientVal,
        getItemKey: (item, idx) =>
          item && typeof item === 'object'
            ? `cart:${String(item.productId || item.id || idx)}:${String(item.unitName || '')}`
            : defaultEntityKey(item, idx),
      });
    } else {
      mergedArr = mergeEntityArraysThreeWay({
        base: Array.isArray(baseVal) ? baseVal : [],
        currentServer: serverVal,
        incomingClient: clientVal,
      });
    }

    if (!areJsonValuesEqual(mergedArr, clientVal)) {
      wasMerged = true;
    }
    mergedPatch[key] = mergedArr;
  }

  return { mergedPatch, wasMerged };
}

/**
 * Classifies an incoming real-time server revision against local state so clients
 * never miss intermediate revisions (e.g. after mobile sleep/reconnect).
 */
export function classifyIncomingRevision(input: {
  incomingRevision: number;
  currentRevision: number;
  originClientId?: string | null;
  localClientId: string;
}): 'IGNORE' | 'APPLY_PATCH' | 'FETCH_CATCHUP' {
  if (!Number.isFinite(input.incomingRevision) || input.incomingRevision <= 0) {
    return 'IGNORE';
  }
  if (input.originClientId && input.originClientId === input.localClientId) {
    return 'IGNORE';
  }
  if (input.incomingRevision <= input.currentRevision) {
    return 'IGNORE';
  }
  if (input.incomingRevision === input.currentRevision + 1) {
    return 'APPLY_PATCH';
  }
  return 'FETCH_CATCHUP';
}

export interface ConnectedLanDevice {
  clientId: string;
  deviceLabel: string;
  platformType: 'MOBILE' | 'TABLET' | 'DESKTOP';
  userName: string;
  activeTab: string;
  ip: string;
  connectedAt: string;
  lastSeenAt: string;
  isSelf?: boolean;
}

export function detectDeviceLabelFromUserAgent(uaRaw?: string | null): {
  deviceLabel: string;
  platformType: 'MOBILE' | 'TABLET' | 'DESKTOP';
} {
  const ua = String(uaRaw || '');
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return {
      deviceLabel: /iPad/i.test(ua) ? 'iPad (جهاز لوحي)' : 'Android Tablet (لوحي)',
      platformType: 'TABLET',
    };
  }
  if (/iPhone/i.test(ua)) {
    return { deviceLabel: 'iPhone (جوال)', platformType: 'MOBILE' };
  }
  if (/Android/i.test(ua)) {
    return { deviceLabel: 'Android (جوال)', platformType: 'MOBILE' };
  }
  if (/Windows/i.test(ua)) {
    return { deviceLabel: 'Windows (كمبيوتر)', platformType: 'DESKTOP' };
  }
  if (/Macintosh|Mac OS/i.test(ua)) {
    return { deviceLabel: 'Mac (كمبيوتر)', platformType: 'DESKTOP' };
  }
  if (/Linux/i.test(ua)) {
    return { deviceLabel: 'Linux / Headless (متصفح)', platformType: 'DESKTOP' };
  }
  return { deviceLabel: 'متصفح شبكة متصل', platformType: 'DESKTOP' };
}

export function formatLanDeviceSummary(
  devices: ConnectedLanDevice[],
  language: 'ar' | 'en' = 'ar'
): { total: number; mobileCount: number; desktopCount: number; summaryLabel: string } {
  const list = Array.isArray(devices) ? devices : [];
  const mobileCount = list.filter(
    (d) => d.platformType === 'MOBILE' || d.platformType === 'TABLET'
  ).length;
  const desktopCount = list.length - mobileCount;
  const summaryLabel =
    language === 'ar'
      ? list.length <= 1
        ? 'جهاز واحد نشط'
        : `${list.length} أجهزة متصلة (${mobileCount} جوال • ${desktopCount} كمبيوتر)`
      : `${list.length} live device(s)`;
  return {
    total: list.length,
    mobileCount,
    desktopCount,
    summaryLabel,
  };
}


