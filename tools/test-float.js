/* test-float.js — the below-fold float, and why it could hide a whole section.
 *
 * WHY THIS FILE EXISTS (v3.3.496). motionPass marks below-fold blocks
 * `.float-pre`, which is `opacity:0` with its space still reserved, and an
 * IntersectionObserver takes the class off when the block scrolls in. If the
 * reveal never arrives, the block is invisible for good. The maker
 * photographed exactly that twice: "WHAT YOU TRAIN" and "BARS" headings
 * present, the cards under them gone, the gap where the cards should be still
 * there. h2 is not in the observed selector list, which is why the headings
 * survived and pointed at the mechanism.
 *
 * It had NEVER been under test. jsdom has no IntersectionObserver, so
 * `'IntersectionObserver' in window` was false in all sixty-five suites and
 * the entire block was skipped. The one harness that stubs IO stubs it for
 * History's calendar-return observer, not this one. So this file supplies both
 * an observer and real geometry, and asserts the EFFECT the maker cares about:
 * nothing that is on screen is ever left invisible.
 */
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) console.log("PASS " + name + (got !== undefined ? " → " + got : ""));
  else { console.log("FAIL " + name + (got !== undefined ? " → " + got : "")); fail = 1; }
};

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""),
  { url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
/* the motion path must be ON, or this file tests nothing (the lesson from
   v3.3.492: a stub that answers `matches:false` to every query turns
   MOTION_OK off and every motion assertion green-by-vacancy) */
w.matchMedia = q => ({ matches: /no-preference/.test(String(q)), media: String(q),
  addEventListener() {}, removeEventListener() {} });
w.navigator.vibrate = () => {};
w.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({ measureText: () => ({ width: 10 }) }, { get: (o, k) => k in o ? o[k] : () => ({}) });
};

/* ---- a viewport with real geometry ----
   jsdom returns zeros for getBoundingClientRect, which would make
   `rect.top > innerHeight` false for everything and quietly test nothing.
   Blocks are laid out at 300px intervals down a tall page, offset by the
   current scroll, so "below the fold" is a real question with a real answer. */
const VH = 800;
Object.defineProperty(w, "innerHeight", { value: VH, configurable: true });
let scrollY = 0;
Object.defineProperty(w, "scrollY", { get: () => scrollY, configurable: true });
w.scrollTo = (x, y) => { scrollY = y || 0; };
const docTop = new Map();          // element -> its y in the document
w.Element.prototype.getBoundingClientRect = function () {
  const top = (docTop.has(this) ? docTop.get(this) : 0) - scrollY;
  return { top, bottom: top + 120, left: 0, right: 380, width: 380, height: 120, x: 0, y: top };
};

/* ---- an IntersectionObserver we control ----
   Nothing fires by itself. Every test says explicitly whether the reveal
   arrived, which is the variable the real bug turns on. */
const observed = new Set();
let lastIO = null;
w.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; lastIO = this; }
  observe(el) { observed.add(el); }
  unobserve(el) { observed.delete(el); }
  disconnect() { observed.clear(); }
  fireFor(els) { this.cb(els.map(t => ({ target: t, isIntersecting: true }))); }
};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

ok("the harness has motion on, or this file proves nothing", run(`MOTION_OK`) === true);

/* lay out six cards down a long page and hand them to motionPass */
const build = () => {
  const v = w.document.getElementById("view");
  v.innerHTML = "";
  const made = [];
  for (let i = 0; i < 6; i++) {
    const h = w.document.createElement("h2"); h.textContent = "SECTION " + i;
    const c = w.document.createElement("div"); c.className = "card"; c.textContent = "body " + i;
    v.appendChild(h); v.appendChild(c);
    docTop.set(h, i * 300); docTop.set(c, i * 300 + 40);
    made.push(c);
  }
  return made;
};

// ---- 1. the effect still works: below-fold cards start hidden
let cards = build();
scrollY = 0;
run(`motionPass()`);
ok("cards below the fold start hidden",
   cards.filter(c => c.classList.contains("float-pre")).length > 0,
   cards.map(c => c.classList.contains("float-pre") ? "pre" : "-").join(","));
ok("...and cards on screen are never hidden",
   cards.every(c => docTop.get(c) - scrollY > VH || !c.classList.contains("float-pre")));
ok("...and the headings are untouched, which is why they survived on the device",
   [...w.document.querySelectorAll("#view h2")].every(h => !h.classList.contains("float-pre")));

// ---- 2. THE BUG: a rebuilt observer used to strand the old marks
cards = build();
scrollY = 0;
run(`motionPass()`);
const stranded = cards.find(c => c.classList.contains("float-pre"));
ok("(fixture) a card is hidden, pending reveal", !!stranded);
scrollY = 1400;                       // the reader scrolls it onto the screen
run(`motionPass()`);                  // ...and something re-renders before the observer fires
ok("a re-render never leaves a hidden card sitting on screen",
   !stranded.classList.contains("float-pre"),
   "top=" + (docTop.get(stranded) - scrollY) + " vh=" + VH +
   " cls=" + stranded.className);

// ---- 3. the observer simply never fires
cards = build();
scrollY = 0;
run(`motionPass()`);
const quiet = cards.find(c => c.classList.contains("float-pre"));
ok("(fixture) a card is hidden with no reveal on the way", !!quiet);
scrollY = 1400;
w.dispatchEvent(new w.Event("scroll"));
run(`(function(){ if(typeof floatSweep==='function') floatSweep(); })()`);
ok("a scroll reveals it even if the observer stays silent",
   !quiet.classList.contains("float-pre"), quiet.className);

// ---- 4. a zero-height target (a collapsed fold) cannot strand a section
cards = build();
scrollY = 0;
run(`motionPass()`);
const zero = cards.find(c => c.classList.contains("float-pre"));
docTop.set(zero, 100);                // the fold opens; the card is on screen now
run(`(function(){ if(typeof floatSweep==='function') floatSweep(); })()`);
ok("a block that becomes visible without ever intersecting is revealed",
   !zero.classList.contains("float-pre"), zero.className);

// ---- 5. the observer path still works when it does fire
cards = build();
scrollY = 0;
run(`motionPass()`);
const late = cards.find(c => c.classList.contains("float-pre"));
lastIO.fireFor([late]);
ok("the observer, when it fires, still reveals the block",
   late.classList.contains("float-in") && !late.classList.contains("float-pre"));

// ---- 6. paint measures the fold AFTER the scroll has landed
ok("paint scrolls before it measures the fold",
   /window\.scrollTo\(0,y\);\s*\n\s*if\(MOTION_OK && !inplace\)\{ try\{ motionPass\(\)/
     .test(fs.readFileSync(path.join(dir, "js/app.js"), "utf8")));

process.exit(fail ? 1 : 0);
