// test-sharecard.js DIR — v3.3.72: the 1:1 year-grid share card.
//
// The harness normally stubs getContext to a no-op Proxy, which makes canvas
// work invisible to every suite. This one installs a RECORDING context
// instead: every draw call and every property set is logged, so the card can
// be asserted structurally even though jsdom rasterises nothing. It still
// cannot tell you the card looks good — only that it drew what it claimed to.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage72";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};

let calls = [];
const METHODS = ["fillRect","clearRect","fillText","strokeText","beginPath","moveTo","lineTo",
  "arcTo","arc","rect","closePath","fill","stroke","setLineDash","save","restore",
  "translate","scale","drawImage","createLinearGradient"];
w.HTMLCanvasElement.prototype.getContext = function () {
  const t = { canvas: this };
  for (const m of METHODS) t[m] = (...a) => { calls.push([m, ...a]); };
  t.measureText = (s) => { calls.push(["measureText", s]); return { width: String(s).length * 18 }; };
  t.createLinearGradient = () => ({ addColorStop(){} });
  return new Proxy(t, { set(o, p, v) { o[p] = v; calls.push(["set:" + String(p), v]); return true; } });
};
w.HTMLCanvasElement.prototype.toDataURL = function () { return "data:image/png;base64,AA"; };
w.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new w.Blob([""], { type: "image/png" })); };

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "→ " + extra);
  if (!cond) fail++;
};
const check = (name, expr, want) => {
  const got = run(expr);
  ok(name, String(got) === String(want), got);
};

// Fixture: two clean years plus this month, anchored so the current-month cell
// is real. Dates are derived from todayISO so the card is always "in range".
const FIX = `(function(){
  const yNow=+todayISO.slice(0,4);
  DB.days={};
  const add=(iso)=>{ DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}]}; };
  add((yNow-2)+'-03-04'); add((yNow-2)+'-03-05'); add((yNow-2)+'-07-11');
  add((yNow-1)+'-01-09'); add((yNow-1)+'-01-10'); add((yNow-1)+'-01-11'); add((yNow-1)+'-11-02');
  add(todayISO.slice(0,7)+'-01');
  SEED=deriveAll();
  return Object.keys(DB.days).length;
})()`;
run(FIX);

// ---- 1. gridData is the single source of arithmetic ----------------------
check("gridData counts days per month", `gridData().mDays[(+todayISO.slice(0,4)-1)+'-01']`, 3);
check("...spans first year to this year",
      `gridData().y1-gridData().y0`, 2);
check("...knows the busiest month", `gridData().max`, 3);
check("...and the total matches the derived sessions",
      `gridData().total === SEED.totals.sessions`, true);
const statsSrc = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
/* v3.3.271 RESTATES: the on-screen Every-month grid was DELETED with the
   other retired sections, so gridData()'s consumers are the card and Today's
   rhythm strip — no HTML grid remains to duplicate the arithmetic. */
ok("no HTML grid remains in Stats to duplicate the card's arithmetic",
   !/const _gd=gridData\(\)/.test(statsSrc));

// ---- 2. the card is square ------------------------------------------------
calls = [];
const cv = run(`drawGrid(gridData())`);
ok("the card renders", !!cv);
ok("it is 1080x1080 (1:1, uncropped everywhere)",
   cv && cv.width === 1080 && cv.height === 1080, cv && cv.width + "x" + cv.height);

const texts = calls.filter(c => c[0] === "fillText").map(c => String(c[1]));
const sets  = calls.filter(c => c[0] === "set:fillStyle").map(c => String(c[1]));

// ---- 3. the streak number leads ------------------------------------------
const total = run(`String(gridData().total)`);
ok("the day count is drawn", texts.includes(total), total);
/* v3.3.135: the label carries the denominator now — "of 1,690 days" — so an
   exact match on "days" no longer holds. Assert the FRACTION is stated, and
   that the denominator is the elapsed span rather than an arbitrary number. */
