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

/* ================= v3.3.473: DAILY RUNS =================
   The fixture logs a run every third day back from today (i%3===0), km 4..7.
   Over the last 28 days that is days 0,3,...,27 -> 10 runs. The card must sit
   right after Running · month, draw one bar per run, sum in the chosen unit,
   and flip units in place -- the same card node, not a repaint. */
run(`DB.settings.unit='kg'; delete DB.settings.runUnit; view='stats'; render();`);
ok('Daily runs follows the Running month card', run(`(function(){const hs=[...document.querySelectorAll('h2')].map(h=>h.firstChild.textContent.trim()); const i=hs.findIndex(t=>/^Running/.test(t)); return i>=0 && hs[i+1]==='Daily runs';})()`));
ok('...ten bars for ten run days in the window', run(`document.querySelectorAll('.dailyruns svg rect').length`)===10, run(`document.querySelectorAll('.dailyruns svg rect').length`));
ok('...today is labelled and drawn at full ink; other days are lighter', run(`(function(){const t=[...document.querySelectorAll('.dailyruns svg text')].map(x=>x.textContent); const rects=[...document.querySelectorAll('.dailyruns svg rect')]; return t.includes('today') && rects.filter(r=>!r.getAttribute('opacity')).length===1 && rects.filter(r=>r.getAttribute('opacity')==='.55').length===9;})()`));
const kmTot=run(`(function(){let s=0; for(let i=0;i<28;i++){ if(i%3===0) s+=4+(i%4); } return s;})()`);
ok('...the total is the fixture sum in km when the app is metric and nothing is chosen', run(`document.querySelector('.dailyruns .tot b').textContent`)===(Math.round(kmTot*100)/100).toFixed(2) && /km in 28 days/.test(run(`document.querySelector('.dailyruns .tot').textContent`)), run(`document.querySelector('.dailyruns .tot').textContent`));
ok('...and the switch shows km lit', run(`document.querySelector('.dailyruns [data-rununit] span.on').textContent`)==='km');
run(`globalThis.__card=document.querySelector('.dailyruns'); globalThis.__first=document.querySelector('#view h2');`);
run(`document.querySelector('.dailyruns [data-rununit]').click();`);
ok('tapping the switch flips to miles and remembers it as a setting', run(`DB.settings.runUnit`)==='mi' && run(`document.querySelector('.dailyruns [data-rununit] span.on').textContent`)==='mi');
ok('...the total converts', Math.abs(parseFloat(run(`document.querySelector('.dailyruns .tot b').textContent`))-kmTot*0.621371)<0.02 && /mi in 28 days/.test(run(`document.querySelector('.dailyruns .tot').textContent`)), run(`document.querySelector('.dailyruns .tot b').textContent`));
ok('...the card was patched in place: the first h2 is the SAME node (no repaint), the card node is new', run(`__first===document.querySelector('#view h2') && __card!==document.querySelector('.dailyruns')`));
ok('...and the weight unit is untouched by the run switch', run(`DB.settings.unit`)==='kg');
run(`document.querySelector('.dailyruns [data-rununit]').click();`);
ok('a second tap goes back to km', run(`DB.settings.runUnit==='km' && document.querySelector('.dailyruns [data-rununit] span.on').textContent==='km'`));
run(`delete DB.settings.runUnit; DB.settings.unit='lb'; render();`);
ok('with no choice made, the card follows the app unit (lb -> mi)', run(`document.querySelector('.dailyruns [data-rununit] span.on').textContent`)==='mi');
console.log(fail?'\n'+fail+' FAILED':'\nALL PASS');process.exit(fail?1:0);
