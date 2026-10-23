/* ShowUp — membership.js (v4.6.144): the free trial, the paywall and the gates.
   Classic script, loaded before metrics.js. Runbook 9.7; spec:
   claude/paywall-and-metrics-spec.md (D1-D9, all confirmed 2026-09-26).

   OFF UNTIL LAUNCH. PAYWALL_ON is false: nothing here changes what anyone sees
   or can do. The one exception is the preview switch below, for the owner to
   look at it on his own phone.

   THE RULE (D1, D3, D4). The trial is 20 LOGGED DAYS -- dates in the record
   with at least one set, counted from the record itself, never stored. After
   the 20th, two things need membership: starting a NEW day (the first set on a
   date that has none, from Train, History backfill or History edit) and the
   plan writer. Nothing else: a day already started can be finished and edited,
   history reads, Stats shows, export and paste-a-plan work. The record is
   never held hostage.

   FOUNDING MEMBERS (D7). Every record that exists before the paywall goes
   live is comped for good: while PAYWALL_ON is false, a record with a logged
   day gets settings.founding = the date, a synced setting, so it follows the
   account to a new phone. Once the paywall is live nobody new is marked.

   MEMBERSHIP (9.8 fills this in). The in-app purchase, through RevenueCat,
   writes {status, until} to showup:entitlement on this device. Active or in
   grace until `until` + 7 days, offline included (spec 2.4).

   THE PAYWALL (2.3). One calm screen, shown at the moment of a gated action,
   never on open, never repeated on its own. Your own days, one line on what
   stays free, the two prices (yearly first), Export my data, and Not now. No
   countdown anywhere: the only trace of the trial is one quiet row in
   Settings. */
const PAYWALL_ON=false;                      // everywhere at once; the iOS app turns on below
/* v4.6.385: ON IN THE iOS APP, OFF ON THE WEB. The App Store sells the membership
   (runbook 9.8); the web has no way to pay and stays the try-it app (D9), so a gate
   there would only stop people. The iOS app needs the RevenueCat plugin, which
   ota.json requires, so a binary without it never takes this bundle. */
const PAYWALL_IOS=true;
/* v4.6.385: FOUNDING CLOSES. The web keeps no paywall, so without a date anyone could
   log a day on the web, earn "founding" and carry it into the iOS app through sync.
   Records marked before this date stay founding for good (D7); none are marked after. */
const FOUNDING_UNTIL='2026-11-15';
const paywallOn=()=>PAYWALL_ON||(PAYWALL_IOS&&typeof NATIVE_SHELL!=='undefined'&&NATIVE_SHELL&&!(typeof SANDBOX!=='undefined'&&SANDBOX));
const TRIAL_DAYS=20, GRACE_MS=7*864e5;
const MB_PRICES=[{plan:'yearly',label:'Yearly',price:'$29.99',per:'a year',note:'$2.50 a month, billed yearly',badge:'Save 50%'},
                 {plan:'monthly',label:'Monthly',price:'$4.99',per:'a month',note:'Cancel anytime'}];
const MB_TERMS='https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const mbGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const mbSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
/* the owner's preview: localStorage showup:paywall-preview = "1" acts as a NEW
   user on this device (founding ignored), so the gates can be tried for real */
function paywallPreview(){ return (typeof SANDBOX!=='undefined'&&SANDBOX)||mbGet('showup:paywall-preview')==='1'; }  /* v4.6.283: test mode is a new user after launch */
function paywallLive(){ return paywallOn()||paywallPreview(); }
/* v4.6.287: sample data is not a record -- it counts toward neither the free days nor founding */
/* v4.6.392: THE FREE DAYS ARE DAYS LOGGED HERE. An import (every set it brings carries imp) made a
   hundred past days use up the twenty free ones before a single set was logged in ShowUppp. A day
   counts when at least one of its sets was logged in the app. The free days are counted by
   trialDays(); loggedDays() still counts every day you trained, for medals and the club card. */
function trialDays(){ if(DB?.settings?.demo) return 0; return Object.values(DB.days||{}).filter(d=>d&&(d.w||[]).some(s=>!s.imp)).length; }
/* every day with training, imported or not (medals, the club card, the first-run tips) */
function loggedDays(){ if(DB?.settings?.demo) return 0; return Object.values(DB.days||{}).filter(d=>d&&(d.w||[]).length).length; }
function memberEntitled(now=Date.now()){
  try{
    const e=JSON.parse(mbGet('showup:entitlement')||'null');
    return !!e&&(e.status==='active'||e.status==='grace')&&Number.isFinite(+e.until)&&now<+e.until+GRACE_MS;
  }catch(e){ return false; }
}
function memberFounding(){ return !!DB.settings?.founding&&!paywallPreview(); }
function trialOver(){ return paywallLive()&&!memberEntitled()&&!memberFounding()&&trialDays()>=TRIAL_DAYS; }
/* before any set lands on a date: true to go ahead, false when the paywall took over */
function dayGate(iso){
  if((DB.days?.[iso]?.w||[]).length) return true;          // a day already started is always yours to finish
  if(!trialOver()) return true;
  paywallOpen('day'); return false;
}
function writerGate(){
  if(!trialOver()) return true;
  paywallOpen('writer'); return false;
}
/* D7: mark the record a founding member while the paywall is not live */
function foundingMark(){
  if(paywallOn()||(typeof SANDBOX!=='undefined'&&SANDBOX)||!DB?.settings||DB.settings.demo||DB.settings.founding||!loggedDays()) return false;
  if(todayISO>=FOUNDING_UNTIL) return false;
  DB.settings.founding=todayISO; DB.settingsAt=Date.now(); save(true); return true;
}
setTimeout(()=>{ try{ foundingMark(); }catch(e){} },3000);
setInterval(()=>{ try{ foundingMark(); }catch(e){} },60000);

/* ---- the screen ---- */
let _mbPick='yearly';
function paywallOpen(why){
  if(document.getElementById('paywall')) return;
  const el=document.createElement('div');
  el.id='paywall';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','pwTitle');
  el.dataset.why=why||'';
  el.innerHTML=paywallHTML();
  document.body.appendChild(el);
  el.addEventListener('click',paywallClick);
  if(rcPlugin()) rcOffering().then(o=>{ if(o&&document.getElementById('paywall')===el){ el.querySelectorAll('[data-mb-plan]').forEach(b=>{const p=MB_PRICES.find(x=>x.plan===b.dataset.mbPlan),pb=b.querySelector('.mb-opt-p b'),sm=b.querySelector('.mb-opt-l small'),bd=b.querySelector('.mb-badge');if(pb)pb.textContent=p.price;if(sm&&p.note)sm.textContent=p.note;if(bd)bd.textContent=p.badge||'';}); } }).catch(()=>{});   // v4.6.385: the App Store's own prices
  if(mbGet('showup:ev-paywall')!==todayISO){ mbSet('showup:ev-paywall',todayISO); if(typeof mTrack==='function') mTrack('paywall_seen'); }
}
function paywallClose(){ document.getElementById('paywall')?.remove(); }
/* v4.6.278: the coin is a member's. The paywall shows it as what membership adds; Settings shows
   it only to members (founding or entitled). */
