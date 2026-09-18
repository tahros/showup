/* check-live-fold.cjs -- v4.6.68/v4.6.70: the fold folds, with a body.
   Measures in Chromium what jsdom cannot: the capsule is a capsule (under 60%
   of the open bar, centred) at 320/390/430, the three-beat animation runs
   without a page error, and it leaves the bar in its resting state -- no
   lw-anim class, the capsule width, no stray forwards-fill on the words.
   Serve the repo on 127.0.0.1:8784 first, like the other check-*.cjs. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});const errs=[];let bad=0;const p=await b.newPage({serviceWorkers:'block'});p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');
for(const width of [320,390,430]){
  await p.setViewportSize({width,height:852});
  const r=await p.evaluate(()=>{DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'}};todayISO='2026-09-18';checkDate=()=>false;document.querySelector('#onb')?.remove();
    DB.days[todayISO]={w:[{part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[15],at:Date.now()-399*60000}],doneEx:[],donePart:[],upd:1};SEED=deriveAll();view='lift';lift.part='Sixpack';lift.ex='Hanging Leg Raise';
    const out={};
    DB.settings.liveFold=false;render();syncLiveWorkout();let bar=document.getElementById('liveWorkoutBar');out.openW=Math.round(bar.getBoundingClientRect().width);out.openText=bar.querySelector('.live-workout-meta').textContent;
    DB.settings.liveFold=true;syncLiveWorkout();bar=document.getElementById('liveWorkoutBar');const rc=bar.getBoundingClientRect();out.foldW=Math.round(rc.width);out.centered=Math.abs((rc.left+rc.right)/2-innerWidth/2)<2;out.foldText=bar.querySelector('.lw-brief').textContent;
    DB.settings.liveFold=false;return out;});
  const ok=r.foldW<r.openW*0.6&&r.centered; if(!ok)bad++;
  console.log(`${ok?'OK  ':'FAIL'} ${width}px  open=${r.openW}px "${r.openText}"  folded=${r.foldW}px "${r.foldText}" centered=${r.centered}`);
}
// the animated path, end to end: tap, wait it out, inspect the resting state
await p.setViewportSize({width:390,height:852});
await p.evaluate(()=>{DB.settings.liveFold=false;syncLiveWorkout();});
const openW=await p.evaluate(()=>document.getElementById('liveWorkoutBar').getBoundingClientRect().width);
await p.evaluate(()=>document.getElementById('liveWorkoutFold').click());
await p.waitForTimeout(1200);
const rest=await p.evaluate(()=>{const bar=document.getElementById('liveWorkoutBar');const brief=bar.querySelector('.lw-brief');
  return {folded:bar.classList.contains('folded'),anim:bar.classList.contains('lw-anim'),w:Math.round(bar.getBoundingClientRect().width),briefOpacity:getComputedStyle(brief).opacity,running:document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.target&&bar.contains(a.effect.target)&&!(a.animationName||'').startsWith('live-workout')).length,persisted:DB.settings.liveFold===true};});
const animOk=rest.folded&&!rest.anim&&rest.w<openW*0.6&&rest.briefOpacity==='1'&&rest.running===0&&rest.persisted; if(!animOk)bad++;
console.log(`${animOk?'OK  ':'FAIL'} animated fold settles: folded=${rest.folded} lw-anim=${rest.anim} width=${rest.w}px words=${rest.briefOpacity} still-running=${rest.running} persisted=${rest.persisted}`);
await p.evaluate(()=>document.getElementById('liveWorkoutResume').click());
await p.waitForTimeout(1200);
const back=await p.evaluate(()=>{const bar=document.getElementById('liveWorkoutBar');return {open:!bar.classList.contains('folded'),anim:bar.classList.contains('lw-anim'),w:Math.round(bar.getBoundingClientRect().width),label:getComputedStyle(bar.querySelector('.lw-label')).opacity,chev:getComputedStyle(bar.querySelector('#liveWorkoutFold')).transform,glyph:getComputedStyle(bar.querySelector('#liveWorkoutFold svg')).transform};});
const backOk=back.open&&!back.anim&&Math.abs(back.w-openW)<2&&back.label==='1'&&(back.chev==='none'||back.chev==='matrix(1, 0, 0, 1, 0, 0)')&&back.glyph==='matrix(0, 1, -1, 0, 0, 0)'; if(!backOk)bad++;
console.log(`${backOk?'OK  ':'FAIL'} animated unfold settles: open=${back.open} width=${back.w}px (was ${Math.round(openW)}) words=${back.label} button=${back.chev} glyph=${back.glyph} (90deg = pointing down, as drawn)`);
console.log(bad||errs.length?`FAIL ${bad} checks, errors: ${JSON.stringify(errs)}`:'PASS the fold folds, with a body, and comes to rest');
await b.close();process.exit(bad||errs.length?1:0);})().catch(e=>{console.error(e);process.exit(1)});
