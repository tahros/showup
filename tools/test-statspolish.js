// test-statspolish.js DIR — v3.3.46. The weekday chart must highlight
// TODAY's weekday (accent) and mark the STRONGEST with a caret, and the
// report overlay must carry the app font family since it lives on <body>.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage46";

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

// Build 365 days where the STRONGEST weekday is deliberately NOT today, so
// "accent = today" and "caret = strongest" stay distinguishable regardless
// of which day this suite happens to run on. v3.3.102: this used to hardcode
// Monday-as-strongest on the assumption todayISO was a Wednesday (true when
// written, false the day this suite ran on an actual Monday — the fixture's
// "strongest" day collided with today's weekday by the calendar, not by any
// app bug, and the guard it existed to prove failed for the wrong reason).
// The strongest day is now always three weekdays off from whatever today
// is, so the fixture can never again collide with the date it runs on.
run(`
  const base=new Date(todayISO+'T00:00');
  const strongDow=(base.getDay()+3)%7;                 // always 3 off from today
  for(let i=0;i<365;i++){
    const c=new Date(base); c.setDate(c.getDate()-i);
    const dow=c.getDay();               // 0 Sun .. 6 Sat
    const iso=c.toLocaleDateString('en-CA');
    // strongDow always; today's own weekday only 1 in 5 — strongDow must win
    if(dow===strongDow || (dow===base.getDay() && i%5===0)) DB.days[iso]={w:[{part:'Back',ex:'Pull Up',w:70,reps:[8]}],upd:1};
  }
  SEED=deriveAll(); _fireDist=null;
  view='stats'; render();
`);

const todayDow = run(`new Date(todayISO+'T00:00').getDay()`);
console.log("     (today's weekday index:", todayDow + ", strongest is always 3 off from it now)");

// v3.3.213: the weekday diagnosis was retired. Current rhythm now carries
// the immediate, day-level motivation without asking the user to interpret a
// behavioural distribution.
check("the Weekdays chart is absent", `document.querySelectorAll('.wd-col').length`, 0);
check("Current rhythm renders one current-month calendar", `document.querySelectorAll('.crcard').length`, 1);
check("today is identified in the attendance heatmap", `document.querySelectorAll('.heatgrid .tod').length`, 1);

// FIX 3: the report overlay carries the app font (it's mounted on <body>)
run(`repOvEl();`);   // build the overlay directly
check("report overlay uses the app font",
      `(()=>{const ov=document.getElementById('repOv'); return ov?/var\\(--body\\)/.test(ov.style.fontFamily)||ov.style.fontFamily.includes('Plex')||/--body/.test(ov.getAttribute('style')):'no-overlay';})()`, true);

// ---- v3.3.95: one fraction, one denominator ------------------------------
// The KPI card and the consistency chart render the same fact. They used
// different denominators on an unwritten day, so 62% and 61% appeared on one
// screen. These assert they are now the SAME arithmetic, not merely close.
const kpiExpr = `(function(){const dates=workoutDates();
  const el=elapsedDays();
  return [...dates].filter(d=>d.startsWith(thisYear)).length/el;})()`;
const curveExpr = `(function(){const c=yearCurves()[thisYear]; return c.curve[c.end-1];})()`;

// the exact reported case: day 207 of the year, 127 trained, today unwritten
check("elapsedDays() drops an unwritten today from the denominator",
      `(function(){delete DB.days[todayISO]; SEED=deriveAll();
        return elapsedDays()===doy(todayISO)-1;})()`, true);
check("...and counts it once it is written",
      `(function(){DB.days[todayISO]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
        SEED=deriveAll(); const r=elapsedDays()===doy(todayISO);
        delete DB.days[todayISO]; SEED=deriveAll(); return r;})()`, true);

/* property: across many shapes of year the two are the SAME arithmetic.
   The curve is stored in a Float32Array, so it is compared through
   Math.fround() — demanding bit-identical float64 of a float32 store was
   the first draft's error, and it failed 11/12 on a 4e-9 difference while
   the code was already correct. Match the storage, not the ideal. */
