// test-plan.js DIR — v3.3.278. Today's plan: a pasted session read into the
// rails the app already has. Two halves: the parser (a pure function, so
// asserted on values) and the promise (today-only, never logged, never
// scored — asserted on effects, through real clicks).
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
/* v3.3.319: pretendToBeVisual, because this suite now renders the TODAY tab
   (the plan moved there) and Today's count-up calls requestAnimationFrame,
   which jsdom does not provide otherwise. Same limitation recorded in
   v3.3.285. */
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only",
  pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

// the maker's own paste, verbatim in shape: warm-up line, working line, a
// coach note after an arrow, an exercise not in the catalog, a timed hold.
const PASTE = [
  "Dumbbell Shoulder Press               6 sets",
  "  35 lb    10    8            \u2190 warm-up",
  "  55 lb     8    8    8    8   \u2190 6s acceptable",
  "",
  "Lateral Raise                          4 sets",
  "  35 lb    12   12   10   10",
  "",
  "Rear Delt Fly                          4 sets",
  "  25 lb    12   12   10   10",
  "",
  "Hanging Leg Raise                      3 sets",
  "  BW       10    8    8",
  "",
  "Plank                                  2 sets",
  "  60 sec each",
  "",
  /* v3.3.346: the fixture needs a line that genuinely cannot become a plan
     item. Plank used to be that line -- and stopped being one the moment a
     set could be seconds, which silently emptied the note and left the
     "kept verbatim" assertion testing nothing. A fixture that no longer
     contains the case is a passing test with no subject. */
  "Foam roll                              as needed"
].join("\n");

run(`(function(){DB.days={}; DB.settings.unit='lb'; const t=new Date(todayISO+'T00:00');
  const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
  for(const n of [10,4]) DB.days[D(n)]={w:[{part:'Shoulder',ex:'Lateral Raise',w:13,reps:[12,12,10]}],upd:1};
  SEED=deriveAll(); DB.plan=null; DB.suggest=null;
  view='today'; lift.ex=null; lift.part='Shoulder'; lift.plan=null; render();})()`);

// ---- 1. the parser reads what it can, and only what it can ----------------
run(`window.__rows=parsePlan(${JSON.stringify(PASTE)});`);
/* v3.3.280 RESTATES: the first version kept only the last weight line, so a
   paste headed "6 sets" produced a plan of 4 and the two warm-up sets were
   read and then discarded. Silently dropping input the parser UNDERSTOOD is
   worse than failing to parse it. Every line is kept, in written order. */
ok("every weight line is kept, warm-up first",
   run(`(function(){const r=__rows.find(x=>x.ex==='Dumbbell Shoulder Press');
     return r.lines.length===2 && r.lines[0].w===35 && r.lines[0].reps.join()==='10,8'
       && r.lines[1].w===55 && r.lines[1].reps.join()==='8,8,8,8';})()`) === true);
ok("...and the plan's set count matches what the paste claimed (6 sets)",
   run(`(function(){const {items}=planItemsFrom(__rows);
     const i=items.find(x=>x.ex==='Dumbbell Shoulder Press');
     return planSets(i).length===6;})()`) === true);
ok("a coach note after an arrow is not read as data",
   run(`(function(){const r=__rows.find(x=>x.ex==='Dumbbell Shoulder Press');
     return r.lines.every(l=>l.reps.every(n=>n>0&&n<100));})()`) === true);
ok("BW is a weight of zero, not a missing line",
   run(`(function(){const r=__rows.find(x=>x.ex==='Hanging Leg Raise');
     const l=r.lines[0]; return l.bw===true && l.w===0 && l.reps.join()==='10,8,8';})()`) === true);
ok("a name not in the catalog is NOT guessed — it offers candidates",
   run(`(function(){const r=__rows.find(x=>x.name==='Rear Delt Fly');
     return r.ex===null && r.cands.length>0 && r.cands.includes('Rear Deltoids');})()`) === true,
   run(`JSON.stringify(__rows.find(x=>x.name==='Rear Delt Fly').cands)`));
/* v3.3.346 RESTATES v3.3.278. The property is that a line the parser cannot
   turn into a plan item is KEPT rather than dropped -- never that Plank in
   particular is unreadable. Since v3.3.343 a set can BE seconds, so "Plank /
   60 sec each" is now a real item, and the property moves to a line that
   genuinely has nothing to prefill. Nothing is dropped either way, which is
   the thing being defended. */
ok("a heading with no readable sets survives as a note, not dropped",
   run(`(function(){const r=parsePlan('Foam roll\\n  as needed');
     return r.some(x=>x.kind==='exnote'&&/Foam roll/.test(x.raw))
         && /Foam roll/.test(planItemsFrom(r).note);})()`) === true);
ok("...and a hold IS read now, because a set can be seconds",
   run(`(function(){const r=parsePlan('Plank\\n  60 sec x 2');
     const ex=r.filter(x=>x.kind==='ex');
     return ex.length===1 && ex[0].lines.length===1
         && ex[0].lines[0].su==='s' && ex[0].lines[0].reps.join()==='60,60';})()`) === true);
ok("'5x5' means five sets of five",
   run(`(function(){const r=parsePlan('Squat\\n  100 kg 5x5');
     return r[0].lines[0].reps.join()==='5,5,5,5,5';})()`) === true);
ok("a bare number is not a set line",
   run(`planReadSets('  42  ')`) === null);
/* v3.3.311: a trailing per-limb qualifier is prose. "45 lb 10 10 10 per arm"
   failed the whole line, and the damage COMPOUNDED — with no set line the
   heading above became a note, and the orphaned set line was then read as a
   heading of its own and became a second note. One phrase turned one
   exercise into two pieces of text. */
ok("a per-limb qualifier does not defeat a set line",
   run(`(function(){const forms=['45 lb 10 10 10 per arm','45 lb 10 10 10 each side',
     '45 lb 10 10 10 / per leg','45 lb 10 10 10 ea. hand','45 lb 10 10 10 each'];
     return forms.every(f=>{const r=planReadSets(f);
       return r && r.w===45 && r.reps.join()==='10,10,10';});})()`) === true);
ok("...and it survives on a bodyweight line too",
   run(`(function(){const r=planReadSets('BW 12, 10, 8 each arm');
     return r && r.bw===true && r.reps.join()==='12,10,8';})()`) === true);
/* the looser rule must not swallow a real exercise NAME or a timed hold.
   v3.3.346 note: a hold is a plan item now, but it is read by planReadTime,
   NOT by planReadSets -- this assertion is about the weight reader and stays
   exactly as it was. A set line and a hold line are different shapes. */
ok("...without turning names or timed holds into sets",
   run(`['Plank','60 sec each','Leg Press','Single-Arm Dumbbell Row 3 sets']
     .every(l=>planReadSets(l)===null)`));
ok("...so the exercise stays ONE exercise, not two notes",
   run(`(function(){const rows=parsePlan('Single-Arm Dumbbell Row  3 sets\\n  45 lb  10 10 10 per arm  \\u2190 easy');
     const ex=rows.filter(r=>r.kind==='ex');
     return rows.length===1 && ex.length===1 && ex[0].ex==='Single-Arm Dumbbell Row'
       && ex[0].lines.length===1;})()`) === true);

// ---- 2. the flow, through the real buttons --------------------------------
run(`document.querySelector('[data-planpaste]').click()`);
ok("paste screen opens with a textarea", run(`!!document.getElementById('planText')`));
run(`document.getElementById('planText').value=${JSON.stringify(PASTE)};
     document.querySelector('[data-planread]').click();`);
ok("the preview shows every line, resolved or not",
   run(`document.querySelectorAll('.planpv').length`) >= 5,
   run(`document.querySelectorAll('.planpv').length`) + " rows");
