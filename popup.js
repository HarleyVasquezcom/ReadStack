const K = { STACK: 'rs:stack', CAP: 'rs:cap', LANG: 'rs:lang' };
const CAP_DEFAULT = 200;
const CREDIT_URL = 'https://www.linkedin.com/in/harleyvasquez/';
const LOCALES = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', it: 'it-IT', de: 'de-DE' };

let stack = [];
let filter = 'all';
let searchQ = '';

const getLocal = (keys) => chrome.storage.local.get(keys);
const setLocal = (obj) => chrome.storage.local.set(obj);
const byId = (id) => document.getElementById(id);

function L(key, params) {
  return window.__rsT(key, undefined, params);
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer = null;
function setStatus(msg) {
  const el = byId('status');
  el.textContent = msg || '';
  clearTimeout(toastTimer);
  if (msg) toastTimer = setTimeout(() => { el.textContent = ''; }, 3500);
}

async function stackKey() {
  const s = await getLocal(null);
  const capRaw = s[K.CAP];
  const cap = typeof capRaw === 'number' && capRaw > 0 ? capRaw : CAP_DEFAULT;
  return { stack: Array.isArray(s[K.STACK]) ? s[K.STACK].slice() : [], cap };
}

async function persist(next) {
  stack = next;
  await setLocal({ [K.STACK]: stack });
}

function pruneIfNeeded(arr, cap) {
  if (arr.length <= cap) return arr;
  const drop = arr.length - cap;
  const nonArchived = arr.filter((i) => !i.archived).sort((a, b) => a.savedAt - b.savedAt);
  const candidates = nonArchived.length >= drop
    ? nonArchived.slice(0, drop)
    : arr.slice().sort((a, b) => a.savedAt - b.savedAt).slice(0, drop);
  const ids = new Set(candidates.map((i) => i.id));
  return arr.filter((i) => !ids.has(i.id));
}

async function saveItem(raw) {
  const { stack: cur, cap } = await stackKey();
  const item = {
    id: 'rs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    title: typeof raw.title === 'string' ? raw.title.slice(0, 300) : '',
    url: typeof raw.url === 'string' ? raw.url.slice(0, 2000) : '',
    text: typeof raw.text === 'string' ? raw.text.slice(0, 20000) : '',
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now(),
    read: false,
    archived: false,
    source: typeof raw.source === 'string' ? raw.source : 'title',
  };
  const next = pruneIfNeeded([item, ...cur], cap);
  await persist(next);
  return item;
}

async function captureActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || typeof tab.url !== 'string' || !tab.url.startsWith('http')) {
    return null;
  }
  try {
    const res = await fetch(tab.url, { redirect: 'follow' });
    if (res.ok) {
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.title = doc.title || '';
      const root = doc.querySelector('article, main, [role="main"]') || doc.body;
      const text = ((root ? root.textContent : '') || '').replace(/\s+/g, ' ').trim().slice(0, 20000);
      return { title: doc.title || tab.title || '', url: tab.url, text, source: text ? 'fetch' : 'title' };
    }
  } catch (e) {
    /* CORS or network — fall through to scripting */
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const root = document.querySelector('article, main, [role="main"]') || document.body;
        const text = ((root ? root.textContent : '') || '').replace(/\s+/g, ' ').trim().slice(0, 20000);
        return { text, title: document.title || '' };
      },
    });
    const out = results && results[0] && results[0].result;
    if (out) {
      return { title: out.title || tab.title || '', url: tab.url, text: out.text, source: out.text ? 'script' : 'title' };
    }
  } catch (e) {
    /* no activeTab grant */
  }
  return { title: tab.title || tab.url, url: tab.url, text: '', source: 'title' };
}

async function addActiveTab() {
  const captured = await captureActiveTab();
  if (!captured) {
    setStatus(L('noActiveTab'));
    return null;
  }
  if (!captured.text) setStatus(L('couldNotRead'));
  else setStatus(L('added'));
  await saveItem(captured);
  await render();
  return captured;
}

function dateStr(savedAt) {
  try {
    const code = (window.__rsDict && document.querySelector('#langSel')?.value) || 'en';
    return new Date(savedAt).toLocaleDateString(LOCALES[code] || LOCALES.en, { month: 'short', day: 'numeric' });
  } catch (e) {
    return new Date(savedAt).toLocaleDateString();
  }
}

function matchesSearch(item, q) {
  if (!q) return true;
  const hay = (item.title + ' ' + (item.url || '') + ' ' + (item.text || '')).toLowerCase();
  return hay.includes(q.toLowerCase());
}

function visible() {
  return stack.filter((i) => {
    if (filter === 'unread' && i.read) return false;
    if (filter === 'archived' && !i.archived) return false;
    if (filter === 'all' && i.archived) return false;
    return matchesSearch(i, searchQ);
  });
}

