// MusiMix — stockage local (IndexedDB) : morceaux, fichiers audio, setlists, réglages.

const DB_NAME = 'musimix';
const DB_VERSION = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      if (!db.objectStoreNames.contains('setlists')) db.createObjectStore('setlists', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transaction annulée'));
  });
}

const req2p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const db = {
  async allSongs() { return tx('songs', 'readonly', (s) => req2p(s.getAll())); },
  async getSong(id) { return tx('songs', 'readonly', (s) => req2p(s.get(id))); },
  async putSong(song) { song.updatedAt = Date.now(); return tx('songs', 'readwrite', (s) => req2p(s.put(song))); },
  async deleteSong(id) {
    const song = await this.getSong(id);
    if (song) for (const st of song.stems || []) await this.deleteBlob(st.blobId);
    return tx('songs', 'readwrite', (s) => req2p(s.delete(id)));
  },
  async putBlob(blob, id = uid()) { await tx('blobs', 'readwrite', (s) => req2p(s.put(blob, id))); return id; },
  async getBlob(id) { return tx('blobs', 'readonly', (s) => req2p(s.get(id))); },
  async deleteBlob(id) { return tx('blobs', 'readwrite', (s) => req2p(s.delete(id))); },
  async allSetlists() { return tx('setlists', 'readonly', (s) => req2p(s.getAll())); },
  async putSetlist(sl) { sl.updatedAt = Date.now(); return tx('setlists', 'readwrite', (s) => req2p(s.put(sl))); },
  async deleteSetlist(id) { return tx('setlists', 'readwrite', (s) => req2p(s.delete(id))); },
  async get(key, def = null) { const v = await tx('kv', 'readonly', (s) => req2p(s.get(key))); return v === undefined ? def : v; },
  async set(key, value) { return tx('kv', 'readwrite', (s) => req2p(s.put(value, key))); },
};

export async function persistStorage() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* */ }
}

export async function storageEstimate() {
  try { return await navigator.storage.estimate(); } catch { return null; }
}
