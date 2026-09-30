/* check-share-safe-area.cjs -- v4.6.166: every share preview fits between the
   phone's safe areas. The maker's iPhone 17 Pro showed the consistency poster's
   Image / Video / GIF row under the Dynamic Island: the overlay centred content
   taller than the screen, so it spilled past both ends.
   Chromium has no notch, so the insets are simulated through the app's own
   --sat / --sab (which read env(safe-area-inset-*) on a phone). For each phone
   size, every card in the share carousel, the consistency poster export, the
   year-comparison export and the plates export must have: the top control
   below the top inset, Share / Close above the bottom inset, and no overflow.
   Nothing is logged. Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784;
const PHONES=[['iPhone 17 Pro',402,874,62,34],['iPhone 17 Pro Max',440,956,62,34],['iPhone SE',375,667,20,0],['short window',402,640,62,34]];
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(g!==undefined&&!c?' → '+g:''));if(!c)bad++;};
  try{
  for(const [phone,w,h,sat,sab] of PHONES)for(const theme of (phone==='iPhone 17 Pro'?['light','dark']:['light'])){
    const p=await b.newPage({viewport:{width:w,height:h},serviceWorkers:'block'});
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(600);
    await p.evaluate(({theme,sat,sab})=>{
      const days={},start=new Date('2021-12-01T12:00'),end=new Date('2026-09-30T12:00');let i=0;
      for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1),i++){
        if((i*7)%13>=7)continue;const iso=d.toLocaleDateString('en-CA'),part=['Chest','Back','Legs'][i%3];
        days[iso]={w:[{part,ex:{Chest:'Barbell Bench Press',Back:'Deadlift',Legs:'Squat'}[part],w:80,reps:[8,8,8],at:d.getTime()}]};
      }
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still',name:'Sungjee'}};
      todayISO='2026-09-30';checkDate=()=>false;document.querySelector('#onb')?.remove();SEED=deriveAll();applyTheme();
      document.documentElement.style.setProperty('--sat',sat+'px');document.documentElement.style.setProperty('--sab',sab+'px');
      view='stats';render();
    },{theme,sat,sab});
    await p.waitForTimeout(700);
    const measure=()=>p.evaluate(()=>{
      const ov=document.getElementById('repOv');if(!ov||getComputedStyle(ov).display==='none')return null;
      const vis=[...ov.children].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0);
      const R=e=>e.getBoundingClientRect(),cs=getComputedStyle(document.documentElement);
      const sat=parseFloat(cs.getPropertyValue('--sat')),sab=parseFloat(cs.getPropertyValue('--sab'));
      const top=Math.min(...vis.map(e=>R(e).top)),bottom=Math.max(...vis.map(e=>R(e).bottom));
      const btns=R(document.getElementById('repDo').parentElement),opts=ov.querySelector('.plate-export-options');
      return {top:Math.round(top),bottom:Math.round(bottom),sat,sab,h:innerHeight,btnBottom:Math.round(btns.bottom),optTop:opts?Math.round(R(opts).top):null,
        overflow:ov.scrollHeight>ov.clientHeight+1,pageOverflow:document.documentElement.scrollWidth>innerWidth,
        img:Math.round(Math.max(R(document.getElementById('repImg')).height,ov.querySelector('.plate-export-video:not([hidden])')?R(ov.querySelector('.plate-export-video')).height:0)),video:opts?getComputedStyle(ov.querySelector('.plate-export-video')).maxHeight===getComputedStyle(document.getElementById('repImg')).maxHeight:true};
    });
    const judge=async(name)=>{
      await p.waitForTimeout(250);const m=await measure();const tag=`${phone} ${w}×${h} ${theme}: ${name}`;
      if(!m){ok(tag+' opened',false,'no overlay');return;}
      ok(`${tag} clears the top inset, Share/Close clear the bottom, no overflow`,
         m.top>=m.sat&&m.bottom<=m.h-m.sab&&m.btnBottom<=m.h-m.sab&&!m.overflow&&!m.pageOverflow&&m.img>80&&m.video,JSON.stringify(m));
      await p.evaluate(()=>document.getElementById('repClose').click());await p.waitForTimeout(150);
    };
    const cards=await p.evaluate(()=>shareCards().map(c=>c.label));
    for(let i=0;i<cards.length;i++){
      await p.evaluate(async i=>{const c=shareCards()[i];await showCard(c.draw,c.label,true);},i);
      await judge('card "'+cards[i]+'"');
    }
    /* the video preview is what the maker had open (Video · MP4 selected). Chromium
       here makes no MP4, so the <video> is shown the way preview() shows it, sized
       by a poster of the card itself (a video takes its poster's size). */
    const asVideo=()=>p.evaluate(()=>{const ov=document.getElementById('repOv'),img=ov.querySelector('#repImg'),v=ov.querySelector('.plate-export-video');v.poster=img.src;img.hidden=true;v.hidden=false;});
    for(const [name,sel] of [['consistency poster (Image / Video / GIF)','.heat-share'],['year comparison export','.comparison-share']])for(const mode of ['image','video']){
      const has=await p.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return false;e.click();return true;},sel);
      if(!has){ok(`${phone} ${theme}: ${name} button exists`,false);continue;}
      for(let t=0;t<40&&!(await p.evaluate(()=>!!document.querySelector('#repOv .plate-export-options')));t++)await p.waitForTimeout(150);
      if(mode==='video'){await asVideo();await p.waitForTimeout(300);}
      await judge(name+' · '+mode);
    }
    await p.evaluate(()=>{const LB=2.20462;DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:225/LB,reps:[5,5,5,5,5],at:Date.now()},{part:'Back',ex:'Deadlift',w:315/LB,reps:[3,3,3],at:Date.now()+1}]};SEED=deriveAll();sharePlateCard();});
    for(let t=0;t<40&&!(await p.evaluate(()=>!!document.querySelector('#repOv .plate-export-options')));t++)await p.waitForTimeout(150);
    await judge('plates export');
    if(phone==='iPhone 17 Pro'){
      await p.evaluate(()=>document.querySelector('.heat-share').click());
      for(let t=0;t<40&&!(await p.evaluate(()=>!!document.querySelector('#repOv .plate-export-options')));t++)await p.waitForTimeout(150);
      await asVideo();await p.waitForTimeout(400);
      /* the shot: a phone frame with the insets painted, so the eye can check it too */
      await p.evaluate(({sat,sab})=>{for(const [t,hh] of [['top',sat],['bottom',sab]]){const d=document.createElement('div');d.className='_inset';d.style.cssText=`position:fixed;left:0;right:0;${t}:0;height:${hh}px;background:rgba(255,0,0,.35);z-index:999;pointer-events:none`;document.body.appendChild(d);}},{sat,sab});
      await p.screenshot({path:`../share-safe-area-${theme}.png`});
      await p.evaluate(()=>{document.querySelectorAll('._inset').forEach(e=>e.remove());document.getElementById('repClose').click();});
    }
    if(errors.length){bad++;console.log('FAIL page errors: '+errors.join(' | '));}
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL share safe area (${bad})`:'PASS share safe area');process.exit(bad?1:0);
})();
