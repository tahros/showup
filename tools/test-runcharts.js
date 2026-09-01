// test-runcharts.js DIR — Distance month axis, a nine-month Pace chart with
// direct labels and touch reading, and headroom in Every week.
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
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({measureText:()=>({width:10})},
  {get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

(async () => {
await new Promise(r => setTimeout(r, 80));

// 14 months of timed runs, so both charts have more history than they show
run(`(function(){
  const y=+todayISO.slice(0,4);
  DB.days={}; DB.settings.canon={};
  for(let m=0;m<15;m++) for(let k=0;k<4;k++){
    const d=new Date(y,0,1); d.setMonth(d.getMonth()-14+m); d.setDate(3+k*7);
    const iso=d.toLocaleDateString('en-CA'); if(iso>todayISO) continue;
    DB.days[iso]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:36+(m%4),secs:0}],upd:1};
  }
  migrateCanon(); SEED=deriveAll(); view='stats'; render();})()`);

// ---- 1. Distance: the month row exists again
// `+todayISO.slice(5)` parsed "08-14" as NaN, so the loop never ran once.
const monthLetters = `[...document.querySelectorAll('.runrace text')]
  .map(t=>t.textContent).filter(t=>/^[JFMAMJJASOND]$/.test(t)).join('')`;
check("the distance chart labels its months",
      `${monthLetters}.length > 0`, true);
check("...one per month elapsed this year, in order",
      `${monthLetters}`, run(`'JFMAMJJASOND'.slice(0,+todayISO.slice(5,7))`));
check("...and the parse that broke it is gone",
      `${!/\+todayISO\.slice\(5\)-1/.test(fs.readFileSync(path.join(dir,"js/lift.js"),"utf8"))}`, "true");
check("...with every label inside the viewBox",
      `(function(){const svg=document.querySelector('.runrace svg');
        const vb=svg.getAttribute('viewBox').split(/\\s+/).map(Number);
        return [...svg.querySelectorAll('text')].every(t=>+t.getAttribute('y')<=vb[3]);})()`, true);

// ---- 2. Pace: nine months, every value above its point, mono-tone marks
check("pace shows nine months, not six",
      `document.querySelectorAll('.pacepoint').length`, 9);
check("...more months than the chart used to hold", `PACE_MONTHS > 6`, true);
check("every point prints a value inline",
      `document.querySelectorAll('.paceval').length === document.querySelectorAll('.pacepoint').length`, true);
check("every value sits centered directly above its own point",
      `(function(){const ps=[...document.querySelectorAll('.pacepoint')],vs=[...document.querySelectorAll('.paceval')];
        return ps.every((p,i)=>+vs[i].getAttribute('x')===+p.getAttribute('cx')
          && +vs[i].getAttribute('y')<+p.getAttribute('cy')
          && vs[i].getAttribute('text-anchor')==='middle');})()`, true);
check("all pace points use one blue mark colour, with no red exception",
      `[...document.querySelectorAll('.pacepoint')].every(p=>p.getAttribute('fill')==='var(--accent)')
       && ![...document.querySelectorAll('.pacepoint')].some(p=>p.classList.contains('fastest'))`, true);
check("the month row uses the same J F M A initials as the other charts",
      `(function(){const ps=[...document.querySelectorAll('.pacepoint')],ms=[...document.querySelectorAll('.pacemonth')];
        return ms.length===ps.length && ms.every((t,i)=>t.textContent==='JFMAMJJASOND'[+ps[i].dataset.pm.slice(5)-1]);})()`, true);
check("every point carries its month and pace for the readout",
      `[...document.querySelectorAll('.pacepoint')].every(p=>/^\\d{4}-\\d{2}$/.test(p.dataset.pm) && +p.dataset.pp>0)`, true);

// ---- the drag itself
check("the readout starts empty but holds its height",
      `document.querySelector('[data-pacecap]').textContent.trim()`, "");
check("the plot has a transparent backdrop, so gaps between points are live",
      `(function(){const r=document.querySelector('.pacepad');
        return !!r && +r.getAttribute('width')>0;})()`, true);
run(`(function(){
  const svg=document.querySelector('.pacescrub');
  svg.getBoundingClientRect=()=>({left:0,top:0,width:330,height:142,right:330,bottom:142});
  const ev=new window.Event('pointerdown',{bubbles:true});
  ev.clientX=0; ev.clientY=60; ev.isPrimary=true; ev.pointerId=1;
  svg.dispatchEvent(ev);})()`);
check("dragging names a month and its pace",
      `/[A-Z][a-z]{2} \\d{4}.*\\d+'\\d{2}"/.test(
        document.querySelector('[data-pacecap]').textContent.replace(/\\s+/g,' '))`, true);
check("...and rings the point it read",
      `document.querySelector('.pacehalo').getAttribute('opacity')`, 1);
check("...on the leftmost point, since the press was at the left edge",
      `(function(){const halo=document.querySelector('.pacehalo');
        const first=document.querySelector('.pacepoint');
        return halo.getAttribute('cx')===first.getAttribute('cx');})()`, true);
check("the readout matches that point's own data",
      `(function(){const halo=document.querySelector('.pacehalo');
        const p=[...document.querySelectorAll('.pacepoint')].find(x=>x.getAttribute('cx')===halo.getAttribute('cx'));
        return document.querySelector('[data-pacecap]').textContent.indexOf(paceStr(+p.dataset.pp))>-1;})()`, true);
check("the reading survives releasing the finger",
      `(function(){const svg=document.querySelector('.pacescrub');
        const up=new window.Event('pointerup',{bubbles:true}); up.pointerId=1;
        svg.dispatchEvent(up);
        return svg.querySelector('.pacehalo').getAttribute('opacity');})()`, 1);
/* v3.3.356: the tab-swipe is gone. What matters locally is that the scrubber
   still declares the axis its own. */
check("the pace scrubber still claims its own axis",
      `${/touch-action:\s*none/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8"))}`, "true");

// ---- 3. Every week: the tallest bar's value clears the card caption
check("the tallest weekly value label sits clear of the year caption",
      `(function(){const svg=[...document.querySelectorAll('svg')]
          .find(s=>s.textContent.indexOf('THROUGH')>-1);
        if(!svg) return true;
        const cap=[...svg.querySelectorAll('text')].find(t=>/THROUGH/.test(t.textContent));
        const vals=[...svg.querySelectorAll('text')].filter(t=>/^\\d+$/.test(t.textContent));
        const highest=Math.min(...vals.map(t=>+t.getAttribute('y')));
        return highest - +cap.getAttribute('y') >= 12;})()`, true);
check("...and the chart still fits its viewBox",
      `(function(){const svg=[...document.querySelectorAll('svg')]
          .find(s=>s.textContent.indexOf('THROUGH')>-1);
        if(!svg) return true;
        const vb=svg.getAttribute('viewBox').split(/\\s+/).map(Number);
        return [...svg.querySelectorAll('text')].every(t=>+t.getAttribute('y')<=vb[3]);})()`, true);

/* v3.3.355: A DISTANCE IS CONVERTED EXACTLY ONCE.
   The maker: "I don't think these numbers are accurate." He was right. The
   month card built its figures with toD() and then printed them through
   dDisp(), which converts AGAIN -- so a 3.766 km run showed as a 1.45 mi
   "longest" while the header, converting once, showed the same run as 2.34.
   The suite was green throughout: every assertion here checked a chart's
   geometry, and none ever compared a printed distance to the distance that
   was logged.
   The tell was INSIDE the card. The hero read 27.93 of a 50 goal while the
   bar beneath it -- computed from the same variable without the second
   conversion -- read 90% and "5.0 to go". One variable, two answers. So the
   assertions below are of two kinds: a number that must equal what was
   logged, and numbers that must agree with each other. */
{
  const seed = `(function(){
    DB.days={}; DB.settings.unit='lb';           // miles
    const t=new Date(todayISO+'T00:00');
    const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
    /* three runs this month: 2.34 mi today, 1.00 and 3.00 mi before it.
       stored in KM, exactly as the Run logger writes them (fromD).

       v3.3.393: THE EARLIER TWO WERE PLACED BY "DAYS AGO" -- D(2) and D(4) --
       which walk out of the CURRENT MONTH during its first days, while these
       tiles only ever show the current month. On the 1st, 2nd, 3rd and 4th
       the fixture seeded runs the chart could not see and then asserted their
       values. It has been wrong four days a month since it was written.
       Placed by day-of-month now, so they are in-month by construction. */
    const dom=+todayISO.slice(8), MD=n=>todayISO.slice(0,8)+String(n).padStart(2,'0');
    DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:2.34/0.621371,reps:[],mins:27,secs:0,at:1}],upd:1};
    if(dom>=3){
      DB.days[MD(dom-1)]={w:[{part:'Run',ex:'Run',w:1.00/0.621371,reps:[],mins:12,secs:0,at:1}],upd:1};
      DB.days[MD(dom-2)]={w:[{part:'Run',ex:'Run',w:3.00/0.621371,reps:[],mins:36,secs:0,at:1}],upd:1};
    }
    /* and one run well before this month, so LIFETIME figures exist on every
       date. Without it, a fixture seeded only with today's run leaves
       SEED.totals.km at zero -- deriveAll skips today -- and Train's run
       history does not render at all, which is why the lifetime check
       reported "no foot" rather than a wrong number. Being 40 days back it
       cannot disturb any month-scoped tile. */
    DB.days[D(40)]={w:[{part:'Run',ex:'Run',w:5.00/0.621371,reps:[],mins:60,secs:0,at:1}],upd:1};
    window.__runsThisMonth=dom>=3?3:1;
    SEED=deriveAll(); view='stats'; render();})()`;
  run(seed);

  const tile = label => run(`(function(){
    const s=[...document.querySelectorAll('.runmonthgrid span')]
      .find(x=>x.textContent.trim().endsWith('${label}'));
    return s?(s.querySelector('b').textContent.match(/[\\d.]+/)||[''])[0]:'no tile';})()`);

  /* the longest run this month IS the longest run this month. Early in a
     month there is no room for the earlier two, and the honest assertion is
     then the single-run one -- stated, not skipped. */
  const many = run(`window.__runsThisMonth`)===3;
  check("the longest tile equals the longest run logged",
        `${+tile('longest')}`, many?3:2.34);
  check("...and the average is the mean of what was logged",
        `${+tile('average')}`, many?+((2.34+1+3)/3).toFixed(2):2.34);
  check("the month hero equals the sum of the runs logged",
        `(function(){const h=document.querySelector('.runmonthhero strong');
          return +(h.textContent.match(/[\\d.]+/)||[0])[0];})()`,
        many?+(2.34+1+3).toFixed(2):2.34);

  /* and the card must not contradict itself: the hero, the percentage and
     the remaining distance are three views of ONE number */
  check("...and the goal bar agrees with the hero",
        `(function(){
          const hero=+(document.querySelector('.runmonthhero strong').textContent.match(/[\\d.]+/)||[0])[0];
          const pct=[...document.querySelectorAll('.runmonthgrid span')]
            .find(x=>/to \\d+/.test(x.textContent));
          const p=+(pct.querySelector('b').textContent.match(/\\d+/)||[0])[0];
          const goal=+(pct.textContent.match(/to (\\d+)/)||[0,0])[1];
          return Math.abs(hero/goal*100 - p) <= 1;})()`, true);
  check("...and 'to go' agrees with the hero",
        `(function(){
          const hero=+(document.querySelector('.runmonthhero strong').textContent.match(/[\\d.]+/)||[0])[0];
          const big=+(document.querySelector('.mstone .big').textContent.match(/[\\d.]+/)||[0])[0];
          const goal=+(document.querySelector('.mstone .goal').textContent.match(/to (\\d+)/)||[0,0])[1];
          return Math.abs((goal-hero) - big) <= 0.1;})()`, true);

  /* the lifetime total in Train's run history wore a mi label on a km value */
  check("the lifetime total is converted before it is labelled",
        `(function(){DB.settings.unit='lb'; view='lift'; lift.part='Run'; lift.ex='Run'; render();
          const f=document.querySelector('.runhist .lastfoot');
          if(!f) return 'no foot';
          const life=+(f.textContent.match(/([\\d,]+) mi lifetime/)||[0,0])[1].replace(/,/g,'');
          return Math.abs(life - Math.round(toD(SEED.totals.km))) <= 1;})()`, true);
}

process.exit(fail ? 1 : 0);
})();
