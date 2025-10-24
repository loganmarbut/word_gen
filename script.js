'use strict';

// === CONFIG ===
const SOURCES = [
  { path: "Opinion%20and%20argument.json", topic: "Opinion & Argument" },
  { path: "Doubt,%20guessing%20and%20certainty.json", topic: "Doubt, guessing and certainty" },
  { path: "Discussion%20and%20agreement.json", topic: "Discussion and agreement" },
];
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

let DATA = [];

// === ELEMENTS ===
const list = document.getElementById('list');
const btn = document.getElementById('btn');
const levelSlider = document.getElementById('level');
const themeBtn = document.getElementById('themeToggle');
const ddRoot = document.getElementById('topicDropdown');
const anyLevel = document.getElementById('anyLevel');

// === THEME ===
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

// === SLIDER VISUALS ===
function updateSliderVisuals() {
  const min = Number(levelSlider.min);
  const max = Number(levelSlider.max);
  const val = Number(levelSlider.value);
  const pct = ((val - min) / (max - min)) * 100;
  levelSlider.style.setProperty('--fill', pct + '%');
  const any = anyLevel?.checked;
  levelSlider.setAttribute('aria-valuetext', any ? 'All levels' : LEVELS[val]);
}
levelSlider.addEventListener('input', updateSliderVisuals);
window.addEventListener('resize', updateSliderVisuals);

// === ANY-LEVEL TOGGLE ===
function syncAnyLevel() {
  const any = anyLevel?.checked;
  levelSlider.disabled = !!any;
  updateSliderVisuals();
}
anyLevel?.addEventListener('change', syncAnyLevel);
syncAnyLevel(); // on load

// === TOPIC DROPDOWN (minimal) ===
const TopicDropdown = (() => {
  const state = { value: ddRoot?.dataset.default || 'all', open: false };
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dd-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.textContent = 'All topics';
  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '▾';
  trigger.append(label, chev);

  const menu = document.createElement('ul');
  menu.className = 'dd-menu';
  menu.setAttribute('role', 'listbox');
  menu.tabIndex = -1;

  const options = [{value:'all', label:'All topics'}, ...SOURCES.map(s => ({value:s.topic, label:s.topic}))];

  function setValue(v) {
    state.value = v;
    label.textContent = options.find(o => o.value === v)?.label || 'All topics';
    setOpen(false);
  }
  function setOpen(v) {
    state.open = v;
    ddRoot.classList.toggle('open', v);
    trigger.setAttribute('aria-expanded', String(v));
    if (v) {
      menu.focus();
    }
  }
  trigger.addEventListener('click', () => setOpen(!state.open));
  document.addEventListener('mousedown', (e) => {
    if (state.open && !ddRoot.contains(e.target)) setOpen(false);
  });

  options.forEach(o => {
    const li = document.createElement('li');
    li.className = 'dd-option';
    li.setAttribute('role','option');
    li.dataset.value = o.value;
    li.textContent = o.label;
    li.addEventListener('click', () => setValue(o.value));
    menu.appendChild(li);
  });

  ddRoot?.append(trigger, menu);
  setValue(state.value);
  return { value: () => state.value };
})();

// === DATA LOADING ===
async function loadJSON() {
  const map = new Map();
  for (const src of SOURCES) {
    const res = await fetch(src.path, { cache: 'no-store' });
    const arr = await res.json();
    for (const raw of arr) {
      const term = String(raw.term || raw.word || '').trim();
      const type = String(raw.type || raw.pos || '').trim();
      const level = String(raw.level || '').trim();
      if (!term) continue;
      const item = { term, type, level, __topic: src.topic };
      const key = `${item.term}|${item.type}|${item.level}|${item.__topic}`;
      if (!map.has(key)) map.set(key, item);
    }
  }
  DATA = [...map.values()];
}

// === HELPERS ===
function sampleUnique(a, n) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}
function dictionaryUrl(term) {
  const base = "https://dictionary.cambridge.org/dictionary/english/";
  const cleaned = term.replace(/\s+/g,'-').replace(/[^\w\-']/g,'');
  return base + encodeURIComponent(cleaned);
}

// === RENDER ===
function render(items) {
  list.innerHTML = '';
  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('div');
    title.className = 'term';
    title.textContent = it.term;
    const badges = document.createElement('span');
    badges.className = 'badges';
    if (it.type) {
      const b1 = document.createElement('span');
      b1.className = 'badge';
      b1.textContent = it.type;
      badges.appendChild(b1);
    }
    if (it.level) {
      const b2 = document.createElement('span');
      b2.className = 'badge';
      b2.textContent = it.level;
      badges.appendChild(b2);
    }
    title.appendChild(badges);
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const link = document.createElement('a');
    link.href = dictionaryUrl(it.term);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'dictionary ↗';
    meta.appendChild(link);

    const link2 = document.createElement('a');
    link2.href = dikiUrl(it.term);
    link2.target = '_blank';
    link2.rel = 'noopener noreferrer';
    link2.textContent = 'diki.pl ↗';
    meta.appendChild(link2);

    card.appendChild(meta);

    list.appendChild(card);
  }
}

// === GENERATE ===
async function generate() {
  list.setAttribute('aria-busy', 'true');
  if (DATA.length === 0) {
    await loadJSON();
  }
  const selectedTopic = TopicDropdown.value();
  const any = anyLevel?.checked;
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Number(levelSlider.value) || 0))];

  let pool = DATA;
  if (selectedTopic !== 'all') {
    pool = pool.filter(x => x.__topic === selectedTopic);
  }
  if (!any) {
    pool = pool.filter(x => x.level === level);
  }

  const result = sampleUnique(pool, Math.min(5, pool.length || 0));
  if (result.length === 0) {
    const alt = DATA.filter(x => selectedTopic === 'all' ? true : x.__topic === selectedTopic);
    render(sampleUnique(alt, Math.min(5, alt.length)));
  } else {
    render(result);
  }
  list.setAttribute('aria-busy', 'false');
}

btn.addEventListener('click', generate);
updateSliderVisuals();

function dikiUrl(term) {
  const base = "https://www.diki.pl/slownik-angielskiego?q=";
  return base + encodeURIComponent(term);
}
