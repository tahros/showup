// test-pastedit.js DIR — v3.3.61: editing past sessions from History.
// Records stay inert until a day is explicitly put in edit mode; every
// mutation must re-derive so the calendar and totals can't go stale.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage61";

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

// a past day, deliberately mixing shapes: a legacy multi-rep entry, singles,
// and a run — all three must be editable.
run(`
  {const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-3);
   window.PAST=d.toLocaleDateString('en-CA');
   DB.days[PAST]={w:[
     {part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30,30,30,30]},
     {part:'Shoulder',ex:'Dumbbell Side Raise',w:12,reps:[20]},
     {part:'Run',ex:'Run',w:3.4,mins:27,secs:17,reps:[]},
   ],upd:1,doneEx:[],donePart:[],doneAll:true};
   SEED=deriveAll(); _fireDist=null;
   hist={y:+PAST.slice(0,4),m:+PAST.slice(5,7),part:null,edit:null,editSet:null};
   view='history'; render();}
`);

check("read view has no edit tiles", `!!document.querySelector('.hset')`, false);
check("day offers an Edit control",
      `!!document.querySelector('[data-hedit="'+PAST+'"]')`, true);

// enter edit mode
run(`document.querySelector('[data-hedit="'+PAST+'"]').click();`);
check("edit mode on", `hist.edit===PAST`, true);
check("4 press reps become 4 addressable tiles",
      `[...document.querySelectorAll('.hset')].filter(x=>/16/.test(x.textContent)).length`, 4);
check("run gets its own tile",
      `[...document.querySelectorAll('.hset')].filter(x=>/27'17/.test(x.textContent)).length`, 1);

// DELETE one rep out of the legacy 4-rep entry
const setsBefore = run(`SEED.monthly[PAST.slice(0,7)].sets`);
run(`document.querySelector('[data-hdel="0:0"]').click();`);
check("delete removes exactly one rep", `DB.days[PAST].w[0].reps.length`, 3);
check("other entries untouched", `DB.days[PAST].w[1].reps.length`, 1);
// the mutation must re-derive — otherwise the calendar and month totals
// keep numbers that no longer match the data
check("month set-total re-derived after the delete",
      `SEED.monthly[PAST.slice(0,7)].sets`, setsBefore-1);

// EDIT a rep — same weight, so the entry must NOT split
run(`
  document.querySelector('[data-hs="0:0"]').click();
  document.getElementById('hsW').value='16';
  document.getElementById('hsR').value='25';
  document.getElementById('hsSave').click();
`);
check("rep value updated in place", `DB.days[PAST].w[0].reps[0]`, 25);
check("entry did NOT split (same weight)", `DB.days[PAST].w[0].reps.length`, 3);

// EDIT with a weight change — must split, not re-weigh the siblings
run(`
  document.querySelector('[data-hs="0:1"]').click();
  document.getElementById('hsW').value='20';
  document.getElementById('hsR').value='12';
  document.getElementById('hsSave').click();
`);
check("weight change split the set out",
      `DB.days[PAST].w.filter(s=>s.ex==='Dumbbell Press').length`, 2);
check("siblings kept their original weight",
      `DB.days[PAST].w.find(s=>s.ex==='Dumbbell Press').w`, 16);
check("split set carries the new weight",
      `DB.days[PAST].w.filter(s=>s.ex==='Dumbbell Press')[1].w`, 20);

// ADD a set
const beforeAdd = run(`DB.days[PAST].w.filter(s=>s.ex==='Dumbbell Side Raise').length`);
run(`
  document.querySelector('[data-hadd="Dumbbell Side Raise"]').click();
  document.getElementById('hsW').value='14';
  document.getElementById('hsR').value='15';
  document.getElementById('hsSave').click();
`);
check("add appended a set",
      `DB.days[PAST].w.filter(s=>s.ex==='Dumbbell Side Raise').length`, beforeAdd+1);
check("added set has the right part (catalog lookup)",
      `DB.days[PAST].w.filter(s=>s.ex==='Dumbbell Side Raise').pop().part!==undefined`, true);

