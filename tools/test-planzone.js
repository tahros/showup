/* test-planzone.js — v3.3.534, the plan on the exercise screen.
 * SUGGESTED read your history and proposed loads. The maker had already
 * decided that morning what he was lifting and had to leave the screen to
 * remember it. The card states the PLAN for this exercise; no plan, no card.
 */
const { JSDOM } = require("jsdom");
const fs=require("fs"), path=require("path"), vm=require("vm");
const dir=process.argv[2]||"."; let fail=0;
const ok=(n,c,g)=>{ console.log((c?"PASS ":"FAIL ")+n+(g!==undefined?" → "+g:"")); if(!c) fail=1; };
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,""),
  {url:"https://tahros.github.io/showup/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window, ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error("offline"));
w.matchMedia=q=>({matches:/no-preference/.test(String(q)),media:String(q),addEventListener(){},removeEventListener(){}});
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);

/* the plan is built in its own shape rather than parsed from text: the card
   is what is under test, and parsePlan's grammar is another suite's job. */
const LINES = [[95,[10],'warm-up'],[115,[8],'warm-up'],[155,[10,10,10,10],''],[175,[5],'']];
const setup = todaySets => run(`(function(){DB.days={};DB.plan=null;DB.week=null;
  DB.settings.unit='lb'; DB.settings.onboarded=true;
  for(let i=1;i<=6;i++){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Incline Barbell Bench Press',w:toKg(155),reps:[10],at:1}],upd:1};}
  DB.days[todayISO]={w:${JSON.stringify(todaySets)}.map(s=>({part:'Chest',ex:'Incline Barbell Bench Press',w:toKg(s[0]),reps:s[1],at:1})),upd:1};
  SEED=deriveAll(); view='lift'; lift.part='Chest'; lift.ex='Incline Barbell Bench Press'; lift.weight=0;})()`);
const plan = () => run(`(function(){DB.plan={d:todayISO,note:'',items:[{ex:'Incline Barbell Bench Press',
  lines:${JSON.stringify(LINES)}.map(l=>({w:toKg(l[0]),reps:l[1],note:l[2]}))}]};
  save(); render();})()`);
const rows = () => run(`[...document.querySelectorAll('.planzone .planrow2:not(.fold)')].length`);
const fills = () => run(`JSON.stringify([...document.querySelectorAll('.planzone .pgd')].map(e=>e.style.getPropertyValue('--f')))`);

// ---- no plan, no card
setup([[155,[10]]]); run(`render()`);
ok("no plan today, no card", run(`!document.querySelector('.planzone')`));
ok("...and SUGGESTED is not offered in its place",
   run(`!document.querySelector('.zone.mini .lastsets')`));

// ---- with a plan, nothing logged
setup([]); plan();
ok("with a plan, the card states it", run(`!!document.querySelector('.planzone')`));
ok("...one row per weight the plan names", rows()===4, String(rows()));
ok("...every dial empty before anything is logged",
   JSON.parse(fills()).every(f=>+f===0), fills());
ok("...and the head counts the sets, not the rows",
   /0 of 7 sets/.test(run(`document.querySelector('.planzone .ago').textContent`)),
   run(`document.querySelector('.planzone .ago').textContent`));

// ---- the dial divides by that row's own set count, not by quarters
setup([[155,[10,10,10]]]); plan();
ok("a 3-of-4 row fills three quarters",
   Math.abs(+JSON.parse(fills())[2]-0.75)<0.001, fills());
setup([[155,[10,10]]]); plan();
ok("...and 2 of 4 fills a half", Math.abs(+JSON.parse(fills())[2]-0.5)<0.001, fills());

// ---- a row fills on the WEIGHT landing, never on the rep target
setup([[175,[4]]]); plan();
/* a full row FOLDS, so it leaves the open rows -- the proof that 4 reps
   filled a 5-rep row is that the row is no longer among the open ones and a
   fold line has appeared for it. */
ok("4 reps where the plan said 5 still fills the row",
   run(`!!document.querySelector('.planzone .planrow2.fold')`) &&
   !/175/.test(run(`[...document.querySelectorAll('.planzone .planrow2:not(.fold) .p2w')].map(e=>e.textContent).join(' ')`)),
   run(`[...document.querySelectorAll('.planzone .planrow2:not(.fold) .p2w')].map(e=>e.textContent).join(' ')`));

// ---- full rows fold, a partial row stays open
setup([[95,[10]],[115,[8]],[155,[10,10,10]]]); plan();
ok("finished rows fold into one line",
   run(`!!document.querySelector('.planzone .planrow2.fold')`));
