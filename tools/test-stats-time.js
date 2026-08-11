// v3.3.214: Current rhythm, scrubbable same-date Consistency, and fair Monthly pace.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";
const html = fs.readFileSync(path.join(dir,"index.html"),"utf8");
const css = fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,""),{
  url:"https://tahros.github.io/showup/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error("offline"));
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
w.HTMLCanvasElement.prototype.toDataURL=()=>"data:image/png;base64,";
w.Element.prototype.setPointerCapture=function(){};
w.PointerEvent=class extends w.MouseEvent{constructor(type,o={}){super(type,o);Object.defineProperty(this,'pointerId',{value:o.pointerId||1});}};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);
let fail=0;
const ok=(name,cond,extra)=>{console.log(cond?"PASS":"FAIL",name,extra===undefined?"":"→ "+extra);if(!cond)fail++;};

// A prior month has one day before today's day-number and one after it.
// Only the first is allowed into Monthly pace.
const pace=JSON.parse(run(`(function(){
  DB.days={}; const now=new Date(todayISO+'T00:00'), y=now.getFullYear(), m=now.getMonth();
  const prev=new Date(y,m-1,1), key=prev.toLocaleDateString('en-CA').slice(0,7), dom=+todayISO.slice(8);
  DB.days[key+'-01']={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
  const late=Math.min(new Date(prev.getFullYear(),prev.getMonth()+1,0).getDate(),dom+3);
  DB.days[key+'-'+String(late).padStart(2,'0')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
  DB.days[todayISO]={w:[{part:'Back',ex:'Row',w:40,reps:[10]}],upd:1};
  SEED=deriveAll(); const d=monthlyPaceData(12), row=d.months.find(x=>x.key===key);
  return JSON.stringify({days:row.days,total:row.total,cutoff:row.cutoff,dom});
})()`));
ok("Monthly pace excludes work after the shared cutoff", pace.days===1 && pace.total===2, JSON.stringify(pace));
ok("Monthly pace uses today's ordinal day", pace.cutoff===pace.dom, pace.cutoff);

const race=JSON.parse(run(`(function(){
  DB.days={}; const y=+todayISO.slice(0,4), md=todayISO.slice(5);
  DB.days[(y-1)+'-'+md]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
  DB.days[y+'-01-01']={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
  DB.days[todayISO]={w:[{part:'Back',ex:'Row',w:40,reps:[10]}],upd:1};
  SEED=deriveAll(); const r=consistencyRaceData();
  return JSON.stringify({cur:r.current.total,prev:r.previous.total,gap:r.gap,has:r.hasPrevious});
})()`));
ok("Consistency compares exact workout-day totals", race.cur===2 && race.prev===1, JSON.stringify(race));
ok("Consistency reports the exact gap", race.gap===1 && race.has, JSON.stringify(race));

run(`view='stats'; render();`);
ok("Current rhythm renders today as completed", run(`document.querySelector('.crtoday').classList.contains('crdone')`));
ok("Current rhythm uses History's landscape cell proportion",
  /\.crblank,\.crday\{aspect-ratio:1\.45\/1/.test(css) && /\.cal \.cd\{[^}]*aspect-ratio:1\.45\/1/.test(css.replace(/\n/g,"")));
ok("Current rhythm uses History's four-pixel calendar spacing",
  /\.crweekdays,\.crgrid\{[^}]*gap:4px/.test(css.replace(/\n/g,"")) && /\.cal\{[^}]*gap:4px/.test(css.replace(/\n/g,"")));
ok("Consistency renders two scoreboard totals", run(`document.querySelectorAll('.conscore>span b').length===2`));
ok("Monthly pace renders 12 bars", run(`document.querySelectorAll('.mpacecard rect.gbar').length===12`));
ok("retired time sections do not render", run(`![...document.querySelectorAll('#view h2')].some(h=>/^(Days by month|Last 6 months|Weekdays)$/.test(h.firstChild.textContent.trim()))`));

// v3.3.214: the new scoreboard is the scrub readout. It changes to the
// exact selected day while held, then returns to today's totals on release.
const score=()=>run(`[...document.querySelectorAll('[data-con-count]')].map(b=>b.textContent).join('|')`);
const score0=score(),date0=run(`document.querySelector('[data-con-date]').textContent`);
run(`(function(){const b=document.querySelector('.conrace [data-zoom]');
  b.getBoundingClientRect=()=>({left:0,top:0,width:340,height:215,right:340,bottom:215});
  b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:38,clientY:100,bubbles:true}));})()`);
ok("Consistency reveals a guide and two dots while scrubbing",
  run(`document.querySelector('.conrace .scrubg').style.display!== 'none'`) &&
  run(`document.querySelectorAll('.conrace .scrubg circle').length===2`));
ok("Consistency scoreboard changes at the selected date",score()!==score0,score0+" → "+score());
ok("Consistency date follows the selected day",run(`document.querySelector('[data-con-date]').textContent`)!==date0,
  run(`document.querySelector('[data-con-date]').textContent`));
run(`(function(){const b=document.querySelector('.conrace [data-zoom]');
  b.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:38,clientY:100,bubbles:true}));})()`);
ok("releasing Consistency restores today's scoreboard",score()===score0 && run(`document.querySelector('[data-con-date]').textContent`)===date0);

console.log(fail?"\n"+fail+" FAILED":"\nALL PASS");
process.exit(fail?1:0);
