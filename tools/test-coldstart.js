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
check("...and the cadence claim returns", `/usually every \\d+d/.test(${card})`, true);
check("...including the overdue reading when it is earned",
      `(function(){const P=trainingPlan(); const s=P.score(P.pick);
        return s>=1 ? /overdue/.test(${card}) : !/overdue/.test(${card});})()`, true);

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

process.exit(fail ? 1 : 0);
})();