check("KPI and chart endpoint are the same arithmetic across 12 year shapes",
      `(function(){
        const kept=JSON.parse(JSON.stringify(DB.days));
        let bad=0;
        for(const step of [2,3,4,5,6,7,8,9,10,11,13,17]){
          DB.days={}; const y=+todayISO.slice(0,4), D=doy(todayISO);
          for(let d=1; d<D; d+=step){
            const dt=new Date(y,0,d);
            DB.days[dt.toLocaleDateString('en-CA')]=
              {w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
          }
          delete DB.days[todayISO]; SEED=deriveAll();
          const a=${kpiExpr}, b=${curveExpr};
          if(Math.fround(a)!==b) bad++;
        }
        DB.days=kept; SEED=deriveAll();
        return bad;})()`, 0);

// and identical AFTER rounding, which is what the screen actually shows
check("...and render as the same integer percent",
      `(function(){
        const kept=JSON.parse(JSON.stringify(DB.days));
        let bad=0;
        for(const step of [2,3,5,7,11]){
          DB.days={}; const y=+todayISO.slice(0,4), D=doy(todayISO);
          for(let d=1; d<D; d+=step){
            const dt=new Date(y,0,d);
            DB.days[dt.toLocaleDateString('en-CA')]=
              {w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};
          }
          delete DB.days[todayISO]; SEED=deriveAll();
          if(Math.round(${kpiExpr}*100)!==Math.round(${curveExpr}*100)) bad++;
        }
        DB.days=kept; SEED=deriveAll();
        return bad;})()`, 0);

// the rule cannot drift back into a second copy
const utilSrc95  = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
const headSrc95  = fs.readFileSync(path.join(dir, "js/header.js"), "utf8");
const statsSrc95 = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
console.log((/function elapsedDays\(\)/.test(utilSrc95) ? "PASS" : "FAIL"),
  "elapsedDays() is defined once, in util.js");