function isMember(){ return memberFounding()||memberEntitled(); }
function mbBuyLabel(plan){ const p=MB_PRICES.find(x=>x.plan===plan)||MB_PRICES[0]; return `Continue · ${p.price} ${p.per}`; }
function paywallHTML(){
  const days=Object.keys(DB.days||{}).filter(d=>(DB.days[d].w||[]).length).sort();
  const first=days.slice(0,TRIAL_DAYS);
  const squares=first.map((d,i)=>`<i title="${d}" style="--i:${i}"></i>`).join('');
  const since=first.length?new Date(first[0]+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
  const num=typeof clubMembershipFacts==='function'?String(clubMembershipFacts().number).replace(/,/g,''):'';
  const coin=typeof clubCoinHTML==='function'?`<div class="club-brand mb-coin" aria-hidden="true">${clubCoinHTML(num)}</div>`:'';
  const opts=MB_PRICES.map(p=>`<button type="button" class="mb-opt" data-mb-plan="${p.plan}" aria-pressed="${_mbPick===p.plan}">${p.badge?`<span class="mb-badge">${p.badge}</span>`:''}<span class="mb-rd" aria-hidden="true"></span>
      <span class="mb-opt-l">${p.label}${p.note?`<small>${p.note}</small>`:''}</span><span class="mb-opt-p"><b>${p.price}</b><small>${p.per}</small></span></button>`).join('');
  return `<div class="mb-card">
    <div class="mb-top"><img class="mb-wm" src="assets/showuppp-wordmark-${document.documentElement.dataset.theme==='dark'?'dark':'light'}.svg" alt="ShowUppp"><button type="button" class="mb-x" data-mb-later aria-label="Not now">${icon('close',ICON_SZ.sm)}</button></div>
    <div class="mb-hero">${coin}${first.length?`<div><div class="mb-grid" aria-label="${first.length} logged days">${squares}</div>
    <p class="mb-since">${days.length} ${days.length===1?'day':'days'} logged${since?' since '+since:''}</p></div>`:''}</div>
    ${days.length>=TRIAL_DAYS?`<h2 id="pwTitle">Twenty days.<br>You’re a regular now.</h2>
    <p class="mb-line">Membership keeps every new day open.</p>`:`<h2 id="pwTitle">Join the club.</h2>
    <p class="mb-line">Members log every day, plan with the writer and carry the coin.</p>`}
    <ul class="mb-gets">
      <li><span class="mb-ic">＋</span><span>Log every new day<small>Day 21 and every day after.</small></span></li>
      <li><span class="mb-ic">✦</span><span>The plan writer<small>Plans built from your own record.</small></span></li>
      <li><span class="mb-ic mb-ic-coin" aria-hidden="true"></span><span>Your member coin<small>With your number, in Settings.</small></span></li>
      <li class="mb-free"><span class="mb-ic">✓</span><span>Free for everyone<small>History, editing and export are free, always. Your record stays yours.</small></span></li>
    </ul>
    <div class="mb-opts" role="group" aria-label="Membership">${opts}</div>
    <button type="button" class="btn mb-buy" data-mb-buy><span>${mbBuyLabel(_mbPick)}</span></button>
    <p class="mb-cancel">Cancel anytime in your Apple ID settings.</p>
    <div class="mb-links"><button type="button" class="mb-link" data-mb-export>Export my data</button><button type="button" class="mb-link" data-mb-restore>Restore purchases</button></div>
    <p class="mb-fine">Payment is charged to your Apple ID. Membership renews automatically unless cancelled at least 24 hours before the end of the period; manage or cancel it in Settings → your name → Subscriptions. <a href="${MB_TERMS}" target="_blank" rel="noopener">Terms of Use</a> · <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></p>
  </div>`;
}
function paywallClick(e){
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.mbPlan){ _mbPick=b.dataset.mbPlan; document.querySelectorAll('#paywall [data-mb-plan]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.mbPlan===_mbPick)); const l=document.querySelector('#paywall .mb-buy span'); if(l){ l.textContent=mbBuyLabel(_mbPick); l.classList.remove('mb-swap'); void l.offsetWidth; l.classList.add('mb-swap'); } return; }
  if(b.hasAttribute('data-mb-later')){ paywallClose(); return; }
  if(b.hasAttribute('data-mb-export')){
    dlFile('showup-backup-'+todayISO+'.json','application/json',JSON.stringify({app:'showup',v:APP_VERSION,exported:new Date().toISOString(),doc:DB}));
    if(typeof mTrack==='function') mTrack('export');
    return;
  }
  if(b.hasAttribute('data-mb-buy')){ memberBuy(_mbPick); return; }
  if(b.hasAttribute('data-mb-restore')){ memberRestore(); return; }
}
/* 9.8 replaces these two with RevenueCat's purchase and restore */
let mbBuying=false;
async function memberBuy(plan){
  /* v4.6.283: in test mode Continue makes a free test membership, so the paid side can be tried */
  if(typeof SANDBOX!=='undefined'&&SANDBOX&&typeof sbxMemberSet==='function'){
    if(mbBuying||!MB_PRICES.some(p=>p.plan===plan))return 'busy';
    if(typeof repTickInit==='function')repTickInit();
    mbBuying=true;
    try{
      const key=typeof clubMembershipKey==='function'?clubMembershipKey():'';
      if(key&&typeof clubLoadMembership==='function'&&!clubMembershipFacts().reference)await clubLoadMembership();
      if(key!==(typeof clubMembershipKey==='function'?clubMembershipKey():''))return 'cancelled';
      const wall=document.getElementById('paywall'),source=wall?.querySelector('[data-club-coin]'),rect=source?.getBoundingClientRect(),angle=source?getComputedStyle(source.querySelector('.club-coin-rotor')).transform:'none';
      wall?.remove();
      sbxMemberSet(plan);
      view='sync';lastView='sync';render();window.scrollTo(0,0);if(typeof modalLockScroll==='function')modalLockScroll(0); // our overlay owns the transition
      await memberWelcome({wall,rect,angle,key});
      toast(`Test member (${plan}). No charge.`);return 'test';
    }finally{mbBuying=false;}
  }
  const P=rcPlugin();
  if(!P){ toast('Membership opens with the App Store version.'); return 'unavailable'; }
  if(mbBuying||!MB_PRICES.some(p=>p.plan===plan)) return 'busy';
  mbBuying=true;
  try{
    if(!await rcStart()){ toast('Can’t reach the App Store right now. Try again in a moment.'); return 'offline'; }
    const off=await rcOffering(true), pkg=off?.availablePackages?.find(p=>p.identifier===RC_PACKAGES[plan]);
    if(!pkg){ toast('Can’t reach the App Store right now. Try again in a moment.'); return 'unavailable'; }
    const key=typeof clubMembershipKey==='function'?clubMembershipKey():'';
    let r;
    try{ r=await P.purchasePackage({aPackage:pkg}); }
    catch(e){ if(rcCancelled(e)) return 'cancelled'; toast('The purchase did not finish. Nothing was charged.'); return 'failed'; }
    rcApply(r?.customerInfo);
    if(!memberEntitled()){ toast('The purchase is pending with Apple. Membership opens when it clears.'); return 'pending'; }
    /* the same reveal the test purchase plays: coin to the card, then the number */
    if(key&&typeof clubLoadMembership==='function'&&!clubMembershipFacts().reference) try{ await clubLoadMembership(); }catch(_e){}
    const wall=document.getElementById('paywall'),source=wall?.querySelector('[data-club-coin]'),rect=source?.getBoundingClientRect(),angle=source?getComputedStyle(source.querySelector('.club-coin-rotor')).transform:'none';
    wall?.remove();
    view='sync';lastView='sync';render();window.scrollTo(0,0);if(typeof modalLockScroll==='function')modalLockScroll(0);
    await memberWelcome({wall,rect,angle,key});
    return 'bought';
  }finally{ mbBuying=false; }
}
async function memberRestore(){
  const P=rcPlugin();
  if(!P){ toast('Nothing to restore yet.'); return 'unavailable'; }
  if(!await rcStart()){ toast('Can’t reach the App Store right now. Try again in a moment.'); return 'offline'; }
  try{ const r=await P.restorePurchases(); rcApply(r?.customerInfo); }
  catch(e){ toast('Restore did not finish. Try again in a moment.'); return 'failed'; }
  if(memberEntitled()){
    paywallClose(); render(); if(view==='sync'&&typeof renderSync==='function') renderSync();
    if(document.getElementById('mbManage')) mbManagePaint();
    toast('Membership restored.'); return 'restored';
  }
  toast('No membership found for this Apple ID.'); return 'none';
}

/* ---- v4.6.385: THE APP STORE (runbook 9.8; spec 2.4, 3.3, 3.4) ----
   RevenueCat sells the membership and is the source of truth for it. This file
   only mirrors RevenueCat's answer into showup:entitlement, the one record every
   gate already reads (memberEntitled), so the gates, the coin and Settings work
   unchanged and a member stays a member offline through the 7-day grace.
   - iOS app only, and never in test mode (test mode keeps its free test purchase).
   - Who: the ShowUppp account id when signed in (logIn), so a membership follows
     the account to a second iPhone; anonymous otherwise. Buying never needs an
     account (Apple rejects apps that force one) -- Restore recovers it by Apple ID.
   - The plugin is RevenueCat's (@revenuecat/purchases-capacitor). No bundler, so it
     is reached the way every native plugin here is: Capacitor.Plugins, or
     nativePromise when the bridge exposes only that.
   - Prices on screen are the App Store's, in the buyer's currency, once loaded;
     MB_PRICES holds the US prices until then.
   - The key below is RevenueCat's PUBLIC SDK key, made to ship inside the app. */
const RC_API_KEY='appl_SiKFQEebvzPrgPCvsaoGVqwkpue';
const RC_ENTITLEMENT='member', RC_PACKAGES={yearly:'$rc_annual',monthly:'$rc_monthly'};
const RC_PRODUCTS={'co.yooooooooo.showup.member.yearly':'yearly','co.yooooooooo.showup.member.monthly':'monthly'};
const RC_METHODS=['configure','logIn','logOut','getOfferings','purchasePackage','restorePurchases','getCustomerInfo','setAttributes'];
let _rcStart=null,_rcUser,_rcOffering=null,_rcOfferingAt=0;
function rcPlugin(){
  try{
    if(typeof NATIVE_SHELL==='undefined'||!NATIVE_SHELL||(typeof SANDBOX!=='undefined'&&SANDBOX)) return null;
    const cap=window.Capacitor; if(!cap) return null;
    if(!(cap.isPluginAvailable?.('Purchases')||(cap.PluginHeaders||[]).some(h=>h&&h.name==='Purchases')||cap.Plugins?.Purchases)) return null;
    const P=cap.Plugins?.Purchases;
    if(P&&typeof P.purchasePackage==='function') return P;
    if(typeof cap.nativePromise==='function') return Object.fromEntries(RC_METHODS.map(m=>[m,o=>cap.nativePromise('Purchases',m,o||{})]));
    return null;
  }catch(e){ return null; }
}
const rcUid=()=>{ try{ return (typeof session!=='undefined'&&session?.user?.id)||null; }catch(e){ return null; } };
const rcCancelled=e=>!!(e&&(e.userCancelled||e.data?.userCancelled||e.info?.userCancelled||String(e.code)==='1'||/cancel/i.test(String(e.message||e.errorMessage||''))));
function rcStart(){
  const P=rcPlugin(); if(!P) return Promise.resolve(false);
  if(_rcStart) return _rcStart;
  _rcStart=(async()=>{
    try{
      const uid=rcUid();
      await P.configure(uid?{apiKey:RC_API_KEY,appUserID:uid}:{apiKey:RC_API_KEY});
      _rcUser=uid;
      /* the anonymous device id from metrics.js, so the webhook can join a purchase to the funnel */
      try{ const dev=localStorage.getItem('showup:device'); if(dev) await P.setAttributes({showup_device:dev,showup_version:String(typeof APP_VERSION!=='undefined'?APP_VERSION:'').replace(/^v/,'')}); }catch(_e){}
      await rcRefresh();
      rcOffering().catch(()=>{});
      return true;
    }catch(e){ _rcStart=null; return false; }
  })();
  return _rcStart;
}
/* RevenueCat's customer -> showup:entitlement. Test entitlements are left alone. */
function rcApply(ci){
  if(!ci||typeof ci!=='object') return false;
  let prev=null; try{ prev=JSON.parse(mbGet('showup:entitlement')||'null'); }catch(_e){}
  if(prev&&prev.test) return false;
  const e=ci.entitlements?.active?.[RC_ENTITLEMENT];
  if(!e||e.isActive===false){ try{ localStorage.removeItem('showup:entitlement'); }catch(_e){} return false; }
  const until=Number.isFinite(+e.expirationDateMillis)&&+e.expirationDateMillis>0?+e.expirationDateMillis:Date.now()+3650*864e5;
  const rec={status:e.billingIssueDetectedAt||e.billingIssueDetectedAtMillis?'grace':'active',until,
    plan:RC_PRODUCTS[e.productIdentifier]||(/month/i.test(e.productIdentifier||'')?'monthly':'yearly'),
    since:Number.isFinite(+e.originalPurchaseDateMillis)?+e.originalPurchaseDateMillis:null,
    renews:e.willRenew!==false,store:'apple',sandbox:!!e.isSandbox};
  mbSet('showup:entitlement',JSON.stringify(rec));
  return true;
}
/* follow the signed-in account (spec 3.4), then read the customer */
async function rcRefresh(){
  const P=rcPlugin(); if(!P||!_rcStart&&_rcUser===undefined) return false;
  const was=memberEntitled();
  try{
    const uid=rcUid(); let ci=null;
    if(uid!==_rcUser){
      if(uid){ const r=await P.logIn({appUserID:uid}); ci=r?.customerInfo||null; }
      else { try{ const r=await P.logOut(); ci=r?.customerInfo||null; }catch(_e){} }
      _rcUser=uid;
    }
    if(!ci){ const r=await P.getCustomerInfo(); ci=r?.customerInfo||r; }
    rcApply(ci);
  }catch(e){ return false; }
  if(was!==memberEntitled()){ try{ render({soft:true}); if(view==='sync'&&typeof renderSync==='function') renderSync(); }catch(_e){} }
  return true;
}
/* the App Store's prices, in the buyer's own currency */
async function rcOffering(force){
  const P=rcPlugin(); if(!P) return null;
  if(_rcOffering&&!force&&Date.now()-_rcOfferingAt<6*3600e3) return _rcOffering;
  try{
    const r=await P.getOfferings(); const off=r?.current||r?.all?.default||null;
    if(off){ _rcOffering=off; _rcOfferingAt=Date.now(); rcPrices(off); }
    return off;
  }catch(e){ return _rcOffering; }
}
function rcPrices(off){
  const by=Object.fromEntries((off?.availablePackages||[]).map(p=>[p.identifier,p.product]));
  const y=by[RC_PACKAGES.yearly], m=by[RC_PACKAGES.monthly];
  const Y=MB_PRICES.find(p=>p.plan==='yearly'), M=MB_PRICES.find(p=>p.plan==='monthly');
  if(y?.priceString){ Y.price=y.priceString; if(y.pricePerMonthString) Y.note=`${y.pricePerMonthString} a month, billed yearly`; }
  if(m?.priceString) M.price=m.priceString;
  if(y?.price>0&&m?.price>0){ const save=Math.round((1-y.price/(m.price*12))*100); Y.badge=save>=5?`Save ${save}%`:''; }
  const l=document.querySelector('#paywall .mb-buy span'); if(l) l.textContent=mbBuyLabel(_mbPick);
}
/* Apple owns change and cancel: its own subscription screen */
function rcManage(){
  try{ location.href='itms-apps://apps.apple.com/account/subscriptions'; }
  catch(e){ toast('Open Settings → your name → Subscriptions.'); }
}
if(typeof NATIVE_SHELL!=='undefined'&&NATIVE_SHELL){
  setTimeout(()=>{ rcStart(); },1500);
  /* back from the App Store (a purchase, a cancel, a renewal while away) */
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&_rcStart) rcRefresh(); });
  /* signing in or out is not an event here; the account id is cheap to compare */
  setInterval(()=>{ if(_rcStart&&rcUid()!==_rcUser) rcRefresh(); },5000);
}

