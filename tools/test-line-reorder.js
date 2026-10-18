/* test-line-reorder.js DIR -- v4.6.355: reorder the lines of an exercise in the plan editor.
 * Each line being edited carries a grip at its right end (the delete stays left). A move
 * keeps every set and its reps, marks the day as your draft, and lines that meet at the
 * same load merge. Arrow keys on a grip move its line one place.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const tick=()=>new Promise(r=>setTimeout(r,0));const settle=async(n=60)=>{for(let i=0;i<n;i++)await tick();};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
(async()=>{
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  await settle();
  const run=c=>vm.runInContext(c,ctx);
  run(`DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'},plan:null,week:null,planTracking:null};todayISO='2026-10-18';checkDate=()=>false;save=()=>{};
   const text="Deadlift\\n  155 lb x 4\\n  235 lb x 3 4 4 4\\n  215 lb x 6\\n  155 lb x 5\\nBent-Over Row\\n  155 lb x 14 14";
   const {items}=planItemsFrom(parsePlan(text));planSave(items,'',text,todayISO);SEED=deriveAll();if(typeof pwState!=='undefined'&&pwState){pw().book={};delete pw().journey;}
   view='today';pwOpen(todayISO);pfNavigate('edit');`);
  await settle(20);
  run(`document.querySelector('[data-pw="pf-row-toggle"][data-index="0"]').click()`);await settle(20);
  const lines=()=>JSON.parse(run(`JSON.stringify(pfGroups(pwDay(pw().active).rows[0]).map(g=>pfLoadText(g.line)+' x '+g.line.reps.join(' ')))`));
  ok('setup: four lines', lines().length===4, lines());
  ok('every line being edited has a grip at its right end, after the reps', run(`[...document.querySelectorAll('.pe-open .pe-edit')].every(l=>l.lastElementChild.matches('.pe-grip[data-pe-grip]'))`));
  ok('the delete stays on the left', run(`[...document.querySelectorAll('.pe-open .pe-edit')].every(l=>l.firstElementChild.matches('.pe-del'))`));
  ok('lines not being edited carry no grip', !run(`!!document.querySelector('.pe-ex:not(.pe-open) [data-pe-grip]')`));
  const sets=()=>lines().flatMap(l=>l.split(' x ')[1].split(' ')).length;
  const n0=sets();
  run(`pfMoveLines(0,[2,0,1,3])`);run('pwRender()');await settle(10);
  ok('moving 215 lb to the top keeps every set', lines()[0].startsWith('215')&&sets()===n0, lines());
  ok('the day becomes your draft', run(`pwDay(pw().active).source`)==='Your draft');
  run(`pfMoveLines(0,[0,1,3,2])`);run('pwRender()');await settle(10);
  ok('two lines meeting at one load merge (155 lb x 4 5)', lines().some(l=>/^155 lb x 4 5$/.test(l))&&sets()===n0, lines());
  const before=lines();
  run(`(()=>{const g=document.querySelector('.pe-open [data-pe-grip="0"]');g.focus();g.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));})()`);await settle(10);
  ok('ArrowDown on a grip moves its line one place', lines()[1]===before[0]&&lines()[0]===before[1], lines());
  ok('an unchanged order changes nothing', run(`pfMoveLines(0,[0,1,2])`)===false);
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
