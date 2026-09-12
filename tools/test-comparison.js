/* test-comparison.js — v4.5.13.
 * Two claims: the chosen years survive a reload, and tapping a number swaps
 * days for share-of-days-elapsed. Both are asserted against the RENDERED card
 * and against a real second build of it, not against the source.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
/* boot() builds a WHOLE new page from the same localStorage. That is what a
   refresh is, and it is the only way to prove the years were persisted rather
   than merely held in a variable -- no test-only reset hook in product code. */
let store={};
function boot(){
  const d=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const win=d.window,c=d.getInternalVMContext();win.fetch=()=>Promise.reject(Error('offline'));
  win.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  win.scrollTo=()=>{};win.navigator.vibrate=()=>{};
  win.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
  Object.defineProperty(win,'localStorage',{configurable:true,value:{
    getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,
    setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];},clear(){store={};}}});
  for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
    vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),c,{filename:m[1]});
  return s=>vm.runInContext(s,c);
}
let run=boot();let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};

/* A ledger across four years, with a KNOWN count in each so the percentage has a
   checkable answer: every year gets a training day on the 1st and 15th of each
   month up to today's calendar date. */
run(`todayISO='2026-09-12';checkDate=()=>false;DB.settings.unit='lb';DB.settings.onboarded=true;
  DB.settings.comparisonYears=undefined;DB.days={};
  for(const y of [2026,2025,2024,2023]) for(let m=0;m<9;m++) for(const d of [1,15]){
    const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    if(iso<=todayISO) DB.days[iso]={w:[{part:'Legs',ex:'Squat',w:toKg(225),reps:[8,8],at:1}],upd:1};}
  SEED=deriveAll();`);