if (!/function elapsedDays\(\)/.test(utilSrc95)) fail++;
const openCoded = [headSrc95, statsSrc95, utilSrc95]
  .filter(s => /doy\(todayISO\)\s*-\s*\(\s*trainedToday/.test(s)).length;
console.log((openCoded === 0 ? "PASS" : "FAIL"),
  "no file open-codes the elapsed rule any more \u2192", openCoded);
if (openCoded !== 0) fail++;
console.log((/elapsedDays\(\)/.test(headSrc95) ? "PASS" : "FAIL"),
  "the header reads the shared elapsed-day rule");
if (!/elapsedDays\(\)/.test(headSrc95)) fail++;

// ---- v3.3.99: the game itself leads the KPIs -------------------------------
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=40;i++){const d=new Date(t); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};}
  SEED=deriveAll(); view='stats'; render();})()`);
check("the unified attendance hero leads Stats", `!!document.querySelector('#secDays + .crcard')`, true);
check("...showing the live total", `document.querySelector('.crtotal>b').textContent`, "40");
/* v3.3.307: the lifetime pace moved to its own line under the number
   (.crsince) and streak+best to one line beside it (.crstreak). Same two
   facts, asserted where they now live. */
check("...with the lifetime-pace caption", `/% of every day since/.test(document.querySelector('.crsince').textContent)`, true);
check("...and streak plus best in the same card",
      `(function(){const s=document.querySelector('.crstreak');
        return !!s && /streak/.test(s.textContent) && /best/.test(s.textContent);})()`, true);
// logging today moves the number — the card is live, like the grid total
check("logging today increments it to 41",
      `(function(){day(todayISO).w.push({part:'Back',ex:'Row',w:40,reps:[10],at:Date.now()});
        SEED=deriveAll(); render();
        const v=document.querySelector('.crtotal>b').textContent;
        day(todayISO).w.pop(); SEED=deriveAll(); return v;})()`, "41");
// and it agrees with the month grid's total — one live-total rule everywhere
check("kpi total and grid total are the same arithmetic",
      `(function(){render(); // the previous check left the DOM one derive behind
        return document.querySelector('.crtotal>b').textContent===String(gridData().total);})()`, true);

// ---- v3.3.100: hero row + one 3-up row --------------------------------------
run(`view='stats'; render();`);
check("the attendance hero has exactly one grid, not two",
      `document.querySelectorAll('.crcard .heatgrid').length`, 1);
const cssSrc100 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
/* v3.3.307: .crherohead became .crhead when the card became a heatmap — the
   property is unchanged, the two facts still share one row with the streak
   pushed to the far edge. */
{
  const flat100 = cssSrc100.replace(/\r?\n\s*/g, "");
  const one = /\.crhead\{[^}]*display:flex/.test(flat100)
           && /\.crhead\{[^}]*justify-content:space-between/.test(flat100);
  console.log((one ? "PASS" : "FAIL"), "lifetime and streak share one clear hero row");
  if (!one) fail++;
}
check("the duplicate Current rhythm heading is gone", `![...document.querySelectorAll('h2')].some(h=>h.firstChild.textContent.trim()==='Current rhythm')`, true);

/* v3.3.101, an honest limit: the dead space the maker circled came from
   TEXT WRAPPING (the streak label + comeback line wrapping to 4 visual
   lines vs 3 for the other cards), not from a difference in child COUNT —
   all three cards had 3 children before this release too. jsdom does not
   run real layout, so wrap-driven height cannot be asserted here; a first
   attempt at a "same child count" check was written, found to test the
   wrong invariant (2 vs 3 now, not the cause of the original gap), and
   removed rather than kept as a misleading green. Confirmed by the
   screenshot the maker sends back, not by this harness. */

// ---- v3.3.101: the hero row is vertically centred, not baseline-aligned.
// baseline alignment measured the number's own text baseline against the
// FIRST LINE of the two-line label span, leaving a gap above the label
// equal to the number's ascent overshoot \u2014 the dead space the maker
// circled at the top of the hero card.
const cssSrc101 = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
/* v3.3.307: the numeral came down 40 -> 30px when the calendar left and the
   heatmap took the space. It is still by far the largest thing in the card,
   which is the property — asserted as a RATIO against the next largest text
   rather than as a literal that any retune would break. */
{
  const flat101 = cssSrc101.replace(/\r?\n\s*/g, "");
  const hero = +(flat101.match(/\.crtotal>b\{[^}]*font-size:(\d+)px/) || [0,0])[1];
  const next = +(flat101.match(/\.crstreak\{[^}]*font-size:([\d.]+)px/) || [0,0])[1];
  const dominant = hero >= 26 && next > 0 && hero >= next * 2;
  console.log((dominant ? "PASS" : "FAIL"),
    `the lifetime total remains the dominant number (${hero}px vs ${next}px)`);
  if (!dominant) fail++;
}

// ---- v3.3.111: the section order is declared, not incidental ------------
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=400;i++){const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};
    if(i%3===0) DB.days[iso].w.push({part:'Run',ex:'Run',w:5,reps:[],mins:30,secs:0,at:1});}
  setBw(todayISO,70);
  SEED=deriveAll(); view='stats'; render();})()`);

/* Strip the (i) tip's text, which is appended inside the same <h2>. Splitting
   on the letter "i" was the first attempt and it decapitated "Consistency"
   at its own first i. Take the heading's first text node instead \u2014 the
   title is authored before the iBtn markup. */
const heads = () => run(`JSON.stringify([...document.querySelectorAll('#view h2')]
  .map(h=>(h.childNodes[0]&&h.childNodes[0].nodeType===3?h.childNodes[0].textContent:h.textContent).trim()))`);
const H = JSON.parse(heads());
const idx = t => H.findIndex(x => x.startsWith(t));

// the maker's order, top to bottom (v3.3.257: Session build leads — the
// page opens on what you just did — then coverage, verdict, and the
// attendance hero, then pace and the year story)
/* v3.3.370: the headings were RENAMED into the app's own voice -- clinical
   names for the two cards that carry the muscle-building half of the product.
   The ORDER is what this pins and the order is unchanged; only the words. */
const WANT = ["What you did", "The last 7 days", "Are you growing?", "Show up",
              "Monthly pace", "This year vs last", "Running", "Distance", "Pace", "Every week", "Weight"];
