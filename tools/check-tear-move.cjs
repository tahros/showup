// v4.6.256: hold a day's stub, it tears off; carry it under another day and the two days swap routines. Real Chromium, real drags.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
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
  const D=['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17'],P=[['Shoulder','Sixpack'],['Legs'],['Biceps','Triceps','Sixpack'],['Chest'],['Back'],['Shoulder']];
  const R={'2026-10-14':'EZ Bar Curl\n  65 lb × 12 12 12\n\nTriceps Pushdown\n  50 lb × 12 12 12','2026-10-16':'Lat Pulldown\n  120 lb × 10 10 10\n\nSeated Cable Row\n  110 lb × 10 10 10'};
  pw().dates=D.slice();pw().book={};D.forEach((d,i)=>{const x=pwDay(d);x.parts=P[i].slice();x.partsPick=true;x.rows=pwRead(R[d]||'');});pw().active='2026-10-14';pfAnchor();pfState().furthest=2;pfNavigate('edit');pwRender();await new Promise(r=>setTimeout(r,400));scrollTo(0,0);
 },theme);
 const st=()=>p.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)],body=document.querySelector('.pf-day-body'),br=body.getBoundingClientRect();
  return {stubs:q('.pf-strip .pf-chip u').map(e=>e.textContent).join('|'),active:pw().active,ex:pwDay(pw().active).rows.filter(r=>r.kind==='ex').map(r=>r.ex).join('+'),
   wed:pwDay('2026-10-14').rows.filter(r=>r.kind==='ex').map(r=>r.ex).join('+'),fri:pwDay('2026-10-16').rows.filter(r=>r.kind==='ex').map(r=>r.ex).join('+'),wedParts:pwDay('2026-10-14').parts.join('+'),friParts:pwDay('2026-10-16').parts.join('+'),
   tearing:!!document.querySelector('.pf-strip.tearing'),fly:document.querySelector('.pf-stub-fly')?.textContent||'',hint:document.querySelector('.pf-tear-hint')?.textContent||'',
   jiggle:q('.pf-strip .pf-chip:not(.pf-tear-src) u').map(u=>getComputedStyle(u).animationName).filter(n=>n==='pf-jiggle').length,srcHidden:getComputedStyle(document.querySelector('.pf-tear-src u')||document.body).visibility,
   outline:getComputedStyle(body).borderTopStyle+' '+(()=>{const i=document.createElement('i');i.style.color='var(--accent)';document.body.append(i);const c=getComputedStyle(i).color;i.remove();return getComputedStyle(body).borderTopColor===c;})(),perf:getComputedStyle(document.querySelector('.pf-strip .pf-chip s')).borderBottomStyle,
   over:q('.pf-day-body *').filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>br.right+0.5||r.left<br.left-0.5);}).map(e=>e.className||e.tagName).slice(0,4),sw:document.documentElement.scrollWidth,vw:innerWidth,
   saved:!!DB.week,toast:document.querySelector('#toast').textContent};});
 const mid=sel=>p.evaluate(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},sel);
 const stub=i=>mid(`.pf-strip .pf-chip:nth-child(${i}) u`);
 let d=await st();
 ok(`${tag} each chip is a ticket: a dashed perforation between the date and the stub; the day's routine sits in a blue outline, nothing spilling out`,d.stubs==='Shoulder|Legs|Biceps|Chest|Back|Shoulder'&&d.perf==='dashed'&&d.outline==='solid true'&&!d.over.length&&d.sw<=d.vw,d);
 /* a tap on a stub still switches day */
 await p.tap('.pf-strip .pf-chip:nth-child(4) u');await p.waitForTimeout(300);d=await st();
 ok(`${tag} a tap on a stub switches day, as before`,d.active==='2026-10-15'&&!d.tearing,d.active);
 await p.tap('.pf-strip .pf-chip:nth-child(3) u');await p.waitForTimeout(300);
 /* hold, tear, carry to Friday */
 const a=await stub(3),f=await stub(5);
 await p.mouse.move(a.x,a.y);await p.mouse.down();await p.waitForTimeout(450);d=await st();
 ok(`${tag} hold Biceps: it tears off (its stub is left empty), it rides under the finger, and the other five jiggle`,d.tearing&&d.fly==='Biceps'&&d.srcHidden==='hidden'&&d.jiggle===5&&/Carry it under another day/.test(d.hint),d);
 for(let k=1;k<=10;k++){await p.mouse.move(a.x+(f.x-a.x)*k/10,a.y+6);await p.waitForTimeout(25);}await p.waitForTimeout(350);d=await st();
 const slide=await p.evaluate(()=>{const u=document.querySelector('.pf-strip .pf-chip:nth-of-type(5) u'),w=document.querySelector('.pf-strip .pf-chip:nth-of-type(3)').getBoundingClientRect();return Math.abs(u.getBoundingClientRect().left-w.left)<6;});
 ok(`${tag} over Friday: Back slides across into Wednesday's gap, and the line says so`,slide&&d.hint==='Under Fri: Back goes to Wed',{slide,hint:d.hint});
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tear-carry-${theme}.png`});
 await p.mouse.up();await p.waitForTimeout(400);d=await st();
 ok(`${tag} let go: the two days swap routines, Friday is the day you are editing, and the toast offers undo`,!d.tearing&&!d.fly&&d.stubs==='Shoulder|Legs|Back|Chest|Biceps|Shoulder'&&d.active==='2026-10-16'&&d.fri==='EZ Bar Curl+Triceps Pushdown'&&d.wed==='Lat Pulldown+Seated Cable Row'&&d.friParts==='Biceps+Triceps+Sixpack'&&d.wedParts==='Back'&&/^Biceps → Fri · Back → Wed · undo$/.test(d.toast),d);
 ok(`${tag} ...nothing stored until Save`,!d.saved,d.saved);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/tear-done-${theme}.png`});
 await p.tap('#toast');await p.waitForTimeout(350);d=await st();
 ok(`${tag} undo puts both days back`,d.stubs==='Shoulder|Legs|Biceps|Chest|Back|Shoulder'&&d.wed==='EZ Bar Curl+Triceps Pushdown'&&d.active==='2026-10-14',d);
 /* let go where it started: nothing changes */
 await p.waitForTimeout(2100);
 {const s3=await stub(3);await p.mouse.move(s3.x,s3.y);await p.mouse.down();await p.waitForTimeout(450);await p.mouse.move(s3.x+3,s3.y+30,{steps:4});await p.mouse.up();await p.waitForTimeout(350);d=await st();
  ok(`${tag} carry it and drop it back on its own day: nothing changes, and it is not a tap`,d.stubs==='Shoulder|Legs|Biceps|Chest|Back|Shoulder'&&d.active==='2026-10-14'&&!d.tearing,d);}
 /* under a finger: a quick swipe scrolls and tears nothing; a hold tears */
 {const cdp=await p.context().newCDPSession(p);const T=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
  const s3=await stub(3);await T('touchStart',s3.x,s3.y);for(let k=1;k<=6;k++){await T('touchMove',s3.x+14*k,s3.y);await p.waitForTimeout(16);}await T('touchEnd');await p.waitForTimeout(500);d=await st();
  ok(`${tag} a quick swipe across the stubs tears nothing`,!d.tearing&&d.stubs==='Shoulder|Legs|Biceps|Chest|Back|Shoulder',d);
  const s2=await stub(2),s6=await stub(6);await T('touchStart',s2.x,s2.y);await p.waitForTimeout(450);for(let k=1;k<=10;k++){await T('touchMove',s2.x+(s6.x-s2.x)*k/10,s2.y);await p.waitForTimeout(20);}await p.waitForTimeout(150);await T('touchEnd');await p.waitForTimeout(400);d=await st();
  ok(`${tag} a finger: hold Legs, carry it to Saturday, and they swap`,d.stubs==='Shoulder|Shoulder|Biceps|Chest|Back|Legs'&&d.active==='2026-10-17',d.stubs);await cdp.detach();}
 ok(`${tag} no page errors`,!errors.length,errors);await p.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
