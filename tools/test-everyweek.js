// test-everyweek.js DIR — v3.3.132: the Strava-minimal restyle.
//
// The whole point was subtraction, so the assertions are mostly about what is
// NO LONGER there: a number on every bar, a label on every week. The risk in
// a "make it minimal" change is that you delete the wrong thing — the current
// week's readout, or the month anchoring that lets you place a bar in time.
// So this checks that exactly one bar keeps its number and the month names
// land where months actually turn.
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

// runs across three calendar months, so month boundaries actually occur and
// the current week has a distinct value from the rest
run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
  for(let i=0;i<120;i++){
    const d=new Date(t); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    DB.days[iso]={w:[{part:'Run',ex:'Run',w:(i<7?9:4),reps:[],mins:28,secs:0,at:1}],upd:1};
  }
  SEED=deriveAll(); view='stats'; render();})()`);

// find the Every week chart's svg
const svgTexts = run(`(function(){
  const el=[...document.querySelectorAll('#view h2')].find(h=>h.textContent.indexOf('Every week')===0);
  if(!el) return '[]';
  let n=el.nextElementSibling, svg=n?n.querySelector('svg'):null;
  if(!svg) return '[]';
  return JSON.stringify([...svg.querySelectorAll('text')].map(t=>t.textContent.trim()));})()`);
const T = JSON.parse(svgTexts);
ok("the Every week chart renders", T.length > 0, T.length + " text nodes");

// month names present, and they are month abbreviations, not week numbers
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const monthLabels = T.filter(t => MONTHS.includes(t));
ok("month names appear as axis labels", monthLabels.length >= 2, monthLabels.join(" "));
ok("...and they are unique — one per month, not one per week",
   new Set(monthLabels).size === monthLabels.length, monthLabels.join(" "));

// the old surface is gone: no bare week-number labels, no number on every bar.
// The legitimate numbers on this chart are the peak (axis top), 0 (axis base),
// and this week's value on its bar — everything else being a week number is
// the regression. So exclude those three and expect nothing left.
const peakV = run(`(function(){
  const wkBy={}; for(const r of runDays()) wkBy[weekOf(r.d)]=(wkBy[weekOf(r.d)]||0)+toD(r.km);
  return Math.round(Math.max(...Object.values(wkBy),1));})()`);
const thisWkV = run(`(function(){
  const wkBy={}; for(const r of runDays()) wkBy[weekOf(r.d)]=(wkBy[weekOf(r.d)]||0)+toD(r.km);
  return Math.round(wkBy[weekOf(todayISO)]||0);})()`);
const legit = new Set(["0", String(peakV), String(thisWkV)]);
const strayNums = T.filter(t => /^\d{1,2}$/.test(t) && !legit.has(t) && !MONTHS.includes(t));
ok("no stray per-week numbers survive", strayNums.length === 0,
   strayNums.join(",") || "none (peak " + peakV + ", this week " + thisWkV + " are legit)");

// exactly one BAR value label. The axis has "0" and the peak; the avg line
// has "avg N". The only bold accent number is this week's — count bars vs
// the numeric labels that are not axis/avg furniture.
const bars = run(`(function(){
  const el=[...document.querySelectorAll('#view h2')].find(h=>h.textContent.indexOf('Every week')===0);
  const svg=el.nextElementSibling.querySelector('svg');
  return svg.querySelectorAll('rect.gbar').length;})()`);
const boldAccent = run(`(function(){
  const el=[...document.querySelectorAll('#view h2')].find(h=>h.textContent.indexOf('Every week')===0);
  const svg=el.nextElementSibling.querySelector('svg');
  return [...svg.querySelectorAll('text')].filter(t=>t.getAttribute('font-weight')==='700').length;})()`);
ok("there are many bars", bars >= 10, bars + " bars");
ok("but exactly ONE bar carries a value label", boldAccent === 1, boldAccent + " bold labels");

// the y-axis is 0 and peak only — not a 5-rung ladder
const wkMax = run(`(function(){
  const wkBy={}; for(const r of runDays()) wkBy[weekOf(r.d)]=(wkBy[weekOf(r.d)]||0)+toD(r.km);
  return Math.round(Math.max(...Object.values(wkBy),1));})()`);
ok("the peak value labels the top of the axis", T.includes(String(wkMax)), "peak " + wkMax);
ok("...and 0 labels the base", T.includes("0"));

// the average line survives — it is the one thing kept against Strava
ok("the average line keeps its label", T.some(t => /^avg \d/.test(t)), T.find(t=>/^avg/.test(t)));

// the footer still states this week and the running average
const footer = run(`(function(){
  const el=[...document.querySelectorAll('#view h2')].find(h=>h.textContent.indexOf('Every week')===0);
  const tot=el.nextElementSibling.querySelector('.tot');
  return tot?tot.textContent:'';})()`);
ok("the footer names this week", /this week/.test(footer), footer.slice(0,60));
ok("...and the 16-week average", /16-week avg/.test(footer));

// weekNum() was removed with its last caller
ok("the orphaned weekNum helper is gone",
   !/const weekNum=/.test(fs.readFileSync(path.join(dir, "js/lift.js"), "utf8")));

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
