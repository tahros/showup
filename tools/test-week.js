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
w.localStorage.setItem('showup:planning-interface','previous'); // Legacy interface contract; workspace covered by test-planner.
w.fetch = () => Promise.reject(new Error("offline"));
/* v3.3.492: the stub answered `matches:false` to EVERY query, including
   `(prefers-reduced-motion:no-preference)` -- so MOTION_OK was false and
   motionPass never ran in this harness. A first cut of the stagger assertion
   below passed with the code broken because of it. The stub now answers the
   motion query truthfully, which is the only way an assertion about the
   entrance pass can mean anything here. */
w.matchMedia = w.matchMedia || (q => ({ matches:/no-preference/.test(String(q)),
  media:String(q), addEventListener(){}, removeEventListener(){} }));
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

/* ---- v3.3.492: THE HEADING READS LABEL FIRST ----
   It read "TODAY WEEK plan" -- the value ahead of the thing it is a value of,
   with the section's own name pushed to the far right. Now "PLAN today week",
   the same shape as every other h2: accent tick, name, then controls. */
ok("the plan heading leads with its own name, not its value",
   run(`(function(){const h=document.querySelector('h2 .scopepill[data-planscope]').closest('h2');
     return h.textContent.trim().toLowerCase().startsWith('plan');})()`),
   run(`document.querySelector('h2 .scopepill[data-planscope]').closest('h2').textContent.trim().slice(0,24)`));
ok("...with the pills after it, day then week",
   run(`(function(){const h=document.querySelector('h2 .scopepill[data-planscope]').closest('h2');
     const p=[...h.querySelectorAll('.scopepill[data-planscope]')].map(b=>b.dataset.planscope);
     return p.join()==='today,week';})()`));
/* the (i) used to be built into the DAY heading only, so toggling scope made
   it blink out and the whole row shifted by its width -- motion the maker
   would read as part of the flicker. It is in both branches now. */
const tipIn=scope=>run(`(function(){lift.planScope='${scope}'; render();
   const h=document.querySelector('h2 .scopepill[data-planscope]').closest('h2');
   return !!h.querySelector('.hacts .tipi[data-tip="plan"]');})()`);
ok("the (i) is on the heading in the day scope", tipIn('today'));
ok("...and does not blink out in the week scope", tipIn('week'));

/* ---- v3.3.492: SWITCHING SCOPE HAPPENS IN PLACE ----
   The scope pills called a plain render(): the entrance rise replayed on every
   card and paint() finished with scrollTo(0,0), so a tap on a pill halfway
   down the page rebuilt the screen at the top. Unlike the fold this one cannot
   be a class toggle -- the content genuinely differs -- so the fix is that the
   repaint keeps its place and skips the entrance. Asserted as EFFECTS: where
   paint() scrolls to, and whether the view is marked to suppress the rise. */
run(`(function(){lift.planScope='today'; render();
  globalThis.__scrollLog=[];
  window.scrollTo=(x,y)=>{ __scrollLog.push(y); };
  Object.defineProperty(window,'scrollY',{value:340,configurable:true});})()`);
run(`document.querySelector('.scopepill[data-planscope="week"]').click()`);
ok("tapping a scope pill keeps the reader's place",
   run(`__scrollLog.length===1 && __scrollLog[0]===340`), run(`JSON.stringify(__scrollLog)`));
ok("...and suppresses the entrance rise for that repaint",
   run(`document.getElementById('view').classList.contains('norise')`));
ok("...and it really did switch scope", run(`lift.planScope`)==='week' && run(`!!document.querySelector('.weekstack')`));
/* motionPass is skipped whole, not just the rise: it stamps --i on every top
   level block for the stagger, re-arms the float-in observers and re-sweeps
   charts. None of that should replay because a pill was tapped. --i is the
   readable trace of it having run. */
ok("...and the stagger pass did not run at all",
   run(`[...document.getElementById('view').children].every(el=>!el.style.getPropertyValue('--i'))`));
/* ---- v3.3.498: AN ARRIVAL IS A CHANGE OF SCREEN, NOT A CALL TO render() ----
   "A plain render()" used to be what separated arriving from standing still,
   and that is what this assertion tested. It is no longer the distinction:
   paint derives it from the tuple that NAMES a screen -- the tab, the plan
   sub-screen, and the Train tab's part/exercise drill-down -- so the
   same-screen re-render below now correctly keeps its place, and the arrival
   under test has to be a real one. */
