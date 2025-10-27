'use strict';

/* ===== Config ===== */
const SOURCES = [
  { path: "Opinion%20and%20argument.json", topic: "Opinion & Argument" },
  { path: "Doubt,%20guessing%20and%20certainty.json", topic: "Doubt, guessing and certainty" },
  { path: "Discussion%20and%20agreement.json", topic: "Discussion and agreement" },
  { path: "Personal%20Qualities.json", topic: "Personal Qualities" },
  { path: "Feelings.json", topic: "Feelings" },
];
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

let DATA = [];
let TOPIC_COUNTS = new Map();

/* ===== Preferences (favorites & hidden) ===== */
const LS_FAV = 'wg_favorites';
const LS_HIDE = 'wg_hidden';
const LS_LEVEL_INDEX = 'levelIndex';
const LS_ANY = 'anyLevel';
const LS_FAV_ONLY = 'favOnly';
const LS_BATCH = 'batch';

function loadSet(key){ try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); } }
function saveSet(key, set){ localStorage.setItem(key, JSON.stringify([...set])); }

let favSet = loadSet(LS_FAV);
let hideSet = loadSet(LS_HIDE);
function keyFor(it){ return (it.term || '').toLowerCase(); } // hide/fav by term across topics/levels

/* ===== Elements ===== */
const list = document.getElementById('list');
const btn = document.getElementById('btn');
const copyBtn = document.getElementById('copyBtn');
const exportFavBtn = document.getElementById('exportFavBtn');
const levelSlider = document.getElementById('level');
const levelText = document.getElementById('levelText');
const themeBtn = document.getElementById('themeToggle');
const ddRoot = document.getElementById('topicDropdown');
const anyLevel = document.getElementById('anyLevel');
const favoritesOnly = document.getElementById('favoritesOnly');
const resetHiddenBtn = document.getElementById('resetHidden');
const summary = document.getElementById('summary');
const batchSelect = document.getElementById('batch');

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
  const txt = anyLevel.checked ? 'All' : (LEVELS[val] || 'A1');
  levelSlider.setAttribute('aria-valuetext', txt);
  levelText.textContent = txt;
}
levelSlider.addEventListener('input', () => { updateSliderVisuals(); updateURL(); });
window.addEventListener('resize', updateSliderVisuals);

/* ===== Any level toggle ===== */
function syncAnyLevel() {
  const any = anyLevel.checked;
  localStorage.setItem(LS_ANY, any ? '1' : '0');
  levelSlider.disabled = any;
  updateSliderVisuals();
  updateURL();
  generate();
}
anyLevel.addEventListener('change', syncAnyLevel);

/* ===== Topic dropdown (with keyboard support) ===== */
const TopicDropdown = (() => {
  const state = { open: false, value: ddRoot?.dataset.default || localStorage.getItem('topic') || 'all' };

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dd-trigger';
  trigger.setAttribute('aria-haspopup','listbox');
  trigger.setAttribute('aria-expanded','false');
  const label = document.createElement('span');
  label.className = 'label';
  label.innerHTML = '<strong>Topic</strong>';
  const current = document.createElement('span');
  current.className = 'value';
  current.textContent = 'All topics';
  trigger.append(label, current, document.createElement('span'));
  trigger.lastChild.textContent = '▾';

  const menu = document.createElement('div');
  menu.className = 'dd-menu';
  menu.setAttribute('role','listbox');
  menu.setAttribute('tabindex','-1');

  const options = [{value: 'all', label: 'All topics', count: 0}, ...SOURCES.map(s => ({ value: s.topic, label: s.topic, count: 0 }))];

  function renderOptions() {
    menu.innerHTML = '';
    for (const opt of options) {
      const div = document.createElement('div');
      div.className = 'dd-option';
      div.setAttribute('role','option');
      div.setAttribute('tabindex','-1');
      div.dataset.value = opt.value;
      div.innerHTML = `<span>${opt.label}</span><span class="dd-count">${opt.count.toLocaleString()}</span>`;
      div.addEventListener('click', () => select(opt.value));
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { select(opt.value); e.preventDefault(); }
      });
      menu.appendChild(div);
    }
  }
  renderOptions();

  function setCounts() {
    // update counts from TOPIC_COUNTS
    const total = [...TOPIC_COUNTS.values()].reduce((a,b)=>a+b,0);
    const countMap = new Map([['all', total], ...TOPIC_COUNTS.entries()]);
    for (const el of menu.querySelectorAll('.dd-option')) {
      const v = el.dataset.value;
      const cnt = countMap.get(v) || 0;
      el.querySelector('.dd-count').textContent = cnt.toLocaleString();
    }
  }

  function open() {
    state.open = true;
    ddRoot.classList.add('open');
    trigger.setAttribute('aria-expanded','true');
    setTimeout(() => {
      menu.focus();
      // roving focus: focus selected or first
      const sel = menu.querySelector(`[data-value="${state.value}"]`) || menu.firstElementChild;
      sel?.focus();
    }, 0);
    document.addEventListener('click', onOutside, { once: true });
    document.addEventListener('keydown', onEsc, { once: true });
  }
  function close() {
    state.open = false;
    ddRoot.classList.remove('open');
    trigger.setAttribute('aria-expanded','false');
    trigger.focus();
  }
  function onOutside(e) { if (!ddRoot.contains(e.target)) close(); }
  function onEsc(e) { if (e.key === 'Escape') close(); }

  function select(value) {
    state.value = value;
    localStorage.setItem('topic', value);
    current.textContent = options.find(o => o.value === value)?.label || value;
    for (const el of menu.querySelectorAll('.dd-option')) {
      el.setAttribute('aria-selected', el.dataset.value === value ? 'true' : 'false');
    }
    updateURL();
    generate();
  }

  if (ddRoot) {
    trigger.addEventListener('click', () => state.open ? close() : open());
    ddRoot.append(trigger, menu);
    select(state.value); // initialize
  }

  // keyboard nav on menu
  menu.addEventListener('keydown', (e) => {
    const items = [...menu.querySelectorAll('.dd-option')];
    const idx = items.indexOf(document.activeElement);
    if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowDown') items[Math.min(items.length-1, idx+1)]?.focus();
    if (e.key === 'ArrowUp') items[Math.max(0, idx-1)]?.focus();
    if (e.key === 'Home') items[0]?.focus();
    if (e.key === 'End') items[items.length-1]?.focus();
  });

  return { value: () => state.value, setCounts };
})();

