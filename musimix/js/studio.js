// MusiMix — connexion au Studio (le programme de préparation qui tourne sur le PC).
// Deux chemins :
//  • direct : l'appli parle au Studio (même PC, ou appli ouverte depuis le Studio) ;
//  • passerelle : depuis un téléphone sur l'appli en ligne (https), le navigateur
//    interdit d'appeler une adresse http du réseau local. On ouvre alors une petite
//    fenêtre servie par le Studio, qui fait les échanges et renvoie le résultat.

import { db } from './db.js';

const DEFAULT_URL = 'http://localhost:8765';

export class Studio extends EventTarget {
  constructor() {
    super();
    this.url = DEFAULT_URL;
    this.state = 'unknown';     // unknown | online | offline
    this.info = null;
    this.mode = 'direct';       // direct | bridge
    this.bridge = null;
  }

  async init() {
    const saved = await db.get('studioUrl', null);
    if (location.port === '8765' || new URLSearchParams(location.search).has('studio')) this.url = location.origin;
    else if (saved) this.url = saved;
    this.check();
  }

  async setUrl(u) {
    u = (u || '').trim().replace(/\/+$/, '');
    if (u && !/^https?:\/\//.test(u)) u = 'http://' + u;
    if (u && !/:\d+$/.test(u.replace(/^https?:\/\//, ''))) u += ':8765';
    this.url = u || DEFAULT_URL;
    await db.set('studioUrl', this.url);
    return this.check();
  }

  get needsBridge() {
    if (location.protocol !== 'https:') return false;
    const host = new URL(this.url).hostname;
    if (this.url.startsWith('https:')) return false;
    return !['localhost', '127.0.0.1', '[::1]'].includes(host);
  }

  _set(state, info = null) {
    this.state = state;
    this.info = info;
    this.dispatchEvent(new Event('change'));
  }

  async check() {
    if (this.needsBridge) {
      // impossible de vérifier sans ouvrir la passerelle : on le saura à l'usage
      this.mode = 'bridge';
      this._set(this.bridge ? 'online' : 'unknown', this.info);
      return this.state;
    }
    this.mode = 'direct';
    try {
      const r = await fetchT(this.url + '/api/health', {}, 2500);
      const j = await r.json();
      this._set(j?.name === 'musimix-studio' ? 'online' : 'offline', j);
    } catch {
      this._set('offline');
    }
    return this.state;
  }

  // ───────────────────────────────────────────────────── passerelle ──

  /** À appeler pendant un clic (sinon la fenêtre est bloquée). */
  openBridge() {
    if (this.bridge && !this.bridge.win.closed) return this.bridge.ready;
    const origin = new URL(this.url).origin;
    const win = window.open(`${this.url}/bridge?origin=${encodeURIComponent(location.origin)}`, 'musimix-studio', 'width=440,height=600');
    if (!win) return Promise.reject(new Error('La fenêtre du Studio a été bloquée. Autorise les fenêtres surgissantes pour MusiMix.'));
    const pending = new Map();
    let seq = 0;
    const b = { win, origin, pending, ready: null };
    b.ready = new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error(`Le Studio ne répond pas à ${this.url}. Vérifie qu’il est lancé sur le PC et que le téléphone est sur le même Wi-Fi.`)), 15000);
      const onMsg = (e) => {
        if (e.origin !== origin || !e.data) return;
        if (e.data.type === 'bridge-ready') { clearTimeout(to); this._set('online', e.data.info); resolve(); }
        else if (e.data.type === 'reply' && pending.has(e.data.id)) {
          const p = pending.get(e.data.id);
          pending.delete(e.data.id);
          e.data.ok ? p.resolve(e.data.result) : p.reject(new Error(e.data.error || 'Erreur du Studio'));
        }
      };
      window.addEventListener('message', onMsg);
      b.dispose = () => window.removeEventListener('message', onMsg);
    });
    b.call = (cmd, args = {}, transfer = []) => new Promise((resolve, reject) => {
      if (win.closed) { reject(new Error('La fenêtre du Studio a été fermée.')); return; }
      const id = ++seq;
      pending.set(id, { resolve, reject });
      win.postMessage({ type: 'call', id, cmd, args }, origin, transfer);
    });
    this.bridge = b;
    return b.ready;
  }

