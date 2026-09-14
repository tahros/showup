const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.resolve(process.argv[2]||'.');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{for(const theme of ['light','dark']){
 const p=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce',serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);await p.waitForTimeout(1400);
 await p.evaluate(theme=>{document.querySelector('#onb')?.remove();checkDate=()=>false;DB.settings={...DB.settings,theme,name:'Fixture',sex:'f',unit:'lb',onboarded:true,bodyPalette:'normal'};DB.days[todayISO]={w:[{part:'Shoulder',ex:'Dumbbell Shoulder Press',w:50,reps:[8,8,8],at:Date.now()}],doneAll:true};SEED=deriveAll();settingsBaseline();applyTheme();save(true);view='sync';render();},theme);
 await p.waitForTimeout(500);
 const before=await p.evaluate(()=>JSON.stringify({days:DB.days,name:DB.settings.name,sex:DB.settings.sex}));
 for(const mode of ['neon','normal','neon']){
  await p.locator('[data-body-palette-pick="'+mode+'"]').click();await p.waitForTimeout(400);
  assert.equal(await p.locator('[data-body-palette-pick="'+mode+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--p-shoulder').trim()),mode==='neon'?'#5278FF':'#4169C8');
 }
 assert.equal(await p.evaluate(()=>JSON.stringify({days:DB.days,name:DB.settings.name,sex:DB.settings.sex})),before);
 if(process.argv[3])await p.locator('.body-palette-settings').screenshot({path:path.join(process.argv[3],'palette-settings-'+theme+'.png')});
 await p.reload();await p.waitForTimeout(1400);assert.equal(await p.evaluate(()=>bodyPalette()),'neon');
 await p.evaluate(()=>{document.querySelector('#onb')?.remove();checkDate=()=>false;view='stats';render();});await p.waitForTimeout(400);
 assert.equal(await p.locator('.plate-legend i').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(82, 120, 255)');
 const cv=await p.locator('.plate-canvas').evaluate(e=>e.toDataURL());
 await p.evaluate(()=>adoptRemoteSettings({settings:{bodyPalette:'normal'},settingsAt:Date.now()+10000,settingsAtK:{bodyPalette:Date.now()+10000}}));await p.waitForTimeout(150);
 assert.notEqual(await p.locator('.plate-canvas').evaluate(e=>e.toDataURL()),cv,'visible canvas redraws on remote palette change');
 await p.evaluate(()=>{window.paletteExport=null;const original=drawPlateShare;drawPlateShare=(data,mascot,frame)=>{window.paletteExport=data.colors;return original(data,mascot,frame);};});
 await p.locator('.plate-share').click();await p.waitForFunction(()=>window.paletteExport?.Shoulder==='#4169C8',{},{timeout:30000});
 assert(await p.locator('#repOv').isVisible());await p.locator('#repClose').click();
 await p.evaluate(()=>{view='sync';render();});await p.setViewportSize({width:320,height:740});await p.waitForTimeout(300);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS '+theme+' settings, reload, data preservation, chart legend, live canvas, plate export and 320px layout');await p.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
