// test-enter.js DIR — v3.3.57: exercise cards animate in ONCE per part
// selection. A mid-session re-render must not re-bounce them, and a jump
// straight into an exercise must not leave the flag armed for later.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage57";

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

run(`
  {const t0=new Date(todayISO+'T00:00');
   for(let i=1;i<=6;i++){
     const d=new Date(t0); d.setDate(d.getDate()-i*4);
     DB.days[d.toLocaleDateString('en-CA')]={w:[
       {part:'Back',ex:'Pull Up',w:70,reps:[8]},
       {part:'Back',ex:'Row',w:32.5,reps:[12]},
     ],upd:1,doneEx:[],donePart:[],doneAll:true};}
   SEED=deriveAll(); _fireDist=null; view='lift'; lift={part:null,ex:null,weight:0}; render();}
`);

// tap the part the way the app does — through the delegated handler
run(`
  const card=[...document.querySelectorAll('[data-part]')].find(x=>x.dataset.part==='Back'&&!x.dataset.ex);
  card.click();
`);
check("cards carry .enter after a part tap",
      `document.querySelectorAll('#view .item.logrow.enter').length > 0`, true);
check("stagger indexes ascend",
      `(()=>{const is=[...document.querySelectorAll('#view .item.logrow.enter')]
          .map(x=>+x.style.getPropertyValue('--i'));
        return is.length>1 ? is.every((v,i)=>i===0||v>=is[i-1]) : true;})()`, true);

// a re-render without a new part tap must NOT re-animate
run(`renderLift();`);
check("plain re-render → no .enter",
      `document.querySelectorAll('#view .item.logrow.enter').length`, 0);

// jumping straight into an exercise consumes the flag; the NEXT part list
// visit (back button, no tap) must not animate late
run(`lift.enterAnim=true; lift.ex='Pull Up'; renderLift();`);   // exercise view consumed it
run(`lift.ex=null; renderLift();`);                              // back to the list, no tap
check("stale flag can't animate a later visit",
      `document.querySelectorAll('#view .item.logrow.enter').length`, 0);

// v3.3.64: the morning case — the app opens with a part already restored
// from saved state and NO tap happens. That's exactly when the invitation
// matters, and exactly when v3.3.57 stayed still.
run(`
  {_lastLiftPart='\u0000';                    // fresh boot
   lift={part:'Back',ex:null,weight:0,enterAnim:false};
   view='lift'; render();}
`);
check("restored part animates without any tap",
      `document.querySelectorAll('#view .item.logrow.enter').length > 0`, true);
check("...and the very next render does not",
      `(()=>{renderLift(); return document.querySelectorAll('#view .item.logrow.enter').length;})()`, 0);

// switching parts animates the new list
run(`lift.part='Chest'; renderLift();`);
check("changing part animates the new list",
      `document.querySelectorAll('#view .item.logrow.enter').length > 0`, true);

// the go-to card now carries a press affordance
run(`_lastLiftPart='\u0000'; lift={part:'Back',ex:null,weight:0}; view='lift'; render();`);
check("go-to cards carry the chevron",
      `!!document.querySelector('#view .logrow.goto .gochev')`, true);
check("non-goto rows do not",
      `[...document.querySelectorAll('#view .logrow:not(.goto)')].every(r=>!r.querySelector('.gochev'))`, true);

process.exit(fail ? 1 : 0);
