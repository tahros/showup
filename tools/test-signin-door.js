// test-signin-door.js DIR — v4.6.384.
// 1. Google always shows its account chooser (prompt=select_account), on the web and in the iOS app.
// 2. Signing in from the blue first-run door to an account with history closes the door.
//    An account with no history still goes on to the setup steps.
// 3. Stats "Every part" counts a week as well as a month and a year.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
let cloudRows = [];
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = async (u, o) => {
  u = String(u);
  if (u.includes("/rest/v1/app_state") && !(o && o.method)) return { ok: true, status: 200, json: async () => cloudRows };
  return { ok: true, status: 200, json: async () => ({}) };
};
w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);
let fail = 0;
const check = (name, got, want) => { const ok = String(got) === String(want); console.log((ok ? "PASS" : "FAIL"), name, "→", got); if (!ok) fail++; };

(async () => {
  await new Promise(r => setTimeout(r, 300));
  const core = fs.readFileSync(path.join(dir, "js/core.js"), "utf8");
  check("Google is asked for its account chooser", run(`GOOGLE_PROMPT`), "select_account");
  check("...on the web sign-in link", /provider:'google', redirect_to:back, apikey:anon, prompt:GOOGLE_PROMPT/.test(core), true);
  check("...and on the iOS app's sign-in link", /code_challenge_method:'s256',apikey:anon,prompt:GOOGLE_PROMPT/.test(core), true);

  const door = `DB.days={};delete DB.settings.onboarded;delete DB.settings.demo;SEED=deriveAll();onbStep=1;onbRender();`;
  const signIn = `(async()=>{session={access_token:'t',refresh_token:'r',expires_at:Date.now()+3600e3,user:{email:'a@b'}};localStorage.setItem(SKEY,'x');pullUnion=true;await cloudPull();})()`;
  run(door);
  check("the door is open before sign-in", run(`!document.getElementById('onb').hidden`), true);
  cloudRows = [{ doc: { days: { "2026-10-01": { w: [{ part: "Chest", ex: "Bench Press", w: 80, reps: [8] }], upd: 1 } }, settings: {} }, updated_at: "x" }];
  await run(signIn);
  check("an account with history: its days arrive", run(`!!DB.days['2026-10-01']`), true);
  check("...the app counts as set up", !!run(`DB.settings.onboarded`), true);
  check("...and the door closes over nothing", run(`document.getElementById('onb').hidden`), true);
  check("...Today is what shows", run(`view`), "today");

  run(door); cloudRows = [];
  await run(signIn);
  check("an account with no history goes on to the setup steps", run(`!document.getElementById('onb').hidden&&onbStep`), "you");

  run(door);
  check("an open first run is left alone while not set up", run(`maybeOnboard();!document.getElementById('onb').hidden`), true);

  run(`todayISO='2026-10-22'`);   // a Thursday
  run(`DB.settings.weekStart='sunday'`);
  check("a Sunday week starts on Sunday", run(`psFrom('w')`), "2026-10-18");
  run(`DB.settings.weekStart='monday'`);
  check("a Monday week starts on Monday", run(`psFrom('w')`), "2026-10-19");
  check("month and year are unchanged", run(`psFrom('m')+' '+psFrom('y')`), "2026-10-01 2026-01-01");
  run(`DB.settings.partShelf={p:'w',m:'s'};DB.settings.weekStart='sunday'`);
  check("the week is a remembered choice", run(`psState().p`), "w");
  const card = run(`(()=>{const d=document.createElement('div');d.innerHTML=psBody();return d;})()`);
  check("the period reads Week · Month · Year", [...card.querySelectorAll('[data-ps="p"]')].map(b => b.textContent).join(" · "), "Week · Month · Year");
  check("...and the caption names the week's dates", card.querySelector(".ps-cap").textContent, "Sets · Oct 18 – 22");
  check("a part's sheet says this week", run(`psPer('w')`), "this week");
  console.log(fail ? `\n${fail} FAILED` : "\nall passed");
  process.exit(fail ? 1 : 0);
})();
