
'use strict';

const LEVELS = ['A1','A2','B1','B2','C1','C2'];
const SOURCES = [
  { path: 'Opinion%20and%20argument.json', topic: 'Opinion & Argument' },
  { path: 'Doubt,%20guessing%20and%20certainty.json', topic: 'Doubt, guessing and certainty' },
  { path: 'Discussion%20and%20agreement.json', topic: 'Discussion and agreement' },
];

const list = document.getElementById('list');
const level = document.getElementById('level');
const levelWrap = document.getElementById('levelWrap');
const topicSel = document.getElementById('topic');
const genBtn = document.getElementById('btn');
const themeBtn = document.getElementById('themeToggle');
const shireBtn = document.getElementById('shireToggle');

let DATA = [];

// -------- slider progress fill
function updateProgress(){
  const pct = ( (Number(level.value)||0) / (LEVELS.length-1) ) * 100;
  levelWrap.style.setProperty('--progress', pct + '%');
}
level.addEventListener('input', updateProgress);
updateProgress();

// -------- load data
async function loadAll(){
  const results = [];
  for (const s of SOURCES){
    try{
      const res = await fetch(s.path);
      if (!res.ok) throw new Error(res.statusText);
      const arr = await res.json();
      arr.forEach(it => results.push({ ...it, topic: s.topic }));
    }catch(e){
      // ignore missing files
      console.warn('Failed to load', s.path, e.message);
    }
  }
  DATA = results;
}
loadAll();

// -------- render
function dictionaryUrl(term){
  const q = encodeURIComponent(term.trim());
  return `https://www.oxfordlearnersdictionaries.com/definition/english/${q}`;
}
function currentLevel(){
  const idx = Math.max(0, Math.min(LEVELS.length-1, Number(level.value)||0));
  return LEVELS[idx];
}
function pick(arr, n){
  const out = [];
  const copy = arr.slice();
  while (out.length < n && copy.length){
    const i = Math.floor(Math.random()*copy.length);
    out.push(copy.splice(i,1)[0]);
  }
  return out;
}
function render(items){
  list.innerHTML = '';
  items.forEach(it => {
    const card = document.createElement('article');
    card.className = 'card';
    const h = document.createElement('h3');
    h.textContent = it.term || it.word || it.phrase || '—';
    const badges = document.createElement('span');
    badges.className = 'badges';
    if (it.type){
      const b1 = document.createElement('span');
      b1.className = 'badge'; b1.textContent = it.type;
      h.appendChild(b1);
    }
    if (it.level){
      const b2 = document.createElement('span');
      b2.className = 'badge'; b2.textContent = it.level;
      h.appendChild(b2);
    }
    card.appendChild(h);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const a = document.createElement('a');
    a.href = dictionaryUrl(it.term || it.word || it.phrase || '');
    a.target = '_blank'; a.rel='noopener';
    a.textContent = 'Oxford ↗';
    meta.appendChild(a);
    card.appendChild(meta);
    list.appendChild(card);
  });
}

// -------- generate click
genBtn.addEventListener('click', () => {
  const lvl = currentLevel();
  const topic = topicSel.value;
  let pool = DATA;
  if (topic !== 'all') pool = pool.filter(x => x.topic === topic);
  pool = pool.filter(x => (x.level||'').toUpperCase() === lvl);
  if (pool.length === 0){
    list.innerHTML = '<p class="meta">No items for this filter yet. Try another level/topic.</p>';
    return;
  }
  render(pick(pool, 5));
});

// -------- theme toggles
(function initTheme(){
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  themeBtn.textContent = saved === 'dark' ? '🌙 Dark' : '☀️ Light';
})();
themeBtn.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem('theme', cur);
  themeBtn.textContent = cur === 'dark' ? '🌙 Dark' : '☀️ Light';
});
(function initShire(){
  const on = localStorage.getItem('shire') === '1';
  document.documentElement.classList.toggle('shire', on);
})();
shireBtn.addEventListener('click', () => {
  const on = !document.documentElement.classList.contains('shire');
  document.documentElement.classList.toggle('shire', on);
  localStorage.setItem('shire', on ? '1':'0');
});
