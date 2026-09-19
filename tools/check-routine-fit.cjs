/* check-routine-fit.cjs -- v4.6.73: the routine page's spine is measured, not
   assumed. jsdom cannot lay anything out, and the whole design is three
   verticals: weight right edge, x centre, first rep left edge -- shared by the
   plan lines, last time's lines and the chip rows in edit mode. Opens the real
   app in Chromium at four phone widths, seeds a plan with an opener and a top
   set plus a logged 9/14, and checks: one x centre on the page in read mode
   and again with an exercise open; no page-level horizontal scroll; no read
   line whose reps wrap; the gutter bin centred under the grip; the chip
   input inside the card, and (v4.6.74) one gutter vertical for the grips and
   bins whether a row is open or closed, with matching right edges.
   Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});
  const p=await b.newPage({serviceWorkers:'block'});
  const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8784/');
  let bad=0;
  const seed=()=>p.evaluate(()=>{DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'},plan:null,week:null,planTracking:null};todayISO='2026-09-19';checkDate=()=>false;document.querySelector('#onb')?.remove();
    const lb=x=>x*0.45359237;
    DB.days['2026-09-14']={w:[{part:'Shoulders',ex:'Dumbbell Shoulder Press',w:lb(55),reps:[8,8,8,8],at:1},{part:'Shoulders',ex:'Lateral Raise',w:lb(40),reps:[12,12,10,10],at:2},{part:'Shoulders',ex:'Rear Deltoids',w:lb(30),reps:[10,10,10,8],at:3}],doneAll:true,upd:1};
    const text="Dumbbell Shoulder Press\n  35 lb x 10 8\n  60 lb x 8 8 8 8\nLateral Raise\n  40 lb x 12 12 10 10\nRear Deltoids\n  35 lb x 10 10 10 10\nFace Pull\n  30 lb x 12 12";
    const {items}=planItemsFrom(parsePlan(text));planSave(items,'',text,todayISO);
    SEED=deriveAll();if(typeof pwState!=='undefined'&&pwState){pw().book={};delete pw().journey;}view='today';lift.part='Shoulders';lift.ex='Dumbbell Shoulder Press';pwOpen(todayISO);pfNavigate('edit');});
  const spine=()=>p.evaluate(()=>{
    const c=x=>{const r=x.getBoundingClientRect();return Math.round((r.left+r.right)/2);};
    const xs=[...new Set([...document.querySelectorAll('.pe-line .pe-x')].map(c))];
    const wr=[...new Set([...document.querySelectorAll('.pe-line .pe-w')].map(x=>Math.round(x.getBoundingClientRect().right)))];
    const r1=[...new Set([...document.querySelectorAll('.pe-line .pe-reps, .pe-line.pe-edit .pe-r > :first-child')].map(x=>Math.round(x.getBoundingClientRect().left)))];
    const wrapped=[...document.querySelectorAll('.pe-line:not(.pe-edit) .pe-reps')].filter(x=>x.getBoundingClientRect().height>28).length;
    const card=document.querySelector('.pf-routine-card').getBoundingClientRect();
    const out=[...document.querySelectorAll('.pe-chip,.pe-d,.pe-reps')].filter(x=>{const r=x.getBoundingClientRect();return r.right>card.right||r.left<card.left;}).length;
    /* v4.6.74: THE GUTTER IS ONE VERTICAL. The open exercise bleeds into the
       card's padding, and the first cut let that bleed drag its grip 12px left
       of the grips above and below it, with the bin lined up on the moved grip.
       Grips open and closed, and every bin, share one centre -- and the open
       panel's content right edge meets the closed rows'. */
    /* v4.6.76: the grip is centred on the NAME, not pinned by a hand-tuned
       top that drifts every time the row's padding changes. */
    const off=[...document.querySelectorAll('.pe-ex')].map(ex=>{const g=ex.querySelector('.pw-grip svg').getBoundingClientRect(),n=ex.querySelector('.pf-ex-summary strong').getBoundingClientRect();return Math.round(((g.top+g.bottom)/2-(n.top+n.bottom)/2)*10)/10;});
    const gripOff=Math.max(...off.map(Math.abs));
    const del=[...new Set([...document.querySelectorAll('.pe-del')].map(c))];
    const open=document.querySelector('.pe-open'),shut=document.querySelector('.pe-ex:not(.pe-open)');
    const R=x=>Math.round(x.getBoundingClientRect().right);
    return {xs,wr,r1,wrapped,out,del,
      grip:open?c(open.querySelector('.pw-grip svg')):null,
      shutGrip:shut?c(shut.querySelector('.pw-grip svg')):null,
      btnR:open?R(open.querySelector('.pe-toggle')):null,
      shutBtnR:shut?R(shut.querySelector('.pf-row-toggle')):null,
      gripOff,pageOverflow:document.documentElement.scrollWidth>innerWidth,input:!!document.getElementById('peInput')};
  });
  for(const width of [320,360,390,430]){
    await p.setViewportSize({width,height:852});
    await seed(); await p.waitForSelector('.pe-line',{timeout:5000});
    const r=await spine();
    let ok=r.xs.length===1&&r.wr.length===1&&r.r1.length===1&&!r.wrapped&&!r.out&&!r.pageOverflow&&r.gripOff<=1.5;
    if(!ok)bad++;
    console.log(`${ok?'OK  ':'FAIL'} ${width}px read  x=${r.xs} wRight=${r.wr} reps=${r.r1} wrapped=${r.wrapped} out=${r.out} overflow=${r.pageOverflow} gripOffCentre=${r.gripOff}`);
    await p.click('[data-pw="pf-row-toggle"][data-index="0"]');
    await p.click('[data-pw="pf-chip"][data-index="0"][data-line="1"][data-field="r"][data-rep="1"]');
    await p.waitForSelector('#peInput',{timeout:5000});
    const e=await spine();
    const gutter=e.del.length===1&&e.grip===e.shutGrip&&Math.abs(e.del[0]-e.grip)<=1&&e.btnR===e.shutBtnR;
    ok=e.xs.length===1&&e.wr.length===1&&e.r1.length===1&&!e.wrapped&&!e.out&&!e.pageOverflow&&e.input&&gutter&&e.gripOff<=1.5;
    if(!ok)bad++;
    console.log(`${ok?'OK  ':'FAIL'} ${width}px edit  x=${e.xs} wRight=${e.wr} reps=${e.r1} out=${e.out} overflow=${e.pageOverflow} gutter: bin=${e.del} grip=${e.grip} closedGrip=${e.shutGrip} rightEdge=${e.btnR}/${e.shutBtnR} input=${e.input}`);
    if(width===390){await p.screenshot({path:'../routine-edit-390.png',clip:{x:0,y:0,width:390,height:852}});}
  }
  console.log(bad||errors.length?`FAIL ${bad} layouts, errors: ${JSON.stringify(errors)}`:'PASS the routine page holds one spine at 320/360/390/430, read and edit');
  await b.close(); process.exit(bad||errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
