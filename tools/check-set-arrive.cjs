/* check-set-arrive.cjs — v4.6.107: a tap in the Your sets table glides the page
 * up to the entry panel and the values change ON ARRIVAL, where you can see them.
 *
 * Measured frame by frame, not read off the code:
 *  - the page moves through many intermediate scroll positions (a glide, not a jump)
 *  - #wv still shows the OLD weight when the panel comes into view, and the new
 *    one only after landing -- the change happens in sight
 *  - the rep ruler slides (scrollLeft passes through intermediate values)
 *  - Plan, Last and Logged cells all load; a touch mid-glide stops the glide and
 *    commits at once; a second tap supersedes the first; leaving the exercise
 *    mid-glide drops the load; reduced motion commits synchronously and jumps.
 * PW_PORT / PW_CHROME override the defaults.
 */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8784';
const LB=2.20462, kg=lb=>lb/LB;
const seed=theme=>`
 todayISO='2026-09-23';checkDate=()=>false;document.querySelector('#onb')?.remove();
 DB={days:{},settings:{unit:'lb',onboarded:true,theme:'${theme}',mascotMotion:'still'}};
 DB.days['2026-09-15']={w:[{ex:'Bent-Over Row',part:'Back',w:${kg(185)},reps:[8,10,8,6],at:1}],doneAll:true,upd:1};
 DB.plan={d:todayISO,items:[{ex:'Bent-Over Row',lines:[{w:${kg(185)},reps:[8,8,8,8]}]}]};
 SEED=deriveAll();
 lift={part:'Back',ex:'Bent-Over Row',weight:${kg(135)},rep:12};view='lift';
 plLog({ex:lift.ex,part:'Back',w:${kg(135)},reps:[12],at:100});applyTheme();render();`;

async function toTable(p){
  await p.evaluate(()=>{const r=document.querySelector('.sc-session tbody tr:nth-child(2)').getBoundingClientRect();scrollTo(0,scrollY+r.top-380);});
  await p.waitForTimeout(120);
  assert(await p.evaluate(()=>plZoneY()!==null),'the entry panel is off screen before the tap');
}
/* sample scroll, the weight field and the ruler every frame, from inside the page */
const sample=(p,ms)=>p.evaluate(ms=>new Promise(res=>{
  const out=[],t0=performance.now(),hdr=document.querySelector('header');
  const f=()=>{const z=document.querySelector('#view .zone.prime'),wv=document.getElementById('wv'),rr=document.getElementById('repRuler');
    out.push({t:Math.round(performance.now()-t0),y:Math.round(scrollY),wv:wv?.value,
      zoneVisible:!!z&&z.getBoundingClientRect().top>=hdr.getBoundingClientRect().bottom-2&&z.getBoundingClientRect().top<innerHeight*0.6,
      rl:rr?Math.round(rr.scrollLeft):null,pulse:!!document.querySelector('.pl-arrive')});
    if(performance.now()-t0<ms)requestAnimationFrame(f);else res(out);};
  requestAnimationFrame(f);}),ms);
const click=(p,sel)=>p.evaluate(sel=>document.querySelector(sel).click(),sel);
const state=p=>p.evaluate(()=>({w:Math.round(lift.weight*2.20462),r:lift.rep,wv:document.getElementById('wv').value,
  add:document.getElementById('addrep')?.textContent,on:document.querySelector('#repRuler .rr.on')?.dataset.rep,y:Math.round(scrollY),zoneY:plZoneY()}));

