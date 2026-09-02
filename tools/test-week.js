// test-week.js DIR — v3.3.398. THE WEEK: A DOCUMENT, NOT A SCHEDULE.
// Six blocks of the maker's own paste format under day headings. Asserted:
// the parser on his real week; today's plan IS the week's block for today;
// a day written alone replaces only its block; a week ends and does not
// roll; nothing is ever counted against it; the record never learns of it;
// the cards, the pills, the edge, fold and expand, copy text that round-trips.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only",
  pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

/* dates are built from TODAY so this suite is green on any day of any month
   (the v3.3.393 lesson: four fixtures were only correct on certain dates) */
const iso = n => run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()+${n}); return d.toLocaleDateString('en-CA');})()`);
const head = (n, title) => run(`pretty(${JSON.stringify(iso(n))})`) + (title ? " — " + title : "");
// the maker's week, verbatim in shape, re-dated to start yesterday
const WEEK = [
  head(-1,"Shoulder + Core"), "", "Dumbbell Shoulder Press", "  35 lb × 10 8", "  55 lb × 10 10 8 8", "",
  "Lateral Raise", "  40 lb × 10 10 10 10", "  25 lb × 15 15          (drop set)", "",
  "Hanging Leg Raise", "  BW × 12 10 10", "",
  head(0,"Back + Biceps"), "", "Deadlift", "  135 lb × 5", "  215 lb × 5 5 5 5", "",
  "Bent-Over Row", "  175 lb × 10 10 8 8", "", "Pull Up", "  BW +10 × 8 8 6 6", "",
  "Lat Pulldown", "  by feel × 12 12 10 10", "", "EZ Bar Curl", "  50 lb × 10 10 10", "",
  head(1,"Chest A (incline) + Core"), "", "Incline Barbell Bench Press", "  95 lb × 10", "  145 lb × 12 12 12 12", "",
  "Cable Fly Up", "  25 lb × 12 10 10", "",
  head(2,"Legs + Core"), "", "Squat", "  135 lb × 8", "  205 lb × 8 8 8 8", "", "Romanian Deadlift", "  165 lb × 10 10 10", "",
].join("\n");

/* a ledger with a past, so Today is Today and not Day One */
run(`(function(){DB.days={}; DB.plan=null; DB.week=null; DB.suggest=null; delete DB.settings.dayDone;
  for(let i=1;i<=12;i++){ const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:['Chest','Back','Legs'][i%3],ex:['Barbell Bench Press','Deadlift','Squat'][i%3],w:60,reps:[8,8,8],at:1}],upd:1}; }
  DB.settings.unit='lb'; DB.settings.onboarded=true; SEED=deriveAll(); view='today'; lift.planScope='today'; lift.weekOpen=null; render();})()`);

/* ---- the parser, on his format ---- */
const wk = run(`(function(){const w=parseWeek(${JSON.stringify(WEEK)}); return JSON.stringify({from:w.from,to:w.to,
  days:Object.fromEntries(Object.entries(w.days).map(([k,v])=>[k,{title:v.title,n:v.items.length,ex:v.items.map(i=>i.ex)}]))});})()`);
const W = JSON.parse(wk);
ok("four day headings become four dated blocks", Object.keys(W.days).length===4, wk.slice(0,120));
ok("...dated from the heading, nearest today", W.from===iso(-1) && W.to===iso(2), `${W.from} → ${W.to}`);
ok("...each carrying its title", W.days[iso(0)].title==="Back + Biceps", W.days[iso(0)].title);
ok("...and every exercise of the maker's Tuesday", W.days[iso(0)].n===5 && W.days[iso(0)].ex.includes("Pull Up"), W.days[iso(0)].ex.join(", "));
ok("a set line that happens to start with a month name is not a heading",
   run(`parseWeek("Mar 5 x 5 5\\n")===null`));
ok("no headings at all is not a week", run(`parseWeek("Deadlift\\n  215 lb x 5 5")===null`));

/* ---- today's plan IS the week's block for today ---- */
run(`weekSave(parseWeek(${JSON.stringify(WEEK)})); lift.planScope='today'; render();`);
ok("with a week saved, planNow() is today's block", run(`(function(){const p=planNow(); return !!p&&p.fromWeek===true&&p.items.length===5;})()`));
ok("...fed to the Suggested rail like a paste", run(`Object.values(sugOv()).filter(o=>o&&o.from==='plan').length`)===5);
ok("...and Train next names its first exercise", /Deadlift/.test(run(`(document.querySelector('.tnextplan')||{}).textContent||''`)));
ok("the record is untouched", run(`Object.keys(DB.days).filter(d=>(DB.days[d].w||[]).length).length`)===12 && run(`!DB.days[todayISO]||!(DB.days[todayISO].w||[]).length`));
ok("the heading grows a week pill beside today", run(`document.querySelectorAll('h2 .scopepill[data-planscope]').length`)===2);

/* ---- the week scope ---- */
run(`document.querySelector('[data-planscope="week"]').click()`);
ok("tapping it shows one card per day", run(`document.querySelectorAll('.daycard').length`)===4);
ok("...today's open, the rest folded", run(`document.querySelectorAll('.daycard.open').length`)===1 && run(`document.querySelector('.daycard.open').classList.contains('today')`));
ok("...yesterday dimmed, never marked", run(`document.querySelector('.daycard.past')!==null`) &&
   !/missed|remaining|completed|\b\d+\s*(of|\/)\s*\d+\b/i.test(run(`document.querySelector('.weekstack').textContent`)));
ok("...the range line says where it runs", /→/.test(run(`document.querySelector('.rangeline').textContent`)) &&
   /4 SESSIONS/.test(run(`document.querySelector('.rangeline').textContent`)), run(`document.querySelector('.rangeline').textContent`));
ok("the edge is four glyphs: expand, copy, edit, clear",
   run(`(function(){const b=[...document.querySelectorAll('h2 .planedge .pedge')]; return b.length===4 && !!b[0].querySelector('.ic-expand')
     && !!b[1].querySelector('.ic-copy') && !!b[2].querySelector('.ic-edit') && !!b[3].querySelector('.ic-clear');})()`));
ok("...each with a name for the screen reader, since the word is gone",
   run(`[...document.querySelectorAll('h2 .planedge .pedge')].every(b=>b.getAttribute('aria-label'))`));
ok("every day heading carries the chevron, right when folded, down when open",
   run(`(function(){const f=[...document.querySelectorAll('.daycard:not(.open) .ic-chevron')], o=document.querySelector('.daycard.open .ic-chevron');
     return f.length===3 && f.every(s=>!/rotate/.test(s.getAttribute('style')||'')) && /rotate\\(90deg\\)/.test(o.getAttribute('style'));})()`));
run(`document.querySelector('[data-weekall="open"]').click()`);
ok("expand all opens every day", run(`document.querySelectorAll('.daycard.open').length`)===4);
ok("...and the edge now offers collapse", run(`!!document.querySelector('[data-weekall="fold"] .ic-collapse')`));
run(`document.querySelector('[data-weekall="fold"]').click()`);
ok("fold all closes every day", run(`document.querySelectorAll('.daycard.open').length`)===0);
run(`document.querySelector('.daycard.past [data-weekday]').click()`);
ok("a day heading opens that day alone", run(`document.querySelectorAll('.daycard.open').length`)===1 && run(`document.querySelector('.daycard.open').classList.contains('past')`));
ok("a day that is not today has no ticks and no spend", run(`document.querySelectorAll('.daycard.open .pdone, .daycard.open .rspent').length`)===0);

/* ---- copy text round-trips ---- */
const txt = run(`weekToText(weekNow())`);
ok("Copy hands back the maker's format with the day headings", txt.split("\n").filter(l=>/—/.test(l)).length===4, txt.split("\n")[0]);
ok("...and reading it again gives the same week",
   run(`(function(){const a=weekNow(), b=parseWeek(weekToText(a));
     return Object.keys(a.days).join()===Object.keys(b.days).join() && Object.keys(a.days).every(k=>a.days[k].items.length===b.days[k].items.length);})()`));

/* ---- a day written alone replaces only its block ---- */
run(`planSave([{ex:'Chin Up',lines:[{w:0,bw:true,reps:[8,8]}]}],'','', todayISO); lift.planScope='today'; render();`);
ok("a plan pasted for today wins over the week's block", run(`(function(){const p=planNow(); return p.items.length===1&&p.items[0].ex==='Chin Up'&&!p.fromWeek;})()`));
ok("...and the week's block for today now says the same", run(`DB.week.days[todayISO].items[0].ex`)==='Chin Up');
ok("...while the other days are untouched", run(`DB.week.days[${JSON.stringify(iso(1))}].items.length`)===2);
run(`document.querySelector('[data-planclear]').click()`);
ok("Clear on today clears today's block too, so the card cannot come straight back", run(`planNow()===null`) && run(`!DB.week.days[todayISO]`));
ok("...but the week survives with its other days", run(`!!weekNow() && Object.keys(DB.week.days).length`)===3);

/* ---- a week ends and does not roll ---- */
run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()+3); todayISO=d.toLocaleDateString('en-CA'); render();})()`);
ok("the day after its last day, the week is over", run(`weekNow()===null`) && run(`planNow()===null`));
ok("...the pill is gone", run(`document.querySelectorAll('h2 .scopepill[data-planscope]').length`)===1);
ok("...and the scope fell back to today by itself", run(`lift.planScope`)==='today');
run(`todayISO=new Date().toLocaleDateString('en-CA')`);

