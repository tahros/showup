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
check("all 16 sets counted in the footer", texts.some(c => String(c[1]) === "16" && c[2] > 850), true);

// ---- height is computed, not capped: HEAD 232 + 7×160 + FOOT 100
const H = run("window._cv.height");
check("canvas height = content (232+7*160+100)", H, 232 + 7*160 + 100);

// ---- the footer owns the last line: no text at or below its baseline
const footY = H - 64;
const below = texts.filter(c => typeof c[3] === "number" && c[3] > footY).length;
check("nothing drawn below the footer baseline", below, 0);
const groupTextMaxY = Math.max(...texts.filter(c => typeof c[3] === "number" && c[3] < footY).map(c => c[3]));
check("footer clears the last group by ≥ 38px", footY - groupTextMaxY >= 38, true);

// ---- v3.3.172: identity is icon + name at the TOP-LEFT; no wordmark text
const nameCall = texts.find(c => String(c[1]) === "SUNGJEE");
check("name drawn top-left (above the date)", !!nameCall && nameCall[3] < 120 && nameCall[2] < 200, true);
check("the SHOWUP wordmark text is gone", has("SHOWUP"), false);

// ---- the Swiss grid holds — asserted as positions
// chip column: the FIRST chip of every group starts at CHIP+18 (=318),
// regardless of how wide the weight beside it is ("0" and "45" alike)
const repXs = texts.filter(c => /^\d+$/.test(String(c[1])) && c[2] > 250).map(c => c[2]);
check("7 groups each open their chips on the guide", repXs.filter(xv => xv === 318).length >= 7, true);
check("no chip starts left of the guide", repXs.filter(xv => xv < 318).length, 0);
// counts: right-FLUSH at the margin (v3.3.171's left-aligned column reverted,
// judged by use) — every per-block count sits at R (=1008)
const countXs = texts.filter(c => /sets?$/.test(String(c[1])) && String(c[1]) !== "sets").map(c => c[2]);
check("all block counts flush right at the margin", countXs.every(xv => xv === 1008) && countXs.length >= 7, true);
// footer: bold NUMBER + quiet unit word, both right-flush
const footSets = texts.find(c => String(c[1]) === "sets");
const footNum = texts.find(c => String(c[1]) === "16" && c[2] > 850);
check("footer unit word flush at the margin", !!footSets && footSets[2] === 1008, true);
check("footer total drawn as its own bold run", !!footNum, true);
const fonts = calls.filter(c => c[0] === "set:font").map(c => String(c[1]));
const numIdx = calls.findIndex(c => c[0] === "fillText" && String(c[1]) === "16" && c[2] > 850);
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
