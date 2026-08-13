// test-bwfix.js DIR — v3.3.224 one-time repair of pre-convention bodyweight logs.
// This migration EDITS THE LEDGER, so the assertions are about what it must
// never touch as much as what it fixes: loaded lifts, runs, days logged under
// the new convention, and a second run.
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
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({measureText:()=>({width:10})},
  {get:(o,k)=>k in o?o[k]:()=>({})}); };
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

// A ledger in the shape the maker's actually is: bodyweight lifts carrying a
// total-system weight, alongside loaded lifts and a run.
run(`(function(){
  DB.days={}; DB.settings={...DB.settings, bwFixed:0, canon:{}, unit:'kg'};
  DB.days['2025-11-04']={w:[
    {part:'Chest',ex:'Dip',w:70,reps:[8,8],at:1},
    {part:'Back',ex:'Pull Up',w:70,reps:[10],at:2},
    {part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[8],at:3},
    {part:'Run',ex:'Run',w:5.2,reps:[],mins:30,at:4}],upd:1000};
  DB.days['2026-02-10']={w:[
    {part:'Back',ex:'Chin Up',w:68,reps:[6],at:5},
    {part:'Sixpack',ex:'Plank',w:0,reps:[60],at:6}],upd:2000};
  /* logged AFTER the convention: 10 kg on a belt, and it must survive */
  DB.days['2026-08-14']={w:[{part:'Back',ex:'Pull Up',w:10,reps:[6],at:7}],upd:3000};
  window._before=JSON.parse(JSON.stringify(DB.days));
  window._r=migrateBodyweight();})()`);

// ---- what it fixed
check("it reports the sets it changed", `window._r.sets`, 4);
check("...across the days it touched", `window._r.days`, 2);
check("a pre-convention Dip is bodyweight again", `DB.days['2025-11-04'].w[0].w`, 0);
check("...and so is the Pull Up beside it", `DB.days['2025-11-04'].w[1].w`, 0);
check("...and the Chin Up on another day", `DB.days['2026-02-10'].w[0].w`, 0);

// ---- what it must NOT touch
check("a loaded barbell lift is untouched", `DB.days['2025-11-04'].w[2].w`, 60);
check("the run keeps its distance — w is km there, not load",
      `DB.days['2025-11-04'].w[3].w`, 5.2);
check("a set logged UNDER the new convention keeps its belt weight",
      `DB.days['2026-08-14'].w[0].w`, 10);
check("...and that day's stamp is not bumped", `DB.days['2026-08-14'].upd`, 3000);
check("reps, order and metadata are preserved exactly",
      `(function(){const b=window._before, a=DB.days;
        return Object.keys(b).every(d=>b[d].w.every((s,i)=>{
          const t=a[d].w[i];
          return t.ex===s.ex && t.at===s.at && JSON.stringify(t.reps)===JSON.stringify(s.reps);
        }));})()`, true);
check("a bodyweight set already at zero is not counted as a change",
      `DB.days['2026-02-10'].w[1].w`, 0);

// ---- sync safety: the merge takes whole days by `upd`
check("every edited day gets a fresh stamp, so it wins the cloud merge",
      `DB.days['2025-11-04'].upd > 1000 && DB.days['2026-02-10'].upd > 2000`, true);

// ---- one-time
check("it stamps itself done", `DB.settings.bwFixed`, 1);
run(`(function(){
  DB.days['2025-11-04'].w[0].w=12;      // a deliberate later edit: BW+12 on an old day
  window._r2=migrateBodyweight();})()`);
check("a second run does nothing at all", `window._r2.already`, true);
check("...and leaves a deliberate BW+12 on an old date alone",
      `DB.days['2025-11-04'].w[0].w`, 12);

// ---- the display follows
run(`(function(){
  DB.days={}; DB.settings.bwFixed=0; DB.settings.canon={};
  DB.days['2025-11-04']={w:[{part:'Chest',ex:'Dip',w:70,reps:[8],at:1}],upd:1000};
  migrateBodyweight(); migrateCanon(); SEED=deriveAll();})()`);
check("the repaired set reads as plain bodyweight, not BW+70",
      `wTxt('Dip',DB.days['2025-11-04'].w[0].w)`, "BW");
check("...and contributes no phantom tonnage",
      `volOf(DB.days['2025-11-04'].w[0])`, 0);

process.exit(fail ? 1 : 0);
})();
