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

/* a plan for today: Squat 195 x 8, 8, 8. Two sets logged against it, so the
   basis is frozen and two logs carry planRefs. */
run(`(function(){
  DB.days={}; DB.settings.unit='lb'; DB.settings.onboarded=true; DB.plan=null; DB.week=null; DB.planTracking=null;
  const text="Squat\\n  195 lb x 8 8 8";
  const {items}=planItemsFrom(parsePlan(text)); planSave(items,'',text,todayISO);
  DB.days[todayISO]={w:[],doneEx:[],donePart:[],upd:Date.now()};
  SEED=deriveAll(); view='lift'; lift.part='Legs'; lift.ex='Squat'; lift.editToday=false; lift.editPlan=false; render();
  for(const i of [0,1]) plLog({part:'Legs',ex:'Squat',w:toKg(195),reps:[8],at:Date.now()+i});   // plLog pushes
  save(); SEED=deriveAll(); renderLift();
})()`);
ok("(fixture) three planned targets, two logged and linked",
   run(`plBasis(todayISO).targets.length`)===3 && run(`DB.days[todayISO].w.filter(s=>s.planRef).length`)===2,
   run(`plBasis(todayISO).targets.length`)+" targets, "+run(`DB.days[todayISO].w.filter(s=>s.planRef).length`)+" linked of "+run(`DB.days[todayISO].w.length`)+" · "+run(`JSON.stringify(DB.days[todayISO].w.map(s=>s.planLinkStatus||'ref'))`));
const idsBefore = run(`JSON.stringify(plBasis(todayISO).targets.map(t=>t.id))`);
const refsBefore = run(`JSON.stringify(DB.days[todayISO].w.map(s=>s.planRef.setId))`);

// ---- entering the mode
ok("read mode names each planned value for the morph",
   run(`document.querySelectorAll('.sc-plan-wrap[style*="view-transition-name"]').length`)===3);
ok("Edit Plan is offered and does NOT leave for the planner",
   run(`!!document.querySelector('[data-sc-edit-plan]')`) && !run(`!!document.querySelector('.pw-workspace')`));
run(`document.querySelector('[data-sc-edit-plan]').click()`);
ok("...it opens the same table, in plan mode", run(`!!document.querySelector('.sc-editing-plan')`) && !run(`!!document.querySelector('.pw-workspace')`));
ok("...one row per target, load and reps each a target",
   run(`document.querySelectorAll('.sc-editing-plan tbody tr').length`)===3 &&
   run(`document.querySelectorAll('.sc-editing-plan [data-pt-edit]').length`)===6);
ok("...the same names, so the values morph rather than fade",
   run(`JSON.stringify([...document.querySelectorAll('.sc-editing-plan .lw-pair')].map(n=>n.style.viewTransitionName).sort())`)
   === run(`JSON.stringify([...plBasis(todayISO).targets].map(t=>'pt-'+String(t.id).replace(/[^A-Za-z0-9_-]/g,'_')).sort())`));
ok("...no delete: structure stays in the planner, behind a named door",
   run(`document.querySelectorAll('.sc-editing-plan [data-lw-del]').length`)===0 && run(`!!document.querySelector('[data-pl-planner]')`));
ok("...and the button reads Done", /Done/.test(run(`document.querySelector('[data-sc-edit-plan]').textContent`)));
ok("...Complete workout steps aside here too", !run(`!!document.getElementById('scFinishBtn')`));

// ---- editing reps on the THIRD target (unlogged)
run(`[...document.querySelectorAll('[data-pt-edit][data-lw-field="r"]')].pop().click()`);
ok("tapping planned reps opens the inline editor in that row",
   run(`!!document.querySelector('tr.lw-editing .lw-inline #lwInput')`) && run(`document.getElementById('lwInput').value`)==="8");
