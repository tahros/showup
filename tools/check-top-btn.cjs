/* check-top-btn.cjs -- v4.6.178: the "↑ top" button sits just above the
   bottom chrome (the tab bar, or a bar PINNED above it) -- never above content
   that merely scrolls. The maker's case: the planner's Edit page scrolled to
   the end, whose Save row is in the page flow; the button had climbed onto
   "Add exercise". Also a plain long screen (Progress), and a pinned bar still
   lifting it. Light and dark, 320 and 402px. Serve the repo on 127.0.0.1:8784. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+g));if(!c)bad++;};
  try{
  for(const theme of ['light','dark'])for(const width of [320,402]){
    const tag=`${theme} ${width}:`;
    const p=await b.newPage({viewport:{width,height:874},serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    const where=()=>p.evaluate(()=>{const t=document.getElementById('calReturn'),n=document.getElementById('nav').getBoundingClientRect();const r=t.getBoundingClientRect();return {shown:!t.hidden,gap:Math.round(n.top-r.bottom),overAdd:[...document.querySelectorAll('#view button')].some(x=>/Add exercise/.test(x.textContent)&&(()=>{const a=x.getBoundingClientRect();return a.bottom>r.top&&a.top<r.bottom;})())};});
    await p.evaluate(async theme=>{
      const days={};for(let i=1;i<200;i+=2){const d=new Date('2026-10-01T12:00');d.setDate(d.getDate()-i);days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:100,reps:[6,6,6],at:d.getTime()}]};}
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();
      view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-02';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead(['Squat','Dumbbell Lunge','Leg Extension','Lying Leg Curl','Triceps Pushdown','Skull Crusher','Hanging Leg Raise','Leg Press','Seated Leg Curl','Cable Crunch'].map(e=>e+'\n  45 lb × 12\n  50 lb × 10 10 10\n  55 lb × 8').join('\n'));x.parts=['Legs','Triceps','Sixpack'];x.locks=[];x.source='Saved plan';s.active=d;s.step='edit';pfState().page='edit';pwRender();
      await new Promise(r=>setTimeout(r,500));window.scrollTo(0,document.documentElement.scrollHeight);},theme);
    await wait(500);
    let r=await where();
    ok(`${tag} Plan Edit at the end: the button sits just above the tab bar, not on "Add exercise"`,r.shown&&r.gap>=8&&r.gap<=20&&!r.overAdd,JSON.stringify(r));
    /* a bar pinned above the tab bar still lifts it */
    r=await p.evaluate(()=>{const f=document.querySelector('.pw-save-dock'),keep=f.getAttribute('style')||'';for(const [k,v] of [['position','fixed'],['left','20px'],['right','20px'],['bottom','96px'],['top','auto'],['transform','none'],['width','auto']])f.style.setProperty(k,v,'important');syncTopBtn();
      const t=document.getElementById('calReturn').getBoundingClientRect(),fr=f.getBoundingClientRect(),g=Math.round(fr.top-t.bottom);f.setAttribute('style',keep);syncTopBtn();return g;});
    ok(`${tag} a pinned bar above the tab bar still lifts it`,r>=8&&r<=20,r);
    /* Progress, a long ordinary screen */
    await p.evaluate(async()=>{lift.plan=null;view='stats';render();await new Promise(r=>setTimeout(r,600));window.scrollTo(0,1400);});await wait(400);
    r=await where();
    ok(`${tag} Progress: the button sits just above the tab bar`,r.shown&&r.gap>=8&&r.gap<=20,JSON.stringify(r));
    if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL top button (${bad})`:'PASS top button');process.exit(bad?1:0);
})();
