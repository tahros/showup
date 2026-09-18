/* check-edit-fit.cjs -- v4.6.66: the inline set editor must FIT the row.
   jsdom cannot measure layout, and the first cut of this editor missed the
   card edge by 18px at 320px while every unit test was green. This opens the
   real app in Chromium at four phone widths, for a bodyweight and a weighted
   lift, opens the weight and then the rep editor, and measures: no table
   overflow, the check button inside the card's content box, a readable gap
   between chip and input, no page-level horizontal scroll, no wrapped row.
   Runs like the other check-*.cjs: serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});
  const p=await b.newPage({serviceWorkers:'block'});
  const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');
  const cases=[{ex:'Hanging Leg Raise',part:'Sixpack',w:0,label:'BW'},{ex:'Bench Press',part:'Chest',w:88.45,label:'195 lb'}];
  let bad=0;
  for(const width of [320,375,390,430]){
    await p.setViewportSize({width,height:852});
    for(const c of cases){
      await p.evaluate(c=>{DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'}};todayISO='2026-09-18';checkDate=()=>false;document.querySelector('#onb')?.remove();
        DB.days[todayISO]={w:[1,2,3].map(i=>({part:c.part,ex:c.ex,w:c.w,reps:[15],at:Date.now()+i})),doneEx:[],donePart:[],upd:1};
        SEED=deriveAll();view='lift';lift.part=c.part;lift.ex=c.ex;lift.editToday=true;lift.editSet=null;render();},c);
      await p.waitForSelector('[data-lw-edit]',{timeout:5000});
      for(const field of ['w','r']){
        await p.evaluate(f=>{document.querySelector(`[data-lw-edit][data-lw-field="${f}"]`).click();},field);
        await p.waitForSelector('#lwInput',{timeout:5000});
        const m=await p.evaluate(()=>{
          const card=document.querySelector('.sc-session'),cs=getComputedStyle(card);
          const inner={l:card.getBoundingClientRect().left+parseFloat(cs.paddingLeft),r:card.getBoundingClientRect().right-parseFloat(cs.paddingRight)};
          const tbl=document.querySelector('.sc-editing'),inp=document.getElementById('lwInput'),sv=document.getElementById('lwSave'),chip=document.querySelector('tr.lw-editing .lw-pair');
          return {innerW:Math.round(inner.r-inner.l),tblOverflow:tbl.scrollWidth-tbl.clientWidth,tblRight:Math.round(tbl.getBoundingClientRect().right-inner.r),
            saveRight:Math.round(sv.getBoundingClientRect().right-inner.r),inputW:Math.round(inp.getBoundingClientRect().width),
            gap:Math.round(inp.getBoundingClientRect().left-chip.getBoundingClientRect().right),pageOverflow:document.documentElement.scrollWidth>innerWidth,
            wraps:Math.round(document.querySelector('tr.lw-editing').getBoundingClientRect().height)};
        });
        const ok=m.tblOverflow<=0&&m.tblRight<=0&&m.saveRight<=0&&!m.pageOverflow&&m.gap>=6&&m.wraps<70;
        if(!ok)bad++;
        console.log(`${ok?'OK  ':'FAIL'} ${width}px ${c.label.padEnd(7)} ${field}  inner=${m.innerW} input=${m.inputW} chip→input gap=${m.gap} save→edge=${m.saveRight} tblOverflow=${m.tblOverflow} rowH=${m.wraps}`);
      }
    }
  }
  await p.setViewportSize({width:390,height:852});
  await p.evaluate(()=>{lift.editSet=null;renderLift();document.querySelector('[data-lw-edit][data-lw-field="r"]').click();});
  await p.waitForTimeout(80);
  await p.screenshot({path:'../edit-fit-390.png',clip:{x:0,y:0,width:390,height:852}});
  console.log(bad||errors.length?`FAIL ${bad} layouts, errors: ${JSON.stringify(errors)}`:'PASS inline editor fits at 320/375/390/430, BW and weighted, weight and reps');
  await b.close(); process.exit(bad||errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
