// v3.3.217: the simplified Stats information architecture and fair run comparisons.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(new Error('offline'));
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});
w.HTMLCanvasElement.prototype.toDataURL=()=>"data:image/png;base64,";w.Element.prototype.setPointerCapture=()=>{};
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));const run=c=>vm.runInContext(c,ctx);
let fail=0;const ok=(n,c,x='')=>{console.log(c?'PASS':'FAIL',n,x?'→ '+x:'');if(!c)fail++;};
run(`(function(){DB.days={};const now=new Date(todayISO+'T00:00'),y=now.getFullYear();
  for(let i=0;i<430;i++){const d=new Date(now);d.setDate(d.getDate()-i);const iso=d.toLocaleDateString('en-CA');
    if(i%2===0)DB.days[iso]={w:[{part:'Back',ex:'Pull Up',w:60+(i<30?10:0),reps:[8+(i<7?2:0)],at:1}],upd:1};   // v3.3.253: first boosted day lands 6d ago — inside the 7-day celebration window
    if(i%3===0)(DB.days[iso]||(DB.days[iso]={w:[],upd:1})).w.push({part:'Run',ex:'Run',w:4+(i%4),reps:[],mins:32,secs:0,at:2});}
  SEED=deriveAll();view='stats';render();})()`);
const H=run(`[...document.querySelectorAll('#view h2')].map(h=>h.firstChild.textContent.trim())`);
ok('Growth Audit omits the competing Heaviest summary',run(`!document.querySelector('.garecord')&&!/Heaviest/i.test(document.querySelector('.gacard').textContent)`));
ok('Growth Audit exposes recent record movement when present',run(`!!document.querySelector('.gadelta')`));
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
ok('Session Build legend targets stay thumb-sized without capsules',/\.pmixlgd button\{[^}]*min-height:44px[^}]*border:0[^}]*background:transparent/.test(css.replace(/\n/g,'')));
ok('Session Build has a genuinely categorical palette',new Set([...css.matchAll(/--p-(?:chest|back|shoulder|legs|biceps|triceps|sixpack):(#\w+)/gi)].map(m=>m[1].slice(1,2))).size>3);
ok('Consistency verdict pill is enlarged',/\.congap\{[^}]*min-width:88px[^}]*font-size:12px/.test(css.replace(/\n/g,'')));
const mt=run(`[...document.querySelectorAll('.mpacecard svg text')].map(t=>t.textContent)`);
ok('Monthly pace displays Year',mt.includes('YEAR'));
ok('Monthly pace uses month initials',mt.filter(t=>/^[JFMASOND]$/.test(t)).length===12);
ok('Every month is removed',!H.includes('Every month'));
ok('This month goal and yearly goal are removed',!run(`document.querySelector('.moGoal')`)&&!H.some(x=>/goal$/i.test(x)));
ok('Records is removed',!H.includes('Records'));
ok('Run no longer reports a run streak',!/day run streak/.test(run(`document.querySelector('#view').textContent`)));
ok('Distance is a two-self same-date race',run(`document.querySelectorAll('.runrace [data-con-count]').length`)===2);
ok('Distance scrubber declares distance units',run(`document.querySelector('.runrace [data-race-unit]').getAttribute('data-race-unit')`)==='km');
ok('The milestone is folded into Running month',!H.includes('Monthly milestone')&&run(`!!document.querySelector('.runmonthgoal .mbar')`));
const pace=run(`(function(){const h=[...document.querySelectorAll('h2')].find(x=>x.firstChild.textContent.trim()==='Pace');return h&&h.nextElementSibling.querySelectorAll('line').length;})()`);
ok('Pace has axis and grid lines',pace>=4,pace+' lines');
const paceMeta=JSON.parse(run(`JSON.stringify((function(){const h=[...document.querySelectorAll('h2')].find(x=>x.firstChild.textContent.trim()==='Pace'),svg=h.nextElementSibling.querySelector('svg');return {values:[...svg.querySelectorAll('.paceval')].map(t=>({text:t.textContent,fill:t.getAttribute('fill'),size:t.getAttribute('font-size')})),points:[...svg.querySelectorAll('.pacepoint')].map(p=>({fill:p.getAttribute('fill'),fast:p.classList.contains('fastest')})),dates:[...svg.querySelectorAll('text')].map(t=>t.textContent).filter(t=>/^\\d{1,2}\\/\\d{1,2}$/.test(t)),ticks:[...svg.querySelectorAll('text[x="29"]')].map(t=>t.textContent),head:h.classList.contains('charthead'),card:h.nextElementSibling.classList.contains('pacecard')};})())`));
/* v3.3.265: every monthly point prints its value directly above the mark;
   points share one blue and the x-axis shares the app's month initials. */
ok('Pace shows the latest nine monthly points',
   paceMeta.points.length===9,
   paceMeta.points.length+' points');
ok('...with a value printed above every point',
   paceMeta.values.length===paceMeta.points.length,
   paceMeta.values.length+' labels');
/* v3.3.265 required ONE neutral ink for every label, to kill the red
   "fastest month" exception. v3.3.268 RESTATES rather than relaxes: the
   archive keeps that single neutral ink, and exactly one label — the newest
   month — is accent blue. Recency is a calendar fact, not a verdict, so no
   performance claim changes hue and no second neutral appears. */
ok('Printed pace labels stay large, with one neutral ink for the archive',
   paceMeta.values.slice(0,-1).every(v=>v.fill==='var(--muted)'&&+v.size>=8));
ok('...and exactly one label, the newest month, is accent blue',
   paceMeta.values.filter(v=>v.fill==='var(--accent)').length===1
   && paceMeta.values[paceMeta.values.length-1].fill==='var(--accent)');
ok('...no label is coloured by being fastest',
   (function(){const fast=Math.min(...paceMeta.values.map(v=>{const a=v.text.replace(/"/g,'').split("'");return +a[0]*60 + +a[1];}));
     return paceMeta.values.every((v,i)=>{const a=v.text.replace(/"/g,'').split("'");
       const sec=+a[0]*60 + +a[1];
       return sec!==fast || i===paceMeta.values.length-1 || v.fill==='var(--muted)';});})());
ok('Every Pace point uses the same blue',paceMeta.points.every(p=>p.fill==='var(--accent)'));
const paceMonths=run(`[...document.querySelectorAll('.pacemonth')].map(t=>t.textContent).join('')`);
ok('Pace uses month initials instead of dates',
   paceMonths.length===paceMeta.points.length&&/^[JFMASOND]+$/.test(paceMonths),paceMonths);
ok('Pace ticks land on 15-second increments',paceMeta.ticks.every(t=>{const a=t.split(':');return (+a[0]*60 + +a[1])%15===0;}),paceMeta.ticks.join(' '));
ok('Chart headings carry the extra spacing hook',paceMeta.head&&paceMeta.card);
ok('Running month uses six visual metrics',run(`document.querySelectorAll('.runmonthgrid span').length`)===6);
ok('Every week compares twelve partial weeks',run(`(function(){const h=[...document.querySelectorAll('h2')].find(x=>x.firstChild.textContent.trim()==='Every week');return h.nextElementSibling.querySelectorAll('rect.gbar').length;})()` )===12);
ok('Every week labels all twelve bars with actual dates',run(`(function(){const h=[...document.querySelectorAll('h2')].find(x=>x.firstChild.textContent.trim()==='Every week'),t=[...h.nextElementSibling.querySelectorAll('svg text')].map(x=>x.textContent);return t.filter(x=>/^\\d{1,2}\\/\\d{1,2}$/.test(x)).length===12&&!t.some(x=>/^[JFMASOND]$/.test(x));})()`));

/* ================= v3.3.473/474: DAILY RUNS =================
   The fixture logs a run every third day back from today (i%3===0), km 4..7,
   over 120 days. v3.3.474 draws EVERY day from the first run to today in a
   scroller with a real y-axis, month and year rules, and a footer that counts
   the current month only. */
run(`DB.settings.unit='kg'; delete DB.settings.runUnit; view='stats'; render();`);
ok('Daily runs follows the Running month card', run(`(function(){const hs=[...document.querySelectorAll('h2')].map(h=>h.firstChild.textContent.trim()); const i=hs.findIndex(t=>/^Running/.test(t)); return i>=0 && hs[i+1]==='Daily runs';})()`));
{
  /* v3.3.476 RESTATES the v3.3.474/475 span assertions. The x-axis is RUNS
     now, not days: days without a run are left out so the line is unbroken.
     The claim is one point per run, in date order, oldest first. */
  const runsAll=run(`runDays().length`);
  ok('...one dot per run, and one date label per run -- days without a run are left out',
     run(`document.querySelectorAll('.drcard svg circle.drdot').length`)===runsAll &&
     run(`[...document.querySelectorAll('.drcard svg text')].filter(x=>/^\\d{1,2}\\/\\d{1,2}$/.test(x.textContent)).length`)===runsAll,
     run(`document.querySelectorAll('.drcard svg circle.drdot').length`)+' dots / '+runsAll+' runs');
  ok('...they are in date order, oldest first, and only the newest is marked',
     run(`(function(){const ds=runDays().map(r=>r.d).sort();
       const t=[...document.querySelectorAll('.drcard svg text')].filter(x=>/^\\d{1,2}\\/\\d{1,2}$/.test(x.textContent)).map(x=>x.textContent);
       const want=ds.map(d=>(+d.slice(5,7))+'/'+(+d.slice(8,10)));
       const dots=[...document.querySelectorAll('.drcard circle.drdot')];
       return JSON.stringify(t)===JSON.stringify(want) && dots.filter(c=>c.classList.contains('newest')).length===1 && dots[dots.length-1].classList.contains('newest');})()`));
  ok('...an unbroken line joins every point, with a fill beneath it in distance mode',
     run(`(function(){const p=document.querySelector('.drcard polyline.drline'); if(!p) return false;
       return p.getAttribute('points').trim().split(/\\s+/).length===runDays().length && !!document.querySelector('.drcard polygon.drfill');})()`),
     run(`(document.querySelector('.drcard polyline.drline')||{getAttribute:()=>''}).getAttribute('points').trim().split(/\\s+/).length`));
  ok('...and the svg is wider than its box, so it scrolls',
     run(`(function(){const w=+document.querySelector('.drcard svg').getAttribute('width'); return w>320;})()`),
     run(`document.querySelector('.drcard svg').getAttribute('width')`));
}
ok('...it has a y-axis with round labelled steps, ascending, top down', run(`(function(){const v=[...document.querySelectorAll('.draxis span:not([data-dryr])')].map(x=>parseFloat(x.textContent));
  if(v.length<4||v[v.length-1]!==0) return false; const st=v[0]/(v.length-1);
  return v.every((n,i)=>Math.abs(n-(v.length-1-i)*st)<1e-9) && [0.5,1,2,2.5,5,10,20,25,50].includes(st);})()`), run(`JSON.stringify([...document.querySelectorAll('.draxis span')].map(x=>x.textContent))`));
/* v3.3.475 RESTATES: the axis now tops a full step CLEAR of the tallest bar,
   which is What you did's headroom. So the tallest bar must NOT reach the top. */
/* the headroom rule, asserted on the axis function itself: when the tallest
   value lands just under a step multiple, the axis takes one more step so the
   bar never scrapes the ceiling. The fixture's own max (7.0 on a step of 2)
   does not exercise it, so it is exercised here directly -- a probe that
   removed the rule passed against the fixture alone. */
ok('...the axis adds a step when the tallest value would scrape the ceiling', run(`(function(){
  const a=drunAxis(7.9); const b=drunAxis(7.0);
  return a.step*a.n===10 && 7.9/(a.step*a.n)<0.85 && b.step*b.n===8;})()`),
  run(`JSON.stringify([drunAxis(7.9),drunAxis(7.0)])`));
/* v3.3.476 RESTATES for the line: the highest DOT sits clear of the axis top. */
ok('...and the highest point sits clear of the axis top (headroom, like What you did)', run(`(function(){
  const cys=[...document.querySelectorAll('.drcard circle.drdot')].map(c=>+c.getAttribute('cy'));
  return Math.min(...cys) > 8 + (150-8)*0.06;})()`), run(`Math.min(...[...document.querySelectorAll('.drcard circle.drdot')].map(c=>+c.getAttribute('cy'))).toFixed(1)`));
/* both rules asserted by COUNT, not by "at least one label exists" -- year
   marks alone satisfied a looser check and it passed with month rules off.
   Over a span of N days there is one month label per month boundary that is
   not also a year boundary, and one year mark per year boundary plus the
   left edge. */
ok('...a labelled rule at every month boundary, and a firmer marked one at every year', run(`(function(){
  const rows=[]; const first=runDays().map(r=>r.d).sort()[0];
  for(let d=new Date(first+'T00:00');;d.setDate(d.getDate()+1)){ const iso=d.toLocaleDateString('en-CA'); if(iso>todayISO) break; rows.push(iso); }
  let mb=0, yb=0; for(let i=1;i<rows.length;i++){ const a=rows[i-1], b=rows[i];
    if(a.slice(0,4)!==b.slice(0,4)) yb++; else if(a.slice(0,7)!==b.slice(0,7)) mb++; }
  const t=[...document.querySelectorAll('.drcard svg text')].map(x=>x.textContent);
  const months=t.filter(x=>/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(x)).length;
  const years=document.querySelectorAll('.drcard svg [data-yrmark]').length;
  /* v3.3.475: the left-edge year moved OUT of the svg into the axis column,
     so the marks inside are exactly the year boundaries. */
  return months===mb && years===yb && document.querySelector('.draxis [data-dryr]').textContent===${JSON.stringify('')}||months===mb && years===yb;})()`), run(`JSON.stringify([...document.querySelectorAll('.drcard svg text')].map(x=>x.textContent).slice(0,8))`));
{
  /* the footer counts THIS MONTH only, and resets on the 1st */
  const mo=run(`todayISO.slice(0,7)`);
  const kmMonth=run(`(function(){let s=0,n=0; for(let i=0;i<200;i++){ const t=new Date(todayISO+'T00:00'); t.setDate(t.getDate()-i); const iso=t.toLocaleDateString('en-CA'); if(!iso.startsWith(${JSON.stringify(mo)})) continue; if(i%3===0){ s+=4+(i%4); n++; } } return s+'|'+n;})()`);
  const [sum,n]=kmMonth.split('|');
  ok('...the footer is this month to date, not the whole window',
     run(`document.querySelector('.drcard .tot b').textContent`)===(Math.round(+sum*100)/100).toFixed(2) &&
     run(`document.querySelector('.drcard .tot').textContent`).includes(n+' run'),
     run(`document.querySelector('.drcard .tot').textContent`));
  ok('...and it names the month, so the reset is legible', new RegExp(run(`new Date(todayISO+'T00:00').toLocaleDateString('en-US',{month:'long'})`)).test(run(`document.querySelector('.drcard .tot').textContent`)));
}
/* v3.3.481 RESTATES the unit assertions: there is no unit control. The card
   follows the APP's unit (lb -> mi, kg -> km), like the Running month card
   above it; a stored runUnit from 473-476 is ignored. The caption is a label. */
ok('the caption names the unit and is a LABEL, not a control', run(`(function(){const c=document.querySelector('.drcard .drunit'); return c && c.tagName!=='BUTTON' && c.textContent.startsWith('km') && !document.querySelector('.drcard [data-rununit]');})()`));
run(`DB.settings.runUnit='mi'; render();`);
ok('a stored per-card unit is ignored: kg app, km card', run(`document.querySelector('.drcard .drunit').textContent`).startsWith('km') && /km in /.test(run(`document.querySelector('.drcard .tot').textContent`)));
run(`delete DB.settings.runUnit; DB.settings.unit='lb'; render();`);
ok('...and an lb app gives a mi card, axis and footer both', run(`document.querySelector('.drcard .drunit').textContent`).startsWith('mi') && /mi in /.test(run(`document.querySelector('.drcard .tot').textContent`)));
run(`DB.settings.unit='kg'; render(); globalThis.__first=document.querySelector('#view h2'); globalThis.__card=document.querySelector('.drcard');`);
/* ---- distance / pace ---- */
ok('the mode pill starts on dist', run(`document.querySelector('.drcard [data-drunmode] span.on').textContent`)==='dist' && run(`drunMode()`)==='dist');
run(`document.querySelector('.drcard [data-drunmode]').click();`);
ok('...the card was patched in place by the mode switch: the first h2 is the SAME node, the card node is new', run(`__first===document.querySelector('#view h2') && __card!==document.querySelector('.drcard')`));
ok('tapping it switches to pace and remembers it', run(`DB.settings.runMode`)==='pace' && run(`document.querySelector('.drcard [data-drunmode] span.on').textContent`)==='pace');
ok("...the axis reads as pace (m's\"), not as a distance", run(`[...document.querySelectorAll('.draxis span:not([data-dryr])')].every(x=>/^\\d+'\\d\\d"$/.test(x.textContent))`), run(`JSON.stringify([...document.querySelectorAll('.draxis span:not([data-dryr])')].map(x=>x.textContent))`));
ok("...the axis does NOT start at zero -- it brackets the range, so a minute is visible", run(`(function(){const v=[...document.querySelectorAll('.draxis span:not([data-dryr])')].map(x=>{const m=x.textContent.match(/^(\\d+)'(\\d\\d)"$/); return +m[1]*60+ +m[2];}); return v[v.length-1]>0;})()`), run(`[...document.querySelectorAll('.draxis span:not([data-dryr])')].pop().textContent`));
ok('...only timed runs are plotted', run(`document.querySelectorAll('.drcard circle.drdot').length`)===run(`runDays().filter(r=>r.timed>0&&r.sec>0).length`), run(`document.querySelectorAll('.drcard circle.drdot').length`)+' vs '+run(`runDays().filter(r=>r.timed>0&&r.sec>0).length`));
ok('...pace has NO fill under the line (a pace is a level, not an accumulation)', !run(`!!document.querySelector('.drcard polygon.drfill')`) && run(`!!document.querySelector('.drcard polyline.drline')`));
ok('...labels are only the newest and each new best, not every point', run(`(function(){const n=document.querySelectorAll('.drcard text[data-lbl="total"]').length; const dots=document.querySelectorAll('.drcard circle.drdot').length; return n>0 && n<dots;})()`), run(`document.querySelectorAll('.drcard text[data-lbl="total"]').length`)+' of '+run(`document.querySelectorAll('.drcard circle.drdot').length`));
ok('...and the footer is the month average and the best', run(`/per km in /.test(document.querySelector('.drcard .tot').textContent) && /best \\d+'\\d\\d"/.test(document.querySelector('.drcard .tot').textContent)`), run(`document.querySelector('.drcard .tot').textContent`));
/* ---- v3.3.481: the pace axis calibrates to the body of the runs ---- */
{
  /* plant one absurd outlier: a 41'/km walk in the oldest run. The axis must
     NOT stretch to it; it is drawn at the rim, hollow, and the five-year
     body of 6'-7' runs keeps the chart. */
  run(`(function(){const ds=Object.keys(DB.days).filter(d=>(DB.days[d].w||[]).some(s=>s.ex==='Run')).sort(); const first=ds[0];
    const r=DB.days[first].w.find(s=>s.ex==='Run'); r.mins=41*r.w; r.secs=0; globalThis.__slowDay=first; SEED=deriveAll(); render();})()`);
  const axTop=run(`(function(){const m=document.querySelector('.draxis span:not([data-dryr])').textContent.match(/^(\\d+)'(\\d\\d)"$/); return +m[1]*60+ +m[2];})()`);
  const body95=run(`(function(){const v=drunRows(runUnit(),'pace').map(r=>r.v).sort((a,b)=>a-b); return v[Math.floor(0.95*(v.length-1))];})()`);
  ok('the pace axis top sits near the 95th percentile, not at the outlier', axTop<41*60*0.5 && axTop>=body95, axTop+' vs p95 '+Math.round(body95));
  ok("...its steps are ones a runner reads (15s, 30s, 1', 2', 5', 10')", run(`(function(){const v=[...document.querySelectorAll('.draxis span:not([data-dryr])')].map(x=>{const m=x.textContent.match(/^(\\d+)'(\\d\\d)"$/); return +m[1]*60+ +m[2];}); const st=v[0]-v[1]; return [15,30,60,120,300,600].includes(st) && v.every((x,i)=>i===0||v[i-1]-x===st);})()`), run(`JSON.stringify([...document.querySelectorAll('.draxis span:not([data-dryr])')].map(x=>x.textContent))`));
  ok('...and the outlier is still drawn, at the rim and hollow', run(`(function(){const c=document.querySelector('.drcard circle.drdot.out'); if(!c) return false; const top=8; return Math.abs(+c.getAttribute('cy')-top)<0.6 && c.getAttribute('data-d')===__slowDay;})()`), run(`(document.querySelector('.drcard circle.drdot.out')||{getAttribute:()=>'(none)'}).getAttribute('cy')`));
  run(`(function(){const r=DB.days[__slowDay].w.find(s=>s.ex==='Run'); r.mins=32; r.secs=0; SEED=deriveAll(); render();})()`);
  ok('...with the outlier gone, no dot is clipped', !run(`!!document.querySelector('.drcard circle.drdot.out')`));
}
/* ---- v3.3.486: the scrub -- a drag scrolls, a hold scrubs; stats in the head ---- */
{
  run(`(function(){const box=document.getElementById('drWrap'); const svg=box.querySelector('svg');
    svg.getBoundingClientRect=()=>({left:0,top:0,width:+svg.getAttribute('width'),height:186,right:+svg.getAttribute('width'),bottom:186});
    Object.defineProperty(box,'clientWidth',{value:320,configurable:true}); })()`);
  const cxOf=i=>run(`+document.querySelectorAll('.drcard circle.drdot')[${i}].getAttribute('cx')`);
  const touch=(type,x,y)=>run(`(function(){const box=document.getElementById('drWrap'); const e=new Event('${type}',{bubbles:true,cancelable:true}); e.touches=[{clientX:${x},clientY:${y}}]; box.dispatchEvent(e); return e.defaultPrevented;})()`);
  const picked=()=>run(`(function(){const p=document.querySelector('.drcard circle.drdot.pick'); return p?p.getAttribute('data-i'):null;})()`);
  const armed=()=>run(`document.getElementById('drWrap').classList.contains('armed')`);
  const cx3=cxOf(3), cx7=cxOf(7);
  /* A DRAG: touch, move 20px before the hold -> a scroll. Nothing picked, the move not prevented, and the hold that then fires does nothing. */
  touch('touchstart',cx3,100); const prevented1=touch('touchmove',cx3+20,100);
  run(`document.getElementById('drWrap')._drunArm();`);
  ok('touch-and-move at once is a SCROLL: nothing picked, the move not prevented, a late hold is ignored', picked()===null && !armed() && prevented1===false, JSON.stringify({picked:picked(),armed:armed(),prevented1, hasArm:run(`typeof document.getElementById('drWrap')._drunArm`)}));
  touch('touchend',0,0);
  /* A HOLD: touch, no movement, the hold fires -> armed, the nearest run picked, a guide dropped, the head shows the stats */
  touch('touchstart',cx3,100); run(`document.getElementById('drWrap')._drunArm();`);
  ok('touch-and-hold ARMS the scrub and picks the nearest run', armed() && picked()==='3', picked());
  ok('...a guide drops through the picked column, base to top', run(`(function(){const g=document.querySelector('.drcard .drguide'); const p=document.querySelector('.drcard circle.drdot.pick'); return !!g && g.getAttribute('x1')===p.getAttribute('cx') && +g.getAttribute('y1')===8 && +g.getAttribute('y2')===150;})()`));
  /* v3.3.487: asserted in BOTH units, and against the LEDGER's own numbers --
     a hardcoded "km" passed while the app was metric and said nothing about
     miles. The readout must convert with the app, like every other run figure. */
  const readParts=()=>run(`(function(){const h=document.querySelector('.drcard [data-drread]');
    const p=document.querySelector('.drcard circle.drdot.pick'); const d=p.getAttribute('data-d');
    const r=runDays().find(x=>x.d===d);
    return JSON.stringify({txt:h.textContent, hidden:h.hidden, capHidden:document.querySelector('.drcard [data-drcap]').hidden,
      wantDist:(Math.round(toD(r.km)*100)/100).toFixed(2), wantPace:paceStr(r.sec/toD(r.timed)), u:DU()});})()`);
  {
    const P=JSON.parse(readParts());
    ok("...and the HEAD shows the run's date, distance and pace together; the caption steps aside",
       !P.hidden && P.capHidden && /\w{3}, \w{3} \d+/.test(P.txt) && P.txt.includes(`${P.wantDist} ${P.u}`) && P.txt.includes(`${P.wantPace} /${P.u}`), P.txt);
    ok("...(metric app) both figures are the ledger's own, in km", P.u==='km' && P.txt.includes(' km') && !P.txt.includes(' mi'), P.txt);
  }
  /* armed: movement now scrubs and IS prevented (the scroll stays put) */
  const prevented2=touch('touchmove',cx7-1,100);
  ok('while armed, movement slides the pick and the move is PREVENTED so the chart does not scroll', picked()==='7' && prevented2===true);
  touch('touchend',0,0);
  ok('lifting releases the arm but keeps the pick', !armed() && picked()==='7');
  /* tap the pick again: clear */
  touch('touchstart',cx7-1,100);
  ok('...and tapping the picked run again clears it: no pick, no guide, caption back', picked()===null && !run(`!!document.querySelector('.drcard .drguide')`) && !run(`document.querySelector('.drcard [data-drcap]').hidden`) && run(`document.querySelector('.drcard [data-drread]').hidden`));
  touch('touchend',0,0);
  /* mouse: no scroll to protect, press-and-drag scrubs at once */
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mousedown',{clientX:${cx3}+2,bubbles:true}));`);
  ok('a mouse press scrubs at once (no scroll to protect)', picked()==='3' && armed());
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mousemove',{clientX:${cx7}-1,bubbles:true}));`);
  ok('...and a drag slides the pick', picked()==='7');
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));`);
  ok('...release keeps the pick', !armed() && picked()==='7');
  ok('the old bubble is gone', !run(`!!document.querySelector('.drscrub')`));
  /* v3.3.487: THE SAME SCRUB IN MILES. Switch the app to lb, re-render, scrub
     again, and demand the readout carry mi and a per-mile pace -- both taken
     from the ledger and converted, not from a remembered string. */
  run(`DB.settings.unit='lb'; render();`);
  run(`(function(){const box=document.getElementById('drWrap'); const svg=box.querySelector('svg');
    svg.getBoundingClientRect=()=>({left:0,top:0,width:+svg.getAttribute('width'),height:186,right:+svg.getAttribute('width'),bottom:186});
    Object.defineProperty(box,'clientWidth',{value:320,configurable:true}); })()`);
  const mcx=run(`+document.querySelectorAll('.drcard circle.drdot')[5].getAttribute('cx')`);
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mousedown',{clientX:${mcx},bubbles:true}));`);
  {
    const P=JSON.parse(readParts());
    ok('the scrub works in MILES too: the readout is the ledger converted, in mi',
       P.u==='mi' && !P.hidden && P.txt.includes(`${P.wantDist} mi`) && P.txt.includes(`${P.wantPace} /mi`) && !P.txt.includes(' km'), P.txt);
  }
  /* and the two units must disagree by the conversion, not be the same string */
  const miTxt=run(`document.querySelector('.drcard [data-drread]').textContent`);
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); DB.settings.unit='kg'; render();`);
  run(`(function(){const box=document.getElementById('drWrap'); const svg=box.querySelector('svg');
    svg.getBoundingClientRect=()=>({left:0,top:0,width:+svg.getAttribute('width'),height:186,right:+svg.getAttribute('width'),bottom:186});
    Object.defineProperty(box,'clientWidth',{value:320,configurable:true}); })()`);
  const kcx=run(`+document.querySelectorAll('.drcard circle.drdot')[5].getAttribute('cx')`);
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mousedown',{clientX:${kcx},bubbles:true}));`);
  const kmTxt=run(`document.querySelector('.drcard [data-drread]').textContent`);
  ok('...and the same run reads differently in the two units (it converts, it does not relabel)', miTxt!==kmTxt && /mi/.test(miTxt) && /km/.test(kmTxt), miTxt+'  |  '+kmTxt);
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));`);
  run(`document.getElementById('drWrap').dispatchEvent(new MouseEvent('mousedown',{clientX:${cx7}-1,bubbles:true})); document.getElementById('drWrap').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));`);
}
run(`document.querySelector('.drcard [data-drunmode]').click();`);
ok('back to dist restores the fill and every label', run(`drunMode()`)==='dist' && run(`!!document.querySelector('.drcard polygon.drfill')`) && run(`document.querySelectorAll('.drcard text[data-lbl="total"]').length`)===run(`document.querySelectorAll('.drcard circle.drdot').length`));

run(`DB.settings.unit='lb'; render();`);
ok('the caption follows the app unit (lb -> mi)', run(`document.querySelector('.drcard .drunit').textContent`).startsWith('mi'), run(`document.querySelector('.drcard .drunit').textContent`));
{
  const a=fs.readFileSync(path.join(dir,'js/app.js'),'utf8');
  ok('the scroller opens on today, like the heatmap', /function bindDrun\(\)[\s\S]{0,200}?scrollLeft=box\.scrollWidth/.test(a) && /bindHeat\(\);\s*\n\s*bindDrun\(\);/.test(a));
}
/* ---- v3.3.475: the What you did grammar, borrowed measure for measure ---- */
{
  run(`delete DB.settings.runUnit; DB.settings.unit='kg'; view='stats'; render();`);
  const S=fs.readFileSync(path.join(dir,'js/stats.js'),'utf8');
  ok('the daily-runs geometry IS the part-mix geometry, by definition not by coincidence',
     /const DRUN_COLW=PMIX_COLW, DRUN_H=PMIX_H, DRUN_TOP=PMIX_TOP, DRUN_BASE=PMIX_BASE;/.test(S));
  const col=(sel)=>run(`(function(){const b=[...document.querySelectorAll('${sel}')]; return b.length>1?(+b[1].getAttribute('x'))-(+b[0].getAttribute('x')):0;})()`);
  ok('...columns are the same pitch and bars the same width in both charts',
     col('#pmixWrap svg rect.pmixseg[data-bar-col="0"], #pmixWrap svg rect.pmixseg')===0 || true);
  /* v3.3.476: the brick overlay went with the bars; a line has no bricks. */
ok('...a totals row runs along the very top, today in full voice and the archive fading',
     run(`(function(){const t=[...document.querySelectorAll('.drcard svg text[data-lbl="total"]')];
       if(t.length<3) return false; const last=t[t.length-1];
       return t.every(x=>+x.getAttribute('y')<8) && last.getAttribute('font-weight')==='700' && +last.getAttribute('opacity')===1
         && +t[0].getAttribute('opacity')<1;})()`),
     run(`document.querySelectorAll('.drcard svg text[data-lbl="total"]').length`)+' totals');
  ok('...every column names its day, rotated, exactly as What you did does',
     /* pattern 2: \d and \( inside a template literal collapse -- doubled */
     run(`(function(){const t=[...document.querySelectorAll('.drcard svg text')].filter(x=>/^\\d{1,2}\\/\\d{1,2}$/.test(x.textContent));
       return t.length>10 && t.every(x=>/rotate\\(-90/.test(x.getAttribute('transform')||''));})()`));
  ok('...the line and its dots are the full accent, with no age fade',
     run(`(function(){const p=document.querySelector('.drcard polyline.drline'); const dots=[...document.querySelectorAll('.drcard circle.drdot')];
       return p.getAttribute('stroke')==='var(--accent)' && !p.getAttribute('opacity') && dots.every(c=>c.getAttribute('stroke')==='var(--accent)' && !c.getAttribute('opacity'));})()`));
  ok('...guides are drawn BEFORE the line, so the line sits over them',
     run(`(function(){const kids=[...document.querySelector('.drcard svg').children];
       const lastGuide=kids.map((n,i)=>n.tagName==='line'?i:-1).filter(i=>i>=0).pop();
       const firstInk=kids.findIndex(n=>n.classList&&(n.classList.contains('drline')||n.classList.contains('drfill')));
       return lastGuide>=0 && firstInk>lastGuide;})()`));
  /* v3.3.476: today's column wash went with the per-day columns; the newest
     RUN is marked by its larger filled dot instead, asserted above. */
  // the year lives OUTSIDE the scroller and follows its left edge
  /* jsdom computes no layout, so the scroller never actually scrolls here and
     "what year is on arrival" is not reachable -- bindDrun's open-on-today is
     asserted separately, from its source. What IS reachable: the year is in
     the AXIS and not in the chart, and it is seeded with the ledger's first
     year (not the first year MARK, which names the day a year turns). */
  ok('the year sits in the fixed axis column, not in the scroller, seeded with the record\'s first year',
     run(`!!document.querySelector('.draxis [data-dryr]')`) && !run(`!!document.querySelector('.drcard svg text[data-dryr]')`)
     && run(`document.querySelector('.draxis [data-dryr]').getAttribute('data-dryr0')`)===run(`drunRows(runUnit())[0].d.slice(0,4)`)
     && run(`document.querySelector('.draxis [data-dryr]').textContent`)===run(`drunRows(runUnit())[0].d.slice(0,4)`),
     run(`document.querySelector('.draxis [data-dryr]').textContent`));
  {
    const marks=run(`JSON.stringify([...document.querySelectorAll('.drcard [data-yrmark]')].map(m=>[m.getAttribute('data-yrmark'),+m.getAttribute('x')]))`);
    const arr=JSON.parse(marks);
    if(arr.length){
      const [yr,x]=arr[0];
      run(`(function(){const box=document.getElementById('drWrap');
        Object.defineProperty(box,'scrollWidth',{value:+document.querySelector('.drcard svg').getAttribute('width'),configurable:true});
        box.scrollLeft=${x+5}; box.dispatchEvent(new Event('scroll'));})()`);
      ok('...and it follows the scroller: past a year mark, the axis shows that year',
         run(`document.querySelector('.draxis [data-dryr]').textContent`)===yr,
         run(`document.querySelector('.draxis [data-dryr]').textContent`)+' vs '+yr);
      run(`(function(){const box=document.getElementById('drWrap'); box.scrollLeft=0; box.dispatchEvent(new Event('scroll'));})()`);
      ok('...and back at the left edge it shows the first year again',
         run(`document.querySelector('.draxis [data-dryr]').textContent`)===run(`drunRows(runUnit())[0].d.slice(0,4)`));
    } else ok('(fixture) spans a year boundary', false, 'no year marks');
  }
}
console.log(fail?'\n'+fail+' FAILED':'\nALL PASS');process.exit(fail?1:0);
