'use strict';

// === CONFIG ===
// If your file name has spaces, keep it URL-encoded like below.
// You can also rename the file to `opinion-and-argument.json` and change the path here.
const JSON_PATH = "Opinion%20and%20argument.json"; // same folder as index.html

// Optional: map overrides for definitions if your JSON doesn't include them yet.
// Example: definitionsOverride["opinion"] = "a view or judgement not necessarily based on fact";
const definitionsOverride = {};

let DATA = [];
const list = document.getElementById('list');
const footer = document.getElementById('footer');
const btn = document.getElementById('btn');

async function loadJSON() {
  if (DATA.length) return DATA;
  try {
    const res = await fetch(JSON_PATH, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Expected an array of entries in the JSON file.');
    DATA = json;
    footer.textContent = `Loaded ${DATA.length} entries.`;
  } catch (err) {
    footer.innerHTML = `<span class="error">Failed to load JSON from <code>${JSON_PATH}</code>: ${err.message}</span>`;
  }
  return DATA;
}

function sampleUnique(arr, n) {
  const copy = arr.slice();
  // Fisher–Yates shuffle (partial)
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function dictionaryUrl(term) {
  const t = encodeURIComponent(term.replaceAll('…', ''));
  // You can change to your preferred dictionary site
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
      const b = document.createElement('span');
      b.className = 'badge'; b.textContent = item.type; badges.appendChild(b);
    }
    if (item.level) {
      const b = document.createElement('span');
      b.className = 'badge'; b.textContent = item.level; badges.appendChild(b);
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

    if (!defText) {
      const more = document.createElement('div');
      more.className = 'more';
      more.innerHTML = `Look it up: <a target="_blank" rel="noopener" href="${dictionaryUrl(item.term)}">${item.term}</a>`;
      card.appendChild(more);
    }

    list.appendChild(card);
  }
}

async function generate() {
  list.setAttribute('aria-busy', 'true');
  await loadJSON();
  if (!DATA.length) return; // error already shown
  const five = sampleUnique(DATA, Math.min(5, DATA.length));
  render(five);
  list.setAttribute('aria-busy', 'false');
}

btn.addEventListener('click', generate);

// Load upfront so the first click is instant (optional)
loadJSON();
