'use strict';

/* ===== Config ===== */
const SOURCES = [
  { path: "Opinion%20and%20argument.json", topic: "Opinion & Argument" },
  { path: "Doubt,%20guessing%20and%20certainty.json", topic: "Doubt, guessing and certainty" },
  { path: "Discussion%20and%20agreement.json", topic: "Discussion and agreement" },
  { path: "Personal%20Qualities.json", topic: "Personal Qualities" },
];
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

let DATA = [];

/* ===== Preferences (favorites & hidden) ===== */
const LS_FAV = 'wg_favorites';
const LS_HIDE = 'wg_hidden';
function loadSet(key){ try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); } }
function saveSet(key, set){ localStorage.setItem(key, JSON.stringify([...set])); }
let favSet = loadSet(LS_FAV);
let hideSet = loadSet(LS_HIDE);
function keyFor(it){ return (it.term || '').toLowerCase(); } // hide by term across topics/levels

/* ===== Elements ===== */
const list = document.getElementById('list');
const btn = document.getElementById('btn');
const levelSlider = document.getElementById('level');
const themeBtn = document.getElementById('themeToggle');
const ddRoot = document.getElementById('topicDropdown');
const anyLevel = document.getElementById('anyLevel');
const favoritesOnly = document.getElementById('favoritesOnly');
const resetHiddenBtn = document.getElementById('resetHidden');

/* ===== Theme ===== */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}
applyTheme(localStorage.getItem('theme') || 'dark');
themeBtn.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

/* ===== Slider visuals ===== */
function updateSliderVisuals() {
  const min = Number(levelSlider.min);
  const max = Number(levelSlider.max);
  const val = Number(levelSlider.value);
  const pct = ((val - min) / (max - min)) * 100;
  levelSlider.style.setProperty('--fill', pct + '%');
  levelSlider.setAttribute('aria-valuetext', anyLevel.checked ? 'All levels' : (LEVELS[val] || 'A1'));
}
levelSlider.addEventListener('input', updateSliderVisuals);
window.addEventListener('resize', updateSliderVisuals);

/* ===== Any level toggle ===== */
function syncAnyLevel() {
  const any = anyLevel.checked;
  localStorage.setItem('anyLevel', any ? '1' : '0');
  levelSlider.disabled = any;
  updateSliderVisuals();
}
anyLevel.addEventListener('change', syncAnyLevel);

/* ===== Topic dropdown ===== */
const TopicDropdown = (() => {
  const state = { open: false, value: ddRoot?.dataset.default || localStorage.getItem('topic') || 'all' };

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dd-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.textContent = 'All topics';
  const chev = document.createElement('span');
  chev.textContent = '▾';
  trigger.append(label, chev);

  const menu = document.createElement('ul');
  menu.className = 'dd-menu';
  menu.setAttribute('role', 'listbox');
  menu.tabIndex = -1;

  const options = [{value:'all', label:'All topics'}, ...SOURCES.map(s => ({value:s.topic, label:s.topic}))];
  function render() {
    menu.innerHTML = '';
    options.forEach((o) => {
      const li = document.createElement('li');
      li.className = 'dd-option';
      li.setAttribute('role','option');
      li.setAttribute('aria-selected', o.value === state.value ? 'true' : 'false');
      li.dataset.value = o.value;
      li.textContent = o.label;
      li.addEventListener('click', () => select(o.value));
      menu.appendChild(li);
    });
  }
  function select(v) {
    state.value = v;
    localStorage.setItem('topic', v);
    label.textContent = options.find(o => o.value === v)?.label || 'All topics';
    close();
  }
  function open() {
    state.open = true;
    ddRoot.classList.add('open');
    trigger.setAttribute('aria-expanded','true');
    render();
    document.addEventListener('mousedown', onOutside, { once: true });
    setTimeout(() => menu.focus(), 0);
  }
  function close() {
    state.open = false;
    ddRoot.classList.remove('open');
    trigger.setAttribute('aria-expanded','false');
    trigger.focus();
  }
  function onOutside(e) { if (!ddRoot.contains(e.target)) close(); }

  if (ddRoot) {
    trigger.addEventListener('click', () => state.open ? close() : open());
    ddRoot.append(trigger, menu);
    select(state.value); // initialize
  }
  return { value: () => state.value };
})();

/* ===== Data loading (robust + de-dup) ===== */
async function loadJSON() {
  const map = new Map();
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.path, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const arr = await res.json();
      for (const raw of arr) {
        const term = String(raw.term || raw.word || '').trim();
        const type = String(raw.type || raw.pos || '').trim();
        const level = String(raw.level || '').trim();
        if (!term) continue;
        const normTerm = term.toLowerCase();
        const normType = type.toLowerCase();
        const normLevel = level.toUpperCase();
        const it = { term, type, level: normLevel, __topic: src.topic };
        const key = `${normTerm}|${normType}|${normLevel}|${src.topic}`;
        if (!map.has(key)) map.set(key, it);
      }
    } catch (e) {
      console.warn('Failed to load', src.path, e);
    }
  }
  DATA = [...map.values()];
}

