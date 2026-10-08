/* PW_PORT=8787; optional ATTENDANCE_ORIGIN and QA_DIR.
   App DOM/replay and export headings, both week starts/themes/filters. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const origin=process.env.ATTENDANCE_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8787)+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
 const p=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);await p.waitForTimeout(4000);
 await p.evaluate(()=>{
  document.querySelector('#onb')?.remove();todayISO='2026-10-07';checkDate=()=>false;
  DB.settings={...DB.settings,onboarded:true,name:'Share layout QA'};DB.days={};
  for(let t=Date.UTC(2021,11,1),i=0;t<=Date.UTC(2026,9,7);t+=86400000,i++)if(i%7<4)DB.days[new Date(t).toISOString().slice(0,10)]={w:[{part:i%2?'Back':'Legs',ex:'Squat',w:50,reps:[8]}]};
  SEED=deriveAll();view='stats';
  const bind=bindPlateExport;bindPlateExport=(...args)=>{window.headingExport=args[4];return bind(...args);};
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
   if(window.captureYears&&/^202[1-6]$/.test(String(text))&&this.font.includes('IBM Plex Mono')){
    const box=this.measureText(String(text));window.yearDraws.push({text:String(text),x,y,align:this.textAlign,font:this.font,descent:box.actualBoundingBoxDescent});
   }
   return fill.call(this,text,x,y,...rest);
  };
 });
 for(const theme of ['light','dark'])for(const weekStart of ['sunday','monday'])for(const part of ['All workouts','Back']){
  await p.evaluate(({theme,weekStart,part})=>{
   DB.settings={...DB.settings,theme,bar:theme,weekStart};view='stats';applyTheme();render();
  },{theme,weekStart,part});
  await p.locator(`[data-attendance-part="${part}"]`).click();
  for(const width of [320,393,430,736]){
   await p.setViewportSize({width,height:852});
   const appLabels=await p.evaluate(()=>{
    const card=document.querySelector('.attendance-card'),select=card.querySelector('.at-motion');select.value='Off';select.dispatchEvent(new Event('change'));
    const comp=card.querySelector('.at-composition'),S=card._attendance,G=attendanceView.geometry(S.M,comp.clientWidth,comp.clientHeight),parent=S.overview.getBoundingClientRect();
    return [...S.overview.querySelectorAll('.at-atlas-label')].filter(el=>el.dataset.kind==='year').map(el=>{
     const b=el.getBoundingClientRect(),ds=S.M.days.filter(d=>new Date(d.n*86400000).getUTCFullYear()===Number(el.textContent)),rs=ds.map(d=>G.overview(d));
     return {year:el.textContent,center:b.x-parent.x+b.width/2,expected:(Math.min(...rs.map(r=>r.x))+Math.max(...rs.map(r=>r.x+r.w)))/2};
    });
   });
   assert.equal(appLabels.length,6);for(const l of appLabels)assert(Math.abs(l.center-l.expected)<.1,`app ${width}px ${l.year} must center on weekday span`);
  }
  await p.setViewportSize({width:393,height:852});
  if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await p.locator('.attendance-card').screenshot({path:process.env.QA_DIR+'/app-'+theme+'-'+weekStart+'-'+(part==='Back'?'back':'all')+'.png'});}
  const replayLabels=await p.evaluate(()=>{
   const card=document.querySelector('.attendance-card'),select=card.querySelector('.at-motion');select.value='Full journey';select.dispatchEvent(new Event('change'));
   heatReplay.play(card);window.yearDraws=[];window.captureYears=true;card._attendance.scene.seek(heatReplay.exportEnd);window.captureYears=false;
   const comp=card.querySelector('.at-composition'),G=attendanceView.geometry(card._attendance.M,comp.clientWidth,comp.clientHeight);
   return {labels:yearDraws,expected:G.atlas.labels.filter(l=>l.kind==='year').map(l=>({text:l.text,x:G.heading(l).x}))};
  });
  assert.equal(replayLabels.labels.length,6);for(const l of replayLabels.labels){assert.equal(l.align,'center');assert(Math.abs(l.x-replayLabels.expected.find(e=>e.text===l.text).x)<.001,'replay and static app headings must match');}
  await p.evaluate(()=>{
   heatReplay.play(document.querySelector('.attendance-card'));heatReplay.finish();
   window.beforeHeadingShare=JSON.stringify(DB);window.yearDraws=[];window.captureYears=true;
  });
  await p.evaluate(()=>heatReplay.share(document.querySelector('.attendance-card')));
  const result=await p.evaluate(()=>{
   window.captureYears=false;
   const M=document.querySelector('.attendance-card')._attendance.M,G=attendanceView.geometry(M,940,685,true),app=attendanceView.geometry(M,340,414);
   return {
    labels:yearDraws,
    spans:M.years.map(year=>{const ds=M.days.filter(d=>new Date(d.n*86400000).getUTCFullYear()===year),rs=ds.map(d=>G.overview(d));return {year,left:Math.min(...rs.map(r=>r.x)),right:Math.max(...rs.map(r=>r.x+r.w)),top:Math.min(...rs.map(r=>r.y))};}),
    appUnchanged:M.days.every(d=>{const a=app.overview(d),b=app.atlas.points.get(d.n);return Math.abs(a.y-(84+b.y*app.sy))<1e-8;}),
    sizeUnchanged:M.days.every(d=>{const a=G.overview(d),b=G.atlas.points.get(d.n);return a.w===Math.min(b.w*G.sx,b.h*G.sy);}),
    contained:M.days.every(d=>{const r=G.overview(d);return r.y+r.h<=685&&r.x+r.w<=940;}),
    savedUnchanged:JSON.stringify(DB)===beforeHeadingShare
   };
  });
  assert.equal(result.labels.length,6);
  for(const l of result.labels){const span=result.spans.find(s=>String(s.year)===l.text);assert.equal(l.align,'center');assert(Math.abs(l.x-(span.left+span.right)/2)<.001,'year must center on visible weekday span');if(span.year>2021)assert(span.top-(l.y+l.descent)>30,'extra gap below visible year glyphs');}
  assert(result.appUnchanged&&result.sizeUnchanged&&result.contained&&result.savedUnchanged);
  // Force a distinct final animated frame, rather than reusing the still cache.
  const motionLabels=await p.evaluate(()=>{window.yearDraws=[];window.captureYears=true;headingExport.render(heatReplay.exportEnd);window.captureYears=false;return yearDraws;});
  assert.deepEqual(motionLabels,result.labels,'same label composition in animated final frame');
  if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});const png=await p.evaluate(()=>_repCv.cv.toDataURL());fs.writeFileSync(process.env.QA_DIR+'/headings-'+theme+'-'+weekStart+'-'+(part==='Back'?'back':'all')+'.png',Buffer.from(png.split(',')[1],'base64'));}
  await p.evaluate(()=>{plateExportCleanup();document.querySelector('#repOv').style.display='none';syncModalLock();});
  console.log('PASS '+theme+' / '+weekStart+' / '+part+': centered app at four widths, replay and export headings, unchanged squares and records');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
