/* check-day-strip.cjs -- v4.6.160: the planner's day strip (Edit page) in the
   chips' language. Opens the real app in Chromium, light and dark, at
   320/393/430px, with 1, 3 and 7 planned days, and checks: each tile is at most
   68px wide and the row never overflows the page; the selected tile is the
   Body parts chips' selected style (tinted surface, accent edge) and nothing
   paints the solid accent slab one day used to; the unsaved dot still shows.
   Nothing is logged. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  try{
  const p=await b.newPage({viewport:{width:393,height:852},serviceWorkers:'block'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${PORT}/`);
  for(const theme of ['dark','light'])for(const width of [320,393,430])for(const n of [1,3,7]){
    await p.setViewportSize({width,height:852});
    const r=await p.evaluate(({theme,n})=>{
      DB={days:{},settings:{onboarded:true,unit:'lb',skin:'minimal',flow:'refined',theme,bar:theme,mascotMotion:'still'}};
      todayISO='2026-09-28';checkDate=()=>false;document.querySelector('#onb')?.remove();SEED=deriveAll();applyTheme();view='today';render();
      const dates=Array.from({length:n},(_,i)=>{const d=new Date('2026-09-29T12:00');d.setDate(d.getDate()+i);return d.toLocaleDateString('en-CA');});
      pwOpen(dates[0]);const s=pw();s.dates=dates;
      for(const d of dates){const x=pwDay(d);x.rows=pwRead('Deadlift\n  235 lb × 6 6 6 6');x.parts=['Back'];x.locks=[];}
      pwDay(dates[0]).source='Your draft';s.active=dates[0];s.step='edit';pfState().page='edit';pwRender();
      const strip=document.querySelector('.pf-strip'),tiles=[...strip.querySelectorAll('.pf-chip')],sel=strip.querySelector('.pf-chip.selected');
      const part=document.querySelector('.pf-part.selected'),cs=e=>getComputedStyle(e),acc=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const probe=document.createElement('i');probe.style.color=acc;document.body.appendChild(probe);const accRGB=getComputedStyle(probe).color;probe.remove();
      return {n:tiles.length,maxW:Math.max(...tiles.map(t=>t.getBoundingClientRect().width)),
        right:Math.max(...tiles.map(t=>t.getBoundingClientRect().right)),stripRight:strip.getBoundingClientRect().right,
        overflow:document.documentElement.scrollWidth>innerWidth,
        selBg:cs(sel).backgroundColor,partBg:cs(part).backgroundColor,selEdge:cs(sel).borderTopColor,accRGB,
        solid:tiles.some(t=>cs(t).backgroundColor===accRGB),dot:!!sel.querySelector('.pf-dot')};
    },{theme,n});
    const ok=r.n===n&&r.maxW<=68.5&&r.right<=r.stripRight+0.5&&!r.overflow&&r.selBg===r.partBg&&r.selEdge===r.accRGB&&!r.solid&&r.dot;
    if(!ok)bad++;
    console.log(`${ok?'OK  ':'FAIL'} ${theme.padEnd(5)} ${width}px ${n} day${n>1?'s':' '} tile≤${Math.round(r.maxW)}px fits=${r.right<=r.stripRight+0.5&&!r.overflow} selected=chip:${r.selBg===r.partBg} edge=accent:${r.selEdge===r.accRGB} solid=${r.solid} dot=${r.dot}`);
    if(width===393&&(n===1||n===7)){await p.waitForTimeout(400);await p.screenshot({path:`../day-strip-${theme}-${n}.png`,clip:{x:0,y:0,width,height:520}});}
  }
  if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
  }finally{await b.close();}
  console.log(bad?`FAIL day strip (${bad})`:'PASS day strip');process.exit(bad?1:0);
})();
