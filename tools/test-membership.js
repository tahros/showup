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
   ok('the paywall shows your own days and says what stays free', b.d.querySelectorAll('#paywall .mb-grid i').length===20 && /history, editing and export are free, always/i.test(t), t.slice(0,160));
   ok('yearly first, then monthly, yearly chosen', /Yearly[\s\S]*\$29\.99[\s\S]*Monthly[\s\S]*\$4\.99/.test(t) && b.d.querySelector('[data-mb-plan="yearly"]').getAttribute('aria-pressed')==='true');
   ok('Apple\'s subscription terms and both links are on it', /renews automatically/.test(t) && !!b.d.querySelector('#paywall a[href*="stdeula"]') && !!b.d.querySelector('#paywall a[href="privacy.html"]'));
   ok('no countdown, no urgency words', !/left!|hurry|only \d+ days|expires in/i.test(t));
   ok('v4.6.293: the header is the official wordmark and a round close named "Not now" -- no typed brand name', !!b.d.querySelector('#paywall .mb-top img.mb-wm[src*="showuppp-wordmark"]') && b.d.querySelector('#paywall .mb-top [data-mb-later]')?.getAttribute('aria-label')==='Not now' && !/ShowUppp Member/i.test(t));
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
 /* v4.6.278: the coin is a member's; the free days show on Today for non-members; the paywall shows the coin */
 { const b=await boot({live:true,days:record(7)});
   b.run(`session={user:{id:'u1',email:'a@b.co',created_at:'2026-09-01T00:00:00Z'}};view='sync';render();`);
   ok('a non-member: no coin in Settings', !b.d.querySelector('.club-card [data-club-coin]'));
   ok('a non-member: the number reads "No", not "MEMBER No"', /^No$/.test((b.d.querySelector('.club-member-label')?.textContent||'').trim()), b.d.querySelector('.club-member-label')?.textContent);
   b.run(`view='today';render();`);
   const c=b.d.getElementById('mbTrial');
   ok('a non-member: Today shows "7 of 20 free days" in squares', !!c && /7 of 20 free days/.test(c.textContent) && c.querySelectorAll('.mb-trial-g i.on').length===7 && c.querySelectorAll('.mb-trial-g i').length===20, c?.textContent);
   ok('...and counts up, no "left"', !/left|remaining|hurry/i.test(c?.textContent||''));
   ok('v4.6.285: the card reads "Every day you log counts." and nothing more', /Every day you log counts\.$/.test(c?.querySelector('small')?.textContent||'') && !/Nothing else/.test(c?.textContent||''), c?.querySelector('small')?.textContent);
   const j=c?.querySelector('.mb-join[data-mb-open]');
   ok('Join the club: a coin picture with its label, one button (no button inside it)', !!j && /Join the club/.test(j.textContent) && !!j.querySelector('.club-coin-face') && !j.querySelector('button'));
   b.click(j);
   ok('Join the club opens the Subscribe screen, headed "Join the club." before day 20', b.wall() && /Join the club\./.test(b.d.getElementById('pwTitle')?.textContent||''), b.d.getElementById('pwTitle')?.textContent);
   b.click('[data-mb-later]');
 }
 { const b=await boot({live:true,days:record(20)});
   b.run(`view='today';render();`);
   ok('after the trial, the Today card offers Membership', /20 of 20 free days/.test(b.d.getElementById('mbTrial')?.textContent||'') && !!b.d.querySelector('#mbTrial [data-mb-open]'));
   b.run(`paywallOpen('test')`);
   ok('the paywall shows the coin and says what membership adds', !!b.d.querySelector('#paywall .mb-coin [data-club-coin]') && /Your member coin/.test(b.d.getElementById('paywall').textContent));
   b.click('[data-mb-plan="monthly"]');
   ok('picking Monthly relabels the button', /Continue · \$4\.99 a month/.test(b.d.querySelector('#paywall .mb-buy').textContent));
   b.click('[data-mb-plan="yearly"]');
   ok('picking Yearly relabels it back; yearly shows Save 50%', /Continue · \$29\.99 a year/.test(b.d.querySelector('#paywall .mb-buy').textContent) && /Save 50%/.test(b.d.getElementById('paywall').textContent));
   b.click('[data-mb-later]');
 }
 { const b=await boot({live:true,days:record(7),settings:{founding:'2026-09-26'}});
   b.run(`session={user:{id:'u1',email:'a@b.co',created_at:'2026-09-01T00:00:00Z'}};view='sync';render();`);
   ok('a founding member: the coin and "MEMBER No"', !!b.d.querySelector('.club-card [data-club-coin]') && /MEMBER/.test(b.d.querySelector('.club-member-label')?.textContent||''));
   b.run(`view='today';render();`);
   ok('a founding member: no free-days card', !b.d.getElementById('mbTrial'));
 }
 { const b=await boot({days:record(7)});
   b.run(`view='today';render();`);
   ok('flag off: no free-days card for anyone', !b.d.getElementById('mbTrial'));
 }
 { const b=await boot({preview:true,days:record(40),settings:{founding:'2026-09-26'}});
   ok('preview (flag off): acts as a new user on this device, founding ignored', await trainLog(b)==='clicked' && b.wall() && b.today()===0);
 }
 /* v4.6.303: Settings → Account & data → Membership: the plan, the price, renews or ends, change plan, cancel */
 { const now=Date.now(),until=now+200*864e5;
   const b=await boot({live:true,days:record(40),store:{'showup:entitlement':JSON.stringify({status:'active',until,plan:'yearly',since:now-165*864e5,renews:true})}});
   b.run(`view='sync';render();`);await settle();
   const grp=b.d.querySelector('[data-club-group=account]'),entry=b.d.querySelector('[data-mbm-open].mbm-entry');
   ok('member: the Membership row sits first in Account & data, with plan, price and the renewal date',!!entry&&!!grp&&grp.contains(entry)&&/Yearly · \$29\.99 a year/.test(entry.textContent)&&/Renews /.test(entry.textContent),entry&&entry.textContent.trim());
   b.click(entry);await settle();
   const m=b.d.getElementById('mbManage'),rows=m?[...m.querySelectorAll('.mbm-row')].map(r=>r.textContent.trim()):[];
   ok('member: the screen shows plan, price, member since, renews, billed through Apple ID',!!m&&['Plan','Price','Member since','Renews','Billed through'].every(k=>rows.some(r=>r.startsWith(k)))&&/Active/i.test(m.querySelector('.mbm-pill').textContent),JSON.stringify(rows));
   ok('member: Change plan offers both plans with the current one marked, and Cancel membership',m.querySelectorAll('[data-mbm-plan]').length===2&&/Current/.test(m.querySelector('[data-mbm-plan=yearly]').textContent)&&!!m.querySelector('[data-mbm-cancel]'));
   b.click('[data-mbm-plan=monthly]');await settle();
   ok('member: picking Monthly says when it starts (when the year ends) and names the price on the button',/when this year ends/.test(b.d.querySelector('.mbm-when').textContent)&&/Switch to Monthly · \$4\.99 a month/.test(b.d.querySelector('[data-mbm-switch]').textContent));
   const before=b.w.localStorage.getItem('showup:entitlement');b.click('[data-mbm-switch]');b.click('[data-mbm-cancel]');await settle();
   ok('outside test mode, Switch and Cancel hand off to Apple and change nothing here',b.w.localStorage.getItem('showup:entitlement')===before&&!b.d.querySelector('.mbm-confirm'));
   ok('the membership screen counts as a pop-up (no page gestures under it)',b.run('modalOpen()')===true);
   b.click('[data-mbm-close]');await settle();
   ok('Close removes it and the page is free again',!b.d.getElementById('mbManage')&&b.run('modalOpen()')===false);
 }
 { const now=Date.now();
   const b=await boot({live:true,days:record(40),store:{'showup:entitlement':JSON.stringify({status:'active',until:now+20*864e5,plan:'monthly',renews:false})}});
   b.run(`view='sync';render();`);await settle();
   ok('cancelled: the Settings row says Ends, not Renews',/Ends /.test(b.d.querySelector('.mbm-entry').textContent)&&!/Renews/.test(b.d.querySelector('.mbm-entry').textContent));
   b.click('.mbm-entry');await settle();
   ok('cancelled: the screen shows the end date, Resume membership, and no Change plan or Cancel',/Ends /.test(b.d.querySelector('.mbm-pill').textContent)&&!!b.d.querySelector('[data-mbm-resume]')&&!b.d.querySelector('[data-mbm-plan]')&&!b.d.querySelector('[data-mbm-cancel]'));
 }
 { const b=await boot({live:true,days:record(40),settings:{founding:'2026-09-01'}});
   b.run(`view='sync';render();`);await settle();
   ok('founding (owner preview off, flag live): Founding member, free for good',/Founding member/.test(b.d.querySelector('.mbm-entry')?.textContent||''));
   b.click('.mbm-entry');await settle();
   ok('founding: no price to pay and nothing to cancel',/Free/.test(b.d.getElementById('mbManage').textContent)&&!b.d.querySelector('[data-mbm-cancel]')&&!b.d.querySelector('[data-mbm-plan]'));
 }
 { const b=await boot({live:true,days:record(12)});
   b.run(`view='sync';render();`);await settle();
   ok('non-member: the row shows the free days',/Free logged days: 12 of 20/.test(b.d.querySelector('.mbm-entry').textContent));
   b.click('.mbm-entry');await settle();b.click('[data-mbm-join]');await settle();
   ok('non-member: Join the club opens the Subscribe screen',!b.d.getElementById('mbManage')&&b.wall());
 }
 { const b=await boot({days:record(40)});b.run(`view='sync';render();`);await settle();
   ok('flag off: no Membership row in Settings',!b.d.querySelector('.mbm-entry'));
 }
 /* v4.6.304: before launch a founding member sees theirs -- true, and nothing to sell */
 { const b=await boot({days:record(40),settings:{founding:'2026-09-02'}});b.run(`view='sync';render();`);await settle();
   const e=b.d.querySelector('.mbm-entry');
   ok('flag off, founding: the Membership row shows Founding member, free for good',!!e&&/Founding member/.test(e.textContent)&&/Free for good/.test(e.textContent),e&&e.textContent.trim());
   b.click(e);await settle();const m=b.d.getElementById('mbManage');
   ok('flag off, founding: the screen says free for good, with nothing to buy, restore or cancel',!!m&&/Free, for good/.test(m.textContent)&&!m.querySelector('[data-mbm-plan],[data-mbm-cancel],[data-mb-restore],[data-mbm-apple]')&&!/Apple ID/.test(m.textContent));
   ok('flag off, founding: still no free-days line or Join anywhere',!b.d.getElementById('mbRow')&&!b.d.querySelector('[data-mb-open]'));
 }
 /* v4.6.310: one profile icon for a non-member (the one dealt), the rest a member's */
 { const b=await boot({live:true,days:record(12),settings:{clubAvatar:'headphones'}});
   b.run(`view='sync';render();`);await settle();
   const free=b.run('clubFreeIcon()[0]'),locked=[...b.d.querySelectorAll('[data-club-icon].club-locked')].map(x=>x.dataset.clubIcon);
   ok('non-member: eight icons locked, the dealt one open',locked.length===8&&!locked.includes(free)&&!!b.d.querySelector(`[data-club-icon="${free}"]:not(.club-locked)`),free+' / '+locked.join());
   ok('non-member: a pick made as a member is kept, but the dealt icon shows',b.run('DB.settings.clubAvatar')==='headphones'&&b.run('clubAvatar()[0]')===free);
   ok('non-member: the note names their icon and offers Join the club',new RegExp('The '+b.run('clubFreeIcon()[1].toLowerCase()')+' is yours').test(b.d.querySelector('.club-lock-note').textContent)&&!!b.d.querySelector('.club-lock-note [data-mb-open]'));
   const other=locked[0];b.click(`[data-club-icon="${other}"]`);await settle();
   ok('non-member: tapping a locked icon opens Join the club and changes nothing',b.wall()&&b.run('DB.settings.clubAvatar')==='headphones'&&b.run('clubAvatar()[0]')===free);
 }
 { const now=Date.now();const b=await boot({live:true,days:record(40),settings:{clubAvatar:'headphones'},store:{'showup:entitlement':JSON.stringify({status:'active',until:now+30*864e5,plan:'yearly'})}});
   b.run(`view='sync';render();`);await settle();
   ok('member: nothing locked, and their pick is back',!b.d.querySelector('.club-locked')&&b.run('clubAvatar()[0]')==='headphones'&&!b.d.querySelector('.club-lock-note'));
 }
 { const b=await boot({days:record(12)});b.run(`view='sync';render();`);await settle();
   ok('flag off: nobody has locked icons',!b.d.querySelector('.club-locked'));
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