run(`(function(){__scrollLog.length=0; view='today'; render();})()`);
ok("...and a plain re-render of the same screen keeps its place too",
   run(`__scrollLog.length===1 && __scrollLog[0]===340`) &&
   run(`document.getElementById('view').classList.contains('norise')`),
   run(`JSON.stringify(__scrollLog)+' norise='+document.getElementById('view').classList.contains('norise')`));
run(`(function(){__scrollLog.length=0; view='history'; render();})()`);
ok("a real arrival — a different tab — still goes to the top, rise intact",
   run(`__scrollLog.length===1 && __scrollLog[0]===0`) &&
   run(`!document.getElementById('view').classList.contains('norise')`),
   run(`JSON.stringify(__scrollLog)+' norise='+document.getElementById('view').classList.contains('norise')`));
/* the Train tab's drill-down is an arrival even though the tab never changes —
   walking into a part is going somewhere, and this is why the key carries more
   than `view` */
run(`(function(){__scrollLog.length=0; view='lift'; render(); __scrollLog.length=0;
  Object.defineProperty(window,'scrollY',{value:210,configurable:true});
  lift.part='Chest'; render();})()`);
ok("...and so is opening a part on Train, with the tab unchanged",
   run(`__scrollLog.length===1 && __scrollLog[0]===0`) &&
   run(`!document.getElementById('view').classList.contains('norise')`),
   run(`JSON.stringify(__scrollLog)`));
ok("...but re-rendering that same part stands still",
   run(`(function(){__scrollLog.length=0; render();
     return __scrollLog.length===1 && __scrollLog[0]===210
       && document.getElementById('view').classList.contains('norise');})()`),
   run(`JSON.stringify(__scrollLog)`));
/* a sub-screen inside a tab is a destination too: walking into the plan
   editor lands at the top, or you arrive halfway down a screen you have
   never seen */
run(`(function(){__scrollLog.length=0; lift.part=null; lift.ex=null; view='today'; render();
  __scrollLog.length=0; lift.plan='paste'; render();})()`);
ok("...and a plan sub-screen is an arrival, though view never moved",
   run(`__scrollLog.length===1 && __scrollLog[0]===0`) &&
   run(`!document.getElementById('view').classList.contains('norise')`),
   run(`JSON.stringify(__scrollLog)+' key='+screenKey()`));
/* ---- v3.3.507: LEAVING A TAB DOES NOT ABANDON A VIEWPOINT ----
   `lift` is one bag holding the Train tab's drill-down AND the Today tab's
   plan view. Entering Train replaced that object wholesale, so it cleared the
   second with the first: the maker was reading his WEEK with Wednesday open,
   tapped Train, came back, and found the day scope with the fold open.
   Asserted as the round trip he actually made, not as the shape of the
   assignment -- and including a real drill-down on the way, because resetting
   Train's own state is the thing that must still work. */
run(`(function(){lift.plan=null; view='today'; lift.planScope='week'; render();
  lift.weekOpen=new Set(Object.keys((weekNow()||{days:{}}).days).slice(0,2));
  lift.planFold=true; render();
  globalThis.__scope=lift.planScope;
  globalThis.__open=[...lift.weekOpen].sort().join(',');
  globalThis.__fold=lift.planFold;})()`);
ok("(fixture) the maker is reading the week, with days open",
   run(`__scope==='week' && __open.length>0`), run(`__scope+' / '+__open`));
run(`(function(){ document.getElementById('goLift').click(); })()`);
/* renderLift picks a part for you on arrival, which is its own long-standing
   behaviour -- what liftEnter owns is that nothing is INHERITED across the
   entry: no exercise, no weight in the logger, no return to somewhere else */
ok("the Train tab still enters clean, inheriting nothing",
   run(`view==='lift' && lift.ex===null && lift.weight===0 && lift.ret===null`),
   run(`view+' ex='+lift.ex+' w='+lift.weight+' ret='+lift.ret`));
run(`(function(){ lift.part='Chest'; render(); lift.ex='Barbell Bench Press'; render(); })()`);
run(`(function(){ view='today'; render(); })()`);
ok("...and coming back to Today lands on the week you were reading",
   run(`lift.planScope`)===run(`__scope`), run(`lift.planScope+' (was '+__scope+')'`));
ok("...with the same days still open",
   run(`[...(lift.weekOpen||[])].sort().join(',')`)===run(`__open`),
   run(`[...(lift.weekOpen||[])].sort().join(',')+' (was '+__open+')'`));