const denom = texts.find(t => /^of [\d,]+ days$/.test(t));
ok("...labelled with the span it is out of", !!denom, denom || texts.slice(0,4).join(" | "));
if (denom) {
  const shown = +denom.replace(/\D/g, "");
  const expect = run(`(function(){const gd=gridData();
      return Math.round((new Date(todayISO+'T00:00')-new Date((gd.first||todayISO)+'T00:00'))/86400000)+1;})()`);
  ok("...and that span is days elapsed since the first entry", shown === expect,
     shown + " vs " + expect);
  ok("...with the count never exceeding it", +total <= shown, total + " of " + shown);
  /* v3.3.136: the footer states the same relationship as a rate. Two derived
     numbers on one card is exactly where they drift apart, so this asserts
     they AGREE rather than merely that both are present. */
  const pct = texts.find(t => /^\d+% of days$/.test(t));
  ok("the footer states the rate", !!pct, pct || "missing");
  if (pct) {
    const shownPct = +pct.replace(/\D/g, "");
    ok("...and it agrees with the fraction above it",
       shownPct === Math.round(+total / shown * 100),
       pct + " vs " + total + "/" + shown);
    ok("...and is a real percentage", shownPct >= 0 && shownPct <= 100, String(shownPct));
  }
}
ok("...before anything else on the card", texts.indexOf(total) === 0);
ok("the app is named", texts.includes("ShowUp"));
// v3.3.133: no card carries the URL any more; "ShowUp" above is the provenance
ok("no URL stamp on the card", !texts.some(t => t.includes("tahros.github.io/showup")),
   texts.filter(t => /tahros/.test(t)).join(",") || "none");

// ---- 4. every month in range is drawn, and nothing outside it ------------
const inRange = run(`(function(){
  const g=gridData(); let n=0;
  for(let y=g.y0;y<=g.y1;y++) for(let m=1;m<=12;m++){
    const k=y+'-'+String(m).padStart(2,'0');
    if(k>=g.m0&&k<=g.mNow) n++;
  } return n; })()`);
// NB: the headline day count is also a digits-only fillText, so count cell
// glyphs only from after the section label — otherwise the total is counted
// as a 13th month.
const gridStart = texts.indexOf("SHOWING UP, EVERY MONTH");
const cellTexts = texts.slice(gridStart + 1).filter(t => /^(\d+|\u00b7)$/.test(t));
ok("one glyph per in-range month, none outside",
   cellTexts.length === Number(inRange), `${cellTexts.length} drawn / ${inRange} in range`);
const filled = run(`Object.values(gridData().mDays).filter(n=>n>0).length`);
ok("...and a tinted cell for every month with days",
   calls.filter(c => c[0] === "fill").length >= Number(filled), Number(filled));

// ---- 5. the tint is the accent at alpha, like the CSS grid's color-mix ---
const tints = sets.filter(s => s.startsWith("rgba("));
ok("cells are tinted with an alpha accent", tints.length > 0, tints[0]);
const alphas = tints.map(s => parseFloat(s.split(",")[3]));
ok("...darker means more days (max month is the strongest)",
   Math.max(...alphas) <= 0.88 + 1e-9 && Math.min(...alphas) >= 0.14 - 1e-9,
   `${Math.min(...alphas)}–${Math.max(...alphas)}`);

// ---- 5b. the month in progress is DIMMER, in both themes ----------------
// Alpha, not a colour, so light and dark behave the same. The existing bound
// above passed this by luck; assert the rule itself.
check("mgAlpha dims the current month", `mgAlpha(3,3,true) < mgAlpha(3,3,false)`, true);
check("...by a fixed fraction, not a colour swap", `+(mgAlpha(3,3,true)/mgAlpha(3,3,false)).toFixed(2)`, 0.45);
check("...and an empty month is still nothing", `mgAlpha(0,3,true)`, 0);
const curAlpha = run(`(function(){ const g=gridData();
  return +mgAlpha(g.mDays[g.mNow]||0, g.max, true).toFixed(3); })()`);
const lastTint = parseFloat(tints[tints.length - 1].split(",")[3]);
ok("the card paints this month \u2014 the last cell drawn \u2014 at the dimmed alpha",
   lastTint === Number(curAlpha), `${lastTint} vs ${curAlpha}`);
const fullAlpha = run(`(function(){ const g=gridData();
  return +mgAlpha(g.mDays[g.mNow]||0, g.max, false).toFixed(3); })()`);
ok("...not the full one a finished month would get",
   lastTint < Number(fullAlpha), `${lastTint} < ${fullAlpha}`);
/* v3.3.271 RESTATES: with the screen grid deleted, mgAlpha() has exactly
   one drawing consumer — the card. The rule itself stays defined once in
   stats.js, and the card must keep reading it rather than growing its own. */
