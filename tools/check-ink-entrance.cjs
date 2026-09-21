/* check-ink-entrance.cjs -- v4.6.99: THE INK ENTRANCE, MEASURED.
   Tapping the day's card floods the screen with ShowUp Blue from where the
   mascot is standing, flies the mascot across on its own jump, and drains the
   blue into where it lands. jsdom has no element.animate and no layout, so
   none of this can be asserted there: this opens the real app, taps the card,
   and reads the geometry and the ordering out of the live animations.
   Serve the repo on 127.0.0.1:8784 first (PW_PORT to change it). */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8784';
const seed=`
  todayISO='2026-09-21';checkDate=()=>false;document.querySelector('#onb')?.remove();
  DB={days:{},settings:{onboarded:true,unit:'lb',name:'Sungjee',mascotMotion:'animated',theme:'light'},week:{days:{}},plan:null};
  const lb=x=>x*0.45359237;
  DB.days[todayISO]={w:[{part:'Shoulder',ex:'Dumbbell Shoulder Press',w:lb(60),reps:[8,8,8],at:1}],doneAll:true,upd:Date.now()};
  DB.settings.dayDone=null;SEED=deriveAll();lift={};view='today';render();`;
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});
  try{
    for(const reduced of [false,true]){
      const p=await b.newPage({serviceWorkers:'block',viewport:{width:402,height:874},
        reducedMotion:reduced?'reduce':'no-preference'});
      const errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
      await p.goto('http://127.0.0.1:'+PORT+'/');
      await p.evaluate(seed);
      await p.waitForTimeout(1400);
      const card=await p.locator('[data-replayday]').count();
      assert.equal(card,1,'fixture: the completed day card is on Today');
      const from=await p.evaluate(()=>{const m=document.querySelector('[data-replayday] .su-mascot');
        if(!m)return null;const r=m.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.62,w:r.width};});
      assert(from&&from.w>0,'fixture: the card carries a mascot to fly');
      /* the ORDER is what this asserts, and it is read from the mutation
         records themselves -- one entry per attribute change, delivered in
         order. Sampling the current state instead makes the test a race: this
         runs against software WebGL, where the compositor starves timers and
         frames, two changes land in one callback, and the middle of the
         entrance simply is not there when you look. */
      await p.evaluate(()=>{window.__ev=[];
        const push=v=>{if(window.__ev[window.__ev.length-1]!==v)window.__ev.push(v);};
        window.__obs=new MutationObserver(list=>{for(const r of list){
          const t=r.target;
          if(r.attributeName==='data-mascot-tone'&&t.closest&&t.closest('#dayDone'))push('tone:'+(t.dataset.mascotTone||''));
          if(r.attributeName==='class'&&t.id==='dayDone')push('ink:'+(t.classList.contains('dd-ink')?'on':'off'));
        }});
        window.__obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','data-mascot-tone']});});
      await p.evaluate(()=>document.querySelector('[data-replayday]').click());
      await p.waitForTimeout(140);

      if(reduced){
        /* v4.6.99: reduced motion never floods. It gets the summary, whole. */
        const still=await p.evaluate(()=>{const o=document.getElementById('dayDone');
          return {open:!!o,ink:!!o?.querySelector('.ddink'),cls:o?o.className:'',
            src:document.querySelector('[data-replayday] .su-mascot')?.style.visibility||''};});
        assert(still.open,'reduced: the summary still opens');
        assert(!still.ink,'reduced: no ink layer is built');
        assert(!/dd-ink|dd-copy/.test(still.cls),'reduced: no ink classes');
        assert.equal(still.src,'','reduced: the card keeps its mascot');
        assert.deepEqual(errors,[],'reduced: no page errors');
        await p.close();continue;
      }

      const start=await p.evaluate(()=>{const o=document.getElementById('dayDone'),ink=o.querySelector('.ddink');
        const hero=o.querySelector('.ddhero .su-mascot');
        const clip=getComputedStyle(ink).clipPath;
        return {cls:o.className,bg:getComputedStyle(o).backgroundColor,
          innerHidden:getComputedStyle(o.querySelector('.ddinner')).visibility==='hidden',
          heroVisible:getComputedStyle(hero).visibility==='visible',
          z:[getComputedStyle(ink).zIndex,getComputedStyle(o.querySelector('.ddhero')).zIndex],
          clip,tone:hero.dataset.mascotTone,
          srcHidden:document.querySelector('[data-replayday] .su-mascot').style.visibility,
          anims:hero.getAnimations().length};});
      assert(/dd-ink/.test(start.cls),'the entrance starts in ink');
      assert.equal(start.bg,'rgba(0, 0, 0, 0)','the overlay has no surface of its own while the ink is up');
      assert(start.innerHidden&&start.heroVisible,'only the mascot shows through the flood');
      assert.equal(start.z[0],'2');assert.equal(start.z[1],'3');
      assert.equal(start.srcHidden,'hidden','the card mascot steps aside for its double');
      assert(start.anims>=1,'the mascot is flying');
      /* the flood opens from where the mascot was standing, not from the middle */
      const at=start.clip.match(/at ([\d.]+)px ([\d.]+)px/);
      assert(at,'the flood is a circle at a point: '+start.clip);
      assert(Math.abs(+at[1]-from.x)<=2&&Math.abs(+at[2]-from.y)<=2,
        `the flood opens at the mascot (${at[1]},${at[2]}) vs (${from.x},${from.y})`);
      /* white from the first frame: the flood blooms out from under it on the
         tap, and blue inside blue is a mascot you cannot see */
      assert.equal(start.tone,'white','it crosses the flood white');

      /* let it play out, then read the whole ordering off the recording */
      await p.waitForFunction(()=>document.querySelector('#dayDone .ddhero .su-mascot')?.dataset.mascotTone==='blue',
        {timeout:30000,polling:100});
      await p.evaluate(()=>window.__obs.disconnect());
      const ev=await p.evaluate(()=>window.__ev);
      if(process.env.DBG)console.log('order',JSON.stringify(ev));
      const step=name=>ev.indexOf(name);
      /* one order, every run: the flood goes up, the mascot goes white for the
         crossing, the flood comes down, the colour comes back. Nothing in it
         is decided by which promise a starved frame happens to resolve first. */
      assert.deepEqual(ev,['ink:on','tone:white','ink:off','tone:blue'],
        'the entrance runs in one order: '+ev);
      const done=await p.evaluate(()=>{const o=document.getElementById('dayDone'),hero=o.querySelector('.ddhero .su-mascot');
        const r=hero.getBoundingClientRect(),clip=getComputedStyle(o.querySelector('.ddink')).clipPath;
        return {clip,heroCx:r.left+r.width/2,heroCy:r.top+r.height*.62,
          n:o.querySelector('.ddn').textContent,copy:getComputedStyle(o.querySelector('.dddate')).animationName};});
      const end=done.clip.match(/circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)/);
      assert(end&&+end[1]===0,'the ink has drained to nothing: '+done.clip);
      assert(Math.abs(+end[2]-done.heroCx)<=2&&Math.abs(+end[3]-done.heroCy)<=2,
        'it drained into where the mascot landed');
      assert.equal(done.copy,'ddcinema-copy','the copy arrives on the entrance stagger');
      assert.deepEqual(errors,[],'no page errors');

      /* closing it gives the card its mascot back */
      await p.locator('#dayDone [data-dd="done"]').click();
      await p.waitForTimeout(300);
      assert.equal(await p.evaluate(()=>document.querySelector('[data-replayday] .su-mascot')?.style.visibility??''),'',
        'the card has its mascot back');
      await p.close();
    }
    console.log('PASS the ink opens at the mascot, carries it white across the flood, drains into its landing and hands the colour back; reduced motion gets the summary whole');
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
