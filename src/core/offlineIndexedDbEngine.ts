/**
 * Haseb Enterprise ERP — IndexedDB Offline POS Queue & Snapshot Persistence Engine
 * Provides durable high-capacity browser IndexedDB storage for pending POS transactions
 * and full catalog snapshots when operating offline, with safe fallback in Node tests / SSR.
 */

import { PendingSyncTransaction } from './realtimeSyncEngine';

export const HASEB_OFFLINE_DB_NAME = 'haseb_offline_db_v1';
export const HASEB_OFFLINE_DB_VERSION = 1;
export const PENDING_SYNC_OBJECT_STORE = 'pending_sync_queue';
export const SNAPSHOT_OBJECT_STORE = 'erp_snapshots';

export interface IndexedDbOfflineSnapshotRecord {
  key: string;
  updatedAt: string;
  payloadSizeBytes: number;
  data: Record<string, any>;
}

export interface OfflineIndexedDbMetrics {
  indexedDbSupported: boolean;
  pendingCount: number;
  oldestPendingAt: string | null;
  snapshotSizeBytes: number;
  snapshotUpdatedAt: string | null;
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

export function buildOfflineQueueRecord(
  entry: PendingSyncTransaction,
  sequenceOrder: number
): PendingSyncTransaction & { sequenceOrder: number } {
  return {
    ...entry,
    sequenceOrder,
  };
}

export function computeOfflineStorageMetrics(input: {
  queue: PendingSyncTransaction[];
  snapshotSizeBytes?: number;
  snapshotUpdatedAt?: string | null;
  indexedDbSupported?: boolean;
}): OfflineIndexedDbMetrics {
  const sorted = [...input.queue].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  );
  return {
    indexedDbSupported:
      typeof input.indexedDbSupported === 'boolean'
        ? input.indexedDbSupported
        : isIndexedDbAvailable(),
    pendingCount: input.queue.length,
    oldestPendingAt: sorted[0]?.createdAt || null,
    snapshotSizeBytes: Math.max(0, Math.round(Number(input.snapshotSizeBytes) || 0)),
    snapshotUpdatedAt: input.snapshotUpdatedAt || null,
  };
}

export function openHasebOfflineDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(HASEB_OFFLINE_DB_NAME, HASEB_OFFLINE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PENDING_SYNC_OBJECT_STORE)) {
          db.createObjectStore(PENDING_SYNC_OBJECT_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SNAPSHOT_OBJECT_STORE)) {
          db.createObjectStore(SNAPSHOT_OBJECT_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbLoadPendingSyncQueue(): Promise<PendingSyncTransaction[]> {
  const db = await openHasebOfflineDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(PENDING_SYNC_OBJECT_STORE, 'readonly');
      const store = tx.objectStore(PENDING_SYNC_OBJECT_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? req.result : [];
        rows.sort((a: any, b: any) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));
        const clean = rows.map(({ sequenceOrder: _seq, ...rest }: any) => rest as PendingSyncTransaction);
        db.close();
        resolve(clean);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve([]);
    }
  });
}

export async function idbReplacePendingSyncQueue(
  queue: PendingSyncTransaction[]
): Promise<boolean> {
  const db = await openHasebOfflineDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(PENDING_SYNC_OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(PENDING_SYNC_OBJECT_STORE);
      store.clear();
      queue.forEach((entry, index) => {
        store.put(buildOfflineQueueRecord(entry, index));
      });
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve(false);
    }
  });
}

export async function idbSaveOfflineSnapshot(
  key: string,
  data: Record<string, any>
): Promise<{ saved: boolean; sizeBytes: number; updatedAt: string }> {
  const updatedAt = new Date().toISOString();
  let sizeBytes = 0;
  try {
    sizeBytes = JSON.stringify(data).length;
  } catch {
    sizeBytes = 0;
  }
  const db = await openHasebOfflineDb();
  if (!db) return { saved: false, sizeBytes, updatedAt };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SNAPSHOT_OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(SNAPSHOT_OBJECT_STORE);
      const record: IndexedDbOfflineSnapshotRecord = {
        key,
        updatedAt,
        payloadSizeBytes: sizeBytes,
        data,
      };
      store.put(record);
      tx.oncomplete = () => {
        db.close();
        resolve({ saved: true, sizeBytes, updatedAt });
      };
      tx.onerror = () => {
        db.close();
        resolve({ saved: false, sizeBytes, updatedAt });
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve({ saved: false, sizeBytes, updatedAt });
    }
  });
}

export async function idbLoadOfflineSnapshot(
  key: string
): Promise<IndexedDbOfflineSnapshotRecord | null> {
  const db = await openHasebOfflineDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SNAPSHOT_OBJECT_STORE, 'readonly');
      const store = tx.objectStore(SNAPSHOT_OBJECT_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result || null;
        db.close();
        resolve(res);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve(null);
    }
  });
}
