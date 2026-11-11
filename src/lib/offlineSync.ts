/**
 * Offline-First IndexedDB Persistence + Background Outbox Sync Queue
 *  - Low-end device memory protection: caps cached voter subset at MAX_CACHED_VOTERS with slim fields.
 *  - Schema versioning: cleans incompatible pre-upgrade caches cleanly without wiping auth session.
 *  - Deduplicated sync replay: attaches preserved Idempotency-Key + exponential backoff on reconnect.
 */

const DB_NAME = 'vijaysetu_offline_db';
const DB_VERSION = 1;
const STORE_OUTBOX = 'pendingMutations';
const STORE_VOTERS = 'cachedVoters';

export const APP_SCHEMA_VERSION = '2026.1.2';
const SCHEMA_VERSION_KEY = 'vijaysetu_client_schema_version';
const MAX_CACHED_VOTERS = 2000; // Safe ceiling for 1GB-2GB RAM budget Android WebViews

export interface QueuedMutation {
  id: string;
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  bodyJson: string | null;
  idempotencyKey: string;
  organizationId: string;
  createdAtUtc: string;
  attempts: number;
  nextRetryAt: number;
}

export interface CachedVoterCompact {
  _id: string;
  organizationId: string;
  nameHi: string;
  nameEn: string;
  relativeNameHi: string;
  epic: string;
  wardNo: string;
  partNo: string;
  serialNo: number;
  houseNo: string;
  phone: string;
  voted: boolean;
  updatedAt: number;
}

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      return reject(new Error('IndexedDB unavailable'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VOTERS)) {
        const voterStore = db.createObjectStore(STORE_VOTERS, { keyPath: '_id' });
        voterStore.createIndex('organizationId', 'organizationId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open error'));
  });
}

/**
 * Upgrade-safe schema check so stale local caches never crash newly deployed JS bundles.
 */
export function ensureClientSchemaVersion() {
  if (typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem(SCHEMA_VERSION_KEY);
    if (stored === APP_SCHEMA_VERSION) return;

    // Clear only derived UI caches; preserve token and org selection
    const preserve = new Set(['token', 'selectedClientOrgId', 'userEmail']);
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && !preserve.has(k) && k !== SCHEMA_VERSION_KEY) {
        if (k.startsWith('cached') || k.startsWith('draft_')) {
          window.localStorage.removeItem(k);
        }
      }
    }
    window.localStorage.setItem(SCHEMA_VERSION_KEY, APP_SCHEMA_VERSION);
  } catch {
    // Ignore restricted WebView storage errors cleanly
  }
}

export async function enqueueOfflineMutation(input: {
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey: string;
  organizationId?: string;
}): Promise<QueuedMutation> {
  const item: QueuedMutation = {
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    path: input.path,
    method: input.method,
    bodyJson: input.body !== undefined ? JSON.stringify(input.body) : null,
    idempotencyKey: input.idempotencyKey,
    organizationId: input.organizationId || (typeof window !== 'undefined' ? window.localStorage.getItem('selectedClientOrgId') || 'default' : 'default'),
    createdAtUtc: new Date().toISOString(),
    attempts: 0,
    nextRetryAt: Date.now(),
  };

  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite');
      tx.objectStore(STORE_OUTBOX).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback to compact localStorage outbox
    if (typeof window !== 'undefined') {
      const existing = readLsOutbox();
      existing.push(item);
      window.localStorage.setItem('vijaysetu_ls_outbox', JSON.stringify(existing.slice(-200)));
    }
  }

  emitQueueChanged();
  return item;
}

function readLsOutbox(): QueuedMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('vijaysetu_ls_outbox');
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

export async function listPendingMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openOfflineDb();
    const rows = await new Promise<QueuedMutation[]>((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly');
      const req = tx.objectStore(STORE_OUTBOX).getAll();
      req.onsuccess = () => resolve((req.result as QueuedMutation[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc));
  } catch {
    return readLsOutbox();
  }
}

async function removeMutation(id: string) {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite');
      tx.objectStore(STORE_OUTBOX).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    if (typeof window !== 'undefined') {
      const next = readLsOutbox().filter((m) => m.id !== id);
      window.localStorage.setItem('vijaysetu_ls_outbox', JSON.stringify(next));
    }
  }
}

async function updateMutationRetry(item: QueuedMutation) {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite');
      tx.objectStore(STORE_OUTBOX).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    if (typeof window !== 'undefined') {
      const next = readLsOutbox().map((m) => (m.id === item.id ? item : m));
      window.localStorage.setItem('vijaysetu_ls_outbox', JSON.stringify(next));
    }
  }
}

