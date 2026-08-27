// test-muscle-coverage.js DIR — v3.3.194 muscle–exercise taxonomy + coverage.
// Assertions on resolved data and rendered output. Exit codes, no FAIL-grep.
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

// ---- structural: every catalog exercise (bar Run) has a primary muscle in a
// visible group. This is the whole-catalog dry run, as an assertion.
check("every catalog exercise maps to a primary muscle",
      `Object.keys(SEED0.ex2part).filter(e=>e!=='Run'&&!EX_MUSCLE[e]).length`, 0);
check("every mapped muscle rolls up to a visible group",
      `[...new Set(Object.values(EX_MUSCLE))].filter(m=>!MUSCLE_VISIBLE[m]).length`, 0);
check("six visible groups, as specced", `VISIBLE_GROUPS.length`, 6);

// ---- fixture: 3 days inside the window, 1 outside; Run present
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={}; DB.settings.canon={};
  DB.days[D(1)]={w:[
    {part:'Back',ex:'Deadlift',w:100,reps:[5,5,5],at:1},          /* primary: hamstrings → Legs */
    {part:'Back',ex:'Pull Up',w:0,reps:[8,8],at:2},               /* lats → Back */
    {part:'Run',ex:'Run',w:3.5,reps:[],mins:27,secs:0,at:3}],upd:1};
  DB.days[D(3)]={w:[{part:'Legs',ex:'Hip Thrust',w:80,reps:[10,10],at:4}],upd:1};   /* glutes → visible Legs */
  DB.days[D(5)]={w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8,8],at:5}],upd:1};
  DB.days[D(9)]={w:[{part:'Biceps',ex:'Barbell Curl',w:30,reps:[10],at:6}],upd:1};  /* outside window */
  migrateCanon(); SEED=deriveAll(); view='stats'; render();})()`);

// ---- 1. Deadlift day: primary only, exactly once
check("Deadlift and Hip Thrust both roll into visible Legs",
      `(function(){const c=muscleCoverage();return c.groups['Legs'].days.size+'-'+c.groups['Legs'].sets;})()`, "2-5");
check("Glutes remains an internal muscle with only Hip Thrust's sets",
      `(function(){const c=muscleCoverage();return c.groups['Legs'].mus['glutes'].sets;})()`, 2);
check("Deadlift's primary hamstrings remain separate internally",
      `(function(){const c=muscleCoverage();return c.groups['Legs'].mus['hamstrings'].sets;})()`, 3);
check("secondaries are recorded but never counted",
      `(function(){const c=muscleCoverage();
        const total=Object.values(c.groups).reduce((a,g)=>a+g.sets,0);
        return total;})()`, 10);   /* 3+2+2+3 — one credit per set, no doubles */
check("the run credited nothing", 
      `(function(){const c=muscleCoverage();
        return Object.values(c.groups).every(g=>!g.mus['run']);})()`, true);
check("a set outside the 7-day window is not counted",
      `(function(){const c=muscleCoverage();return c.groups['Arms'].sets;})()`, 0);

// ---- 2. rollup: lats vs upper-back both land in Back
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days[D(2)]={w:[{part:'Back',ex:'Seated Cable Row',w:40,reps:[12],at:7}],upd:1};
  SEED=deriveAll(); render();})()`);
check("lats and upper-back roll up into one visible Back",
      `(function(){const c=muscleCoverage();const b=c.groups['Back'];
        return b.days.size===2 && !!b.mus['lats'] && !!b.mus['upper-back'];})()`, true);

// ---- 3. the card: 7 dots per row, trained days on, counts days-first
check("six rows render, one per visible group",
      `document.querySelectorAll('.mccard .mcrow').length`, 6);
check("each row carries exactly 7 dots",
      `[...document.querySelectorAll('.mccard .mcrow')].every(r=>r.querySelectorAll('.mcdots i').length===7)`, true);
check("Legs row lights two dots (Deadlift and Hip Thrust days)",
      `(function(){const r=[...document.querySelectorAll('.mcrow')].find(x=>x.querySelector('.mcname').textContent==='Legs');
        return r.querySelectorAll('.mcdots i.on').length;})()`, 2);
