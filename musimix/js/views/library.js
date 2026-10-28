// MusiMix — bibliothèque des morceaux et setlists.

import { db, uid } from '../db.js';
import { esc, icon, fmtTime, openMenu, toast, confirmBox, dialog } from '../ui.js';
import { exportPack, download } from '../songs.js';
import { songKey } from '../render.js';
import { keyName } from '../theory.js';

export class LibraryView {
  constructor(app) { this.app = app; this.q = ''; this.sort = 'recent'; }

  async open() {
    this.songs = await db.allSongs();
    this.sort = (await this.app.prefs()).librarySort || 'recent';
    const el = document.createElement('section');
    el.className = 'view';
    el.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#/" aria-label="MusiMix, accueil"><img src="assets/icons/icon-192.png" alt=""><b>MusiMix</b></a>
        <div class="spacer"></div>
        <button class="studio-pill" data-act="studio"><i></i><span>Studio</span></button>
        <button class="icon-btn" data-act="setlists" aria-label="Setlists" title="Setlists">${icon('list')}</button>
        <button class="icon-btn" data-act="settings" aria-label="Réglages" title="Réglages">${icon('settings')}</button>
      </header>
      <main class="library">
        <div class="lib-head">
          <div><h1>Bibliothèque</h1><p data-r="count"></p></div>
          <div class="spacer"></div>
          <button class="btn primary" data-act="import">${icon('plus')} Ajouter un morceau</button>
        </div>
        <div data-r="jobs"></div>
        <div data-r="content"></div>
      </main>`;
    this.el = el;
    this.app.mount(el);
    el.addEventListener('click', (e) => this.onClick(e));
    el.addEventListener('input', (e) => { if (e.target.matches('[data-r="q"]')) { this.q = e.target.value; this.renderList(); } });
    this.renderStudio();
    this._st = () => this.renderStudio();
    this.app.studio.addEventListener('change', this._st);
    this._jobs = () => this.renderJobs();
    this.app.addEventListener('jobs', this._jobs);
    this.render();
    this.renderJobs();
  }

  close() {
    this.app.studio.removeEventListener('change', this._st);
    this.app.removeEventListener('jobs', this._jobs);
    this.el?.remove();
  }

  renderStudio() {
    const p = this.el.querySelector('.studio-pill');
    const st = this.app.studio.state;
    p.className = 'studio-pill ' + st;
    p.querySelector('span').textContent = st === 'online' ? 'Studio connecté' : st === 'offline' ? 'Studio éteint' : 'Studio';
    p.title = st === 'online' ? `Le Studio répond (${this.app.studio.url})` : 'Le Studio prépare automatiquement les morceaux. Clique pour le configurer.';
  }

  render() {
    const n = this.songs.length;
    this.el.querySelector('[data-r="count"]').textContent = n ? `${n} morceau${n > 1 ? 'x' : ''}` : '';
    const c = this.el.querySelector('[data-r="content"]');
    if (!n) {
      c.innerHTML = `<div class="empty">
        <span class="faders" aria-hidden="true"><i></i><i></i><i></i></span>
        <h2>Ajoute ton premier morceau</h2>
        <p>Glisse un fichier audio ou MIDI ici. Le Studio sépare la voix et les instruments, synchronise les paroles et trouve les accords.</p>
        <div class="row"><button class="btn primary" data-act="import">${icon('upload')} Choisir un fichier</button><button class="btn" data-act="demo">Essayer la démo</button></div>
      </div>`;
      return;
    }
    c.innerHTML = `
      <div class="lib-tools">
        <label class="search">${icon('search')}<span class="sr">Rechercher</span><input type="search" data-r="q" placeholder="Titre, artiste, paroles…" value="${esc(this.q)}"></label>
        <div class="seg" role="tablist" aria-label="Trier">
          <button data-sort="recent" class="${this.sort === 'recent' ? 'on' : ''}">Récents</button>
          <button data-sort="title" class="${this.sort === 'title' ? 'on' : ''}">Titre</button>
          <button data-sort="artist" class="${this.sort === 'artist' ? 'on' : ''}">Artiste</button>
        </div>
      </div>
      <div class="legend" aria-hidden="true">
        <span><span class="knobs"><i class="knob voice on"></i></span>paroles synchronisées</span>
        <span><span class="knobs"><i class="knob harmony on"></i></span>accords</span>
        <span><span class="knobs"><i class="knob rhythm on"></i></span>pistes séparées</span>
      </div>
      <ul class="songs" data-r="list"></ul>`;
    this.renderList();
  }

  renderList() {
    const ul = this.el.querySelector('[data-r="list"]');
    if (!ul) return;
    const q = norm(this.q);
    let list = this.songs.filter((s) => !q || norm(`${s.title} ${s.artist} ${s.doc?.lines?.map((l) => l.text || '').join(' ')}`).includes(q));
    const cmp = { recent: (a, b) => (b.lastPlayedAt || b.createdAt) - (a.lastPlayedAt || a.createdAt), title: (a, b) => (a.title || '').localeCompare(b.title || '', 'fr'), artist: (a, b) => (a.artist || '').localeCompare(b.artist || '', 'fr') || (a.title || '').localeCompare(b.title || '', 'fr') }[this.sort];
    list.sort(cmp);
    if (!list.length) { ul.innerHTML = `<li class="note" style="padding:20px 4px">Aucun morceau ne correspond à « ${esc(this.q)} ».</li>`; return; }
    ul.innerHTML = list.map((s) => {
      const synced = s.doc?.lines?.some((l) => l.s != null && l.words?.length && !l.words[0].est) || s.doc?.lines?.some((l) => l.s != null);
      const chords = s.doc?.lines?.some((l) => l.chords?.length) || s.detectedChords?.length;
      const stems = s.stems.length > 1;
      const k = songKey(s);
      return `<li class="song-row" data-id="${s.id}" tabindex="0" aria-label="${esc(s.title)}${s.artist ? ', ' + esc(s.artist) : ''}">
        <div class="t"><b>${esc(s.title || 'Sans titre')}</b><span>${esc(s.artist || '—')}</span></div>
        <div class="meta">
          <span class="knobs" title="${[synced && 'Paroles synchronisées', chords && 'Accords', stems && 'Pistes séparées'].filter(Boolean).join(' · ') || 'Audio seul'}"><i class="knob voice ${synced ? 'on' : ''}"></i><i class="knob harmony ${chords ? 'on' : ''}"></i><i class="knob rhythm ${stems ? 'on' : ''}"></i></span>
          <span class="bpm">${s.bpm ? Math.round(s.bpm) + ' bpm' : ''}</span>
          <span class="dur">${s.duration ? fmtTime(s.duration) : ''}</span>
          <span class="key">${k ? esc(keyName(k)) : ''}</span>
        </div>
        <button class="icon-btn more" data-act="song-menu" aria-label="Actions pour ${esc(s.title)}">${icon('more')}</button>
      </li>`;
    }).join('');
  }

  renderJobs() {
    const box = this.el?.querySelector('[data-r="jobs"]');
    if (!box) return;
    const jobs = [...this.app.jobs.values()];
    if (!jobs.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<p class="section-title">En préparation</p><ul class="songs">${jobs.map((j) => `
      <li class="song-row job">
        <div class="t"><b>${esc(j.title)}</b><span>${esc(j.message || 'En attente du Studio…')}</span><div class="bar"><i style="width:${Math.round((j.progress || 0) * 100)}%"></i></div></div>
        <div class="meta">${j.error ? `<span style="color:#c42b2b">Échec</span>` : `${Math.round((j.progress || 0) * 100)} %`}</div>
        <span></span>
      </li>`).join('')}</ul><p class="section-title">Morceaux</p>`;
  }

