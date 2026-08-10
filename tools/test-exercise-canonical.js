// test-exercise-canonical.js DIR — v3.3.191 canonical exercise identity.
// The layer exists so the app counts by identity, not by a string the person
// can edit. Assertions are on RESOLVED STATE and RENDERED OUTPUT, never on
// template source. Exit codes, no FAIL-grep.
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

// ---- 1. exact / case-fold / whitespace-collapse all land on one id
run(`DB.settings.canon={}; canonId('Chest Fly',true);`);
check("exact match resolves", `canonId('Chest Fly',false)`, "chest-fly");
check("case-insensitive match resolves to the SAME id", `canonId('chest fly',false)`, "chest-fly");
check("whitespace-normalised match resolves to the same id", `canonId('  Chest   Fly ',false)`, "chest-fly");
check("...and none of that minted a second entry", `Object.keys(canon()).length`, 1);

// ---- 2. NEGATIVE: near-neighbours must stay apart. This is the assertion
// that stops a future "helpful" fuzzy matcher from collapsing real movements.
run(`canonId('Chest Squeeze',true); canonId('Cable Fly Up',true);`);
check("'Chest Squeeze' is its own movement", `canonId('Chest Squeeze',false)!=='chest-fly'`, true);
check("'Cable Fly Up' is its own movement", `canonId('Cable Fly Up',false)!=='chest-fly'`, true);
check("three similar names → three ids", `Object.keys(canon()).length`, 3);

// ---- fixture: a ledger written the way the app writes one
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.settings.canon={}; DB.days={};
  DB.days[D(3)]={w:[
    {part:'Chest',ex:'Chest Fly',w:40,reps:[10,10],at:1},
    {part:'Chest',ex:'Chest Squeeze',w:11,reps:[12],at:2}],upd:1};
  DB.days[D(10)]={w:[{part:'Chest',ex:'chest fly',w:38,reps:[12],at:3}],upd:1};
  window._rep=migrateCanon(); SEED=deriveAll();})()`);

// ---- 3. idempotent
run(`window._state1=JSON.stringify([DB.days,canon()]);
     window._rep2=migrateCanon();
     window._state2=JSON.stringify([DB.days,canon()]);`);
check("second migration changes nothing", `window._state1===window._state2`, true);
check("...and stamps no further rows", `window._rep2.stamped`, 0);
check("the report names every distinct source string",
      `Object.keys(window._rep.report).sort().join('|')`, "Chest Fly|Chest Squeeze|chest fly");
check("...and the two casings of one name share an id",
      `window._rep.report['Chest Fly']===window._rep.report['chest fly']`, true);

// ---- 4. non-destructive: the string as logged survives on the row
check("the raw logged string is preserved verbatim",
      `(function(){const d=Object.keys(DB.days).sort()[0];
        return DB.days[d].w[0].ex;})()`, "chest fly");
check("...alongside its canonical id",
      `(function(){const d=Object.keys(DB.days).sort()[0];
        return DB.days[d].w[0].cid;})()`, "chest-fly");

// ---- the dedupe signature must NOT see the derived id, or a migrated
// device stops recognising an un-migrated device's identical sets
check("cid is excluded from the dedupe signature",
      `(function(){const a={part:'Chest',ex:'Chest Fly',w:40,reps:[10],at:9};
        const b={...a,cid:'chest-fly'};
        return sig(a)===sig(b);})()`, true);

// ---- 7. minting: an unknown string creates ONE entry, not one per set
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days[D(4)]={w:[
    {part:'Back',ex:'Meadows Row',w:30,reps:[8],at:11},
    {part:'Back',ex:'Meadows Row',w:35,reps:[8],at:12},
    {part:'Back',ex:'Meadows Row',w:40,reps:[6],at:13}],upd:1};
  migrateCanon(); SEED=deriveAll();})()`);
check("three sets of one new exercise mint exactly one entry",
      `Object.values(canon()).filter(e=>e.name==='Meadows Row').length`, 1);

// ---- 6. REGRESSION: renaming the display name must not split the series.
// This is the latent Rep Zones bug the layer exists to fix.
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.settings.canon={}; DB.days={};
  for(const n of [3,10,17]) DB.days[D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[10,10],at:n}],upd:1};
  migrateCanon(); SEED=deriveAll();
  window._beforeSets=repZoneData('chest-fly',10).counts.reduce((a,b)=>a+b,0);
  /* the person renames it — display name only, id untouched */
  canon()['chest-fly'].name='Cable Chest Fly';
  for(const d of Object.values(DB.days)) for(const s2 of (d.w||[])) s2.ex='Cable Chest Fly';
  migrateCanon(); SEED=deriveAll();})()`);
check("a rename does not mint a second id",
      `Object.keys(canon()).length`, 1);
check("...and the series keeps every set it had",
      `repZoneData('chest-fly',10).counts.reduce((a,b)=>a+b,0)===window._beforeSets && window._beforeSets>0`, true);
check("...under the new display name",
      `canonName('chest-fly')`, "Cable Chest Fly");

// ---- 5. merge: sets move, the losing name becomes an alias, re-logging
// the old string lands on the target
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.settings.canon={}; DB.days={}; DB.settings.exW={}; DB.settings.partOv={};
  DB.days[D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:40,reps:[10,10],at:1}],upd:1};
  DB.days[D(6)]={w:[{part:'Chest',ex:'Cable Fly Up',w:20,reps:[12,12,12],at:2}],upd:1};
  migrateCanon();
  DB.settings.exW['Cable Fly Up']=20; DB.settings.partOv['Cable Fly Up']='Chest';
  window._moved=canonMerge('cable-fly-up','chest-fly'); SEED=deriveAll();})()`);
check("merge moves every set of the losing exercise", `window._moved`, 3);
check("no row still carries the old id",
      `Object.values(DB.days).some(d=>(d.w||[]).some(s2=>s2.cid==='cable-fly-up'))`, false);
check("the losing entry is gone", `'cable-fly-up' in canon()`, false);
check("...its name became an alias of the target",
      `canon()['chest-fly'].al.includes('Cable Fly Up')`, true);
check("re-logging the old string now resolves to the target",
      `canonId('Cable Fly Up',false)`, "chest-fly");
check("name-keyed user state travelled with the merge (working weight)",
      `DB.settings.exW['Chest Fly']`, 20);
check("...and the part override", `DB.settings.partOv['Chest Fly']`, "Chest");
check("the merged series counts BOTH exercises' sets",
      `repZoneData('chest-fly',10).counts.reduce((a,b)=>a+b,0)`, 5);

// ---- the Settings affordance: honest in both states
run(`_mg={from:'',to:''}; view='sync'; render();`);
check("with one exercise left, the picker says there's nothing to merge",
      `!document.querySelector('#mgFrom') && /Nothing to merge/.test(document.querySelector('#view').textContent)`, true);
run(`canonId('Lat Pulldown',true); render();`);
check("with two, Settings offers the picker", `!!document.querySelector('#mgFrom')`, true);
check("no confirm button until both sides are chosen", `!document.querySelector('#mgGo')`, true);
run(`_mg={from:'lat-pulldown',to:'chest-fly'}; render();`);
check("choosing both reveals the confirm", `!!document.querySelector('#mgGo')`, true);
check("...which states where the sets go",
      `/sets? will move to/.test(document.querySelector('#view').textContent)`, true);
check("...and is honest that there is no un-merge",
      `/no un-merge/.test(document.querySelector('#view').textContent)`, true);

process.exit(fail ? 1 : 0);
})();
