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
/* v3.3.404: copy and edit are outline icons now (maria icon / Alvida Black),
   so the edge must be four ICON_PATH glyphs and no hand-drawn stand-in */
/* v3.3.421 RESTATES: the week's edge is the SAME three as the day's -- copy,
   edit, Write. Expand-all left (every day row has its own chevron); Clear
   moved behind Edit; Write arrived, and from this door it REWRITES the week. */
ok("the edge is three glyphs: copy, edit, Write -- the same as the day's",
   run(`(function(){const b=[...document.querySelectorAll('h2 .planedge .pedge')]; return b.length===3
     && !!b[0].querySelector('.ic-copy') && !!b[1].querySelector('.ic-edit') && b[2].hasAttribute('data-planwrite')
     && b[2].getAttribute('data-planwrite')==='week';})()`));
ok("...each with a name for the screen reader, since the word is gone",
   run(`[...document.querySelectorAll('h2 .planedge .pedge')].every(b=>b.getAttribute('aria-label'))`));
ok("...and copy and edit are filled outlines, not strokes, so the edge is one family",
   run(`(function(){const c=document.querySelector('.ic-copy path'), e=document.querySelector('.ic-edit path');
     return !!c && !!e && c.getAttribute('fill')==='currentColor' && e.getAttribute('fill')==='currentColor'
       && c.getAttribute('fill-rule')==='evenodd' && e.getAttribute('fill-rule')==='evenodd'
       && !c.parentNode.getAttribute('stroke') && !e.parentNode.getAttribute('stroke');})()`));
ok("...their holes survive: each is one path of three subpaths",
   run(`(function(){const n=s=>(document.querySelector(s).getAttribute('d').match(/M/g)||[]).length;
     return n('.ic-copy path')===3 && n('.ic-edit path')===3;})()`),
   run(`(document.querySelector('.ic-edit path').getAttribute('d').match(/M/g)||[]).length+' subpaths in edit'`));
ok("every day heading carries the chevron, right when folded, down when open",
   run(`(function(){const f=[...document.querySelectorAll('.daycard:not(.open) .ic-chevron')], o=document.querySelector('.daycard.open .ic-chevron');
     return f.length===3 && f.every(s=>!/rotate/.test(s.getAttribute('style')||'')) && /rotate\\(90deg\\)/.test(o.getAttribute('style'));})()`));
/* v3.3.421 RESTATES: expand-all and fold-all left the header -- every day row
   carries its own chevron, and a header glyph that opened all four at once
   was a fifth control for a thing the rows already did. Opening each day by
   its own heading is the behaviour that remains. */
/* one click per render: each toggle re-renders, so the buttons must be found
   again each time rather than held from one query */
run(`(function(){let g; while((g=document.querySelector('.daycard:not(.open) [data-weekday]'))) g.click();})()`);
ok("every day opens by its own heading", run(`document.querySelectorAll('.daycard.open').length`)===4);
ok("...and there is no expand-all on the edge", run(`!document.querySelector('[data-weekall]')`));
run(`(function(){let g; while((g=document.querySelector('.daycard.open [data-weekday]'))) g.click();})()`);
ok("...and every day folds by its own heading", run(`document.querySelectorAll('.daycard.open').length`)===0);
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
/* v3.3.421: Clear is behind the Edit door; v3.3.448: two doors -- the pencil
   opens the preview, Cancel steps back to the box, Clear is there */
run(`document.querySelector('[data-planedit]').click()`);
run(`document.querySelector('[data-planback]').click()`);
run(`document.querySelector('.planacts [data-planclear]').click()`);
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
/* v3.3.421: the week's Clear is behind its Edit door too */
run(`document.querySelector('[data-weekedit]').click()`);
run(`document.querySelector('.planacts [data-weekclear]').click()`);
ok("Clear the week clears it whole and returns to today", run(`DB.week===null`) && run(`lift.planScope`)==='today');

