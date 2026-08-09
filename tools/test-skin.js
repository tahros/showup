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

process.exit(fail ? 1 : 0);
})();
