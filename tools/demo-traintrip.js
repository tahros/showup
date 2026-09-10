/* demo-traintrip.js — drive the REAL UI through the maker's three taps and read
 * the rendered DOM at each one.
 *
 * WHY THIS EXISTS. v3.3.507 claimed to fix "coming back from Train loses the
 * week you were reading" and did not, and the reason is the shape of the test
 * rather than the code: it set `view='today'` and called render() directly, so
 * it never went through the nav handler -- which is the only way into Train on
 * a phone, and which had a third wholesale `lift=` assignment the fix missed.
 * A test that drives state instead of controls will agree with any bug that
 * lives in a control.
 *
 * So this walks the buttons: tap WEEK, tap the Train tab, tap the Today tab,
 * and print what is ON SCREEN after each -- which scope pill is selected, is
 * the week stack rendered, which days are open. Run it with a version argument
 * to see the same trip on an older build:
 *     node tools/demo-traintrip.js .
 */
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""),
  { url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = q => ({ matches: /no-preference/.test(String(q)), media: String(q),
  addEventListener() {}, removeEventListener() {} });
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({ measureText: () => ({ width: 10 }) }, { get: (o, k) => k in o ? o[k] : () => ({}) });
};
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

/* a plan for today with several exercises, none of them logged yet */
run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  for(let i=1;i<=20;i++){const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Incline Barbell Bench Press',w:70,reps:[8,8],at:1},
      {part:'Back',ex:'Deadlift',w:97,reps:[5],at:1}],upd:1};}
  SEED=deriveAll(); view='today'; render();})()`);
/* ...and a PLAN for today. This is the half the first cut of this demo missed:
   plannedTrainPart() is null without one, so the nav handler fell through to
   the branch that resumes -- and the demo passed on a build the maker had just
   watched fail. A reproduction that omits the condition reproduces nothing. */
run(`(function(){
  const txt='Incline Barbell Bench Press\\n  175 lb x 5\\n\\nCable Fly Up\\n  30 lb x 12 10 10\\n';
  planSave(parsePlan(txt)); SEED=deriveAll(); view='today'; render();})()`);
console.log("planned part today: "+run(`String(plannedTrainPart())`));

const screen=()=>run(`(function(){
  const h=document.querySelector('#view h2,.lifthead .lt,.hh .lt');
  return JSON.stringify({tab:(document.querySelector('nav button.on')||{}).dataset&&(document.querySelector('nav button.on')||{}).dataset.v,
    part:lift.part||null, ex:lift.ex||null,
    shows:(document.querySelector('.lifthead b,.hh b,#view h2')||{textContent:''}).textContent.trim().slice(0,42)});})()`);
const tap=sel=>run(`(function(){const el=document.querySelector(${JSON.stringify(sel)});
  if(!el) throw new Error('no control: '+${JSON.stringify(sel)});
  el.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));})()`);
const show=l=>console.log(String(l).padEnd(36)+screen());

console.log("version "+(html.match(/core\.js\?v=([\d.]+)/)||[])[1]+"\n");
tap('nav button[data-v="lift"]');
show("1. Train tab");
run(`(function(){lift.part='Chest'; render();})()`);
show("   opened the Chest part");
run(`(function(){lift.ex='Incline Barbell Bench Press'; lift.weight=0; render();})()`);
show("   opened an exercise, no sets yet");
const before=screen();
tap('nav button[data-v="today"]');
show("2. Today tab");
tap('nav button[data-v="lift"]');
show("3. back to the Train tab");
const after=screen();
const b=JSON.parse(before), a=JSON.parse(after);
const same = b.ex===a.ex && b.part===a.part;
console.log((same
  ? "PASS Train came back to the exercise he was standing on"
  : "FAIL Train dropped him somewhere else\n  left:  "+before+"\n  found: "+after));

/* ---- and the other half, which v3.3.518 was right about ----
   Once the exercise is TICKED DONE there is nothing to go back to, and the
   plan's next part is the better landing. Resuming a finished screen would be
   the opposite bug, so it is driven here rather than argued. */
console.log("\n--- once that exercise is ticked done ---");
run(`(function(){const t=DB.days[todayISO]||(DB.days[todayISO]={w:[],upd:1});
  t.doneEx=(t.doneEx||[]).concat(['Incline Barbell Bench Press']);
  SEED=deriveAll(); render();})()`);
tap('nav button[data-v="today"]');
tap('nav button[data-v="lift"]');
show("   back to the Train tab");
const done=JSON.parse(screen());
const landed = done.ex===null && done.part==='Chest';
console.log((landed
  ? "PASS a finished exercise hands you to the plan's part instead"
  : "FAIL should have landed on the planned part → "+JSON.stringify(done)));
process.exit(same&&landed?0:1);
