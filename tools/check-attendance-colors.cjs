/* PW_PORT=8784: actual color transitions, retained replay, and shared export pixels. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const origin=process.env.ATTENDANCE_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8784)+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--disable-accelerated-2d-canvas']});try{
 for(const theme of ['dark','light']){
  const p=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);
  await p.evaluate(theme=>{document.querySelector('#onb')?.remove();todayISO='2026-10-06';checkDate=()=>false;DB.settings={...DB.settings,onboarded:true,name:'Color QA',theme,bar:theme};DB.days={};for(let i=1;i<=6;i++)DB.days['2026-10-0'+i]={w:[{part:i===6?'Run':i%2?'Shoulder':'Legs',ex:i===6?'Run':i%2?'Overhead Press':'Squat',w:10,reps:[8]}]};SEED=deriveAll();view='stats';applyTheme();render();const original=bindPlateExport;bindPlateExport=(...a)=>{window.colorExport=a[4];return original(...a);};},theme);
  await p.locator('.attendance-card').scrollIntoViewIfNeeded();await p.waitForTimeout(4000);await p.evaluate(()=>{window.colorDB=JSON.stringify(DB);window.colorCard=document.querySelector('.attendance-card');});
  const transition=await p.evaluate(()=>{
   const card=colorCard,total=card.querySelector('.at-total'),css=getComputedStyle(total),blue=css.color,day=getComputedStyle(card.querySelector('.at-cell.on'));
   const timing={duration:css.transitionDuration,ease:css.transitionTimingFunction,dayDuration:day.transitionDuration,dayEase:day.transitionTimingFunction};
   card.querySelector('[data-attendance-part="Shoulder"]').click();
   const animation=total.getAnimations().find(a=>a.transitionProperty==='color');if(!animation)throw Error('Missing total color transition');animation.pause();animation.currentTime=150;const mid=getComputedStyle(total).color;animation.finish();const neutral=getComputedStyle(total).color;
   const countColor=getComputedStyle(card.querySelector('.at-focus-count')).color,unitColor=getComputedStyle(card.querySelector('.at-focus-days')).color,partColor=getComputedStyle(card.querySelector('.at-focus-part')).color;
   card.querySelector('[data-attendance-part="All workouts"]').click();const reverse=total.getAnimations().find(a=>a.transitionProperty==='color');if(!reverse)throw Error('Missing reverse color transition');reverse.pause();reverse.currentTime=120;const reversed=getComputedStyle(total).color;
   card.querySelector('[data-attendance-part="Shoulder"]').click();const interrupted=getComputedStyle(total).color;total.getAnimations().forEach(a=>a.finish());
   return {blue,mid,neutral,countColor,unitColor,partColor,timing,reversed,interrupted,retained:card===document.querySelector('.attendance-card')};
  });
  assert.notEqual(transition.mid,transition.blue);assert.notEqual(transition.mid,transition.neutral);assert.equal(transition.countColor,transition.blue);assert.equal(transition.unitColor,transition.neutral);assert.equal(transition.partColor,transition.neutral);assert.equal(transition.reversed,transition.interrupted,'rapid reversal starts from the current painted color');assert(transition.retained);assert.equal(transition.timing.duration,'0.3s');assert.equal(transition.timing.duration,transition.timing.dayDuration);assert.equal(transition.timing.ease,transition.timing.dayEase);
  await p.evaluate(()=>{heatReplay.play(colorCard);heatReplay.live.seek(4500);window.colorCanvas=colorCard.querySelector('canvas');colorCard.querySelector('[data-attendance-part="Legs"]').click();});
  assert(await p.evaluate(()=>{const c=colorCard;return c.querySelector('canvas')===colorCanvas&&c._attendance.scene.elapsed===4500&&Number(c.querySelector('.at-focus-count').textContent)===attendanceView.phase(c._attendance.M,4500).focused('Legs');}),'body-part changes retain replay and update the revealed count');
  await p.evaluate(()=>{heatReplay.finish();colorCard.querySelector('[data-attendance-part="Shoulder"]').click();});
  for(const width of [320,393]){await p.setViewportSize({width,height:852});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await p.locator('.attendance-card').screenshot({path:process.env.QA_DIR+'/app-focus-'+theme+'-'+width+'.png'});}}
  for(const part of ['Shoulder','Run','All workouts']){
   await p.evaluate(part=>colorCard.querySelector('[data-attendance-part="'+part+'"]').click(),part);await p.evaluate(()=>heatReplay.share(colorCard));
   const frames=await p.evaluate(()=>[undefined,0,4500,14000].map(t=>{
    const calls=[],proto=CanvasRenderingContext2D.prototype,original=proto.fillText;
    proto.fillText=function(s,x,y,...rest){if(this.canvas.width===1080&&(y===318||y===375))calls.push({text:String(s),x,y,color:this.fillStyle,font:this.font});return original.call(this,s,x,y,...rest);};
    let cv;try{cv=colorExport.render(t);}finally{proto.fillText=original;}
    const data=cv.getContext('2d').getImageData(70,330,940,60).data,blue=document.documentElement.dataset.theme==='dark'?[113,136,255]:[48,73,220];let bluePixels=0;for(let i=0;i<data.length;i+=4)if(blue.every((v,c)=>Math.abs(v-data[i+c])<3))bluePixels++;
    return {calls,bluePixels};
   }));
   for(const {calls,bluePixels} of frames){const total=calls.find(c=>c.y===318&&c.x===70),label=calls.filter(c=>c.y===375),blue=theme==='dark'?'#7188ff':'#3049dc';if(part==='All workouts'){assert.equal(total.color,blue);assert.equal(label.length,0);assert.equal(bluePixels,0);}else{assert.notEqual(total.color,blue);assert.equal(label.length,3);assert.equal(label[0].color,total.color);assert.equal(label[1].color,blue);assert.equal(label[2].color,total.color);assert(label.every(c=>c.font.startsWith('500 40px')));assert(bluePixels>20);assert(label[1].x>label[0].x&&label[2].x>label[1].x);}}
   if(part==='Run')assert.equal(frames[0].calls.filter(c=>c.y===375).at(-1).text,' day');
   if(part==='Shoulder'&&process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});const png=await p.evaluate(()=>_repCv.cv.toDataURL());fs.writeFileSync(process.env.QA_DIR+'/focus-'+theme+'.png',Buffer.from(png.split(',')[1],'base64'));}
   await p.evaluate(()=>{plateExportCleanup?.();document.querySelector('#repOv')?.remove();});
  }
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>colorCard.querySelector('[data-attendance-part="Shoulder"]').click());
  assert(await p.evaluate(()=>{const t=colorCard.querySelector('.at-total');return getComputedStyle(t).transitionDuration==='0s'&&t.getAnimations().length===0;}));
  assert.equal(await p.evaluate(()=>JSON.stringify(DB)),await p.evaluate(()=>colorDB));assert.deepEqual(errors,[]);console.log('PASS '+theme+': smooth forward/reverse text colors, replay preserved, 40px focus export pixels, all-workouts reset, running singular, reduced motion and data unchanged');await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
