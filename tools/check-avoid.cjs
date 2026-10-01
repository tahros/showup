/* check-avoid.cjs -- v4.6.174: Include / Avoid, on the real app. The maker's
   case: Romanian Deadlift and Standing Calf Raise avoided. Light and dark, at
   320 and 402px: the exercise screen's control and banner; a saved plan's
   flagged rows (two swaps where they exist, Remove always), the swap and its
   Undo; Settings' Avoided exercises card and Include; Train's Avoided section
   at the bottom. Nothing overflows; no page errors. Screenshots at 402 light.
   Nothing is logged to a real record. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
const SEED=theme=>{
  const LB=2.20462,today='2026-10-01',days={};
  const H=[['Legs','Squat',245,[6,6,6,6],7,3],['Legs','Dumbbell Lunge',50,[8,8,8],7,3],['Legs','Standing Calf Raise',45,[12,12,12],10,20],['Legs','Leg Extension',110,[12,12,12],10,16],['Legs','Romanian Deadlift',185,[8,8,8],14,20],['Legs','Lying Leg Curl',90,[12,12,12],12,9],['Legs','Seated Leg Curl',80,[12,12],30,40],['Sixpack','Hanging Leg Raise',0,[10,10],5,3]];
  for(const [part,ex,lb,reps,every,ago] of H)for(let d=ago;d<=120;d+=every){const dt=new Date(today+'T12:00');dt.setDate(dt.getDate()-d);const iso=dt.toLocaleDateString('en-CA');(days[iso]=days[iso]||{w:[]}).w.push({part,ex,w:lb/LB,bw:lb===0,reps:reps.slice(),at:dt.getTime()});}
  DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still',name:'Sungjee'}};
  todayISO=today;checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();setExPref('Romanian Deadlift','avoid');setExPref('Standing Calf Raise','avoid');SEED=deriveAll();applyTheme();
};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+g));if(!c)bad++;};
  try{
  for(const theme of ['light','dark'])for(const width of [320,402]){
    const tag=`${theme} ${width}:`,shots=theme==='light'&&width===402;
    const p=await b.newPage({viewport:{width,height:874},deviceScaleFactor:2,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    await p.evaluate(`(${SEED})('${theme}')`);
    const fits=()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.xp-row,.xp-banner,.xp-flag,.xp-swap,.xp-list .xp-item')].every(e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth+.5&&r.left>=-.5;}));
    /* 1. the exercise screen */
    await p.evaluate(async()=>{view='lift';lift={part:'Legs',ex:'Romanian Deadlift',weight:185/2.20462};lift.reps=8;render();for(let i=0;i<30&&!document.querySelector('#view .xp-row');i++)await new Promise(r=>setTimeout(r,100));});
    let r=await p.evaluate(()=>({banner:!!document.querySelector('#view .xp-banner'),bannerFirst:document.querySelector('#view').firstElementChild?.classList.contains('xp-banner')||document.querySelector('#view .xp-banner')?.nextElementSibling?.classList.contains('zone'),avoidOn:document.querySelector('[data-expref="avoid"]')?.getAttribute('aria-pressed'),add:!!document.querySelector('#view .zone')}));
    ok(`${tag} exercise screen: Avoided banner above logging, Avoid pressed`,r.banner&&r.bannerFirst&&r.avoidOn==='true'&&r.add,JSON.stringify(r));
    ok(`${tag} ...fits`,await fits());
    if(shots){await p.screenshot({path:'../avoid-1-exercise-top.png'});await p.evaluate(()=>{const m=document.querySelector('.xp-row');window.scrollTo(0,m.getBoundingClientRect().top+scrollY-480);});await wait(300);await p.screenshot({path:'../avoid-1-exercise-control.png'});}
    /* v4.6.177: the switch holds still -- no re-render, the note's height is
       given back -- and its thumb slides (a transform transition, not a jump) */
    await p.evaluate(()=>{const m=document.querySelector('.xp-row');window.scrollTo(0,m.getBoundingClientRect().top+scrollY-480);});await wait(200);
    const hold=async sel=>{const a=await p.evaluate(()=>document.querySelector('.xp-seg').getBoundingClientRect().top);const same=await p.evaluate(s=>{const seg=document.querySelector('.xp-seg');seg.__k=1;document.querySelector(s).click();return document.querySelector('.xp-seg').__k===1;},sel);await wait(500);const z=await p.evaluate(()=>document.querySelector('.xp-seg').getBoundingClientRect().top);return {moved:Math.round(Math.abs(z-a)*10)/10,same};};
    let h1=await hold('.xp-row [data-expref="include"]');
    ok(`${tag} Include from the switch: it holds still (no re-render)`,h1.moved<=1&&h1.same&&await p.evaluate(()=>!isAvoided('Romanian Deadlift')&&!document.querySelector('#view .xp-banner')),JSON.stringify(h1));
    let h2=await hold('.xp-row [data-expref="avoid"]');
    ok(`${tag} Avoid from the switch: it holds still while the note appears`,h2.moved<=1&&h2.same&&await p.evaluate(()=>isAvoided('Romanian Deadlift')&&!!document.querySelector('#view .xp-banner')),JSON.stringify(h2));
    r=await p.evaluate(()=>{const seg=document.querySelector('.xp-seg'),cs=getComputedStyle(seg,'::before');return {state:seg.dataset.state,tr:cs.transitionProperty,tf:cs.transform,bg:cs.backgroundColor};});
    ok(`${tag} the thumb slides and turns charcoal (or slate in dark)`,r.state==='avoid'&&/transform/.test(r.tr)&&r.tf!=='none'&&(theme==='light'?r.bg==='rgb(44, 44, 44)':r.bg==='rgb(230, 231, 236)'),JSON.stringify(r));
    await p.evaluate(()=>window.scrollTo(0,0));await wait(150);
    await p.evaluate(()=>document.querySelector('.xp-banner [data-expref="include"]').click());await wait(200);
    ok(`${tag} Include clears it in place`,await p.evaluate(()=>!isAvoided('Romanian Deadlift')&&!document.querySelector('#view .xp-banner')&&document.querySelector('.xp-seg').dataset.state==='include'&&document.querySelector('.xp-seg [data-expref="include"]').getAttribute('aria-pressed')==='true'));
    await p.evaluate(()=>document.querySelector('[data-expref="avoid"]').click());await wait(200);
    ok(`${tag} Avoid sets it again`,await p.evaluate(()=>isAvoided('Romanian Deadlift')&&!!document.querySelector('#view .xp-banner')&&document.querySelector('.xp-seg').dataset.state==='avoid'));
    /* 2. a saved plan */
    await p.evaluate(async()=>{view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-02';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead('Squat\n  245 lb × 6 6 6 6\nRomanian Deadlift\n  185 lb × 8 8 8\nStanding Calf Raise\n  45 lb × 12 12 12\nHanging Leg Raise\n  BW × 15 15 15');x.parts=['Legs','Sixpack'];x.locks=[];x.source='Saved plan';s.active=d;s.step='edit';pfState().page='edit';pwRender();await new Promise(r=>setTimeout(r,500));});
    r=await p.evaluate(()=>{const f=[...document.querySelectorAll('.xp-flag')];return {flags:f.length,rdl:f[0]&&[...f[0].querySelectorAll('.xp-swap strong')].map(e=>e.textContent),calf:f[1]&&[...f[1].querySelectorAll('.xp-swap strong')].map(e=>e.textContent),lead:f.map(x=>x.querySelector('p').textContent)};});
    ok(`${tag} plan: both avoided rows flagged; RDL → Lying Leg Curl, Seated Leg Curl, Remove`,r.flags===2&&JSON.stringify(r.rdl)===JSON.stringify(['Lying Leg Curl','Seated Leg Curl','Remove from this day']),JSON.stringify(r));
    ok(`${tag} ...calves → Seated Calf Raise (new to you), Remove`,JSON.stringify(r.calf)===JSON.stringify(['Seated Calf Raise','Remove from this day'])&&/only other calf lift is new to you/.test(r.lead[1]),JSON.stringify(r));
    ok(`${tag} ...fits`,await fits());
    if(shots){await p.evaluate(()=>{document.getElementById('toast')?.classList.remove('show');const t=document.getElementById('toast');if(t)t.style.opacity='0';const a=document.querySelectorAll('article.pw-exercise')[1];window.scrollTo(0,a.getBoundingClientRect().top+scrollY-150);});await wait(300);await p.screenshot({path:'../avoid-2-plan.png'});}
    await p.evaluate(()=>document.querySelector('.xp-flag .xp-swap.first').click());await wait(400);
    r=await p.evaluate(()=>({rows:pwDay(pw().active).rows.map(x=>x.ex),was:document.querySelector('.xp-was')?.textContent||''}));
    ok(`${tag} Swap: Lying Leg Curl takes the row, the rest stays, "swapped from" shows`,JSON.stringify(r.rows)===JSON.stringify(['Squat','Lying Leg Curl','Standing Calf Raise','Hanging Leg Raise'])&&/swapped from Romanian Deadlift/.test(r.was),JSON.stringify(r));
    if(shots){await p.evaluate(()=>{const a=document.querySelectorAll('article.pw-exercise')[1];window.scrollTo(0,a.getBoundingClientRect().top+scrollY-150);});await wait(300);await p.screenshot({path:'../avoid-2-plan-swapped.png'});}
    await p.evaluate(()=>document.querySelector('.xp-was .xp-undo').click());await wait(300);
    ok(`${tag} Undo puts Romanian Deadlift back`,await p.evaluate(()=>pwDay(pw().active).rows[1].ex==='Romanian Deadlift'&&!!document.querySelectorAll('.xp-flag').length));
    /* 3. Settings */
    await p.evaluate(async()=>{lift.plan=null;view='sync';render();await new Promise(r=>setTimeout(r,500));const h=[...document.querySelectorAll('#view h2')].find(h=>/Avoided exercises/.test(h.textContent));window.scrollTo(0,h.getBoundingClientRect().top+scrollY-140);});await wait(300);
    r=await p.evaluate(()=>({rows:[...document.querySelectorAll('.xp-list .xp-item strong')].map(e=>e.textContent),subs:[...document.querySelectorAll('.xp-list .xp-item small')].map(e=>e.textContent),sum:document.getElementById('view').textContent.includes('2 exercises avoided')}));
    ok(`${tag} Settings: two avoided, with body part and muscle; summary agrees`,r.rows.length===2&&r.subs.every(s=>/^Legs · (hamstrings|calves) · since/.test(s))&&r.sum,JSON.stringify(r));
    ok(`${tag} ...fits`,await fits());
    if(shots){await wait(1500);await p.screenshot({path:'../avoid-3-settings.png'});}
    /* 4. Train */
    await p.evaluate(async()=>{view='lift';lift={part:'Legs',ex:null};render();await new Promise(r=>setTimeout(r,600));});
    r=await p.evaluate(()=>{const hs=[...document.querySelectorAll('#view h2')].map(h=>h.textContent.trim());const av=document.querySelectorAll('#view .xp-dim .logmain');return {last:hs.at(-1),av:[...av].map(b=>b.dataset.ex),goto:[...document.querySelectorAll('#view .flow-goto .logmain, #view .gotohead ~ * .logmain')].map(b=>b.dataset.ex).filter(x=>x==='Romanian Deadlift').length};});
    ok(`${tag} Train: Avoided is the last section, with both, tagged`,r.last==='Avoided'&&r.av.length===2&&r.av.includes('Romanian Deadlift'),JSON.stringify(r));
    ok(`${tag} ...fits`,await fits());
    if(shots){await p.evaluate(()=>{const h=[...document.querySelectorAll('#view h2')].at(-1);window.scrollTo(0,h.getBoundingClientRect().top+scrollY-420);});await wait(300);await p.screenshot({path:'../avoid-4-train.png'});}
    if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL avoid (${bad})`:'PASS avoid');process.exit(bad?1:0);
})();
