'use strict';

// === CONFIG ===
const SOURCES = [
  { path: "Opinion%20and%20argument.json", topic: "Opinion & Argument" },
  { path: "Doubt,%20guessing%20and%20certainty.json", topic: "Doubt, guessing and certainty" },
  { path: "Discussion%20and%20agreement.json", topic: "Discussion and agreement" },
];
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

let DATA = [];
const list = document.getElementById('list');
const btn = document.getElementById('btn');
const levelSlider = document.getElementById('level');
const themeBtn = document.getElementById('themeToggle');
const levelTick = document.getElementById('levelTick');
const ddRoot = document.getElementById('topicDropdown');

// ---- Theme handling ----
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}
(function initTheme(){
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
})();
themeBtn?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ---- Slider tick alignment ----
function updateTick(){
  const min = Number(levelSlider.min), max = Number(levelSlider.max);
  const val = Number(levelSlider.value);
  const pct = (val - min) / (max - min);
  levelTick.style.left = `${pct * 100}%`;
}
levelSlider.addEventListener('input', updateTick);
window.addEventListener('resize', updateTick);
updateTick();

// ---- Custom dropdown (Topic) ----
const TopicDropdown = (() => {
  const state = { open: false, value: ddRoot?.dataset.default || 'all' };
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dd-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const label = document.createElement('span');
  label.textContent = 'All topics';
  const chev = document.createElementNS('http://www.w3.org/2000/svg','svg');
  chev.setAttribute('class','chev');
  chev.setAttribute('width','16'); chev.setAttribute('height','16'); chev.setAttribute('viewBox','0 0 24 24');
  chev.innerHTML = "<path d='M7 10l5 5 5-5' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>";
  trigger.append(label, chev);

  const menu = document.createElement('ul');
  menu.className = 'dd-menu';
  menu.setAttribute('role','listbox');
  menu.tabIndex = -1;

  function setOpen(v){
    state.open = v;
    ddRoot.classList.toggle('open', v);
    trigger.setAttribute('aria-expanded', String(v));
    if (v) {
      menu.style.minWidth = trigger.offsetWidth + 'px';
      menu.focus();
    }
  }
  function setValue(val, text){
    state.value = val;
    label.textContent = text;
    Array.from(menu.children).forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === val)));
    setOpen(false);
  }
  function buildOptions(){
    const topics = ['all', ...Array.from(new Set(SOURCES.map(s => s.topic)))];
    menu.innerHTML = '';
    topics.forEach(t => {
      const li = document.createElement('li');
      li.className = 'dd-option';
      li.setAttribute('role','option');
      li.dataset.value = t;
      li.textContent = t === 'all' ? 'All topics' : t;
      li.setAttribute('aria-selected', String(t === state.value));
      li.addEventListener('click', () => setValue(t, li.textContent));
      menu.appendChild(li);
    });
  }
  trigger.addEventListener('click', () => setOpen(!state.open));
  document.addEventListener('click', (e) => {
    if (!ddRoot.contains(e.target)) setOpen(false);
  });
  ddRoot.append(trigger, menu);
  buildOptions();
  setValue(state.value, 'All topics');
  return { get value(){ return state.value; } };
})();

// ---- Data + render ----
async function loadJSON() {
  if (DATA.length) return DATA;
  const results = await Promise.all(SOURCES.map(async ({path, topic}) => {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error(`Expected an array in ${path}`);
      return json.map(x => ({...x, __topic: topic}));
    } catch (err) {
      console.error('Failed to load', path, err);
      return [];
    }
  }));
  const merged = results.flat();
  const map = new Map();
  for (const item of merged) {
    if (!item || !item.term) continue;
    const key = [item.term, item.type || '', item.level || '', item.__topic || ''].join('|').toLowerCase();
    if (!map.has(key)) map.set(key, item);
  }
  DATA = Array.from(map.values());
  return DATA;
}

function sampleUnique(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function dictionaryUrl(term) {
  const t = encodeURIComponent(String(term || '').replaceAll('…', ''));
  return `https://dictionary.cambridge.org/dictionary/english/${t}`;
}

function render(items) {
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
      b2.textContent = item.level;
      badges.appendChild(b2);
    }
    title.appendChild(badges);
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const link = document.createElement('a');
    link.href = dictionaryUrl(item.term);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "dictionary ↗";
    meta.appendChild(link);
    card.appendChild(meta);

    list.appendChild(card);
  }
}

function currentLevel() {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, Number(levelSlider.value) || 0));
  return LEVELS[idx];
}

function currentTopic() {
  return ddRoot ? ddRoot.querySelector('.dd-option[aria-selected="true"]').dataset.value : 'all';
}

async function generate() {
  list.setAttribute('aria-busy', 'true');
  await loadJSON();
  if (!DATA.length) { list.removeAttribute('aria-busy'); return; }
  const selectedLevel = currentLevel();
  const selectedTopic = currentTopic();
  let pool = DATA.filter(x => String(x.level || '').toUpperCase() === selectedLevel);
  if (selectedTopic !== 'all') {
    pool = pool.filter(x => x.__topic === selectedTopic);
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

btn.addEventListener('click', generate);
