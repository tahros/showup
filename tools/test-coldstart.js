// test-coldstart.js DIR — v3.3.248. A user six sessions in must be told what
// to train. `live` (8 logged days of a part) is the right bar for CLAIMING a
// cadence and the wrong bar for recommending at all; below it Today showed no
// suggestion whatsoever, which is invisible to anyone with history and is the
// first thing a new user sees.
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
w.Element.prototype.setPointerCapture = function(){};
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
const seed = js => run(`(function(){
  const D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  DB.days={}; DB.settings.canon={}; delete DB.settings.myParts; ${js}
  migrateCanon(); SEED=deriveAll(); view='today'; render();})()`);
const card = `(function(){const c=[...document.querySelectorAll('.card')].find(x=>/Start/.test(x.textContent));
  return c?c.textContent.replace(/\\s+/g,' ').trim():'NO CARD';})()`;

(async () => {
await new Promise(r => setTimeout(r, 80));

// ---- the reported case: six days in, mostly runs, two single lift days
seed(`for(const n of [8,6,5,3,1]) DB.days[D(n)]={w:[{part:'Run',ex:'Run',w:4,reps:[],mins:26}],upd:1};
      DB.days[D(5)].w.push({part:'Chest',ex:'Chest Press',w:40,reps:[10,10]});
      DB.days[D(2)]={w:[{part:'Back',ex:'Lat Pulldown',w:40,reps:[10]}],upd:1};`);
check("no part has enough history to speak of a cadence", `trainingPlan().mains.length`, 0);
check("...but a recommendation is still made", `!!trainingPlan().pick`, true);
check("...and it reaches the screen", `${card}.indexOf('NO CARD')`, -1);
check("...naming a part the user has never trained",
      `(function(){const P=trainingPlan(); return P.info[P.pick].days;})()`, 0);
check("...and saying exactly that, with no invented cadence",
      `${card}.indexOf('not trained yet')>-1 && !/usually every/.test(${card})`, true);
check("...and no fabricated overdue percentage", `/overdue/.test(${card})`, false);
check("the door to the rest of the body is open too",
      `!!document.querySelector('#goLift')`, true);
check("Run is never offered as the lifting pick", `trainingPlan().pick!=='Run'`, true);

// ---- runs only: never lifted at all
seed(`for(const n of [7,5,3,1]) DB.days[D(n)]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:30}],upd:1};`);
check("a runner who has never lifted still gets a lifting pick", `!!trainingPlan().pick`, true);
check("...chosen in catalog order, so Today and Train agree",
      `(function(){const P=trainingPlan();
        return P.pick===Object.keys(SEED.catalog).filter(p=>p!=='Run')[0];})()`, true);

// ---- day one: nothing logged but today
seed(`DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:3,reps:[],mins:20}],upd:1};`);
check("even on day one there is something to train", `!!trainingPlan().pick`, true);

// ---- the invariant, stated plainly
check("whenever a lifting part exists, a pick exists",
      `(function(){const P=trainingPlan();
        const anyLift=Object.keys(P.info).some(p=>p!=='Run');
        return !anyLift || !!P.pick;})()`, true);

// ---- onboarding's choice still bounds the set
seed(`DB.settings.myParts=['Chest','Back'];
      for(const n of [4,2]) DB.days[D(n)]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:30}],upd:1};`);
check("a pick respects the parts chosen at onboarding",
      `['Chest','Back'].indexOf(trainingPlan().pick)>-1`, true);
run(`delete DB.settings.myParts;`);

// ---- REGRESSION: an established ledger is untouched
seed(`for(let i=1;i<=12;i++){
        DB.days[D(i*3)]={w:[{part:'Chest',ex:'Chest Press',w:60,reps:[8]}],upd:1};
        DB.days[D(i*3+1)]={w:[{part:'Back',ex:'Bent-Over Row',w:60,reps:[8]}],upd:1}; }`);
check("with real history the pick still comes from mains",
      `(function(){const P=trainingPlan(); return P.mains.length>0 && P.pick===P.mains[0];})()`, true);
/* v3.3.276 RESTATES both: the card now makes ONE claim (the last real
   session) — the two-clause line squeezed the Start button into a wrap.
   Cadence and overdue left the card; the pins now hold their absence, and
   that the one claim is a days-since statement. */
check("...and the card makes exactly one claim, sitting alone before Start",
      `/(full session \\d+d ago|\\d+d since) Start/.test(${card})`, true);
check("...with no cadence or overdue clause on it",
      `!/usually every|overdue/.test(${card})`, true);

// a part with 8+ days is 'live'; the bar itself is unchanged
check("the cadence bar is still eight logged days",
      `(function(){const P=trainingPlan();
        return Object.keys(P.info).every(p=>P.info[p].live===(P.info[p].days>=8));})()`, true);


// ---- v3.3.249: the onboarding answer is editable ------------------------
// "What do you train?" was asked once and never again — and the choice was
// self-sealing: a part with no tile cannot be trained, so it could never earn
// the history that would bring its tile back.
seed(`DB.settings.myParts=['Chest','Back','Shoulder','Legs'];
      for(const n of [8,6,5]) DB.days[D(n)]={w:[{part:'Run',ex:'Run',w:4,reps:[],mins:26}],upd:1};
      DB.days[D(5)].w.push({part:'Chest',ex:'Chest Press',w:40,reps:[10]});`);
check("a part left out at onboarding is not in the rotation",
      `!!trainingPlan().info['Biceps']`, false);
check("...and Settings offers it as a switch",
      `(function(){view='settings'; renderSync();
        return !!document.querySelector('[data-myp="Biceps"]');})()`, true);
check("...shown as off", `document.querySelector('[data-myp="Biceps"]').className.indexOf('sel')`, -1);
check("switching it on puts it back in the rotation",
      `(function(){toggleMyPart('Biceps'); SEED=deriveAll();
        return !!trainingPlan().info['Biceps'];})()`, true);
check("...and it can now be recommended, which was impossible before",
      `(function(){const P=trainingPlan();
        return P.coldMains.indexOf('Biceps')>-1;})()`, true);

// switching a TRAINED part off hides it without touching a single set
check("switching a trained part off removes it from the rotation",
      `(function(){toggleMyPart('Chest'); SEED=deriveAll();
        return !!trainingPlan().info['Chest'];})()`, false);
check("...while every logged set survives",
      `Object.values(DB.days).flatMap(d=>d.w||[]).filter(s=>s.part==='Chest').length`, 1);
check("...and switching it back on restores the history intact",
      `(function(){toggleMyPart('Chest'); SEED=deriveAll();
        return (trainingPlan().info['Chest']||{}).days;})()`, 1);

// the two exceptions that stop the switch trapping anyone
check("Run is never hidden by the rotation",
      `(function(){DB.settings.myParts=['Legs']; SEED=deriveAll();
        return !!trainingPlan().info['Run'];})()`, true);
check("a part trained TODAY stays visible even when switched off",
      `(function(){DB.days[todayISO]={w:[{part:'Back',ex:'Bent-Over Row',w:50,reps:[8]}],upd:1};
        DB.settings.myParts=['Legs']; SEED=deriveAll();
        return !!trainingPlan().info['Back'];})()`, true);
check("the last part cannot be switched off",
      `(function(){DB.days={}; DB.settings.myParts=['Legs']; SEED=deriveAll();
        return toggleMyPart('Legs');})()`, false);

// an older ledger with no onboarding answer keeps everything
check("no stored answer means every part is in the rotation",
      `(function(){delete DB.settings.myParts; SEED=deriveAll();
        const all=Object.keys(SEED.catalog).filter(p=>p!=='Run');
        return all.every(p=>myPartsSet().has(p));})()`, true);

// ---- v3.3.269: a chip says how long it has been -------------------------
// `dormant` used to mean !live, and live is days>=8 — a data-sufficiency
// test, not a recency one. So a part trained 2 days ago on only 3 days read
// "dormant" while a part last touched 40 days ago read "40d ago". The two
// labels were inverted against their own words. The fixture below makes both
// halves of that inversion true at once, so the assertions discriminate.
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  for(let i=0;i<12;i++) DB.days[D(40+i*3)]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};
  for(const n of [2,9,16]) DB.days[D(n)]={w:[{part:'Triceps',ex:'Overhead Triceps Extension',w:40,reps:[10],at:1}],upd:1};
  DB.days[D(1)]={w:[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[10],at:1}],upd:1};
  DB.days[D(20)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[10],at:1}],upd:1};
  DB.days[D(21)]={w:[{part:'Biceps',ex:'Dumbbell Curl',w:10,reps:[10],at:1}],upd:1};
  DB.settings.myParts=['Chest','Triceps','Shoulder','Back','Legs','Biceps'];
  SEED=deriveAll(); view='lift'; lift.ex=null; lift.part=null; render();})()`);
const chip=p=>`(function(){const b=[...document.querySelectorAll('.partcard')]
  .find(x=>x.querySelector('b').textContent==='${p}');
  return b ? b.querySelector('.ps').textContent : '(absent)';})()`;
const grey=p=>`(function(){const b=[...document.querySelectorAll('.partcard')]
  .find(x=>x.querySelector('b').textContent==='${p}');
  return b ? b.classList.contains('dead') : '(absent)';})()`;

/* v3.3.329 RESTATES the SPELLING, not the rule. These three assertions
   defend that a chip states its ACTUAL age rather than a mood word
   ("dormant") or an abbreviation -- that property is untouched. What moved
   is the grammar: agoLabel (util.js) now spaces the number from its unit
   ("2 d ago", the same parse v3.3.302 gave "165.3 lb") and coarsens the unit
   past 30 days, because "1464d ago" is a number you have to divide before it
   means anything. Chips and the exercise rows below them share the one
   formatter, so the same sentence cannot be spelled two ways on one screen.
   Note 40 days now reads "1 mo ago" -- still the true age, said in the unit
   that suits the size of the gap, and still greyed by PART_COLD_DAYS below,
   which is a separate law and unchanged. */
check("a part trained 2 days ago says so, however few times it was trained",
      chip('Triceps'), "2 d ago");
check("...and is NOT greyed out", grey('Triceps'), false);
check("the planner still knows it cannot claim a cadence for it",
      `trainingPlan().info.Triceps.live`, false);
check("a part last trained 40 days ago says THAT, however well known it is",
      chip('Chest'), "1 mo ago");
check("...and IS greyed out", grey('Chest'), true);
check("the planner still trusts its cadence", `trainingPlan().info.Chest.live`, true);
check("yesterday reads as a word, not 1d ago", chip('Shoulder'), "yesterday");
check("a part never trained says so", chip('Back'), "never trained");
check("...and is greyed out", grey('Back'), true);
// the threshold is a declared constant, and the boundary is exact
check("the cold threshold is three weeks", `PART_COLD_DAYS`, 21);
check("20 days is still warm", grey('Legs'), false);
check("21 days is cold", grey('Biceps'), true);
// Run rides along with every session: never cold, never in the rotation
check("Run keeps its own grammar", chip('Run'), "each time");
check("...and never greys out", grey('Run'), false);
// the word the maker objected to is gone from the chips entirely
check("no chip says dormant any more",
      `[...document.querySelectorAll('.partcard .ps')].some(x=>/dormant/i.test(x.textContent))`, false);

// ---- v3.3.275: a session is not a cameo -----------------------------------
// The maker's August, transcribed (parts + set counts): Shoulder full days
// every ~6d PLUS 3-set cameos on Chest days. Day-membership clocks read the
// cameos as sessions — since reset to the cameo, median gap compressed — so
// emphasising shoulders as a secondary made the app skip them. One extra
// cameo on the final day makes the old and new planners disagree on the
// PICK itself, so this fixture discriminates end to end.
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  const M=[[20,[['Shoulder',21]]],[19,[['Back',16],['Biceps',7]]],[18,[['Chest',18]]],
    [17,[['Legs',4]]],[16,[['Shoulder',18]]],[15,[['Back',17]]],[13,[['Chest',16]]],
    [12,[['Legs',11]]],[10,[['Shoulder',14]]],[9,[['Back',17]]],
    [6,[['Chest',14],['Shoulder',3]]],[5,[['Legs',11]]],[4,[['Shoulder',14]]],
    [3,[['Back',17],['Biceps',5],['Triceps',5]]],
    [2,[['Chest',17],['Shoulder',3],['Sixpack',3]]],
    [1,[['Legs',11],['Sixpack',4],['Shoulder',3]]]];
  for(let cyc=0;cyc<3;cyc++) for(const [ago,parts] of M){
    const d=new Date(t); d.setDate(d.getDate()-(ago+cyc*21));
    DB.days[d.toLocaleDateString('en-CA')]={w:parts.map(([p,n])=>({part:p,ex:p+' Movement',w:20,reps:Array(n).fill(10),at:1})),upd:1};}
  DB.settings.myParts=['Back','Shoulder','Chest','Legs','Biceps','Triceps','Sixpack'];
  DB.settings.custom={'Shoulder Movement':{part:'Shoulder',equip:'dumbbell'},'Back Movement':{part:'Back',equip:'barbell'},
    'Chest Movement':{part:'Chest',equip:'barbell'},'Legs Movement':{part:'Legs',equip:'barbell'},
    'Biceps Movement':{part:'Biceps',equip:'dumbbell'},'Triceps Movement':{part:'Triceps',equip:'cable'},
    'Sixpack Movement':{part:'Sixpack',equip:'body'}};
  SEED=deriveAll();})()`);
