export type Collection = 'hero' | 'auth' | 'page' | 'video' | 'assets';

export interface AssetRecord {
  id: string;
  projectId: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  note?: string;
  createdAt: number;
}

export interface ImageRecord {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  active: boolean;
  createdAt: number;
}

const DB_NAME = 'augmentoria';
const DB_VERSION = 4;

const STORES: Record<Collection, string> = {
  hero: 'hero-images',
  auth: 'auth-images',
  page: 'page-images',
  video: 'version-videos',
  assets: 'project-assets'
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      for (const store of Object.values(STORES)) {
        if (!req.result.objectStoreNames.contains(store)) {
          req.result.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => console.warn('[idb] upgrade blocked — close other tabs');
  });
}

function runTx<T>(collection: Collection, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORES[collection], mode);
        const req = fn(t.objectStore(STORES[collection]));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export const idb = {
  put: <T extends { id: string; blob?: Blob }>(c: Collection, rec: T) =>
    runTx<IDBValidKey>(c, 'readwrite', (s) => s.put(rec as never)),
  all: <T = ImageRecord>(c: Collection) => runTx<T[]>(c, 'readonly', (s) => s.getAll()),
  get: <T = ImageRecord>(c: Collection, id: string) => runTx<T | undefined>(c, 'readonly', (s) => s.get(id)),
  del: (c: Collection, id: string) => runTx<undefined>(c, 'readwrite', (s) => s.delete(id))
};