ok("...and nothing is saved just by previewing", run(`!planNow()`));
ok("the ambiguous row asks rather than deciding",
   run(`document.querySelectorAll('.planpv.ask').length`) === 1 &&
   run(`document.querySelectorAll('[data-planpick]').length`) > 0);
run(`(function(){[...document.querySelectorAll('[data-planpick]')]
  .find(x=>x.dataset.planex2==='Rear Deltoids').click();})()`);
ok("choosing a candidate resolves that row",
   run(`document.querySelectorAll('.planpv.ask').length`) === 0);
// ---- v3.3.279: action rows are uniform ------------------------------------
// jsdom cannot cascade :root stylesheets, so computed width/white-space here
// would assert nothing (the recurring "effects not artifacts" trap has a
// twin: don't assert CSS jsdom can't resolve). What IS checkable is the
// structure the CSS acts on — the app's .btn grammar plus an explicit
// .wide span — so that is what is pinned, alongside label length, which is
// the thing that actually wrapped.
ok("the primary action spans the row; the secondaries share one",
   run(`(function(){const b=[...document.querySelectorAll('.planacts .btn')];
     return b.length===3 && b[0].classList.contains('wide')
       && !b[1].classList.contains('wide') && !b[2].classList.contains('wide');})()`) === true);
ok("...and no action label is long enough to wrap a half-width cell",
   run(`[...document.querySelectorAll('.planacts .btn')].every(b=>b.textContent.trim().length<=16)`),
   run(`JSON.stringify([...document.querySelectorAll('.planacts .btn')].map(b=>b.textContent.trim().length))`));
ok("every plan button uses the app's own .btn grammar, not a bespoke one",
   run(`[...document.querySelectorAll('.planacts button')].every(b=>b.classList.contains('btn'))`));

run(`document.querySelector('[data-planaccept]').click()`);
/* five now, not four: the fixture's Plank became an item in v3.3.346 */
ok("accepting writes a plan for TODAY",
   run(`(function(){const p=planNow(); return !!p && p.d===todayISO && p.items.length===5;})()`) === true,
   run(`(planNow()||{items:[]}).items.length`) + " items");
ok("...weights are stored in kg like every other weight",
   run(`(function(){const i=planFor('Dumbbell Shoulder Press');
     return Math.abs(toU(i.lines[1].w)-55)<0.01 && Math.abs(toU(i.lines[0].w)-35)<0.01;})()`) === true);
/* v3.3.292: the names share one left edge. jsdom cannot compute layout, so
   what is asserted is the rule that produces it — the name takes the free
   space and the numbers are pushed right — rather than measured pixels. */
ok("the name column takes the free space, so every row starts at the same x",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow \.pn\{[^}]*flex:1/.test(css) && /\.planrow \.pn\{[^}]*text-align:left/.test(css);})());
ok("...the numbers are pushed right rather than space-between deciding",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow \.pl\{[^}]*margin-left:auto/.test(css)
         && !/\.planrow\{[^}]*justify-content:space-between/.test(css);})());
/* v3.3.312: the tick moved from the head of the row to its tail. Leading it
   reserved a column on EVERY row, so every name began indented whether or
   not there was a tick to show.
   v3.3.324 RESTATES: the tail cost the mirror image of that -- a reserved
   column on the RIGHT, which together with the row padding held the numbers
   34px off the card edge. The tick now sits inside the name, "Deadlift ✓",
   where it reserves nothing at either end. The property being defended has
   never been "three parts": it is that every row lays out the SAME WAY, and
   that the tick cannot indent a row that does not carry one. Both are
   asserted below, against two parts instead of three. */
ok("...and every row carries the same parts in the same order",
   run(`[...document.querySelectorAll('.planrow')].every(r=>{
     const k=[...r.children].map(c=>c.className);
     return k.length===2 && k[0]==='pn' && k[1]==='pl';})`));
ok("...with the name flush to the card edge, nothing before it",
   run(`[...document.querySelectorAll('.planrow')].every(r=>
     r.firstElementChild.classList.contains('pn'))`));
ok("...and the tick reads as part of the exercise, not as a column",
   run(`[...document.querySelectorAll('.planrow')].every(r=>{
     const k=r.querySelector('.pk');
     return !!k && k.parentElement===r.querySelector('.pn')
         && k===r.querySelector('.pn').lastElementChild;})`));
