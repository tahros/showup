const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({serviceWorkers:'block'});await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8795/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8795/');
for(const width of [320,393,430])for(const date of ['2026-09-20','2026-09-26'])for(const inverse of [true,false])for(const theme of ['light','dark']){
await p.setViewportSize({width,height:852});await p.evaluate(({date,inverse,theme})=>{todayISO=date;checkDate=()=>false;DB={days:{'2026-01-01':{w:[{ex:'Squat',part:'Legs',w:100,reps:[8]}]}},settings:{onboarded:true,unit:'lb',theme}};SEED=deriveAll();applyTheme();document.querySelector('#onb')?.remove();document.getElementById('view').innerHTML=currentRhythmSection(inverse);const wrap=document.querySelector('.heatwrap');wrap.scrollLeft=wrap.scrollWidth;}, {date,inverse,theme});
const m=await p.evaluate(()=>{const w=document.querySelector('.heatwrap').getBoundingClientRect(),c=document.querySelector('.hc.tod').getBoundingClientRect(),first=document.querySelector('.hc').getBoundingClientRect(),rail=document.querySelector('.wdrail span').getBoundingClientRect();return {right:w.right-c.right,top:c.top-w.top,bottom:w.bottom-c.bottom,alignment:Math.abs(first.top-rail.top)}});
assert(m.right>=3.5&&m.top>=33.5&&m.bottom>=3.5,JSON.stringify({width,date,inverse,theme,m}));assert(m.alignment<.5,JSON.stringify(m));
}
await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.hc.tod').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
await p.screenshot({path:'heat-outline-verified.png',fullPage:true});console.log('PASS full 3.5px breathing outline at right/top/bottom, aligned weekday rail: 320/393/430, Sunday/Saturday, Rest/training, light/dark, reduced motion');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
