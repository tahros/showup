// v4.6.200: "Unselect all" on the Dates step. Real Chromium, real taps.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]])for(const theme of ['light','dark']){const tag=`${theme} ${w}:`;
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,serviceWorkers:'block',hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
 await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
 await p.evaluate(async theme=>{
  const LB=2.20462,days={},add=(d,part,ex,lb,reps)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:lb/LB,reps,at:Date.parse(d+'T18:00')});};
  for(const d of ['2026-10-01','2026-10-02'])add(d,'Chest','Barbell Bench Press',135,[8,8,8,8]);
  DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-03';checkDate=()=>false;
  document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();save=()=>{};
  const ds=window.__ds=['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10'];
  DB.week={days:{}};for(const d of ds)DB.week.days[d]={d,part:'Chest',title:'Chest',items:[{ex:'Barbell Bench Press',lines:[{w:61,reps:[8,8,8,8]}]}],text:'Barbell Bench Press\n  135 lb × 8 8 8 8'};
  window.__saved=JSON.stringify(DB.week);
  view='today';render();await new Promise(r=>setTimeout(r,400));
  pwOpen(ds[0]);const s=pw();s.dates=ds.slice();s.month='2026-10-01';pfState().page='dates';pwRender();await new Promise(r=>setTimeout(r,700));scrollTo(0,0);
 },theme);
 const m=()=>p.evaluate(()=>{const R=e=>e.getBoundingClientRect(),row=document.querySelector('.pf-selection'),u=document.querySelector('[data-pw="pf-unselect"]'),st=row.querySelector('strong');
  return {text:row.textContent.replace(/\s+/g,' ').trim(),btn:u?{l:R(u).left,r:R(u).right,h:R(u).height,label:u.textContent.trim()}:null,row:{l:R(row).left,r:R(row).right,h:R(row).height},strongR:R(st).right,sel:document.querySelectorAll('.pf-calendar .selected').length,dates:pw().dates.length,
   breakdown:document.querySelector('.pf-date-breakdown').textContent,disabled:[...document.querySelectorAll('.pf-date-actions .pw-btn,.pf-date-secondary .pw-btn')].filter(x=>x.disabled).length,vw:innerWidth,sw:document.documentElement.scrollWidth,saved:JSON.stringify(DB.week)===window.__saved};});
 let x=await m();
 ok(`${tag} six days selected: the line reads count, range, Unselect all`,/^6 days selected· Oct 5 – Oct 10Unselect all$/.test(x.text)&&x.sel===6,x);
 ok(`${tag} the control sits at the right end of the line, inside it, clear of the text`,!!x.btn&&x.btn.r<=x.row.r+0.5&&x.btn.l>=x.strongR-0.5&&x.btn.h>=28,x);
 ok(`${tag} nothing overflows the screen`,x.sw<=x.vw,x);
 if(w===402)await p.screenshot({path:`../unselect-${theme}.png`});
 await p.tap('[data-pw="pf-unselect"]');await p.waitForTimeout(500);x=await m();
 ok(`${tag} one tap clears every day`,x.dates===0&&x.sel===0,x);
 ok(`${tag} the line asks for dates again and the control is gone`,x.text==='Choose dates above'&&!x.btn&&/Select dates/.test(x.breakdown),x);
 ok(`${tag} saved plans are untouched`,x.saved,x);
 const marks=await p.evaluate(()=>document.querySelectorAll('.pf-calendar [aria-label$="plan saved"]').length);
 ok(`${tag} the six days still show their saved-plan mark`,marks>=6,marks);
 await p.tap(`.pf-calendar [data-date="2026-10-06"]`);await p.waitForTimeout(400);x=await m();
 ok(`${tag} pick one day again: 1 day selected, the control is back`,/^1 day selected· Oct 6Unselect all$/.test(x.text)&&!!x.btn,x);
 ok(`${tag} no page errors`,!errors.length,errors);
 await p.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
