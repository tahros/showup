// v4.6.212: Remove plan removes the day's saved plan AND its draft at once; the calendar shows nothing on that day; Undo puts it back.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{const p=await b.newPage({viewport:{width:402,height:874},deviceScaleFactor:SHOT?2:1,serviceWorkers:'block',hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
 await p.goto(`http://127.0.0.1:${PORT}/?theme=light`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
 await p.evaluate(async()=>{const LB=2.20462,D='2026-10-11',E='2026-10-06',doc=t=>{const rows=pwRead(t);return {...planItemsFrom(rows),raw:pwText(rows),title:'Chest'};};
  DB={days:{'2026-10-03':{w:[{part:'Chest',ex:'Barbell Bench Press',w:135/LB,reps:[8,8,8],at:1}]}},settings:{onboarded:true,unit:'lb',skin:'minimal',theme:'light',bar:'light',mascotMotion:'still',weekStart:'sunday',objective:'grow',plannerPreferences:{avoid:[]}}};todayISO='2026-10-05';checkDate=()=>false;
  document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();window.__saves=0;save=()=>{window.__saves++;};
  const t='Barbell Bench Press\n  135 lb × 8 8 8\n\nDip\n  BW × 8 8 8';DB.week={from:E,to:D,days:{[E]:doc(t),[D]:doc(t)},raw:'',at:1};
  view='today';render();await new Promise(r=>setTimeout(r,300));pw().dates=[D];pw().active=D;pwOpen(null,'dates');await new Promise(r=>setTimeout(r,400));
  /* a draft on top of the saved plan, as after an edit */
  pw().dates=[D];pw().active=D;const day=pwDay(D);day.rows=pwRead(t+'\n\nChest Fly\n  110 lb × 12 12 12');day.source='Your draft';pfAnchor();pfState().furthest=2;pfNavigate('edit');pwRender();await new Promise(r=>setTimeout(r,400));});
 const st=()=>p.evaluate(()=>{const D='2026-10-11',E='2026-10-06',cell=d=>{const c=document.querySelector(`.pf-workspace [data-date="${d}"]`);return c?{cls:c.className,icons:c.querySelectorAll('svg').length,label:c.getAttribute('aria-label')||''}:null;};
  return {page:pfState().page,saved:!!pwSaved(D),other:!!pwSaved(E),book:!!(pw().book&&pw().book[D]),draft:pfCalendarDraft(D),dates:pw().dates.slice(),cell:cell(D),cellE:cell(E),toast:document.querySelector('#toast').textContent,toastOn:document.querySelector('#toast').classList.contains('on'),saves:window.__saves,log:DB.days['2026-10-03'].w.length,stored:(()=>{try{return !!JSON.parse(localStorage.getItem(pwKey())).book[D];}catch(_){return null;}})()};});
 let d=await st();ok('before: Sunday has a saved plan and a draft on top of it',d.saved&&d.book&&d.page==='edit',d);
 await p.evaluate(()=>{pfHandle('pf-clear',{dataset:{}});pwRender();});await p.waitForTimeout(300);
 const ask=await p.evaluate(()=>({h3:document.querySelector('.pf-ask h3')?.textContent,note:document.querySelector('.pf-ask-note')?.textContent,btn:[...document.querySelectorAll('.pf-ask .pw-btn')].map(e=>e.textContent)}));
 ok('the question: one line, Cancel and Remove plan, and nothing about saving later',ask.h3==='Remove the plan for Sun, 10/11?'&&ask.note==='Your logged workouts stay.'&&ask.btn.join('|')==='Cancel|Remove plan',ask);
 await p.tap('.pf-ask [data-pw="pf-remove-day"]');await p.waitForTimeout(500);d=await st();
 ok('Remove plan: the saved plan is gone at once, stored, with no Save needed',!d.saved&&d.saves>=1&&d.page==='dates',d);
 ok('...and so is the draft: nothing kept for that day, on this visit or the next',!d.book&&!d.draft&&d.stored===false&&!d.dates.includes('2026-10-11'),d);
 ok('...the calendar shows Sunday with no icon at all (no Draft pencil, no Saved plan)',d.cell&&d.cell.icons===0&&!/draft|saved/i.test(d.cell.cls+' '+d.cell.label),d.cell);
 ok('...another day\'s plan and the log are untouched',d.other&&d.cellE.icons===1&&d.log===1,d);
 ok('...and a toast says so and offers undo',d.toastOn&&/^Plan removed · Sun, 10\/11 · undo$/.test(d.toast),d.toast);
 if(SHOT)await p.screenshot({path:`${SHOT}/remove-plan.png`});
 await p.tap('#toast');await p.waitForTimeout(500);d=await st();
 ok('undo: the saved plan and the draft are back, and the calendar marks the day again',d.saved&&d.book&&d.cell.icons===1,d);
 ok('no page errors',!errors.length,errors);await p.close();
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
