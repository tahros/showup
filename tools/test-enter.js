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

/* v3.3.64 gave the go-to card a chevron because a flat card said nothing
   about being pressable. v3.3.298 RESTATES that requirement rather than
   dropping it: the affordance is now the row's own edge and press state
   (B1), and the chevron is gone because it was the middle child of a
   space-between row and landed somewhere different on every card. The
   property defended is unchanged — a go-to row must LOOK pressable — so it
   is asserted on what carries that now. */
run(`_lastLiftPart='\u0000'; lift={part:'Back',ex:null,weight:0}; view='lift'; render();`);
check("no floating chevron survives on any row",
      `!!document.querySelector('#view .gochev')`, false);
check("every go-to row is a real button you can press",
      `[...document.querySelectorAll('#view .logrow')].every(r=>!!r.querySelector('button.logmain[data-ex]'))`, true);
/* v3.3.300: Train's own "· today" rows ALSO carry .logrow, so v3.3.298's
   ranked-row rule reached them and forced name + set detail onto one flex
   line — the exercise name ellipsised down to "E…". A ranked row puts name
   and weight side by side; a session row stacks the name over its sets.
   Both shapes are asserted here so neither can eat the other again. */
run(`(function(){DB.days={}; DB.settings.unit='lb'; const td=dayMeta();
  for(let i=0;i<3;i++) td.w.push({part:'Biceps',ex:'EZ Bar Curl',w:toKg(40),reps:[10],at:1});
  SEED=deriveAll(); view='lift'; lift.ex=null; lift.part='Biceps'; render();})()`);
check("a session row keeps its whole exercise name",
      `document.querySelector('.item.todayrow b').textContent`, "EZ Bar Curl");
check("...with the sets on their own line beneath it",
      `(function(){const r=document.querySelector('.item.todayrow');
        return !!r.querySelector('.sub') && /40lb/.test(r.querySelector('.sub').textContent);})()`, true);
check("...and the day's volume in a column of its own",
      `!!document.querySelector('.item.todayrow .tvol')`, true);
{
  const css300 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  check("the ranked-row rule cannot reach a session row",
        `${/\.item\.logrow:not\(\.goto\):not\(\.todayrow\) \.logmain\{[^}]*display:flex/.test(css300)
           && !/\.item\.logrow:not\(\.goto\) \.logmain\{/.test(css300)}`, "true");
}
{
  const css298 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  check("...and the row carries its own edge, so it reads as one",
        `${/\.item\.goto\{[^}]*border:0\.5px solid var\(--line\)/.test(css298)}`, "true");
  check("...with a press state that settles under the thumb",
        `${/\.item\.logrow:active\{[^}]*transform:scale/.test(css298)}`, "true");
  /* v3.3.305 RESTATES: this asserted the presence of `border-left:0`, but
     that declaration was dead — the `border:0.5px solid var(--line)` two
     lines below it already reset all four sides — and removing it broke a
     test of a property that had not changed. The property is that the row
     carries ONE uniform hairline, not a heavy accent rail down one side. */
  /* scope to the LIVE rule: `.item.goto{` also appears inside the
     data-design-preview experiment, which declares border-left:1px, and an
     unanchored search happily matched that instead. */
  {
    const live = (css298.split('[data-design-preview')[0].match(/\.item\.goto\{[^}]*/) || [""])[0];
    check("...and no accent rail down one side of every row",
          `${/border:0\.5px solid var\(--line\)/.test(live) && !/border-left:\s*[1-9]/.test(live)}`, "true");
  }
}

process.exit(fail ? 1 : 0);