check("the pick is the emphasised part, cameos notwithstanding",
      `trainingPlan().pick`, "Shoulder");
check("the ledger clock still says the cameo happened (chips stay honest)",
      `trainingPlan().info.Shoulder.since`, 1);
check("...while the rotation clock reads the last FULL session",
      `trainingPlan().info.Shoulder.sinceF`, 4);
check("...and the cadence is the full-session cadence, not the cameo-compressed one",
      `Math.round(trainingPlan().info.Shoulder.gapF)`, 6);
check("a part whose normal dose is small keeps every day (Sixpack unbitten)",
      `(function(){const i=trainingPlan().info.Sixpack; return i.sinceF===i.since;})()`, true);
check("a full-session part's two clocks agree (Back unbitten)",
      `(function(){const i=trainingPlan().info.Back; return i.sinceF===i.since && i.gapF===i.gap;})()`, true);
check("the Train-next card names the full session when the clocks differ",
      `(function(){view='today'; render();
        const el=[...document.querySelectorAll('.card .mono.muted')].map(x=>x.textContent).join(' ');
        return /full session 4d ago/.test(el) && !/usually every|overdue/.test(el);})()`, true);

// ---- v3.3.296: eight parts, two rows -------------------------------------
// Four columns instead of three. The room came from DELETING the ✅ on
// finished cards, not from shrinking type: a finished part already recedes,
// so the badge was saying twice what the fade said, and its emoji was the
// widest glyph in the grid. The live 🔥 stays — an open set is the one card
// that should interrupt you.
run(`(function(){DB.days={}; DB.settings.unit='lb'; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  DB.days[D(3)]={w:[{part:'Chest',ex:'Dip',w:toKg(25),reps:[10]}],upd:1};
  DB.days[D(4)]={w:[{part:'Back',ex:'Pull Up',w:0,reps:[10]}],upd:1};
  DB.days[D(2)]={w:[{part:'Legs',ex:'Squat',w:toKg(135),reps:[8]}],upd:1};
  const td=dayMeta();
  for(const [p,e] of [['Shoulder','Lateral Raise'],['Biceps','EZ Bar Curl'],
                      ['Triceps','Overhead Triceps Extension'],['Sixpack','Hanging Leg Raise']])
    td.w.push({part:p,ex:e,w:toKg(30),reps:[10],at:1});
  td.w.push({part:'Run',ex:'Run',w:3.7,mins:27,secs:0,at:1});
  td.donePart=['Shoulder','Biceps','Triceps','Sixpack','Run'];
  SEED=deriveAll(); lastSetAt=0; view='lift'; lift.ex=null; lift.part='Chest'; render();})()`);