/* v3.3.350 RESTATES the SPELLING, not the rule. Days still come before sets
   and an untrained group still states 0 in the same voice -- both untouched.
   What moved is that the tail is no longer ONE span: the day count, its unit
   and the set total are separate cells, because "1 day" and "2 days" can only
   share a column if the number is measured apart from its word. Reading the
   row's whole text still proves the ORDER, which is the property. */
check("days come before sets in the count (days > volume)",
      `(function(){const r=[...document.querySelectorAll('.mcrow')].find(x=>x.querySelector('.mcname').textContent==='Legs');
        return /\\d+\\s*days? \\u00b7 \\d+ sets?/.test(r.textContent.replace(/\\s+/g,' '));})()`, true);
check("an untrained group states 0 days in the same voice",
      `(function(){const r=[...document.querySelectorAll('.mcrow')].find(x=>x.querySelector('.mcname').textContent==='Arms');
        return r.querySelector('.mcv').textContent;})()`, 0);

/* v3.3.350: the card is one MATRIX with a shared axis. Each of these is a
   thing that could not be true before, and each is why the gap closed. */
check("seven day columns carry a weekday header",
      `document.querySelectorAll('.mchead .mcdots i').length`, 7);
check("...the header and the rows read the SAME template",
      `${(function(){const c=fs.readFileSync(path.join(dir,"css/app.css"),"utf8")
          .replace(/\/\*[\s\S]*?\*\//g,"").replace(/\r?\n\s*/g,"");
        return /\.mcrow,\.mchead\{[^}]*grid-template-columns:/.test(c);})()}`, "true");
check("...the day marks are an axis of seven equal columns, not a loose strip",
      `${/\.mcdots\{[^}]*grid-template-columns:repeat\(7,1fr\)/.test(
         fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,""))}`, "true");
/* the tail: count right, unit left, dot centred, sets right -- four cells on
   four tracks, measured across ALL rows so they line up down the card */
check("...and the tail is four aligned cells, not one string",
      `(function(){const r=document.querySelector('.mcrow');
        return ['.mcv','.mcu','.mcsep','.mcs'].every(c=>!!r.querySelector(c));})()`, true);
check("...sized from widths measured across every row",
      /* \\d, not \\d — inside a template literal an unknown escape collapses to
         the bare letter, so /--mcd:\d+ch/ was really /--mcd:d+ch/ and could
         never match. The other assertions in this file already double them. */
      `(function(){const g=document.querySelector('.mcgrid');
        const st=g?g.getAttribute('style'):'';
        return /--mcd:\\d+ch/.test(st) && /--mcu:\\d+ch/.test(st) && /--mcs:\\d+ch/.test(st);})()`, true);
check("no red anywhere in the card",
      `document.querySelector('.mccard').innerHTML.includes('--live')`, false);

// ---- 4. tap → in-place internal receipt; the page around it survives
check("tapping a group opens its internal receipt without a re-render",
      `(function(){const view=document.querySelector('#view'); view._k=1;
        [...document.querySelectorAll('.mcrow')].find(x=>x.querySelector('.mcname').textContent==='Back').click();
        return view._k===1 && !!document.querySelector('.mccard .mcinner');})()`, true);
check("...listing internal muscles by days",
      `(function(){const t=document.querySelector('.mcinner').textContent;
        return t.includes('lats')&&t.includes('upper-back');})()`, true);
run(`_mcOpen=null;`);

// ---- 5. fallbacks: unknown non-Legs exercise credits its part's group;
// unknown Legs exercise is stated as unassigned, never guessed into quads
run(`(function(){
  const D=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days[D(2)].w.push({part:'Chest',ex:'My Weird Press',w:20,reps:[10],at:8});
  DB.days[D(2)].w.push({part:'Legs',ex:'Sled Push',w:60,reps:[5],at:9});
  SEED=deriveAll(); render();})()`);
check("an unknown Chest exercise credits Chest",
      `(function(){const c=muscleCoverage();return !!c.groups['Chest'].mus['chest'];})()`, true);
check("an unknown Legs exercise lands visible-Legs, internal 'unassigned'",
      `(function(){const c=muscleCoverage();return !!c.groups['Legs'].mus['unassigned'];})()`, true);
check("...and did NOT get guessed into quads",
      `(function(){const c=muscleCoverage();return c.groups['Legs'].mus['quads']===undefined;})()`, true);

process.exit(fail ? 1 : 0);
})();