  closeBridge() {
    if (this.bridge) { try { this.bridge.win.close(); } catch { /* */ } this.bridge.dispose?.(); this.bridge = null; }
  }

  // ─────────────────────────────────────────────────────── travaux ──

  async _submit(file, fields) {
    if (this.mode === 'bridge') {
      const buf = await file.arrayBuffer();
      return this.bridge.call('submit', { name: file.name, type: file.type, data: buf, fields }, [buf]);
    }
    const fd = new FormData();
    fd.append('audio', file, file.name);
    for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') fd.append(k, v);
    const r = await fetch(this.url + '/api/jobs', { method: 'POST', body: fd });
    if (!r.ok) throw new Error(await errText(r));
    return r.json();
  }

  async status(id) {
    if (this.mode === 'bridge') return this.bridge.call('status', { id });
    const r = await fetchT(this.url + '/api/jobs/' + id, {}, 8000);
    if (!r.ok) throw new Error(await errText(r));
    return r.json();
  }

  async pack(id) {
    if (this.mode === 'bridge') {
      const res = await this.bridge.call('pack', { id });
      return new File([res.data], res.name || 'pack.zip', { type: 'application/zip' });
    }
    const r = await fetch(this.url + '/api/jobs/' + id + '/pack');
    if (!r.ok) throw new Error(await errText(r));
    const name = decodeURIComponent((r.headers.get('content-disposition') || '').match(/filename\*?=(?:UTF-8'')?"?([^";]+)/)?.[1] || 'pack.zip');
    return new File([await r.blob()], name, { type: 'application/zip' });
  }

  async list() {
    if (this.mode === 'bridge') return this.bridge.call('list');
    const r = await fetchT(this.url + '/api/jobs', {}, 5000);
    return r.json();
  }

  async remove(id) {
    if (this.mode === 'bridge') return this.bridge.call('remove', { id });
    await fetch(this.url + '/api/jobs/' + id, { method: 'DELETE' });
  }

  /**
   * Envoie un audio au Studio et suit la préparation.
   * onProgress({ step, progress, message }) ; retourne le ZIP (File).
   */
  async prepare(file, fields, onProgress, { signal } = {}) {
    if (this.mode === 'bridge') await this.openBridge();
    const job = await this._submit(file, fields);
    const jobs = await db.get('jobs', []);
    jobs.push({ id: job.id, title: fields.title || file.name, url: this.url, at: Date.now() });
    await db.set('jobs', jobs);
    return this.follow(job.id, onProgress, { signal });
  }

  async follow(id, onProgress, { signal } = {}) {
    let fails = 0;
    for (;;) {
      if (signal?.aborted) throw new DOMException('Annulé', 'AbortError');
      let st;
      try { st = await this.status(id); fails = 0; } catch (e) {
        if (++fails > 20) throw e;
        await sleep(2000);
        continue;
      }
      onProgress?.(st);
      if (st.status === 'done') {
        const zip = await this.pack(id);
        await forgetJob(id);
        return zip;
      }
      if (st.status === 'error') { await forgetJob(id); throw new Error(st.error || 'La préparation a échoué.'); }
      await sleep(st.status === 'queued' ? 2000 : 1200);
    }
  }
}

async function forgetJob(id) {
  const jobs = await db.get('jobs', []);
  await db.set('jobs', jobs.filter((j) => j.id !== id));
}

async function errText(r) {
  try { const j = await r.json(); return j.detail || j.error || r.statusText; } catch { return r.statusText; }
}

function fetchT(url, opts, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
