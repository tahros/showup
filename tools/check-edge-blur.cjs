/* check-edge-blur.cjs -- v4.6.151: the edge blur above the header and below the tab bar.
   Opens the real app in Chromium, light and dark, at 320/393/430px, on a long
   Progress screen scrolled under both bars, and checks: each band covers its
   bar plus 22px, sits UNDER the header and the nav, takes no taps (a tap in the
   band lands on the page), carries its blur on the four absolute children only
   (1/3/7/14px, none on the fixed band), and is gone in Retro. Nothing is logged.
   Serve the repo on 127.0.0.1:8784 first (python3 -m http.server 8784). */
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
  for(const theme of ['light','dark'])for(const width of [320,393,430]){
    await p.setViewportSize({width,height:852});
    const r=await p.evaluate(theme=>{
      const days={},base=new Date('2026-09-28T12:00:00');
      for(let i=1;i<60;i++){const d=new Date(base-i*864e5),iso=d.toISOString().slice(0,10);
        days[iso]={w:[{part:'Chest',ex:'Barbell Bench Press',w:135,reps:[8,8,8],at:+d}],lastAt:+d,doneEx:[],donePart:[],upd:1,sugX:{},planOpen:{}};}
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',flow:'refined',theme,bar:theme,mascotMotion:'still'}};
      todayISO='2026-09-28';checkDate=()=>false;document.querySelector('#onb')?.remove();
      SEED=deriveAll();view='stats';applyTheme();render();scrollTo(0,400);
      const q=s=>document.querySelector(s),R=e=>e.getBoundingClientRect(),cs=e=>getComputedStyle(e);
      const top=q('.edgeblur.top'),bot=q('.edgeblur.bot'),h=q('header'),n=q('#nav');
      const blur=e=>cs(e).backdropFilter||cs(e).webkitBackdropFilter||'none';
      const kids=[...top.children].map(blur).join(' ');
      const hit=document.elementFromPoint(innerWidth/2,R(h).bottom+10);
      return {topCover:R(top).bottom-R(h).bottom, botCover:R(n).top-R(bot).top, topAt:R(top).top, botAt:innerHeight-R(bot).bottom,
        under:+cs(top).zIndex<+cs(h).zIndex && +cs(bot).zIndex<+cs(n).zIndex, fixed:cs(top).position==='fixed'&&cs(bot).position==='fixed',
        taps:!hit.closest('.edgeblur'), bandBlur:blur(top)+'|'+blur(bot), kids};
    },theme);
    const ok=r.topCover===22&&r.botCover===22&&r.topAt===0&&r.botAt===0&&r.under&&r.fixed&&r.taps&&
      r.bandBlur==='none|none'&&r.kids==='blur(1px) blur(3px) blur(7px) blur(14px)';
    if(!ok)bad++;
    console.log(`${ok?'OK  ':'FAIL'} ${theme.padEnd(5)} ${width}px ${JSON.stringify(r)}`);
    if(width===393)await p.screenshot({path:`../edge-blur-${theme}.png`});
  }
  const retro=await p.evaluate(()=>{document.documentElement.dataset.appearance='retro';return [...document.querySelectorAll('.edgeblur')].every(e=>getComputedStyle(e).display==='none');});
  if(!retro)bad++;console.log(`${retro?'OK  ':'FAIL'} retro hides the bands`);
  if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
  }finally{await b.close();}
  console.log(bad?`FAIL edge blur (${bad})`:'PASS edge blur');process.exit(bad?1:0);
})();