(async()=>{
/* comparisonCard is module-private, so everything goes through a real stats
   render -- which is also the only thing that proves the card the app actually
   builds behaves this way. */
const seed=`todayISO='2026-09-12';checkDate=()=>false;DB.settings.unit='lb';DB.settings.onboarded=true;
  if(!Object.keys(DB.days||{}).length){DB.days={};
   for(const y of [2026,2025,2024,2023]) for(let m=0;m<9;m++) for(const d of [1,15]){
    const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    if(iso<=todayISO) DB.days[iso]={w:[{part:'Legs',ex:'Squat',w:toKg(225),reps:[8,8],at:1}],upd:1};}}
  SEED=deriveAll();view='stats';render();`;
const persist=()=>run(`(function(){localStorage.setItem(KEY,JSON.stringify(DB));return 1;})()`);
/* the app's OWN load() runs on the new page: it merges settings from storage and
   initialises the settings snapshot that save() stamps against. Skipping it and
   assigning DB by hand would test my copy of boot, not the app's. */
const reload=async()=>{persist();run=boot();await run(`load()`);run(seed);};
const txt=q=>run(`(function(){const e=document.querySelector(${JSON.stringify(q)});return e?e.textContent:null;})()`);
const years=()=>run(`[...document.querySelectorAll('.comparison-values > div span')].map(s=>s.textContent).join(',')`);

await run(`load()`);run(seed);
ok('the card defaults to two years when nothing is saved', years().split(',').length===2, years());

// ---- persistence, across a genuinely fresh page
run(`(function(){[...document.querySelectorAll('.comparison-years [data-add]')]
  .filter(b=>b.dataset.add==='2024'||b.dataset.add==='2023').forEach(b=>b.click());})()`);
const saved=run(`JSON.stringify(DB.settings.comparisonYears)`);
ok('adding years writes them to settings', /2024/.test(saved)&&/2023/.test(saved), saved);
ok('...on the per-key clock, so they sync like any other setting',
   run(`!!(DB.settingsAtK&&DB.settingsAtK.comparisonYears)`));

await reload();
ok('a RELOADED page restores all four years, not the default two', years().split(',').length===4, years());

run(`(function(){[...document.querySelectorAll('.comparison-years [data-year]')].find(b=>b.dataset.year==='2023').click();})()`);
await reload();
ok('removing a year persists too -- 2023 stays gone after a reload', !years().split(',').includes('2023'), years());

run(`DB.settings.comparisonYears={days:[2026,1999]};`);await reload();
ok('...and a saved year the record no longer contains is dropped quietly', years()==='2026', years());

// ---- the flip
run(`DB.settings.comparisonYears={days:[2026,2024]};`);await reload();
const elapsed=run(`Math.round((Date.UTC(2026,8,12)-Date.UTC(2026,0,1))/86400000)+1`);
const trained=run(`Object.keys(DB.days).filter(d=>d.startsWith('2026-')&&plateMetrics(DB.days[d]).sets).length`);
ok('(fixture) the arithmetic has a known answer', elapsed===255&&trained===17, trained+' of '+elapsed+' days');
ok('the number starts in days', /days/.test(txt('.comparison-values strong')), txt('.comparison-values strong').trim());

run(`document.querySelector('.comparison-flip').click();`);
const pct=txt('.comparison-values strong');
ok('tapping the number switches it to a percentage', /%/.test(pct)&&!/days/.test(pct), pct.trim());
ok('...and it is trained / days elapsed, to one decimal',
   pct.replace(/\s+/g,' ').includes((trained/elapsed*100).toFixed(1)),
   pct.trim()+' vs expected '+(trained/elapsed*100).toFixed(1));
ok('...both tiles flipped, not only the one tapped',
   run(`[...document.querySelectorAll('.comparison-values strong')].every(s=>/%/.test(s.textContent))`));
const delta=txt('.comparison-delta');
ok('the delta line reads in POINTS, not a second percentage',
   /points|Same share/.test(delta)&&!/%/.test(delta), delta.trim());

run(`document.querySelector('.comparison-flip').click();`);
const back=txt('.comparison-values strong');
ok('tapping again goes back to days -- it toggles', /days/.test(back)&&!/%/.test(back), back.trim());
ok('a leap year is counted by real dates, not a 365 constant',
   run(`Math.round((Date.UTC(2024,8,12)-Date.UTC(2024,0,1))/86400000)+1`)===elapsed+1);

// ---- the distance card has no honest denominator
/* a Run row is a distance row only when w>0 -- w IS the distance. The first
   version of this fixture wrote w:0, the distance card never rendered, and the
   two assertions below passed against the days card. Hollow, both of them. */
run(`for(const y of [2026,2025]) for(let m=0;m<9;m++){const iso=y+'-'+String(m+1).padStart(2,'0')+'-20';
  if(iso<=todayISO)DB.days[iso]={w:[{part:'Run',ex:'Run',w:5,reps:[1],mins:30,at:1}],upd:1};}
  SEED=deriveAll();view='stats';render();`);
ok('(fixture) the distance card really renders -- .runrace exists and is a comparison card',
   run(`!!document.querySelector('.conrace.runrace.comparison-card')`));
ok('the distance card offers no flip button -- miles have no honest denominator',
   run(`(function(){const c=document.querySelector('.conrace.runrace.comparison-card');
     return !!c&&c.querySelectorAll('.comparison-flip[type="button"]').length===0&&c.querySelectorAll('.comparison-values strong').length>0;})()`));


// ---- v4.5.17: share. Both cards, one button each, an image the size and shape
//      of the plate share, and it draws what is on screen -- the same years and
//      the same mode -- not a fresh computation.
{
  run(`DB.settings.comparisonYears={days:[2026,2025]};DB.settings.name='Sungjee Yoo';SEED=deriveAll();view='stats';render();`);
  const both=run(`[...document.querySelectorAll('.comparison-card')].map(c=>c.querySelectorAll('.comparison-share').length).join(',')`);
  ok('every comparison card carries exactly one share button', both.split(',').every(n=>n==='1')&&both.split(',').length>=2, both);
  ok('...it is the share ARROW, in the round stats style, beside Latest',
     run(`(function(){const b=document.querySelector('.comparison-card:not(.runrace) .comparison-share');
       return !!b&&!!b.querySelector('svg')&&b.classList.contains('stats-share')&&b.previousElementSibling?.classList.contains('comparison-latest');})()`));
  ok('...and it is smaller than the plate share, so the heading stays a heading',
     (()=>{const m=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8').match(/\.comparison-share\{[^}]*width:(\d+)px/);return m&&+m[1]<44;})());

  // click, on the days card, in percent mode, scrubbed off the latest date
  run(`document.querySelector('.comparison-card:not(.runrace) .comparison-flip').click();`);
  run(`(function(){const s=document.querySelector('.comparison-card:not(.runrace) .comparison-scrub');s.value=100;s.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const onScreen=run(`JSON.stringify({date:document.querySelector('.comparison-card:not(.runrace) .comparison-date').textContent,
     tiles:[...document.querySelectorAll('.comparison-card:not(.runrace) .comparison-values strong')].map(s=>s.textContent.replace(/\s+/g,' ').trim())})`);
  run(`_repCv=null;window.__drawn=[];(function(){const orig=HTMLCanvasElement.prototype.getContext;
     HTMLCanvasElement.prototype.getContext=function(){const ctx=orig.apply(this,arguments);
       return new Proxy(ctx,{get:(o,k)=>k==='fillText'?((t,x,y)=>{window.__drawn.push(String(t));}):o[k]});};})();
     document.querySelector('.comparison-card:not(.runrace) .comparison-share').click();`);
  await new Promise(r=>setTimeout(r,250));
  const cv=run(`_repCv?JSON.stringify({w:_repCv.cv.width,h:_repCv.cv.height,label:_repCv.label}):'null'`);
  ok('tapping share opens the sheet with a 1080×1280 image, the plate share\'s size', cv!=='null'&&JSON.parse(cv).w===1080&&JSON.parse(cv).h===1280, cv);
  ok('...named for the card, the year and the scrubbed date', cv!=='null'&&/^showup-days-compare-2026-\d{4}$/.test(JSON.parse(cv).label), cv!=='null'&&JSON.parse(cv).label);
  const drawn=run(`window.__drawn.join(' | ')`);
  const scr=JSON.parse(onScreen);
  ok('the image carries the date that was on screen, not today', drawn.includes(scr.date), scr.date+' in: '+drawn.slice(0,140));
  ok('...and the numbers that were on screen -- percent, because the card was flipped',
     scr.tiles.every(t=>{const n=t.split(' ')[0];return drawn.includes(n);})&&drawn.includes('%'), scr.tiles.join(' / '));
  ok('...the first name, bottom right', drawn.includes('Sungjee')&&!drawn.includes('Sungjee Yoo'), 'name drawn: '+(drawn.includes('Sungjee')?'Sungjee':'(none)'));
  ok('...and the card\'s own title in the small-caps slot', drawn.includes('YEAR OVER YEAR'));
  // the distance card shares too, with its own title and unit
  run(`_repCv=null;window.__drawn=[];document.querySelector('.runrace .comparison-share').click();`);
  await new Promise(r=>setTimeout(r,250));
  const dcv=run(`_repCv?JSON.stringify({w:_repCv.cv.width,label:_repCv.label}):'null'`);
  const ddrawn=run(`window.__drawn.join(' | ')`);
  ok('the distance card shares as well, under its own name', dcv!=='null'&&/^showup-distance-compare-/.test(JSON.parse(dcv).label), dcv);
  ok('...titled DISTANCE OVER TIME, in the distance unit', ddrawn.includes('DISTANCE OVER TIME')&&/\b(mi|km)\b/.test(ddrawn)&&!ddrawn.includes('%'), ddrawn.slice(0,120));

  /* v4.5.18: the footer is no longer written here at all -- both share cards call
     one drawShareFooter. Asserting the numbers in this file would have re-created
     the duplication the helper exists to remove, so what is asserted is that this
     card DELEGATES, and the geometry itself is checked once, below. */
  ok('the comparison share delegates its footer rather than redrawing it',
     (()=>{const src=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8');
       return /drawShareFooter\(x,data,sans\)/.test(src)&&!/moveTo\(70,11\d\d\)/.test(src)&&!/drawImage\(data\.logo/.test(src);})());

  /* the margin the maker asked for: the bottom should match the sides */
  {
    const pl=fs.readFileSync(path.join(dir,'js/plates.js'),'utf8');
    const num=re=>{const m=pl.match(re);return m?+m[1]:null;};
    /* v4.5.18: MEASURED, not restated. The first version of this check wrote the
       formula out again -- h-(h-edge-markH)-markH===edge -- which reduces to
       edge===edge and passed happily with the old 30px bottom. These constants are
       live globals once plates.js has loaded, so the gap is computed from them. */
    const edge=run(`SHARE_EDGE`), gapBottom=run(`SHARE_CARD_H-(SHARE_MARK_Y+SHARE_MARK_H)`);
    const gapRight=run(`1080-SHARE_EDGE`)&&edge;
    ok('(fixture) the share footer exposes its geometry', Number.isFinite(edge)&&Number.isFinite(gapBottom), `edge ${edge}, bottom gap ${gapBottom}`);
    ok('the space under the mark equals the space at the sides',
       gapBottom===edge, `bottom ${gapBottom}px vs sides ${edge}px`);
    ok('...and that is wider than it used to be, which is the whole request',
       gapBottom>30, `${gapBottom}px, was 30px`);
    ok('...and the mark still sits bottom-LEFT, the name bottom-right',
       /drawImage\(data\.logo,14,85,485,292,SHARE_EDGE,SHARE_MARK_Y/.test(pl)&&
       /fillText\(data\.name,1080-SHARE_EDGE,SHARE_NAME_Y/.test(pl));
    ok('nothing in the comparison plot reaches the footer rule -- axis labels hang 34px below the floor',
       (()=>{const src=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8');
         const m=src.match(/bottom=SHARE_RULE_Y-(\d+)/);return m&&+m[1]>=34+8;})(),
       (fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8').match(/bottom=SHARE_RULE_Y-\d+/)||[])[0]);
    ok('...and the plate legend is anchored to the rule, so even four rows clear it',
       /legendBase=Math\.min\(1030,SHARE_RULE_Y-18-\(rows\.length-1\)\*37\)/.test(pl));
  }
}

console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);
})();
