/* Serve repo on PW_PORT (8784 default). Simulate browsers that ignore canvas
   filters, and inspect real still/video/GIF renderer pixels in both themes. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const origin=process.env.ATTENDANCE_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8784)+'/';
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{for(const theme of ['dark','light']){
 const p=await b.newPage({serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>Object.defineProperty(CanvasRenderingContext2D.prototype,'filter',{configurable:true,get(){return 'none';},set(){}}));
 await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
 await p.evaluate(theme=>{document.querySelector('#onb')?.remove();todayISO='2026-10-06';checkDate=()=>false;DB.settings={...DB.settings,onboarded:true,name:'Sungjee Yoo',theme,bar:theme};DB.days={};for(let i=1;i<=6;i++)DB.days['2026-10-0'+i]={w:[{part:'Shoulder',ex:'Overhead Press',w:10,reps:[8]}]};SEED=deriveAll();view='stats';applyTheme();render();const original=bindPlateExport;bindPlateExport=(...args)=>{window.attendanceExport=args[4];return original(...args);};},theme);
 await p.waitForTimeout(500);await p.evaluate(()=>heatReplay.share(document.querySelector('.attendance-card')));
 const result=await p.evaluate(()=>{
  function pixels(cv){const data=cv.getContext('2d').getImageData(187,71,109,73).data;let white=0,charcoal=0;for(let i=0;i<data.length;i+=4){if(data[i]>245&&data[i+1]>245&&data[i+2]>245)white++;if(Math.abs(data[i]-44)<3&&Math.abs(data[i+1]-44)<3&&Math.abs(data[i+2]-44)<3)charcoal++;}return {white,charcoal};}
  return {filter:document.createElement('canvas').getContext('2d').filter,still:pixels(_repCv.cv),frames:[0,765,4500,9550,undefined].map(t=>pixels(attendanceExport.render(t)))};
 });
 assert.equal(result.filter,'none');for(const pixels of [result.still,...result.frames]){if(theme==='dark'){assert(pixels.white>1600&&pixels.white<4000,'dark wordmark must be white with transparent counters even without canvas filters: '+JSON.stringify(pixels));assert(pixels.charcoal<50,'only antialiased edges may blend to charcoal');}else assert(pixels.charcoal>1600,'light wordmark stays charcoal');}
 if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});const url=await p.evaluate(()=>_repCv.cv.toDataURL());fs.writeFileSync(process.env.QA_DIR+'/wordmark-'+theme+'.png',Buffer.from(url.split(',')[1],'base64'));}
 assert.deepEqual(errors,[]);console.log('PASS '+theme+': still and all animation frames, canvas filters disabled');await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
