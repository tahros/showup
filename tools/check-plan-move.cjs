/* check-plan-move.cjs -- v4.6.101: MOVING A PLANNED WEEK, IN A REAL BROWSER.
   test-planmove.js holds the data rules; this holds what jsdom cannot see --
   that the sheet and the stepper are reachable, sized for a thumb, legible in
   both themes, and that the calendar actually draws where the days will land.
   Serve the repo on 127.0.0.1:8784 first (PW_PORT to change it). */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8784';
const seed=theme=>`
  todayISO='2026-09-22';checkDate=()=>false;document.querySelector('#onb')?.remove();
  DB={days:{},settings:{onboarded:true,unit:'lb',name:'S',mascotMotion:'off',theme:'${theme}'},week:{days:{}},plan:null};
  const P={'2026-09-22':'Bent-Over Row\\n  185 lb x 8 8 8 8','2026-09-23':'Barbell Bench Press\\n  185 lb x 8 8 8',
           '2026-09-24':'Squat\\n  225 lb x 5 5 5','2026-09-25':'Barbell Curl\\n  65 lb x 10 10'};
  const days={};for(const [d,t] of Object.entries(P))days[d]={...planItemsFrom(pwRead(t)),raw:t,title:''};
  DB.week={from:'2026-09-22',to:'2026-09-25',days,raw:'',at:1};
  for(let i=1;i<40;i++){const x=new Date('2026-09-22');x.setDate(x.getDate()-i);DB.days[x.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:45,reps:[8],at:1}],doneAll:true,upd:1};}
  SEED=deriveAll();pwOwner=null;pwState=null;localStorage.removeItem(pwKey());lift={};applyTheme();view='today';render();`;
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});
  try{
    for(const theme of ['light','dark'])for(const width of [320,402,430]){
      const p=await b.newPage({serviceWorkers:'block',viewport:{width,height:900},colorScheme:theme});
      const errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
      await p.goto('http://127.0.0.1:'+PORT+'/');
      await p.evaluate(seed(theme));await p.waitForTimeout(250);
      const tag=theme+'/'+width;

      /* DOOR 1: the line is only offered while today is still untouched */
      assert.equal(await p.locator('[data-pw="plan-push-ask"]').count(),1,tag+': the push line is offered');
      const line=await p.locator('[data-pw="plan-push-ask"]').evaluate(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
        return {h:r.height,right:Math.round(r.right),w:Math.round(el.closest('.pw-home').getBoundingClientRect().width),
          clipped:el.scrollWidth>el.clientWidth+1,colour:cs.color};});
      assert(line.h>=44,tag+': the line is a thumb tall ('+line.h+')');
      assert(!line.clipped,tag+': its words fit');

      await p.locator('[data-pw="plan-push-ask"]').click();await p.waitForTimeout(200);
      const sheet=await p.evaluate(()=>{const d=document.getElementById('planMoveDialog');if(!d)return null;
        const cs=getComputedStyle(d),rows=[...d.querySelectorAll('.pm-map li')];
        const bad=rows.filter(li=>li.scrollWidth>li.clientWidth+1);
        return {open:d.open,rows:rows.length,bad:bad.length,bg:cs.backgroundColor,fg:cs.color,
          heading:getComputedStyle(d.querySelector('h2')).textTransform,
          free:d.querySelector('.pm-free')?.textContent.trim(),
          below:d.getBoundingClientRect().bottom<=innerHeight+1};});
      assert(sheet&&sheet.open,tag+': the sheet opens');
      assert.equal(sheet.rows,4,tag+': four days are accounted for');
      assert.equal(sheet.bad,0,tag+': no row is clipped');
      assert.equal(sheet.heading,'none',tag+': the heading is a sentence, not a section label');
      assert.equal(sheet.free,'free',tag+': the day landing on nothing says so');
      assert.notEqual(sheet.bg,sheet.fg,tag+': the sheet is legible in '+theme);
      assert(sheet.below,tag+': the sheet sits inside the screen');

      await p.locator('#planMoveDialog [data-pw="plan-push-go"]').click();await p.waitForTimeout(350);
      assert.equal(await p.evaluate(()=>Object.keys(DB.week.days).sort().join(',')),
        '2026-09-23,2026-09-24,2026-09-25,2026-09-26',tag+': the week moved');
      assert.equal(await p.locator('#planMoveDialog').count(),0,tag+': the sheet closed behind it');
      assert(await p.evaluate(()=>document.getElementById('toast').classList.contains('undo')),tag+': the undo is offered');
      await p.evaluate(()=>document.getElementById('toast').click());await p.waitForTimeout(250);
      assert.equal(await p.evaluate(()=>Object.keys(DB.week.days).sort().join(',')),
        '2026-09-22,2026-09-23,2026-09-24,2026-09-25',tag+': undo put it back');

      /* DOOR 2: the stepper, and the landing cells it draws */
      await p.evaluate(()=>{pwOpen(null,'dates');const s=pw();s.dates=['2026-09-22','2026-09-23','2026-09-24','2026-09-25'];
        s.dates.forEach(d=>pwDay(d));s.month='2026-09-01';pfNavigate('dates');});
      await p.waitForTimeout(250);
      assert.equal(await p.locator('[data-pw="pf-move"]').count(),1,tag+': Move is offered beside Edit');
      await p.locator('[data-pw="pf-move"]').first().click();await p.waitForTimeout(250);
      const step=await p.evaluate(()=>{const out=document.querySelector('.pf-move output');
        const btns=[...document.querySelectorAll('.pf-move .pw-btn')].map(b=>b.getBoundingClientRect().height);
        return {delta:out.textContent.trim(),taps:btns,
          lands:[...document.querySelectorAll('.pf-calendar .pf-lands')].map(el=>el.dataset.date),
          legend:/Lands here/.test(document.querySelector('.pf-calendar-key').textContent)};});
      assert.equal(step.delta,'+1',tag+': it opens on one day later');
      assert(step.taps.every(h=>h>=44),tag+': the steppers are thumb-sized ('+step.taps+')');
      assert.deepEqual(step.lands,['2026-09-26'],tag+': the calendar draws the only new landing');
      assert(step.legend,tag+': and the key names it');

      await p.locator('.pf-move [data-pw="pf-move-step"][data-delta="1"]').click();await p.waitForTimeout(150);
      await p.locator('.pf-move [data-pw="pf-move-step"][data-delta="1"]').click();await p.waitForTimeout(200);
      assert.equal(await p.evaluate(()=>document.querySelector('.pf-move output').textContent.trim()),'+3',tag+': it steps');
      assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('.pf-calendar .pf-lands')].map(el=>el.dataset.date)),
        ['2026-09-26','2026-09-27','2026-09-28'],tag+': three new landings at +3');

      /* stepping down through zero skips it: nought days is not a move */
      for(let i=0;i<2;i++){await p.locator('.pf-move [data-pw="pf-move-step"][data-delta="-1"]').click();await p.waitForTimeout(120);}
      assert.equal(await p.evaluate(()=>document.querySelector('.pf-move output').textContent.trim()),'+1',tag+': it steps back down');
      await p.locator('.pf-move [data-pw="pf-move-step"][data-delta="-1"]').click();await p.waitForTimeout(150);
      assert.equal(await p.evaluate(()=>document.querySelector('.pf-move output').textContent.trim()),'-1',tag+': and steps past nought, never onto it');
      assert.equal(await p.evaluate(()=>!!document.querySelector('[data-pw="pf-move-go"]').disabled),true,
        tag+': and moving back into yesterday is refused');
      assert(/before today/i.test(await p.evaluate(()=>document.querySelector('.pf-move-note').textContent)),
        tag+': ...in words');

      await p.locator('[data-pw="pf-move-cancel"]').click();await p.waitForTimeout(200);
      assert.equal(await p.locator('.pf-move').count(),0,tag+': cancel puts the footer back');
      assert.equal(await p.evaluate(()=>Object.keys(DB.week.days).sort().join(',')),
        '2026-09-22,2026-09-23,2026-09-24,2026-09-25',tag+': and moved nothing');
      assert.deepEqual(errors,[],tag+': no page errors');
      await p.close();
    }

    /* a day with sets logged is not offered the push at all */
    const p=await b.newPage({serviceWorkers:'block',viewport:{width:402,height:900}});
    await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
    await p.goto('http://127.0.0.1:'+PORT+'/');
    await p.evaluate(seed('light'));
    await p.evaluate(()=>{DB.days[todayISO]={w:[{part:'Back',ex:'Bent-Over Row',w:84,reps:[8],at:1}],upd:1};SEED=deriveAll();render();});
    await p.waitForTimeout(250);
    assert.equal(await p.locator('[data-pw="plan-push-ask"]').count(),0,'a started day is not offered the push');
    await p.close();
    console.log('PASS the push line and its sheet, the move stepper and its landing cells, in light and dark at 320/402/430; undo restores; a started day is never offered the move');
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