  onClick(e) {
    const sortB = e.target.closest('[data-sort]');
    if (sortB) { this.sort = sortB.dataset.sort; this.app.setPref('librarySort', this.sort); this.render(); return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'import') this.app.importDialog();
      else if (a === 'demo') this.app.loadDemo();
      else if (a === 'settings') this.app.go('#/settings');
      else if (a === 'setlists') this.app.go('#/setlists');
      else if (a === 'studio') this.app.studioDialog();
      else if (a === 'song-menu') { e.stopPropagation(); this.songMenu(act, act.closest('[data-id]').dataset.id); }
      return;
    }
    const row = e.target.closest('.song-row[data-id]');
    if (row) this.app.go(`#/play/${row.dataset.id}`);
  }

  songMenu(anchor, id) {
    const s = this.songs.find((x) => x.id === id);
    openMenu(anchor, [
      { icon: 'play', label: 'Ouvrir', action: () => this.app.go(`#/play/${id}`) },
      { icon: 'edit', label: 'Paroles et accords', action: () => this.app.go(`#/edit/${id}`) },
      { icon: 'pdf', label: 'Exporter en PDF', action: () => this.app.printSong(s) },
      { icon: 'download', label: 'Télécharger le pack (ZIP)', action: async () => { toast('Préparation du pack…'); const { blob, name } = await exportPack(s); download(blob, name); } },
      { icon: 'mix', label: 'Exporter pour Zoom R20', action: () => this.app.zoomExport(s) },
      { icon: 'list', label: 'Ajouter à une setlist', action: () => this.app.addToSetlist(s) },
      '-',
      { icon: 'trash', label: 'Supprimer', danger: true, action: async () => {
        if (!(await confirmBox('Supprimer ce morceau ?', `« ${s.title} » et ses pistes seront effacés de cet appareil.`, { ok: 'Supprimer', danger: true }))) return;
        await db.deleteSong(id);
        this.songs = this.songs.filter((x) => x.id !== id);
        this.render();
        toast('Morceau supprimé');
      } },
    ]);
  }
}

