/* test-progscrub.js — v3.3.511, scrubbing the Progression chart.
 *
 * Driven through the real gesture, not through the functions behind it: the
 * touch events a thumb actually sends, and the DOM read back after each. The
 * arm timer is a named function so the hold can be run rather than slept
 * through -- the runs chart learned that in v3.3.486.
 */
const { JSDOM } = require("jsdom");
const fs=require("fs"), path=require("path"), vm=require("vm");
const dir=process.argv[2]||".";
let fail=0;
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
/* jsdom gives every element a zero rect, which would put every dot at x=0 and
   make "the nearest dot to the finger" unanswerable. The svg gets a real box. */
w.SVGElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:330,height:122,right:330,bottom:122,x:0,y:0};};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);

/* a Squat history with a clear shape: light, then heavy, then a PR */
run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  const ws=[135,135,155,175,175,195,205,215,215,225,235,245,255,265];
  ws.forEach((lb,i)=>{const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-(ws.length-i)*3);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:toKg(lb),reps:[6,6,4],at:1}],upd:1};});
  SEED=deriveAll(); view='lift'; lift.part='Legs'; lift.ex='Squat'; lift.weight=0; render();})()`);

ok("the progression chart is on the exercise screen",
   run(`!!document.getElementById('pgWrap')`));
const nDots=run(`document.querySelectorAll('#pgWrap circle.pgdot').length`);
ok("...with an addressable dot per session", nDots>=3, String(nDots));
ok("...each carrying the day and the load from the record, not from pixels",
   run(`[...document.querySelectorAll('#pgWrap circle.pgdot')].every(c=>/^\\d{4}-\\d{2}-\\d{2}$/.test(c.getAttribute('data-d')||'') && (c.getAttribute('data-v')||'')!=='')`),
   run(`(function(){const c=document.querySelector('#pgWrap circle.pgdot');return c.getAttribute('data-d')+' / '+c.getAttribute('data-v')+' / '+c.getAttribute('data-r');})()`));

const touch=(type,x)=>run(`(function(){const b=document.getElementById('pgWrap');
  const e=new window.Event(${JSON.stringify(type)},{bubbles:true,cancelable:true});
  e.touches=[{clientX:${x},clientY:60}]; b.dispatchEvent(e);})()`);
const readout=()=>run(`(function(){const r=document.querySelector('[data-pgread]');
  return r&&!r.hidden?r.textContent:'(hidden)';})()`);

/* A drag WITHOUT the hold is a scroll and must not scrub. The first cut of this
   only dispatched the events and checked nothing had happened -- which passes
   with the slop guard deleted, because the real 250ms timer never fires inside
   a test either way. It has to RUN the arm and prove it refuses: movement past
   the slop kills the hold, so arming afterwards must do nothing. */
touch('touchstart',40); touch('touchmove',180);
run(`document.getElementById('pgWrap')._pgArm()`);
ok("a drag scrolls — it does not scrub, even when the hold fires", readout()==='(hidden)', readout());
touch('touchend',180);

/* a hold arms it */
touch('touchstart',40);
run(`document.getElementById('pgWrap')._pgArm()`);
ok("a hold arms the scrub and reads out the first session",
   readout()!=='(hidden)' && /\d/.test(readout()), readout());
ok("...and the caption steps aside rather than a row appearing",
   run(`[...document.querySelectorAll('[data-pgcap]')].every(c=>c.hidden)`));
ok("...marking exactly one dot",
   run(`document.querySelectorAll('#pgWrap circle.pgdot.pick').length`)===1);
ok("...with a guide through the picked column",
   run(`!!document.querySelector('#pgWrap .pgguide')`));
const first=readout();
touch('touchmove',300);
const last=readout();
ok("dragging moves the readout to another session", first!==last, first+"  →  "+last);
ok("...and the readout says the day and the load, from that dot",
   /\w{3},\s\w{3}\s\d+/.test(last) && /\d+\s(lb|kg)/.test(last), last);
ok("...still exactly one dot picked",
   run(`document.querySelectorAll('#pgWrap circle.pgdot.pick').length`)===1);
touch('touchend',300);
ok("letting go leaves the reading up until it is dismissed",
   readout()===last, readout());

/* tapping the picked dot clears it — the runs chart's rule */
const px=run(`+document.querySelector('#pgWrap circle.pgdot.pick').getAttribute('cx')`);
touch('touchstart',px);
ok("tapping the picked dot clears the scrub", readout()==='(hidden)', readout());
ok("...and gives the caption back",
   run(`[...document.querySelectorAll('[data-pgcap]')].every(c=>!c.hidden)`));
ok("...and takes the guide away with it",
   run(`!document.querySelector('#pgWrap .pgguide')`));
process.exit(fail?1:0);
