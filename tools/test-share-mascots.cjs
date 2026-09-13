// Real canvas exports in an isolated browser with synthetic records.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 try{
 const page=await browser.newPage({serviceWorkers:'block'});
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8768/')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8768/');
 await page.evaluate(()=>{
  checkDate=()=>false;DB.settings.onboarded=true;DB.settings.mascotMotion='still';DB.settings.name='Export fixture';DB.settings.sex='f';
  DB.days={[todayISO]:{w:[{ex:'Squat',part:'Legs',w:80,reps:[8,8],at:1},{ex:'Run',part:'Run',w:3,reps:[],mins:20,secs:0,at:1}],doneAll:true}};SEED=deriveAll();
  window.exportImages=[];window.exportCount=0;
  const original=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(image instanceof HTMLImageElement)exportImages.push(image.src);return original.call(this,image,...args)};
  showCard=async fn=>{window.exportCanvas=fn();exportCount++;};bindPlateExport=()=>{};
 });
 for(const theme of ['light','dark']){
  const tone=theme==='dark'?'white':'chrome',mark='mascot-mark-'+tone+'.png';
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;DB.settings.theme=theme;},theme);
  // Check every share mark is the existing approved still, in the established crop.
  const parity=await page.evaluate(async tone=>{
   const load=async src=>{const im=new Image();im.src=src;await im.decode();return im};
   const still=await load('assets/mascot-'+tone+'.png'),mark=await load('assets/mascot-mark-'+tone+'.png');
   const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
   x.drawImage(still,152,69,416,346,0,43,512,426);const expected=x.getImageData(0,0,512,512).data;
   x.clearRect(0,0,512,512);x.drawImage(mark,0,0);const actual=x.getImageData(0,0,512,512).data;
   let diff=0;for(let i=0;i<actual.length;i++)diff+=Math.abs(expected[i]-actual[i]);return {difference:diff/actual.length,corner:actual[3]};
  },tone);
  assert(parity.difference<.01&&parity.corner===0,theme+' mark matches approved finish and stays transparent');
  await page.waitForFunction(()=>mascotReceiptMark()!==null);
  await page.evaluate(()=>{exportImages=[];const c=document.createElement('canvas');c.width=1080;c.height=1280;drawDayCard(c.getContext('2d'),1080,todayISO)});
  assert(await page.evaluate(mark=>exportImages.some(p=>p.endsWith(mark)),mark),theme+' receipt');
  await page.evaluate(()=>{document.getElementById('view').innerHTML=progressionSection('Squat');bindProgression();exportImages=[];return progressionShare(document.querySelector('.progression-card'))});
  assert(await page.evaluate(mark=>exportImages.some(p=>p.endsWith(mark)),mark),theme+' progression');
  await page.evaluate(()=>{exportImages=[];return sharePlateCard()});
  assert(await page.evaluate(mark=>exportImages.some(p=>p.endsWith(mark))&&exportImages.some(p=>p.endsWith('mascot-blue.png')),mark),theme+' plate export uses approved logo and blue mascot');
  await page.evaluate(()=>{view='stats';render()});
  await page.waitForSelector('.comparison-share');
  for(const kind of ['days','distance']){
   await page.evaluate(kind=>{const card=document.querySelector(kind==='distance'?'.runrace.comparison-card':'.comparison-card:not(.runrace)');if(!card)throw new Error(kind+': '+[...document.querySelectorAll('.comparison-card')].map(c=>c.className).join(','));exportImages=[];window.previousExportCount=exportCount;card.querySelector('.comparison-share').click()},kind);
   await page.waitForFunction(()=>exportCount>previousExportCount);
   assert(await page.evaluate(mark=>exportImages.some(p=>p.endsWith(mark)),mark),theme+' '+kind+' comparison');
  }
  console.log('PASS '+theme+': transparent approved mark, receipt, progression, plates, attendance and distance exports');
 }
 assert(await page.evaluate(()=>DB.settings.name==='Export fixture'&&DB.settings.sex==='f'),'Profile unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
