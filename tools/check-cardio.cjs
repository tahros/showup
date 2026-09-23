/* check-cardio.cjs — v4.6.108: every cardio activity, end to end, in Chromium.
 * Logs each of the eight through its own screen, then edits and deletes a ride
 * in History, and draws the share card for a mixed day. Fails on any page
 * error, a weight stepper on a cardio screen, or a wrong stored value.
 * PW_PORT / PW_CHROME override the defaults. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8784';
const CASES=[   // ex, distance typed, min, sec, expected km, expected header noun
 ['Run','3.1','28','0',4.98897,'run'],['Walk','2.1','35','0',3.37962,'walk'],['Cycling','12.5','40','30',20.1168,'ride'],
 ['Rowing','2000','7','58',2,'row'],['Swimming','1000','22','0',0.9144,'swim'],
 ['Elliptical',null,'30','0',0,'session'],['Stair Climber',null,'15','0',0,'climb'],['Jump Rope',null,'10','0',0,'session']];
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});try{
 for(const theme of ['light','dark']){
  const p=await b.newPage({viewport:{width:402,height:874},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:'+PORT+'/');
  await p.evaluate(theme=>{todayISO='2026-09-23';checkDate=()=>false;document.querySelector('#onb')?.remove();
    DB={days:{'2026-09-01':{w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8],at:1}],doneAll:true,upd:1}},settings:{unit:'lb',onboarded:true,theme,mascotMotion:'still'}};
    SEED=deriveAll();applyTheme();},theme);
  for(const [ex,d,m,s,km,noun] of CASES){
    await p.evaluate(ex=>{liftEnter({part:'Run',ex});view='lift';render();},ex);await p.waitForTimeout(220);
    const f=await p.evaluate(()=>({wv:!!document.getElementById('wv'),ruler:!!document.getElementById('repRuler'),rk:!!document.getElementById('rk'),btn:document.getElementById('addrun')?.textContent.trim()}));
    assert(!f.wv&&!f.ruler,`${ex}: no weight stepper or rep ruler`);
    assert.equal(f.rk,d!=null,`${ex}: a distance field exactly when the activity has distance`);
    assert.equal(f.btn,'Add '+noun,`${ex}: the button names the activity`);
    await p.evaluate(({d,m,s})=>{if(d!=null)document.getElementById('rk').value=d;document.getElementById('rm').value=m;document.getElementById('rs').value=s;document.getElementById('addrun').click();},{d,m,s});
    await p.waitForTimeout(120);
    const row=await p.evaluate(ex=>{const r=DB.days[todayISO].w.filter(x=>x.ex===ex).at(-1);return r&&{part:r.part,w:r.w,mins:r.mins,secs:r.secs,reps:r.reps.length};},ex);
    assert(row&&row.part==='Run'&&row.reps===0&&Math.abs(row.w-km)<1e-3&&row.mins===+m,`${ex}: stored ${JSON.stringify(row)}`);
    const sub=await p.evaluate(()=>document.getElementById('hSub').textContent);
    assert.equal(sub,`Cardio · 1 ${noun} logged`,`${ex}: the header counts ${noun}s under Cardio`);
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${ex}: no sideways scroll`);
  }
  console.log(`PASS ${theme}: all 8 activities log through their own screen, in their own unit, with no weight controls`);

  /* History: move today's ride to a past day, then edit and delete it there */
  await p.evaluate(()=>{const ride=DB.days[todayISO].w.find(x=>x.ex==='Cycling');DB.days['2026-09-10']={w:[{...ride},{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8],at:2}],doneAll:true,upd:1};
    SEED=deriveAll();view='history';hist.y=2026;hist.m=9;hist.edit='2026-09-10';render();});
  await p.waitForTimeout(300);
  const hs=await p.evaluate(()=>[...document.querySelectorAll('.hset')].map(b=>b.textContent.replace(/\s+/g,' ').trim()));
  assert(hs.some(t=>/12\.50 mi.*40'30"/.test(t)),`History edit mode shows the ride in miles with its time: ${JSON.stringify(hs)}`);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('.hset')].find(x=>/mi/.test(x.textContent));b.click();});
  await p.waitForTimeout(150);
  await p.evaluate(()=>{document.getElementById('hsW').value='15';document.getElementById('hsM').value='50';document.getElementById('hsS').value='0';document.getElementById('hsSave').click();});
  await p.waitForTimeout(150);
  let ride=await p.evaluate(()=>DB.days['2026-09-10'].w.find(x=>x.ex==='Cycling'));
  assert(ride&&Math.abs(ride.w-24.14016)<1e-3&&ride.mins===50,`History edit converts miles and keeps the ride: ${JSON.stringify(ride)}`);
  await p.evaluate(()=>{const i=[...document.querySelectorAll('.hsx')].find(x=>/Delete ride/.test(x.getAttribute('aria-label')));i.click();});
  await p.waitForTimeout(150);
  const left=await p.evaluate(()=>DB.days['2026-09-10'].w.map(x=>x.ex+':'+(x.reps||[]).length));
  assert.deepEqual(left,['Barbell Bench Press:2'],`deleting the ride removes it and only it: ${left}`);
  console.log(`PASS ${theme}: History shows, edits (with unit conversion) and deletes a ride, and the bench sets survive`);

  /* the share card: record every string it paints for a mixed past day */
  const painted=await p.evaluate(()=>{
    DB.days['2026-09-12']={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:25,secs:0,at:1},
      {part:'Run',ex:'Cycling',w:20.1168,reps:[],mins:40,secs:30,at:2},
      {part:'Run',ex:'Elliptical',w:0,reps:[],mins:30,secs:0,at:3},
      {part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8],at:4}],doneAll:true,upd:1};
    SEED=deriveAll();
    const cv=document.createElement('canvas');cv.width=cv.height=1080;const x=cv.getContext('2d'),seen=[];
    const f=x.fillText.bind(x);x.fillText=(t,...a)=>{seen.push(String(t));return f(t,...a);};
    try{drawDayCard(x,1080,'2026-09-12');}catch(e){return {err:e.message};}
    return {seen,h:cv.height};});
  assert(!painted.err,'share card threw: '+painted.err);
  const txt=painted.seen.join(' | ');
  assert(painted.seen.includes('Cycling')&&painted.seen.includes('12.50')&&painted.seen.includes('mi'),`share card shows the ride in miles: ${txt}`);
  assert(painted.seen.includes('Elliptical')&&painted.seen.includes(`30'00"`),`share card shows the time-only session: ${txt}`);
  assert(!/Cycling[^|]*lb|20\.1|× /.test(painted.seen.filter(t=>/Cycling|20\.1/.test(t)).join(' ')),`no ride drawn as a weight: ${txt}`);
  console.log(`PASS ${theme}: the share card draws the ride as 12.50 mi and the elliptical as 30'00"`);
  assert.deepEqual(errors,[],errors.join('\n'));
  await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e.message||e);process.exitCode=1});
