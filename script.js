'use strict';

// === CONFIG ===
const JSON_PATH = "Opinion%20and%20argument.json"; // same folder as index.html
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

// Optional: map overrides for definitions if your JSON doesn't include them yet.
const definitionsOverride = {};

let DATA = [];
const list = document.getElementById('list');
const btn = document.getElementById('btn');
const levelSlider = document.getElementById('level');
const themeBtn = document.getElementById('themeToggle');

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
themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ---- Data + render ----
async function loadJSON() {
  if (DATA.length) return DATA;
  try {
    const res = await fetch(JSON_PATH, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Expected an array of entries in the JSON file.');
    DATA = json;
  } catch (err) {
    console.error('Failed to load JSON:', err);
  }
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

    const defText = (item.definition && String(item.definition).trim()) || definitionsOverride[item.term];
    const def = document.createElement('div');
    def.className = 'def';
    if (defText) {
      def.textContent = defText;
    } else {
      def.innerHTML = `<span class="no-def">No definition provided in JSON.</span>`;
    }
    card.appendChild(def);

    if (!defText && item.term) {
      const more = document.createElement('div');
      more.className = 'more';
      more.innerHTML = `Look it up: <a target="_blank" rel="noopener" href="${dictionaryUrl(item.term)}">${item.term}</a>`;
      card.appendChild(more);
    }

    list.appendChild(card);
  }
}

function currentLevel() {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, Number(levelSlider.value) || 0));
  return LEVELS[idx];
}

async function generate() {
  list.setAttribute('aria-busy', 'true');
  await loadJSON();
  if (!DATA.length) { list.removeAttribute('aria-busy'); return; }
  const selected = currentLevel();
  let pool = DATA.filter(x => String(x.level || '').toUpperCase() === selected);
  // If not enough items at this level, just use whatever exists at that level (could be <5)
  const five = sampleUnique(pool, Math.min(5, pool.length || 0));
  // If none at the selected level, fall back to all
  if (five.length === 0) {
    pool = DATA;
    render(sampleUnique(pool, Math.min(5, pool.length)));
  } else {
    render(five);
  }
  list.setAttribute('aria-busy', 'false');
}

btn.addEventListener('click', generate);
