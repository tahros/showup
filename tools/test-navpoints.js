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
const tapTab=v=>run(`document.querySelector('nav button[data-v="${v}"]').click()`);
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
ok("(fixture) stepped out to Stats with the workspace still open", run(`view==='stats'`) && run(`lift.plan==='workspace'`));
tapTab('today');
ok("Today tapped from ANOTHER tab opens Today as it was: the sub-section", inWorkspace(), where());
tapTab('today');
ok("...and a second tap, now from inside, goes to the default page", atTodayRoot(), where());
// and from another tab with nothing open, Today is simply Today
fresh();
tapTab('stats');tapTab('today');
ok("from Stats with nothing open, Today is Today", atTodayRoot());

console.log(fail?`FAIL ${fail}`:"PASS the arrow goes to the previous navigation point; Today from inside Today goes home");
process.exit(fail?1:0);
