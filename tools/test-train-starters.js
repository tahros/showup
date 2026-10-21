/* test-train-starters.js DIR -- v4.6.367: a first visit to Train is five
 * choices, not twenty-three. Untried exercises open with a starter set, the
 * rest fold behind "More <part>"; a first visit's starters are go-to rows;
 * untried rows name their equipment, not "never logged". */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
function app(days={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.fetch=async()=>{throw new Error('offline');};w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  const run=c=>vm.runInContext(c,ctx);
  run(`DB={days:${JSON.stringify(days)},settings:{onboarded:true,unit:'lb'}};todayISO='2026-10-20';checkDate=()=>false;save=()=>{};SEED=deriveAll();view='lift';lift.part='Chest';lift.moreOpen=null;render();`);
  return {w,run,q:s=>[...w.document.querySelectorAll(s)]};
}
{ const a=app();
  const names=a.q('#view .logrow [data-ex]').map(b=>b.dataset.ex);
  ok('new user: five starters, in order', names.join('|')==='Barbell Bench Press|Incline Dumbbell Bench Press|Chest Press|Cable Crossover|Push Up', names.join('|'));
  ok('new user: heading says Start here, not Never tried', a.q('#view h2').some(h=>h.textContent.trim()==='Start here') && !a.q('#view h2').some(h=>h.textContent.trim()==='Never tried'));
  ok('new user: starters are go-to rows', a.q('#view .fresh-group .logrow').every(r=>r.classList.contains('goto')));
  const more=a.w.document.querySelector('[data-fresh-more]');
  ok('new user: the rest fold behind More chest with a count', more && /More chest/.test(more.textContent) && /18/.test(more.textContent), more&&more.textContent);
  ok('untried rows name their equipment, not "never logged"', !/never logged/.test(a.w.document.getElementById('view').textContent) && /Barbell/.test(a.q('#view .logrow .sub')[0].textContent));
  more.click();
  const rows=a.q('#view .fresh-group .logrow');
  ok('More opens every untried exercise', rows.length===23, rows.length);
  ok('opened: only the starters are go-to size', rows.filter(r=>r.classList.contains('goto')).length===5);
  a.w.document.querySelector('[data-fresh-more]').click();
  ok('Show fewer folds again', a.q('#view .fresh-group .logrow').length===5);
  a.run(`lift.mf={part:'Chest',m:'upper-chest'};render();`);
  ok('a muscle filter shows its whole list, nothing folds', !a.w.document.querySelector('[data-fresh-more]'));
}
{ const days={}; for(let i=1;i<40;i+=3){ const d=new Date(Date.UTC(2026,9,20-i)).toISOString().slice(0,10); days[d]={w:[{part:'Chest',ex:i%2?'Barbell Bench Press':'Incline Dumbbell Bench Press',w:60,reps:[8,8,8],at:1}],doneAll:1,upd:1}; }
  const a=app(days);
  const fresh=a.q('#view .fresh-group .logrow [data-ex]').map(b=>b.dataset.ex);
  ok('regular: Never tried heading returns', a.q('#view h2').some(h=>h.textContent.trim()==='Never tried'));
  ok('regular: starters already logged leave the starter list', fresh.join('|')==='Chest Press|Cable Crossover|Push Up', fresh.join('|'));
  ok('regular: untried rows are regular size', a.q('#view .fresh-group .logrow').every(r=>!r.classList.contains('goto')));
}
{ const a=app(); a.run(`lift.part='Run';render();`);
  ok('cardio: short list, no fold, no equipment word', !a.w.document.querySelector('[data-fresh-more]') && !/Machine/.test(a.q('#view .fresh-group .sub').map(e=>e.textContent).join(' ')));
}
{ const a=app(); const miss=a.run(`Object.entries(TRAIN_STARTERS).flatMap(([p,l])=>l.filter(e=>!catFor(p).includes(e)).map(e=>p+':'+e))`);
  ok('every starter is a real catalog exercise', miss.length===0, miss.join(',')); }
console.log(fails?`\n${fails} FAILED`:'\nALL PASS'); process.exit(fails?1:0);