ok("...and the fold as you left it",
   run(`!!lift.planFold`)===run(`!!__fold`), run(`String(!!lift.planFold)`));
/* the sub-screen is NOT a viewpoint: walking into the paste editor and then
   leaving the tab abandons that screen, which is what screenKey calls an
   arrival */
run(`(function(){ lift.plan='paste'; document.getElementById('goLift').click(); view='today'; render(); })()`);
ok("...but a sub-screen you walked into is not carried back",
   run(`!lift.plan`), run(`String(lift.plan)`));
/* hand the file back the state it had before this block, or the assertions
   after it inherit an open week and go red for no reason of their own */
run(`(function(){lift.plan=null; lift.part=null; lift.ex=null; lift.planFold=false;
  lift.weekOpen=null; view='today'; lift.planScope='week'; render();})()`);

/* the escape hatch named in the comment: one function drives all of it */
ok("screenKey names the screen, and nothing else decides",
   run(`screenKey()`) === run(`[view,lift.plan||'',lift.part||'',lift.ex||'',lift.write?'w':''].join('|')`),
   run(`screenKey()`));

/* ---- v3.3.499: AN IN-PLACE SWAP DOES NOT CROSS-FADE THE PAGE ----
   v3.3.492 routed the in-place path through the View Transitions API on the
   reasoning that a cross-fade would soften the swap. It does the opposite: a
   view transition snapshots the WHOLE page and animates between the two, and
   the day scope and the week scope are different heights, so the root group
   animates its size while the two images cross-fade over each other. The page
   changes shape and doubles for the length of the animation -- which is what
   the maker was still seeing after the scroll fix and the screen-key sweep.
   jsdom has no startViewTransition, so without this stub the whole branch is
   unreachable here and any assertion about it would be green by vacancy. */
run(`(function(){ globalThis.__vt=0;
  document.startViewTransition=cb=>{ __vt++; cb(); return {finished:Promise.resolve()}; };
  lift.plan=null; lift.part=null; lift.ex=null; view='today'; lift.planScope='today'; render();
  Object.defineProperty(window,'scrollY',{value:340,configurable:true});
  __vt=0; __scrollLog.length=0;})()`);
run(`document.querySelector('.scopepill[data-planscope="week"]').click()`);
ok("switching scope takes no page-level animation",
   run(`__vt===0`), run(`'transitions='+__vt`));
ok("...and still keeps its place and skips the entrance",
   run(`__scrollLog.length===1 && __scrollLog[0]===340
        && document.getElementById('view').classList.contains('norise')`),
   run(`JSON.stringify(__scrollLog)`));
ok("...and really did switch scope", run(`lift.planScope`)==='week' && run(`!!document.querySelector('.weekstack')`));
/* a tab switch IS the page becoming a different page, both snapshots the same
   size -- it keeps the cross-fade */
run(`(function(){__vt=0; view='history'; render();})()`);
ok("a tab switch still cross-fades",
   run(`__vt===1`), run(`'transitions='+__vt`));
run(`(function(){delete document.startViewTransition; view='today'; lift.planScope='week'; render();})()`);

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
ok("the refined week edge is edit and Write, with no Copy",
   run(`(function(){const b=[...document.querySelectorAll('h2 .planedge .pedge')]; return b.length===2
     && !document.querySelector('h2 [data-plancopy]') && !!b[0].querySelector('.ic-edit')
     && b[1].getAttribute('data-planwrite')==='week';})()`));
ok("...each with a name for the screen reader, since the word is gone",
   run(`[...document.querySelectorAll('h2 .planedge .pedge')].every(b=>b.getAttribute('aria-label'))`));
ok("...edit keeps its filled outline, not a stroke",
   run(`(function(){const e=document.querySelector('.ic-edit path');
     return !!e && e.getAttribute('fill')==='currentColor'
       && e.getAttribute('fill-rule')==='evenodd' && !e.parentNode.getAttribute('stroke');})()`));
ok("...its holes survive: one path of three subpaths",
   run(`(function(){const n=s=>(document.querySelector(s).getAttribute('d').match(/M/g)||[]).length;
     return n('.ic-edit path')===3;})()`),
   run(`(document.querySelector('.ic-edit path').getAttribute('d').match(/M/g)||[]).length+' subpaths in edit'`));
/* v3.3.491: the turn is a CLASS on a span (.pfchev.open), not a rotation baked
   into the icon's style, so it can transition. Same glyph, same directions:
   right when folded, down when open. The icon's own style stays clean. */
