// test-settings.js DIR — the "bodyweight disappears at random" bug.
// Covers both defects: the forged push timestamp, and settings edits that
// never bumped settingsAt because their call site forgot save(true).
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage44";

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
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

// ---- the stamp maintains itself, whatever the call site does
run(`DB.settings.bodyKg=75; DB.settingsAt=0; _setSig='force-mismatch'; save();`);
check("bare save() after a settings edit stamps it", `DB.settingsAt>0`, true);

run(`DB.settingsAt=1000; _setSig=settingsSig(); save();`);
check("save() with NO settings change leaves the stamp alone", `DB.settingsAt`, 1000);

run(`DB.settingsAt=1000; _setSig=settingsSig(); DB.settings.lastCloud=Date.now(); save();`);
check("a sync touching lastCloud is not an edit", `DB.settingsAt`, 1000);

run(`DB.settingsAt=1000; _setSig=settingsSig(); DB.settings.custom={Foo:{part:'Chest'}}; save();`);
check("custom exercises stamp too (bare save call site)", `DB.settingsAt>1000`, true);

// ---- the exact clobber: a stale context must not outrank a real edit
run(`DB.settings.bodyKg=75; DB.settingsAt=5000; _setSig=settingsSig();`);
check("stale remote (no stamp) cannot overwrite",
      `adoptRemoteSettings({settings:{barKg:20,smithKg:20}, settingsAt:0})`, false);
check("...and bodyweight survives it", `DB.settings.bodyKg`, 75);

check("older remote cannot overwrite",
      `adoptRemoteSettings({settings:{bodyKg:null}, settingsAt:4999})`, false);
check("...bodyweight still survives", `DB.settings.bodyKg`, 75);

check("genuinely newer remote IS adopted",
      `adoptRemoteSettings({settings:{bodyKg:80}, settingsAt:6000})`, true);
check("...and the value updates", `DB.settings.bodyKg`, 80);
check("...taking the remote stamp, not a fresh one", `DB.settingsAt`, 6000);

// adopting must not then re-stamp as a local edit — that would make this
// device falsely outrank the one the settings actually came from
run(`save();`);
check("adopting is not a local edit", `DB.settingsAt`, 6000);

// ---- keys the remote doesn't carry are preserved, not dropped
run(`DB.settings.bodyKg=75; DB.settings.kmGoal=1200; DB.settingsAt=5000; _setSig=settingsSig();
     adoptRemoteSettings({settings:{bodyKg:82}, settingsAt:9000});`);
check("local-only keys survive an adopt", `DB.settings.kmGoal`, 1200);
check("remote keys win on an adopt",      `DB.settings.bodyKg`, 82);

// ---- the push must never forge a timestamp
const src = fs.readFileSync(path.join(dir, "js/core.js"), "utf8");
const forged = /settingsAt:\s*DB\.settingsAt\s*\|\|\s*Date\.now\(\)/.test(src);
console.log((forged?"FAIL":"PASS"), "push does not forge a settings timestamp →", !forged);
if (forged) fail++;

process.exit(fail ? 1 : 0);