/* One presentation path, no entitlement or identity writes. Called only after the test grant.
   A future verified store purchase can call this same reveal; restore/renewal must not.
   Registry numbers are never invented, padded or reassigned for the celebration. */
async function memberWelcome({wall,rect,angle,key}){
  const target=document.querySelector('.club-card [data-club-coin]'),number=document.querySelector('.club-card .club-number');
  if(!target||!number||!Element.prototype.animate){wall?.remove();return;}
  const facts=clubMembershipFacts(),motion=matchMedia('(prefers-reduced-motion: reduce)').matches||(typeof mascotMode==='function'&&mascotMode()!=='animated');
  const animations=[],voices=[],controller=new AbortController();let layer,cover;
  const valid=()=>key===clubMembershipKey()&&target.isConnected&&view==='sync'&&!document.hidden;
  const cancel=()=>{controller.abort();animations.forEach(a=>a.cancel());voices.forEach(s=>{try{s.stop();}catch(_e){}});};
  const chime=(hz,delay,gain)=>{
    if(motion||controller.signal.aborted||!loggerPrefs.sound||!_tickOn||!_tickCtx||_tickCtx.state!=='running')return;
    try{const c=_tickCtx,t=c.currentTime+delay;for(const [ratio,level] of [[1,1],[1.006,.16],[1.59,.24]]){
      const s=c.createOscillator(),g=c.createGain();s.frequency.value=hz*ratio;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain*level,t+.002);g.gain.exponentialRampToValueAtTime(.00001,t+.6);s.connect(g);g.connect(c.destination);s.onended=()=>{s.disconnect();g.disconnect();};voices.push(s);s.start(t);s.stop(t+.62);
    }}catch(_e){}
  };
  const sleep=ms=>new Promise(resolve=>{if(controller.signal.aborted){resolve();return;}const t=setTimeout(resolve,ms);controller.signal.addEventListener('abort',()=>{clearTimeout(t);resolve();},{once:true});});
  const play=(el,frames,options)=>{if(controller.signal.aborted)return Promise.resolve();const a=el.animate(frames,{fill:'forwards',...options});animations.push(a);return a.finished.catch(()=>{});};
  const change=()=>{if(!valid())cancel();};
  document.addEventListener('visibilitychange',change);window.addEventListener('resize',cancel);
  const observer=new MutationObserver(change);observer.observe(document.getElementById('view'),{childList:true});
  try{
    clubCoinDispose();
    target.style.visibility='hidden';if(facts.reference)number.style.visibility='hidden';
    layer=document.createElement('div');layer.id='memberWelcome';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Your membership');
    const pipColor=document.documentElement.dataset.theme==='dark'?'white':'blue';
    layer.innerHTML=`<div class="mw-ground"></div><div class="mw-party" aria-hidden="true">${typeof companionHTML==='function'&&companionHTML()?`<span class="mw-pip mw-comp">${companionHTML()}</span>`:`<img class="mw-pip" src="assets/mascot-${pipColor}.png" alt="">`}<div class="mw-squares"></div></div><div class="mw-copy"><h2>Welcome to the club.</h2></div><div class="club-brand mw-flight"></div><div class="mw-caption" role="status">Test membership · no charge</div><button type="button" class="mw-skip">Skip animation</button>`;
    const flight=layer.querySelector('.mw-flight');flight.innerHTML=clubCoinHTML(facts.reference?facts.number:'');flight.querySelector('button').tabIndex=-1;flight.setAttribute('aria-hidden','true');
    const rotor=flight.querySelector('.club-coin-rotor'),engraving=flight.querySelector('.club-coin-number');engraving.style.opacity='0';
    if(wall){cover=wall;cover.inert=true;cover.setAttribute('aria-hidden','true');cover.style.animation='none';document.body.appendChild(cover);}
    document.body.appendChild(layer);layer.querySelector('.mw-skip').onclick=cancel;layer.querySelector('.mw-skip').focus({preventScroll:true});
    /* v4.6.308: the paywall's coin may be scrolled out of sight (small screens, buy button at the foot): then the coin enters from the top of the view, not from off screen */
    const start=rect&&rect.width&&rect.bottom>0&&rect.top<innerHeight?rect:{left:innerWidth/2-42,top:Math.max(24,Math.min(120,innerHeight*.15)),width:rect&&rect.width||84},size=start.width;
    Object.assign(flight.style,{left:start.left+'px',top:start.top+'px',width:size+'px',height:size+'px'});
    const centerY=Math.min(innerHeight*.25,210),end=target.getBoundingClientRect(),midX=innerWidth/2-start.left-size/2,midY=centerY-start.top-size/2;
    layer.style.setProperty('--mw-center',centerY+'px');
    const middle=`translate(${midX}px,${midY}px) scale(${Math.min(190,innerWidth*.55)/size})`,landing=`translate(${end.left-start.left+(end.width-size)/2}px,${end.top-start.top+(end.height-size)/2}px) scale(${end.width/size})`;
    if(motion){cover?.remove();layer.querySelector('.mw-ground').style.opacity='0';rotor.style.transform='rotateY(180deg)';flight.style.transform=landing;engraving.style.opacity='1';await sleep(120);}
    else{
      void play(layer.querySelector('.mw-ground'),[{opacity:0},{opacity:1}],{duration:450});
      if(cover)void play(cover,[{opacity:1},{opacity:0}],{duration:450});
      // Matrix interpolation takes the shortest arc and discards whole turns.
      // Use matching rotateY functions, preserving the source pose and at least two turns.
      const matrix=new DOMMatrix(angle&&angle!=='none'?angle:undefined);
      const startAngle=Math.atan2(matrix.m31,matrix.m11)*180/Math.PI;
      const endAngle=180+360*Math.ceil((startAngle+720-180)/360);
      flight.classList.add('mw-spinning');
      const spin=play(rotor,[{transform:`rotateY(${startAngle}deg)`},{transform:`rotateY(${endAngle}deg)`}],{duration:2400,easing:'cubic-bezier(.25,0,.18,1)'});
      const pip=layer.querySelector('.mw-pip'),copy=layer.querySelector('.mw-copy');
      void play(pip,[{opacity:0,transform:'translateY(45px) scale(.8)'},{offset:.28,opacity:1,transform:'translateY(15px) scale(1.08,.86)'},{offset:.55,opacity:1,transform:'translateY(-43px) rotate(9deg)'},{offset:.8,opacity:1,transform:'translateY(4px) scale(1.06,.94)'},{opacity:1,transform:'none'}],{duration:1550,delay:230,easing:'ease-in-out'});
      void play(copy,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:500,delay:1450});
      for(let i=0;i<22;i++){const square=document.createElement('i'),a=i*Math.PI*2/22;layer.querySelector('.mw-squares').appendChild(square);
        void play(square,[{opacity:0,transform:'scale(.2)'},{offset:.15,opacity:1,transform:`translate(${Math.cos(a)*45}px,${Math.sin(a)*35}px) rotate(25deg)`},{opacity:0,transform:`translate(${Math.cos(a)*(105+i%4*10)}px,${Math.sin(a)*106+35}px) rotate(150deg) scale(.5)`}],{duration:1000,delay:1300});
      }
      chime(1380,.5,.032);chime(1840,1.35,.04);chime(2310,1.48,.022);
      await play(flight,[{transform:'none'},{transform:middle}],{duration:1000,easing:'cubic-bezier(.2,.8,.25,1)'});await sleep(300);
      if(facts.reference)void play(engraving,[{opacity:0,filter:'blur(2px)'},{opacity:1,filter:'blur(0)'}],{duration:600});
      await spin;await sleep(450);cover?.remove();
      void play(pip,[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(30px) scale(.9)'}],{duration:430});
      void play(copy,[{opacity:1},{opacity:0}],{duration:380});
      void play(layer.querySelector('.mw-ground'),[{opacity:1},{opacity:0}],{duration:850});
      await play(flight,[{transform:middle},{transform:landing}],{duration:1100,easing:'cubic-bezier(.4,0,.16,1)'});
      chime(1550,0,.025);
    }
    if(!valid()||controller.signal.aborted)return;
    if(facts.reference){
      number.textContent='';number.setAttribute('aria-label',facts.number);number.style.visibility='';
      const digits=Array.from(facts.number,c=>{const s=document.createElement('span');s.textContent=c;s.className='mw-digit';s.setAttribute('aria-hidden','true');number.appendChild(s);return s;});
      await Promise.all(digits.map((d,i)=>play(d,[{opacity:0,transform:'translateY(100%)'},{opacity:1,transform:'translateY(0)'}],{duration:motion?1:480,delay:motion?0:i*75,easing:'cubic-bezier(.2,.7,.2,1)'})));
      if(!motion&&!controller.signal.aborted){number.dataset.mwNumber=facts.number;number.classList.add('mw-number-shine');await sleep(850);}
    }
  }catch(e){console.warn('Membership reveal unavailable');}
  finally{
    cancel();observer.disconnect();document.removeEventListener('visibilitychange',change);window.removeEventListener('resize',cancel);cover?.remove();layer?.remove();
    target.style.visibility='';number.style.visibility='';number.classList.remove('mw-number-shine');number.removeAttribute('aria-label');delete number.dataset.mwNumber;
    if(target.isConnected&&key===clubMembershipKey()){
      clubPaintMembership();clubCoinMotion={angle:180,speed:0,idle:true,direction:1};clubCoinDispose=()=>{};clubBindCoin();
      document.querySelector('[data-club-copy]')?.focus({preventScroll:true});
    }
  }
}