// v3.3.62: legacy sheet rows carry reps:[] as bare markers. They render
// nothing, so they must not print a group header or a "1 set" count, and
// must not name their part in the day summary.
run(`
  {const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-4);
   window.JUNK=d.toLocaleDateString('en-CA');
   DB.days[JUNK]={w:[
     {part:'Back',ex:'Pull Up',w:70,reps:[8,8]},
     {part:'Back',ex:'Row',w:30,reps:[]},          // dead marker
     {part:'Biceps',ex:'Barbell Curl',w:47.6,reps:[]},  // dead marker, only Biceps entry
   ],upd:1,doneEx:[],donePart:[],doneAll:true};
   SEED=deriveAll(); _fireDist=null;
   hist={y:+JUNK.slice(0,4),m:+JUNK.slice(5,7),part:null,edit:null,editSet:null};
   view='history'; render();}
`);
const groups = () => run(`[...document.querySelectorAll('details.day[data-d="'+JUNK+'"] .exgrp .lasthead span')].map(x=>x.textContent).join(',')`);
console.log("     groups shown:", groups());
check("empty-reps group is not rendered at all",
      `/Row|Barbell Curl/.test(document.querySelector('details.day[data-d="'+JUNK+'"] .body').textContent)`, false);
check("the real group survives",
      `/Pull Up/.test(document.querySelector('details.day[data-d="'+JUNK+'"] .body').textContent)`, true);
check("set count counts reps, not entries",
      `document.querySelector('details.day[data-d="'+JUNK+'"] .exgrp .ago').textContent`, "2 sets");
check("phantom part not named in the summary",
      `/Biceps/.test(document.querySelector('details.day[data-d="'+JUNK+'"] summary').textContent)`, false);

// same must hold inside edit mode — no empty group, no phantom "+ set"
run(`document.querySelector('[data-hedit="'+JUNK+'"]').click();`);
check("edit mode also hides the empty groups",
      `/Barbell Curl/.test(document.querySelector('details.day[data-d="'+JUNK+'"] .body').textContent)`, false);
check("edit mode still shows the real one",
      `document.querySelectorAll('details.day[data-d="'+JUNK+'"] .hset').length`, 2);

// and once any edit commits, the dead rows are swept from storage
run(`
  document.querySelector('details.day[data-d="'+JUNK+'"] [data-hdel="0:0"]').click();
`);
check("committing an edit prunes the dead entries",
      `DB.days[JUNK].w.filter(s=>!(s.reps||[]).length&&s.ex!=='Run').length`, 0);

// v3.3.63: a repless marker with a REAL weight (12 kg, reps:[]) sitting
// inside a group that also has real sets. foldSets used to keep it because
// its weight wasn't ~0, printing a bare "12 kg" row with no chips.
run(`
  {const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-5);
   window.MIX=d.toLocaleDateString('en-CA');
   DB.days[MIX]={w:[
     {part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30,30,30,30]},
     {part:'Shoulder',ex:'Dumbbell Press',w:20,reps:[15,15,15,15]},
     {part:'Shoulder',ex:'Dumbbell Press',w:12,reps:[]},      // real weight, no reps
     {part:'Run',ex:'Run',w:3.44,mins:27,secs:0,reps:[]},     // must SURVIVE
   ],upd:1,doneEx:[],donePart:[],doneAll:true};
   SEED=deriveAll(); _fireDist=null;
   hist={y:+MIX.slice(0,4),m:+MIX.slice(5,7),part:null,edit:null,editSet:null};
   view='history'; render();}
`);
const body = () => run(`document.querySelector('details.day[data-d="'+MIX+'"] .body').textContent`);
check("no bare 12 kg row",
      `/12\\s*kg/.test(document.querySelector('details.day[data-d="'+MIX+'"] .body').textContent)`, false);
check("real weight rows still render",
      `document.querySelectorAll('details.day[data-d="'+MIX+'"] .lastrow').length`, 3);
check("press still counts 8 sets",
      `[...document.querySelectorAll('details.day[data-d="'+MIX+'"] .lasthead')]
         .find(x=>/Dumbbell Press/.test(x.textContent)).querySelector('.ago').textContent`, "8 sets");
check("the RUN survives (distance+time, no reps)",
      `/3\\.44/.test(document.querySelector('details.day[data-d="'+MIX+'"] .body').textContent)`, true);

// leaving History must close edit mode — no writable record left open
run(`view='today'; render();`);
check("tab change exits edit mode", `hist.edit`, "null");

process.exit(fail ? 1 : 0);
