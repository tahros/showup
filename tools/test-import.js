// test-import.js DIR — v3.3.88: the import pipeline, end to end.
// Runs the REAL python converters on fixture CSVs, feeds the JSON through
// the same door Restore uses (doc adoption + upd stamping), then asserts
// what deriveAll() concludes — because the only truth that matters is what
// the app itself derives from the imported archive.
const { JSDOM } = require("jsdom");
const { execSync } = require("child_process");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage88";
// resolve() is load-bearing: with cwd:"/tmp" below, a relative T made
// python fail to OPEN the script — exiting 2, which coincidentally matched
// the bail code and produced a false PASS. Absolute paths or nothing.
const T = path.resolve(dir, "tools");

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

// ---- 0. the converters refuse to guess ------------------------------------
let code = 0, err = "";
try { execSync(`python3 ${T}/convert_strong.py ${T}/fixtures/strong_sample.csv -o /tmp/ti_s0.json`, {cwd:"/tmp", stdio:["pipe","pipe","pipe"]}); }
catch (e) { code = e.status; err = (e.stderr||"").toString(); }
ok("strong converter STOPS on an unknown exercise (exit 2, and SAYS so)",
   code === 2 && /UNMAPPED/.test(err), `${code} ${err.split("\n")[0]}`);
ok("...and writes mapping_todo.json for the operator",
   fs.existsSync("/tmp/mapping_todo.json"));
const todo = JSON.parse(fs.readFileSync("/tmp/mapping_todo.json", "utf8"));
ok("...listing exactly the unknown name", Object.keys(todo).join() === "mystery machine thing");

// ---- 1. convert both fixtures with mappings --------------------------------
fs.writeFileSync("/tmp/ti_map_s.json", JSON.stringify({"mystery machine thing":"Back"}));
fs.writeFileSync("/tmp/ti_map_h.json", JSON.stringify({"weird cable contraption":"Chest"}));
execSync(`python3 ${T}/convert_strong.py ${T}/fixtures/strong_sample.csv -m /tmp/ti_map_s.json -o /tmp/ti_s.json`);
execSync(`python3 ${T}/convert_hevy.py ${T}/fixtures/hevy_sample.csv -m /tmp/ti_map_h.json -o /tmp/ti_h.json`);
execSync(`python3 ${T}/import_validate.py /tmp/ti_s.json --strict`);
execSync(`python3 ${T}/import_validate.py /tmp/ti_h.json --strict`);
console.log("PASS both conversions validate --strict");

// ---- validator teeth: it must actually bite a marker row -------------------
const bad = JSON.parse(fs.readFileSync("/tmp/ti_s.json", "utf8"));
bad.doc.days["2024-03-04"].w.push({part:"Chest",ex:"Ghost",w:10,reps:[]});
fs.writeFileSync("/tmp/ti_bad.json", JSON.stringify(bad));
let vcode = 0, vout = "";
try { vout = execSync(`python3 ${T}/import_validate.py /tmp/ti_bad.json`).toString(); }
catch (e) { vcode = e.status; vout = e.stdout.toString(); }
ok("validator rejects a reps:[] marker row (the v3.3.61 scar)",
   vcode === 1 && /marker-rows/.test(vout));

// ---- 2. restore the Strong conversion into the live app --------------------
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

const restore = (file) => {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  // the exact core of restoreBackup(): adopt doc, stamp every day
  run(`(function(doc){
    const now=Date.now();
    for(const d of Object.keys(doc.days)) doc.days[d].upd=now;
    DB=doc; SEED=deriveAll();
  })(${JSON.stringify(j.doc)})`);
};

restore("/tmp/ti_s.json");
ok("Strong: 3 training days derived from 3 workout dates",
   run(`SEED.totals.sessions`) === 3, run(`SEED.totals.sessions`));
ok("...the warm-up counted as a set (days>volume: showing up is showing up)",
   run(`DB.days['2024-03-04'].w.filter(s=>s.ex==='Bench Press (Barbell)').length`) === 3);
ok("...weights landed in kg untouched",
   run(`DB.days['2024-03-04'].w[0].w`) === 60);
ok("...Lateral Raise mapped to Shoulder by the exact table",
   run(`DB.days['2024-03-04'].w.find(s=>s.ex.startsWith('Lateral')).part`) === "Shoulder");
ok("...the user mapping decided Mystery Machine Thing \u2192 Back",
   run(`DB.days['2024-03-08'].w.find(s=>s.ex==='Mystery Machine Thing').part`) === "Back");
ok("...the cardio row became a real Run entry (3.2km, 20:00)",
   run(`JSON.stringify((DB.days['2024-03-06'].w.find(s=>s.ex==='Run')||{}))`).includes('"w":3.2') &&
   run(`DB.days['2024-03-06'].w.find(s=>s.ex==='Run').mins`) === 20);
ok("...the zero-rep row was skipped, not smuggled in as a marker",
   run(`DB.days['2024-03-08'].w.filter(s=>s.ex.startsWith('Bent Over')).length`) === 0);
ok("...no reps:[] non-run row exists anywhere in the archive",
   run(`Object.values(DB.days).every(d=>(d.w||[]).every(s=>s.ex==='Run'||((s.reps||[]).length>0)))`));
ok("...every imported day carries an upd stamp",
   run(`Object.values(DB.days).every(d=>d.upd>0)`));

// ---- 3. and the Hevy conversion -------------------------------------------
restore("/tmp/ti_h.json");
ok("Hevy: 3 training days derived", run(`SEED.totals.sessions`) === 3, run(`SEED.totals.sessions`));
ok("...both start_time formats parsed onto the right days",
   run(`!!DB.days['2025-12-22'] && !!DB.days['2025-12-23'] && !!DB.days['2025-12-24']`));
ok("...weight_kg passed through untouched",
   run(`DB.days['2025-12-24'].w.find(s=>s.ex.startsWith('Bench')).w`) === 26);
ok("...the 5.1km / 35:00 run survived with its time",
   run(`(DB.days['2025-12-23'].w[0]||{}).w`) === 5.1 &&
   run(`(DB.days['2025-12-23'].w[0]||{}).mins`) === 35);
ok("...Hevy's warmup set_type is still a set",
   run(`DB.days['2025-12-22'].w.filter(s=>s.ex.startsWith('Pull Up')).length`) === 2);

// ---- 4. the round-trip: what Backup writes, Restore accepts ---------------
const exported = run(`JSON.stringify({app:'showup',v:APP_VERSION,exported:new Date().toISOString(),doc:DB})`);
fs.writeFileSync("/tmp/ti_rt.json", exported);
execSync(`python3 ${T}/import_validate.py /tmp/ti_rt.json --strict`);
console.log("PASS the app's own Backup validates --strict (round-trip closed)");

// ---- 5. the settings router lesson, enforced at the source ----------------
const setSrc = fs.readFileSync(path.join(dir, "js/settings.js"), "utf8");
ok("settings.js click router no longer uses e.target.id===",
   !/e\.target\.id===/.test(setSrc.split("addEventListener('click'")[1].split("addEventListener")[0]));

process.exit(fail ? 1 : 0);