ok("...keeping their weights, so warm-ups read back",
   /95/.test(run(`document.querySelector('.planzone .planrow2.fold').textContent`)) &&
   /115/.test(run(`document.querySelector('.planzone .planrow2.fold').textContent`)),
   run(`document.querySelector('.planzone .planrow2.fold .p2list').textContent`));
ok("...and the partial row stays open — it is the one you are working",
   rows()===2, String(rows()));
run(`document.querySelector('[data-planfold2]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);
ok("...'show' puts them back", rows()===4 && run(`!document.querySelector('.planzone .planrow2.fold')`),
   String(rows()));

// ---- a row LOADS, it does not log
setup([]); plan();
const before = run(`day(todayISO).w.length`);
run(`(function(){const r=[...document.querySelectorAll('[data-planload]')].pop();
  r.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));})()`);
ok("tapping a row loads its weight into the logger",
   Math.abs(run(`toU(lift.weight)`)-175)<0.6, run(`String(Math.round(toU(lift.weight)))`));
ok("...and logs nothing — a plan row is what you are about to do",
   run(`day(todayISO).w.length`)===before, String(run(`day(todayISO).w.length`)));
ok("...and there is no ✕ to dismiss your own plan",
   run(`!document.querySelector('.planzone [data-sugx]')`));
/* ---- v4.1.16: a by-feel row names no load ---------------------------------
   v3.3.534 spent the pool BY WEIGHT, which is right for a row that names one
   and silently impossible for `by feel`: its key is 0 while the set sits under
   its real load, so the row stayed empty however many sets landed. Reproduced
   from the maker's Standing Calf Raise. */
const setupFeel = today => run(`(function(){DB.days={};DB.plan=null;DB.week=null;
  DB.settings.unit='lb'; DB.settings.onboarded=true; DB.settings.myParts=['Legs'];
  DB.days['2026-09-09']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],upd:1};
  DB.days[todayISO]={w:${JSON.stringify(today)}.map(s=>({part:'Legs',ex:'Standing Calf Raise',
    w:toKg(s[0]),reps:s[1],at:1})),upd:1};
  DB.plan={d:todayISO,note:'',items:[{ex:'Standing Calf Raise',
    lines:[{nw:1,reps:[12,12,12],note:''}]}]};
  SEED=deriveAll(); view='lift'; lift.part='Legs'; lift.ex='Standing Calf Raise';
  lift.weight=0; dayMeta(); render();})()`);
const head = () => run(`(document.querySelector('.planzone .ago')||{}).textContent||''`);
const fills2 = () => JSON.parse(run(`JSON.stringify([...document.querySelectorAll('.planzone .pgd')].map(e=>e.style.getPropertyValue('--f')))`));

setupFeel([[45,[12]]]);
ok("a by-feel row fills from a set logged at a real load",
   /1 of 3 sets/.test(head()), head());
ok("...and its dial moves with it", Math.abs(+fills2()[0]-1/3)<0.01, JSON.stringify(fills2()));
setupFeel([[45,[12]],[50,[12]],[50,[11]]]);
ok("...counting sets at ANY load, because it named none",
   /3 of 3 sets/.test(head()), head());
ok("...and folds once full", run(`!!document.querySelector('.planzone .planrow2.fold')`));

/* the ordering claim: a weighted row must take its own sets first, or the
   by-feel row above it eats them */
run(`(function(){DB.days[todayISO]={w:[
    {part:'Legs',ex:'Standing Calf Raise',w:toKg(45),reps:[12],at:1},
    {part:'Legs',ex:'Standing Calf Raise',w:toKg(90),reps:[8],at:2}],upd:1};
  DB.plan={d:todayISO,note:'',items:[{ex:'Standing Calf Raise',lines:[
    {nw:1,reps:[12,12],note:''},{w:toKg(90),reps:[8],note:''}]}]};
  SEED=deriveAll(); dayMeta(); render();})()`);
/* a full row FOLDS, so its dial leads the list -- index by value, not by
   position, or this reads the fold line and calls the order wrong */
ok("a weighted row keeps the set that matches it, even under a by-feel row",
   fills2().some(f=>+f===1) && !!run(`document.querySelector('.planzone .planrow2.fold')`),
   JSON.stringify(fills2()));
ok("...and the by-feel row takes only what is left, not the weighted row's set",
   fills2().some(f=>Math.abs(+f-0.5)<0.01), JSON.stringify(fills2()));
ok("...so the head counts both, not one twice",
   /2 of 3 sets/.test(head()), head());
process.exit(fail?1:0);