/* v4.6.278: the free days, on Today (Sungjee's call, 2026-10-11: visible, not Settings only). It counts
   UP in your own squares -- no "days left", no urgency. Non-members during and after the trial only. */
/* v4.6.285: "Nothing else does." is gone; Join the club -- the coin, a picture of what membership
   brings -- opens the Subscribe screen at any point, not only at day 21. */
function trialCardHTML(){
  if(!paywallLive()||isMember()||DB.settings.demo) return '';
  const n=Math.min(trialDays(),TRIAL_DAYS),sq=Array.from({length:TRIAL_DAYS},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('');
  const sub=n<TRIAL_DAYS?'Every day you log counts.':'Your record stays yours.';
  /* the coin as a picture, not its own button: no flip handler, nothing nested in the Join button */
  const coin=typeof clubCoinHTML==='function'?`<span class="club-brand mb-join-coin" aria-hidden="true">${clubCoinHTML('').replace(/^<button[^>]*>/,'<span class="club-coin-button">').replace(/<\/button>$/,'</span>')}</span>`:'';
  return `<div class="mb-trial" id="mbTrial"><div class="mb-trial-g" aria-hidden="true">${sq}</div><div class="mb-trial-t">${n} of ${TRIAL_DAYS} free days<small>${sub}</small></div><button type="button" class="mb-join" data-mb-open aria-label="Join the club">${coin}<span>Join the club</span></button></div>`;
}
/* ---- the one Settings row (never elsewhere: no countdown, no badge) ---- */
function membershipRowHTML(){
  if(!paywallLive()) return '';
  let body;
  if(memberFounding()) body='Founding member · free for good';
  else if(memberEntitled()) body='Member · <button type="button" class="linkbtn" data-mbm-open>Membership</button>';
  else if(trialDays()<TRIAL_DAYS) body=`Free logged days: ${trialDays()} of ${TRIAL_DAYS}`;
  else body='Free logged days: 20 of 20 · <button type="button" class="linkbtn" data-mb-open>Membership options</button>';
  return `<div class="mb-row mono" id="mbRow">${body}</div>`;
}
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('[data-mb-open]')) paywallOpen('settings'); });

