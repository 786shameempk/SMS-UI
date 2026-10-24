/**
 * Small key-value tables on IndexedDB for offline attendance. Falls back to memory when IndexedDB is unavailable
 * (some private windows), so the page still works while online; only the "survives a reload" promise is lost, which
 * `isPersistent()` reports so the UI can say so.
 */

export interface Table<T> {
  get(key: string): Promise<T | undefined>;
  put(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  all(): Promise<T[]>;
  clear(): Promise<void>;
}

const DB_NAME = "sms-offline-attendance";
const DB_VERSION = 1;
export const TABLE_NAMES = ["cache", "queue"] as const;
export type TableName = (typeof TABLE_NAMES)[number];

let dbPromise: Promise<IDBDatabase | null> | null = null;
let persistent = false;

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        for (const name of TABLE_NAMES) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      };
      request.onsuccess = () => {
        persistent = true;
        resolve(request.result);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** True once the browser database opened (the queue then survives closing the tab). */
export const isPersistent = () => persistent;

const done = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const memory = new Map<TableName, Map<string, unknown>>();
const memoryTable = (name: TableName) => {
  if (!memory.has(name)) memory.set(name, new Map());
  return memory.get(name)!;
};

export function table<T>(name: TableName): Table<T> {
  const run = async <R,>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest, fallback: (rows: Map<string, unknown>) => R): Promise<R> => {
    const db = await openDb();
    if (!db) return fallback(memoryTable(name));
    const transaction = db.transaction(name, mode);
    const request = action(transaction.objectStore(name));
    if (mode === "readonly") return (await done(request)) as R;
    // A write is only safe once the transaction has committed (the tab may close right after).
    return new Promise<R>((resolve, reject) => {
      transaction.oncomplete = () => resolve(request.result as R);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  };
  return {
    get: (key) => run("readonly", (s) => s.get(key) as IDBRequest<T | undefined>, (m) => m.get(key) as T | undefined),
    put: async (key, value) => {
      await run<unknown>("readwrite", (s) => s.put(value, key), (m) => void m.set(key, value));
    },
    delete: async (key) => {
      await run<unknown>("readwrite", (s) => s.delete(key), (m) => void m.delete(key));
    },
    all: () => run("readonly", (s) => s.getAll() as IDBRequest<T[]>, (m) => [...m.values()] as T[]),
    clear: async () => {
      await run<unknown>("readwrite", (s) => s.clear(), (m) => void m.clear());
    },
  };
}

/** Test hook: forget the opened database and the memory fallback. */
export function resetStorageForTests() {
  dbPromise = null;
  persistent = false;
  memory.clear();
}
