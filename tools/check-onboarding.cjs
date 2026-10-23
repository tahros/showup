// Current first-run contract. Run with a local server: PORT=8784 node tools/check-onboarding.cjs
// Uses isolated browser contexts and stubs auth handoffs, never real sign-in.
const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert');
const BASE=process.env.BASE||`http://127.0.0.1:${process.env.PORT||8784}/`;
const CHROME=process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
(async()=>{const browser=await chromium.launch({executablePath:CHROME});const errors=[];let count=0;
const ok=(label,value)=>{assert(value,label);console.log('PASS '+label);count++;};
async function open(opts={}){const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',...opts});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForSelector('.ww-root');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1300);return {c,p};}
try{
for(const [width,height] of [[320,568],[390,844],[430,932]])for(const colorScheme of ['light','dark']){
 const {c,p}=await open({viewport:{width,height},colorScheme});
 const d=await p.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),h=r('.ww-heading'),l=r('.ww-brand'),pip=r('.ww-pip-place'),city=r('.ww-city'),actions=r('.ww-actions');return {copy:document.querySelector('.ww-heading h1').innerText,weights:[...document.querySelectorAll('.ww-heading span')].map(e=>getComputedStyle(e).fontWeight),logoCenter:(l.top+l.bottom)/2,frameHeight:r('.ww-root').height,gap1:h.top-l.bottom,cityOnly:!document.querySelector('.ww-city span'),sheet:r('.ww-surface'),pipBottom:pip.bottom,fits:document.documentElement.scrollWidth<=innerWidth&&actions.bottom<=innerHeight&&l.bottom<city.top&&city.bottom<h.top&&h.bottom<actions.top,buttons:[...document.querySelectorAll('.ww-actions button')].map(e=>({text:e.textContent.trim(),height:e.getBoundingClientRect().height})),apple:r('.ww-apple .ob-lg').width,google:r('.ww-google .ob-lg').width};});
 ok(`${width} ${colorScheme}: approved copy, centered animated logo, bold lines, city-only label, opaque signup panel and no overlap`,d.copy==='Life happens.\nYou show up.'&&d.weights.every(w=>w==='700')&&Math.abs(d.logoCenter-Math.min(d.frameHeight*.5,d.frameHeight-(height<=650?310:344)-68))<1&&d.gap1>0&&d.cityOnly&&d.sheet.top<d.frameHeight&&d.fits);
 ok('all three original entry actions remain usable',d.buttons.length===3&&d.buttons.every(b=>b.height>=44)&&d.apple===22.5&&d.google===18);
 await p.waitForFunction(()=>document.querySelector('.ww-still')?.naturalWidth===4096);
 if(process.env.SHOT&&width===390&&colorScheme==='dark')await p.screenshot({path:process.env.SHOT});
 await p.click('[data-onbact="local"]');await p.waitForSelector('#onbName');
 ok('account-free entry goes to the existing About you step; animation is disposed',await p.evaluate(()=>onbStep==='you'&&onbWorldStop===null&&!document.querySelector('.ww-root')));
 await p.fill('#onbName','Alex');await p.click('[data-onbact="toCrew"]');await p.waitForSelector('.ad-root');await p.click('[data-onbact="skip"]');await p.waitForSelector('[data-onbact="path"]');
 ok('name, companion skip and both existing paths survive',await p.evaluate(()=>onbStep==='fork'&&document.querySelector('.ob-in').textContent.includes('Alex')&&!!document.querySelector('[data-onbact="path"][data-v="have"]')&&!!document.querySelector('[data-onbact="path"][data-v="fresh"]')));
 await p.click('[data-onbact="look"]');await p.waitForFunction(()=>document.getElementById('onb').hidden);
 ok('finishing removes the door and exposes the real app',await p.evaluate(()=>!!DB.settings.onboarded&&view==='today'&&getComputedStyle(document.getElementById('onb')).display==='none'));
 await c.close();
}
{
 const {c,p}=await open();await p.waitForSelector('.ww-ready canvas');
 const sample=()=>p.evaluate(()=>({pip:document.querySelector('.ww-stage canvas').dataset.frame,lights:document.querySelector('.ww-lights').dataset.frame,word:getComputedStyle(document.querySelector('.ww-wordmark')).transform,city:document.querySelector('.ww-city strong').textContent,step:document.querySelector('.ww-transition')?.dataset.step}));
 const size=await p.locator('.ww-stage canvas').evaluate(e=>[e.width,e.height]);ok('clean 3D Pip renders on its 4096px canvas',size[0]===4096&&size[1]===2560);
 await p.click('.ww-motion');const held=await sample();await p.waitForTimeout(700);const moving=await sample();
 ok('city pause keeps Pip, wordmark and lights moving',held.city===moving.city&&held.pip!==moving.pip&&held.lights!==moving.lights&&held.word!==moving.word&&await p.locator('.ww-motion svg path').count()===1);
 await p.click('.ww-motion');await p.waitForSelector('.ww-transition',{timeout:13000});await p.click('.ww-motion');const partial=await sample();await p.waitForTimeout(500);const partial2=await sample();
 ok('mid-transition pause freezes tiles only',partial.step===partial2.step&&partial.pip!==partial2.pip&&partial.lights!==partial2.lights);
 const tiles=await p.evaluate(()=>{const c=document.querySelector('.ww-transition'),ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height).data;return {opaque:data.every((v,i)=>i%4!==3||v===255),transition:getComputedStyle(document.querySelector('.ww-scene img')).transitionDuration};});
 ok('tiles remain opaque without fading through white',tiles.opaque&&tiles.transition==='0s');
 await p.click('.ww-motion');await p.waitForFunction(()=>document.querySelector('.ww-city strong').textContent==='Los Angeles');ok('transition finishes on the next approved city',true);
 await p.evaluate(()=>{window.authCalls=[];signInGoogle=()=>authCalls.push('google');_appleOn=true;signInApple=()=>authCalls.push('apple');});await p.click('[data-onbact="signin"]');await p.click('[data-onbact="apple"]');ok('Google and Apple still call the existing sign-in functions',JSON.stringify(await p.evaluate(()=>authCalls))==='["google","apple"]');
 await p.evaluate(()=>{DB.days['2026-10-01']={w:[{part:'Chest',ex:'Bench Press',w:40,reps:[8]}]};SEED=deriveAll();maybeOnboard();});await p.waitForFunction(()=>onbWorldStop===null);ok('returning account history closes and disposes the welcome screen',await p.evaluate(()=>document.getElementById('onb').hidden&&!!DB.settings.onboarded));await c.close();
}
{
 const {c,p}=await open({reducedMotion:'reduce'});await p.waitForFunction(()=>document.querySelector('.ww-still')?.naturalWidth===4096);await p.waitForSelector('.ww-stage canvas');const a=await p.locator('.ww-stage canvas').getAttribute('data-frame');await p.waitForTimeout(300);ok('reduced motion keeps Pip still and removes button animations',a===await p.locator('.ww-stage canvas').getAttribute('data-frame')&&await p.locator('.ww-actions button').evaluateAll(bs=>bs.every(e=>getComputedStyle(e).animationName==='none')));await c.close();
}
{
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await c.newPage();await p.route('**/assets/welcome/pixel-la.webp',r=>r.abort());await p.route('**/assets/welcome/pip-white-4096.png',r=>r.abort());await p.route('**/js/welcome-pip.js',r=>r.abort());await p.goto(BASE);await p.waitForSelector('.ww-root');await p.waitForTimeout(10500);ok('failed assets retain the first city and the visible still mascot',await p.evaluate(()=>document.querySelector('.ww-city strong').textContent==='Tokyo'&&document.querySelector('.ww-still').getAttribute('src')==='assets/welcome/pip.png'&&document.querySelector('.ww-still').naturalWidth>0&&document.querySelector('[data-onbact="local"]').offsetHeight>=44));await p.click('[data-onbact="local"]');await p.waitForSelector('#onbName');await c.close();
}
ok('no JavaScript errors',errors.length===0);console.log(`ONBOARDING GREEN: ${count} checks`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
