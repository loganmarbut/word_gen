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
const ddRoot = document.getElementById('topicDropdown');
const anyLevel = document.getElementById('anyLevel');

// ---- Theme ----
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

// ---- Slider fill & accessibility ----
function updateSliderVisuals() {
  const min = +levelSlider.min, max = +levelSlider.max, val = +levelSlider.value;
  const pct = ((val - min) / (max - min)) * 100;
  levelSlider.style.setProperty('--fill', pct + '%');
  levelSlider.setAttribute('aria-valuetext', anyLevel?.checked ? 'All levels' : LEVELS[val]);
}
levelSlider.addEventListener('input', updateSliderVisuals);
window.addEventListener('resize', updateSliderVisuals);
updateSliderVisuals();

function syncAnyLevel() {
  const any = anyLevel?.checked;
  if (levelSlider) levelSlider.disabled = !!any;
  updateSliderVisuals();
}
anyLevel?.addEventListener('change', syncAnyLevel);
syncAnyLevel();

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
  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '▾';
  trigger.append(label, chev);

  const menu = document.createElement('ul');
  menu.className = 'dd-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('tabindex', '-1');

  const options = [{value:'all', label:'All topics'}, ...SOURCES.map(s => ({value:s.topic, label:s.topic}))];
  let highlightIndex = 0;

  function renderOptions() {
    menu.innerHTML = '';
    options.forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = 'dd-option';
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', opt.value);
      li.textContent = opt.label;
      li.setAttribute('aria-selected', opt.value === state.value ? 'true' : 'false');
      li.addEventListener('click', () => selectValue(opt.value));
      li.addEventListener('mousemove', () => { highlightIndex = i; });
      menu.appendChild(li);
    });
  }

  function open() {
    state.open = true;
    ddRoot.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    renderOptions();
    // move highlight to current value
    highlightIndex = Math.max(0, options.findIndex(o => o.value === state.value));
    setTimeout(() => menu.focus(), 0);
    document.addEventListener('mousedown', onOutside, { once: true });
  }
  function close() {
    state.open = false;
    ddRoot.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }
  function onOutside(e) {
    if (!ddRoot.contains(e.target)) close();
  }
  function selectValue(val) {
    state.value = val;
    label.textContent = options.find(o => o.value === val)?.label || 'All topics';
    close();
  }

  trigger.addEventListener('click', () => state.open ? close() : open());
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); open();
    }
  });

  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); highlightIndex = Math.min(options.length-1, highlightIndex+1); focusItem(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); highlightIndex = Math.max(0, highlightIndex-1); focusItem(); }
    if (e.key === 'Enter')     { e.preventDefault(); const opt = options[highlightIndex]; if (opt) selectValue(opt.value); }
    if (e.key === 'Home')      { e.preventDefault(); highlightIndex = 0; focusItem(); }
    if (e.key === 'End')       { e.preventDefault(); highlightIndex = options.length-1; focusItem(); }
  });
  function focusItem() {
    const els = [...menu.querySelectorAll('.dd-option')];
    els[highlightIndex]?.focus?.(); // not tabbable but safe
  }

  // initial DOM
  ddRoot?.appendChild(trigger);
  ddRoot?.appendChild(menu);
  // initialize label
  label.textContent = options.find(o => o.value === state.value)?.label || 'All topics';

  return { value: () => state.value };
})();

// ---- Data loading ----
async function loadJSON() {
  const map = new Map();
  for (const src of SOURCES) {
    const res = await fetch(src.path, { cache: 'no-store' });
    const arr = await res.json();
    for (const item of arr) {
      const term = String(item.term || item.word || '').trim();
      const type = String(item.type || item.pos || '').trim();
      const level = String(item.level || '').trim();
      if (!term || !type || !level) continue;
      const normalized = { term, type, level, __topic: src.topic };
      const key = `${normalized.term}|${normalized.type}|${normalized.level}|${normalized.__topic}`;
      if (!map.has(key)) map.set(key, normalized);
    }
  }
  DATA = [...map.values()];
}

// ---- Helpers ----
function sampleUnique(list, n) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
function dictionaryUrl(term, type) {
  const base = "https://dictionary.cambridge.org/dictionary/english/";
  const cleaned = term.replace(/\s+/g,'-').replace(/[^\w\-']/g,'');
  return base + encodeURIComponent(cleaned);
}

// ---- Render ----
function render(items) {
  list.innerHTML = '';
  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'card';

    const h = document.createElement('div');
    h.className = 'term';
    h.textContent = it.term;

    const badges = document.createElement('span');
    badges.className = 'badges';
    const bType = document.createElement('span');
    bType.className = 'badge';
    bType.textContent = it.type;
    const bLvl = document.createElement('span');
    bLvl.className = 'badge';
    bLvl.textContent = it.level;
    badges.append(bType, bLvl);
    h.appendChild(badges);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const a = document.createElement('a');
    a.href = dictionaryUrl(it.term, it.type);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'dictionary ↗';

    meta.appendChild(a);

    card.append(h, meta);
    list.appendChild(card);
  }
}

// ---- Generate ----
async function generate() {
  list.setAttribute('aria-busy', 'true');

  if (DATA.length === 0) {
    await loadJSON();
  }

  const selectedTopic = TopicDropdown.value();
  const any = anyLevel?.checked;
  const level = LEVELS[+levelSlider.value];

  let pool = DATA;
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

btn.addEventListener('click', generate);
