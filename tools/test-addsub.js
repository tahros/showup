// test-addsub.js DIR — v3.3.58: the Add set button's preview children must
// not eat the tap. When updAddPreview injected "→ 11,325 kg ▲4", a tap landed
// on the inner <span>/<b> and the router had to log anyway.
//
// v3.3.290 RESTATES the suite. The volume preview is deleted, so the bug is
// now impossible BY CONSTRUCTION rather than handled — which is a stronger
// guarantee and worth pinning as such: the button must hold no child elements
// at all, so no tap can ever land on something that is not the button. The
// original property (a tap logs the set) is asserted unchanged.
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

/* v3.3.286: reps come from the ruler now, not a text field. The property
   this suite defends is untouched — a tap landing on the preview's INNER
   nodes must still log, because a thumb hits the letters, not the button —
   so only how the reps get set changes. */
run(`repRulerTo(12,false);`);
check("the button holds no children for a tap to miss",
      `document.getElementById('addrep').children.length`, 0);
check("...and says only what it will do",
      `document.getElementById('addrep').textContent.trim()`, "Add set \u00b7 12 reps");
check("...with no volume commentary anywhere on it",
      `/\u25b2|lb|kg/.test(document.getElementById('addrep').textContent)`, false);

const before = run(`day(todayISO).w.filter(s=>s.ex==='Barbell Curl').length`);
run(`document.getElementById('addrep').click();`);
check("a tap logs the set the label named",
      `day(todayISO).w.filter(s=>s.ex==='Barbell Curl').length`, before+1);
check("...at the reps it showed",
      `JSON.stringify(day(todayISO).w.filter(s=>s.ex==='Barbell Curl').pop().reps)`, "[12]");

/* NOT asserted: a tap "on the text inside the button". A browser reports the
   ELEMENT as the target for a text node, so the only way to write that test
   is to fabricate an event no browser emits — which proves nothing. With
   children.length===0 there is nothing inside the button to hit; that is the
   real guarantee, and it is asserted above. */

process.exit(fail ? 1 : 0);
