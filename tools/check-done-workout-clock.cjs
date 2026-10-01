/* check-done-workout-clock.cjs -- v4.6.172: "Done with <exercise>" hands the live
   header back to the workout. The maker pressed Done with Hanging Leg Raise and
   the header kept that name and its rest clock (0:12). Now, in portrait: inside
   an exercise, its name and rest clock; after Done, "Workout" and the time since
   the workout's first set; the next logged set, that exercise and a fresh rest
   clock; landscape keeps its rest stage ("Between exercises"). Light and dark.
   Nothing is logged to a real record. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c?'':' → '+g));if(!c)bad++;};
  try{
  for(const theme of ['light','dark']){
    const p=await b.newPage({viewport:{width:402,height:874},serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(600);
    const hdr=async()=>{await p.waitForTimeout(1150);return p.evaluate(()=>({date:$('#hDate').textContent,ctx:document.querySelector('#hTimer .rt-ctx')?.textContent,on:document.getElementById('hTimer').classList.contains('on'),
      sec:(()=>{const t=document.querySelector('#hTimer .rt-time');return t?(+t.querySelector('.rt-min').textContent)*60+(+t.querySelector('.rt-sec').textContent):null;})()}));};
    await p.evaluate(theme=>{const now=Date.now(),t=new Date().toLocaleDateString('en-CA');todayISO=t;
      DB={days:{[t]:{w:[{part:'Legs',ex:'Squat',w:100,reps:[5],at:now-40*60000},{part:'Cardio',ex:'Run',w:0,reps:[1],at:now-20*60000},{part:'Sixpack',ex:'Hanging Leg Raise',w:0,bw:true,reps:[10],at:now-90000},{part:'Sixpack',ex:'Hanging Leg Raise',w:0,bw:true,reps:[10],at:now-12000}],doneEx:['Squat','Run'],donePart:[],doneAll:false}},settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};
      document.querySelector('#onb')?.remove();SEED=deriveAll();lastSetAt=now-12000;applyTheme();view='lift';lift={part:'Sixpack',ex:'Hanging Leg Raise',weight:0};render();},theme);
    let h=await hdr();
    ok(`${theme}: inside the exercise, its name and its rest clock`,h.date==='Hanging Leg Raise'&&h.ctx==='Hanging Leg Raise'&&h.on&&h.sec>=12&&h.sec<20,JSON.stringify(h));
    await p.evaluate(()=>document.getElementById('doneExBtn').click());
    h=await hdr();
    ok(`${theme}: after Done, "Workout" and the workout's own clock (~40 min)`,h.date==='Workout'&&h.ctx==='Workout'&&h.on&&h.sec>=2395&&h.sec<2410,JSON.stringify(h));
    await p.evaluate(()=>{const now=Date.now();DB.days[todayISO].w.push({part:'Sixpack',ex:'Decline Sit Up',w:0,bw:true,reps:[12],at:now});lastSetAt=now;SEED=deriveAll();view='lift';lift={part:'Sixpack',ex:'Decline Sit Up',weight:0};render();});
    h=await hdr();
    ok(`${theme}: the next logged set takes the header back, rest from 0`,h.date==='Decline Sit Up'&&h.ctx==='Decline Sit Up'&&h.sec<5,JSON.stringify(h));
    await p.evaluate(()=>{lift.ex=null;view='lift';render();});
    h=await hdr();
    ok(`${theme}: leaving an exercise that is not done keeps it (rest still counts)`,h.date==='Decline Sit Up'&&h.ctx==='Decline Sit Up'&&h.sec<8,JSON.stringify(h));
    await p.evaluate(()=>{lift={part:'Sixpack',ex:'Decline Sit Up',weight:0};render();document.getElementById('doneExBtn').click();});
    h=await hdr();
    ok(`${theme}: Done again, back to "Workout"`,h.date==='Workout'&&h.ctx==='Workout'&&h.sec>=2400,JSON.stringify(h));
    if(theme==='light')await p.screenshot({path:'../done-workout-clock.png',clip:{x:0,y:0,width:402,height:130}});
    await p.setViewportSize({width:874,height:402});await p.waitForTimeout(1500);
    const l=await p.evaluate(()=>({big:document.documentElement.classList.contains('bigtimer'),ctx:document.querySelector('#hTimer .rt-ctx')?.textContent,t:document.querySelector('#hTimer .rt-time')?.textContent}));
    ok(`${theme}: landscape keeps its rest stage`,l.big&&l.ctx==='Between exercises'&&/^0:0\d$/.test(l.t),JSON.stringify(l));
    await p.setViewportSize({width:402,height:874});h=await hdr();
    ok(`${theme}: back in portrait, the workout clock again`,h.ctx==='Workout'&&h.sec>=2400,JSON.stringify(h));
    await p.evaluate(()=>{DB.days[todayISO].doneAll=true;render();});h=await hdr();
    ok(`${theme}: a finished workout shows no workout clock`,h.ctx!=='Workout',JSON.stringify(h));
    if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL done workout clock (${bad})`:'PASS done workout clock');process.exit(bad?1:0);
})();
