// v4.6.201: Plan -> Preferences rebuilt. Real Chromium, real taps.
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
  const LB=2.20462,days={},add=(d,part,ex,lb,reps,bw)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:lb/LB,bw:!!bw,reps,at:Date.parse(d+'T18:00')+(days[d]?days[d].w.length:0)});};
  /* eight weeks of Monday to Friday */
  const t=new Date('2026-10-03T12:00');for(let k=1;k<=56;k++){const d=new Date(t);d.setDate(t.getDate()-k);if(d.getDay()>=1&&d.getDay()<=5){const iso=d.toLocaleDateString('en-CA');add(iso,'Chest','Barbell Bench Press',135,[8,8,8,8]);add(iso,'Chest','Dip',25,[8,8,8],true);}}
  DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still',weekStart:'monday',objective:'grow'}};todayISO='2026-10-03';checkDate=()=>false;
  document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();window.__saves=0;save=()=>{window.__saves++;};
  setExPref('Romanian Deadlift','avoid');setExHold('Barbell Bench Press',true);
  view='today';render();await new Promise(r=>setTimeout(r,400));
  pw().dates=[];pw().active=null;pwOpen(null,'dates');await new Promise(r=>setTimeout(r,500));
 },theme);
 const st=()=>p.evaluate(()=>({page:pfState().page,dates:pw().dates.slice(),prefs:DB.settings.plannerPreferences||null,goal:DB.settings.objective,pwGoal:pw().objective,ws:DB.settings.weekStart,avoid:exPrefNames('avoid'),hold:exHoldNames(),sw:document.documentElement.scrollWidth,vw:innerWidth}));
 let x=await st();
 ok(`${tag} before any preference is saved, the planner opens on one day, as before`,x.dates.length===1,x.dates);
 await p.evaluate(()=>{pfHandle('pf-prefs',{dataset:{}});});await p.waitForTimeout(600);
 const dom=()=>p.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)],on=s=>q(s).filter(e=>e.classList.contains('on')).map(e=>e.dataset.value);
  return {h3:q('.pf-prefs h3').map(e=>e.textContent),goal:on('[data-pw="pf-goal"]'),cap:document.querySelector('.pf-pref-cap')?.textContent,ws:on('[data-pw="pf-weekstart"]'),dow:q('[data-pw="pf-trainday"]').map(e=>e.textContent+(e.classList.contains('on')?'*':'')).join(' '),size:on('[data-pw="pf-size"]'),max:!!document.querySelector('[data-pf-pref="maxSets"]'),warm:document.querySelector('[data-pw="pf-warmup"]')?.getAttribute('aria-checked'),
   avoid:q('[data-pw="pf-unavoid"]').map(e=>e.textContent.trim()),hold:q('[data-pw="pf-unhold"]').map(e=>e.textContent.replace(/\s+/g,' ').trim()),groups:q('[data-pf-avoid] optgroup').map(e=>e.label),rules:q('.pf-rules li').length,old:q('[data-pf-emphasis],[data-pw="pf-frequency"],[data-pf-pref="minutes"],[data-pf-pref="split"],[data-pf-pref="minSets"]').length,
   over:q('.pf-prefs .card *').filter(e=>{const r=e.getBoundingClientRect(),c=e.closest('.card').getBoundingClientRect();return r.width&&e.tagName!=='SELECT'&&e.tagName!=='OPTION'&&e.tagName!=='OPTGROUP'&&(r.right>c.right+0.5||r.left<c.left-0.5);}).map(e=>e.className||e.tagName).slice(0,4),
   segH:q('.pf-segb').map(e=>Math.round(e.getBoundingClientRect().height)),dowW:q('.pf-dowb').map(e=>Math.round(e.getBoundingClientRect().width)),sw:document.documentElement.scrollWidth,vw:innerWidth};});
 let d=await dom();
 ok(`${tag} six cards: goal, week, body parts, split, session, exercises -- and the rules`,d.h3.join('|')==='What are you training for?|Your week|Body parts you train|Your split|Each session|Exercises'&&d.rules===6,d.h3);
 ok(`${tag} days a week, minutes, sliders, the sets range and split are gone`,d.old===0,d.old);
 ok(`${tag} it opens on what is true now: Grow, Monday, Auto, warm-up on`,d.goal.join()==='grow'&&d.ws.join()==='monday'&&d.size.join()==='auto'&&d.warm==='true'&&!d.max&&/8 to 12 reps/.test(d.cap),d);
 ok(`${tag} the weekdays you have trained on are offered, week starting Monday`,d.dow==='M* T* W* T* F* S S',d.dow);
 ok(`${tag} Avoid and Hold list what is already set, Hold with its weight`,d.avoid.join()==='Romanian Deadlift'&&d.hold.length===1&&/^Barbell Bench Press 135 lb$/.test(d.hold[0]),d);
 ok(`${tag} the picker is grouped body part · muscle`,d.groups.length>=10&&d.groups[0]==='Chest · upper chest'&&d.groups.some(g=>/^Legs · /.test(g)),d.groups.slice(0,4));
 ok(`${tag} nothing overflows a card or the screen`,!d.over.length&&d.sw<=d.vw,d);
 ok(`${tag} controls are tappable sizes`,d.segH.every(n=>n>=32)&&d.dowW.every(n=>n>=30),d);
 if(SHOT&&w===402){await p.evaluate(()=>{const dk=document.querySelector('.pw-save-dock'),nv=document.getElementById('nav');window.__vis=[dk,nv];});await p.screenshot({path:`${SHOT}/prefs-built-${theme}.png`,fullPage:false});await p.setViewportSize({width:402,height:1790});await p.waitForTimeout(300);await p.screenshot({path:`${SHOT}/prefs-built-full-${theme}.png`});await p.setViewportSize({width:w,height:h});await p.waitForTimeout(200);}
 /* v4.6.202: the toggles animate -- the element tapped survives the tap, and has a transition to run */
 await p.evaluate(()=>{window.__keep={goal:document.querySelector('[data-pw="pf-goal"][data-value="lose"]'),seg:document.querySelector('[data-pw="pf-goal"]').parentNode,dow:document.querySelector('[data-pw="pf-trainday"][data-value="2"]'),sw:document.querySelector('[data-pw="pf-warmup"]'),card:document.querySelector('.pf-prefs')};});
 const mo=await p.evaluate(()=>{const cs=(e,ps)=>getComputedStyle(e,ps),sec=v=>Math.max(...String(v).split(',').map(x=>parseFloat(x)||0));const k=window.__keep;
  return {thumb:sec(cs(k.seg,'::before').transitionDuration),thumbProp:cs(k.seg,'::before').transitionProperty,label:sec(cs(k.goal).transitionDuration),dow:sec(cs(k.dow).transitionDuration),sw:sec(cs(k.sw).transitionDuration),knob:sec(cs(k.sw,'::after').transitionDuration),i:k.seg.style.getPropertyValue('--i'),n:k.seg.style.getPropertyValue('--n')};});
 ok(`${tag} every toggle has a transition: thumb, labels, weekday circles, switch and its knob`,mo.thumb>=0.2&&/transform/.test(mo.thumbProp)&&mo.label>=0.15&&mo.dow>=0.15&&mo.sw>=0.15&&mo.knob>=0.2&&mo.i==='0'&&mo.n==='3',mo);
 const tabs=await p.evaluate(()=>[...document.querySelectorAll('.pf-steps .pw-btn')].map(e=>({t:e.textContent.replace(/^\d/,'').trim(),f:getComputedStyle(e).fontSize,fits:e.scrollWidth<=Math.ceil(e.getBoundingClientRect().width)+1,lines:Math.round(e.getBoundingClientRect().height)})));
 ok(`${tag} the step tabs read at 13px, each on one line inside its tab`,tabs.length===4&&tabs.every(x=>x.f==='13px'&&x.fits&&x.lines<=48),tabs);
 /* taps */
 await p.tap('[data-pw="pf-goal"][data-value="lose"]');
 const mid=await p.evaluate(async()=>{const k=window.__keep,x0=new DOMMatrix(getComputedStyle(k.seg,'::before').transform).m41;await new Promise(r=>setTimeout(r,90));const x1=new DOMMatrix(getComputedStyle(k.seg,'::before').transform).m41;await new Promise(r=>setTimeout(r,500));const x2=new DOMMatrix(getComputedStyle(k.seg,'::before').transform).m41;return {x0,x1,x2,w:k.seg.getBoundingClientRect().width,same:k.goal.isConnected&&k.card.isConnected&&k.goal.classList.contains('on')};});
 ok(`${tag} tapping a segment slides the thumb: caught part-way, then at rest one segment over, same elements`,mid.same&&mid.x1>0.5&&mid.x1<mid.x2-0.5&&Math.abs(mid.x2-(mid.w-6)/3)<1.5,mid);
 await p.tap('[data-pw="pf-goal"][data-value="grow"]');await p.waitForTimeout(450);
 await p.tap('[data-pw="pf-goal"][data-value="lose"]');await p.waitForTimeout(250);d=await dom();
 ok(`${tag} tap Lose weight: it lights and the line under it changes`,d.goal.join()==='lose'&&/12 to 15 reps/.test(d.cap),d.cap);
 await p.tap('[data-pw="pf-weekstart"][data-value="sunday"]');await p.waitForTimeout(250);d=await dom();
 ok(`${tag} tap Sunday: the weekday row re-orders, the picks stay`,d.ws.join()==='sunday'&&d.dow==='S M* T* W* T* F* S',d.dow);
 await p.tap('[data-pw="pf-trainday"][data-value="5"]');await p.tap('[data-pw="pf-trainday"][data-value="6"]');await p.waitForTimeout(250);d=await dom();
 ok(`${tag} tap Friday off and Saturday on`,d.dow==='S M* T* W* T* F S*',d.dow);
 await p.tap('[data-pw="pf-size"][data-value="limit"]');await p.waitForTimeout(250);d=await dom();
 ok(`${tag} tap Set a limit: a number field appears`,d.size.join()==='limit'&&d.max,d);
 await p.fill('[data-pf-pref="maxSets"]','18');
 await p.tap('[data-pw="pf-warmup"]');await p.waitForTimeout(450);d=await dom();
 ok(`${tag} ...and the page was never rebuilt under the taps`,await p.evaluate(()=>{const k=window.__keep;return k.card.isConnected&&k.sw.isConnected&&k.dow.isConnected&&k.seg.isConnected;}));
 ok(`${tag} tap the warm-up switch: off, and the limit typed is kept`,d.warm==='false'&&await p.inputValue('[data-pf-pref="maxSets"]')==='18',d.warm);
 await p.selectOption('[data-pf-avoid]','Standing Calf Raise');await p.waitForTimeout(300);
 await p.selectOption('[data-pf-hold]','Dip');await p.waitForTimeout(300);d=await dom();
 ok(`${tag} add to Avoid and to Hold from the pickers`,d.avoid.join()==='Romanian Deadlift,Standing Calf Raise'&&d.hold.length===2&&/^Dip BW\+25 lb$/.test(d.hold[1]),d);
 await p.tap('[data-pw="pf-unavoid"][data-index="0"]');await p.waitForTimeout(250);
 x=await st();
 ok(`${tag} nothing is stored until Save`,x.prefs===null&&x.goal==='grow'&&x.ws==='monday'&&x.avoid.join()==='Romanian Deadlift'&&x.hold.join()==='Barbell Bench Press',x);
 await p.tap('[data-pw="pf-prefs-save"]');await p.waitForTimeout(600);x=await st();
 ok(`${tag} Save stores all of it`,x.prefs&&x.prefs.mode==='limit'&&x.prefs.maxSets===18&&x.prefs.warmup===false&&x.prefs.trainDays.join()==='1,2,3,4,6'&&x.goal==='lose'&&x.pwGoal==='lose'&&x.ws==='sunday'&&x.avoid.join()==='Standing Calf Raise'&&x.hold.slice().sort().join()==='Barbell Bench Press,Dip',x);
 ok(`${tag} ...and returns to Dates`,x.page==='dates',x.page);
 /* the Dates step now opens on your week */
 await p.evaluate(async()=>{pw().dates=[];pw().active=null;pwOpen(null,'dates');await new Promise(r=>setTimeout(r,500));});x=await st();
 ok(`${tag} with nothing selected, Dates opens on your training days across the next seven days`,x.dates.join()==='2026-10-03,2026-10-05,2026-10-06,2026-10-07,2026-10-08',x.dates);
 const sel=await p.evaluate(()=>document.querySelectorAll('.pf-calendar .selected').length);
 ok(`${tag} ...five days lit on the calendar`,sel===5,sel);
 await p.evaluate(async()=>{pw().dates=['2026-10-12'];pw().active='2026-10-12';pwOpen(null,'dates');await new Promise(r=>setTimeout(r,400));});x=await st();
 ok(`${tag} a selection you already have is left alone`,x.dates.join()==='2026-10-12',x.dates);
 ok(`${tag} no page errors`,!errors.length,errors);
 await p.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
