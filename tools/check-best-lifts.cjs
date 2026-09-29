/* check-best-lifts.cjs -- v4.6.163: Best lifts on Progress (the big three).
   Opens the real app in Chromium, light and dark, at 320 and 402px, and checks
   the rules agreed with the maker:
   - actuals only: the heaviest weight lifted, with its reps (235 x 6, not an estimate);
   - the last 12 months: a 315 x 1 from 2022 is an "all-time" line, not the headline,
     and not in the total;
   - a slot takes the nearest barbell variant with a tag (Incline), never a machine;
   - a lift with nothing in 12 months shows "-" and when it was last done;
   - the Big 3 total adds the window bests and says what it holds;
   - weights and the total share one right edge; nothing overflows;
   - tapping a row opens that lift in the strength chart;
   - no big-three history at all: no card. kg shows kg.
   Nothing is logged. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
const LOGS={
  maker:[['2022-05-10','Deadlift','Back',315,[1]],['2022-05-10','Deadlift','Back',295,[3]],['2026-09-21','Deadlift','Back',235,[6,6]],['2026-08-10','Deadlift','Back',225,[6]],
         ['2026-09-02','Squat','Legs',225,[5,5]],['2026-07-02','Squat','Legs',215,[5]],['2026-09-18','Barbell Bench Press','Chest',205,[6]],['2026-09-11','Barbell Bench Press','Chest',205,[5]],
         ['2026-09-20','Leg Press','Legs',500,[10]]],
  incline:[['2026-09-02','Squat','Legs',225,[5]],['2026-09-24','Incline Barbell Bench Press','Chest',175,[8]],['2026-09-21','Deadlift','Back',235,[6]],['2025-06-01','Barbell Bench Press','Chest',215,[3]]],
  nosquat:[['2023-03-14','Squat','Legs',275,[5]],['2026-09-18','Barbell Bench Press','Chest',205,[6]],['2026-09-21','Deadlift','Back',235,[6]]],
  machine:[['2026-09-18','Flat Smith Machine Bench Press','Chest',225,[8]],['2026-09-21','Deadlift','Back',235,[6]]],
  none:[['2026-09-18','Lat Pulldown','Back',150,[10]]]
};
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)bad++;};
  try{
  const p=await b.newPage({viewport:{width:402,height:874},serviceWorkers:'block'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${PORT}/`);
  /* let the app finish its own start-up (it loads the saved record after the page
     loads) before the check puts its history in, or the first open can be overwritten */
  await p.waitForLoadState('networkidle');await p.waitForTimeout(600);
  const open=(log,theme='light',unit='lb')=>p.evaluate(async({log,theme,unit})=>{
    const LB=2.20462,days={};let k=0;
    for(const [d,ex,part,lb,reps] of log)for(const r of reps)(days[d]=days[d]||{w:[],lastAt:0,doneEx:[],donePart:[],doneAll:true,upd:1,sugX:{},planOpen:{}}).w.push({part,ex,w:lb/LB,reps:[r],at:Date.parse(d+'T18:00')+(k++)*6e4});
    DB={days,settings:{onboarded:true,unit,skin:'minimal',flow:'refined',theme,bar:theme,mascotMotion:'still'}};
    todayISO='2026-09-29';checkDate=()=>false;document.querySelector('#onb')?.remove();SEED=deriveAll();applyTheme();view='stats';render();
    for(let i=0;i<30&&!document.querySelector('.bl-card,.progression-section');i++)await new Promise(r=>setTimeout(r,100));   /* Progress paints a beat after render() */
    await new Promise(r=>setTimeout(r,120));
    const card=document.querySelector('.bl-card');if(!card)return {card:false,why:JSON.stringify({view,days:Object.keys(DB.days||{}).length,h2:[...document.querySelectorAll('#view h2')].map(h=>h.textContent.slice(0,18)),sec:(()=>{try{return bestLiftsSection().slice(0,40)}catch(e){return 'ERR '+e.message}})()})};
    const R=e=>e.getBoundingClientRect();
    const rows=[...card.querySelectorAll('.bl-row')].map(r=>({name:r.querySelector('strong').textContent,sub:r.querySelector('small').textContent,w:r.querySelector('b').textContent,reps:r.querySelector('i').textContent,right:Math.round(R(r.querySelector('b')).right),nameTop:Math.round(R(r.querySelector('strong')).top),wTop:Math.round(R(r.querySelector('b')).top)}));
    const t=card.querySelector('.bl-total');
    return {card:true,rows,total:t.querySelector('b').textContent,unit:t.querySelector('i').textContent,note:t.querySelector('small')?.textContent||'',totalRight:Math.round(R(t.querySelector('b')).right),
      head:document.querySelector('.bl-head')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,cardRight:Math.round(R(card).right),totalBandBottom:Math.round(R(t).bottom),cardBottom:Math.round(R(card).bottom-parseFloat(getComputedStyle(card).borderBottomWidth))};   /* inside the card's own border */
  },{log,theme,unit});
  for(const theme of ['light','dark'])for(const width of [320,402]){
    await p.setViewportSize({width,height:874});
    const tag=`${theme} ${width}:`;
    let r=await open(LOGS.maker,theme);
    const row=n=>r.rows.find(x=>x.name.startsWith(n));
    ok(`${tag} the card is there, "Best lifts · last 12 months"`, r.card&&/Best lifts\s*last 12 months/.test(r.head), r.head||r.why);if(!r.card)continue;
    ok(`${tag} actuals: Deadlift 235 × 6 (this year), not 315 or an estimate`, row('Deadlift').w==='235'&&row('Deadlift').reps==='× 6', row('Deadlift').w+' '+row('Deadlift').reps);
    ok(`${tag} ...the 2022 best is the all-time line`, /Sep 21 · all-time 315 × 1 · 2022/.test(row('Deadlift').sub), row('Deadlift').sub);
    ok(`${tag} Squat 225 × 5 · Sep 2; Bench 205 × 6 · Sep 18 (more reps wins a tie)`, row('Squat').w==='225'&&row('Squat').reps==='× 5'&&row('Squat').sub==='Sep 2'&&row('Bench Press').w==='205'&&row('Bench Press').reps==='× 6'&&row('Bench Press').sub==='Sep 18');
    ok(`${tag} Big 3 total 665 lb, from this year's bests, no note`, r.total==='665'&&r.unit==='lb'&&r.note==='', r.total+' '+r.unit+' '+r.note);
    ok(`${tag} weights and total share one right edge`, new Set([...r.rows.map(x=>x.right),r.totalRight]).size===1, [...r.rows.map(x=>x.right),r.totalRight].join(','));
    ok(`${tag} values sit on the name's line`, r.rows.every(x=>Math.abs(x.nameTop-x.wTop)<=1));
    ok(`${tag} nothing overflows; the total band reaches the card's edge`, !r.overflow&&r.totalBandBottom===r.cardBottom, `${r.totalBandBottom} vs ${r.cardBottom}`);
    r=await open(LOGS.incline,theme);
    const bench=r.rows.find(x=>x.name.startsWith('Bench'));
    ok(`${tag} no flat bench this year: Incline fills the slot, tagged`, /Bench Press\s*Incline/.test(bench.name)&&bench.w==='175'&&/Sep 24 · no flat bench this year/.test(bench.sub), bench.name+' · '+bench.sub);
    ok(`${tag} ...the total says it includes Incline bench`, r.total==='635'&&/Includes Incline bench/.test(r.note), r.total+' · '+r.note);
    r=await open(LOGS.nosquat,theme);
    const sq=r.rows.find(x=>x.name.startsWith('Squat'));
    ok(`${tag} squat not in 12 months: "—" and when it was last done`, sq.w==='—'&&/Last: Mar 2023 · 275 × 5/.test(sq.sub), sq.w+' · '+sq.sub);
    ok(`${tag} ...the total leaves it out and says so`, r.total==='440'&&/Bench Press \+ Deadlift · no squat in 12 months/.test(r.note), r.total+' · '+r.note);
    r=await open([...LOGS.nosquat.filter(x=>x[1]!=='Barbell Bench Press'),['2026-09-24','Incline Barbell Bench Press','Chest',175,[8]]],theme);
    ok(`${tag} a missing lift and a stand-in: one sentence`, r.total==='410'&&r.note==='Incline bench + Deadlift · no squat in 12 months', r.total+' · '+r.note);
    r=await open(LOGS.machine,theme);
    const mb=r.rows.find(x=>x.name.startsWith('Bench'));
    ok(`${tag} a Smith machine never stands in for the bench`, mb.w==='—'&&/Not logged yet/.test(mb.sub)&&r.total==='235', mb.w+' · '+mb.sub+' · total '+r.total);
    r=await open(LOGS.none,theme);
    ok(`${tag} no big-three history: no card`, !r.card);
  }
  await p.setViewportSize({width:402,height:874});
  let r=await open(LOGS.maker,'light','kg');
  ok('kg: the card reads kg', r.unit==='kg'&&r.rows.find(x=>x.name==='Deadlift').w==='106.6', r.rows.map(x=>x.w).join(',')+' '+r.unit);
  await open(LOGS.maker,'light');
  await p.click('[data-bl-ex="Deadlift"]');await p.waitForTimeout(400);
  const chart=await p.evaluate(()=>({ex:progressionUI.stats?.ex,title:document.querySelector('.progression-section .progression-card')?.textContent.includes('Deadlift')}));
  ok('tapping Deadlift opens it in the strength chart', chart.ex==='Deadlift'&&chart.title, JSON.stringify(chart));
  if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
  }finally{await b.close();}
  console.log(bad?`FAIL best lifts (${bad})`:'PASS best lifts');process.exit(bad?1:0);
})();