/* ===== Data loading (robust + de-dup) ===== */
async function loadJSON() {
  const map = new Map();
  TOPIC_COUNTS.clear();
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.path); // allow browser caching
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const arr = await res.json();
      let topicCount = 0;
      for (const raw of arr) {
        const term = String(raw.term || raw.word || '').trim();
        const type = String(raw.type || raw.pos || '').trim();
        const level = String(raw.level || '').trim();
        if (!term) continue;
        const normTerm = term.toLowerCase();
        const normType = type.toLowerCase();
        const normLevel = level.toUpperCase();
        // De-dup across topics (drop topic from key)
        const key = `${normTerm}|${normType}|${normLevel}`;
        if (!map.has(key)) {
          map.set(key, { term, type, level: normLevel, __topic: src.topic });
          topicCount++;
        } else {
          // if exists, still count for topic counts
          topicCount++;
        }
      }
      TOPIC_COUNTS.set(src.topic, topicCount);
    } catch (err) {
      console.warn('Failed to load', src.path, err);
    }
  }
  DATA = [...map.values()];
  TopicDropdown.setCounts?.();
}

/* ===== Helpers ===== */
function sampleUnique(arr, n) {
  const result = [];
  const used = new Set();
  const len = arr.length;
  if (n >= len) return [...arr];
  while (result.length < n) {
    const i = Math.floor(Math.random() * len);
    if (!used.has(i)) { used.add(i); result.push(arr[i]); }
  }
  return result;
}
function dictLinks(q){
  const url = encodeURIComponent(q);
  return [
    `<a href="https://dictionary.cambridge.org/dictionary/english/${url}" target="_blank" rel="noopener">Cambridge ↗</a>`,
    `<a href="https://www.oxfordlearnersdictionaries.com/definition/english/${url}" target="_blank" rel="noopener">Oxford ↗</a>`
  ].join(' · ');
}
function updateURL(){
  const params = new URLSearchParams(location.search);
  params.set('topic', TopicDropdown.value());
  params.set('lv', String(levelSlider.value));
  params.set('any', anyLevel.checked ? '1' : '0');
  params.set('fav', favoritesOnly.checked ? '1' : '0');
  params.set('n', String(batchSelect.value));
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}
function readURL(){
  const params = new URLSearchParams(location.search);
  const topic = params.get('topic');
  const lv = params.get('lv');
  const any = params.get('any');
  const fav = params.get('fav');
  const n = params.get('n');
  if (topic) localStorage.setItem('topic', topic);
  if (lv !== null) localStorage.setItem(LS_LEVEL_INDEX, lv);
  if (any !== null) localStorage.setItem(LS_ANY, any);
  if (fav !== null) localStorage.setItem(LS_FAV_ONLY, fav);
  if (n !== null) localStorage.setItem(LS_BATCH, n);
}