/* v3.3.313: the card has ONE left edge. .plancard carries no horizontal
   padding, so the row's own padding is the entire indent — and the note
   underneath must use the same number or the card reads as two margins.
   v3.3.324 RESTATES the right-hand half: it used to check that padding +
   tick column + gap stayed within twice the left indent, a budget that only
   existed because the tick held a column. With the tick gone from the row's
   tail there is nothing between the numbers and the card edge, so the
   property is simply that the row's two indents MATCH. */
{
  const cssP = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  const grab = (sel, prop) => {
    const m = cssP.match(new RegExp(sel + "\\{[^}]*" + prop + ":([^;}]+)"));
    return m ? m[1].trim() : null;
  };
  const rowPad = grab("\\.planrow", "padding");
  const notePad = grab("\\.plannote", "padding");
  const left = p => { const v = p.split(/\s+/); return v.length === 4 ? v[3] : v[1]; };
  ok("the note shares the rows' left edge",
     left(rowPad) === left(notePad), `row ${rowPad} vs note ${notePad}`);
  const px = v => parseInt(v, 10);
  const rightPad = px(rowPad.split(/\s+/)[1]);
  ok("the numbers end at the same indent the name starts from",
     rightPad === px(left(rowPad)), `left ${px(left(rowPad))}px vs right ${rightPad}px`);
  /* v3.3.328 (maker's pick, option C of four rendered): the divider is a
     WHISPER, inset to the text edge. Three properties, each load-bearing:
     the tone sits below --line in the ink ladder (full-bleed --line was
     table chrome); the line starts and stops at the row's own 10px indent,
     which border-bottom cannot do, hence the pseudo-element; and the last
     row draws none, so the card does not end on a rule. The Total note's
     topline follows identically. */
  ok("the divider is a whisper, not a line",
     /\.planrow::after\{[^}]*background:var\(--whisper\)/.test(cssP)
       && !/\.planrow\{[^}]*border-bottom/.test(cssP));
  ok("...inset to the very indent the text lives on",
     new RegExp("\\.planrow::after\\{[^}]*left:" + left(rowPad) + "[^}]*right:" + left(rowPad)).test(cssP));
  ok("...and the last row lets the card end quietly",
     /\.planrow:last-of-type::after\{display:none\}/.test(cssP));
  ok("...with the note's topline on the same whisper",
     /\.plannote::before\{[^}]*left:10px[^}]*background:var\(--whisper\)/.test(cssP)
       && !/\.plannote\{[^}]*border-top/.test(cssP));
  ok("...and the tick no longer reserves a column at either end",
     !/\.planrow \.pk\{[^}]*(width|flex):/.test(cssP));
}
/* v3.3.324: the × sits on ONE vertical line down the WHOLE card, not just
   within a row. v3.3.295 built each row as its own three-column grid and its
   comment claimed the weights aligned "within a row and between rows" — but
   a grid sizes its own columns, so five rows were five grids and the × took
   five different x. The card measures the longest weight and the longest rep
   string ONCE, across every line in the plan, and publishes both as `ch`
   widths that every row's grid reads. jsdom has no layout, so what is
   asserted is the arithmetic that produces the alignment plus the rules that
   consume it — never a measured pixel. */
{
  const cssX = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  const card = () => run(`(function(){const c=document.querySelector('.plancard');
    return c ? c.getAttribute('style')||'' : '';})()`);
  const widest = f => run(`(function(){const p=planNow(); if(!p) return 0;
    const L=(p.items||[]).reduce((a,i)=>a.concat(i.lines||[]),[]);
    return Math.max(0,...L.map(l=>(${f}).length));})()`);
  const declared = k => { const m = card().match(new RegExp("--" + k + ":(\\d+)ch")); return m ? +m[1] : null; };

  ok("the card publishes one weight column and one rep column",
     declared("planw") !== null && declared("planr") !== null, card());
  ok("...the weight column is as wide as the plan's longest weight",
     declared("planw") === widest("(l.bw||l.w<=0)?'BW':wDisp(l.w)+' '+U()"),
     `declared ${declared("planw")} vs longest ${widest("(l.bw||l.w<=0)?'BW':wDisp(l.w)+' '+U()")}`);
  ok("...and the rep column as wide as its longest rep line",
     declared("planr") === widest("l.reps.join(' ')"),
     `declared ${declared("planr")} vs longest ${widest("l.reps.join(' ')")}`);
  ok("...so the × column is fixed by the CARD, not by each row",
     /\.planrow \.pl\{[^}]*grid-template-columns:var\(--planw[^;}]*var\(--planr/.test(cssX)
       && !/\.planrow \.pl\{[^}]*grid-template-columns:auto 11px auto/.test(cssX));
  ok("...measured in a mono column, or `ch` would not be a character",
     /\.planrow \.pl\{[^}]*font-family:var\(--mono\)/.test(cssX));
  /* the two halves the maker asked for by name: weights right-aligned into
     the column LEFT of the ×, reps left-aligned out of the one RIGHT of it. */
  ok("...weights right-align against the × from the left",
     /\.planrow \.pw\{[^}]*text-align:right/.test(cssX));
  ok("...and reps left-align away from it to the right",
     /\.planrow \.pr\{[^}]*text-align:left/.test(cssX));
  /* the ticked-vs-unticked half of this needs a row that is actually ticked,
     so it is asserted below, where the ledger has one. */
}

ok("...and the card shows a row per weight, not just the top one",
   run(`(function(){const r=[...document.querySelectorAll('.planrow')]
     .find(x=>/Dumbbell Shoulder Press/.test(x.textContent));
     return r ? r.querySelectorAll('.pw').length===2 : false;})()`) === true);
/* v3.3.295: each weight line is THREE cells — weight, ×, reps — so the ×
   forms a real column instead of living inside a string. That is what lets
   the weights right-align to each other within a row and between rows. */
ok("...each weight line is three aligned cells, not one string",
   run(`[...document.querySelectorAll('.planrow')].every(r=>
     r.querySelectorAll('.pl > span').length === r.querySelectorAll('.pw').length*3)`));
ok("...in weight / × / reps order every time",
   run(`[...document.querySelectorAll('.planrow')].every(r=>{
     const c=[...r.querySelectorAll('.pl > span')].map(x=>x.className.split(' ')[0]);
     for(let i=0;i<c.length;i+=3) if(c[i]!=='pv'||c[i+1]!=='px'||c[i+2]!=='pr') return false;
     return c.length>0;})`));
ok("...and the × is decorative, never read aloud twice",
   run(`[...document.querySelectorAll('.planrow .px')].every(x=>x.getAttribute('aria-hidden')==='true')`));
/* the ink tiers are what make the weight findable mid-set: chalk, faint, muted */
/* v3.3.322: a pill's border is --edge, not --line. --line divides things
   that already differ; a row nested in a card is the SAME colour as the card,
   so its border is the only separation and 1.7:1 could not carry it. ~2.5:1
   in both themes, pinned as the RELATIONSHIP so a repaint cannot flatten it
   back to a divider. */
{
  const cssE = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  const grabE = (block, tok) => {
    const i = cssE.indexOf(block); if (i < 0) return null;
    const m = cssE.slice(i, i + 9000).match(new RegExp("--" + tok + ":\\s*(#[0-9A-Fa-f]{6})"));
    return m ? m[1] : null;
  };
  const srgbE = c => (c/=255, c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4);
  const lumE = h => { const p=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    return .2126*srgbE(p[0])+.7152*srgbE(p[1])+.0722*srgbE(p[2]); };
  const ratioE = (a,b) => { const v=[lumE(a),lumE(b)].sort((p,q)=>q-p); return (v[0]+.05)/(v[1]+.05); };
  [["dark", ":root{"], ["light", '[data-theme="light"]']].forEach(function(p){
    const edge=grabE(p[1],"edge"), line=grabE(p[1],"line"), surface=grabE(p[1],"surface");
    ok(p[0]+": a pill's edge is stronger than a divider",
       !!edge && ratioE(edge,surface) > ratioE(line,surface),
       edge+" "+(edge?ratioE(edge,surface).toFixed(2):"-")+" vs line "+(line?ratioE(line,surface).toFixed(2):"-"));
    ok(p[0]+": ...and reads as an edge, not a suggestion",
       !!edge && ratioE(edge,surface) >= 2.0);
  });
  ok("pills use --edge, dividers keep --line",
     /\.item\{[^}]*border:1px solid var\(--edge\)/.test(cssE.replace(/\r?\n\s*/g,"")));
}

/* v3.3.320: in LIGHT the reps drop one tier. Measured, light already
   separates further than dark on paper — chalk to muted is 25.1 in
   perceptual L* against dark's 18.7 — but dark greys compress against a
   white page, so the arithmetic gap read as one weight of ink. Pinned as the
   RULE, not as a hex, so repainting either theme cannot quietly flatten it. */
{
  const cssT = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  ok("light gives the reps their own, lighter tier",
     /:root\[data-theme="light"\] \.planrow \.pr\{color:var\(--faint\)\}/.test(cssT));
  ok("...and the \u00d7 still steps back from them",
     /:root\[data-theme="light"\] \.planrow \.px\{color:color-mix/.test(cssT));
  ok("...built from tokens, not a colour invented for this row",
     !/:root\[data-theme="light"\] \.planrow \.p[rx]\{color:#[0-9A-Fa-f]{6}/.test(cssT));
  ok("the weight keeps full ink in both themes",
     /\.planrow \.pw\{[^}]*color:var\(--chalk\)/.test(cssT)
       && !/:root\[data-theme="light"\] \.planrow \.pw\{/.test(cssT));
}
ok("the three ink tiers are the app's own, not new colours",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow \.pw\{[^}]*color:var\(--chalk\)/.test(css)
         && /\.planrow \.px\{[^}]*color:var\(--faint\)/.test(css)
         && /\.planrow \.pr\{[^}]*color:var\(--muted\)/.test(css);})());
ok("...and the name centres against the stack rather than pinning to line one",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
     return /\.planrow\{[^}]*align-items:center/.test(css);})());
ok("...and the unreadable lines are kept verbatim",
   run(`/Foam roll/.test(String((planNow()||{}).note||''))`) === true,
   run(`JSON.stringify(String((planNow()||{}).note||'').slice(0,60))`));

// ---- 3. the three promises ------------------------------------------------
ok("PROMISE 1 — nothing was written to the ledger",
   run(`JSON.stringify((DB.days[todayISO]||{w:[]}).w)`) === "[]");
ok("...and the day is still untrained as far as the record is concerned",
   run(`SEED.dates.includes(todayISO)`) === false);
ok("PROMISE 2 — the plan feeds the SUGGESTED rail, naming its origin",
   run(`(sugOv()['Lateral Raise']||{}).from`) === "plan");
ok("...with every set from every weight line, warm-ups included",
   run(`(sugOv()['Dumbbell Shoulder Press']||{sets:[]}).sets.length`) === 6);
/* v3.3.319: this block opens an EXERCISE page, which lives on Train — it
   used to inherit view='lift' from the plan-card renders above, and those
   moved to Today with the plan. Set the tab explicitly rather than rely on
   what the previous block happened to leave behind. */
run(`(function(){view='lift'; lift.ex='Lateral Raise'; lift.part='Shoulder'; lift.weight=0; render();})()`);
ok("...so the exercise page says the chips came from the plan",
   run(`/plan/i.test([...document.querySelectorAll('.zone.mini .lasthead span')][0].textContent)`));
ok("...and the chips carry the plan's numbers",
   run(`/35/.test(document.querySelector('.lastsets').textContent)`));
// ---- v3.3.282: management actions ride the heading's right edge ----------
// Edit and Clear left the card body — a full-width pair under the last
// exercise read as another row of the session. The (i) did NOT move: its
// place beside the title is v3.3.115's deliberate call.
// the block above navigated into an exercise page; come back to the tab
// where the plan card lives before asserting anything about it
run(`(function(){view='today'; lift.ex=null; lift.plan=null; render();})()`);
/* v3.3.294: the group gained a fold chevron, so it holds three controls —
   the property being defended is that they live in the HEADING, not that
   there are exactly two of them. */
/* v3.3.297: the empty state is the SAME heading as the filled one, with
   PASTE where the controls will be. A 51px full-width slab made the section
   change shape depending on whether a plan existed, so the page jumped and
   an empty section shouted louder than a full one. */
run(`(function(){const keep=DB.plan; DB.plan=null; view='today'; lift.ex=null; lift.plan=null; render();
  window.__emptyH=[...document.querySelectorAll('#view h2')][0].outerHTML;
  window.__slab=!!document.querySelector('.planpaste');
  DB.plan=keep; render();})()`);
ok("with no plan, the section is a heading — not a full-width slab",
   run(`__slab`) === false && run(`/scopepill/.test(__emptyH) && /data-planpaste/.test(__emptyH)`));
ok("...offering Paste exactly where the real controls sit",
   run(`/planedge/.test(__emptyH)`));
ok("...and naming the section without claiming it holds anything",
   run(`/scopepill off/.test(__emptyH)`));
ok("both states are one heading line, so the page cannot jump",
   run(`(function(){const filled=[...document.querySelectorAll('#view h2')][0];
     return filled.querySelector('.scopepill') && filled.querySelector('.planedge')
       && /scopepill/.test(__emptyH) && /planedge/.test(__emptyH);})()`));

ok("the plan's controls live in the heading, not the card body",
   run(`document.querySelectorAll('h2 .planedge .pedge').length`) === 3 &&
   run(`!document.querySelector('.plancard .planacts')`));
ok("...with the fold leading and the destructive Clear at the far edge",
   run(`(function(){const b=[...document.querySelectorAll('h2 .planedge .pedge')];
     return b[0].hasAttribute('data-planfold') && b[b.length-1].hasAttribute('data-planclear');})()`));
ok("...in the corner, after the tip, which keeps its place by the title",
   run(`(function(){const k=[...document.querySelector('h2').children].map(c=>c.className.split(' ')[0]);
     return k.indexOf('hacts')>=0 && k.indexOf('planedge')===k.length-1
       && k.indexOf('hacts')<k.indexOf('planedge');})()`) === true);
ok("...and Clear still clears from there",
   (function(){
     run(`document.querySelector('.planedge [data-planclear]').click()`);
     return run(`!planNow()`) && run(`!!document.querySelector('[data-planpaste]')`);
   })());
// put a plan back for the blocks below
run(`(function(){document.querySelector('[data-planpaste]').click();
  document.getElementById('planText').value=${JSON.stringify(PASTE)};
  document.querySelector('[data-planread]').click();
  [...document.querySelectorAll('[data-planpick]')].find(x=>x.dataset.planex2==='Rear Deltoids').click();
  document.querySelector('[data-planaccept]').click();})()`);

// ---- v3.3.281: the tick is a fact from the ledger ------------------------
// Logging an exercise ticks its plan row. The direction matters: the row
// reads the RECORD and reports it. Nothing aggregates those ticks.
run(`(function(){view='today'; lift.ex=null; lift.plan=null; render();})()`);
ok("before logging, no plan row is ticked",
   run(`document.querySelectorAll('.planrow.pdone').length`) === 0);
run(`(function(){const t=day(todayISO);
  t.w.push({part:'Shoulder',ex:'Dumbbell Shoulder Press',w:toKg(55),reps:[8],at:Date.now()});
  t.upd=Date.now(); SEED=deriveAll(); view='today'; lift.ex=null; render();})()`);
ok("logging an exercise ticks exactly its own plan row",
   run(`document.querySelectorAll('.planrow.pdone').length`) === 1 &&
   run(`/Dumbbell Shoulder Press/.test(document.querySelector('.planrow.pdone').textContent)`));
ok("...and the tick is drawn, not merely a class",
   run(`document.querySelector('.planrow.pdone .pk').textContent.trim()`) === "\u2713");
ok("...while every other row stays untouched",
   run(`[...document.querySelectorAll('.planrow:not(.pdone) .pk')].every(k=>!k.textContent.trim())`));
/* v3.3.324: a tick cannot move the numbers. It sits inside the name now, and
   the number block's width is the card's two published columns plus the fixed
   11px between them — so the × line is identical on a ticked row and a bare
   one. Asserted as the arithmetic, since jsdom has no layout: the card's
   declared columns do not change when a row gains its tick. */
{
  const withTick = run(`(function(){const c=document.querySelector('.plancard');
    return c ? c.getAttribute('style')||'' : '';})()`);
  ok("...and a ticked row holds the same × line as a bare one",
     /--planw:\d+ch;--planr:\d+ch/.test(withTick)
       && run(`[...document.querySelectorAll('.planrow')].some(r=>r.classList.contains('pdone'))
             && [...document.querySelectorAll('.planrow')].some(r=>!r.classList.contains('pdone'))
             && [...document.querySelectorAll('.planrow')].every(r=>
                  r.children.length===2 && r.children[1].className==='pl')`),
     withTick);
}
ok("...and the tick reads the LEDGER, not the plan",
   run(`planLoggedToday('Dumbbell Shoulder Press') && !planLoggedToday('Lateral Raise')`));
ok("...with still no tally of ticked rows on screen",
   run(`!/\\d+\\s*(of|\\/)\\s*\\d+|\\d+%/.test(document.querySelector('.plancard').textContent)`),
   JSON.stringify(run(`document.querySelector('.plancard').textContent.replace(/\\s+/g,' ').slice(0,70)`)));

ok("PROMISE 3 — no count of what is done or left, anywhere on screen",
   run(`!/adheren|remaining|\\d+\\s*(of|\\/)\\s*\\d+\\s*(done|complete)/i.test(document.getElementById('view').textContent)`));

// ---- 4. it evaporates ------------------------------------------------------
run(`(function(){DB.plan.d='2020-01-01'; view='today'; lift.ex=null; lift.plan=null; render();})()`);
ok("a plan from another day is not today's plan", run(`!planNow()`));
ok("...and the tab offers to take a new one",
   run(`!!document.querySelector('[data-planpaste]')`));
/* a plan written by v3.3.278/279 (one weight per item, no `lines`) is still
   in storage after an upgrade — it must render, not crash */
run(`(function(){DB.plan={d:todayISO,items:[{ex:'Squat',w:60,reps:[5,5]}],note:''};
  view='today'; lift.ex=null; lift.plan=null; render();})()`);
ok("a plan saved by the previous build still renders after upgrade",
   run(`document.querySelectorAll('.planrow').length`) === 1 &&
   run(`/Squat/.test(document.querySelector('.planrow').textContent)`));
ok("...its single weight is read as one line",
   run(`planNow().items[0].lines.length`) === 1);
run(`(function(){sugOv()['Squat']={sets:[{w:60,r:5}],d:todayISO,from:'plan'};
  view='today'; lift.ex=null; render(); planClear();})()`);
ok("clearing a plan also withdraws the suggestions it planted",
   run(`!planNow() && !sugOv()['Squat']`));

// ---- v3.3.294: the whole plan folds -------------------------------------
// Same shape as the Last-time fold: driven through the real chevron, the
// heading survives as the one-line fact, and the choice is a SETTING so it
// outlives a re-render.
/* the block above CLEARS the plan, so there is nothing to fold — give this
   one its own plan rather than inheriting whatever the last block left. */
run(`(function(){planSave([{ex:'Dumbbell Shoulder Press',lines:[{w:toKg(55),bw:false,reps:[8,8]}]},
                           {ex:'Lateral Raise',lines:[{w:toKg(35),bw:false,reps:[12,12]}]}],'','');
  DB.settings.planFold=false; view='today'; lift.ex=null; lift.plan=null; render();})()`);
ok("open by default, chevron says so",
   run(`(function(){const b=document.querySelector('[data-planfold]');
     return !!b && b.getAttribute('aria-expanded')==='true' && b.textContent==='\u25be';})()`));
const rowsOpen = run(`document.querySelectorAll('.planrow').length`);
ok("...with the plan's rows on screen", rowsOpen > 0, rowsOpen + " rows");
run(`document.querySelector('[data-planfold]').click()`);
ok("one tap folds the card away entirely",
   run(`document.querySelectorAll('.planrow').length`) === 0 &&
   run(`!document.querySelector('.plancard')`));
ok("...but the heading stays as the one-line fact",
   run(`!!document.querySelector('h2 .scopepill')`) &&
   run(`document.querySelectorAll('h2 .planedge .pedge').length`) === 3);
ok("...and the chevron flips", run(`(function(){const b=document.querySelector('[data-planfold]');
     return b.getAttribute('aria-expanded')==='false' && b.textContent==='\u25b8';})()`));
ok("the choice is a setting, not a render whim", run(`DB.settings.planFold===true`));
run(`render()`);
ok("...so it survives a full re-render", run(`!document.querySelector('.plancard')`));
run(`document.querySelector('[data-planfold]').click()`);
ok("one tap brings the whole plan back",
   run(`document.querySelectorAll('.planrow').length`) === rowsOpen &&
   run(`DB.settings.planFold===false`));
/* folding must not touch the plan itself — it is a view preference */
ok("folding changed nothing about the plan or the ledger",
   run(`!!planNow() && planNow().items.length>0`) &&
   run(`JSON.stringify((DB.days[todayISO]||{w:[]}).w.filter(s=>s.ex==='Squat'))`) === "[]");

/* Placed LAST on purpose. This block seeds its own plan and leaves the app on
   the Today tab; run mid-file it disturbed the fixtures the blocks after it
   depended on — three of them failed for reasons unrelated to what they test.
   Set your stage, and put it where it cannot become someone else's. */
/* v3.3.319: today's plan lives on the TODAY tab now, not Train. One copy,
   not two — a second would be free to drift, and this app has retired
   duplicate sections twice on that reasoning (v3.3.230, v3.3.307). Three
   things the move had to carry with it, each a real bug if missed: the
   paste screen (renderToday must open it, or the Paste button does nothing),
   the fold handler (it called renderLift and would re-render the wrong tab,
   wiping the section it was invoked from), and the section itself, which is
   now built once by planSectionHTML(). */
{
  const seed = logged => run(`(function(){DB.days={}; DB.settings.unit='lb';
    DB.settings.planFold=false; const t=new Date(todayISO+'T00:00');
    for(let i=1;i<=40;i++){const d=new Date(t);d.setDate(d.getDate()-i);
      DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Back',ex:'Deadlift',w:60,reps:[5]}],upd:1};}
    ${logged?"day(todayISO).w.push({part:'Back',ex:'Deadlift',w:60,reps:[5],at:Date.now()});":""}
    SEED=deriveAll();
    planSave([{ex:'Deadlift',lines:[{w:toKg(205),bw:false,reps:[5,5,5]}]}],'','');
    view='today'; lift.ex=null; lift.plan=null; render();})()`);
  seed(false);
  ok("before the gym, Today leads with the plan",
     run(`!!document.querySelector('#view .planedge') && document.querySelectorAll('.planrow').length>0`));
  ok("...and Rhythm is gone from the tab", run(`!document.querySelector('#view .rhythm')`));
  seed(true);
  ok("mid-session, Today still leads with the plan — one hero in both states",
     run(`!!document.querySelector('#view .planedge') && document.querySelectorAll('.planrow').length>0`));
  run(`document.querySelector('[data-planfold]').click()`);
  ok("folding from Today keeps you on Today", run(`view`) === "today");
  ok("...and leaves the heading standing",
     run(`document.querySelectorAll('.planrow').length`) === 0 &&
     run(`!!document.querySelector('#view .planedge')`));
  run(`document.querySelector('[data-planfold]').click()`);
  ok("...and unfolds again in place", run(`document.querySelectorAll('.planrow').length`) > 0);
  ok("the Train tab carries no second copy",
     run(`(function(){view='lift'; lift.ex=null; lift.part='Back'; lift.plan=null; render();
       return !document.querySelector('.plancard') && !document.querySelector('.planedge');})()`));
  ok("Today can open the paste screen itself",
     run(`(function(){view='today'; lift.plan='paste'; render();
       return !!document.getElementById('planText');})()`));
  run(`(function(){lift.plan=null; view='today'; render();})()`);
}


/* Placed LAST, like the v3.3.319 block below it: this seeds its own plan and
   leaves the app on Train, which is exactly what broke its neighbours when it
   sat mid-file. */
/* v3.3.321: a note line shaped "label <gap> value" lays out as two columns
   so the value sits at the card's right edge. The TEXT is untouched — every
   character survives — only the run of spaces stops deciding where the value
   lands. A paste is aligned to the width it was written in; a phone card is
   narrower, so preserved spacing lands arbitrarily. Lines with no such gap
   are still verbatim, which the assertion below continues to hold. */
{
  run(`(function(){planSave([{ex:'Deadlift',lines:[{w:toKg(205),bw:false,reps:[5]}]}],
    'Total                     19 sets\\nkeep the bar close',''); 
    view='today'; lift.ex=null; lift.plan=null; render();})()`);
  ok("a label/value note line becomes two columns",
     run(`(function(){const r=document.querySelector('.plannote .pnrow');
       return !!r && r.children.length===2 && r.children[1].classList.contains('pnval');})()`));
  ok("...with the value at the right edge, not wherever the spaces fell",
     run(`(function(){const css=1; const r=document.querySelector('.plannote .pnrow');
       return r.children[0].textContent==='Total' && r.children[1].textContent==='19 sets';})()`));
  ok("...and no character of the line is lost",
     run(`(function(){const r=document.querySelector('.plannote .pnrow');
       return [...r.children].map(c=>c.textContent).join(' ')==='Total 19 sets';})()`));
  ok("a line with no such gap stays verbatim",
     run(`(function(){const l=document.querySelector('.plannote .pnline');
       return !!l && l.textContent==='keep the bar close';})()`));
}
/* the row must still OPEN the exercise — it moved tabs in v3.3.319 and the
   handler was re-rendering whatever tab you were on, which had been Train by
   accident and became Today */
run(`(function(){view='today'; lift.ex=null; lift.plan=null; render();})()`);
run(`document.querySelector('[data-planex]').click()`);
ok("tapping a plan row opens that exercise on the Train tab",
   run(`view`) === "lift" && run(`lift.ex`) === "Deadlift" && run(`!!document.getElementById('addrep')`));
ok("...and brings its body part with it",
   run(`lift.part`) === "Back");
run(`(function(){view='today'; lift.ex=null; render();})()`);


/* v3.3.339: ONE LINE, NAME AND SETS. The parser assumed a heading with its
   sets indented beneath. The maker writes his sessions the way a notebook
   does -- everything for an exercise on one line -- and every line became a
   note: it starts with letters so it is not a set line, and as a heading the
   name is the whole string, numbers and all, matching nothing.
   The pins below are in two halves, and the SECOND half is the important
   one. Reading a new shape is easy; the risk is reading shapes that are not
   sets and mangling pastes that work today. */
{
  const rows = t => run(`parsePlan(${JSON.stringify(t)}).map(r=>
    r.kind==='ex' ? {k:'ex',name:r.name,ex:r.ex,n:r.lines.length,
                     reps:r.lines.map(l=>l.reps.join('/')).join(' ')}
                  : {k:r.kind,raw:r.raw})`);

  /* --- half one: the maker's own notebook line ------------------------- */
  const r1 = rows("Cable Fly Up 35 x 12 10 10");
  ok("a whole exercise on one line is read, not kept as a note",
     r1.length === 1 && r1[0].k === 'ex' && r1[0].ex === 'Cable Fly Up',
     JSON.stringify(r1));
  ok("...with its sets", r1[0] && r1[0].reps === '12/10/10', JSON.stringify(r1[0]));

  const r2 = rows("Incline BB 95\u00d710 \u00b7 115\u00d78 \u00b7 145 \u00d7 12 12 12 12 \u00b7 165\u00d75");
  ok("...and every group after a middot is its own weight line",
     r2.length === 1 && r2[0].n === 4 && r2[0].reps === '10 8 12/12/12/12 5',
     JSON.stringify(r2));
  /* gym shorthand raises a name to a CANDIDATE and never past it: planNorm is
     untouched, so an abbreviation cannot become an exact match and resolve
     itself. "Incline BB" is a guess about which incline press was meant, and
     a guess belongs in front of the user. */
  ok("...with shorthand offered as a question, never answered silently",
     r2[0] && r2[0].ex === null, JSON.stringify(r2[0] && r2[0].ex));
  ok("...but offered", run(`parsePlan("Incline BB 95x10").filter(r=>r.kind==='ex')[0].cands`)
       .includes('Incline Barbell Bench Press'));

  /* --- half two: everything that must NOT change ----------------------- */
  const keep = [
    ["the classic heading-then-sets paste", "Barbell Bench Press\n135 lb x 5\n185 lb x 5 5 5",
     r => r.length === 1 && r[0].k === 'ex' && r[0].n === 2],
    ["a heading carrying a set count", "Barbell Bench Press 3 sets\n135 lb x 5",
     r => r.length === 1 && r[0].k === 'ex' && r[0].name === 'Barbell Bench Press'],
    ["a line with no multiplication sign", "Deadlift 135 5 5 5",
     r => r.length === 1 && r[0].k === 'exnote'],
    ["a date heading", "8/26 Chest day", r => r.length === 1 && r[0].k === 'exnote'],
    /* ALL OR NOTHING. A half-read line would put some of a session in the plan
       and silently drop the rest -- the failure v3.3.280 already called worse
       than not parsing at all. */
    ["a line where one group is prose", "Cable Fly Up 35 x 12 \u00b7 to failure",
     r => r.length === 1 && r[0].k === 'exnote'],
  ];
  for (const [label, text, want] of keep)
    ok(`...and ${label} reads exactly as before`, want(rows(text)), JSON.stringify(rows(text)));

  /* an inline first set does not close the exercise: the rest still gathers */
  const r3 = rows("Cable Fly Up 35 x 12\n40 x 10\n45 x 8");
  ok("...while sets beneath an inline line still join it",
     r3.length === 1 && r3[0].n === 3, JSON.stringify(r3));
}


/* v3.3.346 RESTATES v3.3.340. That release could only keep a hold ATTACHED
   to its exercise -- one note reading "Plank - 60 sec x 2" instead of two
   fragments -- because a set could not yet be seconds. v3.3.343 made it one,
   so the hold is a plan item now. The property v3.3.340 was really defending
   is unchanged and still asserted below: a hold is never SPLIT from the
   exercise it belongs to, and nothing the parser reads is silently dropped. */
{
  const rows = t => run(`parsePlan(${JSON.stringify(t)}).map(r=>({k:r.kind,raw:r.raw,
    n:(r.lines||[]).length, su:((r.lines||[])[0]||{}).su, reps:((r.lines||[])[0]||{}).reps}))`);

  const p1 = rows("Plank\n60 sec x 2");
  ok("a hold and its exercise are ONE row, never two fragments",
     p1.length === 1, JSON.stringify(p1));
  ok("...and it is now a plan item, in seconds",
     p1[0] && p1[0].k === 'ex' && p1[0].su === 's' && String(p1[0].reps) === '60,60',
     JSON.stringify(p1[0]));
  const oneLine = rows("Plank / 60 sec x 2");
  ok("...and the same hold reads when written on one line",
     oneLine.length === 1 && oneLine[0].k === 'ex' && oneLine[0].su === 's'
       && String(oneLine[0].reps) === '60,60', JSON.stringify(oneLine));
  const each = rows("Plank / 60 sec each");
  ok("...while 'each' is one explicitly timed set",
     each.length === 1 && each[0].k === 'ex' && String(each[0].reps) === '60',
     JSON.stringify(each));
  for (const [label, text, reps] of [["minutes", "Plank\n2 min", "120"],
                                     ["short unit", "Plank\n60s x 2", "60,60"],
                                     ["sets first", "Plank\n2 x 60 sec", "60,60"],
                                     ["bare", "Side Plank\n45 sec", "45"]])
    ok(`...${label} too`, (r => r.length === 1 && String(r[0].reps) === reps)(rows(text)),
       JSON.stringify(rows(text)));

  /* ONLY where a hold is a real thing. The parser proposes; it does not
     reinterpret what you train. */
  const p2 = rows("Squat\n60 sec x 2");
  ok("...but an exercise that is not held keeps its text",
     p2.length === 1 && p2[0].k === 'exnote' && /Squat/.test(p2[0].raw) && /60 sec/.test(p2[0].raw),
     JSON.stringify(p2));
  ok("...and nothing of it is dropped",
     /60 sec/.test(run(`planItemsFrom(parsePlan("Squat\\n60 sec x 2")).note`)));

  /* a duration under an exercise that already HAS sets is something else --
     rest, a finisher, prose -- and stays its own note */
  const p3 = rows("Cable Fly Up\n35 lb x 12\n60 sec x 2");
  ok("...while a hold under a real set stays its own note",
     p3.length === 2 && p3[0].k === 'ex' && p3[0].n === 1 && p3[1].k === 'exnote',
     JSON.stringify(p3));

  /* the chips log a complete weight x reps pair in one tap; a hold is neither */
  ok("...and a held line offers no weight-times-reps chip",
     run(`planSets({lines:[{w:0,su:'s',reps:[60,60]},{w:20,reps:[10]}]}).length`) === 1);
}


/* v3.3.349: a set already in the record RECEDES on the plan line.
   Permitted, and the boundary is not mine to draw -- v3.3.281 drew it in
   buildcheck: "a per-row tick is NOT a score. Reading the ledger and
   reporting 'this exercise is logged' is a fact about the record.
   AGGREGATING those facts into a count, fraction or percentage of the plan
   is the failure state." planSpent is that fact, per line, never summed.
   The last two assertions are the ones that matter. A line you have not
   started must look exactly as it did before this release, and the card must
   never say how much of the plan is left. */
{
  const seed = (sets) => run(`(function(){DB.days={}; DB.settings.unit='lb';
    DB.days[todayISO]={w:${sets},upd:1};
    DB.plan={d:todayISO, items:[
      {ex:'Squat', lines:[{w:${'toKg(195)'}, bw:false, reps:[8,8,8,8]}]},
      {ex:'Romanian Deadlift', lines:[{w:${'toKg(155)'}, bw:false, reps:[10,10,10]}]}],
      note:''};
    DB.planAt=Date.now(); SEED=deriveAll(); view='today'; render();})()`);

  const marks = ex => run(`(function(){
    const rows=[...document.querySelectorAll('.planrow')];
    const r=rows.find(b=>/${ex}/.test(b.querySelector('.pn').textContent));
    if(!r) return 'no row';
    return [...r.querySelectorAll('.pr .rp')]
      .map(i=>i.className.indexOf('rspent')>=0?'.':i.textContent.trim()).join(' ');})()`);

  /* three of the four squats logged at that weight */
  seed(`[{part:'Legs',ex:'Squat',w:toKg(195),reps:[8,8,8],at:1}]`);
  ok("a set already in the record recedes, left to right",
           marks('Squat') === ". . . 8", marks('Squat'));
  ok("...and a line you have not started is untouched",
           marks('Romanian Deadlift') === "10 10 10", marks('Romanian Deadlift'));

  /* a different weight is a different line: 8 reps at 135 cannot spend a 195 */
  seed(`[{part:'Legs',ex:'Squat',w:toKg(135),reps:[8,8,8],at:1}]`);
  /* v3.3.367 RESTATES the NAME: the rule is no longer "the same weight", it
     is "that weight or heavier". A LIGHTER set still spends nothing, which is
     what this fixture actually shows (135 against a plan of 195). */
  ok("...a lighter set spends nothing",
           marks('Squat') === "8 8 8 8", marks('Squat'));

  /* a hold is not a rep: 60 seconds must not cancel a set of 8 */
  seed(`[{part:'Legs',ex:'Squat',w:toKg(195),reps:[60,60],su:'s',at:1}]`);
  ok("...and a hold never spends a weighted set",
           marks('Squat') === "8 8 8 8", marks('Squat'));

  /* more logged than planned: the line runs out, it does not go negative or
     wrap, and nothing anywhere says "over" */
  seed(`[{part:'Legs',ex:'Squat',w:toKg(195),reps:[8,8,8,8,8,8],at:1}]`);
  ok("...doing more than planned simply spends the line",
           marks('Squat') === ". . . .", marks('Squat'));

  /* v3.3.367: A HEAVIER SET SATISFIES A LIGHTER PLAN -- the maker's own case.
     Planned 30, did 35: he had plainly done the work and the card said
     otherwise, because v3.3.349 matched on an exact weight. */
  seed(`[{part:'Legs',ex:'Squat',w:toKg(205),reps:[8],at:1}]`);
  ok("a heavier set spends a lighter planned set",
     marks('Squat') === ". 8 8 8", marks('Squat'));

  /* ALLOCATED, not counted per line. Under a plain >=, one set at 205 would
     satisfy a 135 line AND a 195 line -- two dimmed sets from one set of
     work. Each logged set is spent once, and heaviest-first means the 205
     lands on the heavier line rather than being eaten by the lighter one. */
  run(`(function(){DB.days={}; DB.settings.unit='lb';
    DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:toKg(205),reps:[8],at:1}],upd:1};
    DB.plan={d:todayISO, items:[{ex:'Squat', lines:[
      {w:toKg(135), bw:false, reps:[8]},
      {w:toKg(195), bw:false, reps:[8]}]}], note:''};
    DB.planAt=Date.now(); SEED=deriveAll(); view='today'; render();})()`);
  ok("...and one set can only spend one planned set",
     marks('Squat') === "8 .", marks('Squat'));

  /* the maker's other case, which must NOT dim: he did the movement, but
     lighter than planned, so the plan still stands */
  run(`(function(){DB.days={}; DB.settings.unit='lb';
    DB.days[todayISO]={w:[{part:'Chest',ex:'Cable Fly Up',w:toKg(20),reps:[10,10],at:1}],upd:1};
    DB.plan={d:todayISO, items:[{ex:'Cable Fly Up', lines:[
      {w:toKg(20), bw:false, reps:[10]},
      {w:toKg(35), bw:false, reps:[12,10]}]}], note:''};
    DB.planAt=Date.now(); SEED=deriveAll(); view='today'; render();})()`);
  ok("...while sets lighter than planned leave the heavier lines standing",
     marks('Cable Fly Up') === ". 12 10", marks('Cable Fly Up'));

  /* v3.3.373: A TRAILING COMMENT MUST NOT EAT THE SET. Every pattern in
     planReadPrescription anchors with $, so any text after the reps killed
     the match -- and the maker's own paste annotates every single line. Eight
     exercises, eight comments, and the whole paste read as "kept as a note".
     "25 lb x 12 10 10" parsed; the same line with a note did not. A person
     writing down why they went up is the normal case, not an edge one. */
  {
    const read = l => run(`JSON.stringify(planReadPrescription(${JSON.stringify(l)}))`);
    const bare = JSON.parse(read("45 lb \u00d7 10 10 10 8"));
    const noted = JSON.parse(read("45 lb \u00d7 10 10 10 8        (up from 40 \u2014 you hit 15s on it)"));
    ok("a comment after the reps does not stop the line being read",
       !!noted && noted.w === 45 && noted.reps.join() === "10,10,10,8",
       JSON.stringify(noted));
    ok("...and reads exactly as the same line without it",
       !!bare && bare.w === noted.w && bare.reps.join() === noted.reps.join());
    ok("...with what you wrote kept, not discarded",
       noted.qual === "up from 40 \u2014 you hit 15s on it", noted.qual);
    const bw = JSON.parse(read("BW \u00d7 12 10 10             (target up from 10)"));
    ok("...and a bodyweight line survives its comment too",
       !!bw && bw.bw === true && bw.reps.join() === "12,10,10");

    /* the maker's actual paste, end to end: eight exercises, each a heading
       with an annotated set line beneath it */
    const paste = [
      "EZ Bar Curl", "  45 lb \u00d7 10 10 10 8        (up from 40 \u2014 you hit 15s on it)", "",
      "Overhead Triceps Extension", "  35 lb \u00d7 12 12 10 10       (4th set added)", "",
      "Dumbbell Curl", "  25 lb \u00d7 12 10 10          (same weight, chasing 12s)", "",
      "Hammer Curl", "  25 lb \u00d7 12 10 10          (NEW \u2014 brachialis, adds arm width)", "",
      "Rear Deltoids", "  25 lb \u00d7 15 15 12 12       (reps up from 12s)", "",
      "Hanging Leg Raise", "  BW \u00d7 12 10 10             (target up from 10)"
    ].join("\n");
    const rows = run(`parsePlan(${JSON.stringify(paste)})`);
    const got = rows.filter(r => r.kind === "ex").length;
    ok("the maker's paste reads as exercises, not as notes", got === 6, got + " of 6");
  }

  /* v3.3.374: A PLAN FOR TODAY IS AN ANSWER, SO THE SCREEN STOPS ASKING.
     Today was making three claims about one day at once: the plan listing
     eight exercises, "Rest day" offered beneath them, and "Train next"
     recommending a part the plan never mentions -- the planner answering a
     question the maker had already answered himself.
     The card names the first UNLOGGED item, not the first: "first" is right
     until you finish it and wrong for the rest of the session. */
  {
    /* the fixture needs HISTORY: with none, Today is day one (v3.3.372) and
       routes to the first-run flow before any of this renders. The fixture had
       quietly stopped containing its own case the moment day one shipped. */
    const prior = `(function(){const t=new Date(todayISO+'T00:00');
      const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
      DB.days[D(3)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};})();`;
    const seeD = () => run(`(function(){DB.days={}; DB.settings.unit='lb'; ${prior}
      DB.plan={d:todayISO, items:[
        {ex:'EZ Bar Curl', lines:[{w:toKg(45),bw:false,reps:[10,10]}]},
        {ex:'Hammer Curl', lines:[{w:toKg(25),bw:false,reps:[12,10]}]}], note:''};
      DB.planAt=Date.now(); SEED=deriveAll(); view='today'; render();})()`);
    /* the plan CARD also holds [data-planex] rows, so the first version of
       this matched that instead of the recommendation. The Train-next card
       carries its own class. */
    const nextCard = () => run(`(function(){const c=document.querySelector('.tnextplan');
      return c?c.textContent.replace(/\s+/g,' ').trim():'(quiet)';})()`);

    seeD();
    ok("with a plan, Train next names the plan's first exercise",
       /EZ Bar Curl/.test(nextCard()), nextCard());
    ok("...described as the plan's, not as a rotation verdict",
       /next in your plan/.test(nextCard()) && !/d ago|d since/.test(nextCard()),
       nextCard());
    ok("...and the rest-day button is not offered against your own plan",
       run(`!document.getElementById('restBtn')`));

    /* IT NAMES THE FIRST UNLOGGED ITEM, not the first. Tested by logging the
       first one and re-reading the card from the same pre-session branch.
       NOTE, found while writing this: once ANY set lands, Today leaves this
       branch for the mid-session view and Train next is not rendered at all --
       so on Today the advance only ever shows before the first set. What is
       next mid-session is answered by the plan card's own tick marks, which
       already recede as work lands (v3.3.367). The rule is still worth having:
       reopening Today with a plan half-done must not point back at work
       already recorded. */
    run(`(function(){DB.days[todayISO]={w:[],upd:1};
      DB.days[todayISO].w.push({part:'Biceps',ex:'EZ Bar Curl',w:toKg(45),reps:[10],at:1});
      SEED=deriveAll();})()`);
    /* asserted on the RENDERED card, not on the expression behind it. The
       first version of this checked planNow()/find() directly -- so replacing
       the whole rule with items[0] left it green. Artifact, not effect. */
    run(`(function(){DB.days[todayISO]={w:[{part:'Biceps',ex:'EZ Bar Curl',w:toKg(45),reps:[10],at:1}],upd:1};
      SEED=deriveAll(); render();})()`);
    ok("...it skips an exercise already logged, mid-session",
       /Hammer Curl/.test(nextCard()) && !/EZ Bar Curl/.test(nextCard()), nextCard());
    run(`(function(){DB.days[todayISO].w.push({part:'Biceps',ex:'Hammer Curl',w:toKg(25),reps:[12],at:2});
      SEED=deriveAll(); render();})()`);
    ok("...and goes quiet once the plan is done",
       nextCard()==='(quiet)', nextCard());

    /* with NO plan the rotation is untouched -- this changes what happens
       when you have answered, not what happens when you have not */
    run(`(function(){DB.days={}; ${prior} DB.plan=null; SEED=deriveAll(); view='today'; render();})()`);
    ok("with no plan the rotation still recommends a part",
       run(`!!document.querySelector('[data-go]')`));
    ok("...and the rest-day button comes back",
       run(`!!document.getElementById('restBtn')`));
  }

  /* v3.3.393: WEIGHTED BODYWEIGHT WORK. "BW +10 x 8 8 6 6" is how a belt is
     written, and the parser allowed nothing between "bw" and the reps -- so a
     weighted pull-up fell through to "kept as a note" and the whole line was
     discarded. Two faults in series: the pattern rejected it, and even once
     read, planItemsFrom hard-zeroed the weight of any bw line, which would
     have thrown the belt away a second time. */
  {
    const read = (txt) => run(`(function(){DB.settings.unit='lb';
      const {items}=planItemsFrom(parsePlan(` + JSON.stringify(txt) + `));
      const l=items[0]&&items[0].lines[0];
      return JSON.stringify({ex:items[0]&&items[0].ex, bw:!!(l&&l.bw),
        lb:l?+(l.w*2.20462).toFixed(1):null, reps:l?l.reps:null,
        label:l?wLabel(items[0].ex,l.w):null});})()`);

    let r=JSON.parse(read("Pull Up\n  BW +10 x 8 8 6 6"));
    ok("a weighted pull-up is read, not kept as a note", r.ex==='Pull Up', JSON.stringify(r));
    ok("...as bodyweight plus the belt, in the paste's own unit",
       r.bw===true && r.lb===10, JSON.stringify(r));
    ok("...with its reps intact", JSON.stringify(r.reps)==='[8,8,6,6]', JSON.stringify(r.reps));
    ok("...and shown in the app's own grammar", r.label==='BW+10', r.label);

    /* bare BW is unchanged: zero added */
    r=JSON.parse(read("Dip\n  BW x 12 10 10"));
    ok("plain bodyweight still reads as plain bodyweight",
       r.bw===true && r.lb===0 && r.label==='BW', JSON.stringify(r));

    /* the belt may carry its own unit, and it must convert like any load */
    r=JSON.parse(read("Pull Up\n  BW +5 kg x 5 5"));
    ok("...and an explicit unit on the belt is honoured",
       r.bw===true && Math.abs(r.lb-11.0)<0.2, JSON.stringify(r));

    /* a loaded line is untouched by any of this */
    r=JSON.parse(read("Deadlift\n  215 lb x 5 5 5 5"));
    ok("loaded lines are unaffected",
       r.bw===false && Math.abs(r.lb-215)<0.1, JSON.stringify(r));
  }

  /* v3.3.394: A SET WITH NO LOAD. "by feel x 12 12 10 10" is how the maker
     writes a movement he does not track a number on. It became a note, taking
     the exercise and its reps with it.
     Safe because the plan is a PROMISE, never a record: never scored, never
     written to the ledger, cleared at midnight. A promise may say "these reps,
     whatever the weight turns out to be". The ledger still gets a real number,
     because you set it when you log the set. */
  {
    const read = (txt) => run(`(function(){DB.settings.unit='lb';
      const {items,note}=planItemsFrom(parsePlan(` + JSON.stringify(txt) + `));
      const l=items[0]&&items[0].lines[0];
      return JSON.stringify({ex:items[0]&&items[0].ex, nw:!!(l&&l.nw), bw:!!(l&&l.bw),
        w:l?l.w:null, reps:l?l.reps:null, note});})()`);

    let r=JSON.parse(read("Pull Up\n  by feel x 12 12 10 10"));
    ok("a set with no load named is read, not kept as a note", r.ex==='Pull Up', JSON.stringify(r));
    ok("...carrying its reps", JSON.stringify(r.reps)==='[12,12,10,10]', JSON.stringify(r.reps));
    ok("...marked as having no load rather than a load of zero",
       r.nw===true && r.bw===false && r.w===0, JSON.stringify(r));

    /* NARROW ON PURPOSE: reps are required, and prose stays prose */
    ok("bare \"by feel\" with no reps is not a set line",
       run(`planReadSets('by feel')`)===null);
    ok("...and prose that merely mentions feel stays a note",
       run(`planReadSets('feels heavy today')`)===null);

    /* the display must not lie in either direction: "BW" is a claim about the
       exercise, "0" is a claim about the weight */
    const src=fs.readFileSync(path.join(dir,"js/lift.js"),"utf8");
    ok("a no-load line reads \"by feel\", never BW and never 0",
       /l\.nw\?'by feel'/.test(src) && (src.match(/l\.nw\?'by feel'/g)||[]).length>=2);
  }

  /* THE LINE THE BUILD DEFENDS. No count, fraction or percentage of a plan
     may appear -- buildcheck scans the source for the vocabulary, this scans
     the rendered card for the shape. */
  seed(`[{part:'Legs',ex:'Squat',w:toKg(195),reps:[8,8,8],at:1}]`);
  ok("the card never says how much of the plan is left",
     !/\b\d+\s*(of|\/)\s*\d+\b/.test(run(`document.querySelector('.plancard').textContent`)),
     run(`JSON.stringify(document.querySelector('.plancard').textContent.slice(0,70))`));
  /* and the plan still never writes to the record */
  ok("...and reading it changed nothing in the ledger",
     run(`(DB.days[todayISO].w||[]).length`) === 1);
}


process.exit(fail ? 1 : 0);