/* ---- the week never logs itself ---- */
const src = fs.readFileSync(path.join(dir,"js/util.js"),"utf8");
const ws = src.slice(src.indexOf("function weekSave("), src.indexOf("\nfunction ", src.indexOf("function weekSave(")+10));
ok("weekSave never touches the record", !/DB\.days/.test(ws));
ok("...and no reader of the record knows the week exists",
   ["js/derive.js","js/report.js","js/stats.js"].every(f=>!/DB\.week/.test(fs.readFileSync(path.join(dir,f),"utf8"))));

/* ---- edit: the paste screen reads a week back into days ---- */
run(`(function(){DB.week=null; weekSave(parseWeek(${JSON.stringify(WEEK)})); lift.planScope='week'; render();
  document.querySelector('[data-weekedit]').click();})()`);
ok("Edit opens the paste screen with the whole week", /Edit the week/.test(run(`document.querySelector('#view h2').textContent`)) &&
   run(`document.getElementById('planText').value.split('\\n').length`)>20);
run(`document.querySelector('[data-planread]').click()`);
ok("Read it previews the week as days with their exercises",
   run(`document.querySelectorAll('.planpv.day').length`)===4 && run(`document.querySelectorAll('.planpv.ok').length`)===12);
run(`document.querySelector('[data-plandrop]').click()`);
run(`document.querySelector('[data-planaccept]').click()`);
ok("...and Use this week keeps what the preview shows, minus the dropped line",
   run(`(function(){const w=weekNow(); return Object.keys(w.days).length===4 && Object.values(w.days).reduce((a,d)=>a+d.items.length,0)===11;})()`));
ok("...landing on the week scope", run(`lift.planScope`)==='week' && run(`document.querySelectorAll('.daycard').length`)===4);
run(`document.querySelector('[data-weekclear]').click()`);
ok("Clear the week clears it whole and returns to today", run(`DB.week===null`) && run(`lift.planScope`)==='today');

process.exit(fail ? 1 : 0);