/* ===== Helpers ===== */
function sampleUnique(list, n) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
function cambridgeUrl(term) {
  const base = "https://dictionary.cambridge.org/dictionary/english/";
  const cleaned = term.toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-']/g,'');
  return base + encodeURIComponent(cleaned);
}
function oxfordUrl(term) {
  const base = "https://www.oxfordlearnersdictionaries.com/definition/english/";
  const cleaned = term.toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-']/g,'');
  return base + encodeURIComponent(cleaned);
}

/* ===== Render ===== */
function render(items) {
  list.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.textContent = 'No words found for this selection.';
    list.appendChild(empty);
    return;
  }
  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'card';

    const t = document.createElement('div');
    t.className = 'term';
    const title = document.createElement('span');
    title.textContent = it.term;
    const badges = document.createElement('span');
    badges.className = 'badges';
    if (it.type) { const b1 = document.createElement('span'); b1.className = 'badge'; b1.textContent = it.type; badges.appendChild(b1); }
    if (it.level) { const b2 = document.createElement('span'); b2.className = 'badge'; b2.textContent = it.level; badges.appendChild(b2); }
    const left = document.createElement('span'); left.append(title, badges);

    // actions
    const actions = document.createElement('span');
    actions.className = 'actions';
    const favBtn = document.createElement('button');
    favBtn.className = 'icon-btn fav';
    favBtn.title = 'Favorite';
    favBtn.setAttribute('aria-label','Favorite');
    const k = keyFor(it);
    const isFav = favSet.has(k);
    if (isFav) favBtn.classList.add('active');
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.addEventListener('click', () => {
      if (favSet.has(k)) { favSet.delete(k); } else { favSet.add(k); }
      saveSet(LS_FAV, favSet);
      favBtn.classList.toggle('active');
      favBtn.textContent = favSet.has(k) ? '★' : '☆';
    });

    const hideBtn = document.createElement('button');
    hideBtn.className = 'icon-btn hide';
    hideBtn.title = 'Hide (Known)';
    hideBtn.setAttribute('aria-label','Hide (Known)');
    hideBtn.textContent = '🚫';
    hideBtn.addEventListener('click', () => {
      hideSet.add(k);
      saveSet(LS_HIDE, hideSet);
      card.remove();
    });

    actions.append(favBtn, hideBtn);
    t.append(left, actions);
    card.appendChild(t);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const a1 = document.createElement('a'); a1.href = cambridgeUrl(it.term); a1.target = '_blank'; a1.rel = 'noopener noreferrer'; a1.textContent = 'Cambridge ↗';
    const a2 = document.createElement('a'); a2.href = oxfordUrl(it.term); a2.target = '_blank'; a2.rel = 'noopener noreferrer'; a2.textContent = 'Oxford ↗';
    meta.append(a1, a2);
    card.appendChild(meta);

    list.appendChild(card);
  }
}

/* ===== Generate ===== */
async function generate() {
  list.setAttribute('aria-busy', 'true');

  if (DATA.length === 0) {
    await loadJSON();
  }
  const selectedTopic = TopicDropdown.value();
  const any = anyLevel.checked;
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Number(levelSlider.value) || 0))];

  // start with all, exclude hidden, then filter favorites if requested
  let pool = DATA.filter(x => !hideSet.has(keyFor(x)));
  if (favoritesOnly && favoritesOnly.checked) {
    pool = pool.filter(x => favSet.has(keyFor(x)));
  }
  if (selectedTopic !== 'all') {
    pool = pool.filter(x => x.__topic === selectedTopic);
  }
  if (!any) {
    pool = pool.filter(x => x.level === level);
  }

  const five = sampleUnique(pool, Math.min(5, pool.length || 0));
  if (five.length === 0) {
    const alt = DATA.filter(x => selectedTopic === 'all' ? true : x.__topic === selectedTopic);
    render(sampleUnique(alt, Math.min(5, alt.length)));
  } else {
    render(five);
  }
  list.setAttribute('aria-busy', 'false');
}

/* ===== Init (persist state) ===== */
(function initState(){
  const savedLevel = localStorage.getItem('levelIndex');
  if (savedLevel !== null) levelSlider.value = String(Math.max(0, Math.min(5, Number(savedLevel))));
  const savedAny = localStorage.getItem('anyLevel');
  if (savedAny !== null) anyLevel.checked = savedAny === '1';
  const savedFavOnly = localStorage.getItem('favOnly');
  if (savedFavOnly !== null && favoritesOnly) favoritesOnly.checked = savedFavOnly === '1';

  levelSlider.addEventListener('change', () => localStorage.setItem('levelIndex', String(levelSlider.value)));
  if (favoritesOnly) favoritesOnly.addEventListener('change', () => localStorage.setItem('favOnly', favoritesOnly.checked ? '1' : '0'));

  updateSliderVisuals();
  syncAnyLevel();
})();

btn.addEventListener('click', generate);