/* ===== Rendering ===== */
function speak(text){
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  } catch {}
}
function render(items) {
  list.innerHTML = '';
  list.setAttribute('aria-busy','false');

  if (!items || items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `
      <div>No words found for this selection.</div>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn" id="clearFavOnly">Turn off Favorites only</button>
        <button class="btn" id="useAllLevels">Use All levels</button>
      </div>
    `;
    list.appendChild(empty);
    empty.querySelector('#clearFavOnly')?.addEventListener('click', () => { favoritesOnly.checked = false; localStorage.setItem(LS_FAV_ONLY,'0'); generate(); });
    empty.querySelector('#useAllLevels')?.addEventListener('click', () => { anyLevel.checked = true; syncAnyLevel(); });
    return;
  }
  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;

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
      if (favSet.has(k)) { favSet.delete(k); favBtn.classList.remove('active'); favBtn.textContent = '☆'; }
      else { favSet.add(k); favBtn.classList.add('active'); favBtn.textContent = '★'; }
      saveSet(LS_FAV, favSet);
    });

    const hideBtn = document.createElement('button');
    hideBtn.className = 'icon-btn';
    hideBtn.title = 'Hide';
    hideBtn.setAttribute('aria-label','Hide');
    hideBtn.textContent = '🚫';
    hideBtn.addEventListener('click', () => {
      hideSet.add(k); saveSet(LS_HIDE, hideSet); generate();
    });

    const speakBtn = document.createElement('button');
    speakBtn.className = 'icon-btn';
    speakBtn.title = 'Pronounce';
    speakBtn.setAttribute('aria-label','Pronounce');
    speakBtn.textContent = '🔊';
    speakBtn.addEventListener('click', () => speak(it.term));

    actions.append(favBtn, hideBtn, speakBtn);

    t.append(left, actions);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = dictLinks(it.term) + ` · <span aria-label="Topic">Topic: ${it.__topic}</span>`;

    card.append(t, meta);
    card.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'f') { favBtn.click(); e.preventDefault(); }
      if (e.key.toLowerCase() === 'h') { hideBtn.click(); e.preventDefault(); }
      if (e.key.toLowerCase() === 's') { speakBtn.click(); e.preventDefault(); }
    });

    list.appendChild(card);
  }
}

/* ===== Generate ===== */
async function generate() {
  list.setAttribute('aria-busy', 'true');
  const batchN = Math.max(1, parseInt(batchSelect.value || '5', 10));

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

  // Update summary
  const totalMatches = pool.length;
  summary.textContent = `Picking ${batchN} from ${totalMatches.toLocaleString()} words (topic: ${selectedTopic === 'all' ? 'All' : selectedTopic}, level: ${any ? 'All' : level}, hidden excluded, favorites only: ${favoritesOnly.checked ? 'on' : 'off'})`;

  const pick = sampleUnique(pool, Math.min(batchN, pool.length || 0));
  if (pick.length === 0) {
    render([]);
  } else {
    render(pick);
  }
}

/* ===== Copy / Export / Reset ===== */
copyBtn?.addEventListener('click', () => {
  const terms = [...document.querySelectorAll('.card .term > span:first-child')].map(el => el.firstChild?.textContent?.trim()).filter(Boolean);
  if (terms.length === 0) return;
  const text = terms.join('\n');
  navigator.clipboard.writeText(text).catch(()=>{});
  copyBtn.textContent = '✅ Copied';
  setTimeout(()=> copyBtn.textContent = '📋 Copy set', 1200);
});

exportFavBtn?.addEventListener('click', () => {
  const favs = DATA.filter(x => favSet.has(keyFor(x)));
  if (favs.length === 0) return;
  const rows = [['term','type','level','topic'], ...favs.map(x => [x.term, x.type || '', x.level || '', x.__topic || ''])];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'favorites.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

resetHiddenBtn?.addEventListener('click', () => {
  hideSet = new Set();
  saveSet(LS_HIDE, hideSet);
  generate();
});

/* ===== State init & events ===== */
(function init(){
  readURL(); // allow state from URL
  const savedLevel = localStorage.getItem(LS_LEVEL_INDEX);
  if (savedLevel !== null) levelSlider.value = String(Math.max(0, Math.min(5, Number(savedLevel))));
  const savedAny = localStorage.getItem(LS_ANY);
  if (savedAny !== null) anyLevel.checked = savedAny === '1';
  const savedFavOnly = localStorage.getItem(LS_FAV_ONLY);
  if (savedFavOnly !== null && favoritesOnly) favoritesOnly.checked = savedFavOnly === '1';
  const savedBatch = localStorage.getItem(LS_BATCH);
  if (savedBatch !== null) batchSelect.value = String(Math.max(1, Math.min(10, Number(savedBatch))));

  levelSlider.addEventListener('change', () => { localStorage.setItem(LS_LEVEL_INDEX, String(levelSlider.value)); generate(); });
  favoritesOnly?.addEventListener('change', () => { localStorage.setItem(LS_FAV_ONLY, favoritesOnly.checked ? '1' : '0'); generate(); });
  batchSelect?.addEventListener('change', () => { localStorage.setItem(LS_BATCH, String(batchSelect.value)); updateURL(); generate(); });

  // keyboard shortcut: space/enter triggers generate when focus on body
  document.addEventListener('keydown', (e) => {
    if (['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)) return;
    if (e.key === ' ' || e.key === 'Enter') { btn.click(); e.preventDefault(); }
  });

  updateSliderVisuals();
  syncAnyLevel();
  generate(); // auto-generate on load
})();

btn.addEventListener('click', generate);
