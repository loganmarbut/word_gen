
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

/* Theme */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = (theme === 'dark') ? "🌞 Light" : "🌙 Dark";
}
function toggleTheme(){
  const next = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

/* Fetch + merge data. Never fail the whole app if one file is missing. */
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
    // if rejected, ignore; the app should still work with available sets
  }

  // Deduplicate
  const map = new Map();
  for (const item of merged) {
    if (!item || !item.term) continue;
    const key = [item.term, item.type || '', item.level || '', item.__topic || ''].join('|').toLowerCase();
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
  return copy.slice(0, n);
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

/* Render */

/* Helper: show a friendly warning if nothing can be loaded (e.g., running from file://) */
function showWarning(msg){
  list.innerHTML = "";
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = msg;
  list.appendChild(div);
}
function render(items){
  list.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card';

    const title = document.createElement('div');
    title.className = 'term';
    title.textContent = item.term || '—';

    const badges = document.createElement('span');
    badges.className = 'badges';
    if (item.type) {
      const b1 = document.createElement('span');
      b1.className = 'badge';
      b1.textContent = item.type;
      badges.appendChild(b1);
    }
    if (item.level) {
      const b2 = document.createElement('span');
      b2.className = 'badge';
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

    card.append(title, badges, meta);
    list.appendChild(card);
  }
}

/* Generate */
async function generate(){
  list.setAttribute('aria-busy', 'true');
  await loadJSON();
  if (!DATA.length) { const proto = location.protocol; const hint = (proto === 'file:') ? '<strong>Heads up:</strong> Browsers block <code>fetch()</code> from <code>file://</code>. Open this folder with a local server or deploy to GitHub Pages.' : 'No data could be loaded.'; showWarning(hint); list.setAttribute('aria-busy','false'); return; }

  const selLevel = currentLevel();
  const selTopic = currentTopic();

  let pool = DATA.filter(x => String(x.level || '').toUpperCase() === selLevel);
  if (selTopic !== 'all') pool = pool.filter(x => x.__topic === selTopic);

  const out = sampleUnique(pool, Math.min(5, pool.length || 0));
  if (out.length === 0) {
    const fallback = DATA.filter(x => selTopic === 'all' ? true : x.__topic === selTopic);
    render(sampleUnique(fallback, Math.min(5, fallback.length)));
  } else {
    render(out);
  }
  list.setAttribute('aria-busy', 'false');
}

/* Simple custom dropdown */
function initDropdown(){
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dd-trigger';
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

  // Dropdown
  initDropdown();

  // Slider
  levelSlider.addEventListener('change', generate);

  // First render (empty)
  list.innerHTML = '';
}

init();
btn.addEventListener('click', generate);
