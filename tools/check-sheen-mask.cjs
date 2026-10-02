/* check-sheen-mask.cjs -- v4.6.191: the sheen lands on the blue cells only. The
   month calendar in History and the heat map in Stats each had one highlight
   sweeping the whole grid, so light also crossed grey days, weekday letters
   and the gaps. It is now seen through a mask of the trained cells.
   Method: the sweep is frozen mid-grid (animation paused, the band parked over
   a chosen spot) and the page is photographed with the sheen on and with it
   removed. A pixel that is not on a trained cell must be identical in both;
   pixels on trained cells under the band must differ. Checked on the calendar
   and on the heat map (scrolled, too), light and dark. Also: the mask follows
   a change of month, and reduced motion still shows no sheen at all.
   Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const {PNG}=require('playwright-core/lib/utilsBundle');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  /* no LCD text: under a composited layer text is smoothed in grey, without one in colour fringes -- a difference that is not the sheen */
  const b=await chromium.launch({...(CHROME?{executablePath:CHROME}:{}),args:['--disable-lcd-text']});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+(typeof g==='string'?g:JSON.stringify(g))));if(!c)bad++;};
  try{
  for(const theme of ['dark','light']){
    const p=await b.newPage({viewport:{width:402,height:874},deviceScaleFactor:1,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    await p.evaluate(async theme=>{
      const days={};for(let i=0;i<400;i++){const t=new Date('2026-09-30T12:00');t.setDate(t.getDate()-i);if((i*7)%13>=8)continue;const d=t.toLocaleDateString('en-CA');days[d]={w:[{part:'Chest',ex:'Barbell Bench Press',w:80,reps:[8,8,8],at:t.getTime()}]};}
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();
      /* the band, parked: no animation, a wide bright bar over the whole box */
      const st=document.createElement('style');st.id='parkSheen';st.textContent='.cal::after,.heatframe::after{animation:none!important;background:rgba(255,255,255,.6)!important;background-size:auto!important}';document.head.appendChild(st);
      const off=document.createElement('style');off.id='noSheen';off.media='not all';off.textContent='.cal::after,.heatframe::after{display:none!important}';document.head.appendChild(off);
    },theme);
    const shot=async(sel,off)=>{await p.evaluate(off=>{document.getElementById('noSheen').media=off?'all':'not all';},off);await wait(120);
      const box=await p.evaluate(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:Math.floor(r.left),y:Math.floor(r.top),width:Math.ceil(r.width),height:Math.ceil(r.height)};},sel);
      return {box,png:PNG.sync.read(await p.screenshot({clip:box}))};};
    const px=(img,x,y)=>{const i=(Math.round(y)*img.png.width+Math.round(x))*4;return [img.png.data[i],img.png.data[i+1],img.png.data[i+2]].join(',');};
    /* points to sample, in box coordinates: centres of on / off cells, and gaps */
    const points=(sel,onSel,cellSel,extraSel)=>p.evaluate(({sel,onSel,cellSel,extraSel})=>{const B=document.querySelector(sel),R=B.getBoundingClientRect(),SC=B.querySelector('.heatwrap'),V=SC?SC.getBoundingClientRect():R;
      /* visible means inside the scroller's window, where there is one */
      const visIn=(r,W)=>r.width>0&&r.left>=W.left-.5&&r.right<=W.right+.5&&r.top>=W.top-.5&&r.bottom<=W.bottom+.5,vis=r=>visIn(r,V);
      /* a quarter in from the top-left: the centre of a calendar day is its white numeral */
      const c=e=>{const r=e.getBoundingClientRect();return vis(r)?{x:r.left-R.left+r.width*.22,y:r.top-R.top+r.height*.22,r:{l:r.left-R.left,t:r.top-R.top,rt:r.right-R.left,b:r.bottom-R.top}}:null;};
      const on=[...B.querySelectorAll(onSel)].map(c).filter(Boolean),offc=[...B.querySelectorAll(cellSel)].filter(e=>!e.matches(onSel)).map(c).filter(Boolean),extra=extraSel?[...B.querySelectorAll(extraSel)].map(e=>{const r=e.getBoundingClientRect();return visIn(r,R)?{x:r.left-R.left+r.width/2,y:r.top-R.top+r.height/2}:null;}).filter(Boolean):[];
      /* a gap: the midpoint between two horizontally adjacent on-cells' facing edges */
      const gaps=[];for(let i=0;i+1<on.length;i++){const a=on[i].r,b2=on[i+1].r;if(Math.abs(a.t-b2.t)<1&&b2.l-a.rt>=1&&b2.l-a.rt<8)gaps.push({x:(a.rt+b2.l)/2,y:(a.t+a.b)/2});
        else if(Math.abs(a.l-b2.l)<1&&b2.t-a.b>=1&&b2.t-a.b<8)gaps.push({x:(a.l+a.rt)/2,y:(a.b+b2.t)/2});}
      return {on,off:offc,extra,gaps,mask:getComputedStyle(B).getPropertyValue('--sheen-mask').slice(0,40)};},{sel,onSel,cellSel,extraSel});
    const judge=async(name,sel,onSel,cellSel,extraSel)=>{
      /* wait for the page to hold still (entrances, the heat map's replay): two identical frames with the sheen off */
      for(let k=0,prev='';k<25;k++){const z=await shot(sel,true),cur=z.png.data.toString('base64');if(cur===prev)break;prev=cur;await wait(250);}
      const pts=await points(sel,onSel,cellSel,extraSel),A=await shot(sel,false),Z=await shot(sel,true);
      /* "the same" allows for antialiasing: text under a composited layer is smoothed
         differently, a few levels per channel. The parked band moves a lit pixel by far more. */
      const diff=q=>{const a=px(A,q.x,q.y).split(',').map(Number),z=px(Z,q.x,q.y).split(',').map(Number);return Math.max(...a.map((v,i)=>Math.abs(v-z[i])));};
      const same=l=>l.filter(q=>diff(q)<=14).length;
      ok(`${theme} ${name}: a mask of the trained cells is set`,/^url\("data:image\/svg\+xml/.test(pts.mask.trim()),pts.mask);
      ok(`${theme} ${name}: trained cells are lit (${pts.on.length})`,pts.on.length>3&&pts.on.every(q=>diff(q)>30),{lit:pts.on.length-same(pts.on),of:pts.on.length});
      ok(`${theme} ${name}: untrained cells are not (${pts.off.length})`,pts.off.length>2&&same(pts.off)===pts.off.length,{dark:same(pts.off),of:pts.off.length});
      ok(`${theme} ${name}: the gaps between cells are not (${pts.gaps.length})`,pts.gaps.length>2&&same(pts.gaps)===pts.gaps.length,{dark:same(pts.gaps),of:pts.gaps.length});
      if(extraSel)ok(`${theme} ${name}: nor the letters beside it (${pts.extra.length})`,pts.extra.length>2&&same(pts.extra)===pts.extra.length,{dark:same(pts.extra),of:pts.extra.length});
      return {A,pts};};
    /* 1. History's month calendar */
    await p.evaluate(async()=>{view='history';hist.y=2026;hist.m=9;render();await new Promise(r=>setTimeout(r,700));document.querySelector('.cal').scrollIntoView({block:'center'});});await wait(300);
    const j=await judge('calendar','.cal','.cd.on','.cd','.cw');
    if(theme==='dark')fs.writeFileSync('../sheen-mask-calendar.png',PNG.sync.write(j.A.png));
    const m1=await p.evaluate(()=>getComputedStyle(document.querySelector('.cal')).getPropertyValue('--sheen-mask'));
    await p.evaluate(async()=>{hist.m=8;render();await new Promise(r=>setTimeout(r,600));document.querySelector('.cal').scrollIntoView({block:'center'});});await wait(300);
    const m2=await p.evaluate(()=>getComputedStyle(document.querySelector('.cal')).getPropertyValue('--sheen-mask'));
    ok(`${theme} calendar: another month gets its own mask`,m1!==m2&&/svg/.test(m2));
    const j2=await judge('calendar (Aug)','.cal','.cd.on','.cd','.cw');if(theme==='dark')fs.writeFileSync('../sheen-mask-aug.png',PNG.sync.write(j2.A.png));
    /* 2. the heat map in Stats, at the newest end and scrolled back */
    await p.evaluate(async()=>{view='stats';render();await new Promise(r=>setTimeout(r,1200));document.querySelector('.heatframe').scrollIntoView({block:'center'});});await wait(500);
    const h=await judge('heat map','.heatframe','.hc.on','.hc','.wdrail span');
    if(theme==='dark')fs.writeFileSync('../sheen-mask-heat.png',PNG.sync.write(h.A.png));
    await p.evaluate(()=>{const w=document.querySelector('.heatwrap');w.scrollLeft=Math.max(0,w.scrollLeft-137);});await wait(300);
    await judge('heat map, scrolled','.heatframe','.hc.on','.hc','.wdrail span');
    ok(`${theme}: no page errors`,!errors.length,errors);
    await p.close();
  }
  /* reduced motion: the sheen was already off there, and stays off */
  const p=await b.newPage({viewport:{width:402,height:874},reducedMotion:'reduce',serviceWorkers:'block'});
  await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${PORT}/?theme=dark`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
  const rm=await p.evaluate(async()=>{DB={days:{'2026-09-28':{w:[{part:'Chest',ex:'Dip',w:0,reps:[8],at:1}]}},settings:{onboarded:true,unit:'lb'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();SEED=deriveAll();view='history';hist.y=2026;hist.m=9;render();await new Promise(r=>setTimeout(r,600));
    const s=getComputedStyle(document.querySelector('.cal'),'::after');return s.animationName+'|'+s.backgroundImage;});
  ok('reduced motion: still no sheen',/^none\|none$/.test(rm),rm);
  await p.close();
  }finally{await b.close();}
  console.log(bad?`FAIL sheen mask (${bad})`:'PASS sheen mask');process.exit(bad?1:0);
})();