ok("the card reads the one alpha rule, and no second renderer exists",
   /mgAlpha\(n,gd\.max,k===gd\.mNow\)/.test(fs.readFileSync(path.join(dir,"js/report.js"),"utf8")) &&
   /function mgAlpha\(/.test(statsSrc) && !/mgAlpha\(n,gMax,k===mNow\)/.test(statsSrc));

// ---- 6. this month is dashed, and the dash is put back ------------------
const dashes = calls.filter(c => c[0] === "setLineDash");
ok("the current month is stroked dashed", dashes.some(c => (c[1] || []).length > 0));
ok("...exactly once (only this month is unfinished)",
   dashes.filter(c => (c[1] || []).length > 0).length === 1,
   dashes.filter(c => (c[1] || []).length > 0).length);
ok("...and the dash is cleared after, so nothing else inherits it",
   dashes.length >= 2 && (dashes[dashes.length - 1][1] || []).length === 0);

// ---- 7. the whole path: button → overlay → shareable file ----------------
run(`view='stats'; renderStats();`);
/* v3.3.130: the seven per-section buttons collapsed into one carousel. The
   path under test is the same — control → overlay → file — but there is now
   exactly one entry point to it. */
ok("Stats offers no share control", !/id="repShare"/.test(run(`$('#view').innerHTML`)));
ok("...and no per-section share icon survives anywhere",
   run(`document.querySelectorAll('.shareb').length`) === 0,
   run(`document.querySelectorAll('.shareb').length`) + " left");
// the paragraph under the grid moved behind the dot (DESIGN.md D1)
const gridHtml = run(`$('#view').innerHTML`);
ok("the retired Every month screen stays gone while its Report Card survives",
   !/data-tip="mgrid"/.test(gridHtml) && run(`shareCards().some(c=>c.id==='grid')`));
ok("...and no paragraph is left under it", !/the whole history on one screen/.test(gridHtml));
/* v3.3.112: accept either call shape. These greps pinned iBtn('mgrid',...)
   and broke when the tip moved into hActs() \u2014 the tip text was unchanged,
   only its caller. Matching both keeps the assertion about the TIP rather
   than about which helper happens to wrap it. */
/* v3.3.152: quote-agnostic — the audit rewrote tips with single quotes */
/* v3.3.271 RESTATES: the mgrid tip left with its section. A tip for a
   section that does not exist would be the stale-documentation species all
   over again, so its absence is the assertion now. */
ok("...and the retired section's tip left with it",
   !/(?:iBtn|hActs)\('mgrid'/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")));
/* v3.3.148: #gridShare died in v3.3.130 — the carousel is the one door now.
   This click was a null deref that crashed the suite silently for fourteen
   releases; everything below here never ran. Rotate to the grid card and go
   through the real button. */
run(`view='history'; render(); document.getElementById('secReport').open=true; paintRepCard();
     _repIdx=shareCards().findIndex(c=>c.id==='grid');
     document.getElementById('repShare').click();`);
// showCard awaits document.fonts.ready; drain the microtask queue
run(`Promise.resolve()`);
const settled = new Promise(r => setTimeout(r, 50));

module.exports = settled.then(() => {
  ok("the overlay opens", !!run(`document.getElementById('repOv')`));
  ok("...showing the rendered card", /^data:image\/png/.test(run(`(document.getElementById('repImg')||{}).src||''`)));
  check("...and it is the grid card that was stored",
        `!!(_repCv&&_repCv.cv&&_repCv.cv.width===1080&&_repCv.cv.height===1080)`, true);

  // filename must survive a label that is not a month name
  run(`_repCv={cv:_repCv.cv,label:'926-days'};`);
  let shared = null;
  w.navigator.canShare = () => true;
  w.navigator.share = (o) => { shared = o; return Promise.resolve(); };
  run(`document.getElementById('repDo').click();`);
  return new Promise(r => setTimeout(r, 20)).then(() => {
    ok("Share hands a PNG file to the OS share sheet",
       !!(shared && shared.files && shared.files.length === 1));
    ok("...named from the card, not the month",
       !!(shared && /^showup-926-days\.png$/.test(shared.files[0].name)),
       shared && shared.files && shared.files[0].name);

    // ---- 8. the consistency card (v3.3.74) -------------------------------
    calls = [];
    const ycv = run(`drawYoy(yearCurves())`);
    ok("the consistency card renders", !!ycv);
    ok("...square too", ycv && ycv.width === 1080 && ycv.height === 1080);
    const ytexts = calls.filter(c => c[0] === "fillText").map(c => String(c[1]));
    const yPct = run(`(function(){ const cs=yearCurves(), y=todayISO.slice(0,4);
      return cs[y]?Math.round(cs[y].curve[cs[y].end-1]*100)+'%':null; })()`);
    ok("this year's percentage is the headline", yPct !== null && ytexts[0] === yPct, ytexts[0]);
    // v3.3.75: the labels ARE the legend
    const yFonts = calls.filter(c => c[0] === "set:font").map(c => String(c[1]));
    ok("the headline stepped down from 132 to 96", yFonts.some(f => /96px/.test(f)) && !yFonts.some(f => /132px/.test(f)));
    const yYears = run(`Object.keys(yearCurves()).filter(y=>y>='2022').sort().length`);
    ok("the legend row is gone", !ytexts.some(t => /^\d{4} \d+%$/.test(t)));
    const tickYears = ytexts.filter(t => /^'\d\d$/.test(t));
    ok("each past year is labelled at its line end", tickYears.length === Number(yYears) - 1,
       `${tickYears.length}/${Number(yYears)-1}`);
    const curLabel = run(`todayISO.slice(0,4)`) + " \u00b7 " + yPct;
    ok("this year carries 'YYYY \u00b7 NN%' at its endpoint",
       ytexts.some(t => t === curLabel), curLabel);
    // collision nudge: no two past labels closer than the line height
    const labelYs = calls.filter(c => c[0] === "fillText" && /^'\d\d$/.test(String(c[1])))
                         .map(c => c[3]).sort((a, b) => a - b);
    let clash = false;
    for (let i = 1; i < labelYs.length; i++) if (labelYs[i] - labelYs[i-1] < 34 - 1e-6) clash = true;
    ok("...and endpoint labels never overlap", !clash, labelYs.map(v=>Math.round(v)).join(","));
    // this year draws LAST so it sits on top of the greys
    const widths = calls.filter(c => c[0] === "set:lineWidth").map(c => c[1]).filter(v => v >= 3);
    ok("the current year is the boldest line and drawn last",
       widths.length >= 2 && widths[widths.length - 1] === Math.max(...widths),
       widths.join(","));
    // v3.3.148: inverted — the URL left every card in v3.3.133; the date
    // stamp stands where it stood. This line was unreachable until today.
    ok("no URL on this card either", !ytexts.some(t => t.includes("tahros.github.io/showup")));
    ok("...the date stamp stands in its corner", ytexts.includes(run(`todayISO`)));
    // the caption moved behind the dot
    run(`view='stats'; renderStats();`);
    const yoyHtml = run(`$('#view').innerHTML`);
    ok("the chart explains itself behind an i", /data-tip="yoy2"/.test(yoyHtml));
    ok("...and the loose caption is gone",
       !/cumulative through each year/.test(yoyHtml));
    // v3.3.148: the per-section button died in v3.3.130 — the carousel is the door
    ok("...and no per-section share button returned", !/id="yoyShare"/.test(yoyHtml));
    const yoyTip = (fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")
      .match(/(?:iBtn|hActs)\('yoy2',["']([^"']*)["']/) || [])[1] || "";
    ok("...tip within one breath", yoyTip.length > 0 && yoyTip.length <= 120, yoyTip.length + " chars");

    // ---- 8b. the in-app legend behaves on a phone (v3.3.75) --------------
    const utilSrc = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
    /* v3.3.109 revises both v3.3.75 assertions rather than deleting them.
       The legend used to scroll sideways, which earned it two exceptions: a
       tab-swipe block and a scroll-park at the right edge so the current
       year stayed visible. It WRAPS now, so every year is on screen at all
       times \u2014 the parking had been the workaround for the scroller hiding
       the current year, which is precisely the bug it failed to prevent.
       The surviving invariant is that those two exceptions exist for, and
       only for, things that actually scroll sideways. */
    const statsSrc75 = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
    const legendCss = (fs.readFileSync(path.join(dir, "css/app.css"), "utf8")
      .match(/\.legend1\{[^}]*\}/) || [""])[0];
    ok("the legend wraps rather than scrolling sideways",
       /flex-wrap:wrap/.test(legendCss) && !/overflow-x:auto/.test(legendCss), legendCss);
    ok("...so it no longer claims a tab-swipe exception",
       !/closest\('\.legend1'\)/.test(utilSrc));
    ok("...and no longer needs scroll-parking to reveal the current year",
       !/\.heatcols,\.heat,\.legend1/.test(statsSrc75));
    ok("the retired heatmap no longer needs scroll parking",
       !/'\.heatcols,\.heat'/.test(statsSrc75));
    const cssSrc = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
    ok("legend chips cannot be crushed by flex (flex:0 0 auto on the chip)",
       /\.legend1 \[data-yr\]\{[^}]*flex:0 0 auto/.test(cssSrc));

    // ---- 8c. v3.3.89: ONE painter, two charts --------------------------
    // The consistency card must be UNCHANGED by the generalisation. Its
    // axis is still percent, its headline still percent.
    calls = [];
    run(`drawYoy(yearCurves())`);
    const cTexts = calls.filter(c => c[0] === "fillText").map(c => String(c[1]));
    ok("consistency card kept its percent axis after generalisation",
       cTexts.includes("0%") && cTexts.includes("100%"));
    ok("...and its percent headline", /^\d+%$/.test(cTexts[0]), cTexts[0]);
    ok("...and its own kicker", cTexts.includes("CONSISTENCY, YEAR OVER YEAR"));

    // seed runs across two years so the distance card has something to draw
    run(`(function(){ const y=+todayISO.slice(0,4);
      const add=(iso,km)=>{ (DB.days[iso]=DB.days[iso]||{w:[]}).w.push(
        {part:'Run',ex:'Run',w:km,reps:[],mins:30,secs:0}); DB.days[iso].upd=1; };
      for(let i=1;i<=8;i++) add((y-1)+'-0'+i+'-05', 5);
      add(y+'-01-10',6); add(y+'-02-10',7); add(y+'-03-10',8);
      SEED=deriveAll(); })()`);
    calls = [];
    const rcv = run(`drawYoy(runYearCurves(),{yMax:100,ticks:[0,25,50,75,100],
      fmtAxis:v=>String(Math.round(v)),fmtBig:v=>String(Math.round(v)),
      kicker:'DISTANCE, YEAR OVER YEAR',sub:'km in '+thisYear,
      footer:'cumulative km by day of year'})`);
    ok("the distance card renders at 1080\u00d71080", !!rcv && rcv.width === 1080 && rcv.height === 1080);
    const rTexts = calls.filter(c => c[0] === "fillText").map(c => String(c[1]));
    ok("...with a plain-number axis, no percent signs",
       rTexts.includes("0") && rTexts.includes("100") && !rTexts.some(t => /^\d+%$/.test(t)));
    ok("...its own kicker", rTexts.includes("DISTANCE, YEAR OVER YEAR"));
    ok("...and a distance footer", rTexts.some(t => /cumulative km/.test(t)));

    // one source of arithmetic: the SVG and the card both read runYearCurves()
    const liftSrc = fs.readFileSync(path.join(dir, "js/lift.js"), "utf8");
    const repSrc2 = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
    ok("the run SVG reads runYearCurves()", /const RC=runYearCurves\(\)/.test(liftSrc));
    ok("...and so does the share card (not a second cumulative loop)",
       /runYearCurves\(\)/.test(repSrc2));
    ok("...and only ONE drawYoy exists", (repSrc2.match(/function drawYoy/g) || []).length === 1);

    // the button, and the chips' absence
    run(`view='stats'; renderStats();`);
    ok("the run chart offers no per-section share button (carousel only)",
       !/id="runShare"/.test(run(`$('#view').innerHTML`)));
    ok("the jump chips are gone from Stats (v3.3.89)",
       !/data-jump=/.test(run(`$('#view').innerHTML`)));
    ok("...while the attendance heading remains and Report moves to History",
       /id="secDays"/.test(run(`$('#view').innerHTML`)) &&
       !/id="secReport"/.test(run(`$('#view').innerHTML`)));
    run(`view='history'; render();`);
    ok("History owns the one report surface", /id="secReport"/.test(run(`$('#view').innerHTML`)));

    // ---- 8d. v3.3.92: 2025's line moved to chart grade -------------------
    const statsSrc92 = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
    ok("YEAR_COLORS keeps stable identity with 2025 on --chart-soft",
       /'2025':'var\(--chart-soft\)'/.test(statsSrc92) &&
       /'2026':'var\(--accent\)'/.test(statsSrc92));
    ok("...and --chart-soft is defined in both themes",
       (fs.readFileSync(path.join(dir, "css/app.css"), "utf8").match(/--chart-soft:#/g) || []).length === 2);

    // ---- 10. v3.3.272: the thousand-day poster ---------------------------
    // The monument is the streak: a 50x20 wall of EXACTLY one thousand
    // 16px cells, one per calendar day ending today, gaps left honest. The
    // fixture misses three days deep in the span, so the trained/gap split
    // discriminates: 997 accent cells, 3 whispered ones.
    run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
      for(let i=0;i<1000;i++){ if([412,413,700].includes(i)) continue;
        const d=new Date(t); d.setDate(d.getDate()-i);
        DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1};}
      SEED=deriveAll();})()`);
    /* the drawers resolve var(--x) through getComputedStyle, which jsdom
       cannot cascade from stylesheets — pin the dark palette inline, exactly
       as a browser would resolve it, so fills are classifiable and pixels
       are the real colours. */
    run(`(function(){const st=document.documentElement.style;
      st.setProperty('--ground','#070A0E'); st.setProperty('--accent','#4C6BE3');
      st.setProperty('--chalk','#FAFBFD'); st.setProperty('--muted','#BEC7D5');})()`);
    run(`(function(){
      window.__rec=[];
      const orig=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(...a){
        const c=orig.apply(this,a);
        if(c&&!c.__wrapped){ c.__wrapped=true;
          const fr=c.fillRect.bind(c), ft=c.fillText.bind(c);
          c.fillRect=(...r)=>{__rec.push(['rect',r[2],r[3],String(c.fillStyle)]);return fr(...r);};
          c.fillText=(...r)=>{__rec.push(['text',String(r[0])]);return ft(...r);};}
        return c;};
      window.__poster=drawMilestone(1000);
      HTMLCanvasElement.prototype.getContext=orig;})()`);
    const cells = run(`__rec.filter(r=>r[0]==='rect'&&r[1]===16&&r[2]===16).length`);
    ok("the wall holds exactly one thousand cells", cells === 1000, cells+" cells");
    ok("...997 in the accent, 3 honest gaps in chalk whisper",
       run(`__rec.filter(r=>r[0]==='rect'&&r[1]===16&&r[2]===16&&r[3]==='#4C6BE3').length`) === 997 &&
       run(`__rec.filter(r=>r[0]==='rect'&&r[1]===16&&r[2]===16&&r[3]==='#FAFBFD').length`) === 3);
    /* pixel-level effects (numeral colour, ground, the gap whisper) live in
       tools/test-poster.js on a REAL canvas — this suite's recording proxy
       has no getImageData, so asserting pixels here would assert nothing. */
    ok("the poster says its five words and its name",
       run(`JSON.stringify(__rec.filter(r=>r[0]==='text').map(r=>r[1]))`).includes('SHOW/UP') &&
       run(`__rec.some(r=>r[0]==='text'&&r[1]==='one cell \u00b7 one day')`) &&
       run(`__rec.some(r=>r[0]==='text'&&r[1]==='1,000')`));
    ok("...and states the span as dates",
       run(`__rec.some(r=>r[0]==='text'&&/^\\d{4}\\.\\d{2}\\.\\d{2} \\u2014 \\d{4}\\.\\d{2}\\.\\d{2}$/.test(r[1]))`));

    // regular milestones keep the card they had
    run(`__rec=[]; (function(){const orig=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(...a){const c=orig.apply(this,a);
        if(c&&!c.__w2){c.__w2=true;const ft=c.fillText.bind(c);
          c.fillText=(...r)=>{__rec.push(String(r[0]));return ft(...r);};}return c;};
      drawMilestone(900); HTMLCanvasElement.prototype.getContext=orig;})()`);
    ok("day 900 still gets the original milestone card", run(`__rec.includes('DAY')`) &&
       !run(`__rec.includes('one cell \u00b7 one day')`));

    // ---- 9. the v3.3.58 lesson, enforced at the source -------------------
    const repSrc = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
    ok("report.js router no longer uses e.target.id===", !/e\.target\.id===/.test(repSrc));
    ok("...it asks closest() instead", /closest\('#'\+id\)/.test(repSrc));

    process.exit(fail ? 1 : 0);
  });
});
