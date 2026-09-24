/* test-reminders.js DIR — v4.6.118: reminders in the iOS app.
 * Faked: the injected Plugins.LocalNotifications. Real: every script in
 * index.html order, the ledger it reads, save() and the Settings card.
 * Today is pinned to Monday 2030-01-07 so every time is in the future.
 * History: eight weeks of Mon 07:00, Wed 18:00, Fri 07:00 starts; two
 * Saturdays at 21:15 (too few, and past quiet hours anyway).
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const TODAY='2030-01-07';
const iso=(base,n)=>{const d=new Date(base+'T00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA');};
const at=(d,h,m)=>{const x=new Date(d+'T00:00');x.setHours(h,m,0,0);return +x;};
function history(){
  const days={};
  for(let w=1;w<=8;w++){
    const mon=iso(TODAY,-7*w), wed=iso(mon,2), fri=iso(mon,4);
    days[mon]={w:[{part:'Chest',ex:'Bench Press',w:185,reps:[5],at:at(mon,7,w%2?0:10)},{part:'Chest',ex:'Bench Press',w:185,reps:[5],at:at(mon,7,20)}],upd:1};
    days[wed]={w:[{part:'Back',ex:'Barbell Row',w:135,reps:[8],at:at(wed,18,0)}],upd:1};
    days[fri]={w:[{part:'Legs',ex:'Squat',w:225,reps:[5],at:at(fri,7,0)}],upd:1};
  }
  /* Tuesday and Thursday are usual days (4 of 8 weeks) that must still get nothing:
     Tuesday has only two sets with a time (too few to know a start); Thursday
     starts at 21:15, and 21:45 is past quiet hours. */
  for(const w of [1,2,3,4]){
    const tue=iso(TODAY,-7*w+1), thu=iso(TODAY,-7*w+3);
    days[tue]={w:[{part:'Arms',ex:'Barbell Curl',w:60,reps:[10],...(w<=2?{at:at(tue,12,0)}:{})}],upd:1};
    days[thu]={w:[{part:'Arms',ex:'Barbell Curl',w:60,reps:[10],at:at(thu,21,15)}],upd:1};
  }
  return days;
}
async function boot({shell=true,grant='granted',prefs=null,extra={},week=null}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),calls=[],state={pending:[]};
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{...history(),...extra},settings:{},...(week?{week,weekAt:1}:{})}));
  if(prefs) w.localStorage.setItem('showup:reminders',JSON.stringify(prefs));
  if(shell){
    const LN={
      requestPermissions(){calls.push('perm');return Promise.resolve({display:grant});},
      cancel(o){calls.push('cancel:'+o.notifications.length);const ids=new Set(o.notifications.map(n=>n.id));state.pending=state.pending.filter(n=>!ids.has(n.id));return Promise.resolve();},
      schedule(o){calls.push('schedule:'+o.notifications.length);state.pending.push(...o.notifications);return Promise.resolve({notifications:o.notifications.map(n=>({id:String(n.id)}))});},
    };
    w.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{LocalNotifications:LN,Filesystem:{}},isPluginAvailable:n=>n==='LocalNotifications'};
  }
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  for(let i=0;i<60;i++) await new Promise(r=>setTimeout(r,0));          // the record loads asynchronously
  vm.runInContext(`todayISO='${TODAY}';checkDate=()=>false;SEED=deriveAll();`,ctx);
  const run=c=>vm.runInContext(c,ctx);
  const plan=()=>JSON.parse(run('JSON.stringify(remPlan().map(n=>({id:n.id,title:n.title,body:n.body,at:+n.schedule.at})))'));
  const toast=()=>w.document.getElementById('toast')?.textContent||'';
  return {w,run,calls,state,plan,toast};
}
const when=(n)=>{const d=new Date(n.at);return d.toLocaleDateString('en-CA')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 /* 1. a browser: nothing at all */
 { const b=await boot({shell:false});
   ok('browser: no plugin, no scheduling', await b.run('remApply(true)')==='no-shell');
   b.run('renderSync()'); ok('browser: Settings has no Reminders card', !b.w.document.querySelector('[data-rem]'));
 }
 /* 2. off by default */
 { const b=await boot();
   ok('off by default: nothing planned', b.plan().length===0);
   ok('off by default: no permission prompt at launch', !b.calls.includes('perm'));
   ok('usual times come from the ledger: Mon 07:05, Wed 18:00, Fri 07:00, Thu 21:15; Tuesday unknown', b.run('JSON.stringify(remUsualTimes())')==='{"1":425,"3":1080,"4":1275,"5":420}', b.run('JSON.stringify(remUsualTimes())'));
   ok('Tuesday and Thursday are usual training days (so the next two rules are really tested)', b.run('[...writerHabitDays()].sort().join()')==='1,2,3,4,5', b.run('[...writerHabitDays()].sort().join()'));
 }
 /* 3. turning it on */
 { const b=await boot(); const r=await b.run('remToggle(true)');
   ok('on: asks iOS for permission, then schedules', b.calls[0]==='perm' && /^scheduled:/.test(r), r+' '+b.calls.join(' '));
   const got=b.state.pending.map(n=>({...n,at:+n.schedule.at}));
   const w=got.map(when);
   ok('on: usual days only, 30 minutes after the usual start', JSON.stringify(w)===JSON.stringify(['2030-01-07 07:35','2030-01-09 18:30','2030-01-11 07:30']), w.join(', '));
   ok('today names the due part; later days do not guess', /^[A-Za-z ]+ is due\.$/.test(got[0].body) && got.slice(1).every(n=>n.body==='Your usual training time.'), got.map(n=>n.body).join(' | '));
   ok('titled by weekday', got.map(n=>n.title).join()==='Monday,Wednesday,Friday');
   ok('at most one per day', new Set(w.map(x=>x.slice(0,10))).size===w.length);
   ok('no streak numbers, no exclamation marks', got.every(n=>!/\d/.test(n.body)&&!/!/.test(n.body+n.title)));
   ok('the switch is device-local, not in synced settings', b.run('!("reminders" in DB.settings)') && JSON.parse(b.w.localStorage.getItem('showup:reminders')).on===true);
   /* 4. logging a set cancels today's line */
   b.run(`day(todayISO).w.push({part:'Chest',ex:'Bench Press',w:185,reps:[5],at:Date.now()}); day(todayISO).upd=Date.now(); save();`);
   await wait(1700);
   ok('logging a set today removes today\'s reminder (after save)', !b.state.pending.some(n=>new Date(+n.schedule.at).toLocaleDateString('en-CA')===TODAY) && b.state.pending.length===2, b.state.pending.map(n=>when({at:+n.schedule.at})).join(', '));
   /* 11. off */
   await b.run('remToggle(false)');
   ok('off: everything cancelled', b.state.pending.length===0 && b.calls.at(-1).startsWith('cancel'));
 }
 /* 5. a planned day: one morning note, no usual-time line */
 { const week={from:iso(TODAY,2),to:iso(TODAY,3),days:{[iso(TODAY,2)]:{title:'Upper chest + triceps',items:[{ex:'Incline Bench Press',w:135,reps:[8]}]},[iso(TODAY,3)]:{items:[{ex:'Squat',w:225,reps:[5]}]}}};
   const b=await boot({prefs:{on:true,morning:'06:45'},week});
   const p=b.plan(), wed=p.filter(n=>when(n).startsWith(iso(TODAY,2))), thu=p.filter(n=>when(n).startsWith(iso(TODAY,3)));
   ok('planned Wednesday: one note, at the morning time, with the title', wed.length===1 && when(wed[0])===iso(TODAY,2)+' 06:45' && wed[0].body==='Planned: Upper chest + triceps.', JSON.stringify(wed));
   ok('planned Thursday: the plan replaces the usual-time line, named by its part when untitled', thu.length===1 && /^Planned: .+\.$/.test(thu[0].body) && !/undefined|null/.test(thu[0].body), JSON.stringify(thu));
   await b.run(`remSetMorning('08:15')`);
   ok('changing the morning time moves the note', b.plan().some(n=>when(n)===iso(TODAY,2)+' 08:15'));
   ok('a bad time is refused', await b.run(`remSetMorning('25:99')`)==='invalid');
 }
 /* 6. a declared rest day gets nothing */
 { const b=await boot({prefs:{on:true},extra:{[iso(TODAY,4)]:{w:[],rest:true,upd:1}}});
   ok('declared rest on Friday: no reminder that day', !b.plan().some(n=>when(n).startsWith(iso(TODAY,4))));
 }
 /* 7-8. quiet hours and too few samples */
 { const b=await boot({prefs:{on:true}});
   ok('Tuesday (a usual day, but only two known start times): nothing', !b.plan().some(n=>new Date(n.at).getDay()===2));
   ok('Thursday (usual start 21:15; 21:45 is past quiet hours): nothing', !b.plan().some(n=>new Date(n.at).getDay()===4));
   ok('Saturday and Sunday (not usual days): nothing', !b.plan().some(n=>[0,6].includes(new Date(n.at).getDay())));
 }
 /* 9. permission refused */
 { const b=await boot({grant:'denied'}); const r=await b.run('remToggle(true)');
   ok('permission refused: stays off, nothing scheduled, says where to fix it', r==='denied' && b.state.pending.length===0 && JSON.parse(b.w.localStorage.getItem('showup:reminders')).on===false && /iOS Settings/.test(b.toast()), b.toast());
 }
 /* 10. the Settings card */
 { const b=await boot({prefs:{on:true,morning:'07:00'}}); b.run('renderSync()');
   const d=b.w.document;
   ok('iOS app: Settings shows the Reminders card, On selected', !!d.querySelector('[data-rem="on"].sel'));
   ok('and the morning time', d.getElementById('remMorning')?.value==='07:00');
   ok('and says what it will and will not do', /At most one a day/.test(d.body.textContent) && /Nothing on rest days/.test(d.body.textContent));
 }
 /* 12. unchanged plans are not rescheduled */
 { const b=await boot({prefs:{on:true}}); await b.run('remApply(true)'); const n=b.calls.length;
   ok('nothing changed: no reschedule churn', await b.run('remApply(false)')==='unchanged' && b.calls.length===n);
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
