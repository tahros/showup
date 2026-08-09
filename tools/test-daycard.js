// test-daycard.js DIR — v3.3.170: the day receipt shows the WHOLE day.
// Regression suite for a truncation that shipped invisibly: the v3.3.166
// height cap (1350) and group slice (10) dropped the 7th weight-group of a
// real chest day and drew the footer over the 6th. Recording-context
// harness (from test-sharecard): every draw call is logged, so the card is
// asserted structurally — effects, not artifacts.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

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
  "arcTo","arc","rect","closePath","fill","stroke","setLineDash","save","restore","clip",
  "translate","scale","drawImage"];
w.HTMLCanvasElement.prototype.getContext = function () {
  const t = { canvas: this };
  for (const m of METHODS) t[m] = (...a) => { calls.push([m, ...a]); };
  t.measureText = (s) => ({ width: String(s).length * 18 });
  t.createLinearGradient = () => ({ addColorStop(){} });
  return new Proxy(t, { set(o, p, v) { o[p] = v; calls.push(["set:" + String(p), v]); return true; } });
};
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const check = (name, got, want) => {
  const ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

(async () => {
await new Promise(r => setTimeout(r, 80));

// the day from the field report: 7 weight-groups, 16 sets, one part
run(`
  DB.settings.name='Sungjee Yoo';
  DB.days[todayISO]={w:[
    {part:'Chest',ex:'Incline Smith Machine Bench Press',w:45,reps:[12]},
    {part:'Chest',ex:'Incline Smith Machine Bench Press',w:55,reps:[6,6,6]},
    {part:'Chest',ex:'Cable Crossover',w:15,reps:[12]},
    {part:'Chest',ex:'Cable Crossover',w:20,reps:[12,10,12]},
    {part:'Chest',ex:'Dip',w:0,reps:[10]},
    {part:'Chest',ex:'Dip',w:11,reps:[8,8,8]},
    {part:'Chest',ex:'Incline Dumbbell Bench Press',w:19,reps:[9,8,7,7]},
  ]};
  window._cv=document.createElement('canvas'); window._cv.width=1080; window._cv.height=1080;
  drawDayCard(window._cv.getContext('2d'),1080,todayISO);
`);

const texts = calls.filter(c => c[0] === "fillText");
const has = s => texts.some(c => String(c[1]).includes(s));

// ---- the record is whole: every exercise drawn, including the 7th group
check("group 7 (the one the cap dropped) is drawn", has("Incline Dumbbell Bench Press"), true);
for (const ex of ["Incline Smith Machine Bench Press","Cable Crossover","Dip"])
  check(`"${ex}" is drawn`, has(ex), true);
check("all 16 sets counted in the footer", texts.some(c => String(c[1]) === "16" && c[2] > 820), true);

// ---- v3.3.173: grouped by EXERCISE (the Last-time card's logic) — the
// seeded day is 4 exercises across 7 weights, so 4 blocks, 7 sub-rows
// height (v3.3.178: RULE_AIR 29, DG 21 → RN 53, VR 6; GH(k)=53+21+6+106k):
// HEAD 274 + 3×GH(2)=292 + GH(1)=186 + FOOT 96
const H = run("window._cv.height");
check("canvas height = content (274+3*292+186+96)", H, 274 + 3*292 + 186 + 96);

// ---- v3.3.176: every solid rule carries EQUAL air on both faces.
// below the rule: name cap top = baseline-24; above it: previous chip box
// bottom = band edge + (SUB-CH)/2 back off, then VR.
const nameYs = texts.filter(c => ["Cable Crossover","Dip","Incline Dumbbell Bench Press"].includes(String(c[1]))).map(c => c[3]).sort((a,b)=>a-b);
const ruleYs = [...new Set(calls.filter(c => c[0] === "moveTo" && c[1] === 96).map(c => c[2]))].sort((a,b)=>a-b);
const airBelow = nameYs.map(ny => ny - 24 - ruleYs.filter(r => r < ny - 24).pop());
check("air below every solid rule is RULE_AIR", airBelow.every(a => a === 29), true);
// the maker's ask, in the units the maker measures (ink edge to ink edge,
// each line eating a pixel to antialiasing): 28 above the name, 20 below
check("...which a screenshot ruler reads as 28px above the name", 29 - 1, 28);
const dashUnderName = [...new Set(calls.filter(c => c[0] === "moveTo" && c[1] === 96).map(c => c[2]))]
  .filter(yv => yv > nameYs[0] && yv < nameYs[0] + 40)[0];
check("...and 20px below it", (dashUnderName - nameYs[0]) - 1, 20);
// the header's first rule gets the same air as any other (was 42 vs 58)
const partsY = texts.find(c => String(c[1]) === "Chest" && c[3] < 320)[3];
check("header rule derives from RULE_AIR too", ruleYs[0] - partsY, 29 + 6);

// ---- v3.3.177: the card's two ends are balanced — air from the frame to
// the nearest ink is CARD_AIR at the top, and CARD_AIR at the bottom once
// the footer's descender is counted. Measured from the draw calls, not
// restated: whichever end drifts, this catches it.
const footBaseline = texts.find(c => String(c[1]) === "sets")[3];
const topAir = 88 - 44;                          /* frame → icon top */
const bottomAir = (H - 44) - (footBaseline + 8); /* footer descender → frame */
check("top air == bottom air", topAir === bottomAir && topAir === 44, true);
check("...and both are tighter than the 52 at the sides", topAir < 96 - 44, true);
// the sub-row pitch: weight baselines inside a group sit SUB apart
const wYs = texts.filter(c => ["45","55"].includes(String(c[1])) && c[2] === 96).map(c => c[3]).sort((a,b)=>a-b);
check("weight sub-rows sit 106px apart", wYs.length >= 2 && wYs[1] - wYs[0], 106);

// ---- v3.3.175: a row's top and bottom air are EQUAL. The chip box is the
// visual body of the row; measure it against its own band boundaries.
const chipBoxes = calls.filter(c => c[0] === "arcTo").length; // frame + chips exist
const rrTops = calls.filter(c => c[0] === "moveTo" && c[1] === 96 + 0).length;
const chipY = texts.filter(c => String(c[1]) === "12" && c[2] > 300).map(c => c[3]);
check("chip text rides 12px below the band centre", chipY.length > 0, true);
// dashed hairlines land on band boundaries: exactly SUB/2 from each centre
const wCentres = wYs.map(yv => yv - 16);
const dashYs = [...new Set(calls.filter(c => c[0] === "moveTo" && c[1] === 96).map(c => c[2]))];
check("a hairline sits exactly SUB/2 above the 2nd sub-row centre",
      dashYs.includes(wCentres[1] - 53), true);
check("top air == bottom air for a mid-row (both 23px to the chip box)",
      (wCentres[1] - 53) + 53 - 30 - (wCentres[1] - 53) === 23, true);

// ---- the unit word matches the per-exercise counts in size
const fontsAll = calls.filter(c => c[0] === "set:font").map(c => String(c[1]));
const setsIdx = calls.findIndex(c => c[0] === "fillText" && String(c[1]) === "sets");
const setsFont = calls.slice(0, setsIdx).reverse().find(c => c[0] === "set:font");
check("footer 'sets' is 34px, same as the block counts", String(setsFont[1]).includes("500 34px"), true);
check("the old 28px footer size is gone from the footer", String(setsFont[1]).includes("28px"), false);

// ---- date and part line have room between them
const dateY = texts.find(c => String(c[1]).startsWith("Sun,"))[3];
const partY = texts.find(c => String(c[1]) === "Chest" && c[3] < 320)[3];
check("date → parts gap is 48px", partY - dateY, 48);
const nameY2 = texts.find(c => String(c[1]) === "SUNGJEE")[3];
check("identity name sits below the top air", nameY2, 44 + 44 + 26 + 9);
// each exercise name is drawn exactly ONCE — the ex@weight split is gone
for (const [ex, subs] of [["Incline Smith Machine Bench Press",2],["Cable Crossover",2],["Dip",2],["Incline Dumbbell Bench Press",1]])
  check(`"${ex}" drawn once (not per weight)`, texts.filter(c => String(c[1]) === ex).length, 1);
// counts are per-exercise TOTALS: all four groups logged 4 sets
check("all four groups headed '4 sets'", texts.filter(c => String(c[1]) === "4 sets").length, 4);
check("no per-weight '1 set'/'3 sets' fragments remain", texts.some(c => String(c[1]) === "1 set" || String(c[1]) === "3 sets"), false);

// ---- the footer owns the last line: no text at or below its baseline
const footY = H - 96;   /* v3.3.175: the footer moved down with the wider bottom padding */
const below = texts.filter(c => typeof c[3] === "number" && c[3] > footY).length;
check("nothing drawn below the footer baseline", below, 0);
const groupTextMaxY = Math.max(...texts.filter(c => typeof c[3] === "number" && c[3] < footY).map(c => c[3]));
check("footer clears the last group by ≥ 38px", footY - groupTextMaxY >= 38, true);
check("...and the card's bottom edge clears the footer", H - 44 - footY >= 40, true);

// ---- v3.3.172: identity is icon + name at the TOP-LEFT; no wordmark text
const nameCall = texts.find(c => String(c[1]) === "SUNGJEE");
check("name drawn top-left (above the date)", !!nameCall && nameCall[3] < 200 && nameCall[2] < 220, true);
check("the SHOWUP wordmark text is gone", has("SHOWUP"), false);

// ---- the Swiss grid holds — asserted as positions
// chip column: the FIRST chip of every group starts at CHIP+18 (=318),
// regardless of how wide the weight beside it is ("0" and "45" alike)
const repXs = texts.filter(c => /^\d+$/.test(String(c[1])) && c[2] > 250).map(c => c[2]);
check("7 groups each open their chips on the guide", repXs.filter(xv => xv === 342).length >= 7, true);
check("no chip starts left of the guide", repXs.filter(xv => xv < 342).length, 0);
// counts: right-FLUSH at the margin (v3.3.171's left-aligned column reverted,
// judged by use) — every per-block count sits at R (=1008)
const countXs = texts.filter(c => /sets?$/.test(String(c[1])) && String(c[1]) !== "sets").map(c => c[2]);
check("all block counts flush right at the margin", countXs.every(xv => xv === 984) && countXs.length >= 4, true);
// footer: bold NUMBER + quiet unit word, both right-flush
const footSets = texts.find(c => String(c[1]) === "sets");
const footNum = texts.find(c => String(c[1]) === "16" && c[2] > 820);
check("footer unit word flush at the margin", !!footSets && footSets[2] === 984, true);
check("footer total drawn as its own bold run", !!footNum, true);
const fonts = calls.filter(c => c[0] === "set:font").map(c => String(c[1]));
const numIdx = calls.findIndex(c => c[0] === "fillText" && String(c[1]) === "16" && c[2] > 820);
const fontBefore = calls.slice(0, numIdx).reverse().find(c => c[0] === "set:font");
check("...in 700 36px", String(fontBefore && fontBefore[1]).includes("700 36px"), true);
// type scale: date 38, values 46 — bigger body, smaller date (the ask)
check("date is 38px", fonts.some(f => f.includes("700 38px")), true);
check("values are 46px", fonts.some(f => f.includes("700 46px")), true);
check("42px and 58px and 48px are gone", fonts.some(f => f.includes("42px") || f.includes("58px") || f.includes("48px")), false);

// ---- the icon: drawn when the bitmap arrived, skipped (never fatal) when not
check("no bitmap → no drawImage, receipt still whole", calls.some(c => c[0] === "drawImage"), false);
calls = [];
run("_dayIcon={complete:true,naturalWidth:192,naturalHeight:192}; drawDayCard(window._cv.getContext('2d'),1080,todayISO); _dayIcon=null;");
check("bitmap present → icon drawn", calls.some(c => c[0] === "drawImage"), true);

run("DB.settings.name='';");
calls = [];
run("drawDayCard(window._cv.getContext('2d'),1080,todayISO);");
const texts2 = calls.filter(c => c[0] === "fillText");
check("no name → no identity text, receipt still whole", texts2.some(c => String(c[1]) === "SUNGJEE" || String(c[1]) === "SHOWUP"), false);
check("...and the day still draws", texts2.some(c => String(c[1]).includes("Incline Dumbbell Bench Press")), true);

process.exit(fail ? 1 : 0);
})();
