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
const radius=theme==='light'&&mode==='normal'?8:4;
assert(x.filter.includes(`blur(${radius}px)`),JSON.stringify(x));assert(x.bg.includes('0.78'));assert.equal(x.animation,'none');assert.equal(x.top,0);assert.equal(x.scroll,200);assert.equal(x.controlFilter,'none');assert(x.width<=width);assert.equal(x.mode,mode);assert(x.unchanged);console.log(`PASS ${theme} ${mode} ${width}`);
}
// A computed blur is insufficient: named ancestors can prevent sampling.
// Render a high-frequency backdrop and measure the actual edge contrast.
await p.evaluate(()=>{document.querySelectorAll('header>.brandrow,header>.hbtns').forEach(e=>e.style.visibility='hidden');const e=document.createElement('div');e.id='blurPixelFixture';e.style.cssText='position:fixed;inset:0 0 auto;height:100px;z-index:19;background:repeating-linear-gradient(90deg,#000 0px 4px,#fff 4px 8px)';document.body.appendChild(e)});
async function edgeEnergy(){const data=(await p.screenshot()).toString('base64');return p.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);const d=x.getImageData(40,30,240,1).data;let sum=0;for(let k=4;k<d.length;k+=4)sum+=Math.abs(d[k]-d[k-4]);return sum/239},data)}
for(const theme of ['light','dark'])for(const mode of ['normal','rest','live']){
 await p.evaluate(({theme,mode})=>{document.documentElement.dataset.theme=theme;const h=document.querySelector('header');h.classList.toggle('resting',mode==='rest');h.classList.toggle('live',mode==='live')},{theme,mode});
 const blurred=await edgeEnergy();
 await p.locator('.hglass').evaluate(e=>{e.style.backdropFilter='none';e.style.webkitBackdropFilter='none'});
 const clear=await edgeEnergy();
 await p.locator('.hglass').evaluate(e=>{e.style.removeProperty('backdrop-filter');e.style.removeProperty('-webkit-backdrop-filter')});
 assert(clear>5&&blurred<clear*.35,`${theme}/${mode}: no real blur, ${blurred} vs ${clear}`);
 console.log(`PASS rendered blur ${theme}/${mode}: edge energy ${blurred.toFixed(2)} vs transparent ${clear.toFixed(2)}`);
}
await p.evaluate(()=>{document.getElementById('blurPixelFixture').remove();document.querySelectorAll('header>.brandrow,header>.hbtns').forEach(e=>e.style.removeProperty('visibility'))});
await p.screenshot({path:'../header-glass-live-qa.png'});assert.deepEqual(errors,[]);
assert.equal(await p.evaluate(()=>JSON.stringify(DB.days)),recordsBefore);
await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
assert.equal(await p.locator('.hglass').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
console.log('PASS reduced transparency: opaque header');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