export class SetlistsView {
  constructor(app) { this.app = app; }

  async open(id) {
    this.lists = await db.allSetlists();
    this.songs = await db.allSongs();
    this.current = id ? this.lists.find((l) => l.id === id) : null;
    const el = document.createElement('section');
    el.className = 'view';
    this.el = el;
    this.app.mount(el);
    el.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  close() { this.el?.remove(); }

  render() {
    const sl = this.current;
    const byId = new Map(this.songs.map((s) => [s.id, s]));
    const head = `<header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Retour">${icon('back')}</button>
        <div class="song-title"><b>${sl ? esc(sl.name) : 'Setlists'}</b><span>${sl ? `${sl.songs.length} morceau${sl.songs.length > 1 ? 'x' : ''}` : 'Enchaîne tes morceaux pour une répétition ou un concert'}</span></div>
        <div class="spacer"></div>
        ${sl ? `<button class="icon-btn" data-act="rename" aria-label="Renommer">${icon('edit')}</button><button class="icon-btn" data-act="delete" aria-label="Supprimer la setlist">${icon('trash')}</button>` : ''}
      </header>`;
    let body;
    if (!sl) {
      body = `<main class="library">
        <div class="lib-head"><div><h1>Setlists</h1></div><div class="spacer"></div><button class="btn primary" data-act="new">${icon('plus')} Nouvelle setlist</button></div>
        ${this.lists.length ? `<ul class="songs">${this.lists.map((l) => `<li class="song-row" data-open="${l.id}"><div class="t"><b>${esc(l.name)}</b><span>${l.songs.map((id) => byId.get(id)?.title).filter(Boolean).slice(0, 4).map(esc).join(', ')}${l.songs.length > 4 ? '…' : ''}</span></div><div class="meta">${l.songs.length} titre${l.songs.length > 1 ? 's' : ''}</div><span></span></li>`).join('')}</ul>`
          : `<div class="empty"><h2>Aucune setlist</h2><p>Une setlist enchaîne les morceaux dans l’ordre. Une pédale Bluetooth peut passer au suivant (Page suivante).</p><div class="row"><button class="btn primary" data-act="new">Créer une setlist</button></div></div>`}
      </main>`;
    } else {
      const items = sl.songs.map((id, i) => {
        const s = byId.get(id);
        if (!s) return '';
        const k = songKey(s);
        return `<li class="set-item" data-i="${i}">
          <span class="num">${i + 1}</span>
          <div class="t" style="min-width:0"><b style="display:block;font:600 18px var(--font-display)">${esc(s.title)}</b><span class="note">${esc(s.artist || '')}${k ? ' · ' + esc(keyName(k)) : ''}</span></div>
          <span><button class="icon-btn" data-act="up" aria-label="Monter">↑</button><button class="icon-btn" data-act="down" aria-label="Descendre">↓</button></span>
          <span><button class="icon-btn" data-act="play-i" aria-label="Jouer">${icon('play')}</button><button class="icon-btn" data-act="remove" aria-label="Retirer">${icon('close')}</button></span>
        </li>`;
      }).join('');
      const others = this.songs.filter((s) => !sl.songs.includes(s.id)).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr'));
      body = `<main class="library">
        <div class="lib-tools" style="margin:16px 0"><button class="btn primary" data-act="start" ${sl.songs.length ? '' : 'disabled'}>${icon('play')} Lancer la setlist</button><button class="btn" data-act="pdf" ${sl.songs.length ? '' : 'disabled'}>${icon('pdf')} PDF de la setlist</button></div>
        <ol class="set-list">${items || '<li class="note" style="padding:16px 4px">Ajoute des morceaux ci-dessous.</li>'}</ol>
        ${others.length ? `<p class="section-title">Ajouter</p><ul class="songs">${others.map((s) => `<li class="song-row" data-add="${s.id}"><div class="t"><b>${esc(s.title)}</b><span>${esc(s.artist || '')}</span></div><div class="meta"></div><span class="icon-btn">${icon('plus')}</span></li>`).join('')}</ul>` : ''}
      </main>`;
    }
    this.el.innerHTML = head + body;
  }

  async save() { await db.putSetlist(this.current); }

  async onClick(e) {
    const open = e.target.closest('[data-open]');
    if (open) { this.app.go(`#/setlists/${open.dataset.open}`); return; }
    const add = e.target.closest('[data-add]');
    if (add) { this.current.songs.push(add.dataset.add); await this.save(); this.render(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    const i = +b.closest('[data-i]')?.dataset.i;
    const sl = this.current;
    if (a === 'back') this.app.go(sl ? '#/setlists' : '#/');
    else if (a === 'new') {
      const name = await askName('Nouvelle setlist', 'Répétition du samedi');
      if (!name) return;
      const l = { id: uid(), name, songs: [], createdAt: Date.now() };
      await db.putSetlist(l);
      this.app.go(`#/setlists/${l.id}`);
    } else if (a === 'rename') {
      const name = await askName('Renommer la setlist', sl.name);
      if (name) { sl.name = name; await this.save(); this.render(); }
    } else if (a === 'delete') {
      if (await confirmBox('Supprimer la setlist ?', 'Les morceaux restent dans ta bibliothèque.', { ok: 'Supprimer', danger: true })) { await db.deleteSetlist(sl.id); this.app.go('#/setlists'); }
    } else if (a === 'up' && i > 0) { [sl.songs[i - 1], sl.songs[i]] = [sl.songs[i], sl.songs[i - 1]]; await this.save(); this.render(); }
    else if (a === 'down' && i < sl.songs.length - 1) { [sl.songs[i + 1], sl.songs[i]] = [sl.songs[i], sl.songs[i + 1]]; await this.save(); this.render(); }
    else if (a === 'remove') { sl.songs.splice(i, 1); await this.save(); this.render(); }
    else if (a === 'play-i') this.app.playFromSetlist(sl, i);
    else if (a === 'start') this.app.playFromSetlist(sl, 0);
    else if (a === 'pdf') this.app.printSetlist(sl);
  }
}

export async function askName(title, value = '') {
  const { done } = dialog(`<form method="dialog"><h2>${esc(title)}</h2><label class="field">Nom<input type="text" name="n" value="${esc(value)}" required autofocus></label>
    <div class="actions"><button class="btn ghost" data-close="">Annuler</button><button class="btn primary" value="ok">Valider</button></div></form>`, {
    onOpen: (d, close) => {
      const f = d.querySelector('form');
      const inp = f.querySelector('input');
      inp.select();
      f.addEventListener('submit', (e) => { e.preventDefault(); close(inp.value.trim()); });
    },
  });
  return done;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