ok("every day heading carries the chevron, right when folded, down when open",
   run(`(function(){const f=[...document.querySelectorAll('.daycard:not(.open) .dayhead .pfchev')],
       o=document.querySelector('.daycard.open .dayhead .pfchev');
     return f.length===3 && !!o && o.classList.contains('open')
       && f.every(s=>!s.classList.contains('open'))
       && [...f,o].every(s=>{const g=s.querySelector('svg.ic-chevron');
            return !!g && !/rotate/.test(g.getAttribute('style')||'');});})()`));

/* ---- v3.3.491: THE FOLD IS A MOTION, NOT A REPAINT ----
   The maker reported the week accordion flickering. The cause was render():
   paint() replaces the whole view, re-runs the entrance motion on every card
   and calls scrollTo(0,0), all to change one card's height. The day fold
   learned this in v3.3.452; the week is the same control and now shares the
   mechanism. Asserted as an EFFECT: every day's body is in the DOM whichever
   way the card is folded, and a tap leaves the very same nodes in place. */
ok("a folded day keeps its body in the DOM, shut",
   run(`(function(){const c=document.querySelector('.daycard:not(.open)'); const b=c&&c.querySelector('[data-weekbody]');
     return !!b && b.classList.contains('shut') && !!b.querySelector('.plancard');})()`));
ok("...and an open day's body is the same element, not shut",
   run(`(function(){const c=document.querySelector('.daycard.open'); const b=c&&c.querySelector('[data-weekbody]');
     return !!b && !b.classList.contains('shut') && !!b.querySelector('.plancard');})()`));
/* a shut fold's ticks and steppers sit behind a zero-height window; without
   this they stay tab-reachable, and the week keeps four to seven of them */
ok("...a shut body is inert, an open one is not",
   run(`(function(){const s=document.querySelector('.daycard:not(.open) [data-weekbody]'),
       o=document.querySelector('.daycard.open [data-weekbody]');
     return !!s && !!o && s.hasAttribute('inert') && !o.hasAttribute('inert');})()`));
run(`globalThis.__wkCard=document.querySelector('.daycard:not(.open)');
     globalThis.__wkBody=__wkCard.querySelector('[data-weekbody]');
     globalThis.__wkHead=document.querySelector('.weekstack');
     __wkCard.querySelector('[data-weekday]').click();`);
ok("one tap opens it in place — same card, same body, same stack",
   run(`__wkCard.classList.contains('open') && !__wkBody.classList.contains('shut')
        && !__wkBody.hasAttribute('inert')
        && __wkBody===__wkCard.querySelector('[data-weekbody]')
        && __wkHead===document.querySelector('.weekstack')
        && document.body.contains(__wkCard)`));
ok("...and the chevron turned on the same span",
   run(`__wkCard.querySelector('.dayhead .pfchev').classList.contains('open')
        && __wkCard.querySelector('[data-weekday]').getAttribute('aria-expanded')==='true'`));
run(`__wkCard.querySelector('[data-weekday]').click()`);
ok("...and folding it back is the same node again, shut and inert",
   run(`!__wkCard.classList.contains('open') && __wkBody.classList.contains('shut')
        && __wkBody.hasAttribute('inert')
        && __wkBody===__wkCard.querySelector('[data-weekbody]')
        && __wkCard.querySelector('[data-weekday]').getAttribute('aria-expanded')==='false'`));

/* v3.3.421 RESTATES: expand-all and fold-all left the header -- every day row
   carries its own chevron, and a header glyph that opened all four at once
   was a fifth control for a thing the rows already did. Opening each day by
   its own heading is the behaviour that remains. */
/* v3.3.491: the toggle no longer re-renders, so the nodes survive a click --
   but the loop still re-queries, because :not(.open) is what it is walking */
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
run(`document.querySelector('[data-plantext]').click()`);   // v3.3.450: the text is behind its own door
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
/* v3.3.453: the week keeps its own noun -- a week is plans, plural -- while
   the day preview says the plain "Use the plan". Asserted HERE, where the
   week preview is actually mounted; placed earlier it read the day screen's
   button and passed for the wrong reason. */
ok("the week preview's primary is 'Use for this week'",   // v3.3.454: same 'for X' grammar
   run(`lift.planMode==='week' && document.querySelector('[data-planaccept]').textContent.trim()`)==='Use for this week',
   run(`document.querySelector('[data-planaccept]').textContent.trim()`));
run(`document.querySelector('[data-planaccept]').click()`);
ok("...and Use for this week keeps what the preview shows, minus the dropped line",
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
