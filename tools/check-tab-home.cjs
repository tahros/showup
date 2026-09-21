/* check-tab-home.cjs -- v4.6.97: TAPPING THE TAB YOU ARE ON GOES HOME.
   jsdom proves the state change (test-navpoints.js) but cannot see the two
   things that make this feel right in the hand: the front page is actually
   painted, and a tap while already standing there scrolls back to the top
   instead of doing nothing visible. Opens the real app, walks into an
   exercise, taps Train, then scrolls down and taps Train again.
   Serve the repo on 127.0.0.1:8784 first (PW_PORT to change it). */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8784';
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});try{
for(const width of [320,402,430]){
  const p=await b.newPage({viewport:{width,height:874},serviceWorkers:'block'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:'+PORT+'/');
  await p.evaluate(()=>{
    todayISO='2026-09-21';checkDate=()=>false;document.querySelector('#onb')?.remove();
    DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'off'},week:{days:{}},plan:null};
    const text="Squat\n  195 lb x 8 8 8\n\nHanging Leg Raise\n  BW x 15 15 15";
    const {items}=planItemsFrom(parsePlan(text));planSave(items,'',text,todayISO);
    SEED=deriveAll();plLog({ex:'Squat',part:'Legs',w:88.45,reps:[8],at:1});
    lift={part:'Legs',ex:'Squat',weight:88.45};view='lift';render();});
  await p.waitForTimeout(250);
  assert.equal(await p.evaluate(()=>lift.ex),'Squat','fixture: on the exercise');
  const exScreen=await p.evaluate(()=>!!document.querySelector('#repRuler,.sc-session'));
  assert(exScreen,'fixture: the exercise screen is painted');

  await p.locator('nav button[data-v="lift"]').click();
  await p.waitForTimeout(400);
  assert.equal(await p.evaluate(()=>lift.ex),null,width+': the tap leaves the exercise');
  assert.equal(await p.evaluate(()=>view),'lift',width+': and stays in Train');
  assert(await p.evaluate(()=>!!document.querySelector('#view .partrail,#view [data-part],#view .partlast')),
    width+': the front page is painted, not an empty view');

  // standing on the front page: the tap scrolls to the top and changes nothing else
  await p.evaluate(()=>{document.querySelector('#view').style.minHeight='2200px';scrollTo(0,900);});
  await p.waitForTimeout(120);
  assert(await p.evaluate(()=>scrollY>400),width+': fixture scrolled down');
  const before=await p.evaluate(()=>JSON.stringify({part:lift.part,ex:lift.ex,view}));
  await p.locator('nav button[data-v="lift"]').click();
  await p.waitForTimeout(700);
  assert.equal(await p.evaluate(()=>scrollY),0,width+': a tap at the front page returns to the top');
  assert.equal(await p.evaluate(()=>JSON.stringify({part:lift.part,ex:lift.ex,view})),before,
    width+': and moves nothing else');
  assert.deepEqual(errors,[],width+': no page errors');
  await p.close();
}
console.log('PASS Train tapped from an exercise paints its front page; tapped there again it scrolls to the top and keeps the part, at 320/402/430');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
