/* test-calendar-done.js DIR — v4.6.122: the Dates calendar says what a day already is.
 * Rule: trained + saved plan -> calendar-with-check ("plan done"); trained, no
 * plan -> small square ("trained"); today counts once the session is closed.
 * Real: every script in index.html order and the real pfCalendar(). */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const T='2026-09-24';
async function boot(setup){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.localStorage.setItem('showup:planning-interface','workspace');
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=()=>Promise.reject(new Error('offline'));
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  await new Promise(r=>setTimeout(r,60));
  const run=c=>vm.runInContext(c,ctx);
  run(`todayISO='${T}';checkDate=()=>false;document.querySelector('#onb')?.remove();
    const at=(d,h)=>{const x=new Date(d+'T00:00');x.setHours(h);return +x;};
    const doc=ex=>planItemsFrom(pwRead(ex+'\\n135 lb × 8 8'));
    DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'off'},week:{days:{}}};
    ${setup}
    SEED=deriveAll();pwState=null;pwOwner=null;lift={};view='today';pwOpen(null,'dates');pfNavigate('dates');pw().dates=[];pwRender();`);
  const cell=d=>w.document.querySelector('.pf-calendar [data-date="'+d+'"]');
  const kind=d=>{const c=cell(d);return c.querySelector('.pf-done')?'done':c.querySelector('.pf-trained')?'trained':c.querySelector('.pf-status-icon')?'other':'none';};
  const key=()=>w.document.querySelector('.pf-calendar-key').textContent;
  return {w,run,cell,kind,key};
}
(async()=>{
  { const b=await boot(`
      DB.days['2026-09-15']={w:[{part:'Chest',ex:'Bench Press',w:185,reps:[5],at:at('2026-09-15',7)}],upd:1,doneAll:true};
      DB.days['2026-09-16']={w:[{part:'Legs',ex:'Squat',w:225,reps:[5],at:at('2026-09-16',7)}],upd:1,doneAll:true};
      DB.week.days['2026-09-16']=doc('Squat');
      DB.week.days['2026-09-17']=doc('Squat');                     // planned, never trained
      DB.days['${T}']={w:[{part:'Legs',ex:'Squat',w:225,reps:[5],at:at('${T}',7)}],upd:1,doneAll:true,closed:[at('${T}',8)]};
      DB.week.days['${T}']=doc('Squat');
      DB.week.days['2026-09-25']=doc('Squat');`);
    ok('past, trained, no plan: the square', b.kind('2026-09-15')==='trained', b.kind('2026-09-15'));
    ok('past, trained, with a plan: the calendar check', b.kind('2026-09-16')==='done', b.kind('2026-09-16'));
    ok('past, planned but not trained: nothing', b.kind('2026-09-17')==='none', b.kind('2026-09-17'));
    ok('today, plan completed: the calendar check', b.kind(T)==='done', b.kind(T));
    ok('...and it says so to VoiceOver', /plan done$/.test(b.cell(T).getAttribute('aria-label')), b.cell(T).getAttribute('aria-label'));
    ok('...and it stays selectable (a second session is normal)', !b.cell(T).disabled);
    ok('tomorrow, planned: still the saved-plan icon', b.kind('2026-09-25')==='other' && /plan saved/.test(b.cell('2026-09-25').getAttribute('aria-label')), b.kind('2026-09-25')+' / '+b.cell('2026-09-25').getAttribute('aria-label'));
    ok('the key names Done and Trained when they are on screen', /Done/.test(b.key()) && /Trained/.test(b.key()));
  }
  { const b=await boot(`
      DB.days['${T}']={w:[{part:'Legs',ex:'Squat',w:225,reps:[5],at:at('${T}',7)}],upd:1};
      DB.week.days['${T}']=doc('Squat');`);
    ok('today, session still live: not done yet, the saved-plan icon stays', b.kind(T)==='other' && /plan saved/.test(b.cell(T).getAttribute('aria-label')), b.kind(T));
    ok('with nothing done on screen, the key leaves Done and Trained out', !/Done/.test(b.key()) && !/Trained/.test(b.key()), b.key());
  }
  { const b=await boot(`
      DB.days['${T}']={w:[{part:'Legs',ex:'Squat',w:225,reps:[5],at:at('${T}',7)}],upd:1,doneAll:true,closed:[at('${T}',8)]};`);
    ok('today, closed, no plan: the square', b.kind(T)==='trained', b.kind(T));
  }
  { const b=await boot(`
      DB.days['${T}']={w:[{part:'Legs',ex:'Squat',w:225,reps:[5],at:at('${T}',7)}],upd:1,doneAll:true,closed:[at('${T}',8)]};
      DB.week.days['${T}']=doc('Squat');`);
    b.run(`pw().dates=['${T}'];pwDay('${T}').source='Your draft';pwDay('${T}').rows[0].lines[0].reps=[6,6];pwRender();`);
    ok('a draft on today outranks done: you are editing it', !b.cell(T).querySelector('.pf-done') && /draft/.test(b.cell(T).getAttribute('aria-label')), b.cell(T).getAttribute('aria-label'));
    ok('selected + done: the check turns white with the fill (css)', /\.selected \.pf-done\{color:#fff\}/.test(fs.readFileSync(path.join(dir,'css/planner-flow.css'),'utf8')));
  }
  console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