let flushInFlight = false;

/**
 * Flush offline queued mutations with exponential backoff + Idempotency-Key safety.
 */
export async function flushOfflineQueue(
  sendFn: (path: string, init: RequestInit) => Promise<Response>
): Promise<{ synced: number; remaining: number }> {
  if (typeof window === 'undefined' || !window.navigator.onLine || flushInFlight) {
    const pending = await listPendingMutations();
    return { synced: 0, remaining: pending.length };
  }

  flushInFlight = true;
  let synced = 0;

  try {
    const items = await listPendingMutations();
    const now = Date.now();

    for (const item of items) {
      if (item.nextRetryAt > now) continue;
      if (item.attempts >= 6) {
        // Prevent poison pill items from blocking queue indefinitely
        await removeMutation(item.id);
        continue;
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Idempotency-Key': item.idempotencyKey,
        };
        if (item.organizationId && item.organizationId !== 'default') {
          headers['x-organization-id'] = item.organizationId;
        }
        const res = await sendFn(item.path, {
          method: item.method,
          headers,
          body: item.bodyJson ?? undefined,
        });

        if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
          await removeMutation(item.id);
          if (res.ok) synced += 1;
        } else {
          const attempts = item.attempts + 1;
          const backoffMs = Math.min(5 * 60_000, 1000 * Math.pow(2, attempts));
          await updateMutationRetry({ ...item, attempts, nextRetryAt: Date.now() + backoffMs });
        }
      } catch {
        const attempts = item.attempts + 1;
        const backoffMs = Math.min(5 * 60_000, 1000 * Math.pow(2, attempts));
        await updateMutationRetry({ ...item, attempts, nextRetryAt: Date.now() + backoffMs });
      }
    }

    const remainingList = await listPendingMutations();
    emitQueueChanged(remainingList.length);
    return { synced, remaining: remainingList.length };
  } finally {
    flushInFlight = false;
  }
}

/**
 * Cache slimmed voter snapshot offline while strictly bounding storage/RAM for low-end devices.
 */
export async function saveOfflineVotersCache(orgId: string, voters: Array<Record<string, any>>) {
  if (!orgId || !Array.isArray(voters) || voters.length === 0) return;
  try {
    const db = await openOfflineDb();
    const now = Date.now();
    const slice = voters.slice(0, MAX_CACHED_VOTERS);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VOTERS, 'readwrite');
      const store = tx.objectStore(STORE_VOTERS);
      for (const v of slice) {
        if (!v?._id) continue;
        store.put({
          _id: String(v._id),
          organizationId: orgId,
          nameHi: String(v.nameHi || ''),
          nameEn: String(v.nameEn || ''),
          relativeNameHi: String(v.relativeNameHi || ''),
          epic: String(v.epic || ''),
          wardNo: String(v.wardNo || ''),
          partNo: String(v.partNo || ''),
          serialNo: Number(v.serialNo) || 0,
          houseNo: String(v.houseNo || ''),
          phone: String(v.phone || v.mobileNo || ''),
          voted: Boolean(v.voted),
          updatedAt: now,
        } satisfies CachedVoterCompact);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Non-fatal in private browsing / quota limits
  }
}

export async function queryOfflineVoters(orgId: string, search: string = '', limit = 50): Promise<CachedVoterCompact[]> {
  try {
    const db = await openOfflineDb();
    const all = await new Promise<CachedVoterCompact[]>((resolve, reject) => {
      const tx = db.transaction(STORE_VOTERS, 'readonly');
      const idx = tx.objectStore(STORE_VOTERS).index('organizationId');
      const req = idx.getAll(orgId);
      req.onsuccess = () => resolve((req.result as CachedVoterCompact[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    const q = search.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (v) =>
            v.nameHi.toLowerCase().includes(q) ||
            v.nameEn.toLowerCase().includes(q) ||
            v.epic.toLowerCase().includes(q) ||
            v.phone.includes(q) ||
            String(v.serialNo) === q
        )
      : all;
    return filtered.slice(0, limit);
  } catch {
    return [];
  }
}

function emitQueueChanged(count?: number) {
  if (typeof window === 'undefined') return;
  if (typeof count === 'number') {
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count } }));
    return;
  }
  void listPendingMutations().then((rows) => {
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: rows.length } }));
  });
}