ok("...focused", run(`document.activeElement && document.activeElement.id`)==="lwInput");
run(`document.getElementById('lwInput').value='10'; document.getElementById('lwSave').click();`);
ok("saving updates the SAVED plan", run(`JSON.stringify(DB.plan.items[0].lines[0].reps)`)==="[8,8,10]", run(`JSON.stringify(DB.plan.items[0].lines[0].reps)`));
ok("...and today's frozen copy, at the same position",
   run(`JSON.stringify(plBasis(todayISO).content.items[0].lines[0].reps)`)==="[8,8,10]" && run(`plBasis(todayISO).targets[2].reps`)===10);
ok("...regenerating the raw text the planner reopens on", /8 8 10/.test(run(`DB.plan.raw`)), run(`DB.plan.raw`));
ok("...without minting or moving a single target id", run(`JSON.stringify(plBasis(todayISO).targets.map(t=>t.id))`)===idsBefore);
ok("...so the two logged sets stay linked to their targets", run(`JSON.stringify(DB.days[todayISO].w.map(s=>s.planRef.setId))`)===refsBefore);
ok("...and the 'edited since you started' notice does not fire -- the copies agree",
   !/edited since you started/.test(run(`document.querySelector('.sc-session').textContent`)));
ok("...the row shows the new target", /10/.test(run(`[...document.querySelectorAll('.sc-editing-plan tbody tr')].pop().textContent`)));

// ---- editing the weight on a LOGGED target: the log keeps its provenance
run(`document.querySelector('[data-pt-edit][data-lw-field="w"]').click()`);
ok("tapping planned weight opens a decimal field with the load", run(`document.getElementById('lwInput').getAttribute('inputmode')`)==="decimal" && run(`+document.getElementById('lwInput').value`)===195);
run(`document.getElementById('lwInput').value='205'; document.getElementById('lwSave').click();`);
ok("saving writes the new load to the plan line", Math.abs(run(`DB.plan.items[0].lines[0].w`)-run(`toKg(205)`))<1e-9);
ok("...and to today's targets", Math.abs(run(`plBasis(todayISO).targets[0].w`)-run(`toKg(205)`))<1e-9);
ok("...while the logged set keeps the target it was logged AGAINST (append-only provenance)",
   Math.abs(run(`DB.days[todayISO].w[0].planRef.target.w`)-run(`toKg(195)`))<1e-9);

// ---- cancel paths and mode exclusivity
run(`document.querySelector('[data-pt-edit][data-lw-field="r"]').click(); document.querySelector('[data-pt-edit][data-lw-field="r"]').click();`);
ok("the same chip again cancels", !run(`!!document.getElementById('lwInput')`));
run(`document.querySelector('[data-pt-edit][data-lw-field="r"]').click(); document.getElementById('lwInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`);
ok("Escape cancels", !run(`!!document.getElementById('lwInput')`));
run(`document.getElementById('sessEdit').click()`);
ok("Edit Logged takes over: one mode at a time",
   run(`!!lift.editToday && !lift.editPlan`) && run(`!!document.querySelector('.sc-editing:not(.sc-editing-plan)')`));
run(`document.querySelector('[data-sc-edit-plan]').click()`);
ok("...and Edit Plan takes it back", run(`!!lift.editPlan && !lift.editToday`));
run(`document.querySelector('[data-sc-edit-plan]').click()`);
ok("Done returns to the four-column table", !run(`!!document.querySelector('.sc-editing')`) && run(`document.querySelectorAll('.sc-table thead th').length`)>=3);
ok("the planner door still opens the planner",
   (()=>{ run(`lift.editPlan=true; renderLift(); document.querySelector('[data-pl-planner]').click();`); const there=run(`!!document.querySelector('.pw-workspace, .pf-workspace')`); run(`lift.editPlan=false; view='lift'; render();`); return there; })());

console.log(fail?`FAIL ${fail}`:"PASS Edit Plan edits in place: saved plan and frozen copy agree, ids fixed, links kept, planner kept for structure");
process.exit(fail?1:0);
