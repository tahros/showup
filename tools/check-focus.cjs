/* check-focus.cjs -- v4.6.183: a day's muscle focus, the muscle tags, and the
   auto set target, on Plan -> Edit. The maker planned a Saturday chest day,
   got three incline movements, and had no way to ask for lower chest or to
   know whether "15 sets" meant anything.
   Covers: one focus row per selected body part that has more than one muscle
   (Chest: Upper / Mid / Lower; Sixpack: Abs / Obliques; none for Biceps); a
   tag on every exercise of such a part; Auto = the sum of your usual sets per
   part, Yours after a step, Back to auto; a focus tap lights Regenerate; the
   writer is sent the focus and the target as their own fields; its answer is
   swapped onto the focus muscles, put focus-first and fitted to the target on
   the device (v4.6.184); an answer that ignores the focus is a violation. The writer is stubbed -- nothing
   leaves the page. Serve the repo on 127.0.0.1:8784 first. */
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
      /* eight weeks of Monday / Thursday chest days: 12 chest sets and 3 core */
      for(let k=0;k<8;k++)for(const base of ['2026-09-28','2026-09-24']){const t=new Date(base+'T12:00');t.setDate(t.getDate()-7*k);const d=t.toLocaleDateString('en-CA');
        add(d,'Chest','Incline Barbell Bench Press',95,[10]);add(d,'Chest','Incline Barbell Bench Press',115,[10]);add(d,'Chest','Incline Barbell Bench Press',175,[8,8,8,8]);
        add(d,'Chest','Incline Dumbbell Bench Press',65,[8,8,8]);add(d,'Chest','Cable Fly Up',30,[12,12,12]);add(d,'Sixpack','Hanging Leg Raise',0,[12,12,12]);}
      add('2026-09-10','Chest','Cable Fly Down',35,[12,12]);
      add('2026-09-29','Biceps','Dumbbell Curl',30,[10,10,10]);add('2026-09-29','Legs','Squat',225,[5,5,5]);
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();
      view='today';render();await new Promise(r=>setTimeout(r,300));const d='2026-10-03';pwOpen(d);const s=pw();s.dates=[d];const x=pwDay(d);
      x.rows=pwRead('Incline Barbell Bench Press\n  95 lb × 10\n  115 lb × 10\n  175 lb × 8 8 8 8\nIncline Dumbbell Bench Press\n  65 lb × 8 8 8\nCable Fly Up\n  30 lb × 12 12 12\nHanging Leg Raise\n  BW × 12 12 12');x.parts=['Chest','Sixpack'];x.locks=[];x.source='Saved plan';s.active=d;s.step='edit';pfState().page='edit';pwRender();
      await new Promise(r=>setTimeout(r,500));
      window.__calls=[];writeSession=async payload=>{window.__calls.push(JSON.parse(JSON.stringify(payload)));
        return {days:[{date:d,part:'Chest',title:'Chest + Sixpack',text:window.__answer}],reason:null};};
      window.__answer='Incline Barbell Bench Press\n  175 lb × 8 8 8\n\nDecline Barbell Bench Press\n  by feel × 10 10 10 10\n\nCable Fly Down\n  35 lb × 12 12 12\n\nDip\n  BW × 10 10\n\nHanging Leg Raise\n  BW × 12 12 12 12';
    },theme);
    const st=()=>p.evaluate(()=>{const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
      return {rows:all('.pf-focus-row').map(r=>r.querySelector('b').textContent+': '+[...r.querySelectorAll('.pf-focus-chip')].map(c=>c.textContent+(c.classList.contains('selected')?'*':'')).join(' ')),
        tags:all('.pw-exercise').map(a=>a.querySelector('strong').textContent+'|'+(a.querySelector('.pf-mtag')?.textContent||'')+(a.querySelector('.pf-mtag.on')?'*':'')),
        auto:q('.pf-auto-tag')?.textContent||'',line:q('.pf-auto-line')?.textContent||'',out:q('.pf-total output').textContent,hint:q('.pf-target-hint').textContent,
        beam:q('[data-pw="pf-regenerate"]').classList.contains('pf-beam'),wide:document.documentElement.scrollWidth>innerWidth,
        clip:all('.pf-focus-chip,.pf-mtag,.pf-auto-tag').some(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+0.5||r.left<-0.5;})};});
    const tap=async sel=>{await p.evaluate(sel=>document.querySelector(sel).click(),sel);await wait(250);};
    let s=await st();
    ok(`${tag} one focus row per body part with more than one muscle`,s.rows.join(' / ')==='Chest: Upper Mid Lower / Sixpack: Abs Obliques',s.rows);
    ok(`${tag} every exercise of such a part carries its muscle, none lit yet`,s.tags.join(',')==='Incline Barbell Bench Press|Upper,Incline Dumbbell Bench Press|Upper,Cable Fly Up|Upper,Hanging Leg Raise|Abs',s.tags);
    ok(`${tag} the set target is Auto: your usual per body part, added up`,s.auto==='Auto'&&s.out==='15'&&/Chest 12 \+ Sixpack 3/.test(s.line)&&!s.beam,s);
    ok(`${tag} nothing overflows`,!s.wide&&!s.clip,s);
    await tap('[data-pw="pf-plus"]');s=await st();
    ok(`${tag} a step makes the count yours, and offers the way back`,s.auto==='Yours'&&s.out==='16'&&/Your usual is 15/.test(s.line)&&/Back to auto/.test(s.line),s);
    if(shots)await p.screenshot({path:`../focus-yours-${theme}.png`});
    await tap('[data-pw="pf-auto"]');s=await st();
    ok(`${tag} Back to auto returns the day to 15`,s.auto==='Auto'&&s.out==='15'&&/^15 sets/.test(s.hint),s);
    const y0=await p.evaluate(()=>document.querySelector('.pf-routine-controls').getBoundingClientRect().top);
    await tap('[data-pw="pf-focus"][data-muscle="lower-chest"]');s=await st();
    const y1=await p.evaluate(()=>document.querySelector('.pf-routine-controls').getBoundingClientRect().top);
    ok(`${tag} tapping Lower selects it, names it in the hint and lights Regenerate`,s.rows[0]==='Chest: Upper Mid Lower*'&&/Chest · lower chest first \+ Sixpack/.test(s.hint)&&/Regenerate/.test(s.hint)&&s.beam,s);
    ok(`${tag} ...without moving the page`,Math.abs(y1-y0)<1,[y0,y1]);
    await tap('[data-pw="pf-regenerate"]');for(let t=0;t<40&&!(await p.evaluate(()=>!pw().busy&&pw().step==='edit'&&!!document.querySelector('.pf-total output')));t++)await wait(150);await wait(400);
    const sent=await p.evaluate(()=>{const c=window.__calls[0]||{};return {n:window.__calls.length,focus:c.workspace?.schedule?.find(x=>x.date==='2026-10-03')?.focus,target:c.workspace?.drafts?.[0]?.target_total_sets,usual:c.workspace?.usual_sets,note:c.note};});
    ok(`${tag} the writer is sent the focus and the target as fields of their own`,JSON.stringify(sent.focus)==='[{"part":"Chest","muscle":"lower-chest"}]'&&sent.target===15&&sent.usual.Chest===12&&sent.usual.Sixpack===3,sent);
    ok(`${tag} ...and the answer needed no repair`,sent.n===1,sent.n);
    s=await st();
    ok(`${tag} the day comes back all lower chest: the incline lift the writer kept is swapped out`,s.tags.join(',')==='Decline Barbell Bench Press|Lower*,Decline Dumbbell Bench Press|Lower*,Dip|Lower*,Cable Fly Down|Lower*,Hanging Leg Raise|Abs',s.tags);
    ok(`${tag} ...fitted to the 15 it was asked for, and counted`,s.out==='15'&&s.auto==='Auto'&&/^15 sets · 5 exercises · 12 of 12 Chest sets on lower chest$/.test(s.hint)&&!s.beam,s);
    ok(`${tag} ...with Lower still selected`,s.rows[0]==='Chest: Upper Mid Lower*',s.rows);
    ok(`${tag} nothing overflows after the rebuild`,!s.wide&&!s.clip,s);
    if(shots){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`../focus-built-${theme}.png`});}
    /* an answer that ignores the focus is sent back */
    const v=await p.evaluate(()=>{const payload=window.__calls[0],chk=writerCheck({days:[{date:'2026-10-03',part:'Chest',title:'Chest',text:'Incline Barbell Bench Press\n  175 lb × 8 8 8 8\n\nIncline Dumbbell Bench Press\n  65 lb × 8 8 8\n\nCable Fly Up\n  30 lb × 12 12 12\n\nCable Fly Down\n  35 lb × 12 12\n\nHanging Leg Raise\n  BW × 12 12 12'}],reason:null},{payload});
      const none=writerCheck({days:[{date:'2026-10-03',part:'Chest',title:'Chest',text:'Incline Barbell Bench Press\n  175 lb × 8 8 8 8\n\nIncline Dumbbell Bench Press\n  65 lb × 8 8 8\n\nCable Fly Up\n  30 lb × 12 12 12\n\nBarbell Bench Press\n  by feel × 8 8\n\nHanging Leg Raise\n  BW × 12 12 12'}],reason:null},{payload});
      return {few:chk.violations.flatMap(x=>x.why),none:none.violations.flatMap(x=>x.why)};});
    ok(`${tag} too little of the focus is a violation, with the count`,v.few.some(x=>/lower chest is this day's focus and holds 2 of 12 Chest sets/.test(x)),v.few);
    ok(`${tag} none of the focus is a violation`,v.none.some(x=>/lower chest is this day's focus and has no exercise/.test(x)),v.none);
    /* the Add sheet and the planner's own picks lead with the focus */
    const pick=await p.evaluate(()=>{const b=pwDay(pw().active);return {cands:pwAddCandidates({...b,rows:[]}).slice(0,2),search:pwAddSearch('fly',b).mine[0],fresh:pwAddSearch('press',{...b,rows:[]}).fresh[0]};});
    ok(`${tag} the app's own picks and the search lead with the focus muscle`,pick.cands[0]==='Cable Fly Down'&&pick.search==='Cable Fly Down'&&/^Decline/.test(pick.fresh),pick);
    /* a body part leaves: its focus leaves with it, and the count follows the parts */
    await tap('[data-pw="pf-part"][data-part="Chest"]');s=await st();
    ok(`${tag} deselecting Chest drops its row and its focus; the target follows the parts`,s.rows.join()==='Sixpack: Abs Obliques'&&/Sixpack 3/.test(s.line)&&!/Chest/.test(s.line)&&s.out==='3'&&s.beam&&(await p.evaluate(()=>pwDay(pw().active).focus.length===0)),s);
    await tap('[data-pw="pf-part"][data-part="Biceps"]');s=await st();
    ok(`${tag} a part with too little history has no usual, and says so`,s.auto===''&&/No usual yet for Biceps/.test(s.line)&&s.rows.join()==='Sixpack: Abs Obliques',s);
    await tap('[data-pw="pf-part"][data-part="Legs"]');s=await st();
    ok(`${tag} four Legs muscles wrap inside the box`,s.rows.some(r=>r==='Legs: Quads Hamstrings Glutes Calves')&&!s.wide&&!s.clip,s);
    ok(`${tag} no page errors`,!errors.length,errors);
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL focus (${bad})`:'PASS focus');process.exit(bad?1:0);
})();
