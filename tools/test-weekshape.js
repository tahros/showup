/* test-weekshape.js — v3.3.512, the rest card's week shape.
 * Driven through a real render with real ledgers, because the claim is about
 * what the card SAYS, and the sentence has to come from the data or not at all.
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

/* build a ledger by a rule: trainOn(dowIndex) decides each of the last N days */
/* the rest card is the TODAY tab's, shown only while today is a declared rest
   -- "the day's own frame, shown only while the frame is true" (v3.3.469).
   A first cut of this rendered the stats view and found no card at all. */
const build=pred=>run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  const N=364; for(let i=N;i>=1;i--){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i);
    const dow=d.getDay(); if((${pred})(dow)) DB.days[d.toLocaleDateString('en-CA')]=
      {w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8],at:1}],upd:1};}
  DB.days[todayISO]={w:[],rest:1,upd:1};            // today is a rest day
  SEED=deriveAll(); view='today'; lift.plan=null; render();})()`);
const card=()=>run(`(function(){const el=document.querySelector('.restweek');
  return el?el.textContent.replace(/\\s+/g,' ').trim():'(absent)';})()`);
const line=()=>run(`(function(){const el=document.querySelector('.restweek .rwline');
  return el?el.textContent.trim():'(absent)';})()`);

// ---- a Sunday rester: trains every day but Sunday
build("dow=>dow!==0");
ok("the shape appears under the rest grid",
   run(`!!document.querySelector('.crcard.resting .restweek')`));
ok("...and names the day, because the data names it", line()==="You rest on Sundays.", line());
ok("...with seven columns, Monday first",
   run(`[...document.querySelectorAll('.restweek .rwbar b')].map(b=>b.textContent).join('')`)==="MTWTFSS",
   run(`[...document.querySelectorAll('.restweek .rwbar b')].map(b=>b.textContent).join('')`));
ok("...and Sunday is the one marked as leading",
   run(`(function(){const b=[...document.querySelectorAll('.restweek .rwbar')];
     return b.filter(x=>x.classList.contains('lead')).length===1 && b[6].classList.contains('lead');})()`));
/* today is itself a declared rest in this fixture, so its own weekday reads
   one rest out of a year -- 2%, not 0%. Sunday must be 100% and every other
   column near zero; pinning all seven to exact strings would break on the day
   of the week the suite happens to run. */
ok("...reading 100% for Sunday and near zero for the rest",
   run(`(function(){const v=[...document.querySelectorAll('.restweek .rwbar small')].map(s=>parseInt(s.textContent));
     return v.length===7 && v[6]===100 && v.slice(0,6).every(n=>n<=3);})()`),
   run(`[...document.querySelectorAll('.restweek .rwbar small')].map(s=>s.textContent).join(' ')`));

// ---- RATE, not count: rest every Sunday AND every Monday, but the record
//      starts on a Monday so there is one more Monday than Sunday
build("dow=>dow!==0&&dow!==1");
ok("two rest days are named as two, not crowned as one",
   /Sundays and Mondays|Mondays and Sundays/.test(line()), line());

// ---- a flat record says so rather than crowning the tallest column
let seed=1; const rnd=()=>((seed=seed*1103515245+12345&0x7fffffff)/0x7fffffff);
build("dow=>((dow*2654435761)%97)>24");
ok("a record with no rhythm is not given one",
   /evenly|most on/.test(line()), line());

// ---- nothing is a target
ok("the shape sets no goal, grades nothing and names no ideal",
   !/goal|target|ideal|should|score|streak|better|worse|👏|🎉/i.test(card()), card().slice(0,110));
ok("...and the long run stays a fact in the footer",
   /longest run \d+/.test(card()));

// ---- the counters it sits under are untouched
/* ---- v3.3.513: the columns grow in ----
   The first cut styled this with a transition on height, which animates
   nothing: the bar is born at its final height and a transition needs a
   CHANGE. Asserted against the resolved rule, with the stylesheet actually
   installed -- the harness only LINKS it and jsdom fetches nothing, so
   getComputedStyle would otherwise read browser defaults and pass by vacancy. */
run(`(function(){const s=document.createElement('style'); s.id='__csstmp';
  s.textContent=${JSON.stringify(fs.readFileSync(path.join(dir,"css/app.css"),"utf8"))};
  document.head.appendChild(s);})()`);
ok("(fixture) the stylesheet is really loaded, or the next checks prove nothing",
   run(`getComputedStyle(document.querySelector('.restweek .rwbar i')).height`)==='86px',
   run(`getComputedStyle(document.querySelector('.restweek .rwbar i')).height`));
ok("each column carries its place in the week, so the growth staggers",
   run(`[...document.querySelectorAll('.restweek .rwbar i')].map(e=>e.style.getPropertyValue('--j').trim()).join(',')`)==='0,1,2,3,4,5,6',
   run(`[...document.querySelectorAll('.restweek .rwbar i')].map(e=>e.style.getPropertyValue('--j').trim()).join(',')`));
ok("...and grows from zero as a keyframe, not a transition that can never fire",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
     return /@keyframes rwgrow\{from\{height:0\}to\{height:var\(--h/.test(css)
         && /\.restweek \.rwbar i::after\{[\s\S]{0,120}?animation:rwgrow/.test(css)
         && !/\.restweek \.rwbar i::after\{transition:height/.test(css);})());
ok("...only on an arrival, never on an in-place repaint",
   /#view:not\(\.norise\) \.restweek \.rwbar i::after/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
run(`(function(){const s=document.getElementById('__csstmp'); if(s) s.remove();})()`);

ok("the card still leads with the count and the share",
   run(`(function(){const c=document.querySelector('.crcard.resting');
     return /days rested/.test(c.textContent) && /% of days since/.test(c.textContent);})()`));
// ---- the attendance card does NOT get it: it is a rest reading
ok("the attendance card gets no week shape — it is a rest reading",
   run(`(function(){view='stats'; render();
     return !document.querySelector('.restweek');})()`));
process.exit(fail?1:0);
