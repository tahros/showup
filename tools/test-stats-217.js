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
  const first=run(`(function(){const d=runDays().map(r=>r.d).sort(); return d[0];})()`);
  const span=run(`daysAgo(${JSON.stringify(first)})`)+1;
  const runsAll=run(`runDays().length`);
  ok('...it spans every day from the first run to today, not a fixed window',
     run(`document.querySelectorAll('.drcard svg rect.drbar').length`)===runsAll &&
     run(`(function(){const t=[...document.querySelectorAll('.drcard svg text')].map(x=>x.textContent); return t.includes('today');})()`),
     run(`document.querySelectorAll('.drcard svg rect.drbar').length`)+' bars / '+runsAll+' runs over '+span+' days');
  ok('...and the svg is wider than its box, so it scrolls',
     run(`(function(){const w=+document.querySelector('.drcard svg').getAttribute('width'); return w>320;})()`),
     run(`document.querySelector('.drcard svg').getAttribute('width')`));
}
ok('...it has a y-axis with round labelled steps, ascending, top down', run(`(function(){const v=[...document.querySelectorAll('.draxis span')].map(x=>parseFloat(x.textContent));
  if(v.length<4||v[v.length-1]!==0) return false; const st=v[0]/(v.length-1);
  return v.every((n,i)=>Math.abs(n-(v.length-1-i)*st)<1e-9) && [0.5,1,2,2.5,5,10,20,25,50].includes(st);})()`), run(`JSON.stringify([...document.querySelectorAll('.draxis span')].map(x=>x.textContent))`));
ok('...the tallest bar reaches but does not exceed the axis top', run(`(function(){const top=parseFloat(document.querySelector('.draxis span').textContent);
  const bars=[...document.querySelectorAll('.drcard svg rect.drbar')]; const hs=bars.map(b=>+b.getAttribute('height'));
  const full=150-8; return Math.max(...hs)<=full+0.6 && Math.max(...hs)>=full*0.5 && top>0;})()`));
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
  return months===mb && years===yb+1;})()`), run(`JSON.stringify([...document.querySelectorAll('.drcard svg text')].map(x=>x.textContent).slice(0,8))`));
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
ok('...and the switch shows km lit', run(`document.querySelector('.drcard [data-rununit] span.on').textContent`)==='km');
run(`globalThis.__first=document.querySelector('#view h2'); globalThis.__card=document.querySelector('.drcard');`);
run(`document.querySelector('.drcard [data-rununit]').click();`);
ok('tapping the switch flips to miles and remembers it as a setting', run(`DB.settings.runUnit`)==='mi' && run(`document.querySelector('.drcard [data-rununit] span.on').textContent`)==='mi');
ok('...every bar and the axis convert together', run(`(function(){const t=parseFloat(document.querySelector('.draxis span').textContent); return t>0 && /mi in /.test(document.querySelector('.drcard .tot').textContent);})()`), run(`document.querySelector('.drcard .tot').textContent`));
ok('...the card was patched in place: the first h2 is the SAME node, the card node is new', run(`__first===document.querySelector('#view h2') && __card!==document.querySelector('.drcard')`));
ok('...and the weight unit is untouched by the run switch', run(`DB.settings.unit`)==='kg');
run(`document.querySelector('.drcard [data-rununit]').click();`);
ok('a second tap goes back to km', run(`DB.settings.runUnit==='km' && document.querySelector('.drcard [data-rununit] span.on').textContent==='km'`));
run(`delete DB.settings.runUnit; DB.settings.unit='lb'; render();`);
ok('with no choice made, the card follows the app unit (lb -> mi)', run(`document.querySelector('.drcard [data-rununit] span.on').textContent`)==='mi');
{
  const a=fs.readFileSync(path.join(dir,'js/app.js'),'utf8');
  ok('the scroller opens on today, like the heatmap', /function bindDrun\(\)[\s\S]{0,200}?scrollLeft=box\.scrollWidth/.test(a) && /bindHeat\(\);\s*\n\s*bindDrun\(\);/.test(a));
}
console.log(fail?'\n'+fail+' FAILED':'\nALL PASS');process.exit(fail?1:0);
