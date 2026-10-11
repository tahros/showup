// v4.6.262: the redesigned first run -- the blue door, What's in your training, About you, You're in.
// A fresh device (nothing stored), 402 and 320 wide, light and dark.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]])for(const theme of ['dark','light'])for(const go of ['train','plan','look']){
 if(go!=='train'&&(w!==402||theme!=='dark'))continue;
 const tag=`${theme} ${w} → ${go}:`;
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:SHOT?3:1,serviceWorkers:'block',colorScheme:theme});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE+'?theme='+theme);await p.waitForTimeout(5200);
 const fits=()=>p.evaluate(()=>{const o=document.getElementById('onb'),r=[...o.querySelectorAll('button,input,h1,p')].filter(e=>e.offsetParent!==null).map(e=>e.getBoundingClientRect());return {sw:document.documentElement.scrollWidth,vw:innerWidth,over:r.filter(x=>x.right>innerWidth+0.5||x.left<-0.5).length};});
 let d=await p.evaluate(()=>{const o=document.getElementById('onb');return {shown:!!o&&!o.hidden,step:o?.dataset.step,bg:getComputedStyle(o).backgroundColor,lock:!!o.querySelector('.ob-lock .showuppp-c .showuppp-lettering'),motto:o.querySelector('.ob-motto')?.textContent,btns:[...o.querySelectorAll('.ob-btn')].map(x=>x.textContent.trim()),days:o.querySelectorAll('.ob-days i').length,on:o.querySelectorAll('.ob-days i.on').length,vis:getComputedStyle(o.querySelector('.ob-door-btns')).opacity};});
 ok(`${tag} the door: blue, the animated lockup, "Life happens. Show up anyway.", Apple, Google and without an account, five weeks of squares with gaps`,d.shown&&d.step==='1'&&d.bg==='rgb(48, 73, 220)'&&d.lock&&d.motto==='Life happens.Show up anyway.'&&d.btns[0]==='Continue with Apple'&&d.btns.includes('Continue with Google')&&d.btns.includes('Continue without an account')&&d.days===35&&d.on>20&&d.on<35&&d.vis==='1',d);
 let f=await fits();ok(`${tag} the door fits`,f.sw<=f.vw&&!f.over,f);
 if(SHOT&&go==='train')await p.screenshot({path:`${SHOT}/ob-1-${theme}-${w}.png`});
 await p.click('[data-onbact="local"]');await p.waitForTimeout(1500);
 d=await p.evaluate(()=>{const o=document.getElementById('onb');return {step:o.dataset.step,h:o.querySelector('.ob-h')?.textContent,parts:[...o.querySelectorAll('.ob-part')].map(x=>x.textContent+(x.classList.contains('on')?'*':'')),count:o.querySelector('.ob-count')?.textContent};});
 ok(`${tag} What's in your training: eight parts, all picked, Core and Cardio by name`,d.step==='2'&&d.parts.length===8&&d.parts.every(x=>x.endsWith('*'))&&d.parts.includes('Core*')&&d.parts.includes('Cardio*')&&!d.parts.some(x=>/Sixpack|Run/.test(x))&&d.count==='All selected to start. Tap to adjust.',d);
 f=await fits();ok(`${tag} step 2 fits`,f.sw<=f.vw&&!f.over,f);
 if(SHOT&&go==='train')await p.screenshot({path:`${SHOT}/ob-2-${theme}-${w}.png`});
 await p.click('[data-onbp="Triceps"]');await p.waitForTimeout(300);
 d=await p.evaluate(()=>({count:document.querySelector('#onb .ob-count')?.textContent,tri:document.querySelector('[data-onbp="Triceps"]').classList.contains('on'),still:document.getElementById('onb').classList.contains('ob-still')}));
 ok(`${tag} a tap unpicks a part without replaying the entrance`,d.count==='7 of 8 picked'&&!d.tri&&d.still,d);
 await p.click('[data-onbact="toStep3"]');await p.waitForTimeout(1500);
 d=await p.evaluate(()=>({step:document.getElementById('onb').dataset.step,bub:document.getElementById('onbBubble')?.textContent}));
 ok(`${tag} About you: Pip says hello`,d.step==='3'&&d.bub==="Hi there!I'm Pip. Who are you?",d);
 await p.fill('#onbName','Jason');await p.waitForTimeout(300);
 d=await p.evaluate(()=>({bub:document.getElementById('onbBubble')?.textContent}));
 ok(`${tag} the bubble answers the name`,d.bub==='Hi, Jason!Nice to meet you.',d);
 await p.click('[data-onbu="lb"]');await p.waitForTimeout(300);
 d=await p.evaluate(()=>({name:document.getElementById('onbName').value,unit:document.querySelector('#onb .ob-field b').textContent,bub:document.getElementById('onbBubble')?.textContent}));
 ok(`${tag} switching to lb keeps the name and relabels the field`,d.name==='Jason'&&d.unit==='lb'&&d.bub.startsWith('Hi, Jason'),d);
 await p.fill('#onbBw','176');
 if(SHOT&&go==='train')await p.screenshot({path:`${SHOT}/ob-3-${theme}-${w}.png`});
 f=await fits();ok(`${tag} step 3 fits`,f.sw<=f.vw&&!f.over,f);
 await p.click('[data-onbact="toStep4"]');await p.waitForTimeout(2200);
 d=await p.evaluate(()=>{const o=document.getElementById('onb');return {step:o.dataset.step,in:o.querySelector('.ob-in')?.textContent,cards:[...o.querySelectorAll('.ob-card b')].map(x=>x.textContent)};});
 ok(`${tag} You're in, Jason -- four ways to start (v4.6.274: Bring my past workouts)`,d.step==='4'&&d.in==="You're in, Jason."&&d.cards.join('|')==="I'm training now|Plan my next workout|Bring my past workouts|Just looking around",d);
 f=await fits();ok(`${tag} step 4 fits`,f.sw<=f.vw&&!f.over,f);
 if(SHOT&&go==='train')await p.screenshot({path:`${SHOT}/ob-4-${theme}-${w}.png`});
 await p.click(`[data-onbact="go"][data-onbgo="${go}"]`);await p.waitForTimeout(900);
 d=await p.evaluate(()=>({hidden:document.getElementById('onb').hidden,view,onb:!!DB.settings.onboarded,name:DB.settings.name,unit:DB.settings.unit,kg:DB.settings.bodyKg,parts:(DB.settings.myParts||[]).join(),bar:DB.settings.barKg,plan:!!document.querySelector('.pf-workspace,.pw-workspace')}));
 const where=go==='train'?d.view==='lift':go==='plan'?d.plan:d.view==='today'&&!d.plan;
 const gone=await p.evaluate(()=>{const o=document.getElementById('onb'),hit=document.elementFromPoint(innerWidth/2,innerHeight/2);return {display:getComputedStyle(o).display,covered:!!hit?.closest('#onb')};});
 ok(`${tag} the first run is really gone: nothing of it left over the app`,gone.display==='none'&&!gone.covered,gone);
 if(go==='train'){const t=await p.evaluate(()=>{const b=document.querySelector('#view button[data-part],#view .ptile,#view [data-p]');return b?b.outerHTML.slice(0,80):null;});
  const sel=await p.evaluate(()=>{const c=[...document.querySelectorAll('#view button')].find(b=>/Chest/.test(b.textContent));if(!c)return null;c.setAttribute('data-test-chest','1');return true;});
  if(sel){await p.click('[data-test-chest]');await p.waitForTimeout(600);}
  const moved=await p.evaluate(()=>({view,part:typeof lift!=='undefined'?lift.part:null}));
  ok(`${tag} Train answers: tapping Chest opens it`,sel&&moved.view==='lift'&&moved.part==='Chest',{sel,moved});}
 ok(`${tag} finishing saves name, lb, bodyweight in kg, the picked parts, and lands where asked`,d.hidden&&d.onb&&d.name==='Jason'&&d.unit==='lb'&&Math.abs(d.kg-79.8)<0.1&&!d.parts.includes('Triceps')&&d.parts.includes('Sixpack')&&where,d);
 ok(`${tag} no page errors`,!errors.length,errors);await ctx.close();}
 /* Skip and Not now */
 {const ctx=await b.newContext({viewport:{width:402,height:874},serviceWorkers:'block'});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForTimeout(4000);
  await p.click('[data-onbact="local"]');await p.waitForTimeout(600);await p.click('[data-onbp="Legs"]');await p.click('[data-onbact="skip"]');await p.waitForTimeout(600);
  let d=await p.evaluate(()=>({step:document.getElementById('onb').dataset.step,in:document.querySelector('#onb .ob-in')?.textContent}));
  ok('Skip lands on You\'re in (no name yet)',d.step==='4'&&d.in==="You're in.",d);
  await p.click('[data-onbact="back"]');await p.waitForTimeout(400);await p.fill('#onbBw','80');await p.click('[data-onbact="notnow"]');await p.waitForTimeout(400);
  await p.click('[data-onbact="go"][data-onbgo="look"]');await p.waitForTimeout(500);
  d=await p.evaluate(()=>({kg:DB.settings.bodyKg,legs:(DB.settings.myParts||[]).includes('Legs'),onb:!!DB.settings.onboarded}));
  ok('Back, then Not now: no bodyweight saved; the skipped part choice is kept',d.onb&&d.kg!==80&&!d.legs,d);
  ok('no page errors (skip path)',!errors.length,errors);await ctx.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
