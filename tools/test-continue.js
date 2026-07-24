// test-continue.js DIR — boots the app, injects today-sets into the live DB,
// clicks data-go buttons, asserts the router's landing spot (ritual step 6).
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage31";

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

const run = (code) => vm.runInContext(code, ctx);
const click = (partAttr) => run(`
  (()=>{ const b=document.createElement('button'); b.setAttribute('data-go','${partAttr}');
    document.body.appendChild(b); b.click(); b.remove();
    return JSON.stringify({view, part:lift.part, ex:lift.ex}); })()`);

// fixture: today has an open Shoulder (2 exercises, press logged last) and a sealed-part control
run(`
  const t=dayMeta();
  t.w.push({part:'Shoulder',ex:'Lateral Raise',w:8,reps:[15]});
  t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[35]});
  t.w.push({part:'Back',ex:'Pull Up',w:70,reps:[8]});
  t.donePart.push('Back');
`);

let fail = 0;
const expect = (name, got, want) => {
  const g = JSON.parse(got), ok = g.view===want.view && g.part===want.part && g.ex===want.ex;
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

expect("open part → last exercise",   click("Shoulder"), {view:"lift", part:"Shoulder", ex:"Dumbbell Press"});
expect("sealed part → part view",     click("Back"),     {view:"lift", part:"Back",     ex:null});
expect("untouched part → part view",  click("Chest"),    {view:"lift", part:"Chest",    ex:null});
expect("Run → part view (owns itself)", click("Run"),    {view:"lift", part:"Run",      ex:null});
process.exit(fail ? 1 : 0);
