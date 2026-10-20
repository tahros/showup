// test-trainlive.js DIR -- v4.6.360: Train during a live set (approved mock).
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

run(`(function(){
  const t0=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t0);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  DB.days[D(3)]={w:[{part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12,12]},{part:'Sixpack',ex:'Decline Sit Up',w:0,reps:[15]}],upd:1};
  DB.days[D(10)]={w:[{part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[10,10]}],upd:1};
  DB.days[todayISO]={w:[{part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12],at:Date.now()},
                        {part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12],at:Date.now()}],upd:Date.now()};
  SEED=deriveAll(); lastSetAt=Date.now();
  lift={ex:null,part:'Sixpack',weight:0}; view='lift'; render();})()`);
check("the live part's tile is selected and live", `!!document.querySelector('.partcard.sel.liveP[data-part="Sixpack"]')`, true);
check("...and says today without an emoji", `document.querySelector('.partcard.sel.liveP .ps').textContent.trim()`, "today");
check("the Body part label is kept for screen readers only", `document.querySelector('h2.flow-bodyhead').classList.contains('vh')`, true);
check("today's sets sit in one card, outlined while open", `!!document.querySelector('.pt-card.on .todayrow[data-ex], .pt-card.on .todayrow .logmain[data-ex="Hanging Leg Raise"]')`, true);
check("...with no delete button beside them", `!document.querySelector('[data-dropex]')`, true);
check("...and Continue inside it, naming the exercise", `document.querySelector('.pt-card .btnrow .btn[data-go]').textContent.trim()`, "Continue Hanging Leg Raise →");
check("the heading uses the part's display name", `document.querySelector('.pt-head h2').textContent.trim()`, `${run("partLabel('Sixpack')")} · today`);
check("last time is a link on the heading, card closed", `!!document.querySelector('.pt-head .pt-last') && !document.querySelector('.partlast')`, true);
run(`document.querySelector('.pt-last').click()`);
check("...which opens the playbook", `!!document.querySelector('.partlast .plrow')`, true);
check("...named with the display name, not the stored key", `document.querySelector('.partlast .scopepill').textContent`, run("partLabel('Sixpack')"));
check("no empty-weight placeholder in the list", `!document.querySelector('.pr-nil')`, true);

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
