// test-todayhero.js DIR — asserts the Today hero follows the live lift,
// falls back to Daily Fire when nothing is in motion, and that the part
// meter carries red only while live.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage34";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

// --- fixture: 40 real-shaped past days. Daily Fire needs >=30 lift days to
// render at all, and the part meter needs history to compute "usual" — an
// empty DB silently skips both and every assertion below becomes a lie.
run(`
  const _t0=new Date(todayISO+'T00:00');
  for(let i=1;i<=40;i++){
    const d=new Date(_t0); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    const w=[{part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30,30,30,30]},
             {part:'Shoulder',ex:'Dumbbell Side Raise',w:10,reps:[15,15]}];
    if(i%3===0) w.push({part:'Run',ex:'Run',w:3.4,mins:27,secs:0});   // runs included
    DB.days[iso]={w,upd:Date.now()};
  }
  SEED=deriveAll(); _fireDist=null;
`);
check("fixture: history derived", `SEED.dates.length`, 40);

// --- live session, mid-exercise
run(`
  const t=dayMeta();
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[35]});
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[20]});
  lastSetAt=Date.now();
  view='today'; render();
`);
// v3.3.40: the hero is the PART digest, not the exercise chart — the
// exercise chart already lives at the bottom of the exercise view.
check("live → hero is the part digest", `!!document.querySelector('#view .pdigest')`, true);
check("live → Rhythm stands down",     `!!document.querySelector('#view .rhythm')`, false);
check("hero names the live part",
      `[...document.querySelectorAll('#view h2')].some(x=>/Shoulder . live/i.test(x.textContent))`, true);
check("newest bar is red while live",
      `document.querySelector('#view .pdigest rect.lbNow').getAttribute('fill')`, "var(--live)");

// --- a run logged after the lift must not hijack the hero
run(`dayMeta().w.push({part:'Run',ex:'Run',w:3.47,mins:27,secs:16}); render();`);
check("Run doesn't steal the hero",
      `[...document.querySelectorAll('#view h2')].some(x=>/Shoulder . live/i.test(x.textContent))`, true);

// --- sealing the exercise hands the hero back to Daily Fire
run(`dayMeta().doneEx.push('Dumbbell Press'); render();`);
check("sealed ex → Rhythm leads",       `!!document.querySelector('#view .rhythm')`, true);
check("sealed ex → no part digest",     `!!document.querySelector('#view .pdigest')`, false);

// --- day sealed: isLive() is "today has sets and the day isn't done" —
// NOT the rest timer. Sealing the day is the only real not-live state.
run(`dayMeta().doneEx.length=0; dayMeta().doneAll=true; render();`);
check("day sealed → Rhythm leads", `!!document.querySelector('#view .rhythm')`, true);
check("day sealed → no part digest", `!!document.querySelector('#view .pdigest')`, false);

// --- part meter: red only while live
run(`
  dayMeta().doneAll=false;
  view='lift'; lift={part:'Shoulder',ex:null,weight:0}; render();
`);
check("live → meter is red",
      `!!document.querySelector('#view .smeter i.live')`, true);
run(`dayMeta().doneAll=true; render();`);
check("day sealed → meter not red",
      `!!document.querySelector('#view .smeter i.live')`, false);
check("day sealed → meter still shown (accent)",
      `!!document.querySelector('#view .smeter i')`, true);

// v3.3.45: Rhythm is the top card, and appears exactly once.
// NB: the meter checks above leave us on the Lift tab — come back to Today.
run(`view='today'; dayMeta().doneAll=true; render();`);
check("Rhythm appears exactly once", `document.querySelectorAll('#view .rhythm').length`, 1);
check("Daily Fire is gone",          `!!document.querySelector('#view .firecard')`, false);
check("Rhythm is the FIRST card",
      `document.querySelector('#view h2').textContent.trim().toLowerCase()`, "rhythm");
// v3.3.53: v3.3.52's chart-in-Rhythm was reverted — the vs-bars are back.
// They render only when last year has data (lyN!=null), so seed one.
run(`
  {const d=new Date(todayISO+'T00:00'); d.setFullYear(d.getFullYear()-1);
   for(let i=0;i<10;i++){ const c2=new Date(d); c2.setDate(c2.getDate()-i*3);
     DB.days[c2.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:60,reps:[10]}],upd:1};}
   SEED=deriveAll(); _fireDist=null; view='today'; render();}
`);
check("vs-bars are back",
      `!!document.querySelector('#view .rhythm .vs')`, true);
check("no chart inside Rhythm",
      `!!document.querySelector('#view .rhythm .rchart')`, false);

// v3.3.54: info dots sit beside their section titles and still open tips.
// Surface: the "Logged today" zonehead in the exercise view — the fixture
// guarantees today's sets exist there, unlike Readiness (needs the pre-gym
// planning board) or the Run charts (need run history).
run(`view='lift'; lift={part:'Shoulder',ex:'Dumbbell Press',weight:16}; render();`);
check("Logged-today head carries the i dot",
      `!!document.querySelector('#view .zonehead .ibtn.tipi')`, true);
check("i dot label is 'i', not 'info'",
      `document.querySelector('#view .zonehead .ibtn.tipi').textContent`, "i");
check("tip still opens from the new position",
      `(()=>{const b=document.querySelector('#view .zonehead .ibtn.tipi');
             b.click(); const tf=document.getElementById('tipFloat');
             const ok=!!(tf&&!tf.hidden&&tf.textContent.length>10); if(tf) tf.hidden=true; return ok;})()`, true);

process.exit(fail ? 1 : 0);
