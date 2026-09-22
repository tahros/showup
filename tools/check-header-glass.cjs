// Local server on 8795. NODE_PATH must include Playwright.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{const p=await b.newPage({serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8795/');
await p.evaluate(()=>{document.getElementById('onb')?.remove();DB.settings.onboarded=true;DB.settings.name='Preview';DB.settings.mascotMotion='still';view='today';render();});
const recordsBefore=await p.evaluate(()=>{const spacer=document.createElement('div');spacer.style.height='2000px';document.body.appendChild(spacer);return JSON.stringify(DB.days)});
const cdp=await p.context().newCDPSession(p);
await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'no-preference'}]});
for(const theme of ['light','dark'])for(const mode of ['normal','rest','live'])for(const width of [320,393,430]){
await p.setViewportSize({width,height:852});
const x=await p.evaluate(({theme,mode})=>{
 DB.settings.theme=theme;applyTheme();const h=document.querySelector('header');
 h.classList.toggle('resting',mode==='rest');h.classList.toggle('live',mode==='live');
 document.body.classList.toggle('rest-home',mode==='rest');syncPageChrome();
 const g=getComputedStyle(h.querySelector('.hglass')),before=JSON.stringify(DB.days);
 window.scrollTo(0,200);const rect=h.getBoundingClientRect();
 return {filter:g.backdropFilter,bg:g.backgroundImage,animation:g.animationName,top:rect.top,width:rect.width,scroll:scrollY,controlFilter:getComputedStyle(h.querySelector('.hbtns')).backdropFilter,mode:document.documentElement.dataset.headerMode,meta:document.querySelector('meta[name="theme-color"]').content,unchanged:before===JSON.stringify(DB.days)};
},{theme,mode});
assert(x.filter.includes('blur(4px)'),JSON.stringify(x));assert(x.bg.includes('0.78'));assert.equal(x.animation,'none');assert.equal(x.top,0);assert.equal(x.scroll,200);assert.equal(x.controlFilter,'none');assert(x.width<=width);assert.equal(x.mode,mode);assert(x.unchanged);console.log(`PASS ${theme} ${mode} ${width}`);
}
await p.screenshot({path:'../header-glass-live-qa.png'});assert.deepEqual(errors,[]);
assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),recordsBefore);
await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
assert.equal(await p.locator('.hglass').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
console.log('PASS reduced transparency: opaque header');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
