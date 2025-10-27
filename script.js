'use strict';

/* =====================
   Config / Data sources
   ===================== */
const SOURCES = [
  { path: "Opinion and argument.json", topic: "Opinion & Argument" },
  { path: "Doubt, guessing and certainty.json", topic: "Doubt, guessing and certainty" },
  { path: "Discussion and agreement.json", topic: "Discussion and agreement" },
  { path: "Personal qualities.json", topic: "Personal Qualities" },
  { path: "Feelings.json", topic: "Feelings" },
];
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

/* DOM */
let DATA = [];
const list = document.getElementById('list');
const btn = document.getElementById('btn');
const levelSlider = document.getElementById('level');
const themeBtn = document.getElementById('themeToggle');
const ddRoot = document.getElementById('topicDropdown');
const favToggle = document.getElementById('favToggle');

/* Theme */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.innerHTML = (theme === 'dark') ? '<span class="icon">🌞</span> Light' : '<span class="icon">🌙</span> Dark';
}
function toggleTheme(){
  const next = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

/* Favorites storage */
const FAV_KEY = 'wordgen:favorites';
function favKey(item){
  return [item.term, item.type||'', item.level||'', item.__topic||''].join('|');
}
function getFavs(){
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||'[]')); } catch(err){ return new Set(); }
}
function setFavs(set){
  localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(set)));
}

/* Fetch + merge data (resilient) */
async function loadJSON(){
  if (DATA.length) return DATA;
  const settled = await Promise.allSettled(
    SOURCES.map(async ({path, topic}) => {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error(`Expected an array in ${path}`);
      return json.map(x => ({ ...x, __topic: topic }));
    })
  );

  const merged = [];
  for (const s of settled) {
    if (s.status === 'fulfilled' && Array.isArray(s.value)) merged.push(...s.value);
  }

  // Deduplicate
  const map = new Map();
  for (const item of merged) {
    if (!item || !item.term) continue;
    const key = favKey(item).toLowerCase();
    if (!map.has(key)) map.set(key, item);
  }
  DATA = Array.from(map.values());
  return DATA;
}

/* Utils */
function sampleUnique(arr, n){
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}
function currentLevel(){
  const idx = Math.max(0, Math.min(LEVELS.length - 1, Number(levelSlider.value) || 0));
  return LEVELS[idx];
}
function currentTopic(){
  const selected = ddRoot.querySelector('.dd-option[aria-selected="true"]');
  return selected ? selected.dataset.value : 'all';
}
function cambridgeUrl(term){
  const t = encodeURIComponent(String(term || '').replaceAll('…',''));
  return `https://dictionary.cambridge.org/dictionary/english/${t}`;
}
function oxfordUrl(term){
  const t = encodeURIComponent(String(term || '').replaceAll('…',''));
  return `https://www.oxfordlearnersdictionaries.com/definition/english/${t}`;
}

/* Helper: friendly warning when running from file:// */
function showWarning(msg){
  list.innerHTML = "";
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = msg;
  list.appendChild(div);
}

/* Render */
function render(items){
  list.innerHTML = '';
  const favs = getFavs();

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card';

    // Favorite Star
    const favBtn = document.createElement('button');
    favBtn.className = 'fav';
    favBtn.type = 'button';
    favBtn.setAttribute('aria-label', 'Toggle favorite');
    const key = favKey(item);
    const isFav = favs.has(key);
    favBtn.setAttribute('aria-pressed', String(isFav));
    favBtn.innerHTML = '<span class="star">★</span>';
    favBtn.addEventListener('click', () => {
      const set = getFavs();
      if (set.has(key)) set.delete(key); else set.add(key);
      setFavs(set);
      favBtn.setAttribute('aria-pressed', String(set.has(key)));
      // If we're in "favorites only", re-generate so hidden ones disappear
      if (favToggle.getAttribute('aria-pressed') === 'true') generate();
    });

    const title = document.createElement('div');
    title.className = 'term';
    title.textContent = item.term || '—';

    const rowMeta = document.createElement('div');
    rowMeta.className = 'row-meta';

    const badges = document.createElement('span');
    badges.className = 'badges';
    if (item.type) {
      const b1 = document.createElement('span');
      b1.className = 'badge type';
      b1.textContent = item.type;
      badges.appendChild(b1);
    }
    if (item.level) {
      const b2 = document.createElement('span');
      b2.className = 'badge level';
      b2.textContent = String(item.level).toUpperCase();
      badges.appendChild(b2);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const linkCam = document.createElement('a');
    linkCam.href = cambridgeUrl(item.term);
    linkCam.target = '_blank'; linkCam.rel = 'noopener';
    linkCam.textContent = 'Cambridge ↗';
    const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = ' · ';
    const linkOxf = document.createElement('a');
    linkOxf.href = oxfordUrl(item.term);
    linkOxf.target = '_blank'; linkOxf.rel = 'noopener';
    linkOxf.textContent = 'Oxford ↗';

    meta.append(linkCam, sep, linkOxf);

    rowMeta.append(badges);
    card.append(favBtn, title, rowMeta, meta);
    list.appendChild(card);
  }
}

