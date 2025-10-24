'use strict';

// Data
const SOURCES=[
  { path:"Opinion%20and%20argument.json", topic:"Opinion & Argument" },
  { path:"Doubt,%20guessing%20and%20certainty.json", topic:"Doubt, guessing and certainty" },
  { path:"Discussion%20and%20agreement.json", topic:"Discussion and agreement" },
];
const LEVELS=["A1","A2","B1","B2","C1","C2"];
let DATA=[];

// Elements
const list=document.getElementById('list');
const btn=document.getElementById('btn');
const levelSlider=document.getElementById('level');
const themeBtn=document.getElementById('themeToggle');
const ddRoot=document.getElementById('topicDropdown');
const anyLevel=document.getElementById('anyLevel');

// Theme
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  localStorage.setItem('theme',theme);
  themeBtn.textContent=theme==='dark'?'☀️ Light':'🌙 Dark';
}
applyTheme(localStorage.getItem('theme')||'dark');
themeBtn.addEventListener('click',()=>applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'));

// Slider visuals
function updateSliderVisuals(){
  const min=+levelSlider.min, max=+levelSlider.max, val=+levelSlider.value;
  const pct=((val-min)/(max-min))*100;
  levelSlider.style.setProperty('--fill', pct+'%');
  levelSlider.setAttribute('aria-valuetext', anyLevel.checked ? 'All levels' : (LEVELS[val]||'A1'));
}
levelSlider.addEventListener('input', updateSliderVisuals);
window.addEventListener('resize', updateSliderVisuals);

// Any level toggle
function syncAny(){
  const any=anyLevel.checked;
  levelSlider.disabled=any;
  updateSliderVisuals();
}
anyLevel.addEventListener('change', syncAny);
syncAny();

// Dropdown
const TopicDropdown=(()=>{
  const state={value:ddRoot?.dataset.default||'all',open:false};
  const trigger=document.createElement('button'); trigger.type='button'; trigger.className='dd-trigger';
  const label=document.createElement('span'); label.textContent='All topics';
  const chev=document.createElement('span'); chev.textContent='▾';
  trigger.append(label,chev);
  const menu=document.createElement('ul'); menu.className='dd-menu'; menu.setAttribute('role','listbox');
  const options=[{value:'all',label:'All topics'}, ...SOURCES.map(s=>({value:s.topic,label:s.topic}))];
  options.forEach(o=>{ const li=document.createElement('li'); li.className='dd-option'; li.textContent=o.label; li.dataset.value=o.value; li.addEventListener('click',()=>{ state.value=o.value; label.textContent=o.label; ddRoot.classList.remove('open'); }); menu.append(li); });
  trigger.addEventListener('click',()=>ddRoot.classList.toggle('open'));
  ddRoot.append(trigger,menu);
  label.textContent=options.find(o=>o.value===state.value)?.label||'All topics';
  return { value:()=>state.value };
})();

// Data loading
async function loadJSON(){
  const map=new Map();
  for(const src of SOURCES){
    const res=await fetch(src.path,{cache:'no-store'});
    const arr=await res.json();
    for(const r of arr){
      const term=String(r.term||r.word||'').trim();
      const type=String(r.type||r.pos||'').trim();
      const level=String(r.level||'').trim();
      if(!term) continue;
      const item={term,type,level,__topic:src.topic};
      const key=`${item.term}|${item.type}|${item.level}|${item.__topic}`;
      if(!map.has(key)) map.set(key,item);
    }
  }
  DATA=[...map.values()];
}

// Helpers
function sampleUnique(a,n){ const arr=a.slice(); for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr.slice(0,n); }
function cambridgeUrl(term){ const base="https://dictionary.cambridge.org/dictionary/english/"; const cleaned=term.replace(/\s+/g,'-').replace(/[^\w\-']/g,''); return base+encodeURIComponent(cleaned); }
function dikiUrl(term){ return "https://www.diki.pl/slownik-angielskiego?q="+encodeURIComponent(term); }

// Render
function render(items){
  list.innerHTML='';
  for(const it of items){
    const card=document.createElement('div'); card.className='card';
    const t=document.createElement('div'); t.className='term'; t.textContent=it.term;
    const badges=document.createElement('span'); badges.className='badges';
    if(it.type){ const b=document.createElement('span'); b.className='badge'; b.textContent=it.type; badges.append(b); }
    if(it.level){ const b=document.createElement('span'); b.className='badge'; b.textContent=it.level; badges.append(b); }
    t.append(badges); card.append(t);
    const m=document.createElement('div'); m.className='meta';
    const a1=document.createElement('a'); a1.href=cambridgeUrl(it.term); a1.target='_blank'; a1.rel='noopener noreferrer'; a1.textContent='dictionary ↗';
    const a2=document.createElement('a'); a2.href=dikiUrl(it.term); a2.target='_blank'; a2.rel='noopener noreferrer'; a2.textContent='diki.pl ↗';
    m.append(a1,a2); card.append(m); list.append(card);
  }
}

// Generate
async function generate(){
  list.setAttribute('aria-busy','true');
  if(DATA.length===0) await loadJSON();
  const topic=TopicDropdown.value();
  const any=anyLevel.checked;
  const level=LEVELS[+levelSlider.value]||'A1';
  let pool=DATA;
  if(topic!=='all') pool=pool.filter(x=>x.__topic===topic);
  if(!any) pool=pool.filter(x=>x.level===level);
  const out=sampleUnique(pool, Math.min(5, pool.length||0));
  if(out.length===0){
    const alt=DATA.filter(x=>topic==='all'?true:x.__topic===topic);
    render(sampleUnique(alt, Math.min(5, alt.length)));
  } else render(out);
  list.setAttribute('aria-busy','false');
}
btn.addEventListener('click', generate);

// init
updateSliderVisuals();
