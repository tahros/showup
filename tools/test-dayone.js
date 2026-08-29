// test-daydone.js DIR — every horizontally scrolling surface must open on
// the CURRENT period, not the oldest. jsdom reports zero layout, so the DOM
// assertions below check structure and the scroll call is exercised for
// throw-safety; the arithmetic is asserted directly against a fake element.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage42";

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

let fail=0;
const ok=(n,c,note)=>{console.log((c?"PASS":"FAIL"),n,note!==undefined?"→ "+note:"");if(!c)fail++;};
const txt=()=>run(`document.getElementById('view').textContent`);
const tap=sel=>run(`(function(){const b=document.querySelector('${sel}');
  if(!b) return 'absent'; b.dispatchEvent(new window.Event('click',{bubbles:true})); return 'ok';})()`);

/* v3.3.372: DAY ONE. What a new user met before was a card whose button
   dropped them into the FULL Train tab -- grid, go-to lists, plan section,
   every number blank. The flow asks one question at a time instead, and only
   on day one. */
run(`(function(){DB.days={}; DB.settings.unit='lb'; delete DB.settings.dayDone;
  d1={step:0,part:null,preview:false}; SEED=deriveAll(); view='today'; render();})()`);
ok("day one opens on one question, not the full app",
   /One set is day one/.test(txt()) && !/Body part/.test(txt()));
ok("...and offers to bring old logs, plainly disabled for now",
   run(`(function(){const b=document.querySelector('[data-d1="soon"]');
     return !!b && b.getAttribute('aria-disabled')==='true';})()`));

tap('[data-d1="start"]');
ok("the first question is what you trained", /What did you train/.test(txt()));
ok("...offering every part in the catalog, and nothing else",
   run(`document.querySelectorAll('[data-d1part]').length`) === run(`Object.keys(SEED.catalog).length`),
   run(`document.querySelectorAll('[data-d1part]').length`));
ok("...with no history columns, since there is no history",
   !/ago|sets|this year/i.test(txt()));

tap('[data-d1part="Chest"]');
ok("the second question is which lift", run(`document.querySelectorAll('[data-d1ex]').length`) > 0,
   run(`document.querySelectorAll('[data-d1ex]').length`));
ok("...a short list, not the whole catalog",
   run(`document.querySelectorAll('[data-d1ex]').length`) <= 8);
tap('[data-d1="back"]');
ok("...and every step can be undone", /What did you train/.test(txt()));

/* choosing a lift hands over to the REAL logger -- the first set is logged in
   the real app, so nothing has to be relearned tomorrow */
tap('[data-d1part="Chest"]');
/* the list is the CATALOG in its own order, which is the maker's order --
   his most-used lifts lead. That is right for him and is an open question for
   a stranger, whose Chest list opens on Smith-machine variants. Recorded here
   so that curating it later is a deliberate change rather than a drift. */
const firstEx=run(`(document.querySelector('[data-d1ex]')||{}).textContent`);
ok("the list is the catalog in the app's own order",
   firstEx===run(`SEED.catalog['Chest'][0]`), firstEx);
tap('[data-d1ex]');
ok("choosing a lift opens the real logger",
   run(`view`)==='lift' && run(`String(lift.ex)`)===firstEx,
   run(`view`)+" / "+run(`String(lift.ex)`));

/* and the first set ever IS the moment -- on day one there is nothing to
   finish yet, so waiting for the day-end button risks it never being seen */
run(`(function(){const t=day(todayISO);
  t.w.push({part:'Chest',ex:'Barbell Bench Press',w:toKg(135),reps:[10],at:1});
  setToast('Barbell Bench Press',toKg(135),10);})()`);
ok("the first set ever places the day", run(`!!document.getElementById('dayDone')`));
ok("...reading day one", run(`(document.querySelector('#dayDone .ddn')||{}).textContent`)==="1",
   run(`(document.querySelector('#dayDone .ddn')||{}).textContent`));

/* PREVIEW: the maker has 953 days and the only other way to see this screen
   was to log out. It must write NOTHING. */
run(`(function(){DB.days={}; delete DB.settings.dayDone;
  DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
  SEED=deriveAll(); d1={step:0,part:null,preview:true}; view='today'; render();})()`);
ok("preview shows day one over live data", /One set is day one/.test(txt()));
ok("...and says so, with a way out", /Preview/i.test(txt()) && run(`!!document.querySelector('[data-d1="exit"]')`));
const before=run(`JSON.stringify({d:DB.days,s:DB.settings})`);
/* tap the first lift ACTUALLY RENDERED. The first version of this line named
   'Dip', which is ninth in the Chest catalog and so is not in the list at all
   -- the tap hit nothing and the assertion passed on nothing. The guard could
   be deleted and this stayed green. Same hollow-fixture pattern as v3.3.346
   and v3.3.364: the fixture stopped containing its own case. */
tap('[data-d1="start"]'); tap('[data-d1part="Chest"]');
ok("preview reaches a real lift to tap", run(`document.querySelectorAll('[data-d1ex]').length`) > 0);
tap('[data-d1ex]');
ok("...choosing a lift in preview never opens the logger over live data",
   run(`view`)==='today', run(`view`));
tap('[data-d1="moment"]');
ok("...the ceremony can be seen without stamping the day",
   run(`!DB.settings.dayDone`));
ok("PREVIEW WROTE NOTHING", run(`JSON.stringify({d:DB.days,s:DB.settings})`)===before);
run(`(function(){const o=document.getElementById('dayDone'); if(o) o.remove();})()`);
tap('[data-d1="exit"]');
ok("...and exiting returns the real app", run(`d1.preview`)===false && !/One set is day one/.test(txt()));

/* from day two the shortcuts are gone: their whole justification is that
   there is nothing to show yet */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  DB.days[D(1)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
  SEED=deriveAll(); d1={step:0,part:null,preview:false}; view='today'; render();})()`);
ok("day two gets the normal app back", !/One set is day one/.test(txt()));

process.exit(fail?1:0);
