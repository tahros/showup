// test-stats-intent-gaps.js DIR — retirement guard for "Stated, not trained".
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
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename:s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles:true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log(ok ? "PASS" : "FAIL", name, "→", got);
  if (!ok) fail++;
};

(async () => {
  await new Promise(r => setTimeout(r, 80));
  run(`(function(){
    DB.days={[todayISO]:{w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:1}],upd:1}};
    SEED=deriveAll(); view='stats'; render();
  })()`);

  check("Stated, not trained is absent from Stats",
    `!/Stated, not trained/i.test(document.querySelector('#view').textContent)`, true);
  check("its list and controls are not rendered",
    `!document.querySelector('.igcard,.igrow,[data-igretire]')`, true);
  check("its calculation and threshold are gone",
    `typeof intentGaps==='undefined'&&typeof intentGapCard==='undefined'&&typeof INTENT_GAP_DAYS==='undefined'`, true);

  run(`view='sync'; render();`);
  check("Settings has no restore controls for the retired section",
    `!document.querySelector('[data-igback]')&&!/Hidden from.*Stated, not trained/i.test(document.querySelector('#view').textContent)`, true);

  const stats = fs.readFileSync(path.join(dir, "js/stats.js"), "utf8");
  const settings = fs.readFileSync(path.join(dir, "js/settings.js"), "utf8");
  const css = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  check("dead feature code and styles are removed",
    `${![stats,settings,css].some(src=>/INTENT_GAP_DAYS|intentGapCard|data-igretire|data-igback|\.igrows|\.igrow\b/.test(src))}`, true);

  process.exit(fail ? 1 : 0);
})();