/* Generate */
async function generate(){
  list.setAttribute('aria-busy', 'true');
  await loadJSON();
  if (!DATA.length) {
    const proto = location.protocol;
    const hint = (proto === 'file:')
      ? '<strong>Heads up:</strong> Browsers block <code>fetch()</code> from <code>file://</code>. Open with a local server or deploy to GitHub Pages.'
      : 'No data could be loaded.';
    showWarning(hint);
    list.setAttribute('aria-busy','false');
    return;
  }

  const selLevel = currentLevel();
  const selTopic = currentTopic();
  const onlyFavs = favToggle.getAttribute('aria-pressed') === 'true';
  const favs = getFavs();

  let pool = DATA.filter(x => String(x.level || '').toUpperCase() === selLevel);
  if (selTopic !== 'all') pool = pool.filter(x => x.__topic === selTopic);
  if (onlyFavs) pool = pool.filter(x => favs.has(favKey(x)));

  const out = sampleUnique(pool, 5);
  render(out);
  list.setAttribute('aria-busy', 'false');
}

/* Dropdown */
function initDropdown(){
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dd-trigger btn';
  trigger.setAttribute('aria-haspopup','listbox');
  trigger.setAttribute('aria-expanded','false');

  const label = document.createElement('span');
  label.textContent = 'All topics';
  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '▾';
  trigger.append(label, chev);

  const menu = document.createElement('ul');
  menu.className = 'dd-menu';
  menu.setAttribute('role','listbox');
  menu.tabIndex = -1;

  function setOpen(v){
    ddRoot.classList.toggle('open', v);
    trigger.setAttribute('aria-expanded', String(v));
    if (v) {
      menu.style.minWidth = trigger.offsetWidth + 'px';
      menu.focus();
    }
  }
  function setValue(val, text){
    Array.from(menu.children).forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === val)));
    trigger.querySelector('span').textContent = text;
    setOpen(false);
  }
  function buildOptions(){
    const topics = ['all', ...Array.from(new Set(SOURCES.map(s => s.topic)))];
    menu.innerHTML = '';
    topics.forEach(t => {
      const li = document.createElement('li');
      li.className = 'dd-option';
      li.dataset.value = t;
      li.setAttribute('role','option');
      li.setAttribute('aria-selected', String(t === 'all'));
      li.textContent = (t === 'all') ? 'All topics' : t;
      li.addEventListener('click', () => {
        setValue(t, li.textContent);
        generate();
      });
      menu.appendChild(li);
    });
  }

  trigger.addEventListener('click', () => setOpen(!ddRoot.classList.contains('open')));
  document.addEventListener('click', (e) => {
    if (!ddRoot.contains(e.target)) setOpen(false);
  });

  ddRoot.append(trigger, menu);
  buildOptions();
}

/* Init */
function init(){
  // Theme
  applyTheme(localStorage.getItem('theme') || 'dark');
  themeBtn.addEventListener('click', toggleTheme);

  // Favorites toggle
  const favState = localStorage.getItem('wordgen:favOnly') === 'true';
  favToggle.setAttribute('aria-pressed', String(favState));
  favToggle.addEventListener('click', () => {
    const next = favToggle.getAttribute('aria-pressed') !== 'true';
    favToggle.setAttribute('aria-pressed', String(next));
    localStorage.setItem('wordgen:favOnly', String(next));
    generate();
  });

  // Dropdown
  initDropdown();

  // Slider
  levelSlider.addEventListener('change', generate);

  // First render (empty)
  list.innerHTML = '';
}

init();
btn.addEventListener('click', generate);
