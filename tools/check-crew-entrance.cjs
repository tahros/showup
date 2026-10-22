/* check-crew-entrance.cjs -- v4.6.379: EVERY CREW TAKES THE INK CROSSING.
   Kettle (and every other crew) stood still when the day's card was tapped:
   the entrance looked for Pip on both ends. This taps the card with each crew
   as your companion and reads the live animations: the flood opens at the
   crew on the card, the crew flies to its place by the number, white for the
   blue, with its own crouch and landing squash, and is its colour again once
   the ink has drained into where it landed.
   Serve dist/ (or the repo) on 127.0.0.1:8978 first (PW_PORT to change it). */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8978';
const seed=crew=>`
  todayISO='2026-09-21';checkDate=()=>false;document.querySelector('#onb')?.remove();
  DB={days:{},settings:{onboarded:true,unit:'lb',name:'Sungjee',mascotMotion:'animated',theme:'dark',clubAvatar:'${crew}',companionName:'${crew}',companionFree:'${crew}'},week:{days:{}},plan:null};
  const lb=x=>x*0.45359237;
  DB.days[todayISO]={w:[{part:'Shoulder',ex:'Dumbbell Shoulder Press',w:lb(60),reps:[8,8,8],at:1}],doneAll:true,upd:Date.now()};
  DB.settings.dayDone=null;SEED=deriveAll();lift={};view='today';applyTheme&&applyTheme();render();`;
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});
  try{
    for(const crew of ['bell','plate','bag']){
      const p=await b.newPage({serviceWorkers:'block',viewport:{width:402,height:874}});
      const errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
      await p.goto('http://127.0.0.1:'+PORT+'/');
      await p.evaluate(seed(crew));
      await p.waitForTimeout(1200);
      const from=await p.evaluate(()=>{const m=document.querySelector('[data-replayday] .su-companion');if(!m)return null;const r=m.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.62,w:r.width,crew:m.dataset.companion};});
      assert(from&&from.w>0,crew+': fixture -- the card carries your crew');
      await p.evaluate(()=>document.querySelector('[data-replayday]').click());
      await p.waitForTimeout(200);
      const start=await p.evaluate(()=>{const o=document.getElementById('dayDone'),ink=o.querySelector('.ddink'),hero=o.querySelector('.dd-numrow>.dd-companion'),ir=ink.getBoundingClientRect();
        return {cls:o.className,x:ir.left+ir.width/2,y:ir.top+ir.height/2,white:hero.classList.contains('dd-white'),visible:getComputedStyle(hero).visibility,
          flying:hero.getAnimations().some(a=>a.effect.getKeyframes().some(k=>/px/.test(k.translate||''))),
          moved:Math.round(hero.getBoundingClientRect().top),rest:Math.round(o.querySelector('.ddn').getBoundingClientRect().top),
          whiteArt:(()=>{const w=hero.querySelector('.dd-white-art'),c=hero.querySelector('.crew-art:not(.dd-white-art)');return {src:w?.getAttribute('src')||'',shown:!!w&&getComputedStyle(w).visibility==='visible'&&w.naturalWidth>0,colourHidden:!!c&&getComputedStyle(c).visibility==='hidden',filter:getComputedStyle(hero).filter};})(),
          src:document.querySelector('[data-replayday] .su-companion').style.visibility,
          clip:ink.getAnimations().some(a=>a.effect.getKeyframes().some(k=>'clipPath' in k))};});
      assert(/dd-ink/.test(start.cls)&&/dd-comp/.test(start.cls),crew+': the entrance starts in ink, as a crew entrance');
      assert(Math.abs(start.x-from.x)<=2&&Math.abs(start.y-from.y)<=2,`${crew}: the flood opens at the crew on the card (${start.x},${start.y}) vs (${from.x},${from.y})`);
      assert(start.visible==='visible'&&start.white,crew+': the crew shows through the flood, white');
      assert(start.flying,crew+': the crew flies');
      assert(Math.abs(start.moved-from.y)<120,`${crew}: ...and is actually moved: it starts on the card (top ${start.moved}, card crew at ${Math.round(from.y)})`);
      assert(start.whiteArt.shown&&start.whiteArt.colourHidden&&start.whiteArt.src==='assets/crew/white/'+crew+'.webp'&&start.whiteArt.filter==='none',crew+': it crosses in its own shaded white render, not a flat silhouette: '+JSON.stringify(start.whiteArt));
      assert.equal(start.src,'hidden',crew+': the card crew steps aside for its double');
      assert(!start.clip,crew+': the ink only scales');
      await p.waitForFunction(()=>{const o=document.getElementById('dayDone'),ink=o?.querySelector('.ddink');if(!ink)return false;const a=ink.getAnimations();const w=o.querySelector('.dd-white-art');if(w&&getComputedStyle(w).visibility!=='hidden')return false;return !o.querySelector('.dd-white')&&a.length&&a.every(x=>x.playState==='finished')&&new DOMMatrix(getComputedStyle(ink).transform).a<.01;},{timeout:20000,polling:50});
      const done=await p.evaluate(()=>{const o=document.getElementById('dayDone'),hero=o.querySelector('.dd-numrow>.dd-companion'),r=hero.getBoundingClientRect(),ir=o.querySelector('.ddink').getBoundingClientRect();
        return {hx:r.left+r.width/2,hy:r.top+r.height*.62,ix:ir.left+ir.width/2,iy:ir.top+ir.height/2,n:o.querySelector('.ddn').textContent};});
      assert(Math.abs(done.ix-done.hx)<=2&&Math.abs(done.iy-done.hy)<=2,crew+': the ink drained into where the crew landed');
      assert.deepEqual(errors,[],crew+': no page errors');
      await p.locator('#dayDone [data-dd="done"]').click();await p.waitForTimeout(300);
      assert.equal(await p.evaluate(()=>document.querySelector('[data-replayday] .su-companion')?.style.visibility??''),'',crew+': the card has its crew back');
      await p.close();
    }
    console.log('PASS every crew opens the ink, flies white across it, and lands in colour');
  }finally{await b.close();}
})().catch(e=>{console.error('FAIL',e.message);process.exitCode=1;});
