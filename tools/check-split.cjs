// v4.6.203: Your split on Plan -> Preferences. Real Chromium, real taps and a real drag.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]])for(const theme of ['light','dark']){const tag=`${theme} ${w}:`;
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:SHOT?2:1,serviceWorkers:'block',hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
 await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
 await p.evaluate(async theme=>{
  const LB=2.20462,days={},add=(d,part,ex)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:50/LB,reps:[10,10,10,10],at:Date.parse(d+'T18:00')+(days[d]?days[d].w.length:0)});};
  /* the maker's six, Mon to Sat, for eight weeks; the last week stops after Monday's Shoulder */
  const six=[[['Shoulder','Lateral Raise'],['Sixpack','Hanging Leg Raise']],[['Back','Lat Pulldown'],['Biceps','EZ Bar Curl']],[['Chest','Barbell Bench Press'],['Sixpack','Hanging Leg Raise']],[['Legs','Squat'],['Sixpack','Hanging Leg Raise']],[['Biceps','EZ Bar Curl'],['Triceps','Triceps Pushdown'],['Sixpack','Hanging Leg Raise']],[['Chest','Barbell Bench Press'],['Sixpack','Hanging Leg Raise']]];
  const t=new Date('2026-10-04T12:00');for(let k=62;k>=6;k--){const d=new Date(t);d.setDate(t.getDate()-k);const dow=d.getDay();if(dow===0)continue;for(const [pt,ex] of six[dow-1])add(d.toLocaleDateString('en-CA'),pt,ex);}
  DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still',weekStart:'monday',objective:'grow',plannerPreferences:{avoid:[],trainDays:[1,2,3,4,5]}}};todayISO='2026-10-04';checkDate=()=>false;
  document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();save=()=>{};
  view='today';render();await new Promise(r=>setTimeout(r,400));pw().dates=[];pw().active=null;pwOpen(null,'dates');pfHandle('pf-prefs',{dataset:{}});await new Promise(r=>setTimeout(r,600));
 },theme);
 const dom=()=>p.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)],card=document.querySelector('.pf-split'),cr=card.getBoundingClientRect();
  return {tiles:q('.pf-tile').map(e=>e.dataset.value+(e.classList.contains('on')?'*':'')).join(' '),rows:q('.pf-rot').map(r=>[...r.querySelectorAll('.pf-rot-tags>*')].map(e=>e.textContent.trim()).join(' ')),next:q('.pf-rot.next').map(r=>+r.dataset.pfRot+1),up:q('.pf-up span').map(x=>x.textContent),note:document.querySelector('.pf-split-note')?.textContent||'',open:q('.pf-rot.open').length,
   over:q('.pf-split *').filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>cr.right+0.5||r.left<cr.left-0.5);}).map(e=>e.className||e.tagName).slice(0,4),sw:document.documentElement.scrollWidth,vw:innerWidth,
   order:q('.pf-prefs>.card>h3').map(e=>e.textContent).join('|'),grip:q('.pf-rot-grip').map(e=>Math.round(e.getBoundingClientRect().height)),tileH:q('.pf-tile').map(e=>Math.round(e.getBoundingClientRect().height))};});
 let d=await dom();
 ok(`${tag} Your split sits between Your week and Each session`,d.order==='What are you training for?|Your week|Your split|Each session|Exercises',d.order);
 ok(`${tag} with nothing saved: five choices, none lit, no sessions`,d.tiles==='body ppl ul full own'&&!d.rows.length&&/day by day/.test(d.note),d);
 await p.tap('.pf-tile[data-value="body"]');await p.waitForTimeout(350);d=await dom();
 ok(`${tag} tap Body part: five sessions, the tile lit`,d.tiles==='body* ppl ul full own'&&d.rows.length===5&&d.rows[0].startsWith('Chest'),d.rows);
 /* build the maker's own six from it */
 await p.evaluate(()=>{const r=pfState().prefs.rotation;r.sessions=[['Shoulder','Sixpack'],['Back','Biceps'],['Chest','Sixpack'],['Legs','Sixpack'],['Biceps','Triceps','Sixpack']].map(parts=>({name:'',parts}));r.preset='own';r.own=null;pfSplitRefresh();});
 await p.tap('[data-pw="pf-rot-add"]');await p.waitForTimeout(350);d=await dom();
 ok(`${tag} + Add a session opens an empty sixth, asking for its body parts`,d.rows.length===6&&/Tap to set body parts/.test(d.rows[5])&&d.open===1,d.rows);
 const chip=await p.evaluateHandle(()=>document.querySelector('.pf-rot.open .pf-rot-part[data-part="Chest"]'));
 await p.tap('.pf-rot.open .pf-rot-part[data-part="Chest"]');await p.tap('.pf-rot.open .pf-rot-part[data-part="Sixpack"]');await p.waitForTimeout(350);d=await dom();
 ok(`${tag} tap Chest and Sixpack: the row reads them, the chips are the same chips (so they animate)`,d.rows[5].startsWith('Chest Sixpack')&&await chip.evaluate(e=>e.isConnected&&e.classList.contains('on')&&parseFloat(getComputedStyle(e).transitionDuration)>=0.15),d.rows);
 await p.tap('.pf-rot.open [data-pw="pf-rot-open"]');await p.waitForTimeout(300);d=await dom();
 ok(`${tag} the six, in order, with Next up read from the log (Shoulder was last, so Back + Biceps)`,d.rows.map(x=>x.replace(/ Next up$/,'')).join(' | ')==='Shoulder Sixpack | Back Biceps | Chest Sixpack | Legs Sixpack | Biceps Triceps Sixpack | Chest Sixpack'&&d.next.join()==='2',d);
 ok(`${tag} Coming up lays the order on the next training days`,d.up.join(' | ')==='Mon, 10/5Back + Biceps | Tue, 10/6Chest + Sixpack | Wed, 10/7Legs + Sixpack | Thu, 10/8Biceps + Triceps + Sixpack | Fri, 10/9Chest + Sixpack',d.up);
 ok(`${tag} nothing overflows the card or the screen; handles and tiles are tappable`,!d.over.length&&d.sw<=d.vw&&d.grip.every(n=>n>=40)&&d.tileH.every(n=>n>=44),d);
 if(SHOT&&w===402){await p.evaluate(()=>document.querySelector('.pf-split').scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-170));await p.waitForTimeout(200);const vp=p.viewportSize();await p.setViewportSize({width:402,height:1500});await p.evaluate(()=>{scrollTo(0,0);const dk=document.querySelector('.pw-save-dock');if(dk)dk.style.visibility='hidden';document.getElementById('nav').style.visibility='hidden';});await p.waitForTimeout(300);await p.screenshot({path:`${SHOT}/split-built-${theme}.png`});await p.evaluate(()=>{const dk=document.querySelector('.pw-save-dock');if(dk)dk.style.visibility='';document.getElementById('nav').style.visibility='';});await p.setViewportSize(vp);await p.waitForTimeout(200);}
 /* a real drag: the 6th session up onto the 1st */
 const box=async i=>p.evaluate(i=>{const g=document.querySelector(`[data-pf-rot-grip="${i}"]`);g.scrollIntoView({block:'center'});const r=g.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},i);
 const from=await box(5);const to=await p.evaluate(()=>{const r=document.querySelector('.pf-rot[data-pf-rot="3"]').getBoundingClientRect();return {x:r.left+60,y:r.top+r.height/2};});
 await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(from.x,from.y-20,{steps:3});await p.mouse.move(to.x,to.y,{steps:8});
 const mid=await p.evaluate(()=>({drag:document.querySelectorAll('.pf-rot.pf-dragging').length,drop:[...document.querySelectorAll('.pf-rot.pf-drop')].map(e=>e.dataset.pfRot).join()}));
 await p.mouse.up();await p.waitForTimeout(350);d=await dom();
 ok(`${tag} drag a handle: the row lifts, the target is marked, and on release the session lands there`,mid.drag===1&&mid.drop==='3'&&d.rows.map(x=>x.replace(/ Next up$/,'')).join(' | ')==='Shoulder Sixpack | Back Biceps | Chest Sixpack | Chest Sixpack | Legs Sixpack | Biceps Triceps Sixpack',{mid,rows:d.rows});
 await p.evaluate(()=>{const r=pfState().prefs.rotation;const [x]=r.sessions.splice(3,1);r.sessions.push(x);pfSplitRefresh();});
 /* a training day off changes Coming up at once */
 await p.evaluate(()=>document.querySelector('[data-pw="pf-trainday"][data-value="4"]').scrollIntoView({block:'center'}));await p.tap('[data-pw="pf-trainday"][data-value="4"]');await p.waitForTimeout(350);d=await dom();
 ok(`${tag} turn Thursday off: Coming up slides, the order does not`,d.up.join(' | ')==='Mon, 10/5Back + Biceps | Tue, 10/6Chest + Sixpack | Wed, 10/7Legs + Sixpack | Fri, 10/9Biceps + Triceps + Sixpack',d.up);
 await p.tap('[data-pw="pf-trainday"][data-value="4"]');await p.waitForTimeout(250);
 /* save, and Dates */
 await p.tap('[data-pw="pf-prefs-save"]');await p.waitForTimeout(600);
 const st=await p.evaluate(async()=>{pw().dates=[];pw().active=null;pwOpen(null,'dates');await new Promise(r=>setTimeout(r,500));return {page:pfState().page,rot:DB.settings.plannerPreferences.rotation,days:pw().dates.map(d=>d.slice(5)+' '+pwDay(d).parts.join('+')).join(' | ')};});
 ok(`${tag} Save stores it; Dates opens with each day carrying its body parts`,st.rot&&st.rot.sessions.length===6&&st.rot.preset==='own'&&st.days==='10-05 Back+Biceps | 10-06 Chest+Sixpack | 10-07 Legs+Sixpack | 10-08 Biceps+Triceps+Sixpack | 10-09 Chest+Sixpack',st);
 await p.tap('.pf-calendar [data-date="2026-10-05"]');await p.tap('.pf-calendar [data-date="2026-10-06"]');await p.waitForTimeout(400);
 const st2=await p.evaluate(()=>pw().dates.map(d=>d.slice(5)+' '+pwDay(d).parts.join('+')).join(' | '));
 ok(`${tag} skip Monday and Tuesday on the calendar: Wednesday becomes Back + Biceps`,st2==='10-07 Back+Biceps | 10-08 Chest+Sixpack | 10-09 Legs+Sixpack',st2);
 const dt=await p.evaluate(()=>({line:document.querySelector('.pf-split-line')?.textContent||'',brk:document.querySelector('.pf-date-breakdown').textContent,btns:[...document.querySelectorAll('.pf-date-actions [data-pw],.pf-date-secondary [data-pw]')].map(e=>e.dataset.pw+':'+e.textContent.trim()),pencil:document.querySelectorAll('.pf-calendar .pf-has-draft').length}));
 ok(`${tag} on Dates they are new days, not drafts, and a line says what each one is`,/^3 new days$/.test(dt.brk)&&dt.pencil===0&&dt.line.replace(/\s+/g,' ')==='Wed Back + BicepsThu Chest + SixpackFri Legs + Sixpack',dt);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/split-dates-${theme}.png`});
 await p.evaluate(()=>{window.__pl=null;writerWaitStart=()=>{};writeSession=async pl=>{window.__pl=pl;return {days:pw().dates.map(d=>({date:d,part:'Back',title:'x',text:'Lat Pulldown\n  50 lb × 10 10 10 10\n\nEZ Bar Curl\n  50 lb × 10 10 10'})),reason:null};};});
 await p.getByText('Plan 3 new days').tap();await p.waitForTimeout(1500);
 const ed=await p.evaluate(async()=>{const sch=(window.__pl?.workspace?.schedule||[]).map(x=>x.date.slice(5)+' '+JSON.stringify(x.parts||x.part||x.body_parts||'')).join(' | ');pw().active='2026-10-07';pwRender();await new Promise(r=>setTimeout(r,400));
  return {sch,sel:[...document.querySelectorAll('.pf-part.selected')].map(e=>e.dataset.part).join(),auto:document.querySelector('.pf-auto-line')?.textContent||'',page:pfState().page,txt:document.getElementById('view').textContent.slice(0,300)};});
 ok(`${tag} Plan sends the writer each day’s body parts, and the day opens on Back + Biceps with its usual set target`,/10-07 .*Back.*Biceps/.test(ed.sch)&&/10-08 .*Chest.*Sixpack/.test(ed.sch)&&ed.page==='edit'&&ed.sel==='Back,Biceps'&&/Back \d+ \+ Biceps \d+/.test(ed.auto),ed);
 ok(`${tag} no page errors`,!errors.length,errors);
 await p.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
