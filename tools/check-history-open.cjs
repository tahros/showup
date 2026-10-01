/* check-history-open.cjs -- v4.6.176: tapping an exercise (its name or a rep)
   in a History session opens that exercise in Train, scrolled to its history
   charts; Back returns to the same place in History. The maker's Fri Sep 25
   Legs day. Light and dark, 320 and 402px. Editing a day keeps its own taps.
   Nothing is logged to a real record. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+g));if(!c)bad++;};
  try{
  for(const theme of ['light','dark'])for(const width of [320,402]){
    const tag=`${theme} ${width}:`;
    const p=await b.newPage({viewport:{width,height:874},deviceScaleFactor:2,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    await p.evaluate(async theme=>{
      const LB=2.20462,days={},add=(d,part,ex,lb,reps)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:lb/LB,reps,at:Date.parse(d+'T18:00')+Object.keys(days).length});};
      for(const [d,f] of [['2026-09-25',1],['2026-09-17',.96],['2026-09-09',.93],['2026-08-30',.9],['2026-08-20',.88]]){add(d,'Legs','Squat',135,[12]);add(d,'Legs','Squat',Math.round(245*f/5)*5,[5,4,6,4]);add(d,'Legs','Romanian Deadlift',135,[6,4,7]);add(d,'Legs','Dumbbell Lunge',50,[6,6,6]);}
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();
      view='history';hist.y=2026;hist.m=8;render();await new Promise(r=>setTimeout(r,600));
    },theme);
    const hasHist=await p.evaluate(()=>!!document.querySelector('.exgrp.hx-open'));
    if(!hasHist){await p.evaluate(()=>{const b=document.querySelector('[data-progress-view="history"]');b&&b.click();});await wait(500);}
    let r=await p.evaluate(()=>({n:document.querySelectorAll('.exgrp.hx-open').length,first:document.querySelector('.exgrp.hx-open')?.dataset.ex,view}));
    ok(`${tag} History session blocks open their exercise`,r.n>=3&&r.first==='Squat',JSON.stringify(r));
    /* tap a rep chip of Romanian Deadlift, from partway down the page */
    const before=await p.evaluate(()=>{const g=[...document.querySelectorAll('.exgrp.hx-open')].find(x=>x.dataset.ex==='Romanian Deadlift');g.scrollIntoView({block:'center'});return scrollY;});
    await wait(200);
    await p.evaluate(()=>{const g=[...document.querySelectorAll('.exgrp.hx-open')].find(x=>x.dataset.ex==='Romanian Deadlift');(g.querySelector('.chip,.repchip,[class*="rep"]')||g.lastElementChild).click();});
    await wait(1600);
    r=await p.evaluate(()=>{const s=document.querySelector('#view .progression-section'),hdr=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'))||76;return {view,ex:lift.ex,charts:!!s,top:s?Math.round(s.getBoundingClientRect().top):null,hdr:Math.round(hdr),title:document.getElementById('hDate').textContent,y:Math.round(scrollY)};});
    ok(`${tag} a rep opens Romanian Deadlift in Train`,r.view==='lift'&&r.ex==='Romanian Deadlift'&&r.title==='Romanian Deadlift',JSON.stringify(r));
    ok(`${tag} ...scrolled so its history charts sit just under the header`,r.charts&&r.y>0&&r.top>=r.hdr-2&&r.top<=r.hdr+40,JSON.stringify(r));
    ok(`${tag} ...nothing overflows`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(theme==='light'&&width===402)await p.screenshot({path:'../history-open-charts.png'});
    await p.evaluate(()=>document.querySelector('header .back').click());await wait(700);
    r=await p.evaluate(()=>({view,y:Math.round(scrollY),onPage:!!document.querySelector('.exgrp.hx-open')}));
    ok(`${tag} Back returns to History, at the same place`,r.onPage&&Math.abs(r.y-before)<=4,JSON.stringify({...r,before}));
    /* the exercise name works too */
    await p.evaluate(()=>[...document.querySelectorAll('.exgrp.hx-open .lasthead span')].find(x=>x.textContent==='Squat').click());await wait(1600);
    ok(`${tag} the name opens it too`,await p.evaluate(()=>view==='lift'&&lift.ex==='Squat'&&!!document.querySelector('#view .progression-section')&&scrollY>0));
    await p.evaluate(()=>document.querySelector('header .back').click());await wait(600);
    /* editing a day: its rows are the editor's */
    await p.evaluate(()=>{const e=document.querySelector('[data-hedit]');e&&e.click();});await wait(500);
    r=await p.evaluate(()=>{const d=document.querySelector('[data-hedit]')?.dataset.hedit;const card=[...document.querySelectorAll('.hset')];return {editing:card.length>0,open:document.querySelectorAll('details[open] .exgrp.hx-open').length,inEdit:[...document.querySelectorAll('.hset')].some(x=>x.closest('.hx-open'))};});
    ok(`${tag} while editing a day its rows do not navigate`,r.editing&&!r.inEdit,JSON.stringify(r));
    if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL history open (${bad})`:'PASS history open');process.exit(bad?1:0);
})();