/* ---- v4.6.303: MANAGE MEMBERSHIP. Settings → Account → Membership opens one screen with
   the plan, the price, when it renews (or ends), changing plan and cancelling.
   Apple owns the subscription: in the App Store version Change and Cancel hand off to
   Apple's own subscription sheet (StoreKit showManageSubscriptions) and this screen shows
   what came back. Test mode acts it out on the test entitlement, with no charge. */
function mbSub(){
  let e=null;try{e=JSON.parse(mbGet('showup:entitlement')||'null');}catch(x){}
  if(memberFounding())return {kind:'founding',since:DB.settings.founding};
  if(!memberEntitled()||!e)return {kind:'none'};
  const plan=MB_PRICES.find(p=>p.plan===e.plan)||MB_PRICES[0];
  return {kind:'member',plan,until:+e.until,since:e.since||null,renews:e.renews!==false,next:e.next?MB_PRICES.find(p=>p.plan===e.next):null,grace:e.status==='grace'||Date.now()>+e.until,test:!!e.test};
}
const mbDate=t=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
function mbSubWrite(f){ try{const e=JSON.parse(mbGet('showup:entitlement')||'null');if(!e)return;f(e);mbSet('showup:entitlement',JSON.stringify(e));}catch(x){} }
function membershipSettingsHTML(){
  /* v4.6.304: a founding member sees theirs before launch too -- true, and nothing to sell */
  if(!paywallLive()&&!memberFounding())return '';
  const s=mbSub();
  const line=s.kind==='founding'?['Founding member','Free for good']
    :s.kind==='member'?[`${s.plan.label} · ${s.plan.price} ${s.plan.per}`,s.renews?`Renews ${mbDate(s.until)}`:`Ends ${mbDate(s.until)}`]
    :[`Free logged days: ${Math.min(trialDays(),TRIAL_DAYS)} of ${TRIAL_DAYS}`,'Not a member'];
  return `<h2>Membership</h2><div class="card"><button type="button" class="mbm-entry" data-mbm-open><span><b>${line[0]}</b><small class="${s.kind==='member'&&!s.renews?'mbm-ends':''}">${line[1]}</small></span><span class="mbm-chev" aria-hidden="true">›</span></button></div>`;
}
let _mbmPick=null,_mbmConfirm=false;
function mbManageOpen(){
  if(document.getElementById('mbManage'))return;
  _mbmPick=null;_mbmConfirm=false;
  const el=document.createElement('div');el.id='mbManage';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','mbmTitle');
  document.body.appendChild(el);el.addEventListener('click',mbManageClick);mbManagePaint();
  if(rcPlugin()) rcStart().then(ok=>ok&&rcRefresh()).then(()=>{ if(document.getElementById('mbManage')) mbManagePaint(); });   // v4.6.385: Apple's latest word
}
function mbManagePaint(){
  const el=document.getElementById('mbManage');if(!el)return;const s=mbSub();
  const x=`<button type="button" class="mb-x" data-mbm-close aria-label="Close">${icon('close',ICON_SZ.sm)}</button>`;
  const num=typeof clubMembershipFacts==='function'?String(clubMembershipFacts().number||'').replace(/,/g,''):'';
  const coin=s.kind!=='none'&&typeof clubCoinHTML==='function'?`<div class="club-brand mbm-coin" aria-hidden="true">${clubCoinHTML(num).replace(/^<button[^>]*>/,'<span class="club-coin-button">').replace(/<\/button>$/,'</span>')}</div>`:'';
  const row=(k,v,cls='')=>`<div class="mbm-row ${cls}"><span>${k}</span><b>${v}</b></div>`;
  let body='';
  if(s.kind==='founding'){
    body=`<div class="mbm-hero">${coin}<div><span class="mbm-pill">Founding member</span><p class="mbm-lead">You were here before the club opened. Membership is yours, free for good.</p></div></div>
    <div class="mbm-card">${row('Plan','Founding')}${num?row('Member No',num):''}${s.since?row('Member since',mbDate(s.since+'T12:00')):''}${row('Price','Free, for good')}${row('Renewal','None needed')}</div>`;
  }else if(s.kind==='none'){
    body=`<p class="mbm-lead">You’re not a member yet. ${Math.min(trialDays(),TRIAL_DAYS)} of ${TRIAL_DAYS} free logged days used.</p>
    <button type="button" class="btn mb-buy" data-mbm-join><span>Join the club</span></button>`;
  }else{
    const other=MB_PRICES.find(p=>p.plan!==s.plan.plan),pick=_mbmPick&&_mbmPick!==s.plan.plan?other:null;
    const status=s.grace?'<span class="mbm-pill warn">Payment issue</span>':s.renews?'<span class="mbm-pill">Active</span>':`<span class="mbm-pill ends">Ends ${mbDate(s.until)}</span>`;
    const opts=MB_PRICES.map(p=>{const cur=p.plan===s.plan.plan,sel=pick?p.plan===pick.plan:cur;return `<button type="button" class="mb-opt" data-mbm-plan="${p.plan}" aria-pressed="${sel}">${cur?'<span class="mb-badge mbm-cur">Current</span>':''}<span class="mb-rd" aria-hidden="true"></span><span class="mb-opt-l">${p.label}${p.note?`<small>${p.note}</small>`:''}</span><span class="mb-opt-p"><b>${p.price}</b><small>${p.per}</small></span></button>`;}).join('');
    const when=pick?(pick.plan==='yearly'?`Starts today. Apple refunds the unused part of this month.`:`Starts ${mbDate(s.until)}, when this year ends. Nothing changes until then.`):'';
    body=`<div class="mbm-hero">${coin}<div>${status}<p class="mbm-lead">${s.renews?`Your ${s.plan.label.toLowerCase()} membership renews on ${mbDate(s.until)}.`:`Your membership ends on ${mbDate(s.until)}. You’re a member until then.`}</p></div></div>
    <div class="mbm-card">${row('Plan',s.plan.label)}${row('Price',`${s.plan.price} ${s.plan.per}`)}${s.since?row('Member since',mbDate(s.since)):''}${s.renews?row('Renews',mbDate(s.until)):row('Ends',mbDate(s.until),'mbm-endrow')}${s.next?row('Then',`${s.next.label} · ${s.next.price} ${s.next.per}`):''}${row('Billed through','Apple ID')}</div>
    ${s.renews?`<h3 class="mbm-h">Change plan</h3>
    <div class="mb-opts" role="group" aria-label="Change plan">${opts}</div>
    ${pick?`<p class="mbm-when">${when}</p><button type="button" class="btn mb-buy" data-mbm-switch><span>Switch to ${pick.label} · ${pick.price} ${pick.per}</span></button>`:''}
    ${s.next?`<p class="mbm-when">Switching to ${s.next.label} on ${mbDate(s.until)}. <button type="button" class="mbm-inline" data-mbm-undo>Keep ${s.plan.label}</button></p>`:''}
    ${_mbmConfirm?`<div class="mbm-confirm" role="alertdialog" aria-labelledby="mbmCx"><b id="mbmCx">Cancel membership?</b><p>You stay a member until ${mbDate(s.until)}. After that, new days need membership again. Everything you’ve logged stays yours: history, editing and export are free.</p><div class="mbm-cx-btns"><button type="button" class="btn ghost" data-mbm-keep>Keep membership</button><button type="button" class="btn ghost danger" data-mbm-cancel-yes>Cancel membership</button></div></div>`
      :`<button type="button" class="mbm-cancel" data-mbm-cancel>Cancel membership</button>`}`
    :`<button type="button" class="btn mb-buy" data-mbm-resume><span>Resume membership</span></button><p class="mbm-when">Renews ${mbDate(s.until)} at ${s.plan.price} ${s.plan.per}. Nothing is charged before then.</p>`}`;
  }
  el.innerHTML=`<div class="mb-card"><div class="mb-top"><img class="mb-wm" src="assets/showuppp-wordmark-${document.documentElement.dataset.theme==='dark'?'dark':'light'}.svg" alt="ShowUppp">${x}</div>
    <h2 id="mbmTitle">Membership</h2>${body}
    ${s.kind==='founding'?`<p class="mb-fine">Founding membership belongs to your account and follows you to every device you sign in on. Nothing to renew, nothing to cancel.</p></div>`
    :`<div class="mb-links"><button type="button" class="mb-link" data-mb-restore>Restore purchases</button><button type="button" class="mb-link" data-mbm-apple>Apple subscriptions</button></div>
    <p class="mb-fine">${s.kind==='member'&&s.test?'Test membership: no charge. ':''}Payment is charged to your Apple ID. Changing or cancelling opens Apple’s subscription settings; cancel at least 24 hours before the renewal date to avoid the next charge.</p></div>`}`;
}
function mbManageClick(e){
  const b=e.target.closest('button');if(!b)return;const s=mbSub();
  if(b.hasAttribute('data-mbm-close')){document.getElementById('mbManage')?.remove();if(view==='sync'&&typeof renderSync==='function')renderSync();return;}
  if(b.dataset.mbmPlan){_mbmPick=b.dataset.mbmPlan;_mbmConfirm=false;mbManagePaint();return;}
  if(b.hasAttribute('data-mbm-join')){document.getElementById('mbManage')?.remove();paywallOpen('settings');return;}
  if(b.hasAttribute('data-mb-restore')){memberRestore();return;}
  const sandbox=typeof SANDBOX!=='undefined'&&SANDBOX;
  if(b.hasAttribute('data-mbm-apple')||!sandbox&&b.matches('[data-mbm-switch],[data-mbm-cancel],[data-mbm-resume],[data-mbm-undo]')){if(rcPlugin())rcManage();else toast('Opens Apple’s subscription settings in the App Store version.');return;}
  if(b.hasAttribute('data-mbm-cancel')){_mbmConfirm=true;mbManagePaint();return;}
  if(b.hasAttribute('data-mbm-keep')){_mbmConfirm=false;mbManagePaint();return;}
  if(b.hasAttribute('data-mbm-cancel-yes')){mbSubWrite(e=>{e.renews=false;delete e.next;});_mbmConfirm=false;mbManagePaint();toast('Cancelled (test). You’re a member until '+mbDate(s.until)+'.');return;}
  if(b.hasAttribute('data-mbm-resume')){mbSubWrite(e=>{e.renews=true;});mbManagePaint();toast('Membership resumed (test).');return;}
  if(b.hasAttribute('data-mbm-undo')){mbSubWrite(e=>{delete e.next;});mbManagePaint();return;}
  if(b.hasAttribute('data-mbm-switch')&&_mbmPick){const to=_mbmPick;_mbmPick=null;
    if(to==='yearly')mbSubWrite(e=>{e.plan='yearly';e.until=Date.now()+365*864e5;delete e.next;});else mbSubWrite(e=>{e.next=to;});
    mbManagePaint();toast(to==='yearly'?'Switched to Yearly (test). No charge.':'Monthly starts when this year ends (test).');return;}
}
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('[data-mbm-open]')) mbManageOpen(); });

