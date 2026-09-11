// v4.1.15 — the chart follows the set you just did.
// The pick only moved when it fell OUT of scope, so logging a set left the
// reading on a session from a fortnight ago while the new set sat unread at
// the right-hand edge. Driven by logging real sets through the real handler.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,e,g)=>{let good;try{good=typeof e==='string'?run(e):e;}catch(err){good=false;console.log(err.message);}
  let shown=g;if(typeof g==='string'){try{shown=run(g);}catch(_){shown=g;}}
  console.log(`${good?'PASS':'FAIL'} ${n}`+(g!==undefined?` → ${shown}`:''));if(!good)fails++;};

/* six sessions of Dumbbell Lunge, so a four-session window cannot hold them all
   and browsing back is meaningful */
run(`DB.days={};DB.settings.onboarded=true;DB.settings.unit='lb';DB.settings.myParts=['Legs'];
  todayISO='2026-09-11';checkDate=()=>false;
  ['2026-08-22','2026-08-27','2026-09-01','2026-09-03','2026-09-08'].forEach((d,i)=>{
    DB.days[d]={w:[{part:'Legs',ex:'Dumbbell Lunge',w:toKg(35+i*2),reps:[8,8,8],at:1}],upd:1};});
  SEED=deriveAll();view='lift';lift.part='Legs';lift.ex='Dumbbell Lunge';lift.weight=toKg(45);
  try{localStorage.clear();}catch(_){}dayMeta();render();
`);

const st=`progressionUI['train']`;
const pick=()=>run(`${st}.pick`);
const newest=()=>run(`progressionData('Dumbbell Lunge').records.at(-1).id`);

run(`document.querySelectorAll('.progression-card').forEach(c=>renderProgression(c));`);
ok('(fixture) the chart has a pick to begin with', !!pick(), `String(${st}.pick)`);

/* browse back to an older range and select an older set, as the maker had */
/* browse back with the real arrow -- setting state.anchor by hand does not
   survive renderProgression, which recomputes it from the window */
const tapPg=a=>run(`document.querySelector('[data-pg-action="${a}"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);
tapPg('prev-range');
const older=pick();
ok('(fixture) browsing back anchors the view off the latest',
   !!run(`${st}.anchor`), `String(${st}.anchor)`);
ok('(fixture) ...and the pick came with it, off the newest set',
   older!==newest(), `String(${st}.pick)`);

/* now log a set, the way the app does */
run(`(function(){const d=day(todayISO);d.w=d.w||[];
  d.w.push({part:'Legs',ex:'Dumbbell Lunge',w:toKg(45),reps:[10],at:Date.now()});
  d.upd=Date.now();save();SEED=deriveAll();})();
  document.querySelectorAll('.progression-card').forEach(c=>renderProgression(c));`);
ok('THE CHART MOVES TO THE SET YOU JUST DID', pick()===newest(), `String(${st}.pick)`);
ok('...and lets go of the range you were browsing, so the set is on screen',
   run(`${st}.anchor===null && ${st}.span===null`), `String(${st}.anchor)`);

/* a second set moves it again */
run(`(function(){const d=day(todayISO);
  d.w.push({part:'Legs',ex:'Dumbbell Lunge',w:toKg(45),reps:[9],at:Date.now()+1});
  d.upd=Date.now();save();SEED=deriveAll();})();
  document.querySelectorAll('.progression-card').forEach(c=>renderProgression(c));`);
ok('...and again on the next set', pick()===newest(), `String(${st}.pick)`);

/* browsing is not undone by a mere repaint */
tapPg('prev-range');
const browsed=pick(), anchored=run(`${st}.anchor`);
run(`document.querySelectorAll('.progression-card').forEach(c=>renderProgression(c));
  document.querySelectorAll('.progression-card').forEach(c=>renderProgression(c));`);
ok('a repaint with no new set leaves your browsing alone',
   pick()===browsed && run(`${st}.anchor`)===anchored,
   `String(${st}.pick)+' @ '+${st}.anchor`);

/* and the jump is in-session only: nothing about it is persisted */
ok('the marker is not written to storage, so a reload keeps the saved view',
   !/seen/.test(fs.readFileSync(path.join(dir,'js/progression.js'),'utf8')
     .match(/const next=\{[^}]*\}/)[0]),
   fs.readFileSync(path.join(dir,'js/progression.js'),'utf8').match(/const next=\{[^}]*\}/)[0].slice(0,72));
/* ---- the jump is IN-SESSION only -----------------------------------------
   state.seen is not persisted, so the first paint after a reload has nothing
   to compare against and must leave the remembered view alone (v3.3.542). The
   first cut of this file asserted that and proved nothing: forcing the guard
   off changed no result, because the fixture's first paint had no saved view
   to protect. Restored properly here. */
{
  const saved=run(`${st}.anchor`), savedPick=run(`${st}.pick`);
  ok('(fixture) there is a browsed view to remember', !!saved, `String(${st}.anchor)`);
  /* a reload: the UI state is gone, only what was persisted survives */
  run(`delete progressionUI['train'];
    view='lift';lift.part='Legs';lift.ex='Dumbbell Lunge';render();
    document.querySelectorAll('.progression-card').forEach(c=>renderProgression(c));`);
  ok('a reload keeps the remembered range — it does not jump to the newest set',
     run(`${st}.anchor`)===saved && pick()===savedPick,
     `String(${st}.anchor)+' / '+${st}.pick`);
}
process.exit(fails?1:0);