/* v3.3.370: and the SHARE PICKER must call each card what the heading calls
   it. The picker is the same card under another name otherwise, which is how
   a rename half-lands. */
{
  const labels = (fs.readFileSync(path.join(dir,"js/report.js"),"utf8")
                  .match(/label:'([^']+)'/g)||[]).join('|');
  console.log((/This year vs last/.test(labels) && !/label:'Consistency'/.test(labels)
    ? "PASS" : "FAIL"), "the share picker uses the heading's own words");
  if(!/This year vs last/.test(labels)) fail++;
}
let lastAt = -1, orderOK = true, broke = "";
for (const t of WANT) {
  const at = idx(t);
  if (at < 0) { orderOK = false; broke = t + " missing"; break; }
  if (at < lastAt) { orderOK = false; broke = t + " out of order"; break; }
  lastAt = at;
}
console.log((orderOK ? "PASS" : "FAIL"), "Stats sections render in the declared order", "\u2192", broke || H.slice(0,12).join(" \u2192 "));
if (!orderOK) fail++;

// the two removed sections are gone everywhere
// v3.3.130: Report card is BACK — as the one share surface, last before Settings
check("Report card leaves Stats", `/id="secReport"/.test($('#view').innerHTML)`, false);
check("Monthly milestone has no standalone heading", `![...document.querySelectorAll('h2')].some(h=>h.firstChild.textContent.trim()==='Monthly milestone')`, true);
check("Last 30 days vs your usual is gone", `/vs your usual/.test($('#view').innerHTML)`, false);
check("Days by month is gone", `/Days by month/.test($('#view').innerHTML)`, false);
check("Last 6 months is gone", `/Last 6 months/.test($('#view').innerHTML)`, false);
check("Weekdays is gone", `/>Weekdays</.test($('#view').innerHTML)`, false);

// titles follow the rule: no comma-qualifiers left in the retitled set
const commaTitles = H.filter(t => /^(Consistency|Monthly pace|Weight|Distance|Pace)\b/.test(t) && t.includes(","));
console.log((commaTitles.length === 0 ? "PASS" : "FAIL"),
  "retitled sections carry no comma-qualifier (it belongs in the tip)", "\u2192", commaTitles.join("|") || "none");
if (commaTitles.length) fail++;

// repData survived the Report card removal \u2014 the month grid still needs it
console.log((typeof run(`typeof repData`) === "string" && run(`typeof repData`) === "function" ? "PASS" : "FAIL"),
  "repData() survives (the month grid's expand reads it)");
if (run(`typeof repData`) !== "function") fail++;
console.log((run(`typeof drawRep`) === "undefined" ? "PASS" : "FAIL"),
  "...while drawRep() went with its section");
if (run(`typeof drawRep`) !== "undefined") fail++;

// ---- v3.3.112: one action group per header ------------------------------
const HD = () => run(`JSON.stringify([...document.querySelectorAll('#view h2')].map(h=>({
  t:(h.childNodes[0]&&h.childNodes[0].nodeType===3?h.childNodes[0].textContent:h.textContent).trim(),
  i:!!h.querySelector('.tipi'), d:!!h.querySelector('.shareb'),
  lastIsActs: h.lastElementChild ? h.lastElementChild.classList.contains('hacts') : false,
  quiet:h.classList.contains('quiet')})))`);
const hd = JSON.parse(HD());
const dataHeads = hd.filter(r => !r.quiet && r.t !== "Settings");

/* v3.3.152 disclosure audit: five sections deliberately carry NO (i) —
   their tips repeated visible labels (kpis, run, nextms, and both Records).
   The invariant is no longer "every head has one" but "exactly the audited
   set has none", so a tip silently vanishing elsewhere still fails. */
const NO_TIP = new Set(["Show up — that's the whole game","Run"]);
const NO_TIP_PRE = ["Running \u00b7"];   // v3.3.162: month-named, tipless by audit
const bare = dataHeads.filter(r => !r.i && !NO_TIP_PRE.some(pfx => r.t.startsWith(pfx)));
console.log((bare.every(r => NO_TIP.has(r.t)) && dataHeads.some(r => r.i) ? "PASS" : "FAIL"),
  "only the audited sections lack an (i)", "\u2192",
  bare.map(r => r.t).join("|") || "none bare");
if (!(bare.every(r => NO_TIP.has(r.t)) && dataHeads.some(r => r.i))) fail++;

