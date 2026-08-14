// test-repcard.js DIR — v3.3.130: one share surface, rotated.
//
// The interesting failures here are the quiet ones. A carousel that renders
// perfectly but always sends card 1 looks correct on screen. So does one that
// offers a Pace card to someone who has never run. Both are checked by
// driving the real controls and reading what the renderer was actually
// handed, not by inspecting markup.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.performance = w.performance || { now: () => Date.now() };
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({ measureText: () => ({ width: 10 }) },
  { get: (o,k) => k in o ? o[k] : () => ({}), set: () => true }); };
w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AA";
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

// a year of lifting AND running, so every card qualifies
const seedFull = `(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=400;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    if(i%7===0) continue;
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};
    if(i%3===0) DB.days[iso].w.push({part:'Run',ex:'Run',w:5,reps:[],mins:28,secs:0,at:1});
  }
  SEED=deriveAll(); view='stats'; render();})()`;
run(seedFull);

// ---- 1. the old surface is gone --------------------------------------------
ok("no per-section share icon anywhere in Stats",
   run(`document.querySelectorAll('.shareb').length`) === 0,
   run(`document.querySelectorAll('.shareb').length`) + " left");
ok("the .shareb style is gone from the stylesheet too",
   !/\.ibtn\.shareb/.test(fs.readFileSync(path.join(dir, "css/app.css"), "utf8")));
ok("hActs no longer accepts a share id",
   !/function hActs\(id,text,shareId\)/.test(fs.readFileSync(path.join(dir, "js/header.js"), "utf8")));
ok("the download icon asset was deleted with its last caller",
   !/DL_ICON/.test(fs.readFileSync(path.join(dir, "js/header.js"), "utf8")));

// ---- 2. the one surface moved from analysis to the ledger -----------------
ok("the report card is absent from Stats", run(`!document.getElementById('repCard')`));
run(`view='history'; render();`);
ok("the report card renders", run(`!!document.getElementById('repCard')`));
ok("...with exactly one share button",
   run(`document.querySelectorAll('#repShare').length`) === 1);
ok("...and both rotation controls",
   run(`!!document.getElementById('repPrev') && !!document.getElementById('repNext')`));
ok("it is collapsed by default in History", run(`!document.getElementById('secReport').open`));

// ---- 3. rotation actually changes what gets SENT ---------------------------
/* The failure this catches: a carousel whose title rotates while the share
   button keeps sending the first card. Nothing on screen would look wrong. */
run(`__origShow = showCard; globalThis.__sent=[];
     showCard = (fn,label) => { globalThis.__sent.push(label); return null; };`);
run(`_repIdx=0;
     document.querySelector('#repShare').click();
     document.querySelector('#repNext').click();
     document.querySelector('#repShare').click();
     document.querySelector('#repNext').click();
     document.querySelector('#repShare').click();`);
const sent = JSON.parse(run(`JSON.stringify(globalThis.__sent)`));
run(`showCard = __origShow; _repIdx=0;`);
ok("every tap of Share reaches the renderer", sent.length === 3, sent.length + "/3");
ok("...and each rotation sends a DIFFERENT card",
   new Set(sent).size === 3, sent.join(" \u2192 "));

// the title on screen must name the card that would actually be sent
run(`_repIdx=0; paintRepCard();`);
run(`document.querySelector('#repNext').click();`);
const shownTitle = run(`document.getElementById('repTtl').textContent`);
const wouldSend = run(`shareCards()[_repIdx].label`);
ok("the title names the card the button would send", shownTitle === wouldSend,
   shownTitle + " vs " + wouldSend);
run(`_repIdx=0;`);

// ---- 4. wrapping, both directions ------------------------------------------
ok("forward past the end wraps to the first", run(`(function(){
     const n=shareCards().length; _repIdx=n-1; repRotate(1);
     const r=_repIdx; _repIdx=0; return r===0;})()`));
ok("back from the first wraps to the last", run(`(function(){
     const n=shareCards().length; _repIdx=0; repRotate(-1);
     const r=_repIdx; _repIdx=0; return r===n-1;})()`));

// ---- 5. every registered card draws something real -------------------------
let calls = [];
run(`__realCtx = HTMLCanvasElement.prototype.getContext;`);
const drew = run(`(function(){
  const out={};
  for(const c of shareCards()){
    try{ out[c.id] = !!c.draw(); }catch(e){ out[c.id]='ERR:'+e.message; }
  }
  return JSON.stringify(out);})()`);
const drewO = JSON.parse(drew);
ok("every registered card draws without throwing",
   Object.values(drewO).every(v => v === true),
   Object.entries(drewO).filter(([,v]) => v !== true).map(([k,v]) => k+"="+v).join(",") || "all ok");
ok("every card produces a non-empty file name",
   run(`shareCards().every(c=>typeof c.file==='function' && c.file().length>0)`));
ok("card ids are unique", run(`(function(){
     const ids=shareCards().map(c=>c.id); return new Set(ids).size===ids.length;})()`),
   run(`shareCards().map(c=>c.id).join(',')`));

// ---- 6. run cards are withheld from someone who has never run --------------
/* An empty Pace card is not a card, it is a bug with a title. */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=200;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};
  }
  SEED=deriveAll(); view='stats'; render();})()`);
const liftOnly = JSON.parse(run(`JSON.stringify(shareCards().map(c=>c.id))`));
ok("a lifter who never runs is offered no Pace card", !liftOnly.includes("pace"), liftOnly.join(","));
ok("...no Distance card either", !liftOnly.includes("dist"));
ok("...but still gets the days cards", liftOnly.includes("grid") && liftOnly.includes("yoy"));
run(`view='history'; render();`);
ok("the carousel still renders for them", run(`!!document.getElementById('repShare')`));

/* and the index cannot point past the end after the list shrinks — the
   rotate-to-Pace-then-delete-your-runs case */
run(`_repIdx=99; `);
const clamped = run(`(function(){ const c=repCardAt(); return c && c.card && c.card.id; })()`);
ok("a stale index is clamped back into range, not left dangling",
   typeof clamped === "string" && liftOnly.includes(clamped), String(clamped));
run(`_repIdx=0;`);

// ---- 7. the (i) got quieter but not smaller to the thumb -------------------
const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const ibtn = (css.match(/\.ibtn\{[^}]*\}/) || [""])[0];
ok("the i is no longer a filled disc", !/background:var\(--chalk\)/.test(ibtn), ibtn.slice(0, 60));
ok("...it uses the muted colour", /color:var\(--muted\)/.test(ibtn));
/* v3.3.131: the bare glyph was too quiet (maker's verdict) \u2014 a dim outlined
   circle now, and the 22px circle itself is the tap target. */
ok("...inside a dim outlined circle", /border:1px solid var\(--line\)/.test(ibtn) && /border-radius:50%/.test(ibtn));
ok("...whose circle is the ~22px tap target",
   /width:22px/.test(ibtn) && /height:22px/.test(ibtn), (ibtn.match(/width:[^;]*/)||"") + "");

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
