// v4.6.316: YOUR COMPANION IN WHAT YOU SHARE. Every shared image puts the companion you chose where
// Pip stood or beside your name, and signs with the official wordmark at 100px (the logo with Pip
// stays whole, or is not used). Pip as your companion, or none chosen, leaves every image as it was.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
const iso=n=>{const d=new Date('2026-10-14T12:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
const open=async comp=>{const ctx=await b.newContext({viewport:{width:430,height:900},serviceWorkers:'block'});
 const days={};const exs=[['Chest','Barbell Bench Press',60],['Back','Deadlift',100],['Legs','Squat',90]];
 for(let i=1;i<=420;i++){if(i%3===0)continue;const e=exs[i%3];days[iso(i)]={w:[{part:e[0],ex:e[1],w:e[2],reps:[8,8,6],at:1}],upd:1};}
 days['2026-10-14']={w:[{part:'Chest',ex:'Barbell Bench Press',w:61.2,reps:[8,8,8,6],at:1},{part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[15,15,12],at:2}],doneAll:1};
 const st=comp?{clubAvatar:comp,companionFree:comp,companionName:comp==='pip'?'Pip':'Snap',crew:{[comp]:{name:comp==='pip'?'Pip':'Snap'}}}:{};
 const db={days,settings:{onboarded:true,unit:'lb',theme:'light',name:'Sungjee',companionAsked:'x',...st}};
 await ctx.addInitScript(D=>{if(location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('tracker-v1',D);}},JSON.stringify(db));
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(3500);
 await p.evaluate(async()=>{todayISO='2026-10-14';SEED=deriveAll();await sharePreload();await document.fonts.ready;
  window.__draws=[];const orig=shareDrawCompanion;window.shareDrawCompanion=(...a)=>{const r=orig(...a);if(r)__draws.push(a[3]);return r;};
  const di=CanvasRenderingContext2D.prototype.drawImage;window.__wm=[];CanvasRenderingContext2D.prototype.drawImage=function(img,...a){if(img&&img.src&&/showuppp-wordmark/.test(img.src))__wm.push(a.length===4?a[2]:a[6]);if(img&&img.src&&/lifted-lockup|mascot-mark|mascot-(white|blue|chrome)\.png/.test(img.src))(window.__pip=window.__pip||[]).push(img.src.split('/').pop());return di.call(this,img,...a);};});
 return {ctx,p,errors};};
const card=async(p,sel)=>p.evaluate(async sel=>{__draws=[];__wm=[];window.__pip=[];let h;
 if(!sel){const cv=document.createElement('canvas');cv.width=1080;cv.height=1080;drawDayCard(cv.getContext('2d'),1080,todayISO);h=cv.height;}
 else{view='stats';render();await new Promise(r=>setTimeout(r,1500));const b=document.querySelector(sel);b.scrollIntoView();b.click();
  for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,200));const im=document.getElementById('repImg');if(im&&im.src&&im.src.startsWith('data:'))break;}
  h=document.getElementById('repImg')?.naturalHeight;const o=document.getElementById('repOv');if(o)o.style.display='none';document.getElementById('repImg')?.removeAttribute('src');}
 return {draws:__draws.slice(),wm:__wm.slice().map(Math.round),pip:(window.__pip||[]).slice(),h};},sel);
try{
 const heights={};
 for(const comp of ['band','pip',null]){const {ctx,p,errors}=await open(comp);const tag=comp||'none';
  let d=await card(p,null);heights[tag]=d.h;
  if(comp==='band')ok(`${tag}: Share this day -- Snap top-left, the wordmark at 100px in the foot`,d.draws.length===1&&d.wm.length===1&&d.wm[0]>=100,d);
  else ok(`${tag}: Share this day -- no companion, no wordmark: as before`,d.draws.length===0&&d.wm.length===0,d);
  for(const [name,sel] of [['heat-map replay','.heat-share'],['day review','.dr-share'],['year over year','.comparison-share']]){
   d=await card(p,sel);
   if(comp==='band')ok(`${tag}: ${name} -- Snap beside your name${name==='day review'?'':', the wordmark at 100px'}${name==='heat-map replay'?', no logo with Pip':''}`,d.draws.length>=1&&(name==='day review'||d.wm.some(w=>w>=100))&&(name!=='heat-map replay'||!d.pip.some(s=>/lockup/.test(s))),d);
   else ok(`${tag}: ${name} -- as before (no companion drawn)`,d.draws.length===0&&(name!=='heat-map replay'||d.pip.some(s=>/lockup/.test(s))),d);
  }
  /* the plates card, drawn the way sharePlateCard draws it */
  d=await p.evaluate(async()=>{__draws=[];__wm=[];window.__pip=[];const date=todayISO,record=JSON.parse(JSON.stringify(DB.days[date]));const css=getComputedStyle(document.documentElement),read=(k,f)=>css.getPropertyValue(k).trim()||f;
   const data={date,record,retro:false,name:firstName()||'',unit:U(),total:plateNumber(plateMetrics(record).kg),surface:read('--surface','#fff'),ink:read('--chalk','#1c1c1c'),muted:read('--muted','#686868'),line:read('--line','#ededed'),dark:false,colors:Object.fromEntries(Object.entries(PART_COLORS).map(([p,v])=>[p,read(v.slice(4,-1),'#888888')]))};
   const mascot=new Image();mascot.src='assets/mascot-blue.png';const logo=new Image();logo.src='assets/mascot-mark-chrome.png';await Promise.all([mascot.decode(),logo.decode()]);data.logo=logo;
   if(shareReady(shareCompanionImg()))data.companion=true;drawPlateShare(data,mascot);return {draws:__draws.slice(),wm:__wm.slice().map(Math.round),pip:(window.__pip||[]).slice()};});
  if(comp==='band')ok(`${tag}: plates -- Snap by the plates once (not again by the name), the wordmark at 100px`,d.draws.length===1&&d.draws[0]===150&&d.wm.includes(100)&&!d.pip.includes('mascot-blue.png'),d);
  else ok(`${tag}: plates -- Pip by the plates and his mark in the footer, as before`,d.draws.length===0&&d.pip.includes('mascot-blue.png')&&d.wm.length===0,d);
  ok(`${tag}: no page errors`,!errors.length,errors);await ctx.close();}
 ok('the receipt grows only with a companion (room for the wordmark and the air)',heights.band>heights.pip&&heights.pip===heights.none,heights);
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
