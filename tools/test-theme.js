// test-theme.js DIR — v3.3.96: System / Light / Dark.
// Three preferences, two themes. The traps this guards are (a) writing
// 'system' into the pre-paint localStorage key, (b) resolving once at boot
// and never following the OS again, and (c) breaking older settings blobs.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage96";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };

// a controllable OS preference
let osLight = false;
const listeners = [];
w.matchMedia = (q) => ({
  media: q,
  get matches(){ return /light/.test(q) ? osLight : !osLight; },
  addEventListener: (_, fn) => listeners.push(fn),
  removeEventListener: () => {},
  addListener: (fn) => listeners.push(fn),
});
const osFlip = (toLight) => { osLight = toLight; listeners.forEach(fn => fn({ matches: toLight })); };

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};
const applied = () => w.document.documentElement.dataset.theme;
const stored  = () => { try { return w.localStorage.getItem("showup-theme"); } catch(e){ return null; } };
const metaTC  = () => (w.document.querySelector('meta[name="theme-color"]') || {}).getAttribute
  ? w.document.querySelector('meta[name="theme-color"]').getAttribute("content") : null;

// ---- explicit preferences win over the OS ---------------------------------
osLight = true;
run(`DB.settings.theme='dark'; applyTheme();`);
ok("explicit dark stays dark even when the OS is light", applied() === "dark", applied());
run(`DB.settings.theme='light'; applyTheme();`);
osFlip(false);
ok("explicit light stays light even when the OS is dark", applied() === "light", applied());

// ---- system follows the OS -------------------------------------------------
run(`DB.settings.theme='system'; applyTheme();`);
ok("system + dark OS resolves dark", applied() === "dark", applied());
osFlip(true);
ok("system follows a LIVE flip to light without a reload", applied() === "light", applied());
osFlip(false);
ok("...and back to dark", applied() === "dark", applied());

// an explicit preference must ignore the same flip
run(`DB.settings.theme='light'; applyTheme();`);
osFlip(false);
ok("an explicit preference ignores OS flips", applied() === "light", applied());

// ---- the anti-flash contract ----------------------------------------------
run(`DB.settings.theme='system'; applyTheme();`);
ok("the pre-paint key never holds 'system'", stored() !== "system", stored());
ok("...it holds a resolved theme", stored() === "dark" || stored() === "light", stored());
osFlip(true);
ok("...and tracks the resolution after a flip", stored() === "light", stored());
// index.html's boot line must keep reading that key with a dark fallback
ok("index.html still paints from the resolved key before scripts run",
   /localStorage\.getItem\('showup-theme'\)\s*\|\|\s*'dark'/.test(html));

// ---- the status bar follows too -------------------------------------------
ok("theme-color matches light ground when light", metaTC() === "#F2F3F6", metaTC());
osFlip(false);
ok("...and dark ground when dark", metaTC() === "#0C0E13", metaTC());

// ---- back-compat: older blobs behave exactly as before --------------------
for (const legacy of ["dark", undefined, null, "", "weird"]) {
  run(`DB.settings.theme=${JSON.stringify(legacy) === undefined ? "undefined" : JSON.stringify(legacy)}; applyTheme();`);
  ok(`legacy theme ${JSON.stringify(legacy)} still resolves dark`, applied() === "dark", applied());
}

// ---- the control ----------------------------------------------------------
// NB: the settings screen's view name is 'sync' (historical). Setting
// view='settings' renders fine via renderSync() but makes the click
// handler's render() throw on an unknown view — which is exactly how this
// was found.
run(`DB.settings.theme='system'; view='sync'; renderSync();`);
const sv = () => run(`$('#view').innerHTML`);
ok("three choices are offered", (sv().match(/data-thm=/g) || []).length === 3);
ok("...System is selected when the preference is system",
   /data-thm="system" class="sel"/.test(sv()));
run(`document.querySelector('[data-thm="light"]').click();`);
ok("tapping Light sets the preference", run(`DB.settings.theme`) === "light");
ok("...applies it", applied() === "light", applied());
ok("...and re-renders with Light selected", /data-thm="light" class="sel"/.test(sv()));
run(`document.querySelector('[data-thm="system"]').click();`);
ok("tapping System hands control back to the OS", run(`DB.settings.theme`) === "system");
osFlip(true);
ok("...and the OS is obeyed again immediately", applied() === "light", applied());

// a legacy 'dark' blob must light the Dark segment, not leave all three blank
run(`DB.settings.theme='dark'; renderSync();`);
ok("a legacy dark preference lights the Dark segment",
   /data-thm="dark" class="sel"/.test(sv()));

// ---- new installs default to system ---------------------------------------
const coreSrc = fs.readFileSync(path.join(dir, "js/core.js"), "utf8");
ok("a fresh install seeds theme:'system'", /settings:\{theme:'system'/.test(coreSrc));

process.exit(fail ? 1 : 0);
