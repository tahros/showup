// test-sessfmt.js DIR — the shared session formatter (foldSets/setRows) and
// History's open, grouped session detail. Also pins the LAST TIME card's
// markup so the v3.3.43 extraction cannot have changed it.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage43";

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

// ---- foldSets: consecutive only, marker rows dropped
check("consecutive same weight folds",
      `JSON.stringify(foldSets([[16,[35]],[16,[30]],[16,[25]]]).map(r=>[r[0],r[1]]))`,
      JSON.stringify([[16,[35,30,25]]]));
check("returning to a weight stays its own line",
      `foldSets([[16,[30]],[20,[15]],[16,[30]]]).length`, 3);
check("bare marker rows are dropped",
      `foldSets([[0,[]],[16,[30]]]).length`, 1);

// ---- setRows: chips, BW, distance, tappability
check("reps become chips",
      `(setRows('Dumbbell Press',[[16,[30,30]]],false).match(/repchip/g)||[]).length`, 2);
check("History rows are NOT tappable",
      `/data-lw/.test(setRows('Dumbbell Press',[[16,[30]]],false))`, false);
check("Lift rows ARE tappable",
      `/data-lw="16"/.test(setRows('Dumbbell Press',[[16,[30]]],true))`, true);
check("Run rows read as distance",
      `/km/.test(setRows('Run',[[3.47,[],27,16]],false))`, true);

// ---- the real shape from the gym: 12 presses at 3 weights, then an
//      alternating Side/Front Raise superset
run(`
  // a PRIOR session, so the LAST TIME card has something to show
  {const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-40);   // far enough back to never collide with today's fixture month
   DB.days[d.toLocaleDateString('en-CA')]={w:[
     ...[30,30,30,30].map(r=>({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[r]})),
     ...[15,15,15,15].map(r=>({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[r]})),
   ],upd:1,doneEx:['Dumbbell Press'],donePart:[],doneAll:true};}
  DB.days[todayISO]={w:[
    ...[35,30,30,25].map(r=>({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[r]})),
    ...[20,15,16,15].map(r=>({part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[r]})),
    ...[25,30,30,30].map(r=>({part:'Shoulder',ex:'Dumbbell Press',w:12,reps:[r]})),
    {part:'Shoulder',ex:'Dumbbell Side Raise',w:12,reps:[20]},
    {part:'Shoulder',ex:'Dumbbell Front Raise',w:12,reps:[10]},
    {part:'Shoulder',ex:'Dumbbell Side Raise',w:12,reps:[20]},
    {part:'Shoulder',ex:'Dumbbell Front Raise',w:12,reps:[10]},
    {part:'Shoulder',ex:'Dumbbell Side Raise',w:12,reps:[20]},
  ],upd:Date.now(),doneEx:['Dumbbell Press','Dumbbell Side Raise','Dumbbell Front Raise'],donePart:[],doneAll:true};
  SEED=deriveAll(); _fireDist=null;
  hist={y:+thisYear,m:+todayISO.slice(5,7),part:null};
  view='history'; render();
`);

check("session is OPEN without tapping",
      `document.querySelector('details.day').hasAttribute('open')`, true);
check("no session left collapsed",
      `[...document.querySelectorAll('details.day')].every(d=>d.hasAttribute('open'))`, true);
check("one group per exercise, not per superset alternation",
      `document.querySelectorAll('details.day .exgrp').length`, 3);
check("first group is the press",
      `document.querySelector('details.day .exgrp .lasthead span').textContent`, "Dumbbell Press");
check("12 presses collapse to 3 weight rows",
      `document.querySelectorAll('details.day .exgrp')[0].querySelectorAll('.lastrow').length`, 3);
check("press group counts all 12 sets",
      `document.querySelectorAll('details.day .exgrp')[0].querySelector('.ago').textContent`, "12 sets");
check("alternating side raises land in ONE group",
      `[...document.querySelectorAll('details.day .exgrp')]
         .filter(g=>/Side Raise/.test(g.querySelector('.lasthead span').textContent)).length`, 1);
check("side raise folds to a single row",
      `[...document.querySelectorAll('details.day .exgrp')]
         .find(g=>/Side Raise/.test(g.querySelector('.lasthead span').textContent))
         .querySelectorAll('.lastrow').length`, 1);
check("old flat 'kg ×' rows are gone",
      `/kg × /.test(document.querySelector('details.day .body').textContent)`, false);
check("no dangling × from empty reps",
      `/×\\s*$/m.test(document.querySelector('details.day .body').textContent)`, false);

// ---- LAST TIME card unchanged by the extraction
run(`lift={part:'Shoulder',ex:'Dumbbell Press'}; view='lift'; render();`);
check("LAST TIME card still renders", `!!document.querySelector('.lastcard')`, true);
check("LAST TIME rows still tappable",
      `!!document.querySelector('.lastcard .lastrow[data-lw]')`, true);
check("LAST TIME still has its footer",
      `/sets/.test(document.querySelector('.lastfoot').textContent)`, true);

process.exit(fail ? 1 : 0);
