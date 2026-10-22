/* test-routine-rest.js DIR -- v4.6.387: setting up a routine later, and rest days in it.
 * No routine and nothing planned: Today offers "Set one up in a minute" and Plan
 * opens the routine setup straight on Basics; Back closes it and saves nothing;
 * a sync landing mid-setup leaves it open. A rest card in the order
 * (Push, Pull, Legs, Rest, Push, Pull, Legs) is saved as restAfter; the week
 * leaves that day open, Today calls it a rest day, a missed day already counts
 * as the rest, and the two Pulls are told apart by the turn each day took. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx),q=s=>w.document.querySelector(s),click=s=>q(s).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
run(`DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still',name:'S',lookAround:1,weekStart:'monday',objective:'strength'},plan:null,week:null,planTracking:null};
  todayISO='2026-10-22';checkDate=()=>false;save=()=>{};SEED=deriveAll();view='today';render();`);
ok('no routine, nothing planned: Today offers the routine setup under Choose exercise', !!q('[data-routine-setup]')&&!!q('#goLift'));
click('.today-focus-tools [data-pw="open"]:not(.pw-text)');
ok('Plan opens the routine setup on Basics, two steps, no fork', run(`onbLater&&onbStep==='basics'&&onbPos().join()`)==='1,2,false'&&!q('#onb').hidden, run(`[onbStep,onbPos()]`));
ok('a sync landing mid-setup leaves it open', run(`onbCloseDone()`)===false&&!q('#onb').hidden);
click('#onb [data-onbact="back"]');
ok('Back on Basics closes it, nothing saved, the nudge stays', q('#onb').hidden&&!run(`DB.settings.plannerPreferences`)&&!!q('[data-routine-setup]'));
click('[data-routine-setup]');
click('#onb [data-onbact="fcount"][data-v="6"]');click('#onb [data-onbact="frt"]');
ok('six days: Push, Pull, Legs twice, with + Add a rest day', run(`onbF.cards.map(c=>c.name).join()`)==='Push,Pull,Legs,Push,Pull,Legs'&&!!q('#onb [data-onbact="faddrest"]'));
click('#onb [data-onbact="faddrest"]');
ok('the rest day goes halfway: Push, Pull, Legs, Rest, Push, Pull, Legs; the week is full', run(`onbF.cards.map(c=>c.name).join()`)==='Push,Pull,Legs,Rest,Push,Pull,Legs'&&!q('#onb [data-onbact="faddrest"]')&&/6 days \+ 1 rest/.test(q('.ob-rt-plan').textContent));
ok('the day column is the handle', q('#onb [data-rtcard="3"] .ob-rt-side[data-rthandle="3"] .ob-rt-day')?.textContent==='Day 4');
click('#onb [data-onbact="fcustom"]');
ok('Customize: every part is in your week but Cardio, which is not yet', [...w.document.querySelectorAll('#onb .ob-rt-pool.fresh')].map(x=>x.dataset.v).join()==='Run'&&/×2/.test(q('#onb .ob-rt-pool.used[data-v="Chest"]').textContent));
ok('...chips carry grip dots', !!q('#onb .ob-rt-chip .ob-dots')&&!!q('#onb .ob-rt-pool .ob-dots'));
click('#onb [data-onbact="fsave"]');
ok('saved: six days a week, a rest after the first Legs, today planned; name and units untouched', run(`JSON.stringify(DB.settings.plannerPreferences.restAfter)`)==='{"2":1}'&&run(`DB.settings.plannerPreferences.frequency`)===6&&run(`DB.settings.unit`)==='lb'&&run(`!!pwSaved(todayISO)?.items?.length`)&&q('#onb').hidden&&!q('[data-routine-setup]'));
const walk=(n,skip=-1)=>run(`(()=>{const seq=[];for(let i=0;i<${n};i++){SEED=deriveAll();render();const p=pwSaved(todayISO);
  seq.push(rtKinds()[todayISO]==='rest'?'Rest':(DB.week?.days?.[todayISO]?.title||DB.plan?.title||'-'));
  if(i!==${skip}&&p?.items?.length){const it=p.items[0];DB.days[todayISO]={w:[{part:'Chest',ex:it.ex,w:40,reps:[5,5],at:1}]};}
  todayISO=rtAddDays(todayISO,1);}return seq.join();})()`);
ok('three weeks keep the 7-day rhythm', walk(21)==='Push,Pull,Legs,Rest,Push,Pull,Legs,'.repeat(3).slice(0,-1), run('0'));
ok('Today on a rest day says so', (run(`(()=>{while(rtKinds()[todayISO]!=='rest'){const p=pwSaved(todayISO);DB.days[todayISO]={w:[{part:'Chest',ex:p.items[0].ex,w:40,reps:[5],at:1}]};todayISO=rtAddDays(todayISO,1);SEED=deriveAll();render();}return document.querySelector('.today-focus-card h3').textContent;})()`))==='Rest day.');
run(`todayISO=rtAddDays(todayISO,1);`);
ok('a missed Pull waits, and a missed day never adds a rest', walk(9,1)==='Push,Pull,Pull,Legs,Push,Pull,Legs,Rest,Push');
console.log(fails?`\n${fails} FAILING`:'\nALL PASS');process.exit(fails?1:0);
