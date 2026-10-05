// Serve the app on PW_PORT (default 8795); real CSS animation and theme checks.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
await p.goto('http://127.0.0.1:'+(process.env.PW_PORT||8795)+'/');
await p.evaluate(()=>{document.querySelector('#onb')?.remove();DB.settings.onboarded=true;DB.settings.mascotMotion='off';DB.days[todayISO]={w:[],rest:true};view='today';render({inplace:true});});
for(const theme of ['dark','light']){
await p.evaluate(theme=>{DB.settings.theme=theme;applyTheme();document.body.classList.add('rest-home');syncPageChrome();},theme);
const result=await p.evaluate(()=>{const c=getComputedStyle(document.body,'::before'),h=document.querySelector('header').getBoundingClientRect();return {duration:c.animationDuration,name:c.animationName,origin:parseFloat(c.transformOrigin.split(' ')[1]),center:h.top+h.height/2,pointer:c.pointerEvents,gradient:c.backgroundImage};});
assert.equal(result.duration,'2.4s');assert.equal(result.name,'rest-header-breathe');assert(Math.abs(result.origin-result.center)<2);assert.equal(result.pointer,'none');assert(result.gradient.includes('radial-gradient'));
const frames=[];
for(const time of [0,1200]){frames.push(await p.evaluate(time=>{const a=document.getAnimations().find(a=>a.animationName==='rest-header-breathe');a.pause();a.currentTime=time;return Number(getComputedStyle(document.body,'::before').opacity);},time));await p.screenshot({path:require('path').join(require('os').tmpdir(),'showup-rest-'+theme+'-'+time+'.png')});}
assert(frames[1]-frames[0]>.5);
await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>getComputedStyle(document.body,'::before').animationName),'none');
await p.emulateMedia({reducedMotion:'no-preference'});
console.log('PASS '+theme+': header anchor, visible pulse, reduced motion');
}
await p.evaluate(()=>document.body.classList.remove('rest-home'));assert.equal(await p.evaluate(()=>getComputedStyle(document.body,'::before').content),'none');
console.log('PASS normal mode has no glow');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
