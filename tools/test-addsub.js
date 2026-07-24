// test-addsub.js DIR — v3.3.58: the Add set button's preview children must
// not eat the tap. When updAddPreview injects "→ 11,325 kg ▲4", a tap lands
// on the inner <span>/<b>; the router must still log the set.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage58";

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

// 40+ real days so fireDist has its 30-day minimum and the preview renders
run(`
  {const t0=new Date(todayISO+'T00:00');
   for(let i=1;i<=45;i++){
     const d=new Date(t0); d.setDate(d.getDate()-i);
     DB.days[d.toLocaleDateString('en-CA')]={w:[
       {part:'Biceps',ex:'Barbell Curl',w:20,reps:[20,20]},
     ],upd:1,doneEx:[],donePart:[],doneAll:true};}
   SEED=deriveAll(); _fireDist=null;
   view='lift'; lift={part:'Biceps',ex:'Barbell Curl',weight:20}; render();}
`);

// type reps → the preview letters appear inside the button
run(`
  {const rc=document.getElementById('rc');
   rc.value='12';
   rc.dispatchEvent(new Event('input',{bubbles:true}));}
`);
check("preview letters rendered inside the button",
      `!!document.querySelector('#addrep .addsub')`, true);

const before = run(`day(todayISO).w.filter(s=>s.ex==='Barbell Curl').length`);

// the failing tap: click the INNER preview span, not the button itself
run(`document.querySelector('#addrep .addsub b').click();`);
check("tap on the preview's <b> logs the set",
      `day(todayISO).w.filter(s=>s.ex==='Barbell Curl').length`, before+1);

// and again on the span (the button re-rendered; re-type the reps)
run(`
  {const rc=document.getElementById('rc');
   if(rc){ rc.value='10'; rc.dispatchEvent(new Event('input',{bubbles:true})); }}
`);
check("second preview shows on the fresh render",
      `!!document.querySelector('#addrep .addsub')`, true);
run(`document.querySelector('#addrep .addsub').click();`);
check("tap on the preview <span> logs too",
      `day(todayISO).w.filter(s=>s.ex==='Barbell Curl').length`, before+2);

// the plain button (no preview) still works
run(`
  {const rc=document.getElementById('rc');
   if(rc){ rc.value='8'; }
   document.getElementById('addrep').click();}
`);
check("plain button tap still logs",
      `day(todayISO).w.filter(s=>s.ex==='Barbell Curl').length`, before+3);

process.exit(fail ? 1 : 0);
