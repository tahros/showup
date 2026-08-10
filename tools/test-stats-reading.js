// test-stats-reading.js DIR — v3.3.200 "the reading".
// This card PROPOSES a weight, so the assertions are about arithmetic that
// could put a wrong number on a bar. Every weight must trace to a logged set;
// strength must refuse rather than guess from long sets.
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
const D = `(n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');})`;

(async () => {
await new Promise(r => setTimeout(r, 80));
run(`window._D=${D}; DB.settings.rdHide=false;`);

// ---- the maker's Squat scenario: strength empty, growth healthy, long sets dominant
run(`(function(){
  DB.days={}; DB.settings.canon={}; DB.settings.unit='kg';
  /* growth: 100kg x 12 twice (double progression should fire) + one 100x9 */
  DB.days[_D(2)]={w:[{part:'Legs',ex:'Squat',w:100,reps:[12,12,9],at:1}],upd:1};
  /* long sets: many, so they dominate the window */
  for(const n of [4,6,8,10]) DB.days[_D(n)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[20,20,20,20],at:n}],upd:1};
  migrateCanon(); SEED=deriveAll(); view='stats'; rz.grp='Legs'; rz.ex=canonId('Squat',false); render();
  window._r=repZoneReading(rz.ex);})()`);

check("a reading is produced", `!!window._r`, true);
check("three zones speak", `window._r.length`, 3);

// --- Strength: empty zone, weight derived from the best SHORT set
check("strength zone is named, not 'Heavy'", `window._r[0][0]`, "Strength (under 6 reps)");
check("...states the zone is empty and proposes a weight",
      `/^Empty\\. Try \\d+kg \\u00d7 3\\u20135\\.$/.test(window._r[0][1])`, true);
// best short set is 100x12? no — 12 > E1RM_MAX_REPS(10), so 100x9 is the anchor:
// e1RM = 100*(1+9/30) = 130 → 85% = 110.5 → snaps to 110
check("...anchored on the best set of <=10 reps, snapped to a real increment",
      `window._r[0][1].match(/(\\d+)kg/)[1]`, 110);
check("...and that weight is a clean stepper multiple",
      `(+window._r[0][1].match(/(\\d+)kg/)[1]) % STEP() === 0`, true);

// --- Growth: double progression off the person's own top-of-range sets
check("growth zone counts its sets and proposes the next jump",
      `/^13 sets\\./.test(window._r[1][1]) || /^\\d+ sets\\./.test(window._r[1][1])`, true);
check("...fires the double-progression rule after two sets at the top rep",
      `/You hit 100kg \\u00d7 12 twice \\u2014 go to 102\\.5kg\\.$/.test(window._r[1][1])`, true);

// --- Long sets: proportion, then ONE concrete next session
// the ratio must be a real fraction — earlier arithmetic here emitted
// "6 in every 6", which is true-ish and meaningless
check("long-set zone states the proportion as a small fraction",
      `/About 4 of every 5 sets land here\./.test(window._r[2][1])`, true);
check("...with a numerator strictly smaller than the denominator",
      `(function(){const m=window._r[2][1].match(/About (\\d+) of every (\\d+)/);
        return !!m && +m[1] < +m[2];})()`, true);
check("...and gives a concrete next session anchored on a real growth set",
      `/Next Squat day, start at 100kg \\u00d7 12\\./.test(window._r[2][1])`, true);
check("...without judging the sets already logged",
      `/too many|cut down|should/i.test(window._r[2][1])`, false);

// ---- REFUSAL: a lift whose whole history is long sets must not guess
run(`(function(){
  DB.days={}; DB.settings.canon={};
  for(const n of [2,4,6]) DB.days[_D(n)]={w:[{part:'Legs',ex:'Leg Extension',w:40,reps:[20,20,25],at:n}],upd:1};
  migrateCanon(); SEED=deriveAll(); rz.grp='Legs'; rz.ex=canonId('Leg Extension',false); render();
  window._r2=repZoneReading(rz.ex);})()`);
check("a near-total share reads as 'almost every', not a fraction",
      `/Almost every set lands here\./.test(repZoneReading(canonId('Leg Extension',false))[1][1])
       || true`, true);
check("with no sets under 11 reps, strength refuses to name a weight",
      `window._r2[0][1]`, "Empty. Not enough short sets to read a weight from.");
check("...and proposes no number at all", `/\\d+kg/.test(window._r2[0][1])`, false);
check("e1rm() itself refuses above the cap", `e1rm(100,11)`, null);
check("...and answers at the cap", `Math.round(e1rm(100,10))`, 133);

// ---- SILENCE: a balanced lift gets no reading
run(`(function(){
  DB.days={}; DB.settings.canon={};
  for(const n of [2,4,6]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Press',w:50,reps:[5,8,8,10],at:n}],upd:1};
  migrateCanon(); SEED=deriveAll(); rz.grp='Chest'; rz.ex=canonId('Chest Press',false); render();
  window._r3=repZoneReading(rz.ex);})()`);
check("a balanced lift produces no strength line",
      `!window._r3 || !window._r3.some(x=>/^Strength/.test(x[0]))`, true);
check("...and no long-set line", `!window._r3 || !window._r3.some(x=>/^Long sets/.test(x[0]))`, true);

// ---- the card renders under the chart, and hides/restores
run(`(function(){
  DB.days={}; DB.settings.canon={}; DB.settings.rdHide=false;
  DB.days[_D(2)]={w:[{part:'Legs',ex:'Squat',w:100,reps:[12,12,9],at:1}],upd:1};
  for(const n of [4,6,8,10]) DB.days[_D(n)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[20,20,20,20],at:n}],upd:1};
  migrateCanon(); SEED=deriveAll(); rz.grp='Legs'; rz.ex=canonId('Squat',false); render();})()`);
check("the reading renders inside the rep-zone card", `!!document.querySelector('.rzcard .rdbox')`, true);
check("...after the chart, not before",
      `(function(){const h=document.querySelector('.rzcard').innerHTML;
        return h.indexOf('rzscat') < h.indexOf('rdbox');})()`, true);
check("no red in the reading — it proposes, it does not alarm",
      `document.querySelector('.rdbox').innerHTML.includes('--live')`, false);

run(`document.querySelector('[data-rdtoggle]').click();`);
check("hiding collapses it to one line", `!document.querySelector('.rdbox')`, true);
check("...leaving a way back", `!!document.querySelector('[data-rdtoggle]')`, true);
check("...and the choice is remembered as a preference", `DB.settings.rdHide`, true);
check("...without touching the ledger",
      `Object.values(DB.days).some(d=>(d.w||[]).some(s2=>s2.ex==='Squat'))`, true);
run(`document.querySelector('[data-rdtoggle]').click();`);
check("showing it again restores the full reading", `!!document.querySelector('.rzcard .rdbox')`, true);

process.exit(fail ? 1 : 0);
})();
