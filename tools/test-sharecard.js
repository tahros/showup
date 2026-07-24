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

    // ---- 8. the v3.3.58 lesson, enforced at the source -------------------
    const repSrc = fs.readFileSync(path.join(dir, "js/report.js"), "utf8");
    ok("report.js router no longer uses e.target.id===", !/e\.target\.id===/.test(repSrc));
    ok("...it asks closest() instead", /closest\('#'\+id\)/.test(repSrc));

    process.exit(fail ? 1 : 0);
  });
});
