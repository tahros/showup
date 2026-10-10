// v4.6.258: while a plan is written the Edit page stays put: step tabs, the day chips (held still), and the writing panel in the day's own outline.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]])for(const theme of ['light','dark']){const tag=`${theme} ${w}:`;
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:SHOT?2:1,serviceWorkers:'block',hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
 await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
 await p.evaluate(async theme=>{
  DB={days:{'2026-10-03':{w:[{part:'Chest',ex:'Dip',w:0,reps:[8],at:1}]}},settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still',weekStart:'monday',objective:'grow',plannerPreferences:{avoid:[],trainDays:[1,2,3,4,5,6]}}};todayISO='2026-10-10';checkDate=()=>false;
  document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();save=()=>{};
  view='today';render();await new Promise(r=>setTimeout(r,300));pwOpen(null,'dates');
  const D=['2026-10-15','2026-10-16','2026-10-17'],P=[['Chest'],['Back'],['Sixpack','Chest']];
  pw().dates=D.slice();pw().book={};D.forEach((d,i)=>{const x=pwDay(d);x.parts=P[i].slice();x.partsPick=true;x.rows=pwRead('Barbell Bench Press\n  135 lb × 8 8 8');});pw().active='2026-10-17';pfAnchor();pfState().furthest=2;pfNavigate('edit');pwRender();await new Promise(r=>setTimeout(r,300));scrollTo(0,0);
  /* a writer that takes its time, and can be released */
  let open;const gate=new Promise(r=>open=r);window.__release=open;writeSession=async()=>{await gate;return {days:[{date:'2026-10-17',part:'Chest',title:'Chest',text:'Dip\n  BW × 10 10 10\n\nCable Fly Down\n  35 lb × 14 14 14'}],reason:null};};
 },theme);
 const look=()=>p.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)],r=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return [Math.round(b.top+scrollY),Math.round(b.height)];};
  return {busy:pw().busy,step:pw().step,steps:q('.pf-steps [data-stage]').length,strip:q('.pf-strip .pf-chip').map(c=>c.querySelector('u').textContent+(c.classList.contains('selected')?'*':'')).join('|'),stripR:r('.pf-strip'),legacy:!!document.querySelector('.pw-datebar,.pw-setup,.pw-tabs'),
   writing:!!document.querySelector('.pf-day-body.pf-writing .writing'),seen:(()=>{const e=document.querySelector('.pf-writing [data-pw="cancel"]');if(!e)return false;const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight-90;})(),stripSeen:(()=>{const e=document.querySelector('.pf-strip');return !!e&&e.getBoundingClientRect().top>=100;})(),chipsOff:q('.pf-strip button').every(b=>b.disabled),bodyR:r('.pf-day-body'),rows:q('.pw-exercises .pw-exercise strong').map(e=>e.textContent).join('+'),sw:document.documentElement.scrollWidth,vw:innerWidth};});
 const before=await look();
 await p.tap('[data-pw="pf-regenerate"],.pf-quiet-regenerate');await p.waitForTimeout(700);let d=await look();
 ok(`${tag} writing: the same Edit page -- step tabs, the day chips where they were (held still, Sat still the day), the writing panel inside the day's outline; nothing of the old planner`,d.busy&&d.steps===4&&d.strip===before.strip&&JSON.stringify(d.stripR)===JSON.stringify(before.stripR)&&!d.legacy&&d.writing&&d.seen&&d.stripSeen&&d.chipsOff&&d.sw<=d.vw,{before,d});
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/writing-${theme}.png`});
 await p.evaluate(()=>window.__release&&window.__release());await p.waitForFunction(()=>!pw().busy,null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(400);d=await look();
 ok(`${tag} written: the routine comes back in the same place, on the same day`,!d.busy&&d.step==='edit'&&d.strip.replace(/[^|*]+\*$/,'*')===before.strip.replace(/[^|*]+\*$/,'*')&&JSON.stringify(d.stripR)===JSON.stringify(before.stripR)&&/Dip/.test(d.rows)&&!d.legacy&&!d.chipsOff,{before,d});
 /* Cancel keeps the page too */
 await p.evaluate(()=>{writeSession=()=>new Promise(()=>{});});
 await p.tap('[data-pw="pf-regenerate"],.pf-quiet-regenerate');await p.waitForTimeout(500);
 await p.tap('.pf-writing [data-pw="cancel"]');await p.waitForTimeout(500);d=await look();
 ok(`${tag} Cancel: back to the routine, same page, same day`,!d.busy&&!d.writing&&!d.legacy&&/\*$/.test(d.strip)&&d.steps===4,d);
 ok(`${tag} no page errors`,!errors.length,errors);await p.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
