/* demo-fixedchain.js — why the tab bar hangs, answered by walking the DOM
 * instead of reasoning about WebKit.
 *
 * The nav and the "top" button have hung together, mid-screen, across five
 * releases and two agents. Every fix so far was a hypothesis: v3.3.480 blamed
 * translateZ conflicting with a backdrop-filter, v3.3.495 blamed a scroll-time
 * belt, v3.3.497 blamed the blur itself. All three were wrong, and each cost a
 * round trip to the maker's phone.
 *
 * This walks it. For each piece of fixed chrome it climbs the ancestor chain
 * under every class the app can put on <body> and reports two things:
 *   - any ancestor property that makes an element a containing block for
 *     position:fixed descendants (transform, filter, backdrop-filter,
 *     perspective, contain, will-change of those, container-type) -- such an
 *     ancestor makes a fixed child scroll with the page, which is the symptom;
 *   - any compositing promotion on the fixed element ITSELF, because a
 *     promoted layer is the thing that can be painted at a stale position.
 *
 * It fails if either turns up. Run it: node tools/demo-fixedchain.js .
 */
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const dir = process.argv[2] || ".";
const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const dom = new JSDOM(fs.readFileSync(path.join(dir, "index.html"), "utf8")
  .replace(/<script[^>]*src=[^>]*><\/script>/g, "")
  .replace(/<link rel="stylesheet"[^>]*>/, "<style>" + css + "</style>"),
  { pretendToBeVisual: true });
const w = dom.window, d = w.document;

/* the top button is mounted on <body> at runtime, outside #app -- which is the
   fact that eliminated #app's overflow-x:clip as a shared cause */
const b = d.createElement("button"); b.className = "calreturn"; d.body.appendChild(b);

/* properties that make an ancestor a containing block for fixed descendants */
const CB = ["transform", "translate", "rotate", "scale", "filter", "backdropFilter",
            "webkitBackdropFilter", "perspective", "contain", "containerType"];
/* promotions on the element itself */
const PROMO = ["transform", "willChange", "backfaceVisibility", "webkitBackfaceVisibility"];
const live = v => v && !["none", "normal", "auto", "visible", ""].includes(String(v).trim());

const STATES = ["", "banding", "bandback", "pulling", "settling"];
const CHROME = ["nav", ".calreturn", "header"];
let fail = 0;

for (const state of STATES) {
  d.body.className = state;
  for (const sel of CHROME) {
    const el = d.querySelector(sel);
    if (!el) { console.log(`SKIP ${sel} (not present)`); continue; }
    const own = w.getComputedStyle(el);
    if (own.position !== "fixed") continue;

    const promo = PROMO.filter(p => live(own[p])).map(p => `${p}:${own[p]}`);
    if (promo.length) {
      console.log(`FAIL ${sel} [body.${state || "none"}] is promoted to its own layer → ${promo.join(" ")}`);
      fail = 1;
    }
    const bad = [];
    for (let n = el.parentElement; n; n = n.parentElement) {
      const c = w.getComputedStyle(n);
      const hits = CB.filter(p => live(c[p])).map(p => `${p}:${c[p]}`);
      /* will-change naming a containing-block property counts too */
      if (/transform|filter|perspective|contain/.test(c.willChange || "")) hits.push(`willChange:${c.willChange}`);
      if (hits.length) bad.push(`${n.tagName}${n.id ? "#" + n.id : ""} ${hits.join(" ")}`);
    }
    if (bad.length) {
      console.log(`FAIL ${sel} [body.${state || "none"}] anchors to an ancestor, not the viewport → ${bad.join(" | ")}`);
      fail = 1;
    }
    if (!promo.length && !bad.length)
      console.log(`PASS ${sel} [body.${state || "none"}] is a plain fixed element with a clean chain`);
  }
}
/* #app clips its overflow, which fixed descendants do NOT escape the way they
   escape overflow:hidden. It is an ancestor of nav and not of .calreturn, so it
   was never the shared cause -- but it is worth reporting, because if the nav
   alone still hangs it is the next thing to try. */
const app = w.getComputedStyle(d.getElementById("app"));
console.log(`NOTE #app overflow-x:${app.overflowX} — clips nav, does not reach .calreturn on <body>`);
process.exit(fail ? 1 : 0);
