/* demo-tabtrip.js — drive the REAL UI through the maker's three taps and read
 * the rendered DOM at each one.
 *
 * WHY THIS EXISTS. v3.3.507 claimed to fix "coming back from Train loses the
 * week you were reading" and did not, and the reason is the shape of the test
 * rather than the code: it set `view='today'` and called render() directly, so
 * it never went through the nav handler -- which is the only way into Train on
 * a phone, and which had a third wholesale `lift=` assignment the fix missed.
 * A test that drives state instead of controls will agree with any bug that
 * lives in a control.
 *
 * So this walks the buttons: tap WEEK, tap the Train tab, tap the Today tab,
 * and print what is ON SCREEN after each -- which scope pill is selected, is
 * the week stack rendered, which days are open. Run it with a version argument
 * to see the same trip on an older build:
 *     node tools/demo-tabtrip.js .
 */
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""),
  { url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = q => ({ matches: /no-preference/.test(String(q)), media: String(q),
  addEventListener() {}, removeEventListener() {} });
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({ measureText: () => ({ width: 10 }) }, { get: (o, k) => k in o ? o[k] : () => ({}) });
};
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

/* a real ledger and a real week plan */
run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  for(let i=1;i<=20;i++){const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8,8],at:1}],upd:1};}
  DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:97,reps:[8,8,8],at:1}],upd:1};
  SEED=deriveAll(); view='today'; render();})()`);
const iso = n => run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()+${n}); return d.toLocaleDateString('en-CA');})()`);
const head = (n, t) => run(`pretty(${JSON.stringify(iso(n))})`) + " — " + t;
const WEEK = [
  head(0, "Back"), "", "Deadlift", "  215 lb × 8 8 8 8", "",
  head(1, "Chest"), "", "Incline Barbell Bench Press", "  155 lb × 10 10 9 8", "",
  head(2, "Legs"), "", "Squat", "  205 lb × 8 8 8", ""
].join("\n");
run(`weekSave(parseWeek(${JSON.stringify(WEEK)}))`);
run(`view='today'; lift.planScope='today'; lift.weekOpen=null; render();`);

/* ---- what the SCREEN says, never what the variables say ---- */
const screen = () => run(`(function(){
  const on=[...document.querySelectorAll('h2 .scopepill[data-planscope]')].find(b=>!b.classList.contains('off'));
  const days=[...document.querySelectorAll('.daycard')];
  return JSON.stringify({
    tab:(document.querySelector('nav button.on')||{}).getAttribute?.('aria-label'),
    pill:on?on.dataset.planscope:'(none)',
    weekstack:!!document.querySelector('.weekstack'),
    dayrows:days.length,
    open:days.filter(d=>d.classList.contains('open'))
             .map(d=>(d.querySelector('.dn')||{}).textContent||'?')
  });})()`);
const tap = sel => run(`(function(){const el=document.querySelector(${JSON.stringify(sel)});
  if(!el) throw new Error('no control: ' + ${JSON.stringify(sel)});
  el.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));})()`);

const show = (label) => console.log(String(label).padEnd(34) + screen());

console.log("version " + (html.match(/core\.js\?v=([\d.]+)/) || [])[1] + "\n");
show("0. Today tab, day scope");
tap('.scopepill[data-planscope="week"]');
show("1. tapped WEEK");
tap('.daycard:not(.open) [data-weekday]');
show("   opened a day");
const before = screen();
tap('nav button[data-v="lift"]');
show("2. tapped the Train tab");
tap('nav button[data-v="today"]');
show("3. tapped back to Today");
const after = screen();

const b = JSON.parse(before), a = JSON.parse(after);
const same = b.pill === a.pill && b.weekstack === a.weekstack &&
             JSON.stringify(b.open) === JSON.stringify(a.open);
console.log("\n" + (same
  ? "PASS the screen came back the way he left it"
  : "FAIL the screen changed under him\n  left:  " + before + "\n  found: " + after));
process.exit(same ? 0 : 1);
