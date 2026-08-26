// test-skin.js DIR — v3.3.168 Minimal, the default skin.
// The skin rides the theme rail: resolved in applyTheme(), pre-painted from
// localStorage, toggled by a seg in Settings. These assert the EFFECTS —
// the html attribute, the stored resolved value, the settings stamp — never
// the CSS artifact (jsdom cannot resolve the vars anyway).
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
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
(async () => {
// boot's load() is async (awaits the storage adapter) — the attribute lands
// a tick after the dispatch, so the test waits for the app, not vice versa
await new Promise(r => setTimeout(r, 80));
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

// ---- the default: a device that has never heard of skins wakes up Minimal
check("fresh DB boots into minimal", `document.documentElement.dataset.skin`, "minimal");
check("resolved skin persisted for the pre-paint", `localStorage.getItem('showup-skin')`, "minimal");
check("the theme attribute co-exists untouched", `!!document.documentElement.dataset.theme`, true);

// ---- resolution: absence and nonsense both mean minimal; only the exact
//      opt-out string means classic (the theme's unrecognised→dark shape)
run(`DB.settings.skin='neon'; applyTheme();`);
check("unrecognised value resolves minimal", `document.documentElement.dataset.skin`, "minimal");
run(`delete DB.settings.skin; applyTheme();`);
check("absent value resolves minimal", `document.documentElement.dataset.skin`, "minimal");
run(`DB.settings.skin='classic'; applyTheme();`);
check("'classic' is the one opt-out", `document.documentElement.dataset.skin`, "classic");
check("...and persists resolved", `localStorage.getItem('showup-skin')`, "classic");
run(`delete DB.settings.skin; applyTheme();`);

// ---- the Settings seg: both options render, Minimal selected by default
run(`renderSync();`);
check("settings offers Minimal", `!!document.querySelector('[data-skn="minimal"]')`, true);
check("settings offers Classic", `!!document.querySelector('[data-skn="classic"]')`, true);
check("Minimal is selected by default", `document.querySelector('[data-skn="minimal"]').classList.contains('sel')`, true);

// ---- the toggle: one tap opts out, effect + record + stamp all land
run(`DB.settingsAt=0; _setSig=settingsSig(); document.querySelector('[data-skn="classic"]').click();`);
check("tap Classic flips the attribute", `document.documentElement.dataset.skin`, "classic");
check("...records the choice", `DB.settings.skin`, "classic");
check("...persists for the pre-paint", `localStorage.getItem('showup-skin')`, "classic");
check("...and stamps settingsAt so the choice syncs", `DB.settingsAt>0`, true);

// ---- and back — the round trip is exact
run(`renderSync(); document.querySelector('[data-skn="minimal"]').click();`);
check("tap Minimal returns", `document.documentElement.dataset.skin`, "minimal");
check("...recorded", `DB.settings.skin`, "minimal");
check("...persisted", `localStorage.getItem('showup-skin')`, "minimal");


/* v3.3.331: the skin has to CHANGE THE SCREEN, on every screen.
   The maker put two screenshots side by side -- Minimal and Classic -- and
   the only difference on the Train tab was the nav pill. The toggle was
   never broken; every assertion above passed the whole time. It was
   COVERAGE: the skin restyled .card/.zone/.lastcard/.day/.kpi, written for a
   Today-tab mockup, while the Train tab is built from .partcard and
   .item.logrow, which the skin had never heard of.

   The first version of this guard checked whether the skin MENTIONED each
   class, and it false-passed on the very bug it was written for -- a state
   rule like `.partcard.hot{border-color:...}` was enough to count. Mentions
   are an artifact. So this measures the EFFECT: take the app's real rendered
   markup, put it in a document with the real stylesheet, and compare
   computed geometry with data-skin=minimal against data-skin=classic. A
   surface the skin does not move is a surface the maker cannot see a skin on.

   HONEST LIMIT, stated rather than hidden: the skin's colour work is carried
   by var() tokens that jsdom does not resolve, so border-color and
   box-shadow read identical in both skins here and cannot be tested. This
   guard sees GEOMETRY only -- radius and padding. It would miss a
   colour-only skin rule. It catches the bug that actually happened. */
{
  const cssS = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  const bare = cssS.replace(/\/\*[\s\S]*?\*\//g, "");
  /* by SELECTOR, not by class name. Keying on the first class conflated
     `.btn.ghost` (an outlined surface the skin restyles) with a plain `.btn`
     (a solid accent button the skin has nothing to say about), and the guard
     failed the button for not changing. The unit is the rule's own subject. */
  const surface = new Set();
  for (const m of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (sel.includes("data-skin") || sel.includes("data-design-preview")) continue;
    if (sel.includes("::") || sel.includes(":hover") || sel.includes("@")) continue;
    if (!/border:[^;}]*(px|var)|background:var\(--surface\)/.test(body)) continue;
    for (const one of sel.split(",")) {
      const t = one.trim();
      if (t && /^[.#a-zA-Z][^{}]*$/.test(t) && !t.includes(":not(")) surface.add(t);
    }
  }

  /* the suite already imported JSDOM at the top; reuse it */
  const skinSubjects = [];
  for (const m of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (!sel.includes('data-skin="minimal"')) continue;
    if (!/border|box-shadow|background|padding|radius/.test(body)) continue;
    for (const one of sel.split(",")) {
      const t = one.trim().replace(/:root\[data-skin="minimal"\]\s*/, "").trim();
      if (t && !t.includes("::")) skinSubjects.push(t || "*");
    }
  }
  const flat = new Set();
  for (const v of ["today", "lift", "stats"]) {
    run(`view='${v}'; lift.ex=null; render();`);
    const html = run(`document.getElementById('app').innerHTML`);
    const probe = new JSDOM(
      `<html data-theme="light"><head><style>${cssS}</style></head>` +
      `<body><div id="app">${html}</div></body></html>`);
    const pw = probe.window, root = pw.document.documentElement;
    const geo = el => {
      const c = pw.getComputedStyle(el);
      return [c.borderRadius, c.paddingTop, c.paddingLeft, c.marginBottom].join("|");
    };
    const els = [], why = new Map();
    for (const sel of surface) {
      let hit = [];
      try { hit = [...pw.document.querySelectorAll(`#app ${sel}`)]; } catch (e) { continue; }
      for (const e of hit) if (!why.has(e)) { why.set(e, sel); els.push(e); }
    }
    root.dataset.skin = "minimal";
    const mini = els.map(geo);
    root.dataset.skin = "classic";
    const clas = els.map(geo);
    /* geometry is not the whole skin: several rules are colour-only (.btn.ghost
       swaps background and border-colour and moves nothing), and those are
       invisible here because var() does not resolve. So an element passes if
       its BOX moved OR a skin rule actually MATCHES it -- matching is weaker
       evidence, but "no skin rule matches this element at all" is exactly the
       bug that shipped, and it is what this catches. */
    els.forEach((e, i) => {
      if (mini[i] !== clas[i]) return;
      const covered = skinSubjects.some(sel => { try { return e.matches(sel); } catch (x) { return false; } });
      if (!covered) flat.add(`${v}: ${why.get(e)}`);
    });
    pw.close();
  }
  const blind = [...flat].sort();
  const okc = blind.length === 0;
  console.log((okc ? "PASS" : "FAIL"),
    "every surface the app renders looks different under the skin",
    "\u2192", okc ? "all move" : blind.join(", "));
  if (!okc) fail++;
}

process.exit(fail ? 1 : 0);
})();
