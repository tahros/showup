// test-plan.js DIR — v3.3.203 the Plan tab.
// The load-bearing assertion in this file is the FIRST section: a plan must
// never enter the ledger. Everything derived in this app reads DB.days as
// the record of what happened, so a planned session leaking into it would
// corrupt the streak, coverage, rep zones and intent gaps at once.
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

// ---- the tab exists and routes
check("Plan is the fifth tab, at the far right",
      `[...document.querySelectorAll('#nav button')].map(b=>b.dataset.v).join(',')`,
      "today,lift,stats,history,plan");
check("...and is in the swipe order", `${/'today','lift','stats','history','plan'/.test(
      fs.readFileSync(path.join(dir,"js/util.js"),"utf8"))}`, "true");

// ---- fixture: a real Legs history to draft from
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={}; DB.settings.canon={}; DB.settings.plans=[];
  for(const n of [2,5,8,11]) DB.days[D(n)]={w:[
    {part:'Legs',ex:'Squat',w:100,reps:[12,12,10],at:n},
    {part:'Legs',ex:'Leg Press',w:150,reps:[12,12],at:n+100}],upd:1};
  DB.days[D(3)]={w:[{part:'Legs',ex:'Dumbbell Lunge',w:20,reps:[10],at:9}],upd:1};
  migrateCanon(); SEED=deriveAll(); view='plan'; render();
  window._before=JSON.stringify(DB.days);})()`);

// ==== CHURCH AND STATE — the assertion the feature rests on ====
run(`window._p=draftPlan('Legs'); savePlan(window._p);`);
check("drafting and saving a plan does not touch the ledger",
      `JSON.stringify(DB.days)===window._before`, true);
check("...and plans live outside DB.days entirely",
      `!('plans' in DB.days) && Array.isArray(DB.settings.plans)`, true);
check("...so re-deriving yields the same trained days as before",
      `(function(){const dates=deriveAll().dates.join(',');
        const past=Object.keys(JSON.parse(window._before)).filter(d=>d<todayISO).sort().join(',');
        return dates===past;})()`, true);
check("...and no plan row appears as a trained set",
      `Object.values(DB.days).every(d=>(d.w||[]).every(s2=>s2.plan===undefined))`, true);

// ---- the draft derives from authorities that already exist
check("the draft is titled for the body part", `window._p.part`, "Legs");
check("rows come from the group's trained exercises, most-trained first",
      `window._p.rows[0].ex`, "Squat");
check("...capped so a plan stays one session",
      `window._p.rows.length <= PLAN_ROWS_MAX`, true);
check("the load is the last working weight actually lifted",
      `window._p.rows[0].w`, 100);
check("...and the target reps sit inside the growth window",
      `(function(){const r=window._p.rows[0].reps;
        return r>REPZONE_MAX_STRENGTH && r<=REPZONE_MAX_GROWTH;})()`, true);
check("the note is the reading's own sentence, not a second engine",
      `(function(){const rd=repZoneReading(window._p.rows[0].cid);
        const g=rd&&rd.find(x=>/^Growth/.test(x[0]));
        return !g || window._p.rows[0].note===g[1].replace(/^\\d+ sets?\\.\\s*/,'');})()`, true);
check("an exercise with no history contributes no row",
      `window._p.rows.every(r=>r.ex!=='Nordic Hamstring Curl')`, true);

// ---- purity: same ledger in, same plan out
check("draftPlan is pure apart from its id/timestamp",
      `(function(){const a=draftPlan('Legs'),b=draftPlan('Legs');
        return JSON.stringify(a.rows)===JSON.stringify(b.rows);})()`, true);

// ---- the editor: every drafted line is overwritable
run(`planDraft=draftPlan('Legs'); render();`);
check("the editor renders a row per exercise",
      `document.querySelectorAll('.plrow').length`, `${run(`planDraft.rows.length`)}`);
run(`(function(){
  const n=document.querySelector('[data-pln="0"]');
  n.value='THE exercise for width'; n.dispatchEvent(new window.Event('input',{bubbles:true}));
  const wv=document.querySelector('[data-plw="0"]');
  wv.value='105'; wv.dispatchEvent(new window.Event('input',{bubbles:true}));})()`);
check("editing a note writes to the draft", `planDraft.rows[0].note`, "THE exercise for width");
check("editing a weight writes to the draft", `planDraft.rows[0].w`, 105);
check("...and STILL nothing reached the ledger",
      `JSON.stringify(DB.days)===window._before`, true);

// ---- removing a row, saving, reopening, deleting
run(`(function(){const n=planDraft.rows.length;
  document.querySelector('[data-pldel="1"]').click(); window._afterDel=planDraft.rows.length===n-1;})()`);
check("a row can be removed before saving", `window._afterDel`, true);
run(`document.querySelector('#plSave').click();`);
check("saving clears the draft and stores the plan",
      `planDraft===null && DB.settings.plans.length>=1`, true);
check("the saved plan keeps the tailored note",
      `DB.settings.plans[0].rows[0].note`, "THE exercise for width");
check("saved plans are listed", `!!document.querySelector('[data-plopen]')`, true);
run(`document.querySelector('[data-plopen]').click();`);
check("reopening a saved plan loads it for editing",
      `!!planDraft && planDraft.rows[0].note==='THE exercise for width'`, true);
/* render() rebuilds the list on each delete, so a captured NodeList goes
   stale after the first click — re-query until none remain */
run(`planDraft=null; render();
  for(let i=0;i<10;i++){const b=document.querySelector('[data-pldrop]'); if(!b) break; b.click();}`);
check("deleting removes every saved plan", `DB.settings.plans.length`, 0);
check("...and the ledger is STILL untouched", `JSON.stringify(DB.days)===window._before`, true);

// ---- register: a plan must not read as a record
check("the tab explains that plans never enter the log",
      `/never enter your log/.test(document.querySelector('#view').textContent)
       || /never enter your log/.test(String(renderPlan))`, true);

process.exit(fail ? 1 : 0);
})();
