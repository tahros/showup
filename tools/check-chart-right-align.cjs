/* check-chart-right-align.cjs -- v4.6.162: a short range sits at the RIGHT.
   The exercise chart has fixed columns (12 Sessions or 4). When a range holds
   fewer sessions -- the oldest range of your history, or a short history --
   the sessions sit in the right-hand columns, the newest in the last one, and
   the empty columns fall on the left. Opens the real app in Chromium (402px,
   light and dark) on Progress, with a Deadlift with 17 sessions, and checks both modes at the
   latest and the oldest range, plus a 3-session history: every session's dots
   sit in its own column counted from the right, the date labels line up with
   them, the selection band covers the picked session's column, and nothing
   spills past the plot. Nothing is logged. Serve the repo on 127.0.0.1:8784. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)bad++;};
  try{
  const p=await b.newPage({viewport:{width:402,height:874},serviceWorkers:'block'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${PORT}/`);
  const boot=async(theme,n)=>{await p.evaluate(({theme,n})=>{
    const days={},base=new Date('2026-09-28T12:00:00');
    for(let i=0;i<n;i++){const d=new Date(base-(n-i)*4*864e5),iso=d.toLocaleDateString('en-CA');
      days[iso]={w:[135,185+i*4].flatMap((lb,k)=>[0,1,2,3].map(j=>({part:'Back',ex:'Deadlift',w:lb/2.20462,reps:[k?6:8],at:+d+k*6e5+j*6e4}))),lastAt:+d,doneEx:[],donePart:[],doneAll:true,upd:1,sugX:{},planOpen:{}};}
    DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',flow:'refined',theme,bar:theme,mascotMotion:'still',myParts:['Back']}};
    todayISO='2026-09-29';checkDate=()=>false;document.querySelector('#onb')?.remove();
    try{localStorage.clear();}catch(_){}
    for(const k of Object.keys(progressionUI))delete progressionUI[k];progressionViews=Object.create(null);   /* each boot starts from a fresh chart state (the range is remembered per exercise) */
    SEED=deriveAll();view='stats';applyTheme();dayMeta();render();
  },{theme,n});await p.waitForSelector('.progression-card [data-pg-action="dots"]',{timeout:5000});await p.waitForTimeout(150);};
  const tap=a=>p.evaluate(a=>{document.querySelector(`.progression-card [data-pg-action="${a}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true}));},a);
  const measure=()=>p.evaluate(()=>{
    const card=document.querySelector('.progression-card'),g=card._pg,m=g.layout;
    const col=i=>m.left+(i+.5)*m.col,cols=g.count,dates=g.dates,lead=cols-dates.length;
    /* each session's dots, from the drawn SVG: the column each one falls in */
    const pts=m.points.map(pt=>({d:pt.r.d,colOf:Math.floor((pt.x-m.left)/m.col)}));
    const inOwn=pts.every(pt=>pt.colOf===lead+dates.indexOf(pt.d));
    const band=card.querySelector('.pg-selection-band'),pick=m.points.find(pt=>pt.r.id===g.state.pick);
    const bandCol=Math.round((+band.getAttribute('x')-m.left)/m.col);
    const ticksOk=m.dateTicks.every(t=>{const i=dates.map(pgShortDate).indexOf(t.label);return i>=0&&Math.abs(t.x-col(lead+i))<0.5;});
    const maxX=Math.max(...m.points.map(pt=>pt.x)),minX=Math.min(...m.points.map(pt=>pt.x));
    return {sessions:dates.length,cols,lead,inOwn,newestCol:lead+dates.length-1,bandCol,pickCol:pick?lead+dates.indexOf(pick.r.d):-1,
      ticksOk,inside:minX>=m.left&&maxX<=m.width-m.right,firstColEmpty:lead===0||!pts.some(pt=>pt.colOf<lead)};
  });
  for(const theme of ['light','dark']){
    await boot(theme,17);await p.waitForTimeout(600);await tap('dots');await p.waitForTimeout(400);
    let r=await measure();
    ok(`${theme} 12 Sessions, latest: all 12 columns used`, r.sessions===12&&r.lead===0&&r.inOwn&&r.ticksOk&&r.inside, JSON.stringify(r));
    await tap('prev-range');await p.waitForTimeout(120);r=await measure();
    ok(`${theme} 12 Sessions, oldest range (5): sessions sit in the right 5 columns`, r.sessions===5&&r.lead===7&&r.inOwn&&r.newestCol===11&&r.firstColEmpty, JSON.stringify(r));
    ok(`${theme} ...date labels line up with them`, r.ticksOk);
    ok(`${theme} ...the selection band covers the picked session`, r.bandCol===r.pickCol&&r.pickCol>=7, `band ${r.bandCol} pick ${r.pickCol}`);
    ok(`${theme} ...and nothing spills past the plot`, r.inside);
    await tap('prev-set');await p.waitForTimeout(80);r=await measure();
    ok(`${theme} ...the band follows the slider`, r.bandCol===r.pickCol, `band ${r.bandCol} pick ${r.pickCol}`);
    await tap('numbers');await p.waitForTimeout(120);await tap('latest');await p.waitForTimeout(80);
    for(let i=0;i<4;i++){await tap('prev-range');await p.waitForTimeout(60);}
    r=await measure();
    ok(`${theme} 4 Sessions, oldest range (1): the one session sits in the last column`, r.sessions===1&&r.lead===3&&r.inOwn&&r.newestCol===3&&r.ticksOk, JSON.stringify(r));
    await boot(theme,3);await tap('dots');await p.waitForTimeout(120);r=await measure();
    ok(`${theme} a 3-session history on 12 Sessions sits at the right too`, r.sessions===3&&r.lead===9&&r.inOwn&&r.ticksOk&&r.inside, JSON.stringify(r));
    if(theme==='light'){await boot(theme,17);await tap('dots');await tap('prev-range');await p.waitForTimeout(300);
      const el=await p.$('.progression-card');await el.screenshot({path:'../chart-right-align.png'});}
  }
  if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
  }finally{await b.close();}
  console.log(bad?`FAIL chart right-align (${bad})`:'PASS chart right-align');process.exit(bad?1:0);
})();
