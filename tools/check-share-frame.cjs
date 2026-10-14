// v4.6.317: ONE FRAME FOR EVERYTHING YOU SHARE. Every shared image is 1080x1350 (4:5) with the same
// header (label, title, subtitle, centred), the same footer (wordmark bottom-left, companion left of
// your name) and the data placed per card: lists from the top, the plates on the floor, charts centred.
// A workout log too long for 4:5 switches to 9:16 (1920) so its type never shrinks. The labels are the
// ones Sungjee chose. The year-by-year charts always run Jan 1 to Dec 31.
// v4.6.320: 80px between the header and the content; Last vs today switches to 9:16 like the workout log.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
const iso=n=>{const d=new Date('2026-10-14T12:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
const L=(ex,part,lb,reps,at)=>({part,ex,w:+(lb/2.20462).toFixed(2),reps,at});
const days={};const exs=[['Chest','Barbell Bench Press',60],['Back','Deadlift',100],['Legs','Squat',90]];
for(let i=1;i<=420;i++){if(i%4===0)continue;const e=exs[i%3];const w=[{part:e[0],ex:e[1],w:e[2]+Math.floor((420-i)/40)*2.5,reps:[8,8,6],at:1}];if(i%5===0)w.push({part:'Run',ex:'Run',w:5,reps:[30],at:2});days[iso(i)]={w,upd:1};}
days['2026-10-14']={w:[L('Barbell Bench Press','Chest',135,[8,8,8,6],1),L('Hanging Leg Raise','Sixpack',0,[15,15,12],2)],doneAll:1};
days['2026-10-13']={w:[L('Squat','Legs',225,[5,5,5,5],1),L('Romanian Deadlift','Legs',185,[8,8,8],2),L('Leg Press','Legs',360,[12,12,10,10],3),L('Walking Lunge','Legs',50,[12,12,12],4),L('Leg Extension','Legs',120,[15,12,12],5),L('Lying Leg Curl','Legs',90,[12,12,10],6),L('Standing Calf Raise','Legs',180,[15,15,15,12,12],7)],doneAll:1};
days['2026-10-11']={w:[L('Deadlift','Back',315,[5,5,3],1)],doneAll:1};
const db={days,settings:{onboarded:true,unit:'lb',theme:'light',name:'Sungjee',companionAsked:'x',clubAvatar:'band',companionFree:'band',companionName:'Snap',crew:{band:{name:'Snap'}}}};
const ctx=await b.newContext({viewport:{width:430,height:900},serviceWorkers:'block'});
await ctx.addInitScript(D=>{if(location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('tracker-v1',D);}},JSON.stringify(db));
const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(3500);
 await p.evaluate(async()=>{todayISO='2026-10-14';SEED=deriveAll();await sharePreload();await document.fonts.ready;
  window.__frames=[];const orig=shareFrame;window.shareFrame=(src,band,meta)=>{const out=orig(src,band,meta);__frames.push({label:meta.label,valign:meta.valign||'centre',grow:!!meta.grow,title:meta.title,sub:meta.sub,w:out.width,h:out.height});return out;};
  window.__comp=0;const oc=shareDrawCompanion;window.shareDrawCompanion=(...a)=>{const r=oc(...a);if(r&&a[3]===48)__comp++;return r;};});
 /* the workout log: 3, 4 and 25 lines */
 const logs=await p.evaluate(()=>['2026-10-11','2026-10-14','2026-10-13'].map(d=>{const cv=shareDayCardFramed(d);return {w:cv.width,h:cv.height,meta:__frames.at(-1)};}));
 ok('workout log, 3 sets: 4:5, from the top, "Wed"-style date title',logs[0].w===1080&&logs[0].h===1350&&logs[0].meta.valign==='top'&&logs[0].meta.label==='Workout log'&&logs[0].meta.title==='Sun, Oct 11, 2026',logs[0]);
 ok('workout log: Sixpack reads as Core in the subtitle',/Core/.test(logs[1].meta.sub)&&!/Sixpack/.test(logs[1].meta.sub),logs[1].meta.sub);
 ok('workout log: the subtitle is just the parts; the totals close the list (v4.6.321)',logs.every(l=>!/sets|lb/.test(l.meta.sub)),logs.map(l=>l.meta.sub));
 ok('workout log, 25 sets: switches to 9:16 rather than shrinking',logs[2].w===1080&&logs[2].h===1920,logs[2]);
 /* every Stats share goes through the frame */
 await p.evaluate(async()=>{view='stats';render();await new Promise(r=>setTimeout(r,2000));});
 const want={'.plate-share':['Weight moved','bottom'],'.pg-share':['Lift progress','centre'],'.heat-share':['Attendance','centre'],'.dr-share':['Last vs today','top'],'.comparison-share':['Days, year by year','centre']};
 for(const [sel,[label,valign]] of Object.entries(want)){
  const r=await p.evaluate(async sel=>{__frames=[];__comp=0;const btn=document.querySelector(sel);if(!btn)return {missing:true};btn.scrollIntoView();btn.click();
   for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,200));const im=document.getElementById('repImg');if(im&&im.src&&im.src.startsWith('data:'))break;}
   const im=document.getElementById('repImg'),o=document.getElementById('repOv');const res={w:im?.naturalWidth,h:im?.naturalHeight,meta:__frames.at(-1),comp:__comp};if(o)o.style.display='none';im?.removeAttribute('src');syncModalLock?.();return res;},sel);
  if(sel==='.dr-share')ok('Last vs today may switch to 9:16 when it would shrink',r.meta?.grow===true,r.meta);
  ok(`${label}: 1080x1350, "${label}" label, ${valign}, Snap left of the name`,!r.missing&&r.w===1080&&r.h===1350&&r.meta?.label===label&&r.meta?.valign===valign&&r.comp>=1,r);
 }
 const dist=await p.evaluate(async()=>{__frames=[];const btns=[...document.querySelectorAll('.comparison-share')];const btn=btns[1];if(!btn)return null;btn.scrollIntoView();btn.click();
  for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,200));const im=document.getElementById('repImg');if(im&&im.src&&im.src.startsWith('data:'))break;}
  const o=document.getElementById('repOv');if(o)o.style.display='none';document.getElementById('repImg')?.removeAttribute('src');return __frames.at(-1)?.label;});
 ok('the header has 80px of air above the content (Sungjee, 2026-10-14)',await p.evaluate(()=>SHARE_BAND===282));
 ok('distance chart: "Distance, year by year"',dist==='Distance, year by year',dist);
 /* the year-by-year axis is the whole year */
 const ticks=await p.evaluate(()=>[...document.querySelectorAll('.comparison-plot text')].map(t=>t.textContent).filter(t=>/^[A-Z][a-z]{2} \d+$/.test(t)));
 ok('year-by-year axis runs Jan 1 to Dec 31',ticks[0]==='Jan 1'&&ticks.includes('Dec 31'),ticks);
 const end=await p.evaluate(()=>{const pl=document.querySelector('.comparison-plot polyline[data-year]');const pts=pl.getAttribute('points').trim().split(' ');return +pts.at(-1).split(',')[0];});
 ok('…and the line stops at today, well short of the right edge',end>255&&end<275,end);
 ok('no page errors',!errors.length,errors);
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
