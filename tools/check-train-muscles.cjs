/* check-train-muscles.cjs -- v4.6.187: muscles in Train. Body part is the first
   level (the tabs), muscle the second: each row of a body part with more than
   one muscle wears its muscle as a tag on its second line, and a filter row
   above Go-to narrows the same sections (Go-to / Sometimes / Never tried /
   Avoided) to one muscle.
   Covers: the chips (All first, on); a tag on every row; Lower keeps only
   lower-chest rows and drops empty sections, without moving the page; All
   brings everything back; a one-muscle body part has neither chips nor tags;
   leaving a body part drops its filter; a row still opens its exercise;
   nothing overflows. 320 and 402px, both themes.
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
      for(let k=0;k<8;k++)for(const base of ['2026-09-30','2026-09-25']){const t=new Date(base+'T12:00');t.setDate(t.getDate()-7*k);const d=t.toLocaleDateString('en-CA');
        add(d,'Chest','Incline Barbell Bench Press',175,[6,6,6,4]);add(d,'Chest','Incline Dumbbell Bench Press',65,[6,7,6]);add(d,'Chest','Cable Fly Up',35,[12,12,12]);}
      add('2026-09-05','Chest','Dip',45,[8,10,6]);add('2026-09-05','Chest','Barbell Bench Press',135,[7,6,5,8,8]);add('2026-08-22','Chest','Chest Press',39,[10,10]);add('2025-12-21','Chest','Cable Fly Down',11,[12,10,10,12]);add('2026-09-29','Biceps','Dumbbell Curl',30,[10,10,10]);
      DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still'}};todayISO='2026-10-01';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();setExPref('Decline Dumbbell Bench Press','avoid');SEED=deriveAll();applyTheme();
      view='lift';lift={part:'Chest',ex:null};render();await new Promise(r=>setTimeout(r,700));},theme);
    const st=()=>p.evaluate(()=>{const v=document.querySelector('#view'),all=s=>[...v.querySelectorAll(s)];
      return {chips:all('.mf-chip').map(c=>c.textContent+(c.classList.contains('on')?'*':'')).join(' '),
        rows:all('.logrow .logmain').map(r=>r.dataset.ex+'|'+(r.querySelector('.mtag')?.textContent||'')),
        heads:all('h2').map(h=>h.textContent.trim().toLowerCase()).filter(t=>/go-to|sometimes|never tried|avoided/.test(t)).join(','),
        y:Math.round(v.querySelector('.mf-row')?.getBoundingClientRect().top||0),wide:document.documentElement.scrollWidth>innerWidth,
        clip:all('.mf-chip,.mtag').some(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+.5||r.left<-.5;})};});
    const tap=async sel=>{await p.evaluate(sel=>document.querySelector(sel).click(),sel);await wait(350);};
    let s=await st();
    ok(`${tag} Chest: All · Upper · Mid · Lower, All on`,s.chips==='All* Upper Mid Lower',s.chips);
    ok(`${tag} every row wears its muscle`,s.rows.length>8&&s.rows.every(r=>/\|(Upper|Mid|Lower)$/.test(r))&&s.rows.includes('Incline Barbell Bench Press|Upper')&&s.rows.includes('Dip|Lower')&&s.rows.includes('Barbell Bench Press|Mid'),s.rows);
    ok(`${tag} the sections are the ones Train always had`,s.heads==='go-to,sometimes,never tried,avoided',s.heads);
    ok(`${tag} nothing overflows`,!s.wide&&!s.clip);
    await p.evaluate(()=>{const f=document.querySelector('.mf-row');scrollTo(0,f.getBoundingClientRect().top+scrollY-190);});await wait(200);
    if(shots)await p.screenshot({path:`../train-muscles-all-${theme}.png`});
    const y0=(await st()).y;
    await tap('.mf-chip[data-mf="lower-chest"]');s=await st();
    ok(`${tag} Lower: only lower-chest rows, empty sections gone`,s.chips==='All Upper Mid Lower*'&&s.rows.join(',')==='Dip|Lower,Cable Fly Down|Lower,Decline Barbell Bench Press|Lower,Decline Dumbbell Bench Press|Lower'&&s.heads==='sometimes,never tried,avoided',s);
    ok(`${tag} ...the page does not move`,Math.abs(s.y-y0)<=1,[y0,s.y]);
    if(shots)await p.screenshot({path:`../train-muscles-lower-${theme}.png`});
    await tap('.mf-chip[data-mf=""]');s=await st();
    ok(`${tag} All brings everything back`,s.chips==='All* Upper Mid Lower'&&s.rows.length>8&&s.heads==='go-to,sometimes,never tried,avoided',s.chips);
    await tap('.mf-chip[data-mf="chest"]');
    await tap('[data-part="Biceps"]:not([data-ex])');s=await st();
    ok(`${tag} Biceps (one muscle): no chips, no tags`,s.chips===''&&s.rows.length>0&&s.rows.every(r=>/\|$/.test(r)),s);
    await tap('[data-part="Chest"]:not([data-ex])');s=await st();
    ok(`${tag} back on Chest the filter is All again`,s.chips==='All* Upper Mid Lower',s.chips);
    await tap('.logmain[data-ex="Dip"]');
    ok(`${tag} a row still opens its exercise`,await p.evaluate(()=>lift.ex==='Dip'));
    ok(`${tag} no page errors`,!errors.length,errors);
    await p.close();
  }
  }finally{await b.close();}
  console.log(bad?`FAIL train muscles (${bad})`:'PASS train muscles');process.exit(bad?1:0);
})();
