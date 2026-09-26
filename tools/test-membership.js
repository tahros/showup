/* test-membership.js DIR — v4.6.144: the 20-logged-day trial, the paywall and the gates.
 * Real: every script in index.html order; the Train, History and writer paths
 * that add a set or call the writer. Faked: fetch, and PAYWALL_ON (the file's
 * own constant is rewritten to true for the "live" boots).
 * Spec acceptance 1-6 and 12 (claude/paywall-and-metrics-spec.md), plus: with
 * the flag off nothing changes for anyone; founding members are marked only
 * while the flag is off; paywall_seen is counted once a day; membership holds
 * offline through a 7-day grace. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const settle=async(n=30)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0));};
const TODAY='2026-10-20';
const iso=n=>{const d=new Date(TODAY+'T12:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
const S=(ex='Squat')=>({part:'Legs',ex,w:100,reps:[5],at:Date.now()-864e5});
function record(n){ const days={}; for(let i=1;i<=n;i++) days[iso(i*2)]={w:[S()]}; return days; }
async function boot({live=false,preview=false,days={},settings={},store={}}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),dl=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days,settings:{onboarded:true,unit:'lb',...settings}}));
  if(preview) w.localStorage.setItem('showup:paywall-preview','1');
  for(const [k,v] of Object.entries(store)) w.localStorage.setItem(k,v);
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  for(const s of order){
    let src=srcs[s];
    if(live&&s==='js/membership.js') src=src.replace('const PAYWALL_ON=false;','const PAYWALL_ON=true;');
    vm.runInContext(src,ctx,{filename:s});
  }
  await settle(60);
  const run=c=>vm.runInContext(c,ctx);
  run(`todayISO='${TODAY}';checkDate=()=>false;SEED=deriveAll();`);
  const d=w.document;
  const click=sel=>{const el=typeof sel==='string'?d.querySelector(sel):sel;el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
  return {w,d,run,click,wall:()=>!!d.getElementById('paywall'),today:()=>JSON.parse(run(`JSON.stringify((DB.days[todayISO]||{w:[]}).w.length)`)),
    q:()=>JSON.parse(w.localStorage.getItem('showup:events')||'[]')};
}
/* log one set the way Train does: open the exercise, press Add set */
async function trainLog(b){
  b.run(`view='lift';lift.part='Legs';lift.ex='Squat';render();`);await settle();
  const add=b.d.getElementById('addrep'); if(!add) return 'no-button';
  b.click(add); await settle(); return 'clicked';
}
(async()=>{
 /* flag off: nothing changes */
 { const b=await boot({days:record(40)});
   ok('flag off: 40 logged days, Train still logs a new day', await trainLog(b)==='clicked' && b.today()===1 && !b.wall());
   b.run(`view='sync';render();`);
   ok('flag off: Settings shows no trial row', !b.d.getElementById('mbRow'));
   ok('flag off: the writer is not gated', b.run('writerGate()')===true);
 }
 /* founding members (D7) */
 { const b=await boot({days:record(3)});
   ok('flag off: a record with logged days is marked a founding member (synced setting)', b.run('foundingMark()')===true && b.run('DB.settings.founding')===TODAY);
   ok('marked once', b.run('foundingMark()')===false);
 }
 { const b=await boot({days:{}});
   ok('flag off: an empty record is not marked (nothing to comp yet)', b.run('foundingMark()')===false && !b.run('DB.settings.founding'));
 }
 { const b=await boot({live:true,days:record(3)});
   ok('flag on: nobody new is marked', b.run('foundingMark()')===false && !b.run('DB.settings.founding'));
 }
 { const b=await boot({live:true,days:record(40),settings:{founding:'2026-09-26'}});
   ok('6. a founding member never sees the paywall, at any day count', await trainLog(b)==='clicked' && b.today()===1 && !b.wall());
   b.run(`view='sync';render();`);
   ok('12. Settings: "Founding member", no trial count', /Founding member/.test(b.d.getElementById('mbRow')?.textContent||''));
 }
 /* the trial (D1, D4) */
 { const b=await boot({live:true,days:record(19)});
   b.run(`view='sync';render();`);
   ok('12. during the trial, Settings says "Free logged days: 19 of 20" and nothing else counts down', /Free logged days: 19 of 20/.test(b.d.getElementById('mbRow')?.textContent||''));
   ok('1. 19 logged days: the 20th day logs', await trainLog(b)==='clicked' && b.today()===1 && !b.wall());
   ok('1. that made 20', b.run('loggedDays()')===20);
   ok('2. more sets on the 20th day (already started): allowed', await trainLog(b)==='clicked' && b.today()===2 && !b.wall());
 }
 { const b=await boot({live:true,days:record(20)});
   ok('1. 20 logged days: the first set on a 21st date opens the paywall', await trainLog(b)==='clicked' && b.wall());
   ok('1. ...and writes nothing', b.today()===0 && b.run('loggedDays()')===20);
   ok('paywall_seen counted', b.q().filter(e=>e.name==='paywall_seen').length===1);
   b.click('[data-mb-later]');
   ok('"Not now" returns to the record', !b.wall());
   await trainLog(b);
   ok('paywall_seen: once a day, however often it shows', b.q().filter(e=>e.name==='paywall_seen').length===1 && b.wall());
   const t=b.d.getElementById('paywall').textContent;
   ok('the paywall shows your own days and says what stays free', b.d.querySelectorAll('#paywall .mb-grid i').length===20 && /history, editing and export are free, always/.test(t), t.slice(0,160));
   ok('yearly first, then monthly, yearly chosen', /Yearly[\s\S]*\$29\.99[\s\S]*Monthly[\s\S]*\$4\.99/.test(t) && b.d.querySelector('[data-mb-plan="yearly"]').getAttribute('aria-pressed')==='true');
   ok('Apple\'s subscription terms and both links are on it', /renews automatically/.test(t) && !!b.d.querySelector('#paywall a[href*="stdeula"]') && !!b.d.querySelector('#paywall a[href="privacy.html"]'));
   ok('no countdown, no urgency words', !/left!|hurry|only \d+ days|expires in/i.test(t));
   b.run(`dlFile=(n,m,t)=>{window.__dl=n;}`);b.click('[data-mb-export]');
   ok('4. Export my data works from the paywall, no membership needed', /^showup-backup-/.test(b.run('window.__dl||""')));
   b.click('[data-mb-later]');
   b.run(`view='sync';render();`);
   ok('12. after the trial, Settings: 20 of 20 and a way to the options', /20 of 20/.test(b.d.getElementById('mbRow')?.textContent||'') && !!b.d.querySelector('[data-mb-open]'));
   b.click('[data-mb-open]');
   ok('...which opens the same screen', b.wall());
   b.click('[data-mb-later]');
   ok('4. Settings export still works with the trial over', (b.run(`window.__dl=null;document.body.insertAdjacentHTML('beforeend','<button id="expJson"></button>');`),b.click('#expJson'),/showup-backup/.test(b.run('window.__dl||""'))));
 }
 { const b=await boot({live:true,days:record(20)});
   const yday=iso(1); b.run(`DB.days['${yday}']=DB.days['${yday}']||{w:[]};`);
   b.run(`view='history';hist.bf='${iso(3)}';hist.bfPart='Legs';render();`);await settle();
   b.d.body.insertAdjacentHTML('beforeend','<input id="bfEx" value="Squat"><input id="bfW" value="100"><input id="bfR" value="5"><button id="bfAdd"></button>');
   b.click('#bfAdd');
   ok('3. backfilling an empty past date after the trial: paywall, nothing written', b.wall() && !(b.run(`JSON.stringify(DB.days['${iso(3)}']||null)`)!=='null' && b.run(`(DB.days['${iso(3)}'].w||[]).length`)>0));
 }
 { const b=await boot({live:true,days:record(20)});
   const d0=iso(2);   // a logged day
   b.run(`view='history';hist.bf='${d0}';hist.bfPart='Legs';render();`);await settle();
   const put=(id,v,tag='input')=>{let e=b.d.getElementById(id);if(!e){e=b.d.createElement(tag);e.id=id;b.d.body.appendChild(e);}if(tag==='input')e.value=v;};
   put('bfEx','Squat');put('bfW','100');put('bfR','5');put('bfAdd','','button');
   b.click('#bfAdd');
   ok('2. adding to a day that already has sets, from History, after the trial: allowed', !b.wall() && b.run(`DB.days['${d0}'].w.length`)===2);
 }
 /* the writer (D4, 5) */
 { const b=await boot({live:true,days:record(20)});
   let err='';try{ await b.run(`writeSession({scope:'day'})`); }catch(e){ err=e.message; }
   ok('5. the plan writer after the trial: paywall, and no call made', b.wall() && /part of membership/.test(err), err);
   b.click('[data-mb-later]');
   ok('5. paste-a-plan still works (it writes no record)', b.run(`planItemsFrom(pwRead('Squat\\n100 lb × 5 5 5')).items.length`)===1 && !b.wall());
 }
 { const b=await boot({live:true,days:record(19)});
   ok('the writer during the trial: not gated', b.run('writerGate()')===true);
 }
 /* membership (9.8 will write it; the cache is honoured offline) */
 { const now=Date.now();
   const b=await boot({live:true,days:record(40),store:{'showup:entitlement':JSON.stringify({status:'active',until:now+30*864e5})}});
   ok('7. an active membership: logging works (and offline: nothing is fetched)', await trainLog(b)==='clicked' && b.today()===1 && !b.wall());
   b.run(`view='sync';render();`);
   ok('12. Settings: Member', /Member/.test(b.d.getElementById('mbRow')?.textContent||''));
 }
 { const now=Date.now();
   const b=await boot({live:true,days:record(40),store:{'showup:entitlement':JSON.stringify({status:'active',until:now-3*864e5})}});
   ok('7. expired 3 days ago: still inside the 7-day grace', b.run('memberEntitled()')===true);
 }
 { const now=Date.now();
   const b=await boot({live:true,days:record(40),store:{'showup:entitlement':JSON.stringify({status:'active',until:now-8*864e5})}});
   ok('7. expired 8 days ago: past grace, the paywall returns', b.run('memberEntitled()')===false && (await trainLog(b),b.wall()));
 }
 /* the owner's preview */
 { const b=await boot({preview:true,days:record(40),settings:{founding:'2026-09-26'}});
   ok('preview (flag off): acts as a new user on this device, founding ignored', await trainLog(b)==='clicked' && b.wall() && b.today()===0);
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