(function(){
  const s=document.createElement('style');s.id='mbStyle';
  s.textContent=`#mbManage{position:fixed;inset:0;z-index:8500;overflow:auto;overscroll-behavior:contain;background:var(--ground);color:var(--chalk);display:flex;justify-content:center;align-items:flex-start;padding:calc(env(safe-area-inset-top) + 22px) 22px calc(env(safe-area-inset-bottom) + 28px);animation:mbUp .45s cubic-bezier(.3,1.6,.5,1) both}
#paywall{position:fixed;inset:0;z-index:8500;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:var(--ground);color:var(--chalk);display:flex;justify-content:center;align-items:flex-start;padding:calc(env(safe-area-inset-top) + 22px) 22px calc(env(safe-area-inset-bottom) + 28px);animation:mbUp .55s cubic-bezier(.3,1.6,.5,1) both}
#memberWelcome{position:fixed;inset:0;z-index:8600;isolation:isolate;color:var(--chalk)}
#memberWelcome .mw-ground{position:absolute;inset:0;background:color-mix(in srgb,var(--ground) 94%,transparent);backdrop-filter:blur(6px)}
#memberWelcome .mw-flight{position:absolute;display:block;margin:0;aspect-ratio:1;perspective:900px;transform-origin:center}
#memberWelcome .mw-flight>.club-coin-button{position:absolute;inset:0;flex:none;width:100%;height:100%;min-width:0;min-height:0;aspect-ratio:1;box-sizing:border-box;pointer-events:none}
#memberWelcome .mw-party{position:absolute;top:calc(var(--mw-center) + 105px);left:50%;width:240px;height:150px;transform:translateX(-50%);pointer-events:none}
#memberWelcome .mw-pip{display:block;width:240px;height:auto;opacity:0}
/* v4.6.313: your companion joins you, in Pip's place */
#memberWelcome .mw-comp{width:140px;height:140px;margin:0 auto}#memberWelcome .mw-comp .su-companion{width:100%;height:100%}
#memberWelcome .mw-squares{position:absolute;left:50%;top:50%}
#memberWelcome .mw-squares i{position:absolute;width:7px;height:7px;border-radius:2px;background:#4a60ed;opacity:0}
#memberWelcome .mw-copy{position:absolute;top:calc(var(--mw-center) + 275px);left:16px;right:16px;text-align:center;opacity:0}
#memberWelcome .mw-copy h2{display:block;width:100%;text-align:center;opacity:1;color:var(--chalk);font:600 clamp(23px,7vw,28px)/1.15 var(--body);margin:0;text-transform:none;letter-spacing:-.5px}
#memberWelcome .mw-copy h2::before,#memberWelcome .mw-copy h2::after{content:none;display:none}
@media(max-height:650px){#memberWelcome .mw-party{top:calc(var(--mw-center) + 85px);width:180px;height:110px}#memberWelcome .mw-pip{width:180px}#memberWelcome .mw-comp{width:110px;height:110px}#memberWelcome .mw-copy{top:calc(var(--mw-center) + 195px)}#memberWelcome .mw-copy h2{margin:5px 0}}
#memberWelcome .mw-spinning .club-coin-face:after{animation:mwCoinShine .95s ease-in-out infinite;opacity:.6}
@keyframes mwCoinShine{0%{transform:translateX(-75%);opacity:.12}45%{opacity:.7}100%{transform:translateX(75%);opacity:.12}}
#memberWelcome .mw-caption{position:absolute;bottom:calc(env(safe-area-inset-bottom) + 80px);left:20px;right:20px;text-align:center;font:400 11px var(--body);color:var(--muted)}
#memberWelcome .mw-skip{position:absolute;bottom:calc(env(safe-area-inset-bottom) + 22px);left:50%;transform:translateX(-50%);min-height:44px;padding:10px 18px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--chalk);font:500 12px var(--body)}
.club-number .mw-digit{display:inline-block}.club-number.mw-number-shine{position:relative}
.club-number.mw-number-shine:after{content:attr(data-mw-number);position:absolute;inset:0;color:transparent;background:linear-gradient(105deg,transparent 30%,var(--accent-ink) 48%,transparent 66%);background-size:300% 100%;background-clip:text;-webkit-background-clip:text;pointer-events:none;animation:mwNumberShine .85s ease-in-out both}
@keyframes mwNumberShine{0%{opacity:0;background-position:150% 0}25%{opacity:.9}100%{opacity:0;background-position:-50% 0}}
@media(prefers-reduced-motion:reduce){.club-number.mw-number-shine{animation:none}}
#paywall .mb-card{width:100%;max-width:420px}
#paywall .mb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
/* v4.6.293: the official wordmark (Sungjee: 30% under the card's size) and a round close, not typed-out text */
#paywall .mb-wm{display:block;width:73px;height:auto}
#paywall .mb-x{all:unset;cursor:pointer;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--chalk) 8%,transparent);color:var(--muted)}
#paywall .mb-x:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#paywall .mb-hero{display:flex;align-items:center;gap:18px;margin-bottom:18px}
#paywall .mb-coin{flex:none;width:84px;height:84px;display:block;margin:0}
#paywall .mb-coin>.club-coin-button{position:relative;display:block;flex:none;aspect-ratio:1;box-sizing:border-box;width:84px;height:84px;padding:0;border:0;border-radius:50%;background:none;perspective:500px;pointer-events:none}
#paywall .mb-coin .club-coin-rotor{animation:mbCoinIn 1.2s cubic-bezier(.3,1.6,.5,1) .15s both,mbCoinTurn 9s linear 1.35s infinite}
#paywall .mb-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px 5px;width:100%;max-width:230px}
#paywall .mb-grid i{aspect-ratio:1;border-radius:4px;background:var(--accent);animation:mbPop .45s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--i,0)*35ms + 300ms)}
#paywall .mb-since{font:400 11px var(--mono);color:var(--muted);margin:8px 0 0}
#paywall h2{font:700 26px/1.15 var(--body);letter-spacing:-.6px;margin:0 0 6px;text-transform:none;color:var(--chalk);opacity:1;display:block}
#paywall h2::after{display:none}
#paywall .mb-line{font:400 14px/1.363 var(--body);color:var(--muted);margin:0 0 16px}
#paywall .mb-gets{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:10px 12px}
#paywall .mb-gets li{display:grid;grid-template-columns:28px 1fr;gap:8px 10px;align-items:start;font:500 14px/1.269 var(--body);color:var(--chalk)}
#paywall .mb-gets small{display:block;font:400 12px/1.269 var(--body);color:var(--muted);margin-top:2px}
#paywall .mb-ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);font:700 12px var(--body)}
#paywall .mb-ic-coin{background:linear-gradient(135deg,#c8d0d6,#8c99a4 55%,#dfe5e9);border-radius:50%;box-shadow:inset 0 0 0 1.5px #eef3f8,inset 0 0 0 2.5px #9aa3ad}
#paywall .mb-free .mb-ic{background:var(--surface2);color:var(--muted)}
#paywall .mb-opts{display:grid;gap:8px 10px;margin-bottom:11px}
#paywall .mb-opt{position:relative;display:grid;grid-template-columns:20px 1fr auto;gap:10px 12px;align-items:center;width:100%;text-align:left;padding:16px;border-radius:16px;border:2px solid var(--line);background:var(--surface);color:var(--chalk);font:inherit;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}
#paywall .mb-opt:active{transform:scale(.98)}
#paywall .mb-opt[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--surface))}
#paywall .mb-rd{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);box-sizing:border-box;transition:border-width .25s cubic-bezier(.3,1.6,.5,1),border-color .2s}
#paywall .mb-opt[aria-pressed=true] .mb-rd{border:6px solid var(--accent)}
#paywall .mb-opt-l{font:700 15px/1.2 var(--body)}
#paywall .mb-opt small{display:block;font:400 11px/1.222 var(--body);color:var(--muted);margin-top:2px}
#paywall .mb-opt-p{text-align:right;white-space:nowrap}#paywall .mb-opt-p b{font:700 15px/1.2 var(--body);color:var(--chalk)}
#paywall .mb-badge{position:absolute;top:-10px;right:14px;background:var(--accent);color:#fff;font:700 10px/1 var(--body);letter-spacing:.4px;padding:5px 9px;border-radius:999px;text-transform:uppercase;animation:mbBadge .5s cubic-bezier(.3,1.6,.5,1) 2.2s both}
#paywall .mb-buy{width:100%;margin:0;min-height:56px;border-radius:16px;font:700 15px var(--body)}
#paywall .mb-buy span{display:inline-block}#paywall .mb-buy span.mb-swap{animation:mbSwap .3s ease-out}
#paywall .mb-cancel{text-align:center;font:400 11px/1.316 var(--body);color:var(--muted);margin:8px 0 13px}
#paywall .mb-links{display:flex;justify-content:center;gap:22px;margin-bottom:13px}
#paywall .mb-link{all:unset;cursor:pointer;font:600 12px var(--body);color:var(--chalk);padding:6px 2px}
#paywall .mb-fine{font:400 10px/1.41 var(--body);color:var(--faint);margin:0;text-align:center}#paywall .mb-fine a{color:var(--muted)}
#paywall .mb-top,#paywall .mb-since,#paywall h2,#paywall .mb-line,#paywall .mb-gets li,#paywall .mb-opt,#paywall .mb-buy,#paywall .mb-cancel,#paywall .mb-links,#paywall .mb-fine{animation:mbRise .5s ease-out both}
#paywall .mb-top{animation-delay:.1s}#paywall .mb-since{animation-delay:1.05s}#paywall h2{animation-delay:1.15s}#paywall .mb-line{animation-delay:1.3s}
#paywall .mb-gets li:nth-child(1){animation-delay:1.4s}#paywall .mb-gets li:nth-child(2){animation-delay:1.5s}#paywall .mb-gets li:nth-child(3){animation-delay:1.6s}#paywall .mb-gets li:nth-child(4){animation-delay:1.7s}
#paywall .mb-opt:nth-child(1){animation-delay:1.8s}#paywall .mb-opt:nth-child(2){animation-delay:1.9s}#paywall .mb-buy{animation-delay:2.05s}#paywall .mb-cancel,#paywall .mb-links,#paywall .mb-fine{animation-delay:2.15s}
@keyframes mbUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes mbRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes mbPop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
@keyframes mbBadge{from{opacity:0;transform:scale(.5) rotate(-8deg)}to{opacity:1;transform:none}}
@keyframes mbSwap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mbCoinIn{from{opacity:0;transform:translateY(-30px) rotateY(-540deg)}to{opacity:1;transform:rotateY(0)}}
@keyframes mbCoinTurn{from{transform:rotateY(0)}to{transform:rotateY(360deg)}}
@media (prefers-reduced-motion:reduce){#paywall,#paywall *{animation:none!important}}
.mb-trial{display:flex;align-items:center;gap:14px;margin:0 0 13px;padding:12px 16px;border-radius:16px;background:var(--surface)}
.mb-trial-g{display:grid;grid-template-columns:repeat(10,9px);grid-auto-rows:9px;gap:2px 3px;flex:none}
.mb-trial-g i{border-radius:2.5px;background:var(--line);opacity:.55}.mb-trial-g i.on{background:var(--accent);opacity:1}
.mb-trial-t{font:600 12px/1.222 var(--body);color:var(--chalk)}.mb-trial-t small{display:block;font:400 11px/1.269 var(--mono);color:var(--muted);margin-top:2px}
.mb-trial{position:relative}
.mb-trial-t{flex:1;min-width:0}
.mb-join{all:unset;cursor:pointer;flex:none;display:flex;flex-direction:column;align-items:center;gap:5px 6px;font:600 10px/1 var(--body);color:var(--accent);white-space:nowrap;padding:2px 2px 0}
.mb-join-coin{position:relative;display:block;width:36px;height:36px;margin:0;flex:none}
.mb-join-coin .club-coin-button{position:absolute;inset:0;display:block;width:36px;height:36px;min-height:0;flex:none;padding:0;border:0;border-radius:50%;background:none;pointer-events:none;overflow:visible}
/* v4.6.286: it turns, like the coin in Settings: one turn in 16s, the same 3D coin with its edge */
.mb-join-coin .club-coin-button{perspective:300px}
.mb-join-coin .club-coin-rotor{animation:mbCoinTurn 16s linear infinite}
@media (prefers-reduced-motion:reduce){.mb-join-coin .club-coin-rotor{animation:none}}
@media (max-width:379px){.mb-trial{display:grid;grid-template-columns:1fr auto;grid-template-areas:'t j' 'g j';gap:8px 12px}.mb-trial-t{grid-area:t}.mb-trial-g{grid-area:g;grid-template-columns:repeat(20,7px);grid-auto-rows:7px;gap:2px 2px}.mb-join{grid-area:j;align-self:center}}

.mb-trial .linkbtn{border:0;background:none;color:var(--accent);font:600 11px var(--body);padding:0;cursor:pointer}
#mbManage .mb-card{width:100%;max-width:420px}
#mbManage .mb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
#mbManage .mb-wm{display:block;width:73px;height:auto}
#mbManage .mb-x{all:unset;cursor:pointer;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--chalk) 8%,transparent);color:var(--muted)}
#mbManage .mb-x:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#mbManage h2{font:700 26px/1.15 var(--body);letter-spacing:-.6px;margin:0 0 6px;text-transform:none;color:var(--chalk);opacity:1;display:block}
#mbManage h2::after{display:none}
#mbManage .mb-opts{display:grid;gap:8px 10px;margin-bottom:11px}
#mbManage .mb-opt{position:relative;display:grid;grid-template-columns:20px 1fr auto;gap:10px 12px;align-items:center;width:100%;text-align:left;padding:16px;border-radius:16px;border:2px solid var(--line);background:var(--surface);color:var(--chalk);font:inherit;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}
#mbManage .mb-opt:active{transform:scale(.98)}
#mbManage .mb-opt[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--surface))}
#mbManage .mb-rd{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);box-sizing:border-box;transition:border-width .25s cubic-bezier(.3,1.6,.5,1),border-color .2s}
#mbManage .mb-opt[aria-pressed=true] .mb-rd{border:6px solid var(--accent)}
#mbManage .mb-opt-l{font:700 15px/1.2 var(--body)}
#mbManage .mb-opt small{display:block;font:400 11px/1.222 var(--body);color:var(--muted);margin-top:2px}
#mbManage .mb-opt-p{text-align:right;white-space:nowrap}
#mbManage .mb-badge{position:absolute;top:-10px;right:14px;background:var(--accent);color:#fff;font:700 10px/1 var(--body);letter-spacing:.4px;padding:5px 9px;border-radius:999px;text-transform:uppercase}
#mbManage .mb-buy{width:100%;margin:0;min-height:56px;border-radius:16px;font:700 15px var(--body)}
#mbManage .mb-links{display:flex;justify-content:center;gap:22px;margin-bottom:13px}
#mbManage .mb-link{all:unset;cursor:pointer;font:600 12px var(--body);color:var(--chalk);padding:6px 2px}
#mbManage .mb-fine{font:400 10px/1.41 var(--body);color:var(--faint);margin:0;text-align:center}
#mbManage .mb-opt-p b{font:700 15px/1.2 var(--body);color:var(--chalk)}
#mbManage h2{margin-bottom:14px}
#mbManage .mbm-hero{display:flex;align-items:center;gap:16px;margin-bottom:14px}
#mbManage .mbm-coin{flex:none;width:64px;height:64px;display:block;margin:0}
#mbManage .mbm-coin>.club-coin-button{position:relative;display:block;width:64px;height:64px;min-height:0;padding:0;border:0;border-radius:50%;background:none;perspective:400px;pointer-events:none}
#mbManage .mbm-coin .club-coin-rotor{animation:mbCoinTurn 16s linear infinite}
#mbManage .mbm-pill{display:inline-block;font:700 10px/1 var(--body);letter-spacing:.4px;text-transform:uppercase;padding:5px 9px;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
#mbManage .mbm-pill.ends{background:color-mix(in srgb,var(--chalk) 9%,transparent);color:var(--chalk)}
#mbManage .mbm-pill.warn{background:color-mix(in srgb,var(--record) 16%,transparent);color:var(--record)}
#mbManage .mbm-lead{font:400 13px/1.363 var(--body);color:var(--muted);margin:6px 0 0}
#mbManage>.mb-card>.mbm-lead{margin:0 0 14px}
#mbManage .mbm-card{background:var(--surface);border-radius:16px;padding:4px 16px;margin-bottom:19px}
#mbManage .mbm-row{display:flex;justify-content:space-between;gap:12px;padding:13px 0;font:400 13px var(--body);color:var(--muted)}
#mbManage .mbm-row+.mbm-row{border-top:1px solid var(--line)}
#mbManage .mbm-row b{font-weight:600;color:var(--chalk);text-align:right}
#mbManage .mbm-endrow b{color:var(--accent)}
#mbManage .mbm-h{font:700 11px var(--body);letter-spacing:.4px;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
#mbManage .mbm-cur{background:var(--chalk);color:var(--ground)}
#mbManage .mbm-when{font:400 12px/1.363 var(--body);color:var(--muted);margin:2px 0 11px;text-align:center}
#mbManage .mbm-inline{all:unset;cursor:pointer;color:var(--accent-ink);font-weight:600}
#mbManage .mbm-cancel{all:unset;cursor:pointer;display:block;width:100%;text-align:center;font:600 13px var(--body);color:var(--record);padding:14px 0;margin:5px 0 11px}
#mbManage .mbm-confirm{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;margin:5px 0 14px;animation:mbRise .3s ease-out both}
#mbManage .mbm-confirm b{font:700 14px var(--body)}#mbManage .mbm-confirm p{font:400 12px/1.363 var(--body);color:var(--muted);margin:5px 0 11px}
#mbManage .mbm-cx-btns{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px}#mbManage .mbm-cx-btns .btn{margin:0;font:600 13px var(--body);min-height:48px;min-width:0;width:100%;padding:10px 6px;box-sizing:border-box}
.mbm-entry{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%}
.mbm-entry b{display:block;font:600 13px var(--body);color:var(--chalk)}.mbm-entry small{display:block;font:400 11px var(--mono);color:var(--muted);margin-top:2px}.mbm-entry small.mbm-ends{color:var(--accent)}
.mbm-chev{font:400 19px/1 var(--body);color:var(--muted)}
@media (prefers-reduced-motion:reduce){#mbManage,#mbManage *{animation:none!important}}
.mb-row{font-size:11px;color:var(--muted);margin:2px 0 8px;text-align:center}.mb-row .linkbtn{border:0;background:none;color:var(--accent-ink);font:inherit;padding:0;cursor:pointer}`;
  document.head.appendChild(s);
})();

/* v4.6.294: this file loads after app.js, whose boot draws Today before trialCardHTML exists -- so
   after a reload (pull-to-refresh) the free-days card was missing until something else redrew.
   Once loaded, draw Today again if the card belongs there. */
try{ if(typeof view!=='undefined'&&view==='today'&&typeof render==='function'&&document.getElementById('view')&&!document.getElementById('mbTrial')&&trialCardHTML()) render({soft:true}); }catch(e){}