(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});try{
 for(const theme of ['light','dark'])for(const width of [402,320]){
  const p=await b.newPage({viewport:{width,height:874},deviceScaleFactor:2,serviceWorkers:'block'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:'+PORT+'/');await p.evaluate(seed(theme));await p.waitForTimeout(250);
  const tag=`${theme} ${width}`;
  await toTable(p);await click(p,'.sc-session tbody tr:nth-child(1) .sc-now');await p.waitForTimeout(900);   // warm-up glide, not measured

  /* 1. Last cell, set 2: 185 x 10 */
  await toTable(p);
  const run=sample(p,1300);await p.waitForTimeout(16);
  await click(p,'.sc-session tbody tr:nth-child(2) .sc-history');
  const s=await run;
  const ys=s.map(x=>x.y), distinct=new Set(ys).size;
  for(let i=1;i<ys.length;i++)assert(ys[i]<=ys[i-1]+1,`${tag}: the glide only ever moves up (${ys.slice(0,40).join(',')})`);
  /* a glide versus a jump is a matter of TIME, not frame count: headless Chromium
     drops frames on a cold page, and a time-based glide still lands on schedule
     with fewer of them -- exactly as it should on a stuttering phone. So: the
     weight must not land before 200ms, and the page must pass through more than
     its start and end positions on the way. */
  const landT=s.find(x=>x.wv==='185')?.t;
  assert(landT>=200,`${tag}: the load waits for the glide (landed at ${landT}ms)`);
  assert(distinct>=5,`${tag}: a glide through ${distinct} positions, not a jump -- ${s.map(x=>x.t+":"+x.y).join(" ")}`);
  const firstSeen=s.find(x=>x.zoneVisible);
  assert(firstSeen,`${tag}: the entry panel comes into view`);
  assert.equal(firstSeen.wv,'135',`${tag}: when the panel first appears it still shows the OLD weight`);
  const land=s.findIndex(x=>x.wv==='185');
  assert(land>0&&s.slice(0,land).every(x=>x.wv==='135'),`${tag}: the weight changes exactly once, after arriving`);
  assert(s[land].zoneVisible,`${tag}: the new weight lands while the panel is in view`);
  const rls=s.slice(land).map(x=>x.rl);
  assert(new Set(rls).size>=4,`${tag}: the rep ruler slides to its new notch (${[...new Set(rls)].join(',')})`);
  assert(s.some(x=>x.pulse),`${tag}: the arrival pulse runs`);
  let st=await state(p);
  assert.deepEqual([st.w,st.r,st.on,st.add],[185,10,'10','Add set · 10 reps'],`${tag}: 185 x 10 loaded`);
  assert.equal(st.zoneY,null,`${tag}: and the panel is where you can see it`);
  console.log(`PASS ${tag}: Last glides ${ys[0]}→${ys.at(-1)} through ${distinct} positions in ${s[land].t}ms, then 135→185 and ×12→×10 in view`);

  /* 2. Plan cell, set 3: 185 x 8 (weight unchanged, reps move) */
  await toTable(p);await click(p,'.sc-session tbody tr:nth-child(3) .sc-plan');await p.waitForTimeout(1100);
  st=await state(p);assert.deepEqual([st.w,st.r,st.on],[185,8,'8'],`${tag}: Plan loads 185 x 8`);assert.equal(st.zoneY,null);

  /* 3. your thumb wins: a touch mid-glide stops it and commits immediately */
  await toTable(p);
  await click(p,'.sc-session tbody tr:nth-child(4) .sc-history');
  await p.waitForTimeout(110);
  await p.evaluate(()=>document.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[]})));
  const yStop=await p.evaluate(()=>scrollY);st=await state(p);
  assert.deepEqual([st.w,st.r],[185,6],`${tag}: the set loads the moment you take over`);
  await p.waitForTimeout(500);
  assert.equal(await p.evaluate(()=>scrollY),yStop,`${tag}: and the page stays where your thumb stopped it`);

  /* 4. a second tap supersedes the first */
  await toTable(p);
  const reps4=p.evaluate(()=>new Promise(res=>{const seen=new Set(),t0=performance.now();
    const f=()=>{seen.add(lift.rep);if(performance.now()-t0<1300)requestAnimationFrame(f);else res([...seen]);};requestAnimationFrame(f);}));
  await click(p,'.sc-session tbody tr:nth-child(2) .sc-history');   // 185 x 10 -- superseded
  await p.waitForTimeout(60);
  await click(p,'.sc-session tbody tr:nth-child(1) .sc-now');       // logged 135 x 12 -- wins
  const seen4=await reps4;st=await state(p);
  assert.deepEqual([st.w,st.r],[135,12],`${tag}: the later tap wins`);
  assert(!seen4.includes(10),`${tag}: the superseded set never lands, not even for a frame (reps seen: ${seen4.join(',')})`);
  assert.deepEqual(seen4.sort((a,b)=>a-b),[6,12],`${tag}: and the rep only ever reads what was chosen -- no notch passing under the band counts (${seen4.join(',')})`);

  /* 4b. the hazard itself: Add tapped mid-slide logs the CHOSEN reps */
  await toTable(p);
  await click(p,'.sc-session tbody tr:nth-child(2) .sc-history');   // 185 x 10, from 135 x 12
  await p.waitForFunction(()=>Math.round(lift.weight*2.20462)===185,null,{timeout:2000});   // landed; the ruler is sliding now
  await p.waitForTimeout(60);
  const logged=await p.evaluate(()=>{const before=(DB.days[todayISO].w||[]).length;document.getElementById('addrep').click();
    const w=DB.days[todayISO].w;return {added:w.length-before,reps:w.at(-1).reps,lb:Math.round(w.at(-1).w*2.20462)};});
  assert.deepEqual([logged.added,logged.lb],[1,185],`${tag}: one set added at 185`);
  assert.deepEqual(logged.reps,[10],`${tag}: Add tapped mid-slide logs the CHOSEN 10 reps, not a notch in passing (${logged.reps})`);

  /* 4c. a finger on the ruler mid-slide wins at once -- the lock never blocks a real scrub */
  await toTable(p);
  await click(p,'.sc-session tbody tr:nth-child(1) .sc-now');       // 135 x 12, from 185 x 10
  await p.waitForFunction(()=>Math.round(lift.weight*2.20462)===135,null,{timeout:2000});
  const scrub=await p.evaluate(()=>new Promise(res=>{
    const el=document.getElementById('repRuler');
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    el.scrollTo({left:(4/rulerStep(lift.ex)-1)*REP_W,behavior:'auto'});
    setTimeout(()=>res(lift.rep),120);
  }));
  assert.equal(scrub,4,`${tag}: a finger on the ruler mid-slide sets the rep immediately (got ${scrub})`);

  /* 5. leaving the exercise mid-glide drops the load */
  await toTable(p);
  const before5=await p.evaluate(()=>({w:Math.round(lift.weight*2.20462),r:lift.rep}));
  await click(p,'.sc-session tbody tr:nth-child(1) .sc-now');       // would load 135 x 12
  assert.notDeepEqual([before5.w,before5.r],[135,12],'(fixture) the tapped values differ from the current ones');
  await p.waitForTimeout(90);
  await p.evaluate(()=>{view='today';render();});
  await p.waitForTimeout(900);
  const kept=await p.evaluate(()=>({w:Math.round(lift.weight*2.20462),r:lift.rep}));
  assert.deepEqual(kept,before5,`${tag}: nothing lands after you leave`);

  assert.deepEqual(errors,[],errors.join('\n'));
  console.log(`PASS ${tag}: Plan loads; thumb takeover; later tap wins; leaving drops it`);
  await p.close();
 }
 /* 6. reduced motion: commit synchronously, jump, no pulse */
 const ctx=await b.newContext({viewport:{width:402,height:874},reducedMotion:'reduce',serviceWorkers:'block'});
 const p=await ctx.newPage();
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
 await p.goto('http://127.0.0.1:'+PORT+'/');await p.evaluate(seed('light'));await p.waitForTimeout(250);
 assert.equal(await p.evaluate(()=>MOTION_OK),false);
 await toTable(p);
 const now=await p.evaluate(()=>{document.querySelector('.sc-session tbody tr:nth-child(2) .sc-history').click();
   return {w:Math.round(lift.weight*2.20462),r:lift.rep,zoneY:plZoneY(),pulse:!!document.querySelector('.pl-arrive')};});
 assert.deepEqual([now.w,now.r,now.zoneY,now.pulse],[185,10,null,false],'reduced motion: loaded, in view, no pulse — all in the same tick');
 console.log('PASS reduced motion: commits and jumps in one tick, no pulse');
 await ctx.close();
}finally{await b.close();}})().catch(e=>{console.error(e.message||e);process.exitCode=1});