/* v3.3.421: WRITE FROM THE WEEK REWRITES THE WEEK. Codex's v3.3.420 made a
   week write COMPLETE the week -- fill only the empty days, keep the saved
   ones locked. The maker asked for an override. Both survive without a
   toggle: the door you came through says which you meant. From the week's
   header, scope is week, every saved day is selected, rewrite is set and the
   payload carries no locked days. From a day, widening to the week inside
   the ask screen keeps the locks. */
{
  /* the preceding block cleared the week; seed the same fixture again */
  run(`weekSave(parseWeek(${JSON.stringify(WEEK)})); lift.planScope='week'; lift.plan=null; lift.write=null; lift.weekOpen=null; render();`);
  if(run(`!!weekNow()`)){
    const door = run(`(function(){const b=document.querySelector('h2 .planedge [data-planwrite]'); return b?b.getAttribute('data-planwrite'):null;})()`);
    ok("the week's Write door is marked as the week's", door==='week');
    run(`document.querySelector('h2 .planedge [data-planwrite]').click()`);
    ok("...and opens the ask screen in week scope with rewrite set",
       run(`lift.plan==='write' && writerState().scope==='week' && writerState().rewrite===true`));
    ok("...with every remaining saved day selected",
       run(`(function(){const o=writerState(); const want=Object.keys(weekNow().days).filter(d=>d>=todayISO); return want.length>0 && want.every(d=>o.days.has(d));})()`));
    ok("...the button says Rewrite", run(`/^Rewrite \\d+ session/.test(document.querySelector('[data-writego]').textContent.trim())`));
    ok("...the screen says what it replaces", run(`/Replaces the saved week/.test(document.getElementById('view').textContent)`));
    ok("...and the payload carries no locked days",
       run(`writerPayload(writerState()).locked_days.length===0`));
    /* the other door keeps Codex's behaviour */
    run(`(function(){lift.plan=null; lift.write=null; lift.planScope='today'; render();})()`);
    run(`document.querySelector('h2 .planedge [data-planwrite]').click()`);
    run(`(function(){const o=writerState(); o.scope='week'; writerDays(o);})()`);
    ok("from a day, widening to the week keeps the saved days locked (v3.3.420)",
       run(`(function(){const o=writerState(); return !o.rewrite && writerPayload(o).locked_days.length>0;})()`));
    run(`(function(){lift.plan=null; lift.write=null; render();})()`);
  } else {
    ok("(week door) the fixture has a week to test against", false, "weekNow() is null here");
  }
}

/* v3.3.422: THE DAY'S LABEL IS ITS PARTS. The writer's free title wrapped to
   two right-aligned lines on one day and was blank on the next. Derived from
   the exercises, every day says the same kind of thing, never blank, one
   line, middle dots. */
{
  run(`weekSave(parseWeek(${JSON.stringify(WEEK)})); lift.planScope='week'; lift.plan=null; lift.weekOpen=null; render();`);
  const labels = run(`JSON.stringify([...document.querySelectorAll('.dayhead .dtl')].map(e=>e.textContent))`);
  ok("every day head carries a label", JSON.parse(labels).every(t=>t.trim().length>0), labels);
  ok("...derived from the day's parts, joined by the middle dot",
     JSON.parse(labels).every(t=>/^[A-Z][a-z]+( · [A-Z][a-z]+)*$/.test(t)), labels);
  ok("...never a plus sign", !/\+/.test(labels));
  const css=require("fs").readFileSync(require("path").join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
  ok("...and it truncates rather than wrapping",
     /\.dayhead \.dt \.dtl\{white-space:nowrap;overflow:hidden;text-overflow:ellipsis/.test(css));
  ok("the head is tighter than it was",
     /\.dayhead\{[^}]*padding:9px 14px/.test(css) && /\.daycard\.open \.dayhead\{padding-bottom:2px\}/.test(css));
}

process.exit(fail ? 1 : 0);
