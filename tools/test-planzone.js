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
process.exit(fail?1:0);
