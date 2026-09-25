// test-planedit.js DIR — v4.6.67: Edit Plan is the same screen as Edit Logged.
// The plan column edits in place; the saved plan and today's frozen copy must
// agree afterwards, no target id may move, and logged sets stay linked.
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
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);
let fail=0;
const ok=(name,cond,note)=>{console.log((cond?"PASS":"FAIL"),name,note!==undefined?"→ "+note:"");if(!cond)fail++;};


/* v4.6.72: TWO NAVIGATION RULES, in the maker's words.
   1. The header arrow goes to the PREVIOUS NAVIGATION POINT -- the screen you
      entered from -- never one step back inside a flow.
   2. The Today tab knows where it is tapped from. From another tab it opens
      Today as it was. From INSIDE a Today sub-section it returns to Today's
      default page. Only then. */
const fresh=()=>run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;DB.plan=null;DB.week=null;
  const text="Squat\\n  195 lb x 8 8 8";const {items}=planItemsFrom(parsePlan(text));planSave(items,'',text,todayISO);
  SEED=deriveAll();lift.plan=null;lift.part=null;lift.ex=null;view='today';render();})()`);
const where=()=>run(`JSON.stringify({view,plan:lift.plan||null,page:(typeof pfState==='function'&&lift.plan==='workspace')?pfState().page:null})`);
const tapArrow=()=>run(`(function(){const b=document.querySelector('.hback');const role=b.dataset.pw||'(plain)';b.click();return role;})()`);
const tapTab=v=>run(`(function(){const v='${v}';if(v==='stats'||v==='history'){if(view!==v){if(!['stats','history'].includes(view))document.querySelector('nav [data-progress]').click();if(view!==v)document.querySelector('[data-progress-view="'+v+'"]').click();}else document.querySelector('nav [data-progress]').click();}else document.querySelector('nav button[data-v="'+v+'"]').click();})()`);
const inWorkspace=()=>run(`view==='today'&&lift.plan==='workspace'`);
const atTodayRoot=()=>run(`view==='today'&&!lift.plan`);

// ---- 1. the arrow leaves to where you came from, whatever step you are on
fresh();
run(`pwOpen(todayISO)`);
ok("(fixture) Plan opens as a Today sub-section", inWorkspace(), where());
run(`pfNavigate('prefs');pfNavigate('dates');`);
ok("(fixture) two steps deep, on Dates, with Preferences behind it", /"page":"dates"/.test(where()) && run(`pfState().history.length`)>=1, where());
const ctl=tapArrow();
ok("the arrow is a leave, not a step back", ctl==="pf-leave", ctl);
ok("...and it goes to Today's default page -- not back one step to Preferences", atTodayRoot(), where());

// entered from Train through the Edit Plan door: the arrow returns to Train
fresh();
run(`view='lift';lift.part='Legs';lift.ex='Squat';render();document.querySelector('[data-sc-edit-plan]').click();document.querySelector('[data-pl-planner]').click();`);
ok("(fixture) entered from Train", inWorkspace() && run(`pfState().returnView`)==='lift', where()+" from "+run(`pfState().returnView`));
run(`pfNavigate('prefs');pfNavigate('dates');`);
tapArrow();
ok("the arrow returns to Train, the previous navigation point", run(`view==='lift'&&lift.ex==='Squat'`), where());

// entered from Settings: the arrow returns to Settings
fresh();
run(`view='sync';render();pfHandle('pf-settings',document.body);`);
ok("(fixture) entered from Settings", inWorkspace() && run(`pfState().returnView`)==='sync');
run(`pfNavigate('dates');`);
tapArrow();
ok("the arrow returns to Settings", run(`view==='sync'`), where());

// ---- 2. the Today tab, from inside and from outside
fresh();
run(`pwOpen(todayISO);pfNavigate('prefs');pfNavigate('dates');`);
ok("(fixture) inside Today's sub-section", inWorkspace());
tapTab('today');
ok("Today tapped from INSIDE Today returns to Today's default page", atTodayRoot(), where());
// from another tab, Today opens as it was -- a sub-section left open stays open.
// (Train is the exception, by an older rule: taking the Train tab is a fresh
// start and abandons the workspace -- v3.3.434. Stats and History keep it.)
fresh();
run(`pwOpen(todayISO);pfNavigate('dates');`);
tapTab('stats');
ok("(fixture) stepped out to Progress with the workspace still open", run(`['stats','history'].includes(view)`) && run(`lift.plan==='workspace'`));
tapTab('today');
ok("Today tapped from ANOTHER tab opens Today as it was: the sub-section", inWorkspace(), where());
tapTab('today');
ok("...and a second tap, now from inside, goes to the default page", atTodayRoot(), where());
// and from another tab with nothing open, Today is simply Today
fresh();
tapTab('stats');tapTab('today');
ok("from Stats with nothing open, Today is Today", atTodayRoot());

/* v4.6.97: the same rule for Train -- and the older one it must not break.
   From another tab, Train RESUMES the exercise you left (v3.3.527). Tapped
   from inside Train, it goes up to the tab's front page. */
/* Train's front page always carries a part -- the renderer picks one when
   none is set (lift.js: focus || P.pick || order[0]) -- so "root" means no
   exercise and no sub-screen, not no part. */
const atTrainRoot=()=>run(`view==='lift'&&!lift.ex&&!lift.plan`);
const trainFixture=()=>run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;DB.plan=null;DB.week=null;
  const text="Squat\\n  195 lb x 8 8 8";const {items}=planItemsFrom(parsePlan(text));planSave(items,'',text,todayISO);
  SEED=deriveAll();plLog({ex:'Squat',part:'Legs',w:88.45,reps:[8],at:1});
  lift={part:'Legs',ex:'Squat',weight:88.45};view='lift';render();})()`);