const withActs = dataHeads.filter(r => r.i);
console.log((withActs.every(r => r.lastIsActs) ? "PASS" : "FAIL"),
  "...and where an action group exists it is the LAST child, hard right", "\u2192",
  withActs.filter(r => !r.lastIsActs).map(r => r.t).join("|") || "all " + withActs.length);
if (!withActs.every(r => r.lastIsActs)) fail++;

/* v3.3.130: the per-section download icon is gone entirely. The assertion it
   used to make — "a section cannot silently gain an icon that opens nothing"
   — is made at the registry now (test-cards), where an unregistered card is
   unreachable. Here we only hold the line that no section grew one back. */
const withDl = hd.filter(r => r.d).map(r => r.t).sort().join(",");
console.log((withDl === "" ? "PASS" : "FAIL"),
  "no section header carries a share icon any more", "→", withDl || "none");
if (withDl !== "") fail++;

/* v3.3.130: "Share as image" comes back \u2014 but exactly once, in the report
   card. The original assertion guarded against it being duplicated across
   every card body, and that is still the thing worth guarding. */
check("'Share as image' does not compete with analysis in Stats",
      `($('#view').innerHTML.match(/Share as image/g)||[]).length`, 0);

/* v3.3.130: the risk moved. It used to be "did the ids survive the move" \u2014
   now it is "does the one button reach a renderer, and does rotating change
   WHICH card it reaches". A share button that always sends card 1 would look
   perfectly fine on screen. */
run(`view='history'; render(); document.getElementById('secReport').open=true; paintRepCard();
     __origShow = showCard; globalThis.__sent=[];
     showCard = (fn,label) => { globalThis.__sent.push(label); return null; };`);
run(`_repIdx=0; document.querySelector('#repShare').click();
     document.querySelector('#repNext').click();
     document.querySelector('#repShare').click();`);
const sent = run(`JSON.stringify(globalThis.__sent)`);
run(`showCard = __origShow; _repIdx=0;`);
const sentA = JSON.parse(sent);
console.log((sentA.length === 2 ? "PASS" : "FAIL"),
  "the share button reaches a card renderer when tapped", "\u2192", sentA.length + "/2");
if (sentA.length !== 2) fail++;
console.log((sentA.length === 2 && sentA[0] !== sentA[1] ? "PASS" : "FAIL"),
  "...and rotating changes WHICH card it sends", "\u2192", sentA.join(" then "));
if (!(sentA.length === 2 && sentA[0] !== sentA[1])) fail++;

// tips stay within the one-breath budget buildcheck enforces
const tipLens = run(`JSON.stringify([...document.querySelectorAll('#view .tipbubble')].map(t=>t.textContent.length))`);
const maxTip = Math.max(...JSON.parse(tipLens));
console.log((maxTip <= 120 ? "PASS" : "FAIL"), "every tip fits in one breath (\u2264120 chars)", "\u2192", "longest " + maxTip);
if (maxTip > 120) fail++;

