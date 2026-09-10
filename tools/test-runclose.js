/* test-runclose.js — v3.3.530, closing the day from the run screen.
 * On a run day the run is usually the whole day, and the close was not on this
 * screen at all: v3.3.457 put one on the part list and on Today and the
 * exercise screen never got one. Finishing meant typing three numbers, tapping
 * Add run, and then leaving the screen past eight recent runs.
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
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{}; w.confirm=()=>true;
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);

const openRun=()=>run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  for(let i=1;i<=10;i++){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Run',ex:'Run',w:4.1,reps:[],mins:27,at:1}],upd:1};}
  DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:1.4,reps:[],mins:10,at:1}],upd:1};
  SEED=deriveAll(); view='lift'; lift.part='Run'; lift.ex='Run'; lift.weight=0; render();})()`);

openRun();
ok("the run screen offers the close, beside Add run",
   run(`(function(){const b=document.getElementById('doneAllBtn');
     return !!b && !!b.closest('.runacts') && !!document.querySelector('.runacts #addrun');})()`));
ok("...as the only one on the screen, which is the rule for that id",
   run(`document.querySelectorAll('#doneAllBtn').length`)===1,
   run(`document.querySelectorAll('#doneAllBtn').length`));
ok("...quiet beside the loud one, so it is not what your thumb finds first",
   run(`(function(){const b=document.getElementById('doneAllBtn');
     return b.classList.contains('ghost') && !document.getElementById('addrun').classList.contains('ghost');})()`));
/* .btn is width:100% by design (v3.3.68) -- both need releasing from it, and
   the close must never grow into the primary */
{
  run(`(function(){const s=document.createElement('style'); s.id='__c';
    s.textContent=${JSON.stringify(fs.readFileSync(path.join(dir,"css/app.css"),"utf8"))};
    document.head.appendChild(s);})()`);
  const cs=sel=>run(`(function(){const c=getComputedStyle(document.querySelector(${JSON.stringify(sel)}));
    return [c.width,c.flexGrow,c.maxWidth].join('|');})()`);
  ok("(fixture) the stylesheet is loaded, or these prove nothing",
     run(`getComputedStyle(document.querySelector('.runacts')).display`)==='flex',
     run(`getComputedStyle(document.querySelector('.runacts')).display`));
  ok("...neither is stretched to the full width of the card",
     !/^100%/.test(cs('.runacts #addrun')) && !/^100%/.test(cs('.runacts .runclose')),
     cs('.runacts #addrun')+"   "+cs('.runacts .runclose'));
  ok("...Add run takes the room and the close takes only its word",
     run(`getComputedStyle(document.querySelector('.runacts #addrun')).flexGrow`)==='1' &&
     run(`getComputedStyle(document.querySelector('.runacts .runclose')).flexGrow`)==='0',
     "addrun grow="+run(`getComputedStyle(document.querySelector('.runacts #addrun')).flexGrow`)+
     ", close grow="+run(`getComputedStyle(document.querySelector('.runacts .runclose')).flexGrow`));
  run(`(function(){const s=document.getElementById('__c'); if(s) s.remove();})()`);
}
/* it must actually close the day, through the one handler that owns doneAll */
ok("(fixture) the day is open", run(`!dayMeta().doneAll`));
run(`document.getElementById('doneAllBtn').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);
ok("tapping it closes the day, the same as the close anywhere else",
   run(`!!dayMeta().doneAll`));
/* and when the day is already shut there is nothing to close */
openRun();
run(`(function(){dayMeta().doneAll=1; save(); render();})()`);
ok("...and a shut day offers no close on this screen",
   run(`!document.getElementById('doneAllBtn')`));
ok("...while Add run stays, because the log is never shut",
   run(`!!document.getElementById('addrun')`));
process.exit(fail?1:0);
