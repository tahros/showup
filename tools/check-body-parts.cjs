/* check-body-parts.cjs -- v4.6.150: the Body parts row on the planner's Edit page.
   Opens the real app in Chromium, light and dark, at 320/393/430px, taps
   Shoulder off and Back + Biceps on, and checks: chips fit with no page-level
   horizontal scroll, the chosen chips read as pressed, Regenerate lights, the
   hint names the parts, and the day tab follows. Nothing is logged.
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
    await p.evaluate(theme=>{DB={days:{},settings:{onboarded:true,unit:'lb',theme,mascotMotion:'still'}};todayISO='2026-09-28';checkDate=()=>false;document.querySelector('#onb')?.remove();
      applyTheme();SEED=deriveAll();lift={};localStorage.removeItem('showup:planning-interface');
      pwOpen('2026-10-02');pw().dates=['2026-09-30','2026-10-02'];
      const txt={'2026-09-30':'Barbell Bench Press\n  135 lb × 8 8 8','2026-10-02':'Dumbbell Shoulder Press\n  35 lb × 8 8 8 8\nLateral Raise\n  15 lb × 15 15 15'};
      pw().dates.forEach(d=>{const x=pwDay(d);x.rows=pwRead(txt[d]);x.parts=pwParts(x.rows);});
      pw().active='2026-10-02';pfState().page='edit';pwRender();},theme);
    await p.waitForSelector('[data-pw="pf-part"]',{timeout:5000});
    const before=await p.evaluate(()=>({on:[...document.querySelectorAll('[data-pw="pf-part"][aria-pressed="true"]')].map(x=>x.dataset.part).join(),lit:!!document.querySelector('.pf-target-pending')}));
    for(const part of ['Shoulder','Back','Biceps'])await p.locator(`[data-pw="pf-part"][data-part="${part}"]`).click();
    const m=await p.evaluate(()=>{const chips=[...document.querySelectorAll('[data-pw="pf-part"]')],row=document.querySelector('.pf-parts').getBoundingClientRect();
      return {on:[...document.querySelectorAll('[data-pw="pf-part"][aria-pressed="true"]')].map(x=>x.dataset.part).join(),lit:!!document.querySelector('[data-pw="pf-regenerate"].pf-target-pending'),
        hint:document.querySelector('.pf-target-hint').textContent,tab:document.querySelector('.pf-chip.selected u')?.textContent,
        inside:chips.every(c=>{const r=c.getBoundingClientRect();return r.left>=row.left-0.5&&r.right<=row.right+0.5;}),minH:Math.min(...chips.map(c=>c.getBoundingClientRect().height)),
        overflow:document.documentElement.scrollWidth>innerWidth};});
    const ok=before.on==='Shoulder'&&!before.lit&&m.on==='Back,Biceps'&&m.lit&&/Back \+ Biceps · Regenerate/.test(m.hint)&&m.tab==='Back'&&m.inside&&m.minH>=32&&!m.overflow;
    if(!ok)bad++;
    console.log(`${ok?'OK  ':'FAIL'} ${theme.padEnd(5)} ${width}px on=${m.on} lit=${m.lit} tab=${m.tab} chipH=${Math.round(m.minH)} inside=${m.inside} overflow=${m.overflow}`);
  }
  const logged=await p.evaluate(()=>Object.values(DB.days).flatMap(d=>d.w||[]).length);
  if(logged){bad++;console.log('FAIL something was logged');}
  if(errors.length){bad++;console.log('FAIL page errors',errors);}
  }finally{await b.close();}
  console.log(bad?`${bad} FAILED`:'PASS body parts row');process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