trainFixture();
ok("(fixture) standing on an exercise inside Train", run(`view==='lift'&&lift.ex==='Squat'`));
tapTab('lift');
ok("Train tapped from INSIDE an exercise goes to Train's front page", atTrainRoot(),
   run(`JSON.stringify({view,part:lift.part,ex:lift.ex})`));
tapTab('lift');
ok("...and tapping it again there does not dive back into the exercise", atTrainRoot(),
   run(`JSON.stringify({view,part:lift.part,ex:lift.ex})`));

// a part you picked by hand survives the tap: the front page is not a flow
trainFixture();
run(`lift.ex=null;lift.part='Chest';render();`);
ok("(fixture) on the front page with a hand-picked part", run(`view==='lift'&&lift.part==='Chest'&&!lift.ex`));
tapTab('lift');
ok("Train tapped ON the front page keeps the part you chose", run(`view==='lift'&&lift.part==='Chest'&&!lift.ex`),
   run(`JSON.stringify({part:lift.part,ex:lift.ex})`));

// and the older rule survives: from ANOTHER tab, Train resumes where you were
trainFixture();
tapTab('today');
ok("(fixture) stepped out to Today", run(`view==='today'`));
tapTab('lift');
ok("Train tapped from ANOTHER tab still resumes the exercise you left", run(`view==='lift'&&lift.ex==='Squat'`),
   run(`JSON.stringify({view,part:lift.part,ex:lift.ex})`));

/* v4.6.98: History and Stats. A PLACE is somewhere you walked into (another
   month, a day open for editing); a VIEWPOINT is how you read the page (a
   part filter, a chart toggle). The tap goes home from a place and leaves a
   viewpoint alone. Stats has only viewpoints. */
const histFixture=()=>run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  DB.days['2026-07-04']={w:[{ex:'Squat',part:'Legs',w:88.45,reps:[8],at:1}],doneAll:true,upd:1};
  SEED=deriveAll();hist={y:null,m:null,part:null,edit:null,editSet:null};view='history';render();})()`);
const thisMonth=()=>run(`view==='history'&&hist.y===+todayISO.slice(0,4)&&hist.m===+todayISO.slice(5,7)&&!hist.edit`);

histFixture();
run(`hist.y=2026;hist.m=7;render();`);
ok("(fixture) History paged back to July", run(`view==='history'&&hist.m===7`));
tapTab('history');
ok("History tapped from another month comes home to this month", thisMonth(), run(`JSON.stringify({y:hist.y,m:hist.m})`));

histFixture();
run(`hist.edit='2026-07-04';hist.y=2026;hist.m=7;render();`);
ok("(fixture) a day open for editing", run(`hist.edit==='2026-07-04'`));
tapTab('history');
ok("History tapped with a day open closes it and comes home", thisMonth()&&run(`!hist.edit&&!hist.editSet`));

histFixture();
run(`hist.part='Legs';render();`);
ok("(fixture) on this month with a part filter", thisMonth()&&run(`hist.part==='Legs'`));
tapTab('history');
ok("History tapped at home keeps the part filter: a viewpoint, not a place", thisMonth()&&run(`hist.part==='Legs'`));

// and the older rule: from another tab, History opens where you left it
histFixture();
run(`hist.y=2026;hist.m=7;render();`);
tapTab('stats');tapTab('history');
ok("History tapped from ANOTHER tab opens the month you were reading", run(`view==='history'&&hist.m===7`));

run(`view='stats';PMIX_FOCUS='Legs';render();`);
tapTab('stats');
ok("Stats tapped on Stats keeps its viewpoint: nothing to pop, only scroll", run(`view==='stats'&&PMIX_FOCUS==='Legs'`));

console.log(fail?`FAIL ${fail}`:"PASS the arrow goes to the previous navigation point; every tab, tapped from inside, goes home");
process.exit(fail?1:0);