/* ---- v3.3.125: the two-shape rule is WITHDRAWN, on the maker's call ------
   v3.3.113 collapsed four aspect ratios to two, to stop section heights
   looking arbitrary. The maker has since reversed it: each chart should be
   sized to what it displays. That is a better rule \u2014 the part-mix chart
   proved it by carrying ~50px of empty box under every render just to hit
   a ratio.
   What replaces it is the property the ratio rule was a proxy for: a chart
   must not waste its own height. Content has to reach most of the way down
   its viewBox, whatever shape that viewBox is. */
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=1;i<=400;i++){const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};
    if(i%3===0) DB.days[iso].w.push({part:'Run',ex:'Run',w:5,reps:[],mins:30,secs:0,at:1});}
  SEED=deriveAll();
  setBw('2025-02-01',72); setBw('2025-09-01',70.5); setBw(todayISO,70);
  SEED=deriveAll(); view='stats'; render();})()`);

const fill = JSON.parse(run(`JSON.stringify([...document.querySelectorAll('#view .card svg')]
  .map(s=>{const v=(s.getAttribute('viewBox')||'').split(/\\s+/).map(Number);
    if(!v[2]||v[2]<=100) return null;
    let m=0; s.querySelectorAll('*').forEach(e=>{
      ['y','y1','y2','cy'].forEach(a=>{const n=parseFloat(e.getAttribute(a)); if(!isNaN(n)) m=Math.max(m,n);});
      const hh=parseFloat(e.getAttribute('height')), yy=parseFloat(e.getAttribute('y'));
      if(!isNaN(hh)&&!isNaN(yy)) m=Math.max(m,yy+hh);});
    return {box:v[2]+'x'+v[3], used:+(m/v[3]).toFixed(2)};}).filter(Boolean))`));
/* 0.80, not 0.85: this measure reads each element's y/height attributes and
   so cannot see how far ROTATED text extends below its anchor. The part-mix
   dates run vertically, so its true fill is ~98% where this reads 84%. The
   threshold is set to what the measure can actually observe, and is still
   tight enough to catch the pre-fix box (78%). */
const slack = fill.filter(f => f.used < 0.80);
console.log((slack.length === 0 ? "PASS" : "FAIL"),
  "every chart uses most of its own height (no dead box)", "\u2192",
  slack.length ? slack.map(f => f.box + " only " + Math.round(f.used*100) + "%").join(", ")
               : fill.length + " charts, tightest " + Math.round(Math.min(...fill.map(f=>f.used))*100) + "%");
if (slack.length) fail++;

// the weight chart specifically \u2014 it was rescaled by 1.135 and is easy to clip
check("the weight chart sits in the short box",
      `(function(){const el=document.querySelector('#secWeight');
        const svg=el&&el.nextElementSibling?el.nextElementSibling.querySelector('svg'):null;
        return svg?svg.getAttribute('viewBox'):'none';})()`, "0 0 330 118");
check("...with every plotted point inside its plot area",
      `(function(){const el=document.querySelector('#secWeight');
        const svg=el.nextElementSibling.querySelector('svg');
        return [...svg.querySelectorAll('circle')].every(c=>{const y=+c.getAttribute('cy'); return y>=18&&y<=96;});})()`, true);

/* v3.3.332: the month row and the heatmap are ONE column geometry.
   The maker's screenshot had AUG dangling off the bottom-right corner,
   outside the grid entirely. Cause: .heatticks was a sibling of .heatwrap,
   so the two boxes resolved the SAME `repeat(--hw, minmax(7px,1fr))` against
   DIFFERENT widths -- the grid carries min-width:100% and overflows its
   scroller to whatever 35 columns need, while the ticks were capped at the
   card's width. Identical template, two containers, so every label drifted
   and the last fell off the end.
   The property is containment, not styling: a label can only sit over its
   column if one box sizes both. That is what is asserted -- jsdom has no
   layout, so a pixel comparison here would be theatre. */
check("the month row shares one box with the grid",
      `(function(){const g=document.querySelector('.heatgrid'),t=document.querySelector('.heatticks');
        return !!g && !!t && g.parentElement===t.parentElement;})()`, true);
check("...and that box is the scroller, so they scroll together",
      `(function(){const t=document.querySelector('.heatticks');
        return !!t.closest('.heatscroll') && !!t.closest('.heatwrap');})()`, true);
check("...both counting the same number of weeks",
      `(function(){const g=document.querySelector('.heatgrid'),t=document.querySelector('.heatticks');
        return g.style.getPropertyValue('--hw')===t.style.getPropertyValue('--hw')
            && g.style.getPropertyValue('--hw').trim()!=='';})()`, true);
check("...every label landing inside the grid it labels",
      `(function(){const hw=+document.querySelector('.heatgrid').style.getPropertyValue('--hw');
        return [...document.querySelectorAll('.heatticks span')]
          .every(s=>{const c=+s.style.getPropertyValue('--c'); return c>=0 && c<hw;});})()`, true);
/* v3.3.333: the sheen belongs to the WINDOW, not to what slides past it.
   It was .heatwrap::after -- absolutely positioned INSIDE the scroll
   container, so its containing block was the scrollable overflow area rather
   than the visible box: as wide as all 35 weeks, and travelling with the
   grid, so scrolling left carried the highlight away with the squares and it
   died halfway across. The property is that the element carrying the sheen
   is NOT the element that scrolls. */
check("the sheen sits on a frame that does not scroll",
      `(function(){const f=document.querySelector('.heatframe'),w=document.querySelector('.heatwrap');
        return !!f && !!w && f.contains(w) && f!==w;})()`, true);
check("...and the scroller itself carries no sheen",
      `${(function(){const c=fs.readFileSync(path.join(dir,"css/app.css"),"utf8")
           .replace(/\/\*[\s\S]*?\*\//g,"").replace(/\r?\n\s*/g,"");
         return !/\.heatwrap::after\{/.test(c) && /\.heatframe::after\{/.test(c);})()}`, "true");
check("...with the frame positioned, or inset:0 would escape it",
      `${/\.heatframe\{[^}]*position:relative/.test(
         fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,""))}`, "true");
/* v3.3.333: the calendar opens on today. Eight months wide, opening at
   scrollLeft 0 put the maker eight months in the past every time. jsdom
   reports 0 for scrollWidth/clientWidth, so the LAYOUT cannot be tested
   here -- what is pinned is that the binding exists, runs on paint, and is
   guarded so a re-render cannot yank a scroll the user set by hand. */
check("the calendar binds a starting position", `typeof bindHeat`, "function");
check("...wired into paint, beside the other scrollers",
      `/bindHeat\(\)/.test(String(paint))`, true);
check("...and will not re-yank a scroll the user has moved",
      `(function(){const el=document.querySelector('.heatwrap');
        if(!el) return 'no heatwrap'; el.dataset.bound='1'; el.scrollLeft=0;
        bindHeat(); return el.scrollLeft===0;})()`, true);

/* the dead structure the old rules described, gone rather than left to rot */
/* comments FIRST: the v3.3.332 note in the sheet quotes the exact rule it
   describes as deleted, and an uncommented grep matches the prose. Same trap
   the pill-edge guard fell into; stripping is not optional. */
check("no rule re-declares the heat scroller as a flex rail",
      `${!/\.heatwrap\{display:flex/.test(
         fs.readFileSync(path.join(dir,"css/app.css"),"utf8")
           .replace(/\/\*[\s\S]*?\*\//g,"").replace(/\r?\n\s*/g,""))}`, "true");

/* v3.3.348: today's cell is FOUND, and its square is left alone.
   The old mark was inset 1.5px of --accent-ink -- a dark ring inside an 11px
   square, dark-on-dark on any day you trained, and it shrank the one cell you
   look for. The three properties below are what replaced it, and the middle
   one is the point: the halo may not touch the data. */
{
  const cssT = fs.readFileSync(path.join(dir, "css/app.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\r?\n\s*/g, "");
  check("today is still the one cell marked",
        `document.querySelectorAll('.heatgrid .tod').length`, 1);
  /* the first version of this matched `inset:-` ANYWHERE in a tod::after
     block, and the reduced-motion rule further down also carries one -- so
     flipping the real rule to a positive inset passed clean. It named the
     right property and checked the wrong block. This picks the rule that
     draws the ring (the one with a border) and asks THAT one. */
  {
    const ring = (cssT.match(/\.heatgrid \.hc\.tod::after\{[^}]*border:[^}]*\}/) || [""])[0];
    check("...marked OUTSIDE the square, never inset into it",
          `${/inset:-/.test(ring) && !/\.heatgrid \.hc\.tod\{[^}]*inset 0 0 0/.test(cssT)}`, "true");
  }
  /* the cell must keep its full --hcell: shrinking it was half the bug, and
     it would also desync the static weekday rail (v3.3.335) */
  check("...leaving the cell its full size",
        `${!/\.heatgrid \.hc\.tod\{[^}]*(width|height|padding|transform|scale)/.test(cssT)}`, "true");
  check("...and holding still when motion is unwelcome",
        `${/prefers-reduced-motion:reduce\)\{[^}]*\.heatgrid \.hc\.tod::after\{[^}]*animation:none/.test(cssT)}`, "true");
  /* a ::after needs a positioned parent or inset resolves against an
     ancestor and the ring lands somewhere else entirely -- the same trap the
     heatmap sheen fell into in v3.3.333 */
  check("...anchored to the cell, or the ring escapes it",
        `${/\.heatgrid \.hc\{[^}]*position:relative/.test(cssT)}`, "true");
}

process.exit(fail ? 1 : 0);