/* the column count is CSS, which jsdom cannot resolve — asserted on the
   declaration, like the other layout facts in this codebase */
check("the grid is four across",
      `${/\.partgrid\{[^}]*repeat\(4,/.test(require('fs').readFileSync(require('path').join(process.argv[2]||'.',"css/app.css"),'utf8'))}`, "true");
check("a finished part carries no badge, only the word",
      `(function(){const b=[...document.querySelectorAll('.partcard')]
        .find(x=>x.querySelector('b').textContent==='Shoulder');
        return b.querySelector('.ps').textContent.trim();})()`, "today");
check("...and no tick survives anywhere in the grid",
      `/\\u2705|\\u2713/.test(document.querySelector('.partgrid').textContent)`, false);
check("...the fade is what says done",
      `(function(){const b=[...document.querySelectorAll('.partcard')]
        .find(x=>x.querySelector('b').textContent==='Shoulder');
        return b.classList.contains('finP');})()`, true);
check("an untrained part keeps its full age, not an abbreviation",
      `(function(){const b=[...document.querySelectorAll('.partcard')]
        .find(x=>x.querySelector('b').textContent==='Back');
        return b.querySelector('.ps').textContent.trim();})()`, "4 d ago");
check("...and is NOT faded — it is what the grid is scanned for",
      `(function(){const b=[...document.querySelectorAll('.partcard')]
        .find(x=>x.querySelector('b').textContent==='Back');
        return b.classList.contains('finP');})()`, false);
/* the live flame is a different claim from "done" and must survive */
run(`(function(){const td=dayMeta(); td.donePart=['Biceps','Triceps','Sixpack','Run'];
  lastSetAt=Date.now(); SEED=deriveAll(); render();})()`);
check("an OPEN set still burns", `/\\ud83d\\udd25/.test(document.querySelector('.partgrid').textContent)`, true);

process.exit(fail ? 1 : 0);
})();
