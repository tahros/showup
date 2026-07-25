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
ok("the HTML grid reads gridData() too (arithmetic not duplicated)",
   /const _gd=gridData\(\)/.test(statsSrc));

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
ok("...labelled as days", texts.includes("days"));
ok("...before anything else on the card", texts.indexOf(total) === 0);
ok("the app is named", texts.includes("ShowUp"));
ok("the URL is on the card", texts.some(t => t.includes("tahros.github.io/showup")));

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
ok("the grid and the card share one alpha rule (not two)",
   /mgAlpha\(n,gd\.max,k===gd\.mNow\)/.test(fs.readFileSync(path.join(dir,"js/report.js"),"utf8")) &&
   /mgAlpha\(n,gMax,k===mNow\)/.test(statsSrc));

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
ok("stats offers the share button", /id="gridShare"/.test(run(`$('#view').innerHTML`)));
// the paragraph under the grid moved behind the dot (DESIGN.md D1)
const gridHtml = run(`$('#view').innerHTML`);
ok("the grid explains itself behind an i", /data-tip="mgrid"/.test(gridHtml));
ok("...and no paragraph is left under it", !/the whole history on one screen/.test(gridHtml));
const mgTip = (fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")
  .match(/iBtn\('mgrid',"([^"]*)"/) || [])[1] || "";
ok("...within the app's one-breath range", mgTip.length > 0 && mgTip.length <= 120,
   mgTip.length + " chars");
run(`$('#view').querySelector('#gridShare').click();`);
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
    ok("the URL is on this card too", ytexts.some(t => t.includes("tahros.github.io/showup")));
    // the caption moved behind the dot
    run(`view='stats'; renderStats();`);
    const yoyHtml = run(`$('#view').innerHTML`);
    ok("the chart explains itself behind an i", /data-tip="yoy"/.test(yoyHtml));
    ok("...and the loose caption is gone",
       !/cumulative through each year/.test(yoyHtml));
    ok("...with a share button in its place", /id="yoyShare"/.test(yoyHtml));
    const yoyTip = (fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")
      .match(/iBtn\('yoy',"([^"]*)"/) || [])[1] || "";
    ok("...tip within one breath", yoyTip.length > 0 && yoyTip.length <= 120, yoyTip.length + " chars");

    // ---- 8b. the in-app legend behaves on a phone (v3.3.75) --------------
    const utilSrc = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
    ok("the legend owns its horizontal gesture (no tab-swipe hijack)",
       /closest\('\.legend1'\)/.test(utilSrc));
    ok("stats parks the legend at its right edge so this year is on screen",
       /'\.heatcols,\.heat,\.legend1'/.test(fs.readFileSync(path.join(dir, "js/stats.js"), "utf8")));
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
    ok("the run chart offers a share button",
       /id="runShare"/.test(run(`$('#view').innerHTML`)));
    ok("the jump chips are gone from Stats (v3.3.89)",
       !/data-jump=/.test(run(`$('#view').innerHTML`)));
    ok("...while the section headings they indexed remain",
       /id="secDays"/.test(run(`$('#view').innerHTML`)) &&
       /id="secRecords"/.test(run(`$('#view').innerHTML`)));

    // ---- 9. the v3.3.58 lesson, enforced at the source -------------------
    const repSrc = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
    ok("report.js router no longer uses e.target.id===", !/e\.target\.id===/.test(repSrc));
    ok("...it asks closest() instead", /closest\('#'\+id\)/.test(repSrc));

    process.exit(fail ? 1 : 0);
  });
});
