// test-stats-intent-gaps.js DIR — v3.3.192 "Stated, not trained".
// The ledger already knows which intentions never became training. These
// assert the RENDERED list and RESOLVED state, never the template source.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

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

(async () => {
await new Promise(r => setTimeout(r, 80));

// ---- fixture straddling the threshold on BOTH sides, plus a zero-set row
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={}; DB.settings.canon={}; DB.settings.retired={};
  /* a stated intention that never became training */
  DB.days[D(30)]={w:[{part:'Shoulder',ex:'Rear Deltoids',w:27.5,reps:[],at:1}],upd:1};
  /* 22 days since a completed set → over the line */
  DB.days[D(22)]={w:[{part:'Legs',ex:'Dumbbell Lunge',w:23,reps:[10],at:2}],upd:1};
  /* 20 days → under the line */
  DB.days[D(20)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[12],at:3}],upd:1};
  /* trained long ago BUT with a zero-rep row since — must not reset the clock */
  DB.days[D(40)]={w:[{part:'Triceps',ex:'Overhead Triceps Extension',w:12.5,reps:[8],at:4}],upd:1};
  DB.days[D(2)]={w:[{part:'Triceps',ex:'Overhead Triceps Extension',w:12.5,reps:[],at:5}],upd:1};
  migrateCanon(); SEED=deriveAll(); view='stats'; render();})()`);

const NAMES = `[...document.querySelectorAll('.igcard .igname')].map(n=>n.textContent)`;
const ROW = n => `[...document.querySelectorAll('.igcard .igrow')].find(r=>r.textContent.includes(${JSON.stringify(n)}))`;

// ---- 1. the zero-set row reads as never-logged, not as a day count
check("a stated-but-never-trained exercise surfaces", `${NAMES}.includes('Rear Deltoids')`, true);
check("...worded as never logged, not as a number of days",
      `${ROW('Rear Deltoids')}.querySelector('.igwhen').textContent`, "never logged with reps");
check("...and carries no day count at all",
      `!${ROW('Rear Deltoids')}.querySelector('.igwhen b')`, true);

// ---- 2. boundary, either side of the constant
check("22 days since a completed set surfaces", `${NAMES}.includes('Dumbbell Lunge')`, true);
check("...stated as a day count", `${ROW('Dumbbell Lunge')}.querySelector('.igwhen b').textContent`, 22);
check("20 days does NOT surface", `${NAMES}.includes('Chest Fly')`, false);
check("the boundary is the constant itself", `INTENT_GAP_DAYS`, 21);

// ---- 5. a zero-rep row does not reset the clock
check("a later zero-rep row leaves the exercise stale",
      `${NAMES}.includes('Overhead Triceps Extension')`, true);
check("...measured from the last COMPLETED set, not the empty row",
      `+${ROW('Overhead Triceps Extension')}.querySelector('.igwhen b').textContent`, 40);

// ---- ordering: never-logged leads
check("never-logged sorts above day counts", `${NAMES}[0]`, "Rear Deltoids");

// ---- 3. one definition site (structural, per the suite idiom)
const src = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
check("INTENT_GAP_DAYS defined exactly once",
      `${(src.match(/const\s+INTENT_GAP_DAYS\s*=/g)||[]).length}`, 1);

// ---- register: facts only. No scolding, no scoring, no red.
check("no compliance percentage in the card",
      `/%/.test(document.querySelector('.igcard').textContent)`, false);
check("no red anywhere — red means live",
      `document.querySelector('.igcard').innerHTML.includes('--live')`, false);

// ---- 4. retire, and un-retire from Settings
run(`document.querySelector('[data-igretire]').click();`);
check("retiring removes it from the list", `${NAMES}.includes('Rear Deltoids')`, false);
check("...others are untouched", `${NAMES}.includes('Dumbbell Lunge')`, true);
check("...and the ledger is NOT edited — Stats never writes",
      `Object.values(DB.days).some(d=>(d.w||[]).some(s2=>s2.ex==='Rear Deltoids'))`, true);
run(`view='sync'; render();`);
check("Settings offers it back", `!!document.querySelector('[data-igback]')`, true);
run(`document.querySelector('[data-igback]').click(); view='stats'; render();`);
check("un-retiring restores it", `${NAMES}.includes('Rear Deltoids')`, true);

// ---- 6. grouped by canonical id: a rename leaves no ghost beside itself
run(`(function(){
  const id=canonId('Dumbbell Lunge',false);
  canon()[id].name='DB Lunge';
  for(const d of Object.values(DB.days)) for(const s2 of (d.w||[])) if(s2.cid===id) s2.ex='DB Lunge';
  migrateCanon(); SEED=deriveAll(); render();})()`);
check("the renamed exercise appears once, under its new name",
      `${NAMES}.filter(n=>n==='DB Lunge').length`, 1);
check("...with no ghost under the old name", `${NAMES}.includes('Dumbbell Lunge')`, false);

// ---- 7. empty state: plain, and not congratulated
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={}; DB.settings.canon={}; DB.settings.retired={};
  DB.days[D(2)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[12],at:9}],upd:1};
  migrateCanon(); SEED=deriveAll(); render();})()`);
check("nothing qualifies → no rows", `document.querySelectorAll('.igcard .igrow').length`, 0);
check("...and one plain line says so",
      `document.querySelector('.igcard').textContent.trim()`, "Nothing stated and untrained.");
check("...with no congratulation",
      `/nice|great|well done|good job|keep/i.test(document.querySelector('.igcard').textContent)`, false);

process.exit(fail ? 1 : 0);
})();
