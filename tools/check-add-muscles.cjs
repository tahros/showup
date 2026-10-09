/* check-add-muscles.cjs -- v4.6.186: the Add sheet's browse list is grouped by
   muscle. The maker, adding to a Saturday with Mid + Lower chest as its focus,
   saw one list of chest exercises, most recent first, with two "In this plan"
   rows on top and no Decline Barbell Bench Press at all (only logged exercises
   were listed).
   Covers: one group per muscle, the day's focus muscles first and tagged; in a
   group, done (most recent first), then not tried (enough to make three rows,
   the rest behind "N more"), then avoided, then ONE "In this plan" line; the
   "more" row opens in place; a not-tried row adds the exercise by feel; a done
   row adds it with its last sets; nothing overflows. 320 and 402px, both themes.
   Serve the repo on 127.0.0.1:8784 first. */
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
  const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+(typeof g==='string'?g:JSON.stringify(g))));if(!c)bad++;};
  try{
  for(const theme of ['dark','light'])for(const width of [320,402]){
    const tag=`${theme} ${width}:`,shots=width===402;
    const p=await b.newPage({viewport:{width,height:874},deviceScaleFactor:shots?2:1,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
    await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
    await p.evaluate(async theme=>{
      const LB=2.20462,days={},add=(d,part,ex,lb,reps)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:lb/LB,bw:lb===0,reps,at:Date.parse(d+'T18:00')+(days[d]?.w.length||0)});};
      add('2026-09-30','Chest','Incline Barbell Bench Press',175,[6,6,6,4]);add('2026-09-30','Chest','Incline Dumbbell Bench Press',65,[6,7,6]);add('2026-09-30','Chest','Cable Fly Up',35,[12,12,12]);
      add('2026-09-05','Chest','Dip',45,[8,10,6]);add('2026-09-05','Chest','Barbell Bench Press',135,[7,6,5,8,8]);add('2026-08-22','Chest','Chest Press',39,[10,10]);add('2026-08-05','Chest','Chest Fly',110,[10,10,10,10]);
      add('2026-07-07','Chest','Chest Squeeze',0,[10,10,10,10]);add('2026-06-22','Chest','Flat Smith Machine Bench Press',77,[6,6,6,6]);add('2025-12-21','Chest','Cable Fly Down',11,[12,10,10,12]);add('2026-09-29','Biceps','Dumbbell Curl',30,[10,10,10]);
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();setExPref('Decline Dumbbell Bench Press','avoid');SEED=deriveAll();applyTheme();
      view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-03';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead('Dip\n  BW +50 lb × 10 10 10 10\nBarbell Bench Press\n  135 lb × 7 6 5 5\nCable Fly Down\n  11 lb × 12 10 10\nRussian Twist\n  by feel × 15 15 15');x.parts=['Chest','Sixpack'];x.focus=['chest','lower-chest','obliques'];x.focusGen=x.focus.slice();x.locks=[];x.source='Your draft';s.active=d;s.step='edit';pfState().page='edit';pwRender();
      await new Promise(r=>setTimeout(r,500));},theme);
    const open=async()=>{await p.evaluate(()=>document.querySelector('[data-pw="add-open"]').click());await wait(400);};
    const st=()=>p.evaluate(()=>({groups:[...document.querySelectorAll('.pw-add-list .pw-add-group')].map(g=>({head:(g.querySelector('.pw-add-mh b')?.textContent||'')+(g.querySelector('.pw-add-mh span')?'*':''),
        rows:[...g.querySelectorAll('.pw-add-pick')].map(r=>r.querySelector('strong').textContent+(r.dataset.pw==='add-new'?'+':'')+(r.querySelector('.xp-tag')?'!':'')+(r.disabled?'(off)':'')),more:g.querySelector('.pw-add-morebtn')?.textContent||'',inPlan:g.querySelector('.pw-add-in')?.textContent||''})),
      wide:document.documentElement.scrollWidth>innerWidth,clip:[...document.querySelectorAll('.pw-add-list *')].some(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+.5||r.left<-.5);}),label:document.querySelector('.pw-add-body .pw-small')?.textContent}));
    await open();let s=await st();
    const band=await p.evaluate(()=>{const h=document.querySelector('.pw-add-mh'),b=h.querySelector('b'),tag=h.querySelector('span'),hs=getComputedStyle(h),bs=getComputedStyle(b);return {background:hs.backgroundColor,radius:hs.borderRadius,size:bs.fontSize,font:bs.fontFamily,ink:bs.color,tagInk:getComputedStyle(tag).color,rule:getComputedStyle(h.querySelector('i')).display,tagRight:tag.getBoundingClientRect().right,hRight:h.getBoundingClientRect().right};});
    ok(`${tag} section band uses readable Plex heading, tinted surface and right-aligned focus`,band.background!=='rgba(0, 0, 0, 0)'&&band.radius==='9px'&&band.size==='16px'&&band.font.includes('IBM Plex Sans')&&band.ink===band.tagInk&&band.rule==='none'&&Math.abs(band.hRight-band.tagRight-13)<1,band);
    ok(`${tag} one group per muscle, the focus muscles first and tagged`,s.groups.map(g=>g.head).join(' / ')==='mid chest* / lower chest* / upper chest',s.groups.map(g=>g.head));
    ok(`${tag} mid chest: done, most recent first; the untried behind one line; in-plan as one line`,s.groups[0].rows.join(',')==='Chest Press,Chest Fly,Chest Squeeze,Flat Smith Machine Bench Press'&&/^\d+ more you haven’t tried$/.test(s.groups[0].more)&&s.groups[0].inPlan==='In this plan · Barbell Bench Press',s.groups[0]);
    ok(`${tag} lower chest: the untried lift is offered, the avoided one last and tagged, in-plan on one line`,s.groups[1].rows.join(',')==='Decline Barbell Bench Press+,Decline Dumbbell Bench Press+!'&&s.groups[1].inPlan==='In this plan · Dip, Cable Fly Down',s.groups[1]);
    ok(`${tag} upper chest: its three lifts, no disabled rows anywhere`,s.groups[2].rows.join(',')==='Cable Fly Up,Incline Barbell Bench Press,Incline Dumbbell Bench Press'&&!s.groups.some(g=>g.rows.some(r=>/\(off\)/.test(r))),s.groups[2]);
    ok(`${tag} nothing overflows`,!s.wide&&!s.clip&&s.label==='Browse by body part',s);
    if(shots)await p.screenshot({path:`../add-muscles-${theme}.png`});
    const n0=s.groups[0].rows.length;
    await p.evaluate(()=>document.querySelector('.pw-add-morebtn').click());await wait(250);s=await st();
    ok(`${tag} "more" opens that group in place`,s.groups[0].rows.length>n0&&!s.groups[0].more&&s.groups[0].rows.includes('Dumbbell Bench Press+')&&!!(await p.$('.pw-add-sheet')),s.groups[0]);
    await p.evaluate(()=>document.querySelector('[data-pw="add-part"][data-part="Biceps"]').click());await wait(250);s=await st();
    ok(`${tag} a body part with one muscle has no headers`,s.groups.length===1&&s.groups[0].head===''&&s.groups[0].rows[0]==='Dumbbell Curl',s.groups);
    await p.evaluate(()=>document.querySelector('[data-pw="add-part"][data-part="Chest"]').click());await wait(250);
    await p.evaluate(()=>document.querySelector('.pw-add-pick[data-ex="Decline Barbell Bench Press"]').click());await wait(400);
    let rows=await p.evaluate(()=>pwText(pwDay(pw().active).rows));
    ok(`${tag} a not-tried row adds the exercise by feel and closes the sheet`,/Decline Barbell Bench Press\n\s+by feel × 10 10 10/i.test(rows)&&!(await p.$('.pw-add-sheet')),rows);
    await open();await p.evaluate(()=>document.querySelector('.pw-add-pick[data-ex="Chest Fly"]').click());await wait(400);
    rows=await p.evaluate(()=>pwText(pwDay(pw().active).rows));
    ok(`${tag} a done row adds it with your last sets`,/Chest Fly\n\s+110 lb × 10 10 10 10/.test(rows),rows);
    await open();s=await st();
    ok(`${tag} both now sit on their group's "In this plan" line`,/Chest Fly/.test(s.groups[0].inPlan)&&/Decline Barbell Bench Press/.test(s.groups[1].inPlan),s.groups.map(g=>g.inPlan));
    ok(`${tag} no page errors`,!errors.length,errors);
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL add muscles (${bad})`:'PASS add muscles');process.exit(bad?1:0);
})();
