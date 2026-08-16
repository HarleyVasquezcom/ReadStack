const K = { STACK: 'rs:stack', READ_SIZE: 'rs:readSize', LANG: 'rs:lang' };
const SIZES = [13, 15, 17, 19, 21, 23, 25];
const LOCALES = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', it: 'it-IT', de: 'de-DE' };

const $ = (id) => document.getElementById(id);
const getLocal = (keys) => chrome.storage.local.get(keys);
const setLocal = (obj) => chrome.storage.local.set(obj);

function L(key, params) {
  return window.__rsT(key, undefined, params);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

function dateStr(savedAt) {
  try {
    const lang = document.documentElement.lang || 'en';
    return new Date(savedAt).toLocaleDateString(LOCALES[lang] || LOCALES.en, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return new Date(savedAt).toLocaleDateString();
  }
}

function applySize(px) {
  document.body.style.setProperty('--rsize', px + 'px');
}

async function currentSize() {
  const s = await getLocal(K.READ_SIZE);
  const v = typeof s[K.READ_SIZE] === 'number' && SIZES.includes(s[K.READ_SIZE]) ? s[K.READ_SIZE] : 17;
  applySize(v);
  return v;
}

async function changeSize(dir) {
  const s = await getLocal(K.READ_SIZE);
  let cur = typeof s[K.READ_SIZE] === 'number' && SIZES.includes(s[K.READ_SIZE]) ? s[K.READ_SIZE] : 17;
  const i = SIZES.indexOf(cur);
  const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, i + dir))];
  applySize(next);
  await setLocal({ [K.READ_SIZE]: next });
  return next;
}

async function markRead(id) {
  const s = await getLocal(K.STACK);
  const items = Array.isArray(s[K.STACK]) ? s[K.STACK] : [];
  const next = items.map((i) => (i.id === id ? { ...i, read: true } : i));
  await setLocal({ [K.STACK]: next });
  return next.find((i) => i.id === id) || null;
}

async function init() {
  await window.__rsApply(document);
  const q = new URLSearchParams(location.search).get('q');
  const s = await getLocal(K.STACK);
  const items = Array.isArray(s[K.STACK]) ? s[K.STACK] : [];
  const item = q ? items.find((i) => i.id === q) || null : null;
  const backBtn = $('backBtn');
  backBtn.addEventListener('click', () => window.close());
  $('sizeDown').addEventListener('click', () => changeSize(-1));
  $('sizeUp').addEventListener('click', () => changeSize(1));
  const goTop = $('goTop');
  window.addEventListener('scroll', () => goTop.classList.toggle('show', window.scrollY > 480), { passive: true });
  goTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  if (!item) {
    document.body.classList.add('miss');
    $('miss').hidden = false;
    $('miss').textContent = L('readMiss');
    $('markReadBtn').disabled = true;
    return;
  }
  $('markReadBtn').addEventListener('click', async () => {
    const updated = await markRead(item.id);
    if (updated) $('markReadBtn').disabled = true;
  });
  $('rTitle').textContent = item.title || item.url || '—';
  $('rMeta').textContent = hostOf(item.url || '—') + ' · ' + dateStr(item.savedAt);
  $('rText').textContent = item.text && item.text.trim() ? item.text : item.title || item.url || '';
  if (item.read) $('markReadBtn').disabled = true;
  await currentSize();
}

window.__rsReadItem = async (id) => {
  const s = await getLocal(K.STACK);
  const items = Array.isArray(s[K.STACK]) ? s[K.STACK] : [];
  return (id ? items.find((i) => i.id === id) : items[0]) || null;
};
window.__rsReadSize = (v) => (typeof v === 'number' ? changeSize(v > 0 ? 1 : -1) : currentSize().then(() => document.body.style.getPropertyValue('--rsize')));
window.__rsReadMark = (id) => markRead(id);
window.__rsNowMs = () => Date.now();

init();