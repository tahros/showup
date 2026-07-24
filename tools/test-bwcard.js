// test-bwcard.js DIR — v3.3.67: the weight card, the inline weigh-in, and the
// adoption of bwNow() at the two places that still read the old scalar.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage67";

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

const SET = `{part:'Chest',ex:'Chest Press',w:40,reps:[10]}`;
const fresh = `DB.days={
  '2024-01-10':{w:[${SET}]},
  '2024-06-15':{w:[${SET}]},
  '2025-03-01':{w:[${SET}]}
}; DB.settings.bodyKg=70; DB.settings.unit='kg'; delete DB.settings.bwSeeded;
   bwEdit=false; SEED=deriveAll();`;

// ---- 1. the empty state asks once, quietly --------------------------------
run(`${fresh} DB.settings.bodyKg=null; bwCard();`);
check("no entries and no scalar → the Add affordance", `/id="bwEditBtn"/.test(bwCard())`, true);
check("...and it says so plainly", `/No weight recorded yet/.test(bwCard())`, true);
check("...with no chart drawn", `/<svg/.test(bwCard())`, false);

// ---- 2. one entry is a NUMBER, not a flat line ----------------------------
run(`${fresh} setBw('2024-01-10', 70);`);
check("one entry draws no chart", `/<svg/.test(bwCard())`, false);
check("...it states the value", `/70 <span/.test(bwCard())`, true);
check("...and names it unchanged since the entry", `/unchanged since/.test(bwCard())`, true);

// ---- 3. two entries draw a STEP path --------------------------------------
run(`setBw('2025-03-01', 68);`);
const svg = () => run(`bwCard()`);
check("two entries draw a chart", `/<svg/.test(bwCard())`, true);
check("...as a path, not a polyline of raw points", `/<path d="M /.test(bwCard())`, true);
// A step means each segment is a horizontal run then a vertical drop: every
// interior "L" pair shares an x. A smooth line would draw days never measured.
const d = (svg().match(/<path d="([^"]+)"/) || [])[1] || "";
const cmds = d.split(/(?=[ML])/).map(s => s.trim()).filter(Boolean);
const xs = cmds.map(c => parseFloat(c.replace(/^[ML]\s*/, "").split(/\s+/)[0]));
const stepped = xs.length >= 4 && xs[1] === xs[2];
console.log((stepped?"PASS":"FAIL"), "the line steps (a run then a jump at the same x) →", stepped);
if (!stepped) fail++;
const lastX = xs[xs.length - 1];
const carried = lastX > xs[xs.length - 2] - 0.001;
console.log((carried?"PASS":"FAIL"), "the last weight extends to today →", carried);
if (!carried) fail++;
check("the net change is stated neutrally", `/-2 kg net/.test(bwCard())`, true);
check("no goal line is drawn", `/goal/i.test(bwCard())`, false);

// ---- 4. a near-flat series must not amplify into noise --------------------
run(`${fresh} setBw('2024-01-10',70); setBw('2025-03-01',70.2);`);
const d2 = (run(`bwCard()`).match(/<path d="([^"]+)"/) || [])[1] || "";
const ys = d2.split(/(?=[ML])/).map(s => parseFloat(s.replace(/^[ML]\s*/, "").split(/\s+/)[1])).filter(n => !isNaN(n));
const spreadOK = (Math.max(...ys) - Math.min(...ys)) < 40;   // 0.2kg must not fill the box
console.log((spreadOK?"PASS":"FAIL"), "a 0.2kg move does not fill the chart →", spreadOK);
if (!spreadOK) fail++;

// ---- 5. the inline weigh-in: edit → save → recorded on TODAY --------------
run(`${fresh} setBw('2024-01-10',70); view='stats'; renderStats();`);
check("stats renders the weight section", `/id="secWeight"/.test($('#view').innerHTML)`, true);
run(`bwEdit=true;`);
check("edit mode offers an input", `/id="bwIn"/.test(bwCard())`, true);
check("...prefilled with the current weight", `/value="70"/.test(bwCard())`, true);
check("...and a save button", `/id="bwSave"/.test(bwCard())`, true);

run(`${fresh} setBw('2024-01-10',70); bwEdit=false; view='stats'; renderStats();
     $('#view').querySelector('#bwEditBtn').click();`);
check("tapping Update opens the editor", `bwEdit`, true);
run(`$('#bwIn').value='68.5'; $('#bwSave').click();`);
check("saving closes the editor", `bwEdit`, false);
check("...records the change against TODAY", `DB.days[todayISO].bw`, 68.5);
check("...and the current value follows", `bwNow()`, 68.5);
check("...and the derived scalar follows too", `DB.settings.bodyKg`, 68.5);

// ---- 6. an UNCHANGED number records nothing — the whole rule --------------
run(`${fresh} setBw('2024-01-10',70); delete DB.days[todayISO];
     bwEdit=false; view='stats'; renderStats();
     $('#view').querySelector('#bwEditBtn').click(); $('#bwIn').value='70'; $('#bwSave').click();`);
check("re-entering the same weight records no new entry",
      `!!(DB.days[todayISO]&&DB.days[todayISO].bw)`, false);
check("...and the series is untouched", `bwDays().length`, 1);

// ---- 7. the streak guard still holds after a weigh-in through the UI ------
run(`${fresh} setBw('2024-01-10',70); SEED=deriveAll(); globalThis.__b=SEED.totals.sessions;
     delete DB.days[todayISO]; bwEdit=false; view='stats'; renderStats();
     $('#view').querySelector('#bwEditBtn').click(); $('#bwIn').value='69'; $('#bwSave').click();
     SEED=deriveAll();`);
check("a UI weigh-in still adds no training day", `SEED.totals.sessions === __b`, true);

// ---- 8. bwNow() is adopted where the scalar used to be read ---------------
const liftSrc = fs.readFileSync(path.join(dir, "js/lift.js"), "utf8");
const utilSrc = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
const liftOK = /isBody\(ex\)\)\s*lift\.weight=bwNow\(\)/.test(liftSrc);
console.log((liftOK?"PASS":"FAIL"), "lift.js logger default reads bwNow() →", liftOK);
if (!liftOK) fail++;
const capOK = /Math\.abs\(totalKg-\(bwNow\(\)\|\|-1\)\)/.test(utilSrc);
console.log((capOK?"PASS":"FAIL"), "loadLine caption compares against bwNow() →", capOK);
if (!capOK) fail++;
// no app-logic file may read the scalar directly any more (derive's migration
// and core's provenance comment are the only legitimate mentions)
for (const f of ["js/lift.js", "js/stats.js", "js/history.js", "js/header.js"]) {
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  const bad = /DB\.settings\.bodyKg/.test(src);
  console.log((bad?"FAIL":"PASS"), `${f} no longer reads the scalar →`, !bad);
  if (bad) fail++;
}

// ---- 9. the logger actually picks up a new weigh-in -----------------------
run(`${fresh} setBw('2024-01-10',70); setBw(todayISO, 66);
     lift.part='Back'; lift.ex='Pull Up'; lift.weight=0; renderLift();`);
check("a bodyweight lift defaults to the CURRENT weigh-in", `lift.weight`, 66);

process.exit(fail ? 1 : 0);