async function render() {
  const listEl = byId('list');
  const items = visible();
  byId('unreadCount').textContent = stack.filter((i) => !i.read).length ? L('unreadCount', { n: stack.filter((i) => !i.read).length }) : '';
  const { cap } = await stackKey();
  byId('capNote').textContent = L('capNote', { n: stack.length, m: cap });
  document.querySelectorAll('.filt').forEach((b) => b.classList.toggle('active', b.dataset.f === filter));
  listEl.textContent = '';
  if (!items.length) {
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = searchQ
      ? L('emptySearch')
      : filter === 'unread'
        ? L('emptyUnread')
        : L('emptyAll');
    listEl.appendChild(div);
    return;
  }
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'item' + (item.archived ? ' archived' : '');
    row.dataset.id = item.id;

    const itop = document.createElement('div');
    itop.className = 'itop';
    const dot = document.createElement('span');
    dot.className = 'dot' + (item.read ? ' read' : '');
    dot.title = item.read ? L('read') : L('unread');
    const ibody = document.createElement('div');
    ibody.className = 'ibody';
    const title = document.createElement('div');
    title.className = 'ititle';
    title.textContent = item.title || item.url;
    const sub = document.createElement('div');
    sub.className = 'isub';
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = hostOf(item.url) || '—';
    const when = document.createElement('span');
    when.textContent = L('savedOn') + ' ' + dateStr(item.savedAt);
    sub.appendChild(chip);
    sub.appendChild(when);
    ibody.appendChild(title);
    ibody.appendChild(sub);
    if (item.text) {
      const snip = document.createElement('div');
      snip.className = 'isnip';
      snip.textContent = item.text.replace(/\s+/g, ' ').slice(0, 120);
      ibody.appendChild(snip);
    }
    itop.appendChild(dot);
    itop.appendChild(ibody);
    row.appendChild(itop);

    const acts = document.createElement('div');
    acts.className = 'iacts';
    const toggleRead = document.createElement('button');
    toggleRead.className = 'mini';
    toggleRead.textContent = item.read ? L('markUnread') : L('markRead');
    toggleRead.addEventListener('click', () => toggleItemRead(item.id));
    const toggleArc = document.createElement('button');
    toggleArc.className = 'mini';
    toggleArc.textContent = item.archived ? L('unarchive') : L('archive');
    toggleArc.addEventListener('click', () => toggleItemArchive(item.id));
    const openB = document.createElement('button');
    openB.className = 'mini';
    openB.textContent = L('open');
    openB.addEventListener('click', () => openItem(item.id));
    const readView = document.createElement('button');
    readView.className = 'mini';
    readView.textContent = L('readView');
    readView.addEventListener('click', () => openReadView(item.id));
    const del = document.createElement('button');
    del.className = 'mini del';
    del.textContent = L('delete');
    del.addEventListener('click', () => deleteItem(item.id));
    acts.appendChild(toggleRead);
    acts.appendChild(toggleArc);
    acts.appendChild(openB);
    acts.appendChild(readView);
    acts.appendChild(del);
    row.appendChild(acts);

    listEl.appendChild(row);
  }
}

async function toggleItemRead(id) {
  const next = stack.map((i) => (i.id === id ? { ...i, read: !i.read } : i));
  await persist(next);
  await render();
}

async function toggleItemArchive(id) {
  const next = stack.map((i) => (i.id === id ? { ...i, archived: !i.archived } : i));
  await persist(next);
  await render();
}

async function openItem(id) {
  const item = stack.find((i) => i.id === id);
  if (item && item.url) await chrome.tabs.create({ url: item.url, active: false });
}

async function openReadView(id) {
  await chrome.tabs.create({ url: chrome.runtime.getURL('read.html?q=' + encodeURIComponent(id)), active: false });
}

async function deleteItem(id) {
  if (!window.confirm(L('confirmDelete'))) return;
  const next = stack.filter((i) => i.id !== id);
  await persist(next);
  setStatus(L('deleted'));
  await render();
}

async function exportJson() {
  const out = { exportedAt: Date.now(), items: stack, total: stack.length };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'readstack-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(L('exported', { n: stack.length }));
}

async function purgeArchived() {
  if (!stack.some((i) => i.archived)) return;
  if (!window.confirm(L('confirmPurge'))) return;
  await persist(stack.filter((i) => !i.archived));
  setStatus(L('purged'));
  await render();
}

/* ---------- probe hooks ---------- */
window.__rsStack = async () => (await stackKey()).stack;
window.__rsSave = async (raw) => {
  const item = await saveItem(raw || {});
  await render();
  return item;
};
window.__rsAdd = async () => {
  const captured = await addActiveTab();
  return captured;
};
window.__rsOpen = async (id) => {
  await openItem(id);
};
window.__rsReadUrl = (id) => chrome.runtime.getURL('read.html?q=' + encodeURIComponent(id));
window.__rsReadOpen = async (id) => {
  await openReadView(id);
};
window.__rsExport = async () => JSON.stringify({ exportedAt: Date.now(), items: stack, total: stack.length });
window.__rsPurgeArchived = async () => {
  await purgeArchived();
  return stack.slice();
};
window.__rsNowMs = () => Date.now();
window.__rsCap = async (v) => {
  const s = await getLocal(K.CAP);
  const cap = typeof s[K.CAP] === 'number' ? s[K.CAP] : CAP_DEFAULT;
  if (typeof v === 'number') {
    await setLocal({ [K.CAP]: v });
    return v;
  }
  return cap;
};
/* ---------- ---------- */

async function init() {
  const s = await getLocal(null);
  stack = Array.isArray(s[K.STACK]) ? s[K.STACK] : [];
  if (!Array.isArray(s[K.STACK])) await setLocal({ [K.STACK]: [] });
  document.querySelector('#addBtn').addEventListener('click', addActiveTab);
  document.querySelectorAll('.filt').forEach((b) => {
    b.addEventListener('click', () => {
      filter = b.dataset.f;
      render();
    });
  });
  byId('searchInput').addEventListener('input', (e) => {
    searchQ = e.target.value.trim();
    render();
  });
  byId('exportBtn').addEventListener('click', exportJson);
  byId('purgeBtn').addEventListener('click', purgeArchived);
  await window.__rsApply(document);
  await render();
}

init();