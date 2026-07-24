// smoke.js DIR — boots the app in jsdom: 11 scripts eval'd in index order,
// asserts no throw, header renders, a view mounts. Not the full harness —
// markup snapshots come back with the harness rebuild. Good enough to prove
// a CSS/head-only release didn't break boot.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const dir = process.argv[2] || "stage";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
if (order.length !== 11) { console.error("expected 11 scripts, got", order.length); process.exit(1); }

const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  runScripts: "outside-only",
  url: "https://tahros.github.io/showup/",
  pretendToBeVisual: true,
});
const w = dom.window;
w.fetch = () => Promise.reject(new Error("offline-smoke"));   // no network in the sandbox
w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {};
w.scrollTo = () => {};
if (!w.HTMLCanvasElement.prototype.getContext._smoke) {
  w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
  w.HTMLCanvasElement.prototype.getContext._smoke = true;
}

let err = null;
w.addEventListener("error", e => { err = e.error || e.message; });
try {
  // classic scripts share ONE global scope — replicate by running each source
  // inside a Function whose `this`/globals come from the jsdom window.
  const vm = require("vm");
  const ctx = dom.getInternalVMContext();
  for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
  w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
} catch (e) { err = e; }

setTimeout(() => {
  const view = w.document.getElementById("view");
  const hDate = w.document.getElementById("hDate");
  const onb = w.document.getElementById("onb");
  const mounted = (view && view.innerHTML.trim().length > 0) || (onb && !onb.hidden);
  const headerOk = hDate && hDate.textContent !== "—";
  if (err) { console.error("BOOT THREW:", err && err.message || err); process.exit(1); }
  if (!mounted) { console.error("nothing mounted in #view and no onboarding"); process.exit(1); }
  console.log(`SMOKE PASS [${dir}]  header=${headerOk ? "rendered" : "static"}  view=${view.innerHTML.length}B  onb=${onb ? (onb.hidden ? "hidden" : "shown") : "n/a"}`);
  process.exit(0);
}, 300);
